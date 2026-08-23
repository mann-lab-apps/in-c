import 'dart:convert';

import 'sheet_score.dart';

enum SheetLibrarySortMode {
  recent,
  title,
  composer,
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
  });

  factory SheetLibraryViewSettings.fromJson(Map<String, Object?>? json) {
    return SheetLibraryViewSettings(
      sortMode: SheetLibrarySortMode.fromName(json?['sortMode'] as String?),
      favoriteOnly: json?['favoriteOnly'] as bool? ?? false,
      tagQuery: (json?['tagQuery'] as String? ?? '').trim(),
    );
  }

  static const defaultSettings = SheetLibraryViewSettings(
    sortMode: SheetLibrarySortMode.recent,
    favoriteOnly: false,
    tagQuery: '',
  );

  final SheetLibrarySortMode sortMode;
  final bool favoriteOnly;
  final String tagQuery;

  SheetLibraryViewSettings copyWith({
    SheetLibrarySortMode? sortMode,
    bool? favoriteOnly,
    String? tagQuery,
  }) {
    return SheetLibraryViewSettings(
      sortMode: sortMode ?? this.sortMode,
      favoriteOnly: favoriteOnly ?? this.favoriteOnly,
      tagQuery: tagQuery?.trim() ?? this.tagQuery,
    );
  }

  bool get hasTagFilter => tagQuery.trim().isNotEmpty;

  bool get hasAnyFilter => favoriteOnly || hasTagFilter;

  bool matches(SheetScore score) {
    if (favoriteOnly && !score.isFavorite) {
      return false;
    }
    if (!hasTagFilter) {
      return true;
    }
    final normalizedTagQuery = tagQuery.toLowerCase();
    return score.tags.any((tag) => tag.toLowerCase() == normalizedTagQuery);
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
      'tagQuery': tagQuery,
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

    final decoded = jsonDecode(value);
    if (decoded is! Map) {
      return SheetLibraryViewSettings.defaultSettings;
    }
    return SheetLibraryViewSettings.fromJson(
      decoded.map(
        (key, mapValue) => MapEntry(key.toString(), mapValue as Object?),
      ),
    );
  }

  static String encode(SheetLibraryViewSettings settings) {
    return jsonEncode(settings.toJson());
  }
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
