import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/local_playlists.dart';
import 'package:classical_local_library/library_view_settings.dart';
import 'package:classical_local_library/library_artwork.dart';
import 'package:classical_local_library/library_search_backend.dart';
import 'package:classical_local_library/main.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/scan_locations.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

const files = [
  LocalAudioFile(
    id: 'a',
    path: '/fixture/a.wav',
    fileName: 'Alpha.wav',
    format: 'wav',
  ),
  LocalAudioFile(
    id: 'b',
    path: '/fixture/b.wav',
    fileName: 'Beta.wav',
    format: 'wav',
  ),
];

Widget libraryApp({
  LocalPlaylistRepository? playlists,
  FakeLocalPlayer? player,
  List<LocalAudioFile> libraryFiles = files,
  LibraryViewSettingsStore? viewSettingsStore,
  LibraryArtworkRepository? artworkRepository,
  LibraryArtworkPicker? artworkPicker,
  LibrarySearchBackend? librarySearchBackend,
}) => ClassicalLocalLibraryApp(
  fontFamily: 'DdiroriLibraryCapture',
  initialLibrary: emptyClassicalLibrary,
  enableDemoFeatures: false,
  playbackController: player ?? FakeLocalPlayer(),
  localPlaylistRepository:
      playlists ?? LocalPlaylistRepository(MemoryLocalPlaylistStore()),
  viewSettingsStore: viewSettingsStore,
  artworkRepository: artworkRepository,
  artworkPicker: artworkPicker,
  librarySearchBackend: librarySearchBackend,
  scanRepository: ScannedAudioRepository(MemoryScannedAudioStore(libraryFiles)),
  scanLocationRepository: ScanLocationRepository(MemoryScanLocationStore()),
  metadataCandidateRepository: MetadataCandidateRepository(
    MemoryMetadataCandidateStore(),
  ),
  fileTrackLinkRepository: AudioFileTrackLinkRepository(
    MemoryAudioFileTrackLinkStore(),
  ),
  supportsFolderScan: false,
);

Future<void> openCategory(WidgetTester tester, String category) async {
  final row = find.byKey(ValueKey('file-category-$category'));
  await tester.ensureVisible(row);
  await tester.tap(row);
  await tester.pumpAndSettle();
}

LocalPlaylist playlist({List<String> ids = const ['a']}) => LocalPlaylist(
  id: 'evening',
  name: '저녁',
  fileIds: ids,
  createdAtMillis: 1,
  updatedAtMillis: 1,
);

Future<void> createDraft(WidgetTester tester, String name) async {
  await tester.tap(find.text('새 재생목록'));
  await tester.pumpAndSettle();
  await tester.enterText(find.byType(TextField).last, name);
  await tester.pumpAndSettle();
}

class ControlledPlaylistStore extends MemoryLocalPlaylistStore {
  ControlledPlaylistStore([super.initial]);
  bool failSave = false;
  bool failRefresh = false;
  bool committed = false;
  int saveCount = 0;
  Completer<void>? gate;

  @override
  Future<void> save(List<LocalPlaylist> value) async {
    saveCount++;
    await gate?.future;
    if (failSave) throw StateError('fixture write failure');
    await super.save(value);
    committed = true;
  }

  @override
  Future<List<LocalPlaylist>> load() async {
    if (committed && failRefresh) throw StateError('fixture read failure');
    return super.load();
  }
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    final font = Platform.environment['DDIRORI_CAPTURE_FONT'];
    final icons = Platform.environment['DDIRORI_MATERIAL_FONT'];
    if (font != null) {
      await (FontLoader('DdiroriLibraryCapture')..addFont(
            Future.value(ByteData.sublistView(await File(font).readAsBytes())),
          ))
          .load();
    }
    if (icons != null) {
      await (FontLoader('MaterialIcons')..addFont(
            Future.value(ByteData.sublistView(await File(icons).readAsBytes())),
          ))
          .load();
    }
  });

  testWidgets(
    'global tools stay at library root and search returns to its source',
    (tester) async {
      await tester.pumpWidget(libraryApp());
      await tester.pumpAndSettle();
      expect(find.byTooltip('도구 더보기'), findsOneWidget);
      await openCategory(tester, 'albums');
      expect(find.byTooltip('도구 더보기'), findsNothing);
      await tester.tap(find.text('앨범 정보 없음').first);
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('내 음악 검색'));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('뒤로'));
      await tester.pumpAndSettle();
      expect(find.text('Alpha'), findsOneWidget);
      expect(find.text('보관함'), findsNothing);
    },
  );

  testWidgets(
    'iOS edge swipe cancel retains detail and completed swipe restores parent',
    (tester) async {
      tester.view.physicalSize = const Size(390, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final player = FakeLocalPlayer();
      await tester.pumpWidget(libraryApp(player: player));
      await tester.pumpAndSettle();
      await openCategory(tester, 'albums');
      await tester.tap(find.text('앨범 정보 없음').first);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Alpha'));
      await tester.pumpAndSettle();
      final queue = player.playbackState.queue;
      final gesture = await tester.startGesture(const Offset(1, 250));
      await gesture.moveTo(
        const Offset(65, 250),
        timeStamp: const Duration(milliseconds: 400),
      );
      await tester.pump(const Duration(milliseconds: 500));
      await gesture.up(timeStamp: const Duration(milliseconds: 900));
      await tester.pumpAndSettle();
      expect(find.byTooltip('음악 묶음 더보기'), findsOneWidget);
      await tester.timedDragFrom(
        const Offset(1, 250),
        const Offset(360, 0),
        const Duration(milliseconds: 400),
      );
      await tester.pumpAndSettle();
      expect(find.byTooltip('음악 묶음 더보기'), findsNothing);
      expect(
        find.text('목록 정렬'),
        findsNothing,
      ); // Accessible label lives on menu tooltip.
      expect(find.byTooltip('목록 정렬'), findsOneWidget);
      expect(identical(player.playbackState.queue, queue), isTrue);
      expect(player.playbackState.playerState, LocalPlayerState.playing);
    },
    variant: TargetPlatformVariant.only(TargetPlatform.iOS),
  );

  testWidgets('creating a playlist stays in its list until explicit view', (
    tester,
  ) async {
    final repository = LocalPlaylistRepository(
      MemoryLocalPlaylistStore(),
      idFactory: () => 'new',
    );
    await tester.pumpWidget(libraryApp(playlists: repository));
    await tester.pumpAndSettle();
    await openCategory(tester, 'playlists');
    await tester.tap(find.text('새 재생목록'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).last, '저녁');
    await tester.pump();
    await tester.tap(find.text('저장'));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('playlist-new')), findsOneWidget);
    expect(find.text('담긴 곡이 없습니다'), findsNothing);
    expect(find.textContaining('만들었습니다'), findsOneWidget);
    expect((await repository.load()).single.name, '저녁');
    await tester.tap(find.text('보기'));
    await tester.pumpAndSettle();
    expect(find.text('담긴 곡이 없습니다'), findsOneWidget);
    expect(find.byTooltip('도구 더보기'), findsNothing);
    expect(find.byTooltip('재생목록 더보기'), findsOneWidget);
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('playlist-new')), findsOneWidget);
  });

  testWidgets(
    'keyboard escape cancels a focused creation draft without saving',
    (tester) async {
      final repository = LocalPlaylistRepository(MemoryLocalPlaylistStore());
      await tester.pumpWidget(libraryApp(playlists: repository));
      await tester.pumpAndSettle();
      await openCategory(tester, 'playlists');
      await createDraft(tester, '키보드로 입력한 이름');
      expect(
        tester
            .widget<EditableText>(find.byType(EditableText).last)
            .focusNode
            .hasFocus,
        isTrue,
      );
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
      expect(find.byType(AlertDialog), findsNothing);
      expect(await repository.load(), isEmpty);
    },
  );

  testWidgets(
    'creation from song returns to source, view returns to source too',
    (tester) async {
      final player = FakeLocalPlayer();
      final repository = LocalPlaylistRepository(
        MemoryLocalPlaylistStore(),
        idFactory: () => 'new',
      );
      await tester.pumpWidget(
        libraryApp(player: player, playlists: repository),
      );
      await tester.pumpAndSettle();
      await openCategory(tester, 'songs');
      await tester.tap(find.text('Alpha'));
      await tester.pumpAndSettle();
      final queue = player.playbackState.queue;
      await tester.tap(find.byTooltip('Alpha 더보기'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('재생목록에 추가'));
      await tester.pumpAndSettle();
      await createDraft(tester, '산책');
      expect(find.text('1곡을 함께 저장합니다.'), findsOneWidget);
      await tester.tap(find.text('저장'));
      await tester.pumpAndSettle();
      expect(find.text('이 목록에서 검색'), findsOneWidget);
      expect(find.textContaining('1곡을 추가했습니다'), findsOneWidget);
      await tester.tap(find.text('보기'));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('playlist-track-a')), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('이 목록에서 검색'), findsOneWidget);
      expect(identical(player.playbackState.queue, queue), isTrue);
      expect(player.playbackState.playerState, LocalPlayerState.playing);
    },
  );

  testWidgets(
    'optional song draft cancels without writing and failed save preserves it',
    (tester) async {
      final store = ControlledPlaylistStore()..failSave = true;
      final repository = LocalPlaylistRepository(store, idFactory: () => 'new');
      await tester.pumpWidget(libraryApp(playlists: repository));
      await tester.pumpAndSettle();
      await openCategory(tester, 'playlists');
      await createDraft(tester, '산책');
      await tester.tap(find.text('곡 선택'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Alpha'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('선택 완료'));
      await tester.pumpAndSettle();
      expect(find.text('1곡을 함께 저장합니다.'), findsOneWidget);
      await tester.tap(find.text('저장'));
      await tester.pumpAndSettle();
      expect(find.textContaining('저장하지 못했습니다'), findsOneWidget);
      expect(
        tester.widget<TextField>(find.byType(TextField).last).controller!.text,
        '산책',
      );
      expect(find.text('1곡을 함께 저장합니다.'), findsOneWidget);
      store.failSave = false;
      await tester.tap(find.text('저장'));
      await tester.pumpAndSettle();
      expect((await repository.load()).single.fileIds, ['a']);
      await createDraft(tester, '저장하지 않을 목록');
      await tester.tap(find.text('취소'));
      await tester.pumpAndSettle();
      expect((await repository.load()).length, 1);
      expect(store.saveCount, 2);
    },
  );

  testWidgets(
    'committed create survives failed refresh without a second creation',
    (tester) async {
      final store = ControlledPlaylistStore()..failRefresh = true;
      final repository = LocalPlaylistRepository(store, idFactory: () => 'new');
      await tester.pumpWidget(libraryApp(playlists: repository));
      await tester.pumpAndSettle();
      await openCategory(tester, 'playlists');
      await createDraft(tester, '산책');
      await tester.tap(find.text('저장'));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('playlist-new')), findsOneWidget);
      expect(find.byType(AlertDialog), findsNothing);
      expect(store.saveCount, 1);
      expect(repository.lastSaved!.single.name, '산책');
      store.failRefresh = false;
      expect((await repository.load()).length, 1);
    },
  );

  testWidgets(
    'busy creation blocks duplicate writes and late unmount completion is safe',
    (tester) async {
      final store = ControlledPlaylistStore()..gate = Completer<void>();
      await tester.pumpWidget(
        libraryApp(playlists: LocalPlaylistRepository(store)),
      );
      await tester.pumpAndSettle();
      await openCategory(tester, 'playlists');
      await createDraft(tester, '산책');
      await tester.tap(find.text('저장'));
      await tester.pump();
      await tester.tap(find.text('저장 · 처리 중'));
      await tester.pump();
      await tester.binding.handlePopRoute();
      await tester.pump();
      expect(find.byType(AlertDialog), findsOneWidget);
      expect(store.saveCount, 1);
      await tester.pumpWidget(const SizedBox.shrink());
      store.gate!.complete();
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect((await store.load()).length, 1);
    },
  );

  testWidgets(
    'duplicate additions report zero and leave search and playback intact',
    (tester) async {
      final repository = LocalPlaylistRepository(
        MemoryLocalPlaylistStore([playlist()]),
      );
      await tester.pumpWidget(libraryApp(playlists: repository));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('내 음악 검색'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'Alpha');
      await tester.pump(const Duration(milliseconds: 250));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Alpha 더보기'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('재생목록에 추가'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('destination-evening')));
      await tester.pumpAndSettle();
      expect(find.textContaining('이미 “저녁”에 포함된 곡'), findsOneWidget);
      expect(
        tester.widget<TextField>(find.byType(TextField)).controller!.text,
        'Alpha',
      );
      expect((await repository.load()).single.fileIds, ['a']);
    },
  );

  testWidgets('system back restores list filter, sort and scroll per visit', (
    tester,
  ) async {
    final many = List.generate(
      70,
      (i) => LocalAudioFile(
        id: '$i',
        path: '/fixture/$i.wav',
        fileName: '곡${i.toString().padLeft(2, '0')}.wav',
        format: 'wav',
      ),
    );
    await tester.pumpWidget(libraryApp(libraryFiles: many));
    await tester.pumpAndSettle();
    await openCategory(tester, 'songs');
    await tester.enterText(find.byType(TextField), '곡');
    await tester.pump();
    await tester.tap(find.byTooltip('곡 정렬'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('추가한 날짜'));
    await tester.pumpAndSettle();
    await tester.drag(find.byType(Scrollable).first, const Offset(0, -900));
    await tester.pumpAndSettle();
    final before = tester
        .state<ScrollableState>(find.byType(Scrollable).first)
        .position
        .pixels;
    expect(before, greaterThan(0));
    await tester.tap(find.byTooltip('내 음악 검색'));
    await tester.pumpAndSettle();
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(
      tester
          .state<ScrollableState>(find.byType(Scrollable).first)
          .position
          .pixels,
      before,
    );
    await tester.drag(find.byType(Scrollable).first, const Offset(0, 1400));
    await tester.pumpAndSettle();
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text,
      '곡',
    );
    await tester.tap(find.byTooltip('곡 정렬'));
    await tester.pumpAndSettle();
    // Checkmark belongs to the retained date sort, not the default title sort.
    expect(
      find.descendant(
        of: find
            .ancestor(of: find.text('추가한 날짜'), matching: find.byType(Row))
            .first,
        matching: find.byIcon(Icons.check),
      ),
      findsOneWidget,
    );
  });

  testWidgets(
    'view from Now Playing returns there and deletion preserves playback',
    (tester) async {
      tester.view.physicalSize = const Size(390, 1000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final player = FakeLocalPlayer();
      final repository = LocalPlaylistRepository(
        MemoryLocalPlaylistStore(),
        idFactory: () => 'new',
      );
      await tester.pumpWidget(
        libraryApp(player: player, playlists: repository),
      );
      await tester.pumpAndSettle();
      await openCategory(tester, 'songs');
      await tester.tap(find.text('Alpha'));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('재생 상세 열기'));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('현재 곡 재생목록에 추가'));
      await tester.pumpAndSettle();
      await createDraft(tester, '산책');
      await tester.tap(find.text('저장'));
      await tester.pumpAndSettle();
      expect(find.text('재생 대기열'), findsOneWidget);
      await tester.tap(find.text('보기'));
      await tester.pumpAndSettle();
      expect(
        find.byKey(const ValueKey('persistent-playback-strip')),
        findsOneWidget,
      );
      expect(find.byTooltip('재생 상세 열기').hitTestable(), findsOneWidget);
      await tester.tap(find.byTooltip('재생목록 더보기'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('이름 변경'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField).last, '밤');
      await tester.pump();
      await tester.tap(find.text('저장'));
      await tester.pumpAndSettle();
      expect(find.text('밤'), findsOneWidget);
      await tester.tap(find.byTooltip('재생목록 더보기'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('재생목록 삭제'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('재생목록 삭제').last);
      await tester.pumpAndSettle();
      expect(await repository.load(), isEmpty);
      expect(find.text('재생 대기열'), findsOneWidget);
      expect(player.playbackState.currentItem!.trackId, 'local-file:a');
      expect(player.playbackState.playerState, LocalPlayerState.playing);
    },
  );

  for (final width in [320.0, 390.0, 1024.0]) {
    for (final scale in [1.0, 2.0]) {
      for (final brightness in Brightness.values) {
        final label = '${width.toInt()}-${scale.toInt()}-${brightness.name}';
        testWidgets('library contexts render and remain accessible $label', (
          tester,
        ) async {
          tester.view.physicalSize = Size(width, 1000);
          tester.view.devicePixelRatio = 1;
          tester.view.padding = const FakeViewPadding(bottom: 24);
          tester.platformDispatcher.textScaleFactorTestValue = scale;
          tester.platformDispatcher.platformBrightnessTestValue = brightness;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          addTearDown(tester.view.resetPadding);
          addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
          addTearDown(
            tester.platformDispatcher.clearPlatformBrightnessTestValue,
          );
          final boundaryKey = GlobalKey();
          final repository = LocalPlaylistRepository(
            MemoryLocalPlaylistStore([
              LocalPlaylist(
                id: 'long',
                name: '긴 한글 제목과 Symphony No. 5 in C minor 음악 모음',
                fileIds: const ['a', 'missing'],
                createdAtMillis: 1,
                updatedAtMillis: 1,
              ),
            ]),
          );
          await tester.pumpWidget(
            RepaintBoundary(
              key: boundaryKey,
              child: libraryApp(playlists: repository),
            ),
          );
          await tester.pumpAndSettle();
          final captures =
              Platform.environment['DDIRORI_LIBRARY_CAPTURE_OUTPUT'];
          Future<void> capture(String state) async {
            if (captures == null ||
                ![
                  '390-1-light',
                  '320-2-light',
                  '1024-2-dark',
                ].contains(label)) {
              return;
            }
            await tester.runAsync(() async {
              final image =
                  await (boundaryKey.currentContext!.findRenderObject()!
                          as RenderRepaintBoundary)
                      .toImage();
              final data = await image.toByteData(
                format: ui.ImageByteFormat.png,
              );
              final file = File('$captures/$state-$label.png');
              await file.parent.create(recursive: true);
              await file.writeAsBytes(data!.buffer.asUint8List());
              image.dispose();
            });
          }

          await capture('library');
          await tester.tap(find.byTooltip('도구 더보기'));
          await tester.pumpAndSettle();
          await tester.tap(find.text('보관함 분류 편집'));
          await tester.pumpAndSettle();
          await capture('section-editor');
          expect(tester.takeException(), isNull);
          await tester.ensureVisible(find.text('취소'));
          await tester.tap(find.text('취소'));
          await tester.pumpAndSettle();
          await openCategory(tester, 'playlists');
          await capture('playlist-list');
          await tester.tap(find.byKey(const ValueKey('playlist-long')));
          await tester.pumpAndSettle();
          expect(find.byTooltip('도구 더보기'), findsNothing);
          expect(find.byTooltip('재생목록 더보기'), findsOneWidget);
          await tester.tap(find.byTooltip('재생목록 더보기'));
          await tester.pumpAndSettle();
          await capture('playlist-menu');
          await tester.tap(find.text('편집'));
          await tester.pumpAndSettle();
          expect(find.byTooltip('Alpha 순서 및 삭제'), findsOneWidget);
          expect(tester.takeException(), isNull);
          await tester.tap(find.byTooltip('뒤로'));
          await tester.pumpAndSettle();
          await createDraft(tester, '새 재생목록');
          await capture('playlist-create');
          expect(
            tester.getSize(find.byType(TextField).last).height,
            greaterThanOrEqualTo(48),
          );
          expect(tester.takeException(), isNull);
          await tester.tap(find.text('저장'));
          await tester.pumpAndSettle();
          expect(find.byType(AlertDialog), findsNothing);
          expect(find.text('보기'), findsOneWidget);
          if (find.byType(SnackBarAction).evaluate().isNotEmpty) {
            expect(
              tester
                  .widget<SnackBarAction>(find.byType(SnackBarAction))
                  .textColor,
              isNotNull,
            );
          }
          await capture('playlist-created');
          expect(tester.takeException(), isNull);
        });
      }
    }
  }
}
