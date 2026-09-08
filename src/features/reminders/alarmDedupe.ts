import { format } from 'date-fns';
import { parseScheduledAt } from '../../core/dates/dateUtils';
import type { AlarmScheduleInput } from './reminderService';

/** One alarm per medication + minute slot — avoids duplicate dose rows firing together. */
export function dedupeAlarms(occurrences: AlarmScheduleInput[]): AlarmScheduleInput[] {
  const bySlot = new Map<string, AlarmScheduleInput>();

  for (const occ of occurrences) {
    const slotKey = `${occ.medicationId}:${format(parseScheduledAt(occ.scheduledAt), 'yyyy-MM-dd-HH-mm')}`;
    if (!bySlot.has(slotKey)) {
      bySlot.set(slotKey, occ);
    }
  }

  return Array.from(bySlot.values()).sort(
    (a, b) => parseScheduledAt(a.scheduledAt).getTime() - parseScheduledAt(b.scheduledAt).getTime(),
  );
}
