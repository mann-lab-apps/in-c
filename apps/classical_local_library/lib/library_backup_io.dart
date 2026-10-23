import 'dart:convert';
import 'dart:io';
import 'dart:ui';

import 'package:file_picker/file_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

enum LibraryBackupExportOutcome { success, dismissed, unavailable, failed }

class LibraryBackupExportResult {
  const LibraryBackupExportResult(this.outcome, this.userMessage);

  final LibraryBackupExportOutcome outcome;
  final String userMessage;
}

abstract interface class LibraryBackupTransport {
  Future<LibraryBackupExportResult> export(
    String json, {
    Rect? sharePositionOrigin,
  });

  Future<String?> pickImport();
}

class PlatformLibraryBackupTransport implements LibraryBackupTransport {
  const PlatformLibraryBackupTransport();

  @override
  Future<LibraryBackupExportResult> export(
    String json, {
    Rect? sharePositionOrigin,
  }) async {
    File? temporary;
    try {
      final directory = await getTemporaryDirectory();
      final date = DateTime.now().toUtc().toIso8601String().split('T').first;
      temporary = File('${directory.path}/ddirori-play-backup-$date.json');
      await temporary.writeAsString(json, flush: true);
      final result = await SharePlus.instance.share(
        ShareParams(
          title: '띠로리 플레이 라이브러리 백업',
          files: [XFile(temporary.path, mimeType: 'application/json')],
          fileNameOverrides: ['ddirori-play-backup-$date.json'],
          sharePositionOrigin: sharePositionOrigin,
        ),
      );
      return switch (result.status) {
        ShareResultStatus.success => const LibraryBackupExportResult(
          LibraryBackupExportOutcome.success,
          '라이브러리 백업을 내보냈습니다.',
        ),
        ShareResultStatus.dismissed => const LibraryBackupExportResult(
          LibraryBackupExportOutcome.dismissed,
          '백업 내보내기를 취소했습니다.',
        ),
        ShareResultStatus.unavailable => const LibraryBackupExportResult(
          LibraryBackupExportOutcome.unavailable,
          '이 기기에서는 백업 내보내기를 사용할 수 없습니다.',
        ),
      };
    } catch (_) {
      return const LibraryBackupExportResult(
        LibraryBackupExportOutcome.failed,
        '백업을 내보내지 못했습니다. 다시 시도해 주세요.',
      );
    } finally {
      try {
        if (temporary != null && await temporary.exists()) {
          await temporary.delete();
        }
      } on FileSystemException {
        // Temporary cleanup failure does not expose paths or change the result.
      }
    }
  }

  @override
  Future<String?> pickImport() async {
    try {
      final selected = await FilePicker.pickFile(
        type: FileType.custom,
        allowedExtensions: const ['json'],
      );
      if (selected == null) return null;
      return utf8.decode(await selected.readAsBytes());
    } catch (_) {
      throw const FormatException('백업 파일을 읽지 못했습니다.');
    }
  }
}
