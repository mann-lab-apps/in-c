part of '../main.dart';

/// A visit owns its filter and scroll key; returning restores the same visit.
class _LibraryVisit {
  const _LibraryVisit({
    required this.id,
    required this.view,
    required this.category,
    required this.group,
    required this.query,
    required this.sort,
    required this.search,
    required this.playlistId,
  });

  final int id;
  final _LibraryView view;
  final LocalFileCategory category;
  final String? group;
  final String query;
  final LocalFileSort sort;
  final String search;
  final String? playlistId;
}

enum _PlaylistAction { edit, rename, changeCover, removeCover, delete }

enum _GroupAction { play, next, last, addToPlaylist }

enum _SongAction { play, next, last, favorite, playlist, info }

class _SongMenu extends StatelessWidget {
  const _SongMenu({
    required this.entry,
    required this.favorite,
    required this.onAction,
    this.busy = false,
  });
  final LocalFileLibraryEntry entry;
  final bool favorite, busy;
  final ValueChanged<_SongAction> onAction;
  @override
  Widget build(BuildContext context) => DdiroriMenuButton<_SongAction>(
    label: '${entry.title} 더보기',
    enabled: !busy,
    onSelected: onAction,
    itemBuilder: (context) => [
      for (final action in [
        _SongAction.play,
        _SongAction.next,
        _SongAction.last,
      ])
        PopupMenuItem(
          value: action,
          enabled: entry.isAvailable,
          child: Text(switch (action) {
            _SongAction.play => '지금 재생',
            _SongAction.next => '바로 다음에 재생',
            _ => '대기열 마지막에 추가',
          }),
        ),
      const PopupMenuDivider(),
      PopupMenuItem(
        value: _SongAction.favorite,
        child: Text(favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'),
      ),
      PopupMenuItem(
        value: _SongAction.playlist,
        enabled: entry.isAvailable,
        child: const Text('재생목록에 추가'),
      ),
      const PopupMenuDivider(),
      const PopupMenuItem(value: _SongAction.info, child: Text('곡 정보')),
    ],
  );
}

/// Creation remains a draft until the single repository save succeeds.
class _PlaylistEditor extends StatefulWidget {
  const _PlaylistEditor({
    required this.existing,
    required this.candidates,
    required this.initialIds,
    required this.onSave,
  });

  final LocalPlaylist? existing;
  final List<LocalFileLibraryEntry> candidates;
  final List<String> initialIds;
  final Future<LocalPlaylist?> Function(String, List<String>) onSave;

  @override
  State<_PlaylistEditor> createState() => _PlaylistEditorState();
}

class _PlaylistEditorState extends State<_PlaylistEditor> {
  late String name = widget.existing?.name ?? '';
  late final Set<String> selected = {...widget.initialIds};
  bool saving = false;
  String? error;

  Future<void> _chooseSongs() async {
    await showDdiroriSheet<void>(
      context: context,
      title: '새 재생목록에 담을 곡',
      child: _PlaylistSongPicker(
        candidates: widget.candidates,
        initialIds: selected.toList(),
        allowEmpty: true,
        confirmLabel: '선택 완료',
        onAdd: (ids) async {
          setState(() {
            selected
              ..clear()
              ..addAll(ids);
          });
          return true;
        },
      ),
    );
  }

  Future<void> _save() async {
    if (saving || name.trim().isEmpty) return;
    setState(() {
      saving = true;
      error = null;
    });
    final saved = await widget.onSave(name, selected.toList());
    if (!mounted) return;
    setState(() => saving = false);
    if (saved != null) {
      Navigator.of(context).pop(saved);
    } else {
      setState(() => error = '저장하지 못했습니다. 이름과 선택한 곡을 확인하고 다시 시도해 주세요.');
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !saving,
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        DdiroriInput(
          value: name,
          label: '재생목록 이름',
          enabled: !saving,
          error: error,
          onChanged: (value) => setState(() => name = value),
        ),
        if (widget.existing == null) ...[
          const SizedBox(height: 12),
          Text(
            selected.isEmpty
                ? '곡은 나중에 추가할 수 있습니다.'
                : '${selected.length}곡을 함께 저장합니다.',
          ),
          for (final entry
              in widget.candidates
                  .where((entry) => selected.contains(entry.file.id))
                  .take(3))
            Text(entry.title, maxLines: 2, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 8),
          DdiroriButton(
            label: '곡 선택',
            icon: Icons.playlist_add,
            kind: DdiroriButtonKind.secondary,
            onPressed: saving ? null : _chooseSongs,
          ),
        ],
        const SizedBox(height: 16),
        Wrap(
          alignment: WrapAlignment.end,
          spacing: 8,
          runSpacing: 8,
          children: [
            DdiroriButton(
              label: '취소',
              kind: DdiroriButtonKind.quiet,
              onPressed: saving ? null : () => Navigator.pop(context),
            ),
            DdiroriButton(
              label: '저장',
              busy: saving,
              onPressed: saving || name.trim().isEmpty ? null : _save,
            ),
          ],
        ),
      ],
    ),
  );
}
