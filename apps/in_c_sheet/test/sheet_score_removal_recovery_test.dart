import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_profile.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:in_c_sheet/sheet_setlist.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  late _RemovalStore store;
  late SheetLibraryController controller;
  final failure = StateError('removal failed');

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    store = _RemovalStore();
    final now = DateTime(2026, 9, 14);
    await store.saveScores([
      for (final id in ['one', 'two'])
        SheetScore(
          id: id,
          title: id,
          composer: '',
          tags: const [],
          note: '',
          filePath: '/tmp/$id.pdf',
          importedAt: now,
          updatedAt: now,
          lastOpenedAt: null,
          lastPage: 1,
          isFavorite: false,
          bookmarks: const [],
        ),
    ]);
    await store.saveSetlists([
      SheetSetlist(
        id: 'concert',
        title: 'Concert',
        scoreIds: const ['one', 'two'],
        createdAt: now,
        updatedAt: now,
      ),
    ]);
    controller = SheetLibraryController(store: store);
    await controller.load();
    store.delayRemoval = true;
  });

  test('late successful removal writes to the original library', () async {
    final pending = controller.deleteScoresByIds({'one'});
    await controller.createLibraryProfile('Other');
    store.writes.single.complete();
    expect(await pending, 1);
    expect(controller.scores, isEmpty);
    expect(await store.loadScores(), isEmpty);
    expect(await store.loadSetlists(), isEmpty);
    await controller.switchLibraryProfile(SheetLibraryProfile.defaultId);
    expect(controller.scores.single.id, 'two');
    expect(controller.setlists.single.scoreIds, ['two']);
  });

  test('no-op removal does not invalidate pending recovery', () async {
    final pending = expectLater(
      controller.deleteScoresByIds({'one'}),
      throwsA(same(failure)),
    );
    expect(await controller.deleteScoresByIds({'missing'}), 0);
    expect(store.writes, hasLength(1));
    store.writes.single.completeError(failure);
    await pending;
    expect(controller.scores.map((s) => s.id).toSet(), {'one', 'two'});
    expect(controller.setlists.single.scoreIds, ['one', 'two']);
  });

  for (final firstFails in [false, true]) {
    for (final lastFails in [false, true]) {
      test(
        'consecutive removal outcomes $firstFails/$lastFails stay durable',
        () async {
          final first = controller.deleteScoresByIds({'one'});
          final firstChecked = firstFails
              ? expectLater(first, throwsA(same(failure)))
              : first;
          final last = controller.deleteScoresByIds({'two'});
          final lastChecked = lastFails
              ? expectLater(last, throwsA(same(failure)))
              : last;
          if (firstFails) {
            store.writes[0].completeError(failure);
          } else {
            store.writes[0].complete();
          }
          await firstChecked;
          if (lastFails) {
            store.writes[1].completeError(failure);
          } else {
            store.writes[1].complete();
          }
          await lastChecked;
          await _expectDurable(controller, store);
        },
      );
    }
  }

  for (final newerChange in ['score', 'setlist', 'profile']) {
    test('late removal failure preserves newer $newerChange', () async {
      final pending = expectLater(
        controller.deleteScoresByIds({'one'}),
        throwsA(same(failure)),
      );
      switch (newerChange) {
        case 'score':
          await controller.toggleFavorite(controller.scoreById('two'));
        case 'setlist':
          await controller.renameSetlist(
            controller.setlistById('concert'),
            'New title',
          );
        case 'profile':
          await controller.createLibraryProfile('Other');
      }
      store.writes.single.completeError(failure);
      await pending;
      await _expectDurable(controller, store);
      if (newerChange == 'score') {
        expect(controller.scoreById('two').isFavorite, isTrue);
      }
      if (newerChange == 'setlist') {
        expect(controller.setlists.single.title, 'New title');
      }
      if (newerChange == 'profile') {
        expect(controller.activeLibraryProfile.name, 'Other');
      }
    });
  }

  for (final phase in ['score', 'setlist']) {
    test('delayed $phase recovery cannot overwrite a newer edit', () async {
      final pending = expectLater(
        controller.deleteScoresByIds({'one'}),
        throwsA(same(failure)),
      );
      store.delayRead = phase;
      store.readEntered = Completer<void>();
      store.releaseRead = Completer<void>();
      store.writes.single.completeError(failure);
      await store.readEntered!.future;
      if (phase == 'score') {
        await controller.toggleFavorite(controller.scoreById('two'));
      } else {
        await controller.renameSetlist(
          controller.setlistById('concert'),
          'New title',
        );
      }
      store.releaseRead!.complete();
      await pending;
      await _expectDurable(controller, store);
    });

    test('$phase recovery read failure retains original write error', () async {
      final pending = expectLater(
        controller.deleteScoresByIds({'one'}),
        throwsA(same(failure)),
      );
      store.failRead = phase;
      store.writes.single.completeError(failure);
      await pending;
      store.failRead = null;
      await controller.load();
      expect(controller.scores, hasLength(2));
      expect(controller.setlists.single.scoreIds, ['one', 'two']);
    });
  }
}

Future<void> _expectDurable(
  SheetLibraryController controller,
  _RemovalStore store,
) async {
  expect(
    controller.scores.map((s) => s.toJson()).toList(),
    (await store.loadScores()).map((s) => s.toJson()).toList(),
  );
  expect(
    controller.setlists.map((s) => s.toJson()).toList(),
    (await store.loadSetlists()).map((s) => s.toJson()).toList(),
  );
}

class _RemovalStore extends SheetLibraryStore {
  bool delayRemoval = false;
  final writes = <Completer<void>>[];
  String? delayRead;
  String? failRead;
  Completer<void>? readEntered;
  Completer<void>? releaseRead;

  @override
  Future<void> saveScoresAndSetlists(
    List<SheetScore> scores,
    List<SheetSetlist> setlists, {
    required String libraryId,
  }) async {
    if (delayRemoval) {
      final pending = Completer<void>();
      writes.add(pending);
      await pending.future;
    }
    await super.saveScoresAndSetlists(scores, setlists, libraryId: libraryId);
  }

  Future<void> _read(String phase) async {
    if (failRead == phase) throw StateError('read failed');
    if (delayRead == phase) {
      delayRead = null;
      readEntered!.complete();
      await releaseRead!.future;
    }
  }

  @override
  Future<List<SheetScore>> loadScores() async {
    final result = await super.loadScores();
    await _read('score');
    return result;
  }

  @override
  Future<List<SheetSetlist>> loadSetlists() async {
    final result = await super.loadSetlists();
    await _read('setlist');
    return result;
  }
}
