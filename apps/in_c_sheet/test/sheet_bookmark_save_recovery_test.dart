import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late _CsvStore store;
  late SheetLibraryController controller;
  late SheetScore original;
  final now = DateTime(2026, 9, 14);
  final bookmark = SheetBookmark(pageNumber: 2, label: 'Solo', createdAt: now);

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    store = _CsvStore();
    original = SheetScore(
      id: 'book',
      title: 'Book',
      composer: '',
      tags: const [],
      note: '',
      filePath: '/tmp/book.pdf',
      importedAt: now,
      updatedAt: now,
      lastOpenedAt: null,
      lastPage: 1,
      isFavorite: false,
      bookmarks: const [],
    );
    await store.saveScores([original]);
    controller = SheetLibraryController(store: store);
    await controller.load();
    store.result = [bookmark];
  });

  tearDown(() => controller.dispose());

  test('CSV metadata failure reports storage and supports retry', () async {
    store.failSave = true;
    expect(await controller.importBookmarksFromCsv(original, pageCount: 4), 0);
    expect(controller.errorMessage, '북마크를 저장하지 못했습니다. 저장 공간을 확인한 뒤 다시 시도해주세요.');
    expect(controller.scores.single.bookmarks, isEmpty);
    expect((await store.loadScores()).single.bookmarks, isEmpty);
    store.failSave = false;
    expect(await controller.importBookmarksFromCsv(original, pageCount: 4), 1);
    expect(controller.errorMessage, isNull);
    expect((await store.loadScores()).single.bookmarks.single.label, 'Solo');
  });

  test('CSV read failure does not suggest metadata storage failure', () async {
    store.readError = StateError('file unavailable');
    expect(await controller.importBookmarksFromCsv(original, pageCount: 4), 0);
    expect(
      controller.errorMessage,
      'CSV 북마크를 읽지 못했습니다. 파일을 기기에 내려받은 뒤 다시 시도해주세요.',
    );
    expect(controller.scores.single.bookmarks, isEmpty);
  });

  test('CSV format error retains format guidance', () async {
    store.readError = const FormatException('invalid');
    expect(await controller.importBookmarksFromCsv(original, pageCount: 4), 0);
    expect(controller.errorMessage, contains('page,label'));
  });

  test('empty picker result and repeated import are harmless', () async {
    store.result = [];
    expect(await controller.importBookmarksFromCsv(original, pageCount: 4), 0);
    expect(controller.errorMessage, isNull);
    store.result = [bookmark];
    expect(await controller.importBookmarksFromCsv(original, pageCount: 4), 1);
    expect(await controller.importBookmarksFromCsv(original, pageCount: 4), 0);
    expect(controller.errorMessage, isNull);
    expect(controller.scores.single.bookmarks, hasLength(1));
  });

  for (final change in ['remove', 'switch', 'edit']) {
    test('CSV picker completion respects $change during selection', () async {
      store.pendingRead = Completer<List<SheetBookmark>>();
      final pending = controller.importBookmarksFromCsv(original, pageCount: 4);
      if (change == 'remove') {
        await controller.deleteScoresByIds({'book'});
      } else if (change == 'switch') {
        await controller.createLibraryProfile('Other');
        await store.saveScores([original.copyWith(title: 'Other book')]);
        await controller.load();
      } else {
        await controller.updateScoreMetadata(
          original,
          title: 'Revised',
          composer: 'Bach',
          tags: '',
          note: 'Cue',
        );
      }
      store.pendingRead!.complete([bookmark]);
      expect(await pending, change == 'edit' ? 1 : 0);
      if (change == 'remove') {
        expect(controller.scores, isEmpty);
        expect(controller.errorMessage, '악보가 없어 북마크를 추가하지 못했습니다.');
      } else if (change == 'switch') {
        expect(controller.scores.single.title, 'Other book');
        expect(controller.scores.single.bookmarks, isEmpty);
        expect(controller.errorMessage, isNull);
        expect((await store.loadScores()).single.bookmarks, isEmpty);
      } else {
        expect(controller.scores.single.title, 'Revised');
        expect(controller.scores.single.note, 'Cue');
        expect(controller.scores.single.bookmarks.single.label, 'Solo');
      }
    });
  }

  test('old picker error does not add a warning to another library', () async {
    store.pendingRead = Completer<List<SheetBookmark>>();
    final pending = controller.importBookmarksFromCsv(original, pageCount: 4);
    await controller.createLibraryProfile('Other');
    store.pendingRead!.completeError(StateError('old picker failed'));
    expect(await pending, 0);
    expect(controller.errorMessage, isNull);
  });
}

class _CsvStore extends SheetLibraryStore {
  List<SheetBookmark> result = [];
  Object? readError;
  bool failSave = false;
  Completer<List<SheetBookmark>>? pendingRead;

  @override
  Future<List<SheetBookmark>> importBookmarkCsv({
    required int pageCount,
  }) async {
    if (readError != null) throw readError!;
    return pendingRead?.future ?? result;
  }

  @override
  Future<void> saveScores(List<SheetScore> scores) async {
    if (failSave) throw StateError('write failed');
    await super.saveScores(scores);
  }
}
