import type { SQLiteDatabase } from 'expo-sqlite';
import { addDays, format, startOfDay } from 'date-fns';
import { MedicationRepository, DoseEventRepository } from './medicationRepository';
import { mapDoseEventRow } from '../../db/rowMappers';
import {
  doseBelongsToDateKey,
  doseDedupeKey,
  dosesShareMedicationSlot,
  normalizeScheduledAtStorage,
  pickCanonicalDose,
} from './doseSlotUtils';
import { formatDateKey, parseScheduledAt, scheduledAtToDateKey } from '../../core/dates/dateUtils';
import { cleanupSnoozeConflicts } from './snoozeCleanupService';
import { expandOccurrences, parseTimesOfDay, scheduleIncludesDateKey } from '../reminders/occurrenceExpander';

const DEFAULT_HORIZON_DAYS = 14;

/** Remove duplicate dose rows for the same schedule slot (e.g. UTC + local legacy rows). */
export function removeDuplicateDoseEvents(db: SQLiteDatabase): number {
  const doseRepo = new DoseEventRepository(db);
  const allDoses = db
    .getAllSync(`SELECT * FROM dose_events ORDER BY created_at ASC`)
    .map(mapDoseEventRow);

  const bySlot = new Map<string, typeof allDoses>();
  for (const dose of allDoses) {
    const key = doseDedupeKey(dose);
    const group = bySlot.get(key) ?? [];
    group.push(dose);
    bySlot.set(key, group);
  }

  let removed = 0;
  for (const group of bySlot.values()) {
    if (group.length <= 1) continue;
    const keep = pickCanonicalDose(group);
    const normalizedAt = normalizeScheduledAtStorage(keep.scheduledAt);
    if (keep.scheduledAt !== normalizedAt) {
      doseRepo.updateScheduledAt(keep.id, normalizedAt);
    }
    for (const dose of group) {
      if (dose.id === keep.id) continue;
      doseRepo.delete(dose.id);
      removed += 1;
    }
  }

  return removed;
}

/** Drop pending doses whose schedule slot was deferred by a snooze. */
export function removePendingSupersededBySnooze(db: SQLiteDatabase): number {
  return cleanupSnoozeConflicts(db);
}

/** Drop pending doses that duplicate a taken/skipped/missed dose for the same medication slot. */
export function removePendingDuplicatingResolvedDoses(db: SQLiteDatabase): number {
  const doseRepo = new DoseEventRepository(db);
  const allDoses = db
    .getAllSync(`SELECT * FROM dose_events ORDER BY created_at ASC`)
    .map(mapDoseEventRow);

  const resolved = allDoses.filter((d) => ['taken', 'skipped', 'missed'].includes(d.status));

  let removed = 0;
  for (const dose of allDoses) {
    if (dose.status !== 'pending') continue;
    const duplicateResolved = resolved.some((other) => dosesShareMedicationSlot(other, dose));
    if (!duplicateResolved) continue;
    doseRepo.delete(dose.id);
    removed += 1;
  }

  return removed;
}

export function pruneStalePendingDoses(
  doseRepo: DoseEventRepository,
  scheduleId: string,
  occurrences: ReturnType<typeof expandOccurrences>,
): number {
  const validSlotKeys = new Set(
    occurrences.map((occ) => format(parseScheduledAt(occ.scheduledAt), 'yyyy-MM-dd-HH-mm')),
  );

  let removed = 0;
  for (const dose of doseRepo.getPendingForSchedule(scheduleId)) {
    const key = format(parseScheduledAt(dose.scheduledAt), 'yyyy-MM-dd-HH-mm');
    if (!validSlotKeys.has(key)) {
      doseRepo.delete(dose.id);
      removed += 1;
    }
  }

  return removed;
}

/** Remove actionable doses that fall outside the schedule start/end window. */
export function removeDosesOutsideScheduleWindow(db: SQLiteDatabase): number {
  const medRepo = new MedicationRepository(db);
  const doseRepo = new DoseEventRepository(db);
  let removed = 0;

  for (const med of medRepo.getAll()) {
    for (const schedule of medRepo.getActiveSchedules(med.id)) {
      for (const dose of [
        ...doseRepo.getPendingForSchedule(schedule.id),
        ...doseRepo.getSnoozedForSchedule(schedule.id),
      ]) {
        const dateKey = scheduledAtToDateKey(dose.scheduledAt);
        if (scheduleIncludesDateKey(schedule, dateKey)) continue;
        doseRepo.delete(dose.id);
        removed += 1;
      }
    }
  }

  return removed;
}

/** Drop future pending/snoozed doses after a schedule edit so new times can be generated. */
export function resyncPendingDosesAfterScheduleUpdate(
  db: SQLiteDatabase,
  scheduleId: string,
): number {
  const doseRepo = new DoseEventRepository(db);
  const fromMillis = startOfDay(new Date()).getTime();
  let removed = 0;

  for (const dose of [
    ...doseRepo.getPendingForSchedule(scheduleId),
    ...doseRepo.getSnoozedForSchedule(scheduleId),
  ]) {
    if (parseScheduledAt(dose.scheduledAt).getTime() < fromMillis) continue;
    doseRepo.delete(dose.id);
    removed += 1;
  }

  return removed;
}

/** How many new pending doses a day still needs after existing records. */
export function pendingDosesNeededAfterCompleted(
  timesPerDay: number,
  completedCount: number,
): number {
  return Math.max(0, timesPerDay - Math.max(0, completedCount));
}

function getDosesForMedicationOnDate(
  db: SQLiteDatabase,
  medicationId: string,
  dateKey: string,
): ReturnType<typeof mapDoseEventRow>[] {
  return db
    .getAllSync(`SELECT * FROM dose_events WHERE medication_id = ?`, [medicationId])
    .map(mapDoseEventRow)
    .filter((dose) => doseBelongsToDateKey(dose, dateKey));
}

/** Drop extra pending rows when today already has more doses than the new times-per-day. */
export function trimExtraPendingDosesForDate(
  doseRepo: DoseEventRepository,
  dosesForDate: ReturnType<typeof mapDoseEventRow>[],
  timesPerDay: number,
): ReturnType<typeof mapDoseEventRow>[] {
  const surplus = dosesForDate.length - timesPerDay;
  if (surplus <= 0) return dosesForDate;

  const extraPending = [...dosesForDate]
    .filter((dose) => dose.status === 'pending')
    .sort(
      (a, b) =>
        parseScheduledAt(b.scheduledAt).getTime() - parseScheduledAt(a.scheduledAt).getTime(),
    );

  const removedIds = new Set<string>();
  let removed = 0;
  for (const dose of extraPending) {
    if (removed >= surplus) break;
    doseRepo.delete(dose.id);
    removedIds.add(dose.id);
    removed += 1;
  }

  return dosesForDate.filter((dose) => !removedIds.has(dose.id));
}

/** Remove dose rows whose medication was deleted (legacy DBs without FK cascade). */
export function purgeOrphanDoseEvents(db: SQLiteDatabase): number {
  const before = db.getAllSync<{ id: string }>(
    `SELECT id FROM dose_events WHERE medication_id NOT IN (SELECT id FROM medications)`,
  );
  if (before.length === 0) return 0;
  db.runSync(
    `DELETE FROM dose_events WHERE medication_id NOT IN (SELECT id FROM medications)`,
  );
  return before.length;
}

/** Generate pending dose_events for all active schedules within the horizon. Idempotent. */
export function generateUpcomingDoseEvents(
  db: SQLiteDatabase,
  horizonDays = DEFAULT_HORIZON_DAYS,
): number {
  purgeOrphanDoseEvents(db);
  removeDuplicateDoseEvents(db);
  removePendingSupersededBySnooze(db);
  removePendingDuplicatingResolvedDoses(db);
  removeDosesOutsideScheduleWindow(db);

  const medRepo = new MedicationRepository(db);
  const doseRepo = new DoseEventRepository(db);
  const from = startOfDay(new Date());
  const to = addDays(from, horizonDays);
  const todayKey = formatDateKey(from);
  let created = 0;

  for (const med of medRepo.getAll()) {
    for (const schedule of medRepo.getActiveSchedules(med.id)) {
      const occurrences = expandOccurrences(schedule, from, to);
      const times = parseTimesOfDay(schedule.timesOfDay);
      pruneStalePendingDoses(doseRepo, schedule.id, occurrences);
      const remainingToday = trimExtraPendingDosesForDate(
        doseRepo,
        getDosesForMedicationOnDate(db, med.id, todayKey),
        times.length,
      );
      const neededToday = pendingDosesNeededAfterCompleted(times.length, remainingToday.length);
      let createdToday = 0;
      for (const occ of occurrences) {
        const occDateKey = formatDateKey(parseScheduledAt(occ.scheduledAt));
        if (doseRepo.existsForScheduleAt(schedule.id, occ.scheduledAt)) continue;
        if (doseRepo.existsForMedicationAt(occ.medicationId, occ.scheduledAt)) continue;
        if (occDateKey === todayKey && createdToday >= neededToday) continue;
        doseRepo.createPending({
          medicationId: occ.medicationId,
          scheduleId: occ.scheduleId,
          scheduledAt: occ.scheduledAt,
          doseAmount: occ.doseAmount,
        });
        created += 1;
        if (occDateKey === todayKey) {
          createdToday += 1;
        }
      }
    }
  }

  removeDuplicateDoseEvents(db);
  removePendingDuplicatingResolvedDoses(db);

  return created;
}
