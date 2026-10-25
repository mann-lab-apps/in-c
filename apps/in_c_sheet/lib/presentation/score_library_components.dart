import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';

/// App presentation data. File availability stays with the viewer/controller;
/// a row does not stat the filesystem or claim a cached path is readable.
class ScoreLibraryEntry {
  const ScoreLibraryEntry({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.details,
    required this.favorite,
    required this.pinned,
  });
  final String id, title, subtitle, details;
  final bool favorite, pinned;
}

enum ScoreLibraryAction { edit, share }

class ScoreLibraryRow extends StatelessWidget {
  const ScoreLibraryRow({
    super.key,
    required this.entry,
    required this.selecting,
    required this.selected,
    required this.onOpen,
    required this.onSelect,
    required this.onFavorite,
    required this.onPin,
    required this.onAction,
  });
  final ScoreLibraryEntry entry;
  final bool selecting, selected;
  final VoidCallback onOpen, onSelect, onFavorite, onPin;
  final ValueChanged<ScoreLibraryAction> onAction;
  @override
  Widget build(BuildContext context) => DdiroriItem(
    title: entry.title,
    subtitle: [
      entry.subtitle,
      entry.details,
    ].where((s) => s.isNotEmpty).join('\n'),
    flat: true,
    selected: selected,
    selecting: selecting,
    leading: const Icon(Icons.description_outlined, size: 24),
    // Preserve the product's selection-mode behavior; normal mode opens.
    onTap: selecting ? onSelect : onOpen,
    onSelected: (_) => onSelect(),
    actions: selecting
        ? const []
        : [
            DdiroriIconButton(
              label: entry.favorite ? '즐겨찾기 해제' : '즐겨찾기',
              icon: entry.favorite ? Icons.star : Icons.star_border,
              onPressed: onFavorite,
            ),
            DdiroriIconButton(
              label: entry.pinned ? '고정 해제' : '고정',
              icon: entry.pinned ? Icons.push_pin : Icons.push_pin_outlined,
              onPressed: onPin,
            ),
            DdiroriMenuButton<ScoreLibraryAction>(
              label: '더보기',
              onSelected: onAction,
              itemBuilder: (_) => const [
                PopupMenuItem(
                  value: ScoreLibraryAction.edit,
                  child: Text('악보 정보 편집'),
                ),
                PopupMenuItem(
                  value: ScoreLibraryAction.share,
                  child: Text('PDF 공유'),
                ),
              ],
            ),
          ],
  );
}

/// Lazy rows, including a two-column layout whose height follows its content.
/// Large text uses a single column rather than stretching a fixed grid tile.
class ScoreLibraryCollection extends StatelessWidget {
  const ScoreLibraryCollection({
    super.key,
    required this.entries,
    required this.wide,
    required this.selecting,
    required this.selectedIds,
    required this.onOpen,
    required this.onSelect,
    required this.onFavorite,
    required this.onPin,
    required this.onAction,
  });
  final List<ScoreLibraryEntry> entries;
  final bool wide, selecting;
  final Set<String> selectedIds;
  final ValueChanged<String> onOpen, onSelect, onFavorite, onPin;
  final void Function(String, ScoreLibraryAction) onAction;
  @override
  Widget build(BuildContext context) {
    final columns = wide && MediaQuery.textScalerOf(context).scale(16) <= 20
        ? 2
        : 1;
    Widget tile(ScoreLibraryEntry e) => ScoreLibraryRow(
      key: ValueKey('score-${e.id}'),
      entry: e,
      selecting: selecting,
      selected: selectedIds.contains(e.id),
      onOpen: () => onOpen(e.id),
      onSelect: () => onSelect(e.id),
      onFavorite: () => onFavorite(e.id),
      onPin: () => onPin(e.id),
      onAction: (a) => onAction(e.id, a),
    );
    return ListView.separated(
      itemCount: (entries.length / columns).ceil(),
      separatorBuilder: (_, _) =>
          Divider(height: 1, color: DdiroriStyle.of(context)['border']),
      itemBuilder: (_, index) {
        final first = index * columns;
        if (columns == 1) return tile(entries[first]);
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: tile(entries[first])),
            SizedBox(width: DdiroriTokens.layout['itemGap']),
            Expanded(
              child: first + 1 < entries.length
                  ? tile(entries[first + 1])
                  : const SizedBox(),
            ),
          ],
        );
      },
    );
  }
}

class ScoreLibraryControls extends StatelessWidget {
  const ScoreLibraryControls({
    super.key,
    required this.sortLabel,
    required this.favoriteOnly,
    required this.onSort,
    required this.onFavorite,
    required this.filters,
  });
  final String sortLabel;
  final bool favoriteOnly;
  final VoidCallback onSort;
  final ValueChanged<bool> onFavorite;
  final List<({String label, bool active, VoidCallback onPressed})> filters;
  @override
  Widget build(BuildContext context) => Wrap(
    spacing: DdiroriTokens.spacing['sm']!,
    runSpacing: DdiroriTokens.spacing['sm']!,
    children: [
      DdiroriButton(
        label: '정렬: $sortLabel',
        kind: DdiroriButtonKind.quiet,
        icon: Icons.sort,
        onPressed: onSort,
      ),
      DdiroriButton(
        label: '즐겨찾기',
        icon: Icons.star_outline,
        kind: DdiroriButtonKind.quiet,
        selected: favoriteOnly,
        onPressed: () => onFavorite(!favoriteOnly),
      ),
      DdiroriButton(
        label: filters.any((f) => f.active)
            ? '필터 · ${filters.where((f) => f.active).length}개 적용'
            : '필터',
        kind: DdiroriButtonKind.quiet,
        icon: Icons.tune,
        selected: filters.any((f) => f.active),
        onPressed: () => showDdiroriSheet<void>(
          context: context,
          title: '악보 필터',
          child: DdiroriStack(
            children: [
              for (final f in filters)
                DdiroriButton(
                  label: f.label,
                  kind: DdiroriButtonKind.quiet,
                  selected: f.active,
                  onPressed: () {
                    Navigator.of(context).pop();
                    f.onPressed();
                  },
                ),
            ],
          ),
        ),
      ),
    ],
  );
}

class ScoreQuickAccess extends StatefulWidget {
  const ScoreQuickAccess({
    super.key,
    required this.groups,
    required this.onOpen,
  });
  final List<({String label, List<ScoreLibraryEntry> entries})> groups;
  final ValueChanged<String> onOpen;
  @override
  State<ScoreQuickAccess> createState() => _ScoreQuickAccessState();
}

class _ScoreQuickAccessState extends State<ScoreQuickAccess> {
  bool _open = false;
  @override
  Widget build(BuildContext context) => DdiroriAccordion(
    title: '빠른 접근',
    open: _open,
    onChanged: (v) => setState(() => _open = v),
    child: DdiroriStack(
      children: [
        for (final group in widget.groups.where((g) => g.entries.isNotEmpty))
          DdiroriStack(
            children: [
              Semantics(
                header: true,
                child: Text(
                  group.label,
                  style: ddiroriTextStyle(DdiroriTextRole.label),
                ),
              ),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final e in group.entries)
                    DdiroriButton(
                      label: e.title,
                      kind: DdiroriButtonKind.quiet,
                      onPressed: () => widget.onOpen(e.id),
                    ),
                ],
              ),
            ],
          ),
      ],
    ),
  );
}
