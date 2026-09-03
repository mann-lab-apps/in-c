import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/classical_admin_commands.dart';
import 'package:in_c_sheet/classical_concert_import.dart';
import 'package:in_c_sheet/classical_discovery_app.dart';
import 'package:in_c_sheet/classical_discovery_catalog.dart';
import 'package:in_c_sheet/classical_discovery_controller.dart';
import 'package:in_c_sheet/classical_discovery_data_source.dart';
import 'package:in_c_sheet/classical_discovery_models.dart';
import 'package:in_c_sheet/classical_discovery_ops.dart';
import 'package:in_c_sheet/classical_discovery_repository.dart';
import 'package:in_c_sheet/classical_discovery_store.dart';
import 'package:in_c_sheet/classical_discovery_validation.dart';
import 'package:in_c_sheet/classical_promotion_reporting.dart';
import 'package:in_c_sheet/classical_preview_player.dart';

void main() {
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
      );
      final reloaded = _controller(store: store);
      await reloaded.load();

      expect(reloaded.state.onboardingCompleted, isTrue);
      expect(reloaded.preferredPlatformId, 'spotify');
      expect(reloaded.region, '부산');
      expect(
        reloaded.discoverShelves().map((shelf) => shelf.id),
        containsAll(['preferred-instruments', 'preferred-context']),
      );
      expect(reloaded.state.events.first.eventType, 'onboarding_complete');
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
      expect(controller.state.events[1].eventType, 'external_platform_click');
      expect(controller.state.events[1].properties['providerId'], 'youtube');
      expect(
        controller.state.events[1].properties['linkType'],
        'listen_search',
      );
      expect(controller.state.events[1].properties['fallback'], 'false');
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
    expect(summary.appIdentityReadiness.isVerified, isFalse);
    expect(summary.appIdentityReadiness.appName, 'in C');
    expect(
      summary.appIdentityReadiness.iconStatus,
      contains('Darezzo C clef icon applied'),
    );
    expect(
      summary.appIdentityReadiness.androidApplicationId,
      'com.mannlab.clef',
    );
    expect(summary.appIdentityReadiness.targetAppName, 'in C');
    expect(
      summary.appIdentityReadiness.targetAndroidApplicationId,
      'com.mannlab.inc',
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
      events: [_event('work_view', 'work', 'bach-air', id: 'same-event')],
    );
    final remote = UserDiscoveryState.defaultState.copyWith(
      preferredPlatformId: 'spotify',
      preferencesUpdatedAt: newTime,
      workStates: {
        'bach-air': UserWorkState(
          workId: 'bach-air',
          saved: true,
          familiarityLevel: 3,
          updatedAt: newTime,
        ),
      },
      dismissedPromotionIds: {'promo-piano-evening'},
      events: [_event('work_view', 'work', 'bach-air', id: 'same-event')],
    );

    final merged = const DiscoveryStateMerger().merge(local, remote);

    expect(merged.preferredPlatformId, 'spotify');
    expect(merged.stateForWork('bach-air').saved, isTrue);
    expect(merged.dismissedPromotionIds, contains('promo-piano-evening'));
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
    expect(find.text('Today'), findsOneWidget);
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
}) {
  return ClassicalDiscoveryController(
    store: store ?? _MemoryDiscoveryStore(),
    clock: clock,
  );
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
