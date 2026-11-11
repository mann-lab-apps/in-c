import 'package:sqflite/sqflite.dart' as sqflite;

/// Favorites identify library records, including temporarily missing files.
abstract class LocalFavoritesStore {
  Future<Set<String>> load();
  Future<void> save(Set<String> fileIds);
}

class MemoryLocalFavoritesStore implements LocalFavoritesStore {
  MemoryLocalFavoritesStore([Set<String> initial = const {}])
    : _fileIds = Set.unmodifiable(initial);

  Set<String> _fileIds;

  @override
  Future<Set<String>> load() async => _fileIds;

  @override
  Future<void> save(Set<String> fileIds) async {
    _validateFileIds(fileIds);
    _fileIds = Set.unmodifiable(fileIds);
  }
}

class SqliteLocalFavoritesStore implements LocalFavoritesStore {
  const SqliteLocalFavoritesStore(this.database);

  final sqflite.Database database;

  @override
  Future<Set<String>> load() async => Set.unmodifiable({
    for (final row in await database.query(
      'local_favorites',
      orderBy: 'file_id ASC',
    ))
      row['file_id']! as String,
  });

  @override
  Future<void> save(Set<String> fileIds) async {
    _validateFileIds(fileIds);
    // Snapshot caller-owned collections before the first await.
    final snapshot = Set<String>.of(fileIds);
    await database.transaction((transaction) async {
      await transaction.delete('local_favorites');
      for (final fileId in snapshot) {
        await transaction.insert('local_favorites', {'file_id': fileId});
      }
      // Reject stale references inside the action so sqflite rolls back before
      // COMMIT; deferred-constraint COMMIT failures can leave a transaction open.
      final orphan = await transaction.rawQuery('''
SELECT file_id FROM local_favorites
WHERE NOT EXISTS (
  SELECT 1 FROM scanned_audio_files WHERE id = local_favorites.file_id
) LIMIT 1;''');
      if (orphan.isNotEmpty) {
        throw const LocalFavoritesException('즐겨찾기할 곡을 다시 확인해 주세요.');
      }
    });
  }
}

class LocalFavoritesException implements Exception {
  const LocalFavoritesException(this.message);

  final String message;

  @override
  String toString() => message;
}

class LocalFavoritesRepository {
  LocalFavoritesRepository(this.store);

  final LocalFavoritesStore store;
  Future<void> _pending = Future.value();
  Set<String>? _lastSaved;

  /// Last successful mutation; a failed save never publishes its draft.
  Set<String>? get lastSaved => _lastSaved;

  /// Wait for earlier mutations so a refresh cannot publish stale state.
  Future<Set<String>> load() => _pending.then((_) => _load());

  Future<Set<String>> _load() async {
    try {
      return Set.unmodifiable(await store.load());
    } catch (_) {
      throw const LocalFavoritesException('즐겨찾기를 불러오지 못했습니다. 다시 시도해 주세요.');
    }
  }

  Future<bool> isFavorite(String fileId) async =>
      (await load()).contains(fileId);

  Future<void> add(String fileId) => setFavorite(fileId, true);

  Future<void> remove(String fileId) => setFavorite(fileId, false);

  /// Explicit desired state makes duplicate commands idempotent.
  Future<void> setFavorite(String fileId, bool favorite) {
    final result = _pending.then<void>((_) async {
      _validateFileIds({fileId});
      final current = await _load();
      if (current.contains(fileId) == favorite) {
        _lastSaved = Set.unmodifiable(current);
        return;
      }
      final draft = Set<String>.of(current);
      if (favorite) {
        draft.add(fileId);
      } else {
        draft.remove(fileId);
      }
      try {
        await store.save(draft);
      } catch (_) {
        throw const LocalFavoritesException('즐겨찾기를 저장하지 못했습니다. 다시 시도해 주세요.');
      }
      _lastSaved = Set.unmodifiable(draft);
    });
    // A failed command must not poison later retries or queued commands.
    _pending = result.then<void>((_) {}, onError: (Object _, StackTrace _) {});
    return result;
  }
}

void _validateFileIds(Set<String> fileIds) {
  if (fileIds.any((id) => id.trim().isEmpty)) {
    throw const LocalFavoritesException('즐겨찾기할 곡을 다시 확인해 주세요.');
  }
}
