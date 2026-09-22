import { isErrorCode } from '../../src/core/observability/errorCodes';
import { scrubCrashEvent } from '../../src/core/observability/scrubber';
import type { CrashEvent } from '../../src/core/observability/types';

const context = {
  installId: 'install-1',
  appVersion: '2.0.1',
  osVersion: '14',
  deviceModel: 'Samsung SM-S911B',
  routeName: '/medicine/:id',
};

function allowedKeys(event: CrashEvent): string[] {
  return Object.keys(event).sort();
}

describe('scrubCrashEvent', () => {
  it('builds an allowlisted event and drops error.message by default', () => {
    const error = new Error('Failed to mark Dolo 650 as taken');
    error.name = 'InventoryError';
    error.stack = 'InventoryError: Failed to mark Dolo 650 as taken\n    at markDoseAsTaken (doseTakenService.ts:46:11)';

    const event = scrubCrashEvent({
      error,
      errorCode: 'DOSE_MARK_FAILED',
      context,
      level: 'error',
    });

    expect(event.message).toBeNull();
    expect(event.errorCode).toBe('DOSE_MARK_FAILED');
    expect(event.errorName).toBe('InventoryError');
    expect(event.installId).toBe('install-1');
    expect(event.appVersion).toBe('2.0.1');
    expect(event.osVersion).toBe('14');
    expect(event.deviceModel).toBe('Samsung SM-S911B');
    expect(event.routeName).toBe('/medicine/:id');
    expect(event.level).toBe('error');
    expect(event.stackFrames.some((frame) => frame.includes('markDoseAsTaken'))).toBe(true);
    expect(JSON.stringify(event)).not.toContain('Dolo 650');
    expect(allowedKeys(event)).toEqual([
      'appVersion',
      'deviceModel',
      'errorCode',
      'errorName',
      'installId',
      'level',
      'message',
      'osVersion',
      'routeName',
      'stackFrames',
    ]);
  });

  it('includes message only when safeMessage is opted in', () => {
    const event = scrubCrashEvent({
      error: new Error('Database is locked'),
      errorCode: 'DB_BOOTSTRAP_FAILED',
      context,
      level: 'fatal',
      options: { safeMessage: true },
    });

    expect(event.message).toBe('Database is locked');
    expect(event.level).toBe('fatal');
  });

  it('strips filesystem paths from stack frames', () => {
    const error = new Error('boom');
    error.stack =
      'Error: boom\n    at openDb (/storage/emulated/0/Documents/HealthOS/health-os.db:1:1)';

    const event = scrubCrashEvent({
      error,
      errorCode: 'DB_BOOTSTRAP_FAILED',
      context,
      level: 'error',
    });

    expect(event.stackFrames.join('\n')).not.toContain('/storage/emulated/0');
    expect(event.stackFrames.join('\n')).not.toContain('HealthOS');
  });

  it('redacts uuids in route names', () => {
    const event = scrubCrashEvent({
      error: new Error('x'),
      errorCode: 'ERROR_BOUNDARY',
      context: {
        ...context,
        routeName: '/medicine/3f1c0a2e-9b44-4d1a-8c77-1ab2cd34ef56',
      },
      level: 'fatal',
    });

    expect(event.routeName).toBe('/medicine/:id');
  });

  it('does not treat unknown codes as valid error codes', () => {
    expect(isErrorCode('DOSE_MARK_FAILED')).toBe(true);
    expect(isErrorCode('USER_TYPED_A_MED_NAME')).toBe(false);
  });
});
