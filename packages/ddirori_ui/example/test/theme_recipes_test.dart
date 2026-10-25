import 'dart:io';
import 'dart:ui' as ui;

import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:ddirori_catalog/theme_reference_main.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() async {
    for (final entry in {
      'DDIRORI_TEST_FONT': 'Pretendard',
      'DDIRORI_TEST_ICONS': 'MaterialIcons',
    }.entries) {
      final path = Platform.environment[entry.key];
      if (path != null) {
        await (FontLoader(entry.value)..addFont(
              File(path).readAsBytes().then((b) => ByteData.sublistView(b)),
            ))
            .load();
      }
    }
  });
  for (final brightness in Brightness.values) {
    for (final width in [320.0, 1024.0]) {
      for (final scale in [1.0, 2.0]) {
        testWidgets('local recipes $brightness $width text$scale', (t) async {
          await t.binding.setSurfaceSize(Size(width, 1000));
          addTearDown(() => t.binding.setSurfaceSize(null));
          final captureKey = GlobalKey();
          await t.pumpWidget(
            RepaintBoundary(
              key: captureKey,
              child: ThemeReferenceApp(
                brightness: brightness,
                textScale: scale,
                fontFamily:
                    Platform.environment.containsKey('DDIRORI_TEST_FONT')
                    ? 'Pretendard'
                    : null,
              ),
            ),
          );
          await t.pumpAndSettle();
          expect(t.takeException(), isNull);
          final save = find.byTooltip('프렐류드 · 첫 번째 구간 저장');
          await t.ensureVisible(save);
          await t.tap(save);
          await t.pumpAndSettle();
          expect(find.text('저장했어요.'), findsOneWidget);
          final saveButton = t.widget<DdiroriIconButton>(
            find
                .ancestor(of: save, matching: find.byType(DdiroriIconButton))
                .first,
          );
          expect(saveButton.selected, isTrue);
          final name = find.widgetWithText(TextField, '연습 구간 A');
          await t.ensureVisible(name);
          await t.enterText(name, '');
          final apply = find.widgetWithText(DdiroriButton, '적용');
          await t.ensureVisible(apply);
          await t.tap(apply);
          await t.pumpAndSettle();
          expect(find.text('이름을 입력해주세요.'), findsOneWidget);
          expect(t.takeException(), isNull);
          final output = Platform.environment['DDIRORI_THEME_EVIDENCE'];
          if (output != null && scale == 1) {
            await t.runAsync(() async {
              final boundary =
                  captureKey.currentContext!.findRenderObject()!
                      as RenderRepaintBoundary;
              final image = await boundary.toImage(pixelRatio: 1);
              final data = await image.toByteData(
                format: ui.ImageByteFormat.png,
              );
              await Directory(output).create(recursive: true);
              await File(
                '$output/flutter-${brightness.name}-${width.toInt()}-properties.png',
              ).writeAsBytes(data!.buffer.asUint8List());
              image.dispose();
            });
          }
        });
      }
    }
  }
}
