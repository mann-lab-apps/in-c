import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

// Layout checks are distinct from action targets. A disabled control or input
// label need not accept a hit at the center of its layout box.
Finder visibleCaptureLayout(WidgetTester tester, Finder finder) {
  final viewport =
      Offset.zero & (tester.view.physicalSize / tester.view.devicePixelRatio);
  final elements = finder.evaluate().where((element) {
    final render = element.findRenderObject();
    if (render is! RenderBox ||
        !render.attached ||
        !render.hasSize ||
        render.size.isEmpty)
      return false;
    return (render.localToGlobal(Offset.zero) & render.size).overlaps(viewport);
  }).toSet();
  return find.byElementPredicate(elements.contains);
}
