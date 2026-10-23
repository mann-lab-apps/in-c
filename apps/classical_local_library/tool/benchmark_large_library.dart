import 'dart:convert';
import 'dart:io';

import 'package:classical_local_library/library_details.dart';
import 'package:classical_local_library/library_discovery.dart';
import 'package:classical_local_library/library_search.dart';
import 'package:classical_local_library/playback_planner.dart';

import 'large_library_fixture.dart';

void main() {
  final rssBefore = ProcessInfo.currentRss;
  final started = Stopwatch()..start();
  final fixture = buildLargeLibraryFixture();
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

  measure('indexWarmup', () => library.track('track-4999'));
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
  measure('workDetail', () => details.buildWork('work-999'));
  measure('recordingDetail', () => details.buildRecording('recording-999'));
  measure(
    'discovery',
    () => const LibraryDiscoveryService().otherWorksByComposer(
      library,
      workId: 'work-999',
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
      'recording-999',
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
