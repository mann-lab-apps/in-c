import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/sheet_annotation.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _original = SheetAnnotationToolPreset(
  toolName: 'rectangle',
  color: 0xff111111,
  width: 6,
);
const _next = SheetAnnotationToolPreset(
  toolName: 'pen',
  color: 0xff222222,
  width: 3,
);
const _latest = SheetAnnotationToolPreset(
  toolName: 'line',
  color: 0xff333333,
  width: 4,
);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late _PresetStore store;
  late SheetLibraryController controller;
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    store = _PresetStore();
    await store.saveFavoriteAnnotationPreset(_original);
    final now = DateTime(2026, 9, 14);
    await store.saveScores([
      SheetScore(
        id: 'score',
        title: 'Concert',
        composer: '',
        tags: const [],
        note: '',
        filePath: '/tmp/clef-missing-preset-fixture.pdf',
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: null,
        lastPage: 1,
        isFavorite: false,
        bookmarks: const [],
      ),
    ]);
    controller = SheetLibraryController(store: store);
    await controller.load();
  });

  for (final preset in [_next, null]) {
    test(
      'favorite preset failure restores previous value: ${preset?.toolName}',
      () async {
        store.delay = true;
        final pending = controller.updateFavoriteAnnotationPreset(preset);
        final failed = expectLater(pending, throwsA(anything));
        store.writes.single.completeError(StateError('save failed'));
        await failed;
        expect(
          controller.favoriteAnnotationPreset?.toJson(),
          _original.toJson(),
        );
        expect(
          (await store.loadFavoriteAnnotationPreset())?.toJson(),
          _original.toJson(),
        );
        store.delay = false;
        await controller.updateFavoriteAnnotationPreset(preset);
        expect(controller.favoriteAnnotationPreset?.toJson(), preset?.toJson());
        expect(
          (await store.loadFavoriteAnnotationPreset())?.toJson(),
          preset?.toJson(),
        );
      },
    );
  }

  test('old favorite failure does not roll back newer success', () async {
    store.delay = true;
    final older = controller.updateFavoriteAnnotationPreset(_next);
    final failed = expectLater(older, throwsA(anything));
    store.delay = false;
    await controller.updateFavoriteAnnotationPreset(_latest);
    store.writes.single.completeError(StateError('old save failed'));
    await failed;
    expect(controller.favoriteAnnotationPreset?.toJson(), _latest.toJson());
    expect(
      (await store.loadFavoriteAnnotationPreset())?.toJson(),
      _latest.toJson(),
    );
  });

  test('newer favorite failure recovers older successful save', () async {
    store.delay = true;
    final older = controller.updateFavoriteAnnotationPreset(_next);
    final newer = controller.updateFavoriteAnnotationPreset(_latest);
    final failed = expectLater(newer, throwsA(anything));
    store.writes.first.complete();
    await older;
    store.writes.last.completeError(StateError('new save failed'));
    await failed;
    expect(controller.favoriteAnnotationPreset?.toJson(), _next.toJson());
    expect(
      (await store.loadFavoriteAnnotationPreset())?.toJson(),
      _next.toJson(),
    );
  });

  test('late favorite recovery read preserves newer edit', () async {
    store.delay = true;
    store.readEntered = Completer<void>();
    store.readResult = Completer<SheetAnnotationToolPreset?>();
    final older = controller.updateFavoriteAnnotationPreset(_next);
    final failed = expectLater(older, throwsA(anything));
    store.writes.single.completeError(StateError('save failed'));
    await store.readEntered!.future;
    store.delay = false;
    await controller.updateFavoriteAnnotationPreset(_latest);
    store.readResult!.complete(_original);
    await failed;
    expect(controller.favoriteAnnotationPreset?.toJson(), _latest.toJson());
  });

  test(
    'favorite recovery read failure preserves original save error',
    () async {
      store.delay = true;
      store.readEntered = Completer<void>();
      store.readResult = Completer<SheetAnnotationToolPreset?>();
      final failure = StateError('save failed');
      final pending = controller.updateFavoriteAnnotationPreset(_next);
      final failed = expectLater(pending, throwsA(same(failure)));
      store.writes.single.completeError(failure);
      await store.readEntered!.future;
      store.readResult!.completeError(StateError('read failed'));
      await failed;
    },
  );

  for (final fails in [false, true]) {
    test(
      'favorite save stays in source library after switch: fails=$fails',
      () async {
        final sourceId = controller.activeLibraryProfile.id;
        store.delay = true;
        final pending = controller.updateFavoriteAnnotationPreset(_next);
        final result = expectLater(
          pending,
          fails ? throwsA(anything) : completes,
        );
        await controller.createLibraryProfile('Other');
        if (fails) {
          store.writes.single.completeError(StateError('old save failed'));
        } else {
          store.writes.single.complete();
        }
        await result;
        expect(controller.favoriteAnnotationPreset, isNull);
        expect(await store.loadFavoriteAnnotationPreset(), isNull);
        await controller.switchLibraryProfile(sourceId);
        expect(
          controller.favoriteAnnotationPreset?.toJson(),
          (fails ? _original : _next).toJson(),
        );
      },
    );
  }

  for (final exit in ['stay', 'closed', 'covered']) {
    for (final fails in [false, true]) {
      testWidgets('viewer favorite save $exit: fails=$fails', (tester) async {
        tester.view.physicalSize = const Size(1600, 1000);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        await tester.runAsync(() async {
          await tester.pumpWidget(
            MaterialApp(
              home: SheetViewerScreen(controller: controller, scoreId: 'score'),
            ),
          );
          await Future<void>.delayed(const Duration(milliseconds: 50));
        });
        await tester.pumpAndSettle();
        await tester.tap(find.byTooltip('필기 모드'));
        await tester.pumpAndSettle();
        final button = find
            .byWidgetPredicate(
              (widget) =>
                  widget is IconButton && widget.tooltip == '현재 필기 도구 즐겨찾기 저장',
            )
            .last;
        await tester.ensureVisible(button);
        store.delay = true;
        await tester.tap(button);
        await tester.pumpAndSettle();
        final prematureNotice = find
            .text('현재 필기 도구를 즐겨찾기로 저장했습니다.')
            .evaluate()
            .isNotEmpty;
        final enabledDuringSave =
            tester.widget<IconButton>(button).onPressed != null;
        if (exit == 'closed') {
          await tester.pumpWidget(const SizedBox());
        } else if (exit == 'covered') {
          unawaited(
            Navigator.of(tester.element(find.byType(SheetViewerScreen)))
                .push<void>(
                  MaterialPageRoute(
                    builder: (_) => const Scaffold(body: Text('Other route')),
                  ),
                ),
          );
          await tester.pumpAndSettle();
        }
        if (fails) {
          store.writes.single.completeError(StateError('save failed'));
        } else {
          store.writes.single.complete();
        }
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(prematureNotice, isFalse);
        expect(enabledDuringSave, isFalse);
        expect(
          find.text('현재 필기 도구를 즐겨찾기로 저장했습니다.'),
          exit == 'stay' && !fails ? findsOneWidget : findsNothing,
        );
        expect(
          find.text('즐겨찾기 필기 도구를 저장하지 못했습니다. 다시 시도해주세요.'),
          exit == 'stay' && fails ? findsOneWidget : findsNothing,
        );
        if (exit == 'stay' && fails) {
          expect(
            controller.favoriteAnnotationPreset?.toJson(),
            _original.toJson(),
          );
          await tester.pump(const Duration(seconds: 5));
          store.delay = false;
          await tester.tap(button);
          await tester.pumpAndSettle();
          expect(find.text('현재 필기 도구를 즐겨찾기로 저장했습니다.'), findsOneWidget);
        }
        await tester.pumpWidget(const SizedBox());
      });
    }
  }
}

class _PresetStore extends SheetLibraryStore {
  bool delay = false;
  final writes = <Completer<void>>[];
  Completer<void>? readEntered;
  Completer<SheetAnnotationToolPreset?>? readResult;

  @override
  Future<SheetAnnotationToolPreset?> loadFavoriteAnnotationPreset() async {
    if (readResult != null) {
      readEntered!.complete();
      return readResult!.future;
    }
    return super.loadFavoriteAnnotationPreset();
  }

  @override
  Future<void> saveFavoriteAnnotationPreset(
    SheetAnnotationToolPreset? preset, {
    String? libraryId,
  }) async {
    if (delay) {
      final pending = Completer<void>();
      writes.add(pending);
      await pending.future;
    }
    await super.saveFavoriteAnnotationPreset(preset, libraryId: libraryId);
  }
}
