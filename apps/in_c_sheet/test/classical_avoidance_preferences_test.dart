import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:in_c_sheet/classical_admin_commands.dart';
import 'package:in_c_sheet/classical_discovery_app.dart';
import 'package:in_c_sheet/classical_discovery_data_source.dart';
import 'package:in_c_sheet/classical_discovery_repository.dart';
import 'package:in_c_sheet/classical_discovery_screen.dart';
import 'package:in_c_sheet/classical_daily_notification.dart';
import 'package:in_c_sheet/classical_discovery_catalog.dart';
import 'package:in_c_sheet/classical_discovery_controller.dart';
import 'package:in_c_sheet/classical_discovery_models.dart';
import 'package:in_c_sheet/classical_discovery_store.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('legacy unknown-title proximity claim is withdrawn without replacing the pick', () async {
    final store = _MemoryStore();
    final original = _controller(store);
    await original.load();
    await original.addTasteIntakeInputs(['Lost Stars']);
    final pin = await original.ensureDailyPick();
    expect(pin.pickType, 'open_start');
    expect(pin.sourceEvidence, contains('아직 곡을 연결하지 못해'));
    await original.toggleSaveWork(pin.workId);
    final legacy = pin.copyWith(
      pickType: 'close_step',
      distanceLabel: '아주 가까움',
      reason: '익숙한 감각에서 이어봅니다.',
    );
    store.state = store.state.copyWith(dailyPicks: [legacy]);
    final stale = store.state;
    final records = jsonEncode(stale.toJson()['workStates']);
    original.dispose();
    final reopened = _controller(store);
    await reopened.load();
    final shown = reopened.dailyPick();
    expect(shown.distanceLabel, '이전에 고른 작품');
    expect(shown.reason, contains('다시 확인'));
    expect(shown.workId, pin.workId);
    expect(shown.momentId, pin.momentId);
    expect(shown.createdAt, pin.createdAt);
    expect(shown.catalogRevision, pin.catalogRevision);
    await reopened.ensureDailyPick();
    expect(jsonEncode(store.state.toJson()['workStates']), records);
    expect(store.state.tasteIntakeItems.single.rawInput, 'Lost Stars');
    const merger = DiscoveryStateMerger();
    for (final merged in [
      merger.merge(stale, store.state),
      merger.merge(store.state, stale),
    ]) {
      final mergedStore = _MemoryStore()
        ..state = UserDiscoveryState.fromJson(merged.toJson());
      final reloaded = _controller(mergedStore);
      await reloaded.load();
      expect(reloaded.dailyPick().distanceLabel, '이전에 고른 작품');
      expect(reloaded.dailyPickHistory.single.distanceLabel, '이전에 고른 작품');
      reloaded.dispose();
    }
    reopened.dispose();
  });

  test(
    'Satie opening guide follows the score without approving a recording',
    () {
      final work = ClassicalDiscoveryCatalog.works.firstWhere(
        (work) => work.id == 'satie-gymnopedie-1',
      );
      expect(work.primaryMoment!.prompt, contains('낮은 음과 화음이 번갈아'));
      expect(work.primaryMoment!.prompt, contains('그 위로 들어오는 선율'));
      expect(
        work.externalLinks.where(
          (link) => link.linkType == 'listen_preview_approved',
        ),
        isEmpty,
      );
    },
  );

  for (final input in [
    'Lost Stars',
    'Ghost',
    'Interstellar OST',
    '나의 기록',
    '색연필',
  ]) {
    test('unknown title does not manufacture a musical axis: $input', () async {
      final store = _MemoryStore();
      final controller = _controller(store);
      await controller.load();
      final preview = controller.previewTasteStart([input])!;
      expect(preview.items.single.sourceType, 'free_text');
      expect(
        preview.nextThree.map((item) => item.lane),
        everyElement('open_start'),
      );
      expect(preview.translation.isSoftLanding, isTrue);
      await controller.addTasteIntakeInputs([input]);
      expect(controller.tasteAxisScores(), isEmpty);
      expect(
        controller.listeningMapProgress().userState.openedNodeIds,
        isEmpty,
      );
      expect(
        controller.nextThreeRecommendations().map((item) => item.lane),
        everyElement('open_start'),
      );
      expect(controller.state.tasteIntakeItems.single.rawInput, input);
      final reopened = _controller(store);
      await reopened.load();
      expect(reopened.tasteAxisScores(), isEmpty);
      expect(reopened.listeningMapProgress().userState.openedNodeIds, isEmpty);
      reopened.dispose();
      controller.dispose();
    });
  }

  for (final input in [
    '영화음악',
    '선율',
    '피아노',
    '리듬',
    'OST',
    '밤의 피아노',
    '현악 소리',
    '라흐마니노프 선율',
  ]) {
    test(
      'explicit listening descriptor still supplies an axis: $input',
      () async {
        final controller = _controller(_MemoryStore());
        await controller.load();
        await controller.addTasteIntakeInputs([input]);
        expect(controller.tasteAxisScores(), isNotEmpty);
        expect(
          controller.nextThreeRecommendations().first.reason,
          contains(input),
        );
        controller.dispose();
      },
    );
  }

  test('taste translation preserves the original symphony input', () async {
    final controller = _controller(_MemoryStore());
    await controller.load();
    const input = '드보르작 - 교향곡 9번';
    final preview = controller.previewTasteStart([input])!;
    expect(preview.translation.sourceLabel, input);
    expect(preview.translation.startingPoint, contains(input));
    expect(preview.translation.startingPoint, isNot(contains('2악장')));
    await controller.addTasteIntakeInputs([input]);
    final translation = controller.currentTasteTranslation()!;
    expect(translation.sourceLabel, input);
    expect(translation.startingPoint, isNot(contains('2악장')));
    controller.dispose();
  });

  test('unrelated taste reward does not promise a familiar melody', () async {
    final candidate = ClassicalDiscoveryCatalog.works.firstWhere(
      (work) => work.id == 'mozart-piano-sonata-k545',
    );
    final controller = _controller(_MemoryStore(), works: [candidate]);
    await controller.load();
    for (final input in ['푸치니', 'unknown music 123']) {
      final preview = controller.previewTasteStart([input])!;
      expect(preview.nextThree.single.lane, 'open_start');
      expect(preview.translation.isSoftLanding, isTrue);
      expect(preview.translation.startingPoint, contains('연결'));
      expect(preview.translation.startingPoint, isNot(contains('먼저 맞습니다')));
      expect(preview.translation.familiarFeeling, isNot(contains('익숙한 건')));
      expect(preview.translation.listenFor, candidate.primaryMoment!.prompt);
    }
    controller.dispose();
  });

  test(
    'stored taste translation is absent when the catalog has no candidate',
    () async {
      final store = _MemoryStore();
      final source = _controller(store);
      await source.load();
      await source.addTasteIntakeInputs(['바흐 푸가']);
      final original = UserDiscoveryState.encode(store.state);
      source.dispose();
      final controller = _controller(store, works: []);
      await controller.load();
      expect(controller.currentTasteTranslation(), isNull);
      expect(UserDiscoveryState.encode(controller.state), original);
      controller.dispose();
    },
  );

  test('stored taste reward never falls back to an excluded anchor', () async {
    final source = _controller(_MemoryStore());
    final anchor = source.workById('chopin-nocturne-op9-2')!;
    final candidate = source.workById('mozart-piano-sonata-k545')!;
    final store = _MemoryStore();
    final controller = _controller(store, works: [anchor, candidate]);
    await controller.load();
    await controller.addTasteIntakeInputs(['쇼팽 야상곡 9-2번']);
    await controller.setComposerExcluded(anchor.composerId, true);
    await controller.addReaction(candidate.id, 'liked');
    expect(controller.nextThreeRecommendations(), isEmpty);
    expect(
      controller.currentTasteTranslation()!.listenFor,
      candidate.primaryMoment!.prompt,
    );
    final reopened = _controller(store, works: [anchor, candidate]);
    await reopened.load();
    expect(
      reopened.currentTasteTranslation()!.listenFor,
      candidate.primaryMoment!.prompt,
    );
    reopened.dispose();
    controller.dispose();
    source.dispose();
  });

  testWidgets(
    'onboarding reward keeps raw input at small width and large text',
    (tester) async {
      tester.view.physicalSize = const Size(320, 740);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final controller = _controller(_MemoryStore());
      await controller.load();
      await tester.pumpWidget(
        MaterialApp(
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context)
                .copyWith(textScaler: const TextScaler.linear(1.6)),
            child: child!,
          ),
          home: ClassicalDiscoveryAppShell(controller: controller),
        ),
      );
      await tester.pumpAndSettle();
      const input = '드보르작 - 교향곡 9번';
      await tester.enterText(
        find.byKey(const ValueKey('taste-intake-field')),
        input,
      );
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('내 감상 시작점'),
        180,
        scrollable: find.byType(Scrollable).last,
      );
      expect(find.textContaining('남겨주신 "$input"'), findsWidgets);
      expect(find.widgetWithText(Chip, input), findsOneWidget);
      expect(find.widgetWithText(Chip, '신세계 교향곡 2악장'), findsNothing);
      expect(controller.state.tasteIntakeItems, isEmpty);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      controller.dispose();
    },
  );

  test(
    'next three preserve broad input instead of substituting an excerpt title',
    () async {
      final source = _controller(_MemoryStore());
      final anchor = source.workById('dvorak-new-world')!;
      final candidate = source.workById('beethoven-symphony-5')!;
      final controller = _controller(
        _MemoryStore(),
        works: [anchor, candidate],
      );
      await controller.load();
      const input = '드보르작 - 교향곡 9번';
      final preview = controller.previewTasteStart([input])!;
      expect(preview.items.single.matchedWorkId, anchor.id);
      expect(preview.nextThree.single.reason, contains(input));
      await controller.addTasteIntakeInputs([input]);
      final recommendation = controller.nextThreeRecommendations().single;
      expect(recommendation.reason, contains(input));
      expect(recommendation.reason, isNot(contains('2악장')));
      controller.dispose();
      source.dispose();
    },
  );

  test(
    'Chopin opening guide uses score evidence rather than assumed rubato',
    () {
      final work = ClassicalDiscoveryCatalog.works.firstWhere(
        (work) => work.id == 'chopin-nocturne-op9-2',
      );
      expect(work.primaryMoment!.prompt, contains('왼손의 반복되는 반주'));
      expect(work.primaryMoment!.prompt, contains('오른손 선율'));
      expect(work.primaryMoment!.prompt, isNot(contains('늦춰지고')));
      expect(
        work.externalLinks.where(
          (link) => link.linkType == 'listen_preview_approved',
        ),
        isEmpty,
      );
    },
  );

  testWidgets('new-start recommendation is readable on a small work detail', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 740);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final source = _controller(_MemoryStore());
    final candidate = source.workById('mozart-piano-sonata-k545')!;
    final anchor = source.workById('bizet-carmen-habanera')!;
    expect(candidate.composerId, isNot(anchor.composerId));
    expect(candidate.instrumentation, isNot(anchor.instrumentation));
    expect(candidate.moodTags.any(anchor.moodTags.contains), isFalse);
    final controller = _controller(_MemoryStore(), works: [candidate]);
    await controller.load();
    await controller.addTasteIntakeInputs(['unknown music 123']);
    await tester.pumpWidget(
      MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: const TextScaler.linear(1.4)),
          child: child!,
        ),
        home: ClassicalWorkDetailScreen(controller: controller, work: anchor),
      ),
    );
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.byTooltip('새로 열어보기'),
      240,
      scrollable: find.byType(Scrollable).first,
      maxScrolls: 30,
    );
    expect(find.byTooltip('새로 열어보기'), findsOneWidget);
    expect(find.byTooltip('취향에서 이어보기'), findsNothing);
    expect(find.byTooltip('한 걸음 넓혀보기'), findsNothing);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
    controller.dispose();
    source.dispose();
  });

  test(
    'next three explain the displayed anchor instead of stored taste',
    () async {
      final source = _controller(_MemoryStore());
      final candidate = source.workById('mozart-piano-sonata-k545')!;
      final anchor = source.workById('mozart-eine-kleine')!;
      final controller = _controller(_MemoryStore(), works: [candidate]);
      await controller.load();
      await controller.addTasteIntakeInputs(['푸치니']);
      final recommendation = controller
          .nextThreeRecommendations(anchor: anchor)
          .single;
      expect(recommendation.lane, 'immediate');
      expect(recommendation.reason, contains(anchor.titleKo));
      expect(recommendation.reason, contains(candidate.composerNameKo));
      expect(recommendation.reason, contains(candidate.instrumentation));
      expect(recommendation.reason, isNot(contains('푸치니')));
      expect(recommendation.sourceEvidence, recommendation.reason);
      expect(
        controller.listeningMapRoleForWork(anchor).nextPath.single.reason,
        recommendation.reason,
      );
      controller.dispose();
      source.dispose();
    },
  );

  test('unmatched next three fallback slots are all new starts', () async {
    final controller = _controller(_MemoryStore());
    await controller.load();
    final preview = controller.previewTasteStart(['unknown music 123'])!;
    expect(preview.nextThree, hasLength(3));
    expect(
      preview.nextThree.map((item) => item.lane),
      everyElement('open_start'),
    );
    await controller.addTasteIntakeInputs(['unknown music 123']);
    final picks = controller.nextThreeRecommendations();
    expect(picks, hasLength(3));
    expect(picks.map((item) => item.lane), everyElement('open_start'));
    expect(picks.map((item) => item.work.id).toSet(), hasLength(3));
    controller.dispose();
  });

  test(
    'next three do not call unrelated candidates a taste expansion',
    () async {
      final candidate = ClassicalDiscoveryCatalog.works.firstWhere(
        (work) => work.id == 'mozart-piano-sonata-k545',
      );
      for (final input in ['푸치니', 'unknown music 123']) {
        final controller = _controller(_MemoryStore(), works: [candidate]);
        await controller.load();
        final preview = controller.previewTasteStart([input])!;
        expect(preview.nextThree.single.lane, 'open_start', reason: input);
        expect(preview.nextThree.single.reason, contains('연결할 근거가 부족'));
        expect(preview.dailyStep.reason, preview.nextThree.single.reason);
        await controller.addTasteIntakeInputs([input]);
        final recommendation = controller.nextThreeRecommendations().single;
        expect(recommendation.lane, 'open_start', reason: input);
        expect(recommendation.reason, contains('연결할 근거가 부족'));
        expect(recommendation.sourceEvidence, recommendation.reason);
        controller.dispose();
      }
    },
  );

  test(
    'intake preview explains the draft rather than the saved taste',
    () async {
      final controller = _controller(_MemoryStore());
      await controller.load();
      await controller.addTasteIntakeInputs(['쇼팽 야상곡 Op.9 No.2']);
      final before = UserDiscoveryState.encode(controller.state);
      final preview = controller.previewTasteStart(['바흐 푸가'])!;
      expect(preview.nextThree.first.work.id, 'bach-little-fugue-bwv578');
      expect(preview.nextThree.first.reason, contains('바흐 푸가'));
      expect(preview.nextThree.first.reason, isNot(contains('쇼팽')));
      expect(UserDiscoveryState.encode(controller.state), before);
      controller.dispose();
    },
  );

  test('next three do not present the favorite anchor as a new work', () async {
    final work = ClassicalDiscoveryCatalog.works.firstWhere(
      (work) => work.id == 'chopin-nocturne-op9-2',
    );
    final controller = _controller(_MemoryStore(), works: [work]);
    await controller.load();
    await controller.addTasteIntakeInputs(['쇼팽 야상곡 9-2번']);
    expect(controller.tasteIntakeItems.single.matchedWorkId, work.id);
    final picks = controller.nextThreeRecommendations();
    expect(picks, isEmpty);
    controller.dispose();
  });

  for (final sparse in [false, true]) {
    test('intake preview deduplicates candidates: $sparse', () {
      final works = sparse
          ? ClassicalDiscoveryCatalog.works
                .where((w) => w.id == 'mozart-piano-sonata-k545')
                .toList()
          : null;
      final controller = _controller(_MemoryStore(), works: works);
      final before = UserDiscoveryState.encode(controller.state);
      final preview = controller.previewTasteStart(['피아노'])!;
      final ids = preview.nextThree.map((r) => r.work.id).toList();
      for (final item in preview.nextThree) {
        expect(
          item.reason.split(item.work.primaryMoment!.prompt),
          hasLength(2),
        );
      }
      expect(ids.toSet(), hasLength(ids.length));
      expect(ids, hasLength(sparse ? 1 : 3));
      expect(UserDiscoveryState.encode(controller.state), before);
      controller.dispose();
    });
  }

  test(
    'day five cannot claim gentle expansion without a known bridge',
    () async {
      final source = _controller(_MemoryStore());
      final candidate = source.workById('mozart-piano-sonata-k545')!;
      final history = source.workById('puccini-nessun-dorma')!;
      final store = _MemoryStore()
        ..state = UserDiscoveryState.defaultState.copyWith(
          tasteIntakeItems: source.previewTasteStart(['푸치니'])!.items,
          dailyPicks: [
            for (var day = 10; day < 14; day++)
              DailyPick(
                id: 'daily-pick-2026-09-$day',
                date: DateTime(2026, 9, day),
                workId: history.id,
                momentId: history.primaryMoment!.id,
                pickType: 'open_start',
                reason: 'Uncompleted fixture, not listening evidence',
                listenFor: '',
                whyNow: '',
                sourceEvidence: '',
                distanceLabel: '',
                createdAt: DateTime(2026, 9, day),
              ),
          ],
        );
      final controller = _controller(store, works: [candidate]);
      await controller.load();
      final pick = await controller.ensureDailyPick();
      expect(pick.workId, candidate.id);
      expect(pick.pickType, 'open_start');
      expect(pick.reason, contains('연결할 근거가 부족'));
      expect(controller.state.reactions, isEmpty);
      expect(controller.state.dailyPicks.where((p) => p.isCompleted), isEmpty);
      final reopened = _controller(store, works: [candidate]);
      await reopened.load();
      expect((await reopened.ensureDailyPick()).toJson(), pick.toJson());
      reopened.dispose();

      final connectedStore = _MemoryStore()
        ..state = store.state.copyWith(
          preferredInstruments: {candidate.instrumentation},
          dailyPicks: store.state.dailyPicks
              .where((p) => p.date.day < 14)
              .toList(),
        );
      final connected = _controller(connectedStore, works: [candidate]);
      await connected.load();
      final connectedPick = await connected.ensureDailyPick();
      // Instrument preference supplies a bridge, not evidence of a changed dimension.
      expect(connectedPick.pickType, 'close_step');
      expect(connectedPick.sourceEvidence, contains('선택한 피아노'));
      expect(connectedPick.sourceEvidence, isNot(contains('곡을 연결하지 못해')));
      connected.dispose();
      controller.dispose();
      source.dispose();
    },
  );

  test(
    'composer-only and unknown input cannot make unrelated music a close step',
    () async {
      final source = _controller(_MemoryStore());
      final unrelated = source.workById('mozart-piano-sonata-k545')!;
      for (final input in ['푸치니', 'unknown music 123']) {
        final controller = _controller(_MemoryStore(), works: [unrelated]);
        await controller.load();
        await controller.addTasteIntakeInputs([input]);
        final pick = await controller.ensureDailyPick();
        expect(pick.workId, unrelated.id);
        expect(pick.pickType, 'open_start', reason: input);
        expect(pick.distanceLabel, '새로 열어보기');
        expect(pick.reason, contains('연결할 근거가 부족'));
        controller.dispose();
      }
      source.dispose();
    },
  );

  test(
    'composer-only preference has a close bridge to the actual composer',
    () async {
      final source = _controller(_MemoryStore());
      final opera = source.workById('puccini-nessun-dorma')!;
      final controller = _controller(_MemoryStore(), works: [opera]);
      await controller.load();
      await controller.addTasteIntakeInputs(['푸치니']);
      final pick = await controller.ensureDailyPick();
      expect(pick.workId, opera.id);
      expect(pick.pickType, 'close_step');
      expect(pick.sourceEvidence, contains('작곡가를 이어봅니다'));
      controller.dispose();
      source.dispose();
    },
  );

  testWidgets(
    'listening point shows exercise duration rather than unverified end offset',
    (tester) async {
      final controller = _controller(_MemoryStore());
      await controller.load();
      final work = controller
          .workById('bach-little-fugue-bwv578')!
          .copyWith(
            listeningMoments: const [
              ListeningMoment(
                id: 'offset-fixture',
                label: '짧게 들어보기',
                startSeconds: 45,
                endSeconds: 75,
                prompt: '처음 선율을 따라가 보세요.',
                tags: [],
              ),
            ],
          );
      await tester.pumpWidget(
        MaterialApp(
          home: ClassicalWorkDetailScreen(controller: controller, work: work),
        ),
      );
      await tester.pumpAndSettle();
      final duration = find.text('30초 감상 · 처음 선율을 따라가 보세요.');
      await tester.scrollUntilVisible(
        find.text('짧게 들어보기'),
        400,
        scrollable: find.byType(Scrollable).first,
      );
      expect(duration, findsOneWidget);
      expect(find.text('1분 15초 · 처음 선율을 따라가 보세요.'), findsNothing);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      controller.dispose();
    },
  );

  test('general Bach fugue input can discover a real fugue without claiming an exact favorite', () async {
    final store = _MemoryStore();
    final controller = _controller(store);
    await controller.load();
    await controller.setOperaticVocalsExcluded(true);
    await controller.addTasteIntakeInputs(['바흐 푸가']);
    expect(controller.tasteIntakeItems.single.matchedWorkId, isNull);
    expect(controller.tasteIntakeItems.single.matchedComposerId, 'bach');
    final fugue = controller.workById('bach-little-fugue-bwv578');
    expect(
      fugue,
      isNotNull,
      reason: 'Bach Air is not evidence of supporting fugue discovery',
    );
    expect(fugue!.catalogNumber, 'BWV 578');
    expect(fugue.instrumentation, '오르간');
    expect(fugue.isOperaticVocal, isFalse);
    expect(fugue.externalLinks.every((link) => link.isSafeSearch), isTrue);
    expect(fugue.catalogStatusTags, isNot(contains('first_30')));
    expect(
      controller.nextThreeRecommendations().map((r) => r.work.id),
      contains(fugue.id),
    );
    final pick = await controller.ensureDailyPick();
    expect(pick.workId, fugue.id);
    expect(pick.sourceEvidence, contains('바흐 푸가'));
    expect(pick.sourceEvidence, isNot(contains('아직 곡을 연결하지 못해')));
    expect(pick.sourceEvidence, isNot(contains('좋아한다고')));
    expect(controller.searchWorks('BWV 578').first.id, fugue.id);
    final exact = controller.previewTasteStart(['바흐 BWV 578'])!;
    expect(exact.items.single.matchedWorkId, fugue.id);
    final different = controller.previewTasteStart(['바흐 푸가 BWV 542'])!;
    expect(different.items.single.matchedWorkId, isNull);
    expect(different.items.single.rawInput, '바흐 푸가 BWV 542');
    controller.dispose();
  });

  test(
    'opera exclusion is explicit and not a blanket vocal or Bach ban',
    () async {
      final store = _MemoryStore();
      final controller = _controller(store);
      await controller.load();
      expect(controller.state.excludeOperaticVocals, isFalse);
      await controller.addTasteIntakeInputs(['베토벤 교향곡 9번', '바흐 푸가', '선율']);
      await controller.toggleSaveWork('bizet-carmen-habanera');
      final today = await controller.ensureDailyPick();
      final inputs = controller.tasteIntakeItems
          .map((i) => i.toJson())
          .toList();
      await controller.setOperaticVocalsExcluded(true);
      expect((await controller.ensureDailyPick()).workId, today.workId);
      expect(
        controller.tasteIntakeItems.map((i) => i.toJson()).toList(),
        inputs,
      );
      expect(
        controller.state.stateForWork('bizet-carmen-habanera').saved,
        isTrue,
      );
      final shelves = controller.discoverShelves();
      expect(
        shelves.expand((s) => s.works).where((w) => w.isOperaticVocal),
        isEmpty,
      );
      expect(
        controller.nextThreeRecommendations().where(
          (r) => r.work.isOperaticVocal,
        ),
        isEmpty,
      );
      expect(controller.searchWorks('카르멘'), isNotEmpty);
      for (final id in [
        'beethoven-symphony-9',
        'handel-hallelujah',
        'bach-air',
      ]) {
        final work = controller.workById(id)!;
        expect(work.isOperaticVocal, isFalse);
        final isolated = _controller(
          _MemoryStore()..state = store.state.copyWith(dailyPicks: []),
          works: [work],
        );
        await isolated.load();
        expect(isolated.hasDailyRecommendation, isTrue);
        isolated.dispose();
      }
      final reloaded = _controller(
        _MemoryStore()
          ..state = UserDiscoveryState.decode(
            UserDiscoveryState.encode(store.state),
          ),
      );
      await reloaded.load();
      expect(reloaded.state.excludeOperaticVocals, isTrue);
      for (final pick in reloaded.founderSevenDayPreview()) {
        expect(pick.work.isOperaticVocal, isFalse);
      }
      final stale = reloaded.state;
      await reloaded.setOperaticVocalsExcluded(false);
      for (final pair in [(stale, reloaded.state), (reloaded.state, stale)]) {
        final merged = const DiscoveryStateMerger().merge(pair.$1, pair.$2);
        expect(merged.excludeOperaticVocals, isFalse);
      }
      reloaded.dispose();
      controller.dispose();
    },
  );

  test(
    'curated opera excerpt metadata survives import and unrelated admin edits',
    () {
      final catalog = const SeedClassicalCatalogDataSource().loadCatalog();
      expect(
        catalog.works.where((w) => w.isOperaticVocal).map((w) => w.id).toSet(),
        {
          'purcell-dido-lament',
          'bizet-carmen-habanera',
          'bizet-carmen-toreador',
          'puccini-nessun-dorma',
          'verdi-la-donna-mobile',
        },
      );
      final imported = JsonClassicalCatalogDataSource(
        jsonEncode({
          'works': [
            {'id': 'test-opera', 'isOperaticVocal': true},
          ],
        }),
      ).loadCatalog();
      expect(imported.works.single.isOperaticVocal, isTrue);
      expect(
        imported.works.single.copyWith(concertIds: ['test']).isOperaticVocal,
        isTrue,
      );
      expect(
        () => JsonClassicalCatalogDataSource(
          '{"works":[{"isOperaticVocal":"false"}]}',
        ).loadCatalog(),
        throwsFormatException,
      );
      const reducer = AdminCatalogCommandReducer();
      final edited = reducer.apply(
        catalog,
        const AdminCatalogCommand(
          type: 'work_metadata_update',
          entityId: 'bizet-carmen-habanera',
          fields: {'titleKo': '카르멘: 하바네라'},
        ),
      );
      expect(edited.applied, isTrue);
      expect(
        edited.catalog.works
            .singleWhere((w) => w.id == 'bizet-carmen-habanera')
            .isOperaticVocal,
        isTrue,
      );
      final cleared = reducer.apply(
        edited.catalog,
        const AdminCatalogCommand(
          type: 'work_metadata_update',
          entityId: 'bizet-carmen-habanera',
          fields: {'isOperaticVocal': 'false'},
        ),
      );
      expect(cleared.applied, isTrue);
      expect(
        cleared.catalog.works
            .singleWhere((w) => w.id == 'bizet-carmen-habanera')
            .isOperaticVocal,
        isFalse,
      );
      expect(
        reducer
            .apply(
              catalog,
              const AdminCatalogCommand(
                type: 'work_metadata_update',
                entityId: 'bizet-carmen-habanera',
                fields: {'isOperaticVocal': 'yes'},
              ),
            )
            .applied,
        isFalse,
      );
    },
  );

  test(
    'founder preview does not write dislikes to another user profile',
    () async {
      final store = _MemoryStore();
      final controller = _controller(store);
      await controller.load();
      final before = UserDiscoveryState.encode(controller.state);
      final demo = controller.founderSevenDayPreview();
      expect(demo, hasLength(7));
      expect(
        demo.where(
          (r) => r.work.isOperaticVocal || r.work.composerId == 'mahler',
        ),
        isEmpty,
      );
      expect(UserDiscoveryState.encode(controller.state), before);
      expect(store.state.excludeOperaticVocals, isFalse);
      expect(store.state.excludedComposerIds, isEmpty);
      await controller.addTasteIntakeInputs(['푸치니', '선율']);
      final userPreview = controller.founderSevenDayPreview();
      expect(userPreview.any((r) => r.work.isOperaticVocal), isTrue);
      expect(controller.state.excludeOperaticVocals, isFalse);
      controller.dispose();
    },
  );

  test('malformed opera preference recovers valid backup and missing field stays opt-in', () async {
    const key = 'opera_preference';
    final valid = UserDiscoveryState.defaultState.copyWith(
      excludeOperaticVocals: true,
    );
    SharedPreferences.setMockInitialValues({
      key: '{"excludeOperaticVocals":"true"}',
      '${key}_backup': UserDiscoveryState.encode(valid),
    });
    final store = ClassicalDiscoveryStore(storageKey: key);
    expect((await store.loadState()).excludeOperaticVocals, isTrue);
    expect(store.recoveryMessage, isNotNull);
    expect(UserDiscoveryState.fromJson({}).excludeOperaticVocals, isFalse);
  });

  testWidgets(
    'empty opera-only pool allows undo without deleting records on small screen',
    (tester) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final store = _MemoryStore()
        ..state = UserDiscoveryState.defaultState.copyWith(
          onboardingCompleted: true,
          excludeOperaticVocals: true,
        );
      final controller = _controller(
        store,
        works: ClassicalDiscoveryCatalog.works
            .where((w) => w.isOperaticVocal)
            .toList(),
      );
      await controller.load();
      await tester.pumpWidget(ClassicalDiscoveryApp(controller: controller));
      await tester.pumpAndSettle();
      expect(find.text('선택한 조건에 맞는 추천이 없어요'), findsOneWidget);
      await tester.tap(find.text('추천에서 제외'));
      await tester.pumpAndSettle();
      expect(find.byType(ClassicalComposerExclusionsScreen), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('exclude-operatic-vocals')));
      await tester.pumpAndSettle();
      expect(controller.state.excludeOperaticVocals, isFalse);
      expect(store.state.excludeOperaticVocals, isFalse);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(controller.hasDailyRecommendation, isTrue);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      controller.dispose();
    },
  );

  for (final id in ['mahler-adagietto', 'handel-hallelujah']) {
    test('melody preference alone does not reject $id', () async {
      final work = ClassicalDiscoveryCatalog.works.singleWhere(
        (w) => w.id == id,
      );
      final controller = ClassicalDiscoveryController(
        store: _MemoryStore(),
        works: [work],
        clock: () => DateTime(2026, 9, 14, 9),
        notificationGateway: const DisabledClassicalDailyNotificationGateway(),
      );
      await controller.load();
      await controller.addTasteIntakeInputs(['선율']);
      expect(controller.state.excludedComposerIds, isEmpty);
      final pick = await controller.ensureDailyPick();
      expect(pick.workId, id);
      expect(controller.hasDailyRecommendation, isTrue);
      expect(
        controller.nextThreeRecommendations().map((r) => r.work.id),
        contains(id),
      );
      expect(
        pick.pickType,
        id == 'mahler-adagietto' ? 'close_step' : 'open_start',
        reason: 'Mahler has a documented melody tag; Hallelujah stays available without claiming that bridge',
      );
      await controller.setComposerExcluded(work.composerId, true);
      expect(controller.nextThreeRecommendations(), isEmpty);
      controller.dispose();
    });
  }
}

ClassicalDiscoveryController _controller(
  _MemoryStore store, {
  List<ClassicalWork>? works,
}) => ClassicalDiscoveryController(
  store: store,
  works: works,
  clock: () => DateTime(2026, 9, 14, 9),
  notificationGateway: const DisabledClassicalDailyNotificationGateway(),
);

class _MemoryStore extends ClassicalDiscoveryStore {
  UserDiscoveryState state = UserDiscoveryState.defaultState;
  @override
  Future<UserDiscoveryState> loadState() async => state;
  @override
  Future<void> saveState(UserDiscoveryState value) async {
    state = value;
  }
}
