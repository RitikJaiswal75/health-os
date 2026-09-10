import type { SQLiteDatabase } from 'expo-sqlite';
import { MedicationRepository } from './medicationRepository';
import { purgeOrphanDoseEvents } from './doseGenerationService';
import { ReminderReconciler, scheduleAlarms } from '../reminders/reminderService';

export async function removeMedicationWithReminders(
  db: SQLiteDatabase,
  medicationId: string,
): Promise<boolean> {
  const medRepo = new MedicationRepository(db);
  const med = medRepo.getById(medicationId);
  if (!med) return false;

  medRepo.delete(medicationId);

  purgeOrphanDoseEvents(db);
  const remaining = new ReminderReconciler(db).reconcile(7);
  await scheduleAlarms(remaining);
  return true;
}
