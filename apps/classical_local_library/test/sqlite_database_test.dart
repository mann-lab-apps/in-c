import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:classical_local_library/audio_tags.dart';
import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/imslp.dart';
import 'package:classical_local_library/local_audio_scanner.dart';
import 'package:classical_local_library/local_audio_import.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/metadata_overrides.dart';
import 'package:classical_local_library/musicbrainz.dart';
import 'package:classical_local_library/playback_history.dart';
import 'package:classical_local_library/playback_position.dart';
import 'package:classical_local_library/scan_locations.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:classical_local_library/sqlite_database.dart';
import 'package:classical_local_library/sqlite_migration.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  late Directory tempDir;

  setUpAll(() {
    sqfliteFfiInit();
  });

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('classical_sqlite_test_');
  });

  tearDown(() async {
    if (await tempDir.exists()) {
      await tempDir.delete(recursive: true);
    }
  });

  test('schema migration runner applies schema version 15 once', () async {
    final database = await _openDatabase(tempDir);
    addTearDown(database.close);
    const runner = SqliteMigrationRunner();

    await runner.applySchema(database, now: DateTime.utc(2026, 10, 13));
    await runner.applySchema(database, now: DateTime.utc(2026, 10, 14));

    final migrations = await database.query('schema_migrations');
    final tables = await database.rawQuery(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    );

    expect(migrations, hasLength(1));
    expect(migrations.single['version'], 15);
    expect(tables.map((row) => row['name']), contains('scanned_audio_files'));
    expect(tables.map((row) => row['name']), contains('json_store_migrations'));
    expect(tables.map((row) => row['name']), contains('playback_positions'));
    expect(tables.map((row) => row['name']), contains('playback_history'));
    expect(
      tables.map((row) => row['name']),
      contains('playback_history_preferences'),
    );
    expect(tables.map((row) => row['name']), contains('playback_queue_state'));
    expect(tables.map((row) => row['name']), contains('local_playlists'));
    expect(tables.map((row) => row['name']), contains('imslp_work_links'));
    expect(tables.map((row) => row['name']), contains('imslp_resources'));
    expect(tables.map((row) => row['name']), contains('imslp_imports'));
    expect(tables.map((row) => row['name']), contains('local_audio_imports'));
    expect(tables.map((row) => row['name']), contains('metadata_overrides'));
    expect(tables.map((row) => row['name']), contains('musicbrainz_cache'));
    expect(tables.map((row) => row['name']), contains('catalog_people'));
    expect(tables.map((row) => row['name']), contains('catalog_works'));
    expect(tables.map((row) => row['name']), contains('catalog_recordings'));
    expect(tables.map((row) => row['name']), contains('catalog_tracks'));
  });

  test('schema migration upgrades a version 1 database idempotently', () async {
    final database = await databaseFactoryFfi.openDatabase(
      '${tempDir.path}/legacy.sqlite',
    );
    addTearDown(database.close);
    await database.execute(const SqliteStorageSchema().migrationTableSql);
    await database.insert('schema_migrations', {
      'version': 1,
      'applied_at_millis': 1,
    });
    await database.execute(const SqliteStorageSchema().tables.first.createSql);
    await database.insert('scanned_audio_files', {
      'id': 'legacy-file',
      'path': '/Music/legacy.flac',
      'file_name': 'legacy.flac',
      'format': 'FLAC',
      'size_bytes': 10,
      'modified_at_millis': 20,
      'import_status': 'needsReview',
      'source_references_json': '[]',
    });

    const runner = SqliteMigrationRunner();
    await runner.applySchema(database, now: DateTime.utc(2026, 10, 19));
    await runner.applySchema(database, now: DateTime.utc(2026, 10, 20));

    final migrations = await database.query(
      'schema_migrations',
      orderBy: 'version ASC',
    );
    expect(migrations.map((row) => row['version']), [1, 15]);
    expect(await _tableCount(database, 'playback_positions'), 0);
    expect(await _tableCount(database, 'playback_history'), 0);
    expect(await _tableCount(database, 'playback_history_preferences'), 0);
    expect(await _tableCount(database, 'scanned_audio_files'), 1);
    expect(
      (await database.query('scanned_audio_files')).single['path'],
      '/Music/legacy.flac',
    );
  });

  test(
    'schema migration upgrades version 2 without losing positions',
    () async {
      final database = await databaseFactoryFfi.openDatabase(
        '${tempDir.path}/version-2.sqlite',
      );
      addTearDown(database.close);
      const schema = SqliteStorageSchema();
      await database.execute(schema.migrationTableSql);
      await database.insert('schema_migrations', {
        'version': 2,
        'applied_at_millis': 1,
      });
      final positionTable = schema.tables.firstWhere(
        (table) => table.name == 'playback_positions',
      );
      await database.execute(positionTable.createSql);
      await database.insert('playback_positions', {
        'path': '/Music/legacy.flac',
        'position_millis': 12000,
        'duration_millis': 90000,
        'updated_at_millis': 2,
        'is_completed': 0,
        'file_modified_at_millis': 3,
      });

      const runner = SqliteMigrationRunner();
      await runner.applySchema(database, now: DateTime.utc(2026, 10, 19));
      await runner.applySchema(database, now: DateTime.utc(2026, 10, 20));

      expect(
        (await database.query(
          'schema_migrations',
          orderBy: 'version ASC',
        )).map((row) => row['version']),
        [2, 15],
      );
      expect(await _tableCount(database, 'playback_positions'), 1);
      expect(await _tableCount(database, 'playback_history'), 0);
      expect(await _tableCount(database, 'playback_history_preferences'), 0);
      expect(
        (await SqlitePlaybackPositionStore(database).load('/Music/legacy.flac'))
            ?.positionMillis,
        12000,
      );
    },
  );

  test('SQLite scanned audio store saves and loads files', () async {
    final database = await _openDatabase(tempDir);
    addTearDown(database.close);
    final store = SqliteScannedAudioStore(database);
    final repository = ScannedAudioRepository(store);
    final file = _audioFile('/Music/Beethoven/Symphony 5/01 Allegro.flac');

    await repository.mergeScanned([file]);
    await repository.markLinked(file.id);
    final loaded = await repository.load();

    expect(loaded, hasLength(1));
    expect(loaded.single.path, file.path);
    expect(loaded.single.importStatus, AudioImportStatus.linked);
    expect(loaded.single.sourceReferences.single.kind, SourceKind.localTag);
    expect(loaded.single.availability, AudioFileAvailability.present);
    expect(loaded.single.consecutiveMissCount, 0);
    expect(loaded.single.tagMetadata?.title, 'Allegro con brio');
    expect(loaded.single.tagFailureKind, AudioTagFailureKind.unreadable);
  });

  test(
    'SQLite IMSLP store preserves links, resources, and provenance',
    () async {
      final database = await _openDatabase(tempDir);
      addTearDown(database.close);
      final store = SqliteImslpStore(database);
      final link = ImslpWorkLink(
        workId: 'work-1',
        externalId: 'External Work',
        pageUrl: 'https://imslp.org/wiki/External_Work',
        workTitle: 'External Work',
        composerName: 'Composer',
        linkedAtMillis: 10,
      );
      final resource = ImslpResource(
        id: 'resource-1',
        workId: 'work-1',
        pageUrl: link.pageUrl,
        kind: ImslpResourceKind.audio,
        rightsStatus: ImslpRightsStatus.publicDomain,
        fetchedAtMillis: 20,
        directDownloadUrl: 'https://s9.imslp.org/files/test.flac',
        originalFileName: 'test.flac',
        rawCopyrightStatus: 'Public Domain',
        isSoundRecording: true,
      );
      final record = ImslpImportRecord(
        id: 'import-1',
        resourceId: resource.id,
        workId: link.workId,
        sourcePageUrl: link.pageUrl,
        sourceDownloadUrl: resource.directDownloadUrl!,
        originalFileName: 'test.flac',
        localPath: '/Music/test.flac',
        sha256: 'abc123',
        sizeBytes: 42,
        downloadedAtMillis: 30,
        status: ImslpTransferStatus.completed,
        rightsStatus: ImslpRightsStatus.publicDomain,
        fileId: 'file-1',
        rawCopyrightStatus: 'Public Domain',
      );

      await store.upsertWorkLink(link);
      await store.saveResources(link.workId, [resource]);
      await store.upsertImport(record);

      expect((await store.loadWorkLinks()).single.externalId, link.externalId);
      expect(
        (await store.loadResources(link.workId)).single.kind,
        ImslpResourceKind.audio,
      );
      expect((await store.loadImports()).single.fileId, 'file-1');
      expect((await store.findImportByChecksum('abc123'))?.id, 'import-1');
      await store.upsertWorkLink(
        ImslpWorkLink(
          workId: link.workId,
          externalId: link.externalId,
          pageUrl: link.pageUrl,
          workTitle: 'Changed title',
          linkedAtMillis: 40,
        ),
      );
      expect(await store.loadResources(link.workId), hasLength(1));
      expect(await store.loadImports(), hasLength(1));
    },
  );

  test('SQLite local import store preserves managed-file provenance', () async {
    final database = await _openDatabase(tempDir);
    addTearDown(database.close);
    final store = SqliteLocalAudioImportStore(database);
    const record = LocalAudioImportRecord(
      id: 'local-import-1',
      sourceKind: 'documentPicker',
      originalFileName: 'movement.wav',
      localPath: '/Managed/movement.wav',
      sha256: 'fixture-sha256',
      sizeBytes: 42,
      importedAtMillis: 100,
      status: LocalAudioImportStatus.copied,
    );

    await store.upsert(record);
    await store.upsert(
      record.copyWith(
        status: LocalAudioImportStatus.completed,
        fileId: 'file-1',
      ),
    );

    final loaded = (await store.load()).single;
    expect(loaded.originalFileName, 'movement.wav');
    expect(loaded.localPath, '/Managed/movement.wav');
    expect(loaded.status, LocalAudioImportStatus.completed);
    expect(loaded.fileId, 'file-1');
    expect((await store.findByChecksum('fixture-sha256'))?.id, record.id);
    await store.delete(record.id);
    expect(await store.load(), isEmpty);
  });

  test(
    'SQLite metadata override store preserves values and provenance',
    () async {
      final database = await _openDatabase(tempDir);
      addTearDown(database.close);
      final store = SqliteMetadataOverrideStore(database);
      final override = MetadataOverride(
        fileId: 'file-1',
        values: const {
          MetadataField.composer: '베토벤',
          MetadataField.catalogNumber: 'Op. 67',
          MetadataField.movementNumber: 1,
        },
        sources: const {
          MetadataField.composer: MetadataValueSource.user,
          MetadataField.catalogNumber: MetadataValueSource.musicBrainz,
          MetadataField.movementNumber: MetadataValueSource.user,
        },
        updatedAtMillis: 100,
        musicBrainzRecordingId: 'recording-mbid',
        musicBrainzWorkId: 'work-mbid',
      );

      await store.upsert(override);
      final loaded = (await store.load()).single;

      expect(loaded.text(MetadataField.composer), '베토벤');
      expect(loaded.number(MetadataField.movementNumber), 1);
      expect(
        loaded.source(MetadataField.catalogNumber),
        MetadataValueSource.musicBrainz,
      );
      expect(loaded.musicBrainzRecordingId, 'recording-mbid');
      await store.delete('file-1');
      expect(await store.load(), isEmpty);
    },
  );

  test(
    'schema migration upgrades version 6 without losing existing data',
    () async {
      final database = await databaseFactoryFfi.openDatabase(
        '${tempDir.path}/version-6.sqlite',
      );
      addTearDown(database.close);
      const schema = SqliteStorageSchema();
      await database.execute(schema.migrationTableSql);
      await database.insert('schema_migrations', {
        'version': 6,
        'applied_at_millis': 1,
      });
      for (final table in schema.tables.where(
        (table) =>
            table.name != 'local_audio_imports' &&
            table.name != 'metadata_overrides',
      )) {
        await database.execute(table.createSql);
      }
      final scannedStore = SqliteScannedAudioStore(database);
      final positionStore = SqlitePlaybackPositionStore(database);
      final historyStore = SqlitePlaybackHistoryStore(database);
      final linkStore = SqliteAudioFileTrackLinkStore(database);
      final file = _audioFile('/Music/preserved.flac');
      await scannedStore.save([file]);
      await linkStore.save([
        AudioFileTrackLink(
          fileId: file.id,
          trackId: 'preserved-track',
          linkedAtMillis: 1,
        ),
      ]);
      await positionStore.save(
        PlaybackPositionRecord(
          path: file.path,
          positionMillis: 100,
          durationMillis: 1000,
          updatedAtMillis: 1,
          isCompleted: false,
        ),
      );
      await historyStore.save(
        _historyEntry(
          sessionId: 'preserved-session',
          trackId: 'preserved-track',
          recordingId: 'preserved-recording',
          lastPlayedAtMillis: 1,
        ),
      );

      await const SqliteMigrationRunner().applySchema(database);
      await const SqliteMigrationRunner().applySchema(database);

      expect(
        (await database.query(
          'schema_migrations',
          orderBy: 'version ASC',
        )).map((row) => row['version']),
        [6, 15],
      );
      expect(await scannedStore.load(), hasLength(1));
      expect(await linkStore.load(), hasLength(1));
      expect(await positionStore.load(file.path), isNotNull);
      expect(await historyStore.loadRecent(), hasLength(1));
      expect(await SqliteLocalAudioImportStore(database).load(), isEmpty);
      expect(await SqliteMetadataOverrideStore(database).load(), isEmpty);
    },
  );

  test(
    'schema migration upgrades version 8 metadata without data loss',
    () async {
      final database = await databaseFactoryFfi.openDatabase(
        '${tempDir.path}/version-8.sqlite',
      );
      addTearDown(database.close);
      const schema = SqliteStorageSchema();
      await database.execute(schema.migrationTableSql);
      await database.insert('schema_migrations', {
        'version': 8,
        'applied_at_millis': 1,
      });
      await database.execute('''
CREATE TABLE metadata_overrides (
  file_id TEXT PRIMARY KEY,
  values_json TEXT NOT NULL,
  sources_json TEXT NOT NULL,
  updated_at_millis INTEGER NOT NULL,
  musicbrainz_recording_id TEXT,
  musicbrainz_work_id TEXT,
  musicbrainz_release_id TEXT
);''');
      await database.insert('metadata_overrides', {
        'file_id': 'legacy-file',
        'values_json': '{"composer":"Beethoven"}',
        'sources_json': '{"composer":"musicBrainz"}',
        'updated_at_millis': 2,
        'musicbrainz_recording_id': 'recording-id',
      });

      await const SqliteMigrationRunner().applySchema(database);

      final override = (await SqliteMetadataOverrideStore(
        database,
      ).load()).single;
      expect(override.text(MetadataField.composer), 'Beethoven');
      expect(override.fallbackValues, isEmpty);
      expect(override.musicBrainzRecordingId, 'recording-id');
      expect(
        (await database.query(
          'schema_migrations',
          orderBy: 'version ASC',
        )).map((row) => row['version']),
        [8, 15],
      );
    },
  );

  test('SQLite scan location store preserves scan state', () async {
    final database = await _openDatabase(tempDir);
    addTearDown(database.close);
    final repository = ScanLocationRepository(
      SqliteScanLocationStore(database),
    );

    final added = await repository.addOrActivate(
      '/Music/Beethoven/',
      now: DateTime.utc(2026, 10, 13),
    );
    await repository.markScanned(
      id: added.single.id,
      fileCount: 7,
      scannedAt: DateTime.utc(2026, 10, 13, 1, 2),
    );
    await repository.setActive(id: added.single.id, isActive: false);

    final loaded = await ScanLocationRepository(
      SqliteScanLocationStore(database),
    ).load();

    expect(loaded, hasLength(1));
    expect(loaded.single.path, '/Music/Beethoven');
    expect(loaded.single.displayName, 'Beethoven');
    expect(loaded.single.lastScanFileCount, 7);
    expect(
      loaded.single.lastScannedAtMillis,
      DateTime.utc(2026, 10, 13, 1, 2).millisecondsSinceEpoch,
    );
    expect(loaded.single.isActive, isFalse);
  });

  test('SQLite metadata candidate store preserves inferred fields', () async {
    final database = await _openDatabase(tempDir);
    addTearDown(database.close);
    final store = SqliteMetadataCandidateStore(database);
    const candidate = MetadataCandidate(
      fileId: 'file-1',
      filePath: '/Music/Dvorak/New World/04 Allegro con fuoco.mp3',
      fileName: '04 Allegro con fuoco.mp3',
      composerText: 'Dvorak',
      workTitleText: 'New World',
      movementText: 'Allegro con fuoco',
      trackNumber: 4,
      confidence: 0.75,
      sourceLabel: '파일명/경로',
      rawPattern: 'path',
      trackTotal: 4,
      albumText: 'Symphony No. 5',
      artistText: 'Carlos Kleiber',
      albumArtistText: 'Vienna Philharmonic',
      genreText: 'Classical',
      year: 1975,
      discNumber: 1,
      discTotal: 1,
      reviewStatus: MetadataReviewStatus.approved,
      hasTagConflict: true,
    );

    await store.save([candidate]);
    final loaded = await SqliteMetadataCandidateStore(database).load();

    expect(loaded, hasLength(1));
    expect(loaded.single.fileId, candidate.fileId);
    expect(loaded.single.composerText, 'Dvorak');
    expect(loaded.single.workTitleText, 'New World');
    expect(loaded.single.movementText, 'Allegro con fuoco');
    expect(loaded.single.trackNumber, 4);
    expect(loaded.single.confidence, 0.75);
    expect(loaded.single.sourceLabel, '파일명/경로');
    expect(loaded.single.rawPattern, 'path');
    expect(loaded.single.trackTotal, 4);
    expect(loaded.single.albumText, 'Symphony No. 5');
    expect(loaded.single.artistText, 'Carlos Kleiber');
    expect(loaded.single.reviewStatus, MetadataReviewStatus.approved);
    expect(loaded.single.hasTagConflict, isTrue);
  });

  test('SQLite audio file track link store preserves track links', () async {
    final database = await _openDatabase(tempDir);
    addTearDown(database.close);
    final repository = AudioFileTrackLinkRepository(
      SqliteAudioFileTrackLinkStore(database),
    );

    await repository.linkFileToTrack(
      fileId: 'file-1',
      trackId: 'track-1',
      linkedAt: DateTime.utc(2026, 10, 13, 3, 4),
    );
    final loaded = await AudioFileTrackLinkRepository(
      SqliteAudioFileTrackLinkStore(database),
    ).load();

    expect(loaded, hasLength(1));
    expect(loaded.single.fileId, 'file-1');
    expect(loaded.single.trackId, 'track-1');
    expect(
      loaded.single.linkedAtMillis,
      DateTime.utc(2026, 10, 13, 3, 4).millisecondsSinceEpoch,
    );
  });

  test('SQLite playback position store replaces and loads progress', () async {
    final database = await _openDatabase(tempDir);
    addTearDown(database.close);
    final store = SqlitePlaybackPositionStore(database);

    await store.save(
      const PlaybackPositionRecord(
        path: '/Music/Beethoven/01.flac',
        positionMillis: 30000,
        durationMillis: 120000,
        updatedAtMillis: 100,
        isCompleted: false,
        fileModifiedAtMillis: 50,
      ),
    );
    await store.save(
      const PlaybackPositionRecord(
        path: '/Music/Beethoven/01.flac',
        positionMillis: 45000,
        durationMillis: 120000,
        updatedAtMillis: 200,
        isCompleted: true,
        fileModifiedAtMillis: 50,
      ),
    );

    final loaded = await store.load('/Music/Beethoven/01.flac');
    expect(loaded?.position, const Duration(seconds: 45));
    expect(loaded?.duration, const Duration(minutes: 2));
    expect(loaded?.updatedAtMillis, 200);
    expect(loaded?.isCompleted, isTrue);
    expect(loaded?.fileModifiedAtMillis, 50);
    expect(await store.load('/Music/missing.flac'), isNull);
  });

  test('SQLite playback history store upserts and queries snapshots', () async {
    final database = await _openDatabase(tempDir);
    addTearDown(database.close);
    final store = SqlitePlaybackHistoryStore(database);
    final older = _historyEntry(
      sessionId: 'older',
      trackId: 'track-1',
      recordingId: 'recording-1',
      lastPlayedAtMillis: 100,
    );
    final newer = _historyEntry(
      sessionId: 'newer',
      trackId: 'track-2',
      recordingId: 'recording-1',
      lastPlayedAtMillis: 300,
      status: PlaybackHistoryStatus.completed,
    );
    await store.save(older);
    await store.save(newer);
    await store.save(
      _historyEntry(
        sessionId: 'older',
        trackId: 'track-1',
        recordingId: 'recording-1',
        lastPlayedAtMillis: 400,
        listenedMillis: 9000,
      ),
    );

    final recent = await store.loadRecent(limit: 1);
    final track = await store.loadForTrack('track-2');
    final work = await store.loadForWork('work-1', limit: 1);
    final recording = await store.loadForRecording('recording-1');

    expect(recent.single.sessionId, 'older');
    expect(recent.single.listenedMillis, 9000);
    expect(track.single.status, PlaybackHistoryStatus.completed);
    expect(work.single.sessionId, 'older');
    expect(recording.map((entry) => entry.sessionId), ['older', 'newer']);
    expect(await store.loadForRecording('missing'), isEmpty);
  });

  test(
    'SQLite playback history removes sessions and preserves positions',
    () async {
      final database = await _openDatabase(tempDir);
      addTearDown(database.close);
      final history = SqlitePlaybackHistoryStore(database);
      final positions = SqlitePlaybackPositionStore(database);
      await history.save(
        _historyEntry(
          sessionId: 'old',
          trackId: 'track-old',
          recordingId: 'recording-old',
          lastPlayedAtMillis: 100,
        ),
      );
      await history.save(
        _historyEntry(
          sessionId: 'boundary',
          trackId: 'track-boundary',
          recordingId: 'recording-new',
          lastPlayedAtMillis: 200,
        ),
      );
      await positions.save(
        const PlaybackPositionRecord(
          path: '/Music/track-old.flac',
          positionMillis: 1000,
          durationMillis: 10000,
          updatedAtMillis: 1,
          isCompleted: false,
        ),
      );

      expect(await history.deleteOlderThan(200), 1);
      expect((await history.loadRecent()).single.sessionId, 'boundary');
      expect(await history.deleteSession('boundary'), isTrue);
      expect(await history.deleteSession('missing'), isFalse);
      expect(await history.deleteAll(), 0);
      expect(await positions.load('/Music/track-old.flac'), isNotNull);
    },
  );

  test(
    'SQLite playback history aggregates work and recording statistics',
    () async {
      final database = await _openDatabase(tempDir);
      addTearDown(database.close);
      final store = SqlitePlaybackHistoryStore(database);
      await store.save(
        _historyEntry(
          sessionId: 'a',
          trackId: 'track-1',
          recordingId: 'recording-1',
          lastPlayedAtMillis: 100,
          listenedMillis: 3000,
        ),
      );
      await store.save(
        _historyEntry(
          sessionId: 'b',
          trackId: 'track-2',
          recordingId: 'recording-2',
          lastPlayedAtMillis: 300,
          listenedMillis: 6000,
          status: PlaybackHistoryStatus.completed,
        ),
      );
      final statistics = await store.loadStatistics(sinceMillis: 200);

      expect(statistics.listenedMillis, 6000);
      expect(statistics.sessionCount, 1);
      expect(statistics.completedSessionCount, 1);
      expect(statistics.distinctTrackCount, 1);
      expect(statistics.workStatistics.single.title, '교향곡 1번');
      expect(statistics.recordingStatistics.single.id, 'recording-2');
    },
  );

  test('SQLite playback history retention preference persists', () async {
    final database = await _openDatabase(tempDir);
    addTearDown(database.close);
    final store = SqlitePlaybackHistoryPreferencesStore(database);

    expect(
      await store.loadRetentionPolicy(),
      PlaybackHistoryRetentionPolicy.keepForever,
    );
    await store.saveRetentionPolicy(PlaybackHistoryRetentionPolicy.days90);
    expect(
      await SqlitePlaybackHistoryPreferencesStore(database)
          .loadRetentionPolicy(),
      PlaybackHistoryRetentionPolicy.days90,
    );
  });

  test(
    'SQLite stores handle a synthetic large local library dataset',
    () async {
      final database = await _openDatabase(tempDir);
      addTearDown(database.close);
      final history = SqlitePlaybackHistoryStore(database);
      final scanned = SqliteScannedAudioStore(database);
      final locations = SqliteScanLocationStore(database);
      final candidates = SqliteMetadataCandidateStore(database);
      final links = SqliteAudioFileTrackLinkStore(database);
      final positions = SqlitePlaybackPositionStore(database);
      final preferences = SqlitePlaybackHistoryPreferencesStore(database);
      final files = [
        for (var index = 0; index < 240; index += 1)
          LocalAudioFile(
            id: 'synthetic-file-$index',
            path: '/Synthetic/Classical/$index.flac',
            format: 'FLAC',
            sizeBytes: 1000 + index,
            modifiedAtMillis: 2000 + index,
            lightweightFingerprint: '${1000 + index}:${2000 + index}',
            importStatus: AudioImportStatus.linked,
          ),
      ];
      await scanned.save(files);
      await preferences.saveRetentionPolicy(
        PlaybackHistoryRetentionPolicy.days90,
      );
      await candidates.save([
        for (final file in files)
          MetadataCandidate(
            fileId: file.id,
            filePath: file.path,
            fileName: 'movement_${file.id}.flac',
            composerText: 'Synthetic composer',
            workTitleText: 'Synthetic work',
            movementText: 'Synthetic movement',
            trackNumber: int.parse(file.id.split('-').last) + 1,
            confidence: 0.75,
          ),
      ]);
      await links.save([
        for (var index = 0; index < files.length; index += 1)
          AudioFileTrackLink(
            fileId: files[index].id,
            trackId: 'synthetic-track-link-$index',
            linkedAtMillis: index,
          ),
      ]);
      for (final file in files) {
        await positions.save(
          PlaybackPositionRecord(
            path: file.path,
            positionMillis: 1000,
            durationMillis: 2000,
            updatedAtMillis: 1,
            isCompleted: false,
          ),
        );
      }
      await locations.save([
        for (var index = 0; index < 12; index += 1)
          ScanLocation(
            id: 'synthetic-location-$index',
            path: '/Synthetic/Classical/$index',
            displayName: 'Synthetic $index',
            createdAtMillis: index,
          ),
      ]);
      for (var index = 0; index < 600; index += 1) {
        await history.save(
          PlaybackHistoryEntry(
            sessionId: 'synthetic-session-$index',
            trackId: 'synthetic-track-${index % 80}',
            recordingId: 'synthetic-recording-${index % 24}',
            workId: 'synthetic-work-${index % 16}',
            path: '/Synthetic/Classical/${index % 240}.flac',
            workTitle: 'Synthetic work ${index % 16}',
            recordingTitle: 'Synthetic recording ${index % 24}',
            trackTitle: 'Synthetic track ${index % 80}',
            startedAtMillis: index,
            lastPlayedAtMillis: 1000 + index,
            listenedMillis: 1000,
            lastPositionMillis: 1000,
            durationMillis: 2000,
            status: index.isEven
                ? PlaybackHistoryStatus.completed
                : PlaybackHistoryStatus.partial,
          ),
        );
      }

      final scannedRepository = ScannedAudioRepository(scanned);
      final observedAfterMove = [
        files.first.copyWith(
          path: '/Synthetic/Moved/0.flac',
          fileName: '0.flac',
        ),
        ...files.skip(2),
      ];
      final firstReconciliation = await scannedRepository.reconcileScan(
        observedAfterMove,
        rootPath: '/Synthetic',
      );
      final secondReconciliation = await scannedRepository.reconcileScan(
        observedAfterMove,
        rootPath: '/Synthetic',
      );

      expect(firstReconciliation.movedCount, 1);
      expect(secondReconciliation.missingCount, 1);
      expect(
        secondReconciliation.files
            .singleWhere((file) => file.id == files.first.id)
            .path,
        '/Synthetic/Moved/0.flac',
      );
      expect(
        secondReconciliation.files
            .singleWhere((file) => file.id == files[1].id)
            .availability,
        AudioFileAvailability.missing,
      );
      expect(await links.load(), hasLength(240));
      expect(await history.loadRecent(limit: 600), hasLength(600));
      expect(
        (await positions.load(files.first.path))?.positionMillis,
        1000,
        reason: '파일 이동 추론은 기존 경로의 재생 위치를 임의로 삭제하지 않는다',
      );

      const replacement = LocalAudioFile(
        id: 'synthetic-replacement',
        path: '/Synthetic/Recovered/1.flac',
        fileName: '1.flac',
        format: 'FLAC',
        sizeBytes: 9001,
        modifiedAtMillis: 9002,
        lightweightFingerprint: '9001:9002',
        importStatus: AudioImportStatus.needsReview,
      );
      await scannedRepository.replaceAll([
        ...secondReconciliation.files,
        replacement,
      ]);
      final reconnected = await scannedRepository.reconnectMissingFile(
        missingFileId: files[1].id,
        replacementFileId: replacement.id,
      );

      expect(reconnected, hasLength(240));
      expect(
        reconnected.singleWhere((file) => file.id == files[1].id).path,
        '/Synthetic/Recovered/1.flac',
      );
      expect(
        (await links.load()).map((link) => link.fileId),
        contains(files[1].id),
      );
      expect(await locations.load(), hasLength(12));
      expect(await candidates.load(), hasLength(240));
      expect(await links.load(), hasLength(240));
      expect((await positions.load(files.first.path))?.positionMillis, 1000);
      expect(await history.loadRecent(), hasLength(10));
      final statistics = await history.loadStatistics(limit: 5);
      expect(statistics.sessionCount, 600);
      expect(statistics.distinctTrackCount, 80);
      expect(statistics.workStatistics, hasLength(5));
      expect(statistics.recordingStatistics, hasLength(5));
      expect(await history.deleteOlderThan(1300), 300);
      expect((await history.loadStatistics()).sessionCount, 300);
      expect(
        (await positions.load(files.first.path))?.positionMillis,
        1000,
        reason: '감상 이력 보관 정리는 재생 위치를 삭제하지 않는다',
      );
      expect(
        await preferences.loadRetentionPolicy(),
        PlaybackHistoryRetentionPolicy.days90,
        reason: '감상 이력 보관 정리는 사용자 보관 설정을 변경하지 않는다',
      );
      final plan = await database.rawQuery(
        'EXPLAIN QUERY PLAN SELECT * FROM playback_history '
        'ORDER BY last_played_at_millis DESC, started_at_millis DESC LIMIT 10',
      );
      expect(plan.join(' '), contains('playback_history_recent_idx'));
    },
  );

  test(
    'seeded SQLite scenarios preserve stores, retention, and migration',
    () async {
      const seed = 20261019;
      const scenarioCount = 8;
      final random = Random(seed);

      for (var scenario = 0; scenario < scenarioCount; scenario += 1) {
        final database = await databaseFactoryFfi.openDatabase(
          '${tempDir.path}/seeded-$scenario.sqlite',
        );
        addTearDown(database.close);
        await const SqliteMigrationRunner().applySchema(database);
        final fileCount = 1 + random.nextInt(6);
        final files = [
          for (var index = 0; index < fileCount; index += 1)
            LocalAudioFile(
              id: 'seed-$seed-$scenario-file-$index',
              path: '/Synthetic/$scenario/$index.flac',
              format: 'FLAC',
            ),
        ];
        await SqliteScannedAudioStore(database).save(files);
        await SqliteScanLocationStore(database).save([
          ScanLocation(
            id: 'seed-$seed-location-$scenario',
            path: '/Synthetic/$scenario',
            displayName: 'Synthetic $scenario',
            createdAtMillis: scenario,
          ),
        ]);
        await SqliteMetadataCandidateStore(database).save([
          for (final file in files)
            MetadataCandidate(
              fileId: file.id,
              filePath: file.path,
              fileName: '${file.id}.flac',
              confidence: 0.5,
            ),
        ]);
        await SqliteAudioFileTrackLinkStore(database).save([
          for (final file in files)
            AudioFileTrackLink(
              fileId: file.id,
              trackId: '${file.id}-track',
              linkedAtMillis: scenario,
            ),
        ]);
        final positions = SqlitePlaybackPositionStore(database);
        final history = SqlitePlaybackHistoryStore(database);
        for (var index = 0; index < files.length; index += 1) {
          final file = files[index];
          await positions.save(
            PlaybackPositionRecord(
              path: file.path,
              positionMillis: 1000 + index,
              durationMillis: 2000,
              updatedAtMillis: scenario,
              isCompleted: false,
            ),
          );
          await history.save(
            PlaybackHistoryEntry(
              sessionId: '${file.id}-session',
              trackId: '${file.id}-track',
              recordingId: 'seed-$scenario-recording',
              workId: 'seed-$scenario-work',
              path: file.path,
              workTitle: 'Synthetic work',
              recordingTitle: 'Synthetic recording',
              trackTitle: 'Synthetic track',
              startedAtMillis: index,
              lastPlayedAtMillis: index,
              listenedMillis: 1000,
              lastPositionMillis: 1000,
              status: PlaybackHistoryStatus.partial,
            ),
          );
        }

        expect(
          await SqliteScannedAudioStore(database).load(),
          hasLength(fileCount),
          reason: 'seed=$seed scenario=$scenario',
        );
        expect(await SqliteScanLocationStore(database).load(), hasLength(1));
        expect(
          await SqliteMetadataCandidateStore(database).load(),
          hasLength(fileCount),
        );
        expect(
          await SqliteAudioFileTrackLinkStore(database).load(),
          hasLength(fileCount),
        );
        expect((await history.loadStatistics()).sessionCount, fileCount);
        await history.deleteOlderThan(fileCount);
        expect(await positions.load(files.first.path), isNotNull);

        final migrated = await const SqliteMigrationRunner()
            .migrateJsonPayloads(
              database,
              _payloads(),
              now: DateTime.utc(2026, 10, 19),
            );
        expect(
          await const SqliteMigrationRunner().migrateJsonPayloads(
            database,
            _payloads(),
            now: DateTime.utc(2026, 10, 20),
          ),
          migrated,
        );
      }
    },
  );

  test('schema migration upgrades version 3 without losing history', () async {
    final database = await databaseFactoryFfi.openDatabase(
      '${tempDir.path}/version-3.sqlite',
    );
    addTearDown(database.close);
    const schema = SqliteStorageSchema();
    await database.execute(schema.migrationTableSql);
    await database.insert('schema_migrations', {
      'version': 3,
      'applied_at_millis': 1,
    });
    for (final table in schema.tables.where(
      (table) => table.name != 'playback_history_preferences',
    )) {
      await database.execute(table.createSql);
    }
    await SqlitePlaybackHistoryStore(database).save(
      _historyEntry(
        sessionId: 'legacy-history',
        trackId: 'legacy-track',
        recordingId: 'legacy-recording',
        lastPlayedAtMillis: 10,
      ),
    );

    await const SqliteMigrationRunner().applySchema(database);
    await const SqliteMigrationRunner().applySchema(database);

    expect(
      (await database.query(
        'schema_migrations',
        orderBy: 'version ASC',
      )).map((row) => row['version']),
      [3, 15],
    );
    expect(
      (await SqlitePlaybackHistoryStore(
        database,
      ).loadRecent()).single.sessionId,
      'legacy-history',
    );
    expect(
      await SqlitePlaybackHistoryPreferencesStore(database)
          .loadRetentionPolicy(),
      PlaybackHistoryRetentionPolicy.keepForever,
    );
  });

  test(
    'schema migration upgrades version 4 columns without losing rows',
    () async {
      final database = await databaseFactoryFfi.openDatabase(
        '${tempDir.path}/version-4.sqlite',
      );
      addTearDown(database.close);
      const schema = SqliteStorageSchema();
      await database.execute(schema.migrationTableSql);
      await database.insert('schema_migrations', {
        'version': 4,
        'applied_at_millis': 1,
      });
      await database.execute('''
CREATE TABLE scanned_audio_files (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  file_name TEXT,
  format TEXT NOT NULL,
  size_bytes INTEGER,
  modified_at_millis INTEGER,
  import_status TEXT NOT NULL,
  source_references_json TEXT NOT NULL
);''');
      await database.execute('''
CREATE TABLE metadata_candidates (
  file_id TEXT PRIMARY KEY,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  composer_text TEXT,
  work_title_text TEXT,
  movement_text TEXT,
  track_number INTEGER,
  confidence REAL NOT NULL DEFAULT 0,
  source_label TEXT NOT NULL,
  raw_pattern TEXT
);''');
      await database.insert('scanned_audio_files', {
        'id': 'legacy-file',
        'path': '/Music/legacy.flac',
        'file_name': 'legacy.flac',
        'format': 'FLAC',
        'size_bytes': 10,
        'modified_at_millis': 20,
        'import_status': 'linked',
        'source_references_json': '[]',
      });
      await database.insert('metadata_candidates', {
        'file_id': 'legacy-file',
        'file_path': '/Music/legacy.flac',
        'file_name': 'legacy.flac',
        'composer_text': 'Beethoven',
        'work_title_text': 'Symphony No. 5',
        'movement_text': 'Allegro',
        'track_number': 1,
        'confidence': 1.0,
        'source_label': '파일명/경로',
        'raw_pattern': 'path',
      });

      await const SqliteMigrationRunner().applySchema(database);
      await const SqliteMigrationRunner().applySchema(database);

      final file = (await SqliteScannedAudioStore(database).load()).single;
      final candidate = (await SqliteMetadataCandidateStore(
        database,
      ).load()).single;
      expect(file.id, 'legacy-file');
      expect(file.availability, AudioFileAvailability.present);
      expect(file.tagReadStatus, AudioTagReadStatus.noTags);
      expect(candidate.composerText, 'Beethoven');
      expect(candidate.reviewStatus, MetadataReviewStatus.needsReview);
      expect(
        (await database.query(
          'schema_migrations',
          orderBy: 'version ASC',
        )).map((row) => row['version']),
        [4, 15],
      );
    },
  );

  test('JSON fixture migrates into SQLite and is idempotent', () async {
    final database = await _openDatabase(tempDir);
    addTearDown(database.close);
    const runner = SqliteMigrationRunner();
    final payloads = _payloads();

    final firstCount = await runner.migrateJsonPayloads(
      database,
      payloads,
      now: DateTime.utc(2026, 10, 13),
    );
    await SqliteScanLocationStore(database).save([
      ScanLocation(
        id: scanLocationId('/Music/Beethoven'),
        path: '/Music/Beethoven',
        displayName: 'Beethoven',
        createdAtMillis: 1791870000000,
        lastScannedAtMillis: 1791870180000,
        lastScanFileCount: 9,
        isActive: false,
      ),
    ]);
    final secondCount = await runner.migrateJsonPayloads(
      database,
      payloads,
      now: DateTime.utc(2026, 10, 14),
    );

    expect(firstCount, 4);
    expect(secondCount, 4);
    expect(await _tableCount(database, 'scanned_audio_files'), 1);
    expect(await _tableCount(database, 'scan_locations'), 1);
    expect(await _tableCount(database, 'metadata_candidates'), 1);
    expect(await _tableCount(database, 'audio_file_track_links'), 1);
    expect(await _tableCount(database, 'json_store_migrations'), 1);

    expect(
      (await SqliteScannedAudioStore(database).load()).single.path,
      '/Music/Beethoven/Symphony 5/01 Allegro.flac',
    );
    expect(
      (await SqliteScanLocationStore(database).load()).single.path,
      '/Music/Beethoven',
    );
    expect(
      (await SqliteScanLocationStore(database).load()).single.lastScanFileCount,
      9,
    );
    expect(
      (await SqliteScanLocationStore(database).load()).single.isActive,
      isFalse,
    );
    expect(
      (await SqliteMetadataCandidateStore(database).load()).single.composerText,
      'Beethoven',
    );
    expect(
      (await SqliteAudioFileTrackLinkStore(database).load()).single.trackId,
      'track-1',
    );
  });

  test(
    'JSON files migrate from support directory without deleting originals',
    () async {
      final database = await _openDatabase(tempDir);
      addTearDown(database.close);
      final payloads = _payloads();
      final scanFile = File('${tempDir.path}/classical_local_scan.json');
      await scanFile.writeAsString(_json(payloads.scannedAudioPayload));
      await File('${tempDir.path}/classical_local_scan_locations.json')
          .writeAsString(_json(payloads.scanLocationPayload));
      await File('${tempDir.path}/classical_local_metadata_candidates.json')
          .writeAsString(_json(payloads.metadataCandidatePayload));
      await File('${tempDir.path}/classical_local_file_links.json')
          .writeAsString(_json(payloads.fileTrackLinkPayload));

      final migrated = await const SqliteMigrationRunner().migrateJsonDirectory(
        database,
        tempDir,
      );

      expect(migrated, 4);
      expect(await scanFile.exists(), isTrue);
      expect(await _tableCount(database, 'scanned_audio_files'), 1);
    },
  );

  test('SQLite MusicBrainz cache persists and removes expired rows', () async {
    final database = await _openDatabase(tempDir);
    addTearDown(database.close);
    final store = SqliteMusicBrainzCacheStore(database);
    const entry = MusicBrainzCacheEntry(
      key: 'search:v1:test',
      payloadJson: '[]',
      storedAtMillis: 100,
      expiresAtMillis: 200,
      isNegative: true,
    );

    await store.write(entry);
    expect((await store.read(entry.key))?.isNegative, isTrue);
    expect(await store.deleteExpired(199), 0);
    expect(await store.deleteExpired(200), 1);
    expect(await store.read(entry.key), isNull);
  });

  test(
    'schema migration upgrades v10 merge audits without data loss',
    () async {
      final database = await databaseFactoryFfi.openDatabase(
        '${tempDir.path}/v10.sqlite',
      );
      addTearDown(database.close);
      await database.execute(const SqliteStorageSchema().migrationTableSql);
      await database.insert('schema_migrations', {
        'version': 10,
        'applied_at_millis': 1,
      });
      await database.execute('''
CREATE TABLE library_entity_merges (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  source_label TEXT NOT NULL,
  target_label TEXT NOT NULL,
  merged_at_millis INTEGER NOT NULL,
  evidence_json TEXT NOT NULL,
  UNIQUE(entity_type, source_id)
);''');
      await database.insert('library_entity_merges', {
        'id': 'legacy-merge',
        'entity_type': 'work',
        'source_id': 'source',
        'target_id': 'target',
        'source_label': 'Source',
        'target_label': 'Target',
        'merged_at_millis': 1,
        'evidence_json': '[]',
      });

      await const SqliteMigrationRunner().applySchema(database);

      final columns = (await database.rawQuery(
        'PRAGMA table_info(library_entity_merges)',
      )).map((row) => row['name']);
      expect(columns, containsAll(['undo_snapshot_json', 'undone_at_millis']));
      expect(await _tableCount(database, 'library_entity_merges'), 1);
      expect(await _tableCount(database, 'musicbrainz_cache'), 0);
      expect(await _tableCount(database, 'catalog_works'), 0);
      expect(
        (await database.query(
          'schema_migrations',
          orderBy: 'version',
        )).map((row) => row['version']),
        [10, 15],
      );
    },
  );

  test('schema migration upgrades v11 to v15 without data loss', () async {
    final database = await _openDatabase(tempDir);
    addTearDown(database.close);
    await database.insert('playback_history_preferences', {
      'id': 1,
      'retention_policy': 'forever',
    });
    await database.delete('schema_migrations');
    await database.insert('schema_migrations', {
      'version': 11,
      'applied_at_millis': 1,
    });
    for (final table in [
      'catalog_recording_credits',
      'catalog_tracks',
      'catalog_recordings',
      'catalog_work_parts',
      'catalog_works',
      'catalog_albums',
      'catalog_ensembles',
      'catalog_instruments',
      'catalog_people',
      'app_reset_state',
    ]) {
      await database.execute('DROP TABLE $table');
    }

    await const SqliteMigrationRunner().applySchema(database);

    expect(
      (await database.query('playback_history_preferences'))
          .single['retention_policy'],
      'forever',
    );
    expect(await _tableCount(database, 'catalog_people'), 0);
    expect(await _tableCount(database, 'catalog_tracks'), 0);
    expect(await _tableCount(database, 'app_reset_state'), 0);
    expect(
      (await database.query(
        'schema_migrations',
        orderBy: 'version',
      )).map((row) => row['version']),
      [11, 15],
    );
  });

  test('schema migration upgrades v13 with additive queue state', () async {
    final database = await _openDatabase(tempDir);
    addTearDown(database.close);
    await database.insert('playback_history_preferences', {
      'id': 1,
      'retention_policy': 'days90',
    });
    await database.delete('schema_migrations');
    await database.insert('schema_migrations', {
      'version': 13,
      'applied_at_millis': 1,
    });
    await database.execute('DROP TABLE playback_queue_state');

    await const SqliteMigrationRunner().applySchema(database);

    expect(
      (await database.query('playback_history_preferences'))
          .single['retention_policy'],
      'days90',
    );
    expect(await _tableCount(database, 'playback_queue_state'), 0);
    expect(
      (await database.query(
        'schema_migrations',
        orderBy: 'version',
      )).map((row) => row['version']),
      [13, 15],
    );
  });
}

Future<Database> _openDatabase(Directory directory) {
  return ClassicalLocalDatabase(
    path: '${directory.path}/test.sqlite',
    factory: databaseFactoryFfi,
  ).open();
}

Future<int> _tableCount(Database database, String table) async {
  final result = await database.rawQuery(
    'SELECT COUNT(*) AS count FROM $table',
  );
  return result.single['count']! as int;
}

JsonStorePayloads _payloads() {
  final file = _audioFile('/Music/Beethoven/Symphony 5/01 Allegro.flac');
  final location = ScanLocation(
    id: scanLocationId('/Music/Beethoven'),
    path: '/Music/Beethoven',
    displayName: 'Beethoven',
    createdAtMillis: 1791870000000,
    lastScannedAtMillis: 1791870060000,
    lastScanFileCount: 1,
  );
  final candidate = const MetadataCandidate(
    fileId: 'file-1',
    filePath: '/Music/Beethoven/Symphony 5/01 Allegro.flac',
    fileName: '01 Allegro.flac',
    composerText: 'Beethoven',
    workTitleText: 'Symphony 5',
    movementText: 'Allegro',
    trackNumber: 1,
    confidence: 1,
    rawPattern: 'path',
  );
  const link = AudioFileTrackLink(
    fileId: 'file-1',
    trackId: 'track-1',
    linkedAtMillis: 1791870120000,
  );

  return JsonStorePayloads(
    scannedAudioPayload: {
      'schemaVersion': 1,
      'files': [file.toJson()],
    },
    scanLocationPayload: {
      'schemaVersion': 1,
      'locations': [location.toJson()],
    },
    metadataCandidatePayload: {
      'schemaVersion': 1,
      'candidates': [candidate.toJson()],
    },
    fileTrackLinkPayload: {
      'schemaVersion': 1,
      'links': [link.toJson()],
    },
  );
}

LocalAudioFile _audioFile(String path) {
  return LocalAudioFile(
    id: 'file-1',
    path: path,
    fileName: fileNameForPath(path),
    format: 'FLAC',
    sizeBytes: 1024,
    modifiedAtMillis: 1791870000000,
    lastSeenAtMillis: 1791870060000,
    consecutiveMissCount: 2,
    availability: AudioFileAvailability.missing,
    lightweightFingerprint: '1024:1791870000000',
    tagReadStatus: AudioTagReadStatus.failed,
    tagMetadata: const AudioTagMetadata(
      title: 'Allegro con brio',
      album: 'Symphony No. 5',
      trackNumber: 1,
      trackTotal: 4,
    ),
    tagFailureKind: AudioTagFailureKind.unreadable,
    importStatus: AudioImportStatus.needsReview,
    sourceReferences: const [SourceReference(kind: SourceKind.localTag)],
  );
}

String _json(Map<String, Object?> payload) {
  return jsonEncode(payload);
}

PlaybackHistoryEntry _historyEntry({
  required String sessionId,
  required String trackId,
  required String recordingId,
  required int lastPlayedAtMillis,
  int listenedMillis = 5000,
  PlaybackHistoryStatus status = PlaybackHistoryStatus.partial,
}) {
  return PlaybackHistoryEntry(
    sessionId: sessionId,
    trackId: trackId,
    recordingId: recordingId,
    workId: 'work-1',
    path: '/Music/$trackId.flac',
    workTitle: '교향곡 1번',
    recordingTitle: '첫 녹음',
    trackTitle: trackId,
    startedAtMillis: 10,
    lastPlayedAtMillis: lastPlayedAtMillis,
    listenedMillis: listenedMillis,
    lastPositionMillis: 30000,
    durationMillis: 180000,
    status: status,
  );
}
