import 'dart:io';
import 'dart:typed_data';

import 'package:pdf_document/pdf_document.dart';

import 'sheet_annotation.dart';
import 'sheet_score.dart';

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
  final String? failureReason;

  bool get hasAnnotations => strokeCount + textCount > 0;
}

class SheetAnnotatedPdfExporter {
  const SheetAnnotatedPdfExporter._();

  static bool textRequiresUnicodeFont(String text) {
    return text.runes.any((rune) => rune > 0x7f);
  }

  static bool scoreContainsUnicodeTextAnnotations(SheetScore score) {
    return score.annotationLayer.texts.any(
      (text) => textRequiresUnicodeFont(text.text),
    );
  }

  static Future<SheetAnnotatedPdfExportResult> createAnnotatedCopy({
    required SheetScore score,
    required String outputPath,
  }) async {
    final strokeCount = score.annotationLayer.strokes.length;
    final textCount = score.annotationLayer.texts.length;
    final skippedUnicodeTextCount = score.annotationLayer.texts
        .where((text) => textRequiresUnicodeFont(text.text))
        .length;
    final exportedTextCount = textCount - skippedUnicodeTextCount;
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
      );
    }
    if (strokeCount + exportedTextCount == 0) {
      return SheetAnnotatedPdfExportResult(
        inputPath: score.filePath,
        outputPath: null,
        pageCount: 0,
        strokeCount: strokeCount,
        textCount: textCount,
        exportedTextCount: 0,
        skippedUnicodeTextCount: skippedUnicodeTextCount,
        didWrite: false,
        failureReason: 'unicodeTextRequiresFontEmbedding',
      );
    }

    try {
      final inputBytes = await File(score.filePath).readAsBytes();
      final document = PdfDocument.open(Uint8List.fromList(inputBytes));
      final editor = PdfEditor(document);
      final pageCount = document.pageCount;

      for (var pageIndex = 0; pageIndex < pageCount; pageIndex++) {
        final pageNumber = pageIndex + 1;
        final strokes = score.annotationLayer.strokesForPage(pageNumber);
        final texts = score.annotationLayer.textsForPage(pageNumber);
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
      await File(outputPath).writeAsBytes(outputBytes, flush: true);
      return SheetAnnotatedPdfExportResult(
        inputPath: score.filePath,
        outputPath: outputPath,
        pageCount: pageCount,
        strokeCount: strokeCount,
        textCount: textCount,
        exportedTextCount: exportedTextCount,
        skippedUnicodeTextCount: skippedUnicodeTextCount,
        didWrite: true,
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
    content.moveTo(first.x, first.y);
    for (final point in stroke.points.skip(1)) {
      final converted = geometry.toPdfPoint(point);
      content.lineTo(converted.x, converted.y);
    }
    if (stroke.points.length == 1) {
      content.lineTo(first.x + 0.1, first.y + 0.1);
    }
    content.stroke();
    content.restore();
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
