package com.mannlab.clef

import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File

class MainActivity : FlutterActivity() {
    private val sharedImportsChannelName = "clef/shared_imports"
    private val pendingSharedFiles = mutableListOf<Map<String, String>>()
    private var methodChannel: MethodChannel? = null
    private var didCollectInitialIntent = false

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        methodChannel = MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            sharedImportsChannelName,
        )
        methodChannel?.setMethodCallHandler { call, result ->
            when (call.method) {
                "getInitialSharedFiles" -> {
                    collectInitialIntent()
                    result.success(drainPendingSharedFiles())
                }
                else -> result.notImplemented()
            }
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
        methodChannel?.invokeMethod("sharedFiles", drainPendingSharedFiles())
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
