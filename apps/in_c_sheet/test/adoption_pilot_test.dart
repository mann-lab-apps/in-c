import 'dart:io';
import 'dart:async';
import 'dart:ui' as ui;

import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/presentation/score_library_components.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_library_view_settings.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'brand_pilot_test.dart' as fixtures show font, FailedStore;

class ImportStore extends SheetLibraryStore {
  bool failImport = false;
  @override
  Future<SheetScore?> importPdf() async {
    if (failImport) throw const FileSystemException('fixture import failure');
    return null;
  }
}

class PendingStore extends SheetLibraryStore {
  Completer<void>? gate;
  int pendingWrites = 0;
  @override
  Future<void> saveScores(List<SheetScore> scores) async {
    final current = gate;
    if (current != null) {
      pendingWrites++;
      await current.future;
    }
    await super.saveScores(scores);
  }
}

Future<SheetLibraryController> library({
  SheetLibraryStore? store,
  bool load = true,
  bool empty = false,
}) async {
  SharedPreferences.setMockInitialValues({});
  final s = store ?? SheetLibraryStore();
  if (!empty) {
    await s.saveScores([
      for (final (i, title) in [
        '평균율 연습곡',
        '저녁 연습',
        '긴 제목을 가진 자가 제작 악보 · Long study for piano and ensemble',
      ].indexed)
        SheetScore(
          id: 'pilot-$i',
          title: title,
          composer: '자가 제작 샘플',
          tags: ['연습'],
          note: '',
          filePath: '/ddirori-pilot-fixture/$i.pdf',
          importedAt: DateTime(2026, 10, 24),
          updatedAt: DateTime(2026, 10, 24),
          lastOpenedAt: null,
          lastPage: 1,
          isFavorite: i == 0,
          bookmarks: [],
        ),
    ]);
  }
  final c = SheetLibraryController(store: s);
  if (load) await c.load();
  return c;
}

Future<void> mount(
  WidgetTester t,
  SheetLibraryController c, {
  String accent = 'lime',
  bool dark = false,
  double width = 390,
  double scale = 1,
}) async {
  t.view.physicalSize = Size(width, 1000);
  t.view.devicePixelRatio = 1;
  t.platformDispatcher.textScaleFactorTestValue = scale;
  addTearDown(() {
    t.view.resetPhysicalSize();
    t.view.resetDevicePixelRatio();
    t.platformDispatcher.clearAllTestValues();
  });
  await fixtures.font(t);
  await t.pumpWidget(
    RepaintBoundary(
      key: const Key('pilot-capture'),
      child: InCSheetApp(
        controller: c,
        accent: accent,
        themeMode: dark ? ThemeMode.dark : ThemeMode.light,
        fontFamily: 'DdiroriCapture',
      ),
    ),
  );
  await t.pump(const Duration(milliseconds: 400));
  expect(t.takeException(), isNull);
}

Future<void> capture(WidgetTester t, String name) async {
  if (Platform.environment['DDIRORI_PILOT_CAPTURE'] != 'true') return;
  final boundary = t.renderObject<RenderRepaintBoundary>(
    find.byKey(const Key('pilot-capture')),
  );
  await t.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 1);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    final f = File(
      '../../docs/brand/ddirori-design-system/evidence/adoption-pilot/$name.png',
    );
    await f.parent.create(recursive: true);
    await f.writeAsBytes(bytes!.buffer.asUint8List());
    image.dispose();
  });
}

Future<void> top(WidgetTester t) async {
  final state = t.state<NestedScrollViewState>(find.byType(NestedScrollView));
  state.innerController.jumpTo(0);
  state.outerController.jumpTo(0);
  await t.pumpAndSettle();
}

void main() {
  testWidgets('row opens existing viewer and unavailable file guidance', (
    t,
  ) async {
    final c = await library();
    addTearDown(c.dispose);
    await mount(t, c);
    final title = find.descendant(
      of: find.byKey(const ValueKey('score-pilot-0')),
      matching: find.text('평균율 연습곡'),
    );
    await t.ensureVisible(title);
    await t.pumpAndSettle();
    await t.tap(title);
    await t.pump();
    await t.pump(const Duration(milliseconds: 400));
    expect(find.byType(SheetViewerScreen), findsOneWidget);
    // File inspection uses actual asynchronous filesystem IO, not a PDF mock.
    for (
      var attempt = 0;
      attempt < 40 && find.text('PDF 파일을 찾지 못했습니다.').evaluate().isEmpty;
      attempt++
    ) {
      await t.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 50)),
      );
      await t.pump();
    }
    await t.pumpAndSettle();
    expect(find.text('PDF 파일을 찾지 못했습니다.'), findsOneWidget);
    expect(
      c.scores.singleWhere((s) => s.id == 'pilot-0').lastOpenedAt,
      isNotNull,
    );
    await capture(t, 'score-file-unavailable');
    await t.tap(find.byTooltip('뒤로'));
    await t.pumpAndSettle();
    expect(find.byType(SheetViewerScreen), findsNothing);
    await top(t);
    expect(find.byType(ScoreLibraryControls), findsOneWidget);
    expect(c.scores, hasLength(3));
    expect(t.takeException(), isNull);
  });
  for (final accent in DdiroriTokens.accents.keys) {
    for (final dark in [false, true]) {
      testWidgets('actual score palette $accent dark=$dark', (t) async {
        final c = await library();
        addTearDown(c.dispose);
        await mount(t, c, accent: accent, dark: dark);
        expect(find.byType(ScoreLibraryControls), findsOneWidget);
        expect(find.byType(ScoreLibraryRow), findsWidgets);
        await capture(t, 'score-$accent-${dark ? 'dark' : 'light'}');
        await t.tap(find.byTooltip('여러 악보 선택'));
        await t.pumpAndSettle();
        final first = find.byType(Checkbox).first;
        await t.ensureVisible(first);
        await t.tap(first);
        await t.pumpAndSettle();
        expect(find.text('1개 선택'), findsOneWidget);
        await capture(t, 'score-$accent-selected-${dark ? 'dark' : 'light'}');
        expect(t.takeException(), isNull);
      });
    }
  }
  testWidgets(
    'search sort filter selection and bulk edit preserve stable IDs',
    (t) async {
      final c = await library();
      addTearDown(c.dispose);
      await mount(t, c, width: 840);
      await t.tap(find.text('정렬: 최근 열기'));
      await t.pumpAndSettle();
      await t.tap(find.text('제목'));
      await t.pumpAndSettle();
      expect(c.libraryViewSettings.sortMode, SheetLibrarySortMode.title);
      await t.tap(find.byTooltip('여러 악보 선택'));
      await t.pumpAndSettle();
      final row = find.byKey(const ValueKey('score-pilot-0'));
      await t.ensureVisible(row);
      await t.tap(find.descendant(of: row, matching: find.byType(Checkbox)));
      await t.pumpAndSettle();
      await top(t);
      await t.enterText(find.byType(TextField).first, '없는 곡');
      await t.pumpAndSettle();
      expect(find.text('1개 선택'), findsOneWidget);
      await t.ensureVisible(find.text('검색/필터 초기화'));
      await t.tap(find.text('검색/필터 초기화'));
      await t.pumpAndSettle();
      expect(c.query, isEmpty);
      expect(find.text('1개 선택'), findsOneWidget);
      await t.tap(find.text('일괄 편집'));
      await t.pumpAndSettle();
      await t.enterText(find.widgetWithText(TextField, '추가할 태그'), '공연');
      await t.ensureVisible(find.text('적용'));
      await t.tap(find.text('적용'));
      await t.pumpAndSettle();
      expect(c.scoreById('pilot-0').tags, contains('공연'));
      expect(c.scoreById('pilot-1').tags, isNot(contains('공연')));
      expect(c.scoreById('pilot-0').lastOpenedAt, isNull);
      await top(t);
      await t.tap(find.text('필터'));
      await t.pumpAndSettle();
      await t.tap(find.text('태그: 전체'));
      await t.pumpAndSettle();
      await t.tap(find.text('공연'));
      await t.pumpAndSettle();
      expect(c.filteredScores.map((e) => e.id), ['pilot-0']);
      expect(find.text('필터 · 1개 적용'), findsOneWidget);
      expect(t.takeException(), isNull);
    },
  );
  testWidgets('row actions do not open a score; quick access is explicit', (
    t,
  ) async {
    final c = await library();
    addTearDown(c.dispose);
    await mount(t, c);
    final row = find.byKey(const ValueKey('score-pilot-1'));
    await t.ensureVisible(row);
    await t.tap(find.descendant(of: row, matching: find.byTooltip('즐겨찾기')));
    await t.pumpAndSettle();
    expect(c.scoreById('pilot-1').isFavorite, isTrue);
    expect(c.scoreById('pilot-1').lastOpenedAt, isNull);
    await t.tap(find.descendant(of: row, matching: find.byTooltip('고정')));
    await t.pumpAndSettle();
    expect(c.scoreById('pilot-1').isPinned, isTrue);
    expect(c.scoreById('pilot-1').lastOpenedAt, isNull);
    await top(t);
    await t.ensureVisible(find.textContaining('빠른 접근'));
    await t.tap(find.textContaining('빠른 접근'));
    await t.pumpAndSettle();
    expect(find.byType(DdiroriAccordion), findsOneWidget);
    expect(t.takeException(), isNull);
  });
  testWidgets(
    'bulk pending blocks back and failure preserves draft for retry',
    (t) async {
      final store = PendingStore();
      final c = await library(store: store);
      addTearDown(c.dispose);
      await mount(t, c, width: 840);
      await t.tap(find.byTooltip('여러 악보 선택'));
      await t.pumpAndSettle();
      final first = find.byType(Checkbox).first;
      await t.ensureVisible(first);
      await t.tap(first);
      await t.pumpAndSettle();
      await t.tap(find.text('일괄 편집'));
      await t.pumpAndSettle();
      await t.enterText(find.widgetWithText(TextField, '추가할 태그'), '보존할 입력');
      store.gate = Completer<void>();
      await t.ensureVisible(find.text('적용'));
      await t.tap(find.text('적용'));
      await t.pump();
      await t.tap(find.text('취소'));
      await t.binding.handlePopRoute();
      await t.pump();
      expect(store.pendingWrites, 1);
      expect(find.text('보존할 입력'), findsOneWidget);
      store.gate!.completeError(
        const FileSystemException('fixture write failure'),
      );
      await t.pumpAndSettle();
      store.gate = null;
      expect(find.textContaining('입력을 유지'), findsOneWidget);
      expect(find.text('보존할 입력'), findsOneWidget);
      await capture(t, 'score-bulk-error');
      await t.ensureVisible(find.text('적용'));
      await t.tap(find.text('적용'));
      await t.pumpAndSettle();
      expect(find.textContaining('입력을 유지'), findsNothing);
      expect(c.scores.where((s) => s.tags.contains('보존할 입력')), hasLength(1));
      expect(t.takeException(), isNull);
    },
  );
  for (final state in [
    'empty',
    'loading',
    'error',
    'filtered',
    'large',
    'wide',
  ]) {
    testWidgets('actual score state $state', (t) async {
      final store = state == 'error'
          ? fixtures.FailedStore()
          : SheetLibraryStore();
      final c = await library(
        store: store,
        load: state != 'loading',
        empty: state == 'empty',
      );
      addTearDown(c.dispose);
      if (state == 'filtered') c.updateQuery('없는 곡');
      await mount(
        t,
        c,
        width: state == 'wide'
            ? 1024
            : state == 'large'
            ? 320
            : 390,
        scale: state == 'large' ? 2 : 1,
        dark: state == 'large',
      );
      if (state == 'large') {
        await t.drag(find.byType(NestedScrollView), const Offset(0, -650));
        await t.pumpAndSettle();
      }
      await capture(t, 'score-state-$state');
      expect(t.takeException(), isNull);
    });
  }
  testWidgets(
    'import cancellation preserves data and import failure is recoverable',
    (t) async {
      final store = ImportStore();
      final c = await library(store: store);
      addTearDown(c.dispose);
      await mount(t, c);
      final ids = c.scores.map((e) => e.id).toList();
      expect(await c.importPdf(), isNull);
      await t.pumpAndSettle();
      expect(c.scores.map((e) => e.id), ids);
      expect(c.errorMessage, isNull);
      store.failImport = true;
      expect(await c.importPdf(), isNull);
      await t.pumpAndSettle();
      expect(c.errorMessage, isNotNull);
      expect(find.byType(DdiroriBanner), findsOneWidget);
      expect(c.scores.map((e) => e.id), ids);
      expect(t.takeException(), isNull);
    },
  );
}
