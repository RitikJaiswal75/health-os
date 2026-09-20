import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Medication } from '@/src/db/schema';
import { ensureNotificationSetup, MEDICATION_REMINDER_CHANNEL } from '@/src/features/reminders/notificationSetup';
import { t } from '@/src/i18n/translate';

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
      title: t('refill.notifyTitle'),
      body: t('refill.notifyBody', { name: label, count: newQty }),
      ...(Platform.OS === 'android' ? { channelId: MEDICATION_REMINDER_CHANNEL } : {}),
    },
    trigger: null,
  });
}
