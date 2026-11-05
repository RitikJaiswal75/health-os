package com.healthos.alarm

import android.content.Intent
import android.os.Bundle
import android.view.KeyEvent
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.health.os.BuildConfig
import expo.modules.ReactActivityDelegateWrapper
import expo.modules.splashscreen.SplashScreenManager

/** Full-screen reminder entry point — wakes the device and shows over the lock screen. */
class MedicationAlarmActivity : ReactActivity() {
    override fun getMainComponentName(): String = "main"

    override fun onCreate(savedInstanceState: Bundle?) {
        AlarmLaunchHelper.applyReminderLaunchFlags(this, intent)
        SplashScreenManager.registerOnActivity(this)
        super.onCreate(null)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        AlarmLaunchHelper.applyReminderLaunchFlags(this, intent)
    }

    // Either volume key silences the ringing alarm; the reminder, notification and wake lock stay.
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN || keyCode == KeyEvent.KEYCODE_VOLUME_UP) {
            // Only swallow the key when it silenced a ringing alarm; otherwise adjust volume as usual.
            if (AlarmSoundController.stopPlaybackOnly()) return true
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return ReactActivityDelegateWrapper(
            this,
            BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
            object : DefaultReactActivityDelegate(
                this,
                mainComponentName,
                fabricEnabled,
            ) {},
        )
    }
}
