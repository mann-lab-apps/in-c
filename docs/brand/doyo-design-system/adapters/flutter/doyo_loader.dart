import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../generated/doyo_tokens.dart';
import '../../generated/doyo_loader_geometry.dart';

/// All indeterminate loading uses this bird. Parent owns aria-busy-equivalent
/// state and disables repeated commands; this widget never starts I/O or audio.
class DoyoLoader extends StatefulWidget {
  const DoyoLoader({super.key, this.width = 64, this.label = '불러오는 중', this.color});
  final double width;
  final String label;
  final Color? color;
  @override
  State<DoyoLoader> createState() => _DoyoLoaderState();
}

class _DoyoLoaderState extends State<DoyoLoader> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this, duration: const Duration(milliseconds: DoyoTokens.loaderCycleMs),
  );
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _controller.stop();
      _controller.value = 0;
    } else if (!_controller.isAnimating) {
      _controller.repeat();
    }
  }

  @override
  void dispose() { _controller.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final color = widget.color ?? Theme.of(context).colorScheme.onSurface;
    return Semantics(
      label: widget.label, liveRegion: true,
      child: ExcludeSemantics(child: Column(mainAxisSize: MainAxisSize.min, children: [
        AnimatedBuilder(animation: _controller, builder: (context, child) => CustomPaint(
          size: Size(widget.width, widget.width * 164 / 256),
          painter: _DoyoPainter(_controller.value, color),
        )),
        const SizedBox(height: 6),
        Text(widget.label, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: color)),
      ])),
    );
  }
}

class _DoyoPainter extends CustomPainter {
  const _DoyoPainter(this.phase, this.color);
  final double phase;
  final Color color;
  Path _path(List<List<Object>> commands) {
    final p = Path();
    for (final c in commands) {
      double n(int i) => (c[i] as num).toDouble();
      switch (c[0]) {
        case 'M': p.moveTo(n(1), n(2));
        case 'L': p.lineTo(n(1), n(2));
        case 'C': p.cubicTo(n(1), n(2), n(3), n(4), n(5), n(6));
        case 'Q': p.quadraticBezierTo(n(1), n(2), n(3), n(4));
        case 'Z': p.close();
      }
    }
    return p;
  }

  @override
  void paint(Canvas canvas, Size size) {
    final bob = (1 - math.cos(phase * 2 * math.pi)) / 2;
    final paint = Paint()..color = color;
    final rear = DoyoLoaderGeometry.rearLegOrigin;
    final front = DoyoLoaderGeometry.frontLegOrigin;
    final upper = DoyoLoaderGeometry.bodyOrigin;
    canvas.save(); canvas.scale(size.width / 256, size.height / 164);
    canvas.save(); canvas.translate(rear[0], rear[1]); canvas.scale(1, 1 - (1 - DoyoTokens.loaderSupportScale) * bob); canvas.translate(-rear[0], -rear[1]);
    canvas.drawPath(_path(DoyoLoaderGeometry.rearLeg), paint); canvas.restore();
    canvas.save(); canvas.translate(-DoyoTokens.loaderReach * bob, DoyoTokens.loaderBodyDrop * bob); canvas.translate(front[0], front[1]); canvas.rotate(DoyoTokens.loaderFrontSwing * math.pi / 180 * bob); canvas.translate(-front[0], -front[1]);
    canvas.drawPath(_path(DoyoLoaderGeometry.frontLeg), paint); canvas.restore();
    canvas.save(); canvas.translate(-DoyoTokens.loaderReach * bob, DoyoTokens.loaderBodyDrop * bob); canvas.translate(upper[0], upper[1]); canvas.rotate(DoyoTokens.loaderBodyTilt * math.pi / 180 * bob); canvas.translate(-upper[0], -upper[1]);
    final body = _path(DoyoLoaderGeometry.body)..fillType = PathFillType.evenOdd;
    final eye = DoyoLoaderGeometry.eye;
    body.addOval(Rect.fromCircle(center: Offset(eye[0], eye[1]), radius: eye[2]));
    canvas.drawPath(body, paint); canvas.restore(); canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _DoyoPainter oldDelegate) => phase != oldDelegate.phase || color != oldDelegate.color;
}
