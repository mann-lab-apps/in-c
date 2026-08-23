import 'package:flutter/services.dart';

enum SheetViewerPageTurnDirection { previous, next }

SheetViewerPageTurnDirection? resolveSheetViewerKeyTurn({
  required LogicalKeyboardKey key,
  required bool isShiftPressed,
}) {
  if (key == LogicalKeyboardKey.arrowRight ||
      key == LogicalKeyboardKey.pageDown) {
    return SheetViewerPageTurnDirection.next;
  }

  if (key == LogicalKeyboardKey.arrowLeft || key == LogicalKeyboardKey.pageUp) {
    return SheetViewerPageTurnDirection.previous;
  }

  if (key == LogicalKeyboardKey.space) {
    return isShiftPressed
        ? SheetViewerPageTurnDirection.previous
        : SheetViewerPageTurnDirection.next;
  }

  return null;
}
