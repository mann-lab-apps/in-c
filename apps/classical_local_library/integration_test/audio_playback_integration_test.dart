import 'dart:async';
import 'dart:io';

import 'package:classical_local_library/audio_test_fixture.dart';
import 'package:classical_local_library/just_audio_playback.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/playback_history.dart';
import 'package:classical_local_library/playback_position.dart';
import 'package:classical_local_library/playback_state_trace.dart';
import 'package:classical_local_library/sqlite_database.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:path_provider/path_provider.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets(
    'native FLAC decoder advances, seeks and completes synthetic audio',
    (tester) async {
      final temporary = await getTemporaryDirectory();
      final directory = await temporary.createTemp('flac-check-');
      final player = JustAudioLocalPlaybackController();
      addTearDown(() async {
        await player.dispose();
        await directory.delete(recursive: true);
      });
      final path = await _copyAsset(
        'assets/audio_test/movement_1.flac',
        directory,
      );
      await player.loadQueue([_queueItem('flac', path, 'FLAC 합성 테스트')]);
      expect(player.playbackState.playerState, LocalPlayerState.ready);
      expect(
        player.playbackState.duration?.inMilliseconds,
        inInclusiveRange(2200, 2600),
      );
      await player.play();
      await _waitUntil(
        () => player.playbackState.position.inMilliseconds >= 300,
        player,
        description: 'FLAC position',
      );
      await player.seek(const Duration(milliseconds: 1120));
      expect(
        player.playbackState.position.inMilliseconds,
        inInclusiveRange(1000, 1350),
      );
      await _waitUntil(
        () => player.playbackState.playerState == LocalPlayerState.completed,
        player,
        description: 'FLAC completed',
      );
      expect(player.playbackState.failure, isNull);
    },
  );

  testWidgets('native audio queue updates playback, position, and history', (
    tester,
  ) async {
    final fixtureDirectory = Directory(
      '${(await getTemporaryDirectory()).path}/classical-audio-integration',
    );
    if (await fixtureDirectory.exists()) {
      await fixtureDirectory.delete(recursive: true);
    }
    await fixtureDirectory.create(recursive: true);
    addTearDown(() async {
      if (await fixtureDirectory.exists()) {
        await fixtureDirectory.delete(recursive: true);
      }
    });

    final firstPath = await _copyFixture(
      audioFixtureSpecifications[0],
      fixtureDirectory,
    );
    final secondPath = await _copyFixture(
      audioFixtureSpecifications[1],
      fixtureDirectory,
    );
    final aacPath = await _copyAsset(
      'assets/audio_test/movement_1_aac.m4a',
      fixtureDirectory,
    );
    final alacPath = await _copyAsset(
      'assets/audio_test/movement_1_alac.m4a',
      fixtureDirectory,
    );
    final database = await ClassicalLocalDatabase(
      path: '${fixtureDirectory.path}/integration.sqlite',
    ).open();
    addTearDown(database.close);
    final positionStore = SqlitePlaybackPositionStore(database);
    final historyStore = SqlitePlaybackHistoryStore(database);
    final positionCoordinator = PlaybackPositionCoordinator(
      store: positionStore,
      policy: const PlaybackPositionPolicy(
        completionThreshold: Duration(milliseconds: 200),
      ),
      minimumSaveInterval: const Duration(milliseconds: 100),
    );
    final historyCoordinator = PlaybackHistoryCoordinator(
      repository: PlaybackHistoryRepository(historyStore),
    );
    final player = JustAudioLocalPlaybackController(
      positionCoordinator: positionCoordinator,
    );
    final stateSubscription = player.states.listen((state) {
      unawaited(historyCoordinator.observe(state));
    });
    addTearDown(() async {
      await stateSubscription.cancel();
      await historyCoordinator.dispose();
      await player.dispose();
    });

    final queue = [
      _queueItem('fixture-track-1', firstPath, '테스트 1악장'),
      _queueItem('fixture-track-2', secondPath, '테스트 2악장'),
    ];
    await player.loadQueue(queue);
    expect(player.playbackState.playerState, LocalPlayerState.ready);
    expect(player.playbackState.duration, isNotNull);
    expect(
      player.playbackState.duration!.inMilliseconds,
      inInclusiveRange(2200, 2600),
    );

    await player.play();
    await _waitUntil(
      () => player.playbackState.position >= const Duration(milliseconds: 300),
      player,
      description: 'first movement position increase',
    );
    await player.pause();
    final pausedAt = player.playbackState.position;
    await Future<void>.delayed(const Duration(milliseconds: 350));
    expect(player.playbackState.playerState, LocalPlayerState.paused);
    expect(
      (player.playbackState.position - pausedAt).abs(),
      lessThan(const Duration(milliseconds: 150)),
    );

    await player.resume();
    await _waitUntil(
      () =>
          player.playbackState.position >=
          pausedAt + const Duration(milliseconds: 200),
      player,
      description: 'position increase after resume',
    );
    await player.seek(const Duration(seconds: 1));
    expect(
      player.playbackState.position.inMilliseconds,
      inInclusiveRange(850, 1300),
    );
    await player.seek(const Duration(milliseconds: 1120));
    expect(
      player.playbackState.position.inMilliseconds,
      inInclusiveRange(1000, 1320),
    );

    await player.next();
    await _waitUntil(
      () =>
          player.playbackState.currentIndex == 1 &&
          player.playbackState.playerState == LocalPlayerState.playing,
      player,
      description: 'second movement transition',
    );
    expect(
      player.playbackState.position,
      lessThan(const Duration(milliseconds: 500)),
    );
    await _waitUntil(
      () => player.playbackState.playerState == LocalPlayerState.completed,
      player,
      timeout: const Duration(seconds: 6),
      description: 'playlist completion',
    );
    await historyCoordinator.closeCurrent();

    final firstHistory = await historyStore.loadForTrack('fixture-track-1');
    final secondHistory = await historyStore.loadForTrack('fixture-track-2');
    expect(firstHistory, hasLength(1));
    expect(firstHistory.single.listenedMillis, greaterThan(0));
    expect(firstHistory.single.status, PlaybackHistoryStatus.partial);
    expect(secondHistory, hasLength(1));
    expect(secondHistory.single.listenedMillis, greaterThan(0));
    expect(secondHistory.single.status, PlaybackHistoryStatus.completed);

    final savedFirstPosition = await positionStore.load(firstPath);
    final savedSecondPosition = await positionStore.load(secondPath);
    expect(savedFirstPosition, isNotNull);
    expect(savedFirstPosition!.position, greaterThan(Duration.zero));
    expect(savedFirstPosition.isCompleted, isFalse);
    expect(savedSecondPosition?.isCompleted, isTrue);

    await stateSubscription.cancel();
    await historyCoordinator.dispose();
    await player.dispose();

    final restoredPlayer = JustAudioLocalPlaybackController(
      positionCoordinator: PlaybackPositionCoordinator(
        store: positionStore,
        policy: const PlaybackPositionPolicy(
          completionThreshold: Duration(milliseconds: 200),
        ),
      ),
    );
    addTearDown(restoredPlayer.dispose);
    await restoredPlayer.loadQueue(queue);
    expect(
      restoredPlayer.playbackState.position.inMilliseconds,
      closeTo(savedFirstPosition.positionMillis, 250),
    );
    await restoredPlayer.next();
    expect(restoredPlayer.playbackState.currentIndex, 1);
    expect(
      restoredPlayer.playbackState.position,
      lessThan(const Duration(milliseconds: 300)),
    );
    await restoredPlayer.stop();
    expect(restoredPlayer.playbackState.playerState, LocalPlayerState.stopped);

    await restoredPlayer.loadQueue([
      _queueItem('fixture-alac', alacPath, 'ALAC 테스트 파일'),
    ]);
    expect(restoredPlayer.playbackState.playerState, LocalPlayerState.ready);
    expect(
      restoredPlayer.playbackState.duration!.inMilliseconds,
      inInclusiveRange(2200, 2600),
    );
    await restoredPlayer.play();
    await _waitUntil(
      () =>
          restoredPlayer.playbackState.position >=
          const Duration(milliseconds: 300),
      restoredPlayer,
      description: 'ALAC position increase',
    );
    await restoredPlayer.stop();
    expect(restoredPlayer.playbackState.playerState, LocalPlayerState.stopped);
    await restoredPlayer.loadQueue([queue.first]);
    expect(restoredPlayer.playbackState.playerState, LocalPlayerState.ready);

    await restoredPlayer.play();
    await Future<void>.delayed(const Duration(milliseconds: 150));
    await restoredPlayer.loadQueue([
      _queueItem('fixture-aac-replacement', aacPath, 'AAC 교체 큐'),
    ]);
    expect(
      restoredPlayer.playbackState.currentItem?.trackId,
      'fixture-aac-replacement',
    );
    await Future<void>.delayed(const Duration(milliseconds: 200));
    expect(
      restoredPlayer.playbackState.currentItem?.trackId,
      'fixture-aac-replacement',
      reason: '이전 queue의 늦은 native event가 교체된 queue를 덮어쓰지 않는다',
    );

    final corruptPath = '${fixtureDirectory.path}/corrupt.wav';
    await File(corruptPath).writeAsBytes(const [0, 1, 2, 3], flush: true);
    await restoredPlayer.loadQueue([
      _queueItem('fixture-corrupt', corruptPath, '손상된 테스트 파일'),
    ]);
    await _waitUntil(
      () => restoredPlayer.playbackState.playerState == LocalPlayerState.error,
      restoredPlayer,
      description: 'corrupt WAV load failure',
    );
    expect(
      restoredPlayer.playbackState.failure?.kind,
      LocalPlaybackFailureKind.loadFailed,
    );
    await restoredPlayer.stop();
    await restoredPlayer.loadQueue([queue.first]);
    expect(restoredPlayer.playbackState.playerState, LocalPlayerState.ready);

    await restoredPlayer.loadQueue([
      _queueItem('fixture-aac', aacPath, 'AAC 테스트 파일'),
    ]);
    expect(restoredPlayer.playbackState.playerState, LocalPlayerState.ready);
    expect(
      restoredPlayer.playbackState.duration!.inMilliseconds,
      inInclusiveRange(2200, 2800),
    );
    await restoredPlayer.play();
    await _waitUntil(
      () =>
          restoredPlayer.playbackState.position >=
          const Duration(milliseconds: 300),
      restoredPlayer,
      description: 'AAC position increase',
    );
    await restoredPlayer.stop();
    expect(restoredPlayer.playbackState.playerState, LocalPlayerState.stopped);

    final soakTrace = PlaybackStateTrace();
    for (var iteration = 0; iteration < 10; iteration += 1) {
      final usesAac = iteration.isOdd;
      final item = _queueItem(
        'soak-${usesAac ? 'aac' : 'wav'}-$iteration',
        usesAac ? aacPath : firstPath,
        '반복 재생 $iteration',
      );
      await restoredPlayer.loadQueue([item]);
      soakTrace.record('load-$iteration', restoredPlayer.playbackState);
      await restoredPlayer.play();
      await _waitUntil(
        () =>
            restoredPlayer.playbackState.position >=
            const Duration(milliseconds: 120),
        restoredPlayer,
        description: 'bounded soak position iteration=$iteration',
        trace: soakTrace,
      );
      await Future.wait([
        restoredPlayer.seek(const Duration(milliseconds: 250)),
        restoredPlayer.seek(const Duration(milliseconds: 400)),
        restoredPlayer.seek(const Duration(milliseconds: 300)),
      ]);
      soakTrace.record('seek-race-$iteration', restoredPlayer.playbackState);
      expect(restoredPlayer.playbackState.failure, isNull);
      expect(restoredPlayer.playbackState.currentItem?.trackId, item.trackId);
      expect(
        restoredPlayer.playbackState.position.inMilliseconds,
        inInclusiveRange(220, 550),
        reason: '마지막 300ms seek 요청이 유지되어야 한다.\n${soakTrace.diagnosticText}',
      );
      await restoredPlayer.pause();
      soakTrace.record('pause-$iteration', restoredPlayer.playbackState);
      expect(
        restoredPlayer.playbackState.playerState,
        LocalPlayerState.paused,
        reason: soakTrace.diagnosticText,
      );
      await restoredPlayer.resume();
      soakTrace.record('resume-$iteration', restoredPlayer.playbackState);
      expect(
        restoredPlayer.playbackState.playerState,
        LocalPlayerState.playing,
        reason: soakTrace.diagnosticText,
      );
      await restoredPlayer.stop();
      soakTrace.record('stop-$iteration', restoredPlayer.playbackState);
      expect(
        restoredPlayer.playbackState.playerState,
        LocalPlayerState.stopped,
        reason: soakTrace.diagnosticText,
      );
    }

    var stateCountAfterDispose = 0;
    final disposeSubscription = restoredPlayer.states.listen((_) {
      stateCountAfterDispose += 1;
    });
    await restoredPlayer.dispose();
    await Future<void>.delayed(const Duration(milliseconds: 150));
    expect(stateCountAfterDispose, 0);
    await disposeSubscription.cancel();
  }, timeout: const Timeout(Duration(seconds: 45)));
}

Future<String> _copyFixture(
  PcmWaveFixtureSpecification specification,
  Directory directory,
) async {
  final bytes = await rootBundle.load(
    'assets/audio_test/${specification.fileName}',
  );
  final fixtureBytes = bytes.buffer.asUint8List(
    bytes.offsetInBytes,
    bytes.lengthInBytes,
  );
  validatePcmWaveFixture(fixtureBytes, specification);
  final target = File('${directory.path}/${specification.fileName}');
  await target.writeAsBytes(fixtureBytes, flush: true);
  return target.path;
}

Future<String> _copyAsset(String asset, Directory directory) async {
  final bytes = await rootBundle.load(asset);
  final target = File('${directory.path}/${asset.split('/').last}');
  await target.writeAsBytes(
    bytes.buffer.asUint8List(bytes.offsetInBytes, bytes.lengthInBytes),
    flush: true,
  );
  return target.path;
}

LocalPlaybackQueueItem _queueItem(String trackId, String path, String title) {
  return LocalPlaybackQueueItem(
    trackId: trackId,
    recordingId: 'fixture-recording',
    workId: 'fixture-work',
    displayTitle: title,
    path: path,
    usesLinkedFile: true,
    workTitle: '네이티브 재생 테스트 작품',
    recordingTitle: '합성 PCM 테스트 녹음',
  );
}

Future<void> _waitUntil(
  bool Function() predicate,
  LocalPlaybackController player, {
  required String description,
  Duration timeout = const Duration(seconds: 4),
  PlaybackStateTrace? trace,
}) async {
  final deadline = DateTime.now().add(timeout);
  while (!predicate()) {
    if (DateTime.now().isAfter(deadline)) {
      trace?.record('timeout:$description', player.playbackState);
      final diagnostic = trace == null ? '' : '\n${trace.diagnosticText}';
      fail(
        '$description timed out: ${player.playbackState.summary}$diagnostic',
      );
    }
    await Future<void>.delayed(const Duration(milliseconds: 50));
  }
}
