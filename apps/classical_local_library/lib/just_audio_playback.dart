import 'dart:async';
import 'dart:math';

import 'package:audio_session/audio_session.dart';
import 'package:just_audio/just_audio.dart';

import 'local_playback.dart';
import 'playback_audio_session.dart';
import 'playback_position.dart';
import 'playback_order.dart';

/// Supplies an already decided permutation to the engine. Rebuilding widgets,
/// automatic loop boundaries and restoration must not reroll this order.
class QueueShuffleOrder extends ShuffleOrder {
  QueueShuffleOrder(this.plan);
  PlaybackOrder plan;
  final List<int> _indices = [];
  @override
  List<int> get indices => _indices;
  @override
  void shuffle({int? initialIndex}) {
    if (_indices.length == plan.indices.length) {
      _indices
        ..clear()
        ..addAll(plan.indices);
    }
  }

  @override
  void insert(int index, int count) {
    for (var i = 0; i < _indices.length; i++) {
      if (_indices[i] >= index) _indices[i] += count;
    }
    _indices.addAll(List.generate(count, (i) => index + i));
    shuffle();
  }

  @override
  void removeRange(int start, int end) {
    _indices.removeWhere((i) => i >= start && i < end);
    for (var i = 0; i < _indices.length; i++) {
      if (_indices[i] >= end) _indices[i] -= end - start;
    }
  }

  @override
  void clear() => _indices.clear();
}

class AudioSessionLocalPlaybackSession implements LocalPlaybackAudioSession {
  final StreamController<LocalAudioInterruptionEvent> _interruptions =
      StreamController<LocalAudioInterruptionEvent>.broadcast(sync: true);
  final StreamController<void> _becomingNoisy =
      StreamController<void>.broadcast(sync: true);
  final List<StreamSubscription<Object?>> _subscriptions = [];

  Future<void>? _configuration;
  bool _isDisposed = false;

  @override
  Stream<LocalAudioInterruptionEvent> get interruptionEvents =>
      _interruptions.stream;

  @override
  Stream<void> get becomingNoisyEvents => _becomingNoisy.stream;

  @override
  Future<void> configure() => _configuration ??= _configure();

  Future<void> _configure() async {
    final session = await AudioSession.instance;
    await session.configure(const AudioSessionConfiguration.music());
    if (_isDisposed) {
      return;
    }
    _subscriptions.add(
      session.interruptionEventStream.listen((event) {
        if (_isDisposed) {
          return;
        }
        _interruptions.add(
          LocalAudioInterruptionEvent(
            isBeginning: event.begin,
            type: switch (event.type) {
              AudioInterruptionType.pause => LocalAudioInterruptionType.pause,
              AudioInterruptionType.duck => LocalAudioInterruptionType.duck,
              AudioInterruptionType.unknown =>
                LocalAudioInterruptionType.unknown,
            },
          ),
        );
      }),
    );
    _subscriptions.add(
      session.becomingNoisyEventStream.listen((_) {
        if (!_isDisposed) {
          _becomingNoisy.add(null);
        }
      }),
    );
  }

  @override
  Future<void> dispose() async {
    if (_isDisposed) {
      return;
    }
    _isDisposed = true;
    for (final subscription in _subscriptions) {
      await subscription.cancel();
    }
    await _interruptions.close();
    await _becomingNoisy.close();
  }
}

class JustAudioLocalPlaybackController
    implements
        LocalPlaybackController,
        PlaybackMetadataUpdater,
        PlaybackModeController,
        PlaybackQueueEditor {
  JustAudioLocalPlaybackController({
    AudioPlayer? player,
    this.validator = const LocalPlaybackQueueValidator(),
    LocalPlaybackAudioSession? audioSession,
    this.positionCoordinator,
    this.interruptionPolicy = const LocalPlaybackInterruptionPolicy(),
    Random? random,
  }) : _player = player ?? AudioPlayer(handleInterruptions: false),
       random = random ?? Random(),
       _audioSession = audioSession ?? AudioSessionLocalPlaybackSession() {
    _subscriptions.add(_player.playerStateStream.listen(_handlePlayerState));
    _subscriptions.add(_player.currentIndexStream.listen(_handleCurrentIndex));
    _subscriptions.add(_player.positionStream.listen(_handlePosition));
    _subscriptions.add(_player.durationStream.listen(_handleDuration));
    _subscriptions.add(
      _player.bufferedPositionStream.listen(_handleBufferedPosition),
    );
    _subscriptions.add(_player.errorStream.listen(_handlePlayerError));
    _subscriptions.add(
      _player.positionDiscontinuityStream.listen((event) {
        if (event.reason != PositionDiscontinuityReason.autoAdvance ||
            !_hasLoadedSources ||
            _isDisposed) {
          return;
        }
        _automaticTransitions++;
        if (_playbackState.isChangingMode || _playbackState.isEditingQueue) {
          return;
        }
        if (event.previousEvent.currentIndex == _player.currentIndex) {
          unawaited(_saveCurrentPosition(force: true, completed: true));
        }
        _emit(_playbackState.copyWith(position: _player.position));
      }),
    );
    _subscriptions.add(
      _audioSession.interruptionEvents.listen(_handleInterruption),
    );
    _subscriptions.add(
      _audioSession.becomingNoisyEvents.listen((_) {
        if (interruptionPolicy.shouldPauseWhenBecomingNoisy()) {
          unawaited(_pauseForExternalEvent());
        }
      }),
    );
    _audioSessionReady = _audioSession.configure();
  }

  final AudioPlayer _player;
  final Random random;
  List<LocalPlaybackQueueItem> _sourceQueue = const [];
  List<String> _sourceTags = const [];
  int _nextOccurrence = 0;
  Future<void> _editTail = Future.value();
  PlaybackOrder _order = PlaybackOrder.identity(0);
  QueueShuffleOrder? _engineOrder;
  bool _shuffle = false;
  LocalRepeatMode _repeat = LocalRepeatMode.off;
  int _queueGeneration = 0, _automaticTransitions = 0;
  final LocalPlaybackAudioSession _audioSession;
  final LocalPlaybackQueueValidator validator;
  final PlaybackPositionCoordinator? positionCoordinator;
  final LocalPlaybackInterruptionPolicy interruptionPolicy;
  final StreamController<LocalPlaybackState> _states =
      StreamController<LocalPlaybackState>.broadcast(sync: true);
  final List<StreamSubscription<Object?>> _subscriptions = [];

  late final Future<void> _audioSessionReady;
  LocalPlaybackState _playbackState = const LocalPlaybackState.idle();
  Future<void> _seekTail = Future.value();
  bool _isDisposed = false;
  bool _hasLoadedSources = false;
  bool _skipNextIndexPositionSave = false;
  bool _restarting = false;

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

  @override
  Future<void> loadQueue(List<LocalPlaybackQueueItem> queue) =>
      _loadQueue(queue);

  Future<void> _loadQueue(
    List<LocalPlaybackQueueItem> sources, {
    PlaybackOrder? order,
    int initialIndex = 0,
    bool initializingEmptyQueue = false,
  }) async {
    final generation = initializingEmptyQueue
        ? _queueGeneration
        : ++_queueGeneration;
    _restarting = false;
    _hasLoadedSources = false;
    _sourceQueue = List.unmodifiable(sources);
    _sourceTags = [
      for (final _ in sources) '$_queueGeneration:${_nextOccurrence++}',
    ];
    _order =
        order ??
        (_shuffle
            ? PlaybackOrder.identity(sources.length).shuffled(0, random)
            : PlaybackOrder.identity(sources.length));
    _engineOrder = QueueShuffleOrder(_order);
    final immutableQueue = List<LocalPlaybackQueueItem>.unmodifiable([
      for (final i in _order.indices) sources[i],
    ]);
    _emit(
      LocalPlaybackState(
        playerState: LocalPlayerState.loading,
        queue: immutableQueue,
        currentIndex: initialIndex,
        processingState: LocalPlaybackProcessingState.loading,
      ),
    );

    final failure = await validator.validate(immutableQueue);
    if (_isDisposed || generation != _queueGeneration) return;
    if (failure != null) {
      _emitFailure(failure, queue: immutableQueue);
      return;
    }

    try {
      // A replacement supersedes an edit's result, but waits for any already
      // dispatched native mutation before installing the new sources.
      if (!initializingEmptyQueue) await _editTail;
      if (_isDisposed || generation != _queueGeneration) return;
      await _audioSessionReady;
      await _player.pause();
      await _player.setAudioSources(
        [
          for (var i = 0; i < sources.length; i++)
            AudioSource.uri(Uri.file(sources[i].path), tag: _sourceTags[i]),
        ],
        initialIndex: _order.indices[initialIndex],
        initialPosition: Duration.zero,
        shuffleOrder: _engineOrder,
      );
      await _player.setLoopMode(_loopMode(_repeat));
      await _player.setShuffleModeEnabled(_shuffle);
      if (_isDisposed || generation != _queueGeneration) return;
      _hasLoadedSources = true;
      final duration = _player.duration;
      final restoredPosition = await positionCoordinator?.restore(
        path: immutableQueue[initialIndex].path,
        duration: duration,
        fileModifiedAtMillis: immutableQueue[initialIndex].fileModifiedAtMillis,
      );
      if (restoredPosition != null && restoredPosition > Duration.zero) {
        await _player.seek(
          restoredPosition,
          index: _order.indices[initialIndex],
        );
      }
      if (_isDisposed || generation != _queueGeneration) return;
      _emit(
        LocalPlaybackState(
          playerState: LocalPlayerState.ready,
          queue: immutableQueue,
          currentIndex: initialIndex,
          position: restoredPosition ?? Duration.zero,
          duration: duration,
          bufferedPosition: _player.bufferedPosition,
          processingState: LocalPlaybackProcessingState.ready,
        ),
      );
    } on PlayerException catch (error) {
      if (_isDisposed || generation != _queueGeneration) return;
      _emitLoadFailure(error.message ?? error.code.toString(), immutableQueue);
    } on PlayerInterruptedException catch (error) {
      if (_isDisposed || generation != _queueGeneration) return;
      _emitLoadFailure(
        error.message ?? 'Audio loading was interrupted.',
        immutableQueue,
      );
    } on Object catch (error) {
      if (_isDisposed || generation != _queueGeneration) return;
      _emitLoadFailure(error.toString(), immutableQueue);
    }
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

  LoopMode _loopMode(LocalRepeatMode mode) => switch (mode) {
    LocalRepeatMode.off => LoopMode.off,
    LocalRepeatMode.all => LoopMode.all,
    LocalRepeatMode.one => LoopMode.one,
  };

  @override
  Future<void> enqueue(
    List<LocalPlaybackQueueItem> items, {
    bool next = false,
  }) {
    final copy = List<LocalPlaybackQueueItem>.unmodifiable(items);
    return _editQueue(() async {
      final available = await _availableAdditions(copy);
      if (available.isEmpty) return null;
      _reconcileBeforeEdit();
      return PlaybackQueueEditPlan.insert(
        _sourceQueue,
        _order,
        available,
        next && _playbackState.currentItem != null
            ? _playbackState.currentIndex + 1
            : _sourceQueue.length,
        _shuffle,
      );
    }, emptyAdditions: copy);
  }

  Future<void> _enqueueEmpty(List<LocalPlaybackQueueItem> items) async {
    if (_isDisposed || items.isEmpty) return;
    final generation = _queueGeneration;
    _emit(_playbackState.copyWith(isEditingQueue: true, queueEditError: null));
    try {
      final available = await _availableAdditions(items);
      if (_isDisposed || generation != _queueGeneration) return;
      final error = _playbackState.queueEditError;
      if (available.isNotEmpty) {
        await _loadQueue(
          available,
          order: PlaybackOrder.identity(available.length),
          initializingEmptyQueue: true,
        );
      }
      if (!_isDisposed && generation == _queueGeneration) {
        _emit(
          _playbackState.copyWith(isEditingQueue: false, queueEditError: error),
        );
      }
    } catch (_) {
      if (!_isDisposed && generation == _queueGeneration) {
        _emit(
          _playbackState.copyWith(
            isEditingQueue: false,
            queueEditError: '대기열을 추가하지 못했습니다. 다시 시도해 주세요.',
          ),
        );
      }
    }
  }

  Future<List<LocalPlaybackQueueItem>> _availableAdditions(
    List<LocalPlaybackQueueItem> items,
  ) async {
    final generation = _queueGeneration;
    final available = <LocalPlaybackQueueItem>[];
    for (final item in items) {
      if (await validator.validate([item]) == null) available.add(item);
      if (_isDisposed || generation != _queueGeneration) return [];
    }
    if (available.length != items.length) {
      _emit(
        _playbackState.copyWith(
          queueEditError:
              '재생할 수 없는 ${items.length - available.length}개 항목을 제외했습니다.',
        ),
      );
    }
    return available;
  }

  bool _upcoming(int index) {
    if (index > _playbackState.currentIndex && index < _sourceQueue.length) {
      return true;
    }
    _emit(
      _playbackState.copyWith(queueEditError: '현재 곡과 이전 재생 항목은 편집할 수 없습니다.'),
    );
    return false;
  }

  @override
  Future<void> removeQueueItem(int effectiveIndex) => _editQueue(
    () async => _upcoming(effectiveIndex)
        ? PlaybackQueueEditPlan.remove(_sourceQueue, _order, [effectiveIndex])
        : null,
  );
  @override
  Future<void> moveQueueItem(int from, int to) => _editQueue(
    () async => _upcoming(from) && _upcoming(to) && from != to
        ? PlaybackQueueEditPlan.move(_sourceQueue, _order, from, to, _shuffle)
        : null,
  );
  @override
  Future<void> clearUpcoming() => _editQueue(() async {
    final start = _playbackState.currentIndex + 1;
    return start >= _sourceQueue.length
        ? null
        : PlaybackQueueEditPlan.remove(
            _sourceQueue,
            _order,
            Iterable.generate(_sourceQueue.length - start, (i) => start + i),
          );
  });

  void _reconcileBeforeEdit() {
    if (_player.processingState == ProcessingState.completed) {
      if (_playbackState.playerState != LocalPlayerState.completed) {
        _emitCompleted();
      }
      return;
    }
    final index = _normalizedCurrentIndex;
    if (index != _playbackState.currentIndex &&
        _playbackState.playerState != LocalPlayerState.completed) {
      _emit(
        _playbackState.copyWith(
          currentIndex: index,
          position: _player.position,
          duration: _player.duration,
          bufferedPosition: _player.bufferedPosition,
        ),
      );
    }
  }

  Future<void> _editQueue(
    Future<PlaybackQueueEditPlan?> Function() prepare, {
    List<LocalPlaybackQueueItem>? emptyAdditions,
  }) {
    final generation = _queueGeneration;
    final pendingSeeks = _seekTail;
    final operation = _editTail.then((_) async {
      await pendingSeeks;
      if (_isDisposed ||
          generation != _queueGeneration ||
          _playbackState.isBusy ||
          _playbackState.failure != null) {
        return;
      }
      if (!_playbackState.hasQueue && emptyAdditions != null) {
        await _enqueueEmpty(emptyAdditions);
        return;
      }
      if (!_hasLoadedSources) return;
      _reconcileBeforeEdit();
      _emit(
        _playbackState.copyWith(isEditingQueue: true, queueEditError: null),
      );
      var nativeStarted = false;
      try {
        final plan = await prepare();
        if (_isDisposed || generation != _queueGeneration || plan == null) {
          return;
        }
        // Validation may have crossed a natural-next boundary. Indexed requests
        // can only touch occurrences still strictly after the live selection.
        _reconcileBeforeEdit();
        final tags = _sourceTags.toList();
        final addedTags = [
          for (final _ in plan.added) '$generation:${_nextOccurrence++}',
        ];
        if (plan.insertAt != null) tags.insertAll(plan.insertAt!, addedTags);
        for (final i in plan.removed.toList()..sort((a, b) => b.compareTo(a))) {
          tags.removeAt(i);
        }
        if (plan.moveFrom != null) {
          tags.insert(plan.moveTo!, tags.removeAt(plan.moveFrom!));
        }
        // Validate the entire live prefix by occurrence token, including both
        // endpoints of an order-only shuffled move. Item/track equality cannot
        // distinguish repeated occurrences here.
        final prefixLength =
            _playbackState.currentIndex +
            (_playbackState.currentItem == null ? 0 : 1);
        if (Iterable.generate(prefixLength).any(
          (i) =>
              i >= plan.order.indices.length ||
              _sourceTags[_order.indices[i]] != tags[plan.order.indices[i]],
        )) {
          _emit(
            _playbackState.copyWith(
              queueEditError: '재생 항목이 바뀌었습니다. 남은 대기열을 다시 확인해 주세요.',
            ),
          );
          return;
        }
        final completed =
            _playbackState.playerState == LocalPlayerState.completed;
        if (completed) await _player.pause();
        if (_isDisposed || generation != _queueGeneration) return;
        _engineOrder!.plan = plan.order;
        nativeStarted = true;
        if (plan.insertAt != null) {
          await _player.insertAudioSources(plan.insertAt!, [
            for (var i = 0; i < plan.added.length; i++)
              AudioSource.uri(Uri.file(plan.added[i].path), tag: addedTags[i]),
          ]);
        }
        if (_isDisposed || generation != _queueGeneration) return;
        // Descending ranges keep remaining canonical occurrence indexes stable.
        final removed = plan.removed.toList()..sort();
        while (removed.isNotEmpty) {
          final end = removed.removeLast();
          var start = end;
          while (removed.isNotEmpty && removed.last == start - 1) {
            start = removed.removeLast();
          }
          await _player.removeAudioSourceRange(start, end + 1);
          if (_isDisposed || generation != _queueGeneration) return;
        }
        if (plan.moveFrom != null) {
          await _player.moveAudioSource(plan.moveFrom!, plan.moveTo!);
        }
        if (_isDisposed || generation != _queueGeneration) return;
        await _player.shuffle();
        if (_isDisposed || generation != _queueGeneration) return;
        final prepareNew =
            plan.added.isNotEmpty &&
            (completed || _player.processingState == ProcessingState.completed);
        if (prepareNew) {
          await _player.pause();
          // Stop frees a terminal AVQueuePlayer before preparing the new item;
          // the edited sources remain installed (no full playlist reload).
          await _player.stop();
          if (_isDisposed || generation != _queueGeneration) return;
          await _player.seek(Duration.zero, index: plan.insertAt!);
          if (_isDisposed || generation != _queueGeneration) return;
          await _player.load();
          if (_isDisposed || generation != _queueGeneration) return;
        }
        final index = _player.currentIndex;
        if (index == null ||
            index < 0 ||
            index >= tags.length ||
            _player.sequence.length != tags.length ||
            List.generate(
              tags.length,
              (i) => i,
            ).any((i) => _player.sequence[i].tag != tags[i])) {
          throw StateError('Queue occurrence reconciliation failed');
        }
        _sourceQueue = plan.sources;
        _sourceTags = tags;
        _order = plan.order;
        _emit(
          _playbackState.copyWith(
            queue: plan.queue,
            currentIndex:
                !prepareNew &&
                    _player.processingState == ProcessingState.completed
                ? plan.sources.length
                : _order.inverse[index],
            playerState: prepareNew
                ? LocalPlayerState.ready
                : _player.processingState == ProcessingState.completed
                ? LocalPlayerState.completed
                : _player.playing
                ? LocalPlayerState.playing
                : _playbackState.playerState == LocalPlayerState.playing
                ? LocalPlayerState.paused
                : _playbackState.playerState,
            position: prepareNew ? Duration.zero : _player.position,
            duration: _player.duration,
            bufferedPosition: prepareNew
                ? Duration.zero
                : _player.bufferedPosition,
            processingState: prepareNew
                ? LocalPlaybackProcessingState.ready
                : _player.processingState == ProcessingState.completed
                ? LocalPlaybackProcessingState.completed
                : _player.processingState == ProcessingState.buffering
                ? LocalPlaybackProcessingState.buffering
                : _player.processingState == ProcessingState.ready
                ? LocalPlaybackProcessingState.ready
                : _playbackState.processingState,
            isEditingQueue: false,
          ),
        );
      } catch (_) {
        if (_isDisposed || generation != _queueGeneration) return;
        if (nativeStarted) {
          // just_audio mutates its Dart playlist before platform completion.
          // A rejected native command cannot be presented as a rollback: stop
          // further commands and require an explicit reload of a known queue.
          _hasLoadedSources = false;
          try {
            await _player.pause();
          } catch (_) {
            try {
              await _player.stop();
            } catch (_) {}
          }
          if (_isDisposed || generation != _queueGeneration) return;
          _emit(
            _playbackState.copyWith(
              playerState: LocalPlayerState.error,
              isEditingQueue: false,
              queueEditError: '대기열을 변경하지 못했습니다. 재생할 항목을 다시 선택해 주세요.',
              failure: const LocalPlaybackFailure(
                kind: LocalPlaybackFailureKind.loadFailed,
                userMessage: '대기열을 다시 불러와 주세요.',
              ),
            ),
          );
        } else {
          _emit(
            _playbackState.copyWith(
              queueEditError: '대기열을 변경하지 못했습니다. 다시 시도해 주세요.',
            ),
          );
        }
      } finally {
        if (!_isDisposed &&
            generation == _queueGeneration &&
            _playbackState.isEditingQueue) {
          _emit(_playbackState.copyWith(isEditingQueue: false));
        }
      }
    });
    _editTail = operation.then<void>((_) {}, onError: (_, _) {});
    return operation;
  }

  @override
  Future<void> setShuffleEnabled(bool enabled) async {
    if (_shuffle == enabled || !_canChangeMode) return;
    final previous = _order,
        oldShuffle = _shuffle,
        generation = _queueGeneration;
    final next = enabled
        ? _order.shuffled(_playbackState.currentIndex, random)
        : PlaybackOrder.identity(_sourceQueue.length);
    _emit(_playbackState.copyWith(isChangingMode: true, modeError: null));
    try {
      if (_playbackState.playerState == LocalPlayerState.completed) {
        await _player.pause();
      }
      _engineOrder!.plan = next;
      await _player.shuffle();
      await _player.setShuffleModeEnabled(enabled);
      if (_isDisposed || generation != _queueGeneration) return;
      _order = next;
      _shuffle = enabled;
      _finishModeChange();
    } catch (_) {
      if (_isDisposed || generation != _queueGeneration) return;
      try {
        _engineOrder!.plan = previous;
        await _player.shuffle();
        await _player.setShuffleModeEnabled(oldShuffle);
        _finishModeChange(error: '셔플을 변경하지 못했습니다. 다시 시도해 주세요.');
      } catch (_) {
        await _failModeRecovery();
      }
    }
  }

  @override
  Future<void> setRepeatMode(LocalRepeatMode mode) async {
    if (_repeat == mode || !_canChangeMode) return;
    final previous = _repeat, generation = _queueGeneration;
    _emit(_playbackState.copyWith(isChangingMode: true, modeError: null));
    try {
      if (_playbackState.playerState == LocalPlayerState.completed) {
        await _player.pause();
      }
      await _player.setLoopMode(_loopMode(mode));
      if (_isDisposed || generation != _queueGeneration) return;
      _repeat = mode;
      _finishModeChange();
    } catch (_) {
      if (_isDisposed || generation != _queueGeneration) return;
      try {
        await _player.setLoopMode(_loopMode(previous));
        _finishModeChange(error: '반복을 변경하지 못했습니다. 다시 시도해 주세요.');
      } catch (_) {
        await _failModeRecovery();
      }
    }
  }

  bool get _canChangeMode =>
      !_isDisposed &&
      _hasLoadedSources &&
      !_playbackState.isBusy &&
      _playbackState.failure == null;
  void _finishModeChange({String? error}) {
    final completed = _playbackState.playerState == LocalPlayerState.completed;
    final index = _player.currentIndex;
    _emit(
      _playbackState.copyWith(
        queue: List.unmodifiable([
          for (final i in _order.indices) _sourceQueue[i],
        ]),
        currentIndex: completed
            ? _sourceQueue.length
            : index == null
            ? _playbackState.currentIndex
            : _order.inverse[index],
        position: completed ? _playbackState.position : _player.position,
        duration: _player.duration,
        bufferedPosition: _player.bufferedPosition,
        isChangingMode: false,
        modeError: error,
      ),
    );
    if (!completed) _handlePlayerState(_player.playerState);
  }

  Future<void> _failModeRecovery() async {
    try {
      await _player.pause();
    } catch (_) {}
    _emitLoadFailure('Playback mode rollback failed', _playbackState.queue);
  }

  @override
  Future<void> play() async {
    if (_isDisposed ||
        !_hasLoadedSources ||
        _playbackState.isBusy ||
        _playbackState.queue.isEmpty ||
        _playbackState.playerState == LocalPlayerState.error) {
      return;
    }

    await _audioSessionReady;
    if (_playbackState.playerState == LocalPlayerState.completed) {
      _restarting = true;
      _emit(
        _playbackState.copyWith(
          playerState: LocalPlayerState.loading,
          processingState: LocalPlaybackProcessingState.loading,
        ),
      );
      // AVQueuePlayer can remain terminal after seeking a completed queue when
      // loop mode changes. Explicit play restarts its native resources while
      // retaining the same sources/order; mode toggles themselves never reload.
      await _player.stop();
      await _player.seek(Duration.zero, index: _order.indices[0]);
      _emit(
        _playbackState.copyWith(
          currentIndex: 0,
          position: Duration.zero,
          bufferedPosition: Duration.zero,
          duration: _player.duration,
          processingState: LocalPlaybackProcessingState.loading,
        ),
      );
    }
    unawaited(_playAndHandleErrors());
    // Read the engine after requesting play; never infer it from the command.
    // Stream delivery can lag this cached engine observation by a microtask.
    _handlePlayerState(_player.playerState);
  }

  @override
  Future<void> pause() async {
    if (_playbackState.playerState != LocalPlayerState.playing &&
        !_player.playing) {
      await persistPosition();
      return;
    }
    await _player.pause();
    _emitWith(playerState: LocalPlayerState.paused);
    await persistPosition();
  }

  @override
  Future<void> resume() => play();

  @override
  Future<void> next() async {
    if (_playbackState.queue.isEmpty ||
        _playbackState.playerState == LocalPlayerState.error ||
        _playbackState.playerState == LocalPlayerState.completed) {
      return;
    }

    if (_player.processingState == ProcessingState.completed) {
      _handlePlayerState(_player.playerState);
      return;
    }
    final index = _normalizedCurrentIndex, automatic = _automaticTransitions;
    if (index != _playbackState.currentIndex) {
      _handleCurrentIndex(_player.currentIndex);
      return;
    }
    await persistPosition();
    if (_isDisposed ||
        automatic != _automaticTransitions ||
        index != _normalizedCurrentIndex) {
      return;
    }
    if (index >= _playbackState.queue.length - 1 &&
        _repeat != LocalRepeatMode.all) {
      await _player.pause();
      await _saveCurrentPosition(force: true, completed: true);
      _emitCompleted();
      return;
    }

    await _moveTo((index + 1) % _playbackState.queue.length);
  }

  @override
  Future<void> previous() async {
    if (_playbackState.queue.isEmpty ||
        _playbackState.playerState == LocalPlayerState.error) {
      return;
    }
    final index = _playbackState.playerState == LocalPlayerState.completed
        ? _playbackState.queue.length - 1
        : _playbackState.position >= const Duration(seconds: 3)
        ? _normalizedCurrentIndex
        : _normalizedCurrentIndex == 0 && _repeat == LocalRepeatMode.all
        ? _sourceQueue.length - 1
        : (_normalizedCurrentIndex - 1).clamp(
            0,
            _playbackState.queue.length - 1,
          );
    await persistPosition();
    await _moveTo(index);
  }

  Future<void> _moveTo(int index) async {
    final queue = _playbackState.queue;
    final oldState = _playbackState.playerState;
    final keepPlaying = oldState == LocalPlayerState.playing;
    _skipNextIndexPositionSave = true;
    try {
      if (!keepPlaying) await _player.pause();
      await _player.seek(Duration.zero, index: _order.indices[index]);
      if (_isDisposed || !identical(queue, _playbackState.queue)) return;
      _emit(
        _playbackState.copyWith(
          playerState: _player.playing && keepPlaying
              ? LocalPlayerState.playing
              : oldState == LocalPlayerState.paused ||
                    oldState == LocalPlayerState.completed
              ? LocalPlayerState.paused
              : LocalPlayerState.ready,
          currentIndex: index,
          position: Duration.zero,
          bufferedPosition: Duration.zero,
          duration: _player.duration,
          processingState: LocalPlaybackProcessingState.ready,
          failure: null,
        ),
      );
    } on Object catch (error) {
      if (!_isDisposed && identical(queue, _playbackState.queue)) {
        _emitLoadFailure(error.toString(), queue);
      }
    } finally {
      _skipNextIndexPositionSave = false;
    }
  }

  @override
  Future<void> seek(Duration position) {
    final queue = _playbackState.queue;
    final item = _playbackState.currentItem;
    final original = _playbackState.originalIndex,
        automatic = _automaticTransitions;
    final pendingEdits = _editTail;
    final operation = _seekTail.then((_) async {
      await pendingEdits;
      if (!_isDisposed &&
          identical(queue, _playbackState.queue) &&
          original == _playbackState.originalIndex &&
          automatic == _automaticTransitions &&
          identical(item, _playbackState.currentItem)) {
        await _performSeek(position);
      }
    });
    _seekTail = operation.then<void>((_) {}, onError: (_, _) {});
    return operation;
  }

  Future<void> _performSeek(Duration position) async {
    if (!_hasLoadedSources || _playbackState.currentItem == null) {
      return;
    }
    final queue = _playbackState.queue;
    final item = _playbackState.currentItem;
    final original = _playbackState.originalIndex,
        automatic = _automaticTransitions;
    final normalized = const PlaybackPositionPolicy().normalizePosition(
      position,
      _playbackState.duration,
    );
    _emit(_playbackState.copyWith(isSeeking: true, position: normalized));
    try {
      await _player.seek(
        normalized,
        index: _order.indices[_normalizedCurrentIndex],
      );
      if (_isDisposed ||
          original != _playbackState.originalIndex ||
          automatic != _automaticTransitions ||
          !identical(queue, _playbackState.queue) ||
          !identical(item, _playbackState.currentItem)) {
        return;
      }
      _emit(
        _playbackState.copyWith(
          position: normalized,
          bufferedPosition: _playbackState.bufferedPosition < normalized
              ? normalized
              : _playbackState.bufferedPosition,
          isSeeking: false,
        ),
      );
    } on Object catch (error) {
      if (!_isDisposed &&
          original == _playbackState.originalIndex &&
          automatic == _automaticTransitions &&
          identical(queue, _playbackState.queue) &&
          identical(item, _playbackState.currentItem)) {
        _emitLoadFailure(error.toString(), queue);
      }
    }
  }

  @override
  Future<void> stop() async {
    if (_isDisposed) return;
    _restarting = false;
    if (!_hasLoadedSources && _playbackState.failure != null) {
      // Release native resources without treating an uncertain sequence as a
      // valid stopped queue. Only an explicit reload can clear this failure.
      try {
        await _player.stop();
      } catch (_) {}
      return;
    }
    if (_playbackState.queue.isEmpty) {
      _emit(const LocalPlaybackState.idle());
      return;
    }

    await persistPosition();
    if (_hasLoadedSources) {
      await _player.stop();
      await _player.seek(Duration.zero, index: _order.indices[0]);
    }
    _emit(
      LocalPlaybackState(
        playerState: LocalPlayerState.stopped,
        queue: _playbackState.queue,
        currentIndex: 0,
        duration: _hasLoadedSources ? _player.duration : null,
        processingState: _hasLoadedSources
            ? LocalPlaybackProcessingState.ready
            : LocalPlaybackProcessingState.idle,
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
    _queueGeneration++;
    await persistPosition();
    await positionCoordinator?.flush();
    for (final subscription in _subscriptions) {
      await subscription.cancel();
    }
    await _audioSession.dispose();
    await _player.dispose();
    await _states.close();
  }

  int get _normalizedCurrentIndex {
    final index = _player.currentIndex;
    return index != null && index >= 0 && index < _order.inverse.length
        ? _order.inverse[index]
        : _playbackState.currentIndex.clamp(0, _playbackState.queue.length - 1);
  }

  Future<void> _playAndHandleErrors() async {
    final generation = _queueGeneration;
    try {
      await _player.play();
    } on PlayerException catch (error) {
      if (!_isDisposed && generation == _queueGeneration) {
        _emitLoadFailure(
          error.message ?? error.code.toString(),
          _playbackState.queue,
        );
      }
    } on PlayerInterruptedException catch (error) {
      if (!_isDisposed && generation == _queueGeneration) {
        _emitLoadFailure(
          error.message ?? 'Audio playback was interrupted.',
          _playbackState.queue,
        );
      }
    } on Object catch (error) {
      if (!_isDisposed && generation == _queueGeneration) {
        _emitLoadFailure(error.toString(), _playbackState.queue);
      }
    }
  }

  void _handlePlayerState(PlayerState playerState) {
    if (_restarting &&
        playerState.processingState == ProcessingState.completed) {
      return;
    }
    if (_playbackState.playerState == LocalPlayerState.completed &&
        !playerState.playing &&
        playerState.processingState != ProcessingState.completed) {
      return;
    }
    if (!_hasLoadedSources ||
        _playbackState.queue.isEmpty ||
        _playbackState.isChangingMode ||
        _playbackState.isEditingQueue ||
        _playbackState.playerState == LocalPlayerState.error) {
      return;
    }

    switch (playerState.processingState) {
      case ProcessingState.loading:
        _emitWith(
          playerState: LocalPlayerState.loading,
          processingState: LocalPlaybackProcessingState.loading,
        );
      case ProcessingState.buffering:
        _emitWith(processingState: LocalPlaybackProcessingState.buffering);
      case ProcessingState.completed:
        if (_playbackState.playerState == LocalPlayerState.completed) return;
        _automaticTransitions++;
        unawaited(_saveCurrentPosition(force: true, completed: true));
        _emitCompleted();
      case ProcessingState.ready:
        _restarting = false;
        _emitWith(
          playerState: playerState.playing
              ? LocalPlayerState.playing
              : _playbackState.playerState == LocalPlayerState.loading
              ? LocalPlayerState.ready
              : _playbackState.playerState == LocalPlayerState.playing
              ? LocalPlayerState.paused
              : null,
          processingState: LocalPlaybackProcessingState.ready,
        );
      case ProcessingState.idle:
        _emitWith(processingState: LocalPlaybackProcessingState.idle);
    }
  }

  void _handleCurrentIndex(int? sourceIndex) {
    if (sourceIndex == null ||
        sourceIndex < 0 ||
        sourceIndex >= _order.inverse.length ||
        sourceIndex != _player.currentIndex ||
        (_playbackState.isChangingMode || _playbackState.isEditingQueue)) {
      return;
    }
    final index = _order.inverse[sourceIndex];
    if (!_hasLoadedSources ||
        _playbackState.queue.isEmpty ||
        index < 0 ||
        index >= _playbackState.queue.length ||
        _playbackState.playerState == LocalPlayerState.completed ||
        _playbackState.playerState == LocalPlayerState.error ||
        index == _playbackState.currentIndex) {
      return;
    }
    if (_skipNextIndexPositionSave) {
      _skipNextIndexPositionSave = false;
    } else {
      unawaited(_saveCurrentPosition(force: true));
    }
    _emit(
      _playbackState.copyWith(
        currentIndex: index,
        position: Duration.zero,
        bufferedPosition: Duration.zero,
        duration: null,
        isSeeking: false,
        failure: null,
      ),
    );
  }

  void _handlePosition(Duration position) {
    if (!_isCurrentPlayerIndex || _playbackState.isSeeking) {
      return;
    }
    final normalized = const PlaybackPositionPolicy().normalizePosition(
      position,
      _playbackState.duration,
    );
    if (normalized.inSeconds == _playbackState.normalizedPosition.inSeconds) {
      return;
    }
    _emit(_playbackState.copyWith(position: normalized));
    unawaited(_saveCurrentPosition());
  }

  void _handleDuration(Duration? duration) {
    if (!_isCurrentPlayerIndex ||
        duration != _player.duration ||
        duration == _playbackState.duration) {
      return;
    }
    _emit(
      _playbackState.copyWith(
        duration: duration,
        position: const PlaybackPositionPolicy().normalizePosition(
          _playbackState.position,
          duration,
        ),
      ),
    );
  }

  void _handleBufferedPosition(Duration bufferedPosition) {
    if (!_isCurrentPlayerIndex ||
        bufferedPosition.inSeconds ==
            _playbackState.normalizedBufferedPosition.inSeconds) {
      return;
    }
    _emit(_playbackState.copyWith(bufferedPosition: bufferedPosition));
  }

  bool get _isCurrentPlayerIndex {
    final item = _playbackState.currentItem;
    final sequence = _player.sequence;
    final index = _player.currentIndex;
    return _hasLoadedSources &&
        item != null &&
        !_playbackState.isChangingMode &&
        !_playbackState.isEditingQueue &&
        index != null &&
        index < sequence.length &&
        sequence[index].tag ==
            _sourceTags[_order.indices[_playbackState.currentIndex]] &&
        _normalizedCurrentIndex == _playbackState.currentIndex;
  }

  void _handleInterruption(LocalAudioInterruptionEvent event) {
    if (interruptionPolicy.shouldPauseForInterruption(event)) {
      unawaited(_pauseForExternalEvent());
    }
  }

  Future<void> _pauseForExternalEvent() async {
    if (_playbackState.playerState == LocalPlayerState.playing ||
        _player.playing) {
      await pause();
    }
  }

  void _handlePlayerError(PlayerException error) {
    if (!_hasLoadedSources ||
        _isDisposed ||
        (error.index != null && error.index != _player.currentIndex)) {
      return;
    }
    _emitLoadFailure(
      error.message ?? error.code.toString(),
      _playbackState.queue,
    );
  }

  Future<void> _saveCurrentPosition({
    bool force = false,
    bool completed = false,
  }) async {
    final item = _playbackState.currentItem;
    final coordinator = positionCoordinator;
    if (item == null || coordinator == null) {
      return;
    }
    try {
      await coordinator.record(
        path: item.path,
        position: _playbackState.normalizedPosition,
        duration: _playbackState.duration,
        fileModifiedAtMillis: item.fileModifiedAtMillis,
        completed: completed,
        force: force,
      );
    } on Object {
      // Position persistence must never interrupt audio playback.
    }
  }

  void _emitCompleted() {
    final duration = _playbackState.duration;
    _emit(
      _playbackState.copyWith(
        playerState: LocalPlayerState.completed,
        currentIndex: _playbackState.queue.length,
        position: duration ?? _playbackState.position,
        bufferedPosition: duration ?? _playbackState.bufferedPosition,
        isSeeking: false,
        processingState: LocalPlaybackProcessingState.completed,
      ),
    );
  }

  void _emitLoadFailure(
    String technicalMessage,
    List<LocalPlaybackQueueItem> queue,
  ) {
    final currentPath = _playbackState.currentItem?.path;
    _emitFailure(
      LocalPlaybackFailure(
        kind: LocalPlaybackFailureKind.loadFailed,
        userMessage: '오디오 파일을 불러오지 못했습니다.',
        path: currentPath,
        technicalMessage: technicalMessage,
      ),
      queue: queue,
    );
  }

  void _emitFailure(
    LocalPlaybackFailure failure, {
    required List<LocalPlaybackQueueItem> queue,
  }) {
    _emit(
      LocalPlaybackState(
        playerState: LocalPlayerState.error,
        queue: queue,
        currentIndex: _playbackState.currentIndex,
        processingState: LocalPlaybackProcessingState.idle,
        failure: failure,
      ),
    );
  }

  void _emitWith({
    LocalPlayerState? playerState,
    int? currentIndex,
    LocalPlaybackProcessingState? processingState,
  }) {
    _emit(
      _playbackState.copyWith(
        playerState: playerState,
        currentIndex: currentIndex ?? _normalizedCurrentIndex,
        processingState: processingState,
      ),
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
