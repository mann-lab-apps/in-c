import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_metronome.dart';

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
    expect(low.subdivision, SheetMetronomeSubdivision.none);
    expect(high.bpm, 240);
    expect(high.meter, SheetMetronomeMeter.sixEight);
    expect(decimal.bpm, 132);
  });

  test('encodes and decodes metronome settings', () {
    const settings = SheetMetronomeSettings(
      bpm: 132,
      meter: SheetMetronomeMeter.threeFour,
      soundEnabled: true,
      accentEnabled: false,
      subdivision: SheetMetronomeSubdivision.triplet,
    );

    final decoded = SheetMetronomeCodec.decode(
      SheetMetronomeCodec.encode(settings),
    );

    expect(decoded.bpm, 132);
    expect(decoded.meter, SheetMetronomeMeter.threeFour);
    expect(decoded.soundEnabled, isTrue);
    expect(decoded.accentEnabled, isFalse);
    expect(decoded.subdivision, SheetMetronomeSubdivision.triplet);
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
      'subdivision': 'tiny',
    });

    expect(settings.bpm, SheetMetronomeSettings.defaultSettings.bpm);
    expect(settings.meter, SheetMetronomeSettings.defaultSettings.meter);
    expect(settings.soundEnabled, isTrue);
    expect(settings.accentEnabled, isTrue);
    expect(settings.subdivision, SheetMetronomeSubdivision.none);
  });

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
}
