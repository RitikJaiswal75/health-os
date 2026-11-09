// Real SQLite + real repositories: marking, editing and deleting doses must keep stock right.
import type { SQLiteDatabase } from 'expo-sqlite';
import { createTestDb } from './helpers/sqliteDb';
import {
  DoseEventRepository,
  MedicationRepository,
} from '../src/features/medications/medicationRepository';
import {
  createMedicationAndBackfill,
  generateUpcomingDoseEvents,
} from '../src/features/medications/doseGenerationService';
import {
  deleteDose,
  markDoseAsTaken,
  saveDoseEdit,
} from '../src/features/inventory/doseTakenService';
import { notifyRefillIfNeeded } from '../src/features/inventory/refillReminderService';
import { InventoryService } from '../src/features/inventory/inventoryService';
import { ReminderReconciler } from '../src/features/reminders/reminderService';

// The real ReminderReconciler (DB -> alarms) without the notification plumbing around it.
jest.mock('expo-notifications', () => ({}));
jest.mock('../src/features/reminders/notificationSetup', () => ({}));
jest.mock('../src/features/reminders/reminderService', () => ({
  ...jest.requireActual('../src/features/reminders/reminderService'),
  rescheduleReminders: jest.fn(() => Promise.resolve()),
}));
jest.mock('../src/features/inventory/refillReminderService', () => ({
  notifyRefillIfNeeded: jest.fn(() => Promise.resolve()),
}));
jest.mock('../src/core/observability/crashReporter', () => ({ reportError: jest.fn() }));

/** A tablet taken 2 at a time at 08:00, with `quantity` left; returns today's dose. */
function setUp(quantity: number) {
  const db = createTestDb();
  const { medication } = createMedicationAndBackfill(db, {
    name: 'Metformin',
    medicationType: 'tablet',
    currentQuantity: quantity,
    schedule: {
      type: 'fixed_daily',
      timesOfDay: [{ hour: 8, minute: 0, doseAmount: 2 }],
      startDate: '2026-09-13',
    },
  });
  generateUpcomingDoseEvents(db, 1);
  const doseRepo = new DoseEventRepository(db);
  const row = db.getFirstSync<{ id: string }>(
    `SELECT id FROM dose_events WHERE medication_id = ? ORDER BY scheduled_at LIMIT 1`,
    [medication.id],
  );
  return { db, doseRepo, medId: medication.id, doseId: row!.id };
}

/** Make every write whose SQL starts with `prefix` fail like a full disk. */
function failOn(db: SQLiteDatabase, prefix: string): void {
  const runSync = db.runSync.bind(db);
  jest.spyOn(db, 'runSync').mockImplementation(((sql: string, params: unknown[]) => {
    if (sql.trim().startsWith(prefix)) throw new Error('disk I/O error');
    return runSync(sql, params as never);
  }) as typeof db.runSync);
}

function stock(db: SQLiteDatabase, medId: string): number {
  return new MedicationRepository(db).getById(medId)!.currentQuantity ?? NaN;
}

describe('dose writes', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-13T10:00:00'));
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('undoing a dose that emptied the stock restores only what was removed', () => {
    const { db, doseRepo, medId, doseId } = setUp(1);
    markDoseAsTaken(db, doseId);
    expect(stock(db, medId)).toBe(0);

    saveDoseEdit(db, doseRepo.getById(doseId)!, 'skipped');
    expect(stock(db, medId)).toBe(1);
  });

  it('keeps the variant count in step with what was removed from the medication', () => {
    const { db, doseRepo, medId, doseId } = setUp(1);
    // Variant holds more than the medication, so the clamp only applies to the medication.
    db.runSync(`UPDATE medication_variants SET current_quantity = 2 WHERE medication_id = ?`, [medId]);
    const variantQty = () =>
      db.getFirstSync<{ current_quantity: number }>(
        `SELECT current_quantity FROM medication_variants WHERE medication_id = ?`,
        [medId],
      )!.current_quantity;

    markDoseAsTaken(db, doseId);
    expect(variantQty()).toBe(1);

    saveDoseEdit(db, doseRepo.getById(doseId)!, 'skipped');
    expect(stock(db, medId)).toBe(1);
    expect(variantQty()).toBe(2);
  });

  it('clears taken_at when a taken dose is changed to another status', () => {
    const { db, doseRepo, doseId } = setUp(10);
    markDoseAsTaken(db, doseId);
    expect(doseRepo.getById(doseId)!.takenAt).not.toBeNull();

    saveDoseEdit(db, doseRepo.getById(doseId)!, 'skipped');
    expect(doseRepo.getById(doseId)!.takenAt).toBeNull();
  });

  it('marks past doses nobody logged as skipped when the app opens days later', () => {
    const { db, doseRepo, medId, doseId } = setUp(10);
    generateUpcomingDoseEvents(db, 14); // what startup does: the next days already have rows
    // App not opened for two days (or data restored from a backup): generation runs again.
    jest.setSystemTime(new Date('2026-09-15T09:00:00'));
    generateUpcomingDoseEvents(db, 14);

    expect(doseRepo.getById(doseId)?.status).toBe('skipped');
    const day = (key: string) =>
      db.getAllSync<{ status: string }>(`SELECT status FROM dose_events WHERE scheduled_at LIKE ?`, [`${key}%`]);
    expect(day('2026-09-14')).toEqual([{ status: 'skipped' }]);
    // Today's 08:00 is already past but stays pending: it can still be logged.
    expect(day('2026-09-15')).toEqual([{ status: 'pending' }]);
    expect(stock(db, medId)).toBe(10);
  });

  it('leaves a late-night dose pending for a few hours after midnight, so the alarm can still log it', () => {
    const db = createTestDb();
    const { medication } = createMedicationAndBackfill(db, {
      name: 'Melatonin',
      medicationType: 'tablet',
      currentQuantity: 10,
      schedule: { type: 'fixed_daily', timesOfDay: [{ hour: 23, minute: 30 }], startDate: '2026-09-13' },
    });
    generateUpcomingDoseEvents(db, 14);
    const status = () =>
      db.getFirstSync<{ status: string }>(
        `SELECT status FROM dose_events WHERE medication_id = ? AND scheduled_at LIKE '2026-09-13T23:30%'`,
        [medication.id],
      )?.status;

    jest.setSystemTime(new Date('2026-09-14T00:10:00'));
    generateUpcomingDoseEvents(db, 14);
    expect(status()).toBe('pending');

    jest.setSystemTime(new Date('2026-09-14T06:00:00'));
    generateUpcomingDoseEvents(db, 14, false);
    expect(status()).toBe('skipped');
  });

  it('the alarm screen offers its own dose only while it is still open', () => {
    const { doseRepo, medId, doseId } = setUp(10);
    const slot = doseRepo.getById(doseId)!.scheduledAt;
    expect(doseRepo.findAlarmDose(medId, doseId, slot)?.id).toBe(doseId);

    doseRepo.updateStatus(doseId, 'skipped');
    expect(doseRepo.findAlarmDose(medId, doseId, slot)).toBeNull();
  });

  it('the alarm screen falls back to the pending dose at the same time when its id is gone', () => {
    const { doseRepo, medId, doseId } = setUp(10);
    const slot = doseRepo.getById(doseId)!.scheduledAt;
    expect(doseRepo.findAlarmDose(medId, 'deleted-id', slot)?.id).toBe(doseId);
  });

  it('turns doses saved as missed by older versions into skipped', () => {
    const { db, doseRepo, doseId } = setUp(10);
    db.runSync(`UPDATE dose_events SET status = 'missed' WHERE id = ?`, [doseId]);
    jest.setSystemTime(new Date('2026-09-14T09:00:00'));
    generateUpcomingDoseEvents(db, 14, false);

    expect(doseRepo.getById(doseId)?.status).toBe('skipped');
  });

  it('marks a dose snoozed on an earlier day as skipped too', () => {
    const { db, doseRepo, doseId } = setUp(10);
    doseRepo.snooze(doseId, '2026-09-13T11:00:00', '2026-09-13T08:00:00');
    jest.setSystemTime(new Date('2026-09-14T09:00:00'));
    generateUpcomingDoseEvents(db, 14, false);

    expect(doseRepo.getById(doseId)?.status).toBe('skipped');
  });

  it('deleting a taken dose that emptied the stock restores only what was removed', () => {
    const { db, doseRepo, medId, doseId } = setUp(1);
    markDoseAsTaken(db, doseId);

    deleteDose(db, doseRepo.getById(doseId)!);
    expect(stock(db, medId)).toBe(1);
  });

  it('marking Taken through an edit sends the refill check, like the Home Taken button', () => {
    const { db, doseRepo, doseId } = setUp(10);
    saveDoseEdit(db, doseRepo.getById(doseId)!, 'taken');

    expect(doseRepo.getById(doseId)!.status).toBe('taken');
    expect(notifyRefillIfNeeded).toHaveBeenCalledTimes(1);
  });

  it('leaves stock untouched when saving the taken status fails', () => {
    const { db, doseRepo, medId, doseId } = setUp(10);
    jest.spyOn(DoseEventRepository.prototype, 'updateStatus').mockImplementationOnce(() => {
      throw new Error('disk I/O error');
    });

    expect(markDoseAsTaken(db, doseId)).toBe(false);
    expect(stock(db, medId)).toBe(10);
    expect(doseRepo.getById(doseId)!.status).toBe('pending');

    // The retry deducts exactly once.
    expect(markDoseAsTaken(db, doseId)).toBe(true);
    expect(stock(db, medId)).toBe(8);
  });

  it('leaves stock and status untouched when the ledger write fails', () => {
    const { db, doseRepo, medId, doseId } = setUp(1);
    failOn(db, 'INSERT INTO inventory_transactions');

    expect(markDoseAsTaken(db, doseId)).toBe(false);
    expect(stock(db, medId)).toBe(1);
    expect(doseRepo.getById(doseId)!.status).toBe('pending');
  });

  it('an edit or delete that fails reports false instead of throwing into the button handler', () => {
    const { db, doseRepo, medId, doseId } = setUp(10);
    markDoseAsTaken(db, doseId);
    const taken = doseRepo.getById(doseId)!;
    failOn(db, 'UPDATE medications');

    expect(saveDoseEdit(db, taken, 'skipped')).toBe(false);
    expect(deleteDose(db, taken)).toBe(false);
    expect(stock(db, medId)).toBe(8);
  });

  it('a refill that fails part way changes neither quantity', () => {
    const { db, medId } = setUp(10);
    const medRepo = new MedicationRepository(db);
    const inventory = new InventoryService(db, medRepo, new DoseEventRepository(db));
    failOn(db, 'UPDATE medication_variants');

    expect(() => inventory.addRefillQuantity(medId, 30)).toThrow('disk I/O error');
    expect(stock(db, medId)).toBe(10);
  });

  it('reports an already-taken dose as logged, so the alarm screen can close', () => {
    const { db, medId, doseId } = setUp(10);
    expect(markDoseAsTaken(db, doseId)).toBe(true);
    expect(markDoseAsTaken(db, doseId)).toBe(true);
    expect(stock(db, medId)).toBe(8);
  });

  it('a snoozed dose still gets an alarm at its new time', () => {
    const { db, doseRepo, doseId } = setUp(10);
    jest.setSystemTime(new Date('2026-09-13T07:55:00'));
    doseRepo.snooze(doseId, '2026-09-13T08:15:00', '2026-09-13T08:00:00');

    const alarms = new ReminderReconciler(db).reconcile(7);
    expect(alarms.find((alarm) => alarm.doseEventId === doseId)?.scheduledAt).toBe('2026-09-13T08:15:00');
  });

  it('keeps a medication whole when deleting it fails part way', () => {
    const { db, medId } = setUp(10);
    const runSync = db.runSync.bind(db);
    jest.spyOn(db, 'runSync').mockImplementation(((sql: string, params: unknown[]) => {
      if (sql.startsWith('DELETE FROM medications')) throw new Error('disk I/O error');
      return runSync(sql, params as never);
    }) as typeof db.runSync);

    expect(() => new MedicationRepository(db).delete(medId)).toThrow('disk I/O error');
    const doses = db.getAllSync(`SELECT id FROM dose_events WHERE medication_id = ?`, [medId]);
    expect(doses.length).toBeGreaterThan(0);
  });

  it('leaves no half-saved medication when creating it fails part way', () => {
    const db = createTestDb();
    const runSync = db.runSync.bind(db);
    jest.spyOn(db, 'runSync').mockImplementation(((sql: string, params: unknown[]) => {
      if (sql.startsWith('INSERT INTO schedules')) throw new Error('disk I/O error');
      return runSync(sql, params as never);
    }) as typeof db.runSync);

    expect(() =>
      new MedicationRepository(db).create({
        name: 'Metformin',
        medicationType: 'tablet',
        currentQuantity: 10,
        schedule: { type: 'fixed_daily', timesOfDay: [{ hour: 8, minute: 0 }], startDate: '2026-09-13' },
      }),
    ).toThrow('disk I/O error');
    expect(new MedicationRepository(db).getAll()).toHaveLength(0);
  });
});
