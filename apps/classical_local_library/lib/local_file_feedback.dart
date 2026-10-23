import 'dart:convert';

const localFileFeedbackSchemaVersion = 1;

enum LocalFileFeedbackPlatform { ios, android }

enum LocalFileProviderKind { onDevice, cloudDrive, thirdParty, unknown }

enum LocalFilePickerOutcome { selected, cancelled, failed }

enum LocalFileImportOutcome { completed, partial, failed, notAttempted }

enum LocalFileExportOutcome { completed, dismissed, failed, notChecked }

enum LocalFilePersistenceOutcome { persisted, missing, notChecked }

class LocalFileFeedbackReport {
  const LocalFileFeedbackReport({
    required this.platform,
    required this.provider,
    required this.pickerOutcome,
    required this.selectedFileCount,
    required this.formats,
    required this.importOutcome,
    required this.exportOutcome,
    required this.relaunchPersistence,
    this.schemaVersion = localFileFeedbackSchemaVersion,
  });

  final int schemaVersion;
  final LocalFileFeedbackPlatform platform;
  final LocalFileProviderKind provider;
  final LocalFilePickerOutcome pickerOutcome;
  final int selectedFileCount;
  final List<String> formats;
  final LocalFileImportOutcome importOutcome;
  final LocalFileExportOutcome exportOutcome;
  final LocalFilePersistenceOutcome relaunchPersistence;

  Map<String, Object?> toJson() => {
    'schemaVersion': schemaVersion,
    'platform': platform.name,
    'provider': provider.name,
    'pickerOutcome': pickerOutcome.name,
    'selectedFileCount': selectedFileCount,
    'formats': formats,
    'importOutcome': importOutcome.name,
    'exportOutcome': exportOutcome.name,
    'relaunchPersistence': relaunchPersistence.name,
  };

  factory LocalFileFeedbackReport.fromJson(Map<String, Object?> json) {
    const keys = {
      'schemaVersion',
      'platform',
      'provider',
      'pickerOutcome',
      'selectedFileCount',
      'formats',
      'importOutcome',
      'exportOutcome',
      'relaunchPersistence',
    };
    final unexpected = json.keys.where((key) => !keys.contains(key)).toList();
    if (unexpected.isNotEmpty) {
      throw FormatException('허용하지 않는 필드입니다: ${unexpected.join(', ')}');
    }
    final version = json['schemaVersion'];
    if (version != localFileFeedbackSchemaVersion) {
      throw FormatException('지원하지 않는 schemaVersion입니다: $version');
    }
    final count = json['selectedFileCount'];
    if (count is! int || count < 0 || count > 10000) {
      throw const FormatException('selectedFileCount가 올바르지 않습니다.');
    }
    final rawFormats = json['formats'];
    const allowedFormats = {
      'mp3',
      'm4a',
      'alac',
      'flac',
      'wav',
      'ogg',
      'opus',
      'other',
    };
    if (rawFormats is! List<Object?> ||
        rawFormats.length > allowedFormats.length ||
        rawFormats.any(
          (value) => value is! String || !allowedFormats.contains(value),
        )) {
      throw const FormatException('formats가 올바르지 않습니다.');
    }
    return LocalFileFeedbackReport(
      schemaVersion: version as int,
      platform: _enumValue(
        LocalFileFeedbackPlatform.values,
        json['platform'],
        'platform',
      ),
      provider: _enumValue(
        LocalFileProviderKind.values,
        json['provider'],
        'provider',
      ),
      pickerOutcome: _enumValue(
        LocalFilePickerOutcome.values,
        json['pickerOutcome'],
        'pickerOutcome',
      ),
      selectedFileCount: count,
      formats: List<String>.unmodifiable(rawFormats.cast<String>()),
      importOutcome: _enumValue(
        LocalFileImportOutcome.values,
        json['importOutcome'],
        'importOutcome',
      ),
      exportOutcome: _enumValue(
        LocalFileExportOutcome.values,
        json['exportOutcome'],
        'exportOutcome',
      ),
      relaunchPersistence: _enumValue(
        LocalFilePersistenceOutcome.values,
        json['relaunchPersistence'],
        'relaunchPersistence',
      ),
    );
  }
}

class LocalFileFeedbackCodec {
  const LocalFileFeedbackCodec();

  static final RegExp _privateValue = RegExp(
    r'(file:/{2}|/Users/|/home/|/storage/|\\|[A-Za-z]:\\)',
    caseSensitive: false,
  );

  String encode(LocalFileFeedbackReport report) =>
      const JsonEncoder.withIndent('  ').convert(report.toJson());

  LocalFileFeedbackReport decode(String source) {
    if (_privateValue.hasMatch(source)) {
      throw const FormatException('개인 경로나 파일 URI로 보이는 값이 포함되어 있습니다.');
    }
    final decoded = jsonDecode(source);
    if (decoded is! Map<String, Object?>) {
      throw const FormatException('JSON 보고서 객체가 필요합니다.');
    }
    return LocalFileFeedbackReport.fromJson(decoded);
  }
}

T _enumValue<T extends Enum>(List<T> values, Object? raw, String field) {
  if (raw is! String) throw FormatException('$field 필드가 올바르지 않습니다.');
  return values.firstWhere(
    (value) => value.name == raw,
    orElse: () => throw FormatException('$field 값이 올바르지 않습니다: $raw'),
  );
}
