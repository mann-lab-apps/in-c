import 'dart:convert';
import 'dart:typed_data';

class SheetRtfDocument {
  const SheetRtfDocument({required this.text});

  final String text;
}

class SheetRtfTextExtractor {
  const SheetRtfTextExtractor._();

  static const maxFileBytes = 2 * 1024 * 1024;

  static const _ignoredDestinations = <String>{
    'annotation',
    'colortbl',
    'datastore',
    'filetbl',
    'fldinst',
    'fonttbl',
    'footer',
    'footerf',
    'footerl',
    'footerr',
    'footnote',
    'generator',
    'header',
    'headerf',
    'headerl',
    'headerr',
    'info',
    'listoverridetable',
    'listtable',
    'object',
    'pict',
    'stylesheet',
    'themedata',
    'xmlnstbl',
  };

  static SheetRtfDocument extract(Uint8List bytes) {
    if (bytes.isEmpty || bytes.length > maxFileBytes) {
      throw const FormatException('Invalid RTF file size.');
    }
    final source = latin1.decode(bytes);
    if (!source.startsWith(r'{\rtf')) {
      throw const FormatException('Invalid RTF header.');
    }

    final output = StringBuffer();
    final states = <_RtfState>[_RtfState()];
    var depth = 0;
    var fallbackCharacters = 0;
    var index = 0;

    void append(String value) {
      if (states.last.ignored || value.isEmpty) return;
      if (fallbackCharacters > 0) {
        fallbackCharacters -= 1;
        return;
      }
      output.write(value);
    }

    while (index < source.length) {
      final character = source[index];
      if (character == '{') {
        states.add(states.last.copy());
        depth += 1;
        index += 1;
        continue;
      }
      if (character == '}') {
        if (depth == 0 || states.length == 1) {
          throw const FormatException('Unbalanced RTF groups.');
        }
        states.removeLast();
        depth -= 1;
        index += 1;
        continue;
      }
      if (character != r'\') {
        if (character != '\r' && character != '\n' && character != '\u0000') {
          append(_decodeWindows1252(character.codeUnitAt(0)));
        }
        index += 1;
        continue;
      }

      index += 1;
      if (index >= source.length) {
        throw const FormatException('Incomplete RTF control.');
      }
      final control = source[index];
      if (control == r'\' || control == '{' || control == '}') {
        append(control);
        index += 1;
        continue;
      }
      if (control == "'") {
        if (index + 2 >= source.length) {
          throw const FormatException('Invalid RTF hex escape.');
        }
        final value = int.tryParse(
          source.substring(index + 1, index + 3),
          radix: 16,
        );
        if (value == null) {
          throw const FormatException('Invalid RTF hex escape.');
        }
        append(_decodeWindows1252(value));
        index += 3;
        continue;
      }
      if (control == '*') {
        states.last.ignored = true;
        index += 1;
        continue;
      }
      if (!_isAsciiLetter(control)) {
        switch (control) {
          case '~':
            append(' ');
          case '_':
            append('-');
          case '-':
            break;
          case '\r' || '\n':
            break;
          default:
            break;
        }
        index += 1;
        continue;
      }

      final wordStart = index;
      while (index < source.length && _isAsciiLetter(source[index])) {
        index += 1;
      }
      final word = source.substring(wordStart, index).toLowerCase();
      var sign = 1;
      if (index < source.length && source[index] == '-') {
        sign = -1;
        index += 1;
      }
      final numberStart = index;
      while (index < source.length && _isAsciiDigit(source[index])) {
        index += 1;
      }
      final parameter = numberStart == index
          ? null
          : sign * int.parse(source.substring(numberStart, index));
      if (index < source.length && source[index] == ' ') {
        index += 1;
      }

      if (_ignoredDestinations.contains(word)) {
        states.last.ignored = true;
        continue;
      }
      if (word == 'bin') {
        final byteCount = parameter ?? 0;
        if (byteCount < 0 || index + byteCount > source.length) {
          throw const FormatException('Invalid RTF binary payload.');
        }
        index += byteCount;
        continue;
      }
      if (word == 'uc') {
        states.last.unicodeFallbackLength = (parameter ?? 1).clamp(0, 16);
        continue;
      }
      if (states.last.ignored) continue;

      switch (word) {
        case 'par' || 'line':
          append('\n');
        case 'tab':
          append('\t');
        case 'u':
          if (parameter == null) {
            throw const FormatException('Invalid RTF Unicode escape.');
          }
          final codeUnit = parameter < 0 ? parameter + 0x10000 : parameter;
          if (codeUnit < 0 || codeUnit > 0xffff) {
            throw const FormatException('Invalid RTF Unicode value.');
          }
          output.writeCharCode(codeUnit);
          fallbackCharacters = states.last.unicodeFallbackLength;
        case 'bullet':
          append('•');
        case 'emdash':
          append('—');
        case 'endash':
          append('–');
        case 'lquote' || 'rquote':
          append("'");
        case 'ldblquote' || 'rdblquote':
          append('"');
      }
    }

    if (depth != 0 || states.length != 1) {
      throw const FormatException('Unbalanced RTF groups.');
    }
    final text = _normalizeExtractedText(output.toString());
    if (text.isEmpty) {
      throw const FormatException('RTF document has no readable text.');
    }
    return SheetRtfDocument(text: text);
  }

  static bool _isAsciiLetter(String value) {
    final code = value.codeUnitAt(0);
    return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
  }

  static bool _isAsciiDigit(String value) {
    final code = value.codeUnitAt(0);
    return code >= 48 && code <= 57;
  }

  static String _decodeWindows1252(int value) {
    final replacement = _windows1252[value];
    return replacement ?? String.fromCharCode(value);
  }

  static String _normalizeExtractedText(String value) {
    final lines = value
        .split('\n')
        .map((line) => line.trimRight())
        .toList(growable: false);
    final normalized = <String>[];
    var previousWasBlank = true;
    for (final line in lines) {
      final isBlank = line.trim().isEmpty;
      if (isBlank && previousWasBlank) continue;
      normalized.add(line);
      previousWasBlank = isBlank;
    }
    while (normalized.isNotEmpty && normalized.last.trim().isEmpty) {
      normalized.removeLast();
    }
    return normalized.join('\n').trim();
  }

  static const _windows1252 = <int, String>{
    0x80: '€',
    0x82: '‚',
    0x83: 'ƒ',
    0x84: '„',
    0x85: '…',
    0x86: '†',
    0x87: '‡',
    0x88: 'ˆ',
    0x89: '‰',
    0x8a: 'Š',
    0x8b: '‹',
    0x8c: 'Œ',
    0x8e: 'Ž',
    0x91: '‘',
    0x92: '’',
    0x93: '“',
    0x94: '”',
    0x95: '•',
    0x96: '–',
    0x97: '—',
    0x98: '˜',
    0x99: '™',
    0x9a: 'š',
    0x9b: '›',
    0x9c: 'œ',
    0x9e: 'ž',
    0x9f: 'Ÿ',
  };
}

class _RtfState {
  _RtfState({this.ignored = false, this.unicodeFallbackLength = 1});

  bool ignored;
  int unicodeFallbackLength;

  _RtfState copy() =>
      _RtfState(ignored: ignored, unicodeFallbackLength: unicodeFallbackLength);
}
