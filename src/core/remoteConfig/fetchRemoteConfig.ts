import { Platform } from 'react-native';
import { getAppVersion, getObservabilityConfigUrl } from '@/src/core/observability/config';
import { REMOTE_CONFIG_FETCH_TIMEOUT_MS } from './constants';
import type { RemoteConfigRequest } from './types';

function remoteConfigUrl(path: string): string {
  const params = new URLSearchParams({
    platform: Platform.OS,
    appVersion: getAppVersion(),
  });
  return `${getObservabilityConfigUrl()}${path}?${params.toString()}`;
}

/**
 * Fetches a config document from the app-config worker with ETag revalidation.
 * Returns the fresh or cached config, or null on any failure (callers keep what they have).
 */
export async function fetchRemoteConfig<T>({
  path,
  parse,
  cache,
}: RemoteConfigRequest<T>): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REMOTE_CONFIG_FETCH_TIMEOUT_MS);
  const request = (etag: string | null) =>
    fetch(remoteConfigUrl(path), {
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(etag ? { 'If-None-Match': etag } : {}) },
    });
  try {
    let response = await request(cache.readEtag());

    if (response.status === 304) {
      const cached = cache.readCached();
      if (cached) return cached;
      // The saved copy is gone or no longer parses: without this the server answers 304 forever.
      response = await request(null);
    }
    if (!response.ok) return null;

    const parsed = parse(await response.json());
    if (!parsed) return null;

    cache.writeCached(parsed);
    const nextEtag = response.headers.get('ETag');
    if (nextEtag) cache.writeEtag(nextEtag);
    return parsed;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
