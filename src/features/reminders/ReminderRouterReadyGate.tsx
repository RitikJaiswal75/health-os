import { useEffect } from 'react';
import { InteractionManager } from 'react-native';
import { useRootNavigationState } from 'expo-router';
import { flushDeferredReminderNavigation, setReminderRouterReady } from './reminderQueue';
import { syncPendingNativeReminders } from './pendingReminderSync';

const ROUTER_SETTLE_MS = 350;

/** Waits for Expo Router's root Stack before opening reminder routes. */
export function ReminderRouterReadyGate() {
  const navigationState = useRootNavigationState();
  const ready = navigationState?.key != null;

  useEffect(() => {
    setReminderRouterReady(ready);
    if (!ready) return;

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const task = InteractionManager.runAfterInteractions(() => {
      timeout = setTimeout(() => {
        if (cancelled) return;
        flushDeferredReminderNavigation();
        void syncPendingNativeReminders();
      }, ROUTER_SETTLE_MS);
    });

    return () => {
      cancelled = true;
      task.cancel();
      if (timeout) clearTimeout(timeout);
      setReminderRouterReady(false);
    };
  }, [ready]);

  return null;
}
