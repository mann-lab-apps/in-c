import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_bookmark_import.dart';

void main() {
  test('parses page label and label page CSV bookmark rows', () {
    final createdAt = DateTime.parse('2026-09-11T10:00:00.000');
    final bookmarks = SheetBookmarkCsvImporter.parse(
      'page,label\n1,Intro\n"Solo, muted",3\nCoda,5\n99,Out\n',
      pageCount: 8,
      createdAt: createdAt,
    );

    expect(bookmarks.map((bookmark) => bookmark.pageNumber), <int>[1, 3, 5]);
    expect(bookmarks.map((bookmark) => bookmark.label), <String>[
      'Intro',
      'Solo, muted',
      'Coda',
    ]);
    expect(bookmarks.first.createdAt, createdAt);
  });

  test('skips duplicate pages and uses page fallback labels', () {
    final bookmarks = SheetBookmarkCsvImporter.parse(
      '2,\n2,Duplicate\nBad row\nLabel,not-page\n',
      pageCount: 4,
      createdAt: DateTime.parse('2026-09-11T10:00:00.000'),
    );

    expect(bookmarks, hasLength(1));
    expect(bookmarks.single.pageNumber, 2);
    expect(bookmarks.single.label, '2쪽');
  });

  test('accepts Korean BOM headers and tab separated rows', () {
    final bookmarks = SheetBookmarkCsvImporter.parse(
      '\ufeff제목\t페이지\n서곡\t1\n인터미션\t4\n',
      pageCount: 5,
      createdAt: DateTime.parse('2026-09-11T10:00:00.000'),
    );

    expect(bookmarks.map((bookmark) => bookmark.pageNumber), <int>[1, 4]);
    expect(bookmarks.map((bookmark) => bookmark.label), <String>['서곡', '인터미션']);
  });

  test(
    'accepts semicolon separated rows without treating title text as header',
    () {
      final bookmarks = SheetBookmarkCsvImporter.parse(
        'Title Page;1\nCoda;3\n',
        pageCount: 4,
        createdAt: DateTime.parse('2026-09-11T10:00:00.000'),
      );

      expect(bookmarks.map((bookmark) => bookmark.pageNumber), <int>[1, 3]);
      expect(bookmarks.map((bookmark) => bookmark.label), <String>[
        'Title Page',
        'Coda',
      ]);
    },
  );
}
