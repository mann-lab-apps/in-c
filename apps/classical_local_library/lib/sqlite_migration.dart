import 'dart:convert';
import 'dart:io';

import 'classical_library_models.dart';
import 'file_links.dart';
import 'metadata_candidates.dart';
import 'scan_locations.dart';

class SqliteTableSchema {
  const SqliteTableSchema({
    required this.name,
    required this.createSql,
    this.sourceJsonFileName,
  });

  final String name;
  final String? sourceJsonFileName;
  final String createSql;
}

class SqliteStorageSchema {
  const SqliteStorageSchema();

  int get version => 14;

  List<SqliteTableSchema> get tables => const [
    SqliteTableSchema(
      name: 'scanned_audio_files',
      sourceJsonFileName: 'classical_local_scan.json',
      createSql: '''
CREATE TABLE IF NOT EXISTS scanned_audio_files (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  file_name TEXT,
  format TEXT NOT NULL,
  size_bytes INTEGER,
  modified_at_millis INTEGER,
  last_seen_at_millis INTEGER,
  consecutive_miss_count INTEGER NOT NULL DEFAULT 0,
  availability TEXT NOT NULL DEFAULT 'present',
  lightweight_fingerprint TEXT,
  tag_read_status TEXT NOT NULL DEFAULT 'noTags',
  tag_metadata_json TEXT,
  tag_failure_kind TEXT,
  import_status TEXT NOT NULL,
  source_references_json TEXT NOT NULL
);''',
    ),
    SqliteTableSchema(
      name: 'scan_locations',
      sourceJsonFileName: 'classical_local_scan_locations.json',
      createSql: '''
CREATE TABLE IF NOT EXISTS scan_locations (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at_millis INTEGER NOT NULL,
  last_scanned_at_millis INTEGER,
  last_scan_file_count INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);''',
    ),
    SqliteTableSchema(
      name: 'metadata_candidates',
      sourceJsonFileName: 'classical_local_metadata_candidates.json',
      createSql: '''
CREATE TABLE IF NOT EXISTS metadata_candidates (
  file_id TEXT PRIMARY KEY,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  composer_text TEXT,
  work_title_text TEXT,
  movement_text TEXT,
  track_number INTEGER,
  track_total INTEGER,
  album_text TEXT,
  artist_text TEXT,
  album_artist_text TEXT,
  genre_text TEXT,
  year INTEGER,
  disc_number INTEGER,
  disc_total INTEGER,
  confidence REAL NOT NULL DEFAULT 0,
  source_label TEXT NOT NULL,
  raw_pattern TEXT,
  review_status TEXT NOT NULL DEFAULT 'needsReview',
  has_tag_conflict INTEGER NOT NULL DEFAULT 0
);''',
    ),
    SqliteTableSchema(
      name: 'audio_file_track_links',
      sourceJsonFileName: 'classical_local_file_links.json',
      createSql: '''
CREATE TABLE IF NOT EXISTS audio_file_track_links (
  track_id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  linked_at_millis INTEGER NOT NULL
);''',
    ),
    SqliteTableSchema(
      name: 'playback_positions',
      createSql: '''
CREATE TABLE IF NOT EXISTS playback_positions (
  path TEXT PRIMARY KEY,
  position_millis INTEGER NOT NULL,
  duration_millis INTEGER,
  updated_at_millis INTEGER NOT NULL,
  is_completed INTEGER NOT NULL DEFAULT 0,
  file_modified_at_millis INTEGER
);''',
    ),
    SqliteTableSchema(
      name: 'playback_history',
      createSql: '''
CREATE TABLE IF NOT EXISTS playback_history (
  session_id TEXT PRIMARY KEY,
  track_id TEXT NOT NULL,
  recording_id TEXT NOT NULL,
  work_id TEXT NOT NULL,
  path TEXT NOT NULL,
  work_title TEXT NOT NULL,
  recording_title TEXT NOT NULL,
  track_title TEXT NOT NULL,
  started_at_millis INTEGER NOT NULL,
  last_played_at_millis INTEGER NOT NULL,
  listened_millis INTEGER NOT NULL DEFAULT 0,
  last_position_millis INTEGER NOT NULL DEFAULT 0,
  duration_millis INTEGER,
  status TEXT NOT NULL
);''',
    ),
    SqliteTableSchema(
      name: 'playback_history_preferences',
      createSql: '''
CREATE TABLE IF NOT EXISTS playback_history_preferences (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  retention_policy TEXT NOT NULL
);''',
    ),
    SqliteTableSchema(
      name: 'playback_queue_state',
      createSql: '''
CREATE TABLE IF NOT EXISTS playback_queue_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  track_ids_json TEXT NOT NULL,
  current_track_id TEXT,
  saved_at_millis INTEGER NOT NULL
);''',
    ),
    SqliteTableSchema(
      name: 'imslp_work_links',
      createSql: '''
CREATE TABLE IF NOT EXISTS imslp_work_links (
  work_id TEXT PRIMARY KEY,
  external_id TEXT NOT NULL,
  page_url TEXT NOT NULL,
  work_title TEXT NOT NULL,
  composer_name TEXT,
  catalog_number TEXT,
  linked_at_millis INTEGER NOT NULL
);''',
    ),
    SqliteTableSchema(
      name: 'imslp_resources',
      createSql: '''
CREATE TABLE IF NOT EXISTS imslp_resources (
  id TEXT PRIMARY KEY,
  work_id TEXT NOT NULL,
  page_url TEXT NOT NULL,
  kind TEXT NOT NULL,
  rights_status TEXT NOT NULL,
  fetched_at_millis INTEGER NOT NULL,
  direct_download_url TEXT,
  original_file_name TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  contributor_label TEXT,
  raw_copyright_status TEXT,
  license_label TEXT,
  region_label TEXT,
  is_sound_recording INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(work_id) REFERENCES imslp_work_links(work_id) ON DELETE CASCADE
);''',
    ),
    SqliteTableSchema(
      name: 'imslp_imports',
      createSql: '''
CREATE TABLE IF NOT EXISTS imslp_imports (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  work_id TEXT NOT NULL,
  source_page_url TEXT NOT NULL,
  source_download_url TEXT NOT NULL,
  original_file_name TEXT NOT NULL,
  local_path TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  downloaded_at_millis INTEGER NOT NULL,
  status TEXT NOT NULL,
  rights_status TEXT NOT NULL,
  mime_type TEXT,
  file_id TEXT,
  recording_id TEXT,
  track_id TEXT,
  license_label TEXT,
  raw_copyright_status TEXT,
  failure_kind TEXT,
  user_message TEXT
);''',
    ),
    SqliteTableSchema(
      name: 'local_audio_imports',
      createSql: '''
CREATE TABLE IF NOT EXISTS local_audio_imports (
  id TEXT PRIMARY KEY,
  source_kind TEXT NOT NULL,
  original_file_name TEXT NOT NULL,
  local_path TEXT NOT NULL UNIQUE,
  sha256 TEXT NOT NULL UNIQUE,
  size_bytes INTEGER NOT NULL,
  imported_at_millis INTEGER NOT NULL,
  status TEXT NOT NULL,
  file_id TEXT,
  failure_kind TEXT
);''',
    ),
    SqliteTableSchema(
      name: 'metadata_overrides',
      createSql: '''
CREATE TABLE IF NOT EXISTS metadata_overrides (
  file_id TEXT PRIMARY KEY,
  values_json TEXT NOT NULL,
  sources_json TEXT NOT NULL,
  fallback_values_json TEXT NOT NULL DEFAULT '{}',
  fallback_sources_json TEXT NOT NULL DEFAULT '{}',
  updated_at_millis INTEGER NOT NULL,
  musicbrainz_recording_id TEXT,
  musicbrainz_work_id TEXT,
  musicbrainz_release_id TEXT
);''',
    ),
    SqliteTableSchema(
      name: 'library_entity_merges',
      createSql: '''
CREATE TABLE IF NOT EXISTS library_entity_merges (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  source_label TEXT NOT NULL,
  target_label TEXT NOT NULL,
  merged_at_millis INTEGER NOT NULL,
  evidence_json TEXT NOT NULL,
  undo_snapshot_json TEXT NOT NULL DEFAULT '{}',
  undone_at_millis INTEGER
);''',
    ),
    SqliteTableSchema(
      name: 'musicbrainz_cache',
      createSql: '''
CREATE TABLE IF NOT EXISTS musicbrainz_cache (
  cache_key TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  stored_at_millis INTEGER NOT NULL,
  expires_at_millis INTEGER NOT NULL,
  is_negative INTEGER NOT NULL DEFAULT 0
);''',
    ),
    SqliteTableSchema(
      name: 'catalog_people',
      createSql: '''
CREATE TABLE IF NOT EXISTS catalog_people (
  id TEXT PRIMARY KEY,
  name_json TEXT NOT NULL,
  birth_year INTEGER,
  death_year INTEGER,
  origin TEXT NOT NULL DEFAULT 'user'
);''',
    ),
    SqliteTableSchema(
      name: 'catalog_instruments',
      createSql: '''
CREATE TABLE IF NOT EXISTS catalog_instruments (
  id TEXT PRIMARY KEY,
  name_json TEXT NOT NULL
);''',
    ),
    SqliteTableSchema(
      name: 'catalog_ensembles',
      createSql: '''
CREATE TABLE IF NOT EXISTS catalog_ensembles (
  id TEXT PRIMARY KEY,
  name_json TEXT NOT NULL
);''',
    ),
    SqliteTableSchema(
      name: 'catalog_albums',
      createSql: '''
CREATE TABLE IF NOT EXISTS catalog_albums (
  id TEXT PRIMARY KEY,
  title_json TEXT NOT NULL,
  label TEXT,
  release_year INTEGER
);''',
    ),
    SqliteTableSchema(
      name: 'catalog_works',
      createSql: '''
CREATE TABLE IF NOT EXISTS catalog_works (
  id TEXT PRIMARY KEY,
  composer_id TEXT NOT NULL,
  title_json TEXT NOT NULL,
  catalog_number TEXT,
  period_label TEXT,
  source_references_json TEXT NOT NULL DEFAULT '[]',
  origin TEXT NOT NULL DEFAULT 'user',
  FOREIGN KEY(composer_id) REFERENCES catalog_people(id)
);''',
    ),
    SqliteTableSchema(
      name: 'catalog_work_parts',
      createSql: '''
CREATE TABLE IF NOT EXISTS catalog_work_parts (
  id TEXT PRIMARY KEY,
  work_id TEXT NOT NULL,
  title_json TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,
  FOREIGN KEY(work_id) REFERENCES catalog_works(id)
);''',
    ),
    SqliteTableSchema(
      name: 'catalog_recordings',
      createSql: '''
CREATE TABLE IF NOT EXISTS catalog_recordings (
  id TEXT PRIMARY KEY,
  work_id TEXT NOT NULL,
  title_json TEXT NOT NULL,
  album_id TEXT,
  ensemble_id TEXT,
  recorded_year INTEGER,
  source_references_json TEXT NOT NULL DEFAULT '[]',
  origin TEXT NOT NULL DEFAULT 'user',
  FOREIGN KEY(work_id) REFERENCES catalog_works(id),
  FOREIGN KEY(album_id) REFERENCES catalog_albums(id),
  FOREIGN KEY(ensemble_id) REFERENCES catalog_ensembles(id)
);''',
    ),
    SqliteTableSchema(
      name: 'catalog_recording_credits',
      createSql: '''
CREATE TABLE IF NOT EXISTS catalog_recording_credits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recording_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  role TEXT NOT NULL,
  instrument_id TEXT,
  FOREIGN KEY(recording_id) REFERENCES catalog_recordings(id),
  FOREIGN KEY(person_id) REFERENCES catalog_people(id),
  FOREIGN KEY(instrument_id) REFERENCES catalog_instruments(id)
);''',
    ),
    SqliteTableSchema(
      name: 'catalog_tracks',
      createSql: '''
CREATE TABLE IF NOT EXISTS catalog_tracks (
  id TEXT PRIMARY KEY,
  recording_id TEXT NOT NULL,
  file_id TEXT NOT NULL UNIQUE,
  sequence_number INTEGER NOT NULL,
  work_part_ids_json TEXT NOT NULL DEFAULT '[]',
  title_json TEXT,
  duration_millis INTEGER,
  FOREIGN KEY(recording_id) REFERENCES catalog_recordings(id),
  FOREIGN KEY(file_id) REFERENCES scanned_audio_files(id)
);''',
    ),
    SqliteTableSchema(
      name: 'app_reset_state',
      createSql: '''
CREATE TABLE IF NOT EXISTS app_reset_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  pending_file_cleanup INTEGER NOT NULL DEFAULT 0,
  started_at_millis INTEGER NOT NULL
);''',
    ),
  ];

  List<String> get indexSql => const [
    '''CREATE INDEX IF NOT EXISTS playback_history_recent_idx
ON playback_history(last_played_at_millis DESC, started_at_millis DESC);''',
    '''CREATE INDEX IF NOT EXISTS playback_history_track_idx
ON playback_history(track_id, last_played_at_millis DESC);''',
    '''CREATE INDEX IF NOT EXISTS playback_history_work_idx
ON playback_history(work_id, last_played_at_millis DESC);''',
    '''CREATE INDEX IF NOT EXISTS playback_history_recording_idx
ON playback_history(recording_id, last_played_at_millis DESC);''',
    '''CREATE UNIQUE INDEX IF NOT EXISTS imslp_work_external_idx
ON imslp_work_links(external_id);''',
    '''CREATE INDEX IF NOT EXISTS imslp_resource_work_idx
ON imslp_resources(work_id, kind);''',
    '''CREATE UNIQUE INDEX IF NOT EXISTS imslp_import_sha256_idx
ON imslp_imports(sha256);''',
    '''CREATE INDEX IF NOT EXISTS imslp_import_work_idx
ON imslp_imports(work_id, downloaded_at_millis DESC);''',
    '''CREATE INDEX IF NOT EXISTS local_audio_import_recent_idx
ON local_audio_imports(imported_at_millis DESC);''',
    '''CREATE INDEX IF NOT EXISTS local_audio_import_file_idx
ON local_audio_imports(file_id);''',
    '''CREATE INDEX IF NOT EXISTS metadata_overrides_updated_idx
ON metadata_overrides(updated_at_millis DESC);''',
    '''CREATE INDEX IF NOT EXISTS library_entity_merges_target_idx
ON library_entity_merges(entity_type, target_id);''',
    '''CREATE UNIQUE INDEX IF NOT EXISTS library_entity_merges_active_source_idx
ON library_entity_merges(entity_type, source_id)
WHERE undone_at_millis IS NULL;''',
    '''CREATE INDEX IF NOT EXISTS musicbrainz_cache_expiry_idx
ON musicbrainz_cache(expires_at_millis);''',
    '''CREATE INDEX IF NOT EXISTS catalog_works_composer_idx
ON catalog_works(composer_id);''',
    '''CREATE UNIQUE INDEX IF NOT EXISTS catalog_parts_sequence_idx
ON catalog_work_parts(work_id, sequence_number);''',
    '''CREATE INDEX IF NOT EXISTS catalog_recordings_work_idx
ON catalog_recordings(work_id);''',
    '''CREATE UNIQUE INDEX IF NOT EXISTS catalog_tracks_sequence_idx
ON catalog_tracks(recording_id, sequence_number);''',
  ];

  String get migrationTableSql => '''
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at_millis INTEGER NOT NULL
);''';

  String get jsonMigrationTableSql => '''
CREATE TABLE IF NOT EXISTS json_store_migrations (
  id TEXT PRIMARY KEY,
  applied_at_millis INTEGER NOT NULL,
  row_count INTEGER NOT NULL
);''';
}

class SqliteSeedData {
  const SqliteSeedData(this.rowsByTable);

  final Map<String, List<Map<String, Object?>>> rowsByTable;

  int get totalRowCount {
    return rowsByTable.values.fold(0, (sum, rows) => sum + rows.length);
  }

  List<Map<String, Object?>> rowsFor(String tableName) {
    return rowsByTable[tableName] ?? const [];
  }
}

class JsonStorePayloads {
  const JsonStorePayloads({
    this.scannedAudioPayload = const {},
    this.scanLocationPayload = const {},
    this.metadataCandidatePayload = const {},
    this.fileTrackLinkPayload = const {},
  });

  final Map<String, Object?> scannedAudioPayload;
  final Map<String, Object?> scanLocationPayload;
  final Map<String, Object?> metadataCandidatePayload;
  final Map<String, Object?> fileTrackLinkPayload;
}

class JsonStorePayloadReader {
  const JsonStorePayloadReader();

  Future<JsonStorePayloads> readFromDirectory(Directory directory) async {
    return JsonStorePayloads(
      scannedAudioPayload: await _readJsonObject(
        File('${directory.path}/classical_local_scan.json'),
      ),
      scanLocationPayload: await _readJsonObject(
        File('${directory.path}/classical_local_scan_locations.json'),
      ),
      metadataCandidatePayload: await _readJsonObject(
        File('${directory.path}/classical_local_metadata_candidates.json'),
      ),
      fileTrackLinkPayload: await _readJsonObject(
        File('${directory.path}/classical_local_file_links.json'),
      ),
    );
  }

  Future<Map<String, Object?>> _readJsonObject(File file) async {
    if (!await file.exists()) {
      return {};
    }

    final decoded = jsonDecode(await file.readAsString());
    if (decoded is Map<String, Object?>) {
      return decoded;
    }
    return {};
  }
}

class JsonToSqliteMigrationPlanner {
  const JsonToSqliteMigrationPlanner();

  SqliteSeedData buildSeedData(JsonStorePayloads payloads) {
    final files = [
      for (final item
          in payloads.scannedAudioPayload['files'] as List<Object?>? ??
              const [])
        LocalAudioFile.fromJson(item! as Map<String, Object?>),
    ];
    final locations = [
      for (final item
          in payloads.scanLocationPayload['locations'] as List<Object?>? ??
              const [])
        ScanLocation.fromJson(item! as Map<String, Object?>),
    ];
    final candidates = [
      for (final item
          in payloads.metadataCandidatePayload['candidates']
                  as List<Object?>? ??
              const [])
        MetadataCandidate.fromJson(item! as Map<String, Object?>),
    ];
    final links = [
      for (final item
          in payloads.fileTrackLinkPayload['links'] as List<Object?>? ??
              const [])
        AudioFileTrackLink.fromJson(item! as Map<String, Object?>),
    ];

    return SqliteSeedData({
      'scanned_audio_files': [for (final file in files) _fileRow(file)],
      'scan_locations': [
        for (final location in locations) _locationRow(location),
      ],
      'metadata_candidates': [
        for (final candidate in candidates) _candidateRow(candidate),
      ],
      'audio_file_track_links': [for (final link in links) _linkRow(link)],
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

  Map<String, Object?> _linkRow(AudioFileTrackLink link) {
    return {
      'file_id': link.fileId,
      'track_id': link.trackId,
      'linked_at_millis': link.linkedAtMillis,
    };
  }
}
