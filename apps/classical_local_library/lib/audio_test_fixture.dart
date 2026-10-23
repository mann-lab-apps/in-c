import 'dart:math' as math;
import 'dart:typed_data';

const audioFixtureSampleRate = 22050;
const audioFixtureDuration = Duration(milliseconds: 2400);

class PcmWaveFixtureSpecification {
  const PcmWaveFixtureSpecification({
    required this.fileName,
    required this.bodyFrequencies,
    required this.startMarkerFrequency,
    required this.middleMarkerFrequency,
    required this.endMarkerFrequency,
  });

  final String fileName;
  final List<double> bodyFrequencies;
  final double startMarkerFrequency;
  final double middleMarkerFrequency;
  final double endMarkerFrequency;
}

const audioFixtureSpecifications = [
  PcmWaveFixtureSpecification(
    fileName: 'movement_1.wav',
    bodyFrequencies: [261.63, 329.63, 392.00],
    startMarkerFrequency: 880,
    middleMarkerFrequency: 659.25,
    endMarkerFrequency: 440,
  ),
  PcmWaveFixtureSpecification(
    fileName: 'movement_2.wav',
    bodyFrequencies: [349.23, 440.00, 523.25],
    startMarkerFrequency: 1046.5,
    middleMarkerFrequency: 783.99,
    endMarkerFrequency: 523.25,
  ),
];

Uint8List generatePcmWaveFixture(PcmWaveFixtureSpecification specification) {
  final sampleCount =
      audioFixtureSampleRate *
      audioFixtureDuration.inMilliseconds ~/
      Duration.millisecondsPerSecond;
  final dataLength = sampleCount * 2;
  final bytes = ByteData(44 + dataLength);
  _writeAscii(bytes, 0, 'RIFF');
  bytes.setUint32(4, 36 + dataLength, Endian.little);
  _writeAscii(bytes, 8, 'WAVE');
  _writeAscii(bytes, 12, 'fmt ');
  bytes.setUint32(16, 16, Endian.little);
  bytes.setUint16(20, 1, Endian.little);
  bytes.setUint16(22, 1, Endian.little);
  bytes.setUint32(24, audioFixtureSampleRate, Endian.little);
  bytes.setUint32(28, audioFixtureSampleRate * 2, Endian.little);
  bytes.setUint16(32, 2, Endian.little);
  bytes.setUint16(34, 16, Endian.little);
  _writeAscii(bytes, 36, 'data');
  bytes.setUint32(40, dataLength, Endian.little);

  for (var index = 0; index < sampleCount; index += 1) {
    final time = index / audioFixtureSampleRate;
    bytes.setInt16(
      44 + index * 2,
      _fixtureSample(specification, time),
      Endian.little,
    );
  }
  return bytes.buffer.asUint8List();
}

class PcmWaveFixture {
  const PcmWaveFixture._({
    required this.bytes,
    required this.sampleRate,
    required this.channelCount,
    required this.bitsPerSample,
    required this.dataOffset,
    required this.dataLength,
  });

  final Uint8List bytes;
  final int sampleRate;
  final int channelCount;
  final int bitsPerSample;
  final int dataOffset;
  final int dataLength;

  int get frameCount => dataLength ~/ (channelCount * (bitsPerSample ~/ 8));

  Duration get duration => Duration(
    microseconds: frameCount * Duration.microsecondsPerSecond ~/ sampleRate,
  );

  int sampleAt(int frame) {
    if (frame < 0 || frame >= frameCount) {
      throw RangeError.range(frame, 0, frameCount - 1, 'frame');
    }
    return ByteData.sublistView(bytes)
        .getInt16(dataOffset + frame * channelCount * 2, Endian.little);
  }

  static PcmWaveFixture parse(Uint8List bytes) {
    if (bytes.length < 44 ||
        _readAscii(bytes, 0, 4) != 'RIFF' ||
        _readAscii(bytes, 8, 4) != 'WAVE' ||
        _readAscii(bytes, 12, 4) != 'fmt ' ||
        _readAscii(bytes, 36, 4) != 'data') {
      throw const FormatException('Expected a canonical PCM WAV header.');
    }
    final data = ByteData.sublistView(bytes);
    final format = data.getUint16(20, Endian.little);
    final channelCount = data.getUint16(22, Endian.little);
    final sampleRate = data.getUint32(24, Endian.little);
    final bitsPerSample = data.getUint16(34, Endian.little);
    final dataLength = data.getUint32(40, Endian.little);
    if (format != 1 || channelCount != 1 || bitsPerSample != 16) {
      throw const FormatException('Expected 16-bit mono PCM WAV data.');
    }
    if (44 + dataLength != bytes.length || dataLength.isOdd) {
      throw const FormatException('WAV data chunk length does not match file.');
    }
    return PcmWaveFixture._(
      bytes: bytes,
      sampleRate: sampleRate,
      channelCount: channelCount,
      bitsPerSample: bitsPerSample,
      dataOffset: 44,
      dataLength: dataLength,
    );
  }
}

void validatePcmWaveFixture(
  Uint8List bytes,
  PcmWaveFixtureSpecification specification,
) {
  final wave = PcmWaveFixture.parse(bytes);
  if (wave.sampleRate != audioFixtureSampleRate ||
      wave.duration != audioFixtureDuration) {
    throw FormatException('Unexpected PCM fixture duration or sample rate.');
  }
  _validateMarker(
    wave,
    const Duration(milliseconds: 80),
    specification.startMarkerFrequency,
  );
  _validateMarker(
    wave,
    const Duration(milliseconds: 1120),
    specification.middleMarkerFrequency,
  );
  _validateMarker(
    wave,
    const Duration(milliseconds: 2150),
    specification.endMarkerFrequency,
  );
  _validateQuietWindow(wave, const Duration(milliseconds: 220));
}

int _fixtureSample(PcmWaveFixtureSpecification specification, double time) {
  final markerFrequency = _markerFrequencyAt(specification, time);
  if (markerFrequency != null) {
    return (math.sin(2 * math.pi * markerFrequency * time) * 12000).round();
  }
  if (_isQuietWindow(time)) {
    return 0;
  }
  final phrase = (time / 0.8).floor().clamp(0, 2);
  final frequency = specification.bodyFrequencies[phrase];
  final fade = _fadeEnvelope(time);
  final fundamental = math.sin(2 * math.pi * frequency * time);
  final overtone = math.sin(2 * math.pi * frequency * 2 * time) * 0.2;
  return ((fundamental + overtone) * fade * 7000).round();
}

double? _markerFrequencyAt(
  PcmWaveFixtureSpecification specification,
  double time,
) {
  if (time >= 0.08 && time < 0.18) {
    return specification.startMarkerFrequency;
  }
  if (time >= 1.12 && time < 1.22) {
    return specification.middleMarkerFrequency;
  }
  if (time >= 2.15 && time < 2.25) {
    return specification.endMarkerFrequency;
  }
  return null;
}

bool _isQuietWindow(double time) => time >= 0.22 && time < 0.34;

double _fadeEnvelope(double time) {
  const fadeSeconds = 0.05;
  const durationSeconds = 2.4;
  if (time < fadeSeconds) {
    return time / fadeSeconds;
  }
  if (time > durationSeconds - fadeSeconds) {
    return (durationSeconds - time) / fadeSeconds;
  }
  return 1;
}

void _validateMarker(
  PcmWaveFixture wave,
  Duration start,
  double expectedFrequency,
) {
  const window = Duration(milliseconds: 100);
  final firstFrame =
      start.inMicroseconds * wave.sampleRate ~/ Duration.microsecondsPerSecond;
  final frameCount =
      window.inMicroseconds * wave.sampleRate ~/ Duration.microsecondsPerSecond;
  var energy = 0.0;
  var crossings = 0;
  var previous = wave.sampleAt(firstFrame);
  for (var frame = firstFrame; frame < firstFrame + frameCount; frame += 1) {
    final sample = wave.sampleAt(frame);
    energy += sample * sample;
    if ((previous < 0 && sample >= 0) || (previous >= 0 && sample < 0)) {
      crossings += 1;
    }
    previous = sample;
  }
  final rms = math.sqrt(energy / frameCount);
  final estimatedFrequency = crossings * wave.sampleRate / (2 * frameCount);
  if (rms < 8000 || (estimatedFrequency - expectedFrequency).abs() > 40) {
    throw FormatException(
      'PCM fixture marker does not match $expectedFrequency Hz.',
    );
  }
}

void _validateQuietWindow(PcmWaveFixture wave, Duration start) {
  final firstFrame =
      start.inMicroseconds * wave.sampleRate ~/ Duration.microsecondsPerSecond;
  final frameCount =
      const Duration(milliseconds: 100).inMicroseconds *
      wave.sampleRate ~/
      Duration.microsecondsPerSecond;
  for (var frame = firstFrame; frame < firstFrame + frameCount; frame += 1) {
    if (wave.sampleAt(frame) != 0) {
      throw const FormatException('PCM fixture quiet window contains audio.');
    }
  }
}

void _writeAscii(ByteData bytes, int offset, String value) {
  for (var index = 0; index < value.length; index += 1) {
    bytes.setUint8(offset + index, value.codeUnitAt(index));
  }
}

String _readAscii(Uint8List bytes, int offset, int length) {
  return String.fromCharCodes(bytes.sublist(offset, offset + length));
}
