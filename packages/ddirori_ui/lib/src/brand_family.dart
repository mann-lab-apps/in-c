import 'package:flutter/material.dart';

import 'generated/ddirori_family_geometry.dart';
import 'generated/ddirori_tokens.dart';

/// Application-independent product roles. Identifiers and engines stay in apps.
enum DdiroriProduct { play, score, studio, talk, stage, click, chime }

enum DdiroriBachExpression { surprised, calm, happy }

class DdiroriProductGlyph extends StatelessWidget {
  const DdiroriProductGlyph({
    super.key,
    required this.product,
    this.size = 32,
    this.color,
  });
  final DdiroriProduct product;
  final double size;
  final Color? color;
  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: SizedBox.square(
      dimension: size,
      child: CustomPaint(
        painter: _ProductPainter(
          product,
          color ?? Theme.of(context).colorScheme.primary,
        ),
      ),
    ),
  );
}

class _ProductPainter extends CustomPainter {
  _ProductPainter(this.product, this.color);
  final DdiroriProduct product;
  final Color color;
  @override
  void paint(Canvas canvas, Size size) {
    canvas.scale(size.width / 256, size.height / 256);
    final (shape, cuts) = switch (product) {
      DdiroriProduct.play => (
        DdiroriFamilyGeometry.play,
        DdiroriFamilyGeometry.playCuts,
      ),
      DdiroriProduct.score => (
        DdiroriFamilyGeometry.score,
        DdiroriFamilyGeometry.scoreCuts,
      ),
      DdiroriProduct.studio => (
        DdiroriFamilyGeometry.studio,
        DdiroriFamilyGeometry.studioCuts,
      ),
      DdiroriProduct.talk => (
        DdiroriFamilyGeometry.talk,
        DdiroriFamilyGeometry.talkCuts,
      ),
      DdiroriProduct.stage => (
        DdiroriFamilyGeometry.stage,
        DdiroriFamilyGeometry.stageCuts,
      ),
      DdiroriProduct.click => (
        DdiroriFamilyGeometry.click,
        DdiroriFamilyGeometry.clickCuts,
      ),
      DdiroriProduct.chime => (
        DdiroriFamilyGeometry.chime,
        DdiroriFamilyGeometry.chimeCuts,
      ),
    };
    final paint = Paint()..color = color;
    var visible = shape;
    for (final cut in cuts) {
      visible = Path.combine(PathOperation.difference, visible, cut);
    }
    canvas.drawPath(visible, paint);
    if (product == DdiroriProduct.click) {
      paint.color = color;
      canvas.drawPath(DdiroriFamilyGeometry.clickExtra, paint);
    }
  }

  @override
  bool shouldRepaint(_ProductPainter old) =>
      old.product != product || old.color != color;
}

/// The title remains text and can grow to match accessibility sizes.
class DdiroriProductSignature extends StatelessWidget {
  const DdiroriProductSignature({
    super.key,
    required this.product,
    required this.name,
    this.subtitle,
  });
  final DdiroriProduct product;
  final String name;
  final String? subtitle;
  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Padding(
        padding: const EdgeInsets.only(top: 2),
        child: DdiroriProductGlyph(product: product, size: 32),
      ),
      const SizedBox(width: 10),
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            LayoutBuilder(
              builder: (context, constraints) {
                final style = Theme.of(context).textTheme.titleLarge;
                final measure = TextPainter(
                  text: TextSpan(text: name, style: style),
                  textDirection: Directionality.of(context),
                  textScaler: MediaQuery.textScalerOf(context),
                )..layout();
                final split =
                    measure.width > constraints.maxWidth && name.contains(' ');
                measure.dispose();
                return Semantics(
                  header: true,
                  label: name,
                  excludeSemantics: true,
                  child: split
                      ? Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            for (final word in name.split(' '))
                              Text(word, style: style),
                          ],
                        )
                      : Text(name, style: style),
                );
              },
            ),
            if (subtitle != null)
              Text(subtitle!, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      ),
    ],
  );
}

class DdiroriBachVector extends StatelessWidget {
  const DdiroriBachVector({
    super.key,
    this.size = 64,
    this.expression = DdiroriBachExpression.surprised,
    this.label,
  });
  final double size;
  final DdiroriBachExpression expression;
  final String? label;
  @override
  Widget build(BuildContext context) => Semantics(
    image: true,
    label:
        label ??
        switch (expression) {
          DdiroriBachExpression.surprised => '놀란 바흐',
          DdiroriBachExpression.calm => '차분한 바흐',
          DdiroriBachExpression.happy => '기쁜 바흐',
        },
    child: SizedBox.square(
      dimension: size,
      child: CustomPaint(painter: _BachPainter(expression)),
    ),
  );
}

class _BachPainter extends CustomPainter {
  _BachPainter(this.expression);
  final DdiroriBachExpression expression;
  @override
  void paint(Canvas canvas, Size size) {
    canvas.scale(size.width / 256, size.height / 256);
    final paint = Paint()..color = Colors.white;
    final outline = Paint()
      ..color = Color(DdiroriTokens.light['text']!)
      ..strokeWidth = 8
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;
    canvas.drawPath(DdiroriFamilyGeometry.wig, paint);
    canvas.drawPath(DdiroriFamilyGeometry.wig, outline);
    paint.color = Color(DdiroriTokens.light['peach']!);
    canvas.drawPath(DdiroriFamilyGeometry.face, paint);
    paint.color = Color(DdiroriTokens.light['text']!);
    canvas.drawCircle(const Offset(101, 151), 8, paint);
    canvas.drawCircle(const Offset(155, 151), 8, paint);
    switch (expression) {
      case DdiroriBachExpression.surprised:
        canvas.drawOval(const Rect.fromLTWH(120.5, 169, 15, 20), paint);
      case DdiroriBachExpression.calm:
        outline
          ..strokeWidth = 5
          ..strokeCap = StrokeCap.round;
        canvas.drawPath(
          Path()
            ..moveTo(118, 181)
            ..quadraticBezierTo(128, 188, 138, 181),
          outline,
        );
      case DdiroriBachExpression.happy:
        canvas.drawPath(
          Path()
            ..moveTo(115, 176)
            ..quadraticBezierTo(128, 199, 141, 176)
            ..close(),
          paint,
        );
    }
  }

  @override
  bool shouldRepaint(_BachPainter old) => old.expression != expression;
}

/// The host owns routing, installation and external-link validation.
enum DdiroriServiceAvailability { available, external, install, unavailable }

class DdiroriServiceLink extends StatelessWidget {
  const DdiroriServiceLink({
    super.key,
    required this.product,
    required this.name,
    required this.description,
    this.availability = DdiroriServiceAvailability.available,
    this.onOpen,
  });
  final DdiroriProduct product;
  final String name;
  final String description;
  final DdiroriServiceAvailability availability;
  final VoidCallback? onOpen;
  @override
  Widget build(BuildContext context) {
    final label = switch (availability) {
      DdiroriServiceAvailability.available => '열기',
      DdiroriServiceAvailability.external => '외부 서비스로 이동',
      DdiroriServiceAvailability.install => '설치 안내 보기',
      DdiroriServiceAvailability.unavailable => '연결 준비 중',
    };
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          DdiroriProductSignature(
            product: product,
            name: name,
            subtitle: description,
          ),
          const SizedBox(height: 12),
          Semantics(
            label: '$name · $label',
            child: OutlinedButton(
              onPressed: availability == DdiroriServiceAvailability.unavailable
                  ? null
                  : onOpen,
              child: Text(label),
            ),
          ),
        ],
      ),
    );
  }
}
