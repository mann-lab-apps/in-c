import 'dart:convert';

class SheetScore {
  const SheetScore({
    required this.id,
    required this.title,
    required this.composer,
    required this.tags,
    required this.note,
    required this.filePath,
    required this.importedAt,
    required this.updatedAt,
    required this.lastOpenedAt,
    required this.lastPage,
    required this.isFavorite,
  });

  factory SheetScore.fromJson(Map<String, Object?> json) {
    return SheetScore(
      id: json['id'] as String,
      title: json['title'] as String? ?? 'Untitled score',
      composer: json['composer'] as String? ?? '',
      tags: (json['tags'] as List<dynamic>? ?? const <dynamic>[])
          .whereType<String>()
          .toList(growable: false),
      note: json['note'] as String? ?? '',
      filePath: json['filePath'] as String,
      importedAt: DateTime.parse(json['importedAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      lastOpenedAt: _parseOptionalDate(json['lastOpenedAt']),
      lastPage: json['lastPage'] as int? ?? 1,
      isFavorite: json['isFavorite'] as bool? ?? false,
    );
  }

  static List<SheetScore> decodeList(String? value) {
    if (value == null || value.trim().isEmpty) {
      return const <SheetScore>[];
    }

    final decoded = jsonDecode(value) as List<dynamic>;
    return decoded
        .whereType<Map<String, Object?>>()
        .map(SheetScore.fromJson)
        .toList(growable: false);
  }

  static String encodeList(List<SheetScore> scores) {
    return jsonEncode(scores.map((score) => score.toJson()).toList());
  }

  final String id;
  final String title;
  final String composer;
  final List<String> tags;
  final String note;
  final String filePath;
  final DateTime importedAt;
  final DateTime updatedAt;
  final DateTime? lastOpenedAt;
  final int lastPage;
  final bool isFavorite;

  bool matches(String query) {
    final normalized = query.trim().toLowerCase();
    if (normalized.isEmpty) {
      return true;
    }

    return title.toLowerCase().contains(normalized) ||
        composer.toLowerCase().contains(normalized) ||
        tags.any((tag) => tag.toLowerCase().contains(normalized)) ||
        note.toLowerCase().contains(normalized);
  }

  SheetScore copyWith({
    String? title,
    String? composer,
    List<String>? tags,
    String? note,
    String? filePath,
    DateTime? updatedAt,
    DateTime? lastOpenedAt,
    int? lastPage,
    bool? isFavorite,
  }) {
    return SheetScore(
      id: id,
      title: title ?? this.title,
      composer: composer ?? this.composer,
      tags: tags ?? this.tags,
      note: note ?? this.note,
      filePath: filePath ?? this.filePath,
      importedAt: importedAt,
      updatedAt: updatedAt ?? this.updatedAt,
      lastOpenedAt: lastOpenedAt ?? this.lastOpenedAt,
      lastPage: lastPage ?? this.lastPage,
      isFavorite: isFavorite ?? this.isFavorite,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': id,
      'title': title,
      'composer': composer,
      'tags': tags,
      'note': note,
      'filePath': filePath,
      'importedAt': importedAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'lastOpenedAt': lastOpenedAt?.toIso8601String(),
      'lastPage': lastPage,
      'isFavorite': isFavorite,
    };
  }

  static DateTime? _parseOptionalDate(Object? value) {
    if (value is! String || value.isEmpty) {
      return null;
    }
    return DateTime.tryParse(value);
  }
}
