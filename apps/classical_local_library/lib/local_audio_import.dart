import 'dart:async';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:path/path.dart' as path;

import 'backup_policy.dart';
import 'classical_library_models.dart';
import 'file_links.dart';
import 'local_audio_scanner.dart';
import 'metadata_candidates.dart';
import 'scanned_audio_store.dart';

enum LocalAudioImportStatus {
  copying,
  copied,
  analysisPending,
  completed,
  deleting,
  missing,
  failed,
}

enum LocalAudioImportOutcome { imported, duplicate, pending, failed, cancelled }

enum LocalAudioImportStage { copying, analyzing }

class LocalAudioImportProgress {
  const LocalAudioImportProgress({
    required this.stage,
    required this.fileIndex,
    required this.fileCount,
    required this.bytesCopied,
    required this.totalBytes,
  });

  final LocalAudioImportStage stage;
  final int fileIndex;
  final int fileCount;
  final int bytesCopied;
  final int totalBytes;

  double? get fraction => totalBytes <= 0 ? null : bytesCopied / totalBytes;
}

class LocalAudioImportRecord {
  const LocalAudioImportRecord({
    required this.id,
    required this.sourceKind,
    required this.originalFileName,
    required this.localPath,
    required this.sha256,
    required this.sizeBytes,
    required this.importedAtMillis,
    required this.status,
    this.fileId,
    this.failureKind,
  });

  final String id;
  final String sourceKind;
  final String originalFileName;
  final String localPath;
  final String sha256;
  final int sizeBytes;
  final int importedAtMillis;
  final LocalAudioImportStatus status;
  final String? fileId;
  final String? failureKind;

  LocalAudioImportRecord copyWith({
    String? localPath,
    int? importedAtMillis,
    LocalAudioImportStatus? status,
    String? fileId,
    Object? failureKind = _unsetImportValue,
  }) {
    return LocalAudioImportRecord(
      id: id,
      sourceKind: sourceKind,
      originalFileName: originalFileName,
      localPath: localPath ?? this.localPath,
      sha256: sha256,
      sizeBytes: sizeBytes,
      importedAtMillis: importedAtMillis ?? this.importedAtMillis,
      status: status ?? this.status,
      fileId: fileId ?? this.fileId,
      failureKind: identical(failureKind, _unsetImportValue)
          ? this.failureKind
          : failureKind as String?,
    );
  }
}

const _unsetImportValue = Object();

abstract interface class LocalAudioImportStore {
  Future<List<LocalAudioImportRecord>> load();

  Future<LocalAudioImportRecord?> findByChecksum(String sha256);

  Future<void> upsert(LocalAudioImportRecord record);

  Future<void> delete(String id);
}

class MemoryLocalAudioImportStore implements LocalAudioImportStore {
  MemoryLocalAudioImportStore([List<LocalAudioImportRecord> seed = const []])
    : _records = {for (final record in seed) record.id: record};

  final Map<String, LocalAudioImportRecord> _records;

  @override
  Future<List<LocalAudioImportRecord>> load() async {
    final records = _records.values.toList()
      ..sort((a, b) => a.importedAtMillis.compareTo(b.importedAtMillis));
    return records;
  }

  @override
  Future<LocalAudioImportRecord?> findByChecksum(String sha256) async {
    for (final record in _records.values) {
      if (record.sha256 == sha256) return record;
    }
    return null;
  }

  @override
  Future<void> upsert(LocalAudioImportRecord record) async {
    _records[record.id] = record;
  }

  @override
  Future<void> delete(String id) async {
    _records.remove(id);
  }
}

class ManagedAudioStorageSummary {
  const ManagedAudioStorageSummary({
    required this.fileCount,
    required this.totalBytes,
  });

  final int fileCount;
  final int totalBytes;
}

class ManagedAudioExportFile {
  const ManagedAudioExportFile({required this.path, required this.fileName});

  final String path;
  final String fileName;
}

abstract interface class ManagedAudioLibrary {
  Future<ManagedAudioStorageSummary> storageSummary();

  Future<ManagedAudioExportFile> exportFileFor(String fileId);

  Future<void> deleteByFileId(String fileId);
}

abstract interface class SelectedAudioFile {
  String get name;

  String? get mimeType;

  Future<int> length();

  Stream<List<int>> openRead();
}

class FileSelectedAudioFile implements SelectedAudioFile {
  const FileSelectedAudioFile(this.file, {this.nameOverride, this.mimeType});

  final File file;
  final String? nameOverride;

  @override
  final String? mimeType;

  @override
  String get name => nameOverride ?? path.basename(file.path);

  @override
  Future<int> length() => file.length();

  @override
  Stream<List<int>> openRead() => file.openRead();
}

abstract interface class AudioFilePicker {
  Future<List<SelectedAudioFile>> pickAudioFiles();
}

class LocalAudioImportCancellation {
  bool _isCancelled = false;

  bool get isCancelled => _isCancelled;

  void cancel() => _isCancelled = true;
}

class LocalAudioImportException implements Exception {
  const LocalAudioImportException(this.kind, this.userMessage);

  final String kind;
  final String userMessage;
}

class LocalAudioImportPolicy {
  const LocalAudioImportPolicy({this.maximumBytes = 2 * 1024 * 1024 * 1024});

  final int maximumBytes;

  String sanitizeFileName(String source) {
    return path
        .basename(source.replaceAll('\\', '/'))
        .replaceAll(RegExp(r'[\\/:*?"<>|\x00-\x1f]'), '_')
        .replaceAll(RegExp(r'^\.+'), '')
        .trim();
  }

  bool supportsFileName(String name) {
    return audioExtensionForPath(name) != null;
  }

  bool mimeMatches(String name, String? mimeType) {
    if (mimeType == null || mimeType == 'application/octet-stream') return true;
    final extension = path.extension(name).toLowerCase();
    const allowed = <String, Set<String>>{
      '.mp3': {'audio/mpeg'},
      '.m4a': {'audio/mp4', 'video/mp4', 'audio/x-m4a'},
      '.alac': {'audio/mp4', 'audio/x-m4a', 'audio/alac'},
      '.flac': {'audio/flac', 'audio/x-flac'},
      '.wav': {'audio/wav', 'audio/x-wav', 'audio/wave'},
      '.ogg': {'audio/ogg'},
      '.opus': {'audio/ogg', 'audio/opus'},
    };
    return allowed[extension]?.contains(mimeType.toLowerCase()) ?? false;
  }
}

class LocalAudioImportItemResult {
  const LocalAudioImportItemResult({
    required this.outcome,
    this.record,
    this.failureKind,
  });

  final LocalAudioImportOutcome outcome;
  final LocalAudioImportRecord? record;
  final String? failureKind;
}

class LocalAudioImportBatchResult {
  const LocalAudioImportBatchResult({
    required this.items,
    required this.files,
    required this.candidates,
  });

  final List<LocalAudioImportItemResult> items;
  final List<LocalAudioFile> files;
  final List<MetadataCandidate> candidates;

  int count(LocalAudioImportOutcome outcome) =>
      items.where((item) => item.outcome == outcome).length;
}

abstract interface class LocalAudioImportController {
  Future<LocalAudioImportBatchResult> importFiles(
    List<SelectedAudioFile> selections, {
    LocalAudioImportCancellation? cancellation,
    void Function(LocalAudioImportStage stage)? onStage,
    void Function(LocalAudioImportProgress progress)? onProgress,
  });

  Future<LocalAudioImportBatchResult> recoverManagedImports();
}

class LocalAudioImportCoordinator
    implements LocalAudioImportController, ManagedAudioLibrary {
  LocalAudioImportCoordinator({
    required this.store,
    required this.destination,
    required this.scanner,
    required this.scannedAudioRepository,
    required this.metadataCandidateRepository,
    this.fileTrackLinkRepository,
    this.policy = const LocalAudioImportPolicy(),
    this.clock = DateTime.now,
    this.backupPolicy = const PlatformBackupExclusionPolicy(),
  });

  final LocalAudioImportStore store;
  final Directory destination;
  final AudioFileScanner scanner;
  final ScannedAudioRepository scannedAudioRepository;
  final MetadataCandidateRepository metadataCandidateRepository;
  final AudioFileTrackLinkRepository? fileTrackLinkRepository;
  final LocalAudioImportPolicy policy;
  final DateTime Function() clock;
  final BackupExclusionPolicy backupPolicy;
  Future<void> _operationTail = Future<void>.value();

  @override
  Future<LocalAudioImportBatchResult> importFiles(
    List<SelectedAudioFile> selections, {
    LocalAudioImportCancellation? cancellation,
    void Function(LocalAudioImportStage stage)? onStage,
    void Function(LocalAudioImportProgress progress)? onProgress,
  }) {
    return _serialized(
      () => _importFiles(
        selections,
        cancellation: cancellation,
        onStage: onStage,
        onProgress: onProgress,
      ),
    );
  }

  Future<LocalAudioImportBatchResult> _importFiles(
    List<SelectedAudioFile> selections, {
    LocalAudioImportCancellation? cancellation,
    void Function(LocalAudioImportStage stage)? onStage,
    void Function(LocalAudioImportProgress progress)? onProgress,
  }) async {
    await cleanupTemporaryFiles();
    final results = <LocalAudioImportItemResult>[];
    final copied = <LocalAudioImportRecord>[];

    for (
      var selectionIndex = 0;
      selectionIndex < selections.length;
      selectionIndex += 1
    ) {
      final selection = selections[selectionIndex];
      if (cancellation?.isCancelled ?? false) {
        results.add(
          const LocalAudioImportItemResult(
            outcome: LocalAudioImportOutcome.cancelled,
            failureKind: 'cancelled',
          ),
        );
        continue;
      }
      onStage?.call(LocalAudioImportStage.copying);
      try {
        final copiedResult = await _copySelection(
          selection,
          cancellation: cancellation,
          fileIndex: selectionIndex + 1,
          fileCount: selections.length,
          onProgress: onProgress,
        );
        results.add(copiedResult);
        if (copiedResult.outcome == LocalAudioImportOutcome.imported) {
          copied.add(copiedResult.record!);
        }
      } on LocalAudioImportException catch (error) {
        results.add(
          LocalAudioImportItemResult(
            outcome: error.kind == 'cancelled'
                ? LocalAudioImportOutcome.cancelled
                : LocalAudioImportOutcome.failed,
            failureKind: error.kind,
          ),
        );
      } catch (_) {
        results.add(
          const LocalAudioImportItemResult(
            outcome: LocalAudioImportOutcome.failed,
            failureKind: 'copyFailed',
          ),
        );
      }
    }

    if (copied.isNotEmpty) {
      onStage?.call(LocalAudioImportStage.analyzing);
      onProgress?.call(
        LocalAudioImportProgress(
          stage: LocalAudioImportStage.analyzing,
          fileIndex: copied.length,
          fileCount: selections.length,
          bytesCopied: copied.fold(0, (sum, record) => sum + record.sizeBytes),
          totalBytes: copied.fold(0, (sum, record) => sum + record.sizeBytes),
        ),
      );
      try {
        await _reconcileAndFinalize(copied);
      } catch (_) {
        final currentById = {
          for (final record in await store.load()) record.id: record,
        };
        for (final record in copied) {
          final current = currentById[record.id] ?? record;
          await store.upsert(
            current.copyWith(
              status: LocalAudioImportStatus.analysisPending,
              failureKind: 'analysisPending',
            ),
          );
        }
        for (var index = 0; index < results.length; index += 1) {
          final item = results[index];
          if (item.outcome == LocalAudioImportOutcome.imported &&
              copied.any((record) => record.id == item.record?.id)) {
            results[index] = LocalAudioImportItemResult(
              outcome: LocalAudioImportOutcome.pending,
              record: item.record,
              failureKind: 'analysisPending',
            );
          }
        }
      }
    }

    return LocalAudioImportBatchResult(
      items: results,
      files: await scannedAudioRepository.load(),
      candidates: await metadataCandidateRepository.load(),
    );
  }

  @override
  Future<LocalAudioImportBatchResult> recoverManagedImports() {
    return _serialized(_recoverManagedImports);
  }

  Future<LocalAudioImportBatchResult> _recoverManagedImports() async {
    await cleanupTemporaryFiles();
    await _recoverOrphanManagedFiles();
    var records = await store.load();
    for (final record in records.where(
      (record) => record.status == LocalAudioImportStatus.deleting,
    )) {
      await _finishDeletion(record);
    }
    records = await store.load();
    final recoverable = records
        .where((record) => record.status != LocalAudioImportStatus.failed)
        .toList();
    if (recoverable.isNotEmpty) await _reconcileAndFinalize(recoverable);
    return LocalAudioImportBatchResult(
      items: const [],
      files: await scannedAudioRepository.load(),
      candidates: await metadataCandidateRepository.load(),
    );
  }

  @override
  Future<ManagedAudioStorageSummary> storageSummary() async {
    var fileCount = 0;
    var totalBytes = 0;
    for (final record in await store.load()) {
      if (!_isManagedPath(record.localPath)) continue;
      final file = File(record.localPath);
      if (!await file.exists()) continue;
      fileCount += 1;
      totalBytes += await file.length();
    }
    return ManagedAudioStorageSummary(
      fileCount: fileCount,
      totalBytes: totalBytes,
    );
  }

  @override
  Future<void> deleteByFileId(String fileId) {
    return _serialized(() => _deleteByFileId(fileId));
  }

  Future<void> _deleteByFileId(String fileId) async {
    final record = (await store.load())
        .cast<LocalAudioImportRecord?>()
        .firstWhere(
          (candidate) => candidate?.fileId == fileId,
          orElse: () => null,
        );
    if (record == null) {
      throw const LocalAudioImportException(
        'notManaged',
        '앱이 관리하는 음원 파일이 아닙니다.',
      );
    }
    if (!_isManagedPath(record.localPath)) {
      await store.upsert(
        record.copyWith(
          status: LocalAudioImportStatus.failed,
          failureKind: 'unsafeManagedPath',
        ),
      );
      throw const LocalAudioImportException(
        'unsafeManagedPath',
        '관리 영역 밖의 파일은 삭제할 수 없습니다.',
      );
    }
    final deleting = record.copyWith(
      status: LocalAudioImportStatus.deleting,
      failureKind: null,
    );
    await store.upsert(deleting);
    await _finishDeletion(deleting);
  }

  @override
  Future<ManagedAudioExportFile> exportFileFor(String fileId) async {
    final record = (await store.load())
        .cast<LocalAudioImportRecord?>()
        .firstWhere(
          (candidate) => candidate?.fileId == fileId,
          orElse: () => null,
        );
    if (record == null || record.status != LocalAudioImportStatus.completed) {
      throw const LocalAudioImportException(
        'notManaged',
        '내보낼 수 있는 앱 관리 음원이 아닙니다.',
      );
    }
    if (!_isManagedPath(record.localPath)) {
      throw const LocalAudioImportException(
        'unsafeManagedPath',
        '관리 영역 밖의 파일은 내보낼 수 없습니다.',
      );
    }
    if (!await File(record.localPath).exists()) {
      throw const LocalAudioImportException(
        'fileMissing',
        '내보낼 음원 파일을 찾을 수 없습니다.',
      );
    }
    return ManagedAudioExportFile(
      path: record.localPath,
      fileName: record.originalFileName,
    );
  }

  Future<void> cleanupTemporaryFiles() async {
    if (!await destination.exists()) return;
    await for (final entity in destination.list(followLinks: false)) {
      if (entity is File && path.basename(entity.path).endsWith('.part')) {
        try {
          await entity.delete();
        } on FileSystemException {
          // A later startup can retry cleanup if another operation owns it.
        }
      }
    }
  }

  Future<LocalAudioImportItemResult> _copySelection(
    SelectedAudioFile selection, {
    LocalAudioImportCancellation? cancellation,
    required int fileIndex,
    required int fileCount,
    void Function(LocalAudioImportProgress progress)? onProgress,
  }) async {
    final safeName = policy.sanitizeFileName(selection.name);
    if (safeName.isEmpty || !policy.supportsFileName(safeName)) {
      throw const LocalAudioImportException(
        'unsupportedType',
        '지원하지 않는 오디오 형식입니다.',
      );
    }
    if (!policy.mimeMatches(safeName, selection.mimeType)) {
      throw const LocalAudioImportException(
        'mimeMismatch',
        '파일 형식과 종류가 일치하지 않습니다.',
      );
    }
    final declaredLength = await selection.length();
    if (declaredLength < 0 || declaredLength > policy.maximumBytes) {
      throw const LocalAudioImportException(
        'tooLarge',
        '파일이 허용된 최대 크기를 초과합니다.',
      );
    }

    await destination.create(recursive: true);
    final temporary = File(
      path.join(
        destination.path,
        '.$safeName.${clock().microsecondsSinceEpoch}.part',
      ),
    );
    File? completed;
    try {
      final output = await temporary.open(mode: FileMode.write);
      var received = 0;
      var lastReported = 0;
      onProgress?.call(
        LocalAudioImportProgress(
          stage: LocalAudioImportStage.copying,
          fileIndex: fileIndex,
          fileCount: fileCount,
          bytesCopied: 0,
          totalBytes: declaredLength,
        ),
      );
      try {
        try {
          await for (final chunk in selection.openRead()) {
            if (cancellation?.isCancelled ?? false) {
              throw const LocalAudioImportException(
                'cancelled',
                '파일 가져오기를 취소했습니다.',
              );
            }
            received += chunk.length;
            if (received > policy.maximumBytes) {
              throw const LocalAudioImportException(
                'tooLarge',
                '파일이 허용된 최대 크기를 초과합니다.',
              );
            }
            try {
              await output.writeFrom(chunk);
            } on FileSystemException catch (error) {
              throw _writeException(error);
            }
            if (received == declaredLength ||
                received - lastReported >= 256 * 1024) {
              lastReported = received;
              onProgress?.call(
                LocalAudioImportProgress(
                  stage: LocalAudioImportStage.copying,
                  fileIndex: fileIndex,
                  fileCount: fileCount,
                  bytesCopied: received,
                  totalBytes: declaredLength,
                ),
              );
            }
          }
        } on LocalAudioImportException {
          rethrow;
        } on FileSystemException catch (error) {
          throw LocalAudioImportException(
            'readFailed',
            error.osError?.message ?? '파일을 읽지 못했습니다.',
          );
        } catch (_) {
          throw const LocalAudioImportException(
            'readFailed',
            '선택한 파일을 읽지 못했습니다.',
          );
        }
      } finally {
        try {
          await output.close();
        } on FileSystemException catch (error) {
          throw _writeException(error);
        }
      }
      if (received != declaredLength) {
        throw const LocalAudioImportException('truncated', '파일을 끝까지 읽지 못했습니다.');
      }

      final digest = (await sha256.bind(temporary.openRead()).first).toString();
      final existing = await store.findByChecksum(digest);
      if (existing != null && await File(existing.localPath).exists()) {
        await temporary.delete();
        return LocalAudioImportItemResult(
          outcome: LocalAudioImportOutcome.duplicate,
          record: existing,
        );
      }

      final target = await _availableTarget(safeName);
      completed = await temporary.rename(target.path);
      await backupPolicy.exclude(completed.path);
      final now = clock().millisecondsSinceEpoch;
      final record = LocalAudioImportRecord(
        id: existing?.id ?? 'local-import-$now-${digest.substring(0, 12)}',
        sourceKind: 'documentPicker',
        originalFileName: safeName,
        localPath: completed.path,
        sha256: digest,
        sizeBytes: received,
        importedAtMillis: now,
        status: LocalAudioImportStatus.analysisPending,
      );
      try {
        await store.upsert(record);
      } catch (_) {
        await completed.delete();
        rethrow;
      }
      return LocalAudioImportItemResult(
        outcome: LocalAudioImportOutcome.imported,
        record: record,
      );
    } on LocalAudioImportException {
      if (await temporary.exists()) await temporary.delete();
      rethrow;
    } catch (_) {
      if (await temporary.exists()) await temporary.delete();
      if (completed != null && await completed.exists()) {
        await completed.delete();
      }
      rethrow;
    }
  }

  Future<void> _reconcileAndFinalize(
    List<LocalAudioImportRecord> records,
  ) async {
    final scanned = await scanner.scan(destination.path);
    final reconciliation = await scannedAudioRepository.reconcileScan(
      scanned,
      rootPath: destination.path,
    );
    var files = reconciliation.files;
    final presentManagedFiles = <LocalAudioFile>[];

    for (final record in records) {
      LocalAudioFile? matched;
      for (final file in files) {
        if (path.equals(file.path, record.localPath)) {
          matched = file;
          break;
        }
      }
      if (matched == null ||
          matched.availability == AudioFileAvailability.missing) {
        final knownMissing = files.any(
          (file) =>
              file.id == record.fileId &&
              file.availability == AudioFileAvailability.missing,
        );
        await store.upsert(
          record.copyWith(
            status: knownMissing
                ? LocalAudioImportStatus.missing
                : record.status,
            failureKind: knownMissing ? 'fileMissing' : record.failureKind,
          ),
        );
        continue;
      }
      files = await scannedAudioRepository.addSourceReference(
        matched.id,
        SourceReference(kind: SourceKind.localImport, externalId: record.id),
      );
      presentManagedFiles.add(
        files.firstWhere((file) => file.id == matched!.id),
      );
      await store.upsert(
        record.copyWith(
          status: LocalAudioImportStatus.completed,
          fileId: matched.id,
          failureKind: null,
        ),
      );
    }
    if (presentManagedFiles.isNotEmpty) {
      await metadataCandidateRepository.inferForFiles(presentManagedFiles);
    }
  }

  Future<void> _finishDeletion(LocalAudioImportRecord record) async {
    if (!_isManagedPath(record.localPath)) {
      await store.upsert(
        record.copyWith(
          status: LocalAudioImportStatus.failed,
          failureKind: 'unsafeManagedPath',
        ),
      );
      throw const LocalAudioImportException(
        'unsafeManagedPath',
        '관리 영역 밖의 파일은 삭제할 수 없습니다.',
      );
    }
    final file = File(record.localPath);
    if (await file.exists()) await file.delete();
    final fileId = record.fileId;
    if (fileId != null) {
      await fileTrackLinkRepository?.unlinkFile(fileId);
      await scannedAudioRepository.remove(fileId);
      await metadataCandidateRepository.remove(fileId);
    }
    await store.delete(record.id);
  }

  Future<void> _recoverOrphanManagedFiles() async {
    if (!await destination.exists()) return;
    final records = await store.load();
    final knownPaths = {
      for (final record in records) path.normalize(record.localPath),
    };
    await for (final entity in destination.list(followLinks: false)) {
      if (entity is! File ||
          path.basename(entity.path).startsWith('.') ||
          !policy.supportsFileName(path.basename(entity.path)) ||
          knownPaths.contains(path.normalize(entity.path))) {
        continue;
      }
      final digest = (await sha256.bind(entity.openRead()).first).toString();
      final existing = await store.findByChecksum(digest);
      if (existing != null) {
        if (!await File(existing.localPath).exists()) {
          await store.upsert(
            existing.copyWith(
              localPath: entity.path,
              status: LocalAudioImportStatus.analysisPending,
              failureKind: 'recoveredManagedFile',
            ),
          );
        }
        continue;
      }
      final stat = await entity.stat();
      await store.upsert(
        LocalAudioImportRecord(
          id: 'recovered-${digest.substring(0, 24)}',
          sourceKind: 'recoveredManagedFile',
          originalFileName: path.basename(entity.path),
          localPath: entity.path,
          sha256: digest,
          sizeBytes: stat.size,
          importedAtMillis: stat.modified.millisecondsSinceEpoch,
          status: LocalAudioImportStatus.analysisPending,
          failureKind: 'recoveredManagedFile',
        ),
      );
    }
  }

  LocalAudioImportException _writeException(FileSystemException error) {
    if (error.osError?.errorCode == 28) {
      return const LocalAudioImportException(
        'insufficientStorage',
        '기기 저장 공간이 부족합니다.',
      );
    }
    return const LocalAudioImportException(
      'writeFailed',
      '앱 저장 공간에 파일을 쓰지 못했습니다.',
    );
  }

  Future<T> _serialized<T>(Future<T> Function() operation) {
    final previous = _operationTail;
    final barrier = Completer<void>();
    _operationTail = barrier.future;
    return previous.then((_) => operation()).whenComplete(barrier.complete);
  }

  Future<File> _availableTarget(String fileName) async {
    var candidate = File(path.join(destination.path, fileName));
    if (!await candidate.exists()) return candidate;
    final extension = path.extension(fileName);
    final stem = path.basenameWithoutExtension(fileName);
    var suffix = 2;
    while (await candidate.exists()) {
      candidate = File(
        path.join(destination.path, '$stem ($suffix)$extension'),
      );
      suffix += 1;
    }
    return candidate;
  }

  bool _isManagedPath(String filePath) {
    return path.equals(filePath, destination.path) ||
        path.isWithin(destination.path, filePath);
  }
}
