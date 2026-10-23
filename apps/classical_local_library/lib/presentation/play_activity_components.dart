import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';

import '../library_discovery.dart';
import '../playback_history.dart';
import '../scan_locations.dart';

class PlayScanLocationRow extends StatelessWidget {
  const PlayScanLocationRow({
    super.key,
    required this.location,
    required this.busy,
    required this.onRescan,
    required this.onToggleActive,
  });

  final ScanLocation location;
  final bool busy;
  final VoidCallback onRescan;
  final VoidCallback onToggleActive;

  @override
  Widget build(BuildContext context) {
    final lastScan = location.lastScannedAtMillis == null
        ? '마지막 스캔 없음'
        : '마지막 스캔 ${formatPlayDateTime(DateTime.fromMillisecondsSinceEpoch(location.lastScannedAtMillis!))}';
    return DdiroriItem(
      key: ValueKey('scan-location-${location.id}'),
      title: location.displayName,
      subtitle: '$lastScan · 파일 ${location.lastScanFileCount}개',
      leading: Icon(
        location.isActive ? Icons.folder_outlined : Icons.folder_off_outlined,
      ),
      trailing: DdiroriStatusBadge(
        label: location.isActive ? '활성' : '비활성',
        tone: location.isActive
            ? DdiroriStatusTone.success
            : DdiroriStatusTone.neutral,
      ),
      actions: [
        DdiroriIconButton(
          label: '다시 스캔',
          icon: Icons.refresh_outlined,
          onPressed: busy || !location.isActive ? null : onRescan,
        ),
        DdiroriIconButton(
          label: location.isActive ? '비활성화' : '활성화',
          icon: location.isActive
              ? Icons.block_outlined
              : Icons.check_circle_outline,
          onPressed: busy ? null : onToggleActive,
        ),
      ],
      enabled: !busy,
    );
  }
}

class PlayDiscoveryResultRow extends StatelessWidget {
  const PlayDiscoveryResultRow({
    super.key,
    required this.result,
    required this.onOpen,
    required this.onPlay,
  });

  final DiscoveryResult result;
  final VoidCallback onOpen;
  final VoidCallback onPlay;

  @override
  Widget build(BuildContext context) => DdiroriItem(
    key: ValueKey('discovery-${result.type.name}-${result.id}'),
    leading: Icon(
      result.type == DiscoveryResultType.work
          ? Icons.account_tree_outlined
          : Icons.album_outlined,
    ),
    title: result.title,
    subtitle: result.reason,
    trailing: DdiroriStatusBadge(
      label: result.type == DiscoveryResultType.work ? '작품' : '녹음',
      tone: DdiroriStatusTone.info,
    ),
    actions: [
      DdiroriIconButton(
        label: '${result.title} 재생',
        icon: Icons.play_arrow_outlined,
        onPressed: onPlay,
      ),
    ],
    onTap: onOpen,
  );
}

class PlayListeningHistoryRow extends StatelessWidget {
  const PlayListeningHistoryRow({
    super.key,
    required this.entry,
    required this.busy,
    required this.canContinue,
    required this.onContinue,
    required this.onDelete,
    this.unavailableReason,
  });

  final PlaybackHistoryEntry entry;
  final bool busy;
  final bool canContinue;
  final String? unavailableReason;
  final VoidCallback onContinue;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final actionLabel = entry.isCompleted ? '처음부터 다시 듣기' : '이어 듣기';
    final duration = entry.duration == null
        ? '--:--'
        : formatDdiroriDuration(entry.duration!);
    return DdiroriItem(
      key: ValueKey('history-${entry.sessionId}'),
      leading: const Icon(Icons.history_toggle_off_outlined),
      title: entry.trackTitle,
      subtitle:
          '${entry.workTitle} · ${entry.recordingTitle}\n'
          '${formatDdiroriDuration(entry.lastPosition)} / $duration · '
          '${formatPlayDateTime(entry.lastPlayedAt)}'
          '${unavailableReason == null ? '' : '\n$unavailableReason'}',
      trailing: DdiroriStatusBadge(
        label: entry.status.label,
        tone: switch (entry.status) {
          PlaybackHistoryStatus.completed => DdiroriStatusTone.success,
          PlaybackHistoryStatus.partial => DdiroriStatusTone.info,
          PlaybackHistoryStatus.error => DdiroriStatusTone.error,
        },
      ),
      actions: [
        DdiroriIconButton(
          label: unavailableReason ?? actionLabel,
          icon: entry.isCompleted
              ? Icons.replay_outlined
              : Icons.play_arrow_outlined,
          onPressed: busy || !canContinue ? null : onContinue,
        ),
        DdiroriIconButton(
          label: '감상 기록 삭제',
          icon: Icons.delete_outline,
          onPressed: busy ? null : onDelete,
        ),
      ],
      enabled: !busy,
    );
  }
}

class PlayListeningStatisticRow extends StatelessWidget {
  const PlayListeningStatisticRow({
    super.key,
    required this.group,
    required this.icon,
  });

  final PlaybackHistoryGroupStatistics group;
  final IconData icon;

  @override
  Widget build(BuildContext context) => DdiroriItem(
    key: ValueKey('listening-statistic-${group.id}'),
    leading: Icon(icon),
    title: group.title,
    subtitle:
        '감상 ${formatDdiroriDuration(group.listenedDuration)} · '
        '${group.sessionCount}회 · 완료 ${group.completedSessionCount}회',
  );
}

String formatPlayDateTime(DateTime dateTime) {
  String twoDigits(int value) => value.toString().padLeft(2, '0');
  return '${dateTime.year}.${twoDigits(dateTime.month)}.'
      '${twoDigits(dateTime.day)} ${twoDigits(dateTime.hour)}:'
      '${twoDigits(dateTime.minute)}';
}
