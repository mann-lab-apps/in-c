import 'dart:io';

import 'package:classical_local_library/app_settings.dart';
import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/local_data_control.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/main.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/playback_position.dart';
import 'package:classical_local_library/scan_locations.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:classical_local_library/sqlite_database.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'home reset drains stop writes and disposal cannot recreate deleted positions',
    (tester) async {
      late Directory directory;
      late Database database;
      await tester.runAsync(() async {
        final temporary = await getTemporaryDirectory();
        directory = await temporary.createTemp('reset_wiring_');
        database = await ClassicalLocalDatabase(
          path: '${directory.path}/library.sqlite',
        ).open();
      });
      addTearDown(() async {
        await database.close();
        await directory.delete(recursive: true);
      });
      final player = _SavingPlayer(SqlitePlaybackPositionStore(database));
      final queueStore = MemoryPlaybackQueueSnapshotStore();
      final control = LocalDataControlService(
        database: database,
        managedDirectories: const [],
      );
      await tester.pumpWidget(
        ClassicalLocalLibraryApp(
          playbackController: player,
          localDataControlService: control,
          playbackQueueSnapshotStore: queueStore,
          scanRepository: ScannedAudioRepository(MemoryScannedAudioStore()),
          scanLocationRepository: ScanLocationRepository(
            MemoryScanLocationStore(),
          ),
          metadataCandidateRepository: MetadataCandidateRepository(
            MemoryMetadataCandidateStore(),
          ),
          fileTrackLinkRepository: AudioFileTrackLinkRepository(
            MemoryAudioFileTrackLinkStore(),
          ),
        ),
      );
      await tester.runAsync(
        () async => Future<void>.delayed(const Duration(milliseconds: 100)),
      );
      await tester.pumpAndSettle();
      await player.loadQueue([
        const LocalPlaybackQueueItem(
          trackId: 'track-reset',
          recordingId: 'recording-reset',
          workId: 'work-reset',
          displayTitle: 'fixture',
          path: '/fixture/audio.wav',
          usesLinkedFile: true,
          workTitle: 'fixture',
          recordingTitle: 'fixture',
        ),
      ]);
      await player.play();
      await tester.pumpAndSettle();
      if (find.byTooltip('도구 더보기').evaluate().isNotEmpty) {
        await tester.tap(find.byTooltip('도구 더보기'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('앱 정보 및 데이터'));
      } else {
        await tester.tap(find.byTooltip('앱 정보 및 데이터'));
      }
      await tester.pumpAndSettle();
      final settings = tester.widget<AppSettingsScreen>(
        find.byType(AppSettingsScreen),
      );
      await tester.runAsync(() async {
        await settings.onBeforeReset!();
        expect(
          await database.query('playback_positions'),
          isNotEmpty,
          reason: 'stop persists before reset, never after it',
        );
        await settings.dataControl.reset();
        await settings.onResetComplete();
      });
      await tester.pumpAndSettle();
      expect(player.playbackState.queue, isEmpty);
      expect(queueStore.snapshot, isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.runAsync(() async {
        await Future<void>.delayed(const Duration(milliseconds: 100));
        expect(await database.query('playback_positions'), isEmpty);
        expect(await database.query('playback_queue_state'), isEmpty);
        expect(await database.query('playback_history'), isEmpty);
      });
      expect(tester.takeException(), isNull);
    },
  );
}

class _SavingPlayer extends FakeLocalPlayer {
  _SavingPlayer(this.store);
  final PlaybackPositionStore store;

  @override
  Future<void> persistPosition() async {
    final item = playbackState.currentItem;
    if (item == null) return;
    await store.save(
      PlaybackPositionRecord(
        path: item.path,
        positionMillis: 500,
        durationMillis: 5000,
        updatedAtMillis: 1,
        isCompleted: false,
      ),
    );
  }

  @override
  Future<void> stop() async {
    await persistPosition();
    await super.stop();
  }

  @override
  Future<void> dispose() async {
    await persistPosition();
    await super.dispose();
  }
}
