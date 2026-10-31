import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_pdf_link_sanitizer.dart';

void main() {
  const linkFixturePath = 'test-fixtures/pdfs/link-annotation-score.pdf';
  const shortFixturePath = 'test-fixtures/pdfs/short-score.pdf';

  for (final alias in ['same', 'normalized', 'symlink']) {
    test('refuses $alias output alias without changing the original', () async {
      final dir = await Directory.systemTemp.createTemp('score-link-alias-');
      addTearDown(() => dir.delete(recursive: true));
      final input = await File(linkFixturePath)
          .copy('${dir.path}/original.pdf');
      final bytes = await input.readAsBytes();
      final String output;
      if (alias == 'symlink') {
        output = '${dir.path}/alias.pdf';
        await Link(output).create(input.path);
      } else if (alias == 'normalized') {
        await Directory('${dir.path}/nested').create();
        output = '${dir.path}/nested/../original.pdf';
      } else {
        output = input.path;
      }
      final result = await SheetPdfLinkSanitizer.createSanitizedCopy(
        inputPath: input.path,
        outputPath: output,
      );
      expect(result.didWrite, isFalse);
      expect(result.failureReason, isNotNull);
      expect(await input.readAsBytes(), bytes);
      expect(
        (await SheetPdfLinkSanitizer.inspectFile(input.path)).urlLinkCount,
        greaterThan(0),
      );
    });
  }

  test('malformed aliased input is not deleted by failure cleanup', () async {
    final dir = await Directory.systemTemp.createTemp(
      'score-link-invalid-alias-',
    );
    addTearDown(() => dir.delete(recursive: true));
    final input = File('${dir.path}/broken.pdf');
    final bytes = '%PDF-1.7\nbroken'.codeUnits;
    await input.writeAsBytes(bytes);
    final result = await SheetPdfLinkSanitizer.createSanitizedCopy(
      inputPath: input.path,
      outputPath: input.path,
    );
    expect(result.didWrite, isFalse);
    expect(await input.readAsBytes(), bytes);
  });

  test(
    'existing destination remains untouched on a valid copy request',
    () async {
      final dir = await Directory.systemTemp.createTemp('score-link-existing-');
      addTearDown(() => dir.delete(recursive: true));
      final output = await File(shortFixturePath)
          .copy('${dir.path}/existing.pdf');
      final bytes = await output.readAsBytes();
      final result = await SheetPdfLinkSanitizer.createSanitizedCopy(
        inputPath: linkFixturePath,
        outputPath: output.path,
      );
      expect(result.didWrite, isFalse);
      expect(await output.readAsBytes(), bytes);
    },
  );

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

  test('rejects non-PDF input without leaving an output file', () async {
    final tempDir = await Directory.systemTemp.createTemp(
      'clef-link-sanitizer-non-pdf-',
    );
    addTearDown(() async {
      if (tempDir.existsSync()) {
        await tempDir.delete(recursive: true);
      }
    });
    final inputPath = '${tempDir.path}/notes.txt';
    final outputPath = '${tempDir.path}/notes-links-disabled.pdf';
    await File(inputPath).writeAsString('not a pdf');

    final result = await SheetPdfLinkSanitizer.createSanitizedCopy(
      inputPath: inputPath,
      outputPath: outputPath,
    );

    expect(result.didWrite, isFalse);
    expect(result.failureReason, contains('PDF'));
    expect(File(outputPath).existsSync(), isFalse);
  });

  test('fails safely for malformed PDF bytes', () async {
    final tempDir = await Directory.systemTemp.createTemp(
      'clef-link-sanitizer-malformed-',
    );
    addTearDown(() async {
      if (tempDir.existsSync()) {
        await tempDir.delete(recursive: true);
      }
    });
    final inputPath = '${tempDir.path}/broken-camscanner.pdf';
    final outputPath = '${tempDir.path}/broken-links-disabled.pdf';
    await File(inputPath).writeAsBytes(<int>[
      0x25,
      0x50,
      0x44,
      0x46,
      0x2d,
      0x31,
      0x2e,
      0x37,
      0x0a,
      0x62,
      0x72,
      0x6f,
      0x6b,
      0x65,
      0x6e,
    ]);

    final result = await SheetPdfLinkSanitizer.createSanitizedCopy(
      inputPath: inputPath,
      outputPath: outputPath,
    );

    expect(result.didWrite, isFalse);
    expect(result.failureReason, isNotNull);
    expect(File(outputPath).existsSync(), isFalse);
  });

  test('preserves an existing destination when input parsing fails', () async {
    final tempDir = await Directory.systemTemp.createTemp(
      'clef-link-sanitizer-partial-',
    );
    addTearDown(() async {
      if (tempDir.existsSync()) {
        await tempDir.delete(recursive: true);
      }
    });
    final inputPath = '${tempDir.path}/broken-camscanner.pdf';
    final outputPath = '${tempDir.path}/broken-links-disabled.pdf';
    await File(inputPath).writeAsBytes(<int>[
      0x25,
      0x50,
      0x44,
      0x46,
      0x2d,
      0x31,
      0x2e,
      0x37,
      0x0a,
      0x62,
      0x72,
      0x6f,
      0x6b,
      0x65,
      0x6e,
    ]);
    await File(outputPath).writeAsString('partial output');

    final result = await SheetPdfLinkSanitizer.createSanitizedCopy(
      inputPath: inputPath,
      outputPath: outputPath,
    );

    expect(result.didWrite, isFalse);
    expect(result.failureReason, isNotNull);
    expect(await File(outputPath).readAsString(), 'partial output');
  });
}
