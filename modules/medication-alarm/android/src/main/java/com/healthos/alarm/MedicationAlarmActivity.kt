package com.healthos.alarm

import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import com.facebook.react.ReactActivity

class MedicationAlarmActivity : ReactActivity() {
    override fun getMainComponentName(): String = "main"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(null)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        }
        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
        )
    }

    override fun createReactActivityDelegate(): com.facebook.react.ReactActivityDelegate {
        return com.facebook.react.defaults.DefaultReactActivityDelegate(
            this,
            mainComponentName,
            com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled,
        )
    }
}
