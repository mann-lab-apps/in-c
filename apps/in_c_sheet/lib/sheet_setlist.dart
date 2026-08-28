import 'dart:convert';

import 'sheet_score.dart';

class SheetSetlist {
  const SheetSetlist({
    required this.id,
    required this.title,
    required this.scoreIds,
    required this.createdAt,
    required this.updatedAt,
    this.rehearsalMode = false,
    this.scoreStartPages = const <String, int>{},
    this.scoreNotes = const <String, String>{},
    this.scoreDurations = const <String, int>{},
    this.transitionSeconds = 0,
    this.viewerSettingsOverride,
  });

  factory SheetSetlist.fromJson(Map<String, Object?> json) {
    final id = _stringFromJson(json['id']).trim();
    if (id.isEmpty) {
      throw const FormatException('Setlist id is required.');
    }
    final createdAt = _dateFromJson(json['createdAt']);
    return SheetSetlist(
      id: id,
      title: _titleFromJson(json['title']),
      scoreIds: _jsonList(json['scoreIds'])
          .map(_stringFromJson)
          .map((scoreId) => scoreId.trim())
          .where((scoreId) => scoreId.isNotEmpty)
          .toList(growable: false),
      createdAt: createdAt,
      updatedAt: _dateFromJson(json['updatedAt'], fallback: createdAt),
      rehearsalMode: _boolFromJson(json['rehearsalMode'], fallback: false),
      scoreStartPages: _intMapFromJson(json['scoreStartPages']),
      scoreNotes: _stringMapFromJson(json['scoreNotes']),
      scoreDurations: _intMapFromJson(json['scoreDurations']),
      transitionSeconds: _intFromJson(
        json['transitionSeconds'],
        fallback: 0,
      ).clamp(0, 600).toInt(),
      viewerSettingsOverride: _viewerSettingsFromJson(
        json['viewerSettingsOverride'],
      ),
    );
  }

  static List<SheetSetlist> decodeList(String? value) {
    if (value == null || value.trim().isEmpty) {
      return const <SheetSetlist>[];
    }

    try {
      return decodeJsonList(jsonDecode(value));
    } catch (_) {
      return const <SheetSetlist>[];
    }
  }

  static List<SheetSetlist> decodeJsonList(Object? value) {
    final decoded = _jsonList(value);
    final setlists = decoded
        .map(_asJsonMap)
        .whereType<Map<String, Object?>>()
        .map(_tryFromJson)
        .whereType<SheetSetlist>()
        .toList();
    setlists.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    return List<SheetSetlist>.unmodifiable(setlists);
  }

  static String encodeList(List<SheetSetlist> setlists) {
    return jsonEncode(setlists.map((setlist) => setlist.toJson()).toList());
  }

  static SheetSetlist? _tryFromJson(Map<String, Object?> json) {
    try {
      return SheetSetlist.fromJson(json);
    } catch (_) {
      return null;
    }
  }

  final String id;
  final String title;
  final List<String> scoreIds;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool rehearsalMode;
  final Map<String, int> scoreStartPages;
  final Map<String, String> scoreNotes;
  final Map<String, int> scoreDurations;
  final int transitionSeconds;
  final SheetViewerSettings? viewerSettingsOverride;

  int get totalScoreDurationSeconds {
    var total = 0;
    for (final scoreId in scoreIds) {
      total += scoreDurations[scoreId] ?? 0;
    }
    return total;
  }

  int get totalEstimatedSeconds {
    final transitions = scoreIds.length > 1
        ? transitionSeconds * (scoreIds.length - 1)
        : 0;
    return totalScoreDurationSeconds + transitions;
  }

  SheetSetlist copyWith({
    String? title,
    List<String>? scoreIds,
    DateTime? updatedAt,
    bool? rehearsalMode,
    Map<String, int>? scoreStartPages,
    Map<String, String>? scoreNotes,
    Map<String, int>? scoreDurations,
    int? transitionSeconds,
    SheetViewerSettings? viewerSettingsOverride,
    bool clearViewerSettingsOverride = false,
  }) {
    return SheetSetlist(
      id: id,
      title: title ?? this.title,
      scoreIds: scoreIds ?? this.scoreIds,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      rehearsalMode: rehearsalMode ?? this.rehearsalMode,
      scoreStartPages: scoreStartPages ?? this.scoreStartPages,
      scoreNotes: scoreNotes ?? this.scoreNotes,
      scoreDurations: scoreDurations ?? this.scoreDurations,
      transitionSeconds: (transitionSeconds ?? this.transitionSeconds)
          .clamp(0, 600)
          .toInt(),
      viewerSettingsOverride: clearViewerSettingsOverride
          ? null
          : viewerSettingsOverride ?? this.viewerSettingsOverride,
    );
  }

  SheetSetlist removeMissingScores(Set<String> validScoreIds) {
    final cleaned = scoreIds
        .where(validScoreIds.contains)
        .toList(growable: false);
    final cleanedIds = cleaned.toSet();
    final cleanedStartPages = Map<String, int>.unmodifiable(
      Map<String, int>.fromEntries(
        scoreStartPages.entries.where(
          (entry) => cleanedIds.contains(entry.key),
        ),
      ),
    );
    final cleanedNotes = Map<String, String>.unmodifiable(
      Map<String, String>.fromEntries(
        scoreNotes.entries.where((entry) => cleanedIds.contains(entry.key)),
      ),
    );
    final cleanedDurations = Map<String, int>.unmodifiable(
      Map<String, int>.fromEntries(
        scoreDurations.entries.where((entry) => cleanedIds.contains(entry.key)),
      ),
    );
    if (_listEquals(cleaned, scoreIds) &&
        _mapEquals(cleanedStartPages, scoreStartPages) &&
        _mapEquals(cleanedNotes, scoreNotes) &&
        _mapEquals(cleanedDurations, scoreDurations)) {
      return this;
    }
    return copyWith(
      scoreIds: cleaned,
      scoreStartPages: cleanedStartPages,
      scoreNotes: cleanedNotes,
      scoreDurations: cleanedDurations,
      updatedAt: DateTime.now(),
    );
  }

  SheetSetlist appendScore(String scoreId, DateTime updatedAt) {
    if (scoreIds.contains(scoreId)) {
      return this;
    }
    return copyWith(
      scoreIds: <String>[...scoreIds, scoreId],
      updatedAt: updatedAt,
    );
  }

  SheetSetlist removeScore(String scoreId, DateTime updatedAt) {
    return copyWith(
      scoreIds: scoreIds
          .where((candidate) => candidate != scoreId)
          .toList(growable: false),
      updatedAt: updatedAt,
    );
  }

  SheetSetlist moveScore(int fromIndex, int toIndex, DateTime updatedAt) {
    if (fromIndex < 0 ||
        fromIndex >= scoreIds.length ||
        toIndex < 0 ||
        toIndex >= scoreIds.length ||
        fromIndex == toIndex) {
      return this;
    }

    final nextScoreIds = scoreIds.toList();
    final scoreId = nextScoreIds.removeAt(fromIndex);
    nextScoreIds.insert(toIndex, scoreId);
    return copyWith(scoreIds: nextScoreIds, updatedAt: updatedAt);
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': id,
      'title': title,
      'scoreIds': scoreIds,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'rehearsalMode': rehearsalMode,
      'scoreStartPages': scoreStartPages,
      'scoreNotes': scoreNotes,
      'scoreDurations': scoreDurations,
      'transitionSeconds': transitionSeconds,
      if (viewerSettingsOverride != null)
        'viewerSettingsOverride': viewerSettingsOverride!.toJson(),
    };
  }

  static bool _listEquals(List<String> a, List<String> b) {
    if (a.length != b.length) {
      return false;
    }
    for (var index = 0; index < a.length; index++) {
      if (a[index] != b[index]) {
        return false;
      }
    }
    return true;
  }

  static bool _mapEquals<T>(Map<String, T> a, Map<String, T> b) {
    if (a.length != b.length) {
      return false;
    }
    for (final entry in a.entries) {
      if (b[entry.key] != entry.value) {
        return false;
      }
    }
    return true;
  }
}

SheetViewerSettings? _viewerSettingsFromJson(Object? value) {
  final map = _asJsonMap(value);
  return map == null ? null : SheetViewerSettings.fromJson(map);
}

Map<String, Object?>? _asJsonMap(Object? value) {
  if (value is! Map) {
    return null;
  }
  return value.map(
    (key, mapValue) => MapEntry(key.toString(), mapValue as Object?),
  );
}

List<dynamic> _jsonList(Object? value) {
  return value is List ? value : const <dynamic>[];
}

String _stringFromJson(Object? value) {
  return value is String ? value : '';
}

String _titleFromJson(Object? value) {
  final title = _stringFromJson(value).trim();
  return title.isEmpty ? 'Untitled setlist' : title;
}

DateTime _dateFromJson(Object? value, {DateTime? fallback}) {
  if (value is String) {
    final parsed = DateTime.tryParse(value);
    if (parsed != null) {
      return parsed;
    }
  }
  return fallback ?? DateTime.fromMillisecondsSinceEpoch(0);
}

bool _boolFromJson(Object? value, {required bool fallback}) {
  return value is bool ? value : fallback;
}

int _intFromJson(Object? value, {required int fallback}) {
  if (value is num) {
    return value.round();
  }
  return int.tryParse(value?.toString() ?? '') ?? fallback;
}

Map<String, int> _intMapFromJson(Object? value) {
  if (value is! Map) {
    return const <String, int>{};
  }
  final result = <String, int>{};
  for (final entry in value.entries) {
    final key = entry.key.toString().trim();
    final mapValue = _intFromJson(entry.value, fallback: 0);
    if (key.isNotEmpty && mapValue > 0) {
      result[key] = mapValue;
    }
  }
  return Map<String, int>.unmodifiable(result);
}

Map<String, String> _stringMapFromJson(Object? value) {
  if (value is! Map) {
    return const <String, String>{};
  }
  final result = <String, String>{};
  for (final entry in value.entries) {
    final key = entry.key.toString().trim();
    final mapValue = _stringFromJson(entry.value).trim();
    if (key.isNotEmpty && mapValue.isNotEmpty) {
      result[key] = mapValue;
    }
  }
  return Map<String, String>.unmodifiable(result);
}
