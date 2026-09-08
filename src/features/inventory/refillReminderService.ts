import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Medication } from '@/src/db/schema';
import { ensureNotificationSetup, MEDICATION_REMINDER_CHANNEL } from '@/src/features/reminders/notificationSetup';

export async function notifyRefillIfNeeded(
  med: Medication,
  previousQty: number,
  newQty: number,
): Promise<void> {
  if (!med.refillEnabled || med.refillThreshold == null) return;
  if (newQty > med.refillThreshold) return;
  if (previousQty === newQty) return;

  const granted = await ensureNotificationSetup();
  if (!granted) return;

  const label = med.nickname ?? med.name;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Refill reminder',
      body: `${label} has ${newQty} left. Consider refilling soon.`,
      ...(Platform.OS === 'android' ? { channelId: MEDICATION_REMINDER_CHANNEL } : {}),
    },
    trigger: null,
  });
}
