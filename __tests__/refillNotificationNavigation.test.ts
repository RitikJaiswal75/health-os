import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import {
  consumeLaunchRefillResponse,
  flushPendingRefillNavigation,
  openRefillFromNotification,
  resetRefillNavigationForTests,
} from '../src/features/inventory/refillNotificationNavigation';
import { HIGHLIGHT_MEDICATION_PARAM } from '../src/features/inventory/constants';
import {
  resetReminderRouterReadyForTests,
  setReminderRouterReady,
} from '../src/features/reminders/reminderRouterReady';

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn() },
}));

jest.mock('expo-notifications', () => ({
  getLastNotificationResponse: jest.fn(),
  clearLastNotificationResponse: jest.fn(),
}));

const getLastResponse = Notifications.getLastNotificationResponse as jest.Mock;
const clearLastResponse = Notifications.clearLastNotificationResponse as jest.Mock;
const launchResponse = (data: Record<string, unknown>, identifier = 'notif-1') => ({
  notification: { request: { identifier, content: { data } } },
});

const navigate = router.navigate as jest.Mock;
const refillData = { type: 'refill', medicationId: 'med-1' };
const expectedRoute = {
  pathname: '/(tabs)/library',
  params: { [HIGHLIGHT_MEDICATION_PARAM]: 'med-1' },
};

describe('refill notification navigation', () => {
  beforeEach(() => {
    navigate.mockClear();
    getLastResponse.mockReset();
    clearLastResponse.mockReset();
    resetRefillNavigationForTests();
    resetReminderRouterReadyForTests();
  });

  it('ignores dose reminder data so it still opens the reminder screen', () => {
    setReminderRouterReady(true);
    expect(openRefillFromNotification({ medicationId: 'med-1', alarmId: 'slot:x' })).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('opens the medications tab with the medication highlighted', () => {
    setReminderRouterReady(true);
    expect(openRefillFromNotification(refillData, 'notif-1')).toBe(true);
    expect(navigate).toHaveBeenCalledWith(expectedRoute);
  });

  it('defers navigation on cold start until the router is ready', () => {
    expect(openRefillFromNotification(refillData, 'notif-1')).toBe(true);
    expect(navigate).not.toHaveBeenCalled();

    setReminderRouterReady(true);
    flushPendingRefillNavigation();
    flushPendingRefillNavigation();
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(expectedRoute);
  });

  it('handles the same notification tap only once', () => {
    setReminderRouterReady(true);
    openRefillFromNotification(refillData, 'notif-1');
    openRefillFromNotification(refillData, 'notif-1');
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('opens a refill launch tap once, even after a JS reload resets in-memory state', () => {
    setReminderRouterReady(true);
    let stored: ReturnType<typeof launchResponse> | null = launchResponse(refillData);
    getLastResponse.mockImplementation(() => stored);
    clearLastResponse.mockImplementation(() => {
      stored = null;
    });

    consumeLaunchRefillResponse();
    resetRefillNavigationForTests(); // simulates a JS reload
    consumeLaunchRefillResponse();

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(expectedRoute);
  });

  it('leaves a dose reminder launch response for the reminder flow', () => {
    setReminderRouterReady(true);
    getLastResponse.mockReturnValue(launchResponse({ medicationId: 'med-1', alarmId: 'slot:x' }));

    consumeLaunchRefillResponse();

    expect(navigate).not.toHaveBeenCalled();
    expect(clearLastResponse).not.toHaveBeenCalled();
  });
});
