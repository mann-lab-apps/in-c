import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_annotation.dart';
import 'package:in_c_sheet/sheet_library_backup.dart';
import 'package:in_c_sheet/sheet_library_backup_diff.dart';
import 'package:in_c_sheet/sheet_library_sync_review.dart';
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

  test('sync dry-run separates one-sided and disjoint score changes', () {
    final now = DateTime(2026, 10, 20, 14);
    final base = _backup(
      now,
      scores: [_score(now, id: 'score-a', title: 'Base')],
    );
    final local = _backup(
      now,
      scores: [_score(now, id: 'score-a', title: 'Local title')],
      setlists: [
        _setlist(now, id: 'local-set', scoreIds: ['score-a']),
      ],
    );
    final remote = _backup(
      now,
      scores: [
        _score(now, id: 'score-a', title: 'Base', tags: const ['remote']),
      ],
    );

    final dryRun = SheetLibrarySyncDryRun.compare(
      base: base,
      local: local,
      remote: remote,
    );

    expect(dryRun.hasChanges, isTrue);
    expect(dryRun.requiresManualReview, isFalse);
    expect(dryRun.conflicts, isEmpty);
    final score = dryRun.items.singleWhere((item) => item.id == 'score-a');
    expect(score.status, SheetLibrarySyncDryRunStatus.mergeable);
    expect(score.localChange, SheetLibraryBackupDiffChange.changed);
    expect(score.remoteChange, SheetLibraryBackupDiffChange.changed);
    expect(score.conflictingFieldLabels, isEmpty);
    final setlist = dryRun.items.singleWhere((item) => item.id == 'local-set');
    expect(setlist.status, SheetLibrarySyncDryRunStatus.localOnly);
    expect(setlist.localChange, SheetLibraryBackupDiffChange.added);
    expect(setlist.remoteChange, isNull);
  });

  test('sync dry-run flags overlapping edits and delete-versus-edit', () {
    final now = DateTime(2026, 10, 20, 15);
    final base = _backup(
      now,
      scores: [
        _score(now, id: 'score-a', title: 'Base'),
        _score(now, id: 'score-b', title: 'Delete or edit'),
      ],
    );
    final local = _backup(
      now,
      scores: [_score(now, id: 'score-a', title: 'Local title')],
    );
    final remote = _backup(
      now,
      scores: [
        _score(now, id: 'score-a', title: 'Remote title'),
        _score(now, id: 'score-b', title: 'Remote edit'),
      ],
    );

    final dryRun = SheetLibrarySyncDryRun.compare(
      base: base,
      local: local,
      remote: remote,
    );

    expect(dryRun.requiresManualReview, isTrue);
    expect(dryRun.conflicts.map((item) => item.id), ['score-a', 'score-b']);
    final overlapping = dryRun.items.singleWhere(
      (item) => item.id == 'score-a',
    );
    expect(overlapping.status, SheetLibrarySyncDryRunStatus.conflict);
    expect(overlapping.conflictingFieldLabels, ['제목']);
    final destructive = dryRun.items.singleWhere(
      (item) => item.id == 'score-b',
    );
    expect(destructive.localChange, SheetLibraryBackupDiffChange.removed);
    expect(destructive.remoteChange, SheetLibraryBackupDiffChange.changed);
    expect(destructive.status, SheetLibrarySyncDryRunStatus.conflict);
  });

  test('sync dry-run accepts identical edits and flags settings conflicts', () {
    final now = DateTime(2026, 10, 20, 16);
    final base = _backup(
      now,
      scores: [_score(now, id: 'score-a', title: 'Base')],
    );
    final sharedScore = _score(now, id: 'score-a', title: 'Shared edit');
    final local = _backup(
      now,
      scores: [sharedScore],
      favoriteAnnotationPreset: const SheetAnnotationToolPreset(
        toolName: 'stamp',
        color: 0xff111111,
        width: 3,
        stampName: 'segno',
      ),
    );
    final remote = _backup(
      now,
      scores: [sharedScore],
      favoriteAnnotationPreset: const SheetAnnotationToolPreset(
        toolName: 'stamp',
        color: 0xff222222,
        width: 3,
        stampName: 'coda',
      ),
    );

    final dryRun = SheetLibrarySyncDryRun.compare(
      base: base,
      local: local,
      remote: remote,
    );

    final score = dryRun.items.singleWhere((item) => item.id == 'score-a');
    expect(score.status, SheetLibrarySyncDryRunStatus.sameChange);
    final settings = dryRun.items.singleWhere((item) => item.id == 'settings');
    expect(settings.kind, SheetLibrarySyncDryRunItemKind.settings);
    expect(settings.status, SheetLibrarySyncDryRunStatus.conflict);
    expect(settings.conflictingFieldLabels, ['필기 preset']);
    expect(dryRun.conflicts, [settings]);
  });

  test('sync dry-run ignores nested JSON map insertion order', () {
    final now = DateTime(2026, 10, 20, 17);
    final base = _backup(now, scores: [_score(now, id: 'score-a')]);
    final local = _backup(
      now,
      scores: [
        _score(
          now,
          id: 'score-a',
          viewerSettings: const SheetViewerSettings(
            displayMode: 'auto',
            halfPageTurn: false,
            customPedalMapping: <String, String>{
              'PedalA': 'previousPage',
              'PedalB': 'nextPage',
            },
          ),
        ),
      ],
    );
    final remote = _backup(
      now,
      scores: [
        _score(
          now,
          id: 'score-a',
          viewerSettings: const SheetViewerSettings(
            displayMode: 'auto',
            halfPageTurn: false,
            customPedalMapping: <String, String>{
              'PedalB': 'nextPage',
              'PedalA': 'previousPage',
            },
          ),
        ),
      ],
    );

    final dryRun = SheetLibrarySyncDryRun.compare(
      base: base,
      local: local,
      remote: remote,
    );

    final score = dryRun.items.singleWhere((item) => item.id == 'score-a');
    expect(score.status, SheetLibrarySyncDryRunStatus.sameChange);
    expect(score.conflictingFieldLabels, isEmpty);
    expect(dryRun.requiresManualReview, isFalse);
  });

  test('sync dry-run report is bounded deterministic and path-free', () {
    final now = DateTime(2026, 10, 20, 18);
    final base = _backup(
      now,
      scores: [
        _score(now, id: 'score-a', title: 'Etude'),
        _score(now, id: 'score-b', title: 'Etude'),
        _score(now, id: 'score-c', title: 'Etude'),
      ],
    );
    final local = _backup(
      now,
      scores: [
        _score(now, id: 'score-a', title: 'Etude', tags: const ['local']),
        _score(now, id: 'score-b', title: 'Etude', tags: const ['shared']),
        _score(now, id: 'score-c', title: 'Etude', tags: const ['local']),
      ],
    );
    final remote = _backup(
      now,
      scores: [
        _score(now, id: 'score-a', title: 'Etude', tags: const ['remote']),
        _score(now, id: 'score-b', title: 'Etude', tags: const ['shared']),
        _score(now, id: 'score-c', title: 'Etude'),
      ],
    );

    final report = SheetLibrarySyncDryRunReport.fromDryRun(
      SheetLibrarySyncDryRun.compare(base: base, local: local, remote: remote),
    );
    final markdown = report.toMarkdown(maxItems: 2);

    expect(report.headline, '동기화 변경 3개 · 수동 검토 1개');
    expect(
      report.summaryLines,
      containsAll(<String>['로컬만 변경 1개', '동일 변경 1개', '수동 검토 1개']),
    );
    expect(report.requiresReview, isTrue);
    expect(markdown, contains('# Clef & Staff 동기화 변경 검토'));
    expect(markdown, contains('[악보/수동 검토] Etude'));
    expect(markdown, contains('식별자 score-a'));
    expect(markdown, contains('로컬 수정 · 원격 수정 · 충돌: 태그'));
    expect(markdown, contains('- 그 외 1개 항목'));
    expect(markdown, isNot(contains('/tmp/score.pdf')));
    expect(markdown, contains('데이터를 병합하거나 적용하지 않습니다.'));
  });

  test('sync dry-run keeps destructive content conflicts manual', () {
    final now = DateTime(2026, 10, 20, 19);
    final base = _backup(
      now,
      scores: [
        _score(
          now,
          id: 'annotation-score',
          annotationLayer: SheetAnnotationLayer(
            strokes: [_stroke(now, id: 'base-stroke')],
          ),
        ),
        _score(now, id: 'binary-score', filePath: '/base/library/score.pdf'),
      ],
      setlists: [
        _setlist(now, id: 'concert', scoreIds: const ['a', 'b', 'c']),
      ],
    );
    final local = _backup(
      now,
      scores: [
        _score(
          now,
          id: 'annotation-score',
          annotationLayer: SheetAnnotationLayer(
            strokes: [_stroke(now, id: 'local-stroke')],
          ),
        ),
        _score(now, id: 'binary-score', filePath: '/local/private/score.pdf'),
      ],
      setlists: [
        _setlist(now, id: 'concert', scoreIds: const ['b', 'a', 'c']),
      ],
      userAnnotationStampPacks: [_stampPack(now, name: 'Local stamps')],
    );
    final remote = _backup(
      now,
      scores: [
        _score(
          now,
          id: 'annotation-score',
          annotationLayer: SheetAnnotationLayer(
            strokes: [_stroke(now, id: 'remote-stroke')],
          ),
        ),
        _score(now, id: 'binary-score', filePath: '/remote/private/score.pdf'),
      ],
      setlists: [
        _setlist(now, id: 'concert', scoreIds: const ['a', 'c', 'b']),
      ],
      userAnnotationStampPacks: [_stampPack(now, name: 'Remote stamps')],
    );

    final dryRun = SheetLibrarySyncDryRun.compare(
      base: base,
      local: local,
      remote: remote,
    );

    expect(dryRun.conflicts, hasLength(4));
    expect(
      dryRun.items
          .singleWhere((item) => item.id == 'annotation-score')
          .conflictingFieldLabels,
      ['필기 레이어'],
    );
    expect(
      dryRun.items
          .singleWhere((item) => item.id == 'binary-score')
          .conflictingFieldLabels,
      ['원본 파일'],
    );
    expect(
      dryRun.items
          .singleWhere((item) => item.id == 'concert')
          .conflictingFieldLabels,
      ['곡 순서'],
    );
    expect(
      dryRun.items
          .singleWhere((item) => item.id == 'settings')
          .conflictingFieldLabels,
      ['사용자 스탬프'],
    );
    final markdown = SheetLibrarySyncDryRunReport.fromDryRun(dryRun)
        .toMarkdown();
    expect(markdown, isNot(contains('/local/private/score.pdf')));
    expect(markdown, isNot(contains('/remote/private/score.pdf')));
  });

  test('sync review decodes three backups and warns about duplicate input', () {
    final now = DateTime(2026, 10, 20, 20);
    final base = _backup(
      now,
      scores: [_score(now, id: 'score-a', title: 'Etude')],
    );
    final remote = _backup(
      now.add(const Duration(minutes: 2)),
      scores: [_score(now, id: 'score-a', title: 'Etude revised')],
    );
    final baseJson = SheetLibraryBackupCodec.encode(base);

    final preview = SheetLibrarySyncReviewPreview.fromJson(
      baseJson: baseJson,
      localJson: baseJson,
      remoteJson: SheetLibraryBackupCodec.encode(remote),
    );

    expect(preview.status, SheetLibrarySyncReviewStatus.ready);
    expect(preview.canReview, isTrue);
    expect(preview.snapshots, hasLength(3));
    expect(preview.report!.items, hasLength(1));
    expect(
      preview.report!.items.single.status,
      SheetLibrarySyncDryRunStatus.remoteOnly,
    );
    expect(preview.warnings, contains('기준과 로컬에 같은 백업을 선택했습니다.'));
    expect(
      preview.warnings,
      contains('백업 형식 v1에는 안정적인 라이브러리 식별자가 없어 항목 범위와 내보낸 시각으로 교차 확인해야 합니다.'),
    );
  });

  test('sync review warns when snapshots have no shared record ids', () {
    final now = DateTime(2026, 10, 20, 21);
    String encoded(String id) => SheetLibraryBackupCodec.encode(
      _backup(now, scores: [_score(now, id: id)]),
    );

    final preview = SheetLibrarySyncReviewPreview.fromJson(
      baseJson: encoded('base-score'),
      localJson: encoded('local-score'),
      remoteJson: encoded('remote-score'),
    );

    expect(preview.canReview, isTrue);
    expect(
      preview.warnings,
      contains(
        '세 백업 사이에서 공통 악보/세트리스트 식별자를 찾지 못했습니다. 같은 라이브러리에서 만든 백업인지 확인하세요.',
      ),
    );
  });

  test('sync review rejects invalid scope and unsupported versions', () {
    final now = DateTime(2026, 10, 20, 22);
    final backupJson = SheetLibraryBackupCodec.encode(_backup(now));
    final unsupported = backupJson.replaceFirst(
      RegExp(r'"version"\s*:\s*1'),
      '"version":99',
    );
    final invalidScope = backupJson.replaceFirst(
      RegExp(r'"scope"\s*:\s*"metadata-only"'),
      '"scope":"full"',
    );

    final unsupportedPreview = SheetLibrarySyncReviewPreview.fromJson(
      baseJson: unsupported,
      localJson: backupJson,
      remoteJson: backupJson,
    );
    final invalidPreview = SheetLibrarySyncReviewPreview.fromJson(
      baseJson: invalidScope,
      localJson: backupJson,
      remoteJson: backupJson,
    );

    expect(
      unsupportedPreview.status,
      SheetLibrarySyncReviewStatus.unsupportedVersion,
    );
    expect(invalidPreview.status, SheetLibrarySyncReviewStatus.invalid);
    expect(invalidPreview.failureReason, contains('기준 백업'));
  });

  test('sync dry-run distinguishes same deletion from concurrent add', () {
    final now = DateTime(2026, 10, 20, 23);
    final base = _backup(now, scores: [_score(now, id: 'removed-score')]);
    final local = _backup(
      now,
      scores: [_score(now, id: 'new-score', title: 'Local new')],
    );
    final remote = _backup(
      now,
      scores: [_score(now, id: 'new-score', title: 'Remote new')],
    );

    final dryRun = SheetLibrarySyncDryRun.compare(
      base: base,
      local: local,
      remote: remote,
    );

    final removed = dryRun.items.singleWhere(
      (item) => item.id == 'removed-score',
    );
    expect(removed.status, SheetLibrarySyncDryRunStatus.sameChange);
    expect(removed.localChange, SheetLibraryBackupDiffChange.removed);
    expect(removed.remoteChange, SheetLibraryBackupDiffChange.removed);
    final added = dryRun.items.singleWhere((item) => item.id == 'new-score');
    expect(added.status, SheetLibrarySyncDryRunStatus.conflict);
    expect(added.localChange, SheetLibraryBackupDiffChange.added);
    expect(added.remoteChange, SheetLibraryBackupDiffChange.added);
    expect(added.conflictingFieldLabels, ['제목']);
  });

  test('sync dry-run keeps reorder versus add and annotation edits manual', () {
    final now = DateTime(2026, 10, 21);
    final base = _backup(
      now,
      scores: [_score(now, id: 'annotated-score')],
      setlists: [
        _setlist(now, id: 'concert', scoreIds: const ['a', 'b']),
      ],
    );
    final local = _backup(
      now,
      scores: [
        _score(
          now,
          id: 'annotated-score',
          annotationLayer: const SheetAnnotationLayer(
            strokes: <SheetAnnotationStroke>[],
            layers: <SheetAnnotationDisplayLayer>[
              SheetAnnotationDisplayLayer.defaultLayer,
              SheetAnnotationDisplayLayer(id: 'rehearsal', label: 'Rehearsal'),
            ],
          ),
        ),
      ],
      setlists: [
        _setlist(now, id: 'concert', scoreIds: const ['b', 'a']),
      ],
    );
    final remote = _backup(
      now,
      scores: [
        _score(
          now,
          id: 'annotated-score',
          annotationLayer: SheetAnnotationLayer(
            strokes: [_stroke(now, id: 'remote-stroke')],
          ),
        ),
      ],
      setlists: [
        _setlist(now, id: 'concert', scoreIds: const ['a', 'b', 'c']),
      ],
    );

    final dryRun = SheetLibrarySyncDryRun.compare(
      base: base,
      local: local,
      remote: remote,
    );

    final annotation = dryRun.items.singleWhere(
      (item) => item.id == 'annotated-score',
    );
    expect(annotation.status, SheetLibrarySyncDryRunStatus.conflict);
    expect(annotation.conflictingFieldLabels, ['필기 레이어']);
    final setlist = dryRun.items.singleWhere((item) => item.id == 'concert');
    expect(setlist.status, SheetLibrarySyncDryRunStatus.conflict);
    expect(setlist.conflictingFieldLabels, ['곡 순서']);
  });

  test('sync review warns when a remote snapshot predates the base', () {
    final baseTime = DateTime(2026, 10, 21, 12);
    final score = _score(baseTime, id: 'score-a');

    final preview = SheetLibrarySyncReviewPreview.fromJson(
      baseJson: SheetLibraryBackupCodec.encode(
        _backup(baseTime, scores: [score]),
      ),
      localJson: SheetLibraryBackupCodec.encode(
        _backup(baseTime.add(const Duration(minutes: 5)), scores: [score]),
      ),
      remoteJson: SheetLibraryBackupCodec.encode(
        _backup(baseTime.subtract(const Duration(days: 1)), scores: [score]),
      ),
    );

    expect(preview.canReview, isTrue);
    expect(
      preview.warnings,
      contains('원격 백업의 내보낸 시각이 기준보다 이릅니다. 오래된 상태가 다시 나타난 것인지 확인하세요.'),
    );
  });

  test('sync dry-run keeps linked audio replacement manual', () {
    final now = DateTime(2026, 10, 21, 13);
    final base = _backup(
      now,
      scores: [
        _score(
          now,
          id: 'audio-score',
          linkedFiles: [_audioFile(now, '/audio/base.wav')],
        ),
      ],
    );
    final local = _backup(
      now,
      scores: [
        _score(
          now,
          id: 'audio-score',
          linkedFiles: [_audioFile(now, '/audio/local.wav')],
        ),
      ],
    );
    final remote = _backup(
      now,
      scores: [
        _score(
          now,
          id: 'audio-score',
          linkedFiles: [_audioFile(now, '/audio/remote.wav')],
        ),
      ],
    );

    final item = SheetLibrarySyncDryRun.compare(
      base: base,
      local: local,
      remote: remote,
    ).items.single;

    expect(item.status, SheetLibrarySyncDryRunStatus.conflict);
    expect(item.conflictingFieldLabels, ['연결 파일']);
  });

  test('sync dry-run keeps stamp pack deletion versus edit manual', () {
    final now = DateTime(2026, 10, 21, 14);
    final base = _backup(
      now,
      userAnnotationStampPacks: [_stampPack(now, name: 'Practice stamps')],
    );
    final local = _backup(now);
    final remote = _backup(
      now,
      userAnnotationStampPacks: [_stampPack(now, name: 'Lesson stamps')],
    );

    final item = SheetLibrarySyncDryRun.compare(
      base: base,
      local: local,
      remote: remote,
    ).items.single;

    expect(item.id, 'settings');
    expect(item.status, SheetLibrarySyncDryRunStatus.conflict);
    expect(item.conflictingFieldLabels, ['사용자 스탬프']);
  });
}

SheetLibraryBackup _backup(
  DateTime now, {
  List<SheetScore> scores = const <SheetScore>[],
  List<SheetSetlist> setlists = const <SheetSetlist>[],
  SheetAnnotationToolPreset? favoriteAnnotationPreset,
  List<SheetAnnotationStampPack> userAnnotationStampPacks =
      const <SheetAnnotationStampPack>[],
}) {
  return SheetLibraryBackup.fromState(
    scores: scores,
    setlists: setlists,
    metronomeSettings: SheetMetronomeSettings.defaultSettings,
    tunerSettings: SheetTunerSettings.defaultSettings,
    toneSettings: SheetToneSettings.defaultSettings,
    libraryViewSettings: SheetLibraryViewSettings.defaultSettings,
    favoriteAnnotationPreset: favoriteAnnotationPreset,
    userAnnotationStampPacks: userAnnotationStampPacks,
    exportedAt: now,
  );
}

SheetScore _score(
  DateTime now, {
  required String id,
  String title = 'Score',
  List<String> tags = const <String>[],
  String filePath = '/tmp/score.pdf',
  SheetAnnotationLayer annotationLayer = SheetAnnotationLayer.empty,
  SheetAnnotationStorageReference annotationStorage =
      SheetAnnotationStorageReference.inline,
  SheetViewerSettings viewerSettings = SheetViewerSettings.defaultSettings,
  List<SheetLinkedFile> linkedFiles = const <SheetLinkedFile>[],
}) {
  return SheetScore(
    id: id,
    title: title,
    composer: 'Composer',
    tags: tags,
    note: '',
    filePath: filePath,
    linkedFiles: linkedFiles,
    importedAt: now,
    updatedAt: now,
    lastOpenedAt: null,
    lastPage: 1,
    isFavorite: false,
    bookmarks: const <SheetBookmark>[],
    viewerSettings: viewerSettings,
    annotationLayer: annotationLayer,
    annotationStorage: annotationStorage,
  );
}

SheetLinkedFile _audioFile(DateTime now, String path) {
  return SheetLinkedFile(
    path: path,
    type: 'wav',
    label: 'Practice audio',
    role: SheetLinkedFile.referenceRole,
    createdAt: now,
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

SheetAnnotationStampPack _stampPack(DateTime now, {required String name}) {
  return SheetAnnotationStampPack(
    id: 'practice-stamps',
    name: name,
    version: 1,
    createdAt: now,
    updatedAt: now,
    stamps: const <SheetAnnotationUserStamp>[
      SheetAnnotationUserStamp(
        id: 'remember',
        packId: 'practice-stamps',
        label: 'Remember',
        category: 'Practice',
        kind: SheetAnnotationUserStamp.textKind,
        text: 'Remember',
      ),
    ],
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
