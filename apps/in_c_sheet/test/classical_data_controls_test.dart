import 'dart:convert';
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:in_c_sheet/classical_discovery_models.dart';
import 'package:in_c_sheet/classical_discovery_repository.dart';
import 'package:in_c_sheet/classical_discovery_store.dart';
import 'package:in_c_sheet/classical_discovery_controller.dart';
import 'package:in_c_sheet/classical_daily_notification.dart';
import 'package:in_c_sheet/classical_data_controls_screen.dart';

class EraseGateway extends DisabledClassicalDailyNotificationGateway {
  Completer<String>? permission;
  Completer<String?>? nextPayload;
  bool failCancel = false;
  final calls = <String>[];
  DailyPickNotificationRequest? scheduled;
  @override
  Future<String> requestPermission() async =>
      permission?.future ?? Future.value('granted');
  @override
  Future<void> scheduleDailyPick(DailyPickNotificationRequest request) async {
    calls.add('schedule');
    scheduled = request;
  }

  @override
  Future<void> cancelDailyPick() async {
    if (failCancel) throw StateError('cancel failed');
    calls.add('cancel');
    scheduled = null;
  }

  @override
  Future<String?> consumeLaunchPayload() async {
    final pending = nextPayload;
    nextPayload = null;
    return pending?.future;
  }
}

class InterruptedEraseStore extends ClassicalDiscoveryStore {
  InterruptedEraseStore() : super(storageKey: 'disk-erase-failure');
  bool failErase = true;
  @override
  Future<UserDiscoveryState> eraseLocalData({required DateTime at}) async {
    if (failErase) {
      final preferences = await SharedPreferences.getInstance();
      await preferences.setString(
        'disk-erase-failure_erase_pending',
        at.toIso8601String(),
      );
      throw StateError('interrupted disk erase');
    }
    return super.eraseLocalData(at: at);
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test(
    'late notification tap cannot navigate while history is being erased',
    () async {
      SharedPreferences.setMockInitialValues({});
      final gateway = EraseGateway();
      final controller = ClassicalDiscoveryController(
        store: ClassicalDiscoveryStore(storageKey: 'late-tap-erase'),
        notificationGateway: gateway,
      );
      await controller.load();
      await controller.addTasteIntakeInputs(['비발디 봄']);
      final destinations = <String>[];
      controller.notificationDestination.addListener(() {
        if (controller.notificationDestination.value case final pick?) {
          destinations.add(pick.workId);
        }
      });
      final payload = Completer<String?>();
      gateway.nextPayload = payload;
      final tap = controller.consumePendingDailyPickNotification();
      await Future<void>.delayed(Duration.zero);
      final erase = controller.eraseLocalData();
      payload.complete('{"version":1,"route":"today"}');
      await tap;
      await erase;
      expect(destinations, isEmpty);
      controller.dispose();
    },
  );

  test(
    'interrupted controller deletion refuses edits until retry succeeds',
    () async {
      SharedPreferences.setMockInitialValues({});
      final store = InterruptedEraseStore();
      final controller = ClassicalDiscoveryController(
        store: store,
        notificationGateway: const DisabledClassicalDailyNotificationGateway(),
      );
      await controller.load();
      await controller.addTasteIntakeInputs(['비발디 봄']);
      await expectLater(controller.eraseLocalData(), throwsStateError);
      expect(controller.loadFailed, isTrue);
      expect(() => controller.exportLocalData(), throwsStateError);
      await controller.toggleSaveWork('bach-air');
      expect(controller.state.stateForWork('bach-air').saved, isFalse);
      store.failErase = false;
      await controller.eraseLocalData();
      expect(controller.loadFailed, isFalse);
      expect(controller.state.tasteIntakeItems, isEmpty);
      expect((await store.loadState()).tasteIntakeItems, isEmpty);
      controller.dispose();
    },
  );

  test(
    'invalid erase marker fails closed instead of recovering personal data',
    () async {
      SharedPreferences.setMockInitialValues({
        'invalid-marker_erase_pending': true,
      });
      final store = ClassicalDiscoveryStore(storageKey: 'invalid-marker');
      await expectLater(store.loadState(), throwsFormatException);
      await expectLater(
        store.saveState(UserDiscoveryState.defaultState),
        throwsStateError,
      );
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.get('invalid-marker_erase_pending'), isTrue);
    },
  );

  test('controller export is truthful and erase cancels older in-flight notification enable', () async {
    SharedPreferences.setMockInitialValues({});
    final gateway = EraseGateway()..permission = Completer<String>();
    final controller = ClassicalDiscoveryController(
      store: ClassicalDiscoveryStore(storageKey: 'controller-erase'),
      notificationGateway: gateway,
    );
    await controller.load();
    await controller.addTasteIntakeInputs(['비발디 봄']);
    final exported = jsonDecode(controller.exportLocalData()) as Map;
    expect(exported['format'], 'in-c-personal-data');
    expect(
      (exported['state']['tasteIntakeItems'] as List).single['rawInput'],
      '비발디 봄',
    );
    final enable = controller.configureDailyPickReminder(enabled: true);
    await Future<void>.delayed(Duration.zero);
    final erase = controller.eraseLocalData();
    expect(controller.resettingData, isTrue);
    await controller.configureDailyPickReminder(enabled: true);
    gateway.permission!.complete('granted');
    await enable;
    await erase;
    expect(gateway.calls.last, 'cancel');
    expect(gateway.scheduled, isNull);
    expect(controller.state.tasteIntakeItems, isEmpty);
    expect(controller.state.reminderPreference.enabled, isFalse);
    await controller.addTasteIntakeInputs(['드뷔시 달빛']);
    expect(
      controller.state.tasteIntakeItems.single.matchedWorkId,
      'debussy-clair-de-lune',
    );
    controller.dispose();
  });

  test('failed notification cancellation leaves history untouched and allows retry', () async {
    SharedPreferences.setMockInitialValues({});
    final gateway = EraseGateway()..failCancel = true;
    final store = ClassicalDiscoveryStore(storageKey: 'cancel-failure');
    final controller = ClassicalDiscoveryController(
      store: store,
      notificationGateway: gateway,
    );
    await controller.load();
    await controller.addTasteIntakeInputs(['비발디 봄']);
    await expectLater(controller.eraseLocalData(), throwsStateError);
    expect((await store.loadState()).tasteIntakeItems, hasLength(1));
    expect(controller.persistenceMessage, contains('시작하지 않았'));
    gateway.failCancel = false;
    await controller.eraseLocalData();
    expect((await store.loadState()).tasteIntakeItems, isEmpty);
    controller.dispose();
  });

  testWidgets(
    'data controls export, cancel and confirm deletion fit small screens',
    (tester) async {
      SharedPreferences.setMockInitialValues({});
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final controller = ClassicalDiscoveryController(
        store: ClassicalDiscoveryStore(storageKey: 'ui-erase'),
        notificationGateway: const DisabledClassicalDailyNotificationGateway(),
      );
      await controller.load();
      await controller.addTasteIntakeInputs(['비발디 봄']);
      await tester.pumpWidget(
        MaterialApp(
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context)
                .copyWith(textScaler: const TextScaler.linear(1.6)),
            child: child!,
          ),
          home: ClassicalDataControlsScreen(controller: controller),
        ),
      );
      await tester.tap(find.text('내 기록 JSON 보기'));
      await tester.pumpAndSettle();
      expect(find.byType(SelectableText), findsOneWidget);
      expect(find.textContaining('in-c-personal-data'), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();
      await tester.tap(find.text('in C 기록 지우기'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('취소'));
      await tester.pumpAndSettle();
      expect(controller.state.tasteIntakeItems, hasLength(1));
      await tester.tap(find.text('in C 기록 지우기'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('기록 삭제'));
      await tester.pumpAndSettle();
      expect(controller.state.tasteIntakeItems, isEmpty);
      expect(find.text('이 기기의 in C 기록을 지웠어요.'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      controller.dispose();
    },
  );
  final old = UserDiscoveryState.defaultState.copyWith(
    region: '부산',
    workStates: {
      'bach-air': const UserWorkState(
        workId: 'bach-air',
        saved: true,
        familiarityLevel: 1,
      ),
    },
  );

  test('same-key stores serialize saves around deletion and reset clocks remain monotonic', () async {
    SharedPreferences.setMockInitialValues({});
    final a = ClassicalDiscoveryStore(storageKey: 'concurrent-erase');
    final b = ClassicalDiscoveryStore(storageKey: 'concurrent-erase');
    final save = a.saveState(old);
    final wipe = b.eraseLocalData(at: DateTime(2026, 9, 13));
    final stale = expectLater(a.saveState(old), throwsStateError);
    await save;
    final first = await wipe;
    await stale;
    final second = await b.eraseLocalData(at: DateTime(2026, 9, 12));
    expect(second.historyResetAt!.isAfter(first.historyResetAt!), isTrue);
    expect((await a.loadState()).workStates, isEmpty);
  });

  test('erase removes only discovery primary and backup history and rejects stale writes', () async {
    SharedPreferences.setMockInitialValues({
      'clef_sheet_library': 'keep my scores',
    });
    final store = ClassicalDiscoveryStore(storageKey: 'erase-test');
    await store.saveState(old);
    await store.saveState(old);
    final reset = await store.eraseLocalData(at: DateTime(2026, 9, 13));
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getString('clef_sheet_library'), 'keep my scores');
    expect(prefs.containsKey('erase-test_backup'), isFalse);
    expect(prefs.containsKey('erase-test_erase_pending'), isFalse);
    expect(reset.workStates, isEmpty);
    expect(reset.historyResetAt, DateTime(2026, 9, 13));
    final other = ClassicalDiscoveryStore(storageKey: 'erase-test');
    await expectLater(other.saveState(old), throwsStateError);
    expect((await other.loadState()).workStates, isEmpty);
    await other.saveState(reset.copyWith(region: '대전'));
    expect((await other.loadState()).region, '대전');
    await prefs.setString('erase-test', 'broken');
    await expectLater(other.saveState(old), throwsStateError);
    expect((await other.loadState()).workStates, isEmpty);
  });

  test(
    'interrupted erase finishes before exposing old primary or backup',
    () async {
      for (final primary in [UserDiscoveryState.encode(old), 'broken', null]) {
        SharedPreferences.setMockInitialValues({
          'interrupted': ?primary,
          'interrupted_backup': UserDiscoveryState.encode(old),
          'interrupted_erase_pending': '2026-09-13T09:00:00.000',
        });
        final store = ClassicalDiscoveryStore(storageKey: 'interrupted');
        final state = await store.loadState();
        expect(state.workStates, isEmpty);
        expect(state.region, '서울');
        final prefs = await SharedPreferences.getInstance();
        expect(prefs.containsKey('interrupted_backup'), isFalse);
        expect(prefs.containsKey('interrupted_erase_pending'), isFalse);
      }
    },
  );

  test(
    'reset epoch prevents old snapshots restoring history in any merge order',
    () async {
      SharedPreferences.setMockInitialValues({});
      final store = ClassicalDiscoveryStore(storageKey: 'merge-reset');
      final reset = await store.eraseLocalData(at: DateTime(2026, 9, 13));
      const merger = DiscoveryStateMerger();
      for (final merged in [
        merger.merge(old, reset),
        merger.merge(reset, old),
      ]) {
        final reopened = UserDiscoveryState.fromJson(
          jsonDecode(UserDiscoveryState.encode(merged)) as Map<String, Object?>,
        );
        expect(reopened.workStates, isEmpty);
        expect(reopened.historyResetAt, reset.historyResetAt);
      }
      final newer = reset.copyWith(
        region: '대전',
        preferencesUpdatedAt: DateTime(2026, 9, 14),
      );
      expect(merger.merge(reset, newer).region, '대전');
      expect(merger.merge(old, newer).region, '대전');
    },
  );
}
