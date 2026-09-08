import { useEffect, useState, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import { router } from 'expo-router';
import { permissionHelper, type PermissionState } from '../../core/permissions/permissionHelper';

export const ADD_MEDICATION_PATH = '/medicine/search';

export async function navigateToAddMedication(): Promise<void> {
  const state = await permissionHelper.readState();
  const blocked = getBlockedRemindersMessage(state);
  if (blocked) {
    router.push({ pathname: '/reliability', params: { returnTo: ADD_MEDICATION_PATH } });
    return;
  }
  router.push(ADD_MEDICATION_PATH);
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
