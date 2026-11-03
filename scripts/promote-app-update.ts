/**
 * Release pipeline step: after the Play release is live, set android.latestVersion in
 * workers/app-config/config/app-update.json to the released app version.
 *
 *   npx tsx scripts/promote-app-update.ts            # version from expo.base.json
 *   npx tsx scripts/promote-app-update.ts --version 2.0.5
 *
 * minSupportedVersion is left as committed (it is set by hand in the release PR).
 * Writes `changed=true|false` to $GITHUB_OUTPUT when running in Actions.
 */
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseAppUpdateConfig } from '../src/features/appUpdate/appUpdateSchema';
import { promoteLatestVersion, readExpoVersionInfo } from './release/checks';
import { APP_UPDATE_CONFIG_FILE, EXPO_BASE_JSON, REPO_ROOT } from './release/constants';

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(REPO_ROOT, path), 'utf8')) as unknown;
}

const flagIndex = process.argv.indexOf('--version');
const version =
  (flagIndex >= 0 ? process.argv[flagIndex + 1] : undefined) ??
  readExpoVersionInfo(readJson(EXPO_BASE_JSON)).version;

const configPath = resolve(REPO_ROOT, APP_UPDATE_CONFIG_FILE);
const raw = readJson(APP_UPDATE_CONFIG_FILE);
const config = parseAppUpdateConfig(raw);
if (!config) fail(`${APP_UPDATE_CONFIG_FILE} failed app-update schema validation.`);

const promoted = promoteLatestVersion(config, 'android', version);
if (!promoted) {
  fail(`Cannot promote: "${version}" is not a valid version or ${APP_UPDATE_CONFIG_FILE} has no android entry.`);
}
// Round-trip through the app's parser so min <= latest and the URL are re-checked.
if (!parseAppUpdateConfig(promoted)) fail('Promoted config failed app-update schema validation.');

const changed = promoted !== config;
if (changed) {
  // Merge into the raw JSON so key order and formatting stay as committed.
  const rawRecord = raw as { android: Record<string, unknown> };
  rawRecord.android.latestVersion = promoted.android?.latestVersion;
  writeFileSync(configPath, `${JSON.stringify(rawRecord, null, 2)}\n`);
  console.log(`✓ android.latestVersion ${config.android?.latestVersion} → ${version}`);
} else {
  console.log(`✓ android.latestVersion is already ${config.android?.latestVersion} (≥ ${version}); nothing to change.`);
}
console.log(`  minSupportedVersion: ${promoted.android?.minSupportedVersion ?? '(none)'}`);

if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
