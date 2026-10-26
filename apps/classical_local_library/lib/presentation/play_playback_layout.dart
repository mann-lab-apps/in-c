import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../local_playback.dart';
import 'play_playback_components.dart';

class PlayPlaybackSnapshot {
  const PlayPlaybackSnapshot(this.state, {this.commandRunning = false});

  final LocalPlaybackState state;
  final bool commandRunning;
}

class PlayPlaybackScope extends InheritedWidget {
  const PlayPlaybackScope({
    super.key,
    required this.snapshot,
    required this.onPlayPause,
    required this.onNext,
    required this.onStop,
    required this.onSeek,
    this.onAddToPlaylist,
    required super.child,
  });

  final ValueListenable<PlayPlaybackSnapshot> snapshot;
  final Future<void> Function() onPlayPause;
  final Future<void> Function() onNext;
  final Future<void> Function() onStop;
  final Future<void> Function(Duration) onSeek;
  final VoidCallback? onAddToPlaylist;

  static PlayPlaybackScope? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<PlayPlaybackScope>();

  @override
  bool updateShouldNotify(PlayPlaybackScope oldWidget) =>
      snapshot != oldWidget.snapshot;

  Widget controls(PlayPlaybackSnapshot value, {bool showContext = true}) =>
      PlayNowPlayingControls(
        state: value.state,
        canUseQueue: value.state.hasQueue,
        commandRunning: value.commandRunning,
        showContext: showContext,
        onPlayPause: onPlayPause,
        onNext: onNext,
        onStop: onStop,
        onSeek: onSeek,
        onAddToPlaylist: onAddToPlaylist,
      );

  Future<void> openDetails(BuildContext context) =>
      Navigator.of(context).push<void>(
        MaterialPageRoute(
          builder: (context) => Scaffold(
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
                          ],
                        ),
                      ),
                    ),
                    SliverList.builder(
                      itemCount: value.state.queue.length,
                      itemBuilder: (context, index) {
                        final item = value.state.queue[index];
                        return ListTile(
                          key: ValueKey('now-playing-queue-$index'),
                          leading: Text('${index + 1}'),
                          title: Text(
                            item.displayTitle,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          subtitle: Text(
                            item.isDirectFile
                                ? item.recordingTitle
                                : '${item.workTitle} · ${item.recordingTitle}',
                          ),
                          selected: index == value.state.currentIndex,
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
}

class PlayPlaybackLayout extends StatelessWidget {
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
  Widget build(BuildContext context) {
    final scope = PlayPlaybackScope.maybeOf(context);
    if (scope == null) return child;
    return ValueListenableBuilder<PlayPlaybackSnapshot>(
      valueListenable: scope.snapshot,
      child: child,
      builder: (context, value, body) {
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
                                  !fullPlayerInBody ||
                                  value.state.queue.any(
                                    (item) =>
                                        item.workId !=
                                            value.state.queue.first.workId ||
                                        item.recordingId !=
                                            value.state.queue.first.recordingId,
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
                ],
              );
            }
            return Column(
              children: [
                Expanded(child: body!),
                _PlaybackStrip(
                  value: value,
                  scope: scope,
                  showTitle: !fullPlayerInBody,
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
                            const Icon(Icons.music_note_outlined),
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
                onPressed: busy ? null : scope.onNext,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
