import { base64ToBytes, readArchive } from '@/src/features/backup/backupArchive';

const mockFiles = new Map<string, string>();
const DB_URI = 'file:///docs/HealthOS/health-os.db';
const SNAPSHOT_URI = 'file:///cache/health-os-snapshot.db';
let mockMedicationCount = 1;

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  cacheDirectory: 'file:///cache/',
  EncodingType: { Base64: 'base64' },
  getInfoAsync: jest.fn(async (p: string) => ({
    exists: [...mockFiles.keys()].some((k) => k === p || k.startsWith(p)),
  })),
  makeDirectoryAsync: jest.fn(async () => undefined),
  readAsStringAsync: jest.fn(async (p: string) => mockFiles.get(p) ?? ''),
  writeAsStringAsync: jest.fn(async (p: string, data: string) => void mockFiles.set(p, data)),
  deleteAsync: jest.fn(async (p: string) => void mockFiles.delete(p)),
  readDirectoryAsync: jest.fn(async () => []),
}));
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: () => ({
    getFirstSync: () => ({ n: mockMedicationCount }),
    // Stands in for VACUUM INTO: the snapshot holds different bytes from the main file.
    execSync: () => void mockFiles.set('file:///cache/health-os-snapshot.db', 'AQID'),
    closeSync: jest.fn(),
  }),
}));
jest.mock('@/src/features/backup/auth', () => ({
  BackupAuthError: class BackupAuthError extends Error {},
  getAccessToken: jest.fn(),
}));
jest.mock('@/src/features/backup/driveClient', () => ({ uploadBackup: jest.fn(), findBackupId: jest.fn() }));
jest.mock('@/src/features/backup/photoScaler', () => ({ scaledPhotoUri: jest.fn() }));
jest.mock('@/src/core/observability/crashReporter', () => ({ reportError: jest.fn() }));

/* eslint-disable import/first */
import { BackupAuthError, getAccessToken } from '@/src/features/backup/auth';
import { hasOlderBackupToReplace, runBackup } from '@/src/features/backup/backupService';
import { readBackupState, resetBackupStateForTests, updateBackupState } from '@/src/features/backup/backupState';
import { findBackupId, uploadBackup } from '@/src/features/backup/driveClient';
import { reportError } from '@/src/core/observability/crashReporter';
/* eslint-enable import/first */

const upload = uploadBackup as jest.Mock;
const token = getAccessToken as jest.Mock;
const findId = findBackupId as jest.Mock;

describe('runBackup', () => {
  beforeEach(async () => {
    mockFiles.clear();
    mockMedicationCount = 1;
    resetBackupStateForTests();
    jest.clearAllMocks();
    mockFiles.set(DB_URI, 'BAUG'); // main file bytes, deliberately unlike the snapshot
    token.mockResolvedValue('token');
    await updateBackupState({ enabled: true, failures: 2 });
  });

  it('does nothing until the user opted in', async () => {
    await updateBackupState({ enabled: false });
    await expect(runBackup('auto')).resolves.toEqual({ status: 'skipped', reason: 'disabled' });
    expect(upload).not.toHaveBeenCalled();
  });

  it('never uploads an empty database over a good backup', async () => {
    mockMedicationCount = 0;
    await expect(runBackup('manual')).resolves.toEqual({ status: 'skipped', reason: 'empty' });
    expect(upload).not.toHaveBeenCalled();
  });

  it('uploads the snapshot, not the raw main file, and resets the failure count', async () => {
    let uploaded: Uint8Array | null = null;
    upload.mockImplementation(async (_token: string, zipUri: string) => {
      uploaded = readArchive(base64ToBytes(mockFiles.get(zipUri) as string)).db;
    });

    await expect(runBackup('manual')).resolves.toEqual({ status: 'success' });

    expect(Array.from(uploaded as unknown as Uint8Array)).toEqual([1, 2, 3]); // 'AQID', not 'BAUG'
    const state = await readBackupState();
    expect(state.failures).toBe(0);
    expect(state.lastSuccessAt).not.toBeNull();
    expect(mockFiles.has(SNAPSHOT_URI)).toBe(false); // temp files are cleaned up
  });

  it('records an auth failure quietly: needsSignIn is set and the failure is counted', async () => {
    token.mockRejectedValue(new BackupAuthError('expired'));
    await expect(runBackup('auto')).resolves.toMatchObject({ status: 'failed' });
    expect(await readBackupState()).toMatchObject({ needsSignIn: true, failures: 3 });
    expect(upload).not.toHaveBeenCalled();
  });

  it('does not mark a plain network failure as needing sign-in', async () => {
    upload.mockRejectedValue(new Error('network down'));
    await runBackup('manual');
    expect(await readBackupState()).toMatchObject({ needsSignIn: false, failures: 3 });
  });

  it('reports a failure streak once, when it reaches the limit, not on every later failure', async () => {
    upload.mockRejectedValue(new Error('upload broke'));
    await runBackup('manual'); // failure 3: the limit
    await runBackup('manual'); // failure 4
    await runBackup('manual'); // failure 5
    expect(reportError).toHaveBeenCalledTimes(1);
  });

  it('never reports being offline', async () => {
    upload.mockRejectedValue(new TypeError('Network request failed'));
    await runBackup('manual');
    expect(reportError).not.toHaveBeenCalled();
  });
});

describe('hasOlderBackupToReplace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    token.mockResolvedValue('token');
  });

  it('asks when no backup was ever made from this phone and Drive already has one', async () => {
    findId.mockResolvedValue('drive-file-id');
    await expect(hasOlderBackupToReplace(null)).resolves.toBe(true);
  });

  it('does not ask when Drive has no backup', async () => {
    findId.mockResolvedValue(null);
    await expect(hasOlderBackupToReplace(null)).resolves.toBe(false);
  });

  it('does not ask, or even look, once this phone has backed up before', async () => {
    findId.mockResolvedValue('drive-file-id');
    await expect(hasOlderBackupToReplace(Date.now())).resolves.toBe(false);
    expect(findId).not.toHaveBeenCalled();
  });
});
