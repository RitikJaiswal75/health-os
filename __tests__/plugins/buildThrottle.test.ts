/* eslint-disable @typescript-eslint/no-require-imports */
const withNativeBuildJobLimit = require('../../plugins/withNativeBuildJobLimit');
const withReleaseApkOptimization = require('../../plugins/withReleaseApkOptimization');
const { gradlePropertiesForBuild } = withReleaseApkOptimization;

function appBuildGradleMod(): unknown {
  return withReleaseApkOptimization({ name: 'health-os', slug: 'health-os' }).mods?.android
    ?.appBuildGradle;
}

type GradleProperty = { key: string; value: string };

const THROTTLE_KEYS = ['org.gradle.workers.max', 'org.gradle.parallel'];

function propertyKeys(): string[] {
  return (gradlePropertiesForBuild() as GradleProperty[]).map((property) => property.key);
}

describe('local build throttling', () => {
  const originalLocalBuild = process.env.LOCAL_BUILD;

  afterEach(() => {
    if (originalLocalBuild === undefined) delete process.env.LOCAL_BUILD;
    else process.env.LOCAL_BUILD = originalLocalBuild;
  });

  describe('on EAS cloud builds (LOCAL_BUILD unset)', () => {
    beforeEach(() => {
      delete process.env.LOCAL_BUILD;
    });

    it('leaves native CMake parallelism alone', () => {
      const config = withNativeBuildJobLimit({ name: 'health-os', slug: 'health-os' });
      expect(config.mods?.android?.projectBuildGradle).toBeUndefined();
    });

    it('does not cap Gradle workers or disable parallel builds', () => {
      expect(propertyKeys()).toEqual(expect.not.arrayContaining(THROTTLE_KEYS));
    });

    it('keeps release lint (lintVital) on', () => {
      expect(appBuildGradleMod()).toBeUndefined();
    });

    it('keeps the memory settings', () => {
      expect(propertyKeys()).toEqual(
        expect.arrayContaining(['org.gradle.jvmargs', 'kotlin.daemon.jvmargs']),
      );
    });
  });

  describe('on local builds (LOCAL_BUILD=1)', () => {
    beforeEach(() => {
      process.env.LOCAL_BUILD = '1';
    });

    it('caps native CMake parallelism', () => {
      const config = withNativeBuildJobLimit({ name: 'health-os', slug: 'health-os' });
      expect(config.mods?.android?.projectBuildGradle).toEqual(expect.any(Function));
    });

    it('caps Gradle workers and disables parallel builds', () => {
      expect(propertyKeys()).toEqual(expect.arrayContaining(THROTTLE_KEYS));
    });

    it('skips release lint to save build time', () => {
      expect(appBuildGradleMod()).toEqual(expect.any(Function));
    });
  });
});
