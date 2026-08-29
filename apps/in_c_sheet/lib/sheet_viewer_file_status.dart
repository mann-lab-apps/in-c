import 'dart:io';
import 'dart:typed_data';

enum SheetViewerFileStatusType {
  ready,
  missing,
  empty,
  unsupported,
  unreadable,
}

class SheetViewerFileStatus {
  const SheetViewerFileStatus._({
    required this.type,
    required this.path,
    required this.sizeBytes,
    this.error,
  });

  final SheetViewerFileStatusType type;
  final String path;
  final int sizeBytes;
  final Object? error;

  bool get canOpen => type == SheetViewerFileStatusType.ready;

  String get title {
    return switch (type) {
      SheetViewerFileStatusType.ready => 'PDF 준비 완료',
      SheetViewerFileStatusType.missing => 'PDF 파일을 찾지 못했습니다.',
      SheetViewerFileStatusType.empty => 'PDF 파일이 비어 있습니다.',
      SheetViewerFileStatusType.unsupported => 'PDF 파일 형식이 아닙니다.',
      SheetViewerFileStatusType.unreadable => 'PDF 파일을 읽지 못했습니다.',
    };
  }

  String get message {
    return switch (type) {
      SheetViewerFileStatusType.ready => '파일을 열 수 있습니다.',
      SheetViewerFileStatusType.missing =>
        '가져온 파일이 앱 저장소에서 보이지 않습니다. 원본을 다시 가져오거나 전체 백업을 복원해주세요.',
      SheetViewerFileStatusType.empty =>
        '파일 크기가 0바이트입니다. 클라우드 파일이면 기기에 내려받은 뒤 다시 가져와주세요.',
      SheetViewerFileStatusType.unsupported =>
        '파일 헤더가 PDF로 확인되지 않았습니다. 다른 앱에서 PDF로 열리는지 확인한 뒤 다시 가져와주세요.',
      SheetViewerFileStatusType.unreadable =>
        '파일 권한 또는 저장소 문제로 읽기에 실패했습니다. 기기 저장공간과 파일 권한을 확인해주세요.',
    };
  }

  static Future<SheetViewerFileStatus> inspect(String path) async {
    final file = File(path);
    try {
      if (!await file.exists()) {
        return SheetViewerFileStatus._(
          type: SheetViewerFileStatusType.missing,
          path: path,
          sizeBytes: 0,
        );
      }

      final length = await file.length();
      if (length <= 0) {
        return SheetViewerFileStatus._(
          type: SheetViewerFileStatusType.empty,
          path: path,
          sizeBytes: length,
        );
      }

      final randomAccessFile = await file.open();
      try {
        final headerLength = length < 1024 ? length : 1024;
        final header = await randomAccessFile.read(headerLength);
        if (!_hasPdfHeader(header)) {
          return SheetViewerFileStatus._(
            type: SheetViewerFileStatusType.unsupported,
            path: path,
            sizeBytes: length,
          );
        }
      } finally {
        await randomAccessFile.close();
      }

      return SheetViewerFileStatus._(
        type: SheetViewerFileStatusType.ready,
        path: path,
        sizeBytes: length,
      );
    } catch (error) {
      return SheetViewerFileStatus._(
        type: SheetViewerFileStatusType.unreadable,
        path: path,
        sizeBytes: 0,
        error: error,
      );
    }
  }

  static bool _hasPdfHeader(Uint8List bytes) {
    if (bytes.length < 5) {
      return false;
    }
    for (var index = 0; index <= bytes.length - 5; index += 1) {
      if (bytes[index] == 0x25 &&
          bytes[index + 1] == 0x50 &&
          bytes[index + 2] == 0x44 &&
          bytes[index + 3] == 0x46 &&
          bytes[index + 4] == 0x2d) {
        return true;
      }
    }
    return false;
  }
}
