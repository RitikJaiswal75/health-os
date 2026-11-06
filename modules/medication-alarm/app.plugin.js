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
const PACKAGE_REGISTERED = PACKAGE_ADD;

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
    if (!contents.includes(PACKAGE_REGISTERED)) {
      if (contents.includes('PackageList(this).packages.apply')) {
        contents = contents.replace(
          /PackageList\(this\)\.packages\.apply\s*\{/,
          `PackageList(this).packages.apply {\n          ${PACKAGE_ADD}`,
        );
      } else if (contents.includes('return packages')) {
        contents = contents.replace(/return packages/, `${PACKAGE_ADD}\n          return packages`);
      }
    }
    config.modResults.contents = contents;
    return config;
  });
}

const LAUNCH_FLAGS_CALL = 'AlarmLaunchHelper.applyReminderLaunchFlags(this, intent)';
const NEW_INTENT_CAPTURE = 'MedicationAlarmModule.captureReminderLaunchFromActivity(intent)';
const VOLUME_KEY_CALL = 'AlarmLaunchHelper.silenceAlarmOnVolumeKey(keyCode)';
// The lock-screen call must sit in onCreate before super.onCreate (not just anywhere in the file).
const ONCREATE_FLAGS = /override fun onCreate[\s\S]*?applyReminderLaunchFlags\(this, intent\)[\s\S]*?super\.onCreate\(/;

// Volume up/down silences a ringing alarm. It lives in MainActivity because that is the activity
// the reminder intent opens (MedicationAlarmReceiver.buildReminderActivityIntent).
const VOLUME_KEY_HANDLER = `  override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
    if (${VOLUME_KEY_CALL}) return true
    return super.onKeyDown(keyCode, event)
  }
`;

function addImport(contents, fqcn) {
  const line = `import ${fqcn}`;
  if (contents.includes(line)) return contents;
  return contents.replace('import android.os.Bundle', `import android.os.Bundle\n${line}`);
}

/**
 * Pure string patch of the generated MainActivity (unit tested). Each step has its own marker, so
 * the result never depends on which steps ran before (Expo runs mods in reverse order, and a
 * shared "already patched" guard once made the lock-screen step skip itself). It throws if an
 * anchor is missing, so prebuild fails loudly instead of shipping an app that cannot show the
 * reminder over the lock screen.
 */
function patchMainActivity(source) {
  let contents = source;

  if (!ONCREATE_FLAGS.test(contents)) {
    contents = addImport(addImport(contents, 'android.content.Intent'), 'com.healthos.alarm.AlarmLaunchHelper');
    contents = contents.replace('super.onCreate(null)', `${LAUNCH_FLAGS_CALL}\n    super.onCreate(null)`);
  }

  if (!contents.includes('override fun onNewIntent')) {
    contents = contents.replace(
      /(\s+\/\*\*\s*\n\s+\* Align the back button behavior)/,
      `
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    ${LAUNCH_FLAGS_CALL}
    com.healthos.alarm.${NEW_INTENT_CAPTURE}
  }

$1`,
    );
  }

  if (!contents.includes(VOLUME_KEY_CALL)) {
    contents = addImport(addImport(contents, 'android.view.KeyEvent'), 'com.healthos.alarm.AlarmLaunchHelper');
    // Before the closing brace of the class (the last one in the file).
    contents = contents.replace(/\}\s*$/, `\n${VOLUME_KEY_HANDLER}}\n`);
  }

  const missing = [
    [ONCREATE_FLAGS.test(contents), 'launch flags in onCreate'],
    [contents.includes(NEW_INTENT_CAPTURE), 'new-intent capture'],
    [contents.includes(VOLUME_KEY_CALL), 'volume-key handler'],
  ].filter(([ok]) => !ok);
  if (missing.length > 0) {
    throw new Error(
      `medication-alarm: could not patch MainActivity (missing: ${missing.map(([, name]) => name).join(', ')}). ` +
        'The generated MainActivity changed; update modules/medication-alarm/app.plugin.js.',
    );
  }
  return contents;
}

function withAlarmMainActivity(config) {
  return withMainActivity(config, (config) => {
    config.modResults.contents = patchMainActivity(config.modResults.contents);
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
          { action: [{ $: { 'android:name': 'com.health.os.ALARM_FIRE' } }] },
        ],
      });
    }

    if (!application.service) application.service = [];
    const hasAlarmService = application.service.some(
      (s) => s.$?.['android:name'] === 'com.healthos.alarm.AlarmFireService',
    );
    if (!hasAlarmService) {
      application.service.push({
        $: {
          'android:name': 'com.healthos.alarm.AlarmFireService',
          'android:exported': 'false',
          'android:foregroundServiceType': 'mediaPlayback',
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
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
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

module.exports = Object.assign(
  createRunOncePlugin(withMedicationAlarm, 'medication-alarm', '1.7.2'),
  { patchMainActivity },
);
