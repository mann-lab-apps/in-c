import 'dart:convert';

import 'classical_discovery_catalog.dart';
import 'classical_discovery_models.dart';

class ClassicalCatalogSnapshot {
  const ClassicalCatalogSnapshot({
    required this.composers,
    required this.works,
    required this.concerts,
    required this.promotions,
  });

  final List<ClassicalComposer> composers;
  final List<ClassicalWork> works;
  final List<ClassicalConcert> concerts;
  final List<ConcertPromotion> promotions;
}

abstract class ClassicalCatalogDataSource {
  ClassicalCatalogSnapshot loadCatalog();
}

class SeedClassicalCatalogDataSource implements ClassicalCatalogDataSource {
  const SeedClassicalCatalogDataSource();

  @override
  ClassicalCatalogSnapshot loadCatalog() {
    return ClassicalCatalogSnapshot(
      composers: ClassicalDiscoveryCatalog.composers,
      works: ClassicalDiscoveryCatalog.works,
      concerts: ClassicalDiscoveryCatalog.concerts,
      promotions: ClassicalDiscoveryCatalog.promotions,
    );
  }
}

class JsonClassicalCatalogDataSource implements ClassicalCatalogDataSource {
  const JsonClassicalCatalogDataSource(this.jsonText);

  final String jsonText;

  @override
  ClassicalCatalogSnapshot loadCatalog() {
    final root = jsonDecode(jsonText);
    final map = root is Map
        ? root.cast<String, Object?>()
        : <String, Object?>{};
    return ClassicalCatalogSnapshot(
      composers: _maps(map['composers']).map(_composerFromJson).toList(),
      works: _maps(map['works']).map(_workFromJson).toList(),
      concerts: _maps(map['concerts']).map(_concertFromJson).toList(),
      promotions: _maps(map['promotions']).map(_promotionFromJson).toList(),
    );
  }
}

ClassicalComposer _composerFromJson(Map<String, Object?> json) {
  return ClassicalComposer(
    id: _string(json['id']),
    nameKo: _string(json['nameKo']),
    nameOriginal: _string(json['nameOriginal']),
    period: _string(json['period']),
    aliases: _strings(json['aliases']),
  );
}

ClassicalWork _workFromJson(Map<String, Object?> json) {
  return ClassicalWork(
    id: _string(json['id']),
    titleKo: _string(json['titleKo']),
    titleOriginal: _string(json['titleOriginal']),
    composerId: _string(json['composerId']),
    composerNameKo: _string(json['composerNameKo']),
    composerNameOriginal: _string(json['composerNameOriginal']),
    period: _string(json['period']),
    instrumentation: _string(json['instrumentation']),
    durationSeconds: _int(json['durationSeconds']),
    catalogNumber: _string(json['catalogNumber']),
    movements: _maps(json['movements']).map(_movementFromJson).toList(),
    moodTags: _strings(json['moodTags']),
    contextTags: _strings(json['contextTags']),
    difficultyForListening: _int(json['difficultyForListening'], fallback: 2),
    aliases: _strings(json['aliases']),
    listeningMoments: _maps(json['listeningMoments'])
        .map(_momentFromJson)
        .toList(),
    externalLinks: _maps(json['externalLinks']).map(_linkFromJson).toList(),
    recordings: _maps(json['recordings']).map(_recordingFromJson).toList(),
    relatedWorkIds: _strings(json['relatedWorkIds']),
    scoreLinks: _maps(json['scoreLinks']).map(_linkFromJson).toList(),
    concertIds: _strings(json['concertIds']),
  );
}

ClassicalMovement _movementFromJson(Map<String, Object?> json) {
  return ClassicalMovement(
    id: _string(json['id']),
    title: _string(json['title']),
    order: _int(json['order'], fallback: 1),
    durationSeconds: _int(json['durationSeconds']),
  );
}

ListeningMoment _momentFromJson(Map<String, Object?> json) {
  return ListeningMoment(
    id: _string(json['id']),
    label: _string(json['label']),
    startSeconds: _int(json['startSeconds']),
    endSeconds: _int(json['endSeconds']),
    prompt: _string(json['prompt']),
    tags: _strings(json['tags']),
    recommendedRecordingId: _nullableString(json['recommendedRecordingId']),
    fallbackExternalLinkId: _nullableString(json['fallbackExternalLinkId']),
  );
}

ExternalLink _linkFromJson(Map<String, Object?> json) {
  return ExternalLink(
    id: _string(json['id']),
    platformId: _string(json['platformId']),
    label: _string(json['label']),
    url: _string(json['url']),
    linkType: _string(json['linkType']),
    previewUrl: _nullableString(json['previewUrl']),
    embedUrl: _nullableString(json['embedUrl']),
    deepLink: _nullableString(json['deepLink']),
    openMode: _string(json['openMode'], fallback: 'external'),
  );
}

ClassicalRecording _recordingFromJson(Map<String, Object?> json) {
  return ClassicalRecording(
    id: _string(json['id']),
    provider: _string(json['provider']),
    title: _string(json['title']),
    performer: _string(json['performer']),
    url: _string(json['url']),
    displayPriority: _int(json['displayPriority']),
    previewUrl: _nullableString(json['previewUrl']),
    embedUrl: _nullableString(json['embedUrl']),
    deepLink: _nullableString(json['deepLink']),
  );
}

ClassicalConcert _concertFromJson(Map<String, Object?> json) {
  return ClassicalConcert(
    id: _string(json['id']),
    title: _string(json['title']),
    venue: _string(json['venue']),
    region: _string(json['region']),
    startsAt:
        DateTime.tryParse(_string(json['startsAt'])) ??
        DateTime.fromMillisecondsSinceEpoch(0),
    performers: _strings(json['performers']),
    programWorkIds: _strings(json['programWorkIds']),
    composerIds: _strings(json['composerIds']),
    instrumentTags: _strings(json['instrumentTags']),
    ticketUrl: _string(json['ticketUrl']),
    programRawText: _string(json['programRawText']),
    ticketDestinations: _maps(json['ticketDestinations'])
        .map(_ticketDestinationFromJson)
        .toList(),
  );
}

TicketDestination _ticketDestinationFromJson(Map<String, Object?> json) {
  return TicketDestination(
    id: _string(json['id']),
    label: _string(json['label']),
    url: _string(json['url']),
    displayPriority: _int(json['displayPriority']),
  );
}

ConcertPromotion _promotionFromJson(Map<String, Object?> json) {
  return ConcertPromotion(
    id: _string(json['id']),
    concertId: _string(json['concertId']),
    advertiserName: _string(json['advertiserName']),
    sponsorLabel: _string(json['sponsorLabel']),
    targetWorkIds: _strings(json['targetWorkIds']),
    targetComposerIds: _strings(json['targetComposerIds']),
    targetInstruments: _strings(json['targetInstruments']),
    targetRegions: _strings(json['targetRegions']),
  );
}

List<Map<String, Object?>> _maps(Object? value) {
  if (value is! List) {
    return const <Map<String, Object?>>[];
  }
  return value
      .whereType<Map>()
      .map((map) => map.cast<String, Object?>())
      .toList(growable: false);
}

List<String> _strings(Object? value) {
  if (value is! List) {
    return const <String>[];
  }
  return value
      .whereType<String>()
      .map((item) => item.trim())
      .where((item) => item.isNotEmpty)
      .toList(growable: false);
}

String _string(Object? value, {String fallback = ''}) {
  if (value is! String || value.trim().isEmpty) {
    return fallback;
  }
  return value;
}

String? _nullableString(Object? value) {
  final result = _string(value);
  return result.isEmpty ? null : result;
}

int _int(Object? value, {int fallback = 0}) {
  if (value is num) {
    return value.round();
  }
  return int.tryParse(value?.toString() ?? '') ?? fallback;
}
