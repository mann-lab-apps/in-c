import 'dart:io';

import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/sample_classical_library.dart';
import 'package:classical_local_library/sqlite_database.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  late Directory tempDir;

  setUpAll(sqfliteFfiInit);

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('catalog_test_');
  });

  tearDown(() async {
    if (await tempDir.exists()) await tempDir.delete(recursive: true);
  });

  test('empty SQLite catalog loads without sample entities', () async {
    final database = await _open(tempDir, 'empty.sqlite');
    addTearDown(database.close);

    final library = await SqliteClassicalCatalogStore(database).load(const []);

    expect(library.people, isEmpty);
    expect(library.works, isEmpty);
    expect(library.recordings, isEmpty);
    expect(library.tracks, isEmpty);
  });

  test('three files become one durable work and ordered recording', () async {
    final path = '${tempDir.path}/recording.sqlite';
    var database = await ClassicalLocalDatabase(
      path: path,
      factory: databaseFactoryFfi,
    ).open();
    final files = _files(3);
    await SqliteScannedAudioStore(database).save(files);
    final repository = ClassicalCatalogRepository(
      SqliteClassicalCatalogStore(database),
    );

    final result = await repository.register(
      CatalogRecordingDraft(
        composerName: '테스트 작곡가',
        workTitle: '테스트 교향곡',
        catalogNumber: 'Op. 1',
        recordingTitle: '테스트 연주',
        conductorName: '테스트 지휘자',
        recordedYear: 2026,
        movements: [
          CatalogMovementDraft(
            fileId: files[2].id,
            title: '3악장 Finale',
            sequenceNumber: 3,
          ),
          CatalogMovementDraft(
            fileId: files[0].id,
            title: '1악장 Allegro',
            sequenceNumber: 1,
          ),
          CatalogMovementDraft(
            fileId: files[1].id,
            title: '2악장 Andante',
            sequenceNumber: 2,
          ),
        ],
      ),
      files,
      registeredAt: DateTime.utc(2026, 10, 21),
    );

    expect(result.library.works.single.title.ko, '테스트 교향곡');
    expect(result.library.workParts.map((part) => part.sequenceNumber), [
      1,
      2,
      3,
    ]);
    expect(result.library.tracks.map((track) => track.fileId), [
      files[0].id,
      files[1].id,
      files[2].id,
    ]);
    expect(result.library.recordings.single.credits, hasLength(1));
    expect(result.links, hasLength(3));
    await database.close();

    database = await ClassicalLocalDatabase(
      path: path,
      factory: databaseFactoryFfi,
    ).open();
    addTearDown(database.close);
    final restoredFiles = await SqliteScannedAudioStore(database).load();
    final restored = await SqliteClassicalCatalogStore(database)
        .load(restoredFiles);

    expect(restored.works.single.catalogNumber, 'Op. 1');
    expect(restored.recordings.single.recordedYear, 2026);
    expect(restored.tracks, hasLength(3));
    expect(
      restored.tracks.map((track) => track.sequenceNumber),
      orderedEquals([1, 2, 3]),
    );
    expect(
      restored.files.every(
        (file) => file.importStatus == AudioImportStatus.linked,
      ),
      isTrue,
    );
  });

  test(
    'catalog round trip preserves localized names and source references',
    () async {
      final database = await _open(tempDir, 'round-trip.sqlite');
      addTearDown(database.close);
      final files = _files(1);
      await SqliteScannedAudioStore(database).save(files);
      const person = ClassicalPerson(
        id: 'person.user',
        name: LocalizedName(
          ko: '사용자 작곡가',
          original: 'User Composer',
          english: 'User Composer',
          sortName: '작곡가, 사용자',
          aliases: ['UC'],
        ),
        birthYear: 1900,
      );
      final library = ClassicalLibrary(
        people: const [person],
        instruments: const [],
        ensembles: const [],
        works: const [
          Work(
            id: 'work.user',
            composerId: 'person.user',
            title: LocalizedName(
              ko: '사용자 작품',
              sortName: '사용자 작품',
              aliases: ['작품 별칭'],
            ),
            sourceReferences: [
              SourceReference(
                kind: SourceKind.musicBrainz,
                externalId: 'work-mbid',
              ),
            ],
          ),
        ],
        workParts: const [
          WorkPart(
            id: 'part.user.1',
            workId: 'work.user',
            title: LocalizedName(ko: '1악장', sortName: '01'),
            sequenceNumber: 1,
          ),
        ],
        albums: const [],
        recordings: const [
          Recording(
            id: 'recording.user',
            workId: 'work.user',
            title: LocalizedName(ko: '사용자 녹음', sortName: '사용자 녹음'),
            trackIds: ['track.user.1'],
            credits: [
              RecordingCredit(
                personId: 'person.user',
                role: RecordingRole.performer,
              ),
            ],
            sourceReferences: [
              SourceReference(
                kind: SourceKind.localImport,
                externalId: 'local-1',
              ),
            ],
          ),
        ],
        tracks: [
          Track(
            id: 'track.user.1',
            recordingId: 'recording.user',
            fileId: files.single.id,
            sequenceNumber: 1,
            workPartIds: const ['part.user.1'],
            duration: const Duration(seconds: 12),
          ),
        ],
        files: files,
      );
      final store = SqliteClassicalCatalogStore(database);

      await store.save(library);
      final restored = await store.load(files);

      expect(restored.people.single.name.original, 'User Composer');
      expect(restored.people.single.name.aliases, ['UC']);
      expect(
        restored.works.single.sourceReferences.single.externalId,
        'work-mbid',
      );
      expect(
        restored.recordings.single.credits.single.role,
        RecordingRole.performer,
      );
      expect(restored.tracks.single.duration, const Duration(seconds: 12));
    },
  );

  test('registration rejects a file already linked to the catalog', () async {
    final store = MemoryClassicalCatalogStore();
    final repository = ClassicalCatalogRepository(store);
    final files = _files(1);
    final draft = CatalogRecordingDraft(
      composerName: '작곡가',
      workTitle: '작품',
      recordingTitle: '녹음',
      movements: [
        CatalogMovementDraft(
          fileId: files.single.id,
          title: '1악장',
          sequenceNumber: 1,
        ),
      ],
    );
    await repository.register(draft, files);

    await expectLater(
      () => repository.register(draft, files),
      throwsA(isA<FormatException>()),
    );
  });

  test(
    'reorganize moves an already linked file without leaving stale data',
    () async {
      final database = await _open(tempDir, 'reorganize.sqlite');
      addTearDown(database.close);
      final files = _files(1);
      await SqliteScannedAudioStore(database).save(files);
      final repository = ClassicalCatalogRepository(
        SqliteClassicalCatalogStore(database),
      );
      final initial = await repository.register(
        CatalogRecordingDraft(
          composerName: '첫 작곡가',
          workTitle: '첫 작품',
          recordingTitle: '첫 녹음',
          movements: [
            CatalogMovementDraft(
              fileId: files.single.id,
              title: '첫 악장',
              sequenceNumber: 1,
            ),
          ],
        ),
        files,
        registeredAt: DateTime.utc(2026, 10, 21, 1),
      );

      final moved = await repository.reorganize(
        CatalogRecordingDraft(
          composerName: '새 작곡가',
          workTitle: '새 작품',
          recordingTitle: '새 녹음',
          movements: [
            CatalogMovementDraft(
              fileId: files.single.id,
              title: '새 악장',
              sequenceNumber: 1,
            ),
          ],
        ),
        initial.files,
        registeredAt: DateTime.utc(2026, 10, 21, 2),
      );

      expect(moved.library.tracks, hasLength(1));
      expect(moved.library.tracks.single.title?.ko, '새 악장');
      expect(moved.library.works, hasLength(2));
      expect(moved.library.recordings, hasLength(2));
      expect(
        moved.library.recordings
            .singleWhere((recording) => recording.title.ko == '첫 녹음')
            .trackIds,
        isEmpty,
      );
      expect(await database.query('audio_file_track_links'), hasLength(1));
      expect(
        (await database.query('audio_file_track_links')).single['track_id'],
        moved.library.tracks.single.id,
      );
    },
  );

  test(
    'existing work and recording accept additional missing movements',
    () async {
      final repository = ClassicalCatalogRepository(
        MemoryClassicalCatalogStore(),
      );
      final files = _files(3);
      final initial = await repository.register(
        CatalogRecordingDraft(
          composerName: '작곡가',
          workTitle: '교향곡',
          recordingTitle: '실황',
          movements: [
            CatalogMovementDraft(
              fileId: files[0].id,
              title: '1악장',
              sequenceNumber: 1,
            ),
          ],
        ),
        files,
      );
      final work = initial.library.works.single;
      final recording = initial.library.recordings.single;

      final withNewRecording = await repository.register(
        CatalogRecordingDraft(
          composerName: '무시되는 값',
          workTitle: work.title.ko,
          recordingTitle: '스튜디오',
          existingWorkId: work.id,
          movements: [
            CatalogMovementDraft(
              fileId: files[1].id,
              title: '2악장',
              sequenceNumber: 2,
            ),
          ],
        ),
        initial.files,
      );
      final completed = await repository.register(
        CatalogRecordingDraft(
          composerName: '무시되는 값',
          workTitle: work.title.ko,
          recordingTitle: recording.title.ko,
          existingRecordingId: recording.id,
          movements: [
            CatalogMovementDraft(
              fileId: files[2].id,
              title: '3악장',
              sequenceNumber: 3,
            ),
          ],
        ),
        withNewRecording.files,
      );

      expect(completed.library.works, hasLength(1));
      expect(completed.library.recordings, hasLength(2));
      expect(completed.library.recording(recording.id).trackIds, hasLength(2));
      expect(completed.library.tracks, hasLength(3));
    },
  );

  test(
    'legacy sample references bootstrap only referenced catalog data',
    () async {
      final database = await _open(tempDir, 'legacy-bootstrap.sqlite');
      addTearDown(database.close);
      final files = _files(1);
      await SqliteScannedAudioStore(database).save(files);
      await database.insert('audio_file_track_links', {
        'track_id': 'track.beethoven5.kleiber.1',
        'file_id': files.single.id,
        'linked_at_millis': 1,
      });
      await database.insert('imslp_work_links', {
        'work_id': 'work.beethoven.moonlight',
        'external_id': 'legacy-imslp',
        'page_url': 'https://imslp.org/wiki/Test',
        'work_title': '월광 소나타',
        'composer_name': '베토벤',
        'catalog_number': 'Op. 27 No. 2',
        'linked_at_millis': 1,
      });
      final store = SqliteClassicalCatalogStore(database);

      expect(
        await store.bootstrapLegacyReferences(sampleClassicalLibrary),
        isTrue,
      );
      expect(
        await store.bootstrapLegacyReferences(sampleClassicalLibrary),
        isFalse,
      );
      final restored = await store.load(files);

      expect(
        restored.works.map((work) => work.id),
        containsAll(['work.beethoven.symphony5', 'work.beethoven.moonlight']),
      );
      expect(restored.tracks.single.fileId, files.single.id);
      expect(restored.tracks.single.id, 'track.beethoven5.kleiber.1');
      expect(
        (await database.query(
          'catalog_works',
          where: 'id = ?',
          whereArgs: ['work.beethoven.symphony5'],
        )).single['origin'],
        'legacySample',
      );
    },
  );

  test(
    'unlink removes only the catalog track and preserves the recording',
    () async {
      final database = await _open(tempDir, 'unlink.sqlite');
      addTearDown(database.close);
      final files = _files(2);
      await SqliteScannedAudioStore(database).save(files);
      final repository = ClassicalCatalogRepository(
        SqliteClassicalCatalogStore(database),
      );
      final registered = await repository.register(
        CatalogRecordingDraft(
          composerName: '작곡가',
          workTitle: '작품',
          recordingTitle: '녹음',
          movements: [
            CatalogMovementDraft(
              fileId: files[0].id,
              title: '1악장',
              sequenceNumber: 1,
            ),
            CatalogMovementDraft(
              fileId: files[1].id,
              title: '2악장',
              sequenceNumber: 2,
            ),
          ],
        ),
        files,
      );

      final result = await repository.unlinkFile(files[0].id, registered.files);

      expect(result.library.works, hasLength(1));
      expect(result.library.recordings, hasLength(1));
      expect(result.library.tracks.single.fileId, files[1].id);
      expect(result.library.recordings.single.trackIds, [
        result.library.tracks.single.id,
      ]);
      expect(result.files.first.importStatus, AudioImportStatus.needsReview);
      expect(await database.query('audio_file_track_links'), hasLength(1));
    },
  );

  test(
    'SQLite registration rolls catalog, links, and file status back together',
    () async {
      final database = await _open(tempDir, 'rollback.sqlite');
      addTearDown(database.close);
      final files = _files(1);
      await SqliteScannedAudioStore(database).save(files);
      final repository = ClassicalCatalogRepository(
        SqliteClassicalCatalogStore(
          database,
          beforeCommit: () async => throw StateError('injected failure'),
        ),
      );

      await expectLater(
        () => repository.register(
          CatalogRecordingDraft(
            composerName: '작곡가',
            workTitle: '작품',
            recordingTitle: '녹음',
            movements: [
              CatalogMovementDraft(
                fileId: files.single.id,
                title: '1악장',
                sequenceNumber: 1,
              ),
            ],
          ),
          files,
        ),
        throwsStateError,
      );

      expect(await database.query('catalog_works'), isEmpty);
      expect(await database.query('audio_file_track_links'), isEmpty);
      expect(
        (await database.query('scanned_audio_files')).single['import_status'],
        AudioImportStatus.needsReview.name,
      );
    },
  );
}

Future<Database> _open(Directory directory, String name) =>
    ClassicalLocalDatabase(
      path: '${directory.path}/$name',
      factory: databaseFactoryFfi,
    ).open();

List<LocalAudioFile> _files(int count) => [
  for (var index = 0; index < count; index += 1)
    LocalAudioFile(
      id: 'file-$index',
      path: '/music/$index.flac',
      fileName: '$index.flac',
      format: 'FLAC',
      importStatus: AudioImportStatus.needsReview,
      sourceReferences: const [SourceReference(kind: SourceKind.localImport)],
    ),
];
