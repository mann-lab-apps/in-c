import 'classical_discovery_catalog.dart';
import 'classical_discovery_models.dart';

abstract class ConcertImportSource {
  List<ClassicalConcert> loadConcerts();
}

class SeedConcertImportSource implements ConcertImportSource {
  const SeedConcertImportSource();

  @override
  List<ClassicalConcert> loadConcerts() {
    return ClassicalDiscoveryCatalog.concerts;
  }
}

class KopisConcertImportSource implements ConcertImportSource {
  const KopisConcertImportSource({
    this.fixtureRows = const <Map<String, Object?>>[],
    this.matcher = const ConcertProgramMatcher(),
    this.works = const <ClassicalWork>[],
  });

  final List<Map<String, Object?>> fixtureRows;
  final ConcertProgramMatcher matcher;
  final List<ClassicalWork> works;

  @override
  List<ClassicalConcert> loadConcerts() {
    return KopisConcertParser(
      matcher: matcher,
      works: works,
    ).parseRows(fixtureRows);
  }
}

class KopisConcertParser {
  const KopisConcertParser({
    this.matcher = const ConcertProgramMatcher(),
    this.works = const <ClassicalWork>[],
  });

  final ConcertProgramMatcher matcher;
  final List<ClassicalWork> works;

  List<ClassicalConcert> parseRows(List<Map<String, Object?>> rows) {
    return rows.map(parseRow).toList(growable: false);
  }

  ClassicalConcert parseRow(Map<String, Object?> row) {
    final kopisId = _string(row, ['mt20id', 'id', 'performanceId']);
    final title = _string(row, ['prfnm', 'title', 'name']);
    final venue = _string(row, ['fcltynm', 'venue', 'place']);
    final region = _string(row, ['area', 'region', 'adres']);
    final performers = _split(_string(row, ['prfcast', 'performers', 'cast']));
    final programRawText = _string(row, [
      'pcseguidance',
      'programRawText',
      'program',
      'styurl',
    ]);
    final matchedWorkIds = matcher.matchWorkIds(
      programRawText: programRawText,
      works: works,
    );
    final matchedWorks = works
        .where((work) => matchedWorkIds.contains(work.id))
        .toList(growable: false);
    final startsAt =
        _parseDateTime(_string(row, ['prfpdfrom', 'startDate', 'startsAt'])) ??
        DateTime.fromMillisecondsSinceEpoch(0);
    final ticketUrl = _ticketUrl(row, kopisId);
    return ClassicalConcert(
      id: kopisId.isEmpty
          ? 'kopis-${normalizeDiscoveryText(title)}'
          : 'kopis-$kopisId',
      title: title,
      venue: venue,
      region: _normalizeRegion(region),
      startsAt: startsAt,
      performers: performers,
      programWorkIds: matchedWorkIds,
      composerIds: matchedWorks
          .map((work) => work.composerId)
          .toSet()
          .toList(growable: false),
      instrumentTags: matchedWorks
          .map((work) => work.instrumentation)
          .toSet()
          .toList(growable: false),
      ticketUrl: ticketUrl,
      programRawText: programRawText,
      ticketDestinations: [
        TicketDestination(
          id: kopisId.isEmpty ? 'kopis-ticket' : 'kopis-$kopisId-ticket',
          label: 'KOPIS',
          url: ticketUrl,
        ),
      ],
    );
  }

  String _string(Map<String, Object?> row, List<String> keys) {
    for (final key in keys) {
      final value = row[key];
      if (value is String && value.trim().isNotEmpty) {
        return value.trim();
      }
      if (value != null && value.toString().trim().isNotEmpty) {
        return value.toString().trim();
      }
    }
    return '';
  }

  List<String> _split(String value) {
    if (value.isEmpty) {
      return const <String>[];
    }
    return value
        .split(RegExp(r'[,;/\n]'))
        .map((item) => item.trim())
        .where((item) => item.isNotEmpty)
        .toList(growable: false);
  }

  DateTime? _parseDateTime(String value) {
    if (value.isEmpty) {
      return null;
    }
    final iso = DateTime.tryParse(value);
    if (iso != null) {
      return iso;
    }
    final compact = RegExp(r'^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})$')
        .firstMatch(value);
    if (compact == null) {
      return null;
    }
    return DateTime(
      int.parse(compact.group(1)!),
      int.parse(compact.group(2)!),
      int.parse(compact.group(3)!),
    );
  }

  String _normalizeRegion(String value) {
    if (value.contains('서울')) {
      return '서울';
    }
    if (value.contains('부산')) {
      return '부산';
    }
    if (value.contains('대전')) {
      return '대전';
    }
    if (value.contains('경기')) {
      return '경기';
    }
    return value.isEmpty ? '전국' : value;
  }

  String _ticketUrl(Map<String, Object?> row, String kopisId) {
    final explicit = _string(row, ['relateurl', 'ticketUrl', 'url']);
    if (explicit.isNotEmpty) {
      return explicit;
    }
    return 'https://www.kopis.or.kr/por/db/pblprfr/pblprfrView.do?mt20id=$kopisId';
  }
}

class ConcertProgramMatcher {
  const ConcertProgramMatcher();

  List<String> matchWorkIds({
    required String programRawText,
    required List<ClassicalWork> works,
  }) {
    final raw = normalizeDiscoveryText(programRawText);
    if (raw.isEmpty) {
      return const <String>[];
    }
    final matches = <String>[];
    for (final work in works) {
      if (_matchesWork(raw, work)) {
        matches.add(work.id);
      }
    }
    return List<String>.unmodifiable(matches);
  }

  bool _matchesWork(String raw, ClassicalWork work) {
    final titleCandidates = <String>[
      work.titleKo,
      work.titleOriginal,
      ...work.aliases,
    ].map(normalizeDiscoveryText).where((value) => value.length >= 4);
    if (titleCandidates.any(raw.contains)) {
      return true;
    }

    final composerCandidates = <String>[
      work.composerNameKo,
      work.composerNameOriginal,
      ..._tokens(work.composerNameOriginal),
    ].map(normalizeDiscoveryText).where((value) => value.length >= 3);
    final catalog = normalizeDiscoveryText(work.catalogNumber);
    if (catalog.isEmpty) {
      return composerCandidates.any(raw.contains) &&
          _titleTokens(work).any(raw.contains);
    }
    return composerCandidates.any(raw.contains) &&
        (raw.contains(catalog) || _titleTokens(work).any(raw.contains));
  }

  Iterable<String> _titleTokens(ClassicalWork work) sync* {
    for (final candidate in <String>[
      work.titleKo,
      work.titleOriginal,
      ...work.aliases,
    ]) {
      yield* _tokens(candidate).where((token) => token.length >= 4);
    }
  }

  Iterable<String> _tokens(String value) {
    return value
        .toLowerCase()
        .replaceAll(RegExp(r'[^\p{L}\p{N}]+', unicode: true), ' ')
        .split(' ')
        .map(normalizeDiscoveryText)
        .where((token) => token.isNotEmpty);
  }
}
