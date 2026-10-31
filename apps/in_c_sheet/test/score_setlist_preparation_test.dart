import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_setlist.dart';

import 'adoption_pilot_test.dart' as pilot;

class PreparationStore extends SheetLibraryStore {
  Completer<void>? gate;
  bool fail = false;
  int writes = 0;
  @override
  Future<void> saveSetlists(List<SheetSetlist> setlists) async {
    writes++;
    await gate?.future;
    if (fail) throw const FileSystemException('fixture setlist write failure');
    await super.saveSetlists(setlists);
  }
}

Future<SheetLibraryController> details(
  WidgetTester t, {
  PreparationStore? store,
  bool populated = true,
  double width = 390,
  double height = 1000,
  double scale = 1,
  bool dark = false,
}) async {
  final c = await pilot.library(store: store);
  addTearDown(c.dispose);
  final setlist = await c.createSetlist('합주 목록');
  if (populated) await c.addScoreToSetlist(setlist, c.scores.first);
  await pilot.mount(
    t,
    c,
    width: width,
    scale: scale,
    dark: dark,
    accent: 'blue',
  );
  t.view.physicalSize = Size(width, height);
  await t.pumpAndSettle();
  await t.tap(find.byTooltip('세트리스트'));
  await t.pumpAndSettle();
  await t.tap(find.text('합주 목록'));
  await t.pumpAndSettle();
  return c;
}

Future<void> sheetAction(WidgetTester t, String label) async {
  final button = find.descendant(
    of: find.byType(BottomSheet),
    matching: find.text(label),
  );
  await t.ensureVisible(button);
  await t.pumpAndSettle();
  await t.tap(button);
  await t.pumpAndSettle();
}

Future<void> enter(WidgetTester t, String label, String value) async {
  final input = find.byWidgetPredicate(
    (w) =>
        w is TextField &&
        (w.decoration?.labelText == label || w.decoration?.hintText == label),
  );
  await t.ensureVisible(input);
  await t.pumpAndSettle();
  await t.enterText(input, value);
  await t.pumpAndSettle();
}

void main() {
  testWidgets(
    'stale score selection fails safely and retries after the source returns',
    (t) async {
      final c = await details(t, populated: false);
      final scores = c.scores.toList();
      await t.tap(find.text('악보 추가'));
      await t.pumpAndSettle();
      await enter(t, '추가할 악보 검색', '평균율');
      await sheetAction(t, '평균율 연습곡');
      await c.store.saveScores([]);
      await c.load();
      await t.pumpAndSettle();
      await sheetAction(t, '추가');
      expect(find.textContaining('추가하지 못했습니다'), findsOneWidget);
      expect(c.setlists.single.scoreIds, isEmpty);
      await c.store.saveScores(scores);
      await c.load();
      await t.pumpAndSettle();
      await sheetAction(t, '다시 시도');
      expect(c.setlists.single.scoreIds, ['pilot-0']);
      expect(t.takeException(), isNull);
    },
  );
  testWidgets(
    'large setlist picker remains lazy and keeps a filtered-out selection',
    (t) async {
      final c = await details(t, populated: false);
      final template = c.scores.first;
      await c.store.saveScores([
        for (var i = 0; i < 300; i++)
          SheetScore.fromJson({
            ...template.toJson(),
            'id': 'many-$i',
            'title': '합주 악보 ${i.toString().padLeft(3, '0')}',
          }),
      ]);
      await c.load();
      await t.pumpAndSettle();
      await t.tap(find.text('악보 추가'));
      await t.pumpAndSettle();
      expect(find.byType(DdiroriItem).evaluate().length, lessThan(60));
      final list = find.byKey(const ValueKey('score-setlist-picker-list'));
      await t.scrollUntilVisible(
        find.text('합주 악보 299'),
        1200,
        scrollable: find.descendant(
          of: list,
          matching: find.byType(Scrollable),
        ),
        maxScrolls: 60,
      );
      await sheetAction(t, '합주 악보 299');
      await enter(t, '추가할 악보 검색', '검색 결과 없음');
      expect(find.text('선택: 합주 악보 299'), findsOneWidget);
      await sheetAction(t, '추가');
      expect(c.setlists.single.scoreIds, ['many-299']);
      expect(c.scores.every((s) => s.lastOpenedAt == null), isTrue);
      expect(find.byType(SheetViewerScreen), findsNothing);
      expect(t.takeException(), isNull);
    },
  );

  testWidgets(
    'rehearsal folding and preset edits preserve other fields and song data',
    (t) async {
      final c = await details(t);
      final second = c.scores[1];
      await c.addScoreToSetlist(c.setlists.single, second);
      final override = SheetViewerSettings.defaultSettings.copyWith(
        displayEffect: 'sepia',
        renderProfile: 'largePdf',
        customPedalMapping: {
          ...SheetViewerSettings.defaultCustomPedalMapping,
          'ArrowRight': 'previousPage',
        },
      );
      await c.updateSetlistRehearsalSettings(
        c.setlists.single,
        scoreNotes: {second.id: '둘째 곡 원래 메모'},
        scoreStartPages: {second.id: 3},
        scoreDurations: {second.id: 60},
        transitionSeconds: 180,
        viewerSettingsOverride: override,
      );
      await t.pumpAndSettle();
      await t.tap(find.byTooltip('리허설 모드'));
      await t.pumpAndSettle();
      await enter(t, '메모', '첫 곡 새 메모');
      final firstFold = find.byWidgetPredicate(
        (w) => w is DdiroriAccordion && w.title == '평균율 연습곡',
      );
      await t.ensureVisible(firstFold);
      await t.pumpAndSettle();
      await t.tap(
        find.descendant(
          of: firstFold,
          matching: find.textContaining('평균율 연습곡'),
        ),
      );
      await t.pumpAndSettle();
      await t.tap(
        find.descendant(
          of: firstFold,
          matching: find.textContaining('평균율 연습곡'),
        ),
      );
      await t.pumpAndSettle();
      expect(find.text('첫 곡 새 메모'), findsOneWidget);
      final choice = find.descendant(
        of: find.ancestor(
          of: find.text('보기 모드'),
          matching: find.byType(DdiroriSettingsRow),
        ),
        matching: find.widgetWithText(FilterChip, '2페이지'),
      );
      await t.ensureVisible(choice);
      await t.pumpAndSettle();
      await t.tap(choice);
      await t.pumpAndSettle();
      await sheetAction(t, '저장');
      final saved = (await c.store.loadSetlists()).single;
      expect(saved.scoreNotes, {
        'pilot-0': '첫 곡 새 메모',
        second.id: '둘째 곡 원래 메모',
      });
      expect(saved.scoreStartPages[second.id], 3);
      expect(saved.scoreDurations[second.id], 60);
      expect(saved.transitionSeconds, 180);
      expect(
        saved.viewerSettingsOverride!.toJson(),
        override.copyWith(displayMode: 'twoPage').toJson(),
      );
      expect(t.takeException(), isNull);
    },
  );

  for (final fail in [false, true]) {
    testWidgets('adding a score waits for real persistence: $fail', (t) async {
      final store = PreparationStore();
      final c = await details(t, store: store, populated: false);
      final original = c.setlists.single.toJson();
      await t.tap(find.text('악보 추가'));
      await t.pumpAndSettle();
      await enter(t, '추가할 악보 검색', '평균율');
      await sheetAction(t, '평균율 연습곡');
      store.gate = Completer<void>();
      store.fail = fail;
      final writes = store.writes;
      await sheetAction(t, '추가');
      expect(store.writes, writes + 1);
      expect(find.byType(BottomSheet), findsOneWidget);
      expect(c.setlists.single.toJson(), original);
      await t.binding.handlePopRoute();
      await t.pumpAndSettle();
      expect(find.byType(BottomSheet), findsOneWidget);
      store.gate!.complete();
      await t.pumpAndSettle();
      if (fail) {
        expect(c.setlists.single.toJson(), original);
        expect((await store.loadSetlists()).single.toJson(), original);
        expect(find.textContaining('추가하지 못했습니다'), findsOneWidget);
        store.fail = false;
        store.gate = null;
        await sheetAction(t, '다시 시도');
      }
      expect(find.byType(BottomSheet), findsNothing);
      expect(c.setlists.single.scoreIds, ['pilot-0']);
      expect((await store.loadSetlists()).single.scoreIds, ['pilot-0']);
      expect(c.scores.every((s) => s.lastOpenedAt == null), isTrue);
      expect(t.takeException(), isNull);
    });

    testWidgets('rehearsal notes remain open until save succeeds: $fail', (
      t,
    ) async {
      final store = PreparationStore();
      final c = await details(t, store: store);
      final original = c.setlists.single.toJson();
      final scores = c.scores.map((s) => s.toJson()).toList();
      await t.tap(find.byTooltip('리허설 모드'));
      await t.pumpAndSettle();
      await enter(t, '메모', '첫 박은 조용히, 두 번째 반복에서 전환');
      await enter(t, '시작쪽', '2');
      await enter(t, '초', '45');
      store.gate = Completer<void>();
      store.fail = fail;
      await sheetAction(t, '저장');
      expect(find.byType(BottomSheet), findsOneWidget);
      expect(c.setlists.single.toJson(), original);
      await t.binding.handlePopRoute();
      await t.pumpAndSettle();
      expect(find.byType(BottomSheet), findsOneWidget);
      store.gate!.complete();
      await t.pumpAndSettle();
      if (fail) {
        expect(c.setlists.single.toJson(), original);
        expect((await store.loadSetlists()).single.toJson(), original);
        expect(find.textContaining('저장하지 못했습니다'), findsOneWidget);
        expect(find.text('첫 박은 조용히, 두 번째 반복에서 전환'), findsOneWidget);
        store.fail = false;
        store.gate = null;
        await sheetAction(t, '다시 시도');
      }
      expect(find.byType(BottomSheet), findsNothing);
      final saved = (await store.loadSetlists()).single;
      expect(saved.scoreNotes['pilot-0'], '첫 박은 조용히, 두 번째 반복에서 전환');
      expect(saved.scoreStartPages['pilot-0'], 2);
      expect(saved.scoreDurations['pilot-0'], 45);
      expect(c.scores.map((s) => s.toJson()).toList(), scores);
      await t.tap(find.byTooltip('리허설 모드'));
      await t.pumpAndSettle();
      expect(find.text('첫 박은 조용히, 두 번째 반복에서 전환'), findsOneWidget);
      expect(t.takeException(), isNull);
    });
  }

  for (final viewport in <({double width, double height, bool dark})>[
    (width: 390, height: 1000, dark: false),
    (width: 840, height: 1000, dark: true),
    (width: 840, height: 390, dark: false),
  ]) {
    testWidgets('setlist choices and notes cancel at $viewport', (t) async {
      final c = await details(
        t,
        width: viewport.width,
        height: viewport.height,
        scale: 2,
        dark: viewport.dark,
      );
      final original = c.setlists.single.toJson();
      await t.tap(find.text('악보 추가'));
      await t.pumpAndSettle();
      expect(find.byType(DdiroriInput), findsWidgets);
      await enter(t, '추가할 악보 검색', '검색 결과 없음');
      expect(find.text('검색 결과가 없습니다.'), findsOneWidget);
      await sheetAction(t, '취소');
      expect(c.setlists.single.toJson(), original);
      await t.tap(find.byTooltip('리허설 모드'));
      await t.pumpAndSettle();
      t.view.viewInsets = FakeViewPadding(
        bottom: viewport.height < 500 ? 100 : 240,
      );
      t.view.viewPadding = const FakeViewPadding(top: 24, bottom: 24);
      addTearDown(() {
        t.view.resetViewInsets();
        t.view.resetViewPadding();
      });
      await t.pumpAndSettle();
      await enter(t, '메모', '취소할 메모');
      final captureDir = Platform.environment['DDIRORI_SCORE_SETLIST_CAPTURE'];
      if (captureDir != null) {
        final boundary = t.renderObject<RenderRepaintBoundary>(
          find.byKey(const Key('pilot-capture')),
        );
        await t.runAsync(() async {
          final image = await boundary.toImage();
          final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
          await File(
            '$captureDir/rehearsal-${viewport.width.toInt()}x${viewport.height.toInt()}.png',
          ).writeAsBytes(bytes!.buffer.asUint8List());
          image.dispose();
        });
      }
      await sheetAction(t, '취소');
      expect(c.setlists.single.toJson(), original);
      expect((await c.store.loadSetlists()).single.toJson(), original);
      expect(t.takeException(), isNull);
    });
  }
}
