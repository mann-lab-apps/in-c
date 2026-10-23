import 'package:classical_local_library/playback_planner.dart';
import 'package:classical_local_library/sample_classical_library.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('다악장 작품은 랜덤 선택 후 트랙 순서를 유지해 큐에 들어간다', () {
    final planner = ClassicalPlaybackPlanner(
      library: sampleClassicalLibrary,
      workSelector: (works) =>
          works.singleWhere((work) => work.id == 'work.beethoven.symphony5'),
      recordingSelector: (recordings) => recordings.singleWhere(
        (recording) => recording.id == 'recording.beethoven5.kleiber',
      ),
    );

    final plan = planner.createPlan(PlaybackMode.workRandom);

    expect(plan.mode, PlaybackMode.workRandom);
    expect(plan.work.id, 'work.beethoven.symphony5');
    expect(plan.recording.id, 'recording.beethoven5.kleiber');
    expect(plan.items.map((item) => item.track.id), [
      'track.beethoven5.kleiber.1',
      'track.beethoven5.kleiber.2',
      'track.beethoven5.kleiber.3',
      'track.beethoven5.kleiber.4',
    ]);
    expect(plan.items.map((item) => item.displayTitle), [
      '1악장 Allegro con brio',
      '2악장 Andante con moto',
      '3악장 Scherzo. Allegro',
      '4악장 Allegro',
    ]);
  });

  test('단일 트랙 랜덤은 작품 전체 모드와 다르게 한 트랙만 큐에 넣는다', () {
    final planner = ClassicalPlaybackPlanner(
      library: sampleClassicalLibrary,
      workSelector: (works) =>
          works.singleWhere((work) => work.id == 'work.beethoven.symphony5'),
      recordingSelector: (recordings) => recordings.singleWhere(
        (recording) => recording.id == 'recording.beethoven5.kleiber',
      ),
      trackSelector: (tracks) => tracks.singleWhere(
        (track) => track.id == 'track.beethoven5.kleiber.2',
      ),
    );

    final fullPlan = planner.createPlan(PlaybackMode.workRandom);
    final singleTrackPlan = planner.createPlan(PlaybackMode.singleTrackRandom);

    expect(fullPlan.items, hasLength(4));
    expect(singleTrackPlan.mode, PlaybackMode.singleTrackRandom);
    expect(singleTrackPlan.items, hasLength(1));
    expect(singleTrackPlan.items.single.track.id, 'track.beethoven5.kleiber.2');
    expect(singleTrackPlan.items.single.displayTitle, '2악장 Andante con moto');
  });

  test('한국어 표시명, 원어 표시명, 별칭 데이터가 모델에 보존된다', () {
    final work = sampleClassicalLibrary.work('work.beethoven.symphony5');
    final composer = sampleClassicalLibrary.person(work.composerId);
    final source = work.sourceReferences.single;

    expect(work.title.ko, '교향곡 5번 다단조');
    expect(work.title.original, 'Symphony No. 5 in C minor');
    expect(work.title.aliases, containsAll(['운명', 'Beethoven 5', 'Op.67']));
    expect(composer.name.ko, '루트비히 판 베토벤');
    expect(composer.name.original, 'Ludwig van Beethoven');
    expect(source.regionNote, contains('한국'));
  });

  test('특정 악장에서 시작하면 같은 녹음의 남은 트랙 순서를 유지한다', () {
    final planner = ClassicalPlaybackPlanner(library: sampleClassicalLibrary);

    final plan = planner.createContinuationPlan(
      recordingId: 'recording.beethoven5.kleiber',
      trackId: 'track.beethoven5.kleiber.2',
    );

    expect(plan, isNotNull);
    expect(plan!.items.map((item) => item.track.sequenceNumber), [2, 3, 4]);
    expect(plan.recording.id, 'recording.beethoven5.kleiber');
  });
}
