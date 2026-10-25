import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/main.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/metadata_overrides.dart';
import 'package:classical_local_library/presentation/metadata_edit_dialog.dart';
import 'package:classical_local_library/presentation/play_playback_components.dart';
import 'package:classical_local_library/sample_classical_library.dart';
import 'package:classical_local_library/scan_locations.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

const _captureKey = ValueKey('r1-capture');
const _item = LocalPlaybackQueueItem(
  trackId: 'track.beethoven5.kleiber.1',
  recordingId: 'recording.beethoven5.kleiber',
  workId: 'work.beethoven5',
  displayTitle: '1악장 Allegro con brio',
  path: '/fixture/private/movement.wav',
  usesLinkedFile: true,
  workTitle: '교향곡 5번 다단조, 긴 작품 제목과 원어 Symphony No. 5 in C minor',
  recordingTitle: '클라이버 / 빈 필하모닉 연주 녹음',
);

Widget _app(FakeLocalPlayer player, {bool empty = false}) => RepaintBoundary(
  key: _captureKey,
  child: ClassicalLocalLibraryApp(
    fontFamily: 'DdiroriCapture',
    playbackController: player,
    initialLibrary: empty ? emptyClassicalLibrary : sampleClassicalLibrary,
    enableDemoFeatures: !empty,
    scanRepository: ScannedAudioRepository(MemoryScannedAudioStore()),
    scanLocationRepository: ScanLocationRepository(MemoryScanLocationStore()),
    metadataCandidateRepository: MetadataCandidateRepository(
      MemoryMetadataCandidateStore(),
    ),
    fileTrackLinkRepository: AudioFileTrackLinkRepository(
      MemoryAudioFileTrackLinkStore(),
    ),
  ),
);

Future<void> _environment(
  WidgetTester t,
  double width,
  double scale,
  Brightness brightness,
) async {
  t.view.physicalSize = Size(width, 1000);
  t.view.devicePixelRatio = 1;
  t.view.padding = const FakeViewPadding(bottom: 24);
  t.platformDispatcher.textScaleFactorTestValue = scale;
  t.platformDispatcher.platformBrightnessTestValue = brightness;
  t.platformDispatcher.accessibilityFeaturesTestValue =
      FakeAccessibilityFeatures(disableAnimations: scale == 2);
  addTearDown(t.view.resetPhysicalSize);
  addTearDown(t.view.resetDevicePixelRatio);
  addTearDown(t.view.resetPadding);
  addTearDown(t.platformDispatcher.clearAllTestValues);
  final font = Platform.environment['DDIRORI_BRAND_FONT'];
  if (font != null) {
    await t.runAsync(() async {
      for (final family in ['DdiroriCapture', 'Roboto']) {
        await (FontLoader(family)..addFont(
              Future.value(
                ByteData.sublistView(await File(font).readAsBytes()),
              ),
            ))
            .load();
      }
      final icons = Platform.environment['DDIRORI_MATERIAL_FONT'];
      if (icons != null) {
        await (FontLoader('MaterialIcons')..addFont(
              Future.value(
                ByteData.sublistView(await File(icons).readAsBytes()),
              ),
            ))
            .load();
      }
    });
  }
}

Future<void> _capture(WidgetTester t, String name) async {
  final directory = Platform.environment['DDIRORI_R1_CAPTURE_OUTPUT'];
  if (directory == null) return;
  final boundary = t.renderObject<RenderRepaintBoundary>(
    find.byKey(_captureKey),
  );
  await t.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 1);
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    final file = File('$directory/$name.png');
    await file.parent.create(recursive: true);
    await file.writeAsBytes(data!.buffer.asUint8List());
    image.dispose();
  });
}

Future<void> _view(WidgetTester t, String label) async {
  await t.tap(find.byTooltip('$label 보기'));
  await t.pumpAndSettle();
}

void main() {
  testWidgets(
    'R1 retry reloads the failed engine queue, not a new random plan',
    (t) async {
      final probe = _RecoverableFileProbe();
      final player = FakeLocalPlayer(
        validator: LocalPlaybackQueueValidator(fileProbe: probe),
      );
      await t.pumpWidget(_app(player));
      await t.pumpAndSettle();
      await player.loadQueue([_item]);
      await t.pumpAndSettle();
      expect(
        player.playbackState.failure?.kind,
        LocalPlaybackFailureKind.missingFile,
      );
      await _view(t, '현재 재생');
      await t.ensureVisible(find.byTooltip('재생 다시 시도'));
      probe.available = true;
      await t.tap(find.byTooltip('재생 다시 시도'));
      await t.pumpAndSettle();
      expect(player.queue, [_item]);
      expect(player.state, LocalPlayerState.playing);
      expect(player.playbackState.failure, isNull);
      await t.pumpWidget(const SizedBox());
    },
  );

  testWidgets('R1 metadata pending, failure, retry and success evidence', (
    t,
  ) async {
    await _environment(t, 320, 2, Brightness.dark);
    var pending = Completer<void>();
    var saves = 0;
    await t.pumpWidget(
      RepaintBoundary(
        key: _captureKey,
        child: MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: ddiroriTheme(
            brightness: Brightness.dark,
            fontFamily: 'DdiroriCapture',
          ),
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                onPressed: () => showDialog<void>(
                  context: context,
                  builder: (_) => MetadataEditDialog(
                    existing: null,
                    effective: EffectiveFileMetadata.resolve(),
                    onSave: (_) {
                      saves++;
                      return pending.future;
                    },
                  ),
                ),
                child: const Text('편집 열기'),
              ),
            ),
          ),
        ),
      ),
    );
    await t.tap(find.text('편집 열기'));
    await t.pumpAndSettle();
    await t.enterText(find.byType(TextField).first, '루트비히 판 베토벤');
    await t.pumpAndSettle();
    await t.tap(find.text('저장'));
    await t.pump();
    await t.pump(const Duration(milliseconds: 400));
    expect(t.widget<TextField>(find.byType(TextField).first).readOnly, isTrue);
    await _capture(t, 'metadata-pending-320-dark-200');
    pending.completeError(StateError('fixture save failure'));
    await t.pumpAndSettle();
    expect(find.textContaining('저장하지 못했습니다.'), findsOneWidget);
    expect(
      t.widget<TextField>(find.byType(TextField).first).controller!.text,
      '루트비히 판 베토벤',
    );
    await _capture(t, 'metadata-failure-320-dark-200');
    pending = Completer<void>();
    await t.tap(find.text('저장'));
    await t.pump();
    expect(saves, 2);
    expect(find.byType(MetadataEditDialog), findsOneWidget);
    pending.complete();
    await t.pumpAndSettle();
    expect(find.byType(MetadataEditDialog), findsNothing);
    expect(t.takeException(), isNull);
    await t.pumpWidget(const SizedBox());
  });

  for (final width in [320.0, 390.0, 1024.0]) {
    for (final scale in [1.0, 2.0]) {
      for (final brightness in Brightness.values) {
        testWidgets(
          'R1 navigation preserves engine state $width/$scale/${brightness.name}',
          (t) async {
            await _environment(t, width, scale, brightness);
            final player = FakeLocalPlayer(
              trackDurations: {_item.trackId: const Duration(minutes: 3)},
            );
            await t.pumpWidget(_app(player));
            await t.pumpAndSettle();
            await player.loadQueue([_item]);
            await player.play();
            await player.updatePosition(const Duration(seconds: 42));
            await t.pumpAndSettle();
            final before = player.playbackState;
            final name = '${width.toInt()}-${scale.toInt()}-${brightness.name}';
            await _capture(t, 'library-$name');
            await t.scrollUntilVisible(
              find.text('녹음 있는 작품'),
              200,
              scrollable: find.byType(Scrollable).first,
            );
            await t.tap(find.text('녹음 있는 작품'));
            await t.pumpAndSettle();
            await Scrollable.ensureVisible(
              t.element(find.byTooltip('작품 정렬')),
              alignment: 0.5,
            );
            await t.pumpAndSettle();
            await t.tap(find.byTooltip('작품 정렬'));
            await t.pumpAndSettle();
            await t.tap(
              find.widgetWithText(CheckedPopupMenuItem<bool>, '작곡가순'),
            );
            await t.pumpAndSettle();
            for (final label in ['현재 재생', '관리', '감상', '라이브러리']) {
              await _view(t, label);
              expect(player.playbackState, same(before));
            }
            t.platformDispatcher.platformBrightnessTestValue =
                brightness == Brightness.light
                ? Brightness.dark
                : Brightness.light;
            await t.pumpAndSettle();
            expect(player.playbackState, same(before));
            t.platformDispatcher.platformBrightnessTestValue = brightness;
            await _view(t, '현재 재생');
            await _capture(t, 'playback-top-$name');
            await t.scrollUntilVisible(
              find.byKey(const ValueKey('playback-progress')),
              200,
              scrollable: find.byType(Scrollable).first,
            );
            await t.pumpAndSettle();
            await Scrollable.ensureVisible(
              t.element(find.byKey(const ValueKey('playback-progress'))),
              alignment: 0.5,
            );
            await t.pumpAndSettle();
            await _capture(t, 'playback-$name');
            expect(find.textContaining('/fixture/private'), findsNothing);
            expect(t.takeException(), isNull);
            expect(
              t.getRect(find.byTooltip('현재 재생 보기')).bottom,
              lessThanOrEqualTo(976),
            );
            await t.pumpWidget(const SizedBox());
            await t.pumpAndSettle();
          },
        );
      }
    }
  }

  testWidgets(
    'R1 first empty and search empty have distinct recovery actions',
    (t) async {
      await _environment(t, 390, 1, Brightness.light);
      await t.pumpWidget(_app(FakeLocalPlayer(), empty: true));
      await t.pumpAndSettle();
      expect(find.text('첫 음악을 담아볼까요?'), findsOneWidget);
      expect(find.byType(DdiroriBach), findsOneWidget);
      await _capture(t, 'empty-390-light');
      await t.enterText(find.byType(TextField), '없는 작품 qzx');
      await t.pumpAndSettle();
      expect(find.text('검색 결과가 없습니다.'), findsOneWidget);
      expect(find.byType(DdiroriBach), findsNothing);
      await _capture(t, 'no-results-390-light');
      await t.tap(find.text('검색 초기화'));
      await t.pumpAndSettle();
      expect(find.text('첫 음악을 담아볼까요?'), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    },
  );

  for (final state in ['loading', 'missing', 'failed', 'unknown', 'disabled']) {
    testWidgets('R1 transport $state, 320px dark 200%', (t) async {
      await _environment(t, 320, 2, Brightness.dark);
      var retries = 0;
      final error = state == 'missing' || state == 'failed';
      final playback = LocalPlaybackState(
        playerState: error
            ? LocalPlayerState.error
            : state == 'loading'
            ? LocalPlayerState.loading
            : LocalPlayerState.ready,
        queue: state == 'disabled' ? [] : [_item],
        currentIndex: 0,
        processingState: state == 'loading'
            ? LocalPlaybackProcessingState.loading
            : LocalPlaybackProcessingState.ready,
        failure: error
            ? LocalPlaybackFailure(
                kind: state == 'missing'
                    ? LocalPlaybackFailureKind.missingFile
                    : LocalPlaybackFailureKind.loadFailed,
                userMessage: state == 'missing'
                    ? '연결된 오디오 파일을 찾을 수 없습니다.'
                    : '오디오를 불러오지 못했습니다.',
                path: _item.path,
              )
            : null,
      );
      await t.pumpWidget(
        RepaintBoundary(
          key: _captureKey,
          child: MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: ddiroriTheme(
              brightness: Brightness.dark,
              fontFamily: 'DdiroriCapture',
            ),
            home: Scaffold(
              body: SafeArea(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: PlayNowPlayingControls(
                    state: playback,
                    canUseQueue: state != 'disabled',
                    commandRunning: false,
                    onPlayPause: () => retries++,
                    onNext: () {},
                    onStop: () {},
                    onSeek: (_) {},
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      await t.pump(const Duration(milliseconds: 100));
      expect(t.takeException(), isNull);
      expect(find.textContaining('/fixture/private'), findsNothing);
      expect(t.widget<Slider>(find.byType(Slider)).onChanged, isNull);
      if (error) {
        await t.ensureVisible(find.byTooltip('재생 다시 시도'));
        await t.tap(find.byTooltip('재생 다시 시도'));
        expect(retries, 1);
      }
      await _capture(t, '$state-320-dark-200');
      await t.pumpWidget(const SizedBox());
    });
  }
}

class _RecoverableFileProbe implements LocalPlaybackFileProbe {
  bool available = false;
  @override
  Future<bool> exists(String path) async => available;
}
