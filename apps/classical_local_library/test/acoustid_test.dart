import 'dart:convert';
import 'dart:io';

import 'package:classical_local_library/acoustid.dart';
import 'package:classical_local_library/musicbrainz.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  test('unavailable fingerprint boundary fails without invoking a binary', () {
    expect(
      const UnavailableAudioFingerprintService().capability.isAvailable,
      isFalse,
    );
    expect(
      () => const UnavailableAudioFingerprintService().fingerprint(
        '/private/audio.flac',
      ),
      throwsA(
        isA<FingerprintException>().having(
          (error) => error.failure,
          'failure',
          FingerprintFailure.unavailable,
        ),
      ),
    );
  });

  test('lookup only sends fingerprint data and parses recording ids', () async {
    final fixture = await File('test/fixtures/acoustid_lookup.json')
        .readAsString();
    late http.Request captured;
    final client = HttpAcoustIdClient(
      clientKey: 'test-client-key',
      client: MockClient((request) async {
        captured = request;
        return http.Response(fixture, 200);
      }),
      limiter: RequestIntervalLimiter(minimumInterval: Duration.zero),
    );

    final matches = await client.lookup(
      const AudioFingerprint(value: 'AQAA-test', durationSeconds: 321),
    );

    final body = utf8.decode(gzip.decode(captured.bodyBytes));
    final parameters = Uri(query: body).queryParameters;
    expect(captured.method, 'POST');
    expect(captured.url.query, isEmpty);
    expect(captured.headers['Content-Encoding'], 'gzip');
    expect(parameters['client'], 'test-client-key');
    expect(parameters['duration'], '321');
    expect(parameters.values.join(), isNot(contains('/private')));
    expect(matches.single.score, 0.97);
    expect(matches.single.recordingIds, hasLength(2));
  });

  test('lookup maps API rate limiting', () async {
    final client = HttpAcoustIdClient(
      clientKey: 'test-client-key',
      client: MockClient((_) async => http.Response('', 429)),
      limiter: RequestIntervalLimiter(minimumInterval: Duration.zero),
    );

    expect(
      () => client.lookup(
        const AudioFingerprint(value: 'fingerprint', durationSeconds: 1),
      ),
      throwsA(
        isA<AcoustIdException>().having(
          (error) => error.failure,
          'failure',
          AcoustIdFailure.rateLimited,
        ),
      ),
    );
  });

  test('lookup validates the application key and maps timeouts', () async {
    expect(
      () => HttpAcoustIdClient(clientKey: ' '),
      throwsA(isA<AcoustIdException>()),
    );
    final client = HttpAcoustIdClient(
      clientKey: 'test-client-key',
      timeout: const Duration(milliseconds: 1),
      client: MockClient((_) async {
        await Future<void>.delayed(const Duration(milliseconds: 20));
        return http.Response('{"status":"ok","results":[]}', 200);
      }),
      limiter: RequestIntervalLimiter(minimumInterval: Duration.zero),
    );

    await expectLater(
      client.lookup(
        const AudioFingerprint(value: 'fingerprint', durationSeconds: 1),
      ),
      throwsA(
        isA<AcoustIdException>().having(
          (error) => error.failure,
          'failure',
          AcoustIdFailure.timeout,
        ),
      ),
    );
  });
}
