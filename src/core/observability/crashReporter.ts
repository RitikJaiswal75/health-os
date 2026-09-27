import { BUNDLED_DEFAULT_CONFIG } from './configSchema';
import { readCachedObservabilityConfig } from './configStore';
import { createCrashlyticsAdapter } from './adapters/crashlyticsAdapter';
import { createSentryAdapter } from './adapters/sentryAdapter';
import type { ErrorCode } from './errorCodes';
import { getCrashOutbox } from './outbox';
import { routeCrashEvent } from './router';
import { collectCrashContext, scrubCrashEvent, type ScrubOptions } from './scrubber';
import type {
  CrashLevel,
  CrashReporterAdapter,
  ObservabilityConfig,
  ProviderId,
} from './types';

type AdapterMap = Partial<Record<Exclude<ProviderId, 'none'>, CrashReporterAdapter>>;

let currentConfig: ObservabilityConfig = BUNDLED_DEFAULT_CONFIG;
let adapters: AdapterMap = {};
let initialized = false;

function usesSentry(config: ObservabilityConfig): boolean {
  return (
    Boolean(config.sentryDsn) && (config.primary === 'sentry' || config.fallback === 'sentry')
  );
}

export function getActiveObservabilityConfig(): ObservabilityConfig {
  return currentConfig;
}

export function setAdaptersForTests(next: AdapterMap): void {
  adapters = next;
  initialized = true;
}

export function resetCrashReporterForTests(): void {
  adapters = {};
  initialized = false;
  currentConfig = BUNDLED_DEFAULT_CONFIG;
}

export function initCrashReporting(config?: ObservabilityConfig): void {
  currentConfig = config ?? readCachedObservabilityConfig() ?? BUNDLED_DEFAULT_CONFIG;
  adapters = {};

  if (!currentConfig.enabled) {
    initialized = true;
    return;
  }

  if (usesSentry(currentConfig)) {
    const sentry = createSentryAdapter();
    adapters.sentry = sentry;
    void sentry.init(currentConfig);
  }

  const crashlytics = createCrashlyticsAdapter();
  adapters.crashlytics = crashlytics;
  void crashlytics.init(currentConfig);
  initialized = true;
}

export function applyRemoteObservabilityConfig(config: ObservabilityConfig): void {
  currentConfig = config;
  if (!config.enabled) {
    initialized = true;
    return;
  }
  if (usesSentry(config)) {
    const sentry = adapters.sentry ?? createSentryAdapter();
    adapters = { ...adapters, sentry };
    void sentry.init(config);
  }
  const crashlytics = adapters.crashlytics ?? createCrashlyticsAdapter();
  adapters = { ...adapters, crashlytics };
  void crashlytics.init(config);
  initialized = true;
}

async function report(
  level: CrashLevel,
  errorCode: ErrorCode,
  error: unknown,
  options?: ScrubOptions,
): Promise<void> {
  try {
    if (!initialized) initCrashReporting();
    const event = scrubCrashEvent({
      error,
      errorCode,
      context: collectCrashContext(),
      level,
      options,
    });
    await routeCrashEvent(event, currentConfig, adapters, getCrashOutbox());
  } catch {
    // Reporting must never throw into product code.
  }
}

export function reportError(
  errorCode: ErrorCode,
  error?: unknown,
  options?: ScrubOptions,
): Promise<void> {
  return report('error', errorCode, error, options);
}

export function reportFatal(
  errorCode: ErrorCode,
  error?: unknown,
  options?: ScrubOptions,
): Promise<void> {
  return report('fatal', errorCode, error, options);
}

export async function flushCrashOutbox(): Promise<void> {
  if (!initialized) initCrashReporting();
  const outbox = getCrashOutbox();
  const pending = outbox.list(20);
  for (const row of pending) {
    const result = await routeCrashEvent(row.event, currentConfig, adapters, {
      enqueue: () => undefined,
    });
    if (result === 'primary' || result === 'both') {
      outbox.remove(row.id);
    } else {
      outbox.incrementAttempts(row.id);
    }
  }
}
