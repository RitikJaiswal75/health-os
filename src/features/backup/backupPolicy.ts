import {
  AUTO_BACKUP_INTERVAL_MS,
  BACKOFF_BASE_MS,
  DAY_MS,
  PHOTO_MAX_EDGE,
  STALE_BACKUP_MS,
} from './constants';
import type { BackupState } from './types';

export const DEFAULT_BACKUP_STATE: BackupState = {
  enabled: false,
  lastSuccessAt: null,
  lastAttemptAt: null,
  failures: 0,
  needsSignIn: false,
  email: null,
  restoreDecided: false,
  optInDismissed: false,
  staleSnoozedUntil: null,
  enabledAt: null,
};

export type AutoSkipReason = 'disabled' | 'needs-sign-in' | 'throttled' | 'backoff';

/** Why a background run should not start now, or null when it may. */
export function autoBackupSkipReason(state: BackupState, now: number): AutoSkipReason | null {
  if (!state.enabled) return 'disabled';
  if (state.needsSignIn) return 'needs-sign-in';
  if (state.lastSuccessAt !== null && now - state.lastSuccessAt < AUTO_BACKUP_INTERVAL_MS) {
    return 'throttled';
  }
  if (state.failures > 0 && state.lastAttemptAt !== null) {
    const wait = Math.min(BACKOFF_BASE_MS * 2 ** (state.failures - 1), DAY_MS);
    if (now - state.lastAttemptAt < wait) return 'backoff';
  }
  return null;
}

/** True when an opted-in user has gone more than 7 days without a successful backup. */
export function isBackupStale(state: BackupState, now: number): boolean {
  if (!state.enabled) return false;
  if (state.staleSnoozedUntil !== null && now < state.staleSnoozedUntil) return false;
  const since = state.lastSuccessAt ?? state.enabledAt;
  return since !== null && now - since > STALE_BACKUP_MS;
}

/** Target size keeping the aspect ratio, or null when the image already fits. */
export function scaledSize(
  width: number,
  height: number,
  maxEdge = PHOTO_MAX_EDGE,
): { width: number; height: number } | null {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return null;
  const ratio = maxEdge / longest;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}
