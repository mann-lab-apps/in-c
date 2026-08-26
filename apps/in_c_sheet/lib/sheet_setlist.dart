import 'dart:convert';

class SheetSetlist {
  const SheetSetlist({
    required this.id,
    required this.title,
    required this.scoreIds,
    required this.createdAt,
    required this.updatedAt,
  });

  factory SheetSetlist.fromJson(Map<String, Object?> json) {
    return SheetSetlist(
      id: json['id'] as String,
      title: json['title'] as String? ?? 'Untitled setlist',
      scoreIds: (json['scoreIds'] as List<dynamic>? ?? const <dynamic>[])
          .whereType<String>()
          .toList(growable: false),
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  static List<SheetSetlist> decodeList(String? value) {
    if (value == null || value.trim().isEmpty) {
      return const <SheetSetlist>[];
    }

    return decodeJsonList(jsonDecode(value));
  }

  static List<SheetSetlist> decodeJsonList(Object? value) {
    final decoded = value as List<dynamic>? ?? const <dynamic>[];
    final setlists = decoded
        .whereType<Map<String, Object?>>()
        .map(SheetSetlist.fromJson)
        .toList();
    setlists.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    return List<SheetSetlist>.unmodifiable(setlists);
  }

  static String encodeList(List<SheetSetlist> setlists) {
    return jsonEncode(setlists.map((setlist) => setlist.toJson()).toList());
  }

  final String id;
  final String title;
  final List<String> scoreIds;
  final DateTime createdAt;
  final DateTime updatedAt;

  SheetSetlist copyWith({
    String? title,
    List<String>? scoreIds,
    DateTime? updatedAt,
  }) {
    return SheetSetlist(
      id: id,
      title: title ?? this.title,
      scoreIds: scoreIds ?? this.scoreIds,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  SheetSetlist removeMissingScores(Set<String> validScoreIds) {
    final cleaned = scoreIds
        .where(validScoreIds.contains)
        .toList(growable: false);
    if (_listEquals(cleaned, scoreIds)) {
      return this;
    }
    return copyWith(scoreIds: cleaned, updatedAt: DateTime.now());
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
}
