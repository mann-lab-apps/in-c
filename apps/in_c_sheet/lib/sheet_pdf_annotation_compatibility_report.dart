import 'sheet_annotated_pdf_exporter.dart';

enum SheetPdfViewerCompatibilityStatus { notTested, pass, issue, blocked }

extension SheetPdfViewerCompatibilityStatusLabel
    on SheetPdfViewerCompatibilityStatus {
  String get label {
    switch (this) {
      case SheetPdfViewerCompatibilityStatus.notTested:
        return 'NOT_TESTED';
      case SheetPdfViewerCompatibilityStatus.pass:
        return 'PASS';
      case SheetPdfViewerCompatibilityStatus.issue:
        return 'ISSUE';
      case SheetPdfViewerCompatibilityStatus.blocked:
        return 'BLOCKED';
    }
  }
}

class SheetPdfViewerCompatibilityTarget {
  const SheetPdfViewerCompatibilityTarget({
    required this.id,
    required this.label,
    required this.requiredChecks,
  });

  final String id;
  final String label;
  final List<String> requiredChecks;
}

class SheetPdfAnnotationCompatibilityReportTemplate {
  const SheetPdfAnnotationCompatibilityReportTemplate._();

  static const viewerTargets = <SheetPdfViewerCompatibilityTarget>[
    SheetPdfViewerCompatibilityTarget(
      id: 'acrobat',
      label: 'Acrobat',
      requiredChecks: <String>[
        'visible/editable annotation objects',
        'generated appearances',
        'Unicode FreeText rendering',
      ],
    ),
    SheetPdfViewerCompatibilityTarget(
      id: 'preview',
      label: 'macOS Preview',
      requiredChecks: <String>[
        'visible annotation objects',
        'select/edit behavior',
        'Unicode FreeText rendering',
      ],
    ),
    SheetPdfViewerCompatibilityTarget(
      id: 'mobilesheets',
      label: 'MobileSheets',
      requiredChecks: <String>[
        'music app import/open path',
        'editable object visibility',
        'image stamp handling',
      ],
    ),
    SheetPdfViewerCompatibilityTarget(
      id: 'piascore',
      label: 'Piascore',
      requiredChecks: <String>[
        'music app import/open path',
        'editable object visibility',
        'image stamp handling',
      ],
    ),
    SheetPdfViewerCompatibilityTarget(
      id: 'android-pdf-viewer',
      label: 'Android PDF viewer',
      requiredChecks: <String>[
        'basic visible rendering',
        'image stamp rendering',
        'Unicode FreeText rendering',
      ],
    ),
  ];

  static String markdown({
    required String fixturePath,
    required SheetStandardPdfAnnotationInspection inspection,
  }) {
    final subtypeRows = [
      for (final entry in inspection.clefSubtypeCounts.entries)
        '| `${entry.key}` | ${entry.value} | |',
    ].join('\n');
    final unicodeRows = inspection.unicodeFreeTextContents.isEmpty
        ? '- none'
        : inspection.unicodeFreeTextContents
              .map((content) => '- `$content`')
              .join('\n');
    final viewerRows = [
      for (final target in viewerTargets)
        '| ${target.label} | ${SheetPdfViewerCompatibilityStatus.notTested.label} | ${SheetPdfViewerCompatibilityStatus.notTested.label} | ${SheetPdfViewerCompatibilityStatus.notTested.label} | ${SheetPdfViewerCompatibilityStatus.notTested.label} | ${SheetPdfViewerCompatibilityStatus.notTested.label} | ${SheetPdfViewerCompatibilityStatus.notTested.label} | ${SheetPdfViewerCompatibilityStatus.notTested.label} | ${SheetPdfViewerCompatibilityStatus.notTested.label} | ${SheetPdfViewerCompatibilityStatus.notTested.label} | ${SheetPdfViewerCompatibilityStatus.notTested.label} | |',
    ].join('\n');
    final requiredCheckRows = [
      for (final target in viewerTargets)
        '| ${target.label} | ${target.requiredChecks.join('<br>')} | |',
    ].join('\n');

    return '''
# Clef Editable Annotation Compatibility Report

Fixture: `$fixturePath`

Local inspection:

- Pages: ${inspection.pageCount}
- Clef annotations: ${inspection.clefAnnotationCount}
- Generated appearances missing: ${inspection.missingGeneratedAppearanceNames.isEmpty ? 'none' : inspection.missingGeneratedAppearanceNames.join(', ')}

Result legend:

- `${SheetPdfViewerCompatibilityStatus.pass.label}`: viewer shows the annotation class and expected selection/editing behavior.
- `${SheetPdfViewerCompatibilityStatus.issue.label}`: viewer opens the PDF but rendering, glyphs, selection or editing is wrong.
- `${SheetPdfViewerCompatibilityStatus.blocked.label}`: viewer cannot open the file or the device/app is unavailable.
- `${SheetPdfViewerCompatibilityStatus.notTested.label}`: not checked yet.

Unicode FreeText contents:

$unicodeRows

Subtype checklist:

| Subtype | Count | External viewer notes |
| --- | ---: | --- |
$subtypeRows

Viewer matrix:

| Viewer | Ink | Line/arrow | Rectangle | Hairpin | Staff/grid | FreeText | Text/icon stamp | Image stamp | Unicode text | Select/edit | Result notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
$viewerRows

Required external checks:

| Viewer | Required checks | Evidence link / screenshot |
| --- | --- | --- |
$requiredCheckRows

Known local limits:

- Local inspection proves PDF annotation objects, `/NM` names, contents and generated appearances exist.
- Local inspection does not prove viewer rendering fidelity or edit behavior.
- Unicode text may preserve `/Contents` while still rendering with missing glyph boxes.
- Attach screenshots for every `${SheetPdfViewerCompatibilityStatus.issue.label}` and keep the generated PDF path with the report.
''';
  }
}
