import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_chordpro.dart';

void main() {
  test('parses ChordPro metadata and lyric tokens', () {
    final document = SheetChordProParser.parse('''
{title: Autumn Song}
{artist: Clef Trio}
{key: C}
{capo: 2}
[C]Falling [G/B]leaves [Am7]turn
Plain lyric line
''');

    expect(document.title, 'Autumn Song');
    expect(document.artist, 'Clef Trio');
    expect(document.key, 'C');
    expect(document.capo, 2);
    expect(document.hasChords, isTrue);

    final chordLine = document.lines[4];
    expect(chordLine.lyricText, 'Falling leaves turn');
    expect(chordLine.tokens.map((token) => token.chord).toList(), <String?>[
      'C',
      'G/B',
      'Am7',
    ]);
    expect(document.lines[5].lyricText, 'Plain lyric line');
  });

  test('exposes common ChordPro metadata for future text score import', () {
    final document = SheetChordProParser.parse('''
{title: Autumn Song}
{sorttitle: Song, Autumn}
{st: Recital cut}
{meta: artist Clef Trio}
{composer: Composer Name}
{lyricist: Lyricist Name}
{arranger: Arranger Name}
{album: Concert Book}
{year: 2026}
{key: Dm}
{time: 6/8}
{tempo: 132}
{duration: 3:45}
{copyright: 2026 Clef}
{tag: recital}
{capo: 3}
[Dm]Autumn
''');

    expect(document.title, 'Autumn Song');
    expect(document.sortTitle, 'Song, Autumn');
    expect(document.subtitle, 'Recital cut');
    expect(document.artist, 'Clef Trio');
    expect(document.composer, 'Composer Name');
    expect(document.lyricist, 'Lyricist Name');
    expect(document.arranger, 'Arranger Name');
    expect(document.album, 'Concert Book');
    expect(document.year, '2026');
    expect(document.key, 'Dm');
    expect(document.timeSignature, '6/8');
    expect(document.tempo, '132');
    expect(document.duration, '3:45');
    expect(document.copyright, '2026 Clef');
    expect(document.tag, 'recital');
    expect(document.capo, 3);
  });

  test('builds a Clef score draft from ChordPro metadata', () {
    final document = SheetChordProParser.parse('''
{title: Autumn Song}
{subtitle: Recital cut}
{artist: Clef Trio}
{composer: Composer Name}
{lyricist: Lyricist Name}
{arranger: Arranger Name}
{album: Concert Book}
{year: 2026}
{key: Dm}
{time: 6/8}
{tempo: 132}
{duration: 3:45}
{copyright: 2026 Clef}
{tag: recital, lesson; recital}
{capo: 3}
[Dm]Autumn
''');

    final draft = SheetChordProScoreDraft.fromDocument(document);

    expect(draft.title, 'Autumn Song');
    expect(draft.composer, 'Composer Name');
    expect(draft.subtitle, 'Recital cut');
    expect(draft.tags, <String>['recital', 'lesson']);
    expect(draft.customFields, <String, String>{
      '출처 유형': 'ChordPro',
      '조성': 'Dm',
      '박자': '6/8',
      '카포': '3',
      '템포': '132',
      '앨범': 'Concert Book',
      '연도': '2026',
      '길이': '3:45',
      '편곡': 'Arranger Name',
      '작사': 'Lyricist Name',
      '저작권': '2026 Clef',
    });
    expect(draft.previewText, contains('Dm\nAutumn'));
    expect(draft.hasUsefulMetadata, isTrue);
  });

  test('score draft falls back to file title and artist metadata', () {
    final document = SheetChordProParser.parse('''
{artist: Clef Trio}
[G]Tune
''');

    final draft = SheetChordProScoreDraft.fromDocument(
      document,
      fallbackTitle: 'session lead sheet',
    );

    expect(draft.title, 'session lead sheet');
    expect(draft.composer, 'Clef Trio');
    expect(draft.customFields, <String, String>{'출처 유형': 'ChordPro'});
    expect(draft.hasUsefulMetadata, isTrue);
  });

  test('falls back from blank artist metadata to composer', () {
    final document = SheetChordProParser.parse('''
{artist: }
{composer: Bach}
''');

    expect(document.artist, 'Bach');
  });

  test('parses ChordPro directives with whitespace arguments', () {
    final document = SheetChordProParser.parse('''
{subtitle Recital cut}
{comment freely}
{sov Verse 1}
[C]Sing
{start_of_chorus label="Big chorus"}
[G]Again
''');

    expect(document.subtitle, 'Recital cut');
    expect(SheetChordProTextRenderer.renderLines(document), <String>[
      '[freely]',
      '[Verse 1]',
      'C',
      'Sing',
      '[Big chorus]',
      'G',
      'Again',
    ]);
  });

  test('transposes roots, slash bass notes and key directives', () {
    final document = SheetChordProParser.parse('''
{title: Tune}
{key: C}
[C]Home [G/B]again [Am7]soon
''');

    final transposed = document.transposedBy(2);

    expect(transposed.key, 'D');
    expect(transposed.lines[1].raw, '{key: D}');
    expect(transposed.lines[2].raw, '[D]Home [A/C#]again [Bm7]soon');
  });

  test('can prefer flat note names when transposing', () {
    expect(
      SheetChordProTransposer.transposeChord('C', 1, preferFlats: true),
      'Db',
    );
    expect(SheetChordProTransposer.transposeChord('Bbmaj7/F', 2), 'Cmaj7/G');
  });

  test('derives capo chord shapes from concert chords', () {
    expect(SheetChordProTransposer.capoShapeForConcertChord('D', 2), 'C');
    expect(SheetChordProTransposer.capoShapeForConcertChord('A/C#', 2), 'G/B');
    expect(
      SheetChordProTransposer.capoShapeForConcertChord(
        'Ebmaj7/Bb',
        1,
        preferFlats: true,
      ),
      'Dmaj7/A',
    );
    expect(SheetChordProTransposer.capoShapeForConcertChord('F', 0), 'F');
    expect(SheetChordProTransposer.capoShapeForConcertChord('F', -1), 'F');
  });

  test('renders ChordPro lines as chord rows above lyrics', () {
    final document = SheetChordProParser.parse('''
{title: Tune}
[C]Falling [G/B]leaves
Plain lyric line
''');

    expect(SheetChordProTextRenderer.renderLines(document), <String>[
      'C       G/B',
      'Falling leaves',
      'Plain lyric line',
    ]);
    expect(
      SheetChordProTextRenderer.renderPlainText(document),
      'C       G/B\nFalling leaves\nPlain lyric line',
    );
  });

  test('renders transposed concert chords and capo shapes', () {
    final document = SheetChordProParser.parse('''
{key: D}
{capo: 2}
[D]Home [A/C#]again
''');

    expect(
      SheetChordProTextRenderer.renderLines(document, transposeSemitones: 2),
      <String>['E    B/D#', 'Home again'],
    );
    expect(
      SheetChordProTextRenderer.renderLines(document, showCapoShapes: true),
      <String>['C    G/B', 'Home again'],
    );
  });

  test('renders chord-only lines without adding empty lyric rows', () {
    final document = SheetChordProParser.parse('''
[C][G][Am][F]
[C]Home
''');

    expect(SheetChordProTextRenderer.renderLines(document), <String>[
      'C G Am F',
      'C',
      'Home',
    ]);
  });

  test('renders common section and comment directives as rehearsal labels', () {
    final document = SheetChordProParser.parse('''
{c: Intro}
[C][G]
{soc}
[Am]Sing
{eoc}
{section: Bridge}
[F]Stay
''');

    expect(SheetChordProTextRenderer.renderLines(document), <String>[
      '[Intro]',
      'C G',
      '[Chorus]',
      'Am',
      'Sing',
      '[Bridge]',
      'F',
      'Stay',
    ]);
  });

  test('preserves ChordPro tab section markers in plain text rendering', () {
    final document = SheetChordProParser.parse('''
{sot}
e|--0--1--|
{eot}
{start_of_tab: Guitar riff}
[Am]Sing
''');

    expect(SheetChordProTextRenderer.renderLines(document), <String>[
      '[Tab]',
      'e|--0--1--|',
      '[Guitar riff]',
      'Am',
      'Sing',
    ]);
  });

  test('preserves ChordPro page and column break cues', () {
    final document = SheetChordProParser.parse('''
[C]First
{np}
[G]Second
{new_physical_page}
[Am]Third
{colb}
[F]Fourth
''');

    expect(SheetChordProTextRenderer.renderLines(document), <String>[
      'C',
      'First',
      '[Page break]',
      'G',
      'Second',
      '[Page break]',
      'Am',
      'Third',
      '[Column break]',
      'F',
      'Fourth',
    ]);
  });

  test('keeps unrecognized chords and directives stable', () {
    final document = SheetChordProParser.parse('''
{comment: freely}
[N.C.]Speak [H]softly
''');
    final transposed = document.transposedBy(5);

    expect(transposed.lines[0].raw, '{comment: freely}');
    expect(transposed.lines[1].raw, '[N.C.]Speak [H]softly');
  });
}
