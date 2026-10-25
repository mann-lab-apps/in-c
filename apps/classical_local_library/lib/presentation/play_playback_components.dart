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
        state.failure == null &&
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
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Semantics(
                    header: true,
                    child: Text(
                      currentItem?.displayTitle ?? '현재 재생',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    currentItem == null
                        ? '재생할 음원을 선택하세요.'
                        : '${_playerStateLabel(state.playerState)} · '
                              '${state.currentIndex + 1}/${state.queue.length}\n'
                              '${currentItem.workTitle} · '
                              '${currentItem.recordingTitle} · '
                              '${currentItem.fileSourceLabel}',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
              const SizedBox(height: 8),
              if (busy)
                DdiroriProgress(size: 24, label: statusLabel ?? '불러오는 중')
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
              action: DdiroriIconButton(
                label: '재생 다시 시도',
                icon: Icons.refresh,
                onPressed: canUseQueue && !busy ? onPlayPause : null,
              ),
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
            key: ValueKey(currentItem?.trackId),
            sliderKey: const ValueKey('playback-progress'),
            position: state.normalizedPosition,
            duration: duration,
            bufferedPosition: state.normalizedBufferedPosition,
            enabled: canSeek,
            statusLabel:
                statusLabel ??
                (currentItem == null
                    ? '선택한 음원 없음'
                    : duration == null || duration <= Duration.zero
                    ? '재생 길이 확인 전'
                    : null),
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
