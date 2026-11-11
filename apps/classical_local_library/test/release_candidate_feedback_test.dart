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

  test(
    'schema1 stays readable and new unanswered scenarios never become passed',
    () {
      final legacy = report.toJson()..['schemaVersion'] = 1;
      legacy.remove('musicActions');
      legacy.remove('automaticChecks');
      final decoded = ReleaseCandidateFeedbackReport.fromJson(legacy);
      expect(decoded.schemaVersion, 1);
      expect(decoded.musicActions, isEmpty);
      expect(decoded.hasUnverifiedObservations, isTrue);
      expect(codec.decode(codec.encode(decoded)).toJson(), legacy);
    },
  );

  test('automation and physical observations remain independent', () {
    final json = report.toJson();
    (json['automaticChecks'] as Map<String, String>)['nativeTransport'] =
        'passed';
    (json['musicActions'] as Map<String, String>)['queueEditing'] = 'issue';
    json['listening'] = 'notChecked';
    final decoded = ReleaseCandidateFeedbackReport.fromJson(json);
    expect(
      decoded.musicActions[ReleaseMusicScenario.queueEditing],
      ReleaseFeedbackOutcome.issue,
    );
    expect(decoded.listening, ReleaseFeedbackListening.notChecked);
    expect(decoded.hasUnverifiedObservations, isTrue);
    expect(decoded.regressionCandidates, ['music.queueEditing']);
    expect(decoded.blocksRelease, isFalse);
    expect(codec.decode(codec.encode(decoded)).toJson(), json);
  });

  test('strict nested contracts reject unknown, omitted, private and malformed data', () {
    for (final field in ['musicActions', 'automaticChecks']) {
      for (final corrupt in [
        {'fileName': 'private.mp3'},
        <String, String>{},
        ['passed'],
        null,
      ]) {
        expect(
          () => ReleaseCandidateFeedbackReport.fromJson(
            report.toJson()..[field] = corrupt,
          ),
          throwsFormatException,
        );
      }
    }
    final invalidOutcome = report.toJson();
    (invalidOutcome['musicActions'] as Map<String, String>)['favorites'] =
        '/Users/private';
    expect(
      () => ReleaseCandidateFeedbackReport.fromJson(invalidOutcome),
      throwsFormatException,
    );
    for (final version in [0, 3, 2.0, '2', null]) {
      expect(
        () => ReleaseCandidateFeedbackReport.fromJson(
          report.toJson()..['schemaVersion'] = version,
        ),
        throwsFormatException,
      );
    }
    expect(() => codec.decode(' ' * 16385), throwsFormatException);
  });

  test('regression candidates use only fixed scenario identifiers', () {
    final json = report.toJson();
    (json['musicActions'] as Map<String, String>).updateAll((_, _) => 'issue');
    (json['automaticChecks'] as Map<String, String>).updateAll(
      (_, _) => 'issue',
    );
    final decoded = ReleaseCandidateFeedbackReport.fromJson(json);
    expect(
      decoded.regressionCandidates.length,
      ReleaseMusicScenario.values.length + ReleaseAutomaticCheck.values.length,
    );
    expect(
      decoded.regressionCandidates.every(
        (s) => RegExp(r'^(music|automatic)\.[a-zA-Z]+$').hasMatch(s),
      ),
      isTrue,
    );
    expect(() => decoded.musicActions.clear(), throwsUnsupportedError);
  });
}
