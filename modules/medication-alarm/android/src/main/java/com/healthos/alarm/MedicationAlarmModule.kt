package com.healthos.alarm

import android.app.AlarmManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.uimanager.ViewManager

class MedicationAlarmModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

    init {
        reactContext.addLifecycleEventListener(this)
        instance = this
    }

    override fun getName(): String = "MedicationAlarm"

    override fun onHostResume() {
        captureReminderLaunch(reactContext.currentActivity?.intent)
    }

    override fun onHostPause() {}

    override fun onHostDestroy() {
        if (instance === this) {
            instance = null
        }
    }

    private fun captureReminderLaunch(intent: Intent?) {
        if (!AlarmLaunchHelper.captureReminderLaunch(intent)) return
        emitPendingLaunch()
    }

    private fun emitPendingLaunch() {
        val params = AlarmLaunchHelper.peekReminderLaunch() ?: return
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(EVENT_REMINDER_LAUNCH, params)
    }

    companion object {
        private const val PREFS_NAME = "medication_alarm_prefs"
        private const val KEY_SCHEDULED_IDS = "scheduled_alarm_ids"
        const val EVENT_REMINDER_LAUNCH = "healthos:reminderLaunch"

        @Volatile
        private var instance: MedicationAlarmModule? = null

        @JvmStatic
        fun captureReminderLaunchFromActivity(intent: Intent?) {
            instance?.captureReminderLaunch(intent)
        }
    }

    @ReactMethod
    fun scheduleAlarms(occurrences: ReadableArray, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val previous = prefs.getStringSet(KEY_SCHEDULED_IDS, emptySet())?.toMutableSet() ?: mutableSetOf()
            val next = mutableSetOf<String>()
            val saved = mutableListOf<ScheduledAlarm>()

            for (i in 0 until occurrences.size()) {
                val item = occurrences.getMap(i) ?: continue
                val id = item.getString("id") ?: continue
                val medicationId = item.getString("medicationId") ?: continue
                val scheduledAt = item.getString("scheduledAt") ?: continue
                val doseEventId = if (item.hasKey("doseEventId")) item.getString("doseEventId") else null
                // One bad row (unparseable time) must not stop the rest, or the saved list goes stale.
                val triggerAt = try {
                    ScheduledAlarmStore.parseScheduledAtMillis(scheduledAt)
                } catch (e: java.time.format.DateTimeParseException) {
                    Log.e("MedicationAlarm", "Skipping alarm $id with bad time $scheduledAt", e)
                    continue
                }
                // Scheduling itself failing (e.g. exact alarms denied) rejects below and keeps the
                // saved lists, so reboot restore still works and JS reports ALARM_SCHEDULE_FAILED.
                MedicationAlarmReceiver.schedule(
                    reactContext, id, medicationId, triggerAt, scheduledAt, doseEventId,
                )
                next.add(id)
                saved.add(ScheduledAlarm(id, medicationId, scheduledAt, doseEventId))
            }

            val ringingAlarmIds = PendingReminderStore.snapshot(reactContext)
                .map { it.alarmId }
                .toSet()

            for (oldId in previous) {
                if (oldId !in next && oldId !in ringingAlarmIds) {
                    MedicationAlarmReceiver.cancel(reactContext, oldId)
                }
            }

            val persistedIds = next.toMutableSet()
            persistedIds.addAll(ringingAlarmIds)
            prefs.edit().putStringSet(KEY_SCHEDULED_IDS, persistedIds).apply()
            ScheduledAlarmStore.save(reactContext, saved)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("SCHEDULE_ERROR", e.message, e)
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
    fun consumeReminderLaunchIntent(promise: Promise) {
        try {
            promise.resolve(AlarmLaunchHelper.consumeReminderLaunch())
        } catch (e: Exception) {
            promise.reject("LAUNCH_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getPendingReminders(promise: Promise) {
        try {
            val reminders = PendingReminderStore.snapshot(reactContext)
            val array = Arguments.createArray()
            for (reminder in reminders) {
                val map = Arguments.createMap()
                map.putString("medicationId", reminder.medicationId)
                map.putString("alarmId", reminder.alarmId)
                map.putString("scheduledAt", reminder.scheduledAt)
                if (reminder.doseEventId != null) {
                    map.putString("doseEventId", reminder.doseEventId)
                }
                array.pushMap(map)
            }
            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject("PENDING_ERROR", e.message, e)
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
