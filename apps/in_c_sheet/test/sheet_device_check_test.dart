import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_device_check.dart';
import 'package:in_c_sheet/sheet_tone.dart';
import 'package:in_c_sheet/sheet_tuner.dart';
import 'package:in_c_sheet/sheet_viewer_input.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('native practice audio check probes and stops all bridges', () async {
    const metronomeChannel = MethodChannel('clef/test_metronome_ready');
    const toneChannel = MethodChannel('clef/test_tone_ready');
    const audioChannel = MethodChannel('clef/test_audio_ready');
    final metronomeCalls = <MethodCall>[];
    final toneCalls = <MethodCall>[];
    final audioCalls = <MethodCall>[];
    final deletedFixtures = <String>[];
    var audioPlaying = false;
    final messenger =
        TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
    messenger.setMockMethodCallHandler(metronomeChannel, (call) async {
      metronomeCalls.add(call);
      return null;
    });
    messenger.setMockMethodCallHandler(toneChannel, (call) async {
      toneCalls.add(call);
      if (call.method == 'routeInfo') {
        return <String, Object?>{
          'outputs': <String>['builtInSpeaker'],
          'systemVolume': 0.4,
        };
      }
      return null;
    });
    messenger.setMockMethodCallHandler(audioChannel, (call) async {
      audioCalls.add(call);
      switch (call.method) {
        case 'inspect':
          return <String, Object?>{'durationMs': 250};
        case 'play':
          audioPlaying = true;
          return null;
        case 'position':
          if (!audioPlaying) {
            throw PlatformException(code: 'not_playing');
          }
          return <String, Object?>{
            'positionMs': 20,
            'durationMs': 250,
            'isPlaying': true,
          };
        case 'stop':
          audioPlaying = false;
          return null;
      }
      return null;
    });
    addTearDown(() {
      messenger.setMockMethodCallHandler(metronomeChannel, null);
      messenger.setMockMethodCallHandler(toneChannel, null);
      messenger.setMockMethodCallHandler(audioChannel, null);
    });

    final item = await SheetPracticeAudioBridgeChecker(
      metronomeChannel: metronomeChannel,
      toneChannel: toneChannel,
      audioPlayerChannel: audioChannel,
      createAudioFixture: () async => '/tmp/silent.wav',
      deleteAudioFixture: (path) async => deletedFixtures.add(path),
    ).run();

    expect(item.status, SheetDeviceCheckStatus.pass);
    expect(item.details, contains('metronome click buffer'));
    expect(item.details, contains('drone silent output'));
    expect(item.details, contains('linked audio duration'));
    expect(item.details, contains('linked audio silent playback'));
    expect(item.details, contains('linked audio position 20/250ms'));
    expect(item.details, contains('linked audio stop lifecycle'));
    expect(item.details, contains('audio route builtInSpeaker'));
    expect(item.details, contains('system volume 40%'));
    expect(
      metronomeCalls.map((call) => call.method),
      orderedEquals(<String>['prepare', 'stop']),
    );
    expect(
      toneCalls.map((call) => call.method),
      orderedEquals(<String>['play', 'routeInfo', 'stop']),
    );
    expect(toneCalls.first.arguments, <String, Object?>{
      'frequencies': const <double>[440],
      'volume': 0.0,
    });
    expect(
      audioCalls.map((call) => call.method),
      orderedEquals(<String>[
        'inspect',
        'play',
        'position',
        'stop',
        'position',
      ]),
    );
    expect(deletedFixtures, <String>['/tmp/silent.wav']);
  });

  test('native practice audio check reports one bridge failure', () async {
    const metronomeChannel = MethodChannel('clef/test_metronome_failure');
    const toneChannel = MethodChannel('clef/test_tone_failure');
    const audioChannel = MethodChannel('clef/test_audio_after_failure');
    var audioPlaying = false;
    final messenger =
        TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
    messenger.setMockMethodCallHandler(metronomeChannel, (call) async => null);
    messenger.setMockMethodCallHandler(toneChannel, (call) async {
      if (call.method == 'play') {
        throw PlatformException(code: 'audio_route_unavailable');
      }
      return null;
    });
    messenger.setMockMethodCallHandler(audioChannel, (call) async {
      switch (call.method) {
        case 'inspect':
          return <String, Object?>{'durationMs': 250};
        case 'play':
          audioPlaying = true;
          return null;
        case 'position':
          if (!audioPlaying) {
            throw PlatformException(code: 'not_playing');
          }
          return <String, Object?>{
            'positionMs': 10,
            'durationMs': 250,
            'isPlaying': true,
          };
        case 'stop':
          audioPlaying = false;
          return null;
      }
      return null;
    });
    addTearDown(() {
      messenger.setMockMethodCallHandler(metronomeChannel, null);
      messenger.setMockMethodCallHandler(toneChannel, null);
      messenger.setMockMethodCallHandler(audioChannel, null);
    });

    final item = await SheetPracticeAudioBridgeChecker(
      metronomeChannel: metronomeChannel,
      toneChannel: toneChannel,
      audioPlayerChannel: audioChannel,
      createAudioFixture: () async => '/tmp/silent.wav',
      deleteAudioFixture: (_) async {},
    ).run();

    expect(item.status, SheetDeviceCheckStatus.warn);
    expect(item.details, contains('metronome click buffer'));
    expect(item.details, contains('linked audio silent playback'));
    expect(item.details, contains('linked audio position 10/250ms'));
    expect(item.details, contains('linked audio stop lifecycle'));
    expect(item.details, contains('drone audio_route_unavailable'));
    expect(item.details, contains('실제 음량'));
  });

  test(
    'native practice audio check cleans fixture after player failure',
    () async {
      const metronomeChannel = MethodChannel(
        'clef/test_metronome_audio_failure',
      );
      const toneChannel = MethodChannel('clef/test_tone_audio_failure');
      const audioChannel = MethodChannel('clef/test_audio_failure');
      final audioCalls = <MethodCall>[];
      final deletedFixtures = <String>[];
      final messenger =
          TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
      messenger.setMockMethodCallHandler(
        metronomeChannel,
        (call) async => null,
      );
      messenger.setMockMethodCallHandler(toneChannel, (call) async => null);
      messenger.setMockMethodCallHandler(audioChannel, (call) async {
        audioCalls.add(call);
        if (call.method != 'stop') {
          throw PlatformException(
            code: 'unsupported_codec',
            message: 'Cannot open fixture.',
          );
        }
        return null;
      });
      addTearDown(() {
        messenger.setMockMethodCallHandler(metronomeChannel, null);
        messenger.setMockMethodCallHandler(toneChannel, null);
        messenger.setMockMethodCallHandler(audioChannel, null);
      });

      final item = await SheetPracticeAudioBridgeChecker(
        metronomeChannel: metronomeChannel,
        toneChannel: toneChannel,
        audioPlayerChannel: audioChannel,
        createAudioFixture: () async => '/tmp/failing-silent.wav',
        deleteAudioFixture: (path) async => deletedFixtures.add(path),
      ).run();

      expect(item.status, SheetDeviceCheckStatus.warn);
      expect(item.details, contains('linked audio duration 조회 실패'));
      expect(item.details, contains('Cannot open fixture.'));
      expect(
        audioCalls.map((call) => call.method),
        orderedEquals(<String>['inspect', 'play', 'stop']),
      );
      expect(deletedFixtures, <String>['/tmp/failing-silent.wav']);
    },
  );

  test(
    'native practice audio check warns when stop keeps player active',
    () async {
      const metronomeChannel = MethodChannel('clef/test_metronome_stop_state');
      const toneChannel = MethodChannel('clef/test_tone_stop_state');
      const audioChannel = MethodChannel('clef/test_audio_stop_state');
      final messenger =
          TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
      messenger.setMockMethodCallHandler(
        metronomeChannel,
        (call) async => null,
      );
      messenger.setMockMethodCallHandler(toneChannel, (call) async => null);
      messenger.setMockMethodCallHandler(audioChannel, (call) async {
        if (call.method == 'inspect') {
          return <String, Object?>{'durationMs': 250};
        }
        if (call.method == 'position') {
          return <String, Object?>{
            'positionMs': 30,
            'durationMs': 250,
            'isPlaying': true,
          };
        }
        return null;
      });
      addTearDown(() {
        messenger.setMockMethodCallHandler(metronomeChannel, null);
        messenger.setMockMethodCallHandler(toneChannel, null);
        messenger.setMockMethodCallHandler(audioChannel, null);
      });

      final item = await SheetPracticeAudioBridgeChecker(
        metronomeChannel: metronomeChannel,
        toneChannel: toneChannel,
        audioPlayerChannel: audioChannel,
        createAudioFixture: () async => '/tmp/silent.wav',
        deleteAudioFixture: (_) async {},
      ).run();

      expect(item.status, SheetDeviceCheckStatus.warn);
      expect(item.details, contains('linked audio stop 후 player 유지'));
    },
  );

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
