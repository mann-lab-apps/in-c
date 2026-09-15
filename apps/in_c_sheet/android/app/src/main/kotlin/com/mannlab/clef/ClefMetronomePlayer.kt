package com.mannlab.clef

import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import kotlin.math.PI
import kotlin.math.roundToInt
import kotlin.math.sin

internal interface MetronomeClickTrack {
    fun restart(volume: Float)
    fun release()
}

internal class ClefMetronomePlayer(
    private val createTrack: (ShortArray) -> MetronomeClickTrack = ::AndroidClickTrack,
) {
    private var regular: MetronomeClickTrack? = null
    private var accented: MetronomeClickTrack? = null
    private var closed = false

    @Synchronized
    fun playClick(accent: Boolean, volume: Double) {
        check(!closed) { "Metronome player is closed." }
        require(volume.isFinite()) { "Invalid metronome volume." }
        val gain = volume.coerceIn(0.0, 1.0).toFloat()
        if (gain <= 0f) return
        try {
            // Prepare both sounds once, before the first audible beat.
            if (regular == null) regular = createTrack(makeMetronomeClick(false))
            if (accented == null) accented = createTrack(makeMetronomeClick(true))
            (if (accent) accented else regular)!!.restart(gain)
        } catch (error: Exception) {
            releaseTracks()
            throw error
        }
    }

    @Synchronized
    fun close() {
        closed = true
        releaseTracks()
    }

    private fun releaseTracks() {
        val tracks = listOfNotNull(regular, accented)
        regular = null
        accented = null
        for (track in tracks) runCatching { track.release() }
    }
}

private class AndroidClickTrack(buffer: ShortArray) : MetronomeClickTrack {
    private val track = AudioTrack(
        AudioManager.STREAM_MUSIC,
        44_100,
        AudioFormat.CHANNEL_OUT_MONO,
        AudioFormat.ENCODING_PCM_16BIT,
        buffer.size * java.lang.Short.BYTES,
        AudioTrack.MODE_STATIC,
    )

    init {
        try {
            check(track.write(buffer, 0, buffer.size) == buffer.size) {
                "Could not preload metronome click."
            }
            check(track.state == AudioTrack.STATE_INITIALIZED) {
                "Metronome output is unavailable."
            }
        } catch (error: Exception) {
            track.release()
            throw error
        }
    }

    override fun restart(volume: Float) {
        // A static track must be stopped/paused before its cursor is reset.
        track.pause()
        check(track.setPlaybackHeadPosition(0) == AudioTrack.SUCCESS)
        check(track.setVolume(volume) == AudioTrack.SUCCESS)
        track.play()
    }

    override fun release() = track.release()
}

internal fun makeMetronomeClick(accent: Boolean): ShortArray {
    val sampleRate = 44_100
    val sampleCount = (sampleRate * 0.045).roundToInt()
    val frequency = if (accent) 1_760.0 else 1_240.0
    val gain = if (accent) 0.82 else 0.58
    val phaseStep = 2.0 * PI * frequency / sampleRate
    return ShortArray(sampleCount) { index ->
        val fade = 1.0 - index.toDouble() / sampleCount
        (sin(index * phaseStep) * fade * fade * fade * gain * Short.MAX_VALUE)
            .roundToInt().toShort()
    }
}
