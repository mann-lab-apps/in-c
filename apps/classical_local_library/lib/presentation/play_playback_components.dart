import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';

import '../local_playback.dart';

class PlayNowPlayingControls extends StatelessWidget {
  const PlayNowPlayingControls({
    super.key,
    required this.state,
    required this.canUseQueue,
    required this.commandRunning,
    required this.onPlayPause,
    required this.onNext,
    required this.onStop,
    required this.onSeek,
  });

  final LocalPlaybackState state;
  final bool canUseQueue;
  final bool commandRunning;
  final VoidCallback onPlayPause;
  final VoidCallback onNext;
  final VoidCallback onStop;
  final ValueChanged<Duration> onSeek;

  @override
  Widget build(BuildContext context) {
    final currentItem = state.currentItem;
    final busy = state.isBusy || commandRunning;
    final duration = state.duration;
    final canSeek =
        duration != null &&
        duration > Duration.zero &&
        currentItem != null &&
        !busy;
    final statusLabel = state.isSeeking
        ? '탐색 중'
        : state.processingState == LocalPlaybackProcessingState.buffering
        ? '버퍼링 중'
        : null;

    return Semantics(
      container: true,
      label: '현재 재생 제어, ${state.summary}',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Semantics(
                      header: true,
                      child: Text(
                        '현재 재생',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      state.failure != null
                          ? state.playerState.label
                          : currentItem == null
                          ? '재생할 음원을 선택하세요.'
                          : '${state.summary}\n'
                                '${currentItem.workTitle} · '
                                '${currentItem.recordingTitle} · '
                                '${currentItem.fileSourceLabel}',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              if (busy)
                const SizedBox.square(
                  dimension: 24,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              else
                DdiroriStatusBadge(
                  label: _playerStateLabel(state.playerState),
                  tone: _playerStateTone(state.playerState),
                ),
            ],
          ),
          const SizedBox(height: 8),
          if (state.failure case final failure?)
            DdiroriBanner(
              message: failure.userMessage,
              kind: DdiroriNoticeKind.error,
            ),
          if (state.failure != null) const SizedBox(height: 8),
          DdiroriToolbar(
            label: '재생 도구',
            children: [
              DdiroriIconButton(
                label: state.playerState == LocalPlayerState.playing
                    ? '일시정지'
                    : '재생',
                icon: state.playerState == LocalPlayerState.playing
                    ? Icons.pause_circle_outline
                    : Icons.play_circle_outline,
                onPressed: canUseQueue && !busy ? onPlayPause : null,
              ),
              DdiroriIconButton(
                label: '다음',
                icon: Icons.skip_next_outlined,
                onPressed: canUseQueue && !busy ? onNext : null,
              ),
              DdiroriIconButton(
                label: '정지',
                icon: Icons.stop_circle_outlined,
                onPressed: state.hasQueue && !busy ? onStop : null,
              ),
            ],
          ),
          const SizedBox(height: 4),
          DdiroriPlaybackProgress(
            sliderKey: const ValueKey('playback-progress'),
            position: state.normalizedPosition,
            duration: duration,
            bufferedPosition: state.normalizedBufferedPosition,
            enabled: canSeek,
            statusLabel: statusLabel,
            onSeek: canSeek ? onSeek : null,
          ),
        ],
      ),
    );
  }
}

String _playerStateLabel(LocalPlayerState state) => switch (state) {
  LocalPlayerState.idle => '대기',
  LocalPlayerState.loading => '불러오는 중',
  LocalPlayerState.ready => '준비됨',
  LocalPlayerState.playing => '재생 중',
  LocalPlayerState.paused => '일시정지',
  LocalPlayerState.stopped => '정지됨',
  LocalPlayerState.completed => '재생 완료',
  LocalPlayerState.error => '재생 오류',
};

DdiroriStatusTone _playerStateTone(LocalPlayerState state) => switch (state) {
  LocalPlayerState.playing => DdiroriStatusTone.success,
  LocalPlayerState.loading ||
  LocalPlayerState.ready ||
  LocalPlayerState.paused => DdiroriStatusTone.info,
  LocalPlayerState.error => DdiroriStatusTone.error,
  LocalPlayerState.completed => DdiroriStatusTone.success,
  LocalPlayerState.idle ||
  LocalPlayerState.stopped => DdiroriStatusTone.neutral,
};
