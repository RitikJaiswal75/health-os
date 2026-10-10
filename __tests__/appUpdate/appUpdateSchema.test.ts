import { parseAppUpdateConfig } from '../../src/features/appUpdate/appUpdateSchema';

const STORE_URL = 'https://play.google.com/store/apps/details?id=com.health.os';

describe('parseAppUpdateConfig', () => {
  it('accepts a full android config', () => {
    const config = {
      version: 1,
      android: { latestVersion: '2.1.0', minSupportedVersion: '2.0.2', storeUrl: STORE_URL },
    };
    expect(parseAppUpdateConfig(config)).toEqual(config);
  });

  it('accepts a config without minSupportedVersion or storeUrl', () => {
    expect(parseAppUpdateConfig({ version: 1, android: { latestVersion: '2.0.2' } })).toEqual({
      version: 1,
      android: { latestVersion: '2.0.2' },
    });
  });

  it('accepts a config with no platforms', () => {
    expect(parseAppUpdateConfig({ version: 1 })).toEqual({ version: 1 });
  });

  it('ignores unknown keys so old installs can read newer configs', () => {
    expect(
      parseAppUpdateConfig({
        version: 2,
        rolloutPercent: 50,
        windows: { anything: true },
        android: { latestVersion: '2.1.0', forceAfter: '2026-12-01' },
      }),
    ).toEqual({ version: 2, android: { latestVersion: '2.1.0' } });
  });

  it('allows minSupportedVersion equal to latestVersion', () => {
    expect(
      parseAppUpdateConfig({
        version: 1,
        android: { latestVersion: '2.1.0', minSupportedVersion: '2.1.0' },
      }),
    ).not.toBeNull();
  });

  it('rejects minSupportedVersion above latestVersion', () => {
    expect(
      parseAppUpdateConfig({
        version: 1,
        android: { latestVersion: '2.0.2', minSupportedVersion: '2.1.0' },
      }),
    ).toBeNull();
  });

  it('rejects bad versions', () => {
    expect(parseAppUpdateConfig({ version: 1, android: { latestVersion: '2.1.0-beta' } })).toBeNull();
    expect(
      parseAppUpdateConfig({
        version: 1,
        android: { latestVersion: '2.1.0', minSupportedVersion: 'two' },
      }),
    ).toBeNull();
  });

  it('rejects a missing or malformed platform shape', () => {
    expect(parseAppUpdateConfig({ version: 1, android: {} })).toBeNull();
    expect(parseAppUpdateConfig({ version: 1, android: ['2.1.0'] })).toBeNull();
    expect(parseAppUpdateConfig({ version: 1, android: null })).toBeNull();
  });

  it('rejects a non-https storeUrl', () => {
    expect(
      parseAppUpdateConfig({
        version: 1,
        android: { latestVersion: '2.1.0', storeUrl: 'http://example.com' },
      }),
    ).toBeNull();
  });

  it('rejects a wrong version field', () => {
    expect(parseAppUpdateConfig({ android: { latestVersion: '2.1.0' } })).toBeNull();
    expect(parseAppUpdateConfig({ version: 0 })).toBeNull();
    expect(parseAppUpdateConfig({ version: '1' })).toBeNull();
    expect(parseAppUpdateConfig(null)).toBeNull();
  });
});
