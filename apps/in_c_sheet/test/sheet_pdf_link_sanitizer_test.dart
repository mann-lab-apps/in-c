import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_pdf_link_sanitizer.dart';

void main() {
  const linkFixturePath = 'test-fixtures/pdfs/link-annotation-score.pdf';
  const shortFixturePath = 'test-fixtures/pdfs/short-score.pdf';

  test('inspects URL link annotations in fixture PDF', () async {
    final inspection = await SheetPdfLinkSanitizer.inspectFile(linkFixturePath);

    expect(inspection.pageCount, 3);
    expect(inspection.urlLinkCount, greaterThan(0));
    expect(inspection.urlLinks.single.pageNumber, 1);
    expect(inspection.urlLinks.single.url.scheme, startsWith('http'));
  });

  test('reports no URL links for short fixture PDF', () async {
    final inspection = await SheetPdfLinkSanitizer.inspectFile(
      shortFixturePath,
    );

    expect(inspection.pageCount, 3);
    expect(inspection.urlLinkCount, 0);
  });

  test(
    'creates copy without URL link annotations and preserves original',
    () async {
      final originalBytes = await File(linkFixturePath).readAsBytes();
      final tempDir = await Directory.systemTemp.createTemp(
        'clef-link-sanitizer-',
      );
      addTearDown(() async {
        if (tempDir.existsSync()) {
          await tempDir.delete(recursive: true);
        }
      });
      final outputPath =
          '${tempDir.path}/link-annotation-score-links-disabled.pdf';

      final result = await SheetPdfLinkSanitizer.createSanitizedCopy(
        inputPath: linkFixturePath,
        outputPath: outputPath,
      );
      final sanitized = await SheetPdfLinkSanitizer.inspectFile(outputPath);
      final afterOriginalBytes = await File(linkFixturePath).readAsBytes();

      expect(result.didWrite, isTrue);
      expect(result.originalUrlLinkCount, greaterThan(0));
      expect(result.removedUrlLinkCount, result.originalUrlLinkCount);
      expect(result.remainingUrlLinkCount, 0);
      expect(result.removedAllUrlLinks, isTrue);
      expect(result.pageCount, 3);
      expect(sanitized.pageCount, 3);
      expect(sanitized.urlLinkCount, 0);
      expect(afterOriginalBytes, originalBytes);
    },
  );

  test('does not write a copy when PDF has no URL links', () async {
    final tempDir = await Directory.systemTemp.createTemp(
      'clef-link-sanitizer-empty-',
    );
    addTearDown(() async {
      if (tempDir.existsSync()) {
        await tempDir.delete(recursive: true);
      }
    });
    final outputPath = '${tempDir.path}/short-score-links-disabled.pdf';

    final result = await SheetPdfLinkSanitizer.createSanitizedCopy(
      inputPath: shortFixturePath,
      outputPath: outputPath,
    );

    expect(result.didWrite, isFalse);
    expect(result.outputPath, isNull);
    expect(result.removedAllUrlLinks, isFalse);
    expect(File(outputPath).existsSync(), isFalse);
  });
}
