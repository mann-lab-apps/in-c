import 'dart:convert';
import 'dart:io';
import 'dart:async';

import 'package:classical_local_library/library_search.dart';
import 'package:classical_local_library/library_search_backend.dart';
import 'package:classical_local_library/sample_classical_library.dart';

import 'large_library_fixture.dart';
import 'search_fixture.dart';

Future<void> main(List<String> args) async {
  final record = args.length == 2 && args.first == '--record-contract'
      ? args.last
      : null;
  if (record != null) {
    final result = {
      for (final q in searchQueries)
        q: const LibrarySearchService()
            .search(
              library: sampleClassicalLibrary,
              files: searchFixtureFiles(),
              candidates: searchFixtureCandidates,
              overrides: searchFixtureOverrides,
              workAliases: searchFixtureAliases,
              query: q,
            )
            .map(
              (r) => {
                'id': r.id,
                'type': r.type.name,
                'title': r.title,
                'subtitle': r.subtitle,
                'rank': r.rank,
              },
            )
            .toList(),
    };
    final file = File(record);
    if (await file.exists()) {
      throw StateError('Do not overwrite a search contract');
    }
    await file.parent.create(recursive: true);
    await file.writeAsString(
      '${const JsonEncoder.withIndent('  ').convert(result)}\n',
    );
    return;
  }
  final stress = args.contains('--stress');
  final fixture = buildLargeLibraryFixture(composerCount: stress ? 400 : 100);
  final measurements = <String, List<int>>{};
  final preparedSamples = <String, List<int>>{};
  final trace = LibrarySearchProfile();
  final prepared = LibrarySearchService(profile: trace).prepare(
    library: fixture.library,
    files: fixture.library.files,
    candidates: [],
  );
  final prepareMicros = trace.corpusMicros;
  for (final q in [
    '작곡가 99 작품 999',
    'ㅈㄱㄱ 99',
    'Composer 99',
    'CAT 999',
    'file-4999',
    'zzzzzz-not-found',
  ]) {
    final samples = <int>[];
    for (var i = 0; i < 3; i++) {
      final clock = Stopwatch()..start();
      const LibrarySearchService().search(
        library: fixture.library,
        files: fixture.library.files,
        candidates: [],
        query: q,
      );
      samples.add(clock.elapsedMicroseconds);
    }
    measurements[q] = samples;
    final warm = <int>[];
    for (var i = 0; i < 3; i++) {
      final clock = Stopwatch()..start();
      prepared.search(q);
      warm.add(clock.elapsedMicroseconds);
    }
    preparedSamples[q] = warm;
  }
  prepared.search('작곡가 99 작품 999');
  final backend = IsolateLibrarySearchBackend();
  final snapshot = LibrarySearchSnapshot(
    revision: 1,
    library: fixture.library,
    files: fixture.library.files,
    candidates: [],
  );
  final watch = Stopwatch()..start();
  var beats = 0, maxGapMicros = 0, lastBeat = 0;
  final timer = Timer.periodic(const Duration(milliseconds: 5), (_) {
    final now = watch.elapsedMicroseconds;
    final gap = now - lastBeat;
    if (gap > maxGapMicros) maxGapMicros = gap;
    lastBeat = now;
    beats++;
  });
  final first = await backend.search(snapshot, '작곡가 99 작품 999');
  final firstTotal = watch.elapsedMicroseconds;
  watch.reset();
  lastBeat = 0;
  final second = await backend.search(snapshot, 'file');
  final warmTotal = watch.elapsedMicroseconds;
  watch.reset();
  lastBeat = 0;
  final changed = await backend.search(
    LibrarySearchSnapshot(
      revision: 2,
      library: fixture.library,
      files: List.of(fixture.library.files),
      candidates: [],
    ),
    '작곡가 99 작품 999',
  );
  final changedTotal = watch.elapsedMicroseconds;
  timer.cancel();
  await backend.dispose();
  stdout.writeln(
    const JsonEncoder.withIndent('  ').convert({
      'environment': 'Dart host/JIT',
      'tracks': fixture.library.files.length,
      'samplesMicros': measurements,
      'preparedSamplesMicros': preparedSamples,
      'prepareMicros': prepareMicros,
      'profiledPhases': trace.toJson(),
      'worker': {
        'coldTotalMicros': firstTotal,
        'prepareMicros': first.prepareMicros,
        'queryMicros': first.queryMicros,
        'warmTotalMicros': warmTotal,
        'warmPrepareMicros': second.prepareMicros,
        'warmQueryMicros': second.queryMicros,
        'newRevisionTotalMicros': changedTotal,
        'newRevisionPrepareMicros': changed.prepareMicros,
        'newRevisionQueryMicros': changed.queryMicros,
        'fileIds': second.fileIds.length,
        'heartbeatCount': beats,
        'maxHeartbeatGapMicros': maxGapMicros,
        'heartbeatPeriodMicros': 5000,
        'includesSpawnAndSnapshotTransfer': true,
      },
      'maxRssBytes': ProcessInfo.maxRss,
      'physicalDeviceVerified': false,
    }),
  );
}
