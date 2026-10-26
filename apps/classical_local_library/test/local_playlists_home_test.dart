import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/local_playlists.dart';
import 'package:classical_local_library/main.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/scan_locations.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

const _files = [
  LocalAudioFile(
    id: 'first',
    path: '/fixture/first.flac',
    fileName: 'first.flac',
    format: 'flac',
  ),
  LocalAudioFile(
    id: 'second',
    path: '/fixture/second.flac',
    fileName: 'second.flac',
    format: 'flac',
  ),
];

Widget _app(LocalPlaylistRepository playlists, FakeLocalPlayer player) =>
    ClassicalLocalLibraryApp(
      initialLibrary: emptyClassicalLibrary,
      enableDemoFeatures: false,
      playbackController: player,
      localPlaylistRepository: playlists,
      scanRepository: ScannedAudioRepository(MemoryScannedAudioStore(_files)),
      scanLocationRepository: ScanLocationRepository(MemoryScanLocationStore()),
      metadataCandidateRepository: MetadataCandidateRepository(
        MemoryMetadataCandidateStore(),
      ),
      fileTrackLinkRepository: AudioFileTrackLinkRepository(
        MemoryAudioFileTrackLinkStore(),
      ),
      supportsFolderScan: false,
    );

Future<void> _openPlaylists(WidgetTester tester) async {
  final category = find.byKey(const ValueKey('file-category-playlists'));
  await tester.ensureVisible(category);
  await tester.tap(category);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('재생목록 생성, 곡 추가, 재생, 재방문 후 유지', (tester) async {
    tester.view.physicalSize = const Size(390, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final store = MemoryLocalPlaylistStore();
    final playlists = LocalPlaylistRepository(store, idFactory: () => 'list-1');
    final player = FakeLocalPlayer();
    await tester.pumpWidget(_app(playlists, player));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('file-category-folders')), findsNothing);
    await _openPlaylists(tester);
    expect(find.text('재생목록이 없습니다'), findsOneWidget);
    await tester.tap(find.text('새 재생목록'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).last, '저녁');
    await tester.pumpAndSettle();
    await tester.tap(find.text('저장'));
    await tester.pumpAndSettle();
    expect(find.text('저녁'), findsWidgets);
    await tester.tap(find.text('곡 추가'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('first'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('second'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('2곡 추가'));
    await tester.pumpAndSettle();
    expect((await playlists.load()).single.fileIds, ['first', 'second']);
    await tester.tap(find.text('모두 재생'));
    await tester.pumpAndSettle();
    expect(player.playbackState.currentItem?.trackId, 'local-file:first');
    expect(player.playbackState.queue.map((item) => item.trackId), [
      'local-file:first',
      'local-file:second',
    ]);

    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpAndSettle();
    await tester.pumpWidget(_app(playlists, FakeLocalPlayer()));
    await tester.pumpAndSettle();
    await _openPlaylists(tester);
    expect(find.text('저녁'), findsOneWidget);
    await tester.tap(find.text('저녁'));
    await tester.pumpAndSettle();
    expect(find.text('first'), findsOneWidget);
    expect(find.text('second'), findsOneWidget);
  });

  testWidgets('누락된 곡은 목록에 남기고 재생 큐에서는 제외한다', (tester) async {
    final playlist = LocalPlaylist(
      id: 'missing-list',
      name: '확인',
      fileIds: const ['not-in-library', 'second'],
      createdAtMillis: 1,
      updatedAtMillis: 1,
    );
    final repository = LocalPlaylistRepository(
      MemoryLocalPlaylistStore([playlist]),
    );
    final player = FakeLocalPlayer();
    await tester.pumpWidget(_app(repository, player));
    await tester.pumpAndSettle();
    await _openPlaylists(tester);
    await tester.tap(find.text('확인'));
    await tester.pumpAndSettle();
    expect(find.text('보관함에 없는 곡'), findsOneWidget);
    await tester.tap(find.text('모두 재생'));
    await tester.pumpAndSettle();
    expect(player.playbackState.queue.map((item) => item.trackId), [
      'local-file:second',
    ]);
  });

  testWidgets('좁은 화면과 큰 글자에서 목록 조작에 접근한다', (tester) async {
    tester.view.physicalSize = const Size(320, 780);
    tester.view.devicePixelRatio = 1;
    tester.platformDispatcher.textScaleFactorTestValue = 2;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    final repository = LocalPlaylistRepository(
      MemoryLocalPlaylistStore([
        LocalPlaylist(
          id: 'long-name',
          name: '길고 긴 재생목록 이름을 가진 음악 모음',
          fileIds: const ['first', 'second'],
          createdAtMillis: 1,
          updatedAtMillis: 1,
        ),
      ]),
    );
    await tester.pumpWidget(_app(repository, FakeLocalPlayer()));
    await tester.pumpAndSettle();
    await _openPlaylists(tester);
    await tester.tap(find.text('길고 긴 재생목록 이름을 가진 음악 모음').last);
    await tester.pumpAndSettle();
    expect(find.text('곡 추가'), findsOneWidget);
    await tester.tap(find.text('편집'));
    await tester.pumpAndSettle();
    expect(find.byTooltip('first 순서 및 삭제'), findsOneWidget);
    expect(find.byIcon(Icons.drag_handle), findsWidgets);
    expect(tester.takeException(), isNull);
    await tester.tap(find.text('완료'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('곡 추가'));
    await tester.pumpAndSettle();
    expect(find.text('보관함 곡 검색'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('곡 더보기에서 재생목록을 고르고 현재 재생에서도 추가한다', (tester) async {
    final store = MemoryLocalPlaylistStore([
      LocalPlaylist(
        id: 'evening',
        name: '저녁',
        fileIds: const [],
        createdAtMillis: 1,
        updatedAtMillis: 1,
      ),
    ]);
    final repository = LocalPlaylistRepository(store);
    final player = FakeLocalPlayer();
    await tester.pumpWidget(_app(repository, player));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('file-category-songs')));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('first 더보기'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('재생목록에 추가'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('destination-evening')));
    await tester.pumpAndSettle();
    expect((await repository.load()).single.fileIds, ['first']);

    await tester.tap(find.text('second'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('재생 상세 열기'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('현재 곡 재생목록에 추가'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('destination-evening')));
    await tester.pumpAndSettle();
    expect((await repository.load()).single.fileIds, ['first', 'second']);
  });

  testWidgets('편집 화면에서 드래그한 순서가 재생 순서로 저장된다', (tester) async {
    final repository = LocalPlaylistRepository(
      MemoryLocalPlaylistStore([
        LocalPlaylist(
          id: 'drag',
          name: '순서',
          fileIds: const ['first', 'second'],
          createdAtMillis: 1,
          updatedAtMillis: 1,
        ),
      ]),
    );
    final player = FakeLocalPlayer();
    await tester.pumpWidget(_app(repository, player));
    await tester.pumpAndSettle();
    await _openPlaylists(tester);
    await tester.tap(find.text('순서'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('편집'));
    await tester.pumpAndSettle();
    await tester.drag(
      find.byIcon(Icons.drag_handle).first,
      const Offset(0, 200),
    );
    await tester.pumpAndSettle();
    expect((await repository.load()).single.fileIds, ['second', 'first']);
    await tester.tap(find.text('완료'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('모두 재생'));
    await tester.pumpAndSettle();
    expect(player.playbackState.currentItem?.trackId, 'local-file:second');
    await tester.tap(find.text('편집'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('second 순서 및 삭제'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('재생목록에서 제거'));
    await tester.pumpAndSettle();
    expect((await repository.load()).single.fileIds, ['first']);
    expect(player.playbackState.currentItem?.trackId, 'local-file:second');
    await tester.tap(find.byTooltip('뒤로'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('뒤로'));
    await tester.pumpAndSettle();
    await tester.drag(find.byType(ListView).first, const Offset(0, 220));
    await tester.pumpAndSettle();
    await tester.ensureVisible(
      find.byKey(const ValueKey('file-category-songs')),
    );
    await tester.tap(find.byKey(const ValueKey('file-category-songs')));
    await tester.pumpAndSettle();
    expect(find.byTooltip('second 재생'), findsOneWidget);
  });

  testWidgets('앨범 곡을 새 재생목록에 담고 검색한 곡도 추가한다', (tester) async {
    var nextId = 0;
    final repository = LocalPlaylistRepository(
      MemoryLocalPlaylistStore(),
      idFactory: () => 'list-${++nextId}',
    );
    await tester.pumpWidget(_app(repository, FakeLocalPlayer()));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('file-category-albums')));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('앨범 정보 없음 더보기'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('재생목록에 추가'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('새 재생목록'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).last, '앨범 모음');
    await tester.pumpAndSettle();
    await tester.tap(find.text('저장'));
    await tester.pumpAndSettle();
    expect((await repository.load()).single.fileIds, ['first', 'second']);

    await tester.tap(find.byTooltip('뒤로'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('뒤로'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('내 음악 검색'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, 'first');
    await tester.pump(const Duration(milliseconds: 250));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('first 더보기'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('재생목록에 추가'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('destination-list-1')));
    await tester.pumpAndSettle();
    expect((await repository.load()).single.fileIds, ['first', 'second']);
  });
}
