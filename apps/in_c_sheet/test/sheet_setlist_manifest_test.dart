import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:in_c_sheet/sheet_setlist_manifest.dart';

void main() {
  test('parses copied Clef setlist manifest text', () {
    final manifest = SheetSetlistShareManifest.tryParse('''
Clef & Staff 세트리스트
제목: Autumn Recital
곡 수: 2곡 · 총 7분 30초
전환 10초

1. Goedicke Concert Etude
   작곡가: Goedicke
   파일: goedicke-concert-etude.pdf
   시작: 3쪽
   예상 시간: 3분
   세트 메모: trumpet entrance
   태그: recital, trumpet
   조성: F minor
   메트로놈: 120 BPM · 4/4 · 소리 70%
2. Bach Cello Suite No. 1
   작곡가: Bach
   파일: suite.pdf
   시작: 1쪽
''');

    expect(manifest, isNotNull);
    expect(manifest!.title, 'Autumn Recital');
    expect(manifest.expectedScoreCount, 2);
    expect(manifest.totalDurationLabel, '7분 30초');
    expect(manifest.transitionLabel, '10초');
    expect(manifest.canPreviewImport, isTrue);
    expect(manifest.warnings, isEmpty);

    expect(manifest.items, hasLength(2));
    expect(manifest.items.first.title, 'Goedicke Concert Etude');
    expect(manifest.items.first.composer, 'Goedicke');
    expect(manifest.items.first.fileName, 'goedicke-concert-etude.pdf');
    expect(manifest.items.first.startPageLabel, '3쪽');
    expect(manifest.items.first.setlistNote, 'trumpet entrance');
    expect(manifest.items.first.details['조성'], 'F minor');
    expect(manifest.items.first.details['메트로놈'], '120 BPM · 4/4 · 소리 70%');
  });

  test('returns null for non-Clef manifest text', () {
    expect(SheetSetlistShareManifest.tryParse('plain text'), isNull);
  });

  test('reports setlist manifest count mismatch', () {
    final manifest = SheetSetlistShareManifest.tryParse('''
Clef & Staff 세트리스트
제목: Short list
곡 수: 2곡

1. Only score
   파일: score.pdf
''');

    expect(manifest, isNotNull);
    expect(manifest!.hasCountMismatch, isTrue);
    expect(manifest.canPreviewImport, isFalse);
    expect(manifest.warnings, contains('곡 수와 항목 수가 다릅니다.'));
  });

  test('matches manifest items to existing scores by file name first', () {
    final manifest = SheetSetlistShareManifest.tryParse('''
Clef & Staff 세트리스트
제목: Recital
곡 수: 2곡

1. Retitled Etude
   작곡가: Goedicke
   파일: goedicke-concert-etude
2. Mozart Sonata
   작곡가: Mozart
''');

    final preview = manifest!.matchScores([
      _score(
        id: 'goedicke',
        title: 'Old metadata title',
        composer: 'Goedicke',
        filePath: '/tmp/imports/goedicke-concert-etude.pdf',
      ),
      _score(id: 'mozart', title: 'Mozart Sonata', composer: 'Mozart'),
    ]);

    expect(preview.canCreateSetlist, isTrue);
    expect(preview.matchedScoreIds, ['goedicke', 'mozart']);
    expect(preview.matches.first.kind, SheetSetlistManifestMatchKind.fileName);
    expect(
      preview.matches.last.kind,
      SheetSetlistManifestMatchKind.titleAndComposer,
    );
    expect(preview.warnings, isEmpty);
  });

  test('keeps ambiguous manifest matches unresolved', () {
    final manifest = SheetSetlistShareManifest.tryParse('''
Clef & Staff 세트리스트
제목: Recital
곡 수: 1곡

1. Sonata
''');

    final preview = manifest!.matchScores([
      _score(id: 'a', title: 'Sonata', composer: 'Mozart'),
      _score(id: 'b', title: 'Sonata', composer: 'Beethoven'),
    ]);

    expect(preview.canCreateSetlist, isFalse);
    expect(preview.ambiguousMatches, hasLength(1));
    expect(preview.ambiguousMatches.single.candidates, hasLength(2));
    expect(preview.warnings, contains('여러 악보와 일치하는 곡: Sonata'));
  });

  test('reports missing manifest matches', () {
    final manifest = SheetSetlistShareManifest.tryParse('''
Clef & Staff 세트리스트
제목: Recital
곡 수: 1곡

1. Missing Score
   파일: missing-score
''');

    final preview = manifest!.matchScores([
      _score(id: 'other', title: 'Other Score'),
    ]);

    expect(preview.canCreateSetlist, isFalse);
    expect(preview.missingMatches, hasLength(1));
    expect(preview.matchedScoreIds, isEmpty);
    expect(preview.warnings, contains('라이브러리에서 찾을 수 없는 곡: Missing Score'));
  });

  test('creates setlist draft from fully matched manifest preview', () {
    final manifest = SheetSetlistShareManifest.tryParse('''
Clef & Staff 세트리스트
제목: Recital
곡 수: 2곡 · 총 7분 45초
전환 15초

1. Goedicke Etude
   작곡가: Goedicke
   파일: goedicke
   시작: 3쪽
   예상 시간: 3분 30초
   세트 메모: mute ready
2. Bach Suite
   파일: bach-suite
   시작: 1쪽
   예상 시간: 4분
''');

    final preview = manifest!.matchScores([
      _score(id: 'goedicke', title: 'Goedicke Etude'),
      _score(id: 'bach', title: 'Bach Suite', filePath: '/tmp/bach-suite.pdf'),
    ]);
    final draft = preview.toSetlistDraft(
      id: 'setlist-1',
      now: DateTime(2026, 9, 28, 13),
    );

    expect(draft, isNotNull);
    expect(draft!.id, 'setlist-1');
    expect(draft.title, 'Recital');
    expect(draft.scoreIds, ['goedicke', 'bach']);
    expect(draft.scoreStartPages, {'goedicke': 3, 'bach': 1});
    expect(draft.scoreDurations, {'goedicke': 210, 'bach': 240});
    expect(draft.scoreNotes, {'goedicke': 'mute ready'});
    expect(draft.transitionSeconds, 15);
  });

  test(
    'does not create setlist draft while manifest matches are unresolved',
    () {
      final manifest = SheetSetlistShareManifest.tryParse('''
Clef & Staff 세트리스트
제목: Recital
곡 수: 1곡

1. Missing Score
''');

      final preview = manifest!.matchScores([
        _score(id: 'other', title: 'Other Score'),
      ]);

      expect(
        preview.toSetlistDraft(id: 'setlist-1', now: DateTime(2026)),
        isNull,
      );
    },
  );
}

SheetScore _score({
  required String id,
  required String title,
  String composer = '',
  String? filePath,
}) {
  final now = DateTime(2026, 9, 28, 12);
  return SheetScore(
    id: id,
    title: title,
    composer: composer,
    tags: const <String>[],
    note: '',
    filePath: filePath ?? '/tmp/$id.pdf',
    importedAt: now,
    updatedAt: now,
    lastOpenedAt: null,
    lastPage: 1,
    isFavorite: false,
    bookmarks: const <SheetBookmark>[],
  );
}
