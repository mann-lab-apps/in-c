import 'dart:io';
import 'dart:math' as math;

import 'package:pdf_document/pdf_document.dart';

import 'sheet_annotation.dart';
import 'sheet_score.dart';

enum SheetPdfAnnotationExportMode {
  renderedStamp,
  standardAnnotation,
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

  static const unicodeTextRequiresFontEmbeddingReason =
      'unicodeTextRequiresFontEmbedding';
  static const annotationsOutsideDocumentPagesReason =
      'annotationsOutsideDocumentPages';
  static const standardAnnotationEmbeddingUnsupportedReason =
      'standardAnnotationEmbeddingUnsupported';

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
}

class SheetAnnotatedPdfExporter {
  const SheetAnnotatedPdfExporter._();

  static const supportsStandardAnnotationEmbedding = false;

  static bool textRequiresUnicodeFont(String text) {
    return text.runes.any((rune) => rune > 0x7f);
  }

  static bool _isPageInRange(int pageNumber, int pageCount) {
    return pageNumber >= 1 && pageNumber <= pageCount;
  }

  static bool scoreContainsUnicodeTextAnnotations(SheetScore score) {
    if (!score.annotationLayer.includeDefaultLayerInExport) {
      return false;
    }
    return score.annotationLayer.texts.any(
      (text) => textRequiresUnicodeFont(text.text),
    );
  }

  static Future<SheetAnnotatedPdfExportResult> createAnnotatedCopy({
    required SheetScore score,
    required String outputPath,
    SheetPdfAnnotationExportMode mode =
        SheetPdfAnnotationExportMode.renderedStamp,
  }) async {
    final exportableStrokes = score.annotationLayer.includeDefaultLayerInExport
        ? score.annotationLayer.strokes
        : const <SheetAnnotationStroke>[];
    final exportableTexts = score.annotationLayer.includeDefaultLayerInExport
        ? score.annotationLayer.texts
        : const <SheetTextAnnotation>[];
    final strokeCount = exportableStrokes.length;
    final textCount = exportableTexts.length;
    final skippedUnicodeTextCount = exportableTexts
        .where((text) => textRequiresUnicodeFont(text.text))
        .length;
    final exportedTextCount = textCount - skippedUnicodeTextCount;
    if (mode == SheetPdfAnnotationExportMode.standardAnnotation) {
      return SheetAnnotatedPdfExportResult(
        inputPath: score.filePath,
        outputPath: null,
        pageCount: 0,
        strokeCount: strokeCount,
        textCount: textCount,
        exportedTextCount: 0,
        skippedUnicodeTextCount: skippedUnicodeTextCount,
        didWrite: false,
        mode: mode,
        failureReason: SheetAnnotatedPdfExportResult
            .standardAnnotationEmbeddingUnsupportedReason,
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
      final drawableStrokeCount = exportableStrokes
          .where((stroke) => _isPageInRange(stroke.pageNumber, pageCount))
          .length;
      final drawableTextCount = exportableTexts
          .where(
            (text) =>
                _isPageInRange(text.pageNumber, pageCount) &&
                !textRequiresUnicodeFont(text.text),
          )
          .length;
      final skippedUnicodeTextInRangeCount = exportableTexts
          .where(
            (text) =>
                _isPageInRange(text.pageNumber, pageCount) &&
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
          exportedTextCount: exportedTextCount,
          skippedUnicodeTextCount: skippedUnicodeTextCount,
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
            if (textRequiresUnicodeFont(text.text)) {
              continue;
            }
            _drawText(stamp, geometry, text);
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
        exportedTextCount: exportedTextCount,
        skippedUnicodeTextCount: skippedUnicodeTextCount,
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
        exportedTextCount: exportedTextCount,
        skippedUnicodeTextCount: skippedUnicodeTextCount,
        didWrite: false,
        mode: mode,
        failureReason: error.toString(),
      );
    }
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
    if (stroke.tool != SheetAnnotationTool.arrow &&
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

  static void _drawText(
    PdfStamp stamp,
    SheetPdfAnnotationGeometry geometry,
    SheetTextAnnotation text,
  ) {
    if (text.text.trim().isEmpty) {
      return;
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

  static int _rgb(int color) => color & 0x00ffffff;

  static double _pdfLineWidth(SheetAnnotationStroke stroke) {
    final base = stroke.width.clamp(1.0, 18.0).toDouble();
    return stroke.tool == SheetAnnotationTool.highlighter ? base * 1.8 : base;
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
