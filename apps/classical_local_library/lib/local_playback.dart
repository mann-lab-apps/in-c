import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'classical_library_models.dart';
import 'file_links.dart';
import 'local_audio_scanner.dart';
import 'metadata_candidates.dart';
import 'metadata_overrides.dart';
import 'playback_position.dart';
import 'playback_planner.dart';
import 'playback_order.dart';
export 'playback_order.dart' show LocalRepeatMode;

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
    this.artist,
    this.album,
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
  final String? artist;
  final String? album;

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
    final effective = ListeningFileMetadata.resolve(
      candidate: candidate,
      tag: linkedFile?.tagMetadata,
      override: override,
    );
    return LocalPlaybackQueueItem(
      trackId: item.track.id,
      recordingId: recordingAliases[item.recording.id] ?? item.recording.id,
      workId: workAliases[item.work.id] ?? item.work.id,
      displayTitle: effective.title ?? item.displayTitle,
      path: linkedFile?.path ?? item.file.path,
      usesLinkedFile: linkedFile != null,
      workTitle: effective.workTitle ?? item.work.title.ko,
      recordingTitle: item.recording.title.ko,
      fileModifiedAtMillis: linkedFile?.modifiedAtMillis,
      artist: effective.artist,
      album: effective.album,
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
    this.shuffleEnabled = false,
    this.repeatMode = LocalRepeatMode.off,
    this.queueOrder = const [],
    this.isChangingMode = false,
    this.modeError,
    this.isEditingQueue = false,
    this.queueEditError,
    this.automaticTransitions = 0,
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
      failure = null,
      shuffleEnabled = false,
      repeatMode = LocalRepeatMode.off,
      queueOrder = const [],
      isChangingMode = false,
      modeError = null,
      isEditingQueue = false,
      queueEditError = null,
      automaticTransitions = 0;

  final LocalPlayerState playerState;
  final List<LocalPlaybackQueueItem> queue;
  final int currentIndex;
  final Duration position;
  final Duration? duration;
  final Duration bufferedPosition;
  final bool isSeeking;
  final LocalPlaybackProcessingState processingState;
  final LocalPlaybackFailure? failure;
  final bool shuffleEnabled;
  final LocalRepeatMode repeatMode;
  final List<int> queueOrder;
  final bool isChangingMode;
  final String? modeError;
  final bool isEditingQueue;
  final String? queueEditError;
  final int automaticTransitions;
  int? get originalIndex => currentItem == null
      ? null
      : queueOrder.length == queue.length
      ? queueOrder[currentIndex]
      : currentIndex;

  LocalPlaybackQueueItem? get currentItem {
    if (queue.isEmpty || currentIndex < 0 || currentIndex >= queue.length) {
      return null;
    }
    return queue[currentIndex];
  }

  bool get hasQueue => queue.isNotEmpty;

  bool get isBusy =>
      playerState == LocalPlayerState.loading ||
      isSeeking ||
      isChangingMode ||
      isEditingQueue;

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
    bool? shuffleEnabled,
    LocalRepeatMode? repeatMode,
    List<int>? queueOrder,
    bool? isChangingMode,
    Object? modeError = _unsetPlaybackValue,
    bool? isEditingQueue,
    Object? queueEditError = _unsetPlaybackValue,
    int? automaticTransitions,
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
      shuffleEnabled: shuffleEnabled ?? this.shuffleEnabled,
      repeatMode: repeatMode ?? this.repeatMode,
      queueOrder: queueOrder ?? this.queueOrder,
      isChangingMode: isChangingMode ?? this.isChangingMode,
      modeError: identical(modeError, _unsetPlaybackValue)
          ? this.modeError
          : modeError as String?,
      isEditingQueue: isEditingQueue ?? this.isEditingQueue,
      queueEditError: identical(queueEditError, _unsetPlaybackValue)
          ? this.queueEditError
          : queueEditError as String?,
      automaticTransitions: automaticTransitions ?? this.automaticTransitions,
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

  Future<void> previous();

  Future<void> seek(Duration position);

  Future<void> persistPosition();

  Future<void> stop();

  Future<void> dispose();
}

abstract interface class PlaybackMetadataUpdater {
  Future<void> updateMetadata(Map<String, LocalPlaybackQueueItem> items);
}

abstract interface class PlaybackModeController {
  Future<void> setShuffleEnabled(bool enabled);
  Future<void> setRepeatMode(LocalRepeatMode mode);
  Future<void> restoreQueue(PlaybackQueueRecoveryResult recovered);
}

/// Optional capability: existing custom controllers and test doubles remain valid.
abstract interface class PlaybackQueueEditor {
  /// Settles after confirmation, without starting playback. Read the confirmed
  /// queue length delta for the number added (while owning the command boundary),
  /// and [LocalPlaybackState.queueEditError] for exclusions/rejection. Native
  /// uncertainty also sets [LocalPlaybackState.failure]; it is never a success.
  /// Empty/no-op additions confirm zero. No queue is published optimistically.
  Future<void> enqueue(List<LocalPlaybackQueueItem> items, {bool next = false});
  Future<void> removeQueueItem(int effectiveIndex);
  Future<void> moveQueueItem(int from, int to);
  Future<void> clearUpcoming();
}

extension PlaybackQueueCommands on LocalPlaybackController {
  Future<void> enqueue(
    List<LocalPlaybackQueueItem> items, {
    bool next = false,
  }) => this is PlaybackQueueEditor
      ? (this as PlaybackQueueEditor).enqueue(items, next: next)
      : Future.error(UnsupportedError('대기열 편집을 지원하지 않습니다.'));
  Future<void> removeQueueItem(int effectiveIndex) =>
      this is PlaybackQueueEditor
      ? (this as PlaybackQueueEditor).removeQueueItem(effectiveIndex)
      : Future.error(UnsupportedError('대기열 편집을 지원하지 않습니다.'));

  /// [to] is the final index, after removal. Both endpoints must be upcoming.
  Future<void> moveQueueItem(int from, int to) => this is PlaybackQueueEditor
      ? (this as PlaybackQueueEditor).moveQueueItem(from, to)
      : Future.error(UnsupportedError('대기열 편집을 지원하지 않습니다.'));
  Future<void> clearUpcoming() => this is PlaybackQueueEditor
      ? (this as PlaybackQueueEditor).clearUpcoming()
      : Future.error(UnsupportedError('대기열 편집을 지원하지 않습니다.'));
}

/// Pure edit plan shared by the fake and engine adapter. Canonical occurrence
/// indexes, rather than track IDs or item equality, distinguish duplicates.
class PlaybackQueueEditPlan {
  PlaybackQueueEditPlan._(
    this.sources,
    this.order, {
    this.insertAt,
    this.added = const [],
    this.removed = const {},
    this.moveFrom,
    this.moveTo,
  });
  final List<LocalPlaybackQueueItem> sources;
  final PlaybackOrder order;
  final int? insertAt, moveFrom, moveTo;
  final List<LocalPlaybackQueueItem> added;
  final Set<int> removed;
  List<LocalPlaybackQueueItem> get queue =>
      List.unmodifiable([for (final i in order.indices) sources[i]]);

  factory PlaybackQueueEditPlan.insert(
    List<LocalPlaybackQueueItem> sources,
    PlaybackOrder order,
    List<LocalPlaybackQueueItem> items,
    int effectiveIndex,
    bool shuffled,
  ) {
    final at = shuffled ? sources.length : effectiveIndex;
    final next = sources.toList()..insertAll(at, items);
    return PlaybackQueueEditPlan._(
      List.unmodifiable(next),
      shuffled
          ? order.inserting(effectiveIndex, items.length)
          : PlaybackOrder.identity(next.length),
      insertAt: at,
      added: items,
    );
  }

  factory PlaybackQueueEditPlan.remove(
    List<LocalPlaybackQueueItem> sources,
    PlaybackOrder order,
    Iterable<int> effectiveIndices,
  ) {
    final removed = {for (final i in effectiveIndices) order.indices[i]};
    return PlaybackQueueEditPlan._(
      List.unmodifiable([
        for (var i = 0; i < sources.length; i++)
          if (!removed.contains(i)) sources[i],
      ]),
      order.removing(removed),
      removed: removed,
    );
  }

  factory PlaybackQueueEditPlan.move(
    List<LocalPlaybackQueueItem> sources,
    PlaybackOrder order,
    int from,
    int to,
    bool shuffled,
  ) {
    if (shuffled) {
      return PlaybackQueueEditPlan._(sources, order.moving(from, to));
    }
    final next = sources.toList();
    next.insert(to, next.removeAt(from));
    return PlaybackQueueEditPlan._(
      List.unmodifiable(next),
      PlaybackOrder.identity(next.length),
      moveFrom: from,
      moveTo: to,
    );
  }
}

extension PlaybackModeCommands on LocalPlaybackController {
  Future<void> setShuffleEnabled(bool enabled) => this is PlaybackModeController
      ? (this as PlaybackModeController).setShuffleEnabled(enabled)
      : Future.error(UnsupportedError('재생 모드를 지원하지 않습니다.'));
  Future<void> setRepeatMode(LocalRepeatMode mode) =>
      this is PlaybackModeController
      ? (this as PlaybackModeController).setRepeatMode(mode)
      : Future.error(UnsupportedError('재생 모드를 지원하지 않습니다.'));
  Future<void> restoreQueue(PlaybackQueueRecoveryResult recovered) =>
      this is PlaybackModeController
      ? (this as PlaybackModeController).restoreQueue(recovered)
      : loadQueue(recovered.queue);
}

/// Display changes never replace sources, identities, ordering or engine state.
LocalPlaybackState refreshPlaybackMetadata(
  LocalPlaybackState state,
  Map<String, LocalPlaybackQueueItem> items,
) {
  var changed = false;
  final queue = [
    for (final old in state.queue)
      () {
        final next = items[old.trackId];
        if (next == null ||
            next.path != old.path ||
            next.workId != old.workId ||
            next.recordingId != old.recordingId) {
          return old;
        }
        if (next.displayTitle == old.displayTitle &&
            next.artist == old.artist &&
            next.album == old.album &&
            next.workTitle == old.workTitle &&
            next.recordingTitle == old.recordingTitle) {
          return old;
        }
        changed = true;
        return next;
      }(),
  ];
  return changed ? state.copyWith(queue: List.unmodifiable(queue)) : state;
}

class SerializedLocalPlaybackController
    implements
        LocalPlaybackController,
        PlaybackMetadataUpdater,
        PlaybackModeController,
        PlaybackQueueEditor {
  SerializedLocalPlaybackController(this.delegate);

  final LocalPlaybackController delegate;
  Future<void> _tail = Future<void>.value();
  bool _disposeRequested = false;
  bool _diagnosticActive = false;
  int _queueRevision = 0;
  final _availability = StreamController<bool>.broadcast(sync: true);

  bool get diagnosticActive => _diagnosticActive;
  Stream<bool> get commandAvailability => _availability.stream;

  @override
  LocalPlaybackState get playbackState => delegate.playbackState;

  @override
  Stream<LocalPlaybackState> get states => delegate.states;

  @override
  Future<void> updateMetadata(Map<String, LocalPlaybackQueueItem> items) =>
      _enqueue(() async {
        final target = delegate;
        if (target is PlaybackMetadataUpdater) {
          await (target as PlaybackMetadataUpdater).updateMetadata(items);
        }
      });

  Future<void> _enqueue(Future<void> Function() operation) {
    if (_disposeRequested) return Future<void>.value();
    final result = _tail.then((_) => operation());
    _tail = result.then<void>((_) {}, onError: (_, _) {});
    return result;
  }

  @override
  Future<void> loadQueue(List<LocalPlaybackQueueItem> queue) {
    if (_diagnosticActive || _disposeRequested) return Future<void>.value();
    _queueRevision += 1;
    return _enqueue(() => delegate.loadQueue(queue));
  }

  Future<void> _command(Future<void> Function() operation) {
    if (_diagnosticActive) return Future<void>.value();
    return _enqueue(operation);
  }

  Future<void> dispatchForSelection(
    List<LocalPlaybackQueueItem> queue,
    int index,
    Future<void> Function(LocalPlaybackController) operation,
  ) => _command(() async {
    if (identical(queue, playbackState.queue) &&
        index == playbackState.currentIndex) {
      await operation(delegate);
    }
  });

  @override
  Future<void> play() => _command(delegate.play);

  @override
  Future<void> pause() => _command(delegate.pause);

  @override
  Future<void> resume() => _command(delegate.resume);

  @override
  Future<void> next() {
    final revision = _queueRevision,
        automatic = playbackState.automaticTransitions;
    return _command(() async {
      if (revision == _queueRevision &&
          automatic == playbackState.automaticTransitions) {
        await delegate.next();
      }
    });
  }

  @override
  Future<void> setShuffleEnabled(bool enabled) =>
      _modeCommand(() => delegate.setShuffleEnabled(enabled));
  @override
  Future<void> setRepeatMode(LocalRepeatMode mode) =>
      _modeCommand(() => delegate.setRepeatMode(mode));
  Future<void> _modeCommand(Future<void> Function() operation) {
    final revision = _queueRevision;
    return _command(() async {
      if (revision == _queueRevision) await operation();
    });
  }

  Future<void> _queueCommand(
    Future<void> Function() operation, {
    bool indexed = false,
  }) {
    final revision = _queueRevision, queue = playbackState.queue;
    return _command(() async {
      if (revision == _queueRevision &&
          (!indexed || identical(queue, playbackState.queue))) {
        await operation();
      }
    });
  }

  @override
  Future<void> enqueue(
    List<LocalPlaybackQueueItem> items, {
    bool next = false,
  }) {
    final copy = List<LocalPlaybackQueueItem>.unmodifiable(items);
    return _queueCommand(() => delegate.enqueue(copy, next: next));
  }

  @override
  Future<void> removeQueueItem(int effectiveIndex) => _queueCommand(
    () => delegate.removeQueueItem(effectiveIndex),
    indexed: true,
  );
  @override
  Future<void> moveQueueItem(int from, int to) =>
      _queueCommand(() => delegate.moveQueueItem(from, to), indexed: true);
  @override
  Future<void> clearUpcoming() => _queueCommand(delegate.clearUpcoming);

  @override
  Future<void> restoreQueue(PlaybackQueueRecoveryResult recovered) {
    if (_diagnosticActive || _disposeRequested) return Future.value();
    _queueRevision++;
    return _enqueue(() => delegate.restoreQueue(recovered));
  }

  @override
  Future<void> previous() => _command(delegate.previous);

  @override
  Future<void> seek(Duration position) {
    final item = playbackState.currentItem;
    final revision = _queueRevision;
    final original = playbackState.originalIndex,
        automatic = playbackState.automaticTransitions;
    return _command(() async {
      if (revision == _queueRevision &&
          original == playbackState.originalIndex &&
          automatic == playbackState.automaticTransitions &&
          identical(item, playbackState.currentItem)) {
        await delegate.seek(position);
      }
    });
  }

  @override
  Future<void> persistPosition() => _enqueue(delegate.persistPosition);

  @override
  // Destructive app flows await stop before clearing user data. Keep it ordered
  // behind a diagnostic instead of silently dropping that shutdown boundary.
  Future<void> stop() => _enqueue(delegate.stop);

  Future<T> runDiagnostic<T>(Future<T> Function() operation) {
    if (_diagnosticActive || _disposeRequested) {
      throw StateError('Playback diagnostic unavailable');
    }
    _diagnosticActive = true;
    _availability.add(false);
    final result = _tail.then((_) async {
      try {
        await delegate.pause();
        return await operation();
      } finally {
        _diagnosticActive = false;
        _availability.add(true);
      }
    });
    _tail = result.then<void>((_) {}, onError: (_, _) {});
    return result;
  }

  @override
  Future<void> dispose() {
    if (_disposeRequested) return _tail;
    final result = _tail.then((_) async {
      await delegate.dispose();
      await _availability.close();
    });
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
    this.queueOrder = const [],
    this.currentIndex,
    this.shuffleEnabled = false,
    this.repeatMode = LocalRepeatMode.off,
    this.optionsInvalid = false,
  });

  final List<String> trackIds;
  final String? currentTrackId;
  final int savedAtMillis;
  final List<int> queueOrder;
  final int? currentIndex;
  final bool shuffleEnabled;
  final LocalRepeatMode repeatMode;
  final bool optionsInvalid;
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
    this.queueOrder = const [],
    this.currentIndex = 0,
    this.shuffleEnabled = false,
    this.repeatMode = LocalRepeatMode.off,
  });

  final List<LocalPlaybackQueueItem> queue;
  final List<String> skippedTrackIds;
  final bool hadSnapshot;
  final List<int> queueOrder;
  final int currentIndex;
  final bool shuffleEnabled;
  final LocalRepeatMode repeatMode;

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
    if (snapshot.currentIndex != null &&
        PlaybackOrder.valid(snapshot.queueOrder, snapshot.trackIds.length)) {
      final kept = <int>[];
      final skipped = <String>[];
      for (var i = 0; i < snapshot.trackIds.length; i++) {
        final item = byTrackId[snapshot.trackIds[i]];
        if (item != null && item.usesLinkedFile) {
          kept.add(i);
        } else {
          skipped.add(snapshot.trackIds[i]);
        }
      }
      final originals = [for (final i in kept) snapshot.queueOrder[i]]..sort();
      final remap = {
        for (var i = 0; i < originals.length; i++) originals[i]: i,
      };
      var selected = kept.indexWhere((i) => i >= snapshot.currentIndex!);
      if (selected < 0) selected = 0;
      return PlaybackQueueRecoveryResult(
        queue: List.unmodifiable([
          for (final i in kept) byTrackId[snapshot.trackIds[i]]!,
        ]),
        skippedTrackIds: skipped,
        hadSnapshot: true,
        queueOrder: [for (final i in kept) remap[snapshot.queueOrder[i]]!],
        currentIndex: selected,
        shuffleEnabled: snapshot.shuffleEnabled,
        repeatMode: snapshot.repeatMode,
      );
    }
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
  List<LocalPlaybackQueueItem>? _lastQueue;
  List<int>? _lastOrder;
  int? _lastIndex;
  bool? _lastShuffle;
  LocalRepeatMode? _lastRepeat;

  Future<PlaybackQueueSnapshot?> load() => store.load();

  Future<void> clear() {
    _lastSignature = null;
    final result = _tail.then((_) => store.clear());
    _tail = result.then<void>((_) {}, onError: (_, _) {});
    return result;
  }

  Future<void> observe(LocalPlaybackState state) {
    if (state.queue.isEmpty || state.isBusy || state.failure != null) {
      return Future<void>.value();
    }
    if (_lastSignature != null &&
        identical(state.queue, _lastQueue) &&
        identical(state.queueOrder, _lastOrder) &&
        state.currentIndex == _lastIndex &&
        state.shuffleEnabled == _lastShuffle &&
        state.repeatMode == _lastRepeat) {
      return Future.value();
    }
    _lastQueue = state.queue;
    _lastOrder = state.queueOrder;
    _lastIndex = state.currentIndex;
    _lastShuffle = state.shuffleEnabled;
    _lastRepeat = state.repeatMode;
    final currentTrackId =
        state.currentItem?.trackId ??
        (state.queue.isEmpty ? null : state.queue.last.trackId);
    final index = state.currentIndex.clamp(0, state.queue.length - 1);
    final order = state.queueOrder.isEmpty
        ? List.generate(state.queue.length, (i) => i)
        : state.queueOrder;
    final signature = jsonEncode([
      state.queue.map((i) => i.trackId).toList(),
      index,
      order,
      state.shuffleEnabled,
      state.repeatMode.name,
    ]);
    if (signature == _lastSignature) return Future<void>.value();
    _lastSignature = signature;
    final snapshot = PlaybackQueueSnapshot(
      trackIds: [for (final item in state.queue) item.trackId],
      currentTrackId: currentTrackId,
      savedAtMillis: clock().millisecondsSinceEpoch,
      queueOrder: order,
      currentIndex: index,
      shuffleEnabled: state.shuffleEnabled,
      repeatMode: state.repeatMode,
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

class FakeLocalPlayer
    implements
        LocalPlaybackController,
        PlaybackMetadataUpdater,
        PlaybackModeController,
        PlaybackQueueEditor {
  FakeLocalPlayer({
    this.validator,
    this.positionCoordinator,
    this.trackDurations = const {},
    Random? random,
  }) : random = random ?? Random();

  final Random random;
  List<LocalPlaybackQueueItem> _sourceQueue = const [];
  PlaybackOrder _order = PlaybackOrder.identity(0);
  bool _shuffle = false;
  LocalRepeatMode _repeat = LocalRepeatMode.off;
  int _automaticTransitions = 0;
  int _queueGeneration = 0;

  final LocalPlaybackQueueValidator? validator;
  final PlaybackPositionCoordinator? positionCoordinator;
  final Map<String, Duration> trackDurations;
  final StreamController<LocalPlaybackState> _states =
      StreamController<LocalPlaybackState>.broadcast(sync: true);
  LocalPlaybackState _playbackState = const LocalPlaybackState.idle();
  bool _isDisposed = false;
  Future<void> _editTail = Future.value();

  LocalPlayerState get state => _playbackState.playerState;

  List<LocalPlaybackQueueItem> get queue => _playbackState.queue;

  int get currentIndex => _playbackState.currentIndex;

  LocalPlaybackQueueItem? get currentItem => _playbackState.currentItem;

  @override
  LocalPlaybackState get playbackState => _playbackState;

  @override
  Stream<LocalPlaybackState> get states => _states.stream;

  @override
  Future<void> updateMetadata(Map<String, LocalPlaybackQueueItem> items) async {
    if (_isDisposed) return;
    final next = refreshPlaybackMetadata(_playbackState, items);
    if (!identical(next, _playbackState)) {
      _sourceQueue = List.generate(
        next.queue.length,
        (i) => next.queue[_order.inverse[i]],
      );
      _emit(next);
    }
  }

  Future<void> _edit(Future<PlaybackQueueEditPlan?> Function() prepare) {
    final generation = _queueGeneration;
    final operation = _editTail.then((_) async {
      if (_isDisposed ||
          generation != _queueGeneration ||
          playbackState.isBusy ||
          state == LocalPlayerState.error) {
        return;
      }
      _emit(playbackState.copyWith(isEditingQueue: true, queueEditError: null));
      try {
        final plan = await prepare();
        if (_isDisposed || generation != _queueGeneration) return;
        if (plan != null) {
          final completed =
              state == LocalPlayerState.completed || queue.isEmpty;
          final firstAdded = plan.added.isEmpty
              ? null
              : plan.order.inverse[plan.insertAt!];
          _sourceQueue = plan.sources;
          _order = plan.order;
          final index = completed && firstAdded != null
              ? firstAdded
              : currentIndex;
          _emit(
            playbackState.copyWith(
              queue: plan.queue,
              currentIndex: index,
              playerState: completed && firstAdded != null
                  ? LocalPlayerState.ready
                  : state,
              position: completed && firstAdded != null
                  ? Duration.zero
                  : playbackState.position,
              duration: completed && firstAdded != null
                  ? trackDurations[plan.queue[index].trackId]
                  : playbackState.duration,
              bufferedPosition: completed && firstAdded != null
                  ? Duration.zero
                  : playbackState.bufferedPosition,
              processingState: completed && firstAdded != null
                  ? LocalPlaybackProcessingState.ready
                  : playbackState.processingState,
            ),
          );
        }
      } on Object {
        if (!_isDisposed && generation == _queueGeneration) {
          _emit(
            playbackState.copyWith(
              queueEditError: '대기열을 변경하지 못했습니다. 다시 시도해 주세요.',
            ),
          );
        }
      } finally {
        if (!_isDisposed && generation == _queueGeneration) {
          _emit(playbackState.copyWith(isEditingQueue: false));
        }
      }
    });
    _editTail = operation.then<void>((_) {}, onError: (_, _) {});
    return operation;
  }

  @override
  Future<void> enqueue(
    List<LocalPlaybackQueueItem> items, {
    bool next = false,
  }) {
    final copy = List<LocalPlaybackQueueItem>.unmodifiable(items);
    final generation = _queueGeneration;
    return _edit(() async {
      final available = <LocalPlaybackQueueItem>[];
      for (final item in copy) {
        if (await validator?.validate([item]) == null) available.add(item);
        if (_isDisposed || generation != _queueGeneration) return null;
      }
      if (available.length != copy.length) {
        _emit(
          playbackState.copyWith(
            queueEditError:
                '재생할 수 없는 ${copy.length - available.length}개 항목을 제외했습니다.',
          ),
        );
      }
      if (available.isEmpty) return null;
      return PlaybackQueueEditPlan.insert(
        _sourceQueue,
        _order,
        available,
        next && currentItem != null ? currentIndex + 1 : queue.length,
        _shuffle,
      );
    });
  }

  bool _upcoming(int index) {
    if (index > currentIndex && index < queue.length) return true;
    _emit(
      playbackState.copyWith(queueEditError: '현재 곡과 이전 재생 항목은 편집할 수 없습니다.'),
    );
    return false;
  }

  @override
  Future<void> removeQueueItem(int effectiveIndex) => _edit(
    () async => _upcoming(effectiveIndex)
        ? PlaybackQueueEditPlan.remove(_sourceQueue, _order, [effectiveIndex])
        : null,
  );
  @override
  Future<void> moveQueueItem(int from, int to) => _edit(
    () async => _upcoming(from) && _upcoming(to) && from != to
        ? PlaybackQueueEditPlan.move(_sourceQueue, _order, from, to, _shuffle)
        : null,
  );
  @override
  Future<void> clearUpcoming() => _edit(() async {
    final start = currentIndex + 1;
    return start >= queue.length
        ? null
        : PlaybackQueueEditPlan.remove(
            _sourceQueue,
            _order,
            Iterable.generate(queue.length - start, (i) => start + i),
          );
  });

  @override
  Future<void> loadQueue(List<LocalPlaybackQueueItem> nextQueue) =>
      _loadQueue(nextQueue);

  Future<void> _loadQueue(
    List<LocalPlaybackQueueItem> sources, {
    PlaybackOrder? order,
    int initialIndex = 0,
  }) async {
    final generation = ++_queueGeneration;
    _sourceQueue = List.unmodifiable(sources);
    _order =
        order ??
        (_shuffle
            ? PlaybackOrder.identity(sources.length).shuffled(0, random)
            : PlaybackOrder.identity(sources.length));
    final nextQueue = [for (final i in _order.indices) _sourceQueue[i]];
    _emit(
      LocalPlaybackState(
        playerState: LocalPlayerState.loading,
        queue: List.unmodifiable(nextQueue),
        currentIndex: initialIndex,
        processingState: LocalPlaybackProcessingState.loading,
      ),
    );

    final failure = await validator?.validate(nextQueue);
    if (_isDisposed || generation != _queueGeneration) return;
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
        : trackDurations[nextQueue[initialIndex].trackId];
    final restoredPosition = nextQueue.isEmpty
        ? Duration.zero
        : await positionCoordinator?.restore(
                path: nextQueue[initialIndex].path,
                duration: duration,
                fileModifiedAtMillis:
                    nextQueue[initialIndex].fileModifiedAtMillis,
              ) ??
              Duration.zero;
    if (_isDisposed || generation != _queueGeneration) return;
    _emit(
      LocalPlaybackState(
        playerState: nextQueue.isEmpty
            ? LocalPlayerState.idle
            : LocalPlayerState.ready,
        queue: List.unmodifiable(nextQueue),
        currentIndex: initialIndex,
        position: restoredPosition,
        duration: duration,
        bufferedPosition: restoredPosition,
        processingState: nextQueue.isEmpty
            ? LocalPlaybackProcessingState.idle
            : LocalPlaybackProcessingState.ready,
      ),
    );
  }

  @override
  Future<void> restoreQueue(PlaybackQueueRecoveryResult recovered) async {
    _shuffle = recovered.shuffleEnabled;
    _repeat = recovered.repeatMode;
    final order = PlaybackOrder(
      recovered.queueOrder.isEmpty
          ? List.generate(recovered.queue.length, (i) => i)
          : recovered.queueOrder,
    );
    await _loadQueue(
      List.generate(
        recovered.queue.length,
        (i) => recovered.queue[order.inverse[i]],
      ),
      order: order,
      initialIndex: recovered.currentIndex,
    );
  }

  @override
  Future<void> setShuffleEnabled(bool enabled) async {
    if (_isDisposed ||
        !playbackState.hasQueue ||
        playbackState.isBusy ||
        state == LocalPlayerState.error ||
        _shuffle == enabled) {
      return;
    }
    final original = playbackState.originalIndex;
    _order = enabled
        ? _order.shuffled(currentIndex, random)
        : PlaybackOrder.identity(queue.length);
    _shuffle = enabled;
    _emit(
      playbackState.copyWith(
        queue: List.unmodifiable([
          for (final i in _order.indices) _sourceQueue[i],
        ]),
        currentIndex: original == null
            ? queue.length
            : _order.inverse[original],
      ),
    );
  }

  @override
  Future<void> setRepeatMode(LocalRepeatMode mode) async {
    if (_isDisposed ||
        !playbackState.hasQueue ||
        playbackState.isBusy ||
        state == LocalPlayerState.error) {
      return;
    }
    _repeat = mode;
    _emit(playbackState);
  }

  /// Fake natural completion is explicit; manual next ignores repeat-one.
  Future<void> completeCurrent() async {
    if (state != LocalPlayerState.playing) return;
    _automaticTransitions++;
    if (_repeat == LocalRepeatMode.one) {
      await _saveCurrentPosition(force: true, completed: true);
      _emit(
        playbackState.copyWith(
          position: Duration.zero,
          bufferedPosition: Duration.zero,
        ),
      );
    } else {
      await next();
    }
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
        position: state == LocalPlayerState.completed
            ? Duration.zero
            : _playbackState.position,
        bufferedPosition: state == LocalPlayerState.completed
            ? Duration.zero
            : _playbackState.bufferedPosition,
        duration: trackDurations[queue[index].trackId],
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
    if (state == LocalPlayerState.error ||
        state == LocalPlayerState.completed) {
      return;
    }

    if (currentIndex < queue.length - 1 || _repeat == LocalRepeatMode.all) {
      await persistPosition();
      final nextIndex = (currentIndex + 1) % queue.length;
      _emit(
        _playbackState.copyWith(
          playerState: state == LocalPlayerState.playing
              ? LocalPlayerState.playing
              : state == LocalPlayerState.paused
              ? LocalPlayerState.paused
              : LocalPlayerState.ready,
          queue: queue,
          currentIndex: nextIndex,
          position: Duration.zero,
          bufferedPosition: Duration.zero,
          duration: trackDurations[queue[nextIndex].trackId],
          isSeeking: false,
          processingState: LocalPlaybackProcessingState.ready,
        ),
      );
    } else {
      await _saveCurrentPosition(force: true, completed: true);
      _emit(
        _playbackState.copyWith(
          playerState: LocalPlayerState.completed,
          queue: queue,
          currentIndex: queue.length,
          position: _playbackState.duration ?? _playbackState.position,
          duration: _playbackState.duration,
          bufferedPosition:
              _playbackState.duration ?? _playbackState.bufferedPosition,
          processingState: LocalPlaybackProcessingState.completed,
          isSeeking: false,
        ),
      );
    }
  }

  @override
  Future<void> previous() async {
    if (queue.isEmpty || state == LocalPlayerState.error) return;
    final index = state == LocalPlayerState.completed
        ? queue.length - 1
        : _playbackState.position >= const Duration(seconds: 3)
        ? currentIndex
        : currentIndex == 0 && _repeat == LocalRepeatMode.all
        ? queue.length - 1
        : (currentIndex - 1).clamp(0, queue.length - 1);
    await persistPosition();
    _emit(
      LocalPlaybackState(
        playerState: state == LocalPlayerState.playing
            ? LocalPlayerState.playing
            : state == LocalPlayerState.paused ||
                  state == LocalPlayerState.completed
            ? LocalPlayerState.paused
            : LocalPlayerState.ready,
        queue: queue,
        currentIndex: index,
        duration: trackDurations[queue[index].trackId],
        processingState: LocalPlaybackProcessingState.ready,
      ),
    );
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
    _playbackState = nextState.copyWith(
      shuffleEnabled: _shuffle,
      repeatMode: _repeat,
      queueOrder: _order.indices,
      automaticTransitions: _automaticTransitions,
    );
    _states.add(_playbackState);
  }
}
