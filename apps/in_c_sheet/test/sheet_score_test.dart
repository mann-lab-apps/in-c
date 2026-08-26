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
          createdAt: importedAt,
        ),
      ],
      importedAt: importedAt,
      updatedAt: updatedAt,
      lastOpenedAt: openedAt,
      lastPage: 4,
      isFavorite: true,
      bookmarks: <SheetBookmark>[
        SheetBookmark(pageNumber: 4, label: 'Solo', createdAt: importedAt),
      ],
      viewerSettings: const SheetViewerSettings(
        displayMode: 'twoPage',
        halfPageTurn: false,
        displayEffect: 'inverted',
      ),
      pageSettings: const SheetPageSettings(
        hiddenPages: <int>[3],
        pageRotations: <int, int>{4: 90},
        crop: SheetCropSettings(top: 0.08, bottom: 0.1),
      ),
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
    expect(decoded.single.lastPage, 4);
    expect(decoded.single.isFavorite, isTrue);
    expect(decoded.single.bookmarks.single.pageNumber, 4);
    expect(decoded.single.bookmarks.single.label, 'Solo');
    expect(decoded.single.viewerSettings.displayMode, 'twoPage');
    expect(decoded.single.viewerSettings.halfPageTurn, isFalse);
    expect(decoded.single.viewerSettings.displayEffect, 'inverted');
    expect(decoded.single.pageSettings.hiddenPages, <int>[3]);
    expect(decoded.single.pageSettings.pageRotations, <int, int>{4: 90});
    expect(decoded.single.pageSettings.crop.top, 0.08);
    expect(decoded.single.pageSettings.crop.bottom, 0.1);
    expect(decoded.single.annotationLayer.strokes, hasLength(1));
    expect(decoded.single.annotationLayer.strokes.single.pageNumber, 4);
    expect(
      decoded.single.pdfLinkSanitization.sanitizedFromPath,
      '/tmp/original-sonata.pdf',
    );
    expect(decoded.single.pdfLinkSanitization.removedUrlLinkCount, 2);
    expect(decoded.single.autoScrollSettings.durationSeconds, 210);
    expect(decoded.single.autoScrollSettings.startPage, 2);
    expect(decoded.single.autoScrollSettings.endPage, 9);
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
    expect(decoded.single.pageSettings.hiddenPages, isEmpty);
    expect(decoded.single.pageSettings.pageRotations, isEmpty);
    expect(decoded.single.pageSettings.crop.hasCrop, isFalse);
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
      'type': '',
      'label': '',
      'createdAt': '2026-08-20T10:00:00.000',
    });

    expect(SheetScore.normalizeRating(-1), 0);
    expect(SheetScore.normalizeRating(3), 3);
    expect(SheetScore.normalizeRating('9'), 5);
    expect(SheetScore.normalizeRating('bad'), 0);
    expect(linkedFile.type, 'pdf');
    expect(linkedFile.label, 'trumpet-1.pdf');
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
