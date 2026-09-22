import {
  buildSentryEnvelope,
  parseSentryDsn,
} from '../../src/core/observability/adapters/sentryEnvelope';
import type { CrashEvent } from '../../src/core/observability/types';

const event: CrashEvent = {
  installId: 'install-1',
  appVersion: '2.0.1',
  osVersion: '14',
  deviceModel: 'Pixel 8',
  routeName: '/(tabs)',
  errorCode: 'DOSE_MARK_FAILED',
  errorName: 'Error',
  stackFrames: ['at markDoseAsTaken (doseTakenService.ts:46:11)'],
  message: null,
  level: 'error',
};

describe('parseSentryDsn', () => {
  it('extracts ingest URL and public key', () => {
    const parsed = parseSentryDsn('https://abc123@o456.ingest.sentry.io/789');
    expect(parsed).toEqual({
      publicKey: 'abc123',
      host: 'o456.ingest.sentry.io',
      projectId: '789',
      ingestUrl: 'https://o456.ingest.sentry.io/api/789/envelope/',
    });
  });

  it('returns null for an empty DSN', () => {
    expect(parseSentryDsn('')).toBeNull();
  });

  it('parses an EU-region ingest host', () => {
    const parsed = parseSentryDsn(
      'https://abc123@o456.ingest.de.sentry.io/789',
    );
    expect(parsed?.host).toBe('o456.ingest.de.sentry.io');
    expect(parsed?.ingestUrl).toBe('https://o456.ingest.de.sentry.io/api/789/envelope/');
  });
});

describe('buildSentryEnvelope', () => {
  it('uses the error code as the exception value when message is scrubbed', () => {
    const parsed = parseSentryDsn('https://abc123@o456.ingest.sentry.io/789');
    if (!parsed) throw new Error('expected DSN');
    const { body } = buildSentryEnvelope(event, parsed);
    const lines = body.split('\n');
    const payload = JSON.parse(lines[2] ?? '{}') as {
      exception?: { values?: { value?: string; type?: string }[] };
      user?: { ip_address?: string; id?: string };
      tags?: { error_code?: string };
    };

    expect(payload.exception?.values?.[0]?.value).toBe('DOSE_MARK_FAILED');
    expect(payload.exception?.values?.[0]?.type).toBe('Error');
    expect(payload.user?.ip_address).toBe('0.0.0.0');
    expect(payload.user?.id).toBe('install-1');
    expect(payload.tags?.error_code).toBe('DOSE_MARK_FAILED');
    expect(body).not.toContain('Dolo');
  });
});
