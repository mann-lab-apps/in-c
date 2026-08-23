import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_viewer_input.dart';

void main() {
  test('maps hardware keys to page turn directions', () {
    expect(
      resolveSheetViewerKeyTurn(
        key: LogicalKeyboardKey.arrowRight,
        isShiftPressed: false,
      ),
      SheetViewerPageTurnDirection.next,
    );
    expect(
      resolveSheetViewerKeyTurn(
        key: LogicalKeyboardKey.pageDown,
        isShiftPressed: false,
      ),
      SheetViewerPageTurnDirection.next,
    );
    expect(
      resolveSheetViewerKeyTurn(
        key: LogicalKeyboardKey.space,
        isShiftPressed: false,
      ),
      SheetViewerPageTurnDirection.next,
    );

    expect(
      resolveSheetViewerKeyTurn(
        key: LogicalKeyboardKey.arrowLeft,
        isShiftPressed: false,
      ),
      SheetViewerPageTurnDirection.previous,
    );
    expect(
      resolveSheetViewerKeyTurn(
        key: LogicalKeyboardKey.pageUp,
        isShiftPressed: false,
      ),
      SheetViewerPageTurnDirection.previous,
    );
    expect(
      resolveSheetViewerKeyTurn(
        key: LogicalKeyboardKey.space,
        isShiftPressed: true,
      ),
      SheetViewerPageTurnDirection.previous,
    );
  });

  test('ignores unrelated keys', () {
    expect(
      resolveSheetViewerKeyTurn(
        key: LogicalKeyboardKey.keyA,
        isShiftPressed: false,
      ),
      isNull,
    );
  });
}
