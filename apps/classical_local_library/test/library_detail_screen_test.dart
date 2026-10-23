import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/library_detail_screen.dart';
import 'package:classical_local_library/library_details.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/sample_classical_library.dart';
import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('작품 상세는 좁은 화면과 큰 글자에서 악장과 녹음을 표시한다', (tester) async {
    tester.view.physicalSize = const Size(320, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final fixture = _detailFixture();
    final data = fixture.builder.buildWork('work.beethoven.symphony5');
    String? openedRecording;

    await tester.pumpWidget(
      MaterialApp(
        theme: ddiroriTheme(),
        home: MediaQuery(
          data: const MediaQueryData(textScaler: TextScaler.linear(2)),
          child: WorkDetailScreen(
            data: data,
            onOpenRecording: (id) => openedRecording = id,
            onPlayRecording: (_) async {},
          ),
        ),
      ),
    );

    expect(find.text('교향곡 5번 다단조'), findsOneWidget);
    expect(find.text('아래에서 듣고 싶은 녹음을 선택하세요.'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('클라이버 / 빈 필하모닉 연주 녹음'), 350);
    await tester.ensureVisible(find.text('클라이버 / 빈 필하모닉 연주 녹음'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('클라이버 / 빈 필하모닉 연주 녹음'));
    expect(openedRecording, 'recording.beethoven5.kleiber');
    expect(tester.takeException(), isNull);
  });

  testWidgets('녹음 상세의 악장은 파일 경로를 숨기고 선택 지점부터 재생한다', (tester) async {
    tester.view.physicalSize = const Size(1024, 1366);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final fixture = _detailFixture();
    final player = FakeLocalPlayer();
    final data = fixture.builder.buildRecording('recording.beethoven5.kleiber');
    var calls = 0;
    String? selectedTrack;

    await tester.pumpWidget(
      MaterialApp(
        darkTheme: ddiroriTheme(brightness: Brightness.dark),
        themeMode: ThemeMode.dark,
        home: RecordingDetailScreen(
          data: data,
          initialPlaybackState: player.playbackState,
          playbackStates: player.states,
          onPlayAll: () async => calls += 1,
          onPlayFromTrack: (trackId) async {
            calls += 1;
            selectedTrack = trackId;
          },
        ),
      ),
    );

    expect(find.textContaining('/private/music'), findsNothing);
    expect(find.bySemanticsLabel(RegExp('1번, 1악장')), findsOneWidget);
    await tester.ensureVisible(find.text('1악장 Allegro con brio'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('1악장 Allegro con brio'));
    await tester.pump();
    expect(calls, 1);
    expect(selectedTrack, 'track.beethoven5.kleiber.1');

    await tester.scrollUntilVisible(find.text('3악장 Scherzo. Allegro'), 350);
    expect(
      find.bySemanticsLabel(RegExp('3번, 3악장 Scherzo. Allegro, 재생 불가')),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });
}

({LibraryDetailBuilder builder, List<LocalAudioFile> files}) _detailFixture() {
  final tracks = sampleClassicalLibrary.tracksForRecording(
    'recording.beethoven5.kleiber',
  );
  final files = [
    for (var index = 0; index < 2; index += 1)
      LocalAudioFile(
        id: 'screen-file-$index',
        path: '/private/music/screen-$index.flac',
        fileName: 'screen-$index.flac',
        format: 'FLAC',
        importStatus: AudioImportStatus.linked,
      ),
  ];
  return (
    files: files,
    builder: LibraryDetailBuilder(
      library: sampleClassicalLibrary,
      scannedFiles: files,
      links: [
        for (var index = 0; index < files.length; index += 1)
          AudioFileTrackLink(
            fileId: files[index].id,
            trackId: tracks[index].id,
            linkedAtMillis: index,
          ),
      ],
    ),
  );
}
