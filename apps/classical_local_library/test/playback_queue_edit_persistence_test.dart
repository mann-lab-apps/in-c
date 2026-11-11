import 'dart:io';
import 'dart:math';

import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/playback_position.dart';
import 'package:classical_local_library/sqlite_database.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import 'playback_modes_test.dart' show modeQueue;

void main() {
  setUpAll(sqfliteFfiInit);

  test('edited duplicate queue permutation selection modes and position survive real SQLite reopen; missing files remap', () async {
    final dir = await Directory.systemTemp.createTemp('queue_edit_sqlite_');
    addTearDown(() => dir.delete(recursive: true));
    final path = '${dir.path}/library.sqlite';
    var db = await ClassicalLocalDatabase(
      path: path,
      factory: databaseFactoryFfi,
    ).open();
    final q = modeQueue(8);
    final p = FakeLocalPlayer(
      random: Random(7),
      positionCoordinator: PlaybackPositionCoordinator(
        store: SqlitePlaybackPositionStore(db),
      ),
    );
    await p.loadQueue([q[0], q[0], ...q.skip(1).take(5)]);
    await p.next();
    await p.setShuffleEnabled(true);
    await p.setRepeatMode(LocalRepeatMode.all);
    await p.enqueue(q.skip(6).toList(), next: true);
    await p.moveQueueItem(3, 6);
    await p.removeQueueItem(4);
    await p.seek(const Duration(seconds: 9));
    await p.persistPosition();
    final original = p.playbackState;
    final canonical = List.generate(
      original.queue.length,
      (i) => original.queue[original.queueOrder.indexOf(i)],
    );
    await PlaybackQueuePersistenceCoordinator(
      store: SqlitePlaybackQueueSnapshotStore(db),
    ).observe(original);
    await p.dispose();
    await db.close();
    db = await ClassicalLocalDatabase(
      path: path,
      factory: databaseFactoryFfi,
    ).open();
    addTearDown(db.close);
    final snapshot = (await SqlitePlaybackQueueSnapshotStore(db).load())!;
    expect(snapshot.trackIds.where((id) => id == q[0].trackId), hasLength(2));
    final recovered = const PlaybackQueueRecovery().recover(
      snapshot: snapshot,
      currentQueue: q,
    );
    final restored = FakeLocalPlayer(
      positionCoordinator: PlaybackPositionCoordinator(
        store: SqlitePlaybackPositionStore(db),
      ),
    );
    addTearDown(restored.dispose);
    await restored.restoreQueue(recovered);
    expect(
      restored.playbackState.queue.map((i) => i.trackId),
      original.queue.map((i) => i.trackId),
    );
    expect(restored.playbackState.queueOrder, original.queueOrder);
    expect(restored.playbackState.currentIndex, original.currentIndex);
    expect(
      restored.playbackState.originalIndex,
      1,
    ); // Second identical occurrence.
    expect(restored.playbackState.position.inSeconds, 9);
    expect(restored.playbackState.repeatMode, LocalRepeatMode.all);
    expect(restored.playbackState.shuffleEnabled, isTrue);
    expect(restored.state, LocalPlayerState.ready);
    await restored.setShuffleEnabled(false);
    expect(restored.queue, canonical);
    final missing = original.queue.last;
    final partial = const PlaybackQueueRecovery().recover(
      snapshot: snapshot,
      currentQueue: q.where((i) => i.trackId != missing.trackId).toList(),
    );
    expect(partial.isPartial, isTrue);
    expect(partial.skippedTrackIds, [missing.trackId]);
    expect(partial.queue, isNot(contains(missing)));
    expect(
      partial.queueOrder.toSet(),
      Set.of(List.generate(partial.queue.length, (i) => i)),
    );
    await restored.restoreQueue(partial);
    expect(restored.state, LocalPlayerState.ready);
    expect(restored.currentIndex, partial.currentIndex);
  });

  test('in-flight and unsafe error observations cannot overwrite last confirmed snapshot', () async {
    final store = MemoryPlaybackQueueSnapshotStore();
    final writer = PlaybackQueuePersistenceCoordinator(store: store);
    final p = FakeLocalPlayer();
    addTearDown(p.dispose);
    await p.loadQueue(modeQueue(3));
    final confirmed = p.playbackState;
    await writer.observe(confirmed);
    final saved = await store.load();
    for (final next in [
      confirmed.copyWith(
        queue: modeQueue(5),
        queueOrder: [0, 1, 2, 3, 4],
        isEditingQueue: true,
      ),
      confirmed.copyWith(
        queue: modeQueue(4),
        queueOrder: [0, 1, 2, 3],
        playerState: LocalPlayerState.error,
        failure: const LocalPlaybackFailure(
          kind: LocalPlaybackFailureKind.loadFailed,
          userMessage: '다시 선택',
        ),
      ),
    ]) {
      await writer.observe(next);
      expect(await store.load(), same(saved));
    }
    await p.enqueue([modeQueue(4).last]);
    await writer.observe(p.playbackState);
    expect((await store.load())!.trackIds, hasLength(4));
  });
}
