import 'dart:convert';
import 'dart:io';

import 'package:classical_local_library/library_backup.dart';
import 'package:classical_local_library/local_favorites.dart';
import 'package:classical_local_library/sqlite_database.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  setUpAll(sqfliteFfiInit);
  late Directory temp;
  late Database source;
  late Database target;
  late String backup;

  setUp(() async {
    temp = await Directory.systemTemp.createTemp('favorites_backup_');
    Future<Database> open(String name) => ClassicalLocalDatabase(
      path: '${temp.path}/$name.sqlite',
      factory: databaseFactoryFfi,
    ).open();
    source = await open('source');
    target = await open('target');
    await source.insert('scanned_audio_files', {
      'id': 'stable-file',
      'path': '/Users/private/managed/one.wav',
      'file_name': 'one.wav',
      'format': 'wav',
      'import_status': 'needsReview',
      'source_references_json': jsonEncode([
        {
          'kind': 'imslp',
          'externalId': 'imslp-resource-one',
          'url': 'https://imslp.org/wiki/Example',
          'attribution': 'Original attribution',
        },
      ]),
    });
    await LocalFavoritesRepository(SqliteLocalFavoritesStore(source))
        .add('stable-file');
    backup = await LibraryBackupService(database: source).exportJson();
  });

  tearDown(() async {
    await source.close();
    await target.close();
    await temp.delete(recursive: true);
  });

  test('logical backup restores favorites, missing state and source provenance idempotently', () async {
    final document = jsonDecode(backup) as Map<String, dynamic>;
    expect(document['storageSchemaVersion'], 18);
    expect(document['counts']['local_favorites'], 1);
    expect(document['data']['local_favorites'], [
      {'file_id': 'stable-file'},
    ]);
    expect(backup, isNot(contains('/Users/private')));
    final service = LibraryBackupService(database: target);
    final preview = await service.previewImport(backup);
    expect(preview.tableCounts['local_favorites'], 1);
    await service.importJson(backup);
    expect(await SqliteLocalFavoritesStore(target).load(), {'stable-file'});
    final restored = (await target.query('scanned_audio_files')).single;
    final original = (await source.query('scanned_audio_files')).single;
    expect(restored['availability'], 'missing');
    expect(
      restored['source_references_json'],
      original['source_references_json'],
    );
    expect(restored['id'], original['id']);
    final repeat = await service.importJson(backup);
    expect(repeat.added, 0);
    expect(repeat.skipped, preview.added);
    expect(await target.rawQuery('PRAGMA foreign_key_check'), isEmpty);
  });

  for (final version in [14, 15, 16, 17]) {
    test('v$version backup without favorites imports an empty set', () async {
      final document = jsonDecode(backup) as Map<String, dynamic>;
      document['storageSchemaVersion'] = version;
      final removed = [
        'local_favorites',
        if (version < 15) 'local_playlists',
        if (version < 16) ...['library_view_settings', 'library_artwork'],
      ];
      for (final table in removed) {
        (document['scope'] as List).remove(table);
        (document['counts'] as Map).remove(table);
        (document['data'] as Map).remove(table);
      }
      final oldBackup = jsonEncode(document);
      final service = LibraryBackupService(database: target);
      expect(
        (await service.previewImport(oldBackup)).tableCounts['local_favorites'],
        0,
      );
      await service.importJson(oldBackup);
      expect(await SqliteLocalFavoritesStore(target).load(), isEmpty);
      // Import is additive: an old backup must not clear current favorites.
      await LocalFavoritesRepository(SqliteLocalFavoritesStore(target))
          .add('stable-file');
      await service.importJson(oldBackup);
      expect(await SqliteLocalFavoritesStore(target).load(), {'stable-file'});
    });
  }

  for (final kind in [
    'orphan',
    'duplicate',
    'blank',
    'integer',
    'missing table',
  ]) {
    test(
      'invalid favorite $kind is rejected before any import writes',
      () async {
        final document = jsonDecode(backup) as Map<String, dynamic>;
        final rows = document['data']['local_favorites'] as List;
        switch (kind) {
          case 'orphan':
            rows[0]['file_id'] = 'unknown-file';
          case 'duplicate':
            rows.add({'file_id': 'stable-file'});
          case 'blank':
            rows[0]['file_id'] = '  ';
          case 'integer':
            rows[0]['file_id'] = 1;
          case 'missing table':
            (document['scope'] as List).remove('local_favorites');
            (document['data'] as Map).remove('local_favorites');
            (document['counts'] as Map).remove('local_favorites');
        }
        if (kind != 'missing table') {
          document['counts']['local_favorites'] = rows.length;
        }
        final invalid = jsonEncode(document);
        final service = LibraryBackupService(database: target);
        await expectLater(
          service.previewImport(invalid),
          throwsA(isA<LibraryBackupException>()),
        );
        await expectLater(
          service.importJson(invalid),
          throwsA(isA<LibraryBackupException>()),
        );
        expect(await target.query('scanned_audio_files'), isEmpty);
        expect(await target.query('local_favorites'), isEmpty);
      },
    );
  }

  test(
    'failed backup commit rolls back favorites and associated files',
    () async {
      final failing = LibraryBackupService(
        database: target,
        beforeCommit: () async => throw StateError('injected'),
      );
      await expectLater(failing.importJson(backup), throwsStateError);
      expect(await target.query('scanned_audio_files'), isEmpty);
      expect(await target.query('local_favorites'), isEmpty);
      await LibraryBackupService(database: target).importJson(backup);
      expect(await SqliteLocalFavoritesStore(target).load(), {'stable-file'});
    },
  );
}
