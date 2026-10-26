import 'dart:io';

import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/library_details.dart';
import 'package:classical_local_library/library_discovery.dart';
import 'package:classical_local_library/library_search.dart';
import 'package:classical_local_library/local_file_library.dart';
import 'package:classical_local_library/playback_planner.dart';
import 'package:classical_local_library/sqlite_database.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import '../tool/large_library_fixture.dart';

void main() {
  test('100명, 1000작품, 5000악장 fixture는 결정론적으로 생성된다', () {
    final first = buildLargeLibraryFixture();
    final second = buildLargeLibraryFixture();

    expect(first.library.people, hasLength(100));
    expect(first.library.works, hasLength(1000));
    expect(first.library.recordings, hasLength(1000));
    expect(first.library.tracks, hasLength(5000));
    expect(first.library.tracks.last.id, second.library.tracks.last.id);
  });

  test('대형 fixture 주요 질의는 순서와 넉넉한 성능 상한을 지킨다', () {
    final fixture = buildLargeLibraryFixture();
    final library = fixture.library;
    final stopwatch = Stopwatch()..start();

    final fileLibrary = const LocalFileLibrary();
    final fileEntries = fileLibrary.entries(files: library.files);
    expect(fileEntries, hasLength(5000));
    expect(
      fileLibrary.sort(fileEntries, LocalFileSort.dateAdded),
      hasLength(5000),
    );
    expect(
      fileLibrary.search(fileEntries, fileEntries.last.file.fileName!),
      isNotEmpty,
    );

    expect(library.track('track-4999').sequenceNumber, 5);
    expect(
      library.tracksForRecording('recording-999').map((track) => track.id),
      ['track-4995', 'track-4996', 'track-4997', 'track-4998', 'track-4999'],
    );
    final search = const LibrarySearchService().search(
      library: library,
      files: library.files,
      candidates: const [],
      query: '작곡가 99 작품 999',
    );
    expect(search.first.id, 'work-999');
    final builder = LibraryDetailBuilder(
      library: library,
      scannedFiles: library.files,
      links: fixture.links,
    );
    expect(builder.buildWork('work-999').recordings, hasLength(1));
    expect(builder.buildRecording('recording-999').tracks, hasLength(5));
    expect(
      const LibraryDiscoveryService().otherWorksByComposer(
        library,
        workId: 'work-999',
      ),
      hasLength(9),
    );
    final plan = ClassicalPlaybackPlanner(library: library)
        .createPlanForRecording('recording-999', PlaybackMode.recordingRandom);
    expect(plan.items.map((item) => item.track.sequenceNumber), [
      1,
      2,
      3,
      4,
      5,
    ]);

    stopwatch.stop();
    expect(stopwatch.elapsed, lessThan(const Duration(seconds: 5)));
  });

  test('SQLite 카탈로그는 5000트랙을 고정 query 경로로 불러온다', () async {
    sqfliteFfiInit();
    final fixture = buildLargeLibraryFixture();
    final temporaryDirectory = await Directory.systemTemp.createTemp(
      'ddirori-play-large-library-',
    );
    final database = await databaseFactoryFfi.openDatabase(
      '${temporaryDirectory.path}/library.sqlite',
    );
    try {
      await const SqliteMigrationRunner().applySchema(database);
      final store = SqliteClassicalCatalogStore(database);
      await store.save(fixture.library);

      final stopwatch = Stopwatch()..start();
      final loaded = await store.load(fixture.library.files);
      stopwatch.stop();

      expect(loaded.people, hasLength(100));
      expect(loaded.works, hasLength(1000));
      expect(loaded.recordings, hasLength(1000));
      expect(loaded.tracks, hasLength(5000));
      expect(stopwatch.elapsed, lessThan(const Duration(seconds: 5)));
    } finally {
      await database.close();
      await temporaryDirectory.delete(recursive: true);
    }
  }, timeout: const Timeout(Duration(seconds: 30)));
}
