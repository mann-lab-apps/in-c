import 'dart:math' as math;
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_tuner.dart';

void main() {
  test('detects A4 from 440Hz with zero cents', () {
    final reading = SheetTunerPitch.detect(frequency: 440);

    expect(reading, isNotNull);
    expect(reading!.note.label, 'A4');
    expect(reading.centsOffset, closeTo(0, 0.01));
  });

  test('detects A sharp 4 near 466.16Hz', () {
    final reading = SheetTunerPitch.detect(frequency: 466.16);

    expect(reading, isNotNull);
    expect(reading!.note.label, 'A#4');
    expect(reading.centsOffset, closeTo(0, 0.1));
  });

  test('detects C4 near 261.63Hz', () {
    final reading = SheetTunerPitch.detect(frequency: 261.63);

    expect(reading, isNotNull);
    expect(reading!.note.label, 'C4');
    expect(reading.centsOffset, closeTo(0, 0.1));
  });

  test('displays Bb trumpet written pitch from concert pitch', () {
    final concertBb = SheetTunerPitch.detect(frequency: 466.16);
    final concertC = SheetTunerPitch.detect(frequency: 261.63);
    final concertF = SheetTunerPitch.detect(frequency: 349.23);

    final writtenC = SheetTunerPitch.displayPitch(
      reading: concertBb!,
      displayMode: SheetTunerDisplayMode.bbTrumpet,
    );
    final writtenD = SheetTunerPitch.displayPitch(
      reading: concertC!,
      displayMode: SheetTunerDisplayMode.bbTrumpet,
    );
    final writtenG = SheetTunerPitch.displayPitch(
      reading: concertF!,
      displayMode: SheetTunerDisplayMode.bbTrumpet,
    );

    expect(writtenC.primaryLabel, 'C5');
    expect(writtenC.concertNote.label, 'A#4');
    expect(writtenC.detailLabel, startsWith('Written C5 · Concert Bb4 · '));
    expect(writtenD.primaryLabel, 'D4');
    expect(writtenG.primaryLabel, 'G4');
    expect(writtenC.centsOffset, closeTo(concertBb.centsOffset, 0.001));
  });

  test('displays transposed pitch for common instrument profiles', () {
    final concertBb = SheetTunerPitch.detect(frequency: 466.16);

    final clarinet = SheetTunerPitch.displayPitch(
      reading: concertBb!,
      displayMode: SheetTunerDisplayMode.bbClarinet,
    );
    final alto = SheetTunerPitch.displayPitch(
      reading: concertBb,
      displayMode: SheetTunerDisplayMode.altoSax,
    );
    final horn = SheetTunerPitch.displayPitch(
      reading: concertBb,
      displayMode: SheetTunerDisplayMode.frenchHorn,
    );

    expect(clarinet.primaryLabel, 'C5');
    expect(alto.primaryLabel, 'G5');
    expect(horn.primaryLabel, 'F5');
    expect(alto.detailLabel, contains('Concert Bb4'));
  });

  test('provides tuning targets for strings and guitar profiles', () {
    final violinTargets = SheetTunerDisplayMode.violin.tuningTargets;
    final guitarTargets = SheetTunerDisplayMode.guitar.tuningTargets;

    expect(violinTargets.map((target) => target.label), <String>[
      'G',
      'D',
      'A',
      'E',
    ]);
    expect(
      violinTargets[2].displayLabel(displayMode: SheetTunerDisplayMode.violin),
      'A4',
    );
    expect(guitarTargets.map((target) => target.concertMidiNumber), <int>[
      40,
      45,
      50,
      55,
      59,
      64,
    ]);
  });

  test('keeps concert display mode unchanged', () {
    final reading = SheetTunerPitch.detect(frequency: 440);

    final displayed = SheetTunerPitch.displayPitch(
      reading: reading!,
      displayMode: SheetTunerDisplayMode.concert,
    );

    expect(displayed.primaryLabel, 'A4');
    expect(displayed.concertNote.label, 'A4');
  });

  test('keeps cents in Bb trumpet detail labels', () {
    final sharpConcertBb = SheetTunerPitch.detect(frequency: 468);

    final displayed = SheetTunerPitch.displayPitch(
      reading: sharpConcertBb!,
      displayMode: SheetTunerDisplayMode.bbTrumpet,
    );

    expect(displayed.primaryLabel, 'C5');
    expect(displayed.concertNote.label, 'A#4');
    expect(displayed.concertNote.labelWith(preferFlats: true), 'Bb4');
    expect(displayed.detailLabel, contains('Concert Bb4'));
    expect(displayed.detailLabel, contains('+'));
    expect(displayed.detailLabel, contains('cents'));
  });

  test('calculates positive and negative cents offsets', () {
    final sharp = SheetTunerPitch.detect(frequency: 445);
    final flat = SheetTunerPitch.detect(frequency: 435);

    expect(sharp!.note.label, 'A4');
    expect(sharp.centsOffset, greaterThan(0));
    expect(flat!.note.label, 'A4');
    expect(flat.centsOffset, lessThan(0));
  });

  test('calculates cents against an explicit target frequency', () {
    final target = SheetTunerPitch.noteFromMidi(69);
    final sharp = SheetTunerPitch.centsFromTarget(
      frequency: _frequencyAtCents(target.frequency, 15),
      targetFrequency: target.frequency,
    );
    final flat = SheetTunerPitch.centsFromTarget(
      frequency: _frequencyAtCents(target.frequency, -12),
      targetFrequency: target.frequency,
    );

    expect(sharp, closeTo(15, 0.001));
    expect(flat, closeTo(-12, 0.001));
    expect(
      SheetTunerPitch.centsFromTarget(frequency: 440, targetFrequency: 0),
      0,
    );
  });

  test('returns null for invalid frequency', () {
    expect(SheetTunerPitch.detect(frequency: 0), isNull);
    expect(SheetTunerPitch.detect(frequency: double.nan), isNull);
  });

  test('clamps and persists tuner settings', () {
    final low = SheetTunerSettings.fromJson(<String, Object?>{
      'referencePitchA4': 300,
    });
    final high = SheetTunerSettings.fromJson(<String, Object?>{
      'referencePitchA4': 500,
    });
    final decimal = SheetTunerSettings.fromJson(<String, Object?>{
      'referencePitchA4': 441.6,
    });
    const settings = SheetTunerSettings(
      referencePitchA4: 442,
      displayMode: SheetTunerDisplayMode.altoSax,
      detectionProfile: SheetTunerDetectionProfile.highInstrument,
      targetConcertMidiNumber: 70,
    );

    final decoded = SheetTunerCodec.decode(SheetTunerCodec.encode(settings));

    expect(low.referencePitchA4, 415);
    expect(high.referencePitchA4, 466);
    expect(decimal.referencePitchA4, 442);
    expect(decoded.referencePitchA4, 442);
    expect(decoded.displayMode, SheetTunerDisplayMode.altoSax);
    expect(decoded.detectionProfile, SheetTunerDetectionProfile.highInstrument);
    expect(decoded.targetConcertMidiNumber, 70);
  });

  test('persists tuner target mode and preset fields', () {
    const settings = SheetTunerSettings(
      referencePitchA4: 442,
      tuningMode: SheetTunerMode.target,
      tuningPreset: SheetTunerPreset.guitarDropD,
      displayMode: SheetTunerDisplayMode.guitar,
      detectionProfile: SheetTunerDetectionProfile.guitarBass,
      targetConcertMidiNumber: 38,
    );

    final decoded = SheetTunerCodec.decode(SheetTunerCodec.encode(settings));

    expect(decoded.referencePitchA4, 442);
    expect(decoded.tuningMode, SheetTunerMode.target);
    expect(decoded.tuningPreset, SheetTunerPreset.guitarDropD);
    expect(decoded.displayMode, SheetTunerDisplayMode.guitar);
    expect(decoded.detectionProfile, SheetTunerDetectionProfile.guitarBass);
    expect(decoded.targetConcertMidiNumber, 38);
  });

  test('falls back to default tuner settings for malformed JSON', () {
    expect(
      SheetTunerCodec.decode('{bad json').referencePitchA4,
      SheetTunerSettings.defaultSettings.referencePitchA4,
    );
    expect(
      SheetTunerCodec.decode('[]').displayMode,
      SheetTunerSettings.defaultSettings.displayMode,
    );
  });

  test('decodes legacy tuner settings with concert/profile fallback', () {
    final decoded = SheetTunerSettings.fromJson(<String, Object?>{
      'referencePitchA4': 441,
    });

    expect(decoded.referencePitchA4, 441);
    expect(decoded.tuningMode, SheetTunerMode.chromatic);
    expect(decoded.tuningPreset, SheetTunerPreset.chromatic);
    expect(decoded.displayMode, SheetTunerDisplayMode.concert);
    expect(decoded.detectionProfile, SheetTunerDetectionProfile.chromatic);
  });

  test('repairs target mode without a saved target', () {
    final decoded = SheetTunerSettings.fromJson(<String, Object?>{
      'tuningMode': 'target',
      'tuningPreset': 'violin',
    });

    expect(decoded.tuningMode, SheetTunerMode.chromatic);
    expect(decoded.tuningPreset, SheetTunerPreset.violin);
    expect(decoded.displayMode, SheetTunerDisplayMode.violin);
    expect(decoded.detectionProfile, SheetTunerDetectionProfile.strings);
    expect(decoded.targetConcertMidiNumber, isNull);
  });

  test('tuning presets provide practical target lists and profiles', () {
    final dropDTargets = SheetTunerPreset.guitarDropD.targets;
    final violinTargets = SheetTunerPreset.violin.targets;

    expect(
      SheetTunerPreset.guitarDropD.displayMode,
      SheetTunerDisplayMode.guitar,
    );
    expect(
      SheetTunerPreset.guitarDropD.detectionProfile,
      SheetTunerDetectionProfile.guitarBass,
    );
    expect(dropDTargets.map((target) => target.concertMidiNumber), <int>[
      38,
      45,
      50,
      55,
      59,
      64,
    ]);
    expect(dropDTargets.first.label, 'D2');
    expect(violinTargets.map((target) => target.label), <String>[
      'G',
      'D',
      'A',
      'E',
    ]);
    expect(SheetTunerPreset.violin.hasTarget(69), isTrue);
    expect(SheetTunerPreset.violin.hasTarget(70), isFalse);
  });

  test('detection profiles filter practical frequency ranges', () {
    expect(SheetTunerDetectionProfile.chromatic.acceptsFrequency(110), isTrue);
    expect(SheetTunerDetectionProfile.bbTrumpet.acceptsFrequency(110), isFalse);
    expect(
      SheetTunerDetectionProfile.lowInstrument.acceptsFrequency(41),
      isTrue,
    );
    expect(SheetTunerDetectionProfile.guitarBass.acceptsFrequency(31), isTrue);
    expect(
      SheetTunerDetectionProfile.bbTrumpet.acceptsFrequency(466.16),
      isTrue,
    );
  });

  test('display mode and detection profile stay independent', () {
    const settings = SheetTunerSettings(
      referencePitchA4: 440,
      displayMode: SheetTunerDisplayMode.bbTrumpet,
      detectionProfile: SheetTunerDetectionProfile.chromatic,
    );

    final decoded = SheetTunerSettings.fromJson(settings.toJson());

    expect(decoded.displayMode, SheetTunerDisplayMode.bbTrumpet);
    expect(decoded.detectionProfile, SheetTunerDetectionProfile.chromatic);
  });

  test('decodes little-endian PCM16 samples', () {
    final bytes = Uint8List.fromList(<int>[0x00, 0x40, 0x00, 0xc0]);

    final samples = SheetTunerPcm16.decodeLittleEndian(bytes);

    expect(samples.first, closeTo(0.5, 0.0001));
    expect(samples.last, closeTo(-0.5, 0.0001));
  });

  test('detects A4 from synthetic PCM window', () {
    final reading = SheetTunerPitchDetector.detectSamples(
      _sineSamples(frequency: 440),
      sampleRate: 44100,
    );

    expect(reading, isNotNull);
    expect(reading!.note.label, 'A4');
    expect(reading.frequency, closeTo(440, 1.5));
  });

  test('detects practical low and high instrument pitches', () {
    final low = SheetTunerPitchDetector.detectSamples(
      _sineSamples(frequency: 82.41, sampleCount: 8192),
      sampleRate: 44100,
      detectionProfile: SheetTunerDetectionProfile.guitarBass,
    );
    final high = SheetTunerPitchDetector.detectSamples(
      _sineSamples(frequency: 1046.5),
      sampleRate: 44100,
      detectionProfile: SheetTunerDetectionProfile.highInstrument,
    );

    expect(low, isNotNull);
    expect(low!.note.label, 'E2');
    expect(low.frequency, closeTo(82.41, 1.5));
    expect(high, isNotNull);
    expect(high!.note.label, 'C6');
    expect(high.frequency, closeTo(1046.5, 3));
  });

  test('rejects low RMS input before pitch detection', () {
    final reading = SheetTunerPitchDetector.detectSamples(
      _sineSamples(frequency: 440, amplitude: 0.004),
      sampleRate: 44100,
    );

    expect(reading, isNull);
  });

  test('trumpet profile rejects low rumble outside practical range', () {
    final lowReading = SheetTunerPitchDetector.detectSamples(
      _sineSamples(frequency: 110),
      sampleRate: 44100,
      detectionProfile: SheetTunerDetectionProfile.bbTrumpet,
    );
    final trumpetReading = SheetTunerPitchDetector.detectSamples(
      _sineSamples(frequency: 466.16),
      sampleRate: 44100,
      detectionProfile: SheetTunerDetectionProfile.bbTrumpet,
    );

    expect(lowReading, isNull);
    expect(trumpetReading, isNotNull);
    expect(trumpetReading!.note.label, 'A#4');
  });

  test('detects small detuned offsets around A4', () {
    final sharp = SheetTunerPitchDetector.detectSamples(
      _sineSamples(frequency: _frequencyAtCents(440, 10)),
      sampleRate: 44100,
    );
    final flat = SheetTunerPitchDetector.detectSamples(
      _sineSamples(frequency: _frequencyAtCents(440, -10)),
      sampleRate: 44100,
    );

    expect(sharp, isNotNull);
    expect(sharp!.note.label, 'A4');
    expect(sharp.centsOffset, closeTo(10, 2));
    expect(flat, isNotNull);
    expect(flat!.note.label, 'A4');
    expect(flat.centsOffset, closeTo(-10, 2));
  });

  test('detects C4 from rolling PCM chunks', () {
    final detector = SheetTunerPitchDetector(sampleRate: 44100);
    final bytes = _sinePcm16(frequency: 261.63);
    SheetTunerReading? reading;
    for (var offset = 0; offset < bytes.length; offset += 512) {
      final end = math.min(bytes.length, offset + 512);
      reading = detector.addPcm16Chunk(bytes.sublist(offset, end));
    }

    expect(reading, isNotNull);
    expect(reading!.note.label, 'C4');
    expect(reading.frequency, closeTo(261.63, 1.5));
  });

  test('returns null for silence and short buffers', () {
    final silence = List<double>.filled(4096, 0);

    expect(
      SheetTunerPitchDetector.detectSamples(silence, sampleRate: 44100),
      isNull,
    );
    expect(
      SheetTunerPitchDetector.detectSamples(const <double>[
        0.1,
        -0.1,
      ], sampleRate: 44100),
      isNull,
    );
  });

  test('keeps a stable reading for mildly noisy signal', () {
    final random = math.Random(7);
    final samples = _sineSamples(frequency: 440)
        .map((sample) => sample + ((random.nextDouble() - 0.5) * 0.04))
        .toList(growable: false);

    final reading = SheetTunerPitchDetector.detectSamples(
      samples,
      sampleRate: 44100,
      minConfidence: 0.5,
    );

    expect(reading, isNotNull);
    expect(reading!.note.label, 'A4');
    expect(reading.frequency, closeTo(440, 2.5));
  });

  test('stabilizer smooths frequency jitter with median reading', () {
    final stabilizer = SheetTunerReadingStabilizer(maxHistory: 5);

    for (final frequency in <double>[438, 441, 440, 439, 442]) {
      stabilizer.add(SheetTunerPitch.detect(frequency: frequency));
    }
    final reading = stabilizer.add(SheetTunerPitch.detect(frequency: 470));

    expect(reading, isNotNull);
    expect(reading!.note.label, 'A4');
    expect(reading.frequency, closeTo(441, 0.01));
  });

  test('stabilizer debounces brief no-signal gaps', () {
    final stabilizer = SheetTunerReadingStabilizer(noSignalDebounceFrames: 3);
    final stable = stabilizer.add(SheetTunerPitch.detect(frequency: 440));

    expect(stabilizer.add(null), same(stable));
    expect(stabilizer.add(null), same(stable));
    expect(stabilizer.add(null), isNull);
  });

  test('stabilizer ignores low-confidence readings', () {
    final stabilizer = SheetTunerReadingStabilizer(
      noSignalDebounceFrames: 1,
      minSignalLevel: 0.7,
    );

    final reading = stabilizer.add(
      SheetTunerPitch.detect(frequency: 440, signalLevel: 0.4),
    );

    expect(reading, isNull);
  });

  test('stabilizer folds brief octave jumps near the last stable note', () {
    final stabilizer = SheetTunerReadingStabilizer(
      maxHistory: 3,
      maxStableJumpCents: 300,
    );

    stabilizer.add(SheetTunerPitch.detect(frequency: 440));
    stabilizer.add(SheetTunerPitch.detect(frequency: 441));
    final reading = stabilizer.add(SheetTunerPitch.detect(frequency: 880));

    expect(reading, isNotNull);
    expect(reading!.note.label, 'A4');
    expect(reading.frequency, closeTo(440, 1.5));
  });

  test('stabilizer does not fold normal large interval moves', () {
    final stabilizer = SheetTunerReadingStabilizer(
      maxHistory: 1,
      maxStableJumpCents: 300,
    );

    stabilizer.add(SheetTunerPitch.detect(frequency: 440));
    final reading = stabilizer.add(SheetTunerPitch.detect(frequency: 587.33));

    expect(reading, isNotNull);
    expect(reading!.note.label, 'D5');
  });

  test('feedback summarizes tuner states for performance use', () {
    final noSignal = SheetTunerFeedback.fromState(
      inputStatus: SheetTunerInputStatus.noSignal,
      reading: null,
      centsOffset: 0,
    );
    final lowConfidence = SheetTunerFeedback.fromState(
      inputStatus: SheetTunerInputStatus.listening,
      reading: SheetTunerPitch.detect(frequency: 440, signalLevel: 0.65),
      centsOffset: 0,
    );
    final inTune = SheetTunerFeedback.fromState(
      inputStatus: SheetTunerInputStatus.listening,
      reading: SheetTunerPitch.detect(frequency: 440, signalLevel: 0.9),
      centsOffset: 3,
    );
    final flat = SheetTunerFeedback.fromState(
      inputStatus: SheetTunerInputStatus.listening,
      reading: SheetTunerPitch.detect(frequency: 435, signalLevel: 0.9),
      centsOffset: -19,
    );
    final verySharp = SheetTunerFeedback.fromState(
      inputStatus: SheetTunerInputStatus.listening,
      reading: SheetTunerPitch.detect(frequency: 448, signalLevel: 0.9),
      centsOffset: 31,
    );

    expect(noSignal.band, SheetTunerFeedbackBand.noSignal);
    expect(noSignal.hasPitch, isFalse);
    expect(noSignal.label, '소리가 너무 작습니다');
    expect(lowConfidence.band, SheetTunerFeedbackBand.lowConfidence);
    expect(inTune.band, SheetTunerFeedbackBand.inTune);
    expect(inTune.displayCents, 0);
    expect(inTune.label, '맞았습니다');
    expect(flat.band, SheetTunerFeedbackBand.slightlyFlat);
    expect(flat.isFlat, isTrue);
    expect(verySharp.band, SheetTunerFeedbackBand.verySharp);
    expect(verySharp.isSharp, isTrue);
  });

  test(
    'feedback stabilizer damps needle movement and holds in tune briefly',
    () {
      final stabilizer = SheetTunerFeedbackStabilizer(
        dampingFactor: 0.5,
        inTuneHoldFrames: 2,
        inTuneReleaseCents: 8,
      );

      final first = stabilizer.add(
        inputStatus: SheetTunerInputStatus.listening,
        reading: SheetTunerPitch.detect(frequency: 440, signalLevel: 0.9),
        centsOffset: 0,
      );
      final held = stabilizer.add(
        inputStatus: SheetTunerInputStatus.listening,
        reading: SheetTunerPitch.detect(frequency: 442, signalLevel: 0.9),
        centsOffset: 7,
      );
      final damped = stabilizer.add(
        inputStatus: SheetTunerInputStatus.listening,
        reading: SheetTunerPitch.detect(frequency: 448, signalLevel: 0.9),
        centsOffset: 31,
      );
      final reset = stabilizer.add(
        inputStatus: SheetTunerInputStatus.noSignal,
        reading: null,
        centsOffset: 0,
      );

      expect(first.band, SheetTunerFeedbackBand.inTune);
      expect(held.band, SheetTunerFeedbackBand.inTune);
      expect(damped.displayCents, lessThan(31));
      expect(damped.band, SheetTunerFeedbackBand.slightlySharp);
      expect(reset.hasPitch, isFalse);
    },
  );

  test('stabilizer holds note near a boundary with hysteresis', () {
    final stabilizer = SheetTunerReadingStabilizer(
      maxHistory: 1,
      noteHysteresisCents: 18,
    );

    stabilizer.add(SheetTunerPitch.detect(frequency: 440));
    final held = stabilizer.add(
      SheetTunerPitch.detect(frequency: _frequencyAtCents(440, 52)),
    );
    final switched = stabilizer.add(
      SheetTunerPitch.detect(frequency: _frequencyAtCents(440, 76)),
    );

    expect(held, isNotNull);
    expect(held!.note.label, 'A4');
    expect(held.centsOffset, greaterThan(50));
    expect(switched, isNotNull);
    expect(switched!.note.label, 'A#4');
  });
}

List<double> _sineSamples({
  required double frequency,
  int sampleRate = 44100,
  int sampleCount = 4096,
  double amplitude = 0.72,
}) {
  return List<double>.generate(sampleCount, (index) {
    return math.sin(2 * math.pi * frequency * index / sampleRate) * amplitude;
  }, growable: false);
}

Uint8List _sinePcm16({
  required double frequency,
  int sampleRate = 44100,
  int sampleCount = 4096,
  double amplitude = 0.72,
}) {
  final samples = _sineSamples(
    frequency: frequency,
    sampleRate: sampleRate,
    sampleCount: sampleCount,
    amplitude: amplitude,
  );
  final bytes = ByteData(sampleCount * 2);
  for (var index = 0; index < samples.length; index += 1) {
    final value = (samples[index].clamp(-1.0, 1.0) * 32767).round();
    bytes.setInt16(index * 2, value, Endian.little);
  }
  return bytes.buffer.asUint8List();
}

double _frequencyAtCents(double baseFrequency, double cents) {
  return baseFrequency * math.pow(2, cents / 1200).toDouble();
}
