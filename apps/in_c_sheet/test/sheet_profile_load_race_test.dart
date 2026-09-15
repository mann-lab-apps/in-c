import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_annotation.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_profile.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:in_c_sheet/sheet_setlist.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late _ReadStore store;
  late SheetLibraryController controller;
  late List<String> profiles;
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    store = _ReadStore();
    profiles = [];
    for (final name in ['A', 'B', 'C']) {
      final profile = await store.createLibraryProfile(name);
      profiles.add(profile.id);
      final now = DateTime(2026, 9, 15);
      await store.saveScores([
        SheetScore(
          id: name,
          title: name,
          composer: '',
          tags: const [],
          note: '',
          filePath: '/tmp/$name.pdf',
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
          id: name,
          title: name,
          scoreIds: [name],
          createdAt: now,
          updatedAt: now,
        ),
      ]);
    }
    await store.setActiveLibraryProfile(profiles.first);
    controller = SheetLibraryController(store: store);
    await controller.load();
  });
  tearDown(() => controller.dispose());

  void expectLibrary(String name) {
    expect(controller.activeLibraryProfile.name, name);
    expect(controller.scores.single.id, name);
    expect(controller.setlists.single.scoreIds, [name]);
  }

  for (final reload in [false, true]) {
    for (final fails in [false, true]) {
      test(
        'stale ${reload ? 'reload' : 'switch'} fails=$fails cannot replace latest library',
        () async {
          final oldRead = store.nextRead = _PendingRead();
          final older = reload
              ? controller.load()
              : controller.switchLibraryProfile(profiles[1]);
          await oldRead.entered.future;
          await controller.switchLibraryProfile(profiles[2]);
          expectLibrary('C');
          oldRead.complete(fails);
          await older;
          expectLibrary('C');
          expect(controller.errorMessage, isNull);
          expect(controller.isLoading, isFalse);
          expect((await store.loadScores()).single.id, 'C');
          expect((await store.loadSetlists()).single.scoreIds, ['C']);
        },
      );
    }
  }

  for (final fails in [false, true]) {
    test('older completion fails=$fails keeps newer load pending', () async {
      final oldRead = store.nextRead = _PendingRead();
      final older = controller.switchLibraryProfile(profiles[1]);
      await oldRead.entered.future;
      final newRead = store.nextRead = _PendingRead();
      final newer = controller.switchLibraryProfile(profiles[2]);
      await newRead.entered.future;
      oldRead.complete(fails);
      await older;
      expect(controller.isLoading, isTrue);
      expect(controller.errorMessage, isNull);
      newRead.complete(false);
      await newer;
      expectLibrary('C');
      expect(controller.isLoading, isFalse);
    });
  }

  test('return to original library supersedes pending switch', () async {
    final oldRead = store.nextRead = _PendingRead();
    final older = controller.switchLibraryProfile(profiles[1]);
    await oldRead.entered.future;
    await controller.switchLibraryProfile(profiles.first);
    oldRead.complete(false);
    await older;
    expectLibrary('A');
    expect((await store.loadActiveLibraryProfile()).id, profiles.first);
  });

  for (final create in [false, true]) {
    test(
      'failed profile content read restores visible activation create=$create',
      () async {
        final pending = store.nextFinalRead = _PendingRead();
        final before = (await store.loadScores()).single.toJson();
        final changing = create
            ? controller.createLibraryProfile('D')
            : controller.switchLibraryProfile(profiles[1]);
        await pending.entered.future;
        pending.complete(true);
        await changing;
        expectLibrary('A');
        expect((await store.loadActiveLibraryProfile()).id, profiles.first);
        expect((await store.loadScores()).single.toJson(), before);
        expect(controller.errorMessage, isNotNull);
        expect(controller.isLoading, isFalse);
        if (create) {
          expect(
            (await store.loadLibraryProfiles()).where(
              (profile) => profile.name == 'D',
            ),
            hasLength(1),
          );
          await controller.createLibraryProfile('D');
          expect(controller.activeLibraryProfile.name, 'D');
          expect(
            controller.libraryProfiles.where((profile) => profile.name == 'D'),
            hasLength(1),
          );
        } else {
          await controller.switchLibraryProfile(profiles[1]);
          expectLibrary('B');
        }
        expect(controller.errorMessage, isNull);
      },
    );
  }

  for (final fails in [false, true]) {
    test(
      'late final read fails=$fails leaves previous complete state until commit',
      () async {
        final pending = store.nextFinalRead = _PendingRead();
        final load = controller.switchLibraryProfile(profiles[1]);
        await pending.entered.future;
        expectLibrary('A');
        expect(controller.isLoading, isTrue);
        pending.complete(fails);
        await load;
        expectLibrary(fails ? 'A' : 'B');
        expect(controller.isLoading, isFalse);
        expect(controller.errorMessage, fails ? isNotNull : isNull);
        if (fails) {
          await controller.switchLibraryProfile(profiles[1]);
          expectLibrary('B');
          expect(controller.errorMessage, isNull);
        }
      },
    );
  }

  for (final fails in [false, true]) {
    test(
      'late selection recovery fails=$fails cannot replace newer success',
      () async {
        final read = store.nextFinalRead = _PendingRead();
        final older = controller.switchLibraryProfile(profiles[1]);
        await read.entered.future;
        final restore = store.nextPrepare = _PendingRead();
        read.complete(true);
        await restore.entered.future;
        await controller.switchLibraryProfile(profiles[2]);
        restore.complete(fails);
        await older;
        expectLibrary('C');
        expect((await store.loadActiveLibraryProfile()).id, profiles[2]);
        expect(controller.errorMessage, isNull);
        expect(controller.isLoading, isFalse);
      },
    );
  }

  test(
    'failed selection recovery is explicit and reload can reconcile',
    () async {
      final read = store.nextFinalRead = _PendingRead();
      final changing = controller.switchLibraryProfile(profiles[1]);
      await read.entered.future;
      store.failNextActivation = true;
      read.complete(true);
      await changing;
      expectLibrary('A');
      expect((await store.loadActiveLibraryProfile()).id, profiles[1]);
      expect(controller.errorMessage, contains('이전 라이브러리 선택도 복구하지 못했습니다'));
      expect(controller.isLoading, isFalse);
      await controller.load();
      expectLibrary('B');
      expect(controller.errorMessage, isNull);
    },
  );

  for (final create in [false, true]) {
    for (final fails in [false, true]) {
      test(
        'late prepare create=$create fails=$fails cannot replace later switch',
        () async {
          final pending = store.nextPrepare = _PendingRead();
          final older = create
              ? controller.createLibraryProfile('D')
              : controller.switchLibraryProfile(profiles[1]);
          await pending.entered.future;
          await controller.switchLibraryProfile(profiles[2]);
          pending.complete(fails);
          await older;
          expectLibrary('C');
          expect(controller.errorMessage, isNull);
          expect(controller.isLoading, isFalse);
          expect((await store.loadActiveLibraryProfile()).id, profiles[2]);
        },
      );
    }
  }

  test('superseded deletion does not reload over newer selection', () async {
    final pending = store.nextDelete = _PendingRead();
    final older = controller.deleteLibraryProfile(profiles[1]);
    await pending.entered.future;
    await controller.switchLibraryProfile(profiles[2]);
    pending.complete(false);
    expect(await older, isTrue);
    expectLibrary('C');
    expect(controller.isLoading, isFalse);
  });

  test('delete keeps its read error contract and releases loading', () async {
    final pending = store.nextFinalRead = _PendingRead();
    final failed = expectLater(
      controller.deleteLibraryProfile(profiles[1]),
      throwsStateError,
    );
    await pending.entered.future;
    pending.complete(true);
    await failed;
    expectLibrary('A');
    expect(controller.isLoading, isFalse);
    await controller.load();
    expect(
      controller.libraryProfiles.any((profile) => profile.id == profiles[1]),
      isFalse,
    );
  });
}

class _PendingRead {
  final entered = Completer<void>();
  final release = Completer<void>();
  void complete(bool fails) {
    if (fails) {
      release.completeError(StateError('read failed'));
    } else {
      release.complete();
    }
  }
}

class _ReadStore extends SheetLibraryStore {
  _PendingRead? nextRead;
  _PendingRead? nextFinalRead;
  _PendingRead? nextPrepare;
  _PendingRead? nextDelete;
  bool failNextActivation = false;

  Future<void> _wait(_PendingRead? pending) async {
    if (pending == null) return;
    pending.entered.complete();
    await pending.release.future;
  }

  @override
  Future<void> setActiveLibraryProfile(String id) async {
    if (failNextActivation) {
      failNextActivation = false;
      throw StateError('activation failed');
    }
    final pending = nextPrepare;
    nextPrepare = null;
    await super.setActiveLibraryProfile(id);
    await _wait(pending);
  }

  @override
  Future<SheetLibraryProfile> createLibraryProfile(String name) async {
    final pending = nextPrepare;
    nextPrepare = null;
    final result = await super.createLibraryProfile(name);
    await _wait(pending);
    return result;
  }

  @override
  Future<bool> deleteLibraryProfile(String id) async {
    final pending = nextDelete;
    nextDelete = null;
    final result = await super.deleteLibraryProfile(id);
    await _wait(pending);
    return result;
  }

  @override
  Future<SheetAnnotationToolPreset?> loadFavoriteAnnotationPreset() async {
    final pending = nextFinalRead;
    nextFinalRead = null;
    final snapshot = await super.loadFavoriteAnnotationPreset();
    await _wait(pending);
    return snapshot;
  }

  @override
  Future<List<SheetScore>> loadScores() async {
    final pending = nextRead;
    nextRead = null;
    final snapshot = await super.loadScores();
    if (pending != null) {
      pending.entered.complete();
      await pending.release.future;
    }
    return snapshot;
  }
}
