import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_annotation.dart';
import 'package:in_c_sheet/sheet_library_backup.dart';
import 'package:in_c_sheet/sheet_library_backup_diff.dart';
import 'package:in_c_sheet/sheet_library_view_settings.dart';
import 'package:in_c_sheet/sheet_metronome.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:in_c_sheet/sheet_setlist.dart';
import 'package:in_c_sheet/sheet_tone.dart';
import 'package:in_c_sheet/sheet_tuner.dart';

void main() {
  test('compares backup scores and setlists without merging data', () {
    final now = DateTime(2026, 10, 2, 10);
    final base = _backup(
      now,
      scores: [
        _score(now, id: 'score-a', title: 'A'),
        _score(now, id: 'score-b', title: 'B'),
      ],
      setlists: [
        _setlist(now, id: 'setlist-1', scoreIds: ['score-a', 'score-b']),
      ],
    );
    final incoming = _backup(
      now,
      scores: [
        _score(now, id: 'score-b', title: 'B revised'),
        _score(now, id: 'score-c', title: 'C'),
      ],
      setlists: [
        _setlist(now, id: 'setlist-1', scoreIds: ['score-b', 'score-c']),
        _setlist(now, id: 'setlist-2', scoreIds: ['score-c']),
      ],
    );

    final diff = SheetLibraryBackupDiff.compare(base, incoming);

    expect(diff.addedScoreIds, ['score-c']);
    expect(diff.removedScoreIds, ['score-a']);
    expect(diff.changedScoreIds, ['score-b']);
    expect(diff.changedScoreFieldLabels, ['제목']);
    expect(diff.addedSetlistIds, ['setlist-2']);
    expect(diff.removedSetlistIds, isEmpty);
    expect(diff.changedSetlistIds, ['setlist-1']);
    expect(diff.changedSetlistFieldLabels, ['곡 순서']);
    expect(diff.setlistOrderChangedIds, ['setlist-1']);
    expect(diff.settingsChanged, isFalse);
    expect(diff.hasChanges, isTrue);
    expect(diff.details, hasLength(5));
    expect(diff.details.map((detail) => detail.title), <String>[
      'C',
      'A',
      'B revised',
      'Setlist',
      'Setlist',
    ]);
    final changedScore = diff.details.singleWhere(
      (detail) => detail.id == 'score-b',
    );
    expect(changedScore.kind, SheetLibraryBackupDiffItemKind.score);
    expect(changedScore.change, SheetLibraryBackupDiffChange.changed);
    expect(changedScore.contextLabel, 'Composer · score');
    expect(changedScore.reviewLabels, ['제목']);
    final changedSetlist = diff.details.singleWhere(
      (detail) => detail.id == 'setlist-1',
    );
    expect(changedSetlist.kind, SheetLibraryBackupDiffItemKind.setlist);
    expect(changedSetlist.contextLabel, '2곡');
    expect(changedSetlist.reviewLabels, ['곡 순서']);

    final report = SheetLibraryBackupDiffReport.fromDiff(diff);
    expect(report.headline, '백업 변경 5종 감지');
    expect(
      report.summaryLines,
      containsAll(<String>[
        '새 악보 1개',
        '삭제된 악보 1개',
        '수정된 악보 1개',
        '새 세트리스트 1개',
        '수정된 세트리스트 1개',
      ]),
    );
    expect(
      report.reviewLines,
      containsAll(<String>[
        '삭제된 악보가 있어 복원할지 삭제를 유지할지 확인이 필요합니다.',
        '수정된 악보 필드: 제목',
        '수정된 세트리스트 필드: 곡 순서',
        '세트리스트 순서가 달라 어느 순서를 사용할지 확인이 필요합니다.',
      ]),
    );
    expect(report.requiresReview, isTrue);
    expect(report.details, same(diff.details));
    final markdown = report.toMarkdown(maxItems: 2);
    expect(markdown, contains('# Clef & Staff 백업 변경 검토'));
    expect(markdown, contains('- [악보/추가] C'));
    expect(markdown, contains('- [악보/삭제] A'));
    expect(markdown, contains('- 그 외 3개 항목'));
    expect(markdown, contains('백업 전체 교체'));
    expect(markdown, isNot(contains('/tmp/score.pdf')));

    final mergeReview = SheetLibraryBackupMergeReview.fromDiff(diff);
    expect(mergeReview.risk, SheetLibraryBackupMergeRisk.destructive);
    expect(mergeReview.title, '삭제 포함 전체 교체');
    expect(mergeReview.requiresManualReview, isTrue);
  });

  test('flags file and settings changes as dry-run conflict candidates', () {
    final now = DateTime(2026, 10, 2, 10);
    final base = _backup(
      now,
      scores: [_score(now, id: 'score-a', filePath: '/library/a.pdf')],
    );
    final incoming = _backup(
      now,
      scores: [_score(now, id: 'score-a', filePath: '/other-device/a.pdf')],
      favoriteAnnotationPreset: const SheetAnnotationToolPreset(
        toolName: 'stamp',
        color: 0xff111111,
        width: 4,
        stampName: 'segno',
      ),
    );

    final diff = SheetLibraryBackupDiff.compare(base, incoming);

    expect(diff.addedScoreIds, isEmpty);
    expect(diff.removedScoreIds, isEmpty);
    expect(diff.changedScoreIds, ['score-a']);
    expect(diff.changedScoreFieldLabels, ['원본 파일']);
    expect(diff.fileChangedScoreIds, ['score-a']);
    expect(diff.annotationChangedScoreIds, isEmpty);
    expect(diff.annotationLayerChangedScoreIds, isEmpty);
    expect(diff.annotationObjectChangedScoreIds, isEmpty);
    expect(diff.annotationStorageChangedScoreIds, isEmpty);
    expect(diff.settingsChanged, isTrue);
    expect(diff.hasChanges, isTrue);

    final report = SheetLibraryBackupDiffReport.fromDiff(diff);
    expect(report.summaryLines, contains('수정된 악보 1개'));
    expect(report.summaryLines, contains('앱/연습 도구 설정 변경'));
    expect(
      report.reviewLines,
      containsAll(<String>[
        '수정된 악보 필드: 원본 파일',
        '파일 경로나 연결 파일이 달라 원본 PDF/오디오 위치 확인이 필요합니다.',
        '메트로놈, 튜너, 표시, 필기 preset 같은 전역 설정 변경을 확인하세요.',
      ]),
    );

    final mergeReview = SheetLibraryBackupMergeReview.fromDiff(diff);
    expect(mergeReview.risk, SheetLibraryBackupMergeRisk.review);
    expect(mergeReview.title, '수정 포함 전체 교체');
    expect(mergeReview.requiresManualReview, isTrue);
  });

  test('separates annotation layer object and storage conflict candidates', () {
    final now = DateTime(2026, 10, 13, 10);
    final base = _backup(
      now,
      scores: [
        _score(
          now,
          id: 'score-a',
          annotationLayer: SheetAnnotationLayer(
            strokes: [_stroke(now, id: 'stroke-a')],
          ),
          annotationStorage: const SheetAnnotationStorageReference(
            mode: SheetAnnotationStorageReference.fileMode,
            path: 'annotations/score-a.json',
            checksum: 'base-checksum',
          ),
        ),
        _score(
          now,
          id: 'score-b',
          annotationLayer: const SheetAnnotationLayer(
            strokes: <SheetAnnotationStroke>[],
            layers: <SheetAnnotationDisplayLayer>[
              SheetAnnotationDisplayLayer.defaultLayer,
            ],
          ),
        ),
        _score(
          now,
          id: 'score-c',
          annotationStorage: const SheetAnnotationStorageReference(
            mode: SheetAnnotationStorageReference.fileMode,
            path: 'annotations/score-c.json',
            checksum: 'old',
          ),
        ),
      ],
    );
    final incoming = _backup(
      now,
      scores: [
        _score(
          now,
          id: 'score-a',
          annotationLayer: SheetAnnotationLayer(
            strokes: [_stroke(now, id: 'stroke-a-revised')],
          ),
          annotationStorage: const SheetAnnotationStorageReference(
            mode: SheetAnnotationStorageReference.fileMode,
            path: 'annotations/score-a.json',
            checksum: 'base-checksum',
          ),
        ),
        _score(
          now,
          id: 'score-b',
          annotationLayer: const SheetAnnotationLayer(
            strokes: <SheetAnnotationStroke>[],
            layers: <SheetAnnotationDisplayLayer>[
              SheetAnnotationDisplayLayer.defaultLayer,
              SheetAnnotationDisplayLayer(id: 'lesson', label: 'Lesson'),
            ],
          ),
        ),
        _score(
          now,
          id: 'score-c',
          annotationStorage: const SheetAnnotationStorageReference(
            mode: SheetAnnotationStorageReference.fileMode,
            path: 'annotations/score-c-new.json',
            checksum: 'new',
          ),
        ),
      ],
    );

    final diff = SheetLibraryBackupDiff.compare(base, incoming);

    expect(diff.annotationChangedScoreIds, ['score-a', 'score-b', 'score-c']);
    expect(diff.annotationLayerChangedScoreIds, ['score-b']);
    expect(diff.annotationObjectChangedScoreIds, ['score-a']);
    expect(diff.annotationStorageChangedScoreIds, ['score-c']);
    expect(diff.changedScoreFieldLabels, ['필기 레이어', '필기 저장소']);
    expect(
      diff.details.singleWhere((detail) => detail.id == 'score-a').reviewLabels,
      contains('필기 내용'),
    );
    expect(
      diff.details.singleWhere((detail) => detail.id == 'score-b').reviewLabels,
      contains('필기 레이어 구성'),
    );
    expect(
      diff.details.singleWhere((detail) => detail.id == 'score-c').reviewLabels,
      contains('필기 저장 파일'),
    );

    final report = SheetLibraryBackupDiffReport.fromDiff(diff);
    expect(
      report.reviewLines,
      containsAll(<String>[
        '필기 데이터가 달라 어느 필기를 보존할지 확인이 필요합니다.',
        '필기 레이어 구성이 달라 보이기/내보내기 설정 확인이 필요합니다.',
        '필기 stroke, 텍스트, 스탬프 내용이 달라 자동 병합 전 검토가 필요합니다.',
        '필기 저장 파일 참조가 달라 백업에 실제 필기 파일이 포함됐는지 확인이 필요합니다.',
      ]),
    );
  });

  test('classifies additive-only backup changes separately', () {
    final now = DateTime(2026, 10, 2, 10);
    final base = _backup(
      now,
      scores: [_score(now, id: 'score-a', title: 'A')],
    );
    final incoming = _backup(
      now,
      scores: [
        _score(now, id: 'score-a', title: 'A'),
        _score(now, id: 'score-b', title: 'B'),
      ],
      setlists: [
        _setlist(now, id: 'setlist-1', scoreIds: ['score-a', 'score-b']),
      ],
    );

    final diff = SheetLibraryBackupDiff.compare(base, incoming);
    final mergeReview = SheetLibraryBackupMergeReview.fromDiff(diff);

    expect(diff.addedScoreIds, ['score-b']);
    expect(diff.addedSetlistIds, ['setlist-1']);
    expect(mergeReview.risk, SheetLibraryBackupMergeRisk.additive);
    expect(mergeReview.title, '새 항목 중심 변경');
    expect(mergeReview.requiresManualReview, isFalse);
  });

  test('reports no changes for equivalent backups', () {
    final now = DateTime(2026, 10, 2, 10);
    final base = _backup(
      now,
      scores: [_score(now, id: 'score-a')],
      setlists: [
        _setlist(now, id: 'setlist-1', scoreIds: ['score-a']),
      ],
    );
    final incoming = _backup(
      now,
      scores: [_score(now, id: 'score-a')],
      setlists: [
        _setlist(now, id: 'setlist-1', scoreIds: ['score-a']),
      ],
    );

    final diff = SheetLibraryBackupDiff.compare(base, incoming);

    expect(diff.hasChanges, isFalse);
    expect(diff.addedScoreIds, isEmpty);
    expect(diff.changedScoreIds, isEmpty);
    expect(diff.changedSetlistIds, isEmpty);

    final report = SheetLibraryBackupDiffReport.fromDiff(diff);
    expect(report.headline, '변경 없음');
    expect(report.summaryLines, ['두 백업의 악보, 세트리스트, 설정이 같습니다.']);
    expect(report.reviewLines, isEmpty);
    expect(report.details, isEmpty);
    expect(report.requiresReview, isFalse);

    final mergeReview = SheetLibraryBackupMergeReview.fromDiff(diff);
    expect(mergeReview.risk, SheetLibraryBackupMergeRisk.none);
    expect(mergeReview.title, '변경 없음');
    expect(mergeReview.requiresManualReview, isFalse);
  });

  test('backup review markdown disambiguates duplicate item titles', () {
    final now = DateTime(2026, 10, 20, 10);
    final base = _backup(
      now,
      setlists: [_setlist(now, id: 'setlist-old', scoreIds: const <String>[])],
    );
    final incoming = _backup(
      now,
      setlists: [_setlist(now, id: 'setlist-new', scoreIds: const <String>[])],
    );

    final markdown = SheetLibraryBackupDiffReport.fromDiff(
      SheetLibraryBackupDiff.compare(base, incoming),
    ).toMarkdown();

    expect(markdown, contains('식별자 setlist-old'));
    expect(markdown, contains('식별자 setlist-new'));
  });
}

SheetLibraryBackup _backup(
  DateTime now, {
  List<SheetScore> scores = const <SheetScore>[],
  List<SheetSetlist> setlists = const <SheetSetlist>[],
  SheetAnnotationToolPreset? favoriteAnnotationPreset,
}) {
  return SheetLibraryBackup.fromState(
    scores: scores,
    setlists: setlists,
    metronomeSettings: SheetMetronomeSettings.defaultSettings,
    tunerSettings: SheetTunerSettings.defaultSettings,
    toneSettings: SheetToneSettings.defaultSettings,
    libraryViewSettings: SheetLibraryViewSettings.defaultSettings,
    favoriteAnnotationPreset: favoriteAnnotationPreset,
    exportedAt: now,
  );
}

SheetScore _score(
  DateTime now, {
  required String id,
  String title = 'Score',
  String filePath = '/tmp/score.pdf',
  SheetAnnotationLayer annotationLayer = SheetAnnotationLayer.empty,
  SheetAnnotationStorageReference annotationStorage =
      SheetAnnotationStorageReference.inline,
}) {
  return SheetScore(
    id: id,
    title: title,
    composer: 'Composer',
    tags: const <String>[],
    note: '',
    filePath: filePath,
    importedAt: now,
    updatedAt: now,
    lastOpenedAt: null,
    lastPage: 1,
    isFavorite: false,
    bookmarks: const <SheetBookmark>[],
    annotationLayer: annotationLayer,
    annotationStorage: annotationStorage,
  );
}

SheetAnnotationStroke _stroke(DateTime now, {required String id}) {
  return SheetAnnotationStroke(
    id: id,
    pageNumber: 1,
    tool: SheetAnnotationTool.pen,
    color: 0xff111111,
    width: 3,
    points: const <SheetAnnotationPoint>[
      SheetAnnotationPoint(x: 0.2, y: 0.2),
      SheetAnnotationPoint(x: 0.4, y: 0.4),
    ],
    createdAt: now,
  );
}

SheetSetlist _setlist(
  DateTime now, {
  required String id,
  required List<String> scoreIds,
}) {
  return SheetSetlist(
    id: id,
    title: 'Setlist',
    scoreIds: scoreIds,
    createdAt: now,
    updatedAt: now,
  );
}
