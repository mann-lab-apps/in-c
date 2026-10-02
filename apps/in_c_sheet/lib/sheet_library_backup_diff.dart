import 'dart:convert';

import 'sheet_library_backup.dart';
import 'sheet_score.dart';
import 'sheet_setlist.dart';

class SheetLibraryBackupDiff {
  const SheetLibraryBackupDiff({
    required this.addedScoreIds,
    required this.removedScoreIds,
    required this.changedScoreIds,
    required this.fileChangedScoreIds,
    required this.annotationChangedScoreIds,
    required this.addedSetlistIds,
    required this.removedSetlistIds,
    required this.changedSetlistIds,
    required this.setlistOrderChangedIds,
    required this.settingsChanged,
  });

  factory SheetLibraryBackupDiff.compare(
    SheetLibraryBackup base,
    SheetLibraryBackup incoming,
  ) {
    final baseScores = _byId(base.scores);
    final incomingScores = _byId(incoming.scores);
    final sharedScoreIds = baseScores.keys.toSet()
      ..retainAll(incomingScores.keys);

    final changedScoreIds = <String>[];
    final fileChangedScoreIds = <String>[];
    final annotationChangedScoreIds = <String>[];
    for (final id in sharedScoreIds) {
      final baseScore = baseScores[id]!;
      final incomingScore = incomingScores[id]!;
      if (!_jsonEqual(baseScore.toJson(), incomingScore.toJson())) {
        changedScoreIds.add(id);
      }
      if (_scoreFileSignature(baseScore) !=
          _scoreFileSignature(incomingScore)) {
        fileChangedScoreIds.add(id);
      }
      if (_scoreAnnotationSignature(baseScore) !=
          _scoreAnnotationSignature(incomingScore)) {
        annotationChangedScoreIds.add(id);
      }
    }

    final baseSetlists = _setlistsById(base.setlists);
    final incomingSetlists = _setlistsById(incoming.setlists);
    final sharedSetlistIds = baseSetlists.keys.toSet()
      ..retainAll(incomingSetlists.keys);

    final changedSetlistIds = <String>[];
    final setlistOrderChangedIds = <String>[];
    for (final id in sharedSetlistIds) {
      final baseSetlist = baseSetlists[id]!;
      final incomingSetlist = incomingSetlists[id]!;
      if (!_jsonEqual(baseSetlist.toJson(), incomingSetlist.toJson())) {
        changedSetlistIds.add(id);
      }
      if (!_stringListsEqual(baseSetlist.scoreIds, incomingSetlist.scoreIds)) {
        setlistOrderChangedIds.add(id);
      }
    }

    return SheetLibraryBackupDiff(
      addedScoreIds: _sortedDifference(incomingScores.keys, baseScores.keys),
      removedScoreIds: _sortedDifference(baseScores.keys, incomingScores.keys),
      changedScoreIds: _sorted(changedScoreIds),
      fileChangedScoreIds: _sorted(fileChangedScoreIds),
      annotationChangedScoreIds: _sorted(annotationChangedScoreIds),
      addedSetlistIds: _sortedDifference(
        incomingSetlists.keys,
        baseSetlists.keys,
      ),
      removedSetlistIds: _sortedDifference(
        baseSetlists.keys,
        incomingSetlists.keys,
      ),
      changedSetlistIds: _sorted(changedSetlistIds),
      setlistOrderChangedIds: _sorted(setlistOrderChangedIds),
      settingsChanged: !_jsonEqual(
        _settingsJson(base),
        _settingsJson(incoming),
      ),
    );
  }

  final List<String> addedScoreIds;
  final List<String> removedScoreIds;
  final List<String> changedScoreIds;
  final List<String> fileChangedScoreIds;
  final List<String> annotationChangedScoreIds;
  final List<String> addedSetlistIds;
  final List<String> removedSetlistIds;
  final List<String> changedSetlistIds;
  final List<String> setlistOrderChangedIds;
  final bool settingsChanged;

  bool get hasChanges {
    return addedScoreIds.isNotEmpty ||
        removedScoreIds.isNotEmpty ||
        changedScoreIds.isNotEmpty ||
        addedSetlistIds.isNotEmpty ||
        removedSetlistIds.isNotEmpty ||
        changedSetlistIds.isNotEmpty ||
        settingsChanged;
  }
}

Map<String, SheetScore> _byId(List<SheetScore> scores) {
  return <String, SheetScore>{for (final score in scores) score.id: score};
}

Map<String, SheetSetlist> _setlistsById(List<SheetSetlist> setlists) {
  return <String, SheetSetlist>{
    for (final setlist in setlists) setlist.id: setlist,
  };
}

List<String> _sortedDifference(Iterable<String> left, Iterable<String> right) {
  return _sorted(left.toSet().difference(right.toSet()));
}

List<String> _sorted(Iterable<String> values) {
  return values.toList(growable: false)..sort();
}

bool _jsonEqual(Object? left, Object? right) {
  return jsonEncode(left) == jsonEncode(right);
}

String _scoreFileSignature(SheetScore score) {
  return jsonEncode(<String, Object?>{
    'filePath': score.filePath,
    'linkedFiles': score.linkedFiles.map((file) => file.toJson()).toList(),
  });
}

String _scoreAnnotationSignature(SheetScore score) {
  return jsonEncode(<String, Object?>{
    'annotationLayer': score.annotationLayer.toJson(),
    'annotationStorage': score.annotationStorage.toJson(),
  });
}

Map<String, Object?> _settingsJson(SheetLibraryBackup backup) {
  return <String, Object?>{
    'metronomeSettings': backup.metronomeSettings.toJson(),
    'tunerSettings': backup.tunerSettings.toJson(),
    'toneSettings': backup.toneSettings.toJson(),
    'libraryViewSettings': backup.libraryViewSettings.toJson(),
    'globalViewerSettings': backup.globalViewerSettings.toJson(),
    'performancePresetTemplates': backup.performancePresetTemplates
        .map((template) => template.toJson())
        .toList(growable: false),
    'favoriteAnnotationPreset': backup.favoriteAnnotationPreset?.toJson(),
    'userAnnotationStampPacks': backup.userAnnotationStampPacks
        .map((pack) => pack.toJson())
        .toList(growable: false),
  };
}

bool _stringListsEqual(List<String> left, List<String> right) {
  if (left.length != right.length) {
    return false;
  }
  for (var index = 0; index < left.length; index += 1) {
    if (left[index] != right[index]) {
      return false;
    }
  }
  return true;
}
