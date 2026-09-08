import { useEffect } from 'react';
import { Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import { ensureNotificationSetup } from './notificationSetup';
import { openReminderFromData, openReminderFromDeepLink } from './reminderDeepLink';

export function ReminderNotificationBootstrap() {
  useEffect(() => {
    void ensureNotificationSetup();

    void Linking.getInitialURL().then((url) => {
      openReminderFromDeepLink(url);
    });

    const urlSub = Linking.addEventListener('url', ({ url }) => {
      openReminderFromDeepLink(url);
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      openReminderFromData(response.notification.request.content.data);
    });

    return () => {
      urlSub.remove();
      responseSub.remove();
    };
  }, []);

  return null;
}
