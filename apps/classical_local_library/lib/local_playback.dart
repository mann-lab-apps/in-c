import 'dart:async';
import 'dart:io';

import 'classical_library_models.dart';
import 'file_links.dart';
import 'local_audio_scanner.dart';
import 'metadata_candidates.dart';
import 'metadata_overrides.dart';
import 'playback_position.dart';
import 'playback_planner.dart';

const _unsetPlaybackValue = Object();

class LocalPlaybackQueueItem {
  const LocalPlaybackQueueItem({
    required this.trackId,
    required this.recordingId,
    required this.workId,
    required this.displayTitle,
    required this.path,
    required this.usesLinkedFile,
    required this.workTitle,
    required this.recordingTitle,
    this.fileModifiedAtMillis,
  });

  final String trackId;
  final String recordingId;
  final String workId;
  final String displayTitle;
  final String path;
  final bool usesLinkedFile;
  final String workTitle;
  final String recordingTitle;
  final int? fileModifiedAtMillis;

  bool get isDirectFile => trackId.startsWith('local-file:');

  String get fileSourceLabel => isDirectFile
      ? '로컬 파일'
      : usesLinkedFile
      ? '연결 파일'
      : '샘플 파일';
}

class LocalPlaybackQueueBuilder {
  const LocalPlaybackQueueBuilder({
    this.resolver = const LinkedAudioFileResolver(),
  });

  final LinkedAudioFileResolver resolver;

  LocalPlaybackQueueBuildResult buildDetailed({
    required PlaybackPlan plan,
    required List<LocalAudioFile> scannedFiles,
    required List<AudioFileTrackLink> links,
    List<MetadataCandidate> candidates = const [],
    List<MetadataOverride> overrides = const [],
    Map<String, String> workAliases = const {},
    Map<String, String> recordingAliases = const {},
    ClassicalQueueMissingPolicy missingPolicy =
        ClassicalQueueMissingPolicy.playAvailable,
  }) {
    final available = <LocalPlaybackQueueItem>[];
    final planned = <LocalPlaybackQueueItem>[];
    final missingTitles = <String>[];
    final seenTrackIds = <String>{};
    final linkedFiles = resolver.index(
      scannedFiles: scannedFiles,
      links: links,
    );
    final candidatesByFileId = {
      for (final candidate in candidates) candidate.fileId: candidate,
    };
    final overridesByFileId = {
      for (final override in overrides) override.fileId: override,
    };
    for (final item in plan.items) {
      if (!seenTrackIds.add(item.track.id)) continue;
      final queueItem = _buildItem(
        item: item,
        linkedFiles: linkedFiles,
        candidatesByFileId: candidatesByFileId,
        overridesByFileId: overridesByFileId,
        workAliases: workAliases,
        recordingAliases: recordingAliases,
      );
      planned.add(queueItem);
      if (queueItem.usesLinkedFile) {
        available.add(queueItem);
      } else {
        missingTitles.add(queueItem.displayTitle);
      }
    }
    final queue = switch (missingPolicy) {
      ClassicalQueueMissingPolicy.showPlanned => planned,
      ClassicalQueueMissingPolicy.playAvailable => available,
      ClassicalQueueMissingPolicy.completeOnly =>
        missingTitles.isEmpty ? available : const <LocalPlaybackQueueItem>[],
    };
    return LocalPlaybackQueueBuildResult(
      queue: List.unmodifiable(queue),
      missingTitles: List.unmodifiable(missingTitles),
      workTitle: planned.isEmpty ? plan.work.title.ko : planned.first.workTitle,
      recordingTitle: planned.isEmpty
          ? plan.recording.title.ko
          : planned.first.recordingTitle,
    );
  }

  List<LocalPlaybackQueueItem> build({
    required PlaybackPlan plan,
    required List<LocalAudioFile> scannedFiles,
    required List<AudioFileTrackLink> links,
    List<MetadataCandidate> candidates = const [],
    List<MetadataOverride> overrides = const [],
    Map<String, String> workAliases = const {},
    Map<String, String> recordingAliases = const {},
  }) {
    return buildDetailed(
      plan: plan,
      scannedFiles: scannedFiles,
      links: links,
      candidates: candidates,
      overrides: overrides,
      workAliases: workAliases,
      recordingAliases: recordingAliases,
      missingPolicy: ClassicalQueueMissingPolicy.showPlanned,
    ).queue;
  }

  LocalPlaybackQueueItem _buildItem({
    required PlaybackQueueItem item,
    required LinkedAudioFileIndex linkedFiles,
    required Map<String, MetadataCandidate> candidatesByFileId,
    required Map<String, MetadataOverride> overridesByFileId,
    required Map<String, String> workAliases,
    required Map<String, String> recordingAliases,
  }) {
    final linkedFile = linkedFiles.fileForTrack(item.track);
    final candidate = linkedFile == null
        ? null
        : candidatesByFileId[linkedFile.id];
    final override = linkedFile == null
        ? null
        : overridesByFileId[linkedFile.id];
    final effective = EffectiveFileMetadata.resolve(
      candidate: candidate,
      tag: linkedFile?.tagMetadata,
      override: override,
    );
    return LocalPlaybackQueueItem(
      trackId: item.track.id,
      recordingId: recordingAliases[item.recording.id] ?? item.recording.id,
      workId: workAliases[item.work.id] ?? item.work.id,
      displayTitle:
          effective.text(MetadataField.movementTitle) ?? item.displayTitle,
      path: linkedFile?.path ?? item.file.path,
      usesLinkedFile: linkedFile != null,
      workTitle: effective.text(MetadataField.workTitle) ?? item.work.title.ko,
      recordingTitle: item.recording.title.ko,
      fileModifiedAtMillis: linkedFile?.modifiedAtMillis,
    );
  }
}

enum ClassicalQueueMissingPolicy {
  playAvailable(label: '연결된 악장 재생'),
  completeOnly(label: '완전한 작품만 재생'),
  showPlanned(label: '계획 표시');

  const ClassicalQueueMissingPolicy({required this.label});

  final String label;
}

class LocalPlaybackQueueBuildResult {
  const LocalPlaybackQueueBuildResult({
    required this.queue,
    required this.missingTitles,
    required this.workTitle,
    required this.recordingTitle,
  });

  final List<LocalPlaybackQueueItem> queue;
  final List<String> missingTitles;
  final String workTitle;
  final String recordingTitle;

  bool get isComplete => missingTitles.isEmpty;
  int get missingCount => missingTitles.length;
}

enum LocalPlayerState {
  idle(label: '대기'),
  loading(label: '불러오는 중'),
  ready(label: '준비됨'),
  playing(label: '재생 중'),
  paused(label: '일시정지'),
  stopped(label: '정지됨'),
  completed(label: '완료'),
  error(label: '재생할 수 없음');

  const LocalPlayerState({required this.label});

  final String label;
}

enum LocalPlaybackProcessingState { idle, loading, buffering, ready, completed }

enum LocalPlaybackFailureKind {
  emptyQueue,
  unlinkedFile,
  missingFile,
  unsupportedFormat,
  loadFailed,
}

class LocalPlaybackFailure {
  const LocalPlaybackFailure({
    required this.kind,
    required this.userMessage,
    this.path,
    this.technicalMessage,
  });

  final LocalPlaybackFailureKind kind;
  final String userMessage;
  final String? path;
  final String? technicalMessage;
}

class LocalPlaybackState {
  const LocalPlaybackState({
    required this.playerState,
    required this.queue,
    required this.currentIndex,
    this.position = Duration.zero,
    this.duration,
    this.bufferedPosition = Duration.zero,
    this.isSeeking = false,
    this.processingState = LocalPlaybackProcessingState.idle,
    this.failure,
  });

  const LocalPlaybackState.idle()
    : playerState = LocalPlayerState.idle,
      queue = const [],
      currentIndex = 0,
      position = Duration.zero,
      duration = null,
      bufferedPosition = Duration.zero,
      isSeeking = false,
      processingState = LocalPlaybackProcessingState.idle,
      failure = null;

  final LocalPlayerState playerState;
  final List<LocalPlaybackQueueItem> queue;
  final int currentIndex;
  final Duration position;
  final Duration? duration;
  final Duration bufferedPosition;
  final bool isSeeking;
  final LocalPlaybackProcessingState processingState;
  final LocalPlaybackFailure? failure;

  LocalPlaybackQueueItem? get currentItem {
    if (queue.isEmpty || currentIndex < 0 || currentIndex >= queue.length) {
      return null;
    }
    return queue[currentIndex];
  }

  bool get hasQueue => queue.isNotEmpty;

  bool get isBusy => playerState == LocalPlayerState.loading || isSeeking;

  Duration get normalizedPosition => _normalizeDuration(position, duration);

  Duration get normalizedBufferedPosition => _normalizeDuration(
    bufferedPosition < normalizedPosition
        ? normalizedPosition
        : bufferedPosition,
    duration,
  );

  LocalPlaybackState copyWith({
    LocalPlayerState? playerState,
    List<LocalPlaybackQueueItem>? queue,
    int? currentIndex,
    Duration? position,
    Object? duration = _unsetPlaybackValue,
    Duration? bufferedPosition,
    bool? isSeeking,
    LocalPlaybackProcessingState? processingState,
    Object? failure = _unsetPlaybackValue,
  }) {
    return LocalPlaybackState(
      playerState: playerState ?? this.playerState,
      queue: queue ?? this.queue,
      currentIndex: currentIndex ?? this.currentIndex,
      position: position ?? this.position,
      duration: identical(duration, _unsetPlaybackValue)
          ? this.duration
          : duration as Duration?,
      bufferedPosition: bufferedPosition ?? this.bufferedPosition,
      isSeeking: isSeeking ?? this.isSeeking,
      processingState: processingState ?? this.processingState,
      failure: identical(failure, _unsetPlaybackValue)
          ? this.failure
          : failure as LocalPlaybackFailure?,
    );
  }

  int get positionLabelIndex {
    if (!hasQueue) {
      return 0;
    }
    return currentIndex.clamp(0, queue.length - 1) + 1;
  }

  String get summary {
    final playbackFailure = failure;
    if (playbackFailure != null) {
      return '${playerState.label} · ${playbackFailure.userMessage}';
    }

    final item = currentItem;
    if (item == null) {
      return playerState.label;
    }
    return '${playerState.label} · $positionLabelIndex/${queue.length} · '
        '${item.workTitle} · ${item.displayTitle}';
  }

  static Duration _normalizeDuration(Duration value, Duration? maximum) {
    if (value.isNegative) {
      return Duration.zero;
    }
    if (maximum != null && value > maximum) {
      return maximum;
    }
    return value;
  }
}

abstract class LocalPlaybackController {
  LocalPlaybackState get playbackState;

  Stream<LocalPlaybackState> get states;

  Future<void> loadQueue(List<LocalPlaybackQueueItem> queue);

  Future<void> play();

  Future<void> pause();

  Future<void> resume();

  Future<void> next();

  Future<void> seek(Duration position);

  Future<void> persistPosition();

  Future<void> stop();

  Future<void> dispose();
}

class SerializedLocalPlaybackController implements LocalPlaybackController {
  SerializedLocalPlaybackController(this.delegate);

  final LocalPlaybackController delegate;
  Future<void> _tail = Future<void>.value();
  bool _disposeRequested = false;

  @override
  LocalPlaybackState get playbackState => delegate.playbackState;

  @override
  Stream<LocalPlaybackState> get states => delegate.states;

  Future<void> _enqueue(Future<void> Function() operation) {
    if (_disposeRequested) return Future<void>.value();
    final result = _tail.then((_) => operation());
    _tail = result.then<void>((_) {}, onError: (_, _) {});
    return result;
  }

  @override
  Future<void> loadQueue(List<LocalPlaybackQueueItem> queue) =>
      _enqueue(() => delegate.loadQueue(queue));

  @override
  Future<void> play() => _enqueue(delegate.play);

  @override
  Future<void> pause() => _enqueue(delegate.pause);

  @override
  Future<void> resume() => _enqueue(delegate.resume);

  @override
  Future<void> next() => _enqueue(delegate.next);

  @override
  Future<void> seek(Duration position) =>
      _enqueue(() => delegate.seek(position));

  @override
  Future<void> persistPosition() => _enqueue(delegate.persistPosition);

  @override
  Future<void> stop() => _enqueue(delegate.stop);

  @override
  Future<void> dispose() {
    if (_disposeRequested) return _tail;
    final result = _tail.then((_) => delegate.dispose());
    _disposeRequested = true;
    _tail = result.then<void>((_) {}, onError: (_, _) {});
    return result;
  }
}

class PlaybackQueueSnapshot {
  const PlaybackQueueSnapshot({
    required this.trackIds,
    required this.currentTrackId,
    required this.savedAtMillis,
  });

  final List<String> trackIds;
  final String? currentTrackId;
  final int savedAtMillis;
}

abstract interface class PlaybackQueueSnapshotStore {
  Future<PlaybackQueueSnapshot?> load();

  Future<void> save(PlaybackQueueSnapshot snapshot);

  Future<void> clear();
}

class DeferredPlaybackQueueSnapshotStore implements PlaybackQueueSnapshotStore {
  DeferredPlaybackQueueSnapshotStore(this._loadStore);

  final Future<PlaybackQueueSnapshotStore> Function() _loadStore;
  Future<PlaybackQueueSnapshotStore>? _store;

  Future<PlaybackQueueSnapshotStore> get _resolvedStore =>
      _store ??= _loadStore();

  @override
  Future<PlaybackQueueSnapshot?> load() async => (await _resolvedStore).load();

  @override
  Future<void> save(PlaybackQueueSnapshot snapshot) async {
    await (await _resolvedStore).save(snapshot);
  }

  @override
  Future<void> clear() async => (await _resolvedStore).clear();
}

class MemoryPlaybackQueueSnapshotStore implements PlaybackQueueSnapshotStore {
  PlaybackQueueSnapshot? snapshot;

  @override
  Future<PlaybackQueueSnapshot?> load() async => snapshot;

  @override
  Future<void> save(PlaybackQueueSnapshot snapshot) async {
    this.snapshot = snapshot;
  }

  @override
  Future<void> clear() async => snapshot = null;
}

class PlaybackQueueRecoveryResult {
  const PlaybackQueueRecoveryResult({
    required this.queue,
    required this.skippedTrackIds,
    required this.hadSnapshot,
  });

  final List<LocalPlaybackQueueItem> queue;
  final List<String> skippedTrackIds;
  final bool hadSnapshot;

  bool get isPartial => skippedTrackIds.isNotEmpty && queue.isNotEmpty;
  bool get isUnavailable => hadSnapshot && queue.isEmpty;
}

class PlaybackQueueRecovery {
  const PlaybackQueueRecovery();

  PlaybackQueueRecoveryResult recover({
    required PlaybackQueueSnapshot? snapshot,
    required List<LocalPlaybackQueueItem> currentQueue,
  }) {
    if (snapshot == null) {
      return const PlaybackQueueRecoveryResult(
        queue: [],
        skippedTrackIds: [],
        hadSnapshot: false,
      );
    }
    final byTrackId = {for (final item in currentQueue) item.trackId: item};
    final recovered = <LocalPlaybackQueueItem>[];
    final skipped = <String>[];
    final seen = <String>{};
    for (final trackId in snapshot.trackIds) {
      if (!seen.add(trackId)) continue;
      final item = byTrackId[trackId];
      if (item == null || !item.usesLinkedFile) {
        skipped.add(trackId);
      } else {
        recovered.add(item);
      }
    }
    final currentIndex = recovered.indexWhere(
      (item) => item.trackId == snapshot.currentTrackId,
    );
    if (currentIndex > 0) {
      final currentAndFollowing = recovered.sublist(currentIndex);
      final previous = recovered.sublist(0, currentIndex);
      recovered
        ..clear()
        ..addAll(currentAndFollowing)
        ..addAll(previous);
    }
    return PlaybackQueueRecoveryResult(
      queue: List.unmodifiable(recovered),
      skippedTrackIds: List.unmodifiable(skipped),
      hadSnapshot: true,
    );
  }
}

class PlaybackQueuePersistenceCoordinator {
  PlaybackQueuePersistenceCoordinator({
    required this.store,
    DateTime Function()? clock,
  }) : clock = clock ?? DateTime.now;

  final PlaybackQueueSnapshotStore store;
  final DateTime Function() clock;
  Future<void> _tail = Future<void>.value();
  String? _lastSignature;

  Future<PlaybackQueueSnapshot?> load() => store.load();

  Future<void> clear() {
    _lastSignature = null;
    final result = _tail.then((_) => store.clear());
    _tail = result.then<void>((_) {}, onError: (_, _) {});
    return result;
  }

  Future<void> observe(LocalPlaybackState state) {
    if (state.queue.isEmpty) return Future<void>.value();
    final currentTrackId =
        state.currentItem?.trackId ??
        (state.queue.isEmpty ? null : state.queue.last.trackId);
    final signature =
        '${state.queue.map((item) => item.trackId).join('|')}#'
        '$currentTrackId';
    if (signature == _lastSignature) return Future<void>.value();
    _lastSignature = signature;
    final snapshot = PlaybackQueueSnapshot(
      trackIds: [for (final item in state.queue) item.trackId],
      currentTrackId: currentTrackId,
      savedAtMillis: clock().millisecondsSinceEpoch,
    );
    final result = _tail.then((_) async {
      try {
        await store.save(snapshot);
      } catch (_) {
        if (_lastSignature == signature) _lastSignature = null;
        rethrow;
      }
    });
    _tail = result.then<void>((_) {}, onError: (_, _) {});
    return result;
  }

  Future<void> flush() => _tail;
}

abstract class LocalPlaybackFileProbe {
  const LocalPlaybackFileProbe();

  Future<bool> exists(String path);
}

class IoLocalPlaybackFileProbe extends LocalPlaybackFileProbe {
  const IoLocalPlaybackFileProbe();

  @override
  Future<bool> exists(String path) => File(path).exists();
}

class LocalPlaybackQueueValidator {
  const LocalPlaybackQueueValidator({
    this.fileProbe = const IoLocalPlaybackFileProbe(),
  });

  final LocalPlaybackFileProbe fileProbe;

  Future<LocalPlaybackFailure?> validate(
    List<LocalPlaybackQueueItem> queue,
  ) async {
    if (queue.isEmpty) {
      return const LocalPlaybackFailure(
        kind: LocalPlaybackFailureKind.emptyQueue,
        userMessage: '재생할 트랙이 없습니다.',
      );
    }

    for (final item in queue) {
      if (!item.usesLinkedFile) {
        return LocalPlaybackFailure(
          kind: LocalPlaybackFailureKind.unlinkedFile,
          userMessage: '모든 트랙을 실제 로컬 파일에 연결해 주세요.',
          path: item.path,
          technicalMessage: 'Queue item ${item.trackId} uses a sample path.',
        );
      }

      if (audioExtensionForPath(item.path) == null) {
        return LocalPlaybackFailure(
          kind: LocalPlaybackFailureKind.unsupportedFormat,
          userMessage: '지원하지 않는 오디오 형식입니다.',
          path: item.path,
          technicalMessage: 'Unsupported audio extension: ${item.path}',
        );
      }

      if (!await fileProbe.exists(item.path)) {
        return LocalPlaybackFailure(
          kind: LocalPlaybackFailureKind.missingFile,
          userMessage: '연결된 오디오 파일을 찾을 수 없습니다.',
          path: item.path,
          technicalMessage: 'Local audio file does not exist: ${item.path}',
        );
      }
    }

    return null;
  }
}

class FakeLocalPlayer implements LocalPlaybackController {
  FakeLocalPlayer({
    this.validator,
    this.positionCoordinator,
    this.trackDurations = const {},
  });

  final LocalPlaybackQueueValidator? validator;
  final PlaybackPositionCoordinator? positionCoordinator;
  final Map<String, Duration> trackDurations;
  final StreamController<LocalPlaybackState> _states =
      StreamController<LocalPlaybackState>.broadcast(sync: true);
  LocalPlaybackState _playbackState = const LocalPlaybackState.idle();
  bool _isDisposed = false;

  LocalPlayerState get state => _playbackState.playerState;

  List<LocalPlaybackQueueItem> get queue => _playbackState.queue;

  int get currentIndex => _playbackState.currentIndex;

  LocalPlaybackQueueItem? get currentItem => _playbackState.currentItem;

  @override
  LocalPlaybackState get playbackState => _playbackState;

  @override
  Stream<LocalPlaybackState> get states => _states.stream;

  @override
  Future<void> loadQueue(List<LocalPlaybackQueueItem> nextQueue) async {
    _emit(
      LocalPlaybackState(
        playerState: LocalPlayerState.loading,
        queue: List.unmodifiable(nextQueue),
        currentIndex: 0,
        processingState: LocalPlaybackProcessingState.loading,
      ),
    );

    final failure = await validator?.validate(nextQueue);
    if (failure != null) {
      _emit(
        LocalPlaybackState(
          playerState: LocalPlayerState.error,
          queue: List.unmodifiable(nextQueue),
          currentIndex: 0,
          failure: failure,
        ),
      );
      return;
    }

    final duration = nextQueue.isEmpty
        ? null
        : trackDurations[nextQueue.first.trackId];
    final restoredPosition = nextQueue.isEmpty
        ? Duration.zero
        : await positionCoordinator?.restore(
                path: nextQueue.first.path,
                duration: duration,
                fileModifiedAtMillis: nextQueue.first.fileModifiedAtMillis,
              ) ??
              Duration.zero;
    _emit(
      LocalPlaybackState(
        playerState: nextQueue.isEmpty
            ? LocalPlayerState.idle
            : LocalPlayerState.ready,
        queue: List.unmodifiable(nextQueue),
        currentIndex: 0,
        position: restoredPosition,
        duration: duration,
        bufferedPosition: restoredPosition,
        processingState: nextQueue.isEmpty
            ? LocalPlaybackProcessingState.idle
            : LocalPlaybackProcessingState.ready,
      ),
    );
  }

  Future<void> playQueue(List<LocalPlaybackQueueItem> nextQueue) async {
    await loadQueue(nextQueue);
    await play();
  }

  @override
  Future<void> play() async {
    if (queue.isEmpty) {
      _emit(const LocalPlaybackState.idle());
      return;
    }
    if (state == LocalPlayerState.error) {
      return;
    }

    final index = currentIndex >= queue.length ? 0 : currentIndex;
    _emit(
      _playbackState.copyWith(
        playerState: LocalPlayerState.playing,
        currentIndex: index,
        processingState: LocalPlaybackProcessingState.ready,
        failure: null,
      ),
    );
  }

  @override
  Future<void> pause() async {
    if (state == LocalPlayerState.playing) {
      _emit(_playbackState.copyWith(playerState: LocalPlayerState.paused));
      await persistPosition();
    }
  }

  @override
  Future<void> resume() async {
    if (state == LocalPlayerState.paused) {
      await play();
    }
  }

  @override
  Future<void> next() async {
    if (queue.isEmpty) {
      _emit(const LocalPlaybackState.idle());
      return;
    }

    if (currentIndex < queue.length - 1) {
      await persistPosition();
      final nextIndex = currentIndex + 1;
      _emit(
        LocalPlaybackState(
          playerState: LocalPlayerState.playing,
          queue: queue,
          currentIndex: nextIndex,
          duration: trackDurations[queue[nextIndex].trackId],
          processingState: LocalPlaybackProcessingState.ready,
        ),
      );
    } else {
      await _saveCurrentPosition(force: true, completed: true);
      _emit(
        LocalPlaybackState(
          playerState: LocalPlayerState.completed,
          queue: queue,
          currentIndex: queue.length,
          position: _playbackState.duration ?? _playbackState.position,
          duration: _playbackState.duration,
          bufferedPosition:
              _playbackState.duration ?? _playbackState.bufferedPosition,
          processingState: LocalPlaybackProcessingState.completed,
        ),
      );
    }
  }

  @override
  Future<void> seek(Duration position) async {
    if (currentItem == null || state == LocalPlayerState.error) {
      return;
    }
    _emit(_playbackState.copyWith(isSeeking: true));
    final normalized = const PlaybackPositionPolicy().normalizePosition(
      position,
      _playbackState.duration,
    );
    _emit(
      _playbackState.copyWith(
        position: normalized,
        bufferedPosition: _playbackState.bufferedPosition < normalized
            ? normalized
            : _playbackState.bufferedPosition,
        isSeeking: false,
      ),
    );
  }

  Future<void> updatePosition(
    Duration position, {
    Duration? bufferedPosition,
  }) async {
    if (currentItem == null) {
      return;
    }
    final normalized = const PlaybackPositionPolicy().normalizePosition(
      position,
      _playbackState.duration,
    );
    _emit(
      _playbackState.copyWith(
        position: normalized,
        bufferedPosition: bufferedPosition ?? normalized,
      ),
    );
    await _saveCurrentPosition();
  }

  @override
  Future<void> stop() async {
    if (queue.isEmpty) {
      _emit(const LocalPlaybackState.idle());
      return;
    }

    await persistPosition();
    _emit(
      LocalPlaybackState(
        playerState: LocalPlayerState.stopped,
        queue: queue,
        currentIndex: 0,
        duration: trackDurations[queue.first.trackId],
        processingState: LocalPlaybackProcessingState.ready,
      ),
    );
  }

  @override
  Future<void> persistPosition() => _saveCurrentPosition(force: true);

  @override
  Future<void> dispose() async {
    if (_isDisposed) {
      return;
    }
    _isDisposed = true;
    await persistPosition();
    await positionCoordinator?.flush();
    await _states.close();
  }

  Future<void> _saveCurrentPosition({
    bool force = false,
    bool completed = false,
  }) async {
    final item = currentItem;
    final coordinator = positionCoordinator;
    if (item == null || coordinator == null) {
      return;
    }
    await coordinator.record(
      path: item.path,
      position: _playbackState.normalizedPosition,
      duration: _playbackState.duration,
      fileModifiedAtMillis: item.fileModifiedAtMillis,
      completed: completed,
      force: force,
    );
  }

  void _emit(LocalPlaybackState nextState) {
    if (_isDisposed) {
      return;
    }
    _playbackState = nextState;
    _states.add(nextState);
  }
}
