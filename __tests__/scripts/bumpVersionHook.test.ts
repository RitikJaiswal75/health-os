// Runs the real pre-commit bump (`bump-version.ts --if-needed`) in a throwaway git repo.
import { execFileSync } from 'node:child_process';
import { appendFileSync, cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { nextVersion } from '../../scripts/release/bump';
import { readExpoVersionInfo } from '../../scripts/release/checks';
import { REPO_ROOT } from '../../scripts/release/constants';

// The script finds the repo from its own path, so it and everything it imports is copied.
const FILES = [
  'scripts/bump-version.ts',
  'scripts/release',
  'src/features/appUpdate/appUpdateSchema.ts',
  'src/features/appUpdate/versionCompare.ts',
  'src/features/appUpdate/constants.ts',
  'src/features/appUpdate/types.ts',
  'expo.base.json',
  'package.json',
  'package-lock.json',
  'workers/app-config/config/app-update.json',
];
const TSX = join(REPO_ROOT, 'node_modules/.bin/tsx');
const APP_FILE = 'src/features/appUpdate/types.ts';

let dir: string;
const git = (...args: string[]) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
const hook = () => execFileSync(TSX, ['scripts/bump-version.ts', '--if-needed'], { cwd: dir, stdio: 'pipe' });
const version = () => readExpoVersionInfo(JSON.parse(readFileSync(join(dir, 'expo.base.json'), 'utf8')));
const stageAppChange = () => {
  appendFileSync(join(dir, APP_FILE), '// change\n');
  git('add', APP_FILE);
};

describe('pre-commit version bump', () => {
  const main = readExpoVersionInfo(JSON.parse(readFileSync(join(REPO_ROOT, 'expo.base.json'), 'utf8')));

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'bump-hook-'));
    for (const path of FILES) cpSync(join(REPO_ROOT, path), join(dir, path), { recursive: true });
    git('init', '-q', '-b', 'main');
    git('config', 'user.email', 'test@example.com');
    git('config', 'user.name', 'test');
    git('add', '-A');
    git('commit', '-qm', 'base');
    git('update-ref', 'refs/remotes/origin/main', 'HEAD');
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('bumps from main and stages the version files', () => {
    stageAppChange();
    hook();
    const bumped = { version: nextVersion(main.version, 'patch'), versionCode: (main.versionCode ?? 0) + 1 };
    expect(version()).toEqual(bumped);
    expect(git('diff', '--cached', '--name-only').split('\n')).toEqual(
      expect.arrayContaining(['expo.base.json', 'package.json', 'package-lock.json']),
    );
  }, 60_000);

  it('keeps a version bumped by hand (npm run version:minor) instead of overwriting it', () => {
    execFileSync(TSX, ['scripts/bump-version.ts', 'minor'], { cwd: dir, stdio: 'pipe' });
    git('add', '-A');
    stageAppChange();
    hook();
    expect(version()).toEqual({ version: nextVersion(main.version, 'minor'), versionCode: (main.versionCode ?? 0) + 1 });
  }, 60_000);

  it('does nothing when no app file is staged', () => {
    hook();
    expect(version()).toEqual(main);
  }, 60_000);

  it('refuses instead of staging unsaved edits in a version file', () => {
    stageAppChange();
    appendFileSync(join(dir, 'package.json'), '\n');
    expect(hook).toThrow();
    expect(version()).toEqual(main);
  }, 60_000);
});
