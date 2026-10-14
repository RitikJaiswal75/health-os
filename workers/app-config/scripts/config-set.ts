import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CONFIG_KINDS, CONFIG_ROUTES, CONFIG_SCHEMA_HINTS } from '../src/constants';

type ConfigKind = keyof typeof CONFIG_KINDS;

function usage(): never {
  console.error(
    `Usage: npm run config:set -- <path-to-config.json> [--kind ${Object.keys(CONFIG_KINDS).join('|')}] [--remote|--local] [--validate-only]`,
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const kindIndex = args.indexOf('--kind');
const kindArg = kindIndex >= 0 ? args[kindIndex + 1] : 'observability';
if (!kindArg || !(kindArg in CONFIG_KINDS)) usage();
const kind = kindArg as ConfigKind;

const fileArg = args.find(
  (arg, index) => !arg.startsWith('-') && !(kindIndex >= 0 && index === kindIndex + 1),
);
if (!fileArg) usage();

const remote = !args.includes('--local');
const validateOnly = args.includes('--validate-only');
const filePath = resolve(process.cwd(), fileArg);
const route = CONFIG_ROUTES[CONFIG_KINDS[kind]];

let raw: unknown;
try {
  raw = JSON.parse(readFileSync(filePath, 'utf8'));
} catch (error) {
  const message = error instanceof Error ? error.message : 'Could not read JSON';
  console.error(`Invalid JSON file: ${message}`);
  process.exit(1);
}

const parsed = route.parse(raw);
if (!parsed) {
  console.error(`Config failed ${kind} schema validation. ${CONFIG_SCHEMA_HINTS[kind]}`);
  process.exit(1);
}

// Apps ignore unknown fields so old installs survive newer configs; when authoring, a field
// the parser drops is almost always a typo or the wrong --kind, so reject it here.
function ignoredFields(input: unknown, kept: unknown, prefix = ''): string[] {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return [];
  const keptRecord = (kept && typeof kept === 'object' ? kept : {}) as Record<string, unknown>;
  return Object.entries(input as Record<string, unknown>).flatMap(([key, value]) => {
    const path = `${prefix}${key}`;
    if (!(key in keptRecord)) return [path];
    return ignoredFields(value, keptRecord[key], `${path}.`);
  });
}

const ignored = ignoredFields(raw, parsed);
if (ignored.length > 0) {
  console.error(`Config has fields the ${kind} schema does not use: ${ignored.join(', ')}`);
  process.exit(1);
}

if (validateOnly) {
  console.log(`${fileArg} is a valid ${kind} config.`);
  process.exit(0);
}

const payload = JSON.stringify(parsed);
const wranglerArgs = ['kv', 'key', 'put', '--binding=APP_CONFIG', route.kvKey, payload];
if (remote) wranglerArgs.push('--remote');

const result = spawnSync('npx', ['wrangler', ...wranglerArgs], {
  stdio: 'inherit',
  cwd: resolve(__dirname, '..'),
  shell: process.platform === 'win32',
});

process.exit(result.status === null ? 1 : result.status);
