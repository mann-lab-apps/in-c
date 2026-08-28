import 'dart:convert';
import 'dart:io';

import 'package:archive/archive.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_annotation.dart';
import 'package:in_c_sheet/sheet_file_import.dart';
import 'package:in_c_sheet/sheet_library_backup.dart';
import 'package:in_c_sheet/sheet_library_profile.dart';
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
        collectionQuery: 'Etudes',
        groupQuery: 'Lesson A',
        minimumRating: 4,
      ),
    );
    await store.saveFavoriteAnnotationPreset(
      const SheetAnnotationToolPreset(
        toolName: 'stamp',
        color: 0xffd33232,
        width: 8,
        stampName: 'cue',
      ),
    );

    final loadedScores = await store.loadScores();
    final loadedSetlists = await store.loadSetlists();
    final loadedMetronomeSettings = await store.loadMetronomeSettings();
    final loadedTunerSettings = await store.loadTunerSettings();
    final loadedLibraryViewSettings = await store.loadLibraryViewSettings();
    final loadedFavoriteAnnotationPreset = await store
        .loadFavoriteAnnotationPreset();

    expect(loadedScores.single.bookmarks.single.label, 'Solo');
    expect(loadedSetlists.single.scoreIds, <String>['score-1']);
    expect(loadedMetronomeSettings.bpm, 108);
    expect(loadedMetronomeSettings.meter, SheetMetronomeMeter.sixEight);
    expect(loadedTunerSettings.referencePitchA4, 442);
    expect(loadedTunerSettings.displayMode, SheetTunerDisplayMode.bbTrumpet);
    expect(loadedLibraryViewSettings.sortMode, SheetLibrarySortMode.title);
    expect(loadedLibraryViewSettings.favoriteOnly, isTrue);
    expect(loadedLibraryViewSettings.tagQuery, 'lesson');
    expect(loadedLibraryViewSettings.collectionQuery, 'Etudes');
    expect(loadedLibraryViewSettings.groupQuery, 'Lesson A');
    expect(loadedLibraryViewSettings.minimumRating, 4);
    expect(loadedFavoriteAnnotationPreset?.toolName, 'stamp');
    expect(loadedFavoriteAnnotationPreset?.stampName, 'cue');
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

  test('separates scores and setlists by active library profile', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final store = SheetLibraryStore();
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final defaultScore = SheetScore(
      id: 'default-score',
      title: 'Default',
      composer: '',
      tags: const <String>[],
      note: '',
      filePath: '/tmp/default.pdf',
      importedAt: now,
      updatedAt: now,
      lastOpenedAt: null,
      lastPage: 1,
      isFavorite: false,
      bookmarks: const <SheetBookmark>[],
    );
    final profileScore = SheetScore(
      id: 'profile-score',
      title: 'Profile',
      composer: '',
      tags: const <String>[],
      note: '',
      filePath: '/tmp/profile.pdf',
      importedAt: now,
      updatedAt: now,
      lastOpenedAt: null,
      lastPage: 1,
      isFavorite: false,
      bookmarks: const <SheetBookmark>[],
    );

    await store.saveScores(<SheetScore>[defaultScore]);
    final created = await store.createLibraryProfile('Recital');

    expect(created.name, 'Recital');
    expect(await store.loadScores(), isEmpty);

    await store.saveScores(<SheetScore>[profileScore]);
    await store.saveSetlists(<SheetSetlist>[
      SheetSetlist(
        id: 'profile-setlist',
        title: 'Profile Setlist',
        scoreIds: const <String>['profile-score'],
        createdAt: now,
        updatedAt: now,
      ),
    ]);
    await store.saveLibraryViewSettings(
      const SheetLibraryViewSettings(
        sortMode: SheetLibrarySortMode.title,
        favoriteOnly: true,
        tagQuery: '',
        collectionQuery: '',
        groupQuery: '',
        minimumRating: 0,
      ),
    );

    await store.setActiveLibraryProfile(SheetLibraryProfile.defaultId);
    expect((await store.loadScores()).single.id, 'default-score');
    expect(await store.loadSetlists(), isEmpty);
    expect(
      (await store.loadLibraryViewSettings()).sortMode,
      SheetLibrarySortMode.recent,
    );

    await store.setActiveLibraryProfile(created.id);
    expect((await store.loadScores()).single.id, 'profile-score');
    expect((await store.loadSetlists()).single.id, 'profile-setlist');
    expect(
      (await store.loadLibraryViewSettings()).sortMode,
      SheetLibrarySortMode.title,
    );

    final duplicate = await store.createLibraryProfile('Recital');
    expect(duplicate.id, created.id);
    expect(
      await store.renameLibraryProfile(id: created.id, name: '기본 라이브러리'),
      isNull,
    );
  });

  test('keeps automatic metadata backups per active library profile', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final store = SheetLibraryStore();
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    await store.saveScores(<SheetScore>[
      SheetScore(
        id: 'default-score',
        title: 'Default',
        composer: '',
        tags: const <String>[],
        note: '',
        filePath: '/tmp/default.pdf',
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: null,
        lastPage: 1,
        isFavorite: false,
        bookmarks: const <SheetBookmark>[],
      ),
    ]);
    final defaultBackup = await store.loadAutomaticMetadataBackup();

    final profile = await store.createLibraryProfile('Lessons');
    await store.saveScores(<SheetScore>[
      SheetScore(
        id: 'lesson-score',
        title: 'Lesson',
        composer: '',
        tags: const <String>[],
        note: '',
        filePath: '/tmp/lesson.pdf',
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: null,
        lastPage: 1,
        isFavorite: false,
        bookmarks: const <SheetBookmark>[],
      ),
    ]);
    await store.saveSetlists(<SheetSetlist>[
      SheetSetlist(
        id: 'lesson-setlist',
        title: 'Lesson Setlist',
        scoreIds: const <String>['lesson-score'],
        createdAt: now,
        updatedAt: now,
      ),
    ]);
    final lessonBackup = await store.loadAutomaticMetadataBackup();

    expect(defaultBackup?.scores.single.id, 'default-score');
    expect(lessonBackup?.scores.single.id, 'lesson-score');
    expect(lessonBackup?.setlists.single.id, 'lesson-setlist');

    await store.setActiveLibraryProfile(SheetLibraryProfile.defaultId);
    expect(
      (await store.loadAutomaticMetadataBackup())?.scores.single.id,
      'default-score',
    );
    await store.setActiveLibraryProfile(profile.id);
    expect(
      (await store.loadAutomaticMetadataBackup())?.scores.single.id,
      'lesson-score',
    );

    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      'clef_scores.${profile.id}',
      SheetScore.encodeList(const <SheetScore>[]),
    );
    final restored = await store.restoreAutomaticMetadataBackup();
    expect(restored.status, SheetLibraryBackupRestoreStatus.restored);
    expect((await store.loadScores()).single.id, 'lesson-score');

    expect(await store.deleteLibraryProfile(profile.id), isTrue);
    expect(
      preferences.getString('clef_automatic_metadata_backup.${profile.id}'),
      isNull,
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
      collection: 'Etudes',
      group: 'Lesson A',
      rating: 4,
      linkedFiles: <SheetLinkedFile>[
        SheetLinkedFile(
          path: '/tmp/sonata-part.pdf',
          type: 'pdf',
          label: 'Trumpet part',
          role: SheetLinkedFile.partRole,
          createdAt: now,
        ),
      ],
      customFields: const <SheetCustomMetadataField>[
        SheetCustomMetadataField(key: 'Publisher', value: 'Mann Lab'),
      ],
      viewerSettings: const SheetViewerSettings(
        displayMode: 'auto',
        halfPageTurn: false,
        pedalMapping: SheetViewerSettings.customPedalMappingType,
        customPedalMapping: <String, String>{
          'Space': 'toggleQuickActions',
          'Shift+Space': 'previousPage',
        },
      ),
      pageSettings: SheetPageSettings.empty.copyWith(
        pageCrops: const <int, SheetCropSettings>{
          2: SheetCropSettings(left: 0.04, right: 0.03),
        },
      ),
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
      scoreDurations: const <String, int>{'score-1': 240},
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
        displayMode: SheetTunerDisplayMode.altoSax,
        detectionProfile: SheetTunerDetectionProfile.highInstrument,
        targetConcertMidiNumber: 70,
      ),
    );
    await store.saveFavoriteAnnotationPreset(
      const SheetAnnotationToolPreset(
        toolName: 'highlighter',
        color: 0xffffcc25,
        width: 10,
      ),
    );

    final backupJson = await store.exportMetadataBackupJson();
    final backup = SheetLibraryBackupCodec.decode(backupJson);
    final decimalVersionBackup = SheetLibraryBackupCodec.decode(
      backupJson.replaceFirst('"version": 1', '"version": 1.0'),
    );

    expect(backup.version, SheetLibraryBackup.currentVersion);
    expect(decimalVersionBackup.version, SheetLibraryBackup.currentVersion);
    expect(
      () => SheetLibraryBackupCodec.decode(
        backupJson.replaceFirst('"version": 1', '"version": 1.4'),
      ),
      throwsUnsupportedError,
    );
    expect(backup.scores.single.filePath, '/tmp/sonata.pdf');
    expect(backup.scores.single.collection, 'Etudes');
    expect(backup.scores.single.group, 'Lesson A');
    expect(backup.scores.single.rating, 4);
    expect(backup.scores.single.linkedFiles.single.label, 'Trumpet part');
    expect(
      backup.scores.single.linkedFiles.single.role,
      SheetLinkedFile.partRole,
    );
    expect(backup.scores.single.customFields.single.key, 'Publisher');
    expect(backup.scores.single.customFields.single.value, 'Mann Lab');
    expect(
      backup.scores.single.viewerSettings.customPedalMapping['Space'],
      'toggleQuickActions',
    );
    expect(backup.scores.single.pageSettings.cropForPage(2).left, 0.04);
    expect(backup.setlists.single.scoreDurations, <String, int>{
      'score-1': 240,
    });
    expect(backup.favoriteAnnotationPreset?.toolName, 'highlighter');
    expect(backup.toJson()['scope'], 'metadata-only');
    final corruptedBackupJson = Map<String, Object?>.of(backup.toJson())
      ..['exportedAt'] = 7
      ..['favoriteAnnotationPreset'] = 7;
    final repairedBackup = SheetLibraryBackupCodec.decode(
      jsonEncode(corruptedBackupJson),
    );

    expect(repairedBackup.exportedAt, DateTime.fromMillisecondsSinceEpoch(0));
    expect(repairedBackup.scores.single.id, score.id);
    expect(repairedBackup.favoriteAnnotationPreset, isNull);

    SharedPreferences.setMockInitialValues(<String, Object>{});
    final restoreStore = SheetLibraryStore();
    final result = await restoreStore.restoreMetadataBackupJson(backupJson);

    expect(result.didRestore, isTrue);
    final restoredScore = (await restoreStore.loadScores()).single;
    expect(restoredScore.title, 'Sonata');
    expect(restoredScore.collection, 'Etudes');
    expect(restoredScore.group, 'Lesson A');
    expect(restoredScore.rating, 4);
    expect(restoredScore.linkedFiles.single.path, '/tmp/sonata-part.pdf');
    expect(restoredScore.linkedFiles.single.role, SheetLinkedFile.partRole);
    expect(restoredScore.customFields.single.value, 'Mann Lab');
    expect(
      restoredScore.viewerSettings.customPedalMapping['Space'],
      'toggleQuickActions',
    );
    expect(restoredScore.pageSettings.cropForPage(2).right, 0.03);
    final restoredSetlist = (await restoreStore.loadSetlists()).single;
    expect(restoredSetlist.title, 'Recital');
    expect(restoredSetlist.scoreDurations, <String, int>{'score-1': 240});
    expect((await restoreStore.loadMetronomeSettings()).bpm, 132);
    expect((await restoreStore.loadTunerSettings()).referencePitchA4, 441);
    expect(
      (await restoreStore.loadTunerSettings()).displayMode,
      SheetTunerDisplayMode.altoSax,
    );
    expect(
      (await restoreStore.loadTunerSettings()).detectionProfile,
      SheetTunerDetectionProfile.highInstrument,
    );
    expect(
      (await restoreStore.loadTunerSettings()).targetConcertMidiNumber,
      70,
    );
    expect(
      (await restoreStore.loadFavoriteAnnotationPreset())?.toolName,
      'highlighter',
    );
  });

  test('imports linked files into app storage metadata', () async {
    final store = SheetLibraryStore();
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final bytes = utf8.encode('%PDF linked part');

    final linkedFile = await store.importLinkedFileBytes(
      bytes: bytes,
      fileName: 'Trumpet Part.pdf',
      importedAt: now,
    );

    expect(linkedFile.type, 'pdf');
    expect(linkedFile.label, 'Trumpet Part');
    expect(linkedFile.createdAt, now);
    expect(linkedFile.path, contains('linked-files'));
    expect(await File(linkedFile.path).readAsBytes(), bytes);
  });

  test('decodes full backup file mappings from dynamic JSON maps', () {
    final mappings = SheetLibraryFullBackupFileMapping.decodeList(<dynamic>[
      <String, dynamic>{
        'scoreId': 'score-1',
        'entryPath': 'scores/score-1.pdf',
        'originalFileName': 'score.pdf',
        'missing': false,
      },
      <String, dynamic>{
        'scoreId': 'score-1',
        'entryPath': 'linked/part.pdf',
        'originalFileName': 'part.pdf',
        'missing': false,
        'linkedFilePath': '/tmp/part.pdf',
      },
    ]);

    expect(mappings, hasLength(2));
    expect(mappings.first.isLinkedFile, isFalse);
    expect(mappings.last.isLinkedFile, isTrue);
    expect(mappings.last.linkedFilePath, '/tmp/part.pdf');
  });

  test('ignores non-list full backup file mappings', () {
    expect(SheetLibraryFullBackupFileMapping.decodeList('bad'), isEmpty);
  });

  test('skips invalid full backup file mappings', () {
    final mappings = SheetLibraryFullBackupFileMapping.decodeList(<dynamic>[
      <String, dynamic>{
        'scoreId': '',
        'entryPath': 'scores/missing-score-id.pdf',
        'originalFileName': 'broken.pdf',
        'missing': false,
      },
      <String, dynamic>{
        'scoreId': 'score-2',
        'entryPath': 'scores/score-2.pdf',
        'originalFileName': 7,
        'missing': 'no',
        'linkedFilePath': 42,
      },
      <String, dynamic>{
        'scoreId': 'score-1',
        'entryPath': 'scores/score-1.pdf',
        'originalFileName': 'score.pdf',
        'missing': false,
      },
    ]);

    expect(mappings, hasLength(2));
    expect(mappings.first.scoreId, 'score-2');
    expect(mappings.first.originalFileName, 'score.pdf');
    expect(mappings.first.missing, isFalse);
    expect(mappings.first.isLinkedFile, isFalse);
    expect(mappings.last.scoreId, 'score-1');
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
    final linkedBytes = utf8.encode('%PDF linked part');
    final linkedFile = await store.importLinkedFileBytes(
      bytes: linkedBytes,
      fileName: 'Trumpet Part.pdf',
      importedAt: now,
    );
    final annotationFile = File('${documentsDir.path}/score.annotations.json')
      ..writeAsStringSync('{"strokes":[],"texts":[],"redoStack":[]}');
    final scoreWithLinkedFile = score.copyWith(
      linkedFiles: <SheetLinkedFile>[linkedFile],
      viewerSettings: const SheetViewerSettings(
        displayMode: 'auto',
        halfPageTurn: false,
        pedalMapping: SheetViewerSettings.customPedalMappingType,
        customPedalMapping: <String, String>{
          'ArrowDown': 'nextPage',
          'MediaNext': 'nextSetlistScore',
        },
      ),
      pageSettings: SheetPageSettings.empty.copyWith(
        pageCrops: const <int, SheetCropSettings>{
          1: SheetCropSettings(top: 0.02, bottom: 0.02),
        },
      ),
      annotationStorage: SheetAnnotationStorageReference(
        mode: SheetAnnotationStorageReference.fileMode,
        path: annotationFile.path,
        updatedAt: now,
        lastSaveStatus: 'saved',
      ),
    );
    final setlist = SheetSetlist(
      id: 'setlist-1',
      title: 'Recital',
      scoreIds: <String>[score.id],
      createdAt: now,
      updatedAt: now,
      scoreDurations: <String, int>{score.id: 180},
    );
    await store.saveScores(<SheetScore>[scoreWithLinkedFile]);
    await store.saveSetlists(<SheetSetlist>[setlist]);

    final zipBytes = await store.exportFullBackupZipBytes(exportedAt: now);
    final archive = ZipDecoder().decodeBytes(zipBytes);
    final manifestFile = archive.findFile(
      SheetLibraryFullBackup.manifestFileName,
    );

    expect(manifestFile, isNotNull);
    final manifest = jsonDecode(utf8.decode(manifestFile!.content)) as Map;
    expect(manifest['scope'], SheetLibraryFullBackup.scope);
    expect(manifest['fileMappings'], hasLength(3));
    final mappings = (manifest['fileMappings'] as List).cast<Map>();
    final scoreMapping = mappings.firstWhere(
      (mapping) =>
          !mapping.containsKey('linkedFilePath') &&
          !mapping.containsKey('annotationStoragePath'),
    );
    final linkedMapping = mappings.firstWhere(
      (mapping) => mapping.containsKey('linkedFilePath'),
    );
    final annotationMapping = mappings.firstWhere(
      (mapping) => mapping.containsKey('annotationStoragePath'),
    );
    expect(archive.findFile(scoreMapping['entryPath'] as String), isNotNull);
    expect(archive.findFile(linkedMapping['entryPath'] as String), isNotNull);
    expect(
      archive.findFile(annotationMapping['entryPath'] as String),
      isNotNull,
    );

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
    expect(restoredScore.linkedFiles.single.label, linkedFile.label);
    expect(
      restoredScore.viewerSettings.customPedalMapping['MediaNext'],
      'nextSetlistScore',
    );
    expect(restoredScore.pageSettings.cropForPage(1).top, 0.02);
    expect(restoredScore.annotationStorage.isFileBacked, isTrue);
    expect(await File(restoredScore.annotationStorage.path).exists(), isTrue);
    expect(await File(restoredScore.linkedFiles.single.path).exists(), isTrue);
    expect(
      await File(restoredScore.linkedFiles.single.path).readAsBytes(),
      linkedBytes,
    );
    expect((await restoreStore.loadSetlists()).single.scoreIds, <String>[
      score.id,
    ]);
    expect(
      (await restoreStore.loadSetlists()).single.scoreDurations,
      <String, int>{score.id: 180},
    );
  });

  test(
    'creates page rotation applied copy without mutating source PDF',
    () async {
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
      final scoreWithRotation = score.copyWith(
        pageSettings: const SheetPageSettings(
          hiddenPages: <int>[],
          pageRotations: <int, int>{2: 90},
        ),
      );

      final result = await store.createPageRotationAppliedCopy(
        scoreWithRotation,
      );

      expect(result.didWrite, isTrue);
      expect(result.rotatedPageCount, 1);
      expect(result.outputPath, isNotNull);
      expect(await File(result.outputPath!).exists(), isTrue);
      expect(await File(score.filePath).readAsBytes(), sourceBytes);
    },
  );

  test('creates page crop applied copy without mutating source PDF', () async {
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
    final scoreWithCrop = score.copyWith(
      pageSettings: const SheetPageSettings(
        hiddenPages: <int>[],
        pageRotations: <int, int>{},
        crop: SheetCropSettings(top: 0.08, bottom: 0.12),
      ),
    );

    final result = await store.createPageCropAppliedCopy(scoreWithCrop);

    expect(result.didWrite, isTrue);
    expect(result.croppedPageCount, 3);
    expect(result.outputPath, isNotNull);
    expect(await File(result.outputPath!).exists(), isTrue);
    expect(await File(score.filePath).readAsBytes(), sourceBytes);
  });

  test('creates page arrangement applied copy without mutating source PDF', () async {
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
    final scoreWithArrangement = score.copyWith(
      pageSettings: SheetPageSettings(
        hiddenPages: const <int>[2],
        pageRotations: const <int, int>{},
        pageOrder: const <int>[3, 1, 3],
        blankPageInsertions: <SheetBlankPageInsertion>[
          SheetBlankPageInsertion(
            id: 'blank-1',
            afterPage: 1,
            label: 'Notes',
            createdAt: now,
          ),
        ],
      ),
    );

    final result = await store.createPageArrangementAppliedCopy(
      scoreWithArrangement,
    );

    expect(result.didWrite, isTrue);
    expect(result.outputPageCount, 4);
    expect(result.outputPath, isNotNull);
    expect(await File(result.outputPath!).exists(), isTrue);
    expect(await File(score.filePath).readAsBytes(), sourceBytes);
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

  test(
    'provides existing original, sanitized, and linked share candidates',
    () {
      final now = DateTime.parse('2026-08-20T10:00:00.000');
      final store = SheetLibraryStore();
      final tempDir = Directory.systemTemp.createTempSync(
        'clef-share-candidates-',
      );
      addTearDown(() {
        if (tempDir.existsSync()) {
          tempDir.deleteSync(recursive: true);
        }
      });
      final currentFile = File('${tempDir.path}/current-links-disabled.pdf')
        ..writeAsBytesSync(const <int>[37, 80, 68, 70]);
      final originalFile = File('${tempDir.path}/original.pdf')
        ..writeAsBytesSync(const <int>[37, 80, 68, 70]);
      final trumpetPart = File('${tempDir.path}/trumpet-part.pdf')
        ..writeAsBytesSync(const <int>[37, 80, 68, 70]);
      final stageNote = File('${tempDir.path}/stage-note.png')
        ..writeAsBytesSync(const <int>[137, 80, 78, 71]);
      final missingLinkedPath = '${tempDir.path}/missing-part.pdf';
      final baseScore = _score(now, filePath: currentFile.path);
      final score = baseScore.copyWith(
        title: 'Concert Etude',
        composer: 'Goedicke',
        pdfLinkSanitization: SheetPdfLinkSanitization(
          sanitizedFromPath: originalFile.path,
          removedUrlLinkCount: 1,
          createdAt: now,
        ),
        linkedFiles: <SheetLinkedFile>[
          SheetLinkedFile(
            path: trumpetPart.path,
            type: 'pdf',
            label: 'Trumpet part',
            createdAt: now,
          ),
          SheetLinkedFile(
            path: stageNote.path,
            type: 'png',
            label: 'Stage note',
            createdAt: now,
          ),
          SheetLinkedFile(
            path: missingLinkedPath,
            type: 'pdf',
            label: 'Missing part',
            createdAt: now,
          ),
        ],
      );

      final candidates = store.shareCandidates(score);

      expect(candidates, hasLength(4));
      expect(candidates.first.isSanitizedCopy, isTrue);
      expect(candidates.first.fileName, 'Goedicke-Concert-Etude.pdf');
      expect(candidates.first.mimeType, 'application/pdf');
      expect(candidates[1].label, '원본 PDF');
      expect(candidates[2].label, '연결 파일: Trumpet part');
      expect(candidates[2].fileName, 'Goedicke-Concert-Etude-Trumpet-part.pdf');
      expect(candidates[2].mimeType, 'application/pdf');
      expect(candidates[2].isLinkedFile, isTrue);
      expect(candidates[3].fileName, 'Goedicke-Concert-Etude-Stage-note.png');
      expect(candidates[3].mimeType, 'image/png');
      expect(
        candidates.any((candidate) => candidate.label.contains('Missing')),
        isFalse,
      );
    },
  );

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
    expect(score.linkedFiles, hasLength(1));
    expect(score.linkedFiles.single.type, 'png');
    expect(score.linkedFiles.single.role, SheetLinkedFile.referenceRole);
    expect(await File(score.linkedFiles.single.path).exists(), isTrue);
    expect(
      await File(score.linkedFiles.single.path).readAsBytes(),
      _onePixelPng,
    );
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
