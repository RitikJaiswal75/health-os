package com.healthos.alarm

import android.app.AlarmManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.ViewManager

class MedicationAlarmModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "MedicationAlarm"

    companion object {
        private const val PREFS_NAME = "medication_alarm_prefs"
        private const val KEY_SCHEDULED_IDS = "scheduled_alarm_ids"
    }

    private fun parseScheduledAtMillis(scheduledAt: String): Long {
        return if (scheduledAt.endsWith("Z") || scheduledAt.matches(Regex(".*[+-]\\d{2}:\\d{2}$"))) {
            java.time.Instant.parse(scheduledAt).toEpochMilli()
        } else {
            val normalized = when {
                scheduledAt.length >= 19 -> scheduledAt.substring(0, 19)
                scheduledAt.length == 16 -> "${scheduledAt}:00"
                else -> scheduledAt
            }
            java.time.LocalDateTime.parse(normalized)
                .atZone(java.time.ZoneId.systemDefault())
                .toInstant()
                .toEpochMilli()
        }
    }

    @ReactMethod
    fun scheduleAlarms(occurrences: ReadableArray, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val previous = prefs.getStringSet(KEY_SCHEDULED_IDS, emptySet())?.toMutableSet() ?: mutableSetOf()
            val next = mutableSetOf<String>()

            for (i in 0 until occurrences.size()) {
                val item = occurrences.getMap(i) ?: continue
                val id = item.getString("id") ?: continue
                val medicationId = item.getString("medicationId") ?: continue
                val scheduledAt = item.getString("scheduledAt") ?: continue
                val doseEventId = if (item.hasKey("doseEventId")) item.getString("doseEventId") else null
                val triggerAt = parseScheduledAtMillis(scheduledAt)
                next.add(id)
                MedicationAlarmReceiver.schedule(
                    reactContext, id, medicationId, triggerAt, scheduledAt, doseEventId,
                )
            }

            for (oldId in previous) {
                if (oldId !in next) {
                    MedicationAlarmReceiver.cancel(reactContext, oldId)
                }
            }

            prefs.edit().putStringSet(KEY_SCHEDULED_IDS, next).apply()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("SCHEDULE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun cancelAlarm(alarmId: String, promise: Promise) {
        try {
            MedicationAlarmReceiver.cancel(reactContext, alarmId)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("CANCEL_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun dismissReminderNotification(alarmId: String, promise: Promise) {
        try {
            MedicationAlarmReceiver.dismissNotification(reactContext, alarmId)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("DISMISS_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getPermissionState(promise: Promise) {
        val alarmManager = reactContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val map = Arguments.createMap()
        map.putBoolean("exactAlarm", if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            alarmManager.canScheduleExactAlarms()
        } else true)
        map.putBoolean("fullScreenIntent", if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            reactContext.getSystemService(NotificationManager::class.java).canUseFullScreenIntent()
        } else true)
        map.putBoolean("overlay", Settings.canDrawOverlays(reactContext))
        promise.resolve(map)
    }

    @ReactMethod
    fun requestPermission(kind: String, promise: Promise) {
        val intent = when (kind) {
            "full_screen_intent" -> Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT).apply {
                data = Uri.parse("package:${reactContext.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            "overlay" -> Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply {
                data = Uri.parse("package:${reactContext.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            "exact_alarm" -> Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            else -> null
        }
        if (intent != null) {
            val activity = reactContext.currentActivity
            if (activity != null) {
                activity.startActivity(intent)
            } else {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactContext.startActivity(intent)
            }
            promise.resolve(true)
        } else {
            promise.resolve(false)
        }
    }
}

class MedicationAlarmPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(MedicationAlarmModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<in Nothing, in Nothing>> =
        emptyList()
}
