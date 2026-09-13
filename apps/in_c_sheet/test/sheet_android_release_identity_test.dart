import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Android configuration and activity retain Clef release identity', () {
    final gradle = File('android/app/build.gradle.kts').readAsStringSync();
    final activity = File(
      'android/app/src/main/kotlin/com/mannlab/clef/MainActivity.kt',
    ).readAsStringSync();
    for (final field in ['namespace', 'applicationId']) {
      expect(
        RegExp('$field = "([^"]+)"').firstMatch(gradle)?.group(1),
        'com.mannlab.clef',
        reason: '$field must update the existing Clef app, not in C',
      );
    }
    expect(
      RegExp(r'^package (\S+)', multiLine: true).firstMatch(activity)?.group(1),
      'com.mannlab.clef',
    );
  });

  test('Clef release has no debug signing fallback', () {
    final gradle = File('android/app/build.gradle.kts').readAsStringSync();
    expect(gradle, isNot(contains('signingConfigs.getByName("debug")')));
    expect(gradle, contains('verifyClefReleaseSigning'));
    expect(gradle, contains('preReleaseBuild'));
  });
}
