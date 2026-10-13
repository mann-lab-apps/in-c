import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as image;
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

  test('reports PDF annotation export capabilities before editable export', () {
    final rendered = SheetAnnotatedPdfExporter.capabilityFor(
      SheetPdfAnnotationExportMode.renderedStamp,
    );
    final standard = SheetAnnotatedPdfExporter.capabilityFor(
      SheetPdfAnnotationExportMode.standardAnnotation,
    );

    expect(rendered.isSupported, isTrue);
    expect(rendered.isRenderedStampCopy, isTrue);
    expect(rendered.supportedAnnotationTypes, contains('pen'));
    expect(rendered.supportedAnnotationTypes, contains('asciiText'));
    expect(
      rendered.unsupportedAnnotationTypes,
      contains('editablePdfAnnotationObjects'),
    );
    expect(standard.isSupported, isTrue);
    expect(standard.isStandardAnnotationEmbedding, isTrue);
    expect(standard.supportedAnnotationTypes, contains('inkAnnotation'));
    expect(standard.supportedAnnotationTypes, contains('freeTextAnnotation'));
    expect(standard.supportedAnnotationTypes, contains('textStampAnnotation'));
    expect(
      standard.supportedAnnotationTypes,
      contains('iconTextStampAnnotation'),
    );
    expect(
      standard.supportedAnnotationTypes,
      contains('pngJpegWebpImageStampAnnotation'),
    );
    expect(standard.supportedAnnotationTypes, contains('hairpinAnnotation'));
    expect(standard.supportedAnnotationTypes, contains('staffGridAnnotation'));
    expect(
      standard.unsupportedAnnotationTypes,
      contains('missingOrCorruptImageStampAnnotation'),
    );
    expect(
      standard.unsupportedAnnotationTypes,
      isNot(contains('hairpinAnnotation')),
    );
    expect(
      standard.unsupportedAnnotationTypes,
      isNot(contains('staffGridAnnotation')),
    );
    expect(standard.requiredSpikeItems, contains('acrobatPreviewFixture'));
    expect(
      standard.requiredSpikeItems,
      contains('mobileSheetsPiascoreFixture'),
    );
    expect(standard.requiredSpikeItems, contains('androidPdfViewerFixture'));
    expect(standard.requiredSpikeItems, contains('unicodeFontFallbackPolicy'));
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
          SheetAnnotationStroke(
            id: 'crescendo-1',
            pageNumber: 1,
            tool: SheetAnnotationTool.crescendo,
            color: 0xff111111,
            width: 3,
            points: const <SheetAnnotationPoint>[
              SheetAnnotationPoint(x: 0.15, y: 0.7),
              SheetAnnotationPoint(x: 0.45, y: 0.7),
            ],
            createdAt: now.add(const Duration(seconds: 3)),
          ),
          SheetAnnotationStroke(
            id: 'diminuendo-1',
            pageNumber: 1,
            tool: SheetAnnotationTool.diminuendo,
            color: 0xff111111,
            width: 3,
            points: const <SheetAnnotationPoint>[
              SheetAnnotationPoint(x: 0.55, y: 0.7),
              SheetAnnotationPoint(x: 0.85, y: 0.7),
            ],
            createdAt: now.add(const Duration(seconds: 4)),
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
    expect(result.mode, SheetPdfAnnotationExportMode.renderedStamp);
    expect(result.strokeCount, 5);
    expect(result.textCount, 1);
    expect(result.exportedTextCount, 1);
    expect(result.skippedUnicodeTextCount, 0);
    expect(await File(outputPath).exists(), isTrue);
    expect(await input.readAsBytes(), originalBytes);

    final exported = PdfDocument.open(await File(outputPath).readAsBytes());
    expect(exported.pageCount, 3);
  });

  test('draws PNG image stamps into flattened PDF copies', () async {
    final input = File('test-fixtures/pdfs/short-score.pdf');
    final outputDir = await Directory.systemTemp.createTemp(
      'clef-annotated-image-stamp-export-',
    );
    addTearDown(() async {
      if (outputDir.existsSync()) {
        await outputDir.delete(recursive: true);
      }
    });

    final pngBytes = image.encodePng(image.Image(width: 8, height: 8));
    final now = DateTime.parse('2026-10-08T10:00:00.000');
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
            id: 'image-stamp-1',
            pageNumber: 1,
            position: const SheetAnnotationPoint(x: 0.3, y: 0.3),
            text: 'Cue photo',
            color: 0xff111111,
            fontSize: 18,
            createdAt: now,
            stampKind: SheetAnnotationUserStamp.imageKind,
            stampAssetRef: 'stamps/user/cue-photo.png',
          ),
        ],
      ),
    );
    final outputPath = '${outputDir.path}/short-score-image-stamp.pdf';

    final result = await SheetAnnotatedPdfExporter.createAnnotatedCopy(
      score: score,
      outputPath: outputPath,
      readImageStampAssetBytes: (assetRef) async =>
          assetRef == 'stamps/user/cue-photo.png' ? pngBytes : null,
    );

    expect(result.didWrite, isTrue);
    expect(result.textCount, 1);
    expect(result.exportedTextCount, 1);
    final outputText = String.fromCharCodes(
      await File(outputPath).readAsBytes(),
    );
    expect(outputText, contains('/Subtype /Image'));
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

  test(
    'does not write a PDF copy when default annotation layer is excluded',
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
    },
  );

  test(
    'exports non-default layer annotations by their layer export flag',
    () async {
      final input = File('test-fixtures/pdfs/short-score.pdf');
      final outputDir = await Directory.systemTemp.createTemp(
        'clef-annotated-export-layers-',
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
              id: 'default-stroke',
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
            SheetAnnotationStroke(
              id: 'export-stroke',
              pageNumber: 1,
              tool: SheetAnnotationTool.pen,
              color: 0xff1d5fd1,
              width: 3,
              points: const <SheetAnnotationPoint>[
                SheetAnnotationPoint(x: 0.3, y: 0.3),
                SheetAnnotationPoint(x: 0.4, y: 0.4),
              ],
              createdAt: now.add(const Duration(seconds: 1)),
              layerId: 'teacher',
            ),
            SheetAnnotationStroke(
              id: 'hidden-export-stroke',
              pageNumber: 1,
              tool: SheetAnnotationTool.pen,
              color: 0xffd32f2f,
              width: 3,
              points: const <SheetAnnotationPoint>[
                SheetAnnotationPoint(x: 0.5, y: 0.5),
                SheetAnnotationPoint(x: 0.6, y: 0.6),
              ],
              createdAt: now.add(const Duration(seconds: 2)),
              layerId: 'private',
            ),
          ],
          texts: <SheetTextAnnotation>[
            SheetTextAnnotation(
              id: 'teacher-text',
              pageNumber: 1,
              position: const SheetAnnotationPoint(x: 0.4, y: 0.3),
              text: 'Cue',
              color: 0xff111111,
              fontSize: 14,
              createdAt: now,
              layerId: 'teacher',
            ),
          ],
          layers: <SheetAnnotationDisplayLayer>[
            SheetAnnotationDisplayLayer.defaultLayer.copyWith(
              includeInExport: false,
            ),
            const SheetAnnotationDisplayLayer(id: 'teacher', label: 'Teacher'),
            const SheetAnnotationDisplayLayer(
              id: 'private',
              label: 'Private',
              includeInExport: false,
            ),
          ],
        ),
      );

      final result = await SheetAnnotatedPdfExporter.createAnnotatedCopy(
        score: score,
        outputPath: outputPath,
      );

      expect(result.didWrite, isTrue);
      expect(result.strokeCount, 1);
      expect(result.textCount, 1);
      expect(result.exportedTextCount, 1);
      expect(await File(outputPath).exists(), isTrue);
    },
  );

  test('creates editable standard PDF annotation objects', () async {
    final input = File('test-fixtures/pdfs/short-score.pdf');
    final originalBytes = await input.readAsBytes();
    final outputDir = await Directory.systemTemp.createTemp(
      'clef-standard-annotation-export-',
    );
    addTearDown(() async {
      if (outputDir.existsSync()) {
        await outputDir.delete(recursive: true);
      }
    });
    final outputPath = '${outputDir.path}/short-score-editable.pdf';
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
          SheetAnnotationStroke(
            id: 'arrow-1',
            pageNumber: 1,
            tool: SheetAnnotationTool.arrow,
            color: 0xff111111,
            width: 3,
            points: const <SheetAnnotationPoint>[
              SheetAnnotationPoint(x: 0.2, y: 0.8),
              SheetAnnotationPoint(x: 0.4, y: 0.65),
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

    final result = await SheetAnnotatedPdfExporter.createAnnotatedCopy(
      score: score,
      outputPath: outputPath,
      mode: SheetPdfAnnotationExportMode.standardAnnotation,
    );
    final exported = PdfDocument.open(await File(outputPath).readAsBytes());
    final subtypes = exported
        .page(0)
        .annotations
        .map((annotation) => annotation.subtype)
        .toList(growable: false);
    final inspection =
        await SheetAnnotatedPdfExporter.inspectStandardAnnotationCopy(
          outputPath,
        );

    expect(
      SheetAnnotatedPdfExporter.supportsStandardAnnotationEmbedding,
      isTrue,
    );
    expect(result.didWrite, isTrue);
    expect(result.requestedStandardAnnotationEmbedding, isTrue);
    expect(result.strokeCount, 3);
    expect(result.textCount, 1);
    expect(result.exportedTextCount, 1);
    expect(result.skippedUnicodeTextCount, 0);
    expect(subtypes, contains('Ink'));
    expect(subtypes, contains('Line'));
    expect(subtypes, contains('Square'));
    expect(subtypes, contains('FreeText'));
    expect(inspection.pageCount, 3);
    expect(inspection.clefAnnotationCount, 4);
    expect(inspection.isLocallyInspectableEditableFixture, isTrue);
    expect(inspection.containsClefSubtype('Ink'), isTrue);
    expect(inspection.containsClefSubtype('Line'), isTrue);
    expect(inspection.containsClefSubtype('Square'), isTrue);
    expect(inspection.containsClefSubtype('FreeText'), isTrue);
    expect(inspection.missingGeneratedAppearanceNames, isEmpty);
    expect(
      inspection.clefAnnotationNames,
      containsAll(<String>[
        'clef-stroke-1',
        'clef-arrow-1',
        'clef-rect-1',
        'clef-text-1',
      ]),
    );
    expect(await input.readAsBytes(), originalBytes);
  });

  test('writes Unicode FreeText in standard annotation mode', () async {
    final input = File('test-fixtures/pdfs/short-score.pdf');
    final outputDir = await Directory.systemTemp.createTemp(
      'clef-standard-unicode-annotation-export-',
    );
    addTearDown(() async {
      if (outputDir.existsSync()) {
        await outputDir.delete(recursive: true);
      }
    });
    final outputPath = '${outputDir.path}/short-score-editable.pdf';
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
      outputPath: outputPath,
      mode: SheetPdfAnnotationExportMode.standardAnnotation,
    );
    final exported = PdfDocument.open(await File(outputPath).readAsBytes());
    final annotations = exported.page(0).annotations;
    final inspection =
        await SheetAnnotatedPdfExporter.inspectStandardAnnotationCopy(
          outputPath,
        );

    expect(result.didWrite, isTrue);
    expect(result.textCount, 1);
    expect(result.exportedTextCount, 1);
    expect(result.skippedUnicodeTextCount, 0);
    expect(
      annotations.map((annotation) => annotation.subtype),
      contains('FreeText'),
    );
    expect(
      annotations.any((annotation) => annotation.contents == '숨 크게'),
      isTrue,
    );
    expect(inspection.clefAnnotationContents, contains('숨 크게'));
    expect(inspection.hasUnicodeFreeTextContents, isTrue);
    expect(inspection.unicodeFreeTextContents, contains('숨 크게'));
    expect(inspection.isLocallyInspectableEditableFixture, isTrue);
  });

  test(
    'writes text and icon stamps as standard FreeText annotations',
    () async {
      final input = File('test-fixtures/pdfs/short-score.pdf');
      final outputDir = await Directory.systemTemp.createTemp(
        'clef-standard-text-stamp-export-',
      );
      addTearDown(() async {
        if (outputDir.existsSync()) {
          await outputDir.delete(recursive: true);
        }
      });
      final outputPath = '${outputDir.path}/short-score-text-stamps.pdf';
      final now = DateTime.parse('2026-10-13T10:00:00.000');
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
              id: 'built-in-coda',
              pageNumber: 1,
              position: const SheetAnnotationPoint(x: 0.2, y: 0.3),
              text: 'Coda',
              color: 0xff111111,
              fontSize: 18,
              createdAt: now,
            ),
            SheetTextAnnotation(
              id: 'user-text-cue',
              pageNumber: 1,
              position: const SheetAnnotationPoint(x: 0.3, y: 0.4),
              text: '숨 크게',
              color: 0xff1d5fd1,
              fontSize: 18,
              createdAt: now.add(const Duration(seconds: 1)),
              stampKind: SheetAnnotationUserStamp.textKind,
            ),
            SheetTextAnnotation(
              id: 'user-icon-note',
              pageNumber: 1,
              position: const SheetAnnotationPoint(x: 0.4, y: 0.5),
              text: '♪',
              color: 0xffd32f2f,
              fontSize: 20,
              createdAt: now.add(const Duration(seconds: 2)),
              stampKind: SheetAnnotationUserStamp.iconKind,
            ),
          ],
        ),
      );

      final result = await SheetAnnotatedPdfExporter.createAnnotatedCopy(
        score: score,
        outputPath: outputPath,
        mode: SheetPdfAnnotationExportMode.standardAnnotation,
      );
      final exported = PdfDocument.open(await File(outputPath).readAsBytes());
      final inspection =
          await SheetAnnotatedPdfExporter.inspectStandardAnnotationCopy(
            outputPath,
          );

      expect(result.didWrite, isTrue);
      expect(result.textCount, 3);
      expect(result.exportedTextCount, 3);
      expect(
        exported.page(0).annotations.map((annotation) => annotation.subtype),
        everyElement('FreeText'),
      );
      expect(inspection.clefAnnotationCount, 3);
      expect(inspection.containsClefSubtype('FreeText'), isTrue);
      expect(inspection.clefAnnotationContents, contains('Coda'));
      expect(inspection.clefAnnotationContents, contains('숨 크게'));
      expect(inspection.clefAnnotationContents, contains('♪'));
      expect(inspection.isLocallyInspectableEditableFixture, isTrue);
    },
  );

  test('writes standard hairpin annotations as editable lines', () async {
    final input = File('test-fixtures/pdfs/short-score.pdf');
    final outputDir = await Directory.systemTemp.createTemp(
      'clef-standard-hairpin-export-',
    );
    addTearDown(() async {
      if (outputDir.existsSync()) {
        await outputDir.delete(recursive: true);
      }
    });
    final outputPath = '${outputDir.path}/short-score-hairpin.pdf';
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
            id: 'hairpin-1',
            pageNumber: 1,
            tool: SheetAnnotationTool.crescendo,
            color: 0xff111111,
            width: 3,
            points: const <SheetAnnotationPoint>[
              SheetAnnotationPoint(x: 0.2, y: 0.7),
              SheetAnnotationPoint(x: 0.6, y: 0.7),
            ],
            createdAt: now,
          ),
        ],
      ),
    );

    final result = await SheetAnnotatedPdfExporter.createAnnotatedCopy(
      score: score,
      outputPath: outputPath,
      mode: SheetPdfAnnotationExportMode.standardAnnotation,
    );
    final exported = PdfDocument.open(await File(outputPath).readAsBytes());
    final inspection =
        await SheetAnnotatedPdfExporter.inspectStandardAnnotationCopy(
          outputPath,
        );

    expect(result.didWrite, isTrue);
    expect(exported.page(0).annotations, hasLength(2));
    expect(
      exported.page(0).annotations.map((annotation) => annotation.subtype),
      everyElement('Line'),
    );
    expect(inspection.clefAnnotationCount, 2);
    expect(inspection.containsClefSubtype('Line'), isTrue);
    expect(inspection.isLocallyInspectableEditableFixture, isTrue);
  });

  test(
    'writes standard staff and grid annotations as editable lines',
    () async {
      final input = File('test-fixtures/pdfs/short-score.pdf');
      final outputDir = await Directory.systemTemp.createTemp(
        'clef-standard-guide-export-',
      );
      addTearDown(() async {
        if (outputDir.existsSync()) {
          await outputDir.delete(recursive: true);
        }
      });
      final outputPath = '${outputDir.path}/short-score-guides.pdf';
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
              id: 'staff-1',
              pageNumber: 1,
              tool: SheetAnnotationTool.staff,
              color: 0xff111111,
              width: 3,
              points: const <SheetAnnotationPoint>[
                SheetAnnotationPoint(x: 0.2, y: 0.2),
                SheetAnnotationPoint(x: 0.7, y: 0.35),
              ],
              createdAt: now,
            ),
            SheetAnnotationStroke(
              id: 'grid-1',
              pageNumber: 1,
              tool: SheetAnnotationTool.grid,
              color: 0xff1d5fd1,
              width: 2,
              points: const <SheetAnnotationPoint>[
                SheetAnnotationPoint(x: 0.25, y: 0.45),
                SheetAnnotationPoint(x: 0.65, y: 0.7),
              ],
              createdAt: now.add(const Duration(seconds: 1)),
            ),
          ],
        ),
      );

      final result = await SheetAnnotatedPdfExporter.createAnnotatedCopy(
        score: score,
        outputPath: outputPath,
        mode: SheetPdfAnnotationExportMode.standardAnnotation,
      );
      final exported = PdfDocument.open(await File(outputPath).readAsBytes());
      final annotations = exported.page(0).annotations;
      final inspection =
          await SheetAnnotatedPdfExporter.inspectStandardAnnotationCopy(
            outputPath,
          );

      expect(result.didWrite, isTrue);
      expect(annotations, hasLength(15));
      expect(
        annotations.map((annotation) => annotation.subtype),
        everyElement('Line'),
      );
      expect(inspection.clefAnnotationCount, 15);
      expect(inspection.containsClefSubtype('Line'), isTrue);
      expect(inspection.clefAnnotationContents, contains('staff'));
      expect(inspection.clefAnnotationContents, contains('grid'));
      expect(inspection.isLocallyInspectableEditableFixture, isTrue);
    },
  );

  test(
    'writes standard image stamp annotations when asset bytes are available',
    () async {
      final input = File('test-fixtures/pdfs/short-score.pdf');
      final outputDir = await Directory.systemTemp.createTemp(
        'clef-standard-image-stamp-export-',
      );
      addTearDown(() async {
        if (outputDir.existsSync()) {
          await outputDir.delete(recursive: true);
        }
      });
      final outputPath =
          '${outputDir.path}/short-score-standard-image-stamp.pdf';
      final pngBytes = image.encodePng(image.Image(width: 8, height: 8));
      final now = DateTime.parse('2026-10-08T10:00:00.000');
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
              id: 'image-stamp-1',
              pageNumber: 1,
              position: const SheetAnnotationPoint(x: 0.3, y: 0.3),
              text: 'Cue photo',
              color: 0xff111111,
              fontSize: 18,
              createdAt: now,
              stampKind: SheetAnnotationUserStamp.imageKind,
              stampAssetRef: 'stamps/user/cue-photo.png',
            ),
          ],
        ),
      );

      final result = await SheetAnnotatedPdfExporter.createAnnotatedCopy(
        score: score,
        outputPath: outputPath,
        mode: SheetPdfAnnotationExportMode.standardAnnotation,
        readImageStampAssetBytes: (assetRef) async =>
            assetRef == 'stamps/user/cue-photo.png' ? pngBytes : null,
      );
      final exported = PdfDocument.open(await File(outputPath).readAsBytes());
      final annotation = exported.page(0).annotations.single;
      final inspection =
          await SheetAnnotatedPdfExporter.inspectStandardAnnotationCopy(
            outputPath,
          );

      expect(result.didWrite, isTrue);
      expect(result.textCount, 1);
      expect(result.exportedTextCount, 1);
      expect(annotation.subtype, 'Stamp');
      expect(annotation.isImageStamp, isTrue);
      expect(inspection.clefAnnotationCount, 1);
      expect(inspection.containsClefSubtype('Stamp'), isTrue);
      expect(inspection.isLocallyInspectableEditableFixture, isTrue);
    },
  );

  test(
    'writes standard WebP image stamp annotations as PDF image stamps',
    () async {
      final input = File('test-fixtures/pdfs/short-score.pdf');
      final outputDir = await Directory.systemTemp.createTemp(
        'clef-standard-webp-image-stamp-export-',
      );
      addTearDown(() async {
        if (outputDir.existsSync()) {
          await outputDir.delete(recursive: true);
        }
      });
      final outputPath =
          '${outputDir.path}/short-score-standard-webp-image-stamp.pdf';
      final webpImage = image.Image(width: 10, height: 8)
        ..clear(image.ColorRgb8(60, 120, 210));
      final webpBytes = image.encodeWebP(webpImage);
      final now = DateTime.parse('2026-10-13T12:30:00.000');
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
              id: 'image-stamp-webp',
              pageNumber: 1,
              position: const SheetAnnotationPoint(x: 0.3, y: 0.3),
              text: 'WebP stamp',
              color: 0xff111111,
              fontSize: 18,
              createdAt: now,
              stampKind: SheetAnnotationUserStamp.imageKind,
              stampAssetRef: 'stamps/user/webp-stamp.webp',
            ),
          ],
        ),
      );

      final result = await SheetAnnotatedPdfExporter.createAnnotatedCopy(
        score: score,
        outputPath: outputPath,
        mode: SheetPdfAnnotationExportMode.standardAnnotation,
        readImageStampAssetBytes: (assetRef) async =>
            assetRef == 'stamps/user/webp-stamp.webp' ? webpBytes : null,
      );
      final exported = PdfDocument.open(await File(outputPath).readAsBytes());
      final annotation = exported.page(0).annotations.single;
      final inspection =
          await SheetAnnotatedPdfExporter.inspectStandardAnnotationCopy(
            outputPath,
          );

      expect(result.didWrite, isTrue);
      expect(result.textCount, 1);
      expect(result.exportedTextCount, 1);
      expect(annotation.subtype, 'Stamp');
      expect(annotation.isImageStamp, isTrue);
      expect(inspection.clefAnnotationCount, 1);
      expect(inspection.containsClefSubtype('Stamp'), isTrue);
      expect(inspection.isLocallyInspectableEditableFixture, isTrue);
    },
  );

  test(
    'does not write standard image stamp annotations without embeddable bytes',
    () async {
      final input = File('test-fixtures/pdfs/short-score.pdf');
      final outputDir = await Directory.systemTemp.createTemp(
        'clef-standard-missing-image-stamp-export-',
      );
      addTearDown(() async {
        if (outputDir.existsSync()) {
          await outputDir.delete(recursive: true);
        }
      });
      final outputPath =
          '${outputDir.path}/short-score-standard-missing-image-stamp.pdf';
      final now = DateTime.parse('2026-10-13T12:00:00.000');
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
              id: 'image-stamp-corrupt',
              pageNumber: 1,
              position: const SheetAnnotationPoint(x: 0.3, y: 0.3),
              text: 'Corrupt stamp',
              color: 0xff111111,
              fontSize: 18,
              createdAt: now,
              stampKind: SheetAnnotationUserStamp.imageKind,
              stampAssetRef: 'stamps/user/corrupt-stamp.png',
            ),
          ],
        ),
      );

      final result = await SheetAnnotatedPdfExporter.createAnnotatedCopy(
        score: score,
        outputPath: outputPath,
        mode: SheetPdfAnnotationExportMode.standardAnnotation,
        readImageStampAssetBytes: (_) async => <int>[0, 1, 2, 3],
      );

      expect(result.didWrite, isFalse);
      expect(result.outputPath, isNull);
      expect(result.textCount, 1);
      expect(result.exportedTextCount, 0);
      expect(
        result.failureReason,
        SheetAnnotatedPdfExportResult
            .standardAnnotationObjectMappingUnavailableReason,
      );
      expect(result.hasUnsupportedStandardAnnotationObjectMapping, isTrue);
      expect(await File(outputPath).exists(), isFalse);
    },
  );

  test('writes a mixed editable annotation compatibility fixture', () async {
    final input = File('test-fixtures/pdfs/short-score.pdf');
    final outputDir = await Directory.systemTemp.createTemp(
      'clef-standard-compatibility-fixture-',
    );
    addTearDown(() async {
      if (outputDir.existsSync()) {
        await outputDir.delete(recursive: true);
      }
    });
    final outputPath =
        '${outputDir.path}/clef-editable-annotation-compatibility.pdf';
    final pngBytes = image.encodePng(image.Image(width: 12, height: 12));
    final now = DateTime.parse('2026-10-13T11:00:00.000');
    final score = SheetScore(
      id: 'score-1',
      title: 'Compatibility Fixture',
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
          _stroke(
            'compat-pen',
            SheetAnnotationTool.pen,
            const <SheetAnnotationPoint>[
              SheetAnnotationPoint(x: 0.12, y: 0.18),
              SheetAnnotationPoint(x: 0.20, y: 0.24),
              SheetAnnotationPoint(x: 0.31, y: 0.20),
            ],
            now,
          ),
          _stroke(
            'compat-highlighter',
            SheetAnnotationTool.highlighter,
            const <SheetAnnotationPoint>[
              SheetAnnotationPoint(x: 0.15, y: 0.33),
              SheetAnnotationPoint(x: 0.45, y: 0.33),
            ],
            now.add(const Duration(seconds: 1)),
          ),
          _stroke(
            'compat-line',
            SheetAnnotationTool.line,
            const <SheetAnnotationPoint>[
              SheetAnnotationPoint(x: 0.55, y: 0.18),
              SheetAnnotationPoint(x: 0.80, y: 0.23),
            ],
            now.add(const Duration(seconds: 2)),
          ),
          _stroke(
            'compat-arrow',
            SheetAnnotationTool.arrow,
            const <SheetAnnotationPoint>[
              SheetAnnotationPoint(x: 0.55, y: 0.33),
              SheetAnnotationPoint(x: 0.82, y: 0.29),
            ],
            now.add(const Duration(seconds: 3)),
          ),
          _stroke(
            'compat-square',
            SheetAnnotationTool.rectangle,
            const <SheetAnnotationPoint>[
              SheetAnnotationPoint(x: 0.12, y: 0.46),
              SheetAnnotationPoint(x: 0.34, y: 0.58),
            ],
            now.add(const Duration(seconds: 4)),
          ),
          _stroke(
            'compat-crescendo',
            SheetAnnotationTool.crescendo,
            const <SheetAnnotationPoint>[
              SheetAnnotationPoint(x: 0.46, y: 0.50),
              SheetAnnotationPoint(x: 0.72, y: 0.50),
            ],
            now.add(const Duration(seconds: 5)),
          ),
          _stroke(
            'compat-diminuendo',
            SheetAnnotationTool.diminuendo,
            const <SheetAnnotationPoint>[
              SheetAnnotationPoint(x: 0.46, y: 0.58),
              SheetAnnotationPoint(x: 0.72, y: 0.58),
            ],
            now.add(const Duration(seconds: 6)),
          ),
          _stroke(
            'compat-staff',
            SheetAnnotationTool.staff,
            const <SheetAnnotationPoint>[
              SheetAnnotationPoint(x: 0.10, y: 0.68),
              SheetAnnotationPoint(x: 0.42, y: 0.77),
            ],
            now.add(const Duration(seconds: 7)),
          ),
          _stroke(
            'compat-grid',
            SheetAnnotationTool.grid,
            const <SheetAnnotationPoint>[
              SheetAnnotationPoint(x: 0.52, y: 0.66),
              SheetAnnotationPoint(x: 0.84, y: 0.81),
            ],
            now.add(const Duration(seconds: 8)),
          ),
        ],
        texts: <SheetTextAnnotation>[
          SheetTextAnnotation(
            id: 'compat-free-text',
            pageNumber: 1,
            position: const SheetAnnotationPoint(x: 0.12, y: 0.86),
            text: 'Cue',
            color: 0xff111111,
            fontSize: 16,
            createdAt: now.add(const Duration(seconds: 9)),
          ),
          SheetTextAnnotation(
            id: 'compat-text-stamp',
            pageNumber: 1,
            position: const SheetAnnotationPoint(x: 0.32, y: 0.86),
            text: '숨 크게',
            color: 0xff0d47a1,
            fontSize: 16,
            createdAt: now.add(const Duration(seconds: 10)),
            stampKind: SheetAnnotationUserStamp.textKind,
          ),
          SheetTextAnnotation(
            id: 'compat-icon-stamp',
            pageNumber: 1,
            position: const SheetAnnotationPoint(x: 0.55, y: 0.86),
            text: '♪',
            color: 0xffd32f2f,
            fontSize: 18,
            createdAt: now.add(const Duration(seconds: 11)),
            stampKind: SheetAnnotationUserStamp.iconKind,
          ),
          SheetTextAnnotation(
            id: 'compat-image-stamp',
            pageNumber: 1,
            position: const SheetAnnotationPoint(x: 0.75, y: 0.87),
            text: 'Image stamp',
            color: 0xff111111,
            fontSize: 16,
            createdAt: now.add(const Duration(seconds: 12)),
            stampKind: SheetAnnotationUserStamp.imageKind,
            stampAssetRef: 'stamps/compatibility/cue-photo.png',
          ),
        ],
      ),
    );

    final result = await SheetAnnotatedPdfExporter.createAnnotatedCopy(
      score: score,
      outputPath: outputPath,
      mode: SheetPdfAnnotationExportMode.standardAnnotation,
      readImageStampAssetBytes: (assetRef) async =>
          assetRef == 'stamps/compatibility/cue-photo.png' ? pngBytes : null,
    );
    final inspection =
        await SheetAnnotatedPdfExporter.inspectStandardAnnotationCopy(
          outputPath,
        );

    expect(result.didWrite, isTrue);
    expect(inspection.clefAnnotationCount, 28);
    expect(inspection.clefSubtypeCounts['Ink'], 2);
    expect(inspection.clefSubtypeCounts['Line'], 21);
    expect(inspection.clefSubtypeCounts['Square'], 1);
    expect(inspection.clefSubtypeCounts['FreeText'], 3);
    expect(inspection.clefSubtypeCounts['Stamp'], 1);
    expect(inspection.clefAnnotationContents, contains('숨 크게'));
    expect(inspection.clefAnnotationContents, contains('♪'));
    expect(inspection.hasUnicodeFreeTextContents, isTrue);
    expect(
      inspection.unicodeFreeTextContents,
      containsAll(<String>['숨 크게', '♪']),
    );
    expect(inspection.isLocallyInspectableEditableFixture, isTrue);
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

  test('writes fallback PDF while skipping Unicode text annotations', () async {
    final input = File('test-fixtures/pdfs/short-score.pdf');
    final originalBytes = await input.readAsBytes();
    final outputDir = await Directory.systemTemp.createTemp(
      'clef-annotated-export-mixed-unicode-',
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
        texts: <SheetTextAnnotation>[
          SheetTextAnnotation(
            id: 'text-ascii',
            pageNumber: 1,
            position: const SheetAnnotationPoint(x: 0.3, y: 0.3),
            text: 'Cue',
            color: 0xff111111,
            fontSize: 14,
            createdAt: now,
          ),
          SheetTextAnnotation(
            id: 'text-kr',
            pageNumber: 1,
            position: const SheetAnnotationPoint(x: 0.3, y: 0.4),
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
      outputPath: outputPath,
    );
    final exported = PdfDocument.open(await File(outputPath).readAsBytes());

    expect(result.didWrite, isTrue);
    expect(result.mode, SheetPdfAnnotationExportMode.renderedStamp);
    expect(result.strokeCount, 1);
    expect(result.textCount, 2);
    expect(result.exportedTextCount, 1);
    expect(result.skippedUnicodeTextCount, 1);
    expect(result.requiresUnicodeFontEmbedding, isFalse);
    expect(exported.pageCount, 3);
    expect(await input.readAsBytes(), originalBytes);
  });
}

SheetAnnotationStroke _stroke(
  String id,
  SheetAnnotationTool tool,
  List<SheetAnnotationPoint> points,
  DateTime createdAt,
) {
  return SheetAnnotationStroke(
    id: id,
    pageNumber: 1,
    tool: tool,
    color: 0xff111111,
    width: tool == SheetAnnotationTool.highlighter ? 10 : 3,
    points: points,
    createdAt: createdAt,
  );
}
