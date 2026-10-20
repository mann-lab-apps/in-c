import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_rtf.dart';

void main() {
  test('extracts paragraphs tabs escapes and typographic controls', () {
    final document = SheetRtfTextExtractor.extract(
      _bytes(
        r"{\rtf1\ansi First\tab bar\par Second \'96 \emdash done\line Last}",
      ),
    );

    expect(document.text, 'First\tbar\nSecond – —done\nLast');
  });

  test('extracts unicode and skips fallback characters', () {
    final document = SheetRtfTextExtractor.extract(
      _bytes(r'{\rtf1\ansi\uc1 \u54620?\u44544? \u-10179?\u-8704?}'),
    );

    expect(document.text, '한글 😀');
  });

  test('ignores font image metadata and optional destinations', () {
    final document = SheetRtfTextExtractor.extract(
      _bytes(
        r'{\rtf1{\fonttbl{\f0 Arial;}}{\info{\title Hidden}}Visible {\*\private secret}{\pict\pngblip 0011}text}',
      ),
    );

    expect(document.text, 'Visible text');
  });

  test('rejects invalid oversized unbalanced and empty RTF', () {
    expect(
      () => SheetRtfTextExtractor.extract(_bytes('plain text')),
      throwsFormatException,
    );
    expect(
      () => SheetRtfTextExtractor.extract(
        Uint8List(SheetRtfTextExtractor.maxFileBytes + 1),
      ),
      throwsFormatException,
    );
    expect(
      () => SheetRtfTextExtractor.extract(_bytes(r'{\rtf1 text')),
      throwsFormatException,
    );
    expect(
      () => SheetRtfTextExtractor.extract(
        _bytes(r'{\rtf1{\fonttbl{\f0 Arial;}}}'),
      ),
      throwsFormatException,
    );
  });

  test('rejects excessive group nesting and invalid binary payloads', () {
    final nested = StringBuffer(r'{\rtf1 ')
      ..write('{' * (SheetRtfTextExtractor.maxGroupDepth + 1))
      ..write('text')
      ..write('}' * (SheetRtfTextExtractor.maxGroupDepth + 2));

    expect(
      () => SheetRtfTextExtractor.extract(_bytes(nested.toString())),
      throwsFormatException,
    );
    expect(
      () => SheetRtfTextExtractor.extract(_bytes(r'{\rtf1\bin12 abc}')),
      throwsFormatException,
    );
  });
}

Uint8List _bytes(String source) => Uint8List.fromList(latin1.encode(source));
