import 'dart:convert';
import 'dart:typed_data';
import 'dart:math' as math;

enum SheetTunerDisplayMode {
  concert,
  bbTrumpet;

  factory SheetTunerDisplayMode.fromJson(Object? value) {
    return switch (value) {
      'bbTrumpet' => SheetTunerDisplayMode.bbTrumpet,
      _ => SheetTunerDisplayMode.concert,
    };
  }

  String get label {
    return switch (this) {
      SheetTunerDisplayMode.concert => 'Concert',
      SheetTunerDisplayMode.bbTrumpet => 'Bb Trumpet',
    };
  }

  int get transposeSemitones {
    return switch (this) {
      SheetTunerDisplayMode.concert => 0,
      SheetTunerDisplayMode.bbTrumpet => 2,
    };
  }

  String toJson() => name;
}

enum SheetTunerDetectionProfile {
  chromatic(
    label: 'Chromatic',
    minFrequency: 70,
    maxFrequency: 1200,
    minRms: 0.01,
    minConfidence: 0.62,
    minSignalLevel: 0.62,
    noSignalDebounceFrames: 4,
    noteHysteresisCents: 12,
  ),
  bbTrumpet(
    label: 'Bb Trumpet',
    minFrequency: 164.81,
    maxFrequency: 1046.5,
    minRms: 0.014,
    minConfidence: 0.66,
    minSignalLevel: 0.66,
    noSignalDebounceFrames: 5,
    noteHysteresisCents: 18,
  );

  const SheetTunerDetectionProfile({
    required this.label,
    required this.minFrequency,
    required this.maxFrequency,
    required this.minRms,
    required this.minConfidence,
    required this.minSignalLevel,
    required this.noSignalDebounceFrames,
    required this.noteHysteresisCents,
  });

  factory SheetTunerDetectionProfile.fromJson(Object? value) {
    return switch (value) {
      'bbTrumpet' => SheetTunerDetectionProfile.bbTrumpet,
      _ => SheetTunerDetectionProfile.chromatic,
    };
  }

  final String label;
  final double minFrequency;
  final double maxFrequency;
  final double minRms;
  final double minConfidence;
  final double minSignalLevel;
  final int noSignalDebounceFrames;
  final double noteHysteresisCents;

  bool acceptsFrequency(double frequency) {
    return frequency >= minFrequency && frequency <= maxFrequency;
  }

  double clampFrequency(double frequency) {
    return frequency.clamp(minFrequency, maxFrequency).toDouble();
  }

  String toJson() => name;
}

class SheetTunerSettings {
  const SheetTunerSettings({
    required this.referencePitchA4,
    this.displayMode = SheetTunerDisplayMode.concert,
    this.detectionProfile = SheetTunerDetectionProfile.chromatic,
  });

  factory SheetTunerSettings.fromJson(Map<String, Object?>? json) {
    return SheetTunerSettings(
      referencePitchA4: clampReferencePitch(
        json?['referencePitchA4'] as int? ?? defaultSettings.referencePitchA4,
      ),
      displayMode: SheetTunerDisplayMode.fromJson(json?['displayMode']),
      detectionProfile: SheetTunerDetectionProfile.fromJson(
        json?['detectionProfile'],
      ),
    );
  }

  static const defaultSettings = SheetTunerSettings(referencePitchA4: 440);

  final int referencePitchA4;
  final SheetTunerDisplayMode displayMode;
  final SheetTunerDetectionProfile detectionProfile;

  SheetTunerSettings copyWith({
    int? referencePitchA4,
    SheetTunerDisplayMode? displayMode,
    SheetTunerDetectionProfile? detectionProfile,
  }) {
    return SheetTunerSettings(
      referencePitchA4: clampReferencePitch(
        referencePitchA4 ?? this.referencePitchA4,
      ),
      displayMode: displayMode ?? this.displayMode,
      detectionProfile: detectionProfile ?? this.detectionProfile,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'referencePitchA4': referencePitchA4,
      'displayMode': displayMode.toJson(),
      'detectionProfile': detectionProfile.toJson(),
    };
  }

  static int clampReferencePitch(int value) {
    return value.clamp(415, 466).toInt();
  }
}

class SheetTunerNote {
  const SheetTunerNote({
    required this.midiNumber,
    required this.name,
    required this.octave,
    required this.frequency,
  });

  final int midiNumber;
  final String name;
  final int octave;
  final double frequency;

  String get label => '$name$octave';
}

class SheetTunerDisplayedPitch {
  const SheetTunerDisplayedPitch({
    required this.displayMode,
    required this.writtenNote,
    required this.concertNote,
    required this.centsOffset,
  });

  final SheetTunerDisplayMode displayMode;
  final SheetTunerNote writtenNote;
  final SheetTunerNote concertNote;
  final double centsOffset;

  String get primaryLabel => writtenNote.label;

  String get detailLabel {
    return switch (displayMode) {
      SheetTunerDisplayMode.concert =>
        'Concert ${concertNote.label} · ${_formatCents(centsOffset)}',
      SheetTunerDisplayMode.bbTrumpet =>
        'Written ${writtenNote.label} · Concert ${concertNote.label}',
    };
  }

  static String _formatCents(double cents) {
    return '${cents >= 0 ? '+' : ''}${cents.toStringAsFixed(1)} cents';
  }
}

class SheetTunerReading {
  const SheetTunerReading({
    required this.frequency,
    required this.note,
    required this.centsOffset,
    required this.signalLevel,
  });

  final double frequency;
  final SheetTunerNote note;
  final double centsOffset;
  final double signalLevel;

  bool get isInTune => centsOffset.abs() <= 5;
}

class SheetTunerState {
  const SheetTunerState({
    required this.isListening,
    required this.reading,
    required this.inputStatus,
  });

  static const idle = SheetTunerState(
    isListening: false,
    reading: null,
    inputStatus: SheetTunerInputStatus.idle,
  );

  final bool isListening;
  final SheetTunerReading? reading;
  final SheetTunerInputStatus inputStatus;
}

enum SheetTunerInputStatus {
  idle,
  listening,
  noSignal,
  permissionDenied,
  audioPipelineUnavailable,
  error,
}

class SheetTunerPitch {
  const SheetTunerPitch._();

  static const _noteNames = <String>[
    'C',
    'C#',
    'D',
    'D#',
    'E',
    'F',
    'F#',
    'G',
    'G#',
    'A',
    'A#',
    'B',
  ];

  static SheetTunerReading? detect({
    required double frequency,
    int referencePitchA4 = 440,
    double signalLevel = 1,
    int? preferredMidiNumber,
    double noteSwitchHysteresisCents = 0,
  }) {
    if (frequency <= 0 || frequency.isNaN || frequency.isInfinite) {
      return null;
    }

    final clampedA4 = SheetTunerSettings.clampReferencePitch(referencePitchA4);
    final exactMidi = 69 + (12 * _log2(frequency / clampedA4));
    var midiNumber = exactMidi.round().clamp(0, 127).toInt();
    if (preferredMidiNumber != null && noteSwitchHysteresisCents > 0) {
      final clampedPreferred = preferredMidiNumber.clamp(0, 127).toInt();
      final preferredCents = (exactMidi - clampedPreferred) * 100;
      if ((midiNumber - clampedPreferred).abs() == 1 &&
          preferredCents.abs() <= 50 + noteSwitchHysteresisCents) {
        midiNumber = clampedPreferred;
      }
    }
    final targetFrequency =
        clampedA4 * math.pow(2, (midiNumber - 69) / 12).toDouble();
    final noteIndex = midiNumber % 12;
    final octave = (midiNumber ~/ 12) - 1;
    final centsOffset = 1200 * _log2(frequency / targetFrequency);

    return SheetTunerReading(
      frequency: frequency,
      note: SheetTunerNote(
        midiNumber: midiNumber,
        name: _noteNames[noteIndex],
        octave: octave,
        frequency: targetFrequency,
      ),
      centsOffset: centsOffset,
      signalLevel: signalLevel.clamp(0.0, 1.0).toDouble(),
    );
  }

  static SheetTunerDisplayedPitch displayPitch({
    required SheetTunerReading reading,
    required SheetTunerDisplayMode displayMode,
    int referencePitchA4 = 440,
  }) {
    return SheetTunerDisplayedPitch(
      displayMode: displayMode,
      writtenNote: noteFromMidi(
        reading.note.midiNumber + displayMode.transposeSemitones,
        referencePitchA4: referencePitchA4,
      ),
      concertNote: reading.note,
      centsOffset: reading.centsOffset,
    );
  }

  static SheetTunerNote noteFromMidi(
    int midiNumber, {
    int referencePitchA4 = 440,
  }) {
    final clampedMidi = midiNumber.clamp(0, 127).toInt();
    final clampedA4 = SheetTunerSettings.clampReferencePitch(referencePitchA4);
    final noteIndex = clampedMidi % 12;
    final octave = (clampedMidi ~/ 12) - 1;
    final targetFrequency =
        clampedA4 * math.pow(2, (clampedMidi - 69) / 12).toDouble();
    return SheetTunerNote(
      midiNumber: clampedMidi,
      name: _noteNames[noteIndex],
      octave: octave,
      frequency: targetFrequency,
    );
  }

  static double _log2(double value) => math.log(value) / math.ln2;
}

class SheetTunerPcm16 {
  const SheetTunerPcm16._();

  static List<double> decodeLittleEndian(Uint8List bytes) {
    if (bytes.length < 2) {
      return const <double>[];
    }

    final data = ByteData.sublistView(bytes);
    final sampleCount = bytes.length ~/ 2;
    return List<double>.generate(sampleCount, (index) {
      return data.getInt16(index * 2, Endian.little) / 32768.0;
    }, growable: false);
  }
}

class SheetTunerPitchDetector {
  SheetTunerPitchDetector({
    this.sampleRate = 44100,
    this.windowSize = 4096,
    SheetTunerDetectionProfile detectionProfile =
        SheetTunerDetectionProfile.chromatic,
    double? minFrequency,
    double? maxFrequency,
    double? minRms,
    double? minConfidence,
  }) : minFrequency = minFrequency ?? detectionProfile.minFrequency,
       maxFrequency = maxFrequency ?? detectionProfile.maxFrequency,
       minRms = minRms ?? detectionProfile.minRms,
       minConfidence = minConfidence ?? detectionProfile.minConfidence;

  final int sampleRate;
  final int windowSize;
  double minFrequency;
  double maxFrequency;
  double minRms;
  double minConfidence;
  final List<double> _buffer = <double>[];

  void configureForProfile(SheetTunerDetectionProfile profile) {
    minFrequency = profile.minFrequency;
    maxFrequency = profile.maxFrequency;
    minRms = profile.minRms;
    minConfidence = profile.minConfidence;
  }

  SheetTunerReading? addPcm16Chunk(
    Uint8List chunk, {
    int referencePitchA4 = 440,
  }) {
    return addSamples(
      SheetTunerPcm16.decodeLittleEndian(chunk),
      referencePitchA4: referencePitchA4,
    );
  }

  SheetTunerReading? addSamples(
    List<double> samples, {
    int referencePitchA4 = 440,
  }) {
    if (samples.isEmpty) {
      return null;
    }

    _buffer.addAll(samples);
    if (_buffer.length > windowSize) {
      _buffer.removeRange(0, _buffer.length - windowSize);
    }
    if (_buffer.length < windowSize) {
      return null;
    }

    return detectSamples(
      _buffer,
      sampleRate: sampleRate,
      referencePitchA4: referencePitchA4,
      minFrequency: minFrequency,
      maxFrequency: maxFrequency,
      minRms: minRms,
      minConfidence: minConfidence,
    );
  }

  void reset() {
    _buffer.clear();
  }

  static SheetTunerReading? detectSamples(
    List<double> samples, {
    required int sampleRate,
    int referencePitchA4 = 440,
    SheetTunerDetectionProfile detectionProfile =
        SheetTunerDetectionProfile.chromatic,
    double? minFrequency,
    double? maxFrequency,
    double? minRms,
    double? minConfidence,
  }) {
    if (samples.length < 64 || sampleRate <= 0) {
      return null;
    }
    final effectiveMinFrequency = minFrequency ?? detectionProfile.minFrequency;
    final effectiveMaxFrequency = maxFrequency ?? detectionProfile.maxFrequency;
    final effectiveMinRms = minRms ?? detectionProfile.minRms;
    final effectiveMinConfidence =
        minConfidence ?? detectionProfile.minConfidence;

    final mean = samples.reduce((a, b) => a + b) / samples.length;
    final centered = List<double>.generate(
      samples.length,
      (index) => samples[index] - mean,
      growable: false,
    );
    final rms = _rootMeanSquare(centered);
    if (rms < effectiveMinRms) {
      return null;
    }

    final analysisMinFrequency = math.min(
      SheetTunerDetectionProfile.chromatic.minFrequency,
      effectiveMinFrequency,
    );
    final minLag = math.max(1, (sampleRate / effectiveMaxFrequency).floor());
    final maxLag = math.min(
      centered.length - 2,
      (sampleRate / analysisMinFrequency).ceil(),
    );
    if (maxLag <= minLag) {
      return null;
    }

    var globalBestLag = minLag;
    var bestCorrelation = -1.0;
    final correlations = <int, double>{};
    for (var lag = minLag; lag <= maxLag; lag += 1) {
      final correlation = _normalizedCorrelation(centered, lag);
      correlations[lag] = correlation;
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        globalBestLag = lag;
      }
    }

    if (bestCorrelation < effectiveMinConfidence) {
      return null;
    }

    final bestLag = _firstStrongLocalPeak(
      minLag: minLag,
      maxLag: maxLag,
      correlations: correlations,
      globalBestLag: globalBestLag,
      bestCorrelation: bestCorrelation,
      minConfidence: effectiveMinConfidence,
    );
    final selectedCorrelation = correlations[bestLag] ?? bestCorrelation;
    final refinedLag = _refineLag(
      bestLag,
      correlations[bestLag - 1],
      selectedCorrelation,
      correlations[bestLag + 1],
    );
    final frequency = sampleRate / refinedLag;
    if (frequency < effectiveMinFrequency ||
        frequency > effectiveMaxFrequency) {
      return null;
    }
    return SheetTunerPitch.detect(
      frequency: frequency,
      referencePitchA4: referencePitchA4,
      signalLevel: selectedCorrelation,
    );
  }

  static int _firstStrongLocalPeak({
    required int minLag,
    required int maxLag,
    required Map<int, double> correlations,
    required int globalBestLag,
    required double bestCorrelation,
    required double minConfidence,
  }) {
    final strongThreshold = math.max(minConfidence, bestCorrelation * 0.88);
    for (var lag = minLag + 1; lag < maxLag; lag += 1) {
      final previous = correlations[lag - 1] ?? 0;
      final current = correlations[lag] ?? 0;
      final next = correlations[lag + 1] ?? 0;
      if (current >= strongThreshold &&
          current >= previous &&
          current >= next) {
        return lag;
      }
    }
    return globalBestLag;
  }

  static double _rootMeanSquare(List<double> samples) {
    var sumSquares = 0.0;
    for (final sample in samples) {
      sumSquares += sample * sample;
    }
    return math.sqrt(sumSquares / samples.length);
  }

  static double _normalizedCorrelation(List<double> samples, int lag) {
    var product = 0.0;
    var energyA = 0.0;
    var energyB = 0.0;
    for (var index = 0; index < samples.length - lag; index += 1) {
      final a = samples[index];
      final b = samples[index + lag];
      product += a * b;
      energyA += a * a;
      energyB += b * b;
    }
    if (energyA == 0 || energyB == 0) {
      return 0;
    }
    return product / math.sqrt(energyA * energyB);
  }

  static double _refineLag(
    int lag,
    double? previous,
    double current,
    double? next,
  ) {
    if (previous == null || next == null) {
      return lag.toDouble();
    }
    final denominator = previous - (2 * current) + next;
    if (denominator.abs() < 1e-9) {
      return lag.toDouble();
    }
    final adjustment = 0.5 * (previous - next) / denominator;
    return lag + adjustment.clamp(-0.5, 0.5);
  }
}

class SheetTunerReadingStabilizer {
  SheetTunerReadingStabilizer({
    this.maxHistory = 5,
    int? noSignalDebounceFrames,
    double? minSignalLevel,
    SheetTunerDetectionProfile detectionProfile =
        SheetTunerDetectionProfile.chromatic,
    this.maxStableJumpCents = 700,
    double? noteHysteresisCents,
  }) : noSignalDebounceFrames =
           noSignalDebounceFrames ?? detectionProfile.noSignalDebounceFrames,
       minSignalLevel = minSignalLevel ?? detectionProfile.minSignalLevel,
       noteHysteresisCents =
           noteHysteresisCents ?? detectionProfile.noteHysteresisCents;

  final int maxHistory;
  int noSignalDebounceFrames;
  double minSignalLevel;
  final double maxStableJumpCents;
  double noteHysteresisCents;
  final List<SheetTunerReading> _history = <SheetTunerReading>[];

  SheetTunerReading? _lastStable;
  int _noSignalFrames = 0;

  void configureForProfile(SheetTunerDetectionProfile profile) {
    noSignalDebounceFrames = profile.noSignalDebounceFrames;
    minSignalLevel = profile.minSignalLevel;
    noteHysteresisCents = profile.noteHysteresisCents;
  }

  SheetTunerReading? add(
    SheetTunerReading? reading, {
    int referencePitchA4 = 440,
  }) {
    if (reading == null || reading.signalLevel < minSignalLevel) {
      _noSignalFrames += 1;
      if (_noSignalFrames < noSignalDebounceFrames) {
        return _lastStable;
      }
      _history.clear();
      _lastStable = null;
      return null;
    }

    final guardedReading = _guardAgainstOctaveJump(
      reading,
      referencePitchA4: referencePitchA4,
    );

    _noSignalFrames = 0;
    _history.add(guardedReading);
    if (_history.length > maxHistory) {
      _history.removeRange(0, _history.length - maxHistory);
    }

    final frequency = _median(
      _history.map((value) => value.frequency).toList(growable: false),
    );
    final signalLevel =
        _history.fold<double>(0, (sum, value) => sum + value.signalLevel) /
        _history.length;
    _lastStable = SheetTunerPitch.detect(
      frequency: frequency,
      referencePitchA4: referencePitchA4,
      signalLevel: signalLevel,
      preferredMidiNumber: _lastStable?.note.midiNumber,
      noteSwitchHysteresisCents: noteHysteresisCents,
    );
    return _lastStable;
  }

  void reset() {
    _history.clear();
    _lastStable = null;
    _noSignalFrames = 0;
  }

  static double _median(List<double> values) {
    if (values.isEmpty) {
      return 0;
    }
    values.sort();
    final middle = values.length ~/ 2;
    if (values.length.isOdd) {
      return values[middle];
    }
    return (values[middle - 1] + values[middle]) / 2;
  }

  SheetTunerReading _guardAgainstOctaveJump(
    SheetTunerReading reading, {
    required int referencePitchA4,
  }) {
    final last = _lastStable;
    if (last == null) {
      return reading;
    }

    final jumpCents =
        1200 * SheetTunerPitch._log2(reading.frequency / last.frequency);
    final absoluteJumpCents = jumpCents.abs();
    if (absoluteJumpCents <= maxStableJumpCents ||
        absoluteJumpCents < 1050 ||
        absoluteJumpCents > 1350) {
      return reading;
    }

    final foldedFrequencies = <double>[
      reading.frequency / 2,
      reading.frequency * 2,
    ];
    for (final frequency in foldedFrequencies) {
      final foldedJumpCents =
          1200 * SheetTunerPitch._log2(frequency / last.frequency);
      if (foldedJumpCents.abs() <= maxStableJumpCents) {
        final folded = SheetTunerPitch.detect(
          frequency: frequency,
          referencePitchA4: referencePitchA4,
          signalLevel: reading.signalLevel,
        );
        if (folded != null &&
            folded.note.midiNumber % 12 == reading.note.midiNumber % 12) {
          return folded;
        }
      }
    }

    return reading;
  }
}

class SheetTunerCodec {
  const SheetTunerCodec._();

  static SheetTunerSettings decode(String? value) {
    if (value == null || value.trim().isEmpty) {
      return SheetTunerSettings.defaultSettings;
    }

    final decoded = jsonDecode(value);
    if (decoded is! Map) {
      return SheetTunerSettings.defaultSettings;
    }
    return SheetTunerSettings.fromJson(
      decoded.map(
        (key, mapValue) => MapEntry(key.toString(), mapValue as Object?),
      ),
    );
  }

  static String encode(SheetTunerSettings settings) {
    return jsonEncode(settings.toJson());
  }
}
