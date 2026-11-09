import type { SQLiteDatabase } from 'expo-sqlite';
import type { DoseEvent } from '../../db/types';
import { MedicationRepository, DoseEventRepository } from '../medications/medicationRepository';
import type { DoseStatus } from '../../core/types/domain';
import { inventoryDeductAmount } from '../../core/types/domain';

export interface InventoryChangeResult {
  previousQty: number;
  newQty: number;
  changed: boolean;
}

function takenDeductAmount(dose: DoseEvent, medicationType?: string): number {
  return inventoryDeductAmount(dose.doseAmount, medicationType);
}

function asQuantity(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export class InventoryService {
  constructor(
    private readonly db: SQLiteDatabase,
    private readonly medications: MedicationRepository,
    private readonly doses: DoseEventRepository,
  ) {}

  private hasTakenTransaction(doseEventId: string): boolean {
    const row = this.db.getFirstSync<{ id: string }>(
      `SELECT id FROM inventory_transactions WHERE dose_event_id = ? AND type = 'dose_taken' LIMIT 1`,
      [doseEventId],
    );
    return row != null;
  }

  /** Stock the dose actually removed; it can be less than the dose when stock hit zero. */
  private recordedTakenAmount(doseEventId: string): number | null {
    const row = this.db.getFirstSync<{ quantity_delta: number }>(
      `SELECT quantity_delta FROM inventory_transactions WHERE dose_event_id = ? AND type = 'dose_taken' LIMIT 1`,
      [doseEventId],
    );
    return row ? -row.quantity_delta : null;
  }

  private clearTakenTransaction(doseEventId: string): void {
    this.db.runSync(
      `DELETE FROM inventory_transactions WHERE dose_event_id = ? AND type = 'dose_taken'`,
      [doseEventId],
    );
  }

  resolveVariantId(medicationId: string, variantId?: string): string | undefined {
    const trimmed = variantId?.trim();
    if (trimmed) {
      const match = this.medications.getVariants(medicationId).find((v) => v.id === trimmed);
      if (match) return match.id;
    }
    return this.medications.getDefaultVariant(medicationId)?.id;
  }

  decrementOnTaken(doseEventId: string, variantId?: string): InventoryChangeResult {
    const dose = this.doses.getById(doseEventId);
    if (!dose) throw new Error('Dose event not found');

    const med = this.medications.getById(dose.medicationId);
    if (!med) throw new Error('Medication not found');

    if (this.hasTakenTransaction(doseEventId)) {
      if (dose.status === 'taken') {
        return {
          previousQty: asQuantity(med.currentQuantity),
          newQty: asQuantity(med.currentQuantity),
          changed: false,
        };
      }
      this.clearTakenTransaction(doseEventId);
    }

    const amount = takenDeductAmount(dose, med.medicationType);
    const previousQty = asQuantity(med.currentQuantity);
    const newQty = Math.max(0, previousQty - amount);
    const removed = previousQty - newQty;
    const now = new Date().toISOString();
    const resolvedVariantId = this.resolveVariantId(med.id, variantId);

    this.db.runSync(
      `UPDATE medications SET current_quantity = ?, updated_at = ? WHERE id = ?`,
      [newQty, now, med.id],
    );

    if (resolvedVariantId) {
      const variant = this.medications
        .getVariants(med.id)
        .find((entry) => entry.id === resolvedVariantId);
      if (variant) {
        const variantQty = Math.max(0, asQuantity(variant.currentQuantity) - removed);
        this.db.runSync(`UPDATE medication_variants SET current_quantity = ? WHERE id = ?`, [
          variantQty,
          resolvedVariantId,
        ]);
      }
    }

    this.medications.recordInventoryTransaction({
      medicationId: med.id,
      variantId: resolvedVariantId,
      type: 'dose_taken',
      quantityDelta: -removed,
      balanceAfter: newQty,
      doseEventId,
    });

    return { previousQty, newQty, changed: previousQty !== newQty };
  }

  compensateOnDelete(doseEventId: string, previousStatus: DoseStatus): InventoryChangeResult {
    if (previousStatus !== 'taken') {
      return { previousQty: 0, newQty: 0, changed: false };
    }

    const dose = this.doses.getById(doseEventId);
    if (!dose) return { previousQty: 0, newQty: 0, changed: false };

    const med = this.medications.getById(dose.medicationId);
    if (!med) return { previousQty: 0, newQty: 0, changed: false };

    // Rows from before the ledger stored the real amount fall back to the full dose.
    const amount =
      this.recordedTakenAmount(doseEventId) ?? takenDeductAmount(dose, med.medicationType);
    const previousQty = asQuantity(med.currentQuantity);
    const newQty = previousQty + amount;
    const now = new Date().toISOString();
    const resolvedVariantId = this.resolveVariantId(med.id, dose.variantId ?? undefined);

    this.db.runSync(
      `UPDATE medications SET current_quantity = ?, updated_at = ? WHERE id = ?`,
      [newQty, now, med.id],
    );

    if (resolvedVariantId) {
      const variant = this.medications
        .getVariants(med.id)
        .find((entry) => entry.id === resolvedVariantId);
      if (variant) {
        this.db.runSync(`UPDATE medication_variants SET current_quantity = ? WHERE id = ?`, [
          asQuantity(variant.currentQuantity) + amount,
          resolvedVariantId,
        ]);
      }
    }

    this.medications.recordInventoryTransaction({
      medicationId: med.id,
      variantId: resolvedVariantId,
      type: 'dose_deleted',
      quantityDelta: amount,
      balanceAfter: newQty,
    });
    this.clearTakenTransaction(doseEventId);

    return { previousQty, newQty, changed: true };
  }

  applyStatusChange(
    doseEventId: string,
    oldStatus: DoseStatus,
    newStatus: DoseStatus,
    variantId?: string,
  ): InventoryChangeResult {
    if (oldStatus === 'taken' && newStatus !== 'taken') {
      return this.compensateOnDelete(doseEventId, 'taken');
    }
    if (newStatus === 'taken' && oldStatus !== 'taken') {
      return this.decrementOnTaken(doseEventId, variantId);
    }
    const dose = this.doses.getById(doseEventId);
    const med = dose ? this.medications.getById(dose.medicationId) : null;
    const qty = asQuantity(med?.currentQuantity);
    return { previousQty: qty, newQty: qty, changed: false };
  }

  addRefillQuantity(medicationId: string, quantity: number): number {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('Refill quantity must be a positive number');
    }

    const med = this.medications.getById(medicationId);
    if (!med) throw new Error('Medication not found');

    const amount = Math.floor(quantity);
    const newQty = asQuantity(med.currentQuantity) + amount;
    const now = new Date().toISOString();
    const resolvedVariantId = this.resolveVariantId(medicationId);

    // Medication, variant and ledger together, or the two stock counts drift apart.
    this.db.withTransactionSync(() => {
      this.db.runSync(
        `UPDATE medications SET current_quantity = ?, updated_at = ? WHERE id = ?`,
        [newQty, now, medicationId],
      );

      if (resolvedVariantId) {
        const variant = this.medications
          .getVariants(medicationId)
          .find((entry) => entry.id === resolvedVariantId);
        if (variant) {
          this.db.runSync(`UPDATE medication_variants SET current_quantity = ? WHERE id = ?`, [
            asQuantity(variant.currentQuantity) + amount,
            resolvedVariantId,
          ]);
        }
      }

      this.medications.recordInventoryTransaction({
        medicationId,
        variantId: resolvedVariantId,
        type: 'refill',
        quantityDelta: amount,
        balanceAfter: newQty,
      });
    });

    return newQty;
  }
}
