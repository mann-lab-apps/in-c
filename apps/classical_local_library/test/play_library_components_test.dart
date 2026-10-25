import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/library_search.dart';
import 'package:classical_local_library/presentation/play_library_components.dart';
import 'package:classical_local_library/sample_classical_library.dart';
import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('작품과 녹음 행은 클래식 계층 정보를 표시한다', (tester) async {
    final work = sampleClassicalLibrary.works.first;
    final composer = sampleClassicalLibrary.person(work.composerId);
    final recording = sampleClassicalLibrary.recordingsForWork(work.id).first;
    await tester.pumpWidget(
      MaterialApp(
        theme: ddiroriTheme(),
        home: Scaffold(
          body: ListView(
            children: [
              PlayWorkRow(
                work: work,
                composer: composer,
                partCount: sampleClassicalLibrary.partsForWork(work.id).length,
                recordingCount: sampleClassicalLibrary
                    .recordingsForWork(work.id)
                    .length,
              ),
              PlayRecordingRow(recording: recording, workTitle: work.title.ko),
            ],
          ),
        ),
      ),
    );

    expect(find.text(work.title.ko), findsWidgets);
    expect(find.textContaining('악장'), findsOneWidget);
    expect(find.text(recording.title.ko), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('긴 재생 큐 항목은 좁은 화면에서도 넘치지 않는다', (tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    const item = LocalPlaybackQueueItem(
      trackId: 'track-1',
      recordingId: 'recording-1',
      workId: 'work-1',
      displayTitle: 'IV. Allegro energico e passionato, 매우 긴 악장 표시 이름',
      path: '/music/a-very-long-folder-name/a-very-long-file-name.flac',
      usesLinkedFile: true,
      workTitle: '교향곡 제5번 다단조, Op. 67',
      recordingTitle: '연주 녹음',
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: ddiroriTheme(),
        home: const Scaffold(
          body: SingleChildScrollView(
            child: PlayQueueRow(index: 0, item: item, current: true),
          ),
        ),
      ),
    );

    expect(find.textContaining('Allegro energico'), findsOneWidget);
    expect(find.textContaining('연결 파일'), findsOneWidget);
    expect(find.textContaining('/music/'), findsNothing);
    expect(find.bySemanticsLabel('상태: 현재 악장'), findsOneWidget);
    expect(
      find.bySemanticsLabel(
        '큐 1번, IV. Allegro energico e passionato, 매우 긴 악장 표시 이름, '
        '교향곡 제5번 다단조, Op. 67, 연주 녹음, 연결 파일, 현재 악장',
      ),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('검색 결과는 유형과 제목을 읽을 수 있게 표시한다', (tester) async {
    var tapped = false;
    await tester.pumpWidget(
      MaterialApp(
        theme: ddiroriTheme(),
        home: Scaffold(
          body: PlaySearchResultRow(
            result: const LibrarySearchResult(
              type: SearchResultType.workPart,
              id: 'part-1',
              title: 'I. Allegro con brio',
              subtitle: '베토벤 · 교향곡 5번',
            ),
            onTap: () => tapped = true,
          ),
        ),
      ),
    );

    expect(find.bySemanticsLabel('상태: 악장'), findsOneWidget);
    await tester.tap(find.text('I. Allegro con brio'));
    expect(tapped, isTrue);
  });

  testWidgets('음원 파일 행은 검토 선택과 보조 동작을 유지한다', (tester) async {
    var selected = false;
    await tester.pumpWidget(
      MaterialApp(
        theme: ddiroriTheme(),
        home: Scaffold(
          body: StatefulBuilder(
            builder: (context, setState) => PlayAudioFileRow(
              file: const LocalAudioFile(
                id: 'file-1',
                path: '/music/beethoven-9.flac',
                format: 'flac',
                fileName: 'Beethoven Symphony No. 9 - IV. Finale.flac',
              ),
              details: 'FLAC · 정리 필요\n태그와 파일명 후보가 달라 확인이 필요합니다.',
              selecting: true,
              selected: selected,
              onSelected: (value) => setState(() => selected = value),
              actions: const [Icon(Icons.more_vert)],
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.byType(Checkbox));
    await tester.pump();
    expect(selected, isTrue);
    expect(
      find.bySemanticsLabel(
        'Beethoven Symphony No. 9 - IV. Finale.flac, 연결됨, 선택됨',
      ),
      findsOneWidget,
    );
    expect(find.byIcon(Icons.more_vert), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
