import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_annotation.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late _DelayedScoreStore store;
  late SheetLibraryController controller;
  late SheetScore original;
  final failure = StateError('save failed');
  final now = DateTime(2026, 9, 13);
  final text = SheetTextAnnotation(
    id: 'cue',
    pageNumber: 1,
    position: const SheetAnnotationPoint(x: 0.2, y: 0.3),
    text: 'Cue',
    color: 0xff000000,
    fontSize: 18,
    createdAt: now,
  );

  setUp(() async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    store = _DelayedScoreStore();
    original = SheetScore(
      id: 'score',
      title: 'Concert',
      composer: 'Bach',
      tags: const [],
      note: '',
      filePath: '/tmp/concert.pdf',
      importedAt: now,
      updatedAt: now,
      lastOpenedAt: null,
      lastPage: 1,
      isFavorite: false,
      bookmarks: const [],
      annotationLayer: SheetAnnotationLayer(
        strokes: const [],
        texts: [text.copyWith(id: 'kept', text: 'Existing')],
      ),
    );
    await store.saveScores([original]);
    controller = SheetLibraryController(store: store);
    await controller.load();
    store.delayWrites = true;
  });

  for (final scoped in [false, true]) {
    test(
      'successful delayed score save stays in its source library: $scoped',
      () async {
        if (scoped) {
          store.delayWrites = false;
          await controller.createLibraryProfile('Source');
          await store.saveScores([original]);
          await controller.load();
          store.delayWrites = true;
        }
        final sourceId = controller.activeLibraryProfile.id;
        final pending = controller.addTextAnnotation(original, text);
        store.delayWrites = false;
        await controller.createLibraryProfile('Destination');
        store.writes.single.complete();
        await pending;
        expect(controller.scores, isEmpty);
        expect(await store.loadScores(), isEmpty);
        await controller.switchLibraryProfile(sourceId);
        expect(controller.scores.single.annotationLayer.texts, hasLength(2));
      },
    );
  }

  test(
    'failed annotation save restores the persisted score before notifying',
    () async {
      final observed = <Map<String, Object?>>[];
      controller.addListener(
        () => observed.add(controller.scores.single.toJson()),
      );
      final pending = expectLater(
        controller.addTextAnnotation(original, text),
        throwsA(same(failure)),
      );
      store.writes.single.completeError(failure);
      await pending;
      expect(controller.scores.single.toJson(), original.toJson());
      expect(observed.last, original.toJson());
      store.delayWrites = false;
      await controller.addTextAnnotation(controller.scores.single, text);
      await controller.load();
      expect(controller.scores.single.annotationLayer.texts, hasLength(2));
    },
  );

  for (final firstFails in [false, true]) {
    for (final lastFails in [false, true]) {
      test(
        'consecutive score saves recover durable state ($firstFails/$lastFails)',
        () async {
          final first = controller.toggleFavorite(original);
          final checkedFirst = firstFails
              ? expectLater(first, throwsA(same(failure)))
              : first;
          final last = controller.addTextAnnotation(
            controller.scores.single,
            text,
          );
          final checkedLast = lastFails
              ? expectLater(last, throwsA(same(failure)))
              : last;
          if (firstFails) {
            store.writes[0].completeError(failure);
          } else {
            store.writes[0].complete();
          }
          await checkedFirst;
          if (lastFails) {
            store.writes[1].completeError(failure);
          } else {
            store.writes[1].complete();
          }
          await checkedLast;
          final persisted = (await store.loadScores()).single;
          expect(controller.scores.single.toJson(), persisted.toJson());
          expect(persisted.isFavorite, !firstFails || !lastFails);
          expect(persisted.annotationLayer.texts.length, lastFails ? 1 : 2);
        },
      );
    }
  }

  test(
    'older save failure does not overwrite newer successful score',
    () async {
      final first = expectLater(
        controller.toggleFavorite(original),
        throwsA(same(failure)),
      );
      final last = controller.addTextAnnotation(controller.scores.single, text);
      store.writes[1].complete();
      await last;
      final latest = controller.scores.single.toJson();
      store.writes[0].completeError(failure);
      await first;
      expect(controller.scores.single.toJson(), latest);
      expect((await store.loadScores()).single.toJson(), latest);
    },
  );

  test('save failure does not resurrect a deleted score', () async {
    final pending = expectLater(
      controller.addTextAnnotation(original, text),
      throwsA(same(failure)),
    );
    store.delayWrites = false;
    await controller.deleteScoresByIds({original.id});
    store.writes.single.completeError(failure);
    await pending;
    expect(controller.scores, isEmpty);
    expect(await store.loadScores(), isEmpty);
  });

  test(
    'delayed recovery read cannot replace a newer successful edit',
    () async {
      store.readEntered = Completer<void>();
      store.releaseRead = Completer<void>();
      final pending = expectLater(
        controller.addTextAnnotation(original, text),
        throwsA(same(failure)),
      );
      store.writes.single.completeError(failure);
      await store.readEntered!.future;
      store.delayWrites = false;
      await controller.updateLastPage(controller.scores.single, 4);
      final latest = controller.scores.single.toJson();
      store.releaseRead!.complete();
      await pending;
      expect(controller.scores.single.toJson(), latest);
      expect((await store.loadScores()).single.toJson(), latest);
    },
  );

  test('unreadable recovery preserves the original write error', () async {
    store.failRead = true;
    final pending = expectLater(
      controller.addTextAnnotation(original, text),
      throwsA(same(failure)),
    );
    store.writes.single.completeError(failure);
    await pending;
    store.failRead = false;
    await controller.load();
    expect(controller.scores.single.toJson(), original.toJson());
  });

  test('delayed recovery cannot overwrite a newly selected library', () async {
    store.readEntered = Completer<void>();
    store.releaseRead = Completer<void>();
    final pending = expectLater(
      controller.addTextAnnotation(original, text),
      throwsA(same(failure)),
    );
    store.writes.single.completeError(failure);
    await store.readEntered!.future;
    store.delayWrites = false;
    await controller.createLibraryProfile('Other');
    final libraryId = controller.activeLibraryProfile.id;
    expect(controller.scores, isEmpty);
    store.releaseRead!.complete();
    await pending;
    expect(controller.activeLibraryProfile.id, libraryId);
    expect(controller.scores, isEmpty);
  });
}

class _DelayedScoreStore extends SheetLibraryStore {
  bool delayWrites = false;
  final writes = <Completer<void>>[];
  Completer<void>? readEntered;
  Completer<void>? releaseRead;
  bool failRead = false;

  @override
  Future<List<SheetScore>> loadScores() async {
    if (failRead) throw StateError('read failed');
    final scores = await super.loadScores();
    final entered = readEntered;
    if (entered != null && !entered.isCompleted) {
      entered.complete();
      await releaseRead!.future;
    }
    return scores;
  }

  @override
  Future<void> saveScores(List<SheetScore> scores, {String? libraryId}) async {
    if (delayWrites) {
      final completion = Completer<void>();
      writes.add(completion);
      await completion.future;
    }
    await super.saveScores(scores, libraryId: libraryId);
  }
}
