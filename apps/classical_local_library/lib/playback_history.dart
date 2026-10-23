import 'dart:async';

import 'classical_library_models.dart';
import 'file_links.dart';
import 'local_playback.dart';
import 'playback_planner.dart';

typedef PlaybackHistoryClock = DateTime Function();
typedef PlaybackHistoryIdFactory = String Function(DateTime startedAt);

enum PlaybackHistoryStatus {
  partial(label: '일부 감상'),
  completed(label: '감상 완료'),
  error(label: '재생 오류');

  const PlaybackHistoryStatus({required this.label});

  final String label;
}

enum PlaybackHistoryRetentionPolicy {
  keepForever(label: '계속 보관'),
  days30(label: '최근 30일'),
  days90(label: '최근 90일'),
  days365(label: '최근 1년');

  const PlaybackHistoryRetentionPolicy({required this.label});

  final String label;

  int? get retentionDays => switch (this) {
    PlaybackHistoryRetentionPolicy.keepForever => null,
    PlaybackHistoryRetentionPolicy.days30 => 30,
    PlaybackHistoryRetentionPolicy.days90 => 90,
    PlaybackHistoryRetentionPolicy.days365 => 365,
  };
}

enum ListeningStatisticsPeriod {
  all(label: '전체'),
  days30(label: '30일'),
  days90(label: '90일');

  const ListeningStatisticsPeriod({required this.label});

  final String label;

  int? get days => switch (this) {
    ListeningStatisticsPeriod.all => null,
    ListeningStatisticsPeriod.days30 => 30,
    ListeningStatisticsPeriod.days90 => 90,
  };
}

class PlaybackHistoryGroupStatistics {
  const PlaybackHistoryGroupStatistics({
    required this.id,
    required this.title,
    required this.listenedMillis,
    required this.sessionCount,
    required this.completedSessionCount,
    required this.lastPlayedAtMillis,
  });

  final String id;
  final String title;
  final int listenedMillis;
  final int sessionCount;
  final int completedSessionCount;
  final int? lastPlayedAtMillis;

  Duration get listenedDuration => Duration(milliseconds: listenedMillis);
}

class PlaybackHistoryStatistics {
  const PlaybackHistoryStatistics({
    required this.listenedMillis,
    required this.sessionCount,
    required this.completedSessionCount,
    required this.distinctTrackCount,
    required this.workStatistics,
    required this.recordingStatistics,
    this.lastPlayedAtMillis,
  });

  const PlaybackHistoryStatistics.empty()
    : listenedMillis = 0,
      sessionCount = 0,
      completedSessionCount = 0,
      distinctTrackCount = 0,
      workStatistics = const [],
      recordingStatistics = const [],
      lastPlayedAtMillis = null;

  final int listenedMillis;
  final int sessionCount;
  final int completedSessionCount;
  final int distinctTrackCount;
  final int? lastPlayedAtMillis;
  final List<PlaybackHistoryGroupStatistics> workStatistics;
  final List<PlaybackHistoryGroupStatistics> recordingStatistics;

  Duration get listenedDuration => Duration(milliseconds: listenedMillis);
}

class PlaybackHistoryEntry {
  const PlaybackHistoryEntry({
    required this.sessionId,
    required this.trackId,
    required this.recordingId,
    required this.workId,
    required this.path,
    required this.workTitle,
    required this.recordingTitle,
    required this.trackTitle,
    required this.startedAtMillis,
    required this.lastPlayedAtMillis,
    required this.listenedMillis,
    required this.lastPositionMillis,
    required this.status,
    this.durationMillis,
  });

  final String sessionId;
  final String trackId;
  final String recordingId;
  final String workId;
  final String path;
  final String workTitle;
  final String recordingTitle;
  final String trackTitle;
  final int startedAtMillis;
  final int lastPlayedAtMillis;
  final int listenedMillis;
  final int lastPositionMillis;
  final int? durationMillis;
  final PlaybackHistoryStatus status;

  DateTime get startedAt =>
      DateTime.fromMillisecondsSinceEpoch(startedAtMillis);

  DateTime get lastPlayedAt =>
      DateTime.fromMillisecondsSinceEpoch(lastPlayedAtMillis);

  Duration get listenedDuration => Duration(milliseconds: listenedMillis);

  Duration get lastPosition => Duration(milliseconds: lastPositionMillis);

  Duration? get duration =>
      durationMillis == null ? null : Duration(milliseconds: durationMillis!);

  bool get isCompleted => status == PlaybackHistoryStatus.completed;
}

abstract class PlaybackHistoryStore {
  Future<void> save(PlaybackHistoryEntry entry);

  Future<List<PlaybackHistoryEntry>> loadRecent({int limit = 10});

  Future<List<PlaybackHistoryEntry>> loadForTrack(
    String trackId, {
    int limit = 20,
  });

  Future<List<PlaybackHistoryEntry>> loadForWork(
    String workId, {
    int limit = 20,
  });

  Future<List<PlaybackHistoryEntry>> loadForRecording(
    String recordingId, {
    int limit = 20,
  });

  Future<bool> deleteSession(String sessionId);

  Future<int> deleteAll();

  Future<int> deleteOlderThan(int cutoffMillis);

  Future<PlaybackHistoryStatistics> loadStatistics({
    int? sinceMillis,
    int limit = 5,
  });
}

abstract class PlaybackHistoryPreferencesStore {
  Future<PlaybackHistoryRetentionPolicy> loadRetentionPolicy();

  Future<void> saveRetentionPolicy(PlaybackHistoryRetentionPolicy policy);
}

class MemoryPlaybackHistoryPreferencesStore
    implements PlaybackHistoryPreferencesStore {
  MemoryPlaybackHistoryPreferencesStore({
    PlaybackHistoryRetentionPolicy initialPolicy =
        PlaybackHistoryRetentionPolicy.keepForever,
  }) : _policy = initialPolicy;

  PlaybackHistoryRetentionPolicy _policy;

  @override
  Future<PlaybackHistoryRetentionPolicy> loadRetentionPolicy() async => _policy;

  @override
  Future<void> saveRetentionPolicy(
    PlaybackHistoryRetentionPolicy policy,
  ) async {
    _policy = policy;
  }
}

class DeferredPlaybackHistoryPreferencesStore
    implements PlaybackHistoryPreferencesStore {
  DeferredPlaybackHistoryPreferencesStore(this._loadStore);

  final Future<PlaybackHistoryPreferencesStore> Function() _loadStore;
  Future<PlaybackHistoryPreferencesStore>? _store;

  Future<PlaybackHistoryPreferencesStore> get _resolvedStore =>
      _store ??= _loadStore();

  @override
  Future<PlaybackHistoryRetentionPolicy> loadRetentionPolicy() async =>
      (await _resolvedStore).loadRetentionPolicy();

  @override
  Future<void> saveRetentionPolicy(
    PlaybackHistoryRetentionPolicy policy,
  ) async {
    await (await _resolvedStore).saveRetentionPolicy(policy);
  }
}

class MemoryPlaybackHistoryStore implements PlaybackHistoryStore {
  MemoryPlaybackHistoryStore([List<PlaybackHistoryEntry> seed = const []])
    : _entries = {for (final entry in seed) entry.sessionId: entry};

  final Map<String, PlaybackHistoryEntry> _entries;

  @override
  Future<void> save(PlaybackHistoryEntry entry) async {
    _entries[entry.sessionId] = entry;
  }

  @override
  Future<bool> deleteSession(String sessionId) async {
    return _entries.remove(sessionId) != null;
  }

  @override
  Future<int> deleteAll() async {
    final count = _entries.length;
    _entries.clear();
    return count;
  }

  @override
  Future<int> deleteOlderThan(int cutoffMillis) async {
    final sessionIds = _entries.values
        .where((entry) => entry.lastPlayedAtMillis < cutoffMillis)
        .map((entry) => entry.sessionId)
        .toList();
    for (final sessionId in sessionIds) {
      _entries.remove(sessionId);
    }
    return sessionIds.length;
  }

  @override
  Future<PlaybackHistoryStatistics> loadStatistics({
    int? sinceMillis,
    int limit = 5,
  }) async {
    final entries = _entries.values
        .where(
          (entry) =>
              sinceMillis == null || entry.lastPlayedAtMillis >= sinceMillis,
        )
        .toList();
    return _statisticsFromEntries(entries, limit: limit);
  }

  @override
  Future<List<PlaybackHistoryEntry>> loadForWork(
    String workId, {
    int limit = 20,
  }) async {
    return _sorted(_entries.values.where((entry) => entry.workId == workId))
        .take(limit)
        .toList();
  }

  @override
  Future<List<PlaybackHistoryEntry>> loadRecent({int limit = 10}) async {
    return _sorted(_entries.values).take(limit).toList();
  }

  @override
  Future<List<PlaybackHistoryEntry>> loadForTrack(
    String trackId, {
    int limit = 20,
  }) async {
    return _sorted(_entries.values.where((entry) => entry.trackId == trackId))
        .take(limit)
        .toList();
  }

  @override
  Future<List<PlaybackHistoryEntry>> loadForRecording(
    String recordingId, {
    int limit = 20,
  }) async {
    return _sorted(
      _entries.values.where((entry) => entry.recordingId == recordingId),
    ).take(limit).toList();
  }

  List<PlaybackHistoryEntry> _sorted(Iterable<PlaybackHistoryEntry> entries) {
    final sorted = entries.toList()
      ..sort((a, b) {
        final byLastPlayed = b.lastPlayedAtMillis.compareTo(
          a.lastPlayedAtMillis,
        );
        if (byLastPlayed != 0) {
          return byLastPlayed;
        }
        return b.startedAtMillis.compareTo(a.startedAtMillis);
      });
    return sorted;
  }
}

class DeferredPlaybackHistoryStore implements PlaybackHistoryStore {
  DeferredPlaybackHistoryStore(this._loadStore);

  final Future<PlaybackHistoryStore> Function() _loadStore;
  Future<PlaybackHistoryStore>? _store;

  Future<PlaybackHistoryStore> get _resolvedStore => _store ??= _loadStore();

  @override
  Future<void> save(PlaybackHistoryEntry entry) async {
    await (await _resolvedStore).save(entry);
  }

  @override
  Future<bool> deleteSession(String sessionId) async {
    return (await _resolvedStore).deleteSession(sessionId);
  }

  @override
  Future<int> deleteAll() async => (await _resolvedStore).deleteAll();

  @override
  Future<int> deleteOlderThan(int cutoffMillis) async {
    return (await _resolvedStore).deleteOlderThan(cutoffMillis);
  }

  @override
  Future<PlaybackHistoryStatistics> loadStatistics({
    int? sinceMillis,
    int limit = 5,
  }) async {
    return (await _resolvedStore).loadStatistics(
      sinceMillis: sinceMillis,
      limit: limit,
    );
  }

  @override
  Future<List<PlaybackHistoryEntry>> loadRecent({int limit = 10}) async {
    return (await _resolvedStore).loadRecent(limit: limit);
  }

  @override
  Future<List<PlaybackHistoryEntry>> loadForTrack(
    String trackId, {
    int limit = 20,
  }) async {
    return (await _resolvedStore).loadForTrack(trackId, limit: limit);
  }

  @override
  Future<List<PlaybackHistoryEntry>> loadForWork(
    String workId, {
    int limit = 20,
  }) async {
    return (await _resolvedStore).loadForWork(workId, limit: limit);
  }

  @override
  Future<List<PlaybackHistoryEntry>> loadForRecording(
    String recordingId, {
    int limit = 20,
  }) async {
    return (await _resolvedStore).loadForRecording(recordingId, limit: limit);
  }
}

class PlaybackHistoryRepository {
  const PlaybackHistoryRepository(this.store);

  final PlaybackHistoryStore store;

  Future<void> save(PlaybackHistoryEntry entry) => store.save(entry);

  Future<List<PlaybackHistoryEntry>> recent({int limit = 10}) =>
      store.loadRecent(limit: limit);

  Future<List<PlaybackHistoryEntry>> forTrack(
    String trackId, {
    int limit = 20,
  }) => store.loadForTrack(trackId, limit: limit);

  Future<List<PlaybackHistoryEntry>> forWork(String workId, {int limit = 20}) =>
      store.loadForWork(workId, limit: limit);

  Future<List<PlaybackHistoryEntry>> forRecording(
    String recordingId, {
    int limit = 20,
  }) => store.loadForRecording(recordingId, limit: limit);

  Future<bool> deleteSession(String sessionId) =>
      store.deleteSession(sessionId);

  Future<int> deleteAll() => store.deleteAll();

  Future<int> deleteOlderThan(int cutoffMillis) =>
      store.deleteOlderThan(cutoffMillis);

  Future<PlaybackHistoryStatistics> statistics({
    int? sinceMillis,
    int limit = 5,
  }) => store.loadStatistics(sinceMillis: sinceMillis, limit: limit);
}

class PlaybackHistoryPreferencesRepository {
  const PlaybackHistoryPreferencesRepository(this.store);

  final PlaybackHistoryPreferencesStore store;

  Future<PlaybackHistoryRetentionPolicy> loadRetentionPolicy() =>
      store.loadRetentionPolicy();

  Future<void> saveRetentionPolicy(PlaybackHistoryRetentionPolicy policy) =>
      store.saveRetentionPolicy(policy);
}

class PlaybackHistoryRetentionService {
  const PlaybackHistoryRetentionService();

  Future<int> apply({
    required PlaybackHistoryRepository repository,
    required PlaybackHistoryRetentionPolicy policy,
    required DateTime now,
  }) {
    final days = policy.retentionDays;
    if (days == null) {
      return Future.value(0);
    }
    return repository.deleteOlderThan(
      now.subtract(Duration(days: days)).millisecondsSinceEpoch,
    );
  }
}

PlaybackHistoryStatistics _statisticsFromEntries(
  Iterable<PlaybackHistoryEntry> source, {
  required int limit,
}) {
  final entries = source.toList();
  final workGroups = <String, _MutableHistoryStatisticsGroup>{};
  final recordingGroups = <String, _MutableHistoryStatisticsGroup>{};
  var listenedMillis = 0;
  var completedSessionCount = 0;
  var lastPlayedAtMillis = 0;
  final trackIds = <String>{};

  for (final entry in entries) {
    listenedMillis += entry.listenedMillis;
    if (entry.status == PlaybackHistoryStatus.completed) {
      completedSessionCount += 1;
    }
    trackIds.add(entry.trackId);
    lastPlayedAtMillis = lastPlayedAtMillis < entry.lastPlayedAtMillis
        ? entry.lastPlayedAtMillis
        : lastPlayedAtMillis;
    (workGroups[entry.workId] ??= _MutableHistoryStatisticsGroup(
      id: entry.workId,
      title: entry.workTitle,
    )).add(entry);
    (recordingGroups[entry.recordingId] ??= _MutableHistoryStatisticsGroup(
      id: entry.recordingId,
      title: entry.recordingTitle,
    )).add(entry);
  }

  List<PlaybackHistoryGroupStatistics> sortedGroups(
    Iterable<_MutableHistoryStatisticsGroup> groups,
  ) {
    final sorted = groups.map((group) => group.toImmutable()).toList()
      ..sort((a, b) {
        final byDuration = b.listenedMillis.compareTo(a.listenedMillis);
        if (byDuration != 0) {
          return byDuration;
        }
        final byLastPlayed = (b.lastPlayedAtMillis ?? 0).compareTo(
          a.lastPlayedAtMillis ?? 0,
        );
        if (byLastPlayed != 0) {
          return byLastPlayed;
        }
        return a.title.compareTo(b.title);
      });
    return sorted.take(limit).toList(growable: false);
  }

  return PlaybackHistoryStatistics(
    listenedMillis: listenedMillis,
    sessionCount: entries.length,
    completedSessionCount: completedSessionCount,
    distinctTrackCount: trackIds.length,
    lastPlayedAtMillis: lastPlayedAtMillis == 0 ? null : lastPlayedAtMillis,
    workStatistics: sortedGroups(workGroups.values),
    recordingStatistics: sortedGroups(recordingGroups.values),
  );
}

class _MutableHistoryStatisticsGroup {
  _MutableHistoryStatisticsGroup({required this.id, required this.title});

  final String id;
  final String title;
  var listenedMillis = 0;
  var sessionCount = 0;
  var completedSessionCount = 0;
  int? lastPlayedAtMillis;

  void add(PlaybackHistoryEntry entry) {
    listenedMillis += entry.listenedMillis;
    sessionCount += 1;
    if (entry.status == PlaybackHistoryStatus.completed) {
      completedSessionCount += 1;
    }
    if (lastPlayedAtMillis == null ||
        lastPlayedAtMillis! < entry.lastPlayedAtMillis) {
      lastPlayedAtMillis = entry.lastPlayedAtMillis;
    }
  }

  PlaybackHistoryGroupStatistics toImmutable() {
    return PlaybackHistoryGroupStatistics(
      id: id,
      title: title,
      listenedMillis: listenedMillis,
      sessionCount: sessionCount,
      completedSessionCount: completedSessionCount,
      lastPlayedAtMillis: lastPlayedAtMillis,
    );
  }
}

class PlaybackHistoryCoordinator {
  PlaybackHistoryCoordinator({
    required this.repository,
    PlaybackHistoryClock? clock,
    PlaybackHistoryIdFactory? idFactory,
    this.checkpointInterval = const Duration(seconds: 30),
  }) : clock = clock ?? DateTime.now,
       _idFactory = idFactory ?? _defaultIdFactory;

  final PlaybackHistoryRepository repository;
  final PlaybackHistoryClock clock;
  final PlaybackHistoryIdFactory _idFactory;
  final Duration checkpointInterval;
  final StreamController<PlaybackHistoryEntry> _changes =
      StreamController<PlaybackHistoryEntry>.broadcast(sync: true);

  _ActivePlaybackHistorySession? _active;
  Future<void> _pending = Future.value();
  bool _isDisposed = false;
  static int _nextDefaultId = 0;

  Stream<PlaybackHistoryEntry> get changes => _changes.stream;

  String? get activeSessionId => _active?.sessionId;

  Future<void> observe(LocalPlaybackState state) {
    if (_isDisposed) {
      return Future.value();
    }
    final operation = _pending.then((_) => _observe(state));
    _pending = operation.then<void>((_) {}, onError: (_, _) {});
    return operation;
  }

  Future<void> closeCurrent({
    PlaybackHistoryStatus status = PlaybackHistoryStatus.partial,
  }) {
    if (_isDisposed) {
      return Future.value();
    }
    final operation = _pending.then((_) => _finishActive(clock(), status));
    _pending = operation.then<void>((_) {}, onError: (_, _) {});
    return operation;
  }

  Future<void> _observe(LocalPlaybackState state) async {
    final now = clock();
    final item = state.currentItem;
    final active = _active;
    final sameItem =
        active != null &&
        item != null &&
        active.trackId == item.trackId &&
        active.path == item.path;

    if (active != null && sameItem) {
      active.updatePlaybackState(state);
    } else if (active != null && item != null && !sameItem) {
      await _finishActive(now, PlaybackHistoryStatus.partial);
    }

    if (state.playerState == LocalPlayerState.error) {
      await _finishActive(
        now,
        PlaybackHistoryStatus.error,
        terminalState: state,
      );
      return;
    }
    if (state.playerState == LocalPlayerState.completed) {
      await _finishActive(
        now,
        PlaybackHistoryStatus.completed,
        terminalState: state,
      );
      return;
    }
    if (state.playerState == LocalPlayerState.stopped ||
        state.playerState == LocalPlayerState.idle) {
      await _finishActive(now, PlaybackHistoryStatus.partial);
      return;
    }

    final isActivelyPlaying =
        state.playerState == LocalPlayerState.playing &&
        state.processingState == LocalPlaybackProcessingState.ready &&
        !state.isSeeking;
    if (isActivelyPlaying && item != null) {
      if (_active == null) {
        await _start(item, state, now);
      } else {
        final active = _active!..startPlaying(now);
        if (active.shouldCheckpoint(now, checkpointInterval)) {
          active.checkpoint(now);
          await _saveActive(now, PlaybackHistoryStatus.partial);
        }
      }
      return;
    }

    final current = _active;
    if (current == null) {
      return;
    }
    current.stopPlaying(now);
    if (state.playerState == LocalPlayerState.paused) {
      await _saveActive(now, PlaybackHistoryStatus.partial);
    }
  }

  Future<void> _start(
    LocalPlaybackQueueItem item,
    LocalPlaybackState state,
    DateTime now,
  ) async {
    final session = _ActivePlaybackHistorySession(
      sessionId: _idFactory(now),
      item: item,
      startedAt: now,
      position: state.normalizedPosition,
      duration: state.duration,
      lastCheckpointAt: now,
    )..startPlaying(now);
    _active = session;
    await _saveActive(now, PlaybackHistoryStatus.partial);
  }

  Future<void> _finishActive(
    DateTime now,
    PlaybackHistoryStatus status, {
    LocalPlaybackState? terminalState,
  }) async {
    final active = _active;
    if (active == null) {
      return;
    }
    if (terminalState != null) {
      active.updateTerminalState(terminalState);
    }
    active.stopPlaying(now);
    await _saveActive(now, status);
    _active = null;
  }

  Future<void> _saveActive(DateTime now, PlaybackHistoryStatus status) async {
    final active = _active;
    if (active == null) {
      return;
    }
    final entry = active.toEntry(now: now, status: status);
    await repository.save(entry);
    if (!_isDisposed) {
      _changes.add(entry);
    }
  }

  Future<void> dispose() async {
    if (_isDisposed) {
      return;
    }
    await _pending;
    await _finishActive(clock(), PlaybackHistoryStatus.partial);
    _isDisposed = true;
    await _changes.close();
  }

  static String _defaultIdFactory(DateTime startedAt) {
    final suffix = _nextDefaultId++;
    return 'history-${startedAt.microsecondsSinceEpoch}-$suffix';
  }
}

class _ActivePlaybackHistorySession {
  _ActivePlaybackHistorySession({
    required this.sessionId,
    required LocalPlaybackQueueItem item,
    required this.startedAt,
    required this.position,
    required this.duration,
    required this.lastCheckpointAt,
  }) : trackId = item.trackId,
       recordingId = item.recordingId,
       workId = item.workId,
       path = item.path,
       workTitle = item.workTitle,
       recordingTitle = item.recordingTitle,
       trackTitle = item.displayTitle;

  final String sessionId;
  final String trackId;
  final String recordingId;
  final String workId;
  final String path;
  final String workTitle;
  final String recordingTitle;
  final String trackTitle;
  final DateTime startedAt;

  Duration listened = Duration.zero;
  Duration position;
  Duration? duration;
  DateTime? playingSince;
  DateTime lastCheckpointAt;

  void startPlaying(DateTime now) {
    playingSince ??= now;
  }

  void stopPlaying(DateTime now) {
    final since = playingSince;
    if (since == null) {
      return;
    }
    final elapsed = now.difference(since);
    if (!elapsed.isNegative) {
      listened += elapsed;
    }
    playingSince = null;
  }

  bool shouldCheckpoint(DateTime now, Duration interval) =>
      interval > Duration.zero && now.difference(lastCheckpointAt) >= interval;

  void checkpoint(DateTime now) {
    final wasPlaying = playingSince != null;
    stopPlaying(now);
    lastCheckpointAt = now;
    if (wasPlaying) startPlaying(now);
  }

  void updatePlaybackState(LocalPlaybackState state) {
    position = state.normalizedPosition;
    duration = state.duration ?? duration;
  }

  void updateTerminalState(LocalPlaybackState state) {
    position = state.normalizedPosition;
    duration = state.duration ?? duration;
  }

  PlaybackHistoryEntry toEntry({
    required DateTime now,
    required PlaybackHistoryStatus status,
  }) {
    return PlaybackHistoryEntry(
      sessionId: sessionId,
      trackId: trackId,
      recordingId: recordingId,
      workId: workId,
      path: path,
      workTitle: workTitle,
      recordingTitle: recordingTitle,
      trackTitle: trackTitle,
      startedAtMillis: startedAt.millisecondsSinceEpoch,
      lastPlayedAtMillis: now.millisecondsSinceEpoch,
      listenedMillis: listened.inMilliseconds,
      lastPositionMillis: position.inMilliseconds,
      durationMillis: duration?.inMilliseconds,
      status: status,
    );
  }
}

class ContinueListeningQueueResult {
  const ContinueListeningQueueResult({
    required this.queue,
    this.unavailableReason,
  });

  final List<LocalPlaybackQueueItem> queue;
  final String? unavailableReason;

  bool get canPlay => queue.isNotEmpty && unavailableReason == null;
}

class ContinueListeningQueueBuilder {
  const ContinueListeningQueueBuilder();

  ContinueListeningQueueResult build({
    required PlaybackHistoryEntry history,
    required ClassicalLibrary library,
    required List<LocalAudioFile> scannedFiles,
    required List<AudioFileTrackLink> links,
  }) {
    final planner = ClassicalPlaybackPlanner(library: library);
    final plan = planner.createContinuationPlan(
      recordingId: history.recordingId,
      trackId: history.trackId,
    );
    if (plan == null) {
      return _fallback(history, scannedFiles);
    }

    final built = const LocalPlaybackQueueBuilder().build(
      plan: plan,
      scannedFiles: scannedFiles,
      links: links,
    );
    final queue = [...built];
    if (queue.isNotEmpty && !queue.first.usesLinkedFile) {
      final fallbackFile = _fileAtPath(history.path, scannedFiles);
      if (fallbackFile != null) {
        queue[0] = LocalPlaybackQueueItem(
          trackId: history.trackId,
          recordingId: history.recordingId,
          workId: history.workId,
          displayTitle: history.trackTitle,
          path: fallbackFile.path,
          usesLinkedFile: true,
          workTitle: history.workTitle,
          recordingTitle: history.recordingTitle,
          fileModifiedAtMillis: fallbackFile.modifiedAtMillis,
        );
      }
    }

    if (queue.any((item) => !item.usesLinkedFile)) {
      return ContinueListeningQueueResult(
        queue: queue,
        unavailableReason: '남은 악장의 로컬 파일 연결이 필요합니다.',
      );
    }
    if (_containsMissingFile(queue, scannedFiles)) {
      return ContinueListeningQueueResult(
        queue: queue,
        unavailableReason: '연결된 로컬 파일을 다시 확인해 주세요.',
      );
    }
    return ContinueListeningQueueResult(queue: List.unmodifiable(queue));
  }

  ContinueListeningQueueResult _fallback(
    PlaybackHistoryEntry history,
    List<LocalAudioFile> scannedFiles,
  ) {
    final file = _fileAtPath(history.path, scannedFiles);
    if (file == null) {
      return const ContinueListeningQueueResult(
        queue: [],
        unavailableReason: '이어 들을 로컬 파일을 찾을 수 없습니다.',
      );
    }
    return ContinueListeningQueueResult(
      queue: [
        LocalPlaybackQueueItem(
          trackId: history.trackId,
          recordingId: history.recordingId,
          workId: history.workId,
          displayTitle: history.trackTitle,
          path: file.path,
          usesLinkedFile: true,
          workTitle: history.workTitle,
          recordingTitle: history.recordingTitle,
          fileModifiedAtMillis: file.modifiedAtMillis,
        ),
      ],
    );
  }

  LocalAudioFile? _fileAtPath(String path, List<LocalAudioFile> scannedFiles) {
    for (final file in scannedFiles) {
      if (file.path == path && file.importStatus != AudioImportStatus.missing) {
        return file;
      }
    }
    return null;
  }

  bool _containsMissingFile(
    List<LocalPlaybackQueueItem> queue,
    List<LocalAudioFile> scannedFiles,
  ) {
    final filesByPath = {for (final file in scannedFiles) file.path: file};
    return queue.any(
      (item) =>
          filesByPath[item.path]?.importStatus == AudioImportStatus.missing,
    );
  }
}
