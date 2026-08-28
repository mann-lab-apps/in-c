import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_annotation.dart';
import 'package:in_c_sheet/sheet_auto_scroll.dart';
import 'package:in_c_sheet/sheet_score.dart';

void main() {
  test('SheetScore encodes and decodes library records', () {
    final importedAt = DateTime.parse('2026-08-20T10:00:00.000');
    final updatedAt = DateTime.parse('2026-08-20T10:05:00.000');
    final openedAt = DateTime.parse('2026-08-20T10:10:00.000');
    final score = SheetScore(
      id: 'score-1',
      title: 'Sonata',
      composer: 'Composer',
      tags: const <String>['lesson', 'trumpet'],
      note: 'Use second scan.',
      filePath: '/tmp/sonata.pdf',
      collection: 'Etudes',
      group: 'Lesson A',
      rating: 4,
      linkedFiles: <SheetLinkedFile>[
        SheetLinkedFile(
          path: '/tmp/sonata-part.pdf',
          type: 'pdf',
          label: 'Trumpet part',
          role: SheetLinkedFile.partRole,
          createdAt: importedAt,
        ),
      ],
      importedAt: importedAt,
      updatedAt: updatedAt,
      lastOpenedAt: openedAt,
      lastPage: 4,
      isFavorite: true,
      isPinned: true,
      bookmarks: <SheetBookmark>[
        SheetBookmark(pageNumber: 4, label: 'Solo', createdAt: importedAt),
      ],
      viewerSettings: const SheetViewerSettings(
        displayMode: 'twoPage',
        halfPageTurn: false,
        displayEffect: 'inverted',
        pageScale: SheetViewerSettings.fitWidthScale,
        pedalMapping: SheetViewerSettings.reversedSetlistPedalMapping,
        renderProfile: SheetViewerSettings.largePdfRenderProfile,
        pageTurnAnimation: SheetViewerSettings.fastPageTurnAnimation,
        keepAwakeInPerformance: true,
        showPerformancePrepNotice: false,
        confirmSetlistTransition: false,
        autoAdvanceSetlist: true,
        allowPerformanceAnnotations: true,
        allowPerformanceMenus: true,
        allowPerformancePdfLinks: true,
      ),
      pageSettings: SheetPageSettings(
        hiddenPages: <int>[3],
        pageRotations: <int, int>{4: 90},
        crop: const SheetCropSettings(top: 0.08, bottom: 0.1),
        pageOrder: <int>[1, 4, 4, 2],
        instanceRotations: const <int, int>{2: 180},
        instanceCrops: const <int, SheetCropSettings>{
          2: SheetCropSettings(top: 0.03),
        },
        jumpPoints: <SheetPageJumpPoint>[
          SheetPageJumpPoint(
            id: 'jump-1',
            sourcePage: 2,
            targetPage: 4,
            label: 'Coda',
            createdAt: importedAt,
          ),
        ],
        rehearsalMarks: <SheetRehearsalMark>[
          SheetRehearsalMark(
            id: 'mark-1',
            pageNumber: 4,
            label: 'A',
            kind: SheetRehearsalMark.rehearsalKind,
            createdAt: importedAt,
          ),
        ],
        cropPresets: <SheetCropPreset>[
          SheetCropPreset(
            id: 'crop-1',
            label: 'iPad stand',
            scope: SheetCropPreset.allPagesScope,
            crop: const SheetCropSettings(left: 0.04, right: 0.05),
            createdAt: importedAt,
          ),
        ],
        blankPageInsertions: <SheetBlankPageInsertion>[
          SheetBlankPageInsertion(
            id: 'blank-1',
            afterPage: 2,
            label: 'Notes',
            createdAt: importedAt,
          ),
        ],
        visibilityPresets: <SheetPageVisibilityPreset>[
          SheetPageVisibilityPreset(
            id: 'visibility-1',
            label: 'No cover',
            hiddenPages: const <int>[1],
            createdAt: importedAt,
          ),
        ],
      ),
      structuredNotes: const SheetScoreNotes(
        performance: 'Mute ready.',
        rehearsal: 'Start at B.',
        tuning: 'Bb trumpet.',
        instrumentation: 'Trumpet and piano.',
      ),
      customFields: const <SheetCustomMetadataField>[
        SheetCustomMetadataField(key: 'Publisher', value: 'Mann Lab'),
        SheetCustomMetadataField(key: 'Lesson', value: 'Week 3'),
      ],
      annotationLayer: SheetAnnotationLayer(
        strokes: <SheetAnnotationStroke>[
          SheetAnnotationStroke(
            id: 'stroke-1',
            pageNumber: 4,
            tool: SheetAnnotationTool.pen,
            color: 0xff111111,
            width: 3,
            points: const <SheetAnnotationPoint>[
              SheetAnnotationPoint(x: 0.1, y: 0.2),
              SheetAnnotationPoint(x: 0.2, y: 0.3),
            ],
            createdAt: importedAt,
          ),
        ],
        layers: <SheetAnnotationDisplayLayer>[
          SheetAnnotationDisplayLayer.defaultLayer.copyWith(
            isVisible: false,
            includeInExport: false,
          ),
        ],
      ),
      annotationStorage: SheetAnnotationStorageReference(
        mode: SheetAnnotationStorageReference.fileMode,
        path: '/tmp/sonata.annotations.json',
        checksum: 'abc123',
        updatedAt: updatedAt,
        lastSaveStatus: 'saved',
      ),
      pdfLinkSanitization: SheetPdfLinkSanitization(
        sanitizedFromPath: '/tmp/original-sonata.pdf',
        removedUrlLinkCount: 2,
        createdAt: updatedAt,
      ),
      autoScrollSettings: const SheetAutoScrollSettings(
        durationSeconds: 210,
        startPage: 2,
        endPage: 9,
        cueSeconds: 5,
        pausePageNumbers: <int>[4],
        repeatSections: <SheetAutoScrollRepeatSection>[
          SheetAutoScrollRepeatSection(startPage: 5, endPage: 6),
        ],
        pageDurations: <int, int>{5: 90},
        cuePoints: <SheetAutoScrollCuePoint>[
          SheetAutoScrollCuePoint(pageNumber: 5, measureNumber: 12, label: 'B'),
        ],
      ),
    );

    final encoded = SheetScore.encodeList(<SheetScore>[score]);
    final decoded = SheetScore.decodeList(encoded);

    expect(decoded, hasLength(1));
    expect(decoded.single.title, 'Sonata');
    expect(decoded.single.tags, <String>['lesson', 'trumpet']);
    expect(decoded.single.collection, 'Etudes');
    expect(decoded.single.group, 'Lesson A');
    expect(decoded.single.rating, 4);
    expect(decoded.single.linkedFiles.single.path, '/tmp/sonata-part.pdf');
    expect(decoded.single.linkedFiles.single.type, 'pdf');
    expect(decoded.single.linkedFiles.single.label, 'Trumpet part');
    expect(decoded.single.linkedFiles.single.role, SheetLinkedFile.partRole);
    expect(decoded.single.lastPage, 4);
    expect(decoded.single.isFavorite, isTrue);
    expect(decoded.single.isPinned, isTrue);
    expect(decoded.single.bookmarks.single.pageNumber, 4);
    expect(decoded.single.bookmarks.single.label, 'Solo');
    expect(decoded.single.viewerSettings.displayMode, 'twoPage');
    expect(decoded.single.viewerSettings.halfPageTurn, isFalse);
    expect(decoded.single.viewerSettings.displayEffect, 'inverted');
    expect(
      decoded.single.viewerSettings.pageScale,
      SheetViewerSettings.fitWidthScale,
    );
    expect(
      decoded.single.viewerSettings.pedalMapping,
      SheetViewerSettings.reversedSetlistPedalMapping,
    );
    expect(
      decoded.single.viewerSettings.renderProfile,
      SheetViewerSettings.largePdfRenderProfile,
    );
    expect(
      decoded.single.viewerSettings.pageTurnAnimation,
      SheetViewerSettings.fastPageTurnAnimation,
    );
    expect(decoded.single.viewerSettings.keepAwakeInPerformance, isTrue);
    expect(decoded.single.viewerSettings.showPerformancePrepNotice, isFalse);
    expect(decoded.single.viewerSettings.confirmSetlistTransition, isFalse);
    expect(decoded.single.viewerSettings.autoAdvanceSetlist, isTrue);
    expect(decoded.single.viewerSettings.allowPerformanceAnnotations, isTrue);
    expect(decoded.single.viewerSettings.allowPerformanceMenus, isTrue);
    expect(decoded.single.viewerSettings.allowPerformancePdfLinks, isTrue);
    expect(decoded.single.pageSettings.hiddenPages, <int>[3]);
    expect(decoded.single.pageSettings.pageRotations, <int, int>{4: 90});
    expect(decoded.single.pageSettings.crop.top, 0.08);
    expect(decoded.single.pageSettings.crop.bottom, 0.1);
    expect(decoded.single.pageSettings.pageOrder, <int>[1, 4, 4, 2]);
    expect(decoded.single.pageSettings.instanceRotations, <int, int>{2: 180});
    expect(decoded.single.pageSettings.instanceCrops[2]?.top, 0.03);
    expect(decoded.single.pageSettings.jumpPoints.single.id, 'jump-1');
    expect(decoded.single.pageSettings.jumpPoints.single.sourcePage, 2);
    expect(decoded.single.pageSettings.jumpPoints.single.targetPage, 4);
    expect(decoded.single.pageSettings.jumpPoints.single.label, 'Coda');
    expect(decoded.single.pageSettings.rehearsalMarks.single.label, 'A');
    expect(
      decoded.single.pageSettings.rehearsalMarks.single.kind,
      SheetRehearsalMark.rehearsalKind,
    );
    expect(decoded.single.pageSettings.cropPresets.single.label, 'iPad stand');
    expect(decoded.single.pageSettings.cropPresets.single.crop.left, 0.04);
    expect(decoded.single.pageSettings.blankPageInsertions.single.afterPage, 2);
    expect(
      decoded.single.pageSettings.visibilityPresets.single.hiddenPages,
      <int>[1],
    );
    expect(decoded.single.structuredNotes.performance, 'Mute ready.');
    expect(decoded.single.structuredNotes.rehearsal, 'Start at B.');
    expect(decoded.single.structuredNotes.tuning, 'Bb trumpet.');
    expect(
      decoded.single.structuredNotes.instrumentation,
      'Trumpet and piano.',
    );
    expect(decoded.single.customFields, hasLength(2));
    expect(decoded.single.customFields.first.key, 'Publisher');
    expect(decoded.single.customFields.first.value, 'Mann Lab');
    expect(decoded.single.matches('week 3'), isTrue);
    expect(decoded.single.matches('publisher'), isTrue);
    expect(decoded.single.annotationLayer.strokes, hasLength(1));
    expect(decoded.single.annotationLayer.strokes.single.pageNumber, 4);
    expect(decoded.single.annotationLayer.isDefaultLayerVisible, isFalse);
    expect(decoded.single.annotationLayer.includeDefaultLayerInExport, isFalse);
    expect(decoded.single.annotationStorage.isFileBacked, isTrue);
    expect(decoded.single.annotationStorage.checksum, 'abc123');
    expect(decoded.single.annotationStorage.lastSaveStatus, 'saved');
    expect(
      decoded.single.pdfLinkSanitization.sanitizedFromPath,
      '/tmp/original-sonata.pdf',
    );
    expect(decoded.single.pdfLinkSanitization.removedUrlLinkCount, 2);
    expect(decoded.single.autoScrollSettings.durationSeconds, 210);
    expect(decoded.single.autoScrollSettings.startPage, 2);
    expect(decoded.single.autoScrollSettings.endPage, 9);
    expect(decoded.single.autoScrollSettings.cueSeconds, 5);
    expect(decoded.single.autoScrollSettings.pausePageNumbers, <int>[4]);
    expect(decoded.single.autoScrollSettings.repeatSections.single.startPage, 5);
    expect(decoded.single.autoScrollSettings.repeatSections.single.endPage, 6);
    expect(decoded.single.autoScrollSettings.pageDurations, <int, int>{5: 90});
    expect(decoded.single.autoScrollSettings.cuePoints.single.label, 'B');
    expect(decoded.single.autoScrollSettings.cuePoints.single.measureNumber, 12);
  });

  test('normalizes custom metadata fields safely', () {
    final normalized = SheetScore.normalizeCustomFields(
      const <SheetCustomMetadataField>[
        SheetCustomMetadataField(key: ' Publisher ', value: ' Mann Lab '),
        SheetCustomMetadataField(key: 'publisher', value: 'Duplicate'),
        SheetCustomMetadataField(key: 'Empty', value: ''),
        SheetCustomMetadataField(key: '', value: 'Ignored'),
      ],
    );

    expect(normalized, hasLength(1));
    expect(normalized.single.key, 'Publisher');
    expect(normalized.single.value, 'Mann Lab');
  });

  test('SheetScore decodes dynamic JSON maps from persisted storage', () {
    final decoded = SheetScore.decodeJsonList(<dynamic>[
      <String, dynamic>{
        'id': 'score-1',
        'title': 'Sonata',
        'composer': 'Composer',
        'tags': <dynamic>['lesson'],
        'note': '',
        'filePath': '/tmp/sonata.pdf',
        'linkedFiles': <dynamic>[
          <String, dynamic>{
            'path': '/tmp/part.pdf',
            'type': 'pdf',
            'label': 'Part',
            'createdAt': '2026-08-20T10:00:00.000',
          },
        ],
        'importedAt': '2026-08-20T10:00:00.000',
        'updatedAt': '2026-08-20T10:01:00.000',
        'lastPage': 2,
        'bookmarks': <dynamic>[
          <String, dynamic>{
            'pageNumber': 2,
            'label': 'Solo',
            'createdAt': '2026-08-20T10:02:00.000',
          },
        ],
        'pageSettings': <String, dynamic>{
          'hiddenPages': <dynamic>[3],
          'pageRotations': <String, dynamic>{'2': 90},
          'pageOrder': <dynamic>[1, 2, 2, 4],
          'jumpPoints': <dynamic>[
            <String, dynamic>{
              'id': 'jump-1',
              'sourcePage': 2,
              'targetPage': 4,
              'label': 'Coda',
              'createdAt': '2026-08-20T10:03:00.000',
            },
          ],
          'rehearsalMarks': <dynamic>[
            <String, dynamic>{
              'id': 'mark-1',
              'pageNumber': 2,
              'label': 'D.S.',
              'kind': 'ds',
              'createdAt': '2026-08-20T10:03:00.000',
            },
          ],
          'cropPresets': <dynamic>[
            <String, dynamic>{
              'id': 'crop-1',
              'label': 'Odd even',
              'scope': 'oddEven',
              'crop': <String, dynamic>{'left': 0.02},
              'alternateCrop': <String, dynamic>{'right': 0.03},
              'createdAt': '2026-08-20T10:03:00.000',
            },
          ],
          'blankPageInsertions': <dynamic>[
            <String, dynamic>{
              'id': 'blank-1',
              'afterPage': 1,
              'label': 'Notes',
              'createdAt': '2026-08-20T10:03:00.000',
            },
          ],
          'visibilityPresets': <dynamic>[
            <String, dynamic>{
              'id': 'visibility-1',
              'label': 'No intro',
              'hiddenPages': <dynamic>[1],
              'createdAt': '2026-08-20T10:03:00.000',
            },
          ],
        },
        'structuredNotes': <String, dynamic>{
          'performance': 'Mute ready.',
          'rehearsal': 'Start at B.',
          'tuning': 'Bb trumpet.',
          'instrumentation': 'Trumpet and piano.',
        },
        'annotationLayer': <String, dynamic>{
          'strokes': <dynamic>[
            <String, dynamic>{
              'id': 'stroke-1',
              'pageNumber': 2,
              'tool': 'rectangle',
              'color': 0xff111111,
              'width': 3,
              'points': <dynamic>[
                <String, dynamic>{'x': 0.1, 'y': 0.2},
                <String, dynamic>{'x': 0.3, 'y': 0.4},
              ],
              'createdAt': '2026-08-20T10:04:00.000',
            },
          ],
        },
        'annotationStorage': <String, dynamic>{
          'mode': 'file',
          'path': '/tmp/sonata.annotations.json',
          'checksum': 'abc123',
          'updatedAt': '2026-08-20T10:05:00.000',
          'lastSaveStatus': 'saved',
        },
      },
    ]);

    expect(decoded.single.linkedFiles.single.label, 'Part');
    expect(decoded.single.linkedFiles.single.role, SheetLinkedFile.partRole);
    expect(decoded.single.bookmarks.single.label, 'Solo');
    expect(decoded.single.pageSettings.pageRotations, <int, int>{2: 90});
    expect(decoded.single.pageSettings.pageOrder, <int>[1, 2, 2, 4]);
    expect(decoded.single.pageSettings.jumpPoints.single.label, 'Coda');
    expect(decoded.single.pageSettings.rehearsalMarks.single.kind, 'ds');
    expect(decoded.single.pageSettings.cropPresets.single.scope, 'oddEven');
    expect(
      decoded.single.pageSettings.blankPageInsertions.single.label,
      'Notes',
    );
    expect(
      decoded.single.pageSettings.visibilityPresets.single.label,
      'No intro',
    );
    expect(decoded.single.structuredNotes.performance, 'Mute ready.');
    expect(
      decoded.single.annotationLayer.strokes.single.tool,
      SheetAnnotationTool.rectangle,
    );
    expect(decoded.single.annotationStorage.isFileBacked, isTrue);
    expect(decoded.single.annotationStorage.lastSaveStatus, 'saved');
  });

  test('SheetPageSettings manages v1 completion metadata safely', () {
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final settings = SheetPageSettings.empty
        .addRehearsalMark(
          mark: SheetRehearsalMark(
            id: 'mark-1',
            pageNumber: 3,
            label: 'Coda',
            kind: SheetRehearsalMark.codaKind,
            createdAt: now,
          ),
          pageCount: 4,
        )
        .addCropPreset(
          SheetCropPreset(
            id: 'crop-1',
            label: 'Tablet',
            scope: SheetCropPreset.coverExcludedScope,
            crop: const SheetCropSettings(top: 0.05, bottom: 0.06),
            createdAt: now,
          ),
        )
        .applyCropPreset('crop-1', pageCount: 4)
        .addBlankPageInsertion(
          insertion: SheetBlankPageInsertion(
            id: 'blank-1',
            afterPage: 2,
            label: 'Cue sheet',
            createdAt: now,
          ),
          pageCount: 4,
        )
        .addVisibilityPreset(
          preset: SheetPageVisibilityPreset(
            id: 'visibility-1',
            label: 'No cover',
            hiddenPages: const <int>[1],
            createdAt: now,
          ),
          pageCount: 4,
        )
        .applyVisibilityPreset('visibility-1', 4);

    expect(settings.rehearsalMarks.single.label, 'Coda');
    expect(settings.crop.hasCrop, isFalse);
    expect(settings.cropForPage(1).hasCrop, isFalse);
    expect(settings.cropForPage(2).top, 0.05);
    expect(settings.blankPageInsertions.single.afterPage, 2);
    expect(settings.hiddenPages, <int>[1]);

    final compacted = settings
        .copyWith(
          rehearsalMarks: <SheetRehearsalMark>[
            ...settings.rehearsalMarks,
            SheetRehearsalMark(
              id: 'stale',
              pageNumber: 9,
              label: 'Bad',
              kind: SheetRehearsalMark.rehearsalKind,
              createdAt: now,
            ),
          ],
        )
        .compactForPageCount(4);

    expect(compacted.rehearsalMarks.map((mark) => mark.id), <String>['mark-1']);
    expect(compacted.hasPageTemplateMetadata, isTrue);
  });

  test('SheetPageSettings stores page crop overrides safely', () {
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final settings = SheetPageSettings.empty
        .addCropPreset(
          SheetCropPreset(
            id: 'crop-1',
            label: 'Odd even',
            scope: SheetCropPreset.oddEvenScope,
            crop: const SheetCropSettings(left: 0.04),
            alternateCrop: const SheetCropSettings(right: 0.03),
            createdAt: now,
          ),
        )
        .applyCropPreset('crop-1', pageCount: 3);

    expect(settings.crop.hasCrop, isFalse);
    expect(settings.cropForPage(1).left, 0.04);
    expect(settings.cropForPage(2).right, 0.03);
    expect(settings.cropForPage(3).left, 0.04);

    final decoded = SheetPageSettings.fromJson(settings.toJson());

    expect(decoded.cropForPage(2).right, 0.03);
    expect(decoded.compactForPageCount(2).pageCrops.keys, <int>[1, 2]);
  });

  test('SheetScore ignores non-list persisted collection fields', () {
    final decoded = SheetScore.decodeJsonList(<dynamic>[
      <String, dynamic>{
        'id': 'score-1',
        'title': 'Sonata',
        'composer': 'Composer',
        'tags': 'lesson',
        'note': '',
        'filePath': '/tmp/sonata.pdf',
        'linkedFiles': 'bad',
        'importedAt': '2026-08-20T10:00:00.000',
        'updatedAt': '2026-08-20T10:01:00.000',
        'bookmarks': <String, dynamic>{'pageNumber': 2},
        'viewerSettings': <String, dynamic>{
          'pedalMapping': 'custom',
          'customPedalMapping': <String, dynamic>{
            'Space': 'bad-action',
            'ArrowDown': 'nextPage',
          },
        },
        'pageSettings': <String, dynamic>{
          'hiddenPages': 'bad',
          'pageRotations': <String, dynamic>{'2': 90},
          'pageCrops': <String, dynamic>{
            '2': <String, dynamic>{'left': 0.04},
            'bad': <String, dynamic>{'left': 0.2},
          },
          'pageOrder': <String, dynamic>{'page': 2},
          'jumpPoints': 7,
        },
        'annotationLayer': <String, dynamic>{
          'strokes': 'bad',
          'texts': 'bad',
          'redoStack': 'bad',
        },
        'annotationStorage': <String, dynamic>{
          'mode': 'file',
          'path': '',
          'lastSaveStatus': 7,
        },
      },
    ]);

    expect(decoded.single.tags, isEmpty);
    expect(decoded.single.linkedFiles, isEmpty);
    expect(decoded.single.bookmarks, isEmpty);
    expect(decoded.single.pageSettings.hiddenPages, isEmpty);
    expect(decoded.single.pageSettings.pageRotations, <int, int>{2: 90});
    expect(
      decoded.single.viewerSettings.customPedalMapping['Space'],
      SheetViewerSettings.defaultCustomPedalMapping['Space'],
    );
    expect(
      decoded.single.viewerSettings.customPedalMapping['ArrowDown'],
      'nextPage',
    );
    expect(decoded.single.pageSettings.cropForPage(2).left, 0.04);
    expect(decoded.single.pageSettings.pageOrder, isEmpty);
    expect(decoded.single.pageSettings.jumpPoints, isEmpty);
    expect(decoded.single.annotationLayer.strokes, isEmpty);
    expect(decoded.single.annotationStorage.isExternal, isFalse);
  });

  test(
    'SheetScore skips invalid nested records without dropping the score',
    () {
      final decoded = SheetScore.decodeJsonList(<dynamic>[
        <String, dynamic>{
          'id': 'score-1',
          'title': 'Sonata',
          'composer': 'Composer',
          'tags': <dynamic>[],
          'note': '',
          'filePath': '/tmp/sonata.pdf',
          'linkedFiles': <dynamic>[
            <String, dynamic>{
              'path': 42,
              'type': 7,
              'label': 9,
              'createdAt': 'bad-date',
            },
            <String, dynamic>{
              'path': '/tmp/part.pdf',
              'type': 'pdf',
              'label': 'Part',
              'createdAt': '2026-08-20T10:02:00.000',
            },
          ],
          'importedAt': '2026-08-20T10:00:00.000',
          'updatedAt': '2026-08-20T10:01:00.000',
          'bookmarks': <dynamic>[
            <String, dynamic>{
              'pageNumber': 2,
              'label': 'Solo',
              'createdAt': 'bad-date',
            },
            <String, dynamic>{
              'pageNumber': 3,
              'label': 'Coda',
              'createdAt': '2026-08-20T10:02:00.000',
            },
          ],
          'pageSettings': <String, dynamic>{
            'jumpPoints': <dynamic>[
              <String, dynamic>{
                'id': 42,
                'sourcePage': 1,
                'targetPage': 4,
                'createdAt': '2026-08-20T10:02:30.000',
              },
              <String, dynamic>{
                'id': 'same-page',
                'sourcePage': 2,
                'targetPage': 2,
                'createdAt': '2026-08-20T10:03:00.000',
              },
              <String, dynamic>{
                'id': 'to-coda',
                'sourcePage': 2,
                'targetPage': 5,
                'label': 'Coda',
                'createdAt': '2026-08-20T10:04:00.000',
              },
            ],
          },
          'pdfLinkSanitization': <String, dynamic>{
            'sanitizedFromPath': 42,
            'removedUrlLinkCount': 3,
            'createdAt': '2026-08-20T10:05:00.000',
          },
        },
      ]);

      expect(decoded, hasLength(1));
      expect(decoded.single.linkedFiles, hasLength(1));
      expect(decoded.single.linkedFiles.single.label, 'Part');
      expect(decoded.single.bookmarks, hasLength(2));
      expect(decoded.single.bookmarks.first.label, 'Solo');
      expect(
        decoded.single.bookmarks.first.createdAt,
        DateTime.fromMillisecondsSinceEpoch(0),
      );
      expect(decoded.single.bookmarks.last.label, 'Coda');
      expect(decoded.single.pageSettings.jumpPoints, hasLength(1));
      expect(decoded.single.pageSettings.jumpPoints.single.id, 'to-coda');
      expect(decoded.single.pdfLinkSanitization.hasSanitizedCopy, isFalse);
    },
  );

  test(
    'SheetScore repairs invalid optional metadata without dropping score',
    () {
      final decoded = SheetScore.decodeJsonList(<dynamic>[
        <String, dynamic>{
          'id': ' score-1 ',
          'title': 42,
          'composer': <String>['Composer'],
          'tags': <dynamic>['lesson', '', 7, ' trumpet '],
          'note': 99,
          'filePath': ' /tmp/sonata.pdf ',
          'collection': 7,
          'group': false,
          'rating': '4',
          'importedAt': 'bad-date',
          'updatedAt': 'bad-date',
          'lastOpenedAt': 7,
          'lastPage': -2,
          'isFavorite': 'true',
          'viewerSettings': <String, dynamic>{
            'displayMode': 7,
            'halfPageTurn': 'yes',
            'displayEffect': false,
          },
        },
      ]);

      expect(decoded, hasLength(1));
      expect(decoded.single.id, 'score-1');
      expect(decoded.single.title, 'Untitled score');
      expect(decoded.single.composer, isEmpty);
      expect(decoded.single.tags, <String>['lesson', 'trumpet']);
      expect(decoded.single.note, isEmpty);
      expect(decoded.single.filePath, '/tmp/sonata.pdf');
      expect(decoded.single.collection, isEmpty);
      expect(decoded.single.group, isEmpty);
      expect(decoded.single.rating, 4);
      expect(decoded.single.importedAt, DateTime.fromMillisecondsSinceEpoch(0));
      expect(decoded.single.updatedAt, decoded.single.importedAt);
      expect(decoded.single.lastOpenedAt, isNull);
      expect(decoded.single.lastPage, 1);
      expect(decoded.single.isFavorite, isFalse);
      expect(decoded.single.isPinned, isFalse);
      expect(
        decoded.single.viewerSettings.displayMode,
        SheetViewerSettings.defaultSettings.displayMode,
      );
      expect(decoded.single.viewerSettings.halfPageTurn, isFalse);
      expect(
        decoded.single.viewerSettings.displayEffect,
        SheetViewerSettings.normalDisplayEffect,
      );
    },
  );

  test('SheetScore skips invalid persisted records', () {
    final decoded = SheetScore.decodeJsonList(<dynamic>[
      <String, dynamic>{
        'id': 'missing-file-path',
        'title': 'Broken',
        'importedAt': '2026-08-20T10:00:00.000',
        'updatedAt': '2026-08-20T10:01:00.000',
      },
      <String, dynamic>{
        'id': 'score-1',
        'title': 'Sonata',
        'composer': '',
        'tags': <dynamic>[],
        'note': '',
        'filePath': '/tmp/sonata.pdf',
        'importedAt': '2026-08-20T10:00:00.000',
        'updatedAt': '2026-08-20T10:01:00.000',
      },
    ]);

    expect(decoded, hasLength(1));
    expect(decoded.single.id, 'score-1');
    expect(SheetScore.decodeJsonList('bad'), isEmpty);
  });

  test('SheetScore returns empty list for malformed persisted JSON', () {
    expect(SheetScore.decodeList('{bad json'), isEmpty);
    expect(SheetScore.decodeList('{"not":"a list"}'), isEmpty);
  });

  test('decodes legacy records with default viewer and page settings', () {
    const encoded = '''
[
  {
    "id": "score-1",
    "title": "Aria",
    "composer": "",
    "tags": [],
    "note": "",
    "filePath": "/tmp/aria.pdf",
    "importedAt": "2026-08-20T10:00:00.000",
    "updatedAt": "2026-08-20T10:00:00.000",
    "lastOpenedAt": null,
    "lastPage": 1,
    "isFavorite": false,
    "bookmarks": []
  }
]
''';

    final decoded = SheetScore.decodeList(encoded);

    expect(
      decoded.single.viewerSettings.displayMode,
      SheetViewerSettings.defaultSettings.displayMode,
    );
    expect(decoded.single.viewerSettings.halfPageTurn, isFalse);
    expect(
      decoded.single.viewerSettings.displayEffect,
      SheetViewerSettings.normalDisplayEffect,
    );
    expect(
      decoded.single.viewerSettings.pageScale,
      SheetViewerSettings.fitPageScale,
    );
    expect(
      decoded.single.viewerSettings.pedalMapping,
      SheetViewerSettings.standardPedalMapping,
    );
    expect(
      decoded.single.viewerSettings.renderProfile,
      SheetViewerSettings.balancedRenderProfile,
    );
    expect(
      decoded.single.viewerSettings.pageTurnAnimation,
      SheetViewerSettings.naturalPageTurnAnimation,
    );
    expect(decoded.single.viewerSettings.keepAwakeInPerformance, isFalse);
    expect(decoded.single.viewerSettings.showPerformancePrepNotice, isTrue);
    expect(decoded.single.viewerSettings.confirmSetlistTransition, isTrue);
    expect(decoded.single.viewerSettings.autoAdvanceSetlist, isFalse);
    expect(decoded.single.viewerSettings.allowPerformanceAnnotations, isFalse);
    expect(decoded.single.viewerSettings.allowPerformanceMenus, isFalse);
    expect(decoded.single.viewerSettings.allowPerformancePdfLinks, isFalse);
    expect(decoded.single.pageSettings.hiddenPages, isEmpty);
    expect(decoded.single.pageSettings.pageRotations, isEmpty);
    expect(decoded.single.pageSettings.crop.hasCrop, isFalse);
    expect(decoded.single.pageSettings.pageOrder, isEmpty);
    expect(decoded.single.pageSettings.jumpPoints, isEmpty);
    expect(decoded.single.annotationLayer.strokes, isEmpty);
    expect(decoded.single.collection, isEmpty);
    expect(decoded.single.group, isEmpty);
    expect(decoded.single.rating, 0);
    expect(decoded.single.linkedFiles, isEmpty);
    expect(decoded.single.pdfLinkSanitization.hasSanitizedCopy, isFalse);
    expect(
      decoded.single.autoScrollSettings.durationSeconds,
      SheetAutoScrollSettings.defaultSettings.durationSeconds,
    );
  });

  test('viewer settings normalize unknown enum-like values', () {
    final settings = SheetViewerSettings.fromJson(const <String, Object?>{
      'displayMode': 'gallery',
      'halfPageTurn': true,
      'displayEffect': 'normal',
      'pageScale': 'poster',
      'pedalMapping': 'triplePedal',
      'renderProfile': 'unlimited',
      'pageTurnAnimation': 'dramatic',
    });

    expect(
      settings.displayMode,
      SheetViewerSettings.defaultSettings.displayMode,
    );
    expect(settings.pageScale, SheetViewerSettings.fitPageScale);
    expect(settings.pedalMapping, SheetViewerSettings.standardPedalMapping);
    expect(settings.renderProfile, SheetViewerSettings.balancedRenderProfile);
    expect(
      settings.pageTurnAnimation,
      SheetViewerSettings.naturalPageTurnAnimation,
    );
  });

  test(
    'matches query across title, composer, tags, collection, group, and note',
    () {
      final now = DateTime.parse('2026-08-20T10:00:00.000');
      final score = SheetScore(
        id: 'score-1',
        title: 'Aria',
        composer: 'Bach',
        tags: const <String>['recital'],
        note: 'Check breath marks.',
        filePath: '/tmp/aria.pdf',
        collection: 'Baroque Book',
        group: 'Lesson A',
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: null,
        lastPage: 1,
        isFavorite: false,
        bookmarks: const <SheetBookmark>[],
      );

      expect(score.matches('bach'), isTrue);
      expect(score.matches('RECITAL'), isTrue);
      expect(score.matches('baroque'), isTrue);
      expect(score.matches('lesson a'), isTrue);
      expect(score.matches('breath'), isTrue);
      expect(score.matches('mozart'), isFalse);
    },
  );

  test('normalizes rating and linked file labels', () {
    final linkedFile = SheetLinkedFile.fromJson(<String, Object?>{
      'path': '/tmp/parts/trumpet-1.pdf',
      'type': ' PDF ',
      'label': '',
      'createdAt': '2026-08-20T10:00:00.000',
    });
    final deduped = SheetScore.normalizeLinkedFiles(<SheetLinkedFile>[
      linkedFile.copyWith(path: ' /tmp/parts/trumpet-1.pdf '),
      linkedFile.copyWith(label: 'Duplicate'),
      linkedFile.copyWith(path: ''),
    ]);
    final renamed = linkedFile.copyWith(
      path: ' /tmp/parts/cue.png ',
      type: ' PNG ',
      label: ' Cue image ',
    );
    final fallbackLabel = linkedFile.copyWith(
      path: ' /tmp/parts/cue.png ',
      type: '',
      label: '',
    );

    expect(SheetScore.normalizeRating(-1), 0);
    expect(SheetScore.normalizeRating(3), 3);
    expect(SheetScore.normalizeRating(3.6), 4);
    expect(SheetScore.normalizeRating('9'), 5);
    expect(SheetScore.normalizeRating('bad'), 0);
    expect(linkedFile.type, 'pdf');
    expect(linkedFile.label, 'trumpet-1.pdf');
    expect(deduped, hasLength(1));
    expect(deduped.single.path, '/tmp/parts/trumpet-1.pdf');
    expect(deduped.single.label, 'trumpet-1.pdf');
    expect(renamed.path, '/tmp/parts/cue.png');
    expect(renamed.type, 'png');
    expect(renamed.label, 'Cue image');
    expect(fallbackLabel.type, 'pdf');
    expect(fallbackLabel.label, 'cue.png');
  });

  test('normalizes decimal JSON numbers in score metadata', () {
    final bookmark = SheetBookmark.fromJson(<String, Object?>{
      'pageNumber': 2.6,
      'createdAt': '2026-08-20T10:00:00.000',
    });
    final negativeBookmark = SheetBookmark.fromJson(<String, Object?>{
      'pageNumber': -2,
      'label': '',
      'createdAt': 'bad-date',
    });
    final labeledBookmark = SheetBookmark.fromJson(<String, Object?>{
      'pageNumber': 4,
      'label': ' Solo ',
      'createdAt': '2026-08-20T10:00:00.000',
    });
    final jumpPoint = SheetPageJumpPoint.fromJson(<String, Object?>{
      'id': 'jump-1',
      'sourcePage': 1.2,
      'targetPage': 4.7,
      'label': 42,
      'createdAt': '2026-08-20T10:00:00.000',
    });
    final sanitization = SheetPdfLinkSanitization.fromJson(<String, Object?>{
      'sanitizedFromPath': '/tmp/original.pdf',
      'removedUrlLinkCount': 2.4,
      'createdAt': '2026-08-20T10:00:00.000',
    });
    final pageSettings = SheetPageSettings.fromJson(<String, Object?>{
      'hiddenPages': <Object?>[2.1, 3.9, 'bad'],
      'pageOrder': <Object?>[1.0, 4.2, 4.0, 0.2],
      'pageRotations': <String, Object?>{
        '2': 89.6,
        '3': 180.2,
        '4': 2.4,
        '5': -90,
      },
      'instanceRotations': <String, Object?>{
        '-1': 90,
        '0': 45,
        '2': 270.2,
      },
      'instanceCrops': <String, Object?>{
        '-1': <String, Object?>{'left': 0.2},
        '1': <String, Object?>{'left': 0},
        '3': <String, Object?>{'right': 0.04},
      },
    });

    expect(bookmark.pageNumber, 3);
    expect(bookmark.label, '3쪽');
    expect(negativeBookmark.pageNumber, 1);
    expect(negativeBookmark.label, '1쪽');
    expect(negativeBookmark.createdAt, DateTime.fromMillisecondsSinceEpoch(0));
    expect(labeledBookmark.label, 'Solo');
    expect(jumpPoint.sourcePage, 1);
    expect(jumpPoint.targetPage, 5);
    expect(jumpPoint.label, '5쪽으로');
    expect(sanitization.removedUrlLinkCount, 2);
    expect(pageSettings.hiddenPages, <int>[2, 4]);
    expect(pageSettings.pageOrder, <int>[1, 4, 4]);
    expect(pageSettings.pageRotations, <int, int>{2: 90, 3: 180, 5: 270});
    expect(pageSettings.instanceRotations, <int, int>{2: 270});
    expect(pageSettings.instanceCrops[3]?.right, 0.04);
  });

  test('sorts decoded bookmarks by page number', () {
    final encoded = '''
[
  {
    "id": "score-1",
    "title": "Aria",
    "composer": "",
    "tags": [],
    "note": "",
    "filePath": "/tmp/aria.pdf",
    "importedAt": "2026-08-20T10:00:00.000",
    "updatedAt": "2026-08-20T10:00:00.000",
    "lastOpenedAt": null,
    "lastPage": 1,
    "isFavorite": false,
    "bookmarks": [
      {
        "pageNumber": 8,
        "label": "Coda",
        "createdAt": "2026-08-20T10:02:00.000"
      },
      {
        "pageNumber": 2,
        "label": "Start",
        "createdAt": "2026-08-20T10:01:00.000"
      }
    ]
  }
]
''';

    final decoded = SheetScore.decodeList(encoded);

    expect(
      decoded.single.bookmarks.map((bookmark) => bookmark.pageNumber),
      <int>[2, 8],
    );
  });

  test('page settings hide and unhide pages without hiding every page', () {
    const settings = SheetPageSettings.empty;

    final hidden = settings.hidePage(2, 3).hidePage(1, 3);

    expect(hidden.hiddenPages, <int>[1, 2]);
    expect(hidden.canHidePage(3, 3), isFalse);
    expect(identical(hidden.hidePage(3, 3), hidden), isTrue);
    expect(hidden.unhidePage(2).hiddenPages, <int>[1]);
  });

  test('page settings find next and closest visible pages', () {
    const settings = SheetPageSettings(
      hiddenPages: <int>[2, 3, 5],
      pageRotations: <int, int>{},
    );

    expect(settings.nextVisiblePage(fromPage: 1, delta: 1, pageCount: 6), 4);
    expect(settings.nextVisiblePage(fromPage: 6, delta: -1, pageCount: 6), 4);
    expect(settings.closestVisiblePage(fromPage: 3, pageCount: 6), 4);
    expect(settings.closestVisiblePage(fromPage: 5, pageCount: 6), 6);
    expect(settings.closestVisiblePage(fromPage: 0, pageCount: 0), 1);
    expect(settings.closestVisiblePage(fromPage: 3, pageCount: 0), 3);
  });

  test('page rotation metadata cycles clockwise', () {
    const settings = SheetPageSettings.empty;

    final rotated90 = settings.rotatePageClockwise(4);
    final rotated180 = rotated90.rotatePageClockwise(4);
    final rotated270 = rotated180.rotatePageClockwise(4);
    final reset = rotated270.rotatePageClockwise(4);

    expect(rotated90.pageRotations[4], 90);
    expect(rotated180.pageRotations[4], 180);
    expect(rotated270.pageRotations[4], 270);
    expect(reset.pageRotations.containsKey(4), isFalse);
  });

  test('page settings manage virtual page order and duplicates', () {
    const settings = SheetPageSettings.empty;

    final moved = settings.movePageInOrder(
      fromIndex: 3,
      toIndex: 1,
      pageCount: 4,
    );
    final duplicated = moved.duplicatePageInOrder(pageNumber: 4, pageCount: 4);
    const repeatedNonAdjacent = SheetPageSettings(
      hiddenPages: <int>[],
      pageRotations: <int, int>{},
      pageOrder: <int>[1, 4, 2, 4, 3],
    );
    final duplicatedSelectedIndex = repeatedNonAdjacent.duplicatePageInOrder(
      pageNumber: 4,
      pageCount: 4,
      orderIndex: 1,
    );
    final reset = duplicated.resetPageOrder();

    expect(settings.effectivePageOrder(4), <int>[1, 2, 3, 4]);
    expect(moved.pageOrder, <int>[1, 4, 2, 3]);
    expect(duplicated.pageOrder, <int>[1, 4, 4, 2, 3]);
    expect(duplicatedSelectedIndex.pageOrder, <int>[1, 4, 4, 2, 4, 3]);
    expect(reset.pageOrder, isEmpty);
    expect(reset.effectivePageOrder(4), <int>[1, 2, 3, 4]);
  });

  test('page settings keep per-instance crop and rotation overrides', () {
    const settings = SheetPageSettings(
      hiddenPages: <int>[],
      pageRotations: <int, int>{4: 90},
      crop: SheetCropSettings(left: 0.01),
      pageCrops: <int, SheetCropSettings>{4: SheetCropSettings(right: 0.02)},
      pageOrder: <int>[1, 4, 2, 4, 3],
      instanceRotations: <int, int>{1: 180},
      instanceCrops: <int, SheetCropSettings>{
        1: SheetCropSettings(top: 0.03),
      },
    );

    final moved = settings.movePageInOrder(
      fromIndex: 1,
      toIndex: 3,
      pageCount: 4,
    );
    final duplicated = settings.duplicatePageInOrder(
      pageNumber: 4,
      pageCount: 4,
      orderIndex: 1,
    );
    final rotatedInstance = settings.rotatePageInstanceClockwise(
      orderIndex: 1,
      pageNumber: 4,
      pageCount: 4,
    );
    final zeroRotationInstance = rotatedInstance.rotatePageInstanceClockwise(
      orderIndex: 1,
      pageNumber: 4,
      pageCount: 4,
    );
    final croppedInstance = settings.updatePageInstanceCrop(
      orderIndex: 3,
      pageCount: 4,
      crop: const SheetCropSettings(bottom: 0.04),
    );
    final decoded = SheetPageSettings.fromJson(settings.toJson());
    final compacted = settings.copyWith(
      instanceRotations: const <int, int>{1: 180, 99: 90},
      instanceCrops: const <int, SheetCropSettings>{
        1: SheetCropSettings(top: 0.03),
        99: SheetCropSettings(left: 0.05),
      },
    ).compactForPageCount(4);
    final reset = settings.resetPageOrder();

    expect(settings.rotationForPage(4), 90);
    expect(settings.rotationForPage(4, orderIndex: 1), 180);
    expect(settings.cropForPage(4).right, 0.02);
    expect(settings.cropForPage(4, orderIndex: 1).top, 0.03);
    expect(moved.pageOrder, <int>[1, 2, 4, 4, 3]);
    expect(moved.instanceRotations, <int, int>{3: 180});
    expect(duplicated.pageOrder, <int>[1, 4, 4, 2, 4, 3]);
    expect(duplicated.instanceRotations, <int, int>{1: 180, 2: 180});
    expect(rotatedInstance.instanceRotations[1], 270);
    expect(zeroRotationInstance.instanceRotations[1], 0);
    expect(zeroRotationInstance.rotationForPage(4, orderIndex: 1), 0);
    expect(croppedInstance.instanceCrops[3]?.bottom, 0.04);
    expect(decoded.instanceRotations, <int, int>{1: 180});
    expect(decoded.instanceCrops[1]?.top, 0.03);
    expect(compacted.instanceRotations, <int, int>{1: 180});
    expect(compacted.instanceCrops.keys, <int>[1]);
    expect(reset.instanceRotations, isEmpty);
    expect(reset.instanceCrops, isEmpty);
  });

  test('page settings omit hidden pages from effective page order', () {
    const plain = SheetPageSettings(
      hiddenPages: <int>[2],
      pageRotations: <int, int>{},
    );
    const repeated = SheetPageSettings(
      hiddenPages: <int>[2, 5],
      pageRotations: <int, int>{},
      pageOrder: <int>[1, 5, 4, 4, 2, 3],
    );
    const onlyHiddenCustomOrder = SheetPageSettings(
      hiddenPages: <int>[1, 2],
      pageRotations: <int, int>{},
      pageOrder: <int>[2],
    );

    expect(plain.visiblePages(4), <int>[1, 3, 4]);
    expect(plain.effectivePageOrder(4), <int>[1, 3, 4]);
    expect(repeated.effectivePageOrder(5), <int>[1, 4, 4, 3]);
    expect(onlyHiddenCustomOrder.effectivePageOrder(3), <int>[3]);
  });

  test('page settings compact stale page data for current PDF page count', () {
    final createdAt = DateTime.parse('2026-08-20T10:00:00.000');
    final settings = SheetPageSettings(
      hiddenPages: const <int>[0, 1, 2, 2, 4],
      pageRotations: const <int, int>{0: 90, 2: 450, 5: 180},
      pageOrder: const <int>[0, -1, 1, 4, 3, 2, 5, 3],
      jumpPoints: <SheetPageJumpPoint>[
        SheetPageJumpPoint(
          id: 'visible',
          sourcePage: 3,
          targetPage: 2,
          label: 'To repeat',
          createdAt: createdAt,
        ),
        SheetPageJumpPoint(
          id: 'hidden-source',
          sourcePage: 1,
          targetPage: 3,
          label: 'Hidden source',
          createdAt: createdAt,
        ),
        SheetPageJumpPoint(
          id: 'outside-target',
          sourcePage: 3,
          targetPage: 5,
          label: 'Outside target',
          createdAt: createdAt,
        ),
      ],
    );

    final compacted = settings.compactForPageCount(3);

    expect(compacted.hiddenPages, <int>[1, 2]);
    expect(compacted.pageRotations, <int, int>{2: 90});
    expect(compacted.pageOrder, <int>[3, 3]);
    expect(compacted.jumpPoints, isEmpty);
    expect(compacted.visiblePages(3), <int>[3]);
    expect(
      identical(
        SheetPageSettings.empty.compactForPageCount(3),
        SheetPageSettings.empty,
      ),
      isTrue,
    );
  });

  test('page settings find next virtual order target around duplicates', () {
    const settings = SheetPageSettings(
      hiddenPages: <int>[3],
      pageRotations: <int, int>{},
      pageOrder: <int>[1, 4, 4, 3, 2],
    );

    final first = settings.nextPageOrderTarget(
      currentPage: 1,
      currentIndex: null,
      delta: 1,
      pageCount: 4,
    );
    final duplicate = settings.nextPageOrderTarget(
      currentPage: 4,
      currentIndex: first?.index,
      delta: 1,
      pageCount: 4,
    );
    final afterHidden = settings.nextPageOrderTarget(
      currentPage: 4,
      currentIndex: duplicate?.index,
      delta: 1,
      pageCount: 4,
    );
    final boundary = settings.nextPageOrderTarget(
      currentPage: 2,
      currentIndex: afterHidden?.index,
      delta: 1,
      pageCount: 4,
    );

    expect(first?.pageNumber, 4);
    expect(first?.index, 1);
    expect(duplicate?.pageNumber, 4);
    expect(duplicate?.index, 2);
    expect(afterHidden?.pageNumber, 2);
    expect(afterHidden?.index, 3);
    expect(boundary?.isBoundary, isTrue);
    expect(boundary?.pageNumber, 2);
  });

  test('page settings manage jump points', () {
    const settings = SheetPageSettings.empty;
    final createdAt = DateTime.parse('2026-08-20T10:00:00.000');
    final jumpPoint = SheetPageJumpPoint(
      id: 'jump-1',
      sourcePage: 1,
      targetPage: 4,
      label: 'Coda',
      createdAt: createdAt,
    );

    final added = settings.addJumpPoint(jumpPoint: jumpPoint, pageCount: 4);
    final ignoredSamePage = added.addJumpPoint(
      jumpPoint: SheetPageJumpPoint(
        id: 'jump-2',
        sourcePage: 2,
        targetPage: 2,
        label: 'Same',
        createdAt: createdAt.add(const Duration(seconds: 1)),
      ),
      pageCount: 4,
    );
    final decoded = SheetPageSettings.fromJson(added.toJson());
    final removed = added.removeJumpPoint('jump-1');
    final renamed = jumpPoint.copyWith(label: 'D.S. al Coda');
    final fallbackLabel = jumpPoint.copyWith(label: '');

    expect(added.hasJumpPoints, isTrue);
    expect(added.jumpPointsFromPage(1).single.targetPage, 4);
    expect(identical(ignoredSamePage, added), isTrue);
    expect(decoded.jumpPoints.single.label, 'Coda');
    expect(decoded.jumpPoints.single.createdAt, createdAt);
    expect(renamed.label, 'D.S. al Coda');
    expect(fallbackLabel.label, '4쪽으로');
    expect(removed.jumpPoints, isEmpty);
    expect(identical(removed.removeJumpPoint('missing'), removed), isTrue);
  });

  test('page settings keep jump points away from hidden pages', () {
    final createdAt = DateTime.parse('2026-08-20T10:00:00.000');
    final settings = SheetPageSettings(
      hiddenPages: <int>[3],
      pageRotations: <int, int>{},
      jumpPoints: <SheetPageJumpPoint>[
        SheetPageJumpPoint(
          id: 'visible',
          sourcePage: 1,
          targetPage: 4,
          label: 'Coda',
          createdAt: createdAt,
        ),
        SheetPageJumpPoint(
          id: 'hidden-target',
          sourcePage: 1,
          targetPage: 3,
          label: 'Hidden',
          createdAt: createdAt,
        ),
      ],
    );
    final ignored = settings.addJumpPoint(
      jumpPoint: SheetPageJumpPoint(
        id: 'new-hidden-target',
        sourcePage: 2,
        targetPage: 3,
        label: 'Hidden',
        createdAt: createdAt,
      ),
      pageCount: 4,
    );

    expect(settings.jumpPointsFromPage(1).single.id, 'visible');
    expect(identical(ignored, settings), isTrue);
  });

  test('page crop settings clamp and normalize margins', () {
    const settings = SheetCropSettings(
      left: 0.5,
      right: 0.5,
      top: -1,
      bottom: 0.12,
    );

    final normalized = settings.normalized();
    final decoded = SheetCropSettings.fromJson(normalized.toJson());

    expect(normalized.left + normalized.right, closeTo(0.8, 0.001));
    expect(normalized.top, 0);
    expect(normalized.bottom, 0.12);
    expect(decoded.left, normalized.left);
    expect(decoded.right, normalized.right);
    expect(decoded.hasCrop, isTrue);
  });
}
