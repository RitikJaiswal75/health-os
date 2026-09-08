import type { Medication, Schedule } from '../../db/schema';
import type {
  MedicationType,
  PillShape,
  ScheduleType,
  StrengthUnit,
} from '../../core/types/domain';
import { parseTimesOfDay } from '../reminders/occurrenceExpander';
import type { WizardDraft } from './wizardStore';

export function medicationToDraft(med: Medication, schedule: Schedule): WizardDraft {
  const timesOfDay = parseTimesOfDay(schedule.timesOfDay);

  return {
    name: med.name,
    medicationType: med.medicationType as MedicationType,
    strengthValue: med.strengthValue ?? undefined,
    strengthUnit: (med.strengthUnit as StrengthUnit) ?? undefined,
    doseUnitValue: med.doseUnitValue ?? undefined,
    doseUnitUnit: (med.doseUnitUnit as StrengthUnit) ?? undefined,
    pillShape: (med.pillShape as PillShape) ?? undefined,
    pillColor: med.pillColor ?? undefined,
    pillColor2: med.pillColor2 ?? undefined,
    photoUri: med.photoUri ?? undefined,
    frequency: schedule.type as ScheduleType,
    intervalDays: schedule.intervalDays ?? undefined,
    weekdayMask: schedule.weekdayMask ?? undefined,
    dayOfMonth: schedule.dayOfMonth ?? undefined,
    timesPerDay: timesOfDay.length,
    timesOfDay,
    timesCountSet: schedule.type === 'as_needed' || timesOfDay.length > 0,
    startDate: schedule.startDate,
    endDate: schedule.endDate ?? undefined,
    currentQuantity: med.currentQuantity,
    refillEnabled: med.refillEnabled,
    refillThreshold: med.refillThreshold ?? undefined,
    nickname: med.nickname ?? undefined,
    notes: med.notes ?? undefined,
  };
}
