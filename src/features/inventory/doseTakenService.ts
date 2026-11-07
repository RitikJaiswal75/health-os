import type { SQLiteDatabase } from 'expo-sqlite';
import type { DoseEvent } from '../../db/types';
import type { DoseStatus } from '../../core/types/domain';
import { MedicationRepository, DoseEventRepository } from '../medications/medicationRepository';
import { canLogDoseForTodayOrPast } from '../medications/doseSlotUtils';
import { InventoryService } from './inventoryService';
import { notifyRefillIfNeeded } from './refillReminderService';
import { reportError } from '@/src/core/observability/crashReporter';
import { rescheduleReminders } from '../reminders/reminderService';

function services(db: SQLiteDatabase) {
  const medRepo = new MedicationRepository(db);
  const doseRepo = new DoseEventRepository(db);
  return { medRepo, doseRepo, inventory: new InventoryService(db, medRepo, doseRepo) };
}

/**
 * Mark a dose taken, adjust inventory, and fire refill notification if needed.
 * Returns whether the dose is logged as taken afterwards (true if it already was).
 */
export function markDoseAsTaken(
  db: SQLiteDatabase,
  doseId: string,
  variantId?: string,
): boolean {
  const { medRepo, doseRepo, inventory } = services(db);

  const dose = doseRepo.getById(doseId);
  if (dose?.status === 'taken') return true;
  if (!dose || !canLogDoseForTodayOrPast(dose)) return false;

  const resolvedVariantId = inventory.resolveVariantId(
    dose.medicationId,
    variantId?.trim() || undefined,
  );

  try {
    let result = { previousQty: 0, newQty: 0, changed: false };
    // Stock, ledger and status change together, or a failed save would deduct twice on retry.
    db.withTransactionSync(() => {
      result = inventory.applyStatusChange(dose.id, dose.status, 'taken', resolvedVariantId);
      doseRepo.updateStatus(dose.id, 'taken', {
        takenAt: new Date().toISOString(),
        variantId: resolvedVariantId,
      });
    });

    const med = medRepo.getById(dose.medicationId);
    if (med && result.changed) {
      void notifyRefillIfNeeded(med, result.previousQty, result.newQty);
    }

    // Cancel the alarm for a dose taken ahead of its scheduled time.
    void rescheduleReminders(db);

    return true;
  } catch (error) {
    reportError('DOSE_MARK_FAILED', error);
    return false;
  }
}

/** Change a logged dose's status from Home or History; Taken goes through markDoseAsTaken. */
export function saveDoseEdit(db: SQLiteDatabase, dose: DoseEvent, status: DoseStatus): boolean {
  if (status === 'taken' && !canLogDoseForTodayOrPast(dose)) return false;
  if (status === 'taken' && dose.status !== 'taken') return markDoseAsTaken(db, dose.id);

  const { doseRepo, inventory } = services(db);
  try {
    db.withTransactionSync(() => {
      inventory.applyStatusChange(dose.id, dose.status as DoseStatus, status);
      doseRepo.updateStatus(dose.id, status);
    });
  } catch (error) {
    reportError('DOSE_MARK_FAILED', error);
    return false;
  }
  void rescheduleReminders(db);
  return true;
}

/** Delete a logged dose, returning its stock if it was taken. Returns false when the save failed. */
export function deleteDose(db: SQLiteDatabase, dose: DoseEvent): boolean {
  const { doseRepo, inventory } = services(db);
  try {
    db.withTransactionSync(() => {
      inventory.compensateOnDelete(dose.id, dose.status as DoseStatus);
      doseRepo.delete(dose.id);
    });
  } catch (error) {
    reportError('DOSE_MARK_FAILED', error);
    return false;
  }
  void rescheduleReminders(db);
  return true;
}
