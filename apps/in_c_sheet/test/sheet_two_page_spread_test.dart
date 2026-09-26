import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:in_c_sheet/sheet_two_page_spread.dart';

void main() {
  int? nextVisiblePage({
    required int fromPage,
    required int delta,
    required int pageCount,
    Set<int> hidden = const {},
  }) {
    var page = fromPage + delta;
    while (page >= 1 && page <= pageCount) {
      if (!hidden.contains(page)) {
        return page;
      }
      page += delta;
    }
    return null;
  }

  test('cover-single spread keeps page 1 alone and pairs from page 2', () {
    const start = SheetViewerSettings.twoPageStartCoverSingle;

    expect(twoPageSpreadAnchor(1, spreadStart: start), 1);
    expect(twoPageSpreadAnchor(2, spreadStart: start), 2);
    expect(twoPageSpreadAnchor(3, spreadStart: start), 2);
    expect(twoPageSpreadAnchor(4, spreadStart: start), 4);
    expect(twoPageSpreadAnchor(5, spreadStart: start), 4);

    expect(
      twoPageSpreadTarget(
        currentPage: 1,
        delta: 1,
        pageCount: 6,
        spreadStart: start,
        nextVisiblePage: (fromPage, delta) =>
            nextVisiblePage(fromPage: fromPage, delta: delta, pageCount: 6),
      ),
      2,
    );
    expect(
      twoPageSpreadTarget(
        currentPage: 2,
        delta: 1,
        pageCount: 6,
        spreadStart: start,
        nextVisiblePage: (fromPage, delta) =>
            nextVisiblePage(fromPage: fromPage, delta: delta, pageCount: 6),
      ),
      4,
    );
    expect(
      twoPageSpreadTarget(
        currentPage: 4,
        delta: -1,
        pageCount: 6,
        spreadStart: start,
        nextVisiblePage: (fromPage, delta) =>
            nextVisiblePage(fromPage: fromPage, delta: delta, pageCount: 6),
      ),
      2,
    );
    expect(
      twoPageSpreadTarget(
        currentPage: 2,
        delta: -1,
        pageCount: 6,
        spreadStart: start,
        nextVisiblePage: (fromPage, delta) =>
            nextVisiblePage(fromPage: fromPage, delta: delta, pageCount: 6),
      ),
      1,
    );
  });

  test('paired spread moves by first-page pairs', () {
    const start = SheetViewerSettings.twoPageStartPaired;

    expect(twoPageSpreadAnchor(1, spreadStart: start), 1);
    expect(twoPageSpreadAnchor(2, spreadStart: start), 1);
    expect(twoPageSpreadAnchor(3, spreadStart: start), 3);
    expect(twoPageSpreadAnchor(4, spreadStart: start), 3);
    expect(twoPageSpreadAnchor(5, spreadStart: start), 5);

    expect(
      twoPageSpreadTarget(
        currentPage: 1,
        delta: 1,
        pageCount: 6,
        spreadStart: start,
        nextVisiblePage: (fromPage, delta) =>
            nextVisiblePage(fromPage: fromPage, delta: delta, pageCount: 6),
      ),
      3,
    );
    expect(
      twoPageSpreadTarget(
        currentPage: 2,
        delta: 1,
        pageCount: 6,
        spreadStart: start,
        nextVisiblePage: (fromPage, delta) =>
            nextVisiblePage(fromPage: fromPage, delta: delta, pageCount: 6),
      ),
      3,
    );
    expect(
      twoPageSpreadTarget(
        currentPage: 3,
        delta: -1,
        pageCount: 6,
        spreadStart: start,
        nextVisiblePage: (fromPage, delta) =>
            nextVisiblePage(fromPage: fromPage, delta: delta, pageCount: 6),
      ),
      1,
    );
  });

  test('spread target respects hidden pages from the score page settings', () {
    const start = SheetViewerSettings.twoPageStartCoverSingle;

    expect(
      twoPageSpreadTarget(
        currentPage: 2,
        delta: 1,
        pageCount: 6,
        spreadStart: start,
        nextVisiblePage: (fromPage, delta) => nextVisiblePage(
          fromPage: fromPage,
          delta: delta,
          pageCount: 6,
          hidden: {4},
        ),
      ),
      5,
    );
  });
}
