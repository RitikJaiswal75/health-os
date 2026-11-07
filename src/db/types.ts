import type { DoseStatus } from '../core/types/domain';

// Row shapes after rowMappers.ts (camelCase). The tables themselves are defined in ./migrations.

export type Medication = {
  id: string;
  name: string;
  nickname: string | null;
  notes: string | null;
  medicationType: string;
  strengthValue: number | null;
  strengthUnit: string | null;
  doseUnitValue: number | null;
  doseUnitUnit: string | null;
  pillShape: string | null;
  pillColor: string | null;
  pillColor2: string | null;
  photoUri: string | null;
  currentQuantity: number;
  refillEnabled: boolean;
  refillThreshold: number | null;
  createdAt: string;
  updatedAt: string;
};

export type MedicationVariant = {
  id: string;
  medicationId: string;
  label: string;
  strengthValue: number | null;
  strengthUnit: string | null;
  currentQuantity: number;
  isDefault: boolean;
  createdAt: string;
};

export type Schedule = {
  id: string;
  medicationId: string;
  type: string;
  /** JSON array of TimeOfDay. */
  timesOfDay: string;
  intervalDays: number | null;
  weekdayMask: number | null;
  dayOfMonth: number | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
};

export type DoseEvent = {
  id: string;
  medicationId: string;
  variantId: string | null;
  scheduleId: string | null;
  /** Local wall-clock time (`yyyy-MM-ddTHH:mm:ss`); legacy rows may be UTC ISO. */
  scheduledAt: string;
  status: DoseStatus;
  takenAt: string | null;
  doseAmount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};
