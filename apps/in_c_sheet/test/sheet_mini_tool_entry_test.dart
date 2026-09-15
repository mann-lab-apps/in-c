import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';

void main() {
  for (final tuner in [false, true]) {
    for (final size in [const Size(320, 720), const Size(1280, 800)]) {
      for (final scale in [1.0, 1.6]) {
        testWidgets('named mini entry tuner=$tuner size=$size scale=$scale', (
          tester,
        ) async {
          tester.view.physicalSize = size;
          tester.view.devicePixelRatio = 1;
          tester.platformDispatcher.textScaleFactorTestValue = scale;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
            tester.platformDispatcher.clearTextScaleFactorTestValue();
          });
          var opens = 0;
          await tester.pumpWidget(
            tuner
                ? buildTunerSheetForTest(onShowMiniPanel: () => opens++)
                : buildMetronomeSheetForTest(onShowMiniPanel: () => opens++),
          );
          await tester.pumpAndSettle();
          final entry = find.text('작은 창').hitTestable();
          expect(entry, findsOneWidget);
          final button = find.ancestor(
            of: entry,
            matching: find.byType(TextButton),
          );
          expect(tester.getRect(button).height, greaterThanOrEqualTo(48));
          expect(tester.getRect(button).right, lessThanOrEqualTo(size.width));
          if (!tuner) expect(find.text('시작').hitTestable(), findsOneWidget);
          await tester.tap(entry);
          await tester.pump();
          expect(opens, 1);
          expect(tester.takeException(), isNull);
          await tester.pumpWidget(const SizedBox());
        });
      }
    }
  }
}
