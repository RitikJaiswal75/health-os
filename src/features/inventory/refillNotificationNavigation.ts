import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { isReminderRouterReady } from '../reminders/reminderRouterReady';
import { HIGHLIGHT_MEDICATION_PARAM, REFILL_NOTIFICATION_TYPE } from './constants';

let pendingMedicationId: string | null = null;
const handledNotificationIds = new Set<string>();

export function isRefillNotificationData(data: Record<string, unknown> | undefined): boolean {
  return data?.type === REFILL_NOTIFICATION_TYPE;
}

function navigateToMedication(medicationId: string): void {
  router.navigate({
    pathname: '/(tabs)/library',
    params: { [HIGHLIGHT_MEDICATION_PARAM]: medicationId },
  });
}

/**
 * Open the Medications tab with the refill medication highlighted. Defers until the
 * router is ready (cold start from a notification tap). Returns false for non-refill data.
 */
export function openRefillFromNotification(
  data: Record<string, unknown> | undefined,
  notificationId?: string,
): boolean {
  if (!isRefillNotificationData(data)) return false;
  const medicationId = data?.medicationId;
  if (typeof medicationId !== 'string' || !medicationId) return true;

  // The cold-start response can arrive from both the listener and getLastNotificationResponse.
  if (notificationId) {
    if (handledNotificationIds.has(notificationId)) return true;
    handledNotificationIds.add(notificationId);
  }

  if (!isReminderRouterReady()) {
    pendingMedicationId = medicationId;
    return true;
  }

  navigateToMedication(medicationId);
  return true;
}

export function flushPendingRefillNavigation(): void {
  if (!pendingMedicationId || !isReminderRouterReady()) return;
  const medicationId = pendingMedicationId;
  pendingMedicationId = null;
  navigateToMedication(medicationId);
}

export function resetRefillNavigationForTests(): void {
  pendingMedicationId = null;
  handledNotificationIds.clear();
}

/**
 * Cold start: handle a refill tap that launched the app, then clear it. The OS keeps
 * returning the last response until cleared, so without this a JS reload re-opens it.
 * Dose reminder responses are left alone for the reminder flow.
 */
export function consumeLaunchRefillResponse(): void {
  const { request } = Notifications.getLastNotificationResponse()?.notification ?? {};
  if (!request) return;
  if (openRefillFromNotification(request.content.data, request.identifier)) {
    Notifications.clearLastNotificationResponse();
  }
}
