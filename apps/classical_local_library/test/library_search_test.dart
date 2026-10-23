import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/library_search.dart';
import 'package:classical_local_library/local_audio_scanner.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/sample_classical_library.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const search = LibrarySearchService();

  test('한글 작곡가와 작품 번호를 함께 검색한다', () {
    final results = search.search(
      library: sampleClassicalLibrary,
      files: const [],
      candidates: const [],
      query: '베토벤 5번',
    );

    expect(results.any((result) => result.title == '교향곡 5번 다단조'), isTrue);
  });

  test('원어/영어 작품명과 작품번호를 검색한다', () {
    final english = search.search(
      library: sampleClassicalLibrary,
      files: const [],
      candidates: const [],
      query: 'Beethoven Symphony 5',
    );
    final opus = search.search(
      library: sampleClassicalLibrary,
      files: const [],
      candidates: const [],
      query: 'Op.67',
    );

    expect(
      english.any((result) => result.type == SearchResultType.work),
      isTrue,
    );
    expect(opus.any((result) => result.title == '교향곡 5번 다단조'), isTrue);
  });

  test('별칭과 악장명을 검색한다', () {
    final alias = search.search(
      library: sampleClassicalLibrary,
      files: const [],
      candidates: const [],
      query: '운명',
    );
    final part = search.search(
      library: sampleClassicalLibrary,
      files: const [],
      candidates: const [],
      query: '월광 1악장',
    );

    expect(alias.any((result) => result.title == '교향곡 5번 다단조'), isTrue);
    expect(
      part.any((result) => result.type == SearchResultType.workPart),
      isTrue,
    );
  });

  test('스캔 파일 후보의 추론 메타데이터를 검색한다', () {
    final file = _audioFile('/Music/Dvorak/New World/04 Allegro con fuoco.mp3');
    final candidate = const MetadataCandidateInferencer().infer(file);
    final results = search.search(
      library: sampleClassicalLibrary,
      files: [file],
      candidates: [candidate],
      query: 'Dvorak New World',
    );

    final fileResults = results.where(
      (result) => result.type == SearchResultType.fileCandidate,
    );

    expect(fileResults.single.title, '04 Allegro con fuoco.mp3');
  });

  test('파일명이 없는 레거시 후보는 전체 경로 대신 basename만 표시한다', () {
    const privatePath = '/Users/listener/Private/secret recording.flac';
    final results = search.search(
      library: emptyClassicalLibrary,
      files: const [
        LocalAudioFile(
          id: 'legacy-file',
          path: privatePath,
          format: 'FLAC',
          importStatus: AudioImportStatus.needsReview,
        ),
      ],
      candidates: const [],
      query: 'secret',
    );

    expect(results.single.title, 'secret recording.flac');
    expect(results.single.title, isNot(contains('/Users/')));
  });

  test('한글 초성으로 작곡가와 작품을 검색한다', () {
    final composerResults = search.search(
      library: sampleClassicalLibrary,
      files: const [],
      candidates: const [],
      query: 'ㅂㅌㅂ',
    );
    final workResults = search.search(
      library: sampleClassicalLibrary,
      files: const [],
      candidates: const [],
      query: 'ㄱㅎㄱ 5',
    );

    expect(composerResults.first.title, '루트비히 판 베토벤');
    expect(
      workResults.any((result) => result.id == 'work.beethoven.symphony5'),
      isTrue,
    );
  });

  test('라틴 발음기호를 접어 원문과 동일하게 검색한다', () {
    const normalizer = SearchNormalizer();

    expect(normalizer.normalize('Dvořák'), normalizer.normalize('Dvorak'));
  });

  test('긴 검색어의 작은 오타는 허용하지만 짧은 오타는 확장하지 않는다', () {
    final typoResults = search.search(
      library: sampleClassicalLibrary,
      files: const [],
      candidates: const [],
      query: 'Beethovn',
    );
    final shortResults = search.search(
      library: sampleClassicalLibrary,
      files: const [],
      candidates: const [],
      query: 'Bth',
    );

    expect(
      typoResults.any((result) => result.id == 'person.beethoven'),
      isTrue,
    );
    expect(shortResults, isEmpty);
  });

  test('정확 일치는 부분 및 퍼지 일치보다 먼저 정렬한다', () {
    final results = search.search(
      library: sampleClassicalLibrary,
      files: const [],
      candidates: const [],
      query: 'Beethoven',
    );

    expect(results.first.type, SearchResultType.person);
    expect(results.first.rank, 0);
    expect(
      results.map((result) => result.rank),
      orderedEquals([...results.map((result) => result.rank)]..sort()),
    );
  });

  test('병합된 작품 별칭은 대표 작품 ID로 중복 없이 검색된다', () {
    final results = search.search(
      library: sampleClassicalLibrary,
      files: const [],
      candidates: const [],
      workAliases: const {
        'work.beethoven.moonlight': 'work.beethoven.symphony5',
      },
      query: 'Beethoven',
    );

    expect(
      results
          .where(
            (result) =>
                result.type == SearchResultType.work &&
                result.id == 'work.beethoven.symphony5',
          )
          .length,
      1,
    );
  });
}

LocalAudioFile _audioFile(String path) {
  return LocalAudioFile(
    id: scannedAudioId(path),
    path: path,
    fileName: fileNameForPath(path),
    format: 'MP3',
    sizeBytes: 1024,
    modifiedAtMillis: 1791870000000,
    importStatus: AudioImportStatus.needsReview,
    sourceReferences: const [SourceReference(kind: SourceKind.localTag)],
  );
}
