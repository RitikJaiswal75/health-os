import {
  BUNDLED_DEFAULT_CONFIG,
  parseObservabilityConfig,
} from '../../src/core/observability/configSchema';

describe('parseObservabilityConfig', () => {
  const valid = {
    version: 1,
    enabled: true,
    primary: 'sentry',
    fallback: 'crashlytics',
    captureNonFatal: true,
    sampleRate: 1,
    sentryDsn: 'https://abc@o1.ingest.sentry.io/2',
  };

  it('accepts a complete v1 payload', () => {
    expect(parseObservabilityConfig(valid)).toEqual(valid);
  });

  it('accepts an empty sentry DSN', () => {
    expect(parseObservabilityConfig({ ...valid, sentryDsn: '' })?.sentryDsn).toBe('');
  });

  it('rejects a missing field', () => {
    const { fallback: _fallback, ...rest } = valid;
    expect(parseObservabilityConfig(rest)).toBeNull();
  });

  it('rejects an unknown provider', () => {
    expect(parseObservabilityConfig({ ...valid, primary: 'datadog' })).toBeNull();
  });

  it('rejects a sampleRate outside 0-1', () => {
    expect(parseObservabilityConfig({ ...valid, sampleRate: 1.5 })).toBeNull();
    expect(parseObservabilityConfig({ ...valid, sampleRate: -0.1 })).toBeNull();
  });

  it('rejects a non-https DSN', () => {
    expect(parseObservabilityConfig({ ...valid, sentryDsn: 'http://abc@o1.ingest.sentry.io/2' })).toBeNull();
  });

  it('rejects version 0', () => {
    expect(parseObservabilityConfig({ ...valid, version: 0 })).toBeNull();
  });

  it('keeps extra future fields out of the parsed object (additive versions)', () => {
    const parsed = parseObservabilityConfig({ ...valid, version: 2, extraFlag: true });
    expect(parsed).toEqual({ ...valid, version: 2 });
    expect(parsed).not.toHaveProperty('extraFlag');
  });

  it('rejects arrays and primitives', () => {
    expect(parseObservabilityConfig(null)).toBeNull();
    expect(parseObservabilityConfig('sentry')).toBeNull();
    expect(parseObservabilityConfig([])).toBeNull();
  });

  it('ships a bundled default that itself parses', () => {
    expect(parseObservabilityConfig(BUNDLED_DEFAULT_CONFIG)).toEqual(BUNDLED_DEFAULT_CONFIG);
  });
});
