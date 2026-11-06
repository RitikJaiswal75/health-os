import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { ensureNotificationSetup } from './notificationSetup';
import { openReminderFromData } from './reminderDeepLink';
import { syncPendingNativeReminders } from './pendingReminderSync';
import { subscribeReminderLaunchIntent } from './reminderLaunchIntent';
import { isReminderRouterReady } from './reminderRouterReady';
import {
  consumeLaunchRefillResponse,
  openRefillFromNotification,
} from '../inventory/refillNotificationNavigation';

const ACTIVE_POLL_MS = 1500;

export function ReminderNotificationBootstrap() {
  useEffect(() => {
    void ensureNotificationSetup();
    const launchSub = subscribeReminderLaunchIntent();

    consumeLaunchRefillResponse();

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const { request } = response.notification;
      if (openRefillFromNotification(request.content.data, request.identifier)) {
        // Warm taps also become the "last response"; clear so a reload doesn't replay it.
        Notifications.clearLastNotificationResponse();
        return;
      }
      openReminderFromData(request.content.data);
      if (isReminderRouterReady()) {
        void syncPendingNativeReminders();
      }
    });

    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const startActivePolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(() => {
        if (!isReminderRouterReady()) return;
        void syncPendingNativeReminders();
      }, ACTIVE_POLL_MS);
    };

    const stopActivePolling = () => {
      if (!pollTimer) return;
      clearInterval(pollTimer);
      pollTimer = null;
    };

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        if (isReminderRouterReady()) {
          void syncPendingNativeReminders();
        }
        startActivePolling();
        return;
      }
      stopActivePolling();
    };

    const appStateSub = AppState.addEventListener('change', handleAppState);
    if (AppState.currentState === 'active') {
      startActivePolling();
    }

    return () => {
      launchSub();
      responseSub.remove();
      appStateSub.remove();
      stopActivePolling();
    };
  }, []);

  return null;
}
