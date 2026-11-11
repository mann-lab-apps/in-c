import 'dart:async';
import 'dart:math';

import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/playback_order.dart';
import 'package:flutter_test/flutter_test.dart';

List<LocalPlaybackQueueItem> modeQueue([int count = 8]) => [
  for (var i = 0; i < count; i++)
    LocalPlaybackQueueItem(
      trackId: 'local-file:mode-$i',
      recordingId: 'recording',
      workId: 'work',
      displayTitle: '음악 $i',
      path: '/fixture/mode-$i.wav',
      usesLinkedFile: true,
      workTitle: '앨범',
      recordingTitle: '아티스트',
    ),
];

void main() {
  test('seeded permutations preserve prefix and every occurrence at scale', () {
    for (final size in [0, 1, 2, 8, 20000]) {
      final first = PlaybackOrder.identity(size).shuffled(2, Random(7));
      final second = PlaybackOrder.identity(size).shuffled(2, Random(7));
      expect(first.indices, second.indices);
      expect(first.indices.toSet(), Set.of(List.generate(size, (i) => i)));
      expect(
        first.indices.take(min(3, size)),
        List.generate(min(3, size), (i) => i),
      );
      for (var i = 0; i < size; i++) {
        expect(first.inverse[first.indices[i]], i);
      }
    }
    expect(() => PlaybackOrder([0, 0]), throwsFormatException);
  });

  for (final mode in LocalRepeatMode.values) {
    for (final size in [1, 3]) {
      test(
        'natural completion $mode with $size items; manual next ignores repeat-one',
        () async {
          final p = FakeLocalPlayer();
          addTearDown(p.dispose);
          await p.loadQueue(modeQueue(size));
          await p.setRepeatMode(mode);
          await p.play();
          for (var i = 0; i < size; i++) {
            await p.completeCurrent();
          }
          switch (mode) {
            case LocalRepeatMode.off:
              expect(p.state, LocalPlayerState.completed);
              expect(p.currentIndex, size);
              await p.next();
              expect(p.currentIndex, size);
              await p.play();
              expect(p.currentIndex, 0);
            case LocalRepeatMode.all:
              expect(p.state, LocalPlayerState.playing);
              expect(p.currentIndex, 0);
            case LocalRepeatMode.one:
              expect(p.currentIndex, 0);
              expect(p.state, LocalPlayerState.playing);
              await p.next();
              expect(p.currentIndex, 1);
          }
        },
      );
    }
  }

  test('mode changes preserve playing/paused, current occurrence and position; stop/new queue retain modes', () async {
    final p = FakeLocalPlayer(random: Random(7));
    addTearDown(p.dispose);
    final original = modeQueue();
    await p.loadQueue(original);
    await p.play();
    await p.next();
    await p.seek(const Duration(seconds: 5));
    final item = p.currentItem;
    await p.setShuffleEnabled(true);
    await p.setRepeatMode(LocalRepeatMode.all);
    final order = p.playbackState.queueOrder;
    expect(order.take(2), [0, 1]);
    expect(order, isNot(List.generate(8, (i) => i)));
    expect(p.currentItem, same(item));
    expect(p.playbackState.position.inSeconds, 5);
    expect(p.state, LocalPlayerState.playing);
    await p.pause();
    await p.setShuffleEnabled(false);
    expect(p.queue, original);
    expect(p.currentItem, same(item));
    expect(p.state, LocalPlayerState.paused);
    expect(p.playbackState.position.inSeconds, 5);
    await p.next();
    expect(p.state, LocalPlayerState.paused);
    await p.previous();
    expect(p.currentIndex, 1);
    await p.seek(const Duration(seconds: 3));
    await p.previous();
    expect(p.currentIndex, 1);
    await p.stop();
    expect(p.playbackState.repeatMode, LocalRepeatMode.all);
    await p.setShuffleEnabled(true);
    await p.loadQueue(modeQueue(4));
    expect(p.playbackState.shuffleEnabled, isTrue);
    expect(p.playbackState.repeatMode, LocalRepeatMode.all);
    expect(p.currentItem!.trackId, 'local-file:mode-0');
    expect(p.state, LocalPlayerState.ready);
  });

  test(
    'repeat all has stable shuffled cycles and paused first/last boundaries',
    () async {
      final p = FakeLocalPlayer(random: Random(4));
      addTearDown(p.dispose);
      await p.loadQueue(modeQueue(5));
      await p.setShuffleEnabled(true);
      await p.setRepeatMode(LocalRepeatMode.all);
      final order = p.queue.toList();
      await p.play();
      for (var i = 0; i < 12; i++) {
        expect(p.currentItem, order[i % 5]);
        await p.completeCurrent();
        expect(p.queue, order);
      }
      await p.pause();
      await p.stop();
      await p.play();
      await p.pause();
      await p.previous();
      expect(p.currentIndex, 4);
      expect(p.state, LocalPlayerState.paused);
      await p.next();
      expect(p.currentIndex, 0);
      expect(p.state, LocalPlayerState.paused);
    },
  );

  test('duplicate track objects keep distinct occurrence indexes through shuffle and recovery', () async {
    final p = FakeLocalPlayer(random: Random(7));
    addTearDown(p.dispose);
    final items = modeQueue(5), duplicated = modeQueue(1).single;
    await p.loadQueue([duplicated, duplicated, ...items.skip(1)]);
    await p.play();
    await p.next();
    expect(p.playbackState.originalIndex, 1);
    await p.setShuffleEnabled(true);
    expect(p.playbackState.originalIndex, 1);
    final store = MemoryPlaybackQueueSnapshotStore();
    final writer = PlaybackQueuePersistenceCoordinator(store: store);
    await writer.observe(p.playbackState);
    await writer.flush();
    final snapshot = await store.load();
    final recovered = const PlaybackQueueRecovery().recover(
      snapshot: snapshot,
      currentQueue: [duplicated, ...items.skip(1)],
    );
    final restored = FakeLocalPlayer(random: Random(99));
    addTearDown(restored.dispose);
    await restored.restoreQueue(recovered);
    expect(restored.playbackState.queueOrder, p.playbackState.queueOrder);
    expect(restored.playbackState.originalIndex, 1);
    expect(restored.currentIndex, p.currentIndex);
    expect(restored.state, LocalPlayerState.ready);
    await restored.setShuffleEnabled(false);
    expect(restored.queue.take(2), [duplicated, duplicated]);
  });

  test('serialized pending next/seek/mode cannot target a new queue or automatic transition', () async {
    final p = _GatedPlayer();
    final controller = SerializedLocalPlaybackController(p);
    addTearDown(controller.dispose);
    await controller.loadQueue(modeQueue(4));
    await controller.play();
    final pause = controller.pause();
    await Future<void>.delayed(Duration.zero);
    final next = controller.next(),
        seek = controller.seek(const Duration(seconds: 12));
    await p.completeCurrent();
    p.gate.complete();
    await Future.wait([pause, next, seek]);
    expect(p.currentIndex, 1);
    expect(p.playbackState.position, Duration.zero);
    final shuffle = controller.setShuffleEnabled(true);
    final replace = controller.loadQueue(modeQueue(2));
    await Future.wait([shuffle, replace]);
    expect(p.playbackState.shuffleEnabled, isFalse);
  });

  test(
    'diagnostic boundary rejects mode changes and never resumes playback',
    () async {
      final p = FakeLocalPlayer();
      final controller = SerializedLocalPlaybackController(p);
      addTearDown(controller.dispose);
      await controller.loadQueue(modeQueue());
      await controller.play();
      await controller.seek(const Duration(seconds: 5));
      await controller.runDiagnostic(() async {
        await controller.setShuffleEnabled(true);
        await controller.setRepeatMode(LocalRepeatMode.all);
      });
      expect(p.state, LocalPlayerState.paused);
      expect(p.playbackState.position.inSeconds, 5);
      expect(p.playbackState.shuffleEnabled, isFalse);
      expect(p.playbackState.repeatMode, LocalRepeatMode.off);
    },
  );
}

class _GatedPlayer extends FakeLocalPlayer {
  final gate = Completer<void>();
  @override
  Future<void> pause() => gate.future;
}
