import type { SQLiteDatabase } from 'expo-sqlite';
import { MedicationRepository, DoseEventRepository } from '../medications/medicationRepository';
import type { DoseStatus } from '../../core/types/domain';
import { InventoryService } from './inventoryService';
import { notifyRefillIfNeeded } from './refillReminderService';

/** Mark a dose taken, adjust inventory, and fire refill notification if needed. */
export function markDoseAsTaken(
  db: SQLiteDatabase,
  doseId: string,
  variantId?: string,
): boolean {
  const medRepo = new MedicationRepository(db);
  const doseRepo = new DoseEventRepository(db);
  const inventory = new InventoryService(db, medRepo, doseRepo);

  const dose = doseRepo.getById(doseId);
  if (!dose || dose.status === 'taken') return false;

  const resolvedVariantId = inventory.resolveVariantId(
    dose.medicationId,
    variantId?.trim() || undefined,
  );

  try {
    const { previousQty, newQty, changed } = inventory.applyStatusChange(
      dose.id,
      dose.status as DoseStatus,
      'taken',
      resolvedVariantId,
    );

    doseRepo.updateStatus(dose.id, 'taken', {
      takenAt: new Date().toISOString(),
      variantId: resolvedVariantId,
    });

    const med = medRepo.getById(dose.medicationId);
    if (med && changed) {
      void notifyRefillIfNeeded(med, previousQty, newQty);
    }

    return true;
  } catch (error) {
    console.error('[markDoseAsTaken] failed', error);
    return false;
  }
}
