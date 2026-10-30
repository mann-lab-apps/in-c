import 'dart:async';
import 'dart:math';

import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/playback_state_trace.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const seeds = [20261019, 20261020, 20261021];

  for (final seed in seeds) {
    test('FakeLocalPlayer follows reference model for seed=$seed', () async {
      final random = Random(seed);
      for (var scenario = 0; scenario < 16; scenario += 1) {
        final player = FakeLocalPlayer(
          validator: LocalPlaybackQueueValidator(
            fileProbe: _SyntheticFileProbe(),
          ),
          trackDurations: _durations,
        );
        final model = _ReferencePlaybackModel();
        final trace = PlaybackStateTrace();
        final commands = <_PlaybackCommand>[
          ..._scenarioPrelude(scenario),
          for (var index = 0; index < 24; index += 1) _randomCommand(random),
        ];

        for (var index = 0; index < commands.length; index += 1) {
          final command = commands[index];
          await _applyToPlayer(player, command);
          model.apply(command);
          trace.record(command.description, player.playbackState);

          expect(
            _snapshot(player.playbackState),
            model.snapshot,
            reason:
                'seed=$seed scenario=$scenario commandIndex=$index '
                'command=${command.description}\n${trace.diagnosticText}',
          );
          _expectPlaybackInvariants(
            player.playbackState,
            command: command,
            reason:
                'seed=$seed scenario=$scenario commandIndex=$index '
                'command=${command.description}\n${trace.diagnosticText}',
          );
        }
        await player.dispose();
      }
    });
  }

  test('dispose is idempotent and ignores subsequent commands', () async {
    final player = FakeLocalPlayer(trackDurations: _durations);
    final trace = PlaybackStateTrace();
    await player.loadQueue(_threeItemQueue);
    await player.play();
    trace.record('play', player.playbackState);
    final beforeDispose = _snapshot(player.playbackState);
    var postDisposeEvents = 0;
    final subscription = player.states.listen((_) {
      postDisposeEvents += 1;
    });

    await player.dispose();
    await player.dispose();
    await player.pause();
    await player.seek(const Duration(seconds: 1));
    await player.stop();

    expect(
      _snapshot(player.playbackState),
      beforeDispose,
      reason: trace.diagnosticText,
    );
    expect(postDisposeEvents, 0, reason: trace.diagnosticText);
    await subscription.cancel();
  });

  test('pending queue validation cannot emit after dispose', () async {
    final probe = _PendingFileProbe();
    final player = FakeLocalPlayer(
      validator: LocalPlaybackQueueValidator(fileProbe: probe),
      trackDurations: _durations,
    );
    final events = <LocalPlaybackState>[];
    final subscription = player.states.listen(events.add);

    final pendingLoad = player.loadQueue(_oneItemQueue);
    expect(player.playbackState.playerState, LocalPlayerState.loading);
    await player.dispose();
    final eventCountAtDispose = events.length;
    probe.complete(true);
    await pendingLoad;

    expect(events, hasLength(eventCountAtDispose));
    expect(player.playbackState.playerState, LocalPlayerState.loading);
    await subscription.cancel();
  });
}

const _durations = {
  'track-1': Duration(seconds: 2),
  'track-2': Duration(seconds: 3),
  'track-3': Duration(seconds: 4),
  'missing-track': Duration(seconds: 5),
};

const _track1 = LocalPlaybackQueueItem(
  trackId: 'track-1',
  recordingId: 'synthetic-recording',
  workId: 'synthetic-work',
  displayTitle: 'track-1',
  path: '/synthetic/track-1.wav',
  usesLinkedFile: true,
  workTitle: 'synthetic-work',
  recordingTitle: 'synthetic-recording',
);
const _track2 = LocalPlaybackQueueItem(
  trackId: 'track-2',
  recordingId: 'synthetic-recording',
  workId: 'synthetic-work',
  displayTitle: 'track-2',
  path: '/synthetic/track-2.wav',
  usesLinkedFile: true,
  workTitle: 'synthetic-work',
  recordingTitle: 'synthetic-recording',
);
const _track3 = LocalPlaybackQueueItem(
  trackId: 'track-3',
  recordingId: 'synthetic-recording',
  workId: 'synthetic-work',
  displayTitle: 'track-3',
  path: '/synthetic/track-3.wav',
  usesLinkedFile: true,
  workTitle: 'synthetic-work',
  recordingTitle: 'synthetic-recording',
);
const _missingTrack = LocalPlaybackQueueItem(
  trackId: 'missing-track',
  recordingId: 'synthetic-recording',
  workId: 'synthetic-work',
  displayTitle: 'missing-track',
  path: '/synthetic/missing-track.wav',
  usesLinkedFile: true,
  workTitle: 'synthetic-work',
  recordingTitle: 'synthetic-recording',
);
const _oneItemQueue = [_track1];
const _threeItemQueue = [_track1, _track2, _track3];
const _missingQueue = [_missingTrack];

class _SyntheticFileProbe extends LocalPlaybackFileProbe {
  @override
  Future<bool> exists(String path) async => !path.contains('missing');
}

class _PendingFileProbe extends LocalPlaybackFileProbe {
  final Completer<bool> _result = Completer<bool>();

  void complete(bool exists) => _result.complete(exists);

  @override
  Future<bool> exists(String path) => _result.future;
}

enum _CommandKind { load, play, pause, resume, next, stop, seek }

class _PlaybackCommand {
  const _PlaybackCommand(this.kind, {this.queue = const [], this.position});

  final _CommandKind kind;
  final List<LocalPlaybackQueueItem> queue;
  final Duration? position;

  String get description => switch (kind) {
    _CommandKind.load => 'load(${queue.map((item) => item.trackId).join(',')})',
    _CommandKind.seek => 'seek(${position!.inMilliseconds})',
    _ => kind.name,
  };
}

List<_PlaybackCommand> _scenarioPrelude(int scenario) {
  return switch (scenario % 6) {
    0 => const [
      _PlaybackCommand(_CommandKind.load),
      _PlaybackCommand(_CommandKind.play),
      _PlaybackCommand(_CommandKind.stop),
    ],
    1 => const [
      _PlaybackCommand(_CommandKind.load, queue: _oneItemQueue),
      _PlaybackCommand(_CommandKind.play),
      _PlaybackCommand(_CommandKind.next),
      _PlaybackCommand(_CommandKind.next),
    ],
    2 => const [
      _PlaybackCommand(_CommandKind.load, queue: _threeItemQueue),
      _PlaybackCommand(_CommandKind.play),
      _PlaybackCommand(_CommandKind.pause),
      _PlaybackCommand(_CommandKind.resume),
      _PlaybackCommand(_CommandKind.pause),
    ],
    3 => const [
      _PlaybackCommand(_CommandKind.load, queue: _oneItemQueue),
      _PlaybackCommand(_CommandKind.seek, position: Duration(seconds: -1)),
      _PlaybackCommand(_CommandKind.seek, position: Duration(seconds: 1)),
      _PlaybackCommand(_CommandKind.seek, position: Duration(seconds: 9)),
    ],
    4 => const [
      _PlaybackCommand(_CommandKind.load, queue: _threeItemQueue),
      _PlaybackCommand(_CommandKind.play),
      _PlaybackCommand(_CommandKind.load, queue: _oneItemQueue),
      _PlaybackCommand(_CommandKind.play),
    ],
    _ => const [
      _PlaybackCommand(_CommandKind.load, queue: _missingQueue),
      _PlaybackCommand(_CommandKind.play),
      _PlaybackCommand(_CommandKind.stop),
      _PlaybackCommand(_CommandKind.load, queue: _oneItemQueue),
    ],
  };
}

_PlaybackCommand _randomCommand(Random random) {
  final kind = _CommandKind.values[random.nextInt(_CommandKind.values.length)];
  if (kind == _CommandKind.load) {
    final queues = <List<LocalPlaybackQueueItem>>[
      const [],
      _oneItemQueue,
      _threeItemQueue,
      _missingQueue,
    ];
    return _PlaybackCommand(kind, queue: queues[random.nextInt(queues.length)]);
  }
  if (kind == _CommandKind.seek) {
    const positions = [
      Duration(seconds: -1),
      Duration.zero,
      Duration(milliseconds: 750),
      Duration(seconds: 8),
    ];
    return _PlaybackCommand(
      kind,
      position: positions[random.nextInt(positions.length)],
    );
  }
  return _PlaybackCommand(kind);
}

Future<void> _applyToPlayer(
  FakeLocalPlayer player,
  _PlaybackCommand command,
) async {
  switch (command.kind) {
    case _CommandKind.load:
      await player.loadQueue(command.queue);
    case _CommandKind.play:
      await player.play();
    case _CommandKind.pause:
      await player.pause();
    case _CommandKind.resume:
      await player.resume();
    case _CommandKind.next:
      await player.next();
    case _CommandKind.stop:
      await player.stop();
    case _CommandKind.seek:
      await player.seek(command.position!);
  }
}

class _ReferencePlaybackModel {
  LocalPlayerState playerState = LocalPlayerState.idle;
  LocalPlaybackProcessingState processingState =
      LocalPlaybackProcessingState.idle;
  List<LocalPlaybackQueueItem> queue = const [];
  int currentIndex = 0;
  Duration position = Duration.zero;
  Duration? duration;
  Duration bufferedPosition = Duration.zero;
  LocalPlaybackFailureKind? failureKind;

  List<Object?> get snapshot => [
    playerState,
    processingState,
    currentIndex,
    queue.map((item) => item.trackId).toList(),
    currentItem?.trackId,
    position,
    duration,
    bufferedPosition,
    failureKind,
  ];

  LocalPlaybackQueueItem? get currentItem =>
      currentIndex >= 0 && currentIndex < queue.length
      ? queue[currentIndex]
      : null;

  void apply(_PlaybackCommand command) {
    switch (command.kind) {
      case _CommandKind.load:
        _load(command.queue);
      case _CommandKind.play:
        _play();
      case _CommandKind.pause:
        if (playerState == LocalPlayerState.playing) {
          playerState = LocalPlayerState.paused;
        }
      case _CommandKind.resume:
        if (playerState == LocalPlayerState.paused) {
          _play();
        }
      case _CommandKind.next:
        _next();
      case _CommandKind.stop:
        _stop();
      case _CommandKind.seek:
        _seek(command.position!);
    }
  }

  void _load(List<LocalPlaybackQueueItem> nextQueue) {
    queue = List.unmodifiable(nextQueue);
    currentIndex = 0;
    position = Duration.zero;
    duration = null;
    bufferedPosition = Duration.zero;
    processingState = LocalPlaybackProcessingState.idle;
    failureKind = queue.isEmpty
        ? LocalPlaybackFailureKind.emptyQueue
        : queue.any((item) => item.path.contains('missing'))
        ? LocalPlaybackFailureKind.missingFile
        : null;
    if (failureKind != null) {
      playerState = LocalPlayerState.error;
      return;
    }
    playerState = LocalPlayerState.ready;
    processingState = LocalPlaybackProcessingState.ready;
    duration = _durations[queue.first.trackId];
  }

  void _play() {
    if (queue.isEmpty) {
      _idle();
      return;
    }
    if (playerState == LocalPlayerState.error) {
      return;
    }
    if (currentIndex >= queue.length) {
      currentIndex = 0;
      position = Duration.zero;
      bufferedPosition = Duration.zero;
    }
    duration = _durations[queue[currentIndex].trackId];
    playerState = LocalPlayerState.playing;
    processingState = LocalPlaybackProcessingState.ready;
    failureKind = null;
  }

  void _next() {
    if (queue.isEmpty) {
      _idle();
      return;
    }
    if (playerState == LocalPlayerState.error ||
        playerState == LocalPlayerState.completed) {
      return;
    }
    if (currentIndex < queue.length - 1) {
      currentIndex += 1;
      if (playerState != LocalPlayerState.playing &&
          playerState != LocalPlayerState.paused) {
        playerState = LocalPlayerState.ready;
      }
      processingState = LocalPlaybackProcessingState.ready;
      position = Duration.zero;
      bufferedPosition = Duration.zero;
      duration = _durations[queue[currentIndex].trackId];
      failureKind = null;
      return;
    }
    playerState = LocalPlayerState.completed;
    currentIndex = queue.length;
    position = duration ?? position;
    bufferedPosition = duration ?? bufferedPosition;
    processingState = LocalPlaybackProcessingState.completed;
    failureKind = null;
  }

  void _stop() {
    if (queue.isEmpty) {
      _idle();
      return;
    }
    playerState = LocalPlayerState.stopped;
    currentIndex = 0;
    position = Duration.zero;
    duration = _durations[queue.first.trackId];
    bufferedPosition = Duration.zero;
    processingState = LocalPlaybackProcessingState.ready;
    failureKind = null;
  }

  void _seek(Duration requested) {
    if (currentItem == null || playerState == LocalPlayerState.error) {
      return;
    }
    final nonNegative = requested.isNegative ? Duration.zero : requested;
    position = duration != null && nonNegative > duration!
        ? duration!
        : nonNegative;
    if (bufferedPosition < position) {
      bufferedPosition = position;
    }
  }

  void _idle() {
    playerState = LocalPlayerState.idle;
    processingState = LocalPlaybackProcessingState.idle;
    queue = const [];
    currentIndex = 0;
    position = Duration.zero;
    duration = null;
    bufferedPosition = Duration.zero;
    failureKind = null;
  }
}

List<Object?> _snapshot(LocalPlaybackState state) => [
  state.playerState,
  state.processingState,
  state.currentIndex,
  state.queue.map((item) => item.trackId).toList(),
  state.currentItem?.trackId,
  state.position,
  state.duration,
  state.bufferedPosition,
  state.failure?.kind,
];

void _expectPlaybackInvariants(
  LocalPlaybackState state, {
  required _PlaybackCommand command,
  required String reason,
}) {
  if (state.currentItem != null) {
    expect(
      state.currentIndex,
      inInclusiveRange(0, state.queue.length - 1),
      reason: reason,
    );
  }
  if (state.playerState == LocalPlayerState.completed) {
    expect(state.currentItem, isNull, reason: reason);
  }
  if (command.kind == _CommandKind.stop && state.queue.isNotEmpty) {
    expect(state.playerState, LocalPlayerState.stopped, reason: reason);
    expect(state.currentIndex, 0, reason: reason);
    expect(state.position, Duration.zero, reason: reason);
  }
  if (state.playerState == LocalPlayerState.error) {
    expect(state.failure, isNotNull, reason: reason);
  }
}
