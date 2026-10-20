import 'package:flutter/material.dart';

import 'sheet_library_backup_diff.dart';
import 'sheet_library_sync_review.dart';

class SheetLibraryBackupDetailsView extends StatelessWidget {
  const SheetLibraryBackupDetailsView({
    required this.details,
    this.maxVisibleItems = 20,
    super.key,
  });

  final List<SheetLibraryBackupDiffDetail> details;
  final int maxVisibleItems;

  @override
  Widget build(BuildContext context) {
    if (details.isEmpty) return const SizedBox.shrink();

    final visibleDetails = details
        .take(maxVisibleItems)
        .toList(growable: false);
    final duplicateKeys = <String, int>{};
    for (final detail in details) {
      final key = '${detail.kind.name}:${detail.title}';
      duplicateKeys[key] = (duplicateKeys[key] ?? 0) + 1;
    }
    final hiddenCount = details.length - visibleDetails.length;

    return Theme(
      data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
      child: ExpansionTile(
        key: const Key('backup-diff-details'),
        tilePadding: EdgeInsets.zero,
        childrenPadding: const EdgeInsets.only(bottom: 4),
        title: Text(
          '변경 항목 자세히 보기 (${details.length})',
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        children: [
          for (final detail in visibleDetails)
            _BackupDiffDetailRow(
              detail: detail,
              showIdentifier:
                  duplicateKeys['${detail.kind.name}:${detail.title}']! > 1,
            ),
          if (hiddenCount > 0)
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 8, 4),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  '나머지 $hiddenCount개 항목은 백업 요약에 포함되어 있습니다.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class SheetLibrarySyncReviewView extends StatelessWidget {
  const SheetLibrarySyncReviewView({
    required this.preview,
    this.maxVisibleItemsPerGroup = 10,
    super.key,
  });

  final SheetLibrarySyncReviewPreview preview;
  final int maxVisibleItemsPerGroup;

  @override
  Widget build(BuildContext context) {
    final report = preview.report;
    if (!preview.canReview || report == null) {
      return Text(preview.failureReason ?? '백업 비교 결과를 만들지 못했습니다.');
    }
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('세 백업을 읽기만 하며 현재 라이브러리에는 아무 변경도 적용하지 않습니다.'),
        const SizedBox(height: 12),
        for (final snapshot in preview.snapshots)
          _SyncSnapshotRow(snapshot: snapshot),
        if (preview.warnings.isNotEmpty) ...[
          const SizedBox(height: 12),
          Text(
            '선택 확인',
            style: TextStyle(
              fontWeight: FontWeight.w800,
              color: Theme.of(context).colorScheme.error,
            ),
          ),
          const SizedBox(height: 4),
          for (final warning in preview.warnings) Text('• $warning'),
        ],
        const SizedBox(height: 12),
        Text(
          report.headline,
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 6),
        for (final line in report.summaryLines) Text('• $line'),
        if (report.reviewLines.isNotEmpty) ...[
          const SizedBox(height: 8),
          const Text('수동 검토', style: TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          for (final line in report.reviewLines) Text('• $line'),
        ],
        const SizedBox(height: 8),
        for (final status in SheetLibrarySyncDryRunStatus.values)
          if (report.items.any((item) => item.status == status))
            _SyncReviewGroup(
              status: status,
              items: report.items
                  .where((item) => item.status == status)
                  .toList(growable: false),
              maxVisibleItems: maxVisibleItemsPerGroup,
            ),
      ],
    );
  }
}

class _SyncSnapshotRow extends StatelessWidget {
  const _SyncSnapshotRow({required this.snapshot});

  final SheetLibrarySyncSnapshotSummary snapshot;

  @override
  Widget build(BuildContext context) {
    final exportedAt = snapshot.exportedAt.toLocal();
    final date =
        '${exportedAt.year}-${exportedAt.month.toString().padLeft(2, '0')}-'
        '${exportedAt.day.toString().padLeft(2, '0')} '
        '${exportedAt.hour.toString().padLeft(2, '0')}:'
        '${exportedAt.minute.toString().padLeft(2, '0')}';
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 44,
            child: Text(
              snapshot.label,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
          ),
          Expanded(
            child: Text(
              '$date · 악보 ${snapshot.scoreCount}개 · '
              '세트리스트 ${snapshot.setlistCount}개 · v${snapshot.version}',
            ),
          ),
        ],
      ),
    );
  }
}

class _SyncReviewGroup extends StatelessWidget {
  const _SyncReviewGroup({
    required this.status,
    required this.items,
    required this.maxVisibleItems,
  });

  final SheetLibrarySyncDryRunStatus status;
  final List<SheetLibrarySyncDryRunItem> items;
  final int maxVisibleItems;

  @override
  Widget build(BuildContext context) {
    final visibleItems = items.take(maxVisibleItems).toList(growable: false);
    final hiddenCount = items.length - visibleItems.length;
    final duplicateTitles = <String, int>{};
    for (final item in items) {
      final key = '${item.kind.name}:${item.title}';
      duplicateTitles[key] = (duplicateTitles[key] ?? 0) + 1;
    }
    return Theme(
      data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
      child: ExpansionTile(
        key: Key('sync-review-${status.name}'),
        tilePadding: EdgeInsets.zero,
        childrenPadding: const EdgeInsets.only(bottom: 4),
        leading: Icon(_syncStatusIcon(status), size: 20),
        title: Text(
          '${_syncStatusViewLabel(status)} (${items.length})',
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        children: [
          for (final item in visibleItems)
            _SyncReviewItemRow(
              item: item,
              showIdentifier:
                  duplicateTitles['${item.kind.name}:${item.title}']! > 1,
            ),
          if (hiddenCount > 0)
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 8, 4),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  '나머지 $hiddenCount개 항목은 복사한 검토 보고서에 포함됩니다.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _SyncReviewItemRow extends StatelessWidget {
  const _SyncReviewItemRow({required this.item, required this.showIdentifier});

  final SheetLibrarySyncDryRunItem item;
  final bool showIdentifier;

  @override
  Widget build(BuildContext context) {
    final details = <String>[
      if (item.localChange != null)
        '로컬 ${_syncChangeViewLabel(item.localChange!)}',
      if (item.remoteChange != null)
        '원격 ${_syncChangeViewLabel(item.remoteChange!)}',
      if (showIdentifier) '식별자 ${_shortIdentifier(item.id)}',
      if (item.conflictingFieldLabels.isNotEmpty)
        '충돌: ${item.conflictingFieldLabels.join(', ')}',
    ];
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            item.kind == SheetLibrarySyncDryRunItemKind.score
                ? Icons.description_outlined
                : item.kind == SheetLibrarySyncDryRunItemKind.setlist
                ? Icons.queue_music_outlined
                : Icons.settings_outlined,
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.title,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                if (details.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    details.join(' · '),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

String _syncStatusViewLabel(SheetLibrarySyncDryRunStatus status) =>
    switch (status) {
      SheetLibrarySyncDryRunStatus.localOnly => '로컬에서만 변경',
      SheetLibrarySyncDryRunStatus.remoteOnly => '원격에서만 변경',
      SheetLibrarySyncDryRunStatus.sameChange => '양쪽 동일 변경',
      SheetLibrarySyncDryRunStatus.mergeable => '병합 후보',
      SheetLibrarySyncDryRunStatus.conflict => '수동 충돌',
    };

IconData _syncStatusIcon(SheetLibrarySyncDryRunStatus status) =>
    switch (status) {
      SheetLibrarySyncDryRunStatus.localOnly => Icons.phone_android_outlined,
      SheetLibrarySyncDryRunStatus.remoteOnly => Icons.cloud_outlined,
      SheetLibrarySyncDryRunStatus.sameChange => Icons.done_all_outlined,
      SheetLibrarySyncDryRunStatus.mergeable => Icons.call_merge_outlined,
      SheetLibrarySyncDryRunStatus.conflict => Icons.warning_amber_outlined,
    };

String _syncChangeViewLabel(SheetLibraryBackupDiffChange change) =>
    switch (change) {
      SheetLibraryBackupDiffChange.added => '추가',
      SheetLibraryBackupDiffChange.removed => '삭제',
      SheetLibraryBackupDiffChange.changed => '수정',
    };

class _BackupDiffDetailRow extends StatelessWidget {
  const _BackupDiffDetailRow({
    required this.detail,
    required this.showIdentifier,
  });

  final SheetLibraryBackupDiffDetail detail;
  final bool showIdentifier;

  @override
  Widget build(BuildContext context) {
    final reviewLabels = detail.reviewLabels;
    final contextParts = <String>[
      detail.changeLabel,
      if (detail.contextLabel.isNotEmpty) detail.contextLabel,
      if (showIdentifier) '식별자 ${_shortIdentifier(detail.id)}',
      if (reviewLabels.isNotEmpty) reviewLabels.join(', '),
    ];
    return Semantics(
      label: '${detail.kindLabel} ${detail.title}, ${contextParts.join(', ')}',
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              detail.kind == SheetLibraryBackupDiffItemKind.score
                  ? Icons.description_outlined
                  : Icons.queue_music_outlined,
              size: 20,
              semanticLabel: detail.kindLabel,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    detail.title,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    contextParts.join(' · '),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String _shortIdentifier(String value) {
  final trimmed = value.trim();
  if (trimmed.length <= 12) return trimmed;
  return trimmed.substring(trimmed.length - 8);
}
