import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Android runner wires linked audio inspection and playback', () {
    final activity = File(
      'android/app/src/main/kotlin/com/mannlab/clef/MainActivity.kt',
    ).readAsStringSync();

    expect(activity, contains('clef/audio_player'));
    expect(activity, contains('"inspect" ->'));
    expect(activity, contains('MediaMetadataRetriever.METADATA_KEY_DURATION'));
    expect(activity, contains('"play" ->'));
    expect(activity, contains('"stop" ->'));
  });
}
