import 'dart:convert';

import 'sheet_score.dart';

enum SheetLibrarySortMode {
  recent,
  title,
  composer,
  rating,
  imported;

  static SheetLibrarySortMode fromName(String? name) {
    return SheetLibrarySortMode.values.firstWhere(
      (mode) => mode.name == name,
      orElse: () => SheetLibrarySortMode.recent,
    );
  }
}

class SheetLibraryViewSettings {
  const SheetLibraryViewSettings({
    required this.sortMode,
    required this.favoriteOnly,
    required this.tagQuery,
    required this.collectionQuery,
    required this.groupQuery,
    required this.minimumRating,
  });

  factory SheetLibraryViewSettings.fromJson(Map<String, Object?>? json) {
    final favoriteOnlyValue = json?['favoriteOnly'];
    return SheetLibraryViewSettings(
      sortMode: SheetLibrarySortMode.fromName(
        _stringFromJson(json?['sortMode']),
      ),
      favoriteOnly: favoriteOnlyValue is bool ? favoriteOnlyValue : false,
      tagQuery: _stringFromJson(json?['tagQuery']).trim(),
      collectionQuery: _stringFromJson(json?['collectionQuery']).trim(),
      groupQuery: _stringFromJson(json?['groupQuery']).trim(),
      minimumRating: SheetScore.normalizeRating(json?['minimumRating']),
    );
  }

  static const defaultSettings = SheetLibraryViewSettings(
    sortMode: SheetLibrarySortMode.recent,
    favoriteOnly: false,
    tagQuery: '',
    collectionQuery: '',
    groupQuery: '',
    minimumRating: 0,
  );

  final SheetLibrarySortMode sortMode;
  final bool favoriteOnly;
  final String tagQuery;
  final String collectionQuery;
  final String groupQuery;
  final int minimumRating;

  SheetLibraryViewSettings copyWith({
    SheetLibrarySortMode? sortMode,
    bool? favoriteOnly,
    String? tagQuery,
    String? collectionQuery,
    String? groupQuery,
    int? minimumRating,
  }) {
    return SheetLibraryViewSettings(
      sortMode: sortMode ?? this.sortMode,
      favoriteOnly: favoriteOnly ?? this.favoriteOnly,
      tagQuery: tagQuery?.trim() ?? this.tagQuery,
      collectionQuery: collectionQuery?.trim() ?? this.collectionQuery,
      groupQuery: groupQuery?.trim() ?? this.groupQuery,
      minimumRating: SheetScore.normalizeRating(
        minimumRating ?? this.minimumRating,
      ),
    );
  }

  bool get hasTagFilter => tagQuery.trim().isNotEmpty;

  bool get hasCollectionFilter => collectionQuery.trim().isNotEmpty;

  bool get hasGroupFilter => groupQuery.trim().isNotEmpty;

  bool get hasRatingFilter => minimumRating > 0;

  bool get hasAnyFilter =>
      favoriteOnly ||
      hasTagFilter ||
      hasCollectionFilter ||
      hasGroupFilter ||
      hasRatingFilter;

  bool matches(SheetScore score) {
    if (favoriteOnly && !score.isFavorite) {
      return false;
    }
    if (hasTagFilter) {
      final normalizedTagQuery = tagQuery.trim().toLowerCase();
      final hasTag = score.tags.any(
        (tag) => tag.trim().toLowerCase() == normalizedTagQuery,
      );
      if (!hasTag) {
        return false;
      }
    }
    if (hasCollectionFilter &&
        score.collection.trim().toLowerCase() !=
            collectionQuery.trim().toLowerCase()) {
      return false;
    }
    if (hasGroupFilter &&
        score.group.trim().toLowerCase() != groupQuery.trim().toLowerCase()) {
      return false;
    }
    if (hasRatingFilter && score.rating < minimumRating) {
      return false;
    }
    return true;
  }

  List<SheetScore> apply(List<SheetScore> scores, {required String query}) {
    final filtered = scores
        .where((score) => score.matches(query))
        .where(matches)
        .toList(growable: false);
    return sortScores(filtered, sortMode);
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'sortMode': sortMode.name,
      'favoriteOnly': favoriteOnly,
      'tagQuery': tagQuery.trim(),
      'collectionQuery': collectionQuery.trim(),
      'groupQuery': groupQuery.trim(),
      'minimumRating': SheetScore.normalizeRating(minimumRating),
    };
  }
}

List<SheetScore> sortScores(
  List<SheetScore> scores,
  SheetLibrarySortMode sortMode,
) {
  final sorted = scores.toList();
  sorted.sort((a, b) {
    return switch (sortMode) {
      SheetLibrarySortMode.recent => _compareRecent(a, b),
      SheetLibrarySortMode.title => _compareText(a.title, b.title),
      SheetLibrarySortMode.composer => _compareText(
        a.composer,
        b.composer,
      ).nonZeroOr(_compareText(a.title, b.title)),
      SheetLibrarySortMode.rating =>
        b.rating.compareTo(a.rating).nonZeroOr(_compareRecent(a, b)),
      SheetLibrarySortMode.imported => b.importedAt.compareTo(a.importedAt),
    };
  });
  return sorted;
}

class SheetLibraryViewSettingsCodec {
  const SheetLibraryViewSettingsCodec._();

  static SheetLibraryViewSettings decode(String? value) {
    if (value == null || value.trim().isEmpty) {
      return SheetLibraryViewSettings.defaultSettings;
    }

    try {
      final decoded = jsonDecode(value);
      if (decoded is! Map) {
        return SheetLibraryViewSettings.defaultSettings;
      }
      return SheetLibraryViewSettings.fromJson(
        decoded.map(
          (key, mapValue) => MapEntry(key.toString(), mapValue as Object?),
        ),
      );
    } catch (_) {
      return SheetLibraryViewSettings.defaultSettings;
    }
  }

  static String encode(SheetLibraryViewSettings settings) {
    return jsonEncode(settings.toJson());
  }
}

String _stringFromJson(Object? value) {
  return value is String ? value : '';
}

int _compareRecent(SheetScore a, SheetScore b) {
  final aDate = a.lastOpenedAt ?? a.importedAt;
  final bDate = b.lastOpenedAt ?? b.importedAt;
  return bDate.compareTo(aDate).nonZeroOr(_compareText(a.title, b.title));
}

int _compareText(String a, String b) {
  final normalizedA = a.trim().toLowerCase();
  final normalizedB = b.trim().toLowerCase();
  if (normalizedA.isEmpty && normalizedB.isEmpty) {
    return 0;
  }
  if (normalizedA.isEmpty) {
    return 1;
  }
  if (normalizedB.isEmpty) {
    return -1;
  }
  return normalizedA.compareTo(normalizedB);
}

extension on int {
  int nonZeroOr(int fallback) {
    return this == 0 ? fallback : this;
  }
}
