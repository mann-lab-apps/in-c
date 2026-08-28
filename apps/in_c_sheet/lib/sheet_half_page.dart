enum SheetHalfPageOrientation { portrait, landscape }

class SheetHalfPageTurnPolicy {
  const SheetHalfPageTurnPolicy({
    required this.orientation,
    required this.stepRatio,
  });

  factory SheetHalfPageTurnPolicy.fromDimensions({
    required double width,
    required double height,
  }) {
    final orientation = width > height
        ? SheetHalfPageOrientation.landscape
        : SheetHalfPageOrientation.portrait;
    return SheetHalfPageTurnPolicy.forOrientation(orientation);
  }

  factory SheetHalfPageTurnPolicy.forOrientation(
    SheetHalfPageOrientation orientation,
  ) {
    return SheetHalfPageTurnPolicy(
      orientation: orientation,
      stepRatio: switch (orientation) {
        SheetHalfPageOrientation.portrait => 0.82,
        SheetHalfPageOrientation.landscape => 0.66,
      },
    );
  }

  double stepFor(double visibleHeight) {
    if (visibleHeight <= 0 || visibleHeight.isNaN) {
      return 0;
    }
    return visibleHeight * stepRatio;
  }

  double targetTop({
    required double visibleTop,
    required double visibleHeight,
    required int delta,
  }) {
    return visibleTop + (stepFor(visibleHeight) * delta);
  }

  bool canStayWithinPage({
    required double visibleTop,
    required double visibleHeight,
    required double pageTop,
    required double pageBottom,
    required int delta,
  }) {
    if (delta == 0 || visibleHeight <= 0 || pageBottom <= pageTop) {
      return false;
    }
    final nextTop = targetTop(
      visibleTop: visibleTop,
      visibleHeight: visibleHeight,
      delta: delta,
    );
    return nextTop >= pageTop && nextTop + visibleHeight <= pageBottom;
  }
}
