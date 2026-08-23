import 'dart:convert';

import 'sheet_library_view_settings.dart';
import 'sheet_metronome.dart';
import 'sheet_score.dart';
import 'sheet_setlist.dart';
import 'sheet_tuner.dart';

class SheetLibraryBackup {
  const SheetLibraryBackup({
    required this.version,
    required this.exportedAt,
    required this.scores,
    required this.setlists,
    required this.metronomeSettings,
    required this.tunerSettings,
    required this.libraryViewSettings,
  });

  factory SheetLibraryBackup.fromJson(Map<String, Object?> json) {
    final version = json['version'] as int? ?? 0;
    if (version != currentVersion) {
      throw UnsupportedError('Unsupported backup version: $version');
    }

    return SheetLibraryBackup(
      version: version,
      exportedAt:
          DateTime.tryParse(json['exportedAt'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      scores: SheetScore.decodeJsonList(json['scores']),
      setlists: SheetSetlist.decodeJsonList(json['setlists']),
      metronomeSettings: SheetMetronomeSettings.fromJson(
        _asJsonMap(json['metronomeSettings']),
      ),
      tunerSettings: SheetTunerSettings.fromJson(
        _asJsonMap(json['tunerSettings']),
      ),
      libraryViewSettings: SheetLibraryViewSettings.fromJson(
        _asJsonMap(json['libraryViewSettings']),
      ),
    );
  }

  factory SheetLibraryBackup.fromState({
    required List<SheetScore> scores,
    required List<SheetSetlist> setlists,
    required SheetMetronomeSettings metronomeSettings,
    required SheetTunerSettings tunerSettings,
    required SheetLibraryViewSettings libraryViewSettings,
    DateTime? exportedAt,
  }) {
    return SheetLibraryBackup(
      version: currentVersion,
      exportedAt: exportedAt ?? DateTime.now(),
      scores: List<SheetScore>.unmodifiable(scores),
      setlists: List<SheetSetlist>.unmodifiable(setlists),
      metronomeSettings: metronomeSettings,
      tunerSettings: tunerSettings,
      libraryViewSettings: libraryViewSettings,
    );
  }

  static const currentVersion = 1;

  final int version;
  final DateTime exportedAt;
  final List<SheetScore> scores;
  final List<SheetSetlist> setlists;
  final SheetMetronomeSettings metronomeSettings;
  final SheetTunerSettings tunerSettings;
  final SheetLibraryViewSettings libraryViewSettings;

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'version': version,
      'exportedAt': exportedAt.toIso8601String(),
      'scope': 'metadata-only',
      'scores': scores.map((score) => score.toJson()).toList(),
      'setlists': setlists.map((setlist) => setlist.toJson()).toList(),
      'metronomeSettings': metronomeSettings.toJson(),
      'tunerSettings': tunerSettings.toJson(),
      'libraryViewSettings': libraryViewSettings.toJson(),
      'notes': 'PDF files are not embedded in this backup. Restored score file paths may require local files to still exist.',
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
      'notes': 'This backup includes score PDF files when they were available at export time. Original source files are not modified.',
    };
  }
}

class SheetLibraryFullBackupFileMapping {
  const SheetLibraryFullBackupFileMapping({
    required this.scoreId,
    required this.entryPath,
    required this.originalFileName,
    required this.missing,
  });

  factory SheetLibraryFullBackupFileMapping.fromJson(
    Map<String, Object?> json,
  ) {
    final scoreId = json['scoreId'] as String? ?? '';
    final entryPath = json['entryPath'] as String? ?? '';
    if (scoreId.isEmpty || entryPath.isEmpty) {
      throw const FormatException('Invalid backup file mapping.');
    }
    return SheetLibraryFullBackupFileMapping(
      scoreId: scoreId,
      entryPath: entryPath,
      originalFileName: json['originalFileName'] as String? ?? 'score.pdf',
      missing: json['missing'] as bool? ?? false,
    );
  }

  final String scoreId;
  final String entryPath;
  final String originalFileName;
  final bool missing;

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'scoreId': scoreId,
      'entryPath': entryPath,
      'originalFileName': originalFileName,
      'missing': missing,
    };
  }

  static List<SheetLibraryFullBackupFileMapping> decodeList(Object? value) {
    final decoded = value as List<dynamic>? ?? const <dynamic>[];
    return decoded
        .whereType<Map<String, Object?>>()
        .map(SheetLibraryFullBackupFileMapping.fromJson)
        .toList(growable: false);
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
