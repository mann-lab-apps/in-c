import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/app_settings.dart';
import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/imslp.dart';
import 'package:classical_local_library/imslp_download.dart';
import 'package:classical_local_library/imslp_library.dart';
import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/library_management.dart';
import 'package:classical_local_library/local_audio_import.dart';
import 'package:classical_local_library/local_audio_scanner.dart';
import 'package:classical_local_library/local_data_control.dart';
import 'package:classical_local_library/local_favorites.dart';
import 'package:classical_local_library/local_file_library.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/local_playlists.dart';
import 'package:classical_local_library/main.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/sample_classical_library.dart';
import 'package:classical_local_library/scan_locations.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'library_navigation_test.dart' as fixture;

class _FavoritesStore extends MemoryLocalFavoritesStore {
  _FavoritesStore([super.initial]);
  bool failSave = false, failLoad = false;
  bool failReadAfterSave = false;
  int saves = 0, loads = 0;
  Completer<void>? gate;

  @override
  Future<Set<String>> load() async {
    loads++;
    if (failLoad) throw StateError('fixture read failure');
    return super.load();
  }

  @override
  Future<void> save(Set<String> ids) async {
    saves++;
    await gate?.future;
    if (failSave) throw StateError('fixture write failure');
    await super.save(ids);
    if (failReadAfterSave) failLoad = true;
  }
}

class _UiPlayer extends FakeLocalPlayer {
  _UiPlayer() {
    subscription = super.states.listen((state) {
      overlay = null;
      events.add(state);
    });
  }
  final events = StreamController<LocalPlaybackState>.broadcast(sync: true);
  late final StreamSubscription<LocalPlaybackState> subscription;
  LocalPlaybackState? overlay;
  @override
  LocalPlaybackState get playbackState => overlay ?? super.playbackState;
  @override
  Stream<LocalPlaybackState> get states => events.stream;
  void publish(LocalPlaybackState state) {
    overlay = state;
    events.add(state);
  }

  @override
  Future<void> dispose() async {
    await subscription.cancel();
    await super.dispose();
    await events.close();
  }
}

Widget _app({
  LocalPlaybackController? player,
  LocalFavoritesRepository? favorites,
  List<LocalAudioFile> files = fixture.files,
  ClassicalLibrary library = emptyClassicalLibrary,
  PlaybackQueueSnapshotStore? queueStore,
  AudioFileTrackLinkRepository? links,
  ScannedAudioRepository? scanned,
  LocalAudioImportController? importer,
  AudioFilePicker? picker,
  ImslpImportCoordinator? imslpCoordinator,
  LocalPlaylistRepository? playlists,
  LocalDataControlService? dataControl,
}) => ClassicalLocalLibraryApp(
  fontFamily: 'DdiroriLibraryCapture',
  initialLibrary: library,
  enableDemoFeatures: false,
  playbackController: player ?? FakeLocalPlayer(),
  playbackQueueSnapshotStore: queueStore,
  localFavoritesRepository:
      favorites ?? LocalFavoritesRepository(_FavoritesStore()),
  localPlaylistRepository: playlists,
  scanRepository:
      scanned ?? ScannedAudioRepository(MemoryScannedAudioStore(files)),
  scanLocationRepository: ScanLocationRepository(MemoryScanLocationStore()),
  metadataCandidateRepository: MetadataCandidateRepository(
    MemoryMetadataCandidateStore(),
  ),
  fileTrackLinkRepository:
      links ?? AudioFileTrackLinkRepository(MemoryAudioFileTrackLinkStore()),
  localAudioImportCoordinator: importer,
  audioFilePicker: picker,
  imslpStore: MemoryImslpStore(),
  imslpCatalogClient: const _Catalog(),
  imslpImportCoordinator: imslpCoordinator,
  supportsFolderScan: false,
  localDataControlService: dataControl,
);

List<LocalPlaybackQueueItem> _queue([
  List<LocalAudioFile> files = fixture.files,
]) => const LocalFileLibrary().queue(
  const LocalFileLibrary().entries(files: files, candidates: const []),
);

Future<void> _tap(WidgetTester tester, String tooltip) async {
  final finder = find.byTooltip(tooltip).first;
  if (finder.evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      finder,
      250,
      scrollable: find.byType(Scrollable).first,
    );
  }
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

Future<void> _songAction(
  WidgetTester tester,
  String title,
  String action,
) async {
  await _tap(tester, '$title 더보기');
  await tester.tap(find.text(action));
  await tester.pumpAndSettle();
}

Future<void> _capture(WidgetTester tester, GlobalKey key, String name) async {
  final output = Platform.environment['DDIRORI_LIBRARY_CAPTURE_OUTPUT'];
  if (output == null) return;
  if (!['390-1-light', '320-2-light', '1024-2-dark'].any(name.endsWith)) return;
  if (Platform.environment['DDIRORI_CAPTURE_FONT'] == null ||
      Platform.environment['DDIRORI_MATERIAL_FONT'] == null) {
    fail('Capture output requires the standard real text and Material fonts.');
  }
  await tester.pump(const Duration(milliseconds: 250));
  await tester.runAsync(() async {
    final image =
        await (key.currentContext!.findRenderObject()! as RenderRepaintBoundary)
            .toImage();
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    await Directory(output).create(recursive: true);
    await File('$output/$name.png').writeAsBytes(bytes!.buffer.asUint8List());
    image.dispose();
  });
}

void main() {
  testWidgets(
    'committed favorite survives refresh failure and reload is not a second mutation',
    (tester) async {
      tester.view.physicalSize = const Size(390, 1000);
      final boundary = GlobalKey();
      final store = _FavoritesStore()..failReadAfterSave = true;
      final repository = LocalFavoritesRepository(store);
      final player = FakeLocalPlayer();
      await player.loadQueue(_queue());
      await tester.pumpWidget(
        RepaintBoundary(
          key: boundary,
          child: _app(player: player, favorites: repository),
        ),
      );
      await tester.pumpAndSettle();
      await _tap(tester, '재생 상세 열기');
      await _tap(tester, '현재 곡 즐겨찾기 추가');
      expect(repository.lastSaved, {'a'});
      expect(find.byTooltip('현재 곡 즐겨찾기 해제'), findsOneWidget);
      expect(find.textContaining('저장은 완료했습니다'), findsOneWidget);
      expect(find.textContaining('저장하지 못했습니다'), findsNothing);
      await _capture(tester, boundary, 'favorite-refresh-failure-390-1-light');
      await tester.pageBack();
      await tester.pumpAndSettle();
      await fixture.openCategory(tester, 'favorites');
      expect(find.byTooltip('Alpha 재생'), findsOneWidget);
      store.failLoad = false;
      await tester.tap(find.text('즐겨찾기 다시 불러오기'));
      await tester.pumpAndSettle();
      expect(store.saves, 1);
      expect(find.textContaining('저장은 완료했습니다'), findsNothing);
      expect(find.byTooltip('Alpha 재생'), findsOneWidget);
      expect(player.state, LocalPlayerState.ready);
      expect(player.queue, hasLength(_queue().length));
    },
  );
  setUp(() {
    final view =
        TestWidgetsFlutterBinding.instance.platformDispatcher.views.first;
    view.physicalSize = const Size(390, 1000);
    view.devicePixelRatio = 1;
    addTearDown(view.resetPhysicalSize);
    addTearDown(view.resetDevicePixelRatio);
  });
  setUpAll(() async {
    for (final font in [
      ('DdiroriLibraryCapture', Platform.environment['DDIRORI_CAPTURE_FONT']),
      ('MaterialIcons', Platform.environment['DDIRORI_MATERIAL_FONT']),
    ]) {
      if (font.$2 != null) {
        await (FontLoader(
              font.$1,
            )..addFont(File(font.$2!).readAsBytes().then(ByteData.sublistView)))
            .load();
      }
    }
  });

  testWidgets(
    'favorite publishes only persisted state, blocks duplicates and retries failure',
    (tester) async {
      final store = _FavoritesStore();
      final repository = LocalFavoritesRepository(store);
      final p = FakeLocalPlayer(
        trackDurations: {'local-file:a': const Duration(minutes: 2)},
      );
      await p.loadQueue(_queue());
      await p.play();
      await p.seek(const Duration(seconds: 11));
      await p.pause();
      await tester.pumpWidget(_app(player: p, favorites: repository));
      await tester.pumpAndSettle();
      await _tap(tester, '재생 상세 열기');
      final queue = p.queue;
      final beforeLoads = store.loads;
      store.gate = Completer<void>();
      await tester.ensureVisible(find.byTooltip('현재 곡 즐겨찾기 추가'));
      await tester.tap(find.byTooltip('현재 곡 즐겨찾기 추가'));
      await tester.pump();
      expect(
        tester
            .widget<DdiroriIconButton>(
              find.byWidgetPredicate(
                (w) => w is DdiroriIconButton && w.label == '현재 곡 즐겨찾기 추가',
              ),
            )
            .onPressed,
        isNull,
      );
      expect(store.saves, 1);
      expect(repository.lastSaved, isNull);
      store.gate!.complete();
      await tester.pumpAndSettle();
      expect(store.loads, greaterThanOrEqualTo(beforeLoads + 2));
      expect(find.byTooltip('현재 곡 즐겨찾기 해제'), findsOneWidget);
      expect(await repository.load(), {'a'});
      store.gate = null;
      store.failSave = true;
      await _tap(tester, '현재 곡 즐겨찾기 해제');
      expect(await repository.load(), {'a'});
      expect(find.byTooltip('현재 곡 즐겨찾기 해제'), findsOneWidget);
      expect(find.textContaining('즐겨찾기를 저장하지 못했습니다'), findsOneWidget);
      store.failSave = false;
      await _tap(tester, '현재 곡 즐겨찾기 해제');
      expect(await repository.load(), isEmpty);
      expect(find.byTooltip('현재 곡 즐겨찾기 추가'), findsOneWidget);
      expect(p.queue, same(queue));
      expect(p.playbackState.position.inSeconds, 11);
      expect(p.state, LocalPlayerState.paused);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'favorites list empty data search sort and save errors preserve route and selection',
    (tester) async {
      final store = _FavoritesStore({'a', 'b'});
      final p = FakeLocalPlayer();
      await tester.pumpWidget(
        _app(player: p, favorites: LocalFavoritesRepository(store)),
      );
      await tester.pumpAndSettle();
      await fixture.openCategory(tester, 'favorites');
      expect(find.byTooltip('Alpha 재생'), findsOneWidget);
      expect(find.text('Beta'), findsOneWidget);
      await tester.enterText(find.byType(TextField).first, 'Beta');
      await tester.pumpAndSettle();
      expect(find.text('Alpha'), findsNothing);
      await _songAction(tester, 'Beta', '즐겨찾기 해제');
      expect(find.text('검색 결과가 없습니다'), findsOneWidget);
      expect(
        tester.widget<TextField>(find.byType(TextField).first).controller!.text,
        'Beta',
      );
      await tester.enterText(find.byType(TextField).first, '');
      await tester.pumpAndSettle();
      store.failSave = true;
      await _songAction(tester, 'Alpha', '즐겨찾기 해제');
      expect(find.byTooltip('Alpha 재생'), findsOneWidget);
      expect(find.text('즐겨찾기 다시 불러오기'), findsOneWidget);
      store.failSave = false;
      await _songAction(tester, 'Alpha', '즐겨찾기 해제');
      expect(find.text('즐겨찾는 곡을 모아보세요'), findsOneWidget);
      expect(p.queue, isEmpty);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.byTooltip('도구 더보기'), findsOneWidget);
    },
  );

  testWidgets(
    'favorite load failure is recoverable without hiding the rest of the library',
    (tester) async {
      final store = _FavoritesStore({'a'})..failLoad = true;
      await tester.pumpWidget(_app(favorites: LocalFavoritesRepository(store)));
      await tester.pumpAndSettle();
      await fixture.openCategory(tester, 'favorites');
      expect(find.textContaining('즐겨찾기를 불러오지 못했습니다'), findsOneWidget);
      expect(find.text('즐겨찾는 곡을 모아보세요'), findsNothing);
      store.failLoad = false;
      await tester.tap(find.text('즐겨찾기 다시 불러오기'));
      await tester.pumpAndSettle();
      expect(find.text('Alpha'), findsOneWidget);
    },
  );

  testWidgets(
    'current favorite is hidden when the current track has no local file ID',
    (tester) async {
      final p = FakeLocalPlayer();
      await p.loadQueue(_queue());
      await tester.pumpWidget(_app(player: p, files: const []));
      await tester.pumpAndSettle();
      await _tap(tester, '재생 상세 열기');
      expect(find.byTooltip('현재 곡 즐겨찾기 추가'), findsNothing);
      expect(find.byTooltip('현재 곡 즐겨찾기 해제'), findsNothing);
      expect(p.state, LocalPlayerState.ready);
    },
  );

  testWidgets(
    'late favorite success after route pop updates the list, after dispose does not touch UI',
    (tester) async {
      final store = _FavoritesStore();
      final p = FakeLocalPlayer();
      await p.loadQueue(_queue());
      await tester.pumpWidget(
        _app(player: p, favorites: LocalFavoritesRepository(store)),
      );
      await tester.pumpAndSettle();
      await _tap(tester, '재생 상세 열기');
      store.gate = Completer<void>();
      await tester.ensureVisible(find.byTooltip('현재 곡 즐겨찾기 추가'));
      await tester.tap(find.byTooltip('현재 곡 즐겨찾기 추가'));
      await tester.pump();
      await tester.pageBack();
      await tester.pump(const Duration(seconds: 1));
      store.gate!.complete();
      await tester.pumpAndSettle();
      await fixture.openCategory(tester, 'favorites');
      expect(find.byTooltip('Alpha 재생'), findsOneWidget);
      store.gate = Completer<void>();
      await _tap(tester, 'Alpha 더보기');
      await tester.tap(find.text('즐겨찾기 해제'));
      await tester.pump();
      await tester.pumpWidget(const SizedBox.shrink());
      store.gate!.complete();
      await tester.pumpAndSettle();
      expect(await store.load(), isEmpty);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'song search and playlist share the file favorite and current player state',
    (tester) async {
      final repository = LocalFavoritesRepository(_FavoritesStore());
      final p = FakeLocalPlayer();
      await p.loadQueue(_queue());
      await tester.pumpWidget(
        _app(
          player: p,
          favorites: repository,
          playlists: LocalPlaylistRepository(
            MemoryLocalPlaylistStore([fixture.playlist()]),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await fixture.openCategory(tester, 'songs');
      await _songAction(tester, 'Alpha', '즐겨찾기 추가');
      await _tap(tester, '내 음악 검색');
      await tester.enterText(find.byType(TextField).first, 'Alpha');
      await tester.pumpAndSettle();
      await _songAction(tester, 'Alpha', '즐겨찾기 해제');
      expect(await repository.load(), isEmpty);
      await _tap(tester, '뒤로');
      await _tap(tester, '뒤로');
      await fixture.openCategory(tester, 'playlists');
      await tester.tap(find.text('저녁'));
      await tester.pumpAndSettle();
      await _songAction(tester, 'Alpha', '즐겨찾기 추가');
      await _tap(tester, '재생 상세 열기');
      expect(find.byTooltip('현재 곡 즐겨찾기 해제'), findsOneWidget);
      expect(p.state, LocalPlayerState.ready);
      expect(p.queue.map((e) => e.trackId), ['local-file:a', 'local-file:b']);
    },
  );

  testWidgets(
    'same-file future occurrences edit independently and preserve paused position',
    (tester) async {
      final p = FakeLocalPlayer(
        trackDurations: {'local-file:a': const Duration(minutes: 1)},
      );
      final queue = _queue();
      await p.loadQueue([queue[0], queue[0], queue[1], queue[0]]);
      await p.play();
      await p.seek(const Duration(seconds: 9));
      await p.pause();
      await tester.pumpWidget(_app(player: p));
      await tester.pumpAndSettle();
      await _tap(tester, '재생 상세 열기');
      expect(find.byTooltip('1번 대기열 편집'), findsNothing);
      expect(find.text('현재 곡'), findsOneWidget);
      expect(find.text('현재 악장'), findsNothing);
      await _tap(tester, '2번 대기열 편집');
      expect(find.text('위로 이동'), findsNothing);
      await tester.tap(find.text('아래로 이동'));
      await tester.pumpAndSettle();
      expect(p.queue.map((e) => e.trackId), [
        'local-file:a',
        'local-file:b',
        'local-file:a',
        'local-file:a',
      ]);
      await _tap(tester, '4번 대기열 편집');
      await tester.tap(find.text('대기열에서 제거'));
      await tester.pumpAndSettle();
      expect(p.queue, hasLength(3));
      expect(p.currentIndex, 0);
      expect(p.playbackState.position.inSeconds, 9);
      expect(p.state, LocalPlayerState.paused);
      await tester.ensureVisible(find.text('남은 대기열 비우기'));
      await tester.tap(find.text('남은 대기열 비우기'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('비우기'));
      await tester.pumpAndSettle();
      expect(p.queue, [queue[0]]);
      expect(p.playbackState.position.inSeconds, 9);
    },
  );

  testWidgets(
    'queue busy and errors update the root and detail and protect an open stale menu',
    (tester) async {
      final p = _UiPlayer();
      await p.loadQueue([..._queue(), _queue().first]);
      await tester.pumpWidget(_app(player: p));
      await tester.pumpAndSettle();
      await _tap(tester, '도구 더보기');
      await tester.tap(find.text('재생 계획'));
      await tester.pumpAndSettle();
      final state = p.playbackState;
      p.publish(state.copyWith(isEditingQueue: true));
      await tester.pump();
      expect(find.text('대기열 편집 중'), findsWidgets);
      expect(
        tester
            .widget<DdiroriMenuButton<String>>(
              find.byWidgetPredicate(
                (w) => w is DdiroriMenuButton<String> && w.label == '2번 대기열 편집',
              ),
            )
            .enabled,
        isFalse,
      );
      p.publish(state.copyWith(queueEditError: '대기열 저장 실패: 다시 시도해 주세요.'));
      await tester.pumpAndSettle();
      expect(find.textContaining('대기열 저장 실패'), findsOneWidget);
      await _tap(tester, '재생 상세 열기');
      expect(find.textContaining('대기열 저장 실패'), findsOneWidget);
      await _tap(tester, '2번 대기열 편집');
      await p.next();
      await tester.pump();
      await tester.tap(find.text('대기열에서 제거'));
      await tester.pumpAndSettle();
      expect(p.queue, hasLength(3));
      expect(p.currentIndex, 1);
      expect(find.byTooltip('2번 대기열 편집'), findsNothing);
    },
  );

  testWidgets(
    'real deleted file surfaces playback failure and missing favorite remains recoverable',
    (tester) async {
      final directory = Directory.systemTemp.createTempSync(
        'music-ui-missing-',
      );
      addTearDown(() => directory.deleteSync(recursive: true));
      final file = File('${directory.path}/removed.wav')
        ..writeAsBytesSync([1, 2, 3]);
      final audio = LocalAudioFile(
        id: 'a',
        path: file.path,
        fileName: 'Removed.wav',
        format: 'wav',
      );
      final p = FakeLocalPlayer(validator: const LocalPlaybackQueueValidator());
      await tester.pumpWidget(
        _app(
          player: p,
          files: [audio],
          favorites: LocalFavoritesRepository(_FavoritesStore({'a'})),
        ),
      );
      await tester.pumpAndSettle();
      file.deleteSync();
      await fixture.openCategory(tester, 'favorites');
      await tester.tap(find.text('Removed'));
      await tester.runAsync(() async {
        await Future<void>.delayed(const Duration(milliseconds: 50));
      });
      await tester.pumpAndSettle();
      expect(
        p.playbackState.failure?.kind,
        LocalPlaybackFailureKind.missingFile,
      );
      await _tap(tester, '재생 상세 열기');
      expect(find.text('연결된 오디오 파일을 찾을 수 없습니다.'), findsOneWidget);
      expect(find.byTooltip('현재 곡 즐겨찾기 해제'), findsOneWidget);
    },
  );

  testWidgets(
    'mixed classical/direct queue restores duplicate occurrences shuffle and selection without autoplay',
    (tester) async {
      final library = sampleClassicalLibrary;
      final track = library.tracks.first;
      final store = MemoryPlaybackQueueSnapshotStore()
        ..snapshot = PlaybackQueueSnapshot(
          trackIds: [track.id, 'local-file:a', track.id],
          currentTrackId: track.id,
          savedAtMillis: 1,
          currentIndex: 2,
          queueOrder: [1, 0, 2],
          shuffleEnabled: true,
          repeatMode: LocalRepeatMode.all,
        );
      final p = FakeLocalPlayer();
      await tester.pumpWidget(
        _app(
          player: p,
          library: library,
          files: [...library.files, ...fixture.files],
          queueStore: store,
          links: AudioFileTrackLinkRepository(
            MemoryAudioFileTrackLinkStore([
              for (final item in library.tracks)
                AudioFileTrackLink(
                  fileId: item.fileId,
                  trackId: item.id,
                  linkedAtMillis: 1,
                ),
            ]),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(p.queue.map((e) => e.trackId), [
        track.id,
        'local-file:a',
        track.id,
      ]);
      expect(p.currentIndex, 2);
      expect(p.state, LocalPlayerState.ready);
      expect(p.playbackState.shuffleEnabled, isTrue);
      await p.setShuffleEnabled(false);
      expect(p.queue.map((e) => e.trackId), [
        'local-file:a',
        track.id,
        track.id,
      ]);
      expect(p.currentIndex, 2);
      expect(p.state, LocalPlayerState.ready);
      await _tap(tester, '재생 상세 열기');
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('now-playing-queue-2')),
        250,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('현재 악장'), findsOneWidget);
      expect(find.text('현재 곡'), findsNothing);
    },
  );

  testWidgets(
    'IMSLP main callbacks return registered IDs, preserve playback until explicit play and persist only confirmed provenance',
    (tester) async {
      final scanned = ScannedAudioRepository(
        MemoryScannedAudioStore([fixture.files.last]),
      );
      final importer = _Importer(scanned);
      final p = FakeLocalPlayer(
        trackDurations: {'local-file:b': const Duration(minutes: 2)},
      );
      await p.loadQueue(_queue([fixture.files.last]));
      await p.play();
      await p.seek(const Duration(seconds: 13));
      await p.pause();
      final coordinator = _ImslpCoordinator(scanned);
      await tester.pumpWidget(
        _app(
          player: p,
          scanned: scanned,
          importer: importer,
          picker: _Picker(),
          imslpCoordinator: coordinator,
        ),
      );
      await tester.pumpAndSettle();
      await _tap(tester, '도구 더보기');
      await tester.tap(find.text('IMSLP 자료'));
      await tester.pumpAndSettle();
      final screen = tester.widget<ImslpLibraryScreen>(
        find.byType(ImslpLibraryScreen),
      );
      expect(
        find.byKey(const ValueKey('persistent-playback-strip')),
        findsOneWidget,
      );
      final oldQueue = p.queue;
      final result = await screen.onImportLocalFiles!();
      await tester.pumpAndSettle();
      expect(result!.fileIds, ['a']);
      expect(result.label, contains('Alpha.wav'));
      expect(result.label, isNot(contains('/fixture/')));
      expect(p.queue, same(oldQueue));
      expect(p.playbackState.position.inSeconds, 13);
      expect(p.state, LocalPlayerState.paused);
      expect(
        (await scanned.load()).firstWhere((f) => f.id == 'a').sourceReferences,
        isEmpty,
      );
      final show = screen.onShowImportedFiles!(result);
      await tester.pumpAndSettle();
      expect(find.text('IMSLP에서 가져온 곡'), findsOneWidget);
      expect(find.byTooltip('Alpha 재생'), findsOneWidget);
      expect(find.byTooltip('Beta 재생'), findsNothing);
      await tester.pageBack();
      await tester.pumpAndSettle();
      await show;
      final source = (await const _Catalog().searchWorks('Beethoven')).single;
      await screen.onAssociateSource!(source, result);
      final saved = (await scanned.load()).firstWhere((f) => f.id == 'a');
      expect(saved.sourceReferences.single.kind, SourceKind.imslp);
      expect(saved.sourceReferences.single.url, source.pageUrl.toString());
      expect(saved.sourceReferences.single.licenseLabel, isNull);
      expect(saved.sourceReferences.single.copyrightStatus, isNull);
      expect(
        (await scanned.load()).firstWhere((f) => f.id == 'b').sourceReferences,
        isEmpty,
      );
      expect(screen.library.works, isEmpty);
      expect(await screen.store.loadWorkLinks(), isEmpty);
      await screen.onPlayImportedFiles!(result);
      await tester.pumpAndSettle();
      expect(p.queue.map((e) => e.trackId), ['local-file:a']);
      expect(p.state, LocalPlayerState.playing);
      await _tap(tester, '축약 일시정지');
      expect(p.state, LocalPlayerState.paused);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(p.queue.single.trackId, 'local-file:a');
      expect(p.state, LocalPlayerState.paused);
    },
  );

  testWidgets(
    'IMSLP cancellation and unregistered batch never report unrelated files as imported',
    (tester) async {
      final scanned = ScannedAudioRepository(
        MemoryScannedAudioStore(fixture.files),
      );
      final importer = _Importer(scanned)..register = false;
      final picker = _Picker()..cancel = true;
      await tester.pumpWidget(
        _app(
          scanned: scanned,
          importer: importer,
          picker: picker,
          imslpCoordinator: _ImslpCoordinator(scanned),
        ),
      );
      await tester.pumpAndSettle();
      await _tap(tester, '도구 더보기');
      await tester.tap(find.text('IMSLP 자료'));
      await tester.pumpAndSettle();
      final screen = tester.widget<ImslpLibraryScreen>(
        find.byType(ImslpLibraryScreen),
      );
      expect(
        find.byKey(const ValueKey('persistent-playback-strip')),
        findsNothing,
      );
      expect(await screen.onImportLocalFiles!(), isNull);
      picker.cancel = false;
      final result = await screen.onImportLocalFiles!();
      expect(result!.fileIds, isEmpty);
      expect(await screen.store.loadWorkLinks(), isEmpty);
    },
  );

  testWidgets(
    'reset drains pending favorites and stale completion cannot repopulate the emptied UI',
    (tester) async {
      final store = _FavoritesStore();
      final scanned = ScannedAudioRepository(
        MemoryScannedAudioStore(fixture.files),
      );
      final p = FakeLocalPlayer();
      await p.loadQueue(_queue());
      await tester.pumpWidget(
        _app(
          player: p,
          scanned: scanned,
          favorites: LocalFavoritesRepository(store),
          dataControl: _DataControl(store, scanned),
        ),
      );
      await tester.pumpAndSettle();
      await _tap(tester, '도구 더보기');
      await tester.tap(find.text('앱 정보 및 데이터'));
      await tester.pumpAndSettle();
      final settings = tester.widget<AppSettingsScreen>(
        find.byType(AppSettingsScreen),
      );
      await tester.pageBack();
      await tester.pumpAndSettle();
      await _tap(tester, '재생 상세 열기');
      store.gate = Completer<void>();
      await tester.ensureVisible(find.byTooltip('현재 곡 즐겨찾기 추가'));
      await tester.tap(find.byTooltip('현재 곡 즐겨찾기 추가'));
      await tester.pump();
      var drained = false;
      final beforeReset = settings.onBeforeReset!().then((_) => drained = true);
      await tester.pump();
      expect(drained, isFalse);
      store.gate!.complete();
      await tester.pumpAndSettle();
      await beforeReset;
      store.gate = null;
      await settings.dataControl.reset();
      await settings.onResetComplete();
      await tester.pumpAndSettle();
      expect(await store.load(), isEmpty);
      expect(p.queue, isEmpty);
      expect(p.state, isNot(LocalPlayerState.playing));
      await tester.pageBack();
      await tester.pumpAndSettle();
      await fixture.openCategory(tester, 'favorites');
      expect(find.text('즐겨찾는 곡을 모아보세요'), findsOneWidget);
      expect(find.byTooltip('Alpha 재생'), findsNothing);
    },
  );

  testWidgets(
    'backup callback reloads favorite memory and management removal refreshes it without autoplay',
    (tester) async {
      final store = _FavoritesStore({'a'});
      final scanned = ScannedAudioRepository(
        MemoryScannedAudioStore(fixture.files),
      );
      final p = FakeLocalPlayer();
      await tester.pumpWidget(
        _app(
          player: p,
          scanned: scanned,
          favorites: LocalFavoritesRepository(store),
          dataControl: _DataControl(store, scanned),
        ),
      );
      await tester.pumpAndSettle();
      await _tap(tester, '도구 더보기');
      await tester.tap(find.text('앱 정보 및 데이터'));
      await tester.pumpAndSettle();
      final settings = tester.widget<AppSettingsScreen>(
        find.byType(AppSettingsScreen),
      );
      await store.save({'b'});
      await settings.onBackupImported!();
      await tester.pumpAndSettle();
      await tester.pageBack();
      await tester.pumpAndSettle();
      await fixture.openCategory(tester, 'favorites');
      expect(find.byTooltip('Beta 재생'), findsOneWidget);
      expect(find.byTooltip('Alpha 재생'), findsNothing);
      await tester.pageBack();
      await tester.pumpAndSettle();
      await _tap(tester, '도구 더보기');
      await tester.tap(find.text('음원 정보·파일 복구'));
      await tester.pumpAndSettle();
      final management = tester.widget<LibraryManagementScreen>(
        find.byType(LibraryManagementScreen),
      );
      await scanned.remove('b');
      await store.save({});
      management.onChanged!(
        LibraryManagementSnapshot(
          files: await scanned.load(),
          candidates: const [],
          links: const [],
          library: emptyClassicalLibrary,
        ),
      );
      await tester.pumpAndSettle();
      await tester.pageBack();
      await tester.pumpAndSettle();
      await fixture.openCategory(tester, 'favorites');
      expect(find.text('즐겨찾는 곡을 모아보세요'), findsOneWidget);
      expect(p.state, isNot(LocalPlayerState.playing));
    },
  );

  testWidgets(
    'playlist draft from a favorite survives failed saving and busy duplicate taps',
    (tester) async {
      tester.view.physicalSize = const Size(320, 1000);
      tester.platformDispatcher.textScaleFactorTestValue = 2;
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      final store = fixture.ControlledPlaylistStore()..failSave = true;
      final repository = LocalPlaylistRepository(
        store,
        idFactory: () => 'favorite-draft',
      );
      final p = FakeLocalPlayer();
      await p.loadQueue(_queue());
      final queue = p.queue;
      await tester.pumpWidget(
        _app(
          player: p,
          favorites: LocalFavoritesRepository(_FavoritesStore({'a'})),
          playlists: repository,
        ),
      );
      await tester.pumpAndSettle();
      await fixture.openCategory(tester, 'favorites');
      await _songAction(tester, 'Alpha', '재생목록에 추가');
      await fixture.createDraft(tester, '실패해도 남는 이름');
      expect(find.text('1곡을 함께 저장합니다.'), findsOneWidget);
      store.gate = Completer<void>();
      await tester.tap(find.text('저장'));
      await tester.pump();
      expect(
        tester
            .widget<DdiroriButton>(
              find.byWidgetPredicate(
                (w) => w is DdiroriButton && w.label == '저장',
              ),
            )
            .onPressed,
        isNull,
      );
      expect(store.saveCount, 1);
      store.gate!.complete();
      await tester.pumpAndSettle();
      expect(
        tester.widget<TextField>(find.byType(TextField).last).controller!.text,
        '실패해도 남는 이름',
      );
      expect(find.text('1곡을 함께 저장합니다.'), findsOneWidget);
      expect(await repository.load(), isEmpty);
      store.failSave = false;
      store.gate = null;
      await tester.tap(find.text('저장'));
      await tester.pumpAndSettle();
      expect((await repository.load()).single.fileIds, ['a']);
      expect(find.byTooltip('Alpha 재생'), findsOneWidget);
      expect(p.queue, same(queue));
      expect(p.state, LocalPlayerState.ready);
      final oldNotice = find.text('“실패해도 남는 이름”을 만들고 1곡을 추가했습니다.');
      expect(oldNotice, findsOneWidget);
      expect(find.text('보기'), findsOneWidget);
      await _songAction(tester, 'Alpha', '즐겨찾기 해제');
      expect(oldNotice, findsNothing);
      expect(find.text('보기'), findsNothing);
      expect(find.text('즐겨찾기에서 해제했습니다.'), findsOneWidget);
      expect(p.queue, same(queue));
      expect(p.state, LocalPlayerState.ready);
      final play = find.byTooltip('축약 재생');
      expect(play.hitTestable(), findsOneWidget);
      await tester.tap(play);
      await tester.pumpAndSettle();
      expect(p.state, LocalPlayerState.playing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'late favorite failure after dispose remains retryable without a stale UI update',
    (tester) async {
      final store = _FavoritesStore();
      final repository = LocalFavoritesRepository(store);
      final p = FakeLocalPlayer();
      await p.loadQueue(_queue());
      await tester.pumpWidget(_app(player: p, favorites: repository));
      await tester.pumpAndSettle();
      await _tap(tester, '재생 상세 열기');
      store.gate = Completer<void>();
      store.failSave = true;
      await tester.ensureVisible(find.byTooltip('현재 곡 즐겨찾기 추가'));
      await tester.tap(find.byTooltip('현재 곡 즐겨찾기 추가'));
      await tester.pump();
      await tester.pumpWidget(const SizedBox.shrink());
      store.gate!.complete();
      await tester.pumpAndSettle();
      expect(await repository.load(), isEmpty);
      expect(tester.takeException(), isNull);
      store.gate = null;
      store.failSave = false;
      await repository.setFavorite('a', true);
      expect(await repository.load(), {'a'});
    },
  );

  for (final profile in [
    for (final width in [320.0, 390.0, 1024.0])
      for (final scale in [1.0, 2.0])
        for (final brightness in Brightness.values) (width, scale, brightness),
  ]) {
    final label =
        '${profile.$1.toInt()}-${profile.$2.toInt()}-${profile.$3.name}';
    testWidgets('capture real app queue favorites and IMSLP fixtures $label', (
      tester,
    ) async {
      tester.view.physicalSize = Size(profile.$1, 1000);
      tester.view.devicePixelRatio = 1;
      tester.view.padding = const FakeViewPadding(bottom: 24);
      tester.platformDispatcher.textScaleFactorTestValue = profile.$2;
      tester.platformDispatcher.platformBrightnessTestValue = profile.$3;
      tester.platformDispatcher.accessibilityFeaturesTestValue =
          FakeAccessibilityFeatures(disableAnimations: profile.$2 == 2);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPadding);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      addTearDown(tester.platformDispatcher.clearPlatformBrightnessTestValue);
      addTearDown(
        tester.platformDispatcher.clearAccessibilityFeaturesTestValue,
      );
      final key = GlobalKey();
      final p = FakeLocalPlayer();
      const longFile = LocalAudioFile(
        id: 'long',
        path: '/fixture/long.wav',
        fileName: '베토벤 교향곡 제5번 다단조 작품67 아주 긴 제목의 라이브 연주 녹음 첫 번째 악장.wav',
        format: 'wav',
      );
      final files = [longFile, ...fixture.files];
      await p.loadQueue([..._queue(files), _queue(files).first]);
      await tester.pumpWidget(
        RepaintBoundary(
          key: key,
          child: _app(
            files: files,
            player: p,
            favorites: LocalFavoritesRepository(
              _FavoritesStore({'a', 'b', 'long'}),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await _tap(tester, '재생 상세 열기');
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('now-playing-queue-1')),
        250,
        scrollable: find.byType(Scrollable).first,
      );
      await _tap(tester, '2번 대기열 편집');
      await tester.pumpAndSettle();
      await _capture(tester, key, 'music-actions-queue-$label');
      await tester.tap(find.text('아래로 이동'));
      await tester.pumpAndSettle();
      await tester.pageBack();
      await tester.pumpAndSettle();
      await fixture.openCategory(tester, 'favorites');
      await _capture(tester, key, 'music-actions-favorites-$label');
      expect(find.byTooltip('Alpha 재생'), findsOneWidget);
      final imslpKey = GlobalKey();
      await tester.pumpWidget(
        RepaintBoundary(
          key: imslpKey,
          child: MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: ddiroriTheme(
              brightness: profile.$3,
              fontFamily: 'DdiroriLibraryCapture',
            ),
            home: ImslpLibraryScreen(
              library: emptyClassicalLibrary,
              store: MemoryImslpStore(),
              client: const _Catalog(),
              openUri: (_) async => true,
              onImportLocalFiles: () async => const ImslpLocalImportResult(
                fileIds: ['a'],
                label: 'Alpha.wav',
              ),
              onShowImportedFiles: (_) async {},
              onPlayImportedFiles: (_) async {},
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField).first, 'Beethoven');
      await _tap(tester, 'IMSLP 검색');
      await tester.ensureVisible(find.text('공식 페이지에서 녹음 확인'));
      await tester.pumpAndSettle();
      await _capture(tester, imslpKey, 'music-actions-imslp-$label');
      expect(tester.takeException(), isNull);
    });
  }
}

class _Catalog implements ImslpCatalogClient {
  const _Catalog();
  @override
  Future<List<ImslpWorkSearchResult>> searchWorks(
    String query, {
    int limit = 10,
  }) async => [
    ImslpWorkSearchResult(
      externalId: 'Symphony No.5',
      title: 'Symphony No.5, Op.67',
      composerName: 'Ludwig van Beethoven',
      pageUrl: Uri.parse('https://imslp.org/wiki/Symphony_No.5'),
    ),
  ];
}

class _Picker implements AudioFilePicker {
  bool cancel = false;
  @override
  Future<List<SelectedAudioFile>> pickAudioFiles() async =>
      cancel ? [] : [_Selected()];
}

class _Selected implements SelectedAudioFile {
  @override
  String get name => 'Alpha.wav';
  @override
  String? get mimeType => 'audio/wav';
  @override
  Future<int> length() async => 1;
  @override
  Stream<List<int>> openRead() => Stream.value([1]);
}

class _Importer implements LocalAudioImportController {
  _Importer(this.scanned);
  final ScannedAudioRepository scanned;
  bool register = true;
  @override
  Future<LocalAudioImportBatchResult> recoverManagedImports() async =>
      LocalAudioImportBatchResult(
        items: const [],
        files: await scanned.load(),
        candidates: const [],
      );
  @override
  Future<LocalAudioImportBatchResult> importFiles(
    List<SelectedAudioFile> files, {
    LocalAudioImportCancellation? cancellation,
    void Function(LocalAudioImportStage)? onStage,
    void Function(LocalAudioImportProgress)? onProgress,
  }) async {
    if (register) {
      await scanned.replaceAll([fixture.files.first, ...await scanned.load()]);
    }
    return LocalAudioImportBatchResult(
      items: [
        LocalAudioImportItemResult(
          outcome: register
              ? LocalAudioImportOutcome.imported
              : LocalAudioImportOutcome.failed,
          record: register
              ? const LocalAudioImportRecord(
                  id: 'import-a',
                  sourceKind: 'document',
                  originalFileName: 'Alpha.wav',
                  localPath: '/fixture/a.wav',
                  sha256: 'fixture',
                  sizeBytes: 1,
                  importedAtMillis: 1,
                  status: LocalAudioImportStatus.completed,
                  fileId: 'a',
                )
              : null,
        ),
      ],
      files: await scanned.load(),
      candidates: const [],
    );
  }
}

class _ImslpCoordinator extends ImslpImportCoordinator {
  _ImslpCoordinator(ScannedAudioRepository scanned)
    : super(
        store: MemoryImslpStore(),
        downloadService: const ImslpDownloadService(),
        destination: Directory('/fixture/not-used'),
        scanner: const FileSystemAudioFileScanner(),
        scannedAudioRepository: scanned,
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
      );
  @override
  Future<List<ImslpResource>> recoverableResources() async => [];
}

class _DataControl implements LocalDataControlService {
  _DataControl(this.favorites, this.scanned);
  final _FavoritesStore favorites;
  final ScannedAudioRepository scanned;
  @override
  Future<bool> recoverPendingReset() async => false;
  @override
  Future<LocalDataSummary> summary() async =>
      const LocalDataSummary(managedFileCount: 0, managedBytes: 0);
  @override
  Future<void> reset() async {
    await favorites.save({});
    await scanned.replaceAll([]);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
