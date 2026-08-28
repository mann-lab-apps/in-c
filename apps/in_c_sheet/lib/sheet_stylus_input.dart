import 'dart:ui';

class SheetStylusInputPolicy {
  const SheetStylusInputPolicy({
    this.touchRejectionWindow = const Duration(milliseconds: 700),
  });

  final Duration touchRejectionWindow;

  double pressureMultiplierFor({
    required PointerDeviceKind kind,
    required double pressure,
    required double pressureMin,
    required double pressureMax,
  }) {
    if (kind != PointerDeviceKind.stylus) {
      return 1.0;
    }
    final normalized = pressureMax > pressureMin
        ? ((pressure - pressureMin) / (pressureMax - pressureMin))
              .clamp(0.0, 1.0)
              .toDouble()
        : pressure.clamp(0.0, 1.0).toDouble();
    return (0.6 + (normalized * 0.8)).clamp(0.4, 1.8).toDouble();
  }

  DateTime rejectTouchUntil(DateTime stylusEventTime) {
    return stylusEventTime.add(touchRejectionWindow);
  }

  bool shouldRejectTouch({
    required PointerDeviceKind kind,
    required DateTime now,
    required DateTime? rejectTouchUntil,
  }) {
    return kind == PointerDeviceKind.touch &&
        rejectTouchUntil != null &&
        now.isBefore(rejectTouchUntil);
  }
}
