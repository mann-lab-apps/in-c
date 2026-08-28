import 'dart:convert';
import 'dart:math' as math;

class SheetAutoScrollSettings {
  const SheetAutoScrollSettings({
    required this.durationSeconds,
    required this.startPage,
    required this.endPage,
    this.cueSeconds = 0,
    this.pausePageNumbers = const <int>[],
    this.repeatSections = const <SheetAutoScrollRepeatSection>[],
  });

  factory SheetAutoScrollSettings.fromJson(Map<String, Object?>? json) {
    return SheetAutoScrollSettings(
      durationSeconds: _normalizeInt(
        json?['durationSeconds'],
        fallback: defaultSettings.durationSeconds,
        clamp: clampDurationSeconds,
      ),
      startPage: _normalizeInt(
        json?['startPage'],
        fallback: defaultSettings.startPage,
        clamp: _positivePage,
      ),
      endPage: _normalizeInt(
        json?['endPage'],
        fallback: 0,
        clamp: _nonNegativePage,
      ),
      cueSeconds: _normalizeInt(
        json?['cueSeconds'],
        fallback: 0,
        clamp: clampCueSeconds,
      ),
      pausePageNumbers: _normalizePageList(json?['pausePageNumbers']),
      repeatSections: _normalizeRepeatSections(json?['repeatSections']),
    );
  }

  static const defaultSettings = SheetAutoScrollSettings(
    durationSeconds: 240,
    startPage: 1,
    endPage: 0,
  );

  final int durationSeconds;
  final int startPage;
  final int endPage;
  final int cueSeconds;
  final List<int> pausePageNumbers;
  final List<SheetAutoScrollRepeatSection> repeatSections;

  SheetAutoScrollSettings copyWith({
    int? durationSeconds,
    int? startPage,
    int? endPage,
    int? cueSeconds,
    List<int>? pausePageNumbers,
    List<SheetAutoScrollRepeatSection>? repeatSections,
  }) {
    return SheetAutoScrollSettings(
      durationSeconds: clampDurationSeconds(
        durationSeconds ?? this.durationSeconds,
      ),
      startPage: _positivePage(startPage ?? this.startPage),
      endPage: _nonNegativePage(endPage ?? this.endPage),
      cueSeconds: clampCueSeconds(cueSeconds ?? this.cueSeconds),
      pausePageNumbers: _normalizePageList(
        pausePageNumbers ?? this.pausePageNumbers,
      ),
      repeatSections: _normalizeRepeatSections(
        repeatSections ?? this.repeatSections,
      ),
    );
  }

  SheetAutoScrollPlan plan({required int currentPage, required int pageCount}) {
    return SheetAutoScrollPlan.normalize(
      settings: this,
      currentPage: currentPage,
      pageCount: pageCount,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'durationSeconds': durationSeconds,
      'startPage': startPage,
      'endPage': endPage,
      'cueSeconds': cueSeconds,
      'pausePageNumbers': pausePageNumbers,
      'repeatSections': repeatSections
          .map((section) => section.toJson())
          .toList(growable: false),
    };
  }

  static int clampDurationSeconds(int value) {
    return value.clamp(30, 3600).toInt();
  }

  static int clampCueSeconds(int value) {
    return value.clamp(0, 30).toInt();
  }

  static int durationForBpmPreset({
    required int bpm,
    required int startPage,
    required int endPage,
    required int beatsPerPage,
  }) {
    final safeBpm = bpm.clamp(40, 240).toInt();
    final safeStartPage = _positivePage(startPage);
    final safeEndPage = math.max(safeStartPage, _positivePage(endPage));
    final safePageCount = safeEndPage - safeStartPage + 1;
    final safeBeatsPerPage = beatsPerPage.clamp(4, 512).toInt();
    final seconds = (safePageCount * safeBeatsPerPage * 60 / safeBpm).round();
    return clampDurationSeconds(seconds);
  }

  static int _positivePage(int value) => math.max(1, value);

  static int _nonNegativePage(int value) => math.max(0, value);

  static List<int> _normalizePageList(Object? value) {
    if (value is! Iterable) {
      return const <int>[];
    }
    final pages = <int>{};
    for (final entry in value) {
      final page = entry is num ? entry.round() : int.tryParse('$entry');
      if (page != null && page > 0) {
        pages.add(page);
      }
    }
    final sorted = pages.toList()..sort();
    return List<int>.unmodifiable(sorted);
  }

  static List<SheetAutoScrollRepeatSection> _normalizeRepeatSections(
    Object? value,
  ) {
    if (value is! Iterable) {
      return const <SheetAutoScrollRepeatSection>[];
    }
    final sections = <SheetAutoScrollRepeatSection>[];
    for (final entry in value) {
      if (entry is SheetAutoScrollRepeatSection) {
        if (entry.isValid) {
          sections.add(entry);
        }
      } else if (entry is Map) {
        final section = SheetAutoScrollRepeatSection.fromJson(
          entry.map(
            (key, mapValue) => MapEntry(key.toString(), mapValue as Object?),
          ),
        );
        if (section.isValid) {
          sections.add(section);
        }
      }
    }
    sections.sort((a, b) {
      final startCompare = a.startPage.compareTo(b.startPage);
      if (startCompare != 0) {
        return startCompare;
      }
      return a.endPage.compareTo(b.endPage);
    });
    return List<SheetAutoScrollRepeatSection>.unmodifiable(sections);
  }

  static int _normalizeInt(
    Object? value, {
    required int fallback,
    required int Function(int value) clamp,
  }) {
    if (value is num) {
      return clamp(value.round());
    }
    return clamp(int.tryParse(value?.toString() ?? '') ?? fallback);
  }
}

class SheetAutoScrollRepeatSection {
  const SheetAutoScrollRepeatSection({
    required this.startPage,
    required this.endPage,
    this.repeatCount = 1,
  });

  factory SheetAutoScrollRepeatSection.fromJson(Map<String, Object?> json) {
    final startPage = SheetAutoScrollSettings._normalizeInt(
      json['startPage'],
      fallback: 1,
      clamp: SheetAutoScrollSettings._positivePage,
    );
    var endPage = SheetAutoScrollSettings._normalizeInt(
      json['endPage'],
      fallback: startPage,
      clamp: SheetAutoScrollSettings._positivePage,
    );
    if (endPage < startPage) {
      endPage = startPage;
    }
    return SheetAutoScrollRepeatSection(
      startPage: startPage,
      endPage: endPage,
      repeatCount: SheetAutoScrollSettings._normalizeInt(
        json['repeatCount'],
        fallback: 1,
        clamp: (value) => value.clamp(1, 4).toInt(),
      ),
    );
  }

  final int startPage;
  final int endPage;
  final int repeatCount;

  bool get isValid => startPage > 0 && endPage >= startPage && repeatCount > 0;

  SheetAutoScrollRepeatSection clampToRange(int startPage, int endPage) {
    final clampedStart = this.startPage.clamp(startPage, endPage).toInt();
    final clampedEnd = this.endPage.clamp(clampedStart, endPage).toInt();
    return SheetAutoScrollRepeatSection(
      startPage: clampedStart,
      endPage: clampedEnd,
      repeatCount: repeatCount.clamp(1, 4).toInt(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'startPage': startPage,
      'endPage': endPage,
      'repeatCount': repeatCount,
    };
  }
}

class SheetAutoScrollPlan {
  const SheetAutoScrollPlan({
    required this.durationSeconds,
    required this.startPage,
    required this.endPage,
    this.pausePageNumbers = const <int>[],
    this.repeatSections = const <SheetAutoScrollRepeatSection>[],
    this.pageTimeline = const <int>[],
  });

  factory SheetAutoScrollPlan.normalize({
    required SheetAutoScrollSettings settings,
    required int currentPage,
    required int pageCount,
  }) {
    final safePageCount = math.max(1, pageCount);
    final requestedStartPage = settings.startPage <= 0
        ? currentPage
        : settings.startPage;
    final startPage = requestedStartPage.clamp(1, safePageCount).toInt();
    final requestedEndPage = settings.endPage <= 0
        ? safePageCount
        : settings.endPage;
    var endPage = requestedEndPage.clamp(1, safePageCount).toInt();
    if (endPage < startPage) {
      endPage = startPage;
    }

    final pausePageNumbers = settings.pausePageNumbers
        .where((page) => page > startPage && page <= endPage)
        .toList(growable: false);
    final repeatSections = settings.repeatSections
        .map((section) => section.clampToRange(startPage, endPage))
        .where((section) => section.isValid)
        .toList(growable: false);
    return SheetAutoScrollPlan(
      durationSeconds: settings.durationSeconds,
      startPage: startPage,
      endPage: endPage,
      pausePageNumbers: List<int>.unmodifiable(pausePageNumbers),
      repeatSections: List<SheetAutoScrollRepeatSection>.unmodifiable(
        repeatSections,
      ),
      pageTimeline: List<int>.unmodifiable(
        _buildPageTimeline(startPage, endPage, repeatSections),
      ),
    );
  }

  final int durationSeconds;
  final int startPage;
  final int endPage;
  final List<int> pausePageNumbers;
  final List<SheetAutoScrollRepeatSection> repeatSections;
  final List<int> pageTimeline;

  double progressForElapsed(Duration elapsed) {
    if (durationSeconds <= 0) {
      return 1;
    }
    return (elapsed.inMilliseconds / (durationSeconds * 1000)).clamp(0.0, 1.0);
  }

  int pageForProgress(double progress) {
    return positionForProgress(progress).targetPage;
  }

  SheetAutoScrollPathPosition positionForProgress(double progress) {
    final timeline = pageTimeline.isEmpty
        ? _buildPageTimeline(startPage, endPage, repeatSections)
        : pageTimeline;
    if (timeline.length <= 1) {
      return SheetAutoScrollPathPosition(
        fromPage: startPage,
        toPage: startPage,
        segmentProgress: 0,
      );
    }
    final clamped = progress.clamp(0.0, 1.0).toDouble();
    final scaled = clamped * (timeline.length - 1);
    final index = scaled.floor().clamp(0, timeline.length - 2).toInt();
    return SheetAutoScrollPathPosition(
      fromPage: timeline[index],
      toPage: timeline[index + 1],
      segmentProgress: scaled - index,
    );
  }

  int? pausePageForProgress(
    double progress, {
    required Set<int> consumedPageNumbers,
  }) {
    if (pausePageNumbers.isEmpty) {
      return null;
    }
    final page = pageForProgress(progress);
    if (page <= startPage) {
      return null;
    }
    for (final pausePage in pausePageNumbers) {
      if (pausePage <= page && !consumedPageNumbers.contains(pausePage)) {
        return pausePage;
      }
    }
    return null;
  }

  static List<int> _buildPageTimeline(
    int startPage,
    int endPage,
    List<SheetAutoScrollRepeatSection> repeatSections,
  ) {
    if (endPage <= startPage) {
      return <int>[startPage];
    }
    final repeatsByEndPage = <int, List<SheetAutoScrollRepeatSection>>{};
    for (final section in repeatSections) {
      repeatsByEndPage.putIfAbsent(section.endPage, () => []).add(section);
    }
    final pages = <int>[];
    for (var page = startPage; page <= endPage; page += 1) {
      pages.add(page);
      final sections =
          repeatsByEndPage[page] ?? const <SheetAutoScrollRepeatSection>[];
      for (final section in sections) {
        for (var repeat = 0; repeat < section.repeatCount; repeat += 1) {
          for (
            var repeatedPage = section.startPage;
            repeatedPage <= section.endPage;
            repeatedPage += 1
          ) {
            pages.add(repeatedPage);
          }
        }
      }
    }
    return pages;
  }
}

class SheetAutoScrollPathPosition {
  const SheetAutoScrollPathPosition({
    required this.fromPage,
    required this.toPage,
    required this.segmentProgress,
  });

  final int fromPage;
  final int toPage;
  final double segmentProgress;

  int get targetPage {
    if (segmentProgress < 0.5) {
      return fromPage;
    }
    return toPage;
  }
}

class SheetAutoScrollCodec {
  const SheetAutoScrollCodec._();

  static SheetAutoScrollSettings decode(String? value) {
    if (value == null || value.trim().isEmpty) {
      return SheetAutoScrollSettings.defaultSettings;
    }

    try {
      final decoded = jsonDecode(value);
      if (decoded is! Map) {
        return SheetAutoScrollSettings.defaultSettings;
      }
      return SheetAutoScrollSettings.fromJson(
        decoded.map(
          (key, mapValue) => MapEntry(key.toString(), mapValue as Object?),
        ),
      );
    } catch (_) {
      return SheetAutoScrollSettings.defaultSettings;
    }
  }

  static String encode(SheetAutoScrollSettings settings) {
    return jsonEncode(settings.toJson());
  }
}
