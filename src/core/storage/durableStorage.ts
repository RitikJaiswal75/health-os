import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

export const HEALTH_OS_FOLDER = 'HealthOS';
export const DB_FILENAME = 'health-os.db';
export const PHOTOS_FOLDER = 'photos';

/** Where releases up to 2.1.0 kept data on Android. */
const LEGACY_PUBLIC_DIR = `/storage/emulated/0/Documents/${HEALTH_OS_FOLDER}/`;
const DB_FILES = [`${DB_FILENAME}-wal`, `${DB_FILENAME}-shm`, DB_FILENAME];

/**
 * App-private HealthOS directory. Other apps can't read it, Android Auto Backup covers it, and a
 * reinstalled app can always open it (public Documents files belong to the install that made them).
 */
export async function resolveHealthOsDirectory(): Promise<string> {
  const dir = `${FileSystem.documentDirectory}${HEALTH_OS_FOLDER}/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

/**
 * Copies data from the old public folder into `privateDir` once, before the database is opened.
 * Returns the old folder when copied (so photo paths can be rewritten), else null. Files left by
 * an earlier install are unreadable: then this cleans up and the app starts with a fresh database.
 * shortcut: a failed copy is not retried, because the fresh database then exists; the old files stay
 * in Documents for a manual restore.
 */
export async function adoptLegacyPublicData(privateDir: string): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  if ((await FileSystem.getInfoAsync(`${privateDir}${DB_FILENAME}`)).exists) return null;
  if (!(await FileSystem.getInfoAsync(`${LEGACY_PUBLIC_DIR}${DB_FILENAME}`)).exists) return null;

  // Photos and WAL first, the database last: its presence marks the move as done.
  const toCopy = [PHOTOS_FOLDER, ...DB_FILES];
  try {
    for (const name of toCopy) {
      const from = `${LEGACY_PUBLIC_DIR}${name}`;
      if (!(await FileSystem.getInfoAsync(from)).exists) continue;
      await FileSystem.copyAsync({ from, to: `${privateDir}${name}` });
    }
    return LEGACY_PUBLIC_DIR;
  } catch {
    for (const name of toCopy) {
      await FileSystem.deleteAsync(`${privateDir}${name}`, { idempotent: true }).catch(() => undefined);
    }
    return null;
  }
}

export async function resolvePhotosDirectory(): Promise<string> {
  const dir = await resolveHealthOsDirectory();
  const photosDir = `${dir}${PHOTOS_FOLDER}/`;
  const info = await FileSystem.getInfoAsync(photosDir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(photosDir, { intermediates: true });
  }
  return photosDir;
}

export async function copyPhotoToDurableStorage(
  sourceUri: string,
  photoId: string,
): Promise<string> {
  const photosDir = await resolvePhotosDirectory();
  const dest = `${photosDir}${photoId}.jpg`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}
