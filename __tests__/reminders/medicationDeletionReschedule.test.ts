import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('expo-notifications', () => ({
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('id')),
  AndroidNotificationPriority: { MAX: 'max' },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));
jest.mock('../../src/features/reminders/notificationSetup', () => ({
  ensureNotificationSetup: jest.fn(() => Promise.resolve(true)),
  MEDICATION_REMINDER_CHANNEL: 'medication-reminders',
}));
jest.mock('../../src/features/medications/medicationRepository', () => ({
  MedicationRepository: jest.fn(() => ({ getById: () => ({ id: 'med-1' }), delete: jest.fn() })),
  DoseEventRepository: jest.fn(() => ({ findPendingDosesAtMinute: () => [] })),
}));
jest.mock('../../src/features/medications/doseGenerationService', () => ({
  purgeOrphanDoseEvents: jest.fn(),
}));
jest.mock('../../src/features/reminders/reminderNativePending', () => ({
  getNativePendingReminders: jest.fn(() => Promise.resolve([])),
}));
jest.mock('@/src/i18n/translate', () => ({ t: (key: string) => key }));
jest.mock('@/src/core/observability/crashReporter', () => ({ reportError: jest.fn() }));

// eslint-disable-next-line import/first
import { ReminderReconciler, rescheduleReminders } from '../../src/features/reminders/reminderService';
// eslint-disable-next-line import/first
import { removeMedicationWithReminders } from '../../src/features/medications/medicationDeletionService';

const cancelAll = Notifications.cancelAllScheduledNotificationsAsync as jest.Mock;
const scheduleNotification = Notifications.scheduleNotificationAsync as jest.Mock;
const db = {} as SQLiteDatabase;

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('removeMedicationWithReminders', () => {
  it('waits for an in-flight reminder reschedule instead of overlapping it', async () => {
    const at = new Date(Date.now() + 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    jest.spyOn(ReminderReconciler.prototype, 'reconcile').mockReturnValue([
      {
        id: 'a',
        medicationId: 'med-2',
        medicationName: 'Med 2',
        scheduledAt: `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}:00`,
        doseAmount: 1,
        doseEventId: 'dose-a',
      },
    ]);

    // First reschedule (e.g. Home focus) is still scheduling when the delete starts.
    let releaseSchedule!: () => void;
    scheduleNotification.mockImplementationOnce(
      () => new Promise<string>((resolve) => (releaseSchedule = () => resolve('id'))),
    );
    const inFlight = rescheduleReminders(db);
    await flush();
    expect(cancelAll).toHaveBeenCalledTimes(1);

    const deletion = removeMedicationWithReminders(db, 'med-1');
    await flush();
    // The delete must not cancel/reschedule while the first run is mid-flight.
    expect(cancelAll).toHaveBeenCalledTimes(1);

    releaseSchedule();
    await Promise.all([inFlight, deletion]);
    expect(cancelAll).toHaveBeenCalledTimes(2);
  });
});
