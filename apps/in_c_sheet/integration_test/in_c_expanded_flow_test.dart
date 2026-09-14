import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:in_c_sheet/classical_daily_notification.dart';
import 'package:in_c_sheet/classical_discovery_app.dart';
import 'package:in_c_sheet/classical_discovery_controller.dart';
import 'package:in_c_sheet/classical_discovery_models.dart';
import 'package:in_c_sheet/classical_discovery_screen.dart';
import 'package:in_c_sheet/classical_discovery_store.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    if (!const bool.fromEnvironment('IN_C_ISOLATED_NOTIFICATION_QA')) return;
    expect(const bool.fromEnvironment('IN_C_SIMULATOR_QA'), isTrue);
    expect(Platform.isIOS, isTrue);
    const channel = MethodChannel('mannlab.in_c/daily_notifications');
    expect(
      await channel.invokeMethod<bool>('isIsolatedNotificationQa'),
      isTrue,
      reason: 'Never replace reminders on an existing user simulator.',
    );
  });

  testWidgets('native backup survives missing and wrong-type primary storage', (
    tester,
  ) async {
    final key = 'in_c_backup_qa_${DateTime.now().microsecondsSinceEpoch}';
    final preferences = await SharedPreferences.getInstance();
    final store = ClassicalDiscoveryStore(storageKey: key);
    final saved = UserDiscoveryState.defaultState.copyWith(
      workStates: {
        'bach-air': const UserWorkState(
          workId: 'bach-air',
          saved: true,
          familiarityLevel: 0,
        ),
      },
    );
    try {
      await store.saveState(saved);
      await store.saveState(saved);
      expect(await preferences.remove(key), isTrue);
      expect((await store.loadState()).stateForWork('bach-air').saved, isTrue);
      expect(store.recoveryMessage, isNotNull);
      expect(await preferences.setInt(key, 42), isTrue);
      expect((await store.loadState()).stateForWork('bach-air').saved, isTrue);
      await store.saveState(saved);
      expect(store.recoveryMessage, isNull);
      expect((await store.loadState()).stateForWork('bach-air').saved, isTrue);
      expect(store.recoveryMessage, isNull);
    } finally {
      await preferences.remove(key);
      await preferences.remove('${key}_backup');
    }
  });

  testWidgets(
    'native fugue recommendation retains broad input and truthful metadata',
    (tester) async {
      final key = 'in_c_fugue_qa_${DateTime.now().microsecondsSinceEpoch}';
      final store = ClassicalDiscoveryStore(storageKey: key);
      final controller = ClassicalDiscoveryController(
        store: store,
        notificationGateway: const DisabledClassicalDailyNotificationGateway(),
      );
      try {
        await controller.load();
        await controller.setOperaticVocalsExcluded(true);
        await controller.addTasteIntakeInputs(['바흐 푸가']);
        final pick = await controller.ensureDailyPick();
        expect(pick.workId, 'bach-little-fugue-bwv578');
        expect(
          (await store.loadState()).tasteIntakeItems.single.matchedWorkId,
          isNull,
        );
        expect(pick.sourceEvidence, contains('바흐 푸가'));
        await controller.skipOnboarding();
        await tester.pumpWidget(ClassicalDiscoveryApp(controller: controller));
        await tester.pumpAndSettle();
        Navigator.of(tester.element(find.byType(ClassicalDiscoveryAppShell)))
            .push<void>(
              MaterialPageRoute(
                builder: (_) => ClassicalWorkDetailScreen(
                  controller: controller,
                  work: controller.workById(pick.workId)!,
                ),
              ),
            );
        await tester.pumpAndSettle();
        await binding.takeScreenshot('in-c-fugue-detail');
        await tester.scrollUntilVisible(
          find.text('약 4분'),
          400,
          scrollable: find.byType(Scrollable).first,
        );
        await tester.pumpAndSettle();
        expect(find.text('약 4분').hitTestable(), findsOneWidget);
        expect(find.text('BWV 578'), findsWidgets);
        await binding.takeScreenshot('in-c-fugue-metadata');
        expect(tester.takeException(), isNull);
      } finally {
        await tester.pumpWidget(const SizedBox.shrink());
        controller.dispose();
        final prefs = await SharedPreferences.getInstance();
        await prefs.remove(key);
        await prefs.remove('${key}_backup');
      }
    },
  );

  testWidgets('native unauthorized scheduler refuses false success', (
    tester,
  ) async {
    if (!Platform.isIOS) return;
    const channel = MethodChannel('mannlab.in_c/daily_notifications');
    final status = await channel.invokeMethod<String>('permissionStatus');
    debugPrint('Native notification authorization: $status');
    if (status == 'authorized' || status == 'provisional') {
      markTestSkipped(
        'Denial branch requires an unauthorized device; permission is not reset automatically.',
      );
      return;
    }
    await expectLater(
      channel.invokeMethod<void>('scheduleDailyPick', {
        'title': 'in C fixture',
        'body': 'permission safety test',
        'payload': '{"version":1,"route":"today"}',
        'hour': 4,
        'minute': 11,
      }),
      throwsA(
        isA<PlatformException>().having(
          (error) => error.code,
          'code',
          'permission_denied',
        ),
      ),
    );
  });

  testWidgets(
    'native pending reminder replaces, follows local clock, and cancels',
    (tester) async {
      if (!Platform.isIOS) return;
      const channel = MethodChannel('mannlab.in_c/daily_notifications');
      var status = await channel.invokeMethod<String>('permissionStatus');
      if (const bool.fromEnvironment('IN_C_ISOLATED_NOTIFICATION_QA') &&
          status == 'not-determined') {
        expect(
          await channel.invokeMethod<bool>(
            'requestIsolatedQaProvisionalPermission',
          ),
          isTrue,
        );
        status = await channel.invokeMethod<String>('permissionStatus');
        debugPrint(
          'Isolated QA notification authorization: $status (not user consent evidence)',
        );
      }
      if (status != 'authorized' && status != 'provisional') {
        markTestSkipped(
          'Pending/delivery verification NOT_VERIFIED: authorize notifications on the simulator first ($status).',
        );
        return;
      }
      Future<List<Object?>> pending() async =>
          (await channel.invokeListMethod<Object?>('inspectPendingDailyPick'))!;
      final previous = await pending();
      try {
        for (final hour in [3, 4]) {
          await channel.invokeMethod<void>('scheduleDailyPick', {
            'title': 'in C integration fixture',
            'body': 'Scheduling verification, not a real Daily recommendation',
            'payload': '{"version":1,"route":"today"}',
            'hour': hour,
            'minute': 11,
          });
          final rows = await pending();
          expect(rows, hasLength(1));
          final request = Map<Object?, Object?>.from(rows.single as Map);
          expect(request['hour'], hour);
          expect(request['minute'], 11);
          expect(request['repeats'], isTrue);
          expect(request['hasFixedTimeZone'], isFalse);
          expect(request['payload'], '{"version":1,"route":"today"}');
        }
        await expectLater(
          channel.invokeMethod<void>('scheduleDailyPick', {
            'title': 'invalid fixture',
            'body': '',
            'payload': '',
            'hour': 24,
            'minute': 0,
          }),
          throwsA(isA<PlatformException>()),
        );
        expect(
          (Map<Object?, Object?>.from((await pending()).single as Map))['hour'],
          4,
        );
        await channel.invokeMethod<void>('cancelDailyPick');
        expect(await pending(), isEmpty);
      } finally {
        if (previous.isEmpty) {
          await channel.invokeMethod<void>('cancelDailyPick');
        } else {
          await channel.invokeMethod<void>(
            'scheduleDailyPick',
            previous.single,
          );
        }
      }
      // Pending requests do not prove permission, delivery, time-zone travel or taps.
    },
    skip: !const bool.fromEnvironment('IN_C_SIMULATOR_QA'),
  );

  testWidgets(
    'isolated native calendar request reaches the foreground delegate',
    (tester) async {
      if (!Platform.isIOS) return;
      const channel = MethodChannel('mannlab.in_c/daily_notifications');
      final status = await channel.invokeMethod<String>('permissionStatus');
      expect(['authorized', 'provisional'], contains(status));
      final now = DateTime.now();
      final due = DateTime(
        now.year,
        now.month,
        now.day,
        now.hour,
        now.minute + 1,
      );
      final payload =
          '{"version":1,"route":"today","qa":"${now.microsecondsSinceEpoch}"}';
      try {
        await channel.invokeMethod<void>('scheduleDailyPick', {
          'title': 'in C isolated delivery QA',
          'body':
              'Native calendar delivery evidence, not a user recommendation',
          'payload': payload,
          'hour': due.hour,
          'minute': due.minute,
        });
        final received = await tester.runAsync(() async {
          final deadline = due.add(const Duration(seconds: 20));
          while (DateTime.now().isBefore(deadline)) {
            final row = await channel.invokeMapMethod<String, Object?>(
              'inspectLastForegroundDailyPick',
            );
            if (row?['payload'] == payload) return row;
            await Future<void>.delayed(const Duration(seconds: 1));
          }
          return null;
        });
        expect(
          received,
          isNotNull,
          reason: 'A pending request alone is not delivery evidence.',
        );
        expect(
          received!['body'],
          'Native calendar delivery evidence, not a user recommendation',
        );
        expect(
          received['receivedAt'] as num,
          greaterThanOrEqualTo(now.millisecondsSinceEpoch / 1000),
        );
        debugPrint(
          'Actual foreground calendar delivery: $received; no background/banner/tap assertion.',
        );
      } finally {
        await channel.invokeMethod<void>('cancelDailyPick');
      }
    },
    skip: !const bool.fromEnvironment('IN_C_ISOLATED_NOTIFICATION_QA'),
  );

  testWidgets('native storage, daily guide, reaction and listening map', (
    tester,
  ) async {
    // Use isolated native storage; never clear a tester's actual listening history.
    final key = 'in_c_integration_${DateTime.now().microsecondsSinceEpoch}';
    final store = ClassicalDiscoveryStore(storageKey: key);
    final controller = ClassicalDiscoveryController(
      store: store,
      notificationGateway: const DisabledClassicalDailyNotificationGateway(),
    );
    await controller.load();
    await controller.addTasteIntakeInputs(['쇼팽 야상곡 9-2번', '드보르작 교향곡 9번']);
    await controller.skipOnboarding();
    final pick = controller.dailyPick();
    await tester.pumpWidget(ClassicalDiscoveryApp(controller: controller));
    await tester.pumpAndSettle();

    final directory = await getApplicationDocumentsDirectory();
    Future<void> capture(String name) async {
      final bytes = await binding.takeScreenshot(name);
      await File('${directory.path}/$name.png').writeAsBytes(bytes);
    }

    final guide = find.byKey(const ValueKey('daily-listening-step-preview'));
    expect(guide.hitTestable(), findsOneWidget);
    await capture('in-c-daily-pick');
    await tester.tap(guide);
    await tester.pumpAndSettle();
    await capture('in-c-listening-guide');
    expect(tester.takeException(), isNull);
    Navigator.of(tester.element(find.byType(BottomSheet))).pop();
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('좋음').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('좋음').first);
    await tester.pumpAndSettle();
    expect(controller.dailyPick().isCompleted, isTrue);
    await tester.ensureVisible(find.text('작품 보기').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('작품 보기').first);
    await tester.pumpAndSettle();
    expect(find.byType(ClassicalWorkDetailScreen), findsOneWidget);
    await capture('in-c-work-detail');
    await tester.ensureVisible(find.byTooltip('작품 저장').first);
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('작품 저장').first);
    await tester.pumpAndSettle();
    expect(controller.state.stateForWork(pick.workId).saved, isTrue);
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.tap(find.text('My Music').last);
    await tester.pumpAndSettle();
    await capture('in-c-listening-map');
    expect(tester.takeException(), isNull);
    await tester.tap(find.text('개인정보와 콘텐츠'));
    await tester.pumpAndSettle();
    expect(find.byType(ClassicalPrivacySheet), findsOneWidget);
    await capture('in-c-privacy');
    Navigator.of(tester.element(find.byType(BottomSheet))).pop();
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.text('추천에서 제외'));
    await tester.pumpAndSettle();
    expect(find.text('추천에서 제외').hitTestable(), findsOneWidget);
    await tester.tap(find.text('추천에서 제외'));
    await tester.pumpAndSettle();
    final excludedOpera = find.byKey(const ValueKey('exclude-operatic-vocals'));
    expect(excludedOpera.hitTestable(), findsOneWidget);
    await tester.tap(excludedOpera);
    await tester.pumpAndSettle();
    expect((await store.loadState()).excludeOperaticVocals, isTrue);
    await capture('in-c-opera-exclusion');
    await tester.tap(excludedOpera);
    await tester.pumpAndSettle();
    expect((await store.loadState()).excludeOperaticVocals, isFalse);
    await tester.enterText(find.byType(TextField), 'Mahler');
    await tester.pumpAndSettle();
    final excludedComposer = find.byKey(
      const ValueKey('exclude-composer-mahler'),
    );
    await tester.tap(excludedComposer);
    await tester.pumpAndSettle();
    expect((await store.loadState()).excludedComposerIds, contains('mahler'));
    await capture('in-c-composer-exclusions');
    await tester.tap(excludedComposer);
    await tester.pumpAndSettle();
    expect((await store.loadState()).excludedComposerIds, isEmpty);
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('음악 연결 확인'));
    await tester.pumpAndSettle();
    expect(find.text('음악 연결 확인').hitTestable(), findsOneWidget);
    await tester.tap(find.text('음악 연결 확인'));
    await tester.pumpAndSettle();
    await capture('in-c-taste-connections');
    final intakeId = controller.tasteIntakeItems.first.id;
    final rawInput = controller.tasteIntakeItems.first.rawInput;
    await tester.tap(find.byType(ListTile).first);
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), '비발디 봄');
    await tester.pumpAndSettle();
    await capture('in-c-taste-connection-editor');
    await tester.tap(find.byType(ListTile).first);
    await tester.pumpAndSettle();
    expect(controller.tasteIntakeItems.first.matchedWorkId, 'vivaldi-spring');
    await tester.tap(find.byType(ListTile).first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('연결 없이 원문만 남기기'));
    await tester.pumpAndSettle();
    expect(controller.tasteIntakeItems.first.rawInput, rawInput);
    expect(controller.tasteIntakeItems.first.matchOrigin, 'user_unlinked');
    expect(tester.takeException(), isNull);

    final restored = ClassicalDiscoveryController(
      store: ClassicalDiscoveryStore(storageKey: key),
      notificationGateway: const DisabledClassicalDailyNotificationGateway(),
    );
    await restored.load();
    expect(restored.tasteIntakeItems.first.id, intakeId);
    expect(restored.tasteIntakeItems.first.matchOrigin, 'user_unlinked');
    expect(restored.state.stateForWork(pick.workId).saved, isTrue);
    expect(restored.dailyPick().workId, pick.workId);
    expect(restored.state.reactions.first.type, 'liked');
    expect(restored.listeningMapProgress().userState.openedNodeIds, isNotEmpty);
    // This checks the real bridge, not permission grant, delivery, or notification taps.
    if (Platform.isIOS) {
      expect(
        await const MethodChannelClassicalDailyNotificationGateway()
            .currentPermissionStatus(),
        isNot('unsupported'),
      );
    }
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.tap(find.text('내 기록 관리'));
    await tester.pumpAndSettle();
    await capture('in-c-data-controls');
    await tester.tap(find.text('in C 기록 지우기'));
    await tester.pumpAndSettle();
    await capture('in-c-data-erase-confirmation');
    await tester.tap(find.text('기록 삭제'));
    await tester.pumpAndSettle();
    expect(controller.state.tasteIntakeItems, isEmpty);
    expect(controller.state.workStates, isEmpty);
    expect((await store.loadState()).workStates, isEmpty);
    final preferences = await SharedPreferences.getInstance();
    expect(preferences.containsKey('${key}_backup'), isFalse);
    await capture('in-c-data-erased');
    await tester.pumpWidget(const SizedBox.shrink());
    restored.dispose();
    controller.dispose();
  });
}
