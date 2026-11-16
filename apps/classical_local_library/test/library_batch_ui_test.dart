import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/local_favorites.dart';
import 'package:classical_local_library/local_file_library.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/local_playlists.dart';
import 'package:classical_local_library/main.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/scan_locations.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'library_navigation_test.dart' as fixture;

class _Favorites extends MemoryLocalFavoritesStore {
  _Favorites([super.initial]);
  int saves = 0;
  bool fail = false, failRefresh = false, saved = false;
  Completer<void>? gate;
  @override
  Future<void> save(Set<String> ids) async {
    saves++;
    await gate?.future;
    if (fail) throw StateError('injected');
    await super.save(ids);
    saved = true;
  }

  @override
  Future<Set<String>> load() async {
    if (saved && failRefresh) throw StateError('injected refresh');
    return super.load();
  }
}

Widget _app({
  FakeLocalPlayer? player,
  _Favorites? favorites,
  LocalPlaylistRepository? playlists,
  ScannedAudioRepository? scanned,
  List<LocalAudioFile> files = fixture.files,
}) => ClassicalLocalLibraryApp(
  fontFamily: 'DdiroriLibraryCapture',
  initialLibrary: emptyClassicalLibrary,
  enableDemoFeatures: false,
  playbackController: player ?? FakeLocalPlayer(),
  localFavoritesRepository: LocalFavoritesRepository(favorites ?? _Favorites()),
  localPlaylistRepository:
      playlists ?? LocalPlaylistRepository(MemoryLocalPlaylistStore()),
  scanRepository:
      scanned ?? ScannedAudioRepository(MemoryScannedAudioStore(files)),
  scanLocationRepository: ScanLocationRepository(MemoryScanLocationStore()),
  metadataCandidateRepository: MetadataCandidateRepository(
    MemoryMetadataCandidateStore(),
  ),
  fileTrackLinkRepository: AudioFileTrackLinkRepository(
    MemoryAudioFileTrackLinkStore(),
  ),
  supportsFolderScan: false,
);

List<LocalPlaybackQueueItem> _queue() => const LocalFileLibrary().queue(
  const LocalFileLibrary().entries(files: fixture.files),
);

Future<void> _tap(WidgetTester tester, Finder target) async {
  if (target.evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      target,
      250,
      scrollable: find.byType(Scrollable).first,
    );
  }
  await tester.ensureVisible(target);
  await tester.pumpAndSettle();
  await tester.tap(target);
  await tester.pumpAndSettle();
}

Future<void> _select(WidgetTester t) async {
  await _tap(t, find.text('여러 곡 선택'));
  await _tap(t, find.text('현재 결과 모두 선택'));
}

Future<void> _action(WidgetTester t, String label) async {
  await _tap(t, find.byTooltip('선택한 곡 작업'));
  await _tap(t, find.text(label));
}

Future<void> _saveQueue(WidgetTester t) async {
  await _tap(t, find.byTooltip('재생 상세 열기'));
  await _tap(
    t,
    find.byWidgetPredicate(
      (w) => w is DdiroriButton && w.label == '대기열을 재생목록으로 저장',
    ),
  );
}

Future<void> _capture(WidgetTester tester, GlobalKey key, String name) async {
  final output = Platform.environment['DDIRORI_LIBRARY_CAPTURE_OUTPUT'];
  if (output == null ||
      !['390-1-light', '320-2-light', '1024-2-dark'].any(name.endsWith)) {
    return;
  }
  expect(Platform.environment['DDIRORI_CAPTURE_FONT'], isNotNull);
  expect(Platform.environment['DDIRORI_MATERIAL_FONT'], isNotNull);
  await tester.pump(const Duration(milliseconds: 250));
  await tester.runAsync(() async {
    final image =
        await (key.currentContext!.findRenderObject()! as RenderRepaintBoundary)
            .toImage();
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    await Directory(output).create(recursive: true);
    await File('$output/$name.png').writeAsBytes(data!.buffer.asUint8List());
    image.dispose();
  });
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    for (final font in [
      ('DdiroriLibraryCapture', 'DDIRORI_CAPTURE_FONT'),
      ('MaterialIcons', 'DDIRORI_MATERIAL_FONT'),
    ]) {
      final path = Platform.environment[font.$2];
      if (path != null) {
        await (FontLoader(
          font.$1,
        )..addFont(File(path).readAsBytes().then(ByteData.sublistView))).load();
      }
    }
  });

  testWidgets(
    'selection survives search/sort; reserve preserves paused queue and position',
    (t) async {
      final p = FakeLocalPlayer();
      await p.loadQueue(_queue());
      await p.play();
      await p.pause();
      await p.seek(const Duration(seconds: 7));
      await t.pumpWidget(_app(player: p));
      await t.pumpAndSettle();
      await fixture.openCategory(t, 'songs');
      await _select(t);
      expect(p.playbackState.position.inSeconds, 7);
      await t.enterText(find.byType(TextField).first, 'Alpha');
      await t.pumpAndSettle();
      expect(find.text('2곡 선택 · 검색 밖 1곡 포함'), findsOneWidget);
      await _tap(t, find.byTooltip('곡 정렬'));
      await _tap(t, find.text('아티스트'));
      expect(find.text('2곡 선택 · 검색 밖 1곡 포함'), findsOneWidget);
      await _action(t, '바로 다음에 재생');
      expect(p.queue.map((i) => i.trackId), [
        'local-file:a',
        'local-file:a',
        'local-file:b',
        'local-file:b',
      ]);
      expect(p.state, LocalPlayerState.paused);
      expect(p.playbackState.position.inSeconds, 7);
      expect(find.text('선택 종료'), findsNothing);
      await _select(t);
      await _action(t, '선택한 곡 재생');
      expect(p.queue.map((i) => i.trackId), ['local-file:a']);
      expect(p.state, LocalPlayerState.playing);
    },
  );

  testWidgets(
    'offscreen all-results selection covers every ID without eager rows',
    (t) async {
      final files = [
        for (var i = 0; i < 180; i++)
          LocalAudioFile(
            id: 'f$i',
            path: '/fixture/f$i.wav',
            fileName: 'Song ${i.toString().padLeft(3, '0')}.wav',
            format: 'wav',
          ),
      ];
      final store = _Favorites();
      final p = FakeLocalPlayer();
      await t.pumpWidget(_app(files: files, favorites: store, player: p));
      await t.pumpAndSettle();
      await fixture.openCategory(t, 'songs');
      await _select(t);
      expect(find.byType(DdiroriItem).evaluate().length, lessThan(35));
      expect(find.text('180곡 선택'), findsOneWidget);
      await _action(t, '즐겨찾기 추가');
      expect(await store.load(), files.map((f) => f.id).toSet());
      expect(store.saves, 1);
      expect(p.queue, isEmpty);
    },
  );

  testWidgets(
    'atomic favorite failure keeps selection; busy disables it; refresh failure stays committed',
    (t) async {
      final store = _Favorites()..fail = true;
      await t.pumpWidget(_app(favorites: store));
      await t.pumpAndSettle();
      await fixture.openCategory(t, 'songs');
      await _select(t);
      await _action(t, '즐겨찾기 추가');
      expect(find.text('2곡 선택'), findsOneWidget);
      expect(await store.load(), isEmpty);
      store.fail = false;
      store.failRefresh = true;
      store.gate = Completer<void>();
      await _tap(t, find.byTooltip('선택한 곡 작업'));
      await t.tap(find.text('즐겨찾기 추가'));
      await t.pump();
      final row = t.widget<DdiroriItem>(
        find.byKey(const ValueKey('select-file-a')),
      );
      expect(row.enabled, isFalse);
      store.gate!.complete();
      await t.pumpAndSettle();
      expect(find.text('선택 종료'), findsNothing);
      expect(store.saves, 2);
      expect(find.textContaining('저장은 완료'), findsWidgets);
      store.failRefresh = false;
      expect(await store.load(), {'a', 'b'});
    },
  );

  testWidgets(
    'favorites selection can remove many and exit without changing playback',
    (t) async {
      final store = _Favorites({'a', 'b'});
      final p = FakeLocalPlayer();
      await p.loadQueue(_queue());
      await t.pumpWidget(_app(favorites: store, player: p));
      await t.pumpAndSettle();
      await fixture.openCategory(t, 'favorites');
      await _select(t);
      await _tap(t, find.byKey(const ValueKey('select-file-a')));
      expect(p.state, LocalPlayerState.ready);
      await _tap(t, find.text('전체 선택 해제'));
      expect(find.text('0곡 선택'), findsOneWidget);
      await _tap(t, find.text('현재 결과 모두 선택'));
      await _action(t, '즐겨찾기 해제');
      expect(await store.load(), isEmpty);
      expect(store.saves, 1);
      expect(find.text('즐겨찾는 곡을 모아보세요'), findsOneWidget);
      expect(p.queue, hasLength(2));
    },
  );

  testWidgets(
    'queue snapshot survives track changes; failed creation keeps name and success offers view',
    (t) async {
      final p = FakeLocalPlayer();
      final q = _queue();
      await p.loadQueue([q[1], q[0], q[1]]);
      await p.play();
      final store = fixture.ControlledPlaylistStore()..failSave = true;
      await t.pumpWidget(
        _app(player: p, playlists: LocalPlaylistRepository(store)),
      );
      await t.pumpAndSettle();
      await _saveQueue(t);
      expect(find.textContaining('중복 1곡'), findsWidgets);
      await p.next();
      await t.pump();
      await _tap(t, find.text('전체 대기열 저장'));
      await _tap(t, find.text('새 재생목록'));
      await t.enterText(find.byType(TextField).last, '대기열 보관');
      await _tap(t, find.text('저장'));
      expect(find.text('대기열 보관'), findsOneWidget);
      expect(await store.load(), isEmpty);
      store.failSave = false;
      await _tap(t, find.text('저장'));
      expect((await store.load()).single.fileIds, ['b', 'a']);
      expect(find.text('보기'), findsWidgets);
      expect(find.text('현재 재생'), findsWidgets);
      expect(p.queue, [q[1], q[0], q[1]]);
      expect(p.currentIndex, 1);
      expect(p.state, LocalPlayerState.playing);
    },
  );

  testWidgets(
    'changed file state rejects final save and retains draft without touching player',
    (t) async {
      final scanned = ScannedAudioRepository(
        MemoryScannedAudioStore(fixture.files),
      );
      final p = FakeLocalPlayer();
      await p.loadQueue(_queue());
      final store = MemoryLocalPlaylistStore();
      await t.pumpWidget(
        _app(
          player: p,
          scanned: scanned,
          playlists: LocalPlaylistRepository(store),
        ),
      );
      await t.pumpAndSettle();
      await _saveQueue(t);
      await _tap(t, find.text('현재 곡부터 남은 대기열 저장'));
      await _tap(t, find.text('새 재생목록'));
      await t.enterText(find.byType(TextField).last, '유지할 이름');
      await scanned.replaceAll([fixture.files.first]);
      await _tap(t, find.text('저장'));
      expect(find.textContaining('파일 상태가 바뀌었습니다'), findsOneWidget);
      expect(find.text('유지할 이름'), findsOneWidget);
      expect(await store.load(), isEmpty);
      expect(p.queue, hasLength(2));
      expect(p.state, LocalPlayerState.ready);
    },
  );

  testWidgets(
    'remaining queue adds once to existing list despite refresh failure and blocks duplicate dialog',
    (t) async {
      final p = FakeLocalPlayer();
      final q = _queue();
      await p.loadQueue([q[1], q[0], q[1]]);
      await p.next();
      final store = fixture.ControlledPlaylistStore([
        fixture.playlist(ids: ['b']),
      ])..failRefresh = true;
      await t.pumpWidget(
        _app(player: p, playlists: LocalPlaylistRepository(store)),
      );
      await t.pumpAndSettle();
      await _tap(t, find.byTooltip('재생 상세 열기'));
      final button = t.widget<DdiroriButton>(
        find.byWidgetPredicate(
          (w) => w is DdiroriButton && w.label == '대기열을 재생목록으로 저장',
        ),
      );
      final one = Future<void>.sync(() => button.onPressed!());
      await Future<void>.sync(() => button.onPressed!());
      await t.pumpAndSettle();
      expect(find.byType(AlertDialog), findsOneWidget);
      await _tap(t, find.text('현재 곡부터 남은 대기열 저장'));
      await _tap(t, find.text('저녁'));
      await one;
      expect(store.saveCount, 1);
      expect(find.textContaining('저장은 완료'), findsWidgets);
      store.failRefresh = false;
      expect((await store.load()).single.fileIds, ['b', 'a']);
      expect(p.currentIndex, 1);
      expect(p.state, LocalPlayerState.ready);
    },
  );

  testWidgets(
    'playlist cancellation keeps selection; late save after dispose has no stale UI',
    (t) async {
      final store = fixture.ControlledPlaylistStore([fixture.playlist()]);
      await t.pumpWidget(_app(playlists: LocalPlaylistRepository(store)));
      await t.pumpAndSettle();
      await fixture.openCategory(t, 'songs');
      await _select(t);
      await _action(t, '재생목록에 추가');
      await t.tapAt(const Offset(5, 5));
      await t.pumpAndSettle();
      expect(find.text('2곡 선택'), findsOneWidget);
      store.gate = Completer<void>();
      await _action(t, '재생목록에 추가');
      await t.tap(find.text('저녁'));
      await t.pump();
      await t.pumpWidget(const SizedBox.shrink());
      store.gate!.complete();
      await t.pumpAndSettle();
      expect((await store.load()).single.fileIds, ['a', 'b']);
      expect(t.takeException(), isNull);
    },
  );

  for (final width in [320.0, 390.0, 1024.0]) {
    for (final scale in [1.0, 2.0]) {
      for (final theme in Brightness.values) {
        final label = '${width.toInt()}-${scale.toInt()}-${theme.name}';
        testWidgets('selection and queue save layouts and semantics $label', (
          t,
        ) async {
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
          addTearDown(t.platformDispatcher.clearAccessibilityFeaturesTestValue);
          final key = GlobalKey();
          final p = FakeLocalPlayer();
          await p.loadQueue(_queue());
          final semantics = t.ensureSemantics();
          await t.pumpWidget(
            RepaintBoundary(
              key: key,
              child: _app(player: p),
            ),
          );
          await t.pumpAndSettle();
          await fixture.openCategory(t, 'songs');
          await _select(t);
          expect(
            t
                .getSemantics(find.byKey(const ValueKey('select-file-a')))
                .toStringDeep(),
            contains('isChecked'),
          );
          semantics.dispose();
          expect(
            t.getSize(find.byKey(const ValueKey('select-file-a'))).height,
            greaterThanOrEqualTo(48),
          );
          await _capture(t, key, 'batch-selection-$label');
          await _tap(t, find.text('선택 종료'));
          await _saveQueue(t);
          expect(find.text('전체 대기열 저장').hitTestable(), findsOneWidget);
          expect(find.text('현재 곡부터 남은 대기열 저장').hitTestable(), findsOneWidget);
          await _capture(t, key, 'batch-save-queue-$label');
          await _tap(t, find.text('취소'));
          expect(p.state, LocalPlayerState.ready);
          expect(t.takeException(), isNull);
        });
      }
    }
  }
}
