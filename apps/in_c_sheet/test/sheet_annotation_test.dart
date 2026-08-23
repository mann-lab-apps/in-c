import 'dart:ui';

import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_annotation.dart';
import 'package:in_c_sheet/sheet_annotation_geometry.dart';

void main() {
  test('annotation stroke encodes and decodes normalized points', () {
    final createdAt = DateTime.parse('2026-08-21T10:00:00.000');
    final stroke = SheetAnnotationStroke(
      id: 'stroke-1',
      pageNumber: 2,
      tool: SheetAnnotationTool.highlighter,
      color: 0xffffcc25,
      width: 8,
      points: const <SheetAnnotationPoint>[
        SheetAnnotationPoint(x: 0.2, y: 0.3),
        SheetAnnotationPoint(x: 0.4, y: 0.5),
      ],
      createdAt: createdAt,
    );

    final decoded = SheetAnnotationStroke.fromJson(stroke.toJson());

    expect(decoded.id, 'stroke-1');
    expect(decoded.pageNumber, 2);
    expect(decoded.tool, SheetAnnotationTool.highlighter);
    expect(decoded.color, 0xffffcc25);
    expect(decoded.width, 8);
    expect(decoded.points.first.x, 0.2);
    expect(decoded.points.last.y, 0.5);
  });

  test('annotation layer filters and sorts strokes by page', () {
    final early = DateTime.parse('2026-08-21T10:00:00.000');
    final late = DateTime.parse('2026-08-21T10:01:00.000');
    final layer = SheetAnnotationLayer(
      strokes: <SheetAnnotationStroke>[
        _stroke(id: 'late', pageNumber: 1, createdAt: late),
        _stroke(id: 'other', pageNumber: 2, createdAt: early),
        _stroke(id: 'early', pageNumber: 1, createdAt: early),
      ],
    );

    final decoded = SheetAnnotationLayer.fromJson(layer.toJson());

    expect(decoded.strokesForPage(1).map((stroke) => stroke.id), <String>[
      'early',
      'late',
    ]);
  });

  test('annotation layer adds, removes, and undoes strokes', () {
    final now = DateTime.parse('2026-08-21T10:00:00.000');
    final first = _stroke(id: 'first', pageNumber: 1, createdAt: now);
    final second = _stroke(
      id: 'second',
      pageNumber: 1,
      createdAt: now.add(const Duration(seconds: 1)),
    );

    final layer = SheetAnnotationLayer.empty.addStroke(first).addStroke(second);

    expect(layer.strokesForPage(1), hasLength(2));
    expect(layer.undoLastStroke(1).strokesForPage(1).single.id, 'first');
    expect(layer.removeStroke('first').strokesForPage(1).single.id, 'second');
  });

  test('text annotation encodes and decodes normalized position', () {
    final createdAt = DateTime.parse('2026-08-21T10:00:00.000');
    final text = SheetTextAnnotation(
      id: 'text-1',
      pageNumber: 2,
      position: const SheetAnnotationPoint(x: 1.2, y: -0.2),
      text: 'Breathe',
      color: 0xffd33232,
      fontSize: 22,
      createdAt: createdAt,
    );

    final decoded = SheetTextAnnotation.fromJson(text.toJson());

    expect(decoded.id, 'text-1');
    expect(decoded.pageNumber, 2);
    expect(decoded.position.x, 1);
    expect(decoded.position.y, 0);
    expect(decoded.text, 'Breathe');
    expect(decoded.color, 0xffd33232);
    expect(decoded.fontSize, 22);
  });

  test('annotation layer filters text annotations by page', () {
    final now = DateTime.parse('2026-08-21T10:00:00.000');
    final layer = SheetAnnotationLayer.empty
        .addText(_text(id: 'page-1', pageNumber: 1, createdAt: now))
        .addText(
          _text(
            id: 'page-2',
            pageNumber: 2,
            createdAt: now.add(const Duration(seconds: 1)),
          ),
        );

    final decoded = SheetAnnotationLayer.fromJson(layer.toJson());

    expect(decoded.textsForPage(1).single.id, 'page-1');
    expect(decoded.textsForPage(2).single.id, 'page-2');
  });

  test('annotation layer updates and deletes text annotations', () {
    final now = DateTime.parse('2026-08-21T10:00:00.000');
    final layer = SheetAnnotationLayer.empty.addText(
      _text(id: 'text-1', pageNumber: 1, createdAt: now),
    );

    final updated = layer.updateText(
      layer.texts.single.copyWith(text: 'Take air'),
    );
    final removed = updated.updateText(updated.texts.single.copyWith(text: ''));

    expect(updated.texts.single.text, 'Take air');
    expect(removed.texts, isEmpty);
  });

  test('text annotation hit test finds the last matching text on a page', () {
    final now = DateTime.parse('2026-08-21T10:00:00.000');
    final layer = SheetAnnotationLayer.empty
        .addText(_text(id: 'early', pageNumber: 1, createdAt: now))
        .addText(
          _text(
            id: 'late',
            pageNumber: 1,
            createdAt: now.add(const Duration(seconds: 1)),
          ),
        );

    final hit = layer.textAt(
      pageNumber: 1,
      point: const SheetAnnotationPoint(x: 0.27, y: 0.52),
    );
    final miss = layer.textAt(
      pageNumber: 1,
      point: const SheetAnnotationPoint(x: 0.9, y: 0.9),
    );

    expect(hit?.id, 'late');
    expect(miss, isNull);
  });

  test('annotation layer undoes latest stroke or text annotation', () {
    final now = DateTime.parse('2026-08-21T10:00:00.000');
    final layer = SheetAnnotationLayer.empty
        .addStroke(_stroke(id: 'stroke-1', pageNumber: 1, createdAt: now))
        .addText(
          _text(
            id: 'text-1',
            pageNumber: 1,
            createdAt: now.add(const Duration(seconds: 1)),
          ),
        );

    final undone = layer.undoLastAnnotation(1);

    expect(undone.strokesForPage(1).single.id, 'stroke-1');
    expect(undone.textsForPage(1), isEmpty);
  });

  test('annotation hit test erases stroke by normalized segment distance', () {
    final now = DateTime.parse('2026-08-21T10:00:00.000');
    final layer = SheetAnnotationLayer.empty.addStroke(
      _stroke(
        id: 'stroke-1',
        pageNumber: 1,
        createdAt: now,
        points: const <SheetAnnotationPoint>[
          SheetAnnotationPoint(x: 0.1, y: 0.1),
          SheetAnnotationPoint(x: 0.8, y: 0.1),
        ],
      ),
    );

    final erased = layer.eraseAt(
      pageNumber: 1,
      point: const SheetAnnotationPoint(x: 0.4, y: 0.12),
      tolerance: 0.04,
    );

    expect(erased.strokes, isEmpty);
  });

  test('page geometry converts local offsets to normalized page points', () {
    const geometry = SheetAnnotationPageGeometry(
      pageRect: Rect.fromLTWH(12, 24, 200, 400),
    );

    final point = geometry.pointFromPageLocal(const Offset(50, 100));

    expect(point, isNotNull);
    expect(point!.x, 0.25);
    expect(point.y, 0.25);
  });

  test('page geometry rejects offsets outside the page box', () {
    const geometry = SheetAnnotationPageGeometry(
      pageRect: Rect.fromLTWH(0, 0, 200, 400),
    );

    expect(geometry.pointFromPageLocal(const Offset(-1, 50)), isNull);
    expect(geometry.pointFromPageLocal(const Offset(50, 401)), isNull);
  });

  test('page geometry converts normalized points to page-local offsets', () {
    const geometry = SheetAnnotationPageGeometry(
      pageRect: Rect.fromLTWH(0, 0, 200, 400),
    );

    final offset = geometry.offsetFromPoint(
      const SheetAnnotationPoint(x: 0.75, y: 0.5),
    );

    expect(offset, const Offset(150, 200));
  });

  test('page geometry normalizes erase tolerance by page size', () {
    const geometry = SheetAnnotationPageGeometry(
      pageRect: Rect.fromLTWH(0, 0, 200, 400),
    );

    expect(
      geometry.normalizedToleranceForStrokeWidth(4),
      closeTo(0.048, 0.001),
    );
  });

  test(
    'annotation layer keeps strokes isolated by page for spread overlays',
    () {
      final now = DateTime.parse('2026-08-21T10:00:00.000');
      final layer = SheetAnnotationLayer(
        strokes: <SheetAnnotationStroke>[
          _stroke(id: 'left-page', pageNumber: 2, createdAt: now),
          _stroke(
            id: 'right-page',
            pageNumber: 3,
            createdAt: now.add(const Duration(seconds: 1)),
          ),
        ],
      );

      expect(layer.strokesForPage(2).map((stroke) => stroke.id), <String>[
        'left-page',
      ]);
      expect(layer.strokesForPage(3).map((stroke) => stroke.id), <String>[
        'right-page',
      ]);
    },
  );
}

SheetAnnotationStroke _stroke({
  required String id,
  required int pageNumber,
  required DateTime createdAt,
  List<SheetAnnotationPoint> points = const <SheetAnnotationPoint>[
    SheetAnnotationPoint(x: 0.1, y: 0.1),
    SheetAnnotationPoint(x: 0.2, y: 0.2),
  ],
}) {
  return SheetAnnotationStroke(
    id: id,
    pageNumber: pageNumber,
    tool: SheetAnnotationTool.pen,
    color: 0xff111111,
    width: 3,
    points: points,
    createdAt: createdAt,
  );
}

SheetTextAnnotation _text({
  required String id,
  required int pageNumber,
  required DateTime createdAt,
}) {
  return SheetTextAnnotation(
    id: id,
    pageNumber: pageNumber,
    position: const SheetAnnotationPoint(x: 0.25, y: 0.5),
    text: 'Note',
    color: 0xff111111,
    fontSize: 18,
    createdAt: createdAt,
  );
}
