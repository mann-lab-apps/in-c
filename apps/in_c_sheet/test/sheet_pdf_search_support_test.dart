import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_pdf_search_support.dart';

void main() {
  test('builds embedded text search index manifest', () {
    final indexedAt = DateTime.parse('2026-08-28T10:00:00.000');
    final manifest = SheetPdfSearchIndexManifest.embeddedText(
      scoreId: 'score-1',
      filePath: '/tmp/score.pdf',
      pageCount: 3,
      indexedAt: indexedAt,
    );

    final decoded = SheetPdfSearchIndexManifest.fromJson(manifest.toJson());

    expect(decoded.version, SheetPdfSearchSupport.indexFormatVersion);
    expect(decoded.scoreId, 'score-1');
    expect(decoded.filePath, '/tmp/score.pdf');
    expect(decoded.pageCount, 3);
    expect(decoded.indexedAt, indexedAt);
    expect(decoded.isEmbeddedTextIndex, isTrue);
    expect(decoded.requiresOcr, isFalse);
  });

  test('builds OCR unsupported search index manifest', () {
    final indexedAt = DateTime.parse('2026-08-28T10:00:00.000');
    final manifest = SheetPdfSearchIndexManifest.ocrUnsupported(
      scoreId: 'scan-1',
      filePath: '/tmp/scan.pdf',
      pageCount: 90,
      indexedAt: indexedAt,
    );

    expect(manifest.isOcrUnsupported, isTrue);
    expect(manifest.requiresOcr, isTrue);
    expect(manifest.failureReason, SheetPdfSearchSupport.ocrUnsupportedHint);
    expect(
      SheetPdfSearchIndexManifest.fromJson(<String, Object?>{
        'scoreId': 'scan-1',
        'filePath': '/tmp/scan.pdf',
        'engine': SheetPdfSearchSupport.ocrUnsupportedEngine,
        'pageCount': '-7',
        'indexedAt': 'bad-date',
        'requiresOcr': true,
      }).pageCount,
      0,
    );
  });
}
