import 'package:flutter_test/flutter_test.dart';
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
}
