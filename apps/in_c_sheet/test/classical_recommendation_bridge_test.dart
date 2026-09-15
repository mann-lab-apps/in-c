import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/classical_daily_notification.dart';
import 'package:in_c_sheet/classical_discovery_app.dart';
import 'package:in_c_sheet/classical_discovery_catalog.dart';
import 'package:in_c_sheet/classical_discovery_controller.dart';
import 'package:in_c_sheet/classical_discovery_models.dart';
import 'package:in_c_sheet/classical_discovery_store.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  for (final sparse in [true, false]) {
    testWidgets('intake next path does not repeat the first work: $sparse', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final controller = _controller(
        _MemoryStore(),
        sparse
            ? [
                _work('bach-air'),
                _work('chopin-raindrop-prelude'),
                _work('chopin-nocturne-op9-2'),
              ]
            : ClassicalDiscoveryCatalog.works,
      );
      await controller.load();
      const inputs = ['G선상의 아리아', '쇼팽 빗방울'];
      final preview = controller.previewTasteStart(inputs)!;
      final following = preview.nextThree
          .where((item) => item.work.id != preview.dailyStep.work.id)
          .toList();
      expect(following.isEmpty, sparse);
      await tester.pumpWidget(ClassicalDiscoveryApp(controller: controller));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('taste-intake-field')),
        inputs.join(', '),
      );
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pumpAndSettle();
      if (sparse) {
        expect(find.textContaining('다음 길:'), findsNothing);
      } else {
        expect(
          find.text(
            '다음 길: ${following.map((item) => item.work.titleKo).join(', ')}',
          ),
          findsOneWidget,
        );
      }
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      controller.dispose();
    });
  }

  for (final reverse in [false, true]) {
    test(
      'strongest known bridge takes precedence over surprise: $reverse',
      () async {
        final strings = _work('bach-air');
        final piano = _work('chopin-raindrop-prelude');
        final candidate = _work('chopin-nocturne-op9-2');
        expect(candidate.moodTags.any(strings.moodTags.contains), isTrue);
        expect(candidate.instrumentation, isNot(strings.instrumentation));
        expect(candidate.composerId, piano.composerId);
        expect(candidate.period, piano.period);
        expect(candidate.instrumentation, piano.instrumentation);
        final inputs = ['G선상의 아리아', '쇼팽 빗방울'];
        final source = _controller(_MemoryStore(), [strings, piano, candidate]);
        await source.load();
        final preview = source.previewTasteStart(
          reverse ? inputs.reversed : inputs,
        )!;
        expect(
          preview.items.map((item) => item.matchedWorkId),
          reverse ? [piano.id, strings.id] : [strings.id, piano.id],
        );
        final store = _MemoryStore()
          ..state = UserDiscoveryState.defaultState.copyWith(
            tasteIntakeItems: preview.items,
            dailyPicks: _history(3, completed: true),
          );
        final controller = _controller(store, [strings, piano, candidate]);
        await controller.load();
        final pick = await controller.ensureDailyPick();
        expect(pick.workId, candidate.id);
        expect(pick.pickType, 'close_step');
        expect(pick.sourceEvidence, contains('쇼팽 빗방울'));
        expect(preview.nextThree.single.reason, contains('쇼팽 빗방울'));
        expect(
          controller.nextThreeRecommendations().single.reason,
          contains('쇼팽 빗방울'),
        );
        controller.dispose();
        source.dispose();
      },
    );

    test(
      'Daily uses a grounded second taste regardless of input order: $reverse',
      () async {
        final opera = _work('bizet-carmen-habanera');
        final piano = _work('chopin-nocturne-op9-2');
        final candidate = _work('chopin-raindrop-prelude');
        expect(candidate.composerId, piano.composerId);
        expect(candidate.instrumentation, piano.instrumentation);
        expect(candidate.composerId, isNot(opera.composerId));
        expect(candidate.instrumentation, isNot(opera.instrumentation));
        expect(candidate.moodTags.any(opera.moodTags.contains), isFalse);
        final controller = _controller(_MemoryStore(), [
          opera,
          piano,
          candidate,
        ]);
        await controller.load();
        final inputs = ['카르멘 하바네라', '쇼팽 야상곡 9-2번'];
        final preview = controller.previewTasteStart(
          reverse ? inputs.reversed : inputs,
        )!;
        expect(preview.nextThree.map((item) => item.work.id), [candidate.id]);
        await controller.addTasteIntakeInputs(
          reverse ? inputs.reversed : inputs,
        );
        expect(
          controller.state.tasteIntakeItems.every(
            (item) => item.matchedWorkId != null,
          ),
          isTrue,
        );
        final pick = await controller.ensureDailyPick();
        expect(pick.workId, candidate.id);
        expect(pick.pickType, 'close_step');
        expect(pick.sourceEvidence, contains('쇼팽 야상곡 9-2번'));
        expect(pick.sourceEvidence, isNot(contains('카르멘')));
        expect(
          controller.nextThreeRecommendations().any(
            (item) => item.work.id == candidate.id && item.lane == 'immediate',
          ),
          isTrue,
        );
        expect(
          controller.nextThreeRecommendations().map((item) => item.work.id),
          [candidate.id],
        );
        controller.dispose();
      },
    );
  }

  test(
    'instrument-only preference supports proximity, not invented expansion',
    () async {
      final candidate = _work('mozart-piano-sonata-k545');
      final store = _MemoryStore()
        ..state = UserDiscoveryState.defaultState.copyWith(
          preferredInstruments: {candidate.instrumentation},
          dailyPicks: _history(4, completed: false),
        );
      final controller = _controller(store, [candidate]);
      await controller.load();
      final pick = await controller.ensureDailyPick();
      expect(pick.pickType, 'close_step');
      expect(pick.sourceEvidence, contains('선택한 피아노'));
      expect(controller.nextThreeRecommendations().single.lane, 'immediate');
      controller.dispose();
    },
  );

  test(
    'surprise cannot invent a bridge from a default listening axis',
    () async {
      final source = _controller(
        _MemoryStore(),
        ClassicalDiscoveryCatalog.works,
      );
      await source.load();
      final input = source.previewTasteStart(['푸치니'])!.items;
      expect(input.single.matchedWorkId, isNull);
      final candidate = _work('bach-air');
      expect(candidate.composerId, isNot(input.single.matchedComposerId));
      final store = _MemoryStore()
        ..state = UserDiscoveryState.defaultState.copyWith(
          tasteIntakeItems: input,
          dailyPicks: _history(3, completed: true),
        );
      final controller = _controller(store, [candidate]);
      await controller.load();
      expect(controller.state.reactions, isEmpty);
      expect(controller.tasteAxisScores(), isEmpty);
      final pick = await controller.ensureDailyPick();
      expect(pick.workId, candidate.id);
      expect(pick.pickType, 'open_start');
      expect(pick.reason, contains('연결할 근거가 부족'));
      expect(controller.nextThreeRecommendations().single.lane, 'open_start');
      controller.dispose();
      source.dispose();
    },
  );

  test('a known favorite is not a newly discovered work when the pool is exhausted', () async {
    final work = _work('chopin-nocturne-op9-2');
    final store = _MemoryStore();
    final controller = _controller(store, [work]);
    await controller.load();
    await controller.addTasteIntakeInputs(['쇼팽 야상곡 9-2번']);
    expect(controller.nextThreeRecommendations(), isEmpty);
    final pick = await controller.ensureDailyPick();
    expect(pick.workId, work.id);
    expect(pick.pickType, 'revisit');
    expect(pick.reason, contains('새로 이어갈 작품이 없어'));
    expect(pick.reason, isNot(contains('저장해둔')));
    expect(pick.sourceEvidence, isNot(contains('다른 작품')));
    expect(controller.state.stateForWork(work.id).saved, isFalse);
    final reopened = _controller(store, [work]);
    await reopened.load();
    expect((await reopened.ensureDailyPick()).toJson(), pick.toJson());
    reopened.dispose();
    controller.dispose();
  });

  test(
    'surprise names its shared mood and actual change of instrumentation',
    () async {
      final anchor = _work('chopin-nocturne-op9-2');
      final candidate = _work('bach-air');
      expect(candidate.moodTags.any(anchor.moodTags.contains), isTrue);
      expect(candidate.instrumentation, isNot(anchor.instrumentation));
      expect(candidate.period, isNot(anchor.period));
      final source = _controller(_MemoryStore(), [anchor, candidate]);
      await source.load();
      const input = '쇼팽 야상곡 9-2번';
      final store = _MemoryStore()
        ..state = UserDiscoveryState.defaultState.copyWith(
          tasteIntakeItems: source.previewTasteStart([input])!.items,
          dailyPicks: _history(3, completed: true),
        );
      final controller = _controller(store, [anchor, candidate]);
      await controller.load();
      final pick = await controller.ensureDailyPick();
      expect(pick.workId, candidate.id);
      expect(pick.pickType, 'surprise');
      expect(pick.sourceEvidence, contains(input));
      expect(
        candidate.moodTags
            .where(anchor.moodTags.contains)
            .any(pick.sourceEvidence.contains),
        isTrue,
      );
      expect(pick.sourceEvidence, contains(candidate.instrumentation));
      expect(pick.listenFor, candidate.primaryMoment!.prompt);
      controller.dispose();
      source.dispose();
    },
  );
}

ClassicalWork _work(String id) =>
    ClassicalDiscoveryCatalog.works.firstWhere((work) => work.id == id);

List<DailyPick> _history(int count, {required bool completed}) => [
  for (var offset = count; offset > 0; offset--)
    DailyPick(
      id: 'fixture-$offset',
      date: DateTime(2026, 9, 15 - offset),
      workId: 'puccini-nessun-dorma',
      momentId: 'fixture-moment',
      pickType: 'open_start',
      reason: 'Simulated history, not human approval',
      listenFor: '',
      whyNow: '',
      sourceEvidence: '',
      distanceLabel: '',
      createdAt: DateTime(2026, 9, 15 - offset),
      completedAt: completed ? DateTime(2026, 9, 15 - offset, 10) : null,
      completionConfirmed: completed,
    ),
];

ClassicalDiscoveryController _controller(
  _MemoryStore store,
  List<ClassicalWork> works,
) => ClassicalDiscoveryController(
  store: store,
  works: works,
  clock: () => DateTime(2026, 9, 15, 9),
  notificationGateway: const DisabledClassicalDailyNotificationGateway(),
);

class _MemoryStore extends ClassicalDiscoveryStore {
  UserDiscoveryState state = UserDiscoveryState.defaultState;
  @override
  Future<UserDiscoveryState> loadState() async => state;
  @override
  Future<void> saveState(UserDiscoveryState value) async => state = value;
}
