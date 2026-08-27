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

List<dynamic> _jsonList(Object? value) {
  return value is List ? value : const <dynamic>[];
}

int _intFromJson(Object? value, {required int fallback}) {
  if (value is num) {
    return value.round();
  }
  return int.tryParse(value?.toString() ?? '') ?? fallback;
}

String _stringFromJson(Object? value) {
  return value is String ? value : '';
}

String _requiredStringFromJson(Object? value, String fieldName) {
  final string = _stringFromJson(value).trim();
  if (string.isEmpty) {
    throw FormatException('$fieldName is required.');
  }
  return string;
}

String _fallbackStringFromJson(Object? value, String fallback) {
  final string = _stringFromJson(value).trim();
  return string.isEmpty ? fallback : string;
}

bool _boolFromJson(Object? value, {required bool fallback}) {
  return value is bool ? value : fallback;
}

DateTime _dateFromJson(Object? value, {DateTime? fallback}) {
  final parsed = DateTime.tryParse(_stringFromJson(value));
  return parsed ?? fallback ?? DateTime.fromMillisecondsSinceEpoch(0);
}

class SheetBookmark {
  const SheetBookmark({
    required this.pageNumber,
    required this.label,
    required this.createdAt,
  });

  factory SheetBookmark.fromJson(Map<String, Object?> json) {
    final pageNumber = _intFromJson(json['pageNumber'], fallback: 1);
    final normalizedPageNumber = pageNumber < 1 ? 1 : pageNumber;
    final label = _fallbackStringFromJson(
      json['label'],
      '$normalizedPageNumber쪽',
    );
    return SheetBookmark(
      pageNumber: normalizedPageNumber,
      label: label,
      createdAt: _dateFromJson(json['createdAt']),
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
    this.pageScale = fitPageScale,
    this.pedalMapping = standardPedalMapping,
    this.customPedalMapping = defaultCustomPedalMapping,
    this.renderProfile = balancedRenderProfile,
    this.pageTurnAnimation = naturalPageTurnAnimation,
    this.keepAwakeInPerformance = false,
    this.showPerformancePrepNotice = true,
    this.confirmSetlistTransition = true,
    this.autoAdvanceSetlist = false,
    this.allowPerformanceAnnotations = false,
    this.allowPerformanceMenus = false,
    this.allowPerformancePdfLinks = false,
  });

  factory SheetViewerSettings.fromJson(Map<String, Object?>? json) {
    return SheetViewerSettings(
      displayMode: _fallbackStringFromJson(
        json?['displayMode'],
        defaultSettings.displayMode,
      ),
      halfPageTurn: _boolFromJson(
        json?['halfPageTurn'],
        fallback: defaultSettings.halfPageTurn,
      ),
      displayEffect: _fallbackStringFromJson(
        json?['displayEffect'],
        defaultSettings.displayEffect,
      ),
      pageScale: _normalizePageScale(json?['pageScale']),
      pedalMapping: _normalizePedalMapping(json?['pedalMapping']),
      customPedalMapping: _normalizeCustomPedalMapping(
        json?['customPedalMapping'],
      ),
      renderProfile: _normalizeRenderProfile(json?['renderProfile']),
      pageTurnAnimation: _normalizePageTurnAnimation(
        json?['pageTurnAnimation'],
      ),
      keepAwakeInPerformance: _boolFromJson(
        json?['keepAwakeInPerformance'],
        fallback: defaultSettings.keepAwakeInPerformance,
      ),
      showPerformancePrepNotice: _boolFromJson(
        json?['showPerformancePrepNotice'],
        fallback: defaultSettings.showPerformancePrepNotice,
      ),
      confirmSetlistTransition: _boolFromJson(
        json?['confirmSetlistTransition'],
        fallback: defaultSettings.confirmSetlistTransition,
      ),
      autoAdvanceSetlist: _boolFromJson(
        json?['autoAdvanceSetlist'],
        fallback: defaultSettings.autoAdvanceSetlist,
      ),
      allowPerformanceAnnotations: _boolFromJson(
        json?['allowPerformanceAnnotations'],
        fallback: defaultSettings.allowPerformanceAnnotations,
      ),
      allowPerformanceMenus: _boolFromJson(
        json?['allowPerformanceMenus'],
        fallback: defaultSettings.allowPerformanceMenus,
      ),
      allowPerformancePdfLinks: _boolFromJson(
        json?['allowPerformancePdfLinks'],
        fallback: defaultSettings.allowPerformancePdfLinks,
      ),
    );
  }

  static const normalDisplayEffect = 'normal';
  static const fitPageScale = 'fitPage';
  static const fitWidthScale = 'fitWidth';
  static const fullscreenScale = 'fullscreen';
  static const standardPedalMapping = 'standard';
  static const reversedPedalMapping = 'reversed';
  static const setlistPedalMapping = 'setlistEdges';
  static const reversedSetlistPedalMapping = 'reversedSetlistEdges';
  static const customPedalMappingType = 'custom';
  static const defaultCustomPedalMapping = <String, String>{
    'ArrowLeft': 'previousPage',
    'ArrowRight': 'nextPage',
    'ArrowUp': 'previousPage',
    'ArrowDown': 'nextPage',
    'PageUp': 'previousPage',
    'PageDown': 'nextPage',
    'Enter': 'nextPage',
    'Backspace': 'previousPage',
    'Space': 'nextPage',
    'Shift+Space': 'previousPage',
    'Tab': 'nextPage',
    'Shift+Tab': 'previousPage',
    'MediaPrevious': 'previousSetlistScore',
    'MediaNext': 'nextSetlistScore',
  };
  static const _validCustomPedalActions = <String>{
    'previousPage',
    'nextPage',
    'previousSetlistScore',
    'nextSetlistScore',
    'toggleQuickActions',
    'none',
  };
  static const balancedRenderProfile = 'balanced';
  static const largePdfRenderProfile = 'largePdf';
  static const noPageTurnAnimation = 'none';
  static const fastPageTurnAnimation = 'fast';
  static const naturalPageTurnAnimation = 'natural';

  static const defaultSettings = SheetViewerSettings(
    displayMode: 'auto',
    halfPageTurn: false,
  );

  final String displayMode;
  final bool halfPageTurn;
  final String displayEffect;
  final String pageScale;
  final String pedalMapping;
  final Map<String, String> customPedalMapping;
  final String renderProfile;
  final String pageTurnAnimation;
  final bool keepAwakeInPerformance;
  final bool showPerformancePrepNotice;
  final bool confirmSetlistTransition;
  final bool autoAdvanceSetlist;
  final bool allowPerformanceAnnotations;
  final bool allowPerformanceMenus;
  final bool allowPerformancePdfLinks;

  SheetViewerSettings copyWith({
    String? displayMode,
    bool? halfPageTurn,
    String? displayEffect,
    String? pageScale,
    String? pedalMapping,
    Map<String, String>? customPedalMapping,
    String? renderProfile,
    String? pageTurnAnimation,
    bool? keepAwakeInPerformance,
    bool? showPerformancePrepNotice,
    bool? confirmSetlistTransition,
    bool? autoAdvanceSetlist,
    bool? allowPerformanceAnnotations,
    bool? allowPerformanceMenus,
    bool? allowPerformancePdfLinks,
  }) {
    return SheetViewerSettings(
      displayMode: displayMode ?? this.displayMode,
      halfPageTurn: halfPageTurn ?? this.halfPageTurn,
      displayEffect: displayEffect ?? this.displayEffect,
      pageScale: pageScale ?? this.pageScale,
      pedalMapping: pedalMapping ?? this.pedalMapping,
      customPedalMapping: customPedalMapping ?? this.customPedalMapping,
      renderProfile: renderProfile ?? this.renderProfile,
      pageTurnAnimation: pageTurnAnimation ?? this.pageTurnAnimation,
      keepAwakeInPerformance:
          keepAwakeInPerformance ?? this.keepAwakeInPerformance,
      showPerformancePrepNotice:
          showPerformancePrepNotice ?? this.showPerformancePrepNotice,
      confirmSetlistTransition:
          confirmSetlistTransition ?? this.confirmSetlistTransition,
      autoAdvanceSetlist: autoAdvanceSetlist ?? this.autoAdvanceSetlist,
      allowPerformanceAnnotations:
          allowPerformanceAnnotations ?? this.allowPerformanceAnnotations,
      allowPerformanceMenus:
          allowPerformanceMenus ?? this.allowPerformanceMenus,
      allowPerformancePdfLinks:
          allowPerformancePdfLinks ?? this.allowPerformancePdfLinks,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'displayMode': displayMode,
      'halfPageTurn': halfPageTurn,
      'displayEffect': displayEffect,
      'pageScale': pageScale,
      'pedalMapping': pedalMapping,
      'customPedalMapping': customPedalMapping,
      'renderProfile': renderProfile,
      'pageTurnAnimation': pageTurnAnimation,
      'keepAwakeInPerformance': keepAwakeInPerformance,
      'showPerformancePrepNotice': showPerformancePrepNotice,
      'confirmSetlistTransition': confirmSetlistTransition,
      'autoAdvanceSetlist': autoAdvanceSetlist,
      'allowPerformanceAnnotations': allowPerformanceAnnotations,
      'allowPerformanceMenus': allowPerformanceMenus,
      'allowPerformancePdfLinks': allowPerformancePdfLinks,
    };
  }

  static String _normalizePageScale(Object? value) {
    if (value == fitWidthScale || value == fullscreenScale) {
      return value.toString();
    }
    return fitPageScale;
  }

  static String _normalizePedalMapping(Object? value) {
    if (value == reversedPedalMapping ||
        value == setlistPedalMapping ||
        value == reversedSetlistPedalMapping ||
        value == customPedalMappingType) {
      return value.toString();
    }
    return standardPedalMapping;
  }

  static Map<String, String> _normalizeCustomPedalMapping(Object? value) {
    if (value is! Map) {
      return defaultCustomPedalMapping;
    }
    final result = <String, String>{};
    for (final entry in value.entries) {
      final key = entry.key.toString().trim();
      final action = entry.value.toString().trim();
      if (key.isEmpty || action.isEmpty) {
        continue;
      }
      if (!_validCustomPedalActions.contains(action)) {
        continue;
      }
      result[key] = action;
    }
    return Map<String, String>.unmodifiable(
      <String, String>{...defaultCustomPedalMapping, ...result},
    );
  }

  static String _normalizeRenderProfile(Object? value) {
    if (value == largePdfRenderProfile) {
      return largePdfRenderProfile;
    }
    return balancedRenderProfile;
  }

  static String _normalizePageTurnAnimation(Object? value) {
    if (value == noPageTurnAnimation || value == fastPageTurnAnimation) {
      return value.toString();
    }
    return naturalPageTurnAnimation;
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

class SheetCropPreset {
  const SheetCropPreset({
    required this.id,
    required this.label,
    required this.scope,
    required this.crop,
    this.alternateCrop = SheetCropSettings.none,
    required this.createdAt,
  });

  factory SheetCropPreset.fromJson(Map<String, Object?> json) {
    final id = _stringFromJson(json['id']).trim();
    final createdAt = _dateFromJson(json['createdAt']);
    return SheetCropPreset(
      id: id,
      label: _fallbackStringFromJson(json['label'], 'Crop preset'),
      scope: _normalizeScope(json['scope']),
      crop: SheetCropSettings.fromJson(_asJsonMap(json['crop'])),
      alternateCrop: SheetCropSettings.fromJson(
        _asJsonMap(json['alternateCrop']),
      ),
      createdAt: createdAt,
    );
  }

  static const allPagesScope = 'allPages';
  static const oddEvenScope = 'oddEven';
  static const coverExcludedScope = 'coverExcluded';

  final String id;
  final String label;
  final String scope;
  final SheetCropSettings crop;
  final SheetCropSettings alternateCrop;
  final DateTime createdAt;

  bool get isValid => id.isNotEmpty && label.trim().isNotEmpty;

  SheetCropPreset copyWith({
    String? id,
    String? label,
    String? scope,
    SheetCropSettings? crop,
    SheetCropSettings? alternateCrop,
    DateTime? createdAt,
  }) {
    return SheetCropPreset(
      id: id ?? this.id,
      label: _fallbackStringFromJson(label ?? this.label, this.label),
      scope: _normalizeScope(scope ?? this.scope),
      crop: crop ?? this.crop,
      alternateCrop: alternateCrop ?? this.alternateCrop,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': id,
      'label': label,
      'scope': scope,
      'crop': crop.toJson(),
      'alternateCrop': alternateCrop.toJson(),
      'createdAt': createdAt.toIso8601String(),
    };
  }

  static String _normalizeScope(Object? value) {
    if (value == oddEvenScope || value == coverExcludedScope) {
      return value.toString();
    }
    return allPagesScope;
  }
}

class SheetRehearsalMark {
  const SheetRehearsalMark({
    required this.id,
    required this.pageNumber,
    required this.label,
    required this.kind,
    required this.createdAt,
  });

  factory SheetRehearsalMark.fromJson(Map<String, Object?> json) {
    final pageNumber = _intFromJson(json['pageNumber'], fallback: 1);
    return SheetRehearsalMark(
      id: _stringFromJson(json['id']).trim(),
      pageNumber: pageNumber < 1 ? 1 : pageNumber,
      label: _fallbackStringFromJson(json['label'], 'Mark'),
      kind: _normalizeKind(json['kind']),
      createdAt: _dateFromJson(json['createdAt']),
    );
  }

  static const rehearsalKind = 'rehearsal';
  static const segnoKind = 'segno';
  static const codaKind = 'coda';
  static const toCodaKind = 'toCoda';
  static const dcKind = 'dc';
  static const dsKind = 'ds';

  final String id;
  final int pageNumber;
  final String label;
  final String kind;
  final DateTime createdAt;

  bool get isValid => id.isNotEmpty && pageNumber > 0;

  bool isValidForPageCount(int pageCount) {
    return isValid && pageNumber <= pageCount;
  }

  SheetRehearsalMark copyWith({
    String? id,
    int? pageNumber,
    String? label,
    String? kind,
    DateTime? createdAt,
  }) {
    final nextPageNumber = pageNumber ?? this.pageNumber;
    return SheetRehearsalMark(
      id: id ?? this.id,
      pageNumber: nextPageNumber < 1 ? 1 : nextPageNumber,
      label: _fallbackStringFromJson(label ?? this.label, this.label),
      kind: _normalizeKind(kind ?? this.kind),
      createdAt: createdAt ?? this.createdAt,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': id,
      'pageNumber': pageNumber,
      'label': label,
      'kind': kind,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  static String _normalizeKind(Object? value) {
    if (value == segnoKind ||
        value == codaKind ||
        value == toCodaKind ||
        value == dcKind ||
        value == dsKind) {
      return value.toString();
    }
    return rehearsalKind;
  }
}

class SheetBlankPageInsertion {
  const SheetBlankPageInsertion({
    required this.id,
    required this.afterPage,
    required this.label,
    required this.createdAt,
  });

  factory SheetBlankPageInsertion.fromJson(Map<String, Object?> json) {
    final afterPage = _intFromJson(json['afterPage'], fallback: 0);
    return SheetBlankPageInsertion(
      id: _stringFromJson(json['id']).trim(),
      afterPage: afterPage < 0 ? 0 : afterPage,
      label: _fallbackStringFromJson(json['label'], 'Blank page'),
      createdAt: _dateFromJson(json['createdAt']),
    );
  }

  final String id;
  final int afterPage;
  final String label;
  final DateTime createdAt;

  bool get isValid => id.isNotEmpty && afterPage >= 0;

  bool isValidForPageCount(int pageCount) {
    return isValid && afterPage <= pageCount;
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': id,
      'afterPage': afterPage,
      'label': label,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

class SheetPageVisibilityPreset {
  const SheetPageVisibilityPreset({
    required this.id,
    required this.label,
    required this.hiddenPages,
    required this.createdAt,
  });

  factory SheetPageVisibilityPreset.fromJson(Map<String, Object?> json) {
    return SheetPageVisibilityPreset(
      id: _stringFromJson(json['id']).trim(),
      label: _fallbackStringFromJson(json['label'], 'Visibility preset'),
      hiddenPages: SheetPageSettings._normalizePages(json['hiddenPages']),
      createdAt: _dateFromJson(json['createdAt']),
    );
  }

  final String id;
  final String label;
  final List<int> hiddenPages;
  final DateTime createdAt;

  bool get isValid => id.isNotEmpty && label.trim().isNotEmpty;

  bool isValidForPageCount(int pageCount) {
    return isValid &&
        hiddenPages.every((page) => page > 0 && page <= pageCount) &&
        hiddenPages.length < pageCount;
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': id,
      'label': label,
      'hiddenPages': hiddenPages,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

class SheetPageSettings {
  const SheetPageSettings({
    required this.hiddenPages,
    required this.pageRotations,
    this.crop = SheetCropSettings.none,
    this.pageCrops = const <int, SheetCropSettings>{},
    this.pageOrder = const <int>[],
    this.jumpPoints = const <SheetPageJumpPoint>[],
    this.rehearsalMarks = const <SheetRehearsalMark>[],
    this.cropPresets = const <SheetCropPreset>[],
    this.blankPageInsertions = const <SheetBlankPageInsertion>[],
    this.visibilityPresets = const <SheetPageVisibilityPreset>[],
  });

  factory SheetPageSettings.fromJson(Map<String, Object?>? json) {
    return SheetPageSettings(
      hiddenPages: _normalizePages(json?['hiddenPages']),
      pageRotations: _normalizeRotations(json?['pageRotations']),
      crop: SheetCropSettings.fromJson(_asJsonMap(json?['crop'])),
      pageCrops: _normalizePageCrops(json?['pageCrops']),
      pageOrder: _normalizePageOrder(json?['pageOrder']),
      jumpPoints: _normalizeJumpPoints(json?['jumpPoints']),
      rehearsalMarks: _normalizeRehearsalMarks(json?['rehearsalMarks']),
      cropPresets: _normalizeCropPresets(json?['cropPresets']),
      blankPageInsertions: _normalizeBlankPageInsertions(
        json?['blankPageInsertions'],
      ),
      visibilityPresets: _normalizeVisibilityPresets(
        json?['visibilityPresets'],
      ),
    );
  }

  static const empty = SheetPageSettings(
    hiddenPages: <int>[],
    pageRotations: <int, int>{},
    pageCrops: <int, SheetCropSettings>{},
    pageOrder: <int>[],
    jumpPoints: <SheetPageJumpPoint>[],
    rehearsalMarks: <SheetRehearsalMark>[],
    cropPresets: <SheetCropPreset>[],
    blankPageInsertions: <SheetBlankPageInsertion>[],
    visibilityPresets: <SheetPageVisibilityPreset>[],
  );

  final List<int> hiddenPages;
  final Map<int, int> pageRotations;
  final SheetCropSettings crop;
  final Map<int, SheetCropSettings> pageCrops;
  final List<int> pageOrder;
  final List<SheetPageJumpPoint> jumpPoints;
  final List<SheetRehearsalMark> rehearsalMarks;
  final List<SheetCropPreset> cropPresets;
  final List<SheetBlankPageInsertion> blankPageInsertions;
  final List<SheetPageVisibilityPreset> visibilityPresets;

  bool get hasCustomPageOrder => pageOrder.isNotEmpty;

  bool get hasJumpPoints => jumpPoints.isNotEmpty;

  bool get hasRehearsalMarks => rehearsalMarks.isNotEmpty;

  bool get hasPageTemplateMetadata {
    return blankPageInsertions.isNotEmpty || visibilityPresets.isNotEmpty;
  }

  bool isHidden(int pageNumber) => hiddenPages.contains(pageNumber);

  SheetCropSettings cropForPage(int pageNumber) {
    return pageCrops[pageNumber] ?? crop;
  }

  List<int> visiblePages(int pageCount) {
    if (pageCount < 1) {
      return const <int>[];
    }
    return List<int>.unmodifiable(
      List<int>.generate(
        pageCount,
        (index) => index + 1,
      ).where((page) => !isHidden(page)),
    );
  }

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
    if (pageCount < 1) {
      return fromPage < 1 ? 1 : fromPage;
    }
    if (!isHidden(fromPage)) {
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

  List<int> effectivePageOrder(int pageCount) {
    if (pageCount < 1) {
      return const <int>[];
    }
    if (pageOrder.isEmpty) {
      return visiblePages(pageCount);
    }
    final sanitized = pageOrder
        .where((page) => page >= 1 && page <= pageCount && !isHidden(page))
        .toList(growable: false);
    return List<int>.unmodifiable(
      sanitized.isEmpty
          ? visiblePages(pageCount)
          : sanitized,
    );
  }

  SheetPageSettings compactForPageCount(int pageCount) {
    if (pageCount < 1) {
      return this;
    }

    var compactHiddenPages =
        hiddenPages
            .where((page) => page > 0 && page <= pageCount)
            .toSet()
            .toList()
          ..sort();
    if (compactHiddenPages.length >= pageCount) {
      compactHiddenPages = compactHiddenPages
          .take(pageCount - 1)
          .toList(growable: false);
    }
    final compactRotations = <int, int>{
      for (final entry in pageRotations.entries)
        if (entry.key > 0 &&
            entry.key <= pageCount &&
            _normalizedRotationDegrees(entry.value) != 0)
          entry.key: _normalizedRotationDegrees(entry.value),
    };
    final compactPageCrops = <int, SheetCropSettings>{
      for (final entry in pageCrops.entries)
        if (entry.key > 0 && entry.key <= pageCount && entry.value.hasCrop)
          entry.key: entry.value.normalized(),
    };
    final compactPageOrder = pageOrder
        .where(
          (page) =>
              page > 0 &&
              page <= pageCount &&
              !compactHiddenPages.contains(page),
        )
        .toList(growable: false);
    final compactJumpPoints = jumpPoints
        .where(
          (jumpPoint) =>
              jumpPoint.isValidForPageCount(pageCount) &&
              !compactHiddenPages.contains(jumpPoint.sourcePage) &&
              !compactHiddenPages.contains(jumpPoint.targetPage),
        )
        .toList(growable: false);
    final compactRehearsalMarks = rehearsalMarks
        .where(
          (mark) =>
              mark.isValidForPageCount(pageCount) &&
              !compactHiddenPages.contains(mark.pageNumber),
        )
        .toList(growable: false);
    final compactBlankPageInsertions = blankPageInsertions
        .where((insertion) => insertion.isValidForPageCount(pageCount))
        .toList(growable: false);
    final compactVisibilityPresets = visibilityPresets
        .map(
          (preset) => SheetPageVisibilityPreset(
            id: preset.id,
            label: preset.label,
            hiddenPages: List<int>.unmodifiable(
              preset.hiddenPages
                  .where((page) => page > 0 && page <= pageCount)
                  .toSet()
                  .toList()
                ..sort(),
            ),
            createdAt: preset.createdAt,
          ),
        )
        .where((preset) => preset.isValidForPageCount(pageCount))
        .toList(growable: false);

    if (_intListsEqual(hiddenPages, compactHiddenPages) &&
        _intMapsEqual(pageRotations, compactRotations) &&
        _cropMapsEqual(pageCrops, compactPageCrops) &&
        _intListsEqual(pageOrder, compactPageOrder) &&
        _jumpPointListsEqual(jumpPoints, compactJumpPoints) &&
        _jsonObjectListsEqual(rehearsalMarks, compactRehearsalMarks) &&
        _jsonObjectListsEqual(blankPageInsertions, compactBlankPageInsertions) &&
        _jsonObjectListsEqual(visibilityPresets, compactVisibilityPresets)) {
      return this;
    }

    return copyWith(
      hiddenPages: List<int>.unmodifiable(compactHiddenPages),
      pageRotations: Map<int, int>.unmodifiable(compactRotations),
      pageCrops: Map<int, SheetCropSettings>.unmodifiable(compactPageCrops),
      pageOrder: List<int>.unmodifiable(compactPageOrder),
      jumpPoints: List<SheetPageJumpPoint>.unmodifiable(compactJumpPoints),
      rehearsalMarks: List<SheetRehearsalMark>.unmodifiable(
        compactRehearsalMarks,
      ),
      blankPageInsertions: List<SheetBlankPageInsertion>.unmodifiable(
        compactBlankPageInsertions,
      ),
      visibilityPresets: List<SheetPageVisibilityPreset>.unmodifiable(
        compactVisibilityPresets,
      ),
    );
  }

  SheetPageSettings movePageInOrder({
    required int fromIndex,
    required int toIndex,
    required int pageCount,
  }) {
    final order = effectivePageOrder(pageCount).toList();
    if (fromIndex < 0 ||
        fromIndex >= order.length ||
        toIndex < 0 ||
        toIndex >= order.length ||
        fromIndex == toIndex) {
      return this;
    }
    final page = order.removeAt(fromIndex);
    order.insert(toIndex, page);
    return copyWith(pageOrder: List<int>.unmodifiable(order));
  }

  SheetPageSettings duplicatePageInOrder({
    required int pageNumber,
    required int pageCount,
    int? orderIndex,
  }) {
    if (pageNumber < 1 || pageNumber > pageCount) {
      return this;
    }
    final order = effectivePageOrder(pageCount).toList();
    final index =
        orderIndex != null &&
            orderIndex >= 0 &&
            orderIndex < order.length &&
            order[orderIndex] == pageNumber
        ? orderIndex
        : order.lastIndexOf(pageNumber);
    if (index == -1) {
      return this;
    }
    order.insert(index + 1, pageNumber);
    return copyWith(pageOrder: List<int>.unmodifiable(order));
  }

  SheetPageSettings resetPageOrder() {
    if (pageOrder.isEmpty) {
      return this;
    }
    return copyWith(pageOrder: const <int>[]);
  }

  List<SheetPageJumpPoint> jumpPointsFromPage(int pageNumber) {
    return jumpPoints
        .where(
          (jumpPoint) =>
              jumpPoint.sourcePage == pageNumber &&
              !isHidden(jumpPoint.sourcePage) &&
              !isHidden(jumpPoint.targetPage),
        )
        .toList(growable: false);
  }

  SheetPageSettings addJumpPoint({
    required SheetPageJumpPoint jumpPoint,
    required int pageCount,
  }) {
    if (!jumpPoint.isValidForPageCount(pageCount) ||
        isHidden(jumpPoint.sourcePage) ||
        isHidden(jumpPoint.targetPage)) {
      return this;
    }
    final next = <SheetPageJumpPoint>[
      ...jumpPoints.where((candidate) => candidate.id != jumpPoint.id),
      jumpPoint,
    ]..sort((a, b) {
        final sourceCompare = a.sourcePage.compareTo(b.sourcePage);
        if (sourceCompare != 0) {
          return sourceCompare;
        }
        return a.createdAt.compareTo(b.createdAt);
      });
    return copyWith(jumpPoints: List<SheetPageJumpPoint>.unmodifiable(next));
  }

  SheetPageSettings removeJumpPoint(String id) {
    final next = jumpPoints
        .where((jumpPoint) => jumpPoint.id != id)
        .toList(growable: false);
    if (next.length == jumpPoints.length) {
      return this;
    }
    return copyWith(jumpPoints: List<SheetPageJumpPoint>.unmodifiable(next));
  }

  List<SheetRehearsalMark> rehearsalMarksForPage(int pageNumber) {
    return rehearsalMarks
        .where((mark) => mark.pageNumber == pageNumber && !isHidden(pageNumber))
        .toList(growable: false);
  }

  SheetPageSettings addRehearsalMark({
    required SheetRehearsalMark mark,
    required int pageCount,
  }) {
    if (!mark.isValidForPageCount(pageCount) || isHidden(mark.pageNumber)) {
      return this;
    }
    final next = <SheetRehearsalMark>[
      ...rehearsalMarks.where((candidate) => candidate.id != mark.id),
      mark,
    ]..sort((a, b) {
        final pageCompare = a.pageNumber.compareTo(b.pageNumber);
        if (pageCompare != 0) {
          return pageCompare;
        }
        return a.createdAt.compareTo(b.createdAt);
      });
    return copyWith(
      rehearsalMarks: List<SheetRehearsalMark>.unmodifiable(next),
    );
  }

  SheetPageSettings removeRehearsalMark(String id) {
    final next = rehearsalMarks
        .where((mark) => mark.id != id)
        .toList(growable: false);
    if (next.length == rehearsalMarks.length) {
      return this;
    }
    return copyWith(
      rehearsalMarks: List<SheetRehearsalMark>.unmodifiable(next),
    );
  }

  SheetPageSettings addCropPreset(SheetCropPreset preset) {
    if (!preset.isValid) {
      return this;
    }
    final next = <SheetCropPreset>[
      ...cropPresets.where((candidate) => candidate.id != preset.id),
      preset,
    ]..sort((a, b) => a.createdAt.compareTo(b.createdAt));
    return copyWith(cropPresets: List<SheetCropPreset>.unmodifiable(next));
  }

  SheetPageSettings removeCropPreset(String id) {
    final next = cropPresets
        .where((preset) => preset.id != id)
        .toList(growable: false);
    if (next.length == cropPresets.length) {
      return this;
    }
    return copyWith(cropPresets: List<SheetCropPreset>.unmodifiable(next));
  }

  SheetPageSettings applyCropPreset(String id, {int? pageCount}) {
    SheetCropPreset? preset;
    for (final candidate in cropPresets) {
      if (candidate.id == id) {
        preset = candidate;
        break;
      }
    }
    if (preset == null) {
      return this;
    }
    final normalizedCrop = preset.crop.normalized();
    if (preset.scope == SheetCropPreset.allPagesScope || pageCount == null) {
      return copyWith(
        crop: normalizedCrop,
        pageCrops: const <int, SheetCropSettings>{},
      );
    }
    if (pageCount < 1) {
      return this;
    }

    final nextPageCrops = <int, SheetCropSettings>{};
    for (var page = 1; page <= pageCount; page += 1) {
      if (preset.scope == SheetCropPreset.coverExcludedScope && page == 1) {
        continue;
      }
      final pageCrop =
          preset.scope == SheetCropPreset.oddEvenScope &&
              page.isEven &&
              preset.alternateCrop.hasCrop
          ? preset.alternateCrop.normalized()
          : normalizedCrop;
      if (pageCrop.hasCrop) {
        nextPageCrops[page] = pageCrop;
      }
    }
    return copyWith(
      crop: SheetCropSettings.none,
      pageCrops: Map<int, SheetCropSettings>.unmodifiable(nextPageCrops),
    );
  }

  SheetPageSettings addBlankPageInsertion({
    required SheetBlankPageInsertion insertion,
    required int pageCount,
  }) {
    if (!insertion.isValidForPageCount(pageCount)) {
      return this;
    }
    final next = <SheetBlankPageInsertion>[
      ...blankPageInsertions.where(
        (candidate) => candidate.id != insertion.id,
      ),
      insertion,
    ]..sort((a, b) => a.afterPage.compareTo(b.afterPage));
    return copyWith(
      blankPageInsertions: List<SheetBlankPageInsertion>.unmodifiable(next),
    );
  }

  SheetPageSettings removeBlankPageInsertion(String id) {
    final next = blankPageInsertions
        .where((insertion) => insertion.id != id)
        .toList(growable: false);
    if (next.length == blankPageInsertions.length) {
      return this;
    }
    return copyWith(
      blankPageInsertions: List<SheetBlankPageInsertion>.unmodifiable(next),
    );
  }

  SheetPageSettings addVisibilityPreset({
    required SheetPageVisibilityPreset preset,
    required int pageCount,
  }) {
    if (!preset.isValidForPageCount(pageCount)) {
      return this;
    }
    final next = <SheetPageVisibilityPreset>[
      ...visibilityPresets.where((candidate) => candidate.id != preset.id),
      preset,
    ]..sort((a, b) => a.createdAt.compareTo(b.createdAt));
    return copyWith(
      visibilityPresets: List<SheetPageVisibilityPreset>.unmodifiable(next),
    );
  }

  SheetPageSettings removeVisibilityPreset(String id) {
    final next = visibilityPresets
        .where((preset) => preset.id != id)
        .toList(growable: false);
    if (next.length == visibilityPresets.length) {
      return this;
    }
    return copyWith(
      visibilityPresets: List<SheetPageVisibilityPreset>.unmodifiable(next),
    );
  }

  SheetPageSettings applyVisibilityPreset(String id, int pageCount) {
    SheetPageVisibilityPreset? preset;
    for (final candidate in visibilityPresets) {
      if (candidate.id == id && candidate.isValidForPageCount(pageCount)) {
        preset = candidate;
        break;
      }
    }
    if (preset == null) {
      return this;
    }
    return copyWith(hiddenPages: preset.hiddenPages);
  }

  SheetPageOrderTarget? nextPageOrderTarget({
    required int currentPage,
    required int? currentIndex,
    required int delta,
    required int pageCount,
  }) {
    if (delta == 0 || !hasCustomPageOrder) {
      return null;
    }
    final order = effectivePageOrder(pageCount);
    if (order.isEmpty) {
      return null;
    }
    final resolvedCurrentIndex =
        currentIndex != null &&
            currentIndex >= 0 &&
            currentIndex < order.length &&
            order[currentIndex] == currentPage
        ? currentIndex
        : delta > 0
        ? order.indexOf(currentPage)
        : order.lastIndexOf(currentPage);
    if (resolvedCurrentIndex == -1) {
      return null;
    }

    var targetIndex = resolvedCurrentIndex + delta;
    while (targetIndex >= 0 && targetIndex < order.length) {
      final targetPage = order[targetIndex];
      if (!isHidden(targetPage)) {
        return SheetPageOrderTarget(
          index: targetIndex,
          pageNumber: targetPage,
        );
      }
      targetIndex += delta;
    }
    return SheetPageOrderTarget(
      index: resolvedCurrentIndex,
      pageNumber: currentPage,
      isBoundary: true,
    );
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
    Map<int, SheetCropSettings>? pageCrops,
    List<int>? pageOrder,
    List<SheetPageJumpPoint>? jumpPoints,
    List<SheetRehearsalMark>? rehearsalMarks,
    List<SheetCropPreset>? cropPresets,
    List<SheetBlankPageInsertion>? blankPageInsertions,
    List<SheetPageVisibilityPreset>? visibilityPresets,
  }) {
    return SheetPageSettings(
      hiddenPages: hiddenPages ?? this.hiddenPages,
      pageRotations: pageRotations ?? this.pageRotations,
      crop: crop ?? this.crop,
      pageCrops: pageCrops ?? this.pageCrops,
      pageOrder: pageOrder ?? this.pageOrder,
      jumpPoints: jumpPoints ?? this.jumpPoints,
      rehearsalMarks: rehearsalMarks ?? this.rehearsalMarks,
      cropPresets: cropPresets ?? this.cropPresets,
      blankPageInsertions: blankPageInsertions ?? this.blankPageInsertions,
      visibilityPresets: visibilityPresets ?? this.visibilityPresets,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'hiddenPages': hiddenPages,
      'pageRotations': pageRotations.map(
        (page, degrees) => MapEntry(page.toString(), degrees),
      ),
      'crop': crop.toJson(),
      'pageCrops': pageCrops.map(
        (page, pageCrop) => MapEntry(page.toString(), pageCrop.toJson()),
      ),
      'pageOrder': pageOrder,
      'jumpPoints': jumpPoints.map((jumpPoint) => jumpPoint.toJson()).toList(),
      'rehearsalMarks': rehearsalMarks.map((mark) => mark.toJson()).toList(),
      'cropPresets': cropPresets.map((preset) => preset.toJson()).toList(),
      'blankPageInsertions': blankPageInsertions
          .map((insertion) => insertion.toJson())
          .toList(),
      'visibilityPresets': visibilityPresets
          .map((preset) => preset.toJson())
          .toList(),
    };
  }

  static List<int> _normalizePages(Object? value) {
    final pages =
        _jsonList(value)
            .map((page) => _intFromJson(page, fallback: 0))
            .where((page) => page > 0)
            .toSet()
            .toList()
          ..sort();
    return List<int>.unmodifiable(pages);
  }

  static List<int> _normalizePageOrder(Object? value) {
    final pages = _jsonList(value)
        .map((page) => _intFromJson(page, fallback: 0))
        .where((page) => page > 0)
        .toList(growable: false);
    return List<int>.unmodifiable(pages);
  }

  static List<SheetPageJumpPoint> _normalizeJumpPoints(Object? value) {
    final jumpPoints =
        _jsonMaps(value)
            .map(_tryJumpPointFromJson)
            .whereType<SheetPageJumpPoint>()
            .where(
              (jumpPoint) =>
                  jumpPoint.isValid &&
                  jumpPoint.sourcePage != jumpPoint.targetPage,
            )
            .toList()
          ..sort((a, b) {
            final sourceCompare = a.sourcePage.compareTo(b.sourcePage);
            if (sourceCompare != 0) {
              return sourceCompare;
            }
            return a.createdAt.compareTo(b.createdAt);
          });
    return List<SheetPageJumpPoint>.unmodifiable(jumpPoints);
  }

  static List<SheetRehearsalMark> _normalizeRehearsalMarks(Object? value) {
    final marks =
        _jsonMaps(value)
            .map(_tryRehearsalMarkFromJson)
            .whereType<SheetRehearsalMark>()
            .where((mark) => mark.isValid)
            .toList()
          ..sort((a, b) {
            final pageCompare = a.pageNumber.compareTo(b.pageNumber);
            if (pageCompare != 0) {
              return pageCompare;
            }
            return a.createdAt.compareTo(b.createdAt);
          });
    return List<SheetRehearsalMark>.unmodifiable(marks);
  }

  static List<SheetCropPreset> _normalizeCropPresets(Object? value) {
    final presets =
        _jsonMaps(value)
            .map(_tryCropPresetFromJson)
            .whereType<SheetCropPreset>()
            .where((preset) => preset.isValid)
            .toList()
          ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
    return List<SheetCropPreset>.unmodifiable(presets);
  }

  static List<SheetBlankPageInsertion> _normalizeBlankPageInsertions(
    Object? value,
  ) {
    final insertions =
        _jsonMaps(value)
            .map(_tryBlankPageInsertionFromJson)
            .whereType<SheetBlankPageInsertion>()
            .where((insertion) => insertion.isValid)
            .toList()
          ..sort((a, b) => a.afterPage.compareTo(b.afterPage));
    return List<SheetBlankPageInsertion>.unmodifiable(insertions);
  }

  static List<SheetPageVisibilityPreset> _normalizeVisibilityPresets(
    Object? value,
  ) {
    final presets =
        _jsonMaps(value)
            .map(_tryVisibilityPresetFromJson)
            .whereType<SheetPageVisibilityPreset>()
            .where((preset) => preset.isValid)
            .toList()
          ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
    return List<SheetPageVisibilityPreset>.unmodifiable(presets);
  }

  static SheetPageJumpPoint? _tryJumpPointFromJson(
    Map<String, Object?> json,
  ) {
    try {
      return SheetPageJumpPoint.fromJson(json);
    } catch (_) {
      return null;
    }
  }

  static SheetRehearsalMark? _tryRehearsalMarkFromJson(
    Map<String, Object?> json,
  ) {
    try {
      return SheetRehearsalMark.fromJson(json);
    } catch (_) {
      return null;
    }
  }

  static SheetCropPreset? _tryCropPresetFromJson(Map<String, Object?> json) {
    try {
      return SheetCropPreset.fromJson(json);
    } catch (_) {
      return null;
    }
  }

  static SheetBlankPageInsertion? _tryBlankPageInsertionFromJson(
    Map<String, Object?> json,
  ) {
    try {
      return SheetBlankPageInsertion.fromJson(json);
    } catch (_) {
      return null;
    }
  }

  static SheetPageVisibilityPreset? _tryVisibilityPresetFromJson(
    Map<String, Object?> json,
  ) {
    try {
      return SheetPageVisibilityPreset.fromJson(json);
    } catch (_) {
      return null;
    }
  }

  static Map<int, int> _normalizeRotations(Object? value) {
    final rotations = <int, int>{};
    if (value is Map) {
      for (final entry in value.entries) {
        final page = int.tryParse(entry.key.toString());
        final rawDegrees = entry.value;
        final degrees = _intFromJson(rawDegrees, fallback: 0);
        if (page == null || page < 1) {
          continue;
        }
        final normalized = _normalizedRotationDegrees(degrees);
        if (normalized == 90 || normalized == 180 || normalized == 270) {
          rotations[page] = normalized;
        }
      }
    }
    return Map<int, int>.unmodifiable(rotations);
  }

  static Map<int, SheetCropSettings> _normalizePageCrops(Object? value) {
    final crops = <int, SheetCropSettings>{};
    if (value is Map) {
      for (final entry in value.entries) {
        final page = int.tryParse(entry.key.toString());
        if (page == null || page < 1) {
          continue;
        }
        final crop = SheetCropSettings.fromJson(_asJsonMap(entry.value));
        if (crop.hasCrop) {
          crops[page] = crop;
        }
      }
    }
    return Map<int, SheetCropSettings>.unmodifiable(crops);
  }

  static int _normalizedRotationDegrees(int degrees) {
    final normalized = ((degrees % 360) + 360) % 360;
    return normalized == 90 || normalized == 180 || normalized == 270
        ? normalized
        : 0;
  }

  static bool _intListsEqual(List<int> left, List<int> right) {
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

  static bool _intMapsEqual(Map<int, int> left, Map<int, int> right) {
    if (left.length != right.length) {
      return false;
    }
    for (final entry in left.entries) {
      if (right[entry.key] != entry.value) {
        return false;
      }
    }
    return true;
  }

  static bool _cropMapsEqual(
    Map<int, SheetCropSettings> left,
    Map<int, SheetCropSettings> right,
  ) {
    if (left.length != right.length) {
      return false;
    }
    for (final entry in left.entries) {
      if (jsonEncode(right[entry.key]?.toJson()) !=
          jsonEncode(entry.value.toJson())) {
        return false;
      }
    }
    return true;
  }

  static bool _jumpPointListsEqual(
    List<SheetPageJumpPoint> left,
    List<SheetPageJumpPoint> right,
  ) {
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

  static bool _jsonObjectListsEqual(List<dynamic> left, List<dynamic> right) {
    if (left.length != right.length) {
      return false;
    }
    for (var index = 0; index < left.length; index += 1) {
      final leftJson = jsonEncode(left[index].toJson());
      final rightJson = jsonEncode(right[index].toJson());
      if (leftJson != rightJson) {
        return false;
      }
    }
    return true;
  }
}

class SheetPageOrderTarget {
  const SheetPageOrderTarget({
    required this.index,
    required this.pageNumber,
    this.isBoundary = false,
  });

  final int index;
  final int pageNumber;
  final bool isBoundary;
}

class SheetPageJumpPoint {
  const SheetPageJumpPoint({
    required this.id,
    required this.sourcePage,
    required this.targetPage,
    required this.label,
    required this.createdAt,
  });

  factory SheetPageJumpPoint.fromJson(Map<String, Object?> json) {
    final sourcePage = _intFromJson(json['sourcePage'], fallback: 0);
    final targetPage = _intFromJson(json['targetPage'], fallback: 0);
    return SheetPageJumpPoint(
      id: _stringFromJson(json['id']),
      sourcePage: sourcePage,
      targetPage: targetPage,
      label: _normalizeLabel(
        _stringFromJson(json['label']),
        targetPage,
      ),
      createdAt:
          DateTime.tryParse(_stringFromJson(json['createdAt'])) ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }

  final String id;
  final int sourcePage;
  final int targetPage;
  final String label;
  final DateTime createdAt;

  bool get isValid {
    return id.isNotEmpty && sourcePage > 0 && targetPage > 0;
  }

  bool isValidForPageCount(int pageCount) {
    return isValid &&
        sourcePage <= pageCount &&
        targetPage <= pageCount &&
        sourcePage != targetPage;
  }

  SheetPageJumpPoint copyWith({
    String? id,
    int? sourcePage,
    int? targetPage,
    String? label,
    DateTime? createdAt,
  }) {
    return SheetPageJumpPoint(
      id: id ?? this.id,
      sourcePage: sourcePage ?? this.sourcePage,
      targetPage: targetPage ?? this.targetPage,
      label: _normalizeLabel(label ?? this.label, targetPage ?? this.targetPage),
      createdAt: createdAt ?? this.createdAt,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': id,
      'sourcePage': sourcePage,
      'targetPage': targetPage,
      'label': label,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  static String _normalizeLabel(String? value, int targetPage) {
    final trimmed = value?.trim() ?? '';
    return trimmed.isEmpty ? '$targetPage쪽으로' : trimmed;
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

    final sanitizedFromPath = json['sanitizedFromPath'] is String
        ? json['sanitizedFromPath'] as String
        : '';
    final createdAt = json['createdAt'] is String
        ? DateTime.tryParse(json['createdAt'] as String)
        : null;
    if (sanitizedFromPath.isEmpty || createdAt == null) {
      return empty;
    }

    return SheetPdfLinkSanitization(
      sanitizedFromPath: sanitizedFromPath,
      removedUrlLinkCount: _intFromJson(
        json['removedUrlLinkCount'],
        fallback: 0,
      ),
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

class SheetAnnotationStorageReference {
  const SheetAnnotationStorageReference({
    this.mode = inlineMode,
    this.path = '',
    this.checksum = '',
    this.updatedAt,
    this.lastSaveStatus = '',
    this.lastSaveError = '',
  });

  factory SheetAnnotationStorageReference.fromJson(
    Map<String, Object?>? json,
  ) {
    if (json == null) {
      return inline;
    }
    final mode = _normalizeMode(json['mode']);
    final path = _stringFromJson(json['path']).trim();
    final updatedAt = _parseOptionalDate(json['updatedAt']);
    return SheetAnnotationStorageReference(
      mode: mode == inlineMode || path.isNotEmpty ? mode : inlineMode,
      path: mode == inlineMode ? '' : path,
      checksum: _stringFromJson(json['checksum']).trim(),
      updatedAt: updatedAt,
      lastSaveStatus: _stringFromJson(json['lastSaveStatus']).trim(),
      lastSaveError: _stringFromJson(json['lastSaveError']).trim(),
    );
  }

  static const inlineMode = 'inline';
  static const fileMode = 'file';
  static const sqliteMode = 'sqlite';
  static const inline = SheetAnnotationStorageReference();

  final String mode;
  final String path;
  final String checksum;
  final DateTime? updatedAt;
  final String lastSaveStatus;
  final String lastSaveError;

  bool get isExternal => mode != inlineMode && path.isNotEmpty;

  bool get isFileBacked => mode == fileMode && path.isNotEmpty;

  bool get hasLastSaveError => lastSaveError.isNotEmpty;

  SheetAnnotationStorageReference copyWith({
    String? mode,
    String? path,
    String? checksum,
    DateTime? updatedAt,
    String? lastSaveStatus,
    String? lastSaveError,
  }) {
    return SheetAnnotationStorageReference(
      mode: _normalizeMode(mode ?? this.mode),
      path: path ?? this.path,
      checksum: checksum ?? this.checksum,
      updatedAt: updatedAt ?? this.updatedAt,
      lastSaveStatus: lastSaveStatus ?? this.lastSaveStatus,
      lastSaveError: lastSaveError ?? this.lastSaveError,
    );
  }

  SheetAnnotationStorageReference withSaveError(String error) {
    return copyWith(
      mode: inlineMode,
      path: '',
      lastSaveStatus: 'failed',
      lastSaveError: error.trim(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'mode': mode,
      'path': path,
      'checksum': checksum,
      'updatedAt': updatedAt?.toIso8601String(),
      'lastSaveStatus': lastSaveStatus,
      'lastSaveError': lastSaveError,
    };
  }

  static String _normalizeMode(Object? value) {
    if (value == fileMode || value == sqliteMode) {
      return value.toString();
    }
    return inlineMode;
  }
}

class SheetLinkedFile {
  const SheetLinkedFile({
    required this.path,
    required this.type,
    required this.label,
    this.role = partRole,
    required this.createdAt,
  });

  factory SheetLinkedFile.fromJson(Map<String, Object?> json) {
    final path = json['path'] is String ? json['path'] as String : '';
    final type = json['type'] is String ? json['type'] as String : 'pdf';
    final label = json['label'] is String ? json['label'] as String : '';
    final role = json['role'] is String ? json['role'] as String : partRole;
    final createdAt = json['createdAt'] is String
        ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime(1970)
        : DateTime(1970);
    return SheetLinkedFile(
      path: path,
      type: _normalizeType(type),
      label: label.trim().isEmpty ? _fallbackLabel(path) : label.trim(),
      role: _normalizeRole(role),
      createdAt: createdAt,
    );
  }

  static const fullScoreRole = 'fullScore';
  static const partRole = 'part';
  static const pianoReductionRole = 'pianoReduction';
  static const originalRole = 'original';
  static const editedCopyRole = 'editedCopy';
  static const referenceRole = 'reference';

  final String path;
  final String type;
  final String label;
  final String role;
  final DateTime createdAt;

  SheetLinkedFile copyWith({
    String? path,
    String? type,
    String? label,
    String? role,
    DateTime? createdAt,
  }) {
    final nextPath = (path ?? this.path).trim();
    final nextLabel = (label ?? this.label).trim();
    return SheetLinkedFile(
      path: nextPath,
      type: _normalizeType(type ?? this.type),
      label: nextLabel.isEmpty ? _fallbackLabel(nextPath) : nextLabel,
      role: _normalizeRole(role ?? this.role),
      createdAt: createdAt ?? this.createdAt,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'path': path,
      'type': type,
      'label': label,
      'role': role,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  static String _fallbackLabel(String path) {
    final normalized = path.trim();
    if (normalized.isEmpty) {
      return '연결 파일';
    }
    return normalized.split('/').last;
  }

  static String _normalizeType(String type) {
    final normalized = type.trim().toLowerCase();
    return normalized.isEmpty ? 'pdf' : normalized;
  }

  static String _normalizeRole(String role) {
    final normalized = role.trim();
    if (normalized == fullScoreRole ||
        normalized == pianoReductionRole ||
        normalized == originalRole ||
        normalized == editedCopyRole ||
        normalized == referenceRole) {
      return normalized;
    }
    return partRole;
  }
}

class SheetScoreNotes {
  const SheetScoreNotes({
    this.performance = '',
    this.rehearsal = '',
    this.tuning = '',
    this.instrumentation = '',
  });

  factory SheetScoreNotes.fromJson(Map<String, Object?>? json) {
    return SheetScoreNotes(
      performance: _stringFromJson(json?['performance']).trim(),
      rehearsal: _stringFromJson(json?['rehearsal']).trim(),
      tuning: _stringFromJson(json?['tuning']).trim(),
      instrumentation: _stringFromJson(json?['instrumentation']).trim(),
    );
  }

  static const empty = SheetScoreNotes();

  final String performance;
  final String rehearsal;
  final String tuning;
  final String instrumentation;

  bool get hasAny {
    return performance.isNotEmpty ||
        rehearsal.isNotEmpty ||
        tuning.isNotEmpty ||
        instrumentation.isNotEmpty;
  }

  SheetScoreNotes copyWith({
    String? performance,
    String? rehearsal,
    String? tuning,
    String? instrumentation,
  }) {
    return SheetScoreNotes(
      performance: (performance ?? this.performance).trim(),
      rehearsal: (rehearsal ?? this.rehearsal).trim(),
      tuning: (tuning ?? this.tuning).trim(),
      instrumentation: (instrumentation ?? this.instrumentation).trim(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'performance': performance,
      'rehearsal': rehearsal,
      'tuning': tuning,
      'instrumentation': instrumentation,
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
    this.collection = '',
    this.group = '',
    this.rating = 0,
    this.linkedFiles = const <SheetLinkedFile>[],
    this.structuredNotes = SheetScoreNotes.empty,
    required this.importedAt,
    required this.updatedAt,
    required this.lastOpenedAt,
    required this.lastPage,
    required this.isFavorite,
    this.isPinned = false,
    required this.bookmarks,
    this.viewerSettings = SheetViewerSettings.defaultSettings,
    this.pageSettings = SheetPageSettings.empty,
    this.annotationLayer = SheetAnnotationLayer.empty,
    this.annotationStorage = SheetAnnotationStorageReference.inline,
    this.pdfLinkSanitization = SheetPdfLinkSanitization.empty,
    this.autoScrollSettings = SheetAutoScrollSettings.defaultSettings,
  });

  factory SheetScore.fromJson(Map<String, Object?> json) {
    final importedAt = _dateFromJson(json['importedAt']);
    return SheetScore(
      id: _requiredStringFromJson(json['id'], 'Score id'),
      title: _fallbackStringFromJson(json['title'], 'Untitled score'),
      composer: _stringFromJson(json['composer']),
      tags: _jsonList(json['tags'])
          .whereType<String>()
          .map((tag) => tag.trim())
          .where((tag) => tag.isNotEmpty)
          .toList(growable: false),
      note: _stringFromJson(json['note']),
      filePath: _requiredStringFromJson(json['filePath'], 'Score filePath'),
      collection: _stringFromJson(json['collection']).trim(),
      group: _stringFromJson(json['group']).trim(),
      rating: normalizeRating(json['rating']),
      linkedFiles: _parseLinkedFiles(json['linkedFiles']),
      structuredNotes: SheetScoreNotes.fromJson(
        _asJsonMap(json['structuredNotes']),
      ),
      importedAt: importedAt,
      updatedAt: _dateFromJson(json['updatedAt'], fallback: importedAt),
      lastOpenedAt: _parseOptionalDate(json['lastOpenedAt']),
      lastPage: _intFromJson(
        json['lastPage'],
        fallback: 1,
      ).clamp(1, 1 << 30).toInt(),
      isFavorite: _boolFromJson(json['isFavorite'], fallback: false),
      isPinned: _boolFromJson(json['isPinned'], fallback: false),
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
      annotationStorage: SheetAnnotationStorageReference.fromJson(
        _asJsonMap(json['annotationStorage']),
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

    try {
      return decodeJsonList(jsonDecode(value));
    } catch (_) {
      return const <SheetScore>[];
    }
  }

  static List<SheetScore> decodeJsonList(Object? value) {
    final decoded = _jsonList(value);
    return decoded
        .map(_asJsonMap)
        .whereType<Map<String, Object?>>()
        .map(_tryFromJson)
        .whereType<SheetScore>()
        .toList(growable: false);
  }

  static String encodeList(List<SheetScore> scores) {
    return jsonEncode(scores.map((score) => score.toJson()).toList());
  }

  static SheetScore? _tryFromJson(Map<String, Object?> json) {
    try {
      return SheetScore.fromJson(json);
    } catch (_) {
      return null;
    }
  }

  final String id;
  final String title;
  final String composer;
  final List<String> tags;
  final String note;
  final String filePath;
  final String collection;
  final String group;
  final int rating;
  final List<SheetLinkedFile> linkedFiles;
  final SheetScoreNotes structuredNotes;
  final DateTime importedAt;
  final DateTime updatedAt;
  final DateTime? lastOpenedAt;
  final int lastPage;
  final bool isFavorite;
  final bool isPinned;
  final List<SheetBookmark> bookmarks;
  final SheetViewerSettings viewerSettings;
  final SheetPageSettings pageSettings;
  final SheetAnnotationLayer annotationLayer;
  final SheetAnnotationStorageReference annotationStorage;
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
        collection.toLowerCase().contains(normalized) ||
        group.toLowerCase().contains(normalized) ||
        note.toLowerCase().contains(normalized) ||
        structuredNotes.performance.toLowerCase().contains(normalized) ||
        structuredNotes.rehearsal.toLowerCase().contains(normalized) ||
        structuredNotes.tuning.toLowerCase().contains(normalized) ||
        structuredNotes.instrumentation.toLowerCase().contains(normalized);
  }

  SheetScore copyWith({
    String? title,
    String? composer,
    List<String>? tags,
    String? note,
    String? filePath,
    String? collection,
    String? group,
    int? rating,
    List<SheetLinkedFile>? linkedFiles,
    SheetScoreNotes? structuredNotes,
    DateTime? updatedAt,
    DateTime? lastOpenedAt,
    int? lastPage,
    bool? isFavorite,
    bool? isPinned,
    List<SheetBookmark>? bookmarks,
    SheetViewerSettings? viewerSettings,
    SheetPageSettings? pageSettings,
    SheetAnnotationLayer? annotationLayer,
    SheetAnnotationStorageReference? annotationStorage,
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
      collection: collection ?? this.collection,
      group: group ?? this.group,
      rating: normalizeRating(rating ?? this.rating),
      linkedFiles: linkedFiles == null
          ? this.linkedFiles
          : normalizeLinkedFiles(linkedFiles),
      structuredNotes: structuredNotes ?? this.structuredNotes,
      importedAt: importedAt,
      updatedAt: updatedAt ?? this.updatedAt,
      lastOpenedAt: lastOpenedAt ?? this.lastOpenedAt,
      lastPage: lastPage ?? this.lastPage,
      isFavorite: isFavorite ?? this.isFavorite,
      isPinned: isPinned ?? this.isPinned,
      bookmarks: bookmarks ?? this.bookmarks,
      viewerSettings: viewerSettings ?? this.viewerSettings,
      pageSettings: pageSettings ?? this.pageSettings,
      annotationLayer: annotationLayer ?? this.annotationLayer,
      annotationStorage: annotationStorage ?? this.annotationStorage,
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
      'collection': collection,
      'group': group,
      'rating': rating,
      'linkedFiles': linkedFiles.map((file) => file.toJson()).toList(),
      'structuredNotes': structuredNotes.toJson(),
      'importedAt': importedAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'lastOpenedAt': lastOpenedAt?.toIso8601String(),
      'lastPage': lastPage,
      'isFavorite': isFavorite,
      'isPinned': isPinned,
      'bookmarks': bookmarks.map((bookmark) => bookmark.toJson()).toList(),
      'viewerSettings': viewerSettings.toJson(),
      'pageSettings': pageSettings.toJson(),
      'annotationLayer': annotationLayer.toJson(),
      'annotationStorage': annotationStorage.toJson(),
      'pdfLinkSanitization': pdfLinkSanitization.toJson(),
      'autoScrollSettings': autoScrollSettings.toJson(),
    };
  }

  static List<SheetBookmark> _parseBookmarks(Object? value) {
    final bookmarks = _jsonMaps(value)
        .map(_tryBookmarkFromJson)
        .whereType<SheetBookmark>()
        .toList();
    bookmarks.sort((a, b) => a.pageNumber.compareTo(b.pageNumber));
    return List<SheetBookmark>.unmodifiable(bookmarks);
  }

  static SheetBookmark? _tryBookmarkFromJson(Map<String, Object?> json) {
    try {
      return SheetBookmark.fromJson(json);
    } catch (_) {
      return null;
    }
  }

  static List<SheetLinkedFile> _parseLinkedFiles(Object? value) {
    final files = _jsonMaps(value)
        .map(SheetLinkedFile.fromJson)
        .where((file) => file.path.trim().isNotEmpty)
        .toList(growable: false);
    return normalizeLinkedFiles(files);
  }

  static List<SheetLinkedFile> normalizeLinkedFiles(
    Iterable<SheetLinkedFile> files,
  ) {
    final seenPaths = <String>{};
    final normalized = <SheetLinkedFile>[];
    for (final file in files) {
      final path = file.path.trim();
      if (path.isEmpty || !seenPaths.add(path)) {
        continue;
      }
      normalized.add(file.copyWith(path: path));
    }
    return List<SheetLinkedFile>.unmodifiable(normalized);
  }

  static int normalizeRating(Object? value) {
    final rating = value is num
        ? value.round()
        : int.tryParse(value.toString());
    return (rating ?? 0).clamp(0, 5).toInt();
  }

  static DateTime? _parseOptionalDate(Object? value) {
    if (value is! String || value.isEmpty) {
      return null;
    }
    return DateTime.tryParse(value);
  }
}

Iterable<Map<String, Object?>> _jsonMaps(Object? value) {
  return _jsonList(value)
      .map(_asJsonMap)
      .whereType<Map<String, Object?>>();
}
