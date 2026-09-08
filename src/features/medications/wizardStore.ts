import { create } from 'zustand';
import { formatDateKey } from '../../core/dates/dateUtils';
import {
  supportsDualColor,
  getPresetTimesOfDay,
  defaultShapeForMedicationType,
  defaultStrengthUnitForMedicationType,
  getDefaultDoseAmount,
  type ScheduleType,
  type TimeOfDay,
  type MedicationType,
  type PillShape,
  type StrengthUnit,
} from '../../core/types/domain';

export interface WizardDraft {
  name: string;
  catalogId?: string;
  medicationType?: MedicationType;
  strengthValue?: number;
  strengthUnit?: StrengthUnit;
  doseUnitValue?: number;
  doseUnitUnit?: StrengthUnit;
  pillShape?: PillShape;
  pillColor?: string;
  pillColor2?: string;
  photoUri?: string;
  frequency?: ScheduleType;
  intervalDays?: number;
  weekdayMask?: number;
  dayOfMonth?: number;
  timesPerDay: number;
  timesOfDay: TimeOfDay[];
  timesCountSet: boolean;
  startDate: string;
  endDate?: string;
  currentQuantity: number;
  refillEnabled: boolean;
  refillThreshold?: number;
  nickname?: string;
  notes?: string;
}

const initialDraft = (): WizardDraft => ({
  name: '',
  timesPerDay: 0,
  timesOfDay: [],
  timesCountSet: false,
  startDate: formatDateKey(new Date()),
  currentQuantity: 0,
  refillEnabled: false,
});

interface WizardStore {
  draft: WizardDraft;
  editingMedicationId?: string;
  editSessionKey: number;
  setName: (name: string) => void;
  setCatalogId: (id: string) => void;
  setMedicationType: (type: MedicationType) => void;
  setStrength: (value?: number, unit?: StrengthUnit) => void;
  setDoseUnit: (value?: number, unit?: StrengthUnit) => void;
  setAppearance: (pillShape?: PillShape, pillColor?: string, photoUri?: string, pillColor2?: string) => void;
  setFrequency: (type: ScheduleType, extras?: Partial<WizardDraft>) => void;
  setTimesPerDay: (count: number) => void;
  setTimesConfig: (count: number, timesOfDay: TimeOfDay[]) => void;
  setTimeAtIndex: (index: number, time: TimeOfDay) => void;
  setScheduleDates: (start: string, end?: string) => void;
  setInventory: (quantity: number, refillEnabled: boolean, refillThreshold?: number) => void;
  setNicknameNotes: (nickname?: string, notes?: string) => void;
  loadDraftForEdit: (draft: WizardDraft, medicationId: string) => void;
  reset: () => void;
  canProceedConfigure: () => boolean;
  canProceedSchedule: () => boolean;
}

export function getWizardReviewPath(editingMedicationId?: string | null): string {
  return editingMedicationId ? `/medicine/${editingMedicationId}` : '/medicine/review';
}

export const useWizardStore = create<WizardStore>((set, get) => ({
  draft: initialDraft(),
  editingMedicationId: undefined,
  editSessionKey: 0,

  setName: (name) => set((s) => ({ draft: { ...s.draft, name } })),
  setCatalogId: (catalogId) => set((s) => ({ draft: { ...s.draft, catalogId } })),
  setMedicationType: (medicationType) =>
    set((s) => {
      const pillShape = defaultShapeForMedicationType(medicationType);
      const suggestedUnit = defaultStrengthUnitForMedicationType(medicationType);
      return {
        draft: {
          ...s.draft,
          medicationType,
          pillShape,
          pillColor2: supportsDualColor(pillShape) ? s.draft.pillColor2 : undefined,
          strengthUnit: s.draft.strengthUnit ?? suggestedUnit,
        },
      };
    }),
  setStrength: (strengthValue, strengthUnit) =>
    set((s) => ({ draft: { ...s.draft, strengthValue, strengthUnit } })),
  setDoseUnit: (doseUnitValue, doseUnitUnit) =>
    set((s) => ({ draft: { ...s.draft, doseUnitValue, doseUnitUnit } })),
  setAppearance: (pillShape, pillColor, photoUri, pillColor2) =>
    set((s) => {
      const nextShape = pillShape ?? s.draft.pillShape;
      const dual = supportsDualColor(nextShape);
      return {
        draft: {
          ...s.draft,
          pillShape,
          pillColor,
          photoUri,
          pillColor2: dual ? (pillColor2 !== undefined ? pillColor2 : s.draft.pillColor2) : undefined,
        },
      };
    }),
  setFrequency: (frequency, extras) =>
    set((s) => ({ draft: { ...s.draft, frequency, ...extras } })),
  setTimesPerDay: (count) =>
    set((s) => {
      const doseAmount = getDefaultDoseAmount(s.draft.medicationType, {
        strengthValue: s.draft.strengthValue,
        strengthUnit: s.draft.strengthUnit,
        doseUnitValue: s.draft.doseUnitValue,
        doseUnitUnit: s.draft.doseUnitUnit,
      });
      return {
        draft: {
          ...s.draft,
          timesPerDay: count,
          timesOfDay: getPresetTimesOfDay(count, doseAmount),
          timesCountSet: true,
        },
      };
    }),
  setTimesConfig: (count, timesOfDay) =>
    set((s) => ({
      draft: { ...s.draft, timesPerDay: count, timesOfDay, timesCountSet: true },
    })),
  setTimeAtIndex: (index, time) =>
    set((s) => {
      const timesOfDay = [...s.draft.timesOfDay];
      timesOfDay[index] = time;
      return { draft: { ...s.draft, timesOfDay } };
    }),
  setScheduleDates: (startDate, endDate) =>
    set((s) => ({
      draft: {
        ...s.draft,
        startDate,
        endDate: endDate?.trim() ? endDate.trim() : undefined,
      },
    })),
  setInventory: (currentQuantity, refillEnabled, refillThreshold) =>
    set((s) => ({
      draft: {
        ...s.draft,
        currentQuantity,
        refillEnabled,
        refillThreshold: refillEnabled ? refillThreshold : undefined,
      },
    })),
  setNicknameNotes: (nickname, notes) =>
    set((s) => ({ draft: { ...s.draft, nickname, notes } })),
  loadDraftForEdit: (draft, medicationId) =>
    set((s) => ({
      draft,
      editingMedicationId: medicationId,
      editSessionKey: s.editSessionKey + 1,
    })),
  reset: () =>
    set({
      draft: initialDraft(),
      editingMedicationId: undefined,
    }),
  canProceedConfigure: () => !!get().draft.medicationType,
  canProceedSchedule: () => {
    const { frequency, timesOfDay, intervalDays, weekdayMask, dayOfMonth, timesCountSet } = get().draft;
    if (!frequency) return false;
    if (frequency === 'as_needed') return true;
    if (!timesCountSet) return false;
    if (frequency === 'interval_days' && (!intervalDays || intervalDays < 1)) return false;
    if (frequency === 'weekdays' && !weekdayMask) return false;
    if (frequency === 'monthly' && (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31)) return false;
    return timesOfDay.length > 0;
  },
}));
