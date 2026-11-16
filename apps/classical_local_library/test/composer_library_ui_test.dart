import 'dart:io';
import 'dart:ui' as ui;

import 'package:classical_local_library/audio_tags.dart';
import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'library_navigation_test.dart' as fixture;

const music = [
  LocalAudioFile(
    id: 'bach-1',
    path: '/fixture/a.wav',
    fileName: 'First.wav',
    format: 'wav',
    tagMetadata: AudioTagMetadata(
      title: 'First',
      album: 'Collection',
      albumArtist: 'Various',
      artist: 'Soloist A',
      composer: 'Bach',
      work: 'Suite',
      trackNumber: 1,
    ),
  ),
  LocalAudioFile(
    id: 'bach-2',
    path: '/fixture/b.wav',
    fileName: 'Second.wav',
    format: 'wav',
    tagMetadata: AudioTagMetadata(
      title: 'Second',
      album: 'Collection',
      albumArtist: 'Various',
      artist: 'Soloist B',
      composer: 'Bach',
      work: 'Suite',
      trackNumber: 2,
    ),
  ),
  LocalAudioFile(
    id: 'mozart',
    path: '/fixture/c.wav',
    fileName: 'Third.wav',
    format: 'wav',
    tagMetadata: AudioTagMetadata(
      title: 'Third',
      album: 'Collection',
      albumArtist: 'Various',
      composer: 'Mozart',
      trackNumber: 3,
    ),
  ),
];
Future<void> tap(WidgetTester t, Finder f) async {
  if (f.evaluate().isEmpty) {
    await t.scrollUntilVisible(
      f,
      200,
      scrollable: find.byType(Scrollable).hitTestable().first,
    );
  }
  await t.ensureVisible(f);
  await t.pumpAndSettle();
  await t.tap(f);
  await t.pumpAndSettle();
}

Future<void> capture(WidgetTester t, GlobalKey key, String name) async {
  final out = Platform.environment['DDIRORI_LIBRARY_CAPTURE_OUTPUT'];
  if (out == null ||
      !['390-1-light', '320-2-light', '1024-2-dark'].any(name.endsWith)) {
    return;
  }
  expect(Platform.environment['DDIRORI_CAPTURE_FONT'], isNotNull);
  expect(Platform.environment['DDIRORI_MATERIAL_FONT'], isNotNull);
  await t.pump(const Duration(milliseconds: 250));
  await t.runAsync(() async {
    final im =
        await (key.currentContext!.findRenderObject() as RenderRepaintBoundary)
            .toImage();
    final data = await im.toByteData(format: ui.ImageByteFormat.png);
    await Directory(out).create(recursive: true);
    await File('$out/$name.png').writeAsBytes(data!.buffer.asUint8List());
    im.dispose();
  });
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    for (final f in [
      ('DdiroriLibraryCapture', 'DDIRORI_CAPTURE_FONT'),
      ('MaterialIcons', 'DDIRORI_MATERIAL_FONT'),
    ]) {
      final path = Platform.environment[f.$2];
      if (path != null) {
        await (FontLoader(
          f.$1,
        )..addFont(File(path).readAsBytes().then(ByteData.sublistView))).load();
      }
    }
  });

  testWidgets(
    'composer group date sorting changes actual album order without playback commands',
    (t) async {
      final p = FakeLocalPlayer();
      const newest = LocalAudioFile(
        id: 'newest',
        path: '/fixture/new.wav',
        format: 'wav',
        modifiedAtMillis: 9999,
        tagMetadata: AudioTagMetadata(
          title: 'New song',
          album: 'Z New disc',
          composer: 'Bach',
        ),
      );
      await t.pumpWidget(
        fixture.libraryApp(player: p, libraryFiles: [...music, newest]),
      );
      await t.pumpAndSettle();
      await fixture.openCategory(t, 'composers');
      await tap(t, find.text('Bach'));
      expect(
        t.getTopLeft(find.text('Collection')).dy,
        lessThan(t.getTopLeft(find.text('Z New disc')).dy),
      );
      await tap(t, find.byTooltip('목록 정렬'));
      await tap(t, find.text('추가한 날짜'));
      expect(
        t.getTopLeft(find.text('Z New disc')).dy,
        lessThan(t.getTopLeft(find.text('Collection')).dy),
      );
      expect(p.queue, isEmpty);
    },
  );

  testWidgets(
    'missing prefix is excluded before mapping the chosen start index',
    (t) async {
      final p = FakeLocalPlayer(),
          files = [
            music.first.copyWith(availability: AudioFileAvailability.missing),
            ...music.skip(1),
          ];
      await t.pumpWidget(fixture.libraryApp(player: p, libraryFiles: files));
      await t.pumpAndSettle();
      await fixture.openCategory(t, 'songs');
      await tap(t, find.text('Third'));
      expect(p.queue.map((i) => i.trackId), [
        'local-file:bach-2',
        'local-file:mozart',
      ]);
      expect(p.currentIndex, 1);
      await p.previous();
      expect(p.currentIndex, 0);
      expect(p.currentItem!.trackId, 'local-file:bach-2');
    },
  );
  testWidgets(
    'composer album scope, full album and indexed queue preserve playback through return links',
    (t) async {
      final p = FakeLocalPlayer();
      await t.pumpWidget(fixture.libraryApp(player: p, libraryFiles: music));
      await t.pumpAndSettle();
      await fixture.openCategory(t, 'composers');
      await tap(t, find.text('Bach'));
      expect(find.text('Suite'), findsOneWidget);
      await tap(t, find.text('Collection'));
      expect(find.text('Third'), findsNothing);
      await tap(t, find.text('Second'));
      expect(p.queue.map((i) => i.trackId), [
        'local-file:bach-1',
        'local-file:bach-2',
      ]);
      expect(p.currentIndex, 1);
      await tap(t, find.text('앨범 전체 보기'));
      expect(find.text('Third'), findsOneWidget);
      expect(p.queue, hasLength(2));
      await tap(t, find.text('Third'));
      expect(p.queue, hasLength(3));
      expect(p.currentIndex, 2);
      await tap(t, find.byTooltip('재생 상세 열기'));
      await tap(t, find.text('작곡가 · Mozart'));
      expect(find.text('현재 재생'), findsNothing);
      await tap(t, find.byTooltip('뒤로'));
      await t.pumpAndSettle();
      expect(find.text('현재 재생'), findsWidgets);
      expect(p.currentIndex, 2);
      await p.pause();
      await t.pumpAndSettle();
      await tap(t, find.byKey(const ValueKey('now-playing-queue-0')));
      expect(p.currentIndex, 0);
      expect(p.state, LocalPlayerState.paused);
      expect(p.queue, hasLength(3));
    },
  );
  for (final width in [320.0, 390.0, 1024.0]) {
    for (final scale in [1.0, 2.0]) {
      for (final theme in Brightness.values) {
        final label = '${width.toInt()}-${scale.toInt()}-${theme.name}';
        testWidgets(
          'composer navigation and queue selection responsive $label',
          (t) async {
            t.view.physicalSize = Size(width, 1000);
            t.view.devicePixelRatio = 1;
            t.view.padding = const FakeViewPadding(bottom: 24);
            t.platformDispatcher.textScaleFactorTestValue = scale;
            t.platformDispatcher.platformBrightnessTestValue = theme;
            t.platformDispatcher.accessibilityFeaturesTestValue =
                FakeAccessibilityFeatures(disableAnimations: scale == 2);
            addTearDown(t.view.resetPhysicalSize);
            addTearDown(t.view.resetDevicePixelRatio);
            addTearDown(t.view.resetPadding);
            addTearDown(t.platformDispatcher.clearTextScaleFactorTestValue);
            addTearDown(t.platformDispatcher.clearPlatformBrightnessTestValue);
            addTearDown(
              t.platformDispatcher.clearAccessibilityFeaturesTestValue,
            );
            final key = GlobalKey(), p = FakeLocalPlayer();
            await t.pumpWidget(
              RepaintBoundary(
                key: key,
                child: fixture.libraryApp(player: p, libraryFiles: music),
              ),
            );
            await t.pumpAndSettle();
            await fixture.openCategory(t, 'composers');
            await tap(t, find.text('Bach'));
            await capture(t, key, 'composer-overview-$label');
            await tap(t, find.text('이 작곡가의 모든 곡'));
            await tap(t, find.text('Second'));
            expect(p.queue, hasLength(2));
            expect(p.currentIndex, 1);
            await tap(t, find.byTooltip('재생 상세 열기'));
            final row = find.byKey(const ValueKey('now-playing-queue-0'));
            await t.scrollUntilVisible(
              row,
              200,
              scrollable: find.byType(Scrollable).hitTestable().first,
            );
            await t.ensureVisible(row);
            await t.pumpAndSettle();
            final handle = t.ensureSemantics();
            try {
              expect(t.getSemantics(row).toStringDeep(), contains('tap'));
              expect(t.getSize(row).height, greaterThanOrEqualTo(48));
            } finally {
              handle.dispose();
            }
            await capture(t, key, 'composer-queue-$label');
            await tap(t, row);
            expect(p.currentIndex, 0);
            expect(p.state, LocalPlayerState.playing);
            expect(t.takeException(), isNull);
          },
        );
      }
    }
  }
}
