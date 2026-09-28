class SheetChordProDocument {
  const SheetChordProDocument({
    required this.lines,
    this.metadata = const <String, String>{},
  });

  final List<SheetChordProLine> lines;
  final Map<String, String> metadata;

  String get title {
    final explicit = metadata['title'] ?? metadata['t'];
    return explicit?.trim().isNotEmpty == true ? explicit!.trim() : 'Untitled';
  }

  String get artist {
    final explicit = metadata['artist'] ?? metadata['composer'];
    return explicit?.trim() ?? '';
  }

  String get key {
    return metadata['key']?.trim() ?? '';
  }

  int? get capo {
    final raw = metadata['capo']?.trim();
    if (raw == null || raw.isEmpty) {
      return null;
    }
    return int.tryParse(raw);
  }

  bool get hasChords {
    return lines.any((line) => line.tokens.any((token) => token.chord != null));
  }

  SheetChordProDocument transposedBy(
    int semitones, {
    bool preferFlats = false,
  }) {
    if (semitones == 0) {
      return this;
    }
    return SheetChordProDocument(
      metadata: {
        for (final entry in metadata.entries)
          entry.key: entry.key == 'key'
              ? SheetChordProTransposer.transposeChord(
                  entry.value,
                  semitones,
                  preferFlats: preferFlats,
                )
              : entry.value,
      },
      lines: [
        for (final line in lines)
          line.transposedBy(semitones, preferFlats: preferFlats),
      ],
    );
  }
}

class SheetChordProLine {
  const SheetChordProLine({
    required this.raw,
    this.directiveName,
    this.directiveValue,
    this.tokens = const <SheetChordProToken>[],
  });

  final String raw;
  final String? directiveName;
  final String? directiveValue;
  final List<SheetChordProToken> tokens;

  bool get isDirective => directiveName != null;

  String get lyricText {
    return tokens.map((token) => token.text).join();
  }

  SheetChordProLine transposedBy(int semitones, {bool preferFlats = false}) {
    if (isDirective) {
      if (directiveName == 'key' && directiveValue?.trim().isNotEmpty == true) {
        final transposedKey = SheetChordProTransposer.transposeChord(
          directiveValue!.trim(),
          semitones,
          preferFlats: preferFlats,
        );
        return SheetChordProLine(
          raw: '{$directiveName: $transposedKey}',
          directiveName: directiveName,
          directiveValue: transposedKey,
          tokens: tokens,
        );
      }
      return this;
    }
    if (semitones == 0 || tokens.every((token) => token.chord == null)) {
      return this;
    }
    final transposedTokens = [
      for (final token in tokens)
        token.chord == null
            ? token
            : token.copyWith(
                chord: SheetChordProTransposer.transposeChord(
                  token.chord!,
                  semitones,
                  preferFlats: preferFlats,
                ),
              ),
    ];
    return SheetChordProLine(
      raw: SheetChordProParser.renderTokens(transposedTokens),
      tokens: transposedTokens,
    );
  }
}

class SheetChordProToken {
  const SheetChordProToken({required this.text, this.chord});

  final String text;
  final String? chord;

  SheetChordProToken copyWith({String? text, String? chord}) {
    return SheetChordProToken(
      text: text ?? this.text,
      chord: chord ?? this.chord,
    );
  }
}

class SheetChordProParser {
  const SheetChordProParser._();

  static SheetChordProDocument parse(String source) {
    final metadata = <String, String>{};
    final lines = <SheetChordProLine>[];
    for (final rawLine in source.replaceAll('\r\n', '\n').split('\n')) {
      final directive = _parseDirective(rawLine);
      if (directive != null) {
        metadata[directive.$1] = directive.$2;
        lines.add(
          SheetChordProLine(
            raw: rawLine,
            directiveName: directive.$1,
            directiveValue: directive.$2,
          ),
        );
        continue;
      }
      lines.add(SheetChordProLine(raw: rawLine, tokens: _parseTokens(rawLine)));
    }
    return SheetChordProDocument(lines: lines, metadata: metadata);
  }

  static String renderTokens(List<SheetChordProToken> tokens) {
    final buffer = StringBuffer();
    for (final token in tokens) {
      final chord = token.chord;
      if (chord != null) {
        buffer.write('[$chord]');
      }
      buffer.write(token.text);
    }
    return buffer.toString();
  }

  static (String, String)? _parseDirective(String rawLine) {
    final match = RegExp(r'^\{\s*([^:}]+)\s*:?\s*([^}]*)\}$')
        .firstMatch(rawLine.trim());
    if (match == null) {
      return null;
    }
    final name = _normalizeDirectiveName(match.group(1) ?? '');
    if (name.isEmpty) {
      return null;
    }
    return (name, (match.group(2) ?? '').trim());
  }

  static String _normalizeDirectiveName(String value) {
    final normalized = value.trim().toLowerCase();
    return switch (normalized) {
      't' => 'title',
      'st' => 'subtitle',
      _ => normalized,
    };
  }

  static List<SheetChordProToken> _parseTokens(String rawLine) {
    final tokens = <SheetChordProToken>[];
    var cursor = 0;
    String? pendingChord;
    final chordPattern = RegExp(r'\[([^\]\r\n]+)\]');
    for (final match in chordPattern.allMatches(rawLine)) {
      final text = rawLine.substring(cursor, match.start);
      if (text.isNotEmpty || pendingChord != null) {
        tokens.add(SheetChordProToken(text: text, chord: pendingChord));
      }
      pendingChord = match.group(1)?.trim();
      cursor = match.end;
    }
    final text = rawLine.substring(cursor);
    if (text.isNotEmpty || pendingChord != null || tokens.isEmpty) {
      tokens.add(SheetChordProToken(text: text, chord: pendingChord));
    }
    return tokens;
  }
}

class SheetChordProTransposer {
  const SheetChordProTransposer._();

  static const _sharpNames = <String>[
    'C',
    'C#',
    'D',
    'D#',
    'E',
    'F',
    'F#',
    'G',
    'G#',
    'A',
    'A#',
    'B',
  ];
  static const _flatNames = <String>[
    'C',
    'Db',
    'D',
    'Eb',
    'E',
    'F',
    'Gb',
    'G',
    'Ab',
    'A',
    'Bb',
    'B',
  ];
  static const _noteValues = <String, int>{
    'C': 0,
    'B#': 0,
    'C#': 1,
    'DB': 1,
    'D': 2,
    'D#': 3,
    'EB': 3,
    'E': 4,
    'FB': 4,
    'E#': 5,
    'F': 5,
    'F#': 6,
    'GB': 6,
    'G': 7,
    'G#': 8,
    'AB': 8,
    'A': 9,
    'A#': 10,
    'BB': 10,
    'B': 11,
    'CB': 11,
  };

  static String transposeChord(
    String chord,
    int semitones, {
    bool preferFlats = false,
  }) {
    final trimmed = chord.trim();
    if (trimmed.isEmpty) {
      return chord;
    }
    final parsed = _parseRoot(trimmed);
    if (parsed == null) {
      return chord;
    }
    final root = _transposeNote(parsed.root, semitones, preferFlats);
    final slashIndex = parsed.rest.indexOf('/');
    if (slashIndex == -1) {
      return '$root${parsed.rest}';
    }
    final suffix = parsed.rest.substring(0, slashIndex);
    final bass = parsed.rest.substring(slashIndex + 1);
    final parsedBass = _parseRoot(bass);
    if (parsedBass == null) {
      return '$root${parsed.rest}';
    }
    final transposedBass = _transposeNote(
      parsedBass.root,
      semitones,
      preferFlats,
    );
    return '$root$suffix/$transposedBass${parsedBass.rest}';
  }

  static String capoShapeForConcertChord(
    String concertChord,
    int capoFrets, {
    bool preferFlats = false,
  }) {
    if (capoFrets <= 0) {
      return concertChord;
    }
    return transposeChord(concertChord, -capoFrets, preferFlats: preferFlats);
  }

  static _ParsedChordRoot? _parseRoot(String chord) {
    final match = RegExp(r'^([A-Ga-g])([#bB]?)(.*)$').firstMatch(chord);
    if (match == null) {
      return null;
    }
    final root = '${match.group(1)!.toUpperCase()}${match.group(2) ?? ''}';
    final rest = match.group(3) ?? '';
    if (!_noteValues.containsKey(root.toUpperCase())) {
      return null;
    }
    return _ParsedChordRoot(root: root, rest: rest);
  }

  static String _transposeNote(String note, int semitones, bool preferFlats) {
    final value = _noteValues[note.toUpperCase()];
    if (value == null) {
      return note;
    }
    final names = preferFlats ? _flatNames : _sharpNames;
    return names[(value + semitones) % 12];
  }
}

class _ParsedChordRoot {
  const _ParsedChordRoot({required this.root, required this.rest});

  final String root;
  final String rest;
}
