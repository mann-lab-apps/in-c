import 'package:classical_local_library/playback_position.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'resume policy clamps positions and skips completed or changed files',
    () {
      const policy = PlaybackPositionPolicy();
      const duration = Duration(minutes: 2);

      expect(
        policy.resumePosition(
          record: _record(positionMillis: 30000),
          currentDuration: duration,
          currentFileModifiedAtMillis: 10,
        ),
        const Duration(seconds: 30),
      );
      expect(
        policy.resumePosition(
          record: _record(positionMillis: 130000),
          currentDuration: duration,
          currentFileModifiedAtMillis: 10,
        ),
        Duration.zero,
      );
      expect(
        policy.resumePosition(
          record: _record(positionMillis: 30000, isCompleted: true),
          currentDuration: duration,
          currentFileModifiedAtMillis: 10,
        ),
        Duration.zero,
      );
      expect(
        policy.resumePosition(
          record: _record(positionMillis: 30000),
          currentDuration: duration,
          currentFileModifiedAtMillis: 11,
        ),
        Duration.zero,
      );
    },
  );

  test(
    'coordinator throttles progress writes and force flushes boundaries',
    () async {
      final store = _CountingPlaybackPositionStore();
      var now = DateTime.utc(2026, 10, 19);
      final coordinator = PlaybackPositionCoordinator(
        store: store,
        clock: () => now,
      );

      await coordinator.record(
        path: '/music/1.flac',
        position: const Duration(seconds: 1),
        duration: const Duration(minutes: 2),
        fileModifiedAtMillis: 10,
      );
      now = now.add(const Duration(seconds: 5));
      await coordinator.record(
        path: '/music/1.flac',
        position: const Duration(seconds: 6),
        duration: const Duration(minutes: 2),
        fileModifiedAtMillis: 10,
      );
      expect(store.saved, hasLength(1));

      now = now.add(const Duration(seconds: 10));
      await coordinator.record(
        path: '/music/1.flac',
        position: const Duration(seconds: 16),
        duration: const Duration(minutes: 2),
        fileModifiedAtMillis: 10,
      );
      await coordinator.record(
        path: '/music/1.flac',
        position: const Duration(seconds: 20),
        duration: const Duration(minutes: 2),
        fileModifiedAtMillis: 10,
        force: true,
      );

      expect(store.saved, hasLength(3));
      expect(store.saved.last.position, const Duration(seconds: 20));
    },
  );

  test('coordinator restores a valid saved position', () async {
    final store = MemoryPlaybackPositionStore();
    await store.save(_record(positionMillis: 42000));
    final coordinator = PlaybackPositionCoordinator(store: store);

    final position = await coordinator.restore(
      path: '/music/1.flac',
      duration: const Duration(minutes: 2),
      fileModifiedAtMillis: 10,
    );

    expect(position, const Duration(seconds: 42));
  });
}

PlaybackPositionRecord _record({
  required int positionMillis,
  bool isCompleted = false,
}) {
  return PlaybackPositionRecord(
    path: '/music/1.flac',
    positionMillis: positionMillis,
    durationMillis: 120000,
    updatedAtMillis: 1,
    isCompleted: isCompleted,
    fileModifiedAtMillis: 10,
  );
}

class _CountingPlaybackPositionStore implements PlaybackPositionStore {
  final List<PlaybackPositionRecord> saved = [];

  @override
  Future<PlaybackPositionRecord?> load(String path) async => null;

  @override
  Future<void> save(PlaybackPositionRecord position) async {
    saved.add(position);
  }
}
