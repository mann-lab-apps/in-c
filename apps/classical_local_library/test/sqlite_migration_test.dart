import 'dart:convert';

import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/local_audio_scanner.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/scan_locations.dart';
import 'package:classical_local_library/sqlite_migration.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'SQLite schema defines JSON stores, positions, history, and preferences',
    () {
      const schema = SqliteStorageSchema();

      expect(schema.version, 15);
      expect(schema.tables.map((table) => table.name), [
        'scanned_audio_files',
        'scan_locations',
        'metadata_candidates',
        'audio_file_track_links',
        'playback_positions',
        'playback_history',
        'playback_history_preferences',
        'playback_queue_state',
        'imslp_work_links',
        'imslp_resources',
        'imslp_imports',
        'local_audio_imports',
        'local_playlists',
        'metadata_overrides',
        'library_entity_merges',
        'musicbrainz_cache',
        'catalog_people',
        'catalog_instruments',
        'catalog_ensembles',
        'catalog_albums',
        'catalog_works',
        'catalog_work_parts',
        'catalog_recordings',
        'catalog_recording_credits',
        'catalog_tracks',
        'app_reset_state',
      ]);
      expect(
        schema.tables
            .map((table) => table.sourceJsonFileName)
            .whereType<String>(),
        containsAll([
          'classical_local_scan.json',
          'classical_local_scan_locations.json',
          'classical_local_metadata_candidates.json',
          'classical_local_file_links.json',
        ]),
      );
      expect(
        schema.tables.first.createSql,
        contains('CREATE TABLE IF NOT EXISTS scanned_audio_files'),
      );
      expect(schema.migrationTableSql, contains('schema_migrations'));
      expect(
        schema.tables
            .firstWhere((table) => table.name == 'playback_positions')
            .createSql,
        contains('CREATE TABLE IF NOT EXISTS playback_positions'),
      );
      expect(
        schema.tables
            .firstWhere((table) => table.name == 'playback_history')
            .createSql,
        contains('CREATE TABLE IF NOT EXISTS playback_history'),
      );
      expect(
        schema.tables
            .firstWhere((table) => table.name == 'playback_history_preferences')
            .createSql,
        contains('CREATE TABLE IF NOT EXISTS playback_history_preferences'),
      );
      expect(schema.indexSql, hasLength(18));
    },
  );

  test('JSON store fixtures become SQLite seed rows', () {
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

    final seedData = const JsonToSqliteMigrationPlanner().buildSeedData(
      JsonStorePayloads(
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
      ),
    );

    expect(seedData.totalRowCount, 4);
    final fileRow = seedData.rowsFor('scanned_audio_files').single;
    expect(fileRow['id'], file.id);
    expect(fileRow['path'], file.path);
    expect(fileRow['file_name'], file.fileName);
    expect(fileRow['format'], 'FLAC');
    expect(fileRow['size_bytes'], 1024);
    expect(fileRow['modified_at_millis'], 1791870000000);
    expect(fileRow['import_status'], 'needsReview');
    expect(fileRow['availability'], 'present');
    expect(fileRow['consecutive_miss_count'], 0);
    expect(
      fileRow['source_references_json'],
      jsonEncode([const SourceReference(kind: SourceKind.localTag).toJson()]),
    );
    expect(seedData.rowsFor('scan_locations').single['is_active'], 1);
    expect(
      seedData.rowsFor('metadata_candidates').single['composer_text'],
      'Beethoven',
    );
    expect(seedData.rowsFor('audio_file_track_links').single, {
      'file_id': 'file-1',
      'track_id': 'track-1',
      'linked_at_millis': 1791870120000,
    });
  });

  test('missing JSON payloads migrate to empty table row sets', () {
    final seedData = const JsonToSqliteMigrationPlanner().buildSeedData(
      const JsonStorePayloads(),
    );

    expect(seedData.totalRowCount, 0);
    expect(seedData.rowsFor('scanned_audio_files'), isEmpty);
    expect(seedData.rowsFor('scan_locations'), isEmpty);
    expect(seedData.rowsFor('metadata_candidates'), isEmpty);
    expect(seedData.rowsFor('audio_file_track_links'), isEmpty);
  });
}

LocalAudioFile _audioFile(String path) {
  return LocalAudioFile(
    id: 'file-1',
    path: path,
    fileName: fileNameForPath(path),
    format: 'FLAC',
    sizeBytes: 1024,
    modifiedAtMillis: 1791870000000,
    importStatus: AudioImportStatus.needsReview,
    sourceReferences: const [SourceReference(kind: SourceKind.localTag)],
  );
}
