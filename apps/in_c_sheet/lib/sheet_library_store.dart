import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'dart:typed_data';

import 'package:archive/archive.dart';
import 'package:file_picker/file_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'sheet_annotated_pdf_exporter.dart';
import 'sheet_annotation.dart';
import 'sheet_library_backup.dart';
import 'sheet_library_view_settings.dart';
import 'sheet_metronome.dart';
import 'sheet_file_import.dart';
import 'sheet_pdf_link_sanitizer.dart';
import 'sheet_pdf_page_transformer.dart';
import 'sheet_score.dart';
import 'sheet_setlist.dart';
import 'sheet_tuner.dart';

class SheetLibraryStore {
  static const _scoresKey = 'clef_scores';
  static const _setlistsKey = 'clef_setlists';
  static const _metronomeSettingsKey = 'clef_metronome_settings';
  static const _tunerSettingsKey = 'clef_tuner_settings';
  static const _libraryViewSettingsKey = 'clef_library_view_settings';
  static const _favoriteAnnotationPresetKey =
      'clef_favorite_annotation_preset';
  static const _legacyScoresKey = 'in_c_sheet_scores';
  static const _legacySetlistsKey = 'in_c_sheet_setlists';
  static const _legacyMetronomeSettingsKey = 'in_c_sheet_metronome_settings';
  static const _legacyTunerSettingsKey = 'in_c_sheet_tuner_settings';
  static const _legacyLibraryViewSettingsKey =
      'in_c_sheet_library_view_settings';
  static const _pdfFolderName = 'scores';
  static const _linkedFilesFolderName = 'linked-files';
  static const _backupFolderName = 'backups';

  Future<List<SheetScore>> loadScores() async {
    final preferences = await SharedPreferences.getInstance();
    final scores = SheetScore.decodeList(
      _getStringWithLegacyFallback(preferences, _scoresKey, _legacyScoresKey),
    );
    return _sortScores(scores);
  }

  Future<void> saveScores(List<SheetScore> scores) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(_scoresKey, SheetScore.encodeList(scores));
  }

  Future<List<SheetSetlist>> loadSetlists() async {
    final preferences = await SharedPreferences.getInstance();
    return SheetSetlist.decodeList(
      _getStringWithLegacyFallback(
        preferences,
        _setlistsKey,
        _legacySetlistsKey,
      ),
    );
  }

  Future<void> saveSetlists(List<SheetSetlist> setlists) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      _setlistsKey,
      SheetSetlist.encodeList(setlists),
    );
  }

  Future<SheetMetronomeSettings> loadMetronomeSettings() async {
    final preferences = await SharedPreferences.getInstance();
    return SheetMetronomeCodec.decode(
      _getStringWithLegacyFallback(
        preferences,
        _metronomeSettingsKey,
        _legacyMetronomeSettingsKey,
      ),
    );
  }

  Future<void> saveMetronomeSettings(SheetMetronomeSettings settings) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      _metronomeSettingsKey,
      SheetMetronomeCodec.encode(settings),
    );
  }

  Future<SheetTunerSettings> loadTunerSettings() async {
    final preferences = await SharedPreferences.getInstance();
    return SheetTunerCodec.decode(
      _getStringWithLegacyFallback(
        preferences,
        _tunerSettingsKey,
        _legacyTunerSettingsKey,
      ),
    );
  }

  Future<void> saveTunerSettings(SheetTunerSettings settings) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      _tunerSettingsKey,
      SheetTunerCodec.encode(settings),
    );
  }

  Future<SheetLibraryViewSettings> loadLibraryViewSettings() async {
    final preferences = await SharedPreferences.getInstance();
    return SheetLibraryViewSettingsCodec.decode(
      _getStringWithLegacyFallback(
        preferences,
        _libraryViewSettingsKey,
        _legacyLibraryViewSettingsKey,
      ),
    );
  }

  Future<void> saveLibraryViewSettings(
    SheetLibraryViewSettings settings,
  ) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      _libraryViewSettingsKey,
      SheetLibraryViewSettingsCodec.encode(settings),
    );
  }

  Future<SheetAnnotationToolPreset?> loadFavoriteAnnotationPreset() async {
    final preferences = await SharedPreferences.getInstance();
    final value = preferences.getString(_favoriteAnnotationPresetKey);
    if (value == null) {
      return null;
    }
    try {
      final decoded = jsonDecode(value);
      if (decoded is! Map) {
        return null;
      }
      final preset = SheetAnnotationToolPreset.fromJson(
        decoded.map(
          (key, value) => MapEntry(key.toString(), value as Object?),
        ),
      );
      return preset.isValid ? preset : null;
    } catch (_) {
      return null;
    }
  }

  Future<void> saveFavoriteAnnotationPreset(
    SheetAnnotationToolPreset? preset,
  ) async {
    final preferences = await SharedPreferences.getInstance();
    if (preset == null || !preset.isValid) {
      await preferences.remove(_favoriteAnnotationPresetKey);
      return;
    }
    await preferences.setString(
      _favoriteAnnotationPresetKey,
      const JsonEncoder.withIndent('  ').convert(preset.toJson()),
    );
  }

  Future<SheetScore?> importPdf() async {
    final file = await FilePicker.pickFile(
      type: FileType.custom,
      allowedExtensions: const <String>['pdf'],
    );

    if (file == null) {
      return null;
    }

    return importPdfBytes(bytes: await file.readAsBytes(), fileName: file.name);
  }

  Future<SheetScore> importPdfFile(File file, {String? fileName}) async {
    final resolvedName = fileName ?? file.uri.pathSegments.last;
    if (!SheetFileImportPolicy.isPdfFileName(resolvedName)) {
      throw FormatException('Unsupported PDF file: $resolvedName');
    }
    return importPdfBytes(
      bytes: await file.readAsBytes(),
      fileName: resolvedName,
    );
  }

  Future<SheetScore> importPdfBytes({
    required List<int> bytes,
    required String fileName,
    DateTime? importedAt,
  }) async {
    if (!SheetFileImportPolicy.isPdfFileName(fileName)) {
      throw FormatException('Unsupported PDF file: $fileName');
    }

    final now = importedAt ?? DateTime.now();
    final id = _newId(now);
    final title = _titleFromFileName(fileName);
    final storedPath = await _writeImportedPdf(
      bytes: bytes,
      id: id,
      originalFileName: fileName,
    );

    return SheetScore(
      id: id,
      title: title,
      composer: '',
      tags: const <String>[],
      note: '',
      filePath: storedPath,
      importedAt: now,
      updatedAt: now,
      lastOpenedAt: now,
      lastPage: 1,
      isFavorite: false,
      bookmarks: const <SheetBookmark>[],
      viewerSettings: SheetViewerSettings.defaultSettings,
      pageSettings: SheetPageSettings.empty,
    );
  }

  Future<SheetScore?> importImagesAsPdf() async {
    final files = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: const <String>['jpg', 'jpeg', 'png'],
    );

    if (files.isEmpty) {
      return null;
    }

    final importedFiles = <SheetImportedFile>[];
    for (final file in files) {
      if (!SheetFileImportPolicy.isSupportedImageFileName(file.name)) {
        throw FormatException('Unsupported image file: ${file.name}');
      }
      importedFiles.add(
        SheetImportedFile(name: file.name, bytes: await file.readAsBytes()),
      );
    }

    return importImagesAsPdfBytes(images: importedFiles);
  }

  Future<SheetScore> importImagesAsPdfBytes({
    required List<SheetImportedFile> images,
    String? title,
    DateTime? importedAt,
  }) async {
    final pdfBytes = await SheetImagePdfConverter.convertImagesToPdf(images);
    final resolvedTitle = title?.trim().isNotEmpty == true
        ? title!.trim()
        : SheetFileImportPolicy.imageBundleTitle(images);
    final outputFileName = SheetFileImportPolicy.safeFileName(
      '$resolvedTitle.pdf',
      fallback: 'scanned-score.pdf',
    );
    return importPdfBytes(
      bytes: pdfBytes,
      fileName: outputFileName,
      importedAt: importedAt,
    );
  }

  Future<SheetLinkedFile?> pickLinkedFile() async {
    final file = await FilePicker.pickFile(
      type: FileType.custom,
      allowedExtensions: const <String>['pdf', 'jpg', 'jpeg', 'png'],
    );

    if (file == null) {
      return null;
    }

    return importLinkedFileBytes(
      bytes: await file.readAsBytes(),
      fileName: file.name,
    );
  }

  Future<SheetLinkedFile> importLinkedFileBytes({
    required List<int> bytes,
    required String fileName,
    DateTime? importedAt,
  }) async {
    final extension = SheetFileImportPolicy.extensionOf(fileName);
    if (!SheetFileImportPolicy.isPdfFileName(fileName) &&
        !SheetFileImportPolicy.isSupportedImageFileName(fileName)) {
      throw FormatException('Unsupported linked file: $fileName');
    }

    final now = importedAt ?? DateTime.now();
    final storedPath = await _writeLinkedFile(
      bytes: bytes,
      originalFileName: fileName,
      importedAt: now,
    );
    return SheetLinkedFile(
      path: storedPath,
      type: extension,
      label: _titleFromFileName(fileName),
      createdAt: now,
    );
  }

  List<SheetScoreShareCandidate> shareCandidates(SheetScore score) {
    final candidates = <SheetScoreShareCandidate>[
      SheetScoreShareCandidate(
        label: '현재 PDF',
        path: score.filePath,
        fileName: SheetScoreSharePolicy.exportFileName(
          title: score.title,
          composer: score.composer,
        ),
        mimeType: 'application/pdf',
        isSanitizedCopy: score.pdfLinkSanitization.hasSanitizedCopy,
      ),
    ];

    final originalPath = score.pdfLinkSanitization.sanitizedFromPath;
    if (originalPath.isNotEmpty &&
        originalPath != score.filePath &&
        File(originalPath).existsSync()) {
      candidates.add(
        SheetScoreShareCandidate(
          label: '원본 PDF',
          path: originalPath,
          fileName: SheetScoreSharePolicy.exportFileName(
            title: '${score.title} 원본',
            composer: score.composer,
          ),
          mimeType: 'application/pdf',
          isSanitizedCopy: false,
        ),
      );
    }

    for (var index = 0; index < score.linkedFiles.length; index += 1) {
      final linkedFile = score.linkedFiles[index];
      if (linkedFile.path.isEmpty || !File(linkedFile.path).existsSync()) {
        continue;
      }
      candidates.add(
        SheetScoreShareCandidate(
          label: '연결 파일: ${linkedFile.label}',
          path: linkedFile.path,
          fileName: _linkedFileShareFileName(
            score: score,
            linkedFile: linkedFile,
            index: index,
          ),
          mimeType: _linkedFileMimeType(linkedFile),
          isSanitizedCopy: false,
          isLinkedFile: true,
        ),
      );
    }

    return List<SheetScoreShareCandidate>.unmodifiable(candidates);
  }

  String _linkedFileShareFileName({
    required SheetScore score,
    required SheetLinkedFile linkedFile,
    required int index,
  }) {
    final extension = SheetFileImportPolicy.extensionOf(linkedFile.path);
    final fallbackExtension = linkedFile.type.trim().toLowerCase();
    final resolvedExtension = extension.isEmpty ? fallbackExtension : extension;
    final parts = <String>[
      if (score.composer.trim().isNotEmpty) score.composer.trim(),
      score.title.trim().isEmpty ? 'Untitled score' : score.title.trim(),
      linkedFile.label.trim().isEmpty
          ? 'linked file ${index + 1}'
          : linkedFile.label.trim(),
    ];
    final fileName = _safeFileName(parts.join(' - '));
    if (resolvedExtension.isEmpty ||
        fileName.toLowerCase().endsWith('.$resolvedExtension')) {
      return fileName;
    }
    return '$fileName.$resolvedExtension';
  }

  String _linkedFileMimeType(SheetLinkedFile linkedFile) {
    final extension = SheetFileImportPolicy.extensionOf(linkedFile.path);
    final fallbackExtension = linkedFile.type.trim().toLowerCase();
    return switch (extension.isEmpty ? fallbackExtension : extension) {
      'jpg' || 'jpeg' => 'image/jpeg',
      'png' => 'image/png',
      _ => 'application/pdf',
    };
  }

  Future<SheetPdfLinkSanitizationResult> createPdfLinkDisabledCopy(
    SheetScore score,
  ) async {
    final outputPath = await _sanitizedPdfPath(score);
    return SheetPdfLinkSanitizer.createSanitizedCopy(
      inputPath: score.filePath,
      outputPath: outputPath,
    );
  }

  Future<SheetAnnotatedPdfExportResult> createAnnotatedPdfCopy(
    SheetScore score,
  ) async {
    final outputPath = await _annotatedPdfPath(score);
    return SheetAnnotatedPdfExporter.createAnnotatedCopy(
      score: score,
      outputPath: outputPath,
    );
  }

  Future<SheetPdfPageRotationResult> createPageRotationAppliedCopy(
    SheetScore score,
  ) async {
    final outputPath = await _rotatedPdfPath(score);
    return SheetPdfPageTransformer.createRotationAppliedCopy(
      inputPath: score.filePath,
      outputPath: outputPath,
      pageRotations: score.pageSettings.pageRotations,
    );
  }

  Future<String> exportMetadataBackupJson() async {
    final backup = SheetLibraryBackup.fromState(
      scores: await loadScores(),
      setlists: await loadSetlists(),
      metronomeSettings: await loadMetronomeSettings(),
      tunerSettings: await loadTunerSettings(),
      libraryViewSettings: await loadLibraryViewSettings(),
      favoriteAnnotationPreset: await loadFavoriteAnnotationPreset(),
    );
    return SheetLibraryBackupCodec.encode(backup);
  }

  Future<SheetLibraryBackupExportResult> exportMetadataBackup() async {
    try {
      final backupJson = await exportMetadataBackupJson();
      final fileName = _backupFileName(DateTime.now());
      final bytes = Uint8List.fromList(utf8.encode(backupJson));
      Uri? outputUri;
      try {
        outputUri = await FilePicker.saveFile(
          fileName: fileName,
          bytes: bytes,
          mimeType: 'application/json',
          type: FileType.custom,
          allowedExtensions: const <String>['json'],
        );
      } catch (_) {
        outputUri = null;
      }

      outputUri ??= Uri.file(await _writeInternalBackup(fileName, backupJson));
      return SheetLibraryBackupExportResult(
        didExport: true,
        outputUri: outputUri,
      );
    } catch (error) {
      return SheetLibraryBackupExportResult(
        didExport: false,
        failureReason: error.toString(),
      );
    }
  }

  Future<Uint8List> exportFullBackupZipBytes({DateTime? exportedAt}) async {
    final scores = await loadScores();
    final setlists = await loadSetlists();
    final backup = SheetLibraryBackup.fromState(
      scores: scores,
      setlists: setlists,
      metronomeSettings: await loadMetronomeSettings(),
      tunerSettings: await loadTunerSettings(),
      libraryViewSettings: await loadLibraryViewSettings(),
      favoriteAnnotationPreset: await loadFavoriteAnnotationPreset(),
      exportedAt: exportedAt,
    );
    final archive = Archive();
    final mappings = <SheetLibraryFullBackupFileMapping>[];

    for (final score in scores) {
      final originalFile = File(score.filePath);
      final originalFileName = score.filePath
          .split(Platform.pathSeparator)
          .last;
      final safeName = _safeFileName(originalFileName);
      final entryPath = 'scores/${score.id}-$safeName';
      final exists = await originalFile.exists();
      mappings.add(
        SheetLibraryFullBackupFileMapping(
          scoreId: score.id,
          entryPath: entryPath,
          originalFileName: safeName,
          missing: !exists,
        ),
      );
      if (exists) {
        archive.addFile(
          ArchiveFile.bytes(entryPath, await originalFile.readAsBytes()),
        );
      }

      for (var index = 0; index < score.linkedFiles.length; index += 1) {
        final linkedFile = score.linkedFiles[index];
        final sourceFile = File(linkedFile.path);
        final sourceFileName = linkedFile.path
            .split(Platform.pathSeparator)
            .last;
        final linkedSafeName = _safeFileName(sourceFileName);
        final linkedEntryPath =
            'linked-files/${score.id}-$index-$linkedSafeName';
        final linkedExists = await sourceFile.exists();
        mappings.add(
          SheetLibraryFullBackupFileMapping(
            scoreId: score.id,
            entryPath: linkedEntryPath,
            originalFileName: linkedSafeName,
            missing: !linkedExists,
            linkedFilePath: linkedFile.path,
          ),
        );
        if (linkedExists) {
          archive.addFile(
            ArchiveFile.bytes(
              linkedEntryPath,
              await sourceFile.readAsBytes(),
            ),
          );
        }
      }

      if (score.annotationStorage.isFileBacked) {
        final annotationFile = File(score.annotationStorage.path);
        final annotationFileName = score.annotationStorage.path
            .split(Platform.pathSeparator)
            .last;
        final annotationSafeName = _safeFileName(annotationFileName);
        final annotationEntryPath =
            'annotations/${score.id}-$annotationSafeName';
        final annotationExists = await annotationFile.exists();
        mappings.add(
          SheetLibraryFullBackupFileMapping(
            scoreId: score.id,
            entryPath: annotationEntryPath,
            originalFileName: annotationSafeName,
            missing: !annotationExists,
            annotationStoragePath: score.annotationStorage.path,
          ),
        );
        if (annotationExists) {
          archive.addFile(
            ArchiveFile.bytes(
              annotationEntryPath,
              await annotationFile.readAsBytes(),
            ),
          );
        }
      }
    }

    final fullBackup = SheetLibraryFullBackup(
      backup: backup,
      fileMappings: List<SheetLibraryFullBackupFileMapping>.unmodifiable(
        mappings,
      ),
    );
    archive.addFile(
      ArchiveFile.string(
        SheetLibraryFullBackup.manifestFileName,
        const JsonEncoder.withIndent('  ').convert(fullBackup.toJson()),
      ),
    );

    final encoded = ZipEncoder().encode(archive);
    return Uint8List.fromList(encoded);
  }

  Future<SheetLibraryBackupExportResult> exportFullBackup() async {
    try {
      final bytes = await exportFullBackupZipBytes();
      final fileName = _fullBackupFileName(DateTime.now());
      Uri? outputUri;
      try {
        outputUri = await FilePicker.saveFile(
          fileName: fileName,
          bytes: bytes,
          mimeType: 'application/zip',
          type: FileType.custom,
          allowedExtensions: const <String>['zip'],
        );
      } catch (_) {
        outputUri = null;
      }

      outputUri ??= Uri.file(await _writeInternalBackupBytes(fileName, bytes));
      return SheetLibraryBackupExportResult(
        didExport: true,
        outputUri: outputUri,
      );
    } catch (error) {
      return SheetLibraryBackupExportResult(
        didExport: false,
        failureReason: error.toString(),
      );
    }
  }

  Future<SheetLibraryBackupRestoreResult> importMetadataBackup() async {
    try {
      final file = await FilePicker.pickFile(
        type: FileType.custom,
        allowedExtensions: const <String>['json'],
      );
      if (file == null) {
        return const SheetLibraryBackupRestoreResult(
          status: SheetLibraryBackupRestoreStatus.canceled,
        );
      }

      final bytes = await file.readAsBytes();
      return await restoreMetadataBackupJson(utf8.decode(bytes));
    } catch (error) {
      return SheetLibraryBackupRestoreResult(
        status: SheetLibraryBackupRestoreStatus.error,
        failureReason: error.toString(),
      );
    }
  }

  Future<SheetLibraryBackupRestoreResult> importFullBackup() async {
    try {
      final file = await FilePicker.pickFile(
        type: FileType.custom,
        allowedExtensions: const <String>['zip'],
      );
      if (file == null) {
        return const SheetLibraryBackupRestoreResult(
          status: SheetLibraryBackupRestoreStatus.canceled,
        );
      }

      return await restoreFullBackupZipBytes(await file.readAsBytes());
    } catch (error) {
      return SheetLibraryBackupRestoreResult(
        status: SheetLibraryBackupRestoreStatus.error,
        failureReason: error.toString(),
      );
    }
  }

  Future<SheetLibraryBackupRestoreResult> restoreMetadataBackupJson(
    String value,
  ) async {
    try {
      final backup = SheetLibraryBackupCodec.decode(value);
      await saveScores(backup.scores);
      await saveSetlists(backup.setlists);
      await saveMetronomeSettings(backup.metronomeSettings);
      await saveTunerSettings(backup.tunerSettings);
      await saveLibraryViewSettings(backup.libraryViewSettings);
      await saveFavoriteAnnotationPreset(backup.favoriteAnnotationPreset);
      return SheetLibraryBackupRestoreResult(
        status: SheetLibraryBackupRestoreStatus.restored,
        restoredScoreCount: backup.scores.length,
        restoredSetlistCount: backup.setlists.length,
      );
    } on UnsupportedError catch (error) {
      return SheetLibraryBackupRestoreResult(
        status: SheetLibraryBackupRestoreStatus.unsupportedVersion,
        failureReason: error.toString(),
      );
    } on FormatException catch (error) {
      return SheetLibraryBackupRestoreResult(
        status: SheetLibraryBackupRestoreStatus.invalid,
        failureReason: error.toString(),
      );
    } catch (error) {
      return SheetLibraryBackupRestoreResult(
        status: SheetLibraryBackupRestoreStatus.error,
        failureReason: error.toString(),
      );
    }
  }

  Future<SheetLibraryBackupRestoreResult> restoreFullBackupZipBytes(
    List<int> bytes,
  ) async {
    try {
      final archive = ZipDecoder().decodeBytes(bytes);
      final manifest = archive.findFile(
        SheetLibraryFullBackup.manifestFileName,
      );
      if (manifest == null || !manifest.isFile) {
        throw const FormatException('Full backup manifest is missing.');
      }

      final manifestJson = utf8.decode(manifest.content);
      final decoded = jsonDecode(manifestJson);
      if (decoded is! Map) {
        throw const FormatException('Full backup manifest must be an object.');
      }
      final manifestMap = decoded.map(
        (key, value) => MapEntry(key.toString(), value as Object?),
      );
      if (manifestMap['scope'] != SheetLibraryFullBackup.scope) {
        throw const FormatException('Backup is not a full Clef backup.');
      }

      final backup = SheetLibraryBackup.fromJson(manifestMap);
      final mappings = SheetLibraryFullBackupFileMapping.decodeList(
        manifestMap['fileMappings'],
      );
      final scoreFileMappingsByScoreId =
          <String, SheetLibraryFullBackupFileMapping>{
            for (final mapping in mappings.where(
              (mapping) => !mapping.isLinkedFile && !mapping.isAnnotationFile,
            ))
              mapping.scoreId: mapping,
          };
      final linkedFileMappingsByScoreId =
          <String, Map<String, SheetLibraryFullBackupFileMapping>>{};
      for (final mapping in mappings.where((mapping) => mapping.isLinkedFile)) {
        final linkedFilePath = mapping.linkedFilePath;
        if (linkedFilePath == null) {
          continue;
        }
        linkedFileMappingsByScoreId
            .putIfAbsent(
              mapping.scoreId,
              () => <String, SheetLibraryFullBackupFileMapping>{},
            )[linkedFilePath] = mapping;
      }
      final annotationMappingsByScoreId =
          <String, SheetLibraryFullBackupFileMapping>{
            for (final mapping in mappings.where(
              (mapping) => mapping.isAnnotationFile,
            ))
              mapping.scoreId: mapping,
          };
      final restoredScores = <SheetScore>[];

      for (final score in backup.scores) {
        var restoredScore = score;
        final mapping = scoreFileMappingsByScoreId[score.id];
        if (mapping == null ||
            mapping.missing ||
            !_isSafeScoreZipEntryPath(mapping.entryPath)) {
        } else {
          final entry = archive.findFile(mapping.entryPath);
          if (entry != null && entry.isFile) {
            final restoredPath = await _writeImportedPdf(
              bytes: entry.content,
              id: score.id,
              originalFileName: mapping.originalFileName,
            );
            restoredScore = restoredScore.copyWith(filePath: restoredPath);
          }
        }

        final linkedMappings =
            linkedFileMappingsByScoreId[score.id] ??
            const <String, SheetLibraryFullBackupFileMapping>{};
        if (linkedMappings.isNotEmpty && score.linkedFiles.isNotEmpty) {
          final restoredLinkedFiles = <SheetLinkedFile>[];
          for (final linkedFile in score.linkedFiles) {
            final linkedMapping = linkedMappings[linkedFile.path];
            if (linkedMapping == null ||
                linkedMapping.missing ||
                !_isSafeLinkedZipEntryPath(linkedMapping.entryPath)) {
              restoredLinkedFiles.add(linkedFile);
              continue;
            }
            final linkedEntry = archive.findFile(linkedMapping.entryPath);
            if (linkedEntry == null || !linkedEntry.isFile) {
              restoredLinkedFiles.add(linkedFile);
              continue;
            }
            final restoredPath = await _writeLinkedFile(
              bytes: linkedEntry.content,
              originalFileName: linkedMapping.originalFileName,
              importedAt: linkedFile.createdAt,
            );
            restoredLinkedFiles.add(linkedFile.copyWith(path: restoredPath));
          }
          restoredScore = restoredScore.copyWith(
            linkedFiles: List<SheetLinkedFile>.unmodifiable(
              restoredLinkedFiles,
            ),
          );
        }

        final annotationMapping = annotationMappingsByScoreId[score.id];
        if (annotationMapping != null &&
            !annotationMapping.missing &&
            _isSafeAnnotationZipEntryPath(annotationMapping.entryPath)) {
          final annotationEntry = archive.findFile(
            annotationMapping.entryPath,
          );
          if (annotationEntry != null && annotationEntry.isFile) {
            final restoredAnnotationPath = await _writeAnnotationFile(
              bytes: annotationEntry.content,
              scoreId: score.id,
              originalFileName: annotationMapping.originalFileName,
            );
            restoredScore = restoredScore.copyWith(
              annotationStorage: restoredScore.annotationStorage.copyWith(
                mode: SheetAnnotationStorageReference.fileMode,
                path: restoredAnnotationPath,
                updatedAt: DateTime.now(),
                lastSaveStatus: 'restored',
                lastSaveError: '',
              ),
            );
          }
        }

        restoredScores.add(restoredScore);
      }

      await saveScores(restoredScores);
      await saveSetlists(backup.setlists);
      await saveMetronomeSettings(backup.metronomeSettings);
      await saveTunerSettings(backup.tunerSettings);
      await saveLibraryViewSettings(backup.libraryViewSettings);
      await saveFavoriteAnnotationPreset(backup.favoriteAnnotationPreset);
      return SheetLibraryBackupRestoreResult(
        status: SheetLibraryBackupRestoreStatus.restored,
        restoredScoreCount: restoredScores.length,
        restoredSetlistCount: backup.setlists.length,
      );
    } on UnsupportedError catch (error) {
      return SheetLibraryBackupRestoreResult(
        status: SheetLibraryBackupRestoreStatus.unsupportedVersion,
        failureReason: error.toString(),
      );
    } on ArchiveException catch (error) {
      return SheetLibraryBackupRestoreResult(
        status: SheetLibraryBackupRestoreStatus.invalid,
        failureReason: error.toString(),
      );
    } on FormatException catch (error) {
      return SheetLibraryBackupRestoreResult(
        status: SheetLibraryBackupRestoreStatus.invalid,
        failureReason: error.toString(),
      );
    } catch (error) {
      return SheetLibraryBackupRestoreResult(
        status: SheetLibraryBackupRestoreStatus.error,
        failureReason: error.toString(),
      );
    }
  }

  Future<String> _writeImportedPdf({
    required List<int> bytes,
    required String id,
    required String originalFileName,
  }) async {
    final documents = await getApplicationDocumentsDirectory();
    final scoresDir = Directory('${documents.path}/$_pdfFolderName');
    if (!scoresDir.existsSync()) {
      await scoresDir.create(recursive: true);
    }

    final safeName = _safeFileName(originalFileName);
    final file = File('${scoresDir.path}/$id-$safeName');
    await file.writeAsBytes(bytes, flush: true);
    return file.path;
  }

  Future<String> _writeLinkedFile({
    required List<int> bytes,
    required String originalFileName,
    required DateTime importedAt,
  }) async {
    final documents = await getApplicationDocumentsDirectory();
    final linkedFilesDir = Directory(
      '${documents.path}/$_linkedFilesFolderName',
    );
    if (!linkedFilesDir.existsSync()) {
      await linkedFilesDir.create(recursive: true);
    }

    final safeName = _safeFileName(originalFileName);
    final id = _newId(importedAt);
    final file = File('${linkedFilesDir.path}/$id-$safeName');
    await file.writeAsBytes(bytes, flush: true);
    return file.path;
  }

  Future<String> _writeAnnotationFile({
    required List<int> bytes,
    required String scoreId,
    required String originalFileName,
  }) async {
    final documents = await getApplicationDocumentsDirectory();
    final annotationsDir = Directory('${documents.path}/annotations');
    if (!annotationsDir.existsSync()) {
      await annotationsDir.create(recursive: true);
    }

    final safeName = _safeFileName(originalFileName);
    final file = File('${annotationsDir.path}/$scoreId-$safeName');
    await file.writeAsBytes(bytes, flush: true);
    return file.path;
  }

  Future<String> _sanitizedPdfPath(SheetScore score) async {
    final documents = await getApplicationDocumentsDirectory();
    final scoresDir = Directory('${documents.path}/$_pdfFolderName');
    if (!scoresDir.existsSync()) {
      await scoresDir.create(recursive: true);
    }

    final originalName = score.filePath.split(Platform.pathSeparator).last;
    final withoutExtension = originalName.replaceFirst(
      RegExp(r'\.pdf$', caseSensitive: false),
      '',
    );
    final safeName = _safeFileName('$withoutExtension-links-disabled.pdf');
    final stamp = DateTime.now().microsecondsSinceEpoch;
    return '${scoresDir.path}/${score.id}-$stamp-$safeName';
  }

  Future<String> _annotatedPdfPath(SheetScore score) async {
    final documents = await getApplicationDocumentsDirectory();
    final exportsDir = Directory('${documents.path}/exports');
    if (!exportsDir.existsSync()) {
      await exportsDir.create(recursive: true);
    }

    final safeName = _safeFileName(
      SheetScoreSharePolicy.exportFileName(
        title: '${score.title} annotated',
        composer: score.composer,
      ),
    );
    final stamp = DateTime.now().microsecondsSinceEpoch;
    return '${exportsDir.path}/${score.id}-$stamp-$safeName';
  }

  Future<String> _rotatedPdfPath(SheetScore score) async {
    final documents = await getApplicationDocumentsDirectory();
    final scoresDir = Directory('${documents.path}/$_pdfFolderName');
    if (!scoresDir.existsSync()) {
      await scoresDir.create(recursive: true);
    }

    final originalName = score.filePath.split(Platform.pathSeparator).last;
    final withoutExtension = originalName.replaceFirst(
      RegExp(r'\.pdf$', caseSensitive: false),
      '',
    );
    final safeName = _safeFileName('$withoutExtension-rotated.pdf');
    final stamp = DateTime.now().microsecondsSinceEpoch;
    return '${scoresDir.path}/${score.id}-$stamp-$safeName';
  }

  Future<String> _writeInternalBackup(String fileName, String contents) async {
    final documents = await getApplicationDocumentsDirectory();
    final backupsDir = Directory('${documents.path}/$_backupFolderName');
    if (!backupsDir.existsSync()) {
      await backupsDir.create(recursive: true);
    }
    final file = File('${backupsDir.path}/${_safeFileName(fileName)}');
    await file.writeAsString(contents, flush: true);
    return file.path;
  }

  Future<String> _writeInternalBackupBytes(
    String fileName,
    List<int> bytes,
  ) async {
    final documents = await getApplicationDocumentsDirectory();
    final backupsDir = Directory('${documents.path}/$_backupFolderName');
    if (!backupsDir.existsSync()) {
      await backupsDir.create(recursive: true);
    }
    final file = File('${backupsDir.path}/${_safeFileName(fileName)}');
    await file.writeAsBytes(bytes, flush: true);
    return file.path;
  }

  List<SheetScore> _sortScores(List<SheetScore> scores) {
    final sorted = scores.toList();
    sorted.sort((a, b) {
      final aDate = a.lastOpenedAt ?? a.importedAt;
      final bDate = b.lastOpenedAt ?? b.importedAt;
      return bDate.compareTo(aDate);
    });
    return sorted;
  }

  String? _getStringWithLegacyFallback(
    SharedPreferences preferences,
    String key,
    String legacyKey,
  ) {
    return preferences.getString(key) ?? preferences.getString(legacyKey);
  }

  String _titleFromFileName(String name) {
    return SheetFileImportPolicy.titleFromFileName(name);
  }

  String _safeFileName(String name) {
    return SheetFileImportPolicy.safeFileName(name);
  }

  String _newId(DateTime now) {
    return '${now.microsecondsSinceEpoch}-${Random().nextInt(1 << 32)}';
  }

  String _backupFileName(DateTime value) {
    final year = value.year.toString().padLeft(4, '0');
    final month = value.month.toString().padLeft(2, '0');
    final day = value.day.toString().padLeft(2, '0');
    final hour = value.hour.toString().padLeft(2, '0');
    final minute = value.minute.toString().padLeft(2, '0');
    final second = value.second.toString().padLeft(2, '0');
    return 'clef-metadata-$year$month$day-$hour$minute$second.json';
  }

  String _fullBackupFileName(DateTime value) {
    final year = value.year.toString().padLeft(4, '0');
    final month = value.month.toString().padLeft(2, '0');
    final day = value.day.toString().padLeft(2, '0');
    final hour = value.hour.toString().padLeft(2, '0');
    final minute = value.minute.toString().padLeft(2, '0');
    final second = value.second.toString().padLeft(2, '0');
    return 'clef-full-$year$month$day-$hour$minute$second.zip';
  }

  bool _isSafeScoreZipEntryPath(String path) {
    return _isSafeZipEntryPath(path, requiredPrefix: 'scores/');
  }

  bool _isSafeLinkedZipEntryPath(String path) {
    return _isSafeZipEntryPath(path, requiredPrefix: 'linked-files/');
  }

  bool _isSafeAnnotationZipEntryPath(String path) {
    return _isSafeZipEntryPath(path, requiredPrefix: 'annotations/');
  }

  bool _isSafeZipEntryPath(String path, {required String requiredPrefix}) {
    return path.startsWith(requiredPrefix) &&
        !path.contains('..') &&
        !path.startsWith('/') &&
        !path.contains('\\');
  }
}

class SheetScoreShareCandidate {
  const SheetScoreShareCandidate({
    required this.label,
    required this.path,
    required this.fileName,
    required this.mimeType,
    required this.isSanitizedCopy,
    this.isLinkedFile = false,
  });

  final String label;
  final String path;
  final String fileName;
  final String mimeType;
  final bool isSanitizedCopy;
  final bool isLinkedFile;
}
