const { withGradleProperties, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MINIFY_PROPERTIES = [
  { type: 'property', key: 'android.enableMinifyInReleaseBuilds', value: 'true' },
  { type: 'property', key: 'android.enableShrinkResourcesInReleaseBuilds', value: 'true' },
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

function withReleaseApkOptimization(config) {
  config = withGradleProperties(config, (config) => {
    let modResults = config.modResults;
    for (const property of MINIFY_PROPERTIES) {
      modResults = upsertGradleProperty(modResults, property.key, property.value);
    }
    config.modResults = modResults;
    return config;
  });

  return withDangerousMod(config, [
    'android',
    async (config) => {
      const proguardPath = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro',
      );
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
