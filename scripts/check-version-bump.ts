import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseAppUpdateConfig } from '../src/features/appUpdate/appUpdateSchema';
import {
  checkAdvertisedVersion,
  checkLatestVersionMatches,
  checkVersionBump,
  readExpoVersionInfo,
  touchesAppPaths,
} from './release/checks';
import {
  APP_UPDATE_CONFIG_FILE,
  DEFAULT_BASE_REF,
  EXPO_BASE_JSON,
  PACKAGE_JSON,
  REPO_ROOT,
} from './release/constants';

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

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' });
}

/** `git show <rev>:<path>` parsed as JSON; rev '' reads the staged (index) copy. */
function readGitJson(rev: string, path: string): unknown {
  return JSON.parse(git(['show', `${rev}:${path}`])) as unknown;
}

/** Pre-commit: staged versions must be bumped past main and advertised in app-update.json. */
function runPreCommit(): void {
  const staged = git(['diff', '--cached', '--name-only']).split('\n').filter(Boolean);
  if (!touchesAppPaths(staged)) return;

  const baseRef = `origin/${DEFAULT_BASE_REF}`;
  let baseJson: unknown;
  try {
    baseJson = readGitJson(baseRef, EXPO_BASE_JSON);
  } catch {
    fail([`Cannot read ${EXPO_BASE_JSON} from ${baseRef}. Run \`git fetch origin ${DEFAULT_BASE_REF}\`.`]);
  }
  const base = readExpoVersionInfo(baseJson);
  const stagedHead = readExpoVersionInfo(readGitJson('', EXPO_BASE_JSON));
  const packageVersion = (readGitJson('', PACKAGE_JSON) as { version?: string }).version ?? '';
  const errors = checkVersionBump(base, stagedHead, packageVersion);

  const config = parseAppUpdateConfig(readGitJson('', APP_UPDATE_CONFIG_FILE));
  if (!config) errors.push(`${APP_UPDATE_CONFIG_FILE} failed app-update schema validation.`);
  else errors.push(...checkLatestVersionMatches(config, stagedHead.version));

  if (errors.length > 0) {
    console.error(`\npre-commit: version check against ${baseRef} failed\n`);
    fail(errors);
  }
}

if (process.argv.includes('--pre-commit')) {
  runPreCommit();
  process.exit(0);
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
