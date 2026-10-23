import 'dart:async';

import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';

import 'library_details.dart';
import 'local_playback.dart';
import 'presentation/play_library_components.dart';

class WorkDetailScreen extends StatelessWidget {
  const WorkDetailScreen({
    super.key,
    required this.data,
    required this.onOpenRecording,
    required this.onPlayRecording,
  });

  final WorkDetailData data;
  final ValueChanged<String> onOpenRecording;
  final Future<void> Function(String recordingId) onPlayRecording;

  @override
  Widget build(BuildContext context) {
    final work = data.work;
    final playableRecordings = data.recordings
        .where((recording) => recording.canPlay)
        .toList();
    return Scaffold(
      appBar: AppBar(title: const Text('작품')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
          children: [
            Semantics(
              header: true,
              child: Text(
                data.displayTitle,
                style: Theme.of(context).textTheme.headlineSmall,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              [
                data.displayComposerName,
                ?data.displayCatalogNumber,
                ?work.periodLabel,
              ].join(' · '),
            ),
            if (work.title.original != null) ...[
              const SizedBox(height: 4),
              Text(work.title.original!),
            ],
            const SizedBox(height: 16),
            if (data.recordings.length > 1)
              const DdiroriBanner(
                message: '아래에서 듣고 싶은 녹음을 선택하세요.',
                kind: DdiroriNoticeKind.info,
              )
            else if (playableRecordings.length == 1)
              Align(
                alignment: Alignment.centerLeft,
                child: DdiroriButton(
                  label: '작품 재생',
                  icon: Icons.play_arrow_outlined,
                  onPressed: () =>
                      onPlayRecording(playableRecordings.single.recording.id),
                ),
              )
            else
              const DdiroriBanner(
                message: '연결된 로컬 파일이 없어 이 작품을 재생할 수 없습니다.',
                kind: DdiroriNoticeKind.warning,
              ),
            const SizedBox(height: 16),
            DdiroriSection(
              title: '악장',
              subtitle: data.parts.isEmpty
                  ? '등록된 악장 정보가 없습니다.'
                  : '${data.parts.length}개 악장',
              children: data.parts.isEmpty
                  ? const [
                      DdiroriStatePanel(
                        title: '악장 정보가 없습니다',
                        message: '파일 정리에서 악장 순서를 확인할 수 있습니다.',
                      ),
                    ]
                  : [
                      for (final detail in data.parts)
                        PlayMovementRow(
                          sequenceNumber: detail.part.sequenceNumber,
                          title: detail.part.title.ko,
                          originalTitle: detail.part.title.original,
                          hasLocalFile: detail.hasLocalFile,
                        ),
                    ],
            ),
            const SizedBox(height: 16),
            DdiroriSection(
              title: '녹음',
              subtitle: data.recordings.isEmpty
                  ? '등록된 녹음이 없습니다.'
                  : '${data.recordings.length}개 녹음',
              children: data.recordings.isEmpty
                  ? const [
                      DdiroriStatePanel(
                        title: '녹음이 없습니다',
                        message: '로컬 음원을 작품과 녹음으로 정리하면 여기에 표시됩니다.',
                      ),
                    ]
                  : [
                      for (final detail in data.recordings)
                        PlayRecordingRow(
                          recording: detail.recording,
                          workTitle: detail.participantLabel,
                          onTap: () => onOpenRecording(detail.recording.id),
                          actions: [
                            DdiroriIconButton(
                              label: '${detail.recording.title.ko} 재생',
                              icon: Icons.play_arrow_outlined,
                              onPressed: detail.canPlay
                                  ? () => unawaited(
                                      onPlayRecording(detail.recording.id),
                                    )
                                  : null,
                            ),
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 6,
                              ),
                              child: Text(
                                '${detail.availableTrackCount}/${detail.trackCount} 재생 가능',
                              ),
                            ),
                          ],
                        ),
                    ],
            ),
          ],
        ),
      ),
    );
  }
}

class RecordingDetailScreen extends StatelessWidget {
  const RecordingDetailScreen({
    super.key,
    required this.data,
    required this.initialPlaybackState,
    required this.playbackStates,
    required this.onPlayAll,
    required this.onPlayFromTrack,
  });

  final RecordingDetailData data;
  final LocalPlaybackState initialPlaybackState;
  final Stream<LocalPlaybackState> playbackStates;
  final Future<void> Function() onPlayAll;
  final Future<void> Function(String trackId) onPlayFromTrack;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<LocalPlaybackState>(
      stream: playbackStates,
      initialData: initialPlaybackState,
      builder: (context, snapshot) {
        final playback = snapshot.data ?? initialPlaybackState;
        final currentTrackId =
            playback.currentItem?.recordingId == data.recording.id
            ? playback.currentItem?.trackId
            : null;
        final busy = playback.isBusy;
        return Scaffold(
          appBar: AppBar(title: const Text('녹음')),
          body: SafeArea(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
              children: [
                Semantics(
                  header: true,
                  child: Text(
                    data.displayRecordingTitle,
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                ),
                const SizedBox(height: 4),
                Text('${data.displayComposerName} · ${data.displayWorkTitle}'),
                if (data.recording.title.original != null) ...[
                  const SizedBox(height: 4),
                  Text(data.recording.title.original!),
                ],
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    DdiroriStatusBadge(
                      label:
                          '${data.availableTrackCount}/${data.tracks.length} 재생 가능',
                      tone: data.canPlay
                          ? DdiroriStatusTone.success
                          : DdiroriStatusTone.warning,
                    ),
                    if (data.year != null)
                      DdiroriStatusBadge(label: '${data.year}년'),
                    if (data.totalDuration != null)
                      DdiroriStatusBadge(
                        label: formatDdiroriDuration(data.totalDuration!),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                if (data.canPlay)
                  Align(
                    alignment: Alignment.centerLeft,
                    child: DdiroriButton(
                      label: '녹음 전체 재생',
                      icon: Icons.play_arrow_outlined,
                      busy: busy,
                      onPressed: busy ? null : onPlayAll,
                    ),
                  )
                else
                  const DdiroriBanner(
                    message: '연결된 로컬 파일이 없어 이 녹음을 재생할 수 없습니다.',
                    kind: DdiroriNoticeKind.warning,
                  ),
                const SizedBox(height: 16),
                DdiroriSection(
                  title: '녹음 정보',
                  children: [
                    if (data.albumTitle != null)
                      _DetailLine(label: '앨범', value: data.albumTitle!),
                    if (data.ensembleName != null)
                      _DetailLine(label: '앙상블', value: data.ensembleName!),
                    if (data.credits.isEmpty &&
                        data.albumTitle == null &&
                        data.ensembleName == null)
                      const Text('등록된 참여자와 발매 정보가 없습니다.')
                    else
                      for (final credit in data.credits)
                        _DetailLine(
                          label: credit.roleLabel,
                          value: credit.name,
                        ),
                  ],
                ),
                const SizedBox(height: 16),
                DdiroriSection(
                  title: '악장과 트랙',
                  subtitle: data.tracks.isEmpty
                      ? '등록된 트랙이 없습니다.'
                      : '악장을 선택하면 그 지점부터 이어서 재생합니다.',
                  children: data.tracks.isEmpty
                      ? const [
                          DdiroriStatePanel(
                            title: '트랙이 없습니다',
                            message: '파일 정리에서 녹음의 악장 순서를 확인하세요.',
                          ),
                        ]
                      : [
                          for (final detail in data.tracks)
                            PlayMovementRow(
                              sequenceNumber: detail.track.sequenceNumber,
                              title: detail.displayTitle,
                              originalTitle: detail.originalTitle,
                              duration: detail.track.duration,
                              fileName: detail.fileName,
                              hasLocalFile: detail.hasLocalFile,
                              current: currentTrackId == detail.track.id,
                              onTap: detail.hasLocalFile && !busy
                                  ? () => unawaited(
                                      onPlayFromTrack(detail.track.id),
                                    )
                                  : null,
                            ),
                        ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _DetailLine extends StatelessWidget {
  const _DetailLine({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 72,
          child: Text(label, style: Theme.of(context).textTheme.labelLarge),
        ),
        const SizedBox(width: 8),
        Expanded(child: Text(value)),
      ],
    ),
  );
}
