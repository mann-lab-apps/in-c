import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_annotated_pdf_export_feedback.dart';
import 'package:in_c_sheet/sheet_annotated_pdf_exporter.dart';

void main() {
  test('names unembedded Unicode text after editable PDF export', () {
    final messages = SheetAnnotatedPdfExportFeedback.successMessages(
      _result(didWrite: true, unembeddedUnicodeTextCount: 2),
    );

    expect(
      messages,
      contains('2개 한글/음악 기호 주석은 글꼴을 포함하지 않아 PDF 앱마다 다르게 보일 수 있습니다.'),
    );
    expect(
      messages,
      isNot(contains('편집 가능한 PDF 주석은 PDF 앱마다 표시/편집 방식이 다를 수 있습니다.')),
    );
  });

  test('keeps the general compatibility warning for embedded text', () {
    final messages = SheetAnnotatedPdfExportFeedback.successMessages(
      _result(didWrite: true, embeddedUnicodeTextCount: 2),
    );

    expect(messages, contains('편집 가능한 PDF 주석은 PDF 앱마다 표시/편집 방식이 다를 수 있습니다.'));
  });

  test('explains Unicode font preflight failures without claiming success', () {
    expect(
      SheetAnnotatedPdfExportFeedback.failureMessage(
        _result(
          didWrite: false,
          failureReason:
              SheetAnnotatedPdfExportResult.unicodeFontMissingGlyphsReason,
        ),
      ),
      '선택한 PDF 글꼴이 일부 한글/음악 기호를 지원하지 않습니다. 일반 사본을 선택해주세요.',
    );
    expect(
      SheetAnnotatedPdfExportFeedback.failureMessage(
        _result(
          didWrite: false,
          failureReason: SheetAnnotatedPdfExportResult
              .unicodeFontProjectedOutputTooLargeReason,
        ),
      ),
      '글꼴을 포함하면 PDF가 너무 커질 수 있어 내보내지 않았습니다. 일반 사본을 선택해주세요.',
    );
  });

  test('preserves rendered-copy skipped Unicode feedback', () {
    final messages = SheetAnnotatedPdfExportFeedback.successMessages(
      _result(
        didWrite: true,
        mode: SheetPdfAnnotationExportMode.renderedStamp,
        skippedUnicodeTextCount: 1,
      ),
    );

    expect(messages, ['1개 한글 텍스트 주석은 PDF 사본에서 제외했습니다.']);
  });
}

SheetAnnotatedPdfExportResult _result({
  required bool didWrite,
  SheetPdfAnnotationExportMode mode =
      SheetPdfAnnotationExportMode.standardAnnotation,
  String? failureReason,
  int skippedUnicodeTextCount = 0,
  int embeddedUnicodeTextCount = 0,
  int unembeddedUnicodeTextCount = 0,
}) {
  return SheetAnnotatedPdfExportResult(
    inputPath: '/input.pdf',
    outputPath: didWrite ? '/output.pdf' : null,
    pageCount: 1,
    strokeCount: 0,
    textCount: 1,
    exportedTextCount: didWrite ? 1 : 0,
    skippedUnicodeTextCount: skippedUnicodeTextCount,
    didWrite: didWrite,
    mode: mode,
    failureReason: failureReason,
    embeddedUnicodeTextCount: embeddedUnicodeTextCount,
    unembeddedUnicodeTextCount: unembeddedUnicodeTextCount,
  );
}
