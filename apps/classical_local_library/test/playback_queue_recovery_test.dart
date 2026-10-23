import 'dart:async';
import 'dart:io';

import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/sqlite_database.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  late Directory directory;

  setUpAll(sqfliteFfiInit);
  setUp(() async {
    directory = await Directory.systemTemp.createTemp('queue_recovery_test_');
  });
  tearDown(() async {
    if (await directory.exists()) await directory.delete(recursive: true);
  });

  test('저장 큐는 현재 파일로 재구성하고 누락 항목과 현재 악장을 구분한다', () {
    const snapshot = PlaybackQueueSnapshot(
      trackIds: ['missing-track', 'track-1', 'track-2'],
      currentTrackId: 'track-1',
      savedAtMillis: 1,
    );

    final result = const PlaybackQueueRecovery().recover(
      snapshot: snapshot,
      currentQueue: [_item('track-1'), _item('track-2')],
    );

    expect(result.queue.map((item) => item.trackId), ['track-1', 'track-2']);
    expect(result.skippedTrackIds, ['missing-track']);
    expect(result.isPartial, isTrue);
  });

  test('전체 파일이 사라진 저장 큐는 복구 불가 상태를 반환한다', () {
    const snapshot = PlaybackQueueSnapshot(
      trackIds: ['missing-track'],
      currentTrackId: 'missing-track',
      savedAtMillis: 1,
    );

    final result = const PlaybackQueueRecovery().recover(
      snapshot: snapshot,
      currentQueue: const [],
    );

    expect(result.isUnavailable, isTrue);
    expect(result.skippedTrackIds, ['missing-track']);
  });

  test('SQLite 큐 snapshot은 트랙 ID만 저장하고 재시작 후 복원한다', () async {
    final path = '${directory.path}/queue.sqlite';
    var database = await ClassicalLocalDatabase(
      path: path,
      factory: databaseFactoryFfi,
    ).open();
    await SqlitePlaybackQueueSnapshotStore(database).save(
      const PlaybackQueueSnapshot(
        trackIds: ['track-1', 'track-2'],
        currentTrackId: 'track-2',
        savedAtMillis: 123,
      ),
    );
    final raw = (await database.query('playback_queue_state')).single;
    expect(raw.values.join(' '), isNot(contains('/Users/')));
    await database.close();

    database = await ClassicalLocalDatabase(
      path: path,
      factory: databaseFactoryFfi,
    ).open();
    addTearDown(database.close);
    final restored = await SqlitePlaybackQueueSnapshotStore(database).load();
    expect(restored?.trackIds, ['track-1', 'track-2']);
    expect(restored?.currentTrackId, 'track-2');
  });

  test('명령 직렬화는 연속 탭과 load 중 stop 순서를 보존한다', () async {
    final delegate = _DelayedPlaybackController();
    final controller = SerializedLocalPlaybackController(delegate);

    final load = controller.loadQueue([_item('track-1')]);
    final stop = controller.stop();
    final secondLoad = controller.loadQueue([_item('track-2')]);
    final next = controller.next();
    await Future.wait([load, stop, secondLoad, next]);

    expect(delegate.completed, [
      'load:track-1',
      'stop',
      'load:track-2',
      'next',
    ]);
    expect(delegate.maximumConcurrentOperations, 1);
    await controller.dispose();
  });

  test('큐 persistence는 위치 event를 중복 저장하지 않는다', () async {
    final store = _CountingQueueStore();
    final coordinator = PlaybackQueuePersistenceCoordinator(
      store: store,
      clock: () => DateTime.fromMillisecondsSinceEpoch(7),
    );
    final state = LocalPlaybackState(
      playerState: LocalPlayerState.playing,
      queue: [_item('track-1')],
      currentIndex: 0,
    );

    await coordinator.observe(state);
    await coordinator.observe(
      state.copyWith(position: const Duration(seconds: 1)),
    );
    await coordinator.flush();

    expect(store.saveCount, 1);
    expect(store.snapshot?.savedAtMillis, 7);
  });

  test(
    'explicit clear drains pending writes and permits the same queue again',
    () async {
      final store = _CountingQueueStore();
      final coordinator = PlaybackQueuePersistenceCoordinator(store: store);
      final state = LocalPlaybackState(
        playerState: LocalPlayerState.ready,
        queue: [_item('track-1')],
        currentIndex: 0,
      );
      final save = coordinator.observe(state);
      final clear = coordinator.clear();
      await Future.wait([save, clear]);
      expect(store.snapshot, isNull);
      await coordinator.observe(state);
      expect(store.snapshot?.trackIds, ['track-1']);
      expect(store.saveCount, 2);
    },
  );

  test('startup idle events do not erase the persisted queue', () async {
    final store = MemoryPlaybackQueueSnapshotStore();
    await store.save(
      const PlaybackQueueSnapshot(
        trackIds: ['track-1'],
        currentTrackId: 'track-1',
        savedAtMillis: 1,
      ),
    );
    final coordinator = PlaybackQueuePersistenceCoordinator(store: store);
    await coordinator.observe(const LocalPlaybackState.idle());
    expect((await coordinator.load())?.trackIds, ['track-1']);
  });

  test('failed persistence permits retry of an unchanged queue', () async {
    final store = _FailOnceQueueStore();
    final coordinator = PlaybackQueuePersistenceCoordinator(store: store);
    final state = LocalPlaybackState(
      playerState: LocalPlayerState.ready,
      queue: [_item('track-1')],
      currentIndex: 0,
    );
    await expectLater(coordinator.observe(state), throwsStateError);
    await coordinator.observe(state);
    expect(store.snapshot?.trackIds, ['track-1']);
  });
}

class _FailOnceQueueStore extends MemoryPlaybackQueueSnapshotStore {
  var failed = false;

  @override
  Future<void> save(PlaybackQueueSnapshot snapshot) async {
    if (!failed) {
      failed = true;
      throw StateError('injected');
    }
    await super.save(snapshot);
  }
}

LocalPlaybackQueueItem _item(String trackId) => LocalPlaybackQueueItem(
  trackId: trackId,
  recordingId: 'recording',
  workId: 'work',
  displayTitle: trackId,
  path: '/fixture/$trackId.flac',
  usesLinkedFile: true,
  workTitle: '작품',
  recordingTitle: '녹음',
);

class _CountingQueueStore extends MemoryPlaybackQueueSnapshotStore {
  var saveCount = 0;

  @override
  Future<void> save(PlaybackQueueSnapshot snapshot) async {
    saveCount += 1;
    await super.save(snapshot);
  }
}

class _DelayedPlaybackController implements LocalPlaybackController {
  final completed = <String>[];
  var activeOperations = 0;
  var maximumConcurrentOperations = 0;
  LocalPlaybackState _state = const LocalPlaybackState.idle();
  final StreamController<LocalPlaybackState> _states =
      StreamController<LocalPlaybackState>.broadcast();

  @override
  LocalPlaybackState get playbackState => _state;

  @override
  Stream<LocalPlaybackState> get states => _states.stream;

  Future<void> _operation(String label) async {
    activeOperations += 1;
    if (activeOperations > maximumConcurrentOperations) {
      maximumConcurrentOperations = activeOperations;
    }
    await Future<void>.delayed(const Duration(milliseconds: 5));
    completed.add(label);
    activeOperations -= 1;
  }

  @override
  Future<void> loadQueue(List<LocalPlaybackQueueItem> queue) async {
    await _operation('load:${queue.first.trackId}');
    _state = LocalPlaybackState(
      playerState: LocalPlayerState.ready,
      queue: queue,
      currentIndex: 0,
    );
  }

  @override
  Future<void> next() => _operation('next');

  @override
  Future<void> stop() => _operation('stop');

  @override
  Future<void> pause() => _operation('pause');

  @override
  Future<void> play() => _operation('play');

  @override
  Future<void> resume() => _operation('resume');

  @override
  Future<void> seek(Duration position) => _operation('seek');

  @override
  Future<void> persistPosition() => _operation('persist');

  @override
  Future<void> dispose() async => _states.close();
}
