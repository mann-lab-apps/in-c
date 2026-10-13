import 'sheet_annotated_pdf_exporter.dart';

enum SheetPdfViewerCompatibilityStatus { notTested, pass, issue, blocked }

extension SheetPdfViewerCompatibilityStatusLabel
    on SheetPdfViewerCompatibilityStatus {
  static SheetPdfViewerCompatibilityStatus? parse(String value) {
    final normalized = value.trim().toUpperCase().replaceAll('`', '');
    for (final status in SheetPdfViewerCompatibilityStatus.values) {
      if (status.label == normalized) {
        return status;
      }
    }
    return null;
  }

  bool get isKnown {
    return this != SheetPdfViewerCompatibilityStatus.notTested;
  }

  bool get isReady {
    return this == SheetPdfViewerCompatibilityStatus.pass;
  }

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

class SheetPdfViewerCompatibilityEntry {
  const SheetPdfViewerCompatibilityEntry({
    required this.viewerId,
    required this.statuses,
    this.notes = '',
    this.evidence = '',
  });

  final String viewerId;
  final Map<String, SheetPdfViewerCompatibilityStatus> statuses;
  final String notes;
  final String evidence;

  List<String> untestedColumns(Iterable<String> columns) {
    return [
      for (final column in columns)
        if ((statuses[column] ?? SheetPdfViewerCompatibilityStatus.notTested) ==
            SheetPdfViewerCompatibilityStatus.notTested)
          column,
    ];
  }

  List<String> issueColumns(Iterable<String> columns) {
    return [
      for (final column in columns)
        if (statuses[column] == SheetPdfViewerCompatibilityStatus.issue) column,
    ];
  }

  List<String> blockedColumns(Iterable<String> columns) {
    return [
      for (final column in columns)
        if (statuses[column] == SheetPdfViewerCompatibilityStatus.blocked)
          column,
    ];
  }
}

class SheetPdfViewerCompatibilityGate {
  const SheetPdfViewerCompatibilityGate._({
    required this.missingViewerIds,
    required this.untestedCells,
    required this.issueCells,
    required this.blockedCells,
  });

  factory SheetPdfViewerCompatibilityGate.review({
    required List<SheetPdfViewerCompatibilityEntry> entries,
    Iterable<SheetPdfViewerCompatibilityTarget> targets =
        SheetPdfAnnotationCompatibilityReportTemplate.viewerTargets,
    Iterable<String> columns =
        SheetPdfAnnotationCompatibilityReportTemplate.viewerMatrixColumns,
  }) {
    final entryByViewer = {for (final entry in entries) entry.viewerId: entry};
    final missingViewerIds = <String>[];
    final untestedCells = <String, List<String>>{};
    final issueCells = <String, List<String>>{};
    final blockedCells = <String, List<String>>{};
    for (final target in targets) {
      final entry = entryByViewer[target.id];
      if (entry == null) {
        missingViewerIds.add(target.id);
        untestedCells[target.id] = List<String>.from(columns);
        continue;
      }
      final untested = entry.untestedColumns(columns);
      if (untested.isNotEmpty) {
        untestedCells[target.id] = untested;
      }
      final issues = entry.issueColumns(columns);
      if (issues.isNotEmpty) {
        issueCells[target.id] = issues;
      }
      final blocked = entry.blockedColumns(columns);
      if (blocked.isNotEmpty) {
        blockedCells[target.id] = blocked;
      }
    }
    return SheetPdfViewerCompatibilityGate._(
      missingViewerIds: missingViewerIds,
      untestedCells: untestedCells,
      issueCells: issueCells,
      blockedCells: blockedCells,
    );
  }

  final List<String> missingViewerIds;
  final Map<String, List<String>> untestedCells;
  final Map<String, List<String>> issueCells;
  final Map<String, List<String>> blockedCells;

  bool get hasMissingViewers => missingViewerIds.isNotEmpty;
  bool get hasUntestedCells => untestedCells.isNotEmpty;
  bool get hasIssues => issueCells.isNotEmpty;
  bool get hasBlockedCells => blockedCells.isNotEmpty;

  bool get canClaimExternalCompatibility {
    return !hasMissingViewers &&
        !hasUntestedCells &&
        !hasIssues &&
        !hasBlockedCells;
  }

  String markdownSummary() {
    if (canClaimExternalCompatibility) {
      return '- External viewer compatibility gate: PASS';
    }
    final lines = <String>['- External viewer compatibility gate: NOT READY'];
    if (missingViewerIds.isNotEmpty) {
      lines.add('- Missing viewer rows: ${missingViewerIds.join(', ')}');
    }
    if (untestedCells.isNotEmpty) {
      lines.add('- NOT_TESTED cells: ${_cellSummary(untestedCells)}');
    }
    if (issueCells.isNotEmpty) {
      lines.add('- ISSUE cells: ${_cellSummary(issueCells)}');
    }
    if (blockedCells.isNotEmpty) {
      lines.add('- BLOCKED cells: ${_cellSummary(blockedCells)}');
    }
    return lines.join('\n');
  }

  static String _cellSummary(Map<String, List<String>> cells) {
    return cells.entries
        .map((entry) => '${entry.key}(${entry.value.join(', ')})')
        .join('; ');
  }
}

class SheetPdfAnnotationCompatibilityReportTemplate {
  const SheetPdfAnnotationCompatibilityReportTemplate._();

  static const viewerMatrixColumns = <String>[
    'Ink',
    'Line/arrow',
    'Rectangle',
    'Hairpin',
    'Staff/grid',
    'FreeText',
    'Text stamp',
    'Music-symbol stamp',
    'PNG image stamp',
    'WebP image stamp',
    'Unicode text',
    'Select/edit',
  ];

  static const viewerTargets = <SheetPdfViewerCompatibilityTarget>[
    SheetPdfViewerCompatibilityTarget(
      id: 'acrobat',
      label: 'Acrobat',
      requiredChecks: <String>[
        'visible/editable annotation objects',
        'generated appearances',
        'Unicode FreeText rendering',
        'text and music-symbol stamp rendering',
      ],
    ),
    SheetPdfViewerCompatibilityTarget(
      id: 'preview',
      label: 'macOS Preview',
      requiredChecks: <String>[
        'visible annotation objects',
        'select/edit behavior',
        'Unicode FreeText rendering',
        'text and music-symbol stamp rendering',
      ],
    ),
    SheetPdfViewerCompatibilityTarget(
      id: 'mobilesheets',
      label: 'MobileSheets',
      requiredChecks: <String>[
        'music app import/open path',
        'editable object visibility',
        'text and music-symbol stamp handling',
        'PNG and WebP image stamp handling',
      ],
    ),
    SheetPdfViewerCompatibilityTarget(
      id: 'piascore',
      label: 'Piascore',
      requiredChecks: <String>[
        'music app import/open path',
        'editable object visibility',
        'text and music-symbol stamp handling',
        'PNG and WebP image stamp handling',
      ],
    ),
    SheetPdfViewerCompatibilityTarget(
      id: 'android-pdf-viewer',
      label: 'Android PDF viewer',
      requiredChecks: <String>[
        'basic visible rendering',
        'text and music-symbol stamp rendering',
        'PNG and WebP image stamp rendering',
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
        '| ${target.label} | ${SheetPdfViewerCompatibilityStatus.notTested.label} | ${SheetPdfViewerCompatibilityStatus.notTested.label} | ${SheetPdfViewerCompatibilityStatus.notTested.label} | ${SheetPdfViewerCompatibilityStatus.notTested.label} | ${SheetPdfViewerCompatibilityStatus.notTested.label} | ${SheetPdfViewerCompatibilityStatus.notTested.label} | ${SheetPdfViewerCompatibilityStatus.notTested.label} | ${SheetPdfViewerCompatibilityStatus.notTested.label} | ${SheetPdfViewerCompatibilityStatus.notTested.label} | ${SheetPdfViewerCompatibilityStatus.notTested.label} | ${SheetPdfViewerCompatibilityStatus.notTested.label} | ${SheetPdfViewerCompatibilityStatus.notTested.label} | |',
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

Completion gate:

- Keep this report as `${SheetPdfViewerCompatibilityStatus.notTested.label}` until every viewer row has evidence.
- Do not claim external compatibility while any required cell is `${SheetPdfViewerCompatibilityStatus.notTested.label}`, `${SheetPdfViewerCompatibilityStatus.issue.label}` or `${SheetPdfViewerCompatibilityStatus.blocked.label}`.
- Treat local inspection as a fixture sanity check, not as proof of Acrobat/Preview/MobileSheets/Piascore behavior.

Unicode FreeText contents:

$unicodeRows

Subtype checklist:

| Subtype | Count | External viewer notes |
| --- | ---: | --- |
$subtypeRows

Viewer matrix:

| Viewer | Ink | Line/arrow | Rectangle | Hairpin | Staff/grid | FreeText | Text stamp | Music-symbol stamp | PNG image stamp | WebP image stamp | Unicode text | Select/edit | Result notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
$viewerRows

Required external checks:

| Viewer | Required checks | Evidence link / screenshot |
| --- | --- | --- |
$requiredCheckRows

Known local limits:

- Local inspection proves PDF annotation objects, `/NM` names, contents and generated appearances exist.
- Local inspection does not prove viewer rendering fidelity or edit behavior.
- Unicode text may preserve `/Contents` while still rendering with missing glyph boxes.
- Text and music-symbol stamps are exported as editable FreeText-style annotations and must be
  checked separately because viewer font fallback can differ.
- Attach screenshots for every `${SheetPdfViewerCompatibilityStatus.issue.label}` and keep the generated PDF path with the report.
''';
  }
}

class SheetPdfAnnotationCompatibilityReportParser {
  const SheetPdfAnnotationCompatibilityReportParser._();

  static List<SheetPdfViewerCompatibilityEntry> parseViewerMatrix(
    String markdown,
  ) {
    final targetIdByLabel = <String, String>{
      for (final target
          in SheetPdfAnnotationCompatibilityReportTemplate.viewerTargets)
        target.label: target.id,
    };
    final entries = <SheetPdfViewerCompatibilityEntry>[];
    for (final rawLine in markdown.split('\n')) {
      final line = rawLine.trim();
      if (!line.startsWith('|') || !line.endsWith('|')) {
        continue;
      }
      final cells = line
          .substring(1, line.length - 1)
          .split('|')
          .map((cell) => cell.trim())
          .toList(growable: false);
      if (cells.length < 2) {
        continue;
      }
      final viewerLabel = cells.first;
      final viewerId = targetIdByLabel[viewerLabel];
      if (viewerId == null) {
        continue;
      }
      final statuses = <String, SheetPdfViewerCompatibilityStatus>{};
      for (
        var index = 0;
        index <
            SheetPdfAnnotationCompatibilityReportTemplate
                .viewerMatrixColumns
                .length;
        index += 1
      ) {
        final column = SheetPdfAnnotationCompatibilityReportTemplate
            .viewerMatrixColumns[index];
        final cellIndex = index + 1;
        final status = cellIndex < cells.length
            ? SheetPdfViewerCompatibilityStatusLabel.parse(cells[cellIndex])
            : null;
        statuses[column] =
            status ?? SheetPdfViewerCompatibilityStatus.notTested;
      }
      final notesIndex =
          SheetPdfAnnotationCompatibilityReportTemplate
              .viewerMatrixColumns
              .length +
          1;
      final notes = notesIndex < cells.length ? cells[notesIndex] : '';
      entries.add(
        SheetPdfViewerCompatibilityEntry(
          viewerId: viewerId,
          statuses: Map.unmodifiable(statuses),
          notes: notes,
        ),
      );
    }
    return entries;
  }
}
