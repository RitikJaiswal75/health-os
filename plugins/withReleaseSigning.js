const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Signs `assembleRelease` with a private keystore when ANDROID_RELEASE_KEYSTORE is set (CI release).
 * Without it the template's public debug key is used, which lets anyone sign an "update".
 * Passwords are read by Gradle from the environment, so they never land in build.gradle.
 * EAS builds don't set the variable and keep their own signing.
 */
const RELEASE_SIGNING_CONFIG = `        release {
            storeFile file(System.getenv('ANDROID_RELEASE_KEYSTORE'))
            storePassword System.getenv('ANDROID_RELEASE_KEYSTORE_PASSWORD')
            keyAlias System.getenv('ANDROID_RELEASE_KEY_ALIAS')
            keyPassword System.getenv('ANDROID_RELEASE_KEY_PASSWORD')
        }`;

function applyReleaseSigning(buildGradle) {
  if (buildGradle.includes('ANDROID_RELEASE_KEYSTORE')) return buildGradle;
  const releaseUsesRelease = buildGradle.replace(
    /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
    '$1signingConfig signingConfigs.release',
  );
  if (releaseUsesRelease === buildGradle) {
    throw new Error('[withReleaseSigning] release buildType signingConfig not found in app/build.gradle');
  }
  return releaseUsesRelease.replace(
    /signingConfigs\s*\{/,
    (match) => `${match}\n${RELEASE_SIGNING_CONFIG}`,
  );
}

function withReleaseSigning(config) {
  if (!process.env.ANDROID_RELEASE_KEYSTORE) return config;
  return withAppBuildGradle(config, (config) => {
    config.modResults.contents = applyReleaseSigning(config.modResults.contents);
    return config;
  });
}

module.exports = withReleaseSigning;
module.exports.applyReleaseSigning = applyReleaseSigning;
