import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:in_c_sheet/classical_discovery_screen.dart';
import 'package:in_c_sheet/classical_discovery_app.dart';
import 'package:in_c_sheet/classical_discovery_repository.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:in_c_sheet/classical_daily_notification.dart';
import 'package:in_c_sheet/classical_discovery_controller.dart';
import 'package:in_c_sheet/classical_discovery_models.dart';
import 'package:in_c_sheet/classical_discovery_store.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets(
    'empty daily pool still offers a way to undo composer exclusions',
    (tester) async {
      final store = MemoryStore();
      final controller = makeController(store);
      store.state = store.state.copyWith(
        onboardingCompleted: true,
        excludedComposerIds: controller.composers
            .map((composer) => composer.id)
            .toSet(),
      );
      await controller.load();
      await tester.pumpWidget(ClassicalDiscoveryApp(controller: controller));
      await tester.pumpAndSettle();
      expect(find.text('선택한 조건에 맞는 추천이 없어요'), findsOneWidget);
      await tester.tap(find.text('추천에서 제외'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'Mahler');
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('exclude-composer-mahler')));
      await tester.pumpAndSettle();
      expect(controller.hasDailyRecommendation, isTrue);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('선택한 조건에 맞는 추천이 없어요'), findsNothing);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      controller.dispose();
    },
  );

  test('later preference edits with a backward clock cannot resurrect a removed exclusion', () async {
    var now = DateTime(2026, 9, 14, 9);
    final store = MemoryStore();
    final controller = ClassicalDiscoveryController(
      store: store,
      clock: () => now,
      notificationGateway: const DisabledClassicalDailyNotificationGateway(),
    );
    await controller.load();
    await controller.setComposerExcluded('mahler', true);
    final stale = store.state;
    await controller.setComposerExcluded('mahler', false);
    final removedAt = store.state.preferencesUpdatedAt!;
    now = now.subtract(const Duration(days: 1));
    await controller.setPreferredPlatform('apple_music');
    expect(store.state.preferencesUpdatedAt!.isAfter(removedAt), isTrue);
    const merger = DiscoveryStateMerger();
    for (final pair in [(stale, store.state), (store.state, stale)]) {
      expect(merger.merge(pair.$1, pair.$2).excludedComposerIds, isEmpty);
    }
    controller.dispose();
  });

  test('invalid exclusion data recovers backup rather than silently clearing preferences', () async {
    const key = 'composer_exclusion_codec';
    final valid = UserDiscoveryState.defaultState.copyWith(
      excludedComposerIds: {'mahler'},
    );
    SharedPreferences.setMockInitialValues({
      key: '{"excludedComposerIds":"mahler"}',
      '${key}_backup': UserDiscoveryState.encode(valid),
    });
    final store = ClassicalDiscoveryStore(storageKey: key);
    expect((await store.loadState()).excludedComposerIds, {'mahler'});
    expect(store.recoveryMessage, isNotNull);
  });

  test(
    'failed exclusion save remains pending and explicit retry persists it',
    () async {
      final store = MemoryStore();
      final controller = makeController(store);
      await controller.load();
      store.failWrites = true;
      await controller.setComposerExcluded('mahler', true);
      expect(controller.persistenceMessage, isNotNull);
      expect(controller.state.excludedComposerIds, {'mahler'});
      expect(store.state.excludedComposerIds, isEmpty);
      store.failWrites = false;
      await controller.retryPersistence();
      expect(store.state.excludedComposerIds, {'mahler'});
      expect(controller.persistenceMessage, isNull);
      controller.dispose();
    },
  );

  test('explicit exclusion wins over saved and supplied likes without erasing history', () async {
    final store = MemoryStore();
    final controller = makeController(store);
    await controller.load();
    await controller.addTasteIntakeInputs(['말러 아다지에토', '선율']);
    await controller.toggleSaveWork('mahler-adagietto');
    final pin = await controller.ensureDailyPick();
    await controller.setComposerExcluded('mahler', true);
    expect(controller.dailyPick().workId, pin.workId);
    expect(controller.state.stateForWork('mahler-adagietto').saved, isTrue);
    expect(controller.tasteIntakeItems.first.matchedComposerId, 'mahler');
    for (final row in controller.founderSevenDayPreview()) {
      expect(row.work.composerId, isNot('mahler'));
    }
    final anchor = controller.workById('mahler-adagietto')!;
    expect(
      controller
          .shelvesForWork(anchor)
          .expand((shelf) => shelf.works)
          .where((work) => work.composerId == 'mahler'),
      isEmpty,
    );
    expect(
      controller
          .discoverShelves()
          .expand((shelf) => shelf.works)
          .where((work) => work.composerId == 'mahler'),
      isEmpty,
    );
    expect(controller.searchWorks('말러'), isNotEmpty);
    final reloaded = makeController(store);
    await reloaded.load();
    expect(reloaded.state.excludedComposerIds, contains('mahler'));
    final stale = store.state;
    await reloaded.setComposerExcluded('mahler', false);
    expect(
      reloaded.state.preferencesUpdatedAt!.isAfter(stale.preferencesUpdatedAt!),
      isTrue,
    );
    const merger = DiscoveryStateMerger();
    for (final pair in [(stale, store.state), (store.state, stale)]) {
      final restored = UserDiscoveryState.fromJson(
        merger.merge(pair.$1, pair.$2).toJson(),
      );
      expect(restored.excludedComposerIds, isEmpty);
      expect(restored.stateForWork('mahler-adagietto').saved, isTrue);
    }
    reloaded.dispose();
    controller.dispose();
  });

  test('new users inherit no founder exclusions and invalid IDs do not mutate preferences', () async {
    final store = MemoryStore();
    final controller = makeController(store);
    await controller.load();
    expect(controller.state.excludedComposerIds, isEmpty);
    final before = controller.state.toJson();
    await expectLater(
      controller.setComposerExcluded('not-a-composer', true),
      throwsArgumentError,
    );
    expect(controller.state.toJson(), before);
    expect(
      UserDiscoveryState.fromJson({...before}..remove('excludedComposerIds'))
          .excludedComposerIds,
      isEmpty,
    );
    controller.dispose();
  });

  testWidgets(
    'composer exclusion search toggle and restore fit a small screen',
    (tester) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final controller = makeController(MemoryStore());
      await controller.load();
      await tester.pumpWidget(
        MaterialApp(
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context)
                .copyWith(textScaler: const TextScaler.linear(1.6)),
            child: child!,
          ),
          home: ClassicalComposerExclusionsScreen(controller: controller),
        ),
      );
      await tester.enterText(find.byType(TextField), 'Mahler');
      await tester.pumpAndSettle();
      final toggle = find.byKey(const ValueKey('exclude-composer-mahler'));
      expect(toggle, findsOneWidget);
      await tester.tap(toggle);
      await tester.pumpAndSettle();
      expect(controller.state.excludedComposerIds, contains('mahler'));
      await tester.tap(toggle);
      await tester.pumpAndSettle();
      expect(controller.state.excludedComposerIds, isEmpty);
      await tester.enterText(find.byType(TextField), 'no matching composer');
      await tester.pumpAndSettle();
      expect(find.text('일치하는 작곡가가 없어요.'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      controller.dispose();
    },
  );
  test('explicitly excluding all composers leaves search usable without a forced daily pick', () async {
    final store = MemoryStore();
    final controller = makeController(store);
    store.state = UserDiscoveryState.fromJson({
      ...store.state.toJson(),
      'excludedComposerIds': controller.works
          .map((work) => work.composerId)
          .toSet()
          .toList(),
    });
    await controller.load();
    expect(controller.hasDailyRecommendation, isFalse);
    expect(controller.searchWorks('베토벤'), isNotEmpty);
    expect(controller.state.dailyPicks, isEmpty);
    controller.dispose();
  });
}

ClassicalDiscoveryController makeController(MemoryStore store) =>
    ClassicalDiscoveryController(
      store: store,
      clock: () => DateTime(2026, 9, 14, 9),
      notificationGateway: const DisabledClassicalDailyNotificationGateway(),
    );

class MemoryStore extends ClassicalDiscoveryStore {
  bool failWrites = false;
  UserDiscoveryState state = UserDiscoveryState.defaultState;
  @override
  Future<UserDiscoveryState> loadState() async => state;
  @override
  Future<void> saveState(UserDiscoveryState value) async {
    if (failWrites) throw StateError('fixture write failure');
    state = value;
  }
}
