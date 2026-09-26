import 'dart:async';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_viewer_input.dart';

void main() {
  test('page turn guard ignores overlapping pedal repeats', () async {
    final guard = SheetViewerPageTurnGuard();
    final firstTurn = Completer<void>();
    var turnCount = 0;

    final firstResult = guard.run(() {
      turnCount += 1;
      return firstTurn.future;
    });
    final repeatedResult = await guard.run(() async {
      turnCount += 1;
    });

    expect(guard.isTurning, isTrue);
    expect(repeatedResult, isFalse);
    expect(turnCount, 1);

    firstTurn.complete();
    expect(await firstResult, isTrue);
    expect(guard.isTurning, isFalse);

    final nextResult = await guard.run(() async {
      turnCount += 1;
    });
    expect(nextResult, isTrue);
    expect(turnCount, 2);
  });

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

  test('maps common bluetooth and USB pedal keys to page turns', () {
    expect(
      resolveSheetViewerKeyTurn(
        key: LogicalKeyboardKey.arrowDown,
        isShiftPressed: false,
      ),
      SheetViewerPageTurnDirection.next,
    );
    expect(
      resolveSheetViewerKeyTurn(
        key: LogicalKeyboardKey.enter,
        isShiftPressed: false,
      ),
      SheetViewerPageTurnDirection.next,
    );
    expect(
      resolveSheetViewerKeyTurn(
        key: LogicalKeyboardKey.tab,
        isShiftPressed: false,
      ),
      SheetViewerPageTurnDirection.next,
    );
    expect(
      resolveSheetViewerKeyTurn(
        key: LogicalKeyboardKey.mediaTrackNext,
        isShiftPressed: false,
      ),
      SheetViewerPageTurnDirection.next,
    );
    expect(
      resolveSheetViewerKeyTurn(
        key: LogicalKeyboardKey.mediaSkipForward,
        isShiftPressed: false,
      ),
      SheetViewerPageTurnDirection.next,
    );
    expect(
      resolveSheetViewerKeyTurn(
        key: LogicalKeyboardKey.mediaStepForward,
        isShiftPressed: false,
      ),
      SheetViewerPageTurnDirection.next,
    );
    expect(
      resolveSheetViewerKeyTurn(
        key: LogicalKeyboardKey.mediaSkip,
        isShiftPressed: false,
      ),
      SheetViewerPageTurnDirection.next,
    );
    expect(
      resolveSheetViewerKeyTurn(
        key: LogicalKeyboardKey.arrowUp,
        isShiftPressed: false,
      ),
      SheetViewerPageTurnDirection.previous,
    );
    expect(
      resolveSheetViewerKeyTurn(
        key: LogicalKeyboardKey.backspace,
        isShiftPressed: false,
      ),
      SheetViewerPageTurnDirection.previous,
    );
    expect(
      resolveSheetViewerKeyTurn(
        key: LogicalKeyboardKey.tab,
        isShiftPressed: true,
      ),
      SheetViewerPageTurnDirection.previous,
    );
    expect(
      resolveSheetViewerKeyTurn(
        key: LogicalKeyboardKey.mediaTrackPrevious,
        isShiftPressed: false,
      ),
      SheetViewerPageTurnDirection.previous,
    );
    expect(
      resolveSheetViewerKeyTurn(
        key: LogicalKeyboardKey.mediaSkipBackward,
        isShiftPressed: false,
      ),
      SheetViewerPageTurnDirection.previous,
    );
    expect(
      resolveSheetViewerKeyTurn(
        key: LogicalKeyboardKey.mediaStepBackward,
        isShiftPressed: false,
      ),
      SheetViewerPageTurnDirection.previous,
    );
  });

  test('covers local keyboard substitute matrix for pedal QA', () {
    final cases =
        <
          ({
            LogicalKeyboardKey key,
            bool shift,
            String inputId,
            SheetViewerInputAction action,
          })
        >[
          (
            key: LogicalKeyboardKey.arrowRight,
            shift: false,
            inputId: 'ArrowRight',
            action: SheetViewerInputAction.nextPage,
          ),
          (
            key: LogicalKeyboardKey.arrowDown,
            shift: false,
            inputId: 'ArrowDown',
            action: SheetViewerInputAction.nextPage,
          ),
          (
            key: LogicalKeyboardKey.pageDown,
            shift: false,
            inputId: 'PageDown',
            action: SheetViewerInputAction.nextPage,
          ),
          (
            key: LogicalKeyboardKey.space,
            shift: false,
            inputId: 'Space',
            action: SheetViewerInputAction.nextPage,
          ),
          (
            key: LogicalKeyboardKey.enter,
            shift: false,
            inputId: 'Enter',
            action: SheetViewerInputAction.nextPage,
          ),
          (
            key: LogicalKeyboardKey.numpadEnter,
            shift: false,
            inputId: 'Enter',
            action: SheetViewerInputAction.nextPage,
          ),
          (
            key: LogicalKeyboardKey.tab,
            shift: false,
            inputId: 'Tab',
            action: SheetViewerInputAction.nextPage,
          ),
          (
            key: LogicalKeyboardKey.mediaTrackNext,
            shift: false,
            inputId: 'MediaNext',
            action: SheetViewerInputAction.nextPage,
          ),
          (
            key: LogicalKeyboardKey.mediaSkipForward,
            shift: false,
            inputId: 'MediaNext',
            action: SheetViewerInputAction.nextPage,
          ),
          (
            key: LogicalKeyboardKey.mediaStepForward,
            shift: false,
            inputId: 'MediaNext',
            action: SheetViewerInputAction.nextPage,
          ),
          (
            key: LogicalKeyboardKey.mediaSkip,
            shift: false,
            inputId: 'MediaNext',
            action: SheetViewerInputAction.nextPage,
          ),
          (
            key: LogicalKeyboardKey.arrowLeft,
            shift: false,
            inputId: 'ArrowLeft',
            action: SheetViewerInputAction.previousPage,
          ),
          (
            key: LogicalKeyboardKey.arrowUp,
            shift: false,
            inputId: 'ArrowUp',
            action: SheetViewerInputAction.previousPage,
          ),
          (
            key: LogicalKeyboardKey.pageUp,
            shift: false,
            inputId: 'PageUp',
            action: SheetViewerInputAction.previousPage,
          ),
          (
            key: LogicalKeyboardKey.space,
            shift: true,
            inputId: 'Shift+Space',
            action: SheetViewerInputAction.previousPage,
          ),
          (
            key: LogicalKeyboardKey.backspace,
            shift: false,
            inputId: 'Backspace',
            action: SheetViewerInputAction.previousPage,
          ),
          (
            key: LogicalKeyboardKey.tab,
            shift: true,
            inputId: 'Shift+Tab',
            action: SheetViewerInputAction.previousPage,
          ),
          (
            key: LogicalKeyboardKey.mediaTrackPrevious,
            shift: false,
            inputId: 'MediaPrevious',
            action: SheetViewerInputAction.previousPage,
          ),
          (
            key: LogicalKeyboardKey.mediaSkipBackward,
            shift: false,
            inputId: 'MediaPrevious',
            action: SheetViewerInputAction.previousPage,
          ),
          (
            key: LogicalKeyboardKey.mediaStepBackward,
            shift: false,
            inputId: 'MediaPrevious',
            action: SheetViewerInputAction.previousPage,
          ),
        ];

    for (final entry in cases) {
      final inputId = sheetViewerInputIdForKey(
        key: entry.key,
        isShiftPressed: entry.shift,
      );
      final action = resolveSheetViewerKeyAction(
        key: entry.key,
        isShiftPressed: entry.shift,
      );

      expect(inputId, entry.inputId, reason: entry.inputId);
      expect(action, entry.action, reason: entry.inputId);
      expect(
        sheetViewerConsumesKeyEvent(
          action: action,
          pedalMapping: 'standard',
          inputId: inputId,
          customMapping: const <String, String>{},
        ),
        isTrue,
        reason: entry.inputId,
      );
    }
  });

  test('builds input diagnostic entries from key events', () {
    final entry = SheetViewerInputDiagnosticEntry.fromKeyEvent(
      event: const KeyDownEvent(
        physicalKey: PhysicalKeyboardKey.space,
        logicalKey: LogicalKeyboardKey.space,
        timeStamp: Duration(milliseconds: 10),
      ),
      isShiftPressed: false,
      pedalMapping: 'custom',
      customMapping: const <String, String>{'Space': 'toggleQuickActions'},
      timestamp: DateTime.parse('2026-08-27T10:00:00.000'),
    );

    expect(entry.inputId, 'Space');
    expect(entry.action, SheetViewerInputAction.toggleQuickActions);
    expect(entry.logicalKeyId, LogicalKeyboardKey.space.keyId);
    expect(entry.physicalKeyId, PhysicalKeyboardKey.space.usbHidUsage);
    expect(entry.logLine, contains('toggleQuickActions'));
  });

  test('collects recent unknown input ids for custom mapping UI', () {
    final now = DateTime.parse('2026-08-27T10:00:00.000');
    final entries = <SheetViewerInputDiagnosticEntry>[
      SheetViewerInputDiagnosticEntry(
        timestamp: now,
        logicalKeyLabel: 'F13',
        logicalKeyId: 1013,
        physicalKeyId: 2013,
        inputId: 'F13',
        action: SheetViewerInputAction.none,
      ),
      SheetViewerInputDiagnosticEntry(
        timestamp: now.add(const Duration(seconds: 1)),
        logicalKeyLabel: 'Space',
        logicalKeyId: LogicalKeyboardKey.space.keyId,
        physicalKeyId: PhysicalKeyboardKey.space.usbHidUsage,
        inputId: 'Space',
        action: SheetViewerInputAction.nextPage,
      ),
      SheetViewerInputDiagnosticEntry(
        timestamp: now.add(const Duration(seconds: 2)),
        logicalKeyLabel: 'F13',
        logicalKeyId: 1013,
        physicalKeyId: 2013,
        inputId: 'F13',
        action: SheetViewerInputAction.none,
      ),
    ];

    expect(sheetViewerRecentCustomInputIds(entries), <String>['F13']);
  });

  test('reverses pedal mapping when selected', () {
    expect(
      resolveSheetViewerKeyTurn(
        key: LogicalKeyboardKey.arrowDown,
        isShiftPressed: false,
        pedalMapping: 'reversed',
      ),
      SheetViewerPageTurnDirection.previous,
    );
    expect(
      resolveSheetViewerKeyTurn(
        key: LogicalKeyboardKey.backspace,
        isShiftPressed: false,
        pedalMapping: 'reversed',
      ),
      SheetViewerPageTurnDirection.next,
    );
    expect(
      resolveSheetViewerKeyTurn(
        key: LogicalKeyboardKey.tab,
        isShiftPressed: true,
        pedalMapping: 'reversed',
      ),
      SheetViewerPageTurnDirection.next,
    );
    expect(
      resolveSheetViewerKeyTurn(
        key: LogicalKeyboardKey.mediaTrackNext,
        isShiftPressed: false,
        pedalMapping: 'reversed',
      ),
      SheetViewerPageTurnDirection.previous,
    );
    expect(
      resolveSheetViewerKeyTurn(
        key: LogicalKeyboardKey.mediaTrackPrevious,
        isShiftPressed: false,
        pedalMapping: 'reversed',
      ),
      SheetViewerPageTurnDirection.next,
    );
  });

  test('keeps setlist edge pedal mappings directional', () {
    expect(
      resolveSheetViewerKeyTurn(
        key: LogicalKeyboardKey.arrowDown,
        isShiftPressed: false,
        pedalMapping: 'setlistEdges',
      ),
      SheetViewerPageTurnDirection.next,
    );
    expect(
      resolveSheetViewerKeyTurn(
        key: LogicalKeyboardKey.arrowDown,
        isShiftPressed: false,
        pedalMapping: 'reversedSetlistEdges',
      ),
      SheetViewerPageTurnDirection.previous,
    );
    expect(
      resolveSheetViewerKeyTurn(
        key: LogicalKeyboardKey.tab,
        isShiftPressed: true,
        pedalMapping: 'reversedSetlistEdges',
      ),
      SheetViewerPageTurnDirection.next,
    );
    expect(
      resolveSheetViewerKeyAction(
        key: LogicalKeyboardKey.mediaTrackNext,
        isShiftPressed: false,
        pedalMapping: 'setlistEdges',
      ),
      SheetViewerInputAction.nextSetlistScore,
    );
    expect(
      resolveSheetViewerKeyAction(
        key: LogicalKeyboardKey.mediaTrackPrevious,
        isShiftPressed: false,
        pedalMapping: 'setlistEdges',
      ),
      SheetViewerInputAction.previousSetlistScore,
    );
  });

  test('resolves custom pedal mapping actions', () {
    expect(
      resolveSheetViewerKeyAction(
        key: LogicalKeyboardKey.space,
        isShiftPressed: false,
        pedalMapping: 'custom',
        customMapping: const <String, String>{
          'Space': 'toggleQuickActions',
          'Shift+Space': 'previousPage',
        },
      ),
      SheetViewerInputAction.toggleQuickActions,
    );
    expect(
      resolveSheetViewerKeyAction(
        key: LogicalKeyboardKey.space,
        isShiftPressed: true,
        pedalMapping: 'custom',
        customMapping: const <String, String>{
          'Space': 'toggleQuickActions',
          'Shift+Space': 'previousPage',
        },
      ),
      SheetViewerInputAction.previousPage,
    );
    expect(
      resolveSheetViewerKeyAction(
        key: LogicalKeyboardKey.mediaTrackNext,
        isShiftPressed: false,
        pedalMapping: 'custom',
        customMapping: const <String, String>{'MediaNext': 'nextSetlistScore'},
      ),
      SheetViewerInputAction.nextSetlistScore,
    );
    expect(
      sheetViewerInputIdForKey(
        key: LogicalKeyboardKey.arrowDown,
        isShiftPressed: false,
      ),
      'ArrowDown',
    );
    expect(
      sheetViewerInputIdForKey(
        key: LogicalKeyboardKey.tab,
        isShiftPressed: true,
      ),
      'Shift+Tab',
    );
    expect(
      resolveSheetViewerKeyAction(
        key: LogicalKeyboardKey.enter,
        isShiftPressed: false,
        pedalMapping: 'custom',
        customMapping: const <String, String>{'Enter': 'none'},
      ),
      SheetViewerInputAction.none,
    );
    expect(
      resolveSheetViewerKeyAction(
        key: LogicalKeyboardKey.keyA,
        isShiftPressed: false,
        pedalMapping: 'custom',
        customMapping: const <String, String>{'A': 'toggleQuickActions'},
      ),
      SheetViewerInputAction.toggleQuickActions,
    );
  });

  test('consumes standard page turn keys before the PDF viewer scrolls', () {
    final action = resolveSheetViewerKeyAction(
      key: LogicalKeyboardKey.arrowDown,
      isShiftPressed: false,
    );

    expect(action, SheetViewerInputAction.nextPage);
    expect(
      sheetViewerConsumesKeyEvent(
        action: action,
        pedalMapping: 'standard',
        inputId: 'ArrowDown',
        customMapping: const <String, String>{},
      ),
      isTrue,
    );
  });

  test('consumes explicit custom no-op mappings', () {
    final customMapping = const <String, String>{'ArrowDown': 'none'};
    final action = resolveSheetViewerKeyAction(
      key: LogicalKeyboardKey.arrowDown,
      isShiftPressed: false,
      pedalMapping: 'custom',
      customMapping: customMapping,
    );

    expect(action, SheetViewerInputAction.none);
    expect(
      sheetViewerConsumesKeyEvent(
        action: action,
        pedalMapping: 'custom',
        inputId: 'ArrowDown',
        customMapping: customMapping,
      ),
      isTrue,
    );
  });

  test('ignores unmapped custom keys', () {
    expect(
      sheetViewerConsumesKeyEvent(
        action: SheetViewerInputAction.none,
        pedalMapping: 'custom',
        inputId: 'F13',
        customMapping: const <String, String>{},
      ),
      isFalse,
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
