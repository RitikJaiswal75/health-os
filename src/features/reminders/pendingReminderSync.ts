import { enqueueIfPending } from './reminderQueue';
import { getNativePendingReminders } from './reminderNativePending';

/** Merge native pending reminders into the JS queue while alarms are active. */
export async function syncPendingNativeReminders(): Promise<void> {
  const pending = await getNativePendingReminders();
  for (const params of pending) {
    enqueueIfPending(params);
  }
}
