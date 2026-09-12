import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/classical_admin_commands.dart';
import 'package:in_c_sheet/classical_concert_import.dart';
import 'package:in_c_sheet/classical_daily_notification.dart';
import 'package:in_c_sheet/classical_discovery_app.dart';
import 'package:in_c_sheet/classical_discovery_catalog.dart';
import 'package:in_c_sheet/classical_discovery_controller.dart';
import 'package:in_c_sheet/classical_discovery_data_source.dart';
import 'package:in_c_sheet/classical_discovery_models.dart';
import 'package:in_c_sheet/classical_discovery_ops.dart';
import 'package:in_c_sheet/classical_discovery_repository.dart';
import 'package:in_c_sheet/classical_discovery_screen.dart';
import 'package:in_c_sheet/classical_discovery_store.dart';
import 'package:in_c_sheet/classical_discovery_validation.dart';
import 'package:in_c_sheet/classical_link_launcher.dart';
import 'package:in_c_sheet/classical_promotion_reporting.dart';
import 'package:in_c_sheet/classical_preview_player.dart';
import 'package:url_launcher/url_launcher.dart';

void main() {
  test(
    'classical link launcher keeps listening links in app when possible',
    () {
      final youtubeSearch = Uri.parse(
        'https://www.youtube.com/results?search_query=Bach+Air',
      );
      final ticketUrl = Uri.parse('https://tickets.example.com/concert');

      expect(
        preferredClassicalLaunchMode(
          youtubeSearch,
          surface: ClassicalLinkSurface.listening,
        ),
        LaunchMode.inAppWebView,
      );
      expect(
        preferredClassicalLaunchMode(
          youtubeSearch,
          surface: ClassicalLinkSurface.reference,
        ),
        LaunchMode.inAppWebView,
      );
      expect(
        preferredClassicalLaunchMode(
          ticketUrl,
          surface: ClassicalLinkSurface.ticket,
        ),
        LaunchMode.externalApplication,
      );
    },
  );

  test('classical link launcher sends non-http listening links externally', () {
    expect(
      preferredClassicalLaunchMode(
        Uri.parse('spotify:track:123'),
        surface: ClassicalLinkSurface.listening,
      ),
      LaunchMode.externalApplication,
    );
  });

  test('release artifacts and signing secrets stay out of git policy', () {
    final rootIgnore = File('../../.gitignore').readAsStringSync();
    final androidIgnore = File('android/.gitignore').readAsStringSync();

    expect(rootIgnore, contains('releases/'));
    expect(rootIgnore, contains('apps/*/releases/'));
    expect(rootIgnore, contains('*.aab'));
    expect(rootIgnore, contains('*.apk'));
    expect(androidIgnore, contains('key.properties'));
    expect(androidIgnore, contains('**/*.jks'));
  });

  test('seed catalog is large enough for a real discovery surface', () {
    expect(ClassicalDiscoveryCatalog.works.length, greaterThanOrEqualTo(300));
    expect(
      ClassicalDiscoveryCatalog.works.every(
        (work) =>
            work.titleKo.isNotEmpty &&
            work.titleOriginal.isNotEmpty &&
            work.listeningMoments.isNotEmpty &&
            work.externalLinks.length >= 3,
      ),
      isTrue,
    );
  });

  test(
    'catalog backfill expands release size without entering first exposure',
    () {
      final backfill = ClassicalDiscoveryCatalog.works
          .where((work) => work.catalogStatusTags.contains('catalog_backfill'))
          .toList(growable: false);
      final founderPicks = ClassicalDiscoveryCatalog.works
          .where((work) => work.catalogStatusTags.contains('founder_pick'))
          .toList(growable: false);

      expect(backfill.length, greaterThanOrEqualTo(200));
      expect(
        backfill.every(
          (work) =>
              work.catalogStatusTags.contains('launch_candidate') &&
              work.catalogStatusTags.contains('needs_copy_review') &&
              !work.catalogStatusTags.contains('curated_anchor') &&
              !work.catalogStatusTags.contains('founder_pick'),
        ),
        isTrue,
      );
      expect(founderPicks.length, 30);
    },
  );

  test('seed catalog marks a locked founder first exposure pool', () {
    final founderPicks = ClassicalDiscoveryCatalog.works
        .where((work) => work.catalogStatusTags.contains('founder_pick'))
        .toList(growable: false);

    expect(founderPicks.length, 30);
    expect(
      founderPicks.every(
        (work) =>
            work.catalogStatusTags.contains('first_30') &&
            work.catalogStatusTags.contains('curated_anchor'),
      ),
      isTrue,
    );
  });

  test('seed catalog passes V1 consistency validation', () {
    final report = const ClassicalCatalogValidator().validate(
      composers: ClassicalDiscoveryCatalog.composers,
      works: ClassicalDiscoveryCatalog.works,
      concerts: ClassicalDiscoveryCatalog.concerts,
      promotions: ClassicalDiscoveryCatalog.promotions,
    );

    expect(report.errorCount, 0);
  });

  test('seed data source exposes replaceable catalog snapshot', () {
    const dataSource = SeedClassicalCatalogDataSource();
    final catalog = dataSource.loadCatalog();

    expect(catalog.works.length, ClassicalDiscoveryCatalog.works.length);
    expect(
      catalog.composers.length,
      ClassicalDiscoveryCatalog.composers.length,
    );
    expect(catalog.concerts.length, ClassicalDiscoveryCatalog.concerts.length);
    expect(
      catalog.promotions.length,
      ClassicalDiscoveryCatalog.promotions.length,
    );
  });

  test('JSON catalog data source parses and validates sample catalog', () {
    final catalog = JsonClassicalCatalogDataSource(_jsonCatalogSample)
        .loadCatalog();
    final report = const ClassicalCatalogValidator().validate(
      composers: catalog.composers,
      works: catalog.works,
      concerts: catalog.concerts,
      promotions: catalog.promotions,
    );

    expect(catalog.works.single.id, 'sample-work');
    expect(catalog.works.single.externalLinks.first.previewUrl, isNotNull);
    expect(report.errorCount, 0);
  });

  test('search matches aliases and Korean composer names', () async {
    final controller = _controller();
    await controller.load();

    expect(controller.searchWorks('월광').first.id, 'beethoven-moonlight');
    expect(
      controller.searchWorks('드뷔시').map((work) => work.id),
      contains('debussy-clair-de-lune'),
    );
  });

  test('search ranking handles punctuation and catalog numbers', () async {
    final controller = _controller();
    await controller.load();

    expect(
      controller.searchWorks('Op 27 No 2').first.id,
      'beethoven-moonlight',
    );
    expect(
      controller.searchWorks('clairdelune').first.id,
      'debussy-clair-de-lune',
    );
  });

  test(
    'onboarding preferences encode, persist, and affect discover shelves',
    () async {
      final store = _MemoryDiscoveryStore();
      final controller = _controller(store: store);
      await controller.load();

      await controller.completeOnboarding(
        experienceLevel: '가끔 들음',
        preferredMoodTags: {'밤'},
        preferredContextTags: {'공연 전'},
        preferredInstruments: {'피아노'},
        preferredPlatformId: 'spotify',
        region: '부산',
        tasteInputs: const ['월광', 'Interstellar OST'],
      );
      final reloaded = _controller(store: store);
      await reloaded.load();

      expect(reloaded.state.onboardingCompleted, isTrue);
      expect(reloaded.preferredPlatformId, 'spotify');
      expect(reloaded.region, '부산');
      expect(reloaded.tasteIntakeItems.length, 2);
      expect(
        reloaded.tasteIntakeItems.map((item) => item.matchedWorkId),
        contains('beethoven-moonlight'),
      );
      expect(
        reloaded.discoverShelves().map((shelf) => shelf.id),
        containsAll(['preferred-instruments', 'preferred-context']),
      );
      expect(reloaded.state.events.first.eventType, 'onboarding_complete');
    },
  );

  test(
    'taste intake creates listening coordinates from matched and free text',
    () async {
      final controller = _controller();
      await controller.load();

      await controller.addTasteIntakeInputs(['라흐 피협 2', '영화음악']);

      expect(controller.tasteIntakeItems.length, 2);
      expect(
        controller.tasteIntakeItems.map((item) => item.matchedWorkId),
        contains('rachmaninoff-piano-concerto-2'),
      );
      expect(controller.tasteAxisScores(), isNotEmpty);
      expect(controller.listeningLevelSnapshot().level, isNotEmpty);
      expect(controller.state.events.first.eventType, 'taste_intake_add');
    },
  );

  test(
    'next three recommendations split immediate stretch and later lanes',
    () async {
      final controller = _controller();
      await controller.load();

      await controller.addTasteIntakeInputs(['라흐 피협 2', '밤의 피아노']);
      await controller.addReaction('rachmaninoff-piano-concerto-2', 'liked');

      final recommendations = controller.nextThreeRecommendations();

      expect(recommendations.map((item) => item.lane), [
        'immediate',
        'stretch',
        'later',
      ]);
      expect(
        recommendations.map((item) => item.work.id).toSet().length,
        recommendations.length,
      );
      expect(recommendations.every((item) => item.reason.isNotEmpty), isTrue);
    },
  );

  test(
    'unsure reaction keeps the next recommendations close to anchors',
    () async {
      final controller = _controller();
      await controller.load();

      await controller.addReaction('mahler-adagietto', 'unsure');

      final immediate = controller.nextThreeRecommendations().first;

      expect(immediate.lane, 'immediate');
      expect(immediate.work.difficultyForListening, lessThanOrEqualTo(3));
    },
  );

  test('skipping onboarding still marks first run complete', () async {
    final controller = _controller();
    await controller.load();

    await controller.skipOnboarding();

    expect(controller.needsOnboarding, isFalse);
    expect(controller.state.events.first.eventType, 'onboarding_skip');
  });

  test('today work prioritizes the founder first exposure pool', () async {
    final controller = _controller(
      clock: () => DateTime(2026).add(const Duration(days: 47)),
    );
    await controller.load();

    expect(controller.todayWork.catalogStatusTags, contains('founder_pick'));
  });

  test(
    'daily listening step gives a small founder pick on first use',
    () async {
      final controller = _controller(clock: () => DateTime(2026, 9, 1, 9));
      await controller.load();

      final step = controller.dailyListeningStep();

      expect(step.title, '오늘의 한 곡');
      expect(step.work.catalogStatusTags, contains('founder_pick'));
      expect(step.work.difficultyForListening, lessThanOrEqualTo(2));
      expect(step.estimatedSeconds, inInclusiveRange(15, 180));
      expect(step.reason, contains('입구'));
    },
  );

  test(
    'daily listening step follows saved unopened works before broad browsing',
    () async {
      final controller = _controller();
      await controller.load();

      await controller.toggleSaveWork('chopin-nocturne-op9-2');

      final step = controller.dailyListeningStep();

      expect(step.work.id, 'chopin-nocturne-op9-2');
      expect(step.reason, contains('저장'));
    },
  );

  test('daily step reason uses taste intake evidence', () async {
    final controller = _controller();
    await controller.load();

    await controller.addTasteIntakeInputs(['영화음악']);

    final step = controller.dailyListeningStep();
    expect(step.reason, contains('영화음악'));
    expect(step.nextEffect, contains('내일'));
    expect(step.tasteEvidenceLabel, '영화음악');
  });

  test('unmatched taste input still previews a useful first reward', () async {
    final controller = _controller();
    await controller.load();

    final preview = controller.previewTasteStart(['새벽 산책 음악']);

    expect(preview, isNotNull);
    expect(preview!.items.single.sourceType, 'free_text');
    expect(preview.dailyStep.title, '오늘은 이 30초부터');
    expect(preview.dailyStep.reason, contains('새벽 산책 음악'));
    expect(preview.nextThree, isNotEmpty);
  });

  test('taste translation turns input into a listening start point', () async {
    final controller = _controller();
    await controller.load();

    final preview = controller.previewTasteStart(['Interstellar OST']);

    expect(preview, isNotNull);
    expect(preview!.translation.sourceLabel, contains('Interstellar OST'));
    expect(preview.translation.startingPoint, contains('시작'));
    expect(preview.translation.listenFor, contains('잡아보세요'));
    expect(preview.translation.nextDirection, contains('다음'));
    expect(preview.translation.avoidForNow, isNot(contains('AI')));
    expect(preview.dailyStep.prompt, preview.translation.listenFor);
  });

  test('founder calibration turns mixed favorite songs into melody-first discovery', () async {
    final controller = _controller();
    await controller.load();

    await controller.addTasteIntakeInputs(const [
      '비와이 - 알면서도',
      '베토벤 - 교향곡 9번',
      '딕펑스 - VIVA청춘',
      '벤치위레오 - 밤산책',
      'Travis - Sailing Away',
      '드보르작 - 교향곡 9번',
      '하이든 - 건반 협주곡 2번',
      '로꼬 - 잘가',
    ]);

    final axes = controller.tasteAxisScores();
    final nextThree = controller.nextThreeRecommendations();
    final recommendedText = nextThree
        .map(
          (item) => [
            item.work.titleKo,
            item.work.composerNameKo,
            item.work.instrumentation,
            ...item.work.contextTags,
            item.reason,
          ].join(' '),
        )
        .join(' ');

    expect(axes.first.axis, '선율형');
    expect(nextThree, hasLength(3));
    expect(recommendedText, contains('선율'));
    expect(recommendedText, isNot(contains('오페라')));
    expect(recommendedText, isNot(contains('말러')));
    expect(
      nextThree.every(
        (item) =>
            item.work.instrumentation != '성악' &&
            item.work.instrumentation != '합창',
      ),
      isTrue,
    );
  });

  test(
    'long classical hints keep raw taste text without fake work matching',
    () async {
      final controller = _controller();
      await controller.load();

      final mozart = controller.previewTasteStart(['모차르트 교향곡 40번']);
      final haydn = controller.previewTasteStart(['하이든 건반 협주곡 2번']);
      final chopin = controller.previewTasteStart(['쇼팽 야상곡 9-2번']);

      expect(mozart!.items.single.matchedWorkId, isNull);
      expect(mozart.items.single.matchedComposerId, 'mozart');
      expect(mozart.translation.sourceLabel, contains('모차르트 교향곡 40번'));
      expect(haydn!.items.single.matchedWorkId, isNull);
      expect(haydn.items.single.matchedComposerId, 'haydn');
      expect(haydn.translation.sourceLabel, contains('하이든 건반 협주곡 2번'));
      expect(chopin!.items.single.matchedWorkId, 'chopin-nocturne-op9-2');
    },
  );

  test(
    'daily pick stays stable within the same date and changes tomorrow',
    () async {
      var now = DateTime(2026, 9, 1, 9);
      final controller = _controller(clock: () => now);
      await controller.load();
      await controller.addTasteIntakeInputs(const ['쇼팽 야상곡 9-2번', '밤산책']);

      final morning = await controller.ensureDailyPick();
      now = DateTime(2026, 9, 1, 22);
      final evening = controller.dailyPick();
      now = DateTime(2026, 9, 2, 9);
      final tomorrow = await controller.ensureDailyPick();

      expect(evening.id, morning.id);
      expect(evening.workId, morning.workId);
      expect(tomorrow.id, isNot(morning.id));
    },
  );

  test('daily pick expands from a personal pool with at most one surprise per week', () async {
    var now = DateTime(2026, 9, 1, 9);
    final controller = _controller(clock: () => now);
    await controller.load();
    await controller.addTasteIntakeInputs(const [
      '비와이 - 알면서도',
      '베토벤 - 교향곡 9번',
      '딕펑스 - VIVA청춘',
      '벤치위레오 - 밤산책',
      'Travis - Sailing Away',
      '드보르작 - 교향곡 9번',
      '하이든 - 건반 협주곡 2번',
      '로꼬 - 잘가',
    ]);

    final picks = <DailyPick>[];
    for (var day = 0; day < 7; day += 1) {
      now = DateTime(2026, 9, 1 + day, 9);
      final pick = await controller.ensureDailyPick();
      picks.add(pick);
      await controller.addReaction(pick.workId, 'liked');
    }

    final surprisePicks = picks
        .where((pick) => pick.pickType == 'surprise')
        .toList();
    expect(surprisePicks.length, lessThanOrEqualTo(1));
    expect(surprisePicks.length, greaterThanOrEqualTo(1));
    expect(surprisePicks.single.distanceLabel, '의외의 우회로');
    expect(surprisePicks.single.reason, contains('옆길'));
    expect(
      picks
          .take(3)
          .map((pick) {
            final work = controller.workById(pick.workId)!;
            return '${work.titleKo} ${work.composerNameKo} ${work.instrumentation}';
          })
          .join(' '),
      allOf(isNot(contains('오페라')), isNot(contains('말러'))),
    );
    expect(picks.map((pick) => pick.workId).toSet().length, picks.length);
  });

  test('unsure reaction disables surprise for the next daily pick', () async {
    var now = DateTime(2026, 9, 1, 9);
    final controller = _controller(clock: () => now);
    await controller.load();
    await controller.addTasteIntakeInputs(const ['쇼팽 야상곡 9-2번', '밤산책']);

    for (var day = 0; day < 3; day += 1) {
      now = DateTime(2026, 9, 1 + day, 9);
      final pick = await controller.ensureDailyPick();
      await controller.addReaction(pick.workId, 'liked');
    }
    now = DateTime(2026, 9, 4, 9);
    await controller.addReaction('mahler-adagietto', 'unsure');

    final pick = await controller.ensureDailyPick();

    expect(pick.pickType, isNot('surprise'));
    expect(pick.distanceLabel, isNot('의외의 우회로'));
  });

  test(
    'daily pick completes from moment, link-out, and reaction actions',
    () async {
      var now = DateTime(2026, 9, 1, 9);
      final controller = _controller(clock: () => now);
      await controller.load();
      await controller.addTasteIntakeInputs(const ['쇼팽 야상곡 9-2번']);

      var pick = await controller.ensureDailyPick();
      await controller.completeMoment(pick.workId, pick.momentId);
      expect(controller.dailyPick().isCompleted, isTrue);

      now = DateTime(2026, 9, 2, 9);
      pick = await controller.ensureDailyPick();
      final work = controller.workById(pick.workId)!;
      await controller.recordProviderClick(work, work.externalLinks.first);
      expect(controller.dailyPick().isCompleted, isTrue);

      now = DateTime(2026, 9, 3, 9);
      pick = await controller.ensureDailyPick();
      await controller.addReaction(pick.workId, 'liked');
      expect(controller.dailyPick().isCompleted, isTrue);
      expect(
        controller.workPassportFor(pick.workId).map((stamp) => stamp.stampType),
        contains('daily_pick'),
      );
    },
  );

  test(
    'daily pick notification schedules local iOS payload and logs events',
    () async {
      final gateway = _FakeDailyNotificationGateway();
      final controller = _controller(notificationGateway: gateway);
      await controller.load();
      await controller.addTasteIntakeInputs(const ['밤산책']);

      await controller.configureDailyPickReminder(
        enabled: true,
        timeLabel: '09:15',
        message: '산책 전에 30초만 들어볼 곡이 있어요.',
      );

      expect(controller.reminderPreference.enabled, isTrue);
      expect(
        controller.reminderPreference.deliveryStatus,
        'local-notification-scheduled',
      );
      expect(gateway.scheduledRequest, isNotNull);
      expect(gateway.scheduledRequest!.hour, 9);
      expect(gateway.scheduledRequest!.minute, 15);
      expect(gateway.scheduledRequest!.body, contains('산책'));
      expect(
        controller.state.events.map((event) => event.eventType),
        containsAll([
          'notification_permission_request',
          'notification_permission_granted',
          'daily_pick_notification_scheduled',
        ]),
      );
    },
  );

  test('daily pick notification permission denied keeps app usable', () async {
    final controller = _controller(
      notificationGateway: _FakeDailyNotificationGateway(
        permissionStatus: 'denied',
      ),
    );
    await controller.load();

    await controller.configureDailyPickReminder(enabled: true);

    expect(controller.reminderPreference.enabled, isFalse);
    expect(controller.reminderPreference.deliveryStatus, 'permission-denied');
    expect(
      controller.state.events.map((event) => event.eventType),
      contains('notification_permission_denied'),
    );
  });

  test('notification launch records Daily Pick open evidence', () async {
    final gateway = _FakeDailyNotificationGateway(
      launchPayload: 'dailyPickId=daily-pick-2026-09-01;workId=bach-air',
    );
    final controller = _controller(
      clock: () => DateTime(2026, 9, 1, 9),
      notificationGateway: gateway,
    );

    await controller.load();

    expect(controller.dailyPickHistory.first.openedFromNotification, isTrue);
    expect(
      controller.state.events.first.eventType,
      'daily_pick_notification_open',
    );
  });

  test(
    'ear-opening answer records a listening clue without score language',
    () async {
      final controller = _controller();
      await controller.load();
      await controller.addTasteIntakeInputs(['영화음악']);

      final step = controller.dailyListeningStep();
      final prompt = controller.earOpeningPromptFor(step);
      await controller.recordEarOpeningAnswer(prompt, prompt.options.first);

      final event = controller.state.events.first;
      expect(event.eventType, 'ear_opening_answer');
      expect(event.properties['answer'], prompt.options.first);
      expect(event.properties['surface'], 'daily');
      expect(prompt.question, isNot(contains('정답')));
      expect(prompt.question, isNot(contains('점수')));
      expect(controller.tasteAxisScores().first.axis, prompt.axis);
      expect(controller.listeningMapProgress().openedCount, greaterThan(0));
    },
  );

  test('taste intake opens initial listening map node', () async {
    final controller = _controller();
    await controller.load();

    await controller.addTasteIntakeInputs(['영화음악']);

    final progress = controller.listeningMapProgress();
    expect(progress.openedCount, greaterThan(0));
    expect(progress.currentNode, isNotNull);
    expect(progress.currentNode!.axis, '극적형');
    expect(progress.summaryCopy, contains('열'));
  });

  test('daily step completion updates listening map progress', () async {
    final controller = _controller(clock: () => DateTime(2026, 9, 1, 9));
    await controller.load();
    final step = controller.dailyListeningStep();

    await controller.completeMoment(step.work.id, step.moment.id);

    final progress = controller.listeningMapProgress();
    expect(progress.userState.openedNodeIds, isNotEmpty);
    expect(
      progress.userState.capturedMomentIds,
      contains('${step.work.id}:${step.moment.id}'),
    );
    expect(progress.rewardCopy, contains('오늘 들은 지점'));
  });

  test('reaction updates axis familiarity', () async {
    final controller = _controller(clock: () => DateTime(2026, 9, 1, 9));
    await controller.load();
    final step = controller.dailyListeningStep();

    await controller.addReaction(
      step.work.id,
      'liked',
      momentId: step.moment.id,
    );
    await controller.completeMoment(step.work.id, step.moment.id);

    final progress = controller.listeningMapProgress();
    expect(progress.familiarCount, greaterThan(0));
  });

  test('unsure reaction marks unfamiliar area without conquest', () async {
    final controller = _controller();
    await controller.load();
    final work = ClassicalDiscoveryCatalog.workById('bach-air')!;

    await controller.addReaction(work.id, 'unsure');
    await controller.toggleSaveWork(work.id);
    await controller.recordProviderClick(work, work.externalLinks.first);

    final progress = controller.listeningMapProgress();
    expect(progress.unfamiliarNodes, isNotEmpty);
    expect(
      progress.conqueredWorks.where((item) => item.id == work.id),
      isEmpty,
    );
  });

  test('save full listen and reaction creates conquered candidate', () async {
    final controller = _controller();
    await controller.load();
    final work = ClassicalDiscoveryCatalog.workById('bach-air')!;

    await controller.toggleSaveWork(work.id);
    await controller.recordProviderClick(work, work.externalLinks.first);
    await controller.addReaction(work.id, 'liked');

    final progress = controller.listeningMapProgress();
    expect(progress.conqueredWorks.map((item) => item.id), contains(work.id));
    expect(progress.conqueredCount, greaterThan(0));
  });

  test('work detail map role exposes node and next path', () async {
    final controller = _controller();
    await controller.load();
    final work = ClassicalDiscoveryCatalog.workById('bach-air')!;

    final role = controller.listeningMapRoleForWork(work);

    expect(role.primaryNode.title, isNotEmpty);
    expect(role.roleCopy, contains(work.titleKo));
    expect(role.nextPath, isNotEmpty);
  });

  test('discover shelves dedupe by listening map path', () async {
    final controller = _controller();
    await controller.load();

    await controller.addTasteIntakeInputs(['영화음악']);
    await controller.addReaction('beethoven-symphony-5', 'liked');

    final ids = <String>[];
    for (final shelf in controller.discoverShelves()) {
      ids.addAll(shelf.works.map((work) => work.id));
    }

    expect(ids.toSet().length, ids.length);
    expect(
      controller.discoverShelves().map((shelf) => shelf.id),
      contains('map-next-path'),
    );
  });

  test('daily listening step becomes completed after a reaction', () async {
    final controller = _controller(clock: () => DateTime(2026, 9, 1, 9));
    await controller.load();
    final step = controller.dailyListeningStep();

    await controller.addReaction(
      step.work.id,
      'liked',
      momentId: step.moment.id,
    );

    final completed = controller.dailyListeningStep(
      now: DateTime(2026, 9, 1, 22),
    );
    expect(completed.work.id, step.work.id);
    expect(completed.isCompleted, isTrue);
    expect(completed.title, '오늘은 이 한 곡이면 충분해요');
  });

  test('daily continuity counts one completion per day gently', () async {
    var now = DateTime(2026, 9, 1, 9);
    final controller = _controller(clock: () => now);
    await controller.load();
    final firstStep = controller.dailyListeningStep(now: now);
    await controller.completeMoment(firstStep.work.id, firstStep.moment.id);
    await controller.addReaction(
      firstStep.work.id,
      'liked',
      momentId: firstStep.moment.id,
    );

    now = DateTime(2026, 9, 2, 9);
    final secondStep = controller.dailyListeningStep(now: now);
    await controller.recordProviderClick(
      secondStep.work,
      secondStep.work.externalLinks.first,
    );

    final summary = controller.continuitySummary(now: DateTime(2026, 9, 2, 22));
    expect(summary.weeklyCompletedDays, 2);
    expect(summary.currentRunDays, 2);
    expect(summary.completedToday, isTrue);
    expect(summary.recoveryCopy, isNot(contains('실패')));
  });

  test(
    'continuity recovery keeps yesterday progress without punishment',
    () async {
      var now = DateTime(2026, 9, 1, 9);
      final controller = _controller(clock: () => now);
      await controller.load();
      final step = controller.dailyListeningStep(now: now);
      await controller.completeMoment(step.work.id, step.moment.id);

      now = DateTime(2026, 9, 2, 9);
      final summary = controller.continuitySummary(now: now);

      expect(summary.completedToday, isFalse);
      expect(summary.currentRunDays, 1);
      expect(summary.headline, contains('이번 주'));
      expect(summary.recoveryCopy, contains('어제'));
    },
  );

  test('reminder preference persists as local-first placeholder', () async {
    final store = _MemoryDiscoveryStore();
    final controller = _controller(store: store);
    await controller.load();

    await controller.setReminderPreference(
      ReminderPreference.defaultPreference.copyWith(
        enabled: true,
        timeLabel: '21:00',
        message: '어제 저장한 작품, 첫 선율만 다시 들어볼까요?',
      ),
    );
    final reloaded = _controller(store: store);
    await reloaded.load();

    expect(reloaded.reminderPreference.enabled, isTrue);
    expect(reloaded.reminderPreference.timeLabel, '21:00');
    expect(reloaded.reminderPreference.deliveryStatus, 'local-preference-only');
    expect(reloaded.state.notificationPreferences, contains('today_work'));
    expect(reloaded.state.events.first.eventType, 'reminder_preference_set');
  });

  test(
    'creates Spotify-like recommendation shelves from work metadata',
    () async {
      final controller = _controller();
      await controller.load();
      final anchor = controller.workById('debussy-clair-de-lune')!;

      final shelves = controller.shelvesForWork(anchor);
      final allRecommendedIds = shelves
          .expand((shelf) => shelf.works)
          .map((work) => work.id)
          .toSet();

      expect(shelves.map((shelf) => shelf.title), contains('이 작품이 괜찮았다면'));
      expect(allRecommendedIds, contains('satie-gymnopedie-1'));
      expect(allRecommendedIds, contains('beethoven-moonlight'));
    },
  );

  test('persists saved works through the discovery store', () async {
    final store = _MemoryDiscoveryStore();
    final controller = _controller(store: store);
    await controller.load();

    await controller.toggleSaveWork('chopin-nocturne-op9-2');
    final reloaded = _controller(store: store);
    await reloaded.load();

    expect(reloaded.state.stateForWork('chopin-nocturne-op9-2').saved, isTrue);
    expect(reloaded.savedWorks.single.id, 'chopin-nocturne-op9-2');
  });

  test('reaction updates work state and event log', () async {
    final controller = _controller();
    await controller.load();

    await controller.addReaction('bach-air', 'liked', momentId: 'bach-air-30s');

    final state = controller.state.stateForWork('bach-air');
    expect(state.reactionCounts['liked'], 1);
    expect(controller.state.reactions.single.type, 'liked');
    expect(controller.state.events.first.eventType, 'reaction_add');
  });

  test('feedback submit is stored as local-first launch evidence', () async {
    final store = _MemoryDiscoveryStore();
    final controller = _controller(store: store);
    await controller.load();

    await controller.submitFeedback(
      category: 'link_issue',
      message: 'Spotify 링크가 검색 화면으로만 열려요.',
    );
    final reloaded = _controller(store: store);
    await reloaded.load();

    expect(reloaded.state.events.first.eventType, 'feedback_submit');
    expect(reloaded.state.events.first.context, 'link_issue');
    expect(reloaded.state.events.first.properties['category'], 'link_issue');
    expect(
      reloaded.state.events.first.properties['message'],
      contains('Spotify'),
    );
  });

  test('repeat due list is calculated from completed moments', () async {
    var now = DateTime(2026, 8, 30, 9);
    final controller = _controller(clock: () => now);
    await controller.load();

    await controller.toggleSaveWork('mozart-eine-kleine');
    await controller.completeMoment(
      'mozart-eine-kleine',
      'mozart-eine-kleine-30s',
    );
    expect(controller.repeatDueWorks(now: now), isEmpty);

    now = now.add(const Duration(days: 2));
    expect(controller.repeatDueWorks(now: now).single.id, 'mozart-eine-kleine');
  });

  test(
    'listening moment start and completion events use V1 event names',
    () async {
      final controller = _controller();
      await controller.load();

      await controller.startMoment('bach-air', 'bach-air-30s');
      await controller.completeMoment('bach-air', 'bach-air-30s');

      expect(
        controller.state.events.first.eventType,
        'listening_moment_complete',
      );
      expect(controller.state.events[1].eventType, 'listening_moment_start');
    },
  );

  test(
    'moment preview open and cancel events are tracked separately',
    () async {
      final controller = _controller();
      await controller.load();

      await controller.recordMomentPreviewOpen('bach-air', 'bach-air-30s');
      await controller.recordMomentCancel('bach-air', 'bach-air-30s');

      expect(
        controller.state.events.first.eventType,
        'listening_moment_cancel',
      );
      expect(
        controller.state.events[1].eventType,
        'listening_moment_preview_open',
      );
    },
  );

  test('controller can be built from a catalog data source', () async {
    final controller = ClassicalDiscoveryController.fromDataSource(
      store: _MemoryDiscoveryStore(),
      dataSource: const SeedClassicalCatalogDataSource(),
      notificationGateway: const DisabledClassicalDailyNotificationGateway(),
    );
    await controller.load();

    expect(controller.works.length, ClassicalDiscoveryCatalog.works.length);
    expect(controller.catalogSnapshot.composers.length, greaterThan(10));
  });

  test('preferred platform sorts external links first', () async {
    final controller = _controller();
    await controller.load();

    await controller.setPreferredPlatform('spotify');
    final work = controller.workById('bach-air')!;

    expect(
      work
          .linksForPreferredPlatform(controller.preferredPlatformId)
          .first
          .platformId,
      'spotify',
    );
  });

  test(
    'preview play, pause, and error events are tracked for moment analytics',
    () async {
      final controller = _controller();
      await controller.load();

      await controller.recordPreviewPlay(
        'bach-air',
        'bach-air-30s',
        previewUrl: 'https://example.com/bach-air.mp3',
      );
      await controller.recordPreviewPause('bach-air', 'bach-air-30s');
      await controller.recordPreviewError('bach-air', 'bach-air-30s', 'failed');

      expect(controller.state.events[0].eventType, 'preview_error');
      expect(controller.state.events[1].eventType, 'preview_pause');
      expect(controller.state.events[2].eventType, 'preview_play');
      expect(
        controller.state.events[2].properties['previewUrl'],
        contains('bach-air'),
      );
    },
  );

  test(
    'preview player rejects invalid preview URLs before platform playback',
    () async {
      final result = await ClassicalPreviewPlayer().playUrl('not a url');

      expect(result.status, ClassicalPreviewPlaybackStatus.failed);
      expect(result.message, contains('Invalid'));
    },
  );

  test(
    'external provider and ticket clicks use reporting event names',
    () async {
      final controller = _controller();
      await controller.load();
      final work = controller.workById('bach-air')!;

      await controller.recordProviderClick(work, work.externalLinks.first);
      await controller.recordTicketDestinationClick('concert-baroque-night');

      expect(
        controller.state.events.first.eventType,
        'ticket_destination_click',
      );
      expect(controller.state.events.first.properties['surface'], 'ticket');
      expect(controller.state.events[1].eventType, 'external_platform_click');
      expect(controller.state.events[1].properties['providerId'], 'youtube');
      expect(
        controller.state.events[1].properties['linkType'],
        'listen_search',
      );
      expect(controller.state.events[1].properties['fallback'], 'false');
      expect(controller.state.events[1].properties['surface'], 'listening');
      expect(
        controller.state.events[1].properties['url'],
        startsWith('https://'),
      );
    },
  );

  test('external provider fallback click is marked separately', () async {
    final controller = _controller();
    await controller.load();
    final work = controller.workById('bach-air')!;

    await controller.recordProviderClick(
      work,
      work.externalLinks.first,
      fallback: true,
    );

    expect(controller.state.events.first.eventType, 'external_platform_click');
    expect(controller.state.events.first.properties['fallback'], 'true');
    expect(controller.state.events.first.properties['surface'], 'listening');
    expect(
      controller.state.events.first.properties['linkType'],
      'listen_search',
    );
  });

  test('instrument curiosity reaction creates a Discover shelf', () async {
    final controller = _controller();
    await controller.load();

    await controller.addReaction(
      'bach-air',
      'instrument',
      momentId: 'bach-air-30s',
    );

    final shelf = controller.discoverShelves().firstWhere(
      (item) => item.id == 'instrument-curiosity',
    );

    expect(controller.interestedInstruments, contains('현악합주'));
    expect(shelf.title, '궁금해진 소리로 이어 듣기');
    expect(shelf.works.map((work) => work.id), isNot(contains('bach-air')));
    expect(shelf.works.every((work) => work.instrumentation == '현악합주'), isTrue);
  });

  test('recommendation clicks are stored with shelf context', () async {
    final controller = _controller();
    await controller.load();
    final work = controller.workById('bach-air')!;

    await controller.recordRecommendationClick('starter', work);

    expect(controller.state.events.first.eventType, 'recommendation_click');
    expect(controller.state.events.first.context, 'starter');
  });

  test('work passport derives listening stamps from user actions', () async {
    final controller = _controller();
    await controller.load();
    final work = controller.workById('bach-air')!;
    final moment = work.primaryMoment!;

    await controller.recordMomentPreviewOpen(work.id, moment.id);
    await controller.completeMoment(work.id, moment.id);
    await controller.recordProviderClick(work, work.externalLinks.first);
    await controller.toggleSaveWork(work.id);
    await controller.addReaction(work.id, 'liked', momentId: moment.id);

    final stamps = controller.workPassportFor(work.id);

    expect(stamps.map((stamp) => stamp.label), contains('처음 만남'));
    expect(stamps.map((stamp) => stamp.label), contains('전체 듣기로 이동'));
    expect(stamps.map((stamp) => stamp.label), contains('좋았다고 남김'));
    expect(
      controller.listeningTimeline().map((stamp) => stamp.workId),
      contains(work.id),
    );
  });

  test('revisit queue includes saved unopened and unsure works', () async {
    final controller = _controller();
    await controller.load();

    await controller.toggleSaveWork('bach-air');
    await controller.addReaction('mahler-adagietto', 'unsure');

    final queueIds = controller.revisitQueue.map((work) => work.id);

    expect(queueIds, contains('bach-air'));
    expect(queueIds, contains('mahler-adagietto'));
  });

  test('concert program matcher finds seed program works from raw text', () {
    const matcher = ConcertProgramMatcher();

    for (final concert in ClassicalDiscoveryCatalog.concerts) {
      final matched = matcher
          .matchWorkIds(
            programRawText: concert.programRawText,
            works: ClassicalDiscoveryCatalog.works,
          )
          .toSet();

      expect(
        matched,
        containsAll(concert.programWorkIds),
        reason: 'programRawText should match ${concert.id}',
      );
    }
  });

  test('creates a 10 minute preview route from a seeded concert', () async {
    final store = _MemoryDiscoveryStore();
    final controller = _controller(store: store);
    await controller.load();

    final route = await controller.createPreviewRouteFromConcert(
      'concert-baroque-night',
    );

    expect(route, isNotNull);
    expect(route!.sourceType, ConcertPreviewRouteSourceType.seededConcert);
    expect(route.programWorkIds.length, inInclusiveRange(2, 4));
    expect(route.listeningMomentIds, isNotEmpty);
    expect(route.totalPreviewMinutes, lessThanOrEqualTo(10));
    expect(route.completionState, ConcertPreviewRouteCompletionState.ready);
    expect(controller.latestPreviewRoute!.id, route.id);
    expect(
      controller.state.events.first.eventType,
      'concert_preview_route_create',
    );
  });

  test(
    'pasted program route excludes low confidence composer-only matches',
    () async {
      final controller = _controller();
      await controller.load();

      final draft = controller.previewProgramText('J. S. Bach recital');
      final route = await controller.createPreviewRouteFromProgram(
        rawProgramText: 'J. S. Bach recital',
      );

      expect(draft.candidates, isNotEmpty);
      expect(
        draft.candidates.map((candidate) => candidate.confidence),
        contains(ConcertProgramMatchConfidence.low),
      );
      expect(draft.routeReadyCandidates, isEmpty);
      expect(route.programWorkIds, isEmpty);
      expect(route.completionState, ConcertPreviewRouteCompletionState.draft);
    },
  );

  test(
    'saved but unopened queue clears after external platform click',
    () async {
      final controller = _controller();
      await controller.load();
      final work = controller.workById('bach-air')!;

      await controller.toggleSaveWork(work.id);
      expect(controller.savedButUnopenedWorks.map((item) => item.id), [
        work.id,
      ]);

      await controller.recordProviderClick(work, work.externalLinks.first);

      expect(controller.savedButUnopenedWorks, isEmpty);
    },
  );

  test('post-concert reflection updates diary and taste map', () async {
    final controller = _controller();
    await controller.load();

    await controller.addPostConcertReflection(
      concertId: 'concert-baroque-night',
      workId: 'bach-air',
      reactionType: 'liked',
      instrument: '현악합주',
      note: '선율이 기억났어요',
    );
    await controller.addReaction('bach-air', 'repeat');
    await controller.addReaction('bach-cello-suite-1-prelude', 'liked');

    expect(controller.postConcertReflections.single.workId, 'bach-air');
    expect(
      controller.state.events.map((event) => event.eventType),
      contains('post_concert_reflection_add'),
    );
    expect(
      controller.tasteMapInsights().map((insight) => insight.title).join(' '),
      contains('형'),
    );
  });

  test('ops summary calculates coverage for V1 readiness screen', () {
    const dataSource = SeedClassicalCatalogDataSource();
    final summary = ClassicalCatalogOpsSummary.fromCatalog(
      catalog: dataSource.loadCatalog(),
      recentEvents: [
        DiscoveryEvent(
          id: 'event-1',
          eventType: 'work_view',
          entityType: 'work',
          entityId: 'bach-air',
          occurredAt: DateTime(2026, 8, 31),
        ),
      ],
    );

    expect(summary.validationReport.errorCount, 0);
    expect(summary.minimumWorkTarget, 300);
    expect(summary.launchWorkTarget, 1000);
    expect(summary.previewLinkCount, greaterThanOrEqualTo(0));
    expect(summary.worksMissingListeningMoments, 0);
    expect(summary.worksMissingExternalLinks, 0);
    expect(summary.concertsWithRawText, summary.concertCount);
    expect(summary.matchedProgramItems, summary.expectedProgramItems);
    expect(summary.recentEventTypes.single, 'work_view');
    expect(summary.publicV1Closeout.releaseReady, isFalse);
    expect(summary.publicV1Closeout.productQualityGapCount, greaterThan(0));
    expect(
      summary.publicV1Closeout.productionVerificationGapCount,
      greaterThan(0),
    );
    expect(summary.publicV1Closeout.evidenceText, contains('Public V1'));
    expect(
      summary.publicV1Closeout.gateItems
          .where((item) => !item.passes)
          .every((item) => item.priority == 'P0' || item.priority == 'P1'),
      isTrue,
    );
    expect(
      summary.publicV1Closeout.evidenceText,
      contains('P0 · owner release/qa'),
    );
    expect(summary.appIdentityReadiness.isVerified, isTrue);
    expect(summary.appIdentityReadiness.appName, 'in C');
    expect(summary.appIdentityReadiness.version, '1.0.0+14');
    expect(
      summary.appIdentityReadiness.iconStatus,
      contains('Darezzo C clef icon applied'),
    );
    expect(
      summary.appIdentityReadiness.androidApplicationId,
      'com.mannlab.inc',
    );
    expect(summary.appIdentityReadiness.targetAppName, 'in C');
    expect(
      summary.appIdentityReadiness.targetAndroidApplicationId,
      'com.mannlab.inc',
    );
    expect(summary.appIdentityReadiness.identityDecisionAccepted, isTrue);
    expect(summary.appIdentityReadiness.isVerified, isTrue);
    expect(
      summary.appIdentityReadiness.releaseDecision,
      contains('com.mannlab.inc'),
    );
    expect(summary.kopisProductionReadiness.productionReady, isFalse);
    expect(
      summary.kopisProductionReadiness.statuses,
      contains(ClassicalKopisProductionStatus.missingKey),
    );
    expect(summary.feedbackSummary.totalCount, 0);
    expect(summary.directReadyWorkCount, 0);
    expect(summary.founderApprovedPreviewCount, 0);
    expect(summary.safeSearchFallbackWorkCount, summary.workCount);
    expect(summary.storeMetadataReadiness.appName, 'in C');
    expect(summary.storeMetadataReadiness.category, 'Music / Entertainment');
    expect(
      summary.storeMetadataReadiness.screenshotArtifactPaths,
      contains('apps/in_c_sheet/build/store-screenshot-android-today.png'),
    );
    expect(
      summary.storeMetadataReadiness.excludedScreenshotSurfaces,
      contains('fake direct link'),
    );
    expect(summary.storeMetadataReadiness.isVerified, isFalse);
    expect(summary.publicCopyReadiness.isVerified, isTrue);
    expect(summary.publicCopyReadiness.blockedTerms, contains('funnel'));
    expect(summary.buildQaReadiness.hasInstallLaunchSmoke, isTrue);
    expect(summary.buildQaReadiness.isVerified, isFalse);
    expect(summary.buildQaReadiness.androidInstallSmoke, startsWith('PASS'));
    expect(summary.buildQaReadiness.iosTestFlightUpload, contains('BLOCKED'));
    expect(
      summary.publicV1Closeout.evidenceText,
      contains('Store metadata production verification gaps'),
    );
    expect(
      summary.publicV1Closeout.evidenceText,
      contains('Public copy product quality gaps: 0'),
    );
    expect(
      summary.publicV1Closeout.evidenceText,
      contains('Install/launch smoke: PASS'),
    );
  });

  test(
    'ops summary separates soft launch evidence from public V1 closeout',
    () {
      final summary = ClassicalCatalogOpsSummary.fromCatalog(
        catalog: const SeedClassicalCatalogDataSource().loadCatalog(),
        recentEvents: [
          _event(
            'listening_moment_preview_open',
            'work',
            'beethoven-moonlight',
          ),
          _event('external_platform_click', 'work', 'beethoven-moonlight'),
          _event('work_save', 'work', 'beethoven-moonlight'),
          _event('reaction_add', 'work', 'beethoven-moonlight'),
          _event('recommendation_click', 'work', 'bach-air'),
        ],
      );

      expect(summary.firstThreeMinuteFunnelComplete, isTrue);
      expect(summary.softLaunchReadiness.founderPickCount, 30);
      expect(summary.publicV1Closeout.releaseReady, isFalse);
      expect(summary.publicV1Closeout.contentOpsGapCount, 0);
      expect(
        summary.publicV1Closeout.productionVerificationGapCount,
        greaterThan(0),
      );
      expect(summary.publicV1Closeout.legalReviewGapCount, greaterThan(0));
      expect(
        summary.publicV1Closeout.excludedFeatures,
        contains('음원 host/cache/download'),
      );
    },
  );

  test('ops summary treats repeated launch feedback as blockers', () {
    final summary = ClassicalCatalogOpsSummary.fromCatalog(
      catalog: const SeedClassicalCatalogDataSource().loadCatalog(),
      recentEvents: [
        _event(
          'feedback_submit',
          'app',
          'in-c',
          context: 'link_issue',
          properties: {'category': 'link_issue', 'message': '링크가 헷갈림'},
        ),
        _event(
          'feedback_submit',
          'app',
          'in-c',
          context: 'retention_issue',
          properties: {'category': 'retention_issue', 'message': '다시 열 이유 부족'},
        ),
        _event(
          'feedback_submit',
          'app',
          'in-c',
          context: 'crash_or_blocker',
          properties: {'category': 'crash_or_blocker', 'message': '멈췄어요'},
        ),
      ],
    );

    expect(summary.feedbackSummary.totalCount, 3);
    expect(summary.feedbackSummary.blockerCount, 3);
    expect(summary.feedbackSummary.items.first.priority, 'blocker');
    expect(summary.publicV1Closeout.productQualityGapCount, greaterThan(0));
    expect(
      summary.publicV1Closeout.evidenceText,
      contains('Launch feedback blockers: 3'),
    );
  });

  test('founder quality gate requires 5 testers and 3 comeback reasons', () {
    DiscoveryEvent probe(String testerId, bool passed) {
      return _event(
        'feedback_submit',
        'app',
        'in-c',
        id: 'founder-quality-$testerId',
        context: 'founder_quality',
        properties: {
          'category': 'founder_quality',
          'testerId': testerId,
          'dailyStepTapped': passed.toString(),
          'reasonAccepted': passed.toString(),
          'openedFullListen': passed.toString(),
          'leftReaction': passed.toString(),
          'understoodListeningMap': passed.toString(),
          'wouldReturnTomorrow': passed.toString(),
        },
      );
    }

    final summary = ClassicalCatalogOpsSummary.fromCatalog(
      catalog: const SeedClassicalCatalogDataSource().loadCatalog(),
      recentEvents: [
        probe('u1', true),
        probe('u2', true),
        probe('u3', true),
        probe('u4', false),
        probe('u5', false),
      ],
    );

    expect(summary.founderQualityGate.ready, isTrue);
    expect(summary.founderQualityGate.testedUserCount, 5);
    expect(summary.founderQualityGate.mapUnderstandingCount, 3);
    expect(summary.founderQualityGate.comebackReasonCount, 3);
    expect(
      summary.publicV1Closeout.evidenceText,
      contains('Founder Quality: YES'),
    );
  });

  test('founder quality test mode exposes behavior checklist', () {
    expect(
      ClassicalFounderQualityGate.observationChecklist,
      contains('첫 1분 안에 Daily 30초를 눌렀는가'),
    );
    expect(
      ClassicalFounderQualityGate.observationChecklist,
      contains('감상지도의 열린 길/다음 길을 이해했는가'),
    );
    expect(ClassicalFounderQualityGate.decisionRule, contains('5명 중 3명'));
  });

  test(
    'first-use wow gate blocks Public V1 without strong discovery proof',
    () {
      DiscoveryEvent probe(
        String testerId, {
        required bool personal,
        required bool comeback,
        required bool bridge,
      }) {
        return _event(
          'feedback_submit',
          'app',
          'in-c',
          id: 'first-use-wow-$testerId',
          context: 'first_use_wow',
          properties: {
            'category': 'first_use_wow',
            'testerId': testerId,
            'personalRecommendation': personal.toString(),
            'knewWhatToHear': personal.toString(),
            'pathFeltNonRandom': bridge.toString(),
            'mapFeltPersonal': bridge.toString(),
            'tasteBridgeFeltNatural': bridge.toString(),
            'wouldReturnTomorrow': comeback.toString(),
          },
        );
      }

      final summary = ClassicalCatalogOpsSummary.fromCatalog(
        catalog: const SeedClassicalCatalogDataSource().loadCatalog(),
        recentEvents: [
          probe('u1', personal: true, comeback: true, bridge: true),
          probe('u2', personal: true, comeback: true, bridge: true),
          probe('u3', personal: true, comeback: true, bridge: true),
          probe('u4', personal: true, comeback: false, bridge: false),
          probe('u5', personal: false, comeback: false, bridge: false),
        ],
      );

      expect(summary.firstUseWowGate.ready, isTrue);
      expect(summary.firstUseWowGate.personalRecommendationCount, 4);
      expect(summary.firstUseWowGate.comebackReasonCount, 3);
      expect(
        summary.publicV1Closeout.gateItems
            .firstWhere((item) => item.id == 'first-use-wow')
            .passes,
        isTrue,
      );
      expect(
        summary.publicV1Closeout.evidenceText,
        contains('First-Use Wow: YES'),
      );
    },
  );

  test('first-use wow gate says no when personal start is weak', () {
    final events = List.generate(
      5,
      (index) => _event(
        'feedback_submit',
        'app',
        'in-c',
        id: 'weak-wow-$index',
        context: 'first_use_wow',
        properties: {
          'category': 'first_use_wow',
          'testerId': 'u$index',
          'personalRecommendation': (index < 3).toString(),
          'knewWhatToHear': 'true',
          'pathFeltNonRandom': 'true',
          'mapFeltPersonal': 'true',
          'tasteBridgeFeltNatural': 'true',
          'wouldReturnTomorrow': 'true',
        },
      ),
    );

    final gate = ClassicalFirstUseWowGate.fromEvents(events);

    expect(gate.ready, isFalse);
    expect(gate.exportText, contains('First-Use Wow: NO'));
    expect(ClassicalFirstUseWowGate.decisionRule, contains('5명 중 4명'));
  });

  test('founder pick 30 has listening map coverage', () {
    final summary = ClassicalCatalogOpsSummary.fromCatalog(
      catalog: const SeedClassicalCatalogDataSource().loadCatalog(),
      recentEvents: const [],
    );

    expect(summary.listeningMapNodeCount, greaterThanOrEqualTo(8));
    expect(summary.founderMapCoverageCount, 30);
    expect(summary.worksWithMapNodeCount, summary.workCount);
    expect(
      summary.listeningMapCopyCoverageCount,
      summary.listeningMapNodeCount,
    );
    expect(summary.minimumRecommendedWorksPerMapNode, greaterThan(0));
    expect(
      summary.publicV1Closeout.gateItems
          .firstWhere((item) => item.id == 'listening-map-founder-30')
          .passes,
      isTrue,
    );
    expect(
      summary.publicV1Closeout.gateItems
          .firstWhere((item) => item.id == 'listening-map-copy')
          .passes,
      isTrue,
    );
  });

  test(
    'catalog ops detects broken prerequisite refs in listening map shape',
    () {
      final summary = ClassicalCatalogOpsSummary.fromCatalog(
        catalog: const SeedClassicalCatalogDataSource().loadCatalog(),
        recentEvents: const [],
      );

      expect(summary.orphanMapNodeCount, greaterThanOrEqualTo(0));
      expect(
        summary.orphanMapNodeCount,
        lessThan(summary.listeningMapNodeCount),
      );
      expect(summary.brokenMapPrerequisiteCount, 0);
      expect(summary.beginnerPathCoverageCount, greaterThan(0));
    },
  );

  test(
    'link review policy separates safe search fallback from direct links',
    () {
      final work = ClassicalDiscoveryCatalog.workById('bach-air')!;
      final reviews = const ClassicalLinkReviewPolicy().reviewLinks(work);

      expect(
        reviews.firstWhere((review) => review.platformId == 'youtube').status,
        ClassicalProviderLinkStatus.safeSearchFallback,
      );
      expect(
        reviews.any(
          (review) =>
              review.status == ClassicalProviderLinkStatus.verifiedDirect,
        ),
        isFalse,
      );
    },
  );

  test('public copy review catches internal product terms', () {
    final review = ClassicalPublicCopyReadiness.fromStoreMetadata(
      const ClassicalStoreMetadataReadiness(
        appName: 'in C',
        subtitle: '오늘 하나씩 여는 클래식',
        shortDescription: 'CTA surface 없이 작품을 만납니다.',
        fullDescription: 'Catalog Ops copy should never reach the store.',
        keywords: ['클래식'],
        category: 'Music',
        ageRatingAssumption: '4+',
        permissionSummary: 'no microphone',
        privacySummary: 'no hosted audio',
        supportContact: 'support@mannlab.app',
        screenshotSurfaces: ['Today'],
        screenshotArtifactPaths: ['build/today.png'],
        excludedScreenshotSurfaces: ['Catalog Ops'],
        gaps: [],
      ),
    );

    expect(review.isVerified, isFalse);
    expect(review.issues, contains(contains('CTA')));
    expect(review.issues, contains(contains('Catalog Ops')));
  });

  test('link review warns when search URL is registered as direct', () {
    const policy = ClassicalLinkReviewPolicy();
    final review = policy.reviewProviderLink(
      platformId: 'youtube',
      label: 'YouTube',
      link: const ExternalLink(
        id: 'bad-direct',
        platformId: 'youtube',
        label: 'YouTube',
        url: 'https://www.youtube.com/results?search_query=Bach+Air',
        linkType: 'listen_direct',
      ),
    );

    expect(
      review.status,
      ClassicalProviderLinkStatus.searchUrlRegisteredAsDirect,
    );
    expect(review.warning, contains('검색 URL'));
  });

  test('host mismatch direct link is not counted as release-ready direct', () {
    final work = ClassicalDiscoveryCatalog.workById('bach-air')!.copyWith(
      externalLinks: const [
        ExternalLink(
          id: 'bad-spotify',
          platformId: 'spotify',
          label: 'Spotify',
          url: 'https://music.apple.com/album/example',
          linkType: 'listen_direct',
        ),
        ExternalLink(
          id: 'safe-youtube',
          platformId: 'youtube',
          label: 'YouTube',
          url: 'https://www.youtube.com/results?search_query=Bach+Air',
          linkType: 'listen_search',
        ),
      ],
    );
    final catalog = ClassicalCatalogSnapshot(
      composers: ClassicalDiscoveryCatalog.composers,
      works: [work],
      concerts: const [],
      promotions: const [],
    );

    final summary = ClassicalCatalogOpsSummary.fromCatalog(
      catalog: catalog,
      recentEvents: const [],
    );

    expect(summary.directReadyWorkCount, 0);
    expect(
      summary.directLinkReviewQueue.single.status,
      contains('hostMismatch'),
    );
  });

  test('preview review only approves non-search provider preview links', () {
    const policy = ClassicalLinkReviewPolicy();
    final searchPreview = policy.reviewProviderPreview(
      platformId: 'spotify',
      label: 'Spotify',
      link: const ExternalLink(
        id: 'search-preview',
        platformId: 'spotify',
        label: 'Spotify',
        url: 'https://open.spotify.com/search/Bach%20Air',
        linkType: 'listen_search',
        previewUrl: 'https://open.spotify.com/preview/example',
      ),
    );
    final approved = policy.reviewProviderPreview(
      platformId: 'spotify',
      label: 'Spotify',
      link: const ExternalLink(
        id: 'spotify-direct',
        platformId: 'spotify',
        label: 'Spotify',
        url: 'https://open.spotify.com/track/example',
        linkType: 'listen_direct',
        previewUrl: 'https://open.spotify.com/preview/example',
      ),
    );

    expect(searchPreview.status, ClassicalPreviewReviewStatus.needsReview);
    expect(approved.status, ClassicalPreviewReviewStatus.approvedPreview);
  });

  test(
    'concert program matcher exposes low confidence manual review matches',
    () {
      const matcher = ConcertProgramMatcher();
      final candidates = matcher.matchCandidates(
        programRawText: 'J. S. Bach recital',
        works: ClassicalDiscoveryCatalog.works,
      );

      expect(candidates, isNotEmpty);
      expect(
        candidates.map((candidate) => candidate.confidence),
        contains(ConcertProgramMatchConfidence.low),
      );
      expect(
        matcher.matchWorkIds(
          programRawText: 'J. S. Bach recital',
          works: ClassicalDiscoveryCatalog.works,
        ),
        isEmpty,
      );
    },
  );

  test('promotion report summary calculates local campaign metrics', () {
    final promotion = ClassicalDiscoveryCatalog.promotions.first;
    final concert = ClassicalDiscoveryCatalog.concertById(promotion.concertId)!;
    final events = <DiscoveryEvent>[
      _event('promotion_impression', 'promotion', promotion.id),
      _event('promotion_click', 'promotion', promotion.id),
      _event('concert_save', 'concert', concert.id),
      _event('promotion_dismiss', 'promotion', promotion.id),
      _event('ticket_destination_click', 'concert', concert.id),
    ];

    final report = const PromotionReportBuilder()
        .build(promotions: [promotion], concerts: [concert], events: events)
        .single;

    expect(report.impressions, 1);
    expect(report.clicks, 1);
    expect(report.saves, 1);
    expect(report.dismisses, 1);
    expect(report.ticketClicks, 1);
    expect(report.ctr, 1);
  });

  test('concert promotions are filtered by work relevance', () async {
    final controller = _controller();
    await controller.load();
    final work = controller.workById('beethoven-symphony-5')!;

    final views = controller.promotionsForWork(work);

    expect(views.first.promotion.id, 'promo-symphony-starter');
    expect(views.first.relevanceScore, greaterThan(0));
  });

  test('dismissed sponsored promotion drops in priority', () async {
    final controller = _controller();
    await controller.load();
    final work = controller.workById('beethoven-symphony-5')!;
    final first = controller.promotionsForWork(work).first;

    await controller.dismissPromotion(first.promotion.id);

    final afterDismiss = controller.promotionsForWork(work);
    final dismissed = afterDismiss.firstWhere(
      (view) => view.promotion.id == first.promotion.id,
    );
    expect(
      controller.state.dismissedPromotionIds,
      contains(first.promotion.id),
    );
    expect(dismissed.isDismissed, isTrue);
    expect(dismissed.relevanceScore, lessThan(first.relevanceScore));
    expect(controller.state.events.first.eventType, 'promotion_dismiss');
  });

  test('sync merge keeps latest work state and dedupes events', () {
    final oldTime = DateTime(2026, 8, 30);
    final newTime = DateTime(2026, 8, 31);
    final local = UserDiscoveryState.defaultState.copyWith(
      preferredPlatformId: 'youtube',
      preferencesUpdatedAt: oldTime,
      workStates: {
        'bach-air': UserWorkState(
          workId: 'bach-air',
          saved: false,
          familiarityLevel: 1,
          updatedAt: oldTime,
        ),
      },
      tasteIntakeItems: [
        TasteIntakeItem(
          id: 'taste-local',
          label: 'G선상의 아리아',
          rawInput: 'Bach Air',
          matchedWorkId: 'bach-air',
          matchedComposerId: 'bach',
          sourceType: 'catalog_match',
          confidence: 92,
          createdAt: oldTime,
        ),
      ],
      previewRoutes: [
        ConcertPreviewRoute(
          id: 'same-route',
          sourceType: ConcertPreviewRouteSourceType.seededConcert,
          concertId: 'concert-baroque-night',
          routeTitle: '바흐 10분 프리뷰',
          programWorkIds: const ['bach-air'],
          listeningMomentIds: const ['bach-air-30s'],
          totalPreviewMinutes: 1,
          hallListeningNotes: const ['G선상의 아리아: 첫 선율'],
          completionState: ConcertPreviewRouteCompletionState.ready,
          createdAt: oldTime,
          updatedAt: oldTime,
        ),
      ],
      postConcertReflections: [
        PostConcertReflection(
          id: 'reflection-local',
          concertId: 'concert-baroque-night',
          workId: 'bach-air',
          reactionType: 'liked',
          occurredAt: oldTime,
        ),
      ],
      events: [_event('work_view', 'work', 'bach-air', id: 'same-event')],
    );
    final remote = UserDiscoveryState.defaultState.copyWith(
      preferredPlatformId: 'spotify',
      preferencesUpdatedAt: newTime,
      reminderPreference: ReminderPreference.defaultPreference.copyWith(
        enabled: true,
        timeLabel: '21:00',
        updatedAt: newTime,
      ),
      workStates: {
        'bach-air': UserWorkState(
          workId: 'bach-air',
          saved: true,
          familiarityLevel: 3,
          updatedAt: newTime,
        ),
      },
      tasteIntakeItems: [
        TasteIntakeItem(
          id: 'taste-remote',
          label: '월광 소나타',
          rawInput: '월광',
          matchedWorkId: 'beethoven-moonlight',
          matchedComposerId: 'beethoven',
          sourceType: 'catalog_match',
          confidence: 100,
          createdAt: newTime,
        ),
      ],
      dismissedPromotionIds: {'promo-piano-evening'},
      previewRoutes: [
        ConcertPreviewRoute(
          id: 'same-route',
          sourceType: ConcertPreviewRouteSourceType.seededConcert,
          concertId: 'concert-baroque-night',
          routeTitle: '바흐 10분 프리뷰',
          programWorkIds: const ['bach-air', 'bach-cello-suite-1-prelude'],
          listeningMomentIds: const ['bach-air-30s'],
          totalPreviewMinutes: 2,
          hallListeningNotes: const ['G선상의 아리아: 첫 선율'],
          completionState: ConcertPreviewRouteCompletionState.completed,
          createdAt: oldTime,
          updatedAt: newTime,
        ),
      ],
      postConcertReflections: [
        PostConcertReflection(
          id: 'reflection-local',
          concertId: 'concert-baroque-night',
          workId: 'bach-air',
          reactionType: 'liked',
          occurredAt: oldTime,
        ),
      ],
      events: [_event('work_view', 'work', 'bach-air', id: 'same-event')],
    );

    final merged = const DiscoveryStateMerger().merge(local, remote);

    expect(merged.preferredPlatformId, 'spotify');
    expect(merged.reminderPreference.enabled, isTrue);
    expect(merged.reminderPreference.timeLabel, '21:00');
    expect(merged.stateForWork('bach-air').saved, isTrue);
    expect(merged.dismissedPromotionIds, contains('promo-piano-evening'));
    expect(merged.tasteIntakeItems.map((item) => item.id), [
      'taste-remote',
      'taste-local',
    ]);
    expect(merged.previewRoutes.single.programWorkIds, contains('bach-air'));
    expect(merged.postConcertReflections.length, 1);
    expect(merged.events.length, 1);
  });

  test('admin catalog command validator blocks invalid edit commands', () {
    const validator = AdminCatalogCommandValidator();

    expect(
      validator
          .validate(
            const AdminCatalogCommand(
              type: 'external_link_upsert',
              entityId: 'bach-air',
              fields: {'platformId': 'youtube'},
            ),
          )
          .isValid,
      isFalse,
    );
    expect(
      validator
          .validate(
            const AdminCatalogCommand(
              type: 'promotion_update',
              entityId: 'promo-1',
              fields: {'active': 'false'},
            ),
          )
          .isValid,
      isTrue,
    );
  });

  test(
    'admin catalog reducer applies link, concert, and promotion commands',
    () {
      final catalog = const SeedClassicalCatalogDataSource().loadCatalog();
      const reducer = AdminCatalogCommandReducer();

      final linked = reducer.apply(
        catalog,
        const AdminCatalogCommand(
          type: 'external_link_upsert',
          entityId: 'bach-air',
          fields: {
            'platformId': 'youtube',
            'url': 'https://example.com/bach-air-preview',
            'previewUrl': 'https://example.com/bach-air.mp3',
          },
        ),
      );
      final updatedWork = linked.catalog.works.firstWhere(
        (work) => work.id == 'bach-air',
      );
      expect(linked.applied, isTrue);
      expect(
        updatedWork.externalLinks
            .firstWhere((link) => link.id == 'bach-air-youtube')
            .previewUrl,
        'https://example.com/bach-air.mp3',
      );

      final concert = reducer.apply(
        linked.catalog,
        const AdminCatalogCommand(
          type: 'concert_program_raw_text_update',
          entityId: 'concert-baroque-night',
          fields: {'programRawText': 'Bach Air and Cello Suite Prelude'},
        ),
      );
      expect(
        concert.catalog.concerts
            .firstWhere((item) => item.id == 'concert-baroque-night')
            .programRawText,
        contains('Cello Suite'),
      );

      final paused = reducer.apply(
        concert.catalog,
        const AdminCatalogCommand(
          type: 'promotion_pause',
          entityId: 'promo-piano-evening',
        ),
      );
      expect(
        paused.catalog.promotions.map((promo) => promo.id),
        isNot(contains('promo-piano-evening')),
      );
    },
  );

  test('KOPIS fixture parser maps program text to known works', () {
    final concerts = KopisConcertImportSource(
      fixtureRows: const [
        {
          'mt20id': 'PF123',
          'prfnm': '바흐와 현의 밤',
          'fcltynm': '예술의전당 IBK챔버홀',
          'area': '서울특별시',
          'prfpdfrom': '2026.10.01',
          'prfcast': '앙상블 인 C, 김하늘',
          'pcseguidance': 'Bach Cello Suite No. 1 Prelude; Bach Air',
        },
      ],
      works: ClassicalDiscoveryCatalog.works,
    ).loadConcerts();

    expect(concerts.single.id, 'kopis-PF123');
    expect(concerts.single.region, '서울');
    expect(
      concerts.single.programWorkIds,
      containsAll(['bach-cello-suite-1-prelude', 'bach-air']),
    );
    expect(concerts.single.ticketDestinations.single.label, 'KOPIS');
  });

  testWidgets('in C app shell renders the discovery root', (tester) async {
    final controller = _controller();
    await controller.load();

    await tester.pumpWidget(ClassicalDiscoveryApp(controller: controller));
    await tester.pumpAndSettle();

    expect(find.text('in C'), findsOneWidget);
    expect(find.text('Preview'), findsOneWidget);
    expect(find.text('오늘의 한 곡'), findsWidgets);
  });

  testWidgets('Daily primary action stays above link-out action', (
    tester,
  ) async {
    final controller = _controller();
    await controller.load();
    await controller.skipOnboarding();

    await tester.pumpWidget(ClassicalDiscoveryApp(controller: controller));
    await tester.pumpAndSettle();

    final preview = find.byKey(const ValueKey('daily-listening-step-preview'));
    final linkOut = find.byKey(const ValueKey('daily-listening-step-link-out'));

    expect(preview, findsOneWidget);
    expect(linkOut, findsOneWidget);
    expect(find.text('귀 트임'), findsOneWidget);
    expect(
      tester.getTopLeft(preview).dy,
      lessThan(tester.getTopLeft(linkOut).dy),
    );
  });

  testWidgets('Catalog Ops exposes Founder Test Mode checklist', (
    tester,
  ) async {
    final controller = _controller();
    await controller.load();
    await controller.skipOnboarding();

    await tester.pumpWidget(ClassicalDiscoveryApp(controller: controller));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Catalog Ops'));
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.text('Founder Test Mode'),
      500,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.pumpAndSettle();

    expect(find.text('Founder Test Mode'), findsOneWidget);
    expect(find.textContaining('5명 중 3명'), findsOneWidget);
    expect(find.textContaining('Daily 30초'), findsWidgets);
  });

  testWidgets('Catalog Ops exposes First-Use Wow Gate checklist', (
    tester,
  ) async {
    final controller = _controller();
    await controller.load();
    await controller.skipOnboarding();

    await tester.pumpWidget(ClassicalDiscoveryApp(controller: controller));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Catalog Ops'));
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.text('First-Use Wow Gate'),
      500,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.pumpAndSettle();

    expect(find.text('First-Use Wow Gate'), findsOneWidget);
    expect(find.textContaining('5명 중 4명'), findsOneWidget);
    expect(find.textContaining('첫 추천이 내 입력'), findsOneWidget);
  });

  testWidgets('My Music empty state shows listening map start copy', (
    tester,
  ) async {
    final controller = _controller();
    await controller.load();
    await controller.skipOnboarding();

    await tester.pumpWidget(ClassicalDiscoveryApp(controller: controller));
    await tester.pumpAndSettle();
    await tester.tap(find.text('My Music'));
    await tester.pumpAndSettle();

    expect(find.text('내 감상지도'), findsWidgets);
    expect(find.text('아직 지도는 비어 있어요'), findsOneWidget);
    expect(find.textContaining('좋아하는 음악 하나'), findsOneWidget);
  });

  testWidgets('My Music non-empty state shows current listening position', (
    tester,
  ) async {
    final controller = _controller();
    await controller.load();
    await controller.skipOnboarding();
    await controller.addTasteIntakeInputs(['영화음악']);

    await tester.pumpWidget(ClassicalDiscoveryApp(controller: controller));
    await tester.pumpAndSettle();
    await tester.tap(find.text('My Music'));
    await tester.pumpAndSettle();

    expect(find.text('내 감상지도'), findsWidgets);
    expect(find.textContaining('열린 길'), findsWidgets);
    expect(find.textContaining('장면이 바뀌는 길'), findsWidgets);
    expect(find.text('오늘 이어갈 하나'), findsOneWidget);
  });

  testWidgets('Work Detail shows listening map role and next path', (
    tester,
  ) async {
    final controller = _controller();
    await controller.load();
    final work = ClassicalDiscoveryCatalog.workById('bach-air')!;

    await tester.pumpWidget(
      MaterialApp(
        home: ClassicalWorkDetailScreen(controller: controller, work: work),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('감상지도에서'), findsOneWidget);
    expect(find.textContaining('놓인 작품입니다'), findsOneWidget);
    expect(find.text('다음에 이어질 작품'), findsOneWidget);
  });

  testWidgets('onboarding taste input shows first reward immediately', (
    tester,
  ) async {
    final controller = _controller();
    await controller.load();

    await tester.pumpWidget(ClassicalDiscoveryApp(controller: controller));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const ValueKey('taste-intake-field')),
      '영화음악',
    );
    await tester.pumpAndSettle();

    expect(find.text('내 감상 시작점'), findsOneWidget);
    expect(find.text('오늘은 이 30초부터'), findsOneWidget);
    expect(find.textContaining('영화음악'), findsWidgets);
    expect(find.textContaining('다음 길'), findsWidgets);
  });

  testWidgets('program paste flow previews match candidates from home', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(900, 1000));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final controller = _controller();
    await controller.load();
    await controller.skipOnboarding();

    await tester.pumpWidget(ClassicalDiscoveryApp(controller: controller));
    await tester.pumpAndSettle();
    await tester.drag(find.byType(ListView).first, const Offset(0, -260));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('open-program-paste-sheet')));
    await tester.pumpAndSettle();
    expect(find.text('공연 프로그램 붙여넣기'), findsOneWidget);
    await tester.enterText(
      find.byType(TextField).last,
      'Bach Cello Suite No. 1 Prelude\nBach Air',
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('매칭 후보'), findsOneWidget);
    expect(find.text('G선상의 아리아'), findsWidgets);
  });

  testWidgets('moment preview sheet opens before external listening', (
    tester,
  ) async {
    final controller = _controller();
    await controller.load();
    await controller.skipOnboarding();

    await tester.pumpWidget(ClassicalDiscoveryApp(controller: controller));
    await tester.pumpAndSettle();
    await tester.tap(find.text('30초 포인트 보기').first);
    await tester.pumpAndSettle();

    expect(find.text('처음 붙잡을 30초'), findsOneWidget);
    expect(
      controller.state.events.first.eventType,
      'listening_moment_preview_open',
    );
  });

  testWidgets('unapproved preview URL does not show playback CTA', (
    tester,
  ) async {
    final work = ClassicalDiscoveryCatalog.workById('bach-air')!.copyWith(
      externalLinks: const [
        ExternalLink(
          id: 'spotify-search-preview',
          platformId: 'spotify',
          label: 'Spotify',
          url: 'https://open.spotify.com/search/Bach%20Air',
          linkType: 'listen_search',
          previewUrl: 'https://open.spotify.com/preview/example',
        ),
      ],
    );
    final controller = ClassicalDiscoveryController(
      store: _MemoryDiscoveryStore(),
      works: [work],
      composers: ClassicalDiscoveryCatalog.composers,
      concerts: const [],
      promotions: const [],
      notificationGateway: const DisabledClassicalDailyNotificationGateway(),
    );
    await controller.load();
    await controller.skipOnboarding();
    await controller.setPreferredPlatform('spotify');

    await tester.pumpWidget(ClassicalDiscoveryApp(controller: controller));
    await tester.pumpAndSettle();
    await tester.tap(find.text('30초 포인트 보기').first);
    await tester.pumpAndSettle();

    expect(find.text('Preview 재생'), findsNothing);
    expect(find.text('Spotify에서 검색'), findsWidgets);
  });

  testWidgets('sponsored concert card opens concert detail from Today', (
    tester,
  ) async {
    final moonlightIndex = ClassicalDiscoveryCatalog.works.indexWhere(
      (work) => work.id == 'beethoven-moonlight',
    );
    final controller = _controller(
      clock: () => DateTime(2026).add(Duration(days: moonlightIndex)),
    );
    await controller.load();
    await controller.skipOnboarding();

    await tester.pumpWidget(ClassicalDiscoveryApp(controller: controller));
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.text('이 작품을 실제로 들을 수 있는 공연'),
      500,
      scrollable: find.byWidgetPredicate(
        (widget) =>
            widget is Scrollable && widget.axisDirection == AxisDirection.down,
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('피아노로 시작하는 클래식 나이트').first);
    await tester.pumpAndSettle();

    expect(find.text('프로그램'), findsOneWidget);
    expect(controller.state.events.first.eventType, 'promotion_click');
  });

  testWidgets('feedback sheet records launch feedback from the app shell', (
    tester,
  ) async {
    final controller = _controller();
    await controller.load();
    await controller.skipOnboarding();

    await tester.pumpWidget(ClassicalDiscoveryApp(controller: controller));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('의견 보내기'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).last, '오늘 화면은 괜찮았어요.');
    await tester.tap(find.text('보내기'));
    await tester.pumpAndSettle();

    expect(controller.state.events.first.eventType, 'feedback_submit');
    expect(
      controller.state.events.first.properties['category'],
      'product_quality',
    );
    expect(find.text('의견을 남겼습니다.'), findsOneWidget);
  });
}

ClassicalDiscoveryController _controller({
  _MemoryDiscoveryStore? store,
  DateTime Function()? clock,
  ClassicalDailyNotificationGateway? notificationGateway,
}) {
  return ClassicalDiscoveryController(
    store: store ?? _MemoryDiscoveryStore(),
    clock: clock,
    notificationGateway:
        notificationGateway ??
        const DisabledClassicalDailyNotificationGateway(),
  );
}

class _FakeDailyNotificationGateway
    implements ClassicalDailyNotificationGateway {
  _FakeDailyNotificationGateway({
    this.permissionStatus = 'granted',
    this.launchPayload,
  });

  final String permissionStatus;
  String? launchPayload;
  DailyPickNotificationRequest? scheduledRequest;
  var cancelled = false;

  @override
  Future<void> cancelDailyPick() async {
    cancelled = true;
    scheduledRequest = null;
  }

  @override
  Future<String?> consumeLaunchPayload() async {
    final payload = launchPayload;
    launchPayload = null;
    return payload;
  }

  @override
  Future<String> requestPermission() async => permissionStatus;

  @override
  Future<void> scheduleDailyPick(DailyPickNotificationRequest request) async {
    scheduledRequest = request;
  }
}

class _MemoryDiscoveryStore extends ClassicalDiscoveryStore {
  UserDiscoveryState savedState = UserDiscoveryState.defaultState;

  @override
  Future<UserDiscoveryState> loadState() async => savedState;

  @override
  Future<void> saveState(UserDiscoveryState state) async {
    savedState = state;
  }
}

DiscoveryEvent _event(
  String eventType,
  String entityType,
  String entityId, {
  String? id,
  String? context,
  Map<String, String> properties = const <String, String>{},
}) {
  return DiscoveryEvent(
    id: id ?? '$eventType-$entityId',
    eventType: eventType,
    entityType: entityType,
    entityId: entityId,
    context: context,
    properties: properties,
    occurredAt: DateTime(2026, 8, 31),
  );
}

const _jsonCatalogSample = '''
{
  "composers": [
    {
      "id": "sample-composer",
      "nameKo": "샘플 작곡가",
      "nameOriginal": "Sample Composer",
      "period": "근현대",
      "aliases": ["Sample"]
    }
  ],
  "works": [
    {
      "id": "sample-work",
      "titleKo": "샘플 작품",
      "titleOriginal": "Sample Work",
      "composerId": "sample-composer",
      "composerNameKo": "샘플 작곡가",
      "composerNameOriginal": "Sample Composer",
      "period": "근현대",
      "instrumentation": "피아노",
      "durationSeconds": 240,
      "catalogNumber": "S. 1",
      "movements": [
        {"id": "sample-work-main", "title": "Main", "order": 1, "durationSeconds": 240}
      ],
      "moodTags": ["밤"],
      "contextTags": ["처음 듣기"],
      "difficultyForListening": 1,
      "aliases": ["Sample Piece"],
      "listeningMoments": [
        {
          "id": "sample-work-30s",
          "label": "처음 붙잡을 30초",
          "startSeconds": 0,
          "endSeconds": 30,
          "prompt": "첫 화음을 들어보세요.",
          "tags": ["피아노"],
          "recommendedRecordingId": "sample-recording",
          "fallbackExternalLinkId": "sample-youtube"
        },
        {
          "id": "sample-work-3m",
          "label": "3분으로 익숙해지기",
          "startSeconds": 0,
          "endSeconds": 180,
          "prompt": "선율이 돌아오는지 들어보세요.",
          "tags": ["repeat"]
        }
      ],
      "externalLinks": [
        {
          "id": "sample-youtube",
          "platformId": "youtube",
          "label": "YouTube",
          "url": "https://www.youtube.com/results?search_query=Sample+Work",
          "linkType": "listen",
          "previewUrl": "https://example.com/preview.mp3"
        },
        {"id": "sample-spotify", "platformId": "spotify", "label": "Spotify", "url": "https://open.spotify.com/search/Sample%20Work", "linkType": "listen"},
        {"id": "sample-apple", "platformId": "apple-music", "label": "Apple Music", "url": "https://music.apple.com/search?term=Sample%20Work", "linkType": "listen"}
      ],
      "recordings": [
        {"id": "sample-recording", "provider": "YouTube", "title": "Sample Work", "performer": "Sample Performer", "url": "https://example.com", "displayPriority": 1}
      ],
      "relatedWorkIds": [],
      "scoreLinks": [
        {"id": "sample-score", "platformId": "imslp", "label": "Score", "url": "https://imslp.org", "linkType": "score"}
      ],
      "concertIds": ["sample-concert"]
    }
  ],
  "concerts": [
    {
      "id": "sample-concert",
      "title": "Sample Concert",
      "venue": "Sample Hall",
      "region": "서울",
      "startsAt": "2026-09-01T19:30:00",
      "performers": ["Sample Performer"],
      "programWorkIds": ["sample-work"],
      "composerIds": ["sample-composer"],
      "instrumentTags": ["피아노"],
      "ticketUrl": "https://example.com/tickets",
      "programRawText": "Sample Composer Sample Work S. 1"
    }
  ],
  "promotions": [
    {
      "id": "sample-promo",
      "concertId": "sample-concert",
      "advertiserName": "Sample Hall",
      "sponsorLabel": "Sponsored 공연",
      "targetWorkIds": ["sample-work"],
      "targetComposerIds": ["sample-composer"],
      "targetInstruments": ["피아노"],
      "targetRegions": ["서울"]
    }
  ]
}
''';
