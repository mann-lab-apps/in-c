import 'classical_library_models.dart';
import 'local_audio_import.dart';

class LocalImportFeedbackItem {
  const LocalImportFeedbackItem({
    required this.selection,
    required this.result,
    required this.file,
  });

  final SelectedAudioFile selection;
  final LocalAudioImportItemResult result;
  final LocalAudioFile? file;

  String get fileName =>
      const LocalAudioImportPolicy().sanitizeFileName(selection.name);

  bool get canOrganize =>
      file != null &&
      file!.importStatus != AudioImportStatus.linked &&
      (result.outcome == LocalAudioImportOutcome.imported ||
          result.outcome == LocalAudioImportOutcome.pending);

  bool get canRetry => result.outcome == LocalAudioImportOutcome.failed;

  String get status => switch (result.outcome) {
    LocalAudioImportOutcome.imported => '가져옴',
    LocalAudioImportOutcome.duplicate => '중복',
    LocalAudioImportOutcome.pending => '분석 대기',
    LocalAudioImportOutcome.failed => '실패',
    LocalAudioImportOutcome.cancelled => '취소',
  };

  String get detail => switch (result.outcome) {
    LocalAudioImportOutcome.imported => '앱에 보관했습니다.',
    LocalAudioImportOutcome.duplicate => '이미 보관한 파일입니다.',
    LocalAudioImportOutcome.pending =>
      file == null
          ? '파일은 보관했습니다. 분석을 다시 시도해 주세요.'
          : '파일은 보관했습니다. 직접 정리할 수 있습니다.',
    LocalAudioImportOutcome.failed => switch (result.failureKind) {
      'unsupportedType' => '지원하지 않는 파일 형식입니다.',
      'tooLarge' => '파일 크기 제한을 초과했습니다.',
      'readFailed' => '파일을 읽지 못했습니다. 접근 가능한 사본을 선택해 주세요.',
      'truncated' => '파일을 끝까지 읽지 못했습니다.',
      'writeFailed' => '파일을 보관하지 못했습니다. 저장 공간을 확인해 주세요.',
      _ => '가져오지 못했습니다. 다시 시도해 주세요.',
    },
    LocalAudioImportOutcome.cancelled => '가져오지 않았습니다.',
  };

  static List<LocalImportFeedbackItem> fromBatch(
    List<SelectedAudioFile> selections,
    LocalAudioImportBatchResult batch,
  ) {
    final byId = {for (final file in batch.files) file.id: file};
    final byPath = {for (final file in batch.files) file.path: file};
    return List.unmodifiable([
      for (var index = 0; index < batch.items.length; index += 1)
        LocalImportFeedbackItem(
          selection: selections[index],
          result: batch.items[index],
          file:
              byId[batch.items[index].record?.fileId] ??
              byPath[batch.items[index].record?.localPath],
        ),
    ]);
  }
}
