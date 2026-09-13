package com.healthos.alarm

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.view.WindowManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap

object AlarmLaunchHelper {
    const val ACTION_REMINDER_OPEN = "com.health.os.REMINDER_OPEN"

    private var pendingLaunch: WritableMap? = null

    fun isMedicationReminderIntent(intent: Intent?): Boolean {
        if (intent == null) return false
        if (intent.action == ACTION_REMINDER_OPEN) return true
        val data: Uri? = intent.data
        if (data?.scheme == "healthos" && data.host == "reminder") return true
        return intent.hasExtra("alarmId") && intent.hasExtra("medicationId")
    }

    fun reminderParamsFromIntent(intent: Intent?): WritableMap? {
        if (!isMedicationReminderIntent(intent) || intent == null) return null
        val medicationId = intent.getStringExtra("medicationId") ?: return null
        val alarmId = intent.getStringExtra("alarmId") ?: return null
        val scheduledAt = intent.getStringExtra("scheduledAt") ?: ""
        val map = Arguments.createMap()
        map.putString("medicationId", medicationId)
        map.putString("alarmId", alarmId)
        map.putString("scheduledAt", scheduledAt)
        val doseEventId = intent.getStringExtra("doseEventId")
        if (!doseEventId.isNullOrBlank()) {
            map.putString("doseEventId", doseEventId)
        }
        return map
    }

    fun captureReminderLaunch(intent: Intent?): Boolean {
        val params = reminderParamsFromIntent(intent) ?: return false
        val alarmId = params.getString("alarmId") ?: return false
        if (pendingLaunch?.getString("alarmId") == alarmId) return false
        pendingLaunch = params
        return true
    }

    fun consumeReminderLaunch(): WritableMap? {
        val launch = pendingLaunch
        pendingLaunch = null
        return launch
    }

    fun peekReminderLaunch(): WritableMap? = pendingLaunch

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
