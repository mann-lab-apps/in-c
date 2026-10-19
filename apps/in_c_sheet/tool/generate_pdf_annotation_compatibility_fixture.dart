import 'dart:io';

import 'package:archive/archive.dart';
import 'package:crypto/crypto.dart';
import 'package:image/image.dart' as image;
import 'package:in_c_sheet/sheet_annotated_pdf_exporter.dart';
import 'package:in_c_sheet/sheet_annotation.dart';
import 'package:in_c_sheet/sheet_pdf_annotation_compatibility_report.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:pdf_cos/pdf_cos.dart';
import 'package:pdf_document/pdf_document.dart';

Future<void> main(List<String> args) async {
  final reviewReportPath = _valueAfter(args, '--review-report');
  if (reviewReportPath != null) {
    await _reviewReport(reviewReportPath);
    return;
  }

  final input = File(_valueAfter(args, '--input') ?? _defaultInputPath);
  final outputPath = _valueAfter(args, '--output') ?? _defaultOutputPath;
  final unicodeOutputPath =
      _valueAfter(args, '--unicode-output') ?? _defaultUnicodeOutputPath;
  final transformedOutputPath =
      _valueAfter(args, '--transformed-output') ??
      _defaultTransformedOutputPath;
  final reportPath = _valueAfter(args, '--report') ?? _defaultReportPath;
  final bundlePath = _valueAfter(args, '--bundle') ?? _defaultBundlePath;
  final output = File(outputPath);
  final unicodeOutput = File(unicodeOutputPath);
  final transformedOutput = File(transformedOutputPath);
  if (!input.existsSync()) {
    stderr.writeln('Input PDF not found: ${input.path}');
    exitCode = 64;
    return;
  }
  output.parent.createSync(recursive: true);
  unicodeOutput.parent.createSync(recursive: true);
  transformedOutput.parent.createSync(recursive: true);

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
    stderr.writeln(
      'Duplicate names: ${inspection.duplicateClefAnnotationNames}',
    );
    stderr.writeln(
      'Out-of-page names: ${inspection.outOfPageClefAnnotationNames}',
    );
    stderr.writeln(
      'Action-bearing names: ${inspection.actionBearingClefAnnotationNames}',
    );
    stderr.writeln(
      'Non-printable names: ${inspection.nonPrintableClefAnnotationNames}',
    );
    stderr.writeln('Hidden names: ${inspection.hiddenClefAnnotationNames}');
    exitCode = 1;
    return;
  }
  final pdfAConformanceDelta =
      await SheetAnnotatedPdfExporter.inspectPdfAConformanceDelta(
        inputPath: input.path,
        outputPath: output.path,
      );
  final unicodeInspection = await _generateUnicodeAppearanceFixture(
    input: input,
    output: unicodeOutput,
  );
  if (unicodeInspection == null) {
    return;
  }
  final transformedInspection = await _generateTransformedPageFixture(
    input: input,
    output: transformedOutput,
  );
  if (transformedInspection == null) {
    return;
  }

  stdout
    ..writeln('Generated Clef editable annotation compatibility fixture:')
    ..writeln(output.absolute.path)
    ..writeln('Pages: ${inspection.pageCount}')
    ..writeln('Clef annotations: ${inspection.clefAnnotationCount}')
    ..writeln('Subtype counts: ${inspection.clefSubtypeCounts}')
    ..writeln(
      '${pdfAConformanceDelta.profile} introduced errors: '
      '${pdfAConformanceDelta.introducedErrorDescriptions}',
    )
    ..writeln(
      '${pdfAConformanceDelta.profile} introduced warnings: '
      '${pdfAConformanceDelta.introducedWarningDescriptions}',
    );
  if (inspection.hasUnicodeFreeTextContents) {
    stdout
      ..writeln(
        'Unicode FreeText contents require external render QA: '
        '${inspection.unicodeFreeTextContents}',
      )
      ..writeln(
        'Unicode FreeText annotations without embedded fonts: '
        '${inspection.unembeddedUnicodeFreeTextNames}',
      );
  }
  stdout
    ..writeln('Generated Clef Unicode FreeText appearance fixture:')
    ..writeln(unicodeOutput.absolute.path)
    ..writeln(
      'Unicode FreeText contents: '
      '${unicodeInspection.unicodeFreeTextContents}',
    )
    ..writeln(
      'Unicode FreeText annotations without embedded fonts: '
      '${unicodeInspection.unembeddedUnicodeFreeTextNames}',
    )
    ..writeln('Generated Clef rotated/cropped page fixture:')
    ..writeln(transformedOutput.absolute.path)
    ..writeln('Clef annotations: ${transformedInspection.clefAnnotationCount}');
  final report = File(reportPath);
  await report.parent.create(recursive: true);
  final outputSha256 = await _sha256Of(output);
  final unicodeOutputSha256 = await _sha256Of(unicodeOutput);
  final transformedOutputSha256 = await _sha256Of(transformedOutput);
  await report.writeAsString(
    _compatibilityReportMarkdown(
      fixturePath: output.absolute.path,
      fixtureSha256: outputSha256,
      unicodeFixturePath: unicodeOutput.absolute.path,
      unicodeFixtureSha256: unicodeOutputSha256,
      transformedFixturePath: transformedOutput.absolute.path,
      transformedFixtureSha256: transformedOutputSha256,
      inspection: inspection,
      unicodeInspection: unicodeInspection,
      pdfAConformanceDelta: pdfAConformanceDelta,
    ),
  );
  final bundle = File(bundlePath);
  await bundle.parent.create(recursive: true);
  final bundleReport = _compatibilityReportMarkdown(
    fixturePath: _bundleFixtureName,
    fixtureSha256: outputSha256,
    unicodeFixturePath: _bundleUnicodeFixtureName,
    unicodeFixtureSha256: unicodeOutputSha256,
    transformedFixturePath: _bundleTransformedFixtureName,
    transformedFixtureSha256: transformedOutputSha256,
    inspection: inspection,
    unicodeInspection: unicodeInspection,
    pdfAConformanceDelta: pdfAConformanceDelta,
  );
  final archive = Archive()
    ..addFile(ArchiveFile.bytes(_bundleFixtureName, await output.readAsBytes()))
    ..addFile(
      ArchiveFile.bytes(
        _bundleUnicodeFixtureName,
        await unicodeOutput.readAsBytes(),
      ),
    )
    ..addFile(
      ArchiveFile.bytes(
        _bundleTransformedFixtureName,
        await transformedOutput.readAsBytes(),
      ),
    )
    ..addFile(ArchiveFile.string(_bundleReportName, bundleReport));
  await bundle.writeAsBytes(ZipEncoder().encode(archive), flush: true);
  stdout
    ..writeln('Manual QA report template:')
    ..writeln(report.absolute.path)
    ..writeln('Portable QA bundle:')
    ..writeln(bundle.absolute.path)
    ..writeln('Required spike items:');
  for (final item
      in SheetAnnotatedPdfExporter
          .standardAnnotationExportCapability
          .requiredSpikeItems) {
    stdout.writeln('- $item');
  }
  stdout.writeln('Manual viewer QA:');
  for (final target
      in SheetPdfAnnotationCompatibilityReportTemplate.viewerTargets) {
    stdout.writeln('- ${target.label}');
  }
}

Future<void> _reviewReport(String reportPath) async {
  final report = File(reportPath);
  if (!report.existsSync()) {
    stderr.writeln('Compatibility report not found: ${report.path}');
    exitCode = 64;
    return;
  }
  final markdown = await report.readAsString();
  final entries = SheetPdfAnnotationCompatibilityReportParser.parseViewerMatrix(
    markdown,
  );
  final unknownViewerLabels =
      SheetPdfAnnotationCompatibilityReportParser.parseUnknownViewerLabels(
        markdown,
      );
  final invalidStatusCells =
      SheetPdfAnnotationCompatibilityReportParser.parseInvalidStatusCells(
        markdown,
      );
  final introducedPdfAFindings =
      SheetPdfAnnotationCompatibilityReportParser.parseIntroducedPdfAFindings(
        markdown,
      );
  final fixtureArtifacts =
      SheetPdfAnnotationCompatibilityReportParser.parseFixtureArtifacts(
        markdown,
      );
  final missingArtifacts = <SheetPdfCompatibilityFixtureArtifact>[];
  final mismatchedArtifacts = <String>[];
  for (final artifact in fixtureArtifacts) {
    final file = _resolveArtifactFile(report, artifact.path);
    if (!file.existsSync()) {
      missingArtifacts.add(artifact);
      continue;
    }
    final actual = await _sha256Of(file);
    if (actual != artifact.sha256) {
      mismatchedArtifacts.add(
        '${artifact.label} expected=${artifact.sha256} actual=$actual',
      );
    }
  }
  if (unknownViewerLabels.isNotEmpty) {
    stdout.writeln('- Unknown viewer rows: ${unknownViewerLabels.join(', ')}');
  }
  if (invalidStatusCells.isNotEmpty) {
    stdout.writeln(
      '- Invalid status cells: '
      '${invalidStatusCells.map((cell) => cell.summary).join(', ')}',
    );
  }
  if (introducedPdfAFindings.isNotEmpty) {
    stdout.writeln(
      '- Introduced PDF/A findings: '
      '${introducedPdfAFindings.map((finding) => finding.summary).join(' | ')}',
    );
  }
  if (missingArtifacts.isNotEmpty) {
    stdout.writeln(
      '- Missing fixture artifacts: '
      '${missingArtifacts.map((artifact) => '${artifact.label}=${artifact.path}').join(', ')}',
    );
  }
  if (mismatchedArtifacts.isNotEmpty) {
    stdout.writeln(
      '- Fixture SHA-256 mismatches: ${mismatchedArtifacts.join(' | ')}',
    );
  }
  final gate = SheetPdfViewerCompatibilityGate.review(entries: entries);
  stdout.writeln(gate.markdownSummary());
  if (unknownViewerLabels.isNotEmpty ||
      invalidStatusCells.isNotEmpty ||
      introducedPdfAFindings.isNotEmpty ||
      missingArtifacts.isNotEmpty ||
      mismatchedArtifacts.isNotEmpty ||
      !gate.canClaimExternalCompatibility) {
    exitCode = 2;
  }
}

Future<String> _sha256Of(File file) async {
  return sha256.convert(await file.readAsBytes()).toString();
}

File _resolveArtifactFile(File report, String artifactPath) {
  final isAbsolute =
      artifactPath.startsWith('/') ||
      RegExp(r'^[A-Za-z]:[\\/]').hasMatch(artifactPath);
  if (isAbsolute) {
    return File(artifactPath);
  }
  return File('${report.parent.path}${Platform.pathSeparator}$artifactPath');
}

String _compatibilityReportMarkdown({
  required String fixturePath,
  required String fixtureSha256,
  required String unicodeFixturePath,
  required String unicodeFixtureSha256,
  required String transformedFixturePath,
  required String transformedFixtureSha256,
  required SheetStandardPdfAnnotationInspection inspection,
  required SheetStandardPdfAnnotationInspection unicodeInspection,
  required SheetPdfAConformanceDelta pdfAConformanceDelta,
}) {
  return SheetPdfAnnotationCompatibilityReportTemplate.markdown(
    fixturePath: fixturePath,
    inspection: inspection,
    fixtureSha256: fixtureSha256,
    unicodeFixturePath: unicodeFixturePath,
    unicodeInspection: unicodeInspection,
    unicodeFixtureSha256: unicodeFixtureSha256,
    transformedFixturePath: transformedFixturePath,
    transformedFixtureSha256: transformedFixtureSha256,
    pdfAConformanceDelta: pdfAConformanceDelta,
  );
}

const _defaultInputPath = 'test-fixtures/pdfs/short-score.pdf';
const _defaultOutputPath =
    '.dart_tool/clef-pdf-compatibility/'
    'clef-editable-annotation-compatibility.pdf';
const _defaultUnicodeOutputPath =
    '.dart_tool/clef-pdf-compatibility/'
    'clef-unicode-freetext-appearance.pdf';
const _defaultTransformedOutputPath =
    '.dart_tool/clef-pdf-compatibility/'
    'clef-rotated-cropped-annotation-compatibility.pdf';
const _defaultReportPath =
    '.dart_tool/clef-pdf-compatibility/'
    'clef-editable-annotation-compatibility-report.md';
const _defaultBundlePath =
    '.dart_tool/clef-pdf-compatibility/'
    'clef-editable-annotation-compatibility-bundle.zip';
const _bundleFixtureName = 'clef-editable-annotation-compatibility.pdf';
const _bundleUnicodeFixtureName = 'clef-unicode-freetext-appearance.pdf';
const _bundleTransformedFixtureName =
    'clef-rotated-cropped-annotation-compatibility.pdf';
const _bundleReportName = 'clef-editable-annotation-compatibility-report.md';
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

Future<SheetStandardPdfAnnotationInspection?>
_generateUnicodeAppearanceFixture({
  required File input,
  required File output,
}) async {
  final result = await SheetAnnotatedPdfExporter.createAnnotatedCopy(
    score: _unicodeAppearanceScore(input.path),
    outputPath: output.path,
    mode: SheetPdfAnnotationExportMode.standardAnnotation,
  );
  if (!result.didWrite) {
    stderr.writeln(
      'Could not generate Unicode FreeText appearance fixture: '
      '${result.failureReason ?? 'unknown failure'}',
    );
    exitCode = 1;
    return null;
  }

  final inspection =
      await SheetAnnotatedPdfExporter.inspectStandardAnnotationCopy(
        output.path,
      );
  final freeTextCount = inspection.clefSubtypeCounts['FreeText'] ?? 0;
  if (!inspection.isLocallyInspectableEditableFixture ||
      freeTextCount < 4 ||
      inspection.unicodeFreeTextContents.length < 3) {
    stderr.writeln('Generated Unicode fixture failed local PDF inspection.');
    stderr.writeln('Subtype counts: ${inspection.clefSubtypeCounts}');
    stderr.writeln(
      'Unicode FreeText contents: ${inspection.unicodeFreeTextContents}',
    );
    stderr.writeln(
      'Unsafe annotation structure: '
      'duplicates=${inspection.duplicateClefAnnotationNames}, '
      'outOfPage=${inspection.outOfPageClefAnnotationNames}, '
      'actions=${inspection.actionBearingClefAnnotationNames}, '
      'nonPrintable=${inspection.nonPrintableClefAnnotationNames}, '
      'hidden=${inspection.hiddenClefAnnotationNames}',
    );
    exitCode = 1;
    return null;
  }
  return inspection;
}

Future<SheetStandardPdfAnnotationInspection?> _generateTransformedPageFixture({
  required File input,
  required File output,
}) async {
  final sourceDocument = PdfDocument.open(await input.readAsBytes());
  if (sourceDocument.pageCount == 0) {
    stderr.writeln('Cannot generate transformed fixture from an empty PDF.');
    exitCode = 1;
    return null;
  }
  final page = sourceDocument.page(0);
  final box = page.cropBox;
  final horizontalInset = (box.width * 0.08).clamp(12.0, 36.0).toDouble();
  final verticalInset = (box.height * 0.06).clamp(12.0, 36.0).toDouble();
  final editor = PdfEditor(sourceDocument);
  page.dict['CropBox'] = CosArray(<CosObject>[
    CosReal(box.left + horizontalInset),
    CosReal(box.bottom + verticalInset),
    CosReal(box.right - horizontalInset),
    CosReal(box.top - verticalInset),
  ]);
  editor.rotatePage(0, 90);
  final transformedSource = File('${output.path}.source.pdf');
  await transformedSource.writeAsBytes(editor.save(), flush: true);

  try {
    final result = await SheetAnnotatedPdfExporter.createAnnotatedCopy(
      score: _transformedPageScore(transformedSource.path),
      outputPath: output.path,
      mode: SheetPdfAnnotationExportMode.standardAnnotation,
    );
    if (!result.didWrite) {
      stderr.writeln(
        'Could not generate rotated/cropped fixture: '
        '${result.failureReason ?? 'unknown failure'}',
      );
      exitCode = 1;
      return null;
    }
    final outputDocument = PdfDocument.open(await output.readAsBytes());
    final outputPage = outputDocument.page(0);
    final inspection =
        await SheetAnnotatedPdfExporter.inspectStandardAnnotationCopy(
          output.path,
        );
    if (outputPage.rotation != 90 ||
        outputPage.cropBox == outputPage.mediaBox ||
        !inspection.isLocallyInspectableEditableFixture ||
        inspection.clefAnnotationCount < 5) {
      stderr.writeln(
        'Generated rotated/cropped fixture failed local inspection: '
        'rotation=${outputPage.rotation}, crop=${outputPage.cropBox}, '
        'media=${outputPage.mediaBox}, '
        'annotations=${inspection.clefAnnotationCount}',
      );
      exitCode = 1;
      return null;
    }
    return inspection;
  } finally {
    if (transformedSource.existsSync()) {
      await transformedSource.delete();
    }
  }
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
  final viewerLabels = SheetPdfAnnotationCompatibilityReportTemplate
      .viewerTargets
      .map((target) => target.label)
      .join(', ');
  return SheetScore(
    id: 'pdf-annotation-compatibility',
    title: 'Clef Editable Annotation Compatibility',
    composer: '',
    tags: const <String>['qa', 'pdf-export'],
    note:
        'Local generated fixture for $viewerLabels manual compatibility '
        'checks.',
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
          id: 'compat-pressure-pen',
          tool: SheetAnnotationTool.pen,
          color: 0xff6a1b9a,
          width: 8,
          points: const <SheetAnnotationPoint>[
            SheetAnnotationPoint(x: 0.56, y: 0.88, pressure: 0.0),
            SheetAnnotationPoint(x: 0.68, y: 0.82, pressure: 1.0),
            SheetAnnotationPoint(x: 0.82, y: 0.88, pressure: 0.4),
          ],
          createdAt: now.add(const Duration(milliseconds: 500)),
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

SheetScore _unicodeAppearanceScore(String inputPath) {
  final now = DateTime.parse('2026-10-13T11:30:00.000');
  return SheetScore(
    id: 'pdf-unicode-freetext-appearance',
    title: 'Clef Unicode FreeText Appearance',
    composer: '',
    tags: const <String>['qa', 'pdf-export', 'unicode'],
    note:
        'Dedicated fixture for external viewer Unicode FreeText appearance '
        'checks.',
    filePath: inputPath,
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
          id: 'unicode-ascii-control',
          pageNumber: 1,
          position: const SheetAnnotationPoint(x: 0.12, y: 0.20),
          text: 'Cue: breathe',
          color: 0xff111111,
          fontSize: 16,
          createdAt: now,
        ),
        SheetTextAnnotation(
          id: 'unicode-korean-note',
          pageNumber: 1,
          position: const SheetAnnotationPoint(x: 0.12, y: 0.32),
          text: '숨 크게',
          color: 0xff0d47a1,
          fontSize: 18,
          createdAt: now.add(const Duration(seconds: 1)),
        ),
        SheetTextAnnotation(
          id: 'unicode-korean-stamp',
          pageNumber: 1,
          position: const SheetAnnotationPoint(x: 0.12, y: 0.44),
          text: '느리게',
          color: 0xff6a1b9a,
          fontSize: 18,
          createdAt: now.add(const Duration(seconds: 2)),
          stampKind: SheetAnnotationUserStamp.textKind,
        ),
        SheetTextAnnotation(
          id: 'unicode-music-symbol',
          pageNumber: 1,
          position: const SheetAnnotationPoint(x: 0.12, y: 0.56),
          text: '♪',
          color: 0xffd32f2f,
          fontSize: 22,
          createdAt: now.add(const Duration(seconds: 3)),
          stampKind: SheetAnnotationUserStamp.iconKind,
        ),
      ],
    ),
  );
}

SheetScore _transformedPageScore(String inputPath) {
  final now = DateTime.parse('2026-10-19T13:00:00.000');
  return SheetScore(
    id: 'pdf-rotated-cropped-compatibility',
    title: 'Clef Rotated Cropped Annotation Compatibility',
    composer: '',
    tags: const <String>['qa', 'pdf-export', 'rotation', 'crop'],
    note:
        'Fixture for visual annotation placement on a 90-degree rotated page '
        'with an offset CropBox.',
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
          id: 'transform-descending-line',
          tool: SheetAnnotationTool.line,
          color: 0xffd32f2f,
          width: 4,
          points: const <SheetAnnotationPoint>[
            SheetAnnotationPoint(x: 0.10, y: 0.10),
            SheetAnnotationPoint(x: 0.90, y: 0.90),
          ],
          createdAt: now,
        ),
        _stroke(
          id: 'transform-ascending-line',
          tool: SheetAnnotationTool.arrow,
          color: 0xff1d5fd1,
          width: 4,
          points: const <SheetAnnotationPoint>[
            SheetAnnotationPoint(x: 0.10, y: 0.90),
            SheetAnnotationPoint(x: 0.90, y: 0.10),
          ],
          createdAt: now.add(const Duration(seconds: 1)),
        ),
      ],
      texts: <SheetTextAnnotation>[
        SheetTextAnnotation(
          id: 'transform-top-left',
          pageNumber: 1,
          position: const SheetAnnotationPoint(x: 0.10, y: 0.10),
          text: 'TL',
          color: 0xff111111,
          fontSize: 14,
          createdAt: now.add(const Duration(seconds: 2)),
        ),
        SheetTextAnnotation(
          id: 'transform-center',
          pageNumber: 1,
          position: const SheetAnnotationPoint(x: 0.45, y: 0.50),
          text: 'CENTER',
          color: 0xff111111,
          fontSize: 14,
          createdAt: now.add(const Duration(seconds: 3)),
        ),
        SheetTextAnnotation(
          id: 'transform-bottom-right',
          pageNumber: 1,
          position: const SheetAnnotationPoint(x: 0.70, y: 0.85),
          text: 'BR',
          color: 0xff111111,
          fontSize: 14,
          createdAt: now.add(const Duration(seconds: 4)),
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
