import 'dart:convert';
import 'dart:math' as math;

int _intFromJson(Object? value, {required int fallback}) {
  if (value is num) {
    return value.round();
  }
  return int.tryParse(value?.toString() ?? '') ?? fallback;
}

bool _boolFromJson(Object? value, {required bool fallback}) {
  return value is bool ? value : fallback;
}

enum SheetAnnotationTool {
  pen,
  highlighter,
  arrow,
  rectangle;

  static SheetAnnotationTool fromName(String? name) {
    return SheetAnnotationTool.values.firstWhere(
      (tool) => tool.name == name,
      orElse: () => SheetAnnotationTool.pen,
    );
  }
}

class SheetAnnotationToolPreset {
  const SheetAnnotationToolPreset({
    required this.toolName,
    required this.color,
    required this.width,
    this.stampName = '',
  });

  factory SheetAnnotationToolPreset.fromJson(Map<String, Object?>? json) {
    return SheetAnnotationToolPreset(
      toolName: _normalizeName(json?['toolName']),
      color: _intFromJson(json?['color'], fallback: 0xff111111),
      width: _normalizeWidth(json?['width']),
      stampName: _normalizeName(json?['stampName']),
    );
  }

  final String toolName;
  final int color;
  final double width;
  final String stampName;

  bool get isValid => _validToolNames.contains(toolName);

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'toolName': toolName,
      'color': color,
      'width': width,
      'stampName': stampName,
    };
  }

  static const Set<String> _validToolNames = <String>{
    'pen',
    'highlighter',
    'arrow',
    'rectangle',
    'stamp',
    'text',
    'eraser',
  };

  static String _normalizeName(Object? value) {
    return _stringFromJson(value).trim().toLowerCase();
  }

  static double _normalizeWidth(Object? value) {
    final width = value is num ? value.toDouble() : 3.5;
    return width.clamp(2.0, 14.0).toDouble();
  }
}

class SheetAnnotationPoint {
  const SheetAnnotationPoint({
    required this.x,
    required this.y,
    this.pressure = 1.0,
  });

  factory SheetAnnotationPoint.fromJson(Map<String, Object?> json) {
    return SheetAnnotationPoint(
      x: _normalizeCoordinate(json['x']),
      y: _normalizeCoordinate(json['y']),
      pressure: _normalizePressure(json['pressure']),
    );
  }

  final double x;
  final double y;
  final double pressure;

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'x': x,
      'y': y,
      if (pressure != 1.0) 'pressure': pressure,
    };
  }

  double distanceTo(SheetAnnotationPoint other) {
    final dx = x - other.x;
    final dy = y - other.y;
    return math.sqrt((dx * dx) + (dy * dy));
  }

  static double _normalizeCoordinate(Object? value) {
    final coordinate = value is num ? value.toDouble() : 0.0;
    return coordinate.clamp(0.0, 1.0).toDouble();
  }

  static double _normalizePressure(Object? value) {
    final pressure = value is num ? value.toDouble() : 1.0;
    return pressure.clamp(0.4, 1.8).toDouble();
  }
}

class SheetAnnotationStroke {
  const SheetAnnotationStroke({
    required this.id,
    required this.pageNumber,
    required this.tool,
    required this.color,
    required this.width,
    required this.points,
    required this.createdAt,
  });

  factory SheetAnnotationStroke.fromJson(Map<String, Object?> json) {
    final pageNumber = _intFromJson(json['pageNumber'], fallback: 1);
    return SheetAnnotationStroke(
      id: _stringFromJson(json['id']),
      pageNumber: pageNumber < 1 ? 1 : pageNumber,
      tool: SheetAnnotationTool.fromName(_stringFromJson(json['tool'])),
      color: _intFromJson(json['color'], fallback: 0xff111111),
      width: _normalizeWidth(json['width']),
      points: _parsePoints(json['points']),
      createdAt:
          DateTime.tryParse(_stringFromJson(json['createdAt'])) ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }

  final String id;
  final int pageNumber;
  final SheetAnnotationTool tool;
  final int color;
  final double width;
  final List<SheetAnnotationPoint> points;
  final DateTime createdAt;

  bool hitTest(SheetAnnotationPoint point, {required double tolerance}) {
    if (points.isEmpty) {
      return false;
    }
    if (tool == SheetAnnotationTool.rectangle && points.length >= 2) {
      return _distanceToRectangle(point, points.first, points.last) <=
          tolerance;
    }
    if (points.length == 1) {
      return points.single.distanceTo(point) <= tolerance;
    }

    for (var index = 0; index < points.length - 1; index += 1) {
      if (_distanceToSegment(point, points[index], points[index + 1]) <=
          tolerance) {
        return true;
      }
    }
    return false;
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': id,
      'pageNumber': pageNumber,
      'tool': tool.name,
      'color': color,
      'width': width,
      'points': points.map((point) => point.toJson()).toList(),
      'createdAt': createdAt.toIso8601String(),
    };
  }

  static List<SheetAnnotationPoint> _parsePoints(Object? value) {
    return _jsonMaps(value)
        .map(SheetAnnotationPoint.fromJson)
        .toList(growable: false);
  }

  static double _normalizeWidth(Object? value) {
    final width = value is num ? value.toDouble() : 3.0;
    return width.clamp(1.0, 32.0).toDouble();
  }

  static double _distanceToSegment(
    SheetAnnotationPoint point,
    SheetAnnotationPoint start,
    SheetAnnotationPoint end,
  ) {
    final dx = end.x - start.x;
    final dy = end.y - start.y;
    final lengthSquared = (dx * dx) + (dy * dy);
    if (lengthSquared == 0) {
      return point.distanceTo(start);
    }

    final t =
        (((point.x - start.x) * dx) + ((point.y - start.y) * dy)) /
        lengthSquared;
    final clampedT = t.clamp(0.0, 1.0).toDouble();
    final projection = SheetAnnotationPoint(
      x: start.x + (clampedT * dx),
      y: start.y + (clampedT * dy),
    );
    return point.distanceTo(projection);
  }

  static double _distanceToRectangle(
    SheetAnnotationPoint point,
    SheetAnnotationPoint first,
    SheetAnnotationPoint second,
  ) {
    final left = math.min(first.x, second.x);
    final right = math.max(first.x, second.x);
    final top = math.min(first.y, second.y);
    final bottom = math.max(first.y, second.y);
    if (right - left == 0 || bottom - top == 0) {
      return _distanceToSegment(point, first, second);
    }
    final edges = <(SheetAnnotationPoint, SheetAnnotationPoint)>[
      (
        SheetAnnotationPoint(x: left, y: top),
        SheetAnnotationPoint(x: right, y: top),
      ),
      (
        SheetAnnotationPoint(x: right, y: top),
        SheetAnnotationPoint(x: right, y: bottom),
      ),
      (
        SheetAnnotationPoint(x: right, y: bottom),
        SheetAnnotationPoint(x: left, y: bottom),
      ),
      (
        SheetAnnotationPoint(x: left, y: bottom),
        SheetAnnotationPoint(x: left, y: top),
      ),
    ];
    return edges
        .map((edge) => _distanceToSegment(point, edge.$1, edge.$2))
        .reduce((value, element) => math.min(value, element));
  }
}

class SheetTextAnnotation {
  const SheetTextAnnotation({
    required this.id,
    required this.pageNumber,
    required this.position,
    required this.text,
    required this.color,
    required this.fontSize,
    required this.createdAt,
  });

  factory SheetTextAnnotation.fromJson(Map<String, Object?> json) {
    final pageNumber = _intFromJson(json['pageNumber'], fallback: 1);
    return SheetTextAnnotation(
      id: _stringFromJson(json['id']),
      pageNumber: pageNumber < 1 ? 1 : pageNumber,
      position: SheetAnnotationPoint.fromJson(
        _asJsonMap(json['position']) ?? const <String, Object?>{},
      ),
      text: _stringFromJson(json['text']).trim(),
      color: _intFromJson(json['color'], fallback: 0xff111111),
      fontSize: _normalizeFontSize(json['fontSize']),
      createdAt:
          DateTime.tryParse(_stringFromJson(json['createdAt'])) ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }

  final String id;
  final int pageNumber;
  final SheetAnnotationPoint position;
  final String text;
  final int color;
  final double fontSize;
  final DateTime createdAt;

  SheetTextAnnotation copyWith({
    String? id,
    int? pageNumber,
    SheetAnnotationPoint? position,
    String? text,
    int? color,
    double? fontSize,
    DateTime? createdAt,
  }) {
    return SheetTextAnnotation(
      id: id ?? this.id,
      pageNumber: pageNumber ?? this.pageNumber,
      position: position ?? this.position,
      text: text ?? this.text,
      color: color ?? this.color,
      fontSize: fontSize ?? this.fontSize,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  bool hitTest(SheetAnnotationPoint point, {double tolerance = 0.025}) {
    if (text.trim().isEmpty) {
      return false;
    }
    final estimatedWidth = (text.runes.length * fontSize / 720)
        .clamp(0.08, 0.5)
        .toDouble();
    final estimatedHeight = (fontSize / 360).clamp(0.04, 0.18).toDouble();
    return point.x >= position.x - tolerance &&
        point.x <= position.x + estimatedWidth + tolerance &&
        point.y >= position.y - tolerance &&
        point.y <= position.y + estimatedHeight + tolerance;
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': id,
      'pageNumber': pageNumber,
      'position': position.toJson(),
      'text': text,
      'color': color,
      'fontSize': fontSize,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  static double _normalizeFontSize(Object? value) {
    final fontSize = value is num ? value.toDouble() : 18.0;
    return fontSize.clamp(8.0, 72.0).toDouble();
  }
}

class SheetAnnotationDisplayLayer {
  const SheetAnnotationDisplayLayer({
    required this.id,
    required this.label,
    this.isVisible = true,
    this.includeInExport = true,
  });

  factory SheetAnnotationDisplayLayer.fromJson(Map<String, Object?> json) {
    final id = _stringFromJson(json['id']).trim();
    final label = _stringFromJson(json['label']).trim();
    return SheetAnnotationDisplayLayer(
      id: id.isEmpty ? defaultLayerId : id,
      label: label.isEmpty ? defaultLayerLabel : label,
      isVisible: _boolFromJson(json['isVisible'], fallback: true),
      includeInExport: _boolFromJson(json['includeInExport'], fallback: true),
    );
  }

  static const defaultLayerId = 'default';
  static const defaultLayerLabel = '기본 필기';
  static const defaultLayer = SheetAnnotationDisplayLayer(
    id: defaultLayerId,
    label: defaultLayerLabel,
  );

  final String id;
  final String label;
  final bool isVisible;
  final bool includeInExport;

  bool get isValid => id.trim().isNotEmpty && label.trim().isNotEmpty;

  SheetAnnotationDisplayLayer copyWith({
    String? id,
    String? label,
    bool? isVisible,
    bool? includeInExport,
  }) {
    return SheetAnnotationDisplayLayer(
      id: id?.trim().isNotEmpty == true ? id!.trim() : this.id,
      label: label?.trim().isNotEmpty == true ? label!.trim() : this.label,
      isVisible: isVisible ?? this.isVisible,
      includeInExport: includeInExport ?? this.includeInExport,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': id,
      'label': label,
      'isVisible': isVisible,
      'includeInExport': includeInExport,
    };
  }
}

class SheetAnnotationLayer {
  const SheetAnnotationLayer({
    required this.strokes,
    this.texts = const <SheetTextAnnotation>[],
    this.redoStack = const <SheetAnnotationRedoEntry>[],
    this.eraseUndoStack = const <SheetAnnotationRedoEntry>[],
    this.layers = const <SheetAnnotationDisplayLayer>[
      SheetAnnotationDisplayLayer.defaultLayer,
    ],
  });

  factory SheetAnnotationLayer.fromJson(Map<String, Object?>? json) {
    final strokes = _jsonMaps(json?['strokes'])
        .map(_tryStrokeFromJson)
        .whereType<SheetAnnotationStroke>()
        .where((stroke) => stroke.id.isNotEmpty && stroke.points.isNotEmpty)
        .toList();
    strokes.sort((a, b) => a.createdAt.compareTo(b.createdAt));
    final texts = _jsonMaps(json?['texts'])
        .map(_tryTextFromJson)
        .whereType<SheetTextAnnotation>()
        .where((text) => text.id.isNotEmpty && text.text.isNotEmpty)
        .toList();
    texts.sort((a, b) => a.createdAt.compareTo(b.createdAt));
    final redoStack = _jsonMaps(json?['redoStack'])
        .map(_tryRedoEntryFromJson)
        .whereType<SheetAnnotationRedoEntry>()
        .where((entry) => entry.isValid)
        .toList(growable: false);
    final eraseUndoStack = _jsonMaps(json?['eraseUndoStack'])
        .map(_tryRedoEntryFromJson)
        .whereType<SheetAnnotationRedoEntry>()
        .where((entry) => entry.isValid)
        .toList(growable: false);
    return SheetAnnotationLayer(
      strokes: List<SheetAnnotationStroke>.unmodifiable(strokes),
      texts: List<SheetTextAnnotation>.unmodifiable(texts),
      redoStack: List<SheetAnnotationRedoEntry>.unmodifiable(redoStack),
      eraseUndoStack: List<SheetAnnotationRedoEntry>.unmodifiable(
        eraseUndoStack,
      ),
      layers: _normalizeLayers(json?['layers']),
    );
  }

  static SheetAnnotationStroke? _tryStrokeFromJson(Map<String, Object?> json) {
    try {
      return SheetAnnotationStroke.fromJson(json);
    } catch (_) {
      return null;
    }
  }

  static SheetTextAnnotation? _tryTextFromJson(Map<String, Object?> json) {
    try {
      return SheetTextAnnotation.fromJson(json);
    } catch (_) {
      return null;
    }
  }

  static SheetAnnotationRedoEntry? _tryRedoEntryFromJson(
    Map<String, Object?> json,
  ) {
    try {
      return SheetAnnotationRedoEntry.fromJson(json);
    } catch (_) {
      return null;
    }
  }

  static const empty = SheetAnnotationLayer(
    strokes: <SheetAnnotationStroke>[],
    texts: <SheetTextAnnotation>[],
    redoStack: <SheetAnnotationRedoEntry>[],
    eraseUndoStack: <SheetAnnotationRedoEntry>[],
    layers: <SheetAnnotationDisplayLayer>[
      SheetAnnotationDisplayLayer.defaultLayer,
    ],
  );

  final List<SheetAnnotationStroke> strokes;
  final List<SheetTextAnnotation> texts;
  final List<SheetAnnotationRedoEntry> redoStack;
  final List<SheetAnnotationRedoEntry> eraseUndoStack;
  final List<SheetAnnotationDisplayLayer> layers;

  int get strokeCount => strokes.length;

  int get textCount => texts.length;

  int get redoCount => redoStack.length;

  SheetAnnotationDisplayLayer get defaultLayer {
    for (final layer in layers) {
      if (layer.id == SheetAnnotationDisplayLayer.defaultLayerId) {
        return layer;
      }
    }
    return SheetAnnotationDisplayLayer.defaultLayer;
  }

  bool get isDefaultLayerVisible => defaultLayer.isVisible;

  bool get includeDefaultLayerInExport => defaultLayer.includeInExport;

  int get pointCount {
    var total = 0;
    for (final stroke in strokes) {
      total += stroke.points.length;
    }
    return total;
  }

  int get estimatedJsonBytes => utf8.encode(jsonEncode(toJson())).length;

  SheetAnnotationSummary summary({
    String storageMode = SheetAnnotationSummary.inlineStorageMode,
    String lastSaveStatus = '',
    String lastSaveError = '',
  }) {
    return SheetAnnotationSummary(
      strokeCount: strokeCount,
      textCount: textCount,
      redoCount: redoCount,
      pointCount: pointCount,
      estimatedJsonBytes: estimatedJsonBytes,
      storageMode: storageMode,
      lastSaveStatus: lastSaveStatus,
      lastSaveError: lastSaveError,
    );
  }

  List<SheetAnnotationStroke> strokesForPage(int pageNumber) {
    return strokes
        .where((stroke) => stroke.pageNumber == pageNumber)
        .toList(growable: false);
  }

  List<SheetTextAnnotation> textsForPage(int pageNumber) {
    return texts
        .where((text) => text.pageNumber == pageNumber)
        .toList(growable: false);
  }

  List<SheetAnnotationStroke> visibleStrokesForPage(int pageNumber) {
    return isDefaultLayerVisible
        ? strokesForPage(pageNumber)
        : const <SheetAnnotationStroke>[];
  }

  List<SheetTextAnnotation> visibleTextsForPage(int pageNumber) {
    return isDefaultLayerVisible
        ? textsForPage(pageNumber)
        : const <SheetTextAnnotation>[];
  }

  List<SheetAnnotationStroke> exportableStrokesForPage(int pageNumber) {
    return includeDefaultLayerInExport
        ? strokesForPage(pageNumber)
        : const <SheetAnnotationStroke>[];
  }

  List<SheetTextAnnotation> exportableTextsForPage(int pageNumber) {
    return includeDefaultLayerInExport
        ? textsForPage(pageNumber)
        : const <SheetTextAnnotation>[];
  }

  SheetAnnotationLayer withDefaultLayerState({
    bool? isVisible,
    bool? includeInExport,
  }) {
    final defaultLayer = this.defaultLayer.copyWith(
      isVisible: isVisible,
      includeInExport: includeInExport,
    );
    return SheetAnnotationLayer(
      strokes: strokes,
      texts: texts,
      redoStack: redoStack,
      eraseUndoStack: eraseUndoStack,
      layers: _normalizeLayerList(<SheetAnnotationDisplayLayer>[
        for (final layer in layers)
          if (layer.id != SheetAnnotationDisplayLayer.defaultLayerId) layer,
        defaultLayer,
      ]),
    );
  }

  SheetAnnotationLayer compactForPageCount(int pageCount) {
    if (pageCount < 1) {
      return this;
    }

    final compactStrokes = strokes
        .where(
          (stroke) => stroke.pageNumber > 0 && stroke.pageNumber <= pageCount,
        )
        .toList(growable: false);
    final compactTexts = texts
        .where((text) => text.pageNumber > 0 && text.pageNumber <= pageCount)
        .toList(growable: false);
    final compactRedoStack = redoStack
        .where((entry) => entry.pageNumber > 0 && entry.pageNumber <= pageCount)
        .toList(growable: false);
    final compactEraseUndoStack = eraseUndoStack
        .where((entry) => entry.pageNumber > 0 && entry.pageNumber <= pageCount)
        .toList(growable: false);

    if (_strokesEqual(strokes, compactStrokes) &&
        _textsEqual(texts, compactTexts) &&
        _redoEntriesEqual(redoStack, compactRedoStack) &&
        _redoEntriesEqual(eraseUndoStack, compactEraseUndoStack)) {
      return this;
    }

    return SheetAnnotationLayer(
      strokes: List<SheetAnnotationStroke>.unmodifiable(compactStrokes),
      texts: List<SheetTextAnnotation>.unmodifiable(compactTexts),
      redoStack: List<SheetAnnotationRedoEntry>.unmodifiable(compactRedoStack),
      eraseUndoStack: List<SheetAnnotationRedoEntry>.unmodifiable(
        compactEraseUndoStack,
      ),
      layers: layers,
    );
  }

  SheetAnnotationLayer compactRedoStack({int maxEntries = 40}) {
    if (maxEntries < 1 || redoStack.length <= maxEntries) {
      return this;
    }
    return SheetAnnotationLayer(
      strokes: strokes,
      texts: texts,
      redoStack: List<SheetAnnotationRedoEntry>.unmodifiable(
        redoStack.skip(redoStack.length - maxEntries),
      ),
      eraseUndoStack: eraseUndoStack,
      layers: layers,
    );
  }

  SheetAnnotationLayer addStroke(SheetAnnotationStroke stroke) {
    if (stroke.points.isEmpty) {
      return this;
    }
    final next = <SheetAnnotationStroke>[
      ...strokes.where((candidate) => candidate.id != stroke.id),
      stroke,
    ]..sort((a, b) => a.createdAt.compareTo(b.createdAt));
    return SheetAnnotationLayer(
      strokes: List<SheetAnnotationStroke>.unmodifiable(next),
      texts: texts,
      redoStack: const <SheetAnnotationRedoEntry>[],
      eraseUndoStack: const <SheetAnnotationRedoEntry>[],
      layers: layers,
    );
  }

  SheetAnnotationLayer addText(SheetTextAnnotation text) {
    if (text.text.trim().isEmpty) {
      return this;
    }
    final next = <SheetTextAnnotation>[
      ...texts.where((candidate) => candidate.id != text.id),
      text,
    ]..sort((a, b) => a.createdAt.compareTo(b.createdAt));
    return SheetAnnotationLayer(
      strokes: strokes,
      texts: List<SheetTextAnnotation>.unmodifiable(next),
      redoStack: const <SheetAnnotationRedoEntry>[],
      eraseUndoStack: const <SheetAnnotationRedoEntry>[],
      layers: layers,
    );
  }

  SheetAnnotationLayer updateText(SheetTextAnnotation text) {
    if (text.text.trim().isEmpty) {
      return removeText(text.id);
    }
    var didUpdate = false;
    final next = texts
        .map((candidate) {
          if (candidate.id != text.id) {
            return candidate;
          }
          didUpdate = true;
          return text;
        })
        .toList(growable: false);
    if (!didUpdate) {
      return this;
    }
    return SheetAnnotationLayer(
      strokes: strokes,
      texts: List<SheetTextAnnotation>.unmodifiable(next),
      redoStack: const <SheetAnnotationRedoEntry>[],
      eraseUndoStack: const <SheetAnnotationRedoEntry>[],
      layers: layers,
    );
  }

  SheetAnnotationLayer removeStroke(String strokeId) {
    final next = strokes
        .where((stroke) => stroke.id != strokeId)
        .toList(growable: false);
    if (next.length == strokes.length) {
      return this;
    }
    return SheetAnnotationLayer(
      strokes: List<SheetAnnotationStroke>.unmodifiable(next),
      texts: texts,
      redoStack: const <SheetAnnotationRedoEntry>[],
      eraseUndoStack: const <SheetAnnotationRedoEntry>[],
      layers: layers,
    );
  }

  SheetAnnotationLayer removeText(String textId) {
    final next = texts
        .where((text) => text.id != textId)
        .toList(growable: false);
    if (next.length == texts.length) {
      return this;
    }
    return SheetAnnotationLayer(
      strokes: strokes,
      texts: List<SheetTextAnnotation>.unmodifiable(next),
      redoStack: const <SheetAnnotationRedoEntry>[],
      eraseUndoStack: const <SheetAnnotationRedoEntry>[],
      layers: layers,
    );
  }

  SheetAnnotationLayer eraseAt({
    required int pageNumber,
    required SheetAnnotationPoint point,
    required double tolerance,
  }) {
    final hitStroke = strokesForPage(pageNumber)
        .where((stroke) => stroke.hitTest(point, tolerance: tolerance));
    if (hitStroke.isEmpty) {
      final hitText = textAt(
        pageNumber: pageNumber,
        point: point,
        tolerance: tolerance,
      );
      return hitText == null ? this : _removeTextForEraseUndo(hitText);
    }
    return _removeStrokeForEraseUndo(hitStroke.last);
  }

  SheetTextAnnotation? textAt({
    required int pageNumber,
    required SheetAnnotationPoint point,
    double tolerance = 0.025,
  }) {
    final hits = textsForPage(pageNumber)
        .where((text) => text.hitTest(point, tolerance: tolerance));
    if (hits.isEmpty) {
      return null;
    }
    return hits.last;
  }

  SheetAnnotationLayer undoLastStroke(int pageNumber) {
    final pageStrokes = strokesForPage(pageNumber);
    if (pageStrokes.isEmpty) {
      return this;
    }
    return _removeStrokeForUndo(pageStrokes.last);
  }

  SheetAnnotationLayer undoLastAnnotation(int pageNumber) {
    final eraseRestored = _restoreLastErasedAnnotation(pageNumber);
    if (!identical(eraseRestored, this)) {
      return eraseRestored;
    }
    final pageStrokes = strokesForPage(pageNumber);
    final pageTexts = textsForPage(pageNumber);
    final lastStroke = pageStrokes.isEmpty ? null : pageStrokes.last;
    final lastText = pageTexts.isEmpty ? null : pageTexts.last;
    if (lastStroke == null && lastText == null) {
      return this;
    }
    if (lastText == null ||
        (lastStroke != null &&
            lastStroke.createdAt.isAfter(lastText.createdAt))) {
      return _removeStrokeForUndo(lastStroke!);
    }
    return _removeTextForUndo(lastText);
  }

  SheetAnnotationLayer redoLastAnnotation(int pageNumber) {
    for (var index = redoStack.length - 1; index >= 0; index -= 1) {
      final entry = redoStack[index];
      if (entry.pageNumber != pageNumber) {
        continue;
      }
      final remainingRedo = <SheetAnnotationRedoEntry>[
        ...redoStack.take(index),
        ...redoStack.skip(index + 1),
      ];
      if (entry.stroke != null) {
        if (entry.erasesAnnotation) {
          final nextStrokes = strokes
              .where((stroke) => stroke.id != entry.stroke!.id)
              .toList(growable: false);
          return SheetAnnotationLayer(
            strokes: List<SheetAnnotationStroke>.unmodifiable(nextStrokes),
            texts: texts,
            redoStack: List<SheetAnnotationRedoEntry>.unmodifiable(
              remainingRedo,
            ),
            eraseUndoStack: eraseUndoStack,
            layers: layers,
          );
        }
        final nextStrokes = <SheetAnnotationStroke>[
          ...strokes.where((stroke) => stroke.id != entry.stroke!.id),
          entry.stroke!,
        ]..sort((a, b) => a.createdAt.compareTo(b.createdAt));
        return SheetAnnotationLayer(
          strokes: List<SheetAnnotationStroke>.unmodifiable(nextStrokes),
          texts: texts,
          redoStack: List<SheetAnnotationRedoEntry>.unmodifiable(remainingRedo),
          eraseUndoStack: eraseUndoStack,
          layers: layers,
        );
      }
      if (entry.text != null) {
        if (entry.erasesAnnotation) {
          final nextTexts = texts
              .where((text) => text.id != entry.text!.id)
              .toList(growable: false);
          return SheetAnnotationLayer(
            strokes: strokes,
            texts: List<SheetTextAnnotation>.unmodifiable(nextTexts),
            redoStack: List<SheetAnnotationRedoEntry>.unmodifiable(
              remainingRedo,
            ),
            eraseUndoStack: eraseUndoStack,
            layers: layers,
          );
        }
        final nextTexts = <SheetTextAnnotation>[
          ...texts.where((text) => text.id != entry.text!.id),
          entry.text!,
        ]..sort((a, b) => a.createdAt.compareTo(b.createdAt));
        return SheetAnnotationLayer(
          strokes: strokes,
          texts: List<SheetTextAnnotation>.unmodifiable(nextTexts),
          redoStack: List<SheetAnnotationRedoEntry>.unmodifiable(remainingRedo),
          eraseUndoStack: eraseUndoStack,
          layers: layers,
        );
      }
    }
    return this;
  }

  SheetAnnotationLayer _removeStrokeForUndo(SheetAnnotationStroke stroke) {
    final next = strokes
        .where((candidate) => candidate.id != stroke.id)
        .toList(growable: false);
    if (next.length == strokes.length) {
      return this;
    }
    return SheetAnnotationLayer(
      strokes: List<SheetAnnotationStroke>.unmodifiable(next),
      texts: texts,
      redoStack: List<SheetAnnotationRedoEntry>.unmodifiable(
        <SheetAnnotationRedoEntry>[
          ...redoStack,
          SheetAnnotationRedoEntry.stroke(stroke),
        ],
      ),
      eraseUndoStack: eraseUndoStack,
      layers: layers,
    );
  }

  SheetAnnotationLayer _removeTextForUndo(SheetTextAnnotation text) {
    final next = texts
        .where((candidate) => candidate.id != text.id)
        .toList(growable: false);
    if (next.length == texts.length) {
      return this;
    }
    return SheetAnnotationLayer(
      strokes: strokes,
      texts: List<SheetTextAnnotation>.unmodifiable(next),
      redoStack: List<SheetAnnotationRedoEntry>.unmodifiable(
        <SheetAnnotationRedoEntry>[
          ...redoStack,
          SheetAnnotationRedoEntry.text(text),
        ],
      ),
      eraseUndoStack: eraseUndoStack,
      layers: layers,
    );
  }

  SheetAnnotationLayer _removeStrokeForEraseUndo(SheetAnnotationStroke stroke) {
    final next = strokes
        .where((candidate) => candidate.id != stroke.id)
        .toList(growable: false);
    if (next.length == strokes.length) {
      return this;
    }
    return SheetAnnotationLayer(
      strokes: List<SheetAnnotationStroke>.unmodifiable(next),
      texts: texts,
      redoStack: const <SheetAnnotationRedoEntry>[],
      eraseUndoStack: List<SheetAnnotationRedoEntry>.unmodifiable(
        <SheetAnnotationRedoEntry>[
          ...eraseUndoStack,
          SheetAnnotationRedoEntry.stroke(stroke),
        ],
      ),
      layers: layers,
    );
  }

  SheetAnnotationLayer _removeTextForEraseUndo(SheetTextAnnotation text) {
    final next = texts
        .where((candidate) => candidate.id != text.id)
        .toList(growable: false);
    if (next.length == texts.length) {
      return this;
    }
    return SheetAnnotationLayer(
      strokes: strokes,
      texts: List<SheetTextAnnotation>.unmodifiable(next),
      redoStack: const <SheetAnnotationRedoEntry>[],
      eraseUndoStack: List<SheetAnnotationRedoEntry>.unmodifiable(
        <SheetAnnotationRedoEntry>[
          ...eraseUndoStack,
          SheetAnnotationRedoEntry.text(text),
        ],
      ),
      layers: layers,
    );
  }

  SheetAnnotationLayer _restoreLastErasedAnnotation(int pageNumber) {
    for (var index = eraseUndoStack.length - 1; index >= 0; index -= 1) {
      final entry = eraseUndoStack[index];
      if (entry.pageNumber != pageNumber) {
        continue;
      }
      final remainingEraseUndo = <SheetAnnotationRedoEntry>[
        ...eraseUndoStack.take(index),
        ...eraseUndoStack.skip(index + 1),
      ];
      if (entry.stroke != null) {
        final nextStrokes = <SheetAnnotationStroke>[
          ...strokes.where((stroke) => stroke.id != entry.stroke!.id),
          entry.stroke!,
        ]..sort((a, b) => a.createdAt.compareTo(b.createdAt));
        return SheetAnnotationLayer(
          strokes: List<SheetAnnotationStroke>.unmodifiable(nextStrokes),
          texts: texts,
          redoStack: List<SheetAnnotationRedoEntry>.unmodifiable(
            <SheetAnnotationRedoEntry>[
              ...redoStack,
              SheetAnnotationRedoEntry.eraseStroke(entry.stroke!),
            ],
          ),
          eraseUndoStack: List<SheetAnnotationRedoEntry>.unmodifiable(
            remainingEraseUndo,
          ),
          layers: layers,
        );
      }
      if (entry.text != null) {
        final nextTexts = <SheetTextAnnotation>[
          ...texts.where((text) => text.id != entry.text!.id),
          entry.text!,
        ]..sort((a, b) => a.createdAt.compareTo(b.createdAt));
        return SheetAnnotationLayer(
          strokes: strokes,
          texts: List<SheetTextAnnotation>.unmodifiable(nextTexts),
          redoStack: List<SheetAnnotationRedoEntry>.unmodifiable(
            <SheetAnnotationRedoEntry>[
              ...redoStack,
              SheetAnnotationRedoEntry.eraseText(entry.text!),
            ],
          ),
          eraseUndoStack: List<SheetAnnotationRedoEntry>.unmodifiable(
            remainingEraseUndo,
          ),
          layers: layers,
        );
      }
    }
    return this;
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'strokes': strokes.map((stroke) => stroke.toJson()).toList(),
      'texts': texts.map((text) => text.toJson()).toList(),
      'redoStack': redoStack.map((entry) => entry.toJson()).toList(),
      'eraseUndoStack': eraseUndoStack.map((entry) => entry.toJson()).toList(),
      'layers': layers.map((layer) => layer.toJson()).toList(),
    };
  }

  static List<SheetAnnotationDisplayLayer> _normalizeLayers(Object? value) {
    final layers = _jsonMaps(value)
        .map(_tryLayerFromJson)
        .whereType<SheetAnnotationDisplayLayer>()
        .toList(growable: false);
    return _normalizeLayerList(layers);
  }

  static SheetAnnotationDisplayLayer? _tryLayerFromJson(
    Map<String, Object?> json,
  ) {
    try {
      return SheetAnnotationDisplayLayer.fromJson(json);
    } catch (_) {
      return null;
    }
  }

  static List<SheetAnnotationDisplayLayer> _normalizeLayerList(
    List<SheetAnnotationDisplayLayer> layers,
  ) {
    final byId = <String, SheetAnnotationDisplayLayer>{
      SheetAnnotationDisplayLayer.defaultLayerId:
          SheetAnnotationDisplayLayer.defaultLayer,
    };
    for (final layer in layers) {
      if (!layer.isValid) {
        continue;
      }
      byId[layer.id] = layer;
    }
    final normalized = byId.values.toList(growable: false);
    normalized.sort((a, b) {
      if (a.id == SheetAnnotationDisplayLayer.defaultLayerId) {
        return -1;
      }
      if (b.id == SheetAnnotationDisplayLayer.defaultLayerId) {
        return 1;
      }
      return a.label.toLowerCase().compareTo(b.label.toLowerCase());
    });
    return List<SheetAnnotationDisplayLayer>.unmodifiable(normalized);
  }

  static bool _strokesEqual(
    List<SheetAnnotationStroke> left,
    List<SheetAnnotationStroke> right,
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

  static bool _textsEqual(
    List<SheetTextAnnotation> left,
    List<SheetTextAnnotation> right,
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

  static bool _redoEntriesEqual(
    List<SheetAnnotationRedoEntry> left,
    List<SheetAnnotationRedoEntry> right,
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
}

class SheetAnnotationSummary {
  const SheetAnnotationSummary({
    required this.strokeCount,
    required this.textCount,
    required this.redoCount,
    required this.pointCount,
    required this.estimatedJsonBytes,
    this.storageMode = inlineStorageMode,
    this.lastSaveStatus = '',
    this.lastSaveError = '',
  });

  static const inlineStorageMode = 'inline';
  static const fileStorageMode = 'file';
  static const sqliteStorageMode = 'sqlite';

  final int strokeCount;
  final int textCount;
  final int redoCount;
  final int pointCount;
  final int estimatedJsonBytes;
  final String storageMode;
  final String lastSaveStatus;
  final String lastSaveError;

  bool get hasAnnotations => strokeCount > 0 || textCount > 0;

  bool get hasLastSaveError => lastSaveError.trim().isNotEmpty;

  String get storageLabel {
    return switch (storageMode) {
      fileStorageMode => 'external file',
      sqliteStorageMode => 'sqlite',
      _ => 'inline metadata',
    };
  }

  String get compactLabel {
    final sizeKb = estimatedJsonBytes / 1024;
    final sizeLabel = sizeKb >= 10
        ? '${sizeKb.round()}KB'
        : '${sizeKb.toStringAsFixed(1)}KB';
    final status = lastSaveStatus.trim().isEmpty ? '' : ' · $lastSaveStatus';
    return '필기 $strokeCount개 · 텍스트 $textCount개 · '
        '포인트 $pointCount개 · redo $redoCount개 · '
        '$storageLabel · $sizeLabel$status';
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'strokeCount': strokeCount,
      'textCount': textCount,
      'redoCount': redoCount,
      'pointCount': pointCount,
      'estimatedJsonBytes': estimatedJsonBytes,
      'storageMode': storageMode,
      'lastSaveStatus': lastSaveStatus,
      'lastSaveError': lastSaveError,
    };
  }
}

class SheetAnnotationRedoEntry {
  const SheetAnnotationRedoEntry._({
    this.stroke,
    this.text,
    this.type = unknownType,
  });

  factory SheetAnnotationRedoEntry.fromJson(Map<String, Object?> json) {
    final type = _stringFromJson(json['type']);
    final payload = _asJsonMap(json['payload']);
    if (type == 'stroke' && payload != null) {
      return SheetAnnotationRedoEntry.stroke(
        SheetAnnotationStroke.fromJson(payload),
      );
    }
    if (type == 'text' && payload != null) {
      return SheetAnnotationRedoEntry.text(
        SheetTextAnnotation.fromJson(payload),
      );
    }
    if (type == eraseStrokeType && payload != null) {
      return SheetAnnotationRedoEntry.eraseStroke(
        SheetAnnotationStroke.fromJson(payload),
      );
    }
    if (type == eraseTextType && payload != null) {
      return SheetAnnotationRedoEntry.eraseText(
        SheetTextAnnotation.fromJson(payload),
      );
    }
    return const SheetAnnotationRedoEntry._();
  }

  static const strokeType = 'stroke';
  static const textType = 'text';
  static const eraseStrokeType = 'eraseStroke';
  static const eraseTextType = 'eraseText';
  static const unknownType = 'unknown';

  factory SheetAnnotationRedoEntry.stroke(SheetAnnotationStroke stroke) {
    return SheetAnnotationRedoEntry._(stroke: stroke, type: strokeType);
  }

  factory SheetAnnotationRedoEntry.text(SheetTextAnnotation text) {
    return SheetAnnotationRedoEntry._(text: text, type: textType);
  }

  factory SheetAnnotationRedoEntry.eraseStroke(SheetAnnotationStroke stroke) {
    return SheetAnnotationRedoEntry._(stroke: stroke, type: eraseStrokeType);
  }

  factory SheetAnnotationRedoEntry.eraseText(SheetTextAnnotation text) {
    return SheetAnnotationRedoEntry._(text: text, type: eraseTextType);
  }

  final SheetAnnotationStroke? stroke;
  final SheetTextAnnotation? text;
  final String type;

  int get pageNumber => stroke?.pageNumber ?? text?.pageNumber ?? 0;

  bool get erasesAnnotation {
    return type == eraseStrokeType || type == eraseTextType;
  }

  bool get isValid {
    if (stroke != null) {
      return stroke!.id.isNotEmpty && stroke!.points.isNotEmpty;
    }
    return text != null && text!.id.isNotEmpty && text!.text.isNotEmpty;
  }

  Map<String, Object?> toJson() {
    if (stroke != null) {
      return <String, Object?>{'type': type, 'payload': stroke!.toJson()};
    }
    if (text != null) {
      return <String, Object?>{'type': type, 'payload': text!.toJson()};
    }
    return <String, Object?>{'type': unknownType};
  }
}

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

String _stringFromJson(Object? value) {
  return value is String ? value : '';
}

Iterable<Map<String, Object?>> _jsonMaps(Object? value) {
  return _jsonList(value).map(_asJsonMap).whereType<Map<String, Object?>>();
}
