import * as FileSystem from 'expo-file-system/legacy';
import {
  DB_FILENAME,
  hasLocalData,
  PHOTOS_FOLDER,
  resolveHealthOsDirectory,
} from '../../core/storage/durableStorage';
import { getAccessToken, signInInteractive } from './auth';
import { base64ToBytes, bytesToBase64, readArchive } from './backupArchive';
import { readBackupState, updateBackupState } from './backupState';
import { BACKUP_FILE_NAME } from './constants';
import { downloadBackup } from './driveClient';
import type { RestoreOutcome } from './types';

const BASE64 = { encoding: FileSystem.EncodingType.Base64 };

/** True only on a fresh install that has not yet chosen between restoring and starting fresh. */
export async function needsRestoreChoice(): Promise<boolean> {
  if ((await readBackupState()).restoreDecided) return false;
  return !(await hasLocalData(await resolveHealthOsDirectory()));
}

/**
 * Must run before the database is opened (the restore gate guarantees that): it writes the files the
 * database bootstrap then finds. Photos go first and the database last, since its presence marks the
 * restore as complete.
 */
export async function restoreFromDrive(): Promise<RestoreOutcome> {
  const zipUri = `${FileSystem.cacheDirectory}restore-${BACKUP_FILE_NAME}`;
  try {
    // Last line of defence: a restore renames over the database, so never run it where data exists.
    if (await hasLocalData(await resolveHealthOsDirectory())) {
      return { status: 'failed', message: 'This phone already has Health OS data' };
    }
    const account = await signInInteractive();
    if (!account) return { status: 'failed', message: 'Sign-in was cancelled' };
    if (!(await downloadBackup(await getAccessToken(), zipUri))) return { status: 'none' };

    const { db, photos } = readArchive(base64ToBytes(await FileSystem.readAsStringAsync(zipUri, BASE64)));
    const dir = await resolveHealthOsDirectory();
    const photosDir = `${dir}${PHOTOS_FOLDER}/`;
    await FileSystem.makeDirectoryAsync(photosDir, { intermediates: true });
    for (const [name, bytes] of Object.entries(photos)) {
      await FileSystem.writeAsStringAsync(`${photosDir}${name}`, bytesToBase64(bytes), BASE64);
    }
    for (const stale of [`${DB_FILENAME}-wal`, `${DB_FILENAME}-shm`]) {
      await FileSystem.deleteAsync(`${dir}${stale}`, { idempotent: true });
    }
    // Write beside it, then rename: a kill mid-write must never leave a half database under the real name.
    const partial = `${dir}${DB_FILENAME}.restoring`;
    await FileSystem.writeAsStringAsync(partial, bytesToBase64(db), BASE64);
    await FileSystem.moveAsync({ from: partial, to: `${dir}${DB_FILENAME}` });

    const now = Date.now();
    await updateBackupState({
      enabled: true, email: account.email, restoreDecided: true,
      lastSuccessAt: now, lastAttemptAt: now, enabledAt: now, failures: 0, needsSignIn: false,
    });
    return { status: 'restored' };
  } catch (error) {
    return { status: 'failed', message: error instanceof Error ? error.message : 'Restore failed' };
  } finally {
    await FileSystem.deleteAsync(zipUri, { idempotent: true }).catch(() => undefined);
  }
}
