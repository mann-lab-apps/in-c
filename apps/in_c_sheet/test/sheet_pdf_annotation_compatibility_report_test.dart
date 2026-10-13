import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_annotated_pdf_exporter.dart';
import 'package:in_c_sheet/sheet_pdf_annotation_compatibility_report.dart';

void main() {
  test('renders a structured external viewer compatibility report', () {
    const inspection = SheetStandardPdfAnnotationInspection(
      path: 'fixture.pdf',
      pageCount: 1,
      totalAnnotationCount: 7,
      clefAnnotationCount: 6,
      subtypeCounts: <String, int>{
        'Ink': 1,
        'Line': 2,
        'Square': 1,
        'FreeText': 1,
        'Stamp': 1,
      },
      clefSubtypeCounts: <String, int>{
        'Ink': 1,
        'Line': 2,
        'Square': 1,
        'FreeText': 1,
        'Stamp': 1,
      },
      clefAnnotationNames: <String>[
        'clef-ink-1',
        'clef-line-1',
        'clef-line-2',
        'clef-square-1',
        'clef-free-text-1',
        'clef-stamp-1',
      ],
      clefAnnotationContents: <String>['Cue', '숨 크게'],
      unicodeFreeTextContents: <String>['숨 크게'],
      missingGeneratedAppearanceNames: <String>[],
    );

    final markdown = SheetPdfAnnotationCompatibilityReportTemplate.markdown(
      fixturePath: '/tmp/clef-fixture.pdf',
      inspection: inspection,
      unicodeFixturePath: '/tmp/clef-unicode.pdf',
      unicodeInspection: const SheetStandardPdfAnnotationInspection(
        path: 'unicode.pdf',
        pageCount: 1,
        totalAnnotationCount: 4,
        clefAnnotationCount: 4,
        subtypeCounts: <String, int>{'FreeText': 4},
        clefSubtypeCounts: <String, int>{'FreeText': 4},
        clefAnnotationNames: <String>[
          'clef-unicode-ascii',
          'clef-unicode-korean',
          'clef-unicode-stamp',
          'clef-unicode-symbol',
        ],
        clefAnnotationContents: <String>['Cue', '숨 크게', '느리게', '♪'],
        unicodeFreeTextContents: <String>['숨 크게', '느리게', '♪'],
        missingGeneratedAppearanceNames: <String>[],
      ),
    );

    expect(markdown, contains('Fixture: `/tmp/clef-fixture.pdf`'));
    expect(markdown, contains('- Pages: 1'));
    expect(markdown, contains('- Clef annotations: 6'));
    expect(markdown, contains('Result legend:'));
    expect(markdown, contains('`PASS`'));
    expect(markdown, contains('`ISSUE`'));
    expect(markdown, contains('`BLOCKED`'));
    expect(markdown, contains('`NOT_TESTED`'));
    expect(markdown, contains('Completion gate:'));
    expect(
      markdown,
      contains('Do not claim external compatibility while any required cell'),
    );
    expect(markdown, contains('include Unicode/glyph/font evidence'));
    expect(
      markdown,
      contains(
        'not as proof of Acrobat/macOS Preview/MobileSheets/Piascore/'
        'Android PDF viewer behavior',
      ),
    );
    expect(markdown, contains('- `숨 크게`'));
    expect(markdown, contains('| `Ink` | 1 | |'));
    expect(markdown, contains('| `Line` | 2 | |'));
    expect(markdown, contains('| Acrobat | NOT_TESTED |'));
    expect(markdown, contains('| macOS Preview | NOT_TESTED |'));
    expect(markdown, contains('| MobileSheets | NOT_TESTED |'));
    expect(markdown, contains('| Piascore | NOT_TESTED |'));
    expect(markdown, contains('| Android PDF viewer | NOT_TESTED |'));
    expect(markdown, contains('Required external checks:'));
    expect(markdown, contains('text and music-symbol stamp rendering'));
    expect(markdown, contains('text and music-symbol stamp handling'));
    expect(markdown, contains('Text stamp'));
    expect(markdown, contains('Music-symbol stamp'));
    expect(markdown, contains('PNG and WebP image stamp handling'));
    expect(markdown, contains('PNG image stamp'));
    expect(markdown, contains('WebP image stamp'));
    expect(markdown, contains('Required spike items:'));
    expect(markdown, contains('`acrobatPreviewFixture`'));
    expect(markdown, contains('`mobileSheetsPiascoreFixture`'));
    expect(markdown, contains('`androidPdfViewerFixture`'));
    expect(markdown, contains('`unicodeFontFallbackPolicy`'));
    expect(markdown, contains('Acrobat and macOS Preview'));
    expect(markdown, contains('MobileSheets and Piascore'));
    expect(markdown, contains('Android PDF viewer used by testers'));
    expect(markdown, contains('licensed font fallback/embedding policy'));
    expect(markdown, contains('Unicode appearance fixture:'));
    expect(markdown, contains('Fixture: `/tmp/clef-unicode.pdf`'));
    expect(markdown, contains('Clef FreeText annotations: 4'));
    expect(markdown, contains('- `느리게`'));
    expect(markdown, contains('Known local limits:'));
    expect(markdown, contains('generated appearances exist'));
    expect(markdown, contains('checked separately'));
  });

  test('renders none when Unicode FreeText contents are absent', () {
    const inspection = SheetStandardPdfAnnotationInspection(
      path: 'fixture.pdf',
      pageCount: 1,
      totalAnnotationCount: 1,
      clefAnnotationCount: 1,
      subtypeCounts: <String, int>{'Ink': 1},
      clefSubtypeCounts: <String, int>{'Ink': 1},
      clefAnnotationNames: <String>['clef-ink-1'],
      clefAnnotationContents: <String>[],
      unicodeFreeTextContents: <String>[],
      missingGeneratedAppearanceNames: <String>['clef-ink-1'],
    );

    final markdown = SheetPdfAnnotationCompatibilityReportTemplate.markdown(
      fixturePath: '/tmp/clef-fixture.pdf',
      inspection: inspection,
    );

    expect(markdown, contains('Generated appearances missing: clef-ink-1'));
    expect(markdown, contains('Unicode FreeText contents:\n\n- none'));
    expect(markdown, isNot(contains('Unicode appearance fixture:')));
  });

  test('marks external compatibility gate not ready for missing checks', () {
    final gate = SheetPdfViewerCompatibilityGate.review(
      entries: <SheetPdfViewerCompatibilityEntry>[
        SheetPdfViewerCompatibilityEntry(
          viewerId: 'acrobat',
          statuses: <String, SheetPdfViewerCompatibilityStatus>{
            for (final column
                in SheetPdfAnnotationCompatibilityReportTemplate
                    .viewerMatrixColumns)
              column: SheetPdfViewerCompatibilityStatus.pass,
          },
        ),
        SheetPdfViewerCompatibilityEntry(
          viewerId: 'preview',
          statuses: <String, SheetPdfViewerCompatibilityStatus>{
            'Ink': SheetPdfViewerCompatibilityStatus.pass,
            'Line/arrow': SheetPdfViewerCompatibilityStatus.issue,
            'Rectangle': SheetPdfViewerCompatibilityStatus.pass,
            'Hairpin': SheetPdfViewerCompatibilityStatus.pass,
            'Staff/grid': SheetPdfViewerCompatibilityStatus.pass,
            'FreeText': SheetPdfViewerCompatibilityStatus.pass,
            'Text stamp': SheetPdfViewerCompatibilityStatus.pass,
            'Music-symbol stamp': SheetPdfViewerCompatibilityStatus.pass,
            'PNG image stamp': SheetPdfViewerCompatibilityStatus.pass,
            'WebP image stamp': SheetPdfViewerCompatibilityStatus.pass,
            'Unicode text': SheetPdfViewerCompatibilityStatus.notTested,
            'Select/edit': SheetPdfViewerCompatibilityStatus.pass,
          },
        ),
        SheetPdfViewerCompatibilityEntry(
          viewerId: 'mobilesheets',
          statuses: <String, SheetPdfViewerCompatibilityStatus>{
            for (final column
                in SheetPdfAnnotationCompatibilityReportTemplate
                    .viewerMatrixColumns)
              column: SheetPdfViewerCompatibilityStatus.pass,
          },
        ),
        SheetPdfViewerCompatibilityEntry(
          viewerId: 'piascore',
          statuses: <String, SheetPdfViewerCompatibilityStatus>{
            for (final column
                in SheetPdfAnnotationCompatibilityReportTemplate
                    .viewerMatrixColumns)
              column: SheetPdfViewerCompatibilityStatus.pass,
          },
        ),
      ],
    );

    expect(gate.canClaimExternalCompatibility, isFalse);
    expect(gate.missingViewerIds, contains('android-pdf-viewer'));
    expect(gate.missingEvidenceViewerIds, contains('acrobat'));
    expect(gate.untestedCells['preview'], contains('Unicode text'));
    expect(gate.issueCells['preview'], contains('Line/arrow'));
    expect(
      gate.markdownSummary(),
      contains('External viewer compatibility gate: NOT READY'),
    );
    expect(gate.markdownSummary(), contains('Android PDF viewer'));
    expect(gate.markdownSummary(), contains('Missing viewer evidence'));
    expect(gate.markdownSummary(), contains('macOS Preview(Unicode text)'));
    expect(gate.markdownSummary(), contains('macOS Preview(Line/arrow)'));
  });

  test(
    'allows external compatibility claim only with pass cells and evidence',
    () {
      final gate = SheetPdfViewerCompatibilityGate.review(
        entries: <SheetPdfViewerCompatibilityEntry>[
          for (final target
              in SheetPdfAnnotationCompatibilityReportTemplate.viewerTargets)
            SheetPdfViewerCompatibilityEntry(
              viewerId: target.id,
              statuses: <String, SheetPdfViewerCompatibilityStatus>{
                for (final column
                    in SheetPdfAnnotationCompatibilityReportTemplate
                        .viewerMatrixColumns)
                  column: SheetPdfViewerCompatibilityStatus.pass,
              },
              notes:
                  '${target.label} screenshot, edit notes and Unicode glyph '
                  'rendering evidence',
            ),
        ],
      );

      expect(gate.canClaimExternalCompatibility, isTrue);
      expect(gate.markdownSummary(), contains('gate: PASS'));
    },
  );

  test('keeps external compatibility blocked when pass rows lack evidence', () {
    final gate = SheetPdfViewerCompatibilityGate.review(
      entries: <SheetPdfViewerCompatibilityEntry>[
        for (final target
            in SheetPdfAnnotationCompatibilityReportTemplate.viewerTargets)
          SheetPdfViewerCompatibilityEntry(
            viewerId: target.id,
            statuses: <String, SheetPdfViewerCompatibilityStatus>{
              for (final column
                  in SheetPdfAnnotationCompatibilityReportTemplate
                      .viewerMatrixColumns)
                column: SheetPdfViewerCompatibilityStatus.pass,
            },
          ),
      ],
    );

    expect(gate.canClaimExternalCompatibility, isFalse);
    expect(
      gate.missingEvidenceViewerIds,
      containsAll(<String>['acrobat', 'mobilesheets']),
    );
    expect(gate.markdownSummary(), contains('Missing viewer evidence'));
  });

  test('keeps compatibility blocked without Unicode glyph evidence', () {
    final gate = SheetPdfViewerCompatibilityGate.review(
      entries: <SheetPdfViewerCompatibilityEntry>[
        for (final target
            in SheetPdfAnnotationCompatibilityReportTemplate.viewerTargets)
          SheetPdfViewerCompatibilityEntry(
            viewerId: target.id,
            statuses: <String, SheetPdfViewerCompatibilityStatus>{
              for (final column
                  in SheetPdfAnnotationCompatibilityReportTemplate
                      .viewerMatrixColumns)
                column: SheetPdfViewerCompatibilityStatus.pass,
            },
            notes: '${target.label} generic screenshot and edit notes',
          ),
      ],
    );

    expect(gate.canClaimExternalCompatibility, isFalse);
    expect(
      gate.missingUnicodeEvidenceViewerIds,
      containsAll(<String>['acrobat', 'preview', 'android-pdf-viewer']),
    );
    expect(gate.markdownSummary(), contains('Missing Unicode/glyph evidence'));
  });

  test('parses filled viewer matrix rows for report review', () {
    const markdown = '''
# Clef Editable Annotation Compatibility Report

Viewer matrix:

| Viewer | Ink | Line/arrow | Rectangle | Hairpin | Staff/grid | FreeText | Text stamp | Music-symbol stamp | PNG image stamp | WebP image stamp | Unicode text | Select/edit | Result notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Acrobat | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | Unicode glyph screenshot A |
| macOS Preview | PASS | ISSUE | PASS | PASS | PASS | PASS | PASS | NOT_TESTED | PASS | NOT_TESTED | NOT_TESTED | PASS | line moved |
| MobileSheets | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | |
| Piascore | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | |
| Android PDF viewer | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | BLOCKED | PASS | unavailable |
''';

    final entries =
        SheetPdfAnnotationCompatibilityReportParser.parseViewerMatrix(markdown);
    final preview = entries.singleWhere((entry) => entry.viewerId == 'preview');
    final android = entries.singleWhere(
      (entry) => entry.viewerId == 'android-pdf-viewer',
    );
    final gate = SheetPdfViewerCompatibilityGate.review(entries: entries);

    expect(entries, hasLength(5));
    expect(preview.notes, 'line moved');
    expect(
      preview.statuses['Line/arrow'],
      SheetPdfViewerCompatibilityStatus.issue,
    );
    expect(
      preview.statuses['Unicode text'],
      SheetPdfViewerCompatibilityStatus.notTested,
    );
    expect(
      preview.statuses['WebP image stamp'],
      SheetPdfViewerCompatibilityStatus.notTested,
    );
    expect(
      preview.statuses['Music-symbol stamp'],
      SheetPdfViewerCompatibilityStatus.notTested,
    );
    expect(
      android.statuses['Unicode text'],
      SheetPdfViewerCompatibilityStatus.blocked,
    );
    expect(gate.canClaimExternalCompatibility, isFalse);
    expect(gate.issueCells['preview'], contains('Line/arrow'));
    expect(gate.untestedCells['preview'], contains('WebP image stamp'));
    expect(gate.untestedCells['preview'], contains('Music-symbol stamp'));
    expect(gate.missingEvidenceViewerIds, contains('mobilesheets'));
    expect(gate.missingEvidenceViewerIds, contains('piascore'));
    expect(gate.blockedCells['android-pdf-viewer'], contains('Unicode text'));
  });

  test('uses required-check evidence links for compatibility gate', () {
    const markdown = '''
# Clef Editable Annotation Compatibility Report

Viewer matrix:

| Viewer | Ink | Line/arrow | Rectangle | Hairpin | Staff/grid | FreeText | Text stamp | Music-symbol stamp | PNG image stamp | WebP image stamp | Unicode text | Select/edit | Result notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Acrobat | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | |
| macOS Preview | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | preview Unicode glyph notes |
| MobileSheets | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | |
| Piascore | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | |
| Android PDF viewer | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | |

Required external checks:

| Viewer | Required checks | Evidence link / screenshot |
| --- | --- | --- |
| Acrobat | visible/editable annotation objects | screenshots/acrobat-unicode.png |
| MobileSheets | music app import/open path | screenshots/mobilesheets-unicode.png |
| Piascore | music app import/open path | screenshots/piascore-unicode.png |
| Android PDF viewer | basic visible rendering | screenshots/android-unicode.png |
''';

    final entries =
        SheetPdfAnnotationCompatibilityReportParser.parseViewerMatrix(markdown);
    final acrobat = entries.singleWhere((entry) => entry.viewerId == 'acrobat');
    final preview = entries.singleWhere((entry) => entry.viewerId == 'preview');
    final gate = SheetPdfViewerCompatibilityGate.review(entries: entries);

    expect(acrobat.notes, isEmpty);
    expect(acrobat.evidence, 'screenshots/acrobat-unicode.png');
    expect(preview.notes, 'preview Unicode glyph notes');
    expect(preview.evidence, isEmpty);
    expect(gate.canClaimExternalCompatibility, isTrue);
  });

  test('accepts common viewer label aliases in hand-filled reports', () {
    const markdown = '''
# Clef Editable Annotation Compatibility Report

Viewer matrix:

| Viewer | Ink | Line/arrow | Rectangle | Hairpin | Staff/grid | FreeText | Text stamp | Music-symbol stamp | PNG image stamp | WebP image stamp | Unicode text | Select/edit | Result notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Adobe Acrobat | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | Unicode glyph ok |
| Preview | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | Unicode glyph ok |
| Mobile Sheets | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | Unicode glyph ok |
| Piascore app | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | Unicode glyph ok |
| Android viewer | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | Unicode glyph ok |
''';

    final entries =
        SheetPdfAnnotationCompatibilityReportParser.parseViewerMatrix(markdown);
    final gate = SheetPdfViewerCompatibilityGate.review(entries: entries);

    expect(
      entries.map((entry) => entry.viewerId),
      containsAll(<String>[
        'acrobat',
        'preview',
        'mobilesheets',
        'piascore',
        'android-pdf-viewer',
      ]),
    );
    expect(gate.canClaimExternalCompatibility, isTrue);
  });
}
