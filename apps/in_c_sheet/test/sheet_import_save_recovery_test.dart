import 'dart:async';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_score.dart';
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
  Future<SheetScore?> importPdf() async => _imported();
  @override
  Future<List<SheetScore>> importPdfs() async => importedBatch ?? [_imported()];
  @override
  Future<SheetScore?> importImagesAsPdf() async => _imported();
  @override
  Future<SheetScore> importPdfFile(File file, {String? fileName}) async =>
      _imported();

  @override
  Future<void> saveScores(List<SheetScore> scores) async {
    saveCalls++;
    final shouldFail = failSave;
    final entered = writeEntered;
    if (entered != null && !entered.isCompleted) {
      entered.complete();
      await releaseWrite!.future;
    }
    if (shouldFail) throw StateError('metadata save failed');
    await super.saveScores(scores);
  }
}
