import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/just_audio_playback.dart';
import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/main.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/playback_audio_session.dart';
import 'package:classical_local_library/playback_position.dart';
import 'package:classical_local_library/scan_locations.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:path_provider/path_provider.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('iOS native audio continues across an actual OS app switch', (
    tester,
  ) async {
    expect(Platform.isIOS, isTrue);
    final directory = await (await getTemporaryDirectory()).createTemp(
      'bg-qa-',
    );
    final bytes = await rootBundle.load('assets/audio_test/movement_1.wav');
    final file = File('${directory.path}/synthetic.wav');
    await file.writeAsBytes(bytes.buffer.asUint8List());
    final store = MemoryPlaybackPositionStore();
    final player = JustAudioLocalPlaybackController(
      positionCoordinator: PlaybackPositionCoordinator(store: store),
    );
    final lifecycle = _LifecycleTrace();
    WidgetsBinding.instance.addObserver(lifecycle);
    addTearDown(() async {
      WidgetsBinding.instance.removeObserver(lifecycle);
      await player.dispose();
      await directory.delete(recursive: true);
    });
    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        initialLibrary: emptyClassicalLibrary,
        enableDemoFeatures: false,
        playbackController: player,
        scanRepository: ScannedAudioRepository(MemoryScannedAudioStore()),
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await player.loadQueue([
      for (var index = 0; index < 12; index++) _item(file.path, index),
    ]);
    await player.play();
    await _wait(() => player.playbackState.position.inMilliseconds >= 200);
    final startIndex = player.playbackState.currentIndex;
    debugPrint('DDIRORI_BACKGROUND_READY');
    await _wait(() => lifecycle.states.contains(AppLifecycleState.paused));
    await _wait(() => lifecycle.states.last == AppLifecycleState.resumed);
    expect(player.playbackState.playerState, LocalPlayerState.playing);
    expect(player.playbackState.failure, isNull);
    final returnedIndex = player.playbackState.currentIndex;
    expect(returnedIndex, greaterThan(startIndex));
    final saved = await store.load(file.path);
    expect(saved, isNotNull, reason: 'background transition saves position');
    await _wait(
      () => player.playbackState.playerState == LocalPlayerState.completed,
      timeout: const Duration(seconds: 40),
    );
    // The app contract places completed queues one past the final item.
    expect(
      player.playbackState.currentIndex,
      player.playbackState.queue.length,
    );
    expect(player.playbackState.currentItem, isNull);
    expect(player.playbackState.failure, isNull);
    debugPrint(
      'DDIRORI_BACKGROUND_RESULT ${jsonEncode({'lifecycle': lifecycle.states.map((state) => state.name).toList(), 'start_index': startIndex, 'returned_index': returnedIndex, 'completed_index': player.playbackState.currentIndex, 'position_saved': saved != null, 'completed': true})}',
    );
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
  }, skip: !const bool.fromEnvironment('EXPECT_OS_BACKGROUND'));

  testWidgets('native player retains pause and no-auto-resume event policy', (
    tester,
  ) async {
    final directory = await (await getTemporaryDirectory()).createTemp(
      'event-qa-',
    );
    final bytes = await rootBundle.load('assets/audio_test/movement_1.wav');
    final file = File('${directory.path}/synthetic.wav');
    await file.writeAsBytes(bytes.buffer.asUint8List());
    final session = MemoryLocalPlaybackAudioSession();
    final player = JustAudioLocalPlaybackController(audioSession: session);
    addTearDown(() async {
      await player.dispose();
      await directory.delete(recursive: true);
    });
    await player.loadQueue([_item(file.path, 0)]);
    await player.play();
    session.emitInterruption(
      const LocalAudioInterruptionEvent(
        isBeginning: true,
        type: LocalAudioInterruptionType.pause,
      ),
    );
    await _wait(
      () => player.playbackState.playerState == LocalPlayerState.paused,
    );
    session.emitInterruption(
      const LocalAudioInterruptionEvent(
        isBeginning: false,
        type: LocalAudioInterruptionType.pause,
      ),
    );
    await Future<void>.delayed(const Duration(milliseconds: 250));
    expect(player.playbackState.playerState, LocalPlayerState.paused);
    await player.resume();
    session.emitBecomingNoisy();
    await _wait(
      () => player.playbackState.playerState == LocalPlayerState.paused,
    );
    await player.stop();
    expect(player.playbackState.playerState, LocalPlayerState.stopped);
  });
}

LocalPlaybackQueueItem _item(String path, int index) => LocalPlaybackQueueItem(
  trackId: 'local-file:synthetic-$index',
  recordingId: '',
  workId: '',
  displayTitle: '합성 음원 $index',
  path: path,
  usesLinkedFile: true,
  workTitle: '',
  recordingTitle: '',
);

Future<void> _wait(
  bool Function() condition, {
  Duration timeout = const Duration(seconds: 20),
}) async {
  final clock = Stopwatch()..start();
  while (!condition()) {
    if (clock.elapsed > timeout) {
      throw TimeoutException('native audio QA timeout');
    }
    await Future<void>.delayed(const Duration(milliseconds: 50));
  }
}

class _LifecycleTrace with WidgetsBindingObserver {
  final states = <AppLifecycleState>[];

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    states.add(state);
    debugPrint('DDIRORI_LIFECYCLE ${state.name}');
  }
}
