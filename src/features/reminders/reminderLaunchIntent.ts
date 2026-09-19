import { DeviceEventEmitter, NativeModules, Platform } from 'react-native';
import { forceOpenReminder } from './reminderQueue';
import type { ReminderRouteParams } from './reminderRouteParams';

const LAUNCH_EVENT = 'healthos:reminderLaunch';

function paramsFromLaunchRow(
  row: Record<string, unknown> | null | undefined,
): ReminderRouteParams | null {
  if (!row) return null;
  const alarmId = typeof row.alarmId === 'string' ? row.alarmId : '';
  const medicationId = typeof row.medicationId === 'string' ? row.medicationId : '';
  const scheduledAt = typeof row.scheduledAt === 'string' ? row.scheduledAt : undefined;
  if (!alarmId || (!medicationId && !scheduledAt)) return null;

  return {
    ...(medicationId ? { medicationId } : {}),
    alarmId,
    scheduledAt,
    doseEventId: typeof row.doseEventId === 'string' ? row.doseEventId : undefined,
  };
}

async function clearCapturedLaunchIntent(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const MedicationAlarm = NativeModules.MedicationAlarm;
    if (MedicationAlarm?.consumeReminderLaunchIntent) {
      await MedicationAlarm.consumeReminderLaunchIntent();
    }
  } catch {
    // ignore
  }
}

export async function handleReminderLaunchParams(params: ReminderRouteParams): Promise<boolean> {
  const opened = forceOpenReminder(params);
  if (opened) {
    await clearCapturedLaunchIntent();
  }
  return opened;
}

export async function syncReminderLaunchIntent(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    const MedicationAlarm = NativeModules.MedicationAlarm;
    if (!MedicationAlarm?.consumeReminderLaunchIntent) return false;

    const row = await MedicationAlarm.consumeReminderLaunchIntent();
    const params = paramsFromLaunchRow(row);
    if (!params) return false;

    return await handleReminderLaunchParams(params);
  } catch {
    return false;
  }
}

export function subscribeReminderLaunchIntent(): () => void {
  if (Platform.OS !== 'android') {
    return () => undefined;
  }

  const subscription = DeviceEventEmitter.addListener(
    LAUNCH_EVENT,
    (row: Record<string, unknown>) => {
      const params = paramsFromLaunchRow(row);
      if (params) {
        void handleReminderLaunchParams(params);
      }
    },
  );

  return () => subscription.remove();
}
