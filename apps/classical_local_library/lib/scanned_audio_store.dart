import 'dart:convert';
import 'dart:io';

import 'classical_library_models.dart';

class ScanReconciliationResult {
  const ScanReconciliationResult({
    required this.files,
    required this.newCount,
    required this.movedCount,
    required this.missingCount,
    required this.ambiguousCount,
  });

  final List<LocalAudioFile> files;
  final int newCount;
  final int movedCount;
  final int missingCount;
  final int ambiguousCount;
}

abstract class ScannedAudioStore {
  Future<List<LocalAudioFile>> load();

  Future<void> save(List<LocalAudioFile> files);
}

class MemoryScannedAudioStore implements ScannedAudioStore {
  MemoryScannedAudioStore([List<LocalAudioFile> seed = const []])
    : _files = [...seed];

  List<LocalAudioFile> _files;

  @override
  Future<List<LocalAudioFile>> load() async {
    return [..._files];
  }

  @override
  Future<void> save(List<LocalAudioFile> files) async {
    _files = [...files];
  }
}

class JsonScannedAudioStore implements ScannedAudioStore {
  const JsonScannedAudioStore(this.file);

  final File file;

  @override
  Future<List<LocalAudioFile>> load() async {
    if (!await file.exists()) {
      return [];
    }

    final decoded =
        jsonDecode(await file.readAsString()) as Map<String, Object?>;
    return [
      for (final item in decoded['files'] as List<Object?>? ?? const [])
        LocalAudioFile.fromJson(item! as Map<String, Object?>),
    ];
  }

  @override
  Future<void> save(List<LocalAudioFile> files) async {
    await file.parent.create(recursive: true);
    final payload = {
      'schemaVersion': 1,
      'files': [for (final file in files) file.toJson()],
    };
    const encoder = JsonEncoder.withIndent('  ');
    await file.writeAsString(encoder.convert(payload));
  }
}

class ScannedAudioRepository {
  const ScannedAudioRepository(this.store);

  final ScannedAudioStore store;

  Future<List<LocalAudioFile>> load() => store.load();

  Future<List<LocalAudioFile>> replaceAll(List<LocalAudioFile> files) async {
    final sorted = [...files]..sort((a, b) => a.path.compareTo(b.path));
    await store.save(sorted);
    return sorted;
  }

  Future<List<LocalAudioFile>> mergeScanned(
    List<LocalAudioFile> scanned,
  ) async {
    return (await reconcileScan(scanned)).files;
  }

  Future<ScanReconciliationResult> reconcileScan(
    List<LocalAudioFile> scanned, {
    String? rootPath,
    DateTime? scannedAt,
  }) async {
    final timestamp = (scannedAt ?? DateTime.now()).millisecondsSinceEpoch;
    final existingFiles = await store.load();
    final byId = {for (final file in existingFiles) file.id: file};
    final existingByPath = {
      for (final file in existingFiles) _normalizePath(file.path): file,
    };
    final matchedIds = <String>{};
    var newCount = 0;
    var movedCount = 0;
    var ambiguousCount = 0;

    for (final scannedFile in scanned) {
      final exact = existingByPath[_normalizePath(scannedFile.path)];
      if (exact != null) {
        matchedIds.add(exact.id);
        byId[exact.id] = _mergeObserved(exact, scannedFile, timestamp);
        continue;
      }

      final moveCandidates = existingFiles
          .where(
            (file) =>
                !matchedIds.contains(file.id) &&
                _sameIdentity(file, scannedFile),
          )
          .toList();
      if (moveCandidates.length == 1) {
        final moved = moveCandidates.single;
        matchedIds.add(moved.id);
        byId[moved.id] = _mergeObserved(moved, scannedFile, timestamp);
        movedCount += 1;
        continue;
      }
      if (moveCandidates.length > 1) {
        ambiguousCount += 1;
      }
      byId[scannedFile.id] = scannedFile.copyWith(
        lastSeenAtMillis: timestamp,
        consecutiveMissCount: 0,
        availability: AudioFileAvailability.present,
        importStatus: AudioImportStatus.needsReview,
      );
      matchedIds.add(scannedFile.id);
      newCount += 1;
    }

    var missingCount = 0;
    if (rootPath != null) {
      for (final existing in existingFiles) {
        if (matchedIds.contains(existing.id) ||
            !_isWithinRoot(existing.path, rootPath)) {
          continue;
        }
        final misses = existing.consecutiveMissCount + 1;
        final isMissing = misses >= 2;
        if (isMissing) {
          missingCount += 1;
        }
        byId[existing.id] = existing.copyWith(
          consecutiveMissCount: misses,
          availability: isMissing
              ? AudioFileAvailability.missing
              : existing.availability,
        );
      }
    }

    final files = await replaceAll(byId.values.toList());
    return ScanReconciliationResult(
      files: files,
      newCount: newCount,
      movedCount: movedCount,
      missingCount: missingCount,
      ambiguousCount: ambiguousCount,
    );
  }

  Future<List<LocalAudioFile>> reconnectMissingFile({
    required String missingFileId,
    required String replacementFileId,
  }) async {
    final files = await store.load();
    final missing = files.singleWhere((file) => file.id == missingFileId);
    final replacement = files.singleWhere(
      (file) => file.id == replacementFileId,
    );
    final reconnected = replacement.copyWith(
      id: missing.id,
      importStatus: missing.importStatus,
      availability: AudioFileAvailability.present,
      consecutiveMissCount: 0,
      sourceReferences: [
        ...missing.sourceReferences,
        ...replacement.sourceReferences.where(
          (reference) => !missing.sourceReferences.any(
            (existing) =>
                existing.kind == reference.kind &&
                existing.externalId == reference.externalId,
          ),
        ),
      ],
    );
    return replaceAll([
      for (final file in files)
        if (file.id == missingFileId)
          reconnected
        else if (file.id != replacementFileId)
          file,
    ]);
  }

  Future<List<LocalAudioFile>> markLinked(String fileId) async {
    return setImportStatus(fileId, AudioImportStatus.linked);
  }

  Future<List<LocalAudioFile>> addSourceReference(
    String fileId,
    SourceReference reference,
  ) async {
    final files = [
      for (final file in await store.load())
        if (file.id == fileId)
          file.copyWith(
            sourceReferences: [
              ...file.sourceReferences.where(
                (item) =>
                    item.kind != reference.kind ||
                    item.externalId != reference.externalId,
              ),
              reference,
            ],
          )
        else
          file,
    ];
    return replaceAll(files);
  }

  Future<List<LocalAudioFile>> setImportStatus(
    String fileId,
    AudioImportStatus status,
  ) async {
    final files = [
      for (final file in await store.load())
        file.id == fileId ? file.copyWith(importStatus: status) : file,
    ];
    return replaceAll(files);
  }

  Future<List<LocalAudioFile>> remove(String fileId) async {
    return replaceAll([
      for (final file in await store.load())
        if (file.id != fileId) file,
    ]);
  }

  LocalAudioFile _mergeObserved(
    LocalAudioFile existing,
    LocalAudioFile observed,
    int timestamp,
  ) {
    return observed.copyWith(
      id: existing.id,
      importStatus: existing.importStatus == AudioImportStatus.linked
          ? AudioImportStatus.linked
          : AudioImportStatus.needsReview,
      lastSeenAtMillis: timestamp,
      consecutiveMissCount: 0,
      availability: AudioFileAvailability.present,
      sourceReferences: existing.sourceReferences,
    );
  }

  bool _sameIdentity(LocalAudioFile first, LocalAudioFile second) {
    final firstFingerprint = first.lightweightFingerprint;
    final secondFingerprint = second.lightweightFingerprint;
    if (firstFingerprint != null && secondFingerprint != null) {
      return firstFingerprint == secondFingerprint;
    }
    return first.sizeBytes != null &&
        first.sizeBytes == second.sizeBytes &&
        first.modifiedAtMillis != null &&
        first.modifiedAtMillis == second.modifiedAtMillis;
  }

  bool _isWithinRoot(String path, String rootPath) {
    final normalizedPath = _normalizePath(path);
    final normalizedRoot = _normalizePath(rootPath)
        .replaceFirst(RegExp(r'/+$'), '');
    return normalizedPath == normalizedRoot ||
        normalizedPath.startsWith('$normalizedRoot/');
  }

  String _normalizePath(String path) => path.replaceAll('\\', '/');
}
