import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:classical_local_library/audio_tags.dart';
import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/composer_library.dart';
import 'package:classical_local_library/composer_management.dart';
import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/local_file_library.dart';
import 'package:classical_local_library/library_backup.dart';
import 'package:classical_local_library/library_deduplication.dart';
import 'package:classical_local_library/sqlite_database.dart';
import 'package:classical_local_library/imslp.dart';
import 'package:classical_local_library/imslp_context.dart';
import 'package:classical_local_library/sample_classical_library.dart';

const contextFiles = [
  LocalAudioFile(
    id: 'f',
    path: '/fixture/a.wav',
    format: 'wav',
    tagMetadata: AudioTagMetadata(
      title: '곡',
      composer: 'J. S. Bach',
      album: '음반',
      year: 2024,
    ),
  ),
];
ClassicalLibrary contextLibrary({bool withWork = true}) => copyCatalog(
  emptyClassicalLibrary,
  people: [
    ClassicalPerson(
      id: 'bach',
      name: const LocalizedName(
        ko: '바흐',
        sortName: 'Bach',
        original: 'Johann Sebastian Bach',
        aliases: ['J. S. Bach'],
      ),
      composerProfile: ComposerProfile(
        source: '사용자 확인 자료',
        period: PeriodAssessment(
          eras: [MusicEra.baroque, MusicEra.classical],
          source: '활동 시대 참고 자료',
        ),
      ),
    ),
  ],
  works: withWork
      ? [
          const Work(
            id: 'work',
            composerId: 'bach',
            title: LocalizedName(
              ko: '모음곡',
              sortName: 'Suite',
              english: 'Suite',
            ),
            periodLabel: '옛 시대 자유 입력',
          ),
        ]
      : [],
);
ImslpWorkLink contextLink(String workId, String externalId) => ImslpWorkLink(
  workId: workId,
  externalId: externalId,
  pageUrl: 'https://imslp.org/wiki/$externalId',
  workTitle: externalId,
  linkedAtMillis: 1,
);

void main() {
  setUpAll(sqfliteFfiInit);
  late Directory dir;
  setUp(() async {
    dir = await Directory.systemTemp.createTemp('play-composer-context-');
  });
  tearDown(() async {
    await dir.delete(recursive: true);
  });
  Future<Database> open(String name) => ClassicalLocalDatabase(
    path: '${dir.path}/$name.sqlite',
    factory: databaseFactoryFfi,
  ).open();

  test('standalone composer IDs, exact aliases, ambiguity and explicit file choice/unlink', () async {
    final store = MemoryClassicalCatalogStore();
    final catalog = ClassicalCatalogRepository(store);
    var time = 1;
    final repo = ComposerRepository(
      catalog,
      clock: () => DateTime.fromMicrosecondsSinceEpoch(time++),
    );
    var lib = await repo.saveComposer(
      files: contextFiles,
      name: '바흐',
      original: 'Johann Sebastian Bach',
      aliases: ['J. S. Bach'],
      source: '사용자 확인',
    );
    final id = lib.people.single.id;
    expect(lib.works, isEmpty);
    expect(lib.recordings, isEmpty);
    expect(ComposerNames(lib).forFile('f', 'J. S. Bach'), id);
    lib = await repo.saveComposer(
      files: contextFiles,
      name: '다른 바흐',
      aliases: ['J. S. Bach'],
      source: '별개 인물 확인',
    );
    expect(ComposerNames(lib).forFile('f', 'J. S. Bach'), isNull);
    lib = await repo.connectFile(
      files: contextFiles,
      fileId: 'f',
      personId: id,
    );
    expect(ComposerNames(lib).forFile('f', 'J. S. Bach'), id);
    expect(
      const LocalFileLibrary()
          .entries(files: contextFiles, library: lib)
          .single
          .composer,
      '바흐',
    );
    lib = await repo.connectFile(
      files: contextFiles,
      fileId: 'f',
      personId: null,
    );
    expect(ComposerNames(lib).forFile('f', 'J. S. Bach'), isNull);
    expect(contextFiles.single.tagMetadata!.composer, 'J. S. Bach');
    expect(
      const LocalFileLibrary()
          .entries(files: contextFiles, library: lib)
          .single
          .composerKey,
      'name:j. s. bach',
    );
    expect(ComposerNames(lib).personId('Bach'), isNull);
    await expectLater(
      repo.connectFile(files: contextFiles, fileId: 'f', personId: 'missing'),
      throwsFormatException,
    );
  });

  test('work period overrides activity; free text survives; no recording year inference', () async {
    final db = await open('period');
    addTearDown(db.close);
    await SqliteScannedAudioStore(db).save(contextFiles);
    final catalog = ClassicalCatalogRepository(SqliteClassicalCatalogStore(db));
    final lib = contextLibrary();
    final linked = ClassicalLibrary(
      people: lib.people,
      works: lib.works,
      instruments: [],
      ensembles: [],
      workParts: [],
      albums: [],
      recordings: [
        const Recording(
          id: 'r',
          workId: 'work',
          title: LocalizedName(ko: '녹음', sortName: 'R'),
          trackIds: ['t'],
          recordedYear: 2024,
        ),
      ],
      tracks: [
        const Track(id: 't', recordingId: 'r', fileId: 'f', sequenceNumber: 1),
      ],
      files: contextFiles,
    );
    await catalog.save(linked);
    var period = LibraryPeriods(linked).resolve('f', linked.people.single);
    expect(period.isUnknown, isTrue);
    expect(period.label, contains('옛 시대 자유 입력'));
    final repo = ComposerRepository(catalog);
    final updated = await repo.saveWorkPeriod(
      files: contextFiles,
      workId: 'work',
      period: PeriodAssessment(eras: [MusicEra.romantic], source: '작품 자료 확인'),
    );
    period = LibraryPeriods(updated).resolve('f', updated.people.single);
    expect(period.eras, [MusicEra.romantic]);
    expect(period.estimated, isFalse);
    expect(period.source, '작품 자료 확인');
    expect(updated.works.single.periodLabel, '옛 시대 자유 입력');
    period = LibraryPeriods(contextLibrary(withWork: false))
        .resolve('f', lib.people.single);
    expect(period.eras, [MusicEra.baroque, MusicEra.classical]);
    expect(period.estimated, isTrue);
    expect(period.label, contains('작품 시대 미확인'));
    expect(LibraryPeriods(null).resolve('f', null).isUnknown, isTrue);
  });

  test(
    'v18 additive migration is idempotent and preserves old catalog columns',
    () async {
      final db = await open('migration');
      addTearDown(db.close);
      await db.execute(
        'ALTER TABLE catalog_people DROP COLUMN composer_profile_json',
      );
      await db.execute(
        'ALTER TABLE catalog_works DROP COLUMN period_assessment_json',
      );
      await db.delete('schema_migrations');
      await db.insert('schema_migrations', {
        'version': 18,
        'applied_at_millis': 1,
      });
      await db.insert('catalog_people', {
        'id': 'old',
        'name_json': '{"ko":"옛 이름","sortName":"Old"}',
      });
      await db.insert('catalog_works', {
        'id': 'w',
        'composer_id': 'old',
        'title_json': '{"ko":"작품","sortName":"Work"}',
        'period_label': '자유 입력',
      });
      await const SqliteMigrationRunner().applySchema(db);
      await const SqliteMigrationRunner().applySchema(db);
      expect(
        (await db.query(
          'schema_migrations',
          orderBy: 'version',
        )).map((r) => r['version']),
        [18, 19],
      );
      expect((await db.query('catalog_works')).single['period_label'], '자유 입력');
      expect(
        (await db.query('catalog_people')).single['composer_profile_json'],
        isNull,
      );
      expect(await db.rawQuery('PRAGMA foreign_key_check'), isEmpty);
    },
  );

  test(
    'SQLite reopen and logical backup preserve new data and old v18 backup',
    () async {
      var db = await open('source');
      await SqliteScannedAudioStore(db).save(contextFiles);
      final catalog = ClassicalCatalogRepository(
        SqliteClassicalCatalogStore(db),
      );
      await catalog.save(contextLibrary(withWork: false));
      await ComposerRepository(catalog)
          .connectFile(files: contextFiles, fileId: 'f', personId: 'bach');
      await db.close();
      db = await open('source');
      addTearDown(db.close);
      expect(
        ComposerNames(await SqliteClassicalCatalogStore(db).load(contextFiles))
            .forFile('f', null),
        'bach',
      );
      final backup = await LibraryBackupService(database: db).exportJson();
      final target = await open('target');
      addTearDown(target.close);
      await LibraryBackupService(database: target).importJson(backup);
      final restored = await SqliteClassicalCatalogStore(target)
          .load(await SqliteScannedAudioStore(target).load());
      expect(restored.people.single.composerProfile!.source, '사용자 확인 자료');
      expect(restored.people.single.composerProfile!.confirmedFileIds, ['f']);
      expect(restored.works, isEmpty);
      expect(await target.rawQuery('PRAGMA foreign_key_check'), isEmpty);
      final old = jsonDecode(backup) as Map<String, dynamic>;
      old['storageSchemaVersion'] = 18;
      for (final row in old['data']['catalog_people']) {
        (row as Map).remove('composer_profile_json');
      }
      for (final row in old['data']['catalog_works']) {
        (row as Map).remove('period_assessment_json');
      }
      final legacy = await open('legacy');
      addTearDown(legacy.close);
      await LibraryBackupService(database: legacy).importJson(jsonEncode(old));
      expect(
        (await SqliteClassicalCatalogStore(legacy).load([]))
            .people
            .single
            .composerProfile,
        isNull,
      );
    },
  );

  test(
    'failed catalog write rolls back and serialized next save recovers',
    () async {
      final db = await open('failure');
      addTearDown(db.close);
      bool fail = true;
      final repo = ComposerRepository(
        ClassicalCatalogRepository(
          SqliteClassicalCatalogStore(
            db,
            beforeCommit: () async {
              if (fail) throw StateError('fixture');
            },
          ),
        ),
      );
      await expectLater(
        repo.saveComposer(files: [], name: '작곡가', source: '확인'),
        throwsStateError,
      );
      expect(await db.query('catalog_people'), isEmpty);
      fail = false;
      await repo.saveComposer(files: [], name: '작곡가', source: '확인');
      expect(await db.query('catalog_people'), hasLength(1));
    },
  );

  test('IMSLP replacement, merge and undo preserve context and canonical references', () async {
    final db = await open('merge');
    addTearDown(db.close);
    final base = contextLibrary();
    final catalog = SqliteClassicalCatalogStore(db);
    await catalog.save(
      copyCatalog(
        base,
        works: [
          ...base.works,
          const Work(
            id: 'other',
            composerId: 'bach',
            title: LocalizedName(ko: '다른 작품', sortName: 'Other'),
          ),
        ],
      ),
    );
    final imslp = SqliteImslpStore(db);
    await imslp.upsertWorkLink(contextLink('work', 'Suite'));
    await imslp.saveResources('work', [
      const ImslpResource(
        id: 'score',
        workId: 'work',
        pageUrl: 'https://imslp.org/wiki/Suite',
        kind: ImslpResourceKind.score,
        rightsStatus: ImslpRightsStatus.unknown,
        fetchedAtMillis: 1,
      ),
    ]);
    await imslp.upsertWorkLink(contextLink('work', 'New_Suite'));
    expect(await imslp.loadResources('work'), isEmpty);
    final merge = LibraryMergeRepository(
      SqliteLibraryMergeStore(db),
      clock: () => DateTime.fromMillisecondsSinceEpoch(10),
    );
    final history = await merge.confirm(
      const DuplicateLibraryCandidate(
        entityType: LibraryEntityType.work,
        sourceId: 'work',
        targetId: 'other',
        sourceLabel: '모음곡',
        targetLabel: '다른 작품',
        evidence: ['fixture'],
        confidence: 1,
      ),
    );
    expect(await merge.resolve(LibraryEntityType.work, 'work'), 'other');
    expect((await imslp.loadWorkLinks()).single.workId, 'other');
    var aliases = LibraryAliasIndex(history);
    final composers = ComposerRepository(
      ClassicalCatalogRepository(catalog),
      canonicalWorkId: (id) => aliases.resolve(LibraryEntityType.work, id),
    );
    await composers.saveWorkPeriod(
      files: [],
      workId: 'work',
      period: PeriodAssessment(eras: [MusicEra.romantic], source: '대표 작품 시대'),
    );
    expect((await catalog.load([])).work('other').periodAssessment!.eras, [
      MusicEra.romantic,
    ]);
    expect((await catalog.load([])).work('work').periodAssessment, isNull);
    await merge.undo(history.last.id);
    aliases = LibraryAliasIndex(await merge.load());
    await composers.saveWorkPeriod(
      files: [],
      workId: 'work',
      period: PeriodAssessment(eras: [MusicEra.baroque], source: '되돌린 작품 시대'),
    );
    expect((await catalog.load([])).work('work').periodAssessment!.eras, [
      MusicEra.baroque,
    ]);
    expect((await catalog.load([])).work('other').periodAssessment!.eras, [
      MusicEra.romantic,
    ]);
    expect((await imslp.loadWorkLinks()).single.workId, 'work');
    expect(
      (await catalog.load([])).people.single.composerProfile!.period!.eras,
      [MusicEra.baroque, MusicEra.classical],
    );
  });

  test('existing person role, credits, ID and origin survive explicit composer promotion', () async {
    final db = await open('roles');
    addTearDown(db.close);
    final catalog = ClassicalCatalogRepository(SqliteClassicalCatalogStore(db));
    final base = contextLibrary();
    await catalog.save(
      copyCatalog(
        base,
        people: [
          ...base.people,
          const ClassicalPerson(
            id: 'dual',
            name: LocalizedName(ko: '기존 연주자', sortName: 'Dual'),
            birthYear: 1900,
          ),
        ],
      ),
    );
    await db.update(
      'catalog_people',
      {'origin': 'legacySample'},
      where: 'id = ?',
      whereArgs: ['dual'],
    );
    await db.insert('catalog_recordings', {
      'id': 'r',
      'work_id': 'work',
      'title_json': '{"ko":"녹음","sortName":"R"}',
    });
    await db.insert('catalog_recording_credits', {
      'recording_id': 'r',
      'person_id': 'dual',
      'role': 'performer',
    });
    final next = await ComposerRepository(catalog).saveComposer(
      files: [],
      personId: 'dual',
      name: '기존 연주자',
      source: '사용자가 작곡가 역할도 확인',
    );
    expect(next.person('dual').birthYear, 1900);
    expect(next.recordings.single.credits.single.personId, 'dual');
    expect(next.recordings.single.credits.single.role, RecordingRole.performer);
    expect(ComposerNames(next).people.keys, contains('dual'));
    expect(
      (await db.query(
        'catalog_people',
        where: 'id = ?',
        whereArgs: ['dual'],
      )).single['origin'],
      'legacySample',
    );
  });
  test('concurrent composer writes compose latest snapshots and ambiguous registration refuses identity', () async {
    final catalog = ClassicalCatalogRepository(MemoryClassicalCatalogStore());
    int tick = 1;
    final repo = ComposerRepository(
      catalog,
      clock: () => DateTime.fromMicrosecondsSinceEpoch(tick++),
    );
    await Future.wait([
      for (final name in ['인물1', '인물2'])
        repo.saveComposer(
          files: contextFiles,
          name: name,
          aliases: ['Same Name'],
          source: '각각 확인',
        ),
    ]);
    final library = await catalog.load(contextFiles);
    expect(library.people, hasLength(2));
    expect(ComposerNames(library).forFile('f', 'Same Name'), isNull);
    await expectLater(
      catalog.register(
        const CatalogRecordingDraft(
          composerName: 'Same Name',
          workTitle: '작품',
          recordingTitle: '녹음',
          movements: [
            CatalogMovementDraft(fileId: 'f', title: '곡', sequenceNumber: 1),
          ],
        ),
        contextFiles,
      ),
      throwsFormatException,
    );
    expect((await catalog.load(contextFiles)).works, isEmpty);
  });
  test('IMSLP empty and malformed responses are not negative or normal cache entries', () async {
    int requests = 0;
    final client = HttpImslpCatalogClient(
      delay: (_) async {},
      client: MockClient((_) async {
        requests++;
        return http.Response(
          requests < 3 ? '{"query":{"search":[]}}' : 'not json',
          200,
        );
      }),
    );
    expect(await client.searchWorks('Empty'), isEmpty);
    expect(await client.searchWorks('empty'), isEmpty);
    expect(requests, 2);
    await expectLater(
      client.searchWorks('broken'),
      throwsA(isA<ImslpClientException>()),
    );
    await expectLater(
      client.searchWorks('broken'),
      throwsA(isA<ImslpClientException>()),
    );
    expect(requests, 4);
  });
  test(
    'IMSLP evidence is explanatory and file/namespace URLs are not work pages',
    () {
      final p = contextLibrary().people.single;
      final evidence = ImslpMatchEvidence(
        composer: p,
        work: contextLibrary().works.single,
        result: ImslpWorkSearchResult(
          externalId: '1',
          title: 'Suite',
          composerName: 'J. S. Bach',
          pageUrl: Uri.parse('https://imslp.org/wiki/Suite'),
        ),
      );
      expect(evidence.summary, contains('별칭 일치'));
      expect(evidence.summary, contains('작품명 일치'));
      expect(
        ImslpMatchEvidence(
          composer: p,
          result: ImslpWorkSearchResult(
            externalId: '2',
            title: 'Other',
            composerName: 'Other Bach',
            pageUrl: Uri.parse('https://imslp.org/wiki/Other'),
          ),
        ).summary,
        contains('작곡가 이름 다름'),
      );
      for (final url in [
        'https://evil.test/wiki/Suite',
        'https://imslp.org/wiki/File:A.pdf',
        'https://imslp.org/wiki/Category:Bach',
      ]) {
        expect(isImslpWorkPage(Uri.parse(url)), isFalse);
      }
      expect(
        isImslpWorkPage(Uri.parse('https://imslp.org/wiki/Suite')),
        isTrue,
      );
    },
  );
  test('direct-file history backup survives composer-only catalog and rejects forged IDs', () async {
    final db = await open('direct-backup');
    addTearDown(db.close);
    await SqliteScannedAudioStore(db).save(contextFiles);
    await SqliteClassicalCatalogStore(db).save(contextLibrary(withWork: false));
    final item = const LocalFileLibrary()
        .queue(const LocalFileLibrary().entries(files: contextFiles))
        .single;
    await db.insert('playback_history', {
      'session_id': 'direct',
      'track_id': item.trackId,
      'recording_id': item.recordingId,
      'work_id': item.workId,
      'path': item.path,
      'work_title': item.workTitle,
      'recording_title': item.recordingTitle,
      'track_title': item.displayTitle,
      'started_at_millis': 1,
      'last_played_at_millis': 2,
      'status': 'completed',
    });
    final encoded = await LibraryBackupService(database: db).exportJson();
    final target = await open('direct-restored');
    addTearDown(target.close);
    await LibraryBackupService(database: target).importJson(encoded);
    expect(
      (await target.query('playback_history')).single['track_id'],
      'local-file:f',
    );
    expect(await target.query('catalog_works'), isEmpty);
    final forged = jsonDecode(encoded) as Map;
    forged['data']['playback_history'][0]['work_id'] = 'local-file:other';
    await expectLater(
      LibraryBackupService(database: target).previewImport(jsonEncode(forged)),
      throwsA(isA<LibraryBackupException>()),
    );
  });
  test('legacy bootstrap never replaces standalone composers after direct-file history', () async {
    final db = await open('bootstrap');
    addTearDown(db.close);
    final store = SqliteClassicalCatalogStore(db);
    await store.save(contextLibrary(withWork: false));
    await db.insert('playback_history', {
      'session_id': 'direct-session',
      'track_id': 'local-file:f',
      'recording_id': 'local-files',
      'work_id': 'local-files',
      'path': contextFiles.single.path,
      'work_title': '',
      'recording_title': '',
      'track_title': '곡',
      'started_at_millis': 1,
      'last_played_at_millis': 2,
      'status': 'completed',
    });
    expect(
      await store.bootstrapLegacyReferences(sampleClassicalLibrary),
      isFalse,
    );
    expect((await store.load(contextFiles)).people.single.id, 'bach');
    expect((await store.load(contextFiles)).works, isEmpty);
    await store.clear();
    expect(
      await store.bootstrapLegacyReferences(sampleClassicalLibrary),
      isFalse,
    );
    expect(await db.query('playback_history'), hasLength(1));
  });
  test('private file paths never reach the IMSLP HTTP client', () async {
    int calls = 0;
    final client = HttpImslpCatalogClient(
      client: MockClient((_) async {
        calls++;
        return http.Response('{}', 200);
      }),
    );
    for (final path in [
      '/Users/fixture/Music/a.flac',
      'file:///Music/a.mp3',
      r'C:\Music\private.flac',
    ]) {
      await expectLater(
        client.searchWorks(path),
        throwsA(
          isA<ImslpClientException>().having(
            (e) => e.kind,
            'kind',
            'privateQuery',
          ),
        ),
      );
    }
    expect(calls, 0);
  });

  test(
    'IMSLP cache coalesces, expires, paces and never caches failure/empty',
    () async {
      var now = DateTime.utc(2026, 11, 12);
      var requests = 0;
      final gate = Completer<http.Response>();
      final delays = <Duration>[];
      final client = HttpImslpCatalogClient(
        clock: () => now,
        delay: (d) async {
          delays.add(d);
          now = now.add(d);
        },
        client: MockClient((r) async {
          requests++;
          if (requests == 1) return gate.future;
          if (requests == 3) return http.Response('unavailable', 503);
          return http.Response(
            '{"query":{"search":[{"pageid":1,"title":"Suite (Bach, Johann Sebastian)"}]}}',
            200,
          );
        }),
      );
      final a = client.searchWorks(' Bach  Suite '),
          b = client.searchWorks('bach suite');
      gate.complete(
        http.Response(
          '{"query":{"search":[{"pageid":1,"title":"Suite (Bach, Johann Sebastian)"}]}}',
          200,
        ),
      );
      await Future.wait([a, b]);
      expect(requests, 1);
      await client.searchWorks('BACH SUITE');
      expect(requests, 1);
      now = now.add(const Duration(minutes: 6));
      await client.searchWorks('Bach Suite');
      expect(requests, 2);
      await expectLater(
        client.searchWorks('Other'),
        throwsA(isA<ImslpClientException>()),
      );
      await client.searchWorks('Other');
      expect(requests, 4);
      expect(delays, isNotEmpty);
    },
  );
}
