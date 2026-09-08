import * as SQLite from 'expo-sqlite';
import { searchIndiaLocal, type CatalogResult } from './catalogService';

const INDIA_CATALOG_DB = 'india-catalog.db';
let indiaDb: SQLite.SQLiteDatabase | null = null;
let importPromise: Promise<void> | null = null;

async function ensureIndiaCatalogLoaded(): Promise<SQLite.SQLiteDatabase | null> {
  if (indiaDb) return indiaDb;
  if (!importPromise) {
    importPromise = (async () => {
      try {
        await SQLite.importDatabaseFromAssetAsync(INDIA_CATALOG_DB, {
          assetId: require('../../../assets/catalog/india.db'),
        });
        indiaDb = SQLite.openDatabaseSync(INDIA_CATALOG_DB);
      } catch {
        indiaDb = null;
      }
    })();
  }
  await importPromise;
  return indiaDb;
}

export async function searchIndiaCatalogAsync(query: string): Promise<CatalogResult[]> {
  const db = await ensureIndiaCatalogLoaded();
  return db ? searchIndiaLocal(db, query) : [];
}

/** Sync wrapper — returns empty until async import completes; search screen uses async path. */
export function searchIndiaCatalog(query: string): CatalogResult[] {
  if (indiaDb) return searchIndiaLocal(indiaDb, query);
  void ensureIndiaCatalogLoaded();
  return [];
}

export function getIndiaCatalogDb(): SQLite.SQLiteDatabase | null {
  return indiaDb;
}
