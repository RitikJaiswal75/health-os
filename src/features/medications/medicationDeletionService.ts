import type { SQLiteDatabase } from 'expo-sqlite';
import { MedicationRepository } from './medicationRepository';
import { purgeOrphanDoseEvents } from './doseGenerationService';
import {
  ReminderReconciler,
  cancelAlarm,
  scheduleAlarms,
  type AlarmScheduleInput,
} from '../reminders/reminderService';

export async function removeMedicationWithReminders(
  db: SQLiteDatabase,
  medicationId: string,
): Promise<boolean> {
  const medRepo = new MedicationRepository(db);
  const med = medRepo.getById(medicationId);
  if (!med) return false;

  const reconciler = new ReminderReconciler(db);
  const alarms = reconciler.reconcile(7).filter((alarm: AlarmScheduleInput) => alarm.medicationId === medicationId);
  await Promise.all(alarms.map((alarm: AlarmScheduleInput) => cancelAlarm(alarm.id)));

  medRepo.delete(medicationId);

  purgeOrphanDoseEvents(db);
  const remaining = new ReminderReconciler(db).reconcile(7);
  await scheduleAlarms(remaining);
  return true;
}
