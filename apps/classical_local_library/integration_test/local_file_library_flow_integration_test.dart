import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/just_audio_playback.dart';
import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/library_artwork.dart';
import 'package:classical_local_library/library_view_settings.dart';
import 'package:classical_local_library/local_audio_import.dart';
import 'package:classical_local_library/local_audio_scanner.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/local_playlists.dart';
import 'package:classical_local_library/main.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/scan_locations.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:classical_local_library/sqlite_database.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:path_provider/path_provider.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('fixture import appears as a song and plays without a work', (
    tester,
  ) async {
    expect(Platform.isIOS, isTrue);
    final root = Directory(
      '${(await getTemporaryDirectory()).path}/local-file-library-flow',
    );
    if (await root.exists()) await root.delete(recursive: true);
    await root.create(recursive: true);
    addTearDown(() async {
      if (await root.exists()) await root.delete(recursive: true);
    });
    final source = File('${root.path}/01 Allegro.wav');
    final asset = await rootBundle.load('assets/audio_test/movement_1.wav');
    // A longer temporary fixture keeps real playback active through the UX flow.
    final wav = asset.buffer.asUint8List();
    final header = Uint8List.fromList(wav.sublist(0, 44));
    final samples = wav.sublist(44);
    const repeats = 30;
    ByteData.sublistView(header)
      ..setUint32(4, 36 + samples.length * repeats, Endian.little)
      ..setUint32(40, samples.length * repeats, Endian.little);
    await source.writeAsBytes(
      (BytesBuilder()
            ..add(header)
            ..add([for (var i = 0; i < repeats; i++) ...samples]))
          .takeBytes(),
      flush: true,
    );

    final scanned = ScannedAudioRepository(MemoryScannedAudioStore());
    final candidates = MetadataCandidateRepository(
      MemoryMetadataCandidateStore(),
    );
    final importer = LocalAudioImportCoordinator(
      store: MemoryLocalAudioImportStore(),
      destination: Directory('${root.path}/managed_audio'),
      scanner: const FileSystemAudioFileScanner(),
      scannedAudioRepository: scanned,
      metadataCandidateRepository: candidates,
    );
    final player = JustAudioLocalPlaybackController();
    var database = await ClassicalLocalDatabase(
      path: '${root.path}/playlists.sqlite',
    ).open();
    var playlists = LocalPlaylistRepository(
      SqliteLocalPlaylistStore(database),
      idFactory: () => 'native-playlist',
    );
    final settings = SqliteLibraryViewSettingsStore(database);
    final artwork = LibraryArtworkRepository(
      directory: Directory('${root.path}/artwork'),
      store: SqliteArtworkReferenceStore(database),
    );
    final recorder = ui.PictureRecorder();
    ui.Canvas(recorder).drawRect(
      const ui.Rect.fromLTWH(0, 0, 24, 24),
      ui.Paint()..color = const ui.Color(0xff1971c2),
    );
    final recorded = recorder.endRecording();
    final image = await recorded.toImage(24, 24);
    final png = (await image.toByteData(format: ui.ImageByteFormat.png))!.buffer
        .asUint8List();
    image.dispose();
    recorded.dispose();
    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        initialLibrary: emptyClassicalLibrary,
        enableDemoFeatures: false,
        supportsFolderScan: false,
        audioFilePicker: _FixturePicker(source),
        localAudioImportCoordinator: importer,
        playbackController: player,
        localPlaylistRepository: playlists,
        viewSettingsStore: settings,
        artworkRepository: artwork,
        artworkPicker: _ArtworkPicker(png),
        scanRepository: scanned,
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: candidates,
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(),
        ),
      ),
    );
    await _pumpUntil(tester, find.text('보관함이 비어 있습니다'));
    expect(
      find.byKey(const ValueKey('persistent-playback-strip')),
      findsNothing,
    );

    await tester.tap(find.text('음악 가져오기'));
    await _pumpUntil(tester, find.text('최근 추가한 음악'));
    expect(find.text('보관함이 비어 있습니다'), findsNothing);
    await tester.tap(find.byKey(const ValueKey('file-category-songs')));
    await tester.pumpAndSettle();
    expect(find.byTooltip('01 Allegro 재생'), findsOneWidget);
    await tester.tap(find.byTooltip('01 Allegro 재생'));
    await _pumpUntil(tester, find.byTooltip('재생 상세 열기'));
    await _pumpUntilPlaying(tester, player);
    expect(player.playbackState.currentItem?.isDirectFile, isTrue);
    expect(
      player.playbackState.currentItem?.trackId,
      startsWith('local-file:'),
    );
    expect(player.playbackState.playerState, LocalPlayerState.playing);
    expect((await scanned.load()), hasLength(1));

    final beforeSearch = player.playbackState;
    await tester.tap(find.byTooltip('내 음악 검색'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, 'Allegro');
    await _pumpUntil(tester, find.byTooltip('01 Allegro 재생'));
    expect(
      player.playbackState.currentItem?.trackId,
      beforeSearch.currentItem?.trackId,
    );
    expect(player.playbackState.playerState, LocalPlayerState.playing);
    expect(
      player.playbackState.position,
      greaterThanOrEqualTo(beforeSearch.position),
    );
    FocusManager.instance.primaryFocus?.unfocus();
    await tester.pumpAndSettle();
    await _captureScene(tester, 'search-results');
    await tester.tap(find.byTooltip('01 Allegro 재생'));
    await _pumpUntilPlaying(tester, player);
    await tester.tap(find.byTooltip('뒤로'));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('재생 상세 열기'));
    await tester.pumpAndSettle();
    expect(find.text('재생 대기열'), findsOneWidget);
    final track = player.playbackState.currentItem!.trackId;
    await tester.tap(find.byTooltip('현재 곡 재생목록에 추가'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('새 재생목록'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).last, '시뮬레이터 감상');
    await tester.pumpAndSettle();
    await tester.tap(find.text('저장'));
    await tester.pumpAndSettle();
    expect(find.text('재생 대기열'), findsOneWidget);
    expect(find.textContaining('1곡을 추가했습니다'), findsOneWidget);
    await tester.ensureVisible(find.byTooltip('반복 끔'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('반복 끔'));
    await tester.pumpAndSettle();
    expect(player.playbackState.repeatMode, LocalRepeatMode.all);
    await tester.ensureVisible(find.byTooltip('셔플 꺼짐'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('셔플 꺼짐'));
    await tester.pumpAndSettle();
    expect(player.playbackState.shuffleEnabled, isTrue);
    await _captureScene(tester, 'creation-result');
    await tester.tap(find.text('보기'));
    await tester.pumpAndSettle();
    expect(find.byTooltip('재생목록 더보기'), findsOneWidget);
    expect(find.byTooltip('도구 더보기'), findsNothing);
    await tester.tap(find.byTooltip('재생목록 더보기'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('표지 선택'));
    await _pumpUntil(tester, find.text('표지를 저장했습니다.'));
    expect(artwork.hashFor('playlist:native-playlist'), isNotNull);
    await tester.tap(find.byTooltip('재생목록 곡 정렬'));
    await tester.pumpAndSettle();
    await tester.tap(
      find.widgetWithText(CheckedPopupMenuItem<PlaylistTrackSort>, '제목'),
    );
    await tester.pumpAndSettle();
    expect(
      (await settings.load()).trackSorts['native-playlist'],
      PlaylistTrackSort.title,
    );
    await tester.tap(find.byIcon(Icons.close).hitTestable());
    await tester.pumpAndSettle();
    expect(find.byTooltip('재생 상세 열기').hitTestable(), findsOneWidget);
    await _captureScene(tester, 'playlist-detail');
    final swipe = await tester.startGesture(const Offset(1, 180));
    await swipe.moveBy(const Offset(60, 0));
    await tester.pump(const Duration(milliseconds: 150));
    await swipe.moveBy(const Offset(-60, 0));
    await swipe.up();
    await tester.pumpAndSettle();
    expect(find.byTooltip('재생목록 더보기'), findsOneWidget);
    await tester.timedDragFrom(
      const Offset(1, 180),
      Offset(
        tester.view.physicalSize.width / tester.view.devicePixelRatio * .9,
        0,
      ),
      const Duration(milliseconds: 450),
    );
    await tester.pumpAndSettle();
    expect(find.text('재생 대기열'), findsOneWidget);
    expect(player.playbackState.currentItem!.trackId, track);
    expect(player.playbackState.playerState, LocalPlayerState.playing);
    expect(player.playbackState.position, greaterThan(Duration.zero));
    expect((await playlists.load()).single.fileIds, [
      (await scanned.load()).single.id,
    ]);
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('뒤로'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('01 Allegro.wav 작품과 녹음으로 정리'));
    await tester.pumpAndSettle();
    expect(find.text('작품과 녹음 정리'), findsOneWidget);
    await tester.enterText(find.widgetWithText(TextFormField, '작곡가'), 'Bach');
    await tester.enterText(find.widgetWithText(TextFormField, '작품명'), 'Suite');
    await tester.drag(find.byType(ListView).last, const Offset(0, -1000));
    await tester.pumpAndSettle();
    FocusManager.instance.primaryFocus?.unfocus();
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('라이브러리에 저장'));
    await tester.tap(find.text('라이브러리에 저장'));
    await _pumpUntil(tester, find.text('녹음 재생'));
    expect(find.text('첫 음악을 재생했어요.'), findsNothing);
    await Scrollable.ensureVisible(
      tester.element(find.text('녹음 재생')),
      alignment: 0.2,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('녹음 재생').hitTestable());
    await _pumpUntil(tester, find.text('첫 음악을 재생했어요.'));
    await _pumpUntilPlaying(tester, player);
    expect(player.playbackState.currentItem?.isDirectFile, isFalse);
    expect(
      (await scanned.load()).single.importStatus,
      AudioImportStatus.linked,
    );
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump(const Duration(milliseconds: 250));
    await artwork.drained;
    await database.close();
    database = await ClassicalLocalDatabase(
      path: '${root.path}/playlists.sqlite',
    ).open();
    playlists = LocalPlaylistRepository(SqliteLocalPlaylistStore(database));
    expect((await playlists.load()).single.name, '시뮬레이터 감상');
    expect(
      (await SqliteLibraryViewSettingsStore(
        database,
      ).load()).trackSorts['native-playlist'],
      PlaylistTrackSort.title,
    );
    final restoredArtwork = LibraryArtworkRepository(
      directory: Directory('${root.path}/artwork'),
      store: SqliteArtworkReferenceStore(database),
    );
    final restored = await restoredArtwork.playlist('native-playlist');
    expect(restored, isNotNull);
    expect(await restored!.exists(), isTrue);
    restoredArtwork.dispose();
    await database.close();
  }, timeout: const Timeout(Duration(seconds: 120)));
}

class _ArtworkPicker implements LibraryArtworkPicker {
  const _ArtworkPicker(this.bytes);
  final Uint8List bytes;
  @override
  Future<Uint8List?> pick() async => bytes;
}

Future<void> _captureScene(WidgetTester tester, String name) async {
  if (!const bool.fromEnvironment('CAPTURE_LIBRARY_UX')) return;
  // The local QA runner captures the actual simulator window with simctl.
  debugPrint('DDIRORI_LIBRARY_SCENE $name');
  await tester.runAsync(() => Future<void>.delayed(const Duration(seconds: 3)));
}

class _FixturePicker implements AudioFilePicker {
  const _FixturePicker(this.source);

  final File source;

  @override
  Future<List<SelectedAudioFile>> pickAudioFiles() async => [
    FileSelectedAudioFile(source, mimeType: 'audio/wav'),
  ];
}

Future<void> _pumpUntil(WidgetTester tester, Finder finder) async {
  for (var attempt = 0; attempt < 80; attempt += 1) {
    await tester.pump(const Duration(milliseconds: 250));
    if (finder.evaluate().isNotEmpty) return;
  }
  fail('Expected screen state did not appear');
}

Future<void> _pumpUntilPlaying(
  WidgetTester tester,
  LocalPlaybackController player,
) async {
  for (var attempt = 0; attempt < 80; attempt += 1) {
    await tester.pump(const Duration(milliseconds: 250));
    if (player.playbackState.playerState == LocalPlayerState.playing) return;
  }
  fail('Audio engine did not reach playing state');
}
