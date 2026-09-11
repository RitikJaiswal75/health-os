import { execSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const seedDir = join(process.cwd(), 'seed');
const remote = process.argv.includes('--remote');
const flag = remote ? '--remote' : '--local';

const files = readdirSync(seedDir)
  .filter((name) => name.endsWith('.sql'))
  .sort();

if (files.length === 0) {
  console.error('No seed/*.sql files found. Run from repo root: npm run export-india-d1');
  process.exit(1);
}

console.log(`Seeding ${files.length} files (${flag})...`);

for (const file of files) {
  console.log(`\n→ ${file}`);
  execSync(
    `wrangler d1 execute health-os-india-catalog ${flag} --file=${join('seed', file)} --yes`,
    { stdio: 'inherit' },
  );
}

console.log('\nDone.');
