import 'dart:io';

import 'package:classical_local_library/audio_tags.dart';
import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/local_playlists.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'library_navigation_test.dart' as fixture;

List<LocalAudioFile> scaleFiles(int count) => [
  for (var i = 0; i < count; i++)
    LocalAudioFile(
      id: 'scale-$i',
      path: '/fixture/$i.flac',
      fileName: 'song-$i.flac',
      format: 'flac',
      tagMetadata: AudioTagMetadata(
        title: 'Song ${i.toString().padLeft(5, '0')}',
        album: 'Album $i',
        artist: 'Artist $i',
      ),
    ),
];

int rowCount(String type) => find
    .byWidgetPredicate((w) => w.runtimeType.toString() == type)
    .evaluate()
    .length;

void main() {
  testWidgets(
    'debounced search keeps the newest input and cancels on navigation',
    (tester) async {
      await tester.pumpWidget(
        fixture.libraryApp(libraryFiles: scaleFiles(100)),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('내 음악 검색'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'Song 00010');
      await tester.pump(const Duration(milliseconds: 50));
      await tester.enterText(find.byType(TextField), 'Song 00020');
      await tester.pumpAndSettle();
      await tester.pump(const Duration(milliseconds: 200));
      await tester.pumpAndSettle();
      expect(
        find.byWidgetPredicate((w) => w is Text && w.data == 'Song 00020'),
        findsOneWidget,
      );
      expect(find.text('Song 00010'), findsNothing);
      await tester.enterText(find.byType(TextField), 'Song 00030');
      await tester.tap(find.byTooltip('뒤로'));
      await tester.pumpAndSettle();
      await tester.pump(const Duration(milliseconds: 200));
      await tester.tap(find.byTooltip('내 음악 검색'));
      await tester.pumpAndSettle();
      expect(
        tester.widget<TextField>(find.byType(TextField)).controller!.text,
        isEmpty,
      );
      await tester.enterText(find.byType(TextField), 'Song 00040');
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump(const Duration(milliseconds: 250));
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'position ticks update playback without rebuilding library rows',
    (tester) async {
      final player = FakeLocalPlayer();
      await tester.pumpWidget(
        fixture.libraryApp(libraryFiles: scaleFiles(100), player: player),
      );
      await tester.pumpAndSettle();
      await fixture.openCategory(tester, 'songs');
      await tester.tap(find.text('Song 00000'));
      await tester.pumpAndSettle();
      var builds = 0;
      final previous = debugOnRebuildDirtyWidget;
      debugOnRebuildDirtyWidget = (element, builtOnce) {
        previous?.call(element, builtOnce);
        if (element.widget.runtimeType.toString() == '_FileSongRow') builds++;
      };
      addTearDown(() => debugOnRebuildDirtyWidget = previous);
      for (var i = 1; i <= 10; i++) {
        await player.updatePosition(Duration(milliseconds: i * 100));
        await tester.pump();
      }
      debugPrint('DDIRORI_SCALE tickRowRebuilds=$builds');
      expect(player.playbackState.position, const Duration(seconds: 1));
      expect(builds, 0);
    },
  );

  testWidgets('20000 album and artist groups remain virtualized', (
    tester,
  ) async {
    await tester.pumpWidget(
      fixture.libraryApp(libraryFiles: scaleFiles(20000)),
    );
    await tester.pumpAndSettle();
    for (final category in ['albums', 'artists']) {
      await fixture.openCategory(tester, category);
      expect(rowCount('_FileGroupRow'), inInclusiveRange(1, 80));
      await tester.drag(find.byType(Scrollable).first, const Offset(0, -1400));
      await tester.pumpAndSettle();
      expect(rowCount('_FileGroupRow'), lessThan(80));
      await tester.tap(find.byTooltip('뒤로'));
      await tester.pumpAndSettle();
    }
  });
  testWidgets(
    '5000 songs build viewport rows and playback includes offscreen results',
    (tester) async {
      final files = scaleFiles(5000);
      final player = FakeLocalPlayer();
      final watch = Stopwatch()..start();
      await tester.pumpWidget(
        fixture.libraryApp(libraryFiles: files, player: player),
      );
      await tester.pumpAndSettle();
      await fixture.openCategory(tester, 'songs');
      final count = rowCount('_FileSongRow');
      debugPrint(
        'DDIRORI_SCALE songs rows=$count elapsedMs=${watch.elapsedMilliseconds} rss=${ProcessInfo.currentRss}',
      );
      expect(count, inInclusiveRange(1, 80));
      await tester.tap(find.text('Song 00000'));
      await tester.pumpAndSettle();
      expect(player.playbackState.queue.length, 5000);
      expect(player.playbackState.queue.last.trackId, 'local-file:scale-4999');
      await tester.drag(find.byType(Scrollable).first, const Offset(0, -1600));
      await tester.pumpAndSettle();
      expect(rowCount('_FileSongRow'), lessThan(80));
      expect(
        find.byKey(const ValueKey('lazy:file-row-scale-0')).hitTestable(),
        findsNothing,
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('large playlist lists and edit mode build only viewport rows', (
    tester,
  ) async {
    final files = scaleFiles(5000);
    final lists = [
      for (var i = 0; i < 1000; i++)
        LocalPlaylist(
          id: 'p-$i',
          name: 'List $i',
          fileIds: files.map((f) => f.id).toList(),
          createdAtMillis: i,
          updatedAtMillis: i,
        ),
    ];
    await tester.pumpWidget(
      fixture.libraryApp(
        libraryFiles: files,
        playlists: LocalPlaylistRepository(MemoryLocalPlaylistStore(lists)),
      ),
    );
    await tester.pumpAndSettle();
    await fixture.openCategory(tester, 'playlists');
    expect(rowCount('_LibraryBrowseRow'), lessThan(80));
    await tester.tap(find.byKey(const ValueKey('playlist-p-999')));
    await tester.pumpAndSettle();
    expect(rowCount('_LibraryBrowseRow'), lessThan(80));
    await tester.tap(find.byTooltip('재생목록 더보기'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('편집'));
    await tester.pumpAndSettle();
    expect(
      find.byKey(const ValueKey('playlist-edit-scale-4999')),
      findsNothing,
    );
    expect(rowCount('_LibraryBrowseRow'), lessThan(80));
  });
}
