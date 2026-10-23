import 'dart:convert';

import 'package:sqflite/sqflite.dart' as sqflite;

import 'sqlite_migration.dart';

const libraryBackupSchemaVersion = 1;
const libraryBackupFormat = 'ddirori-play-logical-backup';
const libraryBackupAppVersion = '0.1.0';

class LibraryBackupException implements Exception {
  const LibraryBackupException(this.message);

  final String message;

  @override
  String toString() => message;
}

class LibraryBackupPreview {
  const LibraryBackupPreview({
    required this.added,
    required this.merged,
    required this.skipped,
    required this.conflicts,
    required this.tableCounts,
  });

  final int added;
  final int merged;
  final int skipped;
  final int conflicts;
  final Map<String, int> tableCounts;

  bool get canImport => conflicts == 0;
  int get total => added + merged + skipped + conflicts;
}

class LibraryBackupImportResult {
  const LibraryBackupImportResult({
    required this.added,
    required this.merged,
    required this.skipped,
  });

  final int added;
  final int merged;
  final int skipped;
}

class LibraryBackupService {
  const LibraryBackupService({
    required this.database,
    this.beforeCommit,
    this.clock = DateTime.now,
  });

  final sqflite.Database database;
  final Future<void> Function()? beforeCommit;
  final DateTime Function() clock;

  Future<String> exportJson() async {
    final data = await _readPortableData(database);
    final payload = <String, Object?>{
      'format': libraryBackupFormat,
      'schemaVersion': libraryBackupSchemaVersion,
      'appVersion': libraryBackupAppVersion,
      'storageSchemaVersion': const SqliteStorageSchema().version,
      'createdAtUtc': clock().toUtc().toIso8601String(),
      'mediaIncluded': false,
      'scope': _tableSpecs.map((spec) => spec.name).toList(),
      'counts': {
        for (final spec in _tableSpecs) spec.name: data[spec.name]!.length,
      },
      'data': data,
    };
    final encoded = const JsonEncoder.withIndent('  ').convert(payload);
    _decodeAndValidate(encoded);
    return encoded;
  }

  Future<LibraryBackupPreview> previewImport(String source) async {
    final document = _decodeAndValidate(source);
    return _preview(database, document);
  }

  Future<LibraryBackupImportResult> importJson(String source) async {
    final document = _decodeAndValidate(source);
    late LibraryBackupImportResult result;
    await database.transaction((transaction) async {
      final preview = await _preview(transaction, document);
      if (!preview.canImport) {
        throw const LibraryBackupException(
          '기존 데이터와 충돌하는 항목이 있어 백업을 가져올 수 없습니다.',
        );
      }
      var added = 0;
      var merged = 0;
      var skipped = 0;
      final current = await _readPortableData(transaction);
      for (final spec in _tableSpecs) {
        final existing = {
          for (final row in current[spec.name]!) spec.identity(row): row,
        };
        for (final row in document.data[spec.name]!) {
          final identity = spec.identity(row);
          final found = existing[identity];
          if (found == null) {
            await transaction.insert(spec.name, spec.toDatabaseRow(row));
            added += 1;
            continue;
          }
          if (_sameRow(spec, found, row)) {
            skipped += 1;
            continue;
          }
          if (spec.name == 'playback_positions' &&
              (row['updated_at_millis']! as int) >
                  (found['updated_at_millis']! as int)) {
            await transaction.update(
              spec.name,
              spec.toDatabaseRow(row),
              where: '${spec.databaseKey} = ?',
              whereArgs: [spec.databaseIdentity(row)],
            );
            merged += 1;
            continue;
          }
          throw const LibraryBackupException('가져오기 중 데이터 충돌이 감지되어 변경을 취소했습니다.');
        }
      }
      await beforeCommit?.call();
      result = LibraryBackupImportResult(
        added: added,
        merged: merged,
        skipped: skipped,
      );
    });
    return result;
  }

  Future<LibraryBackupPreview> _preview(
    sqflite.DatabaseExecutor executor,
    _BackupDocument document,
  ) async {
    final current = await _readPortableData(executor);
    var added = 0;
    var merged = 0;
    var skipped = 0;
    var conflicts = 0;
    final tableCounts = <String, int>{};
    for (final spec in _tableSpecs) {
      final existing = {
        for (final row in current[spec.name]!) spec.identity(row): row,
      };
      final incoming = document.data[spec.name]!;
      tableCounts[spec.name] = incoming.length;
      for (final row in incoming) {
        final found = existing[spec.identity(row)];
        if (found == null) {
          added += 1;
        } else if (_sameRow(spec, found, row)) {
          skipped += 1;
        } else if (spec.name == 'playback_positions' &&
            (row['updated_at_millis']! as int) >
                (found['updated_at_millis']! as int)) {
          merged += 1;
        } else {
          conflicts += 1;
        }
      }
    }
    return LibraryBackupPreview(
      added: added,
      merged: merged,
      skipped: skipped,
      conflicts: conflicts,
      tableCounts: Map.unmodifiable(tableCounts),
    );
  }
}

class _BackupDocument {
  const _BackupDocument(this.data);

  final Map<String, List<Map<String, Object?>>> data;
}

_BackupDocument _decodeAndValidate(String source) {
  if (source.length > 20 * 1024 * 1024) {
    throw const LibraryBackupException('백업 파일이 허용된 크기를 초과했습니다.');
  }
  if (_privatePathPattern.hasMatch(source) ||
      _credentialPattern.hasMatch(source)) {
    throw const LibraryBackupException('백업에 개인 경로나 비밀값으로 보이는 내용이 포함되어 있습니다.');
  }
  Object? decoded;
  try {
    decoded = jsonDecode(source);
  } on FormatException {
    throw const LibraryBackupException('백업 JSON 형식을 확인해 주세요.');
  }
  if (decoded is! Map<String, Object?>) {
    throw const LibraryBackupException('백업 JSON 객체가 필요합니다.');
  }
  const expectedTopLevel = {
    'format',
    'schemaVersion',
    'appVersion',
    'storageSchemaVersion',
    'createdAtUtc',
    'mediaIncluded',
    'scope',
    'counts',
    'data',
  };
  if (decoded.keys.toSet().difference(expectedTopLevel).isNotEmpty ||
      decoded.keys.length != expectedTopLevel.length ||
      decoded['format'] != libraryBackupFormat ||
      decoded['schemaVersion'] != libraryBackupSchemaVersion ||
      decoded['mediaIncluded'] != false) {
    throw const LibraryBackupException('지원하지 않는 백업 계약입니다.');
  }
  final appVersion = decoded['appVersion'];
  final storageVersion = decoded['storageSchemaVersion'];
  final createdAt = decoded['createdAtUtc'];
  if (appVersion is! String ||
      !RegExp(r'^\d+\.\d+\.\d+$').hasMatch(appVersion) ||
      storageVersion is! int ||
      storageVersion < 1 ||
      storageVersion > const SqliteStorageSchema().version ||
      createdAt is! String ||
      DateTime.tryParse(createdAt)?.isUtc != true) {
    throw const LibraryBackupException('백업 버전 또는 생성 시각이 올바르지 않습니다.');
  }
  final expectedScope = _tableSpecs.map((spec) => spec.name).toList();
  final rawScope = decoded['scope'];
  if (rawScope is! List<Object?> ||
      rawScope.length != expectedScope.length ||
      !List.generate(
        expectedScope.length,
        (index) => rawScope[index] == expectedScope[index],
      ).every((matches) => matches)) {
    throw const LibraryBackupException('백업 데이터 범위가 올바르지 않습니다.');
  }
  final rawCounts = decoded['counts'];
  final rawData = decoded['data'];
  if (rawCounts is! Map<String, Object?> ||
      rawData is! Map<String, Object?> ||
      rawCounts.keys.toSet().difference(expectedScope.toSet()).isNotEmpty ||
      rawCounts.length != expectedScope.length ||
      rawData.keys.toSet().difference(expectedScope.toSet()).isNotEmpty ||
      rawData.length != expectedScope.length) {
    throw const LibraryBackupException('백업 데이터 목록이 올바르지 않습니다.');
  }

  final data = <String, List<Map<String, Object?>>>{};
  var totalRows = 0;
  for (final spec in _tableSpecs) {
    final rawRows = rawData[spec.name];
    final count = rawCounts[spec.name];
    if (rawRows is! List<Object?> ||
        count is! int ||
        count != rawRows.length ||
        rawRows.length > 100000) {
      throw const LibraryBackupException('백업 항목 개수가 올바르지 않습니다.');
    }
    final rows = <Map<String, Object?>>[];
    final identities = <String>{};
    for (final rawRow in rawRows) {
      if (rawRow is! Map<String, Object?> ||
          rawRow.keys.toSet().difference(spec.columns.toSet()).isNotEmpty ||
          rawRow.keys.length != spec.columns.length) {
        throw LibraryBackupException('${spec.name} 항목 형식이 올바르지 않습니다.');
      }
      final row = <String, Object?>{
        for (final column in spec.columns) column: rawRow[column],
      };
      _validateJsonValues(row.values);
      spec.validate(row);
      if (!identities.add(spec.identity(row))) {
        throw LibraryBackupException('${spec.name}에 중복 ID가 있습니다.');
      }
      rows.add(row);
    }
    data[spec.name] = rows;
    totalRows += rows.length;
  }
  if (totalRows > 100000) {
    throw const LibraryBackupException('백업 항목이 허용된 개수를 초과했습니다.');
  }
  _validateReferences(data);
  return _BackupDocument(Map.unmodifiable(data));
}

Future<Map<String, List<Map<String, Object?>>>> _readPortableData(
  sqflite.DatabaseExecutor executor,
) async {
  final scannedRows = await executor.query('scanned_audio_files');
  final pathToFileId = <String, String>{
    for (final row in scannedRows) row['path']! as String: row['id']! as String,
  };
  final trackToFileId = <String, String>{
    for (final row in await executor.query('catalog_tracks'))
      row['id']! as String: row['file_id']! as String,
  };
  final result = <String, List<Map<String, Object?>>>{};
  for (final spec in _tableSpecs) {
    final rows = spec.name == 'scanned_audio_files'
        ? scannedRows
        : await executor.query(spec.name);
    final portable = <Map<String, Object?>>[];
    for (final source in rows) {
      final row = spec.toPortableRow(source, pathToFileId, trackToFileId);
      if (row != null) portable.add(row);
    }
    portable.sort(
      (left, right) => spec.identity(left).compareTo(spec.identity(right)),
    );
    result[spec.name] = portable;
  }
  return result;
}

bool _sameRow(
  _BackupTableSpec spec,
  Map<String, Object?> first,
  Map<String, Object?> second,
) =>
    jsonEncode({for (final key in spec.columns) key: first[key]}) ==
    jsonEncode({for (final key in spec.columns) key: second[key]});

void _validateJsonValues(Iterable<Object?> values) {
  for (final value in values) {
    if (value == null || value is String || value is num || value is bool) {
      continue;
    }
    if (value is List<Object?>) {
      _validateJsonValues(value);
      continue;
    }
    if (value is Map<String, Object?>) {
      _validateJsonValues(value.values);
      continue;
    }
    throw const LibraryBackupException('백업에 지원하지 않는 값이 포함되어 있습니다.');
  }
}

void _validateReferences(Map<String, List<Map<String, Object?>>> data) {
  Set<String> ids(String table, String column) => {
    for (final row in data[table]!) row[column]! as String,
  };

  final people = ids('catalog_people', 'id');
  final instruments = ids('catalog_instruments', 'id');
  final ensembles = ids('catalog_ensembles', 'id');
  final albums = ids('catalog_albums', 'id');
  final works = ids('catalog_works', 'id');
  final parts = ids('catalog_work_parts', 'id');
  final recordings = ids('catalog_recordings', 'id');
  final tracks = ids('catalog_tracks', 'id');
  final files = ids('scanned_audio_files', 'id');
  bool optionalReference(Object? value, Set<String> targets) =>
      value == null || targets.contains(value);
  void require(bool condition, String message) {
    if (!condition) throw LibraryBackupException(message);
  }

  for (final row in data['catalog_works']!) {
    require(people.contains(row['composer_id']), '작품의 작곡가 참조가 올바르지 않습니다.');
  }
  for (final row in data['catalog_work_parts']!) {
    require(works.contains(row['work_id']), '악장의 작품 참조가 올바르지 않습니다.');
  }
  for (final row in data['catalog_recordings']!) {
    require(
      works.contains(row['work_id']) &&
          optionalReference(row['album_id'], albums) &&
          optionalReference(row['ensemble_id'], ensembles),
      '녹음 참조가 올바르지 않습니다.',
    );
  }
  for (final row in data['catalog_recording_credits']!) {
    require(
      recordings.contains(row['recording_id']) &&
          people.contains(row['person_id']) &&
          optionalReference(row['instrument_id'], instruments),
      '녹음 참여자 참조가 올바르지 않습니다.',
    );
  }
  for (final row in data['catalog_tracks']!) {
    final partIds = jsonDecode(row['work_part_ids_json']! as String);
    require(
      recordings.contains(row['recording_id']) &&
          files.contains(row['file_id']) &&
          partIds is List<Object?> &&
          partIds.every(parts.contains),
      '트랙 참조가 올바르지 않습니다.',
    );
  }
  for (final table in ['metadata_candidates', 'metadata_overrides']) {
    for (final row in data[table]!) {
      require(files.contains(row['file_id']), '$table 파일 참조가 올바르지 않습니다.');
    }
  }
  for (final row in data['audio_file_track_links']!) {
    require(
      files.contains(row['file_id']) && tracks.contains(row['track_id']),
      '파일 연결 참조가 올바르지 않습니다.',
    );
  }
  for (final row in data['playback_positions']!) {
    require(files.contains(row['file_id']), '재생 위치 파일 참조가 올바르지 않습니다.');
  }
  for (final row in data['playback_history']!) {
    require(
      files.contains(row['file_id']) &&
          works.contains(row['work_id']) &&
          recordings.contains(row['recording_id']) &&
          tracks.contains(row['track_id']),
      '감상 이력 참조가 올바르지 않습니다.',
    );
  }
  for (final row in data['imslp_work_links']!) {
    require(works.contains(row['work_id']), 'IMSLP 작품 참조가 올바르지 않습니다.');
  }

  final aliases = <String, String>{};
  for (final row in data['library_entity_merges']!) {
    if (row['undone_at_millis'] != null) continue;
    final targets = switch (row['entity_type']) {
      'work' => works,
      'recording' => recordings,
      _ => const <String>{},
    };
    require(targets.contains(row['target_id']), '병합 별칭의 대표 항목 참조가 올바르지 않습니다.');
    final source = '${row['entity_type']}:${row['source_id']}';
    final target = '${row['entity_type']}:${row['target_id']}';
    require(source != target, '병합 별칭은 자기 자신을 가리킬 수 없습니다.');
    aliases[source] = target;
  }
  for (final start in aliases.keys) {
    final visited = <String>{};
    var current = start;
    while (aliases.containsKey(current)) {
      require(visited.add(current), '병합 별칭 순환이 발견되었습니다.');
      current = aliases[current]!;
    }
  }
}

class _BackupTableSpec {
  const _BackupTableSpec({
    required this.name,
    required this.primaryKey,
    required this.columns,
    this.databasePrimaryKey,
    this.portable,
    this.databaseRow,
  });

  final String name;
  final String primaryKey;
  final String? databasePrimaryKey;
  final List<String> columns;
  final Map<String, Object?>? Function(
    Map<String, Object?>,
    Map<String, String>,
    Map<String, String>,
  )?
  portable;
  final Map<String, Object?> Function(Map<String, Object?>)? databaseRow;

  String get databaseKey => databasePrimaryKey ?? primaryKey;

  String identity(Map<String, Object?> row) => '${row[primaryKey]}';
  Object? databaseIdentity(Map<String, Object?> row) =>
      toDatabaseRow(row)[databaseKey];

  Map<String, Object?>? toPortableRow(
    Map<String, Object?> source,
    Map<String, String> pathToFileId,
    Map<String, String> trackToFileId,
  ) {
    final transformed = portable?.call(source, pathToFileId, trackToFileId);
    if (portable != null) return transformed;
    return {for (final column in columns) column: source[column]};
  }

  Map<String, Object?> toDatabaseRow(Map<String, Object?> row) =>
      databaseRow?.call(row) ?? row;

  void validate(Map<String, Object?> row) {
    final identityValue = row[primaryKey];
    if ((identityValue is! String || identityValue.trim().isEmpty) &&
        identityValue is! int) {
      throw LibraryBackupException('$name ID가 올바르지 않습니다.');
    }
  }
}

String _backupPath(String fileId) =>
    'ddirori-backup://missing/${Uri.encodeComponent(fileId)}';

final _privatePathPattern = RegExp(
  r'(file:/{2,}|/(?:Users|home|storage)/|(?:^|["\s])[A-Za-z]:[\\/])',
  caseSensitive: false,
);
final _credentialPattern = RegExp(
  r'(-----BEGIN .*PRIVATE K'
  r'EY-----|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|sk-[0-9A-Za-z_-]{20,})',
);

final List<_BackupTableSpec> _tableSpecs = [
  _BackupTableSpec(
    name: 'scanned_audio_files',
    primaryKey: 'id',
    columns: const [
      'id',
      'file_name',
      'format',
      'size_bytes',
      'modified_at_millis',
      'lightweight_fingerprint',
      'tag_read_status',
      'tag_metadata_json',
      'tag_failure_kind',
      'import_status',
      'source_references_json',
    ],
    portable: (row, _, _) => {
      'id': row['id'],
      'file_name': row['file_name'],
      'format': row['format'],
      'size_bytes': row['size_bytes'],
      'modified_at_millis': row['modified_at_millis'],
      'lightweight_fingerprint': row['lightweight_fingerprint'],
      'tag_read_status': row['tag_read_status'],
      'tag_metadata_json': row['tag_metadata_json'],
      'tag_failure_kind': row['tag_failure_kind'],
      'import_status': row['import_status'],
      'source_references_json': row['source_references_json'],
    },
    databaseRow: (row) => {
      ...row,
      'path': _backupPath(row['id']! as String),
      'last_seen_at_millis': null,
      'consecutive_miss_count': 2,
      'availability': 'missing',
    },
  ),
  _BackupTableSpec(
    name: 'metadata_candidates',
    primaryKey: 'file_id',
    columns: const [
      'file_id',
      'file_name',
      'composer_text',
      'work_title_text',
      'movement_text',
      'track_number',
      'track_total',
      'album_text',
      'artist_text',
      'album_artist_text',
      'genre_text',
      'year',
      'disc_number',
      'disc_total',
      'confidence',
      'source_label',
      'raw_pattern',
      'review_status',
      'has_tag_conflict',
    ],
    portable: (row, _, _) => {
      for (final column in const [
        'file_id',
        'file_name',
        'composer_text',
        'work_title_text',
        'movement_text',
        'track_number',
        'track_total',
        'album_text',
        'artist_text',
        'album_artist_text',
        'genre_text',
        'year',
        'disc_number',
        'disc_total',
        'confidence',
        'source_label',
        'raw_pattern',
        'review_status',
        'has_tag_conflict',
      ])
        column: row[column],
    },
    databaseRow: (row) => {
      ...row,
      'file_path': _backupPath(row['file_id']! as String),
    },
  ),
  const _BackupTableSpec(
    name: 'metadata_overrides',
    primaryKey: 'file_id',
    columns: [
      'file_id',
      'values_json',
      'sources_json',
      'fallback_values_json',
      'fallback_sources_json',
      'updated_at_millis',
      'musicbrainz_recording_id',
      'musicbrainz_work_id',
      'musicbrainz_release_id',
    ],
  ),
  const _BackupTableSpec(
    name: 'catalog_people',
    primaryKey: 'id',
    columns: ['id', 'name_json', 'birth_year', 'death_year', 'origin'],
  ),
  const _BackupTableSpec(
    name: 'catalog_instruments',
    primaryKey: 'id',
    columns: ['id', 'name_json'],
  ),
  const _BackupTableSpec(
    name: 'catalog_ensembles',
    primaryKey: 'id',
    columns: ['id', 'name_json'],
  ),
  const _BackupTableSpec(
    name: 'catalog_albums',
    primaryKey: 'id',
    columns: ['id', 'title_json', 'label', 'release_year'],
  ),
  const _BackupTableSpec(
    name: 'catalog_works',
    primaryKey: 'id',
    columns: [
      'id',
      'composer_id',
      'title_json',
      'catalog_number',
      'period_label',
      'source_references_json',
      'origin',
    ],
  ),
  const _BackupTableSpec(
    name: 'catalog_work_parts',
    primaryKey: 'id',
    columns: ['id', 'work_id', 'title_json', 'sequence_number'],
  ),
  const _BackupTableSpec(
    name: 'catalog_recordings',
    primaryKey: 'id',
    columns: [
      'id',
      'work_id',
      'title_json',
      'album_id',
      'ensemble_id',
      'recorded_year',
      'source_references_json',
      'origin',
    ],
  ),
  const _BackupTableSpec(
    name: 'catalog_recording_credits',
    primaryKey: 'id',
    columns: ['id', 'recording_id', 'person_id', 'role', 'instrument_id'],
  ),
  const _BackupTableSpec(
    name: 'catalog_tracks',
    primaryKey: 'id',
    columns: [
      'id',
      'recording_id',
      'file_id',
      'sequence_number',
      'work_part_ids_json',
      'title_json',
      'duration_millis',
    ],
  ),
  const _BackupTableSpec(
    name: 'audio_file_track_links',
    primaryKey: 'track_id',
    columns: ['track_id', 'file_id', 'linked_at_millis'],
  ),
  const _BackupTableSpec(
    name: 'library_entity_merges',
    primaryKey: 'id',
    columns: [
      'id',
      'entity_type',
      'source_id',
      'target_id',
      'source_label',
      'target_label',
      'merged_at_millis',
      'evidence_json',
      'undo_snapshot_json',
      'undone_at_millis',
    ],
  ),
  _BackupTableSpec(
    name: 'playback_positions',
    primaryKey: 'file_id',
    databasePrimaryKey: 'path',
    columns: const [
      'file_id',
      'position_millis',
      'duration_millis',
      'updated_at_millis',
      'is_completed',
      'file_modified_at_millis',
    ],
    portable: (row, paths, _) {
      final fileId = paths[row['path']];
      if (fileId == null) return null;
      return {
        'file_id': fileId,
        'position_millis': row['position_millis'],
        'duration_millis': row['duration_millis'],
        'updated_at_millis': row['updated_at_millis'],
        'is_completed': row['is_completed'],
        'file_modified_at_millis': row['file_modified_at_millis'],
      };
    },
    databaseRow: (row) => {
      'path': _backupPath(row['file_id']! as String),
      'position_millis': row['position_millis'],
      'duration_millis': row['duration_millis'],
      'updated_at_millis': row['updated_at_millis'],
      'is_completed': row['is_completed'],
      'file_modified_at_millis': row['file_modified_at_millis'],
    },
  ),
  _BackupTableSpec(
    name: 'playback_history',
    primaryKey: 'session_id',
    columns: const [
      'session_id',
      'track_id',
      'recording_id',
      'work_id',
      'file_id',
      'work_title',
      'recording_title',
      'track_title',
      'started_at_millis',
      'last_played_at_millis',
      'listened_millis',
      'last_position_millis',
      'duration_millis',
      'status',
    ],
    portable: (row, paths, trackFiles) {
      final fileId = trackFiles[row['track_id']] ?? paths[row['path']];
      if (fileId == null) return null;
      return {
        'session_id': row['session_id'],
        'track_id': row['track_id'],
        'recording_id': row['recording_id'],
        'work_id': row['work_id'],
        'file_id': fileId,
        'work_title': row['work_title'],
        'recording_title': row['recording_title'],
        'track_title': row['track_title'],
        'started_at_millis': row['started_at_millis'],
        'last_played_at_millis': row['last_played_at_millis'],
        'listened_millis': row['listened_millis'],
        'last_position_millis': row['last_position_millis'],
        'duration_millis': row['duration_millis'],
        'status': row['status'],
      };
    },
    databaseRow: (row) => {
      for (final entry in row.entries)
        if (entry.key != 'file_id') entry.key: entry.value,
      'path': _backupPath(row['file_id']! as String),
    },
  ),
  const _BackupTableSpec(
    name: 'playback_history_preferences',
    primaryKey: 'id',
    columns: ['id', 'retention_policy'],
  ),
  const _BackupTableSpec(
    name: 'imslp_work_links',
    primaryKey: 'work_id',
    columns: [
      'work_id',
      'external_id',
      'page_url',
      'work_title',
      'composer_name',
      'catalog_number',
      'linked_at_millis',
    ],
  ),
];
