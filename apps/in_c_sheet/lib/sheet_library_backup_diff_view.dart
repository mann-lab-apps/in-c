import 'package:flutter/material.dart';

import 'sheet_library_backup_diff.dart';

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
