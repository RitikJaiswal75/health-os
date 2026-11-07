import { addDays, format } from 'date-fns';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { parseScheduledAt, scheduledAtToDateKey } from '../../core/dates/dateUtils';
import { ensureNotificationSetup, MEDICATION_REMINDER_CHANNEL } from './notificationSetup';
import { dedupeAlarms, groupToSlotAlarms, type AlarmScheduleInput } from './alarmGrouping';
import type { SQLiteDatabase } from 'expo-sqlite';
import { DoseEventRepository, MedicationRepository } from '../medications/medicationRepository';
import { t } from '@/src/i18n/translate';
import { reportError } from '@/src/core/observability/crashReporter';

export type { AlarmScheduleInput } from './alarmGrouping';

export class ReminderReconciler {
  constructor(private readonly db: SQLiteDatabase) {}

  /**
   * Build alarms from actionable dose rows (pending + snoozed), not raw schedule only: every dose in
   * the next `daysAhead` days, plus all doses on each schedule's next day when that is further away
   * (monthly), so they still ring if the app is not opened before then.
   */
  reconcile(daysAhead = 7): AlarmScheduleInput[] {
    const medRepo = new MedicationRepository(this.db);
    const doseRepo = new DoseEventRepository(this.db);
    const now = Date.now();
    const toMillis = addDays(new Date(), daysAhead).getTime();
    const medsById = new Map(medRepo.getAll().map((med) => [med.id, med]));

    const alarms: AlarmScheduleInput[] = [];
    const upcoming = doseRepo
      .getUpcomingForReminders(now, Number.POSITIVE_INFINITY)
      .map((dose) => ({ dose, trigger: parseScheduledAt(dose.scheduledAt).getTime() }))
      .sort((a, b) => a.trigger - b.trigger);
    const nextDayBySchedule = new Map<string, string>();

    for (const { dose, trigger } of upcoming) {
      const scheduleKey = dose.scheduleId ?? dose.id;
      const dayKey = scheduledAtToDateKey(dose.scheduledAt);
      if (!nextDayBySchedule.has(scheduleKey)) nextDayBySchedule.set(scheduleKey, dayKey);
      if (trigger > toMillis && nextDayBySchedule.get(scheduleKey) !== dayKey) continue;

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
        title: t('reminder.dueTitle'),
        body: t('reminder.dueBody', { name: occ.medicationName }),
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

  const slotAlarms = groupToSlotAlarms(occurrences);

  try {
    const MedicationAlarm = require('../../../modules/medication-alarm');
    if (MedicationAlarm?.scheduleAlarms) {
      await MedicationAlarm.scheduleAlarms(slotAlarms);
    }
  } catch (error) {
    reportError('ALARM_SCHEDULE_FAILED', error);
    if (__DEV__) {
      console.warn('[scheduleNativeAlarms]', error);
    }
  }
}

export async function scheduleAlarms(occurrences: AlarmScheduleInput[]): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await scheduleNativeAlarms(occurrences);
    return;
  }

  if (occurrences.length === 0) {
    // Still clear what's scheduled, or the last resolved dose keeps its notification.
    await Notifications.cancelAllScheduledNotificationsAsync();
    return;
  }
  await scheduleExpoNotifications(dedupeAlarms(occurrences));
}

let rescheduleTail: Promise<void> = Promise.resolve();
let queuedReschedule: Promise<void> | null = null;

/**
 * Re-sync OS alarms with current dose rows so resolved doses stop ringing.
 * Runs are serialized, and calls made while one is waiting share it; each run reads
 * dose rows when it starts, so the last run always reflects the latest state.
 */
export function rescheduleReminders(db: SQLiteDatabase): Promise<void> {
  if (queuedReschedule) return queuedReschedule;

  const run = rescheduleTail.then(async () => {
    queuedReschedule = null;
    try {
      await scheduleAlarms(new ReminderReconciler(db).reconcile(7));
    } catch (error) {
      reportError('ALARM_SCHEDULE_FAILED', error);
    }
  });
  queuedReschedule = run;
  rescheduleTail = run;
  return run;
}

export async function dismissReminderNotification(
  alarmId: string,
): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    const MedicationAlarm = require('../../../modules/medication-alarm');
    if (MedicationAlarm?.dismissReminderNotification) {
      await MedicationAlarm.dismissReminderNotification(alarmId);
    }
  } catch {
    // stub
  }
}
