import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const qaFont = String.fromEnvironment('CLEF_QA_FONT');
  setUpAll(() async {
    if (qaFont.isEmpty) return;
    final font = FontLoader('ClefQaFont')
      ..addFont(
        File(qaFont).readAsBytes().then((bytes) => bytes.buffer.asByteData()),
      );
    await font.load();
    await (FontLoader(
      'MaterialIcons',
    )..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'))).load();
  });
  for (final size in [
    const Size(360, 800),
    const Size(800, 360),
    const Size(800, 1280),
    const Size(1280, 800),
    const Size(1600, 1000),
  ]) {
    for (final scale in [1.0, 1.6]) {
      testWidgets('named tools are reachable at $size scale=$scale', (
        tester,
      ) async {
        SharedPreferences.setMockInitialValues({});
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final now = DateTime(2026, 9, 15);
        final store = SheetLibraryStore();
        await store.saveScores([
          SheetScore(
            id: 'score',
            title: 'Concert',
            composer: '',
            tags: const [],
            note: '',
            filePath: '/tmp/clef-missing-tools-fixture.pdf',
            importedAt: now,
            updatedAt: now,
            lastOpenedAt: null,
            lastPage: 1,
            isFavorite: false,
            bookmarks: const [],
          ),
        ]);
        final controller = SheetLibraryController(store: store);
        await controller.load();
        final captureKey = GlobalKey();
        await tester.runAsync(() async {
          await tester.pumpWidget(
            RepaintBoundary(
              key: captureKey,
              child: MaterialApp(
                debugShowCheckedModeBanner: false,
                theme: ThemeData(
                  colorScheme: ColorScheme.fromSeed(
                    seedColor: const Color(0xff2f6f73),
                  ),
                  scaffoldBackgroundColor: const Color(0xfffbfbf7),
                  useMaterial3: true,
                  fontFamily: qaFont.isEmpty ? null : 'ClefQaFont',
                ),
                builder: (context, child) => MediaQuery(
                  data: MediaQuery.of(context)
                      .copyWith(textScaler: TextScaler.linear(scale)),
                  child: child!,
                ),
                home: SheetViewerScreen(
                  controller: controller,
                  scoreId: 'score',
                ),
              ),
            ),
          );
          await Future<void>.delayed(const Duration(milliseconds: 50));
        });
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull, reason: 'initial viewer');
        final tools = find.byTooltip('악보 도구');
        expect(find.text('도구'), findsOneWidget);
        final rect = tester.getRect(tools);
        expect(rect.left, greaterThanOrEqualTo(0));
        expect(rect.right, lessThanOrEqualTo(size.width));
        expect(rect.height, greaterThanOrEqualTo(48));
        await tester.tap(find.text('도구'));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull, reason: 'tools menu');
        expect(find.text('연습과 공연'), findsOneWidget);
        expect(find.text('악보 정보'), findsOneWidget);
        expect(find.text('보기와 넘김'), findsOneWidget);
        expect(find.text('필기'), findsOneWidget);
        expect(find.text('공유와 입력'), findsOneWidget);
        const captureDirectory = String.fromEnvironment(
          'CLEF_QA_SCREENSHOT_DIR',
        );
        Future<void> capture(String name) async {
          if (captureDirectory.isEmpty) return;
          await tester.runAsync(() async {
            final boundary =
                captureKey.currentContext!.findRenderObject()!
                    as RenderRepaintBoundary;
            final image = await boundary.toImage();
            final bytes = await image.toByteData(
              format: ui.ImageByteFormat.png,
            );
            final directory = await Directory(captureDirectory)
                .create(recursive: true);
            await File(
              '${directory.path}/$name-${size.width.toInt()}x${size.height.toInt()}-$scale.png',
            ).writeAsBytes(bytes!.buffer.asUint8List());
            image.dispose();
          });
        }

        await capture('tools');
        await tester.ensureVisible(find.text('메트로놈'));
        await tester.tap(find.text('메트로놈'));
        await tester.pumpAndSettle();
        expect(find.text('시작'), findsOneWidget);
        expect(tester.takeException(), isNull);
        expect(find.text('작은 창').hitTestable(), findsOneWidget);
        await capture('metronome');
        await tester.tap(find.text('작은 창'));
        await tester.pumpAndSettle();
        expect(find.byType(BottomSheet), findsNothing);
        expect(
          find.byWidgetPredicate(
            (widget) =>
                widget is Semantics &&
                widget.properties.label == '메트로놈 시각 박자 표시',
          ),
          findsOneWidget,
        );
        expect(find.text('시작'), findsOneWidget);
        await capture('mini');
        await tester.tap(find.byTooltip('닫기'));
        await tester.pumpAndSettle();
        expect(find.text('시작'), findsNothing);
        await tester.tap(find.text('도구'));
        await tester.pumpAndSettle();
        await tester.ensureVisible(find.text('필기 모드'));
        await tester.tap(find.text('필기 모드'));
        await tester.pumpAndSettle();
        expect(find.byTooltip('펜'), findsWidgets);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
        controller.dispose();
      });
    }
  }

  testWidgets('crop preset save failure shows retry notice', (tester) async {
    SharedPreferences.setMockInitialValues({});
    tester.view.physicalSize = const Size(1600, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final now = DateTime(2026, 9, 16);
    final store = _FailingScoreSaveStore();
    await store.saveScores([
      SheetScore(
        id: 'score',
        title: 'Concert',
        composer: '',
        tags: const [],
        note: '',
        filePath: '/tmp/clef-missing-crop-preset-fixture.pdf',
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: null,
        lastPage: 1,
        isFavorite: false,
        bookmarks: const [],
      ),
    ]);
    final controller = SheetLibraryController(store: store);
    await controller.load();
    await tester.runAsync(() async {
      await tester.pumpWidget(
        MaterialApp(
          home: SheetViewerScreen(controller: controller, scoreId: 'score'),
        ),
      );
      await Future<void>.delayed(const Duration(milliseconds: 50));
    });
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('페이지 정리'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('자르기 프리셋'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('현재 자르기 값을 프리셋으로 저장'));
    await tester.pumpAndSettle();
    store.failNextSave = true;
    await tester.tap(find.widgetWithText(FilledButton, '저장'));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.text('자르기 프리셋을 저장하지 못했습니다. 다시 시도해주세요.'), findsOneWidget);
    expect(controller.scores.single.pageSettings.cropPresets, isEmpty);

    await tester.pumpWidget(const SizedBox());
    controller.dispose();
  });
}

class _FailingScoreSaveStore extends SheetLibraryStore {
  bool failNextSave = false;

  @override
  Future<void> saveScores(List<SheetScore> scores, {String? libraryId}) async {
    if (failNextSave) {
      failNextSave = false;
      throw StateError('score save failed');
    }
    return super.saveScores(scores, libraryId: libraryId);
  }
}
