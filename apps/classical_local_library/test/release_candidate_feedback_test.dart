import 'package:classical_local_library/release_candidate_feedback.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const codec = ReleaseCandidateFeedbackCodec();
  const report = ReleaseCandidateFeedbackReport(
    appVersion: '0.1.0',
    buildNumber: 1,
    platform: ReleaseFeedbackPlatform.ios,
    deviceClass: ReleaseFeedbackDeviceClass.phone,
    osMajor: 26,
    provider: ReleaseFeedbackProvider.cloudDrive,
    fixture: ReleaseFeedbackFixture.movement1Aac,
    format: ReleaseFeedbackFormat.aac,
    voiceOver: ReleaseFeedbackOutcome.passed,
    dynamicType: ReleaseFeedbackOutcome.passed,
    importOutcome: ReleaseFeedbackOutcome.passed,
    playbackOutcome: ReleaseFeedbackOutcome.passed,
    relaunchOutcome: ReleaseFeedbackOutcome.passed,
    routes: [ReleaseFeedbackRoute.speaker],
    interruptionOutcome: ReleaseFeedbackOutcome.passed,
    listening: ReleaseFeedbackListening.heard,
    reproducibility: ReleaseFeedbackReproducibility.notReproduced,
    severity: ReleaseFeedbackSeverity.none,
  );

  test('path-free release candidate feedback round-trips', () {
    final encoded = codec.encode(report);
    final decoded = codec.decode(encoded);

    expect(decoded.appVersion, '0.1.0');
    expect(decoded.routes, [ReleaseFeedbackRoute.speaker]);
    expect(decoded.blocksRelease, isFalse);
    expect(encoded, isNot(contains('path')));
    expect(encoded, isNot(contains('fileName')));
  });

  test('P0 and P1 feedback block release', () {
    for (final severity in [
      ReleaseFeedbackSeverity.p0,
      ReleaseFeedbackSeverity.p1,
    ]) {
      final json = report.toJson()..['severity'] = severity.name;
      expect(
        ReleaseCandidateFeedbackReport.fromJson(json).blocksRelease,
        isTrue,
      );
    }
  });

  test('private values and unexpected fields are rejected', () {
    expect(
      () => codec.decode(
        codec
            .encode(report)
            .replaceFirst(
              '"fixture": "movement1Aac"',
              '"fixture": "/Users/person/private.m4a"',
            ),
      ),
      throwsFormatException,
    );
    final json = report.toJson()..['deviceId'] = 'private';
    expect(
      () => ReleaseCandidateFeedbackReport.fromJson(json),
      throwsFormatException,
    );
  });

  test('routes reject duplicates and contradictory notChecked', () {
    final duplicate = report.toJson()..['routes'] = ['speaker', 'speaker'];
    final contradictory = report.toJson()
      ..['routes'] = ['notChecked', 'speaker'];

    expect(
      () => ReleaseCandidateFeedbackReport.fromJson(duplicate),
      throwsFormatException,
    );
    expect(
      () => ReleaseCandidateFeedbackReport.fromJson(contradictory),
      throwsFormatException,
    );
  });
}
