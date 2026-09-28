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
