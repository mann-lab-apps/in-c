import 'dart:convert';
import 'dart:io';

import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/main.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/scan_locations.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:classical_local_library/sqlite_database.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:path_provider/path_provider.dart';

import '../tool/large_library_fixture.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('5000-track native SQLite startup, search, scroll and queue', (
    tester,
  ) async {
    final fixture = buildLargeLibraryFixture();
    final temporary = await getTemporaryDirectory();
    final directory = await temporary.createTemp('large-library-');
    final database = await ClassicalLocalDatabase(
      path: '${directory.path}/fixture.sqlite',
    ).open();
    addTearDown(() async {
      await database.close();
      await directory.delete(recursive: true);
    });
    final catalog = SqliteClassicalCatalogStore(database);
    await SqliteScannedAudioStore(database).save(fixture.library.files);
    await catalog.save(fixture.library);
    final timings = <String, int>{};
    var watch = Stopwatch()..start();
    final library = await catalog.load(fixture.library.files);
    timings['sqliteLoadMicros'] = watch.elapsedMicroseconds;
    expect(library.tracks, hasLength(5000));
    final player = FakeLocalPlayer();
    final rssBefore = ProcessInfo.currentRss;
    watch = Stopwatch()..start();
    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        initialLibrary: library,
        enableDemoFeatures: false,
        playbackController: player,
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
          MemoryAudioFileTrackLinkStore(fixture.links),
        ),
        catalogRepository: ClassicalCatalogRepository(
          MemoryClassicalCatalogStore(library),
        ),
      ),
    );
    await tester.pumpAndSettle();
    timings['widgetStartupMicros'] = watch.elapsedMicroseconds;
    watch = Stopwatch()..start();
    await tester.enterText(find.byType(TextField), '작곡가 99 작품 999');
    await tester.pumpAndSettle();
    expect(find.text('작품 999'), findsWidgets);
    timings['searchIncludingDebounceMicros'] = watch.elapsedMicroseconds;
    await tester.tap(find.text('작품 999').first);
    await tester.pumpAndSettle();
    watch = Stopwatch()..start();
    await tester.scrollUntilVisible(
      find.text('녹음 999'),
      200,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.drag(find.byType(ListView).last, const Offset(0, -160));
    await tester.pumpAndSettle();
    timings['detailScrollMicros'] = watch.elapsedMicroseconds;
    await tester.tap(find.text('녹음 999').hitTestable());
    await tester.pumpAndSettle();
    watch = Stopwatch()..start();
    await tester.tap(find.text('녹음 전체 재생'));
    await tester.pumpAndSettle();
    timings['queueActionMicros'] = watch.elapsedMicroseconds;
    expect(player.playbackState.queue.map((item) => item.trackId), [
      'track-4995',
      'track-4996',
      'track-4997',
      'track-4998',
      'track-4999',
    ]);
    expect(tester.takeException(), isNull);
    // Fixture-only measurements, not a release gate or a physical-device benchmark.
    debugPrint(
      jsonEncode({
        'evidence': 'largeLibraryDebugIntegration',
        'tracks': 5000,
        'timingsMicros': timings,
        'rssBeforeBytes': rssBefore,
        'rssAfterBytes': ProcessInfo.currentRss,
        'processMaxRssBytes': ProcessInfo.maxRss,
        'physicalDevicePerformanceVerified': false,
      }),
    );
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpAndSettle();
  }, timeout: const Timeout(Duration(seconds: 90)));
}
