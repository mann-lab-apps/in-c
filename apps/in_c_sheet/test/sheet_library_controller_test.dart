import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_annotation.dart';
import 'package:in_c_sheet/sheet_auto_scroll.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_library_view_settings.dart';
import 'package:in_c_sheet/sheet_metronome.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:in_c_sheet/sheet_setlist.dart';
import 'package:in_c_sheet/sheet_tuner.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  test('renames and deletes bookmarks with empty label fallback', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    final score = _score(
      now,
      bookmarks: <SheetBookmark>[
        SheetBookmark(pageNumber: 3, label: 'Solo', createdAt: now),
      ],
    );
    await store.saveScores(<SheetScore>[score]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    await controller.renameBookmark(
      controller.scoreById(score.id),
      controller.scoreById(score.id).bookmarks.single,
      '',
    );

    var updated = controller.scoreById(score.id);
    expect(updated.bookmarks.single.label, '3쪽');

    await controller.deleteBookmark(updated, updated.bookmarks.single);

    updated = controller.scoreById(score.id);
    expect(updated.bookmarks, isEmpty);
  });

  test('updates score metadata and keeps search target current', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[_score(now)]);

    final controller = SheetLibraryController(store: store);
    await controller.load();
    await controller.updateScoreMetadata(
      controller.scores.single,
      title: 'Concert Etude',
      composer: 'Goedicke',
      tags: 'trumpet, Lesson, trumpet',
      note: 'Check high register.',
    );

    final updated = controller.scores.single;
    expect(updated.title, 'Concert Etude');
    expect(updated.composer, 'Goedicke');
    expect(updated.tags, <String>['trumpet', 'Lesson']);
    expect(updated.note, 'Check high register.');

    controller.updateQuery('register');
    expect(controller.filteredScores.single.id, updated.id);
  });

  test('updates viewer and page settings', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[_score(now)]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    await controller.updateViewerSettings(
      controller.scores.single,
      const SheetViewerSettings(
        displayMode: 'continuousVertical',
        halfPageTurn: true,
      ),
    );
    expect(
      controller.scores.single.viewerSettings.displayMode,
      'continuousVertical',
    );
    expect(controller.scores.single.viewerSettings.halfPageTurn, isTrue);

    await controller.updatePageCrop(
      controller.scores.single,
      const SheetCropSettings(top: 0.08, bottom: 0.12),
    );
    expect(controller.scores.single.pageSettings.crop.top, 0.08);
    expect(controller.scores.single.pageSettings.crop.bottom, 0.12);

    final didHide = await controller.hidePage(
      controller.scores.single,
      pageNumber: 2,
      pageCount: 4,
    );
    expect(didHide, isTrue);
    expect(controller.scores.single.pageSettings.hiddenPages, <int>[2]);

    final degrees = await controller.rotatePageClockwise(
      controller.scores.single,
      3,
    );
    expect(degrees, 90);
    expect(controller.scores.single.pageSettings.pageRotations[3], 90);

    await controller.unhidePage(controller.scores.single, 2);
    expect(controller.scores.single.pageSettings.hiddenPages, isEmpty);
  });

  test('updates metronome settings', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final store = SheetLibraryStore();
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await controller.updateMetronomeSettings(
      const SheetMetronomeSettings(
        bpm: 144,
        meter: SheetMetronomeMeter.twoFour,
      ),
    );

    expect(controller.metronomeSettings.bpm, 144);
    expect(controller.metronomeSettings.meter, SheetMetronomeMeter.twoFour);
    expect((await store.loadMetronomeSettings()).bpm, 144);
  });

  test('updates tuner settings', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final store = SheetLibraryStore();
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await controller.updateTunerSettings(
      const SheetTunerSettings(
        referencePitchA4: 442,
        displayMode: SheetTunerDisplayMode.bbTrumpet,
        detectionProfile: SheetTunerDetectionProfile.bbTrumpet,
      ),
    );

    expect(controller.tunerSettings.referencePitchA4, 442);
    expect(
      controller.tunerSettings.displayMode,
      SheetTunerDisplayMode.bbTrumpet,
    );
    expect(
      controller.tunerSettings.detectionProfile,
      SheetTunerDetectionProfile.bbTrumpet,
    );
    expect((await store.loadTunerSettings()).referencePitchA4, 442);
    expect(
      (await store.loadTunerSettings()).displayMode,
      SheetTunerDisplayMode.bbTrumpet,
    );
    expect(
      (await store.loadTunerSettings()).detectionProfile,
      SheetTunerDetectionProfile.bbTrumpet,
    );
  });

  test('updates score auto scroll settings', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[_score(now)]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    await controller.updateAutoScrollSettings(
      controller.scores.single,
      const SheetAutoScrollSettings(
        durationSeconds: 300,
        startPage: 2,
        endPage: 10,
      ),
    );

    final settings = controller.scores.single.autoScrollSettings;
    expect(settings.durationSeconds, 300);
    expect(settings.startPage, 2);
    expect(settings.endPage, 10);
    expect((await store.loadScores()).single.autoScrollSettings.endPage, 10);
  });

  test('adds, erases, and undoes annotation strokes', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[_score(now)]);

    final controller = SheetLibraryController(store: store);
    await controller.load();
    final stroke = SheetAnnotationStroke(
      id: 'stroke-1',
      pageNumber: 1,
      tool: SheetAnnotationTool.pen,
      color: 0xff111111,
      width: 3,
      points: const <SheetAnnotationPoint>[
        SheetAnnotationPoint(x: 0.1, y: 0.1),
        SheetAnnotationPoint(x: 0.6, y: 0.1),
      ],
      createdAt: now,
    );

    await controller.addAnnotationStroke(controller.scores.single, stroke);
    expect(controller.scores.single.annotationLayer.strokes, hasLength(1));

    final didErase = await controller.eraseAnnotationAt(
      controller.scores.single,
      pageNumber: 1,
      point: const SheetAnnotationPoint(x: 0.2, y: 0.1),
      tolerance: 0.03,
    );
    expect(didErase, isTrue);
    expect(controller.scores.single.annotationLayer.strokes, isEmpty);

    await controller.addAnnotationStroke(controller.scores.single, stroke);
    final didUndo = await controller.undoLastAnnotationStroke(
      controller.scores.single,
      1,
    );
    expect(didUndo, isTrue);
    expect(controller.scores.single.annotationLayer.strokes, isEmpty);
  });

  test('adds text annotation and undoes latest annotation', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[_score(now)]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    await controller.addAnnotationStroke(
      controller.scores.single,
      SheetAnnotationStroke(
        id: 'stroke-1',
        pageNumber: 1,
        tool: SheetAnnotationTool.pen,
        color: 0xff111111,
        width: 3,
        points: const <SheetAnnotationPoint>[
          SheetAnnotationPoint(x: 0.1, y: 0.1),
          SheetAnnotationPoint(x: 0.6, y: 0.1),
        ],
        createdAt: now,
      ),
    );
    await controller.addTextAnnotation(
      controller.scores.single,
      SheetTextAnnotation(
        id: 'text-1',
        pageNumber: 1,
        position: const SheetAnnotationPoint(x: 0.3, y: 0.4),
        text: 'Breathe',
        color: 0xff111111,
        fontSize: 18,
        createdAt: now.add(const Duration(seconds: 1)),
      ),
    );

    expect(controller.scores.single.annotationLayer.strokes, hasLength(1));
    expect(controller.scores.single.annotationLayer.texts, hasLength(1));

    final didUpdate = await controller.updateTextAnnotation(
      controller.scores.single,
      controller.scores.single.annotationLayer.texts.single.copyWith(
        text: 'More air',
      ),
    );
    expect(didUpdate, isTrue);
    expect(
      controller.scores.single.annotationLayer.texts.single.text,
      'More air',
    );

    final didUndo = await controller.undoLastAnnotation(
      controller.scores.single,
      1,
    );
    expect(didUndo, isTrue);
    expect(controller.scores.single.annotationLayer.strokes, hasLength(1));
    expect(controller.scores.single.annotationLayer.texts, isEmpty);
  });

  test('sorts and filters library scores', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[
      _score(
        now,
        id: 'score-1',
        title: 'Zeta',
        composer: 'Bach',
        tags: const <String>['lesson'],
        isFavorite: true,
        importedAt: now,
        lastOpenedAt: now.add(const Duration(minutes: 3)),
      ),
      _score(
        now,
        id: 'score-2',
        title: 'Alpha',
        composer: 'Chopin',
        tags: const <String>['recital'],
        importedAt: now.add(const Duration(minutes: 1)),
      ),
    ]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    await controller.updateLibrarySortMode(SheetLibrarySortMode.title);
    expect(controller.filteredScores.map((score) => score.title), <String>[
      'Alpha',
      'Zeta',
    ]);

    await controller.updateFavoriteFilter(true);
    expect(controller.filteredScores.single.id, 'score-1');

    await controller.updateFavoriteFilter(false);
    await controller.updateTagFilter('recital');
    expect(controller.filteredScores.single.id, 'score-2');

    controller.updateQuery('alpha');
    expect(controller.filteredScores.single.id, 'score-2');
  });

  test('returns setlist playback context in display order', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[
      _score(now, id: 'score-1', title: 'First'),
      _score(now, id: 'score-2', title: 'Second'),
    ]);
    await store.saveSetlists(<SheetSetlist>[
      SheetSetlist(
        id: 'setlist-1',
        title: 'Recital',
        scoreIds: const <String>['score-1', 'score-2'],
        createdAt: now,
        updatedAt: now,
      ),
    ]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    final context = controller.setlistPlaybackContext(
      setlistId: 'setlist-1',
      scoreId: 'score-2',
    );

    expect(context?.title, 'Recital');
    expect(context?.positionLabel, '2/2');
  });

  test('normalizes shared import payloads', () {
    final files = normalizeSharedImportPayload(<Object?>[
      <Object?, Object?>{'path': '/tmp/a.pdf', 'name': 'score-a.pdf'},
      <Object?, Object?>{'path': '/tmp/a.pdf', 'name': 'score-a-copy.pdf'},
      <Object?, Object?>{'path': '/tmp/b.pdf', 'name': 'score-b.PDF'},
      <Object?, Object?>{'path': '/tmp/c.txt', 'name': 'notes.txt'},
      <Object?, Object?>{'path': '', 'name': 'empty.pdf'},
      'ignored',
    ]);

    expect(files.map((file) => file.path), <String>[
      '/tmp/a.pdf',
      '/tmp/b.pdf',
    ]);
    expect(files.map((file) => file.name), <String>[
      'score-a.pdf',
      'score-b.PDF',
    ]);
  });
}

SheetScore _score(
  DateTime now, {
  String id = 'score-1',
  String title = 'Sonata',
  String composer = '',
  List<String> tags = const <String>[],
  bool isFavorite = false,
  DateTime? importedAt,
  DateTime? lastOpenedAt,
  List<SheetBookmark> bookmarks = const <SheetBookmark>[],
}) {
  return SheetScore(
    id: id,
    title: title,
    composer: composer,
    tags: tags,
    note: '',
    filePath: '/tmp/$id.pdf',
    importedAt: importedAt ?? now,
    updatedAt: now,
    lastOpenedAt: lastOpenedAt,
    lastPage: 1,
    isFavorite: isFavorite,
    bookmarks: bookmarks,
  );
}
