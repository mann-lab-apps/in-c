import 'dart:ui';

import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_stylus_input.dart';

void main() {
  test('maps stylus pressure into stroke width multipliers', () {
    const policy = SheetStylusInputPolicy();

    expect(
      policy.pressureMultiplierFor(
        kind: PointerDeviceKind.touch,
        pressure: 0.8,
        pressureMin: 0,
        pressureMax: 1,
      ),
      1.0,
    );
    expect(
      policy.pressureMultiplierFor(
        kind: PointerDeviceKind.stylus,
        pressure: 0,
        pressureMin: 0,
        pressureMax: 1,
      ),
      0.6,
    );
    expect(
      policy.pressureMultiplierFor(
        kind: PointerDeviceKind.stylus,
        pressure: 1,
        pressureMin: 0,
        pressureMax: 1,
      ),
      1.4,
    );
  });

  test('rejects touch input for a short window after stylus input', () {
    const policy = SheetStylusInputPolicy(
      touchRejectionWindow: Duration(milliseconds: 700),
    );
    final stylusAt = DateTime.parse('2026-08-28T10:00:00.000');
    final rejectUntil = policy.rejectTouchUntil(stylusAt);

    expect(
      policy.shouldRejectTouch(
        kind: PointerDeviceKind.touch,
        now: stylusAt.add(const Duration(milliseconds: 699)),
        rejectTouchUntil: rejectUntil,
      ),
      isTrue,
    );
    expect(
      policy.shouldRejectTouch(
        kind: PointerDeviceKind.touch,
        now: stylusAt.add(const Duration(milliseconds: 700)),
        rejectTouchUntil: rejectUntil,
      ),
      isFalse,
    );
    expect(
      policy.shouldRejectTouch(
        kind: PointerDeviceKind.stylus,
        now: stylusAt.add(const Duration(milliseconds: 200)),
        rejectTouchUntil: rejectUntil,
      ),
      isFalse,
    );
  });
}
