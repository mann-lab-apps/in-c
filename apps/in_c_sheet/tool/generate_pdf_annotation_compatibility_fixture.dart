import 'dart:io';

import 'package:image/image.dart' as image;
import 'package:in_c_sheet/sheet_annotated_pdf_exporter.dart';
import 'package:in_c_sheet/sheet_annotation.dart';
import 'package:in_c_sheet/sheet_pdf_annotation_compatibility_report.dart';
import 'package:in_c_sheet/sheet_score.dart';

Future<void> main(List<String> args) async {
  final reviewReportPath = _valueAfter(args, '--review-report');
  if (reviewReportPath != null) {
    await _reviewReport(reviewReportPath);
    return;
  }

  final input = File(_valueAfter(args, '--input') ?? _defaultInputPath);
  final outputPath = _valueAfter(args, '--output') ?? _defaultOutputPath;
  final reportPath = _valueAfter(args, '--report') ?? _defaultReportPath;
  final output = File(outputPath);
  if (!input.existsSync()) {
    stderr.writeln('Input PDF not found: ${input.path}');
    exitCode = 64;
    return;
  }
  output.parent.createSync(recursive: true);

  final pngBytes = image.encodePng(image.Image(width: 24, height: 24));
  final webpBytes = image.encodeWebP(
    image.Image(width: 24, height: 18)..clear(image.ColorRgb8(60, 120, 210)),
  );
  final score = _compatibilityScore(input.path);
  final result = await SheetAnnotatedPdfExporter.createAnnotatedCopy(
    score: score,
    outputPath: output.path,
    mode: SheetPdfAnnotationExportMode.standardAnnotation,
    readImageStampAssetBytes: (assetRef) async {
      if (assetRef == _pngImageStampAssetRef) {
        return pngBytes;
      }
      if (assetRef == _webpImageStampAssetRef) {
        return webpBytes;
      }
      return null;
    },
  );
  if (!result.didWrite) {
    stderr.writeln(
      'Could not generate editable annotation fixture: '
      '${result.failureReason ?? 'unknown failure'}',
    );
    exitCode = 1;
    return;
  }

  final inspection =
      await SheetAnnotatedPdfExporter.inspectStandardAnnotationCopy(
        output.path,
      );
  if (!inspection.isLocallyInspectableEditableFixture ||
      !_containsRequiredSubtypes(inspection)) {
    stderr.writeln('Generated fixture failed local PDF inspection.');
    stderr.writeln('Subtype counts: ${inspection.clefSubtypeCounts}');
    stderr.writeln(
      'Missing AP names: ${inspection.missingGeneratedAppearanceNames}',
    );
    exitCode = 1;
    return;
  }

  stdout
    ..writeln('Generated Clef editable annotation compatibility fixture:')
    ..writeln(output.absolute.path)
    ..writeln('Pages: ${inspection.pageCount}')
    ..writeln('Clef annotations: ${inspection.clefAnnotationCount}')
    ..writeln('Subtype counts: ${inspection.clefSubtypeCounts}');
  if (inspection.hasUnicodeFreeTextContents) {
    stdout
      ..writeln(
        'Unicode FreeText contents require external render QA: '
        '${inspection.unicodeFreeTextContents}',
      )
      ..writeln(
        'Local inspection preserves contents, but generated appearances may '
        'depend on viewer font fallback.',
      );
  }
  final report = File(reportPath);
  await report.parent.create(recursive: true);
  await report.writeAsString(
    SheetPdfAnnotationCompatibilityReportTemplate.markdown(
      fixturePath: output.absolute.path,
      inspection: inspection,
    ),
  );
  stdout
    ..writeln('Manual QA report template:')
    ..writeln(report.absolute.path)
    ..writeln('Manual viewer QA:')
    ..writeln('- Acrobat')
    ..writeln('- macOS Preview')
    ..writeln('- MobileSheets')
    ..writeln('- Piascore');
}

Future<void> _reviewReport(String reportPath) async {
  final report = File(reportPath);
  if (!report.existsSync()) {
    stderr.writeln('Compatibility report not found: ${report.path}');
    exitCode = 64;
    return;
  }
  final entries = SheetPdfAnnotationCompatibilityReportParser.parseViewerMatrix(
    await report.readAsString(),
  );
  final gate = SheetPdfViewerCompatibilityGate.review(entries: entries);
  stdout.writeln(gate.markdownSummary());
  if (!gate.canClaimExternalCompatibility) {
    exitCode = 2;
  }
}

const _defaultInputPath = 'test-fixtures/pdfs/short-score.pdf';
const _defaultOutputPath =
    '.dart_tool/clef-pdf-compatibility/'
    'clef-editable-annotation-compatibility.pdf';
const _defaultReportPath =
    '.dart_tool/clef-pdf-compatibility/'
    'clef-editable-annotation-compatibility-report.md';
const _pngImageStampAssetRef = 'stamps/compatibility/cue-photo.png';
const _webpImageStampAssetRef = 'stamps/compatibility/webp-cue.webp';

bool _containsRequiredSubtypes(
  SheetStandardPdfAnnotationInspection inspection,
) {
  return inspection.containsClefSubtype('Ink') &&
      inspection.containsClefSubtype('Line') &&
      inspection.containsClefSubtype('Square') &&
      inspection.containsClefSubtype('FreeText') &&
      inspection.containsClefSubtype('Stamp');
}

String? _valueAfter(List<String> args, String flag) {
  final index = args.indexOf(flag);
  if (index < 0 || index + 1 >= args.length) {
    return null;
  }
  final value = args[index + 1].trim();
  return value.isEmpty ? null : value;
}

SheetScore _compatibilityScore(String inputPath) {
  final now = DateTime.parse('2026-10-13T11:00:00.000');
  return SheetScore(
    id: 'pdf-annotation-compatibility',
    title: 'Clef Editable Annotation Compatibility',
    composer: '',
    tags: const <String>['qa', 'pdf-export'],
    note:
        'Local generated fixture for Acrobat, Preview, MobileSheets and '
        'Piascore manual compatibility checks.',
    filePath: inputPath,
    importedAt: now,
    updatedAt: now,
    lastOpenedAt: null,
    lastPage: 1,
    isFavorite: false,
    bookmarks: const <SheetBookmark>[],
    annotationLayer: SheetAnnotationLayer(
      strokes: <SheetAnnotationStroke>[
        _stroke(
          id: 'compat-pen',
          tool: SheetAnnotationTool.pen,
          color: 0xffd32f2f,
          width: 3,
          points: const <SheetAnnotationPoint>[
            SheetAnnotationPoint(x: 0.12, y: 0.18),
            SheetAnnotationPoint(x: 0.20, y: 0.24),
            SheetAnnotationPoint(x: 0.31, y: 0.20),
          ],
          createdAt: now,
        ),
        _stroke(
          id: 'compat-highlighter',
          tool: SheetAnnotationTool.highlighter,
          color: 0xffffc107,
          width: 10,
          points: const <SheetAnnotationPoint>[
            SheetAnnotationPoint(x: 0.15, y: 0.33),
            SheetAnnotationPoint(x: 0.45, y: 0.33),
          ],
          createdAt: now.add(const Duration(seconds: 1)),
        ),
        _stroke(
          id: 'compat-line',
          tool: SheetAnnotationTool.line,
          color: 0xff111111,
          width: 3,
          points: const <SheetAnnotationPoint>[
            SheetAnnotationPoint(x: 0.55, y: 0.18),
            SheetAnnotationPoint(x: 0.80, y: 0.23),
          ],
          createdAt: now.add(const Duration(seconds: 2)),
        ),
        _stroke(
          id: 'compat-arrow',
          tool: SheetAnnotationTool.arrow,
          color: 0xff1d5fd1,
          width: 3,
          points: const <SheetAnnotationPoint>[
            SheetAnnotationPoint(x: 0.55, y: 0.33),
            SheetAnnotationPoint(x: 0.82, y: 0.29),
          ],
          createdAt: now.add(const Duration(seconds: 3)),
        ),
        _stroke(
          id: 'compat-square',
          tool: SheetAnnotationTool.rectangle,
          color: 0xff00796b,
          width: 3,
          points: const <SheetAnnotationPoint>[
            SheetAnnotationPoint(x: 0.12, y: 0.46),
            SheetAnnotationPoint(x: 0.34, y: 0.58),
          ],
          createdAt: now.add(const Duration(seconds: 4)),
        ),
        _stroke(
          id: 'compat-crescendo',
          tool: SheetAnnotationTool.crescendo,
          color: 0xff111111,
          width: 3,
          points: const <SheetAnnotationPoint>[
            SheetAnnotationPoint(x: 0.46, y: 0.50),
            SheetAnnotationPoint(x: 0.72, y: 0.50),
          ],
          createdAt: now.add(const Duration(seconds: 5)),
        ),
        _stroke(
          id: 'compat-diminuendo',
          tool: SheetAnnotationTool.diminuendo,
          color: 0xff111111,
          width: 3,
          points: const <SheetAnnotationPoint>[
            SheetAnnotationPoint(x: 0.46, y: 0.58),
            SheetAnnotationPoint(x: 0.72, y: 0.58),
          ],
          createdAt: now.add(const Duration(seconds: 6)),
        ),
        _stroke(
          id: 'compat-staff',
          tool: SheetAnnotationTool.staff,
          color: 0xff5d4037,
          width: 2,
          points: const <SheetAnnotationPoint>[
            SheetAnnotationPoint(x: 0.10, y: 0.68),
            SheetAnnotationPoint(x: 0.42, y: 0.77),
          ],
          createdAt: now.add(const Duration(seconds: 7)),
        ),
        _stroke(
          id: 'compat-grid',
          tool: SheetAnnotationTool.grid,
          color: 0xff6a1b9a,
          width: 2,
          points: const <SheetAnnotationPoint>[
            SheetAnnotationPoint(x: 0.52, y: 0.66),
            SheetAnnotationPoint(x: 0.84, y: 0.81),
          ],
          createdAt: now.add(const Duration(seconds: 8)),
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
          id: 'compat-png-image-stamp',
          pageNumber: 1,
          position: const SheetAnnotationPoint(x: 0.72, y: 0.87),
          text: 'PNG stamp',
          color: 0xff111111,
          fontSize: 16,
          createdAt: now.add(const Duration(seconds: 12)),
          stampKind: SheetAnnotationUserStamp.imageKind,
          stampAssetRef: _pngImageStampAssetRef,
        ),
        SheetTextAnnotation(
          id: 'compat-webp-image-stamp',
          pageNumber: 1,
          position: const SheetAnnotationPoint(x: 0.84, y: 0.87),
          text: 'WebP stamp',
          color: 0xff111111,
          fontSize: 16,
          createdAt: now.add(const Duration(seconds: 13)),
          stampKind: SheetAnnotationUserStamp.imageKind,
          stampAssetRef: _webpImageStampAssetRef,
        ),
      ],
    ),
  );
}

SheetAnnotationStroke _stroke({
  required String id,
  required SheetAnnotationTool tool,
  required int color,
  required double width,
  required List<SheetAnnotationPoint> points,
  required DateTime createdAt,
}) {
  return SheetAnnotationStroke(
    id: id,
    pageNumber: 1,
    tool: tool,
    color: color,
    width: width,
    points: points,
    createdAt: createdAt,
  );
}
