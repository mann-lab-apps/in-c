import 'dart:math' as math;
import 'dart:typed_data';

import 'package:classical_local_library/audio_test_fixture.dart';

/// Offline decoder output only. This cannot establish audibility or output routing.
Map<String, Object> analyzeDecodedFixture(Uint8List bytes) {
  final wave = readDecodedWave(bytes);
  final sampleCount = wave.length;
  if (sampleCount < audioFixtureSampleRate * 2.3 ||
      sampleCount > audioFixtureSampleRate * 2.6) {
    throw const FormatException('Decoded fixture duration is out of range.');
  }
  var peak = 0;
  var clipped = 0;
  for (final sample in wave) {
    peak = math.max(peak, sample.abs());
    if (sample.abs() >= 32767) clipped++;
  }
  final markers = <Map<String, Object>>[];
  final spec = audioFixtureSpecifications.first;
  for (final (start, frequency) in [
    (0.09, spec.startMarkerFrequency),
    (1.13, spec.middleMarkerFrequency),
    (2.16, spec.endMarkerFrequency),
  ]) {
    final values = _window(wave, start, 0.08);
    var crossings = 0;
    for (var i = 1; i < values.length; i++) {
      if ((values[i - 1] < 0) != (values[i] < 0)) crossings++;
    }
    final measured = crossings * audioFixtureSampleRate / (2 * values.length);
    final rms = _rms(values);
    markers.add({
      'expectedHz': frequency,
      'measuredHz': measured,
      'rms': rms,
      'passed': (measured - frequency).abs() <= 45 && rms > 6500 && rms < 10000,
    });
  }
  final quietRms = _rms(_window(wave, 0.25, 0.06));
  return {
    'capturePoint': 'hostDecoderPcm',
    'sampleRate': audioFixtureSampleRate,
    'channels': 1,
    'frames': sampleCount,
    'durationMillis': sampleCount * 1000 / audioFixtureSampleRate,
    'peak': peak,
    'clippedSamples': clipped,
    'quietRms': quietRms,
    'markers': markers,
    'passed':
        clipped == 0 &&
        quietRms < 100 &&
        markers.every((m) => m['passed'] == true),
    'physicalOutputVerified': false,
  };
}

List<int> _window(List<int> values, double start, double duration) =>
    values.sublist(
      (start * audioFixtureSampleRate).round(),
      ((start + duration) * audioFixtureSampleRate).round(),
    );

double _rms(List<int> values) => math.sqrt(
  values.fold<double>(0, (sum, value) => sum + value * value) / values.length,
);

/// RIFF chunks may contain decoder metadata and odd-sized padded chunks.
List<int> readDecodedWave(Uint8List bytes) {
  final data = ByteData.sublistView(bytes);
  String tag(int offset) =>
      String.fromCharCodes(bytes.sublist(offset, offset + 4));
  if (bytes.length < 12 ||
      tag(0) != 'RIFF' ||
      tag(8) != 'WAVE' ||
      data.getUint32(4, Endian.little) + 8 != bytes.length) {
    throw const FormatException('Invalid RIFF length or signature.');
  }
  var validFormat = false;
  List<int>? samples;
  var offset = 12;
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) {
      throw const FormatException('Truncated chunk.');
    }
    final size = data.getUint32(offset + 4, Endian.little);
    final body = offset + 8;
    final end = body + size;
    if (end + (size % 2) > bytes.length) {
      throw const FormatException('Invalid chunk length.');
    }
    switch (tag(offset)) {
      case 'fmt ':
        final format = size >= 16 ? data.getUint16(body, Endian.little) : 0;
        final extensiblePcm =
            format == 0xfffe &&
            size >= 40 &&
            data.getUint16(body + 16, Endian.little) == 22 &&
            data.getUint16(body + 18, Endian.little) == 16 &&
            [0, 4].contains(data.getUint32(body + 20, Endian.little)) &&
            _sameBytes(bytes.sublist(body + 24, body + 40), const [
              1,
              0,
              0,
              0,
              0,
              0,
              16,
              0,
              128,
              0,
              0,
              170,
              0,
              56,
              155,
              113,
            ]);
        if (validFormat ||
            size < 16 ||
            (format != 1 && !extensiblePcm) ||
            data.getUint16(body + 2, Endian.little) != 1 ||
            data.getUint32(body + 4, Endian.little) != audioFixtureSampleRate ||
            data.getUint32(body + 8, Endian.little) !=
                audioFixtureSampleRate * 2 ||
            data.getUint16(body + 12, Endian.little) != 2 ||
            data.getUint16(body + 14, Endian.little) != 16) {
          throw const FormatException('Expected 22050 Hz mono PCM16.');
        }
        validFormat = true;
      case 'data':
        if (samples != null || size.isOdd || size == 0) {
          throw const FormatException('Invalid PCM data.');
        }
        samples = [
          for (var i = body; i < end; i += 2) data.getInt16(i, Endian.little),
        ];
    }
    offset = end + (size % 2);
  }
  if (!validFormat || samples == null) {
    throw const FormatException('Missing PCM chunks.');
  }
  return samples;
}

bool _sameBytes(List<int> a, List<int> b) =>
    a.length == b.length &&
    Iterable<int>.generate(a.length).every((i) => a[i] == b[i]);
