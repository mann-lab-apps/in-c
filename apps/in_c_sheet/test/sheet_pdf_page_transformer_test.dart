import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_pdf_page_transformer.dart';
import 'package:in_c_sheet/sheet_score.dart';
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

  test(
    'does not write copy when valid rotations target missing pages',
    () async {
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
    },
  );

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

  test('creates crop applied PDF copy and preserves original', () async {
    final originalBytes = await File(shortFixturePath).readAsBytes();
    final tempDir = await Directory.systemTemp.createTemp('clef-page-crop-');
    addTearDown(() async {
      if (tempDir.existsSync()) {
        await tempDir.delete(recursive: true);
      }
    });
    final outputPath = '${tempDir.path}/short-score-cropped.pdf';

    final result = await SheetPdfPageTransformer.createCropAppliedCopy(
      inputPath: shortFixturePath,
      outputPath: outputPath,
      pageSettings: const SheetPageSettings(
        hiddenPages: <int>[],
        pageRotations: <int, int>{},
        crop: SheetCropSettings(top: 0.1, bottom: 0.2),
      ),
    );
    final cropped = PdfDocument.open(await File(outputPath).readAsBytes());
    final firstCropBox = cropped.page(0).cropBox;
    final afterOriginalBytes = await File(shortFixturePath).readAsBytes();

    expect(result.didWrite, isTrue);
    expect(result.pageCount, 3);
    expect(result.croppedPageCount, 3);
    expect(firstCropBox.height, lessThan(cropped.page(0).mediaBox.height));
    expect(firstCropBox.bottom, greaterThan(cropped.page(0).mediaBox.bottom));
    expect(firstCropBox.top, lessThan(cropped.page(0).mediaBox.top));
    expect(afterOriginalBytes, originalBytes);
  });

  test('uses page crop overrides when creating crop applied copy', () async {
    final tempDir = await Directory.systemTemp.createTemp(
      'clef-page-crop-overrides-',
    );
    addTearDown(() async {
      if (tempDir.existsSync()) {
        await tempDir.delete(recursive: true);
      }
    });
    final outputPath = '${tempDir.path}/short-score-cropped.pdf';

    final result = await SheetPdfPageTransformer.createCropAppliedCopy(
      inputPath: shortFixturePath,
      outputPath: outputPath,
      pageSettings: const SheetPageSettings(
        hiddenPages: <int>[],
        pageRotations: <int, int>{},
        pageCrops: <int, SheetCropSettings>{
          2: SheetCropSettings(left: 0.1, right: 0.1),
        },
      ),
    );
    final cropped = PdfDocument.open(await File(outputPath).readAsBytes());

    expect(result.didWrite, isTrue);
    expect(result.croppedPageCount, 1);
    expect(cropped.page(0).cropBox, cropped.page(0).mediaBox);
    expect(
      cropped.page(1).cropBox.width,
      lessThan(cropped.page(1).mediaBox.width),
    );
  });

  test('does not write crop copy when there is no crop metadata', () async {
    final tempDir = await Directory.systemTemp.createTemp(
      'clef-page-crop-empty-',
    );
    addTearDown(() async {
      if (tempDir.existsSync()) {
        await tempDir.delete(recursive: true);
      }
    });
    final outputPath = '${tempDir.path}/short-score-cropped.pdf';

    final result = await SheetPdfPageTransformer.createCropAppliedCopy(
      inputPath: shortFixturePath,
      outputPath: outputPath,
      pageSettings: SheetPageSettings.empty,
    );

    expect(result.didWrite, isFalse);
    expect(result.outputPath, isNull);
    expect(File(outputPath).existsSync(), isFalse);
  });

  test('creates arrangement applied PDF copy with mapping and blank pages', () async {
    final originalBytes = await File(shortFixturePath).readAsBytes();
    final tempDir = await Directory.systemTemp.createTemp(
      'clef-page-arrange-',
    );
    addTearDown(() async {
      if (tempDir.existsSync()) {
        await tempDir.delete(recursive: true);
      }
    });
    final outputPath = '${tempDir.path}/short-score-arranged.pdf';

    final result = await SheetPdfPageTransformer.createArrangementAppliedCopy(
      inputPath: shortFixturePath,
      outputPath: outputPath,
      pageSettings: SheetPageSettings(
        hiddenPages: const <int>[2],
        pageRotations: const <int, int>{3: 90},
        pageCrops: const <int, SheetCropSettings>{
          3: SheetCropSettings(left: 0.1),
        },
        pageOrder: const <int>[3, 1, 3, 2],
        instanceRotations: const <int, int>{2: 180},
        instanceCrops: const <int, SheetCropSettings>{
          2: SheetCropSettings(bottom: 0.04),
        },
        blankPageInsertions: <SheetBlankPageInsertion>[
          SheetBlankPageInsertion(
            id: 'blank-1',
            afterPage: 1,
            label: 'Notes',
            createdAt: DateTime.parse('2026-08-28T10:00:00.000'),
          ),
        ],
      ),
    );
    final arranged = PdfDocument.open(await File(outputPath).readAsBytes());
    final afterOriginalBytes = await File(shortFixturePath).readAsBytes();

    expect(result.didWrite, isTrue);
    expect(result.sourcePageCount, 3);
    expect(result.outputPageCount, 4);
    expect(result.insertedBlankPageCount, 1);
    expect(result.sourcePageMapping, <int, List<int>>{
      3: <int>[1, 4],
      1: <int>[2],
    });
    expect(result.pageRotations, <int, int>{1: 90, 4: 180});
    expect(result.pageCrops[1]?.left, 0.1);
    expect(result.pageCrops[4]?.bottom, 0.04);
    expect(result.blankPageNumbers, <int>[3]);
    expect(arranged.pageCount, 4);
    expect(afterOriginalBytes, originalBytes);
  });

  test('does not write arrangement copy without page arrangement metadata', () async {
    final tempDir = await Directory.systemTemp.createTemp(
      'clef-page-arrange-empty-',
    );
    addTearDown(() async {
      if (tempDir.existsSync()) {
        await tempDir.delete(recursive: true);
      }
    });
    final outputPath = '${tempDir.path}/short-score-arranged.pdf';

    final result = await SheetPdfPageTransformer.createArrangementAppliedCopy(
      inputPath: shortFixturePath,
      outputPath: outputPath,
      pageSettings: SheetPageSettings.empty,
    );

    expect(result.didWrite, isFalse);
    expect(result.outputPath, isNull);
    expect(File(outputPath).existsSync(), isFalse);
  });
}
