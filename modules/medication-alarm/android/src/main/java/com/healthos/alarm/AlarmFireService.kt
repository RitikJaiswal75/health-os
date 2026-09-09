package com.healthos.alarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

/** Keeps alarm audio alive when the app process is cold-started from AlarmManager. */
class AlarmFireService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                val alarmId = intent.getStringExtra(EXTRA_ALARM_ID) ?: return START_NOT_STICKY
                synchronized(activeAlarmIds) { activeAlarmIds.add(alarmId) }
                AlarmSoundController.ensurePlaying(applicationContext)
                startForeground(SERVICE_NOTIFICATION_ID, buildServiceNotification())
            }
            ACTION_STOP -> {
                val alarmId = intent.getStringExtra(EXTRA_ALARM_ID) ?: return START_NOT_STICKY
                synchronized(activeAlarmIds) { activeAlarmIds.remove(alarmId) }
                if (activeAlarmIds.isEmpty()) {
                    AlarmSoundController.stop()
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                        stopForeground(STOP_FOREGROUND_REMOVE)
                    } else {
                        @Suppress("DEPRECATION")
                        stopForeground(true)
                    }
                    stopSelf()
                }
            }
        }
        return START_STICKY
    }

    private fun buildServiceNotification(): Notification {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                SERVICE_CHANNEL_ID,
                "Medication alarm",
                NotificationManager.IMPORTANCE_LOW,
            ).apply {
                description = "Plays medication reminder alarm sound"
                setSound(null, null)
            }
            notificationManager.createNotificationChannel(channel)
        }

        return NotificationCompat.Builder(this, SERVICE_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("Medication reminder")
            .setContentText("Alarm sounding")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setSilent(true)
            .build()
    }

    companion object {
        private const val ACTION_START = "com.health.os.ALARM_SOUND_START"
        private const val ACTION_STOP = "com.health.os.ALARM_SOUND_STOP"
        private const val EXTRA_ALARM_ID = "alarmId"
        private const val SERVICE_CHANNEL_ID = "medication-alarm-service"
        private const val SERVICE_NOTIFICATION_ID = 9001

        private val activeAlarmIds = mutableSetOf<String>()

        fun startAlarm(context: Context, alarmId: String) {
            val intent = Intent(context, AlarmFireService::class.java).apply {
                action = ACTION_START
                putExtra(EXTRA_ALARM_ID, alarmId)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopAlarm(context: Context, alarmId: String) {
            val intent = Intent(context, AlarmFireService::class.java).apply {
                action = ACTION_STOP
                putExtra(EXTRA_ALARM_ID, alarmId)
            }
            context.startService(intent)
        }
    }
}
