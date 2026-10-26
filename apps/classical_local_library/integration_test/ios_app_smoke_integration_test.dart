import 'dart:io';

import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/library_deduplication.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/main.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/metadata_overrides.dart';
import 'package:classical_local_library/sample_classical_library.dart';
import 'package:classical_local_library/scan_locations.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:classical_local_library/sqlite_database.dart';
import 'package:classical_local_library/sqlite_migration.dart';
import 'package:flutter/material.dart';
import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart' as sqflite;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('production app starts with SQLite storage on iOS', (
    tester,
  ) async {
    expect(Platform.isIOS, isTrue, reason: '이 smoke test는 iOS 전용입니다.');

    final supportDirectory = await getApplicationSupportDirectory();
    final databasePath =
        '${supportDirectory.path}/$classicalLocalDatabaseFileName';
    await sqflite.deleteDatabase(databasePath);

    await tester.pumpWidget(
      const ClassicalLocalLibraryApp(
        initialLibrary: emptyClassicalLibrary,
        enableDemoFeatures: false,
      ),
    );
    await _pumpUntil(
      tester,
      find.byWidgetPredicate(
        (widget) =>
            widget is DdiroriButton &&
            widget.label == '음악 가져오기' &&
            widget.onPressed != null,
      ),
      description: 'production storage startup',
    );

    expect(find.text('보관함'), findsOneWidget);
    expect(find.text('음악 가져오기'), findsOneWidget);
    expect(find.text('폴더 추가'), findsNothing);
    expect(find.text('데모 스캔'), findsNothing);
    expect(await File(databasePath).exists(), isTrue);

    if (find.byTooltip('도구 더보기').evaluate().isNotEmpty) {
      await tester.tap(find.byTooltip('도구 더보기'));
      await tester.pumpAndSettle();
      expect(find.text('음악 발견'), findsOneWidget);
      expect(find.text('음원 정보·파일 복구'), findsOneWidget);
      expect(find.text('재생 진단'), findsOneWidget);
      expect(find.text('앱 정보 및 데이터'), findsOneWidget);
      await tester.tap(find.text('음악 발견'));
      await tester.pump();
      expect(find.text('음원 정보·파일 복구'), findsOneWidget);
      await tester.tap(find.text('IMSLP 자료'));
    } else {
      expect(find.byTooltip('음악 발견'), findsOneWidget);
      expect(find.byTooltip('음원 정보·파일 복구'), findsOneWidget);
      expect(find.byTooltip('재생 진단'), findsOneWidget);
      expect(find.byTooltip('앱 정보 및 데이터'), findsOneWidget);
      await tester.tap(find.byTooltip('IMSLP 자료'));
    }
    await _pumpUntil(
      tester,
      find.textContaining('먼저 음원 파일을 작품과 녹음에 정리'),
      description: 'IMSLP route startup',
    );
    await tester.pumpAndSettle();
    expect(find.text('IMSLP 자료'), findsOneWidget);
    expect(find.byTooltip('IMSLP 검색'), findsNothing);

    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump(const Duration(milliseconds: 250));
    await Future<void>.delayed(const Duration(milliseconds: 250));

    final database = await sqflite.openDatabase(databasePath, readOnly: true);
    final migrations = await database.query('schema_migrations');
    final tableRows = await database.rawQuery(
      "SELECT name FROM sqlite_master "
      "WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    );
    final integrity = await database.rawQuery('PRAGMA integrity_check');
    await database.close();

    expect(
      migrations,
      contains(
        predicate<Map<String, Object?>>((row) {
          return row['version'] == const SqliteStorageSchema().version;
        }),
      ),
    );
    final tables = tableRows.map((row) => row['name']).toSet();
    expect(
      tables,
      containsAll(<String>{
        'scanned_audio_files',
        'scan_locations',
        'metadata_candidates',
        'audio_file_track_links',
        'playback_positions',
        'playback_history',
        'playback_history_preferences',
        'playback_queue_state',
        'imslp_work_links',
        'imslp_resources',
        'imslp_imports',
        'local_audio_imports',
        'metadata_overrides',
        'library_entity_merges',
        'musicbrainz_cache',
        'catalog_people',
        'catalog_works',
        'catalog_work_parts',
        'catalog_recordings',
        'catalog_recording_credits',
        'catalog_tracks',
        'app_reset_state',
      }),
    );
    expect(integrity.single.values.single, 'ok');
  }, timeout: const Timeout(Duration(seconds: 45)));

  testWidgets(
    'work and recording details open and build an ordered queue on iOS',
    (tester) async {
      expect(Platform.isIOS, isTrue, reason: '이 smoke test는 iOS 전용입니다.');
      final links = [
        for (final track in sampleClassicalLibrary.tracks)
          AudioFileTrackLink(
            fileId: track.fileId,
            trackId: track.id,
            linkedAtMillis: 1,
          ),
      ];
      final player = FakeLocalPlayer();

      await tester.pumpWidget(
        ClassicalLocalLibraryApp(
          initialLibrary: sampleClassicalLibrary,
          enableDemoFeatures: false,
          playbackController: player,
          scanRepository: ScannedAudioRepository(
            MemoryScannedAudioStore(sampleClassicalLibrary.files),
          ),
          scanLocationRepository: ScanLocationRepository(
            MemoryScanLocationStore(),
          ),
          metadataCandidateRepository: MetadataCandidateRepository(
            MemoryMetadataCandidateStore(),
          ),
          metadataOverrideRepository: MetadataOverrideRepository(
            MemoryMetadataOverrideStore(),
          ),
          libraryMergeRepository: LibraryMergeRepository(
            MemoryLibraryMergeStore(),
          ),
          fileTrackLinkRepository: AudioFileTrackLinkRepository(
            MemoryAudioFileTrackLinkStore(links),
          ),
          catalogRepository: ClassicalCatalogRepository(
            MemoryClassicalCatalogStore(sampleClassicalLibrary),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byTooltip('내 음악 검색'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), '운명');
      await tester.pumpAndSettle();
      await tester.tap(find.text('교향곡 5번 다단조').last);
      await tester.pumpAndSettle();
      expect(find.text('작품'), findsOneWidget);
      expect(find.text('악장'), findsOneWidget);

      await tester.scrollUntilVisible(find.text('클라이버 / 빈 필하모닉 연주 녹음'), 400);
      await tester.drag(find.byType(ListView).last, const Offset(0, -160));
      await tester.pumpAndSettle();
      await tester.tap(find.text('클라이버 / 빈 필하모닉 연주 녹음'));
      await tester.pumpAndSettle();
      expect(find.text('녹음'), findsOneWidget);

      await tester.tap(find.text('녹음 전체 재생'));
      await tester.pumpAndSettle();
      expect(player.playbackState.playerState, LocalPlayerState.playing);
      expect(player.playbackState.queue.map((item) => item.trackId), [
        'track.beethoven5.kleiber.1',
        'track.beethoven5.kleiber.2',
        'track.beethoven5.kleiber.3',
        'track.beethoven5.kleiber.4',
      ]);

      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpAndSettle();
    },
    timeout: const Timeout(Duration(seconds: 45)),
  );
}

Future<void> _pumpUntil(
  WidgetTester tester,
  Finder finder, {
  required String description,
}) async {
  for (var attempt = 0; attempt < 60; attempt += 1) {
    await tester.pump(const Duration(milliseconds: 250));
    if (finder.evaluate().isNotEmpty) return;
  }
  fail('$description timed out');
}
