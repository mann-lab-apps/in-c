import 'dart:convert';

import 'sheet_library_backup.dart';
import 'sheet_score.dart';
import 'sheet_setlist.dart';

enum SheetLibraryBackupDiffItemKind { score, setlist }

enum SheetLibraryBackupDiffChange { added, removed, changed }

class SheetLibraryBackupDiffDetail {
  const SheetLibraryBackupDiffDetail({
    required this.kind,
    required this.change,
    required this.id,
    required this.title,
    required this.contextLabel,
    this.fieldLabels = const <String>[],
    this.fileChanged = false,
    this.annotationChanged = false,
    this.annotationLayerChanged = false,
    this.annotationObjectChanged = false,
    this.annotationStorageChanged = false,
    this.setlistOrderChanged = false,
  });

  final SheetLibraryBackupDiffItemKind kind;
  final SheetLibraryBackupDiffChange change;
  final String id;
  final String title;
  final String contextLabel;
  final List<String> fieldLabels;
  final bool fileChanged;
  final bool annotationChanged;
  final bool annotationLayerChanged;
  final bool annotationObjectChanged;
  final bool annotationStorageChanged;
  final bool setlistOrderChanged;

  String get kindLabel => switch (kind) {
    SheetLibraryBackupDiffItemKind.score => '악보',
    SheetLibraryBackupDiffItemKind.setlist => '세트리스트',
  };

  String get changeLabel => switch (change) {
    SheetLibraryBackupDiffChange.added => '추가',
    SheetLibraryBackupDiffChange.removed => '삭제',
    SheetLibraryBackupDiffChange.changed => '수정',
  };

  List<String> get reviewLabels {
    final labels = <String>{...fieldLabels};
    if (fileChanged) labels.add('원본/연결 파일');
    if (annotationLayerChanged) labels.add('필기 레이어 구성');
    if (annotationObjectChanged) labels.add('필기 내용');
    if (annotationStorageChanged) labels.add('필기 저장 파일');
    if (annotationChanged &&
        !annotationLayerChanged &&
        !annotationObjectChanged &&
        !annotationStorageChanged) {
      labels.add('필기 데이터');
    }
    if (setlistOrderChanged) labels.add('곡 순서');
    return List<String>.unmodifiable(labels);
  }
}

class SheetLibraryBackupDiff {
  const SheetLibraryBackupDiff({
    required this.addedScoreIds,
    required this.removedScoreIds,
    required this.changedScoreIds,
    required this.changedScoreFieldLabels,
    required this.fileChangedScoreIds,
    required this.annotationChangedScoreIds,
    required this.annotationLayerChangedScoreIds,
    required this.annotationObjectChangedScoreIds,
    required this.annotationStorageChangedScoreIds,
    required this.addedSetlistIds,
    required this.removedSetlistIds,
    required this.changedSetlistIds,
    required this.changedSetlistFieldLabels,
    required this.setlistOrderChangedIds,
    required this.settingsChanged,
    required this.details,
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
    final changedScoreFields = <String, List<String>>{};
    final changedScoreFieldLabels = <String>{};
    final fileChangedScoreIds = <String>[];
    final annotationChangedScoreIds = <String>[];
    final annotationLayerChangedScoreIds = <String>[];
    final annotationObjectChangedScoreIds = <String>[];
    final annotationStorageChangedScoreIds = <String>[];
    for (final id in sharedScoreIds) {
      final baseScore = baseScores[id]!;
      final incomingScore = incomingScores[id]!;
      final baseJson = baseScore.toJson();
      final incomingJson = incomingScore.toJson();
      if (!_jsonEqual(baseJson, incomingJson)) {
        changedScoreIds.add(id);
        final labels = _changedFieldLabels(
          baseJson,
          incomingJson,
          _scoreFieldLabels,
        );
        changedScoreFields[id] = labels;
        changedScoreFieldLabels.addAll(labels);
      }
      if (_scoreFileSignature(baseScore) !=
          _scoreFileSignature(incomingScore)) {
        fileChangedScoreIds.add(id);
      }
      if (_scoreAnnotationSignature(baseScore) !=
          _scoreAnnotationSignature(incomingScore)) {
        annotationChangedScoreIds.add(id);
      }
      if (_scoreAnnotationLayerSignature(baseScore) !=
          _scoreAnnotationLayerSignature(incomingScore)) {
        annotationLayerChangedScoreIds.add(id);
      }
      if (_scoreAnnotationObjectSignature(baseScore) !=
          _scoreAnnotationObjectSignature(incomingScore)) {
        annotationObjectChangedScoreIds.add(id);
      }
      if (_scoreAnnotationStorageSignature(baseScore) !=
          _scoreAnnotationStorageSignature(incomingScore)) {
        annotationStorageChangedScoreIds.add(id);
      }
    }

    final baseSetlists = _setlistsById(base.setlists);
    final incomingSetlists = _setlistsById(incoming.setlists);
    final sharedSetlistIds = baseSetlists.keys.toSet()
      ..retainAll(incomingSetlists.keys);

    final changedSetlistIds = <String>[];
    final changedSetlistFields = <String, List<String>>{};
    final changedSetlistFieldLabels = <String>{};
    final setlistOrderChangedIds = <String>[];
    for (final id in sharedSetlistIds) {
      final baseSetlist = baseSetlists[id]!;
      final incomingSetlist = incomingSetlists[id]!;
      final baseJson = baseSetlist.toJson();
      final incomingJson = incomingSetlist.toJson();
      if (!_jsonEqual(baseJson, incomingJson)) {
        changedSetlistIds.add(id);
        final labels = _changedFieldLabels(
          baseJson,
          incomingJson,
          _setlistFieldLabels,
        );
        changedSetlistFields[id] = labels;
        changedSetlistFieldLabels.addAll(labels);
      }
      if (!_stringListsEqual(baseSetlist.scoreIds, incomingSetlist.scoreIds)) {
        setlistOrderChangedIds.add(id);
      }
    }

    final addedScoreIds = _sortedDifference(
      incomingScores.keys,
      baseScores.keys,
    );
    final removedScoreIds = _sortedDifference(
      baseScores.keys,
      incomingScores.keys,
    );
    final addedSetlistIds = _sortedDifference(
      incomingSetlists.keys,
      baseSetlists.keys,
    );
    final removedSetlistIds = _sortedDifference(
      baseSetlists.keys,
      incomingSetlists.keys,
    );
    final sortedChangedScoreIds = _sorted(changedScoreIds);
    final sortedChangedSetlistIds = _sorted(changedSetlistIds);
    final details = <SheetLibraryBackupDiffDetail>[
      for (final id in addedScoreIds)
        _scoreDetail(incomingScores[id]!, SheetLibraryBackupDiffChange.added),
      for (final id in removedScoreIds)
        _scoreDetail(baseScores[id]!, SheetLibraryBackupDiffChange.removed),
      for (final id in sortedChangedScoreIds)
        _scoreDetail(
          incomingScores[id]!,
          SheetLibraryBackupDiffChange.changed,
          fieldLabels: changedScoreFields[id] ?? const <String>[],
          fileChanged: fileChangedScoreIds.contains(id),
          annotationChanged: annotationChangedScoreIds.contains(id),
          annotationLayerChanged: annotationLayerChangedScoreIds.contains(id),
          annotationObjectChanged: annotationObjectChangedScoreIds.contains(id),
          annotationStorageChanged: annotationStorageChangedScoreIds.contains(
            id,
          ),
        ),
      for (final id in addedSetlistIds)
        _setlistDetail(
          incomingSetlists[id]!,
          SheetLibraryBackupDiffChange.added,
        ),
      for (final id in removedSetlistIds)
        _setlistDetail(baseSetlists[id]!, SheetLibraryBackupDiffChange.removed),
      for (final id in sortedChangedSetlistIds)
        _setlistDetail(
          incomingSetlists[id]!,
          SheetLibraryBackupDiffChange.changed,
          fieldLabels: changedSetlistFields[id] ?? const <String>[],
          setlistOrderChanged: setlistOrderChangedIds.contains(id),
        ),
    ];

    return SheetLibraryBackupDiff(
      addedScoreIds: addedScoreIds,
      removedScoreIds: removedScoreIds,
      changedScoreIds: sortedChangedScoreIds,
      changedScoreFieldLabels: _orderedLabels(
        changedScoreFieldLabels,
        _scoreFieldLabels,
      ),
      fileChangedScoreIds: _sorted(fileChangedScoreIds),
      annotationChangedScoreIds: _sorted(annotationChangedScoreIds),
      annotationLayerChangedScoreIds: _sorted(annotationLayerChangedScoreIds),
      annotationObjectChangedScoreIds: _sorted(annotationObjectChangedScoreIds),
      annotationStorageChangedScoreIds: _sorted(
        annotationStorageChangedScoreIds,
      ),
      addedSetlistIds: addedSetlistIds,
      removedSetlistIds: removedSetlistIds,
      changedSetlistIds: sortedChangedSetlistIds,
      changedSetlistFieldLabels: _orderedLabels(
        changedSetlistFieldLabels,
        _setlistFieldLabels,
      ),
      setlistOrderChangedIds: _sorted(setlistOrderChangedIds),
      settingsChanged: !_jsonEqual(
        _settingsJson(base),
        _settingsJson(incoming),
      ),
      details: List<SheetLibraryBackupDiffDetail>.unmodifiable(details),
    );
  }

  final List<String> addedScoreIds;
  final List<String> removedScoreIds;
  final List<String> changedScoreIds;
  final List<String> changedScoreFieldLabels;
  final List<String> fileChangedScoreIds;
  final List<String> annotationChangedScoreIds;
  final List<String> annotationLayerChangedScoreIds;
  final List<String> annotationObjectChangedScoreIds;
  final List<String> annotationStorageChangedScoreIds;
  final List<String> addedSetlistIds;
  final List<String> removedSetlistIds;
  final List<String> changedSetlistIds;
  final List<String> changedSetlistFieldLabels;
  final List<String> setlistOrderChangedIds;
  final bool settingsChanged;
  final List<SheetLibraryBackupDiffDetail> details;

  bool get hasChanges {
    return addedScoreIds.isNotEmpty ||
        removedScoreIds.isNotEmpty ||
        changedScoreIds.isNotEmpty ||
        addedSetlistIds.isNotEmpty ||
        removedSetlistIds.isNotEmpty ||
        changedSetlistIds.isNotEmpty ||
        settingsChanged;
  }

  int get changedGroupCount {
    var count = 0;
    if (addedScoreIds.isNotEmpty) {
      count += 1;
    }
    if (removedScoreIds.isNotEmpty) {
      count += 1;
    }
    if (changedScoreIds.isNotEmpty) {
      count += 1;
    }
    if (addedSetlistIds.isNotEmpty) {
      count += 1;
    }
    if (removedSetlistIds.isNotEmpty) {
      count += 1;
    }
    if (changedSetlistIds.isNotEmpty) {
      count += 1;
    }
    if (settingsChanged) {
      count += 1;
    }
    return count;
  }
}

enum SheetLibrarySyncDryRunItemKind { score, setlist, settings }

enum SheetLibrarySyncDryRunStatus {
  localOnly,
  remoteOnly,
  sameChange,
  mergeable,
  conflict,
}

class SheetLibrarySyncDryRunItem {
  const SheetLibrarySyncDryRunItem({
    required this.kind,
    required this.id,
    required this.title,
    required this.status,
    required this.localChange,
    required this.remoteChange,
    this.conflictingFieldLabels = const <String>[],
  });

  final SheetLibrarySyncDryRunItemKind kind;
  final String id;
  final String title;
  final SheetLibrarySyncDryRunStatus status;
  final SheetLibraryBackupDiffChange? localChange;
  final SheetLibraryBackupDiffChange? remoteChange;
  final List<String> conflictingFieldLabels;

  bool get requiresManualReview =>
      status == SheetLibrarySyncDryRunStatus.conflict;
}

class SheetLibrarySyncDryRun {
  const SheetLibrarySyncDryRun({required this.items});

  factory SheetLibrarySyncDryRun.compare({
    required SheetLibraryBackup base,
    required SheetLibraryBackup local,
    required SheetLibraryBackup remote,
  }) {
    final items = <SheetLibrarySyncDryRunItem>[
      ..._scoreSyncItems(base, local, remote),
      ..._setlistSyncItems(base, local, remote),
    ];
    final settingsItem = _settingsSyncItem(base, local, remote);
    if (settingsItem != null) items.add(settingsItem);
    items.sort((left, right) {
      final kindOrder = left.kind.index.compareTo(right.kind.index);
      return kindOrder != 0 ? kindOrder : left.id.compareTo(right.id);
    });
    return SheetLibrarySyncDryRun(
      items: List<SheetLibrarySyncDryRunItem>.unmodifiable(items),
    );
  }

  final List<SheetLibrarySyncDryRunItem> items;

  List<SheetLibrarySyncDryRunItem> get conflicts =>
      List.unmodifiable(items.where((item) => item.requiresManualReview));

  List<SheetLibrarySyncDryRunItem> get mergeable => List.unmodifiable(
    items.where((item) => item.status != SheetLibrarySyncDryRunStatus.conflict),
  );

  bool get hasChanges => items.isNotEmpty;
  bool get requiresManualReview => conflicts.isNotEmpty;
}

class SheetLibrarySyncDryRunReport {
  const SheetLibrarySyncDryRunReport({
    required this.headline,
    required this.summaryLines,
    required this.reviewLines,
    required this.items,
  });

  factory SheetLibrarySyncDryRunReport.fromDryRun(
    SheetLibrarySyncDryRun dryRun,
  ) {
    if (!dryRun.hasChanges) {
      return const SheetLibrarySyncDryRunReport(
        headline: '동기화 변경 없음',
        summaryLines: <String>['기준, 로컬, 원격 정보가 같습니다.'],
        reviewLines: <String>[],
        items: <SheetLibrarySyncDryRunItem>[],
      );
    }
    final counts = <SheetLibrarySyncDryRunStatus, int>{};
    for (final item in dryRun.items) {
      counts[item.status] = (counts[item.status] ?? 0) + 1;
    }
    final conflictCount = counts[SheetLibrarySyncDryRunStatus.conflict] ?? 0;
    final mergeableCount = counts[SheetLibrarySyncDryRunStatus.mergeable] ?? 0;
    return SheetLibrarySyncDryRunReport(
      headline: '동기화 변경 ${dryRun.items.length}개 · 수동 검토 $conflictCount개',
      summaryLines: List<String>.unmodifiable(<String>[
        for (final status in SheetLibrarySyncDryRunStatus.values)
          if ((counts[status] ?? 0) > 0)
            '${_syncStatusLabel(status)} ${counts[status]}개',
      ]),
      reviewLines: List<String>.unmodifiable(<String>[
        if (conflictCount > 0)
          '$conflictCount개 항목은 자동 적용하지 말고 보존할 값을 직접 선택해야 합니다.',
        if (mergeableCount > 0)
          '$mergeableCount개 항목은 서로 다른 필드의 병합 후보지만 아직 데이터를 적용하지 않습니다.',
      ]),
      items: dryRun.items,
    );
  }

  final String headline;
  final List<String> summaryLines;
  final List<String> reviewLines;
  final List<SheetLibrarySyncDryRunItem> items;

  bool get requiresReview => reviewLines.isNotEmpty;

  String toMarkdown({int maxItems = 200}) {
    final safeLimit = maxItems < 0 ? 0 : maxItems;
    final visibleItems = items.take(safeLimit).toList(growable: false);
    final duplicateKeys = <String, int>{};
    for (final item in items) {
      final key = '${item.kind.name}:${item.title}';
      duplicateKeys[key] = (duplicateKeys[key] ?? 0) + 1;
    }
    final buffer = StringBuffer()
      ..writeln('# Clef & Staff 동기화 변경 검토')
      ..writeln()
      ..writeln(headline)
      ..writeln()
      ..writeln('## 요약');
    for (final line in summaryLines) {
      buffer.writeln('- $line');
    }
    if (reviewLines.isNotEmpty) {
      buffer
        ..writeln()
        ..writeln('## 확인 필요');
      for (final line in reviewLines) {
        buffer.writeln('- $line');
      }
    }
    if (items.isNotEmpty) {
      buffer
        ..writeln()
        ..writeln('## 변경 항목');
      for (final item in visibleItems) {
        final duplicateKey = '${item.kind.name}:${item.title}';
        final context = <String>[
          if (duplicateKeys[duplicateKey]! > 1)
            '식별자 ${_shortBackupIdentifier(item.id)}',
          if (item.localChange != null)
            '로컬 ${_backupChangeLabel(item.localChange!)}',
          if (item.remoteChange != null)
            '원격 ${_backupChangeLabel(item.remoteChange!)}',
          if (item.conflictingFieldLabels.isNotEmpty)
            '충돌: ${item.conflictingFieldLabels.join(', ')}',
        ];
        buffer.writeln(
          '- [${_syncKindLabel(item.kind)}/${_syncStatusLabel(item.status)}] '
          '${item.title}${context.isEmpty ? '' : ' — ${context.join(' · ')}'}',
        );
      }
      final hiddenCount = items.length - visibleItems.length;
      if (hiddenCount > 0) {
        buffer.writeln('- 그 외 $hiddenCount개 항목');
      }
    }
    buffer
      ..writeln()
      ..writeln('이 보고서는 비파괴 dry-run 결과입니다. 데이터를 병합하거나 적용하지 않습니다.');
    return buffer.toString().trimRight();
  }
}

class SheetLibraryBackupDiffReport {
  const SheetLibraryBackupDiffReport({
    required this.headline,
    required this.summaryLines,
    required this.reviewLines,
    required this.details,
  });

  factory SheetLibraryBackupDiffReport.fromDiff(SheetLibraryBackupDiff diff) {
    if (!diff.hasChanges) {
      return const SheetLibraryBackupDiffReport(
        headline: '변경 없음',
        summaryLines: <String>['두 백업의 악보, 세트리스트, 설정이 같습니다.'],
        reviewLines: <String>[],
        details: <SheetLibraryBackupDiffDetail>[],
      );
    }

    final summaryLines = <String>[
      if (diff.addedScoreIds.isNotEmpty) '새 악보 ${diff.addedScoreIds.length}개',
      if (diff.removedScoreIds.isNotEmpty)
        '삭제된 악보 ${diff.removedScoreIds.length}개',
      if (diff.changedScoreIds.isNotEmpty)
        '수정된 악보 ${diff.changedScoreIds.length}개',
      if (diff.addedSetlistIds.isNotEmpty)
        '새 세트리스트 ${diff.addedSetlistIds.length}개',
      if (diff.removedSetlistIds.isNotEmpty)
        '삭제된 세트리스트 ${diff.removedSetlistIds.length}개',
      if (diff.changedSetlistIds.isNotEmpty)
        '수정된 세트리스트 ${diff.changedSetlistIds.length}개',
      if (diff.settingsChanged) '앱/연습 도구 설정 변경',
    ];

    final reviewLines = <String>[
      if (diff.removedScoreIds.isNotEmpty)
        '삭제된 악보가 있어 복원할지 삭제를 유지할지 확인이 필요합니다.',
      if (diff.changedScoreFieldLabels.isNotEmpty)
        '수정된 악보 필드: ${diff.changedScoreFieldLabels.join(', ')}',
      if (diff.fileChangedScoreIds.isNotEmpty)
        '파일 경로나 연결 파일이 달라 원본 PDF/오디오 위치 확인이 필요합니다.',
      if (diff.annotationChangedScoreIds.isNotEmpty)
        '필기 데이터가 달라 어느 필기를 보존할지 확인이 필요합니다.',
      if (diff.annotationLayerChangedScoreIds.isNotEmpty)
        '필기 레이어 구성이 달라 보이기/내보내기 설정 확인이 필요합니다.',
      if (diff.annotationObjectChangedScoreIds.isNotEmpty)
        '필기 stroke, 텍스트, 스탬프 내용이 달라 자동 병합 전 검토가 필요합니다.',
      if (diff.annotationStorageChangedScoreIds.isNotEmpty)
        '필기 저장 파일 참조가 달라 백업에 실제 필기 파일이 포함됐는지 확인이 필요합니다.',
      if (diff.changedSetlistFieldLabels.isNotEmpty)
        '수정된 세트리스트 필드: ${diff.changedSetlistFieldLabels.join(', ')}',
      if (diff.setlistOrderChangedIds.isNotEmpty)
        '세트리스트 순서가 달라 어느 순서를 사용할지 확인이 필요합니다.',
      if (diff.settingsChanged) '메트로놈, 튜너, 표시, 필기 preset 같은 전역 설정 변경을 확인하세요.',
    ];

    return SheetLibraryBackupDiffReport(
      headline: '백업 변경 ${diff.changedGroupCount}종 감지',
      summaryLines: List<String>.unmodifiable(summaryLines),
      reviewLines: List<String>.unmodifiable(reviewLines),
      details: diff.details,
    );
  }

  final String headline;
  final List<String> summaryLines;
  final List<String> reviewLines;
  final List<SheetLibraryBackupDiffDetail> details;

  bool get requiresReview => reviewLines.isNotEmpty;

  String toMarkdown({int maxItems = 200}) {
    final safeLimit = maxItems < 0 ? 0 : maxItems;
    final visibleDetails = details.take(safeLimit).toList(growable: false);
    final duplicateKeys = <String, int>{};
    for (final detail in details) {
      final key = '${detail.kind.name}:${detail.title}';
      duplicateKeys[key] = (duplicateKeys[key] ?? 0) + 1;
    }
    final buffer = StringBuffer()
      ..writeln('# Clef & Staff 백업 변경 검토')
      ..writeln()
      ..writeln(headline)
      ..writeln()
      ..writeln('## 요약');
    for (final line in summaryLines) {
      buffer.writeln('- $line');
    }
    if (reviewLines.isNotEmpty) {
      buffer
        ..writeln()
        ..writeln('## 확인 필요');
      for (final line in reviewLines) {
        buffer.writeln('- $line');
      }
    }
    if (details.isNotEmpty) {
      buffer
        ..writeln()
        ..writeln('## 변경 항목');
      for (final detail in visibleDetails) {
        final duplicateKey = '${detail.kind.name}:${detail.title}';
        final contextParts = <String>[
          if (detail.contextLabel.isNotEmpty) detail.contextLabel,
          if (duplicateKeys[duplicateKey]! > 1)
            '식별자 ${_shortBackupIdentifier(detail.id)}',
          if (detail.reviewLabels.isNotEmpty) detail.reviewLabels.join(', '),
        ];
        final context = contextParts.isEmpty
            ? ''
            : ' — ${contextParts.join(' · ')}';
        buffer.writeln(
          '- [${detail.kindLabel}/${detail.changeLabel}] ${detail.title}$context',
        );
      }
      final hiddenCount = details.length - visibleDetails.length;
      if (hiddenCount > 0) {
        buffer.writeln('- 그 외 $hiddenCount개 항목');
      }
    }
    buffer
      ..writeln()
      ..writeln('이 보고서는 복원 전 검토용입니다. 복원은 field-level 병합이 아니라 백업 전체 교체입니다.');
    return buffer.toString().trimRight();
  }
}

String _syncKindLabel(SheetLibrarySyncDryRunItemKind kind) => switch (kind) {
  SheetLibrarySyncDryRunItemKind.score => '악보',
  SheetLibrarySyncDryRunItemKind.setlist => '세트리스트',
  SheetLibrarySyncDryRunItemKind.settings => '설정',
};

String _syncStatusLabel(SheetLibrarySyncDryRunStatus status) =>
    switch (status) {
      SheetLibrarySyncDryRunStatus.localOnly => '로컬만 변경',
      SheetLibrarySyncDryRunStatus.remoteOnly => '원격만 변경',
      SheetLibrarySyncDryRunStatus.sameChange => '동일 변경',
      SheetLibrarySyncDryRunStatus.mergeable => '병합 후보',
      SheetLibrarySyncDryRunStatus.conflict => '수동 검토',
    };

String _backupChangeLabel(SheetLibraryBackupDiffChange change) =>
    switch (change) {
      SheetLibraryBackupDiffChange.added => '추가',
      SheetLibraryBackupDiffChange.removed => '삭제',
      SheetLibraryBackupDiffChange.changed => '수정',
    };

enum SheetLibraryBackupMergeRisk { none, additive, review, destructive }

class SheetLibraryBackupMergeReview {
  const SheetLibraryBackupMergeReview({
    required this.risk,
    required this.title,
    required this.lines,
  });

  factory SheetLibraryBackupMergeReview.fromDiff(SheetLibraryBackupDiff diff) {
    if (!diff.hasChanges) {
      return const SheetLibraryBackupMergeReview(
        risk: SheetLibraryBackupMergeRisk.none,
        title: '변경 없음',
        lines: <String>['현재 라이브러리와 선택한 백업의 정보가 같습니다.'],
      );
    }
    if (diff.removedScoreIds.isNotEmpty || diff.removedSetlistIds.isNotEmpty) {
      return const SheetLibraryBackupMergeReview(
        risk: SheetLibraryBackupMergeRisk.destructive,
        title: '삭제 포함 전체 교체',
        lines: <String>[
          '선택한 백업을 적용하면 현재 라이브러리에만 있는 항목이 사라질 수 있습니다.',
          '자동 병합이 아니라 전체 복원입니다. 필요한 경우 먼저 현재 라이브러리를 백업하세요.',
        ],
      );
    }
    if (diff.changedScoreIds.isEmpty &&
        diff.changedSetlistIds.isEmpty &&
        !diff.settingsChanged) {
      return const SheetLibraryBackupMergeReview(
        risk: SheetLibraryBackupMergeRisk.additive,
        title: '새 항목 중심 변경',
        lines: <String>['현재 항목을 지우는 변경은 없지만, 복원은 여전히 전체 백업 기준으로 적용됩니다.'],
      );
    }
    return const SheetLibraryBackupMergeReview(
      risk: SheetLibraryBackupMergeRisk.review,
      title: '수정 포함 전체 교체',
      lines: <String>[
        '같은 악보나 세트리스트의 정보가 달라 어느 쪽을 유지할지 확인이 필요합니다.',
        '아직 field-level 병합은 지원하지 않으므로 복원 전 현재 라이브러리를 백업하세요.',
      ],
    );
  }

  final SheetLibraryBackupMergeRisk risk;
  final String title;
  final List<String> lines;

  bool get requiresManualReview {
    return risk == SheetLibraryBackupMergeRisk.review ||
        risk == SheetLibraryBackupMergeRisk.destructive;
  }
}

enum SheetLibraryBackupPreviewStatus {
  ready,
  invalid,
  unsupportedVersion,
  error,
}

class SheetLibraryBackupImportPreview {
  const SheetLibraryBackupImportPreview({
    required this.status,
    this.report,
    this.mergeReview,
    this.scoreCount = 0,
    this.setlistCount = 0,
    this.backupJson,
    this.failureReason,
  });

  final SheetLibraryBackupPreviewStatus status;
  final SheetLibraryBackupDiffReport? report;
  final SheetLibraryBackupMergeReview? mergeReview;
  final int scoreCount;
  final int setlistCount;
  final String? backupJson;
  final String? failureReason;

  bool get canRestore => status == SheetLibraryBackupPreviewStatus.ready;
}

class SheetLibraryFullBackupImportPreview {
  const SheetLibraryFullBackupImportPreview({
    required this.status,
    this.report,
    this.mergeReview,
    this.scoreCount = 0,
    this.setlistCount = 0,
    this.fileMappingCount = 0,
    this.missingFileCount = 0,
    this.backupBytes,
    this.failureReason,
  });

  final SheetLibraryBackupPreviewStatus status;
  final SheetLibraryBackupDiffReport? report;
  final SheetLibraryBackupMergeReview? mergeReview;
  final int scoreCount;
  final int setlistCount;
  final int fileMappingCount;
  final int missingFileCount;
  final List<int>? backupBytes;
  final String? failureReason;

  bool get canRestore => status == SheetLibraryBackupPreviewStatus.ready;
}

Map<String, SheetScore> _byId(List<SheetScore> scores) {
  return <String, SheetScore>{for (final score in scores) score.id: score};
}

Map<String, SheetSetlist> _setlistsById(List<SheetSetlist> setlists) {
  return <String, SheetSetlist>{
    for (final setlist in setlists) setlist.id: setlist,
  };
}

SheetLibraryBackupDiffDetail _scoreDetail(
  SheetScore score,
  SheetLibraryBackupDiffChange change, {
  List<String> fieldLabels = const <String>[],
  bool fileChanged = false,
  bool annotationChanged = false,
  bool annotationLayerChanged = false,
  bool annotationObjectChanged = false,
  bool annotationStorageChanged = false,
}) {
  final composer = score.composer.trim();
  final sourceName = score.sourceFileDisplayName.trim();
  final title = score.displayTitle.trim();
  final contextParts = <String>[
    if (composer.isNotEmpty) composer,
    if (sourceName.isNotEmpty && sourceName != title) sourceName,
  ];
  return SheetLibraryBackupDiffDetail(
    kind: SheetLibraryBackupDiffItemKind.score,
    change: change,
    id: score.id,
    title: title.isEmpty ? '제목 없는 악보' : title,
    contextLabel: contextParts.join(' · '),
    fieldLabels: fieldLabels,
    fileChanged: fileChanged,
    annotationChanged: annotationChanged,
    annotationLayerChanged: annotationLayerChanged,
    annotationObjectChanged: annotationObjectChanged,
    annotationStorageChanged: annotationStorageChanged,
  );
}

SheetLibraryBackupDiffDetail _setlistDetail(
  SheetSetlist setlist,
  SheetLibraryBackupDiffChange change, {
  List<String> fieldLabels = const <String>[],
  bool setlistOrderChanged = false,
}) {
  final title = setlist.title.trim();
  return SheetLibraryBackupDiffDetail(
    kind: SheetLibraryBackupDiffItemKind.setlist,
    change: change,
    id: setlist.id,
    title: title.isEmpty ? '제목 없는 세트리스트' : title,
    contextLabel: '${setlist.scoreIds.length}곡',
    fieldLabels: fieldLabels,
    setlistOrderChanged: setlistOrderChanged,
  );
}

List<String> _sortedDifference(Iterable<String> left, Iterable<String> right) {
  return _sorted(left.toSet().difference(right.toSet()));
}

List<String> _sorted(Iterable<String> values) {
  return values.toList(growable: false)..sort();
}

bool _jsonEqual(Object? left, Object? right) {
  if (identical(left, right)) return true;
  if (left is num && right is num) return left == right;
  if (left is List && right is List) {
    if (left.length != right.length) return false;
    for (var index = 0; index < left.length; index += 1) {
      if (!_jsonEqual(left[index], right[index])) return false;
    }
    return true;
  }
  if (left is Map && right is Map) {
    if (left.length != right.length) return false;
    for (final key in left.keys) {
      if (!right.containsKey(key) || !_jsonEqual(left[key], right[key])) {
        return false;
      }
    }
    return true;
  }
  return left == right;
}

List<String> _changedFieldLabels(
  Map<String, Object?> base,
  Map<String, Object?> incoming,
  Map<String, String> labels,
) {
  final changedKeys = <String>{};
  for (final key in <String>{...base.keys, ...incoming.keys}) {
    if (!_jsonEqual(base[key], incoming[key])) {
      changedKeys.add(key);
    }
  }
  return _orderedLabels(
    changedKeys.map((key) => labels[key] ?? key).toSet(),
    labels,
  );
}

List<String> _orderedLabels(Set<String> values, Map<String, String> labels) {
  final ordered = <String>[
    for (final label in labels.values)
      if (values.contains(label)) label,
  ];
  final unknown = values.difference(ordered.toSet()).toList(growable: false)
    ..sort();
  return List<String>.unmodifiable(<String>[...ordered, ...unknown]);
}

const _scoreFieldLabels = <String, String>{
  'title': '제목',
  'composer': '작곡가',
  'tags': '태그',
  'note': '메모',
  'filePath': '원본 파일',
  'collection': '컬렉션',
  'group': '그룹',
  'rating': '별점',
  'linkedFiles': '연결 파일',
  'structuredNotes': '공연/연습 메모',
  'customFields': '사용자 필드',
  'importedAt': '가져온 날짜',
  'updatedAt': '수정 시간',
  'lastOpenedAt': '최근 열기',
  'lastPage': '마지막 페이지',
  'isFavorite': '즐겨찾기',
  'isPinned': '고정',
  'bookmarks': '북마크',
  'viewerSettings': '보기 설정',
  'pageSettings': '페이지 정리',
  'annotationLayer': '필기 레이어',
  'annotationStorage': '필기 저장소',
  'pdfLinkSanitization': 'PDF 링크 처리',
  'autoScrollSettings': '자동 스크롤',
  'metronomeSettings': '메트로놈 설정',
};

const _setlistFieldLabels = <String, String>{
  'title': '제목',
  'scoreIds': '곡 순서',
  'createdAt': '생성일',
  'updatedAt': '수정 시간',
  'rehearsalMode': '공연 모드',
  'scoreStartPages': '시작 쪽',
  'scoreNotes': '곡별 메모',
  'scoreDurations': '곡별 시간',
  'scoreMetronomeSettings': '곡별 메트로놈',
  'transitionSeconds': '전환 시간',
  'viewerSettingsOverride': '보기 preset',
  'lastOpenedAt': '최근 열기',
  'lastOpenedScoreId': '진행 위치',
};

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

String _scoreAnnotationLayerSignature(SheetScore score) {
  return jsonEncode(<String, Object?>{
    'layers': score.annotationLayer.layers
        .map((layer) => layer.toJson())
        .toList(),
  });
}

String _scoreAnnotationObjectSignature(SheetScore score) {
  final layer = score.annotationLayer;
  return jsonEncode(<String, Object?>{
    'strokes': layer.strokes.map((stroke) => stroke.toJson()).toList(),
    'texts': layer.texts.map((text) => text.toJson()).toList(),
    'redoStack': layer.redoStack.map((entry) => entry.toJson()).toList(),
    'eraseUndoStack': layer.eraseUndoStack
        .map((entry) => entry.toJson())
        .toList(),
  });
}

String _scoreAnnotationStorageSignature(SheetScore score) {
  return jsonEncode(score.annotationStorage.toJson());
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

String _shortBackupIdentifier(String value) {
  final trimmed = value.trim();
  if (trimmed.length <= 12) return trimmed;
  return trimmed.substring(trimmed.length - 8);
}

List<SheetLibrarySyncDryRunItem> _scoreSyncItems(
  SheetLibraryBackup base,
  SheetLibraryBackup local,
  SheetLibraryBackup remote,
) {
  final baseItems = _byId(base.scores);
  final localItems = _byId(local.scores);
  final remoteItems = _byId(remote.scores);
  return _syncItems<SheetScore>(
    kind: SheetLibrarySyncDryRunItemKind.score,
    baseItems: baseItems,
    localItems: localItems,
    remoteItems: remoteItems,
    toJson: (score) => score.toJson(),
    titleFor: (score) {
      final title = score.displayTitle.trim();
      return title.isEmpty ? '제목 없는 악보' : title;
    },
    fieldLabels: _scoreFieldLabels,
  );
}

List<SheetLibrarySyncDryRunItem> _setlistSyncItems(
  SheetLibraryBackup base,
  SheetLibraryBackup local,
  SheetLibraryBackup remote,
) {
  final baseItems = _setlistsById(base.setlists);
  final localItems = _setlistsById(local.setlists);
  final remoteItems = _setlistsById(remote.setlists);
  return _syncItems<SheetSetlist>(
    kind: SheetLibrarySyncDryRunItemKind.setlist,
    baseItems: baseItems,
    localItems: localItems,
    remoteItems: remoteItems,
    toJson: (setlist) => setlist.toJson(),
    titleFor: (setlist) {
      final title = setlist.title.trim();
      return title.isEmpty ? '제목 없는 세트리스트' : title;
    },
    fieldLabels: _setlistFieldLabels,
  );
}

SheetLibrarySyncDryRunItem? _settingsSyncItem(
  SheetLibraryBackup base,
  SheetLibraryBackup local,
  SheetLibraryBackup remote,
) {
  final baseJson = _settingsJson(base);
  final localJson = _settingsJson(local);
  final remoteJson = _settingsJson(remote);
  final localChanged = !_jsonEqual(baseJson, localJson);
  final remoteChanged = !_jsonEqual(baseJson, remoteJson);
  if (!localChanged && !remoteChanged) return null;

  final status = switch ((localChanged, remoteChanged)) {
    (true, false) => SheetLibrarySyncDryRunStatus.localOnly,
    (false, true) => SheetLibrarySyncDryRunStatus.remoteOnly,
    (true, true) when _jsonEqual(localJson, remoteJson) =>
      SheetLibrarySyncDryRunStatus.sameChange,
    _ => SheetLibrarySyncDryRunStatus.conflict,
  };
  final conflictingKeys = status == SheetLibrarySyncDryRunStatus.conflict
      ? _conflictingChangedKeys(baseJson, localJson, remoteJson)
      : const <String>[];
  return SheetLibrarySyncDryRunItem(
    kind: SheetLibrarySyncDryRunItemKind.settings,
    id: 'settings',
    title: '앱/연습 도구 설정',
    status: status,
    localChange: localChanged ? SheetLibraryBackupDiffChange.changed : null,
    remoteChange: remoteChanged ? SheetLibraryBackupDiffChange.changed : null,
    conflictingFieldLabels: _syncFieldLabels(
      conflictingKeys,
      _settingsFieldLabels,
    ),
  );
}

List<SheetLibrarySyncDryRunItem> _syncItems<T>({
  required SheetLibrarySyncDryRunItemKind kind,
  required Map<String, T> baseItems,
  required Map<String, T> localItems,
  required Map<String, T> remoteItems,
  required Map<String, Object?> Function(T item) toJson,
  required String Function(T item) titleFor,
  required Map<String, String> fieldLabels,
}) {
  final ids = <String>{
    ...baseItems.keys,
    ...localItems.keys,
    ...remoteItems.keys,
  }.toList(growable: false)..sort();
  final result = <SheetLibrarySyncDryRunItem>[];
  for (final id in ids) {
    final baseItem = baseItems[id];
    final localItem = localItems[id];
    final remoteItem = remoteItems[id];
    final localChange = _syncChange(baseItem, localItem, toJson);
    final remoteChange = _syncChange(baseItem, remoteItem, toJson);
    if (localChange == null && remoteChange == null) continue;

    final status = _syncStatus(
      baseItem: baseItem,
      localItem: localItem,
      remoteItem: remoteItem,
      localChange: localChange,
      remoteChange: remoteChange,
      toJson: toJson,
    );
    final conflictingKeys = switch ((status, baseItem, localItem, remoteItem)) {
      (
        SheetLibrarySyncDryRunStatus.conflict,
        final T base,
        final T local,
        final T remote,
      ) =>
        _conflictingChangedKeys(toJson(base), toJson(local), toJson(remote)),
      (
        SheetLibrarySyncDryRunStatus.conflict,
        null,
        final T local,
        final T remote,
      ) =>
        _changedJsonKeys(toJson(local), toJson(remote)),
      _ => const <String>[],
    };
    final titleItem = remoteItem ?? localItem ?? baseItem;
    result.add(
      SheetLibrarySyncDryRunItem(
        kind: kind,
        id: id,
        title: titleFor(titleItem as T),
        status: status,
        localChange: localChange,
        remoteChange: remoteChange,
        conflictingFieldLabels: _syncFieldLabels(conflictingKeys, fieldLabels),
      ),
    );
  }
  return result;
}

SheetLibraryBackupDiffChange? _syncChange<T>(
  T? base,
  T? side,
  Map<String, Object?> Function(T item) toJson,
) {
  if (base == null && side == null) return null;
  if (base == null) return SheetLibraryBackupDiffChange.added;
  if (side == null) return SheetLibraryBackupDiffChange.removed;
  return _jsonEqual(toJson(base), toJson(side))
      ? null
      : SheetLibraryBackupDiffChange.changed;
}

SheetLibrarySyncDryRunStatus _syncStatus<T>({
  required T? baseItem,
  required T? localItem,
  required T? remoteItem,
  required SheetLibraryBackupDiffChange? localChange,
  required SheetLibraryBackupDiffChange? remoteChange,
  required Map<String, Object?> Function(T item) toJson,
}) {
  if (remoteChange == null) return SheetLibrarySyncDryRunStatus.localOnly;
  if (localChange == null) return SheetLibrarySyncDryRunStatus.remoteOnly;
  if (localItem == null && remoteItem == null) {
    return SheetLibrarySyncDryRunStatus.sameChange;
  }
  if (localItem != null &&
      remoteItem != null &&
      _jsonEqual(toJson(localItem), toJson(remoteItem))) {
    return SheetLibrarySyncDryRunStatus.sameChange;
  }
  if (localItem == null || remoteItem == null || baseItem == null) {
    return SheetLibrarySyncDryRunStatus.conflict;
  }
  return _conflictingChangedKeys(
        toJson(baseItem),
        toJson(localItem),
        toJson(remoteItem),
      ).isEmpty
      ? SheetLibrarySyncDryRunStatus.mergeable
      : SheetLibrarySyncDryRunStatus.conflict;
}

List<String> _conflictingChangedKeys(
  Map<String, Object?> base,
  Map<String, Object?> local,
  Map<String, Object?> remote,
) {
  final keys = <String>{...base.keys, ...local.keys, ...remote.keys};
  return keys
      .where(
        (key) =>
            !_jsonEqual(base[key], local[key]) &&
            !_jsonEqual(base[key], remote[key]) &&
            !_jsonEqual(local[key], remote[key]),
      )
      .toList(growable: false)
    ..sort();
}

List<String> _changedJsonKeys(
  Map<String, Object?> left,
  Map<String, Object?> right,
) {
  final keys = <String>{...left.keys, ...right.keys};
  return keys
      .where((key) => !_jsonEqual(left[key], right[key]))
      .toList(growable: false)
    ..sort();
}

List<String> _syncFieldLabels(List<String> keys, Map<String, String> labels) {
  return List<String>.unmodifiable(keys.map((key) => labels[key] ?? key));
}

const _settingsFieldLabels = <String, String>{
  'metronomeSettings': '메트로놈 설정',
  'tunerSettings': '튜너 설정',
  'toneSettings': '기준음/드론 설정',
  'libraryViewSettings': '라이브러리 보기',
  'globalViewerSettings': '악보 보기',
  'performancePresetTemplates': '공연 preset',
  'favoriteAnnotationPreset': '필기 preset',
  'userAnnotationStampPacks': '사용자 스탬프',
};
