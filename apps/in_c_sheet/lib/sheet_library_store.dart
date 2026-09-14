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
import 'sheet_bookmark_import.dart';
import 'sheet_library_backup.dart';
import 'sheet_library_profile.dart';
import 'sheet_library_view_settings.dart';
import 'sheet_metronome.dart';
import 'sheet_file_import.dart';
import 'sheet_pdf_link_sanitizer.dart';
import 'sheet_pdf_page_transformer.dart';
import 'sheet_score.dart';
import 'sheet_setlist.dart';
import 'sheet_tone.dart';
import 'sheet_tuner.dart';

Map<String, Object?>? _jsonMapFromString(String? value) {
  if (value == null || value.trim().isEmpty) {
    return null;
  }
  try {
    final decoded = jsonDecode(value);
    if (decoded is! Map) {
      return null;
    }
    return decoded.map(
      (key, mapValue) => MapEntry(key.toString(), mapValue as Object?),
    );
  } catch (_) {
    return null;
  }
}

class SheetLibraryStore {
  // All instances share the preferences cache and automatic backup keys.
  static Future<void>? _metadataWrites;
  static const _scoresKey = 'clef_scores';
  static const _setlistsKey = 'clef_setlists';
  static const _metronomeSettingsKey = 'clef_metronome_settings';
  static const _tunerSettingsKey = 'clef_tuner_settings';
  static const _toneSettingsKey = 'clef_tone_settings';
  static const _libraryViewSettingsKey = 'clef_library_view_settings';
  static const _globalViewerSettingsKey = 'clef_global_viewer_settings';
  static const _performancePresetTemplatesKey =
      'clef_performance_preset_templates';
  static const _favoriteAnnotationPresetKey = 'clef_favorite_annotation_preset';
  static const _automaticMetadataBackupKey = 'clef_automatic_metadata_backup';
  static const _libraryProfilesKey = 'clef_library_profiles';
  static const _activeLibraryProfileKey = 'clef_active_library_profile';
  static const _legacyScoresKey = 'in_c_sheet_scores';
  static const _legacySetlistsKey = 'in_c_sheet_setlists';
  static const _legacyMetronomeSettingsKey = 'in_c_sheet_metronome_settings';
  static const _legacyTunerSettingsKey = 'in_c_sheet_tuner_settings';
  static const _legacyLibraryViewSettingsKey =
      'in_c_sheet_library_view_settings';
  static const _pdfFolderName = 'scores';
  static const _linkedFilesFolderName = 'linked-files';
  static const _backupFolderName = 'backups';

  Future<List<SheetLibraryProfile>> loadLibraryProfiles() async {
    final preferences = await SharedPreferences.getInstance();
    final profiles = SheetLibraryProfileCodec.decode(
      preferences.getString(_libraryProfilesKey),
    );
    await preferences.setString(
      _libraryProfilesKey,
      SheetLibraryProfileCodec.encode(profiles),
    );
    return profiles;
  }

  Future<SheetLibraryProfile> loadActiveLibraryProfile() async {
    final preferences = await SharedPreferences.getInstance();
    final profiles = await loadLibraryProfiles();
    final activeId =
        preferences.getString(_activeLibraryProfileKey) ??
        SheetLibraryProfile.defaultId;
    return _profileById(profiles, activeId) ??
        SheetLibraryProfile.defaultProfile;
  }

  Future<void> setActiveLibraryProfile(String id) async {
    final preferences = await SharedPreferences.getInstance();
    final profiles = await loadLibraryProfiles();
    final active =
        _profileById(profiles, id) ?? SheetLibraryProfile.defaultProfile;
    await preferences.setString(_activeLibraryProfileKey, active.id);
  }

  Future<SheetLibraryProfile> createLibraryProfile(String name) async {
    final normalized = _normalizeLibraryName(name);
    if (normalized.isEmpty) {
      return loadActiveLibraryProfile();
    }
    final preferences = await SharedPreferences.getInstance();
    final profiles = await loadLibraryProfiles();
    for (final profile in profiles) {
      if (profile.name.toLowerCase() == normalized.toLowerCase()) {
        await preferences.setString(_activeLibraryProfileKey, profile.id);
        return profile;
      }
    }
    final now = DateTime.now();
    final profile = SheetLibraryProfile(
      id: _newLibraryProfileId(now),
      name: normalized,
      createdAt: now,
      updatedAt: now,
    );
    final nextProfiles = SheetLibraryProfile.normalizeProfiles([
      ...profiles,
      profile,
    ]);
    await preferences.setString(
      _libraryProfilesKey,
      SheetLibraryProfileCodec.encode(nextProfiles),
    );
    await preferences.setString(_activeLibraryProfileKey, profile.id);
    return profile;
  }

  Future<SheetLibraryProfile?> renameLibraryProfile({
    required String id,
    required String name,
  }) async {
    if (id == SheetLibraryProfile.defaultId) {
      return SheetLibraryProfile.defaultProfile;
    }
    final normalized = _normalizeLibraryName(name);
    if (normalized.isEmpty) {
      return null;
    }
    final preferences = await SharedPreferences.getInstance();
    final profiles = await loadLibraryProfiles();
    if (profiles.any(
      (profile) =>
          profile.id != id &&
          profile.name.toLowerCase() == normalized.toLowerCase(),
    )) {
      return null;
    }
    final now = DateTime.now();
    SheetLibraryProfile? renamed;
    final nextProfiles = profiles
        .map((profile) {
          if (profile.id != id) {
            return profile;
          }
          renamed = profile.copyWith(name: normalized, updatedAt: now);
          return renamed!;
        })
        .toList(growable: false);
    if (renamed == null) {
      return null;
    }
    await preferences.setString(
      _libraryProfilesKey,
      SheetLibraryProfileCodec.encode(nextProfiles),
    );
    return renamed;
  }

  Future<bool> clearLibraryProfile(String id) async {
    if (id == SheetLibraryProfile.defaultId) {
      return false;
    }
    final preferences = await SharedPreferences.getInstance();
    final profiles = await loadLibraryProfiles();
    if (_profileById(profiles, id) == null) {
      return false;
    }
    await _removeLibraryData(preferences, id);
    return true;
  }

  Future<bool> deleteLibraryProfile(String id) async {
    if (id == SheetLibraryProfile.defaultId) {
      return false;
    }
    final preferences = await SharedPreferences.getInstance();
    final profiles = await loadLibraryProfiles();
    if (_profileById(profiles, id) == null) {
      return false;
    }
    final nextProfiles = profiles
        .where((profile) => profile.id != id)
        .toList(growable: false);
    await preferences.setString(
      _libraryProfilesKey,
      SheetLibraryProfileCodec.encode(nextProfiles),
    );
    await _removeLibraryData(preferences, id);
    if (preferences.getString(_activeLibraryProfileKey) == id) {
      await preferences.setString(
        _activeLibraryProfileKey,
        SheetLibraryProfile.defaultId,
      );
    }
    return true;
  }

  Future<String> _activeLibraryId(SharedPreferences preferences) async {
    final profiles = await loadLibraryProfiles();
    final activeId =
        preferences.getString(_activeLibraryProfileKey) ??
        SheetLibraryProfile.defaultId;
    final active = _profileById(profiles, activeId);
    return active?.id ?? SheetLibraryProfile.defaultId;
  }

  Future<void> _removeLibraryData(
    SharedPreferences preferences,
    String libraryId,
  ) async {
    await preferences.remove(_scopedKey(_scoresKey, libraryId));
    await preferences.remove(_scopedKey(_setlistsKey, libraryId));
    await preferences.remove(_scopedKey(_libraryViewSettingsKey, libraryId));
    await preferences.remove(
      _scopedKey(_favoriteAnnotationPresetKey, libraryId),
    );
    await preferences.remove(
      _scopedKey(_automaticMetadataBackupKey, libraryId),
    );
  }

  static SheetLibraryProfile? _profileById(
    List<SheetLibraryProfile> profiles,
    String id,
  ) {
    for (final profile in profiles) {
      if (profile.id == id) {
        return profile;
      }
    }
    return null;
  }

  static String _scopedKey(String key, String libraryId) {
    if (libraryId == SheetLibraryProfile.defaultId) {
      return key;
    }
    return '$key.$libraryId';
  }

  static String _normalizeLibraryName(String value) {
    return value.trim().replaceAll(RegExp(r'\s+'), ' ');
  }

  static String _newLibraryProfileId(DateTime now) {
    return 'library-${now.microsecondsSinceEpoch}';
  }

  List<SheetScore> _readScores(
    SharedPreferences preferences,
    String activeLibraryId,
  ) {
    return SheetScore.decodeList(
      activeLibraryId == SheetLibraryProfile.defaultId
          ? _getStringWithLegacyFallback(
              preferences,
              _scoresKey,
              _legacyScoresKey,
            )
          : preferences.getString(_scopedKey(_scoresKey, activeLibraryId)),
    );
  }

  List<SheetSetlist> _readSetlists(
    SharedPreferences preferences,
    String activeLibraryId,
  ) {
    return SheetSetlist.decodeList(
      activeLibraryId == SheetLibraryProfile.defaultId
          ? _getStringWithLegacyFallback(
              preferences,
              _setlistsKey,
              _legacySetlistsKey,
            )
          : preferences.getString(_scopedKey(_setlistsKey, activeLibraryId)),
    );
  }

  SheetLibraryViewSettings _readLibraryViewSettings(
    SharedPreferences preferences,
    String activeLibraryId,
  ) {
    return SheetLibraryViewSettingsCodec.decode(
      activeLibraryId == SheetLibraryProfile.defaultId
          ? _getStringWithLegacyFallback(
              preferences,
              _libraryViewSettingsKey,
              _legacyLibraryViewSettingsKey,
            )
          : preferences.getString(
              _scopedKey(_libraryViewSettingsKey, activeLibraryId),
            ),
    );
  }

  SheetViewerSettings _readGlobalViewerSettings(SharedPreferences preferences) {
    return SheetViewerSettings.fromJson(
      _jsonMapFromString(preferences.getString(_globalViewerSettingsKey)),
    );
  }

  List<SheetPerformancePresetTemplate> _readPerformancePresetTemplates(
    SharedPreferences preferences,
    String activeLibraryId,
  ) {
    return SheetPerformancePresetTemplateCodec.decode(
      preferences.getString(
        _scopedKey(_performancePresetTemplatesKey, activeLibraryId),
      ),
    );
  }

  String? _readFavoriteAnnotationPresetJson(
    SharedPreferences preferences,
    String activeLibraryId,
  ) {
    return preferences.getString(
      _scopedKey(_favoriteAnnotationPresetKey, activeLibraryId),
    );
  }

  SheetAnnotationToolPreset? _readFavoriteAnnotationPreset(
    SharedPreferences preferences,
    String activeLibraryId,
  ) {
    final value = _readFavoriteAnnotationPresetJson(
      preferences,
      activeLibraryId,
    );
    if (value == null) {
      return null;
    }
    try {
      final decoded = jsonDecode(value);
      if (decoded is! Map) {
        return null;
      }
      final preset = SheetAnnotationToolPreset.fromJson(
        decoded.map((key, value) => MapEntry(key.toString(), value as Object?)),
      );
      return preset.isValid ? preset : null;
    } catch (_) {
      return null;
    }
  }

  String _encodeAutomaticMetadataBackup(
    SharedPreferences preferences,
    String activeLibraryId,
  ) {
    final backup = SheetLibraryBackup.fromState(
      scores: _readScores(preferences, activeLibraryId),
      setlists: _readSetlists(preferences, activeLibraryId),
      metronomeSettings: SheetMetronomeCodec.decode(
        _getStringWithLegacyFallback(
          preferences,
          _metronomeSettingsKey,
          _legacyMetronomeSettingsKey,
        ),
      ),
      tunerSettings: SheetTunerCodec.decode(
        _getStringWithLegacyFallback(
          preferences,
          _tunerSettingsKey,
          _legacyTunerSettingsKey,
        ),
      ),
      toneSettings: SheetToneCodec.decode(
        preferences.getString(_toneSettingsKey),
      ),
      libraryViewSettings: _readLibraryViewSettings(
        preferences,
        activeLibraryId,
      ),
      globalViewerSettings: _readGlobalViewerSettings(preferences),
      performancePresetTemplates: _readPerformancePresetTemplates(
        preferences,
        activeLibraryId,
      ),
      favoriteAnnotationPreset: _readFavoriteAnnotationPreset(
        preferences,
        activeLibraryId,
      ),
    );
    return SheetLibraryBackupCodec.encode(backup);
  }

  Future<List<SheetScore>> loadScores() async {
    final preferences = await SharedPreferences.getInstance();
    final activeLibraryId = await _activeLibraryId(preferences);
    final scores = _readScores(preferences, activeLibraryId);
    return _sortScores(scores);
  }

  Future<void> saveScores(List<SheetScore> scores) async {
    final preferences = await SharedPreferences.getInstance();
    final activeLibraryId = await _activeLibraryId(preferences);
    await _writeMetadataValues(preferences, {
      _scopedKey(_scoresKey, activeLibraryId): SheetScore.encodeList(scores),
    }, automaticBackupLibraryId: activeLibraryId);
  }

  Future<List<SheetSetlist>> loadSetlists() async {
    final preferences = await SharedPreferences.getInstance();
    final activeLibraryId = await _activeLibraryId(preferences);
    return _readSetlists(preferences, activeLibraryId);
  }

  Future<void> saveScoresAndSetlists(
    List<SheetScore> scores,
    List<SheetSetlist> setlists, {
    required String libraryId,
  }) async {
    final preferences = await SharedPreferences.getInstance();
    await _writeMetadataValues(preferences, {
      _scopedKey(_scoresKey, libraryId): SheetScore.encodeList(scores),
      _scopedKey(_setlistsKey, libraryId): SheetSetlist.encodeList(setlists),
    }, automaticBackupLibraryId: libraryId);
  }

  Future<void> saveSetlists(List<SheetSetlist> setlists) async {
    final preferences = await SharedPreferences.getInstance();
    final activeLibraryId = await _activeLibraryId(preferences);
    await _writeMetadataValues(preferences, {
      _scopedKey(_setlistsKey, activeLibraryId): SheetSetlist.encodeList(
        setlists,
      ),
    }, automaticBackupLibraryId: activeLibraryId);
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
    await _writeMetadataValues(preferences, {
      _metronomeSettingsKey: SheetMetronomeCodec.encode(settings),
    }, automaticBackupLibraryId: await _activeLibraryId(preferences));
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
    await _writeMetadataValues(preferences, {
      _tunerSettingsKey: SheetTunerCodec.encode(settings),
    }, automaticBackupLibraryId: await _activeLibraryId(preferences));
  }

  Future<SheetToneSettings> loadToneSettings() async {
    final preferences = await SharedPreferences.getInstance();
    return SheetToneCodec.decode(preferences.getString(_toneSettingsKey));
  }

  Future<void> saveToneSettings(SheetToneSettings settings) async {
    final preferences = await SharedPreferences.getInstance();
    await _writeMetadataValues(preferences, {
      _toneSettingsKey: SheetToneCodec.encode(settings),
    }, automaticBackupLibraryId: await _activeLibraryId(preferences));
  }

  Future<SheetLibraryViewSettings> loadLibraryViewSettings() async {
    final preferences = await SharedPreferences.getInstance();
    final activeLibraryId = await _activeLibraryId(preferences);
    return _readLibraryViewSettings(preferences, activeLibraryId);
  }

  Future<void> saveLibraryViewSettings(
    SheetLibraryViewSettings settings,
  ) async {
    final preferences = await SharedPreferences.getInstance();
    final activeLibraryId = await _activeLibraryId(preferences);
    await _writeMetadataValues(preferences, {
      _scopedKey(_libraryViewSettingsKey, activeLibraryId):
          SheetLibraryViewSettingsCodec.encode(settings),
    }, automaticBackupLibraryId: activeLibraryId);
  }

  Future<SheetViewerSettings> loadGlobalViewerSettings() async {
    final preferences = await SharedPreferences.getInstance();
    return _readGlobalViewerSettings(preferences);
  }

  Future<void> saveGlobalViewerSettings(SheetViewerSettings settings) async {
    final preferences = await SharedPreferences.getInstance();
    await _writeMetadataValues(preferences, {
      _globalViewerSettingsKey: jsonEncode(settings.toJson()),
    }, automaticBackupLibraryId: await _activeLibraryId(preferences));
  }

  Future<List<SheetPerformancePresetTemplate>>
  loadPerformancePresetTemplates() async {
    final preferences = await SharedPreferences.getInstance();
    final activeLibraryId = await _activeLibraryId(preferences);
    return _readPerformancePresetTemplates(preferences, activeLibraryId);
  }

  Future<void> savePerformancePresetTemplates(
    List<SheetPerformancePresetTemplate> templates,
  ) async {
    final preferences = await SharedPreferences.getInstance();
    final activeLibraryId = await _activeLibraryId(preferences);
    final normalized = SheetPerformancePresetTemplate.normalizeList(templates);
    await _writeMetadataValues(preferences, {
      _scopedKey(_performancePresetTemplatesKey, activeLibraryId):
          SheetPerformancePresetTemplateCodec.encode(normalized),
    }, automaticBackupLibraryId: activeLibraryId);
  }

  Future<SheetAnnotationToolPreset?> loadFavoriteAnnotationPreset() async {
    final preferences = await SharedPreferences.getInstance();
    final activeLibraryId = await _activeLibraryId(preferences);
    return _readFavoriteAnnotationPreset(preferences, activeLibraryId);
  }

  Future<void> saveFavoriteAnnotationPreset(
    SheetAnnotationToolPreset? preset,
  ) async {
    final preferences = await SharedPreferences.getInstance();
    final activeLibraryId = await _activeLibraryId(preferences);
    final key = _scopedKey(_favoriteAnnotationPresetKey, activeLibraryId);
    await _writeMetadataValues(preferences, {
      key: preset != null && preset.isValid
          ? const JsonEncoder.withIndent('  ').convert(preset.toJson())
          : null,
    }, automaticBackupLibraryId: activeLibraryId);
  }

  Future<String?> loadAutomaticMetadataBackupJson() async {
    final preferences = await SharedPreferences.getInstance();
    final activeLibraryId = await _activeLibraryId(preferences);
    return preferences.getString(
      _scopedKey(_automaticMetadataBackupKey, activeLibraryId),
    );
  }

  Future<SheetLibraryBackup?> loadAutomaticMetadataBackup() async {
    final value = await loadAutomaticMetadataBackupJson();
    if (value == null || value.trim().isEmpty) {
      return null;
    }
    try {
      return SheetLibraryBackupCodec.decode(value);
    } catch (_) {
      return null;
    }
  }

  Future<SheetLibraryBackupRestoreResult>
  restoreAutomaticMetadataBackup() async {
    final value = await loadAutomaticMetadataBackupJson();
    if (value == null || value.trim().isEmpty) {
      return const SheetLibraryBackupRestoreResult(
        status: SheetLibraryBackupRestoreStatus.invalid,
        failureReason: 'No automatic metadata backup is available.',
      );
    }
    return restoreMetadataBackupJson(value);
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

  Future<List<SheetScore>> importPdfs() async {
    final files = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: const <String>['pdf'],
    );

    if (files.isEmpty) {
      return const <SheetScore>[];
    }

    final scores = <SheetScore>[];
    for (final file in files) {
      if (!SheetFileImportPolicy.isPdfFileName(file.name)) {
        throw FormatException('Unsupported PDF file: ${file.name}');
      }
      scores.add(
        await importPdfBytes(
          bytes: await file.readAsBytes(),
          fileName: file.name,
        ),
      );
    }
    return List<SheetScore>.unmodifiable(scores);
  }

  Future<List<SheetBookmark>> importBookmarkCsv({
    required int pageCount,
  }) async {
    final files = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: const <String>['csv', 'txt'],
    );

    if (files.isEmpty) {
      return const <SheetBookmark>[];
    }

    final text = utf8.decode(
      await files.first.readAsBytes(),
      allowMalformed: true,
    );
    return SheetBookmarkCsvImporter.parse(
      text,
      pageCount: pageCount,
      createdAt: DateTime.now(),
    );
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
      allowedExtensions: const <String>['jpg', 'jpeg', 'png', 'heic', 'heif'],
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
    final score = await importPdfBytes(
      bytes: pdfBytes,
      fileName: outputFileName,
      importedAt: importedAt,
    );
    final linkedImages = <SheetLinkedFile>[];
    final now = importedAt ?? DateTime.now();
    for (var index = 0; index < images.length; index += 1) {
      final image = images[index];
      linkedImages.add(
        (await importLinkedFileBytes(
          bytes: image.bytes,
          fileName: image.name,
          importedAt: now.add(Duration(microseconds: index)),
        )).copyWith(role: SheetLinkedFile.referenceRole),
      );
    }
    if (linkedImages.isEmpty) {
      return score;
    }
    return score.copyWith(
      linkedFiles: SheetScore.normalizeLinkedFiles(linkedImages),
    );
  }

  Future<SheetLinkedFile?> pickLinkedFile() async {
    final file = await FilePicker.pickFile(
      type: FileType.custom,
      allowedExtensions: const <String>[
        'pdf',
        'jpg',
        'jpeg',
        'png',
        'mp3',
        'wav',
        'm4a',
        'aac',
        'flac',
        'ogg',
      ],
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
        !SheetFileImportPolicy.isSupportedImageFileName(fileName) &&
        !SheetFileImportPolicy.isSupportedAudioFileName(fileName)) {
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
      'mp3' => 'audio/mpeg',
      'wav' => 'audio/wav',
      'm4a' => 'audio/mp4',
      'aac' => 'audio/aac',
      'flac' => 'audio/flac',
      'ogg' => 'audio/ogg',
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

  Future<SheetPdfPageCropResult> createPageCropAppliedCopy(
    SheetScore score,
  ) async {
    final outputPath = await _croppedPdfPath(score);
    return SheetPdfPageTransformer.createCropAppliedCopy(
      inputPath: score.filePath,
      outputPath: outputPath,
      pageSettings: score.pageSettings,
    );
  }

  Future<SheetPdfPageArrangementResult> createPageArrangementAppliedCopy(
    SheetScore score,
  ) async {
    final outputPath = await _arrangedPdfPath(score);
    return SheetPdfPageTransformer.createArrangementAppliedCopy(
      inputPath: score.filePath,
      outputPath: outputPath,
      pageSettings: score.pageSettings,
    );
  }

  Future<String> exportMetadataBackupJson() async {
    final backup = SheetLibraryBackup.fromState(
      scores: await loadScores(),
      setlists: await loadSetlists(),
      metronomeSettings: await loadMetronomeSettings(),
      tunerSettings: await loadTunerSettings(),
      toneSettings: await loadToneSettings(),
      libraryViewSettings: await loadLibraryViewSettings(),
      globalViewerSettings: await loadGlobalViewerSettings(),
      performancePresetTemplates: await loadPerformancePresetTemplates(),
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
      toneSettings: await loadToneSettings(),
      libraryViewSettings: await loadLibraryViewSettings(),
      globalViewerSettings: await loadGlobalViewerSettings(),
      performancePresetTemplates: await loadPerformancePresetTemplates(),
      favoriteAnnotationPreset: await loadFavoriteAnnotationPreset(),
      exportedAt: exportedAt,
    );
    final archive = Archive();
    final mappings = <SheetLibraryFullBackupFileMapping>[];
    final scoreEntriesByPath = <String, String>{};

    for (final score in scores) {
      final originalFile = File(score.filePath);
      final originalFileName = score.filePath
          .split(Platform.pathSeparator)
          .last;
      final safeName = _safeFileName(originalFileName);
      final existingEntryPath = scoreEntriesByPath[score.filePath];
      final entryPath = existingEntryPath ?? 'scores/${score.id}-$safeName';
      final exists = await originalFile.exists();
      mappings.add(
        SheetLibraryFullBackupFileMapping(
          scoreId: score.id,
          entryPath: entryPath,
          originalFileName: safeName,
          missing: !exists,
        ),
      );
      if (exists && existingEntryPath == null) {
        archive.addFile(
          ArchiveFile.bytes(entryPath, await originalFile.readAsBytes()),
        );
        scoreEntriesByPath[score.filePath] = entryPath;
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
            ArchiveFile.bytes(linkedEntryPath, await sourceFile.readAsBytes()),
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
      await _restoreBackupMetadata(backup);
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
      _validateFullBackupFiles(
        archive,
        backup,
        manifestMap['fileMappings'],
        mappings,
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
        linkedFileMappingsByScoreId.putIfAbsent(
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
      final restoredScorePathsByEntry = <String, String>{};

      // Other libraries may still reference files from an earlier restore.
      for (final score in backup.scores) {
        var restoredScore = score;
        final mapping = scoreFileMappingsByScoreId[score.id];
        if (mapping == null ||
            mapping.missing ||
            !_isSafeScoreZipEntryPath(mapping.entryPath)) {
        } else {
          final entry = archive.findFile(mapping.entryPath);
          if (entry != null && entry.isFile) {
            final restoredPath =
                restoredScorePathsByEntry[mapping.entryPath] ??
                await _writeRestoredFile(
                  bytes: entry.content,
                  originalFileName: mapping.originalFileName,
                );
            restoredScorePathsByEntry[mapping.entryPath] = restoredPath;
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
          final annotationEntry = archive.findFile(annotationMapping.entryPath);
          if (annotationEntry != null && annotationEntry.isFile) {
            final restoredAnnotationPath = await _writeRestoredFile(
              bytes: annotationEntry.content,
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

      await _restoreBackupMetadata(backup, restoredScores: restoredScores);
      final sourcePathsByScoreId = <String, String>{
        for (final score in backup.scores) score.id: score.filePath,
      };
      return SheetLibraryBackupRestoreResult(
        status: SheetLibraryBackupRestoreStatus.restored,
        restoredScoreCount: restoredScores.length,
        restoredSetlistCount: backup.setlists.length,
        missingFileCount: mappings
            .where((mapping) => mapping.missing)
            .map(
              (mapping) =>
                  mapping.linkedFilePath ??
                  mapping.annotationStoragePath ??
                  sourcePathsByScoreId[mapping.scoreId]!,
            )
            .toSet()
            .length,
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

  Future<void> _restoreBackupMetadata(
    SheetLibraryBackup backup, {
    List<SheetScore>? restoredScores,
  }) async {
    final preferences = await SharedPreferences.getInstance();
    final libraryId = await _activeLibraryId(preferences);
    final restored = SheetLibraryBackup.fromState(
      scores: restoredScores ?? backup.scores,
      setlists: backup.setlists,
      metronomeSettings: backup.metronomeSettings,
      tunerSettings: backup.tunerSettings,
      toneSettings: backup.toneSettings,
      libraryViewSettings: backup.libraryViewSettings,
      globalViewerSettings: backup.globalViewerSettings,
      performancePresetTemplates: backup.performancePresetTemplates,
      favoriteAnnotationPreset: backup.favoriteAnnotationPreset,
    );
    final preset = restored.favoriteAnnotationPreset;
    final values = <String, String?>{
      _scopedKey(_scoresKey, libraryId): SheetScore.encodeList(restored.scores),
      _scopedKey(_setlistsKey, libraryId): SheetSetlist.encodeList(
        restored.setlists,
      ),
      _metronomeSettingsKey: SheetMetronomeCodec.encode(
        restored.metronomeSettings,
      ),
      _tunerSettingsKey: SheetTunerCodec.encode(restored.tunerSettings),
      _toneSettingsKey: SheetToneCodec.encode(restored.toneSettings),
      _scopedKey(_libraryViewSettingsKey, libraryId):
          SheetLibraryViewSettingsCodec.encode(restored.libraryViewSettings),
      _globalViewerSettingsKey: jsonEncode(
        restored.globalViewerSettings.toJson(),
      ),
      _scopedKey(
        _performancePresetTemplatesKey,
        libraryId,
      ): SheetPerformancePresetTemplateCodec.encode(
        restored.performancePresetTemplates,
      ),
      _scopedKey(
        _favoriteAnnotationPresetKey,
        libraryId,
      ): preset != null && preset.isValid
          ? const JsonEncoder.withIndent('  ').convert(preset.toJson())
          : null,
      _scopedKey(_automaticMetadataBackupKey, libraryId):
          SheetLibraryBackupCodec.encode(restored),
    };
    await _writeMetadataValues(preferences, values);
  }

  Future<void> _writeMetadataValues(
    SharedPreferences preferences,
    Map<String, String?> values, {
    String? automaticBackupLibraryId,
  }) {
    final previous = _metadataWrites;
    final result = () async {
      if (previous != null) {
        try {
          await previous;
        } catch (_) {
          // A failed request must not prevent a later save or retry.
        }
      }
      await _commitMetadataValues(
        preferences,
        values,
        automaticBackupLibraryId: automaticBackupLibraryId,
      );
    }();
    _metadataWrites = result;
    return result.whenComplete(() {
      if (identical(_metadataWrites, result)) _metadataWrites = null;
    });
  }

  Future<void> _commitMetadataValues(
    SharedPreferences preferences,
    Map<String, String?> values, {
    String? automaticBackupLibraryId,
  }) async {
    final backupKey = automaticBackupLibraryId == null
        ? null
        : _scopedKey(_automaticMetadataBackupKey, automaticBackupLibraryId);
    final previous = <String, String?>{
      for (final key in values.keys) key: preferences.getString(key),
    };
    if (backupKey != null) {
      previous[backupKey] = preferences.getString(backupKey);
    }
    final attempted = <String>[];
    try {
      for (final entry in values.entries) {
        // Include the failing key: SharedPreferences updates its cache before I/O.
        attempted.add(entry.key);
        final saved = entry.value == null
            ? await preferences.remove(entry.key)
            : await preferences.setString(entry.key, entry.value!);
        if (!saved) {
          throw StateError('Backup metadata write failed: ${entry.key}');
        }
      }
      if (backupKey != null) {
        final backup = _encodeAutomaticMetadataBackup(
          preferences,
          automaticBackupLibraryId!,
        );
        attempted.add(backupKey);
        if (!await preferences.setString(backupKey, backup)) {
          throw StateError(
            'Automatic metadata backup write failed: $backupKey',
          );
        }
      }
    } catch (_) {
      final rollbackFailures = <String>[];
      for (final key in attempted.reversed) {
        try {
          final value = previous[key];
          final saved = value == null
              ? await preferences.remove(key)
              : await preferences.setString(key, value);
          if (!saved) rollbackFailures.add(key);
        } catch (_) {
          rollbackFailures.add(key);
        }
      }
      if (rollbackFailures.isNotEmpty) {
        throw StateError(
          'Backup metadata rollback failed: ${rollbackFailures.join(', ')}',
        );
      }
      rethrow;
    }
  }

  void _validateFullBackupFiles(
    Archive archive,
    SheetLibraryBackup backup,
    Object? rawMappings,
    List<SheetLibraryFullBackupFileMapping> mappings,
  ) {
    if (rawMappings is! List || rawMappings.length != mappings.length) {
      throw const FormatException('Invalid backup file mappings.');
    }

    // Validate every reference before restoring any file or replacing metadata.
    final expected = <(String, String, String)>{};
    for (final score in backup.scores) {
      if (score.id.isEmpty ||
          score.id == '.' ||
          score.id == '..' ||
          score.id.contains('/') ||
          score.id.contains(r'\')) {
        throw const FormatException('Invalid backup score ID.');
      }
      if (!expected.add((score.id, 'score', ''))) {
        throw const FormatException('Duplicate backup score ID.');
      }
      for (final linked in score.linkedFiles) {
        expected.add((score.id, 'linked', linked.path));
      }
      if (score.annotationStorage.isFileBacked) {
        expected.add((score.id, 'annotation', score.annotationStorage.path));
      }
    }
    for (final mapping in mappings) {
      if (mapping.isLinkedFile && mapping.isAnnotationFile) {
        throw const FormatException('Ambiguous backup file mapping.');
      }
      final key = mapping.isLinkedFile
          ? (mapping.scoreId, 'linked', mapping.linkedFilePath!)
          : mapping.isAnnotationFile
          ? (mapping.scoreId, 'annotation', mapping.annotationStoragePath!)
          : (mapping.scoreId, 'score', '');
      if (!expected.remove(key)) {
        throw const FormatException(
          'Unexpected or duplicate backup file mapping.',
        );
      }
      final safePath = mapping.isLinkedFile
          ? _isSafeLinkedZipEntryPath(mapping.entryPath)
          : mapping.isAnnotationFile
          ? _isSafeAnnotationZipEntryPath(mapping.entryPath)
          : _isSafeScoreZipEntryPath(mapping.entryPath);
      if (!safePath) {
        throw const FormatException('Invalid backup entry path.');
      }
      if (!mapping.missing) {
        final entry = archive.findFile(mapping.entryPath);
        if (entry == null || !entry.isFile) {
          throw const FormatException('A required backup file is missing.');
        }
      }
    }
    if (expected.isNotEmpty) {
      throw const FormatException('A required backup file mapping is missing.');
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

  Future<String> _writeRestoredFile({
    required List<int> bytes,
    required String originalFileName,
  }) async {
    final documents = await getApplicationDocumentsDirectory();
    final restoredFilesDir = await Directory('${documents.path}/restored-files')
        .create(recursive: true);
    final destination = await restoredFilesDir.createTemp('restore-');
    final safeName = _safeFileName(originalFileName);
    final file = File('${destination.path}/$safeName');
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

  Future<String> _croppedPdfPath(SheetScore score) async {
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
    final safeName = _safeFileName('$withoutExtension-cropped.pdf');
    final stamp = DateTime.now().microsecondsSinceEpoch;
    return '${scoresDir.path}/${score.id}-$stamp-$safeName';
  }

  Future<String> _arrangedPdfPath(SheetScore score) async {
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
    final safeName = _safeFileName('$withoutExtension-arranged.pdf');
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
