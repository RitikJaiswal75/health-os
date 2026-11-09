import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { applyVersion, nextVersion } from '../../scripts/release/bump';
import { readExpoVersionInfo } from '../../scripts/release/checks';
import {
  APP_UPDATE_CONFIG_FILE,
  EXPO_BASE_JSON,
  PACKAGE_JSON,
  PACKAGE_LOCK_JSON,
  REPO_ROOT,
} from '../../scripts/release/constants';

describe('version bump', () => {
  it.each([
    ['2.1.1', 'patch', '2.1.2'],
    ['2.1.1', 'minor', '2.2.0'],
    ['2.1.1', 'major', '3.0.0'],
    ['2.9.9', 'patch', '2.9.10'],
  ] as const)('%s + %s → %s', (from, level, to) => {
    expect(nextVersion(from, level)).toBe(to);
  });

  it('rejects a version that is not x.y.z', () => {
    expect(() => nextVersion('2.1', 'patch')).toThrow('x.y.z');
  });

  it('updates every version field in the real files and nothing else', () => {
    const files = Object.fromEntries(
      [EXPO_BASE_JSON, PACKAGE_JSON, PACKAGE_LOCK_JSON, APP_UPDATE_CONFIG_FILE].map((path) => [
        path,
        readFileSync(resolve(REPO_ROOT, path), 'utf8'),
      ]),
    );
    const out = applyVersion(files, '9.8.7', 1234);

    expect(readExpoVersionInfo(JSON.parse(out[EXPO_BASE_JSON]))).toEqual({ version: '9.8.7', versionCode: 1234 });
    expect(JSON.parse(out[PACKAGE_JSON]).version).toBe('9.8.7');
    const lock = JSON.parse(out[PACKAGE_LOCK_JSON]);
    expect([lock.version, lock.packages[''].version]).toEqual(['9.8.7', '9.8.7']);
    const config = JSON.parse(out[APP_UPDATE_CONFIG_FILE]);
    expect(config.android.latestVersion).toBe('9.8.7');
    // minSupportedVersion and dependency versions are untouched.
    expect(config.android.minSupportedVersion).toBe(JSON.parse(files[APP_UPDATE_CONFIG_FILE]).android.minSupportedVersion);
    const changed = (a: string, b: string) => a.split('\n').filter((line, i) => line !== b.split('\n')[i]).length;
    expect(changed(files[PACKAGE_LOCK_JSON], out[PACKAGE_LOCK_JSON])).toBe(2);
    expect(changed(files[EXPO_BASE_JSON], out[EXPO_BASE_JSON])).toBe(2);
  });
});
