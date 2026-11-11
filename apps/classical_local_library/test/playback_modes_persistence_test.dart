import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/playback_position.dart';
import 'package:classical_local_library/sqlite_database.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import 'playback_modes_test.dart' show modeQueue;

void main() {
  late Directory temp;
  setUpAll(sqfliteFfiInit);
  setUp(
    () async => temp = await Directory.systemTemp.createTemp('play_modes_'),
  );
  tearDown(() async => temp.delete(recursive: true));

  test(
    'real v16 queue table upgrades additively once and preserves legacy IDs',
    () async {
      final path = '${temp.path}/legacy.sqlite';
      var db = await databaseFactoryFfi.openDatabase(path);
      await db.execute(
        'CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY, applied_at_millis INTEGER NOT NULL)',
      );
      await db.insert('schema_migrations', {
        'version': 16,
        'applied_at_millis': 1,
      });
      await db.execute(
        'CREATE TABLE playback_queue_state(id INTEGER PRIMARY KEY, track_ids_json TEXT NOT NULL, current_track_id TEXT, saved_at_millis INTEGER NOT NULL)',
      );
      await db.insert('playback_queue_state', {
        'id': 1,
        'track_ids_json': '["a","b"]',
        'current_track_id': 'b',
        'saved_at_millis': 1,
      });
      await db.close();
      db = await ClassicalLocalDatabase(
        path: path,
        factory: databaseFactoryFfi,
      ).open();
      addTearDown(db.close);
      await const SqliteMigrationRunner().applySchema(db);
      expect(
        (await db.query(
          'schema_migrations',
          orderBy: 'version',
        )).map((r) => r['version']),
        [16, 18],
      );
      final row = (await db.query('playback_queue_state')).single;
      expect(row['track_ids_json'], '["a","b"]');
      expect(row['playback_options_json'], isNull);
      final old = await SqlitePlaybackQueueSnapshotStore(db).load();
      expect(old!.trackIds, ['a', 'b']);
      expect(old.repeatMode, LocalRepeatMode.off);
      expect(old.shuffleEnabled, isFalse);
    },
  );

  test('shuffle order current occurrence modes and position survive a database reopen without autoplay', () async {
    final path = '${temp.path}/modes.sqlite';
    var db = await ClassicalLocalDatabase(
      path: path,
      factory: databaseFactoryFfi,
    ).open();
    final positions = PlaybackPositionCoordinator(
      store: SqlitePlaybackPositionStore(db),
    );
    final p = FakeLocalPlayer(
      random: Random(7),
      positionCoordinator: positions,
    );
    await p.loadQueue(modeQueue());
    await p.play();
    await p.setShuffleEnabled(true);
    await p.setRepeatMode(LocalRepeatMode.all);
    await p.next();
    await p.seek(const Duration(seconds: 9));
    await p.pause();
    await p.persistPosition();
    final original = p.playbackState;
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
    final snapshot = await SqlitePlaybackQueueSnapshotStore(db).load();
    final recovered = const PlaybackQueueRecovery().recover(
      snapshot: snapshot,
      currentQueue: modeQueue(),
    );
    final restored = FakeLocalPlayer(
      random: Random(999),
      positionCoordinator: PlaybackPositionCoordinator(
        store: SqlitePlaybackPositionStore(db),
      ),
    );
    addTearDown(restored.dispose);
    await restored.restoreQueue(recovered);
    expect(
      restored.queue.map((i) => i.trackId),
      original.queue.map((i) => i.trackId),
    );
    expect(restored.playbackState.queueOrder, original.queueOrder);
    expect(restored.playbackState.originalIndex, original.originalIndex);
    expect(restored.playbackState.position.inSeconds, 9);
    expect(restored.playbackState.shuffleEnabled, isTrue);
    expect(restored.playbackState.repeatMode, LocalRepeatMode.all);
    expect(restored.state, LocalPlayerState.ready);
    await restored.setShuffleEnabled(false);
    expect(
      restored.queue.map((i) => i.trackId),
      modeQueue().map((i) => i.trackId),
    );
  });

  test('missing items remap occurrences while retaining saved effective and original orders', () {
    final files = modeQueue(4);
    final result = const PlaybackQueueRecovery().recover(
      snapshot: PlaybackQueueSnapshot(
        trackIds: [
          files[0].trackId,
          files[3].trackId,
          files[2].trackId,
          files[1].trackId,
        ],
        currentTrackId: files[3].trackId,
        savedAtMillis: 1,
        queueOrder: [0, 3, 2, 1],
        currentIndex: 1,
        shuffleEnabled: true,
        repeatMode: LocalRepeatMode.all,
      ),
      currentQueue: files.take(3).toList(),
    );
    expect(result.queue.map((i) => i.trackId), [
      files[0].trackId,
      files[2].trackId,
      files[1].trackId,
    ]);
    expect(result.queueOrder, [0, 2, 1]);
    expect(result.currentIndex, 1);
    expect(result.isPartial, isTrue);
    expect(result.repeatMode, LocalRepeatMode.all);
  });

  test('malformed options fall back to legacy recovery without discarding the stored queue', () async {
    final db = await ClassicalLocalDatabase(
      path: '${temp.path}/invalid.sqlite',
      factory: databaseFactoryFfi,
    ).open();
    addTearDown(db.close);
    final store = SqlitePlaybackQueueSnapshotStore(db);
    await store.save(
      PlaybackQueueSnapshot(
        trackIds: modeQueue(2).map((i) => i.trackId).toList(),
        currentTrackId: modeQueue(2)[1].trackId,
        savedAtMillis: 1,
      ),
    );
    final valid = {
      'version': 1,
      'order': [0, 1],
      'index': 1,
      'shuffle': true,
      'repeat': 'all',
    };
    for (final value in [
      'broken',
      jsonEncode({...valid, 'repeat': 'unknown'}),
      jsonEncode({
        ...valid,
        'order': [1, 1],
      }),
      jsonEncode({...valid, 'index': 9}),
      jsonEncode({
        ...valid,
        'shuffle': false,
        'order': [1, 0],
      }),
    ]) {
      await db.update('playback_queue_state', {'playback_options_json': value});
      final snapshot = (await store.load())!;
      expect(snapshot.optionsInvalid, isTrue);
      expect(snapshot.shuffleEnabled, isFalse);
      expect(snapshot.repeatMode, LocalRepeatMode.off);
      final recovered = const PlaybackQueueRecovery().recover(
        snapshot: snapshot,
        currentQueue: modeQueue(2),
      );
      expect(recovered.queue, hasLength(2));
      expect(recovered.queue.first.trackId, snapshot.currentTrackId);
    }
    expect(
      (await db.query('playback_queue_state')).single['track_ids_json'],
      contains('mode-0'),
    );
  });
}
