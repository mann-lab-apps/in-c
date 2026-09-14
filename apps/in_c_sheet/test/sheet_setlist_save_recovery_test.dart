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
  TestWidgetsFlutterBinding.ensureInitialized();
  late _SetlistStore store;
  late SheetLibraryController controller;
  final failure = StateError('setlist save failed');

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    store = _SetlistStore(failure);
    final now = DateTime(2026, 9, 14);
    await store.saveScores([
      for (final id in ['one', 'two', 'free'])
        SheetScore(
          id: id,
          title: id,
          composer: '',
          tags: const [],
          note: '',
          filePath: '/tmp/$id.pdf',
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
      ),
      SheetSetlist(
        id: 'other',
        title: 'Other',
        scoreIds: const [],
        createdAt: now,
        updatedAt: now,
      ),
    ]);
    controller = SheetLibraryController(store: store);
    await controller.load();
  });

  for (final scoped in [false, true]) {
    test(
      'successful delayed setlist save stays in its source library: $scoped',
      () async {
        if (scoped) {
          final scores = controller.scores;
          final setlists = controller.setlists;
          await controller.createLibraryProfile('Source');
          await store.saveScores(scores);
          await store.saveSetlists(setlists);
          await controller.load();
        }
        final sourceId = controller.activeLibraryProfile.id;
        store.delayWrites = true;
        final pending = controller.renameSetlist(
          controller.setlistById('concert'),
          'Revised',
        );
        store.delayWrites = false;
        await controller.createLibraryProfile('Destination');
        store.writes.single.complete();
        await pending;
        expect(controller.setlists, isEmpty);
        expect(await store.loadSetlists(), isEmpty);
        await controller.switchLibraryProfile(sourceId);
        expect(controller.setlistById('concert').title, 'Revised');
      },
    );
  }

  test('successful delayed cleanup saves only the source library', () async {
    final sourceId = controller.activeLibraryProfile.id;
    await store.saveSetlists([
      controller.setlistById('concert').copyWith(scoreIds: ['one', 'missing']),
    ]);
    store.delayWrites = true;
    store.writeEntered = Completer<void>();
    final pending = controller.load();
    await store.writeEntered!.future;
    store.delayWrites = false;
    await controller.createLibraryProfile('Destination');
    store.writes.single.complete();
    await pending;
    expect(await store.loadSetlists(), isEmpty);
    await store.setActiveLibraryProfile(sourceId);
    expect((await store.loadSetlists()).single.scoreIds, ['one']);
  });

  for (final switching in [false, true]) {
    test(
      'cleanup write failure preserves usable library on switch=$switching',
      () async {
        final originalProfile = controller.activeLibraryProfile.id;
        final broken = controller
            .setlistById('concert')
            .copyWith(
              scoreIds: ['one', 'missing', 'two'],
              lastOpenedScoreId: 'missing',
            );
        await store.saveSetlists([broken]);
        if (switching) {
          await controller.createLibraryProfile('Other library');
        }
        store.failWrites = true;
        if (switching) {
          await controller.switchLibraryProfile(originalProfile);
        } else {
          await controller.load();
        }
        expect(controller.isLoading, isFalse);
        expect(controller.activeLibraryProfile.id, originalProfile);
        expect(controller.scores, hasLength(3));
        expect(controller.setlists.single.scoreIds, ['one', 'two']);
        expect(controller.setlists.single.lastOpenedScoreId, isNot('missing'));
        expect(controller.errorMessage, _cleanupWarning);
        expect((await store.loadSetlists()).single.scoreIds, broken.scoreIds);
        store.failWrites = false;
        await controller.load();
        expect(controller.errorMessage, isNull);
        expect((await store.loadSetlists()).single.scoreIds, ['one', 'two']);
      },
    );
  }

  test('valid startup does not require a setlist write', () async {
    store.failWrites = true;
    await controller.load();
    expect(controller.errorMessage, isNull);
    expect(controller.setlistById('concert').scoreIds, ['one', 'two']);
  });

  for (final switching in [false, true]) {
    test(
      'late cleanup failure does not warn over newer state: $switching',
      () async {
        await store.saveSetlists([
          controller
              .setlistById('concert')
              .copyWith(scoreIds: ['one', 'missing']),
        ]);
        store.delayWrites = true;
        store.writeEntered = Completer<void>();
        final pendingLoad = controller.load();
        await store.writeEntered!.future;
        store.delayWrites = false;
        if (switching) {
          await controller.createLibraryProfile('New library');
        } else {
          await controller.renameSetlist(
            controller.setlistById('concert'),
            'Edited',
          );
        }
        final latest = controller.setlists.map((s) => s.toJson()).toList();
        store.writes.single.completeError(failure);
        await pendingLoad;
        expect(controller.errorMessage, isNull);
        expect(controller.setlists.map((s) => s.toJson()).toList(), latest);
      },
    );
  }

  test('startup read failure remains distinct from cleanup warning', () async {
    store.failRead = true;
    await controller.load();
    expect(controller.isLoading, isFalse);
    expect(controller.errorMessage, contains('라이브러리를 불러오지 못했습니다'));
    expect(controller.errorMessage, isNot(_cleanupWarning));
  });

  testWidgets('cleanup warning appears with usable score cards', (
    tester,
  ) async {
    await store.saveSetlists([
      controller.setlistById('concert').copyWith(scoreIds: ['one', 'missing']),
    ]);
    store.failWrites = true;
    await controller.load();
    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();
    expect(find.text(_cleanupWarning), findsOneWidget);
    expect(find.text('one'), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  for (final action in [
    'create',
    'duplicate',
    'delete',
    'rename',
    'add',
    'remove',
    'move',
    'insert',
    'settings',
    'opened',
  ]) {
    test('$action failure restores durable setlists and notifies', () async {
      final original = controller.setlists.map((s) => s.toJson()).toList();
      var notifications = 0;
      controller.addListener(() => notifications++);
      store.failWrites = true;
      await expectLater(_change(controller, action), throwsA(same(failure)));
      expect(controller.setlists.map((s) => s.toJson()).toList(), original);
      expect(
        (await store.loadSetlists()).map((s) => s.toJson()).toList(),
        original,
      );
      expect(notifications, greaterThan(0));
      store.failWrites = false;
      await _change(controller, action);
      expect(
        controller.setlists.map((s) => s.toJson()).toList(),
        (await store.loadSetlists()).map((s) => s.toJson()).toList(),
      );
    });
  }

  for (final firstFails in [false, true]) {
    for (final lastFails in [false, true]) {
      test(
        'consecutive setlist writes recover durable state $firstFails/$lastFails',
        () async {
          store.delayWrites = true;
          final first = _change(controller, 'rename');
          final checkedFirst = firstFails
              ? expectLater(first, throwsA(same(failure)))
              : first;
          final last = _change(controller, 'add');
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
            controller.setlists.map((s) => s.toJson()).toList(),
            (await store.loadSetlists()).map((s) => s.toJson()).toList(),
          );
        },
      );
    }
  }

  test('older failure cannot replace newer successful setlist state', () async {
    store.delayWrites = true;
    final first = expectLater(
      _change(controller, 'rename'),
      throwsA(same(failure)),
    );
    final last = _change(controller, 'add');
    store.writes[1].complete();
    await last;
    final latest = controller.setlists.map((s) => s.toJson()).toList();
    store.writes[0].completeError(failure);
    await first;
    expect(controller.setlists.map((s) => s.toJson()).toList(), latest);
  });

  for (final switchLibrary in [false, true]) {
    test(
      'delayed setlist recovery preserves newer state: $switchLibrary',
      () async {
        store.readEntered = Completer<void>();
        store.releaseRead = Completer<void>();
        store.failWrites = true;
        final pending = expectLater(
          _change(controller, 'rename'),
          throwsA(same(failure)),
        );
        await store.readEntered!.future;
        store.failWrites = false;
        if (switchLibrary) {
          await controller.createLibraryProfile('New library');
        } else {
          await _change(controller, 'delete');
        }
        final latest = controller.setlists.map((s) => s.toJson()).toList();
        store.releaseRead!.complete();
        await pending;
        expect(controller.setlists.map((s) => s.toJson()).toList(), latest);
      },
    );
  }

  for (final create in [false, true]) {
    testWidgets('closed bulk setlist UI ignores late failure: $create', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(2560, 1600);
      tester.view.devicePixelRatio = 2;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(InCSheetApp(controller: controller));
      await tester.pumpAndSettle();
      await tester.longPress(find.text('free').first);
      await tester.pumpAndSettle();
      store.delayWrites = true;
      await _addSelected(tester, create: create);
      await tester.pumpWidget(const SizedBox.shrink());
      store.writes.single.completeError(failure);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(controller.setlists, hasLength(2));
      expect(controller.setlistById('concert').scoreIds, ['one', 'two']);
    });

    testWidgets(
      'bulk setlist failure keeps selection and allows retry: $create',
      (tester) async {
        tester.view.physicalSize = const Size(2560, 1600);
        tester.view.devicePixelRatio = 2;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        await tester.pumpWidget(InCSheetApp(controller: controller));
        await tester.pumpAndSettle();
        await tester.longPress(find.text('free').first);
        await tester.pumpAndSettle();
        store.failWrites = true;
        await _addSelected(tester, create: create);
        expect(tester.takeException(), isNull);
        expect(find.text('세트리스트 변경사항을 저장하지 못했습니다. 다시 시도해주세요.'), findsOneWidget);
        expect(find.byTooltip('선택 악보를 세트리스트에 추가'), findsOneWidget);
        expect(controller.setlists, hasLength(2));
        expect(controller.setlistById('concert').scoreIds, ['one', 'two']);
        store.failWrites = false;
        await tester.pump(const Duration(seconds: 5));
        await tester.pumpAndSettle();
        await _addSelected(tester, create: create);
        expect(
          controller
              .setlistByTitleOrNull(create ? 'Created' : 'Concert')!
              .scoreIds,
          contains('free'),
        );
        expect(find.byTooltip('선택 악보를 세트리스트에 추가'), findsNothing);
        expect(tester.takeException(), isNull);
      },
    );
  }

  for (final action in [
    'rename',
    'duplicate',
    'delete',
    'move',
    'remove',
    'settings',
    'add',
  ]) {
    testWidgets('closed detail ignores late $action failure', (tester) async {
      tester.view.physicalSize = const Size(1280, 1000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await _openDetail(tester, controller);
      store.delayWrites = true;
      await _detailAction(tester, action);
      expect(store.writes, hasLength(1));
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.byType(SheetSetlistDetailScreen), findsNothing);
      store.writes.single.completeError(failure);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(find.text('Open'), findsOneWidget);
      expect(find.byType(SnackBar), findsNothing);
    });

    testWidgets('detail $action reports save failure and supports retry', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1280, 1000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await _openDetail(tester, controller);
      final original = controller.setlists.map((s) => s.toJson()).toList();
      store.failWrites = true;
      await _detailAction(tester, action);
      expect(tester.takeException(), isNull);
      expect(find.text('세트리스트 변경사항을 저장하지 못했습니다. 다시 시도해주세요.'), findsOneWidget);
      expect(find.byType(SheetSetlistDetailScreen), findsOneWidget);
      expect(controller.setlists.map((s) => s.toJson()).toList(), original);
      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();
      expect(find.text('목록이 바뀌었습니다. 순서를 다시 선택해주세요.'), findsNothing);
      expect(find.textContaining('만들었습니다.'), findsNothing);
      expect(find.textContaining('제거했습니다.'), findsNothing);
      store.failWrites = false;
      await _detailAction(tester, action);
      expect(tester.takeException(), isNull);
      expect(
        controller.setlists.map((s) => s.toJson()).toList(),
        isNot(original),
      );
      expect(
        controller.setlists.map((s) => s.toJson()).toList(),
        (await store.loadSetlists()).map((s) => s.toJson()).toList(),
      );
      if (action == 'delete') {
        expect(find.byType(SheetSetlistDetailScreen), findsNothing);
      }
    });
  }

  for (final close in [false, true]) {
    testWidgets('setlist list creation handles failure: closed=$close', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(home: SheetSetlistsScreen(controller: controller)),
      );
      await tester.pumpAndSettle();
      store.delayWrites = close;
      store.failWrites = !close;
      await _createFromList(tester);
      if (close) {
        expect(store.writes, hasLength(1));
        await tester.pumpWidget(const SizedBox.shrink());
        await tester.pumpAndSettle();
        store.writes.single.completeError(failure);
        await tester.pumpAndSettle();
      }
      expect(tester.takeException(), isNull);
      expect(controller.setlistByTitleOrNull('Created'), isNull);
      expect(find.byType(SheetSetlistDetailScreen), findsNothing);
      if (!close) {
        expect(find.text('세트리스트 변경사항을 저장하지 못했습니다. 다시 시도해주세요.'), findsOneWidget);
        store.failWrites = false;
        await tester.pump(const Duration(seconds: 5));
        await tester.pumpAndSettle();
        await _createFromList(tester);
        expect(find.byType(SheetSetlistDetailScreen), findsOneWidget);
        expect(controller.setlistByTitleOrNull('Created'), isNotNull);
      }
    });
  }

  testWidgets('detail undo failure does not queue a missing-item message', (
    tester,
  ) async {
    await _openDetail(tester, controller);
    await _detailAction(tester, 'remove');
    expect(controller.setlistById('concert').scoreIds, ['two']);
    store.failWrites = true;
    await tester.tap(find.text('되돌리기'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(controller.setlistById('concert').scoreIds, ['two']);
    expect(find.text('세트리스트 변경사항을 저장하지 못했습니다. 다시 시도해주세요.'), findsOneWidget);
    await tester.pump(const Duration(seconds: 5));
    await tester.pumpAndSettle();
    expect(find.text('악보 또는 세트리스트가 없어 되돌리지 못했습니다.'), findsNothing);
  });

  test(
    'setlist recovery read failure preserves the original write error',
    () async {
      store.failRead = true;
      store.failWrites = true;
      await expectLater(_change(controller, 'rename'), throwsA(same(failure)));
      store.failRead = false;
      await controller.load();
      expect(controller.setlistById('concert').title, 'Concert');
    },
  );
}

Future<void> _createFromList(WidgetTester tester) async {
  await tester.tap(find.text('새 세트리스트'));
  await tester.pumpAndSettle();
  await tester.enterText(find.widgetWithText(TextField, '이름'), 'Created');
  await tester.tap(find.widgetWithText(FilledButton, '저장'));
  await tester.pumpAndSettle();
}

Future<void> _openDetail(
  WidgetTester tester,
  SheetLibraryController controller,
) async {
  await tester.pumpWidget(
    MaterialApp(
      home: Builder(
        builder: (context) => Scaffold(
          body: TextButton(
            onPressed: () => Navigator.of(context).push<void>(
              MaterialPageRoute(
                builder: (_) => SheetSetlistDetailScreen(
                  controller: controller,
                  setlistId: 'concert',
                ),
              ),
            ),
            child: const Text('Open'),
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('Open'));
  await tester.pumpAndSettle();
}

Future<void> _detailAction(WidgetTester tester, String action) async {
  switch (action) {
    case 'rename':
      await tester.tap(find.byTooltip('이름 변경'));
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextField, '이름'), 'Renamed');
      await tester.tap(find.widgetWithText(FilledButton, '저장'));
    case 'duplicate':
      await tester.tap(find.byTooltip('세트리스트 복제'));
    case 'delete':
      await tester.tap(find.byTooltip('삭제'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, '삭제'));
    case 'move':
      await tester.tap(find.byTooltip('아래로').first);
    case 'remove':
      await tester.tap(find.byTooltip('제거').first);
    case 'settings':
      await tester.tap(find.byTooltip('리허설 모드'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(SwitchListTile, '리허설 모드'));
      await tester.ensureVisible(find.widgetWithText(FilledButton, '저장'));
      await tester.tap(find.widgetWithText(FilledButton, '저장'));
    case 'add':
      await tester.tap(find.text('악보 추가'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('free'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, '추가'));
  }
  await tester.pumpAndSettle();
}

Future<void> _addSelected(WidgetTester tester, {required bool create}) async {
  await tester.tap(find.byTooltip('선택 악보를 세트리스트에 추가'));
  await tester.pumpAndSettle();
  await tester.tap(find.text(create ? '새 세트리스트 만들기' : 'Concert').last);
  await tester.pumpAndSettle();
  if (create) {
    await tester.enterText(find.widgetWithText(TextField, '이름'), 'Created');
    await tester.tap(find.widgetWithText(FilledButton, '저장'));
    await tester.pumpAndSettle();
  }
}

Future<void> _change(SheetLibraryController controller, String action) async {
  final setlist = controller.setlistById('concert');
  final free = controller.scoreById('free');
  switch (action) {
    case 'create':
      await controller.createSetlist('Created');
    case 'duplicate':
      await controller.duplicateSetlist(setlist);
    case 'delete':
      await controller.deleteSetlist(setlist);
    case 'rename':
      await controller.renameSetlist(setlist, 'Renamed');
    case 'add':
      await controller.addScoresToSetlist(setlist, [free]);
    case 'remove':
      await controller.removeScoreFromSetlist(
        setlist,
        controller.scoreById('one'),
      );
    case 'move':
      await controller.moveScoreInSetlist(setlist, 0, 1);
    case 'insert':
      await controller.insertScoreInSetlist(setlist, free, 1);
    case 'settings':
      await controller.updateSetlistRehearsalSettings(
        setlist,
        scoreNotes: {'one': 'Cue'},
      );
    case 'opened':
      await controller.markSetlistOpened(setlist, scoreId: 'two');
  }
}

const _cleanupWarning =
    '악보는 불러왔지만 세트리스트 정리 결과를 저장하지 못했습니다. 저장 공간을 확인한 뒤 앱을 다시 열어주세요.';

class _SetlistStore extends SheetLibraryStore {
  _SetlistStore(this.failure);
  final Object failure;
  bool failWrites = false;
  bool delayWrites = false;
  bool failRead = false;
  final writes = <Completer<void>>[];
  Completer<void>? writeEntered;
  Completer<void>? readEntered;
  Completer<void>? releaseRead;

  @override
  Future<List<SheetSetlist>> loadSetlists() async {
    if (failRead) throw StateError('setlist read failed');
    final result = await super.loadSetlists();
    final entered = readEntered;
    if (entered != null && !entered.isCompleted) {
      entered.complete();
      await releaseRead!.future;
    }
    return result;
  }

  @override
  Future<void> saveSetlists(
    List<SheetSetlist> setlists, {
    String? libraryId,
  }) async {
    if (delayWrites) {
      final completion = Completer<void>();
      writes.add(completion);
      if (writeEntered != null && !writeEntered!.isCompleted) {
        writeEntered!.complete();
      }
      await completion.future;
    }
    if (failWrites) throw failure;
    await super.saveSetlists(setlists, libraryId: libraryId);
  }
}
