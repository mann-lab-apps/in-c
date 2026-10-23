import 'dart:convert';

import 'package:http/http.dart' as http;

import 'classical_library_models.dart';

enum ImslpResourceKind {
  score('총보'),
  part('파트보'),
  arrangement('편곡'),
  midi('MIDI'),
  audio('오디오 녹음'),
  other('기타 자료');

  const ImslpResourceKind(this.label);
  final String label;
}

enum ImslpRightsStatus {
  publicDomain('IMSLP 표기상 퍼블릭 도메인'),
  freeLicense('자유 라이선스 자료'),
  regionalRestriction('국가별 이용 조건 확인 필요'),
  membershipOrWaiting('회원 가입 또는 대기 시간이 필요할 수 있습니다'),
  reviewRequired('국가별 이용 조건 확인 필요'),
  unavailable('다운로드 불가'),
  unknown('권리 상태 알 수 없음');

  const ImslpRightsStatus(this.label);
  final String label;
}

enum ImslpTransferStatus {
  pending,
  downloading,
  verifying,
  importing,
  completed,
  cancelled,
  failed,
  externalPageRequired,
}

enum ImslpDownloadDecision {
  requiresConfirmation,
  externalPageRequired,
  blocked,
}

T _enumOr<T extends Enum>(Iterable<T> values, String? name, T fallback) {
  for (final value in values) {
    if (value.name == name) return value;
  }
  return fallback;
}

class ImslpWorkSearchResult {
  const ImslpWorkSearchResult({
    required this.externalId,
    required this.title,
    required this.pageUrl,
    this.composerName,
    this.catalogNumber,
  });

  final String externalId;
  final String title;
  final Uri pageUrl;
  final String? composerName;
  final String? catalogNumber;
}

class ImslpWorkLink {
  const ImslpWorkLink({
    required this.workId,
    required this.externalId,
    required this.pageUrl,
    required this.workTitle,
    required this.linkedAtMillis,
    this.composerName,
    this.catalogNumber,
  });

  final String workId;
  final String externalId;
  final String pageUrl;
  final String workTitle;
  final int linkedAtMillis;
  final String? composerName;
  final String? catalogNumber;
}

class ImslpResource {
  const ImslpResource({
    required this.id,
    required this.workId,
    required this.pageUrl,
    required this.kind,
    required this.rightsStatus,
    required this.fetchedAtMillis,
    this.directDownloadUrl,
    this.originalFileName,
    this.mimeType,
    this.sizeBytes,
    this.contributorLabel,
    this.rawCopyrightStatus,
    this.licenseLabel,
    this.regionLabel,
    this.isSoundRecording = false,
  });

  final String id;
  final String workId;
  final String pageUrl;
  final ImslpResourceKind kind;
  final ImslpRightsStatus rightsStatus;
  final int fetchedAtMillis;
  final String? directDownloadUrl;
  final String? originalFileName;
  final String? mimeType;
  final int? sizeBytes;
  final String? contributorLabel;
  final String? rawCopyrightStatus;
  final String? licenseLabel;
  final String? regionLabel;
  final bool isSoundRecording;

  String get rightsNotice => isSoundRecording
      ? '${rightsStatus.label} · 녹음·실연 권리는 별도로 확인해야 합니다'
      : rightsStatus.label;
}

class ImslpImportRecord {
  const ImslpImportRecord({
    required this.id,
    required this.resourceId,
    required this.workId,
    required this.sourcePageUrl,
    required this.sourceDownloadUrl,
    required this.originalFileName,
    required this.localPath,
    required this.sha256,
    required this.sizeBytes,
    required this.downloadedAtMillis,
    required this.status,
    required this.rightsStatus,
    this.mimeType,
    this.fileId,
    this.recordingId,
    this.trackId,
    this.licenseLabel,
    this.rawCopyrightStatus,
    this.failureKind,
    this.userMessage,
  });

  final String id;
  final String resourceId;
  final String workId;
  final String sourcePageUrl;
  final String sourceDownloadUrl;
  final String originalFileName;
  final String localPath;
  final String sha256;
  final int sizeBytes;
  final int downloadedAtMillis;
  final ImslpTransferStatus status;
  final ImslpRightsStatus rightsStatus;
  final String? mimeType;
  final String? fileId;
  final String? recordingId;
  final String? trackId;
  final String? licenseLabel;
  final String? rawCopyrightStatus;
  final String? failureKind;
  final String? userMessage;
}

abstract interface class ImslpCatalogClient {
  Future<List<ImslpWorkSearchResult>> searchWorks(
    String query, {
    int limit = 10,
  });
}

class ImslpLinkConflictException implements Exception {
  const ImslpLinkConflictException(this.linkedWorkId);
  final String linkedWorkId;
}

class ImslpClientException implements Exception {
  const ImslpClientException(this.kind, this.userMessage);
  final String kind;
  final String userMessage;
}

class HttpImslpCatalogClient implements ImslpCatalogClient {
  HttpImslpCatalogClient({http.Client? client})
    : _client = client ?? http.Client();

  final http.Client _client;

  @override
  Future<List<ImslpWorkSearchResult>> searchWorks(
    String query, {
    int limit = 10,
  }) async {
    final trimmed = query.trim();
    if (trimmed.isEmpty) return const [];
    final uri = Uri.https('imslp.org', '/api.php', {
      'action': 'query',
      'list': 'search',
      'srsearch': trimmed,
      'srnamespace': '0',
      'srlimit': limit.clamp(1, 20).toString(),
      'format': 'json',
    });
    try {
      final response = await _client
          .get(uri)
          .timeout(const Duration(seconds: 12));
      if (response.statusCode == 429) {
        throw const ImslpClientException(
          'rateLimited',
          'IMSLP 요청이 많아 잠시 뒤 다시 시도해 주세요.',
        );
      }
      if (response.statusCode != 200) {
        throw const ImslpClientException(
          'httpFailure',
          'IMSLP 검색을 불러오지 못했습니다.',
        );
      }
      return parseSearchResponse(response.body);
    } on ImslpClientException {
      rethrow;
    } on FormatException {
      throw const ImslpClientException(
        'invalidResponse',
        'IMSLP 응답 형식을 확인할 수 없습니다.',
      );
    } catch (_) {
      throw const ImslpClientException('networkFailure', 'IMSLP에 연결할 수 없습니다.');
    }
  }

  static List<ImslpWorkSearchResult> parseSearchResponse(String source) {
    final decoded = jsonDecode(source);
    if (decoded is! Map<String, Object?>) throw const FormatException();
    final query = decoded['query'];
    if (query is! Map<String, Object?>) return const [];
    final rows = query['search'];
    if (rows is! List<Object?>) return const [];
    final results = <ImslpWorkSearchResult>[];
    for (final row in rows) {
      if (row is! Map<String, Object?>) continue;
      final title = row['title'];
      if (title is! String || title.trim().isEmpty) continue;
      final pageUrl = ImslpUrlPolicy.workPageForTitle(title);
      final composer = RegExp(r'\(([^()]*)\)\s*$').firstMatch(title)?.group(1);
      final workTitle = title.replaceFirst(RegExp(r'\s*\([^()]*\)\s*$'), '');
      results.add(
        ImslpWorkSearchResult(
          externalId: title,
          title: workTitle,
          pageUrl: pageUrl,
          composerName: composer,
        ),
      );
    }
    return results;
  }
}

class ImslpUrlPolicy {
  const ImslpUrlPolicy();

  static bool isOfficialHost(String host) {
    final normalized = host.toLowerCase();
    return normalized == 'imslp.org' || normalized.endsWith('.imslp.org');
  }

  static Uri? normalizeOfficialHttps(String source) {
    final uri = Uri.tryParse(source.trim());
    if (uri == null ||
        uri.scheme.toLowerCase() != 'https' ||
        !isOfficialHost(uri.host) ||
        uri.userInfo.isNotEmpty ||
        (uri.hasPort && uri.port != 443)) {
      return null;
    }
    return uri.replace(fragment: '');
  }

  static Uri workPageForTitle(String title) =>
      Uri.https('imslp.org', '/wiki/${title.trim().replaceAll(' ', '_')}');
}

class ImslpDownloadPolicy {
  const ImslpDownloadPolicy();

  ImslpDownloadDecision decide(ImslpResource resource) {
    final direct = resource.directDownloadUrl == null
        ? null
        : ImslpUrlPolicy.normalizeOfficialHttps(resource.directDownloadUrl!);
    if (resource.rightsStatus == ImslpRightsStatus.unavailable) {
      return ImslpDownloadDecision.blocked;
    }
    if (direct == null ||
        resource.rightsStatus == ImslpRightsStatus.unknown ||
        resource.rightsStatus == ImslpRightsStatus.reviewRequired ||
        resource.rightsStatus == ImslpRightsStatus.regionalRestriction ||
        resource.rightsStatus == ImslpRightsStatus.membershipOrWaiting) {
      return ImslpDownloadDecision.externalPageRequired;
    }
    return ImslpDownloadDecision.requiresConfirmation;
  }
}

abstract interface class ImslpStore {
  Future<List<ImslpWorkLink>> loadWorkLinks();
  Future<void> upsertWorkLink(ImslpWorkLink link);
  Future<void> unlinkWork(String workId);
  Future<List<ImslpResource>> loadResources(String workId);
  Future<void> saveResources(String workId, List<ImslpResource> resources);
  Future<List<ImslpImportRecord>> loadImports();
  Future<void> upsertImport(ImslpImportRecord record);
  Future<ImslpImportRecord?> findImportByChecksum(String sha256);
}

class MemoryImslpStore implements ImslpStore {
  final Map<String, ImslpWorkLink> _links = {};
  final Map<String, List<ImslpResource>> _resources = {};
  final Map<String, ImslpImportRecord> _imports = {};

  @override
  Future<List<ImslpWorkLink>> loadWorkLinks() async => _links.values.toList();

  @override
  Future<void> upsertWorkLink(ImslpWorkLink link) async {
    for (final existing in _links.values) {
      if (existing.externalId == link.externalId &&
          existing.workId != link.workId) {
        throw ImslpLinkConflictException(existing.workId);
      }
    }
    _links[link.workId] = link;
  }

  @override
  Future<void> unlinkWork(String workId) async {
    _links.remove(workId);
    _resources.remove(workId);
  }

  @override
  Future<List<ImslpResource>> loadResources(String workId) async =>
      List.unmodifiable(_resources[workId] ?? const []);

  @override
  Future<void> saveResources(
    String workId,
    List<ImslpResource> resources,
  ) async {
    _resources[workId] = [...resources];
  }

  @override
  Future<List<ImslpImportRecord>> loadImports() async =>
      _imports.values.toList();

  @override
  Future<void> upsertImport(ImslpImportRecord record) async {
    _imports[record.id] = record;
  }

  @override
  Future<ImslpImportRecord?> findImportByChecksum(String sha256) async {
    for (final record in _imports.values) {
      if (record.sha256 == sha256) return record;
    }
    return null;
  }
}

String buildImslpWorkQuery(Work work, ClassicalPerson composer) {
  final names = <String>{
    composer.name.english ?? composer.name.original ?? composer.name.ko,
    work.title.english ?? work.title.original ?? work.title.ko,
    if (work.catalogNumber != null) work.catalogNumber!,
  }..removeWhere((value) => value.trim().isEmpty);
  return names.join(' ');
}

ImslpRightsStatus imslpRightsStatusFromName(String? value) =>
    _enumOr(ImslpRightsStatus.values, value, ImslpRightsStatus.unknown);

ImslpResourceKind imslpResourceKindFromName(String? value) =>
    _enumOr(ImslpResourceKind.values, value, ImslpResourceKind.other);

ImslpTransferStatus imslpTransferStatusFromName(String? value) =>
    _enumOr(ImslpTransferStatus.values, value, ImslpTransferStatus.failed);
