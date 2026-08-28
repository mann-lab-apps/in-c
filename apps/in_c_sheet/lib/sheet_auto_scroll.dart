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
    this.pageDurations = const <int, int>{},
    this.cuePoints = const <SheetAutoScrollCuePoint>[],
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
      pageDurations: _normalizePageDurations(json?['pageDurations']),
      cuePoints: _normalizeCuePoints(json?['cuePoints']),
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
  final Map<int, int> pageDurations;
  final List<SheetAutoScrollCuePoint> cuePoints;

  SheetAutoScrollSettings copyWith({
    int? durationSeconds,
    int? startPage,
    int? endPage,
    int? cueSeconds,
    List<int>? pausePageNumbers,
    List<SheetAutoScrollRepeatSection>? repeatSections,
    Map<int, int>? pageDurations,
    List<SheetAutoScrollCuePoint>? cuePoints,
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
      pageDurations: _normalizePageDurations(
        pageDurations ?? this.pageDurations,
      ),
      cuePoints: _normalizeCuePoints(cuePoints ?? this.cuePoints),
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
      'pageDurations': pageDurations.map(
        (page, seconds) => MapEntry(page.toString(), seconds),
      ),
      'cuePoints': cuePoints.map((cue) => cue.toJson()).toList(growable: false),
    };
  }

  static int clampDurationSeconds(int value) {
    return value.clamp(30, 3600).toInt();
  }

  static int clampCueSeconds(int value) {
    return value.clamp(0, 30).toInt();
  }

  static int clampPageDurationSeconds(int value) {
    return value.clamp(10, 900).toInt();
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

  static Map<int, int> _normalizePageDurations(Object? value) {
    final durations = <int, int>{};
    if (value is Map) {
      for (final entry in value.entries) {
        final page = entry.key is num
            ? (entry.key as num).round()
            : int.tryParse('${entry.key}');
        final seconds = entry.value is num
            ? (entry.value as num).round()
            : int.tryParse('${entry.value}');
        if (page != null && page > 0 && seconds != null) {
          durations[page] = clampPageDurationSeconds(seconds);
        }
      }
    }
    final sortedEntries = durations.entries.toList()
      ..sort((a, b) => a.key.compareTo(b.key));
    return Map<int, int>.unmodifiable(<int, int>{
      for (final entry in sortedEntries) entry.key: entry.value,
    });
  }

  static List<SheetAutoScrollCuePoint> _normalizeCuePoints(Object? value) {
    if (value is! Iterable) {
      return const <SheetAutoScrollCuePoint>[];
    }
    final cues = <SheetAutoScrollCuePoint>[];
    for (final entry in value) {
      if (entry is SheetAutoScrollCuePoint) {
        if (entry.isValid) {
          cues.add(entry);
        }
      } else if (entry is Map) {
        final cue = SheetAutoScrollCuePoint.fromJson(
          entry.map(
            (key, mapValue) => MapEntry(key.toString(), mapValue as Object?),
          ),
        );
        if (cue.isValid) {
          cues.add(cue);
        }
      }
    }
    cues.sort((a, b) {
      final pageCompare = a.pageNumber.compareTo(b.pageNumber);
      if (pageCompare != 0) {
        return pageCompare;
      }
      return a.measureNumber.compareTo(b.measureNumber);
    });
    return List<SheetAutoScrollCuePoint>.unmodifiable(cues);
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

class SheetAutoScrollCuePoint {
  const SheetAutoScrollCuePoint({
    required this.pageNumber,
    this.measureNumber = 0,
    this.label = '',
  });

  factory SheetAutoScrollCuePoint.fromJson(Map<String, Object?> json) {
    return SheetAutoScrollCuePoint(
      pageNumber: SheetAutoScrollSettings._normalizeInt(
        json['pageNumber'],
        fallback: 1,
        clamp: SheetAutoScrollSettings._positivePage,
      ),
      measureNumber: SheetAutoScrollSettings._normalizeInt(
        json['measureNumber'],
        fallback: 0,
        clamp: SheetAutoScrollSettings._nonNegativePage,
      ),
      label: '${json['label'] ?? ''}'.trim(),
    );
  }

  final int pageNumber;
  final int measureNumber;
  final String label;

  bool get isValid => pageNumber > 0;

  SheetAutoScrollCuePoint copyWith({
    int? pageNumber,
    int? measureNumber,
    String? label,
  }) {
    return SheetAutoScrollCuePoint(
      pageNumber: SheetAutoScrollSettings._positivePage(
        pageNumber ?? this.pageNumber,
      ),
      measureNumber: SheetAutoScrollSettings._nonNegativePage(
        measureNumber ?? this.measureNumber,
      ),
      label: label ?? this.label,
    );
  }

  SheetAutoScrollCuePoint clampToRange(int startPage, int endPage) {
    return copyWith(pageNumber: pageNumber.clamp(startPage, endPage).toInt());
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'pageNumber': pageNumber,
      'measureNumber': measureNumber,
      'label': label,
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
    this.pageDurations = const <int, int>{},
    this.cuePoints = const <SheetAutoScrollCuePoint>[],
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
    final pageDurations = <int, int>{
      for (final entry in settings.pageDurations.entries)
        if (entry.key >= startPage && entry.key <= endPage)
          entry.key: entry.value,
    };
    final cuePoints = settings.cuePoints
        .where(
          (cue) =>
              cue.isValid &&
              cue.pageNumber >= startPage &&
              cue.pageNumber <= endPage,
        )
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
      pageDurations: Map<int, int>.unmodifiable(pageDurations),
      cuePoints: List<SheetAutoScrollCuePoint>.unmodifiable(cuePoints),
    );
  }

  final int durationSeconds;
  final int startPage;
  final int endPage;
  final List<int> pausePageNumbers;
  final List<SheetAutoScrollRepeatSection> repeatSections;
  final List<int> pageTimeline;
  final Map<int, int> pageDurations;
  final List<SheetAutoScrollCuePoint> cuePoints;

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
    final weights = _segmentWeightsFor(timeline, pageDurations);
    final totalWeight = weights.fold<double>(0, (sum, value) => sum + value);
    final targetWeight = clamped * totalWeight;
    var accumulated = 0.0;
    var index = 0;
    var segmentProgress = 0.0;
    for (var weightIndex = 0; weightIndex < weights.length; weightIndex += 1) {
      final weight = weights[weightIndex];
      if (targetWeight < accumulated + weight ||
          weightIndex == weights.length - 1) {
        index = weightIndex;
        segmentProgress = weight <= 0
            ? 0.0
            : ((targetWeight - accumulated) / weight)
                  .clamp(0.0, 1.0)
                  .toDouble();
        break;
      }
      accumulated += weight;
    }
    return SheetAutoScrollPathPosition(
      fromPage: timeline[index],
      toPage: timeline[index + 1],
      segmentProgress: segmentProgress,
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

  List<SheetAutoScrollCuePoint> cuePointsForProgress(
    double progress, {
    required Set<String> consumedCueKeys,
  }) {
    if (cuePoints.isEmpty) {
      return const <SheetAutoScrollCuePoint>[];
    }
    final page = pageForProgress(progress);
    return cuePoints
        .where(
          (cue) => cue.pageNumber <= page && !consumedCueKeys.contains(cue.key),
        )
        .toList(growable: false);
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

  static List<double> _segmentWeightsFor(
    List<int> timeline,
    Map<int, int> pageDurations,
  ) {
    return <double>[
      for (var index = 0; index < timeline.length - 1; index += 1)
        (pageDurations[timeline[index]] ?? 60).toDouble(),
    ];
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

extension SheetAutoScrollCuePointKey on SheetAutoScrollCuePoint {
  String get key => '$pageNumber:$measureNumber:$label';
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
