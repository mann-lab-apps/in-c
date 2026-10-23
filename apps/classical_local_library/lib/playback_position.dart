typedef PlaybackClock = DateTime Function();

class PlaybackPositionRecord {
  const PlaybackPositionRecord({
    required this.path,
    required this.positionMillis,
    required this.durationMillis,
    required this.updatedAtMillis,
    required this.isCompleted,
    this.fileModifiedAtMillis,
  });

  final String path;
  final int positionMillis;
  final int? durationMillis;
  final int updatedAtMillis;
  final bool isCompleted;
  final int? fileModifiedAtMillis;

  Duration get position => Duration(milliseconds: positionMillis);

  Duration? get duration =>
      durationMillis == null ? null : Duration(milliseconds: durationMillis!);
}

abstract class PlaybackPositionStore {
  Future<PlaybackPositionRecord?> load(String path);

  Future<void> save(PlaybackPositionRecord position);
}

class MemoryPlaybackPositionStore implements PlaybackPositionStore {
  final Map<String, PlaybackPositionRecord> _positions = {};

  @override
  Future<PlaybackPositionRecord?> load(String path) async => _positions[path];

  @override
  Future<void> save(PlaybackPositionRecord position) async {
    _positions[position.path] = position;
  }
}

class DeferredPlaybackPositionStore implements PlaybackPositionStore {
  DeferredPlaybackPositionStore(this._loadStore);

  final Future<PlaybackPositionStore> Function() _loadStore;
  Future<PlaybackPositionStore>? _store;

  Future<PlaybackPositionStore> get _resolvedStore => _store ??= _loadStore();

  @override
  Future<PlaybackPositionRecord?> load(String path) async {
    return (await _resolvedStore).load(path);
  }

  @override
  Future<void> save(PlaybackPositionRecord position) async {
    await (await _resolvedStore).save(position);
  }
}

class PlaybackPositionPolicy {
  const PlaybackPositionPolicy({
    this.completionThreshold = const Duration(seconds: 10),
  });

  final Duration completionThreshold;

  Duration normalizePosition(Duration position, Duration? duration) {
    if (position.isNegative) {
      return Duration.zero;
    }
    if (duration != null && position > duration) {
      return duration;
    }
    return position;
  }

  bool isCompleted(Duration position, Duration? duration) {
    if (duration == null || duration <= Duration.zero) {
      return false;
    }
    final normalized = normalizePosition(position, duration);
    return duration - normalized <= completionThreshold;
  }

  Duration resumePosition({
    required PlaybackPositionRecord record,
    required Duration? currentDuration,
    required int? currentFileModifiedAtMillis,
  }) {
    if (record.isCompleted ||
        _fileChanged(
          record.fileModifiedAtMillis,
          currentFileModifiedAtMillis,
        )) {
      return Duration.zero;
    }

    final duration = currentDuration ?? record.duration;
    final normalized = normalizePosition(record.position, duration);
    return isCompleted(normalized, duration) ? Duration.zero : normalized;
  }

  bool _fileChanged(int? storedMillis, int? currentMillis) {
    return storedMillis != null &&
        currentMillis != null &&
        storedMillis != currentMillis;
  }
}

class PlaybackPositionCoordinator {
  PlaybackPositionCoordinator({
    required this.store,
    this.policy = const PlaybackPositionPolicy(),
    this.minimumSaveInterval = const Duration(seconds: 15),
    PlaybackClock? clock,
  }) : clock = clock ?? DateTime.now;

  final PlaybackPositionStore store;
  final PlaybackPositionPolicy policy;
  final Duration minimumSaveInterval;
  final PlaybackClock clock;

  final Map<String, DateTime> _lastSavedAt = {};
  Future<void> _pendingWrite = Future.value();

  Future<Duration> restore({
    required String path,
    required Duration? duration,
    required int? fileModifiedAtMillis,
  }) async {
    final record = await store.load(path);
    if (record == null) {
      return Duration.zero;
    }
    return policy.resumePosition(
      record: record,
      currentDuration: duration,
      currentFileModifiedAtMillis: fileModifiedAtMillis,
    );
  }

  Future<void> record({
    required String path,
    required Duration position,
    required Duration? duration,
    required int? fileModifiedAtMillis,
    bool completed = false,
    bool force = false,
  }) {
    final savedAt = clock();
    final lastSavedAt = _lastSavedAt[path];
    if (!force &&
        lastSavedAt != null &&
        savedAt.difference(lastSavedAt) < minimumSaveInterval) {
      return Future.value();
    }

    _lastSavedAt[path] = savedAt;
    final normalized = policy.normalizePosition(position, duration);
    final record = PlaybackPositionRecord(
      path: path,
      positionMillis: normalized.inMilliseconds,
      durationMillis: duration?.inMilliseconds,
      updatedAtMillis: savedAt.millisecondsSinceEpoch,
      isCompleted: completed || policy.isCompleted(normalized, duration),
      fileModifiedAtMillis: fileModifiedAtMillis,
    );
    _pendingWrite = _pendingWrite.then(
      (_) => store.save(record),
      onError: (_) => store.save(record),
    );
    return _pendingWrite;
  }

  Future<void> flush() => _pendingWrite;
}
