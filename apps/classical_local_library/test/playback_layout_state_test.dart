import 'package:classical_local_library/imslp.dart';
import 'package:classical_local_library/imslp_library.dart';
import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/presentation/play_playback_layout.dart';
import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final width in [390.0, 1024.0]) {
    testWidgets(
      'IMSLP draft and import completion survive first queue and notice transitions at $width',
      (tester) async {
        tester.view.physicalSize = Size(width, 1000);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final player = FakeLocalPlayer();
        String? notice;
        final snapshot = ValueNotifier(
          PlayPlaybackSnapshot(player.playbackState),
        );
        final sub = player.states.listen(
          (state) =>
              snapshot.value = PlayPlaybackSnapshot(state, notice: notice),
        );
        addTearDown(() async {
          await sub.cancel();
          snapshot.dispose();
          await player.dispose();
        });
        final client = _Client();
        final store = MemoryImslpStore();
        var shown = 0;
        await tester.pumpWidget(
          MaterialApp(
            theme: ddiroriTheme(),
            home: PlayPlaybackScope(
              snapshot: snapshot,
              onPlayPause: player.play,
              onNext: player.next,
              onStop: player.stop,
              onSeek: player.seek,
              onDismissNotice: () {
                notice = null;
                snapshot.value = PlayPlaybackSnapshot(player.playbackState);
              },
              child: PlayPlaybackLayout(
                child: ImslpLibraryScreen(
                  library: emptyClassicalLibrary,
                  store: store,
                  client: client,
                  onImportLocalFiles: () async => const ImslpLocalImportResult(
                    fileIds: ['alpha'],
                    label: 'Alpha.wav',
                  ),
                  onShowImportedFiles: (_) async {
                    shown++;
                  },
                  onPlayImportedFiles: (_) async {
                    await player.loadQueue([
                      const LocalPlaybackQueueItem(
                        trackId: 'local-file:alpha',
                        recordingId: 'local-file:alpha',
                        workId: 'local-file:alpha',
                        displayTitle: 'Alpha',
                        path: '/fixture/a.wav',
                        usesLinkedFile: true,
                        workTitle: '',
                        recordingTitle: '',
                      ),
                    ]);
                    await player.play();
                    notice = '선택한 곡부터 재생합니다.';
                    snapshot.value = PlayPlaybackSnapshot(
                      player.playbackState,
                      notice: notice,
                    );
                  },
                ),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        await tester.enterText(find.byType(TextField).first, 'Beethoven');
        await tester.tap(find.byTooltip('IMSLP 검색'));
        await tester.pumpAndSettle();
        expect(find.text('검색 fixture 작품'), findsOneWidget);
        Future<void> tapText(String label) async {
          await tester.ensureVisible(find.text(label));
          await tester.pumpAndSettle();
          await tester.tap(find.text(label));
          await tester.pumpAndSettle();
        }

        await tapText('음원 파일 가져오기');
        expect(find.textContaining('Alpha.wav'), findsWidgets);
        await tapText('가져온 곡 재생');
        expect(player.state, LocalPlayerState.playing);
        final noticeText = find.text('선택한 곡부터 재생합니다.');
        expect(noticeText, findsOneWidget);
        final noticeContext = tester.element(noticeText);
        expect(Material.maybeOf(noticeContext), isNotNull);
        expect(
          DefaultTextStyle.of(noticeContext).style,
          Theme.of(noticeContext).textTheme.bodyMedium,
        );
        expect(find.text('가져온 곡 보기'), findsOneWidget);
        final selectedQueue = player.queue;
        tester.view.physicalSize = Size(width < 800 ? 1024 : 390, 1000);
        final app = tester.widget<MaterialApp>(find.byType(MaterialApp));
        await tester.pumpWidget(
          MaterialApp(
            theme: ddiroriTheme(brightness: Brightness.dark),
            home: app.home,
          ),
        );
        await tester.pumpAndSettle();
        expect(player.queue, same(selectedQueue));
        expect(player.state, LocalPlayerState.playing);
        expect(find.text('가져온 곡 보기'), findsOneWidget);
        expect(
          tester
              .widget<TextField>(find.byType(TextField).first)
              .controller!
              .text,
          'Beethoven',
        );
        await tapText('가져온 곡 보기');
        expect(shown, 1);
        final close = find.byTooltip('곡 작업 알림 닫기');
        await tester.ensureVisible(close);
        await tester.tap(close);
        await tester.pumpAndSettle();
        expect(find.text('가져온 곡 보기'), findsOneWidget);
        await player.loadQueue(const []);
        await tester.pumpAndSettle();
        expect(find.text('가져온 곡 보기'), findsOneWidget);
        expect(
          tester
              .widget<TextField>(find.byType(TextField).first)
              .controller!
              .text,
          'Beethoven',
        );
        expect(client.calls, 1);
        expect(await store.loadWorkLinks(), isEmpty);
        expect(tester.takeException(), isNull);
      },
    );
  }
}

class _Client implements ImslpCatalogClient {
  int calls = 0;
  @override
  Future<List<ImslpWorkSearchResult>> searchWorks(
    String query, {
    int limit = 8,
  }) async {
    calls++;
    return [
      ImslpWorkSearchResult(
        externalId: 'fixture',
        title: '검색 fixture 작품',
        pageUrl: Uri.parse('https://imslp.org/wiki/Fixture'),
      ),
    ];
  }
}
