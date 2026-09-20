import { isBefore, startOfDay } from 'date-fns';
import type { Medication, Schedule } from '../../db/schema';
import { formatDateKey, formatDisplayDate, hasScheduleEndDate, parseDateKey } from '../../core/dates/dateUtils';
import type { MedicationRepository } from './medicationRepository';
import { t } from '@/src/i18n/translate';

export interface ProposedSchedulePeriod {
  startDate: string;
  endDate?: string;
}

export interface DuplicateMedicationConflict {
  medication: Medication;
  schedule: Schedule;
}

export function normalizeMedicationName(name: string): string {
  return name.trim().toLowerCase();
}

export function medicationNamesMatch(left: string, right: string): boolean {
  return normalizeMedicationName(left) === normalizeMedicationName(right);
}

export function medicationMatchesName(
  medication: Pick<Medication, 'name' | 'nickname'>,
  candidateName: string,
): boolean {
  if (medicationNamesMatch(candidateName, medication.name)) {
    return true;
  }
  return medication.nickname ? medicationNamesMatch(candidateName, medication.nickname) : false;
}

/** Whether two schedule date windows overlap (inclusive, open-ended when end date is missing). */
export function schedulePeriodsOverlap(
  existing: Pick<Schedule, 'startDate' | 'endDate'>,
  proposed: ProposedSchedulePeriod,
): boolean {
  const existingStart = startOfDay(parseDateKey(existing.startDate));
  const existingEnd = existing.endDate ? startOfDay(parseDateKey(existing.endDate)) : null;
  const proposedStart = startOfDay(parseDateKey(proposed.startDate));
  const proposedEnd = proposed.endDate ? startOfDay(parseDateKey(proposed.endDate)) : null;

  if (existingEnd && isBefore(existingEnd, proposedStart)) {
    return false;
  }
  if (proposedEnd && isBefore(proposedEnd, existingStart)) {
    return false;
  }
  return true;
}

export function formatActiveSchedulePeriod(
  schedule: Pick<Schedule, 'startDate' | 'endDate'>,
): string {
  const start = formatDisplayDate(schedule.startDate);
  if (hasScheduleEndDate(schedule.endDate)) {
    return t('duplicate.periodRange', { start, end: formatDisplayDate(schedule.endDate!) });
  }
  return t('duplicate.noEnd', { start });
}

export function formatDuplicateMedicationMessage(conflict: DuplicateMedicationConflict): string {
  const label = conflict.medication.nickname ?? conflict.medication.name;
  const period = formatActiveSchedulePeriod(conflict.schedule);
  return t('duplicate.body', { name: label, period });
}

export function proposedSchedulePeriod(
  startDate: string,
  endDate?: string,
): ProposedSchedulePeriod {
  return {
    startDate,
    endDate: hasScheduleEndDate(endDate) ? endDate!.trim() : undefined,
  };
}

/** Early wizard check: new medications default to starting today with no end date. */
export function defaultProposedScheduleForNewMedication(
  today: Date = new Date(),
): ProposedSchedulePeriod {
  return proposedSchedulePeriod(formatDateKey(today));
}

export function findEarlyDuplicateMedicationConflict(
  medRepo: MedicationRepository,
  name: string,
): DuplicateMedicationConflict | null {
  return findDuplicateMedicationConflict(medRepo, name, defaultProposedScheduleForNewMedication());
}

export function findDuplicateMedicationConflict(
  medRepo: MedicationRepository,
  name: string,
  proposedSchedule: ProposedSchedulePeriod,
  excludeMedicationId?: string,
): DuplicateMedicationConflict | null {
  const normalized = normalizeMedicationName(name);
  if (!normalized) return null;

  for (const medication of medRepo.getAll()) {
    if (excludeMedicationId && medication.id === excludeMedicationId) {
      continue;
    }
    if (!medicationMatchesName(medication, name)) {
      continue;
    }

    for (const schedule of medRepo.getActiveSchedules(medication.id)) {
      if (schedulePeriodsOverlap(schedule, proposedSchedule)) {
        return { medication, schedule };
      }
    }
  }

  return null;
}
