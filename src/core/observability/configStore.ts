import {
  parseObservabilityConfig,
} from './configSchema';
import { readObservabilityKv, writeObservabilityKv } from './observabilityDb';
import type { ObservabilityConfig } from './types';

const CONFIG_KEY = 'observability_config';
const ETAG_KEY = 'observability_etag';

export function readCachedObservabilityConfig(): ObservabilityConfig | null {
  const raw = readObservabilityKv(CONFIG_KEY);
  if (!raw) return null;
  try {
    return parseObservabilityConfig(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function writeCachedObservabilityConfig(config: ObservabilityConfig): void {
  writeObservabilityKv(CONFIG_KEY, JSON.stringify(config));
}

export function readConfigEtag(): string | null {
  return readObservabilityKv(ETAG_KEY);
}

export function writeConfigEtag(etag: string): void {
  writeObservabilityKv(ETAG_KEY, etag);
}
