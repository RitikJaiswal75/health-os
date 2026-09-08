import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export const MEDICATION_REMINDER_CHANNEL = 'medication-reminders';

let setupDone = false;

export async function ensureNotificationSetup(): Promise<boolean> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(MEDICATION_REMINDER_CHANNEL, {
      name: 'Medication reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 300, 150, 300],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
      enableVibrate: true,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

  if (!granted) {
    const requested = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    granted = requested.granted;
  }

  setupDone = granted;
  return granted;
}

export function isNotificationSetupDone(): boolean {
  return setupDone;
}
