import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_tone.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('decodes and clamps tone settings', () {
    final settings = SheetToneSettings.fromJson(<String, Object?>{
      'rootConcertMidiNumber': 200,
      'droneMode': 'fifthOctave',
      'volumePercent': -12,
    });

    expect(settings.rootConcertMidiNumber, 108);
    expect(settings.droneMode, SheetToneDroneMode.fifthOctave);
    expect(settings.volumePercent, 0);
    expect(settings.concertMidiNumbers, <int>[108, 115, 120]);
  });

  test('encodes and decodes tone settings', () {
    const settings = SheetToneSettings(
      rootConcertMidiNumber: 57,
      droneMode: SheetToneDroneMode.octave,
      volumePercent: 42,
    );

    final decoded = SheetToneCodec.decode(SheetToneCodec.encode(settings));

    expect(decoded.rootConcertMidiNumber, 57);
    expect(decoded.droneMode, SheetToneDroneMode.octave);
    expect(decoded.volumePercent, 42);
  });

  test('calculates frequencies from tuner reference pitch', () {
    const settings = SheetToneSettings(
      rootConcertMidiNumber: 69,
      droneMode: SheetToneDroneMode.fifth,
    );

    final frequencies = settings.frequencies(referencePitchA4: 442);

    expect(frequencies, hasLength(2));
    expect(frequencies.first.toStringAsFixed(1), '442.0');
    expect(frequencies.last.toStringAsFixed(1), '662.3');
  });

  test('sends playback payload through method channel', () async {
    final channel = const MethodChannel('clef/test_tone_player');
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

    final player = SheetTonePlayer(channel: channel);
    final result = await player.play(
      settings: const SheetToneSettings(
        rootConcertMidiNumber: 69,
        droneMode: SheetToneDroneMode.reference,
        volumePercent: 25,
      ),
      referencePitchA4: 440,
    );
    await player.stop();

    expect(result.isPlaying, isTrue);
    expect(calls.map((call) => call.method), <String>['play', 'stop']);
    expect(calls.first.arguments, <String, Object?>{
      'frequencies': <double>[440],
      'volume': 0.25,
    });
  });
}
