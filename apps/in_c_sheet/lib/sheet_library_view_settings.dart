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

class SheetPerformancePresetTemplate {
  const SheetPerformancePresetTemplate({
    required this.id,
    required this.name,
    required this.viewerSettings,
    this.deviceProfile = '',
  });

  factory SheetPerformancePresetTemplate.fromJson(Map<String, Object?> json) {
    final id = _stringFromJson(json['id']).trim();
    final name = _stringFromJson(json['name']).trim();
    final deviceProfile = _stringFromJson(json['deviceProfile']).trim();
    return SheetPerformancePresetTemplate(
      id: id.isEmpty ? _fallbackTemplateId(name, deviceProfile) : id,
      name: name.isEmpty ? defaultName : name,
      viewerSettings: SheetViewerSettings.fromJson(
        _jsonMapFromObject(json['viewerSettings']),
      ),
      deviceProfile: deviceProfile,
    );
  }

  static const defaultName = '공연 preset';

  final String id;
  final String name;
  final SheetViewerSettings viewerSettings;
  final String deviceProfile;

  SheetPerformancePresetTemplate copyWith({
    String? id,
    String? name,
    SheetViewerSettings? viewerSettings,
    String? deviceProfile,
  }) {
    return SheetPerformancePresetTemplate(
      id: id?.trim().isNotEmpty == true ? id!.trim() : this.id,
      name: name?.trim().isNotEmpty == true ? name!.trim() : this.name,
      viewerSettings: viewerSettings ?? this.viewerSettings,
      deviceProfile: deviceProfile?.trim() ?? this.deviceProfile,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': id,
      'name': name.trim(),
      'viewerSettings': viewerSettings.toJson(),
      if (deviceProfile.trim().isNotEmpty)
        'deviceProfile': deviceProfile.trim(),
    };
  }

  static List<SheetPerformancePresetTemplate> normalizeList(
    List<SheetPerformancePresetTemplate> templates,
  ) {
    final byId = <String, SheetPerformancePresetTemplate>{};
    for (final template in templates) {
      final id = template.id.trim();
      if (id.isEmpty) {
        continue;
      }
      byId[id] = template.copyWith(id: id);
    }
    final normalized = byId.values.toList(growable: false);
    normalized.sort(
      (a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()),
    );
    return List<SheetPerformancePresetTemplate>.unmodifiable(normalized);
  }

  static List<SheetPerformancePresetTemplate> decodeJsonList(Object? value) {
    if (value is! List) {
      return const <SheetPerformancePresetTemplate>[];
    }
    final templates = <SheetPerformancePresetTemplate>[];
    for (final item in value) {
      final json = _jsonMapFromObject(item);
      if (json == null) {
        continue;
      }
      final template = SheetPerformancePresetTemplate.fromJson(json);
      if (template.id.trim().isNotEmpty) {
        templates.add(template);
      }
    }
    return normalizeList(templates);
  }
}

class SheetPerformancePresetTemplateCodec {
  const SheetPerformancePresetTemplateCodec._();

  static List<SheetPerformancePresetTemplate> decode(String? value) {
    if (value == null || value.trim().isEmpty) {
      return const <SheetPerformancePresetTemplate>[];
    }

    try {
      final decoded = jsonDecode(value);
      return SheetPerformancePresetTemplate.decodeJsonList(decoded);
    } catch (_) {
      return const <SheetPerformancePresetTemplate>[];
    }
  }

  static String encode(List<SheetPerformancePresetTemplate> templates) {
    return jsonEncode(
      SheetPerformancePresetTemplate.normalizeList(templates)
          .map((template) => template.toJson())
          .toList(growable: false),
    );
  }
}

String _stringFromJson(Object? value) {
  return value is String ? value : '';
}

Map<String, Object?>? _jsonMapFromObject(Object? value) {
  if (value is! Map) {
    return null;
  }
  return value.map(
    (key, mapValue) => MapEntry(key.toString(), mapValue as Object?),
  );
}

String _fallbackTemplateId(String name, String deviceProfile) {
  final source = '${name.trim()} ${deviceProfile.trim()}'.trim().toLowerCase();
  final slug = source
      .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
      .replaceAll(RegExp(r'^-+|-+$'), '');
  return slug.isEmpty ? 'performance-preset' : 'performance-preset-$slug';
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
