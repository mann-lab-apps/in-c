import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/playback_history.dart';
import 'package:classical_local_library/sample_classical_library.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('PlaybackHistoryCoordinator', () {
    late _FakeClock clock;
    late MemoryPlaybackHistoryStore store;
    late PlaybackHistoryCoordinator coordinator;
    var nextId = 0;

    setUp(() {
      clock = _FakeClock(DateTime.utc(2026, 10, 19));
      store = MemoryPlaybackHistoryStore();
      coordinator = PlaybackHistoryCoordinator(
        repository: PlaybackHistoryRepository(store),
        clock: clock.call,
        idFactory: (_) => 'session-${nextId++}',
      );
    });

    tearDown(() => coordinator.dispose());

    test(
      'play starts a session and pause/resume keeps the same session',
      () async {
        await coordinator.observe(_state(LocalPlayerState.playing));
        clock.advance(const Duration(seconds: 10));
        await coordinator.observe(
          _state(
            LocalPlayerState.paused,
            position: const Duration(seconds: 40),
          ),
        );

        clock.advance(const Duration(minutes: 1));
        await coordinator.observe(
          _state(
            LocalPlayerState.playing,
            position: const Duration(seconds: 40),
          ),
        );
        clock.advance(const Duration(seconds: 5));
        await coordinator.closeCurrent();

        final entries = await store.loadRecent();
        expect(entries, hasLength(1));
        expect(entries.single.sessionId, 'session-0');
        expect(entries.single.listenedDuration, const Duration(seconds: 15));
        expect(entries.single.lastPosition, const Duration(seconds: 40));
        expect(entries.single.status, PlaybackHistoryStatus.partial);
      },
    );

    test(
      'seek and duplicate player events do not inflate listened time',
      () async {
        await coordinator.observe(_state(LocalPlayerState.playing));
        await coordinator.observe(_state(LocalPlayerState.playing));
        clock.advance(const Duration(seconds: 4));
        await coordinator.observe(
          _state(
            LocalPlayerState.playing,
            position: const Duration(minutes: 8),
            duration: const Duration(minutes: 10),
          ),
        );
        clock.advance(const Duration(seconds: 3));
        await coordinator.observe(
          _state(
            LocalPlayerState.paused,
            position: const Duration(minutes: 8, seconds: 3),
            duration: const Duration(minutes: 10),
          ),
        );

        final entry = (await store.loadRecent()).single;
        expect(entry.listenedDuration, const Duration(seconds: 7));
        expect(entry.lastPosition, const Duration(minutes: 8, seconds: 3));
      },
    );

    test('buffering time is excluded from listened time', () async {
      await coordinator.observe(_state(LocalPlayerState.playing));
      clock.advance(const Duration(seconds: 3));
      await coordinator.observe(
        _state(
          LocalPlayerState.playing,
          processingState: LocalPlaybackProcessingState.buffering,
        ),
      );
      clock.advance(const Duration(seconds: 10));
      await coordinator.observe(_state(LocalPlayerState.playing));
      clock.advance(const Duration(seconds: 2));
      await coordinator.observe(_state(LocalPlayerState.paused));

      expect(
        (await store.loadRecent()).single.listenedDuration,
        const Duration(seconds: 5),
      );
    });

    test('next finalizes the old movement and starts a new session', () async {
      await coordinator.observe(_state(LocalPlayerState.playing));
      clock.advance(const Duration(seconds: 6));
      await coordinator.observe(_state(LocalPlayerState.playing, index: 1));
      clock.advance(const Duration(seconds: 2));
      await coordinator.observe(_state(LocalPlayerState.stopped, index: 1));

      final first = (await store.loadForTrack('track-1')).single;
      final second = (await store.loadForTrack('track-2')).single;
      expect(first.listenedDuration, const Duration(seconds: 6));
      expect(second.listenedDuration, const Duration(seconds: 2));
      expect(first.status, PlaybackHistoryStatus.partial);
      expect(second.status, PlaybackHistoryStatus.partial);
    });

    test('completed and error states preserve terminal status', () async {
      await coordinator.observe(_state(LocalPlayerState.playing));
      clock.advance(const Duration(seconds: 9));
      await coordinator.observe(
        _state(
          LocalPlayerState.completed,
          position: const Duration(minutes: 3),
        ),
      );
      await coordinator.observe(_state(LocalPlayerState.playing, index: 1));
      clock.advance(const Duration(seconds: 1));
      await coordinator.observe(_state(LocalPlayerState.error, index: 1));

      expect(
        (await store.loadForTrack('track-1')).single.status,
        PlaybackHistoryStatus.completed,
      );
      expect(
        (await store.loadForTrack('track-2')).single.status,
        PlaybackHistoryStatus.error,
      );
    });

    test('replaying the same track creates a new session', () async {
      await coordinator.observe(_state(LocalPlayerState.playing));
      clock.advance(const Duration(seconds: 1));
      await coordinator.observe(_state(LocalPlayerState.stopped));
      await coordinator.observe(_state(LocalPlayerState.playing));
      clock.advance(const Duration(seconds: 2));
      await coordinator.closeCurrent();

      final entries = await store.loadForTrack('track-1');
      expect(entries.map((entry) => entry.sessionId).toSet(), hasLength(2));
      expect(
        entries.map((entry) => entry.listenedMillis),
        containsAll([1000, 2000]),
      );
    });

    test('dispose finalizes an active partial session once', () async {
      await coordinator.observe(_state(LocalPlayerState.playing));
      clock.advance(const Duration(seconds: 3));
      await coordinator.dispose();
      await coordinator.dispose();

      final entries = await store.loadRecent();
      expect(entries, hasLength(1));
      expect(entries.single.listenedMillis, 3000);
    });

    test('active playback checkpoints without ending the session', () async {
      await coordinator.observe(_state(LocalPlayerState.playing));
      clock.advance(const Duration(seconds: 31));
      await coordinator.observe(
        _state(LocalPlayerState.playing, position: const Duration(seconds: 31)),
      );

      var entries = await store.loadRecent();
      expect(entries.single.listenedMillis, 31000);
      expect(entries.single.lastPositionMillis, 31000);
      expect(coordinator.activeSessionId, entries.single.sessionId);

      clock.advance(const Duration(seconds: 4));
      await coordinator.closeCurrent();
      entries = await store.loadRecent();
      expect(entries.single.listenedMillis, 35000);
    });
  });

  test('memory store upserts, filters, sorts, and limits history', () async {
    final store = MemoryPlaybackHistoryStore([
      _entry(sessionId: 'a', trackId: 'track-1', lastPlayedAtMillis: 100),
      _entry(sessionId: 'b', trackId: 'track-2', lastPlayedAtMillis: 300),
      _entry(sessionId: 'c', trackId: 'track-1', lastPlayedAtMillis: 200),
    ]);
    await store.save(
      _entry(sessionId: 'a', trackId: 'track-1', lastPlayedAtMillis: 400),
    );

    expect((await store.loadRecent(limit: 2)).map((entry) => entry.sessionId), [
      'a',
      'b',
    ]);
    expect(
      (await store.loadForTrack('track-1')).map((entry) => entry.sessionId),
      ['a', 'c'],
    );
    expect(await store.loadForWork('work-1', limit: 2), hasLength(2));
    expect(await store.loadForWork('missing-work'), isEmpty);
    expect(await store.loadForRecording('other-recording'), isEmpty);
  });

  test(
    'memory store deletes individual, expired, and all history entries',
    () async {
      final store = MemoryPlaybackHistoryStore([
        _entry(sessionId: 'old', trackId: 'track-1', lastPlayedAtMillis: 100),
        _entry(
          sessionId: 'boundary',
          trackId: 'track-2',
          lastPlayedAtMillis: 200,
        ),
      ]);

      expect(await store.deleteOlderThan(200), 1);
      expect((await store.loadRecent()).single.sessionId, 'boundary');
      expect(await store.deleteSession('boundary'), isTrue);
      expect(await store.deleteSession('missing'), isFalse);
      expect(await store.deleteAll(), 0);
    },
  );

  test(
    'retention service only deletes entries older than its cutoff',
    () async {
      final store = MemoryPlaybackHistoryStore([
        _entry(
          sessionId: 'expired',
          trackId: 'track-1',
          lastPlayedAtMillis: DateTime.utc(2026, 9, 18).millisecondsSinceEpoch,
        ),
        _entry(
          sessionId: 'kept',
          trackId: 'track-2',
          lastPlayedAtMillis: DateTime.utc(2026, 9, 19).millisecondsSinceEpoch,
        ),
      ]);
      final repository = PlaybackHistoryRepository(store);
      const service = PlaybackHistoryRetentionService();

      expect(
        await service.apply(
          repository: repository,
          policy: PlaybackHistoryRetentionPolicy.days30,
          now: DateTime.utc(2026, 10, 19),
        ),
        1,
      );
      expect((await repository.recent()).single.sessionId, 'kept');
      expect(
        await service.apply(
          repository: repository,
          policy: PlaybackHistoryRetentionPolicy.keepForever,
          now: DateTime.utc(2026, 10, 19),
        ),
        0,
      );
    },
  );

  test(
    'memory store aggregates listening statistics by work and recording',
    () async {
      final store = MemoryPlaybackHistoryStore([
        _entry(
          sessionId: 'a',
          trackId: 'track-1',
          recordingId: 'recording-a',
          lastPlayedAtMillis: 100,
        ),
        _entry(
          sessionId: 'b',
          trackId: 'track-2',
          recordingId: 'recording-b',
          lastPlayedAtMillis: 300,
        ),
      ]);
      final statistics = await store.loadStatistics(sinceMillis: 200);

      expect(statistics.sessionCount, 1);
      expect(statistics.distinctTrackCount, 1);
      expect(statistics.listenedMillis, 5000);
      expect(statistics.workStatistics.single.id, 'work-1');
      expect(statistics.recordingStatistics.single.id, 'recording-b');
    },
  );

  group('ContinueListeningQueueBuilder', () {
    test('builds the current and remaining movements in recording order', () {
      final fixture = _linkedRecordingFixture();
      final history = _historyForTrack(fixture.tracks[1], fixture.files[1]);

      final result = const ContinueListeningQueueBuilder().build(
        history: history,
        library: sampleClassicalLibrary,
        scannedFiles: fixture.files,
        links: fixture.links,
      );

      expect(result.canPlay, isTrue);
      expect(
        result.queue.map((item) => item.trackId),
        fixture.tracks.skip(1).map((track) => track.id),
      );
      expect(result.queue.every((item) => item.usesLinkedFile), isTrue);
    });

    test('last movement creates a one-item continuation queue', () {
      final fixture = _linkedRecordingFixture();
      final history = _historyForTrack(fixture.tracks.last, fixture.files.last);

      final result = const ContinueListeningQueueBuilder().build(
        history: history,
        library: sampleClassicalLibrary,
        scannedFiles: fixture.files,
        links: fixture.links,
      );

      expect(result.queue, hasLength(1));
      expect(result.canPlay, isTrue);
    });

    test('reports unavailable when a remaining movement is not linked', () {
      final fixture = _linkedRecordingFixture();
      final result = const ContinueListeningQueueBuilder().build(
        history: _historyForTrack(fixture.tracks.first, fixture.files.first),
        library: sampleClassicalLibrary,
        scannedFiles: fixture.files,
        links: fixture.links.take(1).toList(),
      );

      expect(result.canPlay, isFalse);
      expect(result.unavailableReason, contains('로컬 파일 연결'));
    });

    test('reports unavailable when a linked file is marked missing', () {
      final fixture = _linkedRecordingFixture();
      final files = [...fixture.files];
      final missing = files.last;
      files[files.length - 1] = LocalAudioFile(
        id: missing.id,
        path: missing.path,
        format: missing.format,
        importStatus: AudioImportStatus.missing,
      );

      final result = const ContinueListeningQueueBuilder().build(
        history: _historyForTrack(fixture.tracks.first, fixture.files.first),
        library: sampleClassicalLibrary,
        scannedFiles: files,
        links: fixture.links,
      );

      expect(result.canPlay, isFalse);
      expect(result.unavailableReason, contains('다시 확인'));
    });

    test('uses the snapshot path if the catalog item no longer exists', () {
      const path = '/music/archived.flac';
      const file = LocalAudioFile(
        id: 'archived-file',
        path: path,
        format: 'FLAC',
      );
      final history = _entry(
        sessionId: 'archived',
        trackId: 'removed-track',
        recordingId: 'removed-recording',
        path: path,
      );

      final result = const ContinueListeningQueueBuilder().build(
        history: history,
        library: sampleClassicalLibrary,
        scannedFiles: const [file],
        links: const [],
      );

      expect(result.canPlay, isTrue);
      expect(result.queue.single.trackId, 'removed-track');
      expect(result.queue.single.path, path);
    });
  });
}

LocalPlaybackState _state(
  LocalPlayerState playerState, {
  int index = 0,
  Duration position = Duration.zero,
  Duration duration = const Duration(minutes: 3),
  LocalPlaybackProcessingState processingState =
      LocalPlaybackProcessingState.ready,
}) {
  return LocalPlaybackState(
    playerState: playerState,
    queue: _queue,
    currentIndex: index,
    position: position,
    duration: duration,
    processingState: playerState == LocalPlayerState.completed
        ? LocalPlaybackProcessingState.completed
        : processingState,
    failure: playerState == LocalPlayerState.error
        ? const LocalPlaybackFailure(
            kind: LocalPlaybackFailureKind.loadFailed,
            userMessage: '재생 오류',
          )
        : null,
  );
}

const _queue = [
  LocalPlaybackQueueItem(
    trackId: 'track-1',
    recordingId: 'recording-1',
    workId: 'work-1',
    displayTitle: '1악장',
    path: '/music/1.flac',
    usesLinkedFile: true,
    workTitle: '교향곡 1번',
    recordingTitle: '첫 녹음',
  ),
  LocalPlaybackQueueItem(
    trackId: 'track-2',
    recordingId: 'recording-1',
    workId: 'work-1',
    displayTitle: '2악장',
    path: '/music/2.flac',
    usesLinkedFile: true,
    workTitle: '교향곡 1번',
    recordingTitle: '첫 녹음',
  ),
];

PlaybackHistoryEntry _entry({
  required String sessionId,
  required String trackId,
  String recordingId = 'recording-1',
  String path = '/music/1.flac',
  int lastPlayedAtMillis = 100,
}) {
  return PlaybackHistoryEntry(
    sessionId: sessionId,
    trackId: trackId,
    recordingId: recordingId,
    workId: 'work-1',
    path: path,
    workTitle: '교향곡 1번',
    recordingTitle: '첫 녹음',
    trackTitle: '1악장',
    startedAtMillis: 10,
    lastPlayedAtMillis: lastPlayedAtMillis,
    listenedMillis: 5000,
    lastPositionMillis: 30000,
    durationMillis: 180000,
    status: PlaybackHistoryStatus.partial,
  );
}

class _FakeClock {
  _FakeClock(this.now);

  DateTime now;

  DateTime call() => now;

  void advance(Duration duration) {
    now = now.add(duration);
  }
}

class _LinkedRecordingFixture {
  const _LinkedRecordingFixture(this.tracks, this.files, this.links);

  final List<Track> tracks;
  final List<LocalAudioFile> files;
  final List<AudioFileTrackLink> links;
}

_LinkedRecordingFixture _linkedRecordingFixture() {
  final recording = sampleClassicalLibrary.recordings.first;
  final tracks = sampleClassicalLibrary.tracksForRecording(recording.id);
  final files = [
    for (final track in tracks)
      LocalAudioFile(
        id: 'scanned-${track.id}',
        path: '/music/${track.id}.flac',
        format: 'FLAC',
      ),
  ];
  final links = [
    for (var index = 0; index < tracks.length; index += 1)
      AudioFileTrackLink(
        fileId: files[index].id,
        trackId: tracks[index].id,
        linkedAtMillis: 1,
      ),
  ];
  return _LinkedRecordingFixture(tracks, files, links);
}

PlaybackHistoryEntry _historyForTrack(Track track, LocalAudioFile file) {
  final recording = sampleClassicalLibrary.recording(track.recordingId);
  final work = sampleClassicalLibrary.work(recording.workId);
  return PlaybackHistoryEntry(
    sessionId: 'history-${track.id}',
    trackId: track.id,
    recordingId: recording.id,
    workId: work.id,
    path: file.path,
    workTitle: work.title.ko,
    recordingTitle: recording.title.ko,
    trackTitle: track.title?.ko ?? '악장',
    startedAtMillis: 1,
    lastPlayedAtMillis: 2,
    listenedMillis: 3,
    lastPositionMillis: 4,
    durationMillis: track.duration?.inMilliseconds,
    status: PlaybackHistoryStatus.partial,
  );
}
