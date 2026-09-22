import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseObservabilityConfig } from '../../../src/core/observability/configSchema';

function usage(): never {
  console.error('Usage: npm run config:set -- <path-to-config.json> [--remote|--local]');
  process.exit(1);
}

const args = process.argv.slice(2);
const fileArg = args.find((arg) => !arg.startsWith('-'));
if (!fileArg) usage();

const remote = !args.includes('--local');
const filePath = resolve(process.cwd(), fileArg);

let raw: unknown;
try {
  raw = JSON.parse(readFileSync(filePath, 'utf8'));
} catch (error) {
  const message = error instanceof Error ? error.message : 'Could not read JSON';
  console.error(`Invalid JSON file: ${message}`);
  process.exit(1);
}

const parsed = parseObservabilityConfig(raw);
if (!parsed) {
  console.error(
    'Config failed schema validation. Required fields: version (>=1 integer), enabled, primary (sentry|crashlytics|none), fallback (sentry|crashlytics|none), captureNonFatal, sampleRate (0-1), sentryDsn (https DSN or empty string).',
  );
  process.exit(1);
}

const payload = JSON.stringify(parsed);
const wranglerArgs = [
  'kv',
  'key',
  'put',
  '--binding=APP_CONFIG',
  'observability',
  payload,
];
if (remote) wranglerArgs.push('--remote');

const result = spawnSync('npx', ['wrangler', ...wranglerArgs], {
  stdio: 'inherit',
  cwd: resolve(__dirname, '..'),
  shell: process.platform === 'win32',
});

process.exit(result.status === null ? 1 : result.status);
