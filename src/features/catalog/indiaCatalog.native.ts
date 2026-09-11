import { getIndiaCatalogApiUrl } from './indiaCatalogConfig';
import { searchIndiaCatalogRemote } from './indiaCatalogApi';
import type { CatalogResult } from './catalogService';

export async function searchIndiaCatalogAsync(query: string): Promise<CatalogResult[]> {
  const apiUrl = getIndiaCatalogApiUrl();
  if (!apiUrl) return [];
  return searchIndiaCatalogRemote(query, apiUrl);
}

/** Sync wrapper — India catalog is remote-only; always returns empty. */
export function searchIndiaCatalog(_query: string): CatalogResult[] {
  return [];
}
