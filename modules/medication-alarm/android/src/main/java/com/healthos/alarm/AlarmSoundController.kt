package com.healthos.alarm

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.PowerManager

object AlarmSoundController {
    private var mediaPlayer: MediaPlayer? = null
    private var wakeLock: PowerManager.WakeLock? = null

    fun ensurePlaying(context: Context) {
        if (mediaPlayer?.isPlaying == true) {
            acquireWakeLock(context.applicationContext)
            return
        }
        start(context)
    }

    private fun start(context: Context) {
        stopPlaybackOnly()
        val appContext = context.applicationContext
        acquireWakeLock(appContext)

        val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        mediaPlayer = MediaPlayer().apply {
            setDataSource(appContext, uri)
            setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build(),
            )
            isLooping = true
            prepare()
            start()
        }
    }

    fun stop() {
        stopPlaybackOnly()
        wakeLock?.let {
            if (it.isHeld) it.release()
        }
        wakeLock = null
    }

    private fun stopPlaybackOnly() {
        mediaPlayer?.run {
            try {
                if (isPlaying) stop()
            } catch (_: Exception) {
                // Player may already be stopped.
            }
            try {
                release()
            } catch (_: Exception) {
                // Ignore release failures on teardown.
            }
        }
        mediaPlayer = null
    }

    private fun acquireWakeLock(context: Context) {
        if (wakeLock?.isHeld == true) return
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "HealthOS:MedicationAlarm",
        ).apply {
            acquire(10 * 60 * 1000L)
        }
    }
}
