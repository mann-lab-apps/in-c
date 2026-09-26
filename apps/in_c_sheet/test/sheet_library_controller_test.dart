import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_annotation.dart';
import 'package:in_c_sheet/sheet_auto_scroll.dart';
import 'package:in_c_sheet/sheet_library_backup.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_profile.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_library_view_settings.dart';
import 'package:in_c_sheet/sheet_metronome.dart';
import 'package:in_c_sheet/sheet_pdf_page_transformer.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:in_c_sheet/sheet_setlist.dart';
import 'package:in_c_sheet/sheet_tone.dart';
import 'package:in_c_sheet/sheet_tuner.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  for (final action in ['favorite', 'pin']) {
    test(
      'stale $action card callback toggles current flag without losing content',
      () async {
        SharedPreferences.setMockInitialValues(<String, Object>{});
        final store = SheetLibraryStore();
        final original = _score(DateTime(2026, 9, 13));
        await store.saveScores([original]);
        final controller = SheetLibraryController(store: store);
        await controller.load();
        await controller.updateScoreMetadata(
          original,
          title: 'Revised',
          composer: 'Bach',
          tags: '',
          note: 'Cue',
        );
        await controller.updateLastPage(controller.scoreById(original.id), 4);
        final before = controller.scoreById(original.id).toJson();
        Future<void> toggle() => action == 'favorite'
            ? controller.toggleFavorite(original)
            : controller.togglePinned(original);
        await toggle();
        var current = controller.scoreById(original.id);
        expect(
          action == 'favorite' ? current.isFavorite : current.isPinned,
          isTrue,
        );
        await toggle();
        await controller.load();
        current = controller.scoreById(original.id);
        expect(
          action == 'favorite' ? current.isFavorite : current.isPinned,
          isFalse,
        );
        final after = current.toJson();
        before.remove('updatedAt');
        after.remove('updatedAt');
        expect(after, before);
        await controller.deleteScoresByIds({original.id});
        await toggle();
        await controller.load();
        expect(controller.scores, isEmpty);
      },
    );
  }

  test(
    'bookmark commands reject missing targets and toggle current membership',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime(2026, 9, 13);
      final bookmark = SheetBookmark(
        pageNumber: 1,
        label: 'Intro',
        createdAt: now,
      );
      final original = _score(now, bookmarks: [bookmark]);
      final store = SheetLibraryStore();
      await store.saveScores([original]);
      final controller = SheetLibraryController(store: store);
      await controller.load();
      expect(await controller.toggleBookmark(original, 1), isTrue);
      final without = controller.scoreById(original.id);
      expect(
        await controller.renameBookmark(original, bookmark, 'Lost'),
        isFalse,
      );
      expect(await controller.deleteBookmark(original, bookmark), isFalse);
      expect(await controller.toggleBookmark(original, 0), isFalse);
      expect(identical(controller.scoreById(original.id), without), isTrue);
      expect(await controller.toggleBookmark(original, 1), isTrue);
      expect(controller.scoreById(original.id).bookmarks.single.label, '1쪽');
      await controller.deleteScoresByIds({original.id});
      expect(await controller.toggleBookmark(original, 2), isFalse);
      expect(
        await controller.renameBookmark(original, bookmark, 'Lost'),
        isFalse,
      );
      expect(await controller.deleteBookmark(original, bookmark), isFalse);
      await controller.load();
      expect(controller.scores, isEmpty);
    },
  );

  for (final action in ['toggle', 'rename', 'delete']) {
    test(
      'stale bookmark $action preserves current score and other bookmarks',
      () async {
        SharedPreferences.setMockInitialValues(<String, Object>{});
        final now = DateTime(2026, 9, 13);
        final original = _score(
          now,
          bookmarks: [
            SheetBookmark(pageNumber: 1, label: 'Intro', createdAt: now),
          ],
        );
        final store = SheetLibraryStore();
        await store.saveScores([original]);
        final controller = SheetLibraryController(store: store);
        await controller.load();
        await controller.toggleBookmark(original, 4);
        await controller.updateScoreMetadata(
          controller.scoreById(original.id),
          title: 'Revised',
          composer: 'Bach',
          tags: '',
          note: 'Cue',
        );
        final before = controller.scoreById(original.id).toJson();
        switch (action) {
          case 'toggle':
            await controller.toggleBookmark(original, 2);
          case 'rename':
            await controller.renameBookmark(
              original,
              original.bookmarks.single,
              'Start',
            );
          case 'delete':
            await controller.deleteBookmark(
              original,
              original.bookmarks.single,
            );
        }
        await controller.load();
        final current = controller.scoreById(original.id);
        expect(
          current.bookmarks.map((bookmark) => bookmark.pageNumber),
          action == 'toggle'
              ? [1, 2, 4]
              : action == 'rename'
              ? [1, 4]
              : [4],
        );
        if (action == 'rename') expect(current.bookmarks.first.label, 'Start');
        final after = current.toJson();
        for (final key in ['bookmarks', 'updatedAt']) {
          before.remove(key);
          after.remove(key);
        }
        expect(after, before);
      },
    );
  }

  test(
    'metadata edit applies only submitted fields to current score',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final store = SheetLibraryStore();
      final original = _score(DateTime(2026, 9, 13));
      await store.saveScores([original]);
      final controller = SheetLibraryController(store: store);
      await controller.load();
      await controller.updateScoreMetadata(
        original,
        title: original.title,
        composer: '',
        tags: '',
        note: '',
        collection: 'Concert',
        group: 'Brass',
        rating: 4,
      );
      await controller.updateLastPage(controller.scoreById(original.id), 4);
      await controller.updateMetronomeSettingsForScore(
        controller.scoreById(original.id),
        SheetMetronomeSettings.defaultSettings.copyWith(bpm: 120),
      );
      final before = controller.scoreById(original.id).toJson();
      final result = await controller.updateScoreMetadata(
        original,
        title: 'Edited',
        composer: ' Bach ',
        tags: 'solo',
        note: ' cue ',
      );
      expect(result, isTrue);
      await controller.load();
      final after = controller.scoreById(original.id).toJson();
      expect(after['title'], 'Edited');
      expect(after['composer'], 'Bach');
      expect(after['note'], 'cue');
      for (final key in ['title', 'composer', 'tags', 'note', 'updatedAt']) {
        before.remove(key);
        after.remove(key);
      }
      expect(after, before);
      await controller.updateScoreMetadata(
        original,
        title: '',
        composer: '',
        tags: '',
        note: '',
        collection: '',
        group: '',
        rating: 0,
      );
      final cleared = controller.scoreById(original.id);
      expect(cleared.title, 'Edited');
      expect(cleared.collection, '');
      expect(cleared.group, '');
      expect(cleared.rating, 0);
      await controller.deleteScoresByIds({original.id});
      expect(
        await controller.updateScoreMetadata(
          original,
          title: 'Lost',
          composer: '',
          tags: '',
          note: '',
        ),
        isFalse,
      );
      await controller.load();
      expect(controller.scores, isEmpty);
    },
  );

  for (final action in ['page', 'open']) {
    test('stale $action callback preserves current score content', () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final store = SheetLibraryStore();
      final original = _score(DateTime(2026, 9, 13));
      await store.saveScores([original]);
      final controller = SheetLibraryController(store: store);
      await controller.load();
      await controller.updateScoreMetadata(
        original,
        title: 'Revised',
        composer: 'Bach',
        tags: 'practice',
        note: 'Solo',
      );
      await controller.toggleFavorite(controller.scoreById(original.id));
      await controller.updateLastPage(controller.scoreById(original.id), 4);
      await controller.addAnnotationStroke(
        controller.scoreById(original.id),
        SheetAnnotationStroke(
          id: 'fresh',
          pageNumber: 4,
          tool: SheetAnnotationTool.pen,
          color: 0xff111111,
          width: 2,
          points: const [SheetAnnotationPoint(x: .1, y: .2)],
          createdAt: DateTime(2026, 9, 13),
        ),
      );
      final before = controller.scoreById(original.id).toJson();
      if (action == 'page') {
        await controller.updateLastPage(original, 5);
      } else {
        await controller.markOpened(original);
      }
      await controller.load();
      final after = controller.scoreById(original.id).toJson();
      expect(after['lastPage'], action == 'page' ? 5 : 4);
      for (final field in ['lastPage', 'lastOpenedAt', 'updatedAt']) {
        before.remove(field);
        after.remove(field);
      }
      expect(after, before);
    });
  }

  test(
    'stale page snapshot cannot suppress a return to its old page',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final store = SheetLibraryStore();
      final original = _score(DateTime(2026, 9, 13));
      await store.saveScores([original]);
      final controller = SheetLibraryController(store: store);
      await controller.load();
      await controller.updateLastPage(original, 4);
      await controller.updateLastPage(original, 1);
      expect(controller.scoreById(original.id).lastPage, 1);
      final current = controller.scoreById(original.id);
      await controller.updateLastPage(original, 1);
      expect(identical(controller.scoreById(original.id), current), isTrue);
      await controller.updateLastPage(original, 0);
      expect(identical(controller.scoreById(original.id), current), isTrue);
      await controller.deleteScoresByIds({original.id});
      await controller.markOpened(original);
      await controller.updateLastPage(original, 2);
      await controller.load();
      expect(controller.scores, isEmpty);
    },
  );

  test('global metronome save follows pending score save without changing its override', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final store = _DelayedMetronomeStore();
    final original = _score(DateTime(2026, 9, 13));
    await store.saveScores([original]);
    final controller = SheetLibraryController(store: store);
    await controller.load();
    store.delayNext = true;
    final first = controller.updateMetronomeSettingsForScore(
      original,
      SheetMetronomeSettings.defaultSettings.copyWith(bpm: 96),
    );
    await store.entered.future;
    final second = controller.updateMetronomeSettings(
      SheetMetronomeSettings.defaultSettings.copyWith(bpm: 120),
    );
    store.release.complete();
    await Future.wait([first, second]);
    await controller.load();
    expect(controller.metronomeSettings.bpm, 120);
    expect(controller.scoreById(original.id).metronomeSettings?.bpm, 96);
  });

  for (final scope in ['global', 'score', 'setlist']) {
    test('concurrent metronome saves retain latest $scope settings', () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final store = _DelayedMetronomeStore();
      final original = _score(DateTime(2026, 9, 13));
      await store.saveScores([original]);
      final controller = SheetLibraryController(store: store);
      await controller.load();
      final setlist = await controller.createSetlist('Concert');
      await controller.addScoreToSetlist(setlist, original);
      Future<void> save(int bpm) {
        final settings = SheetMetronomeSettings.defaultSettings.copyWith(
          bpm: bpm,
        );
        if (scope == 'global') {
          return controller.updateMetronomeSettings(settings);
        }
        return controller.updateMetronomeSettingsForScore(
          original,
          settings,
          setlistId: scope == 'setlist' ? setlist.id : null,
        );
      }

      store.delayNext = true;
      final first = save(96);
      await store.entered.future;
      final second = save(120);
      await Future<void>.delayed(Duration.zero);
      store.release.complete();
      await Future.wait([first, second]);
      await controller.load();
      expect(controller.metronomeSettings.bpm, 120);
      if (scope == 'score') {
        expect(controller.scoreById(original.id).metronomeSettings?.bpm, 120);
      } else if (scope == 'setlist') {
        expect(
          controller.setlists.single.scoreMetronomeSettings[original.id]?.bpm,
          120,
        );
        expect(controller.scoreById(original.id).metronomeSettings, isNull);
      }
    });
  }

  for (final failingBpm in [96, 120]) {
    test(
      'metronome save error at $failingBpm does not poison later writes',
      () async {
        SharedPreferences.setMockInitialValues(<String, Object>{});
        final store = _DelayedMetronomeStore()..failingBpm = failingBpm;
        final original = _score(DateTime(2026, 9, 13));
        await store.saveScores([original]);
        final controller = SheetLibraryController(store: store);
        await controller.load();
        Future<void> save(int bpm) =>
            controller.updateMetronomeSettingsForScore(
              original,
              SheetMetronomeSettings.defaultSettings.copyWith(bpm: bpm),
            );
        store.delayNext = true;
        final first = save(96);
        final firstCheck = expectLater(
          first,
          failingBpm == 96 ? throwsStateError : completes,
        );
        await store.entered.future;
        final second = save(120);
        final secondCheck = expectLater(
          second,
          failingBpm == 120 ? throwsStateError : completes,
        );
        store.release.complete();
        await Future.wait([firstCheck, secondCheck]);
        final lastSuccessfulBpm = failingBpm == 96 ? 120 : 96;
        await controller.load();
        expect(controller.metronomeSettings.bpm, lastSuccessfulBpm);
        expect(
          controller.scoreById(original.id).metronomeSettings?.bpm,
          lastSuccessfulBpm,
        );
        await save(132);
        await controller.load();
        expect(controller.metronomeSettings.bpm, 132);
        expect(controller.scoreById(original.id).metronomeSettings?.bpm, 132);
      },
    );
  }

  for (final removal in ['setlist', 'membership', 'score']) {
    test('delayed metronome save respects removed $removal scope', () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final store = _DelayedMetronomeStore();
      final original = _score(DateTime(2026, 9, 13));
      await store.saveScores([original]);
      final controller = SheetLibraryController(store: store);
      await controller.load();
      final setlist = await controller.createSetlist('Concert');
      await controller.addScoreToSetlist(setlist, original);
      store.delayNext = true;
      final pending = controller.updateMetronomeSettingsForScore(
        original,
        SheetMetronomeSettings.defaultSettings.copyWith(bpm: 96),
        setlistId: setlist.id,
      );
      addTearDown(() async {
        if (!store.release.isCompleted) store.release.complete();
        await pending;
      });
      await store.entered.future;
      switch (removal) {
        case 'setlist':
          await controller.deleteSetlist(setlist);
        case 'membership':
          await controller.removeScoreFromSetlist(setlist, original);
        case 'score':
          await controller.deleteScoresByIds({original.id});
      }
      store.release.complete();
      await pending;
      await controller.load();
      expect(controller.metronomeSettings.bpm, 96);
      expect(
        controller.scoreByIdOrNull(original.id)?.metronomeSettings,
        isNull,
      );
      if (removal == 'setlist') {
        expect(controller.setlists, isEmpty);
      } else {
        expect(controller.setlists.single.scoreMetronomeSettings, isEmpty);
        expect(controller.setlists.single.scoreIds, isEmpty);
      }
      if (removal == 'score') expect(controller.scores, isEmpty);
    });
  }

  test(
    'delayed metronome save preserves newer page and annotation state',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime(2026, 9, 13);
      final store = _DelayedMetronomeStore();
      final original = _score(now);
      await store.saveScores([original]);
      final controller = SheetLibraryController(store: store);
      await controller.load();
      store.delayNext = true;
      final pending = controller.updateMetronomeSettingsForScore(
        original,
        SheetMetronomeSettings.defaultSettings.copyWith(bpm: 96),
      );
      addTearDown(() async {
        if (!store.release.isCompleted) store.release.complete();
        await pending;
      });
      await store.entered.future;
      await controller.updateLastPage(controller.scoreById(original.id), 4);
      await controller.addAnnotationStroke(
        controller.scoreById(original.id),
        SheetAnnotationStroke(
          id: 'fresh',
          pageNumber: 4,
          tool: SheetAnnotationTool.pen,
          color: 0xff111111,
          width: 2,
          points: const [SheetAnnotationPoint(x: .1, y: .2)],
          createdAt: now,
        ),
      );
      store.release.complete();
      await pending;
      expect(controller.scoreById(original.id).lastPage, 4);
      expect(
        controller.scoreById(original.id).annotationLayer.strokes.single.id,
        'fresh',
      );
      expect(controller.scoreById(original.id).metronomeSettings?.bpm, 96);
      await controller.load();
      expect(controller.scoreById(original.id).lastPage, 4);
      expect(
        controller.scoreById(original.id).annotationLayer.strokes.single.id,
        'fresh',
      );
    },
  );

  test(
    'setlist add excludes removed scores without counting them as duplicates',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime(2026, 9, 13);
      final store = SheetLibraryStore();
      final scores = [
        for (final id in ['a', 'b', 'c']) _score(now, id: id),
      ];
      await store.saveScores(scores);
      final controller = SheetLibraryController(store: store);
      await controller.load();
      final setlist = await controller.createSetlist('Concert');
      await controller.addScoreToSetlist(setlist, scores.first);
      await controller.deleteScoresByIds({'c'});
      final result = await controller.addScoresToSetlist(setlist, [
        ...scores,
        scores[1],
      ]);
      expect(result.addedCount, 1);
      expect(result.skippedDuplicateCount, 2);
      expect(result.skippedMissingCount, 1);
      expect(controller.setlists.single.scoreIds, ['a', 'b']);
      final missingOnly = await controller.addScoresToSetlist(setlist, [
        scores.last,
      ]);
      expect(missingOnly.didAddAny, isFalse);
      expect(missingOnly.skippedDuplicateCount, 0);
      expect(missingOnly.skippedMissingCount, 1);
      await controller.addScoreToSetlist(setlist, scores.last);
      expect(controller.setlists.single.scoreIds, ['a', 'b']);
      await controller.load();
      expect(controller.setlists.single.scoreIds, ['a', 'b']);
    },
  );

  test(
    'repeated setlist duplicates receive distinct case-insensitive names',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final store = SheetLibraryStore();
      final controller = SheetLibraryController(store: store);
      await controller.load();
      final original = await controller.createSetlist('Concert');
      final first = await controller.duplicateSetlist(original);
      expect(first.title, 'Concert copy');
      await controller.renameSetlist(first, '  CONCERT COPY  ');
      await controller.createSetlist('Concert copy (2)');
      final third = await controller.duplicateSetlist(original);
      expect(third.title, 'Concert copy (3)');
      await controller.load();
      final fourth = await controller.duplicateSetlist(
        controller.setlistById(original.id),
      );
      expect(fourth.title, 'Concert copy (4)');
      expect(controller.setlists.map((item) => item.id).toSet(), hasLength(5));
      expect(controller.setlistById(original.id).title, 'Concert');
      final persisted = await store.loadSetlists();
      expect(
        persisted.map((item) => item.title.toLowerCase()).toSet(),
        hasLength(5),
      );
    },
  );

  test(
    'partial setlist settings preserve newer membership and performance state',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime(2026, 9, 13);
      final store = SheetLibraryStore();
      final scores = [
        for (final id in ['a', 'b']) _score(now, id: id),
      ];
      await store.saveScores(scores);
      final controller = SheetLibraryController(store: store);
      await controller.load();
      final created = await controller.createSetlist('Concert');
      await controller.addScoresToSetlist(created, scores);
      final snapshot = controller.setlists.single;
      await controller.removeScoreFromSetlist(snapshot, scores.first);
      await controller.renameSetlist(controller.setlists.single, 'Evening');
      await controller.markSetlistOpened(
        controller.setlists.single,
        scoreId: 'b',
      );
      await controller.updateMetronomeSettingsForScore(
        scores.last,
        SheetMetronomeSettings.defaultSettings.copyWith(bpm: 96),
        setlistId: snapshot.id,
      );
      await controller.updateSetlistRehearsalSettings(
        snapshot,
        transitionSeconds: 7,
        scoreStartPages: const {'a': 2, 'b': 3},
        scoreNotes: const {'a': 'Removed', 'b': 'Solo'},
        scoreDurations: const {'a': 30, 'b': 90},
      );
      var current = controller.setlists.single;
      expect(current.title, 'Evening');
      expect(current.scoreIds, ['b']);
      expect(current.scoreStartPages, {'b': 3});
      expect(current.scoreNotes, {'b': 'Solo'});
      expect(current.scoreDurations, {'b': 90});
      expect(current.scoreMetronomeSettings['b']?.bpm, 96);
      expect(current.lastOpenedScoreId, 'b');
      final template = await controller.savePerformancePresetTemplate(
        name: 'Stage',
        viewerSettings: const SheetViewerSettings(
          displayMode: 'twoPage',
          halfPageTurn: false,
        ),
      );
      expect(
        await controller.applyPerformancePresetToSetlist(snapshot, template.id),
        isTrue,
      );
      await controller.load();
      current = controller.setlists.single;
      expect(current.title, 'Evening');
      expect(current.scoreIds, ['b']);
      expect(current.scoreNotes, {'b': 'Solo'});
      expect(current.transitionSeconds, 7);
      expect(current.scoreMetronomeSettings['b']?.bpm, 96);
      expect(current.viewerSettingsOverride?.displayMode, 'twoPage');
      expect(
        await controller.updateSetlistRehearsalSettings(
          snapshot,
          scoreNotes: const {},
          clearViewerSettingsOverride: true,
        ),
        isTrue,
      );
      expect(controller.setlists.single.scoreNotes, isEmpty);
      expect(controller.setlists.single.scoreDurations, {'b': 90});
      expect(controller.setlists.single.viewerSettingsOverride, isNull);
      await controller.deleteSetlist(current);
      expect(
        await controller.updateSetlistRehearsalSettings(
          snapshot,
          transitionSeconds: 20,
        ),
        isFalse,
      );
      expect(
        await controller.applyPerformancePresetToSetlist(snapshot, template.id),
        isFalse,
      );
      expect(controller.setlists, isEmpty);
    },
  );

  test(
    'setlist reorder rejects stale indexes and preserves current metadata',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime(2026, 9, 13);
      final store = SheetLibraryStore();
      final scores = [
        for (final id in ['a', 'b', 'c']) _score(now, id: id),
      ];
      await store.saveScores(scores);
      final controller = SheetLibraryController(store: store);
      await controller.load();
      final created = await controller.createSetlist('Concert');
      await controller.addScoresToSetlist(created, scores);
      final snapshot = controller.setlists.single;
      await controller.removeScoreFromSetlist(snapshot, scores.first);
      expect(await controller.moveScoreInSetlist(snapshot, 0, 2), isFalse);
      expect(controller.setlists.single.scoreIds, ['b', 'c']);
      final fresh = controller.setlists.single;
      await controller.renameSetlist(fresh, 'Evening');
      expect(await controller.moveScoreInSetlist(fresh, 0, 1), isTrue);
      expect(controller.setlists.single.title, 'Evening');
      expect(controller.setlists.single.scoreIds, ['c', 'b']);
      expect(await controller.moveScoreInSetlist(fresh, 0, 1), isFalse);
      expect(controller.setlists.single.scoreIds, ['c', 'b']);
      await controller.load();
      expect(controller.setlists.single.title, 'Evening');
      expect(controller.setlists.single.scoreIds, ['c', 'b']);
      final latest = controller.setlists.single;
      expect(await controller.moveScoreInSetlist(latest, -1, 0), isFalse);
      expect(await controller.moveScoreInSetlist(latest, 0, 2), isFalse);
      expect(await controller.moveScoreInSetlist(latest, 0, 0), isTrue);
      expect(controller.setlists.single.updatedAt, latest.updatedAt);
      await controller.deleteSetlist(latest);
      expect(await controller.moveScoreInSetlist(latest, 0, 1), isFalse);
      expect(controller.setlists, isEmpty);
    },
  );

  test(
    'setlist actions preserve changes made after the displayed snapshot',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime(2026, 9, 13);
      final store = SheetLibraryStore();
      final scores = [
        _score(now, id: 'a'),
        _score(now, id: 'b'),
        _score(now, id: 'c'),
      ];
      await store.saveScores(scores);
      final controller = SheetLibraryController(store: store);
      await controller.load();
      final snapshot = await controller.createSetlist('Concert');
      await controller.addScoreToSetlist(snapshot, scores[0]);
      final added = await controller.addScoresToSetlist(snapshot, scores);
      expect(added.addedCount, 2);
      expect(added.skippedDuplicateCount, 1);
      expect(controller.setlists.single.scoreIds, ['a', 'b', 'c']);
      final populated = controller.setlists.single;
      await controller.removeScoreFromSetlist(populated, scores[0]);
      await controller.removeScoreFromSetlist(populated, scores[1]);
      expect(controller.setlists.single.scoreIds, ['c']);
      await controller.renameSetlist(populated, 'Evening');
      await controller.markSetlistOpened(populated, scoreId: 'c');
      expect(controller.setlists.single.title, 'Evening');
      expect(controller.setlists.single.scoreIds, ['c']);
      expect(controller.setlists.single.lastOpenedScoreId, 'c');
      await controller.markSetlistOpened(populated, scoreId: 'a');
      expect(controller.setlists.single.lastOpenedScoreId, 'c');
      await controller.load();
      expect(controller.setlists.single.title, 'Evening');
      expect(controller.setlists.single.scoreIds, ['c']);
      await controller.deleteSetlist(populated);
      final missing = await controller.addScoresToSetlist(populated, scores);
      expect(missing.targetMissing, isTrue);
      expect(missing.addedCount, 0);
      expect(missing.skippedDuplicateCount, 0);
      expect(missing.didAddAny, isFalse);
      await controller.addScoreToSetlist(populated, scores[0]);
      await controller.renameSetlist(populated, 'Deleted');
      await controller.markSetlistOpened(populated, scoreId: 'a');
      expect(controller.setlists, isEmpty);
    },
  );

  for (final orphanKind in ['duration', 'metronome']) {
    test('load persists orphaned setlist $orphanKind cleanup', () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime(2026, 9, 13);
      final store = SheetLibraryStore();
      await store.saveScores([_score(now, id: 'kept')]);
      await store.saveSetlists([
        SheetSetlist(
          id: 'concert',
          title: 'Concert',
          scoreIds: const ['kept'],
          createdAt: now,
          updatedAt: now,
          scoreDurations: {
            'kept': 90,
            if (orphanKind == 'duration') 'removed': 120,
          },
          scoreMetronomeSettings: {
            'kept': SheetMetronomeSettings.defaultSettings.copyWith(bpm: 96),
            if (orphanKind == 'metronome')
              'removed': SheetMetronomeSettings.defaultSettings.copyWith(
                bpm: 120,
              ),
          },
          lastOpenedScoreId: 'kept',
          lastOpenedAt: now,
        ),
      ]);
      final controller = SheetLibraryController(store: store);
      await controller.load();
      expect(controller.setlists.single.scoreDurations, {'kept': 90});
      expect(controller.setlists.single.scoreMetronomeSettings.keys, ['kept']);
      expect(
        controller.setlists.single.scoreMetronomeSettings['kept']?.bpm,
        96,
      );
      expect(controller.setlists.single.lastOpenedScoreId, 'kept');
      final persisted = (await store.loadSetlists()).single;
      expect(persisted.scoreDurations, {'kept': 90});
      expect(persisted.scoreMetronomeSettings.keys, ['kept']);
      await controller.load();
      expect(controller.setlists.single.updatedAt, persisted.updatedAt);
    });
  }

  test('renames and deletes bookmarks with empty label fallback', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    final score = _score(
      now,
      bookmarks: <SheetBookmark>[
        SheetBookmark(pageNumber: 3, label: 'Solo', createdAt: now),
      ],
    );
    await store.saveScores(<SheetScore>[score]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    await controller.renameBookmark(
      controller.scoreById(score.id),
      controller.scoreById(score.id).bookmarks.single,
      '',
    );

    var updated = controller.scoreById(score.id);
    expect(updated.bookmarks.single.label, '3쪽');

    await controller.deleteBookmark(updated, updated.bookmarks.single);

    updated = controller.scoreById(score.id);
    expect(updated.bookmarks, isEmpty);
  });

  test('updates score metadata and keeps search target current', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[_score(now)]);

    final controller = SheetLibraryController(store: store);
    await controller.load();
    await controller.updateScoreMetadata(
      controller.scores.single,
      title: 'Concert Etude',
      composer: 'Goedicke',
      tags: 'trumpet, Lesson, trumpet',
      note: 'Check high register.',
      collection: 'Etudes',
      group: 'Lesson A',
      rating: 5,
      linkedFiles: <SheetLinkedFile>[
        SheetLinkedFile(
          path: '/tmp/parts/trumpet.pdf',
          type: 'pdf',
          label: 'Trumpet part',
          createdAt: now,
        ),
        SheetLinkedFile(
          path: ' /tmp/parts/trumpet.pdf ',
          type: 'pdf',
          label: 'Duplicate part',
          createdAt: now,
        ),
      ],
      customFields: const <SheetCustomMetadataField>[
        SheetCustomMetadataField(key: 'Publisher', value: 'Mann Lab'),
        SheetCustomMetadataField(key: 'publisher', value: 'Duplicate'),
        SheetCustomMetadataField(key: 'Edition', value: ''),
      ],
    );

    final updated = controller.scores.single;
    expect(updated.title, 'Concert Etude');
    expect(updated.composer, 'Goedicke');
    expect(updated.tags, <String>['trumpet', 'Lesson']);
    expect(updated.note, 'Check high register.');
    expect(updated.collection, 'Etudes');
    expect(updated.group, 'Lesson A');
    expect(updated.rating, 5);
    expect(updated.linkedFiles, hasLength(1));
    expect(updated.linkedFiles.single.label, 'Trumpet part');
    expect(updated.customFields, hasLength(1));
    expect(updated.customFields.single.value, 'Mann Lab');

    controller.updateQuery('register');
    expect(controller.filteredScores.single.id, updated.id);
    controller.updateQuery('etudes');
    expect(controller.filteredScores.single.id, updated.id);
    controller.updateQuery('publisher');
    expect(controller.filteredScores.single.id, updated.id);
    controller.updateQuery('mann lab');
    expect(controller.filteredScores.single.id, updated.id);
  });

  test(
    'restores automatic metadata backup and reloads controller state',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime.parse('2026-08-20T10:00:00.000');
      final store = SheetLibraryStore();
      await store.saveScores(<SheetScore>[
        _score(now, id: 'auto-backup-score', title: 'Automatic Backup Score'),
      ]);

      final controller = SheetLibraryController(store: store);
      await controller.load();
      expect(controller.scores.single.id, 'auto-backup-score');

      final preferences = await SharedPreferences.getInstance();
      await preferences.setString(
        'clef_scores',
        SheetScore.encodeList(const <SheetScore>[]),
      );

      final result = await controller.restoreAutomaticMetadataBackup();
      expect(result.status, SheetLibraryBackupRestoreStatus.restored);
      expect(controller.scores.single.id, 'auto-backup-score');
    },
  );

  test('updates and reloads global viewer action defaults', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final store = SheetLibraryStore();
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await controller.updateGlobalViewerSettings(
      const SheetViewerSettings(
        displayMode: 'continuousVertical',
        halfPageTurn: true,
        pageScale: SheetViewerSettings.fitWidthScale,
        pedalMapping: SheetViewerSettings.customPedalMappingType,
        customPedalMapping: <String, String>{
          'Space': 'toggleQuickActions',
          'Tab': 'none',
        },
      ),
    );

    expect(controller.globalViewerSettings.halfPageTurn, isTrue);
    expect(
      controller.globalViewerSettings.customPedalMapping['Space'],
      'toggleQuickActions',
    );

    final nextController = SheetLibraryController(store: store);
    await nextController.load();
    expect(nextController.globalViewerSettings.pageScale, 'fitWidth');
    expect(
      nextController.globalViewerSettings.customPedalMapping['Tab'],
      'none',
    );
  });

  test(
    'applies global viewer action defaults to newly imported scores',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime.parse('2026-08-20T10:00:00.000');
      final store = _ImportScoreStore(_score(now, id: 'imported-score'));
      final controller = SheetLibraryController(store: store);
      await controller.load();
      await controller.updateGlobalViewerSettings(
        const SheetViewerSettings(
          displayMode: 'twoPage',
          halfPageTurn: true,
          pageScale: SheetViewerSettings.fullscreenScale,
          pedalMapping: SheetViewerSettings.reversedPedalMapping,
        ),
      );

      final imported = await controller.importPdf();

      expect(imported?.viewerSettings.displayMode, 'twoPage');
      expect(imported?.viewerSettings.halfPageTurn, isTrue);
      expect(
        imported?.viewerSettings.pageScale,
        SheetViewerSettings.fullscreenScale,
      );
      expect(
        imported?.viewerSettings.pedalMapping,
        SheetViewerSettings.reversedPedalMapping,
      );
    },
  );

  test(
    'opens existing score instead of duplicating matching PDF import',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime.parse('2026-08-20T10:00:00.000');
      final store = _ImportScoreStore(
        _score(
          now,
          id: 'imported-score',
          title: 'Recital Part',
          filePath: '/tmp/imported-score-recital-part.pdf',
        ),
      );
      await store.saveScores(<SheetScore>[
        _score(
          now,
          id: 'score-1',
          title: 'Recital Part',
          filePath: '/tmp/score-1-recital-part.pdf',
        ),
      ]);
      final controller = SheetLibraryController(store: store);
      await controller.load();

      final imported = await controller.importPdf();

      expect(imported?.id, 'score-1');
      expect(controller.scores, hasLength(1));
      expect(controller.lastImportOpenedExistingScore, isTrue);
    },
  );

  test(
    'batch PDF import adds new scores and suppresses existing duplicates',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime.parse('2026-08-20T10:00:00.000');
      final store = _ImportScoreStore(
        _score(now, id: 'unused-single'),
        batchScores: <SheetScore>[
          _score(
            now,
            id: 'batch-1',
            title: 'Etude',
            filePath: '/tmp/batch-1-etude.pdf',
          ),
          _score(
            now,
            id: 'batch-2',
            title: 'Prelude',
            filePath: '/tmp/batch-2-prelude.pdf',
          ),
          _score(
            now,
            id: 'batch-existing',
            title: 'Recital Part',
            filePath: '/tmp/batch-existing-recital.pdf',
          ),
          _score(
            now,
            id: 'batch-duplicate',
            title: 'Etude',
            filePath: '/tmp/batch-duplicate-etude.pdf',
          ),
        ],
      );
      await store.saveScores(<SheetScore>[
        _score(
          now,
          id: 'score-1',
          title: 'Recital Part',
          filePath: '/tmp/score-1-recital.pdf',
        ),
      ]);
      final controller = SheetLibraryController(store: store);
      await controller.load();

      final result = await controller.importPdfs();

      expect(result.importedCount, 2);
      expect(result.existingCount, 2);
      expect(result.importedScores.map((score) => score.title), <String>[
        'Etude',
        'Prelude',
      ]);
      expect(controller.scores, hasLength(3));
      expect(controller.lastImportOpenedExistingScore, isTrue);
    },
  );

  test('tracks imported scores that still need metadata review', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[
      _score(
        now,
        id: 'review-1',
        title: 'Fresh Scan',
        importedAt: now.add(const Duration(minutes: 2)),
      ),
      _score(now, id: 'ready-1', title: 'Edited Score', composer: 'Bach'),
      _score(
        now,
        id: 'review-2',
        title: 'Untitled PDF',
        importedAt: now.add(const Duration(minutes: 1)),
      ),
    ]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    expect(
      controller.scoresNeedingMetadataReview.map((score) => score.id),
      <String>['review-1', 'review-2'],
    );
  });

  test('uses collections as lightweight library profiles', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[
      _score(now, id: 'etude-1', title: 'Etude 1', collection: 'Etudes'),
      _score(now, id: 'etude-2', title: 'Etude 2', collection: 'Etudes'),
      _score(now, id: 'solo-1', title: 'Solo', collection: 'Solos'),
    ]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    expect(controller.allCollections, <String>['Etudes', 'Solos']);

    await controller.createCollectionLibrary('Warmups');
    expect(controller.libraryViewSettings.collectionQuery, 'Warmups');

    await controller.updateCollectionFilter('Etudes');
    expect(
      controller.filteredScores.map((score) => score.id),
      unorderedEquals(<String>['etude-1', 'etude-2']),
    );

    final renamedCount = await controller.renameCollectionLibrary(
      from: 'Etudes',
      to: 'Studies',
    );
    expect(renamedCount, 2);
    expect(controller.libraryViewSettings.collectionQuery, 'Studies');
    expect(controller.allCollections, <String>['Solos', 'Studies']);

    final clearedCount = await controller.clearCollectionLibrary('Studies');
    expect(clearedCount, 2);
    expect(controller.libraryViewSettings.collectionQuery, '');
    expect(
      controller.scores.where((score) => score.collection == 'Studies'),
      isEmpty,
    );
  });

  test('switches between separated library profile stores', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[
      _score(now, id: 'default-score', title: 'Default'),
    ]);
    final profile = await store.createLibraryProfile('Recital');
    await store.saveScores(<SheetScore>[
      _score(now, id: 'recital-score', title: 'Recital'),
    ]);
    await store.setActiveLibraryProfile(SheetLibraryProfile.defaultId);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    expect(controller.activeLibraryProfile.id, SheetLibraryProfile.defaultId);
    expect(controller.scores.single.id, 'default-score');

    await controller.switchLibraryProfile(profile.id);
    expect(controller.activeLibraryProfile.name, 'Recital');
    expect(controller.scores.single.id, 'recital-score');

    final didRename = await controller.renameLibraryProfile(
      id: profile.id,
      name: 'Recital 2026',
    );
    expect(didRename, isTrue);
    expect(controller.activeLibraryProfile.name, 'Recital 2026');

    final didClear = await controller.clearLibraryProfile(profile.id);
    expect(didClear, isTrue);
    expect(controller.scores, isEmpty);

    await controller.switchLibraryProfile(SheetLibraryProfile.defaultId);
    expect(controller.scores.single.id, 'default-score');
  });

  test('finds duplicate library profile names before create UX', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final store = SheetLibraryStore();
    final profile = await store.createLibraryProfile('Recital');
    final controller = SheetLibraryController(store: store);
    await controller.load();

    expect(controller.libraryProfileByName(' recital ')?.id, profile.id);
    expect(controller.libraryProfileByName('RECITAL')?.id, profile.id);
    expect(controller.libraryProfileByName('Lessons'), isNull);
    expect(controller.libraryProfileByName('   '), isNull);
  });

  test(
    'switches between linked score parts without editing originals',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime.parse('2026-08-20T10:00:00.000');
      final store = SheetLibraryStore();
      await store.saveScores(<SheetScore>[
        _score(
          now,
          linkedFiles: <SheetLinkedFile>[
            SheetLinkedFile(
              path: '/tmp/trumpet-part.pdf',
              type: 'pdf',
              label: 'Trumpet part',
              role: SheetLinkedFile.partRole,
              createdAt: now,
            ),
          ],
        ),
      ]);

      final controller = SheetLibraryController(store: store);
      await controller.load();

      final didSwitch = await controller.switchToLinkedFile(
        controller.scores.single,
        controller.scores.single.linkedFiles.single,
      );

      final updated = controller.scores.single;
      expect(didSwitch, isTrue);
      expect(updated.filePath, '/tmp/trumpet-part.pdf');
      expect(updated.linkedFiles.single.path, '/tmp/score-1.pdf');
      expect(updated.linkedFiles.single.role, SheetLinkedFile.editedCopyRole);
    },
  );

  test(
    'updates and removes linked file metadata without deleting files',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime.parse('2026-08-20T10:00:00.000');
      final store = SheetLibraryStore();
      final linkedFile = SheetLinkedFile(
        path: '/tmp/trumpet-part.pdf',
        type: 'pdf',
        label: 'Trumpet part',
        role: SheetLinkedFile.partRole,
        createdAt: now,
      );
      await store.saveScores(<SheetScore>[
        _score(now, linkedFiles: <SheetLinkedFile>[linkedFile]),
      ]);

      final controller = SheetLibraryController(store: store);
      await controller.load();

      final didUpdate = await controller.updateLinkedFile(
        controller.scores.single,
        linkedFile.copyWith(role: SheetLinkedFile.fullScoreRole),
      );
      expect(didUpdate, isTrue);
      expect(
        controller.scores.single.linkedFiles.single.role,
        SheetLinkedFile.fullScoreRole,
      );

      final didRemove = await controller.removeLinkedFile(
        controller.scores.single,
        controller.scores.single.linkedFiles.single,
      );
      expect(didRemove, isTrue);
      expect(controller.scores.single.linkedFiles, isEmpty);
      expect(controller.scores.single.filePath, '/tmp/score-1.pdf');
    },
  );

  test('updates structured notes for rehearsal and performance use', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[_score(now)]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    await controller.updateStructuredNotes(
      controller.scores.single,
      const SheetScoreNotes(
        performance: 'Stand light low.',
        rehearsal: 'Start from letter B.',
        tuning: 'Bb trumpet, A=442.',
        instrumentation: 'Trumpet and piano.',
      ),
    );

    expect(
      controller.scores.single.structuredNotes.performance,
      'Stand light low.',
    );
    expect(
      (await store.loadScores()).single.structuredNotes.tuning,
      'Bb trumpet, A=442.',
    );
  });

  test('tracks pinned, favorite, and recent quick access scores', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    final older = _score(now, id: 'older', title: 'Older', lastOpenedAt: now);
    final newer = _score(
      now,
      id: 'newer',
      title: 'Newer',
      isFavorite: true,
      lastOpenedAt: now.add(const Duration(minutes: 2)),
    );
    final pinned = _score(now, id: 'pinned', title: 'Pinned').copyWith(
      isPinned: true,
      lastOpenedAt: now.add(const Duration(minutes: 1)),
    );
    await store.saveScores(<SheetScore>[older, newer, pinned]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    expect(controller.recentScores.map((score) => score.id), <String>[
      'newer',
      'pinned',
      'older',
    ]);
    expect(controller.favoriteScores.single.id, 'newer');
    expect(controller.pinnedScores.single.id, 'pinned');

    await controller.togglePinned(controller.scoreById('older'));
    expect(controller.pinnedScores.map((score) => score.id), <String>[
      'pinned',
      'older',
    ]);
  });

  test('updates viewer and page settings', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[_score(now)]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    await controller.updateViewerSettings(
      controller.scores.single,
      const SheetViewerSettings(
        displayMode: 'continuousVertical',
        halfPageTurn: true,
        pageScale: SheetViewerSettings.fullscreenScale,
        pedalMapping: SheetViewerSettings.reversedPedalMapping,
        renderProfile: SheetViewerSettings.largePdfRenderProfile,
        pageTurnAnimation: SheetViewerSettings.noPageTurnAnimation,
        keepAwakeInPerformance: true,
        showPerformancePrepNotice: false,
        confirmSetlistTransition: false,
        autoAdvanceSetlist: true,
        allowPerformanceAnnotations: true,
        allowPerformanceMenus: true,
        allowPerformancePdfLinks: true,
      ),
    );
    expect(
      controller.scores.single.viewerSettings.displayMode,
      'continuousVertical',
    );
    expect(controller.scores.single.viewerSettings.halfPageTurn, isTrue);
    expect(
      controller.scores.single.viewerSettings.pageScale,
      SheetViewerSettings.fullscreenScale,
    );
    expect(
      controller.scores.single.viewerSettings.pedalMapping,
      SheetViewerSettings.reversedPedalMapping,
    );
    expect(
      controller.scores.single.viewerSettings.renderProfile,
      SheetViewerSettings.largePdfRenderProfile,
    );
    expect(
      controller.scores.single.viewerSettings.pageTurnAnimation,
      SheetViewerSettings.noPageTurnAnimation,
    );
    expect(
      controller.scores.single.viewerSettings.keepAwakeInPerformance,
      isTrue,
    );
    expect(
      controller.scores.single.viewerSettings.showPerformancePrepNotice,
      isFalse,
    );
    expect(
      controller.scores.single.viewerSettings.confirmSetlistTransition,
      isFalse,
    );
    expect(controller.scores.single.viewerSettings.autoAdvanceSetlist, isTrue);
    expect(
      controller.scores.single.viewerSettings.allowPerformanceAnnotations,
      isTrue,
    );
    expect(
      controller.scores.single.viewerSettings.allowPerformanceMenus,
      isTrue,
    );
    expect(
      controller.scores.single.viewerSettings.allowPerformancePdfLinks,
      isTrue,
    );

    await controller.updatePageCrop(
      controller.scores.single,
      const SheetCropSettings(top: 0.08, bottom: 0.12),
    );
    expect(controller.scores.single.pageSettings.crop.top, 0.08);
    expect(controller.scores.single.pageSettings.crop.bottom, 0.12);

    final didHide = await controller.hidePage(
      controller.scores.single,
      pageNumber: 2,
      pageCount: 4,
    );
    expect(didHide, isTrue);
    expect(controller.scores.single.pageSettings.hiddenPages, <int>[2]);

    final degrees = await controller.rotatePageClockwise(
      controller.scores.single,
      3,
    );
    expect(degrees, 90);
    expect(controller.scores.single.pageSettings.pageRotations[3], 90);

    await controller.unhidePage(controller.scores.single, 2);
    expect(controller.scores.single.pageSettings.hiddenPages, isEmpty);
  });

  test(
    'uses score metronome settings and persists updates as score snapshot',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime.parse('2026-08-20T10:00:00.000');
      final store = SheetLibraryStore();
      await store.saveMetronomeSettings(
        const SheetMetronomeSettings(
          bpm: 120,
          meter: SheetMetronomeMeter.fourFour,
        ),
      );
      await store.saveScores(<SheetScore>[
        _score(
          now,
          metronomeSettings: const SheetMetronomeSettings(
            bpm: 88,
            meter: SheetMetronomeMeter.threeFour,
          ),
        ),
      ]);

      final controller = SheetLibraryController(store: store);
      await controller.load();

      expect(
        controller.metronomeSettingsForScore(controller.scores.single).bpm,
        88,
      );

      await controller.updateMetronomeSettingsForScore(
        controller.scores.single,
        const SheetMetronomeSettings(
          bpm: 96,
          meter: SheetMetronomeMeter.sixEight,
          subdivision: SheetMetronomeSubdivision.eighth,
          countInBars: 2,
        ),
      );

      final updatedScore = controller.scores.single;
      expect(updatedScore.metronomeSettings?.bpm, 96);
      expect(
        updatedScore.metronomeSettings?.meter,
        SheetMetronomeMeter.sixEight,
      );
      expect(
        updatedScore.metronomeSettings?.subdivision,
        SheetMetronomeSubdivision.eighth,
      );
      expect(updatedScore.metronomeSettings?.countInBars, 2);
      expect(controller.metronomeSettings.bpm, 96);
      expect((await store.loadScores()).single.metronomeSettings?.bpm, 96);
      expect((await store.loadMetronomeSettings()).bpm, 96);
    },
  );

  test('uses setlist metronome override before score snapshot', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveMetronomeSettings(
      const SheetMetronomeSettings(
        bpm: 120,
        meter: SheetMetronomeMeter.fourFour,
      ),
    );
    await store.saveScores(<SheetScore>[
      _score(
        now,
        metronomeSettings: const SheetMetronomeSettings(
          bpm: 88,
          meter: SheetMetronomeMeter.threeFour,
        ),
      ),
    ]);
    await store.saveSetlists(<SheetSetlist>[
      SheetSetlist(
        id: 'setlist-1',
        title: 'Recital',
        scoreIds: const <String>['score-1'],
        createdAt: now,
        updatedAt: now,
        scoreMetronomeSettings: const <String, SheetMetronomeSettings>{
          'score-1': SheetMetronomeSettings(
            bpm: 72,
            meter: SheetMetronomeMeter.twoFour,
          ),
        },
      ),
    ]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    final score = controller.scoreById('score-1');
    expect(controller.metronomeSettingsForScore(score).bpm, 88);
    expect(
      controller.metronomeSettingsForScore(score, setlistId: 'setlist-1').bpm,
      72,
    );

    await controller.updateMetronomeSettingsForScore(
      score,
      const SheetMetronomeSettings(
        bpm: 96,
        meter: SheetMetronomeMeter.sixEight,
        subdivision: SheetMetronomeSubdivision.eighth,
        countInBars: 1,
      ),
      setlistId: 'setlist-1',
    );

    expect(controller.scoreById('score-1').metronomeSettings?.bpm, 88);
    final updatedSetlist = controller.setlistById('setlist-1');
    expect(updatedSetlist.scoreMetronomeSettings['score-1']?.bpm, 96);
    expect(
      updatedSetlist.scoreMetronomeSettings['score-1']?.meter,
      SheetMetronomeMeter.sixEight,
    );
    expect(
      updatedSetlist.scoreMetronomeSettings['score-1']?.subdivision,
      SheetMetronomeSubdivision.eighth,
    );
    expect(updatedSetlist.scoreMetronomeSettings['score-1']?.countInBars, 1);
    expect(controller.metronomeSettings.bpm, 96);
    expect((await store.loadScores()).single.metronomeSettings?.bpm, 88);
    expect(
      (await store.loadSetlists())
          .single
          .scoreMetronomeSettings['score-1']
          ?.bpm,
      96,
    );
    expect((await store.loadMetronomeSettings()).bpm, 96);
  });

  test(
    'compacts stale score page data after PDF page count is known',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime.parse('2026-08-20T10:00:00.000');
      final store = SheetLibraryStore();
      final score = _score(now).copyWith(
        pageSettings: SheetPageSettings(
          hiddenPages: const <int>[1, 2, 4],
          pageRotations: const <int, int>{2: 90, 4: 180},
          pageOrder: const <int>[1, 4, 3, 2, 3],
          jumpPoints: <SheetPageJumpPoint>[
            SheetPageJumpPoint(
              id: 'outside-target',
              sourcePage: 3,
              targetPage: 4,
              label: 'Outside',
              createdAt: now,
            ),
          ],
        ),
        annotationLayer: SheetAnnotationLayer(
          strokes: <SheetAnnotationStroke>[
            SheetAnnotationStroke(
              id: 'visible-stroke',
              pageNumber: 3,
              tool: SheetAnnotationTool.pen,
              color: 0xff111111,
              width: 3,
              points: const <SheetAnnotationPoint>[
                SheetAnnotationPoint(x: 0.1, y: 0.1),
                SheetAnnotationPoint(x: 0.2, y: 0.2),
              ],
              createdAt: now,
            ),
            SheetAnnotationStroke(
              id: 'stale-stroke',
              pageNumber: 4,
              tool: SheetAnnotationTool.pen,
              color: 0xff111111,
              width: 3,
              points: const <SheetAnnotationPoint>[
                SheetAnnotationPoint(x: 0.1, y: 0.1),
                SheetAnnotationPoint(x: 0.2, y: 0.2),
              ],
              createdAt: now.add(const Duration(seconds: 1)),
            ),
          ],
          texts: <SheetTextAnnotation>[
            SheetTextAnnotation(
              id: 'stale-text',
              pageNumber: 5,
              position: const SheetAnnotationPoint(x: 0.1, y: 0.1),
              text: 'Out of range',
              color: 0xff111111,
              fontSize: 18,
              createdAt: now.add(const Duration(seconds: 2)),
            ),
          ],
        ),
      );
      await store.saveScores(<SheetScore>[score]);

      final controller = SheetLibraryController(store: store);
      await controller.load();

      await controller.compactScoreForPageCount(controller.scores.single, 3);

      final updated = controller.scores.single;
      expect(updated.pageSettings.hiddenPages, <int>[1, 2]);
      expect(updated.pageSettings.pageRotations, <int, int>{2: 90});
      expect(updated.pageSettings.pageOrder, <int>[3, 3]);
      expect(updated.pageSettings.jumpPoints, isEmpty);
      expect(updated.annotationLayer.strokes.single.id, 'visible-stroke');
      expect(updated.annotationLayer.texts, isEmpty);
      expect((await store.loadScores()).single.pageSettings.pageOrder, <int>[
        3,
        3,
      ]);
      expect(
        (await store.loadScores()).single.annotationLayer.strokes.single.id,
        'visible-stroke',
      );
    },
  );

  test(
    'applies page rotation copy and preserves original as linked file',
    () async {
      final now = DateTime.parse('2026-08-20T10:00:00.000');
      final original = _score(now).copyWith(
        pageSettings: const SheetPageSettings(
          hiddenPages: <int>[],
          pageRotations: <int, int>{2: 90},
        ),
        linkedFiles: <SheetLinkedFile>[
          SheetLinkedFile(
            path: '/tmp/score-1.pdf',
            type: 'pdf',
            label: 'Existing original',
            createdAt: now,
          ),
          SheetLinkedFile(
            path: '/tmp/part.pdf',
            type: 'pdf',
            label: 'Part',
            createdAt: now,
          ),
        ],
      );
      final store = _PageRotationCopyStore(
        scores: <SheetScore>[original],
        result: const SheetPdfPageRotationResult(
          inputPath: '/tmp/score-1.pdf',
          outputPath: '/tmp/score-1-rotated.pdf',
          pageCount: 4,
          rotatedPageCount: 1,
          didWrite: true,
        ),
      );
      final controller = SheetLibraryController(store: store);
      await controller.load();

      final result = await controller.createPageRotationAppliedCopy(
        controller.scores.single,
      );
      final updated = controller.scores.single;

      expect(result.didWrite, isTrue);
      expect(updated.filePath, '/tmp/score-1-rotated.pdf');
      expect(updated.pageSettings.pageRotations, isEmpty);
      expect(updated.linkedFiles, hasLength(2));
      expect(updated.linkedFiles.first.path, '/tmp/score-1.pdf');
      expect(updated.linkedFiles.first.label, '회전 적용 전 원본');
      expect(updated.linkedFiles.last.label, 'Part');
      expect(store.savedScores.single.filePath, updated.filePath);
    },
  );

  test('applies page crop copy and clears crop metadata', () async {
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final stroke = SheetAnnotationStroke(
      id: 'stroke-1',
      pageNumber: 1,
      tool: SheetAnnotationTool.pen,
      color: 0xff111111,
      width: 3,
      points: const <SheetAnnotationPoint>[
        SheetAnnotationPoint(x: 0.2, y: 0.2),
      ],
      createdAt: now,
    );
    final text = SheetTextAnnotation(
      id: 'text-1',
      pageNumber: 2,
      position: const SheetAnnotationPoint(x: 0.5, y: 0.5),
      text: 'Cue',
      color: 0xff111111,
      fontSize: 18,
      createdAt: now.add(const Duration(seconds: 1)),
    );
    final original = _score(now).copyWith(
      pageSettings: const SheetPageSettings(
        hiddenPages: <int>[],
        pageRotations: <int, int>{},
        crop: SheetCropSettings(top: 0.08),
        pageCrops: <int, SheetCropSettings>{2: SheetCropSettings(bottom: 0.12)},
      ),
      annotationLayer: SheetAnnotationLayer(
        strokes: <SheetAnnotationStroke>[stroke],
        texts: <SheetTextAnnotation>[text],
        redoStack: <SheetAnnotationRedoEntry>[
          SheetAnnotationRedoEntry.stroke(stroke),
        ],
      ),
      linkedFiles: <SheetLinkedFile>[
        SheetLinkedFile(
          path: '/tmp/score-1.pdf',
          type: 'pdf',
          label: 'Existing original',
          createdAt: now,
        ),
        SheetLinkedFile(
          path: '/tmp/part.pdf',
          type: 'pdf',
          label: 'Part',
          createdAt: now,
        ),
      ],
    );
    final store = _PageCropCopyStore(
      scores: <SheetScore>[original],
      result: const SheetPdfPageCropResult(
        inputPath: '/tmp/score-1.pdf',
        outputPath: '/tmp/score-1-cropped.pdf',
        pageCount: 4,
        croppedPageCount: 4,
        didWrite: true,
      ),
    );
    final controller = SheetLibraryController(store: store);
    await controller.load();

    final result = await controller.createPageCropAppliedCopy(
      controller.scores.single,
    );
    final updated = controller.scores.single;

    expect(result.didWrite, isTrue);
    expect(updated.filePath, '/tmp/score-1-cropped.pdf');
    expect(updated.pageSettings.crop.hasCrop, isFalse);
    expect(updated.pageSettings.pageCrops, isEmpty);
    expect(
      updated.annotationLayer.strokes.single.points.single.y,
      moreOrLessEquals((0.2 - 0.08) / 0.92),
    );
    expect(
      updated.annotationLayer.texts.single.position.y,
      moreOrLessEquals(0.5 / 0.88),
    );
    expect(
      updated.annotationLayer.redoStack.single.stroke!.points.single.y,
      moreOrLessEquals((0.2 - 0.08) / 0.92),
    );
    expect(updated.linkedFiles, hasLength(2));
    expect(updated.linkedFiles.first.path, '/tmp/score-1.pdf');
    expect(updated.linkedFiles.first.label, '자르기 적용 전 원본');
    expect(updated.linkedFiles.last.label, 'Part');
    expect(store.savedScores.single.filePath, updated.filePath);
  });

  test('applies page arrangement copy and remaps page metadata', () async {
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final stroke = SheetAnnotationStroke(
      id: 'stroke-3',
      pageNumber: 3,
      tool: SheetAnnotationTool.pen,
      color: 0xff111111,
      width: 3,
      points: const <SheetAnnotationPoint>[
        SheetAnnotationPoint(x: 0.2, y: 0.2),
      ],
      createdAt: now,
    );
    final original = _score(now).copyWith(
      lastPage: 3,
      bookmarks: <SheetBookmark>[
        SheetBookmark(pageNumber: 3, label: 'Solo', createdAt: now),
      ],
      pageSettings: SheetPageSettings(
        hiddenPages: const <int>[2],
        pageRotations: const <int, int>{3: 90},
        pageCrops: const <int, SheetCropSettings>{
          3: SheetCropSettings(left: 0.04),
        },
        pageOrder: const <int>[3, 1, 3, 2],
        instanceRotations: const <int, int>{2: 180},
        instanceCrops: const <int, SheetCropSettings>{
          2: SheetCropSettings(bottom: 0.05),
        },
        jumpPoints: <SheetPageJumpPoint>[
          SheetPageJumpPoint(
            id: 'jump-1',
            sourcePage: 1,
            targetPage: 3,
            label: 'Solo',
            createdAt: now,
          ),
        ],
        rehearsalMarks: <SheetRehearsalMark>[
          SheetRehearsalMark(
            id: 'mark-1',
            pageNumber: 3,
            label: 'A',
            kind: SheetRehearsalMark.rehearsalKind,
            createdAt: now,
          ),
        ],
        blankPageInsertions: <SheetBlankPageInsertion>[
          SheetBlankPageInsertion(
            id: 'blank-1',
            afterPage: 1,
            label: 'Notes',
            createdAt: now,
          ),
        ],
        visibilityPresets: <SheetPageVisibilityPreset>[
          SheetPageVisibilityPreset(
            id: 'visibility-1',
            label: 'Hide 2',
            hiddenPages: const <int>[2],
            createdAt: now,
          ),
        ],
      ),
      annotationLayer: SheetAnnotationLayer(
        strokes: <SheetAnnotationStroke>[stroke],
        texts: <SheetTextAnnotation>[
          SheetTextAnnotation(
            id: 'text-3',
            pageNumber: 3,
            position: const SheetAnnotationPoint(x: 0.4, y: 0.5),
            text: 'Solo',
            color: 0xff222222,
            fontSize: 20,
            createdAt: now,
          ),
        ],
        redoStack: <SheetAnnotationRedoEntry>[
          SheetAnnotationRedoEntry.stroke(stroke),
        ],
      ),
    );
    final store = _PageArrangementCopyStore(
      scores: <SheetScore>[original],
      result: const SheetPdfPageArrangementResult(
        inputPath: '/tmp/score-1.pdf',
        outputPath: '/tmp/score-1-arranged.pdf',
        sourcePageCount: 3,
        outputPageCount: 4,
        insertedBlankPageCount: 1,
        didWrite: true,
        sourcePageMapping: <int, List<int>>{
          3: <int>[1, 4],
          1: <int>[2],
        },
        pageRotations: <int, int>{1: 90, 4: 180},
        pageCrops: <int, SheetCropSettings>{
          1: SheetCropSettings(left: 0.04),
          4: SheetCropSettings(bottom: 0.05),
        },
        blankPageNumbers: <int>[3],
      ),
    );
    final controller = SheetLibraryController(store: store);
    await controller.load();

    final result = await controller.createPageArrangementAppliedCopy(
      controller.scores.single,
    );
    final updated = controller.scores.single;

    expect(result.didWrite, isTrue);
    expect(updated.filePath, '/tmp/score-1-arranged.pdf');
    expect(updated.lastPage, 1);
    expect(updated.bookmarks.single.pageNumber, 1);
    expect(updated.pageSettings.hiddenPages, isEmpty);
    expect(updated.pageSettings.pageOrder, isEmpty);
    expect(updated.pageSettings.instanceRotations, isEmpty);
    expect(updated.pageSettings.instanceCrops, isEmpty);
    expect(updated.pageSettings.blankPageInsertions, isEmpty);
    expect(updated.pageSettings.visibilityPresets, isEmpty);
    expect(updated.pageSettings.pageRotations, <int, int>{1: 90, 4: 180});
    expect(updated.pageSettings.pageCrops.keys, <int>[1, 4]);
    expect(updated.pageSettings.pageCrops[4]?.bottom, 0.05);
    expect(updated.pageSettings.jumpPoints.single.sourcePage, 2);
    expect(updated.pageSettings.jumpPoints.single.targetPage, 1);
    expect(updated.pageSettings.rehearsalMarks.single.pageNumber, 1);
    expect(
      updated.annotationLayer.strokes.map((stroke) => stroke.pageNumber),
      <int>[1, 4],
    );
    expect(updated.annotationLayer.strokes.map((stroke) => stroke.id), <String>[
      'stroke-3-page1',
      'stroke-3-page4',
    ]);
    expect(updated.annotationLayer.texts.map((text) => text.pageNumber), <int>[
      1,
      4,
    ]);
    expect(updated.annotationLayer.texts.map((text) => text.id), <String>[
      'text-3-page1',
      'text-3-page4',
    ]);
    expect(
      updated.annotationLayer.redoStack.map((entry) => entry.pageNumber),
      <int>[1, 4],
    );
    expect(updated.linkedFiles.first.label, '페이지 정리 적용 전 원본');
    expect(store.savedScores.single.filePath, updated.filePath);
  });

  test('updates virtual page order settings', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[_score(now)]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    final didMove = await controller.movePageInOrder(
      controller.scores.single,
      fromIndex: 3,
      toIndex: 1,
      pageCount: 4,
    );
    expect(didMove, isTrue);
    expect(controller.scores.single.pageSettings.pageOrder, <int>[1, 4, 2, 3]);

    final didDuplicate = await controller.duplicatePageInOrder(
      controller.scores.single,
      pageNumber: 4,
      pageCount: 4,
      orderIndex: 1,
    );
    expect(didDuplicate, isTrue);
    expect(controller.scores.single.pageSettings.pageOrder, <int>[
      1,
      4,
      4,
      2,
      3,
    ]);

    final didReset = await controller.resetPageOrder(controller.scores.single);
    expect(didReset, isTrue);
    expect(controller.scores.single.pageSettings.pageOrder, isEmpty);
  });

  test('updates page jump points', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[_score(now)]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    final didAdd = await controller.addPageJumpPoint(
      controller.scores.single,
      pageCount: 4,
      jumpPoint: SheetPageJumpPoint(
        id: 'jump-1',
        sourcePage: 1,
        targetPage: 4,
        label: 'Coda',
        createdAt: now,
      ),
    );
    expect(didAdd, isTrue);
    expect(
      controller.scores.single.pageSettings.jumpPoints.single.targetPage,
      4,
    );

    final didIgnoreInvalid = await controller.addPageJumpPoint(
      controller.scores.single,
      pageCount: 4,
      jumpPoint: SheetPageJumpPoint(
        id: 'jump-invalid',
        sourcePage: 2,
        targetPage: 2,
        label: 'Same',
        createdAt: now,
      ),
    );
    expect(didIgnoreInvalid, isFalse);

    final didRename = await controller.updatePageJumpPoint(
      controller.scores.single,
      pageCount: 4,
      jumpPoint: controller.scores.single.pageSettings.jumpPoints.single
          .copyWith(label: 'D.S. al Coda'),
    );
    expect(didRename, isTrue);
    expect(
      controller.scores.single.pageSettings.jumpPoints.single.label,
      'D.S. al Coda',
    );

    final didRemove = await controller.removePageJumpPoint(
      controller.scores.single,
      'jump-1',
    );
    expect(didRemove, isTrue);
    expect(controller.scores.single.pageSettings.jumpPoints, isEmpty);
  });

  test(
    'updates rehearsal marks, crop presets, and page template metadata',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime.parse('2026-08-20T10:00:00.000');
      final store = SheetLibraryStore();
      await store.saveScores(<SheetScore>[_score(now)]);

      final controller = SheetLibraryController(store: store);
      await controller.load();

      final didAddMark = await controller.addRehearsalMark(
        controller.scores.single,
        pageCount: 4,
        mark: SheetRehearsalMark(
          id: 'mark-1',
          pageNumber: 3,
          label: 'D.S.',
          kind: SheetRehearsalMark.dsKind,
          createdAt: now,
        ),
      );
      expect(didAddMark, isTrue);
      expect(
        controller.scores.single.pageSettings.rehearsalMarks.single.kind,
        'ds',
      );

      final didUpdateMark = await controller.updateRehearsalMark(
        controller.scores.single,
        pageCount: 4,
        mark: controller.scores.single.pageSettings.rehearsalMarks.single
            .copyWith(label: 'D.S. al Coda', pageNumber: 4),
      );
      expect(didUpdateMark, isTrue);
      expect(
        controller.scores.single.pageSettings.rehearsalMarks.single.pageNumber,
        4,
      );

      final didAddCrop = await controller.addCropPreset(
        controller.scores.single,
        SheetCropPreset(
          id: 'crop-1',
          label: 'Landscape tablet',
          scope: SheetCropPreset.allPagesScope,
          crop: const SheetCropSettings(top: 0.07),
          createdAt: now,
        ),
      );
      expect(didAddCrop, isTrue);

      final didApplyCrop = await controller.applyCropPreset(
        controller.scores.single,
        'crop-1',
      );
      expect(didApplyCrop, isTrue);
      expect(controller.scores.single.pageSettings.crop.top, 0.07);

      final didRemoveCrop = await controller.removeCropPreset(
        controller.scores.single,
        'crop-1',
      );
      expect(didRemoveCrop, isTrue);
      expect(controller.scores.single.pageSettings.cropPresets, isEmpty);

      final didAddBlankPage = await controller.addBlankPageInsertion(
        controller.scores.single,
        pageCount: 4,
        insertion: SheetBlankPageInsertion(
          id: 'blank-1',
          afterPage: 2,
          label: 'Notes',
          createdAt: now,
        ),
      );
      expect(didAddBlankPage, isTrue);

      final didAddVisibility = await controller.addVisibilityPreset(
        controller.scores.single,
        pageCount: 4,
        preset: SheetPageVisibilityPreset(
          id: 'visibility-1',
          label: 'No cover',
          hiddenPages: const <int>[1],
          createdAt: now,
        ),
      );
      expect(didAddVisibility, isTrue);

      final didApplyVisibility = await controller.applyVisibilityPreset(
        controller.scores.single,
        presetId: 'visibility-1',
        pageCount: 4,
      );
      expect(didApplyVisibility, isTrue);
      expect(controller.scores.single.pageSettings.hiddenPages, <int>[1]);

      final didRemoveBlankPage = await controller.removeBlankPageInsertion(
        controller.scores.single,
        'blank-1',
      );
      expect(didRemoveBlankPage, isTrue);

      final didRemoveVisibility = await controller.removeVisibilityPreset(
        controller.scores.single,
        'visibility-1',
      );
      expect(didRemoveVisibility, isTrue);
      expect(
        controller.scores.single.pageSettings.blankPageInsertions,
        isEmpty,
      );
      expect(controller.scores.single.pageSettings.visibilityPresets, isEmpty);
    },
  );

  test('merges PDF outline bookmarks without duplicate pages', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[
      _score(
        now,
        bookmarks: <SheetBookmark>[
          SheetBookmark(pageNumber: 2, label: 'Existing', createdAt: now),
        ],
      ),
    ]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    final didMerge = await controller.mergeBookmarksFromOutline(
      controller.scores.single,
      <SheetBookmark>[
        SheetBookmark(pageNumber: 1, label: 'Intro', createdAt: now),
        SheetBookmark(pageNumber: 2, label: 'Duplicate', createdAt: now),
        SheetBookmark(pageNumber: 4, label: 'Coda', createdAt: now),
      ],
    );

    expect(didMerge, isTrue);
    expect(
      controller.scores.single.bookmarks.map((bookmark) => bookmark.label),
      <String>['Intro', 'Existing', 'Coda'],
    );
  });

  test('imports CSV bookmarks and skips existing pages', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = _BookmarkCsvStore(<SheetBookmark>[
      SheetBookmark(pageNumber: 1, label: 'Intro', createdAt: now),
      SheetBookmark(pageNumber: 2, label: 'Duplicate', createdAt: now),
      SheetBookmark(pageNumber: 4, label: 'Coda', createdAt: now),
    ]);
    await store.saveScores(<SheetScore>[
      _score(
        now,
        bookmarks: <SheetBookmark>[
          SheetBookmark(pageNumber: 2, label: 'Existing', createdAt: now),
        ],
      ),
    ]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    final addedCount = await controller.importBookmarksFromCsv(
      controller.scores.single,
      pageCount: 4,
    );

    expect(addedCount, 2);
    expect(
      controller.scores.single.bookmarks.map((bookmark) => bookmark.label),
      <String>['Intro', 'Existing', 'Coda'],
    );
  });

  test('creates songbook score entries from bookmark ranges', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[
      _score(
        now,
        title: 'Real Book',
        composer: 'Various',
        tags: const <String>['jazz'],
        collection: 'Gig book',
        filePath: '/tmp/real-book.pdf',
        bookmarks: <SheetBookmark>[
          SheetBookmark(pageNumber: 1, label: 'Autumn Leaves', createdAt: now),
          SheetBookmark(pageNumber: 4, label: 'Blue Bossa', createdAt: now),
          SheetBookmark(pageNumber: 7, label: 'C Jam Blues', createdAt: now),
        ],
      ).copyWith(
        pageSettings: SheetPageSettings.empty.copyWith(
          instanceRotations: const <int, int>{0: 90},
          instanceCrops: const <int, SheetCropSettings>{
            0: SheetCropSettings(left: 0.1),
          },
        ),
      ),
    ]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    final result = await controller.createScoresFromBookmarks(
      controller.scores.single,
      pageCount: 10,
    );

    expect(result.createdCount, 3);
    expect(result.skippedDuplicateCount, 0);
    expect(controller.scores, hasLength(4));
    expect(result.createdScores.map((score) => score.title), <String>[
      'Real Book - Autumn Leaves',
      'Real Book - Blue Bossa',
      'Real Book - C Jam Blues',
    ]);
    expect(
      result.createdScores.map((score) => score.pageSettings.pageOrder),
      <List<int>>[
        <int>[1, 2, 3],
        <int>[4, 5, 6],
        <int>[7, 8, 9, 10],
      ],
    );
    expect(result.createdScores.first.filePath, '/tmp/real-book.pdf');
    expect(result.createdScores.first.composer, 'Various');
    expect(result.createdScores.first.tags, <String>['jazz']);
    expect(result.createdScores.first.collection, 'Gig book');
    expect(result.createdScores.first.lastPage, 1);
    expect(result.createdScores.first.pageSettings.instanceRotations, isEmpty);
    expect(result.createdScores.first.pageSettings.instanceCrops, isEmpty);
  });

  test(
    'skips duplicate songbook score entries for the same source range',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime.parse('2026-08-20T10:00:00.000');
      final source = _score(
        now,
        title: 'Binder',
        filePath: '/tmp/binder.pdf',
        bookmarks: <SheetBookmark>[
          SheetBookmark(pageNumber: 2, label: 'March', createdAt: now),
          SheetBookmark(pageNumber: 5, label: 'Finale', createdAt: now),
        ],
      );
      final store = SheetLibraryStore();
      await store.saveScores(<SheetScore>[source]);

      final controller = SheetLibraryController(store: store);
      await controller.load();

      final first = await controller.createScoresFromBookmarks(
        source,
        pageCount: 6,
      );
      final second = await controller.createScoresFromBookmarks(
        source,
        pageCount: 6,
      );

      expect(first.createdCount, 2);
      expect(second.createdCount, 0);
      expect(second.skippedDuplicateCount, 2);
      expect(controller.scores, hasLength(3));
    },
  );

  test(
    'songbook entries keep navigation and auto-scroll inside their movement',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime(2026, 9, 13);
      final source =
          _score(
            now,
            title: 'Book',
            bookmarks: <SheetBookmark>[
              SheetBookmark(pageNumber: 3, label: 'First', createdAt: now),
              SheetBookmark(pageNumber: 6, label: 'Second', createdAt: now),
            ],
          ).copyWith(
            pageSettings: SheetPageSettings.empty.copyWith(
              hiddenPages: <int>[3],
              jumpPoints: <SheetPageJumpPoint>[
                SheetPageJumpPoint(
                  id: 'inside',
                  sourcePage: 4,
                  targetPage: 5,
                  label: 'A',
                  createdAt: now,
                ),
                SheetPageJumpPoint(
                  id: 'outside',
                  sourcePage: 5,
                  targetPage: 7,
                  label: 'B',
                  createdAt: now,
                ),
              ],
              rehearsalMarks: <SheetRehearsalMark>[
                SheetRehearsalMark(
                  id: 'a',
                  pageNumber: 4,
                  label: 'A',
                  kind: 'rehearsal',
                  createdAt: now,
                ),
                SheetRehearsalMark(
                  id: 'b',
                  pageNumber: 7,
                  label: 'B',
                  kind: 'rehearsal',
                  createdAt: now,
                ),
              ],
            ),
            autoScrollSettings: SheetAutoScrollSettings.defaultSettings
                .copyWith(
                  pausePageNumbers: <int>[4, 7],
                  pageDurations: <int, int>{4: 60, 7: 80},
                ),
          );
      final store = SheetLibraryStore();
      await store.saveScores(<SheetScore>[source]);
      final controller = SheetLibraryController(store: store);
      await controller.load();
      final result = await controller.createScoresFromBookmarks(
        source,
        pageCount: 9,
      );
      final first = result.createdScores.first;
      expect(first.lastPage, 4);
      expect(first.pageSettings.visiblePages(9), <int>[4, 5]);
      expect(first.pageSettings.effectivePageOrder(9), <int>[4, 5]);
      expect(
        first.pageSettings.closestVisiblePage(fromPage: 7, pageCount: 9),
        5,
      );
      expect(first.pageSettings.jumpPoints.map((point) => point.id), <String>[
        'inside',
      ]);
      expect(first.pageSettings.rehearsalMarks.map((mark) => mark.id), <String>[
        'a',
      ]);
      final plan = first.autoScrollSettings.plan(currentPage: 4, pageCount: 9);
      expect(plan.startPage, 4);
      expect(plan.endPage, 5);
      expect(first.autoScrollSettings.pausePageNumbers, <int>[4]);
      expect(first.autoScrollSettings.pageDurations, <int, int>{4: 60});
      await controller.compactScoreForPageCount(first, 9);
      await controller.load();
      final repeated = await controller.createScoresFromBookmarks(
        source,
        pageCount: 9,
      );
      expect(repeated.createdCount, 0);
      expect(repeated.skippedDuplicateCount, 2);
      expect(controller.scoreById(source.id).toJson(), source.toJson());
    },
  );

  test(
    'songbook movement with every page hidden retains one in-range page',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime(2026, 9, 13);
      final source =
          _score(
            now,
            bookmarks: <SheetBookmark>[
              SheetBookmark(
                pageNumber: 2,
                label: 'Hidden movement',
                createdAt: now,
              ),
              SheetBookmark(pageNumber: 4, label: 'Next', createdAt: now),
            ],
          ).copyWith(
            pageSettings: SheetPageSettings.empty.copyWith(
              hiddenPages: <int>[2, 3],
            ),
          );
      final store = SheetLibraryStore();
      await store.saveScores(<SheetScore>[source]);
      final controller = SheetLibraryController(store: store);
      await controller.load();
      final result = await controller.createScoresFromBookmarks(
        source,
        pageCount: 5,
      );
      final first = result.createdScores.first;
      expect(first.lastPage, 2);
      expect(first.pageSettings.visiblePages(5), <int>[2]);
      expect(first.pageSettings.effectivePageOrder(5), <int>[2]);
      expect(controller.scoreById(source.id).pageSettings.hiddenPages, <int>[
        2,
        3,
      ]);
    },
  );

  test(
    'songbook copies in-range annotations independently without edit history',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime(2026, 9, 13);
      SheetAnnotationStroke stroke(int page) => SheetAnnotationStroke(
        id: 'stroke-$page',
        pageNumber: page,
        tool: SheetAnnotationTool.pen,
        color: 0xff112233,
        width: 3,
        points: const <SheetAnnotationPoint>[
          SheetAnnotationPoint(x: 0.1, y: 0.2),
          SheetAnnotationPoint(x: 0.2, y: 0.3),
        ],
        createdAt: now,
      );
      SheetTextAnnotation text(int page) => SheetTextAnnotation(
        id: 'text-$page',
        pageNumber: page,
        position: const SheetAnnotationPoint(x: 0.2, y: 0.3),
        text: 'Practice $page',
        color: 0xff112233,
        fontSize: 16,
        createdAt: now,
      );
      final source =
          _score(
            now,
            bookmarks: <SheetBookmark>[
              SheetBookmark(pageNumber: 2, label: 'First', createdAt: now),
              SheetBookmark(pageNumber: 4, label: 'Second', createdAt: now),
            ],
          ).copyWith(
            pageSettings: SheetPageSettings.empty.copyWith(
              hiddenPages: <int>[2],
            ),
            annotationLayer: SheetAnnotationLayer(
              strokes: <SheetAnnotationStroke>[stroke(1), stroke(2), stroke(4)],
              texts: <SheetTextAnnotation>[text(3), text(5)],
              redoStack: <SheetAnnotationRedoEntry>[
                SheetAnnotationRedoEntry.stroke(stroke(3)),
              ],
              eraseUndoStack: <SheetAnnotationRedoEntry>[
                SheetAnnotationRedoEntry.eraseText(text(2)),
              ],
              layers: <SheetAnnotationDisplayLayer>[
                SheetAnnotationDisplayLayer.defaultLayer.copyWith(
                  isVisible: false,
                  includeInExport: false,
                ),
              ],
            ),
            annotationStorage: const SheetAnnotationStorageReference(
              mode: SheetAnnotationStorageReference.fileMode,
              path: '/tmp/source-marks.json',
            ),
          );
      final store = SheetLibraryStore();
      await store.saveScores(<SheetScore>[source]);
      final controller = SheetLibraryController(store: store);
      await controller.load();
      final result = await controller.createScoresFromBookmarks(
        source,
        pageCount: 5,
      );
      final first = result.createdScores.first;
      final second = result.createdScores.last;
      expect(
        first.annotationLayer.strokes.map((stroke) => stroke.pageNumber),
        <int>[2],
      );
      expect(first.annotationLayer.texts.map((text) => text.pageNumber), <int>[
        3,
      ]);
      expect(
        second.annotationLayer.strokes.map((stroke) => stroke.pageNumber),
        <int>[4],
      );
      expect(second.annotationLayer.texts.map((text) => text.pageNumber), <int>[
        5,
      ]);
      expect(first.annotationLayer.redoStack, isEmpty);
      expect(first.annotationLayer.eraseUndoStack, isEmpty);
      expect(first.annotationLayer.isDefaultLayerVisible, isFalse);
      expect(first.annotationLayer.includeDefaultLayerInExport, isFalse);
      expect(first.annotationStorage.isFileBacked, isFalse);
      expect(first.annotationStorage.path, isEmpty);
      await controller.removeTextAnnotation(first, 'text-3');
      await controller.load();
      expect(controller.scoreById(first.id).annotationLayer.texts, isEmpty);
      expect(
        controller.scoreById(source.id).annotationLayer.toJson(),
        source.annotationLayer.toJson(),
      );
      expect(
        controller.scoreById(second.id).annotationLayer.texts.single.text,
        'Practice 5',
      );
    },
  );

  test('updates metronome settings', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final store = SheetLibraryStore();
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await controller.updateMetronomeSettings(
      const SheetMetronomeSettings(
        bpm: 144,
        meter: SheetMetronomeMeter.twoFour,
      ),
    );

    expect(controller.metronomeSettings.bpm, 144);
    expect(controller.metronomeSettings.meter, SheetMetronomeMeter.twoFour);
    expect((await store.loadMetronomeSettings()).bpm, 144);
  });

  test('updates tuner settings', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final store = SheetLibraryStore();
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await controller.updateTunerSettings(
      const SheetTunerSettings(
        referencePitchA4: 442,
        displayMode: SheetTunerDisplayMode.bbTrumpet,
        detectionProfile: SheetTunerDetectionProfile.bbTrumpet,
        detectionAlgorithm: SheetTunerPitchDetectionAlgorithm.yin,
        notationPreference: SheetTunerNotationPreference.flats,
      ),
    );

    expect(controller.tunerSettings.referencePitchA4, 442);
    expect(
      controller.tunerSettings.displayMode,
      SheetTunerDisplayMode.bbTrumpet,
    );
    expect(
      controller.tunerSettings.detectionProfile,
      SheetTunerDetectionProfile.bbTrumpet,
    );
    expect(
      controller.tunerSettings.detectionAlgorithm,
      SheetTunerPitchDetectionAlgorithm.yin,
    );
    expect(
      controller.tunerSettings.notationPreference,
      SheetTunerNotationPreference.flats,
    );
    expect((await store.loadTunerSettings()).referencePitchA4, 442);
    expect(
      (await store.loadTunerSettings()).displayMode,
      SheetTunerDisplayMode.bbTrumpet,
    );
    expect(
      (await store.loadTunerSettings()).detectionProfile,
      SheetTunerDetectionProfile.bbTrumpet,
    );
    expect(
      (await store.loadTunerSettings()).detectionAlgorithm,
      SheetTunerPitchDetectionAlgorithm.yin,
    );
  });

  test('updates tone settings', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final store = SheetLibraryStore();
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await controller.updateToneSettings(
      const SheetToneSettings(
        rootConcertMidiNumber: 60,
        droneMode: SheetToneDroneMode.fifthOctave,
        volumePercent: 45,
      ),
    );

    expect(controller.toneSettings.rootConcertMidiNumber, 60);
    expect(controller.toneSettings.droneMode, SheetToneDroneMode.fifthOctave);
    expect(controller.toneSettings.volumePercent, 45);
    expect((await store.loadToneSettings()).rootConcertMidiNumber, 60);
    expect(
      (await store.loadToneSettings()).droneMode,
      SheetToneDroneMode.fifthOctave,
    );
  });

  test('updates and loads favorite annotation tool preset', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final store = SheetLibraryStore();
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await controller.updateFavoriteAnnotationPreset(
      const SheetAnnotationToolPreset(
        toolName: 'rectangle',
        color: 0xff1d5fd1,
        width: 6,
      ),
    );

    expect(controller.favoriteAnnotationPreset?.toolName, 'rectangle');
    expect((await store.loadFavoriteAnnotationPreset())?.color, 0xff1d5fd1);

    final nextController = SheetLibraryController(store: store);
    await nextController.load();
    expect(nextController.favoriteAnnotationPreset?.width, 6);

    await nextController.updateFavoriteAnnotationPreset(
      const SheetAnnotationToolPreset(
        toolName: 'laser',
        color: 0xff1d5fd1,
        width: 6,
      ),
    );
    expect(nextController.favoriteAnnotationPreset, isNull);
    expect(await store.loadFavoriteAnnotationPreset(), isNull);
  });

  test('clears library query and filters for empty result recovery', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[
      _score(
        now,
        id: 'score-a',
        title: 'Arban',
        composer: 'Arban',
        tags: const <String>['trumpet'],
        collection: 'Methods',
        group: 'Warmup',
        rating: 4,
      ),
    ]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    controller.updateQuery('bach');
    await controller.updateFavoriteFilter(true);
    await controller.updateTagFilter('lesson');
    await controller.updateComposerFilter('Arban');
    await controller.updateCollectionFilter('Methods');
    await controller.updateGroupFilter('Warmup');
    await controller.updateMinimumRatingFilter(3);
    await controller.updateCustomFieldFilter('조성', 'D');

    expect(controller.filteredScores, isEmpty);

    await controller.clearLibrarySearchAndFilters();

    expect(controller.query, isEmpty);
    expect(controller.libraryViewSettings.favoriteOnly, isFalse);
    expect(controller.libraryViewSettings.tagQuery, isEmpty);
    expect(controller.libraryViewSettings.composerQuery, isEmpty);
    expect(controller.libraryViewSettings.collectionQuery, isEmpty);
    expect(controller.libraryViewSettings.groupQuery, isEmpty);
    expect(controller.libraryViewSettings.minimumRating, 0);
    expect(controller.libraryViewSettings.customFieldFilters, isEmpty);
    expect(controller.filteredScores.single.title, 'Arban');
  });

  test('updates score auto scroll settings', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[_score(now)]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    await controller.updateAutoScrollSettings(
      controller.scores.single,
      const SheetAutoScrollSettings(
        durationSeconds: 300,
        startPage: 2,
        endPage: 10,
        cueSeconds: 5,
      ),
    );

    final settings = controller.scores.single.autoScrollSettings;
    expect(settings.durationSeconds, 300);
    expect(settings.startPage, 2);
    expect(settings.endPage, 10);
    expect(settings.cueSeconds, 5);
    expect((await store.loadScores()).single.autoScrollSettings.endPage, 10);
    expect((await store.loadScores()).single.autoScrollSettings.cueSeconds, 5);
  });

  test('adds, erases, and undoes annotation strokes', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[_score(now)]);

    final controller = SheetLibraryController(store: store);
    await controller.load();
    final stroke = SheetAnnotationStroke(
      id: 'stroke-1',
      pageNumber: 1,
      tool: SheetAnnotationTool.pen,
      color: 0xff111111,
      width: 3,
      points: const <SheetAnnotationPoint>[
        SheetAnnotationPoint(x: 0.1, y: 0.1),
        SheetAnnotationPoint(x: 0.6, y: 0.1),
      ],
      createdAt: now,
    );

    await controller.addAnnotationStroke(controller.scores.single, stroke);
    expect(controller.scores.single.annotationLayer.strokes, hasLength(1));

    final didErase = await controller.eraseAnnotationAt(
      controller.scores.single,
      pageNumber: 1,
      point: const SheetAnnotationPoint(x: 0.2, y: 0.1),
      tolerance: 0.03,
    );
    expect(didErase, isTrue);
    expect(controller.scores.single.annotationLayer.strokes, isEmpty);

    final didUndoErase = await controller.undoLastAnnotation(
      controller.scores.single,
      1,
    );
    expect(didUndoErase, isTrue);
    expect(
      controller.scores.single.annotationLayer.strokes.single.id,
      stroke.id,
    );

    await controller.addAnnotationStroke(controller.scores.single, stroke);
    final didUndo = await controller.undoLastAnnotationStroke(
      controller.scores.single,
      1,
    );
    expect(didUndo, isTrue);
    expect(controller.scores.single.annotationLayer.strokes, isEmpty);
  });

  test('adds text annotation and undoes latest annotation', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[_score(now)]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    await controller.addAnnotationStroke(
      controller.scores.single,
      SheetAnnotationStroke(
        id: 'stroke-1',
        pageNumber: 1,
        tool: SheetAnnotationTool.pen,
        color: 0xff111111,
        width: 3,
        points: const <SheetAnnotationPoint>[
          SheetAnnotationPoint(x: 0.1, y: 0.1),
          SheetAnnotationPoint(x: 0.6, y: 0.1),
        ],
        createdAt: now,
      ),
    );
    await controller.addTextAnnotation(
      controller.scores.single,
      SheetTextAnnotation(
        id: 'text-1',
        pageNumber: 1,
        position: const SheetAnnotationPoint(x: 0.3, y: 0.4),
        text: 'Breathe',
        color: 0xff111111,
        fontSize: 18,
        createdAt: now.add(const Duration(seconds: 1)),
      ),
    );

    expect(controller.scores.single.annotationLayer.strokes, hasLength(1));
    expect(controller.scores.single.annotationLayer.texts, hasLength(1));

    final didUpdate = await controller.updateTextAnnotation(
      controller.scores.single,
      controller.scores.single.annotationLayer.texts.single.copyWith(
        text: 'More air',
      ),
    );
    expect(didUpdate, isTrue);
    expect(
      controller.scores.single.annotationLayer.texts.single.text,
      'More air',
    );

    final didUndo = await controller.undoLastAnnotation(
      controller.scores.single,
      1,
    );
    expect(didUndo, isTrue);
    expect(controller.scores.single.annotationLayer.strokes, hasLength(1));
    expect(controller.scores.single.annotationLayer.texts, isEmpty);

    final didRedo = await controller.redoLastAnnotation(
      controller.scores.single,
      1,
    );
    expect(didRedo, isTrue);
    expect(controller.scores.single.annotationLayer.strokes, hasLength(1));
    expect(
      controller.scores.single.annotationLayer.texts.single.text,
      'More air',
    );
  });

  test('updates annotation layer visibility and export state', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[_score(now)]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    await controller.updateAnnotationLayerState(
      controller.scores.single,
      isVisible: false,
      includeInExport: false,
    );

    expect(
      controller.scores.single.annotationLayer.isDefaultLayerVisible,
      isFalse,
    );
    expect(
      controller.scores.single.annotationLayer.includeDefaultLayerInExport,
      isFalse,
    );
    final persisted = (await store.loadScores()).single;
    expect(persisted.annotationLayer.isDefaultLayerVisible, isFalse);
    expect(persisted.annotationLayer.includeDefaultLayerInExport, isFalse);
  });

  test('sorts and filters library scores', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[
      _score(
        now,
        id: 'score-1',
        title: 'Zeta',
        composer: 'Bach',
        tags: const <String>['lesson'],
        collection: 'Etudes',
        group: 'Lesson A',
        rating: 3,
        customFields: const <SheetCustomMetadataField>[
          SheetCustomMetadataField(key: '조성', value: 'D'),
          SheetCustomMetadataField(key: '장르', value: 'Etude'),
        ],
        isFavorite: true,
        importedAt: now,
        lastOpenedAt: now.add(const Duration(minutes: 3)),
      ),
      _score(
        now,
        id: 'score-2',
        title: 'Alpha',
        composer: 'Chopin',
        tags: const <String>['recital'],
        collection: 'Recital',
        group: 'Solo',
        rating: 5,
        customFields: const <SheetCustomMetadataField>[
          SheetCustomMetadataField(key: '조성', value: 'G'),
          SheetCustomMetadataField(key: '장르', value: 'Sonata'),
        ],
        importedAt: now.add(const Duration(minutes: 1)),
      ),
    ]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    await controller.updateLibrarySortMode(SheetLibrarySortMode.title);
    expect(controller.filteredScores.map((score) => score.title), <String>[
      'Alpha',
      'Zeta',
    ]);

    await controller.updateFavoriteFilter(true);
    expect(controller.filteredScores.single.id, 'score-1');

    await controller.updateFavoriteFilter(false);
    await controller.updateTagFilter('recital');
    expect(controller.filteredScores.single.id, 'score-2');

    await controller.updateTagFilter('');
    await controller.updateComposerFilter('Bach');
    expect(controller.filteredScores.single.id, 'score-1');

    await controller.updateComposerFilter('');
    await controller.updateCollectionFilter('Etudes');
    expect(controller.filteredScores.single.id, 'score-1');

    await controller.updateCollectionFilter('');
    await controller.updateGroupFilter('Solo');
    expect(controller.filteredScores.single.id, 'score-2');

    await controller.updateGroupFilter('');
    await controller.updateMinimumRatingFilter(4);
    expect(controller.filteredScores.single.id, 'score-2');

    await controller.updateMinimumRatingFilter(0);
    await controller.updateCustomFieldFilter('조성', 'D');
    expect(controller.filteredScores.single.id, 'score-1');

    await controller.updateCustomFieldFilter('장르', 'Etude');
    expect(controller.filteredScores.single.id, 'score-1');

    await controller.updateCustomFieldFilter('조성', '');
    await controller.updateCustomFieldFilter('장르', '');
    await controller.updateLibrarySortMode(SheetLibrarySortMode.rating);
    expect(controller.filteredScores.map((score) => score.id), <String>[
      'score-2',
      'score-1',
    ]);

    controller.updateQuery('alpha');
    expect(controller.filteredScores.single.id, 'score-2');
  });

  test('bulk edits filtered library metadata without deleting files', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[
      _score(
        now,
        id: 'score-1',
        tags: const <String>['old', 'brass'],
        collection: 'Archive',
      ),
      _score(now, id: 'score-2', tags: const <String>['brass']),
      _score(
        now,
        id: 'score-3',
        composer: 'Composer',
        tags: const <String>['strings'],
      ),
    ]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    final changedCount = await controller.bulkEditScores(
      <String>{'score-1', 'score-2'},
      addTags: const <String>['recital', 'Brass'],
      removeTags: const <String>['old'],
      composer: '  J. S. Bach  ',
      collection: 'Recital',
      group: 'Finale',
      rating: 5,
      isFavorite: true,
      isPinned: true,
      customFields: const <SheetCustomMetadataField>[
        SheetCustomMetadataField(key: '조성', value: 'D'),
        SheetCustomMetadataField(key: '장르', value: 'Etude'),
      ],
    );

    expect(changedCount, 2);
    expect(controller.scoreById('score-1').tags, <String>['brass', 'recital']);
    expect(controller.scoreById('score-1').composer, 'J. S. Bach');
    expect(controller.scoreById('score-2').composer, 'J. S. Bach');
    expect(controller.scoreById('score-3').composer, 'Composer');
    expect(
      controller.composerFacets
          .singleWhere((facet) => facet.value == 'J. S. Bach')
          .count,
      2,
    );
    expect(controller.scoreById('score-2').tags, <String>['brass', 'recital']);
    expect(controller.scoreById('score-1').collection, 'Recital');
    expect(controller.scoreById('score-2').group, 'Finale');
    expect(controller.scoreById('score-2').rating, 5);
    expect(controller.scoreById('score-1').customFields, hasLength(2));
    expect(controller.scoreById('score-1').customFields.first.key, '조성');
    expect(controller.scoreById('score-1').customFields.first.value, 'D');
    expect(controller.scoreById('score-2').customFields.last.key, '장르');
    expect(controller.scoreById('score-2').customFields.last.value, 'Etude');
    expect(controller.allCollections, <String>['Recital']);
    expect(controller.scoreById('score-1').isFavorite, isTrue);
    expect(controller.scoreById('score-2').isPinned, isTrue);
    expect(controller.scoreById('score-3').tags, <String>['strings']);
    expect(controller.scoreById('score-1').filePath, '/tmp/score-1.pdf');
    await controller.bulkEditScores(
      <String>{'score-1'},
      addTags: <String>['practice'],
    );
    await controller.load();
    expect(controller.scoreById('score-1').composer, 'J. S. Bach');
    expect(controller.scoreById('score-2').composer, 'J. S. Bach');
    expect(controller.scoreById('score-3').composer, 'Composer');
    controller.updateQuery('J. S. Bach');
    expect(controller.filteredScores.map((score) => score.id).toSet(), <String>{
      'score-1',
      'score-2',
    });
  });

  test(
    'summarizes library facets for collection, group, and rating browsing',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime.parse('2026-08-20T10:00:00.000');
      final store = SheetLibraryStore();
      await store.saveScores(<SheetScore>[
        _score(
          now,
          id: 'score-1',
          title: 'Etude A',
          collection: 'Methods',
          group: 'Warmup',
          rating: 4,
          customFields: const <SheetCustomMetadataField>[
            SheetCustomMetadataField(key: '조성', value: 'D'),
            SheetCustomMetadataField(key: '장르', value: 'Etude'),
          ],
        ),
        _score(
          now,
          id: 'score-2',
          title: 'Etude B',
          collection: 'Methods',
          group: 'Solo',
          rating: 2,
          customFields: const <SheetCustomMetadataField>[
            SheetCustomMetadataField(key: '조성', value: 'D'),
            SheetCustomMetadataField(key: '장르', value: 'Etude'),
          ],
        ),
        _score(
          now,
          id: 'score-3',
          title: 'Ballad',
          collection: 'Recital',
          group: 'Solo',
          rating: 5,
          customFields: const <SheetCustomMetadataField>[
            SheetCustomMetadataField(key: '조성', value: 'G'),
            SheetCustomMetadataField(key: '장르', value: 'Sonata'),
          ],
        ),
      ]);

      final controller = SheetLibraryController(store: store);
      await controller.load();

      expect(
        controller.collectionFacets.map(
          (facet) => '${facet.label}:${facet.count}',
        ),
        <String>['Methods:2', 'Recital:1'],
      );
      expect(
        controller.groupFacets.map((facet) => '${facet.label}:${facet.count}'),
        <String>['Solo:2', 'Warmup:1'],
      );
      expect(
        controller.ratingFacets.map((facet) => '${facet.value}:${facet.count}'),
        <String>['5:1', '4:2', '3:2', '2:3', '1:3'],
      );
      expect(
        controller
            .customFieldFacets('조성')
            .map((facet) => '${facet.label}:${facet.count}'),
        <String>['D:2', 'G:1'],
      );
      expect(
        controller
            .customFieldFacets('장르')
            .map((facet) => '${facet.label}:${facet.count}'),
        <String>['Etude:2', 'Sonata:1'],
      );
    },
  );

  test('returns setlist playback context in display order', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[
      _score(now, id: 'score-1', title: 'First'),
      _score(now, id: 'score-2', title: 'Second'),
    ]);
    await store.saveSetlists(<SheetSetlist>[
      SheetSetlist(
        id: 'setlist-1',
        title: 'Recital',
        scoreIds: const <String>['score-1', 'score-2'],
        createdAt: now,
        updatedAt: now,
        scoreMetronomeSettings: const <String, SheetMetronomeSettings>{
          'score-2': SheetMetronomeSettings(
            bpm: 108,
            meter: SheetMetronomeMeter.threeFour,
          ),
        },
        scoreNotes: const <String, String>{'score-2': '반복 없이 바로 다음 곡'},
      ),
    ]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    final context = controller.setlistPlaybackContext(
      setlistId: 'setlist-1',
      scoreId: 'score-2',
    );

    expect(context?.title, 'Recital');
    expect(context?.positionLabel, '2/2');
    expect(context?.currentNote, '반복 없이 바로 다음 곡');
  });

  test('bulk adds scores to setlist and skips duplicates', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[
      _score(now, id: 'score-1', title: 'First'),
      _score(now, id: 'score-2', title: 'Second'),
      _score(now, id: 'score-3', title: 'Third'),
    ]);
    await store.saveSetlists(<SheetSetlist>[
      SheetSetlist(
        id: 'setlist-1',
        title: 'Recital',
        scoreIds: const <String>['score-1'],
        createdAt: now,
        updatedAt: now,
      ),
    ]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    final result = await controller.addScoresToSetlist(
      controller.setlists.single,
      <SheetScore>[
        controller.scores[0],
        controller.scores[1],
        controller.scores[2],
      ],
    );

    expect(result.addedCount, 2);
    expect(result.skippedDuplicateCount, 1);
    expect(controller.setlists.single.scoreIds, <String>[
      'score-1',
      'score-2',
      'score-3',
    ]);
  });

  test('inserts a removed score back into a setlist position', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[
      _score(now, id: 'score-1', title: 'First'),
      _score(now, id: 'score-2', title: 'Second'),
      _score(now, id: 'score-3', title: 'Third'),
    ]);
    await store.saveSetlists(<SheetSetlist>[
      SheetSetlist(
        id: 'setlist-1',
        title: 'Recital',
        scoreIds: const <String>['score-1', 'score-3'],
        createdAt: now,
        updatedAt: now,
      ),
    ]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    await controller.insertScoreInSetlist(
      controller.setlists.single,
      controller.scoreById('score-2'),
      1,
    );

    expect(controller.setlists.single.scoreIds, <String>[
      'score-1',
      'score-2',
      'score-3',
    ]);

    await controller.insertScoreInSetlist(
      controller.setlists.single,
      controller.scoreById('score-2'),
      0,
    );

    expect(controller.setlists.single.scoreIds, <String>[
      'score-1',
      'score-2',
      'score-3',
    ]);
  });

  test(
    'finds setlists by normalized title while excluding the current one',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime.parse('2026-08-20T10:00:00.000');
      final store = SheetLibraryStore();
      await store.saveSetlists(<SheetSetlist>[
        SheetSetlist(
          id: 'setlist-1',
          title: 'Recital',
          scoreIds: const <String>[],
          createdAt: now,
          updatedAt: now,
        ),
      ]);

      final controller = SheetLibraryController(store: store);
      await controller.load();

      expect(controller.setlistByTitleOrNull(' recital ')?.id, 'setlist-1');
      expect(
        controller.setlistByTitleOrNull('Recital', exceptId: 'setlist-1'),
        isNull,
      );
    },
  );

  test('deletes selected scores and cleans setlist references', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[
      _score(now, id: 'score-1', title: 'First'),
      _score(now, id: 'score-2', title: 'Second'),
      _score(now, id: 'score-3', title: 'Third'),
    ]);
    await store.saveSetlists(<SheetSetlist>[
      SheetSetlist(
        id: 'setlist-1',
        title: 'Recital',
        scoreIds: const <String>['score-1', 'score-2', 'score-3'],
        scoreStartPages: const <String, int>{'score-2': 3},
        scoreNotes: const <String, String>{'score-2': 'solo'},
        scoreDurations: const <String, int>{'score-2': 120},
        createdAt: now,
        updatedAt: now,
        lastOpenedScoreId: 'score-2',
      ),
    ]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    final deletedCount = await controller.deleteScoresByIds(<String>{
      'score-2',
      'missing',
    });

    expect(deletedCount, 1);
    expect(controller.scores.map((score) => score.id), <String>[
      'score-1',
      'score-3',
    ]);
    expect(controller.setlists.single.scoreIds, <String>['score-1', 'score-3']);
    expect(
      controller.setlists.single.scoreStartPages,
      isNot(contains('score-2')),
    );
    expect(controller.setlists.single.scoreNotes, isNot(contains('score-2')));
    expect(
      controller.setlists.single.scoreDurations,
      isNot(contains('score-2')),
    );
    expect(controller.setlists.single.lastOpenedScoreId, isNull);
  });

  test(
    'tracks recently opened setlists separately from recent scores',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime.parse('2026-08-20T10:00:00.000');
      final store = SheetLibraryStore();
      await store.saveScores(<SheetScore>[
        _score(now, id: 'score-1', title: 'First'),
        _score(now, id: 'score-2', title: 'Second'),
      ]);
      await store.saveSetlists(<SheetSetlist>[
        SheetSetlist(
          id: 'older',
          title: 'Older',
          scoreIds: const <String>['score-1'],
          createdAt: now,
          updatedAt: now,
        ),
        SheetSetlist(
          id: 'newer',
          title: 'Newer',
          scoreIds: const <String>['score-2'],
          createdAt: now,
          updatedAt: now,
        ),
      ]);

      final controller = SheetLibraryController(store: store);
      await controller.load();

      await controller.markSetlistOpened(
        controller.setlistById('older'),
        scoreId: 'score-1',
      );
      await Future<void>.delayed(const Duration(milliseconds: 1));
      await controller.markSetlistOpened(
        controller.setlistById('newer'),
        scoreId: 'score-2',
      );

      expect(controller.recentSetlists.map((setlist) => setlist.id), <String>[
        'newer',
        'older',
      ]);
      expect((await store.loadSetlists()).first.lastOpenedAt, isNotNull);
      expect((await store.loadSetlists()).first.lastOpenedScoreId, 'score-2');
    },
  );

  test('updates setlist rehearsal mode settings', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[
      _score(now, id: 'score-1', title: 'First'),
      _score(now, id: 'score-2', title: 'Second').copyWith(
        viewerSettings: const SheetViewerSettings(
          displayMode: 'singlePage',
          halfPageTurn: false,
        ),
      ),
    ]);
    await store.saveSetlists(<SheetSetlist>[
      SheetSetlist(
        id: 'setlist-1',
        title: 'Recital',
        scoreIds: const <String>['score-1', 'score-2'],
        createdAt: now,
        updatedAt: now,
        scoreMetronomeSettings: const <String, SheetMetronomeSettings>{
          'score-2': SheetMetronomeSettings(
            bpm: 108,
            meter: SheetMetronomeMeter.threeFour,
          ),
        },
      ),
    ]);

    final controller = SheetLibraryController(store: store);
    await controller.load();

    await controller.updateSetlistRehearsalSettings(
      controller.setlists.single,
      rehearsalMode: true,
      transitionSeconds: 15,
      scoreStartPages: const <String, int>{'score-2': 3},
      scoreNotes: const <String, String>{'score-2': 'Wait for cue.'},
      viewerSettingsOverride: const SheetViewerSettings(
        displayMode: 'continuousVertical',
        halfPageTurn: true,
        pageScale: SheetViewerSettings.fitWidthScale,
        pedalMapping: SheetViewerSettings.setlistPedalMapping,
        autoAdvanceSetlist: true,
      ),
    );

    final updated = controller.setlists.single;
    expect(updated.rehearsalMode, isTrue);
    expect(updated.transitionSeconds, 15);
    expect(updated.scoreStartPages, <String, int>{'score-2': 3});
    expect(updated.scoreNotes, <String, String>{'score-2': 'Wait for cue.'});
    expect(updated.viewerSettingsOverride?.displayMode, 'continuousVertical');
    expect(updated.viewerSettingsOverride?.autoAdvanceSetlist, isTrue);
    expect(
      controller
          .viewerSettingsForScore(
            controller.scoreById('score-2'),
            setlistId: updated.id,
          )
          .pageScale,
      SheetViewerSettings.fitWidthScale,
    );

    final duplicate = await controller.duplicateSetlist(updated);
    expect(duplicate.viewerSettingsOverride?.displayMode, 'continuousVertical');
    expect(duplicate.scoreMetronomeSettings['score-2']?.bpm, 108);

    await controller.updateSetlistRehearsalSettings(
      updated,
      clearViewerSettingsOverride: true,
    );
    expect(controller.setlistById(updated.id).viewerSettingsOverride, isNull);
    expect(
      controller
          .viewerSettingsForScore(
            controller.scoreById('score-2'),
            setlistId: updated.id,
          )
          .displayMode,
      'singlePage',
    );
  });

  test(
    'saves performance templates and keeps setlist override priority',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime.parse('2026-08-20T10:00:00.000');
      final store = SheetLibraryStore();
      await store.saveScores(<SheetScore>[
        _score(now).copyWith(
          viewerSettings: const SheetViewerSettings(
            displayMode: 'singlePage',
            halfPageTurn: false,
            pageScale: SheetViewerSettings.fitPageScale,
          ),
        ),
      ]);
      await store.saveSetlists(<SheetSetlist>[
        SheetSetlist(
          id: 'setlist-1',
          title: 'Recital',
          scoreIds: const <String>['score-1'],
          createdAt: now,
          updatedAt: now,
        ),
      ]);

      final controller = SheetLibraryController(store: store);
      await controller.load();

      final scoreTemplate = await controller.savePerformancePresetTemplate(
        name: 'Tablet page turns',
        deviceProfile: 'Galaxy Tab',
        viewerSettings: const SheetViewerSettings(
          displayMode: 'twoPage',
          halfPageTurn: true,
          pageScale: SheetViewerSettings.fitWidthScale,
          pedalMapping: SheetViewerSettings.setlistPedalMapping,
        ),
      );
      final setlistTemplate = await controller.savePerformancePresetTemplate(
        name: 'Stage override',
        viewerSettings: const SheetViewerSettings(
          displayMode: 'continuousVertical',
          halfPageTurn: false,
          pageScale: SheetViewerSettings.fullscreenScale,
          autoAdvanceSetlist: true,
        ),
      );

      expect(controller.performancePresetTemplates, hasLength(2));
      expect(
        await controller.applyPerformancePresetToScore(
          controller.scoreById('score-1'),
          scoreTemplate.id,
        ),
        isTrue,
      );
      expect(
        controller.scoreById('score-1').viewerSettings.displayMode,
        'twoPage',
      );

      expect(
        await controller.applyPerformancePresetToSetlist(
          controller.setlistById('setlist-1'),
          setlistTemplate.id,
        ),
        isTrue,
      );
      expect(
        controller
            .viewerSettingsForScore(
              controller.scoreById('score-1'),
              setlistId: 'setlist-1',
            )
            .pageScale,
        SheetViewerSettings.fullscreenScale,
      );
      expect(
        controller
            .viewerSettingsForScore(
              controller.scoreById('score-1'),
              setlistId: 'setlist-1',
            )
            .autoAdvanceSetlist,
        isTrue,
      );

      await controller.updateSetlistRehearsalSettings(
        controller.setlistById('setlist-1'),
        clearViewerSettingsOverride: true,
      );
      expect(
        controller
            .viewerSettingsForScore(
              controller.scoreById('score-1'),
              setlistId: 'setlist-1',
            )
            .pageScale,
        SheetViewerSettings.fitWidthScale,
      );

      expect(
        await controller.deletePerformancePresetTemplate(scoreTemplate.id),
        isTrue,
      );
      expect(controller.performancePresetTemplates, hasLength(1));

      final reloaded = SheetLibraryController(store: store);
      await reloaded.load();
      expect(reloaded.performancePresetTemplates.single.name, 'Stage override');
    },
  );

  test('normalizes shared import payloads', () {
    final files = normalizeSharedImportPayload(<Object?>[
      <Object?, Object?>{'path': '/tmp/a.pdf', 'name': 'score-a.pdf'},
      <Object?, Object?>{'path': '/tmp/a.pdf', 'name': 'score-a-copy.pdf'},
      <Object?, Object?>{'path': '/tmp/b.pdf', 'name': 'score-b.PDF'},
      <Object?, Object?>{'path': '/tmp/c.txt', 'name': 'notes.txt'},
      <Object?, Object?>{'path': '', 'name': 'empty.pdf'},
      'ignored',
    ]);

    expect(files.map((file) => file.path), <String>[
      '/tmp/a.pdf',
      '/tmp/b.pdf',
    ]);
    expect(files.map((file) => file.name), <String>[
      'score-a.pdf',
      'score-b.PDF',
    ]);
  });
}

class _PageRotationCopyStore extends SheetLibraryStore {
  _PageRotationCopyStore({
    required List<SheetScore> scores,
    required this.result,
  }) : savedScores = scores;

  List<SheetScore> savedScores;
  final SheetPdfPageRotationResult result;

  @override
  Future<List<SheetScore>> loadScores() async {
    return savedScores;
  }

  @override
  Future<List<SheetLibraryProfile>> loadLibraryProfiles() async {
    return <SheetLibraryProfile>[SheetLibraryProfile.defaultProfile];
  }

  @override
  Future<SheetLibraryProfile> loadActiveLibraryProfile() async {
    return SheetLibraryProfile.defaultProfile;
  }

  @override
  Future<void> saveScores(List<SheetScore> scores, {String? libraryId}) async {
    savedScores = List<SheetScore>.unmodifiable(scores);
  }

  @override
  Future<List<SheetSetlist>> loadSetlists() async {
    return const <SheetSetlist>[];
  }

  @override
  Future<SheetMetronomeSettings> loadMetronomeSettings() async {
    return SheetMetronomeSettings.defaultSettings;
  }

  @override
  Future<SheetTunerSettings> loadTunerSettings() async {
    return SheetTunerSettings.defaultSettings;
  }

  @override
  Future<SheetLibraryViewSettings> loadLibraryViewSettings() async {
    return SheetLibraryViewSettings.defaultSettings;
  }

  @override
  Future<SheetAnnotationToolPreset?> loadFavoriteAnnotationPreset() async {
    return null;
  }

  @override
  Future<SheetPdfPageRotationResult> createPageRotationAppliedCopy(
    SheetScore score,
  ) async {
    return result;
  }
}

class _PageCropCopyStore extends SheetLibraryStore {
  _PageCropCopyStore({required List<SheetScore> scores, required this.result})
    : savedScores = scores;

  List<SheetScore> savedScores;
  final SheetPdfPageCropResult result;

  @override
  Future<List<SheetScore>> loadScores() async {
    return savedScores;
  }

  @override
  Future<List<SheetLibraryProfile>> loadLibraryProfiles() async {
    return <SheetLibraryProfile>[SheetLibraryProfile.defaultProfile];
  }

  @override
  Future<SheetLibraryProfile> loadActiveLibraryProfile() async {
    return SheetLibraryProfile.defaultProfile;
  }

  @override
  Future<void> saveScores(List<SheetScore> scores, {String? libraryId}) async {
    savedScores = List<SheetScore>.unmodifiable(scores);
  }

  @override
  Future<List<SheetSetlist>> loadSetlists() async {
    return const <SheetSetlist>[];
  }

  @override
  Future<SheetMetronomeSettings> loadMetronomeSettings() async {
    return SheetMetronomeSettings.defaultSettings;
  }

  @override
  Future<SheetTunerSettings> loadTunerSettings() async {
    return SheetTunerSettings.defaultSettings;
  }

  @override
  Future<SheetLibraryViewSettings> loadLibraryViewSettings() async {
    return SheetLibraryViewSettings.defaultSettings;
  }

  @override
  Future<SheetAnnotationToolPreset?> loadFavoriteAnnotationPreset() async {
    return null;
  }

  @override
  Future<SheetPdfPageCropResult> createPageCropAppliedCopy(
    SheetScore score,
  ) async {
    return result;
  }
}

class _PageArrangementCopyStore extends SheetLibraryStore {
  _PageArrangementCopyStore({
    required List<SheetScore> scores,
    required this.result,
  }) : savedScores = scores;

  List<SheetScore> savedScores;
  final SheetPdfPageArrangementResult result;

  @override
  Future<List<SheetScore>> loadScores() async {
    return savedScores;
  }

  @override
  Future<List<SheetLibraryProfile>> loadLibraryProfiles() async {
    return <SheetLibraryProfile>[SheetLibraryProfile.defaultProfile];
  }

  @override
  Future<SheetLibraryProfile> loadActiveLibraryProfile() async {
    return SheetLibraryProfile.defaultProfile;
  }

  @override
  Future<void> saveScores(List<SheetScore> scores, {String? libraryId}) async {
    savedScores = List<SheetScore>.unmodifiable(scores);
  }

  @override
  Future<List<SheetSetlist>> loadSetlists() async {
    return const <SheetSetlist>[];
  }

  @override
  Future<SheetMetronomeSettings> loadMetronomeSettings() async {
    return SheetMetronomeSettings.defaultSettings;
  }

  @override
  Future<SheetTunerSettings> loadTunerSettings() async {
    return SheetTunerSettings.defaultSettings;
  }

  @override
  Future<SheetLibraryViewSettings> loadLibraryViewSettings() async {
    return SheetLibraryViewSettings.defaultSettings;
  }

  @override
  Future<SheetAnnotationToolPreset?> loadFavoriteAnnotationPreset() async {
    return null;
  }

  @override
  Future<SheetPdfPageArrangementResult> createPageArrangementAppliedCopy(
    SheetScore score,
  ) async {
    return result;
  }
}

class _DelayedMetronomeStore extends SheetLibraryStore {
  bool delayNext = false;
  int? failingBpm;
  final entered = Completer<void>();
  final release = Completer<void>();

  @override
  Future<void> saveMetronomeSettings(SheetMetronomeSettings settings) async {
    if (delayNext) {
      delayNext = false;
      entered.complete();
      await release.future;
    }
    if (settings.bpm == failingBpm) throw StateError('metronome write failed');
    await super.saveMetronomeSettings(settings);
  }
}

class _ImportScoreStore extends SheetLibraryStore {
  _ImportScoreStore(this.score, {List<SheetScore>? batchScores})
    : batchScores = batchScores ?? <SheetScore>[score];

  final SheetScore score;
  final List<SheetScore> batchScores;

  @override
  Future<SheetScore?> importPdf() async {
    return score;
  }

  @override
  Future<List<SheetScore>> importPdfs() async {
    return batchScores;
  }
}

class _BookmarkCsvStore extends SheetLibraryStore {
  _BookmarkCsvStore(this.bookmarks);

  final List<SheetBookmark> bookmarks;

  @override
  Future<List<SheetBookmark>> importBookmarkCsv({
    required int pageCount,
  }) async {
    return bookmarks;
  }
}

SheetScore _score(
  DateTime now, {
  String id = 'score-1',
  String title = 'Sonata',
  String composer = '',
  List<String> tags = const <String>[],
  bool isFavorite = false,
  bool isPinned = false,
  DateTime? importedAt,
  DateTime? lastOpenedAt,
  List<SheetBookmark> bookmarks = const <SheetBookmark>[],
  String collection = '',
  String group = '',
  int rating = 0,
  String? filePath,
  List<SheetLinkedFile> linkedFiles = const <SheetLinkedFile>[],
  SheetMetronomeSettings? metronomeSettings,
  List<SheetCustomMetadataField> customFields =
      const <SheetCustomMetadataField>[],
}) {
  return SheetScore(
    id: id,
    title: title,
    composer: composer,
    tags: tags,
    note: '',
    filePath: filePath ?? '/tmp/$id.pdf',
    collection: collection,
    group: group,
    rating: rating,
    linkedFiles: linkedFiles,
    customFields: customFields,
    importedAt: importedAt ?? now,
    updatedAt: now,
    lastOpenedAt: lastOpenedAt,
    lastPage: 1,
    isFavorite: isFavorite,
    isPinned: isPinned,
    bookmarks: bookmarks,
    metronomeSettings: metronomeSettings,
  );
}
