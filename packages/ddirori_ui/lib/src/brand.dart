import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'generated/ddirori_geometry.dart';
import 'generated/ddirori_tokens.dart';
import 'brand_family.dart';

/// Exact approved geometry; decorative by default. Label the surrounding control.
class DdiroriMark extends StatelessWidget {
  const DdiroriMark({
    super.key,
    this.size = 48,
    this.color,
    this.phase = 0,
    this.pulse = false,
  });
  final double size;
  final Color? color;
  final double phase;
  final bool pulse;
  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: SizedBox.square(
      dimension: size,
      child: CustomPaint(
        painter: _MarkPainter(
          color ?? Theme.of(context).colorScheme.primary,
          size <= 32,
          phase,
          pulse,
        ),
      ),
    ),
  );
}

class _MarkPainter extends CustomPainter {
  _MarkPainter(this.color, this.small, this.phase, this.pulse);
  final Color color;
  final bool small, pulse;
  final double phase;
  @override
  void paint(Canvas canvas, Size size) {
    final span = small ? 24.0 : 256.0;
    canvas.scale(size.width / span, size.height / span);
    final stems = small
        ? DdiroriGeometry.smallStems
        : DdiroriGeometry.fullStems;
    final heads = small
        ? DdiroriGeometry.smallHeads
        : DdiroriGeometry.fullHeads;
    final beams = small
        ? DdiroriGeometry.smallBeams
        : DdiroriGeometry.fullBeams;
    final dot = small ? DdiroriGeometry.smallDot : DdiroriGeometry.fullDot;
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth =
          (small ? DdiroriGeometry.smallWidth : DdiroriGeometry.fullWidth)
              .toDouble();
    for (final s in stems) {
      canvas.drawLine(Offset(s[0], s[1]), Offset(s[0], s[2]), paint);
    }
    paint.style = PaintingStyle.fill;
    for (final b in beams) {
      canvas.drawRect(Rect.fromLTWH(b[0], b[1], b[2], b[3]), paint);
    }
    for (var i = 0; i < heads.length; i++) {
      final h = heads[i];
      final start = i == 0
          ? 0.0
          : i == 1
          ? .1
          : .2;
      final end = i == 0
          ? .1
          : i == 1
          ? .2
          : .5;
      paint.color = pulse
          ? color.withValues(alpha: phase >= start && phase < end ? 1 : .55)
          : color;
      canvas.save();
      canvas.translate(h[0], h[1]);
      canvas.rotate(h[4] * math.pi / 180);
      canvas.drawOval(
        Rect.fromCenter(center: Offset.zero, width: 2 * h[2], height: 2 * h[3]),
        paint,
      );
      canvas.restore();
    }
    paint.color = color;
    canvas.drawCircle(Offset(dot[0], dot[1]), dot[2], paint);
  }

  @override
  bool shouldRepaint(covariant _MarkPainter old) =>
      old.color != color ||
      old.phase != phase ||
      old.small != small ||
      old.pulse != pulse;
}

class DdiroriBach extends StatelessWidget {
  const DdiroriBach({super.key, this.size = 64, this.label = '놀란 바흐'});
  final double size;
  final String label;
  @override
  Widget build(BuildContext context) =>
      DdiroriBachVector(size: size, label: label);
}

class DdiroriProgress extends StatefulWidget {
  const DdiroriProgress({
    super.key,
    this.value,
    this.label = '불러오는 중',
    this.size = 40,
  });
  final double? value;
  final String label;
  final double size;
  @override
  State<DdiroriProgress> createState() => _DdiroriProgressState();
}

class _DdiroriProgressState extends State<DdiroriProgress>
    with SingleTickerProviderStateMixin {
  late final AnimationController _animation = AnimationController(
    vsync: this,
    duration: Duration(
      milliseconds: DdiroriTokens.motion['loaderCycleMs']!.round(),
    ),
  );
  bool _animate = false;
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sync();
  }

  @override
  void didUpdateWidget(covariant DdiroriProgress old) {
    super.didUpdateWidget(old);
    _sync();
  }

  void _sync() {
    _animate =
        widget.value == null &&
        !MediaQuery.disableAnimationsOf(context) &&
        TickerMode.valuesOf(context).enabled;
    if (_animate) {
      if (!_animation.isAnimating) _animation.repeat();
    } else {
      _animation.stop();
    }
  }

  @override
  void dispose() {
    _animation.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    label: widget.label,
    value: widget.value == null
        ? null
        : '${(widget.value!.clamp(0, 1) * 100).round()}%',
    child: ExcludeSemantics(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (widget.value == null)
            AnimatedBuilder(
              animation: _animation,
              builder: (context, child) => DdiroriMark(
                size: widget.size,
                phase: _animation.value,
                pulse: _animate,
              ),
            )
          else
            SizedBox(
              width: 160,
              child: LinearProgressIndicator(value: widget.value!.clamp(0, 1)),
            ),
          const SizedBox(height: 8),
          Text(widget.label, textAlign: TextAlign.center),
        ],
      ),
    ),
  );
}
