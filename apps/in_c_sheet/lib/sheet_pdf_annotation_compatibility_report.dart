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

class SheetPdfViewerCompatibilityInvalidStatusCell {
  const SheetPdfViewerCompatibilityInvalidStatusCell({
    required this.viewerLabel,
    required this.column,
    required this.value,
  });

  final String viewerLabel;
  final String column;
  final String value;

  String get summary => '$viewerLabel $column=`$value`';
}

class SheetPdfAConformanceReportFinding {
  const SheetPdfAConformanceReportFinding({
    required this.profile,
    required this.severity,
    required this.details,
  });

  final String profile;
  final String severity;
  final String details;

  String get summary => '$profile $severity: $details';
}

class SheetPdfCompatibilityFixtureArtifact {
  const SheetPdfCompatibilityFixtureArtifact({
    required this.label,
    required this.path,
    required this.sha256,
  });

  final String label;
  final String path;
  final String sha256;
}

class SheetPdfViewerCompatibilityGate {
  const SheetPdfViewerCompatibilityGate._({
    required this.missingViewerIds,
    required this.missingEvidenceViewerIds,
    required this.missingUnicodeEvidenceViewerIds,
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
    final missingEvidenceViewerIds = <String>[];
    final missingUnicodeEvidenceViewerIds = <String>[];
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
      if (entry.notes.trim().isEmpty && entry.evidence.trim().isEmpty) {
        missingEvidenceViewerIds.add(target.id);
      }
      if (entry.statuses['Unicode text'] ==
              SheetPdfViewerCompatibilityStatus.pass &&
          !_hasUnicodeEvidence(entry)) {
        missingUnicodeEvidenceViewerIds.add(target.id);
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
      missingEvidenceViewerIds: missingEvidenceViewerIds,
      missingUnicodeEvidenceViewerIds: missingUnicodeEvidenceViewerIds,
      untestedCells: untestedCells,
      issueCells: issueCells,
      blockedCells: blockedCells,
    );
  }

  final List<String> missingViewerIds;
  final List<String> missingEvidenceViewerIds;
  final List<String> missingUnicodeEvidenceViewerIds;
  final Map<String, List<String>> untestedCells;
  final Map<String, List<String>> issueCells;
  final Map<String, List<String>> blockedCells;

  bool get hasMissingViewers => missingViewerIds.isNotEmpty;
  bool get hasMissingEvidence => missingEvidenceViewerIds.isNotEmpty;
  bool get hasMissingUnicodeEvidence =>
      missingUnicodeEvidenceViewerIds.isNotEmpty;
  bool get hasUntestedCells => untestedCells.isNotEmpty;
  bool get hasIssues => issueCells.isNotEmpty;
  bool get hasBlockedCells => blockedCells.isNotEmpty;

  bool get canClaimExternalCompatibility {
    return !hasMissingViewers &&
        !hasMissingEvidence &&
        !hasMissingUnicodeEvidence &&
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
      lines.add('- Missing viewer rows: ${_viewerSummary(missingViewerIds)}');
    }
    if (missingEvidenceViewerIds.isNotEmpty) {
      lines.add(
        '- Missing viewer evidence: '
        '${_viewerSummary(missingEvidenceViewerIds)}',
      );
    }
    if (missingUnicodeEvidenceViewerIds.isNotEmpty) {
      lines.add(
        '- Missing Unicode/glyph evidence: '
        '${_viewerSummary(missingUnicodeEvidenceViewerIds)}',
      );
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
        .map((entry) => '${_viewerLabel(entry.key)}(${entry.value.join(', ')})')
        .join('; ');
  }

  static String _viewerSummary(List<String> viewerIds) {
    return viewerIds.map(_viewerLabel).join(', ');
  }

  static String _viewerLabel(String viewerId) {
    for (final target
        in SheetPdfAnnotationCompatibilityReportTemplate.viewerTargets) {
      if (target.id == viewerId) {
        return target.label;
      }
    }
    return viewerId;
  }

  static bool _hasUnicodeEvidence(SheetPdfViewerCompatibilityEntry entry) {
    final evidenceText = '${entry.notes} ${entry.evidence}'.toLowerCase();
    return evidenceText.contains('unicode') ||
        evidenceText.contains('glyph') ||
        evidenceText.contains('font') ||
        evidenceText.contains('freetext') ||
        evidenceText.contains('한글') ||
        evidenceText.contains('음악') ||
        evidenceText.contains('기호') ||
        evidenceText.contains('글리프');
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
        'rotated/cropped annotation placement',
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
        'rotated/cropped annotation placement',
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
        'rotated/cropped annotation placement',
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
        'rotated/cropped annotation placement',
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
        'rotated/cropped annotation placement',
      ],
    ),
  ];

  static String markdown({
    required String fixturePath,
    required SheetStandardPdfAnnotationInspection inspection,
    String? fixtureSha256,
    String? unicodeFixturePath,
    SheetStandardPdfAnnotationInspection? unicodeInspection,
    String? unicodeFixtureSha256,
    String? transformedFixturePath,
    String? transformedFixtureSha256,
    SheetPdfAConformanceDelta? pdfAConformanceDelta,
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
    final viewerLabels = viewerTargets.map((target) => target.label).join('/');
    final requiredSpikeRows = SheetAnnotatedPdfExporter
        .standardAnnotationExportCapability
        .requiredSpikeItems
        .map((item) => '- `$item`: ${_requiredSpikeItemDescription(item)}')
        .join('\n');
    final unicodeFixtureSection =
        unicodeFixturePath == null || unicodeInspection == null
        ? ''
        : '''

Unicode appearance fixture:

- Fixture: `$unicodeFixturePath`
- Clef FreeText annotations: ${unicodeInspection.clefSubtypeCounts['FreeText'] ?? 0}
- Unicode contents:
${unicodeInspection.unicodeFreeTextContents.map((content) => '  - `$content`').join('\n')}
''';
    final artifactRows = <String>[
      if (fixtureSha256 != null)
        '| Editable annotation fixture | `$fixturePath` | `$fixtureSha256` |',
      if (unicodeFixturePath != null && unicodeFixtureSha256 != null)
        '| Unicode appearance fixture | `$unicodeFixturePath` | '
            '`$unicodeFixtureSha256` |',
      if (transformedFixturePath != null && transformedFixtureSha256 != null)
        '| Rotated/cropped fixture | `$transformedFixturePath` | '
            '`$transformedFixtureSha256` |',
    ].join('\n');
    final artifactSection = artifactRows.isEmpty
        ? ''
        : '''

Fixture artifacts:

| Artifact | Path | SHA-256 |
| --- | --- | --- |
$artifactRows
''';

    return '''
# Clef Editable Annotation Compatibility Report

Fixture: `$fixturePath`
$artifactSection

Local inspection:

- Pages: ${inspection.pageCount}
- Clef annotations: ${inspection.clefAnnotationCount}
- Generated appearances missing: ${inspection.missingGeneratedAppearanceNames.isEmpty ? 'none' : inspection.missingGeneratedAppearanceNames.join(', ')}
- Duplicate Clef annotation names: ${inspection.duplicateClefAnnotationNames.isEmpty ? 'none' : inspection.duplicateClefAnnotationNames.join(', ')}
- Out-of-page Clef annotations: ${inspection.outOfPageClefAnnotationNames.isEmpty ? 'none' : inspection.outOfPageClefAnnotationNames.join(', ')}
- Clef annotations with actions: ${inspection.actionBearingClefAnnotationNames.isEmpty ? 'none' : inspection.actionBearingClefAnnotationNames.join(', ')}
- Non-printable Clef annotations: ${inspection.nonPrintableClefAnnotationNames.isEmpty ? 'none' : inspection.nonPrintableClefAnnotationNames.join(', ')}
- Hidden Clef annotations: ${inspection.hiddenClefAnnotationNames.isEmpty ? 'none' : inspection.hiddenClefAnnotationNames.join(', ')}
- FreeText annotations with embedded fonts: ${inspection.embeddedFontFreeTextNames.isEmpty ? 'none' : inspection.embeddedFontFreeTextNames.join(', ')}
- Unicode FreeText annotations without embedded fonts: ${inspection.unembeddedUnicodeFreeTextNames.isEmpty ? 'none' : inspection.unembeddedUnicodeFreeTextNames.join(', ')}
${pdfAConformanceDelta == null ? '' : '''
- ${pdfAConformanceDelta.profile} source/output errors: ${pdfAConformanceDelta.sourceErrorCount}/${pdfAConformanceDelta.outputErrorCount}
- ${pdfAConformanceDelta.profile} source/output warnings: ${pdfAConformanceDelta.sourceWarningCount}/${pdfAConformanceDelta.outputWarningCount}
- Introduced ${pdfAConformanceDelta.profile} errors: ${pdfAConformanceDelta.introducedErrorDescriptions.isEmpty ? 'none' : pdfAConformanceDelta.introducedErrorDescriptions.join(' | ')}
- Introduced ${pdfAConformanceDelta.profile} warnings: ${pdfAConformanceDelta.introducedWarningDescriptions.isEmpty ? 'none' : pdfAConformanceDelta.introducedWarningDescriptions.join(' | ')}
'''}

Result legend:

- `${SheetPdfViewerCompatibilityStatus.pass.label}`: viewer shows the annotation class and expected selection/editing behavior.
- `${SheetPdfViewerCompatibilityStatus.issue.label}`: viewer opens the PDF but rendering, glyphs, selection or editing is wrong.
- `${SheetPdfViewerCompatibilityStatus.blocked.label}`: viewer cannot open the file or the device/app is unavailable.
- `${SheetPdfViewerCompatibilityStatus.notTested.label}`: not checked yet.

Completion gate:

- Keep this report as `${SheetPdfViewerCompatibilityStatus.notTested.label}` until every viewer row has `Result notes` or a required-check evidence link.
- Do not claim external compatibility while any required cell is `${SheetPdfViewerCompatibilityStatus.notTested.label}`, `${SheetPdfViewerCompatibilityStatus.issue.label}` or `${SheetPdfViewerCompatibilityStatus.blocked.label}`.
- If `Unicode text` is `${SheetPdfViewerCompatibilityStatus.pass.label}`, include Unicode/glyph/font evidence in the row notes or evidence link.
- Resolve every introduced PDF/A error or warning before treating a filled viewer matrix as ready.
- Keep the fixture files with this report; `--review-report` verifies listed SHA-256 digests when artifact rows are present.
- Treat local inspection as a fixture sanity check, not as proof of $viewerLabels behavior.

Required spike items:

$requiredSpikeRows
$unicodeFixtureSection
${transformedFixturePath == null ? '' : '''

Rotated/cropped appearance fixture:

- Fixture: `$transformedFixturePath`
- Source page 1 uses a 90-degree clockwise `/Rotate` and an offset CropBox.
- Confirm the two crossing lines and TL / CENTER / BR labels stay at the same visual locations.
'''}

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
- Local inspection identifies embedded FreeText font programs; listed Unicode annotations without one still depend on viewer font fallback.
- Local inspection does not prove viewer rendering fidelity or edit behavior.
- Unicode text may preserve `/Contents` while still rendering with missing glyph boxes.
- Text and music-symbol stamps are exported as editable FreeText-style annotations and must be
  checked separately because viewer font fallback can differ.
- Attach screenshots for every `${SheetPdfViewerCompatibilityStatus.issue.label}` and keep the generated PDF path with the report.
''';
  }

  static String _requiredSpikeItemDescription(String item) {
    switch (item) {
      case 'acrobatPreviewFixture':
        return 'verify the generated fixture in Acrobat and macOS Preview.';
      case 'mobileSheetsPiascoreFixture':
        return 'verify the generated fixture in MobileSheets and Piascore.';
      case 'androidPdfViewerFixture':
        return 'verify the generated fixture in the Android PDF viewer used '
            'by testers.';
      case 'unicodeFontFallbackPolicy':
        return 'choose a licensed font fallback/embedding policy before '
            'claiming Unicode glyph fidelity.';
      case 'pdfAConformancePreservation':
        return 'review newly introduced PDF/A findings separately from '
            'problems already present in the source PDF.';
    }
    return 'document and clear this remaining compatibility dependency.';
  }
}

class SheetPdfAnnotationCompatibilityReportParser {
  const SheetPdfAnnotationCompatibilityReportParser._();

  static List<SheetPdfViewerCompatibilityEntry> parseViewerMatrix(
    String markdown,
  ) {
    final viewerMatrixRows = _parseRowsInSection(markdown, 'Viewer matrix:');
    final requiredCheckRows = _parseRowsInSection(
      markdown,
      'Required external checks:',
    );
    final evidenceByViewerId = <String, String>{};
    for (final cells in requiredCheckRows) {
      if (cells.length != 3 || _isTableHeaderOrDivider(cells)) {
        continue;
      }
      final viewerId = _viewerIdForLabel(cells.first);
      if (viewerId == null) {
        continue;
      }
      final evidence = cells[2].trim();
      if (evidence.isNotEmpty) {
        evidenceByViewerId[viewerId] = evidence;
      }
    }

    final entries = <SheetPdfViewerCompatibilityEntry>[];
    for (final cells in viewerMatrixRows) {
      if (_isTableHeaderOrDivider(cells) ||
          cells.length <
              SheetPdfAnnotationCompatibilityReportTemplate
                      .viewerMatrixColumns
                      .length +
                  2) {
        continue;
      }
      final viewerLabel = cells.first;
      final viewerId = _viewerIdForLabel(viewerLabel);
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
          evidence: evidenceByViewerId[viewerId] ?? '',
        ),
      );
    }
    return entries;
  }

  static List<String> parseUnknownViewerLabels(String markdown) {
    final labels = <String>[];
    final seenLabels = <String>{};
    for (final cells in <List<String>>[
      ..._parseRowsInSection(markdown, 'Viewer matrix:'),
      ..._parseRowsInSection(markdown, 'Required external checks:'),
    ]) {
      if (_isTableHeaderOrDivider(cells)) {
        continue;
      }
      final label = cells.first.trim();
      if (label.isEmpty || _viewerIdForLabel(label) != null) {
        continue;
      }
      final normalized = _normalizeViewerLabel(label);
      if (seenLabels.add(normalized)) {
        labels.add(label);
      }
    }
    return labels;
  }

  static List<SheetPdfViewerCompatibilityInvalidStatusCell>
  parseInvalidStatusCells(String markdown) {
    final invalidCells = <SheetPdfViewerCompatibilityInvalidStatusCell>[];
    for (final cells in _parseRowsInSection(markdown, 'Viewer matrix:')) {
      if (_isTableHeaderOrDivider(cells) ||
          _viewerIdForLabel(cells.first) == null) {
        continue;
      }
      for (
        var index = 0;
        index <
            SheetPdfAnnotationCompatibilityReportTemplate
                .viewerMatrixColumns
                .length;
        index += 1
      ) {
        final cellIndex = index + 1;
        if (cellIndex >= cells.length) {
          continue;
        }
        final value = cells[cellIndex].trim();
        if (value.isEmpty ||
            SheetPdfViewerCompatibilityStatusLabel.parse(value) != null) {
          continue;
        }
        invalidCells.add(
          SheetPdfViewerCompatibilityInvalidStatusCell(
            viewerLabel: cells.first,
            column: SheetPdfAnnotationCompatibilityReportTemplate
                .viewerMatrixColumns[index],
            value: value,
          ),
        );
      }
    }
    return invalidCells;
  }

  static List<SheetPdfAConformanceReportFinding> parseIntroducedPdfAFindings(
    String markdown,
  ) {
    final findings = <SheetPdfAConformanceReportFinding>[];
    final pattern = RegExp(
      r'^- Introduced (PDF/A-[^ ]+) (errors|warnings):\s*(.+)$',
      multiLine: true,
      caseSensitive: false,
    );
    for (final match in pattern.allMatches(markdown)) {
      final details = (match.group(3) ?? '').trim();
      if (details.isEmpty || details.toLowerCase() == 'none') {
        continue;
      }
      findings.add(
        SheetPdfAConformanceReportFinding(
          profile: match.group(1) ?? 'PDF/A',
          severity: (match.group(2) ?? 'finding').toLowerCase(),
          details: details,
        ),
      );
    }
    return findings;
  }

  static List<SheetPdfCompatibilityFixtureArtifact> parseFixtureArtifacts(
    String markdown,
  ) {
    final artifacts = <SheetPdfCompatibilityFixtureArtifact>[];
    for (final cells in _parseRowsInSection(markdown, 'Fixture artifacts:')) {
      if (cells.length != 3 ||
          cells.first.trim().toLowerCase() == 'artifact' ||
          _isTableHeaderOrDivider(cells)) {
        continue;
      }
      final label = cells[0].trim();
      final path = cells[1].trim().replaceAll('`', '');
      final digest = cells[2].trim().replaceAll('`', '').toLowerCase();
      if (label.isEmpty || path.isEmpty || digest.isEmpty) {
        continue;
      }
      artifacts.add(
        SheetPdfCompatibilityFixtureArtifact(
          label: label,
          path: path,
          sha256: digest,
        ),
      );
    }
    return artifacts;
  }

  static String? _viewerIdForLabel(String label) {
    final normalized = _normalizeViewerLabel(label);
    for (final target
        in SheetPdfAnnotationCompatibilityReportTemplate.viewerTargets) {
      if (_normalizeViewerLabel(target.label) == normalized) {
        return target.id;
      }
    }
    return _viewerLabelAliases[normalized];
  }

  static String _normalizeViewerLabel(String label) {
    return label.trim().toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '');
  }

  static const _viewerLabelAliases = <String, String>{
    'adobeacrobat': 'acrobat',
    'acrobatreader': 'acrobat',
    'preview': 'preview',
    'previewapp': 'preview',
    'macpreview': 'preview',
    'macospreviewapp': 'preview',
    'mobilesheet': 'mobilesheets',
    'mobilesheetspro': 'mobilesheets',
    'piascoreapp': 'piascore',
    'androidviewer': 'android-pdf-viewer',
    'androidpdf': 'android-pdf-viewer',
    'androidpdfviewerapp': 'android-pdf-viewer',
  };

  static List<List<String>> _parseRowsInSection(
    String markdown,
    String heading,
  ) {
    final rows = <List<String>>[];
    var isInSection = false;
    var hasStartedTable = false;
    for (final rawLine in markdown.split('\n')) {
      final line = rawLine.trim();
      if (!isInSection) {
        isInSection = line == heading;
        continue;
      }
      final row = _parseTableRow(rawLine);
      if (row == null) {
        if (hasStartedTable) {
          break;
        }
        continue;
      }
      hasStartedTable = true;
      rows.add(row);
    }
    return rows;
  }

  static bool _isTableHeaderOrDivider(List<String> cells) {
    if (cells.isEmpty) {
      return true;
    }
    final first = cells.first.trim().toLowerCase();
    if (first == 'viewer') {
      return true;
    }
    return cells.every((cell) {
      final normalized = cell.trim().replaceAll(':', '');
      return normalized.isNotEmpty &&
          normalized.runes.every((rune) => rune == 45);
    });
  }

  static List<String>? _parseTableRow(String rawLine) {
    final line = rawLine.trim();
    if (!line.startsWith('|') || !line.endsWith('|')) {
      return null;
    }
    return line
        .substring(1, line.length - 1)
        .split('|')
        .map((cell) => cell.trim())
        .toList(growable: false);
  }
}
