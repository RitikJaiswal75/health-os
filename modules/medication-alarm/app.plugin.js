const fs = require('fs');
const path = require('path');
const {
  withAndroidManifest,
  withMainApplication,
  withMainActivity,
  withDangerousMod,
  createRunOncePlugin,
} = require('@expo/config-plugins');

const RECEIVER_CLASS = 'com.healthos.alarm.MedicationAlarmReceiver';
const PACKAGE_IMPORT = 'import com.healthos.alarm.MedicationAlarmPackage';
const PACKAGE_ADD = 'add(MedicationAlarmPackage())';

function copyAlarmSources(projectRoot) {
  const src = path.join(projectRoot, 'modules/medication-alarm/android/src/main/java/com/healthos/alarm');
  const dest = path.join(projectRoot, 'android/app/src/main/java/com/healthos/alarm');
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const file of fs.readdirSync(src)) {
    if (file.endsWith('.kt')) {
      fs.copyFileSync(path.join(src, file), path.join(dest, file));
    }
  }
}

function withMedicationAlarmSources(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      copyAlarmSources(config.modRequest.projectRoot);
      return config;
    },
  ]);
}

function withMedicationAlarmPackage(config) {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;
    if (!contents.includes(PACKAGE_IMPORT)) {
      if (contents.includes('import com.facebook.react.ReactApplication')) {
        contents = contents.replace(
          /import com\.facebook\.react\.ReactApplication/,
          `import com.facebook.react.ReactApplication\n${PACKAGE_IMPORT}`,
        );
      } else {
        contents = `${PACKAGE_IMPORT}\n${contents}`;
      }
    }
    if (!contents.includes('MedicationAlarmPackage')) {
      if (contents.includes('PackageList(this).packages.apply')) {
        contents = contents.replace(
          /PackageList\(this\)\.packages\.apply\s*\{/,
          `PackageList(this).packages.apply {\n          ${PACKAGE_ADD}`,
        );
      } else if (contents.includes('return packages')) {
        contents = contents.replace(
          /return packages/,
          `${PACKAGE_ADD}\n          return packages`,
        );
      }
    }
    config.modResults.contents = contents;
    return config;
  });
}

function withAlarmMainActivity(config) {
  return withMainActivity(config, (config) => {
    let contents = config.modResults.contents;
    if (contents.includes('AlarmLaunchHelper')) {
      return config;
    }

    contents = contents.replace(
      'import android.os.Bundle',
      'import android.os.Bundle\nimport android.content.Intent\nimport com.healthos.alarm.AlarmLaunchHelper',
    );

    contents = contents.replace(
      'super.onCreate(null)',
      'AlarmLaunchHelper.applyReminderLaunchFlags(this, intent)\n    super.onCreate(null)',
    );

    if (!contents.includes('override fun onNewIntent')) {
      contents = contents.replace(
        /(\s+\/\*\*\s*\n\s+\* Align the back button behavior)/,
        `
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    AlarmLaunchHelper.applyReminderLaunchFlags(this, intent)
  }

$1`,
      );
    }

    config.modResults.contents = contents;
    return config;
  });
}

function withMedicationAlarmManifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const application = manifest.application?.[0];
    if (!application) return config;

    if (!application.receiver) application.receiver = [];
    const hasReceiver = application.receiver.some(
      (r) => r.$?.['android:name'] === RECEIVER_CLASS,
    );
    if (!hasReceiver) {
      application.receiver.push({
        $: {
          'android:name': RECEIVER_CLASS,
          'android:exported': 'false',
          'android:enabled': 'true',
        },
        'intent-filter': [
          { action: [{ $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } }] },
          { action: [{ $: { 'android:name': 'com.healthos.app.ALARM_FIRE' } }] },
        ],
      });
    }

    if (!application.activity) application.activity = [];
    const hasActivity = application.activity.some(
      (a) => a.$?.['android:name'] === 'com.healthos.alarm.MedicationAlarmActivity',
    );
    if (!hasActivity) {
      application.activity.push({
        $: {
          'android:name': 'com.healthos.alarm.MedicationAlarmActivity',
          'android:exported': 'false',
          'android:launchMode': 'singleTask',
          'android:showWhenLocked': 'true',
          'android:turnScreenOn': 'true',
          'android:theme': '@style/Theme.AppCompat.NoActionBar',
        },
      });
    }

    if (!manifest['uses-permission']) manifest['uses-permission'] = [];
    const perms = [
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.USE_FULL_SCREEN_INTENT',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.WAKE_LOCK',
      'android.permission.VIBRATE',
      'android.permission.POST_NOTIFICATIONS',
    ];
    for (const perm of perms) {
      if (!manifest['uses-permission'].some((p) => p.$?.['android:name'] === perm)) {
        manifest['uses-permission'].push({ $: { 'android:name': perm } });
      }
    }

    return config;
  });
}

function withMedicationAlarm(config) {
  config = withMedicationAlarmManifest(config);
  config = withMedicationAlarmPackage(config);
  config = withAlarmMainActivity(config);
  config = withMedicationAlarmSources(config);
  return config;
}

module.exports = createRunOncePlugin(withMedicationAlarm, 'medication-alarm', '1.4.0');
