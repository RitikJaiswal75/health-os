import * as FileSystem from 'expo-file-system/legacy';
import { BACKUP_FILE_NAME, DRIVE_TIMEOUT_MS } from './constants';
import { BackupAuthError } from './auth';

const AUTH_REASONS = new Set(['authError', 'insufficientPermissions']);

/** Only a real authorization problem asks the user to sign in; a full Drive or a rate limit does not. */
export function driveError(status: number, body: string): Error {
  let reason = '';
  try {
    reason = (JSON.parse(body) as { error?: { errors?: { reason?: string }[] } }).error?.errors?.[0]?.reason ?? '';
  } catch {
    // not JSON: no reason
  }
  if (status === 401 || (status === 403 && AUTH_REASONS.has(reason))) return new BackupAuthError(`Drive ${status}`);
  if (reason === 'storageQuotaExceeded') return new Error('Your Google Drive is full');
  return new Error(`Drive request failed (${status}${reason ? `: ${reason}` : ''})`);
}

const API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

async function driveFetch(token: string, url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DRIVE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
    });
    if (!res.ok) throw driveError(res.status, await res.text());
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function findBackupId(token: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${BACKUP_FILE_NAME}'`);
  const res = await driveFetch(token, `${API}?spaces=appDataFolder&q=${q}&fields=files(id)`);
  const body = (await res.json()) as { files?: { id: string }[] };
  return body.files?.[0]?.id ?? null;
}

async function createEmptyBackup(token: string): Promise<string> {
  const res = await driveFetch(token, API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: BACKUP_FILE_NAME, parents: ['appDataFolder'] }),
  });
  return ((await res.json()) as { id: string }).id;
}

/** Replaces the content in place, so the previous backup stays until the new upload succeeds. */
export async function uploadBackup(token: string, localZipUri: string): Promise<void> {
  const id = (await findBackupId(token)) ?? (await createEmptyBackup(token));
  const res = await FileSystem.uploadAsync(`${UPLOAD}/${id}?uploadType=media`, localZipUri, {
    httpMethod: 'PATCH',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/zip' },
  });
  if (res.status < 200 || res.status >= 300) throw driveError(res.status, res.body);
}

/** Returns false when no backup exists. */
export async function downloadBackup(token: string, destUri: string): Promise<boolean> {
  const id = await findBackupId(token);
  if (!id) return false;
  const res = await FileSystem.downloadAsync(`${API}/${id}?alt=media`, destUri, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status !== 200) throw driveError(res.status, '');
  return true;
}
