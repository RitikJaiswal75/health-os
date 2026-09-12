import { v4 as uuidv4 } from 'uuid';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Medication, MedicationVariant, Schedule, DoseEvent } from '../../db/schema';
import type { ScheduleType, TimeOfDay, DoseStatus, InventoryTransactionType } from '../../core/types/domain';
import { parseScheduledAt } from '../../core/dates/dateUtils';
import { scheduleIncludesDateKey } from '../reminders/occurrenceExpander';
import {
  dedupeDoseEvents,
  doseBelongsToDateKey,
  filterPendingDuplicatingResolved,
  filterPendingReplacedBySnooze,
  parseSnoozedFromNotes,
  readScheduledAtFromRow,
  slotKeysEqual,
  buildSnoozedFromNotes,
} from './doseSlotUtils';
import {
  mapDoseEventRow,
  mapMedicationRow,
  mapScheduleRow,
  mapVariantRow,
} from '../../db/rowMappers';

function doseVisibleForScheduleOnDateKey(
  dose: Pick<DoseEvent, 'medicationId' | 'scheduleId'>,
  dateKey: string,
  scheduleById: Map<string, Schedule>,
  schedulesByMedId: Map<string, Schedule[]>,
): boolean {
  if (dose.scheduleId) {
    const schedule = scheduleById.get(dose.scheduleId);
    return schedule ? scheduleIncludesDateKey(schedule, dateKey) : false;
  }

  const schedules = schedulesByMedId.get(dose.medicationId) ?? [];
  if (schedules.length === 0) return true;
  return schedules.some((schedule) => scheduleIncludesDateKey(schedule, dateKey));
}

export interface CreateMedicationInput {
  name: string;
  nickname?: string;
  notes?: string;
  medicationType: string;
  strengthValue?: number;
  strengthUnit?: string;
  doseUnitValue?: number;
  doseUnitUnit?: string;
  pillShape?: string;
  pillColor?: string;
  pillColor2?: string;
  photoUri?: string;
  currentQuantity: number;
  refillEnabled?: boolean;
  refillThreshold?: number | null;
  schedule: {
    type: ScheduleType;
    timesOfDay: TimeOfDay[];
    intervalDays?: number;
    weekdayMask?: number;
    dayOfMonth?: number;
    startDate: string;
    endDate?: string;
  };
}

export class MedicationRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  create(input: CreateMedicationInput): { medication: Medication; variant: MedicationVariant; schedule: Schedule } {
    const now = new Date().toISOString();
    const medicationId = uuidv4();
    const variantId = uuidv4();
    const scheduleId = uuidv4();

    this.db.runSync(
      `INSERT INTO medications (id, name, nickname, notes, medication_type, strength_value, strength_unit,
        dose_unit_value, dose_unit_unit, pill_shape, pill_color, pill_color2, photo_uri, current_quantity, refill_enabled, refill_threshold, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        medicationId,
        input.name,
        input.nickname ?? null,
        input.notes ?? null,
        input.medicationType,
        input.strengthValue ?? null,
        input.strengthUnit ?? null,
        input.doseUnitValue ?? null,
        input.doseUnitUnit ?? null,
        input.pillShape ?? null,
        input.pillColor ?? null,
        input.pillColor2 ?? null,
        input.photoUri ?? null,
        input.currentQuantity,
        input.refillEnabled ? 1 : 0,
        input.refillEnabled ? (input.refillThreshold ?? null) : null,
        now,
        now,
      ],
    );

    this.db.runSync(
      `INSERT INTO medication_variants (id, medication_id, label, strength_value, strength_unit,
        current_quantity, is_default, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        variantId,
        medicationId,
        input.name,
        input.strengthValue ?? null,
        input.strengthUnit ?? null,
        input.currentQuantity,
        now,
      ],
    );

    this.db.runSync(
      `INSERT INTO schedules (id, medication_id, type, times_of_day, interval_days, weekday_mask,
        day_of_month, start_date, end_date, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        scheduleId,
        medicationId,
        input.schedule.type,
        JSON.stringify(input.schedule.timesOfDay),
        input.schedule.intervalDays ?? null,
        input.schedule.weekdayMask ?? null,
        input.schedule.dayOfMonth ?? null,
        input.schedule.startDate,
        input.schedule.endDate ?? null,
        now,
      ],
    );

    if (input.currentQuantity > 0) {
      this.recordInventoryTransaction({
        medicationId,
        variantId,
        type: 'initial',
        quantityDelta: input.currentQuantity,
        balanceAfter: input.currentQuantity,
      });
    }

    return {
      medication: this.getById(medicationId)!,
      variant: this.getDefaultVariant(medicationId)!,
      schedule: this.getSchedule(scheduleId)!,
    };
  }

  update(medicationId: string, input: CreateMedicationInput): boolean {
    const med = this.getById(medicationId);
    if (!med) return false;

    const now = new Date().toISOString();
    const previousQty = med.currentQuantity;

    this.db.runSync(
      `UPDATE medications SET name = ?, nickname = ?, notes = ?, medication_type = ?,
        strength_value = ?, strength_unit = ?, dose_unit_value = ?, dose_unit_unit = ?,
        pill_shape = ?, pill_color = ?, pill_color2 = ?,
        photo_uri = ?, current_quantity = ?, refill_enabled = ?, refill_threshold = ?, updated_at = ?
       WHERE id = ?`,
      [
        input.name,
        input.nickname ?? null,
        input.notes ?? null,
        input.medicationType,
        input.strengthValue ?? null,
        input.strengthUnit ?? null,
        input.doseUnitValue ?? null,
        input.doseUnitUnit ?? null,
        input.pillShape ?? null,
        input.pillColor ?? null,
        input.pillColor2 ?? null,
        input.photoUri ?? null,
        input.currentQuantity,
        input.refillEnabled ? 1 : 0,
        input.refillEnabled ? (input.refillThreshold ?? null) : null,
        now,
        medicationId,
      ],
    );

    const variant = this.getDefaultVariant(medicationId);
    if (variant) {
      this.db.runSync(
        `UPDATE medication_variants SET label = ?, strength_value = ?, strength_unit = ?,
          current_quantity = ? WHERE id = ?`,
        [
          input.name,
          input.strengthValue ?? null,
          input.strengthUnit ?? null,
          input.currentQuantity,
          variant.id,
        ],
      );
    }

    const schedules = this.getActiveSchedules(medicationId);
    const schedule = schedules[0];
    if (!schedule) return false;

    this.db.runSync(
      `UPDATE schedules SET type = ?, times_of_day = ?, interval_days = ?, weekday_mask = ?,
          day_of_month = ?, start_date = ?, end_date = ? WHERE id = ?`,
      [
        input.schedule.type,
        JSON.stringify(input.schedule.timesOfDay),
        input.schedule.intervalDays ?? null,
        input.schedule.weekdayMask ?? null,
        input.schedule.dayOfMonth ?? null,
        input.schedule.startDate,
        input.schedule.endDate ?? null,
        schedule.id,
      ],
    );

    if (input.currentQuantity !== previousQty) {
      this.recordInventoryTransaction({
        medicationId,
        variantId: variant?.id,
        type: 'adjustment',
        quantityDelta: input.currentQuantity - previousQty,
        balanceAfter: input.currentQuantity,
      });
    }

    return true;
  }

  getById(id: string): Medication | null {
    const row = this.db.getFirstSync(`SELECT * FROM medications WHERE id = ?`, [id]);
    return row ? mapMedicationRow(row) : null;
  }

  getAll(): Medication[] {
    return this.db
      .getAllSync(`SELECT * FROM medications ORDER BY name ASC`)
      .map(mapMedicationRow);
  }

  getDefaultVariant(medicationId: string): MedicationVariant | null {
    const row = this.db.getFirstSync(
      `SELECT * FROM medication_variants WHERE medication_id = ? AND is_default = 1`,
      [medicationId],
    );
    return row ? mapVariantRow(row) : null;
  }

  getVariants(medicationId: string): MedicationVariant[] {
    return this.db
      .getAllSync(
        `SELECT * FROM medication_variants WHERE medication_id = ? ORDER BY is_default DESC, label ASC`,
        [medicationId],
      )
      .map(mapVariantRow);
  }

  getSchedule(scheduleId: string): Schedule | null {
    const row = this.db.getFirstSync(`SELECT * FROM schedules WHERE id = ?`, [scheduleId]);
    return row ? mapScheduleRow(row) : null;
  }

  getActiveSchedules(medicationId: string): Schedule[] {
    return this.db
      .getAllSync(
        `SELECT * FROM schedules WHERE medication_id = ? AND is_active = 1`,
        [medicationId],
      )
      .map(mapScheduleRow);
  }

  delete(medicationId: string): boolean {
    const med = this.getById(medicationId);
    if (!med) return false;

    this.db.runSync(`DELETE FROM inventory_transactions WHERE medication_id = ?`, [medicationId]);
    this.db.runSync(`DELETE FROM dose_events WHERE medication_id = ?`, [medicationId]);
    this.db.runSync(`DELETE FROM schedules WHERE medication_id = ?`, [medicationId]);
    this.db.runSync(`DELETE FROM medication_variants WHERE medication_id = ?`, [medicationId]);
    this.db.runSync(`DELETE FROM medications WHERE id = ?`, [medicationId]);
    return true;
  }

  setAbsoluteQuantity(medicationId: string, quantity: number): void {
    const med = this.getById(medicationId);
    if (!med) return;
    const previousQty = med.currentQuantity;
    const now = new Date().toISOString();
    this.db.runSync(
      `UPDATE medications SET current_quantity = ?, updated_at = ? WHERE id = ?`,
      [quantity, now, medicationId],
    );
    const variant = this.getDefaultVariant(medicationId);
    if (variant) {
      this.db.runSync(`UPDATE medication_variants SET current_quantity = ? WHERE id = ?`, [
        quantity,
        variant.id,
      ]);
    }
    this.recordInventoryTransaction({
      medicationId,
      variantId: variant?.id,
      type: 'adjustment',
      quantityDelta: quantity - previousQty,
      balanceAfter: quantity,
    });
  }

  addVariant(input: {
    medicationId: string;
    label: string;
    strengthValue?: number;
    strengthUnit?: string;
    currentQuantity?: number;
  }): MedicationVariant {
    const id = uuidv4();
    const now = new Date().toISOString();
    this.db.runSync(
      `INSERT INTO medication_variants (id, medication_id, label, strength_value, strength_unit, current_quantity, is_default, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        id,
        input.medicationId,
        input.label,
        input.strengthValue ?? null,
        input.strengthUnit ?? null,
        input.currentQuantity ?? 0,
        now,
      ],
    );
    return this.db.getFirstSync<MedicationVariant>(`SELECT * FROM medication_variants WHERE id = ?`, [id])!;
  }

  recordInventoryTransaction(input: {
    medicationId: string;
    variantId?: string;
    type: InventoryTransactionType;
    quantityDelta: number;
    balanceAfter: number;
    doseEventId?: string;
  }): void {
    this.db.runSync(
      `INSERT INTO inventory_transactions (id, medication_id, variant_id, type, quantity_delta, balance_after, dose_event_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        input.medicationId,
        input.variantId?.trim() ? input.variantId.trim() : null,
        input.type,
        input.quantityDelta,
        input.balanceAfter,
        input.doseEventId ?? null,
        new Date().toISOString(),
      ],
    );
  }
}

export class DoseEventRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  createPending(input: {
    medicationId: string;
    scheduleId?: string;
    scheduledAt: string;
    doseAmount?: number;
  }): DoseEvent {
    const id = uuidv4();
    const now = new Date().toISOString();
    this.db.runSync(
      `INSERT INTO dose_events (id, medication_id, schedule_id, scheduled_at, status, dose_amount, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`,
      [
        id,
        input.medicationId,
        input.scheduleId ?? null,
        input.scheduledAt,
        input.doseAmount != null && input.doseAmount > 0 ? input.doseAmount : 1,
        now,
        now,
      ],
    );
    return this.getById(id)!;
  }

  getById(id: string): DoseEvent | null {
    const row = this.db.getFirstSync(`SELECT * FROM dose_events WHERE id = ?`, [id]);
    return row ? mapDoseEventRow(row) : null;
  }

  getForDate(dateKey: string, activeMedicationIds?: Set<string>): DoseEvent[] {
    const medRepo = new MedicationRepository(this.db);
    const scheduleById = new Map<string, Schedule>();
    const schedulesByMedId = new Map<string, Schedule[]>();

    for (const med of medRepo.getAll()) {
      const schedules = medRepo.getActiveSchedules(med.id);
      schedulesByMedId.set(med.id, schedules);
      for (const schedule of schedules) {
        scheduleById.set(schedule.id, schedule);
      }
    }

    const doses = this.db
      .getAllSync(`SELECT * FROM dose_events ORDER BY scheduled_at ASC`)
      .map(mapDoseEventRow)
      .filter((dose) => doseBelongsToDateKey(dose, dateKey))
      .filter((dose) => !activeMedicationIds || activeMedicationIds.has(dose.medicationId))
      .filter((dose) =>
        doseVisibleForScheduleOnDateKey(dose, dateKey, scheduleById, schedulesByMedId),
      );

    return filterPendingDuplicatingResolved(
      filterPendingReplacedBySnooze(dedupeDoseEvents(doses)),
    );
  }

  /** True when any dose row already occupies this schedule slot (including skipped/missed). */
  existsForScheduleAt(scheduleId: string, scheduledAt: string): boolean {
    const rows = this.db.getAllSync(
      `SELECT scheduled_at, status, notes FROM dose_events WHERE schedule_id = ?`,
      [scheduleId],
    );
    return this.rowOccupiesSlot(rows, scheduledAt);
  }

  /** True when any dose row for this medication occupies the slot (covers legacy rows without schedule_id). */
  existsForMedicationAt(medicationId: string, scheduledAt: string): boolean {
    const rows = this.db.getAllSync(
      `SELECT scheduled_at, status, notes FROM dose_events WHERE medication_id = ?`,
      [medicationId],
    );
    return this.rowOccupiesSlot(rows, scheduledAt);
  }

  private rowOccupiesSlot(rows: unknown[], scheduledAt: string): boolean {
    return rows.some((row) => {
      const record = row as Record<string, string | null | undefined>;
      const storedAt = readScheduledAtFromRow(row);
      if (storedAt && slotKeysEqual(storedAt, scheduledAt)) {
        return true;
      }
      const snoozedFrom = parseSnoozedFromNotes(record.notes ?? null);
      return snoozedFrom != null && slotKeysEqual(snoozedFrom, scheduledAt);
    });
  }

  backfillSnoozeNotes(id: string, originalScheduledAt: string): void {
    const now = new Date().toISOString();
    this.db.runSync(`UPDATE dose_events SET notes = ?, updated_at = ? WHERE id = ?`, [
      buildSnoozedFromNotes(originalScheduledAt),
      now,
      id,
    ]);
  }

  getSnoozedForSchedule(scheduleId: string): DoseEvent[] {
    return this.db
      .getAllSync(
        `SELECT * FROM dose_events WHERE schedule_id = ? AND status = 'snoozed' ORDER BY scheduled_at ASC`,
        [scheduleId],
      )
      .map(mapDoseEventRow);
  }

  snooze(id: string, snoozedUntil: string, originalScheduledAt: string): void {
    const now = new Date().toISOString();
    this.db.runSync(
      `UPDATE dose_events SET scheduled_at = ?, status = 'snoozed', notes = ?, updated_at = ? WHERE id = ?`,
      [snoozedUntil, buildSnoozedFromNotes(originalScheduledAt), now, id],
    );
  }

  getPendingForSchedule(scheduleId: string): DoseEvent[] {
    return this.db
      .getAllSync(
        `SELECT * FROM dose_events WHERE schedule_id = ? AND status = 'pending' ORDER BY scheduled_at ASC`,
        [scheduleId],
      )
      .map(mapDoseEventRow);
  }

  updateScheduledAt(id: string, scheduledAt: string): void {
    const now = new Date().toISOString();
    this.db.runSync(
      `UPDATE dose_events SET scheduled_at = ?, updated_at = ? WHERE id = ?`,
      [scheduledAt, now, id],
    );
  }

  findPendingForMedication(medicationId: string, aroundIso: string): DoseEvent | null {
    const row = this.db
      .getAllSync(
        `SELECT * FROM dose_events WHERE medication_id = ? AND status = 'pending' ORDER BY scheduled_at ASC`,
        [medicationId],
      )
      .map(mapDoseEventRow)
      .find((dose) => slotKeysEqual(dose.scheduledAt, aroundIso));
    return row ?? null;
  }

  /** All actionable doses at the same clock minute (for grouped reminder screen). */
  findPendingDosesAtMinute(scheduledAt: string): DoseEvent[] {
    const doses = this.db
      .getAllSync(
        `SELECT * FROM dose_events WHERE status IN ('pending', 'snoozed') ORDER BY scheduled_at ASC`,
      )
      .map(mapDoseEventRow)
      .filter((dose) => slotKeysEqual(dose.scheduledAt, scheduledAt));

    return filterPendingDuplicatingResolved(
      filterPendingReplacedBySnooze(dedupeDoseEvents(doses)),
    );
  }

  getUpcomingForReminders(fromMillis: number, toMillis: number): DoseEvent[] {
    return this.db
      .getAllSync(
        `SELECT * FROM dose_events WHERE status IN ('pending', 'snoozed') ORDER BY scheduled_at ASC`,
      )
      .map(mapDoseEventRow)
      .filter((dose) => {
        const trigger = parseScheduledAt(dose.scheduledAt).getTime();
        return trigger > fromMillis && trigger <= toMillis;
      });
  }

  updateStatus(
    id: string,
    status: DoseStatus,
    options?: { variantId?: string; takenAt?: string },
  ): DoseEvent {
    const now = new Date().toISOString();
    this.db.runSync(
      `UPDATE dose_events SET status = ?, variant_id = COALESCE(?, variant_id),
        taken_at = COALESCE(?, taken_at), updated_at = ? WHERE id = ?`,
      [status, options?.variantId ?? null, options?.takenAt ?? null, now, id],
    );
    return this.getById(id)!;
  }

  delete(id: string): void {
    this.db.runSync(`DELETE FROM inventory_transactions WHERE dose_event_id = ?`, [id]);
    this.db.runSync(`DELETE FROM dose_events WHERE id = ?`, [id]);
  }
}

export function createDefaultVariantOnInsert(db: SQLiteDatabase, medicationId: string, label: string): MedicationVariant {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.runSync(
    `INSERT INTO medication_variants (id, medication_id, label, current_quantity, is_default, created_at)
     VALUES (?, ?, ?, 0, 1, ?)`,
    [id, medicationId, label, now],
  );
  return mapVariantRow(db.getFirstSync(`SELECT * FROM medication_variants WHERE id = ?`, [id])!);
}
