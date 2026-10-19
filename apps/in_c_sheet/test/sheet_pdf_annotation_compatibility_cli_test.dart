import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_pdf_annotation_compatibility_report.dart';

void main() {
  late Directory tempDirectory;

  setUp(() async {
    tempDirectory = await Directory.systemTemp.createTemp(
      'clef-pdf-report-cli-',
    );
  });

  tearDown(() async {
    if (tempDirectory.existsSync()) {
      await tempDirectory.delete(recursive: true);
    }
  });

  test('review-report exits zero for a complete pass report', () async {
    final report = await _writeReport(tempDirectory, _compatibilityReport());

    final result = await _reviewReport(report);

    expect(result.exitCode, 0);
    expect(result.stdout, contains('External viewer compatibility gate: PASS'));
    expect(result.stdout, isNot(contains('Unknown viewer rows')));
    expect(result.stdout, isNot(contains('Invalid status cells')));
    expect(result.stderr, isNot(contains('Unhandled exception')));
  });

  test(
    'review-report exits two for unknown viewers and invalid cells',
    () async {
      final report = await _writeReport(
        tempDirectory,
        _compatibilityReport(
          acrobatUnicodeStatus: 'PAS',
          extraViewerRow:
              '| Adobe Acrobt | PASS | PASS | PASS | PASS | PASS | PASS | '
              'PASS | PASS | PASS | PASS | PASS | PASS | typo |',
        ),
      );

      final result = await _reviewReport(report);

      expect(result.exitCode, 2);
      expect(result.stdout, contains('Unknown viewer rows: Adobe Acrobt'));
      expect(
        result.stdout,
        contains('Invalid status cells: Acrobat Unicode text=`PAS`'),
      );
      expect(
        result.stdout,
        contains('External viewer compatibility gate: NOT READY'),
      );
      expect(result.stderr, isNot(contains('Unhandled exception')));
    },
  );
}

Future<File> _writeReport(Directory directory, String contents) async {
  final report = File('${directory.path}/compatibility-report.md');
  await report.writeAsString(contents);
  return report;
}

Future<ProcessResult> _reviewReport(File report) {
  final tool = File('tool/generate_pdf_annotation_compatibility_fixture.dart')
      .absolute;
  return Process.run('dart', <String>[
    'run',
    tool.path,
    '--review-report',
    report.path,
  ]);
}

String _compatibilityReport({
  String acrobatUnicodeStatus = 'PASS',
  String? extraViewerRow,
}) {
  final rows = <String>[
    for (final target
        in SheetPdfAnnotationCompatibilityReportTemplate.viewerTargets)
      _viewerRow(
        target.label,
        unicodeStatus: target.id == 'acrobat' ? acrobatUnicodeStatus : 'PASS',
      ),
    ?extraViewerRow,
  ].join('\n');
  return '''
# Clef Editable Annotation Compatibility Report

Viewer matrix:

| Viewer | Ink | Line/arrow | Rectangle | Hairpin | Staff/grid | FreeText | Text stamp | Music-symbol stamp | PNG image stamp | WebP image stamp | Unicode text | Select/edit | Result notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
$rows
''';
}

String _viewerRow(String viewer, {required String unicodeStatus}) {
  return '| $viewer | PASS | PASS | PASS | PASS | PASS | PASS | PASS | '
      'PASS | PASS | PASS | $unicodeStatus | PASS | '
      'Unicode glyph screenshot verified |';
}
