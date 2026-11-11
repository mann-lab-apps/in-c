part of '../main.dart';

class _PlayLibraryHeader extends StatelessWidget {
  const _PlayLibraryHeader();

  @override
  Widget build(BuildContext context) => Semantics(
    header: true,
    child: Text('보관함', style: Theme.of(context).textTheme.displaySmall),
  );
}

class _FileBrowseToolbar extends StatelessWidget {
  const _FileBrowseToolbar({
    required this.query,
    required this.sort,
    required this.showTrackOrder,
    required this.onQueryChanged,
    required this.onSortChanged,
    this.grouped = false,
  });

  final String query;
  final LocalFileSort sort;
  final bool showTrackOrder;
  final ValueChanged<String> onQueryChanged;
  final ValueChanged<LocalFileSort> onSortChanged;
  final bool grouped;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      DdiroriSearch(
        value: query,
        label: '이 목록에서 검색',
        onChanged: onQueryChanged,
      ),
      Align(
        alignment: AlignmentDirectional.centerEnd,
        child: DdiroriMenuButton<LocalFileSort>(
          label: grouped ? '목록 정렬' : '곡 정렬',
          icon: Icons.sort,
          onSelected: onSortChanged,
          itemBuilder: (context) => [
            for (final option in LocalFileSort.values)
              if ((option != LocalFileSort.trackOrder || showTrackOrder) &&
                  (!grouped ||
                      option == LocalFileSort.title ||
                      option == LocalFileSort.dateAdded))
                PopupMenuItem(
                  value: option,
                  child: Row(
                    children: [
                      Icon(option == sort ? Icons.check : Icons.sort, size: 20),
                      const SizedBox(width: 8),
                      Text(switch (option) {
                        LocalFileSort.title => '제목',
                        LocalFileSort.artist => '아티스트',
                        LocalFileSort.album => '앨범',
                        LocalFileSort.dateAdded => '추가한 날짜',
                        LocalFileSort.trackOrder => '트랙 순서',
                      }),
                    ],
                  ),
                ),
          ],
        ),
      ),
    ],
  );
}

class _ImportResultPanel extends StatelessWidget {
  const _ImportResultPanel({
    required this.items,
    required this.busy,
    required this.onOrganize,
    required this.onRetryFailed,
    required this.onRetryAnalysis,
  });

  final List<LocalImportFeedbackItem> items;
  final bool busy;
  final ValueChanged<LocalAudioFile> onOrganize;
  final VoidCallback onRetryFailed;
  final VoidCallback onRetryAnalysis;

  @override
  Widget build(BuildContext context) {
    final failed = items.where((item) => item.canRetry).length;
    final pending = items.any(
      (item) => item.result.outcome == LocalAudioImportOutcome.pending,
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('가져오기 결과', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        for (final item in items)
          DdiroriItem(
            flat: true,
            title: item.fileName,
            subtitle: '${item.status} · ${item.detail}',
            leading: Icon(switch (item.result.outcome) {
              LocalAudioImportOutcome.imported => Icons.check_circle_outline,
              LocalAudioImportOutcome.duplicate => Icons.content_copy_outlined,
              LocalAudioImportOutcome.pending => Icons.hourglass_top_outlined,
              LocalAudioImportOutcome.failed => Icons.error_outline,
              LocalAudioImportOutcome.cancelled => Icons.cancel_outlined,
            }),
            actions: [
              if (item.canOrganize)
                DdiroriIconButton(
                  label: '${item.fileName} 작품과 녹음으로 정리',
                  icon: Icons.playlist_add_check_outlined,
                  onPressed: busy ? null : () => onOrganize(item.file!),
                ),
            ],
          ),
        if (failed > 0 || pending) ...[
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (failed > 0)
                DdiroriButton(
                  label: '실패한 파일 다시 시도',
                  icon: Icons.refresh_outlined,
                  kind: DdiroriButtonKind.secondary,
                  onPressed: busy ? null : onRetryFailed,
                ),
              if (pending)
                DdiroriButton(
                  label: '분석 다시 시도',
                  icon: Icons.refresh_outlined,
                  kind: DdiroriButtonKind.secondary,
                  onPressed: busy ? null : onRetryAnalysis,
                ),
            ],
          ),
        ],
      ],
    );
  }
}

class _FileCategoryList extends StatelessWidget {
  const _FileCategoryList({
    required this.entries,
    required this.onCategorySelected,
    required this.onPlaylistsSelected,
    required this.order,
    required this.visible,
    required this.onEdit,
  });

  final List<LocalFileLibraryEntry> entries;
  final ValueChanged<LocalFileCategory> onCategorySelected;
  final VoidCallback onPlaylistsSelected;
  final List<String> order;
  final List<String> visible;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    const categories = {
      'songs': (LocalFileCategory.songs, '곡', Icons.music_note_outlined),
      'albums': (LocalFileCategory.albums, '앨범', Icons.album_outlined),
      'artists': (LocalFileCategory.artists, '아티스트', Icons.person_outline),
    };
    return Column(
      children: [
        if (visible.isEmpty)
          DdiroriStatePanel(
            title: '보관함 분류가 숨겨져 있습니다',
            message: '음악은 그대로 보관되어 있습니다.',
            action: DdiroriButton(label: '분류 편집', onPressed: onEdit),
          ),
        for (final id in order.where(visible.contains))
          if (id != 'playlists')
            _LibraryBrowseRow(
              key: ValueKey('file-category-$id'),
              leading: Icon(categories[id]!.$3, size: 24),
              title: categories[id]!.$2,
              trailing: const Icon(Icons.chevron_right),
              onTap: () => onCategorySelected(categories[id]!.$1),
            )
          else
            _LibraryBrowseRow(
              key: const ValueKey('file-category-playlists'),
              leading: const Icon(Icons.queue_music_outlined, size: 24),
              title: '재생목록',
              trailing: const Icon(Icons.chevron_right),
              onTap: onPlaylistsSelected,
            ),
      ],
    );
  }
}

class _RecentFileSection extends StatelessWidget {
  const _RecentFileSection({
    required this.items,
    required this.onAll,
    required this.onSelected,
  });

  final List<LocalFileRecentItem> items;
  final VoidCallback onAll;
  final ValueChanged<LocalFileRecentItem> onSelected;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Row(
        children: [
          Expanded(
            child: Semantics(
              header: true,
              child: Text(
                '최근 추가한 음악',
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
          ),
          DdiroriIconButton(
            label: '최근 추가한 음악 모두 보기',
            icon: Icons.arrow_forward,
            onPressed: onAll,
          ),
        ],
      ),
      const SizedBox(height: 12),
      LayoutBuilder(
        builder: (context, constraints) {
          final columns = constraints.maxWidth >= 900
              ? 4
              : constraints.maxWidth >= 600
              ? 3
              : 2;
          final itemWidth =
              (constraints.maxWidth - 12 * (columns - 1)) / columns;
          return Wrap(
            spacing: 12,
            runSpacing: 20,
            children: [
              for (final item in items)
                SizedBox(
                  width: itemWidth,
                  child: _RecentFileTile(
                    item: item,
                    onTap: () => onSelected(item),
                  ),
                ),
            ],
          );
        },
      ),
    ],
  );
}

class _RecentFileTile extends StatelessWidget {
  const _RecentFileTile({required this.item, required this.onTap});

  final LocalFileRecentItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: '${item.title}, ${item.subtitle}${item.isAlbum ? ', 앨범' : ', 곡'}',
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(DdiroriTokens.radius['card']!),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AspectRatio(
            aspectRatio: 1,
            child: !item.representative.isAvailable
                ? const _LocalArtwork(missing: true)
                : PlayArtwork(file: item.representative.file, size: null),
          ),
          const SizedBox(height: 8),
          Text(
            item.title,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.titleSmall,
          ),
          Text(
            item.isAlbum && item.entries.length > 1
                ? '${item.subtitle} · ${item.entries.length}곡'
                : item.subtitle,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    ),
  );
}

class _LocalArtwork extends StatelessWidget {
  const _LocalArtwork({this.missing = false});

  final bool missing;

  @override
  Widget build(BuildContext context) {
    final c = DdiroriStyle.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: c['surfaceMuted'],
        borderRadius: BorderRadius.circular(DdiroriTokens.radius['card']!),
      ),
      child: Center(
        child: Icon(
          missing ? Icons.warning_amber_outlined : Icons.music_note_outlined,
          color: c['muted'],
          size: 32,
        ),
      ),
    );
  }
}

class _LibraryBrowseRow extends StatelessWidget {
  const _LibraryBrowseRow({
    super.key,
    required this.title,
    required this.leading,
    required this.trailing,
    required this.onTap,
    this.subtitle,
    this.selected = false,
  });

  final String title;
  final String? subtitle;
  final Widget leading;
  final Widget trailing;
  final VoidCallback? onTap;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final c = DdiroriStyle.of(context);
    return Material(
      color: selected ? c['selection'] : c['surface'],
      child: InkWell(
        onTap: onTap,
        child: Container(
          constraints: const BoxConstraints(minHeight: 56),
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: c['border'])),
          ),
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            children: [
              SizedBox(width: 36, child: leading),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(title, style: Theme.of(context).textTheme.bodyLarge),
                    if (subtitle != null)
                      Text(
                        subtitle!,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall
                            ?.copyWith(color: c['muted']),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              trailing,
            ],
          ),
        ),
      ),
    );
  }
}

class _FileSongRow extends StatelessWidget {
  const _FileSongRow({
    required this.entry,
    required this.onTap,
    required this.onMissing,
    this.current = false,
    this.onAddToPlaylist,
    this.favorite = false,
    this.busy = false,
    this.onAction,
  });

  final LocalFileLibraryEntry entry;
  final VoidCallback onTap;
  final VoidCallback onMissing;
  final bool current;
  final VoidCallback? onAddToPlaylist;
  final bool favorite, busy;
  final ValueChanged<_SongAction>? onAction;

  @override
  Widget build(BuildContext context) {
    final filename = entry.file.fileName;
    final detail =
        '${entry.subtitle}'
        '${filename == null || filename == entry.title ? '' : ' · $filename'}';
    return _LibraryBrowseRow(
      title: entry.title,
      subtitle:
          '${favorite ? '즐겨찾기 · ' : ''}${entry.isAvailable ? detail : '$detail · 파일 없음'}',
      leading: SizedBox(
        width: 36,
        height: 36,
        child: entry.isAvailable
            ? PlayArtwork(file: entry.file, size: 36)
            : const _LocalArtwork(missing: true),
      ),
      selected: current,
      onTap: entry.isAvailable ? onTap : onMissing,
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          DdiroriIconButton(
            label: entry.isAvailable
                ? '${entry.title} 재생'
                : '${entry.title} 파일 상태 확인',
            icon: entry.isAvailable
                ? Icons.play_arrow
                : Icons.rule_folder_outlined,
            onPressed: entry.isAvailable ? onTap : onMissing,
          ),
          if (onAction != null)
            _SongMenu(
              entry: entry,
              favorite: favorite,
              busy: busy,
              onAction: onAction!,
            )
          else if (entry.isAvailable && onAddToPlaylist != null)
            DdiroriMenuButton<String>(
              label: '${entry.title} 더보기',
              onSelected: (_) => onAddToPlaylist!(),
              itemBuilder: (context) => const [
                PopupMenuItem(
                  value: 'add-to-playlist',
                  child: Text('재생목록에 추가'),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _FileGroupRow extends StatelessWidget {
  const _FileGroupRow({
    required this.title,
    required this.icon,
    this.subtitle,
    required this.count,
    required this.onTap,
    this.onAddToPlaylist,
    this.file,
    this.onEnqueue,
    this.onPlay,
  });

  final String title;
  final IconData icon;
  final String? subtitle;
  final int count;
  final VoidCallback onTap;
  final VoidCallback? onAddToPlaylist;
  final LocalAudioFile? file;
  final ValueChanged<bool>? onEnqueue;
  final VoidCallback? onPlay;

  @override
  Widget build(BuildContext context) => _LibraryBrowseRow(
    title: title,
    subtitle: subtitle == null ? '$count곡' : '$subtitle · $count곡',
    leading: file == null ? Icon(icon) : PlayArtwork(file: file, size: 32),
    trailing: onAddToPlaylist == null
        ? const Icon(Icons.chevron_right)
        : Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              DdiroriMenuButton<String>(
                label: '$title 더보기',
                onSelected: (a) {
                  if (a == 'play') {
                    onPlay?.call();
                  } else if (a == 'next' || a == 'last') {
                    onEnqueue?.call(a == 'next');
                  } else {
                    onAddToPlaylist!();
                  }
                },
                itemBuilder: (context) => [
                  if (onPlay != null)
                    const PopupMenuItem(value: 'play', child: Text('지금 재생')),
                  if (onEnqueue != null) ...const [
                    PopupMenuItem(value: 'next', child: Text('바로 다음에 재생')),
                    PopupMenuItem(value: 'last', child: Text('대기열 마지막에 추가')),
                  ],
                  const PopupMenuItem(
                    value: 'add-to-playlist',
                    child: Text('재생목록에 추가'),
                  ),
                ],
              ),
              const Icon(Icons.chevron_right),
            ],
          ),
    onTap: onTap,
  );
}
