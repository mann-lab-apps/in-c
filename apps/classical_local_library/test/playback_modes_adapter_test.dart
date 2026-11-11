import 'dart:async';
import 'dart:math';

import 'package:classical_local_library/just_audio_playback.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/playback_audio_session.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:just_audio/just_audio.dart';

import 'mode_audio_player.dart';
import 'playback_modes_test.dart' show modeQueue;

class _ExistingFiles extends LocalPlaybackFileProbe {
  @override
  Future<bool> exists(String path) async => true;
}

void main() {
  late ModeAudioPlayer engine;
  late JustAudioLocalPlaybackController p;
  setUp(() {
    engine = ModeAudioPlayer();
    p = JustAudioLocalPlaybackController(
      player: engine,
      random: Random(7),
      validator: LocalPlaybackQueueValidator(fileProbe: _ExistingFiles()),
      audioSession: MemoryLocalPlaybackAudioSession(),
    );
  });
  tearDown(() async {
    await p.dispose();
  });

  for (final mode in LocalRepeatMode.values) {
    test('native loop mapping and natural boundary $mode', () async {
      await p.loadQueue(modeQueue(3));
      await p.setRepeatMode(mode);
      await p.play();
      expect(
        engine.loopMode,
        mode == LocalRepeatMode.one
            ? LoopMode.one
            : mode == LocalRepeatMode.all
            ? LoopMode.all
            : LoopMode.off,
      );
      for (var i = 0; i < 3; i++) {
        engine.advance();
      }
      expect(p.playbackState.currentIndex, mode == LocalRepeatMode.off ? 3 : 0);
      expect(
        p.playbackState.playerState,
        mode == LocalRepeatMode.off
            ? LocalPlayerState.completed
            : LocalPlayerState.playing,
      );
    });
  }
  test('shuffle uses native permutation and never reloads/seeks the current source', () async {
    final sources = modeQueue();
    await p.loadQueue(sources);
    await p.play();
    await p.next();
    await p.seek(const Duration(seconds: 7));
    await p.setShuffleEnabled(true);
    expect(engine.effectiveIndices, p.playbackState.queueOrder);
    expect(engine.currentIndex, 1);
    expect(p.playbackState.position.inSeconds, 7);
    expect(p.playbackState.playerState, LocalPlayerState.playing);
    expect(engine.sourceLoads, 1);
    final visibleOrder = p.playbackState.queue;
    engine.advance();
    expect(p.playbackState.currentItem, visibleOrder[2]);
    await p.pause();
    await p.seek(const Duration(seconds: 4));
    final current = p.playbackState.currentItem;
    final original = p.playbackState.originalIndex;
    await p.setShuffleEnabled(false);
    expect(p.playbackState.queue, sources);
    expect(p.playbackState.currentItem, same(current));
    expect(p.playbackState.currentIndex, original);
    expect(engine.position.inSeconds, 4);
    expect(p.playbackState.playerState, LocalPlayerState.paused);
    expect(engine.sourceLoads, 1);
  });
  test(
    'manual next/previous override loop-one; paused all-wrap stays paused',
    () async {
      await p.loadQueue(modeQueue(3));
      await p.setRepeatMode(LocalRepeatMode.one);
      await p.play();
      engine.advance();
      expect(p.playbackState.currentIndex, 0);
      await p.next();
      expect(p.playbackState.currentIndex, 1);
      await p.seek(const Duration(seconds: 3));
      await p.previous();
      expect(p.playbackState.currentIndex, 1);
      await p.previous();
      expect(p.playbackState.currentIndex, 0);
      await p.pause();
      await p.setRepeatMode(LocalRepeatMode.all);
      await p.previous();
      expect(p.playbackState.currentIndex, 2);
      expect(engine.playing, isFalse);
      await p.next();
      expect(p.playbackState.currentIndex, 0);
      expect(p.playbackState.playerState, LocalPlayerState.paused);
    },
  );
  test('completed keeps sentinel during mode changes and play restarts the same ordered queue', () async {
    await p.loadQueue(modeQueue(1));
    await p.play();
    engine.advance();
    await p.setRepeatMode(LocalRepeatMode.all);
    await p.setShuffleEnabled(true);
    expect(p.playbackState.currentIndex, 1);
    expect(engine.playing, isFalse);
    await p.next();
    expect(p.playbackState.currentIndex, 1);
    await p.play();
    expect(p.playbackState.currentIndex, 0);
    expect(engine.sourceLoads, 1);
  });
  test('failed native mode writes roll back both engine and UI, preserving playback', () async {
    await p.loadQueue(modeQueue());
    await p.play();
    await p.seek(const Duration(seconds: 5));
    engine.failShuffleCount = 1;
    await p.setShuffleEnabled(true);
    expect(p.playbackState.shuffleEnabled, isFalse);
    expect(engine.shuffleModeEnabled, isFalse);
    expect(p.playbackState.modeError, contains('셔플'));
    expect(p.playbackState.modeError, isNot(contains('/private/')));
    expect(p.playbackState.position.inSeconds, 5);
    expect(p.playbackState.playerState, LocalPlayerState.playing);
    engine.failLoopCount = 1;
    await p.setRepeatMode(LocalRepeatMode.one);
    expect(p.playbackState.repeatMode, LocalRepeatMode.off);
    expect(engine.loopMode, LoopMode.off);
    await p.setRepeatMode(LocalRepeatMode.one);
    expect(p.playbackState.modeError, isNull);
  });
  test(
    'rollback failure pauses actual engine and leaves a recoverable error',
    () async {
      await p.loadQueue(modeQueue());
      await p.play();
      engine.failLoopCount = 2;
      await p.setRepeatMode(LocalRepeatMode.all);
      expect(p.playbackState.playerState, LocalPlayerState.error);
      expect(engine.playing, isFalse);
      await p.stop();
      await p.loadQueue(modeQueue(2));
      await p.play();
      expect(p.playbackState.playerState, LocalPlayerState.playing);
    },
  );
  test('late seek result cannot overwrite a different occurrence of the same track', () async {
    final item = modeQueue(1).single;
    await p.loadQueue([item, item]);
    await p.play();
    engine.seekGate = Completer<void>();
    final seek = p.seek(const Duration(seconds: 2));
    await Future<void>.delayed(Duration.zero);
    engine.advance();
    expect(p.playbackState.originalIndex, 1);
    engine.seekGate!.complete();
    await seek;
    expect(p.playbackState.originalIndex, 1);
    expect(p.playbackState.position, Duration.zero);
    expect(p.playbackState.isSeeking, isFalse);
  });
  test('queue replacement supersedes a pending native mode response', () async {
    await p.loadQueue(modeQueue(5));
    engine.loopGate = Completer<void>();
    final mode = p.setRepeatMode(LocalRepeatMode.one);
    await Future<void>.delayed(Duration.zero);
    final replace = p.loadQueue(modeQueue(2));
    await Future<void>.delayed(Duration.zero);
    engine.loopGate!.complete();
    await Future.wait([mode, replace]);
    expect(p.playbackState.queue, hasLength(2));
    expect(p.playbackState.repeatMode, LocalRepeatMode.off);
    expect(engine.loopMode, LoopMode.off);
    expect(p.playbackState.playerState, LocalPlayerState.ready);
  });
  test(
    'late mode completion after disposal never publishes another state',
    () async {
      await p.loadQueue(modeQueue());
      final seen = <LocalPlaybackState>[];
      final subscription = p.states.listen(seen.add);
      engine.loopGate = Completer<void>();
      final change = p.setRepeatMode(LocalRepeatMode.all);
      await Future<void>.delayed(Duration.zero);
      await p.dispose();
      final count = seen.length;
      engine.loopGate!.complete();
      await change;
      expect(seen.length, count);
      await subscription.cancel();
    },
  );
}
