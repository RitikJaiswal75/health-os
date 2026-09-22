import { routeCrashEvent } from '../../src/core/observability/router';
import type {
  CrashEvent,
  CrashReporterAdapter,
  ObservabilityConfig,
} from '../../src/core/observability/types';

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

const baseConfig: ObservabilityConfig = {
  version: 1,
  enabled: true,
  primary: 'sentry',
  fallback: 'crashlytics',
  captureNonFatal: true,
  sampleRate: 1,
  sentryDsn: 'https://abc@o1.ingest.sentry.io/2',
};

function adapter(id: 'sentry' | 'crashlytics', capture: jest.Mock): CrashReporterAdapter {
  return { id, init: jest.fn(), capture };
}

describe('routeCrashEvent', () => {
  it('sends to the primary provider when it succeeds', async () => {
    const sentry = adapter('sentry', jest.fn(async () => true));
    const crash = adapter('crashlytics', jest.fn(async () => true));
    const outbox = { enqueue: jest.fn() };

    await expect(
      routeCrashEvent(event, baseConfig, { sentry, crashlytics: crash }, outbox),
    ).resolves.toBe('primary');

    expect(sentry.capture).toHaveBeenCalledTimes(1);
    expect(crash.capture).not.toHaveBeenCalled();
    expect(outbox.enqueue).not.toHaveBeenCalled();
  });

  it('fails over to Crashlytics when Sentry is unreachable', async () => {
    const sentry = adapter('sentry', jest.fn(async () => false));
    const crash = adapter('crashlytics', jest.fn(async () => true));
    const outbox = { enqueue: jest.fn() };

    await expect(
      routeCrashEvent(event, baseConfig, { sentry, crashlytics: crash }, outbox),
    ).resolves.toBe('fallback');

    expect(crash.capture).toHaveBeenCalledTimes(1);
    expect(outbox.enqueue).not.toHaveBeenCalled();
  });

  it('enqueues to the outbox when both providers fail', async () => {
    const sentry = adapter('sentry', jest.fn(async () => false));
    const crash = adapter('crashlytics', jest.fn(async () => false));
    const outbox = { enqueue: jest.fn() };

    await expect(
      routeCrashEvent(event, baseConfig, { sentry, crashlytics: crash }, outbox),
    ).resolves.toBe('outbox');

    expect(outbox.enqueue).toHaveBeenCalledWith(event);
  });

  it('drops non-fatal events when captureNonFatal is false', async () => {
    const sentry = adapter('sentry', jest.fn(async () => true));
    const outbox = { enqueue: jest.fn() };

    await expect(
      routeCrashEvent(
        event,
        { ...baseConfig, captureNonFatal: false },
        { sentry },
        outbox,
      ),
    ).resolves.toBe('dropped');

    expect(sentry.capture).not.toHaveBeenCalled();
  });

  it('still captures fatals when captureNonFatal is false', async () => {
    const sentry = adapter('sentry', jest.fn(async () => true));
    const outbox = { enqueue: jest.fn() };

    await expect(
      routeCrashEvent(
        { ...event, level: 'fatal' },
        { ...baseConfig, captureNonFatal: false },
        { sentry },
        outbox,
      ),
    ).resolves.toBe('primary');
  });

  it('drops events when observability is disabled', async () => {
    const sentry = adapter('sentry', jest.fn(async () => true));
    const outbox = { enqueue: jest.fn() };

    await expect(
      routeCrashEvent(event, { ...baseConfig, enabled: false }, { sentry }, outbox),
    ).resolves.toBe('dropped');
  });

  it('respects sampleRate using the injected rng', async () => {
    const sentry = adapter('sentry', jest.fn(async () => true));
    const outbox = { enqueue: jest.fn() };
    const config = { ...baseConfig, sampleRate: 0.2 };

    await expect(routeCrashEvent(event, config, { sentry }, outbox, () => 0.5)).resolves.toBe(
      'dropped',
    );
    await expect(routeCrashEvent(event, config, { sentry }, outbox, () => 0.1)).resolves.toBe(
      'primary',
    );
  });
});
