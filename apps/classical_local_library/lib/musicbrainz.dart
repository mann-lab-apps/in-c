import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'metadata_overrides.dart';

class MusicBrainzSearchQuery {
  const MusicBrainzSearchQuery({this.recording, this.artist, this.release});

  final String? recording;
  final String? artist;
  final String? release;

  factory MusicBrainzSearchQuery.fromMetadata(EffectiveFileMetadata metadata) {
    return MusicBrainzSearchQuery(
      recording:
          metadata.text(MetadataField.movementTitle) ??
          metadata.text(MetadataField.workTitle),
      artist:
          metadata.text(MetadataField.performer) ??
          metadata.text(MetadataField.composer),
      release: metadata.text(MetadataField.workTitle),
    );
  }

  String get lucene {
    final clauses = <String>[
      if (_clean(recording) case final value?) 'recording:"${_escape(value)}"',
      if (_clean(artist) case final value?) 'artist:"${_escape(value)}"',
      if (_clean(release) case final value?) 'release:"${_escape(value)}"',
    ];
    if (clauses.isEmpty) {
      throw const MusicBrainzException(
        MusicBrainzFailure.invalidQuery,
        'MusicBrainz 검색에 사용할 메타데이터가 없습니다.',
      );
    }
    return clauses.join(' AND ');
  }

  String get cacheKey =>
      'search:v1:${[recording, artist, release].map(_cachePart).join('|')}';

  static String? _clean(String? value) {
    final cleaned = value?.trim();
    return cleaned == null || cleaned.isEmpty ? null : cleaned;
  }

  static String _escape(String value) =>
      value.replaceAll(r'\', r'\\').replaceAll('"', r'\"');

  static String _cachePart(String? value) =>
      (value ?? '').trim().toLowerCase().replaceAll(RegExp(r'\s+'), ' ');
}

class MusicBrainzCandidate {
  const MusicBrainzCandidate({
    required this.recordingId,
    required this.title,
    required this.score,
    this.workId,
    this.workTitle,
    this.releaseId,
    this.releaseTitle,
    this.artist,
    this.composer,
    this.conductor,
    this.ensemble,
    this.catalogNumber,
    this.year,
    this.isrcs = const [],
  });

  final String recordingId;
  final String title;
  final int score;
  final String? workId;
  final String? workTitle;
  final String? releaseId;
  final String? releaseTitle;
  final String? artist;
  final String? composer;
  final String? conductor;
  final String? ensemble;
  final String? catalogNumber;
  final int? year;
  final List<String> isrcs;

  Map<MetadataField, Object> get availableValues => {
    MetadataField.composer: ?composer,
    MetadataField.workTitle: ?workTitle,
    MetadataField.catalogNumber: ?catalogNumber,
    MetadataField.movementTitle: title,
    MetadataField.performer: ?artist,
    MetadataField.conductor: ?conductor,
    MetadataField.ensemble: ?ensemble,
    MetadataField.year: ?year,
  };

  String get summary => [
    title,
    ?artist,
    ?releaseTitle,
    ?year?.toString(),
    '일치도 $score%',
  ].join(' · ');

  Map<String, Object?> toJson() => {
    'recordingId': recordingId,
    'title': title,
    'score': score,
    'workId': workId,
    'workTitle': workTitle,
    'releaseId': releaseId,
    'releaseTitle': releaseTitle,
    'artist': artist,
    'composer': composer,
    'conductor': conductor,
    'ensemble': ensemble,
    'catalogNumber': catalogNumber,
    'year': year,
    'isrcs': isrcs,
  };

  factory MusicBrainzCandidate.fromJson(Map<String, Object?> json) {
    return MusicBrainzCandidate(
      recordingId: json['recordingId']! as String,
      title: json['title']! as String,
      score: (json['score']! as num).round(),
      workId: json['workId'] as String?,
      workTitle: json['workTitle'] as String?,
      releaseId: json['releaseId'] as String?,
      releaseTitle: json['releaseTitle'] as String?,
      artist: json['artist'] as String?,
      composer: json['composer'] as String?,
      conductor: json['conductor'] as String?,
      ensemble: json['ensemble'] as String?,
      catalogNumber: json['catalogNumber'] as String?,
      year: (json['year'] as num?)?.round(),
      isrcs: (json['isrcs'] as List<Object?>? ?? const [])
          .whereType<String>()
          .toList(),
    );
  }
}

enum MusicBrainzFailure {
  invalidConfiguration,
  invalidQuery,
  rateLimited,
  network,
  timeout,
  server,
  invalidResponse,
}

class MusicBrainzException implements Exception {
  const MusicBrainzException(this.failure, this.userMessage, {this.statusCode});

  final MusicBrainzFailure failure;
  final String userMessage;
  final int? statusCode;

  @override
  String toString() => userMessage;
}

abstract interface class MusicBrainzClient {
  Future<List<MusicBrainzCandidate>> searchRecordings(
    MusicBrainzSearchQuery query,
  );
}

abstract interface class MusicBrainzDetailClient {
  Future<MusicBrainzCandidate> lookupRecording(String recordingId);
}

class MusicBrainzCacheEntry {
  const MusicBrainzCacheEntry({
    required this.key,
    required this.payloadJson,
    required this.storedAtMillis,
    required this.expiresAtMillis,
    required this.isNegative,
  });

  final String key;
  final String payloadJson;
  final int storedAtMillis;
  final int expiresAtMillis;
  final bool isNegative;
}

abstract interface class MusicBrainzCacheStore {
  Future<MusicBrainzCacheEntry?> read(String key);
  Future<void> write(MusicBrainzCacheEntry entry);
  Future<void> delete(String key);
  Future<int> deleteExpired(int nowMillis);
}

class DeferredMusicBrainzCacheStore implements MusicBrainzCacheStore {
  DeferredMusicBrainzCacheStore(this.loader);

  final Future<MusicBrainzCacheStore> Function() loader;
  Future<MusicBrainzCacheStore>? _loaded;

  Future<MusicBrainzCacheStore> get _store => _loaded ??= loader();

  @override
  Future<MusicBrainzCacheEntry?> read(String key) async =>
      (await _store).read(key);

  @override
  Future<void> write(MusicBrainzCacheEntry entry) async =>
      (await _store).write(entry);

  @override
  Future<void> delete(String key) async => (await _store).delete(key);

  @override
  Future<int> deleteExpired(int nowMillis) async =>
      (await _store).deleteExpired(nowMillis);
}

class MemoryMusicBrainzCacheStore implements MusicBrainzCacheStore {
  final Map<String, MusicBrainzCacheEntry> _entries = {};

  @override
  Future<MusicBrainzCacheEntry?> read(String key) async => _entries[key];

  @override
  Future<void> write(MusicBrainzCacheEntry entry) async {
    _entries[entry.key] = entry;
  }

  @override
  Future<void> delete(String key) async {
    _entries.remove(key);
  }

  @override
  Future<int> deleteExpired(int nowMillis) async {
    final keys = [
      for (final entry in _entries.entries)
        if (entry.value.expiresAtMillis <= nowMillis) entry.key,
    ];
    for (final key in keys) {
      _entries.remove(key);
    }
    return keys.length;
  }
}

class CachingMusicBrainzClient
    implements MusicBrainzClient, MusicBrainzDetailClient {
  CachingMusicBrainzClient({
    required this.delegate,
    required this.store,
    this.clock = DateTime.now,
    this.searchTtl = const Duration(days: 30),
    this.detailTtl = const Duration(days: 90),
    this.negativeTtl = const Duration(days: 1),
  });

  final MusicBrainzClient delegate;
  final MusicBrainzCacheStore store;
  final DateTime Function() clock;
  final Duration searchTtl;
  final Duration detailTtl;
  final Duration negativeTtl;
  final Map<String, Future<Object?>> _inFlight = {};
  Future<void>? _cleanup;

  @override
  Future<List<MusicBrainzCandidate>> searchRecordings(
    MusicBrainzSearchQuery query,
  ) {
    final key = query.cacheKey;
    return _coalesce<List<MusicBrainzCandidate>>(key, () async {
      final cached = await _read(key);
      if (cached != null) {
        try {
          final items = jsonDecode(cached.payloadJson) as List<Object?>;
          return [
            for (final item in items)
              MusicBrainzCandidate.fromJson(item! as Map<String, Object?>),
          ];
        } on FormatException {
          await store.delete(key);
        } on TypeError {
          await store.delete(key);
        }
      }
      final candidates = await delegate.searchRecordings(query);
      await _write(
        key,
        jsonEncode([for (final candidate in candidates) candidate.toJson()]),
        candidates.isEmpty ? negativeTtl : searchTtl,
        isNegative: candidates.isEmpty,
      );
      return candidates;
    });
  }

  @override
  Future<MusicBrainzCandidate> lookupRecording(String recordingId) {
    final key = 'recording:v1:${recordingId.trim().toLowerCase()}';
    return _coalesce<MusicBrainzCandidate>(key, () async {
      final cached = await _read(key);
      if (cached != null) {
        try {
          return MusicBrainzCandidate.fromJson(
            jsonDecode(cached.payloadJson) as Map<String, Object?>,
          );
        } on FormatException {
          await store.delete(key);
        } on TypeError {
          await store.delete(key);
        }
      }
      final detailDelegate = delegate;
      if (detailDelegate is! MusicBrainzDetailClient) {
        throw const MusicBrainzException(
          MusicBrainzFailure.invalidConfiguration,
          'MusicBrainz 상세 조회를 지원하지 않습니다.',
        );
      }
      final candidate = await (detailDelegate as MusicBrainzDetailClient)
          .lookupRecording(recordingId);
      await _write(key, jsonEncode(candidate.toJson()), detailTtl);
      return candidate;
    });
  }

  Future<MusicBrainzCacheEntry?> _read(String key) async {
    await (_cleanup ??= store
        .deleteExpired(clock().millisecondsSinceEpoch)
        .then<void>((_) {}));
    final cached = await store.read(key);
    if (cached == null) return null;
    if (cached.expiresAtMillis <= clock().millisecondsSinceEpoch) {
      await store.delete(key);
      return null;
    }
    return cached;
  }

  Future<void> _write(
    String key,
    String payload,
    Duration ttl, {
    bool isNegative = false,
  }) {
    final storedAt = clock().millisecondsSinceEpoch;
    return store.write(
      MusicBrainzCacheEntry(
        key: key,
        payloadJson: payload,
        storedAtMillis: storedAt,
        expiresAtMillis: storedAt + ttl.inMilliseconds,
        isNegative: isNegative,
      ),
    );
  }

  Future<T> _coalesce<T>(String key, Future<T> Function() operation) {
    final existing = _inFlight[key];
    if (existing != null) return existing.then((value) => value as T);
    final future = operation();
    _inFlight[key] = future;
    return future.whenComplete(() => _inFlight.remove(key));
  }
}

class RequestIntervalLimiter {
  RequestIntervalLimiter({
    required this.minimumInterval,
    this.clock = DateTime.now,
    this.delay = Future.delayed,
  });

  final Duration minimumInterval;
  final DateTime Function() clock;
  final Future<void> Function(Duration) delay;
  Future<void> _tail = Future.value();
  DateTime? _lastRequestAt;

  Future<void> waitForTurn() {
    final completer = Completer<void>();
    final previous = _tail;
    _tail = completer.future;
    return () async {
      await previous;
      try {
        final last = _lastRequestAt;
        if (last != null) {
          final remaining = minimumInterval - clock().difference(last);
          if (remaining > Duration.zero) await delay(remaining);
        }
        _lastRequestAt = clock();
      } finally {
        completer.complete();
      }
    }();
  }
}

class HttpMusicBrainzClient
    implements MusicBrainzClient, MusicBrainzDetailClient {
  HttpMusicBrainzClient({
    required String contact,
    http.Client? client,
    Uri? baseUri,
    RequestIntervalLimiter? limiter,
    this.timeout = const Duration(seconds: 12),
    this.maxAttempts = 3,
    this.initialBackoff = const Duration(milliseconds: 500),
    this.retryDelay = Future.delayed,
    this.retryClock = DateTime.now,
  }) : contact = contact.trim(),
       client = client ?? http.Client(),
       baseUri = baseUri ?? Uri.https('musicbrainz.org', '/ws/2/'),
       limiter =
           limiter ??
           RequestIntervalLimiter(minimumInterval: const Duration(seconds: 1)) {
    if (this.contact.isEmpty) {
      throw const MusicBrainzException(
        MusicBrainzFailure.invalidConfiguration,
        'MusicBrainz 연락처 설정이 필요합니다.',
      );
    }
    if (maxAttempts < 1) {
      throw ArgumentError.value(maxAttempts, 'maxAttempts', 'must be positive');
    }
  }

  final String contact;
  final http.Client client;
  final Uri baseUri;
  final RequestIntervalLimiter limiter;
  final Duration timeout;
  final int maxAttempts;
  final Duration initialBackoff;
  final Future<void> Function(Duration) retryDelay;
  final DateTime Function() retryClock;

  @override
  Future<List<MusicBrainzCandidate>> searchRecordings(
    MusicBrainzSearchQuery query,
  ) async {
    final uri = baseUri
        .resolve('recording')
        .replace(
          queryParameters: {'query': query.lucene, 'fmt': 'json', 'limit': '8'},
        );
    final json = await _getJson(uri);
    try {
      final recordings = json['recordings'] as List<Object?>? ?? const [];
      return [
        for (final item in recordings)
          _candidate(item! as Map<String, Object?>),
      ];
    } on TypeError catch (_) {
      throw const MusicBrainzException(
        MusicBrainzFailure.invalidResponse,
        'MusicBrainz 응답 형식을 읽지 못했습니다.',
      );
    }
  }

  @override
  Future<MusicBrainzCandidate> lookupRecording(String recordingId) async {
    final uri = baseUri
        .resolve('recording/$recordingId')
        .replace(
          queryParameters: {
            'fmt': 'json',
            'inc': 'work-rels+artist-rels+releases+isrcs',
          },
        );
    final json = await _getJson(uri);
    try {
      return _candidate(json);
    } on TypeError catch (_) {
      throw const MusicBrainzException(
        MusicBrainzFailure.invalidResponse,
        'MusicBrainz 상세 응답 형식을 읽지 못했습니다.',
      );
    }
  }

  Future<Map<String, Object?>> _getJson(Uri uri) async {
    MusicBrainzException? lastFailure;
    for (var attempt = 0; attempt < maxAttempts; attempt += 1) {
      await limiter.waitForTurn();
      http.Response? response;
      try {
        response = await client
            .get(
              uri,
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'ClassicalLocalLibrary/1.0 ($contact)',
              },
            )
            .timeout(timeout);
      } on TimeoutException {
        lastFailure = const MusicBrainzException(
          MusicBrainzFailure.timeout,
          'MusicBrainz 응답 시간이 초과되었습니다.',
        );
      } on http.ClientException {
        lastFailure = const MusicBrainzException(
          MusicBrainzFailure.network,
          'MusicBrainz에 연결하지 못했습니다.',
        );
      }
      if (response != null) {
        final status = response.statusCode;
        if (status >= 200 && status < 300) {
          try {
            return jsonDecode(response.body) as Map<String, Object?>;
          } on FormatException catch (_) {
            throw const MusicBrainzException(
              MusicBrainzFailure.invalidResponse,
              'MusicBrainz 응답 형식을 읽지 못했습니다.',
            );
          } on TypeError catch (_) {
            throw const MusicBrainzException(
              MusicBrainzFailure.invalidResponse,
              'MusicBrainz 응답 형식을 읽지 못했습니다.',
            );
          }
        }
        if (status == 429 || status == 503) {
          lastFailure = MusicBrainzException(
            MusicBrainzFailure.rateLimited,
            'MusicBrainz 요청이 많습니다. 잠시 뒤 다시 시도하세요.',
            statusCode: status,
          );
        } else if (status >= 500) {
          lastFailure = MusicBrainzException(
            MusicBrainzFailure.server,
            'MusicBrainz가 요청을 처리하지 못했습니다.',
            statusCode: status,
          );
        } else {
          throw MusicBrainzException(
            MusicBrainzFailure.server,
            'MusicBrainz가 요청을 처리하지 못했습니다.',
            statusCode: status,
          );
        }
      }
      if (attempt + 1 >= maxAttempts) throw lastFailure!;
      await retryDelay(
        _retryAfter(response) ?? initialBackoff * (1 << attempt),
      );
    }
    throw lastFailure!;
  }

  Duration? _retryAfter(http.Response? response) {
    final value = response?.headers['retry-after'];
    final seconds = value == null ? null : int.tryParse(value.trim());
    if (seconds != null) return Duration(seconds: seconds);
    if (value == null) return null;
    try {
      final remaining = HttpDate.parse(value).difference(retryClock().toUtc());
      return remaining.isNegative ? Duration.zero : remaining;
    } on FormatException {
      return null;
    }
  }

  MusicBrainzCandidate _candidate(Map<String, Object?> json) {
    final releases = json['releases'] as List<Object?>? ?? const [];
    final release = releases.isEmpty
        ? null
        : releases.first! as Map<String, Object?>;
    final relations = json['relations'] as List<Object?>? ?? const [];
    Map<String, Object?>? work;
    String? composer;
    String? conductor;
    String? ensemble;
    for (final rawRelation in relations) {
      final relation = rawRelation! as Map<String, Object?>;
      final type = relation['type'] as String?;
      if (relation['work'] case final Map<String, Object?> value) work = value;
      final artist = relation['artist'] as Map<String, Object?>?;
      final name = artist?['name'] as String?;
      if (type == 'composer') composer = name;
      if (type == 'conductor') conductor = name;
      if (type == 'performing orchestra' || type == 'orchestra') {
        ensemble = name;
      }
    }
    final artistCredit = json['artist-credit'] as List<Object?>? ?? const [];
    final artist = artistCredit
        .whereType<Map<String, Object?>>()
        .map(
          (credit) =>
              credit['name'] as String? ??
              (credit['artist'] as Map<String, Object?>?)?['name'] as String?,
        )
        .whereType<String>()
        .join(', ');
    final workAttributes = work?['attributes'] as List<Object?>? ?? const [];
    String? catalogNumber;
    for (final rawAttribute in workAttributes) {
      if (rawAttribute case final Map<String, Object?> attribute) {
        final type = (attribute['type'] as String? ?? '').toLowerCase();
        final value = attribute['value'] as String?;
        if (value != null &&
            (type.contains('catalog') || type.contains('catalogue'))) {
          catalogNumber = value;
          break;
        }
      }
    }
    final date = release?['date'] as String?;
    return MusicBrainzCandidate(
      recordingId: json['id']! as String,
      title: json['title']! as String,
      score: (json['score'] as num?)?.round() ?? 0,
      workId: work?['id'] as String?,
      workTitle: work?['title'] as String?,
      releaseId: release?['id'] as String?,
      releaseTitle: release?['title'] as String?,
      artist: artist.isEmpty ? null : artist,
      composer: composer,
      conductor: conductor,
      ensemble: ensemble,
      catalogNumber: catalogNumber,
      year: date == null || date.length < 4
          ? null
          : int.tryParse(date.substring(0, 4)),
      isrcs: (json['isrcs'] as List<Object?>? ?? const [])
          .whereType<String>()
          .toList(),
    );
  }
}
