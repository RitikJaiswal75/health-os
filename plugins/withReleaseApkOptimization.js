const { withGradleProperties, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MINIFY_PROPERTIES = [
  { type: 'property', key: 'android.enableMinifyInReleaseBuilds', value: 'true' },
  { type: 'property', key: 'android.enableShrinkResourcesInReleaseBuilds', value: 'true' },
];

/** EAS/local release Kotlin compile can exhaust the default 512m metaspace cap. */
const GRADLE_MEMORY_PROPERTIES = [
  {
    type: 'property',
    key: 'org.gradle.jvmargs',
    value: '-Xmx4096m -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8',
  },
  {
    type: 'property',
    key: 'kotlin.daemon.jvmargs',
    value: '-Xmx2048m -XX:MaxMetaspaceSize=1024m',
  },
];

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
  const jvmargs = 'org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8';
  const kotlinJvmargs = 'kotlin.daemon.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=1024m';

  let next = contents;
  if (/^org\.gradle\.jvmargs=/m.test(next)) {
    next = next.replace(/^org\.gradle\.jvmargs=.*$/m, jvmargs);
  } else {
    next = `${next.trim()}\n${jvmargs}\n`;
  }

  if (/^kotlin\.daemon\.jvmargs=/m.test(next)) {
    next = next.replace(/^kotlin\.daemon\.jvmargs=.*$/m, kotlinJvmargs);
  } else {
    next = `${next.trim()}\n${kotlinJvmargs}\n`;
  }

  return next;
}

function withReleaseApkOptimization(config) {
  config = withGradleProperties(config, (config) => {
    let modResults = config.modResults;
    for (const property of [...MINIFY_PROPERTIES, ...GRADLE_MEMORY_PROPERTIES]) {
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
