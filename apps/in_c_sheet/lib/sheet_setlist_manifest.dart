import 'sheet_metronome.dart';
import 'sheet_score.dart';
import 'sheet_setlist.dart';

class SheetSetlistManifestMetronomeCodec {
  const SheetSetlistManifestMetronomeCodec._();

  static String encode(SheetMetronomeSettings settings) {
    final defaultAccents = SheetMetronomeSettings.defaultAccentBeatIndexesFor(
      settings.meter,
    );
    final accents = settings.normalizedAccentBeatIndexes;
    final parts = <String>[
      '${settings.bpm} BPM',
      settings.meter.label,
      if (settings.subdivision != SheetMetronomeSubdivision.none)
        settings.subdivision.label,
      settings.soundEnabled ? '소리 ${settings.volumePercent}%' : '시각만',
      if (!settings.soundEnabled &&
          settings.volumePercent !=
              SheetMetronomeSettings.defaultSettings.volumePercent)
        '음량 ${settings.volumePercent}%',
      if (!settings.accentEnabled)
        '강세 끔'
      else if (!_sameIndexes(accents, defaultAccents))
        accents.isEmpty
            ? '강세 없음'
            : '강세 ${accents.map((index) => index + 1).join(',')}',
      if (settings.countInBars > 0) '카운트인 ${settings.countInBars}마디',
    ];
    return parts.join(' · ');
  }

  static SheetMetronomeSettings? tryDecode(String value) {
    final parts = value
        .split('·')
        .map((part) => part.trim())
        .where((part) => part.isNotEmpty)
        .toList(growable: false);
    if (parts.length < 2) {
      return null;
    }

    final bpmMatch = RegExp(
      r'^(\d+)\s*BPM$',
      caseSensitive: false,
    ).firstMatch(parts.first);
    final bpm = int.tryParse(bpmMatch?.group(1) ?? '');
    if (bpm == null || bpm < 40 || bpm > 240) {
      return null;
    }
    final meter = _meterForLabel(parts[1]);
    if (meter == null) {
      return null;
    }

    var soundEnabled = true;
    var volumePercent = SheetMetronomeSettings.defaultSettings.volumePercent;
    var subdivision = SheetMetronomeSubdivision.none;
    var countInBars = 0;
    var accentEnabled = true;
    var accentBeatIndexes = SheetMetronomeSettings.defaultAccentBeatIndexesFor(
      meter,
    );

    for (final part in parts.skip(2)) {
      final matchingSubdivision = _subdivisionForLabel(part);
      if (matchingSubdivision != null) {
        subdivision = matchingSubdivision;
        continue;
      }
      if (part == '시각만') {
        soundEnabled = false;
        continue;
      }
      final volumeMatch = RegExp(r'^소리\s+(\d+)%$').firstMatch(part);
      if (volumeMatch != null) {
        final volume = int.tryParse(volumeMatch.group(1) ?? '');
        if (volume == null || volume < 0 || volume > 100) {
          return null;
        }
        soundEnabled = true;
        volumePercent = volume;
        continue;
      }
      final mutedVolumeMatch = RegExp(r'^음량\s+(\d+)%$').firstMatch(part);
      if (mutedVolumeMatch != null) {
        final volume = int.tryParse(mutedVolumeMatch.group(1) ?? '');
        if (volume == null || volume < 0 || volume > 100) {
          return null;
        }
        volumePercent = volume;
        continue;
      }
      final countInMatch = RegExp(r'^카운트인\s+(\d+)마디$').firstMatch(part);
      if (countInMatch != null) {
        final bars = int.tryParse(countInMatch.group(1) ?? '');
        if (bars == null || bars < 0 || bars > 2) {
          return null;
        }
        countInBars = bars;
        continue;
      }
      if (part == '강세 끔') {
        accentEnabled = false;
        continue;
      }
      if (part == '강세 없음') {
        accentEnabled = true;
        accentBeatIndexes = const <int>[];
        continue;
      }
      final accentMatch = RegExp(r'^강세\s+([\d,\s]+)$').firstMatch(part);
      if (accentMatch != null) {
        final indexes = <int>{};
        for (final rawBeat in accentMatch.group(1)!.split(',')) {
          final beat = int.tryParse(rawBeat.trim());
          if (beat == null || beat < 1 || beat > meter.beatsPerBar) {
            return null;
          }
          indexes.add(beat - 1);
        }
        if (indexes.isEmpty) {
          return null;
        }
        accentEnabled = true;
        accentBeatIndexes = indexes.toList()..sort();
        continue;
      }
      if (part.startsWith('소리') ||
          part.startsWith('음량') ||
          part.startsWith('카운트인') ||
          part.startsWith('강세')) {
        return null;
      }
    }

    return SheetMetronomeSettings(
      bpm: bpm,
      meter: meter,
      soundEnabled: soundEnabled,
      accentEnabled: accentEnabled,
      subdivision: subdivision,
      countInBars: countInBars,
      volumePercent: volumePercent,
      accentBeatIndexes: List<int>.unmodifiable(accentBeatIndexes),
    );
  }

  static SheetMetronomeMeter? _meterForLabel(String label) {
    for (final meter in SheetMetronomeMeter.values) {
      if (meter.label == label) {
        return meter;
      }
    }
    return null;
  }

  static SheetMetronomeSubdivision? _subdivisionForLabel(String label) {
    for (final subdivision in SheetMetronomeSubdivision.values.skip(1)) {
      if (subdivision.label == label) {
        return subdivision;
      }
    }
    return null;
  }

  static bool _sameIndexes(List<int> left, List<int> right) {
    if (left.length != right.length) {
      return false;
    }
    for (var index = 0; index < left.length; index += 1) {
      if (left[index] != right[index]) {
        return false;
      }
    }
    return true;
  }
}

class SheetSetlistShareManifest {
  const SheetSetlistShareManifest({
    required this.title,
    required this.expectedScoreCount,
    required this.items,
    this.totalDurationLabel = '',
    this.transitionLabel = '',
    this.warnings = const <String>[],
  });

  final String title;
  final int expectedScoreCount;
  final String totalDurationLabel;
  final String transitionLabel;
  final List<SheetSetlistShareItem> items;
  final List<String> warnings;

  bool get hasCountMismatch => expectedScoreCount != items.length;

  bool get canPreviewImport {
    return title.trim().isNotEmpty && items.isNotEmpty && !hasCountMismatch;
  }

  static SheetSetlistShareManifest? tryParse(String text) {
    final lines = text.replaceAll('\r\n', '\n').split('\n');
    final firstContent = lines
        .map((line) => line.trim())
        .firstWhere((line) => line.isNotEmpty, orElse: () => '');
    if (firstContent != 'Clef & Staff 세트리스트') {
      return null;
    }

    var title = '';
    var expectedCount = 0;
    var totalDurationLabel = '';
    var transitionLabel = '';
    final items = <SheetSetlistShareItem>[];
    final warnings = <String>[];
    var currentDetails = <String, String>{};
    String? currentTitle;

    void flushCurrentItem() {
      final itemTitle = currentTitle?.trim();
      if (itemTitle == null || itemTitle.isEmpty) {
        return;
      }
      items.add(
        SheetSetlistShareItem(
          title: itemTitle,
          details: Map<String, String>.unmodifiable(currentDetails),
        ),
      );
      currentTitle = null;
      currentDetails = <String, String>{};
    }

    for (final rawLine in lines.skip(1)) {
      final line = rawLine.trimRight();
      final trimmed = line.trim();
      if (trimmed.isEmpty) {
        continue;
      }
      final itemMatch = RegExp(r'^(\d+)\.\s+(.+)$').firstMatch(trimmed);
      if (itemMatch != null) {
        flushCurrentItem();
        currentTitle = itemMatch.group(2)?.trim() ?? '';
        continue;
      }
      if (currentTitle != null && rawLine.startsWith('   ')) {
        final separator = trimmed.indexOf(':');
        if (separator <= 0) {
          warnings.add('읽을 수 없는 항목 세부 정보: $trimmed');
          continue;
        }
        final key = trimmed.substring(0, separator).trim();
        final value = trimmed.substring(separator + 1).trim();
        if (key.isNotEmpty && value.isNotEmpty) {
          currentDetails[key] = value;
        }
        continue;
      }
      if (trimmed.startsWith('제목:')) {
        title = trimmed.substring('제목:'.length).trim();
        continue;
      }
      if (trimmed.startsWith('곡 수:')) {
        final countMatch = RegExp(r'곡 수:\s*(\d+)곡').firstMatch(trimmed);
        expectedCount = int.tryParse(countMatch?.group(1) ?? '') ?? 0;
        final durationMatch = RegExp(r'총\s+(.+)$').firstMatch(trimmed);
        totalDurationLabel = durationMatch?.group(1)?.trim() ?? '';
        continue;
      }
      if (trimmed.startsWith('전환 ')) {
        transitionLabel = trimmed.substring('전환 '.length).trim();
        continue;
      }
      warnings.add('읽을 수 없는 줄: $trimmed');
    }
    flushCurrentItem();

    if (title.isEmpty) {
      warnings.add('세트리스트 제목이 없습니다.');
    }
    if (expectedCount != items.length) {
      warnings.add('곡 수와 항목 수가 다릅니다.');
    }
    return SheetSetlistShareManifest(
      title: title,
      expectedScoreCount: expectedCount,
      totalDurationLabel: totalDurationLabel,
      transitionLabel: transitionLabel,
      items: List<SheetSetlistShareItem>.unmodifiable(items),
      warnings: List<String>.unmodifiable(warnings),
    );
  }

  SheetSetlistManifestMatchPreview matchScores(List<SheetScore> scores) {
    return SheetSetlistManifestMatchPreview(
      manifest: this,
      matches: items
          .map((item) => SheetSetlistManifestMatch.resolve(item, scores))
          .toList(growable: false),
    );
  }
}

class SheetSetlistShareItem {
  const SheetSetlistShareItem({required this.title, required this.details});

  final String title;
  final Map<String, String> details;

  String get fileName => details['파일'] ?? '';
  String get composer => details['작곡가'] ?? '';
  String get startPageLabel => details['시작'] ?? '';
  String get setlistNote => details['세트 메모'] ?? '';
}

class SheetSetlistManifestMatchPreview {
  const SheetSetlistManifestMatchPreview({
    required this.manifest,
    required this.matches,
  });

  final SheetSetlistShareManifest manifest;
  final List<SheetSetlistManifestMatch> matches;

  bool get canCreateSetlist {
    return manifest.canPreviewImport &&
        matches.isNotEmpty &&
        matches.every((match) => match.isResolved);
  }

  List<SheetSetlistManifestMatch> get missingMatches {
    return matches
        .where((match) => match.kind == SheetSetlistManifestMatchKind.missing)
        .toList(growable: false);
  }

  List<SheetSetlistManifestMatch> get ambiguousMatches {
    return matches
        .where((match) => match.kind == SheetSetlistManifestMatchKind.ambiguous)
        .toList(growable: false);
  }

  List<String> get matchedScoreIds {
    return matches
        .map((match) => match.score?.id)
        .whereType<String>()
        .toList(growable: false);
  }

  List<String> get warnings {
    return <String>[
      ...manifest.warnings,
      for (final match in missingMatches)
        '라이브러리에서 찾을 수 없는 곡: ${match.item.title}',
      for (final match in ambiguousMatches)
        '여러 악보와 일치하는 곡: ${match.item.title}',
    ];
  }

  SheetSetlist? toSetlistDraft({required String id, required DateTime now}) {
    if (!canCreateSetlist) {
      return null;
    }
    final scoreIds = matchedScoreIds;
    return SheetSetlist(
      id: id,
      title: manifest.title.trim(),
      scoreIds: scoreIds,
      createdAt: now,
      updatedAt: now,
      scoreStartPages: Map<String, int>.unmodifiable(
        _matchedIntDetails((item) => _parsePageNumber(item.startPageLabel)),
      ),
      scoreNotes: Map<String, String>.unmodifiable(
        _matchedStringDetails((item) => item.setlistNote.trim()),
      ),
      scoreDurations: Map<String, int>.unmodifiable(
        _matchedIntDetails(
          (item) => _parseDurationSeconds(item.details['예상 시간'] ?? ''),
        ),
      ),
      scoreMetronomeSettings: Map<String, SheetMetronomeSettings>.unmodifiable(
        _matchedMetronomeSettings(),
      ),
      transitionSeconds: _parseDurationSeconds(manifest.transitionLabel),
    );
  }

  Map<String, int> _matchedIntDetails(
    int Function(SheetSetlistShareItem item) valueFor,
  ) {
    return <String, int>{
      for (final match in matches)
        if (match.score != null && valueFor(match.item) > 0)
          match.score!.id: valueFor(match.item),
    };
  }

  Map<String, String> _matchedStringDetails(
    String Function(SheetSetlistShareItem item) valueFor,
  ) {
    return <String, String>{
      for (final match in matches)
        if (match.score != null && valueFor(match.item).isNotEmpty)
          match.score!.id: valueFor(match.item),
    };
  }

  Map<String, SheetMetronomeSettings> _matchedMetronomeSettings() {
    final result = <String, SheetMetronomeSettings>{};
    for (final match in matches) {
      final score = match.score;
      if (score == null) {
        continue;
      }
      final settings = SheetSetlistManifestMetronomeCodec.tryDecode(
        match.item.details['메트로놈'] ?? '',
      );
      if (settings != null) {
        result[score.id] = settings;
      }
    }
    return result;
  }
}

enum SheetSetlistManifestMatchKind {
  fileName,
  titleAndComposer,
  title,
  missing,
  ambiguous,
}

class SheetSetlistManifestMatch {
  const SheetSetlistManifestMatch({
    required this.item,
    required this.kind,
    this.score,
    this.candidates = const <SheetScore>[],
  });

  final SheetSetlistShareItem item;
  final SheetSetlistManifestMatchKind kind;
  final SheetScore? score;
  final List<SheetScore> candidates;

  bool get isResolved => score != null && candidates.length == 1;

  static SheetSetlistManifestMatch resolve(
    SheetSetlistShareItem item,
    List<SheetScore> scores,
  ) {
    final fileName = _normalizeLookup(item.fileName);
    if (fileName.isNotEmpty) {
      final byFile = _uniqueMatch(
        item,
        scores,
        SheetSetlistManifestMatchKind.fileName,
        (score) {
          final fileKeys = <String>{
            _normalizeLookup(score.sourceFileDisplayName),
            _normalizeLookup(_fileStem(score.filePath)),
            _normalizeLookup(_fileName(score.filePath)),
          }..remove('');
          return fileKeys.contains(fileName);
        },
      );
      if (byFile != null) {
        return byFile;
      }
    }

    final title = _normalizeLookup(item.title);
    final composer = _normalizeLookup(item.composer);
    if (title.isNotEmpty && composer.isNotEmpty) {
      final byTitleAndComposer = _uniqueMatch(
        item,
        scores,
        SheetSetlistManifestMatchKind.titleAndComposer,
        (score) =>
            _normalizeLookup(score.displayTitle) == title &&
            _normalizeLookup(score.composer) == composer,
      );
      if (byTitleAndComposer != null) {
        return byTitleAndComposer;
      }
    }

    if (title.isNotEmpty) {
      final byTitle = _uniqueMatch(
        item,
        scores,
        SheetSetlistManifestMatchKind.title,
        (score) => _normalizeLookup(score.displayTitle) == title,
      );
      if (byTitle != null) {
        return byTitle;
      }
    }

    return SheetSetlistManifestMatch(
      item: item,
      kind: SheetSetlistManifestMatchKind.missing,
    );
  }

  static SheetSetlistManifestMatch? _uniqueMatch(
    SheetSetlistShareItem item,
    List<SheetScore> scores,
    SheetSetlistManifestMatchKind kind,
    bool Function(SheetScore score) predicate,
  ) {
    final candidates = scores.where(predicate).toList(growable: false);
    if (candidates.isEmpty) {
      return null;
    }
    if (candidates.length == 1) {
      return SheetSetlistManifestMatch(
        item: item,
        kind: kind,
        score: candidates.single,
        candidates: candidates,
      );
    }
    return SheetSetlistManifestMatch(
      item: item,
      kind: SheetSetlistManifestMatchKind.ambiguous,
      candidates: candidates,
    );
  }
}

String _normalizeLookup(String value) {
  return value.trim().replaceAll(RegExp(r'\s+'), ' ').toLowerCase();
}

String _fileName(String path) {
  return path.trim().replaceAll('\\', '/').split('/').last.trim();
}

String _fileStem(String path) {
  return _fileName(path).replaceFirst(RegExp(r'\.[^.]+$'), '').trim();
}

int _parsePageNumber(String value) {
  final match = RegExp(r'(\d+)').firstMatch(value);
  return int.tryParse(match?.group(1) ?? '') ?? 0;
}

int _parseDurationSeconds(String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) {
    return 0;
  }
  var seconds = 0;
  for (final match in RegExp(r'(\d+)\s*(시간|분|초)').allMatches(trimmed)) {
    final amount = int.tryParse(match.group(1) ?? '') ?? 0;
    switch (match.group(2)) {
      case '시간':
        seconds += amount * 3600;
      case '분':
        seconds += amount * 60;
      case '초':
        seconds += amount;
    }
  }
  return seconds;
}
