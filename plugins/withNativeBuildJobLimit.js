const { withProjectBuildGradle } = require('@expo/config-plugins');
const { isLocalBuild } = require('./localBuild');

/** Parallel clang compiles per native library (Ninja defaults to one per core). */
const NATIVE_COMPILE_JOBS = 2;
const MARKER = '// @generated health-os: native build job limit';

/**
 * Caps CMake/Ninja parallelism for every Android module with native code (reanimated,
 * React Native, etc.) via Ninja job pools. Only scheduling changes; compiled output doesn't.
 */
const NATIVE_JOB_LIMIT_BLOCK = `${MARKER}
subprojects { sub ->
  ['com.android.library', 'com.android.application'].each { id ->
    sub.pluginManager.withPlugin(id) {
      sub.android.defaultConfig.externalNativeBuild.cmake.arguments(
        '-DCMAKE_JOB_POOLS=compile=${NATIVE_COMPILE_JOBS};link=1',
        '-DCMAKE_JOB_POOL_COMPILE=compile',
        '-DCMAKE_JOB_POOL_LINK=link'
      )
    }
  }
}
`;

function ensureNativeJobLimit(buildGradle) {
  if (buildGradle.includes(MARKER)) return buildGradle;
  // Register before the root plugins, which may configure child projects early.
  const anchor = /^apply plugin: "expo-root-project"/m;
  if (anchor.test(buildGradle)) {
    return buildGradle.replace(anchor, (match) => `${NATIVE_JOB_LIMIT_BLOCK}\n${match}`);
  }
  return `${buildGradle.trimEnd()}\n\n${NATIVE_JOB_LIMIT_BLOCK}`;
}

function withNativeBuildJobLimit(config) {
  if (!isLocalBuild()) return config;
  return withProjectBuildGradle(config, (config) => {
    config.modResults.contents = ensureNativeJobLimit(config.modResults.contents);
    return config;
  });
}

module.exports = withNativeBuildJobLimit;
module.exports.ensureNativeJobLimit = ensureNativeJobLimit;
