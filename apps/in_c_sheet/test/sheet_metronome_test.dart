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

    expect(low.bpm, 40);
    expect(low.meter, SheetMetronomeMeter.fourFour);
    expect(low.soundEnabled, isFalse);
    expect(high.bpm, 240);
    expect(high.meter, SheetMetronomeMeter.sixEight);
  });

  test('encodes and decodes metronome settings', () {
    const settings = SheetMetronomeSettings(
      bpm: 132,
      meter: SheetMetronomeMeter.threeFour,
      soundEnabled: true,
    );

    final decoded = SheetMetronomeCodec.decode(
      SheetMetronomeCodec.encode(settings),
    );

    expect(decoded.bpm, 132);
    expect(decoded.meter, SheetMetronomeMeter.threeFour);
    expect(decoded.soundEnabled, isTrue);
  });

  test('cycles beat sequence and marks first beat as accent', () {
    const first = SheetMetronomeBeat(beatIndex: 0, beatsPerBar: 3);
    final second = first.next();
    final third = second.next();
    final wrapped = third.next();

    expect(first.isAccent, isTrue);
    expect(second.isAccent, isFalse);
    expect(second.beatNumber, 2);
    expect(third.beatNumber, 3);
    expect(wrapped.beatNumber, 1);
    expect(wrapped.isAccent, isTrue);
  });
}
