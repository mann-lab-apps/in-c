import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:in_c_sheet/sheet_setlist.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  late _VisitStore store;
  late SheetLibraryController controller;
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    store = _VisitStore();
    final now = DateTime(2026, 9, 14);
    await store.saveScores([
      for (final id in ['one', 'two'])
        SheetScore(
          id: id,
          title: id,
          composer: '',
          tags: const [],
          note: '',
          filePath: '/tmp/clef-reading-$id-missing.pdf',
          importedAt: now,
          updatedAt: now,
          lastOpenedAt: null,
          lastPage: 1,
          isFavorite: false,
          bookmarks: const [],
        ),
    ]);
    await store.saveSetlists([
      SheetSetlist(
        id: 'concert',
        title: 'Concert',
        scoreIds: const ['one', 'two'],
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
      ),
    ]);
    controller = SheetLibraryController(store: store);
    await controller.load();
  });

  for (final entry in ['list', 'detail', 'row', 'recent', 'next', 'score']) {
    for (final outcome in ['success', 'scores', 'setlists', 'both']) {
      if (entry == 'score' && (outcome == 'setlists' || outcome == 'both')) {
        continue;
      }
      testWidgets('$entry keeps reading with visit outcome $outcome', (
        tester,
      ) async {
        await _mount(tester, controller, entry);
        final failScores = outcome == 'scores' || outcome == 'both';
        store.failScores = failScores;
        store.failSetlists = outcome == 'setlists' || outcome == 'both';
        await _open(tester, entry);
        await _settleReading(tester);
        expect(tester.takeException(), isNull);
        if (failScores) expect(store.scoreWrites, greaterThan(1));
        final viewer = tester.widget<SheetViewerScreen>(
          find.byType(SheetViewerScreen),
        );
        expect(viewer.scoreId, entry == 'next' ? 'two' : 'one');
        expect(
          find.text('최근 연주 위치를 저장하지 못했습니다. 악보는 계속 볼 수 있습니다.'),
          outcome == 'success' ? findsNothing : findsOneWidget,
        );
        if (failScores) {
          expect(
            (await store.loadScores()).every((s) => s.lastOpenedAt == null),
            isTrue,
          );
        }
        if (store.failSetlists) {
          expect((await store.loadSetlists()).single.lastOpenedScoreId, isNull);
        }
        if (outcome == 'success') {
          expect(controller.scoreById(viewer.scoreId).lastOpenedAt, isNotNull);
          if (entry != 'score') expect(store.setlistWrites, 2);
        }
        await tester.pumpWidget(const SizedBox.shrink());
        await tester.pump();
      });
    }
  }

  for (final change in ['closed', 'profile', 'removed', 'covered']) {
    for (final phase in ['setlist', 'score']) {
      for (final fails in [false, true]) {
        testWidgets(
          'late $phase visit completion respects $change: fails=$fails',
          (tester) async {
            await _mount(tester, controller, 'detail');
            final pending = Completer<void>();
            if (phase == 'setlist') {
              store.pendingSetlistWrite = pending;
            } else {
              store.pendingScoreWrite = pending;
            }
            await _open(tester, 'detail');
            await tester.pump();
            expect(store.pendingSetlistWrite, isNull);
            expect(store.pendingScoreWrite, isNull);
            switch (change) {
              case 'closed':
                await tester.pumpWidget(const SizedBox.shrink());
              case 'profile':
                await controller.createLibraryProfile('Other');
              case 'removed':
                await controller.removeScoreFromSetlist(
                  controller.setlistById('concert'),
                  controller.scoreById('one'),
                );
              case 'covered':
                unawaited(
                  Navigator.of(
                    tester.element(find.byType(SheetSetlistDetailScreen)),
                  ).push<void>(
                    MaterialPageRoute(
                      builder: (_) =>
                          const Scaffold(body: Text('Other screen')),
                    ),
                  ),
                );
            }
            await tester.pumpAndSettle();
            if (fails) {
              pending.completeError(StateError('late visit failed'));
            } else {
              pending.complete();
            }
            await _settleReading(tester);
            expect(tester.takeException(), isNull);
            expect(find.byType(SheetViewerScreen), findsNothing);
            expect(
              find.text('최근 연주 위치를 저장하지 못했습니다. 악보는 계속 볼 수 있습니다.'),
              findsNothing,
            );
            if (change == 'covered') {
              expect(find.text('Other screen'), findsOneWidget);
            }
          },
        );
      }
    }
  }

  for (final fails in [false, true]) {
    testWidgets('empty recent setlist opens detail: save fails=$fails', (
      tester,
    ) async {
      for (final score in controller.scores.toList()) {
        await controller.removeScoreFromSetlist(
          controller.setlistById('concert'),
          score,
        );
      }
      await _mount(tester, controller, 'recent');
      store.failSetlists = fails;
      await _open(tester, 'recent');
      await _settleReading(tester);
      expect(find.byType(SheetSetlistDetailScreen), findsOneWidget);
      expect(tester.takeException(), isNull);
      expect(
        find.text('최근 연주 위치를 저장하지 못했습니다. 악보는 계속 볼 수 있습니다.'),
        fails ? findsOneWidget : findsNothing,
      );
    });
  }
}

Future<void> _mount(
  WidgetTester tester,
  SheetLibraryController controller,
  String entry,
) async {
  tester.view.physicalSize = const Size(1600, 1000);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  final Widget app = switch (entry) {
    'list' => MaterialApp(home: SheetSetlistsScreen(controller: controller)),
    'detail' || 'row' => MaterialApp(
      home: SheetSetlistDetailScreen(
        controller: controller,
        setlistId: 'concert',
      ),
    ),
    'next' => MaterialApp(
      home: SheetViewerScreen(
        controller: controller,
        scoreId: 'one',
        setlistId: 'concert',
      ),
    ),
    _ => InCSheetApp(controller: controller),
  };
  await tester.runAsync(() async {
    await tester.pumpWidget(app);
    await Future<void>.delayed(const Duration(milliseconds: 50));
  });
  await tester.pumpAndSettle();
}

Future<void> _open(WidgetTester tester, String entry) async {
  final finder = switch (entry) {
    'list' || 'detail' => find.byTooltip('첫 곡 열기').first,
    'next' => find.byTooltip('다음 곡').first,
    'recent' => find.text('Concert').first,
    'score' => find.text('one').last,
    _ => find.text('one').first,
  };
  await Scrollable.ensureVisible(tester.element(finder), alignment: 0.5);
  await tester.pump();
  await tester.tap(finder);
  if (entry == 'next') {
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, '이동'));
  }
}

Future<void> _settleReading(WidgetTester tester) async {
  // Missing-file fixtures establish routing/error feedback, not native PDF rendering.
  for (var i = 0; i < 2; i++) {
    await tester.runAsync(() async {
      await tester.pump();
      await Future<void>.delayed(const Duration(milliseconds: 50));
    });
    await tester.pump(const Duration(milliseconds: 500));
  }
}

class _VisitStore extends SheetLibraryStore {
  int scoreWrites = 0;
  int setlistWrites = 0;
  Completer<void>? pendingSetlistWrite;
  Completer<void>? pendingScoreWrite;
  bool failScores = false;
  bool failSetlists = false;

  @override
  Future<void> saveScores(List<SheetScore> scores) async {
    scoreWrites++;
    final pending = pendingScoreWrite;
    pendingScoreWrite = null;
    await pending?.future;
    if (failScores) throw StateError('score visit failed');
    await super.saveScores(scores);
  }

  @override
  Future<void> saveSetlists(List<SheetSetlist> setlists) async {
    setlistWrites++;
    final pending = pendingSetlistWrite;
    pendingSetlistWrite = null;
    await pending?.future;
    if (failSetlists) throw StateError('setlist visit failed');
    await super.saveSetlists(setlists);
  }
}
