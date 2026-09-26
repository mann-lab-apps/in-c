import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_device_check.dart';
import 'package:in_c_sheet/sheet_viewer_input.dart';

void main() {
  test('metronome timing analyzer passes stable intervals', () {
    final start = DateTime.utc(2026, 9, 26, 12);
    final ticks = <DateTime>[
      for (var i = 0; i < 8; i += 1) start.add(Duration(milliseconds: i * 250)),
    ];

    final result = analyzeMetronomeTiming(bpm: 240, ticks: ticks);

    expect(result.status, SheetDeviceCheckStatus.pass);
    expect(result.expectedIntervalMs, 250);
    expect(result.maxJitterMs, 0);
    expect(result.toCheckItem().details, contains('max jitter 0.0ms'));
  });

  test('metronome timing analyzer warns and fails on large jitter', () {
    final start = DateTime.utc(2026, 9, 26, 12);
    final warnTicks = <DateTime>[
      start,
      start.add(const Duration(milliseconds: 250)),
      start.add(const Duration(milliseconds: 520)),
      start.add(const Duration(milliseconds: 770)),
    ];
    final failTicks = <DateTime>[
      start,
      start.add(const Duration(milliseconds: 250)),
      start.add(const Duration(milliseconds: 560)),
      start.add(const Duration(milliseconds: 810)),
    ];

    expect(
      analyzeMetronomeTiming(bpm: 240, ticks: warnTicks).status,
      SheetDeviceCheckStatus.warn,
    );
    expect(
      analyzeMetronomeTiming(bpm: 240, ticks: failTicks).status,
      SheetDeviceCheckStatus.fail,
    );
  });

  test('device check markdown omits absolute local paths', () {
    final report = SheetDeviceCheckReport(
      appVersion: '1.0.1+26',
      platform: 'android',
      osVersion: 'Android /Users/me/private-device',
      buildMode: 'debug',
      checkedAt: DateTime.utc(2026, 9, 26, 12, 30),
      items: const <SheetDeviceCheckItem>[
        SheetDeviceCheckItem(
          id: 'home',
          title: 'Home',
          status: SheetDeviceCheckStatus.pass,
          details: 'opened /private/tmp/secret-score.pdf',
        ),
        SheetDeviceCheckItem(
          id: 'pedal',
          title: 'Pedal',
          status: SheetDeviceCheckStatus.manual,
          details: 'Needs real pedal',
        ),
      ],
      notes: 'Copy from file:///private/tmp/secret.txt',
    );

    final markdown = report.toMarkdown();

    expect(markdown, contains('Clef & Staff 1.0.1+26'));
    expect(markdown, contains('Home: PASS'));
    expect(markdown, contains('Pedal: MANUAL'));
    expect(markdown, isNot(contains('/private/tmp')));
    expect(markdown, isNot(contains('/Users/me')));
    expect(markdown, isNot(contains('file://')));
    expect(markdown, contains('[redacted-path]'));
  });

  test('page key input check records mapped and unmapped keys', () {
    final mapped = SheetViewerInputDiagnosticEntry(
      timestamp: DateTime.utc(2026, 9, 26, 12),
      logicalKeyLabel: 'Arrow Right',
      logicalKeyId: LogicalKeyboardKey.arrowRight.keyId,
      physicalKeyId: 0,
      inputId: 'ArrowRight',
      action: SheetViewerInputAction.nextPage,
    );
    final unmapped = SheetViewerInputDiagnosticEntry(
      timestamp: DateTime.utc(2026, 9, 26, 12),
      logicalKeyLabel: 'A',
      logicalKeyId: LogicalKeyboardKey.keyA.keyId,
      physicalKeyId: 0,
      inputId: 'Key A',
      action: SheetViewerInputAction.none,
    );

    expect(
      deviceCheckItemForKeyInput(null).status,
      SheetDeviceCheckStatus.notTested,
    );
    expect(
      deviceCheckItemForKeyInput(mapped).status,
      SheetDeviceCheckStatus.pass,
    );
    expect(
      deviceCheckItemForKeyInput(mapped).details,
      contains('ArrowRight -> nextPage'),
    );
    expect(
      deviceCheckItemForKeyInput(unmapped).status,
      SheetDeviceCheckStatus.warn,
    );
  });
}
