import type { DoseEvent, Medication, MedicationVariant, Schedule } from './schema';

type Row = Record<string, unknown>;

function pick<T>(row: Row, camel: string, snake: string): T | undefined {
  if (row[camel] !== undefined) return row[camel] as T;
  if (row[snake] !== undefined) return row[snake] as T;
  return undefined;
}

function pickRequired<T>(row: Row, camel: string, snake: string): T {
  const value = pick<T>(row, camel, snake);
  if (value === undefined) {
    throw new Error(`Missing required column ${camel}/${snake}`);
  }
  return value;
}

function toBool(value: unknown): boolean {
  return value === true || value === 1;
}

function asRow(row: unknown): Row {
  return row as Row;
}

export function mapMedicationRow(row: unknown): Medication {
  const record = asRow(row);
  return {
    id: pickRequired<string>(record, 'id', 'id'),
    name: pickRequired<string>(record, 'name', 'name'),
    nickname: pick<string | null>(record, 'nickname', 'nickname') ?? null,
    notes: pick<string | null>(record, 'notes', 'notes') ?? null,
    medicationType: pickRequired<string>(record, 'medicationType', 'medication_type'),
    strengthValue: pick<number | null>(record, 'strengthValue', 'strength_value') ?? null,
    strengthUnit: pick<string | null>(record, 'strengthUnit', 'strength_unit') ?? null,
    doseUnitValue: pick<number | null>(record, 'doseUnitValue', 'dose_unit_value') ?? null,
    doseUnitUnit: pick<string | null>(record, 'doseUnitUnit', 'dose_unit_unit') ?? null,
    pillShape: pick<string | null>(record, 'pillShape', 'pill_shape') ?? null,
    pillColor: pick<string | null>(record, 'pillColor', 'pill_color') ?? null,
    pillColor2: pick<string | null>(record, 'pillColor2', 'pill_color2') ?? null,
    photoUri: pick<string | null>(record, 'photoUri', 'photo_uri') ?? null,
    currentQuantity: pick<number>(record, 'currentQuantity', 'current_quantity') ?? 0,
    refillEnabled: toBool(pick(record, 'refillEnabled', 'refill_enabled')),
    refillThreshold: pick<number | null>(record, 'refillThreshold', 'refill_threshold') ?? null,
    createdAt: pickRequired<string>(record, 'createdAt', 'created_at'),
    updatedAt: pickRequired<string>(record, 'updatedAt', 'updated_at'),
  };
}

export function mapVariantRow(row: unknown): MedicationVariant {
  const record = asRow(row);
  return {
    id: pickRequired<string>(record, 'id', 'id'),
    medicationId: pickRequired<string>(record, 'medicationId', 'medication_id'),
    label: pickRequired<string>(record, 'label', 'label'),
    strengthValue: pick<number | null>(record, 'strengthValue', 'strength_value') ?? null,
    strengthUnit: pick<string | null>(record, 'strengthUnit', 'strength_unit') ?? null,
    currentQuantity: pick<number>(record, 'currentQuantity', 'current_quantity') ?? 0,
    isDefault: toBool(pick(record, 'isDefault', 'is_default')),
    createdAt: pickRequired<string>(record, 'createdAt', 'created_at'),
  };
}

export function mapScheduleRow(row: unknown): Schedule {
  const record = asRow(row);
  return {
    id: pickRequired<string>(record, 'id', 'id'),
    medicationId: pickRequired<string>(record, 'medicationId', 'medication_id'),
    type: pickRequired<string>(record, 'type', 'type'),
    timesOfDay: pickRequired<string>(record, 'timesOfDay', 'times_of_day'),
    intervalDays: pick<number | null>(record, 'intervalDays', 'interval_days') ?? null,
    weekdayMask: pick<number | null>(record, 'weekdayMask', 'weekday_mask') ?? null,
    dayOfMonth: pick<number | null>(record, 'dayOfMonth', 'day_of_month') ?? null,
    startDate: pickRequired<string>(record, 'startDate', 'start_date'),
    endDate: pick<string | null>(record, 'endDate', 'end_date') ?? null,
    isActive: toBool(pick(record, 'isActive', 'is_active')),
    createdAt: pickRequired<string>(record, 'createdAt', 'created_at'),
  };
}

export function mapDoseEventRow(row: unknown): DoseEvent {
  const record = asRow(row);
  return {
    id: pickRequired<string>(record, 'id', 'id'),
    medicationId: pickRequired<string>(record, 'medicationId', 'medication_id'),
    variantId: pick<string | null>(record, 'variantId', 'variant_id') ?? null,
    scheduleId: pick<string | null>(record, 'scheduleId', 'schedule_id') ?? null,
    scheduledAt: pickRequired<string>(record, 'scheduledAt', 'scheduled_at'),
    status: pickRequired<string>(record, 'status', 'status'),
    takenAt: pick<string | null>(record, 'takenAt', 'taken_at') ?? null,
    doseAmount: pick<number>(record, 'doseAmount', 'dose_amount') ?? 1,
    notes: pick<string | null>(record, 'notes', 'notes') ?? null,
    createdAt: pickRequired<string>(record, 'createdAt', 'created_at'),
    updatedAt: pickRequired<string>(record, 'updatedAt', 'updated_at'),
  };
}
