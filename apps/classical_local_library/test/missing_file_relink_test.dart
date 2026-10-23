import 'dart:io';

import 'package:classical_local_library/audio_tags.dart';
import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/missing_file_relink.dart';
import 'package:classical_local_library/sqlite_database.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  late Directory directory;

  setUpAll(sqfliteFfiInit);
  setUp(() async {
    directory = await Directory.systemTemp.createTemp('relink_test_');
  });
  tearDown(() async {
    if (await directory.exists()) await directory.delete(recursive: true);
  });

  test('일치 정책은 지문, 크기, 형식과 안전한 태그 근거를 설명한다', () {
    final assessment = const MissingFileRelinkPolicy().assess(
      missing: _missing(),
      replacement: _replacement(),
    );

    expect(assessment.confidence, MissingFileRelinkConfidence.exact);
    expect(assessment.score, 100);
    expect(assessment.reasons, contains('파일 지문이 같습니다.'));
    expect(assessment.reasons, contains('안전한 태그 2개가 같습니다.'));
  });

  test('지원하지 않거나 현재 사용할 수 없는 파일은 거부한다', () {
    final assessment = const MissingFileRelinkPolicy().assess(
      missing: _missing(),
      replacement: _replacement().copyWith(format: 'AAC'),
    );

    expect(assessment.canRelink, isFalse);
    expect(assessment.reasons.single, '지원하지 않는 오디오 형식입니다.');
  });

  test('재연결은 ID, 교정, 위치와 감상 이력을 한 transaction으로 보존한다', () async {
    final path = '${directory.path}/library.sqlite';
    var database = await _open(path);
    await _seed(database);

    final result = await SqliteMissingFileRelinkRepository(database: database)
        .reconnect(missing: _missing(), replacement: _replacement());

    expect(result.files, hasLength(1));
    expect(result.files.single.id, 'missing');
    expect(result.files.single.path, '/managed/found.flac');
    expect(result.files.single.importStatus, AudioImportStatus.linked);
    expect(result.candidates.single.fileId, 'missing');
    expect(result.candidates.single.composerText, '사용자 교정 작곡가');
    expect(result.candidates.single.filePath, '/managed/found.flac');
    expect(
      (await database.query('metadata_overrides')).single['file_id'],
      'missing',
    );
    expect(
      (await database.query('audio_file_track_links')).single['file_id'],
      'missing',
    );
    expect(
      (await database.query('playback_positions')).single['path'],
      '/managed/found.flac',
    );
    expect(
      (await database.query('playback_history')).single['path'],
      '/managed/found.flac',
    );
    expect(
      (await database.query('local_audio_imports')).single['file_id'],
      'missing',
    );

    await database.close();
    database = await _open(path);
    addTearDown(database.close);
    final reopened = await SqliteScannedAudioStore(database).load();
    expect(reopened.single.id, 'missing');
    expect(reopened.single.availability, AudioFileAvailability.present);
  });

  test('이미 다른 악장에 연결된 대체 파일은 변경 전에 거부한다', () async {
    final database = await _open('${directory.path}/duplicate.sqlite');
    addTearDown(database.close);
    await _seed(database);
    await database.insert('audio_file_track_links', {
      'track_id': 'other-track',
      'file_id': 'replacement',
      'linked_at_millis': 2,
    });

    await expectLater(
      SqliteMissingFileRelinkRepository(database: database)
          .reconnect(missing: _missing(), replacement: _replacement()),
      throwsA(
        isA<MissingFileRelinkException>().having(
          (error) => error.userMessage,
          'message',
          contains('이미 다른 악장'),
        ),
      ),
    );
    expect(await database.query('scanned_audio_files'), hasLength(2));
  });

  test('transaction 실패는 재연결의 모든 변경을 rollback한다', () async {
    final database = await _open('${directory.path}/rollback.sqlite');
    addTearDown(database.close);
    await _seed(database);

    await expectLater(
      SqliteMissingFileRelinkRepository(
        database: database,
        beforeCommit: () async => throw StateError('injected'),
      ).reconnect(missing: _missing(), replacement: _replacement()),
      throwsStateError,
    );

    final files = await SqliteScannedAudioStore(database).load();
    expect(files, hasLength(2));
    expect(
      files.firstWhere((file) => file.id == 'missing').path,
      '/old/a.flac',
    );
    expect(
      (await database.query('playback_positions')).single['path'],
      '/old/a.flac',
    );
  });
}

Future<Database> _open(String path) =>
    ClassicalLocalDatabase(path: path, factory: databaseFactoryFfi).open();

Future<void> _seed(Database database) async {
  await SqliteScannedAudioStore(database).save([_missing(), _replacement()]);
  await SqliteMetadataCandidateStore(database).save([
    const MetadataCandidate(
      fileId: 'missing',
      filePath: '/old/a.flac',
      fileName: 'a.flac',
      composerText: '사용자 교정 작곡가',
      workTitleText: '작품',
      confidence: 0.9,
      reviewStatus: MetadataReviewStatus.approved,
    ),
    const MetadataCandidate(
      fileId: 'replacement',
      filePath: '/managed/found.flac',
      fileName: 'found.flac',
      composerText: '자동 후보',
      confidence: 0.5,
    ),
  ]);
  await database.insert('metadata_overrides', {
    'file_id': 'missing',
    'values_json': '{}',
    'sources_json': '{}',
    'fallback_values_json': '{}',
    'fallback_sources_json': '{}',
    'updated_at_millis': 1,
  });
  await database.insert('audio_file_track_links', {
    'track_id': 'track-1',
    'file_id': 'missing',
    'linked_at_millis': 1,
  });
  await database.insert('playback_positions', {
    'path': '/old/a.flac',
    'position_millis': 2000,
    'duration_millis': 10000,
    'updated_at_millis': 3,
    'is_completed': 0,
    'file_modified_at_millis': 10,
  });
  await database.insert('playback_history', {
    'session_id': 'session-1',
    'track_id': 'track-1',
    'recording_id': 'recording-1',
    'work_id': 'work-1',
    'path': '/old/a.flac',
    'work_title': '작품',
    'recording_title': '녹음',
    'track_title': '악장',
    'started_at_millis': 1,
    'last_played_at_millis': 2,
    'listened_millis': 1000,
    'last_position_millis': 2000,
    'status': 'paused',
  });
  await database.insert('local_audio_imports', {
    'id': 'import-1',
    'source_kind': 'documentPicker',
    'original_file_name': 'found.flac',
    'local_path': '/managed/found.flac',
    'sha256': 'sha',
    'size_bytes': 100,
    'imported_at_millis': 1,
    'status': 'completed',
    'file_id': 'replacement',
  });
}

LocalAudioFile _missing() => const LocalAudioFile(
  id: 'missing',
  path: '/old/a.flac',
  fileName: 'a.flac',
  format: 'FLAC',
  sizeBytes: 100,
  modifiedAtMillis: 10,
  availability: AudioFileAvailability.missing,
  lightweightFingerprint: 'same-fingerprint',
  tagReadStatus: AudioTagReadStatus.read,
  tagMetadata: AudioTagMetadata(composer: 'Composer', work: 'Work'),
  importStatus: AudioImportStatus.linked,
);

LocalAudioFile _replacement() => const LocalAudioFile(
  id: 'replacement',
  path: '/managed/found.flac',
  fileName: 'found.flac',
  format: 'FLAC',
  sizeBytes: 100,
  modifiedAtMillis: 20,
  availability: AudioFileAvailability.present,
  lightweightFingerprint: 'same-fingerprint',
  tagReadStatus: AudioTagReadStatus.read,
  tagMetadata: AudioTagMetadata(composer: 'composer', work: 'work'),
  importStatus: AudioImportStatus.needsReview,
);
