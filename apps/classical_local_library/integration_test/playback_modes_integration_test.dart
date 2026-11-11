import 'dart:io';
import 'dart:math';
import 'dart:typed_data';

import 'package:classical_local_library/just_audio_playback.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/playback_position.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:just_audio/just_audio.dart';
import 'package:path_provider/path_provider.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'native shuffle loop boundaries and restoration preserve engine occurrence and position',
    (tester) async {
      expect(Platform.isIOS, isTrue);
      final dir = await Directory(
        '${(await getTemporaryDirectory()).path}/playback-modes-fixture',
      ).create(recursive: true);
      addTearDown(() async {
        if (await dir.exists()) await dir.delete(recursive: true);
      });
      final bytes = (await rootBundle.load('assets/audio_test/movement_1.wav'))
          .buffer
          .asUint8List();
      final header = Uint8List.fromList(bytes.sublist(0, 44)),
          samples = bytes.sublist(44);
      const repeats = 12;
      ByteData.sublistView(header)
        ..setUint32(4, 36 + samples.length * repeats, Endian.little)
        ..setUint32(40, samples.length * repeats, Endian.little);
      final queue = <LocalPlaybackQueueItem>[];
      for (var i = 0; i < 5; i++) {
        final file = File('${dir.path}/synthetic-$i.wav');
        await file.writeAsBytes(
          (BytesBuilder()
                ..add(header)
                ..add([for (var j = 0; j < repeats; j++) ...samples]))
              .takeBytes(),
        );
        queue.add(
          LocalPlaybackQueueItem(
            trackId: 'native-mode-$i',
            recordingId: 'recording',
            workId: 'work',
            displayTitle: '합성 음원 $i',
            path: file.path,
            usesLinkedFile: true,
            workTitle: '검증 큐',
            recordingTitle: '합성 음원',
          ),
        );
      }
      final engine = AudioPlayer(handleInterruptions: false);
      final positions = PlaybackPositionCoordinator(
        store: MemoryPlaybackPositionStore(),
      );
      final delegate = JustAudioLocalPlaybackController(
        player: engine,
        positionCoordinator: positions,
        random: Random(7),
      );
      final p = SerializedLocalPlaybackController(delegate);
      addTearDown(p.dispose);
      var restart = false;
      final appTrace = p.states.listen((s) {
        if (restart) {
          debugPrint(
            'MODE_RESTART app=${s.playerState.name}/${s.processingState.name} index=${s.currentIndex} pos=${s.position.inMilliseconds} error=${s.failure?.kind}',
          );
        }
      });
      final engineTrace = engine.playerStateStream.listen((s) {
        if (restart) {
          debugPrint(
            'MODE_RESTART native=${s.playing}/${s.processingState.name} index=${engine.currentIndex} pos=${engine.position.inMilliseconds}',
          );
        }
      });
      addTearDown(appTrace.cancel);
      addTearDown(engineTrace.cancel);
      await p.loadQueue(queue);
      await p.play();
      await until(
        tester,
        () => p.playbackState.playerState == LocalPlayerState.playing,
      );
      await p.pause();
      await p.next();
      await p.seek(const Duration(milliseconds: 500));
      final current = p.playbackState.currentItem;
      await p.setShuffleEnabled(true);
      expect(engine.effectiveIndices, p.playbackState.queueOrder);
      expect(p.playbackState.currentItem, same(current));
      expect(engine.position.inMilliseconds, closeTo(500, 100));
      expect(engine.playing, isFalse);
      await p.next();
      expect(engine.currentIndex, p.playbackState.originalIndex);
      final shuffledItem = p.playbackState.currentItem;
      await p.seek(const Duration(milliseconds: 700));
      await p.setShuffleEnabled(false);
      expect(p.playbackState.currentItem, same(shuffledItem));
      expect(engine.position.inMilliseconds, closeTo(700, 100));
      expect(p.playbackState.queue, queue);
      expect(engine.playing, isFalse);

      await p.setRepeatMode(LocalRepeatMode.one);
      final original = p.playbackState.originalIndex;
      for (var i = 0; i < 2; i++) {
        await p.seek(engine.duration! - const Duration(milliseconds: 300));
        final count = p.playbackState.automaticTransitions;
        await p.play();
        await until(tester, () => p.playbackState.automaticTransitions > count);
        expect(p.playbackState.originalIndex, original);
        expect(p.playbackState.playerState, LocalPlayerState.playing);
        await p.pause();
      }
      await p.next();
      expect(p.playbackState.originalIndex, (original! + 1) % queue.length);
      await p.setRepeatMode(LocalRepeatMode.all);
      while (p.playbackState.currentIndex < queue.length - 1) {
        await p.next();
      }
      await p.seek(engine.duration! - const Duration(milliseconds: 300));
      await p.play();
      await until(tester, () => p.playbackState.currentIndex == 0);
      expect(p.playbackState.playerState, LocalPlayerState.playing);
      await p.pause();
      await p.setRepeatMode(LocalRepeatMode.off);
      while (p.playbackState.currentIndex < queue.length - 1) {
        await p.next();
      }
      await p.seek(engine.duration! - const Duration(milliseconds: 300));
      await p.play();
      await until(
        tester,
        () => p.playbackState.playerState == LocalPlayerState.completed,
      );
      expect(p.playbackState.currentIndex, queue.length);
      restart = true;
      await p.setRepeatMode(LocalRepeatMode.one);
      expect(p.playbackState.currentIndex, queue.length);
      expect(engine.playing, isFalse);
      await p.play();
      await until(
        tester,
        () => p.playbackState.playerState == LocalPlayerState.playing,
      );
      expect(p.playbackState.currentIndex, 0);

      await p.pause();
      await p.setShuffleEnabled(true);
      await p.next();
      await until(
        tester,
        () =>
            (engine.duration?.inSeconds ?? 0) > 12 &&
            (p.playbackState.duration?.inSeconds ?? 0) > 12,
      );
      await p.seek(const Duration(seconds: 2));
      await p.persistPosition();
      final state = p.playbackState, store = MemoryPlaybackQueueSnapshotStore();
      await PlaybackQueuePersistenceCoordinator(store: store).observe(state);
      final recovered = const PlaybackQueueRecovery().recover(
        snapshot: await store.load(),
        currentQueue: queue,
      );
      await p.restoreQueue(recovered);
      expect(
        p.playbackState.queue.map((i) => i.trackId),
        state.queue.map((i) => i.trackId),
      );
      expect(p.playbackState.queueOrder, state.queueOrder);
      expect(p.playbackState.originalIndex, state.originalIndex);
      expect(p.playbackState.position.inMilliseconds, closeTo(2000, 150));
      expect(engine.playing, isFalse);
      expect(engine.effectiveIndices, p.playbackState.queueOrder);
    },
    timeout: const Timeout(Duration(minutes: 3)),
  );
}

Future<void> until(WidgetTester tester, bool Function() condition) async {
  final watch = Stopwatch()..start();
  while (watch.elapsed < const Duration(seconds: 30)) {
    await tester.pump(const Duration(milliseconds: 100));
    if (condition()) return;
  }
  fail('Native playback mode condition did not complete');
}
