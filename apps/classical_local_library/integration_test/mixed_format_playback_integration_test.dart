import 'dart:io';

import 'package:classical_local_library/just_audio_playback.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/playback_position.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:path_provider/path_provider.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'native mixed WAV AAC ALAC FLAC pauses seeks restores without autoplay and recovers corrupt content',
    (tester) async {
      final dir = await (await getTemporaryDirectory()).createTemp(
        'mixed-format-',
      );
      final positions = MemoryPlaybackPositionStore();
      var player = JustAudioLocalPlaybackController(
        positionCoordinator: PlaybackPositionCoordinator(store: positions),
      );
      addTearDown(() async {
        await player.dispose();
        await dir.delete(recursive: true);
      });
      final queue = <LocalPlaybackQueueItem>[];
      for (final name in [
        'movement_1.wav',
        'movement_1_aac.m4a',
        'movement_1_alac.m4a',
        'movement_1.flac',
      ]) {
        final path = '${dir.path}/$name';
        await File(path).writeAsBytes(
          (await rootBundle.load('assets/audio_test/$name')).buffer
              .asUint8List(),
        );
        queue.add(
          LocalPlaybackQueueItem(
            trackId: name,
            recordingId: 'fixture',
            workId: 'fixture',
            displayTitle: name,
            path: path,
            usesLinkedFile: true,
            workTitle: '',
            recordingTitle: '',
          ),
        );
      }
      await player.loadQueue(queue);
      for (var i = 0; i < queue.length; i++) {
        expect(player.playbackState.currentIndex, i);
        await _until(() => player.playbackState.duration != null);
        expect(
          player.playbackState.duration!.inMilliseconds,
          inInclusiveRange(2200, 2600),
        );
        await player.play();
        await _until(() => player.playbackState.position.inMilliseconds >= 150);
        await player.pause();
        final paused = player.playbackState.position;
        await Future<void>.delayed(const Duration(milliseconds: 120));
        expect(
          player.playbackState.position.inMilliseconds,
          closeTo(paused.inMilliseconds, 100),
        );
        await player.seek(const Duration(milliseconds: 700));
        expect(player.playbackState.position.inMilliseconds, closeTo(700, 180));
        if (i + 1 < queue.length) {
          await player.next();
          expect(player.playbackState.playerState, LocalPlayerState.paused);
        }
      }
      await player.persistPosition();
      final before = player.playbackState;
      // Existing production policy treats <=10 seconds remaining as complete.
      // These 2.4-second fixtures therefore restore at zero, without autoplay.
      expect((await positions.load(queue.last.path))!.isCompleted, isTrue);
      final snapshots = MemoryPlaybackQueueSnapshotStore();
      await PlaybackQueuePersistenceCoordinator(store: snapshots)
          .observe(before);
      final saved = await snapshots.load();
      await player.dispose();
      player = JustAudioLocalPlaybackController(
        positionCoordinator: PlaybackPositionCoordinator(store: positions),
      );
      await player.restoreQueue(
        const PlaybackQueueRecovery().recover(
          snapshot: saved,
          currentQueue: queue,
        ),
      );
      expect(player.playbackState.currentIndex, 3);
      expect(player.playbackState.playerState, LocalPlayerState.ready);
      expect(player.playbackState.position, Duration.zero);
      await player.play();
      await _until(
        () => player.playbackState.playerState == LocalPlayerState.completed,
      );
      expect(player.playbackState.currentIndex, queue.length);
      // A .mp3 suffix is deliberately not proof of MP3 support.
      final bad = File('${dir.path}/invalid.mp3');
      await bad.writeAsBytes([0, 1, 2, 3, 4]);
      await player.loadQueue([
        LocalPlaybackQueueItem(
          trackId: 'invalid',
          recordingId: 'fixture',
          workId: 'fixture',
          displayTitle: 'invalid data',
          path: bad.path,
          usesLinkedFile: true,
          workTitle: '',
          recordingTitle: '',
        ),
      ]);
      expect(player.playbackState.failure, isNotNull);
      expect(player.playbackState.playerState, LocalPlayerState.error);
      await player.stop();
      await player.loadQueue(queue);
      await player.play();
      await _until(() => player.playbackState.position.inMilliseconds >= 100);
      expect(player.playbackState.failure, isNull);
      await player.stop();
    },
  );
}

Future<void> _until(bool Function() condition) async {
  final deadline = DateTime.now().add(const Duration(seconds: 15));
  while (!condition()) {
    if (DateTime.now().isAfter(deadline)) {
      fail('native transport state timed out');
    }
    await Future<void>.delayed(const Duration(milliseconds: 30));
  }
}
