import 'dart:async';
import 'dart:io';

import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/local_audio_import.dart';
import 'package:classical_local_library/local_audio_scanner.dart';
import 'package:classical_local_library/local_data_control.dart';
import 'package:classical_local_library/local_favorites.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:classical_local_library/sqlite_database.dart';
import 'package:classical_local_library/sqlite_migration.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  setUpAll(sqfliteFfiInit);

  test(
    'idempotent confirmation replaces an older lastSaved snapshot',
    () async {
      final store = _ControlledStore();
      final repository = LocalFavoritesRepository(store);
      await repository.add('one');
      await store.save({'two'});
      final saves = store.saves;
      await repository.add('two');
      expect(store.saves, saves);
      expect(repository.lastSaved, {'two'});
    },
  );

  test(
    'memory snapshots are immutable and independent of caller sets',
    () async {
      final initial = {'one'};
      final store = MemoryLocalFavoritesStore(initial);
      initial.add('two');
      expect(await store.load(), {'one'});
      final saved = {'three'};
      await store.save(saved);
      saved.clear();
      final loaded = await store.load();
      expect(loaded, {'three'});
      expect(() => loaded.add('four'), throwsUnsupportedError);
    },
  );

  test(
    'duplicate desired-state commands write once and serialize additions',
    () async {
      final store = _ControlledStore();
      final repository = LocalFavoritesRepository(store);
      await Future.wait([
        repository.setFavorite('one', true),
        repository.setFavorite('one', true),
        repository.setFavorite('two', true),
      ]);
      expect(await repository.load(), {'one', 'two'});
      expect(store.saves, 2);
      await Future.wait([
        repository.setFavorite('one', false),
        repository.setFavorite('one', false),
      ]);
      expect(await repository.load(), {'two'});
      expect(repository.lastSaved, {'two'});
      expect(store.saves, 3);
    },
  );

  test('pending saves publish only after success and refresh waits', () async {
    final store = _ControlledStore()..gate = Completer<void>();
    final repository = LocalFavoritesRepository(store);
    final saving = repository.add('one');
    await store.saveStarted.future;
    var refreshed = false;
    final refresh = repository.load().then((value) {
      refreshed = true;
      return value;
    });
    expect(repository.lastSaved, isNull);
    expect(refreshed, isFalse);
    expect(await store.load(), isEmpty);
    store.gate!.complete();
    await saving;
    expect(await refresh, {'one'});
    expect(repository.lastSaved, {'one'});
  });

  test(
    'failed write preserves committed state and queued retry succeeds',
    () async {
      final store = _ControlledStore();
      final repository = LocalFavoritesRepository(store);
      await repository.add('one');
      store.failSave = true;
      final failed = repository.add('two');
      final checked = expectLater(failed, _safeFailure);
      final retry = repository.add('three');
      await checked;
      await retry;
      expect(await repository.load(), {'one', 'three'});
      expect(repository.lastSaved, {'one', 'three'});
      await repository.add('two');
      expect(await repository.load(), {'one', 'two', 'three'});
    },
  );

  test('failed load never writes and later commands recover', () async {
    final store = _ControlledStore();
    final repository = LocalFavoritesRepository(store);
    await repository.add('one');
    store.failLoad = true;
    await expectLater(repository.remove('one'), _safeFailure);
    expect(store.saves, 1);
    expect(repository.lastSaved, {'one'});
    store.failLoad = true;
    await expectLater(repository.load(), _safeFailure);
    await repository.remove('one');
    expect(await repository.load(), isEmpty);
  });

  test('blank IDs fail without changing data or poisoning the queue', () async {
    final repository = LocalFavoritesRepository(MemoryLocalFavoritesStore());
    await expectLater(
      repository.add('  '),
      throwsA(isA<LocalFavoritesException>()),
    );
    await repository.add('file-stable');
    expect(await repository.isFavorite('file-stable'), isTrue);
  });

  group('SQLite integrity', () {
    late Directory temp;
    late Database database;
    late ScannedAudioRepository files;
    late LocalFavoritesRepository favorites;

    setUp(() async {
      temp = await Directory.systemTemp.createTemp('favorites_test_');
      database = await ClassicalLocalDatabase(
        path: '${temp.path}/library.sqlite',
        factory: databaseFactoryFfi,
      ).open();
      files = ScannedAudioRepository(SqliteScannedAudioStore(database));
      favorites = LocalFavoritesRepository(SqliteLocalFavoritesStore(database));
      await files.replaceAll([_file('one'), _file('two')]);
    });
    tearDown(() async {
      if (database.isOpen) await database.close();
      await temp.delete(recursive: true);
    });

    test('favorites persist after reopening SQLite', () async {
      await favorites.add('one');
      await database.close();
      database = await ClassicalLocalDatabase(
        path: '${temp.path}/library.sqlite',
        factory: databaseFactoryFfi,
      ).open();
      final restored = LocalFavoritesRepository(
        SqliteLocalFavoritesStore(database),
      );
      expect(await restored.load(), {'one'});
      await restored.remove('one');
      expect(await restored.load(), isEmpty);
    });

    test(
      'missing state, snapshot saves and relinking preserve stable ID',
      () async {
        await favorites.add('one');
        await files.replaceAll([
          _file('one').copyWith(availability: AudioFileAvailability.missing),
          _file('two'),
        ]);
        expect(await favorites.load(), {'one'});
        await files.replaceAll([
          _file('one').copyWith(path: '/Music/moved.wav'),
          _file('two'),
        ]);
        expect(await favorites.load(), {'one'});
        expect(
          (await files.load()).firstWhere((f) => f.id == 'one').path,
          '/Music/moved.wav',
        );
        expect(await database.rawQuery('PRAGMA foreign_key_check'), isEmpty);
      },
    );

    test(
      'file removal prunes only removed favorites in the same transaction',
      () async {
        await favorites.add('one');
        await favorites.add('two');
        await files.remove('one');
        expect(await favorites.load(), {'two'});
        await files.replaceAll([_file('one'), _file('two')]);
        expect(await favorites.load(), {'two'});
        expect(await database.rawQuery('PRAGMA foreign_key_check'), isEmpty);
      },
    );

    test('stale favorites cannot resurrect removed file references', () async {
      await favorites.add('one');
      await files.remove('one');
      await expectLater(favorites.add('one'), _safeFailure);
      expect(await favorites.load(), isEmpty);
      await favorites.add('two');
      expect(await favorites.load(), {'two'});
    });

    test('failed snapshot replacement rolls back favorite cleanup', () async {
      await favorites.add('one');
      await database.execute('''
CREATE TRIGGER reject_favorite_cleanup BEFORE DELETE ON local_favorites
BEGIN SELECT RAISE(ABORT, 'injected cleanup failure'); END;''');
      await expectLater(files.remove('one'), throwsA(isA<DatabaseException>()));
      expect((await files.load()).map((f) => f.id), contains('one'));
      expect(await favorites.load(), {'one'});
      await database.execute('DROP TRIGGER reject_favorite_cleanup');
      await files.remove('one');
      expect(await favorites.load(), isEmpty);
    });

    test('failed favorite replacement is atomic and retryable', () async {
      await favorites.add('one');
      await database.execute('''
CREATE TRIGGER reject_second_favorite BEFORE INSERT ON local_favorites
WHEN NEW.file_id = 'two'
BEGIN SELECT RAISE(ABORT, 'private native failure'); END;''');
      await expectLater(favorites.add('two'), _safeFailure);
      expect(await favorites.load(), {'one'});
      expect(favorites.lastSaved, {'one'});
      await database.execute('DROP TRIGGER reject_second_favorite');
      await favorites.add('two');
      expect(await favorites.load(), {'one', 'two'});
    });

    for (final interrupted in [false, true]) {
      test(
        'managed deletion clears favorites and preserves original (recovery=$interrupted)',
        () async {
          final original = File('${temp.path}/original.wav');
          await original.writeAsBytes([1, 2, 3, 4]);
          final imports = SqliteLocalAudioImportStore(database);
          final coordinator = LocalAudioImportCoordinator(
            store: imports,
            destination: Directory('${temp.path}/managed'),
            scanner: const _ManagedScanner(),
            scannedAudioRepository: files,
            metadataCandidateRepository: MetadataCandidateRepository(
              SqliteMetadataCandidateStore(database),
            ),
          );
          await coordinator.importFiles([FileSelectedAudioFile(original)]);
          final record = (await imports.load()).single;
          final fileId = record.fileId!;
          await favorites.add(fileId);
          if (interrupted) {
            await database.execute('''
CREATE TRIGGER reject_managed_favorite_cleanup BEFORE DELETE ON local_favorites
BEGIN SELECT RAISE(ABORT, 'injected managed cleanup failure'); END;''');
            await expectLater(
              coordinator.deleteByFileId(fileId),
              throwsA(isA<DatabaseException>()),
            );
            expect(await File(record.localPath).exists(), isFalse);
            expect(await favorites.load(), {fileId});
            expect(
              (await imports.load()).single.status,
              LocalAudioImportStatus.deleting,
            );
            await database.execute(
              'DROP TRIGGER reject_managed_favorite_cleanup',
            );
            await coordinator.recoverManagedImports();
          } else {
            await coordinator.deleteByFileId(fileId);
          }
          expect(await favorites.load(), isEmpty);
          expect(
            (await files.load()).map((f) => f.id),
            isNot(contains(fileId)),
          );
          expect(await imports.load(), isEmpty);
          expect(await File(record.localPath).exists(), isFalse);
          expect(await original.readAsBytes(), [1, 2, 3, 4]);
          expect(await database.rawQuery('PRAGMA foreign_key_check'), isEmpty);
        },
      );
    }

    test(
      'reset clears favorites even when file cleanup needs recovery',
      () async {
        await favorites.add('one');
        final failing = LocalDataControlService(
          database: database,
          managedDirectories: [Directory('${temp.path}/managed')],
          directoryCleaner: (_) async =>
              throw const FileSystemException('injected'),
        );
        await expectLater(
          failing.reset(),
          throwsA(isA<LocalDataResetException>()),
        );
        expect(await favorites.load(), isEmpty);
        expect(await files.load(), isEmpty);
        expect(await database.query('app_reset_state'), hasLength(1));
        final recovered = LocalDataControlService(
          database: database,
          managedDirectories: const [],
        );
        expect(await recovered.recoverPendingReset(), isTrue);
        expect(await favorites.load(), isEmpty);
        expect(await database.rawQuery('PRAGMA foreign_key_check'), isEmpty);
      },
    );
  });

  test(
    'real v17 upgrades additively once preserving all existing rows',
    () async {
      final temp = await Directory.systemTemp.createTemp('favorites_v17_');
      addTearDown(() => temp.delete(recursive: true));
      final path = '${temp.path}/library.sqlite';
      var database = await ClassicalLocalDatabase(
        path: path,
        factory: databaseFactoryFfi,
        schema: const _Version17Schema(),
      ).open();
      await database.insert('scanned_audio_files', {
        'id': 'one',
        'path': '/Music/one.wav',
        'file_name': 'one.wav',
        'format': 'wav',
        'import_status': 'needsReview',
        'source_references_json':
            '[{"kind":"localImport","externalId":"import-one"}]',
      });
      await database.insert('playback_queue_state', {
        'id': 1,
        'track_ids_json': '["one","one"]',
        'current_track_id': 'one',
        'playback_options_json': '{"preserve":"existing-options"}',
        'saved_at_millis': 123,
      });
      final before = <String, List<Map<String, Object?>>>{
        for (final table in const _Version17Schema().tables)
          table.name: await database.query(table.name),
      };
      await database.close();
      database = await ClassicalLocalDatabase(
        path: path,
        factory: databaseFactoryFfi,
      ).open();
      addTearDown(database.close);
      await const SqliteMigrationRunner().applySchema(database);
      expect(
        (await database.query(
          'schema_migrations',
          orderBy: 'version',
        )).map((r) => r['version']),
        [17, 18],
      );
      for (final entry in before.entries) {
        expect(await database.query(entry.key), entry.value, reason: entry.key);
      }
      expect(await SqliteLocalFavoritesStore(database).load(), isEmpty);
      await LocalFavoritesRepository(SqliteLocalFavoritesStore(database))
          .add('one');
      expect(await SqliteLocalFavoritesStore(database).load(), {'one'});
    },
  );
}

final _safeFailure = throwsA(
  isA<LocalFavoritesException>().having(
    (e) => e.toString(),
    'safe message',
    allOf(
      isNot(contains('/Users/')),
      isNot(contains('private native failure')),
    ),
  ),
);

LocalAudioFile _file(String id) => LocalAudioFile(
  id: id,
  path: '/Music/$id.wav',
  fileName: '$id.wav',
  format: 'wav',
  importStatus: AudioImportStatus.needsReview,
);

class _Version17Schema extends SqliteStorageSchema {
  const _Version17Schema();
  @override
  int get version => 17;
  @override
  List<SqliteTableSchema> get tables =>
      super.tables.where((t) => t.name != 'local_favorites').toList();
}

class _ManagedScanner implements AudioFileScanner {
  const _ManagedScanner();

  @override
  Future<List<LocalAudioFile>> scan(String rootPath) async => [
    await for (final entity in Directory(rootPath).list())
      if (entity is File && entity.path.endsWith('.wav'))
        LocalAudioFile(
          id: scannedAudioId(entity.path),
          path: entity.path,
          fileName: fileNameForPath(entity.path),
          format: 'wav',
          sizeBytes: await entity.length(),
          importStatus: AudioImportStatus.needsReview,
        ),
  ];
}

class _ControlledStore extends MemoryLocalFavoritesStore {
  int saves = 0;
  bool failSave = false;
  bool failLoad = false;
  Completer<void>? gate;
  final saveStarted = Completer<void>();

  @override
  Future<Set<String>> load() async {
    if (failLoad) {
      failLoad = false;
      throw StateError('/Users/private/native failure');
    }
    return super.load();
  }

  @override
  Future<void> save(Set<String> fileIds) async {
    saves++;
    if (!saveStarted.isCompleted) saveStarted.complete();
    await gate?.future;
    if (failSave) {
      failSave = false;
      throw StateError('/Users/private/native failure');
    }
    await super.save(fileIds);
  }
}
