import { enqueueIfPending } from './reminderQueue';
import { getNativePendingReminders } from './reminderNativePending';
import { syncReminderLaunchIntent } from './reminderLaunchIntent';

/** Merge native pending reminders into the JS queue while alarms are active. */
export async function syncPendingNativeReminders(): Promise<void> {
  const openedFromLaunch = await syncReminderLaunchIntent();
  if (openedFromLaunch) {
    return;
  }

  const pending = await getNativePendingReminders();
  for (const params of pending) {
    enqueueIfPending(params);
  }
}
