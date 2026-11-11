import 'dart:io';
import 'dart:math';
import 'dart:typed_data';

import 'package:classical_local_library/just_audio_playback.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/playback_position.dart';
import 'package:classical_local_library/sqlite_database.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:just_audio/just_audio.dart';
import 'package:path_provider/path_provider.dart';

/// Run serially on the parent's dedicated iOS simulator. Uses synthetic audio,
/// real just_audio and real SQLite; no host double or personal library files.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'native queue edits and SQLite reopen restore duplicate occurrence order modes and position without autoplay',
    (tester) async {
      expect(Platform.isIOS, isTrue);
      final dir = await Directory(
        '${(await getTemporaryDirectory()).path}/queue-edit-${DateTime.now().microsecondsSinceEpoch}',
      ).create();
      addTearDown(() => dir.delete(recursive: true));
      final q = await _syntheticQueue(dir);
      final dbPath = '${dir.path}/queue.sqlite';
      var db = await ClassicalLocalDatabase(path: dbPath).open();
      addTearDown(() => db.close());
      var engine = AudioPlayer(handleInterruptions: false);
      var p = SerializedLocalPlaybackController(
        JustAudioLocalPlaybackController(
          player: engine,
          random: Random(7),
          positionCoordinator: PlaybackPositionCoordinator(
            store: SqlitePlaybackPositionStore(db),
          ),
        ),
      );
      addTearDown(() => p.dispose());

      // Empty/ready additions prepare the real engine but never start it.
      await p.enqueue([q[0], q[0]]);
      expect(p.playbackState.playerState, LocalPlayerState.ready);
      expect(engine.processingState, ProcessingState.ready);
      expect(engine.playing, isFalse);
      await p.enqueue(q.skip(1).take(4).toList());
      expect(engine.playing, isFalse);
      await p.play();
      await _until(
        tester,
        () => engine.playing && engine.position.inMilliseconds > 100,
      );
      await p.pause();
      await p.next();
      await _until(
        tester,
        () => (p.playbackState.duration?.inSeconds ?? 0) > 5,
      );
      await p.seek(const Duration(seconds: 2));
      final selectedSource = engine.sequence[engine.currentIndex!];
      final selectedTag = selectedSource.tag;
      await p.setShuffleEnabled(true);
      await p.setRepeatMode(LocalRepeatMode.all);
      await p.enqueue([q[5]], next: true);
      expect(
        p.playbackState.queue[p.playbackState.currentIndex + 1],
        same(q[5]),
      );
      await p.enqueue([q[6]]);
      await p.moveQueueItem(p.playbackState.queue.length - 1, 3);
      await p.removeQueueItem(4);
      expect(engine.sequence[engine.currentIndex!], same(selectedSource));
      expect(engine.sequence[engine.currentIndex!].tag, selectedTag);
      expect(p.playbackState.originalIndex, 1); // The second identical file.
      expect(engine.position.inMilliseconds, closeTo(2000, 150));
      expect(engine.playing, isFalse);
      expect(engine.effectiveIndices, p.playbackState.queueOrder);
      final saved = p.playbackState;
      final canonical = List.generate(
        saved.queue.length,
        (i) => saved.queue[saved.queueOrder.indexOf(i)],
      );
      await p.persistPosition();
      await PlaybackQueuePersistenceCoordinator(
        store: SqlitePlaybackQueueSnapshotStore(db),
      ).observe(saved);
      await p.dispose();
      await db.close();

      // This is an actual database close/reopen and a fresh native player.
      db = await ClassicalLocalDatabase(path: dbPath).open();
      final snapshot = (await SqlitePlaybackQueueSnapshotStore(db).load())!;
      expect(snapshot.trackIds.where((id) => id == q[0].trackId), hasLength(2));
      final recovered = const PlaybackQueueRecovery().recover(
        snapshot: snapshot,
        currentQueue: q,
      );
      engine = AudioPlayer(handleInterruptions: false);
      p = SerializedLocalPlaybackController(
        JustAudioLocalPlaybackController(
          player: engine,
          random: Random(999),
          positionCoordinator: PlaybackPositionCoordinator(
            store: SqlitePlaybackPositionStore(db),
          ),
        ),
      );
      await p.restoreQueue(recovered);
      expect(
        p.playbackState.queue.map((i) => i.trackId),
        saved.queue.map((i) => i.trackId),
      );
      expect(p.playbackState.queueOrder, saved.queueOrder);
      expect(p.playbackState.currentIndex, saved.currentIndex);
      expect(p.playbackState.originalIndex, 1);
      expect(p.playbackState.shuffleEnabled, isTrue);
      expect(p.playbackState.repeatMode, LocalRepeatMode.all);
      expect(p.playbackState.playerState, LocalPlayerState.ready);
      expect(engine.processingState, ProcessingState.ready);
      expect(engine.playing, isFalse);
      expect(engine.position.inMilliseconds, closeTo(2000, 150));
      expect(engine.effectiveIndices, saved.queueOrder);
      await p.setShuffleEnabled(false);
      expect(
        p.playbackState.queue.map((i) => i.trackId),
        canonical.map((i) => i.trackId),
      );
      expect(engine.position.inMilliseconds, closeTo(2000, 150));

      // A future file removed between launches is excluded and reported; the
      // second duplicate occurrence and its persisted position still restore.
      final missing = saved.queue.last;
      await File(missing.path).delete();
      final partial = const PlaybackQueueRecovery().recover(
        snapshot: snapshot,
        currentQueue: q.where((i) => i.trackId != missing.trackId).toList(),
      );
      expect(partial.isPartial, isTrue);
      expect(partial.skippedTrackIds, [missing.trackId]);
      await p.restoreQueue(partial);
      expect(engine.playing, isFalse);
      expect(p.playbackState.currentIndex, partial.currentIndex);
      expect(p.playbackState.position.inMilliseconds, closeTo(2000, 150));
      await p.clearUpcoming();
      expect(p.playbackState.queue.length, p.playbackState.currentIndex + 1);
      expect(engine.position.inMilliseconds, closeTo(2000, 150));
    },
    timeout: const Timeout(Duration(minutes: 3)),
  );

  testWidgets(
    'native completed append prepares new source ready and only explicit play advances position',
    (tester) async {
      expect(Platform.isIOS, isTrue);
      final dir = await Directory(
        '${(await getTemporaryDirectory()).path}/queue-completed-${DateTime.now().microsecondsSinceEpoch}',
      ).create();
      addTearDown(() => dir.delete(recursive: true));
      final q = await _syntheticQueue(dir);
      final engine = AudioPlayer(handleInterruptions: false);
      final p = SerializedLocalPlaybackController(
        JustAudioLocalPlaybackController(player: engine),
      );
      addTearDown(p.dispose);
      await p.loadQueue([q[0]]);
      final retained = engine.sequence.first;
      await _until(
        tester,
        () => (p.playbackState.duration?.inSeconds ?? 0) > 5,
      );
      await p.seek(engine.duration! - const Duration(milliseconds: 300));
      await p.play();
      await _until(
        tester,
        () => p.playbackState.playerState == LocalPlayerState.completed,
      );
      await p.enqueue([q[1], q[2]], next: true);
      expect(engine.sequence.first, same(retained));
      expect(engine.currentIndex, 1);
      expect(engine.processingState, ProcessingState.ready);
      expect(engine.playing, isFalse);
      expect(p.playbackState.playerState, LocalPlayerState.ready);
      expect(p.playbackState.currentItem, same(q[1]));
      expect(engine.position.inMilliseconds, closeTo(0, 100));
      await tester.pump(const Duration(milliseconds: 350));
      expect(engine.position.inMilliseconds, closeTo(0, 100));
      await p.play();
      await _until(tester, () => engine.position.inMilliseconds > 150);
      expect(p.playbackState.playerState, LocalPlayerState.playing);
      expect(p.playbackState.currentIndex, 1);
      await p.pause();
      // Actual next source after an in-place shuffle insertion.
      await p.setShuffleEnabled(true);
      await p.enqueue([q[3]], next: true);
      await _until(
        tester,
        () => (p.playbackState.duration?.inSeconds ?? 0) > 5,
      );
      await p.seek(engine.duration! - const Duration(milliseconds: 300));
      await p.play();
      await _until(tester, () => p.playbackState.currentItem == q[3]);
      expect(engine.sequence[engine.currentIndex!].tag, isNot(retained.tag));
      expect(engine.effectiveIndices, p.playbackState.queueOrder);
      await p.pause();
    },
    timeout: const Timeout(Duration(minutes: 2)),
  );
}

Future<void> _until(WidgetTester tester, bool Function() condition) async {
  final watch = Stopwatch()..start();
  while (watch.elapsed < const Duration(seconds: 30)) {
    await tester.pump(const Duration(milliseconds: 100));
    if (condition()) return;
  }
  fail('Native queue edit condition did not complete');
}

Future<List<LocalPlaybackQueueItem>> _syntheticQueue(Directory dir) async {
  final bytes = (await rootBundle.load('assets/audio_test/movement_1.wav'))
      .buffer
      .asUint8List();
  final header = Uint8List.fromList(bytes.sublist(0, 44)),
      samples = bytes.sublist(44);
  const repeats = 12;
  ByteData.sublistView(header)
    ..setUint32(4, 36 + samples.length * repeats, Endian.little)
    ..setUint32(40, samples.length * repeats, Endian.little);
  final data =
      (BytesBuilder()
            ..add(header)
            ..add([for (var i = 0; i < repeats; i++) ...samples]))
          .takeBytes();
  return [
    for (var i = 0; i < 7; i++)
      LocalPlaybackQueueItem(
        trackId: 'local-file:native-queue-$i',
        recordingId: 'recording',
        workId: 'work',
        displayTitle: '합성 큐 $i',
        path: (await File('${dir.path}/synthetic-$i.wav').writeAsBytes(data))
            .path,
        usesLinkedFile: true,
        workTitle: '검증 큐',
        recordingTitle: '합성 음원',
      ),
  ];
}
