import type { SQLiteDatabase } from 'expo-sqlite';
import type { DoseEvent } from '../../db/schema';
import { MedicationRepository, DoseEventRepository } from '../medications/medicationRepository';
import type { DoseStatus } from '../../core/types/domain';

export interface InventoryChangeResult {
  previousQty: number;
  newQty: number;
  changed: boolean;
}

function takenDeductAmount(dose: DoseEvent): number {
  const raw = dose.doseAmount;
  const parsed = typeof raw === 'number' && Number.isFinite(raw) ? raw : 1;
  return Math.max(1, Math.ceil(parsed));
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

  private recordTransactionSafe(input: {
    medicationId: string;
    variantId?: string;
    type: 'dose_taken' | 'dose_deleted' | 'refill' | 'adjustment' | 'initial';
    quantityDelta: number;
    balanceAfter: number;
    doseEventId?: string;
  }): void {
    try {
      this.medications.recordInventoryTransaction({
        medicationId: input.medicationId,
        variantId: input.variantId,
        type: input.type,
        quantityDelta: input.quantityDelta,
        balanceAfter: input.balanceAfter,
        doseEventId: input.doseEventId,
      });
    } catch (error) {
      console.warn('[InventoryService] ledger insert failed', error);
    }
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

    const amount = takenDeductAmount(dose);
    const previousQty = asQuantity(med.currentQuantity);
    const newQty = Math.max(0, previousQty - amount);
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
        const variantQty = Math.max(0, asQuantity(variant.currentQuantity) - amount);
        this.db.runSync(`UPDATE medication_variants SET current_quantity = ? WHERE id = ?`, [
          variantQty,
          resolvedVariantId,
        ]);
      }
    }

    this.recordTransactionSafe({
      medicationId: med.id,
      variantId: resolvedVariantId,
      type: 'dose_taken',
      quantityDelta: -amount,
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

    const amount = takenDeductAmount(dose);
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

    this.recordTransactionSafe({
      medicationId: med.id,
      variantId: resolvedVariantId,
      type: 'dose_deleted',
      quantityDelta: amount,
      balanceAfter: newQty,
    });

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

    this.recordTransactionSafe({
      medicationId,
      variantId: resolvedVariantId,
      type: 'refill',
      quantityDelta: amount,
      balanceAfter: newQty,
    });

    return newQty;
  }
}
