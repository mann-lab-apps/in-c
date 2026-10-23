import 'dart:math';

import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/local_audio_scanner.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/metadata_overrides.dart';
import 'package:classical_local_library/playback_audio_session.dart';
import 'package:classical_local_library/playback_position.dart';
import 'package:classical_local_library/playback_planner.dart';
import 'package:classical_local_library/playback_state_trace.dart';
import 'package:classical_local_library/sample_classical_library.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('작품 단위 큐는 악장 순서를 유지하고 연결 파일 경로를 사용한다', () {
    final planner = ClassicalPlaybackPlanner(
      library: sampleClassicalLibrary,
      workSelector: (works) => works.first,
      recordingSelector: (recordings) => recordings.first,
    );
    final plan = planner.createPlan(PlaybackMode.workRandom);
    final firstTrack = plan.items.first.track;
    final linkedFile = _audioFile('/Music/Linked/01 Allegro.flac')
        .copyWith(importStatus: AudioImportStatus.linked);

    final queue = const LocalPlaybackQueueBuilder().build(
      plan: plan,
      scannedFiles: [linkedFile],
      links: [
        AudioFileTrackLink(
          fileId: linkedFile.id,
          trackId: firstTrack.id,
          linkedAtMillis: DateTime.utc(2026, 10, 13).millisecondsSinceEpoch,
        ),
      ],
    );

    expect(
      queue.map((item) => item.trackId),
      plan.items.map((item) => item.track.id),
    );
    expect(queue.first.path, linkedFile.path);
    expect(queue.first.usesLinkedFile, isTrue);
    expect(queue.first.fileSourceLabel, '연결 파일');
    expect(queue.first.workTitle, plan.work.title.ko);
    expect(queue.first.recordingTitle, plan.recording.title.ko);
    expect(queue[1].usesLinkedFile, isFalse);
    expect(queue[1].fileSourceLabel, '샘플 파일');
  });

  test('연결된 악장만 재생해도 원래 작품 순서를 유지하고 누락을 보고한다', () {
    final planner = ClassicalPlaybackPlanner(
      library: sampleClassicalLibrary,
      workSelector: (works) => works.first,
      recordingSelector: (recordings) => recordings.first,
    );
    final plan = planner.createPlan(PlaybackMode.workRandom);
    final linkedIndexes = [0, 2];
    final files = [
      for (final index in linkedIndexes)
        _audioFile('/Music/${index + 1}.flac')
            .copyWith(importStatus: AudioImportStatus.linked),
    ];
    final links = [
      for (var index = 0; index < linkedIndexes.length; index += 1)
        AudioFileTrackLink(
          fileId: files[index].id,
          trackId: plan.items[linkedIndexes[index]].track.id,
          linkedAtMillis: index,
        ),
    ];

    final result = const LocalPlaybackQueueBuilder().buildDetailed(
      plan: plan,
      scannedFiles: files,
      links: links,
    );

    expect(result.queue.map((item) => item.trackId), [
      plan.items[0].track.id,
      plan.items[2].track.id,
    ]);
    expect(result.missingCount, plan.items.length - 2);
    expect(result.isComplete, isFalse);
    expect(result.missingTitles, isNotEmpty);
  });

  test('연결 파일의 교정 메타데이터를 큐 작품·악장 라벨에 사용한다', () {
    final planner = ClassicalPlaybackPlanner(
      library: sampleClassicalLibrary,
      workSelector: (works) => works.first,
      recordingSelector: (recordings) => recordings.first,
    );
    final plan = planner.createPlan(PlaybackMode.workRandom);
    final linkedFile = _audioFile('/Music/corrected.flac')
        .copyWith(importStatus: AudioImportStatus.linked);
    final override = MetadataOverride(
      fileId: linkedFile.id,
      values: const {
        MetadataField.workTitle: '교정된 작품명',
        MetadataField.movementTitle: '교정된 악장명',
      },
      sources: const {
        MetadataField.workTitle: MetadataValueSource.user,
        MetadataField.movementTitle: MetadataValueSource.musicBrainz,
      },
      updatedAtMillis: 1,
    );

    final result = const LocalPlaybackQueueBuilder().buildDetailed(
      plan: plan,
      scannedFiles: [linkedFile],
      links: [
        AudioFileTrackLink(
          fileId: linkedFile.id,
          trackId: plan.items.first.track.id,
          linkedAtMillis: 1,
        ),
      ],
      candidates: [
        MetadataCandidate(
          fileId: linkedFile.id,
          filePath: linkedFile.path,
          fileName: linkedFile.fileName!,
        ),
      ],
      overrides: [override],
    );

    expect(result.queue.single.workTitle, '교정된 작품명');
    expect(result.queue.single.displayTitle, '교정된 악장명');
    expect(result.workTitle, '교정된 작품명');
  });

  test('완전한 작품 정책은 악장이 하나라도 누락되면 빈 큐를 반환한다', () {
    final planner = ClassicalPlaybackPlanner(
      library: sampleClassicalLibrary,
      workSelector: (works) => works.first,
      recordingSelector: (recordings) => recordings.first,
    );
    final plan = planner.createPlan(PlaybackMode.workRandom);
    final first = _audioFile('/Music/1.flac')
        .copyWith(importStatus: AudioImportStatus.linked);

    final result = const LocalPlaybackQueueBuilder().buildDetailed(
      plan: plan,
      scannedFiles: [first],
      links: [
        AudioFileTrackLink(
          fileId: first.id,
          trackId: plan.items.first.track.id,
          linkedAtMillis: 1,
        ),
      ],
      missingPolicy: ClassicalQueueMissingPolicy.completeOnly,
    );

    expect(result.queue, isEmpty);
    expect(result.missingCount, greaterThan(0));
  });

  test('재생 계획에 중복 트랙이 있어도 큐에는 한 번만 포함한다', () {
    final planner = ClassicalPlaybackPlanner(
      library: sampleClassicalLibrary,
      workSelector: (works) => works.first,
      recordingSelector: (recordings) => recordings.first,
    );
    final original = planner.createPlan(PlaybackMode.workRandom);
    final plan = PlaybackPlan(
      mode: original.mode,
      work: original.work,
      recording: original.recording,
      items: [...original.items, original.items.first],
    );

    final result = const LocalPlaybackQueueBuilder().buildDetailed(
      plan: plan,
      scannedFiles: const [],
      links: const [],
      missingPolicy: ClassicalQueueMissingPolicy.showPlanned,
    );

    expect(result.queue, hasLength(original.items.length));
    expect(
      result.queue.map((item) => item.trackId).toSet(),
      hasLength(original.items.length),
    );
  });

  test('재생 큐의 작품과 녹음 ID는 대표 별칭으로 정규화된다', () {
    final planner = ClassicalPlaybackPlanner(
      library: sampleClassicalLibrary,
      workSelector: (works) => works.first,
      recordingSelector: (recordings) => recordings.first,
    );
    final plan = planner.createPlan(PlaybackMode.workRandom);
    final queue = const LocalPlaybackQueueBuilder().build(
      plan: plan,
      scannedFiles: const [],
      links: const [],
      workAliases: {plan.work.id: 'canonical-work'},
      recordingAliases: {plan.recording.id: 'canonical-recording'},
    );

    expect(queue.first.workId, 'canonical-work');
    expect(queue.first.recordingId, 'canonical-recording');
  });

  test('queue load 후 첫 항목을 ready 상태로 노출한다', () async {
    final player = FakeLocalPlayer();
    addTearDown(player.dispose);

    await player.loadQueue(_queue());

    expect(player.state, LocalPlayerState.ready);
    expect(player.currentItem?.trackId, 'track-1');
    expect(player.playbackState.currentItem?.displayTitle, '1악장');
    expect(player.playbackState.summary, '준비됨 · 1/2 · 교향곡 5번 · 1악장');
  });

  test('fake player는 play, pause, resume, next, stop 상태를 관리한다', () async {
    final player = FakeLocalPlayer();
    addTearDown(player.dispose);

    await player.loadQueue(_queue());
    await player.play();
    expect(player.state, LocalPlayerState.playing);
    expect(player.currentItem?.trackId, 'track-1');

    await player.pause();
    expect(player.state, LocalPlayerState.paused);

    await player.resume();
    expect(player.state, LocalPlayerState.playing);

    await player.next();
    expect(player.currentItem?.trackId, 'track-2');

    await player.stop();
    expect(player.state, LocalPlayerState.stopped);
    expect(player.currentItem?.trackId, 'track-1');
  });

  test('마지막 항목에서 next를 누르면 completed 상태가 된다', () async {
    final player = FakeLocalPlayer();
    addTearDown(player.dispose);
    await player.playQueue(_queue());

    await player.next();
    await player.next();

    expect(player.state, LocalPlayerState.completed);
    expect(player.currentItem, isNull);
    expect(player.playbackState.summary, '완료');
  });

  test('빈 큐와 샘플 경로는 구조화된 오류 상태가 된다', () async {
    final player = FakeLocalPlayer(
      validator: const LocalPlaybackQueueValidator(fileProbe: _FileProbe()),
    );
    addTearDown(player.dispose);

    await player.loadQueue(const []);
    expect(
      player.playbackState.failure?.kind,
      LocalPlaybackFailureKind.emptyQueue,
    );

    await player.loadQueue([_queue()[1]]);
    expect(player.state, LocalPlayerState.error);
    expect(
      player.playbackState.failure?.kind,
      LocalPlaybackFailureKind.unlinkedFile,
    );
    expect(player.playbackState.failure?.path, '/music/2.flac');
  });

  test('누락 파일 오류 후 stop과 새 queue load로 복구한다', () async {
    final probe = _FileProbe(existingPaths: {'/music/1.flac'});
    final player = FakeLocalPlayer(
      validator: LocalPlaybackQueueValidator(fileProbe: probe),
    );
    addTearDown(player.dispose);
    final missingQueue = [_queue().first];

    probe.existingPaths.clear();
    await player.loadQueue(missingQueue);
    expect(
      player.playbackState.failure?.kind,
      LocalPlaybackFailureKind.missingFile,
    );

    await player.stop();
    expect(player.state, LocalPlayerState.stopped);
    expect(player.playbackState.failure, isNull);

    probe.existingPaths.add('/music/1.flac');
    await player.loadQueue(missingQueue);
    await player.play();
    expect(player.state, LocalPlayerState.playing);
    expect(player.playbackState.failure, isNull);
  });

  test('지원하지 않는 확장자는 파일 확인 전에 거절한다', () async {
    const validator = LocalPlaybackQueueValidator(fileProbe: _FileProbe());
    final failure = await validator.validate([
      const LocalPlaybackQueueItem(
        trackId: 'track-text',
        recordingId: 'recording-1',
        workId: 'work-1',
        displayTitle: '잘못된 파일',
        path: '/music/readme.txt',
        usesLinkedFile: true,
        workTitle: '테스트 작품',
        recordingTitle: '테스트 녹음',
      ),
    ]);

    expect(failure?.kind, LocalPlaybackFailureKind.unsupportedFormat);
    expect(failure?.path, '/music/readme.txt');
  });

  test('seek는 음수와 duration 이후 위치를 안전하게 보정한다', () async {
    final player = FakeLocalPlayer(
      trackDurations: const {'track-1': Duration(minutes: 2)},
    );
    addTearDown(player.dispose);
    await player.loadQueue(_queue());

    await player.seek(const Duration(seconds: -5));
    expect(player.playbackState.normalizedPosition, Duration.zero);
    expect(player.playbackState.isSeeking, isFalse);

    await player.seek(const Duration(minutes: 3));
    expect(player.playbackState.normalizedPosition, const Duration(minutes: 2));
  });

  test('연속 seek는 마지막 요청 위치를 유지한다', () async {
    final player = FakeLocalPlayer(
      trackDurations: const {'track-1': Duration(minutes: 2)},
    );
    addTearDown(player.dispose);
    await player.loadQueue(_queue());

    await Future.wait([
      player.seek(const Duration(seconds: 10)),
      player.seek(const Duration(seconds: 30)),
      player.seek(const Duration(seconds: 50)),
    ]);

    expect(
      player.playbackState.normalizedPosition,
      const Duration(seconds: 50),
    );
  });

  test('다음 악장은 위치를 0으로 초기화하고 저장 위치를 복원하지 않는다', () async {
    final store = MemoryPlaybackPositionStore();
    await store.save(
      const PlaybackPositionRecord(
        path: '/music/2.flac',
        positionMillis: 40000,
        durationMillis: 180000,
        updatedAtMillis: 1,
        isCompleted: false,
      ),
    );
    final player = FakeLocalPlayer(
      positionCoordinator: PlaybackPositionCoordinator(store: store),
      trackDurations: const {
        'track-1': Duration(minutes: 2),
        'track-2': Duration(minutes: 3),
      },
    );
    addTearDown(player.dispose);
    await player.loadQueue(_queue());
    await player.seek(const Duration(seconds: 20));

    await player.next();

    expect(player.currentItem?.trackId, 'track-2');
    expect(player.playbackState.normalizedPosition, Duration.zero);
    expect(player.playbackState.duration, const Duration(minutes: 3));
  });

  test('마지막 악장 완료는 duration과 완료 위치를 저장한다', () async {
    final store = MemoryPlaybackPositionStore();
    final player = FakeLocalPlayer(
      positionCoordinator: PlaybackPositionCoordinator(store: store),
      trackDurations: const {
        'track-1': Duration(minutes: 2),
        'track-2': Duration(minutes: 3),
      },
    );
    addTearDown(player.dispose);
    await player.playQueue(_queue());
    await player.next();
    await player.seek(const Duration(minutes: 2, seconds: 55));

    await player.next();

    expect(player.state, LocalPlayerState.completed);
    expect(
      player.playbackState.processingState,
      LocalPlaybackProcessingState.completed,
    );
    expect(player.playbackState.normalizedPosition, const Duration(minutes: 3));
    expect((await store.load('/music/2.flac'))?.isCompleted, isTrue);
  });

  test('stop과 새 queue load는 시간 상태를 초기화하고 저장 위치를 복원한다', () async {
    final store = MemoryPlaybackPositionStore();
    final player = FakeLocalPlayer(
      positionCoordinator: PlaybackPositionCoordinator(store: store),
      trackDurations: const {'track-1': Duration(minutes: 2)},
    );
    addTearDown(player.dispose);
    await player.loadQueue(_queue());
    await player.seek(const Duration(seconds: 35));

    await player.stop();
    expect(player.playbackState.normalizedPosition, Duration.zero);

    await player.loadQueue(_queue());
    expect(
      player.playbackState.normalizedPosition,
      const Duration(seconds: 35),
    );
  });

  test('interruption은 시작할 때만 일시정지하고 자동 재개하지 않는다', () {
    const policy = LocalPlaybackInterruptionPolicy();
    for (final type in LocalAudioInterruptionType.values) {
      final beginning = LocalAudioInterruptionEvent(
        isBeginning: true,
        type: type,
      );
      final ending = LocalAudioInterruptionEvent(
        isBeginning: false,
        type: type,
      );

      expect(
        policy.shouldPauseForInterruption(beginning),
        isTrue,
        reason: '$type interruption 시작은 안전하게 일시정지한다',
      );
      expect(policy.shouldPauseForInterruption(ending), isFalse);
      expect(policy.shouldResumeAfterInterruption(ending), isFalse);
    }
    expect(policy.shouldPauseWhenBecomingNoisy(), isTrue);
  });

  test(
    'memory audio session은 dispose 뒤 interruption과 route event를 내보내지 않는다',
    () async {
      final session = MemoryLocalPlaybackAudioSession();
      var interruptionCount = 0;
      var becomingNoisyCount = 0;
      final interruptionSubscription = session.interruptionEvents.listen((_) {
        interruptionCount += 1;
      });
      final noisySubscription = session.becomingNoisyEvents.listen((_) {
        becomingNoisyCount += 1;
      });

      await session.dispose();
      session.emitInterruption(
        const LocalAudioInterruptionEvent(
          isBeginning: true,
          type: LocalAudioInterruptionType.pause,
        ),
      );
      session.emitBecomingNoisy();
      await Future<void>.delayed(Duration.zero);

      expect(interruptionCount, 0);
      expect(becomingNoisyCount, 0);
      await interruptionSubscription.cancel();
      await noisySubscription.cancel();
    },
  );

  test('playback trace는 경로 없이 명령과 상태 전이를 기록한다', () async {
    final probe = _FileProbe(existingPaths: {'/synthetic/1.flac'});
    final player = FakeLocalPlayer(
      validator: LocalPlaybackQueueValidator(fileProbe: probe),
      trackDurations: const {'synthetic-track-1': Duration(minutes: 2)},
    );
    addTearDown(player.dispose);
    final trace = PlaybackStateTrace();
    final queue = [_syntheticQueueItem('synthetic-track-1')];

    await player.loadQueue(queue);
    trace.record('load', player.playbackState);
    await player.play();
    trace.record('play', player.playbackState);
    await player.pause();
    trace.record('pause', player.playbackState);
    await player.resume();
    trace.record('resume', player.playbackState);
    await player.seek(const Duration(seconds: 30));
    trace.record('seek', player.playbackState);
    await player.next();
    trace.record('complete', player.playbackState);

    expect(player.playbackState.playerState, LocalPlayerState.completed);
    expect(player.playbackState.currentItem, isNull);
    expect(trace.entries.map((entry) => entry.sequence), [1, 2, 3, 4, 5, 6]);
    expect(trace.diagnosticText, contains('command=seek'));
    expect(trace.diagnosticText, contains('failure=-'));
    expect(trace.diagnosticText, isNot(contains('/synthetic/1.flac')));
  });

  test('playback trace는 실패 후 stop과 새 queue load 복구를 남긴다', () async {
    final probe = _FileProbe(existingPaths: <String>{});
    final player = FakeLocalPlayer(
      validator: LocalPlaybackQueueValidator(fileProbe: probe),
    );
    addTearDown(player.dispose);
    final trace = PlaybackStateTrace();
    final queue = [_syntheticQueueItem('synthetic-track-recovery')];

    await player.loadQueue(queue);
    trace.record('load-missing', player.playbackState);
    expect(
      player.playbackState.failure?.kind,
      LocalPlaybackFailureKind.missingFile,
    );

    await player.stop();
    trace.record('stop-after-failure', player.playbackState);
    probe.existingPaths.add('/synthetic/1.flac');
    await player.loadQueue(queue);
    trace.record('load-recovery', player.playbackState);

    expect(player.playbackState.playerState, LocalPlayerState.ready);
    expect(trace.diagnosticText, contains('failure=missingFile'));
    expect(trace.diagnosticText, contains('command=load-recovery'));
  });

  test(
    'seeded playback scenarios preserve queue and recovery invariants',
    () async {
      const seed = 20261019;
      const scenarioCount = 24;
      final random = Random(seed);

      for (var scenario = 0; scenario < scenarioCount; scenario += 1) {
        final length = 1 + random.nextInt(5);
        final queue = [
          for (var index = 0; index < length; index += 1)
            _syntheticQueueItem(
              'scenario-$scenario-track-$index',
              index: index,
            ),
        ];
        final player = FakeLocalPlayer(
          trackDurations: {
            for (final item in queue) item.trackId: const Duration(minutes: 2),
          },
        );
        addTearDown(player.dispose);

        await player.loadQueue(queue);
        await player.play();
        for (var index = 0; index < length; index += 1) {
          await player.next();
        }

        expect(
          player.playbackState.playerState,
          LocalPlayerState.completed,
          reason: 'seed=$seed scenario=$scenario length=$length',
        );
        expect(
          player.playbackState.currentItem,
          isNull,
          reason: 'seed=$seed scenario=$scenario',
        );
        expect(player.playbackState.currentIndex, length);

        await player.stop();
        expect(
          player.playbackState.currentIndex,
          0,
          reason: 'seed=$seed scenario=$scenario',
        );
        expect(player.playbackState.normalizedPosition, Duration.zero);
      }
    },
  );
}

class _FileProbe extends LocalPlaybackFileProbe {
  const _FileProbe({this.existingPaths = const {}});

  final Set<String> existingPaths;

  @override
  Future<bool> exists(String path) async => existingPaths.contains(path);
}

List<LocalPlaybackQueueItem> _queue() {
  return const [
    LocalPlaybackQueueItem(
      trackId: 'track-1',
      recordingId: 'recording-1',
      workId: 'work-1',
      displayTitle: '1악장',
      path: '/music/1.flac',
      usesLinkedFile: true,
      workTitle: '교향곡 5번',
      recordingTitle: '클라이버 녹음',
    ),
    LocalPlaybackQueueItem(
      trackId: 'track-2',
      recordingId: 'recording-1',
      workId: 'work-1',
      displayTitle: '2악장',
      path: '/music/2.flac',
      usesLinkedFile: false,
      workTitle: '교향곡 5번',
      recordingTitle: '클라이버 녹음',
    ),
  ];
}

LocalPlaybackQueueItem _syntheticQueueItem(String trackId, {int index = 0}) {
  return LocalPlaybackQueueItem(
    trackId: trackId,
    recordingId: 'synthetic-recording',
    workId: 'synthetic-work',
    displayTitle: 'Synthetic movement ${index + 1}',
    path: '/synthetic/1.flac',
    usesLinkedFile: true,
    workTitle: 'Synthetic work',
    recordingTitle: 'Synthetic recording',
  );
}

LocalAudioFile _audioFile(String path) {
  return LocalAudioFile(
    id: scannedAudioId(path),
    path: path,
    fileName: fileNameForPath(path),
    format: 'FLAC',
    sizeBytes: 1024,
    modifiedAtMillis: 1791870000000,
    importStatus: AudioImportStatus.needsReview,
    sourceReferences: const [SourceReference(kind: SourceKind.localTag)],
  );
}
