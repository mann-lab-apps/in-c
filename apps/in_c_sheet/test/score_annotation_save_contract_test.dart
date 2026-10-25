import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_annotation.dart';

import 'adoption_pilot_test.dart' as pilot;

void main() {
  test('annotation pending and failed writes retain the published layer; retry saves once', () async {
    final store = pilot.PendingStore();
    final c = await pilot.library(store: store);
    addTearDown(c.dispose);
    final before = c.scoreById('pilot-0');
    final stroke = SheetAnnotationStroke(
      id: 'r2-stroke',
      pageNumber: 1,
      tool: SheetAnnotationTool.pen,
      color: 0xff111111,
      width: 3.5,
      points: const [
        SheetAnnotationPoint(x: .2, y: .3),
        SheetAnnotationPoint(x: .3, y: .3),
      ],
      createdAt: DateTime(2026, 10, 25),
    );
    store.gate = Completer<void>();
    final pending = c.addAnnotationStroke(before, stroke);
    final failure = expectLater(pending, throwsStateError);
    final during = c.scoreById('pilot-0');
    store.gate!.completeError(StateError('injected annotation write failure'));
    await failure;
    expect(during, same(before));
    expect(c.scoreById('pilot-0'), same(before));
    store.gate = null;
    await c.addAnnotationStroke(before, stroke);
    expect(c.scoreById('pilot-0').annotationLayer.strokes.single.id, stroke.id);
    expect(
      (await store.loadScores())
          .singleWhere((s) => s.id == before.id)
          .annotationLayer
          .strokes
          .single
          .id,
      stroke.id,
    );
  });
}
