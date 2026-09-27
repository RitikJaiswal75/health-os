import type { ObservabilityConfig, ProviderId } from './types';

const PROVIDERS = new Set<ProviderId>(['sentry', 'crashlytics', 'none']);

export const BUNDLED_DEFAULT_CONFIG: ObservabilityConfig = {
  version: 1,
  enabled: true,
  primary: 'crashlytics',
  fallback: 'none',
  captureNonFatal: true,
  sampleRate: 1,
  sentryDsn: '',
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asProvider(value: unknown): ProviderId | null {
  return typeof value === 'string' && PROVIDERS.has(value as ProviderId)
    ? (value as ProviderId)
    : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function asSampleRate(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < 0 || value > 1) return null;
  return value;
}

export function isValidSentryDsn(value: string): boolean {
  if (value === '') return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.username.length > 0 && url.pathname.length > 1;
  } catch {
    return false;
  }
}

export function parseObservabilityConfig(value: unknown): ObservabilityConfig | null {
  const record = asRecord(value);
  if (!record) return null;

  const version = record.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return null;
  }

  const enabled = asBoolean(record.enabled);
  const primary = asProvider(record.primary);
  const fallback = asProvider(record.fallback);
  const captureNonFatal = asBoolean(record.captureNonFatal);
  const sampleRate = asSampleRate(record.sampleRate);
  const sentryDsn = typeof record.sentryDsn === 'string' ? record.sentryDsn : null;

  if (
    enabled == null ||
    primary == null ||
    fallback == null ||
    captureNonFatal == null ||
    sampleRate == null ||
    sentryDsn == null ||
    !isValidSentryDsn(sentryDsn)
  ) {
    return null;
  }

  return {
    version,
    enabled,
    primary,
    fallback,
    captureNonFatal,
    sampleRate,
    sentryDsn,
  };
}
