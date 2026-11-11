import 'dart:async';

import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/library_search.dart';
import 'package:classical_local_library/library_search_backend.dart';
import 'package:classical_local_library/library_search_coordinator.dart';
import 'package:flutter_test/flutter_test.dart';

LibrarySearchSnapshot snapshot(int revision) => LibrarySearchSnapshot(
  revision: revision,
  library: emptyClassicalLibrary,
  files: [],
  candidates: [],
);
LibrarySearchBatch batch(String value) => LibrarySearchBatch(
  [
    LibrarySearchResult(
      type: SearchResultType.work,
      id: value,
      title: value,
      subtitle: '',
    ),
  ],
  [value],
);

class PendingSearchBackend implements LibrarySearchBackend {
  final requests =
      <(LibrarySearchSnapshot, String, Completer<LibrarySearchBatch>)>[];
  bool closed = false;
  @override
  Future<LibrarySearchBatch> search(LibrarySearchSnapshot s, String q) {
    final c = Completer<LibrarySearchBatch>();
    requests.add((s, q, c));
    return c.future;
  }

  @override
  Future<void> dispose() async {
    closed = true;
  }
}

Future<void> tick() => Future<void>.delayed(Duration.zero);

void main() {
  for (final oldFails in [false, true]) {
    test(
      'older ${oldFails ? 'failure' : 'success'} cannot replace latest query; pending requests coalesce',
      () async {
        final backend = PendingSearchBackend();
        final c = LibrarySearchCoordinator(backend, delay: Duration.zero);
        addTearDown(c.dispose);
        c.replaceSnapshot(snapshot(1));
        c.activate('old');
        await tick();
        c.submit('intermediate');
        await tick();
        c.submit('new');
        await tick();
        expect(backend.requests.length, 1);
        if (oldFails) {
          backend.requests[0].$3.completeError(StateError('/private/path'));
        } else {
          backend.requests[0].$3.complete(batch('old'));
        }
        await tick();
        expect(c.state.query, 'new');
        expect(c.state.batch, isNull);
        expect(backend.requests.last.$2, 'new');
        backend.requests.last.$3.complete(batch('new'));
        await tick();
        expect(c.state.batch!.results.single.id, 'new');
      },
    );
  }
  test('old revision is ignored and latest revision rebuilds even for the same query', () async {
    final backend = PendingSearchBackend();
    final c = LibrarySearchCoordinator(backend, delay: Duration.zero);
    addTearDown(c.dispose);
    c.replaceSnapshot(snapshot(1));
    c.activate('same');
    await tick();
    c.replaceSnapshot(snapshot(2));
    await tick();
    backend.requests.first.$3.complete(batch('old'));
    await tick();
    expect(backend.requests.last.$1.revision, 2);
    expect(c.state.batch, isNull);
    backend.requests.last.$3.complete(batch('updated'));
    await tick();
    expect(c.state.revision, 2);
    expect(c.state.batch!.results.single.id, 'updated');
  });
  test(
    'new failure surfaces after old success and retry can recover',
    () async {
      final backend = PendingSearchBackend();
      final c = LibrarySearchCoordinator(backend, delay: Duration.zero);
      addTearDown(c.dispose);
      c.replaceSnapshot(snapshot(1));
      c.activate('old');
      await tick();
      backend.requests.last.$3.complete(batch('old'));
      await tick();
      c.submit('new');
      await tick();
      backend.requests.last.$3.completeError(StateError('fixture failure'));
      await tick();
      expect(c.state.phase, LibrarySearchPhase.failed);
      expect(c.state.batch, isNull);
      c.retry();
      await tick();
      backend.requests.last.$3.complete(batch('new'));
      await tick();
      expect(c.state.phase, LibrarySearchPhase.ready);
    },
  );
  test('clear and suspend reject late results; activation restores a valid cached query', () async {
    final backend = PendingSearchBackend();
    final c = LibrarySearchCoordinator(backend, delay: Duration.zero);
    addTearDown(c.dispose);
    c.replaceSnapshot(snapshot(1));
    c.activate('one');
    await tick();
    backend.requests.last.$3.complete(batch('one'));
    await tick();
    c.submit('two');
    await tick();
    c.submit('');
    backend.requests.last.$3.complete(batch('two'));
    await tick();
    expect(c.state.phase, LibrarySearchPhase.idle);
    expect(c.state.batch, isNull);
    c.activate('one');
    expect(c.state.batch!.fileIds, ['one']);
    c.submit('three');
    await tick();
    c.suspend();
    backend.requests.last.$3.completeError(StateError('late'));
    await tick();
    expect(c.state.phase, LibrarySearchPhase.suspended);
    expect(c.forQuery('one').batch!.fileIds, ['one']);
  });
  test('dispose rejects late completion and closes backend', () async {
    final backend = PendingSearchBackend();
    final c = LibrarySearchCoordinator(backend, delay: Duration.zero);
    c.replaceSnapshot(snapshot(1));
    c.activate('one');
    await tick();
    c.dispose();
    backend.requests.single.$3.completeError(StateError('late'));
    await tick();
    expect(backend.closed, isTrue);
  });
  test('result cache is bounded and invalidated by a new snapshot', () async {
    final backend = PendingSearchBackend();
    final c = LibrarySearchCoordinator(backend, delay: Duration.zero);
    addTearDown(c.dispose);
    c.replaceSnapshot(snapshot(1));
    c.activate('0');
    for (var i = 0; i < 9; i++) {
      c.submit('$i', immediate: true);
      await tick();
      backend.requests.last.$3.complete(batch('$i'));
      await tick();
    }
    c.submit('0', immediate: true);
    await tick();
    expect(backend.requests.length, 10);
    backend.requests.last.$3.complete(batch('0'));
    await tick();
    c.replaceSnapshot(snapshot(2));
    await tick();
    expect(c.state.batch, isNull);
    backend.requests.last.$3.complete(batch('revision2'));
    await tick();
    expect(c.state.batch!.fileIds, ['revision2']);
  });
}
