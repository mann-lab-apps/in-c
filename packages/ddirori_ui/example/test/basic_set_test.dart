import 'dart:io';
import 'dart:ui' as ui;

import 'package:ddirori_catalog/basic_set.dart';
import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> loadFont(WidgetTester t) async {
  final path = Platform.environment['DDIRORI_BRAND_FONT'];
  if (path == null) return;
  await t.runAsync(() async {
    final bytes = ByteData.sublistView(await File(path).readAsBytes());
    for (final name in ['DdiroriCapture', 'Roboto']) {
      await (FontLoader(name)..addFont(Future.value(bytes))).load();
    }
    final icons = Platform.environment['DDIRORI_MATERIAL_FONT'];
    if (icons != null) {
      await (FontLoader('MaterialIcons')..addFont(
            Future.value(ByteData.sublistView(await File(icons).readAsBytes())),
          ))
          .load();
    }
  });
}

void main() {
  for (final width in [390.0, 840.0, 1440.0]) {
    for (final dark in [false, true]) {
      testWidgets('catalog width $width dark $dark at 200%', (t) async {
        t.view.physicalSize = Size(width, 1000);
        t.view.devicePixelRatio = 1;
        t.platformDispatcher.textScaleFactorTestValue = 2;
        addTearDown(() {
          t.view.resetPhysicalSize();
          t.view.resetDevicePixelRatio();
          t.platformDispatcher.clearTextScaleFactorTestValue();
        });
        await t.pumpWidget(DdiroriBasicSet(initialDark: dark));
        await t.pump(const Duration(milliseconds: 200));
        expect(t.takeException(), isNull);
        for (var i = 0; i < 12; i++) {
          await t.drag(
            find.byType(SingleChildScrollView).first,
            const Offset(0, -800),
          );
          await t.pump(const Duration(milliseconds: 50));
          expect(t.takeException(), isNull);
        }
        await t.pumpWidget(const SizedBox.shrink());
      });
      for (final kind in ['악보함', '작품·녹음', '설정', '사보 패널']) {
        testWidgets('composition $kind width $width dark $dark', (t) async {
          t.view.physicalSize = Size(width, 1200);
          t.view.devicePixelRatio = 1;
          addTearDown(() {
            t.view.resetPhysicalSize();
            t.view.resetDevicePixelRatio();
          });
          await loadFont(t);
          await t.pumpWidget(
            RepaintBoundary(
              key: const Key('capture'),
              child: MaterialApp(
                debugShowCheckedModeBanner: false,
                theme: ddiroriTheme(
                  brightness: dark ? Brightness.dark : Brightness.light,
                  fontFamily: 'DdiroriCapture',
                ),
                home: Scaffold(
                  body: SingleChildScrollView(
                    child: DdiroriContainer(
                      child: BasicComposition(kind: kind),
                    ),
                  ),
                ),
              ),
            ),
          );
          await t.pump(const Duration(milliseconds: 300));
          expect(t.takeException(), isNull);
          if (Platform.environment['DDIRORI_BASIC_CAPTURE'] == 'true' &&
              width != 840) {
            final boundary = t.renderObject<RenderRepaintBoundary>(
              find.byKey(const Key('capture')),
            );
            await t.runAsync(() async {
              final image = await boundary.toImage(pixelRatio: 1);
              final bytes = await image.toByteData(
                format: ui.ImageByteFormat.png,
              );
              final index = ['악보함', '작품·녹음', '설정', '사보 패널'].indexOf(kind);
              final file = File(
                '../../../docs/brand/ddirori-design-system/evidence/basic-set/flutter-$index-${width.toInt()}-${dark ? 'dark' : 'light'}.png',
              );
              await file.parent.create(recursive: true);
              await file.writeAsBytes(bytes!.buffer.asUint8List());
              image.dispose();
            });
          }
          await t.pumpWidget(const SizedBox.shrink());
        });
      }
    }
  }
}
