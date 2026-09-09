import { useEffect } from 'react';
import { AppState, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import { ensureNotificationSetup } from './notificationSetup';
import { openReminderFromData, openReminderFromDeepLink } from './reminderDeepLink';
import { syncPendingNativeReminders } from './pendingReminderSync';

export function ReminderNotificationBootstrap() {
  useEffect(() => {
    void ensureNotificationSetup();

    const openLaunchReminder = async (url: string | null) => {
      openReminderFromDeepLink(url);
      await syncPendingNativeReminders();
    };

    void Linking.getInitialURL().then((url) => openLaunchReminder(url));

    const urlSub = Linking.addEventListener('url', ({ url }) => {
      void openLaunchReminder(url);
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      openReminderFromData(response.notification.request.content.data);
      void syncPendingNativeReminders();
    });

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void syncPendingNativeReminders();
      }
    });

    void syncPendingNativeReminders();

    return () => {
      urlSub.remove();
      responseSub.remove();
      appStateSub.remove();
    };
  }, []);

  return null;
}
