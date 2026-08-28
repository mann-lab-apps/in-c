import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_half_page.dart';

void main() {
  test('uses a smaller half-page step in landscape', () {
    final portrait = SheetHalfPageTurnPolicy.fromDimensions(
      width: 800,
      height: 1200,
    );
    final landscape = SheetHalfPageTurnPolicy.fromDimensions(
      width: 1200,
      height: 800,
    );

    expect(portrait.orientation, SheetHalfPageOrientation.portrait);
    expect(landscape.orientation, SheetHalfPageOrientation.landscape);
    expect(portrait.stepFor(1000), 820);
    expect(landscape.stepFor(1000), 660);
  });

  test('keeps half-page movement inside the current page', () {
    final policy = SheetHalfPageTurnPolicy.forOrientation(
      SheetHalfPageOrientation.portrait,
    );

    expect(
      policy.canStayWithinPage(
        visibleTop: 0,
        visibleHeight: 500,
        pageTop: 0,
        pageBottom: 1200,
        delta: 1,
      ),
      isTrue,
    );
    expect(
      policy.canStayWithinPage(
        visibleTop: 700,
        visibleHeight: 500,
        pageTop: 0,
        pageBottom: 1200,
        delta: 1,
      ),
      isFalse,
    );
    expect(
      policy.targetTop(visibleTop: 700, visibleHeight: 500, delta: -1),
      290,
    );
  });
}
