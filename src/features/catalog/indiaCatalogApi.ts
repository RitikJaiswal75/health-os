import type { CatalogResult } from './catalogService';

export interface IndiaCatalogApiHit {
  id: number;
  name: string;
  strength: string | null;
  form: string | null;
}

export interface IndiaCatalogApiResponse {
  results: IndiaCatalogApiHit[];
}

export function mapIndiaApiResults(hits: IndiaCatalogApiHit[]): CatalogResult[] {
  return hits.map((hit, index) => ({
    id: `india:${hit.id}`,
    name: hit.name,
    source: 'india' as const,
    strength: hit.strength ?? undefined,
    type: hit.form ?? undefined,
    rank: 30 - index,
  }));
}

export async function searchIndiaCatalogRemote(
  query: string,
  apiBaseUrl: string,
): Promise<CatalogResult[]> {
  const base = apiBaseUrl.replace(/\/$/, '');
  if (!base || query.trim().length < 2) return [];

  const url = `${base}/search?q=${encodeURIComponent(query.trim())}&limit=20`;
  const response = await fetch(url);
  if (!response.ok) return [];

  const data = (await response.json()) as IndiaCatalogApiResponse;
  if (!Array.isArray(data.results)) return [];

  return mapIndiaApiResults(data.results);
}
