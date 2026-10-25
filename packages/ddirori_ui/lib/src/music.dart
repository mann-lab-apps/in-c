import 'package:flutter/material.dart';

import 'components.dart';
import 'theme.dart';
import 'generated/ddirori_tokens.dart';

class DdiroriPageControls extends StatelessWidget {
  const DdiroriPageControls({
    super.key,
    required this.page,
    required this.onPrevious,
    required this.onNext,
    this.pageCount,
    this.performance = false,
  });
  final int page;
  final int? pageCount;
  final VoidCallback? onPrevious, onNext;
  final bool performance;
  @override
  Widget build(BuildContext context) {
    final c = DdiroriStyle.of(context);
    return Container(
      padding: EdgeInsets.all(performance ? 16 : 8),
      decoration: BoxDecoration(
        color: c['overlay'],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Wrap(
        alignment: WrapAlignment.center,
        crossAxisAlignment: WrapCrossAlignment.center,
        spacing: 12,
        runSpacing: 8,
        children: [
          IconButton(
            tooltip: '이전 페이지',
            icon: Icon(Icons.chevron_left, size: performance ? 34 : 24),
            color: c['onOverlay'],
            disabledColor: c['onOverlay'].withValues(alpha: .4),
            onPressed: page > 1 ? onPrevious : null,
          ),
          Text(
            '$page / ${pageCount ?? '—'}',
            style: TextStyle(
              color: c['onOverlay'],
              fontSize: performance ? 22 : 16,
              fontWeight: FontWeight.w700,
            ),
          ),
          IconButton(
            tooltip: '다음 페이지',
            icon: Icon(Icons.chevron_right, size: performance ? 34 : 24),
            color: c['onOverlay'],
            disabledColor: c['onOverlay'].withValues(alpha: .4),
            onPressed: pageCount != null && page >= pageCount! ? null : onNext,
          ),
        ],
      ),
    );
  }
}

class DdiroriAnnotationTools extends StatelessWidget {
  const DdiroriAnnotationTools({
    super.key,
    required this.tool,
    required this.onToolChanged,
    required this.color,
    required this.onColorChanged,
    required this.width,
    required this.onWidthChanged,
    this.onUndo,
    this.onRedo,
  });
  final String tool;
  final ValueChanged<String> onToolChanged;
  final Color color;
  final ValueChanged<Color> onColorChanged;
  final double width;
  final ValueChanged<double> onWidthChanged;
  final VoidCallback? onUndo, onRedo;
  @override
  Widget build(BuildContext context) => DdiroriToolbar(
    label: '주석 도구',
    children: [
      DdiroriChoices<String>(
        options: const {'pen': '펜', 'highlight': '형광펜', 'erase': '지우개'},
        selected: {tool},
        onChanged: (v) {
          if (v.isNotEmpty) onToolChanged(v.first);
        },
      ),
      for (final e in const {
        'annotationInk': '검정',
        'annotationRed': '빨강',
        'annotationBlue': '파랑',
        'annotationYellow': '노랑',
      }.entries)
        DdiroriIconButton(
          label: '주석 ${e.value}',
          glyph: Container(
            width: 22,
            height: 22,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Color(DdiroriTokens.score[e.key]!),
              border: Border.all(
                color: DdiroriStyle.of(context)['controlBorder'],
              ),
            ),
            child: color.toARGB32() == DdiroriTokens.score[e.key]
                ? Icon(
                    Icons.check,
                    size: 16,
                    color:
                        Color(DdiroriTokens.score[e.key]!).computeLuminance() >
                            .5
                        ? const Color(0xFF202020)
                        : Colors.white,
                  )
                : null,
          ),
          icon: color.toARGB32() == DdiroriTokens.score[e.key]
              ? Icons.check_circle
              : Icons.circle_outlined,
          selected: color.toARGB32() == DdiroriTokens.score[e.key],
          onPressed: () => onColorChanged(Color(DdiroriTokens.score[e.key]!)),
        ),
      DdiroriChoices<double>(
        options: {2: '가는 선', 4: '보통 선', 7: '굵은 선'},
        selected: {width},
        onChanged: (v) {
          if (v.isNotEmpty) onWidthChanged(v.first);
        },
      ),
      DdiroriIconButton(label: '실행 취소', icon: Icons.undo, onPressed: onUndo),
      DdiroriIconButton(label: '다시 실행', icon: Icons.redo, onPressed: onRedo),
    ],
  );
}

enum DdiroriTransportVariant { full, compact }

String formatDdiroriDuration(Duration duration) {
  final totalSeconds = duration.inSeconds.clamp(0, 359999);
  final hours = totalSeconds ~/ 3600;
  final minutes = (totalSeconds % 3600) ~/ 60;
  final seconds = totalSeconds % 60;
  String twoDigits(int value) => value.toString().padLeft(2, '0');
  if (hours > 0) {
    return '$hours:${twoDigits(minutes)}:${twoDigits(seconds)}';
  }
  return '${twoDigits(minutes)}:${twoDigits(seconds)}';
}

class DdiroriPlaybackProgress extends StatefulWidget {
  const DdiroriPlaybackProgress({
    super.key,
    required this.position,
    this.duration,
    this.bufferedPosition,
    this.onSeek,
    this.enabled = true,
    this.statusLabel,
    this.sliderKey,
  });

  final Duration position;
  final Duration? duration;
  final Duration? bufferedPosition;
  final ValueChanged<Duration>? onSeek;
  final bool enabled;
  final String? statusLabel;
  final Key? sliderKey;

  @override
  State<DdiroriPlaybackProgress> createState() =>
      _DdiroriPlaybackProgressState();
}

class _DdiroriPlaybackProgressState extends State<DdiroriPlaybackProgress> {
  Duration? _dragPosition;

  @override
  void didUpdateWidget(covariant DdiroriPlaybackProgress oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.duration != widget.duration) _dragPosition = null;
  }

  @override
  Widget build(BuildContext context) {
    final duration = widget.duration;
    final durationMs = duration?.inMilliseconds ?? 0;
    final canSeek = widget.enabled && durationMs > 0 && widget.onSeek != null;
    final shownPosition = _dragPosition ?? widget.position;
    final shownMs = shownPosition.inMilliseconds.clamp(0, durationMs);
    final bufferedMs = widget.bufferedPosition?.inMilliseconds.clamp(
      0,
      durationMs,
    );
    final positionLabel = formatDdiroriDuration(shownPosition);
    final durationLabel = duration == null
        ? '--:--'
        : formatDdiroriDuration(duration);
    final timeStyle = Theme.of(context).textTheme.labelSmall;
    double timeWidth(String label) {
      final painter = TextPainter(
        text: TextSpan(text: label, style: timeStyle),
        textDirection: Directionality.of(context),
        textScaler: MediaQuery.textScalerOf(context),
      )..layout();
      final width = painter.width.ceilToDouble() + 8;
      painter.dispose();
      return width < 52 ? 52 : width;
    }

    final positionWidth = timeWidth(positionLabel);
    final durationWidth = timeWidth(durationLabel);
    final slider = Slider(
      key: widget.sliderKey,
      label: positionLabel,
      semanticFormatterCallback: (value) =>
          formatDdiroriDuration(Duration(milliseconds: value.round())),
      min: 0,
      max: durationMs > 0 ? durationMs.toDouble() : 1,
      value: durationMs > 0 ? shownMs.toDouble() : 0,
      secondaryTrackValue: durationMs > 0 ? bufferedMs?.toDouble() : null,
      onChanged: canSeek
          ? (value) => setState(
              () => _dragPosition = Duration(milliseconds: value.round()),
            )
          : null,
      onChangeEnd: canSeek
          ? (value) {
              final requested = Duration(milliseconds: value.round());
              setState(() => _dragPosition = null);
              widget.onSeek!(requested);
            }
          : null,
    );
    return Semantics(
      container: true,
      label:
          '재생 위치 ${formatDdiroriDuration(shownPosition)} / '
          '${duration == null ? '알 수 없음' : formatDdiroriDuration(duration)}',
      child: Column(
        children: [
          LayoutBuilder(
            builder: (context, constraints) {
              final position = Text(
                positionLabel,
                style: timeStyle,
                maxLines: 1,
              );
              final total = Text(durationLabel, style: timeStyle, maxLines: 1);
              if (constraints.maxWidth < positionWidth + durationWidth + 160) {
                return Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [position, total],
                    ),
                    slider,
                  ],
                );
              }
              return Row(
                children: [
                  SizedBox(width: positionWidth, child: position),
                  Expanded(child: slider),
                  SizedBox(width: durationWidth, child: total),
                ],
              );
            },
          ),
          if (widget.statusLabel != null)
            Text(
              widget.statusLabel!,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.labelSmall,
            ),
        ],
      ),
    );
  }
}

class DdiroriTransport extends StatelessWidget {
  const DdiroriTransport({
    super.key,
    required this.playing,
    required this.onToggle,
    this.position = Duration.zero,
    this.duration,
    this.onSeek,
    this.onPrevious,
    this.onNext,
    this.bufferedPosition,
    this.statusLabel,
    this.variant = DdiroriTransportVariant.full,
  });
  final bool playing;
  final VoidCallback? onToggle, onPrevious, onNext;
  final Duration position;
  final Duration? duration;
  final Duration? bufferedPosition;
  final String? statusLabel;
  final DdiroriTransportVariant variant;
  final ValueChanged<Duration>? onSeek;
  @override
  Widget build(BuildContext context) => Column(
    children: [
      Wrap(
        crossAxisAlignment: WrapCrossAlignment.center,
        spacing: 8,
        children: [
          DdiroriIconButton(
            label: '이전 트랙',
            icon: Icons.skip_previous,
            onPressed: onPrevious,
          ),
          DdiroriButton(
            label: playing ? '일시정지' : '재생',
            icon: playing ? Icons.pause : Icons.play_arrow,
            onPressed: onToggle,
          ),
          DdiroriIconButton(
            label: '다음 트랙',
            icon: Icons.skip_next,
            onPressed: onNext,
          ),
        ],
      ),
      if (variant == DdiroriTransportVariant.full && duration != null) ...[
        const SizedBox(height: 4),
        DdiroriPlaybackProgress(
          position: position,
          duration: duration,
          bufferedPosition: bufferedPosition,
          statusLabel: statusLabel,
          onSeek: onSeek,
        ),
      ] else if (statusLabel != null) ...[
        const SizedBox(height: 4),
        Text(statusLabel!, style: Theme.of(context).textTheme.labelSmall),
      ],
    ],
  );
}

class DdiroriBeatIndicator extends StatelessWidget {
  const DdiroriBeatIndicator({
    super.key,
    required this.beats,
    required this.currentBeat,
    this.running = false,
  }) : assert(beats > 0);
  final int beats, currentBeat;
  final bool running;
  @override
  Widget build(BuildContext context) {
    final c = DdiroriStyle.of(context);
    return Semantics(
      label: running ? '$beats박 중 $currentBeat번째 박' : '$beats박 대기',
      child: Wrap(
        alignment: WrapAlignment.center,
        spacing: 8,
        runSpacing: 8,
        children: List.generate(
          beats,
          (i) => Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: running && currentBeat == i + 1
                  ? c['action']
                  : c['surfaceMuted'],
              border: Border.all(
                color: c['controlBorder'],
                width: i == 0 ? 3 : 1,
              ),
            ),
            child: Text(
              '${i + 1}',
              style: TextStyle(
                color: running && currentBeat == i + 1
                    ? c['onAction']
                    : c['text'],
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

enum DdiroriTunerStatus { flat, centered, sharp, noSignal, lowConfidence }

class DdiroriTunerMeter extends StatelessWidget {
  const DdiroriTunerMeter({
    super.key,
    required this.status,
    this.cents,
    this.note = 'A4',
  });
  final DdiroriTunerStatus status;
  final double? cents;
  final String note;
  @override
  Widget build(BuildContext context) {
    final c = DdiroriStyle.of(context);
    final text = switch (status) {
      DdiroriTunerStatus.flat => '낮음',
      DdiroriTunerStatus.centered => '정확',
      DdiroriTunerStatus.sharp => '높음',
      DdiroriTunerStatus.noSignal => '신호 없음',
      DdiroriTunerStatus.lowConfidence => '신뢰도 낮음',
    };
    final hasValue = cents != null && status != DdiroriTunerStatus.noSignal;
    return Semantics(
      label: '$note $text${hasValue ? ' ${cents!.toStringAsFixed(1)} 센트' : ''}',
      child: Column(
        children: [
          Text('$note · $text', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 14),
          SizedBox(
            height: 50,
            child: LayoutBuilder(
              builder: (context, b) => Stack(
                alignment: Alignment.center,
                children: [
                  Container(height: 8, color: c['controlBorder']),
                  Container(width: 3, height: 40, color: c['action']),
                  if (hasValue)
                    Positioned(
                      left:
                          ((cents!.clamp(-50, 50) + 50) /
                          100 *
                          (b.maxWidth - 18)),
                      child: Icon(
                        status == DdiroriTunerStatus.centered
                            ? Icons.check_circle
                            : Icons.arrow_drop_down,
                        color: status == DdiroriTunerStatus.centered
                            ? c['success']
                            : c['warning'],
                        size: 28,
                      ),
                    ),
                ],
              ),
            ),
          ),
          Text(
            hasValue ? '${cents!.toStringAsFixed(1)} cents' : '소리를 기다리고 있어요',
          ),
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [Text('낮음'), Text('정확'), Text('높음')],
          ),
        ],
      ),
    );
  }
}
