package com.mannlab.clef

import android.app.Activity
import android.content.Intent
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.media.MediaMetadataRetriever
import android.media.MediaPlayer
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.provider.OpenableColumns
import androidx.documentfile.provider.DocumentFile
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
    private val externalFolderChannelName = "clef/external_folder"
    private val tonePlayerChannelName = "clef/tone_player"
    private val metronomePlayerChannelName = "clef/metronome_player"
    private val audioPlayerChannelName = "clef/audio_player"
    private val pendingSharedFiles = mutableListOf<Map<String, String>>()
    private val tonePlayer = ClefTonePlayer()
    private val metronomePlayer = ClefMetronomePlayer()
    private val audioPlayer = ClefAudioPlayer()
    private var sharedImportsChannel: MethodChannel? = null
    private var externalFolderChannel: MethodChannel? = null
    private var tonePlayerChannel: MethodChannel? = null
    private var metronomePlayerChannel: MethodChannel? = null
    private var audioPlayerChannel: MethodChannel? = null
    private var didCollectInitialIntent = false
    private var pendingExternalFolderResult: MethodChannel.Result? = null

    companion object {
        private const val externalFolderRequestCode = 4317
        private const val maxExternalFolderEntries = 201
        private val externalFolderScoreExtensions = setOf(
            "pdf",
            "txt",
            "text",
            "md",
            "markdown",
            "cho",
            "chordpro",
            "chopro",
            "chord",
            "crd",
            "pro",
            "song",
            "onsong",
            "docx",
            "rtf",
        )
    }

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
        externalFolderChannel = MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            externalFolderChannelName,
        )
        externalFolderChannel?.setMethodCallHandler { call, result ->
            when (call.method) {
                "pickFolder" -> openExternalFolderPicker(result)
                "listConnectedFolders" -> {
                    try {
                        result.success(connectedExternalFolders())
                    } catch (error: Exception) {
                        result.error(
                            "scan_failed",
                            error.message ?: "Connected folders could not be listed.",
                            null,
                        )
                    }
                }
                "openConnectedFolder" -> {
                    val folderToken = call.argument<String>("folderToken").orEmpty().trim()
                    try {
                        result.success(
                            externalFolderSelection(
                                Uri.parse(folderToken),
                                permissionPersisted = true,
                            ),
                        )
                    } catch (error: SecurityException) {
                        result.error("permission_denied", "Folder access permission expired.", null)
                    } catch (error: Exception) {
                        result.error(
                            "scan_failed",
                            error.message ?: "The connected folder could not be read.",
                            null,
                        )
                    }
                }
                "forgetConnectedFolder" -> {
                    val folderToken = call.argument<String>("folderToken").orEmpty().trim()
                    try {
                        val uri = requireContentUri(folderToken)
                        contentResolver.releasePersistableUriPermission(
                            uri,
                            Intent.FLAG_GRANT_READ_URI_PERMISSION,
                        )
                        result.success(null)
                    } catch (error: Exception) {
                        result.error(
                            "permission_release_failed",
                            error.message ?: "Folder permission could not be released.",
                            null,
                        )
                    }
                }
                "copySelected" -> {
                    val documentTokens = call.argument<List<Any>>("documentTokens")
                        ?: emptyList()
                    try {
                        result.success(copyExternalFolderScores(documentTokens))
                    } catch (error: Exception) {
                        result.error(
                            "copy_failed",
                            error.message ?: "Selected score files could not be copied.",
                            null,
                        )
                    }
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
        metronomePlayerChannel = MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            metronomePlayerChannelName,
        )
        metronomePlayerChannel?.setMethodCallHandler { call, result ->
            when (call.method) {
                "prepare" -> {
                    try {
                        metronomePlayer.prepare()
                        result.success(null)
                    } catch (error: Exception) {
                        result.error(
                            "playback_error",
                            error.message ?: "Metronome playback failed.",
                            null,
                        )
                    }
                }
                "playClick" -> {
                    val accent = call.argument<Boolean>("accent") ?: false
                    val volume =
                        call.argument<Number>("volume")?.toDouble() ?: 0.85
                    try {
                        metronomePlayer.playClick(accent, volume)
                        result.success(null)
                    } catch (error: Exception) {
                        result.error(
                            "playback_error",
                            error.message ?: "Metronome playback failed.",
                            null,
                        )
                    }
                }
                "stop" -> result.success(null)
                else -> result.notImplemented()
            }
        }
        audioPlayerChannel = MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            audioPlayerChannelName,
        )
        audioPlayerChannel?.setMethodCallHandler { call, result ->
            when (call.method) {
                "position" -> {
                    try {
                        result.success(audioPlayer.position())
                    } catch (error: Exception) {
                        result.error(
                            "not_playing",
                            error.message ?: "No linked audio track is active.",
                            null,
                        )
                    }
                }
                "inspect" -> {
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
                        result.success(mapOf("durationMs" to audioPlayer.inspectDuration(path)))
                    } catch (error: Exception) {
                        result.error(
                            "inspection_error",
                            error.message ?: "Audio file duration is unavailable.",
                            null,
                        )
                    }
                }
                "play" -> {
                    val path = call.argument<String>("path").orEmpty().trim()
                    val loopStartMs = call.argument<Int>("loopStartMs")
                    val loopEndMs = call.argument<Int>("loopEndMs")
                    if (path.isEmpty()) {
                        result.error(
                            "invalid_path",
                            "No audio file path was provided.",
                            null,
                        )
                        return@setMethodCallHandler
                    }
                    try {
                        audioPlayer.play(path, loopStartMs, loopEndMs)
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
        metronomePlayer.close()
        audioPlayer.stop()
        super.onDestroy()
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != externalFolderRequestCode) {
            return
        }
        val result = pendingExternalFolderResult ?: return
        pendingExternalFolderResult = null
        if (resultCode != Activity.RESULT_OK) {
            result.success(null)
            return
        }
        val treeUri = data?.data
        if (treeUri == null) {
            result.error("scan_failed", "The selected folder is unavailable.", null)
            return
        }
        try {
            var permissionPersisted = false
            val takeFlags = data.flags and Intent.FLAG_GRANT_READ_URI_PERMISSION
            if (takeFlags != 0) {
                try {
                    contentResolver.takePersistableUriPermission(treeUri, takeFlags)
                    permissionPersisted = true
                } catch (_: SecurityException) {
                    // Some providers allow this import but do not retain tree access.
                }
            }
            result.success(externalFolderSelection(treeUri, permissionPersisted))
        } catch (error: SecurityException) {
            result.error("permission_denied", "Folder access permission was not granted.", null)
        } catch (error: Exception) {
            result.error(
                "scan_failed",
                error.message ?: "The selected folder could not be read.",
                null,
            )
        }
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

    private fun openExternalFolderPicker(result: MethodChannel.Result) {
        if (pendingExternalFolderResult != null) {
            result.error("picker_active", "A folder picker is already open.", null)
            return
        }
        pendingExternalFolderResult = result
        try {
            startActivityForResult(
                Intent(Intent.ACTION_OPEN_DOCUMENT_TREE)
                    .addFlags(
                        Intent.FLAG_GRANT_READ_URI_PERMISSION or
                            Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION,
                    ),
                externalFolderRequestCode,
            )
        } catch (error: Exception) {
            pendingExternalFolderResult = null
            result.error("picker_failed", error.message ?: "Folder picker could not open.", null)
        }
    }

    private fun externalFolderEntry(document: DocumentFile, providerLabel: String?): Map<String, Any?> {
        return mapOf(
            "displayName" to (document.name ?: "unnamed-file"),
            // This URI is an in-memory copy token only. Dart never persists it.
            "documentId" to document.uri.toString(),
            "providerLabel" to providerLabel,
            "sizeBytes" to document.length().takeIf { it >= 0L },
            "modifiedAt" to document.lastModified().takeIf { it > 0L },
            "canRead" to (document.isFile && document.canRead()),
        )
    }

    private fun externalFolderSelection(
        treeUri: Uri,
        permissionPersisted: Boolean = false,
    ): Map<String, Any?> {
        val uri = requireContentUri(treeUri.toString())
        val root = DocumentFile.fromTreeUri(this, uri)
            ?: throw IllegalStateException("The selected folder is unavailable.")
        if (!root.isDirectory || !root.canRead()) {
            throw SecurityException("The selected folder cannot be read.")
        }
        val entries = root.listFiles()
            .asSequence()
            .take(maxExternalFolderEntries)
            .map { document -> externalFolderEntry(document, uri.authority) }
            .toList()
        return mapOf(
            "folderLabel" to (root.name ?: "선택한 폴더"),
            "providerLabel" to (uri.authority ?: "Android 파일"),
            "folderToken" to uri.toString(),
            "permissionPersisted" to permissionPersisted,
            "entries" to entries,
        )
    }

    private fun connectedExternalFolders(): List<Map<String, Any?>> {
        return contentResolver.persistedUriPermissions
            .filter { permission -> permission.isReadPermission }
            .map { permission ->
                val uri = permission.uri
                val root = DocumentFile.fromTreeUri(this, uri)
                mapOf(
                    "folderLabel" to (root?.name ?: "사용할 수 없는 폴더"),
                    "providerLabel" to (uri.authority ?: "Android 파일"),
                    "folderToken" to uri.toString(),
                    "canRead" to (root?.canRead() == true && root.isDirectory),
                )
            }
            .sortedWith(
                compareBy<Map<String, Any?>>(
                    { it["folderLabel"].toString().lowercase() },
                    { it["folderToken"].toString() },
                ),
            )
    }

    private fun requireContentUri(value: String): Uri {
        if (value.isBlank()) {
            throw IllegalArgumentException("A folder token is required.")
        }
        val uri = Uri.parse(value)
        if (!uri.scheme.equals("content", ignoreCase = true)) {
            throw IllegalArgumentException("The folder token is invalid.")
        }
        return uri
    }

    private fun copyExternalFolderScores(documentTokens: List<Any>): List<Map<String, String>> {
        val copiedFiles = mutableListOf<Map<String, String>>()
        val seenTokens = mutableSetOf<String>()
        try {
            for (rawToken in documentTokens) {
                val token = rawToken.toString().trim()
                if (token.isEmpty() || !seenTokens.add(token)) {
                    continue
                }
                val uri = Uri.parse(token)
                if (!uri.scheme.equals("content", ignoreCase = true)) {
                    throw IllegalArgumentException("A selected document is no longer available.")
                }
                val copied = copyExternalScoreToCache(uri)
                    ?: throw IllegalStateException("A selected score file could not be read.")
                copiedFiles.add(
                    mapOf("path" to copied.file.absolutePath, "name" to copied.displayName),
                )
            }
            if (copiedFiles.isEmpty()) {
                throw IllegalStateException("No selected score file could be read.")
            }
            return copiedFiles
        } catch (error: Exception) {
            copiedFiles.forEach { copied ->
                copied["path"]?.let(::File)?.delete()
            }
            throw error
        }
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

        var output: File? = null
        return try {
            val input = contentResolver.openInputStream(uri) ?: return null
            val sharedDir = File(cacheDir, "shared-imports")
            if (!sharedDir.exists()) {
                sharedDir.mkdirs()
            }
            val copiedFile = File(
                sharedDir,
                "${System.currentTimeMillis()}-${safeFileName(displayName)}",
            )
            output = copiedFile
            input.use { source ->
                copiedFile.outputStream().use { target -> source.copyTo(target) }
            }
            SharedImportFile(file = copiedFile, displayName = displayName)
        } catch (_: Exception) {
            output?.delete()
            null
        }
    }

    private fun copyExternalScoreToCache(uri: Uri): SharedImportFile? {
        val displayName = rawDisplayNameForUri(uri, "selected-score")
        val extension = displayName.substringAfterLast('.', "").lowercase()
        if (extension !in externalFolderScoreExtensions) {
            return null
        }

        var output: File? = null
        return try {
            val input = contentResolver.openInputStream(uri) ?: return null
            val sharedDir = File(cacheDir, "folder-imports")
            if (!sharedDir.exists()) {
                sharedDir.mkdirs()
            }
            val copiedFile = File(
                sharedDir,
                "${System.currentTimeMillis()}-${safeFileName(displayName)}",
            )
            output = copiedFile
            input.use { source ->
                copiedFile.outputStream().use { target -> source.copyTo(target) }
            }
            SharedImportFile(file = copiedFile, displayName = displayName)
        } catch (_: Exception) {
            output?.delete()
            null
        }
    }

    private fun displayNameForUri(uri: Uri): String {
        val fallback = rawDisplayNameForUri(uri, "shared-score.pdf")
        return if (fallback.endsWith(".pdf", ignoreCase = true)) {
            fallback
        } else {
            "$fallback.pdf"
        }
    }

    private fun rawDisplayNameForUri(uri: Uri, fallbackName: String): String {
        contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (index >= 0 && cursor.moveToFirst()) {
                val name = cursor.getString(index)
                if (!name.isNullOrBlank()) {
                    return name
                }
            }
        }
        return uri.lastPathSegment?.substringAfterLast('/') ?: fallbackName
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
    private val handler = Handler(Looper.getMainLooper())
    private var loopStartMs: Int? = null
    private var loopEndMs: Int? = null
    private val loopCheck = object : Runnable {
        override fun run() {
            val player = mediaPlayer ?: return
            val startMs = loopStartMs
            val endMs = loopEndMs
            if (startMs == null || endMs == null || endMs <= startMs) {
                return
            }
            try {
                if (player.isPlaying && player.currentPosition >= endMs) {
                    player.seekTo(startMs)
                    player.start()
                }
                handler.postDelayed(this, 40L)
            } catch (_: IllegalStateException) {
                stop()
            }
        }
    }

    fun position(): Map<String, Any> {
        val player = mediaPlayer
            ?: throw IllegalStateException("No linked audio track is active.")
        return try {
            mapOf(
                "positionMs" to player.currentPosition,
                "durationMs" to player.duration,
                "isPlaying" to player.isPlaying,
            )
        } catch (error: IllegalStateException) {
            throw IllegalStateException("Linked audio position is unavailable.", error)
        }
    }

    fun inspectDuration(path: String): Int {
        val file = File(path)
        if (!file.exists()) {
            throw IllegalArgumentException("Audio file does not exist.")
        }
        val retriever = MediaMetadataRetriever()
        return try {
            retriever.setDataSource(path)
            val durationMs = retriever.extractMetadata(
                MediaMetadataRetriever.METADATA_KEY_DURATION,
            )?.toIntOrNull()
            if (durationMs == null || durationMs <= 0) {
                throw IllegalArgumentException("Audio file duration is unavailable.")
            }
            durationMs
        } finally {
            retriever.release()
        }
    }

    @Synchronized
    fun play(path: String, requestedLoopStartMs: Int?, requestedLoopEndMs: Int?) {
        stop()
        val file = File(path)
        if (!file.exists()) {
            throw IllegalArgumentException("Audio file does not exist.")
        }
        mediaPlayer = MediaPlayer().apply {
            setAudioStreamType(AudioManager.STREAM_MUSIC)
            setDataSource(path)
            setOnCompletionListener {
                val startMs = loopStartMs
                val endMs = loopEndMs
                if (startMs != null && endMs != null && endMs > startMs) {
                    it.seekTo(startMs)
                    it.start()
                    scheduleLoopCheck()
                } else {
                    this@ClefAudioPlayer.stop()
                }
            }
            prepare()
            val durationMs = duration
            val safeLoop = normalizeLoop(
                requestedLoopStartMs,
                requestedLoopEndMs,
                durationMs,
            )
            loopStartMs = safeLoop?.first
            loopEndMs = safeLoop?.second
            loopStartMs?.let { startMs ->
                if (startMs > 0) {
                    seekTo(startMs)
                }
            }
            start()
            scheduleLoopCheck()
        }
    }

    @Synchronized
    private fun scheduleLoopCheck() {
        handler.removeCallbacks(loopCheck)
        val startMs = loopStartMs
        val endMs = loopEndMs
        if (startMs != null && endMs != null && endMs > startMs) {
            handler.postDelayed(loopCheck, 40L)
        }
    }

    @Synchronized
    fun stop() {
        handler.removeCallbacks(loopCheck)
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
        loopStartMs = null
        loopEndMs = null
    }

    private fun normalizeLoop(
        requestedStartMs: Int?,
        requestedEndMs: Int?,
        durationMs: Int,
    ): Pair<Int, Int>? {
        if (requestedStartMs == null || requestedEndMs == null || durationMs <= 0) {
            return null
        }
        val startMs = requestedStartMs.coerceAtLeast(0).coerceAtMost(durationMs - 1)
        val endMs = requestedEndMs.coerceAtMost(durationMs).coerceAtLeast(0)
        return if (endMs > startMs) Pair(startMs, endMs) else null
    }
}
