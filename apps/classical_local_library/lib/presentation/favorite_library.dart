part of '../main.dart';

class _FavoriteLibrary extends StatefulWidget {
  const _FavoriteLibrary({
    required this.entries,
    required this.ids,
    required this.busy,
    required this.onPlay,
    required this.onAction,
    required this.onMissing,
    this.title = '즐겨찾기',
    this.emptyTitle = '즐겨찾는 곡을 모아보세요',
    this.emptyMessage = '곡의 더보기 또는 현재 재생에서 즐겨찾기를 추가할 수 있습니다.',
    this.error,
    this.onRetry,
    this.favoriteIds,
  });
  final List<LocalFileLibraryEntry> entries;
  final Set<String> ids;
  final Set<String>? favoriteIds;
  final bool busy;
  final void Function(LocalFileLibraryEntry, List<LocalFileLibraryEntry>)
  onPlay;
  final void Function(LocalFileLibraryEntry, _SongAction) onAction;
  final VoidCallback onMissing;
  final String title, emptyTitle, emptyMessage;
  final String? error;
  final VoidCallback? onRetry;
  @override
  State<_FavoriteLibrary> createState() => _FavoriteLibraryState();
}

class _FavoriteLibraryState extends State<_FavoriteLibrary> {
  String query = '';
  LocalFileSort sort = LocalFileSort.title;
  @override
  Widget build(BuildContext context) {
    final entries = widget.entries
        .where((e) => widget.ids.contains(e.file.id))
        .toList();
    final visible = const LocalFileLibrary().sort(
      const LocalFileLibrary().search(entries, query),
      sort,
    );
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: PlayPlaybackLayout(
        child: SafeArea(
          child: CustomScrollView(
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.all(16),
                sliver: SliverToBoxAdapter(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _FileBrowseToolbar(
                        query: query,
                        sort: sort,
                        showTrackOrder: false,
                        onQueryChanged: (q) => setState(() => query = q),
                        onSortChanged: (s) => setState(() => sort = s),
                      ),
                      if (widget.error case final error?)
                        DdiroriBanner(
                          message: error,
                          kind: DdiroriNoticeKind.error,
                          action: DdiroriButton(
                            label: '즐겨찾기 다시 불러오기',
                            kind: DdiroriButtonKind.quiet,
                            onPressed: widget.busy ? null : widget.onRetry,
                          ),
                        ),
                      if (entries.isEmpty && widget.error == null)
                        DdiroriStatePanel(
                          title: widget.emptyTitle,
                          message: widget.emptyMessage,
                        ),
                      if (entries.isNotEmpty && visible.isEmpty)
                        const DdiroriStatePanel(
                          title: '검색 결과가 없습니다',
                          message: '다른 검색어로 찾아보세요.',
                        ),
                    ],
                  ),
                ),
              ),
              SliverList.builder(
                itemCount: visible.length,
                itemBuilder: (context, i) => _FileSongRow(
                  entry: visible[i],
                  favorite: (widget.favoriteIds ?? widget.ids).contains(
                    visible[i].file.id,
                  ),
                  busy: widget.busy,
                  onTap: () => widget.onPlay(visible[i], visible),
                  onMissing: widget.onMissing,
                  onAction: (a) => widget.onAction(visible[i], a),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
