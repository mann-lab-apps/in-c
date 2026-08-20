import 'package:flutter/material.dart';
import 'package:pdfrx/pdfrx.dart';

import 'pdf_link_policy.dart';
import 'sheet_library_controller.dart';
import 'sheet_library_store.dart';
import 'sheet_score.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  pdfrxFlutterInitialize();

  final controller = SheetLibraryController(store: SheetLibraryStore());
  await controller.load();

  runApp(InCSheetApp(controller: controller));
}

class InCSheetApp extends StatelessWidget {
  const InCSheetApp({required this.controller, super.key});

  final SheetLibraryController controller;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'in C - Sheet',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xff2f6f73),
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xfffbfbf7),
        useMaterial3: true,
      ),
      home: SheetLibraryScreen(controller: controller),
    );
  }
}

class SheetLibraryScreen extends StatefulWidget {
  const SheetLibraryScreen({required this.controller, super.key});

  final SheetLibraryController controller;

  @override
  State<SheetLibraryScreen> createState() => _SheetLibraryScreenState();
}

class _SheetLibraryScreenState extends State<SheetLibraryScreen> {
  SheetLibraryController get controller => widget.controller;

  @override
  void initState() {
    super.initState();
    controller.addListener(_handleControllerChanged);
  }

  @override
  void dispose() {
    controller.removeListener(_handleControllerChanged);
    super.dispose();
  }

  void _handleControllerChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _importPdf() async {
    final score = await controller.importPdf();
    if (!mounted || score == null) {
      return;
    }
    await _openScore(score);
  }

  Future<void> _openScore(SheetScore score) async {
    await controller.markOpened(score);
    if (!mounted) {
      return;
    }

    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (context) =>
            SheetViewerScreen(controller: controller, scoreId: score.id),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final scores = controller.filteredScores;

    return Scaffold(
      appBar: AppBar(
        title: const Text('in C - Sheet'),
        actions: [
          IconButton(
            tooltip: 'PDF 가져오기',
            onPressed: controller.isImporting ? null : _importPdf,
            icon: controller.isImporting
                ? const SizedBox.square(
                    dimension: 20,
                    child: CircularProgressIndicator(strokeWidth: 2.5),
                  )
                : const Icon(Icons.picture_as_pdf_outlined),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: controller.isImporting ? null : _importPdf,
        icon: const Icon(Icons.add),
        label: const Text('PDF 추가'),
      ),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth >= 720;
            return Center(
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: isWide ? 1120 : 640),
                child: Padding(
                  padding: EdgeInsets.fromLTRB(
                    isWide ? 28 : 16,
                    12,
                    isWide ? 28 : 16,
                    96,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _SearchField(
                        query: controller.query,
                        onChanged: controller.updateQuery,
                      ),
                      const SizedBox(height: 14),
                      if (controller.errorMessage != null)
                        _NoticeBanner(message: controller.errorMessage!),
                      if (controller.errorMessage != null)
                        const SizedBox(height: 12),
                      Expanded(
                        child: controller.isLoading
                            ? const Center(child: CircularProgressIndicator())
                            : scores.isEmpty
                            ? _EmptyLibrary(
                                hasQuery: controller.query.isNotEmpty,
                              )
                            : _ScoreGrid(
                                scores: scores,
                                isWide: isWide,
                                onOpen: _openScore,
                                onFavorite: controller.toggleFavorite,
                              ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField({required this.query, required this.onChanged});

  final String query;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return TextField(
      onChanged: onChanged,
      decoration: InputDecoration(
        hintText: '제목, 작곡가, 태그 검색',
        prefixIcon: const Icon(Icons.search),
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: Colors.black.withValues(alpha: 0.12)),
        ),
      ),
    );
  }
}

class _NoticeBanner extends StatelessWidget {
  const _NoticeBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: const Color(0xfffff0e8),
        border: Border.all(color: const Color(0xffe7b599)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Text(
          message,
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
    );
  }
}

class _EmptyLibrary extends StatelessWidget {
  const _EmptyLibrary({required this.hasQuery});

  final bool hasQuery;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 360),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              hasQuery ? Icons.search_off : Icons.library_music_outlined,
              size: 58,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: 18),
            Text(
              hasQuery ? '검색 결과가 없습니다.' : 'PDF 악보를 추가해 라이브러리를 시작하세요.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.w900),
            ),
          ],
        ),
      ),
    );
  }
}

class _ScoreGrid extends StatelessWidget {
  const _ScoreGrid({
    required this.scores,
    required this.isWide,
    required this.onOpen,
    required this.onFavorite,
  });

  final List<SheetScore> scores;
  final bool isWide;
  final ValueChanged<SheetScore> onOpen;
  final ValueChanged<SheetScore> onFavorite;

  @override
  Widget build(BuildContext context) {
    if (!isWide) {
      return ListView.separated(
        itemBuilder: (context, index) => _ScoreTile(
          score: scores[index],
          onOpen: onOpen,
          onFavorite: onFavorite,
        ),
        separatorBuilder: (context, index) => const SizedBox(height: 10),
        itemCount: scores.length,
      );
    }

    return GridView.builder(
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 340,
        mainAxisExtent: 150,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemBuilder: (context, index) => _ScoreTile(
        score: scores[index],
        onOpen: onOpen,
        onFavorite: onFavorite,
      ),
      itemCount: scores.length,
    );
  }
}

class _ScoreTile extends StatelessWidget {
  const _ScoreTile({
    required this.score,
    required this.onOpen,
    required this.onFavorite,
  });

  final SheetScore score;
  final ValueChanged<SheetScore> onOpen;
  final ValueChanged<SheetScore> onFavorite;

  @override
  Widget build(BuildContext context) {
    final tags = score.tags.isEmpty ? '태그 없음' : score.tags.join(', ');
    final lastOpened = score.lastOpenedAt == null
        ? '아직 열지 않음'
        : '최근 ${_formatDate(score.lastOpenedAt!)}';

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(8),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => onOpen(score),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.description_outlined),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      score.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: score.isFavorite ? '즐겨찾기 해제' : '즐겨찾기',
                    onPressed: () => onFavorite(score),
                    icon: Icon(
                      score.isFavorite ? Icons.star : Icons.star_border,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                score.composer.isEmpty ? '작곡가 미입력' : score.composer,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const Spacer(),
              Text(
                '$tags · $lastOpened · ${score.lastPage}쪽',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime value) {
    final hour = value.hour.toString().padLeft(2, '0');
    final minute = value.minute.toString().padLeft(2, '0');
    return '${value.month}/${value.day} $hour:$minute';
  }
}

class SheetViewerScreen extends StatefulWidget {
  const SheetViewerScreen({
    required this.controller,
    required this.scoreId,
    super.key,
  });

  final SheetLibraryController controller;
  final String scoreId;

  @override
  State<SheetViewerScreen> createState() => _SheetViewerScreenState();
}

class _SheetViewerScreenState extends State<SheetViewerScreen> {
  late final PdfViewerController _pdfController;
  int? _pageNumber;
  int? _pageCount;
  bool _showPdfLinks = false;

  SheetScore get score => widget.controller.scoreById(widget.scoreId);

  @override
  void initState() {
    super.initState();
    _pdfController = PdfViewerController();
    _pageNumber = score.lastPage;
    _pdfController.addListener(_handleViewerChanged);
  }

  @override
  void dispose() {
    _pdfController.removeListener(_handleViewerChanged);
    super.dispose();
  }

  void _handleViewerChanged() {
    if (!_pdfController.isReady || !mounted) {
      return;
    }

    final nextPage = _pdfController.pageNumber;
    final nextPageCount = _pdfController.pageCount;
    if (nextPage != null && nextPage != _pageNumber) {
      widget.controller.updateLastPage(score, nextPage);
    }

    if (nextPage != _pageNumber || nextPageCount != _pageCount) {
      setState(() {
        _pageNumber = nextPage;
        _pageCount = nextPageCount;
      });
    }
  }

  Future<void> _goToRelativePage(int delta) async {
    if (!_pdfController.isReady) {
      return;
    }

    final current = _pdfController.pageNumber ?? _pageNumber ?? 1;
    final target = (current + delta).clamp(1, _pdfController.pageCount);
    await _pdfController.goToPage(pageNumber: target);
  }

  void _handlePdfLinkTap(PdfLink link) {
    final action = resolveSheetPdfLinkTapAction(
      url: link.url,
      hasDestination: link.dest != null,
    );

    switch (action) {
      case SheetPdfLinkTapAction.blockExternalUrl:
        _showSnackBar('외부 PDF 링크를 차단했습니다.');
        return;
      case SheetPdfLinkTapAction.navigateInternalDestination:
        final destination = link.dest;
        if (destination == null) {
          _showSnackBar('지원하지 않는 PDF 링크입니다.');
          return;
        }
        _pdfController.goToDest(destination).then((didNavigate) {
          if (!mounted || didNavigate) {
            return;
          }
          _showSnackBar('PDF 내부 링크로 이동할 수 없습니다.');
        });
        return;
      case SheetPdfLinkTapAction.ignore:
        _showSnackBar('지원하지 않는 PDF 링크입니다.');
        return;
    }
  }

  void _showSnackBar(String message) {
    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 2),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final currentScore = score;

    return Scaffold(
      appBar: AppBar(
        title: Text(currentScore.title, overflow: TextOverflow.ellipsis),
        actions: [
          IconButton(
            tooltip: _showPdfLinks ? 'PDF 링크 영역 숨기기' : 'PDF 링크 영역 표시',
            onPressed: () {
              setState(() {
                _showPdfLinks = !_showPdfLinks;
              });
            },
            icon: Icon(_showPdfLinks ? Icons.link : Icons.link_off),
          ),
          Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Text(
                '${_pageNumber ?? currentScore.lastPage}/${_pageCount ?? '-'}',
                style: const TextStyle(fontWeight: FontWeight.w900),
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Stack(
          children: [
            PdfViewer.file(
              currentScore.filePath,
              key: ValueKey(currentScore.filePath),
              controller: _pdfController,
              initialPageNumber: currentScore.lastPage,
              params: PdfViewerParams(
                margin: 14,
                backgroundColor: const Color(0xff313332),
                linkHandlerParams: PdfLinkHandlerParams(
                  onLinkTap: _handlePdfLinkTap,
                  linkColor: _showPdfLinks
                      ? const Color(0xff2f8c8f).withValues(alpha: 0.26)
                      : Colors.transparent,
                  enableAutoLinkDetection: false,
                ),
                onPageChanged: (pageNumber) {
                  if (pageNumber == null) {
                    return;
                  }
                  widget.controller.updateLastPage(currentScore, pageNumber);
                  setState(() {
                    _pageNumber = pageNumber;
                  });
                },
              ),
            ),
            Positioned(
              left: 16,
              right: 16,
              bottom: 16,
              child: _ViewerControls(
                pageNumber: _pageNumber ?? currentScore.lastPage,
                pageCount: _pageCount,
                onPrevious: () => _goToRelativePage(-1),
                onNext: () => _goToRelativePage(1),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ViewerControls extends StatelessWidget {
  const _ViewerControls({
    required this.pageNumber,
    required this.pageCount,
    required this.onPrevious,
    required this.onNext,
  });

  final int pageNumber;
  final int? pageCount;
  final VoidCallback onPrevious;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.72),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                tooltip: '이전 페이지',
                onPressed: pageNumber <= 1 ? null : onPrevious,
                color: Colors.white,
                disabledColor: Colors.white38,
                icon: const Icon(Icons.chevron_left),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Text(
                  '$pageNumber / ${pageCount ?? '-'}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              IconButton(
                tooltip: '다음 페이지',
                onPressed: pageCount != null && pageNumber >= pageCount!
                    ? null
                    : onNext,
                color: Colors.white,
                disabledColor: Colors.white38,
                icon: const Icon(Icons.chevron_right),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
