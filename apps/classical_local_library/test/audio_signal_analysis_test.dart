import 'dart:typed_data';

import 'package:classical_local_library/audio_test_fixture.dart';
import 'package:flutter_test/flutter_test.dart';

import '../tool/audio_signal_analysis.dart';

void main() {
  Uint8List source() =>
      generatePcmWaveFixture(audioFixtureSpecifications.first);

  test(
    'synthetic markers and silence pass without claiming physical output',
    () {
      final result = analyzeDecodedFixture(source());
      expect(result['passed'], isTrue);
      expect(result['physicalOutputVerified'], isFalse);
      expect(result['capturePoint'], 'hostDecoderPcm');
    },
  );

  test('silent, clipped and wrong-movement PCM fail the signal contract', () {
    final silence = source()..fillRange(44, source().length, 0);
    expect(analyzeDecodedFixture(silence)['passed'], isFalse);
    final clipping = source();
    ByteData.sublistView(clipping).setInt16(5000, 32767, Endian.little);
    expect(analyzeDecodedFixture(clipping)['passed'], isFalse);
    final wrong = generatePcmWaveFixture(audioFixtureSpecifications.last);
    expect(analyzeDecodedFixture(wrong)['passed'], isFalse);
  });

  test('truncated chunks and invalid format are rejected', () {
    final bytes = source();
    expect(
      () => readDecodedWave(bytes.sublist(0, bytes.length - 2)),
      throwsFormatException,
    );
    ByteData.sublistView(bytes).setUint32(40, 0xffffffff, Endian.little);
    expect(() => readDecodedWave(bytes), throwsFormatException);
    final stereo = source();
    ByteData.sublistView(stereo).setUint16(22, 2, Endian.little);
    expect(() => readDecodedWave(stereo), throwsFormatException);
  });

  test(
    'unknown padded chunks are accepted without treating them as samples',
    () {
      final original = source();
      final expanded = Uint8List(original.length + 10);
      expanded.setRange(0, 12, original);
      expanded.setRange(12, 16, 'JUNK'.codeUnits);
      ByteData.sublistView(expanded).setUint32(16, 1, Endian.little);
      expanded[20] = 42;
      expanded.setRange(22, expanded.length, original.sublist(12));
      ByteData.sublistView(expanded)
          .setUint32(4, expanded.length - 8, Endian.little);
      expect(analyzeDecodedFixture(expanded)['passed'], isTrue);
    },
  );

  test('extensible PCM accepts only the PCM subformat and mono layout', () {
    final original = source();
    final expanded = Uint8List(original.length + 24);
    expanded.setRange(0, 36, original);
    final data = ByteData.sublistView(expanded);
    data.setUint32(4, expanded.length - 8, Endian.little);
    data.setUint32(16, 40, Endian.little);
    data.setUint16(20, 0xfffe, Endian.little);
    data.setUint16(36, 22, Endian.little);
    data.setUint16(38, 16, Endian.little);
    data.setUint32(40, 4, Endian.little);
    expanded.setRange(44, 60, [
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
    expanded.setRange(60, expanded.length, original.sublist(36));
    expect(analyzeDecodedFixture(expanded)['passed'], isTrue);
    expanded[44] = 3;
    expect(() => readDecodedWave(expanded), throwsFormatException);
  });
}
