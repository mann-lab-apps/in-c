import 'dart:convert';

import 'sheet_annotation.dart';
import 'sheet_library_view_settings.dart';
import 'sheet_metronome.dart';
import 'sheet_score.dart';
import 'sheet_setlist.dart';
import 'sheet_tone.dart';
import 'sheet_tuner.dart';

class SheetLibraryBackup {
  const SheetLibraryBackup({
    required this.version,
    required this.exportedAt,
    required this.scores,
    required this.setlists,
    required this.metronomeSettings,
    required this.tunerSettings,
    this.toneSettings = SheetToneSettings.defaultSettings,
    required this.libraryViewSettings,
    this.globalViewerSettings = SheetViewerSettings.defaultSettings,
    this.favoriteAnnotationPreset,
  });

  factory SheetLibraryBackup.fromJson(Map<String, Object?> json) {
    final versionValue = json['version'];
    final version = versionValue is num && versionValue % 1 == 0
        ? versionValue.toInt()
        : int.tryParse(versionValue?.toString() ?? '') ?? 0;
    if (version != currentVersion) {
      throw UnsupportedError('Unsupported backup version: $version');
    }

    return SheetLibraryBackup(
      version: version,
      exportedAt: _dateFromJson(json['exportedAt']),
      scores: SheetScore.decodeJsonList(json['scores']),
      setlists: SheetSetlist.decodeJsonList(json['setlists']),
      metronomeSettings: SheetMetronomeSettings.fromJson(
        _asJsonMap(json['metronomeSettings']),
      ),
      tunerSettings: SheetTunerSettings.fromJson(
        _asJsonMap(json['tunerSettings']),
      ),
      toneSettings: SheetToneSettings.fromJson(
        _asJsonMap(json['toneSettings']),
      ),
      libraryViewSettings: SheetLibraryViewSettings.fromJson(
        _asJsonMap(json['libraryViewSettings']),
      ),
      globalViewerSettings: SheetViewerSettings.fromJson(
        _asJsonMap(json['globalViewerSettings']),
      ),
      favoriteAnnotationPreset: _annotationPresetFromJson(
        json['favoriteAnnotationPreset'],
      ),
    );
  }

  factory SheetLibraryBackup.fromState({
    required List<SheetScore> scores,
    required List<SheetSetlist> setlists,
    required SheetMetronomeSettings metronomeSettings,
    required SheetTunerSettings tunerSettings,
    SheetToneSettings toneSettings = SheetToneSettings.defaultSettings,
    required SheetLibraryViewSettings libraryViewSettings,
    SheetViewerSettings globalViewerSettings =
        SheetViewerSettings.defaultSettings,
    SheetAnnotationToolPreset? favoriteAnnotationPreset,
    DateTime? exportedAt,
  }) {
    return SheetLibraryBackup(
      version: currentVersion,
      exportedAt: exportedAt ?? DateTime.now(),
      scores: List<SheetScore>.unmodifiable(scores),
      setlists: List<SheetSetlist>.unmodifiable(setlists),
      metronomeSettings: metronomeSettings,
      tunerSettings: tunerSettings,
      toneSettings: toneSettings,
      libraryViewSettings: libraryViewSettings,
      globalViewerSettings: globalViewerSettings,
      favoriteAnnotationPreset: favoriteAnnotationPreset,
    );
  }

  static const currentVersion = 1;

  final int version;
  final DateTime exportedAt;
  final List<SheetScore> scores;
  final List<SheetSetlist> setlists;
  final SheetMetronomeSettings metronomeSettings;
  final SheetTunerSettings tunerSettings;
  final SheetToneSettings toneSettings;
  final SheetLibraryViewSettings libraryViewSettings;
  final SheetViewerSettings globalViewerSettings;
  final SheetAnnotationToolPreset? favoriteAnnotationPreset;

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'version': version,
      'exportedAt': exportedAt.toIso8601String(),
      'scope': 'metadata-only',
      'scores': scores.map((score) => score.toJson()).toList(),
      'setlists': setlists.map((setlist) => setlist.toJson()).toList(),
      'metronomeSettings': metronomeSettings.toJson(),
      'tunerSettings': tunerSettings.toJson(),
      'toneSettings': toneSettings.toJson(),
      'libraryViewSettings': libraryViewSettings.toJson(),
      'globalViewerSettings': globalViewerSettings.toJson(),
      if (favoriteAnnotationPreset != null)
        'favoriteAnnotationPreset': favoriteAnnotationPreset!.toJson(),
      'notes':
          'PDF files are not embedded in this backup. Restored score file '
          'paths may require local files to still exist.',
    };
  }
}

class SheetLibraryFullBackup {
  const SheetLibraryFullBackup({
    required this.backup,
    required this.fileMappings,
  });

  static const manifestFileName = 'clef-backup.json';
  static const scope = 'full';

  final SheetLibraryBackup backup;
  final List<SheetLibraryFullBackupFileMapping> fileMappings;

  Map<String, Object?> toJson() {
    final json = backup.toJson();
    return <String, Object?>{
      ...json,
      'scope': scope,
      'fileMappings': fileMappings
          .map((mapping) => mapping.toJson())
          .toList(growable: false),
      'notes':
          'This backup includes score PDF files, linked files, and external '
          'annotation files when they were available at export time. Original '
          'source files are not modified.',
    };
  }
}

class SheetLibraryFullBackupFileMapping {
  const SheetLibraryFullBackupFileMapping({
    required this.scoreId,
    required this.entryPath,
    required this.originalFileName,
    required this.missing,
    this.linkedFilePath,
    this.annotationStoragePath,
  });

  factory SheetLibraryFullBackupFileMapping.fromJson(
    Map<String, Object?> json,
  ) {
    final scoreId = _stringFromJson(json['scoreId']).trim();
    final entryPath = _stringFromJson(json['entryPath']).trim();
    if (scoreId.isEmpty || entryPath.isEmpty) {
      throw const FormatException('Invalid backup file mapping.');
    }
    final linkedFilePath = _stringFromJson(json['linkedFilePath']).trim();
    final annotationStoragePath = _stringFromJson(json['annotationStoragePath'])
        .trim();
    return SheetLibraryFullBackupFileMapping(
      scoreId: scoreId,
      entryPath: entryPath,
      originalFileName: _backupFileNameFromJson(json['originalFileName']),
      missing: json['missing'] is bool ? json['missing'] as bool : false,
      linkedFilePath: linkedFilePath.isEmpty ? null : linkedFilePath,
      annotationStoragePath: annotationStoragePath.isEmpty
          ? null
          : annotationStoragePath,
    );
  }

  final String scoreId;
  final String entryPath;
  final String originalFileName;
  final bool missing;
  final String? linkedFilePath;
  final String? annotationStoragePath;

  bool get isLinkedFile => linkedFilePath?.isNotEmpty == true;

  bool get isAnnotationFile => annotationStoragePath?.isNotEmpty == true;

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'scoreId': scoreId,
      'entryPath': entryPath,
      'originalFileName': originalFileName,
      'missing': missing,
      if (linkedFilePath?.isNotEmpty == true) 'linkedFilePath': linkedFilePath,
      if (annotationStoragePath?.isNotEmpty == true)
        'annotationStoragePath': annotationStoragePath,
    };
  }

  static List<SheetLibraryFullBackupFileMapping> decodeList(Object? value) {
    final decoded = _jsonList(value);
    return decoded
        .map(_asJsonMap)
        .whereType<Map<String, Object?>>()
        .map(_tryFromJson)
        .whereType<SheetLibraryFullBackupFileMapping>()
        .toList(growable: false);
  }

  static SheetLibraryFullBackupFileMapping? _tryFromJson(
    Map<String, Object?> json,
  ) {
    try {
      return SheetLibraryFullBackupFileMapping.fromJson(json);
    } catch (_) {
      return null;
    }
  }
}

enum SheetLibraryBackupRestoreStatus {
  restored,
  canceled,
  invalid,
  unsupportedVersion,
  error,
}

class SheetLibraryBackupExportResult {
  const SheetLibraryBackupExportResult({
    required this.didExport,
    this.outputUri,
    this.failureReason,
  });

  final bool didExport;
  final Uri? outputUri;
  final String? failureReason;
}

class SheetLibraryBackupRestoreResult {
  const SheetLibraryBackupRestoreResult({
    required this.status,
    this.restoredScoreCount = 0,
    this.restoredSetlistCount = 0,
    this.failureReason,
  });

  final SheetLibraryBackupRestoreStatus status;
  final int restoredScoreCount;
  final int restoredSetlistCount;
  final String? failureReason;

  bool get didRestore => status == SheetLibraryBackupRestoreStatus.restored;
}

class SheetLibraryBackupCodec {
  const SheetLibraryBackupCodec._();

  static String encode(SheetLibraryBackup backup) {
    return const JsonEncoder.withIndent('  ').convert(backup.toJson());
  }

  static SheetLibraryBackup decode(String value) {
    final decoded = jsonDecode(value);
    if (decoded is! Map) {
      throw const FormatException('Backup root must be an object.');
    }
    return SheetLibraryBackup.fromJson(
      decoded.map(
        (key, mapValue) => MapEntry(key.toString(), mapValue as Object?),
      ),
    );
  }
}

Map<String, Object?>? _asJsonMap(Object? value) {
  if (value is! Map) {
    return null;
  }
  return value.map(
    (key, mapValue) => MapEntry(key.toString(), mapValue as Object?),
  );
}

List<dynamic> _jsonList(Object? value) {
  return value is List ? value : const <dynamic>[];
}

String _stringFromJson(Object? value) {
  return value is String ? value : '';
}

String _backupFileNameFromJson(Object? value) {
  final name = _stringFromJson(value).trim();
  return name.isEmpty ? 'score.pdf' : name;
}

DateTime _dateFromJson(Object? value) {
  final parsed = DateTime.tryParse(_stringFromJson(value));
  return parsed ?? DateTime.fromMillisecondsSinceEpoch(0);
}

SheetAnnotationToolPreset? _annotationPresetFromJson(Object? value) {
  final preset = SheetAnnotationToolPreset.fromJson(_asJsonMap(value));
  return preset.isValid ? preset : null;
}
