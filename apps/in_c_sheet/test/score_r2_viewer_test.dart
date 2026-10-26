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
import 'package:in_c_sheet/sheet_metronome.dart';
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
  List<SheetLinkedFile> linkedFiles = const <SheetLinkedFile>[],
}) async {
  final c = await pilot.library(store: store);
  final file = File('test-fixtures/pdfs/$fixture').absolute;
  await c.store.saveScores(
    c.scores
        .map(
          (s) => s.copyWith(
            filePath: file.path,
            linkedFiles: linkedFiles.isEmpty ? s.linkedFiles : linkedFiles,
          ),
        )
        .toList(),
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

Finder compactViewerOptionsButton() => find.byWidgetPredicate(
  (widget) => widget is DdiroriButton && widget.label == '보기 옵션',
);

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
      expect(find.byType(DdiroriToolbar), findsOneWidget);
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

  testWidgets('real PDF linked audio uses the Ddirori playback sheet', (
    t,
  ) async {
    final audioFile = File(
      '${Directory.systemTemp.path}/ddirori-score-linked-audio-fixture.mp3',
    );
    await t.runAsync(() => audioFile.writeAsBytes(const <int>[0, 0, 0, 0]));
    addTearDown(() async {
      if (await audioFile.exists()) await audioFile.delete();
    });
    await openPdf(
      t,
      width: 390,
      height: 1000,
      scale: 2,
      linkedFiles: [
        SheetLinkedFile(
          path: audioFile.path,
          type: 'mp3',
          label: '연습용 반주',
          role: SheetLinkedFile.referenceRole,
          createdAt: DateTime(2026, 10, 26),
        ),
      ],
    );
    final originalDocument = pdf(t).document;

    await command(t, '연습');
    await command(t, '연결 음원');
    await command(t, '연습용 반주');
    await t.runAsync(() => Future<void>.delayed(Duration.zero));
    await t.pumpAndSettle();

    expect(find.text('연습용 반주'), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) => widget is DdiroriItem && widget.title == '연습용 반주',
      ),
      findsOneWidget,
    );
    expect(
      find.text('연습용 연결 음원 · ddirori-score-linked-audio-fixture.mp3'),
      findsOneWidget,
    );
    expect(
      find.byWidgetPredicate(
        (widget) => widget is DdiroriStatusBadge && widget.label == '재생 대기',
      ),
      findsOneWidget,
    );
    expect(
      find.byWidgetPredicate(
        (widget) => widget is DdiroriButton && widget.label == '재생',
      ),
      findsOneWidget,
    );
    expect(find.text(audioFile.path), findsNothing);
    expect(pdf(t).document, same(originalDocument));
    expect(t.takeException(), isNull);
  });

  testWidgets(
    'real PDF score parts keep file actions and paths scoped to Ddirori rows',
    (t) async {
      final partFile = File(
        '${Directory.systemTemp.path}/ddirori-score-violin-part-fixture.pdf',
      );
      final fixture = File('test-fixtures/pdfs/short-score.pdf').absolute;
      await t.runAsync(() => fixture.copy(partFile.path));
      addTearDown(() async {
        if (await partFile.exists()) await partFile.delete();
      });
      final c = await openPdf(
        t,
        width: 390,
        height: 1000,
        scale: 2,
        linkedFiles: [
          SheetLinkedFile(
            path: partFile.path,
            type: 'pdf',
            label: '바이올린 파트',
            role: SheetLinkedFile.partRole,
            createdAt: DateTime(2026, 10, 26),
          ),
        ],
      );
      final originalDocument = pdf(t).document;

      await command(t, '모든 도구');
      await t.tap(compactViewerOptionsButton());
      await t.pumpAndSettle();
      final scoreParts = find.byWidgetPredicate(
        (widget) => widget is DdiroriItem && widget.title == '파트/버전',
      );
      await t.ensureVisible(scoreParts);
      await t.tap(scoreParts);
      await t.pumpAndSettle();

      expect(find.text('파트와 연결 파일'), findsOneWidget);
      expect(find.text('원본 PDF를 수정하지 않고 현재 파일과 연결 파일만 전환합니다.'), findsOneWidget);
      expect(find.text('바이올린 파트'), findsOneWidget);
      expect(
        find.text('Part · ddirori-score-violin-part-fixture.pdf'),
        findsOneWidget,
      );
      expect(
        find.byWidgetPredicate(
          (widget) => widget is DdiroriStatusBadge && widget.label == '사용 가능',
        ),
        findsOneWidget,
      );
      expect(
        find.byWidgetPredicate(
          (widget) => widget is DdiroriButton && widget.label == '이 파일 열기',
        ),
        findsOneWidget,
      );
      expect(find.text(partFile.path), findsNothing);

      await t.ensureVisible(find.byTooltip('역할 변경'));
      await t.tap(find.byTooltip('역할 변경'));
      await t.pumpAndSettle();
      await t.tap(find.text('Reference'));
      await t.pumpAndSettle();

      expect(
        c.scoreById('pilot-0').linkedFiles.single.role,
        SheetLinkedFile.referenceRole,
      );
      expect(pdf(t).document, same(originalDocument));
      expect(t.takeException(), isNull);
    },
  );

  testWidgets('real PDF score notes save through Ddirori inputs', (t) async {
    final c = await openPdf(t, width: 390, height: 1000, scale: 2);
    final originalDocument = pdf(t).document;

    await command(t, '모든 도구');
    await t.tap(compactViewerOptionsButton());
    await t.pumpAndSettle();
    final scoreNotes = find.byWidgetPredicate(
      (widget) => widget is DdiroriItem && widget.title == '악보 메모',
    );
    await t.ensureVisible(scoreNotes);
    await t.tap(scoreNotes);
    await t.pumpAndSettle();

    expect(find.text('악보 메모'), findsOneWidget);
    expect(find.text('공연과 연습에 필요한 메모를 이 악보에만 저장합니다.'), findsOneWidget);
    final performanceField = find.descendant(
      of: find.byWidgetPredicate(
        (widget) => widget is DdiroriInput && widget.label == '공연 메모',
      ),
      matching: find.byType(TextField),
    );
    await t.enterText(performanceField, '조명 확인 뒤 바로 시작');
    final save = find.byWidgetPredicate(
      (widget) => widget is DdiroriButton && widget.label == '저장',
    );
    expect(save, findsOneWidget);
    await command(t, '저장');

    expect(c.scoreById('pilot-0').structuredNotes.performance, '조명 확인 뒤 바로 시작');
    expect(pdf(t).document, same(originalDocument));
    expect(t.takeException(), isNull);
  });

  testWidgets(
    'real PDF bookmarks use Ddirori rows without replacing navigation',
    (t) async {
      final c = await openPdf(t, width: 390, height: 1000, scale: 2);
      final originalDocument = pdf(t).document;

      await c.toggleBookmark(c.scoreById('pilot-0'), 1);
      await command(t, '모든 도구');
      await t.tap(compactViewerOptionsButton());
      await t.pumpAndSettle();
      final bookmarks = find.byWidgetPredicate(
        (widget) => widget is DdiroriItem && widget.title == '북마크 목록',
      );
      await t.ensureVisible(bookmarks);
      await t.tap(bookmarks);
      await t.pumpAndSettle();

      expect(find.text('북마크 목록'), findsOneWidget);
      expect(
        find.text('항목을 탭하면 해당 쪽으로 이동합니다. 이름 변경과 삭제는 각 항목의 더보기에서 할 수 있습니다.'),
        findsOneWidget,
      );
      expect(
        find.byWidgetPredicate(
          (widget) => widget is DdiroriItem && widget.title == '1쪽',
        ),
        findsOneWidget,
      );
      expect(
        find.byWidgetPredicate(
          (widget) => widget is DdiroriButton && widget.label == '이동',
        ),
        findsOneWidget,
      );

      await command(t, '이동');

      expect(c.scoreById('pilot-0').bookmarks, hasLength(1));
      expect(pdf(t).document, same(originalDocument));
      expect(t.takeException(), isNull);
    },
  );

  testWidgets('real PDF hidden-page management uses Ddirori rows', (t) async {
    final c = await openPdf(t, width: 1680, height: 2000, scale: 2);
    final originalDocument = pdf(t).document;
    expect(
      await c.hidePage(c.scoreById('pilot-0'), pageNumber: 2, pageCount: 3),
      isTrue,
    );
    await t.pumpAndSettle();

    await command(t, '모든 도구');
    expect(
      find.byWidgetPredicate(
        (widget) => widget is DdiroriItem && widget.title == '페이지 정리',
      ),
      findsOneWidget,
    );
    expect(
      find.byWidgetPredicate(
        (widget) => widget is DdiroriMenuButton && widget.label == '페이지 정리',
      ),
      findsOneWidget,
    );
    await t.tap(find.byTooltip('페이지 정리'));
    await t.pumpAndSettle();
    await t.tap(find.text('숨김 페이지 관리'));
    await t.pumpAndSettle();

    expect(find.text('숨긴 페이지'), findsOneWidget);
    expect(find.text('숨김을 해제하면 이 페이지를 다시 보고 해당 쪽으로 이동합니다.'), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) => widget is DdiroriItem && widget.title == '2쪽',
      ),
      findsOneWidget,
    );
    await command(t, '숨김 해제');

    expect(c.scoreById('pilot-0').pageSettings.hiddenPages, isEmpty);
    expect(pdf(t).document, same(originalDocument));
    expect(t.takeException(), isNull);
  });

  testWidgets(
    'real PDF page order uses Ddirori actions without editing the PDF',
    (t) async {
      final c = await openPdf(t, width: 1680, height: 2000, scale: 2);
      final originalDocument = pdf(t).document;

      await command(t, '모든 도구');
      await t.tap(find.byTooltip('페이지 정리'));
      await t.pumpAndSettle();
      await t.tap(find.text('페이지 순서/복제'));
      await t.pumpAndSettle();

      expect(find.text('페이지 순서/복제'), findsOneWidget);
      expect(find.text('이 순서는 앱에서만 바뀌며 원본 PDF 파일은 수정하지 않습니다.'), findsOneWidget);
      expect(
        find.byWidgetPredicate(
          (widget) => widget is DdiroriItem && widget.title == '1번 · 원본 1쪽',
        ),
        findsOneWidget,
      );
      final duplicate = find
          .byWidgetPredicate(
            (widget) => widget is DdiroriButton && widget.label == '복제',
          )
          .first;
      await t.ensureVisible(duplicate);
      await t.tap(duplicate);
      await t.pumpAndSettle();

      expect(c.scoreById('pilot-0').pageSettings.pageOrder, <int>[1, 1, 2, 3]);
      expect(pdf(t).document, same(originalDocument));
      expect(t.takeException(), isNull);
    },
  );

  testWidgets(
    'real PDF jump points use Ddirori sheets without replacing navigation',
    (t) async {
      final c = await openPdf(t, width: 1680, height: 2000, scale: 2);
      final originalDocument = pdf(t).document;

      await command(t, '모든 도구');
      await t.tap(find.byTooltip('페이지 정리'));
      await t.pumpAndSettle();
      await t.tap(find.text('점프 포인트'));
      await t.pumpAndSettle();

      expect(find.text('점프 포인트'), findsOneWidget);
      expect(
        find.text(
          '반복 연주, D.S./Coda 이동을 위한 앱 안의 바로가기입니다. 원본 PDF 파일은 수정하지 않습니다.',
        ),
        findsOneWidget,
      );
      expect(
        find.byWidgetPredicate(
          (widget) => widget is DdiroriItem && widget.title == '현재 1쪽에서 점프 추가',
        ),
        findsOneWidget,
      );
      await command(t, '현재 쪽에서 추가');

      expect(find.text('대상 페이지 선택'), findsOneWidget);
      expect(
        find.byWidgetPredicate(
          (widget) => widget is DdiroriItem && widget.title == '2쪽',
        ),
        findsOneWidget,
      );
      final selectSecondPage = find.descendant(
        of: find.byWidgetPredicate(
          (widget) => widget is DdiroriItem && widget.title == '2쪽',
        ),
        matching: find.byWidgetPredicate(
          (widget) => widget is DdiroriButton && widget.label == '선택',
        ),
      );
      await t.ensureVisible(selectSecondPage);
      await t.tap(selectSecondPage);
      await t.pumpAndSettle();

      final jumpPoint = c.scoreById('pilot-0').pageSettings.jumpPoints.single;
      expect(jumpPoint.sourcePage, 1);
      expect(jumpPoint.targetPage, 2);
      expect(pdf(t).document, same(originalDocument));
      expect(t.takeException(), isNull);
    },
  );

  testWidgets(
    'real PDF rehearsal marks use Ddirori actions without replacing navigation',
    (t) async {
      final c = await openPdf(t, width: 1680, height: 2000, scale: 2);
      final originalDocument = pdf(t).document;
      final now = DateTime.parse('2026-10-26T16:00:00.000');
      expect(
        await c.addRehearsalMark(
          c.scoreById('pilot-0'),
          pageCount: 3,
          mark: SheetRehearsalMark(
            id: 'r2-mark',
            pageNumber: 2,
            label: 'B',
            kind: SheetRehearsalMark.rehearsalKind,
            createdAt: now,
          ),
        ),
        isTrue,
      );
      await t.pumpAndSettle();

      await command(t, '모든 도구');
      await t.tap(find.byTooltip('페이지 정리'));
      await t.pumpAndSettle();
      await t.tap(find.text('리허설 마크'));
      await t.pumpAndSettle();

      expect(find.text('리허설 마크'), findsOneWidget);
      expect(
        find.text(
          '리허설·D.S.·Coda 위치를 앱 안에 표시하고 바로 이동할 수 있습니다. 원본 PDF 파일은 수정하지 않습니다.',
        ),
        findsOneWidget,
      );
      expect(
        find.byWidgetPredicate(
          (widget) => widget is DdiroriItem && widget.title == 'B',
        ),
        findsOneWidget,
      );
      await command(t, '이동');

      expect(pdf(t).pageNumber, 2);
      expect(c.scoreById('pilot-0').pageSettings.rehearsalMarks, hasLength(1));
      expect(pdf(t).document, same(originalDocument));
      expect(t.takeException(), isNull);
    },
  );

  testWidgets('rehearsal mark editor uses Ddirori dialog controls', (t) async {
    final c = await openPdf(t, width: 1680, height: 2000, scale: 2);
    final now = DateTime.parse('2026-10-26T16:00:00.000');
    expect(
      await c.addRehearsalMark(
        c.scoreById('pilot-0'),
        pageCount: 3,
        mark: SheetRehearsalMark(
          id: 'r2-editor-mark',
          pageNumber: 2,
          label: 'B',
          kind: SheetRehearsalMark.rehearsalKind,
          createdAt: now,
        ),
      ),
      isTrue,
    );
    await t.pumpAndSettle();

    await command(t, '모든 도구');
    await t.tap(find.byTooltip('페이지 정리'));
    await t.pumpAndSettle();
    await t.tap(find.text('리허설 마크'));
    await t.pumpAndSettle();
    await t.tap(find.byTooltip('B 더보기'));
    await t.pumpAndSettle();
    await t.tap(find.text('마크 수정'));
    await t.pumpAndSettle();

    expect(find.byType(DdiroriInput), findsOneWidget);
    expect(find.byType(DdiroriChoices<String>), findsOneWidget);
    expect(find.text('페이지'), findsOneWidget);

    await command(t, '취소');
    expect(
      c.scoreById('pilot-0').pageSettings.rehearsalMarks.single.label,
      'B',
    );
    expect(t.takeException(), isNull);
  });

  testWidgets(
    'real PDF display mode uses Ddirori rows without replacing the PDF',
    (t) async {
      final c = await openPdf(t, width: 390, height: 1000, scale: 2);
      final originalDocument = pdf(t).document;

      await command(t, '모든 도구');
      await t.tap(compactViewerOptionsButton());
      await t.pumpAndSettle();
      final displayMode = find.byWidgetPredicate(
        (widget) => widget is DdiroriItem && widget.title.startsWith('보기 모드:'),
      );
      await t.ensureVisible(displayMode);
      await t.tap(displayMode);
      await t.pumpAndSettle();

      expect(find.text('보기 방식'), findsOneWidget);
      expect(find.text('PDF·주석·페이지 위치는 유지한 채 화면 배치만 바꿉니다.'), findsOneWidget);
      final verticalScroll = find.byWidgetPredicate(
        (widget) => widget is DdiroriItem && widget.title == '세로 스크롤',
      );
      expect(verticalScroll, findsOneWidget);
      expect(
        find.byWidgetPredicate(
          (widget) => widget is DdiroriItem && widget.title == '2페이지',
        ),
        findsOneWidget,
      );
      expect(c.scoreById('pilot-0').viewerSettings.displayMode, isNotEmpty);
      expect(pdf(t).document, same(originalDocument));
      expect(t.takeException(), isNull);
    },
  );

  testWidgets(
    'real PDF display effect and page scale use Ddirori choices without replacing the PDF',
    (t) async {
      await openPdf(t, width: 390, height: 1000, scale: 2);
      final originalDocument = pdf(t).document;

      await command(t, '모든 도구');
      await t.tap(compactViewerOptionsButton());
      await t.pumpAndSettle();
      final displayEffect = find.byWidgetPredicate(
        (widget) => widget is DdiroriItem && widget.title.startsWith('표시 효과:'),
      );
      await t.ensureVisible(displayEffect);
      await t.tap(displayEffect);
      await t.pumpAndSettle();

      expect(find.text('표시 효과'), findsOneWidget);
      expect(find.text('PDF 원본과 저장한 주석은 그대로 두고 화면 표시만 바꿉니다.'), findsOneWidget);
      expect(
        find.byWidgetPredicate(
          (widget) => widget is DdiroriItem && widget.title == '색상 반전',
        ),
        findsOneWidget,
      );
      expect(pdf(t).document, same(originalDocument));

      await t.binding.handlePopRoute();
      await t.pumpAndSettle();
      await command(t, '모든 도구');
      await t.tap(compactViewerOptionsButton());
      await t.pumpAndSettle();
      final pageScale = find.byWidgetPredicate(
        (widget) => widget is DdiroriItem && widget.title.startsWith('페이지 맞춤:'),
      );
      await t.ensureVisible(pageScale);
      await t.tap(pageScale);
      await t.pumpAndSettle();

      expect(find.text('페이지 맞춤'), findsAtLeastNWidgets(2));
      expect(
        find.text('PDF 원본·페이지 위치·주석을 유지하고 지면의 맞춤 방식만 바꿉니다.'),
        findsOneWidget,
      );
      expect(
        find.byWidgetPredicate(
          (widget) => widget is DdiroriItem && widget.title == '폭 맞춤',
        ),
        findsOneWidget,
      );
      expect(pdf(t).document, same(originalDocument));
      expect(t.takeException(), isNull);
    },
  );

  testWidgets(
    'real PDF pedal mapping uses Ddirori choices without changing the document',
    (t) async {
      await openPdf(t, width: 390, height: 1000, scale: 2);
      final originalDocument = pdf(t).document;

      await command(t, '모든 도구');
      await t.tap(compactViewerOptionsButton());
      await t.pumpAndSettle();
      final pedalMapping = find.byWidgetPredicate(
        (widget) => widget is DdiroriItem && widget.title.startsWith('페달 매핑:'),
      );
      await t.ensureVisible(pedalMapping);
      await t.tap(pedalMapping);
      await t.pumpAndSettle();

      expect(find.text('페달 매핑'), findsOneWidget);
      expect(
        find.text('입력 처리와 기존 매핑은 유지한 채 페이지 넘김 방식을 선택합니다.'),
        findsOneWidget,
      );
      expect(
        find.byWidgetPredicate(
          (widget) => widget is DdiroriItem && widget.title == '세트리스트 경계 이동',
        ),
        findsOneWidget,
      );
      expect(pdf(t).document, same(originalDocument));
      expect(t.takeException(), isNull);
    },
  );

  testWidgets(
    'real PDF custom pedal mapping uses Ddirori settings and preserves the document',
    (t) async {
      final c = await openPdf(t, width: 390, height: 1000, scale: 2);
      final originalDocument = pdf(t).document;

      await command(t, '모든 도구');
      await t.tap(compactViewerOptionsButton());
      await t.pumpAndSettle();
      final pedalMapping = find.byWidgetPredicate(
        (widget) => widget is DdiroriItem && widget.title.startsWith('페달 매핑:'),
      );
      await t.ensureVisible(pedalMapping);
      await t.tap(pedalMapping);
      await t.pumpAndSettle();
      final customMapping = find.byWidgetPredicate(
        (widget) => widget is DdiroriItem && widget.title == '직접 설정',
      );
      await t.ensureVisible(customMapping);
      await t.tap(customMapping);
      await t.pumpAndSettle();

      expect(find.text('페달 직접 설정'), findsOneWidget);
      expect(find.byType(DdiroriSettingsRow), findsWidgets);
      expect(
        find.byWidgetPredicate(
          (widget) => widget is DdiroriButton && widget.label == '저장',
        ),
        findsOneWidget,
      );
      await command(t, '저장');
      await t.pumpAndSettle();
      expect(
        c.scoreById('pilot-0').viewerSettings.pedalMapping,
        SheetViewerSettings.customPedalMappingType,
      );
      expect(pdf(t).document, same(originalDocument));
      expect(t.takeException(), isNull);
    },
  );

  testWidgets(
    'real PDF rendering settings use Ddirori choices without changing the document',
    (t) async {
      await openPdf(t, width: 390, height: 1000, scale: 2);
      final originalDocument = pdf(t).document;

      await command(t, '모든 도구');
      await t.tap(compactViewerOptionsButton());
      await t.pumpAndSettle();
      final renderProfile = find.byWidgetPredicate(
        (widget) => widget is DdiroriItem && widget.title.startsWith('렌더링:'),
      );
      await t.ensureVisible(renderProfile);
      await t.tap(renderProfile);
      await t.pumpAndSettle();
      expect(find.text('렌더링 프로필'), findsOneWidget);
      expect(
        find.byWidgetPredicate(
          (widget) => widget is DdiroriItem && widget.title == '대형 PDF',
        ),
        findsOneWidget,
      );
      expect(pdf(t).document, same(originalDocument));

      await t.binding.handlePopRoute();
      await t.pumpAndSettle();
      await command(t, '모든 도구');
      await t.tap(compactViewerOptionsButton());
      await t.pumpAndSettle();
      final pageTurn = find.byWidgetPredicate(
        (widget) => widget is DdiroriItem && widget.title.startsWith('페이지 넘김:'),
      );
      await t.ensureVisible(pageTurn);
      await t.tap(pageTurn);
      await t.pumpAndSettle();
      expect(find.text('페이지 넘김 효과'), findsOneWidget);
      expect(
        find.byWidgetPredicate(
          (widget) => widget is DdiroriItem && widget.title == '빠름',
        ),
        findsOneWidget,
      );
      expect(pdf(t).document, same(originalDocument));
      expect(t.takeException(), isNull);
    },
  );

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

  testWidgets('real PDF metronome keeps Score timing controls in Ddirori UI', (
    t,
  ) async {
    final c = await openPdf(t, scale: 2);
    final originalDocument = pdf(t).document;
    final initialBpm = c.metronomeSettings.bpm;

    await command(t, '연습');
    await command(t, '메트로놈');

    expect(find.text('메트로놈'), findsOneWidget);
    expect(find.byType(DdiroriPageHeader), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) => widget is DdiroriChoices<SheetMetronomeMeter>,
      ),
      findsOneWidget,
    );
    expect(
      find.byWidgetPredicate(
        (widget) => widget is DdiroriButton && widget.label == '시작',
      ),
      findsOneWidget,
    );

    await t.ensureVisible(find.byTooltip('BPM 올리기'));
    await t.tap(find.byTooltip('BPM 올리기'));
    await t.pumpAndSettle();
    expect(find.text('${initialBpm + 1}'), findsOneWidget);

    await t.ensureVisible(find.text(SheetMetronomeMeter.threeFour.label));
    await t.tap(find.text(SheetMetronomeMeter.threeFour.label));
    await t.pumpAndSettle();
    expect(find.textContaining('1/3'), findsOneWidget);
    expect(c.metronomeSettings.bpm, initialBpm + 1);
    expect(c.metronomeSettings.meter, SheetMetronomeMeter.threeFour);
    expect(pdf(t).document, same(originalDocument));
    expect(t.takeException(), isNull);
  });

  testWidgets('real PDF auto scroll keeps Score range settings in Ddirori UI', (
    t,
  ) async {
    final c = await openPdf(t, scale: 2);
    final originalDocument = pdf(t).document;

    await command(t, '연습');
    await command(t, '자동 스크롤');

    expect(find.text('자동 스크롤'), findsOneWidget);
    expect(find.byType(DdiroriPageHeader), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) => widget is DdiroriButton && widget.label == '시작',
      ),
      findsOneWidget,
    );
    expect(find.textContaining('연주 시간'), findsOneWidget);
    expect(find.textContaining('시작 1쪽'), findsOneWidget);
    expect(pdf(t).document, same(originalDocument));
    expect(c.scoreById('pilot-0').autoScrollSettings.startPage, 1);
    expect(t.takeException(), isNull);
  });

  testWidgets('real PDF tuner keeps the microphone route in Ddirori UI', (
    t,
  ) async {
    await openPdf(t, scale: 2);
    final originalDocument = pdf(t).document;

    await command(t, '연습');
    await command(t, '튜너');

    expect(find.text('튜너'), findsOneWidget);
    expect(find.byType(DdiroriPageHeader), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is DdiroriIconButton &&
            (widget.label == '마이크 끄기' || widget.label == '마이크 켜기'),
      ),
      findsOneWidget,
    );
    expect(find.textContaining('기준음/드론'), findsOneWidget);
    expect(pdf(t).document, same(originalDocument));
    expect(t.takeException(), isNull);
  });

  testWidgets(
    'input diagnostics use a Ddirori sheet without changing the PDF',
    (t) async {
      await openPdf(t, width: 1680, height: 2000, scale: 2);
      final originalDocument = pdf(t).document;

      await command(t, '모든 도구');
      await t.tap(find.byTooltip('페이지 정리'));
      await t.pumpAndSettle();
      final inputDiagnostic = find.text('입력 진단');
      await t.ensureVisible(inputDiagnostic);
      await t.tap(inputDiagnostic);
      await t.pumpAndSettle();

      expect(find.text('입력 진단'), findsOneWidget);
      expect(find.byType(DdiroriBanner), findsOneWidget);
      expect(
        find.byWidgetPredicate(
          (widget) =>
              widget is DdiroriItem && widget.title == '아직 기록된 입력이 없습니다.',
        ),
        findsOneWidget,
      );
      expect(
        find.byWidgetPredicate(
          (widget) => widget is DdiroriButton && widget.label == '진단 로그 복사',
        ),
        findsOneWidget,
      );
      expect(pdf(t).document, same(originalDocument));
      expect(t.takeException(), isNull);
    },
  );

  testWidgets(
    'performance settings use Ddirori sections without changing the PDF',
    (t) async {
      await openPdf(t, width: 1680, height: 2000, scale: 2);
      final originalDocument = pdf(t).document;

      await command(t, '모든 도구');
      await command(t, '공연 설정');

      expect(find.text('공연 모드'), findsOneWidget);
      expect(
        find.byWidgetPredicate(
          (widget) => widget is DdiroriSection && widget.title == '공연 중 허용할 도구',
        ),
        findsOneWidget,
      );
      expect(
        find.byWidgetPredicate(
          (widget) => widget is DdiroriInput && widget.label == 'Template 이름',
        ),
        findsOneWidget,
      );
      expect(
        find.byWidgetPredicate(
          (widget) => widget is DdiroriButton && widget.label == '저장',
        ),
        findsOneWidget,
      );
      expect(pdf(t).document, same(originalDocument));
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
