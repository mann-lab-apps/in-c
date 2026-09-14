import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:archive/archive.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/sheet_annotation.dart';
import 'package:in_c_sheet/sheet_auto_scroll.dart';
import 'package:in_c_sheet/sheet_file_import.dart';
import 'package:in_c_sheet/sheet_library_backup.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_profile.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_library_view_settings.dart';
import 'package:in_c_sheet/sheet_metronome.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:in_c_sheet/sheet_setlist.dart';
import 'package:in_c_sheet/sheet_tone.dart';
import 'package:in_c_sheet/sheet_tuner.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:shared_preferences_platform_interface/shared_preferences_platform_interface.dart';

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

  for (final scoped in [false, true]) {
    for (final throws in [false, true]) {
      for (final key in [
        'clef_scores',
        'clef_setlists',
        'clef_automatic_metadata_backup',
      ]) {
        test(
          'score removal recovers both lists on $key failure: scoped=$scoped throws=$throws',
          () async {
            final platform = _installFailingPreferences();
            final store = SheetLibraryStore();
            final suffix = scoped
                ? '.${(await store.createLibraryProfile('Removal')).id}'
                : '';
            final now = DateTime(2026, 9, 14);
            final source = File('${documentsDir.path}/preserved.pdf');
            await source.writeAsString('source bytes');
            final original = _score(now, filePath: source.path);
            final keep = SheetScore.fromJson({
              ...original.toJson(),
              'id': 'keep',
              'title': 'Keep',
            });
            await store.saveScores([original, keep]);
            await store.saveSetlists([
              SheetSetlist(
                id: 'concert',
                title: 'Concert',
                scoreIds: [original.id, keep.id],
                createdAt: now,
                updatedAt: now,
                scoreNotes: {original.id: 'Cue'},
                scoreStartPages: {original.id: 2},
              ),
            ]);
            final controller = SheetLibraryController(store: store);
            await controller.load();
            final before = await platform.getAll();
            final scoresBefore = controller.scores
                .map((s) => s.toJson())
                .toList();
            final setsBefore = controller.setlists
                .map((s) => s.toJson())
                .toList();
            var notifications = 0;
            controller.addListener(() => notifications++);
            platform.failureKey = 'flutter.$key$suffix';
            platform.throwOnFailure = throws;
            await expectLater(
              controller.deleteScoresByIds({original.id}),
              throwsA(anything),
            );
            expect(await platform.getAll(), before);
            expect(
              controller.scores.map((s) => s.toJson()).toList(),
              scoresBefore,
            );
            expect(
              controller.setlists.map((s) => s.toJson()).toList(),
              setsBefore,
            );
            expect(notifications, greaterThan(0));
            await (await SharedPreferences.getInstance()).reload();
            expect(
              (await store.loadScores()).map((s) => s.toJson()).toList(),
              scoresBefore,
            );
            expect(
              (await store.loadSetlists()).map((s) => s.toJson()).toList(),
              setsBefore,
            );
            expect(await controller.deleteScoresByIds({original.id}), 1);
            expect(controller.scores.single.id, 'keep');
            expect(controller.setlists.single.scoreIds, ['keep']);
            expect(controller.setlists.single.scoreNotes, isEmpty);
            final backup = (await store.loadAutomaticMetadataBackup())!;
            expect(backup.scores.single.id, 'keep');
            expect(backup.setlists.single.scoreIds, ['keep']);
            expect(await source.readAsString(), 'source bytes');
          },
        );
      }
    }
  }

  testWidgets('bulk removal keeps selection after linked metadata failure', (
    tester,
  ) async {
    final platform = _installFailingPreferences();
    final store = SheetLibraryStore();
    final now = DateTime(2026, 9, 14);
    final original = _score(now);
    await store.saveScores([original]);
    await store.saveSetlists([
      SheetSetlist(
        id: 'concert',
        title: 'Concert',
        scoreIds: [original.id],
        createdAt: now,
        updatedAt: now,
      ),
    ]);
    final controller = SheetLibraryController(store: store);
    await controller.load();
    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();
    await tester.longPress(find.text('Sonata').last);
    await tester.pumpAndSettle();
    platform.failureKey = 'flutter.clef_setlists';
    await tester.tap(find.byTooltip('선택 악보 라이브러리에서 제거'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, '제거'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(find.text('선택한 악보의 변경사항을 저장하지 못했습니다. 다시 시도해주세요.'), findsOneWidget);
    expect(find.byTooltip('선택 악보 라이브러리에서 제거'), findsOneWidget);
    expect(controller.scores.single.id, original.id);
    expect(controller.setlists.single.scoreIds, [original.id]);
    await tester.pump(const Duration(seconds: 5));
    await tester.pumpAndSettle();
    expect(find.textContaining('라이브러리에서 제거했습니다.'), findsNothing);
    await tester.tap(find.byTooltip('선택 악보 라이브러리에서 제거'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, '제거'));
    await tester.pumpAndSettle();
    expect(controller.scores, isEmpty);
    expect(controller.setlists.single.scoreIds, isEmpty);
    expect(find.text('1개 악보를 라이브러리에서 제거했습니다.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('closed bulk removal ignores delayed save failure', (
    tester,
  ) async {
    final platform = _installFailingPreferences();
    final store = SheetLibraryStore();
    final now = DateTime(2026, 9, 14);
    final original = _score(now);
    await store.saveScores([original]);
    await store.saveSetlists([
      SheetSetlist(
        id: 'concert',
        title: 'Concert',
        scoreIds: [original.id],
        createdAt: now,
        updatedAt: now,
      ),
    ]);
    final controller = SheetLibraryController(store: store);
    await controller.load();
    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();
    await tester.longPress(find.text('Sonata').last);
    await tester.pumpAndSettle();
    platform.delayKey = 'flutter.clef_scores';
    platform.writeEntered = Completer<void>();
    platform.releaseWrite = Completer<void>();
    platform.failureKey = 'flutter.clef_setlists';
    await tester.tap(find.byTooltip('선택 악보 라이브러리에서 제거'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, '제거'));
    await tester.pumpAndSettle();
    expect(platform.writeEntered!.isCompleted, isTrue);
    await tester.pumpWidget(const SizedBox.shrink());
    platform.releaseWrite!.complete();
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(controller.scores.single.id, original.id);
    expect(controller.setlists.single.scoreIds, [original.id]);
  });

  test('score removal reports rollback failure instead of success', () async {
    final platform = _installFailingPreferences();
    final store = SheetLibraryStore();
    final now = DateTime(2026, 9, 14);
    final original = _score(now);
    await store.saveScores([original]);
    await store.saveSetlists([
      SheetSetlist(
        id: 'concert',
        title: 'Concert',
        scoreIds: [original.id],
        createdAt: now,
        updatedAt: now,
      ),
    ]);
    final controller = SheetLibraryController(store: store);
    await controller.load();
    platform.failureKey = 'flutter.clef_setlists';
    platform.failuresRemaining = 2;
    await expectLater(
      controller.deleteScoresByIds({original.id}),
      throwsA(
        isA<StateError>().having(
          (error) => error.message,
          'message',
          contains('rollback failed'),
        ),
      ),
    );
    await (await SharedPreferences.getInstance()).reload();
    await controller.load();
    expect(await controller.deleteScoresByIds({original.id}), 1);
  });

  for (final failedKey in ['clef_scores', 'clef_automatic_metadata_backup']) {
    test(
      'controller recovers annotation after $failedKey returns false',
      () async {
        final platform = _installFailingPreferences();
        final store = SheetLibraryStore();
        final now = DateTime(2026, 9, 13);
        final original = _score(now);
        await store.saveScores([original]);
        final controller = SheetLibraryController(store: store);
        await controller.load();
        platform.failureKey = 'flutter.$failedKey';
        final text = SheetTextAnnotation(
          id: 'cue',
          pageNumber: 1,
          position: const SheetAnnotationPoint(x: 0.2, y: 0.3),
          text: 'Cue',
          color: 0xff000000,
          fontSize: 18,
          createdAt: now,
        );
        await expectLater(
          controller.addTextAnnotation(original, text),
          throwsA(isA<StateError>()),
        );
        expect(controller.scores.single.toJson(), original.toJson());
        await (await SharedPreferences.getInstance()).reload();
        expect((await store.loadScores()).single.toJson(), original.toJson());
        await controller.addTextAnnotation(controller.scores.single, text);
        await controller.load();
        expect(controller.scores.single.annotationLayer.texts.single.id, 'cue');
      },
    );
  }

  for (final throws in [false, true]) {
    for (final empty in [false, true]) {
      for (final failedKey in [
        'clef_scores',
        'clef_automatic_metadata_backup',
      ]) {
        test(
          'score save rolls back $failedKey (empty: $empty, throws: $throws)',
          () async {
            final platform = _installFailingPreferences();
            final store = SheetLibraryStore();
            final original = _score(DateTime(2026, 9, 13));
            await store.saveScores([original]);
            final profile = await store.createLibraryProfile('Save target');
            if (!empty) {
              await store.saveScores([original]);
            }
            final before = await platform.getAll();
            platform.failureKey = 'flutter.$failedKey.${profile.id}';
            platform.throwOnFailure = throws;
            final revised = original.copyWith(title: 'Revised');
            await expectLater(store.saveScores([revised]), throwsA(anything));
            expect(await platform.getAll(), before);
            expect(
              (await store.loadScores()).map((s) => s.title),
              empty ? isEmpty : ['Sonata'],
            );
            await (await SharedPreferences.getInstance()).reload();
            expect(
              (await store.loadScores()).map((s) => s.title),
              empty ? isEmpty : ['Sonata'],
            );
            await store.saveScores([revised]);
            expect((await store.loadScores()).single.title, 'Revised');
            expect(
              (await store.loadAutomaticMetadataBackup())!.scores.single.title,
              'Revised',
            );
            await store.setActiveLibraryProfile(SheetLibraryProfile.defaultId);
            expect((await store.loadScores()).single.title, 'Sonata');
          },
        );
      }
    }
  }

  for (final kind in ['scores', 'setlists']) {
    for (final throws in [false, true]) {
      test(
        'explicit $kind target keeps backup rollback scoped: $throws',
        () async {
          final platform = _installFailingPreferences();
          final store = SheetLibraryStore();
          final now = DateTime(2026, 9, 14);
          final original = _score(now);
          final source = await store.createLibraryProfile('Source');
          await store.saveScores([original]);
          final setlist = SheetSetlist(
            id: 'concert',
            title: 'Concert',
            scoreIds: [original.id],
            createdAt: now,
            updatedAt: now,
          );
          await store.saveSetlists([setlist]);
          final destination = await store.createLibraryProfile('Destination');
          final before = await platform.getAll();
          Future<void> save() => kind == 'scores'
              ? store.saveScores([
                  original.copyWith(title: 'Revised'),
                ], libraryId: source.id)
              : store.saveSetlists([
                  setlist.copyWith(title: 'Revised'),
                ], libraryId: source.id);
          platform.failureKey =
              'flutter.clef_automatic_metadata_backup.${source.id}';
          platform.throwOnFailure = throws;
          await expectLater(save(), throwsA(anything));
          expect(await platform.getAll(), before);
          await save();
          expect((await store.loadActiveLibraryProfile()).id, destination.id);
          expect(await store.loadScores(), isEmpty);
          expect(await store.loadSetlists(), isEmpty);
          final after = await platform.getAll();
          for (final key in before.keys) {
            if (key != 'flutter.clef_$kind.${source.id}' &&
                key != 'flutter.clef_automatic_metadata_backup.${source.id}') {
              expect(after[key], before[key], reason: key);
            }
          }
          await store.setActiveLibraryProfile(source.id);
          final backup = (await store.loadAutomaticMetadataBackup())!;
          expect(
            kind == 'scores'
                ? backup.scores.single.title
                : backup.setlists.single.title,
            'Revised',
          );
          expect(
            kind == 'scores'
                ? (await store.loadScores()).single.title
                : (await store.loadSetlists()).single.title,
            'Revised',
          );
        },
      );
    }
  }

  for (final raw in <String?>[
    null,
    'not valid JSON',
    '[{"id":"named","name":"Concert","futureField":{"keep":true}}]',
  ]) {
    test('profile reads preserve raw storage: $raw', () async {
      SharedPreferences.setMockInitialValues({'clef_library_profiles': ?raw});
      final preferences = await SharedPreferences.getInstance();
      final store = SheetLibraryStore();
      final profiles = await store.loadLibraryProfiles();
      expect(profiles.first.isDefault, isTrue);
      expect(
        profiles.any((p) => p.id == 'named'),
        raw?.contains('named') ?? false,
      );
      await store.loadActiveLibraryProfile();
      await store.loadScores();
      expect(preferences.getString('clef_library_profiles'), raw);
      await preferences.reload();
      expect(preferences.getString('clef_library_profiles'), raw);
    });
  }

  test(
    'reading existing scores does not depend on profile index writes',
    () async {
      final platform = _installFailingPreferences();
      final store = SheetLibraryStore();
      final original = _score(DateTime(2026, 9, 14));
      await store.saveScores([original]);
      final before = await platform.getAll();
      platform.failureKey = 'flutter.clef_library_profiles';
      platform.throwOnFailure = true;
      final controller = SheetLibraryController(store: store);
      await controller.load();
      expect(controller.errorMessage, isNull);
      expect(controller.scores.single.toJson(), original.toJson());
      expect(await platform.getAll(), before);
    },
  );

  final metadataSaves = <String, Future<void> Function(SheetLibraryStore)>{
    'clef_setlists': (store) => store.saveSetlists([]),
    'clef_metronome_settings': (store) => store.saveMetronomeSettings(
      SheetMetronomeSettings.defaultSettings.copyWith(bpm: 73),
    ),
    'clef_tuner_settings': (store) =>
        store.saveTunerSettings(SheetTunerSettings(referencePitchA4: 442)),
    'clef_tone_settings': (store) =>
        store.saveToneSettings(const SheetToneSettings(volumePercent: 80)),
    'clef_library_view_settings': (store) =>
        store.saveLibraryViewSettings(SheetLibraryViewSettings.defaultSettings),
    'clef_global_viewer_settings': (store) => store.saveGlobalViewerSettings(
      SheetViewerSettings.defaultSettings.copyWith(halfPageTurn: true),
    ),
    'clef_performance_preset_templates': (store) =>
        store.savePerformancePresetTemplates([]),
    'clef_favorite_annotation_preset': (store) =>
        store.saveFavoriteAnnotationPreset(null),
  };
  for (final entry in metadataSaves.entries) {
    for (final backupFails in [false, true]) {
      for (final throws in [false, true]) {
        test(
          'metadata save rolls back ${entry.key} (backup: $backupFails, throws: $throws)',
          () async {
            final platform = _installFailingPreferences();
            final store = SheetLibraryStore();
            await store.saveScores([_score(DateTime(2026, 9, 13))]);
            await store.saveFavoriteAnnotationPreset(
              const SheetAnnotationToolPreset(
                toolName: 'pen',
                color: 0xff000000,
                width: 3,
              ),
            );
            final before = await platform.getAll();
            platform.failureKey =
                'flutter.${backupFails ? 'clef_automatic_metadata_backup' : entry.key}';
            platform.throwOnFailure = throws;
            await expectLater(entry.value(store), throwsA(anything));
            expect(await platform.getAll(), before);
            final preferences = await SharedPreferences.getInstance();
            final cached = preferences.getKeys().toList();
            await preferences.reload();
            expect(preferences.getKeys(), unorderedEquals(cached));
            await entry.value(store);
            expect(await platform.getAll(), isNot(before));
          },
        );
      }
    }
  }

  test(
    'score save reports failed rollback and permits a later retry',
    () async {
      final platform = _installFailingPreferences();
      final store = SheetLibraryStore();
      final original = _score(DateTime(2026, 9, 13));
      await store.saveScores([original]);
      platform.failureKey = 'flutter.clef_automatic_metadata_backup';
      platform.failuresRemaining = 2;
      await expectLater(
        store.saveScores([original.copyWith(title: 'Failed')]),
        throwsA(
          isA<StateError>().having(
            (e) => e.message,
            'message',
            contains('rollback failed'),
          ),
        ),
      );
      expect((await store.loadScores()).single.title, 'Sonata');
      await store.saveScores([original.copyWith(title: 'Retry')]);
      expect(
        (await store.loadAutomaticMetadataBackup())!.scores.single.title,
        'Retry',
      );
    },
  );

  test(
    'failed score save cannot roll back a concurrent setlist save',
    () async {
      final platform = _installFailingPreferences();
      final store = SheetLibraryStore();
      final original = _score(DateTime(2026, 9, 13));
      await store.saveScores([original]);
      platform.delayKey = 'flutter.clef_automatic_metadata_backup';
      platform.failureKey = platform.delayKey;
      platform.writeEntered = Completer<void>();
      platform.releaseWrite = Completer<void>();
      final failed = expectLater(
        store.saveScores([original.copyWith(title: 'Failed')]),
        throwsA(anything),
      );
      await platform.writeEntered!.future;
      final setlist = SheetSetlist(
        id: 'concert',
        title: 'Concert',
        scoreIds: [original.id],
        createdAt: original.importedAt,
        updatedAt: original.updatedAt,
      );
      final next = SheetLibraryStore().saveSetlists([setlist]);
      await Future<void>.delayed(Duration.zero);
      expect(
        (await platform.getAll()).containsKey('flutter.clef_setlists'),
        isFalse,
      );
      platform.releaseWrite!.complete();
      await failed;
      await next;
      await (await SharedPreferences.getInstance()).reload();
      expect((await store.loadScores()).single.title, 'Sonata');
      expect(
        (await store.loadAutomaticMetadataBackup())!.scores.single.title,
        'Sonata',
      );
      expect((await store.loadSetlists()).single.id, 'concert');
      expect(
        (await store.loadAutomaticMetadataBackup())!.setlists.single.id,
        'concert',
      );
    },
  );

  for (final fullZip in <bool>[false, true]) {
    for (final throws in <bool>[false, true]) {
      for (final failedKey in <String>[
        'clef_setlists',
        'clef_tone_settings',
        'clef_favorite_annotation_preset',
        'clef_automatic_metadata_backup',
      ]) {
        test('restore rolls back $failedKey (ZIP: $fullZip, throws: $throws)', () async {
          final platform = _installFailingPreferences();
          final store = SheetLibraryStore();
          final source = await store.importPdfBytes(
            bytes: await File('test-fixtures/pdfs/short-score.pdf')
                .readAsBytes(),
            fileName: 'rollback.pdf',
          );
          await store.saveScores(<SheetScore>[source]);
          final profile = await store.createLibraryProfile('Restore target');
          await store.saveScores(<SheetScore>[source]);
          final metadata = await store.exportMetadataBackupJson();
          final zip = await store.exportFullBackupZipBytes();
          await store.saveScores(<SheetScore>[
            source.copyWith(title: 'Current score'),
          ]);
          await store.saveMetronomeSettings(
            const SheetMetronomeSettings(
              bpm: 73,
              meter: SheetMetronomeMeter.threeFour,
            ),
          );
          await store.saveTunerSettings(
            SheetTunerSettings(referencePitchA4: 442),
          );
          await store.saveFavoriteAnnotationPreset(
            const SheetAnnotationToolPreset(
              toolName: 'stamp',
              color: 0xffd33232,
              width: 8,
              stampName: 'cue',
            ),
          );
          final before = await platform.getAll();
          platform.failureKey =
              'flutter.$failedKey${failedKey == 'clef_tone_settings' ? '' : '.${profile.id}'}';
          platform.throwOnFailure = throws;
          final result = fullZip
              ? await store.restoreFullBackupZipBytes(zip)
              : await store.restoreMetadataBackupJson(metadata);
          expect(result.status, SheetLibraryBackupRestoreStatus.error);
          expect(await platform.getAll(), before);
          final preferences = await SharedPreferences.getInstance();
          await preferences.reload();
          expect((await store.loadScores()).single.title, 'Current score');
          expect((await store.loadMetronomeSettings()).bpm, 73);
          expect((await store.loadTunerSettings()).referencePitchA4, 442);
          expect(
            (await store.loadFavoriteAnnotationPreset())?.toolName,
            'stamp',
          );
          final retry = fullZip
              ? await store.restoreFullBackupZipBytes(zip)
              : await store.restoreMetadataBackupJson(metadata);
          expect(retry.didRestore, isTrue);
          final snapshot = (await store.loadAutomaticMetadataBackup())!;
          final restoredScore = (await store.loadScores()).single;
          expect(snapshot.scores.single.filePath, restoredScore.filePath);
          expect(snapshot.scores.single.title, source.title);
          expect(snapshot.tunerSettings.referencePitchA4, 440);
          expect(await store.loadFavoriteAnnotationPreset(), isNull);
          await store.setActiveLibraryProfile(SheetLibraryProfile.defaultId);
          expect((await store.loadScores()).single.title, source.title);
        });
      }
    }
  }

  test(
    'restore reports a failed rollback and still attempts other keys',
    () async {
      final platform = _installFailingPreferences();
      final store = SheetLibraryStore();
      final score = _score(DateTime(2026, 9, 13));
      await store.saveScores(<SheetScore>[score]);
      final metadata = await store.exportMetadataBackupJson();
      await store.saveScores(<SheetScore>[
        score.copyWith(title: 'Current score'),
      ]);
      platform.failureKey = 'flutter.clef_setlists';
      platform.failuresRemaining = 2;
      final result = await store.restoreMetadataBackupJson(metadata);
      expect(result.status, SheetLibraryBackupRestoreStatus.error);
      expect(result.failureReason, contains('rollback failed'));
      expect((await store.loadScores()).single.title, 'Current score');
    },
  );

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
      metronomeSettings: const SheetMetronomeSettings(
        bpm: 96,
        meter: SheetMetronomeMeter.threeFour,
        countInBars: 1,
      ),
    );
    final setlist = SheetSetlist(
      id: 'setlist-1',
      title: 'Recital',
      scoreIds: const <String>['score-1'],
      createdAt: now,
      updatedAt: now,
      scoreMetronomeSettings: const <String, SheetMetronomeSettings>{
        'score-1': SheetMetronomeSettings(
          bpm: 104,
          meter: SheetMetronomeMeter.twoFour,
        ),
      },
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
      SheetTunerSettings(
        referencePitchA4: 442,
        displayMode: SheetTunerDisplayMode.bbTrumpet,
        notationPreference: SheetTunerNotationPreference.flats,
        customTargets: const <SheetTunerTarget>[
          SheetTunerTarget(label: 'Bb4', concertMidiNumber: 70),
        ],
        customPresets: <SheetTunerCustomPreset>[
          SheetTunerCustomPreset(
            id: 'custom-brass',
            name: 'Brass warm-up',
            displayMode: SheetTunerDisplayMode.bbTrumpet,
            detectionProfile: SheetTunerDetectionProfile.bbTrumpet,
            targets: const <SheetTunerTarget>[
              SheetTunerTarget(label: 'Bb4', concertMidiNumber: 70),
            ],
            updatedAt: DateTime.utc(2026, 8, 30),
          ),
        ],
      ),
    );
    await store.saveToneSettings(
      const SheetToneSettings(
        rootConcertMidiNumber: 57,
        droneMode: SheetToneDroneMode.fifth,
        volumePercent: 40,
      ),
    );
    await store.saveLibraryViewSettings(
      const SheetLibraryViewSettings(
        sortMode: SheetLibrarySortMode.title,
        favoriteOnly: true,
        tagQuery: 'lesson',
        composerQuery: 'Bach',
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
    final loadedToneSettings = await store.loadToneSettings();
    final loadedLibraryViewSettings = await store.loadLibraryViewSettings();
    final loadedFavoriteAnnotationPreset = await store
        .loadFavoriteAnnotationPreset();

    expect(loadedScores.single.bookmarks.single.label, 'Solo');
    expect(loadedScores.single.metronomeSettings?.bpm, 96);
    expect(
      loadedScores.single.metronomeSettings?.meter,
      SheetMetronomeMeter.threeFour,
    );
    expect(loadedScores.single.metronomeSettings?.countInBars, 1);
    expect(loadedSetlists.single.scoreIds, <String>['score-1']);
    expect(loadedSetlists.single.scoreMetronomeSettings['score-1']?.bpm, 104);
    expect(
      loadedSetlists.single.scoreMetronomeSettings['score-1']?.meter,
      SheetMetronomeMeter.twoFour,
    );
    expect(loadedMetronomeSettings.bpm, 108);
    expect(loadedMetronomeSettings.meter, SheetMetronomeMeter.sixEight);
    expect(loadedTunerSettings.referencePitchA4, 442);
    expect(loadedTunerSettings.displayMode, SheetTunerDisplayMode.bbTrumpet);
    expect(
      loadedTunerSettings.notationPreference,
      SheetTunerNotationPreference.flats,
    );
    expect(loadedTunerSettings.customPresets.single.name, 'Brass warm-up');
    expect(loadedToneSettings.rootConcertMidiNumber, 57);
    expect(loadedToneSettings.droneMode, SheetToneDroneMode.fifth);
    expect(loadedToneSettings.volumePercent, 40);
    expect(loadedLibraryViewSettings.sortMode, SheetLibrarySortMode.title);
    expect(loadedLibraryViewSettings.favoriteOnly, isTrue);
    expect(loadedLibraryViewSettings.tagQuery, 'lesson');
    expect(loadedLibraryViewSettings.composerQuery, 'Bach');
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
      autoScrollSettings: const SheetAutoScrollSettings(
        durationSeconds: 240,
        startPage: 2,
        endPage: 6,
        pausePageNumbers: <int>[4],
        repeatSections: <SheetAutoScrollRepeatSection>[
          SheetAutoScrollRepeatSection(startPage: 3, endPage: 4),
        ],
        pageDurations: <int, int>{3: 75},
        cuePoints: <SheetAutoScrollCuePoint>[
          SheetAutoScrollCuePoint(pageNumber: 3, label: 'A'),
        ],
      ),
      metronomeSettings: const SheetMetronomeSettings(
        bpm: 84,
        meter: SheetMetronomeMeter.twoFour,
        subdivision: SheetMetronomeSubdivision.sixteenth,
        countInBars: 2,
      ),
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
        composerQuery: '',
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
        pageOrder: const <int>[1, 2, 2],
        pageCrops: const <int, SheetCropSettings>{
          2: SheetCropSettings(left: 0.04, right: 0.03),
        },
        instanceRotations: const <int, int>{2: 180},
        instanceCrops: const <int, SheetCropSettings>{
          2: SheetCropSettings(top: 0.05),
        },
      ),
      importedAt: now,
      updatedAt: now,
      lastOpenedAt: null,
      lastPage: 2,
      isFavorite: true,
      bookmarks: const <SheetBookmark>[],
      annotationLayer: SheetAnnotationLayer(
        strokes: <SheetAnnotationStroke>[
          SheetAnnotationStroke(
            id: 'stroke-1',
            pageNumber: 1,
            tool: SheetAnnotationTool.pen,
            color: 0xff111111,
            width: 3,
            points: const <SheetAnnotationPoint>[
              SheetAnnotationPoint(x: 0.1, y: 0.1),
              SheetAnnotationPoint(x: 0.2, y: 0.2),
            ],
            createdAt: now,
          ),
        ],
        layers: <SheetAnnotationDisplayLayer>[
          SheetAnnotationDisplayLayer.defaultLayer.copyWith(
            isVisible: false,
            includeInExport: false,
          ),
        ],
      ),
      autoScrollSettings: const SheetAutoScrollSettings(
        durationSeconds: 240,
        startPage: 2,
        endPage: 6,
        pausePageNumbers: <int>[4],
        repeatSections: <SheetAutoScrollRepeatSection>[
          SheetAutoScrollRepeatSection(startPage: 3, endPage: 4),
        ],
        pageDurations: <int, int>{3: 75},
        cuePoints: <SheetAutoScrollCuePoint>[
          SheetAutoScrollCuePoint(pageNumber: 3, label: 'A'),
        ],
      ),
      metronomeSettings: const SheetMetronomeSettings(
        bpm: 84,
        meter: SheetMetronomeMeter.twoFour,
        subdivision: SheetMetronomeSubdivision.sixteenth,
        countInBars: 2,
      ),
    );
    final setlist = SheetSetlist(
      id: 'setlist-1',
      title: 'Recital',
      scoreIds: const <String>['score-1'],
      createdAt: now,
      updatedAt: now,
      scoreDurations: const <String, int>{'score-1': 240},
      scoreMetronomeSettings: const <String, SheetMetronomeSettings>{
        'score-1': SheetMetronomeSettings(
          bpm: 116,
          meter: SheetMetronomeMeter.sixEight,
          countInBars: 1,
        ),
      },
      viewerSettingsOverride: const SheetViewerSettings(
        displayMode: 'twoPage',
        halfPageTurn: true,
        pageScale: SheetViewerSettings.fitWidthScale,
      ),
    );

    await store.saveScores(<SheetScore>[score]);
    await store.saveSetlists(<SheetSetlist>[setlist]);
    await store.saveMetronomeSettings(
      const SheetMetronomeSettings(
        bpm: 132,
        meter: SheetMetronomeMeter.threeFour,
      ),
    );
    final customTunerPreset = SheetTunerCustomPreset(
      id: 'custom-sax',
      name: 'Sax section',
      displayMode: SheetTunerDisplayMode.altoSax,
      detectionProfile: SheetTunerDetectionProfile.highInstrument,
      targets: const <SheetTunerTarget>[
        SheetTunerTarget(label: 'G', concertMidiNumber: 46),
        SheetTunerTarget(label: 'C', concertMidiNumber: 51),
      ],
      updatedAt: DateTime.utc(2026, 8, 30),
    );
    await store.saveTunerSettings(
      SheetTunerSettings(
        referencePitchA4: 441,
        tuningMode: SheetTunerMode.target,
        tuningPreset: SheetTunerPreset.manual,
        displayMode: SheetTunerDisplayMode.altoSax,
        detectionProfile: SheetTunerDetectionProfile.highInstrument,
        detectionAlgorithm: SheetTunerPitchDetectionAlgorithm.yin,
        notationPreference: SheetTunerNotationPreference.flats,
        targetLockEnabled: true,
        targetLockThresholdCents: 240,
        targetConcertMidiNumber: 46,
        customPresetId: customTunerPreset.id,
        customTargets: customTunerPreset.targets,
        customPresets: <SheetTunerCustomPreset>[customTunerPreset],
        calibrationHistory: <SheetTunerCalibrationEvent>[
          SheetTunerCalibrationEvent(
            referencePitchA4: 442,
            source: 'quick',
            appliedAt: DateTime.utc(2026, 8, 30),
          ),
        ],
      ),
    );
    await store.saveToneSettings(
      const SheetToneSettings(
        rootConcertMidiNumber: 60,
        droneMode: SheetToneDroneMode.fifthOctave,
        volumePercent: 30,
      ),
    );
    await store.saveFavoriteAnnotationPreset(
      const SheetAnnotationToolPreset(
        toolName: 'highlighter',
        color: 0xffffcc25,
        width: 10,
      ),
    );
    await store.saveGlobalViewerSettings(
      const SheetViewerSettings(
        displayMode: 'continuousVertical',
        halfPageTurn: true,
        pageScale: SheetViewerSettings.fitWidthScale,
        pedalMapping: SheetViewerSettings.customPedalMappingType,
        customPedalMapping: <String, String>{
          'Space': 'toggleQuickActions',
          'Tab': 'none',
        },
      ),
    );
    await store.savePerformancePresetTemplates(
      const <SheetPerformancePresetTemplate>[
        SheetPerformancePresetTemplate(
          id: 'preset-stage',
          name: 'Stage tablet',
          deviceProfile: 'Galaxy Tab S9',
          viewerSettings: SheetViewerSettings(
            displayMode: 'twoPage',
            halfPageTurn: true,
            pageScale: SheetViewerSettings.fitWidthScale,
            pedalMapping: SheetViewerSettings.setlistPedalMapping,
            autoAdvanceSetlist: true,
          ),
        ),
      ],
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
    expect(backup.scores.single.pageSettings.instanceRotations, <int, int>{
      2: 180,
    });
    expect(backup.scores.single.annotationLayer.isDefaultLayerVisible, isFalse);
    expect(
      backup.scores.single.annotationLayer.includeDefaultLayerInExport,
      isFalse,
    );
    expect(backup.scores.single.autoScrollSettings.pausePageNumbers, <int>[4]);
    expect(
      backup.scores.single.autoScrollSettings.repeatSections.single.startPage,
      3,
    );
    expect(backup.scores.single.autoScrollSettings.pageDurations, <int, int>{
      3: 75,
    });
    expect(backup.scores.single.autoScrollSettings.cuePoints.single.label, 'A');
    expect(backup.scores.single.metronomeSettings?.bpm, 84);
    expect(
      backup.scores.single.metronomeSettings?.subdivision,
      SheetMetronomeSubdivision.sixteenth,
    );
    expect(backup.scores.single.metronomeSettings?.countInBars, 2);
    expect(backup.setlists.single.scoreDurations, <String, int>{
      'score-1': 240,
    });
    expect(backup.setlists.single.scoreMetronomeSettings['score-1']?.bpm, 116);
    expect(
      backup.setlists.single.scoreMetronomeSettings['score-1']?.meter,
      SheetMetronomeMeter.sixEight,
    );
    expect(
      backup.setlists.single.scoreMetronomeSettings['score-1']?.countInBars,
      1,
    );
    expect(
      backup.setlists.single.viewerSettingsOverride?.displayMode,
      'twoPage',
    );
    expect(backup.favoriteAnnotationPreset?.toolName, 'highlighter');
    expect(backup.toneSettings.droneMode, SheetToneDroneMode.fifthOctave);
    expect(backup.toneSettings.volumePercent, 30);
    expect(backup.tunerSettings.customPresets.single.name, 'Sax section');
    expect(backup.tunerSettings.targetLockEnabled, isTrue);
    expect(backup.tunerSettings.targetLockThresholdCents, 240);
    expect(
      backup.tunerSettings.calibrationHistory.single.referencePitchA4,
      442,
    );
    expect(
      backup.tunerSettings.notationPreference,
      SheetTunerNotationPreference.flats,
    );
    expect(
      backup.tunerSettings.detectionAlgorithm,
      SheetTunerPitchDetectionAlgorithm.yin,
    );
    expect(backup.globalViewerSettings.displayMode, 'continuousVertical');
    expect(backup.globalViewerSettings.halfPageTurn, isTrue);
    expect(
      backup.globalViewerSettings.customPedalMapping['Space'],
      'toggleQuickActions',
    );
    expect(backup.performancePresetTemplates.single.name, 'Stage tablet');
    expect(
      backup.performancePresetTemplates.single.deviceProfile,
      'Galaxy Tab S9',
    );
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
    expect(restoredScore.pageSettings.instanceCrops[2]?.top, 0.05);
    expect(restoredScore.annotationLayer.strokes, hasLength(1));
    expect(restoredScore.annotationLayer.isDefaultLayerVisible, isFalse);
    expect(restoredScore.annotationLayer.includeDefaultLayerInExport, isFalse);
    expect(restoredScore.autoScrollSettings.pausePageNumbers, <int>[4]);
    expect(restoredScore.autoScrollSettings.repeatSections.single.endPage, 4);
    expect(restoredScore.autoScrollSettings.pageDurations, <int, int>{3: 75});
    expect(restoredScore.autoScrollSettings.cuePoints.single.pageNumber, 3);
    expect(restoredScore.metronomeSettings?.bpm, 84);
    expect(restoredScore.metronomeSettings?.meter, SheetMetronomeMeter.twoFour);
    expect(restoredScore.metronomeSettings?.countInBars, 2);
    final restoredSetlist = (await restoreStore.loadSetlists()).single;
    expect(restoredSetlist.title, 'Recital');
    expect(restoredSetlist.scoreDurations, <String, int>{'score-1': 240});
    expect(restoredSetlist.scoreMetronomeSettings['score-1']?.bpm, 116);
    expect(
      restoredSetlist.scoreMetronomeSettings['score-1']?.meter,
      SheetMetronomeMeter.sixEight,
    );
    expect(restoredSetlist.viewerSettingsOverride?.pageScale, 'fitWidth');
    expect((await restoreStore.loadMetronomeSettings()).bpm, 132);
    final restoredTunerSettings = await restoreStore.loadTunerSettings();
    expect(restoredTunerSettings.referencePitchA4, 441);
    expect((await restoreStore.loadToneSettings()).rootConcertMidiNumber, 60);
    expect(
      (await restoreStore.loadToneSettings()).droneMode,
      SheetToneDroneMode.fifthOctave,
    );
    expect(restoredTunerSettings.displayMode, SheetTunerDisplayMode.altoSax);
    expect(
      restoredTunerSettings.detectionProfile,
      SheetTunerDetectionProfile.highInstrument,
    );
    expect(restoredTunerSettings.targetConcertMidiNumber, 46);
    expect(
      restoredTunerSettings.notationPreference,
      SheetTunerNotationPreference.flats,
    );
    expect(restoredTunerSettings.targetLockEnabled, isTrue);
    expect(restoredTunerSettings.targetLockThresholdCents, 240);
    expect(
      restoredTunerSettings.calibrationHistory.single.referencePitchA4,
      442,
    );
    expect(restoredTunerSettings.customPresetId, 'custom-sax');
    expect(restoredTunerSettings.customPresets.single.name, 'Sax section');
    expect(
      (await restoreStore.loadFavoriteAnnotationPreset())?.toolName,
      'highlighter',
    );
    expect(
      (await restoreStore.loadGlobalViewerSettings()).displayMode,
      'continuousVertical',
    );
    expect(
      (await restoreStore.loadGlobalViewerSettings()).customPedalMapping['Tab'],
      'none',
    );
    final restoredTemplates = await restoreStore
        .loadPerformancePresetTemplates();
    expect(restoredTemplates.single.name, 'Stage tablet');
    expect(
      restoredTemplates.single.viewerSettings.pedalMapping,
      SheetViewerSettings.setlistPedalMapping,
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
    final audioFile = await store.importLinkedFileBytes(
      bytes: const <int>[1, 2, 3, 4],
      fileName: 'Practice Cue.m4a',
      importedAt: now,
    );

    expect(linkedFile.type, 'pdf');
    expect(linkedFile.label, 'Trumpet Part');
    expect(linkedFile.createdAt, now);
    expect(linkedFile.path, contains('linked-files'));
    expect(await File(linkedFile.path).readAsBytes(), bytes);
    expect(audioFile.type, 'm4a');
    expect(audioFile.label, 'Practice Cue');
    expect(await File(audioFile.path).readAsBytes(), const <int>[1, 2, 3, 4]);

    final candidates = store.shareCandidates(
      _score(now, linkedFiles: <SheetLinkedFile>[audioFile]),
    );
    expect(candidates.last.mimeType, 'audio/mp4');
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

  test(
    'full backup preserves shared songbook PDFs and distinct same-name files',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final store = SheetLibraryStore();
      final now = DateTime.parse('2026-09-13T10:00:00.000');
      final bytes = await File('test-fixtures/pdfs/short-score.pdf')
          .readAsBytes();
      final source = await store.importPdfBytes(
        bytes: bytes,
        fileName: 'book.pdf',
        importedAt: now,
      );
      final otherDirectory = await Directory('${documentsDir.path}/other')
          .create();
      final otherFile = await File('${otherDirectory.path}/book.pdf')
          .writeAsBytes(bytes);
      final first =
          SheetScore.fromJson(<String, Object?>{
            ...source.toJson(),
            'id': 'movement-1',
          }).copyWith(
            title: 'First',
            pageSettings: SheetPageSettings.empty.copyWith(pageOrder: <int>[1]),
          );
      final second =
          SheetScore.fromJson(<String, Object?>{
            ...source.toJson(),
            'id': 'movement-2',
          }).copyWith(
            title: 'Second',
            lastPage: 2,
            pageSettings: SheetPageSettings.empty.copyWith(
              pageOrder: <int>[2, 3],
            ),
          );
      await store.saveScores(<SheetScore>[
        source,
        first,
        second,
        SheetScore.fromJson(<String, Object?>{
          ...source.toJson(),
          'id': 'other-book',
          'filePath': otherFile.path,
        }),
      ]);
      await store.saveSetlists(<SheetSetlist>[
        SheetSetlist(
          id: 'concert',
          title: 'Concert',
          scoreIds: <String>[first.id, second.id],
          createdAt: now,
          updatedAt: now,
        ),
      ]);

      final zip = await store.exportFullBackupZipBytes();
      final archive = ZipDecoder().decodeBytes(zip);
      expect(
        archive.files.where((file) => file.name.startsWith('scores/')),
        hasLength(2),
      );
      final manifest = jsonDecode(
        utf8.decode(
          archive.findFile(SheetLibraryFullBackup.manifestFileName)!.content,
        ),
      ) as Map;
      final mappings = (manifest['fileMappings'] as List).cast<Map>();
      expect(mappings, hasLength(4));
      expect(
        mappings.take(3).map((mapping) => mapping['entryPath']).toSet(),
        hasLength(1),
      );

      final oldDirectory = documentsDir;
      documentsDir = await Directory.systemTemp.createTemp(
        'clef-shared-restore-',
      );
      await oldDirectory.delete(recursive: true);
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final result = await store.restoreFullBackupZipBytes(zip);
      expect(result.didRestore, isTrue);
      expect(result.missingFileCount, 0);
      final restored = await store.loadScores();
      expect(
        restored.take(3).map((score) => score.filePath).toSet(),
        hasLength(1),
      );
      expect(restored.last.filePath, isNot(restored.first.filePath));
      expect(await File(restored.first.filePath).readAsBytes(), bytes);
      expect(await File(restored.last.filePath).readAsBytes(), bytes);
      expect(restored[1].pageSettings.pageOrder, <int>[1]);
      expect(restored[2].pageSettings.pageOrder, <int>[2, 3]);
      expect(restored[2].lastPage, 2);
      expect((await store.loadSetlists()).single.scoreIds, <String>[
        first.id,
        second.id,
      ]);
    },
  );

  for (final rejectWrite in <bool>[false, true]) {
    test(
      'repeated full restore preserves existing files (write failure: $rejectWrite)',
      () async {
        final platform = _installFailingPreferences();
        final store = SheetLibraryStore();
        final source = await store.importPdfBytes(
          bytes: await File('test-fixtures/pdfs/short-score.pdf').readAsBytes(),
          fileName: 'concert.pdf',
        );
        final annotation = await File('${documentsDir.path}/concert-marks.json')
            .writeAsString('{"strokes":[]}');
        await store.saveScores(<SheetScore>[
          source.copyWith(
            annotationStorage: SheetAnnotationStorageReference(
              mode: SheetAnnotationStorageReference.fileMode,
              path: annotation.path,
            ),
          ),
        ]);
        final backupPdf = await File(source.filePath).readAsBytes();
        final zip = await store.exportFullBackupZipBytes();
        expect((await store.restoreFullBackupZipBytes(zip)).didRestore, isTrue);
        final existing = (await store.loadScores()).single;
        expect(existing.sourceFileDisplayName, source.sourceFileDisplayName);
        final currentPdf = <int>[
          ...backupPdf,
          ...utf8.encode('\n% later edits\n'),
        ];
        await File(existing.filePath).writeAsBytes(currentPdf);
        await File(existing.annotationStorage.path)
            .writeAsString('{"later":"marks"}');

        final targetProfile = await store.createLibraryProfile('Other library');
        await store.saveScores(<SheetScore>[
          existing.copyWith(title: 'Current target'),
        ]);
        if (rejectWrite) {
          platform.failureKey = 'flutter.clef_scores.${targetProfile.id}';
          platform.throwOnFailure = true;
        }
        final result = await store.restoreFullBackupZipBytes(zip);
        expect(
          result.status,
          rejectWrite
              ? SheetLibraryBackupRestoreStatus.error
              : SheetLibraryBackupRestoreStatus.restored,
        );
        expect(await File(existing.filePath).readAsBytes(), currentPdf);
        expect(
          await File(existing.annotationStorage.path).readAsString(),
          '{"later":"marks"}',
        );
        final target = (await store.loadScores()).single;
        if (rejectWrite) {
          expect(target.title, 'Current target');
          expect(target.filePath, existing.filePath);
        } else {
          expect(target.id, existing.id);
          expect(target.sourceFileDisplayName, source.sourceFileDisplayName);
          expect(target.filePath, isNot(existing.filePath));
          expect(
            target.annotationStorage.path,
            isNot(existing.annotationStorage.path),
          );
          expect(await File(target.filePath).readAsBytes(), backupPdf);
          expect(
            await File(target.annotationStorage.path).readAsString(),
            '{"strokes":[]}',
          );
        }
        await store.setActiveLibraryProfile(SheetLibraryProfile.defaultId);
        final originalLibraryScore = (await store.loadScores()).single;
        expect(originalLibraryScore.filePath, existing.filePath);
        expect(
          originalLibraryScore.annotationStorage.path,
          existing.annotationStorage.path,
        );
      },
    );
  }

  for (final damage in <String>[
    'missing PDF',
    'missing linked file',
    'missing annotation file',
    'missing mapping',
    'malformed mapping',
    'unsafe mapping',
    'duplicate mapping',
  ]) {
    test('rejects $damage before changing the existing library', () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final store = SheetLibraryStore();
      final now = DateTime.parse('2026-09-13T10:00:00.000');
      final source = await store.importPdfBytes(
        bytes: await File('test-fixtures/pdfs/short-score.pdf').readAsBytes(),
        fileName: 'preserved.pdf',
        importedAt: now,
      );
      final linked = await store.importLinkedFileBytes(
        bytes: utf8.encode('audio fixture'),
        fileName: 'practice.mp3',
        importedAt: now,
      );
      final annotation = await File('${documentsDir.path}/marks.json')
          .writeAsString('{"strokes":[]}');
      final score = source.copyWith(
        linkedFiles: <SheetLinkedFile>[linked],
        annotationStorage: SheetAnnotationStorageReference(
          mode: SheetAnnotationStorageReference.fileMode,
          path: annotation.path,
        ),
      );
      await store.saveScores(<SheetScore>[score]);
      final archive = ZipDecoder().decodeBytes(
        await store.exportFullBackupZipBytes(),
      );
      final manifest = jsonDecode(
        utf8.decode(
          archive.findFile(SheetLibraryFullBackup.manifestFileName)!.content,
        ),
      ) as Map<String, dynamic>;
      final mappings = (manifest['fileMappings'] as List).cast<Map>();
      String? omittedEntry;
      switch (damage) {
        case 'missing PDF':
          omittedEntry = mappings[0]['entryPath'] as String;
        case 'missing linked file':
          omittedEntry = mappings[1]['entryPath'] as String;
        case 'missing annotation file':
          omittedEntry = mappings[2]['entryPath'] as String;
        case 'missing mapping':
          mappings.removeAt(1);
        case 'malformed mapping':
          mappings[1].remove('scoreId');
        case 'unsafe mapping':
          mappings[1]['entryPath'] = 'linked-files/../escape.mp3';
        case 'duplicate mapping':
          mappings.add(Map.of(mappings[0]));
      }
      manifest['fileMappings'] = mappings;
      final damaged = Archive();
      for (final entry in archive.files) {
        if (entry.name != SheetLibraryFullBackup.manifestFileName &&
            entry.name != omittedEntry) {
          damaged.addFile(ArchiveFile.bytes(entry.name, entry.content));
        }
      }
      damaged.addFile(
        ArchiveFile.string(
          SheetLibraryFullBackup.manifestFileName,
          jsonEncode(manifest),
        ),
      );

      await File(score.filePath).writeAsString('newer local PDF');
      await store.saveScores(<SheetScore>[
        score.copyWith(title: 'Current library'),
      ]);
      final before = await store.exportMetadataBackupJson();
      final result = await store.restoreFullBackupZipBytes(
        ZipEncoder().encode(damaged),
      );
      expect(result.status, SheetLibraryBackupRestoreStatus.invalid);
      expect((await store.loadScores()).single.title, 'Current library');
      expect(await File(score.filePath).readAsString(), 'newer local PDF');
      final after = await store.exportMetadataBackupJson();
      expect(
        SheetLibraryBackupCodec.decode(after).scores.single.toJson(),
        SheetLibraryBackupCodec.decode(before).scores.single.toJson(),
      );
    });
  }

  test('full backup retains explicitly missing source file metadata', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final store = SheetLibraryStore();
    final source = await store.importPdfBytes(
      bytes: await File('test-fixtures/pdfs/short-score.pdf').readAsBytes(),
      fileName: 'offline.pdf',
    );
    final segment = SheetScore.fromJson(<String, Object?>{
      ...source.toJson(),
      'id': 'offline-movement',
    });
    final linked = await store.importLinkedFileBytes(
      bytes: utf8.encode('audio'),
      fileName: 'missing.mp3',
    );
    final annotationStorage = SheetAnnotationStorageReference(
      mode: SheetAnnotationStorageReference.fileMode,
      path: '${documentsDir.path}/missing-marks.json',
    );
    await store.saveScores(<SheetScore>[
      source.copyWith(
        linkedFiles: <SheetLinkedFile>[linked],
        annotationStorage: annotationStorage,
      ),
      segment.copyWith(
        linkedFiles: <SheetLinkedFile>[linked],
        annotationStorage: annotationStorage,
      ),
    ]);
    await File(source.filePath).delete();
    await File(linked.path).delete();
    final zip = await store.exportFullBackupZipBytes();
    final result = await store.restoreFullBackupZipBytes(zip);
    expect(result.didRestore, isTrue);
    expect(result.missingFileCount, 3);
    expect((await store.loadScores()).map((score) => score.filePath), <String>[
      source.filePath,
      source.filePath,
    ]);
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
      annotationLayer: SheetAnnotationLayer(
        strokes: <SheetAnnotationStroke>[
          SheetAnnotationStroke(
            id: 'full-backup-stroke',
            pageNumber: 1,
            tool: SheetAnnotationTool.pen,
            color: 0xff111111,
            width: 3,
            points: const <SheetAnnotationPoint>[
              SheetAnnotationPoint(x: 0.1, y: 0.1),
              SheetAnnotationPoint(x: 0.2, y: 0.2),
            ],
            createdAt: now,
          ),
        ],
        layers: <SheetAnnotationDisplayLayer>[
          SheetAnnotationDisplayLayer.defaultLayer.copyWith(
            isVisible: false,
            includeInExport: false,
          ),
        ],
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
    await store.saveGlobalViewerSettings(
      const SheetViewerSettings(
        displayMode: 'singlePage',
        halfPageTurn: false,
        pedalMapping: SheetViewerSettings.reversedPedalMapping,
      ),
    );
    await store.savePerformancePresetTemplates(
      const <SheetPerformancePresetTemplate>[
        SheetPerformancePresetTemplate(
          id: 'preset-full-backup',
          name: 'Full backup preset',
          viewerSettings: SheetViewerSettings(
            displayMode: 'twoPage',
            halfPageTurn: true,
            pageScale: SheetViewerSettings.fullscreenScale,
          ),
        ),
      ],
    );

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
    expect(
      restoredScore.annotationLayer.strokes.single.id,
      'full-backup-stroke',
    );
    expect(restoredScore.annotationLayer.isDefaultLayerVisible, isFalse);
    expect(restoredScore.annotationLayer.includeDefaultLayerInExport, isFalse);
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
    expect(
      (await restoreStore.loadGlobalViewerSettings()).pedalMapping,
      SheetViewerSettings.reversedPedalMapping,
    );
    final restoredTemplates = await restoreStore
        .loadPerformancePresetTemplates();
    expect(restoredTemplates.single.name, 'Full backup preset');
    expect(
      restoredTemplates.single.viewerSettings.pageScale,
      SheetViewerSettings.fullscreenScale,
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

  test(
    'creates page arrangement applied copy without mutating source PDF',
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
    },
  );

  test('rejects non-zip full backup bytes', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final store = SheetLibraryStore();

    final result = await store.restoreFullBackupZipBytes(
      utf8.encode('not a zip'),
    );

    expect(result.status, SheetLibraryBackupRestoreStatus.invalid);
  });

  for (final field in <String>['scores', 'setlists']) {
    for (final damage in <String>[
      'absent',
      'not a list',
      'invalid row',
      'duplicate ID',
    ]) {
      test(
        'rejects metadata backup $field $damage without replacing data',
        () async {
          SharedPreferences.setMockInitialValues(<String, Object>{});
          final store = SheetLibraryStore();
          final now = DateTime.parse('2026-09-13T10:00:00.000');
          final score = await store.importPdfBytes(
            bytes: await File('test-fixtures/pdfs/short-score.pdf')
                .readAsBytes(),
            fileName: 'keep.pdf',
            importedAt: now,
          );
          await store.saveScores(<SheetScore>[score]);
          await store.saveSetlists(<SheetSetlist>[
            SheetSetlist(
              id: 'keep-setlist',
              title: 'Keep',
              scoreIds: <String>[score.id],
              createdAt: now,
              updatedAt: now,
            ),
          ]);
          final before = jsonDecode(
            await store.exportMetadataBackupJson(),
          ) as Map<String, dynamic>;
          final damaged =
              jsonDecode(jsonEncode(before)) as Map<String, dynamic>;
          switch (damage) {
            case 'absent':
              damaged.remove(field);
            case 'not a list':
              damaged[field] = 'lost records';
            case 'invalid row':
              (damaged[field] as List).add(<String, Object?>{'title': 'No ID'});
            case 'duplicate ID':
              (damaged[field] as List).add((damaged[field] as List).first);
          }
          final result = await store.restoreMetadataBackupJson(
            jsonEncode(damaged),
          );
          expect(result.status, SheetLibraryBackupRestoreStatus.invalid);
          final after = jsonDecode(
            await store.exportMetadataBackupJson(),
          ) as Map<String, dynamic>;
          expect(after..remove('exportedAt'), before..remove('exportedAt'));
        },
      );
    }
  }

  test(
    'accepts an explicitly empty legacy backup with settings defaults',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final store = SheetLibraryStore();
      final result = await store.restoreMetadataBackupJson(
        jsonEncode(<String, Object?>{
          'version': 1,
          'scores': <Object?>[],
          'setlists': <Object?>[],
        }),
      );
      expect(result.didRestore, isTrue);
      expect(await store.loadScores(), isEmpty);
      expect(await store.loadSetlists(), isEmpty);
      expect((await store.loadTunerSettings()).referencePitchA4, 440);
    },
  );

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

  test(
    'full backup restores image-converted PDF and reference source image',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final store = SheetLibraryStore();
      final importedAt = DateTime.parse('2026-08-23T10:00:00.000');

      final score = await store.importImagesAsPdfBytes(
        images: <SheetImportedFile>[
          SheetImportedFile(name: 'scan_001.png', bytes: _onePixelPng),
        ],
        importedAt: importedAt,
      );
      await store.saveScores(<SheetScore>[score]);
      final originalPdfBytes = await File(score.filePath).readAsBytes();

      final zipBytes = await store.exportFullBackupZipBytes(
        exportedAt: importedAt,
      );

      final sourceDocumentsDir = documentsDir;
      documentsDir = await Directory.systemTemp.createTemp(
        'clef-image-restore-test-',
      );
      await sourceDocumentsDir.delete(recursive: true);
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final restoreStore = SheetLibraryStore();
      final result = await restoreStore.restoreFullBackupZipBytes(zipBytes);
      final restoredScore = (await restoreStore.loadScores()).single;

      expect(result.didRestore, isTrue);
      expect(
        await File(restoredScore.filePath).readAsBytes(),
        originalPdfBytes,
      );
      expect(restoredScore.linkedFiles, hasLength(1));
      expect(
        restoredScore.linkedFiles.single.role,
        SheetLinkedFile.referenceRole,
      );
      expect(restoredScore.linkedFiles.single.type, 'png');
      expect(
        await File(restoredScore.linkedFiles.single.path).readAsBytes(),
        _onePixelPng,
      );
    },
  );
}

_FailingPreferencesStore _installFailingPreferences() {
  final previous = SharedPreferencesStorePlatform.instance;
  final platform = _FailingPreferencesStore();
  SharedPreferences.resetStatic();
  SharedPreferencesStorePlatform.instance = platform;
  addTearDown(() {
    SharedPreferences.resetStatic();
    SharedPreferencesStorePlatform.instance = previous;
  });
  return platform;
}

class _FailingPreferencesStore extends InMemorySharedPreferencesStore {
  _FailingPreferencesStore() : super.empty();

  String? failureKey;
  bool throwOnFailure = false;
  int failuresRemaining = 1;
  String? delayKey;
  Completer<void>? writeEntered;
  Completer<void>? releaseWrite;

  bool _shouldFail(String key) {
    if (key != failureKey) return false;
    failuresRemaining -= 1;
    if (failuresRemaining <= 0) failureKey = null;
    if (throwOnFailure) throw PlatformException(code: 'write_failed');
    return true;
  }

  @override
  Future<bool> setValue(String valueType, String key, Object value) async {
    if (key == delayKey) {
      delayKey = null;
      writeEntered!.complete();
      await releaseWrite!.future;
    }
    if (_shouldFail(key)) return false;
    return super.setValue(valueType, key, value);
  }

  @override
  Future<bool> remove(String key) async {
    if (_shouldFail(key)) return false;
    return super.remove(key);
  }
}

SheetScore _score(
  DateTime now, {
  String filePath = '/tmp/sonata.pdf',
  List<SheetLinkedFile> linkedFiles = const <SheetLinkedFile>[],
}) {
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
    linkedFiles: linkedFiles,
  );
}

final Uint8List _onePixelPng = File(
  'android/app/src/main/res/mipmap-mdpi/ic_launcher.png',
).readAsBytesSync();
