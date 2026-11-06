import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';

let mockPlatformOs: 'ios' | 'android' = 'ios';
const mockReconcile = jest.fn();

jest.mock('react-native', () => ({
  Platform: {
    get OS() {
      return mockPlatformOs;
    },
  },
}));
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
  MedicationRepository: jest.fn(),
  DoseEventRepository: jest.fn(),
}));
jest.mock('@/src/i18n/translate', () => ({ t: (key: string) => key }));
jest.mock('@/src/core/observability/crashReporter', () => ({ reportError: jest.fn() }));

// eslint-disable-next-line import/first
import {
  ReminderReconciler,
  rescheduleReminders,
  scheduleAlarms,
  type AlarmScheduleInput,
} from '../../src/features/reminders/reminderService';

const cancelAll = Notifications.cancelAllScheduledNotificationsAsync as jest.Mock;
const scheduleNotification = Notifications.scheduleNotificationAsync as jest.Mock;
const db = {} as SQLiteDatabase;

function futureAlarm(id: string): AlarmScheduleInput {
  const at = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    id,
    medicationId: `med-${id}`,
    medicationName: `Med ${id}`,
    scheduledAt: `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}:00`,
    doseAmount: 1,
    doseEventId: `dose-${id}`,
  };
}

describe('reminder rescheduling', () => {
  beforeEach(() => {
    mockPlatformOs = 'ios';
    cancelAll.mockClear();
    scheduleNotification.mockClear();
    mockReconcile.mockReset();
    jest.spyOn(ReminderReconciler.prototype, 'reconcile').mockImplementation(mockReconcile);
  });

  it('cancels pending iOS notifications when no doses remain', async () => {
    await scheduleAlarms([]);
    expect(cancelAll).toHaveBeenCalledTimes(1);
    expect(scheduleNotification).not.toHaveBeenCalled();
  });

  it('coalesces concurrent reschedules so the last run uses the latest dose state', async () => {
    let pending = ['a', 'b', 'c'];
    mockReconcile.mockImplementation(() => pending.map(futureAlarm));

    // "Take all": each dose is marked taken, then a reschedule is fired without awaiting.
    const runs: Promise<void>[] = [];
    for (const id of ['a', 'b', 'c']) {
      pending = pending.filter((p) => p !== id);
      runs.push(rescheduleReminders(db));
    }
    await Promise.all(runs);

    expect(scheduleNotification).not.toHaveBeenCalled();
    expect(mockReconcile.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it('never interleaves cancel/schedule passes of overlapping reschedules', async () => {
    const events: string[] = [];
    cancelAll.mockImplementation(async () => {
      events.push('cancel');
    });
    scheduleNotification.mockImplementation(async () => {
      events.push('schedule');
      await Promise.resolve();
      return 'id';
    });
    mockReconcile.mockImplementation(() => [futureAlarm('a'), futureAlarm('b')]);

    await Promise.all([rescheduleReminders(db), rescheduleReminders(db), rescheduleReminders(db)]);

    // Each pass is cancel followed by its own schedules; no cancel lands mid-pass.
    expect(events.join(',')).toMatch(/^(cancel,schedule,schedule,?)+$/);
  });
});
