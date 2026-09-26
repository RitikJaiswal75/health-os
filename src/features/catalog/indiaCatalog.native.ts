import { getIndiaCatalogApiUrl } from './indiaCatalogConfig';
import { searchIndiaCatalogRemote } from './indiaCatalogApi';
import { isAbortError, type CatalogResult } from './catalogService';
import { reportError } from '@/src/core/observability/crashReporter';

export async function searchIndiaCatalogAsync(
  query: string,
  signal?: AbortSignal,
): Promise<CatalogResult[]> {
  const apiUrl = getIndiaCatalogApiUrl();
  if (!apiUrl) return [];
  try {
    return await searchIndiaCatalogRemote(query, apiUrl, signal);
  } catch (error) {
    if (isAbortError(error)) throw error;
    reportError('CATALOG_FETCH_FAILED', error);
    return [];
  }
}

/** Sync wrapper — India catalog is remote-only; always returns empty. */
export function searchIndiaCatalog(_query: string): CatalogResult[] {
  return [];
}
