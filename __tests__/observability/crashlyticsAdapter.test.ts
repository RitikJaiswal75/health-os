import {
  getCrashlytics,
  recordError,
  setAttribute,
  setCrashlyticsCollectionEnabled,
} from '@react-native-firebase/crashlytics';
import { createCrashlyticsAdapter } from '../../src/core/observability/adapters/crashlyticsAdapter';
import { noopAdapter } from '../../src/core/observability/adapters/noopAdapter';
import type { CrashEvent, ObservabilityConfig } from '../../src/core/observability/types';

const event: CrashEvent = {
  installId: 'install-1',
  appVersion: '2.0.1',
  osVersion: '14',
  deviceModel: 'Pixel',
  routeName: '/(tabs)',
  errorCode: 'DOSE_MARK_FAILED',
  errorName: 'Error',
  stackFrames: ['at markDoseAsTaken'],
  message: null,
  level: 'error',
};

const config: ObservabilityConfig = {
  version: 1,
  enabled: true,
  primary: 'crashlytics',
  fallback: 'none',
  captureNonFatal: true,
  sampleRate: 1,
  sentryDsn: '',
};

describe('crashlyticsAdapter', () => {
  it('enables collection and records a scrubbed error', async () => {
    const adapter = createCrashlyticsAdapter();
    await adapter.init(config);
    await expect(adapter.capture(event)).resolves.toBe(true);
    expect(setCrashlyticsCollectionEnabled).toHaveBeenCalled();
    expect(getCrashlytics).toHaveBeenCalled();
    expect(setAttribute).toHaveBeenCalledWith(expect.anything(), 'error_code', 'DOSE_MARK_FAILED');
    expect(recordError).toHaveBeenCalled();
  });
});

describe('noopAdapter', () => {
  it('does not claim success', async () => {
    noopAdapter.init(config);
    await expect(noopAdapter.capture(event)).resolves.toBe(false);
  });
});
