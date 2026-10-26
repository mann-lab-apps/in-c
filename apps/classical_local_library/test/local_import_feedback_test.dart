import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/local_audio_import.dart';
import 'package:classical_local_library/local_import_feedback.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('부분 성공과 분석 대기, 중복, 실패, 취소를 분리한다', () {
    const imported = LocalAudioFile(
      id: 'one',
      path: '/managed/one.flac',
      fileName: 'one.flac',
      format: 'flac',
      importStatus: AudioImportStatus.needsReview,
    );
    const pending = LocalAudioFile(
      id: 'two',
      path: '/managed/two.flac',
      fileName: 'two.flac',
      format: 'flac',
      importStatus: AudioImportStatus.needsReview,
    );
    final selections = [
      for (final name in [
        'one.flac',
        'two.flac',
        'copy.flac',
        'bad.pdf',
        'skip.flac',
      ])
        _Selection(name),
    ];
    final items = LocalImportFeedbackItem.fromBatch(
      selections,
      const LocalAudioImportBatchResult(
        items: [
          LocalAudioImportItemResult(
            outcome: LocalAudioImportOutcome.imported,
            record: LocalAudioImportRecord(
              id: 'import-one',
              sourceKind: 'document',
              originalFileName: 'one.flac',
              localPath: '/managed/one.flac',
              sha256: 'one',
              sizeBytes: 1,
              importedAtMillis: 1,
              status: LocalAudioImportStatus.completed,
              fileId: 'one',
            ),
          ),
          LocalAudioImportItemResult(
            outcome: LocalAudioImportOutcome.pending,
            record: LocalAudioImportRecord(
              id: 'import-two',
              sourceKind: 'document',
              originalFileName: 'two.flac',
              localPath: '/managed/two.flac',
              sha256: 'two',
              sizeBytes: 1,
              importedAtMillis: 2,
              status: LocalAudioImportStatus.analysisPending,
              fileId: 'two',
            ),
          ),
          LocalAudioImportItemResult(
            outcome: LocalAudioImportOutcome.duplicate,
          ),
          LocalAudioImportItemResult(
            outcome: LocalAudioImportOutcome.failed,
            failureKind: 'unsupportedType',
          ),
          LocalAudioImportItemResult(
            outcome: LocalAudioImportOutcome.cancelled,
          ),
        ],
        files: [imported, pending],
        candidates: [],
      ),
    );
    expect(items.map((item) => item.status), [
      '가져옴',
      '분석 대기',
      '중복',
      '실패',
      '취소',
    ]);
    expect(items[0].canOrganize, isTrue);
    expect(items[1].canOrganize, isTrue);
    expect(items[2].canOrganize, isFalse);
    expect(items[3].canRetry, isTrue);
    expect(items[4].canRetry, isFalse);
    expect(items[3].detail, '지원하지 않는 파일 형식입니다.');
  });
}

class _Selection implements SelectedAudioFile {
  const _Selection(this.name);

  @override
  final String name;

  @override
  String? get mimeType => null;

  @override
  Future<int> length() async => 0;

  @override
  Stream<List<int>> openRead() => const Stream.empty();
}
