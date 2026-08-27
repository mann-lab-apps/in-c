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
      rehearsalMode: true,
      scoreStartPages: const <String, int>{'score-1': 2},
      scoreNotes: const <String, String>{'score-1': 'Check transition.'},
      scoreDurations: const <String, int>{'score-1': 180, 'score-2': 210},
      transitionSeconds: 12,
    );

    final encoded = SheetSetlist.encodeList(<SheetSetlist>[setlist]);
    final decoded = SheetSetlist.decodeList(encoded);

    expect(decoded, hasLength(1));
    expect(decoded.single.title, 'Recital');
    expect(decoded.single.scoreIds, <String>['score-1', 'score-2']);
    expect(decoded.single.rehearsalMode, isTrue);
    expect(decoded.single.scoreStartPages, <String, int>{'score-1': 2});
    expect(decoded.single.scoreNotes, <String, String>{
      'score-1': 'Check transition.',
    });
    expect(decoded.single.scoreDurations, <String, int>{
      'score-1': 180,
      'score-2': 210,
    });
    expect(decoded.single.transitionSeconds, 12);
    expect(decoded.single.totalEstimatedSeconds, 402);
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

  test('decodes dynamic JSON maps from persisted storage', () {
    final decoded = SheetSetlist.decodeJsonList(<dynamic>[
      <String, dynamic>{
        'id': 'setlist-1',
        'title': 'Recital',
        'scoreIds': <dynamic>['score-1', '', 7, ' score-2 '],
        'createdAt': '2026-08-20T10:00:00.000',
        'updatedAt': '2026-08-20T10:05:00.000',
        'rehearsalMode': true,
        'scoreStartPages': <String, dynamic>{
          'score-1': 2,
          'score-2': -4,
          'bad': 'x',
        },
        'scoreNotes': <String, dynamic>{'score-1': 'Cue fast.', 'score-2': 7},
        'scoreDurations': <String, dynamic>{
          'score-1': 180,
          'score-2': -5,
          'bad': 'x',
        },
        'transitionSeconds': 999,
      },
    ]);

    expect(decoded.single.id, 'setlist-1');
    expect(decoded.single.scoreIds, <String>['score-1', 'score-2']);
    expect(decoded.single.rehearsalMode, isTrue);
    expect(decoded.single.scoreStartPages, <String, int>{'score-1': 2});
    expect(decoded.single.scoreNotes, <String, String>{'score-1': 'Cue fast.'});
    expect(decoded.single.scoreDurations, <String, int>{'score-1': 180});
    expect(decoded.single.transitionSeconds, 600);
  });

  test('ignores non-list persisted setlist fields', () {
    final decoded = SheetSetlist.decodeJsonList(<dynamic>[
      <String, dynamic>{
        'id': 'setlist-1',
        'title': 'Recital',
        'scoreIds': 'score-1',
        'createdAt': '2026-08-20T10:00:00.000',
        'updatedAt': '2026-08-20T10:05:00.000',
      },
    ]);

    expect(decoded.single.scoreIds, isEmpty);
    expect(SheetSetlist.decodeJsonList('bad'), isEmpty);
  });

  test('skips records without id and repairs invalid metadata', () {
    final decoded = SheetSetlist.decodeJsonList(<dynamic>[
      <String, dynamic>{
        'title': 'Missing id',
        'scoreIds': <dynamic>['score-0'],
      },
      <String, dynamic>{
        'id': 'repaired',
        'title': 'Broken',
        'scoreIds': <dynamic>['score-1'],
        'createdAt': 'bad-date',
        'updatedAt': 'bad-date',
      },
      <String, dynamic>{
        'id': 'setlist-1',
        'title': 42,
        'scoreIds': <dynamic>['score-1'],
        'createdAt': '2026-08-20T10:00:00.000',
        'updatedAt': '2026-08-20T10:05:00.000',
      },
    ]);

    expect(decoded, hasLength(2));
    expect(decoded.map((setlist) => setlist.id), <String>[
      'setlist-1',
      'repaired',
    ]);
    expect(decoded.first.title, 'Untitled setlist');
    expect(decoded.last.createdAt, DateTime.fromMillisecondsSinceEpoch(0));
    expect(decoded.last.updatedAt, decoded.last.createdAt);
  });

  test('returns empty list for malformed persisted JSON', () {
    expect(SheetSetlist.decodeList('{bad json'), isEmpty);
    expect(SheetSetlist.decodeList('{"not":"a list"}'), isEmpty);
  });

  test('removes deleted score references', () {
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final setlist = SheetSetlist(
      id: 'setlist-1',
      title: 'Recital',
      scoreIds: const <String>['score-1', 'missing', 'score-2'],
      createdAt: now,
      updatedAt: now,
      scoreStartPages: const <String, int>{'score-1': 2, 'missing': 3},
      scoreNotes: const <String, String>{
        'score-1': 'Ready',
        'missing': 'Drop me',
      },
      scoreDurations: const <String, int>{'score-1': 180, 'missing': 99},
    );

    final cleaned = setlist.removeMissingScores(<String>{'score-1', 'score-2'});

    expect(cleaned.scoreIds, <String>['score-1', 'score-2']);
    expect(cleaned.scoreStartPages, <String, int>{'score-1': 2});
    expect(cleaned.scoreNotes, <String, String>{'score-1': 'Ready'});
    expect(cleaned.scoreDurations, <String, int>{'score-1': 180});
  });

  test('removes stale rehearsal metadata even when score ids are clean', () {
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final setlist = SheetSetlist(
      id: 'setlist-1',
      title: 'Recital',
      scoreIds: const <String>['score-1'],
      createdAt: now,
      updatedAt: now,
      scoreStartPages: const <String, int>{'score-1': 2, 'missing': 4},
      scoreNotes: const <String, String>{
        'score-1': 'Ready',
        'missing': 'Drop me',
      },
      scoreDurations: const <String, int>{'score-1': 180, 'missing': 99},
    );

    final cleaned = setlist.removeMissingScores(<String>{'score-1'});

    expect(cleaned.scoreIds, <String>['score-1']);
    expect(cleaned.scoreStartPages, <String, int>{'score-1': 2});
    expect(cleaned.scoreNotes, <String, String>{'score-1': 'Ready'});
    expect(cleaned.scoreDurations, <String, int>{'score-1': 180});
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
