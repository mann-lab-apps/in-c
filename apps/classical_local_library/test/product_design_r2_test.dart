import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/library_detail_screen.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/main.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/presentation/play_library_components.dart';
import 'package:classical_local_library/sample_classical_library.dart';
import 'package:classical_local_library/scan_locations.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

const _captureKey = ValueKey('r2-capture');
final _queueA = [
  for (final track in sampleClassicalLibrary.tracksForRecording(
    'recording.beethoven5.kleiber',
  ))
    LocalPlaybackQueueItem(
      trackId: track.id,
      recordingId: track.recordingId,
      workId: 'work.beethoven.symphony5',
      displayTitle: sampleClassicalLibrary
          .partsForWork('work.beethoven.symphony5')[track.sequenceNumber - 1]
          .title
          .ko,
      path: '/private/fixture/${track.id}.flac',
      usesLinkedFile: true,
      workTitle: '교향곡 5번 다단조, 긴 원어 Symphony No. 5 in C minor',
      recordingTitle: '클라이버 / 빈 필하모닉 연주 녹음',
    ),
];

Widget _app(FakeLocalPlayer player) => RepaintBoundary(
  key: _captureKey,
  child: ClassicalLocalLibraryApp(
    fontFamily: 'DdiroriR2Capture',
    initialLibrary: sampleClassicalLibrary,
    enableDemoFeatures: false,
    playbackController: player,
    scanRepository: ScannedAudioRepository(
      MemoryScannedAudioStore(sampleClassicalLibrary.files),
    ),
    scanLocationRepository: ScanLocationRepository(MemoryScanLocationStore()),
    metadataCandidateRepository: MetadataCandidateRepository(
      MemoryMetadataCandidateStore(),
    ),
    fileTrackLinkRepository: AudioFileTrackLinkRepository(
      MemoryAudioFileTrackLinkStore([
        for (final track in sampleClassicalLibrary.tracks)
          AudioFileTrackLink(
            fileId: track.fileId,
            trackId: track.id,
            linkedAtMillis: 1,
          ),
      ]),
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
      final data = ByteData.sublistView(await File(font).readAsBytes());
      for (final family in ['DdiroriR2Capture', 'Roboto']) {
        await (FontLoader(family)..addFont(Future.value(data))).load();
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
  final directory = Platform.environment['DDIRORI_R2_CAPTURE_OUTPUT'];
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

Future<void> _center(WidgetTester t, Finder finder) async {
  await Scrollable.ensureVisible(t.element(finder), alignment: 0.5);
  await t.pumpAndSettle();
}

Future<void> _openPlaybackPlan(WidgetTester t) async {
  await t.tap(find.byTooltip('도구 더보기'));
  await t.pumpAndSettle();
  await t.tap(find.text('재생 계획').last);
  await t.pumpAndSettle();
}

void main() {
  testWidgets(
    'retry reloads all retained movements and starts from first, not browsing plan',
    (t) async {
      await _environment(t, 390, 1, Brightness.light);
      final player = _RecoveringPlayer();
      await t.pumpWidget(_app(player));
      await t.pumpAndSettle();
      expect(player.playbackState.currentIndex, 2);
      await t.tap(find.byTooltip('재생 상세 열기'));
      await t.pumpAndSettle();
      expect(find.textContaining('첫 악장부터'), findsOneWidget);
      await _capture(t, 'retry-error-390-1-light');
      await _center(t, find.byTooltip('재생 다시 시도'));
      await t.tap(find.byTooltip('재생 다시 시도'));
      await t.pumpAndSettle();
      expect(
        player.queue.map((item) => item.trackId),
        _queueA.map((item) => item.trackId),
      );
      expect(player.currentIndex, 0);
      expect(player.state, LocalPlayerState.playing);
      expect(player.playbackState.failure, isNull);
      await _capture(t, 'retry-success-390-1-light');
      await t.pumpWidget(const SizedBox());
    },
  );

  testWidgets('wide playback controls respect side and bottom safe areas', (
    t,
  ) async {
    await _environment(t, 1024, 2, Brightness.dark);
    t.view.padding = const FakeViewPadding(left: 32, right: 44, bottom: 24);
    final player = _CountingPlayer();
    await t.pumpWidget(_app(player));
    await t.pumpAndSettle();
    await player.loadQueue(_queueA);
    await player.play();
    await t.pumpAndSettle();
    final details = find.byTooltip('재생 상세 열기');
    await _center(t, details);
    expect(t.getRect(details).right, lessThanOrEqualTo(980));
    expect(t.getRect(details).bottom, lessThanOrEqualTo(976));
    expect(t.takeException(), isNull);
    await _capture(t, 'safe-area-1024-2-dark');
    await t.pumpWidget(const SizedBox());
  });

  testWidgets('keyboard seek commits once and uses engine time semantics', (
    t,
  ) async {
    await _environment(t, 390, 1, Brightness.light);
    final player = _CountingPlayer();
    await t.pumpWidget(_app(player));
    await t.pumpAndSettle();
    await player.loadQueue(_queueA);
    await player.play();
    await t.pumpAndSettle();
    await t.tap(find.byTooltip('재생 상세 열기'));
    await t.pumpAndSettle();
    final slider = find.byType(Slider);
    await _center(t, slider);
    await t.tap(slider);
    await t.pumpAndSettle();
    player.commands.clear();
    final before = player.playbackState.position;
    final sliderFocus = t
        .widget<FocusableActionDetector>(
          find.descendant(
            of: slider,
            matching: find.byType(FocusableActionDetector),
          ),
        )
        .focusNode!;
    sliderFocus.requestFocus();
    await t.pumpAndSettle();
    expect(sliderFocus.hasFocus, isTrue);
    await t.sendKeyEvent(LogicalKeyboardKey.arrowRight);
    await t.pumpAndSettle();
    expect(player.commands, ['seek']);
    expect(player.playbackState.position, greaterThan(before));
    expect(find.bySemanticsLabel(RegExp('재생 위치')), findsWidgets);
    await _capture(t, 'seek-success-390-1-light');
    await t.pumpWidget(const SizedBox());
  });

  for (final width in [320.0, 390.0, 1024.0]) {
    for (final scale in [1.0, 2.0]) {
      for (final brightness in Brightness.values) {
        testWidgets(
          'P03 A playing while B browses $width/$scale/${brightness.name}',
          (t) async {
            await _environment(t, width, scale, brightness);
            final player = _CountingPlayer();
            await t.pumpWidget(_app(player));
            await t.pumpAndSettle();
            await player.loadQueue(_queueA);
            await player.play();
            await player.updatePosition(const Duration(seconds: 42));
            await t.pumpAndSettle();
            player.commands.clear();
            final before = player.playbackState;
            await t.tap(find.byTooltip('내 음악 검색'));
            await t.pumpAndSettle();
            await t.enterText(find.byType(TextField), '브렌델');
            await t.pumpAndSettle();
            final result = find.text('브렌델 피아노 연주 녹음');
            await _center(t, result);
            await t.tap(result);
            await t.pumpAndSettle();
            expect(find.byType(RecordingDetailScreen), findsOneWidget);
            expect(player.playbackState, same(before));
            expect(player.commands, isEmpty);
            expect(
              find
                  .byType(PlayMovementRow)
                  .evaluate()
                  .every((e) => !(e.widget as PlayMovementRow).current),
              isTrue,
            );
            final name = '${width.toInt()}-${scale.toInt()}-${brightness.name}';
            await _capture(t, 'browse-b-$name');
            await t.scrollUntilVisible(
              find.text('3악장 Presto agitato'),
              250,
              scrollable: find
                  .descendant(
                    of: find.byType(ListView),
                    matching: find.byType(Scrollable),
                  )
                  .first,
            );
            await _center(t, find.text('3악장 Presto agitato'));
            final pause = find.byTooltip(width >= 800 ? '일시정지' : '축약 일시정지');
            await _center(t, pause);
            expect(t.getSize(pause).width, greaterThanOrEqualTo(48));
            expect(t.getSize(pause).height, greaterThanOrEqualTo(48));
            expect(pause.hitTestable(), findsOneWidget);
            if (width < 800) {
              expect(
                t.getRect(find.byType(ListView)).bottom,
                lessThanOrEqualTo(
                  t
                      .getRect(
                        find.byKey(const ValueKey('persistent-playback-strip')),
                      )
                      .top,
                ),
              );
            }
            await _capture(t, 'browse-end-$name');
            t.platformDispatcher.platformBrightnessTestValue =
                brightness == Brightness.light
                ? Brightness.dark
                : Brightness.light;
            await t.pumpAndSettle();
            expect(player.playbackState, same(before));
            expect(player.commands, isEmpty);
            await t.tap(pause);
            await t.pumpAndSettle();
            expect(player.state, LocalPlayerState.paused);
            expect(player.commands, ['pause']);
            expect(
              player.queue.map((item) => item.trackId),
              _queueA.map((item) => item.trackId),
            );
            expect(player.playbackState.position, const Duration(seconds: 42));
            expect(t.takeException(), isNull);
            await t.pageBack();
            await t.pumpAndSettle();
            t.platformDispatcher.platformBrightnessTestValue = brightness;
            await _openPlaybackPlan(t);
            await _capture(t, 'queue-$name');
            await t.pumpWidget(const SizedBox());
            await t.pumpAndSettle();
          },
        );
      }
    }
  }

  testWidgets(
    'P02 shared context once, mixed groups and private file details',
    (t) async {
      await _environment(t, 390, 1, Brightness.light);
      final player = _CountingPlayer();
      await t.pumpWidget(_app(player));
      await t.pumpAndSettle();
      await player.loadQueue(_queueA);
      await player.play();
      await _openPlaybackPlan(t);
      expect(find.byType(PlayQueueContext), findsOneWidget);
      expect(find.text(_queueA.first.workTitle), findsOneWidget);
      expect(find.text(_queueA.first.recordingTitle), findsOneWidget);
      expect(find.byType(PlayQueueRow), findsNWidgets(4));
      await _capture(t, 'queue-context-390-1-light');
      await t.scrollUntilVisible(
        find.byTooltip('음원 정보 1'),
        250,
        scrollable: find.byType(Scrollable).first,
      );
      await _center(t, find.byTooltip('음원 정보 1'));
      await t.tap(find.byTooltip('음원 정보 1'));
      await t.pumpAndSettle();
      expect(
        find.textContaining('${_queueA.first.trackId}.flac'),
        findsOneWidget,
      );
      expect(find.textContaining('/private/fixture'), findsNothing);
      await _capture(t, 'file-info-390-1-light');
      await t.tap(find.text('닫기'));
      final other = LocalPlaybackQueueItem(
        trackId: 'other',
        recordingId: 'other',
        workId: 'other',
        displayTitle: '다른 작품 악장',
        path: '/fixture/other.wav',
        usesLinkedFile: false,
        workTitle: '',
        recordingTitle: '',
      );
      await player.loadQueue([_queueA.first, other, _queueA[1]]);
      await t.pumpAndSettle();
      expect(find.byType(PlayQueueContext), findsNWidgets(3));
      expect(find.text('작품 정보 없음'), findsOneWidget);
      expect(find.text('녹음 정보 없음'), findsOneWidget);
      expect(player.queue.map((item) => item.trackId), [
        _queueA.first.trackId,
        'other',
        _queueA[1].trackId,
      ]);
      await _capture(t, 'mixed-queue-390-1-light');
      await t.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'seek command is submitted once while pending, details use actual state',
    (t) async {
      await _environment(t, 390, 1, Brightness.light);
      final player = _HeldSeekPlayer();
      await t.pumpWidget(_app(player));
      await t.pumpAndSettle();
      await player.loadQueue(_queueA);
      await player.play();
      await t.pumpAndSettle();
      await t.tap(find.byTooltip('재생 상세 열기'));
      await t.pumpAndSettle();
      final slider = find.byType(Slider);
      await _center(t, slider);
      final submit = t.widget<Slider>(slider).onChangeEnd!;
      submit(40000);
      submit(50000);
      await t.pump();
      expect(player.seekCalls, 1);
      expect(t.widget<Slider>(slider).onChanged, isNull);
      await player.updatePosition(const Duration(seconds: 3));
      await t.pump();
      expect(player.playbackState.position, const Duration(seconds: 3));
      player.seekDone.complete();
      await t.pumpAndSettle();
      expect(player.playbackState.position, const Duration(seconds: 40));
      expect(t.widget<Slider>(slider).value, 40000);
      await t.pumpWidget(const SizedBox());
    },
  );
}

class _CountingPlayer extends FakeLocalPlayer {
  _CountingPlayer()
    : super(
        trackDurations: {
          for (final item in _queueA) item.trackId: const Duration(minutes: 3),
        },
      );
  final commands = <String>[];
  @override
  Future<void> loadQueue(List<LocalPlaybackQueueItem> queue) {
    commands.add('load');
    return super.loadQueue(queue);
  }

  @override
  Future<void> play() {
    commands.add('play');
    return super.play();
  }

  @override
  Future<void> pause() {
    commands.add('pause');
    return super.pause();
  }

  @override
  Future<void> resume() {
    commands.add('resume');
    return super.resume();
  }

  @override
  Future<void> next() {
    commands.add('next');
    return super.next();
  }

  @override
  Future<void> stop() {
    commands.add('stop');
    return super.stop();
  }

  @override
  Future<void> seek(Duration position) {
    commands.add('seek');
    return super.seek(position);
  }
}

class _HeldSeekPlayer extends _CountingPlayer {
  final seekDone = Completer<void>();
  var seekCalls = 0;
  @override
  Future<void> seek(Duration position) async {
    seekCalls++;
    await seekDone.future;
    await super.seek(position);
  }
}

class _RecoveringPlayer extends _CountingPlayer {
  bool _failed = true;
  @override
  LocalPlaybackState get playbackState => _failed
      ? LocalPlaybackState(
          playerState: LocalPlayerState.error,
          queue: _queueA,
          currentIndex: 2,
          position: const Duration(seconds: 42),
          failure: const LocalPlaybackFailure(
            kind: LocalPlaybackFailureKind.loadFailed,
            userMessage: '오디오를 불러오지 못했습니다.',
          ),
        )
      : super.playbackState;
  @override
  Future<void> loadQueue(List<LocalPlaybackQueueItem> queue) {
    _failed = false;
    return super.loadQueue(queue);
  }
}
