import type {
  CrashEvent,
  CrashOutboxSink,
  CrashReporterAdapter,
  ObservabilityConfig,
  ProviderId,
  RouteResult,
} from './types';

type AdapterMap = Partial<Record<Exclude<ProviderId, 'none'>, CrashReporterAdapter>>;

async function tryCapture(
  id: ProviderId,
  adapters: AdapterMap,
  event: CrashEvent,
): Promise<boolean> {
  if (id === 'none') return false;
  const adapter = adapters[id];
  if (!adapter) return false;
  try {
    return await adapter.capture(event);
  } catch {
    return false;
  }
}

export async function routeCrashEvent(
  event: CrashEvent,
  config: ObservabilityConfig,
  adapters: AdapterMap,
  outbox: CrashOutboxSink,
  rng: () => number = Math.random,
): Promise<RouteResult> {
  if (!config.enabled) return 'dropped';
  if (event.level === 'error' && !config.captureNonFatal) return 'dropped';
  if (config.sampleRate < 1 && rng() >= config.sampleRate) return 'dropped';

  if (await tryCapture(config.primary, adapters, event)) return 'primary';
  if (config.fallback !== config.primary && (await tryCapture(config.fallback, adapters, event))) {
    return 'fallback';
  }

  outbox.enqueue(event);
  return 'outbox';
}
