import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
import { reportError } from '../../core/observability/crashReporter';
import { isNetworkError } from '../../core/observability/networkError';
import {
  DB_FILENAME,
  PHOTOS_FOLDER,
  resolveHealthOsDirectory,
} from '../../core/storage/durableStorage';
import { BackupAuthError, getAccessToken } from './auth';
import { buildArchive, bytesToBase64, base64ToBytes, type ArchiveFiles } from './backupArchive';
import { autoBackupSkipReason } from './backupPolicy';
import { readBackupState, updateBackupState } from './backupState';
import { BACKUP_FILE_NAME, REPORT_AFTER_FAILURES } from './constants';
import { findBackupId, uploadBackup } from './driveClient';
import { snapshotDatabase } from './databaseSnapshot';
import { scaledPhotoUri } from './photoScaler';
import type { BackupOutcome } from './types';

const BASE64 = { encoding: FileSystem.EncodingType.Base64 };
let inFlight: Promise<BackupOutcome> | null = null;

/**
 * `auto` is for background runs: throttled, backed off after failures, never loud.
 * `manual` is the user's button: always tries (when opted in) and reports the failure message.
 */
export function runBackup(mode: 'auto' | 'manual'): Promise<BackupOutcome> {
  inFlight ??= doBackup(mode).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/**
 * True before a first-ever backup when Drive already holds one: the upload would replace it, so the
 * user must agree first. Needs a signed-in session.
 */
export async function hasOlderBackupToReplace(lastSuccessAt: number | null): Promise<boolean> {
  return lastSuccessAt === null && (await findBackupId(await getAccessToken())) !== null;
}

async function readBytes(uri: string): Promise<Uint8Array> {
  return base64ToBytes(await FileSystem.readAsStringAsync(uri, BASE64));
}

async function doBackup(mode: 'auto' | 'manual'): Promise<BackupOutcome> {
  const state = await readBackupState();
  const skip = mode === 'auto' ? autoBackupSkipReason(state, Date.now()) : state.enabled ? null : 'disabled';
  if (skip) return { status: 'skipped', reason: skip };

  const dir = await resolveHealthOsDirectory();
  const zipUri = `${FileSystem.cacheDirectory}${BACKUP_FILE_NAME}`;
  const snapshotUri = `${FileSystem.cacheDirectory}health-os-snapshot.db`;
  try {
    // Never replace a good backup with an empty database.
    if (!(await FileSystem.getInfoAsync(`${dir}${DB_FILENAME}`)).exists) {
      return { status: 'skipped', reason: 'empty' };
    }
    await FileSystem.deleteAsync(snapshotUri, { idempotent: true }); // VACUUM INTO refuses an existing file
    // Own connection, so the app's open database is untouched.
    const conn = SQLite.openDatabaseSync(DB_FILENAME, {}, dir);
    let count: number;
    try {
      count = snapshotDatabase(conn, snapshotUri.replace(/^file:\/\//, ''));
    } finally {
      conn.closeSync();
    }
    if (count === 0) return { status: 'skipped', reason: 'empty' };
    const token = await getAccessToken();

    const photos: ArchiveFiles = {};
    const photosDir = `${dir}${PHOTOS_FOLDER}/`;
    if ((await FileSystem.getInfoAsync(photosDir)).exists) {
      const cacheDir = `${FileSystem.cacheDirectory}backup-photos/`;
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true }).catch(() => undefined);
      // One at a time: resizing several full-size photos together can run out of memory.
      for (const name of await FileSystem.readDirectoryAsync(photosDir)) {
        photos[name] = await readBytes(await scaledPhotoUri(`${photosDir}${name}`, cacheDir, name));
      }
    }

    const zip = buildArchive(await readBytes(snapshotUri), photos);
    await FileSystem.writeAsStringAsync(zipUri, bytesToBase64(zip), BASE64);
    await uploadBackup(token, zipUri);

    await updateBackupState({ lastSuccessAt: Date.now(), lastAttemptAt: Date.now(), failures: 0, needsSignIn: false });
    return { status: 'success' };
  } catch (error) {
    const failures = state.failures + 1;
    await updateBackupState({
      lastAttemptAt: Date.now(),
      failures,
      needsSignIn: state.needsSignIn || error instanceof BackupAuthError,
    }).catch(() => undefined);
    // Being offline is expected, and a long streak is one problem, not many: report once, when it reaches the limit.
    if (failures === REPORT_AFTER_FAILURES && !isNetworkError(error)) {
      void reportError('BACKUP_FAILED', error);
    }
    return { status: 'failed', message: error instanceof Error ? error.message : 'Backup failed' };
  } finally {
    await FileSystem.deleteAsync(zipUri, { idempotent: true }).catch(() => undefined);
    await FileSystem.deleteAsync(snapshotUri, { idempotent: true }).catch(() => undefined);
  }
}
