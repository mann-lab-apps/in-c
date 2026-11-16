part of '../main.dart';

/// One visit-local selection; list rows remain lazy and use the shared Item.
class _SelectableSongSliver extends StatefulWidget implements _LibrarySliver {
  const _SelectableSongSliver({
    super.key,
    required this.ordered,
    required this.visible,
    required this.favoriteIds,
    required this.busy,
    required this.onBatch,
    required this.onPlay,
    required this.onAction,
    required this.onMissing,
    this.currentTrackId,
    this.showEmpty = true,
  });
  final List<LocalFileLibraryEntry> ordered, visible;
  final Set<String> favoriteIds;
  final bool busy;
  final bool showEmpty;
  final String? currentTrackId;
  final Future<bool> Function(List<String>, LibraryBatchAction) onBatch;
  final void Function(LocalFileLibraryEntry, List<LocalFileLibraryEntry>)
  onPlay;
  final void Function(LocalFileLibraryEntry, _SongAction) onAction;
  final VoidCallback onMissing;
  @override
  State<_SelectableSongSliver> createState() => _SelectableSongSliverState();
}

class _SelectableSongSliverState extends State<_SelectableSongSliver> {
  final selection = LibrarySongSelection();
  bool running = false;
  bool choosingPlaylist = false;
  String? error;
  bool get busy => widget.busy || running;

  Future<void> run(LibraryBatchAction action) async {
    if (busy || selection.ids.isEmpty) return;
    final ids = selection.snapshot(widget.ordered);
    setState(() {
      running = true;
      choosingPlaylist = action == LibraryBatchAction.playlist;
      error = null;
    });
    var saved = false;
    try {
      saved = await widget.onBatch(ids, action);
    } catch (_) {
      if (mounted) error = '작업을 마치지 못했습니다. 선택한 곡을 확인하고 다시 시도해 주세요.';
    }
    if (!mounted) return;
    setState(() {
      running = false;
      choosingPlaylist = false;
      if (saved) selection.finish();
    });
  }

  @override
  Widget build(BuildContext context) {
    final visibleIds = widget.visible.map((e) => e.file.id).toSet();
    final hidden = selection.ids.difference(visibleIds).length;
    return SliverMainAxisGroup(
      slivers: [
        SliverToBoxAdapter(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (!selection.active)
                Align(
                  alignment: AlignmentDirectional.centerEnd,
                  child: DdiroriButton(
                    label: '여러 곡 선택',
                    kind: DdiroriButtonKind.quiet,
                    onPressed: busy || widget.ordered.isEmpty
                        ? null
                        : () => setState(() => selection.active = true),
                  ),
                ),
              if (selection.active) ...[
                Semantics(
                  liveRegion: true,
                  child: Text(
                    '${selection.ids.length}곡 선택${hidden == 0 ? '' : ' · 검색 밖 $hidden곡 포함'}',
                  ),
                ),
                const Text('검색 밖 선택도 함께 처리합니다. 현재 정렬 순서로 실행합니다.'),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    DdiroriButton(
                      label: '현재 결과 모두 선택',
                      kind: DdiroriButtonKind.quiet,
                      onPressed: busy
                          ? null
                          : () =>
                                setState(() => selection.selectAll(visibleIds)),
                    ),
                    DdiroriButton(
                      label: '전체 선택 해제',
                      kind: DdiroriButtonKind.quiet,
                      onPressed: busy ? null : () => setState(selection.clear),
                    ),
                    DdiroriButton(
                      label: '선택 종료',
                      kind: DdiroriButtonKind.quiet,
                      onPressed: busy ? null : () => setState(selection.finish),
                    ),
                    DdiroriMenuButton<LibraryBatchAction>(
                      label: '선택한 곡 작업',
                      icon: Icons.playlist_add_check,
                      enabled: !busy && selection.ids.isNotEmpty,
                      onSelected: (a) => unawaited(run(a)),
                      itemBuilder: (_) => [
                        for (final a in LibraryBatchAction.values)
                          PopupMenuItem(
                            value: a,
                            child: Text(switch (a) {
                              LibraryBatchAction.play => '선택한 곡 재생',
                              LibraryBatchAction.next => '바로 다음에 재생',
                              LibraryBatchAction.last => '대기열 마지막에 추가',
                              LibraryBatchAction.playlist => '재생목록에 추가',
                              LibraryBatchAction.favorite => '즐겨찾기 추가',
                              LibraryBatchAction.unfavorite => '즐겨찾기 해제',
                            }),
                          ),
                      ],
                    ),
                  ],
                ),
              ],
              if (running && !choosingPlaylist)
                const DdiroriProgress(label: '선택한 곡 처리 중'),
              if (error != null)
                DdiroriBanner(message: error!, kind: DdiroriNoticeKind.error),
              if (widget.showEmpty && widget.visible.isEmpty)
                DdiroriStatePanel(
                  title: widget.ordered.isEmpty ? '음악이 없습니다' : '검색 결과가 없습니다',
                  message: widget.ordered.isEmpty
                      ? '음악을 가져오거나 다른 목록에서 곡을 선택하세요.'
                      : '다른 검색어로 찾아보세요.',
                ),
            ],
          ),
        ),
        _LazyLibraryRows(
          keys: [for (final e in widget.visible) 'file-row-${e.file.id}'],
          builder: (context, i) {
            final e = widget.visible[i];
            if (selection.active) {
              void toggle() => setState(() => selection.toggle(e.file.id));
              return DdiroriItem(
                key: ValueKey('select-file-${e.file.id}'),
                flat: true,
                selecting: true,
                selected: selection.ids.contains(e.file.id),
                enabled: !busy,
                title: e.title,
                subtitle: '${e.subtitle}${e.isAvailable ? '' : ' · 파일 없음'}',
                onSelected: busy ? null : (_) => toggle(),
                onTap: busy ? null : toggle,
              );
            }
            return _FileSongRow(
              entry: e,
              favorite: widget.favoriteIds.contains(e.file.id),
              busy: busy,
              current:
                  widget.currentTrackId ==
                  '${LocalFileLibrary.trackPrefix}${e.file.id}',
              onTap: () => widget.onPlay(e, widget.visible),
              onAction: (a) => widget.onAction(e, a),
              onMissing: widget.onMissing,
            );
          },
        ),
      ],
    );
  }
}
