// Real SQLite: schedules whose next dose is more than a week away must still get a dose row and an alarm.
import { createTestDb } from './helpers/sqliteDb';
import {
  MedicationRepository,
  type CreateMedicationInput,
} from '../src/features/medications/medicationRepository';
import { generateUpcomingDoseEvents } from '../src/features/medications/doseGenerationService';
import { ReminderReconciler } from '../src/features/reminders/reminderService';

jest.mock('expo-notifications', () => ({}));
jest.mock('../src/features/reminders/notificationSetup', () => ({}));
jest.mock('@/src/i18n/translate', () => ({ t: (key: string) => key }));
jest.mock('@/src/core/observability/crashReporter', () => ({ reportError: jest.fn() }));

function medication(schedule: Partial<CreateMedicationInput['schedule']>): CreateMedicationInput {
  return {
    name: 'Vitamin D',
    medicationType: 'tablet',
    currentQuantity: 10,
    schedule: {
      type: 'fixed_daily',
      timesOfDay: [{ hour: 9, minute: 0, doseAmount: 1 }],
      startDate: '2026-09-01',
      ...schedule,
    },
  };
}

describe('alarms for schedules with long gaps', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-02T10:00:00'));
  });
  afterEach(() => jest.useRealTimers());

  it('a monthly dose 20+ days away gets a dose row and an alarm', () => {
    const db = createTestDb();
    new MedicationRepository(db).create(medication({ type: 'monthly', dayOfMonth: 25 }));
    generateUpcomingDoseEvents(db, 14);

    const alarms = new ReminderReconciler(db).reconcile(7);
    expect(alarms.map((alarm) => alarm.scheduledAt)).toEqual(['2026-09-25T09:00:00']);
  });

  it('a 10-day interval dose beyond a week gets an alarm', () => {
    const db = createTestDb();
    new MedicationRepository(db).create(medication({ type: 'interval_days', intervalDays: 10 }));
    generateUpcomingDoseEvents(db, 14);

    const alarms = new ReminderReconciler(db).reconcile(7);
    expect(alarms.map((alarm) => alarm.scheduledAt)).toEqual(['2026-09-11T09:00:00']);
  });

  it('a daily schedule still gets only the next 7 days', () => {
    const db = createTestDb();
    new MedicationRepository(db).create(medication({}));
    generateUpcomingDoseEvents(db, 14);

    const alarms = new ReminderReconciler(db).reconcile(7);
    expect(alarms).toHaveLength(7);
  });
});
