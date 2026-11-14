import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { BACKUP_FORMAT_VERSION } from './constants';
import { DB_FILENAME, PHOTOS_FOLDER } from '../../core/storage/durableStorage';
import type { BackupMeta } from './types';

const META_NAME = 'meta.json';

export type ArchiveFiles = Record<string, Uint8Array>;

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** `photos` maps a file name to its bytes. JPEG is already compressed, so it is stored, not deflated. */
export function buildArchive(db: Uint8Array, photos: ArchiveFiles, now = Date.now()): Uint8Array {
  const meta: BackupMeta = { formatVersion: BACKUP_FORMAT_VERSION, createdAt: now };
  const entries: Record<string, [Uint8Array, { level: 0 | 6 }]> = {
    [DB_FILENAME]: [db, { level: 6 }],
    [META_NAME]: [strToU8(JSON.stringify(meta)), { level: 0 }],
  };
  for (const [name, bytes] of Object.entries(photos)) {
    entries[`${PHOTOS_FOLDER}/${name}`] = [bytes, { level: 0 }];
  }
  return zipSync(entries);
}

export function readArchive(zip: Uint8Array): { db: Uint8Array; photos: ArchiveFiles; meta: BackupMeta } {
  const files = unzipSync(zip);
  const db = files[DB_FILENAME];
  const metaBytes = files[META_NAME];
  if (!db || !metaBytes) throw new Error('Backup file is incomplete');
  const meta = JSON.parse(strFromU8(metaBytes)) as BackupMeta;
  if (meta.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new Error('This backup was made by a newer version of Health OS. Update the app first.');
  }
  const prefix = `${PHOTOS_FOLDER}/`;
  const photos: ArchiveFiles = {};
  for (const [path, bytes] of Object.entries(files)) {
    // Names come from the zip: keep only a plain file name so a crafted archive cannot escape the folder.
    if (path.startsWith(prefix) && !path.slice(prefix.length).includes('/') && bytes.length > 0) {
      photos[path.slice(prefix.length)] = bytes;
    }
  }
  return { db, photos, meta };
}
