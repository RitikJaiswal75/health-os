const { withAppBuildGradle, withGradleProperties, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');
const { isLocalBuild } = require('./localBuild');

const MINIFY_PROPERTIES = [
  { type: 'property', key: 'android.enableMinifyInReleaseBuilds', value: 'true' },
  { type: 'property', key: 'android.enableShrinkResourcesInReleaseBuilds', value: 'true' },
];

/** Release Kotlin compile can exhaust the default 512m metaspace cap. */
const GRADLE_MEMORY_PROPERTIES = [
  {
    type: 'property',
    key: 'org.gradle.jvmargs',
    value: '-Xmx4096m -XX:MaxMetaspaceSize=768m -Dfile.encoding=UTF-8',
  },
  { type: 'property', key: 'org.gradle.caching', value: 'true' },
  { type: 'property', key: 'org.gradle.daemon', value: 'true' },
  { type: 'property', key: 'kotlin.daemon.jvmargs', value: '-Xmx1536m' },
];

/** Local builds only: cap workers so a release build doesn't saturate this machine's CPU and RAM. */
const LOCAL_THROTTLE_PROPERTIES = [
  { type: 'property', key: 'org.gradle.workers.max', value: '2' },
  { type: 'property', key: 'org.gradle.parallel', value: 'false' },
];

function gradlePropertiesForBuild() {
  return isLocalBuild()
    ? [...GRADLE_MEMORY_PROPERTIES, ...LOCAL_THROTTLE_PROPERTIES]
    : GRADLE_MEMORY_PROPERTIES;
}

const ALARM_PROGUARD = `
# medication-alarm native module
-keep class com.healthos.alarm.** { *; }
-keepclassmembers class com.healthos.alarm.MedicationAlarmReceiver { *; }
-keepclassmembers class com.healthos.alarm.MedicationAlarmModule { *; }
`.trim();

function upsertGradleProperty(modResults, key, value) {
  const withoutKey = modResults.filter(
    (item) => item.type !== 'property' || item.key !== key,
  );
  return [...withoutKey, { type: 'property', key, value }];
}

function ensureGradleMemorySettings(contents) {
  let next = contents;
  for (const { key, value } of gradlePropertiesForBuild()) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key.replace(/\./g, '\\.')}=.*$`, 'm');
    next = pattern.test(next) ? next.replace(pattern, line) : `${next.trim()}\n${line}\n`;
  }
  return next;
}

/**
 * Local builds only: skip lintVital* on release builds; it's slow and doesn't change the APK.
 * EAS cloud builds keep it, so release-blocking lint errors still fail a cloud build.
 */
const RELEASE_LINT_BLOCK = `    lint {
        checkReleaseBuilds false
        abortOnError false
    }`;

function ensureReleaseLintDisabled(buildGradle) {
  if (/^\s*lint\s*\{/m.test(buildGradle)) return buildGradle;
  return buildGradle.replace(/^android\s*\{\s*$/m, (match) => `${match}\n${RELEASE_LINT_BLOCK}`);
}

function withReleaseApkOptimization(config) {
  if (isLocalBuild()) {
    config = withAppBuildGradle(config, (config) => {
      config.modResults.contents = ensureReleaseLintDisabled(config.modResults.contents);
      return config;
    });
  }

  config = withGradleProperties(config, (config) => {
    let modResults = config.modResults;
    for (const property of [...MINIFY_PROPERTIES, ...gradlePropertiesForBuild()]) {
      modResults = upsertGradleProperty(modResults, property.key, property.value);
    }
    config.modResults = modResults;
    return config;
  });

  return withDangerousMod(config, [
    'android',
    async (config) => {
      const androidRoot = config.modRequest.platformProjectRoot;
      const gradlePropsPath = path.join(androidRoot, 'gradle.properties');
      const gradleProps = ensureGradleMemorySettings(fs.readFileSync(gradlePropsPath, 'utf8'));
      fs.writeFileSync(gradlePropsPath, gradleProps);

      const proguardPath = path.join(androidRoot, 'app', 'proguard-rules.pro');
      let contents = fs.readFileSync(proguardPath, 'utf8');
      if (!contents.includes('com.healthos.alarm')) {
        contents = `${contents.trim()}\n\n${ALARM_PROGUARD}\n`;
        fs.writeFileSync(proguardPath, contents);
      }
      return config;
    },
  ]);
}

module.exports = withReleaseApkOptimization;
module.exports.gradlePropertiesForBuild = gradlePropertiesForBuild;
