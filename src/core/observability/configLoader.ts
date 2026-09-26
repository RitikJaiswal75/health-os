import { Platform } from 'react-native';
import { getAppVersion, getObservabilityConfigUrl } from './config';
import { parseObservabilityConfig } from './configSchema';
import {
  readCachedObservabilityConfig,
  readConfigEtag,
  writeCachedObservabilityConfig,
  writeConfigEtag,
} from './configStore';
import type { ObservabilityConfig } from './types';

const FETCH_TIMEOUT_MS = 10_000;

function observabilityUrl(): string {
  const base = getObservabilityConfigUrl();
  const params = new URLSearchParams({
    platform: Platform.OS,
    appVersion: getAppVersion(),
  });
  return `${base}/v1/observability?${params.toString()}`;
}

export async function refreshObservabilityConfig(): Promise<ObservabilityConfig | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const etag = readConfigEtag();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (etag) headers['If-None-Match'] = etag;

    const response = await fetch(observabilityUrl(), {
      signal: controller.signal,
      headers,
    });

    if (response.status === 304) {
      return readCachedObservabilityConfig();
    }
    if (!response.ok) return null;

    const parsed = parseObservabilityConfig(await response.json());
    if (!parsed) return null;

    writeCachedObservabilityConfig(parsed);
    const nextEtag = response.headers.get('ETag');
    if (nextEtag) writeConfigEtag(nextEtag);
    return parsed;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
