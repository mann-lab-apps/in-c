import 'package:path/path.dart' as path;

import 'classical_library_models.dart';
import 'composer_library.dart';
import 'local_playback.dart';
import 'metadata_candidates.dart';
import 'metadata_overrides.dart';

enum LocalFileCategory { songs, albums, artists, folders, composers }

enum LocalFileSort { title, artist, album, dateAdded, trackOrder }

class LocalFileRecentItem {
  const LocalFileRecentItem({
    required this.key,
    required this.title,
    required this.subtitle,
    required this.entries,
    required this.isAlbum,
  });

  final String key;
  final String title;
  final String subtitle;
  final List<LocalFileLibraryEntry> entries;
  final bool isAlbum;

  LocalFileLibraryEntry get representative => entries.first;
}

class LocalFileLibraryEntry {
  const LocalFileLibraryEntry({
    required this.file,
    required this.title,
    required this.album,
    required this.artist,
    required this.folder,
    this.composer,
    this.albumArtist,
    this.workTitle,
    this.movementTitle,
    this.composerKey = 'unknown',
    this.composerAliases = const [],
    this.composerSourceText,
    this.period = const ResolvedPeriod([], '시대 미분류', '확인 정보 없음'),
  });

  final LocalAudioFile file;
  final String title;
  final String album;
  final String artist;
  final String folder;
  final String? composer;
  final String? albumArtist, workTitle;
  final String? movementTitle;
  final String composerKey;
  final List<String> composerAliases;
  final String? composerSourceText;
  final ResolvedPeriod period;

  String get subtitle => '$artist · $album';

  bool get isAvailable =>
      file.availability == AudioFileAvailability.present &&
      file.importStatus != AudioImportStatus.missing;
}

class LocalFileLibrary {
  const LocalFileLibrary();

  static const trackPrefix = 'local-file:';

  String groupKey(LocalFileLibraryEntry entry, LocalFileCategory category) =>
      switch (category) {
        LocalFileCategory.albums =>
          '${entry.album}\u0000${entry.albumArtist ?? ''}',
        LocalFileCategory.artists => entry.artist,
        LocalFileCategory.composers => entry.composerKey,
        LocalFileCategory.folders => entry.folder,
        LocalFileCategory.songs => entry.file.id,
      };

  List<String> sortedGroupKeys(
    Map<String, List<LocalFileLibraryEntry>> groups,
    LocalFileSort order, {
    Map<String, int> importedAtByFileId = const {},
    String Function(String)? titleForKey,
  }) {
    int latest(List<LocalFileLibraryEntry> entries) =>
        entries.fold(0, (value, entry) {
          final added =
              importedAtByFileId[entry.file.id] ??
              entry.file.lastSeenAtMillis ??
              entry.file.modifiedAtMillis ??
              0;
          return added > value ? added : value;
        });
    final keys = groups.keys.toList();
    final latestByKey = order == LocalFileSort.dateAdded
        ? {for (final key in keys) key: latest(groups[key]!)}
        : const <String, int>{};
    keys.sort((a, b) {
      if (order == LocalFileSort.dateAdded) {
        final byDate = latestByKey[b]!.compareTo(latestByKey[a]!);
        if (byDate != 0) return byDate;
      }
      final title = (titleForKey?.call(a) ?? a).toLowerCase().compareTo(
        (titleForKey?.call(b) ?? b).toLowerCase(),
      );
      return title == 0 ? a.compareTo(b) : title;
    });
    return keys;
  }

  List<LocalFileRecentItem> recentlyAdded(
    List<LocalFileLibraryEntry> entries, {
    Map<String, int> importedAtByFileId = const {},
  }) {
    final recent = sort(
      entries,
      LocalFileSort.dateAdded,
      importedAtByFileId: importedAtByFileId,
    );
    final grouped = <String, List<LocalFileLibraryEntry>>{};
    for (final entry in recent) {
      final isAlbum = entry.album != '앨범 정보 없음';
      final key = isAlbum
          ? 'album:${groupKey(entry, LocalFileCategory.albums)}'
          : 'file:${entry.file.id}';
      grouped.putIfAbsent(key, () => []).add(entry);
    }
    return List.unmodifiable([
      for (final group in grouped.entries)
        LocalFileRecentItem(
          key: group.key,
          title: group.key.startsWith('album:')
              ? group.value.first.album
              : group.value.first.title,
          subtitle: group.key.startsWith('album:')
              ? group.value.first.albumArtist ?? '앨범 아티스트 정보 없음'
              : group.value.first.artist,
          entries: List.unmodifiable(group.value),
          isAlbum: group.key.startsWith('album:'),
        ),
    ]);
  }

  bool isFileTrackId(String id) => id.startsWith(trackPrefix);

  String fileIdForTrack(String id) => id.substring(trackPrefix.length);

  List<LocalFileLibraryEntry> entries({
    required List<LocalAudioFile> files,
    List<MetadataCandidate> candidates = const [],
    List<MetadataOverride> overrides = const [],
    ClassicalLibrary? library,
    Map<String, String> workAliases = const {},
  }) {
    final composers = ComposerNames(library);
    final periods = LibraryPeriods(library, workAliases: workAliases);
    final candidatesById = {for (final item in candidates) item.fileId: item};
    final overridesById = {for (final item in overrides) item.fileId: item};
    final entries = [
      for (final file in files)
        _entry(
          file,
          candidatesById[file.id],
          overridesById[file.id],
          composers,
          periods,
        ),
    ];
    entries.sort((a, b) {
      final byTitle = a.title.toLowerCase().compareTo(b.title.toLowerCase());
      return byTitle != 0 ? byTitle : a.file.id.compareTo(b.file.id);
    });
    return List.unmodifiable(entries);
  }

  LocalFileLibraryEntry _entry(
    LocalAudioFile file,
    MetadataCandidate? candidate,
    MetadataOverride? override,
    ComposerNames composers,
    LibraryPeriods periods,
  ) {
    final metadata = ListeningFileMetadata.resolve(
      tag: file.tagMetadata,
      candidate: candidate,
      override: override,
    );
    final filename = file.fileName?.trim().isNotEmpty == true
        ? file.fileName!
        : path.basename(file.path);
    final composer =
        composers.people[composers.forFile(file.id, metadata.composer)];
    return LocalFileLibraryEntry(
      file: file,
      title: metadata.title ?? path.basenameWithoutExtension(filename),
      album: metadata.album ?? '앨범 정보 없음',
      artist: metadata.artist ?? '아티스트 정보 없음',
      composer: composer?.name.ko ?? metadata.composer,
      composerKey: composers.fileKey(file.id, metadata.composer),
      period: periods.resolve(file.id, composer),
      composerSourceText: metadata.composer,
      composerAliases: List.unmodifiable(
        composer?.name.searchNames ?? const <String>[],
      ),
      albumArtist: metadata.albumArtist,
      workTitle: metadata.workTitle,
      movementTitle: metadata.movementTitle,
      folder: switch (path.basename(path.dirname(file.path))) {
        'managed_audio' => '가져온 파일',
        'imslp_imports' => 'IMSLP 파일',
        final name => name,
      },
    );
  }

  List<LocalFileLibraryEntry> search(
    List<LocalFileLibraryEntry> entries,
    String query,
  ) {
    final terms = query.trim().toLowerCase().split(RegExp(r'\s+'));
    if (terms.length == 1 && terms.first.isEmpty) return entries;
    return entries
        .where((item) {
          final haystack =
              '${item.title} ${item.album} ${item.artist} ${item.albumArtist ?? ''} ${item.composer ?? ''} ${item.composerAliases.join(' ')} ${item.workTitle ?? ''} ${item.movementTitle ?? ''} '
                      '${item.file.fileName ?? ''} ${item.folder}'
                  .toLowerCase();
          return terms.every(haystack.contains);
        })
        .toList(growable: false);
  }

  List<LocalFileLibraryEntry> sort(
    List<LocalFileLibraryEntry> entries,
    LocalFileSort order, {
    Map<String, int> importedAtByFileId = const {},
  }) {
    int addedAt(LocalFileLibraryEntry entry) =>
        importedAtByFileId[entry.file.id] ??
        entry.file.lastSeenAtMillis ??
        entry.file.modifiedAtMillis ??
        0;
    int textCompare(String a, String b) =>
        a.toLowerCase().compareTo(b.toLowerCase());
    final result = [...entries];
    result.sort((a, b) {
      final primary = switch (order) {
        LocalFileSort.title => textCompare(a.title, b.title),
        LocalFileSort.artist => textCompare(a.artist, b.artist),
        LocalFileSort.album => textCompare(a.album, b.album),
        LocalFileSort.dateAdded => addedAt(b).compareTo(addedAt(a)),
        LocalFileSort.trackOrder => () {
          final aTag = a.file.tagMetadata;
          final bTag = b.file.tagMetadata;
          final disc = (aTag?.discNumber ?? 1).compareTo(bTag?.discNumber ?? 1);
          if (disc != 0) return disc;
          return (aTag?.trackNumber ?? 99999).compareTo(
            bTag?.trackNumber ?? 99999,
          );
        }(),
      };
      if (primary != 0) return primary;
      final byTitle = textCompare(a.title, b.title);
      return byTitle != 0 ? byTitle : a.file.id.compareTo(b.file.id);
    });
    return List.unmodifiable(result);
  }

  List<LocalPlaybackQueueItem> queue(
    List<LocalFileLibraryEntry> entries, {
    String? startingFileId,
  }) {
    final available = entries.where((entry) => entry.isAvailable).toList();
    final first = startingFileId == null
        ? 0
        : available.indexWhere((entry) => entry.file.id == startingFileId);
    if (startingFileId != null && first < 0) return const [];
    return List.unmodifiable([
      for (final entry in available)
        LocalPlaybackQueueItem(
          trackId: '$trackPrefix${entry.file.id}',
          recordingId: '$trackPrefix${entry.file.id}',
          workId: '$trackPrefix${entry.file.id}',
          displayTitle: entry.title,
          path: entry.file.path,
          usesLinkedFile: true,
          workTitle: entry.workTitle ?? '',
          recordingTitle: '',
          artist: entry.artist == '아티스트 정보 없음' ? null : entry.artist,
          album: entry.album == '앨범 정보 없음' ? null : entry.album,
          fileModifiedAtMillis: entry.file.modifiedAtMillis,
        ),
    ]);
  }

  List<LocalPlaybackQueueItem> queueForSnapshot(
    List<LocalFileLibraryEntry> entries,
    List<String> trackIds,
  ) {
    final byId = {for (final entry in entries) entry.file.id: entry};
    final restored = <LocalPlaybackQueueItem>[];
    for (final id in trackIds) {
      if (!isFileTrackId(id)) continue;
      final entry = byId[fileIdForTrack(id)];
      if (entry != null) restored.addAll(queue([entry]));
    }
    return List.unmodifiable(restored);
  }
}
