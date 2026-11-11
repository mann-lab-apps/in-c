import 'dart:async';

import 'package:just_audio/just_audio.dart';

/// Native boundary double, not a decoder or physical playback assertion.
class ModeAudioPlayer implements AudioPlayer {
  final _states = StreamController<PlayerState>.broadcast(sync: true);
  final _indexes = StreamController<int?>.broadcast(sync: true);
  final _positions = StreamController<Duration>.broadcast(sync: true);
  final _durations = StreamController<Duration?>.broadcast(sync: true);
  final _buffers = StreamController<Duration>.broadcast(sync: true);
  final _errors = StreamController<PlayerException>.broadcast(sync: true);
  final _discontinuities = StreamController<PositionDiscontinuity>.broadcast(
    sync: true,
  );
  int sourceLoads = 0, prepares = 0, failLoopCount = 0, failShuffleCount = 0;
  Completer<void>? loopGate, seekGate;
  Completer<void>? editGate;
  Completer<void>? stopGate;
  int sourceEdits = 0, failEditCount = 0, seeks = 0;
  int? failEditNumber;
  int failPrepareCount = 0;
  int failShuffleOrderCount = 0, failPauseCount = 0;
  int stops = 0, failStopCount = 0;
  bool disposed = false;
  ShuffleOrder? order;
  @override
  List<IndexedAudioSource> sequence = [];
  @override
  int? currentIndex;
  @override
  bool playing = false;
  @override
  Duration position = Duration.zero;
  @override
  Duration? duration = const Duration(seconds: 10);
  @override
  Duration bufferedPosition = Duration.zero;
  @override
  ProcessingState processingState = ProcessingState.idle;
  @override
  LoopMode loopMode = LoopMode.off;
  @override
  bool shuffleModeEnabled = false;
  @override
  List<int> get shuffleIndices => order?.indices.toList() ?? [];
  @override
  List<int> get effectiveIndices => shuffleModeEnabled
      ? shuffleIndices
      : List.generate(sequence.length, (i) => i);
  @override
  PlayerState get playerState => PlayerState(playing, processingState);
  @override
  Stream<PlayerState> get playerStateStream => _states.stream;
  @override
  Stream<int?> get currentIndexStream => _indexes.stream;
  @override
  Stream<Duration> get positionStream => _positions.stream;
  @override
  Stream<Duration?> get durationStream => _durations.stream;
  @override
  Stream<Duration> get bufferedPositionStream => _buffers.stream;
  @override
  Stream<PlayerException> get errorStream => _errors.stream;
  @override
  Stream<PositionDiscontinuity> get positionDiscontinuityStream =>
      _discontinuities.stream;
  @override
  Future<Duration?> setAudioSources(
    List<AudioSource> sources, {
    bool preload = true,
    int? initialIndex,
    Duration? initialPosition,
    ShuffleOrder? shuffleOrder,
  }) async {
    sourceLoads++;
    sequence = sources.cast<IndexedAudioSource>();
    currentIndex = initialIndex ?? 0;
    position = initialPosition ?? Duration.zero;
    order = shuffleOrder;
    order?.clear();
    order?.insert(0, sequence.length);
    order?.shuffle(initialIndex: currentIndex);
    processingState = ProcessingState.ready;
    _states.add(playerState);
    return duration;
  }

  @override
  Future<void> shuffle() async {
    order?.shuffle(initialIndex: currentIndex);
    if (failShuffleOrderCount-- > 0) {
      throw StateError('/private/fixture/shuffle-order');
    }
  }

  Future<void> _finishEdit() async {
    sourceEdits++;
    await editGate?.future;
    if (failEditCount-- > 0 || sourceEdits == failEditNumber) {
      throw StateError('/private/fixture/edit-failure');
    }
  }

  @override
  Future<Duration?> load() async {
    prepares++;
    if (failPrepareCount-- > 0) throw StateError('/private/fixture/prepare');
    processingState = ProcessingState.ready;
    _states.add(playerState);
    return duration;
  }

  @override
  Future<void> insertAudioSources(int index, List<AudioSource> sources) async {
    final selected = currentIndex == null ? null : sequence[currentIndex!];
    sequence = sequence.toList()
      ..insertAll(index, sources.cast<IndexedAudioSource>());
    order?.insert(index, sources.length);
    if (selected != null) currentIndex = sequence.indexOf(selected);
    await _finishEdit();
  }

  @override
  Future<void> removeAudioSourceRange(int start, int end) async {
    final selected = currentIndex == null ? null : sequence[currentIndex!];
    sequence = sequence.toList()..removeRange(start, end);
    order?.removeRange(start, end);
    if (selected != null) currentIndex = sequence.indexOf(selected);
    await _finishEdit();
  }

  @override
  Future<void> moveAudioSource(int from, int to) async {
    final selected = sequence[currentIndex!];
    sequence = sequence.toList();
    sequence.insert(to, sequence.removeAt(from));
    order?.removeRange(from, from + 1);
    order?.insert(to, 1);
    currentIndex = sequence.indexOf(selected);
    await _finishEdit();
  }

  @override
  Future<void> setShuffleModeEnabled(bool enabled) async {
    shuffleModeEnabled = enabled;
    if (failShuffleCount-- > 0) throw StateError('/private/fixture/failure');
  }

  @override
  Future<void> setLoopMode(LoopMode mode) async {
    loopMode = mode;
    await loopGate?.future;
    if (failLoopCount-- > 0) throw StateError('/private/fixture/failure');
  }

  @override
  Future<void> play() async {
    playing = true;
    processingState = ProcessingState.ready;
    _states.add(playerState);
  }

  @override
  Future<void> pause() async {
    if (failPauseCount-- > 0) throw StateError('/private/fixture/pause');
    playing = false;
    if (!disposed) _states.add(playerState);
  }

  @override
  Future<void> stop() async {
    stops++;
    await stopGate?.future;
    if (failStopCount-- > 0) throw StateError('/private/fixture/stop');
    playing = false;
    processingState = ProcessingState.idle;
    _states.add(playerState);
  }

  @override
  Future<void> seek(Duration? target, {int? index}) async {
    if (disposed) return;
    seeks++;
    currentIndex = index ?? currentIndex;
    position = target ?? Duration.zero;
    // Seeking an inactive player stores the selection without loading decoders.
    if (processingState != ProcessingState.idle) {
      processingState = ProcessingState.ready;
    }
    _indexes.add(currentIndex);
    _positions.add(position);
    _states.add(playerState);
    await seekGate?.future;
  }

  void advance() {
    final previous = PlaybackEvent(
      currentIndex: currentIndex,
      updatePosition: duration!,
    );
    final index = effectiveIndices.indexOf(currentIndex!);
    if (loopMode == LoopMode.one) {
      position = Duration.zero;
    } else if (index + 1 < sequence.length || loopMode == LoopMode.all) {
      currentIndex = effectiveIndices[(index + 1) % sequence.length];
      position = Duration.zero;
      _indexes.add(currentIndex);
    } else {
      processingState = ProcessingState.completed;
      position = duration!;
      _states.add(playerState);
      return;
    }
    _discontinuities.add(
      PositionDiscontinuity(
        PositionDiscontinuityReason.autoAdvance,
        previous,
        PlaybackEvent(currentIndex: currentIndex, updatePosition: position),
      ),
    );
    _positions.add(position);
  }

  @override
  Future<void> dispose() async {
    disposed = true;
    await Future.wait([
      _states.close(),
      _indexes.close(),
      _positions.close(),
      _durations.close(),
      _buffers.close(),
      _errors.close(),
      _discontinuities.close(),
    ]);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
