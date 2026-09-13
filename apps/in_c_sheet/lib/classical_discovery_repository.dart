import 'dart:convert';

import 'classical_discovery_models.dart';
import 'classical_discovery_store.dart';

abstract class DiscoveryStateRepository {
  Future<UserDiscoveryState> loadState();
  Future<void> saveState(UserDiscoveryState state);
}

class LocalDiscoveryStateRepository implements DiscoveryStateRepository {
  const LocalDiscoveryStateRepository(this.store);

  final ClassicalDiscoveryStore store;

  @override
  Future<UserDiscoveryState> loadState() => store.loadState();

  @override
  Future<void> saveState(UserDiscoveryState state) => store.saveState(state);
}

class SupabaseDiscoveryStateRepository implements DiscoveryStateRepository {
  const SupabaseDiscoveryStateRepository();

  @override
  Future<UserDiscoveryState> loadState() async {
    throw UnsupportedError('Supabase remote storage is not configured');
  }

  @override
  Future<void> saveState(UserDiscoveryState state) async {
    throw UnsupportedError('Supabase remote storage is not configured');
  }
}

class DiscoveryStateMerger {
  const DiscoveryStateMerger();

  UserDiscoveryState merge(
    UserDiscoveryState local,
    UserDiscoveryState remote,
  ) {
    final resetOrder = _compareDates(
      remote.historyResetAt,
      local.historyResetAt,
    );
    if (resetOrder != 0) {
      final current = resetOrder > 0 ? remote : local;
      return merge(current, current);
    }
    final workStates = <String, UserWorkState>{};
    for (final entry in local.workStates.entries) {
      workStates[entry.key] = entry.value;
    }
    for (final entry in remote.workStates.entries) {
      final current = workStates[entry.key];
      if (current == null || _compareWorkRevisions(entry.value, current) > 0) {
        workStates[entry.key] = entry.value;
      }
      if (current != null) {
        workStates[entry.key] = workStates[entry.key]!.copyWith(
          confirmedListenDays: {
            ...current.confirmedListenDays,
            ...entry.value.confirmedListenDays,
          },
        );
      }
    }

    final reactionsById = <String, ClassicalReaction>{};
    for (final reaction in [...local.reactions, ...remote.reactions]) {
      final current = reactionsById[reaction.id];
      final order = current == null
          ? 1
          : (reaction.updatedAt ?? reaction.occurredAt).compareTo(
              current.updatedAt ?? current.occurredAt,
            );
      if (order > 0 ||
          (order == 0 &&
              _canonicalJson(reaction.toJson())
                      .compareTo(_canonicalJson(current!.toJson())) >
                  0)) {
        reactionsById[reaction.id] = reaction;
      }
    }
    final reactions = reactionsById.values.toList()
      ..sort((a, b) => _newestFirst(a.occurredAt, b.occurredAt, a.id, b.id));
    final tasteIntakeItems = _dedupeById<TasteIntakeItem>(
      [...local.tasteIntakeItems, ...remote.tasteIntakeItems],
      (item) => item.id,
      compareRevisions: (a, b) {
        final order = (a.updatedAt ?? a.createdAt).compareTo(
          b.updatedAt ?? b.createdAt,
        );
        if (order == 0 &&
            (a.matchOrigin == 'user_unlinked') !=
                (b.matchOrigin == 'user_unlinked')) {
          return a.matchOrigin == 'user_unlinked' ? 1 : -1;
        }
        return order != 0
            ? order
            : _canonicalJson(a.toJson()).compareTo(_canonicalJson(b.toJson()));
      },
    )..sort((a, b) => _newestFirst(a.createdAt, b.createdAt, a.id, b.id));
    final dailyPicks = _mergeDailyPicks([
      ...local.dailyPicks,
      ...remote.dailyPicks,
    ])..sort((a, b) => _newestFirst(a.date, b.date, a.id, b.id));
    final previewRoutes = _dedupeById<ConcertPreviewRoute>(
      [...local.previewRoutes, ...remote.previewRoutes],
      (route) => route.id,
      compareRevisions: (a, b) {
        final order = a.updatedAt.compareTo(b.updatedAt);
        return order != 0
            ? order
            : _canonicalJson(a.toJson()).compareTo(_canonicalJson(b.toJson()));
      },
    )..sort((a, b) => _newestFirst(a.updatedAt, b.updatedAt, a.id, b.id));
    final postConcertReflections = _dedupeById<PostConcertReflection>(
      [...local.postConcertReflections, ...remote.postConcertReflections],
      (reflection) => reflection.id,
      compareRevisions: (a, b) =>
          _canonicalJson(a.toJson()).compareTo(_canonicalJson(b.toJson())),
    )..sort((a, b) => _newestFirst(a.occurredAt, b.occurredAt, a.id, b.id));
    final events = _mergeEvents([...local.events, ...remote.events])
      ..sort((a, b) => _newestFirst(a.occurredAt, b.occurredAt, a.id, b.id));

    final preferenceOrder = _compareDates(
      remote.preferencesUpdatedAt,
      local.preferencesUpdatedAt,
    );
    final useRemotePrefs =
        preferenceOrder > 0 ||
        (preferenceOrder == 0 &&
            _preferenceKey(remote).compareTo(_preferenceKey(local)) > 0);
    final preferenceSource = useRemotePrefs ? remote : local;

    final savedConcertIds = <String>{};
    final concertRevisions = <String, DateTime>{};
    for (final id in {
      ...local.savedConcertIds,
      ...remote.savedConcertIds,
      ...local.concertSaveUpdatedAt.keys,
      ...remote.concertSaveUpdatedAt.keys,
    }) {
      final a = local.concertSaveUpdatedAt[id];
      final b = remote.concertSaveUpdatedAt[id];
      if (a == null && b == null) {
        savedConcertIds.add(id); // Legacy snapshots have no deletion evidence.
        continue;
      }
      final useRemote = _isAfter(b, a);
      concertRevisions[id] = (useRemote ? b : a)!;
      final saved = a != null && b != null && a.isAtSameMomentAs(b)
          ? local.savedConcertIds.contains(id) &&
                remote.savedConcertIds.contains(id)
          : (useRemote ? remote : local).savedConcertIds.contains(id);
      if (saved) savedConcertIds.add(id);
    }

    return preferenceSource.copyWith(
      workStates: Map<String, UserWorkState>.unmodifiable(workStates),
      tasteIntakeItems: tasteIntakeItems
          .take(DiscoveryHistoryLimits.tasteInputs)
          .toList(growable: false),
      reactions: reactions
          .take(DiscoveryHistoryLimits.reactions)
          .toList(growable: false),
      dailyPicks: dailyPicks
          .take(DiscoveryHistoryLimits.dailyPicks)
          .toList(growable: false),
      previewRoutes: previewRoutes
          .take(DiscoveryHistoryLimits.previewRoutes)
          .toList(growable: false),
      postConcertReflections: postConcertReflections
          .take(DiscoveryHistoryLimits.reflections)
          .toList(growable: false),
      events: retainDiscoveryEvents(events),
      savedConcertIds: savedConcertIds,
      concertSaveUpdatedAt: concertRevisions,
      dismissedPromotionIds: <String>{
        ...local.dismissedPromotionIds,
        ...remote.dismissedPromotionIds,
      },
    );
  }

  bool _isAfter(DateTime? a, DateTime? b) {
    if (a == null) {
      return false;
    }
    if (b == null) {
      return true;
    }
    return a.isAfter(b);
  }

  int _newestFirst(DateTime a, DateTime b, String aId, String bId) {
    final order = b.compareTo(a);
    return order != 0 ? order : aId.compareTo(bId);
  }

  List<DiscoveryEvent> _mergeEvents(List<DiscoveryEvent> events) {
    String key(DiscoveryEvent event) => _canonicalJson({
      ...event.toJson(),
      'properties': {...event.properties}..remove('mergeConflict'),
    });
    final byId = <String, DiscoveryEvent>{};
    for (final event in events) {
      final previous = byId[event.id];
      if (previous == null) {
        byId[event.id] = event;
        continue;
      }
      final order = key(event).compareTo(key(previous));
      final winner = order > 0 ? event : previous;
      // An ID collision is not a second observation or a trustworthy edit.
      final conflict =
          order != 0 ||
          previous.properties['mergeConflict'] == 'true' ||
          event.properties['mergeConflict'] == 'true';
      byId[event.id] = DiscoveryEvent.fromJson({
        ...winner.toJson(),
        'properties': {
          ...winner.properties,
          if (conflict) 'mergeConflict': 'true',
        },
      });
    }
    return byId.values.toList();
  }

  int _compareDates(DateTime? a, DateTime? b) {
    if (a == null) return b == null ? 0 : -1;
    return b == null ? 1 : a.compareTo(b);
  }

  int _compareWorkRevisions(UserWorkState a, UserWorkState b) {
    final order = _compareDates(a.updatedAt, b.updatedAt);
    if (order != 0) return order;
    // An exact-clock conflict cannot prove a newer intent; unsave wins the tie.
    if (a.saved != b.saved) return a.saved ? -1 : 1;
    // Unioned evidence must not change the winner of a later revision conflict.
    Map<String, Object?> key(UserWorkState state) =>
        {...state.toJson()}..remove('confirmedListenDays');
    return _canonicalJson(key(a)).compareTo(_canonicalJson(key(b)));
  }

  String _preferenceKey(UserDiscoveryState state) => _canonicalJson({
    'preferredPlatformId': state.preferredPlatformId,
    'region': state.region,
    'onboardingCompleted': state.onboardingCompleted,
    'experienceLevel': state.experienceLevel,
    'preferredMoodTags': state.preferredMoodTags.toList()..sort(),
    'preferredContextTags': state.preferredContextTags.toList()..sort(),
    'preferredInstruments': state.preferredInstruments.toList()..sort(),
    'notificationPreferences': state.notificationPreferences.toList()..sort(),
    'reminderPreference': state.reminderPreference.toJson(),
  });

  String _canonicalJson(Map<String, Object?> value) {
    Object? normalize(Object? item) {
      if (item is Map<String, Object?>) {
        final keys = item.keys.toList()..sort();
        return {for (final key in keys) key: normalize(item[key])};
      }
      if (item is List) return item.map(normalize).toList();
      return item;
    }

    return jsonEncode(normalize(value));
  }

  List<DailyPick> _mergeDailyPicks(List<DailyPick> picks) {
    // A daily recommendation is pinned at creation; later engagement is monotonic.
    picks.sort((a, b) {
      final revision = b.catalogRevision.compareTo(a.catalogRevision);
      if (revision != 0) return revision;
      final order = a.createdAt.compareTo(b.createdAt);
      return order != 0
          ? order
          : jsonEncode(a.toJson()).compareTo(jsonEncode(b.toJson()));
    });
    final byId = <String, DailyPick>{};
    for (final pick in picks) {
      final original = byId[pick.id];
      if (original == null) {
        byId[pick.id] = pick;
        continue;
      }
      if (original.workId != pick.workId ||
          original.catalogRevision != pick.catalogRevision) {
        continue;
      }
      final confirmed = [
        if (original.isCompleted) original.completedAt!,
        if (pick.isCompleted) pick.completedAt!,
      ]..sort();
      byId[pick.id] = original.copyWith(
        completedAt: confirmed.firstOrNull,
        completionConfirmed: confirmed.isNotEmpty,
        openedFromNotification:
            original.openedFromNotification || pick.openedFromNotification,
      );
    }
    return byId.values.toList(growable: false);
  }

  List<T> _dedupeById<T>(
    Iterable<T> items,
    String Function(T item) idFor, {
    int Function(T candidate, T existing)? compareRevisions,
  }) {
    final byId = <String, T>{};
    for (final item in items) {
      final id = idFor(item);
      final existing = byId[id];
      if (existing == null ||
          compareRevisions == null ||
          compareRevisions(item, existing) > 0) {
        byId[id] = item;
      }
    }
    return byId.values.toList(growable: false);
  }
}
