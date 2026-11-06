/* eslint-disable @typescript-eslint/no-require-imports */
const medicationAlarmPlugin = require('../../modules/medication-alarm/app.plugin');
const { patchMainActivity } = medicationAlarmPlugin as {
  patchMainActivity: (contents: string) => string;
};

const UNPATCHED = `package com.health.os

import android.os.Bundle
import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
  }
}
`;

// What an earlier prebuild left behind: launch flags patched in, but no volume-key handler.
const PATCHED_WITHOUT_KEYS = `package com.health.os

import android.os.Bundle
import android.content.Intent
import com.healthos.alarm.AlarmLaunchHelper
import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    AlarmLaunchHelper.applyReminderLaunchFlags(this, intent)
    super.onCreate(null)
  }
}
`;

describe('medication-alarm MainActivity patch', () => {
  it('routes volume keys to the alarm helper in the activity that shows the reminder', () => {
    const patched = patchMainActivity(UNPATCHED);
    expect(patched).toContain('import android.view.KeyEvent');
    expect(patched).toContain('override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean');
    expect(patched).toContain('AlarmLaunchHelper.silenceAlarmOnVolumeKey(keyCode)');
    expect(patched).toContain('return super.onKeyDown(keyCode, event)');
  });

  it('adds the handler to a MainActivity patched by an earlier prebuild', () => {
    expect(patchMainActivity(PATCHED_WITHOUT_KEYS)).toContain('silenceAlarmOnVolumeKey(keyCode)');
  });

  it('is idempotent', () => {
    const once = patchMainActivity(UNPATCHED);
    expect(patchMainActivity(once)).toBe(once);
  });
});
