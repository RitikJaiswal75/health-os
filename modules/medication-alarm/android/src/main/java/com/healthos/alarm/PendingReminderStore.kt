package com.healthos.alarm

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

data class PendingReminder(
    val medicationId: String,
    val alarmId: String,
    val scheduledAt: String,
    val doseEventId: String?,
)

object PendingReminderStore {
    private const val PREFS_NAME = "medication_alarm_prefs"
    private const val KEY_PENDING = "pending_reminders_json"

    fun enqueue(
        context: Context,
        medicationId: String,
        alarmId: String,
        scheduledAt: String,
        doseEventId: String?,
    ) {
        val list = load(context).toMutableList()
        if (list.any { it.alarmId == alarmId }) return
        list.add(PendingReminder(medicationId, alarmId, scheduledAt, doseEventId))
        save(context, list)
    }

    fun remove(context: Context, alarmId: String) {
        val list = load(context).filter { it.alarmId != alarmId }
        save(context, list)
    }

    fun snapshot(context: Context): List<PendingReminder> = load(context)

    private fun load(context: Context): List<PendingReminder> {
        val raw = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_PENDING, null) ?: return emptyList()
        return try {
            val array = JSONArray(raw)
            buildList {
                for (i in 0 until array.length()) {
                    val item = array.getJSONObject(i)
                    add(
                        PendingReminder(
                            medicationId = item.getString("medicationId"),
                            alarmId = item.getString("alarmId"),
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

    private fun save(context: Context, list: List<PendingReminder>) {
        val array = JSONArray()
        for (item in list) {
            array.put(
                JSONObject().apply {
                    put("medicationId", item.medicationId)
                    put("alarmId", item.alarmId)
                    put("scheduledAt", item.scheduledAt)
                    put("doseEventId", item.doseEventId ?: "")
                },
            )
        }
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_PENDING, array.toString())
            .apply()
    }
}
