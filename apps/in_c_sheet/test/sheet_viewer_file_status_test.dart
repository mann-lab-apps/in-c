import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_viewer_file_status.dart';

void main() {
  test('reports ready for a PDF file with a valid header', () async {
    final tempDir = await Directory.systemTemp.createTemp(
      'clef-viewer-file-status-',
    );
    addTearDown(() async {
      if (tempDir.existsSync()) {
        await tempDir.delete(recursive: true);
      }
    });
    final file = File('${tempDir.path}/score.pdf');
    await file.writeAsBytes(<int>[0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);

    final status = await SheetViewerFileStatus.inspect(file.path);

    expect(status.type, SheetViewerFileStatusType.ready);
    expect(status.canOpen, isTrue);
    expect(status.sizeBytes, 6);
  });

  test('reports missing file before opening the viewer', () async {
    final status = await SheetViewerFileStatus.inspect('/tmp/missing-clef.pdf');

    expect(status.type, SheetViewerFileStatusType.missing);
    expect(status.canOpen, isFalse);
  });

  test('reports empty file before opening the viewer', () async {
    final tempDir = await Directory.systemTemp.createTemp(
      'clef-viewer-file-status-',
    );
    addTearDown(() async {
      if (tempDir.existsSync()) {
        await tempDir.delete(recursive: true);
      }
    });
    final file = File('${tempDir.path}/empty.pdf');
    await file.writeAsBytes(const <int>[]);

    final status = await SheetViewerFileStatus.inspect(file.path);

    expect(status.type, SheetViewerFileStatusType.empty);
    expect(status.canOpen, isFalse);
  });

  test('reports unsupported file when header is not PDF', () async {
    final tempDir = await Directory.systemTemp.createTemp(
      'clef-viewer-file-status-',
    );
    addTearDown(() async {
      if (tempDir.existsSync()) {
        await tempDir.delete(recursive: true);
      }
    });
    final file = File('${tempDir.path}/notes.pdf');
    await file.writeAsString('not a pdf');

    final status = await SheetViewerFileStatus.inspect(file.path);

    expect(status.type, SheetViewerFileStatusType.unsupported);
    expect(status.canOpen, isFalse);
  });
}
