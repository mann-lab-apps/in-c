import 'dart:convert';

import 'sheet_library_backup.dart';
import 'sheet_score.dart';
import 'sheet_setlist.dart';

class SheetLibraryBackupDiff {
  const SheetLibraryBackupDiff({
    required this.addedScoreIds,
    required this.removedScoreIds,
    required this.changedScoreIds,
    required this.changedScoreFieldLabels,
    required this.fileChangedScoreIds,
    required this.annotationChangedScoreIds,
    required this.addedSetlistIds,
    required this.removedSetlistIds,
    required this.changedSetlistIds,
    required this.changedSetlistFieldLabels,
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
    final changedScoreFieldLabels = <String>{};
    final fileChangedScoreIds = <String>[];
    final annotationChangedScoreIds = <String>[];
    for (final id in sharedScoreIds) {
      final baseScore = baseScores[id]!;
      final incomingScore = incomingScores[id]!;
      final baseJson = baseScore.toJson();
      final incomingJson = incomingScore.toJson();
      if (!_jsonEqual(baseJson, incomingJson)) {
        changedScoreIds.add(id);
        changedScoreFieldLabels.addAll(
          _changedFieldLabels(baseJson, incomingJson, _scoreFieldLabels),
        );
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
    final changedSetlistFieldLabels = <String>{};
    final setlistOrderChangedIds = <String>[];
    for (final id in sharedSetlistIds) {
      final baseSetlist = baseSetlists[id]!;
      final incomingSetlist = incomingSetlists[id]!;
      final baseJson = baseSetlist.toJson();
      final incomingJson = incomingSetlist.toJson();
      if (!_jsonEqual(baseJson, incomingJson)) {
        changedSetlistIds.add(id);
        changedSetlistFieldLabels.addAll(
          _changedFieldLabels(baseJson, incomingJson, _setlistFieldLabels),
        );
      }
      if (!_stringListsEqual(baseSetlist.scoreIds, incomingSetlist.scoreIds)) {
        setlistOrderChangedIds.add(id);
      }
    }

    return SheetLibraryBackupDiff(
      addedScoreIds: _sortedDifference(incomingScores.keys, baseScores.keys),
      removedScoreIds: _sortedDifference(baseScores.keys, incomingScores.keys),
      changedScoreIds: _sorted(changedScoreIds),
      changedScoreFieldLabels: _orderedLabels(
        changedScoreFieldLabels,
        _scoreFieldLabels,
      ),
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
      changedSetlistFieldLabels: _orderedLabels(
        changedSetlistFieldLabels,
        _setlistFieldLabels,
      ),
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
  final List<String> changedScoreFieldLabels;
  final List<String> fileChangedScoreIds;
  final List<String> annotationChangedScoreIds;
  final List<String> addedSetlistIds;
  final List<String> removedSetlistIds;
  final List<String> changedSetlistIds;
  final List<String> changedSetlistFieldLabels;
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

class SheetLibraryBackupDiffReport {
  const SheetLibraryBackupDiffReport({
    required this.headline,
    required this.summaryLines,
    required this.reviewLines,
  });

  factory SheetLibraryBackupDiffReport.fromDiff(SheetLibraryBackupDiff diff) {
    if (!diff.hasChanges) {
      return const SheetLibraryBackupDiffReport(
        headline: '변경 없음',
        summaryLines: <String>['두 백업의 악보, 세트리스트, 설정이 같습니다.'],
        reviewLines: <String>[],
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
    );
  }

  final String headline;
  final List<String> summaryLines;
  final List<String> reviewLines;

  bool get requiresReview => reviewLines.isNotEmpty;
}

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

List<String> _sortedDifference(Iterable<String> left, Iterable<String> right) {
  return _sorted(left.toSet().difference(right.toSet()));
}

List<String> _sorted(Iterable<String> values) {
  return values.toList(growable: false)..sort();
}

bool _jsonEqual(Object? left, Object? right) {
  return jsonEncode(left) == jsonEncode(right);
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
