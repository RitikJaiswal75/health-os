import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import {
  clearReminderNavigationState,
  shouldNavigateToReminder,
} from './reminderNavigationDedupe';
import type { ReminderRouteParams } from './reminderRouteParams';

export type { ReminderRouteParams } from './reminderRouteParams';

function paramsFromQuery(queryParams: Linking.QueryParams | null): ReminderRouteParams | null {
  if (!queryParams) return null;
  const medicationId = queryParams.medicationId;
  const alarmId = queryParams.alarmId;
  if (typeof medicationId !== 'string' || typeof alarmId !== 'string') return null;

  return {
    medicationId,
    alarmId,
    scheduledAt: typeof queryParams.scheduledAt === 'string' ? queryParams.scheduledAt : undefined,
    doseEventId: typeof queryParams.doseEventId === 'string' ? queryParams.doseEventId : undefined,
  };
}

function navigateToReminder(params: ReminderRouteParams): boolean {
  if (!shouldNavigateToReminder(params)) return false;

  router.replace({
    pathname: '/reminder',
    params,
  });
  return true;
}

export function openReminderFromData(data: Record<string, unknown> | undefined): boolean {
  if (!data?.medicationId || typeof data.medicationId !== 'string') return false;

  return navigateToReminder({
    medicationId: data.medicationId,
    alarmId: typeof data.alarmId === 'string' ? data.alarmId : '',
    scheduledAt: typeof data.scheduledAt === 'string' ? data.scheduledAt : undefined,
    doseEventId: typeof data.doseEventId === 'string' ? data.doseEventId : undefined,
  });
}

export function openReminderFromDeepLink(url: string | null | undefined): boolean {
  if (!url?.includes('reminder')) return false;

  const parsed = Linking.parse(url);
  const params = paramsFromQuery(parsed.queryParams);
  if (!params) return false;

  return navigateToReminder(params);
}

export function exitReminderScreen(): void {
  clearReminderNavigationState();
  router.replace('/(tabs)');
}
