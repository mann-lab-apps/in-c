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
    expect(diff.addedSetlistIds, ['setlist-2']);
    expect(diff.removedSetlistIds, isEmpty);
    expect(diff.changedSetlistIds, ['setlist-1']);
    expect(diff.setlistOrderChangedIds, ['setlist-1']);
    expect(diff.settingsChanged, isFalse);
    expect(diff.hasChanges, isTrue);

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
        '세트리스트 순서가 달라 어느 순서를 사용할지 확인이 필요합니다.',
      ]),
    );
    expect(report.requiresReview, isTrue);

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
    expect(diff.fileChangedScoreIds, ['score-a']);
    expect(diff.annotationChangedScoreIds, isEmpty);
    expect(diff.settingsChanged, isTrue);
    expect(diff.hasChanges, isTrue);

    final report = SheetLibraryBackupDiffReport.fromDiff(diff);
    expect(report.summaryLines, contains('수정된 악보 1개'));
    expect(report.summaryLines, contains('앱/연습 도구 설정 변경'));
    expect(
      report.reviewLines,
      containsAll(<String>[
        '파일 경로나 연결 파일이 달라 원본 PDF/오디오 위치 확인이 필요합니다.',
        '메트로놈, 튜너, 표시, 필기 preset 같은 전역 설정 변경을 확인하세요.',
      ]),
    );

    final mergeReview = SheetLibraryBackupMergeReview.fromDiff(diff);
    expect(mergeReview.risk, SheetLibraryBackupMergeRisk.review);
    expect(mergeReview.title, '수정 포함 전체 교체');
    expect(mergeReview.requiresManualReview, isTrue);
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
    expect(report.requiresReview, isFalse);

    final mergeReview = SheetLibraryBackupMergeReview.fromDiff(diff);
    expect(mergeReview.risk, SheetLibraryBackupMergeRisk.none);
    expect(mergeReview.title, '변경 없음');
    expect(mergeReview.requiresManualReview, isFalse);
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
