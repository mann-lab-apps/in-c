import 'sheet_score.dart';

int twoPageSpreadAnchor(int pageNumber, {required String spreadStart}) {
  if (spreadStart == SheetViewerSettings.twoPageStartPaired) {
    return (((pageNumber - 1) ~/ 2) * 2) + 1;
  }
  if (pageNumber <= 1) {
    return 1;
  }
  return (((pageNumber - 2) ~/ 2) * 2) + 2;
}

int? twoPageSpreadTarget({
  required int currentPage,
  required int delta,
  required int pageCount,
  required String spreadStart,
  required int? Function(int fromPage, int delta) nextVisiblePage,
}) {
  if (delta == 0 || pageCount < 1) {
    return null;
  }
  final anchor = twoPageSpreadAnchor(
    currentPage.clamp(1, pageCount).toInt(),
    spreadStart: spreadStart,
  );
  final step = _twoPageSpreadStep(
    anchor: anchor,
    delta: delta,
    spreadStart: spreadStart,
  );
  final targetAnchor = anchor + step;
  if (targetAnchor < 1 || targetAnchor > pageCount) {
    return null;
  }
  final probe = (targetAnchor - delta).clamp(1, pageCount).toInt();
  return nextVisiblePage(probe, delta);
}

int _twoPageSpreadStep({
  required int anchor,
  required int delta,
  required String spreadStart,
}) {
  if (spreadStart == SheetViewerSettings.twoPageStartCoverSingle) {
    if (delta > 0 && anchor == 1) {
      return 1;
    }
    if (delta < 0 && anchor == 2) {
      return -1;
    }
  }
  return delta > 0 ? 2 : -2;
}
