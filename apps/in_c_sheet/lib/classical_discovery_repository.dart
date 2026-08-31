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
    return UserDiscoveryState.defaultState;
  }

  @override
  Future<void> saveState(UserDiscoveryState state) async {}
}

class DiscoveryStateMerger {
  const DiscoveryStateMerger();

  UserDiscoveryState merge(
    UserDiscoveryState local,
    UserDiscoveryState remote,
  ) {
    final workStates = <String, UserWorkState>{};
    for (final entry in local.workStates.entries) {
      workStates[entry.key] = entry.value;
    }
    for (final entry in remote.workStates.entries) {
      final current = workStates[entry.key];
      if (current == null ||
          _isAfter(entry.value.updatedAt, current.updatedAt)) {
        workStates[entry.key] = entry.value;
      }
    }

    final reactions = _dedupeById<ClassicalReaction>([
      ...local.reactions,
      ...remote.reactions,
    ], (reaction) => reaction.id);
    final events = _dedupeById<DiscoveryEvent>(
      [...local.events, ...remote.events],
      (event) => event.id,
    )..sort((a, b) => b.occurredAt.compareTo(a.occurredAt));

    final useRemotePrefs = _isAfter(
      remote.preferencesUpdatedAt,
      local.preferencesUpdatedAt,
    );
    final preferenceSource = useRemotePrefs ? remote : local;

    return preferenceSource.copyWith(
      workStates: Map<String, UserWorkState>.unmodifiable(workStates),
      reactions: reactions.take(160).toList(growable: false),
      events: events.take(400).toList(growable: false),
      savedConcertIds: <String>{
        ...local.savedConcertIds,
        ...remote.savedConcertIds,
      },
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

  List<T> _dedupeById<T>(Iterable<T> items, String Function(T item) idFor) {
    final byId = <String, T>{};
    for (final item in items) {
      byId[idFor(item)] = item;
    }
    return byId.values.toList(growable: false);
  }
}
