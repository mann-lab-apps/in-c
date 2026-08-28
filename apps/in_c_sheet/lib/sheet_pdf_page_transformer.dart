import 'dart:io';

import 'package:pdf_cos/pdf_cos.dart';
import 'package:pdf_document/pdf_document.dart';

import 'sheet_score.dart';

class SheetPdfPageRotationResult {
  const SheetPdfPageRotationResult({
    required this.inputPath,
    required this.outputPath,
    required this.pageCount,
    required this.rotatedPageCount,
    required this.didWrite,
    this.failureReason,
  });

  final String inputPath;
  final String? outputPath;
  final int pageCount;
  final int rotatedPageCount;
  final bool didWrite;
  final String? failureReason;
}

class SheetPdfPageCropResult {
  const SheetPdfPageCropResult({
    required this.inputPath,
    required this.outputPath,
    required this.pageCount,
    required this.croppedPageCount,
    required this.didWrite,
    this.failureReason,
  });

  final String inputPath;
  final String? outputPath;
  final int pageCount;
  final int croppedPageCount;
  final bool didWrite;
  final String? failureReason;
}

class SheetPdfPageTransformer {
  const SheetPdfPageTransformer._();

  static Future<SheetPdfPageRotationResult> createRotationAppliedCopy({
    required String inputPath,
    required String outputPath,
    required Map<int, int> pageRotations,
  }) async {
    final normalizedRotations = _normalizeRotations(pageRotations);
    if (normalizedRotations.isEmpty) {
      return SheetPdfPageRotationResult(
        inputPath: inputPath,
        outputPath: null,
        pageCount: 0,
        rotatedPageCount: 0,
        didWrite: false,
      );
    }

    try {
      final inputBytes = await File(inputPath).readAsBytes();
      final document = PdfDocument.open(inputBytes);
      final editor = PdfEditor(document);
      final pageCount = document.pageCount;
      var rotatedPageCount = 0;

      for (final entry in normalizedRotations.entries) {
        final pageNumber = entry.key;
        if (pageNumber < 1 || pageNumber > pageCount) {
          continue;
        }
        editor.rotatePages(<int>[pageNumber - 1], entry.value);
        rotatedPageCount += 1;
      }

      if (rotatedPageCount == 0) {
        return SheetPdfPageRotationResult(
          inputPath: inputPath,
          outputPath: null,
          pageCount: pageCount,
          rotatedPageCount: 0,
          didWrite: false,
        );
      }

      final outputBytes = editor.save();
      final outputFile = File(outputPath);
      await outputFile.parent.create(recursive: true);
      await outputFile.writeAsBytes(outputBytes, flush: true);
      return SheetPdfPageRotationResult(
        inputPath: inputPath,
        outputPath: outputPath,
        pageCount: pageCount,
        rotatedPageCount: rotatedPageCount,
        didWrite: true,
      );
    } catch (error) {
      return SheetPdfPageRotationResult(
        inputPath: inputPath,
        outputPath: null,
        pageCount: 0,
        rotatedPageCount: 0,
        didWrite: false,
        failureReason: error.toString(),
      );
    }
  }

  static Future<SheetPdfPageCropResult> createCropAppliedCopy({
    required String inputPath,
    required String outputPath,
    required SheetPageSettings pageSettings,
  }) async {
    if (!pageSettings.crop.hasCrop && pageSettings.pageCrops.isEmpty) {
      return SheetPdfPageCropResult(
        inputPath: inputPath,
        outputPath: null,
        pageCount: 0,
        croppedPageCount: 0,
        didWrite: false,
      );
    }

    try {
      final inputBytes = await File(inputPath).readAsBytes();
      final document = PdfDocument.open(inputBytes);
      final updater = CosIncrementalUpdater(document.cos);
      final pageCount = document.pageCount;
      var croppedPageCount = 0;

      for (var pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        final crop = pageSettings.cropForPage(pageNumber).normalized();
        if (!crop.hasCrop) {
          continue;
        }

        final page = document.page(pageNumber - 1);
        final cropBox = _applyCrop(page.cropBox, crop);
        if (cropBox == page.cropBox) {
          continue;
        }

        page.dict['CropBox'] = _rectArray(cropBox);
        updater.markChanged(page.dict);
        croppedPageCount += 1;
      }

      if (croppedPageCount == 0) {
        return SheetPdfPageCropResult(
          inputPath: inputPath,
          outputPath: null,
          pageCount: pageCount,
          croppedPageCount: 0,
          didWrite: false,
        );
      }

      final outputBytes = updater.save();
      final outputFile = File(outputPath);
      await outputFile.parent.create(recursive: true);
      await outputFile.writeAsBytes(outputBytes, flush: true);
      return SheetPdfPageCropResult(
        inputPath: inputPath,
        outputPath: outputPath,
        pageCount: pageCount,
        croppedPageCount: croppedPageCount,
        didWrite: true,
      );
    } catch (error) {
      return SheetPdfPageCropResult(
        inputPath: inputPath,
        outputPath: null,
        pageCount: 0,
        croppedPageCount: 0,
        didWrite: false,
        failureReason: error.toString(),
      );
    }
  }

  static Map<int, int> _normalizeRotations(Map<int, int> rotations) {
    final normalized = <int, int>{};
    for (final entry in rotations.entries) {
      final degrees = ((entry.value % 360) + 360) % 360;
      if (entry.key < 1 || degrees == 0) {
        continue;
      }
      if (degrees == 90 || degrees == 180 || degrees == 270) {
        normalized[entry.key] = degrees;
      }
    }
    return Map<int, int>.unmodifiable(normalized);
  }

  static PdfRect _applyCrop(PdfRect base, SheetCropSettings crop) {
    final width = base.width;
    final height = base.height;
    if (width <= 0 || height <= 0) {
      return base;
    }

    final left = base.left + (crop.left * width);
    final right = base.right - (crop.right * width);
    final bottom = base.bottom + (crop.bottom * height);
    final top = base.top - (crop.top * height);
    if (right <= left || top <= bottom) {
      return base;
    }
    return PdfRect(left, bottom, right, top);
  }

  static CosArray _rectArray(PdfRect rect) {
    return CosArray(<CosObject>[
      CosReal(rect.left),
      CosReal(rect.bottom),
      CosReal(rect.right),
      CosReal(rect.top),
    ]);
  }
}
