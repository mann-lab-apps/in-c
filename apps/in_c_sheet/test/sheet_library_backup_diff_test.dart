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
