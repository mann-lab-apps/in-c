import 'package:classical_local_library/local_playback.dart';
import 'package:flutter_test/flutter_test.dart';

import 'dart:async';

import 'package:classical_local_library/playback_history.dart';

const item = LocalPlaybackQueueItem(
  trackId: 'same',
  recordingId: 'r',
  workId: 'w',
  displayTitle: 'same',
  path: '/fixture/a.wav',
  usesLinkedFile: true,
  workTitle: '',
  recordingTitle: '',
);
void main() {
  for (final replace in [false, true]) {
    test(
      'queued selection and late seek cannot overwrite a newer ${replace ? 'queue' : 'selection'}',
      () async {
        final delegate = _GatedPlayer(),
            p = SerializedLocalPlaybackController(delegate);
        await p.loadQueue([item, item, item]);
        await p.play();
        delegate.gate = Completer<void>();
        final seek = p.seek(const Duration(seconds: 8));
        await delegate.entered.future;
        final old = p.selectQueueItem(1);
        final latest = replace ? p.loadQueue([item]) : p.selectQueueItem(2);
        delegate.gate!.complete();
        await seek;
        await old;
        await latest;
        expect(p.playbackState.currentIndex, replace ? 0 : 2);
        expect(p.playbackState.position, Duration.zero);
        expect(delegate.selections, replace ? isEmpty : [2]);
        await p.dispose();
      },
    );
  }
  test('indexed start never records earlier queue items as listened', () async {
    final history = MemoryPlaybackHistoryStore(), p = FakeLocalPlayer();
    final coordinator = PlaybackHistoryCoordinator(
      repository: PlaybackHistoryRepository(history),
    );
    final subscription = p.states.listen(
      (s) => unawaited(coordinator.observe(s)),
    );
    final queue = [
      for (var i = 0; i < 3; i++)
        LocalPlaybackQueueItem(
          trackId: 'track-$i',
          recordingId: 'r',
          workId: 'w',
          displayTitle: '$i',
          path: '/fixture/$i.wav',
          usesLinkedFile: true,
          workTitle: '',
          recordingTitle: '',
        ),
    ];
    await p.setShuffleEnabled(true);
    await p.loadQueue(queue, initialIndex: 1);
    expect(p.currentItem!.trackId, 'track-1');
    await p.play();
    await coordinator.closeCurrent();
    expect((await history.loadRecent()).map((e) => e.trackId), ['track-1']);
    await subscription.cancel();
    await coordinator.dispose();
    await p.dispose();
  });
  test(
    'initial index preserves earlier occurrences and paused/ready selection',
    () async {
      final p = SerializedLocalPlaybackController(FakeLocalPlayer());
      await p.loadQueue([item, item, item], initialIndex: 1);
      expect(p.playbackState.queue, hasLength(3));
      expect(p.playbackState.currentIndex, 1);
      await p.selectQueueItem(2);
      expect(p.playbackState.playerState, LocalPlayerState.ready);
      await p.play();
      await p.pause();
      await p.seek(const Duration(seconds: 2));
      await p.selectQueueItem(0);
      expect(p.playbackState.currentIndex, 0);
      expect(p.playbackState.position, Duration.zero);
      expect(p.playbackState.playerState, LocalPlayerState.paused);
      await p.play();
      await p.selectQueueItem(2);
      expect(p.playbackState.playerState, LocalPlayerState.playing);
      await p.next();
      expect(p.playbackState.currentIndex, 3);
      await p.selectQueueItem(1);
      expect(p.playbackState.currentIndex, 1);
      expect(p.playbackState.playerState, LocalPlayerState.paused);
      await expectLater(p.loadQueue([item], initialIndex: 2), throwsRangeError);
      expect(p.playbackState.queue, hasLength(3));
      await p.dispose();
    },
  );
}

class _GatedPlayer extends FakeLocalPlayer {
  Completer<void>? gate;
  final entered = Completer<void>();
  final selections = <int>[];
  @override
  Future<void> seek(Duration position) async {
    if (!entered.isCompleted) entered.complete();
    await gate?.future;
    await super.seek(position);
  }

  @override
  Future<void> selectQueueItem(int index) async {
    selections.add(index);
    await super.selectQueueItem(index);
  }
}
