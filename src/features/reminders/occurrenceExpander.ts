import { addDays, addMinutes, format, startOfDay, isBefore, isAfter } from 'date-fns';
import type { Schedule } from '../../db/schema';
import type { TimeOfDay } from '../../core/types/domain';
import { formatLocalDateTime, formatDateKey, parseDateKey, parseScheduledAt } from '../../core/dates/dateUtils';

export interface DoseOccurrence {
  medicationId: string;
  scheduleId: string;
  scheduledAt: string;
  doseAmount: number;
}

export function parseTimesOfDay(json: string): TimeOfDay[] {
  try {
    return JSON.parse(json) as TimeOfDay[];
  } catch {
    return [];
  }
}

export function expandOccurrences(
  schedule: Schedule,
  fromDate: Date,
  toDate: Date,
): DoseOccurrence[] {
  if (!schedule.isActive || schedule.type === 'as_needed') {
    return [];
  }

  const times = parseTimesOfDay(schedule.timesOfDay);
  if (times.length === 0) return [];

  const occurrences: DoseOccurrence[] = [];
  let cursor = startOfDay(fromDate);
  const end = startOfDay(toDate);

  while (!isAfter(cursor, end)) {
    if (shouldFireOnDate(schedule, cursor)) {
      for (const time of times) {
        const scheduled = new Date(cursor);
        scheduled.setHours(time.hour, time.minute, 0, 0);
        if (!isBefore(scheduled, fromDate) && !isAfter(scheduled, toDate)) {
          occurrences.push({
            medicationId: schedule.medicationId,
            scheduleId: schedule.id,
            scheduledAt: formatLocalDateTime(scheduled),
            doseAmount: time.doseAmount ?? 1,
          });
        }
      }
    }
    cursor = addDays(cursor, 1);
  }

  return occurrences;
}

/** Whether a calendar day falls within the schedule start/end window (inclusive). */
export function scheduleIncludesDateKey(
  schedule: Pick<Schedule, 'startDate' | 'endDate'>,
  dateKey: string,
): boolean {
  const date = startOfDay(parseDateKey(dateKey));
  const start = startOfDay(parseDateKey(schedule.startDate));
  if (isBefore(date, start)) return false;
  if (schedule.endDate && isAfter(date, startOfDay(parseDateKey(schedule.endDate)))) {
    return false;
  }
  return true;
}

function shouldFireOnDate(schedule: Schedule, date: Date): boolean {
  if (!scheduleIncludesDateKey(schedule, formatDateKey(date))) return false;

  switch (schedule.type) {
    case 'fixed_daily':
      return true;
    case 'interval_days': {
      const interval = schedule.intervalDays ?? 1;
      const start = startOfDay(parseDateKey(schedule.startDate));
      const diff = Math.floor((startOfDay(date).getTime() - start.getTime()) / 86400000);
      return diff % interval === 0;
    }
    case 'weekdays': {
      const mask = schedule.weekdayMask ?? 0;
      const dayBit = 1 << date.getDay();
      return (mask & dayBit) !== 0;
    }
    case 'monthly':
      return date.getDate() === (schedule.dayOfMonth ?? parseDateKey(schedule.startDate).getDate());
    default:
      return false;
  }
}

export function computeSnoozeTime(minutes: number, from: Date = new Date()): string {
  return formatLocalDateTime(addMinutes(from, minutes));
}

export function formatOccurrenceKey(occurrence: DoseOccurrence): string {
  return `${occurrence.scheduleId}:${format(parseScheduledAt(occurrence.scheduledAt), 'yyyy-MM-dd-HH-mm')}`;
}
