import 'dart:ui';

import 'package:share_plus/share_plus.dart';

import 'local_audio_import.dart';

enum ManagedAudioExportOutcome { success, dismissed, unavailable, failed }

class ManagedAudioExportResult {
  const ManagedAudioExportResult({
    required this.outcome,
    required this.userMessage,
    this.failureKind,
  });

  final ManagedAudioExportOutcome outcome;
  final String userMessage;
  final String? failureKind;
}

abstract interface class ManagedAudioExporter {
  Future<ManagedAudioExportResult> export(
    ManagedAudioExportFile file, {
    Rect? sharePositionOrigin,
  });
}

class SharePlusManagedAudioExporter implements ManagedAudioExporter {
  const SharePlusManagedAudioExporter();

  @override
  Future<ManagedAudioExportResult> export(
    ManagedAudioExportFile file, {
    Rect? sharePositionOrigin,
  }) async {
    try {
      final result = await SharePlus.instance.share(
        ShareParams(
          title: '음원 내보내기',
          files: [XFile(file.path)],
          fileNameOverrides: [file.fileName],
          sharePositionOrigin: sharePositionOrigin,
        ),
      );
      return switch (result.status) {
        ShareResultStatus.success => const ManagedAudioExportResult(
          outcome: ManagedAudioExportOutcome.success,
          userMessage: '음원을 내보냈습니다.',
        ),
        ShareResultStatus.dismissed => const ManagedAudioExportResult(
          outcome: ManagedAudioExportOutcome.dismissed,
          userMessage: '음원 내보내기를 취소했습니다.',
        ),
        ShareResultStatus.unavailable => const ManagedAudioExportResult(
          outcome: ManagedAudioExportOutcome.unavailable,
          userMessage: '이 기기에서는 음원 내보내기를 사용할 수 없습니다.',
          failureKind: 'unavailable',
        ),
      };
    } catch (_) {
      return const ManagedAudioExportResult(
        outcome: ManagedAudioExportOutcome.failed,
        userMessage: '음원을 내보내지 못했습니다. 다시 시도하세요.',
        failureKind: 'shareFailed',
      );
    }
  }
}
