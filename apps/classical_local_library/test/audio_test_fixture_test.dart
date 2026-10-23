import 'dart:io';
import 'dart:typed_data';

import 'package:classical_local_library/audio_test_fixture.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'PCM fixtures match the deterministic generator and marker contract',
    () {
      for (final specification in audioFixtureSpecifications) {
        final generated = generatePcmWaveFixture(specification);
        final committed = File('assets/audio_test/${specification.fileName}')
            .readAsBytesSync();

        expect(committed, generated);
        expect(
          () => validatePcmWaveFixture(committed, specification),
          returnsNormally,
        );
        final wave = PcmWaveFixture.parse(committed);
        expect(wave.sampleRate, audioFixtureSampleRate);
        expect(wave.duration, audioFixtureDuration);
      }
    },
  );

  test('PCM fixture validator rejects invalid headers and marker data', () {
    final specification = audioFixtureSpecifications.first;
    final invalidHeader = Uint8List.fromList(
      generatePcmWaveFixture(specification),
    )..[0] = 0;
    expect(
      () => validatePcmWaveFixture(invalidHeader, specification),
      throwsFormatException,
    );

    final missingMarker = Uint8List.fromList(
      generatePcmWaveFixture(specification),
    );
    final markerStart = 80 * audioFixtureSampleRate ~/ 1000;
    for (
      var frame = markerStart;
      frame < markerStart + audioFixtureSampleRate ~/ 10;
      frame += 1
    ) {
      missingMarker[44 + frame * 2] = 0;
      missingMarker[45 + frame * 2] = 0;
    }
    expect(
      () => validatePcmWaveFixture(missingMarker, specification),
      throwsFormatException,
    );
  });
}
