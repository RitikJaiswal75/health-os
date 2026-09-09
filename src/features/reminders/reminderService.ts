import { addDays, format } from 'date-fns';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { parseScheduledAt, formatLocalDateTime } from '../../core/dates/dateUtils';
import { ensureNotificationSetup, MEDICATION_REMINDER_CHANNEL } from './notificationSetup';
import { dedupeAlarms } from './alarmDedupe';
import type { SQLiteDatabase } from 'expo-sqlite';
import { DoseEventRepository, MedicationRepository } from '../medications/medicationRepository';

export interface AlarmScheduleInput {
  id: string;
  medicationId: string;
  medicationName: string;
  scheduledAt: string;
  doseAmount: number;
  doseEventId?: string;
}

export class ReminderReconciler {
  constructor(private readonly db: SQLiteDatabase) {}

  /** Build alarms from actionable dose rows (pending + snoozed), not raw schedule only. */
  reconcile(daysAhead = 7): AlarmScheduleInput[] {
    const medRepo = new MedicationRepository(this.db);
    const doseRepo = new DoseEventRepository(this.db);
    const now = Date.now();
    const toMillis = addDays(new Date(), daysAhead).getTime();
    const medsById = new Map(medRepo.getAll().map((med) => [med.id, med]));

    const alarms: AlarmScheduleInput[] = [];

    for (const dose of doseRepo.getUpcomingForReminders(now, toMillis)) {
      const med = medsById.get(dose.medicationId);
      if (!med) continue;

      const alarmId = dose.scheduleId
        ? `${dose.scheduleId}:${format(parseScheduledAt(dose.scheduledAt), 'yyyy-MM-dd-HH-mm')}`
        : `dose:${dose.id}`;

      alarms.push({
        id: alarmId,
        medicationId: dose.medicationId,
        medicationName: med.nickname ?? med.name,
        scheduledAt: dose.scheduledAt,
        doseAmount: dose.doseAmount,
        doseEventId: dose.id,
      });
    }

    return alarms.sort(
      (a, b) => parseScheduledAt(a.scheduledAt).getTime() - parseScheduledAt(b.scheduledAt).getTime(),
    );
  }
}

async function scheduleExpoNotifications(occurrences: AlarmScheduleInput[]): Promise<number> {
  const granted = await ensureNotificationSetup();
  if (!granted) return 0;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = Date.now();
  let scheduled = 0;

  for (const occ of occurrences) {
    const triggerDate = parseScheduledAt(occ.scheduledAt);
    if (triggerDate.getTime() <= now) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Medication due',
        body: `Time to take ${occ.medicationName}`,
        ...(Platform.OS === 'ios' ? { sound: true } : {}),
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: {
          medicationId: occ.medicationId,
          alarmId: occ.id,
          scheduledAt: occ.scheduledAt,
          doseEventId: occ.doseEventId ?? null,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: Platform.OS === 'android' ? MEDICATION_REMINDER_CHANNEL : undefined,
      },
    });
    scheduled += 1;
  }

  return scheduled;
}

async function scheduleNativeAlarms(occurrences: AlarmScheduleInput[]): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    const MedicationAlarm = require('../../../modules/medication-alarm');
    if (MedicationAlarm?.scheduleAlarms) {
      await MedicationAlarm.scheduleAlarms(occurrences);
    }
  } catch {
    // Native module optional in some dev builds.
  }
}

export async function scheduleAlarms(occurrences: AlarmScheduleInput[]): Promise<void> {
  const unique = dedupeAlarms(occurrences);
  if (unique.length === 0) return;

  if (Platform.OS === 'android') {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await scheduleNativeAlarms(unique);
    return;
  }

  await scheduleExpoNotifications(unique);
}

export async function cancelAlarm(alarmId: string): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      const MedicationAlarm = require('../../../modules/medication-alarm');
      if (MedicationAlarm?.cancelAlarm) {
        await MedicationAlarm.cancelAlarm(alarmId);
      }
    } catch {
      // stub
    }
  }
}

export async function dismissReminderNotification(
  alarmId: string,
  medicationId?: string,
): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    const MedicationAlarm = require('../../../modules/medication-alarm');
    if (MedicationAlarm?.dismissReminderNotification) {
      await MedicationAlarm.dismissReminderNotification(alarmId, medicationId ?? null);
    }
  } catch {
    // stub
  }
}

export async function scheduleSnoozeAt(
  medicationId: string,
  medicationName: string,
  scheduledAt: string,
  doseEventId?: string,
  db?: SQLiteDatabase,
): Promise<void> {
  if (db) {
    const reconciler = new ReminderReconciler(db);
    await scheduleAlarms(reconciler.reconcile(7));
    return;
  }

  await scheduleAlarms([
    {
      id: `snooze:${medicationId}:${doseEventId ?? Date.now()}`,
      medicationId,
      medicationName,
      scheduledAt,
      doseAmount: 1,
      doseEventId,
    },
  ]);
}

export async function scheduleSnooze(
  medicationId: string,
  medicationName: string,
  minutes: number,
  doseEventId?: string,
): Promise<string> {
  const scheduledAt = formatLocalDateTime(new Date(Date.now() + minutes * 60000));
  await scheduleSnoozeAt(medicationId, medicationName, scheduledAt, doseEventId);
  return scheduledAt;
}
