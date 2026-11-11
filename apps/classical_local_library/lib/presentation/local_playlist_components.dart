part of '../main.dart';

enum _PlaylistTrackAction { up, down, remove }

class _PlaylistSongPicker extends StatefulWidget {
  const _PlaylistSongPicker({
    required this.candidates,
    required this.onAdd,
    this.initialIds = const [],
    this.allowEmpty = false,
    this.confirmLabel,
  });

  final List<LocalFileLibraryEntry> candidates;
  final Future<bool> Function(List<String>) onAdd;
  final List<String> initialIds;
  final bool allowEmpty;
  final String? confirmLabel;

  @override
  State<_PlaylistSongPicker> createState() => _PlaylistSongPickerState();
}

class _PlaylistSongPickerState extends State<_PlaylistSongPicker> {
  String query = '';
  late final selectedIds = {...widget.initialIds};
  bool saving = false;

  Future<void> _save() async {
    if (saving || (selectedIds.isEmpty && !widget.allowEmpty)) return;
    setState(() => saving = true);
    final orderedIds = [
      for (final entry in widget.candidates)
        if (selectedIds.contains(entry.file.id)) entry.file.id,
    ];
    final saved = await widget.onAdd(orderedIds);
    if (!mounted) return;
    if (saved) {
      Navigator.pop(context);
    } else {
      setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final visible = const LocalFileLibrary().search(widget.candidates, query);
    return PopScope(
      canPop: !saving,
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * .5,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DdiroriSearch(
              value: query,
              label: '보관함 곡 검색',
              onChanged: (value) => setState(() => query = value),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: visible.isEmpty
                  ? const Center(child: Text('추가할 수 있는 곡이 없습니다.'))
                  : ListView.builder(
                      itemCount: visible.length,
                      itemBuilder: (context, index) {
                        final entry = visible[index];
                        final selected = selectedIds.contains(entry.file.id);
                        void toggle(bool value) => setState(() {
                          if (value) {
                            selectedIds.add(entry.file.id);
                          } else {
                            selectedIds.remove(entry.file.id);
                          }
                        });
                        return DdiroriItem(
                          key: ValueKey('picker-file-${entry.file.id}'),
                          flat: true,
                          selecting: true,
                          selected: selected,
                          enabled: !saving,
                          title: entry.title,
                          subtitle: entry.subtitle,
                          onSelected: toggle,
                          onTap: () => toggle(!selected),
                        );
                      },
                    ),
            ),
            const SizedBox(height: 8),
            DdiroriButton(
              label: widget.confirmLabel ?? '${selectedIds.length}곡 추가',
              icon: Icons.playlist_add,
              busy: saving,
              onPressed: (selectedIds.isEmpty && !widget.allowEmpty) || saving
                  ? null
                  : _save,
            ),
          ],
        ),
      ),
    );
  }
}

class _PlaylistListPanel extends StatefulWidget implements _LibrarySliver {
  const _PlaylistListPanel({
    required this.playlists,
    required this.busy,
    required this.onCreate,
    required this.onSelect,
    this.highlightedId,
    required this.sort,
    required this.onSort,
  });

  final List<LocalPlaylist> playlists;
  final bool busy;
  final VoidCallback onCreate;
  final ValueChanged<LocalPlaylist> onSelect;
  final String? highlightedId;
  final PlaylistListSort sort;
  final ValueChanged<PlaylistListSort> onSort;

  @override
  State<_PlaylistListPanel> createState() => _PlaylistListPanelState();
}

class _PlaylistListPanelState extends State<_PlaylistListPanel> {
  String query = '';

  @override
  Widget build(BuildContext context) {
    final visible = const LocalPlaylistBrowseQuery().lists(
      widget.playlists,
      query,
      widget.sort,
    );
    return SliverMainAxisGroup(
      slivers: [
        SliverToBoxAdapter(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Align(
                alignment: AlignmentDirectional.centerEnd,
                child: DdiroriButton(
                  label: '새 재생목록',
                  icon: Icons.playlist_add,
                  onPressed: widget.busy ? null : widget.onCreate,
                ),
              ),
              const SizedBox(height: 12),
              DdiroriSearch(
                value: query,
                label: '재생목록 검색',
                onChanged: (value) => setState(() => query = value),
              ),
              Align(
                alignment: AlignmentDirectional.centerEnd,
                child: DdiroriMenuButton<PlaylistListSort>(
                  label: '재생목록 정렬',
                  icon: Icons.sort,
                  enabled: !widget.busy,
                  onSelected: widget.onSort,
                  itemBuilder: (context) => [
                    for (final sort in PlaylistListSort.values)
                      CheckedPopupMenuItem(
                        value: sort,
                        checked: sort == widget.sort,
                        child: Text(switch (sort) {
                          PlaylistListSort.createdNewest => '최근 만든 순서',
                          PlaylistListSort.modifiedNewest => '최근 수정한 순서',
                          PlaylistListSort.name => '이름',
                        }),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (widget.playlists.isEmpty)
          const SliverToBoxAdapter(
            child: DdiroriStatePanel(
              title: '재생목록이 없습니다',
              message: '좋아하는 곡을 골라 재생목록을 만들어 보세요.',
            ),
          )
        else if (visible.isEmpty)
          const SliverToBoxAdapter(
            child: DdiroriStatePanel(
              title: '검색 결과가 없습니다',
              message: '다른 재생목록 이름으로 찾아보세요.',
            ),
          )
        else
          _LazyLibraryRows(
            keys: [for (final playlist in visible) playlist.id],
            builder: (context, index) {
              final playlist = visible[index];
              return _LibraryBrowseRow(
                key: ValueKey('playlist-${playlist.id}'),
                title: playlist.name,
                subtitle:
                    '${playlist.fileIds.length}곡${playlist.id == widget.highlightedId ? ' · 방금 만든 재생목록' : ''}',
                leading: PlayArtwork(playlistId: playlist.id, size: 32),
                trailing: Icon(
                  playlist.id == widget.highlightedId
                      ? Icons.check_circle_outline
                      : Icons.chevron_right,
                ),
                onTap: () => widget.onSelect(playlist),
              );
            },
          ),
      ],
    );
  }
}

class _PlaylistDetailPanel extends StatefulWidget implements _LibrarySliver {
  const _PlaylistDetailPanel({
    super.key,
    required this.playlist,
    required this.entriesById,
    required this.busy,
    required this.currentTrackId,
    required this.onPlayAll,
    required this.onPlayFile,
    required this.onAdd,
    required this.onMissing,
    required this.onTrackAction,
    required this.onReorder,
    required this.sort,
    required this.onSort,
    this.onSongAction,
    this.favoriteIds = const {},
    this.onEnqueueAll,
  });

  final LocalPlaylist playlist;
  final Map<String, LocalFileLibraryEntry> entriesById;
  final bool busy;
  final String? currentTrackId;
  final ValueChanged<List<String>> onPlayAll;
  final void Function(LocalFileLibraryEntry, List<String>) onPlayFile;
  final VoidCallback onAdd;
  final VoidCallback onMissing;
  final void Function(String, _PlaylistTrackAction) onTrackAction;
  final Future<bool> Function(List<String>) onReorder;
  final PlaylistTrackSort sort;
  final ValueChanged<PlaylistTrackSort> onSort;
  final void Function(LocalFileLibraryEntry, _SongAction)? onSongAction;
  final Set<String> favoriteIds;
  final void Function(List<String>, bool)? onEnqueueAll;

  @override
  State<_PlaylistDetailPanel> createState() => _PlaylistDetailPanelState();
}

class _PlaylistDetailPanelState extends State<_PlaylistDetailPanel> {
  bool editing = false;
  String query = '';
  late List<String> draftIds = [...widget.playlist.fileIds];

  void startEditing() => setState(() => editing = true);

  @override
  void didUpdateWidget(covariant _PlaylistDetailPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.playlist != widget.playlist) {
      draftIds = [...widget.playlist.fileIds];
    }
  }

  Future<void> _reorder(int oldIndex, int newIndex) async {
    if (widget.busy) return;
    final reordered = [...draftIds];
    reordered.insert(newIndex, reordered.removeAt(oldIndex));
    setState(() => draftIds = reordered);
    final saved = await widget.onReorder(reordered);
    if (!mounted || saved) return;
    setState(() => draftIds = [...widget.playlist.fileIds]);
  }

  @override
  Widget build(BuildContext context) {
    final visibleIds = editing
        ? draftIds
        : const LocalPlaylistBrowseQuery().tracks(
            widget.playlist,
            widget.entriesById,
            query,
            widget.sort,
          );
    final available = visibleIds.any(
      (id) => widget.entriesById[id]?.isAvailable ?? false,
    );
    return SliverMainAxisGroup(
      slivers: [
        SliverToBoxAdapter(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: PlayArtwork(playlistId: widget.playlist.id, size: 80),
              ),
              const SizedBox(height: 12),
              Text(
                '${widget.playlist.fileIds.length}곡 · ${editing || widget.sort == PlaylistTrackSort.manual ? '저장한 순서대로 편집·재생' : '표시한 순서대로 재생'}',
              ),
              if (!editing) ...[
                const SizedBox(height: 12),
                DdiroriSearch(
                  value: query,
                  label: '재생목록 곡 검색',
                  onChanged: (value) => setState(() => query = value),
                ),
                Align(
                  alignment: AlignmentDirectional.centerEnd,
                  child: DdiroriMenuButton<PlaylistTrackSort>(
                    label: '재생목록 곡 정렬',
                    icon: Icons.sort,
                    enabled: !widget.busy,
                    onSelected: widget.onSort,
                    itemBuilder: (context) => [
                      for (final sort in PlaylistTrackSort.values)
                        CheckedPopupMenuItem(
                          value: sort,
                          checked: sort == widget.sort,
                          child: Text(switch (sort) {
                            PlaylistTrackSort.manual => '저장한 순서',
                            PlaylistTrackSort.title => '제목',
                            PlaylistTrackSort.artist => '아티스트',
                            PlaylistTrackSort.album => '앨범',
                          }),
                        ),
                    ],
                  ),
                ),
              ] else
                const Text('저장한 순서 편집 · 보기 정렬과 검색은 적용하지 않습니다.'),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  DdiroriButton(
                    label: '모두 재생',
                    icon: Icons.play_arrow,
                    onPressed: !available || widget.busy || editing
                        ? null
                        : () => widget.onPlayAll(visibleIds),
                  ),
                  DdiroriButton(
                    label: '곡 추가',
                    icon: Icons.playlist_add,
                    kind: DdiroriButtonKind.secondary,
                    onPressed: widget.busy || editing ? null : widget.onAdd,
                  ),
                  if (!editing && widget.onEnqueueAll != null)
                    DdiroriMenuButton<bool>(
                      label: '재생목록 대기열에 추가',
                      enabled: available && !widget.busy,
                      onSelected: (next) =>
                          widget.onEnqueueAll!(visibleIds, next),
                      itemBuilder: (_) => const [
                        PopupMenuItem(value: true, child: Text('바로 다음에 재생')),
                        PopupMenuItem(value: false, child: Text('대기열 마지막에 추가')),
                      ],
                    ),
                  if (editing)
                    DdiroriButton(
                      label: '완료',
                      icon: Icons.done,
                      kind: DdiroriButtonKind.quiet,
                      onPressed: widget.busy
                          ? null
                          : () => setState(() => editing = !editing),
                    ),
                ],
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
        if (draftIds.isEmpty)
          const SliverToBoxAdapter(
            child: DdiroriStatePanel(
              title: '담긴 곡이 없습니다',
              message: '곡 추가를 눌러 보관함의 음악을 선택하세요.',
            ),
          )
        else if (visibleIds.isEmpty)
          const SliverToBoxAdapter(
            child: DdiroriStatePanel(
              title: '검색 결과가 없습니다',
              message: '다른 곡 이름으로 찾아보세요.',
            ),
          )
        else if (editing)
          SliverReorderableList(
            key: ValueKey('playlist-reorder-${widget.playlist.id}'),
            itemCount: draftIds.length,
            onReorderItem: _reorder,
            itemBuilder: (context, index) => KeyedSubtree(
              key: ValueKey('playlist-edit-${draftIds[index]}'),
              child: _trackRow(index),
            ),
          )
        else
          _LazyLibraryRows(
            keys: [for (final id in visibleIds) 'playlist-track-$id'],
            builder: (context, index) => _trackRow(index, ids: visibleIds),
          ),
      ],
    );
  }

  Widget _trackRow(int index, {List<String>? ids}) {
    final ordered = ids ?? draftIds;
    final fileId = ordered[index];
    final entry = widget.entriesById[fileId];
    final canPlay = entry?.isAvailable ?? false;
    return _LibraryBrowseRow(
      key: ValueKey('playlist-track-$fileId'),
      title: entry?.title ?? '보관함에 없는 곡',
      subtitle: entry == null
          ? '파일 정보가 삭제되었습니다 · 재생하지 않음'
          : canPlay
          ? '${index + 1}. ${entry.subtitle}'
          : '${index + 1}. 파일 없음 · 재생하지 않음',
      leading: Icon(
        canPlay ? Icons.music_note_outlined : Icons.warning_amber_outlined,
      ),
      selected:
          widget.currentTrackId == '${LocalFileLibrary.trackPrefix}$fileId',
      onTap: editing
          ? null
          : canPlay
          ? () => widget.onPlayFile(entry!, ordered)
          : widget.onMissing,
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (canPlay && !editing)
            DdiroriIconButton(
              label: '${entry!.title} 재생',
              icon: Icons.play_arrow,
              onPressed: widget.busy
                  ? null
                  : () => widget.onPlayFile(entry, ordered),
            ),
          if (!editing && entry != null && widget.onSongAction != null)
            _SongMenu(
              entry: entry,
              favorite: widget.favoriteIds.contains(fileId),
              busy: widget.busy,
              onAction: (a) => widget.onSongAction!(entry, a),
            ),
          if (editing) ...[
            DdiroriMenuButton<_PlaylistTrackAction>(
              label: '${entry?.title ?? '보관함에 없는 곡'} 순서 및 삭제',
              enabled: !widget.busy,
              onSelected: (action) => widget.onTrackAction(fileId, action),
              itemBuilder: (context) => [
                if (index > 0)
                  const PopupMenuItem(
                    value: _PlaylistTrackAction.up,
                    child: Text('위로 이동'),
                  ),
                if (index + 1 < draftIds.length)
                  const PopupMenuItem(
                    value: _PlaylistTrackAction.down,
                    child: Text('아래로 이동'),
                  ),
                const PopupMenuItem(
                  value: _PlaylistTrackAction.remove,
                  child: Text('재생목록에서 제거'),
                ),
              ],
            ),
            Semantics(
              label: '${entry?.title ?? '보관함에 없는 곡'} 순서 끌어서 변경',
              child: ReorderableDragStartListener(
                index: index,
                child: const SizedBox.square(
                  dimension: 48,
                  child: Icon(Icons.drag_handle),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
