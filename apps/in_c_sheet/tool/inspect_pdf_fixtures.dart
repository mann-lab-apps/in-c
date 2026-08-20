import 'dart:io';

import 'package:pdfrx_engine/pdfrx_engine.dart';

const _fixturePaths = <String>[
  'test-fixtures/pdfs/short-score.pdf',
  'test-fixtures/pdfs/long-scan-like-score.pdf',
  'test-fixtures/pdfs/link-annotation-score.pdf',
];

Future<void> main() async {
  await pdfrxInitialize(tmpPath: '.dart_tool/pdfrx-inspect-cache');

  for (final path in _fixturePaths) {
    final document = await PdfDocument.openFile(path);
    try {
      stdout.writeln('$path: ${document.pages.length} pages');
      for (final page in document.pages) {
        final links = await page.loadLinks(
          compact: true,
          enableAutoLinkDetection: false,
        );
        if (links.isNotEmpty) {
          stdout.writeln('  page ${page.pageNumber}: ${links.length} link(s)');
          for (final link in links) {
            stdout.writeln('    url=${link.url} rects=${link.rects}');
          }
        }
      }
    } finally {
      await document.dispose();
    }
  }
}
