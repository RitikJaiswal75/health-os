import { getIndiaCatalogApiUrl } from './indiaCatalogConfig';
import { searchIndiaCatalogRemote } from './indiaCatalogApi';
import { isAbortError, isNetworkError, type CatalogResult } from './catalogService';
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
    if (!isNetworkError(error)) reportError('CATALOG_FETCH_FAILED', error);
    return [];
  }
}
