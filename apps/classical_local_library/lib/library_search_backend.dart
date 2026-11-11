import 'dart:async';
import 'dart:isolate';

import 'classical_library_models.dart';
import 'library_search.dart';
import 'metadata_candidates.dart';
import 'metadata_overrides.dart';

class LibrarySearchSnapshot {
  const LibrarySearchSnapshot({
    required this.revision,
    required this.library,
    required this.files,
    required this.candidates,
    this.overrides = const [],
    this.workAliases = const {},
    this.recordingAliases = const {},
  });
  final int revision;
  final ClassicalLibrary library;
  final List<LocalAudioFile> files;
  final List<MetadataCandidate> candidates;
  final List<MetadataOverride> overrides;
  final Map<String, String> workAliases, recordingAliases;
  int get documentCount =>
      library.people.length +
      library.works.length +
      library.workParts.length +
      library.recordings.length +
      files.length;
  PreparedLibrarySearch prepare() => const LibrarySearchService().prepare(
    library: library,
    files: files,
    candidates: candidates,
    overrides: overrides,
    workAliases: workAliases,
    recordingAliases: recordingAliases,
  );
}

class LibrarySearchBatch {
  LibrarySearchBatch(
    List<LibrarySearchResult> results,
    List<String> fileIds, {
    this.prepareMicros = 0,
    this.queryMicros = 0,
  }) : results = List.unmodifiable(results),
       fileIds = List.unmodifiable(fileIds);
  final List<LibrarySearchResult> results;
  final List<String> fileIds;
  final int prepareMicros, queryMicros;
}

class LibrarySearchUnavailable implements Exception {
  const LibrarySearchUnavailable();
}

abstract interface class LibrarySearchBackend {
  Future<LibrarySearchBatch> search(
    LibrarySearchSnapshot snapshot,
    String query,
  );
  Future<void> dispose();
}

LibrarySearchBatch _query(
  PreparedLibrarySearch index,
  String query,
  int prepareMicros,
) {
  final watch = Stopwatch()..start();
  final results = index.search(query);
  final fileIds = index.fileIds(query, results);
  return LibrarySearchBatch(
    results,
    fileIds,
    prepareMicros: prepareMicros,
    queryMicros: watch.elapsedMicroseconds,
  );
}

class InlineLibrarySearchBackend implements LibrarySearchBackend {
  PreparedLibrarySearch? _index;
  int? _revision;
  bool _closed = false;
  @override
  Future<LibrarySearchBatch> search(
    LibrarySearchSnapshot snapshot,
    String query,
  ) async {
    if (_closed) throw const LibrarySearchUnavailable();
    final watch = Stopwatch()..start();
    final changed = _revision != snapshot.revision;
    if (changed) {
      _index = snapshot.prepare();
      _revision = snapshot.revision;
    }
    return _query(_index!, query, changed ? watch.elapsedMicroseconds : 0);
  }

  @override
  Future<void> dispose() async {
    _closed = true;
    _index = null;
    _revision = null;
  }
}

class _SearchWork {
  const _SearchWork(this.id, this.revision, this.query, this.snapshot);
  final int id, revision;
  final String query;
  final LibrarySearchSnapshot? snapshot;
}

class _SearchReply {
  const _SearchReply(this.id, this.batch);
  final int id;
  final LibrarySearchBatch? batch;
}

void _searchWorker(SendPort output) {
  final input = ReceivePort();
  output.send(input.sendPort);
  PreparedLibrarySearch? index;
  int? revision;
  input.listen((work) {
    if (work is! _SearchWork) return;
    try {
      final watch = Stopwatch()..start();
      final changed = revision != work.revision;
      if (changed) {
        index = work.snapshot!.prepare();
        revision = work.revision;
      }
      output.send(
        _SearchReply(
          work.id,
          _query(index!, work.query, changed ? watch.elapsedMicroseconds : 0),
        ),
      );
    } catch (_) {
      output.send(_SearchReply(work.id, null));
    }
  });
}

/// One lazy worker and one prepared snapshot. No plugins, SQL, or file IO.
class IsolateLibrarySearchBackend implements LibrarySearchBackend {
  Isolate? _worker;
  ReceivePort? _receive;
  SendPort? _send;
  Future<SendPort>? _connecting;
  Completer<SendPort>? _ready;
  final _pending = <int, Completer<LibrarySearchBatch>>{};
  int _epoch = 0, _next = 0;
  int? _sentRevision;
  bool _closed = false;
  Future<SendPort> _connect() => _send != null
      ? Future.value(_send)
      : _connecting ??= () async {
          if (_closed) throw const LibrarySearchUnavailable();
          final epoch = ++_epoch;
          final port = ReceivePort();
          _receive = port;
          final ready = Completer<SendPort>();
          _ready = ready;
          ready.future.ignore();
          port.listen((message) {
            if (epoch != _epoch) return;
            if (message is SendPort) {
              _send = message;
              if (!ready.isCompleted) ready.complete(message);
            } else if (message is _SearchReply) {
              final request = _pending.remove(message.id);
              if (request != null) {
                if (message.batch == null) {
                  request.completeError(const LibrarySearchUnavailable());
                } else {
                  request.complete(message.batch);
                }
              }
            } else {
              _reset();
            }
          });
          try {
            final worker = await Isolate.spawn(
              _searchWorker,
              port.sendPort,
              onError: port.sendPort,
              onExit: port.sendPort,
            );
            if (epoch != _epoch || _closed) {
              worker.kill(priority: Isolate.immediate);
              throw const LibrarySearchUnavailable();
            }
            _worker = worker;
            return await ready.future.timeout(const Duration(seconds: 15));
          } catch (_) {
            _reset();
            throw const LibrarySearchUnavailable();
          }
        }();
  void _reset() {
    _epoch++;
    _worker?.kill(priority: Isolate.immediate);
    _worker = null;
    _receive?.close();
    _receive = null;
    _send = null;
    _connecting = null;
    _sentRevision = null;
    if (_ready != null && !_ready!.isCompleted) {
      _ready!.completeError(const LibrarySearchUnavailable());
    }
    _ready = null;
    for (final pending in _pending.values) {
      pending.completeError(const LibrarySearchUnavailable());
    }
    _pending.clear();
  }

  @override
  Future<LibrarySearchBatch> search(
    LibrarySearchSnapshot snapshot,
    String query,
  ) async {
    final send = await _connect();
    if (_closed) throw const LibrarySearchUnavailable();
    final id = ++_next;
    final pending = Completer<LibrarySearchBatch>();
    _pending[id] = pending;
    send.send(
      _SearchWork(
        id,
        snapshot.revision,
        query,
        _sentRevision == snapshot.revision ? null : snapshot,
      ),
    );
    _sentRevision = snapshot.revision;
    try {
      return await pending.future.timeout(const Duration(seconds: 15));
    } catch (_) {
      _reset();
      throw const LibrarySearchUnavailable();
    }
  }

  @override
  Future<void> dispose() async {
    _closed = true;
    _reset();
  }
}

/// Tiny inputs avoid worker startup; larger or long-field inputs use the worker.
class AdaptiveLibrarySearchBackend implements LibrarySearchBackend {
  final _inline = InlineLibrarySearchBackend();
  final _worker = IsolateLibrarySearchBackend();
  bool _small(LibrarySearchSnapshot snapshot) {
    if (snapshot.documentCount > 128 ||
        snapshot.candidates.length > 256 ||
        snapshot.overrides.length > 256) {
      return false;
    }
    var size = 0;
    void add(Iterable<String> values) {
      for (final value in values) {
        size += value.length;
      }
    }

    for (final p in snapshot.library.people) {
      if (p.name.aliases.length > 128) return false;
      add([...p.name.searchNames, p.name.sortName]);
    }
    for (final w in snapshot.library.works) {
      if (w.title.aliases.length > 128) return false;
      add([...w.title.searchNames, w.title.sortName, ?w.catalogNumber]);
    }
    for (final p in snapshot.library.workParts) {
      if (p.title.aliases.length > 128) return false;
      add([...p.title.searchNames, p.title.sortName]);
    }
    for (final r in snapshot.library.recordings) {
      if (r.title.aliases.length > 128) return false;
      add([...r.title.searchNames, r.title.sortName]);
    }
    for (final f in snapshot.files) {
      add([
        f.path,
        ?f.fileName,
        ?f.tagMetadata?.title,
        ?f.tagMetadata?.movementTitle,
        ?f.tagMetadata?.work,
        ?f.tagMetadata?.album,
        ?f.tagMetadata?.albumArtist,
        ?f.tagMetadata?.artist,
        ?f.tagMetadata?.composer,
      ]);
    }
    for (final c in snapshot.candidates) {
      add([
        c.fileName,
        ?c.composerText,
        ?c.workTitleText,
        ?c.movementText,
        ?c.artistText,
        ?c.albumText,
        ?c.albumArtistText,
      ]);
    }
    for (final o in snapshot.overrides) {
      add(o.values.values.whereType<String>());
    }
    return size <= 16384;
  }

  @override
  Future<LibrarySearchBatch> search(
    LibrarySearchSnapshot snapshot,
    String query,
  ) => (_small(snapshot) ? _inline : _worker).search(snapshot, query);
  @override
  Future<void> dispose() async {
    await _inline.dispose();
    await _worker.dispose();
  }
}
