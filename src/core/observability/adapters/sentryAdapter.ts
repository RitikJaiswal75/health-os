import * as Sentry from '@sentry/react-native';
import type { CrashEvent, CrashReporterAdapter, ObservabilityConfig } from '../types';
import { buildSentryEnvelope, parseSentryDsn, type ParsedSentryDsn } from './sentryEnvelope';

const FETCH_TIMEOUT_MS = 8_000;

function usesSentry(config: ObservabilityConfig): boolean {
  return (
    Boolean(config.sentryDsn) && (config.primary === 'sentry' || config.fallback === 'sentry')
  );
}

export function createSentryAdapter(): CrashReporterAdapter {
  let dsn: ParsedSentryDsn | null = null;

  return {
    id: 'sentry',
    init(config: ObservabilityConfig): void {
      if (!usesSentry(config)) return;
      dsn = parseSentryDsn(config.sentryDsn);
      if (!dsn) return;

      try {
        Sentry.init({
          dsn: config.sentryDsn,
          enabled: true,
          sendDefaultPii: false,
          attachScreenshot: false,
          attachViewHierarchy: false,
          enableLogs: false,
          enableCaptureFailedRequests: false,
          enableAutoPerformanceTracing: false,
          enableAutoSessionTracking: false,
          enableNdk: false,
          enableNativeCrashHandling: true,
          beforeBreadcrumb: () => null,
          integrations: (defaults) =>
            defaults.filter((integration) => {
              const name = 'name' in integration ? String(integration.name) : '';
              return !['HttpContext', 'DeviceContext', 'Breadcrumbs'].includes(name);
            }),
          beforeSend(event) {
            delete event.user;
            delete event.server_name;
            delete event.request;
            event.breadcrumbs = [];
            if (event.contexts?.device) {
              delete event.contexts.device.name;
              delete event.contexts.device.device_unique_identifier;
            }
            return event;
          },
        });
        Sentry.getGlobalScope().setUser({ ip_address: '0.0.0.0' });
      } catch {
        // Native SDK missing (tests, Expo Go). Envelope capture still works.
      }
    },
    async capture(event: CrashEvent): Promise<boolean> {
      if (!dsn) return false;
      const envelope = buildSentryEnvelope(event, dsn);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const response = await fetch(dsn.ingestUrl, {
          method: 'POST',
          headers: envelope.headers,
          body: envelope.body,
          signal: controller.signal,
        });
        return response.ok;
      } catch {
        return false;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
