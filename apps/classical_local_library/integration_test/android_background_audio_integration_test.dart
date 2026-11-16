import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:classical_local_library/android_system_media.dart';
import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/just_audio_playback.dart';
import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/main.dart';
import 'package:classical_local_library/metadata_candidates.dart';
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
  testWidgets(
    'Android real foreground playback and OS media commands share one engine',
    (tester) async {
      expect(Platform.isAndroid, isTrue);
      final dir = await (await getTemporaryDirectory()).createTemp(
        'android-play-qa-',
      );
      final bytes = (await rootBundle.load('assets/audio_test/movement_1.wav'))
          .buffer
          .asUint8List();
      final header = Uint8List.fromList(bytes.sublist(0, 44)),
          samples = bytes.sublist(44);
      const repeat = 30;
      ByteData.sublistView(header)
        ..setUint32(4, 36 + samples.length * repeat, Endian.little)
        ..setUint32(40, samples.length * repeat, Endian.little);
      final file = File('${dir.path}/synthetic.wav');
      await file.writeAsBytes(
        (BytesBuilder()
              ..add(header)
              ..add([for (var i = 0; i < repeat; i++) ...samples]))
            .takeBytes(),
      );
      final positions = MemoryPlaybackPositionStore();
      final player = SerializedLocalPlaybackController(
        JustAudioLocalPlaybackController(
          positionCoordinator: PlaybackPositionCoordinator(store: positions),
        ),
      );
      final lifecycle = _Lifecycle();
      WidgetsBinding.instance.addObserver(lifecycle);
      addTearDown(() async {
        WidgetsBinding.instance.removeObserver(lifecycle);
        await tester.pumpWidget(const SizedBox.shrink());
        await player.dispose();
        await dir.delete(recursive: true);
      });
      await tester.pumpWidget(
        ClassicalLocalLibraryApp(
          initialLibrary: emptyClassicalLibrary,
          enableDemoFeatures: false,
          playbackController: player,
          systemMediaSession: AndroidSystemMediaSession(),
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
        for (var i = 0; i < 3; i++)
          LocalPlaybackQueueItem(
            trackId: 'android-$i',
            workId: 'work',
            recordingId: 'recording',
            displayTitle: '합성 음원 $i',
            path: file.path,
            usesLinkedFile: true,
            workTitle: '',
            recordingTitle: '',
            album: '자체 제작 QA',
          ),
      ]);
      await player.play();
      await _wait(() => player.playbackState.position.inMilliseconds > 300);
      final start = player.playbackState.position;
      debugPrint('DDIRORI_ANDROID_READY');
      await _wait(() => lifecycle.states.contains(AppLifecycleState.paused));
      await _wait(() => lifecycle.states.last == AppLifecycleState.resumed);
      expect(player.playbackState.playerState, LocalPlayerState.playing);
      expect(
        player.playbackState.position,
        greaterThan(start + const Duration(seconds: 3)),
      );
      expect(await positions.load(file.path), isNotNull);
      debugPrint('DDIRORI_ANDROID_PAUSE');
      await _wait(
        () => player.playbackState.playerState == LocalPlayerState.paused,
      );
      final paused = player.playbackState.position;
      debugPrint('DDIRORI_ANDROID_NEXT');
      await _wait(() => player.playbackState.currentIndex == 1);
      expect(player.playbackState.playerState, LocalPlayerState.paused);
      expect(player.playbackState.queue, hasLength(3));
      debugPrint('DDIRORI_ANDROID_PLAY');
      await _wait(
        () => player.playbackState.playerState == LocalPlayerState.playing,
      );
      await _wait(() => player.playbackState.position.inMilliseconds > 300);
      debugPrint('DDIRORI_ANDROID_STOP');
      await _wait(
        () => player.playbackState.playerState == LocalPlayerState.stopped,
      );
      debugPrint(
        'DDIRORI_ANDROID_RESULT ${jsonEncode({'lifecycle': lifecycle.states.map((s) => s.name).toList(), 'pausedPositionMillis': paused.inMilliseconds, 'queueCount': player.playbackState.queue.length, 'stopped': true, 'physicalAudibilityVerified': false})}',
      );
      expect(tester.takeException(), isNull);
    },
    timeout: const Timeout(Duration(minutes: 4)),
  );
}

class _Lifecycle extends WidgetsBindingObserver {
  final states = <AppLifecycleState>[];
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) => states.add(state);
}

Future<void> _wait(bool Function() ready) async {
  final watch = Stopwatch()..start();
  while (!ready()) {
    if (watch.elapsed > const Duration(seconds: 35)) {
      fail('Android native workflow timed out');
    }
    await Future<void>.delayed(const Duration(milliseconds: 60));
  }
}
