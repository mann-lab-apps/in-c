import 'dart:async';

import 'package:flutter/foundation.dart';

import 'library_search_backend.dart';

enum LibrarySearchPhase {
  idle,
  waiting,
  preparing,
  searching,
  ready,
  failed,
  suspended,
}

class LibrarySearchView {
  const LibrarySearchView(this.query, this.revision, this.phase, {this.batch});
  final String query;
  final int revision;
  final LibrarySearchPhase phase;
  final LibrarySearchBatch? batch;
  bool get busy =>
      phase == LibrarySearchPhase.waiting ||
      phase == LibrarySearchPhase.preparing ||
      phase == LibrarySearchPhase.searching;
}

class _Request {
  const _Request(this.generation, this.snapshot, this.query);
  final int generation;
  final LibrarySearchSnapshot snapshot;
  final String query;
}

/// One active job, one newest pending job, eight bounded results, lazy preparation.
class LibrarySearchCoordinator extends ChangeNotifier {
  LibrarySearchCoordinator(
    this.backend, {
    this.delay = const Duration(milliseconds: 180),
  });
  final LibrarySearchBackend backend;
  final Duration delay;
  LibrarySearchSnapshot? _snapshot;
  LibrarySearchView _state = const LibrarySearchView(
    '',
    0,
    LibrarySearchPhase.idle,
  );
  final _cache = <String, LibrarySearchBatch>{};
  Timer? _timer;
  _Request? _pending;
  int _generation = 0;
  int? _preparedRevision;
  bool _active = false, _running = false, _closed = false;
  LibrarySearchView get state => _state;
  void replaceSnapshot(LibrarySearchSnapshot snapshot) {
    if (_closed || snapshot.revision == _snapshot?.revision) return;
    _snapshot = snapshot;
    _cache.clear();
    _preparedRevision = null;
    if (_active) {
      submit(_state.query);
    } else {
      _generation++;
      _timer?.cancel();
      _pending = null;
    }
  }

  LibrarySearchView forQuery(String query) {
    final revision = _snapshot?.revision ?? 0;
    if (_state.query == query && _state.revision == revision) return _state;
    final cached = _cache[query];
    return LibrarySearchView(
      query,
      revision,
      cached != null
          ? LibrarySearchPhase.ready
          : query.trim().isEmpty
          ? LibrarySearchPhase.idle
          : LibrarySearchPhase.suspended,
      batch: cached,
    );
  }

  void activate(String query) {
    if (!_closed) {
      _active = true;
      submit(query);
    }
  }

  void suspend() {
    _active = false;
    _generation++;
    _timer?.cancel();
    _pending = null;
    if (_state.busy) {
      _state = LibrarySearchView(
        _state.query,
        _state.revision,
        LibrarySearchPhase.suspended,
      );
    }
  }

  void submit(String query, {bool immediate = false}) {
    if (_closed) return;
    _timer?.cancel();
    _pending = null;
    final generation = ++_generation;
    final snapshot = _snapshot;
    if (snapshot == null) return;
    if (query.trim().isEmpty) {
      _publish(
        LibrarySearchView(query, snapshot.revision, LibrarySearchPhase.idle),
      );
      return;
    }
    final cached = _cache.remove(query);
    if (cached != null) {
      _cache[query] = cached;
      _publish(
        LibrarySearchView(
          query,
          snapshot.revision,
          LibrarySearchPhase.ready,
          batch: cached,
        ),
      );
      return;
    }
    _publish(
      LibrarySearchView(query, snapshot.revision, LibrarySearchPhase.waiting),
    );
    final request = _Request(generation, snapshot, query);
    void start() {
      if (_valid(request)) {
        _pending = request;
        unawaited(_pump());
      }
    }

    if (immediate) {
      start();
    } else {
      _timer = Timer(delay, start);
    }
  }

  bool _valid(_Request request) =>
      !_closed &&
      _active &&
      request.generation == _generation &&
      request.snapshot.revision == _snapshot?.revision;
  Future<void> _pump() async {
    if (_running || _pending == null || _closed) return;
    final request = _pending!;
    _pending = null;
    if (!_valid(request)) return;
    _running = true;
    _publish(
      LibrarySearchView(
        request.query,
        request.snapshot.revision,
        _preparedRevision == request.snapshot.revision
            ? LibrarySearchPhase.searching
            : LibrarySearchPhase.preparing,
      ),
    );
    try {
      final batch = await backend.search(request.snapshot, request.query);
      if (_valid(request)) {
        _preparedRevision = request.snapshot.revision;
        if (_cache.length >= 8) _cache.remove(_cache.keys.first);
        _cache[request.query] = batch;
        _publish(
          LibrarySearchView(
            request.query,
            request.snapshot.revision,
            LibrarySearchPhase.ready,
            batch: batch,
          ),
        );
      }
    } catch (_) {
      if (_valid(request)) {
        _publish(
          LibrarySearchView(
            request.query,
            request.snapshot.revision,
            LibrarySearchPhase.failed,
          ),
        );
      }
    } finally {
      _running = false;
      if (!_closed && _pending != null) unawaited(_pump());
    }
  }

  void retry() {
    if (!_closed) submit(_state.query, immediate: true);
  }

  void _publish(LibrarySearchView value) {
    _state = value;
    if (!_closed) notifyListeners();
  }

  Future<void>? _disposing;
  Future<void> close() {
    if (_disposing != null) return _disposing!;
    _closed = true;
    _active = false;
    _generation++;
    _timer?.cancel();
    _pending = null;
    _cache.clear();
    _snapshot = null;
    return _disposing = backend.dispose();
  }

  @override
  void dispose() {
    unawaited(close());
    super.dispose();
  }
}
