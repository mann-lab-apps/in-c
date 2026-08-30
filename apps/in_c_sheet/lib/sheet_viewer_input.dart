import 'package:flutter/services.dart';

enum SheetViewerPageTurnDirection { previous, next }

enum SheetViewerInputAction {
  previousPage,
  nextPage,
  previousSetlistScore,
  nextSetlistScore,
  toggleQuickActions,
  none,
}

extension SheetViewerInputActionValue on SheetViewerInputAction {
  String get value {
    return switch (this) {
      SheetViewerInputAction.previousPage => 'previousPage',
      SheetViewerInputAction.nextPage => 'nextPage',
      SheetViewerInputAction.previousSetlistScore => 'previousSetlistScore',
      SheetViewerInputAction.nextSetlistScore => 'nextSetlistScore',
      SheetViewerInputAction.toggleQuickActions => 'toggleQuickActions',
      SheetViewerInputAction.none => 'none',
    };
  }

  static SheetViewerInputAction fromValue(String? value) {
    return switch (value) {
      'previousPage' => SheetViewerInputAction.previousPage,
      'nextPage' => SheetViewerInputAction.nextPage,
      'previousSetlistScore' => SheetViewerInputAction.previousSetlistScore,
      'nextSetlistScore' => SheetViewerInputAction.nextSetlistScore,
      'toggleQuickActions' => SheetViewerInputAction.toggleQuickActions,
      'none' => SheetViewerInputAction.none,
      _ => SheetViewerInputAction.none,
    };
  }
}

const sheetViewerCustomInputIds = <String>[
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Enter',
  'Backspace',
  'Space',
  'Shift+Space',
  'Tab',
  'Shift+Tab',
  'MediaPrevious',
  'MediaNext',
];

bool sheetViewerConsumesKeyEvent({
  required SheetViewerInputAction action,
  required String pedalMapping,
  required String inputId,
  required Map<String, String> customMapping,
}) {
  if (pedalMapping == 'custom') {
    return customMapping.containsKey(inputId) ||
        action != SheetViewerInputAction.none;
  }
  return action != SheetViewerInputAction.none;
}

List<String> sheetViewerRecentCustomInputIds(
  Iterable<SheetViewerInputDiagnosticEntry> entries, {
  Iterable<String> knownInputIds = sheetViewerCustomInputIds,
  int limit = 6,
}) {
  if (limit <= 0) {
    return const <String>[];
  }
  final known = knownInputIds.toSet();
  final result = <String>[];
  for (final entry in entries) {
    final inputId = entry.inputId.trim();
    if (inputId.isEmpty ||
        known.contains(inputId) ||
        result.contains(inputId)) {
      continue;
    }
    result.add(inputId);
    if (result.length >= limit) {
      break;
    }
  }
  return List<String>.unmodifiable(result);
}

class SheetViewerInputDiagnosticEntry {
  const SheetViewerInputDiagnosticEntry({
    required this.timestamp,
    required this.logicalKeyLabel,
    required this.logicalKeyId,
    required this.physicalKeyId,
    required this.inputId,
    required this.action,
  });

  factory SheetViewerInputDiagnosticEntry.fromKeyEvent({
    required KeyEvent event,
    required bool isShiftPressed,
    required String pedalMapping,
    required Map<String, String> customMapping,
    DateTime? timestamp,
  }) {
    final key = event.logicalKey;
    final inputId = sheetViewerInputIdForKey(
      key: key,
      isShiftPressed: isShiftPressed,
    );
    return SheetViewerInputDiagnosticEntry(
      timestamp: timestamp ?? DateTime.now(),
      logicalKeyLabel: key.keyLabel.isEmpty ? 'unknown' : key.keyLabel,
      logicalKeyId: key.keyId,
      physicalKeyId: event.physicalKey.usbHidUsage,
      inputId: inputId,
      action: resolveSheetViewerKeyAction(
        key: key,
        isShiftPressed: isShiftPressed,
        pedalMapping: pedalMapping,
        customMapping: customMapping,
      ),
    );
  }

  final DateTime timestamp;
  final String logicalKeyLabel;
  final int logicalKeyId;
  final int physicalKeyId;
  final String inputId;
  final SheetViewerInputAction action;

  String get logLine {
    return '${timestamp.toIso8601String()} | logical=$logicalKeyLabel '
        '($logicalKeyId) | physical=$physicalKeyId | input=$inputId | '
        'action=${action.value}';
  }
}

class SheetViewerPageTurnGuard {
  bool _isTurning = false;

  bool get isTurning => _isTurning;

  Future<bool> run(Future<void> Function() turn) async {
    if (_isTurning) {
      return false;
    }
    _isTurning = true;
    try {
      await turn();
      return true;
    } finally {
      _isTurning = false;
    }
  }
}

SheetViewerPageTurnDirection? resolveSheetViewerKeyTurn({
  required LogicalKeyboardKey key,
  required bool isShiftPressed,
  String pedalMapping = 'standard',
}) {
  final action = resolveSheetViewerKeyAction(
    key: key,
    isShiftPressed: isShiftPressed,
    pedalMapping: pedalMapping,
  );
  return switch (action) {
    SheetViewerInputAction.previousPage =>
      SheetViewerPageTurnDirection.previous,
    SheetViewerInputAction.nextPage => SheetViewerPageTurnDirection.next,
    _ => null,
  };
}

SheetViewerInputAction resolveSheetViewerKeyAction({
  required LogicalKeyboardKey key,
  required bool isShiftPressed,
  String pedalMapping = 'standard',
  Map<String, String> customMapping = const <String, String>{},
}) {
  if (pedalMapping == 'custom') {
    final inputId = sheetViewerInputIdForKey(
      key: key,
      isShiftPressed: isShiftPressed,
    );
    return SheetViewerInputActionValue.fromValue(customMapping[inputId]);
  }

  final direction = _defaultDirectionForKey(
    key: key,
    isShiftPressed: isShiftPressed,
  );
  if (pedalMapping == 'reversed' || pedalMapping == 'reversedSetlistEdges') {
    final reversed = switch (direction) {
      SheetViewerPageTurnDirection.previous => SheetViewerInputAction.nextPage,
      SheetViewerPageTurnDirection.next => SheetViewerInputAction.previousPage,
      null => SheetViewerInputAction.none,
    };
    return _edgeActionForKey(
      key: key,
      direction: reversed,
      pedalMapping: pedalMapping,
    );
  }
  final action = switch (direction) {
    SheetViewerPageTurnDirection.previous =>
      SheetViewerInputAction.previousPage,
    SheetViewerPageTurnDirection.next => SheetViewerInputAction.nextPage,
    null => SheetViewerInputAction.none,
  };
  return _edgeActionForKey(
    key: key,
    direction: action,
    pedalMapping: pedalMapping,
  );
}

String sheetViewerInputIdForKey({
  required LogicalKeyboardKey key,
  required bool isShiftPressed,
}) {
  if (key == LogicalKeyboardKey.space) {
    return isShiftPressed ? 'Shift+Space' : 'Space';
  }
  if (key == LogicalKeyboardKey.arrowLeft) {
    return 'ArrowLeft';
  }
  if (key == LogicalKeyboardKey.arrowRight) {
    return 'ArrowRight';
  }
  if (key == LogicalKeyboardKey.arrowUp) {
    return 'ArrowUp';
  }
  if (key == LogicalKeyboardKey.arrowDown) {
    return 'ArrowDown';
  }
  if (key == LogicalKeyboardKey.pageUp) {
    return 'PageUp';
  }
  if (key == LogicalKeyboardKey.pageDown) {
    return 'PageDown';
  }
  if (key == LogicalKeyboardKey.enter ||
      key == LogicalKeyboardKey.numpadEnter) {
    return 'Enter';
  }
  if (key == LogicalKeyboardKey.backspace) {
    return 'Backspace';
  }
  if (key == LogicalKeyboardKey.tab) {
    return isShiftPressed ? 'Shift+Tab' : 'Tab';
  }
  if (key == LogicalKeyboardKey.mediaTrackPrevious ||
      key == LogicalKeyboardKey.mediaSkipBackward ||
      key == LogicalKeyboardKey.mediaStepBackward) {
    return 'MediaPrevious';
  }
  if (key == LogicalKeyboardKey.mediaTrackNext ||
      key == LogicalKeyboardKey.mediaSkipForward ||
      key == LogicalKeyboardKey.mediaStepForward ||
      key == LogicalKeyboardKey.mediaSkip) {
    return 'MediaNext';
  }
  return key.keyLabel.isEmpty ? key.keyId.toString() : key.keyLabel;
}

SheetViewerInputAction _edgeActionForKey({
  required LogicalKeyboardKey key,
  required SheetViewerInputAction direction,
  required String pedalMapping,
}) {
  if (pedalMapping != 'setlistEdges' &&
      pedalMapping != 'reversedSetlistEdges') {
    return direction;
  }
  if (key == LogicalKeyboardKey.mediaTrackPrevious ||
      key == LogicalKeyboardKey.mediaSkipBackward ||
      key == LogicalKeyboardKey.mediaStepBackward) {
    return SheetViewerInputAction.previousSetlistScore;
  }
  if (key == LogicalKeyboardKey.mediaTrackNext ||
      key == LogicalKeyboardKey.mediaSkipForward ||
      key == LogicalKeyboardKey.mediaStepForward ||
      key == LogicalKeyboardKey.mediaSkip) {
    return SheetViewerInputAction.nextSetlistScore;
  }
  return direction;
}

SheetViewerPageTurnDirection? _defaultDirectionForKey({
  required LogicalKeyboardKey key,
  required bool isShiftPressed,
}) {
  if (key == LogicalKeyboardKey.arrowRight ||
      key == LogicalKeyboardKey.arrowDown ||
      key == LogicalKeyboardKey.pageDown ||
      key == LogicalKeyboardKey.enter ||
      key == LogicalKeyboardKey.numpadEnter ||
      key == LogicalKeyboardKey.mediaTrackNext ||
      key == LogicalKeyboardKey.mediaSkipForward ||
      key == LogicalKeyboardKey.mediaStepForward ||
      key == LogicalKeyboardKey.mediaSkip) {
    return SheetViewerPageTurnDirection.next;
  }

  if (key == LogicalKeyboardKey.arrowLeft ||
      key == LogicalKeyboardKey.arrowUp ||
      key == LogicalKeyboardKey.pageUp ||
      key == LogicalKeyboardKey.backspace ||
      key == LogicalKeyboardKey.mediaTrackPrevious ||
      key == LogicalKeyboardKey.mediaSkipBackward ||
      key == LogicalKeyboardKey.mediaStepBackward) {
    return SheetViewerPageTurnDirection.previous;
  }

  if (key == LogicalKeyboardKey.space || key == LogicalKeyboardKey.tab) {
    return isShiftPressed
        ? SheetViewerPageTurnDirection.previous
        : SheetViewerPageTurnDirection.next;
  }

  return null;
}
