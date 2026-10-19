import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:image/image.dart' as image;
import 'package:pdf_document/pdf_document.dart';

import 'sheet_annotation.dart';
import 'sheet_score.dart';

enum SheetPdfAnnotationExportMode { renderedStamp, standardAnnotation }

typedef SheetPdfImageStampAssetReader = Future<List<int>?> Function(
  String assetRef,
);

typedef SheetPdfUnicodeFontBytesReader = Future<List<int>?> Function();

enum SheetPdfUnicodeFontPreflightStatus {
  notRequired,
  unavailable,
  invalid,
  tooLarge,
  projectedOutputTooLarge,
  missingGlyphs,
  ready,
}

class SheetPdfUnicodeFontPreflight {
  const SheetPdfUnicodeFontPreflight({
    required this.status,
    required this.unicodeTextCount,
    this.fontFamily,
    this.fontByteCount = 0,
    this.projectedEmbeddedByteCount = 0,
    this.unsupportedTexts = const <String>[],
  });

  final SheetPdfUnicodeFontPreflightStatus status;
  final int unicodeTextCount;
  final String? fontFamily;
  final int fontByteCount;
  final int projectedEmbeddedByteCount;
  final List<String> unsupportedTexts;

  bool get canEmbed =>
      status == SheetPdfUnicodeFontPreflightStatus.ready ||
      status == SheetPdfUnicodeFontPreflightStatus.notRequired;
}

class SheetPdfAnnotationExportCapability {
  const SheetPdfAnnotationExportCapability({
    required this.mode,
    required this.isSupported,
    required this.summary,
    this.supportedAnnotationTypes = const <String>[],
    this.unsupportedAnnotationTypes = const <String>[],
    this.requiredSpikeItems = const <String>[],
  });

  final SheetPdfAnnotationExportMode mode;
  final bool isSupported;
  final String summary;
  final List<String> supportedAnnotationTypes;
  final List<String> unsupportedAnnotationTypes;
  final List<String> requiredSpikeItems;

  bool get isRenderedStampCopy {
    return mode == SheetPdfAnnotationExportMode.renderedStamp;
  }

  bool get isStandardAnnotationEmbedding {
    return mode == SheetPdfAnnotationExportMode.standardAnnotation;
  }
}

class SheetStandardPdfAnnotationInspection {
  const SheetStandardPdfAnnotationInspection({
    required this.path,
    required this.pageCount,
    required this.totalAnnotationCount,
    required this.clefAnnotationCount,
    required this.subtypeCounts,
    required this.clefSubtypeCounts,
    required this.clefAnnotationNames,
    required this.clefAnnotationContents,
    required this.unicodeFreeTextContents,
    required this.missingGeneratedAppearanceNames,
    this.embeddedFontFreeTextNames = const <String>[],
    this.unembeddedUnicodeFreeTextNames = const <String>[],
  });

  final String path;
  final int pageCount;
  final int totalAnnotationCount;
  final int clefAnnotationCount;
  final Map<String, int> subtypeCounts;
  final Map<String, int> clefSubtypeCounts;
  final List<String> clefAnnotationNames;
  final List<String> clefAnnotationContents;
  final List<String> unicodeFreeTextContents;
  final List<String> missingGeneratedAppearanceNames;
  final List<String> embeddedFontFreeTextNames;
  final List<String> unembeddedUnicodeFreeTextNames;

  static const editableClefSubtypes = <String>{
    'Ink',
    'Line',
    'Square',
    'FreeText',
    'Stamp',
  };

  bool get hasClefAnnotations => clefAnnotationCount > 0;

  bool get hasOnlyLocallySupportedClefSubtypes {
    return clefSubtypeCounts.keys.every(editableClefSubtypes.contains);
  }

  bool get hasGeneratedAppearances {
    return missingGeneratedAppearanceNames.isEmpty;
  }

  bool get hasUnicodeFreeTextContents {
    return unicodeFreeTextContents.isNotEmpty;
  }

  bool get hasEmbeddedFontFreeText {
    return embeddedFontFreeTextNames.isNotEmpty;
  }

  bool get hasUnembeddedUnicodeFreeText {
    return unembeddedUnicodeFreeTextNames.isNotEmpty;
  }

  bool get isLocallyInspectableEditableFixture {
    return hasClefAnnotations &&
        hasOnlyLocallySupportedClefSubtypes &&
        hasGeneratedAppearances;
  }

  bool containsClefSubtype(String subtype) {
    return (clefSubtypeCounts[subtype] ?? 0) > 0;
  }
}

class SheetAnnotatedPdfExportResult {
  const SheetAnnotatedPdfExportResult({
    required this.inputPath,
    required this.outputPath,
    required this.pageCount,
    required this.strokeCount,
    required this.textCount,
    required this.exportedTextCount,
    required this.skippedUnicodeTextCount,
    required this.didWrite,
    this.mode = SheetPdfAnnotationExportMode.renderedStamp,
    this.failureReason,
    this.embeddedUnicodeTextCount = 0,
    this.unembeddedUnicodeTextCount = 0,
  });

  final String inputPath;
  final String? outputPath;
  final int pageCount;
  final int strokeCount;
  final int textCount;
  final int exportedTextCount;
  final int skippedUnicodeTextCount;
  final bool didWrite;
  final SheetPdfAnnotationExportMode mode;
  final String? failureReason;
  final int embeddedUnicodeTextCount;
  final int unembeddedUnicodeTextCount;

  static const unicodeTextRequiresFontEmbeddingReason =
      'unicodeTextRequiresFontEmbedding';
  static const annotationsOutsideDocumentPagesReason =
      'annotationsOutsideDocumentPages';
  static const standardAnnotationEmbeddingUnsupportedReason =
      'standardAnnotationEmbeddingUnsupported';
  static const standardAnnotationObjectMappingUnavailableReason =
      'standardAnnotationObjectMappingUnavailable';
  static const unicodeFontUnavailableReason = 'unicodeFontUnavailable';
  static const unicodeFontInvalidReason = 'unicodeFontInvalid';
  static const unicodeFontTooLargeReason = 'unicodeFontTooLarge';
  static const unicodeFontProjectedOutputTooLargeReason =
      'unicodeFontProjectedOutputTooLarge';
  static const unicodeFontMissingGlyphsReason = 'unicodeFontMissingGlyphs';

  bool get hasAnnotations => strokeCount + textCount > 0;

  bool get requiresUnicodeFontEmbedding {
    return failureReason == unicodeTextRequiresFontEmbeddingReason;
  }

  bool get hasOnlyAnnotationsOutsideDocumentPages {
    return failureReason == annotationsOutsideDocumentPagesReason;
  }

  bool get requestedStandardAnnotationEmbedding {
    return mode == SheetPdfAnnotationExportMode.standardAnnotation;
  }

  bool get hasUnsupportedStandardAnnotationEmbedding {
    return failureReason == standardAnnotationEmbeddingUnsupportedReason;
  }

  bool get hasUnsupportedStandardAnnotationObjectMapping {
    return failureReason == standardAnnotationObjectMappingUnavailableReason;
  }

  bool get hasUnicodeFontPreflightFailure {
    return failureReason == unicodeFontUnavailableReason ||
        failureReason == unicodeFontInvalidReason ||
        failureReason == unicodeFontTooLargeReason ||
        failureReason == unicodeFontProjectedOutputTooLargeReason ||
        failureReason == unicodeFontMissingGlyphsReason;
  }
}

class SheetAnnotatedPdfExporter {
  const SheetAnnotatedPdfExporter._();

  static const maxUnicodeFontBytes = 4 * 1024 * 1024;
  static const maxProjectedUnicodeFontBytes = 12 * 1024 * 1024;

  static const supportsStandardAnnotationEmbedding = true;
  static const renderedStampExportCapability =
      SheetPdfAnnotationExportCapability(
        mode: SheetPdfAnnotationExportMode.renderedStamp,
        isSupported: true,
        summary:
            'Creates a flattened PDF copy by drawing supported annotations '
            'over the original pages without changing the source file.',
        supportedAnnotationTypes: <String>[
          'pen',
          'highlighter',
          'line',
          'arrow',
          'rectangle',
          'crescendo',
          'diminuendo',
          'asciiText',
          'pngJpegWebpImageStamp',
        ],
        unsupportedAnnotationTypes: <String>[
          'unicodeTextWithoutEmbeddedFont',
          'editablePdfAnnotationObjects',
        ],
      );
  static const standardAnnotationExportCapability =
      SheetPdfAnnotationExportCapability(
        mode: SheetPdfAnnotationExportMode.standardAnnotation,
        isSupported: true,
        summary:
            'Embeds supported Clef annotations as editable PDF annotation '
            'objects with generated appearances. Complex music-specific '
            'symbols still fall back to the rendered copy path.',
        supportedAnnotationTypes: <String>[
          'inkAnnotation',
          'highlightInkAnnotation',
          'lineAnnotation',
          'arrowLineAnnotation',
          'squareAnnotation',
          'freeTextAnnotation',
          'textStampAnnotation',
          'iconTextStampAnnotation',
          'pngJpegWebpImageStampAnnotation',
          'hairpinAnnotation',
          'staffGridAnnotation',
        ],
        unsupportedAnnotationTypes: <String>[
          'richStampAppearanceAnnotation',
          'missingOrCorruptImageStampAnnotation',
        ],
        requiredSpikeItems: <String>[
          'acrobatPreviewFixture',
          'mobileSheetsPiascoreFixture',
          'androidPdfViewerFixture',
          'unicodeFontFallbackPolicy',
        ],
      );

  static SheetPdfAnnotationExportCapability capabilityFor(
    SheetPdfAnnotationExportMode mode,
  ) {
    switch (mode) {
      case SheetPdfAnnotationExportMode.renderedStamp:
        return renderedStampExportCapability;
      case SheetPdfAnnotationExportMode.standardAnnotation:
        return standardAnnotationExportCapability;
    }
  }

  static Future<SheetStandardPdfAnnotationInspection>
  inspectStandardAnnotationCopy(String pdfPath) async {
    final document = PdfDocument.open(await File(pdfPath).readAsBytes());
    final subtypeCounts = <String, int>{};
    final clefSubtypeCounts = <String, int>{};
    final clefAnnotationNames = <String>[];
    final clefAnnotationContents = <String>[];
    final unicodeFreeTextContents = <String>[];
    final missingGeneratedAppearanceNames = <String>[];
    final embeddedFontFreeTextNames = <String>[];
    final unembeddedUnicodeFreeTextNames = <String>[];
    var totalAnnotationCount = 0;
    var clefAnnotationCount = 0;

    for (var pageIndex = 0; pageIndex < document.pageCount; pageIndex++) {
      for (final annotation in document.page(pageIndex).annotations) {
        totalAnnotationCount += 1;
        subtypeCounts[annotation.subtype] =
            (subtypeCounts[annotation.subtype] ?? 0) + 1;

        final name = annotation.name;
        if (name == null || !name.startsWith('clef-')) {
          continue;
        }
        clefAnnotationCount += 1;
        clefAnnotationNames.add(name);
        clefSubtypeCounts[annotation.subtype] =
            (clefSubtypeCounts[annotation.subtype] ?? 0) + 1;
        final contents = annotation.contents;
        if (contents != null && contents.trim().isNotEmpty) {
          clefAnnotationContents.add(contents);
          if (annotation.subtype == 'FreeText' &&
              contents.runes.any((rune) => rune > 0x7f)) {
            unicodeFreeTextContents.add(contents);
            if (PdfEmbeddedFont.fromFreeText(annotation) == null) {
              unembeddedUnicodeFreeTextNames.add(name);
            }
          }
        }
        if (annotation.subtype == 'FreeText' &&
            PdfEmbeddedFont.fromFreeText(annotation) != null) {
          embeddedFontFreeTextNames.add(name);
        }
        if (!annotation.dict.containsKey('AP')) {
          missingGeneratedAppearanceNames.add(name);
        }
      }
    }

    return SheetStandardPdfAnnotationInspection(
      path: pdfPath,
      pageCount: document.pageCount,
      totalAnnotationCount: totalAnnotationCount,
      clefAnnotationCount: clefAnnotationCount,
      subtypeCounts: Map.unmodifiable(subtypeCounts),
      clefSubtypeCounts: Map.unmodifiable(clefSubtypeCounts),
      clefAnnotationNames: List.unmodifiable(clefAnnotationNames),
      clefAnnotationContents: List.unmodifiable(clefAnnotationContents),
      unicodeFreeTextContents: List.unmodifiable(unicodeFreeTextContents),
      missingGeneratedAppearanceNames: List.unmodifiable(
        missingGeneratedAppearanceNames,
      ),
      embeddedFontFreeTextNames: List.unmodifiable(embeddedFontFreeTextNames),
      unembeddedUnicodeFreeTextNames: List.unmodifiable(
        unembeddedUnicodeFreeTextNames,
      ),
    );
  }

  static bool textRequiresUnicodeFont(String text) {
    return text.runes.any((rune) => rune > 0x7f);
  }

  static SheetPdfUnicodeFontPreflight preflightUnicodeFont({
    required Iterable<String> texts,
    required List<int>? fontBytes,
    int maxFontBytes = maxUnicodeFontBytes,
    int maxProjectedBytes = maxProjectedUnicodeFontBytes,
  }) {
    final unicodeTexts = texts
        .map((text) => text.trim())
        .where((text) => text.isNotEmpty && textRequiresUnicodeFont(text))
        .toList(growable: false);
    if (unicodeTexts.isEmpty) {
      return const SheetPdfUnicodeFontPreflight(
        status: SheetPdfUnicodeFontPreflightStatus.notRequired,
        unicodeTextCount: 0,
      );
    }
    if (fontBytes == null || fontBytes.isEmpty) {
      return SheetPdfUnicodeFontPreflight(
        status: SheetPdfUnicodeFontPreflightStatus.unavailable,
        unicodeTextCount: unicodeTexts.length,
      );
    }
    if (fontBytes.length > maxFontBytes) {
      return SheetPdfUnicodeFontPreflight(
        status: SheetPdfUnicodeFontPreflightStatus.tooLarge,
        unicodeTextCount: unicodeTexts.length,
        fontByteCount: fontBytes.length,
        projectedEmbeddedByteCount: fontBytes.length * unicodeTexts.length,
      );
    }
    final projectedBytes = fontBytes.length * unicodeTexts.length;
    if (projectedBytes > maxProjectedBytes) {
      return SheetPdfUnicodeFontPreflight(
        status: SheetPdfUnicodeFontPreflightStatus.projectedOutputTooLarge,
        unicodeTextCount: unicodeTexts.length,
        fontByteCount: fontBytes.length,
        projectedEmbeddedByteCount: projectedBytes,
      );
    }
    try {
      final font = PdfEmbeddedFont.parse(Uint8List.fromList(fontBytes));
      final unsupportedTexts = unicodeTexts
          .where((text) => !font.canRender(text))
          .toList(growable: false);
      if (unsupportedTexts.isNotEmpty) {
        return SheetPdfUnicodeFontPreflight(
          status: SheetPdfUnicodeFontPreflightStatus.missingGlyphs,
          unicodeTextCount: unicodeTexts.length,
          fontFamily: font.displayName,
          fontByteCount: fontBytes.length,
          projectedEmbeddedByteCount: projectedBytes,
          unsupportedTexts: List.unmodifiable(unsupportedTexts),
        );
      }
      return SheetPdfUnicodeFontPreflight(
        status: SheetPdfUnicodeFontPreflightStatus.ready,
        unicodeTextCount: unicodeTexts.length,
        fontFamily: font.displayName,
        fontByteCount: fontBytes.length,
        projectedEmbeddedByteCount: projectedBytes,
      );
    } catch (_) {
      return SheetPdfUnicodeFontPreflight(
        status: SheetPdfUnicodeFontPreflightStatus.invalid,
        unicodeTextCount: unicodeTexts.length,
        fontByteCount: fontBytes.length,
        projectedEmbeddedByteCount: projectedBytes,
      );
    }
  }

  static bool _isPageInRange(int pageNumber, int pageCount) {
    return pageNumber >= 1 && pageNumber <= pageCount;
  }

  static bool scoreContainsUnicodeTextAnnotations(SheetScore score) {
    return exportableUnicodeTextAnnotationCount(score) > 0;
  }

  static int exportableUnicodeTextAnnotationCount(SheetScore score) {
    return score.annotationLayer.texts
        .where(
          (text) =>
              score.annotationLayer.isAnnotationLayerIncludedInExport(
                text.layerId,
              ) &&
              textRequiresUnicodeFont(text.text),
        )
        .length;
  }

  static Future<SheetAnnotatedPdfExportResult> createAnnotatedCopy({
    required SheetScore score,
    required String outputPath,
    SheetPdfAnnotationExportMode mode =
        SheetPdfAnnotationExportMode.renderedStamp,
    SheetPdfImageStampAssetReader? readImageStampAssetBytes,
    SheetPdfUnicodeFontBytesReader? readUnicodeFontBytes,
  }) async {
    final exportableStrokes = score.annotationLayer.strokes
        .where(
          (stroke) => score.annotationLayer.isAnnotationLayerIncludedInExport(
            stroke.layerId,
          ),
        )
        .toList(growable: false);
    final exportableTexts = score.annotationLayer.texts
        .where(
          (text) => score.annotationLayer.isAnnotationLayerIncludedInExport(
            text.layerId,
          ),
        )
        .toList(growable: false);
    final strokeCount = exportableStrokes.length;
    final textCount = exportableTexts.length;
    final renderedSkippedUnicodeTextCount = exportableTexts
        .where((text) => textRequiresUnicodeFont(text.text))
        .length;
    final renderedExportedTextCount =
        textCount - renderedSkippedUnicodeTextCount;
    if (mode == SheetPdfAnnotationExportMode.standardAnnotation) {
      return _createStandardAnnotationCopy(
        score: score,
        outputPath: outputPath,
        exportableStrokes: exportableStrokes,
        exportableTexts: exportableTexts,
        strokeCount: strokeCount,
        textCount: textCount,
        readImageStampAssetBytes: readImageStampAssetBytes,
        readUnicodeFontBytes: readUnicodeFontBytes,
      );
    }
    if (strokeCount + textCount == 0) {
      return SheetAnnotatedPdfExportResult(
        inputPath: score.filePath,
        outputPath: null,
        pageCount: 0,
        strokeCount: 0,
        textCount: 0,
        exportedTextCount: 0,
        skippedUnicodeTextCount: 0,
        didWrite: false,
        mode: mode,
      );
    }
    try {
      final inputBytes = await File(score.filePath).readAsBytes();
      final document = PdfDocument.open(inputBytes);
      final editor = PdfEditor(document);
      final pageCount = document.pageCount;
      final imageStampAssets = await _loadImageStampAssets(
        exportableTexts,
        readImageStampAssetBytes,
      );
      final drawableStrokeCount = exportableStrokes
          .where((stroke) => _isPageInRange(stroke.pageNumber, pageCount))
          .length;
      final drawableTextCount = exportableTexts
          .where(
            (text) =>
                _isPageInRange(text.pageNumber, pageCount) &&
                _canDrawRenderedTextAnnotation(text, imageStampAssets),
          )
          .length;
      final skippedUnicodeTextInRangeCount = exportableTexts
          .where(
            (text) =>
                _isPageInRange(text.pageNumber, pageCount) &&
                !text.isImageStamp &&
                textRequiresUnicodeFont(text.text),
          )
          .length;
      if (drawableStrokeCount + drawableTextCount == 0) {
        const unicodeReason = SheetAnnotatedPdfExportResult
            .unicodeTextRequiresFontEmbeddingReason;
        const outsidePagesReason =
            SheetAnnotatedPdfExportResult.annotationsOutsideDocumentPagesReason;
        final failureReason = skippedUnicodeTextInRangeCount > 0
            ? unicodeReason
            : outsidePagesReason;
        return SheetAnnotatedPdfExportResult(
          inputPath: score.filePath,
          outputPath: null,
          pageCount: pageCount,
          strokeCount: strokeCount,
          textCount: textCount,
          exportedTextCount: renderedExportedTextCount,
          skippedUnicodeTextCount: renderedSkippedUnicodeTextCount,
          didWrite: false,
          mode: mode,
          failureReason: failureReason,
        );
      }

      for (var pageIndex = 0; pageIndex < pageCount; pageIndex++) {
        final pageNumber = pageIndex + 1;
        final strokes = score.annotationLayer.exportableStrokesForPage(
          pageNumber,
        );
        final texts = score.annotationLayer.exportableTextsForPage(pageNumber);
        if (strokes.isEmpty && texts.isEmpty) {
          continue;
        }

        editor.stampPage(pageIndex, (stamp) {
          final geometry = SheetPdfAnnotationGeometry.fromPage(stamp.page);
          for (final stroke in strokes) {
            _drawStroke(stamp, geometry, stroke);
          }
          for (final text in texts) {
            if (!_canDrawRenderedTextAnnotation(text, imageStampAssets)) {
              continue;
            }
            _drawText(stamp, geometry, text, imageStampAssets);
          }
        });
      }

      final outputBytes = editor.save();
      final outputFile = File(outputPath);
      await outputFile.parent.create(recursive: true);
      await outputFile.writeAsBytes(outputBytes, flush: true);
      return SheetAnnotatedPdfExportResult(
        inputPath: score.filePath,
        outputPath: outputPath,
        pageCount: pageCount,
        strokeCount: strokeCount,
        textCount: textCount,
        exportedTextCount: renderedExportedTextCount,
        skippedUnicodeTextCount: renderedSkippedUnicodeTextCount,
        didWrite: true,
        mode: mode,
      );
    } catch (error) {
      return SheetAnnotatedPdfExportResult(
        inputPath: score.filePath,
        outputPath: null,
        pageCount: 0,
        strokeCount: strokeCount,
        textCount: textCount,
        exportedTextCount: renderedExportedTextCount,
        skippedUnicodeTextCount: renderedSkippedUnicodeTextCount,
        didWrite: false,
        mode: mode,
        failureReason: error.toString(),
      );
    }
  }

  static Future<SheetAnnotatedPdfExportResult> _createStandardAnnotationCopy({
    required SheetScore score,
    required String outputPath,
    required List<SheetAnnotationStroke> exportableStrokes,
    required List<SheetTextAnnotation> exportableTexts,
    required int strokeCount,
    required int textCount,
    SheetPdfImageStampAssetReader? readImageStampAssetBytes,
    SheetPdfUnicodeFontBytesReader? readUnicodeFontBytes,
  }) async {
    if (strokeCount + textCount == 0) {
      return SheetAnnotatedPdfExportResult(
        inputPath: score.filePath,
        outputPath: null,
        pageCount: 0,
        strokeCount: 0,
        textCount: 0,
        exportedTextCount: 0,
        skippedUnicodeTextCount: 0,
        didWrite: false,
        mode: SheetPdfAnnotationExportMode.standardAnnotation,
      );
    }

    try {
      final inputBytes = await File(score.filePath).readAsBytes();
      final document = PdfDocument.open(inputBytes);
      final editor = PdfEditor(document);
      final pageCount = document.pageCount;
      final imageStampAssets = await _loadImageStampAssets(
        exportableTexts,
        readImageStampAssetBytes,
      );
      final inRangeUnicodeTexts = exportableTexts
          .where(
            (text) =>
                _isPageInRange(text.pageNumber, pageCount) &&
                !text.isImageStamp &&
                textRequiresUnicodeFont(text.text),
          )
          .toList(growable: false);
      PdfEmbeddedFont? unicodeFont;
      if (readUnicodeFontBytes != null && inRangeUnicodeTexts.isNotEmpty) {
        List<int>? fontBytes;
        try {
          fontBytes = await readUnicodeFontBytes();
        } catch (_) {
          fontBytes = null;
        }
        final preflight = preflightUnicodeFont(
          texts: inRangeUnicodeTexts.map((text) => text.text),
          fontBytes: fontBytes,
        );
        if (!preflight.canEmbed) {
          return SheetAnnotatedPdfExportResult(
            inputPath: score.filePath,
            outputPath: null,
            pageCount: pageCount,
            strokeCount: strokeCount,
            textCount: textCount,
            exportedTextCount: 0,
            skippedUnicodeTextCount: 0,
            didWrite: false,
            mode: SheetPdfAnnotationExportMode.standardAnnotation,
            failureReason: _unicodeFontFailureReason(preflight.status),
          );
        }
        unicodeFont = PdfEmbeddedFont.parse(Uint8List.fromList(fontBytes!));
      }
      var wroteAnnotation = false;
      var inRangeAnnotationCount = 0;
      var exportedTextCount = 0;

      for (var pageIndex = 0; pageIndex < pageCount; pageIndex++) {
        final pageNumber = pageIndex + 1;
        final page = document.page(pageIndex);
        final geometry = SheetPdfAnnotationGeometry.fromPage(page);
        final strokes = score.annotationLayer.exportableStrokesForPage(
          pageNumber,
        );
        final texts = score.annotationLayer.exportableTextsForPage(pageNumber);

        for (final stroke in strokes) {
          inRangeAnnotationCount += 1;
          wroteAnnotation =
              _addStandardStrokeAnnotation(editor, pageIndex, geometry, stroke)
              ? true
              : wroteAnnotation;
        }
        for (final text in texts) {
          inRangeAnnotationCount += 1;
          if (_addStandardTextAnnotation(
            editor,
            pageIndex,
            geometry,
            text,
            imageStampAssets,
            unicodeFont,
          )) {
            exportedTextCount += 1;
            wroteAnnotation = true;
          }
        }
      }

      if (!wroteAnnotation) {
        final failureReason = inRangeAnnotationCount == 0
            ? SheetAnnotatedPdfExportResult
                  .annotationsOutsideDocumentPagesReason
            : SheetAnnotatedPdfExportResult
                  .standardAnnotationObjectMappingUnavailableReason;
        return SheetAnnotatedPdfExportResult(
          inputPath: score.filePath,
          outputPath: null,
          pageCount: pageCount,
          strokeCount: strokeCount,
          textCount: textCount,
          exportedTextCount: 0,
          skippedUnicodeTextCount: 0,
          didWrite: false,
          mode: SheetPdfAnnotationExportMode.standardAnnotation,
          failureReason: failureReason,
        );
      }

      final outputBytes = editor.save();
      final outputFile = File(outputPath);
      await outputFile.parent.create(recursive: true);
      await outputFile.writeAsBytes(outputBytes, flush: true);
      return SheetAnnotatedPdfExportResult(
        inputPath: score.filePath,
        outputPath: outputPath,
        pageCount: pageCount,
        strokeCount: strokeCount,
        textCount: textCount,
        exportedTextCount: exportedTextCount,
        skippedUnicodeTextCount: 0,
        didWrite: true,
        mode: SheetPdfAnnotationExportMode.standardAnnotation,
        embeddedUnicodeTextCount: unicodeFont == null
            ? 0
            : inRangeUnicodeTexts.length,
        unembeddedUnicodeTextCount: unicodeFont == null
            ? inRangeUnicodeTexts.length
            : 0,
      );
    } catch (error) {
      return SheetAnnotatedPdfExportResult(
        inputPath: score.filePath,
        outputPath: null,
        pageCount: 0,
        strokeCount: strokeCount,
        textCount: textCount,
        exportedTextCount: 0,
        skippedUnicodeTextCount: 0,
        didWrite: false,
        mode: SheetPdfAnnotationExportMode.standardAnnotation,
        failureReason: error.toString(),
      );
    }
  }

  static bool _addStandardStrokeAnnotation(
    PdfEditor editor,
    int pageIndex,
    SheetPdfAnnotationGeometry geometry,
    SheetAnnotationStroke stroke,
  ) {
    if (stroke.points.isEmpty) {
      return false;
    }

    final color = _rgb(stroke.color);
    final width = _pdfLineWidth(stroke);
    switch (stroke.tool) {
      case SheetAnnotationTool.pen:
      case SheetAnnotationTool.highlighter:
        final points = [
          for (final point in stroke.points)
            () {
              final pdfPoint = geometry.toPdfPoint(point);
              return (pdfPoint.x, pdfPoint.y);
            }(),
        ];
        editor.addInk(
          pageIndex,
          <List<(double, double)>>[points],
          color: color,
          strokeWidth: width,
          opacity: stroke.tool == SheetAnnotationTool.highlighter ? 0.35 : 1,
          pressures: _hasPressureVariation(stroke)
              ? <List<double>?>[
                  [for (final point in stroke.points) point.pressure],
                ]
              : null,
          contents: stroke.tool.name,
          name: _standardAnnotationName(stroke.id),
        );
        return true;
      case SheetAnnotationTool.line:
      case SheetAnnotationTool.arrow:
        if (stroke.points.length < 2) {
          return false;
        }
        final start = geometry.toPdfPoint(stroke.points.first);
        final end = geometry.toPdfPoint(stroke.points.last);
        if (start.x == end.x && start.y == end.y) {
          return false;
        }
        editor.addLine(
          pageIndex,
          (start.x, start.y),
          (end.x, end.y),
          strokeColor: color,
          strokeWidth: width,
          endEnding: stroke.tool == SheetAnnotationTool.arrow
              ? PdfLineEnding.openArrow
              : PdfLineEnding.none,
          contents: stroke.tool.name,
          name: _standardAnnotationName(stroke.id),
        );
        return true;
      case SheetAnnotationTool.rectangle:
        if (stroke.points.length < 2) {
          return false;
        }
        final first = geometry.toPdfPoint(stroke.points.first);
        final second = geometry.toPdfPoint(stroke.points.last);
        final rect = PdfRect.normalized(first.x, first.y, second.x, second.y);
        if (rect.width == 0 || rect.height == 0) {
          return false;
        }
        editor.addSquare(
          pageIndex,
          rect,
          strokeColor: color,
          strokeWidth: width,
          fillColor: null,
          contents: stroke.tool.name,
          name: _standardAnnotationName(stroke.id),
        );
        return true;
      case SheetAnnotationTool.crescendo:
      case SheetAnnotationTool.diminuendo:
        return _addStandardHairpinAnnotation(
          editor,
          pageIndex,
          geometry,
          stroke,
        );
      case SheetAnnotationTool.staff:
      case SheetAnnotationTool.grid:
        return _addStandardGuideAnnotation(editor, pageIndex, geometry, stroke);
    }
  }

  static bool _addStandardGuideAnnotation(
    PdfEditor editor,
    int pageIndex,
    SheetPdfAnnotationGeometry geometry,
    SheetAnnotationStroke stroke,
  ) {
    if (stroke.points.length < 2) {
      return false;
    }
    final first = geometry.toPdfPoint(stroke.points.first);
    final second = geometry.toPdfPoint(stroke.points.last);
    final left = math.min(first.x, second.x);
    final right = math.max(first.x, second.x);
    final bottom = math.min(first.y, second.y);
    final top = math.max(first.y, second.y);
    if (left == right || bottom == top) {
      return false;
    }

    final color = _rgb(stroke.color);
    final width = _guidePdfLineWidth(stroke);
    final name = _standardAnnotationName(stroke.id);
    var wroteLine = false;
    void addGuideLine(
      String suffix,
      (double, double) start,
      (double, double) end,
    ) {
      editor.addLine(
        pageIndex,
        start,
        end,
        strokeColor: color,
        strokeWidth: width,
        contents: stroke.tool.name,
        name: '$name-$suffix',
      );
      wroteLine = true;
    }

    if (stroke.tool == SheetAnnotationTool.staff) {
      final height = top - bottom;
      final lineGap = height <= 1 ? 6.0 : height / 4;
      final startY = height <= 1 ? top + (lineGap * 2) : top;
      for (var index = 0; index < 5; index += 1) {
        final y = startY - (lineGap * index);
        addGuideLine('staff-$index', (left, y), (right, y));
      }
      return wroteLine;
    }

    const divisions = 4;
    for (var index = 0; index <= divisions; index += 1) {
      final t = index / divisions;
      final x = left + ((right - left) * t);
      final y = bottom + ((top - bottom) * t);
      addGuideLine('grid-v-$index', (x, bottom), (x, top));
      addGuideLine('grid-h-$index', (left, y), (right, y));
    }
    return wroteLine;
  }

  static bool _addStandardHairpinAnnotation(
    PdfEditor editor,
    int pageIndex,
    SheetPdfAnnotationGeometry geometry,
    SheetAnnotationStroke stroke,
  ) {
    if (stroke.points.length < 2) {
      return false;
    }
    final start = geometry.toPdfPoint(stroke.points.first);
    final end = geometry.toPdfPoint(stroke.points.last);
    final dx = end.x - start.x;
    final dy = end.y - start.y;
    final length = math.sqrt((dx * dx) + (dy * dy));
    if (length == 0) {
      return false;
    }
    final normalX = -dy / length;
    final normalY = dx / length;
    final opening = (_pdfLineWidth(stroke) * 5).clamp(12.0, 36.0).toDouble();
    final halfOpening = opening / 2;
    final isCrescendo = stroke.tool == SheetAnnotationTool.crescendo;
    final closed = isCrescendo ? start : end;
    final open = isCrescendo ? end : start;
    final upper = (
      open.x + (normalX * halfOpening),
      open.y + (normalY * halfOpening),
    );
    final lower = (
      open.x - (normalX * halfOpening),
      open.y - (normalY * halfOpening),
    );
    final color = _rgb(stroke.color);
    final width = _pdfLineWidth(stroke);
    final name = _standardAnnotationName(stroke.id);
    editor.addLine(
      pageIndex,
      (closed.x, closed.y),
      upper,
      strokeColor: color,
      strokeWidth: width,
      contents: stroke.tool.name,
      name: '$name-upper',
    );
    editor.addLine(
      pageIndex,
      (closed.x, closed.y),
      lower,
      strokeColor: color,
      strokeWidth: width,
      contents: stroke.tool.name,
      name: '$name-lower',
    );
    return true;
  }

  static bool _addStandardTextAnnotation(
    PdfEditor editor,
    int pageIndex,
    SheetPdfAnnotationGeometry geometry,
    SheetTextAnnotation text,
    Map<String, PdfEmbeddableImage> imageStampAssets,
    PdfEmbeddedFont? unicodeFont,
  ) {
    if (text.isImageStamp) {
      final image = imageStampAssets[text.stampAssetRef];
      if (image == null) {
        return false;
      }
      final rect = _imageStampPdfRect(geometry, text, image);
      if (rect.width <= 0 || rect.height <= 0) {
        return false;
      }
      editor.addImageStamp(
        pageIndex,
        rect,
        image,
        author: 'Clef & Staff',
        name: _standardAnnotationName(text.id),
      );
      return true;
    }
    final trimmedText = text.text.trim();
    if (trimmedText.isEmpty) {
      return false;
    }
    final point = geometry.toPdfPoint(text.position);
    final estimatedWidth = (trimmedText.runes.length * text.fontSize * 0.65)
        .clamp(text.fontSize * 3.5, geometry.width * 0.75)
        .toDouble();
    final estimatedHeight = (text.fontSize * 1.6)
        .clamp(text.fontSize * 1.3, geometry.height * 0.25)
        .toDouble();
    final rect = PdfRect(
      point.x,
      point.y - estimatedHeight,
      (point.x + estimatedWidth)
          .clamp(geometry.left, geometry.left + geometry.width)
          .toDouble(),
      point.y,
    );
    if (rect.width <= 0 || rect.height <= 0) {
      return false;
    }
    editor.addFreeText(
      pageIndex,
      rect,
      trimmedText,
      fontSize: text.fontSize,
      font: unicodeFont != null && textRequiresUnicodeFont(trimmedText)
          ? unicodeFont
          : PdfStandardFont.helvetica,
      color: _rgb(text.color),
      borderColor: null,
      borderWidth: 0,
      name: _standardAnnotationName(text.id),
    );
    return true;
  }

  static String _unicodeFontFailureReason(
    SheetPdfUnicodeFontPreflightStatus status,
  ) {
    switch (status) {
      case SheetPdfUnicodeFontPreflightStatus.unavailable:
        return SheetAnnotatedPdfExportResult.unicodeFontUnavailableReason;
      case SheetPdfUnicodeFontPreflightStatus.invalid:
        return SheetAnnotatedPdfExportResult.unicodeFontInvalidReason;
      case SheetPdfUnicodeFontPreflightStatus.tooLarge:
        return SheetAnnotatedPdfExportResult.unicodeFontTooLargeReason;
      case SheetPdfUnicodeFontPreflightStatus.projectedOutputTooLarge:
        return SheetAnnotatedPdfExportResult
            .unicodeFontProjectedOutputTooLargeReason;
      case SheetPdfUnicodeFontPreflightStatus.missingGlyphs:
        return SheetAnnotatedPdfExportResult.unicodeFontMissingGlyphsReason;
      case SheetPdfUnicodeFontPreflightStatus.notRequired:
      case SheetPdfUnicodeFontPreflightStatus.ready:
        throw ArgumentError.value(status, 'status', 'is not a failure');
    }
  }

  static PdfRect _imageStampPdfRect(
    SheetPdfAnnotationGeometry geometry,
    SheetTextAnnotation text,
    PdfEmbeddableImage image,
  ) {
    final point = geometry.toPdfPoint(text.position);
    final size = _imageStampPdfSize(geometry, text, image);
    return PdfRect(
      point.x,
      point.y - size.height,
      point.x + size.width,
      point.y,
    );
  }

  static String _standardAnnotationName(String id) {
    final safeId = id
        .trim()
        .replaceAll(RegExp(r'[^A-Za-z0-9._-]+'), '-')
        .replaceAll(RegExp(r'-+'), '-');
    return 'clef-${safeId.isEmpty ? 'annotation' : safeId}';
  }

  static Future<Map<String, PdfEmbeddableImage>> _loadImageStampAssets(
    List<SheetTextAnnotation> texts,
    SheetPdfImageStampAssetReader? readImageStampAssetBytes,
  ) async {
    if (readImageStampAssetBytes == null) {
      return const <String, PdfEmbeddableImage>{};
    }
    final refs = <String>{
      for (final text in texts)
        if (text.isImageStamp) text.stampAssetRef.trim(),
    }..removeWhere((ref) => ref.isEmpty);
    if (refs.isEmpty) {
      return const <String, PdfEmbeddableImage>{};
    }
    final images = <String, PdfEmbeddableImage>{};
    for (final ref in refs) {
      try {
        final bytes = await readImageStampAssetBytes(ref);
        if (bytes == null || bytes.isEmpty) {
          continue;
        }
        final decoded = _decodeImageStampAsset(bytes);
        if (decoded != null) {
          images[ref] = decoded;
        }
      } catch (_) {
        // Missing or corrupt image assets fall back to the stamp label in
        // rendered export and are skipped in standard annotation export.
      }
    }
    return Map.unmodifiable(images);
  }

  static PdfEmbeddableImage? _decodeImageStampAsset(List<int> bytes) {
    final data = Uint8List.fromList(bytes);
    try {
      return PdfEmbeddableImage.decode(data);
    } catch (_) {
      // Continue to a broader decoder below. Some user stamp formats such as
      // WebP are accepted by Clef storage but need a PDF-friendly appearance.
    }

    final decoded = image.decodeImage(data);
    if (decoded == null) {
      return null;
    }
    try {
      return PdfEmbeddableImage.decode(
        Uint8List.fromList(image.encodePng(decoded)),
      );
    } catch (_) {
      return null;
    }
  }

  static bool _canDrawRenderedTextAnnotation(
    SheetTextAnnotation text,
    Map<String, PdfEmbeddableImage> imageStampAssets,
  ) {
    if (text.text.trim().isEmpty) {
      return false;
    }
    if (text.isImageStamp && imageStampAssets.containsKey(text.stampAssetRef)) {
      return true;
    }
    return !textRequiresUnicodeFont(text.text);
  }

  static void _drawStroke(
    PdfStamp stamp,
    SheetPdfAnnotationGeometry geometry,
    SheetAnnotationStroke stroke,
  ) {
    if (stroke.points.isEmpty) {
      return;
    }

    final first = geometry.toPdfPoint(stroke.points.first);
    final content = stamp.content;
    content.save();
    content.strokeColor(_rgb(stroke.color));
    content.lineWidth(_pdfLineWidth(stroke));
    content.roundLines();
    if (stroke.tool == SheetAnnotationTool.rectangle &&
        stroke.points.length >= 2) {
      _drawRectangle(content, geometry, stroke);
      content.restore();
      return;
    }
    if ((stroke.tool == SheetAnnotationTool.crescendo ||
            stroke.tool == SheetAnnotationTool.diminuendo) &&
        stroke.points.length >= 2) {
      _drawHairpin(content, geometry, stroke);
      content.restore();
      return;
    }
    if (stroke.tool != SheetAnnotationTool.line &&
        stroke.tool != SheetAnnotationTool.arrow &&
        _hasPressureVariation(stroke)) {
      _drawPressureStroke(content, geometry, stroke);
      content.restore();
      return;
    }
    content.moveTo(first.x, first.y);
    for (final point in stroke.points.skip(1)) {
      final converted = geometry.toPdfPoint(point);
      content.lineTo(converted.x, converted.y);
    }
    if (stroke.points.length == 1) {
      content.lineTo(first.x + 0.1, first.y + 0.1);
    }
    content.stroke();
    if (stroke.tool == SheetAnnotationTool.arrow && stroke.points.length >= 2) {
      _drawArrowHead(content, geometry, stroke);
    }
    content.restore();
  }

  static void _drawPressureStroke(
    dynamic content,
    SheetPdfAnnotationGeometry geometry,
    SheetAnnotationStroke stroke,
  ) {
    final baseWidth = _pdfLineWidth(stroke);
    if (stroke.points.length == 1) {
      final first = geometry.toPdfPoint(stroke.points.single);
      content
        ..lineWidth(_pdfPressureLineWidth(baseWidth, stroke.points.single))
        ..moveTo(first.x, first.y)
        ..lineTo(first.x + 0.1, first.y + 0.1)
        ..stroke();
      return;
    }
    for (var index = 0; index < stroke.points.length - 1; index += 1) {
      final start = stroke.points[index];
      final end = stroke.points[index + 1];
      final startPdf = geometry.toPdfPoint(start);
      final endPdf = geometry.toPdfPoint(end);
      final pressure = (start.pressure + end.pressure) / 2;
      content
        ..lineWidth((baseWidth * pressure).clamp(0.5, 36.0).toDouble())
        ..moveTo(startPdf.x, startPdf.y)
        ..lineTo(endPdf.x, endPdf.y)
        ..stroke();
    }
  }

  static void _drawRectangle(
    dynamic content,
    SheetPdfAnnotationGeometry geometry,
    SheetAnnotationStroke stroke,
  ) {
    final first = geometry.toPdfPoint(stroke.points.first);
    final second = geometry.toPdfPoint(stroke.points.last);
    final left = math.min(first.x, second.x);
    final right = math.max(first.x, second.x);
    final top = math.max(first.y, second.y);
    final bottom = math.min(first.y, second.y);
    content
      ..moveTo(left, bottom)
      ..lineTo(right, bottom)
      ..lineTo(right, top)
      ..lineTo(left, top)
      ..lineTo(left, bottom)
      ..stroke();
  }

  static void _drawArrowHead(
    dynamic content,
    SheetPdfAnnotationGeometry geometry,
    SheetAnnotationStroke stroke,
  ) {
    final start = geometry.toPdfPoint(stroke.points[stroke.points.length - 2]);
    final end = geometry.toPdfPoint(stroke.points.last);
    final dx = end.x - start.x;
    final dy = end.y - start.y;
    if (math.sqrt((dx * dx) + (dy * dy)) < 0.1) {
      return;
    }
    final angle = math.atan2(dy, dx);
    final headLength = (_pdfLineWidth(stroke) * 4).clamp(8.0, 18.0).toDouble();
    final wingAngle = math.pi / 7;
    final left = SheetPdfAnnotationPoint(
      end.x - (headLength * math.cos(angle - wingAngle)),
      end.y - (headLength * math.sin(angle - wingAngle)),
    );
    final right = SheetPdfAnnotationPoint(
      end.x - (headLength * math.cos(angle + wingAngle)),
      end.y - (headLength * math.sin(angle + wingAngle)),
    );
    content
      ..moveTo(end.x, end.y)
      ..lineTo(left.x, left.y)
      ..moveTo(end.x, end.y)
      ..lineTo(right.x, right.y)
      ..stroke();
  }

  static void _drawHairpin(
    dynamic content,
    SheetPdfAnnotationGeometry geometry,
    SheetAnnotationStroke stroke,
  ) {
    final start = geometry.toPdfPoint(stroke.points.first);
    final end = geometry.toPdfPoint(stroke.points.last);
    final dx = end.x - start.x;
    final dy = end.y - start.y;
    final length = math.sqrt((dx * dx) + (dy * dy));
    if (length < 0.1) {
      content
        ..moveTo(start.x, start.y)
        ..lineTo(start.x + 0.1, start.y + 0.1)
        ..stroke();
      return;
    }
    final normalX = -dy / length;
    final normalY = dx / length;
    final opening = (_pdfLineWidth(stroke) * 5).clamp(10.0, 28.0).toDouble();
    final halfOpening = opening / 2;
    final closed = stroke.tool == SheetAnnotationTool.crescendo ? start : end;
    final open = stroke.tool == SheetAnnotationTool.crescendo ? end : start;
    final upper = SheetPdfAnnotationPoint(
      open.x + (normalX * halfOpening),
      open.y + (normalY * halfOpening),
    );
    final lower = SheetPdfAnnotationPoint(
      open.x - (normalX * halfOpening),
      open.y - (normalY * halfOpening),
    );
    content
      ..moveTo(closed.x, closed.y)
      ..lineTo(upper.x, upper.y)
      ..moveTo(closed.x, closed.y)
      ..lineTo(lower.x, lower.y)
      ..stroke();
  }

  static void _drawText(
    PdfStamp stamp,
    SheetPdfAnnotationGeometry geometry,
    SheetTextAnnotation text,
    Map<String, PdfEmbeddableImage> imageStampAssets,
  ) {
    if (text.text.trim().isEmpty) {
      return;
    }
    if (text.isImageStamp) {
      final image = imageStampAssets[text.stampAssetRef];
      if (image != null) {
        _drawImageStamp(stamp, geometry, text, image);
        return;
      }
      if (textRequiresUnicodeFont(text.text)) {
        return;
      }
    }

    final point = geometry.toPdfPoint(text.position);
    stamp.text(
      text.text,
      x: point.x,
      y: point.y - text.fontSize,
      size: text.fontSize,
      color: _rgb(text.color),
    );
  }

  static void _drawImageStamp(
    PdfStamp stamp,
    SheetPdfAnnotationGeometry geometry,
    SheetTextAnnotation text,
    PdfEmbeddableImage image,
  ) {
    final rect = _imageStampPdfRect(geometry, text, image);
    final width = rect.width;
    final height = rect.height;
    final x = rect.left;
    final y = rect.bottom;
    stamp.rect(
      x,
      y,
      width,
      height,
      fillColor: 0xffffff,
      strokeColor: _rgb(text.color),
      lineWidth: 0.75,
    );
    final inset = math.min(3.0, math.min(width, height) / 8);
    stamp.image(
      image,
      x: x + inset,
      y: y + inset,
      width: math.max(1, width - (inset * 2)).toDouble(),
      height: math.max(1, height - (inset * 2)).toDouble(),
    );
  }

  static ({double width, double height}) _imageStampPdfSize(
    SheetPdfAnnotationGeometry geometry,
    SheetTextAnnotation text,
    PdfEmbeddableImage image,
  ) {
    final base =
        (text.fontSize *
                (math.min(geometry.width, geometry.height) / 640) *
                3.1)
            .clamp(18.0, 96.0)
            .toDouble();
    final aspect = image.height == 0 ? 1.0 : image.width / image.height;
    return (width: (base * aspect).clamp(18.0, 120.0).toDouble(), height: base);
  }

  static int _rgb(int color) => color & 0x00ffffff;

  static double _pdfLineWidth(SheetAnnotationStroke stroke) {
    final base = stroke.width.clamp(1.0, 18.0).toDouble();
    return stroke.tool == SheetAnnotationTool.highlighter ? base * 1.8 : base;
  }

  static double _guidePdfLineWidth(SheetAnnotationStroke stroke) {
    final base = _pdfLineWidth(stroke);
    if (stroke.tool == SheetAnnotationTool.grid) {
      return base.clamp(0.8, 2.4).toDouble();
    }
    return base.clamp(1.0, 4.0).toDouble();
  }

  static bool _hasPressureVariation(SheetAnnotationStroke stroke) {
    return stroke.points.any((point) => point.pressure != 1.0);
  }

  static double _pdfPressureLineWidth(
    double baseWidth,
    SheetAnnotationPoint point,
  ) {
    return (baseWidth * point.pressure).clamp(0.5, 36.0).toDouble();
  }
}

class SheetPdfAnnotationGeometry {
  const SheetPdfAnnotationGeometry({
    required this.left,
    required this.bottom,
    required this.width,
    required this.height,
  });

  factory SheetPdfAnnotationGeometry.fromPage(PdfPage page) {
    final box = page.cropBox;
    return SheetPdfAnnotationGeometry(
      left: box.left,
      bottom: box.bottom,
      width: box.width,
      height: box.height,
    );
  }

  final double left;
  final double bottom;
  final double width;
  final double height;

  SheetPdfAnnotationPoint toPdfPoint(SheetAnnotationPoint point) {
    final x = point.x.clamp(0.0, 1.0).toDouble();
    final y = point.y.clamp(0.0, 1.0).toDouble();
    return SheetPdfAnnotationPoint(
      left + (x * width),
      bottom + ((1 - y) * height),
    );
  }
}

class SheetPdfAnnotationPoint {
  const SheetPdfAnnotationPoint(this.x, this.y);

  final double x;
  final double y;
}
