import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_score.dart';

void main() {
  test('SheetScore encodes and decodes library records', () {
    final importedAt = DateTime.parse('2026-08-20T10:00:00.000');
    final updatedAt = DateTime.parse('2026-08-20T10:05:00.000');
    final openedAt = DateTime.parse('2026-08-20T10:10:00.000');
    final score = SheetScore(
      id: 'score-1',
      title: 'Sonata',
      composer: 'Composer',
      tags: const <String>['lesson', 'trumpet'],
      note: 'Use second scan.',
      filePath: '/tmp/sonata.pdf',
      importedAt: importedAt,
      updatedAt: updatedAt,
      lastOpenedAt: openedAt,
      lastPage: 4,
      isFavorite: true,
    );

    final encoded = SheetScore.encodeList(<SheetScore>[score]);
    final decoded = SheetScore.decodeList(encoded);

    expect(decoded, hasLength(1));
    expect(decoded.single.title, 'Sonata');
    expect(decoded.single.tags, <String>['lesson', 'trumpet']);
    expect(decoded.single.lastPage, 4);
    expect(decoded.single.isFavorite, isTrue);
  });

  test('matches query across title, composer, tags, and note', () {
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final score = SheetScore(
      id: 'score-1',
      title: 'Aria',
      composer: 'Bach',
      tags: const <String>['recital'],
      note: 'Check breath marks.',
      filePath: '/tmp/aria.pdf',
      importedAt: now,
      updatedAt: now,
      lastOpenedAt: null,
      lastPage: 1,
      isFavorite: false,
    );

    expect(score.matches('bach'), isTrue);
    expect(score.matches('RECITAL'), isTrue);
    expect(score.matches('breath'), isTrue);
    expect(score.matches('mozart'), isFalse);
  });
}
