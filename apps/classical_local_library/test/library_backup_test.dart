import 'dart:convert';
import 'dart:io';

import 'package:classical_local_library/library_backup.dart';
import 'package:classical_local_library/library_deduplication.dart';
import 'package:classical_local_library/sqlite_database.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  late Directory directory;
  Future<Database> openDatabase(String name) => ClassicalLocalDatabase(
    path: '${directory.path}/$name.sqlite',
    factory: databaseFactoryFfi,
  ).open();

  setUpAll(sqfliteFfiInit);
  setUp(() async {
    directory = await Directory.systemTemp.createTemp('library_backup_test_');
  });

  test('백업 scalar 타입과 enum 손상은 preview/import 이전에 거부된다', () async {
    final source = await openDatabase('scalar-source');
    final target = await openDatabase('scalar-target');
    addTearDown(source.close);
    addTearDown(target.close);
    await _seed(source);
    final valid = jsonDecode(
      await LibraryBackupService(database: source).exportJson(),
    ) as Map<String, Object?>;
    final service = LibraryBackupService(database: target);
    for (final mutation in <(String, String, Object?)>[
      ('catalog_people', 'birth_year', 'unknown'),
      ('catalog_works', 'composer_id', true),
      ('scanned_audio_files', 'size_bytes', '100'),
      ('scanned_audio_files', 'import_status', 'unknown'),
      ('scanned_audio_files', 'tag_read_status', 'unknown'),
      ('scanned_audio_files', 'tag_failure_kind', 'unknown'),
      ('metadata_candidates', 'confidence', 'high'),
      ('metadata_candidates', 'confidence', 1.5),
      ('metadata_candidates', 'review_status', 'unknown'),
      ('playback_history', 'status', 'unknown'),
      ('playback_history', 'last_position_millis', -1),
      ('playback_history_preferences', 'retention_policy', 'unknown'),
    ]) {
      final corrupted = _clone(valid);
      _rows(corrupted, mutation.$1).single[mutation.$2] = mutation.$3;
      final encoded = jsonEncode(corrupted);
      await expectLater(
        () => service.previewImport(encoded),
        throwsA(isA<LibraryBackupException>()),
        reason: '${mutation.$1}.${mutation.$2}',
      );
      await expectLater(
        () => service.importJson(encoded),
        throwsA(isA<LibraryBackupException>()),
      );
      expect(await target.query('catalog_people'), isEmpty);
      expect(await target.query('scanned_audio_files'), isEmpty);
    }
    final invalidUndone = _clone(valid);
    _rows(
      invalidUndone,
      'library_entity_merges',
    ).single.addAll({'entity_type': 'unknown', 'undone_at_millis': 100});
    await expectLater(
      () => service.previewImport(jsonEncode(invalidUndone)),
      throwsA(isA<LibraryBackupException>()),
    );
    await expectLater(
      () => service.importJson(jsonEncode(invalidUndone)),
      throwsA(isA<LibraryBackupException>()),
    );
    expect(await target.query('catalog_people'), isEmpty);
  });
  tearDown(() async {
    if (await directory.exists()) await directory.delete(recursive: true);
  });

  test('복원 전 중첩 JSON과 메타데이터 출처를 검사하고 대상 DB를 보존한다', () async {
    final source = await openDatabase('nested-source');
    final target = await openDatabase('nested-target');
    addTearDown(source.close);
    addTearDown(target.close);
    await _seed(source);
    await _seed(target);
    final service = LibraryBackupService(database: target);
    final baseline = await service.exportJson();
    final document = jsonDecode(
      await LibraryBackupService(database: source).exportJson(),
    ) as Map<String, Object?>;
    for (final mutation in <(String, String, Object?)>[
      ('catalog_people', 'name_json', '{'),
      ('catalog_works', 'title_json', '{"ko":42,"sortName":"x"}'),
      ('catalog_works', 'source_references_json', '[{"kind":"invented"}]'),
      ('scanned_audio_files', 'tag_metadata_json', '{"title":42}'),
      ('metadata_overrides', 'values_json', '{"movementNumber":"one"}'),
      ('metadata_overrides', 'sources_json', '{}'),
      ('metadata_overrides', 'fallback_sources_json', '{"title":"user"}'),
      ('catalog_tracks', 'work_part_ids_json', '{'),
      ('library_entity_merges', 'evidence_json', '{'),
      ('library_entity_merges', 'undo_snapshot_json', '[]'),
    ]) {
      final corrupted = _clone(document);
      _rows(corrupted, mutation.$1).single[mutation.$2] = mutation.$3;
      final encoded = jsonEncode(corrupted);
      await expectLater(
        () => service.previewImport(encoded),
        throwsA(isA<LibraryBackupException>()),
        reason: '${mutation.$1}.${mutation.$2} preview',
      );
      await expectLater(
        () => service.importJson(encoded),
        throwsA(isA<LibraryBackupException>()),
        reason: '${mutation.$1}.${mutation.$2} import',
      );
      final after =
          jsonDecode(await service.exportJson()) as Map<String, Object?>;
      expect(after['data'], (jsonDecode(baseline) as Map)['data']);
    }
  });

  test('존재하는 ID라도 다른 작품 악장과 녹음의 이력을 섞은 백업은 거부한다', () async {
    final source = await openDatabase('ownership-source');
    final target = await openDatabase('ownership-target');
    addTearDown(source.close);
    addTearDown(target.close);
    await _seed(source);
    final valid = jsonDecode(
      await LibraryBackupService(database: source).exportJson(),
    ) as Map<String, Object?>;
    final works = _rows(valid, 'catalog_works');
    works.add({...works.single, 'id': 'work-2'});
    _counts(valid)['catalog_works'] = works.length;
    final service = LibraryBackupService(database: target);
    for (final table in ['catalog_work_parts', 'playback_history']) {
      final corrupted = _clone(valid);
      _rows(corrupted, table).single['work_id'] = 'work-2';
      await expectLater(
        () => service.previewImport(jsonEncode(corrupted)),
        throwsA(isA<LibraryBackupException>()),
        reason: table,
      );
      await expectLater(
        () => service.importJson(jsonEncode(corrupted)),
        throwsA(isA<LibraryBackupException>()),
        reason: table,
      );
      expect(await target.query('catalog_people'), isEmpty);
      expect(await target.query('scanned_audio_files'), isEmpty);
    }
  });

  test('대표 작품으로 병합된 이력과 악장은 원래 녹음 관계를 보존해 복원한다', () async {
    final source = await openDatabase('alias-source');
    final target = await openDatabase('alias-target');
    addTearDown(source.close);
    addTearDown(target.close);
    await _seed(source);
    final valid = jsonDecode(
      await LibraryBackupService(database: source).exportJson(),
    ) as Map<String, Object?>;
    final works = _rows(valid, 'catalog_works');
    works.add({...works.single, 'id': 'work-2'});
    _counts(valid)['catalog_works'] = works.length;
    final merges = _rows(valid, 'library_entity_merges');
    merges.add(_merge('merge-2', 'work-1', 'work-2'));
    _counts(valid)['library_entity_merges'] = merges.length;
    _rows(valid, 'playback_history').single['work_id'] = 'work-2';
    _rows(valid, 'catalog_work_parts').single['work_id'] = 'work-2';
    final service = LibraryBackupService(database: target);
    await service.importJson(jsonEncode(valid));
    expect(
      (await target.query('playback_history')).single['work_id'],
      'work-2',
    );
    expect(
      (await target.query('catalog_recordings')).single['work_id'],
      'work-1',
    );
    expect(
      (await service.previewImport(await service.exportJson())).conflicts,
      0,
    );
    expect(await target.rawQuery('PRAGMA integrity_check'), [
      {'integrity_check': 'ok'},
    ]);
  });

  test(
    '1.0 backup reads legacy 0.1 header without changing storage format',
    () async {
      final source = await openDatabase('legacy-header-source');
      final target = await openDatabase('legacy-header-target');
      addTearDown(source.close);
      addTearDown(target.close);
      await _seed(source);
      final current = jsonDecode(
        await LibraryBackupService(database: source).exportJson(),
      ) as Map<String, dynamic>;
      expect(current['appVersion'], '1.0.0');
      expect(current['schemaVersion'], 1);
      current['appVersion'] = '0.1.0';
      final backup = LibraryBackupService(database: target);
      expect(
        (await backup.previewImport(jsonEncode(current))).canImport,
        isTrue,
      );
      await backup.importJson(jsonEncode(current));
      expect(await target.rawQuery('PRAGMA integrity_check'), [
        {'integrity_check': 'ok'},
      ]);
      expect(await target.query('catalog_tracks'), hasLength(1));
    },
  );

  test('논리 백업은 사용자 경로와 음원을 제외하고 개수 manifest를 기록한다', () async {
    final database = await openDatabase('source');
    addTearDown(database.close);
    await _seed(database);

    final source = await LibraryBackupService(
      database: database,
      clock: () => DateTime.utc(2026, 10, 23, 1, 2, 3),
    ).exportJson();
    final decoded = jsonDecode(source) as Map<String, Object?>;
    final counts = decoded['counts']! as Map<String, Object?>;

    expect(decoded['format'], libraryBackupFormat);
    expect(decoded['schemaVersion'], libraryBackupSchemaVersion);
    expect(decoded['createdAtUtc'], '2026-10-23T01:02:03.000Z');
    expect(decoded['mediaIncluded'], isFalse);
    expect(counts['catalog_tracks'], 1);
    expect(counts['playback_positions'], 1);
    expect(source, isNot(contains('/Users/private')));
    expect(source, isNot(contains('local_path')));
    expect(source, isNot(contains('scan_locations')));
  });

  test('actual merge backup strips nested iOS paths and restored undo preserves history', () async {
    final source = await openDatabase('merge-portable-source');
    final target = await openDatabase('merge-portable-target');
    addTearDown(source.close);
    addTearDown(target.close);
    await _seed(source);
    const original =
        '/var/mobile/Containers/Data/Application/private-fixture/Documents/music.flac';
    await source.update('scanned_audio_files', {'path': original});
    await source.update('playback_history', {'path': original});
    await source.insert('imslp_imports', {
      'id': 'excluded-import',
      'resource_id': 'excluded-resource',
      'work_id': 'work-1',
      'source_page_url': 'https://imslp.org/wiki/Fixture',
      'source_download_url': 'https://imslp.org/fixture.mp3',
      'original_file_name': 'original-import-not-in-scope.mp3',
      'local_path': '$original/managed-copy.mp3',
      'sha256': 'fixture',
      'size_bytes': 10,
      'downloaded_at_millis': 1,
      'status': 'completed',
      'rights_status': 'userConfirmed',
    });
    final work = (await source.query('catalog_works')).single;
    await source.insert('catalog_works', {...work, 'id': 'work-2'});
    await SqliteLibraryMergeStore(source).merge(
      const LibraryEntityMerge(
        id: 'real-merge',
        entityType: LibraryEntityType.work,
        sourceId: 'work-1',
        targetId: 'work-2',
        sourceLabel: '작품',
        targetLabel: '대표 작품',
        mergedAtMillis: 100,
        evidence: [],
      ),
    );
    final before = (await source.query(
      'library_entity_merges',
      where: 'id = ?',
      whereArgs: ['real-merge'],
    )).single;
    final backup = await LibraryBackupService(database: source).exportJson();
    expect(backup, isNot(contains(original)));
    expect(backup, isNot(contains('/var/mobile/')));
    expect(backup, isNot(contains('original-import-not-in-scope.mp3')));
    expect(
      (await source.query(
        'library_entity_merges',
        where: 'id = ?',
        whereArgs: ['real-merge'],
      )).single,
      before,
    );
    final service = LibraryBackupService(database: target);
    for (final attack in ['privatePath', 'unknownFile', 'excludedImport']) {
      final corrupted = jsonDecode(backup) as Map<String, Object?>;
      final row = _rows(
        corrupted,
        'library_entity_merges',
      ).firstWhere((row) => row['id'] == 'real-merge');
      final snapshot = jsonDecode(
        row['undo_snapshot_json']! as String,
      ) as Map<String, Object?>;
      final after = snapshot['after']! as Map<String, Object?>;
      if (attack == 'excludedImport') {
        after['imslp_imports'] = [
          {'id': 'forged-import'},
        ];
      } else {
        (after['playback_history']! as List).single['path'] =
            attack == 'privatePath'
            ? original
            : 'ddirori-backup://missing/unknown-file';
      }
      row['undo_snapshot_json'] = jsonEncode(snapshot);
      final encoded = jsonEncode(corrupted)
          .replaceAll('/var/mobile', r'\u002fvar\u002fmobile');
      await expectLater(
        () => service.previewImport(encoded),
        throwsA(isA<LibraryBackupException>()),
        reason: attack,
      );
      await expectLater(
        () => service.importJson(encoded),
        throwsA(isA<LibraryBackupException>()),
        reason: attack,
      );
      expect(await target.query('catalog_people'), isEmpty);
    }
    await service.importJson(backup);
    await SqliteLibraryMergeStore(target).undo('real-merge', 200);
    final history = (await target.query('playback_history')).single;
    expect(history['work_id'], 'work-1');
    expect(history['path'], 'ddirori-backup://missing/file-1');
    expect(await target.query('imslp_imports'), isEmpty);
    await SqliteLibraryMergeStore(source).undo('real-merge', 200);
    expect((await source.query('imslp_imports')).single['work_id'], 'work-1');
    expect((await source.query('playback_history')).single['path'], original);
    expect(
      (await service.previewImport(await service.exportJson())).conflicts,
      0,
    );
    expect(await target.rawQuery('PRAGMA integrity_check'), [
      {'integrity_check': 'ok'},
    ]);
  });

  test('교체 파일로 감상한 이력은 원래 트랙 파일 대신 실제 감상 파일 ID를 보존한다', () async {
    final source = await openDatabase('replacement-source');
    final target = await openDatabase('replacement-target');
    addTearDown(source.close);
    addTearDown(target.close);
    await _seed(source);
    final file = (await source.query('scanned_audio_files')).single;
    await source.insert('scanned_audio_files', {
      ...file,
      'id': 'file-2',
      'path': '/Users/private/replacement.flac',
    });
    await source.update('audio_file_track_links', {'file_id': 'file-2'});
    await source.update('playback_history', {
      'path': '/Users/private/replacement.flac',
    });
    final backup = await LibraryBackupService(database: source).exportJson();
    expect(
      _rows(
        jsonDecode(backup) as Map<String, Object?>,
        'playback_history',
      ).single['file_id'],
      'file-2',
    );
    await LibraryBackupService(database: target).importJson(backup);
    expect(
      (await target.query('audio_file_track_links')).single['file_id'],
      'file-2',
    );
    expect((await target.query('catalog_tracks')).single['file_id'], 'file-1');
    expect(
      (await target.query('playback_history')).single['path'],
      endsWith('/file-2'),
    );
  });

  test('내보내기는 저장 행에 섞인 credential 형태를 거부한다', () async {
    final database = await openDatabase('credential-source');
    addTearDown(database.close);
    await _seed(database);
    final fakeCredential = ['sk', List.filled(24, 'x').join()].join('-');
    await database.update('scanned_audio_files', {
      'tag_metadata_json': jsonEncode({'comment': fakeCredential}),
    });

    await expectLater(
      () => LibraryBackupService(database: database).exportJson(),
      throwsA(isA<LibraryBackupException>()),
    );
  });

  test('빈 DB에 복원하면 파일은 누락 상태가 되고 동일 백업은 idempotent하다', () async {
    final sourceDatabase = await openDatabase('source');
    final targetDatabase = await openDatabase('target');
    addTearDown(sourceDatabase.close);
    addTearDown(targetDatabase.close);
    await _seed(sourceDatabase);
    final source = await LibraryBackupService(database: sourceDatabase)
        .exportJson();
    final service = LibraryBackupService(database: targetDatabase);

    final preview = await service.previewImport(source);
    expect(preview.canImport, isTrue);
    expect(preview.added, greaterThan(0));
    expect(preview.conflicts, 0);
    final imported = await service.importJson(source);
    expect(imported.added, preview.added);
    expect(imported.merged, 0);

    final files = await targetDatabase.query('scanned_audio_files');
    expect(files.single['availability'], 'missing');
    expect(files.single['path'], startsWith('ddirori-backup://missing/'));
    expect(await targetDatabase.query('catalog_tracks'), hasLength(1));
    expect(await targetDatabase.query('metadata_overrides'), hasLength(1));
    expect(
      await SqliteMetadataCandidateStore(targetDatabase).load(),
      hasLength(1),
    );
    expect(
      await SqliteMetadataOverrideStore(targetDatabase).load(),
      hasLength(1),
    );
    expect(await SqliteLibraryMergeStore(targetDatabase).load(), hasLength(1));
    expect(await targetDatabase.query('library_entity_merges'), hasLength(1));
    expect(await targetDatabase.query('playback_history'), hasLength(1));
    expect(await targetDatabase.query('playback_positions'), hasLength(1));

    final repeated = await service.previewImport(source);
    expect(repeated.added, 0);
    expect(repeated.merged, 0);
    expect(repeated.conflicts, 0);
    expect(repeated.skipped, preview.added);
    final secondImport = await service.importJson(source);
    expect(secondImport.skipped, preview.added);
  });

  test('손상된 참조, 중복 ID와 alias cycle을 DB 변경 전에 거부한다', () async {
    final sourceDatabase = await openDatabase('source');
    final targetDatabase = await openDatabase('target');
    addTearDown(sourceDatabase.close);
    addTearDown(targetDatabase.close);
    await _seed(sourceDatabase);
    final service = LibraryBackupService(database: targetDatabase);
    final valid = jsonDecode(
      await LibraryBackupService(database: sourceDatabase).exportJson(),
    ) as Map<String, Object?>;

    final brokenReference = _clone(valid);
    final brokenWorks = _rows(brokenReference, 'catalog_works');
    brokenWorks.single['composer_id'] = 'missing-person';
    await expectLater(
      () => service.previewImport(jsonEncode(brokenReference)),
      throwsA(isA<LibraryBackupException>()),
    );

    final duplicate = _clone(valid);
    final duplicateWorks = _rows(duplicate, 'catalog_works');
    duplicateWorks.add(Map<String, Object?>.from(duplicateWorks.single));
    _counts(duplicate)['catalog_works'] = duplicateWorks.length;
    await expectLater(
      () => service.previewImport(jsonEncode(duplicate)),
      throwsA(isA<LibraryBackupException>()),
    );

    final cycle = _clone(valid);
    final merges = _rows(cycle, 'library_entity_merges');
    merges
      ..clear()
      ..addAll([
        _merge('merge-a', 'old-a', 'old-b'),
        _merge('merge-b', 'old-b', 'old-a'),
      ]);
    _counts(cycle)['library_entity_merges'] = merges.length;
    await expectLater(
      () => service.previewImport(jsonEncode(cycle)),
      throwsA(isA<LibraryBackupException>()),
    );
    expect(await targetDatabase.query('catalog_works'), isEmpty);
  });

  test('기존 ID의 다른 데이터는 충돌로 보고 가져오기를 차단한다', () async {
    final sourceDatabase = await openDatabase('source');
    final targetDatabase = await openDatabase('target');
    addTearDown(sourceDatabase.close);
    addTearDown(targetDatabase.close);
    await _seed(sourceDatabase);
    await targetDatabase.insert('catalog_people', {
      'id': 'person-1',
      'name_json': '{"ko":"다른 이름","sortName":"다른 이름"}',
      'origin': 'user',
    });
    final source = await LibraryBackupService(database: sourceDatabase)
        .exportJson();
    final service = LibraryBackupService(database: targetDatabase);

    final preview = await service.previewImport(source);
    expect(preview.conflicts, 1);
    expect(preview.canImport, isFalse);
    await expectLater(
      () => service.importJson(source),
      throwsA(isA<LibraryBackupException>()),
    );
    expect(await targetDatabase.query('catalog_works'), isEmpty);
  });

  test('commit 직전 실패는 가져온 모든 행을 rollback한다', () async {
    final sourceDatabase = await openDatabase('source');
    final targetDatabase = await openDatabase('target');
    addTearDown(sourceDatabase.close);
    addTearDown(targetDatabase.close);
    await _seed(sourceDatabase);
    final source = await LibraryBackupService(database: sourceDatabase)
        .exportJson();
    final service = LibraryBackupService(
      database: targetDatabase,
      beforeCommit: () async => throw StateError('injected'),
    );

    await expectLater(service.importJson(source), throwsStateError);
    expect(await targetDatabase.query('scanned_audio_files'), isEmpty);
    expect(await targetDatabase.query('catalog_people'), isEmpty);
    expect(await targetDatabase.query('playback_history'), isEmpty);
  });

  test('더 최근 재생 위치만 안전하게 병합한다', () async {
    final sourceDatabase = await openDatabase('source');
    final targetDatabase = await openDatabase('target');
    addTearDown(sourceDatabase.close);
    addTearDown(targetDatabase.close);
    await _seed(sourceDatabase);
    final source = await LibraryBackupService(database: sourceDatabase)
        .exportJson();
    await LibraryBackupService(database: targetDatabase).importJson(source);
    await targetDatabase.update('playback_positions', {
      'position_millis': 100,
      'updated_at_millis': 1,
    });

    final service = LibraryBackupService(database: targetDatabase);
    final preview = await service.previewImport(source);
    expect(preview.merged, 1);
    expect(preview.conflicts, 0);
    final result = await service.importJson(source);
    expect(result.merged, 1);
    final position = (await targetDatabase.query('playback_positions')).single;
    expect(position['position_millis'], 2000);
    expect(position['updated_at_millis'], 5000);
  });
}

Future<void> _seed(Database database) async {
  const path = '/Users/private/Music/one.flac';
  await database.insert('scanned_audio_files', {
    'id': 'file-1',
    'path': path,
    'file_name': 'one.flac',
    'format': 'flac',
    'size_bytes': 1234,
    'modified_at_millis': 100,
    'last_seen_at_millis': 200,
    'consecutive_miss_count': 0,
    'availability': 'present',
    'lightweight_fingerprint': '1234:100',
    'tag_read_status': 'noTags',
    'tag_metadata_json': null,
    'tag_failure_kind': null,
    'import_status': 'linked',
    'source_references_json': '[]',
  });
  await database.insert('metadata_candidates', {
    'file_id': 'file-1',
    'file_path': path,
    'file_name': 'one.flac',
    'composer_text': '작곡가',
    'work_title_text': '작품',
    'movement_text': '1악장',
    'track_number': 1,
    'track_total': 1,
    'album_text': null,
    'artist_text': null,
    'album_artist_text': null,
    'genre_text': 'Classical',
    'year': 2026,
    'disc_number': 1,
    'disc_total': 1,
    'confidence': 0.9,
    'source_label': 'fixture',
    'raw_pattern': null,
    'review_status': 'approved',
    'has_tag_conflict': 0,
  });
  await database.insert('metadata_overrides', {
    'file_id': 'file-1',
    'values_json': '{"movementTitle":"교정된 1악장"}',
    'sources_json': '{"movementTitle":"user"}',
    'fallback_values_json': '{}',
    'fallback_sources_json': '{}',
    'updated_at_millis': 300,
  });
  await database.insert('catalog_people', {
    'id': 'person-1',
    'name_json': '{"ko":"작곡가","sortName":"작곡가"}',
    'origin': 'user',
  });
  await database.insert('catalog_works', {
    'id': 'work-1',
    'composer_id': 'person-1',
    'title_json': '{"ko":"작품","sortName":"작품"}',
    'source_references_json': '[]',
    'origin': 'user',
  });
  await database.insert('catalog_work_parts', {
    'id': 'part-1',
    'work_id': 'work-1',
    'title_json': '{"ko":"1악장","sortName":"1악장"}',
    'sequence_number': 1,
  });
  await database.insert('catalog_recordings', {
    'id': 'recording-1',
    'work_id': 'work-1',
    'title_json': '{"ko":"녹음","sortName":"녹음"}',
    'source_references_json': '[]',
    'origin': 'user',
  });
  await database.insert('catalog_tracks', {
    'id': 'track-1',
    'recording_id': 'recording-1',
    'file_id': 'file-1',
    'sequence_number': 1,
    'work_part_ids_json': '["part-1"]',
    'title_json': '{"ko":"1악장","sortName":"1악장"}',
    'duration_millis': 10000,
  });
  await database.insert('audio_file_track_links', {
    'track_id': 'track-1',
    'file_id': 'file-1',
    'linked_at_millis': 400,
  });
  await database.insert(
    'library_entity_merges',
    _merge('merge-1', 'old-work', 'work-1'),
  );
  await database.insert('playback_positions', {
    'path': path,
    'position_millis': 2000,
    'duration_millis': 10000,
    'updated_at_millis': 5000,
    'is_completed': 0,
    'file_modified_at_millis': 100,
  });
  await database.insert('playback_history', {
    'session_id': 'session-1',
    'track_id': 'track-1',
    'recording_id': 'recording-1',
    'work_id': 'work-1',
    'path': path,
    'work_title': '작품',
    'recording_title': '녹음',
    'track_title': '1악장',
    'started_at_millis': 1000,
    'last_played_at_millis': 4000,
    'listened_millis': 2000,
    'last_position_millis': 2000,
    'duration_millis': 10000,
    'status': 'partial',
  });
  await database.insert('playback_history_preferences', {
    'id': 1,
    'retention_policy': 'days90',
  });
  await database.insert('imslp_work_links', {
    'work_id': 'work-1',
    'external_id': 'IMSLP1',
    'page_url': 'https://imslp.org/wiki/Test',
    'work_title': '작품',
    'composer_name': '작곡가',
    'catalog_number': null,
    'linked_at_millis': 600,
  });
}

Map<String, Object?> _merge(String id, String source, String target) => {
  'id': id,
  'entity_type': 'work',
  'source_id': source,
  'target_id': target,
  'source_label': source,
  'target_label': target,
  'merged_at_millis': 1,
  'evidence_json': '[]',
  'undo_snapshot_json': '{}',
  'undone_at_millis': null,
};

Map<String, Object?> _clone(Map<String, Object?> source) =>
    jsonDecode(jsonEncode(source)) as Map<String, Object?>;

List<Map<String, Object?>> _rows(Map<String, Object?> source, String table) =>
    ((source['data']! as Map<String, Object?>)[table]! as List<Object?>)
        .cast<Map<String, Object?>>();

Map<String, Object?> _counts(Map<String, Object?> source) =>
    source['counts']! as Map<String, Object?>;
