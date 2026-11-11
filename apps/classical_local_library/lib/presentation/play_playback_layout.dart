import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../local_playback.dart';
import 'play_playback_components.dart';
import 'play_library_components.dart';
import 'play_artwork.dart';

class PlayPlaybackSnapshot {
  const PlayPlaybackSnapshot(
    this.state, {
    this.commandRunning = false,
    this.currentFavorite = false,
    this.favoriteBusy = false,
    this.canFavorite = false,
    this.notice,
  });

  final LocalPlaybackState state;
  final bool commandRunning;
  final bool currentFavorite, favoriteBusy;
  final bool canFavorite;
  final String? notice;
}

class PlayPlaybackScope extends InheritedWidget {
  const PlayPlaybackScope({
    super.key,
    required this.snapshot,
    required this.onPlayPause,
    required this.onNext,
    this.onPrevious,
    this.onShuffle,
    this.onRepeat,
    required this.onStop,
    required this.onSeek,
    this.onAddToPlaylist,
    this.onToggleFavorite,
    this.onRemoveQueueItem,
    this.onMoveQueueItem,
    this.onClearUpcoming,
    this.onDismissNotice,
    this.wrapPage,
    required super.child,
  });

  final ValueListenable<PlayPlaybackSnapshot> snapshot;
  final Future<void> Function() onPlayPause;
  final Future<void> Function() onNext;
  final Future<void> Function()? onPrevious;
  final Future<void> Function()? onShuffle, onRepeat;
  final Future<void> Function() onStop;
  final Future<void> Function(Duration) onSeek;
  final VoidCallback? onAddToPlaylist;
  final VoidCallback? onToggleFavorite;
  final Future<void> Function(int)? onRemoveQueueItem;
  final Future<void> Function(int, int)? onMoveQueueItem;
  final Future<void> Function()? onClearUpcoming;
  final VoidCallback? onDismissNotice;
  final Widget Function(Widget)? wrapPage;
  Widget _wrap(Widget child) => wrapPage?.call(child) ?? child;

  static PlayPlaybackScope? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<PlayPlaybackScope>();

  @override
  bool updateShouldNotify(PlayPlaybackScope oldWidget) =>
      snapshot != oldWidget.snapshot;

  Widget controls(
    PlayPlaybackSnapshot value, {
    bool showContext = true,
    bool? canUseQueue,
  }) => PlayNowPlayingControls(
    state: value.state,
    canUseQueue: canUseQueue ?? value.state.hasQueue,
    commandRunning: value.commandRunning,
    showContext: showContext,
    onPlayPause: onPlayPause,
    onNext: onNext,
    onPrevious: onPrevious,
    onShuffle: onShuffle,
    onRepeat: onRepeat,
    onStop: onStop,
    onSeek: onSeek,
    onAddToPlaylist: onAddToPlaylist,
    onToggleFavorite: value.canFavorite ? onToggleFavorite : null,
    favorite: value.currentFavorite,
    favoriteBusy: value.favoriteBusy,
  );

  bool _canEdit(PlayPlaybackSnapshot value) =>
      !value.commandRunning &&
      !value.state.isBusy &&
      value.state.failure == null;

  Widget notice(PlayPlaybackSnapshot value) => Material(
    type: MaterialType.transparency,
    child: DdiroriBanner(
      message: value.notice!,
      action: DdiroriIconButton(
        label: '곡 작업 알림 닫기',
        icon: Icons.close,
        onPressed: onDismissNotice,
      ),
    ),
  );

  bool _sameQueue(PlayPlaybackSnapshot value) =>
      identical(snapshot.value.state.queue, value.state.queue) &&
      snapshot.value.state.currentIndex == value.state.currentIndex &&
      _canEdit(snapshot.value);

  Widget upcomingActions(BuildContext context, PlayPlaybackSnapshot value) =>
      onClearUpcoming == null
      ? const SizedBox.shrink()
      : Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('현재 곡과 이미 지난 곡은 여기서 편집하지 않습니다.'),
            DdiroriButton(
              label: '남은 대기열 비우기',
              kind: DdiroriButtonKind.quiet,
              onPressed:
                  !_canEdit(value) ||
                      value.state.currentItem == null ||
                      value.state.currentIndex + 1 >= value.state.queue.length
                  ? null
                  : () async {
                      final confirmed = await showDdiroriConfirmDialog(
                        context: context,
                        title: '남은 대기열 비우기',
                        message: '현재 곡 뒤의 예약을 모두 지울까요? 보관함과 재생목록은 그대로입니다.',
                        confirmLabel: '비우기',
                      );
                      if (confirmed == true &&
                          context.mounted &&
                          _sameQueue(value)) {
                        await onClearUpcoming!();
                      }
                    },
            ),
          ],
        );

  Widget queueRow(
    PlayPlaybackSnapshot value,
    int index, {
    bool showContext = true,
  }) {
    final editable =
        value.state.currentItem != null && index > value.state.currentIndex;
    return PlayQueueRow(
      key: ValueKey('now-playing-queue-$index'),
      index: index,
      item: value.state.queue[index],
      current: index == value.state.currentIndex,
      showContext: showContext,
      editMenu: !editable || onRemoveQueueItem == null
          ? null
          : DdiroriMenuButton<String>(
              label: '${index + 1}번 대기열 편집',
              enabled: _canEdit(value),
              onSelected: (action) async {
                if (!_sameQueue(value)) return;
                if (action == 'remove') {
                  await onRemoveQueueItem!(index);
                } else if (onMoveQueueItem != null) {
                  await onMoveQueueItem!(
                    index,
                    action == 'up' ? index - 1 : index + 1,
                  );
                }
              },
              itemBuilder: (_) => [
                if (onMoveQueueItem != null &&
                    index > value.state.currentIndex + 1)
                  const PopupMenuItem(value: 'up', child: Text('위로 이동')),
                if (onMoveQueueItem != null &&
                    index + 1 < value.state.queue.length)
                  const PopupMenuItem(value: 'down', child: Text('아래로 이동')),
                const PopupMenuItem(value: 'remove', child: Text('대기열에서 제거')),
              ],
            ),
    );
  }

  Future<void> openDetails(BuildContext context) =>
      Navigator.of(context).push<void>(
        MaterialPageRoute(
          builder: (context) => _wrap(
            Scaffold(
              appBar: AppBar(title: const Text('현재 재생')),
              body: SafeArea(
                child: ValueListenableBuilder<PlayPlaybackSnapshot>(
                  valueListenable: snapshot,
                  builder: (context, value, _) => CustomScrollView(
                    slivers: [
                      SliverPadding(
                        padding: const EdgeInsets.all(16),
                        sliver: SliverToBoxAdapter(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              if (value.notice != null) notice(value),
                              controls(value),
                              if (value.state.failure != null) ...[
                                const SizedBox(height: 12),
                                Text(
                                  value.state.currentItem?.isDirectFile ?? false
                                      ? '다시 시도하면 현재 큐의 첫 곡부터 재생합니다.'
                                      : '다시 시도하면 현재 큐의 첫 악장부터 재생합니다.',
                                ),
                              ],
                              const SizedBox(height: 24),
                              Text(
                                '재생 대기열',
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              const SizedBox(height: 8),
                              upcomingActions(context, value),
                            ],
                          ),
                        ),
                      ),
                      SliverList.builder(
                        itemCount: value.state.queue.length,
                        itemBuilder: (context, index) => queueRow(value, index),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      );
}

class PlayPlaybackLayout extends StatefulWidget {
  const PlayPlaybackLayout({
    super.key,
    required this.child,
    this.fullPlayerInBody = false,
  });

  final Widget child;
  final bool fullPlayerInBody;

  static bool isWide(BuildContext context) =>
      MediaQuery.sizeOf(context).width >= 800;

  @override
  State<PlayPlaybackLayout> createState() => _PlayPlaybackLayoutState();
}

class _PlayPlaybackLayoutState extends State<PlayPlaybackLayout> {
  // Queue/notice/layout transitions reparent this page, preserving its input,
  // import completion and scroll state instead of creating a fresh screen.
  final _pageKey = GlobalKey();

  @override
  Widget build(BuildContext context) {
    final scope = PlayPlaybackScope.maybeOf(context);
    final page = KeyedSubtree(key: _pageKey, child: widget.child);
    if (scope == null) return page;
    return ValueListenableBuilder<PlayPlaybackSnapshot>(
      valueListenable: scope.snapshot,
      child: page,
      builder: (context, value, body) {
        if (value.notice != null) {
          body = Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              scope.notice(value),
              Expanded(child: body!),
            ],
          );
        }
        if (!value.state.hasQueue) return body!;
        return LayoutBuilder(
          builder: (context, constraints) {
            if (constraints.maxWidth >= 800) {
              return Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(child: body!),
                  const VerticalDivider(width: 1),
                  SizedBox(
                    width: 340,
                    child: Material(
                      color: Theme.of(context).colorScheme.surface,
                      child: SafeArea(
                        top: false,
                        left: false,
                        child: SingleChildScrollView(
                          key: const ValueKey('persistent-playback-panel'),
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              scope.controls(
                                value,
                                showContext:
                                    !widget.fullPlayerInBody ||
                                    value.state.queue.any(
                                      (item) =>
                                          item.workId !=
                                              value.state.queue.first.workId ||
                                          item.recordingId !=
                                              value
                                                  .state
                                                  .queue
                                                  .first
                                                  .recordingId,
                                    ),
                              ),
                              Align(
                                alignment: AlignmentDirectional.centerEnd,
                                child: DdiroriIconButton(
                                  label: '재생 상세 열기',
                                  icon: Icons.open_in_full,
                                  onPressed: () => scope.openDetails(context),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              );
            }
            return Column(
              children: [
                Expanded(child: body!),
                _PlaybackStrip(
                  value: value,
                  scope: scope,
                  showTitle: !widget.fullPlayerInBody,
                ),
              ],
            );
          },
        );
      },
    );
  }
}

class _PlaybackStrip extends StatelessWidget {
  const _PlaybackStrip({
    required this.value,
    required this.scope,
    required this.showTitle,
  });

  final PlayPlaybackSnapshot value;
  final PlayPlaybackScope scope;
  final bool showTitle;

  @override
  Widget build(BuildContext context) {
    final state = value.state;
    final item = state.currentItem;
    final busy = value.commandRunning || state.isBusy;
    final playing = state.playerState == LocalPlayerState.playing;
    return Material(
      key: const ValueKey('persistent-playback-strip'),
      color: Theme.of(context).colorScheme.surface,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          child: Row(
            children: [
              Expanded(
                child: Semantics(
                  button: true,
                  label:
                      '현재 재생 상세 열기, ${item?.displayTitle ?? ''}, ${state.summary}',
                  child: Tooltip(
                    message: '재생 상세 열기',
                    child: InkWell(
                      onTap: () => scope.openDetails(context),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 8,
                        ),
                        child: Row(
                          children: [
                            PlayArtwork(trackId: item?.trackId),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    item?.displayTitle ?? '현재 재생',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  if (showTitle)
                                    Text(
                                      '${item?.recordingTitle ?? ''} · ${playPlayerStateLabel(state.playerState)}',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: Theme.of(context)
                                          .textTheme
                                          .labelSmall,
                                    ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              DdiroriIconButton(
                label: playing ? '축약 일시정지' : '축약 재생',
                icon: playing ? Icons.pause : Icons.play_arrow,
                onPressed: busy ? null : scope.onPlayPause,
              ),
              DdiroriIconButton(
                label: '축약 다음',
                icon: Icons.skip_next,
                onPressed:
                    busy ||
                        value.state.currentItem == null ||
                        value.state.failure != null
                    ? null
                    : scope.onNext,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
