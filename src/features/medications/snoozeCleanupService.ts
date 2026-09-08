import type { SQLiteDatabase } from 'expo-sqlite';
import { mapDoseEventRow } from '../../db/rowMappers';
import { MedicationRepository, DoseEventRepository } from './medicationRepository';
import { parseTimesOfDay } from '../reminders/occurrenceExpander';
import {
  buildSnoozedFromNotes,
  parseSnoozedFromNotes,
  slotKeyFromScheduledAt,
} from './doseSlotUtils';
import { scheduledAtToDateKey } from '../../core/dates/dateUtils';

/** Remove pending doses that conflict with an active snooze for the same schedule slot. */
export function cleanupSnoozeConflicts(db: SQLiteDatabase): number {
  const medRepo = new MedicationRepository(db);
  const doseRepo = new DoseEventRepository(db);
  let removed = 0;

  const loadAll = () =>
    db.getAllSync(`SELECT * FROM dose_events ORDER BY created_at ASC`).map(mapDoseEventRow);

  let allDoses = loadAll();

  for (const snoozed of allDoses.filter((d) => d.status === 'snoozed' && !parseSnoozedFromNotes(d.notes))) {
    if (!snoozed.scheduleId) continue;
    const schedule = medRepo.getSchedule(snoozed.scheduleId);
    const times = parseTimesOfDay(schedule?.timesOfDay ?? '[]');
    const dayKey = scheduledAtToDateKey(snoozed.scheduledAt);
    const pendingOnDay = allDoses.filter(
      (d) =>
        d.status === 'pending' &&
        d.scheduleId === snoozed.scheduleId &&
        scheduledAtToDateKey(d.scheduledAt) === dayKey,
    );

    if (pendingOnDay.length === 0) continue;
    if (times.length !== 1 && pendingOnDay.length !== 1) continue;

    doseRepo.backfillSnoozeNotes(snoozed.id, pendingOnDay[0].scheduledAt);
    for (const pending of pendingOnDay) {
      doseRepo.delete(pending.id);
      removed += 1;
    }
  }

  allDoses = loadAll();

  const deferredKeys = new Set<string>();
  for (const dose of allDoses) {
    if (dose.status !== 'snoozed' || !dose.scheduleId) continue;
    const snoozedFrom = parseSnoozedFromNotes(dose.notes);
    if (snoozedFrom) {
      deferredKeys.add(`${dose.scheduleId}:${slotKeyFromScheduledAt(snoozedFrom)}`);
    }
  }

  for (const dose of allDoses) {
    if (dose.status !== 'pending' || !dose.scheduleId) continue;
    const key = `${dose.scheduleId}:${slotKeyFromScheduledAt(dose.scheduledAt)}`;
    if (deferredKeys.has(key)) {
      doseRepo.delete(dose.id);
      removed += 1;
    }
  }

  allDoses = loadAll();

  for (const med of medRepo.getAll()) {
    for (const schedule of medRepo.getActiveSchedules(med.id)) {
      const times = parseTimesOfDay(schedule.timesOfDay);
      if (times.length !== 1) continue;

      const scheduleDoses = allDoses.filter((d) => d.scheduleId === schedule.id);
      const snoozedDays = new Set(
        scheduleDoses
          .filter((d) => d.status === 'snoozed')
          .map((d) => scheduledAtToDateKey(d.scheduledAt)),
      );

      for (const dayKey of snoozedDays) {
        for (const dose of scheduleDoses) {
          if (dose.status !== 'pending') continue;
          if (scheduledAtToDateKey(dose.scheduledAt) !== dayKey) continue;
          doseRepo.delete(dose.id);
          removed += 1;
        }
      }
    }
  }

  return removed;
}

export function deletePendingAtSlot(
  doseRepo: DoseEventRepository,
  scheduleId: string | null | undefined,
  originalScheduledAt: string,
): void {
  if (!scheduleId) return;
  const slotKey = slotKeyFromScheduledAt(originalScheduledAt);
  for (const dose of doseRepo.getPendingForSchedule(scheduleId)) {
    if (slotKeyFromScheduledAt(dose.scheduledAt) === slotKey) {
      doseRepo.delete(dose.id);
    }
  }
}
