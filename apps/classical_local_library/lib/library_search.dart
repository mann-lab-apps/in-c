import 'classical_library_models.dart';
import 'local_audio_scanner.dart';
import 'metadata_candidates.dart';
import 'metadata_overrides.dart';
import 'local_file_library.dart';

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

  String initials(String value) => _initialsFromNormalized(normalize(value));

  String _initialsFromNormalized(String value) {
    final result = StringBuffer();
    for (final rune in value.runes) {
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

class _SearchDocument {
  _SearchDocument(
    this.result,
    Iterable<String> source,
    SearchNormalizer normalizer,
  ) : _normalizer = normalizer,
      values = source
          .map(normalizer.normalize)
          .where((v) => v.isNotEmpty)
          .toList();
  final LibrarySearchResult result;
  final List<String> values;
  final SearchNormalizer _normalizer;
  late final initials = values.map(_normalizer._initialsFromNormalized).join();
  late final joined = values.join();
}

class PreparedLibrarySearch {
  PreparedLibrarySearch._(this._service, this._documents, this._files);
  final LibrarySearchService _service;
  final List<_SearchDocument> _documents;
  final List<LocalFileLibraryEntry> _files;
  List<LibrarySearchResult> search(String query) =>
      _service._searchPrepared(this, query);
  List<String> fileIds(String query, List<LibrarySearchResult> results) {
    final ids = {
      for (final r in results)
        if (r.type == SearchResultType.fileCandidate) r.id,
    };
    for (final file in const LocalFileLibrary().search(_files, query)) {
      ids.add(file.file.id);
    }
    return [
      for (final file in _files)
        if (ids.contains(file.file.id)) file.file.id,
    ];
  }

  int get documentCount => _documents.length;
}

class LibrarySearchProfile {
  int normalizationMicros = 0,
      corpusMicros = 0,
      matchMicros = 0,
      finishMicros = 0,
      fuzzyComparisons = 0,
      documents = 0;
  Map<String, int> toJson() => {
    'normalizationMicros': normalizationMicros,
    'compositionMicros': corpusMicros - normalizationMicros,
    'matchMicros': matchMicros,
    'finishMicros': finishMicros,
    'fuzzyComparisons': fuzzyComparisons,
    'documents': documents,
  };
}

class LibrarySearchService {
  const LibrarySearchService({
    this.normalizer = const SearchNormalizer(),
    this.profile,
  });

  final SearchNormalizer normalizer;
  final LibrarySearchProfile? profile;

  List<LibrarySearchResult> search({
    required ClassicalLibrary library,
    required List<LocalAudioFile> files,
    required List<MetadataCandidate> candidates,
    List<MetadataOverride> overrides = const [],
    Map<String, String> workAliases = const {},
    Map<String, String> recordingAliases = const {},
    required String query,
  }) {
    if (query.trim().isEmpty) return [];
    return prepare(
      library: library,
      files: files,
      candidates: candidates,
      overrides: overrides,
      workAliases: workAliases,
      recordingAliases: recordingAliases,
    ).search(query);
  }

  PreparedLibrarySearch prepare({
    required ClassicalLibrary library,
    required List<LocalAudioFile> files,
    required List<MetadataCandidate> candidates,
    List<MetadataOverride> overrides = const [],
    Map<String, String> workAliases = const {},
    Map<String, String> recordingAliases = const {},
  }) {
    final clock = profile == null ? null : (Stopwatch()..start());
    final documents = <_SearchDocument>[];
    void addResult({
      required SearchResultType type,
      required String id,
      required String title,
      required String subtitle,
      required Iterable<String> values,
    }) {
      final normalization = profile == null ? null : (Stopwatch()..start());
      documents.add(
        _SearchDocument(
          LibrarySearchResult(
            type: type,
            id: id,
            title: title,
            subtitle: subtitle,
          ),
          values,
          normalizer,
        ),
      );
      if (normalization != null) {
        profile!.normalizationMicros += normalization.elapsedMicroseconds;
      }
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

    final displayFiles = const LocalFileLibrary().entries(
      files: files,
      candidates: candidates,
      overrides: overrides,
    );
    final displayByFileId = {
      for (final entry in displayFiles) entry.file.id: entry,
    };
    for (final file in files) {
      final displayFileName = file.fileName ?? fileNameForPath(file.path);
      final display = displayByFileId[file.id]!;
      addResult(
        type: SearchResultType.fileCandidate,
        id: file.id,
        title: displayFileName,
        subtitle: display.subtitle,
        values: [
          displayFileName,
          display.title,
          display.album,
          display.artist,
          ?display.composer,
        ],
      );
    }

    if (clock != null) {
      profile!.corpusMicros = clock.elapsedMicroseconds;
      profile!.documents = documents.length;
    }
    return PreparedLibrarySearch._(
      this,
      List.unmodifiable(documents),
      displayFiles,
    );
  }

  List<LibrarySearchResult> _searchPrepared(
    PreparedLibrarySearch index,
    String query,
  ) {
    final clock = profile == null ? null : (Stopwatch()..start());
    final tokens = query
        .split(RegExp(r'\s+'))
        .map(normalizer.normalize)
        .where((v) => v.isNotEmpty)
        .toList();
    if (tokens.isEmpty) return [];
    final results = <LibrarySearchResult>[];
    for (final document in index._documents) {
      final rank = _rank(document, tokens);
      if (rank != null) {
        final r = document.result;
        results.add(
          LibrarySearchResult(
            type: r.type,
            id: r.id,
            title: r.title,
            subtitle: r.subtitle,
            rank: rank,
          ),
        );
      }
    }
    if (clock != null) profile!.matchMicros = clock.elapsedMicroseconds;
    clock?.reset();
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
    final limited = (nonFuzzy.isEmpty ? unique : nonFuzzy).take(12).toList();
    if (clock != null) profile!.finishMicros = clock.elapsedMicroseconds;
    return limited;
  }

  int? _rank(_SearchDocument document, List<String> tokens) {
    final normalizedValues = document.values;
    final joined = document.joined;
    var total = 0;
    for (final token in tokens) {
      int? tokenRank;
      if (normalizedValues.contains(token)) {
        tokenRank = 0;
      } else if (normalizedValues.any((value) => value.startsWith(token))) {
        tokenRank = 10;
      } else if (joined.contains(token)) {
        tokenRank = 20;
      } else if (_isInitialQuery(token) && document.initials.contains(token)) {
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
    return values.any((value) {
      if (value.length < 4 ||
          (query.length - value.length).abs() > maximumDistance) {
        return false;
      }
      if (profile != null) profile!.fuzzyComparisons++;
      return _levenshtein(query, value, maximumDistance) <= maximumDistance;
    });
  }

  int _levenshtein(String first, String second, int limit) {
    var previous = List<int>.generate(second.length + 1, (index) => index);
    var current = List<int>.filled(second.length + 1, 0);
    for (var firstIndex = 0; firstIndex < first.length; firstIndex += 1) {
      current[0] = firstIndex + 1;
      var minimum = current[0];
      for (var secondIndex = 0; secondIndex < second.length; secondIndex += 1) {
        final deletion = previous[secondIndex + 1] + 1,
            insertion = current[secondIndex] + 1;
        final substitute =
            previous[secondIndex] +
            (first.codeUnitAt(firstIndex) == second.codeUnitAt(secondIndex)
                ? 0
                : 1);
        var value = deletion < insertion ? deletion : insertion;
        if (substitute < value) value = substitute;
        current[secondIndex + 1] = value;
        if (value < minimum) minimum = value;
      }
      if (minimum > limit) return limit + 1;
      final old = previous;
      previous = current;
      current = old;
    }
    return previous.last;
  }
}
