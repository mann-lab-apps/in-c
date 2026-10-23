import 'dart:convert';
import 'dart:io';

import 'package:sqflite/sqflite.dart' as sqflite;

import 'audio_tags.dart';
import 'classical_library_models.dart';
import 'file_links.dart';
import 'imslp.dart';
import 'local_audio_import.dart';
import 'metadata_candidates.dart';
import 'metadata_overrides.dart';
import 'musicbrainz.dart';
import 'playback_history.dart';
import 'local_playback.dart';
import 'playback_position.dart';
import 'scan_locations.dart';
import 'scanned_audio_store.dart';
import 'sqlite_migration.dart';

const classicalLocalDatabaseFileName = 'classical_local_library.sqlite';

class ClassicalLocalDatabase {
  const ClassicalLocalDatabase({
    required this.path,
    this.factory,
    this.schema = const SqliteStorageSchema(),
  });

  final String path;
  final sqflite.DatabaseFactory? factory;
  final SqliteStorageSchema schema;

  Future<sqflite.Database> open() async {
    final database = await (factory ?? sqflite.databaseFactory).openDatabase(
      path,
    );
    await database.execute('PRAGMA foreign_keys = ON');
    await SqliteMigrationRunner(schema: schema).applySchema(database);
    return database;
  }
}

class SqliteMigrationRunner {
  const SqliteMigrationRunner({
    this.schema = const SqliteStorageSchema(),
    this.planner = const JsonToSqliteMigrationPlanner(),
  });

  final SqliteStorageSchema schema;
  final JsonToSqliteMigrationPlanner planner;

  Future<void> applySchema(sqflite.Database database, {DateTime? now}) async {
    final appliedAt = (now ?? DateTime.now()).millisecondsSinceEpoch;
    await database.execute(schema.migrationTableSql);
    await database.execute(schema.jsonMigrationTableSql);

    final existing = await database.query(
      'schema_migrations',
      columns: ['version'],
      where: 'version = ?',
      whereArgs: [schema.version],
      limit: 1,
    );
    if (existing.isNotEmpty) {
      return;
    }

    for (final table in schema.tables) {
      await database.execute(table.createSql);
    }
    if (schema.version >= 5) {
      await _ensureVersion5Columns(database);
    }
    if (schema.version >= 9) {
      await _ensureVersion9Columns(database);
    }
    if (schema.version >= 11) {
      await _ensureVersion11Columns(database);
      await _ensureVersion11MergeAuditHistory(database);
    }
    for (final indexSql in schema.indexSql) {
      await database.execute(indexSql);
    }
    await database.insert('schema_migrations', {
      'version': schema.version,
      'applied_at_millis': appliedAt,
    }, conflictAlgorithm: sqflite.ConflictAlgorithm.ignore);
  }

  Future<void> _ensureVersion5Columns(sqflite.Database database) async {
    const additions = <String, Map<String, String>>{
      'scanned_audio_files': {
        'last_seen_at_millis': 'INTEGER',
        'consecutive_miss_count': 'INTEGER NOT NULL DEFAULT 0',
        'availability': "TEXT NOT NULL DEFAULT 'present'",
        'lightweight_fingerprint': 'TEXT',
        'tag_read_status': "TEXT NOT NULL DEFAULT 'noTags'",
        'tag_metadata_json': 'TEXT',
        'tag_failure_kind': 'TEXT',
      },
      'metadata_candidates': {
        'track_total': 'INTEGER',
        'album_text': 'TEXT',
        'artist_text': 'TEXT',
        'album_artist_text': 'TEXT',
        'genre_text': 'TEXT',
        'year': 'INTEGER',
        'disc_number': 'INTEGER',
        'disc_total': 'INTEGER',
        'review_status': "TEXT NOT NULL DEFAULT 'needsReview'",
        'has_tag_conflict': 'INTEGER NOT NULL DEFAULT 0',
      },
    };
    for (final table in additions.entries) {
      final columns = (await database.rawQuery(
        'PRAGMA table_info(${table.key})',
      )).map((row) => row['name']).toSet();
      for (final column in table.value.entries) {
        if (!columns.contains(column.key)) {
          await database.execute(
            'ALTER TABLE ${table.key} ADD COLUMN ${column.key} ${column.value}',
          );
        }
      }
    }
  }

  Future<void> _ensureVersion9Columns(sqflite.Database database) async {
    final columns = (await database.rawQuery(
      'PRAGMA table_info(metadata_overrides)',
    )).map((row) => row['name']).toSet();
    const additions = <String, String>{
      'fallback_values_json': "TEXT NOT NULL DEFAULT '{}'",
      'fallback_sources_json': "TEXT NOT NULL DEFAULT '{}'",
    };
    for (final entry in additions.entries) {
      if (!columns.contains(entry.key)) {
        await database.execute(
          'ALTER TABLE metadata_overrides ADD COLUMN ${entry.key} ${entry.value}',
        );
      }
    }
  }

  Future<void> _ensureVersion11Columns(sqflite.Database database) async {
    final columns = (await database.rawQuery(
      'PRAGMA table_info(library_entity_merges)',
    )).map((row) => row['name']).toSet();
    const additions = <String, String>{
      'undo_snapshot_json': "TEXT NOT NULL DEFAULT '{}'",
      'undone_at_millis': 'INTEGER',
    };
    for (final entry in additions.entries) {
      if (!columns.contains(entry.key)) {
        await database.execute(
          'ALTER TABLE library_entity_merges ADD COLUMN ${entry.key} ${entry.value}',
        );
      }
    }
  }

  Future<void> _ensureVersion11MergeAuditHistory(
    sqflite.Database database,
  ) async {
    final definitions = await database.query(
      'sqlite_master',
      columns: ['sql'],
      where: "type = 'table' AND name = 'library_entity_merges'",
      limit: 1,
    );
    final sql = definitions.isEmpty
        ? ''
        : (definitions.single['sql'] as String? ?? '').toLowerCase();
    if (!sql.contains('unique(entity_type, source_id)') &&
        !sql.contains('unique (entity_type, source_id)')) {
      return;
    }
    final createSql = schema.tables
        .firstWhere((table) => table.name == 'library_entity_merges')
        .createSql;
    await database.transaction((transaction) async {
      await transaction.execute(
        'ALTER TABLE library_entity_merges RENAME TO library_entity_merges_v10',
      );
      await transaction.execute(createSql);
      await transaction.execute('''
INSERT INTO library_entity_merges (
  id, entity_type, source_id, target_id, source_label, target_label,
  merged_at_millis, evidence_json, undo_snapshot_json, undone_at_millis
)
SELECT
  id, entity_type, source_id, target_id, source_label, target_label,
  merged_at_millis, evidence_json, undo_snapshot_json, undone_at_millis
FROM library_entity_merges_v10;''');
      await transaction.execute('DROP TABLE library_entity_merges_v10');
    });
  }

  Future<int> migrateJsonPayloads(
    sqflite.Database database,
    JsonStorePayloads payloads, {
    DateTime? now,
  }) async {
    await applySchema(database, now: now);
    final existing = await database.query(
      'json_store_migrations',
      columns: ['row_count'],
      where: 'id = ?',
      whereArgs: ['json-store-v1'],
      limit: 1,
    );
    if (existing.isNotEmpty) {
      return existing.single['row_count']! as int;
    }

    final seedData = planner.buildSeedData(payloads);

    await database.transaction((transaction) async {
      for (final entry in seedData.rowsByTable.entries) {
        for (final row in entry.value) {
          await transaction.insert(
            entry.key,
            row,
            conflictAlgorithm: sqflite.ConflictAlgorithm.replace,
          );
        }
      }
      await transaction.insert('json_store_migrations', {
        'id': 'json-store-v1',
        'applied_at_millis': (now ?? DateTime.now()).millisecondsSinceEpoch,
        'row_count': seedData.totalRowCount,
      }, conflictAlgorithm: sqflite.ConflictAlgorithm.replace);
    });

    return seedData.totalRowCount;
  }

  Future<int> migrateJsonDirectory(
    sqflite.Database database,
    Directory directory, {
    DateTime? now,
  }) async {
    final payloads = await const JsonStorePayloadReader().readFromDirectory(
      directory,
    );
    return migrateJsonPayloads(database, payloads, now: now);
  }
}

class SqliteScannedAudioStore implements ScannedAudioStore {
  const SqliteScannedAudioStore(this.database);

  final sqflite.Database database;

  @override
  Future<List<LocalAudioFile>> load() async {
    final rows = await database.query(
      'scanned_audio_files',
      orderBy: 'path ASC',
    );
    return [for (final row in rows) _fileFromRow(row)];
  }

  @override
  Future<void> save(List<LocalAudioFile> files) async {
    await database.transaction((transaction) async {
      await transaction.delete('scanned_audio_files');
      for (final file in files) {
        await transaction.insert(
          'scanned_audio_files',
          _fileRow(file),
          conflictAlgorithm: sqflite.ConflictAlgorithm.replace,
        );
      }
    });
  }

  Map<String, Object?> _fileRow(LocalAudioFile file) {
    return {
      'id': file.id,
      'path': file.path,
      'file_name': file.fileName,
      'format': file.format,
      'size_bytes': file.sizeBytes,
      'modified_at_millis': file.modifiedAtMillis,
      'last_seen_at_millis': file.lastSeenAtMillis,
      'consecutive_miss_count': file.consecutiveMissCount,
      'availability': file.availability.name,
      'lightweight_fingerprint': file.lightweightFingerprint,
      'tag_read_status': file.tagReadStatus.name,
      'tag_metadata_json': file.tagMetadata == null
          ? null
          : jsonEncode(file.tagMetadata!.toJson()),
      'tag_failure_kind': file.tagFailureKind?.name,
      'import_status': file.importStatus.name,
      'source_references_json': jsonEncode([
        for (final reference in file.sourceReferences) reference.toJson(),
      ]),
    };
  }

  LocalAudioFile _fileFromRow(Map<String, Object?> row) {
    return LocalAudioFile(
      id: row['id']! as String,
      path: row['path']! as String,
      fileName: row['file_name'] as String?,
      format: row['format']! as String,
      sizeBytes: row['size_bytes'] as int?,
      modifiedAtMillis: row['modified_at_millis'] as int?,
      lastSeenAtMillis: row['last_seen_at_millis'] as int?,
      consecutiveMissCount: row['consecutive_miss_count'] as int? ?? 0,
      availability: AudioFileAvailability.values.byName(
        row['availability'] as String? ?? AudioFileAvailability.present.name,
      ),
      lightweightFingerprint: row['lightweight_fingerprint'] as String?,
      tagReadStatus: AudioTagReadStatus.values.byName(
        row['tag_read_status'] as String? ?? AudioTagReadStatus.noTags.name,
      ),
      tagMetadata: row['tag_metadata_json'] == null
          ? null
          : AudioTagMetadata.fromJson(
              jsonDecode(row['tag_metadata_json']! as String)
                  as Map<String, Object?>,
            ),
      tagFailureKind: row['tag_failure_kind'] == null
          ? null
          : AudioTagFailureKind.values.byName(
              row['tag_failure_kind']! as String,
            ),
      importStatus: AudioImportStatus.values.byName(
        row['import_status']! as String,
      ),
      sourceReferences: [
        for (final source in jsonDecode(
          row['source_references_json']! as String,
        ) as List<Object?>)
          SourceReference.fromJson(source! as Map<String, Object?>),
      ],
    );
  }
}

class SqliteScanLocationStore implements ScanLocationStore {
  const SqliteScanLocationStore(this.database);

  final sqflite.Database database;

  @override
  Future<List<ScanLocation>> load() async {
    final rows = await database.query('scan_locations', orderBy: 'path ASC');
    return [for (final row in rows) _locationFromRow(row)];
  }

  @override
  Future<void> save(List<ScanLocation> locations) async {
    await database.transaction((transaction) async {
      await transaction.delete('scan_locations');
      for (final location in locations) {
        await transaction.insert(
          'scan_locations',
          _locationRow(location),
          conflictAlgorithm: sqflite.ConflictAlgorithm.replace,
        );
      }
    });
  }

  Map<String, Object?> _locationRow(ScanLocation location) {
    return {
      'id': location.id,
      'path': location.path,
      'display_name': location.displayName,
      'created_at_millis': location.createdAtMillis,
      'last_scanned_at_millis': location.lastScannedAtMillis,
      'last_scan_file_count': location.lastScanFileCount,
      'is_active': location.isActive ? 1 : 0,
    };
  }

  ScanLocation _locationFromRow(Map<String, Object?> row) {
    return ScanLocation(
      id: row['id']! as String,
      path: row['path']! as String,
      displayName: row['display_name']! as String,
      createdAtMillis: row['created_at_millis']! as int,
      lastScannedAtMillis: row['last_scanned_at_millis'] as int?,
      lastScanFileCount: row['last_scan_file_count']! as int,
      isActive: (row['is_active']! as int) == 1,
    );
  }
}

class SqliteMetadataCandidateStore implements MetadataCandidateStore {
  const SqliteMetadataCandidateStore(this.database);

  final sqflite.Database database;

  @override
  Future<List<MetadataCandidate>> load() async {
    final rows = await database.query(
      'metadata_candidates',
      orderBy: 'file_path ASC',
    );
    return [for (final row in rows) _candidateFromRow(row)];
  }

  @override
  Future<void> save(List<MetadataCandidate> candidates) async {
    await database.transaction((transaction) async {
      await transaction.delete('metadata_candidates');
      for (final candidate in candidates) {
        await transaction.insert(
          'metadata_candidates',
          _candidateRow(candidate),
          conflictAlgorithm: sqflite.ConflictAlgorithm.replace,
        );
      }
    });
  }

  Map<String, Object?> _candidateRow(MetadataCandidate candidate) {
    return {
      'file_id': candidate.fileId,
      'file_path': candidate.filePath,
      'file_name': candidate.fileName,
      'composer_text': candidate.composerText,
      'work_title_text': candidate.workTitleText,
      'movement_text': candidate.movementText,
      'track_number': candidate.trackNumber,
      'track_total': candidate.trackTotal,
      'album_text': candidate.albumText,
      'artist_text': candidate.artistText,
      'album_artist_text': candidate.albumArtistText,
      'genre_text': candidate.genreText,
      'year': candidate.year,
      'disc_number': candidate.discNumber,
      'disc_total': candidate.discTotal,
      'confidence': candidate.confidence,
      'source_label': candidate.sourceLabel,
      'raw_pattern': candidate.rawPattern,
      'review_status': candidate.reviewStatus.name,
      'has_tag_conflict': candidate.hasTagConflict ? 1 : 0,
    };
  }

  MetadataCandidate _candidateFromRow(Map<String, Object?> row) {
    return MetadataCandidate(
      fileId: row['file_id']! as String,
      filePath: row['file_path']! as String,
      fileName: row['file_name']! as String,
      composerText: row['composer_text'] as String?,
      workTitleText: row['work_title_text'] as String?,
      movementText: row['movement_text'] as String?,
      trackNumber: row['track_number'] as int?,
      trackTotal: row['track_total'] as int?,
      albumText: row['album_text'] as String?,
      artistText: row['artist_text'] as String?,
      albumArtistText: row['album_artist_text'] as String?,
      genreText: row['genre_text'] as String?,
      year: row['year'] as int?,
      discNumber: row['disc_number'] as int?,
      discTotal: row['disc_total'] as int?,
      confidence: (row['confidence']! as num).toDouble(),
      sourceLabel: row['source_label']! as String,
      rawPattern: row['raw_pattern'] as String?,
      reviewStatus: MetadataReviewStatus.values.byName(
        row['review_status'] as String? ??
            MetadataReviewStatus.needsReview.name,
      ),
      hasTagConflict: (row['has_tag_conflict'] as int? ?? 0) == 1,
    );
  }
}

class SqliteMetadataOverrideStore implements MetadataOverrideStore {
  const SqliteMetadataOverrideStore(this.database);

  final sqflite.Database database;

  @override
  Future<List<MetadataOverride>> load() async {
    final rows = await database.query(
      'metadata_overrides',
      orderBy: 'updated_at_millis DESC',
    );
    return [for (final row in rows) _fromRow(row)];
  }

  @override
  Future<void> upsert(MetadataOverride override) async {
    await database.insert('metadata_overrides', {
      'file_id': override.fileId,
      'values_json': jsonEncode({
        for (final entry in override.values.entries)
          entry.key.name: entry.value,
      }),
      'sources_json': jsonEncode({
        for (final entry in override.sources.entries)
          entry.key.name: entry.value.name,
      }),
      'fallback_values_json': jsonEncode({
        for (final entry in override.fallbackValues.entries)
          entry.key.name: entry.value,
      }),
      'fallback_sources_json': jsonEncode({
        for (final entry in override.fallbackSources.entries)
          entry.key.name: entry.value.name,
      }),
      'updated_at_millis': override.updatedAtMillis,
      'musicbrainz_recording_id': override.musicBrainzRecordingId,
      'musicbrainz_work_id': override.musicBrainzWorkId,
      'musicbrainz_release_id': override.musicBrainzReleaseId,
    }, conflictAlgorithm: sqflite.ConflictAlgorithm.replace);
  }

  @override
  Future<void> delete(String fileId) async {
    await database.delete(
      'metadata_overrides',
      where: 'file_id = ?',
      whereArgs: [fileId],
    );
  }

  MetadataOverride _fromRow(Map<String, Object?> row) {
    final rawValues =
        jsonDecode(row['values_json']! as String) as Map<String, Object?>;
    final rawSources =
        jsonDecode(row['sources_json']! as String) as Map<String, Object?>;
    final rawFallbackValues = jsonDecode(
      row['fallback_values_json']! as String,
    ) as Map<String, Object?>;
    final rawFallbackSources = jsonDecode(
      row['fallback_sources_json']! as String,
    ) as Map<String, Object?>;
    final values = <MetadataField, Object>{};
    final sources = <MetadataField, MetadataValueSource>{};
    final fallbackValues = <MetadataField, Object>{};
    final fallbackSources = <MetadataField, MetadataValueSource>{};
    for (final entry in rawValues.entries) {
      final field = MetadataField.values.byName(entry.key);
      final value = entry.value;
      if (value != null) values[field] = value;
    }
    for (final entry in rawSources.entries) {
      sources[MetadataField.values.byName(entry.key)] = MetadataValueSource
          .values
          .byName(entry.value! as String);
    }
    for (final entry in rawFallbackValues.entries) {
      final value = entry.value;
      if (value != null) {
        fallbackValues[MetadataField.values.byName(entry.key)] = value;
      }
    }
    for (final entry in rawFallbackSources.entries) {
      fallbackSources[MetadataField.values.byName(entry.key)] =
          MetadataValueSource.values.byName(entry.value! as String);
    }
    return MetadataOverride(
      fileId: row['file_id']! as String,
      values: values,
      sources: sources,
      fallbackValues: fallbackValues,
      fallbackSources: fallbackSources,
      updatedAtMillis: row['updated_at_millis']! as int,
      musicBrainzRecordingId: row['musicbrainz_recording_id'] as String?,
      musicBrainzWorkId: row['musicbrainz_work_id'] as String?,
      musicBrainzReleaseId: row['musicbrainz_release_id'] as String?,
    );
  }
}

class SqliteAudioFileTrackLinkStore implements AudioFileTrackLinkStore {
  const SqliteAudioFileTrackLinkStore(this.database);

  final sqflite.Database database;

  @override
  Future<List<AudioFileTrackLink>> load() async {
    final rows = await database.query(
      'audio_file_track_links',
      orderBy: 'track_id ASC',
    );
    return [for (final row in rows) _linkFromRow(row)];
  }

  @override
  Future<void> save(List<AudioFileTrackLink> links) async {
    await database.transaction((transaction) async {
      await transaction.delete('audio_file_track_links');
      for (final link in links) {
        await transaction.insert(
          'audio_file_track_links',
          _linkRow(link),
          conflictAlgorithm: sqflite.ConflictAlgorithm.replace,
        );
      }
    });
  }

  Map<String, Object?> _linkRow(AudioFileTrackLink link) {
    return {
      'file_id': link.fileId,
      'track_id': link.trackId,
      'linked_at_millis': link.linkedAtMillis,
    };
  }

  AudioFileTrackLink _linkFromRow(Map<String, Object?> row) {
    return AudioFileTrackLink(
      fileId: row['file_id']! as String,
      trackId: row['track_id']! as String,
      linkedAtMillis: row['linked_at_millis']! as int,
    );
  }
}

class SqlitePlaybackPositionStore implements PlaybackPositionStore {
  const SqlitePlaybackPositionStore(this.database);

  final sqflite.Database database;

  @override
  Future<PlaybackPositionRecord?> load(String path) async {
    final rows = await database.query(
      'playback_positions',
      where: 'path = ?',
      whereArgs: [path],
      limit: 1,
    );
    if (rows.isEmpty) {
      return null;
    }
    final row = rows.single;
    return PlaybackPositionRecord(
      path: row['path']! as String,
      positionMillis: row['position_millis']! as int,
      durationMillis: row['duration_millis'] as int?,
      updatedAtMillis: row['updated_at_millis']! as int,
      isCompleted: (row['is_completed']! as int) == 1,
      fileModifiedAtMillis: row['file_modified_at_millis'] as int?,
    );
  }

  @override
  Future<void> save(PlaybackPositionRecord position) async {
    await database.insert('playback_positions', {
      'path': position.path,
      'position_millis': position.positionMillis,
      'duration_millis': position.durationMillis,
      'updated_at_millis': position.updatedAtMillis,
      'is_completed': position.isCompleted ? 1 : 0,
      'file_modified_at_millis': position.fileModifiedAtMillis,
    }, conflictAlgorithm: sqflite.ConflictAlgorithm.replace);
  }
}

class SqlitePlaybackQueueSnapshotStore implements PlaybackQueueSnapshotStore {
  const SqlitePlaybackQueueSnapshotStore(this.database);

  final sqflite.Database database;

  @override
  Future<PlaybackQueueSnapshot?> load() async {
    final rows = await database.query(
      'playback_queue_state',
      where: 'id = 1',
      limit: 1,
    );
    if (rows.isEmpty) return null;
    final row = rows.single;
    return PlaybackQueueSnapshot(
      trackIds: (jsonDecode(row['track_ids_json']! as String) as List<Object?>)
          .whereType<String>()
          .toList(),
      currentTrackId: row['current_track_id'] as String?,
      savedAtMillis: row['saved_at_millis']! as int,
    );
  }

  @override
  Future<void> save(PlaybackQueueSnapshot snapshot) {
    return database.insert('playback_queue_state', {
      'id': 1,
      'track_ids_json': jsonEncode(snapshot.trackIds),
      'current_track_id': snapshot.currentTrackId,
      'saved_at_millis': snapshot.savedAtMillis,
    }, conflictAlgorithm: sqflite.ConflictAlgorithm.replace);
  }

  @override
  Future<void> clear() => database.delete('playback_queue_state');
}

class SqlitePlaybackHistoryStore implements PlaybackHistoryStore {
  const SqlitePlaybackHistoryStore(this.database);

  final sqflite.Database database;

  @override
  Future<void> save(PlaybackHistoryEntry entry) async {
    await database.insert(
      'playback_history',
      _row(entry),
      conflictAlgorithm: sqflite.ConflictAlgorithm.replace,
    );
  }

  @override
  Future<bool> deleteSession(String sessionId) async {
    return (await database.delete(
          'playback_history',
          where: 'session_id = ?',
          whereArgs: [sessionId],
        )) >
        0;
  }

  @override
  Future<int> deleteAll() => database.delete('playback_history');

  @override
  Future<int> deleteOlderThan(int cutoffMillis) {
    return database.delete(
      'playback_history',
      where: 'last_played_at_millis < ?',
      whereArgs: [cutoffMillis],
    );
  }

  @override
  Future<PlaybackHistoryStatistics> loadStatistics({
    int? sinceMillis,
    int limit = 5,
  }) async {
    final where = sinceMillis == null
        ? ''
        : ' WHERE last_played_at_millis >= ?';
    final whereArgs = sinceMillis == null ? const <Object?>[] : [sinceMillis];
    final totalRows = await database.rawQuery('''SELECT
  COALESCE(SUM(listened_millis), 0) AS listened_millis,
  COUNT(*) AS session_count,
  COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0)
    AS completed_session_count,
  COUNT(DISTINCT track_id) AS distinct_track_count,
  MAX(last_played_at_millis) AS last_played_at_millis
FROM playback_history$where''', whereArgs);
    final total = totalRows.single;
    final works = await _groupStatistics(
      idColumn: 'work_id',
      titleColumn: 'work_title',
      where: where,
      whereArgs: whereArgs,
      limit: limit,
    );
    final recordings = await _groupStatistics(
      idColumn: 'recording_id',
      titleColumn: 'recording_title',
      where: where,
      whereArgs: whereArgs,
      limit: limit,
    );

    return PlaybackHistoryStatistics(
      listenedMillis: _intValue(total['listened_millis']),
      sessionCount: _intValue(total['session_count']),
      completedSessionCount: _intValue(total['completed_session_count']),
      distinctTrackCount: _intValue(total['distinct_track_count']),
      lastPlayedAtMillis: total['last_played_at_millis'] as int?,
      workStatistics: works,
      recordingStatistics: recordings,
    );
  }

  @override
  Future<List<PlaybackHistoryEntry>> loadRecent({int limit = 10}) {
    return _query(limit: limit);
  }

  @override
  Future<List<PlaybackHistoryEntry>> loadForTrack(
    String trackId, {
    int limit = 20,
  }) {
    return _query(where: 'track_id = ?', whereArgs: [trackId], limit: limit);
  }

  @override
  Future<List<PlaybackHistoryEntry>> loadForWork(
    String workId, {
    int limit = 20,
  }) {
    return _query(where: 'work_id = ?', whereArgs: [workId], limit: limit);
  }

  @override
  Future<List<PlaybackHistoryEntry>> loadForRecording(
    String recordingId, {
    int limit = 20,
  }) {
    return _query(
      where: 'recording_id = ?',
      whereArgs: [recordingId],
      limit: limit,
    );
  }

  Future<List<PlaybackHistoryEntry>> _query({
    String? where,
    List<Object?>? whereArgs,
    required int limit,
  }) async {
    final rows = await database.query(
      'playback_history',
      where: where,
      whereArgs: whereArgs,
      orderBy: 'last_played_at_millis DESC, started_at_millis DESC',
      limit: limit,
    );
    return [for (final row in rows) _entry(row)];
  }

  Future<List<PlaybackHistoryGroupStatistics>> _groupStatistics({
    required String idColumn,
    required String titleColumn,
    required String where,
    required List<Object?> whereArgs,
    required int limit,
  }) async {
    final rows = await database.rawQuery(
      '''SELECT
  $idColumn AS group_id,
  $titleColumn AS group_title,
  COALESCE(SUM(listened_millis), 0) AS listened_millis,
  COUNT(*) AS session_count,
  COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0)
    AS completed_session_count,
  MAX(last_played_at_millis) AS last_played_at_millis
FROM playback_history$where
GROUP BY $idColumn, $titleColumn
ORDER BY listened_millis DESC, last_played_at_millis DESC, group_title ASC
LIMIT ?''',
      [...whereArgs, limit],
    );
    return [
      for (final row in rows)
        PlaybackHistoryGroupStatistics(
          id: row['group_id']! as String,
          title: row['group_title']! as String,
          listenedMillis: _intValue(row['listened_millis']),
          sessionCount: _intValue(row['session_count']),
          completedSessionCount: _intValue(row['completed_session_count']),
          lastPlayedAtMillis: row['last_played_at_millis'] as int?,
        ),
    ];
  }

  int _intValue(Object? value) => (value! as num).toInt();

  Map<String, Object?> _row(PlaybackHistoryEntry entry) {
    return {
      'session_id': entry.sessionId,
      'track_id': entry.trackId,
      'recording_id': entry.recordingId,
      'work_id': entry.workId,
      'path': entry.path,
      'work_title': entry.workTitle,
      'recording_title': entry.recordingTitle,
      'track_title': entry.trackTitle,
      'started_at_millis': entry.startedAtMillis,
      'last_played_at_millis': entry.lastPlayedAtMillis,
      'listened_millis': entry.listenedMillis,
      'last_position_millis': entry.lastPositionMillis,
      'duration_millis': entry.durationMillis,
      'status': entry.status.name,
    };
  }

  PlaybackHistoryEntry _entry(Map<String, Object?> row) {
    return PlaybackHistoryEntry(
      sessionId: row['session_id']! as String,
      trackId: row['track_id']! as String,
      recordingId: row['recording_id']! as String,
      workId: row['work_id']! as String,
      path: row['path']! as String,
      workTitle: row['work_title']! as String,
      recordingTitle: row['recording_title']! as String,
      trackTitle: row['track_title']! as String,
      startedAtMillis: row['started_at_millis']! as int,
      lastPlayedAtMillis: row['last_played_at_millis']! as int,
      listenedMillis: row['listened_millis']! as int,
      lastPositionMillis: row['last_position_millis']! as int,
      durationMillis: row['duration_millis'] as int?,
      status: PlaybackHistoryStatus.values.byName(row['status']! as String),
    );
  }
}

class SqlitePlaybackHistoryPreferencesStore
    implements PlaybackHistoryPreferencesStore {
  const SqlitePlaybackHistoryPreferencesStore(this.database);

  final sqflite.Database database;

  @override
  Future<PlaybackHistoryRetentionPolicy> loadRetentionPolicy() async {
    final rows = await database.query(
      'playback_history_preferences',
      columns: ['retention_policy'],
      where: 'id = ?',
      whereArgs: [1],
      limit: 1,
    );
    if (rows.isEmpty) {
      return PlaybackHistoryRetentionPolicy.keepForever;
    }
    final value = rows.single['retention_policy']! as String;
    return PlaybackHistoryRetentionPolicy.values.firstWhere(
      (policy) => policy.name == value,
      orElse: () => PlaybackHistoryRetentionPolicy.keepForever,
    );
  }

  @override
  Future<void> saveRetentionPolicy(PlaybackHistoryRetentionPolicy policy) {
    return database.insert('playback_history_preferences', {
      'id': 1,
      'retention_policy': policy.name,
    }, conflictAlgorithm: sqflite.ConflictAlgorithm.replace);
  }
}

class SqliteImslpStore implements ImslpStore {
  const SqliteImslpStore(this.database);

  final sqflite.Database database;

  @override
  Future<List<ImslpWorkLink>> loadWorkLinks() async => [
    for (final row in await database.query(
      'imslp_work_links',
      orderBy: 'work_title ASC',
    ))
      ImslpWorkLink(
        workId: row['work_id']! as String,
        externalId: row['external_id']! as String,
        pageUrl: row['page_url']! as String,
        workTitle: row['work_title']! as String,
        composerName: row['composer_name'] as String?,
        catalogNumber: row['catalog_number'] as String?,
        linkedAtMillis: row['linked_at_millis']! as int,
      ),
  ];

  @override
  Future<void> upsertWorkLink(ImslpWorkLink link) async {
    final conflicts = await database.query(
      'imslp_work_links',
      columns: ['work_id'],
      where: 'external_id = ? AND work_id != ?',
      whereArgs: [link.externalId, link.workId],
      limit: 1,
    );
    if (conflicts.isNotEmpty) {
      throw ImslpLinkConflictException(conflicts.single['work_id']! as String);
    }
    final row = {
      'work_id': link.workId,
      'external_id': link.externalId,
      'page_url': link.pageUrl,
      'work_title': link.workTitle,
      'composer_name': link.composerName,
      'catalog_number': link.catalogNumber,
      'linked_at_millis': link.linkedAtMillis,
    };
    final updated = await database.update(
      'imslp_work_links',
      row,
      where: 'work_id = ?',
      whereArgs: [link.workId],
    );
    if (updated == 0) await database.insert('imslp_work_links', row);
  }

  @override
  Future<void> unlinkWork(String workId) async {
    await database.transaction((transaction) async {
      await transaction.delete(
        'imslp_resources',
        where: 'work_id = ?',
        whereArgs: [workId],
      );
      await transaction.delete(
        'imslp_work_links',
        where: 'work_id = ?',
        whereArgs: [workId],
      );
    });
  }

  @override
  Future<List<ImslpResource>> loadResources(String workId) async => [
    for (final row in await database.query(
      'imslp_resources',
      where: 'work_id = ?',
      whereArgs: [workId],
      orderBy: 'kind ASC, original_file_name ASC',
    ))
      ImslpResource(
        id: row['id']! as String,
        workId: row['work_id']! as String,
        pageUrl: row['page_url']! as String,
        kind: imslpResourceKindFromName(row['kind'] as String?),
        rightsStatus: imslpRightsStatusFromName(
          row['rights_status'] as String?,
        ),
        fetchedAtMillis: row['fetched_at_millis']! as int,
        directDownloadUrl: row['direct_download_url'] as String?,
        originalFileName: row['original_file_name'] as String?,
        mimeType: row['mime_type'] as String?,
        sizeBytes: row['size_bytes'] as int?,
        contributorLabel: row['contributor_label'] as String?,
        rawCopyrightStatus: row['raw_copyright_status'] as String?,
        licenseLabel: row['license_label'] as String?,
        regionLabel: row['region_label'] as String?,
        isSoundRecording: (row['is_sound_recording'] as int? ?? 0) == 1,
      ),
  ];

  @override
  Future<void> saveResources(
    String workId,
    List<ImslpResource> resources,
  ) async {
    await database.transaction((transaction) async {
      await transaction.delete(
        'imslp_resources',
        where: 'work_id = ?',
        whereArgs: [workId],
      );
      for (final resource in resources) {
        await transaction.insert('imslp_resources', {
          'id': resource.id,
          'work_id': resource.workId,
          'page_url': resource.pageUrl,
          'kind': resource.kind.name,
          'rights_status': resource.rightsStatus.name,
          'fetched_at_millis': resource.fetchedAtMillis,
          'direct_download_url': resource.directDownloadUrl,
          'original_file_name': resource.originalFileName,
          'mime_type': resource.mimeType,
          'size_bytes': resource.sizeBytes,
          'contributor_label': resource.contributorLabel,
          'raw_copyright_status': resource.rawCopyrightStatus,
          'license_label': resource.licenseLabel,
          'region_label': resource.regionLabel,
          'is_sound_recording': resource.isSoundRecording ? 1 : 0,
        });
      }
    });
  }

  @override
  Future<List<ImslpImportRecord>> loadImports() async => [
    for (final row in await database.query(
      'imslp_imports',
      orderBy: 'downloaded_at_millis DESC',
    ))
      _importFromRow(row),
  ];

  @override
  Future<void> upsertImport(ImslpImportRecord record) async {
    final row = {
      'id': record.id,
      'resource_id': record.resourceId,
      'work_id': record.workId,
      'source_page_url': record.sourcePageUrl,
      'source_download_url': record.sourceDownloadUrl,
      'original_file_name': record.originalFileName,
      'local_path': record.localPath,
      'sha256': record.sha256,
      'size_bytes': record.sizeBytes,
      'downloaded_at_millis': record.downloadedAtMillis,
      'status': record.status.name,
      'rights_status': record.rightsStatus.name,
      'mime_type': record.mimeType,
      'file_id': record.fileId,
      'recording_id': record.recordingId,
      'track_id': record.trackId,
      'license_label': record.licenseLabel,
      'raw_copyright_status': record.rawCopyrightStatus,
      'failure_kind': record.failureKind,
      'user_message': record.userMessage,
    };
    await database.insert(
      'imslp_imports',
      row,
      conflictAlgorithm: sqflite.ConflictAlgorithm.replace,
    );
  }

  @override
  Future<ImslpImportRecord?> findImportByChecksum(String sha256) async {
    final rows = await database.query(
      'imslp_imports',
      where: 'sha256 = ?',
      whereArgs: [sha256],
      limit: 1,
    );
    return rows.isEmpty ? null : _importFromRow(rows.single);
  }

  ImslpImportRecord _importFromRow(Map<String, Object?> row) {
    return ImslpImportRecord(
      id: row['id']! as String,
      resourceId: row['resource_id']! as String,
      workId: row['work_id']! as String,
      sourcePageUrl: row['source_page_url']! as String,
      sourceDownloadUrl: row['source_download_url']! as String,
      originalFileName: row['original_file_name']! as String,
      localPath: row['local_path']! as String,
      sha256: row['sha256']! as String,
      sizeBytes: row['size_bytes']! as int,
      downloadedAtMillis: row['downloaded_at_millis']! as int,
      status: imslpTransferStatusFromName(row['status'] as String?),
      rightsStatus: imslpRightsStatusFromName(row['rights_status'] as String?),
      mimeType: row['mime_type'] as String?,
      fileId: row['file_id'] as String?,
      recordingId: row['recording_id'] as String?,
      trackId: row['track_id'] as String?,
      licenseLabel: row['license_label'] as String?,
      rawCopyrightStatus: row['raw_copyright_status'] as String?,
      failureKind: row['failure_kind'] as String?,
      userMessage: row['user_message'] as String?,
    );
  }
}

class SqliteLocalAudioImportStore implements LocalAudioImportStore {
  const SqliteLocalAudioImportStore(this.database);

  final sqflite.Database database;

  @override
  Future<List<LocalAudioImportRecord>> load() async => [
    for (final row in await database.query(
      'local_audio_imports',
      orderBy: 'imported_at_millis ASC',
    ))
      _recordFromRow(row),
  ];

  @override
  Future<LocalAudioImportRecord?> findByChecksum(String sha256) async {
    final rows = await database.query(
      'local_audio_imports',
      where: 'sha256 = ?',
      whereArgs: [sha256],
      limit: 1,
    );
    return rows.isEmpty ? null : _recordFromRow(rows.single);
  }

  @override
  Future<void> upsert(LocalAudioImportRecord record) async {
    await database.insert('local_audio_imports', {
      'id': record.id,
      'source_kind': record.sourceKind,
      'original_file_name': record.originalFileName,
      'local_path': record.localPath,
      'sha256': record.sha256,
      'size_bytes': record.sizeBytes,
      'imported_at_millis': record.importedAtMillis,
      'status': record.status.name,
      'file_id': record.fileId,
      'failure_kind': record.failureKind,
    }, conflictAlgorithm: sqflite.ConflictAlgorithm.replace);
  }

  @override
  Future<void> delete(String id) async {
    await database.delete(
      'local_audio_imports',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  LocalAudioImportRecord _recordFromRow(Map<String, Object?> row) {
    return LocalAudioImportRecord(
      id: row['id']! as String,
      sourceKind: row['source_kind']! as String,
      originalFileName: row['original_file_name']! as String,
      localPath: row['local_path']! as String,
      sha256: row['sha256']! as String,
      sizeBytes: row['size_bytes']! as int,
      importedAtMillis: row['imported_at_millis']! as int,
      status: LocalAudioImportStatus.values.byName(row['status']! as String),
      fileId: row['file_id'] as String?,
      failureKind: row['failure_kind'] as String?,
    );
  }
}

class SqliteMusicBrainzCacheStore implements MusicBrainzCacheStore {
  const SqliteMusicBrainzCacheStore(this.database);

  final sqflite.Database database;

  @override
  Future<MusicBrainzCacheEntry?> read(String key) async {
    final rows = await database.query(
      'musicbrainz_cache',
      where: 'cache_key = ?',
      whereArgs: [key],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    final row = rows.single;
    return MusicBrainzCacheEntry(
      key: row['cache_key']! as String,
      payloadJson: row['payload_json']! as String,
      storedAtMillis: row['stored_at_millis']! as int,
      expiresAtMillis: row['expires_at_millis']! as int,
      isNegative: (row['is_negative']! as int) == 1,
    );
  }

  @override
  Future<void> write(MusicBrainzCacheEntry entry) async {
    await database.insert('musicbrainz_cache', {
      'cache_key': entry.key,
      'payload_json': entry.payloadJson,
      'stored_at_millis': entry.storedAtMillis,
      'expires_at_millis': entry.expiresAtMillis,
      'is_negative': entry.isNegative ? 1 : 0,
    }, conflictAlgorithm: sqflite.ConflictAlgorithm.replace);
  }

  @override
  Future<void> delete(String key) async {
    await database.delete(
      'musicbrainz_cache',
      where: 'cache_key = ?',
      whereArgs: [key],
    );
  }

  @override
  Future<int> deleteExpired(int nowMillis) {
    return database.delete(
      'musicbrainz_cache',
      where: 'expires_at_millis <= ?',
      whereArgs: [nowMillis],
    );
  }
}
