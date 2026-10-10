import { readObservabilityKv, writeObservabilityKv } from '@/src/core/observability/observabilityDb';
import { parseAppUpdateConfig } from './appUpdateSchema';
import { APP_UPDATE_KV_KEYS } from './constants';
import type { AppUpdateConfig } from './types';

export function readCachedAppUpdateConfig(): AppUpdateConfig | null {
  const raw = readObservabilityKv(APP_UPDATE_KV_KEYS.config);
  if (!raw) return null;
  try {
    return parseAppUpdateConfig(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function writeCachedAppUpdateConfig(config: AppUpdateConfig): void {
  writeObservabilityKv(APP_UPDATE_KV_KEYS.config, JSON.stringify(config));
}

export function readAppUpdateEtag(): string | null {
  return readObservabilityKv(APP_UPDATE_KV_KEYS.etag);
}

export function writeAppUpdateEtag(etag: string): void {
  writeObservabilityKv(APP_UPDATE_KV_KEYS.etag, etag);
}

export function readSkippedVersion(): string | null {
  return readObservabilityKv(APP_UPDATE_KV_KEYS.skippedVersion);
}

export function writeSkippedVersion(version: string): void {
  writeObservabilityKv(APP_UPDATE_KV_KEYS.skippedVersion, version);
}
