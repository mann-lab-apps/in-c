import 'dart:convert';
import 'dart:io';

import 'classical_library_models.dart';
import 'local_audio_scanner.dart';

enum MetadataReviewStatus {
  needsReview(label: '검토 필요'),
  approved(label: '승인됨'),
  rejected(label: '거절됨');

  const MetadataReviewStatus({required this.label});

  final String label;
}

class MetadataCandidate {
  const MetadataCandidate({
    required this.fileId,
    required this.filePath,
    required this.fileName,
    this.composerText,
    this.workTitleText,
    this.movementText,
    this.trackNumber,
    this.trackTotal,
    this.albumText,
    this.artistText,
    this.albumArtistText,
    this.genreText,
    this.year,
    this.discNumber,
    this.discTotal,
    this.confidence = 0,
    this.sourceLabel = '파일명/경로',
    this.rawPattern,
    this.reviewStatus = MetadataReviewStatus.needsReview,
    this.hasTagConflict = false,
  });

  final String fileId;
  final String filePath;
  final String fileName;
  final String? composerText;
  final String? workTitleText;
  final String? movementText;
  final int? trackNumber;
  final int? trackTotal;
  final String? albumText;
  final String? artistText;
  final String? albumArtistText;
  final String? genreText;
  final int? year;
  final int? discNumber;
  final int? discTotal;
  final double confidence;
  final String sourceLabel;
  final String? rawPattern;
  final MetadataReviewStatus reviewStatus;
  final bool hasTagConflict;

  MetadataCandidate copyWith({
    String? filePath,
    String? fileName,
    MetadataReviewStatus? reviewStatus,
  }) {
    return MetadataCandidate(
      fileId: fileId,
      filePath: filePath ?? this.filePath,
      fileName: fileName ?? this.fileName,
      composerText: composerText,
      workTitleText: workTitleText,
      movementText: movementText,
      trackNumber: trackNumber,
      trackTotal: trackTotal,
      albumText: albumText,
      artistText: artistText,
      albumArtistText: albumArtistText,
      genreText: genreText,
      year: year,
      discNumber: discNumber,
      discTotal: discTotal,
      confidence: confidence,
      sourceLabel: sourceLabel,
      rawPattern: rawPattern,
      reviewStatus: reviewStatus ?? this.reviewStatus,
      hasTagConflict: hasTagConflict,
    );
  }

  String get summary {
    final parts = [
      ?composerText,
      ?workTitleText,
      if (trackNumber != null) '$trackNumber번',
      ?movementText,
    ];
    return parts.isEmpty ? '후보 없음' : parts.join(' · ');
  }

  Map<String, Object?> toJson() {
    return {
      'fileId': fileId,
      'filePath': filePath,
      'fileName': fileName,
      'composerText': composerText,
      'workTitleText': workTitleText,
      'movementText': movementText,
      'trackNumber': trackNumber,
      'trackTotal': trackTotal,
      'albumText': albumText,
      'artistText': artistText,
      'albumArtistText': albumArtistText,
      'genreText': genreText,
      'year': year,
      'discNumber': discNumber,
      'discTotal': discTotal,
      'confidence': confidence,
      'sourceLabel': sourceLabel,
      'rawPattern': rawPattern,
      'reviewStatus': reviewStatus.name,
      'hasTagConflict': hasTagConflict,
    };
  }

  factory MetadataCandidate.fromJson(Map<String, Object?> json) {
    return MetadataCandidate(
      fileId: json['fileId'] as String,
      filePath: json['filePath'] as String,
      fileName: json['fileName'] as String,
      composerText: json['composerText'] as String?,
      workTitleText: json['workTitleText'] as String?,
      movementText: json['movementText'] as String?,
      trackNumber: json['trackNumber'] as int?,
      trackTotal: json['trackTotal'] as int?,
      albumText: json['albumText'] as String?,
      artistText: json['artistText'] as String?,
      albumArtistText: json['albumArtistText'] as String?,
      genreText: json['genreText'] as String?,
      year: json['year'] as int?,
      discNumber: json['discNumber'] as int?,
      discTotal: json['discTotal'] as int?,
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0,
      sourceLabel: json['sourceLabel'] as String? ?? '파일명/경로',
      rawPattern: json['rawPattern'] as String?,
      reviewStatus: MetadataReviewStatus.values.byName(
        json['reviewStatus'] as String? ??
            MetadataReviewStatus.needsReview.name,
      ),
      hasTagConflict: json['hasTagConflict'] as bool? ?? false,
    );
  }
}

class MetadataCandidateInferencer {
  const MetadataCandidateInferencer();

  MetadataCandidate infer(LocalAudioFile file) {
    final normalizedPath = file.path.replaceAll('\\', '/');
    final segments = normalizedPath
        .split('/')
        .where((segment) => segment.trim().isNotEmpty)
        .toList();
    final fileName = file.fileName ?? fileNameForPath(file.path);
    final stem = _removeExtension(fileName);
    final dashParts = stem
        .split(RegExp(r'\s+-\s+'))
        .map((part) => part.trim())
        .where((part) => part.isNotEmpty)
        .toList();

    String? composer;
    String? work;
    String? movementSource;
    int? trackNumber;
    var rawPattern = 'path';

    if (dashParts.length >= 3) {
      composer = dashParts.first;
      work = dashParts[1];
      movementSource = dashParts.sublist(2).join(' - ');
      rawPattern = 'composer-work-movement';
    } else {
      final parent = segments.length >= 2
          ? segments[segments.length - 2]
          : null;
      final grandParent = segments.length >= 3
          ? segments[segments.length - 3]
          : null;
      composer = grandParent;
      work = parent;
      movementSource = stem;
    }

    final parsedMovement = _parseMovement(movementSource);
    trackNumber = parsedMovement.trackNumber;
    var movement = parsedMovement.title;

    final pathComposer = _cleanSegment(composer);
    final pathWork = _cleanSegment(work);
    final pathMovement = _cleanSegment(movement);
    final tags = file.tagMetadata;
    final tagWork = _cleanSegment(tags?.work ?? tags?.album);
    final tagMovement = _cleanSegment(tags?.movementTitle ?? tags?.title);
    final hasTagConflict =
        _conflicts(pathWork, tagWork) ||
        _conflicts(pathMovement, tagMovement) ||
        (trackNumber != null &&
            tags?.trackNumber != null &&
            trackNumber != tags!.trackNumber);
    composer = tags?.composer ?? pathComposer;
    work = tagWork ?? pathWork;
    movement = tagMovement ?? pathMovement ?? '';
    trackNumber = tags?.movementNumber ?? tags?.trackNumber ?? trackNumber;

    final score = [
      composer,
      work,
      movement,
      if (trackNumber != null) '$trackNumber',
    ].where((value) => value != null && value.trim().isNotEmpty).length;

    return MetadataCandidate(
      fileId: file.id,
      filePath: file.path,
      fileName: fileName,
      composerText: _cleanSegment(composer),
      workTitleText: _cleanSegment(work),
      movementText: _cleanSegment(movement),
      trackNumber: trackNumber,
      trackTotal: tags?.movementTotal ?? tags?.trackTotal,
      albumText: tags?.album,
      artistText: tags?.artist,
      albumArtistText: tags?.albumArtist,
      genreText: tags?.genre,
      year: tags?.year,
      discNumber: tags?.discNumber,
      discTotal: tags?.discTotal,
      confidence: (score / 4).clamp(0, 1).toDouble(),
      sourceLabel: tags == null ? '파일명/경로' : '오디오 태그 + 파일명',
      rawPattern: tags == null ? rawPattern : 'tag+$rawPattern',
      hasTagConflict: hasTagConflict,
    );
  }

  String _removeExtension(String fileName) {
    final dot = fileName.lastIndexOf('.');
    if (dot <= 0) {
      return fileName;
    }
    return fileName.substring(0, dot);
  }

  _ParsedMovement _parseMovement(String text) {
    final trimmed = text.trim();
    final numbered = RegExp(r'^(\d{1,2})[\s._-]+(.+)$').firstMatch(trimmed);
    if (numbered != null) {
      return _ParsedMovement(
        trackNumber: int.parse(numbered.group(1)!),
        title: numbered.group(2)!.trim(),
      );
    }

    final roman = RegExp(
      r'^(I{1,3}|IV|V|VI{0,3}|IX|X)[\s.:-]+(.+)$',
      caseSensitive: false,
    ).firstMatch(trimmed);
    if (roman != null) {
      return _ParsedMovement(
        trackNumber: _romanToInt(roman.group(1)!),
        title: roman.group(2)!.trim(),
      );
    }

    return _ParsedMovement(title: trimmed);
  }

  int? _romanToInt(String roman) {
    const values = {
      'I': 1,
      'II': 2,
      'III': 3,
      'IV': 4,
      'V': 5,
      'VI': 6,
      'VII': 7,
      'VIII': 8,
      'IX': 9,
      'X': 10,
    };
    return values[roman.toUpperCase()];
  }

  String? _cleanSegment(String? value) {
    final trimmed = value?.trim();
    if (trimmed == null || trimmed.isEmpty) {
      return null;
    }
    return trimmed;
  }

  bool _conflicts(String? inferred, String? tagged) {
    if (inferred == null || tagged == null) {
      return false;
    }
    final left = inferred.toLowerCase().replaceAll(
      RegExp(r'[^a-z0-9가-힣]+'),
      '',
    );
    final right = tagged.toLowerCase().replaceAll(RegExp(r'[^a-z0-9가-힣]+'), '');
    return left.isNotEmpty &&
        right.isNotEmpty &&
        !left.contains(right) &&
        !right.contains(left);
  }
}

class _ParsedMovement {
  const _ParsedMovement({this.trackNumber, required this.title});

  final int? trackNumber;
  final String title;
}

abstract class MetadataCandidateStore {
  Future<List<MetadataCandidate>> load();

  Future<void> save(List<MetadataCandidate> candidates);
}

class MemoryMetadataCandidateStore implements MetadataCandidateStore {
  MemoryMetadataCandidateStore([List<MetadataCandidate> seed = const []])
    : _candidates = [...seed];

  List<MetadataCandidate> _candidates;

  @override
  Future<List<MetadataCandidate>> load() async {
    return [..._candidates];
  }

  @override
  Future<void> save(List<MetadataCandidate> candidates) async {
    _candidates = [...candidates];
  }
}

class JsonMetadataCandidateStore implements MetadataCandidateStore {
  const JsonMetadataCandidateStore(this.file);

  final File file;

  @override
  Future<List<MetadataCandidate>> load() async {
    if (!await file.exists()) {
      return [];
    }

    final decoded =
        jsonDecode(await file.readAsString()) as Map<String, Object?>;
    return [
      for (final item in decoded['candidates'] as List<Object?>? ?? const [])
        MetadataCandidate.fromJson(item! as Map<String, Object?>),
    ];
  }

  @override
  Future<void> save(List<MetadataCandidate> candidates) async {
    await file.parent.create(recursive: true);
    final payload = {
      'schemaVersion': 1,
      'candidates': [for (final candidate in candidates) candidate.toJson()],
    };
    const encoder = JsonEncoder.withIndent('  ');
    await file.writeAsString(encoder.convert(payload));
  }
}

class MetadataCandidateRepository {
  const MetadataCandidateRepository(
    this.store, {
    this.inferencer = const MetadataCandidateInferencer(),
  });

  final MetadataCandidateStore store;
  final MetadataCandidateInferencer inferencer;

  Future<List<MetadataCandidate>> load() => store.load();

  Future<List<MetadataCandidate>> inferForFiles(
    List<LocalAudioFile> files,
  ) async {
    final byFileId = {
      for (final candidate in await store.load()) candidate.fileId: candidate,
    };

    for (final file in files) {
      if (file.importStatus == AudioImportStatus.linked) {
        final existing = byFileId[file.id];
        if (existing != null) {
          byFileId[file.id] = existing.copyWith(
            filePath: file.path,
            fileName: file.fileName,
          );
        }
        continue;
      }
      final existing = byFileId[file.id];
      if (existing != null &&
          existing.reviewStatus != MetadataReviewStatus.needsReview) {
        byFileId[file.id] = existing.copyWith(
          filePath: file.path,
          fileName: file.fileName,
        );
        continue;
      }
      byFileId[file.id] = inferencer.infer(file);
    }

    final sorted = byFileId.values.toList()
      ..sort((a, b) => a.filePath.compareTo(b.filePath));
    await store.save(sorted);
    return sorted;
  }

  Future<List<MetadataCandidate>> setReviewStatus(
    Iterable<String> fileIds,
    MetadataReviewStatus status,
  ) async {
    final selected = fileIds.toSet();
    final candidates = [
      for (final candidate in await store.load())
        selected.contains(candidate.fileId)
            ? candidate.copyWith(reviewStatus: status)
            : candidate,
    ];
    await store.save(candidates);
    return candidates;
  }

  Future<List<MetadataCandidate>> remove(String fileId) async {
    final candidates = [
      for (final candidate in await store.load())
        if (candidate.fileId != fileId) candidate,
    ];
    await store.save(candidates);
    return candidates;
  }

  Future<List<MetadataCandidate>> reconnectFile({
    required String retainedFileId,
    required String replacementFileId,
    required String path,
    required String fileName,
  }) async {
    final loaded = await store.load();
    final retained = loaded.cast<MetadataCandidate?>().firstWhere(
      (candidate) => candidate?.fileId == retainedFileId,
      orElse: () => null,
    );
    final replacement = loaded.cast<MetadataCandidate?>().firstWhere(
      (candidate) => candidate?.fileId == replacementFileId,
      orElse: () => null,
    );
    final updated = (retained ?? replacement)?.copyWith(
      filePath: path,
      fileName: fileName,
    );
    final candidates = [
      for (final candidate in loaded)
        if (candidate.fileId != retainedFileId &&
            candidate.fileId != replacementFileId)
          candidate,
      if (updated != null)
        MetadataCandidate(
          fileId: retainedFileId,
          filePath: updated.filePath,
          fileName: updated.fileName,
          composerText: updated.composerText,
          workTitleText: updated.workTitleText,
          movementText: updated.movementText,
          trackNumber: updated.trackNumber,
          trackTotal: updated.trackTotal,
          albumText: updated.albumText,
          artistText: updated.artistText,
          albumArtistText: updated.albumArtistText,
          genreText: updated.genreText,
          year: updated.year,
          discNumber: updated.discNumber,
          discTotal: updated.discTotal,
          confidence: updated.confidence,
          sourceLabel: updated.sourceLabel,
          rawPattern: updated.rawPattern,
          reviewStatus: updated.reviewStatus,
          hasTagConflict: updated.hasTagConflict,
        ),
    ]..sort((a, b) => a.filePath.compareTo(b.filePath));
    await store.save(candidates);
    return candidates;
  }
}
