import type { SQLiteDatabase } from 'expo-sqlite';
import { DoseEventRepository, MedicationRepository } from './medicationRepository';
import { purgeOrphanDoseEvents } from './doseGenerationService';
import { dismissReminderNotification, rescheduleReminders } from '../reminders/reminderService';
import { getNativePendingReminders } from '../reminders/reminderNativePending';

export async function removeMedicationWithReminders(
  db: SQLiteDatabase,
  medicationId: string,
): Promise<boolean> {
  const medRepo = new MedicationRepository(db);
  const med = medRepo.getById(medicationId);
  if (!med) return false;

  const ringing = await getNativePendingReminders();

  medRepo.delete(medicationId);

  purgeOrphanDoseEvents(db);
  const doseRepo = new DoseEventRepository(db);
  const ringingForMedication = ringing.filter(
    (reminder) => reminder.medicationId === medicationId,
  );
  for (const reminder of ringingForMedication) {
    const remainingAtSlot = reminder.scheduledAt
      ? doseRepo.findPendingDosesAtMinute(reminder.scheduledAt)
      : [];
    if (remainingAtSlot.length === 0) {
      await dismissReminderNotification(reminder.alarmId);
    }
  }

  await rescheduleReminders(db);
  return true;
}
