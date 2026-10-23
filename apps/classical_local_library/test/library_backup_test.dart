import 'dart:convert';
import 'dart:io';

import 'package:classical_local_library/library_backup.dart';
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
  tearDown(() async {
    if (await directory.exists()) await directory.delete(recursive: true);
  });

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
    'review_status': 'accepted',
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
  'evidence_json': '{}',
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
