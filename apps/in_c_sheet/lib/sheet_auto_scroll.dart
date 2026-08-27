import 'dart:convert';
import 'dart:math' as math;

class SheetAutoScrollSettings {
  const SheetAutoScrollSettings({
    required this.durationSeconds,
    required this.startPage,
    required this.endPage,
    this.cueSeconds = 0,
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

  SheetAutoScrollSettings copyWith({
    int? durationSeconds,
    int? startPage,
    int? endPage,
    int? cueSeconds,
  }) {
    return SheetAutoScrollSettings(
      durationSeconds: clampDurationSeconds(
        durationSeconds ?? this.durationSeconds,
      ),
      startPage: _positivePage(startPage ?? this.startPage),
      endPage: _nonNegativePage(endPage ?? this.endPage),
      cueSeconds: clampCueSeconds(cueSeconds ?? this.cueSeconds),
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
    };
  }

  static int clampDurationSeconds(int value) {
    return value.clamp(30, 3600).toInt();
  }

  static int clampCueSeconds(int value) {
    return value.clamp(0, 30).toInt();
  }

  static int _positivePage(int value) => math.max(1, value);

  static int _nonNegativePage(int value) => math.max(0, value);

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

class SheetAutoScrollPlan {
  const SheetAutoScrollPlan({
    required this.durationSeconds,
    required this.startPage,
    required this.endPage,
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

    return SheetAutoScrollPlan(
      durationSeconds: settings.durationSeconds,
      startPage: startPage,
      endPage: endPage,
    );
  }

  final int durationSeconds;
  final int startPage;
  final int endPage;

  double progressForElapsed(Duration elapsed) {
    if (durationSeconds <= 0) {
      return 1;
    }
    return (elapsed.inMilliseconds / (durationSeconds * 1000)).clamp(0.0, 1.0);
  }

  int pageForProgress(double progress) {
    final clamped = progress.clamp(0.0, 1.0).toDouble();
    final pageSpan = endPage - startPage;
    if (pageSpan <= 0) {
      return startPage;
    }
    return (startPage + (pageSpan * clamped)).round().clamp(startPage, endPage);
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
