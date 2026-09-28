import 'dart:convert';
import 'dart:typed_data';

import 'package:archive/archive.dart';

import 'sheet_metronome.dart';
import 'sheet_score.dart';
import 'sheet_setlist.dart';
import 'sheet_setlist_manifest.dart';

const String sheetSetlistPackageScope = 'clef.setlist.package';
const int sheetSetlistPackageVersion = 1;
const String sheetSetlistPackageManifestFileName = 'clef-setlist-package.txt';
const String sheetSetlistPackageScoreDirectory = 'scores/';

class SheetSetlistPackageArchive {
  const SheetSetlistPackageArchive({
    required this.manifest,
    required this.packageFiles,
  });

  final SheetSetlistShareManifest manifest;
  final List<SheetSetlistPackageFile> packageFiles;

  SheetSetlistPackageDryRun previewImport({
    required List<SheetScore> currentScores,
  }) {
    return SheetSetlistPackageDryRun.preview(
      manifest: manifest,
      currentScores: currentScores,
      packageFiles: packageFiles,
    );
  }

  static SheetSetlistPackageArchive decodeBytes(List<int> bytes) {
    late Archive archive;
    try {
      archive = ZipDecoder().decodeBytes(bytes);
    } on ArchiveException catch (error) {
      throw FormatException(
        'Setlist package ZIP cannot be read: ${error.message}',
      );
    }

    final fileEntries = archive.files
        .where((entry) => entry.isFile)
        .toList(growable: false);
    final manifestEntries = fileEntries
        .where((entry) => entry.name == sheetSetlistPackageManifestFileName)
        .toList(growable: false);
    if (manifestEntries.isEmpty) {
      throw const FormatException('Setlist package manifest is missing.');
    }
    if (manifestEntries.length > 1) {
      throw const FormatException(
        'Setlist package contains more than one manifest.',
      );
    }

    final manifestText = utf8.decode(manifestEntries.single.content);
    final manifest = SheetSetlistShareManifest.tryParse(manifestText);
    if (manifest == null) {
      throw const FormatException(
        'Setlist package manifest is not a Clef setlist manifest.',
      );
    }

    final paths = <String>{};
    final packageFiles = <SheetSetlistPackageFile>[];
    for (final entry in fileEntries) {
      final path = entry.name.trim();
      if (path == sheetSetlistPackageManifestFileName) {
        continue;
      }
      if (!_isSafePackageScoreZipEntryPath(path)) {
        throw FormatException('Unsafe setlist package entry: $path');
      }
      if (!paths.add(path)) {
        throw FormatException('Duplicate setlist package entry: $path');
      }
      packageFiles.add(
        SheetSetlistPackageFile(
          path: path,
          mediaType: _mediaTypeForScoreFile(path),
        ),
      );
    }

    return SheetSetlistPackageArchive(
      manifest: manifest,
      packageFiles: List<SheetSetlistPackageFile>.unmodifiable(packageFiles),
    );
  }

  static Uint8List encodeBytes({
    required String manifestText,
    required Map<String, List<int>> scoreFiles,
  }) {
    final manifest = SheetSetlistShareManifest.tryParse(manifestText);
    if (manifest == null) {
      throw const FormatException(
        'Setlist package manifest is not a Clef setlist manifest.',
      );
    }

    final archive = Archive();
    archive.addFile(
      ArchiveFile.string(sheetSetlistPackageManifestFileName, manifestText),
    );
    final paths = <String>{};
    for (final entry in scoreFiles.entries) {
      final path = entry.key.trim().replaceAll('\\', '/');
      if (!_isSafePackageScoreZipEntryPath(path)) {
        throw FormatException('Unsafe setlist package entry: $path');
      }
      if (!paths.add(path)) {
        throw FormatException('Duplicate setlist package entry: $path');
      }
      archive.addFile(ArchiveFile.bytes(path, entry.value));
    }
    return Uint8List.fromList(ZipEncoder().encode(archive));
  }

  static Future<SheetSetlistPackageExportResult> exportSetlistBytes({
    required SheetSetlist setlist,
    required List<SheetScore> scores,
    required Future<List<int>?> Function(SheetScore score) readScoreBytes,
  }) async {
    final orderedScores = _scoresInSetlistOrder(setlist, scores);
    final manifestText = _setlistPackageManifestText(setlist, orderedScores);
    if (orderedScores.isEmpty) {
      return SheetSetlistPackageExportResult(
        manifestText: manifestText,
        missingScores: const <SheetScore>[],
        unsupportedScores: const <SheetScore>[],
      );
    }

    final scoreFiles = <String, List<int>>{};
    final entryPathBySourcePath = <String, String>{};
    final usedEntryPaths = <String>{};
    final missingScores = <SheetScore>[];
    final unsupportedScores = <SheetScore>[];

    for (final score in orderedScores) {
      final sourcePath = score.filePath.trim();
      if (entryPathBySourcePath.containsKey(sourcePath)) {
        continue;
      }
      final extension = _fileExtension(score.filePath);
      final safeEntryPath = _scorePackageEntryPath(
        score,
        extension: extension,
        usedEntryPaths: usedEntryPaths,
      );
      if (!SheetSetlistPackageFile(path: safeEntryPath).isSupportedScoreFile) {
        unsupportedScores.add(score);
        continue;
      }

      final bytes = await readScoreBytes(score);
      if (bytes == null) {
        missingScores.add(score);
        continue;
      }
      entryPathBySourcePath[sourcePath] = safeEntryPath;
      scoreFiles[safeEntryPath] = bytes;
    }

    if (missingScores.isNotEmpty || unsupportedScores.isNotEmpty) {
      return SheetSetlistPackageExportResult(
        manifestText: manifestText,
        missingScores: List<SheetScore>.unmodifiable(missingScores),
        unsupportedScores: List<SheetScore>.unmodifiable(unsupportedScores),
      );
    }

    return SheetSetlistPackageExportResult(
      bytes: encodeBytes(manifestText: manifestText, scoreFiles: scoreFiles),
      manifestText: manifestText,
      includedFileCount: scoreFiles.length,
      missingScores: const <SheetScore>[],
      unsupportedScores: const <SheetScore>[],
    );
  }
}

class SheetSetlistPackageExportResult {
  const SheetSetlistPackageExportResult({
    required this.manifestText,
    required this.missingScores,
    required this.unsupportedScores,
    this.bytes,
    this.includedFileCount = 0,
  });

  final Uint8List? bytes;
  final String manifestText;
  final int includedFileCount;
  final List<SheetScore> missingScores;
  final List<SheetScore> unsupportedScores;

  bool get didExport =>
      bytes != null && missingScores.isEmpty && unsupportedScores.isEmpty;

  String get failureReason {
    if (didExport) {
      return '';
    }
    if (missingScores.isNotEmpty) {
      return '원본 파일을 찾을 수 없는 악보가 있습니다: ${missingScores.map((score) => score.displayTitle).join(', ')}';
    }
    if (unsupportedScores.isNotEmpty) {
      return '패키지로 묶을 수 없는 파일 형식이 있습니다: ${unsupportedScores.map((score) => score.displayTitle).join(', ')}';
    }
    return '세트리스트에 내보낼 악보가 없습니다.';
  }
}

class SheetSetlistPackageFile {
  const SheetSetlistPackageFile({
    required this.path,
    String? displayName,
    this.mediaType = '',
  }) : displayName = displayName ?? '';

  final String path;
  final String displayName;
  final String mediaType;

  String get fileName {
    final explicit = displayName.trim();
    if (explicit.isNotEmpty) {
      return explicit;
    }
    return _fileName(path);
  }

  bool get isSupportedScoreFile {
    return _supportedScoreExtensions.contains(_fileExtension(fileName));
  }
}

class SheetSetlistPackageDryRun {
  const SheetSetlistPackageDryRun({
    required this.manifest,
    required this.entries,
    this.packageFiles = const <SheetSetlistPackageFile>[],
  });

  final SheetSetlistShareManifest manifest;
  final List<SheetSetlistPackageEntry> entries;
  final List<SheetSetlistPackageFile> packageFiles;

  factory SheetSetlistPackageDryRun.preview({
    required SheetSetlistShareManifest manifest,
    required List<SheetScore> currentScores,
    required List<SheetSetlistPackageFile> packageFiles,
  }) {
    final existingPreview = manifest.matchScores(currentScores);
    final matches = existingPreview.matches;
    return SheetSetlistPackageDryRun(
      manifest: manifest,
      packageFiles: List<SheetSetlistPackageFile>.unmodifiable(packageFiles),
      entries: List<SheetSetlistPackageEntry>.unmodifiable([
        for (var index = 0; index < manifest.items.length; index++)
          SheetSetlistPackageEntry.resolve(
            item: manifest.items[index],
            existingMatch: index < matches.length ? matches[index] : null,
            packageFiles: packageFiles,
          ),
      ]),
    );
  }

  bool get canImport {
    return manifest.canPreviewImport &&
        entries.isNotEmpty &&
        entries.every((entry) => entry.isResolved);
  }

  int get existingScoreCount {
    return entries
        .where(
          (entry) =>
              entry.status == SheetSetlistPackageEntryStatus.existingScore,
        )
        .length;
  }

  int get importableFileCount {
    return entries
        .where(
          (entry) =>
              entry.status == SheetSetlistPackageEntryStatus.importableFile,
        )
        .length;
  }

  int get unresolvedCount {
    return entries.where((entry) => !entry.isResolved).length;
  }

  List<SheetSetlistPackageEntry> get unresolvedEntries {
    return entries.where((entry) => !entry.isResolved).toList(growable: false);
  }

  List<String> get warnings {
    return <String>[
      ...manifest.warnings,
      for (final entry in unresolvedEntries) entry.warning,
    ].where((warning) => warning.trim().isNotEmpty).toList(growable: false);
  }
}

class SheetSetlistPackageEntry {
  const SheetSetlistPackageEntry({
    required this.item,
    required this.status,
    this.existingScore,
    this.packageFile,
    this.candidates = const <SheetScore>[],
    this.packageFileCandidates = const <SheetSetlistPackageFile>[],
  });

  final SheetSetlistShareItem item;
  final SheetSetlistPackageEntryStatus status;
  final SheetScore? existingScore;
  final SheetSetlistPackageFile? packageFile;
  final List<SheetScore> candidates;
  final List<SheetSetlistPackageFile> packageFileCandidates;

  bool get isResolved {
    return status == SheetSetlistPackageEntryStatus.existingScore ||
        status == SheetSetlistPackageEntryStatus.importableFile;
  }

  String get warning {
    switch (status) {
      case SheetSetlistPackageEntryStatus.existingScore:
      case SheetSetlistPackageEntryStatus.importableFile:
        return '';
      case SheetSetlistPackageEntryStatus.ambiguousExistingScore:
        return '여러 기존 악보와 일치하는 곡: ${item.title}';
      case SheetSetlistPackageEntryStatus.missingFile:
        return '패키지에서 찾을 수 없는 파일: ${_displayFileReference(item)}';
      case SheetSetlistPackageEntryStatus.duplicatePackageFile:
        return '패키지에 같은 이름의 파일이 여러 개 있습니다: ${item.fileName}';
      case SheetSetlistPackageEntryStatus.unsupportedFile:
        return '지원하지 않는 패키지 파일 형식: ${_displayFileReference(item)}';
    }
  }

  static SheetSetlistPackageEntry resolve({
    required SheetSetlistShareItem item,
    required SheetSetlistManifestMatch? existingMatch,
    required List<SheetSetlistPackageFile> packageFiles,
  }) {
    if (existingMatch != null && existingMatch.isResolved) {
      return SheetSetlistPackageEntry(
        item: item,
        status: SheetSetlistPackageEntryStatus.existingScore,
        existingScore: existingMatch.score,
        candidates: existingMatch.candidates,
      );
    }

    if (existingMatch?.kind == SheetSetlistManifestMatchKind.ambiguous) {
      return SheetSetlistPackageEntry(
        item: item,
        status: SheetSetlistPackageEntryStatus.ambiguousExistingScore,
        candidates: existingMatch?.candidates ?? const <SheetScore>[],
      );
    }

    final fileName = item.fileName.trim();
    if (fileName.isEmpty) {
      return SheetSetlistPackageEntry(
        item: item,
        status: SheetSetlistPackageEntryStatus.missingFile,
      );
    }

    final matches = _matchingPackageFiles(fileName, packageFiles);
    if (matches.isEmpty) {
      return SheetSetlistPackageEntry(
        item: item,
        status: SheetSetlistPackageEntryStatus.missingFile,
      );
    }
    if (matches.length > 1) {
      return SheetSetlistPackageEntry(
        item: item,
        status: SheetSetlistPackageEntryStatus.duplicatePackageFile,
        packageFileCandidates: matches,
      );
    }

    final file = matches.single;
    if (!file.isSupportedScoreFile) {
      return SheetSetlistPackageEntry(
        item: item,
        status: SheetSetlistPackageEntryStatus.unsupportedFile,
        packageFile: file,
        packageFileCandidates: matches,
      );
    }
    return SheetSetlistPackageEntry(
      item: item,
      status: SheetSetlistPackageEntryStatus.importableFile,
      packageFile: file,
      packageFileCandidates: matches,
    );
  }
}

enum SheetSetlistPackageEntryStatus {
  existingScore,
  importableFile,
  ambiguousExistingScore,
  missingFile,
  duplicatePackageFile,
  unsupportedFile,
}

const _supportedScoreExtensions = <String>{'.pdf', '.jpg', '.jpeg', '.png'};

List<SheetSetlistPackageFile> _matchingPackageFiles(
  String fileName,
  List<SheetSetlistPackageFile> packageFiles,
) {
  final wanted = _normalizeLookup(fileName);
  final wantedStem = _normalizeLookup(_fileStem(fileName));
  return packageFiles
      .where((file) {
        final keys = <String>{
          _normalizeLookup(file.fileName),
          _normalizeLookup(_fileStem(file.fileName)),
          _normalizeLookup(_fileName(file.path)),
          _normalizeLookup(_fileStem(file.path)),
        }..remove('');
        return keys.contains(wanted) ||
            (wantedStem.isNotEmpty && keys.contains(wantedStem));
      })
      .toList(growable: false);
}

String _displayFileReference(SheetSetlistShareItem item) {
  final fileName = item.fileName.trim();
  if (fileName.isNotEmpty) {
    return fileName;
  }
  return item.title.trim().isEmpty ? '이름 없는 곡' : item.title.trim();
}

String _normalizeLookup(String value) {
  return value.trim().replaceAll(RegExp(r'\s+'), ' ').toLowerCase();
}

String _fileName(String path) {
  return path.trim().replaceAll('\\', '/').split('/').last.trim();
}

String _fileStem(String path) {
  return _fileName(path).replaceFirst(RegExp(r'\.[^.]+$'), '').trim();
}

String _fileExtension(String path) {
  final name = _fileName(path).toLowerCase();
  final dot = name.lastIndexOf('.');
  if (dot < 0) {
    return '';
  }
  return name.substring(dot);
}

List<SheetScore> _scoresInSetlistOrder(
  SheetSetlist setlist,
  List<SheetScore> scores,
) {
  final scoresById = <String, SheetScore>{
    for (final score in scores) score.id: score,
  };
  return [
    for (final scoreId in setlist.scoreIds)
      if (scoresById[scoreId] != null) scoresById[scoreId]!,
  ];
}

String _setlistPackageManifestText(
  SheetSetlist setlist,
  List<SheetScore> scores,
) {
  final buffer = StringBuffer()
    ..writeln('Clef & Staff 세트리스트')
    ..writeln('제목: ${setlist.title}')
    ..writeln(
      setlist.totalEstimatedSeconds > 0
          ? '곡 수: ${scores.length}곡 · 총 ${_formatDuration(setlist.totalEstimatedSeconds)}'
          : '곡 수: ${scores.length}곡',
    );
  if (setlist.transitionSeconds > 0 && scores.length > 1) {
    buffer.writeln('전환 ${_formatDuration(setlist.transitionSeconds)}');
  }
  buffer.writeln();

  for (var index = 0; index < scores.length; index += 1) {
    final score = scores[index];
    buffer.writeln('${index + 1}. ${score.displayTitle}');
    for (final detail in _setlistPackageManifestDetails(setlist, score)) {
      buffer.writeln('   $detail');
    }
  }
  return buffer.toString().trimRight();
}

List<String> _setlistPackageManifestDetails(
  SheetSetlist setlist,
  SheetScore score,
) {
  final composer = score.composer.trim();
  final note = setlist.scoreNotes[score.id]?.trim();
  final duration = setlist.scoreDurations[score.id] ?? 0;
  final collection = score.collection.trim();
  final group = score.group.trim();
  final scoreNote = score.note.trim();
  final metadata = <String>[
    if (composer.isNotEmpty) '작곡가: $composer',
    '파일: ${score.sourceFileDisplayName}',
    '시작: ${setlist.scoreStartPages[score.id] ?? score.lastPage}쪽',
    if (duration > 0) '예상 시간: ${_formatDuration(duration)}',
    if (note?.isNotEmpty == true) '세트 메모: $note',
    if (scoreNote.isNotEmpty) '악보 메모: $scoreNote',
    if (score.tags.isNotEmpty) '태그: ${score.tags.join(', ')}',
    if (collection.isNotEmpty) '컬렉션: $collection',
    if (group.isNotEmpty) '그룹: $group',
    if (score.rating > 0) '별점: ${score.rating}/5',
  ];
  for (final field in score.customFields) {
    metadata.add('${field.key}: ${field.value}');
  }
  final metronome =
      setlist.scoreMetronomeSettings[score.id] ?? score.metronomeSettings;
  if (metronome != null) {
    metadata.add('메트로놈: ${_formatMetronomeSettings(metronome)}');
  }
  return metadata;
}

String _scorePackageEntryPath(
  SheetScore score, {
  required String extension,
  required Set<String> usedEntryPaths,
}) {
  final fallbackStem = score.id.trim().isEmpty ? 'score' : score.id.trim();
  final stem = _safePackageFileStem(score.sourceFileDisplayName, fallbackStem);
  final safeExtension = extension.isEmpty ? '.pdf' : extension;
  var path = '$sheetSetlistPackageScoreDirectory$stem$safeExtension';
  var suffix = 2;
  while (usedEntryPaths.contains(path)) {
    path = '$sheetSetlistPackageScoreDirectory$stem-$suffix$safeExtension';
    suffix += 1;
  }
  usedEntryPaths.add(path);
  return path;
}

String _safePackageFileStem(String value, String fallback) {
  final sanitized = value
      .trim()
      .replaceAll(RegExp(r'[\\/:*?"<>|]+'), '-')
      .replaceAll(RegExp(r'\s+'), ' ')
      .replaceAll(RegExp(r'^-+|-+$'), '')
      .trim();
  if (sanitized.isEmpty || sanitized == '.' || sanitized == '..') {
    return fallback;
  }
  return sanitized;
}

String _formatMetronomeSettings(SheetMetronomeSettings settings) {
  final parts = <String>[
    '${settings.bpm} BPM',
    settings.meter.label,
    if (settings.subdivision != SheetMetronomeSubdivision.none)
      settings.subdivision.label,
    settings.soundEnabled ? '소리 ${settings.volumePercent}%' : '시각만',
    if (settings.countInBars > 0) '카운트인 ${settings.countInBars}마디',
  ];
  return parts.join(' · ');
}

String _formatDuration(int seconds) {
  if (seconds <= 0) {
    return '시간 없음';
  }
  final minutes = seconds ~/ 60;
  final remainingSeconds = seconds % 60;
  if (minutes == 0) {
    return '$remainingSeconds초';
  }
  if (remainingSeconds == 0) {
    return '$minutes분';
  }
  return '$minutes분 $remainingSeconds초';
}

bool _isSafePackageScoreZipEntryPath(String path) {
  return path.startsWith(sheetSetlistPackageScoreDirectory) &&
      !path.contains('..') &&
      !path.startsWith('/') &&
      !path.contains('\\') &&
      _fileName(path).isNotEmpty;
}

String _mediaTypeForScoreFile(String path) {
  switch (_fileExtension(path)) {
    case '.pdf':
      return 'application/pdf';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
  }
  return '';
}
