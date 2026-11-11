part of '../main.dart';

const _sectionLabels = {
  'songs': '곡',
  'albums': '앨범',
  'artists': '아티스트',
  'playlists': '재생목록',
};

class _LibrarySectionsEditor extends StatefulWidget {
  const _LibrarySectionsEditor({required this.settings, required this.onSave});
  final LibraryViewSettings settings;
  final Future<bool> Function(List<String>, List<String>) onSave;
  @override
  State<_LibrarySectionsEditor> createState() => _LibrarySectionsEditorState();
}

class _LibrarySectionsEditorState extends State<_LibrarySectionsEditor> {
  late final order = [...widget.settings.order];
  late final visible = {...widget.settings.visible};
  bool saving = false;
  bool failed = false;
  void move(int index, int delta) => setState(() {
    final value = order.removeAt(index);
    order.insert(index + delta, value);
  });
  Future<void> save() async {
    if (saving) return;
    setState(() {
      saving = true;
      failed = false;
    });
    final saved = await widget.onSave(
      order,
      order.where(visible.contains).toList(),
    );
    if (!mounted) return;
    setState(() {
      saving = false;
      failed = !saved;
    });
    if (saved) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !saving,
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('표시할 분류를 고르고 순서를 바꾸세요. 음악 파일은 변경되지 않습니다.'),
        for (var i = 0; i < order.length; i++)
          DdiroriItem(
            key: ValueKey('section-editor-${order[i]}'),
            title: _sectionLabels[order[i]]!,
            flat: true,
            selecting: true,
            selected: visible.contains(order[i]),
            enabled: !saving,
            onSelected: (value) => setState(() {
              if (value) {
                visible.add(order[i]);
              } else {
                visible.remove(order[i]);
              }
            }),
            actions: [
              DdiroriIconButton(
                label: '${_sectionLabels[order[i]]} 위로',
                icon: Icons.arrow_upward,
                onPressed: saving || i == 0 ? null : () => move(i, -1),
              ),
              DdiroriIconButton(
                label: '${_sectionLabels[order[i]]} 아래로',
                icon: Icons.arrow_downward,
                onPressed: saving || i + 1 == order.length
                    ? null
                    : () => move(i, 1),
              ),
            ],
          ),
        if (visible.isEmpty) const Text('분류를 모두 숨겨도 보관함 도구에서 다시 표시할 수 있습니다.'),
        if (failed)
          Semantics(
            liveRegion: true,
            child: const Text('저장하지 못했습니다. 선택은 유지되어 있습니다. 다시 시도해 주세요.'),
          ),
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
              onPressed: saving ? null : save,
            ),
          ],
        ),
      ],
    ),
  );
}
