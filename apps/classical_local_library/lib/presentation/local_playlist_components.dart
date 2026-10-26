part of '../main.dart';

enum _PlaylistTrackAction { up, down, remove }

class _PlaylistSongPicker extends StatefulWidget {
  const _PlaylistSongPicker({required this.candidates, required this.onAdd});

  final List<LocalFileLibraryEntry> candidates;
  final Future<bool> Function(List<String>) onAdd;

  @override
  State<_PlaylistSongPicker> createState() => _PlaylistSongPickerState();
}

class _PlaylistSongPickerState extends State<_PlaylistSongPicker> {
  String query = '';
  final selectedIds = <String>{};
  bool saving = false;

  Future<void> _save() async {
    if (saving || selectedIds.isEmpty) return;
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
    return SizedBox(
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
            label: '${selectedIds.length}곡 추가',
            icon: Icons.playlist_add,
            busy: saving,
            onPressed: selectedIds.isEmpty || saving ? null : _save,
          ),
        ],
      ),
    );
  }
}

class _PlaylistListPanel extends StatelessWidget {
  const _PlaylistListPanel({
    required this.playlists,
    required this.busy,
    required this.onCreate,
    required this.onSelect,
  });

  final List<LocalPlaylist> playlists;
  final bool busy;
  final VoidCallback onCreate;
  final ValueChanged<LocalPlaylist> onSelect;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Align(
        alignment: AlignmentDirectional.centerEnd,
        child: DdiroriButton(
          label: '새 재생목록',
          icon: Icons.playlist_add,
          onPressed: busy ? null : onCreate,
        ),
      ),
      const SizedBox(height: 12),
      if (playlists.isEmpty)
        const DdiroriStatePanel(
          title: '재생목록이 없습니다',
          message: '좋아하는 곡을 골라 재생목록을 만들어 보세요.',
        )
      else
        for (final playlist in playlists)
          _LibraryBrowseRow(
            key: ValueKey('playlist-${playlist.id}'),
            title: playlist.name,
            subtitle: '${playlist.fileIds.length}곡',
            leading: const Icon(Icons.queue_music_outlined),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => onSelect(playlist),
          ),
    ],
  );
}

class _PlaylistDetailPanel extends StatefulWidget {
  const _PlaylistDetailPanel({
    required this.playlist,
    required this.entriesById,
    required this.busy,
    required this.currentTrackId,
    required this.onPlayAll,
    required this.onPlayFile,
    required this.onAdd,
    required this.onRename,
    required this.onDelete,
    required this.onMissing,
    required this.onTrackAction,
    required this.onReorder,
  });

  final LocalPlaylist playlist;
  final Map<String, LocalFileLibraryEntry> entriesById;
  final bool busy;
  final String? currentTrackId;
  final VoidCallback onPlayAll;
  final ValueChanged<LocalFileLibraryEntry> onPlayFile;
  final VoidCallback onAdd;
  final VoidCallback onRename;
  final VoidCallback onDelete;
  final VoidCallback onMissing;
  final void Function(String, _PlaylistTrackAction) onTrackAction;
  final Future<bool> Function(List<String>) onReorder;

  @override
  State<_PlaylistDetailPanel> createState() => _PlaylistDetailPanelState();
}

class _PlaylistDetailPanelState extends State<_PlaylistDetailPanel> {
  bool editing = false;
  late List<String> draftIds = [...widget.playlist.fileIds];

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
    final available = widget.playlist.fileIds.any(
      (id) => widget.entriesById[id]?.isAvailable ?? false,
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('${widget.playlist.fileIds.length}곡 · 저장한 순서대로 재생'),
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
                  : widget.onPlayAll,
            ),
            DdiroriButton(
              label: '곡 추가',
              icon: Icons.playlist_add,
              kind: DdiroriButtonKind.secondary,
              onPressed: widget.busy || editing ? null : widget.onAdd,
            ),
            DdiroriButton(
              label: editing ? '완료' : '편집',
              icon: editing ? Icons.done : Icons.edit_outlined,
              kind: DdiroriButtonKind.quiet,
              onPressed: widget.busy
                  ? null
                  : () => setState(() => editing = !editing),
            ),
            DdiroriIconButton(
              label: '재생목록 이름 변경',
              icon: Icons.edit_outlined,
              onPressed: widget.busy ? null : widget.onRename,
            ),
            DdiroriIconButton(
              label: '재생목록 삭제',
              icon: Icons.delete_outline,
              onPressed: widget.busy ? null : widget.onDelete,
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (draftIds.isEmpty)
          const DdiroriStatePanel(
            title: '담긴 곡이 없습니다',
            message: '곡 추가를 눌러 보관함의 음악을 선택하세요.',
          )
        else if (editing)
          ReorderableListView.builder(
            key: ValueKey('playlist-reorder-${widget.playlist.id}'),
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            buildDefaultDragHandles: false,
            itemCount: draftIds.length,
            onReorderItem: _reorder,
            itemBuilder: (context, index) => KeyedSubtree(
              key: ValueKey('playlist-edit-${draftIds[index]}'),
              child: _trackRow(index),
            ),
          )
        else
          for (var index = 0; index < draftIds.length; index++)
            _trackRow(index),
      ],
    );
  }

  Widget _trackRow(int index) {
    final fileId = draftIds[index];
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
          ? () => widget.onPlayFile(entry!)
          : widget.onMissing,
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (canPlay && !editing)
            DdiroriIconButton(
              label: '${entry!.title} 재생',
              icon: Icons.play_arrow,
              onPressed: widget.busy ? null : () => widget.onPlayFile(entry),
            ),
          if (editing) ...[
            PopupMenuButton<_PlaylistTrackAction>(
              tooltip: '${entry?.title ?? '보관함에 없는 곡'} 순서 및 삭제',
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
