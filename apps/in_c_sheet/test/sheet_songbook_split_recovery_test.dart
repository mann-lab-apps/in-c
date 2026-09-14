import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late _SplitStore store;
  late SheetLibraryController controller;
  late SheetScore source;
  final failure = StateError('split save failed');
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    store = _SplitStore(failure);
    final now = DateTime(2026, 9, 14);
    source = SheetScore(
      id: 'book',
      title: 'Book',
      composer: 'Bach',
      tags: const [],
      note: '',
      filePath: '/tmp/book.pdf',
      importedAt: now,
      updatedAt: now,
      lastOpenedAt: null,
      lastPage: 1,
      isFavorite: false,
      bookmarks: [
        SheetBookmark(pageNumber: 1, label: 'First', createdAt: now),
        SheetBookmark(pageNumber: 3, label: 'Second', createdAt: now),
      ],
    );
    await store.saveScores([source]);
    controller = SheetLibraryController(store: store);
    await controller.load();
  });

  test(
    'failed split removes unsaved cards and retries without false duplicates',
    () async {
      store.fail = true;
      await expectLater(
        controller.createScoresFromBookmarks(source, pageCount: 4),
        throwsA(same(failure)),
      );
      expect(controller.scores.single.toJson(), source.toJson());
      expect((await store.loadScores()).single.toJson(), source.toJson());
      store.fail = false;
      final result = await controller.createScoresFromBookmarks(
        source,
        pageCount: 4,
      );
      expect(result.createdCount, 2);
      expect(result.skippedDuplicateCount, 0);
      expect(controller.scores, hasLength(3));
      expect(controller.scoreById(source.id).toJson(), source.toJson());
      expect(
        result.createdScores.map((s) => s.filePath),
        everyElement(source.filePath),
      );
    },
  );

  for (final fails in [false, true]) {
    test('delayed split stays in source library on failure=$fails', () async {
      final sourceId = controller.activeLibraryProfile.id;
      store.gate = Completer<void>();
      store.fail = fails;
      final pending = controller.createScoresFromBookmarks(
        source,
        pageCount: 4,
      );
      final checked = fails
          ? expectLater(pending, throwsA(same(failure)))
          : pending;
      await controller.createLibraryProfile('Other');
      store.gate!.complete();
      await checked;
      expect(controller.scores, isEmpty);
      expect(await store.loadScores(), isEmpty);
      store.fail = false;
      await controller.switchLibraryProfile(sourceId);
      expect(controller.scores, hasLength(fails ? 1 : 3));
    });
  }

  Future<void> show(WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () => unawaited(
                createSongbookScores(
                  context,
                  controller,
                  source: source,
                  pageCount: 4,
                ),
              ),
              child: const Text('Split'),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets(
    'failed split offers retry and never a created or duplicate notice',
    (tester) async {
      await show(tester);
      store.fail = true;
      await tester.tap(find.text('Split'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(
        find.text('곡 항목을 저장하지 못했습니다. 저장 공간을 확인한 뒤 다시 시도해주세요.'),
        findsOneWidget,
      );
      expect(find.text('세트리스트 만들기'), findsNothing);
      expect(find.text('이미 만든 곡 항목입니다.'), findsNothing);
      store.fail = false;
      await tester.tap(find.text('다시 시도'));
      await tester.pumpAndSettle();
      expect(controller.scores, hasLength(3));
      await tester.tap(find.text('세트리스트 만들기'));
      await tester.pumpAndSettle();
      expect(controller.setlists.single.scoreIds, hasLength(2));
      expect(tester.takeException(), isNull);
    },
  );

  for (final noOp in ['missing', 'empty', 'duplicate']) {
    testWidgets('split $noOp target never claims newly created scores', (
      tester,
    ) async {
      if (noOp == 'missing') {
        await controller.deleteScoresByIds({source.id});
      } else if (noOp == 'empty') {
        await store.saveScores([source.copyWith(bookmarks: [])]);
        await controller.load();
      } else {
        await controller.createScoresFromBookmarks(source, pageCount: 4);
      }
      final before = controller.scores.map((s) => s.toJson()).toList();
      store.fail = true;
      await show(tester);
      await tester.tap(find.text('Split'));
      await tester.pumpAndSettle();
      expect(
        find.text(
          noOp == 'missing'
              ? '악보가 없어 곡으로 나누지 못했습니다.'
              : noOp == 'empty'
              ? '곡으로 나눌 북마크 구간이 없습니다.'
              : '이미 만든 곡 항목입니다.',
        ),
        findsOneWidget,
      );
      expect(find.text('세트리스트 만들기'), findsNothing);
      expect(controller.scores.map((s) => s.toJson()).toList(), before);
      expect(tester.takeException(), isNull);
    });
  }

  for (final changedContext in ['closed', 'switched', 'covered']) {
    for (final fails in [false, true]) {
      testWidgets(
        'late split $changedContext failure=$fails has no stale feedback',
        (tester) async {
          await show(tester);
          store.gate = Completer<void>();
          store.fail = fails;
          await tester.tap(find.text('Split'));
          await tester.pumpAndSettle();
          if (changedContext == 'closed') {
            await tester.pumpWidget(const SizedBox.shrink());
          } else if (changedContext == 'switched') {
            await controller.createLibraryProfile('Other');
          } else {
            unawaited(
              Navigator.of(tester.element(find.text('Split'))).push<void>(
                MaterialPageRoute<void>(
                  builder: (_) => const Scaffold(body: Text('Other route')),
                ),
              ),
            );
            await tester.pumpAndSettle();
          }
          store.gate!.complete();
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);
          expect(find.byType(SnackBar), findsNothing);
          expect(controller.setlists, isEmpty);
        },
      );
    }
  }
}

class _SplitStore extends SheetLibraryStore {
  _SplitStore(this.failure);
  final Object failure;
  bool fail = false;
  Completer<void>? gate;
  @override
  Future<void> saveScores(List<SheetScore> scores, {String? libraryId}) async {
    final fails = fail;
    await gate?.future;
    if (fails) throw failure;
    await super.saveScores(scores, libraryId: libraryId);
  }
}
