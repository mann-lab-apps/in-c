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
  late _SongbookStore store;
  late SheetLibraryController controller;
  late List<SheetScore> scores;
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    store = _SongbookStore();
    final now = DateTime(2026, 9, 14);
    scores = [
      for (final id in ['one', 'two'])
        SheetScore(
          id: id,
          title: id,
          composer: '',
          tags: const [],
          note: '',
          filePath: '/tmp/book.pdf',
          importedAt: now,
          updatedAt: now,
          lastOpenedAt: null,
          lastPage: 1,
          isFavorite: false,
          bookmarks: const [],
        ),
    ];
    await store.saveScores(scores);
    controller = SheetLibraryController(store: store);
    await controller.load();
  });

  Future<void> show(WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () => unawaited(
                createSongbookSetlist(
                  context,
                  controller,
                  title: 'Book 곡 모음',
                  scores: scores,
                ),
              ),
              child: const Text('Make setlist'),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  for (final failAt in [1, 2]) {
    testWidgets(
      'songbook save $failAt failure offers retry without losing scores',
      (tester) async {
        await show(tester);
        store.failAt = failAt;
        await tester.tap(find.text('Make setlist'));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(controller.scores, hasLength(2));
        expect(find.text('곡 항목은 유지되지만 세트리스트에 담지 못했습니다.'), findsOneWidget);
        expect(find.text('열기'), findsNothing);
        expect(controller.setlists, hasLength(failAt == 1 ? 0 : 1));
        store.failAt = null;
        await tester.tap(find.text('다시 시도'));
        await tester.pumpAndSettle();
        expect(controller.setlists.single.scoreIds, ['one', 'two']);
        expect(find.text('열기'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  }

  for (final stage in [1, 2]) {
    for (final changedContext in ['closed', 'switched', 'covered']) {
      for (final fails in [false, true]) {
        testWidgets(
          'songbook late save $stage $changedContext failure=$fails',
          (tester) async {
            await show(tester);
            store.gate = Completer<void>();
            store.delayAt = stage;
            store.failAt = fails ? stage : null;
            await tester.tap(find.text('Make setlist'));
            await tester.pumpAndSettle();
            expect(store.writes, stage);
            if (changedContext == 'closed') {
              await tester.pumpWidget(const SizedBox.shrink());
            } else if (changedContext == 'switched') {
              await controller.createLibraryProfile('Other');
            } else {
              unawaited(
                Navigator.of(tester.element(find.text('Make setlist')))
                    .push<void>(
                      MaterialPageRoute<void>(
                        builder: (_) =>
                            const Scaffold(body: Text('Other route')),
                      ),
                    ),
              );
              await tester.pumpAndSettle();
            }
            store.gate!.complete();
            await tester.pumpAndSettle();
            expect(tester.takeException(), isNull);
            expect(store.writes, stage);
            expect(find.text('열기'), findsNothing);
            expect(find.text('다시 시도'), findsNothing);
            expect(find.byType(SnackBar), findsNothing);
            if (changedContext == 'switched') {
              expect(controller.setlists, isEmpty);
            }
          },
        );
      }
    }
  }

  testWidgets('songbook reuses an existing collection and opens its detail', (
    tester,
  ) async {
    final setlist = await controller.createSetlist('Book 곡 모음');
    await controller.addScoresToSetlist(setlist, [scores.first]);
    await show(tester);
    await tester.tap(find.text('Make setlist'));
    await tester.pumpAndSettle();
    expect(controller.setlists, hasLength(1));
    expect(controller.setlists.single.scoreIds, ['one', 'two']);
    expect(find.textContaining('중복 1개 제외'), findsOneWidget);
    await tester.tap(find.text('열기'));
    await tester.pumpAndSettle();
    expect(find.byType(SheetSetlistDetailScreen), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}

class _SongbookStore extends SheetLibraryStore {
  int writes = 0;
  int? failAt;
  int? delayAt;
  Completer<void>? gate;
  @override
  Future<void> saveSetlists(
    List<SheetSetlist> setlists, {
    String? libraryId,
  }) async {
    writes++;
    final fails = writes == failAt;
    if (delayAt == null || writes == delayAt) {
      await gate?.future;
    }
    if (fails) throw StateError('setlist write failed');
    await super.saveSetlists(setlists, libraryId: libraryId);
  }
}
