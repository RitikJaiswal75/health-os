import {
  checkAdvertisedVersion,
  checkVersionBump,
  readExpoVersionInfo,
} from '../../scripts/release/checks';

const BASE = { version: '2.0.2', versionCode: 5 };

describe('readExpoVersionInfo', () => {
  it('reads version and versionCode from expo.base.json', () => {
    expect(readExpoVersionInfo({ expo: { version: '2.0.2', android: { versionCode: 5 } } })).toEqual(BASE);
  });

  it('returns blanks for a missing shape', () => {
    expect(readExpoVersionInfo({})).toEqual({ version: '', versionCode: null });
  });
});

describe('checkVersionBump', () => {
  it('passes when version and versionCode both increase and package.json matches', () => {
    expect(checkVersionBump(BASE, { version: '2.0.3', versionCode: 6 }, '2.0.3')).toEqual([]);
  });

  it('fails when the version is not bumped', () => {
    const errors = checkVersionBump(BASE, { version: '2.0.2', versionCode: 6 }, '2.0.2');
    expect(errors[0]).toBe(
      'expo.base.json version 2.0.2 must be greater than main (2.0.2). Bump it or remove app changes.',
    );
  });

  it('fails when the versionCode is not bumped', () => {
    const errors = checkVersionBump(BASE, { version: '2.0.3', versionCode: 5 }, '2.0.3');
    expect(errors[0]).toContain('android.versionCode 5 must be greater than main (5)');
  });

  it('fails when package.json drifts from expo.base.json', () => {
    const errors = checkVersionBump(BASE, { version: '2.0.3', versionCode: 6 }, '2.0.2');
    expect(errors[0]).toBe('package.json version 2.0.2 must equal expo.base.json version 2.0.3.');
  });

  it('compares numerically, not as strings', () => {
    expect(
      checkVersionBump({ version: '2.9.0', versionCode: 9 }, { version: '2.10.0', versionCode: 10 }, '2.10.0'),
    ).toEqual([]);
  });

  it('fails on a malformed head version or missing versionCode', () => {
    const errors = checkVersionBump(BASE, { version: '2.1.0-beta', versionCode: null }, '2.1.0-beta');
    expect(errors).toEqual(
      expect.arrayContaining([
        'expo.base.json version "2.1.0-beta" is not a valid x.y.z version.',
        'expo.base.json android.versionCode must be an integer.',
      ]),
    );
  });

  it('appends a summary line on failure', () => {
    const errors = checkVersionBump(BASE, BASE, '2.0.2');
    expect(errors[errors.length - 1]).toBe(
      'main: 2.0.2, versionCode 5 · this PR: 2.0.2, versionCode 5',
    );
  });
});

describe('checkAdvertisedVersion', () => {
  it('passes when latestVersion is at or below the app version', () => {
    expect(checkAdvertisedVersion({ version: 1, android: { latestVersion: '2.0.2' } }, '2.0.2')).toEqual([]);
    expect(checkAdvertisedVersion({ version: 1 }, '2.0.2')).toEqual([]);
  });

  it('fails when latestVersion is newer than the app version', () => {
    expect(checkAdvertisedVersion({ version: 1, android: { latestVersion: '2.1.0' } }, '2.0.2')).toEqual([
      'app-update.json android.latestVersion 2.1.0 is newer than the app version 2.0.2.',
    ]);
  });
});
