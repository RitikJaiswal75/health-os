import * as FileSystem from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { PHOTO_JPEG_QUALITY } from './constants';
import { scaledSize } from './backupPolicy';

/**
 * Returns a file URI to put in the backup: a downscaled copy in the cache, or the original when it
 * is small or scaling fails (one bad photo must not fail the backup). Photos are never edited after
 * they are saved, so a cached copy is reused by name.
 */
export async function scaledPhotoUri(originalUri: string, cacheDir: string, name: string): Promise<string> {
  const cached = `${cacheDir}${name}`;
  try {
    if ((await FileSystem.getInfoAsync(cached)).exists) return cached;
    const image = await ImageManipulator.manipulate(originalUri).renderAsync();
    const size = scaledSize(image.width, image.height);
    if (!size) return originalUri;
    const resized = await ImageManipulator.manipulate(image).resize(size).renderAsync();
    const saved = await resized.saveAsync({ format: SaveFormat.JPEG, compress: PHOTO_JPEG_QUALITY });
    await FileSystem.copyAsync({ from: saved.uri, to: cached });
    return cached;
  } catch {
    return originalUri;
  }
}
