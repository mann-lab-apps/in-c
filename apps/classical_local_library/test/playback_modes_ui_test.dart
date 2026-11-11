import 'dart:io';
import 'dart:math';
import 'dart:ui' as ui;

import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/main.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/scan_locations.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:classical_local_library/sample_classical_library.dart';
import 'package:classical_local_library/local_playlists.dart';
import 'package:classical_local_library/presentation/play_playback_components.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'library_navigation_test.dart' as fixture;
import 'playback_modes_test.dart' show modeQueue;

void main() {
  setUpAll(() async {
    for (final font in [
      ('DdiroriLibraryCapture', Platform.environment['DDIRORI_CAPTURE_FONT']),
      ('MaterialIcons', Platform.environment['DDIRORI_MATERIAL_FONT']),
    ]) {
      if (font.$2 != null) {
        await (FontLoader(font.$1)..addFont(
              File(font.$2!).readAsBytes().then((b) => ByteData.sublistView(b)),
            ))
            .load();
      }
    }
  });
  for (final width in [320.0, 390.0, 1024.0]) {
    for (final scale in [1.0, 2.0]) {
      for (final brightness in Brightness.values) {
        final label = '${width.toInt()}-${scale.toInt()}-${brightness.name}';
        testWidgets(
          'real app mode controls and queue preserve playback $label',
          (tester) async {
            tester.view.physicalSize = Size(width, 1000);
            tester.view.devicePixelRatio = 1;
            tester.view.padding = const FakeViewPadding(bottom: 24);
            tester.platformDispatcher.textScaleFactorTestValue = scale;
            tester.platformDispatcher.platformBrightnessTestValue = brightness;
            tester.platformDispatcher.accessibilityFeaturesTestValue =
                FakeAccessibilityFeatures(disableAnimations: scale == 2);
            addTearDown(tester.view.resetPhysicalSize);
            addTearDown(tester.view.resetDevicePixelRatio);
            addTearDown(tester.view.resetPadding);
            addTearDown(
              tester.platformDispatcher.clearTextScaleFactorTestValue,
            );
            addTearDown(
              tester.platformDispatcher.clearPlatformBrightnessTestValue,
            );
            addTearDown(
              tester.platformDispatcher.clearAccessibilityFeaturesTestValue,
            );
            final queue = modeQueue(6),
                p = FakeLocalPlayer(
                  random: Random(7),
                  trackDurations: {
                    for (final item in modeQueue(6))
                      item.trackId: const Duration(minutes: 2),
                  },
                );
            await p.loadQueue(queue);
            await p.play();
            await p.seek(const Duration(seconds: 7));
            await p.pause();
            final key = GlobalKey();
            await tester.pumpWidget(
              RepaintBoundary(
                key: key,
                child: fixture.libraryApp(player: p),
              ),
            );
            await tester.pumpAndSettle();
            await tester.tap(find.byTooltip('재생 상세 열기'));
            await tester.pumpAndSettle();
            Future<void> capture(String state) async {
              final path =
                  Platform.environment['DDIRORI_LIBRARY_CAPTURE_OUTPUT'];
              if (path == null ||
                  ![
                    '390-1-light',
                    '320-2-light',
                    '1024-2-dark',
                  ].contains(label)) {
                return;
              }
              await tester.pump(const Duration(milliseconds: 250));
              await tester.runAsync(() async {
                final image =
                    await (key.currentContext!.findRenderObject()!
                            as RenderRepaintBoundary)
                        .toImage();
                final bytes = await image.toByteData(
                  format: ui.ImageByteFormat.png,
                );
                await File('$path/playback-modes-$state-$label.png')
                    .writeAsBytes(bytes!.buffer.asUint8List());
                image.dispose();
              });
            }

            Future<void> tap(String name) async {
              await tester.ensureVisible(find.byTooltip(name));
              await tester.pumpAndSettle();
              await tester.tap(find.byTooltip(name));
              await tester.pumpAndSettle();
            }

            await tester.ensureVisible(find.byTooltip('반복 끔'));
            await capture('off');
            await tap('반복 끔');
            expect(p.playbackState.repeatMode, LocalRepeatMode.all);
            await capture('all');
            await tap('전체 반복');
            expect(p.playbackState.repeatMode, LocalRepeatMode.one);
            await capture('one');
            await tap('셔플 꺼짐');
            expect(p.playbackState.shuffleEnabled, isTrue);
            await capture('shuffle');
            expect(find.text('셔플 켜짐 · 한 곡 반복'), findsOneWidget);
            expect(p.playbackState.position.inSeconds, 7);
            expect(p.state, LocalPlayerState.paused);
            expect(p.currentItem, same(queue.first));
            await tap('다음');
            expect(p.currentItem, p.queue[1]);
            final selected = p.currentItem;
            expect(p.state, LocalPlayerState.paused);
            await tap('셔플 켜짐');
            expect(p.queue, queue);
            await tap('한 곡 반복');
            expect(p.playbackState.repeatMode, LocalRepeatMode.off);
            await tester.pageBack();
            await tester.pumpAndSettle();
            await tester.tap(find.byTooltip('내 음악 검색'));
            await tester.pumpAndSettle();
            expect(p.state, LocalPlayerState.paused);
            expect(p.currentItem, same(selected));
            expect(tester.takeException(), isNull);
          },
        );
      }
    }
  }

  testWidgets(
    'mixed recording queue restores both recordings and original order without autoplay',
    (tester) async {
      final library = sampleClassicalLibrary, p = FakeLocalPlayer();
      final a = library.tracksForRecording(library.recordings.first.id).first;
      final b = library
          .tracksForRecording(
            library.recordings
                .firstWhere((r) => r.workId != library.recordings.first.workId)
                .id,
          )
          .first;
      final store = MemoryPlaybackQueueSnapshotStore()
        ..snapshot = PlaybackQueueSnapshot(
          trackIds: [b.id, a.id],
          currentTrackId: a.id,
          savedAtMillis: 1,
          currentIndex: 1,
          queueOrder: [1, 0],
          shuffleEnabled: true,
          repeatMode: LocalRepeatMode.all,
        );
      await tester.pumpWidget(
        ClassicalLocalLibraryApp(
          initialLibrary: library,
          enableDemoFeatures: false,
          playbackController: p,
          playbackQueueSnapshotStore: store,
          scanRepository: ScannedAudioRepository(
            MemoryScannedAudioStore(library.files),
          ),
          scanLocationRepository: ScanLocationRepository(
            MemoryScanLocationStore(),
          ),
          metadataCandidateRepository: MetadataCandidateRepository(
            MemoryMetadataCandidateStore(),
          ),
          fileTrackLinkRepository: AudioFileTrackLinkRepository(
            MemoryAudioFileTrackLinkStore([
              for (final track in library.tracks)
                AudioFileTrackLink(
                  fileId: track.fileId,
                  trackId: track.id,
                  linkedAtMillis: 1,
                ),
            ]),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(p.queue.map((i) => i.trackId), [b.id, a.id]);
      expect(p.currentItem!.trackId, a.id);
      expect(p.state, LocalPlayerState.ready);
      expect(p.playbackState.repeatMode, LocalRepeatMode.all);
      await p.setShuffleEnabled(false);
      expect(p.queue.map((i) => i.trackId), [a.id, b.id]);
      expect(p.currentItem!.trackId, a.id);
    },
  );

  testWidgets(
    'playlist playback shuffle never changes the saved manual order',
    (tester) async {
      final files = [
        for (final id in ['a', 'b', 'c', 'd'])
          LocalAudioFile(
            id: id,
            path: '/fixture/$id.wav',
            fileName: '$id.wav',
            format: 'wav',
          ),
      ];
      final saved = LocalPlaylist(
        id: 'modes-playlist',
        name: '반복 확인',
        fileIds: ['d', 'b', 'a', 'c'],
        createdAtMillis: 1,
        updatedAtMillis: 1,
      );
      final repository = LocalPlaylistRepository(
        MemoryLocalPlaylistStore([saved]),
      );
      final p = FakeLocalPlayer(random: Random(7));
      await tester.pumpWidget(
        fixture.libraryApp(
          player: p,
          playlists: repository,
          libraryFiles: files,
        ),
      );
      await tester.pumpAndSettle();
      await fixture.openCategory(tester, 'playlists');
      await tester.tap(find.text('반복 확인'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('모두 재생'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byTooltip('재생 상세 열기'));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('재생 상세 열기'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byTooltip('셔플 꺼짐'));
      await tester.tap(find.byTooltip('셔플 꺼짐'));
      await tester.pumpAndSettle();
      expect(p.playbackState.shuffleEnabled, isTrue);
      expect(p.queue.map((i) => i.trackId).toSet(), {
        'local-file:d',
        'local-file:b',
        'local-file:a',
        'local-file:c',
      });
      expect((await repository.load()).single.fileIds, saved.fileIds);
    },
  );

  testWidgets(
    'empty loading and error modes are disabled; unknown duration still permits modes',
    (tester) async {
      var commands = 0;
      for (final state in [
        const LocalPlaybackState.idle(),
        LocalPlaybackState(
          playerState: LocalPlayerState.loading,
          queue: modeQueue(),
          currentIndex: 0,
        ),
        LocalPlaybackState(
          playerState: LocalPlayerState.error,
          queue: modeQueue(),
          currentIndex: 0,
          failure: const LocalPlaybackFailure(
            kind: LocalPlaybackFailureKind.loadFailed,
            userMessage: '파일을 확인하세요.',
          ),
        ),
      ]) {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SingleChildScrollView(
                child: PlayNowPlayingControls(
                  state: state,
                  canUseQueue: state.hasQueue,
                  commandRunning: false,
                  onPlayPause: () {},
                  onNext: () {},
                  onStop: () {},
                  onSeek: (_) {},
                  onShuffle: () => commands++,
                  onRepeat: () => commands++,
                ),
              ),
            ),
          ),
        );
        await tester.pump();
        await tester.ensureVisible(find.byTooltip('셔플 꺼짐'));
        await tester.tap(find.byTooltip('셔플 꺼짐'));
        await tester.ensureVisible(find.byTooltip('반복 끔'));
        await tester.tap(find.byTooltip('반복 끔'));
        expect(commands, 0);
      }
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: PlayNowPlayingControls(
                state: LocalPlaybackState(
                  playerState: LocalPlayerState.ready,
                  queue: modeQueue(),
                  currentIndex: 0,
                  modeError: '반복을 변경하지 못했습니다. 다시 시도해 주세요.',
                ),
                canUseQueue: true,
                commandRunning: false,
                onPlayPause: () {},
                onNext: () {},
                onStop: () {},
                onSeek: (_) {},
                onShuffle: () => commands++,
                onRepeat: () => commands++,
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byTooltip('반복 끔'));
      await tester.tap(find.byTooltip('반복 끔'));
      expect(commands, 1);
      expect(find.textContaining('다시 시도'), findsOneWidget);
    },
  );
}
