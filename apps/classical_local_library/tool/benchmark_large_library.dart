import 'dart:convert';
import 'dart:io';

import 'package:classical_local_library/library_details.dart';
import 'package:classical_local_library/library_discovery.dart';
import 'package:classical_local_library/library_search.dart';
import 'package:classical_local_library/local_file_library.dart';
import 'package:classical_local_library/playback_planner.dart';

import 'large_library_fixture.dart';

void main(List<String> arguments) {
  if (arguments.isNotEmpty &&
      (arguments.length != 1 || arguments.single != '--stress')) {
    stderr.writeln(
      'Usage: dart run tool/benchmark_large_library.dart [--stress]',
    );
    exitCode = 64;
    return;
  }
  final rssBefore = ProcessInfo.currentRss;
  final started = Stopwatch()..start();
  final fixture = buildLargeLibraryFixture(
    composerCount: arguments.contains('--stress') ? 400 : 100,
  );
  final fixtureMicros = started.elapsedMicroseconds;
  final library = fixture.library;
  final timings = <String, int>{};

  T measure<T>(String name, T Function() operation) {
    final stopwatch = Stopwatch()..start();
    final result = operation();
    stopwatch.stop();
    timings[name] = stopwatch.elapsedMicroseconds;
    return result;
  }

  final lastWork = library.works.last.id;
  final lastRecording = library.recordings.last.id;
  final entries = measure(
    'fileEntries',
    () => const LocalFileLibrary().entries(files: library.files),
  );
  measure(
    'fileSort',
    () => const LocalFileLibrary().sort(entries, LocalFileSort.title),
  );
  measure(
    'fileSearch',
    () => const LocalFileLibrary().search(entries, entries.last.title),
  );
  measure('indexWarmup', () => library.track(library.tracks.last.id));
  final search = measure(
    'search',
    () => const LibrarySearchService().search(
      library: library,
      files: library.files,
      candidates: const [],
      query: '작곡가 99 작품 999',
    ),
  );
  final details = LibraryDetailBuilder(
    library: library,
    scannedFiles: library.files,
    links: fixture.links,
  );
  measure('workDetail', () => details.buildWork(lastWork));
  measure('recordingDetail', () => details.buildRecording(lastRecording));
  measure(
    'discovery',
    () => const LibraryDiscoveryService().otherWorksByComposer(
      library,
      workId: lastWork,
    ),
  );
  final planner = ClassicalPlaybackPlanner(
    library: library,
    recordingSelector: (values) => values.first,
    workSelector: (values) => values.first,
    trackSelector: (values) => values.first,
  );
  final plan = measure(
    'queuePlan',
    () => planner.createPlanForRecording(
      lastRecording,
      PlaybackMode.recordingRandom,
    ),
  );
  // ignore: avoid_print
  print(
    const JsonEncoder.withIndent('  ').convert({
      'fixture': {
        'composers': library.people.length,
        'works': library.works.length,
        'recordings': library.recordings.length,
        'tracks': library.tracks.length,
      },
      'environment': 'dartHostProcess',
      'catalogLoadQueryCountFromCodeInspection': 9,
      'fixtureCreationMicros': fixtureMicros,
      'rssBeforeBytes': rssBefore,
      'rssAfterBytes': ProcessInfo.currentRss,
      'processMaxRssBytes': ProcessInfo.maxRss,
      'physicalDevicePerformanceVerified': false,
      'timingsMicros': timings,
      'searchResults': search.length,
      'queueItems': plan.items.length,
    }),
  );
}
