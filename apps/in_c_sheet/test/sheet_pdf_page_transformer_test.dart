import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_pdf_page_transformer.dart';
import 'package:pdf_document/pdf_document.dart';

void main() {
  const shortFixturePath = 'test-fixtures/pdfs/short-score.pdf';

  test('creates rotation applied PDF copy and preserves original', () async {
    final originalBytes = await File(shortFixturePath).readAsBytes();
    final tempDir = await Directory.systemTemp.createTemp(
      'clef-page-rotation-',
    );
    addTearDown(() async {
      if (tempDir.existsSync()) {
        await tempDir.delete(recursive: true);
      }
    });
    final outputPath = '${tempDir.path}/short-score-rotated.pdf';

    final result = await SheetPdfPageTransformer.createRotationAppliedCopy(
      inputPath: shortFixturePath,
      outputPath: outputPath,
      pageRotations: const <int, int>{1: 90, 3: 180},
    );
    final rotated = PdfDocument.open(await File(outputPath).readAsBytes());
    final afterOriginalBytes = await File(shortFixturePath).readAsBytes();

    expect(result.didWrite, isTrue);
    expect(result.pageCount, 3);
    expect(result.rotatedPageCount, 2);
    expect(rotated.pageCount, 3);
    expect(afterOriginalBytes, originalBytes);
  });

  test('does not write copy when there are no valid rotations', () async {
    final tempDir = await Directory.systemTemp.createTemp(
      'clef-page-rotation-empty-',
    );
    addTearDown(() async {
      if (tempDir.existsSync()) {
        await tempDir.delete(recursive: true);
      }
    });
    final outputPath = '${tempDir.path}/short-score-rotated.pdf';

    final result = await SheetPdfPageTransformer.createRotationAppliedCopy(
      inputPath: shortFixturePath,
      outputPath: outputPath,
      pageRotations: const <int, int>{1: 0, -2: 90, 3: 45},
    );

    expect(result.didWrite, isFalse);
    expect(result.outputPath, isNull);
    expect(File(outputPath).existsSync(), isFalse);
  });

  test('does not write copy when valid rotations target missing pages', () async {
    final tempDir = await Directory.systemTemp.createTemp(
      'clef-page-rotation-out-of-range-',
    );
    addTearDown(() async {
      if (tempDir.existsSync()) {
        await tempDir.delete(recursive: true);
      }
    });
    final outputPath = '${tempDir.path}/short-score-rotated.pdf';

    final result = await SheetPdfPageTransformer.createRotationAppliedCopy(
      inputPath: shortFixturePath,
      outputPath: outputPath,
      pageRotations: const <int, int>{99: 90},
    );

    expect(result.didWrite, isFalse);
    expect(result.pageCount, 3);
    expect(result.rotatedPageCount, 0);
    expect(File(outputPath).existsSync(), isFalse);
  });

  test('normalizes negative clockwise rotations before writing copy', () async {
    final tempDir = await Directory.systemTemp.createTemp(
      'clef-page-rotation-negative-',
    );
    addTearDown(() async {
      if (tempDir.existsSync()) {
        await tempDir.delete(recursive: true);
      }
    });
    final outputPath = '${tempDir.path}/short-score-rotated.pdf';

    final result = await SheetPdfPageTransformer.createRotationAppliedCopy(
      inputPath: shortFixturePath,
      outputPath: outputPath,
      pageRotations: const <int, int>{1: -90},
    );

    expect(result.didWrite, isTrue);
    expect(result.rotatedPageCount, 1);
    expect(File(outputPath).existsSync(), isTrue);
  });
}
