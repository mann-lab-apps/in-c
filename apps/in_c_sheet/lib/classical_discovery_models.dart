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

class UserDiscoveryState {
  const UserDiscoveryState({
    required this.workStates,
    required this.reactions,
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
      reactions: _jsonMapList(json['reactions'])
          .map(ClassicalReaction.fromJson)
          .where((reaction) => reaction.id.isNotEmpty)
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
      preferencesUpdatedAt: _dateFromJson(json['preferencesUpdatedAt']),
    );
  }

  static const defaultState = UserDiscoveryState(
    workStates: <String, UserWorkState>{},
    reactions: <ClassicalReaction>[],
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
  );

  final Map<String, UserWorkState> workStates;
  final List<ClassicalReaction> reactions;
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
  final DateTime? preferencesUpdatedAt;

  UserWorkState stateForWork(String workId) {
    return workStates[workId] ??
        UserWorkState(workId: workId, saved: false, familiarityLevel: 0);
  }

  UserDiscoveryState copyWith({
    Map<String, UserWorkState>? workStates,
    List<ClassicalReaction>? reactions,
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
    DateTime? preferencesUpdatedAt,
  }) {
    return UserDiscoveryState(
      workStates: workStates ?? this.workStates,
      reactions: reactions ?? this.reactions,
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
      preferencesUpdatedAt: preferencesUpdatedAt ?? this.preferencesUpdatedAt,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'workStates': workStates.values
          .map((state) => state.toJson())
          .toList(growable: false),
      'reactions': reactions
          .map((reaction) => reaction.toJson())
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
