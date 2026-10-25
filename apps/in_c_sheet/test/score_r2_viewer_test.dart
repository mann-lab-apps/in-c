import 'dart:io';
import 'dart:async';
import 'dart:convert';
import 'dart:ui' as ui;

import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/presentation/score_viewer_components.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:pdfrx/pdfrx.dart';

import 'adoption_pilot_test.dart' as pilot;

Future<void> waitForPdf(WidgetTester tester, int pages) async {
  for (var attempt = 0; attempt < 150; attempt++) {
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 40)),
    );
    await tester.runAsync(() => tester.pump(const Duration(milliseconds: 40)));
    final viewer = find.byType(PdfViewer);
    if (viewer.evaluate().isNotEmpty) {
      final controller = tester.widget<PdfViewer>(viewer).controller!;
      final chrome = find.byType(ScoreViewerChrome);
      if (controller.isReady &&
          controller.pageCount == pages &&
          chrome.evaluate().isNotEmpty &&
          tester.widget<ScoreViewerChrome>(chrome).documentReady) {
        await tester.pump(const Duration(milliseconds: 100));
        return;
      }
    }
  }
  fail(
    'Real PDF engine did not become ready for $pages pages. '
    'PDF widgets: ${find.byType(PdfViewer).evaluate().length}. '
    'Visible state: ${find.byType(Text).evaluate().map((e) => (e.widget as Text).data).join(" | ")}',
  );
}

Future<void> waitForNativePdf(WidgetTester tester, int pages) async {
  for (var attempt = 0; attempt < 150; attempt++) {
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 40)),
    );
    await tester.pump(const Duration(milliseconds: 40));
    final viewer = find.byType(PdfViewer);
    if (viewer.evaluate().isNotEmpty) {
      final controller = tester.widget<PdfViewer>(viewer).controller!;
      if (controller.isReady && controller.pageCount == pages) return;
    }
  }
  fail('Native PDF engine did not recover after the viewer layout changed');
}

PdfViewerController pdf(WidgetTester t) =>
    t.widget<PdfViewer>(find.byType(PdfViewer)).controller!;

Future<SheetLibraryController> openPdf(
  WidgetTester t, {
  String fixture = 'short-score.pdf',
  double width = 390,
  double height = 1000,
  double scale = 1,
  bool dark = false,
  SheetLibraryStore? store,
}) async {
  final c = await pilot.library(store: store);
  final file = File('test-fixtures/pdfs/$fixture').absolute;
  await c.store.saveScores(
    c.scores.map((s) => s.copyWith(filePath: file.path)).toList(),
  );
  await c.load();
  await c.updateViewerSettings(
    c.scoreById('pilot-0'),
    c
        .scoreById('pilot-0')
        .viewerSettings
        .copyWith(showPerformancePrepNotice: false),
  );
  await pilot.mount(t, c, width: width, scale: scale, dark: dark);
  t.view.physicalSize = Size(width, height);
  t
      .state<NavigatorState>(find.byType(Navigator).first)
      .push<void>(
        MaterialPageRoute(
          builder: (_) => SheetViewerScreen(controller: c, scoreId: 'pilot-0'),
        ),
      );
  // Native range reads (>1MB) register FFI callbacks. Create their async chain
  // outside the test's fake clock, without substituting a PDF renderer or file.
  await t.runAsync(() => t.pump(const Duration(milliseconds: 400)));
  await waitForPdf(t, fixture.startsWith('long-') ? 90 : 3);
  addTearDown(() async {
    await t.pumpWidget(const SizedBox());
    await t.pump(const Duration(milliseconds: 200));
    c.dispose();
  });
  return c;
}

Future<void> command(WidgetTester t, String label) async {
  final finder = find.byWidgetPredicate(
    (w) => w is DdiroriButton && w.label == label,
  );
  await t.ensureVisible(finder);
  await t.pumpAndSettle();
  expect(
    t.widget<DdiroriButton>(finder).onPressed,
    isNotNull,
    reason: '$label must be enabled',
  );
  await t.tap(finder);
  await t.pumpAndSettle();
}

Future<void> capture(WidgetTester t, String name) async {
  if (Platform.environment['DDIRORI_SCORE_R2_CAPTURE'] != 'true') return;
  expect(Platform.environment['DDIRORI_BRAND_FONT'], isNotEmpty);
  final viewer = pdf(t);
  final page = viewer.pages[(viewer.pageNumber ?? 1) - 1];
  final layout = viewer.layout.pageLayouts[page.pageNumber - 1];
  final paper = Rect.fromPoints(
    viewer.documentToGlobal(layout.topLeft)!,
    viewer.documentToGlobal(layout.bottomRight)!,
  );
  final viewport = t.getRect(find.byType(PdfViewer));
  // The interior excludes toolbar/footer glyphs; ink must come from the live PDF.
  final inkArea = Rect.fromLTRB(
    paper.left + paper.width * .15,
    paper.top + paper.height * .15,
    paper.right - paper.width * .15,
    paper.top + paper.height * .7,
  ).intersect(viewport);
  final boundary = t.renderObject<RenderRepaintBoundary>(
    find.byKey(const Key('pilot-capture')),
  );
  int ink = 0;
  for (var attempt = 0; attempt < 60; attempt++) {
    await t.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 40)),
    );
    await t.pump(const Duration(milliseconds: 40));
    ink = (await t.runAsync(() async {
      final image = await boundary.toImage(pixelRatio: 1);
      final bytes = (await image.toByteData())!.buffer.asUint8List();
      var count = 0;
      for (
        var y = inkArea.top.ceil().clamp(0, image.height);
        y < inkArea.bottom.floor().clamp(0, image.height);
        y += 2
      ) {
        for (
          var x = inkArea.left.ceil().clamp(0, image.width);
          x < inkArea.right.floor().clamp(0, image.width);
          x += 2
        ) {
          final i = (y * image.width + x) * 4;
          if (bytes[i] < 110 && bytes[i + 1] < 110 && bytes[i + 2] < 110) {
            count++;
          }
        }
      }
      image.dispose();
      return count;
    }))!;
    if (ink > 25) break;
  }
  final minimumInk = t.view.physicalSize.height < 500 ? 8 : 25;
  expect(
    ink,
    greaterThan(minimumInk),
    reason: 'Actual PDF ink must be visible in the paper interior',
  );
  await t.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 1);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    final dir = Directory(
      '../../docs/brand/ddirori-design-system/product-design-r2/returns/score-r2-20261025/screens',
    );
    await dir.create(recursive: true);
    await File('${dir.path}/$name.png')
        .writeAsBytes(bytes!.buffer.asUint8List());
    await File('${dir.path}/$name.json').writeAsString(
      jsonEncode({
        'state': name,
        'renderer': 'actual InCSheetApp + pdfrx/PDFium native engine; Flutter widget renderer',
        'fixture': viewer.document.sourceName,
        'page': page.pageNumber,
        'pages': viewer.pageCount,
        'ink_samples': ink,
        'viewport': [t.view.physicalSize.width, t.view.physicalSize.height],
        'dpr': 1,
        'text_scale': t.platformDispatcher.textScaleFactor,
        'theme': Theme.of(t.element(find.byType(PdfViewer))).brightness.name,
        'implementation': 'uncommitted at capture',
      }),
    );
    image.dispose();
  });
}

Offset paperPoint(WidgetTester t, double x, double y) {
  final controller = pdf(t);
  final page = controller.layout.pageLayouts[(controller.pageNumber ?? 1) - 1];
  return controller.documentToGlobal(
    Offset(page.left + page.width * x, page.top + page.height * y),
  )!;
}

Future<void> draw(WidgetTester t) async {
  final start = paperPoint(t, .3, .4);
  final end = paperPoint(t, .5, .4);
  expect(t.getRect(find.byType(PdfViewer)).contains(start), isTrue);
  await t.dragFrom(start, end - start);
  await t.pump(const Duration(milliseconds: 100));
}

Future<void> waitForMissingPdf(WidgetTester t) async {
  for (var attempt = 0; attempt < 40; attempt++) {
    await t.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 25)),
    );
    await t.pump(const Duration(milliseconds: 25));
    if (find.byType(PdfViewer).evaluate().isEmpty) return;
  }
  fail('Missing PDF state did not replace the previous document');
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() async {
    Pdfrx.cacheDirectoryPath = Directory.systemTemp.path;
    await pdfrxFlutterInitialize();
  });

  for (final scene in [
    (390.0, 1000.0, 1.0, false),
    (840.0, 1000.0, 1.0, true),
    (840.0, 390.0, 1.0, false),
    (390.0, 1000.0, 2.0, true),
  ]) {
    testWidgets('real PDF R2 read annotate practice perform $scene', (t) async {
      final c = await openPdf(
        t,
        width: scene.$1,
        height: scene.$2,
        scale: scene.$3,
        dark: scene.$4,
      );
      final name =
          '${scene.$1.toInt()}x${scene.$2.toInt()}-${scene.$3.toInt()}-${scene.$4 ? 'dark' : 'light'}';
      final originalPdfState = t.state(find.byType(PdfViewer));
      final originalDocument = pdf(t).document;
      await capture(t, 'read-$name');
      await command(t, '주석');
      expect(find.byType(ScoreAnnotationSummary), findsOneWidget);
      expect(t.state(find.byType(PdfViewer)), same(originalPdfState));
      expect(pdf(t).document, same(originalDocument));
      await command(t, '펜 옵션');
      expect(find.text('주석 옵션'), findsOneWidget);
      expect(find.text('지우개'), findsOneWidget);
      expect(find.text('스탬프'), findsOneWidget);
      await command(t, '닫기');
      expect(
        FocusManager.instance.primaryFocus?.debugLabel,
        'Score annotation options',
      );
      await capture(t, 'annotation-$name');
      await command(t, '연습');
      expect(find.text('연습 도구'), findsOneWidget);
      expect(find.text('연결 음원'), findsOneWidget);
      await t.binding.handlePopRoute();
      await t.runAsync(() => t.pumpAndSettle());
      expect(pdf(t).document, same(originalDocument));
      expect(
        c.scoreById('pilot-0').viewerSettings.showPerformancePrepNotice,
        isFalse,
      );
      await command(t, '공연');
      await t.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 10)),
      );
      await t.pumpAndSettle();
      expect(
        t.widget<ScoreViewerChrome>(find.byType(ScoreViewerChrome)).performance,
        isTrue,
      );
      await capture(t, 'performance-$name');
      await command(t, '공연 종료');
      await t.tap(find.byTooltip('도구 숨기기'));
      await t.pumpAndSettle();
      expect(find.byType(ScoreViewerChrome), findsNothing);
      expect(find.byTooltip('다음 페이지'), findsOneWidget);
      await t.tap(find.byTooltip('도구 다시 표시'));
      await t.pumpAndSettle();
      expect(pdf(t).document, same(originalDocument));
      expect(t.state(find.byType(PdfViewer)), same(originalPdfState));
      await t.tap(find.byTooltip('다음 페이지'));
      await t.pumpAndSettle();
      expect(pdf(t).pageNumber, 2);
      expect(c.scoreById('pilot-0').lastPage, 2);
      expect(t.takeException(), isNull);
    });
  }

  testWidgets(
    'real PDF annotation pending failure retry and undo preserve file and coordinates',
    (t) async {
      final store = pilot.PendingStore();
      final c = await openPdf(t, store: store);
      final source = File(c.scoreById('pilot-0').filePath);
      final original = await t.runAsync(source.readAsBytes);
      final document = pdf(t).document;
      await command(t, '주석');
      store.gate = Completer<void>();
      await draw(t);
      expect(find.text('주석 저장 중'), findsOneWidget);
      expect(c.scoreById('pilot-0').annotationLayer.strokes, isEmpty);
      expect(
        t
            .widget<ScoreAnnotationSummary>(find.byType(ScoreAnnotationSummary))
            .onUndo,
        isNull,
      );
      await t.binding.handlePopRoute();
      await t.pump();
      expect(find.byType(SheetViewerScreen), findsOneWidget);
      await draw(t);
      expect(store.pendingWrites, 1);
      store.gate!.completeError(StateError('injected disk write failure'));
      await t.pumpAndSettle();
      expect(find.text('주석 다시 저장'), findsOneWidget);
      expect(c.scoreById('pilot-0').annotationLayer.strokes, isEmpty);
      store.gate = null;
      await command(t, '주석 다시 저장');
      final stroke = c.scoreById('pilot-0').annotationLayer.strokes.single;
      expect(stroke.pageNumber, 1);
      expect(stroke.points.last.x, closeTo(.5, .025));
      expect(stroke.points.last.y, closeTo(.4, .025));
      expect(pdf(t).document, same(document));
      await capture(t, 'annotation-saved-real-pdf');
      await t.tap(find.byTooltip('마지막 필기 취소'));
      await t.pumpAndSettle();
      expect(c.scoreById('pilot-0').annotationLayer.strokes, isEmpty);
      await t.tap(find.byTooltip('마지막 필기 다시 적용'));
      await t.pumpAndSettle();
      expect(c.scoreById('pilot-0').annotationLayer.strokes.single, stroke);
      await c.load();
      await t.pumpAndSettle();
      expect(
        c.scoreById('pilot-0').annotationLayer.strokes.single.toJson(),
        stroke.toJson(),
      );
      expect(await t.runAsync(source.readAsBytes), orderedEquals(original!));
      expect(t.takeException(), isNull);
    },
  );

  testWidgets(
    'long scan PDF page mapping crop zoom and toolbar keyboard focus',
    (t) async {
      final c = await openPdf(
        t,
        fixture: 'long-scan-like-score.pdf',
        width: 840,
      );
      final document = pdf(t).document;
      final crop = const SheetCropSettings(
        left: .03,
        right: .03,
        top: .02,
        bottom: .02,
      );
      await c.updatePageCrop(c.scoreById('pilot-0'), crop);
      await t.pumpAndSettle();
      await pdf(t).goToPage(pageNumber: 60, duration: Duration.zero);
      await t.pumpAndSettle();
      expect(pdf(t).pageNumber, 60);
      await t.tap(find.byTooltip('도구 숨기기'));
      await t.pumpAndSettle();
      await waitForNativePdf(t, 90);
      final previous = find.byTooltip('이전 페이지');
      final previousButton = find.ancestor(
        of: previous,
        matching: find.byType(IconButton),
      );
      expect(t.widget<IconButton>(previousButton).onPressed, isNotNull);
      await t.tap(previous);
      await t.pumpAndSettle();
      expect(pdf(t).pageNumber, 59);
      await t.tap(find.byTooltip('도구 다시 표시'));
      await t.pumpAndSettle();
      expect(pdf(t).document, same(document));
      expect(pdf(t).currentZoom, greaterThan(0));
      expect(c.scoreById('pilot-0').pageSettings.crop.toJson(), crop.toJson());
      await capture(t, 'long-scan-90-page59');
      expect(c.scoreById('pilot-0').lastPage, 59);
      expect(t.takeException(), isNull);
    },
  );

  testWidgets('viewer keyboard page turn works while tools own focus', (
    t,
  ) async {
    final c = await openPdf(t);
    await t.sendKeyEvent(LogicalKeyboardKey.pageDown);
    await t.pumpAndSettle();
    expect(pdf(t).pageNumber, 2);
    expect(c.scoreById('pilot-0').lastPage, 2);
    expect(t.takeException(), isNull);
  });

  testWidgets(
    'old PDF callbacks cannot overwrite replacement or A-B-A document',
    (t) async {
      final c = await openPdf(t);
      final original = c.scoreById('pilot-0');
      final oldParams = t.widget<PdfViewer>(find.byType(PdfViewer)).params;
      Future<void> replace(String path) async {
        await c.store.saveScores(
          c.scores
              .map(
                (s) => s.id == original.id
                    ? s.copyWith(filePath: path, lastPage: 1)
                    : s,
              )
              .toList(),
        );
        await c.load();
        await t.pump(const Duration(milliseconds: 100));
      }

      await replace('/missing-r2.pdf');
      await waitForMissingPdf(t);
      expect(find.byType(PdfViewer), findsNothing);
      expect(
        t
            .widget<ScoreViewerChrome>(find.byType(ScoreViewerChrome))
            .documentReady,
        isFalse,
      );
      oldParams.onPageChanged?.call(3);
      await t.pump();
      expect(c.scoreById(original.id).lastPage, 1);
      await replace(
        File('test-fixtures/pdfs/link-annotation-score.pdf').absolute.path,
      );
      await waitForPdf(t, 3);
      oldParams.onPageChanged?.call(3);
      await t.pump();
      expect(c.scoreById(original.id).lastPage, 1);
      await replace(original.filePath);
      await waitForPdf(t, 3);
      oldParams.onPageChanged?.call(3);
      await t.pump();
      expect(c.scoreById(original.id).lastPage, 1);
      expect(pdf(t).pageNumber, 1);
      expect(t.takeException(), isNull);
    },
  );
}
