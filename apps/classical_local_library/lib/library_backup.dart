import 'dart:convert';

import 'package:sqflite/sqflite.dart' as sqflite;

import 'sqlite_migration.dart';
import 'library_view_settings.dart';
import 'classical_library_models.dart';
import 'audio_tags.dart';
import 'metadata_overrides.dart';
import 'metadata_candidates.dart';
import 'playback_history.dart';

const libraryBackupSchemaVersion = 1;
const libraryBackupFormat = 'ddirori-play-logical-backup';
const libraryBackupAppVersion = '1.0.0';
final _artworkHashPattern = RegExp(r'^[a-f0-9]{64}$');

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
    throw const LibraryBackupException(
      '백업에 개인 경로나 비밀값으로 보이는 내용이 포함되어 있습니다. 원본 라이브러리를 최신 앱에서 다시 내보내 주세요.',
    );
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
  // Older exports omit tables introduced after their storage version.
  final scopedSpecs = [
    for (final spec in _tableSpecs)
      if ((storageVersion >= 18 || spec.name != 'local_favorites') &&
          (storageVersion >= 15 || spec.name != 'local_playlists') &&
          (storageVersion >= 16 ||
              !{
                'library_view_settings',
                'library_artwork',
              }.contains(spec.name)))
        spec,
  ];
  final expectedScope = scopedSpecs.map((spec) => spec.name).toList();
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
  for (final spec in scopedSpecs) {
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
      if (storageVersion < 19 && rawRow is Map<String, Object?>) {
        if (spec.name == 'catalog_people') {
          rawRow.putIfAbsent('composer_profile_json', () => null);
        }
        if (spec.name == 'catalog_works') {
          rawRow.putIfAbsent('period_assessment_json', () => null);
        }
      }
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
  if (storageVersion < 15) data['local_playlists'] = const [];
  if (storageVersion < 16) data['library_view_settings'] = const [];
  if (storageVersion < 16) data['library_artwork'] = const [];
  if (storageVersion < 18) data['local_favorites'] = const [];
  if (totalRows > 100000) {
    throw const LibraryBackupException('백업 항목이 허용된 개수를 초과했습니다.');
  }
  try {
    _validateReferences(data);
  } on LibraryBackupException {
    rethrow;
  } catch (_) {
    throw const LibraryBackupException('백업 참조 데이터 형식이 올바르지 않습니다.');
  }
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
    require(
      source != target && !aliases.containsKey(source),
      '병합 별칭이 중복되거나 자기 자신을 가리킵니다.',
    );
    aliases[source] = target;
  }
  String canonical(String type, Object? id) {
    var current = '$type:$id';
    final visited = <String>{};
    while (aliases.containsKey(current)) {
      require(visited.add(current), '병합 별칭 순환이 발견되었습니다.');
      current = aliases[current]!;
    }
    return current;
  }

  for (final row in data['library_entity_merges']!) {
    canonical('${row['entity_type']}', row['source_id']);
  }
  final recordingRows = {
    for (final row in data['catalog_recordings']!) row['id']: row,
  };
  final trackRows = {for (final row in data['catalog_tracks']!) row['id']: row};
  final partRows = {
    for (final row in data['catalog_work_parts']!) row['id']: row,
  };

  for (final row in data['local_favorites']!) {
    require(files.contains(row['file_id']), '즐겨찾기 파일 참조가 올바르지 않습니다.');
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
    require(
      (partIds as List).every(
        (id) =>
            canonical('work', partRows[id]!['work_id']) ==
            canonical('work', recordingRows[row['recording_id']]!['work_id']),
      ),
      '트랙의 악장과 녹음의 작품이 일치하지 않습니다.',
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
  bool sameHistoryEntity(
    String type,
    Object? left,
    Object? right,
    Map<String, Object?>? historicalMerge,
  ) {
    final a = canonical(type, left), b = canonical(type, right);
    if (a == b) return true;
    if (historicalMerge?['entity_type'] != type) return false;
    // An undone audit's after-image still describes that selected merge.
    final pair = {
      canonical(type, historicalMerge!['source_id']),
      canonical(type, historicalMerge['target_id']),
    };
    return pair.contains(a) && pair.contains(b);
  }

  void validateHistoryRow(
    Map<String, Object?> row, {
    Map<String, Object?>? historicalMerge,
  }) {
    final directId = 'local-file:${row['file_id']}';
    final isDirect =
        row['track_id'] == directId &&
        row['recording_id'] == directId &&
        row['work_id'] == directId;
    require(
      files.contains(row['file_id']) &&
          (isDirect ||
              (works.contains(row['work_id']) &&
                  recordings.contains(row['recording_id']) &&
                  tracks.contains(row['track_id']))),
      '감상 이력 참조가 올바르지 않습니다.',
    );
    if (!isDirect) {
      final track = trackRows[row['track_id']]!;
      require(
        sameHistoryEntity(
              'recording',
              row['recording_id'],
              track['recording_id'],
              historicalMerge,
            ) &&
            sameHistoryEntity(
              'work',
              row['work_id'],
              recordingRows[row['recording_id']]!['work_id'],
              historicalMerge,
            ),
        '감상 이력의 작품·녹음·트랙 관계가 일치하지 않습니다.',
      );
      // A historical file may have been replaced by relink; do not compare it
      // with the track's current file mapping.
    }
  }

  for (final row in data['playback_history']!) {
    validateHistoryRow(row);
  }
  for (final merge in data['library_entity_merges']!) {
    if (merge['undo_snapshot_json'] == null) continue;
    final snapshot = jsonDecode(
      merge['undo_snapshot_json']! as String,
    ) as Map<String, Object?>;
    if (snapshot.isEmpty) continue;
    for (final side in ['before', 'after']) {
      final section = snapshot[side]! as Map<String, Object?>;
      for (final raw in section['playback_history']! as List) {
        final row = (raw as Map).cast<String, Object?>();
        validateHistoryRow({
          ...row,
          'file_id': _snapshotHistoryFileId(row),
        }, historicalMerge: merge);
      }
      for (final raw in section['imslp_work_links'] as List? ?? const []) {
        require(
          works.contains((raw as Map)['work_id']),
          '병합 복원 정보의 IMSLP 참조가 올바르지 않습니다.',
        );
      }
    }
  }
  for (final row in data['imslp_work_links']!) {
    require(works.contains(row['work_id']), 'IMSLP 작품 참조가 올바르지 않습니다.');
  }
  for (final row in data['local_playlists']!) {
    final fileIds = jsonDecode(row['file_ids_json']! as String);
    require(
      row['name'] is String &&
          (row['name']! as String).trim().isNotEmpty &&
          row['created_at_millis'] is int &&
          row['updated_at_millis'] is int &&
          fileIds is List<Object?> &&
          fileIds.length <= 100000 &&
          fileIds.every((id) => id is String && id.isNotEmpty) &&
          fileIds.toSet().length == fileIds.length,
      '재생목록 데이터가 올바르지 않습니다.',
    );
    // A removed file stays in the list for later relinking.
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
    try {
      const integerColumns = {
        'size_bytes',
        'birth_year',
        'death_year',
        'release_year',
        'recorded_year',
        'year',
        'track_number',
        'track_total',
        'disc_number',
        'disc_total',
        'sequence_number',
        'has_tag_conflict',
        'is_completed',
      };
      for (final entry in row.entries) {
        final value = entry.value;
        if (value == null) continue;
        final column = entry.key;
        final integer =
            integerColumns.contains(column) ||
            column.endsWith('_millis') ||
            (column == 'id' &&
                {
                  'library_view_settings',
                  'playback_history_preferences',
                }.contains(name));
        if (column == 'confidence') {
          if (value is! num || !value.isFinite || value < 0 || value > 1) {
            throw const FormatException('confidence');
          }
        } else if (integer) {
          if (value is! int) throw const FormatException('integer');
          if ({
                'size_bytes',
                'position_millis',
                'last_position_millis',
                'duration_millis',
                'listened_millis',
              }.contains(column) &&
              value < 0) {
            throw const FormatException('negative size/time');
          }
          if ({'has_tag_conflict', 'is_completed'}.contains(column) &&
              value != 0 &&
              value != 1) {
            throw const FormatException('boolean');
          }
        } else if (value is! String) {
          throw const FormatException('text');
        }
      }
      if (name == 'scanned_audio_files') {
        AudioImportStatus.values.byName(row['import_status']! as String);
        AudioTagReadStatus.values.byName(row['tag_read_status']! as String);
        if (row['tag_failure_kind'] != null) {
          AudioTagFailureKind.values.byName(row['tag_failure_kind']! as String);
        }
      }
      if (name == 'metadata_candidates') {
        MetadataReviewStatus.values.byName(row['review_status']! as String);
      }
      if (name == 'catalog_recording_credits') {
        RecordingRole.values.byName(row['role']! as String);
      }
      if (name == 'playback_history') {
        PlaybackHistoryStatus.values.byName(row['status']! as String);
      }
      if (name == 'playback_history_preferences') {
        if (row['id'] != 1) throw const FormatException('preferences id');
        PlaybackHistoryRetentionPolicy.values.byName(
          row['retention_policy']! as String,
        );
      }
      for (final entry in row.entries) {
        if (entry.key.endsWith('_json') && entry.value != null) {
          final decoded = jsonDecode(entry.value! as String);
          final normalized = jsonEncode(decoded);
          if (_privatePathPattern.hasMatch(normalized) ||
              _credentialPattern.hasMatch(normalized)) {
            throw const FormatException('private data in JSON');
          }
        }
      }
      if (name == 'library_entity_merges') {
        if (!const {'work', 'recording'}.contains(row['entity_type'])) {
          throw const FormatException('merge entity type');
        }
        final evidence = jsonDecode(row['evidence_json']! as String) as List;
        for (final item in evidence) {
          item as String;
        }
        if (row['undo_snapshot_json'] != null) {
          _validatePortableMergeSnapshot(
            jsonDecode(row['undo_snapshot_json']! as String)
                as Map<String, Object?>,
          );
        }
      }
      for (final column in ['name_json', 'title_json']) {
        if (!row.containsKey(column) || row[column] == null) continue;
        final value =
            jsonDecode(row[column]! as String) as Map<String, Object?>;
        value['ko']! as String;
        value['sortName']! as String;
        value['original'] as String?;
        value['english'] as String?;
        if (value['aliases'] != null) {
          for (final alias in value['aliases']! as List) {
            alias as String;
          }
        }
      }
      if (row.containsKey('source_references_json')) {
        for (final source
            in jsonDecode(row['source_references_json']! as String) as List) {
          SourceReference.fromJson((source as Map).cast<String, Object?>());
        }
      }
      if (row['tag_metadata_json'] != null) {
        AudioTagMetadata.fromJson(
          (jsonDecode(row['tag_metadata_json']! as String) as Map)
              .cast<String, Object?>(),
        );
      }
      if (name == 'metadata_overrides') MetadataOverride.fromStorageRow(row);
      if (name == 'catalog_people' && row['composer_profile_json'] != null) {
        ComposerProfile.fromJson(
          (jsonDecode(row['composer_profile_json'] as String) as Map)
              .cast<String, Object?>(),
        );
      }
      if (name == 'catalog_works' && row['period_assessment_json'] != null) {
        PeriodAssessment.fromJson(
          (jsonDecode(row['period_assessment_json'] as String) as Map)
              .cast<String, Object?>(),
        );
      }
    } catch (_) {
      throw LibraryBackupException('$name의 저장 정보 형식이 올바르지 않습니다.');
    }
    if (name == 'library_artwork' &&
        (row['owner'] is! String ||
            !(row['owner']! as String).startsWith(
              RegExp(r'(file|playlist):'),
            ) ||
            row['image_hash'] is! String ||
            !_artworkHashPattern.hasMatch(row['image_hash']! as String) ||
            (row['source_stamp'] != null &&
                (row['source_stamp'] is! String ||
                    !_artworkHashPattern.hasMatch(
                      row['source_stamp']! as String,
                    ))))) {
      throw const LibraryBackupException('표지 참조가 올바르지 않습니다.');
    }
    if (name == 'library_view_settings') {
      try {
        if (row['id'] != 1) throw const FormatException('settings id');
        LibraryViewSettings.fromJson(
          (jsonDecode(row['value_json']! as String) as Map)
              .cast<String, Object?>(),
        );
      } catch (_) {
        throw const LibraryBackupException('보관함 표시 설정이 올바르지 않습니다.');
      }
    }
    final identityValue = row[primaryKey];
    if ((identityValue is! String || identityValue.trim().isEmpty) &&
        identityValue is! int) {
      throw LibraryBackupException('$name ID가 올바르지 않습니다.');
    }
  }
}

String _backupPath(String fileId) =>
    'ddirori-backup://missing/${Uri.encodeComponent(fileId)}';

const _mergeSnapshotTables = {
  'playback_history',
  'imslp_work_links',
  'imslp_imports',
  'imslp_resources',
};
const _excludedMergeSnapshotTables = {'imslp_imports', 'imslp_resources'};

String _snapshotHistoryFileId(Map<String, Object?> row) {
  final uri = Uri.parse(row['path']! as String);
  if (uri.scheme != 'ddirori-backup' ||
      uri.host != 'missing' ||
      uri.pathSegments.length != 1 ||
      row['path'] != _backupPath(uri.pathSegments.single)) {
    throw const FormatException(
      'Non-portable merge history; re-export from the source library',
    );
  }
  return uri.pathSegments.single;
}

void _validatePortableMergeSnapshot(Map<String, Object?> snapshot) {
  if (snapshot.isEmpty) return;
  if (snapshot.keys.toSet().difference({'before', 'after'}).isNotEmpty ||
      snapshot.length != 2) {
    throw const FormatException('snapshot sections');
  }
  Set<String>? tables;
  for (final side in ['before', 'after']) {
    final section = snapshot[side]! as Map<String, Object?>;
    if (!section.containsKey('playback_history') ||
        section.keys.any((key) => !_mergeSnapshotTables.contains(key))) {
      throw const FormatException('snapshot tables');
    }
    if (tables != null &&
        (tables.difference(section.keys.toSet()).isNotEmpty ||
            tables.length != section.length)) {
      throw const FormatException('snapshot selectors');
    }
    tables = section.keys.toSet();
    for (final entry in section.entries) {
      final rows = entry.value! as List<Object?>;
      if (_excludedMergeSnapshotTables.contains(entry.key)) {
        if (rows.isNotEmpty) {
          throw const FormatException('non-portable import/resource snapshot');
        }
        continue;
      }
      final spec = _tableSpecs.singleWhere((spec) => spec.name == entry.key);
      final columns = {
        for (final column in spec.columns)
          column == 'file_id' && entry.key == 'playback_history'
              ? 'path'
              : column,
      };
      for (final raw in rows) {
        final row = (raw! as Map).cast<String, Object?>();
        if (row.length != columns.length ||
            row.keys.any((key) => !columns.contains(key))) {
          throw const FormatException('snapshot row');
        }
        spec.validate(
          entry.key == 'playback_history'
              ? {
                  for (final column in spec.columns)
                    column: column == 'file_id'
                        ? _snapshotHistoryFileId(row)
                        : row[column],
                }
              : row,
        );
      }
    }
  }
}

String? _portableMergeSnapshot(
  Object? value,
  Map<String, String> paths,
  Map<String, String> trackFiles,
) {
  if (value == null) return null;
  try {
    final snapshot = jsonDecode(value as String) as Map<String, Object?>;
    if (snapshot.isEmpty) return '{}';
    final result = <String, Object?>{};
    for (final section in ['before', 'after']) {
      final original = snapshot[section]! as Map<String, Object?>;
      final converted = <String, Object?>{};
      for (final entry in original.entries) {
        if (!_mergeSnapshotTables.contains(entry.key)) {
          throw const FormatException('snapshot table');
        }
        if (_excludedMergeSnapshotTables.contains(entry.key)) {
          // Imports/resources and their local copies are outside logical backup.
          // Retain empty selectors so existing undo conflict checks remain strict.
          converted[entry.key] = <Object?>[];
          continue;
        }
        final spec = _tableSpecs.singleWhere((spec) => spec.name == entry.key);
        final rows = <Map<String, Object?>>[];
        for (final item in entry.value! as List<Object?>) {
          final row = (item! as Map).cast<String, Object?>();
          final portable = spec.toPortableRow(row, paths, trackFiles);
          if (portable != null) rows.add(spec.toDatabaseRow(portable));
        }
        converted[entry.key] = rows;
      }
      result[section] = converted;
    }
    return jsonEncode(result);
  } catch (_) {
    throw const LibraryBackupException('병합 복원 정보를 백업으로 변환하지 못했습니다.');
  }
}

final _privatePathPattern = RegExp(
  r'(file:/{2,}|/(?:Users|home|storage)/|/(?:private/)?var/(?:mobile|folders)/|(?:^|["\s])[A-Za-z]:[\\/])',
  caseSensitive: false,
);
final _credentialPattern = RegExp(
  r'(-----BEGIN .*PRIVATE K'
  r'EY-----|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|sk-[0-9A-Za-z_-]{20,})',
);

final List<_BackupTableSpec> _tableSpecs = [
  const _BackupTableSpec(
    name: 'library_artwork',
    primaryKey: 'owner',
    columns: ['owner', 'image_hash', 'source_stamp'],
  ),
  const _BackupTableSpec(
    name: 'library_view_settings',
    primaryKey: 'id',
    columns: ['id', 'value_json'],
  ),
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
    columns: [
      'id',
      'name_json',
      'birth_year',
      'death_year',
      'composer_profile_json',
      'origin',
    ],
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
      'period_assessment_json',
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
  _BackupTableSpec(
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
    portable: (row, paths, trackFiles) => {
      ...row,
      'undo_snapshot_json': _portableMergeSnapshot(
        row['undo_snapshot_json'],
        paths,
        trackFiles,
      ),
    },
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
      // A linked replacement can differ from the catalog's original file.
      // Preserve the file actually listened to whenever its path is known.
      final fileId = paths[row['path']] ?? trackFiles[row['track_id']];
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
    name: 'local_favorites',
    primaryKey: 'file_id',
    columns: ['file_id'],
  ),
  const _BackupTableSpec(
    name: 'local_playlists',
    primaryKey: 'id',
    columns: [
      'id',
      'name',
      'file_ids_json',
      'created_at_millis',
      'updated_at_millis',
    ],
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
