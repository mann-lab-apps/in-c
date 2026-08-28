import 'dart:convert';

class SheetLibraryProfile {
  const SheetLibraryProfile({
    required this.id,
    required this.name,
    required this.createdAt,
    required this.updatedAt,
  });

  factory SheetLibraryProfile.fromJson(Map<String, Object?> json) {
    final id = _stringFromJson(json['id']).trim();
    final name = _normalizeName(json['name']);
    final createdAt = _dateFromJson(json['createdAt']);
    return SheetLibraryProfile(
      id: id.isEmpty ? defaultId : id,
      name: name.isEmpty ? defaultName : name,
      createdAt: createdAt,
      updatedAt: _dateFromJson(json['updatedAt'], fallback: createdAt),
    );
  }

  static final defaultProfile = SheetLibraryProfile(
    id: defaultId,
    name: defaultName,
    createdAt: DateTime.fromMillisecondsSinceEpoch(0),
    updatedAt: DateTime.fromMillisecondsSinceEpoch(0),
  );

  static const defaultId = 'default';
  static const defaultName = '기본 라이브러리';

  final String id;
  final String name;
  final DateTime createdAt;
  final DateTime updatedAt;

  bool get isDefault => id == defaultId;

  SheetLibraryProfile copyWith({String? name, DateTime? updatedAt}) {
    final nextName = name == null ? this.name : _normalizeName(name);
    return SheetLibraryProfile(
      id: id,
      name: nextName.isEmpty ? this.name : nextName,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': id,
      'name': name,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  static List<SheetLibraryProfile> decodeList(String? value) {
    if (value == null || value.trim().isEmpty) {
      return <SheetLibraryProfile>[defaultProfile];
    }
    try {
      final decoded = jsonDecode(value);
      if (decoded is! List) {
        return <SheetLibraryProfile>[defaultProfile];
      }
      return normalizeProfiles(
        decoded
            .whereType<Map>()
            .map(
              (json) => SheetLibraryProfile.fromJson(
                json.map(
                  (key, value) => MapEntry(key.toString(), value as Object?),
                ),
              ),
            )
            .toList(growable: false),
      );
    } catch (_) {
      return <SheetLibraryProfile>[defaultProfile];
    }
  }

  static String encodeList(List<SheetLibraryProfile> profiles) {
    return jsonEncode(
      normalizeProfiles(profiles).map((profile) => profile.toJson()).toList(),
    );
  }

  static List<SheetLibraryProfile> normalizeProfiles(
    List<SheetLibraryProfile> profiles,
  ) {
    final byId = <String, SheetLibraryProfile>{
      defaultProfile.id: defaultProfile,
    };
    for (final profile in profiles) {
      final id = profile.id.trim();
      final name = _normalizeName(profile.name);
      if (id.isEmpty || name.isEmpty) {
        continue;
      }
      if (id == defaultId) {
        continue;
      }
      byId[id] = profile.copyWith(name: name);
    }
    final normalized = byId.values.toList(growable: false);
    normalized.sort((a, b) {
      if (a.isDefault) {
        return -1;
      }
      if (b.isDefault) {
        return 1;
      }
      return a.name.toLowerCase().compareTo(b.name.toLowerCase());
    });
    return List<SheetLibraryProfile>.unmodifiable(normalized);
  }
}

class SheetLibraryProfileCodec {
  const SheetLibraryProfileCodec._();

  static List<SheetLibraryProfile> decode(String? value) {
    return SheetLibraryProfile.decodeList(value);
  }

  static String encode(List<SheetLibraryProfile> profiles) {
    return SheetLibraryProfile.encodeList(profiles);
  }
}

String _normalizeName(Object? value) {
  return _stringFromJson(value).trim();
}

String _stringFromJson(Object? value) {
  return value is String ? value : '';
}

DateTime _dateFromJson(Object? value, {DateTime? fallback}) {
  final parsed = DateTime.tryParse(_stringFromJson(value));
  return parsed ?? fallback ?? DateTime.fromMillisecondsSinceEpoch(0);
}
