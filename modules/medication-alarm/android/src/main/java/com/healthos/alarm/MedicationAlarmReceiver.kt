package com.healthos.alarm

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import com.health.os.MainActivity

class MedicationAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED -> {
                val reschedule = Intent("com.health.os.BOOT_RESCHEDULE").apply {
                    setPackage(context.packageName)
                }
                context.sendBroadcast(reschedule)
            }
            ACTION_ALARM_FIRE -> {
                val medicationId = intent.getStringExtra("medicationId") ?: return
                val alarmId = intent.getStringExtra("alarmId") ?: return
                val scheduledAt = intent.getStringExtra("scheduledAt") ?: ""
                val doseEventId = intent.getStringExtra("doseEventId")

                PendingReminderStore.enqueue(
                    context,
                    medicationId,
                    alarmId,
                    scheduledAt,
                    doseEventId,
                )

                AlarmFireService.startAlarm(context, alarmId)

                val activityIntent = buildReminderActivityIntent(
                    context,
                    medicationId,
                    alarmId,
                    scheduledAt,
                    doseEventId,
                )

                try {
                    context.startActivity(activityIntent)
                } catch (_: Exception) {
                    // Notification remains as fallback.
                }

                val requestCode = AlarmRequestCodes.requestCodeFor(context, alarmId)
                val fullScreenPendingIntent = PendingIntent.getActivity(
                    context,
                    requestCode,
                    activityIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                )

                val notificationManager =
                    context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                ensureChannel(notificationManager)

                val notification = NotificationCompat.Builder(context, CHANNEL_ID)
                    .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                    .setContentTitle("Medication due")
                    .setContentText("Tap to log your dose")
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setAutoCancel(false)
                    .setOngoing(true)
                    .setContentIntent(fullScreenPendingIntent)
                    .setFullScreenIntent(fullScreenPendingIntent, true)
                    .setVibrate(longArrayOf(0, 400, 200, 400))
                    .build()

                notificationManager.notify(requestCode, notification)
            }
        }
    }

    companion object {
        private const val CHANNEL_ID = "medication-reminders-native-v2"
        private const val ACTION_ALARM_FIRE = "com.health.os.ALARM_FIRE"
        private const val PREFS_NAME = "medication_alarm_prefs"
        private const val KEY_SCHEDULED_IDS = "scheduled_alarm_ids"

        fun buildReminderActivityIntent(
            context: Context,
            medicationId: String,
            alarmId: String,
            scheduledAt: String,
            doseEventId: String? = null,
        ): Intent {
            val uriBuilder = Uri.parse("healthos://reminder").buildUpon()
                .appendQueryParameter("medicationId", medicationId)
                .appendQueryParameter("alarmId", alarmId)
                .appendQueryParameter("scheduledAt", scheduledAt)
            if (doseEventId != null) {
                uriBuilder.appendQueryParameter("doseEventId", doseEventId)
            }
            val reminderUri = uriBuilder.build()

            return Intent(context, MainActivity::class.java).apply {
                action = Intent.ACTION_VIEW
                data = reminderUri
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("medicationId", medicationId)
                putExtra("alarmId", alarmId)
                putExtra("scheduledAt", scheduledAt)
                if (doseEventId != null) putExtra("doseEventId", doseEventId)
            }
        }

        private fun ensureChannel(notificationManager: NotificationManager) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Medication reminders",
                NotificationManager.IMPORTANCE_HIGH,
            ).apply {
                description = "Alerts when a medication dose is due"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 400, 200, 400)
                setSound(
                    android.provider.Settings.System.DEFAULT_ALARM_ALERT_URI,
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build(),
                )
                setBypassDnd(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            }
            notificationManager.createNotificationChannel(channel)
        }

        fun schedule(
            context: Context,
            alarmId: String,
            medicationId: String,
            triggerAtMillis: Long,
            scheduledAt: String,
            doseEventId: String? = null,
        ) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val requestCode = AlarmRequestCodes.requestCodeFor(context, alarmId)
            val intent = Intent(context, MedicationAlarmReceiver::class.java).apply {
                action = ACTION_ALARM_FIRE
                putExtra("medicationId", medicationId)
                putExtra("alarmId", alarmId)
                putExtra("scheduledAt", scheduledAt)
                if (doseEventId != null) putExtra("doseEventId", doseEventId)
            }
            val pending = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            val info = AlarmManager.AlarmClockInfo(triggerAtMillis, pending)
            alarmManager.setAlarmClock(info, pending)
        }

        fun dismissNotification(context: Context, alarmId: String, medicationId: String? = null) {
            AlarmFireService.stopAlarm(context, alarmId)
            PendingReminderStore.remove(context, alarmId)
            if (!medicationId.isNullOrBlank()) {
                PendingReminderStore.removeByMedicationId(context, medicationId)
            }
            val requestCode = AlarmRequestCodes.requestCodeFor(context, alarmId)
            val notificationManager =
                context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancel(requestCode)
        }

        fun cancel(context: Context, alarmId: String) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val requestCode = AlarmRequestCodes.requestCodeFor(context, alarmId)
            val intent = Intent(context, MedicationAlarmReceiver::class.java).apply {
                action = ACTION_ALARM_FIRE
            }
            val pending = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            alarmManager.cancel(pending)
            dismissNotification(context, alarmId)
            removeScheduledId(context, alarmId)
            AlarmRequestCodes.release(context, alarmId)
        }

        private fun removeScheduledId(context: Context, alarmId: String) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val ids = prefs.getStringSet(KEY_SCHEDULED_IDS, emptySet())?.toMutableSet() ?: return
            if (ids.remove(alarmId)) {
                prefs.edit().putStringSet(KEY_SCHEDULED_IDS, ids).apply()
            }
        }
    }
}
