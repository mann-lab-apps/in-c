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
