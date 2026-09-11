#!/usr/bin/env tsx
/**
 * Builds data/india.db FTS catalog from Indian medicine JSON or a CDCI CSV export.
 *
 * Run:
 *   npm run ingest-cdci
 *   CDCI_SOURCE=data/indian_medicine_data.json npm run ingest-cdci
 *   npm run ingest-cdci -- --out data/india.db
 */
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import {
  parseIndianMedicineJson,
  type IndiaDrugRow,
} from '../src/features/catalog/indiaMedicineParser';

const DEFAULT_OUT_DIR = path.join(process.cwd(), 'data');
const DEFAULT_OUT_FILE = path.join(DEFAULT_OUT_DIR, 'india.db');
const CDCI_SOURCE = process.env.CDCI_SOURCE ?? path.join(DEFAULT_OUT_DIR, 'indian_medicine_data.json');

function resolveOutFile(): string {
  const outFlagIndex = process.argv.indexOf('--out');
  if (outFlagIndex >= 0 && process.argv[outFlagIndex + 1]) {
    return path.resolve(process.argv[outFlagIndex + 1]);
  }
  if (process.env.OUT_FILE) return path.resolve(process.env.OUT_FILE);
  return DEFAULT_OUT_FILE;
}

const SAMPLE_DRUGS: IndiaDrugRow[] = [
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

function loadFromCsv(sourcePath: string): IndiaDrugRow[] {
  const raw = fs.readFileSync(sourcePath, 'utf-8');
  const lines = raw.split('\n').slice(1);
  return lines
    .map((line) => {
      const [name, strength, form] = line.split(',').map((s) => s.trim());
      return name ? { name, strength, form } : null;
    })
    .filter((row): row is IndiaDrugRow => row !== null);
}

function loadFromSource(sourcePath: string): IndiaDrugRow[] {
  const raw = fs.readFileSync(sourcePath, 'utf-8');
  if (sourcePath.endsWith('.json')) {
    return parseIndianMedicineJson(raw);
  }
  return loadFromCsv(sourcePath);
}

function buildDatabase(outFile: string, drugs: IndiaDrugRow[]): void {
  const outDir = path.dirname(outFile);
  fs.mkdirSync(outDir, { recursive: true });
  if (fs.existsSync(outFile)) fs.unlinkSync(outFile);

  const db = new Database(outFile);
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
  const insertMany = db.transaction((rows: IndiaDrugRow[]) => {
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
  console.log(`Built ${outFile} with ${drugs.length} entries`);
}

function writeCatalogVersion(outFile: string): void {
  const versionFile = path.join(path.dirname(outFile), 'catalog-version.json');
  const existing = fs.existsSync(versionFile)
    ? (JSON.parse(fs.readFileSync(versionFile, 'utf-8')) as { version?: number })
    : { version: 0 };

  const versionMeta = {
    version: (existing.version ?? 0) + 1,
    builtAt: new Date().toISOString(),
    dbUrl:
      'https://raw.githubusercontent.com/RitikJaiswal75/health-os/main/data/india.db',
  };

  fs.writeFileSync(versionFile, `${JSON.stringify(versionMeta, null, 2)}\n`);
  console.log(`Updated ${versionFile} → version ${versionMeta.version}`);
}

const outFile = resolveOutFile();
const drugs =
  CDCI_SOURCE && fs.existsSync(CDCI_SOURCE) ? loadFromSource(CDCI_SOURCE) : SAMPLE_DRUGS;

buildDatabase(outFile, drugs);
if (CDCI_SOURCE && fs.existsSync(CDCI_SOURCE)) {
  writeCatalogVersion(outFile);
}
