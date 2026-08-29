import 'dart:ui';

import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_annotation.dart';
import 'package:in_c_sheet/sheet_annotation_geometry.dart';

void main() {
  test('annotation tool preset encodes, decodes, and clamps values', () {
    final preset = SheetAnnotationToolPreset.fromJson(<String, Object?>{
      'toolName': ' Stamp ',
      'color': 0xffd33232,
      'width': 99,
      'stampName': ' Cue ',
    });
    final invalidPreset = SheetAnnotationToolPreset.fromJson(
      const <String, Object?>{
        'toolName': 'laser',
        'color': 0xffd33232,
        'width': 4,
      },
    );

    expect(preset.toolName, 'stamp');
    expect(preset.color, 0xffd33232);
    expect(preset.width, 14);
    expect(preset.stampName, 'cue');
    expect(preset.isValid, isTrue);
    expect(
      SheetAnnotationToolPreset.fromJson(preset.toJson()).toJson(),
      preset.toJson(),
    );
    expect(invalidPreset.isValid, isFalse);
    expect(SheetAnnotationToolPreset.fromJson(null).isValid, isFalse);
  });

  test('annotation models normalize decimal JSON numbers', () {
    final preset = SheetAnnotationToolPreset.fromJson(<String, Object?>{
      'toolName': 'pen',
      'color': 0xff224466 + 0.2,
      'width': 4.5,
    });
    final stroke = SheetAnnotationStroke.fromJson(<String, Object?>{
      'id': 'stroke-1',
      'pageNumber': 2.6,
      'tool': 'pen',
      'color': 0xff112233 + 0.1,
      'width': 2.5,
      'points': const <Map<String, Object?>>[
        <String, Object?>{'x': 0.1, 'y': 0.2},
      ],
      'createdAt': '2026-08-27T10:00:00.000',
    });
    final text = SheetTextAnnotation.fromJson(<String, Object?>{
      'id': 'text-1',
      'pageNumber': 3.4,
      'position': const <String, Object?>{'x': 0.2, 'y': 0.3},
      'text': 'Cue',
      'color': 0xff445566 + 0.1,
      'createdAt': '2026-08-27T10:00:00.000',
    });

    expect(preset.color, 0xff224466);
    expect(stroke.pageNumber, 3);
    expect(stroke.color, 0xff112233);
    expect(text.pageNumber, 3);
    expect(text.color, 0xff445566);
  });

  test('undo and redo annotation entries preserve operation order', () {
    final now = DateTime.parse('2026-08-27T10:00:00.000');
    final stroke = SheetAnnotationStroke(
      id: 'stroke-1',
      pageNumber: 1,
      tool: SheetAnnotationTool.pen,
      color: 0xff111111,
      width: 3,
      points: const <SheetAnnotationPoint>[
        SheetAnnotationPoint(x: 0.1, y: 0.1),
        SheetAnnotationPoint(x: 0.5, y: 0.5),
      ],
      createdAt: now,
    );
    final text = SheetTextAnnotation(
      id: 'text-1',
      pageNumber: 1,
      position: const SheetAnnotationPoint(x: 0.2, y: 0.3),
      text: 'Breathe',
      color: 0xff111111,
      fontSize: 18,
      createdAt: now.add(const Duration(seconds: 1)),
    );

    final layer = SheetAnnotationLayer.empty.addStroke(stroke).addText(text);
    final undoText = layer.undoLastAnnotation(1);
    final undoStroke = undoText.undoLastAnnotation(1);
    final redoStroke = undoStroke.redoLastAnnotation(1);
    final redoText = redoStroke.redoLastAnnotation(1);

    expect(undoText.texts, isEmpty);
    expect(undoText.redoStack, hasLength(1));
    expect(undoStroke.strokes, isEmpty);
    expect(undoStroke.redoStack, hasLength(2));
    expect(redoStroke.strokes.single.id, stroke.id);
    expect(redoStroke.texts, isEmpty);
    expect(redoText.texts.single.id, text.id);
    expect(redoText.redoStack, isEmpty);
  });

  test(
    'annotation layer compacts stale pages after PDF page count changes',
    () {
      final now = DateTime.parse('2026-08-27T10:00:00.000');
      final visibleStroke = _stroke(
        id: 'visible-stroke',
        pageNumber: 2,
        createdAt: now,
      );
      final staleStroke = _stroke(
        id: 'stale-stroke',
        pageNumber: 5,
        createdAt: now.add(const Duration(seconds: 1)),
      );
      final visibleText = _text(
        id: 'visible-text',
        pageNumber: 3,
        createdAt: now.add(const Duration(seconds: 2)),
      );
      final staleText = _text(
        id: 'stale-text',
        pageNumber: 4,
        createdAt: now.add(const Duration(seconds: 3)),
      );
      final staleRedoStroke = _stroke(
        id: 'redo-stale',
        pageNumber: 6,
        createdAt: now.add(const Duration(seconds: 4)),
      );
      final layer = SheetAnnotationLayer(
        strokes: <SheetAnnotationStroke>[visibleStroke, staleStroke],
        texts: <SheetTextAnnotation>[visibleText, staleText],
        redoStack: <SheetAnnotationRedoEntry>[
          SheetAnnotationRedoEntry.stroke(staleRedoStroke),
        ],
      );

      final compacted = layer.compactForPageCount(3);

      expect(compacted.strokes.single.id, 'visible-stroke');
      expect(compacted.texts.single.id, 'visible-text');
      expect(compacted.redoStack, isEmpty);
      expect(identical(compacted.compactForPageCount(3), compacted), isTrue);
      expect(identical(layer.compactForPageCount(0), layer), isTrue);
    },
  );

  test('new annotation clears redo stack', () {
    final now = DateTime.parse('2026-08-27T10:00:00.000');
    final firstStroke = SheetAnnotationStroke(
      id: 'stroke-1',
      pageNumber: 1,
      tool: SheetAnnotationTool.pen,
      color: 0xff111111,
      width: 3,
      points: const <SheetAnnotationPoint>[
        SheetAnnotationPoint(x: 0.1, y: 0.1),
        SheetAnnotationPoint(x: 0.5, y: 0.5),
      ],
      createdAt: now,
    );
    final secondStroke = SheetAnnotationStroke(
      id: 'stroke-2',
      pageNumber: 1,
      tool: SheetAnnotationTool.highlighter,
      color: 0xffffcc25,
      width: 8,
      points: const <SheetAnnotationPoint>[
        SheetAnnotationPoint(x: 0.2, y: 0.2),
        SheetAnnotationPoint(x: 0.6, y: 0.6),
      ],
      createdAt: now.add(const Duration(seconds: 1)),
    );

    final layer = SheetAnnotationLayer.empty
        .addStroke(firstStroke)
        .undoLastAnnotation(1)
        .addStroke(secondStroke);

    expect(layer.strokes.single.id, secondStroke.id);
    expect(layer.redoStack, isEmpty);
  });

  test('annotation layer visibility and export flags round-trip safely', () {
    final now = DateTime.parse('2026-08-27T10:00:00.000');
    final stroke = _stroke(id: 'stroke-1', pageNumber: 1, createdAt: now);
    final text = _text(
      id: 'text-1',
      pageNumber: 1,
      createdAt: now.add(const Duration(seconds: 1)),
    );
    final layer = SheetAnnotationLayer(
      strokes: <SheetAnnotationStroke>[stroke],
      texts: <SheetTextAnnotation>[text],
      layers: <SheetAnnotationDisplayLayer>[
        SheetAnnotationDisplayLayer.defaultLayer.copyWith(
          isVisible: false,
          includeInExport: false,
        ),
      ],
    );

    final decoded = SheetAnnotationLayer.fromJson(layer.toJson());

    expect(decoded.strokesForPage(1), hasLength(1));
    expect(decoded.textsForPage(1), hasLength(1));
    expect(decoded.visibleStrokesForPage(1), isEmpty);
    expect(decoded.visibleTextsForPage(1), isEmpty);
    expect(decoded.exportableStrokesForPage(1), isEmpty);
    expect(decoded.exportableTextsForPage(1), isEmpty);
    expect(
      decoded
          .addStroke(
            _stroke(
              id: 'stroke-2',
              pageNumber: 1,
              createdAt: now.add(const Duration(seconds: 2)),
            ),
          )
          .isDefaultLayerVisible,
      isFalse,
    );

    final visibleForExport = decoded.withDefaultLayerState(
      isVisible: true,
      includeInExport: true,
    );

    expect(visibleForExport.visibleStrokesForPage(1), hasLength(1));
    expect(visibleForExport.exportableTextsForPage(1), hasLength(1));
  });

  test('compacts redo stack without dropping annotations', () {
    final now = DateTime.parse('2026-08-27T10:00:00.000');
    final stroke = _stroke(id: 'visible', pageNumber: 1, createdAt: now);
    final layer = SheetAnnotationLayer(
      strokes: <SheetAnnotationStroke>[stroke],
      redoStack: List<SheetAnnotationRedoEntry>.generate(
        5,
        (index) => SheetAnnotationRedoEntry.stroke(
          _stroke(
            id: 'redo-$index',
            pageNumber: 1,
            createdAt: now.add(Duration(seconds: index)),
          ),
        ),
      ),
    );

    final compacted = layer.compactRedoStack(maxEntries: 2);

    expect(compacted.strokes.single.id, 'visible');
    expect(compacted.redoStack.map((entry) => entry.stroke?.id), <String?>[
      'redo-3',
      'redo-4',
    ]);
    expect(compacted.estimatedJsonBytes, greaterThan(0));
  });

  test('annotation summary includes storage and save status', () {
    final now = DateTime.parse('2026-08-27T10:00:00.000');
    final layer = SheetAnnotationLayer(
      strokes: <SheetAnnotationStroke>[
        _stroke(id: 'stroke-1', pageNumber: 1, createdAt: now),
      ],
      redoStack: <SheetAnnotationRedoEntry>[
        SheetAnnotationRedoEntry.stroke(
          _stroke(id: 'redo-1', pageNumber: 1, createdAt: now),
        ),
      ],
    );

    final summary = layer.summary(
      storageMode: SheetAnnotationSummary.fileStorageMode,
      lastSaveStatus: 'saved',
    );

    expect(summary.strokeCount, 1);
    expect(summary.textCount, 0);
    expect(summary.redoCount, 1);
    expect(summary.pointCount, greaterThan(0));
    expect(summary.storageLabel, 'external file');
    expect(summary.compactLabel, contains('saved'));
  });

  test('annotation stroke encodes and decodes normalized points', () {
    final createdAt = DateTime.parse('2026-08-21T10:00:00.000');
    final stroke = SheetAnnotationStroke(
      id: 'stroke-1',
      pageNumber: 2,
      tool: SheetAnnotationTool.highlighter,
      color: 0xffffcc25,
      width: 8,
      points: const <SheetAnnotationPoint>[
        SheetAnnotationPoint(x: 0.2, y: 0.3, pressure: 0.7),
        SheetAnnotationPoint(x: 0.4, y: 0.5, pressure: 1.3),
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
    expect(decoded.points.first.pressure, 0.7);
    expect(decoded.points.last.y, 0.5);
    expect(decoded.points.last.pressure, 1.3);
  });

  test('annotation stroke supports arrow and rectangle tools', () {
    final createdAt = DateTime.parse('2026-08-21T10:00:00.000');
    final arrow = _stroke(
      id: 'arrow-1',
      pageNumber: 1,
      tool: SheetAnnotationTool.arrow,
      createdAt: createdAt,
    );
    final rectangle = _stroke(
      id: 'rect-1',
      pageNumber: 1,
      tool: SheetAnnotationTool.rectangle,
      createdAt: createdAt.add(const Duration(seconds: 1)),
    );

    final decodedArrow = SheetAnnotationStroke.fromJson(arrow.toJson());
    final decodedRectangle = SheetAnnotationStroke.fromJson(rectangle.toJson());

    expect(decodedArrow.tool, SheetAnnotationTool.arrow);
    expect(decodedRectangle.tool, SheetAnnotationTool.rectangle);
    expect(
      rectangle.hitTest(
        const SheetAnnotationPoint(x: 0.1, y: 0.15),
        tolerance: 0.02,
      ),
      isTrue,
    );
    expect(
      rectangle.hitTest(
        const SheetAnnotationPoint(x: 0.5, y: 0.5),
        tolerance: 0.02,
      ),
      isFalse,
    );
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

  test('annotation layer decodes dynamic JSON maps from persisted storage', () {
    final decoded = SheetAnnotationLayer.fromJson(<String, Object?>{
      'strokes': <dynamic>[
        <String, dynamic>{
          'id': 'stroke-1',
          'pageNumber': 1,
          'tool': 'arrow',
          'color': 0xff111111,
          'width': 3,
          'points': <dynamic>[
            <String, dynamic>{'x': 0.1, 'y': 0.2},
            <String, dynamic>{'x': 0.4, 'y': 0.5},
          ],
          'createdAt': '2026-08-21T10:00:00.000',
        },
      ],
      'texts': <dynamic>[
        <String, dynamic>{
          'id': 'text-1',
          'pageNumber': 1,
          'position': <String, dynamic>{'x': 0.2, 'y': 0.3},
          'text': 'Cue',
          'color': 0xff222222,
          'fontSize': 18,
          'createdAt': '2026-08-21T10:00:01.000',
        },
      ],
      'redoStack': <dynamic>[
        <String, dynamic>{
          'type': 'text',
          'payload': <String, dynamic>{
            'id': 'text-2',
            'pageNumber': 1,
            'position': <String, dynamic>{'x': 0.3, 'y': 0.4},
            'text': 'Repeat',
            'color': 0xff333333,
            'fontSize': 18,
            'createdAt': '2026-08-21T10:00:02.000',
          },
        },
      ],
    });

    expect(decoded.strokes.single.tool, SheetAnnotationTool.arrow);
    expect(decoded.strokes.single.points.last.x, 0.4);
    expect(decoded.texts.single.text, 'Cue');
    expect(decoded.redoStack.single.text?.text, 'Repeat');
  });

  test('annotation layer ignores non-list persisted fields', () {
    final decoded = SheetAnnotationLayer.fromJson(const <String, Object?>{
      'strokes': 'bad',
      'texts': <String, Object?>{'id': 'text-1'},
      'redoStack': 42,
    });

    expect(decoded.strokes, isEmpty);
    expect(decoded.texts, isEmpty);
    expect(decoded.redoStack, isEmpty);
  });

  test('annotation layer skips invalid nested records', () {
    final decoded = SheetAnnotationLayer.fromJson(<String, Object?>{
      'strokes': <dynamic>[
        <String, dynamic>{
          'id': 42,
          'pageNumber': 1,
          'tool': <String>['pen'],
          'points': <dynamic>[
            <String, dynamic>{'x': 0.1, 'y': 0.2},
          ],
          'createdAt': 7,
        },
        <String, dynamic>{
          'id': 'stroke-1',
          'pageNumber': 1,
          'tool': 'rectangle',
          'points': <dynamic>[
            <String, dynamic>{'x': 0.2, 'y': 0.3},
            <String, dynamic>{'x': 0.5, 'y': 0.6},
          ],
          'createdAt': '2026-08-21T10:00:00.000',
        },
      ],
      'texts': <dynamic>[
        <String, dynamic>{
          'id': 'text-bad',
          'pageNumber': 1,
          'text': 99,
          'createdAt': '2026-08-21T10:00:01.000',
        },
        <String, dynamic>{
          'id': 'text-1',
          'pageNumber': 1,
          'position': <String, dynamic>{'x': 0.2, 'y': 0.3},
          'text': 'Cue',
          'createdAt': 7,
        },
      ],
      'redoStack': <dynamic>[
        <String, dynamic>{
          'type': 42,
          'payload': <String, dynamic>{
            'id': 'redo-bad',
            'pageNumber': 1,
            'text': 'Bad',
          },
        },
        <String, dynamic>{
          'type': 'text',
          'payload': <String, dynamic>{
            'id': 'redo-text',
            'pageNumber': 1,
            'position': <String, dynamic>{'x': 0.4, 'y': 0.5},
            'text': 'Repeat',
            'createdAt': '2026-08-21T10:00:02.000',
          },
        },
      ],
    });

    expect(decoded.strokes, hasLength(1));
    expect(decoded.strokes.single.id, 'stroke-1');
    expect(decoded.texts, hasLength(1));
    expect(decoded.texts.single.id, 'text-1');
    expect(decoded.redoStack, hasLength(1));
    expect(decoded.redoStack.single.text?.id, 'redo-text');
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

  test('annotation erase can be undone and redone', () {
    final now = DateTime.parse('2026-08-21T10:00:00.000');
    final stroke = _stroke(
      id: 'stroke-1',
      pageNumber: 1,
      createdAt: now,
      points: const <SheetAnnotationPoint>[
        SheetAnnotationPoint(x: 0.1, y: 0.1),
        SheetAnnotationPoint(x: 0.8, y: 0.1),
      ],
    );
    final layer = SheetAnnotationLayer.empty.addStroke(stroke);

    final erased = layer.eraseAt(
      pageNumber: 1,
      point: const SheetAnnotationPoint(x: 0.4, y: 0.12),
      tolerance: 0.04,
    );
    final restored = erased.undoLastAnnotation(1);
    final erasedAgain = restored.redoLastAnnotation(1);

    expect(erased.strokes, isEmpty);
    expect(erased.eraseUndoStack.single.stroke?.id, 'stroke-1');
    expect(restored.strokes.single.id, 'stroke-1');
    expect(restored.eraseUndoStack, isEmpty);
    expect(restored.redoStack.single.erasesAnnotation, isTrue);
    expect(erasedAgain.strokes, isEmpty);
    expect(erasedAgain.redoStack, isEmpty);
  });

  test('annotation erase removes text and stamp annotations', () {
    final now = DateTime.parse('2026-08-21T10:00:00.000');
    final layer = SheetAnnotationLayer.empty.addText(
      _text(id: 'stamp-1', pageNumber: 1, createdAt: now),
    );

    final erased = layer.eraseAt(
      pageNumber: 1,
      point: const SheetAnnotationPoint(x: 0.26, y: 0.51),
      tolerance: 0.04,
    );

    expect(erased.texts, isEmpty);
  });

  test('annotation erase undo stack round-trips safely', () {
    final now = DateTime.parse('2026-08-21T10:00:00.000');
    final layer = SheetAnnotationLayer.empty
        .addText(_text(id: 'stamp-1', pageNumber: 1, createdAt: now))
        .eraseAt(
          pageNumber: 1,
          point: const SheetAnnotationPoint(x: 0.26, y: 0.51),
          tolerance: 0.04,
        );

    final decoded = SheetAnnotationLayer.fromJson(layer.toJson());
    final restored = decoded.undoLastAnnotation(1);

    expect(decoded.eraseUndoStack.single.text?.id, 'stamp-1');
    expect(restored.texts.single.id, 'stamp-1');
    expect(
      restored.redoStack.single.type,
      SheetAnnotationRedoEntry.eraseTextType,
    );
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

  test('page geometry carries stylus pressure into normalized points', () {
    const geometry = SheetAnnotationPageGeometry(
      pageRect: Rect.fromLTWH(12, 24, 200, 400),
    );

    final point = geometry.pointFromPageLocal(
      const Offset(50, 100),
      pressure: 1.25,
    );

    expect(point, isNotNull);
    expect(point!.pressure, 1.25);
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
  SheetAnnotationTool tool = SheetAnnotationTool.pen,
  List<SheetAnnotationPoint> points = const <SheetAnnotationPoint>[
    SheetAnnotationPoint(x: 0.1, y: 0.1),
    SheetAnnotationPoint(x: 0.2, y: 0.2),
  ],
}) {
  return SheetAnnotationStroke(
    id: id,
    pageNumber: pageNumber,
    tool: tool,
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
