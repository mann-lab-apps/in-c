import 'dart:io';
import 'dart:ui' as ui;

import 'package:classical_local_library/app_settings.dart';
import 'package:classical_local_library/local_data_control.dart';
import 'package:classical_local_library/sqlite_database.dart';
import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  setUpAll(() async {
    sqfliteFfiInit();
    for (final entry in [
      ('DdiroriLibraryCapture', 'DDIRORI_CAPTURE_FONT'),
      ('MaterialIcons', 'DDIRORI_MATERIAL_FONT'),
    ]) {
      final file = Platform.environment[entry.$2];
      if (file != null) {
        await (FontLoader(
          entry.$1,
        )..addFont(File(file).readAsBytes().then(ByteData.sublistView))).load();
      }
    }
  });
  for (final profile in [
    (320.0, 2.0, Brightness.light),
    (390.0, 1.0, Brightness.light),
    (1024.0, 2.0, Brightness.dark),
  ]) {
    final label =
        '${profile.$1.toInt()}-${profile.$2.toInt()}-${profile.$3.name}';
    testWidgets('release settings privacy and support remain usable $label', (
      t,
    ) async {
      t.view.physicalSize = Size(profile.$1, 1000);
      t.view.devicePixelRatio = 1;
      t.view.padding = const FakeViewPadding(bottom: 24);
      t.platformDispatcher.textScaleFactorTestValue = profile.$2;
      addTearDown(t.view.resetPhysicalSize);
      addTearDown(t.view.resetDevicePixelRatio);
      addTearDown(t.view.resetPadding);
      addTearDown(t.platformDispatcher.clearAllTestValues);
      final db = (await t.runAsync(
        () => ClassicalLocalDatabase(
          path: inMemoryDatabasePath,
          factory: databaseFactoryFfi,
        ).open(),
      ))!;
      addTearDown(db.close);
      final key = GlobalKey();
      Future<void> capture(String scene) async {
        final folder = Platform.environment['DDIRORI_LIBRARY_CAPTURE_OUTPUT'];
        if (folder == null) return;
        if (Platform.environment['DDIRORI_CAPTURE_FONT'] == null ||
            Platform.environment['DDIRORI_MATERIAL_FONT'] == null) {
          fail('Real text and icon fonts required');
        }
        await t.pump(const Duration(milliseconds: 200));
        await t.runAsync(() async {
          final image =
              await (key.currentContext!.findRenderObject()
                      as RenderRepaintBoundary)
                  .toImage();
          final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
          await Directory(folder).create(recursive: true);
          await File('$folder/release-$scene-$label.png')
              .writeAsBytes(bytes!.buffer.asUint8List());
          image.dispose();
        });
      }

      await t.pumpWidget(
        RepaintBoundary(
          key: key,
          child: MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: ddiroriTheme(
              brightness: profile.$3,
              fontFamily: 'DdiroriLibraryCapture',
            ),
            home: AppSettingsScreen(
              dataControl: LocalDataControlService(
                database: db,
                managedDirectories: const [],
              ),
              onResetComplete: () async {},
              openExternal: (_) async => false,
            ),
          ),
        ),
      );
      await t.pumpAndSettle();
      await capture('settings');
      final privacy = find.widgetWithText(DdiroriItem, '개인정보 처리 안내');
      await t.scrollUntilVisible(privacy, 250);
      await t.ensureVisible(privacy);
      await t.pumpAndSettle();
      expect(privacy.hitTestable(), findsOneWidget);
      await t.tap(privacy);
      await t.pumpAndSettle();
      expect(find.text('기기 내 데이터 처리 안내'), findsOneWidget);
      await capture('privacy');
      final close = find.widgetWithText(DdiroriButton, '닫기');
      expect(t.getSize(close).height, greaterThanOrEqualTo(48));
      await t.tap(close);
      await t.pumpAndSettle();
      final contact = find.widgetWithText(DdiroriItem, '이메일 문의');
      await t.scrollUntilVisible(contact, 250);
      await t.ensureVisible(contact);
      await t.pumpAndSettle();
      expect(contact.hitTestable(), findsOneWidget);
      await t.tap(contact);
      await t.pumpAndSettle();
      await t.scrollUntilVisible(find.textContaining('메일 앱을 열지 못했습니다.'), 250);
      await capture('support-failure');
      expect(find.textContaining('/Users/'), findsNothing);
      expect(t.takeException(), isNull);
    });
  }
}
