import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'musicbrainz.dart';

class AudioFingerprint {
  const AudioFingerprint({required this.value, required this.durationSeconds});

  final String value;
  final int durationSeconds;
}

enum FingerprintFailure { unavailable, unsupported, readFailed }

class FingerprintException implements Exception {
  const FingerprintException(this.failure, this.userMessage);

  final FingerprintFailure failure;
  final String userMessage;

  @override
  String toString() => userMessage;
}

abstract interface class AudioFingerprintService {
  FingerprintCapability get capability;
  Future<AudioFingerprint> fingerprint(String localPath);
}

enum FingerprintCapabilityStatus { available, unavailable }

class FingerprintCapability {
  const FingerprintCapability({
    required this.status,
    required this.userMessage,
    this.implementation,
  });

  final FingerprintCapabilityStatus status;
  final String userMessage;
  final String? implementation;

  bool get isAvailable => status == FingerprintCapabilityStatus.available;
}

class UnavailableAudioFingerprintService implements AudioFingerprintService {
  const UnavailableAudioFingerprintService();

  @override
  FingerprintCapability get capability => const FingerprintCapability(
    status: FingerprintCapabilityStatus.unavailable,
    userMessage: '모바일 음원 디코딩과 Chromaprint 배포 방식이 아직 검증되지 않았습니다.',
  );

  @override
  Future<AudioFingerprint> fingerprint(String localPath) {
    throw const FingerprintException(
      FingerprintFailure.unavailable,
      '검증된 Chromaprint 어댑터가 설치되지 않아 음원 지문을 만들 수 없습니다.',
    );
  }
}

class AcoustIdMatch {
  const AcoustIdMatch({
    required this.id,
    required this.score,
    this.recordingIds = const [],
  });

  final String id;
  final double score;
  final List<String> recordingIds;
}

enum AcoustIdFailure {
  invalidConfiguration,
  rateLimited,
  network,
  timeout,
  server,
  invalidResponse,
}

class AcoustIdException implements Exception {
  const AcoustIdException(this.failure, this.userMessage, {this.statusCode});

  final AcoustIdFailure failure;
  final String userMessage;
  final int? statusCode;

  @override
  String toString() => userMessage;
}

abstract interface class AcoustIdClient {
  Future<List<AcoustIdMatch>> lookup(AudioFingerprint fingerprint);
}

class HttpAcoustIdClient implements AcoustIdClient {
  HttpAcoustIdClient({
    required String clientKey,
    http.Client? client,
    Uri? endpoint,
    RequestIntervalLimiter? limiter,
    this.timeout = const Duration(seconds: 12),
  }) : clientKey = clientKey.trim(),
       client = client ?? http.Client(),
       endpoint = endpoint ?? Uri.https('api.acoustid.org', '/v2/lookup'),
       limiter =
           limiter ??
           RequestIntervalLimiter(
             minimumInterval: const Duration(milliseconds: 334),
           ) {
    if (this.clientKey.isEmpty) {
      throw const AcoustIdException(
        AcoustIdFailure.invalidConfiguration,
        'AcoustID 애플리케이션 키가 필요합니다.',
      );
    }
  }

  final String clientKey;
  final http.Client client;
  final Uri endpoint;
  final RequestIntervalLimiter limiter;
  final Duration timeout;

  @override
  Future<List<AcoustIdMatch>> lookup(AudioFingerprint fingerprint) async {
    await limiter.waitForTurn();
    final formBody = Uri(
      queryParameters: {
        'client': clientKey,
        'duration': '${fingerprint.durationSeconds}',
        'fingerprint': fingerprint.value,
        'meta': 'recordings+releasegroups+compress',
        'format': 'json',
      },
    ).query;
    late http.Response response;
    try {
      response = await client
          .post(
            endpoint,
            headers: const {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Content-Encoding': 'gzip',
            },
            body: gzip.encode(utf8.encode(formBody)),
          )
          .timeout(timeout);
    } on TimeoutException {
      throw const AcoustIdException(
        AcoustIdFailure.timeout,
        'AcoustID 응답 시간이 초과되었습니다.',
      );
    } on http.ClientException {
      throw const AcoustIdException(
        AcoustIdFailure.network,
        'AcoustID에 연결하지 못했습니다.',
      );
    }
    if (response.statusCode == 429) {
      throw const AcoustIdException(
        AcoustIdFailure.rateLimited,
        'AcoustID 요청이 많습니다. 잠시 뒤 다시 시도하세요.',
        statusCode: 429,
      );
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AcoustIdException(
        AcoustIdFailure.server,
        'AcoustID가 요청을 처리하지 못했습니다.',
        statusCode: response.statusCode,
      );
    }
    try {
      final json = jsonDecode(response.body) as Map<String, Object?>;
      if (json['status'] != 'ok') {
        throw const AcoustIdException(
          AcoustIdFailure.server,
          'AcoustID가 조회를 거절했습니다.',
        );
      }
      final results = json['results'] as List<Object?>? ?? const [];
      return [for (final raw in results) _match(raw! as Map<String, Object?>)];
    } on AcoustIdException {
      rethrow;
    } on FormatException catch (_) {
      throw const AcoustIdException(
        AcoustIdFailure.invalidResponse,
        'AcoustID 응답 형식을 읽지 못했습니다.',
      );
    } on TypeError catch (_) {
      throw const AcoustIdException(
        AcoustIdFailure.invalidResponse,
        'AcoustID 응답 형식을 읽지 못했습니다.',
      );
    }
  }

  AcoustIdMatch _match(Map<String, Object?> json) {
    final recordings = json['recordings'] as List<Object?>? ?? const [];
    return AcoustIdMatch(
      id: json['id']! as String,
      score: (json['score']! as num).toDouble(),
      recordingIds: [
        for (final recording in recordings.whereType<Map<String, Object?>>())
          if (recording['id'] case final String id) id,
      ],
    );
  }
}
