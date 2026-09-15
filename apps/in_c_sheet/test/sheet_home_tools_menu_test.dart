import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const qaFont = String.fromEnvironment('CLEF_QA_FONT');
  setUpAll(() async {
    if (qaFont.isEmpty) return;
    await (FontLoader('Roboto')..addFont(
          File(qaFont).readAsBytes().then((bytes) => bytes.buffer.asByteData()),
        ))
        .load();
    await (FontLoader(
      'MaterialIcons',
    )..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'))).load();
  });
  for (final size in [
    const Size(320, 720),
    const Size(800, 360),
    const Size(800, 1280),
    const Size(1280, 800),
  ]) {
    for (final scale in [1.0, 1.6]) {
      testWidgets('home named menu $size scale=$scale', (tester) async {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1;
        tester.platformDispatcher.textScaleFactorTestValue = scale;
        addTearDown(() {
          tester.view.resetPhysicalSize();
          tester.view.resetDevicePixelRatio();
          tester.platformDispatcher.clearTextScaleFactorTestValue();
        });
        SharedPreferences.setMockInitialValues({});
        final controller = SheetLibraryController(store: SheetLibraryStore());
        await controller.load();
        final captureKey = GlobalKey();
        await tester.pumpWidget(
          RepaintBoundary(
            key: captureKey,
            child: InCSheetApp(controller: controller),
          ),
        );
        Future<void> capture(String name) async {
          const directory = String.fromEnvironment('CLEF_QA_SCREENSHOT_DIR');
          if (directory.isEmpty) return;
          await tester.runAsync(() async {
            final boundary =
                captureKey.currentContext!.findRenderObject()!
                    as RenderRepaintBoundary;
            final image = await boundary.toImage();
            final bytes = await image.toByteData(
              format: ui.ImageByteFormat.png,
            );
            await Directory(directory).create(recursive: true);
            await File(
              '$directory/home-$name-${size.width.toInt()}x${size.height.toInt()}-$scale.png',
            ).writeAsBytes(bytes!.buffer.asUint8List());
            image.dispose();
          });
        }

        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull, reason: 'home');
        final menu = find.byTooltip('라이브러리 메뉴');
        expect(find.text('메뉴').hitTestable(), findsOneWidget);
        expect(tester.getRect(menu).height, greaterThanOrEqualTo(48));
        expect(tester.getRect(menu).right, lessThanOrEqualTo(size.width));
        expect(find.byTooltip('악보 추가').hitTestable(), findsOneWidget);
        expect(find.byTooltip('여러 악보 선택').hitTestable(), findsOneWidget);
        await tester.tap(menu);
        await tester.pumpAndSettle();
        expect(find.text('보기/입력 기본값'), findsOneWidget);
        expect(find.text('테스트 정보'), findsOneWidget);
        expect(find.text('PDF 포함 전체 백업'), findsOneWidget);
        expect(tester.takeException(), isNull, reason: 'menu');
        await capture('menu');
        await tester.tap(find.text('보기/입력 기본값'));
        await tester.pumpAndSettle();
        expect(find.text('전역 보기/입력 기본값'), findsOneWidget);
        expect(tester.takeException(), isNull, reason: 'viewer defaults');
        await capture('defaults');
        Navigator.of(tester.element(find.text('전역 보기/입력 기본값'))).pop();
        await tester.pumpAndSettle();
        await tester.tap(menu);
        await tester.pumpAndSettle();
        await tester.tap(find.text('테스트 정보'));
        await tester.pumpAndSettle();
        expect(find.text('Clef & Staff 테스트 정보'), findsOneWidget);
        expect(tester.takeException(), isNull, reason: 'tester info');
        Navigator.of(tester.element(find.text('Clef & Staff 테스트 정보'))).pop();
        await tester.pumpAndSettle();
        await tester.tap(menu);
        await tester.pumpAndSettle();
        await tester.ensureVisible(find.text('자동 정보 복원'));
        await tester.tap(find.text('자동 정보 복원'));
        await tester.pumpAndSettle();
        expect(find.byType(AlertDialog), findsOneWidget);
        await tester.tap(find.text('취소'));
        await tester.pumpAndSettle();
        await tester.tap(menu);
        await tester.pumpAndSettle();
        await tester.tap(find.text('세트리스트'));
        await tester.pumpAndSettle();
        expect(find.byType(SheetSetlistsScreen), findsOneWidget);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
        controller.dispose();
      });
    }
  }
}
