package com.healthos.alarm

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.view.WindowManager

object AlarmLaunchHelper {
    fun isMedicationReminderIntent(intent: Intent?): Boolean {
        if (intent == null) return false
        val data: Uri? = intent.data
        if (data?.scheme == "healthos" && data.host == "reminder") return true
        return intent.hasExtra("medicationId")
    }

    fun applyReminderLaunchFlags(activity: Activity, intent: Intent?) {
        if (!isMedicationReminderIntent(intent)) return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            activity.setShowWhenLocked(true)
            activity.setTurnScreenOn(true)
        }
        activity.window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
        )
    }
}
