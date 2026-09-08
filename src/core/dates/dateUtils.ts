import { format, parseISO, startOfDay, addDays, isSameDay } from 'date-fns';

export function formatDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** Parse YYYY-MM-DD as a local calendar date (not UTC midnight). */
export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export function formatTime24(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** Wall-clock local datetime for dose schedules (no timezone suffix). */
export function formatLocalDateTime(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm:ss");
}

/** Parse stored scheduled_at values (legacy UTC ISO or local wall-clock). */
export function parseScheduledAt(iso: string): Date {
  if (iso.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(iso)) {
    return parseISO(iso);
  }

  const normalized = iso.length >= 19 ? iso.slice(0, 19) : iso.length === 16 ? `${iso}:00` : iso;
  const [datePart, timePart = '00:00:00'] = normalized.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second = 0] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, second, 0);
}

/** Display a scheduled dose time in the user's local timezone. */
export function formatScheduledTime(iso: string): string {
  return format(parseScheduledAt(iso), 'HH:mm');
}

export function scheduledAtToDateKey(iso: string): string {
  return formatDateKey(parseScheduledAt(iso));
}

export function formatDisplayDate(dateKey: string): string {
  return format(parseDateKey(dateKey), 'd MMMM');
}

export function hasScheduleEndDate(endDate?: string | null): boolean {
  return !!endDate?.trim();
}

export function getDateStrip(days: number, center: Date = new Date()): Date[] {
  const start = addDays(startOfDay(center), -Math.floor(days / 2));
  return Array.from({ length: days }, (_, i) => addDays(start, i));
}

/** Last N calendar days ending on `end` (inclusive). For history — no future dates. */
export function getPastDateStrip(days: number, end: Date = new Date()): Date[] {
  const endDay = startOfDay(end);
  return Array.from({ length: days }, (_, i) => addDays(endDay, i - (days - 1)));
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function computeDonutRatio(taken: number, scheduled: number): number {
  if (scheduled <= 0) return 0;
  return Math.min(1, taken / scheduled);
}
