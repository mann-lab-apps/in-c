import 'dart:io';

import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/local_audio_scanner.dart';
import 'package:classical_local_library/playback_planner.dart';
import 'package:classical_local_library/sample_classical_library.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('파일 후보를 기존 트랙에 연결하면 linked 상태로 저장한다', () async {
    final file = _audioFile('/Music/Beethoven/Symphony 5/01 Allegro.flac');
    final scannedStore = MemoryScannedAudioStore([file]);
    final scannedRepository = ScannedAudioRepository(scannedStore);
    final linkStore = MemoryAudioFileTrackLinkStore();
    final linkRepository = AudioFileTrackLinkRepository(linkStore);
    final track = sampleClassicalLibrary.tracks.first;

    await linkRepository.linkFileToTrack(
      fileId: file.id,
      trackId: track.id,
      linkedAt: DateTime.utc(2026, 10, 13),
    );
    final files = await scannedRepository.markLinked(file.id);

    expect(files.single.importStatus, AudioImportStatus.linked);
    expect((await linkStore.load()).single.trackId, track.id);
  });

  test('연결된 파일은 재생 계획의 트랙에 대해 해석할 수 있다', () async {
    final linkedFile = _audioFile('/Music/Beethoven/Symphony 5/01 Allegro.flac')
        .copyWith(importStatus: AudioImportStatus.linked);
    final planner = ClassicalPlaybackPlanner(
      library: sampleClassicalLibrary,
      workSelector: (works) => works.first,
      recordingSelector: (recordings) => recordings.first,
    );
    final plan = planner.createPlan(PlaybackMode.workRandom);
    final track = plan.items.first.track;
    final links = [
      AudioFileTrackLink(
        fileId: linkedFile.id,
        trackId: track.id,
        linkedAtMillis: DateTime.utc(2026, 10, 13).millisecondsSinceEpoch,
      ),
    ];

    final resolved = const LinkedAudioFileResolver().fileForTrack(
      track: track,
      scannedFiles: [linkedFile],
      links: links,
    );

    expect(resolved?.path, linkedFile.path);
  });

  test('연결 저장소는 JSON으로 저장하고 다시 읽는다', () async {
    final tempDir = await Directory.systemTemp.createTemp('file_links_test_');
    addTearDown(() async {
      if (await tempDir.exists()) {
        await tempDir.delete(recursive: true);
      }
    });
    final repository = AudioFileTrackLinkRepository(
      JsonAudioFileTrackLinkStore(File('${tempDir.path}/links.json')),
    );

    final saved = await repository.linkFileToTrack(
      fileId: 'file-1',
      trackId: 'track-1',
      linkedAt: DateTime.utc(2026, 10, 13),
    );
    final loaded = await repository.load();

    expect(saved, hasLength(1));
    expect(loaded.single.fileId, 'file-1');
    expect(loaded.single.trackId, 'track-1');
  });

  test('파일 또는 트랙을 다시 연결하면 기존 일대일 연결을 교체한다', () async {
    final store = MemoryAudioFileTrackLinkStore([
      const AudioFileTrackLink(
        fileId: 'file-a',
        trackId: 'track-a',
        linkedAtMillis: 1,
      ),
      const AudioFileTrackLink(
        fileId: 'file-b',
        trackId: 'track-b',
        linkedAtMillis: 2,
      ),
    ]);
    final repository = AudioFileTrackLinkRepository(store);

    await repository.linkFileToTrack(
      fileId: 'file-a',
      trackId: 'track-b',
      linkedAt: DateTime.utc(2026, 10, 19),
    );

    final links = await repository.load();
    expect(links, hasLength(1));
    expect(links.single.fileId, 'file-a');
    expect(links.single.trackId, 'track-b');
  });

  test('연결 해제는 다른 파일의 연결을 보존한다', () async {
    final store = MemoryAudioFileTrackLinkStore([
      const AudioFileTrackLink(
        fileId: 'file-a',
        trackId: 'track-a',
        linkedAtMillis: 1,
      ),
      const AudioFileTrackLink(
        fileId: 'file-b',
        trackId: 'track-b',
        linkedAtMillis: 2,
      ),
    ]);

    final links = await AudioFileTrackLinkRepository(store)
        .unlinkFile('file-a');

    expect(links, hasLength(1));
    expect(links.single.fileId, 'file-b');
  });

  test('누락된 연결 파일은 재생 대상으로 해석하지 않는다', () {
    final track = sampleClassicalLibrary.tracks.first;
    final missing = _audioFile('/Music/missing.flac').copyWith(
      importStatus: AudioImportStatus.linked,
      availability: AudioFileAvailability.missing,
    );

    final resolved = const LinkedAudioFileResolver().fileForTrack(
      track: track,
      scannedFiles: [missing],
      links: [
        AudioFileTrackLink(
          fileId: missing.id,
          trackId: track.id,
          linkedAtMillis: 1,
        ),
      ],
    );

    expect(resolved, isNull);
  });
}

LocalAudioFile _audioFile(String path) {
  return LocalAudioFile(
    id: scannedAudioId(path),
    path: path,
    fileName: fileNameForPath(path),
    format: 'FLAC',
    sizeBytes: 1024,
    modifiedAtMillis: 1791870000000,
    importStatus: AudioImportStatus.needsReview,
    sourceReferences: const [SourceReference(kind: SourceKind.localTag)],
  );
}
