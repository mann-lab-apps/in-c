import 'dart:io';

import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/library_deduplication.dart';
import 'package:classical_local_library/sample_classical_library.dart';
import 'package:classical_local_library/sqlite_database.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  late Directory tempDir;

  setUpAll(sqfliteFfiInit);
  setUp(() async => tempDir = await Directory.systemTemp.createTemp());
  tearDown(() async {
    if (await tempDir.exists()) await tempDir.delete(recursive: true);
  });

  test('detector only proposes duplicates with strong classical evidence', () {
    final duplicateWork = Work(
      id: 'work.duplicate',
      composerId: beethovenSymphony5.composerId,
      title: beethovenSymphony5.title,
      catalogNumber: 'Op 67',
    );
    final library = _copyLibrary(
      works: [...sampleClassicalLibrary.works, duplicateWork],
    );

    final candidates = const LibraryDuplicateDetector().detect(library);

    expect(candidates, hasLength(1));
    expect(candidates.single.entityType, LibraryEntityType.work);
    expect(candidates.single.sourceId, 'work.duplicate');
    expect(candidates.single.confidence, greaterThanOrEqualTo(0.94));
    expect(candidates.single.evidence, contains('작품 번호 일치'));
  });

  test('detector rejects a fuzzy title without matching composer evidence', () {
    final differentComposer = Work(
      id: 'work.false-positive',
      composerId: dvorakNewWorld.composerId,
      title: beethovenSymphony5.title,
      catalogNumber: beethovenSymphony5.catalogNumber,
    );
    final library = _copyLibrary(
      works: [...sampleClassicalLibrary.works, differentComposer],
    );

    final candidates = const LibraryDuplicateDetector().detect(library);

    expect(
      candidates.where((item) => item.sourceId == differentComposer.id),
      isEmpty,
    );
  });

  test('detector keeps recording duplicates separate from work duplicates', () {
    final original = sampleClassicalLibrary.recordings.first;
    final duplicate = Recording(
      id: 'recording.duplicate',
      workId: original.workId,
      title: original.title,
      trackIds: const [],
      albumId: original.albumId,
      ensembleId: original.ensembleId,
      credits: original.credits,
      recordedYear: original.recordedYear,
      sourceReferences: original.sourceReferences,
    );
    final library = _copyLibrary(
      works: sampleClassicalLibrary.works,
      recordings: [...sampleClassicalLibrary.recordings, duplicate],
    );

    final candidates = const LibraryDuplicateDetector().detect(library);

    expect(
      candidates.any(
        (item) =>
            item.entityType == LibraryEntityType.recording &&
            item.sourceId == duplicate.id,
      ),
      isTrue,
    );
  });

  test(
    'confirmed work merge moves durable references and writes audit',
    () async {
      final database = await ClassicalLocalDatabase(
        path: '${tempDir.path}/merge.sqlite',
        factory: databaseFactoryFfi,
      ).open();
      addTearDown(database.close);
      await _seedReferences(database, sourceWorkId: 'work.source');
      final repository = LibraryMergeRepository(
        SqliteLibraryMergeStore(database),
        clock: () => DateTime.fromMillisecondsSinceEpoch(1234),
      );

      final merges = await repository.confirm(
        const DuplicateLibraryCandidate(
          entityType: LibraryEntityType.work,
          sourceId: 'work.source',
          targetId: 'work.target',
          sourceLabel: '중복 작품',
          targetLabel: '대표 작품',
          confidence: 0.99,
          evidence: ['작곡가 일치', '작품 번호 일치'],
        ),
      );

      expect(merges, hasLength(1));
      expect(
        await repository.resolve(LibraryEntityType.work, 'work.source'),
        'work.target',
      );
      expect(
        (await database.query('playback_history')).single['work_id'],
        'work.target',
      );
      expect(
        (await database.query('imslp_resources')).single['work_id'],
        'work.target',
      );
      expect(
        (await database.query('imslp_imports')).single['work_id'],
        'work.target',
      );
      expect(
        (await database.query('imslp_work_links')).single['work_id'],
        'work.target',
      );
    },
  );

  test(
    'merge transaction rolls reference updates back when audit fails',
    () async {
      final database = await ClassicalLocalDatabase(
        path: '${tempDir.path}/rollback.sqlite',
        factory: databaseFactoryFfi,
      ).open();
      addTearDown(database.close);
      await _seedReferences(database, sourceWorkId: 'work.source');
      final store = SqliteLibraryMergeStore(
        database,
        beforeAuditWrite: () async => throw StateError('injected failure'),
      );
      const merge = LibraryEntityMerge(
        id: 'merge-1',
        entityType: LibraryEntityType.work,
        sourceId: 'work.source',
        targetId: 'work.target',
        sourceLabel: '중복 작품',
        targetLabel: '대표 작품',
        mergedAtMillis: 1,
        evidence: ['작품 번호 일치'],
      );

      await expectLater(() => store.merge(merge), throwsStateError);

      expect(
        (await database.query('playback_history')).single['work_id'],
        'work.source',
      );
      expect(await database.query('library_entity_merges'), isEmpty);
    },
  );

  test('work merge undo restores references and survives reopening', () async {
    final path = '${tempDir.path}/undo.sqlite';
    var database = await ClassicalLocalDatabase(
      path: path,
      factory: databaseFactoryFfi,
    ).open();
    await _seedReferences(database, sourceWorkId: 'work.source');
    var repository = LibraryMergeRepository(
      SqliteLibraryMergeStore(database),
      clock: () => DateTime.fromMillisecondsSinceEpoch(1234),
    );
    final merged = await repository.confirm(
      const DuplicateLibraryCandidate(
        entityType: LibraryEntityType.work,
        sourceId: 'work.source',
        targetId: 'work.target',
        sourceLabel: '중복 작품',
        targetLabel: '대표 작품',
        confidence: 1,
        evidence: ['작품 번호 일치'],
      ),
    );
    await database.close();

    database = await ClassicalLocalDatabase(
      path: path,
      factory: databaseFactoryFfi,
    ).open();
    addTearDown(database.close);
    repository = LibraryMergeRepository(
      SqliteLibraryMergeStore(database),
      clock: () => DateTime.fromMillisecondsSinceEpoch(2345),
    );
    final history = await repository.undo(merged.single.id);

    expect(history.single.isActive, isFalse);
    expect(
      await repository.resolve(LibraryEntityType.work, 'work.source'),
      'work.source',
    );
    expect(
      (await database.query('playback_history')).single['work_id'],
      'work.source',
    );
    expect(
      (await database.query('imslp_resources')).single['work_id'],
      'work.source',
    );
    expect(
      (await database.query('imslp_work_links')).single['work_id'],
      'work.source',
    );

    final remerged = await repository.confirm(
      const DuplicateLibraryCandidate(
        entityType: LibraryEntityType.work,
        sourceId: 'work.source',
        targetId: 'work.target',
        sourceLabel: '중복 작품',
        targetLabel: '대표 작품',
        confidence: 1,
        evidence: ['작품 번호 일치'],
      ),
    );
    expect(remerged, hasLength(2));
    expect(remerged.where((merge) => merge.isActive), hasLength(1));
    expect(remerged.where((merge) => !merge.isActive), hasLength(1));
    expect(await database.query('library_entity_merges'), hasLength(2));
  });

  test('undo refuses to overwrite related data changed after merge', () async {
    final database = await ClassicalLocalDatabase(
      path: '${tempDir.path}/undo-conflict.sqlite',
      factory: databaseFactoryFfi,
    ).open();
    addTearDown(database.close);
    await _seedReferences(database, sourceWorkId: 'work.source');
    final repository = LibraryMergeRepository(
      SqliteLibraryMergeStore(database),
      clock: () => DateTime.fromMillisecondsSinceEpoch(1234),
    );
    final merged = await repository.confirm(
      const DuplicateLibraryCandidate(
        entityType: LibraryEntityType.work,
        sourceId: 'work.source',
        targetId: 'work.target',
        sourceLabel: '중복 작품',
        targetLabel: '대표 작품',
        confidence: 1,
        evidence: ['작품 번호 일치'],
      ),
    );
    await database.update(
      'playback_history',
      {'work_title': '사용자가 바꾼 제목'},
      where: 'session_id = ?',
      whereArgs: ['session-1'],
    );

    await expectLater(
      () => repository.undo(merged.single.id),
      throwsA(isA<LibraryMergeUndoException>()),
    );
    expect(
      (await database.query('playback_history')).single['work_id'],
      'work.target',
    );
    expect((await repository.load()).single.isActive, isTrue);
  });

  test('undo transaction rolls back when restoration fails', () async {
    final database = await ClassicalLocalDatabase(
      path: '${tempDir.path}/undo-rollback.sqlite',
      factory: databaseFactoryFfi,
    ).open();
    addTearDown(database.close);
    await _seedReferences(database, sourceWorkId: 'work.source');
    final repository = LibraryMergeRepository(
      SqliteLibraryMergeStore(database),
      clock: () => DateTime.fromMillisecondsSinceEpoch(1234),
    );
    final merged = await repository.confirm(
      const DuplicateLibraryCandidate(
        entityType: LibraryEntityType.work,
        sourceId: 'work.source',
        targetId: 'work.target',
        sourceLabel: '중복 작품',
        targetLabel: '대표 작품',
        confidence: 1,
        evidence: [],
      ),
    );
    final failingRepository = LibraryMergeRepository(
      SqliteLibraryMergeStore(
        database,
        beforeUndoWrite: () async => throw StateError('injected failure'),
      ),
      clock: () => DateTime.fromMillisecondsSinceEpoch(2345),
    );

    await expectLater(
      () => failingRepository.undo(merged.single.id),
      throwsStateError,
    );
    expect(
      (await database.query('playback_history')).single['work_id'],
      'work.target',
    );
    expect((await repository.load()).single.isActive, isTrue);
  });

  test('alias index resolves chains and rejects cycles', () {
    const first = LibraryEntityMerge(
      id: 'first',
      entityType: LibraryEntityType.work,
      sourceId: 'a',
      targetId: 'b',
      sourceLabel: 'A',
      targetLabel: 'B',
      mergedAtMillis: 1,
      evidence: [],
    );
    const second = LibraryEntityMerge(
      id: 'second',
      entityType: LibraryEntityType.work,
      sourceId: 'b',
      targetId: 'c',
      sourceLabel: 'B',
      targetLabel: 'C',
      mergedAtMillis: 2,
      evidence: [],
    );

    expect(
      LibraryAliasIndex([first, second]).resolve(LibraryEntityType.work, 'a'),
      'c',
    );
    expect(
      () => LibraryAliasIndex([
        first,
        LibraryEntityMerge(
          id: 'cycle',
          entityType: LibraryEntityType.work,
          sourceId: 'b',
          targetId: 'a',
          sourceLabel: 'B',
          targetLabel: 'A',
          mergedAtMillis: 2,
          evidence: const [],
        ),
      ]).resolve(LibraryEntityType.work, 'a'),
      throwsStateError,
    );
  });

  test('older merge cannot be undone before a connected later merge', () async {
    var now = 1;
    final store = MemoryLibraryMergeStore();
    final repository = LibraryMergeRepository(
      store,
      clock: () => DateTime.fromMillisecondsSinceEpoch(now++),
    );
    final first = await repository.confirm(
      const DuplicateLibraryCandidate(
        entityType: LibraryEntityType.work,
        sourceId: 'a',
        targetId: 'b',
        sourceLabel: 'A',
        targetLabel: 'B',
        confidence: 1,
        evidence: [],
      ),
    );
    await repository.confirm(
      const DuplicateLibraryCandidate(
        entityType: LibraryEntityType.work,
        sourceId: 'b',
        targetId: 'c',
        sourceLabel: 'B',
        targetLabel: 'C',
        confidence: 1,
        evidence: [],
      ),
    );

    await expectLater(
      () => repository.undo(first.single.id),
      throwsA(isA<LibraryMergeUndoException>()),
    );
  });

  test('remerge after undo preserves the previous audit record', () async {
    var now = 1;
    final store = MemoryLibraryMergeStore();
    final repository = LibraryMergeRepository(
      store,
      clock: () => DateTime.fromMillisecondsSinceEpoch(now++),
    );
    const candidate = DuplicateLibraryCandidate(
      entityType: LibraryEntityType.work,
      sourceId: 'source',
      targetId: 'target',
      sourceLabel: 'Source',
      targetLabel: 'Target',
      confidence: 1,
      evidence: [],
    );
    final first = await repository.confirm(candidate);
    await repository.undo(first.single.id);
    final history = await repository.confirm(candidate);

    expect(history, hasLength(2));
    expect(history.where((merge) => merge.isActive), hasLength(1));
    expect(history.where((merge) => !merge.isActive), hasLength(1));
  });
}

ClassicalLibrary _copyLibrary({
  required List<Work> works,
  List<Recording>? recordings,
}) {
  return ClassicalLibrary(
    people: sampleClassicalLibrary.people,
    instruments: sampleClassicalLibrary.instruments,
    ensembles: sampleClassicalLibrary.ensembles,
    works: works,
    workParts: sampleClassicalLibrary.workParts,
    albums: sampleClassicalLibrary.albums,
    recordings: recordings ?? sampleClassicalLibrary.recordings,
    tracks: sampleClassicalLibrary.tracks,
    files: sampleClassicalLibrary.files,
  );
}

Future<void> _seedReferences(
  Database database, {
  required String sourceWorkId,
}) async {
  await database.insert('playback_history', {
    'session_id': 'session-1',
    'track_id': 'track-1',
    'recording_id': 'recording-1',
    'work_id': sourceWorkId,
    'path': '/music/test.flac',
    'work_title': '중복 작품',
    'recording_title': '녹음',
    'track_title': '악장',
    'started_at_millis': 1,
    'last_played_at_millis': 2,
    'listened_millis': 3,
    'last_position_millis': 4,
    'status': 'stopped',
  });
  await database.insert('imslp_work_links', {
    'work_id': sourceWorkId,
    'external_id': 'imslp-1',
    'page_url': 'https://imslp.org/wiki/Test',
    'work_title': '중복 작품',
    'linked_at_millis': 1,
  });
  await database.insert('imslp_resources', {
    'id': 'resource-1',
    'work_id': sourceWorkId,
    'page_url': 'https://imslp.org/wiki/Test',
    'kind': 'audio',
    'rights_status': 'allowed',
    'fetched_at_millis': 1,
    'is_sound_recording': 1,
  });
  await database.insert('imslp_imports', {
    'id': 'import-1',
    'resource_id': 'resource-1',
    'work_id': sourceWorkId,
    'source_page_url': 'https://imslp.org/wiki/Test',
    'source_download_url': 'https://imslp.org/files/test.flac',
    'original_file_name': 'test.flac',
    'local_path': '/music/test.flac',
    'sha256': 'abc',
    'size_bytes': 3,
    'downloaded_at_millis': 1,
    'status': 'completed',
    'rights_status': 'allowed',
  });
}
