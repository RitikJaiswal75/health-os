#!/usr/bin/env tsx
/**
 * Export data/india.db into workers/india-catalog/seed/*.sql for D1 import.
 *
 * D1 limits SQL statement size — we use small multi-row INSERTs split across files.
 *
 * Run after: npm run ingest-cdci
 * Then: cd workers/india-catalog && npm run d1:seed:remote
 */
import Database from 'better-sqlite3';
import * as fs from 'fs';
import { finished } from 'node:stream/promises';
import * as path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'india.db');
const SEED_DIR = path.join(process.cwd(), 'workers', 'india-catalog', 'seed');
/** Rows per INSERT — keep statements small for D1 SQLITE_TOOBIG limit. */
const ROWS_PER_INSERT = 25;
/** INSERT statements per .sql file before rotating to the next file. */
const INSERTS_PER_FILE = 80;

type DrugRow = {
  id: number;
  name: string;
  strength: string | null;
  form: string | null;
};

function sqlLiteral(value: string | null | undefined): string {
  if (value == null || value === '') return 'NULL';
  return `'${value.replace(/'/g, "''")}'`;
}

function insertSql(rows: DrugRow[]): string {
  const values = rows
    .map(
      (row) =>
        `(${row.id}, ${sqlLiteral(row.name)}, ${sqlLiteral(row.strength)}, ${sqlLiteral(row.form)})`,
    )
    .join(',\n  ');
  return `INSERT INTO drugs (id, name, strength, form) VALUES\n  ${values};\n`;
}

function dataFileName(index: number): string {
  return `${String(index).padStart(4, '0')}-data.sql`;
}

async function exportSeed(): Promise<void> {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Missing ${DB_PATH}. Run: npm run ingest-cdci`);
  }

  fs.rmSync(SEED_DIR, { recursive: true, force: true });
  fs.mkdirSync(SEED_DIR, { recursive: true });

  fs.writeFileSync(
    path.join(SEED_DIR, '000-cleanup.sql'),
    'DELETE FROM drug_search;\nDELETE FROM drugs;\n',
  );

  const db = new Database(DB_PATH, { readonly: true });
  const iterator = db
    .prepare('SELECT id, name, strength, form FROM drugs ORDER BY id')
    .iterate() as Iterable<DrugRow>;

  let fileIndex = 1;
  let insertsInFile = 0;
  let totalRows = 0;
  let totalBytes = 0;

  let stream = fs.createWriteStream(path.join(SEED_DIR, dataFileName(fileIndex)), 'utf-8');

  const rotateFile = async (): Promise<void> => {
    stream.end();
    await finished(stream);
    fileIndex += 1;
    insertsInFile = 0;
    stream = fs.createWriteStream(path.join(SEED_DIR, dataFileName(fileIndex)), 'utf-8');
  };

  let batch: DrugRow[] = [];

  for (const row of iterator) {
    batch.push(row);
    if (batch.length < ROWS_PER_INSERT) continue;

    const sql = insertSql(batch);
    stream.write(sql);
    totalBytes += sql.length;
    totalRows += batch.length;
    batch = [];
    insertsInFile += 1;

    if (insertsInFile >= INSERTS_PER_FILE) {
      await rotateFile();
    }
  }

  if (batch.length > 0) {
    const sql = insertSql(batch);
    stream.write(sql);
    totalBytes += sql.length;
    totalRows += batch.length;
  }

  stream.end();
  await finished(stream);
  db.close();

  fs.writeFileSync(
    path.join(SEED_DIR, '9999-fts.sql'),
    `INSERT INTO drug_search(rowid, name, strength, form)
SELECT id, name, strength, form FROM drugs;
`,
  );

  const sqlFiles = fs.readdirSync(SEED_DIR).filter((name) => name.endsWith('.sql')).sort();
  const sizeMb = (totalBytes / (1024 * 1024)).toFixed(1);
  console.log(`Wrote ${SEED_DIR} (${totalRows} rows, ${sizeMb} MB across ${sqlFiles.length} files)`);
}

exportSeed().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
