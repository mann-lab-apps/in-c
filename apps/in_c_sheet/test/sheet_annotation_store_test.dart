import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_annotation.dart';
import 'package:in_c_sheet/sheet_annotation_store.dart';
import 'package:in_c_sheet/sheet_score.dart';

void main() {
  late Directory tempDir;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('clef-annotations-');
  });

  tearDown(() async {
    if (tempDir.existsSync()) {
      await tempDir.delete(recursive: true);
    }
  });

  test('saves and loads file-backed annotation layers', () async {
    final store = SheetFileBackedAnnotationStore(rootDirectory: tempDir);
    final layer = _layer();

    final saveResult = await store.saveLayer(
      scoreId: 'score/unsafe id',
      layer: layer,
      savedAt: DateTime.parse('2026-08-27T10:00:00.000'),
    );
    final loadResult = await store.loadLayer(saveResult.reference);

    expect(saveResult.didSave, isTrue);
    expect(saveResult.reference.isFileBacked, isTrue);
    expect(saveResult.reference.path, contains('score_unsafe_id'));
    expect(saveResult.reference.checksum, isNotEmpty);
    expect(loadResult.didLoad, isTrue);
    expect(loadResult.layer.strokeCount, 1);
    expect(loadResult.layer.textCount, 1);
    expect(loadResult.layer.pointCount, 2);
  });

  test('returns safe fallback for missing annotation files', () async {
    final store = SheetFileBackedAnnotationStore(rootDirectory: tempDir);
    final result = await store.loadLayer(
      const SheetAnnotationStorageReference(
        mode: SheetAnnotationStorageReference.fileMode,
        path: '/missing/score.annotations.json',
      ),
    );

    expect(result.didLoad, isFalse);
    expect(result.layer.strokes, isEmpty);
    expect(result.failureReason, contains('missing'));
  });

  test('returns safe fallback for checksum mismatch', () async {
    final store = SheetFileBackedAnnotationStore(rootDirectory: tempDir);
    final saveResult = await store.saveLayer(
      scoreId: 'score-1',
      layer: _layer(),
    );
    await File(saveResult.reference.path).writeAsString('{"strokes": []}');

    final loadResult = await store.loadLayer(saveResult.reference);

    expect(loadResult.didLoad, isFalse);
    expect(loadResult.layer.strokes, isEmpty);
    expect(loadResult.failureReason, contains('checksum'));
  });

  test('returns safe fallback for corrupted annotation JSON', () async {
    final store = SheetFileBackedAnnotationStore(rootDirectory: tempDir);
    final file = File('${tempDir.path}/broken.annotations.json')
      ..writeAsStringSync('{bad json');

    final loadResult = await store.loadLayer(
      SheetAnnotationStorageReference(
        mode: SheetAnnotationStorageReference.fileMode,
        path: file.path,
      ),
    );

    expect(loadResult.didLoad, isFalse);
    expect(loadResult.layer.texts, isEmpty);
    expect(loadResult.failureReason, isNotEmpty);
  });

  test('saves and loads a 10k stroke stress-lite annotation layer', () async {
    final store = SheetFileBackedAnnotationStore(rootDirectory: tempDir);
    final layer = _largeLayer(strokeCount: 10000, pointsPerStroke: 2);
    final summary = layer.summary();

    final saveResult = await store.saveLayer(
      scoreId: 'stress-score',
      layer: layer,
      savedAt: DateTime.parse('2026-08-28T12:00:00.000'),
    );
    final loadResult = await store.loadLayer(saveResult.reference);

    expect(summary.strokeCount, 10000);
    expect(summary.pointCount, 20000);
    expect(summary.estimatedJsonBytes, greaterThan(1024 * 1024));
    expect(saveResult.didSave, isTrue);
    expect(
      await File(saveResult.reference.path).length(),
      greaterThan(1024 * 1024),
    );
    expect(loadResult.didLoad, isTrue);
    expect(loadResult.layer.strokeCount, 10000);
    expect(loadResult.layer.pointCount, 20000);
  });
}

SheetAnnotationLayer _layer() {
  final now = DateTime.parse('2026-08-27T10:00:00.000');
  return SheetAnnotationLayer(
    strokes: <SheetAnnotationStroke>[
      SheetAnnotationStroke(
        id: 'stroke-1',
        pageNumber: 1,
        tool: SheetAnnotationTool.pen,
        color: 0xff111111,
        width: 3,
        points: const <SheetAnnotationPoint>[
          SheetAnnotationPoint(x: 0.1, y: 0.1),
          SheetAnnotationPoint(x: 0.2, y: 0.2),
        ],
        createdAt: now,
      ),
    ],
    texts: <SheetTextAnnotation>[
      SheetTextAnnotation(
        id: 'text-1',
        pageNumber: 1,
        position: const SheetAnnotationPoint(x: 0.2, y: 0.3),
        text: 'Cue',
        color: 0xff111111,
        fontSize: 18,
        createdAt: now,
      ),
    ],
  );
}

SheetAnnotationLayer _largeLayer({
  required int strokeCount,
  required int pointsPerStroke,
}) {
  final now = DateTime.parse('2026-08-28T12:00:00.000');
  return SheetAnnotationLayer(
    strokes: List<SheetAnnotationStroke>.generate(strokeCount, (index) {
      return SheetAnnotationStroke(
        id: 'stress-stroke-$index',
        pageNumber: (index % 12) + 1,
        tool: SheetAnnotationTool.pen,
        color: 0xff111111,
        width: 2,
        points: List<SheetAnnotationPoint>.generate(pointsPerStroke, (
          pointIndex,
        ) {
          return SheetAnnotationPoint(
            x: 0.1 + (pointIndex * 0.05),
            y: 0.1 + ((index % 10) * 0.04),
          );
        }),
        createdAt: now.add(Duration(milliseconds: index)),
      );
    }),
  );
}
