import 'dart:io';
import 'dart:typed_data';

import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/imslp.dart';
import 'package:classical_local_library/just_audio_playback.dart';
import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/local_audio_import.dart';
import 'package:classical_local_library/local_audio_scanner.dart';
import 'package:classical_local_library/local_favorites.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/main.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/playback_position.dart';
import 'package:classical_local_library/scan_locations.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:classical_local_library/sqlite_database.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart' as sql;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'IMSLP entry imports audio without catalog, plays natively and restores favorite/edited queue',
    (tester) async {
      expect(Platform.isIOS, isTrue);
      final dir = await Directory(
        '${(await getTemporaryDirectory()).path}/music-actions-fixtures',
      ).create(recursive: true);
      final run = await dir.createTemp('run-');
      var database = await ClassicalLocalDatabase(
        path: '${run.path}/library.sqlite',
      ).open();
      final source = File('${run.path}/Native Prelude.wav');
      final wav = (await rootBundle.load('assets/audio_test/movement_1.wav'))
          .buffer
          .asUint8List();
      final header = Uint8List.fromList(wav.sublist(0, 44)),
          samples = wav.sublist(44);
      const repeat = 30;
      ByteData.sublistView(header)
        ..setUint32(4, 36 + samples.length * repeat, Endian.little)
        ..setUint32(40, samples.length * repeat, Endian.little);
      await source.writeAsBytes(
        (BytesBuilder()
              ..add(header)
              ..add([for (var i = 0; i < repeat; i++) ...samples]))
            .takeBytes(),
      );
      var player = _player(database);
      addTearDown(() async {
        await tester.pumpWidget(const SizedBox.shrink());
        await player.dispose();
        await tester.runAsync(
          () => Future<void>.delayed(const Duration(milliseconds: 100)),
        );
        if (database.isOpen) await database.close();
        if (await run.exists()) await run.delete(recursive: true);
      });
      Widget app() {
        final scanned = ScannedAudioRepository(
          SqliteScannedAudioStore(database),
        );
        final candidates = MetadataCandidateRepository(
          SqliteMetadataCandidateStore(database),
        );
        return ClassicalLocalLibraryApp(
          initialLibrary: emptyClassicalLibrary,
          enableDemoFeatures: false,
          supportsFolderScan: false,
          playbackController: player,
          playbackQueueSnapshotStore: SqlitePlaybackQueueSnapshotStore(
            database,
          ),
          playbackPositionStore: SqlitePlaybackPositionStore(database),
          scanRepository: scanned,
          scanLocationRepository: ScanLocationRepository(
            MemoryScanLocationStore(),
          ),
          metadataCandidateRepository: candidates,
          fileTrackLinkRepository: AudioFileTrackLinkRepository(
            SqliteAudioFileTrackLinkStore(database),
          ),
          localFavoritesRepository: LocalFavoritesRepository(
            SqliteLocalFavoritesStore(database),
          ),
          imslpStore: MemoryImslpStore(),
          imslpCatalogClient: const _WorkClient(),
          audioFilePicker: _Picker(source),
          localAudioImportCoordinator: LocalAudioImportCoordinator(
            store: SqliteLocalAudioImportStore(database),
            destination: Directory('${run.path}/managed'),
            scanner: const FileSystemAudioFileScanner(),
            scannedAudioRepository: scanned,
            metadataCandidateRepository: candidates,
          ),
        );
      }

      await tester.pumpWidget(app());
      await _until(
        tester,
        () => find.text('보관함이 비어 있습니다').evaluate().isNotEmpty,
      );
      await _tap(tester, find.byTooltip('도구 더보기'));
      await _tap(tester, find.text('IMSLP 자료'));
      await _until(
        tester,
        () => find.byTooltip('IMSLP 검색').evaluate().isNotEmpty,
      );
      await tester.enterText(find.byType(TextField).first, 'Fixture Prelude');
      await _tap(tester, find.byTooltip('IMSLP 검색'));
      await _until(
        tester,
        () => find.text('Fixture Prelude').evaluate().isNotEmpty,
      );
      expect(await database.query('catalog_works'), isEmpty);
      expect(player.playbackState.hasQueue, isFalse);
      await _tap(tester, find.text('음원 파일 가져오기'));
      await _until(tester, () => find.text('가져온 곡 재생').evaluate().isNotEmpty);
      final files = await ScannedAudioRepository(
        SqliteScannedAudioStore(database),
      ).load();
      expect(files, hasLength(1));
      expect(
        files.single.sourceReferences.any((r) => r.kind == SourceKind.imslp),
        isFalse,
      );
      expect(await database.query('catalog_works'), isEmpty);
      expect(player.playbackState.playerState, isNot(LocalPlayerState.playing));
      await _tap(tester, find.text('가져온 곡 재생'));
      await _until(
        tester,
        () => player.playbackState.playerState == LocalPlayerState.playing,
      );
      await _tap(tester, find.text('가져온 곡 보기'));
      await _until(
        tester,
        () => find.byTooltip('Native Prelude 더보기').evaluate().isNotEmpty,
      );
      await _tap(tester, find.byTooltip('Native Prelude 더보기'));
      await _tap(tester, find.text('즐겨찾기 추가'));
      await _until(
        tester,
        () => find.textContaining('즐겨찾기 ·').evaluate().isNotEmpty,
      );
      expect(await SqliteLocalFavoritesStore(database).load(), {
        files.single.id,
      });
      await player.pause();
      await player.seek(const Duration(seconds: 2));
      for (var i = 0; i < 2; i++) {
        await _tap(tester, find.byTooltip('Native Prelude 더보기'));
        await _tap(tester, find.text('바로 다음에 재생'));
        await _until(tester, () => player.playbackState.queue.length == i + 2);
        expect(player.playbackState.playerState, LocalPlayerState.paused);
      }
      expect(player.playbackState.currentIndex, 0);
      expect(player.playbackState.position.inMilliseconds, closeTo(2000, 150));
      await _tap(tester, find.byTooltip('재생 상세 열기'));
      await _tap(tester, find.byTooltip('3번 대기열 편집'));
      await _tap(tester, find.text('대기열에서 제거'));
      await _until(tester, () => player.playbackState.queue.length == 2);
      await player.setRepeatMode(LocalRepeatMode.all);
      await player.setShuffleEnabled(true);
      await player.persistPosition();
      final before = player.playbackState;
      await _until(tester, () => !player.playbackState.isBusy);
      await tester.pumpWidget(const SizedBox.shrink());
      await player.dispose();
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 100)),
      );
      final snapshot = await SqlitePlaybackQueueSnapshotStore(database).load();
      expect(snapshot!.trackIds, hasLength(2));
      expect(snapshot.shuffleEnabled, isTrue);
      expect(snapshot.repeatMode, LocalRepeatMode.all);
      await database.close();
      database = await ClassicalLocalDatabase(
        path: '${run.path}/library.sqlite',
      ).open();
      player = _player(database);
      await tester.pumpWidget(app());
      await _until(
        tester,
        () => player.playbackState.playerState == LocalPlayerState.ready,
      );
      expect(
        player.playbackState.queue.map((e) => e.trackId),
        before.queue.map((e) => e.trackId),
      );
      expect(player.playbackState.currentIndex, before.currentIndex);
      expect(player.playbackState.queueOrder, before.queueOrder);
      expect(player.playbackState.shuffleEnabled, isTrue);
      expect(player.playbackState.repeatMode, LocalRepeatMode.all);
      expect(player.playbackState.position.inMilliseconds, closeTo(2000, 200));
      expect(await SqliteLocalFavoritesStore(database).load(), {
        files.single.id,
      });
      expect(await database.query('catalog_works'), isEmpty);
      await _tap(tester, find.byKey(const ValueKey('file-category-favorites')));
      await _until(
        tester,
        () => find.byTooltip('Native Prelude 재생').evaluate().isNotEmpty,
      );
      expect(player.playbackState.playerState, LocalPlayerState.ready);
      expect(tester.takeException(), isNull);
    },
    timeout: const Timeout(Duration(minutes: 4)),
  );
}

SerializedLocalPlaybackController _player(sql.Database database) =>
    SerializedLocalPlaybackController(
      JustAudioLocalPlaybackController(
        positionCoordinator: PlaybackPositionCoordinator(
          store: SqlitePlaybackPositionStore(database),
        ),
      ),
    );

class _Picker implements AudioFilePicker {
  const _Picker(this.file);
  final File file;
  @override
  Future<List<SelectedAudioFile>> pickAudioFiles() async => [
    FileSelectedAudioFile(file, mimeType: 'audio/wav'),
  ];
}

class _WorkClient implements ImslpCatalogClient {
  const _WorkClient();
  @override
  Future<List<ImslpWorkSearchResult>> searchWorks(
    String query, {
    int limit = 8,
  }) async => [
    ImslpWorkSearchResult(
      externalId: 'fixture-prelude',
      title: 'Fixture Prelude',
      pageUrl: Uri.parse('https://imslp.org/wiki/Fixture_Prelude'),
    ),
  ];
}

Future<void> _until(WidgetTester tester, bool Function() ready) async {
  final watch = Stopwatch()..start();
  while (!ready()) {
    if (watch.elapsed > const Duration(seconds: 30)) {
      fail('Native workflow did not reach the required state');
    }
    await tester.pump(const Duration(milliseconds: 100));
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 30)),
    );
  }
  await tester.pump();
}

Future<void> _tap(WidgetTester tester, Finder finder) async {
  await tester.pumpAndSettle();
  final scrollable = find
      .byWidgetPredicate(
        (widget) =>
            widget is Scrollable &&
            axisDirectionToAxis(widget.axisDirection) == Axis.vertical,
      )
      .hitTestable();
  if (finder.evaluate().isEmpty && scrollable.evaluate().isNotEmpty) {
    await tester.scrollUntilVisible(finder, 220, scrollable: scrollable.first);
  }
  expect(finder, findsOneWidget);
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pump(const Duration(milliseconds: 100));
}
