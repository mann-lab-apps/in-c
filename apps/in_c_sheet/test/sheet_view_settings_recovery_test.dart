import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_library_view_settings.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _error = '보기 설정을 저장하지 못했습니다. 다시 시도해주세요.';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late _ViewStore store;
  late SheetLibraryController controller;
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    store = _ViewStore();
    await store.saveLibraryViewSettings(
      SheetLibraryViewSettings.defaultSettings.copyWith(tagQuery: 'Original'),
    );
    controller = SheetLibraryController(store: store);
    await controller.load();
  });

  final actions = <String, Future<void> Function(SheetLibraryController)>{
    'sort': (c) => c.updateLibrarySortMode(SheetLibrarySortMode.title),
    'favorite': (c) => c.updateFavoriteFilter(true),
    'tag': (c) => c.updateTagFilter('New'),
    'composer': (c) => c.updateComposerFilter('Bach'),
    'collection': (c) => c.updateCollectionFilter('Concert'),
    'group': (c) => c.updateGroupFilter('Practice'),
    'rating': (c) => c.updateMinimumRatingFilter(4),
    'custom': (c) => c.updateCustomFieldFilter('Key', 'C'),
    'clear': (c) => c.clearLibrarySearchAndFilters(),
  };
  for (final action in actions.entries) {
    test(
      'view ${action.key} failure restores settings and allows retry',
      () async {
        final before = controller.libraryViewSettings.toJson();
        store.failNext = true;
        await action.value(controller);
        expect(controller.errorMessage, _error);
        expect(controller.libraryViewSettings.toJson(), before);
        expect((await store.loadLibraryViewSettings()).toJson(), before);
        await action.value(controller);
        expect(controller.errorMessage, isNull);
        expect(controller.libraryViewSettings.toJson(), isNot(before));
        expect(
          (await store.loadLibraryViewSettings()).toJson(),
          controller.libraryViewSettings.toJson(),
        );
      },
    );
  }

  for (final fails in [false, true]) {
    test('delayed view save retains origin library: fails=$fails', () async {
      final id = controller.activeLibraryProfile.id;
      store.delay = true;
      final pending = controller.updateFavoriteFilter(true);
      await controller.createLibraryProfile('Other');
      if (fails) {
        store.writes.single.completeError(StateError('save failed'));
      } else {
        store.writes.single.complete();
      }
      await pending;
      expect(controller.errorMessage, isNull);
      expect(controller.libraryViewSettings.favoriteOnly, isFalse);
      expect((await store.loadLibraryViewSettings()).favoriteOnly, isFalse);
      await controller.switchLibraryProfile(id);
      expect(controller.libraryViewSettings.favoriteOnly, !fails);
    });
  }

  test('older view failure preserves newer successful state', () async {
    store.delay = true;
    final older = controller.updateFavoriteFilter(true);
    store.delay = false;
    await controller.updateTagFilter('New');
    store.writes.single.completeError(StateError('old save failed'));
    await older;
    expect(controller.libraryViewSettings.favoriteOnly, isTrue);
    expect(controller.libraryViewSettings.tagQuery, 'New');
    expect(controller.errorMessage, isNull);
    expect(
      (await store.loadLibraryViewSettings()).toJson(),
      controller.libraryViewSettings.toJson(),
    );
  });

  test('newer view failure recovers older successful state', () async {
    store.delay = true;
    final older = controller.updateFavoriteFilter(true);
    final newer = controller.updateTagFilter('New');
    store.writes.first.complete();
    await older;
    store.writes.last.completeError(StateError('new save failed'));
    await newer;
    expect(controller.libraryViewSettings.favoriteOnly, isTrue);
    expect(controller.libraryViewSettings.tagQuery, 'Original');
    expect(controller.errorMessage, _error);
  });

  test('delayed view recovery does not overwrite newer filter', () async {
    final original = controller.libraryViewSettings;
    store.failNext = true;
    store.readEntered = Completer<void>();
    store.readResult = Completer<SheetLibraryViewSettings>();
    final older = controller.updateFavoriteFilter(true);
    await store.readEntered!.future;
    await controller.updateTagFilter('New');
    final latest = controller.libraryViewSettings;
    store.readResult!.complete(original);
    await older;
    expect(controller.libraryViewSettings.toJson(), latest.toJson());
    expect(controller.errorMessage, isNull);
  });

  test('view recovery read failure still reports save error', () async {
    store.failNext = true;
    store.readEntered = Completer<void>();
    store.readResult = Completer<SheetLibraryViewSettings>();
    final pending = controller.updateFavoriteFilter(true);
    await store.readEntered!.future;
    store.readResult!.completeError(StateError('read failed'));
    await pending;
    expect(controller.errorMessage, _error);
  });

  test('successful view save does not clear an unrelated load error', () async {
    store.failScoreRead = true;
    await controller.load();
    final error = controller.errorMessage;
    expect(error, isNotNull);
    expect(error, isNot(_error));
    store.failScoreRead = false;
    await controller.updateFavoriteFilter(true);
    expect(controller.errorMessage, error);
  });

  for (final closed in [false, true]) {
    testWidgets('home favorite filter failure: closed=$closed', (tester) async {
      await tester.pumpWidget(
        MaterialApp(home: SheetLibraryScreen(controller: controller)),
      );
      await tester.pumpAndSettle();
      store.delay = true;
      final chip = find.widgetWithText(FilterChip, '즐겨찾기');
      await tester.ensureVisible(chip);
      await tester.tap(chip);
      await tester.pumpAndSettle();
      if (closed) await tester.pumpWidget(const SizedBox());
      store.writes.single.completeError(StateError('save failed'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(controller.libraryViewSettings.favoriteOnly, isFalse);
      if (!closed) {
        expect(find.text(_error), findsOneWidget);
        expect(tester.widget<FilterChip>(chip).selected, isFalse);
        store.delay = false;
        await tester.tap(chip);
        await tester.pumpAndSettle();
        expect(find.text(_error), findsNothing);
        expect(tester.widget<FilterChip>(chip).selected, isTrue);
      }
      await tester.pumpWidget(const SizedBox());
    });
  }
}

class _ViewStore extends SheetLibraryStore {
  bool failNext = false;
  bool delay = false;
  final writes = <Completer<void>>[];
  bool failScoreRead = false;
  Completer<void>? readEntered;
  Completer<SheetLibraryViewSettings>? readResult;

  @override
  Future<List<SheetScore>> loadScores() async {
    if (failScoreRead) throw StateError('load failed');
    return super.loadScores();
  }

  @override
  Future<SheetLibraryViewSettings> loadLibraryViewSettings() async {
    if (readResult != null) {
      readEntered!.complete();
      return readResult!.future;
    }
    return super.loadLibraryViewSettings();
  }

  @override
  Future<void> saveLibraryViewSettings(
    SheetLibraryViewSettings settings, {
    String? libraryId,
  }) async {
    if (delay) {
      final pending = Completer<void>();
      writes.add(pending);
      await pending.future;
    }
    if (failNext) {
      failNext = false;
      throw StateError('view save failed');
    }
    await super.saveLibraryViewSettings(settings, libraryId: libraryId);
  }
}
