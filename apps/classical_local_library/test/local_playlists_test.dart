import 'dart:convert';
import 'dart:io';

import 'package:classical_local_library/library_backup.dart';
import 'package:classical_local_library/local_data_control.dart';
import 'package:classical_local_library/local_playlists.dart';
import 'package:classical_local_library/sqlite_database.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  setUpAll(sqfliteFfiInit);

  test('파일 ID와 곡 순서가 재시작과 누락 상태에서도 유지된다', () async {
    final directory = await Directory.systemTemp.createTemp('playlists_test_');
    addTearDown(() => directory.delete(recursive: true));
    final path = '${directory.path}/playlists.sqlite';
    var database = await ClassicalLocalDatabase(
      path: path,
      factory: databaseFactoryFfi,
    ).open();
    final repository = LocalPlaylistRepository(
      SqliteLocalPlaylistStore(database),
      clock: () => DateTime.fromMillisecondsSinceEpoch(100),
      idFactory: () => 'playlist-1',
    );
    final playlist = await repository.create('  좋아하는 곡  ');
    await repository.addFile(playlist.id, 'file-b');
    await repository.addFile(playlist.id, 'file-missing');
    await repository.addFile(playlist.id, 'file-a');
    await repository.addFile(playlist.id, 'file-b');
    await repository.moveFile(playlist.id, 'file-a', -1);
    expect((await repository.load()).single.fileIds, [
      'file-b',
      'file-a',
      'file-missing',
    ]);
    await database.close();

    database = await ClassicalLocalDatabase(
      path: path,
      factory: databaseFactoryFfi,
    ).open();
    addTearDown(database.close);
    final reopened = LocalPlaylistRepository(
      SqliteLocalPlaylistStore(database),
    );
    expect((await reopened.load()).single.name, '좋아하는 곡');
    expect((await reopened.load()).single.fileIds, [
      'file-b',
      'file-a',
      'file-missing',
    ]);
    await reopened.removeFile(playlist.id, 'file-missing');
    expect((await reopened.load()).single.fileIds, ['file-b', 'file-a']);
  });

  test('이름 검증, 동시 추가, 실패 뒤 재시도와 삭제가 안전하다', () async {
    final store = MemoryLocalPlaylistStore();
    var sequence = 0;
    final repository = LocalPlaylistRepository(
      store,
      idFactory: () => 'id-${++sequence}',
    );
    final first = await repository.create('산책');
    expect(
      () => repository.create(' 산책 '),
      throwsA(isA<LocalPlaylistException>()),
    );
    await Future.wait([
      repository.addFile(first.id, 'first'),
      repository.addFile(first.id, 'second'),
    ]);
    expect((await repository.load()).single.fileIds, ['first', 'second']);
    await repository.rename(first.id, '밤');
    await repository.moveFile(first.id, 'second', -1);
    expect((await repository.load()).single.fileIds, ['second', 'first']);
    await repository.delete(first.id);
    expect(await repository.load(), isEmpty);
  });

  test('여러 곡 추가와 드래그 순서 저장은 원자적이고 곡을 잃지 않는다', () async {
    final repository = LocalPlaylistRepository(
      MemoryLocalPlaylistStore(),
      idFactory: () => 'multi',
    );
    final playlist = await repository.create(
      '모음',
      initialFileIds: ['first', 'second', 'first'],
    );
    await repository.addFiles(playlist.id, ['third', 'second', 'fourth']);
    expect((await repository.load()).single.fileIds, [
      'first',
      'second',
      'third',
      'fourth',
    ]);
    await repository.reorderFiles(playlist.id, [
      'fourth',
      'first',
      'second',
      'third',
    ]);
    expect((await repository.load()).single.fileIds.first, 'fourth');
    await expectLater(
      repository.reorderFiles(playlist.id, ['fourth', 'first']),
      throwsA(isA<LocalPlaylistException>()),
    );
    expect((await repository.load()).single.fileIds, [
      'fourth',
      'first',
      'second',
      'third',
    ]);
  });

  test('v14 업그레이드와 논리 백업, 이전 백업, 전체 초기화', () async {
    final directory = await Directory.systemTemp.createTemp('playlist_backup_');
    addTearDown(() => directory.delete(recursive: true));
    final database = await ClassicalLocalDatabase(
      path: '${directory.path}/main.sqlite',
      factory: databaseFactoryFfi,
    ).open();
    addTearDown(database.close);
    await database.delete('schema_migrations');
    await database.insert('schema_migrations', {
      'version': 14,
      'applied_at_millis': 1,
    });
    await database.execute('DROP TABLE local_playlists');
    await const SqliteMigrationRunner().applySchema(database);
    final store = SqliteLocalPlaylistStore(database);
    final repository = LocalPlaylistRepository(
      store,
      idFactory: () => 'playlist-1',
    );
    final item = await repository.create('목록');
    await repository.addFile(item.id, 'later-relink');

    final backup = await LibraryBackupService(database: database).exportJson();
    final second = await ClassicalLocalDatabase(
      path: '${directory.path}/restore.sqlite',
      factory: databaseFactoryFfi,
    ).open();
    addTearDown(second.close);
    await LibraryBackupService(database: second).importJson(backup);
    expect((await SqliteLocalPlaylistStore(second).load()).single.fileIds, [
      'later-relink',
    ]);

    final older = jsonDecode(backup) as Map<String, dynamic>;
    older['storageSchemaVersion'] = 14;
    (older['scope'] as List).remove('local_playlists');
    (older['counts'] as Map).remove('local_playlists');
    (older['data'] as Map).remove('local_playlists');
    final oldBackup = jsonEncode(older);
    final preview = await LibraryBackupService(database: second)
        .previewImport(oldBackup);
    expect(preview.canImport, isTrue);

    await LocalDataControlService(
      database: database,
      managedDirectories: const [],
    ).reset();
    expect(await store.load(), isEmpty);
  });
}
