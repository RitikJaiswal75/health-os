import { Platform, NativeModules } from 'react-native';

export interface AlarmOccurrence {
  id: string;
  medicationId: string;
  medicationName: string;
  scheduledAt: string;
  doseAmount: number;
  doseEventId?: string;
}

export interface NativePermissionState {
  exactAlarm: boolean;
  fullScreenIntent: boolean;
  overlay: boolean;
}

const LINKING_ERROR =
  "The native module 'MedicationAlarm' doesn't seem to be linked. Run prebuild for native alarm support.";

const MedicationAlarmModule = NativeModules.MedicationAlarm ?? {
  scheduleAlarms: async (_occurrences: AlarmOccurrence[]) => {
    if (__DEV__) console.warn(LINKING_ERROR);
  },
  cancelAlarm: async (_id: string) => {
    if (__DEV__) console.warn(LINKING_ERROR);
  },
  dismissReminderNotification: async (_id: string) => {
    if (__DEV__) console.warn(LINKING_ERROR);
  },
  getPendingReminders: async (): Promise<
    Array<{
      medicationId: string;
      alarmId: string;
      scheduledAt: string;
      doseEventId?: string;
    }>
  > => {
    if (__DEV__) console.warn(LINKING_ERROR);
    return [];
  },
  consumeReminderLaunchIntent: async (): Promise<{
    medicationId: string;
    alarmId: string;
    scheduledAt: string;
    doseEventId?: string;
  } | null> => {
    if (__DEV__) console.warn(LINKING_ERROR);
    return null;
  },
  getPermissionState: async (): Promise<NativePermissionState> => ({
    exactAlarm: Platform.OS !== 'android',
    fullScreenIntent: Platform.OS !== 'android',
    overlay: Platform.OS !== 'android',
  }),
  requestPermission: async (_kind: string) => false,
};

export async function scheduleAlarms(occurrences: AlarmOccurrence[]): Promise<void> {
  return MedicationAlarmModule.scheduleAlarms(occurrences);
}

export async function cancelAlarm(id: string): Promise<void> {
  return MedicationAlarmModule.cancelAlarm(id);
}

export async function dismissReminderNotification(
  alarmId: string,
): Promise<void> {
  return MedicationAlarmModule.dismissReminderNotification(alarmId);
}

export async function getPendingReminders(): Promise<
  Array<{
    medicationId: string;
    alarmId: string;
    scheduledAt: string;
    doseEventId?: string;
  }>
> {
  return MedicationAlarmModule.getPendingReminders();
}

export async function consumeReminderLaunchIntent(): Promise<{
  medicationId: string;
  alarmId: string;
  scheduledAt: string;
  doseEventId?: string;
} | null> {
  return MedicationAlarmModule.consumeReminderLaunchIntent();
}

export async function getPermissionState(): Promise<NativePermissionState> {
  return MedicationAlarmModule.getPermissionState();
}

export async function requestPermission(kind: string): Promise<boolean> {
  return MedicationAlarmModule.requestPermission(kind);
}

export default MedicationAlarmModule;
