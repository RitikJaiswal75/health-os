import * as Sentry from '@sentry/react-native';
import { parseSentryDsn } from '../../src/core/observability/adapters/sentryEnvelope';
import { createSentryAdapter } from '../../src/core/observability/adapters/sentryAdapter';
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
  primary: 'sentry',
  fallback: 'crashlytics',
  captureNonFatal: true,
  sampleRate: 1,
  sentryDsn: 'https://abc123@o456.ingest.sentry.io/789',
};

describe('sentryAdapter capture', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('locks down PII options and strips context on beforeSend', () => {
    const adapter = createSentryAdapter();
    adapter.init(config);
    expect(Sentry.init).toHaveBeenCalled();
    const options = (Sentry.init as jest.Mock).mock.calls[0][0] as {
      sendDefaultPii: boolean;
      enableNdk: boolean;
      beforeBreadcrumb: () => null;
      integrations: (defaults: { name: string }[]) => { name: string }[];
      beforeSend: (event: Record<string, unknown>) => Record<string, unknown>;
    };
    expect(options.sendDefaultPii).toBe(false);
    expect(options.enableNdk).toBe(false);
    expect(options.beforeBreadcrumb()).toBeNull();
    expect(
      options.integrations([
        { name: 'HttpContext' },
        { name: 'DeviceContext' },
        { name: 'Breadcrumbs' },
        { name: 'SomethingElse' },
      ]),
    ).toEqual([{ name: 'SomethingElse' }]);
    const sent = options.beforeSend({
      user: { id: 'x' },
      server_name: 'phone',
      request: {},
      breadcrumbs: [{ message: 'tap' }],
      contexts: { device: { name: 'Pixel', device_unique_identifier: 'abc' } },
    });
    expect(sent.user).toBeUndefined();
    expect(sent.breadcrumbs).toEqual([]);
    expect((sent.contexts as { device: { name?: string } }).device.name).toBeUndefined();
  });

  it('skips capture when Sentry is not in the routing config', async () => {
    const adapter = createSentryAdapter();
    adapter.init({ ...config, primary: 'crashlytics', fallback: 'none', sentryDsn: '' });
    await expect(adapter.capture(event)).resolves.toBe(false);
  });

  it('returns true when ingest responds 200', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, status: 200 }) as unknown as Response);
    const adapter = createSentryAdapter();
    adapter.init(config);
    await expect(adapter.capture(event)).resolves.toBe(true);
    expect(global.fetch).toHaveBeenCalled();
    const parsed = parseSentryDsn(config.sentryDsn);
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(parsed?.ingestUrl);
  });

  it('returns false when ingest is unreachable', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('offline');
    });
    const adapter = createSentryAdapter();
    adapter.init(config);
    await expect(adapter.capture(event)).resolves.toBe(false);
  });
});
