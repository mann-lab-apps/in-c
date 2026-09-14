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
  late _BulkStore store;
  late SheetLibraryController controller;
  final failure = StateError('bulk save failed');

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    store = _BulkStore();
    final now = DateTime(2026, 9, 14);
    await store.saveScores([
      for (final id in ['selected', 'other'])
        SheetScore(
          id: id,
          title: id,
          composer: 'Bach',
          tags: const ['practice'],
          note: '',
          filePath: '/tmp/$id.pdf',
          importedAt: now,
          updatedAt: now,
          lastOpenedAt: null,
          lastPage: 1,
          isFavorite: false,
          collection: id == 'other' ? 'Recital' : '',
          bookmarks: const [],
        ),
    ]);
    controller = SheetLibraryController(store: store);
    await controller.load();
    store.delayWrites = true;
  });

  test(
    'bulk failure restores persisted selected and unselected metadata',
    () async {
      final before = controller.scores.map((s) => s.toJson()).toList();
      var notifications = 0;
      controller.addListener(() => notifications++);
      final pending = expectLater(
        controller.bulkEditScores(
          {'selected'},
          composer: 'Mozart',
          collection: 'New',
        ),
        throwsA(same(failure)),
      );
      store.writes.single.completeError(failure);
      await pending;
      expect(controller.scores.map((s) => s.toJson()).toList(), before);
      expect(notifications, greaterThan(0));
      store.delayWrites = false;
      expect(
        await controller.bulkEditScores({'selected'}, composer: 'Mozart'),
        1,
      );
      await controller.load();
      expect(controller.scoreById('selected').composer, 'Mozart');
      expect(controller.scoreById('other').composer, 'Bach');
    },
  );

  for (final firstFails in [false, true]) {
    for (final lastFails in [false, true]) {
      test(
        'consecutive bulk saves recover durable state $firstFails/$lastFails',
        () async {
          final first = controller.bulkEditScores({
            'selected',
          }, composer: 'Mozart');
          final checkedFirst = firstFails
              ? expectLater(first, throwsA(same(failure)))
              : first;
          final last = controller.bulkEditScores({
            'selected',
          }, collection: 'Concert');
          final checkedLast = lastFails
              ? expectLater(last, throwsA(same(failure)))
              : last;
          if (firstFails) {
            store.writes[0].completeError(failure);
          } else {
            store.writes[0].complete();
          }
          await checkedFirst;
          if (lastFails) {
            store.writes[1].completeError(failure);
          } else {
            store.writes[1].complete();
          }
          await checkedLast;
          expect(
            controller.scores.map((s) => s.toJson()).toList(),
            (await store.loadScores()).map((s) => s.toJson()).toList(),
          );
        },
      );
    }
  }

  test('late bulk failure cannot erase a newer single-score edit', () async {
    final pending = expectLater(
      controller.bulkEditScores({'selected'}, composer: 'Mozart'),
      throwsA(same(failure)),
    );
    store.delayWrites = false;
    await controller.updateLastPage(controller.scoreById('selected'), 3);
    final before = controller.scores.map((s) => s.toJson()).toList();
    store.writes.single.completeError(failure);
    await pending;
    expect(controller.scores.map((s) => s.toJson()).toList(), before);
  });

  test('nonmatching bulk selection does not cancel pending recovery', () async {
    final pending = expectLater(
      controller.toggleFavorite(controller.scoreById('selected')),
      throwsA(same(failure)),
    );
    expect(await controller.bulkEditScores({'absent'}, composer: 'Mozart'), 0);
    store.writes.single.completeError(failure);
    await pending;
    expect(controller.scoreById('selected').isFavorite, isFalse);
    expect(store.writes, hasLength(1));
  });

  for (final collection in [false, true]) {
    testWidgets('closing bulk UI before a failed save is safe: $collection', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(2560, 1600);
      tester.view.devicePixelRatio = 2;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(InCSheetApp(controller: controller));
      await tester.pumpAndSettle();
      await tester.longPress(find.text('selected').first);
      await tester.pumpAndSettle();
      await _submit(tester, collection: collection);
      await tester.pumpWidget(const SizedBox.shrink());
      store.writes.single.completeError(failure);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(controller.scoreById('selected').composer, 'Bach');
      expect(controller.scoreById('selected').collection, isEmpty);
    });

    testWidgets(
      'bulk save failure keeps selection and supports retry: $collection',
      (tester) async {
        tester.view.physicalSize = const Size(2560, 1600);
        tester.view.devicePixelRatio = 2;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        await tester.pumpWidget(InCSheetApp(controller: controller));
        await tester.pumpAndSettle();
        await tester.longPress(find.text('selected').first);
        await tester.pumpAndSettle();
        await _submit(tester, collection: collection);
        store.writes.single.completeError(failure);
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(
          find.text('선택한 악보의 변경사항을 저장하지 못했습니다. 다시 시도해주세요.'),
          findsOneWidget,
        );
        expect(find.byTooltip('선택 악보 정보 일괄 편집'), findsOneWidget);
        expect(controller.scoreById('selected').composer, 'Bach');
        expect(controller.scoreById('selected').collection, isEmpty);
        expect(find.textContaining('일괄 편집했습니다'), findsNothing);
        expect(find.textContaining('컬렉션으로 묶었습니다'), findsNothing);
        store.delayWrites = false;
        await tester.pump(const Duration(seconds: 5));
        await tester.pumpAndSettle();
        await _submit(tester, collection: collection);
        expect(
          controller.scoreById('selected').composer,
          collection ? 'Bach' : 'Mozart',
        );
        expect(
          controller.scoreById('selected').collection,
          collection ? 'Recital' : '',
        );
        expect(find.byTooltip('선택 악보 정보 일괄 편집'), findsNothing);
        expect(tester.takeException(), isNull);
      },
    );
  }

  for (final switchLibrary in [false, true]) {
    test(
      'delayed bulk recovery preserves newer state: $switchLibrary',
      () async {
        store.readEntered = Completer<void>();
        store.releaseRead = Completer<void>();
        final pending = expectLater(
          controller.bulkEditScores({'selected'}, composer: 'Mozart'),
          throwsA(same(failure)),
        );
        store.writes.single.completeError(failure);
        await store.readEntered!.future;
        store.delayWrites = false;
        if (switchLibrary) {
          await controller.createLibraryProfile('Other library');
        } else {
          await controller.toggleFavorite(controller.scoreById('other'));
        }
        final before = controller.scores.map((s) => s.toJson()).toList();
        final libraryId = controller.activeLibraryProfile.id;
        store.releaseRead!.complete();
        await pending;
        expect(controller.activeLibraryProfile.id, libraryId);
        expect(controller.scores.map((s) => s.toJson()).toList(), before);
      },
    );
  }

  test(
    'unreadable bulk recovery still returns the original write error',
    () async {
      store.failRead = true;
      final pending = expectLater(
        controller.bulkEditScores({'selected'}, composer: 'Mozart'),
        throwsA(same(failure)),
      );
      store.writes.single.completeError(failure);
      await pending;
      store.failRead = false;
      await controller.load();
      expect(controller.scoreById('selected').composer, 'Bach');
    },
  );
}

Future<void> _submit(WidgetTester tester, {required bool collection}) async {
  await tester.tap(
    find.byTooltip(collection ? '선택 악보 컬렉션 지정' : '선택 악보 정보 일괄 편집'),
  );
  await tester.pumpAndSettle();
  if (collection) {
    await tester.tap(find.text('Recital').last);
  } else {
    await tester.enterText(find.widgetWithText(TextField, '작곡가 변경'), 'Mozart');
    final apply = find.widgetWithText(FilledButton, '적용');
    await tester.ensureVisible(apply);
    await tester.pumpAndSettle();
    await tester.tap(apply);
  }
  await tester.pumpAndSettle();
}

class _BulkStore extends SheetLibraryStore {
  bool delayWrites = false;
  final writes = <Completer<void>>[];
  Completer<void>? readEntered;
  Completer<void>? releaseRead;
  bool failRead = false;

  @override
  Future<List<SheetScore>> loadScores() async {
    if (failRead) throw StateError('read failed');
    final scores = await super.loadScores();
    final entered = readEntered;
    if (entered != null && !entered.isCompleted) {
      entered.complete();
      await releaseRead!.future;
    }
    return scores;
  }

  @override
  Future<void> saveScores(List<SheetScore> scores) async {
    if (delayWrites) {
      final completion = Completer<void>();
      writes.add(completion);
      await completion.future;
    }
    await super.saveScores(scores);
  }
}
