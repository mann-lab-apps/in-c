import 'dart:convert';

String _stringFromJson(Object? value) => value is String ? value : '';

int _intFromJson(Object? value, {int fallback = 0}) {
  if (value is num) {
    return value.round();
  }
  return int.tryParse(value?.toString() ?? '') ?? fallback;
}

DateTime? _dateFromJson(Object? value) {
  return DateTime.tryParse(_stringFromJson(value));
}

List<String> _stringListFromJson(Object? value) {
  if (value is! List) {
    return const <String>[];
  }
  return value
      .whereType<String>()
      .map((item) => item.trim())
      .where((item) => item.isNotEmpty)
      .toList(growable: false);
}

String normalizeDiscoveryText(String value) {
  final lower = value.toLowerCase().trim();
  return lower.replaceAll(RegExp(r'[\s\p{P}\p{S}]+', unicode: true), '');
}

Map<String, Object?>? _jsonMap(Object? value) {
  if (value is! Map) {
    return null;
  }
  return value.map(
    (key, mapValue) => MapEntry(key.toString(), mapValue as Object?),
  );
}

List<Map<String, Object?>> _jsonMapList(Object? value) {
  if (value is! List) {
    return const <Map<String, Object?>>[];
  }
  return value
      .map(_jsonMap)
      .whereType<Map<String, Object?>>()
      .toList(growable: false);
}

class ClassicalComposer {
  const ClassicalComposer({
    required this.id,
    required this.nameKo,
    required this.nameOriginal,
    required this.period,
    required this.aliases,
  });

  final String id;
  final String nameKo;
  final String nameOriginal;
  final String period;
  final List<String> aliases;
}

class ClassicalMovement {
  const ClassicalMovement({
    required this.id,
    required this.title,
    required this.order,
    required this.durationSeconds,
  });

  final String id;
  final String title;
  final int order;
  final int durationSeconds;
}

class ListeningMoment {
  const ListeningMoment({
    required this.id,
    required this.label,
    required this.startSeconds,
    required this.endSeconds,
    required this.prompt,
    required this.tags,
    this.recommendedRecordingId,
    this.fallbackExternalLinkId,
  });

  final String id;
  final String label;
  final int startSeconds;
  final int endSeconds;
  final String prompt;
  final List<String> tags;
  final String? recommendedRecordingId;
  final String? fallbackExternalLinkId;
}

class ExternalLink {
  const ExternalLink({
    required this.id,
    required this.platformId,
    required this.label,
    required this.url,
    required this.linkType,
    this.previewUrl,
    this.embedUrl,
    this.deepLink,
    this.openMode = 'external',
  });

  final String id;
  final String platformId;
  final String label;
  final String url;
  final String linkType;
  final String? previewUrl;
  final String? embedUrl;
  final String? deepLink;
  final String openMode;
}

class ClassicalRecording {
  const ClassicalRecording({
    required this.id,
    required this.provider,
    required this.title,
    required this.performer,
    required this.url,
    required this.displayPriority,
    this.previewUrl,
    this.embedUrl,
    this.deepLink,
  });

  final String id;
  final String provider;
  final String title;
  final String performer;
  final String url;
  final int displayPriority;
  final String? previewUrl;
  final String? embedUrl;
  final String? deepLink;
}

class ClassicalWork {
  const ClassicalWork({
    required this.id,
    required this.titleKo,
    required this.titleOriginal,
    required this.composerId,
    required this.composerNameKo,
    required this.composerNameOriginal,
    required this.period,
    required this.instrumentation,
    required this.durationSeconds,
    required this.catalogNumber,
    required this.movements,
    required this.moodTags,
    required this.contextTags,
    required this.difficultyForListening,
    required this.aliases,
    required this.listeningMoments,
    required this.externalLinks,
    required this.recordings,
    required this.relatedWorkIds,
    required this.scoreLinks,
    required this.concertIds,
    this.catalogStatusTags = const <String>[],
  });

  final String id;
  final String titleKo;
  final String titleOriginal;
  final String composerId;
  final String composerNameKo;
  final String composerNameOriginal;
  final String period;
  final String instrumentation;
  final int durationSeconds;
  final String catalogNumber;
  final List<ClassicalMovement> movements;
  final List<String> moodTags;
  final List<String> contextTags;
  final int difficultyForListening;
  final List<String> aliases;
  final List<ListeningMoment> listeningMoments;
  final List<ExternalLink> externalLinks;
  final List<ClassicalRecording> recordings;
  final List<String> relatedWorkIds;
  final List<ExternalLink> scoreLinks;
  final List<String> concertIds;
  final List<String> catalogStatusTags;

  String get displayTitle => '$titleKo · $composerNameKo';
  ListeningMoment? get primaryMoment =>
      listeningMoments.isEmpty ? null : listeningMoments.first;

  bool matchesQuery(String query) {
    return searchScore(query) > 0;
  }

  int searchScore(String query) {
    final normalized = query.trim().toLowerCase();
    if (normalized.isEmpty) {
      return 1;
    }
    final compactQuery = normalizeDiscoveryText(query);
    final titleFields = <String>[titleKo, titleOriginal];
    if (titleFields.any((field) => field.toLowerCase() == normalized)) {
      return 100;
    }
    if (aliases.any((alias) => alias.toLowerCase() == normalized)) {
      return 92;
    }
    if (catalogNumber.isNotEmpty &&
        normalizeDiscoveryText(catalogNumber) == compactQuery) {
      return 88;
    }
    if (titleFields.any(
      (field) => normalizeDiscoveryText(field).contains(compactQuery),
    )) {
      return 76;
    }
    if (aliases.any(
      (alias) => normalizeDiscoveryText(alias).contains(compactQuery),
    )) {
      return 70;
    }
    if (normalizeDiscoveryText(composerNameKo).contains(compactQuery) ||
        normalizeDiscoveryText(composerNameOriginal).contains(compactQuery)) {
      return 58;
    }
    if (normalizeDiscoveryText(catalogNumber).contains(compactQuery)) {
      return 52;
    }
    if (normalizeDiscoveryText(instrumentation).contains(compactQuery)) {
      return 40;
    }
    final tagText = <String>[...moodTags, ...contextTags].join(' ');
    if (normalizeDiscoveryText(tagText).contains(compactQuery)) {
      return 30;
    }
    final haystack = <String>[
      titleKo,
      titleOriginal,
      composerNameKo,
      composerNameOriginal,
      catalogNumber,
      instrumentation,
      ...aliases,
      ...moodTags,
      ...contextTags,
    ].join(' ').toLowerCase();
    return haystack.contains(normalized) ? 12 : 0;
  }

  int relevanceScoreFor({
    required ClassicalWork anchor,
    required bool hasConcert,
  }) {
    if (id == anchor.id) {
      return -1000;
    }
    var score = 0;
    if (anchor.relatedWorkIds.contains(id)) {
      score += 8;
    }
    if (composerId == anchor.composerId) {
      score += 6;
    }
    if (period == anchor.period) {
      score += 2;
    }
    if (instrumentation == anchor.instrumentation) {
      score += 4;
    }
    score += moodTags.toSet().intersection(anchor.moodTags.toSet()).length * 3;
    score +=
        contextTags.toSet().intersection(anchor.contextTags.toSet()).length * 2;
    if (difficultyForListening <= anchor.difficultyForListening + 1) {
      score += 1;
    }
    if (hasConcert) {
      score += 2;
    }
    return score;
  }

  List<ExternalLink> linksForPreferredPlatform(String preferredPlatformId) {
    final links = [...externalLinks];
    links.sort((a, b) {
      final aScore = a.platformId == preferredPlatformId ? 0 : 1;
      final bScore = b.platformId == preferredPlatformId ? 0 : 1;
      final platform = aScore.compareTo(bScore);
      if (platform != 0) {
        return platform;
      }
      return a.label.compareTo(b.label);
    });
    return List<ExternalLink>.unmodifiable(links);
  }

  ClassicalWork copyWith({
    List<ListeningMoment>? listeningMoments,
    List<ExternalLink>? externalLinks,
    List<ClassicalRecording>? recordings,
    List<String>? relatedWorkIds,
    List<ExternalLink>? scoreLinks,
    List<String>? concertIds,
    List<String>? catalogStatusTags,
  }) {
    return ClassicalWork(
      id: id,
      titleKo: titleKo,
      titleOriginal: titleOriginal,
      composerId: composerId,
      composerNameKo: composerNameKo,
      composerNameOriginal: composerNameOriginal,
      period: period,
      instrumentation: instrumentation,
      durationSeconds: durationSeconds,
      catalogNumber: catalogNumber,
      movements: movements,
      moodTags: moodTags,
      contextTags: contextTags,
      difficultyForListening: difficultyForListening,
      aliases: aliases,
      listeningMoments: listeningMoments ?? this.listeningMoments,
      externalLinks: externalLinks ?? this.externalLinks,
      recordings: recordings ?? this.recordings,
      relatedWorkIds: relatedWorkIds ?? this.relatedWorkIds,
      scoreLinks: scoreLinks ?? this.scoreLinks,
      concertIds: concertIds ?? this.concertIds,
      catalogStatusTags: catalogStatusTags ?? this.catalogStatusTags,
    );
  }
}

class ClassicalConcert {
  const ClassicalConcert({
    required this.id,
    required this.title,
    required this.venue,
    required this.region,
    required this.startsAt,
    required this.performers,
    required this.programWorkIds,
    required this.composerIds,
    required this.instrumentTags,
    required this.ticketUrl,
    this.programRawText = '',
    this.ticketDestinations = const <TicketDestination>[],
  });

  final String id;
  final String title;
  final String venue;
  final String region;
  final DateTime startsAt;
  final List<String> performers;
  final List<String> programWorkIds;
  final List<String> composerIds;
  final List<String> instrumentTags;
  final String ticketUrl;
  final String programRawText;
  final List<TicketDestination> ticketDestinations;

  bool isRelevantToWork(ClassicalWork work, {String? region}) {
    if (region != null && region.isNotEmpty && this.region == region) {
      return true;
    }
    return programWorkIds.contains(work.id) ||
        composerIds.contains(work.composerId) ||
        instrumentTags.contains(work.instrumentation);
  }
}

class TicketDestination {
  const TicketDestination({
    required this.id,
    required this.label,
    required this.url,
    this.displayPriority = 0,
  });

  final String id;
  final String label;
  final String url;
  final int displayPriority;
}

class ConcertPromotion {
  const ConcertPromotion({
    required this.id,
    required this.concertId,
    required this.advertiserName,
    required this.sponsorLabel,
    required this.targetWorkIds,
    required this.targetComposerIds,
    required this.targetInstruments,
    required this.targetRegions,
  });

  final String id;
  final String concertId;
  final String advertiserName;
  final String sponsorLabel;
  final List<String> targetWorkIds;
  final List<String> targetComposerIds;
  final List<String> targetInstruments;
  final List<String> targetRegions;

  int relevanceScoreFor(ClassicalWork work, {String? region}) {
    var score = 0;
    if (targetWorkIds.contains(work.id)) {
      score += 10;
    }
    if (targetComposerIds.contains(work.composerId)) {
      score += 5;
    }
    if (targetInstruments.contains(work.instrumentation)) {
      score += 4;
    }
    if (region != null && region.isNotEmpty && targetRegions.contains(region)) {
      score += 2;
    }
    return score;
  }
}

class RecommendationShelf {
  const RecommendationShelf({
    required this.id,
    required this.title,
    required this.works,
    this.reason = '',
    this.source = '',
  });

  final String id;
  final String title;
  final List<ClassicalWork> works;
  final String reason;
  final String source;
}

class TasteIntakeItem {
  const TasteIntakeItem({
    required this.id,
    required this.label,
    required this.rawInput,
    required this.sourceType,
    required this.confidence,
    required this.createdAt,
    this.matchedWorkId,
    this.matchedComposerId,
  });

  factory TasteIntakeItem.fromJson(Map<String, Object?> json) {
    return TasteIntakeItem(
      id: _stringFromJson(json['id']),
      label: _stringFromJson(json['label']),
      rawInput: _stringFromJson(json['rawInput']),
      matchedWorkId: _stringFromJson(json['matchedWorkId']).isEmpty
          ? null
          : _stringFromJson(json['matchedWorkId']),
      matchedComposerId: _stringFromJson(json['matchedComposerId']).isEmpty
          ? null
          : _stringFromJson(json['matchedComposerId']),
      sourceType: _stringFromJson(json['sourceType']).isEmpty
          ? 'free_text'
          : _stringFromJson(json['sourceType']),
      confidence: _intFromJson(json['confidence']),
      createdAt:
          _dateFromJson(json['createdAt']) ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }

  final String id;
  final String label;
  final String rawInput;
  final String? matchedWorkId;
  final String? matchedComposerId;
  final String sourceType;
  final int confidence;
  final DateTime createdAt;

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': id,
      'label': label,
      'rawInput': rawInput,
      'matchedWorkId': matchedWorkId,
      'matchedComposerId': matchedComposerId,
      'sourceType': sourceType,
      'confidence': confidence,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

class TasteAxisScore {
  const TasteAxisScore({
    required this.axis,
    required this.score,
    required this.evidenceCount,
    required this.lastUpdatedAt,
  });

  final String axis;
  final int score;
  final int evidenceCount;
  final DateTime? lastUpdatedAt;
}

class ListeningLevelSnapshot {
  const ListeningLevelSnapshot({
    required this.level,
    required this.confidence,
    required this.strengths,
    required this.nextGrowthArea,
    required this.updatedAt,
  });

  final String level;
  final int confidence;
  final List<String> strengths;
  final String nextGrowthArea;
  final DateTime? updatedAt;
}

class ProgressiveRecommendation {
  const ProgressiveRecommendation({
    required this.work,
    required this.lane,
    required this.reason,
    required this.distance,
    required this.axis,
    required this.difficulty,
    required this.sourceEvidence,
  });

  final ClassicalWork work;
  final String lane;
  final String reason;
  final int distance;
  final String axis;
  final int difficulty;
  final String sourceEvidence;
}

class DailyListeningStep {
  const DailyListeningStep({
    required this.work,
    required this.moment,
    required this.title,
    required this.prompt,
    required this.reason,
    required this.nextEffect,
    required this.estimatedSeconds,
    required this.difficulty,
    required this.axis,
    required this.completionState,
    required this.dueDate,
    this.tasteEvidenceLabel = '',
  });

  final ClassicalWork work;
  final ListeningMoment moment;
  final String title;
  final String prompt;
  final String reason;
  final String nextEffect;
  final int estimatedSeconds;
  final int difficulty;
  final String axis;
  final String completionState;
  final DateTime dueDate;
  final String tasteEvidenceLabel;

  bool get isCompleted => completionState == 'completed';
}

class GentleContinuitySummary {
  const GentleContinuitySummary({
    required this.currentRunDays,
    required this.weeklyCompletedDays,
    required this.lastCompletedDate,
    required this.missedDaysInLastWeek,
    required this.completedToday,
    required this.headline,
    required this.recoveryCopy,
  });

  final int currentRunDays;
  final int weeklyCompletedDays;
  final DateTime? lastCompletedDate;
  final int missedDaysInLastWeek;
  final bool completedToday;
  final String headline;
  final String recoveryCopy;
}

class TasteStartPreview {
  const TasteStartPreview({
    required this.items,
    required this.axis,
    required this.dailyStep,
    required this.nextThree,
  });

  final List<TasteIntakeItem> items;
  final String axis;
  final DailyListeningStep dailyStep;
  final List<ProgressiveRecommendation> nextThree;
}

class ReminderPreference {
  const ReminderPreference({
    required this.enabled,
    required this.timeLabel,
    required this.message,
    required this.deliveryStatus,
    this.updatedAt,
  });

  factory ReminderPreference.fromJson(Map<String, Object?>? json) {
    if (json == null) {
      return defaultPreference;
    }
    final enabled = json['enabled'] == true;
    final timeLabel = _stringFromJson(json['timeLabel']).isEmpty
        ? defaultPreference.timeLabel
        : _stringFromJson(json['timeLabel']);
    final message = _stringFromJson(json['message']).isEmpty
        ? defaultPreference.message
        : _stringFromJson(json['message']);
    final deliveryStatus = _stringFromJson(json['deliveryStatus']).isEmpty
        ? defaultPreference.deliveryStatus
        : _stringFromJson(json['deliveryStatus']);
    return ReminderPreference(
      enabled: enabled,
      timeLabel: timeLabel,
      message: message,
      deliveryStatus: deliveryStatus,
      updatedAt: _dateFromJson(json['updatedAt']),
    );
  }

  static const defaultPreference = ReminderPreference(
    enabled: false,
    timeLabel: '20:30',
    message: '오늘 30초만 열어볼까요?',
    deliveryStatus: 'local-preference-only',
  );

  final bool enabled;
  final String timeLabel;
  final String message;
  final String deliveryStatus;
  final DateTime? updatedAt;

  ReminderPreference copyWith({
    bool? enabled,
    String? timeLabel,
    String? message,
    String? deliveryStatus,
    DateTime? updatedAt,
  }) {
    return ReminderPreference(
      enabled: enabled ?? this.enabled,
      timeLabel: timeLabel ?? this.timeLabel,
      message: message ?? this.message,
      deliveryStatus: deliveryStatus ?? this.deliveryStatus,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'enabled': enabled,
      'timeLabel': timeLabel,
      'message': message,
      'deliveryStatus': deliveryStatus,
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }
}

class ListeningMapNodeStatus {
  const ListeningMapNodeStatus._();

  static const locked = 'locked';
  static const suggested = 'suggested';
  static const opened = 'opened';
  static const familiar = 'familiar';
  static const conquered = 'conquered';
}

class ListeningMapNode {
  const ListeningMapNode({
    required this.id,
    required this.title,
    required this.description,
    required this.axis,
    required this.level,
    required this.prerequisiteNodeIds,
    required this.recommendedWorkIds,
    required this.anchorWorkIds,
    required this.unlockedByTags,
    required this.userFacingCopy,
  });

  final String id;
  final String title;
  final String description;
  final String axis;
  final int level;
  final List<String> prerequisiteNodeIds;
  final List<String> recommendedWorkIds;
  final List<String> anchorWorkIds;
  final List<String> unlockedByTags;
  final String userFacingCopy;
}

class ListeningMapEdge {
  const ListeningMapEdge({
    required this.fromNodeId,
    required this.toNodeId,
    required this.reason,
    required this.difficultyStep,
  });

  final String fromNodeId;
  final String toNodeId;
  final String reason;
  final int difficultyStep;
}

class UserListeningMapState {
  const UserListeningMapState({
    required this.openedNodeIds,
    required this.familiarNodeIds,
    required this.conqueredNodeIds,
    required this.unfamiliarNodeIds,
    required this.currentNodeId,
    required this.nextNodeIds,
    required this.capturedMomentIds,
    required this.updatedAt,
  });

  final Set<String> openedNodeIds;
  final Set<String> familiarNodeIds;
  final Set<String> conqueredNodeIds;
  final Set<String> unfamiliarNodeIds;
  final String? currentNodeId;
  final List<String> nextNodeIds;
  final Set<String> capturedMomentIds;
  final DateTime? updatedAt;

  String statusFor(String nodeId) {
    if (conqueredNodeIds.contains(nodeId)) {
      return ListeningMapNodeStatus.conquered;
    }
    if (familiarNodeIds.contains(nodeId)) {
      return ListeningMapNodeStatus.familiar;
    }
    if (openedNodeIds.contains(nodeId)) {
      return ListeningMapNodeStatus.opened;
    }
    if (nextNodeIds.contains(nodeId)) {
      return ListeningMapNodeStatus.suggested;
    }
    return ListeningMapNodeStatus.locked;
  }
}

class ListeningMapProgress {
  const ListeningMapProgress({
    required this.nodes,
    required this.edges,
    required this.userState,
    required this.axisScores,
    required this.openedCount,
    required this.familiarCount,
    required this.conqueredCount,
    required this.currentNode,
    required this.nextPath,
    required this.unfamiliarNodes,
    required this.conqueredWorks,
    required this.summaryCopy,
    required this.rewardCopy,
  });

  final List<ListeningMapNode> nodes;
  final List<ListeningMapEdge> edges;
  final UserListeningMapState userState;
  final List<TasteAxisScore> axisScores;
  final int openedCount;
  final int familiarCount;
  final int conqueredCount;
  final ListeningMapNode? currentNode;
  final List<ListeningMapNode> nextPath;
  final List<ListeningMapNode> unfamiliarNodes;
  final List<ClassicalWork> conqueredWorks;
  final String summaryCopy;
  final String rewardCopy;
}

class WorkListeningMapRole {
  const WorkListeningMapRole({
    required this.work,
    required this.primaryNode,
    required this.relatedNodes,
    required this.status,
    required this.roleCopy,
    required this.capturedPoints,
    required this.nextPath,
  });

  final ClassicalWork work;
  final ListeningMapNode primaryNode;
  final List<ListeningMapNode> relatedNodes;
  final String status;
  final String roleCopy;
  final List<String> capturedPoints;
  final List<ProgressiveRecommendation> nextPath;
}

class WorkPassportStamp {
  const WorkPassportStamp({
    required this.id,
    required this.workId,
    required this.stampType,
    required this.label,
    required this.occurredAt,
    this.momentId,
    this.concertId,
    this.routeId,
    this.reactionType,
    this.note = '',
  });

  final String id;
  final String workId;
  final String stampType;
  final String label;
  final String? momentId;
  final String? concertId;
  final String? routeId;
  final String? reactionType;
  final String note;
  final DateTime occurredAt;
}

class UserWorkState {
  const UserWorkState({
    required this.workId,
    required this.saved,
    required this.familiarityLevel,
    this.firstListenedAt,
    this.lastListenedAt,
    this.repeatDueAt,
    this.updatedAt,
    this.reactionCounts = const <String, int>{},
  });

  factory UserWorkState.fromJson(Map<String, Object?> json) {
    return UserWorkState(
      workId: _stringFromJson(json['workId']),
      saved: json['saved'] == true,
      familiarityLevel: _intFromJson(json['familiarityLevel']),
      firstListenedAt: _dateFromJson(json['firstListenedAt']),
      lastListenedAt: _dateFromJson(json['lastListenedAt']),
      repeatDueAt: _dateFromJson(json['repeatDueAt']),
      updatedAt: _dateFromJson(json['updatedAt']),
      reactionCounts: _mapIntFromJson(json['reactionCounts']),
    );
  }

  final String workId;
  final bool saved;
  final int familiarityLevel;
  final DateTime? firstListenedAt;
  final DateTime? lastListenedAt;
  final DateTime? repeatDueAt;
  final DateTime? updatedAt;
  final Map<String, int> reactionCounts;

  UserWorkState copyWith({
    bool? saved,
    int? familiarityLevel,
    DateTime? firstListenedAt,
    DateTime? lastListenedAt,
    DateTime? repeatDueAt,
    DateTime? updatedAt,
    Map<String, int>? reactionCounts,
  }) {
    return UserWorkState(
      workId: workId,
      saved: saved ?? this.saved,
      familiarityLevel: familiarityLevel ?? this.familiarityLevel,
      firstListenedAt: firstListenedAt ?? this.firstListenedAt,
      lastListenedAt: lastListenedAt ?? this.lastListenedAt,
      repeatDueAt: repeatDueAt ?? this.repeatDueAt,
      updatedAt: updatedAt ?? this.updatedAt,
      reactionCounts: reactionCounts ?? this.reactionCounts,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'workId': workId,
      'saved': saved,
      'familiarityLevel': familiarityLevel,
      'firstListenedAt': firstListenedAt?.toIso8601String(),
      'lastListenedAt': lastListenedAt?.toIso8601String(),
      'repeatDueAt': repeatDueAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
      'reactionCounts': reactionCounts,
    };
  }

  static Map<String, int> _mapIntFromJson(Object? value) {
    if (value is! Map) {
      return const <String, int>{};
    }
    return value.map((key, mapValue) {
      return MapEntry(key.toString(), _intFromJson(mapValue));
    });
  }
}

class ClassicalReaction {
  const ClassicalReaction({
    required this.id,
    required this.workId,
    required this.type,
    required this.occurredAt,
    this.momentId,
  });

  factory ClassicalReaction.fromJson(Map<String, Object?> json) {
    return ClassicalReaction(
      id: _stringFromJson(json['id']),
      workId: _stringFromJson(json['workId']),
      type: _stringFromJson(json['type']),
      momentId: _stringFromJson(json['momentId']).isEmpty
          ? null
          : _stringFromJson(json['momentId']),
      occurredAt:
          _dateFromJson(json['occurredAt']) ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }

  final String id;
  final String workId;
  final String type;
  final String? momentId;
  final DateTime occurredAt;

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': id,
      'workId': workId,
      'type': type,
      'momentId': momentId,
      'occurredAt': occurredAt.toIso8601String(),
    };
  }
}

class DiscoveryEvent {
  const DiscoveryEvent({
    required this.id,
    required this.eventType,
    required this.entityType,
    required this.entityId,
    required this.occurredAt,
    this.context,
    this.properties = const <String, String>{},
  });

  factory DiscoveryEvent.fromJson(Map<String, Object?> json) {
    return DiscoveryEvent(
      id: _stringFromJson(json['id']),
      eventType: _stringFromJson(json['eventType']),
      entityType: _stringFromJson(json['entityType']),
      entityId: _stringFromJson(json['entityId']),
      context: _stringFromJson(json['context']).isEmpty
          ? null
          : _stringFromJson(json['context']),
      properties: _mapStringFromJson(json['properties']),
      occurredAt:
          _dateFromJson(json['occurredAt']) ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }

  final String id;
  final String eventType;
  final String entityType;
  final String entityId;
  final String? context;
  final Map<String, String> properties;
  final DateTime occurredAt;

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': id,
      'eventType': eventType,
      'entityType': entityType,
      'entityId': entityId,
      'context': context,
      'properties': properties,
      'occurredAt': occurredAt.toIso8601String(),
    };
  }

  static Map<String, String> _mapStringFromJson(Object? value) {
    if (value is! Map) {
      return const <String, String>{};
    }
    return value.map(
      (key, mapValue) => MapEntry(key.toString(), mapValue.toString()),
    );
  }
}

enum ConcertPreviewRouteSourceType { seededConcert, pastedProgram, manual }

enum ConcertPreviewRouteCompletionState { draft, ready, completed }

class ConcertPreviewRoute {
  const ConcertPreviewRoute({
    required this.id,
    required this.sourceType,
    required this.routeTitle,
    required this.programWorkIds,
    required this.listeningMomentIds,
    required this.totalPreviewMinutes,
    required this.hallListeningNotes,
    required this.completionState,
    required this.createdAt,
    required this.updatedAt,
    this.concertId,
    this.date,
    this.venue,
    this.rawProgramText = '',
    this.unmatchedProgramLines = const <String>[],
  });

  factory ConcertPreviewRoute.fromJson(Map<String, Object?> json) {
    return ConcertPreviewRoute(
      id: _stringFromJson(json['id']),
      sourceType: _routeSourceFromJson(json['sourceType']),
      routeTitle: _stringFromJson(json['routeTitle']),
      concertId: _stringFromJson(json['concertId']).isEmpty
          ? null
          : _stringFromJson(json['concertId']),
      date: _dateFromJson(json['date']),
      venue: _stringFromJson(json['venue']).isEmpty
          ? null
          : _stringFromJson(json['venue']),
      rawProgramText: _stringFromJson(json['rawProgramText']),
      programWorkIds: _stringListFromJson(json['programWorkIds']),
      listeningMomentIds: _stringListFromJson(json['listeningMomentIds']),
      totalPreviewMinutes: _intFromJson(json['totalPreviewMinutes']),
      hallListeningNotes: _stringListFromJson(json['hallListeningNotes']),
      unmatchedProgramLines: _stringListFromJson(json['unmatchedProgramLines']),
      completionState: _routeCompletionFromJson(json['completionState']),
      createdAt:
          _dateFromJson(json['createdAt']) ??
          DateTime.fromMillisecondsSinceEpoch(0),
      updatedAt:
          _dateFromJson(json['updatedAt']) ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }

  final String id;
  final ConcertPreviewRouteSourceType sourceType;
  final String? concertId;
  final String routeTitle;
  final DateTime? date;
  final String? venue;
  final String rawProgramText;
  final List<String> programWorkIds;
  final List<String> listeningMomentIds;
  final int totalPreviewMinutes;
  final List<String> hallListeningNotes;
  final List<String> unmatchedProgramLines;
  final ConcertPreviewRouteCompletionState completionState;
  final DateTime createdAt;
  final DateTime updatedAt;

  ConcertPreviewRoute copyWith({
    List<String>? programWorkIds,
    List<String>? listeningMomentIds,
    int? totalPreviewMinutes,
    List<String>? hallListeningNotes,
    List<String>? unmatchedProgramLines,
    ConcertPreviewRouteCompletionState? completionState,
    DateTime? updatedAt,
  }) {
    return ConcertPreviewRoute(
      id: id,
      sourceType: sourceType,
      concertId: concertId,
      routeTitle: routeTitle,
      date: date,
      venue: venue,
      rawProgramText: rawProgramText,
      programWorkIds: programWorkIds ?? this.programWorkIds,
      listeningMomentIds: listeningMomentIds ?? this.listeningMomentIds,
      totalPreviewMinutes: totalPreviewMinutes ?? this.totalPreviewMinutes,
      hallListeningNotes: hallListeningNotes ?? this.hallListeningNotes,
      unmatchedProgramLines:
          unmatchedProgramLines ?? this.unmatchedProgramLines,
      completionState: completionState ?? this.completionState,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': id,
      'sourceType': sourceType.name,
      'concertId': concertId,
      'routeTitle': routeTitle,
      'date': date?.toIso8601String(),
      'venue': venue,
      'rawProgramText': rawProgramText,
      'programWorkIds': programWorkIds,
      'listeningMomentIds': listeningMomentIds,
      'totalPreviewMinutes': totalPreviewMinutes,
      'hallListeningNotes': hallListeningNotes,
      'unmatchedProgramLines': unmatchedProgramLines,
      'completionState': completionState.name,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  static ConcertPreviewRouteSourceType _routeSourceFromJson(Object? value) {
    final name = _stringFromJson(value);
    for (final type in ConcertPreviewRouteSourceType.values) {
      if (type.name == name) {
        return type;
      }
    }
    return ConcertPreviewRouteSourceType.manual;
  }

  static ConcertPreviewRouteCompletionState _routeCompletionFromJson(
    Object? value,
  ) {
    final name = _stringFromJson(value);
    for (final state in ConcertPreviewRouteCompletionState.values) {
      if (state.name == name) {
        return state;
      }
    }
    return ConcertPreviewRouteCompletionState.draft;
  }
}

class PostConcertReflection {
  const PostConcertReflection({
    required this.id,
    required this.workId,
    required this.reactionType,
    required this.occurredAt,
    this.concertId,
    this.routeId,
    this.instrument = '',
    this.note = '',
  });

  factory PostConcertReflection.fromJson(Map<String, Object?> json) {
    return PostConcertReflection(
      id: _stringFromJson(json['id']),
      concertId: _stringFromJson(json['concertId']).isEmpty
          ? null
          : _stringFromJson(json['concertId']),
      routeId: _stringFromJson(json['routeId']).isEmpty
          ? null
          : _stringFromJson(json['routeId']),
      workId: _stringFromJson(json['workId']),
      instrument: _stringFromJson(json['instrument']),
      reactionType: _stringFromJson(json['reactionType']),
      note: _stringFromJson(json['note']),
      occurredAt:
          _dateFromJson(json['occurredAt']) ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }

  final String id;
  final String? concertId;
  final String? routeId;
  final String workId;
  final String instrument;
  final String reactionType;
  final String note;
  final DateTime occurredAt;

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': id,
      'concertId': concertId,
      'routeId': routeId,
      'workId': workId,
      'instrument': instrument,
      'reactionType': reactionType,
      'note': note,
      'occurredAt': occurredAt.toIso8601String(),
    };
  }
}

class UserDiscoveryState {
  const UserDiscoveryState({
    required this.workStates,
    required this.tasteIntakeItems,
    required this.reactions,
    required this.previewRoutes,
    required this.postConcertReflections,
    required this.savedConcertIds,
    required this.dismissedPromotionIds,
    required this.events,
    required this.preferredPlatformId,
    required this.region,
    required this.onboardingCompleted,
    required this.experienceLevel,
    required this.preferredMoodTags,
    required this.preferredContextTags,
    required this.preferredInstruments,
    required this.notificationPreferences,
    required this.reminderPreference,
    this.preferencesUpdatedAt,
  });

  factory UserDiscoveryState.fromJson(Map<String, Object?>? json) {
    if (json == null) {
      return defaultState;
    }
    final states = <String, UserWorkState>{};
    for (final map in _jsonMapList(json['workStates'])) {
      final state = UserWorkState.fromJson(map);
      if (state.workId.isNotEmpty) {
        states[state.workId] = state;
      }
    }
    return UserDiscoveryState(
      workStates: Map<String, UserWorkState>.unmodifiable(states),
      tasteIntakeItems: _jsonMapList(json['tasteIntakeItems'])
          .map(TasteIntakeItem.fromJson)
          .where((item) => item.id.isNotEmpty)
          .toList(growable: false),
      reactions: _jsonMapList(json['reactions'])
          .map(ClassicalReaction.fromJson)
          .where((reaction) => reaction.id.isNotEmpty)
          .toList(growable: false),
      previewRoutes: _jsonMapList(json['previewRoutes'])
          .map(ConcertPreviewRoute.fromJson)
          .where((route) => route.id.isNotEmpty)
          .toList(growable: false),
      postConcertReflections: _jsonMapList(json['postConcertReflections'])
          .map(PostConcertReflection.fromJson)
          .where((reflection) => reflection.id.isNotEmpty)
          .toList(growable: false),
      savedConcertIds: _stringListFromJson(json['savedConcertIds']).toSet(),
      dismissedPromotionIds: _stringListFromJson(json['dismissedPromotionIds'])
          .toSet(),
      events: _jsonMapList(json['events'])
          .map(DiscoveryEvent.fromJson)
          .where((event) => event.id.isNotEmpty)
          .toList(growable: false),
      preferredPlatformId: _stringFromJson(json['preferredPlatformId']).isEmpty
          ? defaultState.preferredPlatformId
          : _stringFromJson(json['preferredPlatformId']),
      region: _stringFromJson(json['region']).isEmpty
          ? defaultState.region
          : _stringFromJson(json['region']),
      onboardingCompleted: json['onboardingCompleted'] == true,
      experienceLevel: _stringFromJson(json['experienceLevel']).isEmpty
          ? defaultState.experienceLevel
          : _stringFromJson(json['experienceLevel']),
      preferredMoodTags: _stringListFromJson(json['preferredMoodTags']).toSet(),
      preferredContextTags: _stringListFromJson(json['preferredContextTags'])
          .toSet(),
      preferredInstruments: _stringListFromJson(json['preferredInstruments'])
          .toSet(),
      notificationPreferences: _stringListFromJson(
        json['notificationPreferences'],
      ).toSet(),
      reminderPreference: ReminderPreference.fromJson(
        _jsonMap(json['reminderPreference']),
      ),
      preferencesUpdatedAt: _dateFromJson(json['preferencesUpdatedAt']),
    );
  }

  static const defaultState = UserDiscoveryState(
    workStates: <String, UserWorkState>{},
    tasteIntakeItems: <TasteIntakeItem>[],
    reactions: <ClassicalReaction>[],
    previewRoutes: <ConcertPreviewRoute>[],
    postConcertReflections: <PostConcertReflection>[],
    savedConcertIds: <String>{},
    dismissedPromotionIds: <String>{},
    events: <DiscoveryEvent>[],
    preferredPlatformId: 'youtube',
    region: '서울',
    onboardingCompleted: false,
    experienceLevel: '처음',
    preferredMoodTags: <String>{},
    preferredContextTags: <String>{},
    preferredInstruments: <String>{},
    notificationPreferences: <String>{},
    reminderPreference: ReminderPreference.defaultPreference,
  );

  final Map<String, UserWorkState> workStates;
  final List<TasteIntakeItem> tasteIntakeItems;
  final List<ClassicalReaction> reactions;
  final List<ConcertPreviewRoute> previewRoutes;
  final List<PostConcertReflection> postConcertReflections;
  final Set<String> savedConcertIds;
  final Set<String> dismissedPromotionIds;
  final List<DiscoveryEvent> events;
  final String preferredPlatformId;
  final String region;
  final bool onboardingCompleted;
  final String experienceLevel;
  final Set<String> preferredMoodTags;
  final Set<String> preferredContextTags;
  final Set<String> preferredInstruments;
  final Set<String> notificationPreferences;
  final ReminderPreference reminderPreference;
  final DateTime? preferencesUpdatedAt;

  UserWorkState stateForWork(String workId) {
    return workStates[workId] ??
        UserWorkState(workId: workId, saved: false, familiarityLevel: 0);
  }

  UserDiscoveryState copyWith({
    Map<String, UserWorkState>? workStates,
    List<TasteIntakeItem>? tasteIntakeItems,
    List<ClassicalReaction>? reactions,
    List<ConcertPreviewRoute>? previewRoutes,
    List<PostConcertReflection>? postConcertReflections,
    Set<String>? savedConcertIds,
    Set<String>? dismissedPromotionIds,
    List<DiscoveryEvent>? events,
    String? preferredPlatformId,
    String? region,
    bool? onboardingCompleted,
    String? experienceLevel,
    Set<String>? preferredMoodTags,
    Set<String>? preferredContextTags,
    Set<String>? preferredInstruments,
    Set<String>? notificationPreferences,
    ReminderPreference? reminderPreference,
    DateTime? preferencesUpdatedAt,
  }) {
    return UserDiscoveryState(
      workStates: workStates ?? this.workStates,
      tasteIntakeItems: tasteIntakeItems ?? this.tasteIntakeItems,
      reactions: reactions ?? this.reactions,
      previewRoutes: previewRoutes ?? this.previewRoutes,
      postConcertReflections:
          postConcertReflections ?? this.postConcertReflections,
      savedConcertIds: savedConcertIds ?? this.savedConcertIds,
      dismissedPromotionIds:
          dismissedPromotionIds ?? this.dismissedPromotionIds,
      events: events ?? this.events,
      preferredPlatformId: preferredPlatformId ?? this.preferredPlatformId,
      region: region ?? this.region,
      onboardingCompleted: onboardingCompleted ?? this.onboardingCompleted,
      experienceLevel: experienceLevel ?? this.experienceLevel,
      preferredMoodTags: preferredMoodTags ?? this.preferredMoodTags,
      preferredContextTags: preferredContextTags ?? this.preferredContextTags,
      preferredInstruments: preferredInstruments ?? this.preferredInstruments,
      notificationPreferences:
          notificationPreferences ?? this.notificationPreferences,
      reminderPreference: reminderPreference ?? this.reminderPreference,
      preferencesUpdatedAt: preferencesUpdatedAt ?? this.preferencesUpdatedAt,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'workStates': workStates.values
          .map((state) => state.toJson())
          .toList(growable: false),
      'tasteIntakeItems': tasteIntakeItems
          .map((item) => item.toJson())
          .toList(growable: false),
      'reactions': reactions
          .map((reaction) => reaction.toJson())
          .toList(growable: false),
      'previewRoutes': previewRoutes
          .map((route) => route.toJson())
          .toList(growable: false),
      'postConcertReflections': postConcertReflections
          .map((reflection) => reflection.toJson())
          .toList(growable: false),
      'savedConcertIds': savedConcertIds.toList(growable: false),
      'dismissedPromotionIds': dismissedPromotionIds.toList(growable: false),
      'events': events.map((event) => event.toJson()).toList(growable: false),
      'preferredPlatformId': preferredPlatformId,
      'region': region,
      'onboardingCompleted': onboardingCompleted,
      'experienceLevel': experienceLevel,
      'preferredMoodTags': preferredMoodTags.toList(growable: false),
      'preferredContextTags': preferredContextTags.toList(growable: false),
      'preferredInstruments': preferredInstruments.toList(growable: false),
      'notificationPreferences': notificationPreferences.toList(
        growable: false,
      ),
      'reminderPreference': reminderPreference.toJson(),
      'preferencesUpdatedAt': preferencesUpdatedAt?.toIso8601String(),
    };
  }

  static UserDiscoveryState decode(String? value) {
    if (value == null || value.trim().isEmpty) {
      return defaultState;
    }
    try {
      final decoded = jsonDecode(value);
      return UserDiscoveryState.fromJson(_jsonMap(decoded));
    } catch (_) {
      return defaultState;
    }
  }

  static String encode(UserDiscoveryState state) {
    return jsonEncode(state.toJson());
  }
}
