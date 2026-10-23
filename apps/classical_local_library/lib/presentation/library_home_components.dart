part of '../main.dart';

class _EmptyCatalogPanel extends StatelessWidget {
  const _EmptyCatalogPanel({required this.hasFiles, required this.onRegister});

  final bool hasFiles;
  final VoidCallback? onRegister;

  @override
  Widget build(BuildContext context) {
    return _Section(
      title: '내 클래식 라이브러리',
      trailingWidget: const DdiroriStatusBadge(
        label: '작품 없음',
        tone: DdiroriStatusTone.warning,
      ),
      children: [
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: const DdiroriBach(size: 48),
          title: Text(hasFiles ? '가져온 음원을 작품으로 정리하세요.' : '로컬 음원부터 가져오세요.'),
          subtitle: Text(
            hasFiles
                ? '작곡가, 작품, 녹음과 악장 순서를 확인하면 재생 큐가 만들어집니다.'
                : '파일 가져오기 또는 폴더 추가 후 작품과 악장 정보를 확인할 수 있습니다.',
          ),
        ),
        if (onRegister != null)
          Align(
            alignment: Alignment.centerLeft,
            child: FilledButton.icon(
              onPressed: onRegister,
              icon: const Icon(Icons.playlist_add_check_outlined),
              label: const Text('정리 시작'),
            ),
          ),
      ],
    );
  }
}

class _LibrarySummary extends StatelessWidget {
  const _LibrarySummary({
    required this.library,
    required this.scannedCount,
    required this.needsReviewCount,
  });

  final ClassicalLibrary library;
  final int scannedCount;
  final int needsReviewCount;

  @override
  Widget build(BuildContext context) => DdiroriMetricGroup(
    label: '라이브러리 요약',
    metrics: [
      DdiroriMetricData(
        label: '작곡가',
        value: '${library.people.length}',
        icon: Icons.person_outline,
      ),
      DdiroriMetricData(
        label: '작품',
        value: '${library.works.length}',
        icon: Icons.library_music_outlined,
      ),
      DdiroriMetricData(
        label: '연주 녹음',
        value: '${library.recordings.length}',
        icon: Icons.album_outlined,
      ),
      DdiroriMetricData(
        label: '데모 파일',
        value: '${library.files.length}',
        icon: Icons.science_outlined,
      ),
      DdiroriMetricData(
        label: '스캔 파일',
        value: '$scannedCount',
        icon: Icons.audio_file_outlined,
      ),
      DdiroriMetricData(
        label: '정리 필요',
        value: '$needsReviewCount',
        icon: Icons.rule_folder_outlined,
      ),
    ],
  );
}

class _SearchPanel extends StatelessWidget {
  const _SearchPanel({
    required this.query,
    required this.results,
    required this.onQueryChanged,
    required this.onResultSelected,
  });

  final String query;
  final List<LibrarySearchResult> results;
  final ValueChanged<String> onQueryChanged;
  final ValueChanged<LibrarySearchResult> onResultSelected;

  @override
  Widget build(BuildContext context) {
    return _Section(
      title: '검색',
      trailingWidget: DdiroriStatusBadge(
        label: query.trim().isEmpty ? '대기' : '${results.length}개',
        tone: query.trim().isEmpty
            ? DdiroriStatusTone.neutral
            : DdiroriStatusTone.info,
      ),
      children: [
        DdiroriSearch(
          value: query,
          label: '작품, 작곡가와 파일 검색',
          onChanged: onQueryChanged,
        ),
        const SizedBox(height: 12),
        if (query.trim().isEmpty)
          const ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(Icons.manage_search_outlined),
            title: Text('검색어를 입력하세요.'),
          )
        else if (results.isEmpty)
          const ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(Icons.search_off_outlined),
            title: Text('검색 결과가 없습니다.'),
          )
        else
          for (final result in results.take(5))
            PlaySearchResultRow(
              result: result,
              onTap:
                  result.type == SearchResultType.person ||
                      result.type == SearchResultType.fileCandidate
                  ? null
                  : () => onResultSelected(result),
            ),
      ],
    );
  }
}

class _PlaybackModePanel extends StatelessWidget {
  const _PlaybackModePanel({
    required this.mode,
    required this.plan,
    required this.missingPolicy,
    required this.onModeChanged,
    required this.onMissingPolicyChanged,
  });

  final PlaybackMode mode;
  final PlaybackPlan plan;
  final ClassicalQueueMissingPolicy missingPolicy;
  final ValueChanged<PlaybackMode> onModeChanged;
  final ValueChanged<ClassicalQueueMissingPolicy> onMissingPolicyChanged;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('랜덤 재생', style: textTheme.titleLarge),
        const SizedBox(height: 10),
        DdiroriSegments<PlaybackMode>(
          options: {for (final item in PlaybackMode.values) item: item.label},
          icons: {
            for (final item in PlaybackMode.values) item: _modeIcon(item),
          },
          selected: {mode},
          onChanged: (selected) => onModeChanged(selected.first),
        ),
        const SizedBox(height: 12),
        Text(
          '${plan.work.title.ko} · ${plan.recording.title.ko}',
          style: textTheme.titleMedium,
        ),
        Text(
          plan.isFullWorkOrRecording
              ? '악장이 나뉜 음원은 순서대로 묶어 큐에 넣습니다.'
              : '짧게 듣기용으로 악장 또는 소품 하나만 큐에 넣습니다.',
          style: textTheme.bodyMedium,
        ),
        if (mode != PlaybackMode.singleTrackRandom) ...[
          const SizedBox(height: 8),
          DdiroriSegments<ClassicalQueueMissingPolicy>(
            options: const {
              ClassicalQueueMissingPolicy.playAvailable: '연결된 악장',
              ClassicalQueueMissingPolicy.completeOnly: '완전한 작품',
            },
            icons: const {
              ClassicalQueueMissingPolicy.playAvailable:
                  Icons.queue_music_outlined,
              ClassicalQueueMissingPolicy.completeOnly:
                  Icons.library_music_outlined,
            },
            selected: {missingPolicy},
            onChanged: (selected) => onMissingPolicyChanged(selected.first),
          ),
        ],
      ],
    );
  }

  IconData _modeIcon(PlaybackMode mode) {
    return switch (mode) {
      PlaybackMode.workRandom => Icons.account_tree_outlined,
      PlaybackMode.recordingRandom => Icons.album_outlined,
      PlaybackMode.singleTrackRandom => Icons.music_note_outlined,
    };
  }
}

class _ScanPanel extends StatelessWidget {
  const _ScanPanel({
    required this.files,
    required this.candidates,
    required this.links,
    required this.locations,
    required this.status,
    required this.isScanning,
    required this.isPickingFolder,
    required this.isImportingFiles,
    required this.isCatalogSaving,
    required this.supportsFolderScan,
    required this.showDemoActions,
    required this.onRetryStoragePressed,
    required this.onImportFilesPressed,
    required this.onAddFolderPressed,
    required this.onSampleScanPressed,
    required this.onRegisterFiles,
    required this.onRescanLocation,
    required this.onSetLocationActive,
  });

  final List<LocalAudioFile> files;
  final List<MetadataCandidate> candidates;
  final List<AudioFileTrackLink> links;
  final List<ScanLocation> locations;
  final String status;
  final bool isScanning;
  final bool isPickingFolder;
  final bool isImportingFiles;
  final bool isCatalogSaving;
  final bool supportsFolderScan;
  final bool showDemoActions;
  final Future<void> Function()? onRetryStoragePressed;
  final VoidCallback? onImportFilesPressed;
  final VoidCallback? onAddFolderPressed;
  final VoidCallback? onSampleScanPressed;
  final ValueChanged<List<LocalAudioFile>> onRegisterFiles;
  final ValueChanged<ScanLocation> onRescanLocation;
  final void Function(ScanLocation location, bool isActive) onSetLocationActive;

  @override
  Widget build(BuildContext context) {
    final needsReview = files
        .where((file) => file.importStatus == AudioImportStatus.needsReview)
        .toList();
    final linkedFiles = files
        .where((file) => file.importStatus == AudioImportStatus.linked)
        .toList();
    final candidatesByFileId = {
      for (final candidate in candidates) candidate.fileId: candidate,
    };
    final linksByFileId = {for (final link in links) link.fileId: link};

    return _Section(
      title: '스캔',
      trailingWidget: DdiroriStatusBadge(
        label: linkedFiles.isEmpty
            ? needsReview.isEmpty
                  ? '정리 필요 없음'
                  : '정리 필요 ${needsReview.length}'
            : '정리 필요 ${needsReview.length} · 연결 ${linkedFiles.length}',
        tone: needsReview.isEmpty
            ? DdiroriStatusTone.success
            : DdiroriStatusTone.warning,
      ),
      children: [
        if (onRetryStoragePressed != null) ...[
          const DdiroriBanner(
            message: '보관함을 준비하지 못했습니다. 저장 공간을 확인한 뒤 다시 시도해 주세요.',
            kind: DdiroriNoticeKind.error,
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerLeft,
            child: DdiroriButton(
              label: '보관함 다시 불러오기',
              icon: Icons.refresh_outlined,
              kind: DdiroriButtonKind.secondary,
              onPressed: onRetryStoragePressed,
            ),
          ),
          const SizedBox(height: 12),
        ],
        Wrap(
          spacing: 8,
          runSpacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            DdiroriButton(
              label: '파일 가져오기',
              icon: Icons.library_add_outlined,
              busy: isImportingFiles,
              onPressed: isScanning || isPickingFolder || isImportingFiles
                  ? null
                  : onImportFilesPressed,
            ),
            if (supportsFolderScan)
              DdiroriButton(
                label: '폴더 추가',
                icon: Icons.folder_open_outlined,
                kind: DdiroriButtonKind.secondary,
                busy: isPickingFolder,
                onPressed: isScanning || isPickingFolder || isImportingFiles
                    ? null
                    : onAddFolderPressed,
              ),
            if (showDemoActions)
              DdiroriButton(
                label: '데모 스캔',
                icon: Icons.science_outlined,
                kind: DdiroriButtonKind.secondary,
                busy: isScanning,
                onPressed: isScanning || isPickingFolder || isImportingFiles
                    ? null
                    : onSampleScanPressed,
              ),
            Text(status),
          ],
        ),
        const SizedBox(height: 12),
        if (locations.isEmpty)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(
              supportsFolderScan
                  ? Icons.create_new_folder_outlined
                  : Icons.audio_file_outlined,
            ),
            title: Text(
              supportsFolderScan ? '등록된 음악 폴더가 없습니다.' : '가져온 음원 파일이 없습니다.',
            ),
            subtitle: Text(
              supportsFolderScan
                  ? '폴더 추가 또는 파일 가져오기로 실제 로컬 음원을 등록할 수 있습니다.'
                  : '파일 가져오기로 원본을 보존하며 앱 관리 영역에 복사합니다.',
            ),
          )
        else
          for (final location in locations)
            PlayScanLocationRow(
              location: location,
              busy: isScanning || isPickingFolder || isImportingFiles,
              onRescan: () => onRescanLocation(location),
              onToggleActive: () =>
                  onSetLocationActive(location, !location.isActive),
            ),
        const Divider(height: 24),
        if (needsReview.isEmpty)
          const ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(Icons.fact_check_outlined),
            title: Text('정리 필요한 로컬 파일이 없습니다.'),
            subtitle: Text('파일 가져오기, 폴더 스캔 또는 데모 스캔 후 연결되지 않은 후보가 표시됩니다.'),
          )
        else if (needsReview.length > 1)
          Align(
            alignment: Alignment.centerLeft,
            child: FilledButton.tonalIcon(
              onPressed: isScanning || isImportingFiles || isCatalogSaving
                  ? null
                  : () => onRegisterFiles(needsReview),
              icon: const Icon(Icons.playlist_add_check_outlined),
              label: Text('파일 ${needsReview.length}개를 한 작품으로 정리'),
            ),
          ),
        if (needsReview.length > 1) const SizedBox(height: 8),
        if (needsReview.isNotEmpty)
          for (final file in needsReview.take(4))
            PlayAudioFileRow(
              file: file,
              details: _fileSubtitle(file, candidatesByFileId[file.id]),
              enabled: !isScanning && !isImportingFiles && !isCatalogSaving,
              actions: [
                DdiroriIconButton(
                  label: '작품과 녹음에 정리',
                  icon: Icons.playlist_add_outlined,
                  onPressed: isScanning || isImportingFiles || isCatalogSaving
                      ? null
                      : () => onRegisterFiles([file]),
                ),
              ],
            ),
        if (linkedFiles.isNotEmpty) const Divider(height: 20),
        for (final file in linkedFiles.take(2))
          PlayAudioFileRow(
            file: file,
            details: linksByFileId[file.id] == null
                ? '연결됨 · ${_formatSize(file.sizeBytes)}'
                : '연결됨 · 트랙 ${linksByFileId[file.id]!.trackId}\n'
                      '${_formatSize(file.sizeBytes)}',
          ),
      ],
    );
  }

  String _fileSubtitle(LocalAudioFile file, MetadataCandidate? candidate) {
    final base = '${file.format} · ${file.importStatus.label}';
    if (candidate == null || candidate.summary == '후보 없음') {
      return base;
    }
    return '$base\n후보: ${candidate.summary}';
  }

  String _formatSize(int? sizeBytes) {
    if (sizeBytes == null) {
      return '-';
    }

    if (sizeBytes < 1024 * 1024) {
      return '${(sizeBytes / 1024).toStringAsFixed(1)} KB';
    }

    return '${(sizeBytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}

class _QueuePanel extends StatelessWidget {
  const _QueuePanel({
    required this.plan,
    required this.scannedFiles,
    required this.links,
    required this.playbackState,
    required this.isCommandRunning,
    required this.onPlayPausePressed,
    required this.onNextPressed,
    required this.onStopPressed,
    required this.onSeek,
  });

  final PlaybackPlan plan;
  final List<LocalAudioFile> scannedFiles;
  final List<AudioFileTrackLink> links;
  final LocalPlaybackState playbackState;
  final bool isCommandRunning;
  final VoidCallback onPlayPausePressed;
  final VoidCallback onNextPressed;
  final VoidCallback onStopPressed;
  final ValueChanged<Duration> onSeek;

  @override
  Widget build(BuildContext context) {
    final plannedQueue = const LocalPlaybackQueueBuilder().build(
      plan: plan,
      scannedFiles: scannedFiles,
      links: links,
    );
    final availability = const LocalPlaybackQueueBuilder().buildDetailed(
      plan: plan,
      scannedFiles: scannedFiles,
      links: links,
    );
    final showsActiveQueue =
        playbackState.hasQueue &&
        playbackState.playerState != LocalPlayerState.idle &&
        playbackState.playerState != LocalPlayerState.stopped;
    final localQueue = showsActiveQueue ? playbackState.queue : plannedQueue;

    return KeyedSubtree(
      key: const ValueKey('queue-panel'),
      child: _Section(
        title: '현재 재생 큐',
        trailingWidget: DdiroriStatusBadge(
          label: '${localQueue.length}개 트랙',
          tone: showsActiveQueue
              ? DdiroriStatusTone.success
              : DdiroriStatusTone.neutral,
        ),
        children: [
          PlayNowPlayingControls(
            state: playbackState,
            canUseQueue: localQueue.isNotEmpty || plannedQueue.isNotEmpty,
            commandRunning: isCommandRunning,
            onPlayPause: onPlayPausePressed,
            onNext: onNextPressed,
            onStop: onStopPressed,
            onSeek: onSeek,
          ),
          const SizedBox(height: 8),
          if (availability.missingCount > 0)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.warning_amber_outlined),
              title: Text('연결되지 않은 악장 ${availability.missingCount}개'),
              subtitle: Text(
                availability.missingTitles.join(' · '),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          for (var index = 0; index < localQueue.length; index += 1)
            PlayQueueRow(
              index: index,
              item: localQueue[index],
              current: showsActiveQueue && playbackState.currentIndex == index,
            ),
        ],
      ),
    );
  }
}

class _RecentListeningPanel extends StatelessWidget {
  const _RecentListeningPanel({
    required this.entries,
    required this.continuationFor,
    required this.retentionPolicy,
    required this.isCommandRunning,
    required this.onContinue,
    required this.onDelete,
    required this.onClearAll,
    required this.onRetentionPolicyChanged,
  });

  final List<PlaybackHistoryEntry> entries;
  final ContinueListeningQueueResult Function(PlaybackHistoryEntry entry)
  continuationFor;
  final PlaybackHistoryRetentionPolicy retentionPolicy;
  final bool isCommandRunning;
  final ValueChanged<PlaybackHistoryEntry> onContinue;
  final ValueChanged<PlaybackHistoryEntry> onDelete;
  final VoidCallback onClearAll;
  final ValueChanged<PlaybackHistoryRetentionPolicy> onRetentionPolicyChanged;

  @override
  Widget build(BuildContext context) {
    return KeyedSubtree(
      key: const ValueKey('recent-listening-panel'),
      child: _Section(
        title: '최근 감상',
        trailingWidget: Wrap(
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            DdiroriStatusBadge(
              label: entries.isEmpty ? '기록 없음' : '${entries.length}개',
            ),
            DdiroriMenuButton<Object>(
              label: '감상 기록 관리',
              enabled: !isCommandRunning,
              onSelected: (action) {
                if (action == _HistoryMenuAction.clearAll) {
                  onClearAll();
                } else if (action is PlaybackHistoryRetentionPolicy) {
                  onRetentionPolicyChanged(action);
                }
              },
              itemBuilder: (context) => [
                PopupMenuItem(
                  enabled: false,
                  child: Text('보관: ${retentionPolicy.label}'),
                ),
                for (final policy in PlaybackHistoryRetentionPolicy.values)
                  PopupMenuItem(
                    value: policy,
                    child: Row(
                      children: [
                        Icon(
                          retentionPolicy == policy
                              ? Icons.check_outlined
                              : Icons.schedule_outlined,
                        ),
                        const SizedBox(width: 8),
                        Flexible(child: Text(policy.label)),
                      ],
                    ),
                  ),
                const PopupMenuDivider(),
                const PopupMenuItem(
                  value: _HistoryMenuAction.clearAll,
                  child: Row(
                    children: [
                      Icon(Icons.delete_sweep_outlined),
                      SizedBox(width: 8),
                      Text('전체 삭제'),
                    ],
                  ),
                ),
              ],
              icon: Icons.more_vert_outlined,
            ),
          ],
        ),
        children: [
          if (entries.isEmpty)
            const ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(Icons.history_outlined),
              title: Text('아직 감상 기록이 없습니다.'),
              subtitle: Text('로컬 음원을 재생하면 작품과 악장별 기록이 여기에 표시됩니다.'),
            )
          else
            for (final entry in entries) _historyRow(entry),
        ],
      ),
    );
  }

  Widget _historyRow(PlaybackHistoryEntry entry) {
    final continuation = continuationFor(entry);
    return PlayListeningHistoryRow(
      entry: entry,
      busy: isCommandRunning,
      canContinue: continuation.canPlay,
      unavailableReason: continuation.unavailableReason,
      onContinue: () => onContinue(entry),
      onDelete: () => onDelete(entry),
    );
  }
}

enum _HistoryMenuAction { clearAll }

class _ListeningStatisticsPanel extends StatelessWidget {
  const _ListeningStatisticsPanel({
    required this.statistics,
    required this.period,
    required this.onPeriodChanged,
  });

  final PlaybackHistoryStatistics statistics;
  final ListeningStatisticsPeriod period;
  final ValueChanged<ListeningStatisticsPeriod> onPeriodChanged;

  @override
  Widget build(BuildContext context) {
    return _Section(
      title: '감상 통계',
      trailingWidget: DdiroriStatusBadge(
        label: '${statistics.sessionCount}회',
        tone: statistics.sessionCount == 0
            ? DdiroriStatusTone.neutral
            : DdiroriStatusTone.info,
      ),
      children: [
        DdiroriSegments<ListeningStatisticsPeriod>(
          options: {
            for (final value in ListeningStatisticsPeriod.values)
              value: value.label,
          },
          selected: {period},
          onChanged: (selected) => onPeriodChanged(selected.first),
        ),
        const SizedBox(height: 12),
        if (statistics.sessionCount == 0)
          const ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(Icons.bar_chart_outlined),
            title: Text('선택한 기간의 감상 기록이 없습니다.'),
          )
        else ...[
          Text(
            '감상 시간 ${formatDdiroriDuration(statistics.listenedDuration)} · '
            '완료 ${statistics.completedSessionCount}회 · '
            '트랙 ${statistics.distinctTrackCount}개',
          ),
          const SizedBox(height: 8),
          _StatisticsGroupList(
            title: '많이 들은 작품',
            groups: statistics.workStatistics,
            icon: Icons.library_music_outlined,
          ),
          _StatisticsGroupList(
            title: '많이 들은 녹음',
            groups: statistics.recordingStatistics,
            icon: Icons.album_outlined,
          ),
        ],
      ],
    );
  }
}

class _StatisticsGroupList extends StatelessWidget {
  const _StatisticsGroupList({
    required this.title,
    required this.groups,
    required this.icon,
  });

  final String title;
  final List<PlaybackHistoryGroupStatistics> groups;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleSmall),
        for (final group in groups)
          PlayListeningStatisticRow(group: group, icon: icon),
      ],
    );
  }
}

class _WorksPanel extends StatelessWidget {
  const _WorksPanel({required this.library, required this.onWorkSelected});

  final ClassicalLibrary library;
  final ValueChanged<String> onWorkSelected;

  @override
  Widget build(BuildContext context) {
    return _Section(
      title: '작품',
      trailing: '한국어/원어/별칭 보존',
      children: [
        for (final work in library.works)
          PlayWorkRow(
            work: work,
            composer: library.person(work.composerId),
            partCount: library.partsForWork(work.id).length,
            recordingCount: library.recordingsForWork(work.id).length,
            onTap: () => onWorkSelected(work.id),
          ),
      ],
    );
  }
}

class _RecordingsPanel extends StatelessWidget {
  const _RecordingsPanel({
    required this.library,
    required this.onRecordingSelected,
  });

  final ClassicalLibrary library;
  final ValueChanged<String> onRecordingSelected;

  @override
  Widget build(BuildContext context) {
    return _Section(
      title: '연주 녹음',
      trailing: '앨범과 작품을 분리',
      children: [
        for (final recording in library.recordings)
          PlayRecordingRow(
            recording: recording,
            workTitle: library.work(recording.workId).title.ko,
            onTap: () => onRecordingSelected(recording.id),
          ),
      ],
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({
    required this.title,
    this.trailing,
    this.trailingWidget,
    required this.children,
  }) : assert(trailing != null || trailingWidget != null);

  final String title;
  final String? trailing;
  final Widget? trailingWidget;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final tools =
          trailingWidget ??
          Text(trailing!, style: Theme.of(context).textTheme.labelLarge);
      final stackHeading =
          constraints.maxWidth / MediaQuery.textScalerOf(context).scale(1) <
          280;
      return DdiroriSection(
        title: title,
        trailing: stackHeading ? null : tools,
        spacing: 0,
        children: [
          if (stackHeading)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Align(alignment: Alignment.centerLeft, child: tools),
            ),
          ...children,
        ],
      );
    },
  );
}
