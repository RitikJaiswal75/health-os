import { buildArchive, bytesToBase64 } from '@/src/features/backup/backupArchive';

const mockFiles = new Map<string, string>();
/** Every write and delete under the app folder, in order. */
const mockOps: string[] = [];
const DIR = 'file:///docs/HealthOS/';
/** Files in public Documents left by an earlier install: they exist, but this install cannot read them. */
let mockLegacyUnreadable = false;

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  cacheDirectory: 'file:///cache/',
  EncodingType: { Base64: 'base64' },
  // A file matches exactly; only a folder (trailing slash) matches by prefix.
  getInfoAsync: jest.fn(async (p: string) => ({
    exists: [...mockFiles.keys()].some((k) => k === p || (p.endsWith('/') && k.startsWith(p))),
  })),
  makeDirectoryAsync: jest.fn(async () => undefined),
  readAsStringAsync: jest.fn(async (p: string) => {
    if (mockLegacyUnreadable && p.startsWith('/storage/')) throw new Error('EACCES (Permission denied)');
    if (!mockFiles.has(p)) throw new Error('ENOENT');
    return mockFiles.get(p) as string;
  }),
  writeAsStringAsync: jest.fn(async (p: string, data: string) => {
    mockOps.push(`write:${p}`);
    mockFiles.set(p, data);
  }),
  deleteAsync: jest.fn(async (p: string) => {
    mockOps.push(`delete:${p}`);
    mockFiles.delete(p);
  }),
  moveAsync: jest.fn(async ({ from, to }: { from: string; to: string }) => {
    mockOps.push(`move:${from}->${to}`);
    mockFiles.set(to, mockFiles.get(from) as string);
    mockFiles.delete(from);
  }),
}));
jest.mock('@/src/features/backup/auth', () => ({
  signInInteractive: jest.fn(),
  getAccessToken: jest.fn(),
}));
jest.mock('@/src/features/backup/driveClient', () => ({ downloadBackup: jest.fn() }));

/* eslint-disable import/first */
import { getAccessToken, signInInteractive } from '@/src/features/backup/auth';
import { readBackupState, resetBackupStateForTests, updateBackupState } from '@/src/features/backup/backupState';
import { downloadBackup } from '@/src/features/backup/driveClient';
import { needsRestoreChoice, restoreFromDrive } from '@/src/features/backup/restoreService';
/* eslint-enable import/first */

// A failed assertion must not leave the flag on for the tests that follow.
afterEach(() => {
  mockLegacyUnreadable = false;
});

const signIn = signInInteractive as jest.Mock;
const download = downloadBackup as jest.Mock;

const indexOf = (op: string) => mockOps.indexOf(op);

describe('restoreFromDrive', () => {
  beforeEach(() => {
    mockFiles.clear();
    mockOps.length = 0;
    resetBackupStateForTests();
    jest.clearAllMocks();
    signIn.mockResolvedValue({ email: 'me@example.com' });
    (getAccessToken as jest.Mock).mockResolvedValue('token');
    // Leftovers a fresh database must not inherit.
    mockFiles.set(`${DIR}health-os.db-wal`, 'stale');
    mockFiles.set(`${DIR}health-os.db-shm`, 'stale');
  });

  function drive(zip: Uint8Array) {
    download.mockImplementation(async (_token: string, dest: string) => {
      mockFiles.set(dest, bytesToBase64(zip));
      return true;
    });
  }

  it('writes photos first, removes stale WAL files, and puts the database in place last with a rename', async () => {
    drive(buildArchive(new Uint8Array([1, 2, 3]), { 'a.jpg': new Uint8Array([9]) }));

    await expect(restoreFromDrive()).resolves.toEqual({ status: 'restored' });

    const photo = indexOf(`write:${DIR}photos/a.jpg`);
    const partial = indexOf(`write:${DIR}health-os.db.restoring`);
    const move = indexOf(`move:${DIR}health-os.db.restoring->${DIR}health-os.db`);
    expect(photo).toBeGreaterThanOrEqual(0);
    expect(photo).toBeLessThan(partial);
    expect(partial).toBeLessThan(move); // the real name appears only through the rename, so it is never half written
    expect(indexOf(`delete:${DIR}health-os.db-wal`)).toBeLessThan(move);
    expect(indexOf(`delete:${DIR}health-os.db-shm`)).toBeLessThan(move);
    expect(mockOps).not.toContain(`write:${DIR}health-os.db`);
    expect(mockFiles.has(`${DIR}health-os.db-wal`)).toBe(false);
    expect(mockFiles.has(`${DIR}health-os.db.restoring`)).toBe(false);
  });

  it('turns backup on for the restored account', async () => {
    drive(buildArchive(new Uint8Array([1]), {}));
    await restoreFromDrive();
    expect(await readBackupState()).toMatchObject({
      enabled: true,
      email: 'me@example.com',
      restoreDecided: true,
      failures: 0,
      needsSignIn: false,
    });
  });

  it('reports "none" and touches nothing when the account has no backup', async () => {
    download.mockResolvedValue(false);
    await expect(restoreFromDrive()).resolves.toEqual({ status: 'none' });
    expect(mockOps.some((op) => op.includes('health-os.db.restoring'))).toBe(false);
    expect(mockFiles.get(`${DIR}health-os.db-wal`)).toBe('stale');
  });

  it('stops when the user cancels the Google sign-in', async () => {
    signIn.mockResolvedValue(null);
    await expect(restoreFromDrive()).resolves.toMatchObject({ status: 'failed' });
    expect(download).not.toHaveBeenCalled();
  });

  it('fails, without writing a database, when the backup file is damaged', async () => {
    download.mockImplementation(async (_token: string, dest: string) => {
      mockFiles.set(dest, bytesToBase64(new Uint8Array([1, 2, 3])));
      return true;
    });
    await expect(restoreFromDrive()).resolves.toMatchObject({ status: 'failed' });
    expect(mockOps.some((op) => op.includes('health-os.db.restoring') || op.startsWith('move:'))).toBe(false);
  });
});

describe('needsRestoreChoice', () => {
  const LEGACY_DB = '/storage/emulated/0/Documents/HealthOS/health-os.db';

  beforeEach(() => {
    mockFiles.clear();
    mockLegacyUnreadable = false;
    resetBackupStateForTests();
  });

  it('is true only on a fresh install that has not chosen yet', async () => {
    await expect(needsRestoreChoice()).resolves.toBe(true);
  });

  it('is false when this install already has a database', async () => {
    mockFiles.set(`${DIR}health-os.db`, 'db');
    await expect(needsRestoreChoice()).resolves.toBe(false);
  });

  it('is false when an earlier release left data this install can read and adopt', async () => {
    mockFiles.set(LEGACY_DB, 'db');
    await expect(needsRestoreChoice()).resolves.toBe(false);
  });

  it('is true after a reinstall, when old public files exist but cannot be read', async () => {
    mockFiles.set(LEGACY_DB, 'db');
    mockLegacyUnreadable = true;
    await expect(needsRestoreChoice()).resolves.toBe(true);
  });

  it('is false once the user chose to start fresh', async () => {
    await updateBackupState({ restoreDecided: true });
    await expect(needsRestoreChoice()).resolves.toBe(false);
  });

  it('a leftover WAL file alone does not count as data', async () => {
    mockFiles.set(`${DIR}health-os.db-wal`, 'stale');
    await expect(needsRestoreChoice()).resolves.toBe(true);
  });
});

describe('restoreFromDrive on a phone that already has data', () => {
  it('still restores when only unreadable files from an earlier install are left', async () => {
    mockFiles.clear();
    mockOps.length = 0;
    resetBackupStateForTests();
    jest.clearAllMocks();
    mockFiles.set('/storage/emulated/0/Documents/HealthOS/health-os.db', 'old');
    mockLegacyUnreadable = true;
    signIn.mockResolvedValue({ email: 'me@example.com' });
    (getAccessToken as jest.Mock).mockResolvedValue('token');
    download.mockResolvedValue(false);

    await restoreFromDrive();

    expect(signIn).toHaveBeenCalled();
  });

  it('refuses, and touches neither Google nor the database', async () => {
    mockFiles.clear();
    mockOps.length = 0;
    resetBackupStateForTests();
    jest.clearAllMocks();
    mockFiles.set(`${DIR}health-os.db`, 'current-data');

    await expect(restoreFromDrive()).resolves.toMatchObject({ status: 'failed' });

    expect(signIn).not.toHaveBeenCalled();
    expect(download).not.toHaveBeenCalled();
    expect(mockOps.filter((op) => op.includes(DIR))).toEqual([]); // nothing in the app folder is written or deleted
    expect(mockFiles.get(`${DIR}health-os.db`)).toBe('current-data');
  });
});
