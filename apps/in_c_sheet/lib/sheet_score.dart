import 'dart:convert';

import 'sheet_annotation.dart';
import 'sheet_auto_scroll.dart';

Map<String, Object?>? _asJsonMap(Object? value) {
  if (value is! Map) {
    return null;
  }
  return value.map(
    (key, mapValue) => MapEntry(key.toString(), mapValue as Object?),
  );
}

class SheetBookmark {
  const SheetBookmark({
    required this.pageNumber,
    required this.label,
    required this.createdAt,
  });

  factory SheetBookmark.fromJson(Map<String, Object?> json) {
    final pageNumber = json['pageNumber'] as int? ?? 1;
    return SheetBookmark(
      pageNumber: pageNumber < 1 ? 1 : pageNumber,
      label: json['label'] as String? ?? '$pageNumber쪽',
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  final int pageNumber;
  final String label;
  final DateTime createdAt;

  SheetBookmark copyWith({
    int? pageNumber,
    String? label,
    DateTime? createdAt,
  }) {
    return SheetBookmark(
      pageNumber: pageNumber ?? this.pageNumber,
      label: label ?? this.label,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'pageNumber': pageNumber,
      'label': label,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

class SheetViewerSettings {
  const SheetViewerSettings({
    required this.displayMode,
    required this.halfPageTurn,
    this.displayEffect = normalDisplayEffect,
  });

  factory SheetViewerSettings.fromJson(Map<String, Object?>? json) {
    return SheetViewerSettings(
      displayMode:
          json?['displayMode'] as String? ?? defaultSettings.displayMode,
      halfPageTurn:
          json?['halfPageTurn'] as bool? ?? defaultSettings.halfPageTurn,
      displayEffect:
          json?['displayEffect'] as String? ?? defaultSettings.displayEffect,
    );
  }

  static const normalDisplayEffect = 'normal';

  static const defaultSettings = SheetViewerSettings(
    displayMode: 'auto',
    halfPageTurn: false,
  );

  final String displayMode;
  final bool halfPageTurn;
  final String displayEffect;

  SheetViewerSettings copyWith({
    String? displayMode,
    bool? halfPageTurn,
    String? displayEffect,
  }) {
    return SheetViewerSettings(
      displayMode: displayMode ?? this.displayMode,
      halfPageTurn: halfPageTurn ?? this.halfPageTurn,
      displayEffect: displayEffect ?? this.displayEffect,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'displayMode': displayMode,
      'halfPageTurn': halfPageTurn,
      'displayEffect': displayEffect,
    };
  }
}

class SheetCropSettings {
  const SheetCropSettings({
    this.left = 0,
    this.top = 0,
    this.right = 0,
    this.bottom = 0,
  });

  factory SheetCropSettings.fromJson(Map<String, Object?>? json) {
    return SheetCropSettings(
      left: _normalizeMargin(json?['left']),
      top: _normalizeMargin(json?['top']),
      right: _normalizeMargin(json?['right']),
      bottom: _normalizeMargin(json?['bottom']),
    ).normalized();
  }

  static const none = SheetCropSettings();

  final double left;
  final double top;
  final double right;
  final double bottom;

  bool get hasCrop => left > 0 || top > 0 || right > 0 || bottom > 0;

  SheetCropSettings copyWith({
    double? left,
    double? top,
    double? right,
    double? bottom,
  }) {
    return SheetCropSettings(
      left: left ?? this.left,
      top: top ?? this.top,
      right: right ?? this.right,
      bottom: bottom ?? this.bottom,
    ).normalized();
  }

  SheetCropSettings normalized() {
    var nextLeft = _normalizeMargin(left);
    var nextRight = _normalizeMargin(right);
    var nextTop = _normalizeMargin(top);
    var nextBottom = _normalizeMargin(bottom);

    final horizontalTotal = nextLeft + nextRight;
    if (horizontalTotal > 0.8) {
      final scale = 0.8 / horizontalTotal;
      nextLeft *= scale;
      nextRight *= scale;
    }

    final verticalTotal = nextTop + nextBottom;
    if (verticalTotal > 0.8) {
      final scale = 0.8 / verticalTotal;
      nextTop *= scale;
      nextBottom *= scale;
    }

    return SheetCropSettings(
      left: nextLeft,
      top: nextTop,
      right: nextRight,
      bottom: nextBottom,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'left': left,
      'top': top,
      'right': right,
      'bottom': bottom,
    };
  }

  static double _normalizeMargin(Object? value) {
    final margin = value is num ? value.toDouble() : 0.0;
    return margin.clamp(0.0, 0.5).toDouble();
  }
}

class SheetPageSettings {
  const SheetPageSettings({
    required this.hiddenPages,
    required this.pageRotations,
    this.crop = SheetCropSettings.none,
  });

  factory SheetPageSettings.fromJson(Map<String, Object?>? json) {
    return SheetPageSettings(
      hiddenPages: _normalizePages(json?['hiddenPages']),
      pageRotations: _normalizeRotations(json?['pageRotations']),
      crop: SheetCropSettings.fromJson(_asJsonMap(json?['crop'])),
    );
  }

  static const empty = SheetPageSettings(
    hiddenPages: <int>[],
    pageRotations: <int, int>{},
  );

  final List<int> hiddenPages;
  final Map<int, int> pageRotations;
  final SheetCropSettings crop;

  bool isHidden(int pageNumber) => hiddenPages.contains(pageNumber);

  bool canHidePage(int pageNumber, int pageCount) {
    if (pageNumber < 1 || pageNumber > pageCount) {
      return false;
    }
    return hiddenPages.length < pageCount - 1 || isHidden(pageNumber);
  }

  int? nextVisiblePage({
    required int fromPage,
    required int delta,
    required int pageCount,
  }) {
    if (delta == 0 || pageCount < 1) {
      return null;
    }

    var candidate = fromPage + delta;
    while (candidate >= 1 && candidate <= pageCount) {
      if (!isHidden(candidate)) {
        return candidate;
      }
      candidate += delta;
    }
    return null;
  }

  int closestVisiblePage({required int fromPage, required int pageCount}) {
    if (pageCount < 1 || !isHidden(fromPage)) {
      return fromPage.clamp(1, pageCount).toInt();
    }

    final next = nextVisiblePage(
      fromPage: fromPage,
      delta: 1,
      pageCount: pageCount,
    );
    if (next != null) {
      return next;
    }

    return nextVisiblePage(
          fromPage: fromPage,
          delta: -1,
          pageCount: pageCount,
        ) ??
        fromPage.clamp(1, pageCount).toInt();
  }

  SheetPageSettings hidePage(int pageNumber, int pageCount) {
    if (!canHidePage(pageNumber, pageCount) || isHidden(pageNumber)) {
      return this;
    }
    final next = <int>{...hiddenPages, pageNumber}.toList()..sort();
    return copyWith(hiddenPages: List<int>.unmodifiable(next));
  }

  SheetPageSettings unhidePage(int pageNumber) {
    if (!isHidden(pageNumber)) {
      return this;
    }
    return copyWith(
      hiddenPages: List<int>.unmodifiable(
        hiddenPages.where((page) => page != pageNumber).toList(),
      ),
    );
  }

  SheetPageSettings rotatePageClockwise(int pageNumber) {
    if (pageNumber < 1) {
      return this;
    }

    final current = pageRotations[pageNumber] ?? 0;
    final nextDegrees = (current + 90) % 360;
    final nextRotations = Map<int, int>.of(pageRotations);
    if (nextDegrees == 0) {
      nextRotations.remove(pageNumber);
    } else {
      nextRotations[pageNumber] = nextDegrees;
    }
    return copyWith(pageRotations: Map<int, int>.unmodifiable(nextRotations));
  }

  SheetPageSettings copyWith({
    List<int>? hiddenPages,
    Map<int, int>? pageRotations,
    SheetCropSettings? crop,
  }) {
    return SheetPageSettings(
      hiddenPages: hiddenPages ?? this.hiddenPages,
      pageRotations: pageRotations ?? this.pageRotations,
      crop: crop ?? this.crop,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'hiddenPages': hiddenPages,
      'pageRotations': pageRotations.map(
        (page, degrees) => MapEntry(page.toString(), degrees),
      ),
      'crop': crop.toJson(),
    };
  }

  static List<int> _normalizePages(Object? value) {
    final pages =
        (value as List<dynamic>? ?? const <dynamic>[])
            .whereType<int>()
            .where((page) => page > 0)
            .toSet()
            .toList()
          ..sort();
    return List<int>.unmodifiable(pages);
  }

  static Map<int, int> _normalizeRotations(Object? value) {
    final rotations = <int, int>{};
    if (value is Map) {
      for (final entry in value.entries) {
        final page = int.tryParse(entry.key.toString());
        final rawDegrees = entry.value;
        final degrees = rawDegrees is int
            ? rawDegrees
            : int.tryParse(rawDegrees.toString());
        if (page == null || page < 1 || degrees == null) {
          continue;
        }
        final normalized = degrees % 360;
        if (normalized == 90 || normalized == 180 || normalized == 270) {
          rotations[page] = normalized;
        }
      }
    }
    return Map<int, int>.unmodifiable(rotations);
  }
}

class SheetPdfLinkSanitization {
  const SheetPdfLinkSanitization({
    required this.sanitizedFromPath,
    required this.removedUrlLinkCount,
    required this.createdAt,
  });

  factory SheetPdfLinkSanitization.fromJson(Map<String, Object?>? json) {
    if (json == null) {
      return empty;
    }

    final sanitizedFromPath = json['sanitizedFromPath'] as String? ?? '';
    final createdAt = json['createdAt'] is String
        ? DateTime.tryParse(json['createdAt'] as String)
        : null;
    if (sanitizedFromPath.isEmpty || createdAt == null) {
      return empty;
    }

    return SheetPdfLinkSanitization(
      sanitizedFromPath: sanitizedFromPath,
      removedUrlLinkCount: json['removedUrlLinkCount'] as int? ?? 0,
      createdAt: createdAt,
    );
  }

  static const empty = SheetPdfLinkSanitization(
    sanitizedFromPath: '',
    removedUrlLinkCount: 0,
    createdAt: null,
  );

  final String sanitizedFromPath;
  final int removedUrlLinkCount;
  final DateTime? createdAt;

  bool get hasSanitizedCopy => sanitizedFromPath.isNotEmpty;

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'sanitizedFromPath': sanitizedFromPath,
      'removedUrlLinkCount': removedUrlLinkCount,
      'createdAt': createdAt?.toIso8601String(),
    };
  }
}

class SheetScore {
  const SheetScore({
    required this.id,
    required this.title,
    required this.composer,
    required this.tags,
    required this.note,
    required this.filePath,
    required this.importedAt,
    required this.updatedAt,
    required this.lastOpenedAt,
    required this.lastPage,
    required this.isFavorite,
    required this.bookmarks,
    this.viewerSettings = SheetViewerSettings.defaultSettings,
    this.pageSettings = SheetPageSettings.empty,
    this.annotationLayer = SheetAnnotationLayer.empty,
    this.pdfLinkSanitization = SheetPdfLinkSanitization.empty,
    this.autoScrollSettings = SheetAutoScrollSettings.defaultSettings,
  });

  factory SheetScore.fromJson(Map<String, Object?> json) {
    return SheetScore(
      id: json['id'] as String,
      title: json['title'] as String? ?? 'Untitled score',
      composer: json['composer'] as String? ?? '',
      tags: (json['tags'] as List<dynamic>? ?? const <dynamic>[])
          .whereType<String>()
          .toList(growable: false),
      note: json['note'] as String? ?? '',
      filePath: json['filePath'] as String,
      importedAt: DateTime.parse(json['importedAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      lastOpenedAt: _parseOptionalDate(json['lastOpenedAt']),
      lastPage: json['lastPage'] as int? ?? 1,
      isFavorite: json['isFavorite'] as bool? ?? false,
      bookmarks: _parseBookmarks(json['bookmarks']),
      viewerSettings: SheetViewerSettings.fromJson(
        _asJsonMap(json['viewerSettings']),
      ),
      pageSettings: SheetPageSettings.fromJson(
        _asJsonMap(json['pageSettings']),
      ),
      annotationLayer: SheetAnnotationLayer.fromJson(
        _asJsonMap(json['annotationLayer']),
      ),
      pdfLinkSanitization: SheetPdfLinkSanitization.fromJson(
        _asJsonMap(json['pdfLinkSanitization']),
      ),
      autoScrollSettings: SheetAutoScrollSettings.fromJson(
        _asJsonMap(json['autoScrollSettings']),
      ),
    );
  }

  static List<SheetScore> decodeList(String? value) {
    if (value == null || value.trim().isEmpty) {
      return const <SheetScore>[];
    }

    return decodeJsonList(jsonDecode(value));
  }

  static List<SheetScore> decodeJsonList(Object? value) {
    final decoded = value as List<dynamic>? ?? const <dynamic>[];
    return decoded
        .whereType<Map<String, Object?>>()
        .map(SheetScore.fromJson)
        .toList(growable: false);
  }

  static String encodeList(List<SheetScore> scores) {
    return jsonEncode(scores.map((score) => score.toJson()).toList());
  }

  final String id;
  final String title;
  final String composer;
  final List<String> tags;
  final String note;
  final String filePath;
  final DateTime importedAt;
  final DateTime updatedAt;
  final DateTime? lastOpenedAt;
  final int lastPage;
  final bool isFavorite;
  final List<SheetBookmark> bookmarks;
  final SheetViewerSettings viewerSettings;
  final SheetPageSettings pageSettings;
  final SheetAnnotationLayer annotationLayer;
  final SheetPdfLinkSanitization pdfLinkSanitization;
  final SheetAutoScrollSettings autoScrollSettings;

  bool matches(String query) {
    final normalized = query.trim().toLowerCase();
    if (normalized.isEmpty) {
      return true;
    }

    return title.toLowerCase().contains(normalized) ||
        composer.toLowerCase().contains(normalized) ||
        tags.any((tag) => tag.toLowerCase().contains(normalized)) ||
        note.toLowerCase().contains(normalized);
  }

  SheetScore copyWith({
    String? title,
    String? composer,
    List<String>? tags,
    String? note,
    String? filePath,
    DateTime? updatedAt,
    DateTime? lastOpenedAt,
    int? lastPage,
    bool? isFavorite,
    List<SheetBookmark>? bookmarks,
    SheetViewerSettings? viewerSettings,
    SheetPageSettings? pageSettings,
    SheetAnnotationLayer? annotationLayer,
    SheetPdfLinkSanitization? pdfLinkSanitization,
    SheetAutoScrollSettings? autoScrollSettings,
  }) {
    return SheetScore(
      id: id,
      title: title ?? this.title,
      composer: composer ?? this.composer,
      tags: tags ?? this.tags,
      note: note ?? this.note,
      filePath: filePath ?? this.filePath,
      importedAt: importedAt,
      updatedAt: updatedAt ?? this.updatedAt,
      lastOpenedAt: lastOpenedAt ?? this.lastOpenedAt,
      lastPage: lastPage ?? this.lastPage,
      isFavorite: isFavorite ?? this.isFavorite,
      bookmarks: bookmarks ?? this.bookmarks,
      viewerSettings: viewerSettings ?? this.viewerSettings,
      pageSettings: pageSettings ?? this.pageSettings,
      annotationLayer: annotationLayer ?? this.annotationLayer,
      pdfLinkSanitization: pdfLinkSanitization ?? this.pdfLinkSanitization,
      autoScrollSettings: autoScrollSettings ?? this.autoScrollSettings,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': id,
      'title': title,
      'composer': composer,
      'tags': tags,
      'note': note,
      'filePath': filePath,
      'importedAt': importedAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'lastOpenedAt': lastOpenedAt?.toIso8601String(),
      'lastPage': lastPage,
      'isFavorite': isFavorite,
      'bookmarks': bookmarks.map((bookmark) => bookmark.toJson()).toList(),
      'viewerSettings': viewerSettings.toJson(),
      'pageSettings': pageSettings.toJson(),
      'annotationLayer': annotationLayer.toJson(),
      'pdfLinkSanitization': pdfLinkSanitization.toJson(),
      'autoScrollSettings': autoScrollSettings.toJson(),
    };
  }

  static List<SheetBookmark> _parseBookmarks(Object? value) {
    final bookmarks = (value as List<dynamic>? ?? const <dynamic>[])
        .whereType<Map<String, Object?>>()
        .map(SheetBookmark.fromJson)
        .toList();
    bookmarks.sort((a, b) => a.pageNumber.compareTo(b.pageNumber));
    return List<SheetBookmark>.unmodifiable(bookmarks);
  }

  static DateTime? _parseOptionalDate(Object? value) {
    if (value is! String || value.isEmpty) {
      return null;
    }
    return DateTime.tryParse(value);
  }

  static Map<String, Object?>? _asJsonMap(Object? value) {
    if (value is! Map) {
      return null;
    }
    return value.map(
      (key, mapValue) => MapEntry(key.toString(), mapValue as Object?),
    );
  }
}
