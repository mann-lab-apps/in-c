import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:in_c_sheet/classical_daily_notification.dart';
import 'package:in_c_sheet/classical_discovery_controller.dart';
import 'package:in_c_sheet/classical_discovery_screen.dart';
import 'package:in_c_sheet/classical_discovery_store.dart';
import 'package:in_c_sheet/classical_discovery_catalog.dart';
import 'package:in_c_sheet/classical_discovery_models.dart';
import 'package:in_c_sheet/classical_link_launcher.dart';

void main() {
  const channel = MethodChannel('plugins.flutter.io/url_launcher');
  final calls = <Map<Object?, Object?>>[];

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    calls.clear();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
          if (call.method != 'launch') return true;
          final arguments = Map<Object?, Object?>.from(call.arguments as Map);
          calls.add(arguments);
          return (arguments['url'] as String).contains('youtube.com');
        });
  });
  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  });

  testWidgets(
    'failed preferred search reaches another safe provider without completing listening',
    (tester) async {
      final controller = ClassicalDiscoveryController(
        store: ClassicalDiscoveryStore(),
        notificationGateway: const DisabledClassicalDailyNotificationGateway(),
      );
      addTearDown(controller.dispose);
      await controller.load();
      await controller.setPreferredPlatform('apple-music');
      final work = controller.works.first;
      await tester.pumpWidget(
        MaterialApp(
          home: ClassicalWorkDetailScreen(controller: controller, work: work),
        ),
      );
      final button = find.text('Apple Music에서 검색').first;
      await tester.ensureVisible(button);
      await tester.tap(button);
      await tester.pumpAndSettle();
      expect(
        calls.any((call) => (call['url'] as String).contains('youtube.com')),
        isTrue,
      );
      final clicks = controller.state.events
          .where((event) => event.eventType == 'external_platform_click')
          .toList();
      expect(clicks, hasLength(2));
      expect(
        clicks
            .singleWhere((event) => event.context == 'youtube')
            .properties['fallback'],
        'true',
      );
      expect(controller.state.stateForWork(work.id).lastListenedAt, isNull);
      expect(find.text('링크를 열지 못했습니다.'), findsNothing);
    },
  );

  testWidgets(
    'direct failure prefers same-provider search and records each destination once',
    (tester) async {
      final work = ClassicalDiscoveryCatalog.works.first;
      const direct = ExternalLink(
        id: 'fixture-direct',
        platformId: 'spotify',
        label: 'fixture',
        url: 'spotify:track:fixture',
        linkType: 'listen_direct',
      );
      final attempts = <(String, bool)>[];
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (call) async {
            if (call.method != 'launch') return true;
            final args = Map<Object?, Object?>.from(call.arguments as Map);
            calls.add(args);
            return (args['url'] as String).startsWith('https://');
          });
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => TextButton(
                onPressed: () => launchClassicalWorkLink(
                  context,
                  work,
                  direct,
                  onAttempt: (link, fallback) async =>
                      attempts.add((link.platformId, fallback)),
                ),
                child: const Text('open'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();
      expect(attempts, [('spotify', false), ('spotify', true)]);
      expect(calls, hasLength(2));
      expect(calls.first['useWebView'], isFalse);
      expect(calls.last['useWebView'], isTrue);
      expect(find.text('음악 서비스를 열지 못했어요.'), findsNothing);
    },
  );

  testWidgets(
    'all launch failures are bounded and offer the actual movement search text',
    (tester) async {
      final work = ClassicalDiscoveryCatalog.works.first;
      final selected = work.externalLinks.firstWhere(
        (link) => link.platformId == 'apple-music',
      );
      final attempts = <String>[];
      String? copied;
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (call) async {
            if (call.method == 'launch') {
              calls.add(Map<Object?, Object?>.from(call.arguments as Map));
            }
            throw PlatformException(code: 'unavailable');
          });
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(SystemChannels.platform, (call) async {
            if (call.method == 'Clipboard.setData') {
              copied = (call.arguments as Map)['text'] as String;
            }
            return null;
          });
      addTearDown(
        () => TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
            .setMockMethodCallHandler(SystemChannels.platform, null),
      );
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => TextButton(
                onPressed: () => launchClassicalWorkLink(
                  context,
                  work,
                  selected,
                  onAttempt: (link, fallback) async => attempts.add(link.url),
                ),
                child: const Text('open'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();
      expect(attempts, hasLength(2));
      expect(
        calls,
        hasLength(4),
      ); // web view and external fallback per destination
      expect(find.text('음악 서비스를 열지 못했어요.'), findsOneWidget);
      await tester.tap(find.text('검색어 복사'));
      await tester.pumpAndSettle();
      expect(copied, contains(work.titleOriginal));
      expect(copied, contains(work.catalogNumber));
    },
  );

  testWidgets(
    'pending local event persistence does not hold up external listening',
    (tester) async {
      final persistence = Completer<void>();
      final work = ClassicalDiscoveryCatalog.works.first;
      final selected = work.externalLinks.firstWhere(
        (link) => link.platformId == 'youtube',
      );
      var attempts = 0;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => TextButton(
                onPressed: () => launchClassicalWorkLink(
                  context,
                  work,
                  selected,
                  onAttempt: (link, fallback) {
                    attempts += 1;
                    return persistence.future;
                  },
                ),
                child: const Text('open'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();
      final launchedBeforeSave = calls.length;
      persistence.complete();
      await tester.pumpAndSettle();
      expect(launchedBeforeSave, 1);
      expect(attempts, 1);
      expect(calls, hasLength(1));
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'event sink failure does not block listening or invent a fallback',
    (tester) async {
      final work = ClassicalDiscoveryCatalog.works.first;
      final selected = work.externalLinks.firstWhere(
        (link) => link.platformId == 'youtube',
      );
      var attempts = 0;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => TextButton(
                onPressed: () => launchClassicalWorkLink(
                  context,
                  work,
                  selected,
                  onAttempt: (link, fallback) async {
                    attempts += 1;
                    throw StateError('fixture event sink failure');
                  },
                ),
                child: const Text('open'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();
      expect(calls, hasLength(1));
      expect(attempts, 1);
      expect(find.text('음악 서비스를 열지 못했어요.'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'work detail opens while disk is pending and retries the retained click after failure',
    (tester) async {
      final store = _DelayedStore();
      final controller = ClassicalDiscoveryController(
        store: store,
        notificationGateway: const DisabledClassicalDailyNotificationGateway(),
      );
      addTearDown(controller.dispose);
      await controller.load();
      final work = controller.works.first;
      await tester.pumpWidget(
        MaterialApp(
          home: ClassicalWorkDetailScreen(controller: controller, work: work),
        ),
      );
      await tester.pumpAndSettle();
      final button = find.text('YouTube에서 검색').first;
      await tester.ensureVisible(button);
      final pending = Completer<void>();
      store.pending = pending;
      await tester.tap(button);
      await tester.pumpAndSettle();
      final launchedBeforeDisk = calls.length;
      final clicksBeforeDisk = controller.state.events
          .where((event) => event.eventType == 'external_platform_click')
          .toList();
      pending.completeError(StateError('fixture disk unavailable'));
      await tester.pumpAndSettle();
      expect(launchedBeforeDisk, 1);
      expect(clicksBeforeDisk, hasLength(1));
      expect(controller.persistenceMessage, contains('저장하지 못했습니다'));
      store.pending = null;
      await controller.retryPersistence();
      expect(
        store.state.events
            .where((event) => event.eventType == 'external_platform_click')
            .single
            .id,
        clicksBeforeDisk.single.id,
      );
      expect(controller.state.stateForWork(work.id).lastListenedAt, isNull);
      expect(calls, hasLength(1));
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'late failure after leaving screen cannot open another destination',
    (tester) async {
      final result = Completer<bool>();
      final work = ClassicalDiscoveryCatalog.works.first;
      final selected = work.externalLinks.firstWhere(
        (link) => link.platformId == 'apple-music',
      );
      final attempts = <String>[];
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (call) async {
            calls.add(Map<Object?, Object?>.from(call.arguments as Map));
            return result.future;
          });
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => TextButton(
                onPressed: () => launchClassicalWorkLink(
                  context,
                  work,
                  selected,
                  onAttempt: (link, fallback) async => attempts.add(link.url),
                ),
                child: const Text('open'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('open'));
      await tester.pump();
      await tester.pumpWidget(const SizedBox());
      result.complete(false);
      await tester.pumpAndSettle();
      expect(calls, hasLength(1));
      expect(attempts, [selected.url]);
      expect(tester.takeException(), isNull);
    },
  );
}

class _DelayedStore extends ClassicalDiscoveryStore {
  UserDiscoveryState state = UserDiscoveryState.defaultState;
  Completer<void>? pending;

  @override
  Future<UserDiscoveryState> loadState() async => state;

  @override
  Future<void> saveState(UserDiscoveryState next) async {
    await pending?.future;
    state = next;
  }
}
