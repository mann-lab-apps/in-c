import 'dart:math' as math;

enum SheetAnnotationTool {
  pen,
  highlighter;

  static SheetAnnotationTool fromName(String? name) {
    return SheetAnnotationTool.values.firstWhere(
      (tool) => tool.name == name,
      orElse: () => SheetAnnotationTool.pen,
    );
  }
}

class SheetAnnotationPoint {
  const SheetAnnotationPoint({required this.x, required this.y});

  factory SheetAnnotationPoint.fromJson(Map<String, Object?> json) {
    return SheetAnnotationPoint(
      x: _normalizeCoordinate(json['x']),
      y: _normalizeCoordinate(json['y']),
    );
  }

  final double x;
  final double y;

  Map<String, Object?> toJson() {
    return <String, Object?>{'x': x, 'y': y};
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
    final pageNumber = json['pageNumber'] as int? ?? 1;
    return SheetAnnotationStroke(
      id: json['id'] as String? ?? '',
      pageNumber: pageNumber < 1 ? 1 : pageNumber,
      tool: SheetAnnotationTool.fromName(json['tool'] as String?),
      color: json['color'] as int? ?? 0xff111111,
      width: _normalizeWidth(json['width']),
      points: _parsePoints(json['points']),
      createdAt:
          DateTime.tryParse(json['createdAt'] as String? ?? '') ??
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
    return (value as List<dynamic>? ?? const <dynamic>[])
        .whereType<Map<String, Object?>>()
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
    final pageNumber = json['pageNumber'] as int? ?? 1;
    return SheetTextAnnotation(
      id: json['id'] as String? ?? '',
      pageNumber: pageNumber < 1 ? 1 : pageNumber,
      position: SheetAnnotationPoint.fromJson(
        _asJsonMap(json['position']) ?? const <String, Object?>{},
      ),
      text: (json['text'] as String? ?? '').trim(),
      color: json['color'] as int? ?? 0xff111111,
      fontSize: _normalizeFontSize(json['fontSize']),
      createdAt:
          DateTime.tryParse(json['createdAt'] as String? ?? '') ??
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
    int? pageNumber,
    SheetAnnotationPoint? position,
    String? text,
    int? color,
    double? fontSize,
    DateTime? createdAt,
  }) {
    return SheetTextAnnotation(
      id: id,
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

class SheetAnnotationLayer {
  const SheetAnnotationLayer({
    required this.strokes,
    this.texts = const <SheetTextAnnotation>[],
  });

  factory SheetAnnotationLayer.fromJson(Map<String, Object?>? json) {
    final strokes = (json?['strokes'] as List<dynamic>? ?? const <dynamic>[])
        .whereType<Map<String, Object?>>()
        .map(SheetAnnotationStroke.fromJson)
        .where((stroke) => stroke.id.isNotEmpty && stroke.points.isNotEmpty)
        .toList();
    strokes.sort((a, b) => a.createdAt.compareTo(b.createdAt));
    final texts = (json?['texts'] as List<dynamic>? ?? const <dynamic>[])
        .whereType<Map<String, Object?>>()
        .map(SheetTextAnnotation.fromJson)
        .where((text) => text.id.isNotEmpty && text.text.isNotEmpty)
        .toList();
    texts.sort((a, b) => a.createdAt.compareTo(b.createdAt));
    return SheetAnnotationLayer(
      strokes: List<SheetAnnotationStroke>.unmodifiable(strokes),
      texts: List<SheetTextAnnotation>.unmodifiable(texts),
    );
  }

  static const empty = SheetAnnotationLayer(
    strokes: <SheetAnnotationStroke>[],
    texts: <SheetTextAnnotation>[],
  );

  final List<SheetAnnotationStroke> strokes;
  final List<SheetTextAnnotation> texts;

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
      return this;
    }
    return removeStroke(hitStroke.last.id);
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
    return removeStroke(pageStrokes.last.id);
  }

  SheetAnnotationLayer undoLastAnnotation(int pageNumber) {
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
      return removeStroke(lastStroke!.id);
    }
    return removeText(lastText.id);
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'strokes': strokes.map((stroke) => stroke.toJson()).toList(),
      'texts': texts.map((text) => text.toJson()).toList(),
    };
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
