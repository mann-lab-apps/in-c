import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_metronome.dart';
import 'package:in_c_sheet/sheet_metronome_player.dart';

void main() {
  test('clamps BPM and decodes unsupported meter with defaults', () {
    final low = SheetMetronomeSettings.fromJson(<String, Object?>{
      'bpm': 12,
      'meter': 'unknown',
    });
    final high = SheetMetronomeSettings.fromJson(<String, Object?>{
      'bpm': 360,
      'meter': 'sixEight',
    });
    final decimal = SheetMetronomeSettings.fromJson(<String, Object?>{
      'bpm': 131.6,
    });

    expect(low.bpm, 40);
    expect(low.meter, SheetMetronomeMeter.fourFour);
    expect(low.soundEnabled, isTrue);
    expect(low.accentEnabled, isTrue);
    expect(low.normalizedAccentBeatIndexes, <int>[0]);
    expect(low.subdivision, SheetMetronomeSubdivision.none);
    expect(low.countInBars, 0);
    expect(
      low.volumePercent,
      SheetMetronomeSettings.defaultSettings.volumePercent,
    );
    expect(high.bpm, 240);
    expect(high.meter, SheetMetronomeMeter.sixEight);
    expect(high.normalizedAccentBeatIndexes, <int>[0, 3]);
    expect(decimal.bpm, 132);
  });

  test('encodes and decodes metronome settings', () {
    const settings = SheetMetronomeSettings(
      bpm: 132,
      meter: SheetMetronomeMeter.threeFour,
      soundEnabled: true,
      accentEnabled: false,
      subdivision: SheetMetronomeSubdivision.triplet,
      countInBars: 2,
      volumePercent: 42,
      accentBeatIndexes: <int>[0, 2],
    );

    final decoded = SheetMetronomeCodec.decode(
      SheetMetronomeCodec.encode(settings),
    );

    expect(decoded.bpm, 132);
    expect(decoded.meter, SheetMetronomeMeter.threeFour);
    expect(decoded.soundEnabled, isTrue);
    expect(decoded.accentEnabled, isFalse);
    expect(decoded.subdivision, SheetMetronomeSubdivision.triplet);
    expect(decoded.countInBars, 2);
    expect(decoded.volumePercent, 42);
    expect(decoded.normalizedAccentBeatIndexes, <int>[0, 2]);
    expect(decoded.normalizedVolume, 0.42);
    expect(decoded.pulseDuration.inMilliseconds, 152);
  });

  test('keeps explicit silent metronome preference', () {
    final settings = SheetMetronomeSettings.fromJson(<String, Object?>{
      'bpm': 96,
      'meter': 'fourFour',
      'soundEnabled': false,
    });

    expect(settings.soundEnabled, isFalse);
  });

  test('falls back to default settings for malformed JSON', () {
    expect(
      SheetMetronomeCodec.decode('{bad json').bpm,
      SheetMetronomeSettings.defaultSettings.bpm,
    );
    expect(
      SheetMetronomeCodec.decode('[]').meter,
      SheetMetronomeSettings.defaultSettings.meter,
    );
  });

  test('ignores invalid persisted field types', () {
    final settings = SheetMetronomeSettings.fromJson(<String, Object?>{
      'bpm': 'fast',
      'meter': 6,
      'soundEnabled': 'yes',
      'accentEnabled': 'no',
      'accentBeatIndexes': <Object?>[-1, '1', 5],
      'subdivision': 'tiny',
      'countInBars': 8,
      'volumePercent': 'loud',
    });

    expect(settings.bpm, SheetMetronomeSettings.defaultSettings.bpm);
    expect(settings.meter, SheetMetronomeSettings.defaultSettings.meter);
    expect(settings.soundEnabled, isTrue);
    expect(settings.accentEnabled, isTrue);
    expect(settings.normalizedAccentBeatIndexes, isEmpty);
    expect(settings.subdivision, SheetMetronomeSubdivision.none);
    expect(settings.countInBars, 2);
    expect(
      settings.volumePercent,
      SheetMetronomeSettings.defaultSettings.volumePercent,
    );
  });

  test(
    'clamps count-in bars, volume, and keeps backward compatible default',
    () {
      expect(
        SheetMetronomeSettings.fromJson(const <String, Object?>{
          'countInBars': -1,
        }).countInBars,
        0,
      );
      expect(
        SheetMetronomeSettings.fromJson(const <String, Object?>{
          'countInBars': 1.6,
        }).countInBars,
        2,
      );
      expect(
        SheetMetronomeSettings.fromJson(const <String, Object?>{}).countInBars,
        SheetMetronomeSettings.defaultSettings.countInBars,
      );
      expect(
        SheetMetronomeSettings.fromJson(const <String, Object?>{
          'volumePercent': -10,
        }).volumePercent,
        0,
      );
      expect(
        SheetMetronomeSettings.fromJson(const <String, Object?>{
          'volumePercent': 120,
        }).volumePercent,
        100,
      );
      expect(
        SheetMetronomeSettings.fromJson(const <String, Object?>{})
            .volumePercent,
        SheetMetronomeSettings.defaultSettings.volumePercent,
      );
    },
  );

  test('cycles beat and subdivision sequence', () {
    const first = SheetMetronomeBeat(
      beatIndex: 0,
      beatsPerBar: 3,
      pulsesPerBeat: 2,
    );
    final second = first.next();
    final third = second.next();
    final fourth = third.next();

    expect(first.isAccent, isTrue);
    expect(second.isAccent, isFalse);
    expect(second.beatNumber, 1);
    expect(second.subdivisionIndex, 1);
    expect(third.beatNumber, 2);
    expect(third.subdivisionIndex, 0);
    expect(fourth.beatNumber, 2);
    expect(fourth.subdivisionIndex, 1);
  });

  test('supports customizable accent patterns per meter', () {
    final sixEight = SheetMetronomeSettings.fromJson(<String, Object?>{
      'meter': 'sixEight',
    });

    expect(sixEight.normalizedAccentBeatIndexes, <int>[0, 3]);
    expect(
      sixEight.isAccentBeat(
        const SheetMetronomeBeat(beatIndex: 3, beatsPerBar: 6),
      ),
      isTrue,
    );
    expect(
      sixEight.isAccentBeat(
        const SheetMetronomeBeat(beatIndex: 2, beatsPerBar: 6),
      ),
      isFalse,
    );

    final custom = sixEight.copyWith(accentBeatIndexes: <int>[1, 5, 9]);
    expect(custom.normalizedAccentBeatIndexes, <int>[1, 5]);
    expect(
      custom.isAccentBeat(
        const SheetMetronomeBeat(beatIndex: 0, beatsPerBar: 6),
      ),
      isFalse,
    );
    expect(
      custom
          .copyWith(accentEnabled: false)
          .isAccentBeat(const SheetMetronomeBeat(beatIndex: 1, beatsPerBar: 6)),
      isFalse,
    );
  });

  test(
    'metronome sound player sends accent and volume to native channel',
    () async {
      TestWidgetsFlutterBinding.ensureInitialized();
      const channel = MethodChannel('test/clef_metronome_player');
      final calls = <MethodCall>[];
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (call) async {
            calls.add(call);
            return null;
          });
      addTearDown(() {
        TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
            .setMockMethodCallHandler(channel, null);
      });

      final player = SheetMetronomeSoundPlayer(channel: channel);
      await player.playClick(
        settings: const SheetMetronomeSettings(
          bpm: 96,
          meter: SheetMetronomeMeter.fourFour,
          volumePercent: 64,
        ),
        accent: true,
      );

      expect(calls, hasLength(1));
      expect(calls.single.method, 'playClick');
      expect(calls.single.arguments, <String, Object?>{
        'accent': true,
        'volume': 0.64,
      });
    },
  );

  test('metronome sound player skips silent or zero volume settings', () async {
    TestWidgetsFlutterBinding.ensureInitialized();
    const channel = MethodChannel('test/clef_metronome_player_skip');
    final calls = <MethodCall>[];
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
          calls.add(call);
          return null;
        });
    addTearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, null);
    });

    final player = SheetMetronomeSoundPlayer(channel: channel);
    await player.playClick(
      settings: const SheetMetronomeSettings(
        bpm: 96,
        meter: SheetMetronomeMeter.fourFour,
        soundEnabled: false,
      ),
      accent: true,
    );
    await player.playClick(
      settings: const SheetMetronomeSettings(
        bpm: 96,
        meter: SheetMetronomeMeter.fourFour,
        volumePercent: 0,
      ),
      accent: true,
    );

    expect(calls, isEmpty);
  });
}
