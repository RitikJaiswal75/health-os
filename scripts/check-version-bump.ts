import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseAppUpdateConfig } from '../src/features/appUpdate/appUpdateSchema';
import { checkAdvertisedVersion, checkVersionBump, readExpoVersionInfo } from './release/checks';
import { DEFAULT_BASE_REF, EXPO_BASE_JSON, PACKAGE_JSON, REPO_ROOT } from './release/constants';

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(REPO_ROOT, path), 'utf8')) as unknown;
}

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function fail(errors: string[]): never {
  for (const error of errors) console.error(`✗ ${error}`);
  process.exit(1);
}

const head = readExpoVersionInfo(readJson(EXPO_BASE_JSON));
const configPath = argValue('--app-update-config');

if (configPath) {
  const config = parseAppUpdateConfig(readJson(configPath));
  if (!config) fail([`${configPath} failed app-update schema validation.`]);
  const errors = checkAdvertisedVersion(config, head.version);
  if (errors.length > 0) fail(errors);
  console.log(`✓ ${configPath} advertises no version newer than ${head.version}.`);
} else {
  const baseRef = argValue('--base') ?? process.env.GITHUB_BASE_REF ?? DEFAULT_BASE_REF;
  const baseJson = execFileSync('git', ['show', `origin/${baseRef}:${EXPO_BASE_JSON}`], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  const base = readExpoVersionInfo(JSON.parse(baseJson) as unknown);
  const packageVersion = (readJson(PACKAGE_JSON) as { version?: string }).version ?? '';
  const errors = checkVersionBump(base, head, packageVersion);
  if (errors.length > 0) fail(errors);
  console.log(
    `✓ Version bumped: ${base.version} → ${head.version} (versionCode ${base.versionCode} → ${head.versionCode}).`,
  );
}
