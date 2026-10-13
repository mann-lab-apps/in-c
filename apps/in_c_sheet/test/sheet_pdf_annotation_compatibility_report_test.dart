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
}
