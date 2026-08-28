import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_pdf_search_support.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:pdf_document/pdf_document.dart' as pdf_doc;

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

  test(
    'records OCR unsupported capability for image-only scan fixture',
    () async {
      final tempDir = await Directory.systemTemp.createTemp(
        'clef-image-only-scan-',
      );
      addTearDown(() async {
        if (tempDir.existsSync()) {
          await tempDir.delete(recursive: true);
        }
      });
      final scanPath = '${tempDir.path}/image-only-scan.pdf';
      final pdf = pw.Document();
      pdf.addPage(
        pw.Page(
          pageFormat: PdfPageFormat.a4,
          build: (_) => pw.Container(
            width: 420,
            height: 560,
            color: PdfColors.grey200,
            child: pw.Center(
              child: pw.Container(
                width: 180,
                height: 240,
                color: PdfColors.grey,
              ),
            ),
          ),
        ),
      );
      await File(scanPath).writeAsBytes(await pdf.save(), flush: true);
      final pageCount = pdf_doc.PdfDocument.open(
        await File(scanPath).readAsBytes(),
      ).pageCount;

      final manifest = SheetPdfSearchIndexManifest.ocrUnsupported(
        scoreId: 'scan-fixture',
        filePath: scanPath,
        pageCount: pageCount,
        indexedAt: DateTime.parse('2026-08-28T11:00:00.000'),
      );
      final decoded = SheetPdfSearchIndexManifest.fromJson(manifest.toJson());

      expect(pageCount, 1);
      expect(decoded.filePath, scanPath);
      expect(decoded.isOcrUnsupported, isTrue);
      expect(decoded.requiresOcr, isTrue);
      expect(decoded.failureReason, SheetPdfSearchSupport.ocrUnsupportedHint);
      expect(
        SheetPdfSearchSupport.embeddedTextOnlyHelper,
        contains('PDF 내부 텍스트'),
      );
      expect(SheetPdfSearchSupport.noResultStatus, contains('스캔 PDF'));
    },
  );
}
