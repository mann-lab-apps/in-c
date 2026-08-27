import 'package:in_c_sheet/sheet_annotation.dart';
import 'package:in_c_sheet/sheet_auto_scroll.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:in_c_sheet/sheet_setlist.dart';

const rcQaPageCount = 8;

DateTime rcQaTimestamp({int minutes = 0}) {
  return DateTime.parse('2026-08-27T10:00:00.000').add(
    Duration(minutes: minutes),
  );
}

List<SheetScore> buildRcQaScores() {
  final importedAt = rcQaTimestamp();
  final updatedAt = rcQaTimestamp(minutes: 15);
  return <SheetScore>[
    SheetScore(
      id: 'rc-score-main',
      title: 'RC Synthetic Etude',
      composer: 'Clef QA',
      tags: const <String>['rc', 'text-pdf', 'performance'],
      note: 'Synthetic metadata fixture. No copyrighted score file included.',
      filePath: '/synthetic/rc-text-score.pdf',
      collection: 'RC QA',
      group: 'Weekend Pass',
      rating: 5,
      linkedFiles: <SheetLinkedFile>[
        SheetLinkedFile(
          path: '/synthetic/rc-trumpet-part.pdf',
          type: 'pdf',
          label: 'Trumpet part',
          role: SheetLinkedFile.partRole,
          createdAt: importedAt,
        ),
        SheetLinkedFile(
          path: '/synthetic/rc-piano-reduction.pdf',
          type: 'pdf',
          label: 'Piano reduction',
          role: SheetLinkedFile.pianoReductionRole,
          createdAt: importedAt.add(const Duration(minutes: 1)),
        ),
        SheetLinkedFile(
          path: '/synthetic/rc-original.pdf',
          type: 'pdf',
          label: 'Original',
          role: SheetLinkedFile.originalRole,
          createdAt: importedAt.add(const Duration(minutes: 2)),
        ),
      ],
      structuredNotes: const SheetScoreNotes(
        performance: 'Use silent page turns after Coda.',
        rehearsal: 'Start at B, repeat pages 4-5.',
        tuning: 'Check Bb trumpet against concert A.',
        instrumentation: 'Trumpet, piano, optional reference track.',
      ),
      importedAt: importedAt,
      updatedAt: updatedAt,
      lastOpenedAt: rcQaTimestamp(minutes: 20),
      lastPage: 4,
      isFavorite: true,
      isPinned: true,
      bookmarks: <SheetBookmark>[
        SheetBookmark(
          pageNumber: 1,
          label: 'Cover',
          createdAt: importedAt,
        ),
        SheetBookmark(
          pageNumber: 4,
          label: 'Solo',
          createdAt: importedAt.add(const Duration(minutes: 3)),
        ),
      ],
      viewerSettings: const SheetViewerSettings(
        displayMode: 'twoPage',
        halfPageTurn: true,
        pageScale: SheetViewerSettings.fitWidthScale,
        pedalMapping: SheetViewerSettings.customPedalMappingType,
        customPedalMapping: <String, String>{
          'ArrowLeft': 'previousPage',
          'ArrowRight': 'nextPage',
          'PageUp': 'previousPage',
          'PageDown': 'nextPage',
          'Space': 'toggleQuickActions',
          'Shift+Space': 'previousPage',
          'Enter': 'nextPage',
          'Tab': 'nextSetlistScore',
          'MediaPrevious': 'previousSetlistScore',
          'MediaNext': 'nextSetlistScore',
        },
        renderProfile: SheetViewerSettings.largePdfRenderProfile,
        keepAwakeInPerformance: true,
        confirmSetlistTransition: true,
      ),
      pageSettings: SheetPageSettings(
        hiddenPages: <int>[2],
        pageRotations: <int, int>{6: 90},
        crop: SheetCropSettings(top: 0.03, bottom: 0.04),
        pageCrops: <int, SheetCropSettings>{
          1: SheetCropSettings(top: 0.05, bottom: 0.02),
          3: SheetCropSettings(left: 0.04, right: 0.04),
          5: SheetCropSettings(top: 0.02, bottom: 0.08),
        },
        pageOrder: <int>[1, 3, 4, 5, 4, 6, 7, 8],
        jumpPoints: <SheetPageJumpPoint>[
          SheetPageJumpPoint(
            id: 'rc-jump-to-coda',
            sourcePage: 5,
            targetPage: 7,
            label: 'To Coda',
            createdAt: importedAt,
          ),
        ],
        rehearsalMarks: <SheetRehearsalMark>[
          SheetRehearsalMark(
            id: 'rc-mark-a',
            pageNumber: 3,
            label: 'A',
            kind: SheetRehearsalMark.rehearsalKind,
            createdAt: importedAt,
          ),
          SheetRehearsalMark(
            id: 'rc-mark-coda',
            pageNumber: 7,
            label: 'Coda',
            kind: SheetRehearsalMark.codaKind,
            createdAt: importedAt.add(const Duration(minutes: 1)),
          ),
        ],
        cropPresets: <SheetCropPreset>[
          SheetCropPreset(
            id: 'rc-crop-odd-even',
            label: 'Tablet stand',
            scope: SheetCropPreset.oddEvenScope,
            crop: SheetCropSettings(left: 0.04, right: 0.02),
            alternateCrop: SheetCropSettings(left: 0.02, right: 0.04),
            createdAt: importedAt,
          ),
        ],
        blankPageInsertions: <SheetBlankPageInsertion>[
          SheetBlankPageInsertion(
            id: 'rc-blank-notes',
            afterPage: 5,
            label: 'Notes',
            createdAt: importedAt,
          ),
        ],
        visibilityPresets: <SheetPageVisibilityPreset>[
          SheetPageVisibilityPreset(
            id: 'rc-visibility-no-cover',
            label: 'No cover',
            hiddenPages: const <int>[1],
            createdAt: importedAt,
          ),
        ],
      ),
      annotationLayer: buildRcQaAnnotationLayer(),
      annotationStorage: SheetAnnotationStorageReference(
        mode: SheetAnnotationStorageReference.fileMode,
        path: '/synthetic/annotations/rc-score-main.annotations.json',
        checksum: 'synthetic-checksum',
        updatedAt: rcQaTimestamp(minutes: 40),
        lastSaveStatus: 'saved',
      ),
      autoScrollSettings: const SheetAutoScrollSettings(
        durationSeconds: 420,
        startPage: 3,
        endPage: 8,
        cueSeconds: 8,
      ),
    ),
    SheetScore(
      id: 'rc-score-scan',
      title: 'RC Scan Like Score',
      composer: 'Clef QA',
      tags: const <String>['rc', 'scan-pdf'],
      note: 'Use this to verify graceful PDF body search fallback.',
      filePath: '/synthetic/rc-scan-like-score.pdf',
      collection: 'RC QA',
      group: 'Weekend Pass',
      rating: 3,
      importedAt: importedAt,
      updatedAt: updatedAt,
      lastOpenedAt: null,
      lastPage: 1,
      isFavorite: false,
      bookmarks: const <SheetBookmark>[],
    ),
  ];
}

SheetAnnotationLayer buildRcQaAnnotationLayer() {
  final base = rcQaTimestamp(minutes: 30);
  final strokes = List<SheetAnnotationStroke>.generate(44, (index) {
    final pageNumber = (index % rcQaPageCount) + 1;
    return SheetAnnotationStroke(
      id: 'rc-stroke-$index',
      pageNumber: pageNumber,
      tool: index.isEven ? SheetAnnotationTool.pen : SheetAnnotationTool.arrow,
      color: index.isEven ? 0xff111111 : 0xffd33232,
      width: index.isEven ? 3 : 5,
      points: List<SheetAnnotationPoint>.generate(10, (pointIndex) {
        return SheetAnnotationPoint(
          x: 0.08 + (pointIndex * 0.045),
          y: 0.12 + ((index % 6) * 0.05),
        );
      }),
      createdAt: base.add(Duration(seconds: index)),
    );
  });
  final texts = List<SheetTextAnnotation>.generate(6, (index) {
    return SheetTextAnnotation(
      id: 'rc-text-$index',
      pageNumber: (index % rcQaPageCount) + 1,
      position: SheetAnnotationPoint(
        x: 0.15,
        y: 0.18 + (index * 0.07),
      ),
      text: 'Cue ${index + 1}',
      color: 0xff234466,
      fontSize: 18,
      createdAt: base.add(Duration(minutes: index)),
    );
  });
  final redoStack = strokes
      .take(6)
      .map(SheetAnnotationRedoEntry.stroke)
      .toList(growable: false);
  return SheetAnnotationLayer(
    strokes: List<SheetAnnotationStroke>.unmodifiable(strokes),
    texts: List<SheetTextAnnotation>.unmodifiable(texts),
    redoStack: List<SheetAnnotationRedoEntry>.unmodifiable(redoStack),
  );
}

List<SheetSetlist> buildRcQaSetlists() {
  final createdAt = rcQaTimestamp(minutes: 5);
  return <SheetSetlist>[
    SheetSetlist(
      id: 'rc-setlist-weekend',
      title: 'RC Weekend QA Set',
      scoreIds: const <String>['rc-score-main', 'rc-score-scan'],
      createdAt: createdAt,
      updatedAt: rcQaTimestamp(minutes: 25),
      rehearsalMode: true,
      scoreStartPages: const <String, int>{
        'rc-score-main': 3,
        'rc-score-scan': 1,
      },
      scoreNotes: const <String, String>{
        'rc-score-main': 'Confirm transition guard before next score.',
        'rc-score-scan': 'Search should report no extractable text.',
      },
      scoreDurations: const <String, int>{
        'rc-score-main': 420,
        'rc-score-scan': 180,
      },
      transitionSeconds: 20,
    ),
  ];
}
