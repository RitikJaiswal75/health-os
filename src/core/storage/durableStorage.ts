import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

export const HEALTH_OS_FOLDER = 'HealthOS';
export const DB_FILENAME = 'health-os.db';
export const PHOTOS_FOLDER = 'photos';

/** Resolves the durable HealthOS storage directory (not cache). */
export async function resolveHealthOsDirectory(): Promise<string> {
  if (Platform.OS === 'android') {
    const publicPath = `/storage/emulated/0/Documents/${HEALTH_OS_FOLDER}/`;
    const info = await FileSystem.getInfoAsync(publicPath);
    if (info.exists) {
      return publicPath;
    }
    try {
      await FileSystem.makeDirectoryAsync(publicPath, { intermediates: true });
      return publicPath;
    } catch {
      // Fall through to app documents if public path unavailable (emulator/dev)
    }
  }

  const fallback = `${FileSystem.documentDirectory}${HEALTH_OS_FOLDER}/`;
  const fallbackInfo = await FileSystem.getInfoAsync(fallback);
  if (!fallbackInfo.exists) {
    await FileSystem.makeDirectoryAsync(fallback, { intermediates: true });
  }
  return fallback;
}

export async function resolveDatabasePath(): Promise<string> {
  const dir = await resolveHealthOsDirectory();
  return `${dir}${DB_FILENAME}`;
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

/** Reopen existing DB after clear-data by checking durable path first. */
export async function discoverExistingDatabase(): Promise<string | null> {
  const dbPath = await resolveDatabasePath();
  const info = await FileSystem.getInfoAsync(dbPath);
  return info.exists ? dbPath : null;
}
