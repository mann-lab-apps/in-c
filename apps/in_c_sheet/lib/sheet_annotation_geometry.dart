import 'dart:ui';

import 'sheet_annotation.dart';

class SheetAnnotationPageGeometry {
  const SheetAnnotationPageGeometry({required this.pageRect});

  final Rect pageRect;

  Size get pageSize => pageRect.size;

  SheetAnnotationPoint? pointFromPageLocal(Offset local) {
    if (!_containsLocal(local)) {
      return null;
    }
    return SheetAnnotationPoint(
      x: local.dx / pageRect.width,
      y: local.dy / pageRect.height,
    );
  }

  Offset offsetFromPoint(SheetAnnotationPoint point) {
    return Offset(point.x * pageRect.width, point.y * pageRect.height);
  }

  double normalizedToleranceForStrokeWidth(double strokeWidth) {
    final shortest = pageRect.shortestSide;
    if (shortest <= 0) {
      return 0.018;
    }
    return (strokeWidth * 2.4 / shortest).clamp(0.018, 0.12).toDouble();
  }

  bool _containsLocal(Offset local) {
    return local.dx >= 0 &&
        local.dy >= 0 &&
        local.dx <= pageRect.width &&
        local.dy <= pageRect.height &&
        pageRect.width > 0 &&
        pageRect.height > 0;
  }
}
