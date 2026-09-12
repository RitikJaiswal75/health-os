import { router } from 'expo-router';
import {
  clearReminderNavigationState,
  reminderNavigationKey,
  shouldNavigateToReminder,
} from './reminderNavigationDedupe';
import { getNativePendingReminders } from './reminderNativePending';
import { isReminderRouterReady, setReminderRouterReady as setReadyFlag } from './reminderRouterReady';
import type { ReminderRouteParams } from './reminderRouteParams';

let activeReminder: ReminderRouteParams | null = null;
const queuedReminders: ReminderRouteParams[] = [];
const handledReminderKeys = new Set<string>();
const deferredShows: ReminderRouteParams[] = [];

function isSameReminder(a: ReminderRouteParams, b: ReminderRouteParams): boolean {
  return reminderNavigationKey(a) === reminderNavigationKey(b);
}

function isAlreadyQueued(params: ReminderRouteParams): boolean {
  return queuedReminders.some((item) => isSameReminder(item, params));
}

function isDeferred(params: ReminderRouteParams): boolean {
  return deferredShows.some((item) => isSameReminder(item, params));
}

function handledKeyFor(params: ReminderRouteParams): string {
  return reminderNavigationKey(params);
}

function isHandled(params: ReminderRouteParams): boolean {
  return handledReminderKeys.has(handledKeyFor(params));
}

export function markReminderHandled(params: ReminderRouteParams): void {
  handledReminderKeys.add(handledKeyFor(params));
}

function purgeHandledFromQueue(): void {
  for (let i = queuedReminders.length - 1; i >= 0; i -= 1) {
    if (isHandled(queuedReminders[i]!)) {
      queuedReminders.splice(i, 1);
    }
  }
}

function purgeHandledDeferred(): void {
  for (let i = deferredShows.length - 1; i >= 0; i -= 1) {
    if (isHandled(deferredShows[i]!)) {
      deferredShows.splice(i, 1);
    }
  }
}

function deferShowReminder(params: ReminderRouteParams): void {
  if (!isDeferred(params)) {
    deferredShows.push(params);
  }
}

function showReminderNow(params: ReminderRouteParams): void {
  activeReminder = params;
  router.replace({
    pathname: '/reminder',
    params,
  });
}

function showReminder(params: ReminderRouteParams): boolean {
  if (isHandled(params)) {
    return false;
  }

  if (!isReminderRouterReady()) {
    activeReminder = params;
    deferShowReminder(params);
    return true;
  }

  if (!shouldNavigateToReminder(params)) {
    return false;
  }

  showReminderNow(params);
  return true;
}

export function setReminderRouterReady(ready: boolean): void {
  setReadyFlag(ready);
}

export function flushDeferredReminderNavigation(): void {
  purgeHandledDeferred();

  if (!isReminderRouterReady() || !activeReminder) {
    return;
  }

  const params = activeReminder;
  if (isHandled(params)) {
    activeReminder = null;
    return;
  }
  if (showReminder(params)) {
    const deferredIndex = deferredShows.findIndex((item) => isSameReminder(item, params));
    if (deferredIndex >= 0) {
      deferredShows.splice(deferredIndex, 1);
    }
  }
}

async function leaveReminderFlow(): Promise<void> {
  if (!isReminderRouterReady()) {
    return;
  }

  router.replace('/(tabs)');

  const { BackHandler, InteractionManager, Platform } =
    require('react-native') as typeof import('react-native');

  await new Promise<void>((resolve) => {
    const finish = () => setTimeout(resolve, 200);
    if (typeof InteractionManager?.runAfterInteractions === 'function') {
      InteractionManager.runAfterInteractions(finish);
    } else {
      finish();
    }
  });

  if (Platform.OS === 'android' && typeof BackHandler?.exitApp === 'function') {
    BackHandler.exitApp();
  }
}

async function importNativePendingIntoQueue(): Promise<void> {
  const pending = await getNativePendingReminders();
  for (const params of pending) {
    enqueueIfPending(params);
  }
  purgeHandledFromQueue();
}

/** Route or queue a reminder from native storage without duplicating the active one. */
export function enqueueIfPending(params: ReminderRouteParams): boolean {
  if (isHandled(params)) {
    return false;
  }
  if (activeReminder && isSameReminder(activeReminder, params)) {
    return false;
  }
  if (isAlreadyQueued(params) || isDeferred(params)) {
    return false;
  }

  if (activeReminder) {
    queuedReminders.push(params);
    return false;
  }

  return showReminder(params);
}

export function pushReminder(params: ReminderRouteParams): boolean {
  return enqueueIfPending(params);
}

export async function completeCurrentReminder(
  handled?: ReminderRouteParams,
): Promise<boolean> {
  if (handled) {
    markReminderHandled(handled);
  } else if (activeReminder) {
    markReminderHandled(activeReminder);
  }

  if (activeReminder) {
    clearReminderNavigationState();
  }
  activeReminder = null;
  purgeHandledFromQueue();
  purgeHandledDeferred();

  await importNativePendingIntoQueue();

  if (activeReminder) {
    return true;
  }

  let next = queuedReminders.shift();
  while (next && isHandled(next)) {
    next = queuedReminders.shift();
  }
  if (next) {
    showReminder(next);
    return true;
  }

  await leaveReminderFlow();
  return false;
}

export function resetReminderQueueForTests(): void {
  activeReminder = null;
  queuedReminders.length = 0;
  deferredShows.length = 0;
  handledReminderKeys.clear();
}

export function getQueuedReminderCount(): number {
  return queuedReminders.length + deferredShows.length + (activeReminder ? 1 : 0);
}
