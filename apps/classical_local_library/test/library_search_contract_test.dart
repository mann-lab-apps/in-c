import 'dart:convert';
import 'dart:io';

import 'package:classical_local_library/library_search.dart';
import 'package:classical_local_library/sample_classical_library.dart';
import 'package:flutter_test/flutter_test.dart';

import '../tool/search_fixture.dart';

void main() {
  test('prepared and cold search preserve the pre-change IDs types ranks and order', () async {
    final contract = jsonDecode(
      await File('test/fixtures/library_search_contract.json').readAsString(),
    ) as Map<String, dynamic>;
    final index = const LibrarySearchService().prepare(
      library: sampleClassicalLibrary,
      files: searchFixtureFiles(),
      candidates: searchFixtureCandidates,
      overrides: searchFixtureOverrides,
      workAliases: searchFixtureAliases,
    );
    for (final query in searchQueries) {
      final actual = index
          .search(query)
          .map(
            (r) => {
              'id': r.id,
              'type': r.type.name,
              'title': r.title,
              'subtitle': r.subtitle,
              'rank': r.rank,
            },
          )
          .toList();
      expect(actual, contract[query], reason: query);
      final cold = const LibrarySearchService().search(
        library: sampleClassicalLibrary,
        files: searchFixtureFiles(),
        candidates: searchFixtureCandidates,
        overrides: searchFixtureOverrides,
        workAliases: searchFixtureAliases,
        query: query,
      );
      expect(
        cold
            .map(
              (r) => {
                'id': r.id,
                'type': r.type.name,
                'title': r.title,
                'subtitle': r.subtitle,
                'rank': r.rank,
              },
            )
            .toList(),
        contract[query],
        reason: 'cold $query',
      );
      expect(actual.length, lessThanOrEqualTo(12));
    }
  });
}
