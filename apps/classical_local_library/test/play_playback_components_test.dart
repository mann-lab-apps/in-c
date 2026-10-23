import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/presentation/play_playback_components.dart';
import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('현재 재생 컨트롤은 상태와 동작을 연결한다', (tester) async {
    var toggles = 0;
    var next = 0;
    var stops = 0;
    Duration? seek;
    await tester.pumpWidget(
      MaterialApp(
        theme: ddiroriTheme(),
        home: Scaffold(
          body: PlayNowPlayingControls(
            state: _playingState(),
            canUseQueue: true,
            commandRunning: false,
            onPlayPause: () => toggles += 1,
            onNext: () => next += 1,
            onStop: () => stops += 1,
            onSeek: (value) => seek = value,
          ),
        ),
      ),
    );

    expect(find.bySemanticsLabel('상태: 재생 중'), findsOneWidget);
    expect(find.textContaining('/private/'), findsNothing);
    await tester.tap(find.byTooltip('일시정지'));
    await tester.tap(find.byTooltip('다음'));
    await tester.tap(find.byTooltip('정지'));
    await tester.drag(
      find.byKey(const ValueKey('playback-progress')),
      const Offset(100, 0),
    );
    await tester.pump();
    expect(toggles, 1);
    expect(next, 1);
    expect(stops, 1);
    expect(seek, isNotNull);

    await tester.pumpWidget(
      MaterialApp(
        theme: ddiroriTheme(),
        home: Scaffold(
          body: PlayNowPlayingControls(
            state: _playingState(),
            canUseQueue: true,
            commandRunning: true,
            onPlayPause: () => toggles += 1,
            onNext: () => next += 1,
            onStop: () => stops += 1,
            onSeek: (value) => seek = value,
          ),
        ),
      ),
    );
    await tester.tap(find.byTooltip('일시정지'));
    await tester.tap(find.byTooltip('다음'));
    await tester.tap(find.byTooltip('정지'));
    expect(toggles, 1);
    expect(next, 1);
    expect(stops, 1);
  });

  testWidgets('현재 재생 컨트롤은 좁은 폭과 200% 글자에서 넘치지 않는다', (tester) async {
    tester.view.physicalSize = const Size(320, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      MaterialApp(
        theme: ddiroriTheme(brightness: Brightness.dark),
        home: MediaQuery(
          data: const MediaQueryData(
            size: Size(320, 800),
            textScaler: TextScaler.linear(2),
          ),
          child: Scaffold(
            body: SingleChildScrollView(
              child: PlayNowPlayingControls(
                state: _playingState(),
                canUseQueue: true,
                commandRunning: false,
                onPlayPause: _noop,
                onNext: _noop,
                onStop: _noop,
                onSeek: _ignoreDuration,
              ),
            ),
          ),
        ),
      ),
    );

    expect(tester.takeException(), isNull);
  });
}

LocalPlaybackState _playingState() => const LocalPlaybackState(
  playerState: LocalPlayerState.playing,
  processingState: LocalPlaybackProcessingState.ready,
  queue: [
    LocalPlaybackQueueItem(
      trackId: 'track-1',
      recordingId: 'recording-1',
      workId: 'work-1',
      displayTitle: 'I. Allegro con brio',
      path: '/Users/listener/private/beethoven-5-1.flac',
      usesLinkedFile: true,
      workTitle: '교향곡 5번 단조, Op. 67',
      recordingTitle: '빈 필하모닉 오케스트라 녹음',
    ),
  ],
  currentIndex: 0,
  position: Duration(seconds: 30),
  duration: Duration(minutes: 2),
  bufferedPosition: Duration(minutes: 1),
);

void _noop() {}
void _ignoreDuration(Duration _) {}
