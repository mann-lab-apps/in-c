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
import 'package:in_c_sheet/sheet_annotation.dart';
import 'package:in_c_sheet/presentation/score_viewer_components.dart';
import 'package:in_c_sheet/presentation/score_pdf_search_sheet.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_metronome.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:pdfrx/pdfrx.dart';

import 'adoption_pilot_test.dart' as pilot;

const viewerSheetViewports = <({double width, double height, bool dark})>[
  (width: 390, height: 1000, dark: false),
  (width: 840, height: 1000, dark: true),
  (width: 840, height: 390, dark: false),
];

class NotesWriteStore extends SheetLibraryStore {
  Completer<void>? gate;
  bool failWrites = false;
  int writes = 0;

  @override
  Future<void> saveScores(List<SheetScore> scores) async {
    writes++;
    final current = gate;
    if (current != null) await current.future;
    if (failWrites) throw const FileSystemException('notes fixture failure');
    await super.saveScores(scores);
  }
}

class AutoScrollWriteStore extends SheetLibraryStore {
  Completer<void>? nextGate;
  bool failNext = false;
  final List<List<SheetScore>> attempts = [];

  @override
  Future<void> saveScores(List<SheetScore> scores) async {
    attempts.add(scores);
    final gate = nextGate;
    final fail = failNext;
    nextGate = null;
    failNext = false;
    if (gate != null) await gate.future;
    if (fail) throw const FileSystemException('auto scroll fixture failure');
    await super.saveScores(scores);
  }
}

Future<void> openNotes(WidgetTester t) async {
  await command(t, '모든 도구');
  if (compactViewerOptionsButton().evaluate().isNotEmpty) {
    await t.tap(compactViewerOptionsButton());
    await t.pumpAndSettle();
  } else {
    await command(t, '악보 메모');
    return;
  }
  final notes = find.byWidgetPredicate(
    (w) => w is DdiroriItem && w.title == '악보 메모',
  );
  await t.ensureVisible(notes);
  await t.tap(notes);
  await t.pumpAndSettle();
}

Finder notesField() => find.descendant(
  of: find.byWidgetPredicate((w) => w is DdiroriInput && w.label == '공연 메모'),
  matching: find.byType(TextField),
);

Future<void> openCrop(WidgetTester t) async {
  await command(t, '모든 도구');
  if (compactViewerOptionsButton().evaluate().isNotEmpty) {
    await t.tap(compactViewerOptionsButton());
    await t.pumpAndSettle();
    final crop = find.byWidgetPredicate(
      (w) => w is DdiroriItem && w.title == '자르기 맞춤',
    );
    await t.ensureVisible(crop);
    await t.tap(crop);
  } else {
    await t.ensureVisible(find.byTooltip('페이지 정리'));
    await t.pumpAndSettle();
    await t.tap(find.byTooltip('페이지 정리'));
    await t.pumpAndSettle();
    await t.ensureVisible(find.text('자르기 맞춤'));
    await t.pumpAndSettle();
    await t.tap(find.text('자르기 맞춤'));
  }
  await t.pumpAndSettle();
}

Future<void> openPagePicker(WidgetTester t) async {
  await command(t, '모든 도구');
  await command(t, '보기 옵션');
  final pages = find.byWidgetPredicate(
    (w) => w is DdiroriItem && w.title == '페이지 탐색',
  );
  await t.ensureVisible(pages);
  await t.tap(pages);
  await t.pumpAndSettle();
}

Future<void> openViewerOption(WidgetTester t, String title) async {
  await command(t, '모든 도구');
  await command(t, '보기 옵션');
  final option = find.byWidgetPredicate(
    (w) => w is DdiroriItem && w.title == title,
  );
  await t.ensureVisible(option);
  await t.pumpAndSettle();
  await t.tap(option);
  await t.pumpAndSettle();
}

Future<void> chooseItem(WidgetTester t, String title) async {
  final item = find.byWidgetPredicate(
    (w) => w is DdiroriItem && w.title == title,
  );
  await t.ensureVisible(item);
  await t.pumpAndSettle();
  await t.tap(item);
  await t.pumpAndSettle();
}

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
  await pilot.mount(
    t,
    c,
    width: width,
    scale: scale,
    dark: dark,
    accent: 'blue',
  );
  if (Platform.environment['DDIRORI_SCORE_UI_CAPTURE'] != null) {
    await t.runAsync(() async {
      await (FontLoader(
        'MaterialIcons',
      )..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'))).load();
    });
    await t.pumpAndSettle();
  }
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

// Running auto scroll schedules a frame every 16ms, so settling is not a
// meaningful completion condition. Use bounded frames while operating it.
Future<void> liveCommand(WidgetTester t, String label) async {
  final button = find.byWidgetPredicate(
    (w) => w is DdiroriButton && w.label == label,
  );
  await t.ensureVisible(button);
  await t.pump(const Duration(milliseconds: 400));
  expect(t.widget<DdiroriButton>(button).onPressed, isNotNull);
  await t.tap(button);
  await t.pump(const Duration(milliseconds: 400));
}

Finder compactViewerOptionsButton() => find.byWidgetPredicate(
  (widget) => widget is DdiroriButton && widget.label == '보기 옵션',
);

Future<void> captureToolSheet(WidgetTester t, String name) async {
  final directory = Platform.environment['DDIRORI_SCORE_UI_CAPTURE'];
  if (directory == null) return;
  final boundary = t.renderObject<RenderRepaintBoundary>(
    find.byKey(const Key('pilot-capture')),
  );
  await t.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 1);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    await Directory(directory).create(recursive: true);
    await File('$directory/$name.png')
        .writeAsBytes(bytes!.buffer.asUint8List());
    image.dispose();
  });
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

  testWidgets('notes wait for storage and block dismissal while pending', (
    t,
  ) async {
    final store = NotesWriteStore();
    final c = await openPdf(t, store: store, scale: 2);
    final original = pdf(t).document;
    await openNotes(t);
    await t.enterText(notesField(), '저장 완료 전 닫지 않기');
    final gate = Completer<void>();
    store.gate = gate;
    store.writes = 0;
    addTearDown(() {
      if (!gate.isCompleted) gate.complete();
    });
    final save = find.byWidgetPredicate(
      (w) => w is DdiroriButton && w.label == '저장',
    );
    await t.ensureVisible(save);
    await t.tap(save);
    await t.pumpAndSettle();
    expect(find.text('악보 메모'), findsOneWidget);
    expect(store.writes, 1);
    expect(c.scoreById('pilot-0').structuredNotes.performance, isEmpty);
    expect(find.text('악보 메모를 저장했습니다.'), findsNothing);
    expect(t.widget<TextField>(notesField()).readOnly, isTrue);
    await t.ensureVisible(save);
    await t.tap(save);
    await t.pump();
    expect(store.writes, 1);
    final navigator = t.state<NavigatorState>(find.byType(Navigator).first);
    await navigator.maybePop();
    await t.pumpAndSettle();
    expect(find.text('악보 메모'), findsOneWidget);
    await t.tapAt(const Offset(10, 10));
    await t.pumpAndSettle();
    expect(find.text('악보 메모'), findsOneWidget);
    await t.drag(find.byType(BottomSheet), const Offset(0, 300));
    await t.pumpAndSettle();
    expect(find.text('악보 메모'), findsOneWidget);
    gate.complete();
    await t.pumpAndSettle();
    expect(find.text('악보 메모를 저장했습니다.'), findsOneWidget);
    expect(find.byType(TextField), findsNothing);
    expect(c.scoreById('pilot-0').structuredNotes.performance, '저장 완료 전 닫지 않기');
    expect(
      (await store.loadScores()).first.structuredNotes.performance,
      '저장 완료 전 닫지 않기',
    );
    expect(pdf(t).document, same(original));
    expect(t.takeException(), isNull);
  });

  testWidgets('crop waits for storage and keeps its draft on failure', (
    t,
  ) async {
    final store = NotesWriteStore();
    final c = await openPdf(t, store: store, scale: 2);
    final original = pdf(t).document;
    final originalCrop = c.scoreById('pilot-0').pageSettings.crop;
    await openCrop(t);
    final slider = find.byType(Slider).first;
    await t.ensureVisible(slider);
    await t.tapAt(t.getCenter(slider));
    await t.pumpAndSettle();
    final draftTop = t.widget<Slider>(slider).value;
    expect(draftTop, greaterThan(0));
    expect(
      c.scoreById('pilot-0').pageSettings.crop.toJson(),
      originalCrop.toJson(),
    );
    final gate = Completer<void>();
    store.gate = gate;
    store.failWrites = true;
    store.writes = 0;
    addTearDown(() {
      if (!gate.isCompleted) gate.complete();
    });
    final save = find.byWidgetPredicate(
      (w) => w is DdiroriButton && w.label == '저장',
    );
    await t.ensureVisible(save);
    await t.tap(save);
    await t.pumpAndSettle();
    expect(find.text('자르기 맞춤'), findsOneWidget);
    expect(store.writes, 1);
    expect(t.widget<Slider>(slider).onChanged, isNull);
    await t.ensureVisible(save);
    await t.tap(save);
    await t.pump();
    expect(store.writes, 1);
    final navigator = t.state<NavigatorState>(find.byType(Navigator).first);
    await navigator.maybePop();
    await t.pumpAndSettle();
    expect(find.text('자르기 맞춤'), findsOneWidget);
    gate.complete();
    await t.pumpAndSettle();
    expect(
      find.text('자르기 설정을 저장하지 못했습니다. 값을 유지했습니다. 다시 시도해 주세요.'),
      findsOneWidget,
    );
    expect(t.widget<Slider>(slider).value, draftTop);
    expect(
      c.scoreById('pilot-0').pageSettings.crop.toJson(),
      originalCrop.toJson(),
    );
    expect(
      (await store.loadScores()).first.pageSettings.crop.toJson(),
      originalCrop.toJson(),
    );
    store.failWrites = false;
    await command(t, '다시 시도');
    expect(store.writes, 2);
    expect(c.scoreById('pilot-0').pageSettings.crop.top, draftTop);
    expect(pdf(t).document, same(original));
    expect(t.takeException(), isNull);
  });

  for (final viewport in viewerSheetViewports) {
    testWidgets('crop cancel and save preserve PDF at $viewport', (t) async {
      final c = await openPdf(
        t,
        width: viewport.width,
        height: viewport.height,
        dark: viewport.dark,
        scale: 2,
      );
      final document = pdf(t).document;
      final source = File(c.scoreById('pilot-0').filePath);
      final bytes = await t.runAsync(source.readAsBytes);
      final initialCrop = c.scoreById('pilot-0').pageSettings.crop.toJson();
      await openCrop(t);
      expect(
        find.byType(ScoreViewerDraftForm<SheetCropSettings>),
        findsOneWidget,
      );
      expect(find.text('위 · 0%'), findsOneWidget);
      final slider = find.byType(Slider).first;
      await t.ensureVisible(slider);
      await t.tapAt(t.getCenter(slider));
      await t.pumpAndSettle();
      expect(t.widget<Slider>(slider).value, greaterThan(0));
      await command(t, '취소');
      expect(c.scoreById('pilot-0').pageSettings.crop.toJson(), initialCrop);
      await openCrop(t);
      expect(t.widget<Slider>(slider).value, 0);
      await t.ensureVisible(slider);
      await t.tapAt(t.getCenter(slider));
      await t.pumpAndSettle();
      final draftTop = t.widget<Slider>(slider).value;
      await command(t, '저장');
      expect(c.scoreById('pilot-0').pageSettings.crop.top, draftTop);
      expect(
        (await c.store.loadScores()).first.pageSettings.crop.top,
        draftTop,
      );
      expect(pdf(t).document, same(document));
      expect(await t.runAsync(source.readAsBytes), orderedEquals(bytes!));
      expect(t.takeException(), isNull);
    });
  }

  testWidgets('notes preserve draft on storage failure and retry once', (
    t,
  ) async {
    final store = NotesWriteStore();
    final c = await openPdf(t, store: store, scale: 2);
    final original = pdf(t).document;
    await openNotes(t);
    await t.enterText(notesField(), '실패해도 남는 메모');
    store.failWrites = true;
    store.writes = 0;
    await command(t, '저장');
    expect(find.text('악보 메모'), findsOneWidget);
    expect(t.widget<TextField>(notesField()).controller!.text, '실패해도 남는 메모');
    expect(
      find.text('메모를 저장하지 못했습니다. 입력을 유지했습니다. 다시 시도해 주세요.'),
      findsOneWidget,
    );
    expect(c.scoreById('pilot-0').structuredNotes.performance, isEmpty);
    expect(
      (await store.loadScores()).first.structuredNotes.performance,
      isEmpty,
    );
    expect(find.text('악보 메모를 저장했습니다.'), findsNothing);
    store.failWrites = false;
    await command(t, '다시 시도');
    expect(store.writes, 2);
    expect(find.text('악보 메모를 저장했습니다.'), findsOneWidget);
    expect(c.scoreById('pilot-0').structuredNotes.performance, '실패해도 남는 메모');
    expect(pdf(t).document, same(original));
    expect(t.takeException(), isNull);
  });

  for (final viewport in viewerSheetViewports) {
    testWidgets('score notes cancel and save preserve PDF at $viewport', (
      t,
    ) async {
      final c = await openPdf(
        t,
        width: viewport.width,
        height: viewport.height,
        scale: 2,
        dark: viewport.dark,
      );
      final originalDocument = pdf(t).document;
      final originalPage = pdf(t).pageNumber;
      await openNotes(t);
      expect(find.text('악보 메모'), findsOneWidget);
      expect(find.text('공연과 연습에 필요한 메모를 이 악보에만 저장합니다.'), findsOneWidget);
      await t.enterText(notesField(), '취소할 초안');
      await t.pumpAndSettle();
      await command(t, '취소');
      expect(c.scoreById('pilot-0').structuredNotes.performance, isEmpty);
      expect(find.text('악보 메모를 저장했습니다.'), findsNothing);
      await openNotes(t);
      expect(t.widget<TextField>(notesField()).controller!.text, isEmpty);
      await t.enterText(notesField(), '조명 확인 뒤 바로 시작');
      await t.pumpAndSettle();
      await command(t, '저장');
      expect(
        c.scoreById('pilot-0').structuredNotes.performance,
        '조명 확인 뒤 바로 시작',
      );
      expect(
        (await c.store.loadScores()).first.structuredNotes.performance,
        '조명 확인 뒤 바로 시작',
      );
      expect(pdf(t).document, same(originalDocument));
      expect(pdf(t).pageNumber, originalPage);
      expect(t.takeException(), isNull);
    });
  }

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

  for (final viewport in viewerSheetViewports) {
    testWidgets('metronome sheet preserves settings and PDF at $viewport', (
      t,
    ) async {
      final c = await openPdf(
        t,
        scale: 2,
        width: viewport.width,
        height: viewport.height,
        dark: viewport.dark,
      );
      final originalDocument = pdf(t).document;
      final originalPage = pdf(t).pageNumber;
      final initialBpm = c.metronomeSettings.bpm;

      await command(t, '연습');
      await command(t, '메트로놈');
      expect(find.text('메트로놈'), findsOneWidget);
      expect(find.byType(BottomSheet), findsOneWidget);
      expect(find.byType(DdiroriPageHeader), findsNothing);
      expect(
        find.byWidgetPredicate((w) => w is DdiroriChoices<SheetMetronomeMeter>),
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

      // Exercise the real timer controls silently; this is not audio evidence.
      await t.ensureVisible(find.byType(Switch));
      if (t.widget<Switch>(find.byType(Switch)).value) {
        await t.tap(find.byType(Switch));
        await t.pumpAndSettle();
      }
      expect(c.metronomeSettings.soundEnabled, isFalse);
      await command(t, '시작');
      expect(find.text('정지'), findsOneWidget);
      await command(t, '정지');
      expect(find.text('시작'), findsOneWidget);
      await command(t, '시작');
      t.state<NavigatorState>(find.byType(Navigator).first).pop();
      await t.pumpAndSettle();
      await t.pump(const Duration(seconds: 1));
      expect(pdf(t).document, same(originalDocument));
      expect(pdf(t).pageNumber, originalPage);

      await command(t, '연습');
      await command(t, '메트로놈');
      expect(find.text('시작'), findsOneWidget);
      expect(find.text('${initialBpm + 1}'), findsOneWidget);
      final stored = await c.store.loadMetronomeSettings();
      expect(stored.bpm, initialBpm + 1);
      expect(stored.meter, SheetMetronomeMeter.threeFour);
      expect(stored.soundEnabled, isFalse);
      expect(t.takeException(), isNull);
    });
  }

  for (final viewport in <({double width, double height, bool dark})>[
    (width: 390, height: 1000, dark: false),
    (width: 840, height: 1000, dark: true),
    (width: 840, height: 390, dark: false),
  ]) {
    testWidgets('auto scroll sheet preserves settings and PDF at $viewport', (
      t,
    ) async {
      final c = await openPdf(
        t,
        scale: 2,
        width: viewport.width,
        height: viewport.height,
        dark: viewport.dark,
      );
      final originalDocument = pdf(t).document;
      final originalPage = pdf(t).pageNumber;

      await command(t, '연습');
      await command(t, '자동 스크롤');

      expect(find.text('자동 스크롤'), findsOneWidget);
      expect(find.byType(BottomSheet), findsOneWidget);
      expect(find.byType(DdiroriBanner), findsWidgets);
      expect(find.byType(DdiroriPageHeader), findsNothing);
      expect(
        find.byWidgetPredicate(
          (widget) => widget is DdiroriButton && widget.label == '시작',
        ),
        findsOneWidget,
      );
      expect(find.text('연주 시간 4분'), findsOneWidget);
      expect(find.textContaining('시작 1쪽'), findsOneWidget);
      expect(pdf(t).document, same(originalDocument));
      expect(c.scoreById('pilot-0').autoScrollSettings.startPage, 1);
      expect(t.takeException(), isNull);

      await t.ensureVisible(find.byTooltip('끝 페이지 감소'));
      await t.tap(find.byTooltip('끝 페이지 감소'));
      await t.pumpAndSettle();
      expect(c.scoreById('pilot-0').autoScrollSettings.endPage, 2);
      expect((await c.store.loadScores()).first.autoScrollSettings.endPage, 2);

      // Lower settings remain reachable through the sheet's single scroll view.
      await t.ensureVisible(find.text('등록된 cue point가 없습니다.'));
      await t.pumpAndSettle();
      expect(t.takeException(), isNull);
      t.state<NavigatorState>(find.byType(Navigator).first).pop();
      await t.pumpAndSettle();
      expect(pdf(t).document, same(originalDocument));
      expect(pdf(t).pageNumber, originalPage);

      await command(t, '연습');
      await command(t, '자동 스크롤');
      expect(find.text('끝 2쪽'), findsOneWidget);
      expect(c.scoreById('pilot-0').autoScrollSettings.endPage, 2);
      expect(pdf(t).document, same(originalDocument));
      expect(t.takeException(), isNull);
    });
  }

  for (final viewport in viewerSheetViewports) {
    testWidgets('tuner sheet preserves PDF and tone controls at $viewport', (
      t,
    ) async {
      await openPdf(
        t,
        scale: 2,
        width: viewport.width,
        height: viewport.height,
        dark: viewport.dark,
      );
      final originalDocument = pdf(t).document;
      final originalPage = pdf(t).pageNumber;
      await command(t, '연습');
      await command(t, '튜너');
      expect(find.text('튜너'), findsOneWidget);
      expect(find.byType(BottomSheet), findsOneWidget);
      expect(find.byType(DdiroriPageHeader), findsNothing);
      expect(
        find.byWidgetPredicate(
          (w) =>
              w is DdiroriButton &&
              (w.label == '마이크 끄기' || w.label == '마이크 켜기'),
        ),
        findsOneWidget,
      );
      await t.ensureVisible(find.textContaining('기준음/드론'));
      await t.pumpAndSettle();
      expect(t.takeException(), isNull);
      t.state<NavigatorState>(find.byType(Navigator).first).pop();
      await t.pumpAndSettle();
      expect(pdf(t).document, same(originalDocument));
      expect(pdf(t).pageNumber, originalPage);
      expect(t.takeException(), isNull);
    });
  }

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

  for (final viewport in viewerSheetViewports) {
    testWidgets(
      'long PDF picker previews then jumps without replacing the document at $viewport',
      (t) async {
        final c = await openPdf(
          t,
          fixture: 'long-scan-like-score.pdf',
          width: viewport.width,
          height: viewport.height,
          dark: viewport.dark,
          scale: 2,
        );
        final original = pdf(t).document;
        await c.toggleBookmark(c.scoreById('pilot-0'), 60);
        await t.pumpAndSettle();
        await openPagePicker(t);
        expect(t.takeException(), isNull);
        await captureToolSheet(
          t,
          'page-picker-${viewport.width.toInt()}x${viewport.height.toInt()}-${viewport.dark ? 'dark' : 'light'}',
        );
        final entry = find.descendant(
          of: find.byWidgetPredicate(
            (w) => w is DdiroriInput && w.label == '이동할 쪽',
          ),
          matching: find.byType(TextField),
        );
        await t.enterText(entry, '91');
        await t.pumpAndSettle();
        await command(t, '이동');
        expect(find.text('1~90 사이의 쪽 번호를 입력해 주세요.'), findsOneWidget);
        expect(pdf(t).pageNumber, 1);
        final slider = find.byType(Slider);
        await t.ensureVisible(slider);
        await t.tapAt(t.getCenter(slider));
        await t.pumpAndSettle();
        expect(pdf(t).pageNumber, 1);
        await t.enterText(entry, '60');
        await t.pumpAndSettle();
        expect(pdf(t).pageNumber, 1);
        expect(c.scoreById('pilot-0').lastPage, 1);
        await command(t, '이동');
        expect(pdf(t).pageNumber, 60);
        expect(c.scoreById('pilot-0').lastPage, 60);
        expect(pdf(t).document, same(original));
        await openPagePicker(t);
        await t.enterText(entry, '80');
        await t.pumpAndSettle();
        t.state<NavigatorState>(find.byType(Navigator).first).pop();
        await t.pumpAndSettle();
        expect(pdf(t).pageNumber, 60);
        expect(c.scoreById('pilot-0').lastPage, 60);
        expect(t.takeException(), isNull);
      },
    );
  }

  testWidgets(
    'page picker keeps hidden pages blocked and opens bookmark destinations',
    (t) async {
      final c = await openPdf(t, fixture: 'long-scan-like-score.pdf', scale: 2);
      final original = pdf(t).document;
      await c.hidePage(c.scoreById('pilot-0'), pageNumber: 30, pageCount: 90);
      await c.toggleBookmark(c.scoreById('pilot-0'), 60);
      await t.pumpAndSettle();
      await openPagePicker(t);
      final entry = find.descendant(
        of: find.byWidgetPredicate(
          (w) => w is DdiroriInput && w.label == '이동할 쪽',
        ),
        matching: find.byType(TextField),
      );
      await t.enterText(entry, '30');
      await t.pumpAndSettle();
      await command(t, '이동');
      expect(find.text('숨긴 페이지입니다. 숨김을 해제한 뒤 이동해 주세요.'), findsOneWidget);
      expect(pdf(t).pageNumber, 1);
      await command(t, '표시 지점 1개 +');
      await command(t, '60쪽으로 이동');
      expect(pdf(t).pageNumber, 60);
      expect(pdf(t).document, same(original));
      expect(c.scoreById('pilot-0').pageSettings.hiddenPages, contains(30));
      await openPagePicker(t);
      await command(t, '10쪽 뒤');
      expect(pdf(t).pageNumber, 70);
      await openPagePicker(t);
      await command(t, '끝');
      expect(pdf(t).pageNumber, 90);
      await openPagePicker(t);
      final grid = find.byType(GridView);
      await t.ensureVisible(grid);
      await t.pumpAndSettle();
      final page88 = find.byWidgetPredicate(
        (w) => w is DdiroriButton && w.label == '88쪽',
      );
      await t.scrollUntilVisible(
        page88,
        240,
        scrollable: find.descendant(
          of: grid,
          matching: find.byType(Scrollable),
        ),
      );
      await t.pumpAndSettle();
      await t.tap(page88);
      await t.pumpAndSettle();
      expect(pdf(t).pageNumber, 88);
      expect(c.scoreById('pilot-0').lastPage, 88);
      expect(pdf(t).document, same(original));
      expect(t.takeException(), isNull);
    },
  );

  for (final viewport in viewerSheetViewports) {
    testWidgets('viewer preset and template menus preserve PDF at $viewport', (
      t,
    ) async {
      final c = await openPdf(
        t,
        width: viewport.width,
        height: viewport.height,
        dark: viewport.dark,
        scale: 2,
      );
      final document = pdf(t).document;
      await c.addCropPreset(
        c.scoreById('pilot-0'),
        SheetCropPreset(
          id: 'fixture-crop',
          label: '공연 여백',
          scope: SheetCropPreset.allPagesScope,
          crop: const SheetCropSettings(left: .08, top: 0, right: 0, bottom: 0),
          alternateCrop: SheetCropSettings.none,
          createdAt: DateTime(2026, 10, 30),
        ),
      );
      await t.pumpAndSettle();
      await openViewerOption(t, 'Crop preset');
      expect(find.text('자르기 프리셋'), findsOneWidget);
      await command(t, '적용');
      expect(c.scoreById('pilot-0').pageSettings.crop.left, .08);
      await c.updatePageCrop(c.scoreById('pilot-0'), SheetCropSettings.none);
      await t.pumpAndSettle();
      await openViewerOption(t, 'Crop preset');
      await command(t, '삭제');
      expect(c.scoreById('pilot-0').pageSettings.cropPresets, isEmpty);
      expect(c.scoreById('pilot-0').pageSettings.crop.hasCrop, isFalse);

      await openViewerOption(t, '페이지 템플릿');
      expect(find.text('페이지 템플릿'), findsOneWidget);
      await chooseItem(t, '현재 페이지 뒤 빈 페이지 위치 기록');
      expect(
        c.scoreById('pilot-0').pageSettings.blankPageInsertions,
        hasLength(1),
      );
      expect(pdf(t).pageCount, 3);
      await openViewerOption(t, '페이지 템플릿');
      await command(t, '기록 삭제');
      expect(c.scoreById('pilot-0').pageSettings.blankPageInsertions, isEmpty);
      expect(pdf(t).document, same(document));
      expect(t.takeException(), isNull);
    });
  }

  testWidgets('crop preset dialog keeps its single scope and cancels safely', (
    t,
  ) async {
    final c = await openPdf(t, scale: 2);
    await openViewerOption(t, 'Crop preset');
    await chooseItem(t, '현재 자르기를 프리셋으로 저장');
    expect(find.text('자르기 프리셋 저장'), findsOneWidget);
    final name = find.descendant(
      of: find.byWidgetPredicate((w) => w is DdiroriInput && w.label == '이름'),
      matching: find.byType(TextField),
    );
    await t.enterText(name, '취소할 여백');
    await t.pumpAndSettle();
    await command(t, '취소');
    expect(c.scoreById('pilot-0').pageSettings.cropPresets, isEmpty);
    await openViewerOption(t, 'Crop preset');
    await chooseItem(t, '현재 자르기를 프리셋으로 저장');
    await t.enterText(name, '연습 여백');
    await t.pumpAndSettle();
    await t.ensureVisible(find.text('모든 페이지'));
    await t.tap(find.text('모든 페이지'));
    await t.pumpAndSettle();
    expect(t.takeException(), isNull);
    await command(t, '저장');
    expect(
      c.scoreById('pilot-0').pageSettings.cropPresets.single.label,
      '연습 여백',
    );
    expect(
      c.scoreById('pilot-0').pageSettings.cropPresets.single.scope,
      SheetCropPreset.allPagesScope,
    );
    expect(t.takeException(), isNull);
  });

  testWidgets('reselecting the current auto scroll cue keeps it selected', (
    t,
  ) async {
    final c = await openPdf(t, scale: 2);
    await command(t, '연습');
    await command(t, '자동 스크롤');
    for (final seconds in [0, 3, 3]) {
      final chip = find.ancestor(
        of: find.text('$seconds초'),
        matching: find.byType(FilterChip),
      );
      await t.ensureVisible(chip);
      await t.pumpAndSettle();
      await t.tap(chip);
      await t.pumpAndSettle();
      expect(c.scoreById('pilot-0').autoScrollSettings.cueSeconds, seconds);
      expect(t.takeException(), isNull);
    }
  });

  testWidgets('viewer share candidates use named rows without exposing paths', (
    t,
  ) async {
    final linked = SheetLinkedFile(
      path: File('test-fixtures/pdfs/link-annotation-score.pdf').absolute.path,
      type: 'pdf',
      label: '다른 판본',
      createdAt: DateTime(2026, 10, 30),
    );
    final c = await openPdf(t, scale: 2, linkedFiles: [linked]);
    final document = pdf(t).document;
    final candidates = c.shareCandidates(c.scoreById('pilot-0'));
    expect(candidates, hasLength(2));
    await openViewerOption(t, 'PDF 공유');
    expect(find.text('공유할 파일 선택'), findsOneWidget);
    for (final candidate in candidates) {
      expect(
        find.byWidgetPredicate(
          (w) => w is DdiroriItem && w.title == candidate.label,
        ),
        findsOneWidget,
      );
      expect(find.text(candidate.fileName), findsOneWidget);
      expect(find.text(candidate.path), findsNothing);
    }
    t.state<NavigatorState>(find.byType(Navigator).first).pop();
    await t.pumpAndSettle();
    expect(pdf(t).document, same(document));
    expect(t.takeException(), isNull);
  });

  testWidgets(
    'text annotation action sheet edits and deletes the selected text',
    (t) async {
      final c = await openPdf(t, width: 840, height: 1200);
      final document = pdf(t).document;
      final annotation = SheetTextAnnotation(
        id: 'fixture-text',
        pageNumber: 1,
        position: const SheetAnnotationPoint(x: .3, y: .3),
        text: '표현을 여유롭게',
        color: 0xff111111,
        fontSize: 24,
        createdAt: DateTime(2026, 10, 30),
      );
      await c.addTextAnnotation(c.scoreById('pilot-0'), annotation);
      await t.pumpAndSettle();
      await command(t, '주석');
      await command(t, '펜 옵션');
      await command(t, '텍스트');
      await command(t, '닫기');
      Future<void> openTextActions() async {
        final rect = pdf(t).layout.pageLayouts.first;
        final point = pdf(t).documentToGlobal(
          Offset(rect.left + rect.width * .3, rect.top + rect.height * .3),
        )!;
        expect(t.getRect(find.byType(PdfViewer)).contains(point), isTrue);
        await t.tapAt(point);
        await t.pumpAndSettle();
        expect(find.text('텍스트 주석'), findsOneWidget);
        expect(
          find.byWidgetPredicate(
            (w) => w is DdiroriItem && w.title == '텍스트 수정',
          ),
          findsOneWidget,
        );
      }

      await openTextActions();
      t.state<NavigatorState>(find.byType(Navigator).first).pop();
      await t.pumpAndSettle();
      expect(
        c.scoreById('pilot-0').annotationLayer.texts.single.text,
        annotation.text,
      );
      await openTextActions();
      await chooseItem(t, '텍스트 수정');
      await t.enterText(find.byType(TextField), '호흡을 먼저');
      await t.pumpAndSettle();
      await t.ensureVisible(find.widgetWithText(FilledButton, '저장'));
      await t.tap(find.widgetWithText(FilledButton, '저장'));
      await t.pumpAndSettle();
      expect(
        c.scoreById('pilot-0').annotationLayer.texts.single.text,
        '호흡을 먼저',
      );
      await openTextActions();
      await chooseItem(t, '텍스트 삭제');
      expect(c.scoreById('pilot-0').annotationLayer.texts, isEmpty);
      expect((await c.store.loadScores()).first.annotationLayer.texts, isEmpty);
      expect(pdf(t).document, same(document));
      expect(t.takeException(), isNull);
    },
  );

  for (final viewport in viewerSheetViewports) {
    testWidgets(
      'PDF text search uses common fields with keyboard inset at $viewport',
      (t) async {
        final c = await openPdf(
          t,
          width: viewport.width,
          height: viewport.height,
          scale: 2,
          dark: viewport.dark,
        );
        final document = pdf(t).document;
        t.view.viewInsets = FakeViewPadding(
          bottom: viewport.height < 500 ? 100 : 240,
        );
        addTearDown(t.view.resetViewInsets);
        await t.pumpAndSettle();
        await openViewerOption(t, 'PDF 본문 검색');
        expect(t.takeException(), isNull);
        await captureToolSheet(
          t,
          'pdf-search-${viewport.width.toInt()}x${viewport.height.toInt()}-${viewport.dark ? 'dark' : 'light'}',
        );
        final entry = find.descendant(
          of: find.byWidgetPredicate(
            (w) => w is DdiroriInput && w.label == '검색어',
          ),
          matching: find.byType(TextField),
        );
        await t.enterText(entry, 'Page 2 of 3');
        await t.pumpAndSettle();
        await command(t, '검색');
        final result = find.byWidgetPredicate(
          (w) => w is DdiroriItem && w.title == 'Page 2 of 3',
        );
        for (
          var attempt = 0;
          attempt < 100 && result.evaluate().isEmpty;
          attempt++
        ) {
          await t.runAsync(
            () => Future<void>.delayed(const Duration(milliseconds: 20)),
          );
          await t.pump(const Duration(milliseconds: 20));
        }
        expect(result, findsOneWidget);
        final searcher = t
            .widget<ScorePdfTextSearchSheet>(
              find.byType(ScorePdfTextSearchSheet),
            )
            .searcher;
        expect(searcher.matches.single.pageNumber, 2);
        await t.ensureVisible(result);
        await t.pumpAndSettle();
        await t.tap(result);
        await t.pumpAndSettle();
        expect(searcher.currentIndex, 0);
        expect(
          pdf(t).visibleRect.overlaps(pdf(t).layout.pageLayouts[1]),
          isTrue,
        );
        // Wide mode keeps the first page of its visible spread as the cursor.
        expect(pdf(t).pageNumber, viewport.width < 720 ? 2 : 1);
        expect(c.scoreById('pilot-0').lastPage, pdf(t).pageNumber);
        expect(pdf(t).document, same(document));
        expect(t.takeException(), isNull);
      },
    );
  }

  testWidgets(
    'PDF search clears empty results and reopens without stale query',
    (t) async {
      await openPdf(t, scale: 2);
      final document = pdf(t).document;
      await openViewerOption(t, 'PDF 본문 검색');
      final field = find.descendant(
        of: find.byType(DdiroriInput),
        matching: find.byType(TextField),
      );
      await t.enterText(field, 'no_fixture_match_20261030');
      await t.pumpAndSettle();
      await command(t, '검색');
      final searcher = t
          .widget<ScorePdfTextSearchSheet>(find.byType(ScorePdfTextSearchSheet))
          .searcher;
      for (
        var attempt = 0;
        attempt < 100 &&
            (searcher.isSearching || searcher.searchingPageNumber != 3);
        attempt++
      ) {
        await t.runAsync(
          () => Future<void>.delayed(const Duration(milliseconds: 20)),
        );
        await t.pump(const Duration(milliseconds: 20));
      }
      expect(searcher.isSearching, isFalse);
      expect(searcher.matches, isEmpty);
      expect(find.text('결과 없음 · 스캔 PDF는 텍스트가 없을 수 있습니다.'), findsOneWidget);
      await command(t, '검색어 지우기');
      expect(searcher.pattern, isNull);
      expect(t.widget<TextField>(field).controller!.text, isEmpty);
      await command(t, '닫기');
      await openViewerOption(t, 'PDF 본문 검색');
      expect(t.widget<TextField>(field).controller!.text, isEmpty);
      expect(pdf(t).document, same(document));
      expect(t.takeException(), isNull);
    },
  );

  testWidgets(
    'PDF search keeps the latest query and ignores duplicate search',
    (t) async {
      await openPdf(t, scale: 2);
      await openViewerOption(t, 'PDF 본문 검색');
      final field = find.descendant(
        of: find.byType(DdiroriInput),
        matching: find.byType(TextField),
      );
      final search = find.byWidgetPredicate(
        (w) => w is DdiroriButton && w.label == '검색',
      );
      await t.enterText(field, 'Page 1 of 3');
      await t.pumpAndSettle();
      await t.ensureVisible(search);
      await t.tap(search);
      await t.pump();
      await t.enterText(field, 'Page 3 of 3');
      await t.pumpAndSettle();
      await t.testTextInput.receiveAction(TextInputAction.done);
      await t.pumpAndSettle();
      final searcher = t
          .widget<ScorePdfTextSearchSheet>(find.byType(ScorePdfTextSearchSheet))
          .searcher;
      for (
        var attempt = 0;
        attempt < 100 &&
            (searcher.isSearching || searcher.searchingPageNumber != 3);
        attempt++
      ) {
        await t.runAsync(
          () => Future<void>.delayed(const Duration(milliseconds: 20)),
        );
        await t.pump(const Duration(milliseconds: 20));
      }
      expect(searcher.pattern, 'Page 3 of 3');
      expect(searcher.matches, hasLength(1));
      expect(searcher.matches.single.pageNumber, 3);
      final session = searcher.searchSession;
      await command(t, '검색');
      expect(searcher.searchSession, session);
      expect(searcher.matches.single.pageNumber, 3);
      expect(t.takeException(), isNull);
    },
  );

  testWidgets('PDF search rejects actions for a replaced document', (t) async {
    final c = await openPdf(t, scale: 2);
    await openViewerOption(t, 'PDF 본문 검색');
    await c.store.saveScores(
      c.scores
          .map(
            (s) => s.id == 'pilot-0'
                ? s.copyWith(filePath: '/missing-search-fixture.pdf')
                : s,
          )
          .toList(),
    );
    await c.load();
    await t.pump(const Duration(milliseconds: 100));
    await waitForMissingPdf(t);
    await t.runAsync(() => t.pumpAndSettle());
    expect(find.text('악보가 바뀌었습니다. 닫은 뒤 다시 검색해 주세요.'), findsOneWidget);
    expect(find.byType(TextField), findsNothing);
    await command(t, '닫기');
    expect(c.scoreById('pilot-0').filePath, '/missing-search-fixture.pdf');
    expect(t.takeException(), isNull);
  });

  testWidgets('PDF search can close while a long document is being searched', (
    t,
  ) async {
    await openPdf(t, fixture: 'long-scan-like-score.pdf', scale: 2);
    final document = pdf(t).document;
    await openViewerOption(t, 'PDF 본문 검색');
    final field = find.descendant(
      of: find.byType(DdiroriInput),
      matching: find.byType(TextField),
    );
    await t.enterText(field, 'no_fixture_match_20261030');
    await t.pumpAndSettle();
    final search = find.byWidgetPredicate(
      (w) => w is DdiroriButton && w.label == '검색',
    );
    await t.ensureVisible(search);
    await t.tap(search);
    await t.pump();
    t.state<NavigatorState>(find.byType(Navigator).first).pop();
    await t.pumpAndSettle();
    await t.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 150)),
    );
    await t.pump();
    expect(find.byType(ScorePdfTextSearchSheet), findsNothing);
    expect(pdf(t).document, same(document));
    expect(t.takeException(), isNull);
  });

  testWidgets(
    'auto scroll controls follow pause resume and stop in one sheet',
    (t) async {
      await openPdf(t);
      await command(t, '연습');
      await command(t, '자동 스크롤');
      await liveCommand(t, '시작');
      await waitForNativePdf(t, 3);
      for (var i = 0; i < 8; i++) {
        await t.pump(const Duration(milliseconds: 100));
      }
      expect(find.byType(BottomSheet), findsNothing);
      await liveCommand(t, '연습');
      await liveCommand(t, '자동 스크롤');
      await liveCommand(t, '일시정지');
      expect(
        find.byWidgetPredicate((w) => w is DdiroriButton && w.label == '재개'),
        findsOneWidget,
      );
      expect(find.textContaining('일시정지 · 진행률'), findsOneWidget);
      await liveCommand(t, '재개');
      expect(
        find.byWidgetPredicate((w) => w is DdiroriButton && w.label == '일시정지'),
        findsOneWidget,
      );
      await liveCommand(t, '정지');
      await t.pumpAndSettle();
      expect(
        find.byWidgetPredicate((w) => w is DdiroriButton && w.label == '시작'),
        findsOneWidget,
      );
      expect(find.textContaining('진행률'), findsNothing);
      expect(t.takeException(), isNull);
    },
  );

  for (final fails in [false, true]) {
    testWidgets(
      'auto scroll delayed start ignores closed viewer (failure=$fails)',
      (t) async {
        final store = NotesWriteStore();
        await openPdf(t, store: store);
        await command(t, '연습');
        await command(t, '자동 스크롤');
        final gate = Completer<void>();
        store.gate = gate;
        store.failWrites = fails;
        addTearDown(() {
          if (!gate.isCompleted) gate.complete();
        });
        await liveCommand(t, '시작');
        final navigator = t.state<NavigatorState>(find.byType(Navigator).first);
        navigator.pop();
        await t.pumpAndSettle();
        navigator.pop();
        await t.pumpAndSettle();
        expect(find.byType(SheetViewerScreen), findsNothing);
        gate.complete();
        await t.pump(const Duration(milliseconds: 500));
        expect(t.takeException(), isNull);
      },
    );
  }

  testWidgets('auto scroll start failure keeps settings and offers retry', (
    t,
  ) async {
    final store = NotesWriteStore();
    final c = await openPdf(t, store: store);
    await command(t, '연습');
    await command(t, '자동 스크롤');
    await t.tap(find.byTooltip('느리게'));
    await t.pumpAndSettle();
    expect(c.scoreById('pilot-0').autoScrollSettings.durationSeconds, 270);
    store.failWrites = true;
    await liveCommand(t, '시작');
    expect(t.takeException(), isNull);
    expect(find.text('자동 스크롤을 시작하지 못했습니다. 다시 시도해 주세요.'), findsOneWidget);
    expect(find.text('연주 시간 4분 30초'), findsOneWidget);
    store.failWrites = false;
    await liveCommand(t, '시작');
    await waitForNativePdf(t, 3);
    for (var i = 0; i < 8; i++) {
      await t.pump(const Duration(milliseconds: 100));
    }
    expect(find.byType(BottomSheet), findsNothing);
    await liveCommand(t, '연습');
    await liveCommand(t, '자동 스크롤');
    await liveCommand(t, '정지');
    await t.pumpAndSettle();
    expect(c.scoreById('pilot-0').autoScrollSettings.durationSeconds, 270);
    expect(t.takeException(), isNull);
  });

  for (final fails in [false, true]) {
    testWidgets(
      'auto scroll settings serialize rapid edits (older failure=$fails)',
      (t) async {
        final store = AutoScrollWriteStore();
        final c = await openPdf(t, store: store);
        await command(t, '연습');
        await command(t, '자동 스크롤');
        final gate = Completer<void>();
        store.nextGate = gate;
        store.failNext = fails;
        store.attempts.clear();
        addTearDown(() {
          if (!gate.isCompleted) gate.complete();
        });
        await t.tap(find.byTooltip('느리게'));
        await t.pump();
        await t.tap(find.byTooltip('빠르게'));
        await t.pump();
        expect(store.attempts.length, 1);
        expect(find.text('연주 시간 4분'), findsOneWidget);
        gate.complete();
        await t.pumpAndSettle();
        expect(store.attempts.length, 2);
        expect(store.attempts[0].first.autoScrollSettings.durationSeconds, 270);
        expect(store.attempts[1].first.autoScrollSettings.durationSeconds, 240);
        expect(c.scoreById('pilot-0').autoScrollSettings.durationSeconds, 240);
        expect(
          (await store.loadScores()).first.autoScrollSettings.durationSeconds,
          240,
        );
        expect(find.textContaining('설정을 저장하지 못했습니다.'), findsNothing);
        expect(t.takeException(), isNull);
      },
    );
  }

  testWidgets(
    'auto scroll settings failure preserves draft and retries on start',
    (t) async {
      final store = AutoScrollWriteStore();
      final c = await openPdf(t, store: store);
      await command(t, '연습');
      await command(t, '자동 스크롤');
      store.failNext = true;
      await t.tap(find.byTooltip('느리게'));
      await t.pumpAndSettle();
      expect(c.scoreById('pilot-0').autoScrollSettings.durationSeconds, 240);
      expect(find.text('연주 시간 4분 30초'), findsOneWidget);
      expect(find.textContaining('설정을 저장하지 못했습니다.'), findsOneWidget);
      await liveCommand(t, '시작');
      await waitForNativePdf(t, 3);
      for (var i = 0; i < 8; i++) {
        await t.pump(const Duration(milliseconds: 100));
      }
      expect(find.byType(BottomSheet), findsNothing);
      expect(c.scoreById('pilot-0').autoScrollSettings.durationSeconds, 270);
      await liveCommand(t, '연습');
      await liveCommand(t, '자동 스크롤');
      await liveCommand(t, '정지');
      await t.pumpAndSettle();
      expect(t.takeException(), isNull);
    },
  );

  testWidgets(
    'auto scroll newest settings failure stays visible after older success',
    (t) async {
      final store = AutoScrollWriteStore();
      final c = await openPdf(t, store: store);
      await command(t, '연습');
      await command(t, '자동 스크롤');
      await t.tap(find.byTooltip('느리게'));
      await t.pumpAndSettle();
      store.failNext = true;
      await t.tap(find.byTooltip('빠르게'));
      await t.pumpAndSettle();
      expect(find.text('연주 시간 4분'), findsOneWidget);
      expect(c.scoreById('pilot-0').autoScrollSettings.durationSeconds, 270);
      expect(find.textContaining('설정을 저장하지 못했습니다.'), findsOneWidget);
      await t.tap(find.byTooltip('느리게'));
      await t.pumpAndSettle();
      expect(find.textContaining('설정을 저장하지 못했습니다.'), findsNothing);
      expect(c.scoreById('pilot-0').autoScrollSettings.durationSeconds, 270);
      expect(t.takeException(), isNull);
    },
  );

  for (final fails in [false, true]) {
    testWidgets(
      'auto scroll closed sheet cannot start or close its replacement (failure=$fails)',
      (t) async {
        final store = AutoScrollWriteStore();
        await openPdf(t, store: store);
        final document = pdf(t).document;
        await command(t, '연습');
        await command(t, '자동 스크롤');
        final gate = Completer<void>();
        store.nextGate = gate;
        store.failNext = fails;
        store.attempts.clear();
        addTearDown(() {
          if (!gate.isCompleted) gate.complete();
        });
        await liveCommand(t, '시작');
        await liveCommand(t, '시작');
        expect(store.attempts.length, 1);
        t.state<NavigatorState>(find.byType(Navigator).first).pop();
        await t.pumpAndSettle();
        await command(t, '연습');
        await command(t, '자동 스크롤');
        gate.complete();
        await t.pumpAndSettle();
        expect(find.byType(BottomSheet), findsOneWidget);
        expect(find.textContaining('진행률'), findsNothing);
        expect(find.textContaining('시작하지 못했습니다.'), findsNothing);
        expect(find.textContaining('자동 스크롤은 세로'), findsNothing);
        expect(
          find.byWidgetPredicate((w) => w is DdiroriButton && w.label == '시작'),
          findsOneWidget,
        );
        expect(pdf(t).document, same(document));
        expect(t.takeException(), isNull);
      },
    );
  }

  testWidgets(
    'auto scroll cue survives successful sheet close and can be cancelled',
    (t) async {
      await openPdf(t);
      await command(t, '연습');
      await command(t, '자동 스크롤');
      await t.ensureVisible(find.text('10초'));
      await t.pumpAndSettle();
      await t.tap(find.text('10초'));
      await t.pumpAndSettle();
      await liveCommand(t, '시작');
      await waitForNativePdf(t, 3);
      for (var i = 0; i < 6; i++) {
        await t.pump(const Duration(milliseconds: 100));
      }
      expect(find.byType(BottomSheet), findsNothing);
      await liveCommand(t, '연습');
      await liveCommand(t, '자동 스크롤');
      expect(find.textContaining('시작까지'), findsOneWidget);
      await liveCommand(t, '정지');
      await t.pumpAndSettle();
      expect(find.textContaining('시작까지'), findsNothing);
      expect(
        find.byWidgetPredicate((w) => w is DdiroriButton && w.label == '시작'),
        findsOneWidget,
      );
      expect(t.takeException(), isNull);
    },
  );

  testWidgets(
    'auto scroll stale start failure cannot act on replacement document',
    (t) async {
      final store = AutoScrollWriteStore();
      final c = await openPdf(t, store: store);
      await command(t, '연습');
      await command(t, '자동 스크롤');
      final gate = Completer<void>();
      store.nextGate = gate;
      store.failNext = true;
      addTearDown(() {
        if (!gate.isCompleted) gate.complete();
      });
      await liveCommand(t, '시작');
      final replacement = c
          .scoreById('pilot-0')
          .copyWith(filePath: '/missing-auto-scroll-fixture.pdf');
      await store.saveScores([replacement]);
      await c.load();
      await waitForMissingPdf(t);
      for (var i = 0; i < 5; i++) {
        await t.runAsync(
          () => Future<void>.delayed(const Duration(milliseconds: 25)),
        );
        await t.pump(const Duration(milliseconds: 100));
      }
      expect(find.text('악보가 바뀌었습니다. 닫은 뒤 다시 열어 주세요.'), findsOneWidget);
      gate.complete();
      await t.pumpAndSettle();
      expect(c.scoreById('pilot-0').filePath, replacement.filePath);
      expect(find.textContaining('자동 스크롤은 세로'), findsNothing);
      expect(find.textContaining('시작하지 못했습니다.'), findsNothing);
      expect(find.byType(BottomSheet), findsOneWidget);
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
