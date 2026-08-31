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
    expect(ClassicalDiscoveryCatalog.works.length, greaterThanOrEqualTo(50));
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
    },
  );

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
  });

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
    await tester.tap(find.text('30초 듣기 열기').first);
    await tester.pumpAndSettle();

    expect(find.text('처음 붙잡을 30초'), findsOneWidget);
    expect(
      controller.state.events.first.eventType,
      'listening_moment_preview_open',
    );
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
}) {
  return DiscoveryEvent(
    id: id ?? '$eventType-$entityId',
    eventType: eventType,
    entityType: entityType,
    entityId: entityId,
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
