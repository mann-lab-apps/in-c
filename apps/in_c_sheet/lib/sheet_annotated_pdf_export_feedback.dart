import 'sheet_annotated_pdf_exporter.dart';

class SheetAnnotatedPdfExportFeedback {
  const SheetAnnotatedPdfExportFeedback._();

  static String failureMessage(SheetAnnotatedPdfExportResult result) {
    if (result.requiresUnicodeFontEmbedding) {
      return '한글 텍스트 주석은 PDF 사본에 포함되지 않아 원본 PDF를 공유합니다.';
    }
    if (result.hasOnlyAnnotationsOutsideDocumentPages) {
      return '현재 PDF 페이지 범위 안에 내보낼 필기가 없습니다.';
    }
    if (result.hasUnsupportedStandardAnnotationObjectMapping) {
      return '편집 가능한 PDF 주석으로 내보낼 수 있는 필기가 없습니다. 일반 사본을 선택해주세요.';
    }
    return switch (result.failureReason) {
      SheetAnnotatedPdfExportResult.unicodeFontUnavailableReason =>
        '한글/음악 기호를 포함할 PDF 글꼴을 준비하지 못했습니다. 일반 사본을 선택해주세요.',
      SheetAnnotatedPdfExportResult.unicodeFontInvalidReason =>
        'PDF에 포함할 글꼴 파일을 읽지 못했습니다. 일반 사본을 선택해주세요.',
      SheetAnnotatedPdfExportResult.unicodeFontTooLargeReason ||
      SheetAnnotatedPdfExportResult.unicodeFontProjectedOutputTooLargeReason =>
        '글꼴을 포함하면 PDF가 너무 커질 수 있어 내보내지 않았습니다. 일반 사본을 선택해주세요.',
      SheetAnnotatedPdfExportResult.unicodeFontMissingGlyphsReason =>
        '선택한 PDF 글꼴이 일부 한글/음악 기호를 지원하지 않습니다. 일반 사본을 선택해주세요.',
      _ => '필기 포함 PDF를 만들지 못했습니다. 원본 PDF와 앱 안 필기는 유지됩니다.',
    };
  }

  static List<String> successMessages(SheetAnnotatedPdfExportResult result) {
    final messages = <String>[];
    if (result.skippedUnicodeTextCount > 0) {
      messages.add(
        '${result.skippedUnicodeTextCount}개 한글 텍스트 주석은 PDF 사본에서 제외했습니다.',
      );
    }
    if (result.mode == SheetPdfAnnotationExportMode.standardAnnotation) {
      if (result.unembeddedUnicodeTextCount > 0) {
        messages.add(
          '${result.unembeddedUnicodeTextCount}개 한글/음악 기호 주석은 글꼴을 포함하지 않아 PDF 앱마다 다르게 보일 수 있습니다.',
        );
      } else {
        messages.add('편집 가능한 PDF 주석은 PDF 앱마다 표시/편집 방식이 다를 수 있습니다.');
      }
    }
    return List.unmodifiable(messages);
  }
}
