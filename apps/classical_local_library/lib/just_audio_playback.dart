import 'dart:async';

import 'package:audio_session/audio_session.dart';
import 'package:just_audio/just_audio.dart';

import 'local_playback.dart';
import 'playback_audio_session.dart';
import 'playback_position.dart';

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

class JustAudioLocalPlaybackController implements LocalPlaybackController {
  JustAudioLocalPlaybackController({
    AudioPlayer? player,
    this.validator = const LocalPlaybackQueueValidator(),
    LocalPlaybackAudioSession? audioSession,
    this.positionCoordinator,
    this.interruptionPolicy = const LocalPlaybackInterruptionPolicy(),
  }) : _player = player ?? AudioPlayer(handleInterruptions: false),
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

  @override
  LocalPlaybackState get playbackState => _playbackState;

  @override
  Stream<LocalPlaybackState> get states => _states.stream;

  @override
  Future<void> loadQueue(List<LocalPlaybackQueueItem> queue) async {
    _hasLoadedSources = false;
    final immutableQueue = List<LocalPlaybackQueueItem>.unmodifiable(queue);
    _emit(
      LocalPlaybackState(
        playerState: LocalPlayerState.loading,
        queue: immutableQueue,
        currentIndex: 0,
        processingState: LocalPlaybackProcessingState.loading,
      ),
    );

    final failure = await validator.validate(queue);
    if (failure != null) {
      _emitFailure(failure, queue: immutableQueue);
      return;
    }

    try {
      await _audioSessionReady;
      await _player.setAudioSources(
        [
          for (final item in queue)
            AudioSource.uri(Uri.file(item.path), tag: item.trackId),
        ],
        initialIndex: 0,
        initialPosition: Duration.zero,
      );
      _hasLoadedSources = true;
      final duration = _player.duration;
      final restoredPosition = await positionCoordinator?.restore(
        path: queue.first.path,
        duration: duration,
        fileModifiedAtMillis: queue.first.fileModifiedAtMillis,
      );
      if (restoredPosition != null && restoredPosition > Duration.zero) {
        await _player.seek(restoredPosition, index: 0);
      }
      _emit(
        LocalPlaybackState(
          playerState: LocalPlayerState.ready,
          queue: immutableQueue,
          currentIndex: 0,
          position: restoredPosition ?? Duration.zero,
          duration: duration,
          bufferedPosition: _player.bufferedPosition,
          processingState: LocalPlaybackProcessingState.ready,
        ),
      );
    } on PlayerException catch (error) {
      _emitLoadFailure(error.message ?? error.code.toString(), immutableQueue);
    } on PlayerInterruptedException catch (error) {
      _emitLoadFailure(
        error.message ?? 'Audio loading was interrupted.',
        immutableQueue,
      );
    } on Object catch (error) {
      _emitLoadFailure(error.toString(), immutableQueue);
    }
  }

  @override
  Future<void> play() async {
    if (_playbackState.queue.isEmpty ||
        _playbackState.playerState == LocalPlayerState.error) {
      return;
    }

    await _audioSessionReady;
    if (_playbackState.playerState == LocalPlayerState.completed) {
      await _player.seek(Duration.zero, index: 0);
      _emit(
        _playbackState.copyWith(
          currentIndex: 0,
          position: Duration.zero,
          bufferedPosition: Duration.zero,
          duration: _player.duration,
          processingState: LocalPlaybackProcessingState.ready,
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

    final index = _normalizedCurrentIndex;
    await persistPosition();
    if (index >= _playbackState.queue.length - 1) {
      await _player.pause();
      await _saveCurrentPosition(force: true, completed: true);
      _emitCompleted();
      return;
    }

    await _moveTo(index + 1);
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
      await _player.seek(Duration.zero, index: index);
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
    final operation = _seekTail.then((_) async {
      if (identical(queue, _playbackState.queue) &&
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
    final normalized = const PlaybackPositionPolicy().normalizePosition(
      position,
      _playbackState.duration,
    );
    _emit(_playbackState.copyWith(isSeeking: true, position: normalized));
    try {
      await _player.seek(normalized, index: _normalizedCurrentIndex);
      if (_isDisposed ||
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
          identical(queue, _playbackState.queue) &&
          identical(item, _playbackState.currentItem)) {
        _emitLoadFailure(error.toString(), queue);
      }
    }
  }

  @override
  Future<void> stop() async {
    if (_playbackState.queue.isEmpty) {
      _emit(const LocalPlaybackState.idle());
      return;
    }

    await persistPosition();
    if (_hasLoadedSources) {
      await _player.stop();
      await _player.seek(Duration.zero, index: 0);
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
    await persistPosition();
    await positionCoordinator?.flush();
    _isDisposed = true;
    for (final subscription in _subscriptions) {
      await subscription.cancel();
    }
    await _audioSession.dispose();
    await _player.dispose();
    await _states.close();
  }

  int get _normalizedCurrentIndex {
    final index = _player.currentIndex ?? _playbackState.currentIndex;
    return index.clamp(0, _playbackState.queue.length - 1);
  }

  Future<void> _playAndHandleErrors() async {
    final queue = _playbackState.queue;
    try {
      await _player.play();
    } on PlayerException catch (error) {
      if (!_isDisposed && identical(queue, _playbackState.queue)) {
        _emitLoadFailure(error.message ?? error.code.toString(), queue);
      }
    } on PlayerInterruptedException catch (error) {
      if (!_isDisposed && identical(queue, _playbackState.queue)) {
        _emitLoadFailure(
          error.message ?? 'Audio playback was interrupted.',
          queue,
        );
      }
    } on Object catch (error) {
      if (!_isDisposed && identical(queue, _playbackState.queue)) {
        _emitLoadFailure(error.toString(), queue);
      }
    }
  }

  void _handlePlayerState(PlayerState playerState) {
    if (!_hasLoadedSources ||
        _playbackState.queue.isEmpty ||
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
        unawaited(_saveCurrentPosition(force: true, completed: true));
        _emitCompleted();
      case ProcessingState.ready:
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

  void _handleCurrentIndex(int? index) {
    if (!_hasLoadedSources ||
        index == null ||
        _playbackState.queue.isEmpty ||
        index < 0 ||
        index >= _playbackState.queue.length ||
        index != _player.currentIndex ||
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
    if (!_isCurrentPlayerIndex || duration == _playbackState.duration) {
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
        index != null &&
        index < sequence.length &&
        sequence[index].tag == item.trackId &&
        _player.currentIndex == _playbackState.currentIndex;
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
    _playbackState = nextState;
    _states.add(nextState);
  }
}
