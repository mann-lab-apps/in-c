import 'dart:math';

enum PitchName {
  c('C', 0),
  cSharp('C#/Db', 1),
  d('D', 2),
  eFlat('D#/Eb', 3),
  e('E', 4),
  f('F', 5),
  fSharp('F#/Gb', 6),
  g('G', 7),
  aFlat('G#/Ab', 8),
  a('A', 9),
  bFlat('A#/Bb', 10),
  b('B', 11);

  const PitchName(this.label, this.semitoneFromC);

  final String label;
  final int semitoneFromC;
}

enum ToneColor {
  pure('Pure'),
  warm('Warm'),
  bright('Bright');

  const ToneColor(this.label);

  final String label;
}

class ChimeTone {
  const ChimeTone({
    required this.pitch,
    required this.octave,
    required this.referenceA,
  });

  final PitchName pitch;
  final int octave;
  final int referenceA;

  String get label => '${pitch.label}$octave';

  double get frequency {
    final midiNumber = ((octave + 1) * 12) + pitch.semitoneFromC;
    return referenceA.toDouble() * pow(2, (midiNumber - 69) / 12).toDouble();
  }

  String get frequencyLabel => '${frequency.toStringAsFixed(1)} Hz';
}

int normalizeOctave(int octave) {
  return switch (octave) {
    2 || 3 || 4 || 5 => octave,
    _ => 4,
  };
}

int normalizeReferenceA(int referenceA) {
  return switch (referenceA) {
    440 || 441 || 442 => referenceA,
    _ => 440,
  };
}

PitchName normalizePitch(int index) {
  if (index < 0 || index >= PitchName.values.length) {
    return PitchName.a;
  }
  return PitchName.values[index];
}

ToneColor normalizeToneColor(int index) {
  if (index < 0 || index >= ToneColor.values.length) {
    return ToneColor.warm;
  }
  return ToneColor.values[index];
}
