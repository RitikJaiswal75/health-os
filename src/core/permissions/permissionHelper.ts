import { Platform, Linking, NativeModules } from 'react-native';

export type PermissionKind =
  | 'exact_alarm'
  | 'full_screen_intent'
  | 'overlay'
  | 'camera'
  | 'photos'
  | 'notifications';

export interface PermissionState {
  exactAlarm: boolean;
  fullScreenIntent: boolean;
  overlay: boolean;
  camera: boolean;
  photos: boolean;
  notifications: boolean;
}

export interface PermissionHelper {
  readState(): Promise<PermissionState>;
  request(kind: PermissionKind): Promise<boolean>;
  openSettings(kind: PermissionKind): Promise<void>;
  isNativeAlarmModuleLinked(): boolean;
}

const defaultState: PermissionState = {
  exactAlarm: Platform.OS !== 'android',
  fullScreenIntent: Platform.OS !== 'android',
  overlay: Platform.OS !== 'android',
  camera: false,
  photos: false,
  notifications: false,
};

let cachedState: PermissionState = { ...defaultState };

/** Context-aware permission helper — reads grant state, prompts only when missing. */
export const permissionHelper: PermissionHelper = {
  isNativeAlarmModuleLinked(): boolean {
    if (Platform.OS !== 'android') return true;
    return NativeModules?.MedicationAlarm != null;
  },

  async readState(): Promise<PermissionState> {
    if (Platform.OS === 'android') {
      try {
        const MedicationAlarm = require('../../../modules/medication-alarm');
        if (MedicationAlarm?.getPermissionState) {
          const native = await MedicationAlarm.getPermissionState();
          cachedState = { ...defaultState, ...cachedState, ...native };
        }
      } catch {
        // Native module not linked yet — use defaults for dev
      }
    }

    try {
      const Notifications = require('expo-notifications');
      const settings = await Notifications.getPermissionsAsync();
      cachedState = {
        ...cachedState,
        notifications: settings.granted === true,
      };
    } catch {
      // ignore
    }

    return cachedState;
  },

  async request(kind: PermissionKind): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const MedicationAlarm = require('../../../modules/medication-alarm');
        if (MedicationAlarm?.requestPermission) {
          return MedicationAlarm.requestPermission(kind);
        }
      } catch {
        // stub
      }
    }
    return false;
  },

  async openSettings(kind: PermissionKind): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        const MedicationAlarm = require('../../../modules/medication-alarm');
        if (MedicationAlarm?.requestPermission) {
          const opened = await MedicationAlarm.requestPermission(kind);
          if (opened) return;
        }
      } catch {
        // fall through to generic settings
      }
    }
    await Linking.openSettings();
  },
};

export function resetPermissionCacheForTests(): void {
  cachedState = { ...defaultState };
}
