import { v4 as uuidv4 } from 'uuid';
import type { CrashEvent } from '../types';

export interface ParsedSentryDsn {
  publicKey: string;
  host: string;
  projectId: string;
  ingestUrl: string;
}

export function parseSentryDsn(dsn: string): ParsedSentryDsn | null {
  if (!dsn.trim()) return null;
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const projectId = url.pathname.replace(/^\//, '').split('/')[0];
    if (!publicKey || !projectId) return null;
    return {
      publicKey,
      host: url.host,
      projectId,
      ingestUrl: `${url.protocol}//${url.host}/api/${projectId}/envelope/`,
    };
  } catch {
    return null;
  }
}

export function buildSentryEnvelope(
  event: CrashEvent,
  dsn: ParsedSentryDsn,
): { body: string; headers: Record<string, string> } {
  const eventId = uuidv4().replace(/-/g, '');
  const header = { event_id: eventId, sent_at: new Date().toISOString() };
  const item = { type: 'event', content_type: 'application/json' };
  const payload = {
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: 'javascript',
    level: event.level === 'fatal' ? 'fatal' : 'error',
    exception: {
      values: [
        {
          type: event.errorName,
          value: event.message ?? event.errorCode,
          stacktrace: {
            frames: event.stackFrames.map((frame) => ({
              filename: 'app',
              function: frame,
              in_app: true,
            })),
          },
        },
      ],
    },
    tags: { error_code: event.errorCode },
    user: { id: event.installId, ip_address: '0.0.0.0' },
    contexts: {
      os: { name: 'android', version: event.osVersion },
      device: { model: event.deviceModel },
      app: { app_version: event.appVersion },
    },
    extra: { route_name: event.routeName },
    release: `com.health.os@${event.appVersion}`,
  };

  return {
    body: `${JSON.stringify(header)}\n${JSON.stringify(item)}\n${JSON.stringify(payload)}`,
    headers: {
      'Content-Type': 'application/x-sentry-envelope',
      'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=health-os/${event.appVersion}, sentry_key=${dsn.publicKey}`,
    },
  };
}
