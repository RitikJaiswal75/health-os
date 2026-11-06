/* eslint-disable @typescript-eslint/no-require-imports */
const medicationAlarmPlugin = require('../../modules/medication-alarm/app.plugin');
const { patchMainActivity } = medicationAlarmPlugin as {
  patchMainActivity: (contents: string) => string;
};

// Shape of the MainActivity that `expo prebuild` generates (the parts the patch anchors on).
const TEMPLATE = `package com.health.os

import android.os.Build
import android.os.Bundle
import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
  }

  override fun getMainComponentName(): String = "main"

  /**
    * Align the back button behavior with Android S
    */
  override fun invokeDefaultOnBackPressed() {
    super.invokeDefaultOnBackPressed()
  }
}
`;

const LOCK_SCREEN = 'AlarmLaunchHelper.applyReminderLaunchFlags(this, intent)';
const NEW_INTENT = 'MedicationAlarmModule.captureReminderLaunchFromActivity(intent)';
const VOLUME_KEYS = 'AlarmLaunchHelper.silenceAlarmOnVolumeKey(keyCode)';

describe('medication-alarm MainActivity patch', () => {
  it('adds lock-screen launch flags, new-intent capture and the volume-key handler', () => {
    const patched = patchMainActivity(TEMPLATE);
    expect(patched).toContain(LOCK_SCREEN);
    expect(patched).toContain(NEW_INTENT);
    expect(patched).toContain(VOLUME_KEYS);
    expect(patched).toContain('import android.view.KeyEvent');
    expect(patched).toContain('return super.onKeyDown(keyCode, event)');
  });

  it('puts the lock-screen flags before super.onCreate so the window is configured in time', () => {
    const patched = patchMainActivity(TEMPLATE);
    expect(patched.indexOf(LOCK_SCREEN)).toBeLessThan(patched.indexOf('super.onCreate(null)'));
  });

  it('still adds the lock-screen flags to a MainActivity that only has the volume-key handler', () => {
    // What the plugin used to produce when the volume-key step ran before the launch-flags step.
    const volumeOnly = patchMainActivity(TEMPLATE)
      .replace(`    ${LOCK_SCREEN}\n`, '')
      .replace(/\n {2}override fun onNewIntent[\s\S]*?\n {2}}\n/, '\n');
    expect(volumeOnly).not.toContain(LOCK_SCREEN);

    const repaired = patchMainActivity(volumeOnly);
    expect(repaired).toContain(LOCK_SCREEN);
    expect(repaired).toContain(NEW_INTENT);
  });

  it('imports each class once', () => {
    const patched = patchMainActivity(TEMPLATE);
    for (const line of [
      'import com.healthos.alarm.AlarmLaunchHelper',
      'import android.content.Intent',
      'import android.view.KeyEvent',
    ]) {
      expect(patched.split(line).length - 1).toBe(1);
    }
  });

  it('is idempotent', () => {
    const once = patchMainActivity(TEMPLATE);
    expect(patchMainActivity(once)).toBe(once);
  });

  it('fails the build instead of silently shipping an activity without lock-screen support', () => {
    const renamed = TEMPLATE.replace('super.onCreate(null)', 'super.onCreate(savedInstanceState)');
    expect(() => patchMainActivity(renamed)).toThrow(/MainActivity/);
  });
});
