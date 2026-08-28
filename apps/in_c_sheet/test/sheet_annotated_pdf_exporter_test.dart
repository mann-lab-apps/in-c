import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_annotated_pdf_exporter.dart';
import 'package:in_c_sheet/sheet_annotation.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:pdf_document/pdf_document.dart';

void main() {
  test('converts normalized annotation points to PDF page coordinates', () {
    const geometry = SheetPdfAnnotationGeometry(
      left: 10,
      bottom: 20,
      width: 200,
      height: 100,
    );

    expect(geometry.toPdfPoint(const SheetAnnotationPoint(x: 0, y: 0)).x, 10);
    expect(geometry.toPdfPoint(const SheetAnnotationPoint(x: 0, y: 0)).y, 120);
    expect(geometry.toPdfPoint(const SheetAnnotationPoint(x: 1, y: 1)).x, 210);
    expect(geometry.toPdfPoint(const SheetAnnotationPoint(x: 1, y: 1)).y, 20);
  });

  test('detects text annotations that need a Unicode-capable PDF font', () {
    expect(SheetAnnotatedPdfExporter.textRequiresUnicodeFont('Cue'), isFalse);
    expect(SheetAnnotatedPdfExporter.textRequiresUnicodeFont('숨 크게'), isTrue);
  });

  test('creates an annotated PDF copy without changing the original', () async {
    final input = File('test-fixtures/pdfs/short-score.pdf');
    final originalBytes = await input.readAsBytes();
    final outputDir = await Directory.systemTemp.createTemp(
      'clef-annotated-export-',
    );
    addTearDown(() async {
      if (outputDir.existsSync()) {
        await outputDir.delete(recursive: true);
      }
    });

    final now = DateTime.parse('2026-08-23T10:00:00.000');
    final score = SheetScore(
      id: 'score-1',
      title: 'Short Score',
      composer: 'Composer',
      tags: const <String>[],
      note: '',
      filePath: input.path,
      importedAt: now,
      updatedAt: now,
      lastOpenedAt: null,
      lastPage: 1,
      isFavorite: false,
      bookmarks: const <SheetBookmark>[],
      annotationLayer: SheetAnnotationLayer(
        strokes: <SheetAnnotationStroke>[
          SheetAnnotationStroke(
            id: 'stroke-1',
            pageNumber: 1,
            tool: SheetAnnotationTool.pen,
            color: 0xffd32f2f,
            width: 3,
            points: const <SheetAnnotationPoint>[
              SheetAnnotationPoint(x: 0.2, y: 0.2),
              SheetAnnotationPoint(x: 0.8, y: 0.8),
            ],
            createdAt: now,
          ),
          SheetAnnotationStroke(
            id: 'arrow-1',
            pageNumber: 1,
            tool: SheetAnnotationTool.arrow,
            color: 0xff111111,
            width: 3,
            points: const <SheetAnnotationPoint>[
              SheetAnnotationPoint(x: 0.1, y: 0.8),
              SheetAnnotationPoint(x: 0.4, y: 0.6),
            ],
            createdAt: now.add(const Duration(seconds: 1)),
          ),
          SheetAnnotationStroke(
            id: 'rect-1',
            pageNumber: 1,
            tool: SheetAnnotationTool.rectangle,
            color: 0xff1d5fd1,
            width: 3,
            points: const <SheetAnnotationPoint>[
              SheetAnnotationPoint(x: 0.45, y: 0.35),
              SheetAnnotationPoint(x: 0.75, y: 0.55),
            ],
            createdAt: now.add(const Duration(seconds: 2)),
          ),
        ],
        texts: <SheetTextAnnotation>[
          SheetTextAnnotation(
            id: 'text-1',
            pageNumber: 1,
            position: const SheetAnnotationPoint(x: 0.3, y: 0.3),
            text: 'Cue',
            color: 0xff111111,
            fontSize: 14,
            createdAt: now,
          ),
        ],
      ),
    );
    final outputPath = '${outputDir.path}/exports/short-score-annotated.pdf';

    final result = await SheetAnnotatedPdfExporter.createAnnotatedCopy(
      score: score,
      outputPath: outputPath,
    );

    expect(result.didWrite, isTrue);
    expect(result.strokeCount, 3);
    expect(result.textCount, 1);
    expect(result.exportedTextCount, 1);
    expect(result.skippedUnicodeTextCount, 0);
    expect(await File(outputPath).exists(), isTrue);
    expect(await input.readAsBytes(), originalBytes);

    final exported = PdfDocument.open(await File(outputPath).readAsBytes());
    expect(exported.pageCount, 3);
  });

  test('does not write a PDF copy when there are no annotations', () async {
    final input = File('test-fixtures/pdfs/short-score.pdf');
    final now = DateTime.parse('2026-08-23T10:00:00.000');
    final score = SheetScore(
      id: 'score-1',
      title: 'Short Score',
      composer: '',
      tags: const <String>[],
      note: '',
      filePath: input.path,
      importedAt: now,
      updatedAt: now,
      lastOpenedAt: null,
      lastPage: 1,
      isFavorite: false,
      bookmarks: const <SheetBookmark>[],
    );

    final result = await SheetAnnotatedPdfExporter.createAnnotatedCopy(
      score: score,
      outputPath: '/tmp/unused-clef-annotated.pdf',
    );

    expect(result.didWrite, isFalse);
    expect(result.outputPath, isNull);
  });

  test('does not write a PDF copy when default annotation layer is excluded',
      () async {
    final input = File('test-fixtures/pdfs/short-score.pdf');
    final now = DateTime.parse('2026-08-23T10:00:00.000');
    final score = SheetScore(
      id: 'score-1',
      title: 'Short Score',
      composer: '',
      tags: const <String>[],
      note: '',
      filePath: input.path,
      importedAt: now,
      updatedAt: now,
      lastOpenedAt: null,
      lastPage: 1,
      isFavorite: false,
      bookmarks: const <SheetBookmark>[],
      annotationLayer: SheetAnnotationLayer(
        strokes: <SheetAnnotationStroke>[
          SheetAnnotationStroke(
            id: 'stroke-1',
            pageNumber: 1,
            tool: SheetAnnotationTool.pen,
            color: 0xff111111,
            width: 3,
            points: const <SheetAnnotationPoint>[
              SheetAnnotationPoint(x: 0.1, y: 0.1),
              SheetAnnotationPoint(x: 0.2, y: 0.2),
            ],
            createdAt: now,
          ),
        ],
        layers: <SheetAnnotationDisplayLayer>[
          SheetAnnotationDisplayLayer.defaultLayer.copyWith(
            includeInExport: false,
          ),
        ],
      ),
    );

    final result = await SheetAnnotatedPdfExporter.createAnnotatedCopy(
      score: score,
      outputPath: '/tmp/unused-clef-layer-excluded.pdf',
    );

    expect(score.annotationLayer.strokesForPage(1), hasLength(1));
    expect(result.didWrite, isFalse);
    expect(result.hasAnnotations, isFalse);
    expect(result.outputPath, isNull);
  });

  test('does not write when annotations are outside PDF page range', () async {
    final input = File('test-fixtures/pdfs/short-score.pdf');
    final outputDir = await Directory.systemTemp.createTemp(
      'clef-annotated-export-outside-pages-',
    );
    addTearDown(() async {
      if (outputDir.existsSync()) {
        await outputDir.delete(recursive: true);
      }
    });
    final outputPath = '${outputDir.path}/short-score-annotated.pdf';
    final now = DateTime.parse('2026-08-23T10:00:00.000');
    final score = SheetScore(
      id: 'score-1',
      title: 'Short Score',
      composer: '',
      tags: const <String>[],
      note: '',
      filePath: input.path,
      importedAt: now,
      updatedAt: now,
      lastOpenedAt: null,
      lastPage: 1,
      isFavorite: false,
      bookmarks: const <SheetBookmark>[],
      annotationLayer: SheetAnnotationLayer(
        strokes: <SheetAnnotationStroke>[
          SheetAnnotationStroke(
            id: 'outside-stroke',
            pageNumber: 9,
            tool: SheetAnnotationTool.pen,
            color: 0xff111111,
            width: 3,
            points: const <SheetAnnotationPoint>[
              SheetAnnotationPoint(x: 0.1, y: 0.1),
              SheetAnnotationPoint(x: 0.2, y: 0.2),
            ],
            createdAt: now,
          ),
        ],
      ),
    );

    final result = await SheetAnnotatedPdfExporter.createAnnotatedCopy(
      score: score,
      outputPath: outputPath,
    );

    expect(result.didWrite, isFalse);
    expect(result.outputPath, isNull);
    expect(result.pageCount, 3);
    expect(result.strokeCount, 1);
    expect(
      result.failureReason,
      SheetAnnotatedPdfExportResult.annotationsOutsideDocumentPagesReason,
    );
    expect(result.hasOnlyAnnotationsOutsideDocumentPages, isTrue);
    expect(await File(outputPath).exists(), isFalse);
  });

  test(
    'does not write when only Unicode text annotations need font embedding',
    () async {
      final input = File('test-fixtures/pdfs/short-score.pdf');
      final now = DateTime.parse('2026-08-23T10:00:00.000');
      final score = SheetScore(
        id: 'score-1',
        title: 'Short Score',
        composer: '',
        tags: const <String>[],
        note: '',
        filePath: input.path,
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: null,
        lastPage: 1,
        isFavorite: false,
        bookmarks: const <SheetBookmark>[],
        annotationLayer: SheetAnnotationLayer(
          strokes: const <SheetAnnotationStroke>[],
          texts: <SheetTextAnnotation>[
            SheetTextAnnotation(
              id: 'text-kr',
              pageNumber: 1,
              position: const SheetAnnotationPoint(x: 0.3, y: 0.3),
              text: '숨 크게',
              color: 0xff111111,
              fontSize: 14,
              createdAt: now,
            ),
          ],
        ),
      );

      final result = await SheetAnnotatedPdfExporter.createAnnotatedCopy(
        score: score,
        outputPath: '/tmp/unused-clef-unicode-annotated.pdf',
      );

      expect(result.didWrite, isFalse);
      expect(result.outputPath, isNull);
      expect(result.exportedTextCount, 0);
      expect(result.skippedUnicodeTextCount, 1);
      expect(
        result.failureReason,
        SheetAnnotatedPdfExportResult.unicodeTextRequiresFontEmbeddingReason,
      );
      expect(result.requiresUnicodeFontEmbedding, isTrue);
    },
  );
}
