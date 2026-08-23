import 'dart:convert';
import 'dart:io';

import 'package:archive/archive.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_file_import.dart';
import 'package:in_c_sheet/sheet_library_backup.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_library_view_settings.dart';
import 'package:in_c_sheet/sheet_metronome.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:in_c_sheet/sheet_setlist.dart';
import 'package:in_c_sheet/sheet_tuner.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory documentsDir;

  setUp(() async {
    documentsDir = await Directory.systemTemp.createTemp('clef-store-test-');
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
          const MethodChannel('plugins.flutter.io/path_provider'),
          (call) async {
            return switch (call.method) {
              'getApplicationDocumentsDirectory' => documentsDir.path,
              'getTemporaryDirectory' => documentsDir.path,
              _ => null,
            };
          },
        );
  });

  tearDown(() async {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
          const MethodChannel('plugins.flutter.io/path_provider'),
          null,
        );
    if (documentsDir.existsSync()) {
      await documentsDir.delete(recursive: true);
    }
  });

  test('persists scores and setlists in SharedPreferences', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final store = SheetLibraryStore();
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final score = SheetScore(
      id: 'score-1',
      title: 'Sonata',
      composer: 'Composer',
      tags: const <String>['lesson'],
      note: '',
      filePath: '/tmp/sonata.pdf',
      importedAt: now,
      updatedAt: now,
      lastOpenedAt: null,
      lastPage: 2,
      isFavorite: false,
      bookmarks: <SheetBookmark>[
        SheetBookmark(pageNumber: 2, label: 'Solo', createdAt: now),
      ],
    );
    final setlist = SheetSetlist(
      id: 'setlist-1',
      title: 'Recital',
      scoreIds: const <String>['score-1'],
      createdAt: now,
      updatedAt: now,
    );

    await store.saveScores(<SheetScore>[score]);
    await store.saveSetlists(<SheetSetlist>[setlist]);
    await store.saveMetronomeSettings(
      const SheetMetronomeSettings(
        bpm: 108,
        meter: SheetMetronomeMeter.sixEight,
      ),
    );
    await store.saveTunerSettings(
      const SheetTunerSettings(
        referencePitchA4: 442,
        displayMode: SheetTunerDisplayMode.bbTrumpet,
      ),
    );
    await store.saveLibraryViewSettings(
      const SheetLibraryViewSettings(
        sortMode: SheetLibrarySortMode.title,
        favoriteOnly: true,
        tagQuery: 'lesson',
      ),
    );

    final loadedScores = await store.loadScores();
    final loadedSetlists = await store.loadSetlists();
    final loadedMetronomeSettings = await store.loadMetronomeSettings();
    final loadedTunerSettings = await store.loadTunerSettings();
    final loadedLibraryViewSettings = await store.loadLibraryViewSettings();

    expect(loadedScores.single.bookmarks.single.label, 'Solo');
    expect(loadedSetlists.single.scoreIds, <String>['score-1']);
    expect(loadedMetronomeSettings.bpm, 108);
    expect(loadedMetronomeSettings.meter, SheetMetronomeMeter.sixEight);
    expect(loadedTunerSettings.referencePitchA4, 442);
    expect(loadedTunerSettings.displayMode, SheetTunerDisplayMode.bbTrumpet);
    expect(loadedLibraryViewSettings.sortMode, SheetLibrarySortMode.title);
    expect(loadedLibraryViewSettings.favoriteOnly, isTrue);
    expect(loadedLibraryViewSettings.tagQuery, 'lesson');
  });

  test('loads legacy in_c_sheet preference keys after Clef rename', () async {
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final score = SheetScore(
      id: 'score-legacy',
      title: 'Legacy Score',
      composer: 'Composer',
      tags: const <String>[],
      note: '',
      filePath: '/tmp/legacy.pdf',
      importedAt: now,
      updatedAt: now,
      lastOpenedAt: null,
      lastPage: 1,
      isFavorite: false,
      bookmarks: const <SheetBookmark>[],
    );

    SharedPreferences.setMockInitialValues(<String, Object>{
      'in_c_sheet_scores': SheetScore.encodeList(<SheetScore>[score]),
      'in_c_sheet_setlists': SheetSetlist.encodeList(const <SheetSetlist>[]),
      'in_c_sheet_tuner_settings': SheetTunerCodec.encode(
        const SheetTunerSettings(
          referencePitchA4: 443,
          displayMode: SheetTunerDisplayMode.bbTrumpet,
        ),
      ),
    });

    final store = SheetLibraryStore();

    expect((await store.loadScores()).single.title, 'Legacy Score');
    expect((await store.loadSetlists()), isEmpty);
    expect((await store.loadTunerSettings()).referencePitchA4, 443);
    expect(
      (await store.loadTunerSettings()).displayMode,
      SheetTunerDisplayMode.bbTrumpet,
    );
  });

  test('encodes and restores metadata backup without PDF bytes', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final store = SheetLibraryStore();
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final score = SheetScore(
      id: 'score-1',
      title: 'Sonata',
      composer: 'Composer',
      tags: const <String>['lesson'],
      note: '',
      filePath: '/tmp/sonata.pdf',
      importedAt: now,
      updatedAt: now,
      lastOpenedAt: null,
      lastPage: 2,
      isFavorite: true,
      bookmarks: const <SheetBookmark>[],
    );
    final setlist = SheetSetlist(
      id: 'setlist-1',
      title: 'Recital',
      scoreIds: const <String>['score-1'],
      createdAt: now,
      updatedAt: now,
    );

    await store.saveScores(<SheetScore>[score]);
    await store.saveSetlists(<SheetSetlist>[setlist]);
    await store.saveMetronomeSettings(
      const SheetMetronomeSettings(
        bpm: 132,
        meter: SheetMetronomeMeter.threeFour,
      ),
    );
    await store.saveTunerSettings(
      const SheetTunerSettings(
        referencePitchA4: 441,
        displayMode: SheetTunerDisplayMode.bbTrumpet,
        detectionProfile: SheetTunerDetectionProfile.bbTrumpet,
      ),
    );

    final backupJson = await store.exportMetadataBackupJson();
    final backup = SheetLibraryBackupCodec.decode(backupJson);

    expect(backup.version, SheetLibraryBackup.currentVersion);
    expect(backup.scores.single.filePath, '/tmp/sonata.pdf');
    expect(backup.toJson()['scope'], 'metadata-only');

    SharedPreferences.setMockInitialValues(<String, Object>{});
    final restoreStore = SheetLibraryStore();
    final result = await restoreStore.restoreMetadataBackupJson(backupJson);

    expect(result.didRestore, isTrue);
    expect((await restoreStore.loadScores()).single.title, 'Sonata');
    expect((await restoreStore.loadSetlists()).single.title, 'Recital');
    expect((await restoreStore.loadMetronomeSettings()).bpm, 132);
    expect((await restoreStore.loadTunerSettings()).referencePitchA4, 441);
    expect(
      (await restoreStore.loadTunerSettings()).displayMode,
      SheetTunerDisplayMode.bbTrumpet,
    );
    expect(
      (await restoreStore.loadTunerSettings()).detectionProfile,
      SheetTunerDetectionProfile.bbTrumpet,
    );
  });

  test('exports and restores a full backup zip with PDF files', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final store = SheetLibraryStore();
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final sourceBytes = await File('test-fixtures/pdfs/short-score.pdf')
        .readAsBytes();
    final score = await store.importPdfBytes(
      bytes: sourceBytes,
      fileName: 'short-score.pdf',
      importedAt: now,
    );
    final setlist = SheetSetlist(
      id: 'setlist-1',
      title: 'Recital',
      scoreIds: <String>[score.id],
      createdAt: now,
      updatedAt: now,
    );
    await store.saveScores(<SheetScore>[score]);
    await store.saveSetlists(<SheetSetlist>[setlist]);

    final zipBytes = await store.exportFullBackupZipBytes(exportedAt: now);
    final archive = ZipDecoder().decodeBytes(zipBytes);
    final manifestFile = archive.findFile(
      SheetLibraryFullBackup.manifestFileName,
    );

    expect(manifestFile, isNotNull);
    final manifest = jsonDecode(utf8.decode(manifestFile!.content)) as Map;
    expect(manifest['scope'], SheetLibraryFullBackup.scope);
    expect(manifest['fileMappings'], hasLength(1));
    final mapping = (manifest['fileMappings'] as List).single as Map;
    expect(archive.findFile(mapping['entryPath'] as String), isNotNull);

    final sourceDocumentsDir = documentsDir;
    documentsDir = await Directory.systemTemp.createTemp(
      'clef-store-restore-test-',
    );
    await sourceDocumentsDir.delete(recursive: true);
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final restoreStore = SheetLibraryStore();
    final result = await restoreStore.restoreFullBackupZipBytes(zipBytes);

    expect(result.didRestore, isTrue);
    final restoredScore = (await restoreStore.loadScores()).single;
    expect(restoredScore.title, score.title);
    expect(await File(restoredScore.filePath).exists(), isTrue);
    expect(await File(restoredScore.filePath).readAsBytes(), sourceBytes);
    expect((await restoreStore.loadSetlists()).single.scoreIds, <String>[
      score.id,
    ]);
  });

  test('rejects non-zip full backup bytes', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final store = SheetLibraryStore();

    final result = await store.restoreFullBackupZipBytes(
      utf8.encode('not a zip'),
    );

    expect(result.status, SheetLibraryBackupRestoreStatus.invalid);
  });

  test('rejects invalid backup JSON', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final store = SheetLibraryStore();

    final result = await store.restoreMetadataBackupJson('[]');

    expect(result.status, SheetLibraryBackupRestoreStatus.invalid);
  });

  test('imports PDF bytes with scanner filename cleanup', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final store = SheetLibraryStore();

    final score = await store.importPdfBytes(
      bytes: const <int>[37, 80, 68, 70],
      fileName: 'CamScanner_20260823_185455_concert-etude.pdf',
      importedAt: DateTime.parse('2026-08-23T10:00:00.000'),
    );

    expect(score.title, 'concert etude');
    expect(score.filePath.endsWith('.pdf'), isTrue);
  });

  test('provides original and sanitized PDF share candidates', () {
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    final score = _score(now, filePath: '/tmp/current-links-disabled.pdf')
        .copyWith(
          title: 'Concert Etude',
          composer: 'Goedicke',
          pdfLinkSanitization: SheetPdfLinkSanitization(
            sanitizedFromPath: '/tmp/original.pdf',
            removedUrlLinkCount: 1,
            createdAt: now,
          ),
        );

    final candidates = store.shareCandidates(score);

    expect(candidates, hasLength(2));
    expect(candidates.first.isSanitizedCopy, isTrue);
    expect(candidates.first.fileName, 'Goedicke-Concert-Etude.pdf');
    expect(candidates.last.label, '원본 PDF');
  });

  test('converts image bytes to a PDF score', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final store = SheetLibraryStore();

    final score = await store.importImagesAsPdfBytes(
      images: <SheetImportedFile>[
        SheetImportedFile(name: 'scan_001.png', bytes: _onePixelPng),
      ],
      importedAt: DateTime.parse('2026-08-23T10:00:00.000'),
    );

    expect(score.title, '001');
    expect(score.filePath.endsWith('.pdf'), isTrue);
  });
}

SheetScore _score(DateTime now, {String filePath = '/tmp/sonata.pdf'}) {
  return SheetScore(
    id: 'score-1',
    title: 'Sonata',
    composer: 'Composer',
    tags: const <String>['lesson'],
    note: '',
    filePath: filePath,
    importedAt: now,
    updatedAt: now,
    lastOpenedAt: null,
    lastPage: 2,
    isFavorite: false,
    bookmarks: const <SheetBookmark>[],
  );
}

final Uint8List _onePixelPng = File(
  'android/app/src/main/res/mipmap-mdpi/ic_launcher.png',
).readAsBytesSync();
