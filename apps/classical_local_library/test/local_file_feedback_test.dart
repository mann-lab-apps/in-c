import 'package:classical_local_library/local_file_feedback.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const codec = LocalFileFeedbackCodec();
  const report = LocalFileFeedbackReport(
    platform: LocalFileFeedbackPlatform.ios,
    provider: LocalFileProviderKind.cloudDrive,
    pickerOutcome: LocalFilePickerOutcome.selected,
    selectedFileCount: 2,
    formats: ['m4a', 'alac', 'flac'],
    importOutcome: LocalFileImportOutcome.completed,
    exportOutcome: LocalFileExportOutcome.completed,
    relaunchPersistence: LocalFilePersistenceOutcome.persisted,
  );

  test('path-free local file feedback round-trips', () {
    final encoded = codec.encode(report);
    final decoded = codec.decode(encoded);

    expect(decoded.platform, LocalFileFeedbackPlatform.ios);
    expect(decoded.provider, LocalFileProviderKind.cloudDrive);
    expect(decoded.formats, ['m4a', 'alac', 'flac']);
    expect(encoded, isNot(contains('path')));
    expect(encoded, isNot(contains('fileName')));
  });

  test('feedback rejects private paths and additional fields', () {
    expect(
      () => codec.decode(
        codec
            .encode(report)
            .replaceFirst(
              '"provider": "cloudDrive"',
              '"provider": "/Users/person/Music"',
            ),
      ),
      throwsFormatException,
    );
    expect(
      () => codec.decode(
        codec
            .encode(report)
            .replaceFirst(
              '"schemaVersion": 1,',
              '"schemaVersion": 1, "deviceId": "private",',
            ),
      ),
      throwsFormatException,
    );
  });

  test('feedback rejects arbitrary formats and unreasonable counts', () {
    expect(
      () => codec.decode(codec.encode(report).replaceFirst('"m4a"', '"exe"')),
      throwsFormatException,
    );
    expect(
      () => codec.decode(
        codec
            .encode(report)
            .replaceFirst(
              '"selectedFileCount": 2',
              '"selectedFileCount": 10001',
            ),
      ),
      throwsFormatException,
    );
  });
}
