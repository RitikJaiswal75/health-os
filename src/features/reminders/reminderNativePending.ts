import { Platform } from 'react-native';
import type { ReminderRouteParams } from './reminderRouteParams';

export async function getNativePendingReminders(): Promise<ReminderRouteParams[]> {
  if (Platform.OS !== 'android') return [];

  try {
    const MedicationAlarm = require('../../../modules/medication-alarm');
    if (!MedicationAlarm?.getPendingReminders) return [];

    const rows = await MedicationAlarm.getPendingReminders();
    if (!Array.isArray(rows)) return [];

    return rows
      .map((row) => ({
        medicationId: typeof row.medicationId === 'string' ? row.medicationId : '',
        alarmId: typeof row.alarmId === 'string' ? row.alarmId : '',
        scheduledAt: typeof row.scheduledAt === 'string' ? row.scheduledAt : undefined,
        doseEventId: typeof row.doseEventId === 'string' ? row.doseEventId : undefined,
      }))
      .filter((row) => row.alarmId && (row.medicationId || row.scheduledAt));
  } catch {
    return [];
  }
}
