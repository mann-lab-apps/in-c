import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:classical_local_library/audio_tags.dart';
import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/local_audio_import.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/main.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/scan_locations.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:classical_local_library/sample_classical_library.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

const _r3CaptureKey = ValueKey('r3-play-capture');

Future<void> _captureR3(WidgetTester tester, String name) async {
  final directory = Platform.environment['DDIRORI_R3_CAPTURE_OUTPUT'];
  if (directory == null) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(_r3CaptureKey),
  );
  await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 1);
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    final file = File('$directory/$name.png');
    await file.parent.create(recursive: true);
    await file.writeAsBytes(data!.buffer.asUint8List());
    image.dispose();
  });
}

Future<void> _loadR3Fonts(WidgetTester tester) async {
  final font = Platform.environment['DDIRORI_BRAND_FONT'];
  if (font == null) return;
  await tester.runAsync(() async {
    final bytes = ByteData.sublistView(await File(font).readAsBytes());
    for (final family in ['R3Capture', 'Roboto']) {
      await (FontLoader(family)..addFont(Future.value(bytes))).load();
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

const _files = [
  LocalAudioFile(
    id: 'allegro',
    path: '/fixture/01.flac',
    fileName: '01.flac',
    format: 'flac',
    tagMetadata: AudioTagMetadata(
      title: 'Allegro',
      album: '교향곡',
      artist: '연주자',
      trackNumber: 1,
    ),
  ),
  LocalAudioFile(
    id: 'andante',
    path: '/fixture/02.flac',
    fileName: '02.flac',
    format: 'flac',
    tagMetadata: AudioTagMetadata(
      title: 'Andante',
      album: '교향곡',
      artist: '연주자',
      trackNumber: 2,
    ),
  ),
];

Widget _app({
  required FakeLocalPlayer player,
  List<LocalAudioFile> stored = const [],
  LocalAudioImportController? importer,
  ScannedAudioRepository? scanRepository,
  AudioFileTrackLinkRepository? linkRepository,
  ClassicalCatalogRepository? catalogRepository,
  PlaybackQueueSnapshotStore? snapshots,
  ClassicalLibrary library = emptyClassicalLibrary,
  String? fontFamily,
}) => ClassicalLocalLibraryApp(
  fontFamily: fontFamily,
  initialLibrary: library,
  enableDemoFeatures: false,
  playbackController: player,
  playbackQueueSnapshotStore: snapshots,
  scanRepository:
      scanRepository ?? ScannedAudioRepository(MemoryScannedAudioStore(stored)),
  scanLocationRepository: ScanLocationRepository(MemoryScanLocationStore()),
  metadataCandidateRepository: MetadataCandidateRepository(
    MemoryMetadataCandidateStore(),
  ),
  catalogRepository: catalogRepository,
  fileTrackLinkRepository:
      linkRepository ??
      AudioFileTrackLinkRepository(
        MemoryAudioFileTrackLinkStore([
          for (final track in library.tracks)
            AudioFileTrackLink(
              fileId: track.fileId,
              trackId: track.id,
              linkedAtMillis: 1,
            ),
        ]),
      ),
  audioFilePicker: const _Picker(),
  localAudioImportCoordinator: importer,
  supportsFolderScan: false,
);

void main() {
  testWidgets('부분 저장 뒤 화면 닫기는 취소가 아님을 알리고 보관함을 다시 읽는다', (tester) async {
    tester.view.physicalSize = const Size(390, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final scanned = ScannedAudioRepository(MemoryScannedAudioStore());
    final catalog = ClassicalCatalogRepository(MemoryClassicalCatalogStore());
    await tester.pumpWidget(
      _app(
        player: FakeLocalPlayer(),
        scanRepository: scanned,
        catalogRepository: catalog,
        linkRepository: AudioFileTrackLinkRepository(_FailingOnceLinkStore()),
        importer: _StoringImporter(scanned),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('음악 가져오기'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('01.flac 작품과 녹음으로 정리'));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextFormField, '작곡가'), 'Bach');
    await tester.enterText(find.widgetWithText(TextFormField, '작품명'), 'Suite');
    await tester.drag(find.byType(ListView).last, const Offset(0, -1000));
    await tester.pumpAndSettle();
    await tester.tap(find.text('라이브러리에 저장'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('저장된 등록 화면 닫기'));
    await tester.pumpAndSettle();
    expect(find.textContaining('저장된 내용은 취소되지 않습니다.'), findsOneWidget);
    await tester.tap(find.text('화면 닫기'));
    await tester.pumpAndSettle();
    expect(find.text('작품과 녹음 정리'), findsNothing);
    await tester.scrollUntilVisible(
      find.text('Suite'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Suite'), findsWidgets);
    expect((await catalog.load(await scanned.load())).works, hasLength(1));
  });

  testWidgets('등록 후 링크 실패는 같은 초안만 재시도하고 작품을 중복 생성하지 않는다', (tester) async {
    tester.view.physicalSize = const Size(390, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final scanned = ScannedAudioRepository(MemoryScannedAudioStore());
    final catalog = ClassicalCatalogRepository(MemoryClassicalCatalogStore());
    final links = _FailingOnceLinkStore();
    await tester.pumpWidget(
      _app(
        player: FakeLocalPlayer(),
        scanRepository: scanned,
        catalogRepository: catalog,
        linkRepository: AudioFileTrackLinkRepository(links),
        importer: _StoringImporter(scanned),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('음악 가져오기'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('01.flac 작품과 녹음으로 정리'));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextFormField, '작곡가'), 'Bach');
    await tester.enterText(find.widgetWithText(TextFormField, '작품명'), 'Suite');
    await tester.drag(find.byType(ListView).last, const Offset(0, -1000));
    await tester.pumpAndSettle();
    await tester.tap(find.text('라이브러리에 저장'));
    await tester.pumpAndSettle();
    expect(find.text('작품과 녹음을 저장하지 못했습니다. 다시 시도해 주세요.'), findsOneWidget);
    expect((await catalog.load(await scanned.load())).works, hasLength(1));
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(find.text('이미 저장된 내용이 있습니다'), findsOneWidget);
    await tester.tap(find.text('계속하기'));
    await tester.pumpAndSettle();
    expect(find.text('작품과 녹음 정리'), findsOneWidget);

    await tester.enterText(
      find.widgetWithText(TextFormField, '작품명'),
      'Changed',
    );
    await tester.ensureVisible(find.text('라이브러리에 저장'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('라이브러리에 저장'));
    await tester.pumpAndSettle();
    expect(find.textContaining('변경한 내용은 저장되지 않았습니다.'), findsOneWidget);
    expect((await catalog.load(await scanned.load())).works, hasLength(1));

    await tester.enterText(find.widgetWithText(TextFormField, '작품명'), 'Suite');
    await tester.ensureVisible(find.text('라이브러리에 저장'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('라이브러리에 저장'));
    await tester.pumpAndSettle();
    expect(find.text('작품과 녹음 정리'), findsNothing);
    expect((await catalog.load(await scanned.load())).works, hasLength(1));
    expect(await links.load(), hasLength(1));
  });

  testWidgets('정리 취소는 가져온 곡을 보관함에 남긴다', (tester) async {
    tester.view.physicalSize = const Size(390, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final repository = ScannedAudioRepository(MemoryScannedAudioStore());
    final player = FakeLocalPlayer();
    await tester.pumpWidget(
      _app(
        player: player,
        scanRepository: repository,
        importer: _StoringImporter(repository),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('음악 가져오기'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('01.flac 작품과 녹음으로 정리'));
    await tester.pumpAndSettle();
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.text('가져오기 결과'), findsOneWidget);
    expect(find.text('최근 추가한 음악'), findsOneWidget);
    expect(
      (await repository.load()).single.importStatus,
      AudioImportStatus.needsReview,
    );
    expect(player.queue, isEmpty);
  });

  testWidgets('R3 가져오기 결과는 넓은 화면과 큰 글자에서 잘리지 않는다', (tester) async {
    tester.view.physicalSize = const Size(1024, 900);
    tester.view.devicePixelRatio = 1;
    tester.platformDispatcher.textScaleFactorTestValue = 2;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.platformDispatcher.clearAllTestValues);
    await _loadR3Fonts(tester);
    final repository = ScannedAudioRepository(MemoryScannedAudioStore());
    await tester.pumpWidget(
      RepaintBoundary(
        key: _r3CaptureKey,
        child: _app(
          player: FakeLocalPlayer(),
          scanRepository: repository,
          importer: _StoringImporter(repository),
          fontFamily: Platform.environment['DDIRORI_BRAND_FONT'] == null
              ? null
              : 'R3Capture',
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('음악 가져오기'));
    await tester.pumpAndSettle();
    expect(find.text('가져오기 결과'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await _captureR3(tester, 'imported-1024-light-200');
  });

  testWidgets('R3 가져오기 결과는 320px 어두운 화면과 큰 글자에서 스크롤된다', (tester) async {
    tester.view.physicalSize = const Size(320, 900);
    tester.view.devicePixelRatio = 1;
    tester.platformDispatcher.textScaleFactorTestValue = 2;
    tester.platformDispatcher.platformBrightnessTestValue = Brightness.dark;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.platformDispatcher.clearAllTestValues);
    await _loadR3Fonts(tester);
    final repository = ScannedAudioRepository(MemoryScannedAudioStore());
    await tester.pumpWidget(
      RepaintBoundary(
        key: _r3CaptureKey,
        child: _app(
          player: FakeLocalPlayer(),
          scanRepository: repository,
          importer: _StoringImporter(repository),
          fontFamily: Platform.environment['DDIRORI_BRAND_FONT'] == null
              ? null
              : 'R3Capture',
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('음악 가져오기'));
    await tester.pumpAndSettle();
    expect(find.text('가져오기 결과'), findsOneWidget);
    expect(find.byTooltip('01.flac 작품과 녹음으로 정리'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await _captureR3(tester, 'imported-320-dark-200');
  });

  testWidgets('첫 가져오기 후 등록하고 엔진 playing에서만 첫 재생을 표시한다', (tester) async {
    tester.view.physicalSize = const Size(390, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await _loadR3Fonts(tester);
    final player = FakeLocalPlayer();
    final repository = ScannedAudioRepository(MemoryScannedAudioStore());
    await tester.pumpWidget(
      RepaintBoundary(
        key: _r3CaptureKey,
        child: _app(
          player: player,
          scanRepository: repository,
          importer: _StoringImporter(repository),
          fontFamily: Platform.environment['DDIRORI_BRAND_FONT'] == null
              ? null
              : 'R3Capture',
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('보관함이 비어 있습니다'), findsOneWidget);
    await _captureR3(tester, 'empty-390-light');
    await tester.tap(find.text('음악 가져오기'));
    await tester.pumpAndSettle();
    expect(find.text('가져오기 결과'), findsOneWidget);
    expect(find.text('첫 음악을 재생했어요.'), findsNothing);
    await _captureR3(tester, 'imported-390-light');
    await tester.tap(find.byTooltip('01.flac 작품과 녹음으로 정리'));
    await tester.pumpAndSettle();
    expect(find.text('작품과 녹음 정리'), findsOneWidget);
    await _captureR3(tester, 'registration-390-light');
    await tester.enterText(find.widgetWithText(TextFormField, '작곡가'), 'Bach');
    await tester.enterText(find.widgetWithText(TextFormField, '작품명'), 'Suite');
    await tester.drag(find.byType(ListView).last, const Offset(0, -1000));
    await tester.pumpAndSettle();
    await tester.tap(find.text('라이브러리에 저장'));
    await tester.pumpAndSettle();
    expect(find.text('작품과 녹음을 저장했습니다. 준비되면 재생해 보세요.'), findsOneWidget);
    await _captureR3(tester, 'registered-390-light');
    expect(find.text('첫 음악을 재생했어요.'), findsNothing);
    expect(player.state, isNot(LocalPlayerState.playing));
    await tester.tap(find.text('녹음 재생'));
    await tester.pumpAndSettle();
    expect(player.state, LocalPlayerState.playing);
    expect(find.text('첫 음악을 재생했어요.'), findsOneWidget);
    await _captureR3(tester, 'first-playing-390-light');
    expect(
      (await repository.load()).single.importStatus,
      AudioImportStatus.linked,
    );
  });

  testWidgets(
    'empty library imports songs and starts file playback without catalog',
    (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final player = FakeLocalPlayer();
      await tester.pumpWidget(
        _app(player: player, importer: const _Importer()),
      );
      await tester.pumpAndSettle();
      expect(find.text('보관함이 비어 있습니다'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('persistent-playback-strip')),
        findsNothing,
      );
      await tester.tap(find.text('음악 가져오기'));
      await tester.pumpAndSettle();
      expect(find.text('보관함이 비어 있습니다'), findsNothing);
      expect(find.text('최근 추가한 음악'), findsOneWidget);
      expect(find.text('클래식 작품'), findsNothing);
      await tester.tap(find.byKey(const ValueKey('file-category-songs')));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.byTooltip('Allegro 재생'),
        300,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.byTooltip('Allegro 재생'));
      await tester.pumpAndSettle();
      expect(player.state, LocalPlayerState.playing);
      expect(player.queue.map((item) => item.trackId), [
        'local-file:allegro',
        'local-file:andante',
      ]);
      expect(
        find.byKey(const ValueKey('persistent-playback-strip')),
        findsOneWidget,
      );
      await tester.tap(find.byTooltip('축약 일시정지'));
      await tester.pumpAndSettle();
      expect(player.state, LocalPlayerState.paused);
      await tester.tap(find.byTooltip('내 음악 검색'));
      await tester.pumpAndSettle();
      expect(player.queue, hasLength(2));
      await tester.tap(find.byTooltip('재생 상세 열기'));
      await tester.pumpAndSettle();
      expect(find.text('재생 대기열'), findsOneWidget);
      expect(find.byKey(const ValueKey('now-playing-queue-0')), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('축약 다음'));
      await tester.pumpAndSettle();
      expect(player.currentItem?.trackId, 'local-file:andante');
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'album, artist and folder views use real files; missing stays visible',
    (tester) async {
      final player = FakeLocalPlayer();
      final missing = _files.last.copyWith(
        id: 'missing',
        fileName: 'gone.flac',
        availability: AudioFileAvailability.missing,
        importStatus: AudioImportStatus.missing,
      );
      await tester.pumpWidget(
        _app(player: player, stored: [..._files, missing]),
      );
      await tester.pumpAndSettle();
      for (final category in ['albums', 'artists']) {
        await tester.tap(find.byKey(ValueKey('file-category-$category')));
        await tester.pumpAndSettle();
        expect(find.text(category == 'albums' ? '교향곡' : '연주자'), findsOneWidget);
        await tester.tap(find.byTooltip('뒤로'));
        await tester.pumpAndSettle();
      }
      await tester.tap(find.byTooltip('도구 더보기'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('폴더별 보기'));
      await tester.pumpAndSettle();
      expect(find.text('fixture'), findsOneWidget);
      await tester.tap(find.byTooltip('뒤로'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('file-category-songs')));
      await tester.pumpAndSettle();
      expect(find.textContaining('파일 없음'), findsWidgets);
      await tester.tap(find.byTooltip('Andante 파일 상태 확인'));
      await tester.pumpAndSettle();
      expect(player.queue, isEmpty);
      expect(find.byTooltip('음원 정보 및 파일 복구 열기'), findsOneWidget);
      await tester.tap(find.byTooltip('뒤로'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('file-category-songs')));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Andante 재생').first);
      await tester.pumpAndSettle();
      expect(player.currentItem?.trackId, 'local-file:andante');
    },
  );

  testWidgets('목록 검색·정렬은 현재 재생과 큐를 유지하고 빈 결과를 구분한다', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final player = FakeLocalPlayer();
    await tester.pumpWidget(_app(player: player, stored: _files));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('file-category-songs')));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Allegro 재생'));
    await tester.pumpAndSettle();
    final queueIds = player.queue.map((item) => item.trackId).toList();

    await tester.enterText(find.byType(TextField), 'Andante');
    await tester.pumpAndSettle();
    expect(find.byTooltip('Allegro 재생'), findsNothing);
    expect(find.byTooltip('Andante 재생'), findsOneWidget);
    expect(player.queue.map((item) => item.trackId), queueIds);
    expect(player.currentItem?.trackId, 'local-file:allegro');

    await tester.enterText(find.byType(TextField), '없는 곡');
    await tester.pumpAndSettle();
    expect(find.text('검색 결과가 없습니다'), findsOneWidget);
    await tester.enterText(find.byType(TextField), '');
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('곡 정렬'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('추가한 날짜'));
    await tester.pumpAndSettle();
    expect(player.queue.map((item) => item.trackId), queueIds);
    expect(
      find.byKey(const ValueKey('persistent-playback-strip')),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('최근 추가한 앨범 카드에서 앨범의 곡 목록으로 이동한다', (tester) async {
    await tester.pumpWidget(_app(player: FakeLocalPlayer(), stored: _files));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('교향곡'),
      250,
      scrollable: find.byType(Scrollable).first,
    );
    await Scrollable.ensureVisible(
      tester.element(find.text('교향곡').first),
      alignment: 0.3,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('교향곡').hitTestable());
    await tester.pumpAndSettle();
    expect(find.text('Allegro'), findsOneWidget);
    expect(find.text('Andante'), findsOneWidget);
    expect(find.byTooltip('곡 정렬'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('보관함 탐색 실제 위젯 화면을 검수용으로 촬영한다', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await _loadR3Fonts(tester);
    await tester.pumpWidget(
      RepaintBoundary(
        key: _r3CaptureKey,
        child: _app(
          player: FakeLocalPlayer(),
          stored: _files,
          fontFamily: Platform.environment['DDIRORI_BRAND_FONT'] == null
              ? null
              : 'R3Capture',
        ),
      ),
    );
    await tester.pumpAndSettle();
    await _captureR3(tester, 'apple-library-home-390-light');
    await tester.tap(find.byKey(const ValueKey('file-category-songs')));
    await tester.pumpAndSettle();
    await _captureR3(tester, 'apple-library-songs-390-light');
    await tester.enterText(find.byType(TextField), '없는 곡');
    await tester.pumpAndSettle();
    await _captureR3(tester, 'apple-library-no-results-390-light');
    expect(tester.takeException(), isNull);
  });

  for (final (width, dark) in [(320.0, true), (1024.0, false)]) {
    testWidgets('목록 검색·정렬은 ${width.toInt()}px 큰 글자에서도 동작한다', (tester) async {
      tester.view.physicalSize = Size(width, 900);
      tester.view.devicePixelRatio = 1;
      tester.platformDispatcher.textScaleFactorTestValue = 2;
      if (dark) {
        tester.platformDispatcher.platformBrightnessTestValue = Brightness.dark;
      }
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.platformDispatcher.clearAllTestValues);
      await _loadR3Fonts(tester);
      await tester.pumpWidget(
        RepaintBoundary(
          key: _r3CaptureKey,
          child: _app(
            player: FakeLocalPlayer(),
            stored: _files,
            fontFamily: Platform.environment['DDIRORI_BRAND_FONT'] == null
                ? null
                : 'R3Capture',
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('file-category-songs')));
      await tester.pumpAndSettle();
      expect(find.byTooltip('곡 정렬'), findsOneWidget);
      expect(find.byType(TextField), findsOneWidget);
      expect(tester.takeException(), isNull);
      await _captureR3(
        tester,
        'apple-library-songs-${width.toInt()}-${dark ? 'dark' : 'light'}-200',
      );
    });
  }

  testWidgets('restores direct-file queue by stable file ID', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final player = FakeLocalPlayer();
    final snapshots = MemoryPlaybackQueueSnapshotStore()
      ..snapshot = const PlaybackQueueSnapshot(
        trackIds: ['local-file:allegro', 'local-file:andante'],
        currentTrackId: 'local-file:andante',
        savedAtMillis: 1,
      );
    await tester.pumpWidget(
      _app(player: player, stored: _files, snapshots: snapshots),
    );
    await tester.pumpAndSettle();
    expect(player.queue.map((item) => item.trackId), [
      'local-file:andante',
      'local-file:allegro',
    ]);
    expect(player.state, LocalPlayerState.ready);
    expect(
      find.byKey(const ValueKey('persistent-playback-strip')),
      findsOneWidget,
    );
  });

  testWidgets('320px large text keeps library and mini-player usable', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 900);
    tester.view.devicePixelRatio = 1;
    tester.platformDispatcher.textScaleFactorTestValue = 2;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.platformDispatcher.clearAllTestValues);
    final player = FakeLocalPlayer();
    await tester.pumpWidget(_app(player: player, stored: _files));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('file-category-songs')));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Allegro 재생'));
    await tester.pumpAndSettle();
    expect(find.byTooltip('재생 상세 열기'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'direct file and classical recording queues replace each other without data loss',
    (tester) async {
      tester.view.physicalSize = const Size(390, 1000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final player = FakeLocalPlayer();
      await tester.pumpWidget(
        _app(
          player: player,
          stored: [..._files, ...sampleClassicalLibrary.files],
          library: sampleClassicalLibrary,
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('file-category-songs')));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.byTooltip('Allegro 재생'),
        300,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.byTooltip('Allegro 재생'));
      await tester.pumpAndSettle();
      expect(player.currentItem?.isDirectFile, isTrue);
      await tester.tap(find.byTooltip('뒤로'));
      await tester.pumpAndSettle();
      final work = find.text('교향곡 5번 다단조');
      await tester.scrollUntilVisible(
        work,
        300,
        scrollable: find.byType(Scrollable).first,
      );
      await Scrollable.ensureVisible(
        tester.element(work.first),
        alignment: 0.2,
      );
      await tester.pumpAndSettle();
      await tester.tap(work.first.hitTestable());
      await tester.pumpAndSettle();
      final recording = find.text('클라이버 / 빈 필하모닉 연주 녹음');
      await tester.scrollUntilVisible(
        recording,
        300,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(recording.first.hitTestable());
      await tester.pumpAndSettle();
      await tester.tap(find.text('녹음 전체 재생'));
      await tester.pumpAndSettle();
      expect(player.currentItem?.isDirectFile, isFalse);
      expect(player.currentItem?.recordingId, 'recording.beethoven5.kleiber');
      await tester.pageBack();
      await tester.pumpAndSettle();
      await tester.pageBack();
      await tester.pumpAndSettle();
      final songs = find.byKey(const ValueKey('file-category-songs'));
      await tester.scrollUntilVisible(
        songs,
        -300,
        scrollable: find.byType(Scrollable).first,
      );
      await Scrollable.ensureVisible(tester.element(songs), alignment: 0.5);
      await tester.pumpAndSettle();
      await tester.tap(songs);
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.byTooltip('Allegro 재생'),
        300,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.byTooltip('Allegro 재생'));
      await tester.pumpAndSettle();
      expect(player.currentItem?.trackId, 'local-file:allegro');
      expect(player.queue, hasLength(greaterThan(1)));
      expect(tester.takeException(), isNull);
    },
  );
}

class _Picker implements AudioFilePicker {
  const _Picker();

  @override
  Future<List<SelectedAudioFile>> pickAudioFiles() async => const [
    _SelectedFile(),
  ];
}

class _SelectedFile implements SelectedAudioFile {
  const _SelectedFile();

  @override
  String get name => '01.flac';

  @override
  String? get mimeType => 'audio/flac';

  @override
  Future<int> length() async => 1;

  @override
  Stream<List<int>> openRead() => Stream.value([0]);
}

class _Importer implements LocalAudioImportController {
  const _Importer();

  @override
  Future<LocalAudioImportBatchResult> importFiles(
    List<SelectedAudioFile> selections, {
    LocalAudioImportCancellation? cancellation,
    void Function(LocalAudioImportStage stage)? onStage,
    void Function(LocalAudioImportProgress progress)? onProgress,
  }) async => LocalAudioImportBatchResult(
    items: const [
      LocalAudioImportItemResult(outcome: LocalAudioImportOutcome.imported),
    ],
    files: _files,
    candidates: const [],
  );

  @override
  Future<LocalAudioImportBatchResult> recoverManagedImports() async =>
      const LocalAudioImportBatchResult(items: [], files: [], candidates: []);
}

class _StoringImporter implements LocalAudioImportController {
  const _StoringImporter(this.repository);

  final ScannedAudioRepository repository;

  @override
  Future<LocalAudioImportBatchResult> importFiles(
    List<SelectedAudioFile> selections, {
    LocalAudioImportCancellation? cancellation,
    void Function(LocalAudioImportStage stage)? onStage,
    void Function(LocalAudioImportProgress progress)? onProgress,
  }) async {
    final file = _files.first.copyWith(
      importStatus: AudioImportStatus.needsReview,
    );
    await repository.store.save([file]);
    return LocalAudioImportBatchResult(
      items: const [
        LocalAudioImportItemResult(
          outcome: LocalAudioImportOutcome.imported,
          record: LocalAudioImportRecord(
            id: 'import-allegro',
            sourceKind: 'document',
            originalFileName: '01.flac',
            localPath: '/fixture/01.flac',
            sha256: 'fixture',
            sizeBytes: 1,
            importedAtMillis: 1,
            status: LocalAudioImportStatus.completed,
            fileId: 'allegro',
          ),
        ),
      ],
      files: [file],
      candidates: const [],
    );
  }

  @override
  Future<LocalAudioImportBatchResult> recoverManagedImports() async =>
      LocalAudioImportBatchResult(
        items: const [],
        files: await repository.load(),
        candidates: const [],
      );
}

class _FailingOnceLinkStore extends MemoryAudioFileTrackLinkStore {
  var shouldFail = true;

  @override
  Future<void> save(List<AudioFileTrackLink> links) async {
    if (shouldFail) {
      shouldFail = false;
      throw StateError('injected link write failure');
    }
    await super.save(links);
  }
}
