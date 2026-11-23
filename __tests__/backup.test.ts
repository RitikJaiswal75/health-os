import { zipSync, strToU8 } from 'fflate';
import { base64ToBytes, buildArchive, bytesToBase64, readArchive } from '@/src/features/backup/backupArchive';
import {
  autoBackupSkipReason,
  DEFAULT_BACKUP_STATE,
  isBackupStale,
  scaledSize,
} from '@/src/features/backup/backupPolicy';
import { DAY_MS, STALE_BACKUP_MS } from '@/src/features/backup/constants';
import type { BackupState } from '@/src/features/backup/types';

const NOW = 1_800_000_000_000;
const on = (patch: Partial<BackupState> = {}): BackupState => ({ ...DEFAULT_BACKUP_STATE, enabled: true, ...patch });

describe('autoBackupSkipReason', () => {
  it('stays off until the user opts in', () => {
    expect(autoBackupSkipReason(DEFAULT_BACKUP_STATE, NOW)).toBe('disabled');
  });
  it('waits for a new sign-in after an auth failure', () => {
    expect(autoBackupSkipReason(on({ needsSignIn: true }), NOW)).toBe('needs-sign-in');
  });
  it('throttles to once a day', () => {
    expect(autoBackupSkipReason(on({ lastSuccessAt: NOW - DAY_MS + 1000 }), NOW)).toBe('throttled');
    expect(autoBackupSkipReason(on({ lastSuccessAt: NOW - DAY_MS - 1000 }), NOW)).toBeNull();
  });
  it('backs off after failures, with growing waits', () => {
    const minutes = (n: number) => NOW - n * 60_000;
    expect(autoBackupSkipReason(on({ failures: 1, lastAttemptAt: minutes(10) }), NOW)).toBe('backoff');
    expect(autoBackupSkipReason(on({ failures: 1, lastAttemptAt: minutes(16) }), NOW)).toBeNull();
    expect(autoBackupSkipReason(on({ failures: 3, lastAttemptAt: minutes(30) }), NOW)).toBe('backoff');
    expect(autoBackupSkipReason(on({ failures: 3, lastAttemptAt: minutes(61) }), NOW)).toBeNull();
  });
});

describe('isBackupStale', () => {
  it('never nags someone who did not opt in', () => {
    expect(isBackupStale(DEFAULT_BACKUP_STATE, NOW)).toBe(false);
  });
  it('is stale after 7 days since the last success', () => {
    expect(isBackupStale(on({ lastSuccessAt: NOW - STALE_BACKUP_MS + 1000 }), NOW)).toBe(false);
    expect(isBackupStale(on({ lastSuccessAt: NOW - STALE_BACKUP_MS - 1000 }), NOW)).toBe(true);
  });
  it('counts from opt-in when no backup ever succeeded', () => {
    expect(isBackupStale(on({ enabledAt: NOW - STALE_BACKUP_MS - 1000 }), NOW)).toBe(true);
  });
  it('honours the snooze', () => {
    const state = on({ lastSuccessAt: NOW - 8 * DAY_MS, staleSnoozedUntil: NOW + 1000 });
    expect(isBackupStale(state, NOW)).toBe(false);
  });
});

describe('scaledSize', () => {
  it('leaves small images alone', () => {
    expect(scaledSize(800, 600)).toBeNull();
    expect(scaledSize(1024, 1024)).toBeNull();
  });
  it('caps the longest edge and keeps the ratio', () => {
    expect(scaledSize(4000, 3000)).toEqual({ width: 1024, height: 768 });
    expect(scaledSize(3000, 4000)).toEqual({ width: 768, height: 1024 });
  });
});

describe('backup archive', () => {
  it('round-trips the database and photos', () => {
    const db = new Uint8Array([1, 2, 3, 4]);
    const zip = buildArchive(db, { 'a.jpg': new Uint8Array([9, 9]) }, NOW);
    const out = readArchive(zip);
    expect(Array.from(out.db)).toEqual([1, 2, 3, 4]);
    expect(Array.from(out.photos['a.jpg'])).toEqual([9, 9]);
    expect(out.meta.createdAt).toBe(NOW);
  });
  it('survives base64 for large buffers', () => {
    const bytes = new Uint8Array(100_000).map((_, i) => i % 251);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });
  it('refuses a newer format', () => {
    const zip = zipSync({
      'health-os.db': strToU8('x'),
      'meta.json': strToU8(JSON.stringify({ formatVersion: 99, createdAt: 1 })),
    });
    expect(() => readArchive(zip)).toThrow(/newer version/);
  });
  it('refuses an incomplete archive', () => {
    expect(() => readArchive(zipSync({ 'health-os.db': strToU8('x') }))).toThrow(/incomplete/);
  });
  it('ignores photo paths that could escape the folder', () => {
    const zip = zipSync({
      'health-os.db': strToU8('x'),
      'meta.json': strToU8(JSON.stringify({ formatVersion: 1, createdAt: 1 })),
      'photos/../evil.jpg': strToU8('bad'),
      'photos/sub/evil.jpg': strToU8('bad'),
      'photos/ok.jpg': strToU8('ok'),
    });
    expect(Object.keys(readArchive(zip).photos)).toEqual(['ok.jpg']);
  });
});
