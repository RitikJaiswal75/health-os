package com.healthos.alarm

import android.content.Context

/** Stable PendingIntent request codes — avoids hashCode() collisions for same-time alarms. */
object AlarmRequestCodes {
    private const val PREFS_NAME = "medication_alarm_prefs"
    private const val KEY_NEXT_CODE = "next_alarm_request_code"

    fun requestCodeFor(context: Context, alarmId: String): Int {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val storageKey = "rc_$alarmId"
        val existing = prefs.getInt(storageKey, -1)
        if (existing >= 0) return existing

        val nextCode = prefs.getInt(KEY_NEXT_CODE, 10_000)
        prefs.edit()
            .putInt(storageKey, nextCode)
            .putInt(KEY_NEXT_CODE, nextCode + 1)
            .apply()
        return nextCode
    }

    fun release(context: Context, alarmId: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().remove("rc_$alarmId").apply()
    }
}
