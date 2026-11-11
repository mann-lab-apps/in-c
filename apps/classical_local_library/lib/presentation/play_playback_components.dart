import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';

import 'play_artwork.dart';

import '../local_playback.dart';

class PlayNowPlayingControls extends StatelessWidget {
  const PlayNowPlayingControls({
    super.key,
    required this.state,
    required this.canUseQueue,
    required this.commandRunning,
    required this.onPlayPause,
    required this.onNext,
    this.onPrevious,
    this.onShuffle,
    this.onRepeat,
    required this.onStop,
    required this.onSeek,
    this.onAddToPlaylist,
    this.onToggleFavorite,
    this.favorite = false,
    this.favoriteBusy = false,
    this.showContext = true,
  });

  final LocalPlaybackState state;
  final bool canUseQueue;
  final bool commandRunning;
  final VoidCallback onPlayPause;
  final VoidCallback onNext;
  final VoidCallback? onPrevious;
  final VoidCallback? onShuffle, onRepeat;
  final VoidCallback onStop;
  final ValueChanged<Duration> onSeek;
  final VoidCallback? onAddToPlaylist;
  final VoidCallback? onToggleFavorite;
  final bool favorite, favoriteBusy;
  final bool showContext;

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
    final statusLabel = state.isEditingQueue
        ? '대기열 편집 중'
        : state.isSeeking
        ? '탐색 중'
        : state.isChangingMode
        ? '재생 모드 변경 중'
        : state.processingState == LocalPlaybackProcessingState.buffering
        ? '버퍼링 중'
        : null;
    final contextLabel = showContext && currentItem != null
        ? currentItem.isDirectFile
              ? '\n${currentItem.workTitle} · ${currentItem.recordingTitle}'
              : '\n${currentItem.workTitle.isEmpty ? '작품 정보 없음' : currentItem.workTitle} · '
                    '${currentItem.recordingTitle.isEmpty ? '녹음 정보 없음' : currentItem.recordingTitle}'
        : '';

    return Semantics(
      container: true,
      label: '현재 재생 제어, ${state.summary}',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (currentItem != null && showContext) ...[
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: PlayArtwork(trackId: currentItem.trackId, size: 80),
            ),
            const SizedBox(height: 12),
          ],
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
                        : '${playPlayerStateLabel(state.playerState)} · '
                              '${state.currentIndex + 1}/${state.queue.length}$contextLabel',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
              const SizedBox(height: 8),
              if (busy)
                DdiroriProgress(size: 24, label: statusLabel ?? '불러오는 중')
              else
                DdiroriStatusBadge(
                  label: playPlayerStateLabel(state.playerState),
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
          if (state.failure != null)
            const Text('재생 다시 시도를 누르면 대기열을 다시 불러와 첫 항목부터 재생합니다.'),
          if (state.modeError case final error?)
            DdiroriBanner(message: error, kind: DdiroriNoticeKind.error),
          if (state.queueEditError case final error?)
            DdiroriBanner(message: error, kind: DdiroriNoticeKind.error),
          DdiroriToolbar(
            label: '재생 도구',
            children: [
              if (onPrevious != null)
                DdiroriIconButton(
                  label: '이전',
                  icon: Icons.skip_previous_outlined,
                  onPressed: canUseQueue && !busy && state.failure == null
                      ? onPrevious
                      : null,
                ),
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
                onPressed: currentItem != null && !busy && state.failure == null
                    ? onNext
                    : null,
              ),
              DdiroriIconButton(
                label: '정지',
                icon: Icons.stop_circle_outlined,
                onPressed: state.hasQueue && !busy ? onStop : null,
              ),
              if (currentItem?.isDirectFile ?? false)
                DdiroriIconButton(
                  label: '현재 곡 재생목록에 추가',
                  icon: Icons.playlist_add,
                  onPressed: busy ? null : onAddToPlaylist,
                ),
              if (currentItem != null && onToggleFavorite != null)
                DdiroriIconButton(
                  label: favorite ? '현재 곡 즐겨찾기 해제' : '현재 곡 즐겨찾기 추가',
                  icon: favorite ? Icons.favorite : Icons.favorite_border,
                  selected: favorite,
                  onPressed: busy || favoriteBusy ? null : onToggleFavorite,
                ),
            ],
          ),
          const SizedBox(height: 4),
          if (onShuffle != null || onRepeat != null) ...[
            DdiroriToolbar(
              label: '재생 순서와 반복',
              children: [
                DdiroriIconButton(
                  label: state.shuffleEnabled ? '셔플 켜짐' : '셔플 꺼짐',
                  icon: Icons.shuffle,
                  selected: state.shuffleEnabled,
                  onPressed: canUseQueue && !busy && state.failure == null
                      ? onShuffle
                      : null,
                ),
                DdiroriIconButton(
                  label: state.repeatMode.label,
                  icon: state.repeatMode == LocalRepeatMode.one
                      ? Icons.repeat_one
                      : Icons.repeat,
                  selected: state.repeatMode != LocalRepeatMode.off,
                  onPressed: canUseQueue && !busy && state.failure == null
                      ? onRepeat
                      : null,
                ),
                Text(
                  '${state.shuffleEnabled ? '셔플 켜짐' : '셔플 꺼짐'} · ${state.repeatMode.label}',
                ),
              ],
            ),
            const SizedBox(height: 4),
          ],
          DdiroriPlaybackProgress(
            key: ValueKey((
              currentItem?.trackId,
              currentItem?.path,
              state.originalIndex,
              state.automaticTransitions,
              state.failure?.kind,
              state.playerState == LocalPlayerState.paused,
            )),
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

String playPlayerStateLabel(LocalPlayerState state) => switch (state) {
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
