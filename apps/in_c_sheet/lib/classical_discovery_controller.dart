import 'package:flutter/foundation.dart';

import 'classical_discovery_catalog.dart';
import 'classical_concert_import.dart';
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

class ProgramPreviewDraft {
  const ProgramPreviewDraft({
    required this.rawProgramText,
    required this.candidates,
    required this.unmatchedLines,
  });

  final String rawProgramText;
  final List<ConcertProgramMatchCandidate> candidates;
  final List<String> unmatchedLines;

  List<ConcertProgramMatchCandidate> get routeReadyCandidates => candidates
      .where(
        (candidate) =>
            candidate.confidence == ConcertProgramMatchConfidence.high ||
            candidate.confidence == ConcertProgramMatchConfidence.medium,
      )
      .toList(growable: false);
}

class TasteMapInsight {
  const TasteMapInsight({
    required this.title,
    required this.description,
    required this.nextAction,
    required this.confidence,
  });

  final String title;
  final String description;
  final String nextAction;
  final String confidence;
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
  List<TasteIntakeItem> get tasteIntakeItems =>
      List<TasteIntakeItem>.unmodifiable(_state.tasteIntakeItems);
  ReminderPreference get reminderPreference => _state.reminderPreference;

  ClassicalWork get todayWork {
    final savedDue = repeatDueWorks();
    if (savedDue.isNotEmpty) {
      return savedDue.first;
    }
    final founderPool = _works
        .where((work) => work.catalogStatusTags.contains('founder_pick'))
        .toList(growable: false);
    final pool = founderPool.isEmpty ? _works : founderPool;
    final day = _clock().difference(DateTime(2026)).inDays;
    return pool[day.abs() % pool.length];
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
    return <String>{
      ..._state.preferredInstruments,
      ...savedWorks.map((work) => work.instrumentation),
      ..._instrumentCuriosityTags,
    };
  }

  ConcertPreviewRoute? get latestPreviewRoute {
    if (_state.previewRoutes.isEmpty) {
      return null;
    }
    final routes = [..._state.previewRoutes];
    routes.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    return routes.first;
  }

  List<ClassicalWork> get savedButUnopenedWorks {
    return savedWorks
        .where((work) => !_hasExternalListenClick(work.id))
        .toList(growable: false);
  }

  List<PostConcertReflection> get postConcertReflections =>
      List<PostConcertReflection>.unmodifiable(_state.postConcertReflections);

  List<ClassicalWork> get revisitQueue {
    final works = <ClassicalWork>[];
    for (final work in repeatDueWorks()) {
      if (!works.any((item) => item.id == work.id)) {
        works.add(work);
      }
    }
    for (final work in savedButUnopenedWorks) {
      if (!works.any((item) => item.id == work.id)) {
        works.add(work);
      }
    }
    for (final reaction in _state.reactions) {
      if (reaction.type != 'unsure') {
        continue;
      }
      final work = workById(reaction.workId);
      if (work != null && !works.any((item) => item.id == work.id)) {
        works.add(work);
      }
    }
    return works.take(12).toList(growable: false);
  }

  Set<String> get _instrumentCuriosityTags {
    return <String>{
      for (final reaction in _state.reactions)
        if (reaction.type == 'instrument')
          if (workById(reaction.workId) case final work?) work.instrumentation,
    };
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

  ConcertPreviewRoute? routeById(String id) {
    for (final route in _state.previewRoutes) {
      if (route.id == id) {
        return route;
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

  Future<void> addTasteIntakeInputs(Iterable<String> rawInputs) async {
    final now = _clock();
    final items = _buildTasteIntakeItems(rawInputs, now);
    if (items.isEmpty) {
      return;
    }
    final existingKeys = _state.tasteIntakeItems
        .map((item) => normalizeDiscoveryText(item.rawInput))
        .toSet();
    final nextItems = <TasteIntakeItem>[
      for (final item in items)
        if (existingKeys.add(normalizeDiscoveryText(item.rawInput))) item,
      ..._state.tasteIntakeItems,
    ].take(24).toList(growable: false);
    await _setState(
      _state.copyWith(
        tasteIntakeItems: nextItems,
        preferencesUpdatedAt: now,
        events: _withEvent(
          'taste_intake_add',
          'user',
          'local',
          properties: <String, String>{
            'count': items.length.toString(),
            'matchedWorks': items
                .where((item) => item.matchedWorkId != null)
                .length
                .toString(),
          },
        ),
      ),
    );
  }

  TasteStartPreview? previewTasteStart(Iterable<String> rawInputs) {
    final now = _clock();
    final items = _buildTasteIntakeItems(rawInputs, now);
    if (items.isEmpty) {
      return null;
    }
    final axis = _primaryAxisForTasteItems(items);
    final anchor = items
        .map(
          (item) =>
              item.matchedWorkId == null ? null : workById(item.matchedWorkId!),
        )
        .whereType<ClassicalWork>()
        .firstOrNull;
    final nextThree = _previewProgressiveRecommendations(
      axis: axis,
      anchor: anchor,
      sourceEvidence: _sourceEvidenceForPreview(items, axis),
    );
    final work = nextThree.firstOrNull?.work ?? anchor ?? _easyFounderWork(now);
    final moment = work.primaryMoment ?? work.listeningMoments.first;
    final step = DailyListeningStep(
      work: work,
      moment: moment,
      title: '오늘은 이 30초부터',
      prompt: moment.prompt,
      reason: _tasteBasedDailyReason(items.first, axis),
      nextEffect: '반응을 남기면 다음 세 작품이 이 시작점에서 조금 더 가까워집니다.',
      estimatedSeconds: (moment.endSeconds - moment.startSeconds)
          .clamp(15, 180)
          .toInt(),
      difficulty: work.difficultyForListening,
      axis: axis,
      completionState: 'preview',
      dueDate: _dateOnly(now),
      tasteEvidenceLabel: items.first.label,
    );
    return TasteStartPreview(
      items: items,
      axis: axis,
      dailyStep: step,
      nextThree: nextThree,
    );
  }

  List<TasteAxisScore> tasteAxisScores() {
    final scores = <String, int>{};
    final evidence = <String, int>{};
    final updated = <String, DateTime>{};

    void add(String axis, int score, DateTime? occurredAt) {
      if (axis.isEmpty || score <= 0) {
        return;
      }
      scores[axis] = (scores[axis] ?? 0) + score;
      evidence[axis] = (evidence[axis] ?? 0) + 1;
      if (occurredAt != null &&
          (updated[axis] == null || occurredAt.isAfter(updated[axis]!))) {
        updated[axis] = occurredAt;
      }
    }

    for (final item in _state.tasteIntakeItems) {
      final work = item.matchedWorkId == null
          ? null
          : workById(item.matchedWorkId!);
      if (work != null) {
        for (final entry in _axisWeightsForWork(work).entries) {
          add(entry.key, entry.value * 2, item.createdAt);
        }
      } else {
        add(_axisForFreeText(item.rawInput), 2, item.createdAt);
      }
    }

    for (final state in _state.workStates.values) {
      final work = workById(state.workId);
      if (work == null) {
        continue;
      }
      final base = state.saved ? 4 : 1;
      for (final entry in _axisWeightsForWork(work).entries) {
        add(entry.key, entry.value * base, state.updatedAt);
      }
    }

    for (final reaction in _state.reactions) {
      final work = workById(reaction.workId);
      if (work == null) {
        continue;
      }
      final multiplier = switch (reaction.type) {
        'liked' => 4,
        'repeat' => 3,
        'instrument' => 2,
        'unsure' => 1,
        _ => 1,
      };
      for (final entry in _axisWeightsForWork(work).entries) {
        add(entry.key, entry.value * multiplier, reaction.occurredAt);
      }
    }

    for (final reflection in _state.postConcertReflections) {
      final work = workById(reflection.workId);
      if (work == null) {
        continue;
      }
      for (final entry in _axisWeightsForWork(work).entries) {
        add(entry.key, entry.value * 3, reflection.occurredAt);
      }
    }

    final result = scores.entries
        .map(
          (entry) => TasteAxisScore(
            axis: entry.key,
            score: entry.value,
            evidenceCount: evidence[entry.key] ?? 0,
            lastUpdatedAt: updated[entry.key],
          ),
        )
        .toList();
    result.sort((a, b) {
      final score = b.score.compareTo(a.score);
      if (score != 0) {
        return score;
      }
      return a.axis.compareTo(b.axis);
    });
    return result;
  }

  ListeningLevelSnapshot listeningLevelSnapshot() {
    final evidenceCount =
        _state.tasteIntakeItems.length +
        _state.reactions.length +
        _state.workStates.length +
        _state.postConcertReflections.length;
    final completedMoments = _state.events
        .where((event) => event.eventType == 'listening_moment_complete')
        .length;
    final externalClicks = _state.events
        .where((event) => event.eventType == 'external_platform_click')
        .length;
    final unsureCount = _state.reactions
        .where((reaction) => reaction.type == 'unsure')
        .length;
    final savedCount = savedWorks.length;
    final score =
        evidenceCount +
        completedMoments +
        externalClicks +
        savedCount -
        unsureCount;
    final level = switch (score) {
      <= 2 => '첫 입구',
      <= 7 => '익숙해지는 중',
      <= 14 => '넓히는 중',
      _ => '깊게 듣는 중',
    };
    final axes = tasteAxisScores();
    final strengths = axes.take(2).map((item) => item.axis).toList();
    final nextGrowthArea = _nextGrowthAreaFor(strengths);
    final latest = <DateTime>[
      for (final item in axes)
        if (item.lastUpdatedAt != null) item.lastUpdatedAt!,
      for (final event in _state.events.take(1)) event.occurredAt,
    ]..sort((a, b) => b.compareTo(a));
    return ListeningLevelSnapshot(
      level: level,
      confidence: evidenceCount.clamp(0, 12),
      strengths: strengths,
      nextGrowthArea: nextGrowthArea,
      updatedAt: latest.isEmpty ? null : latest.first,
    );
  }

  List<ProgressiveRecommendation> nextThreeRecommendations({
    ClassicalWork? anchor,
  }) {
    final level = listeningLevelSnapshot();
    final axis = tasteAxisScores().isEmpty
        ? '선율형'
        : tasteAxisScores().first.axis;
    final targetDifficulty = _targetDifficultyFor(level.level);
    final usedWorkIds = <String>{
      if (anchor != null) anchor.id,
      ..._state.reactions.take(8).map((reaction) => reaction.workId),
    };
    final candidates = _scoreProgressiveCandidates(
      axis: axis,
      targetDifficulty: targetDifficulty,
      anchor: anchor ?? _bestTasteAnchor(),
      usedWorkIds: usedWorkIds,
    );

    ProgressiveRecommendation? pick(
      String lane,
      bool Function(ClassicalWork work) test,
    ) {
      for (final item in candidates) {
        if (!test(item.work)) {
          continue;
        }
        usedWorkIds.add(item.work.id);
        return ProgressiveRecommendation(
          work: item.work,
          lane: lane,
          reason: _progressiveReasonFor(item.work, lane, axis),
          distance: (item.work.difficultyForListening - targetDifficulty).abs(),
          axis: axis,
          difficulty: item.work.difficultyForListening,
          sourceEvidence: _sourceEvidenceFor(axis),
        );
      }
      return null;
    }

    final immediate = pick(
      'immediate',
      (work) =>
          !usedWorkIds.contains(work.id) &&
          work.difficultyForListening <= targetDifficulty + 1,
    );
    final stretch = pick(
      'stretch',
      (work) =>
          !usedWorkIds.contains(work.id) &&
          work.difficultyForListening >= targetDifficulty &&
          work.difficultyForListening <= targetDifficulty + 2,
    );
    final later = pick(
      'later',
      (work) =>
          !usedWorkIds.contains(work.id) &&
          work.difficultyForListening >= targetDifficulty + 1,
    );
    final fallbackLater =
        later ?? pick('later', (work) => !usedWorkIds.contains(work.id));
    return [
      immediate,
      stretch,
      fallbackLater,
    ].whereType<ProgressiveRecommendation>().toList(growable: false);
  }

  DailyListeningStep dailyListeningStep({DateTime? now}) {
    final effectiveNow = now ?? _clock();
    final axis = tasteAxisScores().isEmpty
        ? '선율형'
        : tasteAxisScores().first.axis;
    final completedWork = _completedWorkOn(effectiveNow);
    final savedWork = savedButUnopenedWorks
        .where((work) => work.primaryMoment != null)
        .firstOrNull;
    final unsureWork = _recentUnsureAnchor(effectiveNow);
    final hasTasteSignal =
        _state.tasteIntakeItems.isNotEmpty || _state.reactions.isNotEmpty;
    final recommendedWork = hasTasteSignal
        ? nextThreeRecommendations()
              .map((item) => item.work)
              .where((work) => work.primaryMoment != null)
              .firstOrNull
        : null;
    final work =
        completedWork ??
        savedWork ??
        unsureWork ??
        recommendedWork ??
        _easyFounderWork(effectiveNow);
    final moment = work.primaryMoment ?? work.listeningMoments.first;
    final isCompleted = _workHasDailyCompletion(work.id, effectiveNow);
    final tasteEvidenceLabel = _dailyTasteEvidenceLabel();
    return DailyListeningStep(
      work: work,
      moment: moment,
      title: isCompleted ? '오늘은 충분해요' : '오늘 30초만',
      prompt: moment.prompt,
      reason: _dailyReasonFor(
        work,
        axis: axis,
        tasteEvidenceLabel: tasteEvidenceLabel,
        hasSavedUnopened: savedWork?.id == work.id,
        isUnsureRecovery: unsureWork?.id == work.id,
        isCompleted: isCompleted,
      ),
      nextEffect: _dailyNextEffectFor(isCompleted: isCompleted),
      estimatedSeconds: (moment.endSeconds - moment.startSeconds)
          .clamp(15, 180)
          .toInt(),
      difficulty: work.difficultyForListening,
      axis: axis,
      completionState: isCompleted ? 'completed' : 'ready',
      dueDate: _dateOnly(effectiveNow),
      tasteEvidenceLabel: tasteEvidenceLabel,
    );
  }

  GentleContinuitySummary continuitySummary({DateTime? now}) {
    final effectiveNow = now ?? _clock();
    final today = _dateOnly(effectiveNow);
    final dates = _dailyCompletionDates();
    final completedToday = dates.contains(today);
    var weeklyCompletedDays = 0;
    for (var index = 0; index < 7; index += 1) {
      if (dates.contains(today.subtract(Duration(days: index)))) {
        weeklyCompletedDays += 1;
      }
    }

    var currentRunDays = 0;
    var cursor = completedToday
        ? today
        : today.subtract(const Duration(days: 1));
    while (dates.contains(cursor)) {
      currentRunDays += 1;
      cursor = cursor.subtract(const Duration(days: 1));
    }

    final sortedDates = dates.toList()..sort((a, b) => b.compareTo(a));
    final lastCompletedDate = sortedDates.firstOrNull;
    final headline = completedToday
        ? '오늘은 충분해요'
        : weeklyCompletedDays == 0
        ? '오늘 30초부터 다시 열어봐요'
        : '이번 주 $weeklyCompletedDays일 열렸어요';
    final recoveryCopy = completedToday
        ? '이제 더 고르지 않아도 됩니다. 내일은 오늘 기록에서 한 걸음만 이어갑니다.'
        : currentRunDays > 0
        ? '어제의 흐름이 남아 있어요. 오늘 하나만 더하면 다시 이어집니다.'
        : '비어 있는 날은 그냥 비워둬도 됩니다. 오늘 한 지점만 들으면 충분합니다.';
    return GentleContinuitySummary(
      currentRunDays: currentRunDays,
      weeklyCompletedDays: weeklyCompletedDays,
      lastCompletedDate: lastCompletedDate,
      missedDaysInLastWeek: 7 - weeklyCompletedDays,
      completedToday: completedToday,
      headline: headline,
      recoveryCopy: recoveryCopy,
    );
  }

  List<WorkPassportStamp> workPassportFor(String workId) {
    final stamps = <WorkPassportStamp>[];
    final workState = _state.workStates[workId];
    if (workState?.firstListenedAt case final first?) {
      stamps.add(
        WorkPassportStamp(
          id: 'first-$workId-${first.microsecondsSinceEpoch}',
          workId: workId,
          stampType: 'first_meet',
          label: '처음 만남',
          occurredAt: first,
        ),
      );
    }
    final savedAt = workState?.updatedAt;
    if (workState?.saved == true && savedAt != null) {
      stamps.add(
        WorkPassportStamp(
          id: 'saved-$workId-${savedAt.microsecondsSinceEpoch}',
          workId: workId,
          stampType: 'saved',
          label: '다시 들으려고 저장',
          occurredAt: savedAt,
        ),
      );
    }
    for (final event in _state.events) {
      if (event.entityType != 'work' || event.entityId != workId) {
        continue;
      }
      final label = switch (event.eventType) {
        'listening_moment_preview_open' => '30초 지점 열어봄',
        'listening_moment_complete' => '듣는 지점 완료',
        'external_platform_click' => '전체 듣기로 이동',
        _ => null,
      };
      if (label == null) {
        continue;
      }
      stamps.add(
        WorkPassportStamp(
          id: event.id,
          workId: workId,
          stampType: event.eventType,
          label: label,
          momentId: event.context,
          occurredAt: event.occurredAt,
        ),
      );
    }
    for (final reaction in _state.reactions) {
      if (reaction.workId != workId) {
        continue;
      }
      stamps.add(
        WorkPassportStamp(
          id: reaction.id,
          workId: workId,
          stampType: 'reaction',
          label: _reactionLabelFor(reaction.type),
          momentId: reaction.momentId,
          reactionType: reaction.type,
          occurredAt: reaction.occurredAt,
        ),
      );
    }
    for (final route in _state.previewRoutes) {
      if (!route.programWorkIds.contains(workId)) {
        continue;
      }
      stamps.add(
        WorkPassportStamp(
          id: '${route.id}-$workId',
          workId: workId,
          stampType: 'concert_preview',
          label: '공연 전 프리뷰에 들어감',
          concertId: route.concertId,
          routeId: route.id,
          occurredAt: route.createdAt,
        ),
      );
    }
    for (final reflection in _state.postConcertReflections) {
      if (reflection.workId != workId) {
        continue;
      }
      stamps.add(
        WorkPassportStamp(
          id: reflection.id,
          workId: workId,
          stampType: 'post_concert_reflection',
          label: '공연 후 기억에 남김',
          concertId: reflection.concertId,
          routeId: reflection.routeId,
          reactionType: reflection.reactionType,
          note: reflection.note,
          occurredAt: reflection.occurredAt,
        ),
      );
    }
    stamps.sort((a, b) => b.occurredAt.compareTo(a.occurredAt));
    return stamps;
  }

  List<WorkPassportStamp> listeningTimeline() {
    final workIds = <String>{
      ..._state.workStates.keys,
      ..._state.reactions.map((reaction) => reaction.workId),
      ..._state.previewRoutes.expand((route) => route.programWorkIds),
      ..._state.postConcertReflections.map((reflection) => reflection.workId),
    };
    final stamps = <WorkPassportStamp>[
      for (final workId in workIds) ...workPassportFor(workId),
    ]..sort((a, b) => b.occurredAt.compareTo(a.occurredAt));
    return stamps.take(80).toList(growable: false);
  }

  ProgramPreviewDraft previewProgramText(String rawProgramText) {
    final candidates = const ConcertProgramMatcher().matchCandidates(
      programRawText: rawProgramText,
      works: _works,
    );
    return ProgramPreviewDraft(
      rawProgramText: rawProgramText,
      candidates: candidates,
      unmatchedLines: _unmatchedProgramLines(rawProgramText, candidates),
    );
  }

  Future<ConcertPreviewRoute?> createPreviewRouteFromConcert(
    String concertId,
  ) async {
    final concert = concertById(concertId);
    if (concert == null) {
      return null;
    }
    final route = _buildRoute(
      sourceType: ConcertPreviewRouteSourceType.seededConcert,
      title: '${concert.title} 10분 프리뷰',
      concertId: concert.id,
      date: concert.startsAt,
      venue: concert.venue,
      rawProgramText: concert.programRawText,
      candidateWorkIds: concert.programWorkIds,
    );
    await _savePreviewRoute(route, eventType: 'concert_preview_route_create');
    return route;
  }

  Future<ConcertPreviewRoute> createPreviewRouteFromProgram({
    required String rawProgramText,
    String title = '붙여넣은 프로그램 10분 프리뷰',
  }) async {
    final draft = previewProgramText(rawProgramText);
    final route = _buildRoute(
      sourceType: ConcertPreviewRouteSourceType.pastedProgram,
      title: title.trim().isEmpty ? '붙여넣은 프로그램 10분 프리뷰' : title.trim(),
      rawProgramText: rawProgramText,
      candidateWorkIds: draft.routeReadyCandidates
          .map((candidate) => candidate.workId)
          .toList(growable: false),
      unmatchedProgramLines: draft.unmatchedLines,
    );
    await _savePreviewRoute(route, eventType: 'program_preview_route_create');
    return route;
  }

  Future<void> completePreviewRoute(String routeId) async {
    final route = routeById(routeId);
    if (route == null) {
      return;
    }
    final now = _clock();
    await _setState(
      _state.copyWith(
        previewRoutes: _replaceRoute(
          route.copyWith(
            completionState: ConcertPreviewRouteCompletionState.completed,
            updatedAt: now,
          ),
        ),
        events: _withEvent('concert_preview_route_complete', 'route', routeId),
      ),
    );
  }

  Future<void> addPostConcertReflection({
    required String workId,
    required String reactionType,
    String? concertId,
    String? routeId,
    String instrument = '',
    String note = '',
  }) async {
    final now = _clock();
    final reflection = PostConcertReflection(
      id: 'reflection-${now.microsecondsSinceEpoch}',
      concertId: concertId,
      routeId: routeId,
      workId: workId,
      instrument: instrument.trim(),
      reactionType: reactionType,
      note: note.trim(),
      occurredAt: now,
    );
    await addReaction(workId, reactionType);
    await _setState(
      _state.copyWith(
        postConcertReflections: <PostConcertReflection>[
          reflection,
          ..._state.postConcertReflections,
        ].take(80).toList(growable: false),
        events: _withEvent(
          'post_concert_reflection_add',
          'work',
          workId,
          context: concertId ?? routeId,
          properties: <String, String>{
            'reactionType': reactionType,
            if (instrument.trim().isNotEmpty) 'instrument': instrument.trim(),
            if (note.trim().isNotEmpty) 'note': note.trim(),
          },
        ),
      ),
    );
  }

  List<TasteMapInsight> tasteMapInsights() {
    final axes = tasteAxisScores();
    final level = listeningLevelSnapshot();
    final signals =
        _state.tasteIntakeItems.length +
        _state.reactions.length +
        _state.postConcertReflections.length;
    if (signals < 3) {
      return const [
        TasteMapInsight(
          title: '아직 한쪽으로 단정하지 않습니다',
          description: '좋아하는 음악이나 첫 반응이 조금 쌓이면, 어디서 귀가 열리는지 보입니다.',
          nextAction: '오늘은 30초 지점 하나만 들어도 충분합니다.',
          confidence: 'low',
        ),
      ];
    }
    final primaryAxis = axes.isEmpty ? null : axes.first;
    final secondaryAxis = axes.length < 2 ? null : axes[1];
    final unsureWorks = _state.reactions
        .where((reaction) => reaction.type == 'unsure')
        .map((reaction) => workById(reaction.workId))
        .whereType<ClassicalWork>()
        .toList(growable: false);
    final unsureInstrument = _topBy(
      unsureWorks.map((work) => work.instrumentation),
    );
    return <TasteMapInsight>[
      if (primaryAxis != null)
        TasteMapInsight(
          title: '${primaryAxis.axis} 쪽에서 먼저 열리고 있습니다',
          description: '좋아한 음악, 저장, 반응을 함께 보면 지금은 ${level.level}에 가깝습니다.',
          nextAction:
              '바로 맞을 작품 하나를 듣고, 다음에는 ${level.nextGrowthArea}을 조금 열어보세요.',
          confidence: primaryAxis.evidenceCount >= 5 ? 'medium' : 'low',
        ),
      if (secondaryAxis != null)
        TasteMapInsight(
          title: '${secondaryAxis.axis}도 조금씩 보입니다',
          description: '한 가지 취향으로 잠그지 않고 가까운 확장을 섞어 보여줍니다.',
          nextAction: 'Next Three의 한 걸음 확장 작품을 열어보세요.',
          confidence: secondaryAxis.evidenceCount >= 4 ? 'medium' : 'low',
        ),
      if (unsureInstrument != null)
        TasteMapInsight(
          title: '$unsureInstrument 작품은 아직 낯설 수 있습니다',
          description: '"아직 모르겠음" 반응이 있어 더 선명한 작품으로 낮춰 이어갑니다.',
          nextAction: '더 짧고 주제가 분명한 작품부터 다시 들어보세요.',
          confidence: 'low',
        ),
    ];
  }

  List<ListeningMapNode> listeningMapNodes() {
    return _listeningMapNodes();
  }

  List<ListeningMapEdge> listeningMapEdges() {
    return _listeningMapEdges();
  }

  ListeningMapProgress listeningMapProgress() {
    final nodes = _listeningMapNodes();
    final edges = _listeningMapEdges();
    final userState = _deriveListeningMapState(nodes, edges);
    final nodeById = {for (final node in nodes) node.id: node};
    final currentNode = userState.currentNodeId == null
        ? null
        : nodeById[userState.currentNodeId!];
    final nextPath = userState.nextNodeIds
        .map((id) => nodeById[id])
        .whereType<ListeningMapNode>()
        .toList(growable: false);
    final unfamiliarNodes = userState.unfamiliarNodeIds
        .map((id) => nodeById[id])
        .whereType<ListeningMapNode>()
        .toList(growable: false);
    final conquered = conqueredWorks();
    return ListeningMapProgress(
      nodes: nodes,
      edges: edges,
      userState: userState,
      axisScores: tasteAxisScores(),
      openedCount: userState.openedNodeIds.length,
      familiarCount: userState.familiarNodeIds.length,
      conqueredCount: conquered.length,
      currentNode: currentNode,
      nextPath: nextPath,
      unfamiliarNodes: unfamiliarNodes,
      conqueredWorks: conquered,
      summaryCopy: _listeningMapSummaryCopy(
        currentNode: currentNode,
        openedCount: userState.openedNodeIds.length,
        familiarCount: userState.familiarNodeIds.length,
        nextPath: nextPath,
      ),
      rewardCopy: _listeningMapRewardCopy(
        currentNode: currentNode,
        nextPath: nextPath,
      ),
    );
  }

  List<ClassicalWork> conqueredWorks() {
    return _works
        .where((work) => _isConqueredWorkCandidate(work.id))
        .take(24)
        .toList(growable: false);
  }

  WorkListeningMapRole listeningMapRoleForWork(ClassicalWork work) {
    final nodes = _listeningMapNodes();
    final progress = listeningMapProgress();
    final relatedNodes = _nodesForWork(work, nodes);
    final primaryNode = relatedNodes.firstOrNull ?? nodes.first;
    final status = progress.userState.statusFor(primaryNode.id);
    final capturedPoints = workPassportFor(work.id)
        .where(
          (stamp) =>
              stamp.stampType == 'listening_moment_complete' ||
              stamp.stampType == 'external_platform_click' ||
              stamp.stampType == 'reaction',
        )
        .map((stamp) => stamp.label)
        .take(3)
        .toList(growable: false);
    return WorkListeningMapRole(
      work: work,
      primaryNode: primaryNode,
      relatedNodes: relatedNodes,
      status: status,
      roleCopy: _workMapRoleCopy(work, primaryNode, status),
      capturedPoints: capturedPoints,
      nextPath: nextThreeRecommendations(anchor: work).take(3).toList(),
    );
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
    final mapProgress = listeningMapProgress();
    final shelves = <RecommendationShelf>[
      if (mapProgress.nextPath.isNotEmpty)
        RecommendationShelf(
          id: 'map-next-path',
          title: '오늘 30초로 열 다음 길',
          reason: mapProgress.nextPath.first.userFacingCopy,
          source: 'listening_map',
          works: _worksForMapNodes(mapProgress.nextPath).take(8).toList(),
        ),
      if (mapProgress.familiarCount > 0)
        RecommendationShelf(
          id: 'map-familiar',
          title: '익숙해진 영역에서 하나 더',
          reason: '이미 열린 감상 축에서 너무 멀지 않게 이어갑니다.',
          source: 'listening_map',
          works: _worksForMapNodeIds(mapProgress.userState.familiarNodeIds)
              .take(8)
              .toList(),
        ),
      if (mapProgress.unfamiliarNodes.isNotEmpty)
        RecommendationShelf(
          id: 'map-unfamiliar',
          title: '아직 낯선 길은 더 쉬운 입구부터',
          reason:
              '${mapProgress.unfamiliarNodes.first.title} 쪽은 더 선명한 작품으로 낮춰 봅니다.',
          source: 'listening_map',
          works: _worksForMapNodes(
            mapProgress.unfamiliarNodes,
            easyOnly: true,
          ).take(8).toList(),
        ),
      if (mapProgress.conqueredWorks.isNotEmpty)
        RecommendationShelf(
          id: 'map-conquered-nearby',
          title: '내 곡이 된 작품과 가까운 길',
          reason: '반응, 저장, 전체 듣기가 겹친 작품에서 다음 길을 잡습니다.',
          source: 'listening_map',
          works: _recommendFor(mapProgress.conqueredWorks.first, maxCount: 8),
        ),
      if (savedButUnopenedWorks.isNotEmpty)
        RecommendationShelf(
          id: 'saved-unopened',
          title: '저장했지만 아직 전체 듣기 전',
          reason: '저장만 해둔 작품을 실제 듣기로 이어갑니다.',
          source: 'saved',
          works: savedButUnopenedWorks.take(8).toList(growable: false),
        ),
      RecommendationShelf(
        id: 'starter',
        title: '오늘 하나만 듣기',
        reason: '공연 일정이 없어도 3분 안에 귀에 붙는 지점입니다.',
        source: 'starter',
        works: _works
            .where(
              (work) =>
                  work.catalogStatusTags.contains('founder_pick') ||
                  work.contextTags.contains('처음 듣기'),
            )
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
      if (_instrumentCuriosityTags.isNotEmpty)
        RecommendationShelf(
          id: 'instrument-curiosity',
          title: '궁금해진 소리로 이어 듣기',
          reason: '악기가 궁금했던 작품에서 이어집니다.',
          source: 'reaction',
          works: _works
              .where(
                (work) =>
                    _instrumentCuriosityTags.contains(work.instrumentation) &&
                    !_state.reactions.any(
                      (reaction) => reaction.workId == work.id,
                    ),
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
        title: '공연장에서 자주 만나는 작품',
        reason: '프로그램에 오를 가능성이 높은 작품부터 익숙해집니다.',
        source: 'concert',
        works: _works
            .where((work) => work.contextTags.contains('공연 전'))
            .take(8)
            .toList(growable: false),
      ),
      RecommendationShelf(
        id: 'after-today',
        title: '방금 들은 포인트에서 이어가기',
        reason: '오늘 들은 작품의 악기와 분위기에서 자연스럽게 이어집니다.',
        source: 'today',
        works: _recommendFor(todayWork, maxCount: 8),
      ),
    ];
    return _dedupeRecommendationShelves(
      shelves.where((shelf) => shelf.works.isNotEmpty),
    );
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
    final routeWorkIds = _state.previewRoutes
        .expand((route) => route.programWorkIds)
        .toSet();
    final reflectedWorkIds = _state.postConcertReflections
        .map((reflection) => reflection.workId)
        .toSet();
    final scored = <({ClassicalConcert concert, int score})>[];
    for (final concert in _concerts) {
      var score = 0;
      score +=
          concert.programWorkIds.toSet().intersection(routeWorkIds).length * 12;
      score +=
          concert.programWorkIds.toSet().intersection(reflectedWorkIds).length *
          10;
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
      if (score > 0 || (savedWorkIds.isEmpty && routeWorkIds.isEmpty)) {
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
        updatedAt: now,
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
    final repeatDueAt = switch (type) {
      'liked' => now.add(const Duration(days: 3)),
      'repeat' || 'instrument' || 'unsure' => now.add(const Duration(days: 1)),
      _ => now.add(const Duration(days: 1)),
    };
    final nextWorkState = current.copyWith(
      firstListenedAt: current.firstListenedAt ?? now,
      lastListenedAt: now,
      repeatDueAt: repeatDueAt,
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

  Future<void> setReminderPreference(ReminderPreference preference) async {
    final now = _clock();
    final notificationPreferences = <String>{..._state.notificationPreferences};
    if (preference.enabled) {
      notificationPreferences.add('today_work');
    } else {
      notificationPreferences.remove('today_work');
    }
    await _setState(
      _state.copyWith(
        reminderPreference: preference.copyWith(updatedAt: now),
        notificationPreferences: notificationPreferences,
        preferencesUpdatedAt: now,
        events: _withEvent(
          'reminder_preference_set',
          'user',
          'local',
          properties: <String, String>{
            'enabled': preference.enabled.toString(),
            'timeLabel': preference.timeLabel,
            'deliveryStatus': preference.deliveryStatus,
          },
        ),
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
    List<String> tasteInputs = const <String>[],
    Set<String> notificationPreferences = const <String>{},
  }) async {
    final now = _clock();
    final intakeItems = _buildTasteIntakeItems(tasteInputs, now);
    await _setState(
      _state.copyWith(
        onboardingCompleted: true,
        tasteIntakeItems: <TasteIntakeItem>[
          ...intakeItems,
          ..._state.tasteIntakeItems,
        ].take(24).toList(growable: false),
        experienceLevel: experienceLevel,
        preferredMoodTags: preferredMoodTags,
        preferredContextTags: preferredContextTags,
        preferredInstruments: preferredInstruments,
        preferredPlatformId: preferredPlatformId,
        region: region,
        notificationPreferences: notificationPreferences,
        reminderPreference: ReminderPreference.defaultPreference.copyWith(
          enabled: notificationPreferences.contains('today_work'),
          deliveryStatus: 'local-preference-only',
          updatedAt: now,
        ),
        preferencesUpdatedAt: now,
        events: _withEvent(
          'onboarding_complete',
          'user',
          'local',
          context: experienceLevel,
          properties: <String, String>{
            'tasteInputCount': intakeItems.length.toString(),
            'matchedWorks': intakeItems
                .where((item) => item.matchedWorkId != null)
                .length
                .toString(),
          },
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
    ExternalLink link, {
    bool fallback = false,
  }) async {
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
            'linkType': link.linkType,
            'fallback': fallback.toString(),
            'url': link.url,
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

  Future<void> recordTicketDestinationClick(
    String concertId, {
    TicketDestination? destination,
  }) async {
    await _setState(
      _state.copyWith(
        events: _withEvent(
          'ticket_destination_click',
          'concert',
          concertId,
          properties: <String, String>{
            'concertId': concertId,
            if (destination != null) 'destinationId': destination.id,
            if (destination != null) 'url': destination.url,
          },
        ),
      ),
    );
  }

  ConcertPreviewRoute _buildRoute({
    required ConcertPreviewRouteSourceType sourceType,
    required String title,
    required List<String> candidateWorkIds,
    String? concertId,
    DateTime? date,
    String? venue,
    String rawProgramText = '',
    List<String> unmatchedProgramLines = const <String>[],
  }) {
    final now = _clock();
    final deduped = <String>[];
    for (final workId in candidateWorkIds) {
      if (workById(workId)?.listeningMoments.isEmpty ?? true) {
        continue;
      }
      if (!deduped.contains(workId)) {
        deduped.add(workId);
      }
      if (deduped.length == 4) {
        break;
      }
    }
    final momentIds = <String>[];
    for (final workId in deduped) {
      final work = workById(workId);
      if (work == null) {
        continue;
      }
      momentIds.add(work.listeningMoments.first.id);
      if (work.listeningMoments.length > 1 && momentIds.length < 4) {
        momentIds.add(work.listeningMoments[1].id);
      }
    }
    final minutes = momentIds
        .fold<int>(0, (total, momentId) {
          final moment = _momentById(momentId);
          if (moment == null) {
            return total;
          }
          return total +
              ((moment.endSeconds - moment.startSeconds) / 60).ceil();
        })
        .clamp(0, 10);
    return ConcertPreviewRoute(
      id: 'route-${now.microsecondsSinceEpoch}',
      sourceType: sourceType,
      concertId: concertId,
      routeTitle: title,
      date: date,
      venue: venue,
      rawProgramText: rawProgramText,
      programWorkIds: deduped,
      listeningMomentIds: momentIds,
      totalPreviewMinutes: minutes == 0 ? deduped.length * 3 : minutes,
      hallListeningNotes: deduped
          .map((workId) => _hallListeningNoteFor(workById(workId)!))
          .toList(growable: false),
      unmatchedProgramLines: unmatchedProgramLines,
      completionState: deduped.isEmpty
          ? ConcertPreviewRouteCompletionState.draft
          : ConcertPreviewRouteCompletionState.ready,
      createdAt: now,
      updatedAt: now,
    );
  }

  Future<void> _savePreviewRoute(
    ConcertPreviewRoute route, {
    required String eventType,
  }) async {
    await _setState(
      _state.copyWith(
        previewRoutes: <ConcertPreviewRoute>[
          route,
          ..._state.previewRoutes.where((item) => item.id != route.id),
        ].take(20).toList(growable: false),
        events: _withEvent(
          eventType,
          'route',
          route.id,
          properties: <String, String>{
            'workCount': route.programWorkIds.length.toString(),
            'sourceType': route.sourceType.name,
          },
        ),
      ),
    );
  }

  List<ConcertPreviewRoute> _replaceRoute(ConcertPreviewRoute route) {
    return _state.previewRoutes
        .map((item) => item.id == route.id ? route : item)
        .toList(growable: false);
  }

  Future<void> submitFeedback({
    required String category,
    String message = '',
    String entityType = 'app',
    String entityId = 'in-c',
  }) async {
    final trimmedMessage = message.trim();
    await _setState(
      _state.copyWith(
        events: _withEvent(
          'feedback_submit',
          entityType,
          entityId,
          context: category,
          properties: <String, String>{
            'category': category,
            if (trimmedMessage.isNotEmpty) 'message': trimmedMessage,
          },
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

  bool _hasExternalListenClick(String workId) {
    return _state.events.any(
      (event) =>
          event.eventType == 'external_platform_click' &&
          event.entityType == 'work' &&
          event.entityId == workId,
    );
  }

  ListeningMoment? _momentById(String momentId) {
    for (final work in _works) {
      for (final moment in work.listeningMoments) {
        if (moment.id == momentId) {
          return moment;
        }
      }
    }
    return null;
  }

  String _hallListeningNoteFor(ClassicalWork work) {
    final moment = work.primaryMoment;
    if (moment == null) {
      return '${work.titleKo}: ${work.instrumentation} 소리의 입구를 먼저 찾습니다.';
    }
    return '${work.titleKo}: ${moment.prompt}';
  }

  List<String> _unmatchedProgramLines(
    String rawProgramText,
    List<ConcertProgramMatchCandidate> candidates,
  ) {
    final routeReadyIds = candidates
        .where(
          (candidate) =>
              candidate.confidence == ConcertProgramMatchConfidence.high ||
              candidate.confidence == ConcertProgramMatchConfidence.medium,
        )
        .map((candidate) => candidate.workId)
        .toSet();
    return rawProgramText
        .split(RegExp(r'[\n;]+'))
        .map((line) => line.trim())
        .where((line) => line.isNotEmpty)
        .where((line) {
          final matched = const ConcertProgramMatcher().matchWorkIds(
            programRawText: line,
            works: _works
                .where((work) => routeReadyIds.contains(work.id))
                .toList(),
          );
          return matched.isEmpty;
        })
        .toList(growable: false);
  }

  String? _topBy(Iterable<String> values) {
    final counts = <String, int>{};
    for (final value in values) {
      final trimmed = value.trim();
      if (trimmed.isEmpty) {
        continue;
      }
      counts[trimmed] = (counts[trimmed] ?? 0) + 1;
    }
    if (counts.isEmpty) {
      return null;
    }
    final entries = counts.entries.toList()
      ..sort((a, b) {
        final count = b.value.compareTo(a.value);
        if (count != 0) {
          return count;
        }
        return a.key.compareTo(b.key);
      });
    return entries.first.key;
  }

  List<ListeningMapNode> _listeningMapNodes() {
    ListeningMapNode node({
      required String id,
      required String title,
      required String description,
      required String axis,
      required int level,
      List<String> prerequisiteNodeIds = const <String>[],
      List<String> unlockedByTags = const <String>[],
    }) {
      final recommended = _workIdsForAxis(axis, level: level);
      return ListeningMapNode(
        id: id,
        title: title,
        description: description,
        axis: axis,
        level: level,
        prerequisiteNodeIds: prerequisiteNodeIds,
        recommendedWorkIds: recommended,
        anchorWorkIds: recommended.take(3).toList(growable: false),
        unlockedByTags: unlockedByTags,
        userFacingCopy: _mapNodeUserCopy(
          axis: axis,
          title: title,
          level: level,
        ),
      );
    }

    return <ListeningMapNode>[
      node(
        id: 'melody-entry',
        title: '선율이 먼저 들리는 길',
        description: '노래처럼 앞으로 나오는 선율을 먼저 붙잡는 길입니다.',
        axis: '선율형',
        level: 1,
        unlockedByTags: const ['서정', '노래', '녹턴', '처음 듣기'],
      ),
      node(
        id: 'melody-familiar',
        title: '긴 선율을 따라가는 길',
        description: '긴 선율과 클라이맥스까지 따라갈 수 있는 길입니다.',
        axis: '선율형',
        level: 2,
        prerequisiteNodeIds: const ['melody-entry'],
      ),
      node(
        id: 'color-entry',
        title: '악기 색이 들리는 길',
        description: '화성, 질감, 악기 배치가 번지는 순간을 듣는 길입니다.',
        axis: '색채형',
        level: 1,
        unlockedByTags: const ['색채', '분위기', '인상주의', '관현악'],
      ),
      node(
        id: 'color-familiar',
        title: '소리의 결을 따라가는 길',
        description: '멜로디보다 소리의 결을 따라가는 길입니다.',
        axis: '색채형',
        level: 2,
        prerequisiteNodeIds: const ['color-entry'],
      ),
      node(
        id: 'rhythm-entry',
        title: '몸이 먼저 반응하는 길',
        description: '리듬, 춤, 반복되는 맥박을 먼저 듣는 길입니다.',
        axis: '리듬형',
        level: 1,
        unlockedByTags: const ['춤', '리듬', '행진', '활기'],
      ),
      node(
        id: 'rhythm-familiar',
        title: '반복과 변형이 보이는 길',
        description: '반복과 변형이 몸으로 먼저 잡히는 길입니다.',
        axis: '리듬형',
        level: 2,
        prerequisiteNodeIds: const ['rhythm-entry'],
      ),
      node(
        id: 'dramatic-entry',
        title: '장면이 바뀌는 길',
        description: '영화처럼 분위기가 바뀌는 순간을 듣는 길입니다.',
        axis: '극적형',
        level: 1,
        unlockedByTags: const ['극적', '영화', '협주곡', '클라이맥스'],
      ),
      node(
        id: 'dramatic-familiar',
        title: '큰 흐름을 따라가는 길',
        description: '긴장, 폭발, 회복의 장면을 이어 듣는 길입니다.',
        axis: '극적형',
        level: 2,
        prerequisiteNodeIds: const ['dramatic-entry'],
      ),
      node(
        id: 'tension-entry',
        title: '긴장이 쌓이는 길',
        description: '어두운 색, 불안, 해소되는 순간을 듣는 길입니다.',
        axis: '긴장형',
        level: 1,
        unlockedByTags: const ['긴장', '어두움', '단조', '폭풍'],
      ),
      node(
        id: 'form-entry',
        title: '주제가 돌아오는 길',
        description: '주제가 돌아오고 변형되는 길을 보는 입구입니다.',
        axis: '구조형',
        level: 1,
        unlockedByTags: const ['소나타', '푸가', '변주', '교향곡'],
      ),
      node(
        id: 'form-familiar',
        title: '구조가 보이는 길',
        description: '형식과 전개를 따라가며 길게 듣는 단계입니다.',
        axis: '구조형',
        level: 2,
        prerequisiteNodeIds: const ['form-entry'],
      ),
      node(
        id: 'instrument-color',
        title: '좋아하는 악기로 넓히는 길',
        description: '좋아진 악기 소리를 중심으로 작품을 넓히는 길입니다.',
        axis: '악기형',
        level: 1,
        unlockedByTags: const ['악기가 궁금함', '피아노', '바이올린', '첼로'],
      ),
    ];
  }

  List<ListeningMapEdge> _listeningMapEdges() {
    return const <ListeningMapEdge>[
      ListeningMapEdge(
        fromNodeId: 'melody-entry',
        toNodeId: 'melody-familiar',
        reason: '선율을 잡기 시작하면 더 긴 호흡의 선율로 이어집니다.',
        difficultyStep: 1,
      ),
      ListeningMapEdge(
        fromNodeId: 'melody-entry',
        toNodeId: 'color-entry',
        reason: '선율 뒤의 화성과 소리 색으로 살짝 넓힙니다.',
        difficultyStep: 1,
      ),
      ListeningMapEdge(
        fromNodeId: 'color-entry',
        toNodeId: 'color-familiar',
        reason: '소리의 색이 보이면 더 복잡한 질감도 열립니다.',
        difficultyStep: 1,
      ),
      ListeningMapEdge(
        fromNodeId: 'rhythm-entry',
        toNodeId: 'rhythm-familiar',
        reason: '움직임이 잡히면 반복과 변형을 따라갈 수 있습니다.',
        difficultyStep: 1,
      ),
      ListeningMapEdge(
        fromNodeId: 'dramatic-entry',
        toNodeId: 'dramatic-familiar',
        reason: '장면 전환을 잡으면 긴 작품의 흐름도 보입니다.',
        difficultyStep: 1,
      ),
      ListeningMapEdge(
        fromNodeId: 'dramatic-entry',
        toNodeId: 'tension-entry',
        reason: '극적인 순간에서 긴장과 해소 쪽으로 들어갑니다.',
        difficultyStep: 1,
      ),
      ListeningMapEdge(
        fromNodeId: 'form-entry',
        toNodeId: 'form-familiar',
        reason: '주제가 돌아오는 길이 보이면 구조를 더 길게 따라갑니다.',
        difficultyStep: 1,
      ),
      ListeningMapEdge(
        fromNodeId: 'instrument-color',
        toNodeId: 'color-entry',
        reason: '악기 소리에서 전체 음색으로 넓힙니다.',
        difficultyStep: 1,
      ),
    ];
  }

  UserListeningMapState _deriveListeningMapState(
    List<ListeningMapNode> nodes,
    List<ListeningMapEdge> edges,
  ) {
    final opened = <String>{};
    final familiar = <String>{};
    final conquered = <String>{};
    final unfamiliar = <String>{};
    final capturedMomentIds = <String>{};
    final evidenceCountByNode = <String, int>{};
    DateTime? updatedAt;

    void touch(DateTime? at) {
      if (at != null && (updatedAt == null || at.isAfter(updatedAt!))) {
        updatedAt = at;
      }
    }

    void openNode(String nodeId, {int evidence = 1, DateTime? at}) {
      opened.add(nodeId);
      evidenceCountByNode[nodeId] =
          (evidenceCountByNode[nodeId] ?? 0) + evidence;
      touch(at);
    }

    void openWork(ClassicalWork work, {int evidence = 1, DateTime? at}) {
      for (final node in _nodesForWork(work, nodes)) {
        openNode(node.id, evidence: evidence, at: at);
      }
    }

    for (final item in _state.tasteIntakeItems) {
      final work = item.matchedWorkId == null
          ? null
          : workById(item.matchedWorkId!);
      if (work != null) {
        openWork(work, evidence: 2, at: item.createdAt);
      } else {
        openNode(
          _entryNodeIdForAxis(_axisForFreeText(item.rawInput)),
          evidence: 1,
          at: item.createdAt,
        );
      }
    }

    for (final state in _state.workStates.values) {
      final work = workById(state.workId);
      if (work == null) {
        continue;
      }
      openWork(work, evidence: state.saved ? 2 : 1, at: state.updatedAt);
    }

    for (final event in _state.events) {
      if (event.entityType != 'work') {
        continue;
      }
      final work = workById(event.entityId);
      if (work == null) {
        continue;
      }
      if (event.context != null && event.context!.isNotEmpty) {
        capturedMomentIds.add('${work.id}:${event.context}');
      }
      final evidence = switch (event.eventType) {
        'listening_moment_complete' => 2,
        'external_platform_click' => 2,
        'listening_moment_preview_open' => 1,
        _ => 0,
      };
      if (evidence > 0) {
        openWork(work, evidence: evidence, at: event.occurredAt);
      }
    }

    for (final reaction in _state.reactions) {
      final work = workById(reaction.workId);
      if (work == null) {
        continue;
      }
      final workNodes = _nodesForWork(work, nodes);
      for (final node in workNodes) {
        openNode(
          node.id,
          evidence: reaction.type == 'unsure' ? 1 : 2,
          at: reaction.occurredAt,
        );
        if (reaction.type == 'unsure') {
          unfamiliar.add(node.id);
        }
      }
      if (reaction.type == 'instrument') {
        openNode('instrument-color', evidence: 2, at: reaction.occurredAt);
      }
    }

    for (final reflection in _state.postConcertReflections) {
      final work = workById(reflection.workId);
      if (work != null) {
        openWork(work, evidence: 2, at: reflection.occurredAt);
      }
    }

    for (final entry in evidenceCountByNode.entries) {
      if (entry.value >= 4) {
        familiar.add(entry.key);
      }
    }

    for (final work in conqueredWorks()) {
      for (final node in _nodesForWork(work, nodes)) {
        conquered.add(node.id);
        familiar.add(node.id);
        opened.add(node.id);
      }
    }

    final currentNodeId = _currentListeningMapNodeId(
      nodes,
      opened,
      familiar,
      conquered,
    );
    final nextNodeIds = _nextListeningMapNodeIds(
      nodes: nodes,
      edges: edges,
      opened: opened,
      familiar: familiar,
      currentNodeId: currentNodeId,
    );

    return UserListeningMapState(
      openedNodeIds: Set<String>.unmodifiable(opened),
      familiarNodeIds: Set<String>.unmodifiable(familiar),
      conqueredNodeIds: Set<String>.unmodifiable(conquered),
      unfamiliarNodeIds: Set<String>.unmodifiable(unfamiliar),
      currentNodeId: currentNodeId,
      nextNodeIds: List<String>.unmodifiable(nextNodeIds),
      capturedMomentIds: Set<String>.unmodifiable(capturedMomentIds),
      updatedAt: updatedAt,
    );
  }

  String? _currentListeningMapNodeId(
    List<ListeningMapNode> nodes,
    Set<String> opened,
    Set<String> familiar,
    Set<String> conquered,
  ) {
    final nodeById = {for (final node in nodes) node.id: node};
    final primaryAxis = tasteAxisScores().firstOrNull?.axis;
    int rank(String nodeId) {
      final node = nodeById[nodeId];
      if (node == null) {
        return 0;
      }
      return (node.axis == primaryAxis ? 20 : 0) + node.level;
    }

    final candidates = <String>{...opened, ...familiar, ...conquered}.toList()
      ..sort((a, b) => rank(b).compareTo(rank(a)));
    return candidates.firstOrNull;
  }

  List<String> _nextListeningMapNodeIds({
    required List<ListeningMapNode> nodes,
    required List<ListeningMapEdge> edges,
    required Set<String> opened,
    required Set<String> familiar,
    required String? currentNodeId,
  }) {
    final nodeById = {for (final node in nodes) node.id: node};
    final candidates = <String>[];
    if (currentNodeId != null) {
      for (final edge in edges.where(
        (edge) => edge.fromNodeId == currentNodeId,
      )) {
        if (!opened.contains(edge.toNodeId) &&
            nodeById.containsKey(edge.toNodeId)) {
          candidates.add(edge.toNodeId);
        }
      }
    }
    for (final node in nodes) {
      final prerequisitesMet =
          node.prerequisiteNodeIds.isEmpty ||
          node.prerequisiteNodeIds.every(opened.contains);
      if (prerequisitesMet &&
          !opened.contains(node.id) &&
          !candidates.contains(node.id)) {
        candidates.add(node.id);
      }
    }
    if (candidates.isEmpty) {
      for (final node in nodes.where((node) => !familiar.contains(node.id))) {
        candidates.add(node.id);
        if (candidates.length >= 3) {
          break;
        }
      }
    }
    return candidates.take(3).toList(growable: false);
  }

  List<ListeningMapNode> _nodesForWork(
    ClassicalWork work,
    List<ListeningMapNode> nodes,
  ) {
    final nodeById = {for (final node in nodes) node.id: node};
    final primaryAxis = _primaryAxisForWork(work);
    final ids = <String>{
      _entryNodeIdForAxis(primaryAxis),
      if (work.difficultyForListening >= 2) _familiarNodeIdForAxis(primaryAxis),
    };
    if (_containsAny(work.instrumentation, [
      '피아노',
      '바이올린',
      '첼로',
      '관현악',
      '현악',
    ])) {
      ids.add('instrument-color');
    }
    final workText = [
      work.titleKo,
      work.titleOriginal,
      work.instrumentation,
      work.period,
      ...work.moodTags,
      ...work.contextTags,
    ].join(' ');
    if (_containsAny(workText, ['긴장', '어두', '비극', '불안', '폭풍', '단조'])) {
      ids.add('tension-entry');
    }
    return ids
        .map((id) => nodeById[id])
        .whereType<ListeningMapNode>()
        .toList(growable: false);
  }

  List<ClassicalWork> _worksForMapNodes(
    Iterable<ListeningMapNode> nodes, {
    bool easyOnly = false,
  }) {
    return _worksForMapNodeIds(
      nodes.map((node) => node.id).toSet(),
      easyOnly: easyOnly,
    );
  }

  List<ClassicalWork> _worksForMapNodeIds(
    Set<String> nodeIds, {
    bool easyOnly = false,
  }) {
    final nodes = _listeningMapNodes();
    return _works
        .where((work) => !easyOnly || work.difficultyForListening <= 2)
        .where(
          (work) => _nodesForWork(
            work,
            nodes,
          ).any((node) => nodeIds.contains(node.id)),
        )
        .take(16)
        .toList(growable: false);
  }

  List<String> _workIdsForAxis(String axis, {required int level}) {
    final primary = _works
        .where((work) => _primaryAxisForWork(work) == axis || axis == '악기형')
        .where((work) => level <= 1 || work.difficultyForListening >= 2)
        .where((work) => work.primaryMoment != null)
        .take(10)
        .map((work) => work.id)
        .toList(growable: false);
    if (primary.isNotEmpty) {
      return primary;
    }
    return _works
        .where((work) => level <= 1 || work.difficultyForListening >= 2)
        .where((work) => work.primaryMoment != null)
        .take(6)
        .map((work) => work.id)
        .toList(growable: false);
  }

  String _primaryAxisForWork(ClassicalWork work) {
    final entries = _axisWeightsForWork(work).entries.toList()
      ..sort((a, b) {
        final score = b.value.compareTo(a.value);
        if (score != 0) {
          return score;
        }
        return a.key.compareTo(b.key);
      });
    return entries.firstOrNull?.key ?? '선율형';
  }

  String _entryNodeIdForAxis(String axis) {
    return switch (axis) {
      '색채형' => 'color-entry',
      '리듬형' => 'rhythm-entry',
      '극적형' => 'dramatic-entry',
      '긴장형' => 'tension-entry',
      '구조형' => 'form-entry',
      '악기형' => 'instrument-color',
      _ => 'melody-entry',
    };
  }

  String _familiarNodeIdForAxis(String axis) {
    return switch (axis) {
      '색채형' => 'color-familiar',
      '리듬형' => 'rhythm-familiar',
      '극적형' => 'dramatic-familiar',
      '구조형' => 'form-familiar',
      '악기형' => 'instrument-color',
      _ => 'melody-familiar',
    };
  }

  String _mapNodeUserCopy({
    required String axis,
    required String title,
    required int level,
  }) {
    if (level <= 1) {
      return '$title은 오늘 30초만으로도 시작할 수 있어요.';
    }
    return '$axis 쪽이 익숙해지면 $title로 한 걸음 더 갑니다.';
  }

  String _listeningMapSummaryCopy({
    required ListeningMapNode? currentNode,
    required int openedCount,
    required int familiarCount,
    required List<ListeningMapNode> nextPath,
  }) {
    if (openedCount == 0) {
      return '아직 지도는 비어 있어요. 좋아하는 음악 하나에서 첫 길이 열립니다.';
    }
    final next = nextPath.firstOrNull?.title;
    if (familiarCount > 0 && currentNode != null) {
      return '${currentNode.title}이 조금 익숙해졌어요. 다음은 ${next ?? '가까운 길'}로 이어집니다.';
    }
    if (currentNode != null) {
      return '${currentNode.title}이 열렸어요. 오늘 한 지점만 더 들으면 길이 더 선명해집니다.';
    }
    return '좋아하는 음악에서 시작한 길이 조금씩 보입니다.';
  }

  String _listeningMapRewardCopy({
    required ListeningMapNode? currentNode,
    required List<ListeningMapNode> nextPath,
  }) {
    final current = currentNode?.title ?? '첫 길';
    final next = nextPath.firstOrNull?.title ?? '가까운 다음 길';
    return '$current에 오늘 들은 지점이 남았어요. 다음에는 $next 쪽으로 살짝 넓혀봅니다.';
  }

  String _workMapRoleCopy(
    ClassicalWork work,
    ListeningMapNode node,
    String status,
  ) {
    final statusCopy = switch (status) {
      ListeningMapNodeStatus.conquered => '내 곡이 된 길',
      ListeningMapNodeStatus.familiar => '다시 알아보는 길',
      ListeningMapNodeStatus.opened => '한 번 잡아본 길',
      ListeningMapNodeStatus.suggested => '다음에 열릴 길',
      _ => '아직 열리지 않은 길',
    };
    return '${work.titleKo}는 ${node.title}에 놓인 작품입니다. 지금은 $statusCopy로 표시됩니다.';
  }

  bool _isConqueredWorkCandidate(String workId) {
    final state = _state.workStates[workId];
    if (state == null) {
      return false;
    }
    final reactions = _state.reactions
        .where((reaction) => reaction.workId == workId)
        .toList();
    if (reactions.any((reaction) => reaction.type == 'unsure')) {
      return false;
    }
    var signals = 0;
    if (state.saved) {
      signals += 1;
    }
    if (reactions.isNotEmpty) {
      signals += 1;
    }
    if (_state.events.any(
      (event) =>
          event.entityType == 'work' &&
          event.entityId == workId &&
          event.eventType == 'external_platform_click',
    )) {
      signals += 1;
    }
    if (_state.events.any(
      (event) =>
          event.entityType == 'work' &&
          event.entityId == workId &&
          event.eventType == 'listening_moment_complete',
    )) {
      signals += 1;
    }
    return signals >= 2;
  }

  List<RecommendationShelf> _dedupeRecommendationShelves(
    Iterable<RecommendationShelf> shelves,
  ) {
    final seen = <String>{};
    final result = <RecommendationShelf>[];
    for (final shelf in shelves) {
      final works = <ClassicalWork>[];
      for (final work in shelf.works) {
        if (seen.add(work.id)) {
          works.add(work);
        }
      }
      if (works.isNotEmpty) {
        result.add(
          RecommendationShelf(
            id: shelf.id,
            title: shelf.title,
            reason: shelf.reason,
            source: shelf.source,
            works: works,
          ),
        );
      }
    }
    return result;
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

  List<TasteIntakeItem> _buildTasteIntakeItems(
    Iterable<String> rawInputs,
    DateTime now,
  ) {
    final seen = <String>{};
    final items = <TasteIntakeItem>[];
    var index = 0;
    for (final raw in rawInputs) {
      final trimmed = raw.trim();
      if (trimmed.isEmpty || !seen.add(normalizeDiscoveryText(trimmed))) {
        continue;
      }
      final matchedWork = _matchTasteWork(trimmed);
      final matchedComposer = matchedWork == null
          ? _matchComposer(trimmed)
          : null;
      items.add(
        TasteIntakeItem(
          id: 'taste-${now.microsecondsSinceEpoch}-$index',
          label:
              matchedWork?.titleKo ??
              matchedComposer?.nameKo ??
              _friendlyTasteLabel(trimmed),
          rawInput: trimmed,
          matchedWorkId: matchedWork?.id,
          matchedComposerId: matchedWork?.composerId ?? matchedComposer?.id,
          sourceType: matchedWork == null && matchedComposer == null
              ? 'free_text'
              : 'catalog_match',
          confidence: matchedWork == null
              ? (matchedComposer == null ? 20 : 55)
              : matchedWork.searchScore(trimmed).clamp(0, 100),
          createdAt: now.add(Duration(microseconds: index)),
        ),
      );
      index += 1;
      if (items.length == 8) {
        break;
      }
    }
    return items;
  }

  ClassicalWork? _matchTasteWork(String input) {
    final compact = normalizeDiscoveryText(input);
    final nicknameMatches = <({bool matched, String workId})>[
      (
        matched:
            compact.contains('라흐') &&
            (compact.contains('피협2') ||
                compact.contains('피아노협주곡2') ||
                compact.contains('pianoconcerto2')),
        workId: 'rachmaninoff-piano-concerto-2',
      ),
      (
        matched:
            compact.contains('말러') &&
            (compact.contains('아다지에토') || compact.contains('adagietto')),
        workId: 'mahler-adagietto',
      ),
      (
        matched:
            compact.contains('쇼팽') &&
            (compact.contains('녹턴') || compact.contains('nocturne')),
        workId: 'chopin-nocturne-op9-2',
      ),
    ];
    for (final match in nicknameMatches) {
      if (match.matched) {
        final work = workById(match.workId);
        if (work != null) {
          return work;
        }
      }
    }
    return searchWorks(input)
        .where((work) => work.searchScore(input) >= 40)
        .firstOrNull;
  }

  ClassicalComposer? _matchComposer(String input) {
    final normalized = normalizeDiscoveryText(input);
    for (final composer in _composers) {
      final fields = [
        composer.nameKo,
        composer.nameOriginal,
        ...composer.aliases,
      ];
      if (fields.any((field) => normalizeDiscoveryText(field) == normalized)) {
        return composer;
      }
    }
    for (final composer in _composers) {
      final fields = [
        composer.nameKo,
        composer.nameOriginal,
        ...composer.aliases,
      ];
      if (fields.any(
        (field) => normalizeDiscoveryText(field).contains(normalized),
      )) {
        return composer;
      }
    }
    return null;
  }

  String _friendlyTasteLabel(String rawInput) {
    if (rawInput.length <= 18) {
      return rawInput;
    }
    return '${rawInput.substring(0, 18)}...';
  }

  List<ProgressiveRecommendation> _previewProgressiveRecommendations({
    required String axis,
    required ClassicalWork? anchor,
    required String sourceEvidence,
  }) {
    final usedWorkIds = <String>{if (anchor != null) anchor.id};
    final candidates = _scoreProgressiveCandidates(
      axis: axis,
      targetDifficulty: 1,
      anchor: anchor,
      usedWorkIds: usedWorkIds,
    );

    ProgressiveRecommendation? pick(
      String lane,
      bool Function(ClassicalWork work) test,
    ) {
      for (final item in candidates) {
        if (!test(item.work)) {
          continue;
        }
        usedWorkIds.add(item.work.id);
        return ProgressiveRecommendation(
          work: item.work,
          lane: lane,
          reason: _progressiveReasonFor(item.work, lane, axis),
          distance: (item.work.difficultyForListening - 1).abs(),
          axis: axis,
          difficulty: item.work.difficultyForListening,
          sourceEvidence: sourceEvidence,
        );
      }
      return null;
    }

    return <ProgressiveRecommendation?>[
      pick('immediate', (work) => work.difficultyForListening <= 2),
      pick('stretch', (work) => work.difficultyForListening <= 3),
      pick('later', (work) => work.difficultyForListening >= 2),
    ].whereType<ProgressiveRecommendation>().toList(growable: false);
  }

  String _primaryAxisForTasteItems(List<TasteIntakeItem> items) {
    final scores = <String, int>{};
    for (final item in items) {
      final work = item.matchedWorkId == null
          ? null
          : workById(item.matchedWorkId!);
      if (work == null) {
        scores.update(
          _axisForFreeText(item.rawInput),
          (score) => score + 2,
          ifAbsent: () => 2,
        );
        continue;
      }
      for (final entry in _axisWeightsForWork(work).entries) {
        scores.update(
          entry.key,
          (score) => score + entry.value,
          ifAbsent: () => entry.value,
        );
      }
    }
    if (scores.isEmpty) {
      return '선율형';
    }
    final sorted = scores.entries.toList()
      ..sort((a, b) {
        final score = b.value.compareTo(a.value);
        if (score != 0) {
          return score;
        }
        return a.key.compareTo(b.key);
      });
    return sorted.first.key;
  }

  String _sourceEvidenceForPreview(List<TasteIntakeItem> items, String axis) {
    final label = items.first.label;
    return '$label에서 출발해 ${_axisNoun(axis)} 쪽으로 가까운 길을 잡았습니다.';
  }

  String _dailyTasteEvidenceLabel() {
    if (_state.tasteIntakeItems.isEmpty) {
      return '';
    }
    final item = _state.tasteIntakeItems.first;
    return item.sourceType == 'catalog_match' ? item.label : item.rawInput;
  }

  String _tasteBasedDailyReason(TasteIntakeItem item, String axis) {
    final label = item.sourceType == 'catalog_match'
        ? item.label
        : item.rawInput;
    final action = _axisListeningAction(axis);
    return '$label에서 시작했다면, 오늘은 $action 30초만 잡아봅니다.';
  }

  String _axisListeningAction(String axis) {
    return switch (axis) {
      '색채형' => '소리가 번지는 장면',
      '리듬형' => '몸이 먼저 따라가는 움직임',
      '긴장형' => '긴장이 풀리는 순간',
      '구조형' => '주제가 돌아오는 길',
      '극적형' => '장면이 바뀌는 지점',
      _ => '선율이 앞으로 나오는 순간',
    };
  }

  String _axisNoun(String axis) {
    return switch (axis) {
      '색채형' => '소리의 색',
      '리듬형' => '움직임',
      '긴장형' => '긴장과 해소',
      '구조형' => '흐름',
      '극적형' => '장면감',
      _ => '선율',
    };
  }

  String _dailyNextEffectFor({required bool isCompleted}) {
    if (isCompleted) {
      return '내일은 오늘 남긴 반응에서 너무 멀지 않은 작품으로 이어갑니다.';
    }
    return '좋음이나 아직 모르겠음을 남기면 다음 세 작품이 조금 더 가까워집니다.';
  }

  ClassicalWork _easyFounderWork(DateTime now) {
    final founderPool = _works
        .where(
          (work) =>
              work.primaryMoment != null &&
              (work.catalogStatusTags.contains('founder_pick') ||
                  work.contextTags.contains('처음 듣기')),
        )
        .toList(growable: false);
    final easyPool = founderPool
        .where((work) => work.difficultyForListening <= 2)
        .toList(growable: false);
    final pool = easyPool.isEmpty
        ? (founderPool.isEmpty
              ? _works.where((work) => work.primaryMoment != null).toList()
              : founderPool)
        : easyPool;
    final day = now.difference(DateTime(2026)).inDays;
    return pool[day.abs() % pool.length];
  }

  ClassicalWork? _recentUnsureAnchor(DateTime now) {
    final recentUnsure = _state.reactions
        .where(
          (reaction) =>
              reaction.type == 'unsure' &&
              now.difference(reaction.occurredAt).inDays <= 7,
        )
        .toList(growable: false);
    if (recentUnsure.isEmpty) {
      return null;
    }
    final unsureWork = workById(recentUnsure.first.workId);
    if (unsureWork == null) {
      return null;
    }
    final closeWorks = _recommendFor(unsureWork, maxCount: 8)
        .where(
          (work) =>
              work.primaryMoment != null &&
              work.difficultyForListening <=
                  unsureWork.difficultyForListening.clamp(1, 3),
        )
        .toList(growable: false);
    return closeWorks.firstOrNull ?? _easyFounderWork(now);
  }

  ClassicalWork? _completedWorkOn(DateTime date) {
    for (final reaction in _state.reactions) {
      if (_isSameLocalDay(reaction.occurredAt, date)) {
        final work = workById(reaction.workId);
        if (work?.primaryMoment != null) {
          return work;
        }
      }
    }
    for (final event in _state.events) {
      if (!_isDailyCompletionEvent(event) ||
          !_isSameLocalDay(event.occurredAt, date)) {
        continue;
      }
      final work = workById(event.entityId);
      if (work?.primaryMoment != null) {
        return work;
      }
    }
    return null;
  }

  bool _workHasDailyCompletion(String workId, DateTime date) {
    final hasReaction = _state.reactions.any(
      (reaction) =>
          reaction.workId == workId &&
          _isSameLocalDay(reaction.occurredAt, date),
    );
    if (hasReaction) {
      return true;
    }
    return _state.events.any(
      (event) =>
          event.entityType == 'work' &&
          event.entityId == workId &&
          _isDailyCompletionEvent(event) &&
          _isSameLocalDay(event.occurredAt, date),
    );
  }

  Set<DateTime> _dailyCompletionDates() {
    return <DateTime>{
      for (final reaction in _state.reactions) _dateOnly(reaction.occurredAt),
      for (final event in _state.events)
        if (_isDailyCompletionEvent(event)) _dateOnly(event.occurredAt),
    };
  }

  bool _isDailyCompletionEvent(DiscoveryEvent event) {
    return event.entityType == 'work' &&
        (event.eventType == 'listening_moment_complete' ||
            event.eventType == 'external_platform_click');
  }

  bool _isSameLocalDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  DateTime _dateOnly(DateTime value) {
    return DateTime(value.year, value.month, value.day);
  }

  String _dailyReasonFor(
    ClassicalWork work, {
    required String axis,
    required String tasteEvidenceLabel,
    required bool hasSavedUnopened,
    required bool isUnsureRecovery,
    required bool isCompleted,
  }) {
    if (isCompleted) {
      return '오늘 기록에 남았습니다. 다음 추천은 이 반응을 기준으로 조금 바뀝니다.';
    }
    if (hasSavedUnopened) {
      return '저장만 해둔 작품을 오늘은 30초 지점부터 열어봅니다.';
    }
    if (isUnsureRecovery) {
      return '낯설었던 반응이 있어 더 가까운 입구로 낮춰 잡았습니다.';
    }
    if (tasteEvidenceLabel.isNotEmpty) {
      return '$tasteEvidenceLabel에서 시작했다면, 오늘은 ${_axisListeningAction(axis)}만 들어봅니다.';
    }
    if (_state.reactions.isNotEmpty) {
      return '남긴 반응에서 너무 멀지 않은 한 걸음입니다.';
    }
    if (work.catalogStatusTags.contains('founder_pick')) {
      return '처음 열어도 부담이 적은 입구로 골랐습니다.';
    }
    return '오늘 하나만 들어도 충분한 지점입니다.';
  }

  Map<String, int> _axisWeightsForWork(ClassicalWork work) {
    final weights = <String, int>{};
    void add(String axis, int score) {
      weights[axis] = (weights[axis] ?? 0) + score;
    }

    final text = [
      work.titleKo,
      work.titleOriginal,
      work.instrumentation,
      work.period,
      ...work.moodTags,
      ...work.contextTags,
    ].join(' ');
    if (_containsAny(text, ['서정', '노래', '아리아', '녹턴', '선율', '달빛', '밤'])) {
      add('선율형', 3);
    }
    if (_containsAny(text, ['색채', '인상', '관현악', '오케스트라', '목관', '현악', '분위기'])) {
      add('색채형', 3);
    }
    if (_containsAny(text, ['춤', '리듬', '행진', '스케르초', '반복', '활기'])) {
      add('리듬형', 3);
    }
    if (_containsAny(text, ['긴장', '어두', '비극', '불안', '폭풍', '단조'])) {
      add('긴장형', 3);
    }
    if (_containsAny(text, ['푸가', '변주', '소나타', '교향곡', '사중주', '구조'])) {
      add('구조형', 3);
    }
    if (_containsAny(text, ['극적', '클라이맥스', '협주곡', '오페라', '서사', '웅장'])) {
      add('극적형', 3);
    }
    if (weights.isEmpty) {
      add(work.difficultyForListening <= 2 ? '선율형' : '구조형', 1);
    }
    return weights;
  }

  bool _containsAny(String value, List<String> needles) {
    final normalized = normalizeDiscoveryText(value);
    return needles.any(
      (needle) => normalized.contains(normalizeDiscoveryText(needle)),
    );
  }

  String _axisForFreeText(String input) {
    if (_containsAny(input, ['영화', 'ost', '게임', '드라마', '웅장'])) {
      return '극적형';
    }
    if (_containsAny(input, ['재즈', '비트', '댄스', '리듬'])) {
      return '리듬형';
    }
    if (_containsAny(input, ['밴드', '록', '어두', '강한'])) {
      return '긴장형';
    }
    if (_containsAny(input, ['피아노', '발라드', '멜로디', '선율'])) {
      return '선율형';
    }
    if (_containsAny(input, ['앰비언트', '사운드', '분위기', '색'])) {
      return '색채형';
    }
    return '선율형';
  }

  String _nextGrowthAreaFor(List<String> strengths) {
    for (final axis in const ['색채형', '리듬형', '긴장형', '구조형', '극적형', '선율형']) {
      if (!strengths.contains(axis)) {
        return axis;
      }
    }
    return '구조형';
  }

  int _targetDifficultyFor(String level) {
    return switch (level) {
      '첫 입구' => 1,
      '익숙해지는 중' => 2,
      '넓히는 중' => 3,
      _ => 4,
    };
  }

  ClassicalWork? _bestTasteAnchor() {
    for (final item in _state.tasteIntakeItems) {
      if (item.matchedWorkId case final workId?) {
        final work = workById(workId);
        if (work != null) {
          return work;
        }
      }
    }
    if (savedWorks.isNotEmpty) {
      return savedWorks.first;
    }
    return null;
  }

  List<({ClassicalWork work, int score})> _scoreProgressiveCandidates({
    required String axis,
    required int targetDifficulty,
    required ClassicalWork? anchor,
    required Set<String> usedWorkIds,
  }) {
    final scored = <({ClassicalWork work, int score})>[];
    for (final work in _works) {
      if (usedWorkIds.contains(work.id)) {
        continue;
      }
      final weights = _axisWeightsForWork(work);
      var score = (weights[axis] ?? 0) * 8;
      if (anchor != null) {
        score += work.relevanceScoreFor(
          anchor: anchor,
          hasConcert: work.concertIds.isNotEmpty,
        );
      }
      score += (6 - (work.difficultyForListening - targetDifficulty).abs())
          .clamp(0, 6);
      if (work.catalogStatusTags.contains('founder_pick')) {
        score += 5;
      }
      if (work.contextTags.contains('처음 듣기')) {
        score += 3;
      }
      if (work.concertIds.isNotEmpty) {
        score += 1;
      }
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
    return scored;
  }

  String _progressiveReasonFor(ClassicalWork work, String lane, String axis) {
    return switch (lane) {
      'immediate' => '${_axisReasonPrefix(axis)} 지금 듣기 좋은 입구에 가깝습니다.',
      'stretch' => '${work.instrumentation}와 ${work.period} 색으로 한 걸음만 넓혀봅니다.',
      'later' => '지금은 낯설 수 있지만, ${work.instrumentation}에 익숙해지면 다시 열릴 작품입니다.',
      _ => '오늘 하나만 들어도 충분한 작품입니다.',
    };
  }

  String _axisReasonPrefix(String axis) {
    return switch (axis) {
      '색채형' => '소리의 색에 머무는 기록이 있어요.',
      '리듬형' => '움직임에 반응한 신호가 있어요.',
      '긴장형' => '긴장과 해소를 붙잡은 기록이 있어요.',
      '구조형' => '큰 흐름을 따라가는 쪽으로 귀가 열리고 있어요.',
      '극적형' => '장면이 그려지는 음악에 반응했어요.',
      _ => '선율이 선명한 작품에 반응했어요.',
    };
  }

  String _sourceEvidenceFor(String axis) {
    final score = tasteAxisScores()
        .where((item) => item.axis == axis)
        .firstOrNull;
    if (score == null || score.evidenceCount == 0) {
      return '아직 기록이 적어 잘 열리는 입구부터 시작합니다.';
    }
    return '저장/반응/입력 기록 ${score.evidenceCount}개에서 이어집니다.';
  }

  String _reactionLabelFor(String type) {
    return switch (type) {
      'liked' => '좋았다고 남김',
      'repeat' => '다시 듣고 싶음',
      'instrument' => '악기가 궁금했음',
      'unsure' => '아직 낯설었음',
      _ => type,
    };
  }
}
