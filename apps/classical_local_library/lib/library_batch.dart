import 'file_links.dart';
import 'local_file_library.dart';
import 'local_audio_scanner.dart';
import 'local_playback.dart';

enum LibraryBatchAction { play, next, last, playlist, favorite, unfavorite }

/// Visit-local IDs; filters never silently discard a user's selection.
class LibrarySongSelection {
  bool active = false;
  final Set<String> _ids = {};
  Set<String> get ids => Set.unmodifiable(_ids);
  void toggle(String id) => _ids.contains(id) ? _ids.remove(id) : _ids.add(id);
  void selectAll(Iterable<String> ids) => _ids.addAll(ids);
  void clear() => _ids.clear();
  void finish() {
    active = false;
    clear();
  }

  List<String> snapshot(
    List<LocalFileLibraryEntry> ordered,
  ) => List.unmodifiable([
    for (final e in ordered)
      if (_ids.contains(e.file.id)) e.file.id,
    // Removed records remain explicit exclusions instead of silently vanishing.
    ...(_ids.difference(ordered.map((e) => e.file.id).toSet()).toList()
      ..sort()),
  ]);
}

class QueuePlaylistSnapshot {
  QueuePlaylistSnapshot._(List<String> ids, this.excluded, this.duplicates)
    : fileIds = List.unmodifiable(ids);
  final List<String> fileIds;
  final int excluded, duplicates;
  String get summary =>
      '${fileIds.length}곡 저장 가능'
      '${duplicates == 0 ? '' : ' · 중복 $duplicates곡 제외'}'
      '${excluded == 0 ? '' : ' · 파일/연결/형식 확인 $excluded곡 제외'}';

  factory QueuePlaylistSnapshot.capture({
    required LocalPlaybackState state,
    required List<LocalFileLibraryEntry> entries,
    required List<AudioFileTrackLink> links,
    bool remaining = false,
  }) {
    final byId = {for (final e in entries) e.file.id: e};
    final linked = {for (final link in links) link.trackId: link.fileId};
    final ids = <String>[];
    final seen = <String>{};
    var excluded = 0, duplicates = 0;
    for (final item in state.queue.skip(
      remaining ? state.currentIndex.clamp(0, state.queue.length) : 0,
    )) {
      final id = const LocalFileLibrary().isFileTrackId(item.trackId)
          ? const LocalFileLibrary().fileIdForTrack(item.trackId)
          : linked[item.trackId];
      final entry = byId[id];
      if (entry == null ||
          !entry.isAvailable ||
          audioExtensionForPath(entry.file.path) == null) {
        excluded++;
        continue;
      }
      if (!seen.add(entry.file.id)) {
        duplicates++;
        continue;
      }
      ids.add(entry.file.id);
    }
    return QueuePlaylistSnapshot._(ids, excluded, duplicates);
  }
}
