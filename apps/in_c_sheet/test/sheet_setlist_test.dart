import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_setlist.dart';

void main() {
  test('SheetSetlist encodes and decodes records', () {
    final createdAt = DateTime.parse('2026-08-20T10:00:00.000');
    final updatedAt = DateTime.parse('2026-08-20T10:05:00.000');
    final setlist = SheetSetlist(
      id: 'setlist-1',
      title: 'Recital',
      scoreIds: const <String>['score-1', 'score-2'],
      createdAt: createdAt,
      updatedAt: updatedAt,
    );

    final encoded = SheetSetlist.encodeList(<SheetSetlist>[setlist]);
    final decoded = SheetSetlist.decodeList(encoded);

    expect(decoded, hasLength(1));
    expect(decoded.single.title, 'Recital');
    expect(decoded.single.scoreIds, <String>['score-1', 'score-2']);
  });

  test('sorts decoded setlists by updated date', () {
    final encoded = '''
[
  {
    "id": "older",
    "title": "Older",
    "scoreIds": [],
    "createdAt": "2026-08-20T10:00:00.000",
    "updatedAt": "2026-08-20T10:00:00.000"
  },
  {
    "id": "newer",
    "title": "Newer",
    "scoreIds": [],
    "createdAt": "2026-08-20T10:00:00.000",
    "updatedAt": "2026-08-20T10:10:00.000"
  }
]
''';

    final decoded = SheetSetlist.decodeList(encoded);

    expect(decoded.map((setlist) => setlist.id), <String>['newer', 'older']);
  });

  test('removes deleted score references', () {
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final setlist = SheetSetlist(
      id: 'setlist-1',
      title: 'Recital',
      scoreIds: const <String>['score-1', 'missing', 'score-2'],
      createdAt: now,
      updatedAt: now,
    );

    final cleaned = setlist.removeMissingScores(<String>{'score-1', 'score-2'});

    expect(cleaned.scoreIds, <String>['score-1', 'score-2']);
  });

  test('adds and removes scores without duplicating ids', () {
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final setlist = SheetSetlist(
      id: 'setlist-1',
      title: 'Recital',
      scoreIds: const <String>['score-1'],
      createdAt: now,
      updatedAt: now,
    );

    final added = setlist
        .appendScore('score-2', now)
        .appendScore('score-2', now)
        .removeScore('score-1', now);

    expect(added.scoreIds, <String>['score-2']);
  });

  test('moves scores by index', () {
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final setlist = SheetSetlist(
      id: 'setlist-1',
      title: 'Recital',
      scoreIds: const <String>['score-1', 'score-2', 'score-3'],
      createdAt: now,
      updatedAt: now,
    );

    final moved = setlist.moveScore(2, 0, now);

    expect(moved.scoreIds, <String>['score-3', 'score-1', 'score-2']);
  });
}
