import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:pdfrx/pdfrx.dart';

import '../sheet_pdf_search_support.dart';

/// The viewer owns the searcher/document. This adapter owns only the query UI.
class ScorePdfTextSearchSheet extends StatefulWidget {
  const ScorePdfTextSearchSheet({
    super.key,
    required this.searcher,
    required this.isCurrent,
    required this.onResultSelected,
  });

  final PdfTextSearcher searcher;
  final bool Function() isCurrent;
  final VoidCallback onResultSelected;

  @override
  State<ScorePdfTextSearchSheet> createState() =>
      _ScorePdfTextSearchSheetState();
}

class _ScorePdfTextSearchSheetState extends State<ScorePdfTextSearchSheet> {
  late String _query = widget.searcher.pattern?.toString() ?? '';
  late bool _didSearch = widget.searcher.pattern != null;
  String? _error;
  int _generation = 0;

  bool get _current => mounted && widget.isCurrent();

  void _clear() {
    if (!_current) return;
    _generation++;
    widget.searcher.resetTextSearch();
    setState(() {
      _query = '';
      _didSearch = false;
      _error = null;
    });
  }

  void _search() {
    if (!_current) return;
    final query = _query.trim();
    if (query.isEmpty) {
      _clear();
      return;
    }
    if (_didSearch && widget.searcher.pattern?.toString() == query) return;
    _generation++;
    setState(() {
      _didSearch = true;
      _error = null;
    });
    try {
      widget.searcher.startTextSearch(
        query,
        caseInsensitive: true,
        searchImmediately: true,
      );
    } catch (_) {
      if (_current) {
        setState(
          () => _error = SheetPdfSearchSupport.unsupportedTextSearchMessage,
        );
      }
    }
  }

  Future<void> _navigate({int? index, bool next = false}) async {
    if (!_current) return;
    final generation = _generation;
    final session = widget.searcher.searchSession;
    try {
      if (index != null) {
        await widget.searcher.goToMatchOfIndex(index);
      } else if (next) {
        await widget.searcher.goToNextMatch();
      } else {
        await widget.searcher.goToPrevMatch();
      }
      if (!mounted ||
          !widget.isCurrent() ||
          generation != _generation ||
          session != widget.searcher.searchSession) {
        return;
      }
      if (index != null) {
        Navigator.of(context).pop();
        widget.onResultSelected();
      } else {
        setState(() {});
      }
    } catch (_) {
      if (_current && generation == _generation) {
        setState(() => _error = '검색 결과로 이동하지 못했습니다. 다시 시도해 주세요.');
      }
    }
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.searcher,
    builder: (context, _) {
      if (!widget.isCurrent()) {
        return const DdiroriBanner(message: '악보가 바뀌었습니다. 닫은 뒤 다시 검색해 주세요.');
      }
      final searcher = widget.searcher;
      final matches = searcher.matches;
      final currentIndex = searcher.currentIndex;
      final currentLabel = currentIndex == null || matches.isEmpty
          ? null
          : '${currentIndex + 1}/${matches.length}';
      final searchStatus = searcher.isSearching
          ? searcher.searchingPageNumber == null ||
                    searcher.totalPageCount == null
                ? '검색 중'
                : '검색 중 · ${searcher.searchingPageNumber}/${searcher.totalPageCount}쪽'
          : !_didSearch
          ? 'PDF 본문을 검색합니다.'
          : matches.isEmpty
          ? SheetPdfSearchSupport.noResultStatus
          : currentLabel == null
          ? '${matches.length}개 결과'
          : '$currentLabel 결과';
      final resultsHeight = (MediaQuery.sizeOf(context).height * .4)
          .clamp(180.0, 400.0)
          .toDouble();
      return DdiroriStack(
        children: [
          DdiroriInput(
            label: '검색어',
            value: _query,
            onChanged: (value) => setState(() {
              _query = value;
              _generation++;
            }),
            onSubmitted: (_) => _search(),
          ),
          Text(
            SheetPdfSearchSupport.embeddedTextOnlyHelper,
            style: ddiroriTextStyle(DdiroriTextRole.description),
          ),
          DdiroriAdaptiveActions(
            children: [
              DdiroriButton(
                label: '검색',
                icon: Icons.search,
                onPressed: _search,
              ),
              DdiroriButton(
                label: '검색어 지우기',
                icon: Icons.clear,
                kind: DdiroriButtonKind.secondary,
                onPressed: _query.isEmpty && !_didSearch ? null : _clear,
              ),
            ],
          ),
          DdiroriStatusBadge(label: searchStatus),
          if (searcher.isSearching)
            LinearProgressIndicator(value: searcher.searchProgress),
          if (_error != null)
            DdiroriBanner(message: _error!, kind: DdiroriNoticeKind.error),
          if (!searcher.isSearching &&
              _didSearch &&
              matches.isEmpty &&
              _error == null)
            const DdiroriBanner(
              message: SheetPdfSearchSupport.ocrUnsupportedHint,
            ),
          DdiroriAdaptiveActions(
            children: [
              DdiroriButton(
                label: '이전 결과',
                icon: Icons.keyboard_arrow_up,
                kind: DdiroriButtonKind.secondary,
                onPressed: matches.isEmpty ? null : () => _navigate(),
              ),
              DdiroriButton(
                label: '다음 결과',
                icon: Icons.keyboard_arrow_down,
                kind: DdiroriButtonKind.secondary,
                onPressed: matches.isEmpty ? null : () => _navigate(next: true),
              ),
            ],
          ),
          if (matches.isEmpty && !_didSearch)
            const DdiroriBanner(message: '검색어를 입력한 뒤 검색을 누르세요.'),
          if (matches.isNotEmpty)
            SizedBox(
              height: resultsHeight,
              child: ListView.builder(
                primary: false,
                itemCount: matches.length,
                itemBuilder: (context, index) {
                  final match = matches[index];
                  final text = match.text.trim();
                  final preview = text.characters.take(120).toString();
                  return DdiroriItem(
                    title: text.isEmpty
                        ? '검색 결과 ${index + 1}'
                        : text.length > preview.length
                        ? '$preview…'
                        : preview,
                    subtitle:
                        '${match.pageNumber}쪽 · ${index + 1}/${matches.length}',
                    selected: index == currentIndex,
                    flat: true,
                    onTap: () => _navigate(index: index),
                  );
                },
              ),
            ),
        ],
      );
    },
  );
}
