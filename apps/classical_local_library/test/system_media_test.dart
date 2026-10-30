import 'dart:async';

import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/system_media.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'stop used by data reset waits for diagnostic cleanup before queue clear',
    () async {
      final player = FakeLocalPlayer();
      final controller = SerializedLocalPlaybackController(player);
      await controller.loadQueue([_item('one')]);
      await controller.play();
      final gate = Completer<void>();
      final diagnostic = controller.runDiagnostic(() => gate.future);
      var stopped = false;
      final stopping = controller.stop().then((_) => stopped = true);
      await Future<void>.delayed(Duration.zero);
      expect(stopped, isFalse);
      expect(player.state, LocalPlayerState.paused);
      gate.complete();
      await diagnostic;
      await stopping;
      expect(player.state, LocalPlayerState.stopped);
      await controller.loadQueue([]);
      expect(player.playbackState.queue, isEmpty);
      await controller.dispose();
    },
  );
  test(
    'dispose drains an older publish then clears and rejects late commands',
    () async {
      final player = FakeLocalPlayer();
      final controller = SerializedLocalPlaybackController(player);
      final session = _Session();
      final gate = Completer<void>();
      session.gate = gate;
      final media = PlaybackSystemMediaCoordinator(
        controller: controller,
        session: session,
      );
      await controller.loadQueue([_item('one')]);
      final old = media.snapshot!;
      final disposed = media.dispose();
      await media.handleCommand(
        SystemMediaCommand(SystemMediaAction.play, old.id, old.generation),
      );
      expect(player.state, LocalPlayerState.ready);
      gate.complete();
      await disposed;
      expect(session.cleared, isTrue);
      expect(session.handler, isNull);
      expect(media.snapshot, isNull);
      await controller.dispose();
    },
  );
  test(
    'loading disables remote commands and a file error clears system metadata',
    () async {
      final probe = _PendingProbe();
      final player = FakeLocalPlayer(
        validator: LocalPlaybackQueueValidator(fileProbe: probe),
      );
      final controller = SerializedLocalPlaybackController(player);
      final session = _Session();
      final media = PlaybackSystemMediaCoordinator(
        controller: controller,
        session: session,
      );
      final loading = controller.loadQueue([_item('missing')]);
      await Future<void>.value();
      expect(player.state, LocalPlayerState.loading);
      expect(media.snapshot!.actions, isEmpty);
      expect(media.snapshot!.duration, isNull);
      probe.existsResult.complete(false);
      await loading;
      expect(player.state, LocalPlayerState.error);
      expect(media.snapshot, isNull);
      await media.dispose();
      await controller.dispose();
    },
  );
  test('engine metadata, duration and completion map without paths or invented artist', () async {
    final player = FakeLocalPlayer(
      trackDurations: const {'one': Duration(seconds: 60)},
    );
    final controller = SerializedLocalPlaybackController(player);
    final session = _Session();
    final media = PlaybackSystemMediaCoordinator(
      controller: controller,
      session: session,
    );
    await controller.loadQueue([
      _item('one', artist: '연주자', album: '앨범'),
      _item('two'),
    ]);
    expect(media.snapshot!.artist, '연주자');
    expect(media.snapshot!.album, '앨범');
    expect(media.snapshot!.id, isNot(contains('/private/')));
    expect(media.snapshot!.title, '작품 · one');
    await controller.play();
    expect(media.snapshot!.rate, 1);
    await player.updatePosition(const Duration(seconds: 4));
    expect(media.snapshot!.position.inSeconds, 4);
    await controller.pause();
    await controller.next();
    expect(player.state, LocalPlayerState.paused);
    expect(media.snapshot!.rate, 0);
    expect(media.snapshot!.artist, isNull);
    expect(media.snapshot!.album, isNull);
    expect(media.snapshot!.actions, isNot(contains(SystemMediaAction.seek)));
    await controller.next();
    expect(player.currentIndex, 2);
    expect(media.snapshot!.index, 1);
    expect(media.snapshot!.title, '작품 · two');
    expect(media.snapshot!.actions, contains(SystemMediaAction.play));
    await _send(media, SystemMediaAction.play);
    expect(player.currentIndex, 0);
    expect(player.playbackState.position, Duration.zero);
    await controller.stop();
    expect(media.snapshot, isNull);
    await media.flush();
    expect(session.values.last, isNull);
    await media.dispose();
    await controller.dispose();
  });

  test(
    'remote commands and previous 3-second boundary preserve pause intent',
    () async {
      final player = FakeLocalPlayer(
        trackDurations: const {
          'one': Duration(seconds: 60),
          'two': Duration(seconds: 60),
        },
      );
      final controller = SerializedLocalPlaybackController(player);
      final media = PlaybackSystemMediaCoordinator(
        controller: controller,
        session: _Session(),
      );
      await controller.loadQueue([_item('one'), _item('two')]);
      await _send(media, SystemMediaAction.play);
      await _send(media, SystemMediaAction.pause);
      await _send(media, SystemMediaAction.next);
      await _send(media, SystemMediaAction.seek, const Duration(seconds: 3));
      await _send(media, SystemMediaAction.previous);
      expect(player.currentIndex, 1);
      expect(player.playbackState.position, Duration.zero);
      await player.updatePosition(const Duration(milliseconds: 2999));
      await _send(media, SystemMediaAction.previous);
      expect(player.currentIndex, 0);
      expect(player.state, LocalPlayerState.paused);
      await _send(media, SystemMediaAction.previous);
      expect(player.currentIndex, 0);
      await _send(media, SystemMediaAction.toggle);
      expect(player.state, LocalPlayerState.playing);
      await _send(media, SystemMediaAction.stop);
      expect(media.snapshot, isNull);
      await media.dispose();
      await controller.dispose();
    },
  );

  test('late seek behind UI next and obsolete queue commands cannot affect a new item', () async {
    final player = _GatePlayer();
    final controller = SerializedLocalPlaybackController(player);
    final media = PlaybackSystemMediaCoordinator(
      controller: controller,
      session: _Session(),
    );
    await controller.loadQueue([_item('one'), _item('two')]);
    await controller.play();
    final old = media.snapshot!;
    final gate = Completer<void>();
    player.gate = gate;
    final saving = controller.persistPosition();
    await Future<void>.value();
    final next = controller.next();
    final seek = media.handleCommand(
      SystemMediaCommand(
        SystemMediaAction.seek,
        old.id,
        old.generation,
        position: const Duration(seconds: 30),
      ),
    );
    gate.complete();
    await Future.wait([saving, next, seek]);
    expect(player.currentIndex, 1);
    expect(player.playbackState.position, Duration.zero);
    await controller.loadQueue([_item('replacement')]);
    await media.handleCommand(
      SystemMediaCommand(SystemMediaAction.play, old.id, old.generation),
    );
    expect(player.state, LocalPlayerState.ready);
    await controller.loadQueue([]);
    expect(media.snapshot, isNull);
    await media.dispose();
    await controller.dispose();
  });

  for (final fails in [false, true]) {
    test(
      'diagnostic lease blocks UI/remote commands and leaves music paused: failure=$fails',
      () async {
        final player = FakeLocalPlayer();
        final controller = SerializedLocalPlaybackController(player);
        final media = PlaybackSystemMediaCoordinator(
          controller: controller,
          session: _Session(),
        );
        await controller.loadQueue([_item('one')]);
        await controller.play();
        await player.updatePosition(const Duration(seconds: 4));
        final old = media.snapshot!;
        final gate = Completer<void>();
        final diagnostic = controller.runDiagnostic(() => gate.future);
        final checked = fails
            ? expectLater(diagnostic, throwsStateError)
            : diagnostic;
        await Future<void>.delayed(Duration.zero);
        expect(player.state, LocalPlayerState.paused);
        expect(media.snapshot!.actions, isEmpty);
        await controller.play();
        await controller.loadQueue([_item('must-not-load')]);
        await media.handleCommand(
          SystemMediaCommand(SystemMediaAction.play, old.id, old.generation),
        );
        expect(player.currentItem!.trackId, 'one');
        if (fails) {
          gate.completeError(StateError('diagnostic failed'));
        } else {
          gate.complete();
        }
        await checked;
        expect(player.state, LocalPlayerState.paused);
        expect(player.playbackState.position.inSeconds, 4);
        expect(media.snapshot!.actions, contains(SystemMediaAction.play));
        await media.handleCommand(
          SystemMediaCommand(SystemMediaAction.play, old.id, old.generation),
        );
        expect(player.state, LocalPlayerState.paused);
        await media.dispose();
        await controller.dispose();
      },
    );
  }

  for (final oldFails in [false, true]) {
    test(
      'serialized publisher handles older/newer failures and disposal: oldFails=$oldFails',
      () async {
        final player = FakeLocalPlayer();
        final controller = SerializedLocalPlaybackController(player);
        final session = _Session();
        final media = PlaybackSystemMediaCoordinator(
          controller: controller,
          session: session,
        );
        await media.flush();
        final gate = Completer<void>();
        session.gate = gate;
        session.failure = oldFails;
        await controller.loadQueue([_item('one')]);
        await Future<void>.value();
        await controller.loadQueue([_item('two')]);
        session.failure = !oldFails;
        gate.complete();
        await media.flush();
        expect(media.hasPublishFailure, !oldFails);
        if (oldFails) expect(session.values.last!.title, contains('two'));
        session.failure = false;
        await controller.play();
        await media.flush();
        expect(media.hasPublishFailure, isFalse);
        expect(player.state, LocalPlayerState.playing);
        expect(session.values.last!.title, contains('two'));
        await media.dispose();
        expect(session.handler, isNull);
        expect(session.cleared, isTrue);
        await controller.dispose();
      },
    );
  }
}

Future<void> _send(
  PlaybackSystemMediaCoordinator media,
  SystemMediaAction action, [
  Duration? position,
]) {
  final snapshot = media.snapshot!;
  return media.handleCommand(
    SystemMediaCommand(
      action,
      snapshot.id,
      snapshot.generation,
      position: position,
    ),
  );
}

LocalPlaybackQueueItem _item(String id, {String? artist, String? album}) =>
    LocalPlaybackQueueItem(
      trackId: id,
      recordingId: 'recording',
      workId: 'work',
      displayTitle: id,
      path: '/private/fixture/$id.wav',
      usesLinkedFile: true,
      workTitle: '작품',
      recordingTitle: '녹음명은 아티스트가 아님',
      artist: artist,
      album: album,
    );

class _Session implements SystemMediaSession {
  Future<void> Function(SystemMediaCommand)? handler;
  final values = <SystemMediaSnapshot?>[];
  Completer<void>? gate;
  bool failure = false;
  bool cleared = false;
  @override
  void setCommandHandler(Future<void> Function(SystemMediaCommand)? value) =>
      handler = value;
  @override
  Future<void> publish(SystemMediaSnapshot? value) async {
    final pending = gate;
    final fails = failure;
    gate = null;
    if (pending != null) await pending.future;
    if (fails) throw StateError('fixture publish failed');
    values.add(value);
  }

  @override
  Future<void> dispose() async {
    handler = null;
    cleared = true;
  }
}

class _GatePlayer extends FakeLocalPlayer {
  _GatePlayer() : super(trackDurations: const {'one': Duration(seconds: 60)});
  Completer<void>? gate;
  @override
  Future<void> persistPosition() async {
    final pending = gate;
    gate = null;
    if (pending != null) await pending.future;
    await super.persistPosition();
  }
}

class _PendingProbe extends LocalPlaybackFileProbe {
  final existsResult = Completer<bool>();
  @override
  Future<bool> exists(String path) => existsResult.future;
}
