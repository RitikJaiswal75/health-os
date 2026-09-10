import type { ReminderRouteParams } from './reminderRouteParams';

export const REMINDER_DEDUPE_MS = 8000;

let lastOpenedKey: string | null = null;
let lastOpenedAt = 0;

export function reminderNavigationKey(params: ReminderRouteParams): string {
  return `${params.alarmId}|${params.medicationId ?? ''}|${params.scheduledAt ?? ''}|${params.doseEventId ?? ''}`;
}

export function shouldNavigateToReminder(
  params: ReminderRouteParams,
  nowMs: number = Date.now(),
): boolean {
  const key = reminderNavigationKey(params);
  if (lastOpenedKey === key && nowMs - lastOpenedAt < REMINDER_DEDUPE_MS) {
    return false;
  }
  lastOpenedKey = key;
  lastOpenedAt = nowMs;
  return true;
}

export function resetReminderNavigationForTests(): void {
  lastOpenedKey = null;
  lastOpenedAt = 0;
}

export function clearReminderNavigationState(): void {
  lastOpenedKey = null;
  lastOpenedAt = 0;
}
