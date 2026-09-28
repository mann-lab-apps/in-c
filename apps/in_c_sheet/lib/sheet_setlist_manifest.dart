import 'sheet_score.dart';

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
