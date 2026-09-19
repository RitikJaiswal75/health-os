import { getIndiaCatalogApiUrl } from './indiaCatalogConfig';
import { searchIndiaCatalogRemote } from './indiaCatalogApi';
import type { CatalogResult } from './catalogService';

export async function searchIndiaCatalogAsync(
  query: string,
  signal?: AbortSignal,
): Promise<CatalogResult[]> {
  const apiUrl = getIndiaCatalogApiUrl();
  if (!apiUrl) return [];
  return searchIndiaCatalogRemote(query, apiUrl, signal);
}

/** Sync wrapper — India catalog is remote-only; always returns empty. */
export function searchIndiaCatalog(_query: string): CatalogResult[] {
  return [];
}
