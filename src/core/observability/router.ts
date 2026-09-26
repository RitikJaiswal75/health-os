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

function deliveryTargets(config: ObservabilityConfig, adapters: AdapterMap): ProviderId[] {
  const ids: ProviderId[] = [];
  for (const id of [config.primary, config.fallback]) {
    if (id === 'none' || ids.includes(id)) continue;
    if (!adapters[id]) continue;
    ids.push(id);
  }
  return ids;
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

  const targets = deliveryTargets(config, adapters);
  if (targets.length === 0) return 'dropped';

  const results = await Promise.all(targets.map((id) => tryCapture(id, adapters, event)));
  const delivered = results.some(Boolean);
  if (!delivered) {
    outbox.enqueue(event);
    return 'outbox';
  }

  return targets.length > 1 ? 'both' : 'primary';
}
