import 'dart:async';

import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/main.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/playback_position.dart';
import 'package:classical_local_library/scan_locations.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

const _queue = [
  LocalPlaybackQueueItem(
    trackId: 'local-file:lock-test',
    recordingId: '',
    workId: '',
    displayTitle: '잠금 테스트',
    path: '/fixture/lock.wav',
    usesLinkedFile: true,
    workTitle: '',
    recordingTitle: '',
  ),
];

void main() {
  testWidgets('iOS lifecycle은 재생·큐·위치를 유지하고 위치만 저장한다', (tester) async {
    final store = MemoryPlaybackPositionStore();
    final player = FakeLocalPlayer(
      positionCoordinator: PlaybackPositionCoordinator(store: store),
      trackDurations: const {'local-file:lock-test': Duration(minutes: 2)},
    );
    await _launch(tester, player);
    await player.loadQueue(_queue);
    await player.play();
    await player.updatePosition(const Duration(seconds: 1));
    await player.updatePosition(const Duration(seconds: 25));
    expect((await store.load(_queue.first.path))?.position.inSeconds, 1);

    for (final state in [
      AppLifecycleState.inactive,
      AppLifecycleState.hidden,
      AppLifecycleState.paused,
      AppLifecycleState.detached,
      AppLifecycleState.resumed,
    ]) {
      tester.binding.handleAppLifecycleStateChanged(state);
      await tester.pump();
      expect(player.state, LocalPlayerState.playing, reason: '$state');
      expect(player.playbackState.currentIndex, 0);
      expect(player.playbackState.queue, _queue);
      expect(player.playbackState.position.inSeconds, 25);
    }
    expect((await store.load(_queue.first.path))?.position.inSeconds, 25);
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
  }, variant: TargetPlatformVariant.only(TargetPlatform.iOS));

  for (final state in [
    LocalPlayerState.idle,
    LocalPlayerState.ready,
    LocalPlayerState.paused,
    LocalPlayerState.stopped,
  ]) {
    testWidgets('iOS 복귀는 $state 상태에서 자동 재생하지 않는다', (tester) async {
      final player = FakeLocalPlayer();
      await _launch(tester, player);
      if (state != LocalPlayerState.idle) await player.loadQueue(_queue);
      if (state == LocalPlayerState.paused) {
        await player.play();
        await player.pause();
      }
      if (state == LocalPlayerState.stopped) await player.stop();
      for (final lifecycle in [
        AppLifecycleState.inactive,
        AppLifecycleState.hidden,
        AppLifecycleState.paused,
        AppLifecycleState.resumed,
      ]) {
        tester.binding.handleAppLifecycleStateChanged(lifecycle);
        await tester.pump();
        expect(player.state, state);
      }
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump();
    }, variant: TargetPlatformVariant.only(TargetPlatform.iOS));
  }

  testWidgets('겹친 lifecycle 저장과 저장 실패는 재생을 멈추지 않고 다음 저장이 복구된다', (tester) async {
    final player = _DelayedCheckpointPlayer();
    await _launch(tester, player);
    await player.loadQueue(_queue);
    await player.play();
    final checkpoint = Completer<void>();
    player.checkpoint = checkpoint;
    for (final state in [
      AppLifecycleState.inactive,
      AppLifecycleState.hidden,
      AppLifecycleState.paused,
    ]) {
      tester.binding.handleAppLifecycleStateChanged(state);
    }
    await tester.pump();
    expect(player.checkpoints, 1);
    expect(player.state, LocalPlayerState.playing);
    checkpoint.completeError(StateError('fixture storage failure'));
    await tester.pump();
    expect(tester.takeException(), isNull);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    await tester.pump();
    expect(player.checkpoints, 2);
    expect(player.state, LocalPlayerState.playing);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
  }, variant: TargetPlatformVariant.only(TargetPlatform.iOS));
}

Future<void> _launch(
  WidgetTester tester,
  LocalPlaybackController player,
) async {
  tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
  await tester.pumpWidget(
    ClassicalLocalLibraryApp(
      initialLibrary: emptyClassicalLibrary,
      enableDemoFeatures: false,
      playbackController: player,
      scanRepository: ScannedAudioRepository(MemoryScannedAudioStore()),
      scanLocationRepository: ScanLocationRepository(MemoryScanLocationStore()),
      metadataCandidateRepository: MetadataCandidateRepository(
        MemoryMetadataCandidateStore(),
      ),
      fileTrackLinkRepository: AudioFileTrackLinkRepository(
        MemoryAudioFileTrackLinkStore(),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

class _DelayedCheckpointPlayer extends FakeLocalPlayer {
  Completer<void>? checkpoint;
  int checkpoints = 0;

  @override
  Future<void> persistPosition() async {
    checkpoints += 1;
    final pending = checkpoint;
    checkpoint = null;
    if (pending != null) await pending.future;
    await super.persistPosition();
  }
}
