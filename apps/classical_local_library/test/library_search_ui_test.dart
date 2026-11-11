import 'dart:io';
import 'dart:ui' as ui;

import 'package:classical_local_library/library_search_backend.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'library_navigation_test.dart' as fixture;
import 'library_search_coordinator_test.dart' as search_fixture;

void complete(search_fixture.PendingSearchBackend backend) {
  final request = backend.requests.last;
  final index = request.$1.prepare();
  final results = index.search(request.$2);
  request.$3.complete(
    LibrarySearchBatch(results, index.fileIds(request.$2, results)),
  );
}

void main() {
  setUpAll(() async {
    for (final font in [
      ('DdiroriLibraryCapture', Platform.environment['DDIRORI_CAPTURE_FONT']),
      ('MaterialIcons', Platform.environment['DDIRORI_MATERIAL_FONT']),
    ]) {
      if (font.$2 != null) {
        await (FontLoader(font.$1)..addFont(
              File(font.$2!)
                  .readAsBytes()
                  .then((bytes) => ByteData.sublistView(bytes)),
            ))
            .load();
      }
    }
  });
  testWidgets(
    'busy and failed search permits playback controls, retries, and back restores unsubmitted draft',
    (tester) async {
      tester.view.physicalSize = const Size(390, 1000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final backend = search_fixture.PendingSearchBackend(),
          player = FakeLocalPlayer();
      await tester.pumpWidget(
        fixture.libraryApp(player: player, librarySearchBackend: backend),
      );
      await tester.pumpAndSettle();
      await fixture.openCategory(tester, 'songs');
      await tester.tap(find.text('Alpha'));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('내 음악 검색'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'Alpha');
      await tester.pump(const Duration(milliseconds: 200));
      expect(find.text('검색 정보를 준비하는 중입니다.'), findsOneWidget);
      final semantics = tester.ensureSemantics();
      try {
        await tester.pump();
        expect(find.bySemanticsLabel('음악 검색'), findsOneWidget);
      } finally {
        semantics.dispose();
      }
      await tester.tap(find.byTooltip('축약 일시정지'));
      await tester.pump();
      expect(player.playbackState.playerState, LocalPlayerState.paused);
      expect(player.playbackState.currentItem!.trackId, 'local-file:a');
      backend.requests.last.$3.completeError(
        StateError('/Users/private/music.flac'),
      );
      await tester.pumpAndSettle();
      expect(find.text('검색하지 못했습니다'), findsOneWidget);
      expect(find.textContaining('/Users/'), findsNothing);
      await tester.tap(find.text('다시 검색'));
      await tester.pump();
      complete(backend);
      await tester.pumpAndSettle();
      expect(find.byTooltip('Alpha 재생'), findsOneWidget);
      await tester.enterText(find.byType(TextField), 'Beta');
      await tester.pump();
      await tester.tap(find.byTooltip('재생 상세 열기'));
      await tester.pumpAndSettle();
      await tester.pageBack();
      await tester.pump();
      expect(
        tester.widget<TextField>(find.byType(TextField)).controller!.text,
        'Beta',
      );
      await tester.pump(const Duration(milliseconds: 200));
      complete(backend);
      await tester.pumpAndSettle();
      expect(find.byTooltip('Beta 재생'), findsOneWidget);
      expect(player.playbackState.playerState, LocalPlayerState.paused);
    },
  );

  for (final width in [320.0, 390.0, 1024.0]) {
    for (final scale in [1.0, 2.0]) {
      for (final brightness in Brightness.values) {
        final label = '${width.toInt()}-${scale.toInt()}-${brightness.name}';
        testWidgets('search states, large text and semantics $label', (
          tester,
        ) async {
          tester.view.physicalSize = Size(width, 1000);
          tester.view.devicePixelRatio = 1;
          tester.view.padding = const FakeViewPadding(bottom: 24);
          tester.platformDispatcher.textScaleFactorTestValue = scale;
          tester.platformDispatcher.platformBrightnessTestValue = brightness;
          tester.platformDispatcher.accessibilityFeaturesTestValue =
              FakeAccessibilityFeatures(disableAnimations: scale == 2);
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          addTearDown(tester.view.resetPadding);
          addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
          addTearDown(
            tester.platformDispatcher.clearPlatformBrightnessTestValue,
          );
          addTearDown(
            tester.platformDispatcher.clearAccessibilityFeaturesTestValue,
          );
          final backend = search_fixture.PendingSearchBackend();
          final key = GlobalKey();
          await tester.pumpWidget(
            RepaintBoundary(
              key: key,
              child: fixture.libraryApp(librarySearchBackend: backend),
            ),
          );
          await tester.pumpAndSettle();
          await tester.tap(find.byTooltip('내 음악 검색'));
          await tester.pumpAndSettle();
          Future<void> capture(String state) async {
            final path = Platform.environment['DDIRORI_LIBRARY_CAPTURE_OUTPUT'];
            if (path == null ||
                ![
                  '320-2-light',
                  '390-1-light',
                  '1024-2-dark',
                ].contains(label)) {
              return;
            }
            // Let the input label finish moving while the injected backend
            // deliberately remains pending; pumpAndSettle would wait forever.
            await tester.pump(const Duration(milliseconds: 250));
            await tester.runAsync(() async {
              final image =
                  await (key.currentContext!.findRenderObject()!
                          as RenderRepaintBoundary)
                      .toImage();
              final bytes = await image.toByteData(
                format: ui.ImageByteFormat.png,
              );
              await File('$path/search-$state-$label.png')
                  .writeAsBytes(bytes!.buffer.asUint8List());
              image.dispose();
            });
          }

          await capture('idle');
          await tester.enterText(find.byType(TextField), 'Alpha');
          await tester.pump(const Duration(milliseconds: 200));
          expect(find.text('검색 정보를 준비하는 중입니다.'), findsOneWidget);
          await capture('preparing');
          backend.requests.last.$3.completeError(StateError('fixture'));
          await tester.pumpAndSettle();
          expect(find.text('검색하지 못했습니다'), findsOneWidget);
          await capture('failed');
          await tester.ensureVisible(find.text('다시 검색'));
          await tester.tap(find.text('다시 검색'));
          await tester.pump();
          complete(backend);
          await tester.pumpAndSettle();
          await capture('ready');
          expect(find.byTooltip('Alpha 재생'), findsOneWidget);
          await tester.enterText(find.byType(TextField), 'no result');
          await tester.pump(const Duration(milliseconds: 200));
          expect(find.text('검색하는 중입니다.'), findsOneWidget);
          await capture('searching');
          complete(backend);
          await tester.pumpAndSettle();
          await capture('empty');
          expect(find.text('검색 결과가 없습니다.'), findsOneWidget);
          await tester.ensureVisible(find.text('검색 초기화'));
          await tester.tap(find.text('검색 초기화'));
          await tester.pumpAndSettle();
          expect(
            tester.widget<TextField>(find.byType(TextField)).controller!.text,
            isEmpty,
          );
          expect(tester.takeException(), isNull);
        });
      }
    }
  }
}
