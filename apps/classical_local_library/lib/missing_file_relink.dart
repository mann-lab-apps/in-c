import 'dart:convert';

import 'package:sqflite/sqflite.dart' as sqflite;

import 'audio_tags.dart';
import 'classical_library_models.dart';
import 'metadata_candidates.dart';
import 'sqlite_database.dart';

enum MissingFileRelinkConfidence {
  exact(label: '매우 높은 일치'),
  likely(label: '높은 일치'),
  uncertain(label: '확인 필요'),
  rejected(label: '재연결 불가');

  const MissingFileRelinkConfidence({required this.label});

  final String label;
}

class MissingFileRelinkAssessment {
  const MissingFileRelinkAssessment({
    required this.confidence,
    required this.score,
    required this.reasons,
  });

  final MissingFileRelinkConfidence confidence;
  final int score;
  final List<String> reasons;

  bool get canRelink => confidence != MissingFileRelinkConfidence.rejected;
}

class MissingFileRelinkPolicy {
  const MissingFileRelinkPolicy();

  static const supportedFormats = {
    'FLAC',
    'MP3',
    'M4A',
    'ALAC',
    'OGG',
    'OPUS',
    'WAV',
  };

  MissingFileRelinkAssessment assess({
    required LocalAudioFile missing,
    required LocalAudioFile replacement,
  }) {
    if (missing.id == replacement.id) {
      return const MissingFileRelinkAssessment(
        confidence: MissingFileRelinkConfidence.rejected,
        score: 0,
        reasons: ['같은 파일은 대체 파일로 사용할 수 없습니다.'],
      );
    }
    if (missing.availability != AudioFileAvailability.missing) {
      return const MissingFileRelinkAssessment(
        confidence: MissingFileRelinkConfidence.rejected,
        score: 0,
        reasons: ['누락 상태인 파일만 재연결할 수 있습니다.'],
      );
    }
    if (replacement.availability != AudioFileAvailability.present) {
      return const MissingFileRelinkAssessment(
        confidence: MissingFileRelinkConfidence.rejected,
        score: 0,
        reasons: ['선택한 파일을 현재 사용할 수 없습니다.'],
      );
    }
    if (!supportedFormats.contains(replacement.format.toUpperCase())) {
      return const MissingFileRelinkAssessment(
        confidence: MissingFileRelinkConfidence.rejected,
        score: 0,
        reasons: ['지원하지 않는 오디오 형식입니다.'],
      );
    }

    var score = 0;
    final reasons = <String>[];
    final oldFingerprint = missing.lightweightFingerprint;
    final newFingerprint = replacement.lightweightFingerprint;
    if (oldFingerprint != null && newFingerprint != null) {
      if (oldFingerprint == newFingerprint) {
        score += 70;
        reasons.add('파일 지문이 같습니다.');
      } else {
        reasons.add('파일 지문이 다릅니다.');
      }
    }
    if (missing.sizeBytes != null && replacement.sizeBytes != null) {
      if (missing.sizeBytes == replacement.sizeBytes) {
        score += 20;
        reasons.add('파일 크기가 같습니다.');
      } else {
        reasons.add('파일 크기가 다릅니다.');
      }
    }
    if (missing.format.toUpperCase() == replacement.format.toUpperCase()) {
      score += 5;
      reasons.add('오디오 형식이 같습니다.');
    }
    final matchingTags = _matchingSafeTags(
      missing.tagMetadata,
      replacement.tagMetadata,
    );
    if (matchingTags > 0) {
      score += matchingTags * 5;
      reasons.add('안전한 태그 $matchingTags개가 같습니다.');
    }
    if (reasons.isEmpty) reasons.add('비교할 수 있는 파일 정보가 부족합니다.');

    return MissingFileRelinkAssessment(
      confidence: score >= 70
          ? MissingFileRelinkConfidence.exact
          : score >= 25
          ? MissingFileRelinkConfidence.likely
          : MissingFileRelinkConfidence.uncertain,
      score: score.clamp(0, 100).toInt(),
      reasons: List.unmodifiable(reasons),
    );
  }

  int _matchingSafeTags(AudioTagMetadata? oldTags, AudioTagMetadata? newTags) {
    if (oldTags == null || newTags == null) return 0;
    final oldValues = [
      oldTags.title,
      oldTags.album,
      oldTags.artist,
      oldTags.composer,
      oldTags.work,
      oldTags.movementTitle,
    ];
    final newValues = [
      newTags.title,
      newTags.album,
      newTags.artist,
      newTags.composer,
      newTags.work,
      newTags.movementTitle,
    ];
    var count = 0;
    for (var index = 0; index < oldValues.length; index += 1) {
      final oldValue = _normalize(oldValues[index]);
      final newValue = _normalize(newValues[index]);
      if (oldValue.isNotEmpty && oldValue == newValue) count += 1;
    }
    return count;
  }

  String _normalize(String? value) =>
      (value ?? '').trim().toLowerCase().replaceAll(RegExp(r'\s+'), ' ');
}

class MissingFileRelinkException implements Exception {
  const MissingFileRelinkException(this.userMessage);

  final String userMessage;
}

class MissingFileRelinkResult {
  const MissingFileRelinkResult({
    required this.files,
    required this.candidates,
    required this.assessment,
  });

  final List<LocalAudioFile> files;
  final List<MetadataCandidate> candidates;
  final MissingFileRelinkAssessment assessment;
}

abstract interface class MissingFileRelinkRepository {
  Future<MissingFileRelinkResult> reconnect({
    required LocalAudioFile missing,
    required LocalAudioFile replacement,
  });
}

class SqliteMissingFileRelinkRepository implements MissingFileRelinkRepository {
  const SqliteMissingFileRelinkRepository({
    required this.database,
    this.policy = const MissingFileRelinkPolicy(),
    this.beforeCommit,
  });

  final sqflite.Database database;
  final MissingFileRelinkPolicy policy;
  final Future<void> Function()? beforeCommit;

  @override
  Future<MissingFileRelinkResult> reconnect({
    required LocalAudioFile missing,
    required LocalAudioFile replacement,
  }) async {
    final assessment = policy.assess(
      missing: missing,
      replacement: replacement,
    );
    if (!assessment.canRelink) {
      throw MissingFileRelinkException(assessment.reasons.first);
    }

    await database.transaction((transaction) async {
      final missingRows = await transaction.query(
        'scanned_audio_files',
        where: 'id = ?',
        whereArgs: [missing.id],
        limit: 1,
      );
      final replacementRows = await transaction.query(
        'scanned_audio_files',
        where: 'id = ?',
        whereArgs: [replacement.id],
        limit: 1,
      );
      if (missingRows.isEmpty || replacementRows.isEmpty) {
        throw const MissingFileRelinkException('재연결할 파일 정보를 찾지 못했습니다.');
      }
      if (missingRows.single['availability'] != 'missing') {
        throw const MissingFileRelinkException('누락 상태인 파일만 재연결할 수 있습니다.');
      }
      if (replacementRows.single['availability'] != 'present') {
        throw const MissingFileRelinkException('선택한 파일을 현재 사용할 수 없습니다.');
      }

      final duplicateLinks = await transaction.rawQuery(
        '''SELECT file_id FROM audio_file_track_links WHERE file_id = ?
UNION ALL
SELECT file_id FROM catalog_tracks WHERE file_id = ? LIMIT 1''',
        [replacement.id, replacement.id],
      );
      if (duplicateLinks.isNotEmpty) {
        throw const MissingFileRelinkException('선택한 파일은 이미 다른 악장에 연결되어 있습니다.');
      }

      final missingRow = Map<String, Object?>.from(missingRows.single);
      final replacementRow = Map<String, Object?>.from(replacementRows.single);
      final oldPath = missingRow['path']! as String;
      final newPath = replacementRow['path']! as String;
      final retainedSources = _mergeSourceReferences(
        missingRow['source_references_json'] as String?,
        replacementRow['source_references_json'] as String?,
      );

      await transaction.delete(
        'scanned_audio_files',
        where: 'id = ?',
        whereArgs: [replacement.id],
      );
      replacementRow
        ..remove('id')
        ..['import_status'] = missingRow['import_status']
        ..['availability'] = 'present'
        ..['consecutive_miss_count'] = 0
        ..['source_references_json'] = retainedSources;
      await transaction.update(
        'scanned_audio_files',
        replacementRow,
        where: 'id = ?',
        whereArgs: [missing.id],
      );

      await _moveCandidate(
        transaction,
        missingId: missing.id,
        replacementId: replacement.id,
        newPath: newPath,
        newFileName: replacementRow['file_name'] as String? ?? '선택한 음원',
      );
      await _movePlaybackPosition(
        transaction,
        oldPath: oldPath,
        newPath: newPath,
        modifiedAtMillis: replacementRow['modified_at_millis'] as int?,
      );
      await transaction.update(
        'playback_history',
        {'path': newPath},
        where: 'path = ?',
        whereArgs: [oldPath],
      );
      await transaction.update(
        'local_audio_imports',
        {'file_id': missing.id},
        where: 'file_id = ?',
        whereArgs: [replacement.id],
      );
      await transaction.update(
        'imslp_imports',
        {'file_id': missing.id},
        where: 'file_id = ?',
        whereArgs: [replacement.id],
      );
      await transaction.delete(
        'metadata_overrides',
        where: 'file_id = ?',
        whereArgs: [replacement.id],
      );
      await beforeCommit?.call();
    });

    return MissingFileRelinkResult(
      files: await SqliteScannedAudioStore(database).load(),
      candidates: await SqliteMetadataCandidateStore(database).load(),
      assessment: assessment,
    );
  }

  Future<void> _moveCandidate(
    sqflite.DatabaseExecutor transaction, {
    required String missingId,
    required String replacementId,
    required String newPath,
    required String newFileName,
  }) async {
    final retained = await transaction.query(
      'metadata_candidates',
      where: 'file_id = ?',
      whereArgs: [missingId],
      limit: 1,
    );
    final replacement = await transaction.query(
      'metadata_candidates',
      where: 'file_id = ?',
      whereArgs: [replacementId],
      limit: 1,
    );
    final selected = retained.isNotEmpty
        ? retained.single
        : replacement.isNotEmpty
        ? replacement.single
        : null;
    await transaction.delete(
      'metadata_candidates',
      where: 'file_id IN (?, ?)',
      whereArgs: [missingId, replacementId],
    );
    if (selected == null) return;
    final row = Map<String, Object?>.from(selected)
      ..['file_id'] = missingId
      ..['file_path'] = newPath
      ..['file_name'] = newFileName;
    await transaction.insert('metadata_candidates', row);
  }

  Future<void> _movePlaybackPosition(
    sqflite.DatabaseExecutor transaction, {
    required String oldPath,
    required String newPath,
    required int? modifiedAtMillis,
  }) async {
    final rows = await transaction.query(
      'playback_positions',
      where: 'path IN (?, ?)',
      whereArgs: [oldPath, newPath],
    );
    if (rows.isEmpty) return;
    rows.sort(
      (first, second) => (second['updated_at_millis']! as int).compareTo(
        first['updated_at_millis']! as int,
      ),
    );
    final row = Map<String, Object?>.from(rows.first)
      ..['path'] = newPath
      ..['file_modified_at_millis'] = modifiedAtMillis;
    await transaction.delete(
      'playback_positions',
      where: 'path IN (?, ?)',
      whereArgs: [oldPath, newPath],
    );
    await transaction.insert('playback_positions', row);
  }

  String _mergeSourceReferences(String? firstJson, String? secondJson) {
    final merged = <String, Map<String, Object?>>{};
    for (final source in [firstJson, secondJson]) {
      final decoded = jsonDecode(source ?? '[]') as List<Object?>;
      for (final item in decoded.cast<Map<String, Object?>>()) {
        final key = '${item['kind']}|${item['externalId']}';
        merged[key] = item;
      }
    }
    return jsonEncode(merged.values.toList());
  }
}
