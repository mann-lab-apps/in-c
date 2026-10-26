import 'package:classical_local_library/audio_tags.dart';
import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/local_file_library.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const service = LocalFileLibrary();
  final files = [
    const LocalAudioFile(
      id: 'first',
      path: '/music/Album/01.flac',
      fileName: '01.flac',
      format: 'flac',
      modifiedAtMillis: 10,
      tagMetadata: AudioTagMetadata(
        title: '첫 곡',
        album: '앨범 A',
        artist: '연주자 B',
        trackNumber: 1,
      ),
    ),
    const LocalAudioFile(
      id: 'second',
      path: '/music/Album/02.flac',
      fileName: '02.flac',
      format: 'flac',
      tagMetadata: AudioTagMetadata(
        title: '둘째 곡',
        album: '앨범 A',
        artist: '연주자 B',
        trackNumber: 2,
      ),
    ),
    const LocalAudioFile(
      id: 'untagged',
      path: '/music/Other/untagged.mp3',
      fileName: 'untagged.mp3',
      format: 'mp3',
    ),
    const LocalAudioFile(
      id: 'missing',
      path: '/music/Other/missing.m4a',
      fileName: 'missing.m4a',
      format: 'm4a',
      availability: AudioFileAvailability.missing,
      importStatus: AudioImportStatus.missing,
    ),
  ];

  test('tag values, folder and filename fallback stay visible', () {
    final entries = service.entries(files: files);
    final first = entries.firstWhere((entry) => entry.file.id == 'first');
    final untagged = entries.firstWhere((entry) => entry.file.id == 'untagged');
    expect(
      (first.title, first.album, first.artist, first.folder),
      ('첫 곡', '앨범 A', '연주자 B', 'Album'),
    );
    expect(
      (untagged.title, untagged.album, untagged.artist, untagged.folder),
      ('untagged', '앨범 정보 없음', '아티스트 정보 없음', 'Other'),
    );
    expect(service.search(entries, '연주자 앨범'), hasLength(2));
    expect(service.search(entries, 'untagged.mp3').single.file.id, 'untagged');
  });

  test('managed folders are shown without internal directory names', () {
    final entries = service.entries(
      files: [
        const LocalAudioFile(
          id: 'imported',
          path: '/support/managed_audio/song.wav',
          fileName: 'song.wav',
          format: 'wav',
        ),
      ],
    );
    expect(entries.single.folder, '가져온 파일');
    expect(service.search(entries, '가져온').single.file.id, 'imported');
  });

  test('sort uses import time first and stable file ID for equal values', () {
    final entries = service.entries(
      files: [
        ...files,
        const LocalAudioFile(
          id: 'same-title',
          path: '/music/Other/untagged-copy.mp3',
          fileName: 'untagged.mp3',
          format: 'mp3',
        ),
      ],
    );
    final recent = service.sort(
      entries,
      LocalFileSort.dateAdded,
      importedAtByFileId: const {'second': 20, 'first': 30},
    );
    expect(recent.take(2).map((entry) => entry.file.id), ['first', 'second']);
    final titles = service.sort(entries, LocalFileSort.title);
    expect(
      titles.where((entry) => entry.title == 'untagged').map((e) => e.file.id),
      ['same-title', 'untagged'],
    );
    expect(service.search(titles, 'untagged.mp3'), hasLength(2));
    expect(
      service.sort(entries, LocalFileSort.album),
      hasLength(entries.length),
    );
    expect(
      service.sort(entries, LocalFileSort.artist),
      hasLength(entries.length),
    );
    expect(
      service
          .sort(entries, LocalFileSort.trackOrder)
          .take(2)
          .map((entry) => entry.file.id),
      ['first', 'second'],
    );
  });

  test('recent albums are grouped by album and artist; untagged songs stay separate', () {
    final entries = service.entries(files: files);
    final recent = service.recentlyAdded(
      entries,
      importedAtByFileId: const {'first': 30, 'second': 20},
    );
    expect(recent.first.title, '앨범 A');
    expect(recent.first.entries.map((entry) => entry.file.id), [
      'first',
      'second',
    ]);
    expect(recent.first.isAlbum, isTrue);
    expect(recent.where((item) => !item.isAlbum), hasLength(2));
    final otherArtist = service.entries(
      files: [
        const LocalAudioFile(
          id: 'different-artist',
          path: '/music/other.flac',
          format: 'flac',
          tagMetadata: AudioTagMetadata(album: '앨범 A', artist: '다른 연주자'),
        ),
      ],
    );
    expect(
      service
          .recentlyAdded([...entries, ...otherArtist])
          .where((item) => item.title == '앨범 A'),
      hasLength(2),
    );
  });

  test(
    'direct file queue has stable IDs, excludes missing and restores order',
    () {
      final entries = service.entries(files: files);
      final ordered = [
        entries.firstWhere((entry) => entry.file.id == 'first'),
        entries.firstWhere((entry) => entry.file.id == 'second'),
        entries.firstWhere((entry) => entry.file.id == 'untagged'),
        entries.firstWhere((entry) => entry.file.id == 'missing'),
      ];
      final queue = service.queue(ordered, startingFileId: 'first');
      expect(queue.map((item) => item.trackId), [
        'local-file:first',
        'local-file:second',
        'local-file:untagged',
      ]);
      expect(queue.first.isDirectFile, isTrue);
      expect(queue.first.fileSourceLabel, '로컬 파일');
      expect(queue.first.fileModifiedAtMillis, 10);
      expect(service.queue(entries, startingFileId: 'missing'), isEmpty);

      final restored = service.queueForSnapshot(entries, [
        'local-file:second',
        'local-file:missing',
        'local-file:first',
      ]);
      final recovery = const PlaybackQueueRecovery().recover(
        snapshot: const PlaybackQueueSnapshot(
          trackIds: [
            'local-file:second',
            'local-file:missing',
            'local-file:first',
          ],
          currentTrackId: 'local-file:first',
          savedAtMillis: 1,
        ),
        currentQueue: restored,
      );
      expect(recovery.queue.map((item) => item.trackId), [
        'local-file:first',
        'local-file:second',
      ]);
      expect(recovery.skippedTrackIds, ['local-file:missing']);
    },
  );
}
