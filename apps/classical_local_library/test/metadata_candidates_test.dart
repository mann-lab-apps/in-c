import 'dart:io';

import 'package:classical_local_library/audio_tags.dart';
import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/local_audio_scanner.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('경로와 파일명에서 작곡가, 작품, 트랙 번호, 악장 후보를 추론한다', () {
    final candidate = const MetadataCandidateInferencer().infer(
      _audioFile('/Music/Beethoven/Symphony 5/01 Allegro.flac'),
    );

    expect(candidate.composerText, 'Beethoven');
    expect(candidate.workTitleText, 'Symphony 5');
    expect(candidate.trackNumber, 1);
    expect(candidate.movementText, 'Allegro');
    expect(candidate.summary, 'Beethoven · Symphony 5 · 1번 · Allegro');
  });

  test('대시로 구분된 파일명은 파일명 우선 후보로 추론한다', () {
    final candidate = const MetadataCandidateInferencer().infer(
      _audioFile('/Inbox/Beethoven - Symphony No.5 - I. Allegro.flac'),
    );

    expect(candidate.composerText, 'Beethoven');
    expect(candidate.workTitleText, 'Symphony No.5');
    expect(candidate.trackNumber, 1);
    expect(candidate.movementText, 'Allegro');
    expect(candidate.rawPattern, 'composer-work-movement');
  });

  test('중첩 폴더의 작품명과 파일명의 트랙 번호를 함께 추론한다', () {
    final candidate = const MetadataCandidateInferencer().infer(
      _audioFile('/Music/Dvorak/New World/04 Allegro con fuoco.mp3'),
    );

    expect(candidate.composerText, 'Dvorak');
    expect(candidate.workTitleText, 'New World');
    expect(candidate.trackNumber, 4);
    expect(candidate.movementText, 'Allegro con fuoco');
  });

  test('후보 저장소는 JSON으로 저장하고 다시 읽는다', () async {
    final tempDir = await Directory.systemTemp.createTemp(
      'metadata_candidates_test_',
    );
    addTearDown(() async {
      if (await tempDir.exists()) {
        await tempDir.delete(recursive: true);
      }
    });

    final file = File('${tempDir.path}/metadata-candidates.json');
    final repository = MetadataCandidateRepository(
      JsonMetadataCandidateStore(file),
    );

    final saved = await repository.inferForFiles([
      _audioFile('/Music/Beethoven/Symphony 5/01 Allegro.flac'),
    ]);
    final loaded = await MetadataCandidateRepository(
      JsonMetadataCandidateStore(file),
    ).load();

    expect(saved, hasLength(1));
    expect(loaded.single.fileName, '01 Allegro.flac');
    expect(loaded.single.composerText, 'Beethoven');
    expect(loaded.single.workTitleText, 'Symphony 5');
  });

  test('실제 태그 필드를 우선 사용하고 클래식 보조 정보를 보존한다', () {
    final tagged = _audioFile('/Music/Beethoven/Symphony 5/01 Allegro.flac')
        .copyWith(
          tagReadStatus: AudioTagReadStatus.read,
          tagMetadata: const AudioTagMetadata(
            title: 'I. Allegro con brio',
            album: 'Symphony No. 5',
            artist: 'Carlos Kleiber',
            albumArtist: 'Vienna Philharmonic',
            genre: 'Classical',
            year: 1975,
            trackNumber: 1,
            trackTotal: 4,
            discNumber: 1,
            discTotal: 1,
          ),
        );

    final candidate = const MetadataCandidateInferencer().infer(tagged);

    expect(candidate.workTitleText, 'Symphony No. 5');
    expect(candidate.movementText, 'I. Allegro con brio');
    expect(candidate.artistText, 'Carlos Kleiber');
    expect(candidate.albumArtistText, 'Vienna Philharmonic');
    expect(candidate.trackNumber, 1);
    expect(candidate.trackTotal, 4);
    expect(candidate.year, 1975);
    expect(candidate.sourceLabel, '오디오 태그 + 파일명');
  });

  test('태그와 경로가 다르면 검토 충돌로 표시한다', () {
    final tagged = _audioFile('/Music/Beethoven/Symphony 5/01 Allegro.flac')
        .copyWith(
          tagMetadata: const AudioTagMetadata(
            album: 'Moonlight Sonata',
            title: 'Adagio sostenuto',
            trackNumber: 3,
          ),
        );

    final candidate = const MetadataCandidateInferencer().infer(tagged);

    expect(candidate.hasTagConflict, isTrue);
    expect(candidate.workTitleText, 'Moonlight Sonata');
    expect(candidate.trackNumber, 3);
  });

  test('사용자가 승인한 후보는 재추론하지 않고 이동한 경로만 갱신한다', () async {
    const approved = MetadataCandidate(
      fileId: 'stable-file',
      filePath: '/Music/old.flac',
      fileName: 'old.flac',
      composerText: '사용자 작곡가',
      workTitleText: '사용자 작품',
      movementText: '사용자 악장',
      trackNumber: 2,
      reviewStatus: MetadataReviewStatus.approved,
    );
    final store = MemoryMetadataCandidateStore([approved]);
    final repository = MetadataCandidateRepository(store);
    final moved = _audioFile('/Music/new/01 Allegro.flac')
        .copyWith(id: 'stable-file');

    final candidates = await repository.inferForFiles([moved]);

    expect(candidates.single.filePath, moved.path);
    expect(candidates.single.fileName, moved.fileName);
    expect(candidates.single.composerText, '사용자 작곡가');
    expect(candidates.single.workTitleText, '사용자 작품');
    expect(candidates.single.reviewStatus, MetadataReviewStatus.approved);
  });

  test('태그 재파싱은 이미 연결된 파일의 승인 후보를 덮어쓰지 않는다', () async {
    const approved = MetadataCandidate(
      fileId: 'linked-file',
      filePath: '/Music/linked.flac',
      fileName: 'linked.flac',
      composerText: '사용자 작곡가',
      workTitleText: '사용자 작품',
      reviewStatus: MetadataReviewStatus.approved,
    );
    final repository = MetadataCandidateRepository(
      MemoryMetadataCandidateStore([approved]),
    );
    final reparsed = _audioFile('/Music/linked.flac').copyWith(
      id: 'linked-file',
      importStatus: AudioImportStatus.linked,
      tagMetadata: const AudioTagMetadata(album: '충돌하는 새 태그', title: '새 제목'),
    );

    final candidates = await repository.inferForFiles([reparsed]);

    expect(candidates.single.composerText, '사용자 작곡가');
    expect(candidates.single.workTitleText, '사용자 작품');
    expect(candidates.single.reviewStatus, MetadataReviewStatus.approved);
  });

  test('수동 재연결은 보존 ID 아래 후보 상태와 정보를 유지한다', () async {
    const retained = MetadataCandidate(
      fileId: 'old',
      filePath: '/Music/missing.flac',
      fileName: 'missing.flac',
      composerText: 'Beethoven',
      workTitleText: 'Symphony No. 5',
      reviewStatus: MetadataReviewStatus.approved,
    );
    final repository = MetadataCandidateRepository(
      MemoryMetadataCandidateStore([retained]),
    );

    final candidates = await repository.reconnectFile(
      retainedFileId: 'old',
      replacementFileId: 'replacement',
      path: '/Music/found.flac',
      fileName: 'found.flac',
    );

    expect(candidates.single.fileId, 'old');
    expect(candidates.single.filePath, '/Music/found.flac');
    expect(candidates.single.workTitleText, 'Symphony No. 5');
    expect(candidates.single.reviewStatus, MetadataReviewStatus.approved);
  });
}

LocalAudioFile _audioFile(String path) {
  return LocalAudioFile(
    id: scannedAudioId(path),
    path: path,
    fileName: fileNameForPath(path),
    format: audioExtensionForPath(path)?.toUpperCase() ?? 'FLAC',
    sizeBytes: 1024,
    modifiedAtMillis: 1791870000000,
    importStatus: AudioImportStatus.needsReview,
    sourceReferences: const [SourceReference(kind: SourceKind.localTag)],
  );
}
