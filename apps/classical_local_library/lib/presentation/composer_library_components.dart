part of '../main.dart';

class _ComposerGroups extends StatelessWidget implements _LibrarySliver {
  const _ComposerGroups({
    required this.entries,
    required this.composer,
    required this.onOpen,
    required this.sort,
    required this.importedAtByFileId,
  });
  final List<LocalFileLibraryEntry> entries;
  final String composer;
  final ValueChanged<String> onOpen;
  final LocalFileSort sort;
  final Map<String, int> importedAtByFileId;
  @override
  Widget build(BuildContext context) {
    final works = <String, List<LocalFileLibraryEntry>>{},
        albums = <String, List<LocalFileLibraryEntry>>{};
    for (final e in entries) {
      if (e.workTitle case final title? when title.isNotEmpty) {
        works.putIfAbsent(title, () => []).add(e);
      }
      albums
          .putIfAbsent(
            const LocalFileLibrary().groupKey(e, LocalFileCategory.albums),
            () => [],
          )
          .add(e);
    }
    final workKeys = const LocalFileLibrary().sortedGroupKeys(
          works,
          sort,
          importedAtByFileId: importedAtByFileId,
        ),
        albumKeys = const LocalFileLibrary().sortedGroupKeys(
          albums,
          sort,
          importedAtByFileId: importedAtByFileId,
        );
    return SliverMainAxisGroup(
      slivers: [
        SliverToBoxAdapter(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                '이 작곡가의 음원만 표시합니다. 작품 정보가 없어도 앨범이나 모든 곡에서 재생할 수 있습니다.',
              ),
              DdiroriButton(
                label: '이 작곡가의 모든 곡',
                kind: DdiroriButtonKind.secondary,
                onPressed: () => onOpen(
                  ComposerTarget(composer, kind: 'all', group: '').encoded,
                ),
              ),
              if (workKeys.isNotEmpty)
                Text('작품', style: Theme.of(context).textTheme.titleMedium),
            ],
          ),
        ),
        _LazyLibraryRows(
          keys: [for (final k in workKeys) 'composer-work-$k'],
          builder: (_, i) {
            final title = workKeys[i];
            return _LibraryBrowseRow(
              title: title,
              subtitle: '${works[title]!.length}곡',
              leading: const Icon(Icons.library_music_outlined),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => onOpen(
                ComposerTarget(composer, kind: 'work', group: title).encoded,
              ),
            );
          },
        ),
        SliverToBoxAdapter(
          child: Text('앨범', style: Theme.of(context).textTheme.titleMedium),
        ),
        _LazyLibraryRows(
          keys: [for (final k in albumKeys) 'composer-album-$k'],
          builder: (_, i) {
            final key = albumKeys[i];
            return _LibraryBrowseRow(
              title: albums[key]!.first.album,
              subtitle: '이 작곡가의 ${albums[key]!.length}곡',
              leading: const Icon(Icons.album_outlined),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => onOpen(
                ComposerTarget(composer, kind: 'album', group: key).encoded,
              ),
            );
          },
        ),
        if (entries.isEmpty)
          const SliverToBoxAdapter(
            child: DdiroriStatePanel(
              title: '검색 결과가 없습니다',
              message: '다른 검색어로 찾아보세요.',
            ),
          ),
      ],
    );
  }
}
