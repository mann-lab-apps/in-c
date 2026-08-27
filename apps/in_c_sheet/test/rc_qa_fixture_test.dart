import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_library_backup.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:in_c_sheet/sheet_setlist.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'fixtures/rc_qa_fixture.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
  });

  test('RC QA fixture covers weekend smoke scenarios', () {
    final scores = buildRcQaScores();
    final setlist = buildRcQaSetlists().single;
    final mainScore = scores.firstWhere((score) => score.id == 'rc-score-main');
    final scanScore = scores.firstWhere((score) => score.id == 'rc-score-scan');

    expect(scores, hasLength(2));
    expect(mainScore.linkedFiles.map((file) => file.role), <String>[
      SheetLinkedFile.partRole,
      SheetLinkedFile.pianoReductionRole,
      SheetLinkedFile.originalRole,
    ]);
    expect(mainScore.viewerSettings.pedalMapping, 'custom');
    expect(
      mainScore.viewerSettings.customPedalMapping['MediaNext'],
      'nextSetlistScore',
    );
    expect(mainScore.pageSettings.hiddenPages, <int>[2]);
    expect(mainScore.pageSettings.pageCrops, hasLength(3));
    expect(mainScore.pageSettings.effectivePageOrder(rcQaPageCount), <int>[
      1,
      3,
      4,
      5,
      4,
      6,
      7,
      8,
    ]);
    expect(mainScore.pageSettings.jumpPoints.single.label, 'To Coda');
    expect(mainScore.pageSettings.rehearsalMarks, hasLength(2));
    expect(mainScore.pageSettings.cropPresets.single.scope, 'oddEven');
    expect(mainScore.annotationLayer.strokeCount, greaterThan(40));
    expect(mainScore.annotationLayer.textCount, 6);
    expect(mainScore.annotationLayer.redoCount, 6);
    expect(mainScore.annotationLayer.pointCount, greaterThan(400));
    expect(mainScore.annotationStorage.isFileBacked, isTrue);
    expect(mainScore.annotationStorage.lastSaveStatus, 'saved');
    expect(scanScore.tags, contains('scan-pdf'));
    expect(setlist.rehearsalMode, isTrue);
    expect(setlist.totalEstimatedSeconds, 620);
    expect(setlist.scoreStartPages['rc-score-main'], 3);
  });

  test('RC QA fixture survives model JSON codecs', () {
    final scores = buildRcQaScores();
    final setlists = buildRcQaSetlists();

    final decodedScores = SheetScore.decodeList(SheetScore.encodeList(scores));
    final decodedSetlists = SheetSetlist.decodeList(
      SheetSetlist.encodeList(setlists),
    );
    final decodedMain = decodedScores.firstWhere(
      (score) => score.id == 'rc-score-main',
    );

    expect(decodedScores, hasLength(scores.length));
    expect(decodedMain.structuredNotes.performance, contains('page turns'));
    expect(decodedMain.pageSettings.cropForPage(3).left, 0.04);
    expect(
      decodedMain.pageSettings.pageOrder.where((page) => page == 4),
      hasLength(2),
    );
    expect(
      decodedMain.viewerSettings.customPedalMapping['Space'],
      'toggleQuickActions',
    );
    expect(decodedMain.annotationLayer.estimatedJsonBytes, greaterThan(1000));
    expect(decodedMain.annotationStorage.mode, 'file');
    expect(decodedSetlists.single.scoreDurations['rc-score-main'], 420);
    expect(decodedSetlists.single.transitionSeconds, 20);
  });

  test('RC QA fixture survives metadata backup round trip', () async {
    final store = SheetLibraryStore();
    await store.saveScores(buildRcQaScores());
    await store.saveSetlists(buildRcQaSetlists());

    final backupJson = await store.exportMetadataBackupJson();
    final backup = SheetLibraryBackupCodec.decode(backupJson);

    expect(backup.scores, hasLength(2));
    expect(backup.setlists.single.scoreDurations['rc-score-scan'], 180);

    SharedPreferences.setMockInitialValues(<String, Object>{});
    final restoreStore = SheetLibraryStore();
    final result = await restoreStore.restoreMetadataBackupJson(backupJson);
    final restoredScores = await restoreStore.loadScores();
    final restoredSetlists = await restoreStore.loadSetlists();
    final restoredMain = restoredScores.firstWhere(
      (score) => score.id == 'rc-score-main',
    );

    expect(result.didRestore, isTrue);
    expect(restoredScores, hasLength(2));
    expect(restoredMain.linkedFiles.first.label, 'Trumpet part');
    expect(restoredMain.pageSettings.cropForPage(5).bottom, 0.08);
    expect(restoredMain.annotationLayer.strokeCount, greaterThan(40));
    expect(restoredMain.annotationStorage.isExternal, isTrue);
    expect(
      restoredMain.viewerSettings.customPedalMapping['Tab'],
      'nextSetlistScore',
    );
    expect(restoredSetlists.single.totalEstimatedSeconds, 620);
  });

  test('RC QA fixture tolerates legacy records without new metadata', () {
    final legacyScoreJson =
        Map<String, Object?>.of(buildRcQaScores().first.toJson())
          ..remove('viewerSettings')
          ..remove('pageSettings')
          ..remove('structuredNotes')
          ..remove('annotationLayer')
          ..remove('annotationStorage');
    final legacySetlistJson =
        Map<String, Object?>.of(buildRcQaSetlists().single.toJson())
          ..remove('scoreStartPages')
          ..remove('scoreNotes')
          ..remove('scoreDurations')
          ..remove('transitionSeconds');

    final decodedScore = SheetScore.fromJson(legacyScoreJson);
    final decodedSetlist = SheetSetlist.fromJson(legacySetlistJson);

    expect(decodedScore.viewerSettings.displayMode, 'auto');
    expect(decodedScore.pageSettings.hiddenPages, isEmpty);
    expect(decodedScore.structuredNotes.performance, isEmpty);
    expect(decodedScore.annotationLayer.strokes, isEmpty);
    expect(decodedScore.annotationStorage.isExternal, isFalse);
    expect(decodedSetlist.scoreStartPages, isEmpty);
    expect(decodedSetlist.scoreDurations, isEmpty);
    expect(decodedSetlist.totalEstimatedSeconds, 0);
  });
}
