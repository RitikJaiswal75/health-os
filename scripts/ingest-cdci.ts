#!/usr/bin/env tsx
/**
 * Local CDCI ingest script — builds assets/catalog/india.db with FTS search.
 * Run: npm run ingest-cdci
 *
 * In production, point CDCI_SOURCE to the NRCeS CDCI export CSV/JSON.
 * This script creates a minimal sample database when no source is provided.
 */
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const OUT_DIR = path.join(process.cwd(), 'assets', 'catalog');
const OUT_FILE = path.join(OUT_DIR, 'india.db');
const CDCI_SOURCE = process.env.CDCI_SOURCE;

interface DrugRow {
  name: string;
  strength?: string;
  form?: string;
}

const SAMPLE_DRUGS: DrugRow[] = [
  { name: 'Paracetamol', strength: '500 mg', form: 'Tablet' },
  { name: 'Ibuprofen', strength: '400 mg', form: 'Tablet' },
  { name: 'Azithromycin', strength: '500 mg', form: 'Tablet' },
  { name: 'Metformin', strength: '500 mg', form: 'Tablet' },
  { name: 'Amlodipine', strength: '5 mg', form: 'Tablet' },
  { name: 'Atorvastatin', strength: '10 mg', form: 'Tablet' },
  { name: 'Pantoprazole', strength: '40 mg', form: 'Tablet' },
  { name: 'Cetirizine', strength: '10 mg', form: 'Tablet' },
  { name: 'Amoxicillin', strength: '500 mg', form: 'Capsule' },
  { name: 'Vitamin D3', strength: '60000 IU', form: 'Capsule' },
  { name: 'Dolo 650', strength: '650 mg', form: 'Tablet' },
  { name: 'Combiflam', strength: '400/325 mg', form: 'Tablet' },
  { name: 'Telma', strength: '40 mg', form: 'Tablet' },
  { name: 'Ecosprin', strength: '75 mg', form: 'Tablet' },
  { name: 'Shelcal', strength: '500 mg', form: 'Tablet' },
];

function loadFromSource(sourcePath: string): DrugRow[] {
  const raw = fs.readFileSync(sourcePath, 'utf-8');
  if (sourcePath.endsWith('.json')) {
    const parsed = JSON.parse(raw) as DrugRow[];
    return parsed;
  }
  const lines = raw.split('\n').slice(1);
  return lines
    .map((line) => {
      const [name, strength, form] = line.split(',').map((s) => s.trim());
      return name ? { name, strength, form } : null;
    })
    .filter((r): r is DrugRow => r !== null);
}

function buildDatabase(drugs: DrugRow[]): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (fs.existsSync(OUT_FILE)) fs.unlinkSync(OUT_FILE);

  const db = new Database(OUT_FILE);
  db.exec(`
    CREATE TABLE drugs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      strength TEXT,
      form TEXT
    );
    CREATE VIRTUAL TABLE drug_search USING fts5(name, strength, form, content='drugs', content_rowid='id');
  `);

  const insert = db.prepare('INSERT INTO drugs (name, strength, form) VALUES (?, ?, ?)');
  const insertMany = db.transaction((rows: DrugRow[]) => {
    for (const row of rows) {
      insert.run(row.name, row.strength ?? null, row.form ?? null);
    }
  });
  insertMany(drugs);

  db.exec(`
    INSERT INTO drug_search(rowid, name, strength, form)
    SELECT id, name, strength, form FROM drugs;
  `);

  db.close();
  console.log(`Built ${OUT_FILE} with ${drugs.length} entries`);
}

const drugs = CDCI_SOURCE && fs.existsSync(CDCI_SOURCE)
  ? loadFromSource(CDCI_SOURCE)
  : SAMPLE_DRUGS;

buildDatabase(drugs);
