import 'dart:async';

import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/library_search_backend.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/metadata_overrides.dart';
import 'package:flutter_test/flutter_test.dart';

import '../tool/large_library_fixture.dart';
import '../tool/search_fixture.dart';

void main() {
  test('real worker prepares once, preserves all file IDs and permits UI event-loop progress', () async {
    final fixture = buildLargeLibraryFixture(composerCount: 400);
    final snapshot = LibrarySearchSnapshot(
      revision: 1,
      library: fixture.library,
      files: fixture.library.files,
      candidates: [],
    );
    final backend = IsolateLibrarySearchBackend();
    addTearDown(backend.dispose);
    var beats = 0;
    final timer = Timer.periodic(
      const Duration(milliseconds: 2),
      (_) => beats++,
    );
    addTearDown(timer.cancel);
    final first = await backend.search(snapshot, '작곡가 99 작품 999');
    expect(first.results, isNotEmpty);
    expect(first.prepareMicros, greaterThan(0));
    expect(beats, greaterThan(0));
    final second = await backend.search(snapshot, 'file');
    expect(second.prepareMicros, 0);
    expect(second.results.length, 12);
    expect(second.fileIds.length, 20000);
    expect(second.fileIds.toSet().length, 20000);
  });
  test('worker and inline results agree; approved metadata and new revisions invalidate preparation', () async {
    final worker = IsolateLibrarySearchBackend(),
        inline = InlineLibrarySearchBackend();
    addTearDown(worker.dispose);
    addTearDown(inline.dispose);
    var snapshot = LibrarySearchSnapshot(
      revision: 1,
      library: emptyClassicalLibrary,
      files: searchFixtureFiles(),
      candidates: searchFixtureCandidates,
      overrides: searchFixtureOverrides,
    );
    for (final query in searchQueries) {
      final a = await worker.search(snapshot, query),
          b = await inline.search(snapshot, query);
      expect(
        a.results.map((r) => (r.type, r.id, r.rank)),
        b.results.map((r) => (r.type, r.id, r.rank)),
        reason: query,
      );
      expect(a.fileIds, b.fileIds, reason: query);
    }
    snapshot = LibrarySearchSnapshot(
      revision: 2,
      library: emptyClassicalLibrary,
      files: searchFixtureFiles(),
      candidates: [
        searchFixtureCandidates.single.copyWith(
          reviewStatus: MetadataReviewStatus.approved,
        ),
      ],
    );
    final changed = await worker.search(snapshot, 'unapproved-directory');
    expect(changed.prepareMicros, greaterThan(0));
    expect(changed.fileIds, ['tagless']);
    final corrected = await worker.search(
      LibrarySearchSnapshot(
        revision: 3,
        library: emptyClassicalLibrary,
        files: searchFixtureFiles(),
        candidates: [],
        overrides: [
          MetadataOverride(
            fileId: 'tagless',
            values: {MetadataField.movementTitle: '교정된 새 제목'},
            sources: {MetadataField.movementTitle: MetadataValueSource.user},
            updatedAtMillis: 1,
          ),
        ],
      ),
      '교정된 새 제목',
    );
    expect(corrected.prepareMicros, greaterThan(0));
    expect(corrected.fileIds, ['tagless']);
  });
  test(
    'worker preparation failure is path-free and retry starts a fresh worker',
    () async {
      final worker = IsolateLibrarySearchBackend();
      addTearDown(worker.dispose);
      const invalid = ClassicalLibrary(
        people: [],
        instruments: [],
        ensembles: [],
        works: [
          Work(
            id: 'bad',
            composerId: 'missing',
            title: LocalizedName(ko: '깨진 참조', sortName: 'bad'),
          ),
        ],
        workParts: [],
        albums: [],
        recordings: [],
        tracks: [],
        files: [],
      );
      await expectLater(
        worker.search(
          const LibrarySearchSnapshot(
            revision: 1,
            library: invalid,
            files: [],
            candidates: [],
          ),
          'test',
        ),
        throwsA(isA<LibrarySearchUnavailable>()),
      );
      final recovered = await worker.search(
        LibrarySearchSnapshot(
          revision: 2,
          library: emptyClassicalLibrary,
          files: searchFixtureFiles(),
          candidates: [],
        ),
        'tagless',
      );
      expect(recovered.fileIds, ['tagless']);
      expect(recovered.prepareMicros, greaterThan(0));
    },
  );
  test('dispose during worker startup rejects the request without leaking a worker', () async {
    final worker = IsolateLibrarySearchBackend();
    final pending = worker.search(
      const LibrarySearchSnapshot(
        revision: 1,
        library: emptyClassicalLibrary,
        files: [],
        candidates: [],
      ),
      'test',
    );
    final expectation = expectLater(
      pending,
      throwsA(isA<LibrarySearchUnavailable>()),
    );
    await worker.dispose();
    await expectation;
  });
}
