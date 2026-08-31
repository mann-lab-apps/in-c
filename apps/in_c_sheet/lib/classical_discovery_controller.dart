import 'package:flutter/foundation.dart';

import 'classical_discovery_catalog.dart';
import 'classical_discovery_data_source.dart';
import 'classical_discovery_models.dart';
import 'classical_discovery_store.dart';

typedef ClassicalDiscoveryClock = DateTime Function();

class ClassicalPromotionView {
  const ClassicalPromotionView({
    required this.promotion,
    required this.concert,
    required this.relevanceScore,
    required this.isDismissed,
    required this.isSaved,
  });

  final ConcertPromotion promotion;
  final ClassicalConcert concert;
  final int relevanceScore;
  final bool isDismissed;
  final bool isSaved;
}

class ClassicalDiscoveryController extends ChangeNotifier {
  ClassicalDiscoveryController({
    required this.store,
    List<ClassicalComposer>? composers,
    List<ClassicalWork>? works,
    List<ClassicalConcert>? concerts,
    List<ConcertPromotion>? promotions,
    ClassicalDiscoveryClock? clock,
  }) : _composers = composers ?? ClassicalDiscoveryCatalog.composers,
       _works = works ?? ClassicalDiscoveryCatalog.works,
       _concerts = concerts ?? ClassicalDiscoveryCatalog.concerts,
       _promotions = promotions ?? ClassicalDiscoveryCatalog.promotions,
       _clock = clock ?? DateTime.now;

  factory ClassicalDiscoveryController.fromDataSource({
    required ClassicalDiscoveryStore store,
    required ClassicalCatalogDataSource dataSource,
    ClassicalDiscoveryClock? clock,
  }) {
    final catalog = dataSource.loadCatalog();
    return ClassicalDiscoveryController(
      store: store,
      composers: catalog.composers,
      works: catalog.works,
      concerts: catalog.concerts,
      promotions: catalog.promotions,
      clock: clock,
    );
  }

  final ClassicalDiscoveryStore store;
  final List<ClassicalComposer> _composers;
  final List<ClassicalWork> _works;
  final List<ClassicalConcert> _concerts;
  final List<ConcertPromotion> _promotions;
  final ClassicalDiscoveryClock _clock;

  UserDiscoveryState _state = UserDiscoveryState.defaultState;
  bool _isLoading = true;

  List<ClassicalComposer> get composers =>
      List<ClassicalComposer>.unmodifiable(_composers);
  List<ClassicalWork> get works => List<ClassicalWork>.unmodifiable(_works);
  List<ClassicalConcert> get concerts =>
      List<ClassicalConcert>.unmodifiable(_concerts);
  List<ConcertPromotion> get promotions =>
      List<ConcertPromotion>.unmodifiable(_promotions);
  ClassicalCatalogSnapshot get catalogSnapshot => ClassicalCatalogSnapshot(
    composers: composers,
    works: works,
    concerts: concerts,
    promotions: promotions,
  );
  UserDiscoveryState get state => _state;
  bool get isLoading => _isLoading;
  String get preferredPlatformId => _state.preferredPlatformId;
  String get region => _state.region;
  bool get needsOnboarding => !_state.onboardingCompleted;

  ClassicalWork get todayWork {
    final savedDue = repeatDueWorks();
    if (savedDue.isNotEmpty) {
      return savedDue.first;
    }
    final day = _clock().difference(DateTime(2026)).inDays;
    return _works[day.abs() % _works.length];
  }

  List<ClassicalWork> get savedWorks {
    final saved = _works
        .where((work) => _state.stateForWork(work.id).saved)
        .toList(growable: false);
    saved.sort((a, b) {
      final aState = _state.stateForWork(a.id);
      final bState = _state.stateForWork(b.id);
      final aDate = aState.lastListenedAt ?? aState.firstListenedAt;
      final bDate = bState.lastListenedAt ?? bState.firstListenedAt;
      if (aDate == null && bDate == null) {
        return a.titleKo.compareTo(b.titleKo);
      }
      if (aDate == null) {
        return 1;
      }
      if (bDate == null) {
        return -1;
      }
      return bDate.compareTo(aDate);
    });
    return saved;
  }

  Set<String> get listenedComposerIds {
    return _state.reactions
        .map((reaction) => workById(reaction.workId)?.composerId)
        .whereType<String>()
        .toSet();
  }

  Set<String> get interestedInstruments {
    return savedWorks.map((work) => work.instrumentation).toSet();
  }

  Future<void> load() async {
    _isLoading = true;
    notifyListeners();
    _state = await store.loadState();
    _isLoading = false;
    notifyListeners();
  }

  ClassicalWork? workById(String id) {
    for (final work in _works) {
      if (work.id == id) {
        return work;
      }
    }
    return null;
  }

  ClassicalConcert? concertById(String id) {
    for (final concert in _concerts) {
      if (concert.id == id) {
        return concert;
      }
    }
    return null;
  }

  List<ClassicalWork> searchWorks(String query) {
    final results = _works.where((work) => work.matchesQuery(query)).toList();
    results.sort((a, b) {
      final rank = b.searchScore(query).compareTo(a.searchScore(query));
      if (rank != 0) {
        return rank;
      }
      final aSaved = _state.stateForWork(a.id).saved ? 0 : 1;
      final bSaved = _state.stateForWork(b.id).saved ? 0 : 1;
      final saved = aSaved.compareTo(bSaved);
      if (saved != 0) {
        return saved;
      }
      return a.titleKo.compareTo(b.titleKo);
    });
    return results;
  }

  Future<void> startMoment(String workId, String momentId) async {
    await _setState(
      _state.copyWith(
        events: _withEvent(
          'listening_moment_start',
          'work',
          workId,
          context: momentId,
        ),
      ),
    );
  }

  Future<void> recordMomentPreviewOpen(String workId, String momentId) async {
    await _setState(
      _state.copyWith(
        events: _withEvent(
          'listening_moment_preview_open',
          'work',
          workId,
          context: momentId,
        ),
      ),
    );
  }

  Future<void> recordMomentCancel(String workId, String momentId) async {
    await _setState(
      _state.copyWith(
        events: _withEvent(
          'listening_moment_cancel',
          'work',
          workId,
          context: momentId,
        ),
      ),
    );
  }

  Future<void> recordPreviewPlay(
    String workId,
    String momentId, {
    String? previewUrl,
  }) async {
    await _setState(
      _state.copyWith(
        events: _withEvent(
          'preview_play',
          'work',
          workId,
          context: momentId,
          properties: previewUrl == null
              ? const <String, String>{}
              : <String, String>{'previewUrl': previewUrl},
        ),
      ),
    );
  }

  Future<void> recordPreviewPause(String workId, String momentId) async {
    await _setState(
      _state.copyWith(
        events: _withEvent('preview_pause', 'work', workId, context: momentId),
      ),
    );
  }

  Future<void> recordPreviewError(
    String workId,
    String momentId,
    String message,
  ) async {
    await _setState(
      _state.copyWith(
        events: _withEvent(
          'preview_error',
          'work',
          workId,
          context: momentId,
          properties: <String, String>{'message': message},
        ),
      ),
    );
  }

  List<ClassicalWork> repeatDueWorks({DateTime? now}) {
    final effectiveNow = now ?? _clock();
    final due = savedWorks.where((work) {
      final repeatDueAt = _state.stateForWork(work.id).repeatDueAt;
      return repeatDueAt != null && !repeatDueAt.isAfter(effectiveNow);
    }).toList();
    due.sort((a, b) {
      final aDue = _state.stateForWork(a.id).repeatDueAt!;
      final bDue = _state.stateForWork(b.id).repeatDueAt!;
      return aDue.compareTo(bDue);
    });
    return due;
  }

  List<RecommendationShelf> shelvesForWork(ClassicalWork anchor) {
    return <RecommendationShelf>[
      RecommendationShelf(
        id: 'for-${anchor.id}',
        title: '이 작품이 괜찮았다면',
        works: _recommendFor(anchor, maxCount: 6),
      ),
      RecommendationShelf(
        id: 'composer-${anchor.composerId}',
        title: '같은 작곡가로 하나 더',
        works: _works
            .where((work) => work.id != anchor.id)
            .where((work) => work.composerId == anchor.composerId)
            .take(6)
            .toList(growable: false),
      ),
      RecommendationShelf(
        id: 'instrument-${anchor.instrumentation}',
        title: '${anchor.instrumentation}로 계속 듣기',
        works: _works
            .where((work) => work.id != anchor.id)
            .where((work) => work.instrumentation == anchor.instrumentation)
            .take(6)
            .toList(growable: false),
      ),
      RecommendationShelf(
        id: 'concert-ready',
        title: '이번 주 공연 전에 들어둘 작품',
        works: _works
            .where((work) => work.id != anchor.id)
            .where((work) => work.concertIds.isNotEmpty)
            .take(6)
            .toList(growable: false),
      ),
    ].where((shelf) => shelf.works.isNotEmpty).toList(growable: false);
  }

  List<RecommendationShelf> discoverShelves() {
    final shelves = <RecommendationShelf>[
      RecommendationShelf(
        id: 'starter',
        title: '처음 듣기 좋은 작품',
        reason: '검색어 없이 바로 시작하기 좋습니다.',
        source: 'starter',
        works: _works
            .where((work) => work.contextTags.contains('처음 듣기'))
            .take(8)
            .toList(growable: false),
      ),
      RecommendationShelf(
        id: 'quick-3m',
        title: '3분 안에 붙잡히는 작품',
        reason: '짧고 익숙한 구간부터 들어갑니다.',
        source: 'quick',
        works: _works
            .where((work) => work.durationSeconds <= 360)
            .take(8)
            .toList(growable: false),
      ),
      if (_state.preferredInstruments.isNotEmpty)
        RecommendationShelf(
          id: 'preferred-instruments',
          title: '${_state.preferredInstruments.first}로 시작하기',
          reason: '온보딩에서 고른 관심 악기를 반영했습니다.',
          source: 'onboarding',
          works: _works
              .where(
                (work) =>
                    _state.preferredInstruments.contains(work.instrumentation),
              )
              .take(8)
              .toList(growable: false),
        ),
      if (_state.preferredMoodTags.isNotEmpty ||
          _state.preferredContextTags.isNotEmpty)
        RecommendationShelf(
          id: 'preferred-context',
          title: '지금 취향에 가까운 작품',
          reason: '선호 mood/context를 기준으로 골랐습니다.',
          source: 'preference',
          works: _works
              .where(
                (work) =>
                    work.moodTags
                        .toSet()
                        .intersection(_state.preferredMoodTags)
                        .isNotEmpty ||
                    work.contextTags
                        .toSet()
                        .intersection(_state.preferredContextTags)
                        .isNotEmpty,
              )
              .take(8)
              .toList(growable: false),
        ),
      if (savedWorks.isNotEmpty)
        RecommendationShelf(
          id: 'from-saved',
          title: '저장한 작품과 닮은 곡',
          reason: '내 라이브러리에 쌓인 작품에서 확장합니다.',
          source: 'saved',
          works: _recommendFor(savedWorks.first, maxCount: 8),
        ),
      RecommendationShelf(
        id: 'piano',
        title: '피아노로 시작하기',
        reason: '입문자가 붙잡기 쉬운 독주/건반 작품입니다.',
        source: 'instrument',
        works: _works
            .where((work) => work.instrumentation == '피아노')
            .take(8)
            .toList(growable: false),
      ),
      RecommendationShelf(
        id: 'night',
        title: '밤에 듣기 좋은 곡',
        reason: '느린 호흡과 부드러운 선율 중심입니다.',
        source: 'mood',
        works: _works
            .where((work) => work.moodTags.contains('밤'))
            .take(8)
            .toList(growable: false),
      ),
      RecommendationShelf(
        id: 'concert',
        title: '공연 전 들어둘 작품',
        reason: '현재 공연 data와 연결된 작품입니다.',
        source: 'concert',
        works: _works
            .where((work) => work.contextTags.contains('공연 전'))
            .take(8)
            .toList(growable: false),
      ),
      RecommendationShelf(
        id: 'after-today',
        title: '오늘의 작품 다음에 듣기',
        reason: '오늘의 작품에서 자연스럽게 이어집니다.',
        source: 'today',
        works: _recommendFor(todayWork, maxCount: 8),
      ),
    ];
    return shelves.where((shelf) => shelf.works.isNotEmpty).toList();
  }

  List<ClassicalPromotionView> promotionsForWork(ClassicalWork work) {
    final views = <ClassicalPromotionView>[];
    for (final promotion in _promotions) {
      final concert = concertById(promotion.concertId);
      if (concert == null) {
        continue;
      }
      final promotionScore = promotion.relevanceScoreFor(
        work,
        region: _state.region,
      );
      final concertScore = concert.isRelevantToWork(work, region: _state.region)
          ? 1
          : 0;
      var score = promotionScore + concertScore;
      final isDismissed = _state.dismissedPromotionIds.contains(promotion.id);
      if (isDismissed) {
        score -= 8;
      }
      if (score <= 0) {
        continue;
      }
      views.add(
        ClassicalPromotionView(
          promotion: promotion,
          concert: concert,
          relevanceScore: score,
          isDismissed: isDismissed,
          isSaved: _state.savedConcertIds.contains(concert.id),
        ),
      );
    }
    views.sort((a, b) => b.relevanceScore.compareTo(a.relevanceScore));
    return views;
  }

  List<ClassicalConcert> concertsForInterests() {
    final savedWorkIds = savedWorks.map((work) => work.id).toSet();
    final composerIds = savedWorks.map((work) => work.composerId).toSet();
    final instruments = savedWorks.map((work) => work.instrumentation).toSet();
    final scored = <({ClassicalConcert concert, int score})>[];
    for (final concert in _concerts) {
      var score = 0;
      score +=
          concert.programWorkIds.toSet().intersection(savedWorkIds).length * 8;
      score += concert.composerIds.toSet().intersection(composerIds).length * 4;
      score +=
          concert.instrumentTags.toSet().intersection(instruments).length * 3;
      if (concert.region == _state.region) {
        score += 2;
      }
      if (_state.savedConcertIds.contains(concert.id)) {
        score += 1;
      }
      if (score > 0 || savedWorkIds.isEmpty) {
        scored.add((concert: concert, score: score));
      }
    }
    scored.sort((a, b) {
      final score = b.score.compareTo(a.score);
      if (score != 0) {
        return score;
      }
      return a.concert.startsAt.compareTo(b.concert.startsAt);
    });
    return scored.map((item) => item.concert).toList(growable: false);
  }

  Future<void> toggleSaveWork(String workId) async {
    final current = _state.stateForWork(workId);
    final now = _clock();
    final nextState = current.copyWith(
      saved: !current.saved,
      firstListenedAt: current.firstListenedAt ?? now,
      lastListenedAt: now,
      repeatDueAt: now.add(const Duration(days: 1)),
    );
    await _setWorkState(
      nextState,
      eventType: nextState.saved ? 'work_save' : 'work_unsave',
    );
  }

  Future<void> completeMoment(String workId, String momentId) async {
    final current = _state.stateForWork(workId);
    final now = _clock();
    final nextFamiliarity = (current.familiarityLevel + 1).clamp(0, 5);
    final repeatDelay = Duration(days: nextFamiliarity < 3 ? 1 : 3);
    await _setWorkState(
      current.copyWith(
        firstListenedAt: current.firstListenedAt ?? now,
        lastListenedAt: now,
        repeatDueAt: now.add(repeatDelay),
        familiarityLevel: nextFamiliarity,
      ),
      eventType: 'listening_moment_complete',
      context: momentId,
    );
  }

  Future<void> addReaction(
    String workId,
    String type, {
    String? momentId,
  }) async {
    final now = _clock();
    final current = _state.stateForWork(workId);
    final reactionCounts = Map<String, int>.of(current.reactionCounts);
    reactionCounts[type] = (reactionCounts[type] ?? 0) + 1;
    final reaction = ClassicalReaction(
      id: 'reaction-${now.microsecondsSinceEpoch}',
      workId: workId,
      type: type,
      momentId: momentId,
      occurredAt: now,
    );
    final nextWorkState = current.copyWith(
      firstListenedAt: current.firstListenedAt ?? now,
      lastListenedAt: now,
      repeatDueAt: now.add(const Duration(days: 1)),
      updatedAt: now,
      reactionCounts: reactionCounts,
    );
    await _setState(
      _state.copyWith(
        workStates: <String, UserWorkState>{
          ..._state.workStates,
          workId: nextWorkState,
        },
        reactions: <ClassicalReaction>[
          reaction,
          ..._state.reactions,
        ].take(80).toList(),
        events: _withEvent('reaction_add', 'work', workId, context: type),
      ),
    );
  }

  Future<void> setPreferredPlatform(String platformId) async {
    final now = _clock();
    await _setState(
      _state.copyWith(
        preferredPlatformId: platformId,
        preferencesUpdatedAt: now,
        events: _withEvent('preferred_platform_set', 'platform', platformId),
      ),
    );
  }

  Future<void> setRegion(String region) async {
    final now = _clock();
    await _setState(
      _state.copyWith(
        region: region,
        preferencesUpdatedAt: now,
        events: _withEvent('region_set', 'region', region),
      ),
    );
  }

  Future<void> completeOnboarding({
    required String experienceLevel,
    required Set<String> preferredMoodTags,
    required Set<String> preferredContextTags,
    required Set<String> preferredInstruments,
    required String preferredPlatformId,
    required String region,
    Set<String> notificationPreferences = const <String>{},
  }) async {
    final now = _clock();
    await _setState(
      _state.copyWith(
        onboardingCompleted: true,
        experienceLevel: experienceLevel,
        preferredMoodTags: preferredMoodTags,
        preferredContextTags: preferredContextTags,
        preferredInstruments: preferredInstruments,
        preferredPlatformId: preferredPlatformId,
        region: region,
        notificationPreferences: notificationPreferences,
        preferencesUpdatedAt: now,
        events: _withEvent(
          'onboarding_complete',
          'user',
          'local',
          context: experienceLevel,
        ),
      ),
    );
  }

  Future<void> skipOnboarding() async {
    final now = _clock();
    await _setState(
      _state.copyWith(
        onboardingCompleted: true,
        preferencesUpdatedAt: now,
        events: _withEvent('onboarding_skip', 'user', 'local'),
      ),
    );
  }

  Future<void> recordProviderClick(
    ClassicalWork work,
    ExternalLink link,
  ) async {
    await _setState(
      _state.copyWith(
        events: _withEvent(
          'external_platform_click',
          'work',
          work.id,
          context: link.platformId,
          properties: <String, String>{
            'providerId': link.platformId,
            'linkId': link.id,
          },
        ),
      ),
    );
  }

  Future<void> recordRecommendationClick(
    String shelfId,
    ClassicalWork work,
  ) async {
    await _setState(
      _state.copyWith(
        events: _withEvent(
          'recommendation_click',
          'work',
          work.id,
          context: shelfId,
          properties: <String, String>{'shelfId': shelfId},
        ),
      ),
    );
  }

  Future<void> recordPromotionImpression(String promotionId) async {
    await _setState(
      _state.copyWith(
        events: _withEvent('promotion_impression', 'promotion', promotionId),
      ),
    );
  }

  Future<void> recordConcertImpression(String concertId) async {
    await _setState(
      _state.copyWith(
        events: _withEvent('concert_impression', 'concert', concertId),
      ),
    );
  }

  Future<void> toggleSaveConcert(String concertId) async {
    final saved = Set<String>.of(_state.savedConcertIds);
    final didSave = saved.add(concertId);
    if (!didSave) {
      saved.remove(concertId);
    }
    await _setState(
      _state.copyWith(
        savedConcertIds: saved,
        events: _withEvent(
          didSave ? 'concert_save' : 'concert_unsave',
          'concert',
          concertId,
        ),
      ),
    );
  }

  Future<void> dismissPromotion(String promotionId) async {
    await _setState(
      _state.copyWith(
        dismissedPromotionIds: <String>{
          ..._state.dismissedPromotionIds,
          promotionId,
        },
        events: _withEvent('promotion_dismiss', 'promotion', promotionId),
      ),
    );
  }

  Future<void> recordPromotionClick(String promotionId) async {
    await _setState(
      _state.copyWith(
        events: _withEvent('promotion_click', 'promotion', promotionId),
      ),
    );
  }

  Future<void> recordTicketDestinationClick(String concertId) async {
    await _setState(
      _state.copyWith(
        events: _withEvent(
          'ticket_destination_click',
          'concert',
          concertId,
          properties: <String, String>{'concertId': concertId},
        ),
      ),
    );
  }

  Future<void> _setWorkState(
    UserWorkState nextWorkState, {
    required String eventType,
    String? context,
  }) async {
    await _setState(
      _state.copyWith(
        workStates: <String, UserWorkState>{
          ..._state.workStates,
          nextWorkState.workId: nextWorkState.copyWith(updatedAt: _clock()),
        },
        events: _withEvent(
          eventType,
          'work',
          nextWorkState.workId,
          context: context,
        ),
      ),
    );
  }

  Future<void> _setState(UserDiscoveryState state) async {
    _state = state;
    await store.saveState(_state);
    notifyListeners();
  }

  List<DiscoveryEvent> _withEvent(
    String eventType,
    String entityType,
    String entityId, {
    String? context,
    Map<String, String> properties = const <String, String>{},
  }) {
    final now = _clock();
    return <DiscoveryEvent>[
      DiscoveryEvent(
        id: 'event-${now.microsecondsSinceEpoch}',
        eventType: eventType,
        entityType: entityType,
        entityId: entityId,
        context: context,
        properties: properties,
        occurredAt: now,
      ),
      ..._state.events,
    ].take(200).toList(growable: false);
  }

  List<ClassicalWork> _recommendFor(
    ClassicalWork anchor, {
    required int maxCount,
  }) {
    final scored = <({ClassicalWork work, int score})>[];
    for (final work in _works) {
      final score = work.relevanceScoreFor(
        anchor: anchor,
        hasConcert: work.concertIds.isNotEmpty,
      );
      if (score > 0) {
        scored.add((work: work, score: score));
      }
    }
    scored.sort((a, b) {
      final score = b.score.compareTo(a.score);
      if (score != 0) {
        return score;
      }
      return a.work.difficultyForListening.compareTo(
        b.work.difficultyForListening,
      );
    });
    return scored
        .map((item) => item.work)
        .take(maxCount)
        .toList(growable: false);
  }
}
