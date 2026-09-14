import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';

import 'classical_daily_notification.dart';
import 'classical_discovery_catalog.dart';
import 'classical_concert_import.dart';
import 'classical_discovery_data_source.dart';
import 'classical_discovery_models.dart';
import 'classical_discovery_ops.dart'
    show classicalFounderIntent, classicalQualityObservationQuestions;
import 'classical_discovery_store.dart';

typedef ClassicalDiscoveryClock = DateTime Function();

final _discoveryIdRandom = Random.secure();
String _discoveryIdSuffix() =>
    '${_discoveryIdRandom.nextInt(1 << 32).toRadixString(36)}${_discoveryIdRandom.nextInt(1 << 32).toRadixString(36)}';

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
    ClassicalDailyNotificationGateway? notificationGateway,
  }) : _composers = composers ?? ClassicalDiscoveryCatalog.composers,
       _works = works ?? ClassicalDiscoveryCatalog.works,
       _concerts = concerts ?? ClassicalDiscoveryCatalog.concerts,
       _promotions = promotions ?? ClassicalDiscoveryCatalog.promotions,
       _clock = clock ?? DateTime.now,
       _notificationGateway =
           notificationGateway ??
           const MethodChannelClassicalDailyNotificationGateway();

  factory ClassicalDiscoveryController.fromDataSource({
    required ClassicalDiscoveryStore store,
    required ClassicalCatalogDataSource dataSource,
    ClassicalDiscoveryClock? clock,
    ClassicalDailyNotificationGateway? notificationGateway,
  }) {
    final catalog = dataSource.loadCatalog();
    return ClassicalDiscoveryController(
      store: store,
      composers: catalog.composers,
      works: catalog.works,
      concerts: catalog.concerts,
      promotions: catalog.promotions,
      clock: clock,
      notificationGateway: notificationGateway,
    );
  }

  final ClassicalDiscoveryStore store;
  final List<ClassicalComposer> _composers;
  final List<ClassicalWork> _works;
  final List<ClassicalConcert> _concerts;
  final List<ConcertPromotion> _promotions;
  final ClassicalDiscoveryClock _clock;
  final ClassicalDailyNotificationGateway _notificationGateway;

  UserDiscoveryState _state = UserDiscoveryState.defaultState;
  bool _isLoading = true;
  bool _loadFailed = false;
  bool _resettingData = false;
  int _dataGeneration = 0;
  bool get resettingData => _resettingData;
  String? persistenceMessage;
  Future<void> _pendingWrites = Future<void>.value();
  int _writeRevision = 0;
  bool _disposed = false;
  bool get loadFailed => _loadFailed;
  StreamSubscription<void>? _notificationSubscription;
  Future<void> _notificationActions = Future<void>.value();
  Future<void> _notificationOpens = Future<void>.value();
  final ValueNotifier<DailyPick?> notificationDestination = ValueNotifier(null);

  @override
  void dispose() {
    _disposed = true;
    _notificationSubscription?.cancel();
    notificationDestination.dispose();
    super.dispose();
  }

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
  bool get hasDailyRecommendation => _works.any(_isRecommendationReady);
  Duration get untilNextDailyPick {
    final now = _clock();
    return DateTime(now.year, now.month, now.day + 1).difference(now);
  }

  Iterable<ClassicalReaction> get _latestReactions {
    final byWork = <String, ClassicalReaction>{};
    for (final reaction in _state.reactions) {
      final previous = byWork[reaction.workId];
      if (previous == null ||
          reaction.occurredAt.isAfter(previous.occurredAt)) {
        byWork[reaction.workId] = reaction;
      }
    }
    return byWork.values;
  }

  List<TasteIntakeItem> get tasteIntakeItems =>
      List<TasteIntakeItem>.unmodifiable(_state.tasteIntakeItems);
  ReminderPreference get reminderPreference => _state.reminderPreference;
  FounderTasteProfile get founderTasteProfile => FounderTasteProfile.current;
  List<DailyPick> get dailyPickHistory {
    final picks = <DailyPick>[dailyPick(), ..._state.dailyPicks];
    final byId = <String, DailyPick>{};
    for (final pick in picks) {
      byId.putIfAbsent(pick.id, () => _withoutLegacyTasteClaim(pick));
    }
    final result = byId.values.toList()
      ..sort((a, b) => b.date.compareTo(a.date));
    return List<DailyPick>.unmodifiable(result);
  }

  List<FirstSevenDayDailyPickPreview> founderSevenDayPreview({
    DateTime? startDate,
  }) {
    if (!hasDailyRecommendation) return const [];
    final start = _dateOnly(startDate ?? _clock());
    final now = _clock();
    final tasteItems = _state.tasteIntakeItems.isNotEmpty
        ? _state.tasteIntakeItems.take(24).toList(growable: false)
        : _buildTasteIntakeItems([
            ...FounderTasteProfile.current.favoriteInputs,
            FounderTasteProfile.current.fastReaction,
          ], now);
    final previewController = ClassicalDiscoveryController(
      store: store,
      composers: _composers,
      works: _works,
      concerts: _concerts,
      promotions: _promotions,
      clock: () => now,
      notificationGateway: const DisabledClassicalDailyNotificationGateway(),
    );
    previewController._state = _state.copyWith(
      tasteIntakeItems: tasteItems,
      dailyPicks: <DailyPick>[],
      excludedComposerIds: _state.tasteIntakeItems.isEmpty
          ? {..._state.excludedComposerIds, ..._founderExcludedComposerIds}
          : _state.excludedComposerIds,
      excludeOperaticVocals: _state.tasteIntakeItems.isEmpty
          ? true
          : _state.excludeOperaticVocals,
    );
    if (!previewController.hasDailyRecommendation) return const [];
    final priorPicks = <DailyPick>[];
    final result = <FirstSevenDayDailyPickPreview>[];
    for (var index = 0; index < 7; index += 1) {
      final date = DateTime(start.year, start.month, start.day + index);
      final dayNow = DateTime(date.year, date.month, date.day, 9);
      previewController._state = previewController._state.copyWith(
        dailyPicks: priorPicks,
      );
      final pick = previewController._buildDailyPick(date: date, now: dayNow);
      final work = previewController.workById(pick.workId);
      if (work == null) {
        continue;
      }
      final moment =
          work.listeningMoments
              .where((candidate) => candidate.id == pick.momentId)
              .firstOrNull ??
          work.primaryMoment ??
          work.listeningMoments.first;
      result.add(
        FirstSevenDayDailyPickPreview(
          day: index + 1,
          date: date,
          pick: pick,
          work: work,
          moment: moment,
          judgement: _firstSevenDayJudgement(index, pick),
          nextPath: _firstSevenDayNextPath(pick),
        ),
      );
      priorPicks.insert(
        0,
        pick.copyWith(completedAt: dayNow, completionConfirmed: true),
      );
    }
    return List<FirstSevenDayDailyPickPreview>.unmodifiable(result);
  }

  FounderDailyPickQualitySnapshot founderDailyPickQualitySnapshot({
    DateTime? startDate,
  }) {
    final preview = founderSevenDayPreview(startDate: startDate);
    final firstThree = preview.take(3).toList(growable: false);
    final closeFirstThree =
        firstThree.length == 3 &&
        firstThree.every((item) => item.pick.pickType == 'close_step');
    final surpriseCount = preview
        .where((item) => item.pick.pickType == 'surprise')
        .length;
    final coldMismatchCount = preview
        .where(
          (item) => _state.tasteIntakeItems.isEmpty
              ? _founderExcludedComposerIds.contains(item.work.composerId) ||
                    item.work.isOperaticVocal
              : _isExcludedRecommendation(item.work),
        )
        .length;
    final hasListeningPoint = preview.every(
      (item) => item.pick.listenFor.trim().isNotEmpty,
    );
    final ready =
        preview.length == 7 &&
        closeFirstThree &&
        surpriseCount <= 1 &&
        coldMismatchCount == 0 &&
        hasListeningPoint;
    final lines = <String>[
      'Daily Pick first 7 days: SIMULATION (assumes completion each day)',
      'previewDays=${preview.length}',
      'closeFirstThree=$closeFirstThree',
      'surpriseCount=$surpriseCount',
      'coldMismatchCount=$coldMismatchCount',
      'ruleCompliancePassed=$ready',
      'founderApproval=${classicalFounderIntent(_state.events)}',
      for (final item in preview)
        'day${item.day}: ${item.work.titleKo} / ${item.pick.distanceLabel} / ${item.judgement}',
    ];
    return FounderDailyPickQualitySnapshot(
      previewDays: preview.length,
      closeFirstThree: closeFirstThree,
      surpriseCount: surpriseCount,
      coldMismatchCount: coldMismatchCount,
      ruleCompliancePassed: ready,
      founderApproval: classicalFounderIntent(_state.events),
      exportText: lines.join('\n'),
    );
  }

  ClassicalWork get todayWork {
    final savedDue = repeatDueWorks().where(_isRecommendationReady).toList();
    if (savedDue.isNotEmpty) {
      return savedDue.first;
    }
    final founderPool = _works
        .where(
          (work) =>
              _isRecommendationReady(work) &&
              work.catalogStatusTags.contains('founder_pick'),
        )
        .toList(growable: false);
    final pool = founderPool.isEmpty
        ? _works.where(_isRecommendationReady).toList()
        : founderPool;
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
    if (_resettingData) return;
    final generation = _dataGeneration;
    _isLoading = true;
    notifyListeners();
    try {
      final loaded = await store.loadState();
      if (generation != _dataGeneration) return;
      _state = loaded;
      _loadFailed = false;
      persistenceMessage = store.recoveryMessage;
    } catch (_) {
      if (generation != _dataGeneration) return;
      _loadFailed = true;
      _isLoading = false;
      persistenceMessage = '기록을 불러오지 못했습니다. 기존 기록은 그대로 보관되어 있어요.';
      notifyListeners();
      return;
    }
    if (_state.onboardingCompleted && hasDailyRecommendation) {
      await ensureDailyPick();
    }
    _isLoading = false;
    _notificationSubscription ??= _notificationGateway.opens.listen((_) {
      unawaited(consumePendingDailyPickNotification());
    });
    await consumePendingDailyPickNotification();
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
    ].take(DiscoveryHistoryLimits.tasteInputs).toList(growable: false);
    await _setState(
      _state.copyWith(
        tasteIntakeItems: nextItems,
        preferencesUpdatedAt: _nextPreferencesRevision(now),
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
    if (hasDailyRecommendation) await ensureDailyPick();
  }

  Future<void> correctTasteIntakeMatch(String itemId, {String? workId}) async {
    if (_loadFailed) throw StateError('Stored preferences could not be loaded');
    final item = _state.tasteIntakeItems
        .where((item) => item.id == itemId)
        .firstOrNull;
    if (item == null) throw ArgumentError.value(itemId, 'itemId');
    final work = workId == null ? null : workById(workId);
    if (workId != null && work == null) {
      throw ArgumentError.value(workId, 'workId');
    }
    final previousRevision = item.updatedAt ?? item.createdAt;
    final now = _clock();
    final revision = now.isAfter(previousRevision)
        ? now
        : previousRevision.add(const Duration(microseconds: 1));
    final corrected = TasteIntakeItem(
      id: item.id,
      rawInput: item.rawInput,
      label: work?.titleKo ?? item.rawInput,
      sourceType: work == null ? 'free_text' : 'catalog_match',
      confidence: work == null ? 0 : 100,
      matchedWorkId: work?.id,
      matchedComposerId: work?.composerId,
      matchOrigin: work == null ? 'user_unlinked' : 'user_selected',
      createdAt: item.createdAt,
      updatedAt: revision,
    );
    await _setState(
      _state.copyWith(
        tasteIntakeItems: [
          for (final entry in _state.tasteIntakeItems)
            entry.id == itemId ? corrected : entry,
        ],
      ),
    );
    await _refreshEnabledReminder();
  }

  TasteStartPreview? previewTasteStart(Iterable<String> rawInputs) {
    if (!hasDailyRecommendation) return null;
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
    final translation = _tasteTranslationFor(
      items: items,
      axis: axis,
      work: work,
    );
    final step = DailyListeningStep(
      work: work,
      moment: moment,
      title: '오늘은 이 30초부터',
      prompt: translation.listenFor,
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
      translation: translation,
    );
    return TasteStartPreview(
      items: items,
      axis: axis,
      translation: translation,
      dailyStep: step,
      nextThree: nextThree,
    );
  }

  TasteTranslation? currentTasteTranslation() {
    if (_state.tasteIntakeItems.isEmpty) {
      return null;
    }
    final items = _state.tasteIntakeItems.take(3).toList(growable: false);
    final axis = _primaryAxisForTasteItems(items);
    final anchor = items
        .map(
          (item) =>
              item.matchedWorkId == null ? null : workById(item.matchedWorkId!),
        )
        .whereType<ClassicalWork>()
        .firstOrNull;
    final work =
        nextThreeRecommendations(anchor: anchor).firstOrNull?.work ??
        anchor ??
        _easyFounderWork(_clock());
    return _tasteTranslationFor(items: items, axis: axis, work: work);
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
        add(_axisForTasteItem(item), 12, item.createdAt);
      }
    }

    for (final state in _state.workStates.values) {
      final work = workById(state.workId);
      if (work == null) {
        continue;
      }
      final base = state.saved
          ? 4
          : state.familiarityLevel > 0
          ? 1
          : 0;
      for (final entry in _axisWeightsForWork(work).entries) {
        add(entry.key, entry.value * base, state.updatedAt);
      }
    }

    for (final reaction in _latestReactions) {
      final work = workById(reaction.workId);
      if (work == null) {
        continue;
      }
      final multiplier = switch (reaction.type) {
        'liked' => 4,
        'repeat' => 3,
        'instrument' => 2,
        'unsure' => 0,
        _ => 1,
      };
      for (final entry in _axisWeightsForWork(work).entries) {
        add(entry.key, entry.value * multiplier, reaction.occurredAt);
      }
    }

    for (final event in _state.events.where(
      (event) => event.eventType == 'ear_opening_answer',
    )) {
      final axis = event.properties['axis'];
      if (axis != null && axis.isNotEmpty) {
        add(axis, 2, event.occurredAt);
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
    return _withProgressiveFallbacks(
      [
        immediate,
        stretch,
        fallbackLater,
      ].whereType<ProgressiveRecommendation>().toList(growable: true),
      candidates: candidates,
      usedWorkIds: usedWorkIds,
      axis: axis,
      sourceEvidence: _sourceEvidenceFor(axis),
      targetDifficulty: targetDifficulty,
    );
  }

  DailyPick dailyPick({DateTime? now}) {
    final effectiveNow = now ?? _clock();
    final date = _dateOnly(effectiveNow);
    final stored = _state.dailyPicks
        .where((pick) => _isSameLocalDay(pick.date, date))
        .firstOrNull;
    return _withDerivedDailyPickCompletion(
      _resolveDailyPick(stored, date: date, now: effectiveNow),
      effectiveNow,
    );
  }

  String? _dailyPickCatalogIssue(DailyPick pick) {
    final work = workById(pick.workId);
    if (work == null) return 'work_removed';
    if (work.catalogStatusTags.contains('needs_copy_review') ||
        work.catalogStatusTags.contains('catalog_backfill')) {
      return 'work_unreviewed';
    }
    final moment = work.listeningMoments
        .where((item) => item.id == pick.momentId)
        .firstOrNull;
    if (moment == null || !_isValidRecommendationMoment(work, moment)) {
      return 'moment_unavailable';
    }
    return null;
  }

  DailyPick _resolveDailyPick(
    DailyPick? stored, {
    required DateTime date,
    required DateTime now,
  }) {
    final issue = stored == null ? null : _dailyPickCatalogIssue(stored);
    if (stored != null && issue == null) {
      final correctedSincePick = _state.tasteIntakeItems.any(
        (item) =>
            item.updatedAt != null &&
            !item.updatedAt!.isBefore(stored.createdAt),
      );
      if (!correctedSincePick) return _withoutLegacyTasteClaim(stored);
      // Keep the day's music/history, but no longer assert its old taste rationale.
      return stored.copyWith(
        reason: '음악 연결을 수정했어요. 오늘 고른 작품은 그대로 두고, 다음 추천부터 반영합니다.',
        sourceEvidence: '수정 전 고른 작품',
        whyNow: '오늘 고른 한 곡을 이어서 들어보세요.',
        distanceLabel: '오늘 고른 작품',
      );
    }
    final next = _buildDailyPick(date: date, now: now);
    if (stored == null) return next;
    // Catalog withdrawal is the only exception to a valid same-day pin.
    return next.copyWith(
      catalogRevision: stored.catalogRevision + 1,
      replacedWorkId: stored.workId,
      replacementReason: issue,
    );
  }

  DailyPick _withoutLegacyTasteClaim(DailyPick pick) {
    // Old snapshots lack the input provenance needed to assert a favorite movement.
    const legacyClaim = '을 좋아한다고 남겨주셨어요.';
    if (!pick.sourceEvidence.contains(legacyClaim)) return pick;
    return pick.copyWith(
      reason: '이전 추천의 취향 연결을 다시 확인하고 있어요. 고른 작품은 그대로 이어갑니다.',
      sourceEvidence: '이전에 고른 작품',
      whyNow: '좋았던 지점을 남기면 다음 추천에 반영합니다.',
      distanceLabel: '이전에 고른 작품',
    );
  }

  Future<DailyPick> ensureDailyPick({
    DateTime? now,
    bool openedFromNotification = false,
  }) async {
    final effectiveNow = now ?? _clock();
    final date = _dateOnly(effectiveNow);
    final existing = _state.dailyPicks
        .where((pick) => _isSameLocalDay(pick.date, date))
        .firstOrNull;
    final pick = _withDerivedDailyPickCompletion(
      _resolveDailyPick(existing, date: date, now: effectiveNow).copyWith(
        openedFromNotification:
            openedFromNotification ||
            (existing?.openedFromNotification ?? false),
      ),
      effectiveNow,
    );
    if (existing != null &&
        existing.catalogRevision == pick.catalogRevision &&
        existing.completedAt == pick.completedAt &&
        existing.completionConfirmed == pick.completionConfirmed &&
        existing.reason == pick.reason &&
        existing.sourceEvidence == pick.sourceEvidence &&
        existing.whyNow == pick.whyNow &&
        existing.distanceLabel == pick.distanceLabel &&
        existing.openedFromNotification == pick.openedFromNotification &&
        !openedFromNotification) {
      return pick;
    }
    final nextPicks = <DailyPick>[
      pick,
      ..._state.dailyPicks.where((item) => item.id != pick.id),
    ].take(DiscoveryHistoryLimits.dailyPicks).toList(growable: false);
    await _setState(
      _state.copyWith(
        dailyPicks: nextPicks,
        events: _withEvents([
          if (existing != null &&
              existing.catalogRevision != pick.catalogRevision)
            _eventRecord(
              'daily_pick_replaced',
              'work',
              pick.workId,
              at: effectiveNow,
              properties: {
                'dailyPickId': pick.id,
                'previousWorkId': existing.workId,
                'previousMomentId': existing.momentId,
                'reason': pick.replacementReason!,
                'revision': pick.catalogRevision.toString(),
              },
            ),
          if (openedFromNotification)
            _eventRecord(
              'daily_pick_notification_open',
              'work',
              pick.workId,
              context: pick.id,
              properties: <String, String>{
                'dailyPickId': pick.id,
                'date': _dateKey(pick.date),
              },
            ),
        ]),
      ),
    );
    return pick;
  }

  Future<void> configureDailyPickReminder({
    required bool enabled,
    String? timeLabel,
    String? message,
  }) => _queueNotificationAction(
    () => _configureDailyPickReminder(
      enabled: enabled,
      timeLabel: timeLabel,
      message: message,
    ),
  );

  Future<void> _queueNotificationAction(Future<void> Function() action) {
    if (_resettingData) return Future<void>.value();
    final pending = _notificationActions.then((_) => action());
    _notificationActions = pending.catchError((Object _) {});
    return pending;
  }

  Future<void> _configureDailyPickReminder({
    required bool enabled,
    String? timeLabel,
    String? message,
    bool requestPermission = true,
  }) async {
    if (enabled && !hasDailyRecommendation) {
      await _configureDailyPickReminder(
        enabled: false,
        requestPermission: false,
      );
      return;
    }
    final now = _clock();
    final reminderMessage = message ?? dailyPickReminderMessage(now: now);
    final base = _state.reminderPreference.copyWith(
      enabled: enabled,
      timeLabel: timeLabel,
      message: reminderMessage,
      updatedAt: now,
    );
    if (!enabled) {
      try {
        await _notificationGateway.cancelDailyPick();
      } catch (_) {
        await _setState(
          _state.copyWith(
            reminderPreference: _state.reminderPreference.copyWith(
              deliveryStatus: 'cancel-failed',
            ),
            events: _withEvent(
              'daily_pick_notification_error',
              'user',
              'local',
              properties: const {'operation': 'cancel'},
            ),
          ),
        );
        return;
      }
      final nextPrefs = <String>{..._state.notificationPreferences}
        ..remove('today_work');
      await _setState(
        _state.copyWith(
          reminderPreference: base.copyWith(
            deliveryStatus: 'local-notification-cancelled',
          ),
          notificationPreferences: nextPrefs,
          preferencesUpdatedAt: _nextPreferencesRevision(now),
          events: _withEvents([
            _eventRecord(
              'daily_pick_notification_cancel',
              'user',
              'local',
              at: now,
            ),
          ]),
        ),
      );
      return;
    }

    String permissionStatus;
    try {
      permissionStatus = requestPermission
          ? await _notificationGateway.requestPermission()
          : await _notificationGateway.currentPermissionStatus();
    } catch (_) {
      permissionStatus = 'permission-error';
    }
    final granted =
        permissionStatus == 'granted' ||
        permissionStatus == 'provisional' ||
        permissionStatus == 'authorized';
    final events = <DiscoveryEvent>[
      _eventRecord(
        'notification_permission_request',
        'user',
        'local',
        at: now,
        properties: <String, String>{'status': permissionStatus},
      ),
      _eventRecord(
        granted
            ? 'notification_permission_granted'
            : 'notification_permission_denied',
        'user',
        'local',
        at: now,
        properties: <String, String>{'status': permissionStatus},
      ),
    ];

    if (!granted) {
      final nextPrefs = <String>{..._state.notificationPreferences}
        ..remove('today_work');
      await _setState(
        _state.copyWith(
          reminderPreference: base.copyWith(
            enabled: false,
            deliveryStatus: switch (permissionStatus) {
              'unsupported' => 'unsupported',
              'denied' => 'permission-denied',
              _ => 'permission-error',
            },
          ),
          notificationPreferences: nextPrefs,
          preferencesUpdatedAt: _nextPreferencesRevision(now),
          events: _withEvents(events),
        ),
      );
      return;
    }

    final pick = await ensureDailyPick(now: now);
    final time = _parseReminderTime(base.timeLabel);
    final request = DailyPickNotificationRequest(
      pick: pick,
      title: '오늘 한 곡만 열어볼까요?',
      body: base.message,
      hour: time.hour,
      minute: time.minute,
    );
    var deliveryStatus = 'local-notification-scheduled';
    try {
      await _notificationGateway.scheduleDailyPick(request);
      events.add(
        _eventRecord(
          'daily_pick_notification_scheduled',
          'work',
          pick.workId,
          context: pick.id,
          at: now,
          properties: <String, String>{
            'dailyPickId': pick.id,
            'timeLabel': base.timeLabel,
          },
        ),
      );
    } catch (_) {
      deliveryStatus = 'schedule-failed';
      events.add(
        _eventRecord(
          'daily_pick_notification_error',
          'work',
          pick.workId,
          context: pick.id,
          at: now,
          properties: <String, String>{'timeLabel': base.timeLabel},
        ),
      );
    }

    final nextPrefs = <String>{..._state.notificationPreferences}
      ..add('today_work');
    await _setState(
      _state.copyWith(
        reminderPreference: base.copyWith(deliveryStatus: deliveryStatus),
        notificationPreferences: nextPrefs,
        preferencesUpdatedAt: _nextPreferencesRevision(now),
        events: _withEvents(events),
      ),
    );
  }

  String dailyPickReminderMessage({DateTime? now}) {
    final effectiveNow = now ?? _clock();
    final recentUnsure = _latestReactions
        .where(
          (reaction) =>
              reaction.type == 'unsure' &&
              !reaction.occurredAt.isAfter(effectiveNow) &&
              effectiveNow.difference(reaction.occurredAt).inDays <= 1,
        )
        .firstOrNull;
    if (recentUnsure != null) {
      return '오늘은 조금 더 가까운 곡으로 갈게요.';
    }
    if (savedButUnopenedWorks.isNotEmpty) {
      return '저장한 선율, 첫 지점만 다시 들어볼까요?';
    }
    final likedYesterday = _latestReactions.any(
      (reaction) =>
          reaction.type == 'liked' &&
          !reaction.occurredAt.isAfter(effectiveNow) &&
          effectiveNow.difference(reaction.occurredAt).inDays <= 2,
    );
    if (likedYesterday) {
      return '좋았던 감각에서 한 걸음만 이어가볼까요?';
    }
    final today = _dateOnly(effectiveNow);
    final yesterday = DateTime(today.year, today.month, today.day - 1);
    final hadEarlierDailyPick = _state.dailyPicks.any(
      (pick) => _dateOnly(pick.date).isBefore(today),
    );
    final completedYesterday = _dailyCompletionDates().any(
      (date) => _isSameLocalDay(date, yesterday),
    );
    if (hadEarlierDailyPick && !completedYesterday) {
      return '잠시 쉬었어도 괜찮아요. 오늘 한 곡만 열어볼까요?';
    }
    return '오늘 한 곡만 열어볼까요?';
  }

  Future<void> refreshDailyExperience() async {
    if (isLoading || loadFailed || needsOnboarding || !hasDailyRecommendation) {
      return;
    }
    await ensureDailyPick();
    await consumePendingDailyPickNotification();
    await _refreshEnabledReminder();
  }

  Future<void> _refreshEnabledReminder() => _queueNotificationAction(() async {
    if (_state.reminderPreference.enabled) {
      await _configureDailyPickReminder(
        enabled: true,
        requestPermission: false,
      );
    }
  });

  Future<void> consumePendingDailyPickNotification() {
    if (_resettingData) return Future<void>.value();
    final generation = _dataGeneration;
    final next = _notificationOpens.then((_) async {
      try {
        final payload = await _notificationGateway.consumeLaunchPayload();
        if (_resettingData || generation != _dataGeneration) return;
        if (payload == null || payload.trim().isEmpty) return;
        var valid = false;
        try {
          final decoded = jsonDecode(payload);
          valid =
              decoded is Map &&
              decoded['version'] == 1 &&
              decoded['route'] == 'today';
        } on FormatException {
          final legacy = Uri.splitQueryString(payload.replaceAll(';', '&'));
          valid =
              (legacy['dailyPickId']?.startsWith('daily-pick-') ?? false) &&
              workById(legacy['workId'] ?? '') != null;
        }
        if (!valid || !hasDailyRecommendation) return;
        final destination = await ensureDailyPick(openedFromNotification: true);
        if (!_resettingData && generation == _dataGeneration) {
          notificationDestination.value = destination;
        }
      } catch (_) {
        // Notification delivery must not prevent local music access.
      }
    });
    _notificationOpens = next;
    return next;
  }

  DailyPick _buildDailyPick({required DateTime date, required DateTime now}) {
    final axis = tasteAxisScores().firstOrNull?.axis ?? '선율형';
    final targetDifficulty = _targetDifficultyFor(
      listeningLevelSnapshot().level,
    );
    final usedWorkIds = <String>{
      ..._state.dailyPicks.take(14).map((pick) => pick.workId),
    };
    final savedWork = savedButUnopenedWorks
        .where(
          (work) =>
              _isRecommendationReady(work) &&
              work.primaryMoment != null &&
              !usedWorkIds.contains(work.id),
        )
        .firstOrNull;
    final unsureWork = _recentUnsureAnchor(now, excludedWorkIds: usedWorkIds);
    var pickType = unsureWork != null
        ? 'recovery'
        : savedWork != null
        ? 'revisit'
        : _dailyPickTypeFor(date, now);
    final anchor = _bestTasteAnchor();
    final candidates = _scoreProgressiveCandidates(
      axis: axis,
      targetDifficulty: targetDifficulty,
      anchor: anchor,
      usedWorkIds: {
        ...usedWorkIds,
        ..._state.tasteIntakeItems
            .map((item) => item.matchedWorkId)
            .whereType<String>(),
      },
    );
    var selected = _pickDailyWork(
      candidates: candidates,
      pickType: pickType,
      axis: axis,
      anchor: anchor,
      targetDifficulty: targetDifficulty,
    );
    if ((pickType == 'surprise' || pickType == 'gentle_expansion') &&
        selected == null) {
      pickType = 'close_step';
      selected = _pickDailyWork(
        candidates: candidates,
        pickType: pickType,
        axis: axis,
        anchor: anchor,
        targetDifficulty: targetDifficulty,
      );
    }
    if (selected == null && unsureWork == null && savedWork == null) {
      // A sparse catalog is not evidence that an unrelated work is a close match.
      pickType = 'open_start';
      selected = candidates
          .map((item) => item.work)
          .where((work) => !_isExcludedRecommendation(work))
          .firstOrNull;
    }
    final work = unsureWork ?? savedWork ?? selected ?? _easyFounderWork(now);
    final moment = work.primaryMoment ?? work.listeningMoments.first;
    final sourceEvidence = _dailyPickSourceEvidence(axis, work);
    return DailyPick(
      id: 'daily-pick-${_dateKey(date)}',
      date: date,
      workId: work.id,
      momentId: moment.id,
      pickType: pickType,
      reason: _dailyPickReasonFor(
        work,
        pickType: pickType,
        axis: axis,
        sourceEvidence: sourceEvidence,
      ),
      listenFor: _translationListenFor(axis, work),
      whyNow: _dailyPickWhyNowFor(pickType),
      sourceEvidence: sourceEvidence,
      distanceLabel: _dailyPickDistanceLabel(pickType),
      createdAt: now,
    );
  }

  String _dailyPickTypeFor(DateTime date, DateTime now) {
    final createdDays = _state.dailyPicks.length;
    if (createdDays < 3) {
      return 'close_step';
    }
    if (_shouldUseSurprisePick(date, now)) {
      return 'surprise';
    }
    return createdDays.isEven ? 'gentle_expansion' : 'close_step';
  }

  ClassicalWork? _pickDailyWork({
    required List<({ClassicalWork work, int score})> candidates,
    required String pickType,
    required String axis,
    required ClassicalWork? anchor,
    required int targetDifficulty,
  }) {
    bool hasKnownBridge(ClassicalWork work) {
      if (anchor != null) {
        return work.composerId == anchor.composerId ||
            work.instrumentation == anchor.instrumentation ||
            work.moodTags.any(anchor.moodTags.contains);
      }
      // No identified work is not evidence that every candidate is familiar.
      final weights = _axisWeightsForWork(work);
      return _state.tasteIntakeItems.any(
            (item) =>
                item.matchOrigin != 'user_unlinked' &&
                (item.matchedComposerId == work.composerId ||
                    (item.matchedComposerId == null &&
                        weights.containsKey(_axisForTasteItem(item)))),
          ) ||
          _state.preferredInstruments.contains(work.instrumentation) ||
          work.moodTags.any(_state.preferredMoodTags.contains) ||
          _latestReactions.any((reaction) {
            if (reaction.type != 'liked' && reaction.type != 'repeat') {
              return false;
            }
            final liked = workById(reaction.workId);
            return liked != null &&
                (work.composerId == liked.composerId ||
                    work.instrumentation == liked.instrumentation ||
                    work.moodTags.any(liked.moodTags.contains));
          });
    }

    bool isClose(ClassicalWork work) =>
        !_isExcludedRecommendation(work) &&
        work.difficultyForListening <= targetDifficulty + 1 &&
        hasKnownBridge(work);

    bool isGentleExpansion(ClassicalWork work) =>
        !_isExcludedRecommendation(work) &&
        work.difficultyForListening <= targetDifficulty + 2 &&
        hasKnownBridge(work) &&
        (anchor == null ||
            work.composerId != anchor.composerId ||
            work.period != anchor.period ||
            work.instrumentation != anchor.instrumentation);

    bool isSurprise(ClassicalWork work) =>
        !_isExcludedRecommendation(work) &&
        work.difficultyForListening <= targetDifficulty + 2 &&
        (_axisWeightsForWork(work)[axis] ?? 0) >= 3 &&
        _axisWeightsForWork(work).keys
            .any((candidateAxis) => candidateAxis != axis) &&
        (anchor == null ||
            work.period != anchor.period ||
            work.instrumentation != anchor.instrumentation);

    final predicate = switch (pickType) {
      'surprise' => isSurprise,
      'gentle_expansion' => isGentleExpansion,
      _ => isClose,
    };
    return candidates.map((item) => item.work).where(predicate).firstOrNull;
  }

  bool _shouldUseSurprisePick(DateTime date, DateTime now) {
    if (_hasRecentUnsure(now)) {
      return false;
    }
    final createdDays = _state.dailyPicks.length;
    if (createdDays < 3 ||
        _state.dailyPicks
                .where(
                  (pick) =>
                      _withDerivedDailyPickCompletion(pick, now).isCompleted,
                )
                .length <
            3) {
      return false;
    }
    final recentSurpriseCount = _state.dailyPicks
        .where((pick) => date.difference(pick.date).inDays.abs() < 7)
        .where((pick) => pick.pickType == 'surprise')
        .length;
    return recentSurpriseCount == 0 && createdDays % 5 == 3;
  }

  bool _hasRecentUnsure(DateTime now) {
    return _latestReactions.any(
      (reaction) =>
          reaction.type == 'unsure' &&
          !reaction.occurredAt.isAfter(now) &&
          now.difference(reaction.occurredAt).inDays <= 1,
    );
  }

  String _dailyPickSourceEvidence(String axis, ClassicalWork work) {
    final descriptor = '${work.composerNameKo}의 ${work.instrumentation} 작품';
    for (final reaction in _latestReactions) {
      if (reaction.type != 'liked' && reaction.type != 'repeat') continue;
      final source = workById(reaction.workId);
      if (source == null ||
          !_axisWeightsForWork(source).containsKey(axis) ||
          !_axisWeightsForWork(work).containsKey(axis)) {
        continue;
      }
      return '좋았던 ${source.titleKo}에 이어, $descriptor에서 ${_axisNoun(axis)}을 따라가 봅니다.';
    }
    final connectedInputs =
        <({TasteIntakeItem item, int strength, int index})>[];
    for (var index = 0; index < _state.tasteIntakeItems.length; index++) {
      final item = _state.tasteIntakeItems[index];
      final source = workById(item.matchedWorkId ?? '');
      if (source == null || !_axisWeightsForWork(source).containsKey(axis)) {
        continue;
      }
      connectedInputs.add((
        item: item,
        strength:
            (source.composerId == work.composerId ? 4 : 0) +
            (source.instrumentation == work.instrumentation ? 2 : 0) +
            (source.period == work.period ? 1 : 0),
        index: index,
      ));
    }
    connectedInputs.sort((a, b) {
      final order = b.strength.compareTo(a.strength);
      return order != 0 ? order : a.index.compareTo(b.index);
    });
    final composerInput = _state.tasteIntakeItems
        .where(
          (item) =>
              item.matchOrigin != 'user_unlinked' &&
              item.matchedComposerId == work.composerId,
        )
        .firstOrNull;
    if (connectedInputs.isEmpty && composerInput == null) {
      if (_state.preferredInstruments.contains(work.instrumentation)) {
        return '선택한 ${work.instrumentation} 소리를 따라, 오늘은 ${work.titleKo}을 들어봅니다.';
      }
      final mood = work.moodTags
          .where(_state.preferredMoodTags.contains)
          .firstOrNull;
      if (mood != null) {
        return '선택한 "$mood" 분위기로 이어봅니다. 오늘은 ${work.titleKo}을 들어봅니다.';
      }
    }
    final item =
        connectedInputs.firstOrNull?.item ??
        composerInput ??
        _state.tasteIntakeItems.firstOrNull;
    if (item == null) {
      return '오늘은 $descriptor에서 시작합니다. ${work.primaryMoment?.prompt ?? ''}';
    }
    final source = workById(item.matchedWorkId ?? '');
    if (source != null) {
      final bridge = source.composerId == work.composerId
          ? '같은 작곡가의 다른 작품을 들어봅니다.'
          : source.instrumentation == work.instrumentation
          ? '같은 편성으로 다른 작곡가를 만나봅니다.'
          : '${work.instrumentation}에서 ${_axisNoun(axis)}을 따라가 봅니다.';
      // An automatic work link may identify an excerpt, not the user's preferred movement.
      final input = item.matchOrigin == 'user_selected'
          ? source.titleKo
          : item.rawInput.trim();
      return '남겨주신 "$input"에서 이어봅니다. $bridge';
    }
    if (item.matchOrigin != 'user_unlinked' &&
        item.matchedComposerId == work.composerId) {
      return '남겨주신 "${item.rawInput.trim()}"에서 작곡가를 이어봅니다. 오늘은 ${work.titleKo}의 ${work.instrumentation} 소리를 들어봅니다.';
    }
    return '${_tasteEvidenceLabelFor(item)}는 기록해둘게요. 아직 곡을 연결하지 못해, 우선 $descriptor에서 시작합니다.';
  }

  String _dailyPickReasonFor(
    ClassicalWork work, {
    required String pickType,
    required String axis,
    required String sourceEvidence,
  }) {
    if (pickType == 'open_start') {
      return '아직 좋아한 곡과 연결할 근거가 부족해요. 오늘은 ${work.composerNameKo}의 ${work.instrumentation} 작품을 새로 열어봅니다.';
    }
    if (pickType == 'surprise') {
      return '오늘은 조금 옆길로 갑니다. $sourceEvidence';
    }
    if (pickType == 'revisit') {
      return '저장해둔 작품을 오늘은 한 지점만 다시 열어봅니다.';
    }
    if (pickType == 'recovery') {
      return '낯설었던 뒤라, 오늘은 더 가까운 입구로 낮춰 잡았습니다.';
    }
    return sourceEvidence;
  }

  String _dailyPickWhyNowFor(String pickType) {
    return switch (pickType) {
      'surprise' => '반응을 남기면 의외였는지, 다음에도 열릴 길인지 구분합니다.',
      'revisit' => '듣고 돌아와 반응을 남기면 오늘의 감상 기록으로 이어집니다.',
      'recovery' => '좋음이나 아직 모르겠음을 남기면 내일은 더 알맞은 거리로 조정합니다.',
      'gentle_expansion' => '오늘 반응에 따라 내일은 같은 감각을 다른 시대나 악기로 옮깁니다.',
      _ => '오늘 반응이 내일의 한 곡 거리를 조금 바꿉니다.',
    };
  }

  String _dailyPickDistanceLabel(String pickType) {
    return switch (pickType) {
      'open_start' => '새로 열어보기',
      'surprise' => '의외의 우회로',
      'revisit' => '다시 들어볼 때',
      'recovery' => '아주 가까움',
      'gentle_expansion' => '한 걸음 확장',
      _ => '아주 가까움',
    };
  }

  String _firstSevenDayJudgement(int index, DailyPick pick) {
    return '거리 적절성: 사용자 평가 전';
  }

  String _firstSevenDayNextPath(DailyPick pick) {
    return switch (pick.pickType) {
      'surprise' => '반응이 좋으면 옆길을 살리고, 낯설면 내일 가까운 곡으로 돌아옵니다.',
      'gentle_expansion' => '같은 감각을 다른 시대나 악기로 한 칸 옮깁니다.',
      'recovery' => '오늘은 거리를 줄이고, 반응이 쌓이면 다시 넓힙니다.',
      'revisit' => '저장한 곡을 듣고 반응을 남기면 감상지도에 이어집니다.',
      _ => '먼저 익숙한 감각을 잡고, 다음 날 한 걸음만 넓힙니다.',
    };
  }

  DailyPick _withDerivedDailyPickCompletion(DailyPick pick, DateTime now) {
    if (pick.isCompleted) {
      return pick;
    }
    final completions = <DateTime>[
      for (final reaction in _state.reactions)
        if (reaction.workId == pick.workId &&
            _isSameLocalDay(reaction.occurredAt, pick.date))
          reaction.occurredAt,
      for (final event in _state.events)
        if (event.entityType == 'work' &&
            event.entityId == pick.workId &&
            _isDailyCompletionEvent(event) &&
            _isSameLocalDay(event.occurredAt, pick.date))
          event.occurredAt,
    ]..sort();
    if (completions.isEmpty &&
        _state
            .stateForWork(pick.workId)
            .confirmedListenDays
            .contains(_dateKey(pick.date))) {
      return pick.copyWith(
        completedAt: pick.completedAt ?? pick.date,
        completionConfirmed: true,
      );
    }
    if (completions.isEmpty) {
      return pick;
    }
    return pick.copyWith(
      completedAt: completions.first,
      completionConfirmed: true,
    );
  }

  List<DailyPick> _dailyPicksWithCompletion(
    String workId, {
    required DateTime completedAt,
  }) {
    final pick = dailyPick(now: completedAt);
    if (pick.workId != workId) {
      return _state.dailyPicks;
    }
    final completed = pick.copyWith(
      completedAt: pick.isCompleted ? pick.completedAt : completedAt,
      completionConfirmed: true,
    );
    return <DailyPick>[
      completed,
      ..._state.dailyPicks.where((item) => item.id != completed.id),
    ].take(DiscoveryHistoryLimits.dailyPicks).toList(growable: false);
  }

  ({int hour, int minute}) _parseReminderTime(String timeLabel) {
    final parts = timeLabel.split(':');
    if (parts.length != 2) {
      return (hour: 9, minute: 0);
    }
    final hour = int.tryParse(parts[0]) ?? 9;
    final minute = int.tryParse(parts[1]) ?? 0;
    return (hour: hour.clamp(0, 23), minute: minute.clamp(0, 59));
  }

  String _dateKey(DateTime date) {
    date = date.toLocal();
    final month = date.month.toString().padLeft(2, '0');
    final day = date.day.toString().padLeft(2, '0');
    return '${date.year}-$month-$day';
  }

  DailyListeningStep dailyListeningStep({DateTime? now}) {
    final effectiveNow = now ?? _clock();
    final axis = tasteAxisScores().isEmpty
        ? '선율형'
        : tasteAxisScores().first.axis;
    final pick = dailyPick(now: effectiveNow);
    final pickWork = workById(pick.workId);
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
        pickWork ??
        completedWork ??
        savedWork ??
        unsureWork ??
        recommendedWork ??
        _easyFounderWork(effectiveNow);
    final moment =
        work.listeningMoments
            .where((moment) => moment.id == pick.momentId)
            .firstOrNull ??
        work.primaryMoment ??
        work.listeningMoments.first;
    final isCompleted = _workHasDailyCompletion(work.id, effectiveNow);
    final tasteEvidenceLabel = _dailyTasteEvidenceLabel();
    return DailyListeningStep(
      work: work,
      moment: moment,
      title: isCompleted ? '오늘은 이 한 곡이면 충분해요' : '오늘의 한 곡',
      prompt: pickWork?.id == work.id ? pick.listenFor : moment.prompt,
      reason: _dailyReasonFor(
        work,
        dailyPick: pickWork?.id == work.id ? pick : null,
        axis: axis,
        tasteEvidenceLabel: tasteEvidenceLabel,
        hasSavedUnopened: savedWork?.id == work.id,
        isUnsureRecovery: unsureWork?.id == work.id,
        isCompleted: isCompleted,
      ),
      nextEffect: pickWork?.id == work.id
          ? pick.whyNow
          : _dailyNextEffectFor(isCompleted: isCompleted),
      estimatedSeconds: (moment.endSeconds - moment.startSeconds)
          .clamp(15, 180)
          .toInt(),
      difficulty: work.difficultyForListening,
      axis: axis,
      completionState: isCompleted ? 'completed' : 'ready',
      dueDate: _dateOnly(effectiveNow),
      tasteEvidenceLabel: tasteEvidenceLabel,
      translation: currentTasteTranslation(),
    );
  }

  EarOpeningPrompt earOpeningPromptFor(DailyListeningStep step) {
    final axis = step.translation?.axis ?? step.axis;
    return EarOpeningPrompt(
      id: 'ear-${step.work.id}-${step.moment.id}',
      workId: step.work.id,
      momentId: step.moment.id,
      title: '귀 트임',
      question: _earOpeningQuestion(axis),
      options: _earOpeningOptions(axis),
      axis: axis,
      mapClue: _axisNoun(axis),
      skipCopy: '모르겠으면 그냥 넘어가도 됩니다.',
    );
  }

  Future<void> recordEarOpeningAnswer(
    EarOpeningPrompt prompt,
    String answer,
  ) async {
    final trimmed = answer.trim();
    if (trimmed.isEmpty) {
      return;
    }
    await _setState(
      _state.copyWith(
        events: _withEvent(
          'ear_opening_answer',
          'work',
          prompt.workId,
          context: prompt.momentId,
          properties: <String, String>{
            'question': prompt.question,
            'answer': trimmed,
            'axis': prompt.axis,
            'mapClue': prompt.mapClue,
            'surface': 'daily',
          },
        ),
      ),
    );
  }

  GentleContinuitySummary continuitySummary({DateTime? now}) {
    final effectiveNow = now ?? _clock();
    final today = _dateOnly(effectiveNow);
    final dates = _dailyCompletionDates();
    final completedToday = dates.contains(today);
    var weeklyCompletedDays = 0;
    for (var index = 0; index < 7; index += 1) {
      if (dates.contains(
        DateTime(today.year, today.month, today.day - index),
      )) {
        weeklyCompletedDays += 1;
      }
    }

    var currentRunDays = 0;
    var cursor = completedToday
        ? today
        : DateTime(today.year, today.month, today.day - 1);
    while (dates.contains(cursor)) {
      currentRunDays += 1;
      cursor = DateTime(cursor.year, cursor.month, cursor.day - 1);
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
    for (final pick in _state.dailyPicks) {
      if (pick.workId != workId) {
        continue;
      }
      stamps.add(
        WorkPassportStamp(
          id: pick.id,
          workId: workId,
          stampType: 'daily_pick',
          label: pick.isCompleted ? '오늘의 한 곡 완료' : '오늘의 한 곡으로 만남',
          momentId: pick.momentId,
          note: pick.distanceLabel,
          occurredAt: pick.completedAt ?? pick.createdAt,
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
      ..._state.dailyPicks.map((pick) => pick.workId),
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
      id: 'reflection-${now.microsecondsSinceEpoch}-${_discoveryIdSuffix()}',
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
        ].take(DiscoveryHistoryLimits.reflections).toList(growable: false),
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
            .where(_isRecommendationReady)
            .where((work) => work.id != anchor.id)
            .where((work) => work.composerId == anchor.composerId)
            .take(6)
            .toList(growable: false),
      ),
      RecommendationShelf(
        id: 'instrument-${anchor.instrumentation}',
        title: '${anchor.instrumentation}로 계속 듣기',
        works: _works
            .where(_isRecommendationReady)
            .where((work) => work.id != anchor.id)
            .where((work) => work.instrumentation == anchor.instrumentation)
            .take(6)
            .toList(growable: false),
      ),
      RecommendationShelf(
        id: 'concert-ready',
        title: '이번 주 공연 전에 들어둘 작품',
        works: _works
            .where(_isRecommendationReady)
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
      updatedAt: now,
      repeatDueAt: now.add(const Duration(days: 1)),
    );
    await _setWorkState(
      nextState,
      eventType: nextState.saved ? 'work_save' : 'work_unsave',
    );
    await _refreshEnabledReminder();
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
        confirmedListenDays: {
          ..._engagementDatesForWork(workId).map(_dateKey),
          _dateKey(now),
        },
        repeatDueAt: now.add(repeatDelay),
        familiarityLevel: nextFamiliarity,
        updatedAt: now,
      ),
      eventType: 'listening_moment_complete',
      context: momentId,
      dailyPicks: _dailyPicksWithCompletion(workId, completedAt: now),
    );
    await _refreshEnabledReminder();
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
      id: 'reaction-${now.microsecondsSinceEpoch}-${_discoveryIdSuffix()}',
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
      confirmedListenDays: {
        ..._engagementDatesForWork(workId).map(_dateKey),
        _dateKey(now),
      },
      latestReactionType: type,
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
        dailyPicks: _dailyPicksWithCompletion(workId, completedAt: now),
        reactions: <ClassicalReaction>[
          reaction,
          ..._state.reactions,
        ].take(DiscoveryHistoryLimits.reactions).toList(),
        events: _withEvent('reaction_add', 'work', workId, context: type),
      ),
    );
    await _refreshEnabledReminder();
  }

  Future<void> setPreferredPlatform(String platformId) async {
    final now = _clock();
    await _setState(
      _state.copyWith(
        preferredPlatformId: platformId,
        preferencesUpdatedAt: _nextPreferencesRevision(now),
        events: _withEvent('preferred_platform_set', 'platform', platformId),
      ),
    );
  }

  Future<void> setComposerExcluded(String composerId, bool excluded) async {
    if (_loadFailed) throw StateError('Stored preferences could not be loaded');
    if (!_composers.any((composer) => composer.id == composerId)) {
      throw ArgumentError.value(composerId, 'composerId');
    }
    final ids = {..._state.excludedComposerIds};
    final changed = excluded ? ids.add(composerId) : ids.remove(composerId);
    if (!changed) return;
    final now = _clock();
    final revision = _nextPreferencesRevision(now);
    await _setState(
      _state.copyWith(
        excludedComposerIds: Set.unmodifiable(ids),
        preferencesUpdatedAt: revision,
      ),
    );
    await _refreshEnabledReminder();
  }

  DateTime _nextPreferencesRevision(DateTime now) {
    final previous = _state.preferencesUpdatedAt;
    return previous != null && !now.isAfter(previous)
        ? previous.add(const Duration(microseconds: 1))
        : now;
  }

  Future<void> setOperaticVocalsExcluded(bool excluded) async {
    if (_loadFailed) throw StateError('Stored preferences could not be loaded');
    if (_state.excludeOperaticVocals == excluded) return;
    await _setState(
      _state.copyWith(
        excludeOperaticVocals: excluded,
        preferencesUpdatedAt: _nextPreferencesRevision(_clock()),
      ),
    );
    await _refreshEnabledReminder();
  }

  bool get hasRecommendationExclusions =>
      _state.excludedComposerIds.isNotEmpty || _state.excludeOperaticVocals;

  Set<String> get _founderExcludedComposerIds => _composers
      .where(
        (composer) => founderTasteProfile.avoidInputs.any(
          (input) =>
              [composer.nameKo, composer.nameOriginal, ...composer.aliases].any(
                (name) =>
                    normalizeDiscoveryText(input) ==
                    normalizeDiscoveryText(name),
              ),
        ),
      )
      .map((composer) => composer.id)
      .toSet();

  Future<void> updateReaction(String reactionId, String type) async {
    if (!const {'liked', 'repeat', 'instrument', 'unsure'}.contains(type)) {
      return;
    }
    final original = _state.reactions
        .where((r) => r.id == reactionId)
        .firstOrNull;
    if (original == null || original.type == type) return;
    final current = _state.stateForWork(original.workId);
    final counts = Map<String, int>.of(current.reactionCounts);
    final remaining = (counts[original.type] ?? 1) - 1;
    if (remaining > 0) {
      counts[original.type] = remaining;
    } else {
      counts.remove(original.type);
    }
    counts[type] = (counts[type] ?? 0) + 1;
    final now = _clock();
    final previousRevision = original.updatedAt ?? original.occurredAt;
    var revision = now.isAfter(previousRevision)
        ? now
        : previousRevision.add(const Duration(microseconds: 1));
    final workRevision = current.updatedAt;
    if (workRevision != null && !revision.isAfter(workRevision)) {
      revision = workRevision.add(const Duration(microseconds: 1));
    }
    final revised = ClassicalReaction(
      id: original.id,
      workId: original.workId,
      type: type,
      momentId: original.momentId,
      occurredAt: original.occurredAt,
      updatedAt: revision,
    );
    await _setState(
      _state.copyWith(
        reactions: [
          for (final r in _state.reactions) r.id == reactionId ? revised : r,
        ],
        workStates: {
          ..._state.workStates,
          original.workId: current.copyWith(
            reactionCounts: counts,
            updatedAt: revision,
            latestReactionType: _latestReactions.any((r) => r.id == original.id)
                ? type
                : current.latestReactionType,
          ),
        },
        events: _withEvent(
          'reaction_update',
          'work',
          original.workId,
          context: type,
          properties: {
            'reactionId': original.id,
            'previousType': original.type,
          },
        ),
      ),
    );
    await _refreshEnabledReminder();
  }

  Future<void> setRegion(String region) async {
    final now = _clock();
    await _setState(
      _state.copyWith(
        region: region,
        preferencesUpdatedAt: _nextPreferencesRevision(now),
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
        preferencesUpdatedAt: _nextPreferencesRevision(now),
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
    final wasReminderEnabled = _state.reminderPreference.enabled;
    final now = _clock();
    final intakeItems = _buildTasteIntakeItems(tasteInputs, now);
    await _setState(
      _state.copyWith(
        onboardingCompleted: true,
        tasteIntakeItems: <TasteIntakeItem>[
          ...intakeItems,
          ..._state.tasteIntakeItems,
        ].take(DiscoveryHistoryLimits.tasteInputs).toList(growable: false),
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
        preferencesUpdatedAt: _nextPreferencesRevision(now),
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
    if (hasDailyRecommendation) await ensureDailyPick();
    if (notificationPreferences.contains('today_work') || wasReminderEnabled) {
      await configureDailyPickReminder(
        enabled: notificationPreferences.contains('today_work'),
      );
    }
  }

  Future<void> skipOnboarding() async {
    final now = _clock();
    await _setState(
      _state.copyWith(
        onboardingCompleted: true,
        preferencesUpdatedAt: _nextPreferencesRevision(now),
        events: _withEvent('onboarding_skip', 'user', 'local'),
      ),
    );
    if (hasDailyRecommendation) await ensureDailyPick();
  }

  Future<void> recordProviderClick(
    ClassicalWork work,
    ExternalLink link, {
    bool fallback = false,
    String surface = 'listening',
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
            'surface': surface,
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
    final previousRevision = _state.concertSaveUpdatedAt[concertId];
    final now = _clock();
    final revision = previousRevision != null && !now.isAfter(previousRevision)
        ? previousRevision.add(const Duration(microseconds: 1))
        : now;
    await _setState(
      _state.copyWith(
        savedConcertIds: saved,
        concertSaveUpdatedAt: {
          ..._state.concertSaveUpdatedAt,
          concertId: revision,
        },
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
            'surface': 'ticket',
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
      id: 'route-${now.microsecondsSinceEpoch}-${_discoveryIdSuffix()}',
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
        ].take(DiscoveryHistoryLimits.previewRoutes).toList(growable: false),
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

  Future<void> recordQualityObservation({
    required String category,
    required String testerId,
    required Map<String, bool> answers,
    required String notes,
  }) async {
    final questions = classicalQualityObservationQuestions[category];
    if (questions == null ||
        testerId.trim().isEmpty ||
        notes.trim().isEmpty ||
        answers.length != questions.length ||
        !questions.keys.every(answers.containsKey) ||
        (category == 'founder_intent' && testerId.trim() != 'founder')) {
      throw ArgumentError('An identified observation and notes are required');
    }
    await _setState(
      _state.copyWith(
        events: _withEvent(
          'feedback_submit',
          'app',
          'in-c',
          context: category,
          properties: {
            'category': category,
            'evidenceKind': 'observed',
            'testerId': testerId.trim(),
            'message': notes.trim(),
            for (final entry in answers.entries)
              entry.key: entry.value.toString(),
          },
        ),
      ),
    );
  }

  String _pickReviewSnapshot(DailyPick pick) => jsonEncode({
    'date': _dateKey(pick.date),
    'workId': pick.workId,
    'momentId': pick.momentId,
    'reason': pick.reason,
    'listenFor': pick.listenFor,
    'sourceEvidence': pick.sourceEvidence,
    'pickType': pick.pickType,
  });

  String dailyDistanceAssessment(DailyPick pick) {
    final snapshot = _pickReviewSnapshot(pick);
    final matches =
        _state.events
            .where(
              (event) =>
                  event.eventType == 'feedback_submit' &&
                  event.context == 'daily_distance' &&
                  event.properties['evidenceKind'] == 'observed_preview' &&
                  event.properties['mergeConflict'] != 'true' &&
                  event.properties['snapshot'] == snapshot &&
                  (event.properties['testerId']?.trim().isNotEmpty ?? false),
            )
            .toList()
          ..sort((a, b) => b.occurredAt.compareTo(a.occurredAt));
    final latest = matches.firstOrNull;
    final label = switch (latest?.properties['distance']) {
      'too_close' => '너무 가까움',
      'appropriate' => '적절함',
      'too_far' => '너무 멂',
      _ => null,
    };
    return label == null
        ? '거리 적절성: 사용자 평가 전'
        : '미리보기 응답: $label (${latest!.properties['testerId']})';
  }

  Future<void> recordDailyDistanceEvaluation({
    required DailyPick pick,
    required String testerId,
    required String distance,
    required String notes,
  }) async {
    if (testerId.trim().isEmpty ||
        notes.trim().isEmpty ||
        !const {'too_close', 'appropriate', 'too_far'}.contains(distance) ||
        workById(pick.workId) == null) {
      throw ArgumentError('A real preview response is required');
    }
    await _setState(
      _state.copyWith(
        events: _withEvent(
          'feedback_submit',
          'work',
          pick.workId,
          context: 'daily_distance',
          properties: {
            'category': 'daily_distance',
            'evidenceKind': 'observed_preview',
            'testerId': testerId.trim(),
            'distance': distance,
            'message': notes.trim(),
            'snapshot': _pickReviewSnapshot(pick),
          },
        ),
      ),
    );
  }

  Future<void> _setWorkState(
    UserWorkState nextWorkState, {
    required String eventType,
    String? context,
    List<DailyPick>? dailyPicks,
  }) async {
    await _setState(
      _state.copyWith(
        workStates: <String, UserWorkState>{
          ..._state.workStates,
          nextWorkState.workId: nextWorkState.copyWith(updatedAt: _clock()),
        },
        dailyPicks: dailyPicks,
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
    if (_loadFailed ||
        _resettingData ||
        state.historyResetAt?.microsecondsSinceEpoch !=
            _state.historyResetAt?.microsecondsSinceEpoch) {
      return;
    }
    _state = state;
    final revision = ++_writeRevision;
    // Serialize snapshots: an older slow write must not overwrite a newer action.
    final write = _pendingWrites.then((_) async {
      try {
        await store.saveState(state);
        if (revision == _writeRevision) {
          persistenceMessage = store.recoveryMessage;
        }
      } catch (_) {
        if (revision == _writeRevision) {
          persistenceMessage = '변경을 저장하지 못했습니다. 앱을 닫기 전에 다시 저장해 주세요.';
        }
      }
    });
    _pendingWrites = write;
    await write;
    if (!_disposed) notifyListeners();
  }

  Future<void> retryPersistence() => _loadFailed ? load() : _setState(_state);

  String exportLocalData() {
    if (_loadFailed || _isLoading || _resettingData) {
      throw StateError('History is unavailable');
    }
    return const JsonEncoder.withIndent('  ').convert({
      'format': 'in-c-personal-data',
      'version': 1,
      'exportedAt': _clock().toIso8601String(),
      'storageWarning': persistenceMessage,
      'state': _state.toJson(),
    });
  }

  Future<void> eraseLocalData() async {
    if (_isLoading) throw StateError('History is still loading');
    if (_resettingData) throw StateError('Deletion is already running');
    _resettingData = true;
    _dataGeneration++;
    notifyListeners();
    var storageStarted = false;
    try {
      await _notificationActions;
      await _notificationOpens;
      await _notificationGateway.cancelDailyPick();
      await _notificationGateway.consumeLaunchPayload();
      await _pendingWrites;
      storageStarted = true;
      _state = await store.eraseLocalData(at: _clock());
      _loadFailed = false;
      _isLoading = false;
      persistenceMessage = null;
      notificationDestination.value = null;
    } catch (_) {
      // A partial disk erase must be resumed before accepting new edits.
      if (storageStarted) _loadFailed = true;
      persistenceMessage = storageStarted
          ? '기록 삭제를 마치지 못했어요. 다시 시도해 주세요.'
          : '알림을 해제하지 못해 기록 삭제를 시작하지 않았어요.';
      rethrow;
    } finally {
      _resettingData = false;
      if (!_disposed) notifyListeners();
    }
  }

  List<DiscoveryEvent> _withEvent(
    String eventType,
    String entityType,
    String entityId, {
    String? context,
    Map<String, String> properties = const <String, String>{},
  }) {
    return _retainEvents(<DiscoveryEvent>[
      _eventRecord(
        eventType,
        entityType,
        entityId,
        context: context,
        properties: properties,
      ),
      ..._state.events,
    ]);
  }

  List<DiscoveryEvent> _withEvents(List<DiscoveryEvent> events) {
    return _retainEvents(<DiscoveryEvent>[
      ...events.reversed,
      ..._state.events,
    ]);
  }

  List<DiscoveryEvent> _retainEvents(List<DiscoveryEvent> events) {
    return retainDiscoveryEvents(events);
  }

  DiscoveryEvent _eventRecord(
    String eventType,
    String entityType,
    String entityId, {
    String? context,
    Map<String, String> properties = const <String, String>{},
    DateTime? at,
  }) {
    final now = at ?? _clock();
    return DiscoveryEvent(
      id: 'event-${now.microsecondsSinceEpoch}-$eventType-${_discoveryIdSuffix()}',
      eventType: eventType,
      entityType: entityType,
      entityId: entityId,
      context: context,
      properties: properties,
      occurredAt: now,
    );
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
      } else if (_axisForTasteItem(item).isNotEmpty) {
        openNode(
          _entryNodeIdForAxis(_axisForTasteItem(item)),
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
      if (work.listeningMoments.any((moment) => moment.id == event.context) &&
          event.eventType == 'listening_moment_complete') {
        capturedMomentIds.add('${work.id}:${event.context}');
      }
      final evidence = switch (event.eventType) {
        'listening_moment_complete' => 2,
        'external_platform_click' => 2,
        'listening_moment_preview_open' => 1,
        'ear_opening_answer' => 1,
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
        if (reaction.type == 'unsure' &&
            _latestReactions.any((latest) => latest.id == reaction.id)) {
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

    final listeningDaysByNode = <String, Set<DateTime>>{};
    for (final workId in _state.workStates.keys) {
      final work = workById(workId);
      if (work == null) continue;
      final days = _engagementDatesForWork(workId);
      for (final node in _nodesForWork(work, nodes)) {
        listeningDaysByNode.putIfAbsent(node.id, () => {}).addAll(days);
      }
    }
    for (final entry in listeningDaysByNode.entries) {
      if (entry.value.length >= 2) {
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
    final latest = _latestReactions
        .where((r) => r.workId == workId)
        .firstOrNull;
    return state?.saved == true &&
        const {
          'liked',
          'repeat',
        }.contains(latest?.type ?? state?.latestReactionType) &&
        _engagementDatesForWork(workId).length >= 2;
  }

  Set<DateTime> _engagementDatesForWork(String workId) {
    final now = _clock();
    return {
      for (final key in _state.stateForWork(workId).confirmedListenDays)
        if (DateTime.tryParse(key) case final day?)
          if (!day.isAfter(now)) _dateOnly(day),
      for (final reaction in _state.reactions)
        if (reaction.workId == workId && !reaction.occurredAt.isAfter(now))
          _dateOnly(reaction.occurredAt),
      for (final event in _state.events)
        if (event.entityId == workId &&
            _isDailyCompletionEvent(event) &&
            !event.occurredAt.isAfter(now))
          _dateOnly(event.occurredAt),
      for (final reflection in _state.postConcertReflections)
        if (reflection.workId == workId && !reflection.occurredAt.isAfter(now))
          _dateOnly(reflection.occurredAt),
    };
  }

  List<RecommendationShelf> _dedupeRecommendationShelves(
    Iterable<RecommendationShelf> shelves,
  ) {
    final seen = <String>{};
    final result = <RecommendationShelf>[];
    for (final shelf in shelves) {
      final works = <ClassicalWork>[];
      for (final work in shelf.works) {
        if (_isRecommendationReady(work) && seen.add(work.id)) {
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
      if (!_isRecommendationReady(work)) continue;
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
          id: 'taste-${now.microsecondsSinceEpoch}-$index-${_discoveryIdSuffix()}',
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
          matchOrigin: 'automatic',
          confidence: matchedWork == null
              ? (matchedComposer == null ? 20 : 55)
              : matchedWork.searchScore(trimmed).clamp(0, 100),
          createdAt: now.add(Duration(microseconds: index)),
        ),
      );
      index += 1;
      if (items.length == 24) {
        break;
      }
    }
    return items;
  }

  ClassicalWork? _matchTasteWork(String input) {
    final compact = normalizeDiscoveryText(input);
    final composer = _matchComposer(input);
    if (composer != null &&
        [
          composer.nameKo,
          composer.nameOriginal,
          composer.nameOriginal.split(' ').last,
          ...composer.aliases,
        ].any((name) => normalizeDiscoveryText(name) == compact)) {
      return null;
    }
    if (composer?.id == 'chopin' &&
        ['야상곡', '녹턴', 'nocturne', 'op92', 'op9no2'].any(compact.contains)) {
      final numbers = RegExp(r'\d+')
          .allMatches(input)
          .map((match) => int.tryParse(match.group(0)!))
          .toList();
      // A work family or a different opus is not evidence for this specific work.
      final exactOpus =
          numbers.length == 2 && numbers[0] == 9 && numbers[1] == 2;
      final work = workById('chopin-nocturne-op9-2');
      final exactTitle =
          work != null &&
          [work.titleKo, work.titleOriginal].any(
            (title) =>
                [
                  composer!.nameKo,
                  composer.nameOriginal,
                  ...composer.aliases,
                ].any(
                  (name) =>
                      compact == normalizeDiscoveryText('$name $title') ||
                      compact == normalizeDiscoveryText('$title $name'),
                ),
          );
      return exactOpus || exactTitle ? work : null;
    }
    bool numberedTitle(List<String> names, int number) => names.any(
      (name) =>
          RegExp('${RegExp.escape(name)}$number(?![0-9])').hasMatch(compact),
    );
    final nicknameMatches = <({bool matched, String workId})>[
      (
        matched:
            compact.contains('베토벤') &&
            (numberedTitle(['교향곡', 'symphony', 'symphonyno'], 9) ||
                compact.contains('합창') ||
                compact.contains('환희') ||
                compact.contains('ode') ||
                compact.contains('joy')),
        workId: 'beethoven-symphony-9',
      ),
      (
        matched:
            (compact.contains('드보르작') || compact.contains('dvorak')) &&
            (numberedTitle(['교향곡', 'symphony', 'symphonyno'], 9) ||
                compact.contains('신세계') ||
                compact.contains('newworld')),
        workId: 'dvorak-new-world',
      ),
      (
        matched:
            compact.contains('라흐') &&
            numberedTitle([
              '피협',
              '피아노협주곡',
              'pianoconcerto',
              'pianoconcertono',
            ], 2),
        workId: 'rachmaninoff-piano-concerto-2',
      ),
      (
        matched:
            compact.contains('말러') &&
            (compact.contains('아다지에토') || compact.contains('adagietto')),
        workId: 'mahler-adagietto',
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
    final exactMatches = searchWorks(input).where((work) {
      final titles = [
        work.titleKo,
        work.titleOriginal,
        work.catalogNumber,
        ...work.aliases,
      ].map(normalizeDiscoveryText).where((field) => field.isNotEmpty).toSet();
      if (titles.contains(compact)) return true;
      if (composer == null || composer.id != work.composerId) return false;
      return [
        composer.nameKo,
        composer.nameOriginal,
        composer.nameOriginal.split(' ').last,
        ...composer.aliases,
      ].any((field) {
        final name = normalizeDiscoveryText(field);
        if (name.isEmpty) return false;
        return (compact.startsWith(name) &&
                titles.contains(compact.substring(name.length))) ||
            (compact.endsWith(name) &&
                titles.contains(
                  compact.substring(0, compact.length - name.length),
                ));
      });
    }).toList();
    // Fuzzy search is useful for browsing, not proof of an explicitly liked work.
    return exactMatches.length == 1 ? exactMatches.single : null;
  }

  ClassicalComposer? _matchComposer(String input) {
    final normalized = normalizeDiscoveryText(input);
    bool matchesField(String field) {
      final candidate = normalizeDiscoveryText(field);
      if (candidate.isEmpty || normalized.isEmpty) {
        return false;
      }
      if (candidate == normalized) return true;
      if (RegExp(r'[a-zA-Z]').hasMatch(field)) {
        final words = field.trim().toLowerCase().split(RegExp(r'\s+'));
        return RegExp(
          '(?<![a-z])${words.map(RegExp.escape).join(r'\s+')}(?![a-z])',
        ).hasMatch(input.toLowerCase());
      }
      return normalized.contains(candidate);
    }

    for (final composer in _composers) {
      final fields = [
        composer.nameKo,
        composer.nameOriginal,
        composer.nameOriginal.split(' ').last,
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
        composer.nameOriginal.split(' ').last,
        ...composer.aliases,
      ];
      if (fields.any(matchesField)) {
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

  TasteTranslation _tasteTranslationFor({
    required List<TasteIntakeItem> items,
    required String axis,
    required ClassicalWork work,
  }) {
    final sourceLabel = items
        .map(
          (item) => item.matchedWorkId != null
              ? item.label
              : _friendlyTasteLabel(item.rawInput),
        )
        .take(2)
        .join(', ');
    final hasOnlyFreeText = items.every(
      (item) => item.sourceType != 'catalog_match',
    );
    return TasteTranslation(
      sourceLabel: sourceLabel,
      axis: axis,
      startingPoint: hasOnlyFreeText
          ? '$sourceLabel는 기록해둘게요. 아직 곡을 연결하지 못해, 오늘은 ${work.composerNameKo}의 ${work.instrumentation} 작품부터 들어봅니다.'
          : _translationStartingPoint(axis, sourceLabel),
      familiarFeeling: _translationFamiliarFeeling(axis, sourceLabel),
      listenFor: _translationListenFor(axis, work),
      nextDirection: _translationNextDirection(axis),
      avoidForNow: _translationAvoidForNow(axis),
      isSoftLanding: hasOnlyFreeText,
    );
  }

  String _translationStartingPoint(String axis, String sourceLabel) {
    final label = sourceLabel.isEmpty ? '좋아하는 음악' : sourceLabel;
    return switch (axis) {
      '색채형' => '$label에서 시작하면, 소리의 색이 바뀌는 작품이 먼저 맞습니다.',
      '리듬형' => '$label에서 시작하면, 몸이 먼저 반응하는 움직임부터 열어봅니다.',
      '긴장형' => '$label에서 시작하면, 긴장이 쌓였다 풀리는 순간이 좋은 입구입니다.',
      '구조형' => '$label에서 시작하면, 주제가 돌아오는 길을 잡아보면 좋습니다.',
      '극적형' => '$label에서 시작하면, 장면이 바뀌는 음악부터 들어볼 만합니다.',
      _ => '$label에서 시작하면, 선율이 또렷하게 앞으로 나오는 작품이 좋습니다.',
    };
  }

  String _translationFamiliarFeeling(String axis, String sourceLabel) {
    return switch (axis) {
      '색채형' => '익숙한 건 멜로디보다 분위기와 질감일 수 있어요.',
      '리듬형' => '익숙한 건 박자보다 몸이 먼저 따라가는 추진력일 수 있어요.',
      '긴장형' => '익숙한 건 어두움 자체보다 버티다가 풀리는 힘일 수 있어요.',
      '구조형' => '익숙한 건 지식보다 한 번 나온 생각이 다시 돌아오는 감각일 수 있어요.',
      '극적형' => '익숙한 건 웅장함보다 화면이 전환되는 듯한 흐름일 수 있어요.',
      _ => '익숙한 건 이름보다 오래 남는 한 줄의 선율일 수 있어요.',
    };
  }

  String _translationListenFor(String axis, ClassicalWork work) {
    final moment = work.primaryMoment ?? work.listeningMoments.first;
    return moment.prompt;
  }

  String _translationNextDirection(String axis) {
    return switch (axis) {
      '색채형' => '다음에는 인상주의 색채나 작은 실내악으로 넓혀봅니다.',
      '리듬형' => '다음에는 춤곡과 변주곡으로 움직임을 더 따라가봅니다.',
      '긴장형' => '다음에는 더 선명한 단조 작품으로 깊이를 조금만 넓힙니다.',
      '구조형' => '다음에는 소나타와 변주처럼 흐름이 보이는 작품으로 갑니다.',
      '극적형' => '다음에는 협주곡과 관현악의 장면 전환으로 넓혀봅니다.',
      _ => '다음에는 고전의 문답, 낭만의 긴 호흡, 바로크의 반복처럼 선율을 만드는 장치 하나를 열어봅니다.',
    };
  }

  String _translationAvoidForNow(String axis) {
    return switch (axis) {
      '색채형' => '처음부터 긴 교향곡 전체를 붙잡으려 하지 않아도 됩니다.',
      '리듬형' => '작품 번호나 형식 이름을 먼저 외우지 않아도 됩니다.',
      '긴장형' => '너무 무거운 곡으로 바로 들어가지는 않습니다.',
      '구조형' => '분석표처럼 듣기보다 돌아오는 느낌 하나만 잡습니다.',
      '극적형' => '웅장한 곡만 계속 밀어붙이지 않습니다.',
      _ => '한 번에 전부 이해하지 않아도 됩니다. 먼저 한 선율을 기억합니다.',
    };
  }

  String _earOpeningQuestion(String axis) {
    return switch (axis) {
      '색채형' => '처음 먼저 남은 소리는 무엇에 가까웠나요?',
      '리듬형' => '이 짧은 지점에서 몸이 먼저 반응한 건 무엇이었나요?',
      '긴장형' => '이 30초는 어디에서 힘이 생겼나요?',
      '구조형' => '다시 듣는다면 무엇을 따라가고 싶나요?',
      '극적형' => '장면이 바뀐다고 느낀 순간은 어디에 가까웠나요?',
      _ => '처음 먼저 들어온 건 무엇이었나요?',
    };
  }

  List<String> _earOpeningOptions(String axis) {
    return switch (axis) {
      '색채형' => const ['악기 색', '분위기', '낮은 소리', '전체 울림'],
      '리듬형' => const ['반복', '춤', '속도감', '멈칫하는 순간'],
      '긴장형' => const ['쌓이는 힘', '풀리는 순간', '어두운 색', '버티는 느낌'],
      '구조형' => const ['다시 나온 선율', '질문과 대답', '큰 흐름', '멈춘 자리'],
      '극적형' => const ['장면 전환', '밀려오는 소리', '갑작스러운 변화', '넓어지는 순간'],
      _ => const ['선율', '리듬', '악기 색', '분위기'],
    };
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

    return _withProgressiveFallbacks(
      <ProgressiveRecommendation?>[
        pick('immediate', (work) => work.difficultyForListening <= 2),
        pick('stretch', (work) => work.difficultyForListening <= 3),
        pick('later', (work) => work.difficultyForListening >= 2),
      ].whereType<ProgressiveRecommendation>().toList(growable: true),
      candidates: candidates,
      usedWorkIds: usedWorkIds,
      axis: axis,
      sourceEvidence: sourceEvidence,
      targetDifficulty: 1,
    );
  }

  List<ProgressiveRecommendation> _withProgressiveFallbacks(
    List<ProgressiveRecommendation> recommendations, {
    required List<({ClassicalWork work, int score})> candidates,
    required Set<String> usedWorkIds,
    required String axis,
    required String sourceEvidence,
    required int targetDifficulty,
  }) {
    for (final item in candidates) {
      if (recommendations.length >= 3) {
        break;
      }
      if (usedWorkIds.contains(item.work.id)) {
        continue;
      }
      final lane = switch (recommendations.length) {
        0 => 'immediate',
        1 => 'stretch',
        _ => 'later',
      };
      usedWorkIds.add(item.work.id);
      recommendations.add(
        ProgressiveRecommendation(
          work: item.work,
          lane: lane,
          reason: _progressiveReasonFor(item.work, lane, axis),
          distance: (item.work.difficultyForListening - targetDifficulty).abs(),
          axis: axis,
          difficulty: item.work.difficultyForListening,
          sourceEvidence: sourceEvidence,
        ),
      );
    }
    return recommendations.take(3).toList(growable: false);
  }

  String _primaryAxisForTasteItems(List<TasteIntakeItem> items) {
    final scores = <String, int>{};
    for (final item in items) {
      final work = item.matchedWorkId == null
          ? null
          : workById(item.matchedWorkId!);
      if (work == null) {
        final axis = _axisForTasteItem(item);
        if (axis.isEmpty) continue;
        scores.update(axis, (score) => score + 12, ifAbsent: () => 12);
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
    final item =
        items
            .where(
              (item) =>
                  item.matchedWorkId != null ||
                  item.matchedComposerId != null ||
                  _axisForTasteItem(item).isNotEmpty,
            )
            .firstOrNull ??
        items.first;
    final label = _tasteEvidenceLabelFor(item);
    if (item.matchedWorkId == null &&
        item.matchedComposerId == null &&
        _axisForTasteItem(item).isEmpty) {
      return '$label는 기록해둘게요. 아직 곡을 연결하지 못해, 우선 들어볼 작품을 골랐습니다.';
    }
    return '$label에서 출발해 ${_axisNoun(axis)} 쪽으로 가까운 길을 잡았습니다.';
  }

  String _dailyTasteEvidenceLabel() {
    if (_state.tasteIntakeItems.isEmpty) {
      return '';
    }
    return _tasteEvidenceLabelFor(_state.tasteIntakeItems.first);
  }

  String _tasteBasedDailyReason(TasteIntakeItem item, String axis) {
    final label = _tasteEvidenceLabelFor(item);
    if (item.matchedWorkId == null &&
        item.matchedComposerId == null &&
        _axisForTasteItem(item).isEmpty) {
      return '$label는 기록해둘게요. 아직 곡을 연결하지 못해, 우선 한 곡을 들어보고 시작합니다.';
    }
    final action = _axisListeningAction(axis);
    return '$label에서 시작했다면, 오늘은 $action 30초만 잡아봅니다.';
  }

  String _tasteEvidenceLabelFor(TasteIntakeItem item) {
    if (item.matchedWorkId != null) {
      return item.label;
    }
    return _friendlyTasteLabel(item.rawInput);
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
    final readyWorks = _works
        .where(_isRecommendationReady)
        .toList(growable: false);
    final founderPool = _works
        .where(
          (work) =>
              _isRecommendationReady(work) &&
              work.primaryMoment != null &&
              (work.catalogStatusTags.contains('founder_pick') ||
                  work.contextTags.contains('처음 듣기')),
        )
        .toList(growable: false);
    final easyPool = founderPool
        .where((work) => work.difficultyForListening <= 2)
        .toList(growable: false);
    final pool = easyPool.isEmpty
        ? (founderPool.isEmpty ? readyWorks : founderPool)
        : easyPool;
    if (pool.isEmpty) {
      throw StateError('No reviewed listening recommendation available');
    }
    final day = now.difference(DateTime(2026)).inDays;
    return pool[day.abs() % pool.length];
  }

  ClassicalWork? _recentUnsureAnchor(
    DateTime now, {
    Set<String> excludedWorkIds = const {},
  }) {
    final recentUnsure = _latestReactions
        .where(
          (reaction) =>
              reaction.type == 'unsure' &&
              !reaction.occurredAt.isAfter(now) &&
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
    final closeWorks = _recommendFor(unsureWork, maxCount: _works.length)
        .where(
          (work) =>
              !excludedWorkIds.contains(work.id) &&
              _isRecommendationReady(work) &&
              !_isExcludedRecommendation(work) &&
              work.primaryMoment != null &&
              work.difficultyForListening <=
                  unsureWork.difficultyForListening.clamp(1, 3),
        )
        .toList(growable: false);
    return closeWorks.firstOrNull;
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
    for (final state in _state.workStates.values) {
      if (state.confirmedListenDays.contains(_dateKey(date))) {
        final work = workById(state.workId);
        if (work?.primaryMoment != null) return work;
      }
    }
    return null;
  }

  bool _workHasDailyCompletion(String workId, DateTime date) {
    if (_state
        .stateForWork(workId)
        .confirmedListenDays
        .contains(_dateKey(date))) {
      return true;
    }
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
      for (final state in _state.workStates.values)
        for (final key in state.confirmedListenDays)
          if (DateTime.tryParse(key) case final date?) _dateOnly(date),
      for (final reaction in _state.reactions) _dateOnly(reaction.occurredAt),
      for (final event in _state.events)
        if (_isDailyCompletionEvent(event)) _dateOnly(event.occurredAt),
    };
  }

  bool _isDailyCompletionEvent(DiscoveryEvent event) {
    return event.entityType == 'work' &&
        event.eventType == 'listening_moment_complete';
  }

  bool _isSameLocalDay(DateTime a, DateTime b) {
    a = a.toLocal();
    b = b.toLocal();
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  DateTime _dateOnly(DateTime value) {
    value = value.toLocal();
    return DateTime(value.year, value.month, value.day);
  }

  String _dailyReasonFor(
    ClassicalWork work, {
    DailyPick? dailyPick,
    required String axis,
    required String tasteEvidenceLabel,
    required bool hasSavedUnopened,
    required bool isUnsureRecovery,
    required bool isCompleted,
  }) {
    if (isCompleted) {
      return '오늘은 이 한 곡이면 충분해요. 내일은 여기서 한 발만 더 갑니다.';
    }
    if (dailyPick != null) {
      return dailyPick.reason;
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

  String _axisForTasteItem(TasteIntakeItem item) =>
      item.matchOrigin == 'user_unlinked'
      ? ''
      : _axisForFreeText(item.rawInput);

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
    if (_containsAny(input, ['푸가', '바흐', '변주', '기법', '의도', '시대'])) {
      return '구조형';
    }
    if (_containsAny(input, ['피아노', '발라드', '멜로디', '선율', '야상곡', '쇼팽'])) {
      return '선율형';
    }
    if (_containsAny(input, ['앰비언트', '사운드', '분위기', '색'])) {
      return '색채형';
    }
    return '';
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

  bool _isRecommendationReady(ClassicalWork work) =>
      !_isExcludedRecommendation(work) &&
      !work.catalogStatusTags.contains('needs_copy_review') &&
      !work.catalogStatusTags.contains('catalog_backfill') &&
      work.primaryMoment != null &&
      _isValidRecommendationMoment(work, work.primaryMoment!);

  bool _isValidRecommendationMoment(
    ClassicalWork work,
    ListeningMoment moment,
  ) =>
      moment.prompt.trim().isNotEmpty &&
      moment.startSeconds >= 0 &&
      moment.endSeconds > moment.startSeconds &&
      moment.endSeconds <= work.durationSeconds;

  List<({ClassicalWork work, int score})> _scoreProgressiveCandidates({
    required String axis,
    required int targetDifficulty,
    required ClassicalWork? anchor,
    required Set<String> usedWorkIds,
  }) {
    final scored = <({ClassicalWork work, int score})>[];
    for (final work in _works) {
      if (usedWorkIds.contains(work.id) || !_isRecommendationReady(work)) {
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
      score += _personalDiscoveryFitScore(work);
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
    final prompt = work.primaryMoment?.prompt ?? '한 지점에서 시작해 봅니다.';
    return switch (lane) {
      'immediate' => _dailyPickSourceEvidence(axis, work),
      'stretch' => '${work.period}의 ${work.instrumentation} 작품입니다. $prompt',
      'later' => '다음에는 ${work.composerNameKo}의 이 지점도 열어볼까요? $prompt',
      _ => prompt,
    };
  }

  int _personalDiscoveryFitScore(ClassicalWork work) {
    final explicitWork = _state.tasteIntakeItems.any(
      (item) => item.matchedWorkId == work.id,
    );
    final explicitComposer = _state.tasteIntakeItems.any(
      (item) => item.matchedComposerId == work.composerId,
    );
    return (explicitWork
            ? 12
            : explicitComposer
            ? 10
            : 0) +
        work.contextTags.where(_state.preferredContextTags.contains).length *
            4 +
        work.moodTags.where(_state.preferredMoodTags.contains).length * 4 +
        (_state.preferredInstruments.contains(work.instrumentation) ? 4 : 0);
  }

  bool _isExcludedRecommendation(ClassicalWork work) =>
      _state.excludedComposerIds.contains(work.composerId) ||
      (_state.excludeOperaticVocals && work.isOperaticVocal);

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
