import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_annotation.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:in_c_sheet/sheet_setlist_package.dart';
import 'package:in_c_sheet/sheet_setlist_package_annotation.dart';

void main() {
  const scorePath = 'scores/recital-etude.pdf';
  const scoreDigest =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  test('round trips committed annotations without undo history', () {
    final layer = SheetAnnotationLayer(
      strokes: <SheetAnnotationStroke>[
        SheetAnnotationStroke(
          id: 'stroke-1',
          pageNumber: 2,
          tool: SheetAnnotationTool.pen,
          color: 0xff112233,
          width: 3,
          points: const <SheetAnnotationPoint>[
            SheetAnnotationPoint(x: 0.2, y: 0.3),
            SheetAnnotationPoint(x: 0.4, y: 0.5),
          ],
          createdAt: DateTime.utc(2026, 10, 20),
          layerId: 'rehearsal',
        ),
      ],
      texts: <SheetTextAnnotation>[
        SheetTextAnnotation(
          id: 'text-1',
          pageNumber: 2,
          position: const SheetAnnotationPoint(x: 0.5, y: 0.6),
          text: 'Breathe',
          color: 0xff445566,
          fontSize: 18,
          createdAt: DateTime.utc(2026, 10, 20, 1),
          layerId: 'rehearsal',
        ),
      ],
      layers: const <SheetAnnotationDisplayLayer>[
        SheetAnnotationDisplayLayer.defaultLayer,
        SheetAnnotationDisplayLayer(
          id: 'rehearsal',
          label: 'Rehearsal',
          isVisible: false,
          includeInExport: false,
        ),
      ],
    );
    final sidecar = SheetSetlistPackageAnnotationSidecar(
      scoreEntryPath: scorePath,
      scoreSha256: scoreDigest,
      annotationLayer: layer,
    );

    final restored = SheetSetlistPackageAnnotationCodec.decode(
      archiveEntryPath: sidecar.archiveEntryPath,
      bytes: SheetSetlistPackageAnnotationCodec.encode(sidecar),
    );

    expect(restored.scoreEntryPath, scorePath);
    expect(restored.scoreSha256, scoreDigest);
    expect(restored.annotationLayer.strokes.single.id, 'stroke-1');
    expect(restored.annotationLayer.texts.single.text, 'Breathe');
    expect(restored.annotationLayer.layers.last.isVisible, isFalse);
    expect(restored.annotationLayer.layers.last.includeInExport, isFalse);
    expect(restored.annotationLayer.redoStack, isEmpty);
    expect(restored.annotationLayer.eraseUndoStack, isEmpty);
  });

  test('binds each sidecar path to its normalized package score path', () {
    final entryPath = SheetSetlistPackageAnnotationCodec.entryPathForScore(
      scorePath,
    );

    expect(entryPath, startsWith('annotations/'));
    expect(entryPath, endsWith('.json'));
    expect(
      () => SheetSetlistPackageAnnotationCodec.decode(
        archiveEntryPath: 'annotations/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.json',
        bytes: _emptySidecarBytes(),
      ),
      throwsFormatException,
    );
    expect(
      () => SheetSetlistPackageAnnotationCodec.entryPathForScore(
        '../scores/recital-etude.pdf',
      ),
      throwsFormatException,
    );
  });

  test('rejects malformed objects instead of silently dropping them', () {
    final json = jsonDecode(utf8.decode(_emptySidecarBytes())) as Map;
    final annotation = json['annotation'] as Map;
    annotation['strokes'] = <Object?>[
      <String, Object?>{'id': 'broken', 'points': const <Object?>[]},
    ];
    final bytes = utf8.encode(jsonEncode(json));

    expect(
      () => SheetSetlistPackageAnnotationCodec.decode(
        archiveEntryPath: SheetSetlistPackageAnnotationCodec.entryPathForScore(
          scorePath,
        ),
        bytes: bytes,
      ),
      throwsFormatException,
    );
  });

  test('rejects duplicate object ids and unknown display layers', () {
    final duplicateJson = jsonDecode(utf8.decode(_emptySidecarBytes())) as Map;
    final duplicateAnnotation = duplicateJson['annotation'] as Map;
    duplicateAnnotation['strokes'] = <Object?>[
      _strokeJson(id: 'same'),
      _strokeJson(id: 'same'),
    ];

    expect(
      () => SheetSetlistPackageAnnotationCodec.decode(
        archiveEntryPath: SheetSetlistPackageAnnotationCodec.entryPathForScore(
          scorePath,
        ),
        bytes: utf8.encode(jsonEncode(duplicateJson)),
      ),
      throwsFormatException,
    );

    final unknownLayerJson =
        jsonDecode(utf8.decode(_emptySidecarBytes())) as Map;
    final unknownLayerAnnotation = unknownLayerJson['annotation'] as Map;
    unknownLayerAnnotation['strokes'] = <Object?>[
      _strokeJson(id: 'unknown-layer', layerId: 'missing'),
    ];

    expect(
      () => SheetSetlistPackageAnnotationCodec.decode(
        archiveEntryPath: SheetSetlistPackageAnnotationCodec.entryPathForScore(
          scorePath,
        ),
        bytes: utf8.encode(jsonEncode(unknownLayerJson)),
      ),
      throwsFormatException,
    );
  });

  test('rejects undo history and invalid score checksums', () {
    final historyJson = jsonDecode(utf8.decode(_emptySidecarBytes())) as Map;
    final annotation = historyJson['annotation'] as Map;
    annotation['redoStack'] = <Object?>[
      <String, Object?>{'type': 'stroke', 'payload': _strokeJson(id: 'redo')},
    ];

    expect(
      () => SheetSetlistPackageAnnotationCodec.decode(
        archiveEntryPath: SheetSetlistPackageAnnotationCodec.entryPathForScore(
          scorePath,
        ),
        bytes: utf8.encode(jsonEncode(historyJson)),
      ),
      throwsFormatException,
    );
    expect(
      () => SheetSetlistPackageAnnotationCodec.encode(
        const SheetSetlistPackageAnnotationSidecar(
          scoreEntryPath: scorePath,
          scoreSha256: 'not-a-checksum',
          annotationLayer: SheetAnnotationLayer.empty,
        ),
      ),
      throwsFormatException,
    );
  });

  test('round trips optional sidecars through the package archive', () {
    final scoreBytes = <int>[1, 2, 3, 4];
    final sidecar = SheetSetlistPackageAnnotationSidecar(
      scoreEntryPath: scorePath,
      scoreSha256: sha256.convert(scoreBytes).toString(),
      annotationLayer: SheetAnnotationLayer(
        strokes: <SheetAnnotationStroke>[
          SheetAnnotationStroke.fromJson(_strokeJson(id: 'archive-stroke')),
        ],
      ),
    );

    final archiveBytes = SheetSetlistPackageArchive.encodeBytes(
      manifestText: _manifestText(),
      scoreFiles: <String, List<int>>{scorePath: scoreBytes},
      annotationSidecars: <SheetSetlistPackageAnnotationSidecar>[sidecar],
    );
    final restored = SheetSetlistPackageArchive.decodeBytes(archiveBytes);

    expect(restored.annotationSidecars, hasLength(1));
    expect(restored.annotationSidecars.single.scoreEntryPath, scorePath);
    expect(
      restored.annotationSidecars.single.annotationLayer.strokes.single.id,
      'archive-stroke',
    );
    final newScorePreview = restored.previewImport(
      currentScores: const <SheetScore>[],
    );
    expect(newScorePreview.annotationCandidateCount, 1);
    expect(newScorePreview.restorableAnnotationCount, 1);
    expect(newScorePreview.deferredAnnotationCount, 0);
    expect(newScorePreview.protectedExistingAnnotationCount, 0);
    expect(newScorePreview.entries.single.annotationSidecar, isNotNull);

    final existingScorePreview = restored.previewImport(
      currentScores: <SheetScore>[_existingScore()],
    );
    expect(existingScorePreview.annotationCandidateCount, 0);
    expect(existingScorePreview.restorableAnnotationCount, 0);
    expect(existingScorePreview.deferredAnnotationCount, 1);
    expect(existingScorePreview.protectedExistingAnnotationCount, 1);
    expect(
      existingScorePreview.entries.single.status,
      SheetSetlistPackageEntryStatus.existingScore,
    );
  });

  test('dry run defers image stamp sidecars until assets can be bound', () {
    final scoreBytes = <int>[1, 2, 3, 4];
    final sidecar = SheetSetlistPackageAnnotationSidecar(
      scoreEntryPath: scorePath,
      scoreSha256: sha256.convert(scoreBytes).toString(),
      annotationLayer: SheetAnnotationLayer(
        strokes: const <SheetAnnotationStroke>[],
        texts: <SheetTextAnnotation>[
          SheetTextAnnotation(
            id: 'image-stamp',
            pageNumber: 1,
            position: const SheetAnnotationPoint(x: 0.2, y: 0.3),
            text: 'Photo cue',
            color: 0xff111111,
            fontSize: 18,
            createdAt: DateTime.utc(2026, 10, 20),
            stampKind: SheetAnnotationUserStamp.imageKind,
            stampAssetRef: 'stamps/photos/photo-cue.png',
          ),
        ],
      ),
    );
    final package = SheetSetlistPackageArchive.decodeBytes(
      SheetSetlistPackageArchive.encodeBytes(
        manifestText: _manifestText(),
        scoreFiles: <String, List<int>>{scorePath: scoreBytes},
        annotationSidecars: <SheetSetlistPackageAnnotationSidecar>[sidecar],
      ),
    );

    final dryRun = package.previewImport(currentScores: const <SheetScore>[]);

    expect(dryRun.restorableAnnotationCount, 0);
    expect(dryRun.deferredAnnotationCount, 1);
    expect(dryRun.entries.single.canRestoreAnnotationSidecar, isFalse);
  });

  test('package archive rejects orphan and checksum-mismatched sidecars', () {
    final scoreBytes = <int>[1, 2, 3, 4];
    const sidecar = SheetSetlistPackageAnnotationSidecar(
      scoreEntryPath: scorePath,
      scoreSha256: scoreDigest,
      annotationLayer: SheetAnnotationLayer.empty,
    );

    expect(
      () => SheetSetlistPackageArchive.encodeBytes(
        manifestText: _manifestText(),
        scoreFiles: const <String, List<int>>{},
        annotationSidecars: const <SheetSetlistPackageAnnotationSidecar>[
          sidecar,
        ],
      ),
      throwsFormatException,
    );
    expect(
      () => SheetSetlistPackageArchive.encodeBytes(
        manifestText: _manifestText(),
        scoreFiles: <String, List<int>>{scorePath: scoreBytes},
        annotationSidecars: const <SheetSetlistPackageAnnotationSidecar>[
          sidecar,
        ],
      ),
      throwsFormatException,
    );
  });
}

List<int> _emptySidecarBytes() {
  return SheetSetlistPackageAnnotationCodec.encode(
    const SheetSetlistPackageAnnotationSidecar(
      scoreEntryPath: 'scores/recital-etude.pdf',
      scoreSha256:
          '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      annotationLayer: SheetAnnotationLayer.empty,
    ),
  );
}

Map<String, Object?> _strokeJson({
  required String id,
  String layerId = SheetAnnotationDisplayLayer.defaultLayerId,
}) {
  return <String, Object?>{
    'id': id,
    'pageNumber': 1,
    'tool': 'pen',
    'color': 0xff111111,
    'width': 3,
    'points': const <Map<String, Object?>>[
      <String, Object?>{'x': 0.1, 'y': 0.2},
    ],
    'createdAt': '2026-10-20T00:00:00.000Z',
    if (layerId != SheetAnnotationDisplayLayer.defaultLayerId)
      'layerId': layerId,
  };
}

String _manifestText() => '''
Clef & Staff 세트리스트
제목: Annotation Package
곡 수: 1곡

1. Recital Etude
   파일: recital-etude.pdf
''';

SheetScore _existingScore() {
  final now = DateTime.utc(2026, 10, 20);
  return SheetScore(
    id: 'existing-score',
    title: 'Recital Etude',
    composer: '',
    tags: const <String>[],
    note: '',
    filePath: '/library/recital-etude.pdf',
    importedAt: now,
    updatedAt: now,
    lastOpenedAt: null,
    lastPage: 1,
    isFavorite: false,
    bookmarks: const <SheetBookmark>[],
  );
}
