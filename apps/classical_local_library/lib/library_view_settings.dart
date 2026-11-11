import 'dart:convert';

import 'package:sqflite/sqflite.dart';

enum PlaylistListSort { createdNewest, modifiedNewest, name }

enum PlaylistTrackSort { manual, title, artist, album }

class LibraryViewSettings {
  LibraryViewSettings({
    List<String> order = sections,
    List<String> visible = sections,
    this.playlistSort = PlaylistListSort.createdNewest,
    Map<String, PlaylistTrackSort> trackSorts = const {},
  }) : order = List.unmodifiable(order),
       visible = List.unmodifiable(visible),
       trackSorts = Map.unmodifiable(trackSorts) {
    if (order.length != sections.length ||
        order.toSet().length != sections.length ||
        !order.every(sections.contains) ||
        visible.toSet().length != visible.length ||
        !visible.every(sections.contains) ||
        trackSorts.length > 10000 ||
        trackSorts.keys.any((id) => id.isEmpty || id.length > 200)) {
      throw const FormatException('보관함 표시 설정이 올바르지 않습니다.');
    }
  }
  static const sections = ['songs', 'albums', 'artists', 'playlists'];
  final List<String> order;
  final List<String> visible;
  final PlaylistListSort playlistSort;
  final Map<String, PlaylistTrackSort> trackSorts;

  LibraryViewSettings copyWith({
    List<String>? order,
    List<String>? visible,
    PlaylistListSort? playlistSort,
    Map<String, PlaylistTrackSort>? trackSorts,
  }) => LibraryViewSettings(
    order: order ?? this.order,
    visible: visible ?? this.visible,
    playlistSort: playlistSort ?? this.playlistSort,
    trackSorts: trackSorts ?? this.trackSorts,
  );

  Map<String, Object?> toJson() => {
    'order': order,
    'visible': visible,
    'playlistSort': playlistSort.name,
    'trackSorts': {
      for (final entry in trackSorts.entries) entry.key: entry.value.name,
    },
  };

  factory LibraryViewSettings.fromJson(Map<String, Object?> json) {
    if (json.keys.toSet().difference({
      'order',
      'visible',
      'playlistSort',
      'trackSorts',
    }).isNotEmpty) {
      throw const FormatException('알 수 없는 보관함 설정입니다.');
    }
    return LibraryViewSettings(
      order: (json['order'] as List?)?.cast<String>() ?? sections,
      visible: (json['visible'] as List?)?.cast<String>() ?? sections,
      playlistSort: PlaylistListSort.values.byName(
        json['playlistSort'] as String? ?? 'createdNewest',
      ),
      trackSorts: {
        for (final entry in (json['trackSorts'] as Map? ?? {}).entries)
          entry.key as String: PlaylistTrackSort.values.byName(
            entry.value as String,
          ),
      },
    );
  }
}

abstract interface class LibraryViewSettingsStore {
  Future<LibraryViewSettings> load();
  Future<void> save(LibraryViewSettings settings);
}

class MemoryLibraryViewSettingsStore implements LibraryViewSettingsStore {
  MemoryLibraryViewSettingsStore([LibraryViewSettings? initial])
    : value = initial ?? LibraryViewSettings();
  LibraryViewSettings value;
  @override
  Future<LibraryViewSettings> load() async => value;
  @override
  Future<void> save(LibraryViewSettings settings) async {
    value = settings;
  }
}

class SqliteLibraryViewSettingsStore implements LibraryViewSettingsStore {
  const SqliteLibraryViewSettingsStore(this.database);
  final Database database;
  @override
  Future<LibraryViewSettings> load() async {
    final rows = await database.query(
      'library_view_settings',
      where: 'id = ?',
      whereArgs: [1],
    );
    if (rows.isEmpty) return LibraryViewSettings();
    try {
      return LibraryViewSettings.fromJson(
        (jsonDecode(rows.single['value_json']! as String) as Map)
            .cast<String, Object?>(),
      );
    } on FormatException {
      rethrow;
    } on TypeError {
      throw const FormatException('보관함 표시 설정을 읽지 못했습니다.');
    } on ArgumentError {
      throw const FormatException('보관함 표시 설정을 읽지 못했습니다.');
    }
  }

  @override
  Future<void> save(LibraryViewSettings settings) async {
    await database.insert('library_view_settings', {
      'id': 1,
      'value_json': jsonEncode(settings.toJson()),
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }
}
