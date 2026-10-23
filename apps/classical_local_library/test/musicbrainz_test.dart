import 'dart:io';

import 'package:classical_local_library/metadata_overrides.dart';
import 'package:classical_local_library/musicbrainz.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  test('query uses effective metadata without exposing a local path', () {
    final metadata = EffectiveFileMetadata(
      values: const {
        MetadataField.composer: 'Ludwig van Beethoven',
        MetadataField.workTitle: 'Symphony No. 5',
        MetadataField.movementTitle: 'Allegro con brio',
      },
      sources: const {
        MetadataField.composer: MetadataValueSource.user,
        MetadataField.workTitle: MetadataValueSource.tag,
        MetadataField.movementTitle: MetadataValueSource.inferred,
      },
    );

    final query = MusicBrainzSearchQuery.fromMetadata(metadata).lucene;

    expect(query, contains('recording:"Allegro con brio"'));
    expect(query, contains('artist:"Ludwig van Beethoven"'));
    expect(query, isNot(contains('/private/music')));
  });

  test(
    'client sends required identity and parses classical relations',
    () async {
      final fixture = await File(
        'test/fixtures/musicbrainz_recording_search.json',
      ).readAsString();
      late http.Request captured;
      final client = HttpMusicBrainzClient(
        contact: 'mailto:test@example.com',
        client: MockClient((request) async {
          captured = request;
          return http.Response(fixture, 200);
        }),
        limiter: RequestIntervalLimiter(minimumInterval: Duration.zero),
      );

      final results = await client.searchRecordings(
        const MusicBrainzSearchQuery(
          recording: 'Allegro con brio',
          artist: 'Beethoven',
        ),
      );

      expect(
        captured.headers['User-Agent'],
        contains('mailto:test@example.com'),
      );
      expect(captured.url.queryParameters['fmt'], 'json');
      expect(results, hasLength(1));
      expect(results.single.score, 98);
      expect(results.single.composer, 'Ludwig van Beethoven');
      expect(results.single.conductor, 'Myung-whun Chung');
      expect(results.single.catalogNumber, 'op. 67');
      expect(results.single.year, 2026);
      expect(results.single.isrcs, ['KRA012600001']);
    },
  );

  test('client maps rate limits and malformed responses', () async {
    final rateLimited = HttpMusicBrainzClient(
      contact: 'test@example.com',
      client: MockClient((_) async => http.Response('', 503)),
      limiter: RequestIntervalLimiter(minimumInterval: Duration.zero),
      maxAttempts: 1,
    );
    final malformed = HttpMusicBrainzClient(
      contact: 'test@example.com',
      client: MockClient((_) async => http.Response('{', 200)),
      limiter: RequestIntervalLimiter(minimumInterval: Duration.zero),
    );

    expect(
      () => rateLimited.searchRecordings(
        const MusicBrainzSearchQuery(recording: 'test'),
      ),
      throwsA(
        isA<MusicBrainzException>().having(
          (error) => error.failure,
          'failure',
          MusicBrainzFailure.rateLimited,
        ),
      ),
    );
    expect(
      () => malformed.searchRecordings(
        const MusicBrainzSearchQuery(recording: 'test'),
      ),
      throwsA(
        isA<MusicBrainzException>().having(
          (error) => error.failure,
          'failure',
          MusicBrainzFailure.invalidResponse,
        ),
      ),
    );
  });

  test(
    'recording detail lookup requests work, artist, release, and ISRC data',
    () async {
      late Uri captured;
      final client = HttpMusicBrainzClient(
        contact: 'test@example.com',
        client: MockClient((request) async {
          captured = request.url;
          return http.Response(
            '''{"id":"recording-id","title":"Allegro","isrcs":["TEST1"],"relations":[{"type":"performance","work":{"id":"work-id","title":"Symphony"}}]}''',
            200,
          );
        }),
        limiter: RequestIntervalLimiter(minimumInterval: Duration.zero),
      );

      final candidate = await client.lookupRecording('recording-id');

      expect(captured.path, endsWith('/recording/recording-id'));
      expect(captured.queryParameters['inc'], contains('work-rels'));
      expect(captured.queryParameters['inc'], contains('artist-rels'));
      expect(captured.queryParameters['inc'], contains('releases'));
      expect(captured.queryParameters['inc'], contains('isrcs'));
      expect(candidate.workId, 'work-id');
      expect(candidate.isrcs, ['TEST1']);
    },
  );

  test('client rejects an empty contact identity', () {
    expect(
      () => HttpMusicBrainzClient(contact: ' '),
      throwsA(isA<MusicBrainzException>()),
    );
  });

  test('client maps timeout and preserves an empty result', () async {
    final timeoutClient = HttpMusicBrainzClient(
      contact: 'test@example.com',
      timeout: const Duration(milliseconds: 1),
      client: MockClient((_) async {
        await Future<void>.delayed(const Duration(milliseconds: 20));
        return http.Response('{"recordings":[]}', 200);
      }),
      limiter: RequestIntervalLimiter(minimumInterval: Duration.zero),
      maxAttempts: 1,
    );
    final emptyClient = HttpMusicBrainzClient(
      contact: 'test@example.com',
      client: MockClient((_) async => http.Response('{"recordings":[]}', 200)),
      limiter: RequestIntervalLimiter(minimumInterval: Duration.zero),
    );

    await expectLater(
      timeoutClient.searchRecordings(
        const MusicBrainzSearchQuery(recording: 'test'),
      ),
      throwsA(
        isA<MusicBrainzException>().having(
          (error) => error.failure,
          'failure',
          MusicBrainzFailure.timeout,
        ),
      ),
    );
    expect(
      await emptyClient.searchRecordings(
        const MusicBrainzSearchQuery(recording: 'test'),
      ),
      isEmpty,
    );
  });

  test('client honors Retry-After before a bounded retry', () async {
    var requests = 0;
    final delays = <Duration>[];
    final client = HttpMusicBrainzClient(
      contact: 'test@example.com',
      client: MockClient((_) async {
        requests += 1;
        if (requests == 1) {
          return http.Response('', 503, headers: {'retry-after': '2'});
        }
        return http.Response('{"recordings":[]}', 200);
      }),
      limiter: RequestIntervalLimiter(minimumInterval: Duration.zero),
      retryDelay: (duration) async => delays.add(duration),
    );

    expect(
      await client.searchRecordings(
        const MusicBrainzSearchQuery(recording: 'test'),
      ),
      isEmpty,
    );
    expect(requests, 2);
    expect(delays, [const Duration(seconds: 2)]);
  });

  test(
    'client parses an HTTP-date Retry-After with an injected clock',
    () async {
      final now = DateTime.utc(2026, 10, 20, 12);
      var requests = 0;
      final delays = <Duration>[];
      final client = HttpMusicBrainzClient(
        contact: 'test@example.com',
        client: MockClient((_) async {
          requests += 1;
          return requests == 1
              ? http.Response(
                  '',
                  503,
                  headers: {
                    'retry-after': HttpDate.format(
                      now.add(const Duration(seconds: 3)),
                    ),
                  },
                )
              : http.Response('{"recordings":[]}', 200);
        }),
        limiter: RequestIntervalLimiter(minimumInterval: Duration.zero),
        retryClock: () => now,
        retryDelay: (duration) async => delays.add(duration),
      );

      await client.searchRecordings(
        const MusicBrainzSearchQuery(recording: 'test'),
      );

      expect(delays, [const Duration(seconds: 3)]);
    },
  );

  test('cache coalesces concurrent requests and expires deterministically', () async {
    var requests = 0;
    var now = DateTime.utc(2026, 10, 20);
    final delegate = HttpMusicBrainzClient(
      contact: 'test@example.com',
      client: MockClient((_) async {
        requests += 1;
        await Future<void>.delayed(Duration.zero);
        return http.Response(
          '{"recordings":[{"id":"recording-id","title":"Allegro","score":90}]}',
          200,
        );
      }),
      limiter: RequestIntervalLimiter(minimumInterval: Duration.zero),
    );
    final client = CachingMusicBrainzClient(
      delegate: delegate,
      store: MemoryMusicBrainzCacheStore(),
      clock: () => now,
      searchTtl: const Duration(hours: 1),
    );
    const query = MusicBrainzSearchQuery(recording: 'Allegro');

    final concurrent = await Future.wait([
      client.searchRecordings(query),
      client.searchRecordings(query),
    ]);
    expect(concurrent.first.single.recordingId, 'recording-id');
    expect(requests, 1);
    expect(await client.searchRecordings(query), hasLength(1));
    expect(requests, 1);

    now = now.add(const Duration(hours: 2));
    expect(await client.searchRecordings(query), hasLength(1));
    expect(requests, 2);
  });

  test('negative search responses use the shorter cache TTL', () async {
    var requests = 0;
    var now = DateTime.utc(2026, 10, 20);
    final client = CachingMusicBrainzClient(
      delegate: HttpMusicBrainzClient(
        contact: 'test@example.com',
        client: MockClient((_) async {
          requests += 1;
          return http.Response('{"recordings":[]}', 200);
        }),
        limiter: RequestIntervalLimiter(minimumInterval: Duration.zero),
      ),
      store: MemoryMusicBrainzCacheStore(),
      clock: () => now,
      negativeTtl: const Duration(minutes: 5),
    );
    const query = MusicBrainzSearchQuery(recording: 'unknown');

    expect(await client.searchRecordings(query), isEmpty);
    expect(await client.searchRecordings(query), isEmpty);
    expect(requests, 1);
    now = now.add(const Duration(minutes: 6));
    expect(await client.searchRecordings(query), isEmpty);
    expect(requests, 2);
  });

  test('malformed responses are not cached as successful data', () async {
    var requests = 0;
    final client = CachingMusicBrainzClient(
      delegate: HttpMusicBrainzClient(
        contact: 'test@example.com',
        client: MockClient((_) async {
          requests += 1;
          return requests == 1
              ? http.Response('{', 200)
              : http.Response('{"recordings":[]}', 200);
        }),
        limiter: RequestIntervalLimiter(minimumInterval: Duration.zero),
      ),
      store: MemoryMusicBrainzCacheStore(),
    );
    const query = MusicBrainzSearchQuery(recording: 'test');

    await expectLater(
      client.searchRecordings(query),
      throwsA(isA<MusicBrainzException>()),
    );
    expect(await client.searchRecordings(query), isEmpty);
    expect(requests, 2);
  });
}
