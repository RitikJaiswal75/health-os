package com.healthos.alarm

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Handler
import android.os.Looper
import android.os.PowerManager

object AlarmSoundController {
    /** A missed alarm rings this long, then goes quiet; the notification stays up. */
    private const val RING_TIMEOUT_MS = 10 * 60 * 1000L

    private var mediaPlayer: MediaPlayer? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private val handler = Handler(Looper.getMainLooper())
    private val timeout = Runnable { stop() }

    fun ensurePlaying(context: Context) {
        if (mediaPlayer?.isPlaying == true) {
            // A new alarm while one is ringing gets its own full ring time (and wake lock to match).
            releaseWakeLock()
            acquireWakeLock(context.applicationContext)
            handler.removeCallbacks(timeout)
            handler.postDelayed(timeout, RING_TIMEOUT_MS)
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
        handler.postDelayed(timeout, RING_TIMEOUT_MS)
    }

    fun stop() {
        stopPlaybackOnly()
        releaseWakeLock()
    }

    private fun releaseWakeLock() {
        wakeLock?.let {
            if (it.isHeld) it.release()
        }
        wakeLock = null
    }

    /** Silences the sound but keeps the wake lock; returns true if it was playing. */
    fun stopPlaybackOnly(): Boolean {
        handler.removeCallbacks(timeout)
        var wasPlaying = false
        mediaPlayer?.run {
            try {
                wasPlaying = isPlaying
                if (wasPlaying) stop()
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
        return wasPlaying
    }

    private fun acquireWakeLock(context: Context) {
        if (wakeLock?.isHeld == true) return
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "HealthOS:MedicationAlarm",
        ).apply {
            acquire(RING_TIMEOUT_MS)
        }
    }
}
