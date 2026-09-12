import 'sheet_score.dart';

class SheetBookmarkCsvImporter {
  const SheetBookmarkCsvImporter._();

  static List<SheetBookmark> parse(
    String input, {
    required int pageCount,
    required DateTime createdAt,
  }) {
    final bookmarks = <SheetBookmark>[];
    final seenPages = <int>{};
    final delimiter = _detectDelimiter(input);
    for (final row in _parseDelimitedRows(input, delimiter: delimiter)) {
      if (row.every((cell) => _cleanCell(cell).isEmpty)) {
        continue;
      }
      if (_looksLikeHeader(row)) {
        continue;
      }
      final bookmark = _bookmarkFromRow(
        row,
        pageCount: pageCount,
        createdAt: createdAt,
      );
      if (bookmark == null || !seenPages.add(bookmark.pageNumber)) {
        continue;
      }
      bookmarks.add(bookmark);
    }
    bookmarks.sort((a, b) => a.pageNumber.compareTo(b.pageNumber));
    return List<SheetBookmark>.unmodifiable(bookmarks);
  }

  static SheetBookmark? _bookmarkFromRow(
    List<String> row, {
    required int pageCount,
    required DateTime createdAt,
  }) {
    if (row.length < 2) {
      return null;
    }
    final first = _cleanCell(row[0]);
    final second = _cleanCell(row[1]);
    final firstPage = int.tryParse(first);
    final secondPage = int.tryParse(second);
    final pageNumber = firstPage ?? secondPage;
    if (pageNumber == null || pageNumber < 1 || pageNumber > pageCount) {
      return null;
    }
    final labelSource = firstPage != null ? second : first;
    final label = labelSource.isEmpty ? '$pageNumber쪽' : labelSource;
    return SheetBookmark(
      pageNumber: pageNumber,
      label: label,
      createdAt: createdAt,
    );
  }

  static bool _looksLikeHeader(List<String> row) {
    if (row.length < 2) {
      return false;
    }
    final first = _cleanCell(row[0]).toLowerCase();
    final second = _cleanCell(row[1]).toLowerCase();
    final firstIsPageHeader = _isPageHeader(first);
    final secondIsPageHeader = _isPageHeader(second);
    final firstIsLabelHeader = _isLabelHeader(first);
    final secondIsLabelHeader = _isLabelHeader(second);
    return (firstIsPageHeader && secondIsLabelHeader) ||
        (firstIsLabelHeader && secondIsPageHeader);
  }

  static String _cleanCell(String value) {
    return value.replaceFirst('\ufeff', '').trim();
  }

  static bool _isPageHeader(String value) {
    return value == 'page' ||
        value == 'pages' ||
        value == 'page number' ||
        value == '쪽' ||
        value == '페이지';
  }

  static bool _isLabelHeader(String value) {
    return value == 'label' ||
        value == 'title' ||
        value == 'name' ||
        value == '제목' ||
        value == '이름';
  }

  static String _detectDelimiter(String input) {
    var commaCount = 0;
    var tabCount = 0;
    var semicolonCount = 0;
    var quoted = false;
    for (var index = 0; index < input.length; index += 1) {
      final char = input[index];
      if (char == '"') {
        if (quoted && index + 1 < input.length && input[index + 1] == '"') {
          index += 1;
        } else {
          quoted = !quoted;
        }
        continue;
      }
      if (!quoted && (char == '\n' || char == '\r')) {
        break;
      }
      if (!quoted && char == ',') {
        commaCount += 1;
      } else if (!quoted && char == '\t') {
        tabCount += 1;
      } else if (!quoted && char == ';') {
        semicolonCount += 1;
      }
    }
    if (tabCount > commaCount && tabCount >= semicolonCount) {
      return '\t';
    }
    if (semicolonCount > commaCount) {
      return ';';
    }
    return ',';
  }

  static List<List<String>> _parseDelimitedRows(
    String input, {
    required String delimiter,
  }) {
    final rows = <List<String>>[];
    var row = <String>[];
    final cell = StringBuffer();
    var quoted = false;
    for (var index = 0; index < input.length; index += 1) {
      final char = input[index];
      if (char == '"') {
        if (quoted && index + 1 < input.length && input[index + 1] == '"') {
          cell.write('"');
          index += 1;
        } else {
          quoted = !quoted;
        }
        continue;
      }
      if (!quoted && char == delimiter) {
        row.add(cell.toString());
        cell.clear();
        continue;
      }
      if (!quoted && (char == '\n' || char == '\r')) {
        if (char == '\r' &&
            index + 1 < input.length &&
            input[index + 1] == '\n') {
          index += 1;
        }
        row.add(cell.toString());
        cell.clear();
        rows.add(row);
        row = <String>[];
        continue;
      }
      cell.write(char);
    }
    row.add(cell.toString());
    rows.add(row);
    return rows;
  }
}
