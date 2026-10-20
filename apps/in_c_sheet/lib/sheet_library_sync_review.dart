import 'dart:convert';

import 'sheet_library_backup.dart';
import 'sheet_library_backup_diff.dart';

enum SheetLibrarySyncReviewStatus { ready, unsupportedVersion, invalid, error }

class SheetLibrarySyncSnapshotSummary {
  const SheetLibrarySyncSnapshotSummary({
    required this.label,
    required this.exportedAt,
    required this.version,
    required this.scoreCount,
    required this.setlistCount,
  });

  final String label;
  final DateTime exportedAt;
  final int version;
  final int scoreCount;
  final int setlistCount;
}

class SheetLibrarySyncReviewPreview {
  const SheetLibrarySyncReviewPreview({
    required this.status,
    this.report,
    this.snapshots = const <SheetLibrarySyncSnapshotSummary>[],
    this.warnings = const <String>[],
    this.failureReason,
  });

  factory SheetLibrarySyncReviewPreview.fromJson({
    required String baseJson,
    required String localJson,
    required String remoteJson,
  }) {
    try {
      final base = _decodeSnapshot('기준', baseJson);
      final local = _decodeSnapshot('로컬', localJson);
      final remote = _decodeSnapshot('원격', remoteJson);
      final warnings = <String>[];
      final normalizedBase = baseJson.trim();
      final normalizedLocal = localJson.trim();
      final normalizedRemote = remoteJson.trim();
      if (normalizedBase == normalizedLocal) {
        warnings.add('기준과 로컬에 같은 백업을 선택했습니다.');
      }
      if (normalizedBase == normalizedRemote) {
        warnings.add('기준과 원격에 같은 백업을 선택했습니다.');
      }
      if (normalizedLocal == normalizedRemote) {
        warnings.add('로컬과 원격에 같은 백업을 선택했습니다.');
      }
      if (local.backup.exportedAt.isBefore(base.backup.exportedAt)) {
        warnings.add('로컬 백업의 내보낸 시각이 기준보다 이릅니다. 선택 순서를 확인하세요.');
      }
      if (remote.backup.exportedAt.isBefore(base.backup.exportedAt)) {
        warnings.add('원격 백업의 내보낸 시각이 기준보다 이릅니다. 오래된 상태가 다시 나타난 것인지 확인하세요.');
      }

      final identitySets = <Set<String>>[
        _snapshotIdentitySet(base.backup),
        _snapshotIdentitySet(local.backup),
        _snapshotIdentitySet(remote.backup),
      ];
      final hasRecords = identitySets.every((ids) => ids.isNotEmpty);
      final hasAnyOverlap =
          _hasOverlap(identitySets[0], identitySets[1]) ||
          _hasOverlap(identitySets[0], identitySets[2]) ||
          _hasOverlap(identitySets[1], identitySets[2]);
      if (hasRecords && !hasAnyOverlap) {
        warnings.add(
          '세 백업 사이에서 공통 악보/세트리스트 식별자를 찾지 못했습니다. '
          '같은 라이브러리에서 만든 백업인지 확인하세요.',
        );
      }
      warnings.add(
        '백업 형식 v${SheetLibraryBackup.currentVersion}에는 안정적인 라이브러리 '
        '식별자가 없어 항목 범위와 내보낸 시각으로 교차 확인해야 합니다.',
      );

      final dryRun = SheetLibrarySyncDryRun.compare(
        base: base.backup,
        local: local.backup,
        remote: remote.backup,
      );
      return SheetLibrarySyncReviewPreview(
        status: SheetLibrarySyncReviewStatus.ready,
        report: SheetLibrarySyncDryRunReport.fromDryRun(dryRun),
        snapshots: <SheetLibrarySyncSnapshotSummary>[
          base.summary,
          local.summary,
          remote.summary,
        ],
        warnings: List<String>.unmodifiable(warnings),
      );
    } on UnsupportedError catch (error) {
      return SheetLibrarySyncReviewPreview(
        status: SheetLibrarySyncReviewStatus.unsupportedVersion,
        failureReason: error.message?.toString() ?? error.toString(),
      );
    } on FormatException catch (error) {
      return SheetLibrarySyncReviewPreview(
        status: SheetLibrarySyncReviewStatus.invalid,
        failureReason: error.message,
      );
    } catch (error) {
      return SheetLibrarySyncReviewPreview(
        status: SheetLibrarySyncReviewStatus.error,
        failureReason: error.toString(),
      );
    }
  }

  final SheetLibrarySyncReviewStatus status;
  final SheetLibrarySyncDryRunReport? report;
  final List<SheetLibrarySyncSnapshotSummary> snapshots;
  final List<String> warnings;
  final String? failureReason;

  bool get canReview =>
      status == SheetLibrarySyncReviewStatus.ready && report != null;
}

class _DecodedSyncSnapshot {
  const _DecodedSyncSnapshot({required this.backup, required this.summary});

  final SheetLibraryBackup backup;
  final SheetLibrarySyncSnapshotSummary summary;
}

_DecodedSyncSnapshot _decodeSnapshot(String label, String value) {
  try {
    final decoded = jsonDecode(value);
    if (decoded is! Map) {
      throw const FormatException('JSON 최상위 값이 객체가 아닙니다.');
    }
    final json = decoded.cast<String, Object?>();
    final scope = json['scope'];
    if (scope != null && scope != 'metadata-only') {
      throw FormatException('지원하지 않는 백업 범위입니다: $scope');
    }
    final backup = SheetLibraryBackup.fromJson(json);
    return _DecodedSyncSnapshot(
      backup: backup,
      summary: SheetLibrarySyncSnapshotSummary(
        label: label,
        exportedAt: backup.exportedAt,
        version: backup.version,
        scoreCount: backup.scores.length,
        setlistCount: backup.setlists.length,
      ),
    );
  } on UnsupportedError catch (error) {
    throw UnsupportedError('$label 백업: ${error.message}');
  } on FormatException catch (error) {
    throw FormatException('$label 백업: ${error.message}');
  }
}

Set<String> _snapshotIdentitySet(SheetLibraryBackup backup) => <String>{
  for (final score in backup.scores) 'score:${score.id}',
  for (final setlist in backup.setlists) 'setlist:${setlist.id}',
};

bool _hasOverlap(Set<String> left, Set<String> right) =>
    left.any(right.contains);
