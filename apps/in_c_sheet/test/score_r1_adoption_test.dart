import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/presentation/score_library_components.dart';

import 'adoption_pilot_test.dart' as pilot;
import 'brand_pilot_test.dart' show FailedStore;

Future<void> capture(
  WidgetTester t,
  String name, {
  required double width,
  required double scale,
  required bool dark,
}) async {
  if (Platform.environment['DDIRORI_SCORE_R1_CAPTURE'] != 'true') return;
  expect(Platform.environment['DDIRORI_BRAND_FONT'], isNotEmpty);
  expect(Platform.environment['DDIRORI_MATERIAL_FONT'], isNotEmpty);
  await t.pump();
  final boundary = t.renderObject<RenderRepaintBoundary>(
    find.byKey(const Key('pilot-capture')),
  );
  await t.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 1);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    final dir = Directory(
      '../../docs/brand/ddirori-design-system/product-design-r1/returns/score-20261025/screens',
    );
    await dir.create(recursive: true);
    await File('${dir.path}/$name.png')
        .writeAsBytes(bytes!.buffer.asUint8List());
    await File('${dir.path}/$name.json').writeAsString(
      jsonEncode({
        'state': name,
        'kind': 'actual-product Flutter widget-renderer',
        'fixture':
            'adoption_pilot pilot-0/1/2; synthetic metadata; missing PDF paths',
        'viewport': [width, 1000],
        'device_scale': 1,
        'text_scale': scale,
        'theme': dark ? 'dark' : 'light',
        'accent': 'lime (existing trial)',
        'implementation_commit': 'uncommitted',
      }),
    );
    image.dispose();
  });
}

Future<void> selectFirst(WidgetTester t) async {
  await t.tap(find.byTooltip('여러 악보 선택'));
  await t.pumpAndSettle();
  final scroll = t.state<NestedScrollViewState>(find.byType(NestedScrollView));
  scroll.outerController.jumpTo(
    scroll.outerController.position.maxScrollExtent,
  );
  await t.pumpAndSettle();
  final first = find.byType(Checkbox).first;
  await t.ensureVisible(first);
  await t.tap(first);
  await t.pumpAndSettle();
}

Future<void> revealLibraryItem(WidgetTester t, Finder target) async {
  final scroll = t.state<NestedScrollViewState>(find.byType(NestedScrollView));
  scroll.outerController.jumpTo(
    scroll.outerController.position.maxScrollExtent,
  );
  await t.pumpAndSettle();
  await t.scrollUntilVisible(
    target,
    200,
    scrollable: find
        .descendant(
          of: find.byType(ScoreLibraryCollection),
          matching: find.byType(Scrollable),
        )
        .first,
  );
  await t.pumpAndSettle();
}

void main() {
  for (final width in [320.0, 600.0, 840.0]) {
    testWidgets('R1 row secondary actions never open at $width', (t) async {
      final c = await pilot.library();
      addTearDown(c.dispose);
      await pilot.mount(t, c, width: width);
      final row = find.byKey(const ValueKey('score-pilot-0'));
      for (final label in ['즐겨찾기 해제', '고정', '더보기']) {
        final action = find.descendant(
          of: row,
          matching: find.byTooltip(label),
        );
        await revealLibraryItem(t, action);
        await t.tap(action);
        await t.pumpAndSettle();
        expect(find.byType(SheetViewerScreen), findsNothing);
      }
      expect(find.text('악보 정보 편집'), findsOneWidget);
      expect(find.text('PDF 공유'), findsOneWidget);
      expect(c.scoreById('pilot-0').isFavorite, isFalse);
      expect(c.scoreById('pilot-0').isPinned, isTrue);
      expect(t.takeException(), isNull);
    });
  }

  for (final scene in [(320.0, 2.0, true), (840.0, 1.0, false)]) {
    testWidgets(
      'R1 viewer title and Back stay above scrollable tools ${scene.$1}',
      (t) async {
        final c = await pilot.library();
        addTearDown(c.dispose);
        await pilot.mount(
          t,
          c,
          width: scene.$1,
          scale: scene.$2,
          dark: scene.$3,
        );
        final title = find.descendant(
          of: find.byKey(const ValueKey('score-pilot-0')),
          matching: find.text('평균율 연습곡'),
        );
        final scroll = t.state<NestedScrollViewState>(
          find.byType(NestedScrollView),
        );
        scroll.outerController.jumpTo(
          scroll.outerController.position.maxScrollExtent,
        );
        await t.pumpAndSettle();
        await revealLibraryItem(t, title);
        await t.tap(title);
        await t.pump(const Duration(milliseconds: 400));
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
        final toolbar = find.descendant(
          of: find.byType(AppBar),
          matching: find.byType(SingleChildScrollView),
        );
        final back = find.byTooltip('뒤로');
        final backPosition = t.getTopLeft(back);
        expect(
          t.getTopLeft(find.text('평균율 연습곡')).dy,
          lessThan(t.getTopLeft(toolbar).dy),
        );
        await t.drag(toolbar, const Offset(-1500, 0));
        await t.pumpAndSettle();
        expect(t.getTopLeft(back), backPosition);
        expect(t.takeException(), isNull);
        await capture(
          t,
          'viewer-unavailable-${scene.$1.toInt()}',
          width: scene.$1,
          scale: scene.$2,
          dark: scene.$3,
        );
        await t.tap(back);
        await t.pumpAndSettle();
        expect(find.byType(ScoreLibraryCollection), findsOneWidget);
      },
    );
  }

  test('bulk edits publish only after successful persistence', () async {
    final store = pilot.PendingStore();
    final c = await pilot.library(store: store);
    addTearDown(c.dispose);
    final before = c.scoreById('pilot-0');
    store.gate = Completer<void>();
    final save = c.bulkEditScores({'pilot-0'}, addTags: ['new']);
    final failure = expectLater(save, throwsStateError);
    final duringSave = c.scoreById('pilot-0');
    store.gate!.completeError(StateError('fixture'));
    await failure;
    expect(duringSave, same(before));
    expect(c.scoreById('pilot-0'), same(before));
    store.gate = null;
    expect(await c.bulkEditScores({'pilot-0'}, addTags: ['new']), 1);
    expect(c.scoreById('pilot-0').tags, contains('new'));
    expect(
      (await store.loadScores()).singleWhere((s) => s.id == 'pilot-0').tags,
      contains('new'),
    );
  });

  testWidgets(
    'R1 profile switching and import cancel or failure keep the library usable',
    (t) async {
      final store = pilot.ImportStore();
      final c = await pilot.library(store: store);
      addTearDown(c.dispose);
      final defaultId = c.activeLibraryProfile.id;
      await c.createLibraryProfile('리허설');
      await c.switchLibraryProfile(defaultId);
      await pilot.mount(t, c);
      await t.tap(find.byTooltip('라이브러리 전환'));
      await t.pumpAndSettle();
      await t.tap(find.text('리허설'));
      await t.pumpAndSettle();
      expect(c.activeLibraryProfile.name, '리허설');
      await t.tap(find.byTooltip('라이브러리 전환'));
      await t.pumpAndSettle();
      await t.tap(find.text('기본 라이브러리'));
      await t.pumpAndSettle();
      expect(c.scores, hasLength(3));
      for (final fail in [false, true]) {
        store.failImport = fail;
        await t.tap(find.byTooltip('악보 추가'));
        await t.pumpAndSettle();
        await t.tap(find.text('PDF 가져오기'));
        await t.pumpAndSettle();
        expect(c.scores, hasLength(3));
        expect(c.isImporting, isFalse);
        expect(find.byType(SheetViewerScreen), findsNothing);
        expect(t.takeException(), isNull);
        await pilot.top(t);
      }
    },
  );

  testWidgets(
    'R1 library identity precedes search and hidden selection stays explicit',
    (t) async {
      final c = await pilot.library();
      addTearDown(c.dispose);
      await pilot.mount(t, c, width: 840);
      expect(
        t.getTopLeft(find.text('기본 라이브러리')).dy,
        lessThan(t.getTopLeft(find.byType(TextField).first).dy),
      );
      await t.tap(find.byTooltip('여러 악보 선택'));
      await t.pumpAndSettle();
      final row = find.byKey(const ValueKey('score-pilot-0'));
      await t.ensureVisible(row);
      await t.tap(find.descendant(of: row, matching: find.byType(Checkbox)));
      await pilot.top(t);
      await t.enterText(find.byType(TextField).first, '없는 곡');
      await t.pumpAndSettle();
      expect(find.text('필터 밖 1개 포함'), findsOneWidget);
      await t.tap(find.text('일괄 편집'));
      await t.pumpAndSettle();
      await t.ensureVisible(find.text('취소'));
      await t.tap(find.text('취소'));
      await t.pumpAndSettle();
      expect(find.text('필터 밖 1개 포함'), findsOneWidget);
      expect(FocusManager.instance.primaryFocus?.debugLabel, 'Score bulk edit');
      expect(c.query, '없는 곡');
      expect(find.byType(SheetViewerScreen), findsNothing);
    },
  );

  for (final width in [320.0, 390.0, 840.0]) {
    for (final scale in [1.0, 2.0]) {
      for (final dark in [false, true]) {
        testWidgets('R1 layout $width text=$scale dark=$dark', (t) async {
          final c = await pilot.library();
          addTearDown(c.dispose);
          await pilot.mount(t, c, width: width, scale: scale, dark: dark);
          final name =
              '${width.toInt()}-${scale.toInt()}-${dark ? 'dark' : 'light'}';
          final shouldCapture =
              width == 320 && scale == 2 || width != 320 && scale == 1;
          if (shouldCapture) {
            await capture(
              t,
              'default-$name',
              width: width,
              scale: scale,
              dark: dark,
            );
          }
          await selectFirst(t);
          expect(find.text('1개 선택'), findsOneWidget);
          expect(t.takeException(), isNull);
          if (shouldCapture) {
            await capture(
              t,
              'selected-$name',
              width: width,
              scale: scale,
              dark: dark,
            );
          }
        });
      }
    }
  }

  for (final scene in [
    (320.0, 2.0, true),
    (390.0, 1.0, false),
    (840.0, 1.0, false),
  ]) {
    testWidgets('R1 pending failure retry success ${scene.$1}', (t) async {
      final store = pilot.PendingStore();
      final c = await pilot.library(store: store);
      addTearDown(c.dispose);
      await pilot.mount(t, c, width: scene.$1, scale: scene.$2, dark: scene.$3);
      await selectFirst(t);
      final selectedId = c.filteredScores.first.id;
      final before = c.scoreById(selectedId);
      final scroll = t.state<NestedScrollViewState>(
        find.byType(NestedScrollView),
      );
      final offset = scroll.outerController.offset;
      await t.tap(find.text('일괄 편집'));
      await t.pumpAndSettle();
      await t.enterText(find.widgetWithText(TextField, '추가할 태그'), 'R1 연습');
      store.gate = Completer<void>();
      final apply = find.byWidgetPredicate(
        (w) => w is DdiroriButton && w.label == '적용',
      );
      await t.ensureVisible(apply);
      await t.pumpAndSettle();
      await t.tap(apply);
      await t.tap(apply);
      await t.pump();
      await t.binding.handlePopRoute();
      await t.pump();
      expect(store.pendingWrites, 1);
      expect(c.scoreById(selectedId), same(before));
      expect(
        t.widget<TextField>(find.widgetWithText(TextField, '추가할 태그')).readOnly,
        isTrue,
      );
      expect(t.takeException(), isNull);
      await capture(
        t,
        'pending-${scene.$1.toInt()}',
        width: scene.$1,
        scale: scene.$2,
        dark: scene.$3,
      );
      store.gate!.completeError(StateError('fixture write failure'));
      await t.pumpAndSettle();
      expect(c.scoreById(selectedId), same(before));
      expect(
        t
            .widget<TextField>(find.widgetWithText(TextField, '추가할 태그'))
            .controller!
            .text,
        'R1 연습',
      );
      expect(find.textContaining('입력을 유지'), findsOneWidget);
      expect(t.takeException(), isNull);
      await t.scrollUntilVisible(
        apply,
        200,
        scrollable: find
            .descendant(
              of: find.byType(BottomSheet),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      await t.pumpAndSettle();
      await capture(
        t,
        'failure-${scene.$1.toInt()}',
        width: scene.$1,
        scale: scene.$2,
        dark: scene.$3,
      );
      store.gate = Completer<void>();
      await t.tap(apply);
      await t.pump();
      expect(store.pendingWrites, 2);
      await capture(
        t,
        'retry-${scene.$1.toInt()}',
        width: scene.$1,
        scale: scene.$2,
        dark: scene.$3,
      );
      store.gate!.complete();
      await t.pumpAndSettle();
      store.gate = null;
      expect(c.scoreById(selectedId).tags, contains('R1 연습'));
      expect(find.textContaining('일괄 편집했습니다'), findsOneWidget);
      expect(
        FocusManager.instance.primaryFocus?.debugLabel,
        'Score library heading',
      );
      expect(scroll.outerController.offset, offset);
      expect(t.takeException(), isNull);
      await capture(
        t,
        'success-${scene.$1.toInt()}',
        width: scene.$1,
        scale: scene.$2,
        dark: scene.$3,
      );
    });
  }

  for (final state in [
    'empty',
    'search-empty',
    'loading',
    'error',
    'disabled',
  ]) {
    testWidgets('R1 state $state', (t) async {
      final c = await pilot.library(
        empty: state == 'empty',
        load: state != 'loading',
        store: state == 'error' ? FailedStore() : null,
      );
      addTearDown(c.dispose);
      if (state == 'search-empty') c.updateQuery('없는 곡');
      await pilot.mount(t, c);
      if (state == 'disabled') {
        await t.tap(find.byTooltip('여러 악보 선택'));
        await t.pumpAndSettle();
        expect(
          t
              .widget<DdiroriButton>(
                find.widgetWithText(DdiroriButton, '일괄 편집'),
              )
              .onPressed,
          isNull,
        );
      }
      expect(t.takeException(), isNull);
      await capture(t, state, width: 390, scale: 1, dark: false);
    });
  }
}
