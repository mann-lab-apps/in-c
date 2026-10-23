import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ddirori_catalog/main.dart';

void main() {
  for (final width in [390.0, 1440.0]) {
    for (final dark in [false, true]) {
      for (var page = 0; page < 6; page++) {
        testWidgets('view $page width $width dark $dark at 200% text', (
          t,
        ) async {
          t.view.physicalSize = Size(width, 1000);
          t.view.devicePixelRatio = 1;
          t.platformDispatcher.textScaleFactorTestValue = 2;
          addTearDown(
            () => {
              t.view.resetPhysicalSize(),
              t.view.resetDevicePixelRatio(),
              t.platformDispatcher.clearTextScaleFactorTestValue(),
            },
          );
          await t.pumpWidget(
            DdiroriCatalog(initialView: page, initialDark: dark),
          );
          await t.pump(const Duration(milliseconds: 300));
          expect(t.takeException(), isNull);
          await t.drag(
            find.byType(SingleChildScrollView).first,
            const Offset(0, -1800),
          );
          await t.pump(const Duration(milliseconds: 100));
          expect(t.takeException(), isNull);
          await t.pumpWidget(const SizedBox.shrink());
        });
      }
    }
  }
}
