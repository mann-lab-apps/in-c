import 'dart:async';
import 'dart:math';

import 'package:classical_local_library/just_audio_playback.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/playback_audio_session.dart';
import 'package:classical_local_library/system_media.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:just_audio/just_audio.dart';

import 'mode_audio_player.dart';
import 'playback_modes_test.dart' show modeQueue;

class QueueFileProbe extends LocalPlaybackFileProbe {
  Completer<void>? gate;
  final missing = <String>{};
  @override
  Future<bool> exists(String path) async {
    await gate?.future;
    return !missing.contains(path);
  }
}

Future<void> settleQueueCommand() => Future<void>.delayed(Duration.zero);

void main() {
  for (final native in [false, true]) {
    group(native ? 'adapter boundary' : 'fake', () {
      late LocalPlaybackController p;
      late QueueFileProbe probe;
      ModeAudioPlayer? engine;
      setUp(() {
        probe = QueueFileProbe();
        engine = native ? ModeAudioPlayer() : null;
        final validator = LocalPlaybackQueueValidator(fileProbe: probe);
        p = native
            ? JustAudioLocalPlaybackController(
                player: engine,
                random: Random(7),
                validator: validator,
                audioSession: MemoryLocalPlaybackAudioSession(),
              )
            : FakeLocalPlayer(random: Random(7), validator: validator);
      });
      tearDown(() => p.dispose());

      Future<void> advance() async {
        if (engine != null) {
          engine!.advance();
        } else {
          await (p as FakeLocalPlayer).completeCurrent();
        }
      }

      void matchesEngine() {
        if (engine == null) return;
        final s = p.playbackState;
        expect(engine!.effectiveIndices, s.queueOrder);
        expect(
          engine!.effectiveIndices.map(
            (i) => (engine!.sequence[i] as UriAudioSource).uri.toFilePath(),
          ),
          s.queue.map((i) => i.path),
        );
        expect(engine!.currentIndex, s.originalIndex);
      }

      for (final playing in [false, true]) {
        test(
          'insert append final-index move remove clear preserve current and position playing=$playing',
          () async {
            final q = modeQueue(6);
            await p.loadQueue(q.take(4).toList());
            await p.play();
            await p.next();
            await p.seek(const Duration(seconds: 4));
            if (!playing) await p.pause();
            final selected = p.playbackState.currentItem;
            final tag = engine?.sequence[engine!.currentIndex!].tag;
            await p.enqueue([q[4]], next: true);
            expect(p.playbackState.queue, [q[0], q[1], q[4], q[2], q[3]]);
            await p.enqueue([q[5]]);
            await p.moveQueueItem(2, 5);
            expect(p.playbackState.queue, [q[0], q[1], q[2], q[3], q[5], q[4]]);
            await p.removeQueueItem(3);
            expect(p.playbackState.queue, [q[0], q[1], q[2], q[5], q[4]]);
            matchesEngine();
            await p.clearUpcoming();
            expect(p.playbackState.queue, q.take(2));
            expect(p.playbackState.currentItem, same(selected));
            expect(p.playbackState.position, const Duration(seconds: 4));
            expect(
              p.playbackState.playerState,
              playing ? LocalPlayerState.playing : LocalPlayerState.paused,
            );
            if (engine != null) {
              expect(engine!.sequence[engine!.currentIndex!].tag, tag);
              expect(engine!.sourceLoads, 1);
              expect(engine!.seeks, 2); // Only explicit next and seek.
            }
            matchesEngine();
          },
        );
      }

      test('current past and invalid endpoints are protected', () async {
        final q = modeQueue(4);
        await p.loadQueue(q);
        await p.next();
        for (final index in [-1, 0, 1, 4]) {
          await p.removeQueueItem(index);
          await p.moveQueueItem(2, index);
          expect(p.playbackState.queue, q);
          expect(p.playbackState.queueEditError, isNotNull);
          expect(p.playbackState.isEditingQueue, isFalse);
        }
        expect(engine?.sourceEdits ?? 0, 0);
      });

      test(
        'duplicate objects retain distinct occurrences and selected source',
        () async {
          final item = modeQueue(1).single;
          await p.loadQueue([item, item, item, item]);
          await p.next();
          await p.seek(const Duration(seconds: 3));
          final tag = engine?.sequence[1].tag;
          await p.enqueue([item], next: true);
          await p.moveQueueItem(4, 2);
          await p.removeQueueItem(3);
          await p.setShuffleEnabled(true);
          await p.clearUpcoming();
          expect(p.playbackState.queue, [item, item]);
          expect(p.playbackState.originalIndex, 1);
          expect(p.playbackState.position.inSeconds, 3);
          if (engine != null) {
            expect(engine!.sequence.map((s) => s.tag).toSet(), hasLength(2));
            expect(engine!.sequence[engine!.currentIndex!].tag, tag);
          }
          matchesEngine();
        },
      );

      test(
        'shuffle next uses effective order; off restores canonical additions',
        () async {
          final q = modeQueue(8), extra = modeQueue(10).skip(8).toList();
          await p.loadQueue(q);
          await p.setShuffleEnabled(true);
          await p.enqueue(extra, next: true);
          expect(p.playbackState.queue.take(3), [q.first, ...extra]);
          await p.moveQueueItem(2, 4);
          matchesEngine();
          await p.play();
          await advance();
          expect(p.playbackState.currentItem, same(extra.first));
          final selected = p.playbackState.currentItem;
          await p.pause();
          await p.setShuffleEnabled(false);
          expect(p.playbackState.queue, [...q, ...extra]);
          expect(p.playbackState.currentItem, same(selected));
          expect(p.playbackState.currentIndex, 8);
          matchesEngine();
        },
      );

      test('removing future occurrence before selected canonical index preserves source and position', () async {
        final q = modeQueue(6), order = [0, 4, 1, 5, 2, 3];
        await p.restoreQueue(
          PlaybackQueueRecoveryResult(
            queue: [for (final i in order) q[i]],
            skippedTrackIds: const [],
            hadSnapshot: true,
            queueOrder: order,
            currentIndex: 1,
            shuffleEnabled: true,
          ),
        );
        await p.seek(const Duration(seconds: 4));
        final tag = engine?.sequence[4].tag;
        await p.removeQueueItem(2); // canonical 1, before selected canonical 4.
        expect(p.playbackState.queue, [q[0], q[4], q[5], q[2], q[3]]);
        expect(p.playbackState.currentItem, same(q[4]));
        expect(p.playbackState.currentIndex, 1);
        expect(p.playbackState.originalIndex, 3);
        expect(p.playbackState.position.inSeconds, 4);
        if (engine != null) {
          expect(engine!.sequence[engine!.currentIndex!].tag, tag);
        }
        await p.setShuffleEnabled(false);
        expect(p.playbackState.queue, [q[0], q[2], q[3], q[4], q[5]]);
        expect(p.playbackState.currentItem, same(q[4]));
        matchesEngine();
      });

      test('empty append is ready; concurrent empty appends preserve both commands', () async {
        final q = modeQueue(2);
        await Future.wait([
          p.enqueue([q[0]]),
          p.enqueue([q[1]]),
        ]);
        expect(p.playbackState.queue, q);
        expect(p.playbackState.currentIndex, 0);
        expect(p.playbackState.playerState, LocalPlayerState.ready);
        expect(engine?.playing ?? false, isFalse);
        matchesEngine();
      });

      test('ready append remains ready and does not seek or reload', () async {
        final q = modeQueue(3);
        await p.loadQueue([q[0]]);
        await p.enqueue(q.skip(1).toList());
        expect(p.playbackState.queue, q);
        expect(p.playbackState.playerState, LocalPlayerState.ready);
        expect(engine?.sourceLoads ?? 1, 1);
        expect(engine?.seeks ?? 0, 0);
        matchesEngine();
      });

      for (final manual in [false, true]) {
        test(
          'completed append selects first addition ready without autoplay manual=$manual',
          () async {
            final q = modeQueue(3);
            await p.loadQueue([q[0]]);
            await p.play();
            if (manual) {
              await p.next();
            } else {
              await advance();
            }
            expect(p.playbackState.playerState, LocalPlayerState.completed);
            await p.enqueue(q.skip(1).toList(), next: true);
            expect(p.playbackState.queue, q);
            expect(p.playbackState.currentItem, same(q[1]));
            expect(p.playbackState.position, Duration.zero);
            expect(p.playbackState.playerState, LocalPlayerState.ready);
            expect(
              p.playbackState.processingState,
              LocalPlaybackProcessingState.ready,
            );
            if (engine != null) {
              expect(engine!.playing, isFalse);
              expect(engine!.processingState, ProcessingState.ready);
              expect(engine!.sourceLoads, 1);
            }
            matchesEngine();
          },
        );
      }

      test(
        'validation crossing natural next inserts after live selection',
        () async {
          final q = modeQueue(4);
          await p.loadQueue(q.take(3).toList());
          await p.play();
          probe.gate = Completer<void>();
          final edit = p.enqueue([q.last], next: true);
          await settleQueueCommand();
          await advance();
          expect(p.playbackState.isEditingQueue, isTrue);
          probe.gate!.complete();
          await edit;
          expect(p.playbackState.queue, [q[0], q[1], q[3], q[2]]);
          expect(p.playbackState.currentItem, same(q[1]));
          expect(p.playbackState.automaticTransitions, 1);
          expect(p.playbackState.isEditingQueue, isFalse);
          matchesEngine();
        },
      );

      test('missing additions are excluded with notice; unchanged queue remains usable', () async {
        final q = modeQueue(4);
        await p.loadQueue(q.take(2).toList());
        probe.missing.add(q[2].path);
        await p.enqueue(q.skip(2).toList());
        expect(p.playbackState.queue, [q[0], q[1], q[3]]);
        expect(p.playbackState.queueEditError, contains('1개'));
        await p.enqueue([q[2]]);
        expect(p.playbackState.queue, [q[0], q[1], q[3]]);
        expect(p.playbackState.isEditingQueue, isFalse);
        expect(p.playbackState.failure, isNull);
        matchesEngine();
      });

      for (final fail in [false, true]) {
        test(
          'replacement supersedes late validation success/failure fail=$fail',
          () async {
            final q = modeQueue(4);
            await p.loadQueue(q.take(2).toList());
            probe.gate = Completer<void>();
            final edit = p.enqueue([q[2]]);
            await settleQueueCommand();
            final oldGate = probe.gate!;
            probe.gate = null;
            final replacement = p.loadQueue([q[3]]);
            await settleQueueCommand();
            if (fail) {
              oldGate.completeError(StateError('old validation'));
            } else {
              oldGate.complete();
            }
            await Future.wait([edit, replacement]);
            expect(p.playbackState.queue, [q[3]]);
            expect(p.playbackState.queueEditError, isNull);
            expect(p.playbackState.playerState, LocalPlayerState.ready);
            matchesEngine();
          },
        );
      }

      test('stale missing-file validation cannot attach an exclusion to a replacement', () async {
        final q = modeQueue(4);
        await p.loadQueue(q.take(2).toList());
        probe.gate = Completer<void>();
        final edit = p.enqueue([q[2]]);
        await settleQueueCommand();
        final gate = probe.gate!;
        probe.gate = null;
        probe.missing.add(q[2].path);
        final replacement = p.loadQueue([q[3]]);
        await settleQueueCommand();
        gate.complete();
        await Future.wait([edit, replacement]);
        expect(p.playbackState.queueEditError, isNull);
        expect(p.playbackState.queue, [q[3]]);
      });

      test('enqueue settles with confirmed count and exclusion notice even when all additions are missing', () async {
        final q = modeQueue(4);
        await p.loadQueue([q[0]]);
        probe.missing.add(q[1].path);
        var count = p.playbackState.queue.length;
        await p.enqueue(q.skip(1).toList());
        expect(p.playbackState.queue.length - count, 2);
        expect(p.playbackState.queueEditError, '재생할 수 없는 1개 항목을 제외했습니다.');
        expect(p.playbackState.isEditingQueue, isFalse);
        count = p.playbackState.queue.length;
        await p.enqueue([q[1]]);
        expect(p.playbackState.queue.length - count, 0);
        expect(p.playbackState.queueEditError, contains('1개'));
        await p.enqueue([]);
        expect(p.playbackState.queue.length - count, 0);
        expect(p.playbackState.queueEditError, isNull);
      });

      for (final fail in [false, true]) {
        test(
          'disposal cancels validation with no late state fail=$fail',
          () async {
            await p.loadQueue(modeQueue(2));
            probe.gate = Completer<void>();
            final seen = <LocalPlaybackState>[];
            final sub = p.states.listen(seen.add);
            final edit = p.enqueue([modeQueue(3).last]);
            await settleQueueCommand();
            await p.dispose();
            final count = seen.length;
            if (fail) {
              probe.gate!.completeError(StateError('disposed'));
            } else {
              probe.gate!.complete();
            }
            await edit;
            expect(seen.length, count);
            await sub.cancel();
          },
        );
      }
    });
  }

  group('native edit races and failure recovery', () {
    late ModeAudioPlayer engine;
    late JustAudioLocalPlaybackController p;
    setUp(() {
      engine = ModeAudioPlayer();
      p = JustAudioLocalPlaybackController(
        player: engine,
        random: Random(7),
        validator: LocalPlaybackQueueValidator(fileProbe: QueueFileProbe()),
        audioSession: MemoryLocalPlaybackAudioSession(),
      );
    });
    tearDown(() => p.dispose());

    test('partial native failure pauses; stop/play cannot resume damaged sequence; reload recovers', () async {
      final q = modeQueue(4);
      await p.loadQueue(q.take(3).toList());
      await p.play();
      await p.seek(const Duration(seconds: 4));
      final before = p.playbackState;
      engine.failEditCount = 1;
      await p.enqueue([q.last], next: true);
      expect(
        engine.sequence,
        hasLength(4),
      ); // Dart mutation preceded rejection.
      expect(p.playbackState.queue, same(before.queue));
      expect(p.playbackState.queueOrder, before.queueOrder);
      expect(p.playbackState.position, before.position);
      expect(p.playbackState.failure, isNotNull);
      expect(p.playbackState.queueEditError, isNot(contains('/private/')));
      expect(engine.playing, isFalse);
      await p.stop();
      await p.play();
      expect(engine.playing, isFalse);
      await p.loadQueue(q);
      await p.play();
      expect(p.playbackState.playerState, LocalPlayerState.playing);
    });

    test(
      'multi-range removal failure never publishes partially edited queue',
      () async {
        await p.loadQueue(modeQueue(8));
        await p.setShuffleEnabled(true);
        await p.play();
        await p.next();
        await p.next();
        final before = p.playbackState;
        engine.failEditNumber = engine.sourceEdits + 2;
        await p.clearUpcoming();
        expect(engine.sourceEdits, 2);
        expect(p.playbackState.queue, same(before.queue));
        expect(p.playbackState.queueOrder, before.queueOrder);
        expect(p.playbackState.playerState, LocalPlayerState.error);
        expect(engine.playing, isFalse);
      },
    );

    test('stop awaits native resource release while retaining uncertain queue error without seek or relabel', () async {
      await p.loadQueue(modeQueue(3));
      await p.play();
      await p.seek(const Duration(seconds: 4));
      engine.failEditCount = 1;
      await p.enqueue([modeQueue(4).last]);
      final failed = p.playbackState;
      final seeks = engine.seeks;
      final seen = <LocalPlaybackState>[];
      final sub = p.states.listen(seen.add);
      engine.stopGate = Completer<void>();
      var completed = false;
      final stop = p.stop().then((_) => completed = true);
      await settleQueueCommand();
      expect(engine.stops, 1);
      expect(completed, isFalse);
      engine.stopGate!.complete();
      await stop;
      expect(engine.processingState, ProcessingState.idle);
      expect(engine.seeks, seeks);
      expect(p.playbackState, same(failed));
      expect(seen, isEmpty);
      await p.play();
      expect(engine.playing, isFalse);
      expect(p.playbackState, same(failed));
      await sub.cancel();
    });

    test('rejected native stop preserves reload-required error and permits stop retry', () async {
      await p.loadQueue(modeQueue(3));
      await p.play();
      engine.failEditCount = 1;
      await p.enqueue([modeQueue(4).last]);
      final failed = p.playbackState;
      final seeks = engine.seeks;
      engine.failStopCount = 1;
      await p.stop();
      expect(engine.stops, 1);
      expect(p.playbackState, same(failed));
      expect(engine.seeks, seeks);
      await p.play();
      expect(engine.playing, isFalse);
      await p.stop();
      expect(engine.stops, 2);
      expect(engine.processingState, ProcessingState.idle);
      expect(p.playbackState, same(failed));
    });

    test(
      'pause rejection during partial native failure falls back to stop',
      () async {
        await p.loadQueue(modeQueue(3));
        await p.play();
        engine.failEditCount = 1;
        engine.failPauseCount = 1;
        await p.enqueue([modeQueue(4).last]);
        expect(p.playbackState.playerState, LocalPlayerState.error);
        expect(engine.playing, isFalse);
      },
    );

    test('native shuffle order rejection after insertion retains confirmed permutation', () async {
      await p.loadQueue(modeQueue(4));
      await p.setShuffleEnabled(true);
      final before = p.playbackState;
      engine.failShuffleOrderCount = 1;
      await p.enqueue([modeQueue(5).last], next: true);
      expect(p.playbackState.playerState, LocalPlayerState.error);
      expect(p.playbackState.queue, same(before.queue));
      expect(p.playbackState.queueOrder, before.queueOrder);
      expect(engine.playing, isFalse);
    });

    test('natural next during native insertion reconciles actual occurrence without double skip', () async {
      final q = modeQueue(4);
      await p.loadQueue(q.take(3).toList());
      await p.play();
      engine.editGate = Completer<void>();
      final edit = p.enqueue([q[3]], next: true);
      await settleQueueCommand();
      engine.advance();
      engine.editGate!.complete();
      await edit;
      expect(p.playbackState.currentItem, same(q[3]));
      expect(p.playbackState.position, Duration.zero);
      expect(p.playbackState.automaticTransitions, 1);
      expect(p.playbackState.isEditingQueue, isFalse);
      expect(engine.sourceLoads, 1);
    });

    test('edit waits for in-flight seek and retains its position', () async {
      final q = modeQueue(4);
      await p.loadQueue(q.take(3).toList());
      engine.seekGate = Completer<void>();
      final seek = p.seek(const Duration(seconds: 6));
      await settleQueueCommand();
      final edit = p.enqueue([q.last]);
      await settleQueueCommand();
      expect(engine.sourceEdits, 0);
      engine.seekGate!.complete();
      await Future.wait([seek, edit]);
      expect(p.playbackState.position.inSeconds, 6);
      expect(p.playbackState.queue, q);
      expect(p.playbackState.isSeeking, isFalse);
    });

    for (final shuffled in [false, true]) {
      test(
        'natural transition before dispatch protects both move endpoints shuffled=$shuffled',
        () async {
          await p.loadQueue(modeQueue(5));
          if (shuffled) await p.setShuffleEnabled(true);
          await p.play();
          final before = p.playbackState.queue;
          var advanced = false;
          final sub = p.states.listen((s) {
            if (s.isEditingQueue && !advanced) {
              advanced = true;
              engine.advance();
            }
          });
          await p.moveQueueItem(2, 1);
          await sub.cancel();
          expect(p.playbackState.currentIndex, 1);
          expect(p.playbackState.queue, same(before));
          expect(p.playbackState.queueEditError, isNotNull);
          expect(engine.sourceEdits, 0);
        },
      );
    }

    test('seek queued after edit cannot overlap native mutations or target a changed queue', () async {
      await p.loadQueue(modeQueue(3));
      engine.editGate = Completer<void>();
      final edit = p.enqueue([modeQueue(4).last]);
      await settleQueueCommand();
      final seek = p.seek(const Duration(seconds: 6));
      await settleQueueCommand();
      expect(engine.seeks, 0);
      engine.editGate!.complete();
      await Future.wait([edit, seek]);
      expect(engine.seeks, 0);
      expect(p.playbackState.isSeeking, isFalse);
    });

    test(
      'external pause during mutation remains paused after commit',
      () async {
        await p.loadQueue(modeQueue(3));
        await p.play();
        engine.editGate = Completer<void>();
        final edit = p.enqueue([modeQueue(4).last]);
        await settleQueueCommand();
        await p.pause();
        engine.editGate!.complete();
        await edit;
        expect(engine.playing, isFalse);
        expect(p.playbackState.playerState, LocalPlayerState.paused);
      },
    );

    test(
      'completed preparation failure keeps confirmed queue and requires reload',
      () async {
        final q = modeQueue(2);
        await p.loadQueue([q.first]);
        await p.play();
        engine.advance();
        final before = p.playbackState;
        engine.failPrepareCount = 1;
        await p.enqueue([q.last]);
        expect(p.playbackState.queue, same(before.queue));
        expect(p.playbackState.queueOrder, before.queueOrder);
        expect(p.playbackState.failure, isNotNull);
        expect(engine.playing, isFalse);
        expect(p.playbackState.playerState, LocalPlayerState.error);
      },
    );

    for (final fail in [false, true]) {
      test(
        'replacement waits native edit then ignores stale result fail=$fail',
        () async {
          final q = modeQueue(5);
          await p.loadQueue(q.take(3).toList());
          engine.editGate = Completer<void>();
          final edit = p.enqueue([q[3]]);
          await settleQueueCommand();
          final replace = p.loadQueue([q[4]]);
          await settleQueueCommand();
          expect(engine.sourceLoads, 1);
          if (fail) engine.failEditCount = 1;
          engine.editGate!.complete();
          await Future.wait([edit, replace]);
          expect(p.playbackState.queue, [q[4]]);
          expect(engine.sequence, hasLength(1));
          expect(p.playbackState.failure, isNull);
          expect(p.playbackState.queueEditError, isNull);
          expect(p.playbackState.playerState, LocalPlayerState.ready);
        },
      );

      test(
        'disposed edit ignores late success/failure and publishes nothing fail=$fail',
        () async {
          await p.loadQueue(modeQueue(3));
          final seen = <LocalPlaybackState>[];
          final sub = p.states.listen(seen.add);
          engine.editGate = Completer<void>();
          final edit = p.enqueue([modeQueue(4).last]);
          await settleQueueCommand();
          await p.dispose();
          final count = seen.length;
          if (fail) engine.failEditCount = 1;
          engine.editGate!.complete();
          await edit;
          expect(seen.length, count);
          expect(engine.disposed, isTrue);
          await sub.cancel();
        },
      );
    }

    test('serialized system next from before edit cannot skip newly scheduled source', () async {
      final c = SerializedLocalPlaybackController(p);
      final session = _MediaSession();
      final media = PlaybackSystemMediaCoordinator(
        controller: c,
        session: session,
      );
      addTearDown(media.dispose);
      await c.loadQueue(modeQueue(3));
      await c.play();
      final old = media.snapshot!;
      engine.editGate = Completer<void>();
      final edit = c.enqueue([modeQueue(4).last], next: true);
      // Queue the remote request before the edit starts. Selection is checked
      // again when the serialized command reaches the delegate.
      final next = media.handleCommand(
        SystemMediaCommand(SystemMediaAction.next, old.id, old.generation),
      );
      await settleQueueCommand();
      expect(media.snapshot!.actions, isEmpty);
      engine.editGate!.complete();
      await Future.wait([edit, next]);
      expect(p.playbackState.currentIndex, 0);
      expect(media.snapshot!.count, 4);
      expect(engine.sourceLoads, 1);
    });
  });
}

class _MediaSession implements SystemMediaSession {
  @override
  void setCommandHandler(Future<void> Function(SystemMediaCommand)? handler) {}
  @override
  Future<void> publish(SystemMediaSnapshot? snapshot) async {}
  @override
  Future<void> dispose() async {}
}
