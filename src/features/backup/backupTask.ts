import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { runBackup } from './backupService';
import { BACKGROUND_TASK_INTERVAL_MINUTES, BACKUP_TASK_NAME } from './constants';

// Must be defined at import time, in the global scope, so the OS can start it headless.
TaskManager.defineTask(BACKUP_TASK_NAME, async () => {
  const outcome = await runBackup('auto');
  return outcome.status === 'failed'
    ? BackgroundTask.BackgroundTaskResult.Failed
    : BackgroundTask.BackgroundTaskResult.Success;
});

/** The OS decides the real run time; runBackup throttles to once a day either way. */
export async function setBackgroundBackup(enabled: boolean): Promise<void> {
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(BACKUP_TASK_NAME);
    if (enabled && !registered) {
      await BackgroundTask.registerTaskAsync(BACKUP_TASK_NAME, {
        minimumInterval: BACKGROUND_TASK_INTERVAL_MINUTES,
      });
    } else if (!enabled && registered) {
      await BackgroundTask.unregisterTaskAsync(BACKUP_TASK_NAME);
    }
  } catch {
    // Best effort: the foreground run and the 7-day reminder still cover the user.
  }
}
