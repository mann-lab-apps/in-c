import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:in_c_sheet/sheet_setlist.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late _ImportStore store;
  late SheetLibraryController controller;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    store = _ImportStore();
    await store.saveScores([_score('existing')]);
    controller = SheetLibraryController(store: store);
    await controller.load();
  });

  for (final kind in _Kind.values) {
    test(
      '$kind metadata failure removes unsaved cards and permits retry',
      () async {
        final original = controller.scores.single.toJson();
        store.failSave = true;
        expect(await _import(controller, kind), isEmpty);
        expect(controller.isImporting, isFalse);
        expect(controller.errorMessage, contains('저장'));
        expect(controller.scores.single.toJson(), original);
        expect((await store.loadScores()).single.toJson(), original);
        store.failSave = false;
        expect(await _import(controller, kind), hasLength(1));
        expect(controller.lastImportOpenedExistingScore, isFalse);
        expect(controller.errorMessage, isNull);
        await controller.load();
        expect(controller.scores, hasLength(2));
      },
    );

    test(
      '$kind file failure retains existing library and releases import state',
      () async {
        store.failImport = true;
        expect(await _import(controller, kind), isEmpty);
        expect(controller.isImporting, isFalse);
        expect(controller.scores.single.id, 'existing');
        expect(controller.errorMessage, isNotEmpty);
        expect(store.saveCalls, 1);
      },
    );
  }

  test('late failed import cannot erase newer persisted score edits', () async {
    store.writeEntered = Completer<void>();
    store.releaseWrite = Completer<void>();
    store.failSave = true;
    final pending = _import(controller, _Kind.batch);
    await store.writeEntered!.future;
    store.failSave = false;
    await controller.toggleFavorite(controller.scoreById('existing'));
    final persisted = (await store.loadScores())
        .map((s) => s.toJson())
        .toList();
    store.releaseWrite!.complete();
    expect(await pending, isEmpty);
    expect(controller.scores.map((s) => s.toJson()).toList(), persisted);
  });

  test('mixed duplicate batch fails as a whole and retries without ghost duplicates', () async {
    store.importedBatch = [
      _score('reimport', fileName: 'existing'),
      _score('new-one'),
      _score('new-two'),
    ];
    store.failSave = true;
    final failed = await controller.importPdfs();
    expect(failed.isEmpty, isTrue);
    expect(controller.lastImportOpenedExistingScore, isFalse);
    expect(controller.scores.single.id, 'existing');
    store.failSave = false;
    final retried = await controller.importPdfs();
    expect(retried.importedCount, 2);
    expect(retried.existingCount, 1);
    await controller.load();
    expect(controller.scores, hasLength(3));
  });

  test(
    'unreadable recovery does not turn an import failure into success',
    () async {
      store.failRead = true;
      store.failSave = true;
      expect(await _import(controller, _Kind.pdf), isEmpty);
      expect(controller.errorMessage, contains('저장'));
      expect(controller.isImporting, isFalse);
      store.failRead = false;
      await controller.load();
      expect(controller.scores.single.id, 'existing');
    },
  );

  test('failed import cannot replace another active library', () async {
    store.writeEntered = Completer<void>();
    store.releaseWrite = Completer<void>();
    store.failSave = true;
    final pending = _import(controller, _Kind.pdf);
    await store.writeEntered!.future;
    store.failSave = false;
    await controller.createLibraryProfile('New library');
    final libraryId = controller.activeLibraryProfile.id;
    store.releaseWrite!.complete();
    expect(await pending, isEmpty);
    expect(controller.activeLibraryProfile.id, libraryId);
    expect(controller.scores, isEmpty);
  });

  for (final label in [
    'PDF 가져와 세트리스트에 추가',
    '여러 PDF를 세트리스트에 추가',
    '이미지를 묶어 세트리스트에 추가',
  ]) {
    testWidgets('$label retains normal successful navigation', (tester) async {
      final target = await controller.createSetlist('Concert');
      await tester.pumpWidget(InCSheetApp(controller: controller));
      await tester.pumpAndSettle();
      await _importIntoSetlist(tester, label, opensViewer: true);
      expect(controller.setlistById(target.id).scoreIds, ['imported']);
      expect((await store.loadSetlists()).single.scoreIds, ['imported']);
      expect(
        find.byType(SheetViewerScreen),
        label == '여러 PDF를 세트리스트에 추가' ? findsNothing : findsOneWidget,
      );
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump();
    });

    testWidgets('$label stays in library when target picker is cancelled', (
      tester,
    ) async {
      final target = await controller.createSetlist('Concert');
      await tester.pumpWidget(InCSheetApp(controller: controller));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('악보 추가'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text(label));
      await tester.tap(find.text(label));
      await tester.pumpAndSettle();
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(find.byType(SheetViewerScreen), findsNothing);
      expect(controller.scoreById('imported').id, 'imported');
      expect(controller.setlistById(target.id).scoreIds, isEmpty);
      expect(tester.takeException(), isNull);
    });

    testWidgets('$label preserves imported score on setlist failure', (
      tester,
    ) async {
      final target = await controller.createSetlist('Concert');
      await tester.pumpWidget(InCSheetApp(controller: controller));
      await tester.pumpAndSettle();
      store.failSetlistSave = true;
      await _importIntoSetlist(tester, label);
      expect(tester.takeException(), isNull);
      expect(find.byType(SheetViewerScreen), findsNothing);
      expect(
        find.text('악보는 라이브러리에 있지만 세트리스트에 담지 못했습니다. 다시 추가해주세요.'),
        findsOneWidget,
      );
      expect(controller.scores.map((s) => s.id), contains('imported'));
      expect((await store.loadScores()).map((s) => s.id), contains('imported'));
      expect(controller.setlistById(target.id).scoreIds, isEmpty);
      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();
      expect(find.textContaining('이미지 PDF를 추가했습니다.'), findsNothing);
      store.failSetlistSave = false;
      store.importedBatch = [_score('retried-import', fileName: 'imported')];
      await _importIntoSetlist(tester, '여러 PDF를 세트리스트에 추가');
      expect(controller.setlistById(target.id).scoreIds, ['imported']);
      expect(controller.scores.where((s) => s.id == 'imported'), hasLength(1));
      expect(tester.takeException(), isNull);
    });

    testWidgets('$label ignores late setlist failure after closing', (
      tester,
    ) async {
      await controller.createSetlist('Concert');
      await tester.pumpWidget(InCSheetApp(controller: controller));
      await tester.pumpAndSettle();
      store.pendingSetlistWrite = Completer<void>();
      await _importIntoSetlist(tester, label);
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpAndSettle();
      store.pendingSetlistWrite!.completeError(StateError('save failed'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(find.byType(SnackBar), findsNothing);
    });
  }

  for (final outcome in ['cancel', 'failure', 'success', 'plain']) {
    testWidgets('duplicate PDF feedback matches $outcome outcome', (
      tester,
    ) async {
      final target = await controller.createSetlist('Concert');
      store.importedPdf = _score('new-import-id', fileName: 'existing');
      await tester.pumpWidget(InCSheetApp(controller: controller));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('악보 추가'));
      await tester.pumpAndSettle();
      await tester.tap(
        find.text(outcome == 'plain' ? 'PDF 가져오기' : 'PDF 가져와 세트리스트에 추가'),
      );
      if (outcome == 'plain') {
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 500));
        await tester.pump();
        expect(find.text('"existing"은 이미 라이브러리에 있는 악보입니다.'), findsOneWidget);
      } else {
        await tester.pumpAndSettle();
        expect(find.textContaining('기존 악보를 엽니다'), findsNothing);
        if (outcome == 'cancel') {
          await tester.binding.handlePopRoute();
          await tester.pumpAndSettle();
        } else {
          store.failSetlistSave = outcome == 'failure';
          await tester.tap(find.text('Concert').last);
          if (outcome == 'success') {
            await tester.pump();
            await tester.pump(const Duration(milliseconds: 500));
            await tester.pump();
          } else {
            await tester.pumpAndSettle();
            expect(
              find.text('악보는 라이브러리에 있지만 세트리스트에 담지 못했습니다. 다시 추가해주세요.'),
              findsOneWidget,
            );
          }
        }
      }
      expect(tester.takeException(), isNull);
      expect(controller.scores.single.id, 'existing');
      expect(
        controller.setlistById(target.id).scoreIds,
        outcome == 'success' ? ['existing'] : isEmpty,
      );
      expect(
        find.byType(SheetViewerScreen),
        outcome == 'success' || outcome == 'plain'
            ? findsOneWidget
            : findsNothing,
      );
      if (outcome == 'cancel' || outcome == 'failure') {
        await tester.pump(const Duration(seconds: 5));
        await tester.pumpAndSettle();
        expect(find.textContaining('기존 악보를 엽니다'), findsNothing);
      }
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump();
    });
  }

  testWidgets('failed batch import shows an error without an unsaved card', (
    tester,
  ) async {
    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();
    store.failSave = true;
    await tester.tap(find.byTooltip('악보 추가'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('여러 PDF 가져오기'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(find.text('imported'), findsNothing);
    expect(
      find.text('악보 목록을 저장하지 못했습니다. 저장 공간을 확인한 뒤 다시 시도해주세요.'),
      findsOneWidget,
    );
    expect(find.textContaining('개 PDF를 가져왔습니다'), findsNothing);
  });
}

Future<void> _importIntoSetlist(
  WidgetTester tester,
  String label, {
  bool opensViewer = false,
}) async {
  await tester.tap(find.byTooltip('악보 추가'));
  await tester.pumpAndSettle();
  await tester.ensureVisible(find.text(label));
  await tester.tap(find.text(label));
  await tester.pumpAndSettle();
  await tester.tap(find.text('Concert').last);
  if (opensViewer) {
    // This fixture verifies routing, not native PDF loading or its progress animation.
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pump();
  } else {
    await tester.pumpAndSettle();
  }
}

enum _Kind { pdf, batch, images, shared }

Future<List<SheetScore>> _import(
  SheetLibraryController controller,
  _Kind kind,
) async {
  switch (kind) {
    case _Kind.pdf:
      final score = await controller.importPdf();
      return score == null ? [] : [score];
    case _Kind.images:
      final score = await controller.importImagesAsPdf();
      return score == null ? [] : [score];
    case _Kind.batch:
      return (await controller.importPdfs()).scores;
    case _Kind.shared:
      return controller.importSharedPdfFiles([
        const SheetSharedImportFile(
          path: '/tmp/imported.pdf',
          name: 'imported.pdf',
        ),
      ]);
  }
}

SheetScore _score(String id, {String? fileName}) {
  final now = DateTime(2026, 9, 14);
  return SheetScore(
    id: id,
    title: id,
    composer: '',
    tags: const [],
    note: '',
    filePath: '/tmp/${fileName ?? id}.pdf',
    importedAt: now,
    updatedAt: now,
    lastOpenedAt: null,
    lastPage: 1,
    isFavorite: false,
    bookmarks: const [],
  );
}

class _ImportStore extends SheetLibraryStore {
  SheetScore? importedPdf;
  bool failSetlistSave = false;
  Completer<void>? pendingSetlistWrite;

  @override
  Future<void> saveSetlists(
    List<SheetSetlist> setlists, {
    String? libraryId,
  }) async {
    await pendingSetlistWrite?.future;
    if (failSetlistSave) throw StateError('setlist save failed');
    await super.saveSetlists(setlists, libraryId: libraryId);
  }

  bool failSave = false;
  bool failImport = false;
  int saveCalls = 0;
  Completer<void>? writeEntered;
  Completer<void>? releaseWrite;
  List<SheetScore>? importedBatch;
  bool failRead = false;

  @override
  Future<List<SheetScore>> loadScores() async {
    if (failRead) throw StateError('read failed');
    return super.loadScores();
  }

  SheetScore _imported() {
    if (failImport) throw const FormatException('invalid PDF');
    return _score('imported');
  }

  @override
  Future<SheetScore?> importPdf() async => importedPdf ?? _imported();
  @override
  Future<List<SheetScore>> importPdfs() async => importedBatch ?? [_imported()];
  @override
  Future<SheetScore?> importImagesAsPdf() async => _imported();
  @override
  Future<SheetScore> importPdfFile(File file, {String? fileName}) async =>
      _imported();

  @override
  Future<void> saveScores(List<SheetScore> scores, {String? libraryId}) async {
    saveCalls++;
    final shouldFail = failSave;
    final entered = writeEntered;
    if (entered != null && !entered.isCompleted) {
      entered.complete();
      await releaseWrite!.future;
    }
    if (shouldFail) throw StateError('metadata save failed');
    await super.saveScores(scores, libraryId: libraryId);
  }
}
