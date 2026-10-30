import 'dart:async';

import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';

/// Score's saved drafts need explicit cancellation and must survive slow writes.
/// Persistence and the result returned by Navigator remain with the caller.
Future<T?> showScoreViewerDraftSheet<T>({
  required BuildContext context,
  required Widget child,
}) => showModalBottomSheet<T>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  isDismissible: false,
  enableDrag: false,
  showDragHandle: false,
  builder: (_) => child,
);

class ScoreViewerDraftForm<T> extends StatelessWidget {
  const ScoreViewerDraftForm({
    super.key,
    required this.title,
    required this.description,
    required this.saving,
    required this.children,
    required this.actions,
    this.error,
  });

  final String title, description;
  final bool saving;
  final String? error;
  final List<Widget> children, actions;

  @override
  Widget build(BuildContext context) => PopScope<T>(
    canPop: !saving,
    child: SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          DdiroriTokens.layout['rowPadding']!,
          0,
          DdiroriTokens.layout['rowPadding']!,
          MediaQuery.viewInsetsOf(context).bottom +
              DdiroriTokens.spacing['xl']!,
        ),
        child: SingleChildScrollView(
          child: DdiroriStack(
            children: [
              DdiroriPageHeader(title: title, subtitle: description),
              if (saving) const DdiroriStatusBadge(label: '저장 중'),
              if (error != null)
                DdiroriBanner(message: error!, kind: DdiroriNoticeKind.error),
              ...children,
              DdiroriAdaptiveActions(label: '$title 작업', children: actions),
            ],
          ),
        ),
      ),
    ),
  );
}

/// Only presentation and intents live here. Document and performance policy stay
/// with SheetViewerScreen, including which commands are currently available.
class ScorePageMarker {
  const ScorePageMarker({required this.label, required this.page});

  final String label;
  final int page;
}

/// A page number draft is presentation state; only onSelected requests a jump.
class ScorePagePicker extends StatefulWidget {
  const ScorePagePicker({
    super.key,
    required this.pageCount,
    required this.currentPage,
    required this.summary,
    required this.hiddenPages,
    required this.pageLabels,
    required this.markers,
    required this.onSelected,
  });

  final int pageCount, currentPage;
  final String summary;
  final Set<int> hiddenPages;
  final Map<int, String> pageLabels;
  final List<ScorePageMarker> markers;
  final ValueChanged<int> onSelected;

  @override
  State<ScorePagePicker> createState() => _ScorePagePickerState();
}

class _ScorePagePickerState extends State<ScorePagePicker> {
  late String _draft = '${widget.currentPage}';
  String? _error;
  bool _markersOpen = false;

  int get _preview => (int.tryParse(_draft) ?? widget.currentPage)
      .clamp(1, widget.pageCount)
      .toInt();

  void _choose(int? page) {
    if (page == null || page < 1 || page > widget.pageCount) {
      setState(() => _error = '1~${widget.pageCount} 사이의 쪽 번호를 입력해 주세요.');
    } else if (widget.hiddenPages.contains(page)) {
      setState(() => _error = '숨긴 페이지입니다. 숨김을 해제한 뒤 이동해 주세요.');
    } else {
      widget.onSelected(page);
    }
  }

  int? _visibleNear(int page) {
    for (var distance = 0; distance < widget.pageCount; distance++) {
      for (final candidate in [page + distance, page - distance]) {
        if (candidate >= 1 &&
            candidate <= widget.pageCount &&
            !widget.hiddenPages.contains(candidate)) {
          return candidate;
        }
      }
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final gridHeight = (MediaQuery.sizeOf(context).height * .45)
        .clamp(180.0, 400.0)
        .toDouble();
    final visiblePages = [
      for (var p = 1; p <= widget.pageCount; p++)
        if (!widget.hiddenPages.contains(p)) p,
    ];
    return DdiroriStack(
      children: [
        DdiroriBanner(message: widget.summary),
        DdiroriSection(
          title: '쪽 번호로 이동',
          subtitle: '번호나 슬라이더로 쪽을 고른 뒤 이동을 누르세요.',
          children: [
            DdiroriInput(
              label: '이동할 쪽',
              value: _draft,
              help: '현재 ${widget.currentPage}쪽 · 전체 ${widget.pageCount}쪽',
              error: _error,
              keyboardType: TextInputType.number,
              onChanged: (value) => setState(() {
                _draft = value;
                _error = null;
              }),
              onSubmitted: (_) => _choose(int.tryParse(_draft)),
            ),
            if (widget.pageCount > 1)
              Semantics(
                label: '이동할 쪽 미리 선택',
                child: Slider(
                  value: _preview.toDouble(),
                  min: 1,
                  max: widget.pageCount.toDouble(),
                  divisions: widget.pageCount <= 201
                      ? widget.pageCount - 1
                      : null,
                  label: '$_preview쪽',
                  semanticFormatterCallback: (v) => '${v.round()}쪽',
                  onChanged: (v) => setState(() {
                    _draft = '${v.round()}';
                    _error = null;
                  }),
                ),
              ),
            DdiroriButton(
              label: '이동',
              icon: Icons.keyboard_tab,
              onPressed: () => _choose(int.tryParse(_draft)),
            ),
            DdiroriStack(
              inline: true,
              children: [
                for (final shortcut in <String, int?>{
                  '처음': visiblePages.firstOrNull,
                  '현재': widget.currentPage,
                  '끝': visiblePages.lastOrNull,
                  '10쪽 전': _visibleNear(
                    (widget.currentPage - 10)
                        .clamp(1, widget.pageCount)
                        .toInt(),
                  ),
                  '10쪽 뒤': _visibleNear(
                    (widget.currentPage + 10)
                        .clamp(1, widget.pageCount)
                        .toInt(),
                  ),
                }.entries)
                  DdiroriButton(
                    label: shortcut.key,
                    kind: DdiroriButtonKind.secondary,
                    onPressed: shortcut.value == null
                        ? null
                        : () => _choose(shortcut.value),
                  ),
              ],
            ),
          ],
        ),
        if (widget.markers.isNotEmpty)
          DdiroriAccordion(
            title: '표시 지점 ${widget.markers.length}개',
            open: _markersOpen,
            onChanged: (open) => setState(() => _markersOpen = open),
            child: DdiroriStack(
              children: [
                for (final marker in widget.markers)
                  DdiroriItem(
                    title: marker.label,
                    subtitle:
                        '${marker.page}쪽${widget.hiddenPages.contains(marker.page) ? ' · 숨김' : ''}',
                    leading: const Icon(Icons.bookmark_outline),
                    flat: true,
                    actions: [
                      DdiroriButton(
                        label: '${marker.page}쪽으로 이동',
                        kind: DdiroriButtonKind.secondary,
                        onPressed: widget.hiddenPages.contains(marker.page)
                            ? null
                            : () => _choose(marker.page),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        DdiroriSection(
          title: '모든 페이지',
          children: [
            SizedBox(
              height: gridHeight,
              child: GridView.builder(
                primary: false,
                gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
                  maxCrossAxisExtent: 220,
                  mainAxisExtent:
                      MediaQuery.textScalerOf(context).scale(16) * 3 + 32,
                  mainAxisSpacing: 8,
                  crossAxisSpacing: 8,
                ),
                itemCount: widget.pageCount,
                itemBuilder: (context, index) {
                  final page = index + 1;
                  final status = widget.pageLabels[page];
                  return DdiroriButton(
                    label: '$page쪽${status == null ? '' : '\n$status'}',
                    kind: DdiroriButtonKind.secondary,
                    selected: page == widget.currentPage,
                    onPressed: widget.hiddenPages.contains(page)
                        ? null
                        : () => _choose(page),
                  );
                },
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class ScoreViewerChrome extends StatelessWidget {
  const ScoreViewerChrome({
    super.key,
    required this.annotating,
    required this.documentReady,
    required this.canAnnotate,
    required this.performance,
    required this.allowMenus,
    required this.onRead,
    required this.onAnnotate,
    required this.onPractice,
    required this.onPerformance,
    required this.onTools,
    this.saving = false,
  });

  final bool annotating, documentReady, canAnnotate, performance, allowMenus;
  final bool saving;
  final VoidCallback onRead, onAnnotate;
  final FutureOr<void> Function() onPractice, onPerformance, onTools;

  @override
  Widget build(BuildContext context) {
    final commands = <Widget>[
      Semantics(
        label: '악보 입력 모드',
        child: Wrap(
          spacing: DdiroriTokens.spacing['xs']!,
          children: [
            DdiroriButton(
              label: '읽기',
              icon: Icons.menu_book_outlined,
              selected: !annotating,
              kind: DdiroriButtonKind.quiet,
              onPressed: saving ? null : onRead,
            ),
            DdiroriButton(
              label: '주석',
              icon: Icons.draw_outlined,
              selected: annotating,
              kind: DdiroriButtonKind.quiet,
              onPressed: documentReady && canAnnotate && !saving
                  ? onAnnotate
                  : null,
            ),
          ],
        ),
      ),
      DdiroriButton(
        label: '연습',
        icon: Icons.music_note_outlined,
        kind: DdiroriButtonKind.quiet,
        onPressed: onPractice,
      ),
      DdiroriButton(
        label: performance ? '공연 종료' : '공연',
        icon: performance ? Icons.lock_open : Icons.lock_outline,
        kind: DdiroriButtonKind.quiet,
        selected: performance,
        onPressed: !saving && (documentReady || performance)
            ? onPerformance
            : null,
      ),
      if (allowMenus)
        DdiroriButton(
          label: '모든 도구',
          icon: Icons.tune,
          kind: DdiroriButtonKind.quiet,
          onPressed: saving ? null : onTools,
        ),
    ];
    final tight =
        MediaQuery.sizeOf(context).height < 520 ||
        MediaQuery.textScalerOf(context).scale(16) > 20;
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: DdiroriTokens.spacing['sm']!),
      child: tight
          ? SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(children: commands),
            )
          : Wrap(
              spacing: DdiroriTokens.spacing['xs']!,
              runSpacing: DdiroriTokens.spacing['xs']!,
              children: commands,
            ),
    );
  }
}

class ScoreAnnotationSummary extends StatelessWidget {
  const ScoreAnnotationSummary({
    super.key,
    required this.toolLabel,
    required this.toolIcon,
    required this.color,
    required this.width,
    required this.optionsFocus,
    required this.onOptions,
    required this.onUndo,
    required this.onRedo,
  });
  final String toolLabel;
  final IconData toolIcon;
  final int color;
  final double width;
  final FocusNode optionsFocus;
  final VoidCallback? onOptions, onUndo, onRedo;

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    scrollDirection: Axis.horizontal,
    padding: EdgeInsets.symmetric(horizontal: DdiroriTokens.spacing['sm']!),
    child: Row(
      children: [
        Focus(
          focusNode: optionsFocus,
          child: DdiroriButton(
            label: '$toolLabel 옵션',
            icon: toolIcon,
            kind: DdiroriButtonKind.quiet,
            onPressed: onOptions,
          ),
        ),
        Tooltip(
          message: '선 색상 · ${width.toStringAsFixed(1)}pt',
          child: Semantics(
            label:
                '선 색상 ${color.toRadixString(16)} · ${width.toStringAsFixed(1)}pt',
            child: SizedBox.square(
              dimension: 48,
              child: Center(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: Color(color),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: Theme.of(context).colorScheme.outline,
                    ),
                  ),
                  child: const SizedBox.square(dimension: 20),
                ),
              ),
            ),
          ),
        ),
        DdiroriIconButton(
          label: '마지막 필기 취소',
          icon: Icons.undo,
          onPressed: onUndo,
        ),
        DdiroriIconButton(
          label: '마지막 필기 다시 적용',
          icon: Icons.redo,
          onPressed: onRedo,
        ),
      ],
    ),
  );
}
