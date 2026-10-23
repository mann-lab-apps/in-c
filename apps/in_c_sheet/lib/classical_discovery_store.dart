import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import 'classical_discovery_models.dart';

class ClassicalDiscoveryStore {
  ClassicalDiscoveryStore({
    String storageKey = 'clef_classical_discovery_state',
  }) : _stateKey = storageKey;

  final String _stateKey;
  String get _backupKey => '${_stateKey}_backup';
  String get _eraseKey => '${_stateKey}_erase_pending';
  String? recoveryMessage;
  static final _operations = <String, Future<void>>{};

  Future<T> _serialized<T>(Future<T> Function() action) {
    final result = (_operations[_stateKey] ?? Future<void>.value()).then(
      (_) => action(),
    );
    final barrier = result.then<void>(
      (_) {},
      onError: (Object _, StackTrace _) {},
    );
    _operations[_stateKey] = barrier;
    barrier.then((_) {
      if (identical(_operations[_stateKey], barrier)) {
        _operations.remove(_stateKey);
      }
    });
    return result;
  }

  UserDiscoveryState _decodeChecked(String raw) {
    final json = jsonDecode(raw);
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Invalid discovery state');
    }
    if (json['historyResetAt'] != null &&
        (json['historyResetAt'] is! String ||
            DateTime.tryParse(json['historyResetAt'] as String) == null)) {
      throw const FormatException('Invalid history reset time');
    }
    const records = {
      'workStates': ['workId'],
      'tasteIntakeItems': ['id'],
      'reactions': ['id', 'workId', 'type', 'occurredAt'],
      'dailyPicks': ['id', 'workId', 'date'],
      'previewRoutes': ['id'],
      'postConcertReflections': ['id'],
      'events': ['id', 'eventType', 'entityType', 'entityId', 'occurredAt'],
    };
    for (final entry in records.entries) {
      if (!json.containsKey(entry.key)) continue;
      final rows = json[entry.key];
      if (rows is! List) throw FormatException('Invalid ${entry.key}');
      final ids = <String>{};
      for (final row in rows) {
        if (row is! Map<String, dynamic> ||
            entry.value.any(
              (key) => row[key] is! String || (row[key] as String).isEmpty,
            )) {
          throw FormatException('Invalid ${entry.key} record');
        }
        if (!ids.add(row[entry.value.first] as String)) {
          throw FormatException('Duplicate ${entry.key} record');
        }
        for (final field in const [
          'occurredAt',
          'createdAt',
          'updatedAt',
          'date',
          'firstListenedAt',
          'lastListenedAt',
          'repeatDueAt',
          'completedAt',
        ]) {
          if (row[field] != null &&
              (row[field] is! String ||
                  DateTime.tryParse(row[field] as String) == null)) {
            throw FormatException('Invalid ${entry.key} $field');
          }
        }
        if (entry.key == 'dailyPicks') {
          final revision = row['catalogRevision'];
          if (revision != null && (revision is! int || revision < 0)) {
            throw const FormatException('Invalid daily catalog revision');
          }
          for (final field in ['replacedWorkId', 'replacementReason']) {
            if (row[field] != null &&
                (row[field] is! String || (row[field] as String).isEmpty)) {
              throw FormatException('Invalid daily $field');
            }
          }
        }
        if (entry.key == 'workStates') {
          if (row.containsKey('saved') && row['saved'] is! bool) {
            throw const FormatException('Invalid saved flag');
          }
          final days = row['confirmedListenDays'];
          if (days != null &&
              (days is! List ||
                  days.any(
                    (value) =>
                        value is! String || DateTime.tryParse(value) == null,
                  ))) {
            throw const FormatException('Invalid confirmed listening dates');
          }
        }
      }
    }
    for (final key in const [
      'savedConcertIds',
      'dismissedPromotionIds',
      'preferredMoodTags',
      'preferredContextTags',
      'preferredInstruments',
      'notificationPreferences',
    ]) {
      if (!json.containsKey(key)) continue;
      final values = json[key];
      if (values is! List || values.any((value) => value is! String)) {
        throw FormatException('Invalid $key');
      }
    }
    final concertRevisions = json['concertSaveUpdatedAt'];
    if (concertRevisions != null &&
        (concertRevisions is! Map<String, dynamic> ||
            concertRevisions.entries.any(
              (entry) =>
                  entry.key.isEmpty ||
                  entry.value is! String ||
                  DateTime.tryParse(entry.value as String) == null,
            ))) {
      throw const FormatException('Invalid concert save revisions');
    }
    return UserDiscoveryState.fromJson(json);
  }

  Future<UserDiscoveryState> loadState() => _serialized(() async {
    final preferences = await SharedPreferences.getInstance();
    recoveryMessage = null;
    if (preferences.containsKey(_eraseKey)) {
      final marker = preferences.get(_eraseKey);
      final at = marker is String ? DateTime.tryParse(marker) : null;
      if (at == null) throw const FormatException('Invalid pending erase');
      return _finishErase(preferences, at);
    }
    final raw = preferences.get(_stateKey);
    final backup = preferences.get(_backupKey);
    if (raw == null && backup == null) return UserDiscoveryState.defaultState;
    try {
      if (raw is! String) {
        throw const FormatException('Missing primary history');
      }
      return _decodeChecked(raw);
    } catch (_) {
      if (backup is String) {
        try {
          final recovered = _decodeChecked(backup);
          recoveryMessage = '마지막으로 보관된 기록을 불러왔습니다. 최근 변경은 빠져 있을 수 있어요.';
          return recovered;
        } catch (_) {
          // Keep both raw values intact for recovery; never replace with empty state.
        }
      }
      throw const FormatException('Saved listening history needs recovery');
    }
  });

  Future<void> saveState(UserDiscoveryState state) => _serialized(() async {
    final encoded = UserDiscoveryState.encode(state);
    _decodeChecked(encoded);
    final preferences = await SharedPreferences.getInstance();
    if (preferences.containsKey(_eraseKey)) {
      throw StateError('Record deletion is pending');
    }
    final previous = preferences.get(_stateKey);
    for (final raw in [previous, preferences.get(_backupKey)]) {
      if (raw is! String) continue;
      UserDiscoveryState? checked;
      try {
        checked = _decodeChecked(raw);
      } catch (_) {}
      final resetAt = checked?.historyResetAt;
      if (resetAt != null &&
          (state.historyResetAt == null ||
              state.historyResetAt!.isBefore(resetAt))) {
        throw StateError('Cannot restore history from before deletion');
      }
    }
    if (previous is String) {
      var validPrevious = false;
      try {
        _decodeChecked(previous);
        validPrevious = true;
      } catch (_) {}
      if (validPrevious && !await preferences.setString(_backupKey, previous)) {
        throw StateError('Could not preserve listening history backup');
      }
    }
    if (!await preferences.setString(_stateKey, encoded)) {
      throw StateError('Could not save listening history');
    }
    recoveryMessage = null;
  });

  Future<UserDiscoveryState> eraseLocalData({required DateTime at}) =>
      _serialized(() async {
        final preferences = await SharedPreferences.getInstance();
        var resetAt = at;
        for (final key in [_stateKey, _backupKey]) {
          final raw = preferences.get(key);
          if (raw is! String) continue;
          try {
            final previous = _decodeChecked(raw).historyResetAt;
            if (previous != null && !resetAt.isAfter(previous)) {
              resetAt = previous.add(const Duration(microseconds: 1));
            }
          } catch (_) {
            /* Explicit deletion may remove damaged records too. */
          }
        }
        // Persist intent before touching either copy; reopening completes an interrupted deletion.
        if (!await preferences.setString(
          _eraseKey,
          resetAt.toIso8601String(),
        )) {
          throw StateError('Could not begin record deletion');
        }
        return _finishErase(preferences, resetAt);
      });

  Future<UserDiscoveryState> _finishErase(
    SharedPreferences preferences,
    DateTime at,
  ) async {
    final empty = UserDiscoveryState.defaultState.copyWith(historyResetAt: at);
    if (!await preferences.setString(
          _stateKey,
          UserDiscoveryState.encode(empty),
        ) ||
        !await preferences.remove(_backupKey) ||
        !await preferences.remove(_eraseKey)) {
      throw StateError('Record deletion needs to finish');
    }
    recoveryMessage = null;
    return empty;
  }
}
