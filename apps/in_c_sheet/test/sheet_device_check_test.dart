import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_device_check.dart';
import 'package:in_c_sheet/sheet_tone.dart';
import 'package:in_c_sheet/sheet_tuner.dart';
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

  test(
    'metronome timing sampler completes pending collection when cancelled',
    () async {
      final sampler = SheetDeviceCheckTimingSampler();

      final pending = sampler.collect(bpm: 120, tickCount: 100);
      sampler.cancel();

      expect(await pending, isEmpty);
    },
  );

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
      appVersion: '1.0.1+27',
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

    expect(markdown, contains('# Clef & Staff 개발자용 기기 리포트'));
    expect(markdown, contains('Clef & Staff 1.0.1+27'));
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
    final volume = SheetViewerInputDiagnosticEntry(
      timestamp: DateTime.utc(2026, 9, 26, 12),
      logicalKeyLabel: 'Audio Volume Down',
      logicalKeyId: LogicalKeyboardKey.audioVolumeDown.keyId,
      physicalKeyId: 0,
      inputId: 'Audio Volume Down',
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
      deviceCheckItemForKeyInput(mapped).details,
      contains('페이지 단위로 넘어가는지도 확인'),
    );
    expect(
      deviceCheckItemForKeyInput(unmapped).status,
      SheetDeviceCheckStatus.warn,
    );
    expect(
      deviceCheckItemForKeyInput(unmapped).details,
      contains('사용자 설정이 필요'),
    );
    expect(
      deviceCheckItemForKeyInput(volume).details,
      contains('시스템 볼륨 키는 기본 페이지 넘김으로 쓰지 않습니다'),
    );
  });

  test('device check records tuner setup for reproducible QA', () {
    final defaultItem = deviceCheckItemForTunerSettings(
      SheetTunerSettings.defaultSettings,
    );
    final stalePresetItem = deviceCheckItemForTunerSettings(
      SheetTunerSettings.defaultSettings.copyWith(
        tuningMode: SheetTunerMode.target,
        tuningPreset: SheetTunerPreset.guitarStandard,
        displayMode: SheetTunerDisplayMode.guitar,
        detectionProfile: SheetTunerDetectionProfile.guitarBass,
        targetLockEnabled: true,
      ),
    );

    expect(defaultItem.status, SheetDeviceCheckStatus.pass);
    expect(defaultItem.details, contains('A4 440Hz'));
    expect(defaultItem.details, contains('자동'));
    expect(defaultItem.details, contains('Chromatic-only'));
    expect(stalePresetItem.status, SheetDeviceCheckStatus.warn);
    expect(stalePresetItem.details, contains('이전 preset/target 설정'));
  });

  test('device check flags risky drone setups before listening QA', () {
    final defaultItem = deviceCheckItemForToneSettings(
      settings: SheetToneSettings.defaultSettings,
      referencePitchA4: 440,
    );
    final mutedItem = deviceCheckItemForToneSettings(
      settings: SheetToneSettings.defaultSettings.copyWith(volumePercent: 0),
      referencePitchA4: 440,
    );
    final loudMultiVoiceItem = deviceCheckItemForToneSettings(
      settings: SheetToneSettings.defaultSettings.copyWith(
        droneMode: SheetToneDroneMode.fifthOctave,
        volumePercent: 90,
      ),
      referencePitchA4: 442,
    );

    expect(defaultItem.status, SheetDeviceCheckStatus.pass);
    expect(defaultItem.details, contains('기준음'));
    expect(defaultItem.details, contains('A4'));
    expect(defaultItem.details, contains('440.0Hz'));
    expect(mutedItem.status, SheetDeviceCheckStatus.warn);
    expect(mutedItem.details, contains('음량이 0%'));
    expect(loudMultiVoiceItem.status, SheetDeviceCheckStatus.warn);
    expect(loudMultiVoiceItem.details, contains('기준음+5도+옥타브'));
    expect(loudMultiVoiceItem.details, contains('clipping'));
  });
}
