import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:pdfrx/pdfrx.dart';
import 'package:pdf_document/pdf_document.dart' as writer;
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/sheet_pdf_link_sanitizer.dart';

import 'score_r2_viewer_test.dart' as viewer;

const uris = [
  'https://example.invalid/score',
  'mailto:player@example.invalid',
  'tel:+15555550100',
  'intent://score',
  'custom:score',
  'file:///private/score.pdf',
  'javascript:alert(1)',
  'data:text/plain,score',
];

Future<File> fixture(Directory dir) async {
  final document = writer.PdfDocument.open(
    await File('test-fixtures/pdfs/short-score.pdf').readAsBytes(),
  );
  final editor = writer.PdfEditor(document);
  for (final (i, uri) in uris.indexed) {
    editor.addLinkToUri(0, [
      writer.PdfRect(30, 400 + i * 20, 200, 418 + i * 20),
    ], uri: uri);
  }
  editor.addLinkToPage(0, [
    const writer.PdfRect(30, 300, 200, 320),
  ], targetPage: 2);
  return File('${dir.path}/mixed-links.pdf').writeAsBytes(editor.save());
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() async {
    Pdfrx.cacheDirectoryPath = Directory.systemTemp.path;
    await pdfrxFlutterInitialize();
  });
  test('sanitized copy removes URI links and retains internal destination and original', () async {
    final dir = await Directory.systemTemp.createTemp('score-mixed-links-');
    addTearDown(() => dir.delete(recursive: true));
    final file = await fixture(dir);
    final original = await file.readAsBytes();
    final before = await SheetPdfLinkSanitizer.inspectFile(file.path);
    expect(before.urlLinkCount, uris.length);
    expect(before.internalLinkCount, 1);
    final result = await SheetPdfLinkSanitizer.createSanitizedCopy(
      inputPath: file.path,
      outputPath: '${dir.path}/copy.pdf',
    );
    expect(result.didWrite, isTrue);
    final after = await SheetPdfLinkSanitizer.inspectFile(result.outputPath!);
    expect(after.urlLinkCount, 0);
    expect(after.internalLinkCount, 1);
    expect(after.pageCount, 3);
    expect(await file.readAsBytes(), original);
    expect((await dir.list().toList()).length, 2);
  });

  testWidgets(
    'real PDF links reach the viewer block policy and internal links still navigate',
    (t) async {
      final c = await viewer.openPdf(t);
      final dir = await t.runAsync(
        () => Directory.systemTemp.createTemp('score-viewer-links-'),
      );
      addTearDown(() => dir!.delete(recursive: true));
      final file = await t.runAsync(() => fixture(dir!));
      final bytes = await t.runAsync(() => file!.readAsBytes());
      await c.store.saveScores(
        c.scores.map((s) => s.copyWith(filePath: file!.path)).toList(),
      );
      await c.load();
      await t.runAsync(() => t.pump(const Duration(milliseconds: 400)));
      await viewer.waitForPdf(t, 3);
      final doc = viewer.pdf(t).document;
      final links = await t.runAsync(
        () => doc.pages.first.loadLinks(enableAutoLinkDetection: false),
      );
      final external = links!.where((link) => link.url != null).toList();
      expect(external, hasLength(uris.length));
      void activate(PdfLink link) => t
          .widget<PdfViewer>(find.byType(PdfViewer))
          .params
          .linkHandlerParams!
          .onLinkTap(link);
      for (final link in external) {
        activate(link);
        await t.pumpAndSettle();
        expect(find.text('외부 PDF 링크를 차단했습니다.'), findsOneWidget);
        expect(viewer.pdf(t).pageNumber, 1);
      }
      final internal = links.singleWhere((link) => link.dest != null);
      activate(internal);
      await t.pumpAndSettle();
      expect(viewer.pdf(t).pageNumber, 3);
      expect(c.scoreById('pilot-0').filePath, file!.path);
      expect(await t.runAsync(() => file.readAsBytes()), bytes);
      expect(find.byType(SheetViewerScreen), findsOneWidget);
      expect(t.takeException(), isNull);
    },
  );
}
