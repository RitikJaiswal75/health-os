import { useEffect, useState, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import { router } from 'expo-router';
import { permissionHelper, type PermissionState } from '../../core/permissions/permissionHelper';
import { useWizardStore } from '../medications/wizardStore';

export const ADD_MEDICATION_PATH = '/medicine/search';

export function navigateToAddMedication(): void {
  useWizardStore.getState().reset();
  router.push(ADD_MEDICATION_PATH);
}

export function navigateToReliabilityScreen(): void {
  router.push('/reliability');
}

export function usePermissionState(): {
  state: PermissionState | null;
  refresh: () => Promise<void>;
} {
  const [state, setState] = useState<PermissionState | null>(null);

  const refresh = useCallback(async () => {
    const next = await permissionHelper.readState();
    setState(next);
  }, []);

  useEffect(() => {
    void refresh();

    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return { state, refresh };
}

export type PermissionActionKind =
  | 'notifications'
  | 'exact_alarm'
  | 'full_screen_intent'
  | 'overlay';

export function getNextPermissionAction(
  state: PermissionState | null,
): PermissionActionKind | null {
  if (!state) return 'notifications';
  if (!state.notifications) return 'notifications';
  if (!state.exactAlarm) return 'exact_alarm';
  if (!state.fullScreenIntent) return 'full_screen_intent';
  if (!state.overlay) return 'overlay';
  return null;
}

export function getBlockedRemindersMessage(state: PermissionState | null): string | null {
  if (Platform.OS !== 'android' || !state) return null;
  if (!state.notifications) {
    return 'Allow notifications so Health OS can alert you when a dose is due.';
  }
  if (!state.exactAlarm) {
    return 'Enable exact alarms so reminders fire on time.';
  }
  return null;
}

export function getRecommendedRemindersMessage(state: PermissionState | null): string | null {
  if (Platform.OS !== 'android' || !state) return null;
  if (!state.fullScreenIntent) {
    return 'Allow full-screen intents for Health OS in Settings (same type of permission Clock and Calendar use for lock-screen alarms).';
  }
  if (!state.overlay) {
    return 'Allow Health OS to display over other apps for the best reminder experience.';
  }
  return null;
}

export function shouldShowReminderPermissionBanner(state: PermissionState | null): boolean {
  return getBlockedRemindersMessage(state) != null || getRecommendedRemindersMessage(state) != null;
}
