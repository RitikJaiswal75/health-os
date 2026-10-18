import { t, tCount, type MessageKey } from '@/src/i18n/translate';
import { en } from '@/src/i18n/en';

export type ScheduleType =
  | 'fixed_daily'
  | 'interval_days'
  | 'weekdays'
  | 'monthly'
  | 'as_needed';

export const MEDICATION_TYPES = [
  { value: 'capsule', label: 'Capsule' },
  { value: 'softgel_capsule', label: 'Softgel capsule' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'liquid', label: 'Liquid' },
  { value: 'injectable', label: 'Injectable' },
  { value: 'topical', label: 'Topical' },
  { value: 'cream', label: 'Cream' },
  { value: 'device', label: 'Device' },
  { value: 'drops', label: 'Drops' },
  { value: 'gel', label: 'Gel' },
  { value: 'gummy', label: 'Gummy' },
  { value: 'powder', label: 'Powder' },
  { value: 'inhaler', label: 'Inhaler' },
  { value: 'spray', label: 'Spray' },
] as const;

export type MedicationType = (typeof MEDICATION_TYPES)[number]['value'];

export function getMedicationTypeLabel(type?: MedicationType | string): string {
  if (!type) return '';
  const key = `type.${type}` as MessageKey;
  if (key in en) return t(key);
  return MEDICATION_TYPES.find((item) => item.value === type)?.label ?? type;
}

export type DoseStatus = 'pending' | 'taken' | 'skipped' | 'missed' | 'snoozed';

/** Display labels for dose status values (DB stores lowercase `taken`, `pending`, etc.). */
export const DOSE_STATUS_LABEL: Record<DoseStatus, string> = {
  pending: 'Pending',
  taken: 'Taken',
  skipped: 'Skipped',
  missed: 'Missed',
  snoozed: 'Snoozed',
};

export const DOSE_STATUS_OPTIONS = (
  Object.entries(DOSE_STATUS_LABEL) as [DoseStatus, string][]
).map(([value, label]) => ({ value, label }));

export function getDoseStatusLabel(status: DoseStatus): string {
  return t(`status.${status}`);
}

export type InventoryTransactionType =
  | 'initial'
  | 'dose_taken'
  | 'dose_deleted'
  | 'adjustment'
  | 'refill';

export interface TimeOfDay {
  hour: number;
  minute: number;
  doseAmount?: number;
}

export const STRENGTH_UNITS = [
  'mg',
  'mcg',
  'g',
  'ml',
  'IU',
  'serving',
  '%',
  'units',
] as const;

export type StrengthUnit = (typeof STRENGTH_UNITS)[number];

/** Shape picker groups shown on the choose-shape screen. */
export const PILL_SHAPE_CATEGORIES = [
  {
    title: 'Pill shapes',
    shapes: [
      'capsule_divided',
      'oval_capsule',
      'oblong_tablet',
      'round',
      'round_scored',
      'flat_oval',
      'wide_oval',
      'rounded_rectangle',
    ],
  },
  {
    title: 'Other options',
    shapes: [
      'powder',
      'spilled_powder',
      'vapour',
      'ointment',
      'dropper',
      'injection',
      'pump',
      'spray',
      'water_soluble_tablet',
      'pill_in_glass',
      'patch',
      'iu',
    ],
  },
] as const;

export const SELECTABLE_PILL_SHAPES = PILL_SHAPE_CATEGORIES.flatMap((category) => category.shapes);

/** Non-pill form icons — also available in the shape picker. */
export const FORM_SHAPES = [
  'powder',
  'spilled_powder',
  'vapour',
  'ointment',
  'dropper',
  'injection',
  'pump',
  'water_soluble_tablet',
  'pill_in_glass',
  'effervescent_tablet',
  'patch',
  'iu',
  'inhaler',
  'spray',
] as const;

export const PILL_SHAPES = [
  ...SELECTABLE_PILL_SHAPES,
  ...FORM_SHAPES,
] as const;

type SelectablePillShape = (typeof PILL_SHAPE_CATEGORIES)[number]['shapes'][number];

export type PillShape = SelectablePillShape | FormShape;

export type FormShape = (typeof FORM_SHAPES)[number];

/** Only the divided capsule supports two-tone colouring. */
export const DUAL_COLOR_SHAPES = ['capsule_divided'] as const;

export function supportsDualColor(shape?: PillShape | string): boolean {
  if (!shape) return false;
  return (DUAL_COLOR_SHAPES as readonly string[]).includes(shape);
}

/** Default pill/form icon when the user picks a medication type. */
export function defaultShapeForMedicationType(type?: MedicationType | string): PillShape {
  switch (type) {
    case 'powder':
      return 'powder';
    case 'inhaler':
      return 'pump';
    case 'spray':
      return 'spray';
    case 'injectable':
      return 'injection';
    case 'drops':
    case 'liquid':
      return 'dropper';
    case 'cream':
    case 'topical':
    case 'gel':
      return 'ointment';
    case 'device':
      return 'pump';
    default:
      return 'capsule_divided';
  }
}

/** Suggested strength unit for a medication type (optional field on configure). */
export function defaultStrengthUnitForMedicationType(
  type?: MedicationType | string,
): StrengthUnit | undefined {
  switch (type) {
    case 'powder':
      return 'g';
    case 'liquid':
    case 'drops':
    case 'injectable':
      return 'ml';
    default:
      return undefined;
  }
}

export const PILL_COLORS = [
  '#FFFFFF',
  '#FF5252',
  '#FF9800',
  '#FFEB3B',
  '#4CAF50',
  '#2196F3',
  '#9C27B0',
  '#795548',
  '#607D8B',
  '#E91E63',
] as const;

export const FREQUENCY_OPTIONS = [
  { label: 'Every day', type: 'fixed_daily' as ScheduleType },
  { label: 'Every X days', type: 'interval_days' as ScheduleType },
  { label: 'Specific days of the week', type: 'weekdays' as ScheduleType },
  { label: 'Every month', type: 'monthly' as ScheduleType },
  { label: 'As needed', type: 'as_needed' as ScheduleType },
];

export const TIMES_PER_DAY_OPTIONS = [
  { label: 'Once', count: 1 },
  { label: 'Twice', count: 2 },
  { label: '3 times', count: 3 },
  { label: '4 times', count: 4 },
  { label: '5 times', count: 5 },
  { label: 'Custom', count: -1 },
];

export const SNOOZE_OPTIONS = [
  { label: '30 minutes', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: 'Custom', minutes: -1 },
] as const;

export interface DoseLabelOptions {
  strengthValue?: number;
  strengthUnit?: StrengthUnit | string;
  /** Grams per scoop / consumption size — default dose amount for powder, not multiplied. */
  doseUnitValue?: number;
  doseUnitUnit?: StrengthUnit | string;
}

/** Powder and syrup doses are entered as grams/ml, not unit counts. */
export function usesDirectMeasuredDose(medicationType?: MedicationType | string): boolean {
  return medicationType === 'powder' || medicationType === 'liquid';
}

/** Inventory counts servings for powder/syrup; other forms use dose count. */
export function inventoryDeductAmount(
  doseAmount: number | undefined | null,
  medicationType?: MedicationType | string,
): number {
  if (usesDirectMeasuredDose(medicationType)) {
    return 1;
  }
  const parsed = typeof doseAmount === 'number' && Number.isFinite(doseAmount) ? doseAmount : 1;
  return Math.max(1, Math.ceil(parsed));
}

/** Review / inventory prompt for how many units are left in stock. */
export function getInventoryQuantityPrompt(medicationType?: MedicationType | string): string {
  switch (medicationType) {
    case 'powder':
      return t('inventory.scoops');
    case 'liquid':
      return t('inventory.doses');
    case 'inhaler':
      return t('inventory.uses');
    case 'spray':
      return t('inventory.sprays');
    case 'drops':
      return t('inventory.doses');
    case 'injectable':
      return t('inventory.injections');
    case 'gummy':
      return t('inventory.gummies');
    case 'tablet':
      return t('inventory.tablets');
    case 'capsule':
    case 'softgel_capsule':
      return t('inventory.capsules');
    default:
      return t('inventory.doses');
  }
}

export function getDefaultDoseAmount(
  medicationType?: MedicationType | string,
  options?: DoseLabelOptions,
): number {
  if (medicationType === 'powder') {
    return options?.doseUnitValue ?? 1;
  }
  if (medicationType === 'liquid') {
    return options?.strengthValue ?? 1;
  }
  return 1;
}

export function formatStrengthSubtitle(
  medicationType?: MedicationType | string,
  strengthValue?: number,
  strengthUnit?: StrengthUnit | string,
  doseUnitValue?: number,
  doseUnitUnit?: string,
): string {
  const typeLabel = getMedicationTypeLabel(medicationType);
  const parts: string[] = [];
  if (typeLabel) parts.push(typeLabel);

  if (medicationType === 'powder' && doseUnitValue != null && doseUnitUnit) {
    parts.push(t('review.perScoop', { value: `${doseUnitValue} ${doseUnitUnit}` }));
  }

  if (strengthValue != null && strengthUnit) {
    const strengthPart =
      medicationType === 'powder'
        ? t('review.strengthSuffix', { value: `${strengthValue} ${strengthUnit}` })
        : `${strengthValue} ${strengthUnit}`;
    parts.push(strengthPart);
  }

  if (parts.length > 0) return parts.join(', ');
  return t('review.infoFallback');
}

export function formatDoseLabel(
  amount: number,
  medicationType?: MedicationType | string,
  options?: DoseLabelOptions,
): string {
  const count = amount > 0 ? amount : 1;
  const strengthValue = options?.strengthValue;
  const strengthUnit = options?.strengthUnit;
  const doseUnitUnit = options?.doseUnitUnit;

  switch (medicationType) {
    case 'tablet':
      return tCount('dose.tablet.one', 'dose.tablet.other', count);
    case 'capsule':
    case 'softgel_capsule':
      return tCount('dose.capsule.one', 'dose.capsule.other', count);
    case 'gummy':
      return tCount('dose.gummy.one', 'dose.gummy.other', count);
    case 'inhaler':
      return tCount('dose.pump.one', 'dose.pump.other', count);
    case 'spray':
      return tCount('dose.spray.one', 'dose.spray.other', count);
    case 'powder': {
      const unit = doseUnitUnit ?? strengthUnit ?? 'g';
      return t('dose.measured', { count: formatDoseQuantity(count), unit });
    }
    case 'liquid': {
      const unit = strengthUnit ?? 'ml';
      return t('dose.measured', { count: formatDoseQuantity(count), unit });
    }
    case 'injectable':
      return tCount('dose.injection.one', 'dose.injection.other', count);
    case 'drops':
      if (strengthValue != null && strengthUnit) {
        return formatMeasuredDose(count, strengthValue, strengthUnit, 'ml', 'drop');
      }
      return tCount('dose.drop.one', 'dose.drop.other', count);
    case 'topical':
    case 'cream':
    case 'gel':
      if (strengthValue != null && strengthUnit && strengthUnit !== '%') {
        return formatMeasuredDose(count, strengthValue, strengthUnit, strengthUnit, 'application');
      }
      return tCount('dose.application.one', 'dose.application.other', count);
    case 'device':
      return tCount('dose.use.one', 'dose.use.other', count);
    default:
      return tCount('dose.dose.one', 'dose.dose.other', count);
  }
}

/** Reminder / alarm copy: "Take …" */
export function formatTakeDoseInstruction(
  doseAmount: number,
  medicationType?: MedicationType | string,
  strengthValue?: number,
  strengthUnit?: StrengthUnit | string,
  doseUnitValue?: number,
  doseUnitUnit?: StrengthUnit | string,
): string {
  return t('dose.take', {
    label: formatDoseLabel(doseAmount, medicationType, {
      strengthValue,
      strengthUnit,
      doseUnitValue,
      doseUnitUnit,
    }),
  });
}

function formatMeasuredDose(
  count: number,
  strengthValue: number | undefined,
  strengthUnit: string | undefined,
  defaultUnit: string,
  countFallback: string,
): string {
  if (strengthValue != null && strengthValue > 0) {
    const total = strengthValue * count;
    const unit = strengthUnit ?? defaultUnit;
    return `${formatDoseQuantity(total)} ${unit}`;
  }

  const unit = count === 1 ? countFallback : `${countFallback}s`;
  return t('dose.measured', { count, unit });
}

function formatDoseQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : String(parseFloat(value.toFixed(2)));
}

const PRESET_HOURS: [number, number][][] = [
  [[8, 0]],
  [[8, 0], [20, 0]],
  [[11, 0], [16, 0], [23, 0]],
  [[8, 0], [12, 0], [16, 0], [20, 0]],
  [[7, 0], [11, 0], [15, 0], [19, 0], [23, 0]],
];

export function getPresetTimesOfDay(count: number, doseAmount = 1): TimeOfDay[] {
  if (count <= 0) return [];
  const preset = PRESET_HOURS[count - 1];
  if (preset) {
    return preset.map(([hour, minute]) => ({ hour, minute, doseAmount }));
  }
  return Array.from({ length: count }, (_, i) => ({
    hour: Math.min(7 + i * 4, 23),
    minute: 0,
    doseAmount,
  }));
}
