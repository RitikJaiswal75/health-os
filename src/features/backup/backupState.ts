import * as FileSystem from 'expo-file-system/legacy';
import { BACKUP_STATE_FILENAME } from './constants';
import { DEFAULT_BACKUP_STATE } from './backupPolicy';
import { resolveHealthOsDirectory } from '../../core/storage/durableStorage';
import type { BackupState } from './types';

let cached: BackupState | null = null;

export function resetBackupStateForTests(): void {
  cached = null;
}

/** Never throws: a missing or corrupt file just means defaults, which keeps backup off. */
export async function readBackupState(): Promise<BackupState> {
  if (cached) return cached;
  try {
    const path = `${await resolveHealthOsDirectory()}${BACKUP_STATE_FILENAME}`;
    if ((await FileSystem.getInfoAsync(path)).exists) {
      const raw = JSON.parse(await FileSystem.readAsStringAsync(path)) as Partial<BackupState>;
      cached = { ...DEFAULT_BACKUP_STATE, ...raw };
      return cached;
    }
  } catch {
    // fall through to defaults
  }
  cached = { ...DEFAULT_BACKUP_STATE };
  return cached;
}

export async function updateBackupState(patch: Partial<BackupState>): Promise<BackupState> {
  const next = { ...(await readBackupState()), ...patch };
  cached = next;
  const path = `${await resolveHealthOsDirectory()}${BACKUP_STATE_FILENAME}`;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(next));
  return next;
}

/** The user's explicit opt-in, after a successful Google sign-in. */
export async function enableBackup(email: string): Promise<BackupState> {
  const { enabledAt } = await readBackupState();
  return updateBackupState({
    enabled: true, email, needsSignIn: false, failures: 0,
    enabledAt: enabledAt ?? Date.now(), restoreDecided: true,
  });
}
