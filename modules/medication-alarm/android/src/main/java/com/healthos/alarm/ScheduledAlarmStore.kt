package com.healthos.alarm

import android.app.AlarmManager
import android.content.Context
import android.os.Build
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

data class ScheduledAlarm(
    val alarmId: String,
    val medicationId: String,
    val scheduledAt: String,
    val doseEventId: String?,
)

/** Alarms the app last scheduled, so they can be set again after a reboot clears AlarmManager. */
object ScheduledAlarmStore {
    private const val PREFS_NAME = "medication_alarm_prefs"
    private const val KEY_ALARMS = "scheduled_alarms_json"

    fun save(context: Context, alarms: List<ScheduledAlarm>) {
        val array = JSONArray()
        for (alarm in alarms) {
            array.put(
                JSONObject().apply {
                    put("alarmId", alarm.alarmId)
                    put("medicationId", alarm.medicationId)
                    put("scheduledAt", alarm.scheduledAt)
                    put("doseEventId", alarm.doseEventId ?: "")
                },
            )
        }
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_ALARMS, array.toString())
            .apply()
    }

    /** Set every saved alarm that is still in the future. Called on BOOT_COMPLETED. */
    fun rearmAfterBoot(context: Context) {
        // Without "Alarms & reminders" setAlarmClock throws, and an exception here crashes the app on boot.
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) return
        val now = System.currentTimeMillis()
        for (alarm in load(context)) {
            // Recomputed from the wall-clock time, so a time-zone change while off is respected.
            val triggerAt = try {
                parseScheduledAtMillis(alarm.scheduledAt)
            } catch (_: Exception) {
                continue
            }
            if (triggerAt <= now) continue
            try {
                MedicationAlarmReceiver.schedule(
                    context, alarm.alarmId, alarm.medicationId, triggerAt, alarm.scheduledAt, alarm.doseEventId,
                )
            } catch (error: Exception) {
                Log.e("ScheduledAlarmStore", "Unable to re-arm alarm after boot", error)
            }
        }
    }

    fun parseScheduledAtMillis(scheduledAt: String): Long {
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

    private fun load(context: Context): List<ScheduledAlarm> {
        val raw = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_ALARMS, null) ?: return emptyList()
        return try {
            val array = JSONArray(raw)
            buildList {
                for (i in 0 until array.length()) {
                    val item = array.getJSONObject(i)
                    add(
                        ScheduledAlarm(
                            alarmId = item.getString("alarmId"),
                            medicationId = item.getString("medicationId"),
                            scheduledAt = item.getString("scheduledAt"),
                            doseEventId = item.optString("doseEventId").ifBlank { null },
                        ),
                    )
                }
            }
        } catch (_: Exception) {
            emptyList()
        }
    }
}
