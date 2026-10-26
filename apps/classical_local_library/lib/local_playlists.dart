import 'dart:convert';
import 'dart:math';

import 'package:sqflite/sqflite.dart' as sqflite;

class LocalPlaylist {
  LocalPlaylist({
    required this.id,
    required this.name,
    required List<String> fileIds,
    required this.createdAtMillis,
    required this.updatedAtMillis,
  }) : fileIds = List.unmodifiable(fileIds);

  final String id;
  final String name;
  final List<String> fileIds;
  final int createdAtMillis;
  final int updatedAtMillis;

  LocalPlaylist copyWith({
    String? name,
    List<String>? fileIds,
    int? updatedAtMillis,
  }) => LocalPlaylist(
    id: id,
    name: name ?? this.name,
    fileIds: fileIds ?? this.fileIds,
    createdAtMillis: createdAtMillis,
    updatedAtMillis: updatedAtMillis ?? this.updatedAtMillis,
  );
}

abstract class LocalPlaylistStore {
  Future<List<LocalPlaylist>> load();
  Future<void> save(List<LocalPlaylist> playlists);
}

class MemoryLocalPlaylistStore implements LocalPlaylistStore {
  MemoryLocalPlaylistStore([List<LocalPlaylist> initial = const []])
    : _playlists = List.unmodifiable(initial);

  List<LocalPlaylist> _playlists;

  @override
  Future<List<LocalPlaylist>> load() async => _playlists;

  @override
  Future<void> save(List<LocalPlaylist> playlists) async {
    _playlists = List.unmodifiable(playlists);
  }
}

class SqliteLocalPlaylistStore implements LocalPlaylistStore {
  const SqliteLocalPlaylistStore(this.database);

  final sqflite.Database database;

  @override
  Future<List<LocalPlaylist>> load() async {
    final rows = await database.query(
      'local_playlists',
      orderBy: 'created_at_millis ASC, id ASC',
    );
    return List.unmodifiable([
      for (final row in rows)
        LocalPlaylist(
          id: row['id']! as String,
          name: row['name']! as String,
          fileIds: (jsonDecode(row['file_ids_json']! as String) as List)
              .cast<String>(),
          createdAtMillis: row['created_at_millis']! as int,
          updatedAtMillis: row['updated_at_millis']! as int,
        ),
    ]);
  }

  @override
  Future<void> save(List<LocalPlaylist> playlists) async {
    await database.transaction((transaction) async {
      await transaction.delete('local_playlists');
      for (final playlist in playlists) {
        await transaction.insert('local_playlists', {
          'id': playlist.id,
          'name': playlist.name,
          'file_ids_json': jsonEncode(playlist.fileIds),
          'created_at_millis': playlist.createdAtMillis,
          'updated_at_millis': playlist.updatedAtMillis,
        });
      }
    });
  }
}

class LocalPlaylistException implements Exception {
  const LocalPlaylistException(this.message);

  final String message;

  @override
  String toString() => message;
}

class LocalPlaylistRepository {
  LocalPlaylistRepository(
    this.store, {
    DateTime Function()? clock,
    String Function()? idFactory,
  }) : _clock = clock ?? DateTime.now,
       _idFactory = idFactory ?? _randomId;

  final LocalPlaylistStore store;
  final DateTime Function() _clock;
  final String Function() _idFactory;
  Future<void> _pending = Future.value();

  Future<List<LocalPlaylist>> load() => store.load();

  Future<LocalPlaylist> create(
    String name, {
    List<String> initialFileIds = const [],
  }) => _mutate((playlists) {
    final cleaned = _validName(name, playlists);
    final now = _clock().millisecondsSinceEpoch;
    final id = _idFactory();
    if (playlists.any((playlist) => playlist.id == id)) {
      throw const LocalPlaylistException('재생목록 ID가 중복되었습니다. 다시 시도해 주세요.');
    }
    final created = LocalPlaylist(
      id: id,
      name: cleaned,
      fileIds: initialFileIds.toSet().toList(),
      createdAtMillis: now,
      updatedAtMillis: now,
    );
    playlists.add(created);
    return created;
  });

  Future<void> rename(String id, String name) => _mutate((playlists) {
    final index = _indexOf(playlists, id);
    final cleaned = _validName(name, playlists, excludingId: id);
    playlists[index] = playlists[index].copyWith(
      name: cleaned,
      updatedAtMillis: _clock().millisecondsSinceEpoch,
    );
  });

  Future<void> delete(String id) => _mutate((playlists) {
    playlists.removeAt(_indexOf(playlists, id));
  });

  Future<void> addFile(String id, String fileId) => addFiles(id, [fileId]);

  Future<void> addFiles(String id, List<String> fileIds) =>
      _mutate((playlists) {
        final index = _indexOf(playlists, id);
        final playlist = playlists[index];
        final additions = fileIds
            .where(
              (fileId) =>
                  fileId.isNotEmpty && !playlist.fileIds.contains(fileId),
            )
            .toSet()
            .toList();
        if (additions.isEmpty) return;
        playlists[index] = playlist.copyWith(
          fileIds: [...playlist.fileIds, ...additions],
          updatedAtMillis: _clock().millisecondsSinceEpoch,
        );
      });

  Future<void> reorderFiles(String id, List<String> fileIds) =>
      _mutate((playlists) {
        final index = _indexOf(playlists, id);
        final current = playlists[index];
        if (fileIds.length != current.fileIds.length ||
            fileIds.toSet().length != fileIds.length ||
            !current.fileIds.toSet().containsAll(fileIds)) {
          throw const LocalPlaylistException('재생목록의 곡 순서를 다시 확인해 주세요.');
        }
        playlists[index] = current.copyWith(
          fileIds: fileIds,
          updatedAtMillis: _clock().millisecondsSinceEpoch,
        );
      });

  Future<void> removeFile(String id, String fileId) => _mutate((playlists) {
    final index = _indexOf(playlists, id);
    final playlist = playlists[index];
    if (!playlist.fileIds.contains(fileId)) return;
    playlists[index] = playlist.copyWith(
      fileIds: playlist.fileIds.where((item) => item != fileId).toList(),
      updatedAtMillis: _clock().millisecondsSinceEpoch,
    );
  });

  Future<void> moveFile(String id, String fileId, int offset) =>
      _mutate((playlists) {
        if (offset != -1 && offset != 1) {
          throw const LocalPlaylistException('곡 이동 방향이 올바르지 않습니다.');
        }
        final index = _indexOf(playlists, id);
        final playlist = playlists[index];
        final from = playlist.fileIds.indexOf(fileId);
        if (from < 0) {
          throw const LocalPlaylistException('재생목록에 곡이 없습니다.');
        }
        final to = from + offset;
        if (to < 0 || to >= playlist.fileIds.length) return;
        final ids = [...playlist.fileIds];
        ids.removeAt(from);
        ids.insert(to, fileId);
        playlists[index] = playlist.copyWith(
          fileIds: ids,
          updatedAtMillis: _clock().millisecondsSinceEpoch,
        );
      });

  Future<T> _mutate<T>(T Function(List<LocalPlaylist>) action) {
    final result = _pending.then((_) async {
      final playlists = [...await store.load()];
      final value = action(playlists);
      await store.save(playlists);
      return value;
    });
    _pending = result.then<void>((_) {}, onError: (Object _, StackTrace _) {});
    return result;
  }

  static int _indexOf(List<LocalPlaylist> playlists, String id) {
    final index = playlists.indexWhere((playlist) => playlist.id == id);
    if (index < 0) throw const LocalPlaylistException('재생목록을 찾을 수 없습니다.');
    return index;
  }

  static String _validName(
    String name,
    List<LocalPlaylist> playlists, {
    String? excludingId,
  }) {
    final cleaned = name.trim();
    if (cleaned.isEmpty || cleaned.length > 80) {
      throw const LocalPlaylistException('이름을 1~80자로 입력해 주세요.');
    }
    if (playlists.any(
      (playlist) =>
          playlist.id != excludingId &&
          playlist.name.toLowerCase() == cleaned.toLowerCase(),
    )) {
      throw const LocalPlaylistException('같은 이름의 재생목록이 이미 있습니다.');
    }
    return cleaned;
  }

  static String _randomId() {
    final random = Random.secure();
    return 'playlist-${List.generate(16, (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0')).join()}';
  }
}
