import { format } from 'date-fns';
import { parseScheduledAt } from '../../core/dates/dateUtils';

export interface AlarmScheduleInput {
  id: string;
  medicationId: string;
  medicationName: string;
  scheduledAt: string;
  doseAmount: number;
  doseEventId?: string;
}

/** One alarm per medication + minute — avoids duplicate dose rows firing together. */
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

export function slotAlarmId(scheduledAt: string): string {
  return `slot:${format(parseScheduledAt(scheduledAt), 'yyyy-MM-dd-HH-mm')}`;
}

/**
 * One native alarm per clock minute. Payload keeps medicationId so the existing
 * Android module can schedule it; the reminder screen loads every med at that time from SQLite.
 */
export function groupToSlotAlarms(occurrences: AlarmScheduleInput[]): AlarmScheduleInput[] {
  const unique = dedupeAlarms(occurrences);
  const bySlot = new Map<string, AlarmScheduleInput>();

  for (const occ of unique) {
    const id = slotAlarmId(occ.scheduledAt);
    if (!bySlot.has(id)) {
      bySlot.set(id, { ...occ, id });
    }
  }

  return Array.from(bySlot.values()).sort(
    (a, b) => parseScheduledAt(a.scheduledAt).getTime() - parseScheduledAt(b.scheduledAt).getTime(),
  );
}
