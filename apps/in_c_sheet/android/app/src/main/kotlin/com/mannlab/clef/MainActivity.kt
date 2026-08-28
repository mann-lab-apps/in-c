package com.mannlab.clef

import android.content.Intent
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.media.MediaPlayer
import android.net.Uri
import android.provider.OpenableColumns
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File
import kotlin.math.PI
import kotlin.math.max
import kotlin.math.roundToInt
import kotlin.math.sin

class MainActivity : FlutterActivity() {
    private val sharedImportsChannelName = "clef/shared_imports"
    private val tonePlayerChannelName = "clef/tone_player"
    private val audioPlayerChannelName = "clef/audio_player"
    private val pendingSharedFiles = mutableListOf<Map<String, String>>()
    private val tonePlayer = ClefTonePlayer()
    private val audioPlayer = ClefAudioPlayer()
    private var sharedImportsChannel: MethodChannel? = null
    private var tonePlayerChannel: MethodChannel? = null
    private var audioPlayerChannel: MethodChannel? = null
    private var didCollectInitialIntent = false

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        sharedImportsChannel = MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            sharedImportsChannelName,
        )
        sharedImportsChannel?.setMethodCallHandler { call, result ->
            when (call.method) {
                "getInitialSharedFiles" -> {
                    collectInitialIntent()
                    result.success(drainPendingSharedFiles())
                }
                else -> result.notImplemented()
            }
        }
        tonePlayerChannel = MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            tonePlayerChannelName,
        )
        tonePlayerChannel?.setMethodCallHandler { call, result ->
            when (call.method) {
                "play" -> {
                    val frequencies = (
                        call.argument<List<Any>>("frequencies") ?: emptyList()
                    )
                        .mapNotNull { (it as? Number)?.toDouble() }
                        .filter { it in 20.0..20000.0 }
                    val volume =
                        call.argument<Number>("volume")?.toDouble() ?: 0.35
                    if (frequencies.isEmpty()) {
                        result.error(
                            "invalid_frequencies",
                            "No playable frequencies were provided.",
                            null,
                        )
                        return@setMethodCallHandler
                    }
                    try {
                        tonePlayer.play(frequencies, volume)
                        result.success(null)
                    } catch (error: Exception) {
                        result.error(
                            "playback_error",
                            error.message ?: "Tone playback failed.",
                            null,
                        )
                    }
                }
                "stop" -> {
                    tonePlayer.stop()
                    result.success(null)
                }
                else -> result.notImplemented()
            }
        }
        audioPlayerChannel = MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            audioPlayerChannelName,
        )
        audioPlayerChannel?.setMethodCallHandler { call, result ->
            when (call.method) {
                "play" -> {
                    val path = call.argument<String>("path").orEmpty().trim()
                    if (path.isEmpty()) {
                        result.error(
                            "invalid_path",
                            "No audio file path was provided.",
                            null,
                        )
                        return@setMethodCallHandler
                    }
                    try {
                        audioPlayer.play(path)
                        result.success(null)
                    } catch (error: Exception) {
                        result.error(
                            "playback_error",
                            error.message ?: "Audio playback failed.",
                            null,
                        )
                    }
                }
                "stop" -> {
                    audioPlayer.stop()
                    result.success(null)
                }
                else -> result.notImplemented()
            }
        }
    }

    override fun onDestroy() {
        tonePlayer.stop()
        audioPlayer.stop()
        super.onDestroy()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val files = sharedFilesFromIntent(intent)
        if (files.isEmpty()) {
            return
        }
        pendingSharedFiles.addAll(files)
        sharedImportsChannel?.invokeMethod(
            "sharedFiles",
            drainPendingSharedFiles(),
        )
    }

    private fun collectInitialIntent() {
        if (didCollectInitialIntent) {
            return
        }
        didCollectInitialIntent = true
        intent?.let { pendingSharedFiles.addAll(sharedFilesFromIntent(it)) }
    }

    private fun drainPendingSharedFiles(): List<Map<String, String>> {
        val files = pendingSharedFiles.toList()
        pendingSharedFiles.clear()
        return files
    }

    private fun sharedFilesFromIntent(intent: Intent): List<Map<String, String>> {
        val uris: List<Uri> = when (intent.action) {
            Intent.ACTION_VIEW -> listOfNotNull(intent.data)
            Intent.ACTION_SEND -> listOfNotNull(
                intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM),
            )
            Intent.ACTION_SEND_MULTIPLE ->
                intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM) ?: emptyList()
            else -> emptyList()
        }

        return uris.mapNotNull { uri ->
            copySharedPdfToCache(uri)?.let { sharedFile ->
                mapOf("path" to sharedFile.file.absolutePath, "name" to sharedFile.displayName)
            }
        }
    }

    private fun copySharedPdfToCache(uri: Uri): SharedImportFile? {
        val mimeType = contentResolver.getType(uri).orEmpty()
        val displayName = displayNameForUri(uri)
        if (!mimeType.equals("application/pdf", ignoreCase = true) &&
            !displayName.endsWith(".pdf", ignoreCase = true)
        ) {
            return null
        }

        return try {
            val input = contentResolver.openInputStream(uri) ?: return null
            val sharedDir = File(cacheDir, "shared-imports")
            if (!sharedDir.exists()) {
                sharedDir.mkdirs()
            }
            val output = File(
                sharedDir,
                "${System.currentTimeMillis()}-${safeFileName(displayName)}",
            )
            input.use { source ->
                output.outputStream().use { target -> source.copyTo(target) }
            }
            SharedImportFile(file = output, displayName = displayName)
        } catch (_: Exception) {
            null
        }
    }

    private fun displayNameForUri(uri: Uri): String {
        contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (index >= 0 && cursor.moveToFirst()) {
                val name = cursor.getString(index)
                if (!name.isNullOrBlank()) {
                    return name
                }
            }
        }
        val fallback = uri.lastPathSegment?.substringAfterLast('/') ?: "shared-score.pdf"
        return if (fallback.endsWith(".pdf", ignoreCase = true)) {
            fallback
        } else {
            "$fallback.pdf"
        }
    }

    private fun safeFileName(name: String): String {
        val sanitized = name.replace(Regex("[^A-Za-z0-9가-힣._-]+"), "-")
            .replace(Regex("-+"), "-")
            .trim('-', '.')
        return sanitized.ifBlank { "shared-score.pdf" }
    }

    private data class SharedImportFile(val file: File, val displayName: String)
}

private class ClefTonePlayer {
    private val sampleRate = 44_100
    @Volatile private var isRunning = false
    private var audioTrack: AudioTrack? = null
    private var worker: Thread? = null

    @Synchronized
    fun play(frequencies: List<Double>, volume: Double) {
        stop()
        val playableFrequencies = frequencies.filter { it in 20.0..20_000.0 }
        if (playableFrequencies.isEmpty()) {
            return
        }
        val minBufferSize = AudioTrack.getMinBufferSize(
            sampleRate,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
        )
        val bufferSize = max(minBufferSize, sampleRate / 5)
        val track = AudioTrack(
            AudioManager.STREAM_MUSIC,
            sampleRate,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            bufferSize,
            AudioTrack.MODE_STREAM,
        )
        audioTrack = track
        isRunning = true
        worker = Thread {
            streamSineDrone(
                track,
                playableFrequencies,
                volume.coerceIn(0.0, 1.0),
            )
        }.apply {
            name = "ClefTonePlayer"
            isDaemon = true
            start()
        }
    }

    @Synchronized
    fun stop() {
        isRunning = false
        worker?.join(200)
        worker = null
        audioTrack?.let { track ->
            try {
                track.pause()
                track.flush()
                track.release()
            } catch (_: IllegalStateException) {
                track.release()
            }
        }
        audioTrack = null
    }

    private fun streamSineDrone(
        track: AudioTrack,
        frequencies: List<Double>,
        volume: Double,
    ) {
        val buffer = ShortArray(1024)
        val phases = DoubleArray(frequencies.size)
        val phaseSteps = frequencies.map { frequency ->
            2.0 * PI * frequency / sampleRate
        }
        val gain = (volume * 0.65 / frequencies.size).coerceIn(0.0, 0.65)
        try {
            track.play()
            while (isRunning) {
                for (sampleIndex in buffer.indices) {
                    var sample = 0.0
                    for (frequencyIndex in frequencies.indices) {
                        sample += sin(phases[frequencyIndex])
                        phases[frequencyIndex] += phaseSteps[frequencyIndex]
                        if (phases[frequencyIndex] >= 2.0 * PI) {
                            phases[frequencyIndex] -= 2.0 * PI
                        }
                    }
                    buffer[sampleIndex] = (sample * gain * Short.MAX_VALUE)
                        .roundToInt()
                        .coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt())
                        .toShort()
                }
                track.write(buffer, 0, buffer.size)
            }
        } catch (_: IllegalStateException) {
            isRunning = false
        }
    }
}

private class ClefAudioPlayer {
    private var mediaPlayer: MediaPlayer? = null

    @Synchronized
    fun play(path: String) {
        stop()
        val file = File(path)
        if (!file.exists()) {
            throw IllegalArgumentException("Audio file does not exist.")
        }
        mediaPlayer = MediaPlayer().apply {
            setAudioStreamType(AudioManager.STREAM_MUSIC)
            setDataSource(path)
            setOnCompletionListener {
                this@ClefAudioPlayer.stop()
            }
            prepare()
            start()
        }
    }

    @Synchronized
    fun stop() {
        mediaPlayer?.let { player ->
            try {
                if (player.isPlaying) {
                    player.stop()
                }
            } catch (_: IllegalStateException) {
            } finally {
                player.release()
            }
        }
        mediaPlayer = null
    }
}
