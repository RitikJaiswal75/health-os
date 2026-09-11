import { addHours, isAfter, parseISO } from 'date-fns';
import type { SQLiteDatabase } from 'expo-sqlite';

export const CACHE_TTL_HOURS = 24;

export interface CatalogResult {
  id: string;
  name: string;
  source: 'india' | 'rxterms' | 'dsld' | 'custom';
  strength?: string;
  type?: string;
  rank: number;
}

export class CatalogCacheRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  private cacheId(source: string, queryKey: string): string {
    return `${source}:${queryKey.toLowerCase()}`;
  }

  get(source: string, queryKey: string): string | null {
    const row = this.db.getFirstSync<{ payload: string; expires_at: string }>(
      `SELECT payload, expires_at FROM catalog_cache WHERE source = ? AND query_key = ?`,
      [source, queryKey.toLowerCase()],
    );
    if (!row) return null;
    if (isAfter(new Date(), parseISO(row.expires_at))) {
      this.delete(source, queryKey);
      return null;
    }
    return row.payload;
  }

  set(source: string, queryKey: string, payload: string): void {
    const now = new Date();
    const expiresAt = addHours(now, CACHE_TTL_HOURS).toISOString();
    this.db.runSync(
      `INSERT OR REPLACE INTO catalog_cache (id, source, query_key, payload, cached_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [this.cacheId(source, queryKey), source, queryKey.toLowerCase(), payload, now.toISOString(), expiresAt],
    );
  }

  delete(source: string, queryKey: string): void {
    this.db.runSync(`DELETE FROM catalog_cache WHERE source = ? AND query_key = ?`, [
      source,
      queryKey.toLowerCase(),
    ]);
  }

  sweepExpired(): number {
    const now = new Date().toISOString();
    const before = this.db.getFirstSync<{ count: number }>(
      `SELECT COUNT(*) as count FROM catalog_cache WHERE expires_at < ?`,
      [now],
    );
    this.db.runSync(`DELETE FROM catalog_cache WHERE expires_at < ?`, [now]);
    return before?.count ?? 0;
  }
}

export function mergeAndRankResults(
  sources: CatalogResult[][],
  query: string,
): CatalogResult[] {
  const seen = new Set<string>();
  const merged: CatalogResult[] = [];

  for (const results of sources) {
    for (const item of results) {
      const key = `${item.source}:${item.name.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const lowerQuery = query.toLowerCase();
      const lowerName = item.name.toLowerCase();
      let rank = item.rank;
      if (lowerName === lowerQuery) rank += 100;
      else if (lowerName.startsWith(lowerQuery)) rank += 50;
      else if (lowerName.includes(lowerQuery)) rank += 10;
      merged.push({ ...item, rank });
    }
  }

  return merged.sort((a, b) => b.rank - a.rank);
}

export async function searchRxTerms(query: string): Promise<CatalogResult[]> {
  try {
    const url = `https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=${encodeURIComponent(query)}&maxList=20`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    const names: string[] = data[1] ?? [];
    return names.map((name, index) => ({
      id: `rxterms:${name}`,
      name,
      source: 'rxterms' as const,
      rank: 20 - index,
    }));
  } catch {
    return [];
  }
}

export async function searchDsld(query: string): Promise<CatalogResult[]> {
  try {
    const url = `https://api.ods.od.nih.gov/dsld/v9/search?term=${encodeURIComponent(query)}&size=20`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    const hits = data.hits ?? [];
    return hits.map((hit: { _id: string; productName?: string; brandName?: string }, index: number) => ({
      id: `dsld:${hit._id}`,
      name: hit.productName ?? hit.brandName ?? 'Unknown supplement',
      source: 'dsld' as const,
      type: 'supplement',
      rank: 15 - index,
    }));
  } catch {
    return [];
  }
}

export function sanitizeFtsQuery(query: string): string {
  const tokens = query
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return '';
  return `${tokens.map((token) => `"${token.replace(/"/g, '""')}"`).join(' ')}*`;
}

export function parseCachedResults(payload: string): CatalogResult[] {
  try {
    const parsed: unknown = JSON.parse(payload);
    return Array.isArray(parsed) ? (parsed as CatalogResult[]) : [];
  } catch {
    return [];
  }
}

