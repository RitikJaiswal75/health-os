/**
 * Bumps the app version everywhere the release checks read it.
 *   npm run version:patch|minor|major   bump from the current version
 *   --if-needed (pre-commit)            bump from origin/main only when the staged app change lacks one;
 *                                       level from BUMP=major|minor|patch (default patch)
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseAppUpdateConfig } from '../src/features/appUpdate/appUpdateSchema';
import { applyVersion, nextVersion } from './release/bump';
import {
  checkLatestVersionMatches,
  checkVersionBump,
  readExpoVersionInfo,
  touchesAppPaths,
} from './release/checks';
import {
  APP_UPDATE_CONFIG_FILE,
  BUMP_LEVELS,
  DEFAULT_BASE_REF,
  EXPO_BASE_JSON,
  PACKAGE_JSON,
  PACKAGE_LOCK_JSON,
  REPO_ROOT,
} from './release/constants';
import type { BumpLevel, ExpoVersionInfo, VersionFiles } from './release/types';

const FILES = [EXPO_BASE_JSON, PACKAGE_JSON, PACKAGE_LOCK_JSON, APP_UPDATE_CONFIG_FILE];

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' });
}

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function asLevel(value: string | undefined): BumpLevel {
  if ((BUMP_LEVELS as readonly string[]).includes(value ?? '')) return value as BumpLevel;
  fail(`Bump level must be one of ${BUMP_LEVELS.join(', ')} (got "${value ?? ''}").`);
}

/** Writes the new version, then re-reads it through the same checks the pre-commit hook runs. */
function writeVersion(from: ExpoVersionInfo, level: BumpLevel): string {
  if (from.versionCode === null) fail(`${EXPO_BASE_JSON} has no integer android.versionCode.`);
  const version = nextVersion(from.version, level);
  const read = (path: string) => readFileSync(resolve(REPO_ROOT, path), 'utf8');
  const before: VersionFiles = Object.fromEntries(FILES.map((path) => [path, read(path)]));
  const after = applyVersion(before, version, from.versionCode + 1);

  const written = readExpoVersionInfo(JSON.parse(after[EXPO_BASE_JSON]));
  const config = parseAppUpdateConfig(JSON.parse(after[APP_UPDATE_CONFIG_FILE]));
  const errors = [
    ...checkVersionBump(from, written, (JSON.parse(after[PACKAGE_JSON]) as { version?: string }).version ?? ''),
    ...(config ? checkLatestVersionMatches(config, version) : [`${APP_UPDATE_CONFIG_FILE} is invalid.`]),
  ];
  if (errors.length > 0) fail(`Bump produced inconsistent files:\n  ${errors.join('\n  ')}`);

  for (const path of FILES) writeFileSync(resolve(REPO_ROOT, path), after[path]);
  console.log(`✓ ${from.version} → ${version} (versionCode ${from.versionCode} → ${from.versionCode + 1})`);
  return version;
}

function runIfNeeded(): void {
  const staged = git(['diff', '--cached', '--name-only']).split('\n').filter(Boolean);
  if (!touchesAppPaths(staged)) return;

  const show = (rev: string, path: string) => JSON.parse(git(['show', `${rev}:${path}`])) as unknown;
  let base: ExpoVersionInfo;
  try {
    base = readExpoVersionInfo(show(`origin/${DEFAULT_BASE_REF}`, EXPO_BASE_JSON));
  } catch {
    return; // No local origin/main: check-version-bump prints the fetch hint.
  }
  const head = readExpoVersionInfo(show('', EXPO_BASE_JSON));
  // Already bumped by hand: leave it, check-version-bump reports anything still out of step.
  if (head.version !== base.version || head.versionCode !== base.versionCode) return;

  // `git add` below would also stage the user's other unstaged edits in these files.
  const dirty = git(['diff', '--name-only', '--', ...FILES]).split('\n').filter(Boolean);
  if (dirty.length > 0) {
    fail(`Cannot auto-bump: unstaged changes in ${dirty.join(', ')}. Stage or stash them, or run npm run version:patch.`);
  }
  writeVersion(base, asLevel(process.env.BUMP ?? 'patch'));
  git(['add', '--', ...FILES]);
}

if (process.argv.includes('--if-needed')) runIfNeeded();
else {
  const current = readExpoVersionInfo(JSON.parse(readFileSync(resolve(REPO_ROOT, EXPO_BASE_JSON), 'utf8')));
  writeVersion(current, asLevel(process.argv[2]));
}
