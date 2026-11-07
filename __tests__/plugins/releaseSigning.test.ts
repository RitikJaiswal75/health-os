/* eslint-disable @typescript-eslint/no-require-imports */
const { applyReleaseSigning } = require('../../plugins/withReleaseSigning');

// The signing part of the React Native template's android/app/build.gradle.
const TEMPLATE = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            signingConfig signingConfigs.debug
            minifyEnabled enableMinifyInReleaseBuilds
        }
    }
}`;

describe('withReleaseSigning', () => {
  it('signs release with the private keystore and leaves debug alone', () => {
    const out: string = applyReleaseSigning(TEMPLATE);
    const [, buildTypes] = out.split('buildTypes {');
    const [debugType, releaseType] = buildTypes.split('release {');

    expect(debugType).toContain('signingConfig signingConfigs.debug');
    expect(releaseType).toContain('signingConfig signingConfigs.release');
    expect(releaseType).not.toContain('signingConfigs.debug');
    expect(out).toContain("storeFile file(System.getenv('ANDROID_RELEASE_KEYSTORE'))");
    expect(applyReleaseSigning(out)).toBe(out);
  });

  it('fails the build instead of silently shipping debug-signed when the template changes', () => {
    expect(() => applyReleaseSigning('android {}')).toThrow('signingConfig not found');
  });
});
