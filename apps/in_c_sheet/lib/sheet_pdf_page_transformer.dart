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

class SheetPdfPageArrangementResult {
  const SheetPdfPageArrangementResult({
    required this.inputPath,
    required this.outputPath,
    required this.sourcePageCount,
    required this.outputPageCount,
    required this.insertedBlankPageCount,
    required this.didWrite,
    this.sourcePageMapping = const <int, List<int>>{},
    this.pageRotations = const <int, int>{},
    this.pageCrops = const <int, SheetCropSettings>{},
    this.blankPageNumbers = const <int>[],
    this.failureReason,
  });

  final String inputPath;
  final String? outputPath;
  final int sourcePageCount;
  final int outputPageCount;
  final int insertedBlankPageCount;
  final bool didWrite;
  final Map<int, List<int>> sourcePageMapping;
  final Map<int, int> pageRotations;
  final Map<int, SheetCropSettings> pageCrops;
  final List<int> blankPageNumbers;
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

  static Future<SheetPdfPageArrangementResult> createArrangementAppliedCopy({
    required String inputPath,
    required String outputPath,
    required SheetPageSettings pageSettings,
  }) async {
    if (pageSettings.hiddenPages.isEmpty &&
        pageSettings.pageOrder.isEmpty &&
        pageSettings.blankPageInsertions.isEmpty) {
      return SheetPdfPageArrangementResult(
        inputPath: inputPath,
        outputPath: null,
        sourcePageCount: 0,
        outputPageCount: 0,
        insertedBlankPageCount: 0,
        didWrite: false,
      );
    }

    try {
      final inputBytes = await File(inputPath).readAsBytes();
      final document = PdfDocument.open(inputBytes);
      final sourcePageCount = document.pageCount;
      final slots = _arrangedPageSlots(
        pageSettings: pageSettings,
        pageCount: sourcePageCount,
      );
      final sourcePages = slots
          .map((slot) => slot.sourcePage)
          .whereType<int>()
          .toList(growable: false);
      final blankPageNumbers = <int>[
        for (var index = 0; index < slots.length; index += 1)
          if (slots[index].isBlank) index + 1,
      ];

      if (sourcePages.isEmpty ||
          (_isIdentityOrder(sourcePages, sourcePageCount) &&
              blankPageNumbers.isEmpty &&
              !pageSettings.hasInstanceOverrides)) {
        return SheetPdfPageArrangementResult(
          inputPath: inputPath,
          outputPath: null,
          sourcePageCount: sourcePageCount,
          outputPageCount: sourcePageCount,
          insertedBlankPageCount: 0,
          didWrite: false,
        );
      }

      var outputBytes = document.extractPages(
        sourcePages.map((page) => page - 1).toList(growable: false),
      );
      if (blankPageNumbers.isNotEmpty) {
        final arrangedDocument = PdfDocument.open(outputBytes);
        final editor = PdfEditor(arrangedDocument);
        for (final pageNumber in blankPageNumbers) {
          final size = _blankPageSizeForSlot(
            document: document,
            slots: slots,
            blankIndex: pageNumber - 1,
          );
          editor.insertBlankPage(
            width: size.width,
            height: size.height,
            at: pageNumber - 1,
          );
        }
        outputBytes = editor.save();
      }

      final outputFile = File(outputPath);
      await outputFile.parent.create(recursive: true);
      await outputFile.writeAsBytes(outputBytes, flush: true);
      return SheetPdfPageArrangementResult(
        inputPath: inputPath,
        outputPath: outputPath,
        sourcePageCount: sourcePageCount,
        outputPageCount: slots.length,
        insertedBlankPageCount: blankPageNumbers.length,
        didWrite: true,
        sourcePageMapping: _sourcePageMapping(slots),
        pageRotations: _arrangedPageRotations(
          slots: slots,
          pageSettings: pageSettings,
        ),
        pageCrops: _arrangedPageCrops(slots: slots, pageSettings: pageSettings),
        blankPageNumbers: List<int>.unmodifiable(blankPageNumbers),
      );
    } catch (error) {
      return SheetPdfPageArrangementResult(
        inputPath: inputPath,
        outputPath: null,
        sourcePageCount: 0,
        outputPageCount: 0,
        insertedBlankPageCount: 0,
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

  static List<_ArrangedPageSlot> _arrangedPageSlots({
    required SheetPageSettings pageSettings,
    required int pageCount,
  }) {
    final slots = pageSettings
        .effectivePageOrder(pageCount)
        .asMap()
        .entries
        .map(
          (entry) => _ArrangedPageSlot.source(
            sourcePage: entry.value,
            orderIndex: entry.key,
          ),
        )
        .toList(growable: true);
    if (slots.isEmpty) {
      return const <_ArrangedPageSlot>[];
    }

    final insertions = pageSettings.blankPageInsertions
        .where((insertion) => insertion.isValidForPageCount(pageCount))
        .toList(growable: false);
    for (final insertion in insertions) {
      final insertAt = insertion.afterPage == 0
          ? 0
          : slots.lastIndexWhere(
                  (slot) => slot.sourcePage == insertion.afterPage,
                ) +
                1;
      if (insertAt < 1 && insertion.afterPage != 0) {
        continue;
      }
      slots.insert(insertAt, const _ArrangedPageSlot.blank());
    }
    return List<_ArrangedPageSlot>.unmodifiable(slots);
  }

  static Map<int, List<int>> _sourcePageMapping(List<_ArrangedPageSlot> slots) {
    final mapping = <int, List<int>>{};
    for (var index = 0; index < slots.length; index += 1) {
      final sourcePage = slots[index].sourcePage;
      if (sourcePage == null) {
        continue;
      }
      mapping.putIfAbsent(sourcePage, () => <int>[]).add(index + 1);
    }
    return Map<int, List<int>>.unmodifiable(
      mapping.map(
        (page, pages) => MapEntry(page, List<int>.unmodifiable(pages)),
      ),
    );
  }

  static Map<int, int> _arrangedPageRotations({
    required List<_ArrangedPageSlot> slots,
    required SheetPageSettings pageSettings,
  }) {
    final rotations = <int, int>{};
    for (var index = 0; index < slots.length; index += 1) {
      final slot = slots[index];
      final sourcePage = slot.sourcePage;
      final orderIndex = slot.orderIndex;
      if (sourcePage == null || orderIndex == null) {
        continue;
      }
      final rotation = pageSettings.rotationForPage(
        sourcePage,
        orderIndex: orderIndex,
      );
      if (rotation != 0) {
        rotations[index + 1] = rotation;
      }
    }
    return Map<int, int>.unmodifiable(rotations);
  }

  static Map<int, SheetCropSettings> _arrangedPageCrops({
    required List<_ArrangedPageSlot> slots,
    required SheetPageSettings pageSettings,
  }) {
    final crops = <int, SheetCropSettings>{};
    for (var index = 0; index < slots.length; index += 1) {
      final slot = slots[index];
      final sourcePage = slot.sourcePage;
      final orderIndex = slot.orderIndex;
      if (sourcePage == null || orderIndex == null) {
        continue;
      }
      final crop = pageSettings
          .cropForPage(sourcePage, orderIndex: orderIndex)
          .normalized();
      if (crop.hasCrop) {
        crops[index + 1] = crop;
      }
    }
    return Map<int, SheetCropSettings>.unmodifiable(crops);
  }

  static PdfRect _blankPageSizeForSlot({
    required PdfDocument document,
    required List<_ArrangedPageSlot> slots,
    required int blankIndex,
  }) {
    int? sourcePage;
    for (var index = blankIndex - 1; index >= 0; index -= 1) {
      sourcePage = slots[index].sourcePage;
      if (sourcePage != null) {
        break;
      }
    }
    if (sourcePage == null) {
      for (var index = blankIndex + 1; index < slots.length; index += 1) {
        sourcePage = slots[index].sourcePage;
        if (sourcePage != null) {
          break;
        }
      }
    }
    final pageIndex = ((sourcePage ?? 1) - 1)
        .clamp(0, document.pageCount - 1)
        .toInt();
    final page = document.page(pageIndex);
    return page.cropBox;
  }

  static bool _isIdentityOrder(List<int> sourcePages, int pageCount) {
    if (sourcePages.length != pageCount) {
      return false;
    }
    for (var index = 0; index < pageCount; index += 1) {
      if (sourcePages[index] != index + 1) {
        return false;
      }
    }
    return true;
  }
}

class _ArrangedPageSlot {
  const _ArrangedPageSlot.source({
    required this.sourcePage,
    required this.orderIndex,
  });

  const _ArrangedPageSlot.blank() : sourcePage = null, orderIndex = null;

  final int? sourcePage;
  final int? orderIndex;

  bool get isBlank => sourcePage == null;
}
