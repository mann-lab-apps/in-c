class SheetChordProDocument {
  const SheetChordProDocument({
    required this.lines,
    this.metadata = const <String, String>{},
  });

  final List<SheetChordProLine> lines;
  final Map<String, String> metadata;

  String get title {
    final explicit = _metadataValue('title') ?? _metadataValue('t');
    return explicit?.trim().isNotEmpty == true ? explicit!.trim() : 'Untitled';
  }

  String get sortTitle {
    return _metadataValue('sorttitle') ?? title;
  }

  String get subtitle {
    return _metadataValue('subtitle') ?? '';
  }

  String get artist {
    return _metadataValue('artist') ?? composer;
  }

  String get composer {
    return _metadataValue('composer') ?? '';
  }

  String get lyricist {
    return _metadataValue('lyricist') ?? '';
  }

  String get arranger {
    return _metadataValue('arranger') ?? '';
  }

  String get album {
    return _metadataValue('album') ?? '';
  }

  String get year {
    return _metadataValue('year') ?? '';
  }

  String get key {
    return _metadataValue('key') ?? '';
  }

  String get timeSignature {
    return _metadataValue('time') ?? '';
  }

  String get tempo {
    return _metadataValue('tempo') ?? '';
  }

  String get duration {
    return _metadataValue('duration') ?? '';
  }

  String get copyright {
    return _metadataValue('copyright') ?? '';
  }

  String get tag {
    return _metadataValue('tag') ?? '';
  }

  int? get capo {
    final raw = _metadataValue('capo');
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

  String? _metadataValue(String key) {
    final value = metadata[key]?.trim();
    return value == null || value.isEmpty ? null : value;
  }
}

class SheetChordProScoreDraft {
  const SheetChordProScoreDraft({
    required this.title,
    required this.composer,
    this.subtitle = '',
    this.tags = const <String>[],
    this.customFields = const <String, String>{},
    this.previewText = '',
  });

  factory SheetChordProScoreDraft.fromDocument(
    SheetChordProDocument document, {
    String fallbackTitle = 'Untitled score',
  }) {
    final title = _firstNonEmpty([document.title, fallbackTitle]);
    final composer = _firstNonEmpty([document.composer, document.artist]);
    final customFields = <String, String>{
      '출처 유형': 'ChordPro',
      if (document.key.trim().isNotEmpty) '조성': document.key.trim(),
      if (document.timeSignature.trim().isNotEmpty)
        '박자': document.timeSignature.trim(),
      if (document.capo != null) '카포': '${document.capo}',
      if (document.tempo.trim().isNotEmpty) '템포': document.tempo.trim(),
      if (document.album.trim().isNotEmpty) '앨범': document.album.trim(),
      if (document.year.trim().isNotEmpty) '연도': document.year.trim(),
      if (document.duration.trim().isNotEmpty) '길이': document.duration.trim(),
      if (document.arranger.trim().isNotEmpty) '편곡': document.arranger.trim(),
      if (document.lyricist.trim().isNotEmpty) '작사': document.lyricist.trim(),
      if (document.copyright.trim().isNotEmpty)
        '저작권': document.copyright.trim(),
    };
    return SheetChordProScoreDraft(
      title: title,
      composer: composer,
      subtitle: document.subtitle.trim(),
      tags: _splitTags(document.tag),
      customFields: Map<String, String>.unmodifiable(customFields),
      previewText: SheetChordProTextRenderer.renderPlainText(document),
    );
  }

  final String title;
  final String composer;
  final String subtitle;
  final List<String> tags;
  final Map<String, String> customFields;
  final String previewText;

  bool get hasUsefulMetadata {
    return composer.isNotEmpty ||
        subtitle.isNotEmpty ||
        tags.isNotEmpty ||
        customFields.entries.any((entry) => entry.key != '출처 유형');
  }

  static String _firstNonEmpty(Iterable<String> values) {
    for (final value in values) {
      final trimmed = value.trim();
      if (trimmed.isNotEmpty && trimmed != 'Untitled') {
        return trimmed;
      }
    }
    return 'Untitled score';
  }

  static List<String> _splitTags(String value) {
    final seen = <String>{};
    final tags = <String>[];
    for (final raw in value.split(RegExp(r'[,;#]+'))) {
      final tag = raw.trim();
      if (tag.isEmpty || !seen.add(tag.toLowerCase())) {
        continue;
      }
      tags.add(tag);
    }
    return List<String>.unmodifiable(tags);
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

enum SheetChordProDisplayLineKind { lyric, chordLyric, directive, blank }

class SheetChordProDisplayChord {
  const SheetChordProDisplayChord({
    required this.chord,
    required this.lyricColumn,
    this.lyric = '',
  });

  final String chord;
  final int lyricColumn;
  final String lyric;
}

class SheetChordProDisplayLine {
  const SheetChordProDisplayLine._({
    required this.kind,
    this.label = '',
    this.lyricText = '',
    this.chords = const <SheetChordProDisplayChord>[],
  });

  const SheetChordProDisplayLine.lyric(String lyricText)
    : this._(kind: SheetChordProDisplayLineKind.lyric, lyricText: lyricText);

  const SheetChordProDisplayLine.chordLyric({
    required String lyricText,
    required List<SheetChordProDisplayChord> chords,
  }) : this._(
         kind: SheetChordProDisplayLineKind.chordLyric,
         lyricText: lyricText,
         chords: chords,
       );

  const SheetChordProDisplayLine.directive(String label)
    : this._(kind: SheetChordProDisplayLineKind.directive, label: label);

  const SheetChordProDisplayLine.blank()
    : this._(kind: SheetChordProDisplayLineKind.blank);

  final SheetChordProDisplayLineKind kind;
  final String label;
  final String lyricText;
  final List<SheetChordProDisplayChord> chords;

  bool get hasChords => chords.isNotEmpty;
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
        if (directive.$1 == 'meta') {
          final explicitMetadata = _parseMetaDirectiveValue(directive.$2);
          if (explicitMetadata != null) {
            metadata[explicitMetadata.$1] = explicitMetadata.$2;
          }
        }
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
    final match = RegExp(r'^\{\s*([^}]*)\s*\}$').firstMatch(rawLine.trim());
    if (match == null) {
      return null;
    }
    final inner = (match.group(1) ?? '').trim();
    if (inner.isEmpty) {
      return null;
    }
    final parts = _splitDirectiveInner(inner);
    final name = _normalizeDirectiveName(parts.$1);
    if (name.isEmpty) {
      return null;
    }
    return (name, parts.$2);
  }

  static (String, String) _splitDirectiveInner(String inner) {
    final colonIndex = inner.indexOf(':');
    if (colonIndex >= 0) {
      return (
        inner.substring(0, colonIndex).trim(),
        inner.substring(colonIndex + 1).trim(),
      );
    }
    final whitespace = RegExp(r'\s+').firstMatch(inner);
    if (whitespace == null) {
      return (inner, '');
    }
    return (
      inner.substring(0, whitespace.start).trim(),
      inner.substring(whitespace.end).trim(),
    );
  }

  static (String, String)? _parseMetaDirectiveValue(String rawValue) {
    final trimmed = rawValue.trim();
    if (trimmed.isEmpty) {
      return null;
    }
    final match = RegExp(r'^([^\s:]+)\s*:?\s*(.*)$').firstMatch(trimmed);
    if (match == null) {
      return null;
    }
    final key = _normalizeDirectiveName(match.group(1) ?? '');
    final value = (match.group(2) ?? '').trim();
    if (key.isEmpty || value.isEmpty) {
      return null;
    }
    return (key, value);
  }

  static String _normalizeDirectiveName(String value) {
    final normalized = value.trim().toLowerCase();
    return switch (normalized) {
      't' => 'title',
      'st' => 'subtitle',
      'c' => 'comment',
      'ci' => 'comment_italic',
      'cb' => 'comment_box',
      'soc' => 'start_of_chorus',
      'eoc' => 'end_of_chorus',
      'sov' => 'start_of_verse',
      'eov' => 'end_of_verse',
      'sob' => 'start_of_bridge',
      'eob' => 'end_of_bridge',
      'sot' => 'start_of_tab',
      'eot' => 'end_of_tab',
      'np' => 'new_page',
      'npp' => 'new_physical_page',
      'colb' => 'column_break',
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

class SheetChordProTextRenderer {
  const SheetChordProTextRenderer._();

  static String renderPlainText(
    SheetChordProDocument document, {
    int transposeSemitones = 0,
    int? capoFrets,
    bool showCapoShapes = false,
    bool preferFlats = false,
  }) {
    return renderLines(
      document,
      transposeSemitones: transposeSemitones,
      capoFrets: capoFrets,
      showCapoShapes: showCapoShapes,
      preferFlats: preferFlats,
    ).join('\n');
  }

  static List<String> renderLines(
    SheetChordProDocument document, {
    int transposeSemitones = 0,
    int? capoFrets,
    bool showCapoShapes = false,
    bool preferFlats = false,
  }) {
    final source = transposeSemitones == 0
        ? document
        : document.transposedBy(transposeSemitones, preferFlats: preferFlats);
    final effectiveCapoFrets = capoFrets ?? source.capo ?? 0;
    final rendered = <String>[];
    for (var index = 0; index < source.lines.length; index += 1) {
      final line = source.lines[index];
      if (line.isDirective) {
        final directiveLine = _renderDirectiveLine(line);
        if (directiveLine != null) {
          rendered.add(directiveLine);
        }
        continue;
      }
      if (!line.tokens.any((token) => token.chord != null)) {
        if (line.lyricText.isEmpty && index == source.lines.length - 1) {
          continue;
        }
        rendered.add(line.lyricText);
        continue;
      }
      final chordRow = _renderChordRow(
        line.tokens,
        capoFrets: effectiveCapoFrets,
        showCapoShapes: showCapoShapes,
        preferFlats: preferFlats,
      );
      if (chordRow.isNotEmpty) {
        rendered.add(chordRow);
      }
      if (line.lyricText.isNotEmpty) {
        rendered.add(line.lyricText);
      }
    }
    return rendered;
  }

  static List<SheetChordProDisplayLine> renderDisplayLines(
    SheetChordProDocument document, {
    int transposeSemitones = 0,
    int? capoFrets,
    bool showCapoShapes = false,
    bool preferFlats = false,
  }) {
    final source = transposeSemitones == 0
        ? document
        : document.transposedBy(transposeSemitones, preferFlats: preferFlats);
    final effectiveCapoFrets = capoFrets ?? source.capo ?? 0;
    final rendered = <SheetChordProDisplayLine>[];
    for (var index = 0; index < source.lines.length; index += 1) {
      final line = source.lines[index];
      if (line.isDirective) {
        final directiveLine = _renderDirectiveLine(line);
        if (directiveLine != null) {
          rendered.add(SheetChordProDisplayLine.directive(directiveLine));
        }
        continue;
      }
      if (!line.tokens.any((token) => token.chord != null)) {
        if (line.lyricText.isEmpty && index == source.lines.length - 1) {
          continue;
        }
        rendered.add(
          line.lyricText.isEmpty
              ? const SheetChordProDisplayLine.blank()
              : SheetChordProDisplayLine.lyric(line.lyricText),
        );
        continue;
      }
      rendered.add(
        SheetChordProDisplayLine.chordLyric(
          lyricText: line.lyricText,
          chords: _renderDisplayChords(
            line.tokens,
            capoFrets: effectiveCapoFrets,
            showCapoShapes: showCapoShapes,
            preferFlats: preferFlats,
          ),
        ),
      );
    }
    return rendered;
  }

  static String? _renderDirectiveLine(SheetChordProLine line) {
    final name = line.directiveName;
    final value = line.directiveValue?.trim() ?? '';
    final label = _directiveLabel(value);
    return switch (name) {
      'comment' ||
      'comment_box' ||
      'comment_italic' ||
      'section' => value.isEmpty ? null : '[$value]',
      'start_of_chorus' => '[${label.isEmpty ? 'Chorus' : label}]',
      'start_of_verse' => '[${label.isEmpty ? 'Verse' : label}]',
      'start_of_bridge' => '[${label.isEmpty ? 'Bridge' : label}]',
      'start_of_tab' => '[${label.isEmpty ? 'Tab' : label}]',
      'new_page' => '[Page break]',
      'new_physical_page' => '[Page break]',
      'column_break' => '[Column break]',
      _ => null,
    };
  }

  static String _directiveLabel(String value) {
    final match = RegExp(
      r'''(?:^|\s)label\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+))''',
    ).firstMatch(value);
    if (match == null) {
      return value;
    }
    return (match.group(1) ?? match.group(2) ?? match.group(3) ?? '').trim();
  }

  static String _renderChordRow(
    List<SheetChordProToken> tokens, {
    required int capoFrets,
    required bool showCapoShapes,
    required bool preferFlats,
  }) {
    var chordRow = '';
    var lyricOffset = 0;
    for (final token in tokens) {
      final chord = token.chord;
      if (chord != null) {
        final renderedChord = _renderChord(
          chord,
          capoFrets: capoFrets,
          showCapoShapes: showCapoShapes,
          preferFlats: preferFlats,
        );
        if (chordRow.length < lyricOffset) {
          chordRow += ' ' * (lyricOffset - chordRow.length);
        } else if (chordRow.length > lyricOffset && !chordRow.endsWith(' ')) {
          chordRow += ' ';
        }
        chordRow += renderedChord;
      }
      lyricOffset += token.text.length;
    }
    return chordRow.trimRight();
  }

  static List<SheetChordProDisplayChord> _renderDisplayChords(
    List<SheetChordProToken> tokens, {
    required int capoFrets,
    required bool showCapoShapes,
    required bool preferFlats,
  }) {
    var lyricOffset = 0;
    final rendered = <SheetChordProDisplayChord>[];
    for (final token in tokens) {
      final chord = token.chord;
      if (chord != null) {
        rendered.add(
          SheetChordProDisplayChord(
            chord: _renderChord(
              chord,
              capoFrets: capoFrets,
              showCapoShapes: showCapoShapes,
              preferFlats: preferFlats,
            ),
            lyricColumn: lyricOffset,
            lyric: token.text,
          ),
        );
      }
      lyricOffset += token.text.length;
    }
    return rendered;
  }

  static String _renderChord(
    String chord, {
    required int capoFrets,
    required bool showCapoShapes,
    required bool preferFlats,
  }) {
    return showCapoShapes
        ? SheetChordProTransposer.capoShapeForConcertChord(
            chord,
            capoFrets,
            preferFlats: preferFlats,
          )
        : chord;
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
