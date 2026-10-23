import 'dart:convert';

import 'package:sqflite/sqflite.dart' as sqflite;

import 'classical_library_models.dart';
import 'library_search.dart';

enum LibraryEntityType { work, recording }

class DuplicateLibraryCandidate {
  const DuplicateLibraryCandidate({
    required this.entityType,
    required this.sourceId,
    required this.targetId,
    required this.sourceLabel,
    required this.targetLabel,
    required this.confidence,
    required this.evidence,
  });

  final LibraryEntityType entityType;
  final String sourceId;
  final String targetId;
  final String sourceLabel;
  final String targetLabel;
  final double confidence;
  final List<String> evidence;
}

class LibraryEntityMerge {
  const LibraryEntityMerge({
    required this.id,
    required this.entityType,
    required this.sourceId,
    required this.targetId,
    required this.sourceLabel,
    required this.targetLabel,
    required this.mergedAtMillis,
    required this.evidence,
    this.undoSnapshot = const {},
    this.undoneAtMillis,
  });

  final String id;
  final LibraryEntityType entityType;
  final String sourceId;
  final String targetId;
  final String sourceLabel;
  final String targetLabel;
  final int mergedAtMillis;
  final List<String> evidence;
  final Map<String, Object?> undoSnapshot;
  final int? undoneAtMillis;

  bool get isActive => undoneAtMillis == null;

  LibraryEntityMerge markUndone(int atMillis) => LibraryEntityMerge(
    id: id,
    entityType: entityType,
    sourceId: sourceId,
    targetId: targetId,
    sourceLabel: sourceLabel,
    targetLabel: targetLabel,
    mergedAtMillis: mergedAtMillis,
    evidence: evidence,
    undoSnapshot: undoSnapshot,
    undoneAtMillis: atMillis,
  );
}

class LibraryMergeUndoException implements Exception {
  const LibraryMergeUndoException(this.userMessage);

  final String userMessage;

  @override
  String toString() => userMessage;
}

class LibraryDuplicateDetector {
  const LibraryDuplicateDetector({this.normalizer = const SearchNormalizer()});

  final SearchNormalizer normalizer;

  List<DuplicateLibraryCandidate> detect(
    ClassicalLibrary library, {
    List<LibraryEntityMerge> existingMerges = const [],
  }) {
    final mergedSources = {
      for (final merge in existingMerges)
        if (merge.isActive) '${merge.entityType.name}:${merge.sourceId}',
    };
    return [
      ..._workCandidates(library, mergedSources),
      ..._recordingCandidates(library, mergedSources),
    ];
  }

  List<DuplicateLibraryCandidate> _workCandidates(
    ClassicalLibrary library,
    Set<String> mergedSources,
  ) {
    final results = <DuplicateLibraryCandidate>[];
    for (var leftIndex = 0; leftIndex < library.works.length; leftIndex += 1) {
      final left = library.works[leftIndex];
      for (
        var rightIndex = leftIndex + 1;
        rightIndex < library.works.length;
        rightIndex += 1
      ) {
        final right = library.works[rightIndex];
        if (left.composerId != right.composerId) continue;
        final evidence = <String>['작곡가 일치'];
        var confidence = 0.0;
        final leftMusicBrainzId = _musicBrainzId(left.sourceReferences);
        if (leftMusicBrainzId != null &&
            leftMusicBrainzId == _musicBrainzId(right.sourceReferences)) {
          evidence.add('MusicBrainz work ID 일치');
          confidence = 1;
        }
        final leftCatalog = normalizer.normalize(left.catalogNumber ?? '');
        final rightCatalog = normalizer.normalize(right.catalogNumber ?? '');
        if (leftCatalog.isNotEmpty && leftCatalog == rightCatalog) {
          evidence.add('작품 번호 일치');
          confidence = 0.99;
        }
        final leftTitle = normalizer.normalize(left.title.sortName);
        final rightTitle = normalizer.normalize(right.title.sortName);
        if (leftTitle.isNotEmpty && leftTitle == rightTitle) {
          evidence.add('정규화 작품명 일치');
          confidence = confidence < 0.94 ? 0.94 : confidence;
        }
        final leftSequences = library
            .partsForWork(left.id)
            .map((part) => part.sequenceNumber)
            .toList();
        final rightSequences = library
            .partsForWork(right.id)
            .map((part) => part.sequenceNumber)
            .toList();
        if (leftSequences.isNotEmpty &&
            _sameIntegers(leftSequences, rightSequences)) {
          evidence.add('악장 수와 순서 일치');
          confidence += 0.02;
        }
        if (confidence == 0) continue;
        final source = right;
        final target = left;
        if (mergedSources.contains('work:${source.id}')) continue;
        results.add(
          DuplicateLibraryCandidate(
            entityType: LibraryEntityType.work,
            sourceId: source.id,
            targetId: target.id,
            sourceLabel: source.title.ko,
            targetLabel: target.title.ko,
            confidence: confidence,
            evidence: evidence,
          ),
        );
      }
    }
    return results;
  }

  List<DuplicateLibraryCandidate> _recordingCandidates(
    ClassicalLibrary library,
    Set<String> mergedSources,
  ) {
    final results = <DuplicateLibraryCandidate>[];
    for (
      var leftIndex = 0;
      leftIndex < library.recordings.length;
      leftIndex += 1
    ) {
      final left = library.recordings[leftIndex];
      for (
        var rightIndex = leftIndex + 1;
        rightIndex < library.recordings.length;
        rightIndex += 1
      ) {
        final right = library.recordings[rightIndex];
        if (left.workId != right.workId) continue;
        final evidence = <String>['작품 일치'];
        var confidence = 0.0;
        if (_musicBrainzId(left.sourceReferences) case final leftId?) {
          if (leftId == _musicBrainzId(right.sourceReferences)) {
            evidence.add('MusicBrainz ID 일치');
            confidence = 1;
          }
        }
        if (normalizer.normalize(left.title.sortName) ==
            normalizer.normalize(right.title.sortName)) {
          evidence.add('정규화 녹음명 일치');
          confidence = confidence < 0.92 ? 0.92 : confidence;
        }
        if (left.recordedYear != null &&
            left.recordedYear == right.recordedYear) {
          evidence.add('녹음 연도 일치');
          confidence += 0.03;
        }
        if (left.ensembleId != null && left.ensembleId == right.ensembleId) {
          evidence.add('앙상블 일치');
          confidence += 0.03;
        }
        final leftCredits = {
          for (final credit in left.credits)
            '${credit.role.name}:${credit.personId}:${credit.instrumentId}',
        };
        final rightCredits = {
          for (final credit in right.credits)
            '${credit.role.name}:${credit.personId}:${credit.instrumentId}',
        };
        if (leftCredits.isNotEmpty &&
            leftCredits.intersection(rightCredits).isNotEmpty) {
          evidence.add('연주자·지휘자 credit 일치');
          confidence += 0.03;
        }
        if (confidence < 0.9) continue;
        final source = right;
        final target = left;
        if (mergedSources.contains('recording:${source.id}')) continue;
        results.add(
          DuplicateLibraryCandidate(
            entityType: LibraryEntityType.recording,
            sourceId: source.id,
            targetId: target.id,
            sourceLabel: source.title.ko,
            targetLabel: target.title.ko,
            confidence: confidence.clamp(0, 1),
            evidence: evidence,
          ),
        );
      }
    }
    return results;
  }

  String? _musicBrainzId(List<SourceReference> sources) {
    for (final source in sources) {
      if (source.kind == SourceKind.musicBrainz && source.externalId != null) {
        return source.externalId;
      }
    }
    return null;
  }

  bool _sameIntegers(List<int> left, List<int> right) {
    if (left.length != right.length) return false;
    for (var index = 0; index < left.length; index += 1) {
      if (left[index] != right[index]) return false;
    }
    return true;
  }
}

abstract interface class LibraryMergeStore {
  Future<List<LibraryEntityMerge>> load();
  Future<void> merge(LibraryEntityMerge merge);
  Future<void> undo(String mergeId, int undoneAtMillis);
}

class MemoryLibraryMergeStore implements LibraryMergeStore {
  MemoryLibraryMergeStore([List<LibraryEntityMerge> seed = const []])
    : _items = [...seed];

  final List<LibraryEntityMerge> _items;

  @override
  Future<List<LibraryEntityMerge>> load() async => List.unmodifiable(_items);

  @override
  Future<void> merge(LibraryEntityMerge merge) async {
    if (_items.any(
      (item) =>
          item.isActive &&
          item.entityType == merge.entityType &&
          item.sourceId == merge.sourceId,
    )) {
      throw const FormatException('이미 적용 중인 병합입니다.');
    }
    _items.add(merge);
  }

  @override
  Future<void> undo(String mergeId, int undoneAtMillis) async {
    final index = _items.indexWhere((item) => item.id == mergeId);
    if (index < 0) {
      throw const LibraryMergeUndoException('병합 기록을 찾지 못했습니다.');
    }
    final merge = _items[index];
    if (!merge.isActive) {
      throw const LibraryMergeUndoException('이미 되돌린 병합입니다.');
    }
    _ensureNoLaterConflict(_items, merge);
    _items[index] = merge.markUndone(undoneAtMillis);
  }
}

class LibraryMergeRepository {
  const LibraryMergeRepository(this.store, {this.clock = DateTime.now});

  final LibraryMergeStore store;
  final DateTime Function() clock;

  Future<List<LibraryEntityMerge>> load() => store.load();

  Future<List<LibraryEntityMerge>> confirm(
    DuplicateLibraryCandidate candidate,
  ) async {
    final mergedAt = clock().millisecondsSinceEpoch;
    final sourceId = await resolve(candidate.entityType, candidate.sourceId);
    final targetId = await resolve(candidate.entityType, candidate.targetId);
    if (sourceId == targetId) {
      throw const FormatException('이미 같은 대표 항목을 가리키고 있습니다.');
    }
    await store.merge(
      LibraryEntityMerge(
        id: '${candidate.entityType.name}:$sourceId:$mergedAt',
        entityType: candidate.entityType,
        sourceId: sourceId,
        targetId: targetId,
        sourceLabel: candidate.sourceLabel,
        targetLabel: candidate.targetLabel,
        mergedAtMillis: mergedAt,
        evidence: candidate.evidence,
      ),
    );
    return load();
  }

  Future<String> resolve(LibraryEntityType type, String id) async {
    final merges = await load();
    var current = id;
    final visited = <String>{};
    while (visited.add(current)) {
      LibraryEntityMerge? match;
      for (final merge in merges) {
        if (merge.isActive &&
            merge.entityType == type &&
            merge.sourceId == current) {
          match = merge;
          break;
        }
      }
      if (match == null) return current;
      current = match.targetId;
    }
    throw StateError('순환 병합 별칭을 확인했습니다.');
  }

  Future<List<LibraryEntityMerge>> undo(String mergeId) async {
    await store.undo(mergeId, clock().millisecondsSinceEpoch);
    return load();
  }
}

class LibraryAliasIndex {
  LibraryAliasIndex(List<LibraryEntityMerge> merges)
    : _activeMerges = [
        for (final merge in merges)
          if (merge.isActive) merge,
      ];

  final List<LibraryEntityMerge> _activeMerges;

  String resolve(LibraryEntityType type, String id) {
    var current = id;
    final visited = <String>{};
    while (visited.add(current)) {
      LibraryEntityMerge? match;
      for (final merge in _activeMerges) {
        if (merge.entityType == type && merge.sourceId == current) {
          match = merge;
          break;
        }
      }
      if (match == null) return current;
      current = match.targetId;
    }
    throw StateError('순환 병합 별칭을 확인했습니다.');
  }

  Map<String, String> aliasesFor(LibraryEntityType type) => {
    for (final merge in _activeMerges)
      if (merge.entityType == type)
        merge.sourceId: resolve(type, merge.sourceId),
  };
}

class SqliteLibraryMergeStore implements LibraryMergeStore {
  const SqliteLibraryMergeStore(
    this.database, {
    this.beforeAuditWrite,
    this.beforeUndoWrite,
  });

  final sqflite.Database database;
  final Future<void> Function()? beforeAuditWrite;
  final Future<void> Function()? beforeUndoWrite;

  @override
  Future<List<LibraryEntityMerge>> load() async {
    final rows = await database.query(
      'library_entity_merges',
      orderBy: 'merged_at_millis DESC',
    );
    return [for (final row in rows) _fromRow(row)];
  }

  @override
  Future<void> merge(LibraryEntityMerge merge) async {
    if (merge.sourceId == merge.targetId) {
      throw const FormatException('같은 항목끼리는 병합할 수 없습니다.');
    }
    await database.transaction((transaction) async {
      final before = await _captureAffected(transaction, merge);
      switch (merge.entityType) {
        case LibraryEntityType.work:
          await _mergeWorkReferences(transaction, merge);
        case LibraryEntityType.recording:
          await transaction.update(
            'playback_history',
            {
              'recording_id': merge.targetId,
              'recording_title': merge.targetLabel,
            },
            where: 'recording_id = ?',
            whereArgs: [merge.sourceId],
          );
          await transaction.update(
            'imslp_imports',
            {'recording_id': merge.targetId},
            where: 'recording_id = ?',
            whereArgs: [merge.sourceId],
          );
      }
      final after = await _captureAffected(transaction, merge);
      await beforeAuditWrite?.call();
      await transaction.insert('library_entity_merges', {
        'id': merge.id,
        'entity_type': merge.entityType.name,
        'source_id': merge.sourceId,
        'target_id': merge.targetId,
        'source_label': merge.sourceLabel,
        'target_label': merge.targetLabel,
        'merged_at_millis': merge.mergedAtMillis,
        'evidence_json': jsonEncode(merge.evidence),
        'undo_snapshot_json': jsonEncode({'before': before, 'after': after}),
        'undone_at_millis': null,
      });
    });
  }

  @override
  Future<void> undo(String mergeId, int undoneAtMillis) async {
    await database.transaction((transaction) async {
      final rows = await transaction.query(
        'library_entity_merges',
        where: 'id = ?',
        whereArgs: [mergeId],
        limit: 1,
      );
      if (rows.isEmpty) {
        throw const LibraryMergeUndoException('병합 기록을 찾지 못했습니다.');
      }
      final merge = _fromRow(rows.single);
      if (!merge.isActive) {
        throw const LibraryMergeUndoException('이미 되돌린 병합입니다.');
      }
      if (merge.undoSnapshot.isEmpty) {
        throw const LibraryMergeUndoException(
          '이전 버전의 병합 기록은 안전한 복원 정보가 없어 되돌릴 수 없습니다.',
        );
      }
      final allMerges = [
        for (final row in await transaction.query('library_entity_merges'))
          _fromRow(row),
      ];
      _ensureNoLaterConflict(allMerges, merge);
      final current = await _captureAffected(transaction, merge);
      final expected = _snapshotSection(merge.undoSnapshot, 'after');
      if (_canonicalJson(current) != _canonicalJson(expected)) {
        throw const LibraryMergeUndoException(
          '병합 이후 관련 데이터가 변경되어 자동으로 되돌릴 수 없습니다.',
        );
      }
      await beforeUndoWrite?.call();
      await _restoreAffected(
        transaction,
        merge,
        _snapshotSection(merge.undoSnapshot, 'before'),
      );
      await transaction.update(
        'library_entity_merges',
        {'undone_at_millis': undoneAtMillis},
        where: 'id = ?',
        whereArgs: [merge.id],
      );
    });
  }

  Future<Map<String, Object?>> _captureAffected(
    sqflite.DatabaseExecutor executor,
    LibraryEntityMerge merge,
  ) async {
    final column = merge.entityType == LibraryEntityType.work
        ? 'work_id'
        : 'recording_id';
    final tables = <String, String>{
      'playback_history': column,
      'imslp_imports': column,
      if (merge.entityType == LibraryEntityType.work)
        'imslp_work_links': 'work_id',
      if (merge.entityType == LibraryEntityType.work)
        'imslp_resources': 'work_id',
    };
    final result = <String, Object?>{};
    for (final entry in tables.entries) {
      final primaryKey = entry.key == 'playback_history'
          ? 'session_id'
          : entry.key == 'imslp_work_links'
          ? 'work_id'
          : 'id';
      result[entry.key] = await executor.query(
        entry.key,
        where: '${entry.value} IN (?, ?)',
        whereArgs: [merge.sourceId, merge.targetId],
        orderBy: primaryKey,
      );
    }
    return result;
  }

  Future<void> _restoreAffected(
    sqflite.Transaction transaction,
    LibraryEntityMerge merge,
    Map<String, Object?> before,
  ) async {
    final column = merge.entityType == LibraryEntityType.work
        ? 'work_id'
        : 'recording_id';
    const deleteOrder = [
      'imslp_resources',
      'imslp_work_links',
      'imslp_imports',
      'playback_history',
    ];
    const insertOrder = [
      'imslp_work_links',
      'imslp_resources',
      'imslp_imports',
      'playback_history',
    ];
    await transaction.execute('PRAGMA defer_foreign_keys = ON');
    for (final table in deleteOrder) {
      if (!before.containsKey(table)) continue;
      final selector = table == 'imslp_work_links' || table == 'imslp_resources'
          ? 'work_id'
          : column;
      await transaction.delete(
        table,
        where: '$selector IN (?, ?)',
        whereArgs: [merge.sourceId, merge.targetId],
      );
    }
    for (final table in insertOrder) {
      for (final row in _snapshotRows(before, table)) {
        await transaction.insert(
          table,
          row,
          conflictAlgorithm: sqflite.ConflictAlgorithm.replace,
        );
      }
    }
  }

  Future<void> _mergeWorkReferences(
    sqflite.Transaction transaction,
    LibraryEntityMerge merge,
  ) async {
    await transaction.update(
      'playback_history',
      {'work_id': merge.targetId, 'work_title': merge.targetLabel},
      where: 'work_id = ?',
      whereArgs: [merge.sourceId],
    );
    await transaction.update(
      'imslp_imports',
      {'work_id': merge.targetId},
      where: 'work_id = ?',
      whereArgs: [merge.sourceId],
    );
    final sourceLinks = await transaction.query(
      'imslp_work_links',
      where: 'work_id = ?',
      whereArgs: [merge.sourceId],
      limit: 1,
    );
    if (sourceLinks.isEmpty) return;
    await transaction.execute('PRAGMA defer_foreign_keys = ON');
    final targetLinks = await transaction.query(
      'imslp_work_links',
      where: 'work_id = ?',
      whereArgs: [merge.targetId],
      limit: 1,
    );
    if (targetLinks.isEmpty) {
      final replacement = Map<String, Object?>.from(sourceLinks.single)
        ..['work_id'] = merge.targetId
        ..['work_title'] = merge.targetLabel;
      await transaction.update(
        'imslp_resources',
        {'work_id': merge.targetId},
        where: 'work_id = ?',
        whereArgs: [merge.sourceId],
      );
      await transaction.delete(
        'imslp_work_links',
        where: 'work_id = ?',
        whereArgs: [merge.sourceId],
      );
      await transaction.insert('imslp_work_links', replacement);
    } else {
      await transaction.update(
        'imslp_resources',
        {'work_id': merge.targetId},
        where: 'work_id = ?',
        whereArgs: [merge.sourceId],
      );
      await transaction.delete(
        'imslp_work_links',
        where: 'work_id = ?',
        whereArgs: [merge.sourceId],
      );
    }
  }

  LibraryEntityMerge _fromRow(Map<String, Object?> row) {
    return LibraryEntityMerge(
      id: row['id']! as String,
      entityType: LibraryEntityType.values.byName(
        row['entity_type']! as String,
      ),
      sourceId: row['source_id']! as String,
      targetId: row['target_id']! as String,
      sourceLabel: row['source_label']! as String,
      targetLabel: row['target_label']! as String,
      mergedAtMillis: row['merged_at_millis']! as int,
      evidence: (jsonDecode(row['evidence_json']! as String) as List<Object?>)
          .whereType<String>()
          .toList(),
      undoSnapshot: _decodeSnapshot(row['undo_snapshot_json'] as String?),
      undoneAtMillis: row['undone_at_millis'] as int?,
    );
  }
}

void _ensureNoLaterConflict(
  List<LibraryEntityMerge> merges,
  LibraryEntityMerge selected,
) {
  for (final merge in merges) {
    if (!merge.isActive ||
        merge.id == selected.id ||
        merge.entityType != selected.entityType ||
        merge.mergedAtMillis <= selected.mergedAtMillis) {
      continue;
    }
    final selectedIds = {selected.sourceId, selected.targetId};
    if (selectedIds.contains(merge.sourceId) ||
        selectedIds.contains(merge.targetId)) {
      throw const LibraryMergeUndoException(
        '뒤이은 병합이 연결되어 있어 먼저 최근 병합을 되돌려야 합니다.',
      );
    }
  }
}

Map<String, Object?> _decodeSnapshot(String? source) {
  if (source == null || source.isEmpty) return const {};
  final decoded = jsonDecode(source);
  return decoded is Map<String, Object?> ? decoded : const {};
}

Map<String, Object?> _snapshotSection(
  Map<String, Object?> snapshot,
  String key,
) {
  final value = snapshot[key];
  return value is Map<String, Object?> ? value : const {};
}

List<Map<String, Object?>> _snapshotRows(
  Map<String, Object?> snapshot,
  String table,
) {
  return (snapshot[table] as List<Object?>? ?? const [])
      .whereType<Map<String, Object?>>()
      .toList();
}

String _canonicalJson(Object? value) {
  Object? normalize(Object? item) {
    if (item is Map) {
      final keys = item.keys.map((key) => key.toString()).toList()..sort();
      return {for (final key in keys) key: normalize(item[key])};
    }
    if (item is List) return [for (final child in item) normalize(child)];
    return item;
  }

  return jsonEncode(normalize(value));
}
