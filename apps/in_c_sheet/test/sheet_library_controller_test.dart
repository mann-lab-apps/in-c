import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_annotation.dart';
import 'package:in_c_sheet/sheet_auto_scroll.dart';
import 'package:in_c_sheet/sheet_library_backup.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_profile.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_library_view_settings.dart';
import 'package:in_c_sheet/sheet_metronome.dart';
import 'package:in_c_sheet/sheet_pdf_page_transformer.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:in_c_sheet/sheet_setlist.dart';
import 'package:in_c_sheet/sheet_tone.dart';
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
      collection: 'Etudes',
      group: 'Lesson A',
      rating: 5,
      linkedFiles: <SheetLinkedFile>[
        SheetLinkedFile(
          path: '/tmp/parts/trumpet.pdf',
          type: 'pdf',
          label: 'Trumpet part',
          createdAt: now,
        ),
        SheetLinkedFile(
          path: ' /tmp/parts/trumpet.pdf ',
          type: 'pdf',
          label: 'Duplicate part',
          createdAt: now,
        ),
      ],
      customFields: const <SheetCustomMetadataField>[
        SheetCustomMetadataField(key: 'Publisher', value: 'Mann Lab'),
        SheetCustomMetadataField(key: 'publisher', value: 'Duplicate'),
        SheetCustomMetadataField(key: 'Edition', value: ''),
      ],
    );

    final updated = controller.scores.single;
    expect(updated.title, 'Concert Etude');
    expect(updated.composer, 'Goedicke');
    expect(updated.tags, <String>['trumpet', 'Lesson']);
    expect(updated.note, 'Check high register.');
    expect(updated.collection, 'Etudes');
    expect(updated.group, 'Lesson A');
    expect(updated.rating, 5);
    expect(updated.linkedFiles, hasLength(1));
    expect(updated.linkedFiles.single.label, 'Trumpet part');
    expect(updated.customFields, hasLength(1));
    expect(updated.customFields.single.value, 'Mann Lab');

    controller.updateQuery('register');
    expect(controller.filteredScores.single.id, updated.id);
    controller.updateQuery('etudes');
    expect(controller.filteredScores.single.id, updated.id);
    controller.updateQuery('publisher');
    expect(controller.filteredScores.single.id, updated.id);
    controller.updateQuery('mann lab');
    expect(controller.filteredScores.single.id, updated.id);
  });

  test('restores automatic metadata backup and reloads controller state',
      () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[
      _score(now, id: 'auto-backup-score', title: 'Automatic Backup Score'),
    ]);

    final controller = SheetLibraryController(store: store);
    await controller.load();
    expect(controller.scores.single.id, 'auto-backup-score');

    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      'clef_scores',
      SheetScore.encodeList(const <SheetScore>[]),
    );

    final result = await controller.restoreAutomaticMetadataBackup();
    expect(result.status, SheetLibraryBackupRestoreStatus.restored);
    expect(controller.scores.single.id, 'auto-backup-score');
  });

  test('updates and reloads global viewer action defaults', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final store = SheetLibraryStore();
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await controller.updateGlobalViewerSettings(
      const SheetViewerSettings(
        displayMode: 'continuousVertical',
        halfPageTurn: true,
        pageScale: SheetViewerSettings.fitWidthScale,
        pedalMapping: SheetViewerSettings.customPedalMappingType,
        customPedalMapping: <String, String>{
          'Space': 'toggleQuickActions',
          'Tab': 'none',
        },
      ),
    );

    expect(controller.globalViewerSettings.halfPageTurn, isTrue);
    expect(
      controller.globalViewerSettings.customPedalMapping['Space'],
      'toggleQuickActions',
    );

    final nextController = SheetLibraryController(store: store);
    await nextController.load();
    expect(nextController.globalViewerSettings.pageScale, 'fitWidth');
    expect(
      nextController.globalViewerSettings.customPedalMapping['Tab'],
      'none',
    );
  });

  test('applies global viewer action defaults to newly imported scores',
      () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = _ImportScoreStore(_score(now, id: 'imported-score'));
    final controller = SheetLibraryController(store: store);
    await controller.load();
    await controller.updateGlobalViewerSettings(
      const SheetViewerSettings(
        displayMode: 'twoPage',
        halfPageTurn: true,
        pageScale: SheetViewerSettings.fullscreenScale,
        pedalMapping: SheetViewerSettings.reversedPedalMapping,
      ),
    );

    final imported = await controller.importPdf();

    expect(imported?.viewerSettings.displayMode, 'twoPage');
    expect(imported?.viewerSettings.halfPageTurn, isTrue);
    expect(
      imported?.viewerSettings.pageScale,
      SheetViewerSettings.fullscreenScale,
    );
    expect(
      imported?.viewerSettings.pedalMapping,
      SheetViewerSettings.reversedPedalMapping,
    );
  });

  test('uses collections as lightweight library profiles', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[
      _score(now, id: 'etude-1', title: 'Etude 1', collection: 'Etudes'),
      _score(now, id: 'etude-2', title: 'Etude 2', collection: 'Etudes'),
      _score(now, id: 'solo-1', title: 'Solo', collection: 'Solos'),
    ]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    expect(controller.allCollections, <String>['Etudes', 'Solos']);

    await controller.createCollectionLibrary('Warmups');
    expect(controller.libraryViewSettings.collectionQuery, 'Warmups');

    await controller.updateCollectionFilter('Etudes');
    expect(
      controller.filteredScores.map((score) => score.id),
      unorderedEquals(<String>['etude-1', 'etude-2']),
    );

    final renamedCount = await controller.renameCollectionLibrary(
      from: 'Etudes',
      to: 'Studies',
    );
    expect(renamedCount, 2);
    expect(controller.libraryViewSettings.collectionQuery, 'Studies');
    expect(controller.allCollections, <String>['Solos', 'Studies']);

    final clearedCount = await controller.clearCollectionLibrary('Studies');
    expect(clearedCount, 2);
    expect(controller.libraryViewSettings.collectionQuery, '');
    expect(
      controller.scores.where((score) => score.collection == 'Studies'),
      isEmpty,
    );
  });

  test('switches between separated library profile stores', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[
      _score(now, id: 'default-score', title: 'Default'),
    ]);
    final profile = await store.createLibraryProfile('Recital');
    await store.saveScores(<SheetScore>[
      _score(now, id: 'recital-score', title: 'Recital'),
    ]);
    await store.setActiveLibraryProfile(SheetLibraryProfile.defaultId);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    expect(controller.activeLibraryProfile.id, SheetLibraryProfile.defaultId);
    expect(controller.scores.single.id, 'default-score');

    await controller.switchLibraryProfile(profile.id);
    expect(controller.activeLibraryProfile.name, 'Recital');
    expect(controller.scores.single.id, 'recital-score');

    final didRename = await controller.renameLibraryProfile(
      id: profile.id,
      name: 'Recital 2026',
    );
    expect(didRename, isTrue);
    expect(controller.activeLibraryProfile.name, 'Recital 2026');

    final didClear = await controller.clearLibraryProfile(profile.id);
    expect(didClear, isTrue);
    expect(controller.scores, isEmpty);

    await controller.switchLibraryProfile(SheetLibraryProfile.defaultId);
    expect(controller.scores.single.id, 'default-score');
  });

  test(
    'switches between linked score parts without editing originals',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime.parse('2026-08-20T10:00:00.000');
      final store = SheetLibraryStore();
      await store.saveScores(<SheetScore>[
        _score(
          now,
          linkedFiles: <SheetLinkedFile>[
            SheetLinkedFile(
              path: '/tmp/trumpet-part.pdf',
              type: 'pdf',
              label: 'Trumpet part',
              role: SheetLinkedFile.partRole,
              createdAt: now,
            ),
          ],
        ),
      ]);

      final controller = SheetLibraryController(store: store);
      await controller.load();

      final didSwitch = await controller.switchToLinkedFile(
        controller.scores.single,
        controller.scores.single.linkedFiles.single,
      );

      final updated = controller.scores.single;
      expect(didSwitch, isTrue);
      expect(updated.filePath, '/tmp/trumpet-part.pdf');
      expect(updated.linkedFiles.single.path, '/tmp/score-1.pdf');
      expect(updated.linkedFiles.single.role, SheetLinkedFile.editedCopyRole);
    },
  );

  test(
    'updates and removes linked file metadata without deleting files',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime.parse('2026-08-20T10:00:00.000');
      final store = SheetLibraryStore();
      final linkedFile = SheetLinkedFile(
        path: '/tmp/trumpet-part.pdf',
        type: 'pdf',
        label: 'Trumpet part',
        role: SheetLinkedFile.partRole,
        createdAt: now,
      );
      await store.saveScores(<SheetScore>[
        _score(now, linkedFiles: <SheetLinkedFile>[linkedFile]),
      ]);

      final controller = SheetLibraryController(store: store);
      await controller.load();

      final didUpdate = await controller.updateLinkedFile(
        controller.scores.single,
        linkedFile.copyWith(role: SheetLinkedFile.fullScoreRole),
      );
      expect(didUpdate, isTrue);
      expect(
        controller.scores.single.linkedFiles.single.role,
        SheetLinkedFile.fullScoreRole,
      );

      final didRemove = await controller.removeLinkedFile(
        controller.scores.single,
        controller.scores.single.linkedFiles.single,
      );
      expect(didRemove, isTrue);
      expect(controller.scores.single.linkedFiles, isEmpty);
      expect(controller.scores.single.filePath, '/tmp/score-1.pdf');
    },
  );

  test('updates structured notes for rehearsal and performance use', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[_score(now)]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    await controller.updateStructuredNotes(
      controller.scores.single,
      const SheetScoreNotes(
        performance: 'Stand light low.',
        rehearsal: 'Start from letter B.',
        tuning: 'Bb trumpet, A=442.',
        instrumentation: 'Trumpet and piano.',
      ),
    );

    expect(
      controller.scores.single.structuredNotes.performance,
      'Stand light low.',
    );
    expect(
      (await store.loadScores()).single.structuredNotes.tuning,
      'Bb trumpet, A=442.',
    );
  });

  test('tracks pinned, favorite, and recent quick access scores', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    final older = _score(now, id: 'older', title: 'Older', lastOpenedAt: now);
    final newer = _score(
      now,
      id: 'newer',
      title: 'Newer',
      isFavorite: true,
      lastOpenedAt: now.add(const Duration(minutes: 2)),
    );
    final pinned = _score(now, id: 'pinned', title: 'Pinned').copyWith(
      isPinned: true,
      lastOpenedAt: now.add(const Duration(minutes: 1)),
    );
    await store.saveScores(<SheetScore>[older, newer, pinned]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    expect(controller.recentScores.map((score) => score.id), <String>[
      'newer',
      'pinned',
      'older',
    ]);
    expect(controller.favoriteScores.single.id, 'newer');
    expect(controller.pinnedScores.single.id, 'pinned');

    await controller.togglePinned(controller.scoreById('older'));
    expect(controller.pinnedScores.map((score) => score.id), <String>[
      'pinned',
      'older',
    ]);
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
        pageScale: SheetViewerSettings.fullscreenScale,
        pedalMapping: SheetViewerSettings.reversedPedalMapping,
        renderProfile: SheetViewerSettings.largePdfRenderProfile,
        pageTurnAnimation: SheetViewerSettings.noPageTurnAnimation,
        keepAwakeInPerformance: true,
        showPerformancePrepNotice: false,
        confirmSetlistTransition: false,
        autoAdvanceSetlist: true,
        allowPerformanceAnnotations: true,
        allowPerformanceMenus: true,
        allowPerformancePdfLinks: true,
      ),
    );
    expect(
      controller.scores.single.viewerSettings.displayMode,
      'continuousVertical',
    );
    expect(controller.scores.single.viewerSettings.halfPageTurn, isTrue);
    expect(
      controller.scores.single.viewerSettings.pageScale,
      SheetViewerSettings.fullscreenScale,
    );
    expect(
      controller.scores.single.viewerSettings.pedalMapping,
      SheetViewerSettings.reversedPedalMapping,
    );
    expect(
      controller.scores.single.viewerSettings.renderProfile,
      SheetViewerSettings.largePdfRenderProfile,
    );
    expect(
      controller.scores.single.viewerSettings.pageTurnAnimation,
      SheetViewerSettings.noPageTurnAnimation,
    );
    expect(
      controller.scores.single.viewerSettings.keepAwakeInPerformance,
      isTrue,
    );
    expect(
      controller.scores.single.viewerSettings.showPerformancePrepNotice,
      isFalse,
    );
    expect(
      controller.scores.single.viewerSettings.confirmSetlistTransition,
      isFalse,
    );
    expect(controller.scores.single.viewerSettings.autoAdvanceSetlist, isTrue);
    expect(
      controller.scores.single.viewerSettings.allowPerformanceAnnotations,
      isTrue,
    );
    expect(
      controller.scores.single.viewerSettings.allowPerformanceMenus,
      isTrue,
    );
    expect(
      controller.scores.single.viewerSettings.allowPerformancePdfLinks,
      isTrue,
    );

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

  test(
    'compacts stale score page data after PDF page count is known',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime.parse('2026-08-20T10:00:00.000');
      final store = SheetLibraryStore();
      final score = _score(now).copyWith(
        pageSettings: SheetPageSettings(
          hiddenPages: const <int>[1, 2, 4],
          pageRotations: const <int, int>{2: 90, 4: 180},
          pageOrder: const <int>[1, 4, 3, 2, 3],
          jumpPoints: <SheetPageJumpPoint>[
            SheetPageJumpPoint(
              id: 'outside-target',
              sourcePage: 3,
              targetPage: 4,
              label: 'Outside',
              createdAt: now,
            ),
          ],
        ),
        annotationLayer: SheetAnnotationLayer(
          strokes: <SheetAnnotationStroke>[
            SheetAnnotationStroke(
              id: 'visible-stroke',
              pageNumber: 3,
              tool: SheetAnnotationTool.pen,
              color: 0xff111111,
              width: 3,
              points: const <SheetAnnotationPoint>[
                SheetAnnotationPoint(x: 0.1, y: 0.1),
                SheetAnnotationPoint(x: 0.2, y: 0.2),
              ],
              createdAt: now,
            ),
            SheetAnnotationStroke(
              id: 'stale-stroke',
              pageNumber: 4,
              tool: SheetAnnotationTool.pen,
              color: 0xff111111,
              width: 3,
              points: const <SheetAnnotationPoint>[
                SheetAnnotationPoint(x: 0.1, y: 0.1),
                SheetAnnotationPoint(x: 0.2, y: 0.2),
              ],
              createdAt: now.add(const Duration(seconds: 1)),
            ),
          ],
          texts: <SheetTextAnnotation>[
            SheetTextAnnotation(
              id: 'stale-text',
              pageNumber: 5,
              position: const SheetAnnotationPoint(x: 0.1, y: 0.1),
              text: 'Out of range',
              color: 0xff111111,
              fontSize: 18,
              createdAt: now.add(const Duration(seconds: 2)),
            ),
          ],
        ),
      );
      await store.saveScores(<SheetScore>[score]);

      final controller = SheetLibraryController(store: store);
      await controller.load();

      await controller.compactScoreForPageCount(controller.scores.single, 3);

      final updated = controller.scores.single;
      expect(updated.pageSettings.hiddenPages, <int>[1, 2]);
      expect(updated.pageSettings.pageRotations, <int, int>{2: 90});
      expect(updated.pageSettings.pageOrder, <int>[3, 3]);
      expect(updated.pageSettings.jumpPoints, isEmpty);
      expect(updated.annotationLayer.strokes.single.id, 'visible-stroke');
      expect(updated.annotationLayer.texts, isEmpty);
      expect((await store.loadScores()).single.pageSettings.pageOrder, <int>[
        3,
        3,
      ]);
      expect(
        (await store.loadScores()).single.annotationLayer.strokes.single.id,
        'visible-stroke',
      );
    },
  );

  test(
    'applies page rotation copy and preserves original as linked file',
    () async {
      final now = DateTime.parse('2026-08-20T10:00:00.000');
      final original = _score(now).copyWith(
        pageSettings: const SheetPageSettings(
          hiddenPages: <int>[],
          pageRotations: <int, int>{2: 90},
        ),
        linkedFiles: <SheetLinkedFile>[
          SheetLinkedFile(
            path: '/tmp/score-1.pdf',
            type: 'pdf',
            label: 'Existing original',
            createdAt: now,
          ),
          SheetLinkedFile(
            path: '/tmp/part.pdf',
            type: 'pdf',
            label: 'Part',
            createdAt: now,
          ),
        ],
      );
      final store = _PageRotationCopyStore(
        scores: <SheetScore>[original],
        result: const SheetPdfPageRotationResult(
          inputPath: '/tmp/score-1.pdf',
          outputPath: '/tmp/score-1-rotated.pdf',
          pageCount: 4,
          rotatedPageCount: 1,
          didWrite: true,
        ),
      );
      final controller = SheetLibraryController(store: store);
      await controller.load();

      final result = await controller.createPageRotationAppliedCopy(
        controller.scores.single,
      );
      final updated = controller.scores.single;

      expect(result.didWrite, isTrue);
      expect(updated.filePath, '/tmp/score-1-rotated.pdf');
      expect(updated.pageSettings.pageRotations, isEmpty);
      expect(updated.linkedFiles, hasLength(2));
      expect(updated.linkedFiles.first.path, '/tmp/score-1.pdf');
      expect(updated.linkedFiles.first.label, '회전 적용 전 원본');
      expect(updated.linkedFiles.last.label, 'Part');
      expect(store.savedScores.single.filePath, updated.filePath);
    },
  );

  test('applies page crop copy and clears crop metadata', () async {
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final stroke = SheetAnnotationStroke(
      id: 'stroke-1',
      pageNumber: 1,
      tool: SheetAnnotationTool.pen,
      color: 0xff111111,
      width: 3,
      points: const <SheetAnnotationPoint>[
        SheetAnnotationPoint(x: 0.2, y: 0.2),
      ],
      createdAt: now,
    );
    final text = SheetTextAnnotation(
      id: 'text-1',
      pageNumber: 2,
      position: const SheetAnnotationPoint(x: 0.5, y: 0.5),
      text: 'Cue',
      color: 0xff111111,
      fontSize: 18,
      createdAt: now.add(const Duration(seconds: 1)),
    );
    final original = _score(now).copyWith(
      pageSettings: const SheetPageSettings(
        hiddenPages: <int>[],
        pageRotations: <int, int>{},
        crop: SheetCropSettings(top: 0.08),
        pageCrops: <int, SheetCropSettings>{
          2: SheetCropSettings(bottom: 0.12),
        },
      ),
      annotationLayer: SheetAnnotationLayer(
        strokes: <SheetAnnotationStroke>[stroke],
        texts: <SheetTextAnnotation>[text],
        redoStack: <SheetAnnotationRedoEntry>[
          SheetAnnotationRedoEntry.stroke(stroke),
        ],
      ),
      linkedFiles: <SheetLinkedFile>[
        SheetLinkedFile(
          path: '/tmp/score-1.pdf',
          type: 'pdf',
          label: 'Existing original',
          createdAt: now,
        ),
        SheetLinkedFile(
          path: '/tmp/part.pdf',
          type: 'pdf',
          label: 'Part',
          createdAt: now,
        ),
      ],
    );
    final store = _PageCropCopyStore(
      scores: <SheetScore>[original],
      result: const SheetPdfPageCropResult(
        inputPath: '/tmp/score-1.pdf',
        outputPath: '/tmp/score-1-cropped.pdf',
        pageCount: 4,
        croppedPageCount: 4,
        didWrite: true,
      ),
    );
    final controller = SheetLibraryController(store: store);
    await controller.load();

    final result = await controller.createPageCropAppliedCopy(
      controller.scores.single,
    );
    final updated = controller.scores.single;

    expect(result.didWrite, isTrue);
    expect(updated.filePath, '/tmp/score-1-cropped.pdf');
    expect(updated.pageSettings.crop.hasCrop, isFalse);
    expect(updated.pageSettings.pageCrops, isEmpty);
    expect(
      updated.annotationLayer.strokes.single.points.single.y,
      moreOrLessEquals((0.2 - 0.08) / 0.92),
    );
    expect(
      updated.annotationLayer.texts.single.position.y,
      moreOrLessEquals(0.5 / 0.88),
    );
    expect(
      updated.annotationLayer.redoStack.single.stroke!.points.single.y,
      moreOrLessEquals((0.2 - 0.08) / 0.92),
    );
    expect(updated.linkedFiles, hasLength(2));
    expect(updated.linkedFiles.first.path, '/tmp/score-1.pdf');
    expect(updated.linkedFiles.first.label, '자르기 적용 전 원본');
    expect(updated.linkedFiles.last.label, 'Part');
    expect(store.savedScores.single.filePath, updated.filePath);
  });

  test('applies page arrangement copy and remaps page metadata', () async {
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final stroke = SheetAnnotationStroke(
      id: 'stroke-3',
      pageNumber: 3,
      tool: SheetAnnotationTool.pen,
      color: 0xff111111,
      width: 3,
      points: const <SheetAnnotationPoint>[
        SheetAnnotationPoint(x: 0.2, y: 0.2),
      ],
      createdAt: now,
    );
    final original = _score(now).copyWith(
      lastPage: 3,
      bookmarks: <SheetBookmark>[
        SheetBookmark(pageNumber: 3, label: 'Solo', createdAt: now),
      ],
      pageSettings: SheetPageSettings(
        hiddenPages: const <int>[2],
        pageRotations: const <int, int>{3: 90},
        pageCrops: const <int, SheetCropSettings>{
          3: SheetCropSettings(left: 0.04),
        },
        pageOrder: const <int>[3, 1, 3, 2],
        jumpPoints: <SheetPageJumpPoint>[
          SheetPageJumpPoint(
            id: 'jump-1',
            sourcePage: 1,
            targetPage: 3,
            label: 'Solo',
            createdAt: now,
          ),
        ],
        rehearsalMarks: <SheetRehearsalMark>[
          SheetRehearsalMark(
            id: 'mark-1',
            pageNumber: 3,
            label: 'A',
            kind: SheetRehearsalMark.rehearsalKind,
            createdAt: now,
          ),
        ],
        blankPageInsertions: <SheetBlankPageInsertion>[
          SheetBlankPageInsertion(
            id: 'blank-1',
            afterPage: 1,
            label: 'Notes',
            createdAt: now,
          ),
        ],
        visibilityPresets: <SheetPageVisibilityPreset>[
          SheetPageVisibilityPreset(
            id: 'visibility-1',
            label: 'Hide 2',
            hiddenPages: const <int>[2],
            createdAt: now,
          ),
        ],
      ),
      annotationLayer: SheetAnnotationLayer(
        strokes: <SheetAnnotationStroke>[stroke],
        texts: <SheetTextAnnotation>[
          SheetTextAnnotation(
            id: 'text-3',
            pageNumber: 3,
            position: const SheetAnnotationPoint(x: 0.4, y: 0.5),
            text: 'Solo',
            color: 0xff222222,
            fontSize: 20,
            createdAt: now,
          ),
        ],
        redoStack: <SheetAnnotationRedoEntry>[
          SheetAnnotationRedoEntry.stroke(stroke),
        ],
      ),
    );
    final store = _PageArrangementCopyStore(
      scores: <SheetScore>[original],
      result: const SheetPdfPageArrangementResult(
        inputPath: '/tmp/score-1.pdf',
        outputPath: '/tmp/score-1-arranged.pdf',
        sourcePageCount: 3,
        outputPageCount: 4,
        insertedBlankPageCount: 1,
        didWrite: true,
        sourcePageMapping: <int, List<int>>{
          3: <int>[1, 4],
          1: <int>[2],
        },
        blankPageNumbers: <int>[3],
      ),
    );
    final controller = SheetLibraryController(store: store);
    await controller.load();

    final result = await controller.createPageArrangementAppliedCopy(
      controller.scores.single,
    );
    final updated = controller.scores.single;

    expect(result.didWrite, isTrue);
    expect(updated.filePath, '/tmp/score-1-arranged.pdf');
    expect(updated.lastPage, 1);
    expect(updated.bookmarks.single.pageNumber, 1);
    expect(updated.pageSettings.hiddenPages, isEmpty);
    expect(updated.pageSettings.pageOrder, isEmpty);
    expect(updated.pageSettings.blankPageInsertions, isEmpty);
    expect(updated.pageSettings.visibilityPresets, isEmpty);
    expect(updated.pageSettings.pageRotations, <int, int>{1: 90, 4: 90});
    expect(updated.pageSettings.pageCrops.keys, <int>[1, 4]);
    expect(updated.pageSettings.jumpPoints.single.sourcePage, 2);
    expect(updated.pageSettings.jumpPoints.single.targetPage, 1);
    expect(updated.pageSettings.rehearsalMarks.single.pageNumber, 1);
    expect(
      updated.annotationLayer.strokes.map((stroke) => stroke.pageNumber),
      <int>[1, 4],
    );
    expect(updated.annotationLayer.strokes.map((stroke) => stroke.id), <String>[
      'stroke-3-page1',
      'stroke-3-page4',
    ]);
    expect(
      updated.annotationLayer.texts.map((text) => text.pageNumber),
      <int>[1, 4],
    );
    expect(updated.annotationLayer.texts.map((text) => text.id), <String>[
      'text-3-page1',
      'text-3-page4',
    ]);
    expect(
      updated.annotationLayer.redoStack.map((entry) => entry.pageNumber),
      <int>[1, 4],
    );
    expect(updated.linkedFiles.first.label, '페이지 정리 적용 전 원본');
    expect(store.savedScores.single.filePath, updated.filePath);
  });

  test('updates virtual page order settings', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[_score(now)]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    final didMove = await controller.movePageInOrder(
      controller.scores.single,
      fromIndex: 3,
      toIndex: 1,
      pageCount: 4,
    );
    expect(didMove, isTrue);
    expect(controller.scores.single.pageSettings.pageOrder, <int>[1, 4, 2, 3]);

    final didDuplicate = await controller.duplicatePageInOrder(
      controller.scores.single,
      pageNumber: 4,
      pageCount: 4,
      orderIndex: 1,
    );
    expect(didDuplicate, isTrue);
    expect(controller.scores.single.pageSettings.pageOrder, <int>[
      1,
      4,
      4,
      2,
      3,
    ]);

    final didReset = await controller.resetPageOrder(controller.scores.single);
    expect(didReset, isTrue);
    expect(controller.scores.single.pageSettings.pageOrder, isEmpty);
  });

  test('updates page jump points', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[_score(now)]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    final didAdd = await controller.addPageJumpPoint(
      controller.scores.single,
      pageCount: 4,
      jumpPoint: SheetPageJumpPoint(
        id: 'jump-1',
        sourcePage: 1,
        targetPage: 4,
        label: 'Coda',
        createdAt: now,
      ),
    );
    expect(didAdd, isTrue);
    expect(
      controller.scores.single.pageSettings.jumpPoints.single.targetPage,
      4,
    );

    final didIgnoreInvalid = await controller.addPageJumpPoint(
      controller.scores.single,
      pageCount: 4,
      jumpPoint: SheetPageJumpPoint(
        id: 'jump-invalid',
        sourcePage: 2,
        targetPage: 2,
        label: 'Same',
        createdAt: now,
      ),
    );
    expect(didIgnoreInvalid, isFalse);

    final didRename = await controller.updatePageJumpPoint(
      controller.scores.single,
      pageCount: 4,
      jumpPoint: controller.scores.single.pageSettings.jumpPoints.single
          .copyWith(label: 'D.S. al Coda'),
    );
    expect(didRename, isTrue);
    expect(
      controller.scores.single.pageSettings.jumpPoints.single.label,
      'D.S. al Coda',
    );

    final didRemove = await controller.removePageJumpPoint(
      controller.scores.single,
      'jump-1',
    );
    expect(didRemove, isTrue);
    expect(controller.scores.single.pageSettings.jumpPoints, isEmpty);
  });

  test(
    'updates rehearsal marks, crop presets, and page template metadata',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime.parse('2026-08-20T10:00:00.000');
      final store = SheetLibraryStore();
      await store.saveScores(<SheetScore>[_score(now)]);

      final controller = SheetLibraryController(store: store);
      await controller.load();

      final didAddMark = await controller.addRehearsalMark(
        controller.scores.single,
        pageCount: 4,
        mark: SheetRehearsalMark(
          id: 'mark-1',
          pageNumber: 3,
          label: 'D.S.',
          kind: SheetRehearsalMark.dsKind,
          createdAt: now,
        ),
      );
      expect(didAddMark, isTrue);
      expect(
        controller.scores.single.pageSettings.rehearsalMarks.single.kind,
        'ds',
      );

      final didUpdateMark = await controller.updateRehearsalMark(
        controller.scores.single,
        pageCount: 4,
        mark: controller.scores.single.pageSettings.rehearsalMarks.single
            .copyWith(label: 'D.S. al Coda', pageNumber: 4),
      );
      expect(didUpdateMark, isTrue);
      expect(
        controller.scores.single.pageSettings.rehearsalMarks.single.pageNumber,
        4,
      );

      final didAddCrop = await controller.addCropPreset(
        controller.scores.single,
        SheetCropPreset(
          id: 'crop-1',
          label: 'Landscape tablet',
          scope: SheetCropPreset.allPagesScope,
          crop: const SheetCropSettings(top: 0.07),
          createdAt: now,
        ),
      );
      expect(didAddCrop, isTrue);

      final didApplyCrop = await controller.applyCropPreset(
        controller.scores.single,
        'crop-1',
      );
      expect(didApplyCrop, isTrue);
      expect(controller.scores.single.pageSettings.crop.top, 0.07);

      final didRemoveCrop = await controller.removeCropPreset(
        controller.scores.single,
        'crop-1',
      );
      expect(didRemoveCrop, isTrue);
      expect(controller.scores.single.pageSettings.cropPresets, isEmpty);

      final didAddBlankPage = await controller.addBlankPageInsertion(
        controller.scores.single,
        pageCount: 4,
        insertion: SheetBlankPageInsertion(
          id: 'blank-1',
          afterPage: 2,
          label: 'Notes',
          createdAt: now,
        ),
      );
      expect(didAddBlankPage, isTrue);

      final didAddVisibility = await controller.addVisibilityPreset(
        controller.scores.single,
        pageCount: 4,
        preset: SheetPageVisibilityPreset(
          id: 'visibility-1',
          label: 'No cover',
          hiddenPages: const <int>[1],
          createdAt: now,
        ),
      );
      expect(didAddVisibility, isTrue);

      final didApplyVisibility = await controller.applyVisibilityPreset(
        controller.scores.single,
        presetId: 'visibility-1',
        pageCount: 4,
      );
      expect(didApplyVisibility, isTrue);
      expect(controller.scores.single.pageSettings.hiddenPages, <int>[1]);

      final didRemoveBlankPage = await controller.removeBlankPageInsertion(
        controller.scores.single,
        'blank-1',
      );
      expect(didRemoveBlankPage, isTrue);

      final didRemoveVisibility = await controller.removeVisibilityPreset(
        controller.scores.single,
        'visibility-1',
      );
      expect(didRemoveVisibility, isTrue);
      expect(
        controller.scores.single.pageSettings.blankPageInsertions,
        isEmpty,
      );
      expect(controller.scores.single.pageSettings.visibilityPresets, isEmpty);
    },
  );

  test('merges PDF outline bookmarks without duplicate pages', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[
      _score(
        now,
        bookmarks: <SheetBookmark>[
          SheetBookmark(pageNumber: 2, label: 'Existing', createdAt: now),
        ],
      ),
    ]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    final didMerge = await controller.mergeBookmarksFromOutline(
      controller.scores.single,
      <SheetBookmark>[
        SheetBookmark(pageNumber: 1, label: 'Intro', createdAt: now),
        SheetBookmark(pageNumber: 2, label: 'Duplicate', createdAt: now),
        SheetBookmark(pageNumber: 4, label: 'Coda', createdAt: now),
      ],
    );

    expect(didMerge, isTrue);
    expect(
      controller.scores.single.bookmarks.map((bookmark) => bookmark.label),
      <String>['Intro', 'Existing', 'Coda'],
    );
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

  test('updates tone settings', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final store = SheetLibraryStore();
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await controller.updateToneSettings(
      const SheetToneSettings(
        rootConcertMidiNumber: 60,
        droneMode: SheetToneDroneMode.fifthOctave,
        volumePercent: 45,
      ),
    );

    expect(controller.toneSettings.rootConcertMidiNumber, 60);
    expect(controller.toneSettings.droneMode, SheetToneDroneMode.fifthOctave);
    expect(controller.toneSettings.volumePercent, 45);
    expect((await store.loadToneSettings()).rootConcertMidiNumber, 60);
    expect(
      (await store.loadToneSettings()).droneMode,
      SheetToneDroneMode.fifthOctave,
    );
  });

  test('updates and loads favorite annotation tool preset', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final store = SheetLibraryStore();
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await controller.updateFavoriteAnnotationPreset(
      const SheetAnnotationToolPreset(
        toolName: 'rectangle',
        color: 0xff1d5fd1,
        width: 6,
      ),
    );

    expect(controller.favoriteAnnotationPreset?.toolName, 'rectangle');
    expect((await store.loadFavoriteAnnotationPreset())?.color, 0xff1d5fd1);

    final nextController = SheetLibraryController(store: store);
    await nextController.load();
    expect(nextController.favoriteAnnotationPreset?.width, 6);

    await nextController.updateFavoriteAnnotationPreset(
      const SheetAnnotationToolPreset(
        toolName: 'laser',
        color: 0xff1d5fd1,
        width: 6,
      ),
    );
    expect(nextController.favoriteAnnotationPreset, isNull);
    expect(await store.loadFavoriteAnnotationPreset(), isNull);
  });

  test('clears library query and filters for empty result recovery', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[
      _score(
        now,
        id: 'score-a',
        title: 'Arban',
        composer: 'Arban',
        tags: const <String>['trumpet'],
        collection: 'Methods',
        group: 'Warmup',
        rating: 4,
      ),
    ]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    controller.updateQuery('bach');
    await controller.updateFavoriteFilter(true);
    await controller.updateTagFilter('lesson');
    await controller.updateCollectionFilter('Methods');
    await controller.updateGroupFilter('Warmup');
    await controller.updateMinimumRatingFilter(3);

    expect(controller.filteredScores, isEmpty);

    await controller.clearLibrarySearchAndFilters();

    expect(controller.query, isEmpty);
    expect(controller.libraryViewSettings.favoriteOnly, isFalse);
    expect(controller.libraryViewSettings.tagQuery, isEmpty);
    expect(controller.libraryViewSettings.collectionQuery, isEmpty);
    expect(controller.libraryViewSettings.groupQuery, isEmpty);
    expect(controller.libraryViewSettings.minimumRating, 0);
    expect(controller.filteredScores.single.title, 'Arban');
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
        cueSeconds: 5,
      ),
    );

    final settings = controller.scores.single.autoScrollSettings;
    expect(settings.durationSeconds, 300);
    expect(settings.startPage, 2);
    expect(settings.endPage, 10);
    expect(settings.cueSeconds, 5);
    expect((await store.loadScores()).single.autoScrollSettings.endPage, 10);
    expect((await store.loadScores()).single.autoScrollSettings.cueSeconds, 5);
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

    final didRedo = await controller.redoLastAnnotation(
      controller.scores.single,
      1,
    );
    expect(didRedo, isTrue);
    expect(controller.scores.single.annotationLayer.strokes, hasLength(1));
    expect(
      controller.scores.single.annotationLayer.texts.single.text,
      'More air',
    );
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
        collection: 'Etudes',
        group: 'Lesson A',
        rating: 3,
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
        collection: 'Recital',
        group: 'Solo',
        rating: 5,
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

    await controller.updateTagFilter('');
    await controller.updateCollectionFilter('Etudes');
    expect(controller.filteredScores.single.id, 'score-1');

    await controller.updateCollectionFilter('');
    await controller.updateGroupFilter('Solo');
    expect(controller.filteredScores.single.id, 'score-2');

    await controller.updateGroupFilter('');
    await controller.updateMinimumRatingFilter(4);
    expect(controller.filteredScores.single.id, 'score-2');

    await controller.updateMinimumRatingFilter(0);
    await controller.updateLibrarySortMode(SheetLibrarySortMode.rating);
    expect(controller.filteredScores.map((score) => score.id), <String>[
      'score-2',
      'score-1',
    ]);

    controller.updateQuery('alpha');
    expect(controller.filteredScores.single.id, 'score-2');
  });

  test('bulk edits filtered library metadata without deleting files', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[
      _score(
        now,
        id: 'score-1',
        tags: const <String>['old', 'brass'],
        collection: 'Archive',
      ),
      _score(now, id: 'score-2', tags: const <String>['brass']),
      _score(now, id: 'score-3', tags: const <String>['strings']),
    ]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    final changedCount = await controller.bulkEditScores(
      <String>{'score-1', 'score-2'},
      addTags: const <String>['recital', 'Brass'],
      removeTags: const <String>['old'],
      collection: 'Recital',
      group: 'Finale',
      rating: 5,
      isFavorite: true,
      isPinned: true,
    );

    expect(changedCount, 2);
    expect(controller.scoreById('score-1').tags, <String>['brass', 'recital']);
    expect(controller.scoreById('score-2').tags, <String>['brass', 'recital']);
    expect(controller.scoreById('score-1').collection, 'Recital');
    expect(controller.scoreById('score-2').group, 'Finale');
    expect(controller.scoreById('score-2').rating, 5);
    expect(controller.scoreById('score-1').isFavorite, isTrue);
    expect(controller.scoreById('score-2').isPinned, isTrue);
    expect(controller.scoreById('score-3').tags, <String>['strings']);
    expect(controller.scoreById('score-1').filePath, '/tmp/score-1.pdf');
  });

  test(
    'summarizes library facets for collection, group, and rating browsing',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime.parse('2026-08-20T10:00:00.000');
      final store = SheetLibraryStore();
      await store.saveScores(<SheetScore>[
        _score(
          now,
          id: 'score-1',
          title: 'Etude A',
          collection: 'Methods',
          group: 'Warmup',
          rating: 4,
        ),
        _score(
          now,
          id: 'score-2',
          title: 'Etude B',
          collection: 'Methods',
          group: 'Solo',
          rating: 2,
        ),
        _score(
          now,
          id: 'score-3',
          title: 'Ballad',
          collection: 'Recital',
          group: 'Solo',
          rating: 5,
        ),
      ]);

      final controller = SheetLibraryController(store: store);
      await controller.load();

      expect(
        controller.collectionFacets.map(
          (facet) => '${facet.label}:${facet.count}',
        ),
        <String>['Methods:2', 'Recital:1'],
      );
      expect(
        controller.groupFacets.map((facet) => '${facet.label}:${facet.count}'),
        <String>['Solo:2', 'Warmup:1'],
      );
      expect(
        controller.ratingFacets.map((facet) => '${facet.value}:${facet.count}'),
        <String>['5:1', '4:2', '3:2', '2:3', '1:3'],
      );
    },
  );

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

  test('updates setlist rehearsal mode settings', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[
      _score(now, id: 'score-1', title: 'First'),
      _score(
        now,
        id: 'score-2',
        title: 'Second',
      ).copyWith(
        viewerSettings: const SheetViewerSettings(
          displayMode: 'singlePage',
          halfPageTurn: false,
        ),
      ),
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

    await controller.updateSetlistRehearsalSettings(
      controller.setlists.single,
      rehearsalMode: true,
      transitionSeconds: 15,
      scoreStartPages: const <String, int>{'score-2': 3},
      scoreNotes: const <String, String>{'score-2': 'Wait for cue.'},
      viewerSettingsOverride: const SheetViewerSettings(
        displayMode: 'continuousVertical',
        halfPageTurn: true,
        pageScale: SheetViewerSettings.fitWidthScale,
        pedalMapping: SheetViewerSettings.setlistPedalMapping,
        autoAdvanceSetlist: true,
      ),
    );

    final updated = controller.setlists.single;
    expect(updated.rehearsalMode, isTrue);
    expect(updated.transitionSeconds, 15);
    expect(updated.scoreStartPages, <String, int>{'score-2': 3});
    expect(updated.scoreNotes, <String, String>{'score-2': 'Wait for cue.'});
    expect(updated.viewerSettingsOverride?.displayMode, 'continuousVertical');
    expect(updated.viewerSettingsOverride?.autoAdvanceSetlist, isTrue);
    expect(
      controller
          .viewerSettingsForScore(
            controller.scoreById('score-2'),
            setlistId: updated.id,
          )
          .pageScale,
      SheetViewerSettings.fitWidthScale,
    );

    final duplicate = await controller.duplicateSetlist(updated);
    expect(duplicate.viewerSettingsOverride?.displayMode, 'continuousVertical');

    await controller.updateSetlistRehearsalSettings(
      updated,
      clearViewerSettingsOverride: true,
    );
    expect(controller.setlistById(updated.id).viewerSettingsOverride, isNull);
    expect(
      controller
          .viewerSettingsForScore(
            controller.scoreById('score-2'),
            setlistId: updated.id,
          )
          .displayMode,
      'singlePage',
    );
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

class _PageRotationCopyStore extends SheetLibraryStore {
  _PageRotationCopyStore({
    required List<SheetScore> scores,
    required this.result,
  }) : savedScores = scores;

  List<SheetScore> savedScores;
  final SheetPdfPageRotationResult result;

  @override
  Future<List<SheetScore>> loadScores() async {
    return savedScores;
  }

  @override
  Future<List<SheetLibraryProfile>> loadLibraryProfiles() async {
    return <SheetLibraryProfile>[SheetLibraryProfile.defaultProfile];
  }

  @override
  Future<SheetLibraryProfile> loadActiveLibraryProfile() async {
    return SheetLibraryProfile.defaultProfile;
  }

  @override
  Future<void> saveScores(List<SheetScore> scores) async {
    savedScores = List<SheetScore>.unmodifiable(scores);
  }

  @override
  Future<List<SheetSetlist>> loadSetlists() async {
    return const <SheetSetlist>[];
  }

  @override
  Future<SheetMetronomeSettings> loadMetronomeSettings() async {
    return SheetMetronomeSettings.defaultSettings;
  }

  @override
  Future<SheetTunerSettings> loadTunerSettings() async {
    return SheetTunerSettings.defaultSettings;
  }

  @override
  Future<SheetLibraryViewSettings> loadLibraryViewSettings() async {
    return SheetLibraryViewSettings.defaultSettings;
  }

  @override
  Future<SheetAnnotationToolPreset?> loadFavoriteAnnotationPreset() async {
    return null;
  }

  @override
  Future<SheetPdfPageRotationResult> createPageRotationAppliedCopy(
    SheetScore score,
  ) async {
    return result;
  }
}

class _PageCropCopyStore extends SheetLibraryStore {
  _PageCropCopyStore({required List<SheetScore> scores, required this.result})
    : savedScores = scores;

  List<SheetScore> savedScores;
  final SheetPdfPageCropResult result;

  @override
  Future<List<SheetScore>> loadScores() async {
    return savedScores;
  }

  @override
  Future<List<SheetLibraryProfile>> loadLibraryProfiles() async {
    return <SheetLibraryProfile>[SheetLibraryProfile.defaultProfile];
  }

  @override
  Future<SheetLibraryProfile> loadActiveLibraryProfile() async {
    return SheetLibraryProfile.defaultProfile;
  }

  @override
  Future<void> saveScores(List<SheetScore> scores) async {
    savedScores = List<SheetScore>.unmodifiable(scores);
  }

  @override
  Future<List<SheetSetlist>> loadSetlists() async {
    return const <SheetSetlist>[];
  }

  @override
  Future<SheetMetronomeSettings> loadMetronomeSettings() async {
    return SheetMetronomeSettings.defaultSettings;
  }

  @override
  Future<SheetTunerSettings> loadTunerSettings() async {
    return SheetTunerSettings.defaultSettings;
  }

  @override
  Future<SheetLibraryViewSettings> loadLibraryViewSettings() async {
    return SheetLibraryViewSettings.defaultSettings;
  }

  @override
  Future<SheetAnnotationToolPreset?> loadFavoriteAnnotationPreset() async {
    return null;
  }

  @override
  Future<SheetPdfPageCropResult> createPageCropAppliedCopy(
    SheetScore score,
  ) async {
    return result;
  }
}

class _PageArrangementCopyStore extends SheetLibraryStore {
  _PageArrangementCopyStore({
    required List<SheetScore> scores,
    required this.result,
  }) : savedScores = scores;

  List<SheetScore> savedScores;
  final SheetPdfPageArrangementResult result;

  @override
  Future<List<SheetScore>> loadScores() async {
    return savedScores;
  }

  @override
  Future<List<SheetLibraryProfile>> loadLibraryProfiles() async {
    return <SheetLibraryProfile>[SheetLibraryProfile.defaultProfile];
  }

  @override
  Future<SheetLibraryProfile> loadActiveLibraryProfile() async {
    return SheetLibraryProfile.defaultProfile;
  }

  @override
  Future<void> saveScores(List<SheetScore> scores) async {
    savedScores = List<SheetScore>.unmodifiable(scores);
  }

  @override
  Future<List<SheetSetlist>> loadSetlists() async {
    return const <SheetSetlist>[];
  }

  @override
  Future<SheetMetronomeSettings> loadMetronomeSettings() async {
    return SheetMetronomeSettings.defaultSettings;
  }

  @override
  Future<SheetTunerSettings> loadTunerSettings() async {
    return SheetTunerSettings.defaultSettings;
  }

  @override
  Future<SheetLibraryViewSettings> loadLibraryViewSettings() async {
    return SheetLibraryViewSettings.defaultSettings;
  }

  @override
  Future<SheetAnnotationToolPreset?> loadFavoriteAnnotationPreset() async {
    return null;
  }

  @override
  Future<SheetPdfPageArrangementResult> createPageArrangementAppliedCopy(
    SheetScore score,
  ) async {
    return result;
  }
}

class _ImportScoreStore extends SheetLibraryStore {
  _ImportScoreStore(this.score);

  final SheetScore score;

  @override
  Future<SheetScore?> importPdf() async {
    return score;
  }
}

SheetScore _score(
  DateTime now, {
  String id = 'score-1',
  String title = 'Sonata',
  String composer = '',
  List<String> tags = const <String>[],
  bool isFavorite = false,
  bool isPinned = false,
  DateTime? importedAt,
  DateTime? lastOpenedAt,
  List<SheetBookmark> bookmarks = const <SheetBookmark>[],
  String collection = '',
  String group = '',
  int rating = 0,
  List<SheetLinkedFile> linkedFiles = const <SheetLinkedFile>[],
}) {
  return SheetScore(
    id: id,
    title: title,
    composer: composer,
    tags: tags,
    note: '',
    filePath: '/tmp/$id.pdf',
    collection: collection,
    group: group,
    rating: rating,
    linkedFiles: linkedFiles,
    importedAt: importedAt ?? now,
    updatedAt: now,
    lastOpenedAt: lastOpenedAt,
    lastPage: 1,
    isFavorite: isFavorite,
    isPinned: isPinned,
    bookmarks: bookmarks,
  );
}
