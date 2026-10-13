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
    expect(markdown, contains('- `숨 크게`'));
    expect(markdown, contains('| `Ink` | 1 | |'));
    expect(markdown, contains('| `Line` | 2 | |'));
    expect(markdown, contains('| Acrobat | NOT_TESTED |'));
    expect(markdown, contains('| macOS Preview | NOT_TESTED |'));
    expect(markdown, contains('| MobileSheets | NOT_TESTED |'));
    expect(markdown, contains('| Piascore | NOT_TESTED |'));
    expect(markdown, contains('| Android PDF viewer | NOT_TESTED |'));
    expect(markdown, contains('Required external checks:'));
    expect(markdown, contains('image stamp handling'));
    expect(markdown, contains('Known local limits:'));
    expect(markdown, contains('generated appearances exist'));
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
            'Text/icon stamp': SheetPdfViewerCompatibilityStatus.pass,
            'Image stamp': SheetPdfViewerCompatibilityStatus.pass,
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
    expect(gate.untestedCells['preview'], contains('Unicode text'));
    expect(gate.issueCells['preview'], contains('Line/arrow'));
    expect(
      gate.markdownSummary(),
      contains('External viewer compatibility gate: NOT READY'),
    );
    expect(gate.markdownSummary(), contains('android-pdf-viewer'));
    expect(gate.markdownSummary(), contains('preview(Unicode text)'));
    expect(gate.markdownSummary(), contains('preview(Line/arrow)'));
  });

  test('allows external compatibility claim only when every cell passes', () {
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

    expect(gate.canClaimExternalCompatibility, isTrue);
    expect(gate.markdownSummary(), contains('gate: PASS'));
  });
}
