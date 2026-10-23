import 'classical_library_models.dart';
import 'local_audio_scanner.dart';
import 'metadata_candidates.dart';
import 'metadata_overrides.dart';

enum SearchResultType {
  person(label: '인물'),
  work(label: '작품'),
  workPart(label: '악장'),
  recording(label: '연주 녹음'),
  fileCandidate(label: '파일 후보');

  const SearchResultType({required this.label});
  final String label;
}

class LibrarySearchResult {
  const LibrarySearchResult({
    required this.type,
    required this.id,
    required this.title,
    required this.subtitle,
    this.rank = 0,
  });

  final SearchResultType type;
  final String id;
  final String title;
  final String subtitle;
  final int rank;
}

class SearchNormalizer {
  const SearchNormalizer();

  static const _initials = [
    'ㄱ',
    'ㄲ',
    'ㄴ',
    'ㄷ',
    'ㄸ',
    'ㄹ',
    'ㅁ',
    'ㅂ',
    'ㅃ',
    'ㅅ',
    'ㅆ',
    'ㅇ',
    'ㅈ',
    'ㅉ',
    'ㅊ',
    'ㅋ',
    'ㅌ',
    'ㅍ',
    'ㅎ',
  ];
  static const _latinFold = {
    'á': 'a',
    'à': 'a',
    'â': 'a',
    'ä': 'a',
    'ã': 'a',
    'å': 'a',
    'æ': 'ae',
    'ç': 'c',
    'é': 'e',
    'è': 'e',
    'ê': 'e',
    'ë': 'e',
    'í': 'i',
    'ì': 'i',
    'î': 'i',
    'ï': 'i',
    'ñ': 'n',
    'ó': 'o',
    'ò': 'o',
    'ô': 'o',
    'ö': 'o',
    'õ': 'o',
    'ø': 'o',
    'œ': 'oe',
    'ú': 'u',
    'ù': 'u',
    'û': 'u',
    'ü': 'u',
    'ý': 'y',
    'ÿ': 'y',
    'š': 's',
    'ž': 'z',
    'č': 'c',
    'ř': 'r',
    'ł': 'l',
    'ß': 'ss',
  };

  String normalize(String value) {
    final folded = StringBuffer();
    for (final rune in value.toLowerCase().runes) {
      final character = String.fromCharCode(rune);
      folded.write(_latinFold[character] ?? character);
    }
    return folded.toString().replaceAll(RegExp(r'[^a-z0-9가-힣ㄱ-ㅎㅏ-ㅣ]+'), '');
  }

  String initials(String value) {
    final result = StringBuffer();
    for (final rune in normalize(value).runes) {
      if (rune >= 0xAC00 && rune <= 0xD7A3) {
        result.write(_initials[(rune - 0xAC00) ~/ 588]);
      } else if ((rune >= 0x3131 && rune <= 0x314E) ||
          (rune >= 0x30 && rune <= 0x39)) {
        result.writeCharCode(rune);
      }
    }
    return result.toString();
  }
}

class LibrarySearchService {
  const LibrarySearchService({this.normalizer = const SearchNormalizer()});

  final SearchNormalizer normalizer;

  List<LibrarySearchResult> search({
    required ClassicalLibrary library,
    required List<LocalAudioFile> files,
    required List<MetadataCandidate> candidates,
    List<MetadataOverride> overrides = const [],
    Map<String, String> workAliases = const {},
    Map<String, String> recordingAliases = const {},
    required String query,
  }) {
    final tokens = query
        .split(RegExp(r'\s+'))
        .map(normalizer.normalize)
        .where((token) => token.isNotEmpty)
        .toList();
    if (tokens.isEmpty) return [];

    final results = <LibrarySearchResult>[];
    void addResult({
      required SearchResultType type,
      required String id,
      required String title,
      required String subtitle,
      required Iterable<String> values,
    }) {
      final rank = _rank(values, tokens);
      if (rank == null) return;
      results.add(
        LibrarySearchResult(
          type: type,
          id: id,
          title: title,
          subtitle: subtitle,
          rank: rank,
        ),
      );
    }

    for (final person in library.people) {
      addResult(
        type: SearchResultType.person,
        id: person.id,
        title: person.name.ko,
        subtitle: person.name.original ?? person.name.sortName,
        values: [...person.name.searchNames, person.name.sortName],
      );
    }
    for (final work in library.works) {
      final composer = library.person(work.composerId);
      addResult(
        type: SearchResultType.work,
        id: workAliases[work.id] ?? work.id,
        title: work.title.ko,
        subtitle: [
          composer.name.ko,
          ?work.catalogNumber,
          ?work.title.original,
        ].join(' · '),
        values: [
          ...composer.name.searchNames,
          composer.name.sortName,
          ...work.title.searchNames,
          work.title.sortName,
          ?work.catalogNumber,
        ],
      );
    }
    for (final part in library.workParts) {
      final work = library.work(part.workId);
      final composer = library.person(work.composerId);
      addResult(
        type: SearchResultType.workPart,
        id: part.id,
        title: part.title.ko,
        subtitle: '${composer.name.ko} · ${work.title.ko}',
        values: [
          ...composer.name.searchNames,
          ...work.title.searchNames,
          ?work.catalogNumber,
          ...part.title.searchNames,
          part.title.sortName,
          '${part.sequenceNumber}악장',
        ],
      );
    }
    for (final recording in library.recordings) {
      final work = library.work(recording.workId);
      final composer = library.person(work.composerId);
      addResult(
        type: SearchResultType.recording,
        id: recordingAliases[recording.id] ?? recording.id,
        title: recording.title.ko,
        subtitle: '${composer.name.ko} · ${work.title.ko}',
        values: [
          ...composer.name.searchNames,
          ...work.title.searchNames,
          ?work.catalogNumber,
          ...recording.title.searchNames,
          recording.title.sortName,
        ],
      );
    }

    final candidatesByFileId = {
      for (final candidate in candidates) candidate.fileId: candidate,
    };
    final overridesByFileId = {
      for (final override in overrides) override.fileId: override,
    };
    for (final file in files) {
      final displayFileName = file.fileName ?? fileNameForPath(file.path);
      final candidate = candidatesByFileId[file.id];
      final effective = EffectiveFileMetadata.resolve(
        candidate: candidate,
        tag: file.tagMetadata,
        override: overridesByFileId[file.id],
      );
      addResult(
        type: SearchResultType.fileCandidate,
        id: file.id,
        title: displayFileName,
        subtitle: effective.summary,
        values: [
          displayFileName,
          for (final value in effective.values.values) '$value',
          ?candidate?.albumText,
        ],
      );
    }

    results.sort((first, second) {
      final byRank = first.rank.compareTo(second.rank);
      if (byRank != 0) return byRank;
      final byType = first.type.index.compareTo(second.type.index);
      if (byType != 0) return byType;
      return first.title.compareTo(second.title);
    });
    final unique = <LibrarySearchResult>[];
    final seen = <String>{};
    for (final result in results) {
      if (seen.add('${result.type.name}:${result.id}')) unique.add(result);
    }
    final nonFuzzy = unique.where((result) => result.rank < 1000).toList();
    return (nonFuzzy.isEmpty ? unique : nonFuzzy).take(12).toList();
  }

  int? _rank(Iterable<String> values, List<String> tokens) {
    final sourceValues = values.toList();
    final normalizedValues = sourceValues
        .map(normalizer.normalize)
        .where((value) => value.isNotEmpty)
        .toList();
    final joined = normalizedValues.join();
    final initials = sourceValues.map(normalizer.initials).join();
    var total = 0;
    for (final token in tokens) {
      int? tokenRank;
      if (normalizedValues.contains(token)) {
        tokenRank = 0;
      } else if (normalizedValues.any((value) => value.startsWith(token))) {
        tokenRank = 10;
      } else if (joined.contains(token)) {
        tokenRank = 20;
      } else if (_isInitialQuery(token) && initials.contains(token)) {
        tokenRank = 30;
      } else if (token.length >= 4 && _hasFuzzyMatch(token, normalizedValues)) {
        tokenRank = 1040;
      }
      if (tokenRank == null) return null;
      total += tokenRank;
    }
    return total;
  }

  bool _isInitialQuery(String value) =>
      value.runes.any((rune) => rune >= 0x3131 && rune <= 0x314E);

  bool _hasFuzzyMatch(String query, List<String> values) {
    final maximumDistance = query.length >= 8 ? 2 : 1;
    return values.any(
      (value) =>
          value.length >= 4 && _levenshtein(query, value) <= maximumDistance,
    );
  }

  int _levenshtein(String first, String second) {
    var previous = List<int>.generate(second.length + 1, (index) => index);
    for (var firstIndex = 0; firstIndex < first.length; firstIndex += 1) {
      final current = <int>[firstIndex + 1];
      for (var secondIndex = 0; secondIndex < second.length; secondIndex += 1) {
        current.add(
          [
            current[secondIndex] + 1,
            previous[secondIndex + 1] + 1,
            previous[secondIndex] +
                (first.codeUnitAt(firstIndex) == second.codeUnitAt(secondIndex)
                    ? 0
                    : 1),
          ].reduce((left, right) => left < right ? left : right),
        );
      }
      previous = current;
    }
    return previous.last;
  }
}
