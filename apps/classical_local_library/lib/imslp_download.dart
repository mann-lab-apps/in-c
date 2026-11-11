import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:path/path.dart' as path;

import 'backup_policy.dart';
import 'classical_library_models.dart';
import 'imslp.dart';
import 'local_audio_scanner.dart';
import 'metadata_candidates.dart';
import 'scanned_audio_store.dart';

class ImslpDownloadCancellation {
  bool _cancelled = false;
  final Set<void Function()> _listeners = {};
  bool get isCancelled => _cancelled;
  void cancel() {
    if (_cancelled) return;
    _cancelled = true;
    for (final listener in [..._listeners]) {
      listener();
    }
  }

  void throwIfCancelled() {
    if (_cancelled) {
      throw const ImslpDownloadException('cancelled', '다운로드를 취소했습니다.');
    }
  }
}

class ImslpDownloadException implements Exception {
  const ImslpDownloadException(this.kind, this.userMessage);
  final String kind;
  final String userMessage;
}

class ImslpDownloadProgress {
  const ImslpDownloadProgress(this.receivedBytes, this.totalBytes);
  final int receivedBytes;
  final int? totalBytes;

  double? get fraction => totalBytes == null || totalBytes == 0
      ? null
      : receivedBytes / totalBytes!;
}

class ImslpDownloadedFile {
  const ImslpDownloadedFile({
    required this.file,
    required this.sha256,
    required this.sizeBytes,
    required this.mimeType,
  });

  final File file;
  final String sha256;
  final int sizeBytes;
  final String? mimeType;
}

class ImslpDownloadUrlPolicy {
  const ImslpDownloadUrlPolicy({
    this.allowedHosts = const {'imslp.org'},
    this.allowOfficialSubdomains = true,
    this.allowHttp = false,
  });

  final Set<String> allowedHosts;
  final bool allowOfficialSubdomains;
  final bool allowHttp;

  bool allows(Uri uri) {
    final scheme = uri.scheme.toLowerCase();
    if (scheme != 'https' && !(allowHttp && scheme == 'http')) return false;
    if (uri.userInfo.isNotEmpty) return false;
    if (!allowHttp && uri.hasPort && uri.port != 443) return false;
    final host = uri.host.toLowerCase();
    if (allowedHosts.contains(host)) return true;
    return allowOfficialSubdomains && host.endsWith('.imslp.org');
  }
}

class ImslpDownloadService {
  const ImslpDownloadService({
    this.urlPolicy = const ImslpDownloadUrlPolicy(),
    this.maximumBytes = 100 * 1024 * 1024,
    this.maximumRedirects = 3,
    this.backupPolicy = const PlatformBackupExclusionPolicy(),
  });

  final ImslpDownloadUrlPolicy urlPolicy;
  final int maximumBytes;
  final int maximumRedirects;
  final BackupExclusionPolicy backupPolicy;

  Future<ImslpDownloadedFile> download({
    required ImslpResource resource,
    required Directory destination,
    ImslpDownloadCancellation? cancellation,
    void Function(ImslpDownloadProgress progress)? onProgress,
    void Function(ImslpTransferStatus stage)? onStage,
    Future<void> Function(ImslpDownloadedFile file, File temporary)?
    beforeCommit,
  }) async {
    cancellation?.throwIfCancelled();
    final source = Uri.tryParse(resource.directDownloadUrl ?? '');
    if (source == null || !urlPolicy.allows(source)) {
      throw const ImslpDownloadException('unsafeUrl', '안전한 공식 다운로드 주소가 아닙니다.');
    }
    final safeName = sanitizeFileName(
      resource.originalFileName ?? path.basename(source.path),
    );
    if (safeName.isEmpty || !_isSupportedExtension(safeName)) {
      throw const ImslpDownloadException(
        'unsupportedType',
        '지원하지 않는 자료 형식입니다.',
      );
    }
    final audio = audioExtensionForPath(safeName) != null;
    final midi = {
      '.mid',
      '.midi',
    }.contains(path.extension(safeName).toLowerCase());
    if ((resource.kind == ImslpResourceKind.audio) != audio ||
        (resource.kind == ImslpResourceKind.midi) != midi) {
      throw const ImslpDownloadException(
        'kindMismatch',
        '자료 종류와 파일 형식이 다릅니다. 오디오와 악보·MIDI를 구분해 주세요.',
      );
    }
    final temporary = File(
      path.join(
        destination.path,
        '.$safeName.${DateTime.now().microsecondsSinceEpoch}.part',
      ),
    );
    final client = HttpClient()
      ..connectionTimeout = const Duration(seconds: 12);
    void abort() => client.close(force: true);
    cancellation?._listeners.add(abort);
    File? completedFile;
    try {
      await destination.create(recursive: true);
      cancellation?.throwIfCancelled();
      onStage?.call(ImslpTransferStatus.downloading);
      final response = await _open(client, source);
      final mimeType = response.headers.contentType?.mimeType.toLowerCase();
      if (!_mimeMatches(safeName, mimeType)) {
        throw const ImslpDownloadException(
          'mimeMismatch',
          '파일 형식과 서버 응답이 일치하지 않습니다.',
        );
      }
      final declared = response.contentLength;
      if (declared > maximumBytes) {
        throw const ImslpDownloadException('tooLarge', '파일이 허용된 최대 크기를 초과합니다.');
      }
      final sink = await temporary.open(mode: FileMode.write);
      var received = 0;
      try {
        await for (final chunk in response.timeout(
          const Duration(seconds: 20),
        )) {
          if (cancellation?.isCancelled ?? false) {
            throw const ImslpDownloadException('cancelled', '다운로드를 취소했습니다.');
          }
          received += chunk.length;
          if (received > maximumBytes) {
            throw const ImslpDownloadException(
              'tooLarge',
              '파일이 허용된 최대 크기를 초과합니다.',
            );
          }
          await sink.writeFrom(chunk);
          onProgress?.call(
            ImslpDownloadProgress(received, declared > 0 ? declared : null),
          );
        }
      } finally {
        await sink.close();
      }
      cancellation?.throwIfCancelled();
      onStage?.call(ImslpTransferStatus.verifying);
      if (declared >= 0 && received != declared) {
        throw const ImslpDownloadException(
          'truncated',
          '다운로드가 완료되기 전에 연결이 종료되었습니다.',
        );
      }
      if (received == 0 || !await _hasExpectedHeader(temporary, safeName)) {
        throw const ImslpDownloadException(
          'invalidFile',
          '파일 내용을 확인할 수 없습니다. 공식 페이지에서 자료 형식을 확인해 주세요.',
        );
      }
      final digest = await sha256.bind(temporary.openRead()).first;
      cancellation?.throwIfCancelled();
      final target = await _availableTarget(destination, safeName);
      // Persist the final AND temporary names before the atomic rename. A
      // restart can finish either side of that rename without another request.
      await beforeCommit?.call(
        ImslpDownloadedFile(
          file: target,
          sha256: digest.toString(),
          sizeBytes: received,
          mimeType: mimeType,
        ),
        temporary,
      );
      cancellation?.throwIfCancelled();
      final completed = await temporary.rename(target.path);
      completedFile = completed;
      await backupPolicy.exclude(completed.path);
      cancellation?.throwIfCancelled();
      return ImslpDownloadedFile(
        file: completed,
        sha256: digest.toString(),
        sizeBytes: received,
        mimeType: mimeType,
      );
    } on ImslpDownloadException {
      if (await temporary.exists()) await temporary.delete();
      if (completedFile != null && await completedFile.exists()) {
        await completedFile.delete();
      }
      rethrow;
    } on FileSystemException catch (error) {
      if (await temporary.exists()) await temporary.delete();
      if (completedFile != null && await completedFile.exists()) {
        await completedFile.delete();
      }
      throw ImslpDownloadException(
        error.osError?.errorCode == 28 ? 'storageFull' : 'storageFailure',
        '파일을 저장하지 못했습니다. 저장 공간과 폴더 접근 권한을 확인해 주세요.',
      );
    } catch (_) {
      if (await temporary.exists()) await temporary.delete();
      if (completedFile != null && await completedFile.exists()) {
        await completedFile.delete();
      }
      cancellation?.throwIfCancelled();
      throw const ImslpDownloadException('networkFailure', '자료를 다운로드하지 못했습니다.');
    } finally {
      cancellation?._listeners.remove(abort);
      client.close(force: true);
    }
  }

  Future<HttpClientResponse> _open(HttpClient client, Uri initial) async {
    var current = initial;
    for (var redirects = 0; redirects <= maximumRedirects; redirects++) {
      if (!urlPolicy.allows(current)) {
        throw const ImslpDownloadException(
          'unsafeRedirect',
          '허용되지 않은 주소로 이동하려는 다운로드를 차단했습니다.',
        );
      }
      final request = await client
          .getUrl(current)
          .timeout(const Duration(seconds: 12));
      request.followRedirects = false;
      final response = await request.close().timeout(
        const Duration(seconds: 12),
      );
      if (response.isRedirect) {
        final location = response.headers.value(HttpHeaders.locationHeader);
        if (location == null || redirects == maximumRedirects) {
          throw const ImslpDownloadException(
            'redirectFailure',
            '다운로드 주소 이동을 확인할 수 없습니다.',
          );
        }
        await response.drain<void>().timeout(const Duration(seconds: 12));
        current = current.resolve(location);
        continue;
      }
      if (response.statusCode != HttpStatus.ok) {
        throw const ImslpDownloadException('httpFailure', '자료를 다운로드하지 못했습니다.');
      }
      return response;
    }
    throw const ImslpDownloadException(
      'redirectFailure',
      '다운로드 주소 이동이 너무 많습니다.',
    );
  }

  static String sanitizeFileName(String source) {
    return path
        .basename(source.replaceAll('\\', '/'))
        .replaceAll(RegExp(r'[\\/:*?"<>|\x00-\x1f]'), '_')
        .replaceAll(RegExp(r'^\.+'), '')
        .trim();
  }

  static bool _isSupportedExtension(String name) => const {
    '.pdf',
    '.mid',
    '.midi',
    '.mp3',
    '.m4a',
    '.flac',
    '.wav',
    '.ogg',
    '.opus',
  }.contains(path.extension(name).toLowerCase());

  static Future<bool> _hasExpectedHeader(File file, String name) async {
    final handle = await file.open();
    try {
      final bytes = await handle.read(16);
      final text = latin1.decode(bytes);
      return switch (path.extension(name).toLowerCase()) {
        '.pdf' => text.startsWith('%PDF-'),
        '.mid' || '.midi' => text.startsWith('MThd'),
        '.wav' =>
          bytes.length >= 12 &&
              text.startsWith('RIFF') &&
              text.substring(8).startsWith('WAVE'),
        '.flac' => text.startsWith('fLaC'),
        '.ogg' || '.opus' => text.startsWith('OggS'),
        '.m4a' => bytes.length >= 12 && text.substring(4).startsWith('ftyp'),
        '.mp3' =>
          text.startsWith('ID3') ||
              (bytes.length >= 2 &&
                  bytes[0] == 0xff &&
                  bytes[1] & 0xe0 == 0xe0),
        _ => false,
      };
    } finally {
      await handle.close();
    }
  }

  static bool _mimeMatches(String name, String? mimeType) {
    if (mimeType == null || mimeType == 'application/octet-stream') return true;
    final extension = path.extension(name).toLowerCase();
    if (extension == '.pdf') return mimeType == 'application/pdf';
    if (extension == '.mid' || extension == '.midi') {
      return mimeType == 'audio/midi' || mimeType == 'audio/x-midi';
    }
    if (extension == '.mp3') return mimeType == 'audio/mpeg';
    if (extension == '.m4a' || extension == '.mp4') {
      return mimeType == 'audio/mp4' || mimeType == 'video/mp4';
    }
    if (extension == '.flac') return mimeType == 'audio/flac';
    if (extension == '.wav') {
      return mimeType == 'audio/wav' || mimeType == 'audio/x-wav';
    }
    if (extension == '.ogg' || extension == '.opus') {
      return mimeType == 'audio/ogg' || mimeType == 'audio/opus';
    }
    return false;
  }

  static Future<File> _availableTarget(
    Directory destination,
    String fileName,
  ) async {
    var candidate = File(path.join(destination.path, fileName));
    if (!await candidate.exists()) return candidate;
    final extension = path.extension(fileName);
    final stem = path.basenameWithoutExtension(fileName);
    var suffix = 2;
    while (await candidate.exists()) {
      candidate = File(
        path.join(destination.path, '$stem ($suffix)$extension'),
      );
      suffix++;
    }
    return candidate;
  }
}

class ImslpImportCoordinator {
  ImslpImportCoordinator({
    required this.store,
    required this.downloadService,
    required this.destination,
    required this.scanner,
    required this.scannedAudioRepository,
    required this.metadataCandidateRepository,
    this.downloadDecision,
  });

  final ImslpStore store;
  final ImslpDownloadService downloadService;
  final Directory destination;
  final AudioFileScanner scanner;
  final ScannedAudioRepository scannedAudioRepository;
  final MetadataCandidateRepository metadataCandidateRepository;
  final ImslpDownloadDecision Function(ImslpResource resource)?
  downloadDecision;

  bool _busy = false;
  final Map<String, ImslpDownloadedFile> _pending = {};
  final List<String> _recoveryWarnings = [];
  List<String> get recoveryWarnings => List.unmodifiable(_recoveryWarnings);

  String _key(ImslpResource resource) => sha256
      .convert(utf8.encode('${resource.id}\n${resource.directDownloadUrl}'))
      .toString();

  File _journal(ImslpResource resource) =>
      File(path.join(destination.path, '.imslp-${_key(resource)}.json'));

  /// Durable staging data lives beside the managed file, outside the DB. It
  /// permits registration retry after a store failure or an app restart.
  Future<void> _savePending(
    ImslpResource resource,
    ImslpDownloadedFile file, {
    File? temporaryFile,
  }) async {
    final journal = _journal(resource);
    final temporary = File('${journal.path}.tmp');
    await temporary.writeAsString(
      jsonEncode({
        'resourceId': resource.id,
        'workId': resource.workId,
        'pageUrl': resource.pageUrl,
        'directDownloadUrl': resource.directDownloadUrl,
        'kind': resource.kind.name,
        'rightsStatus': resource.rightsStatus.name,
        'fetchedAtMillis': resource.fetchedAtMillis,
        'originalFileName': resource.originalFileName,
        'licenseLabel': resource.licenseLabel,
        'rawCopyrightStatus': resource.rawCopyrightStatus,
        'regionLabel': resource.regionLabel,
        'contributorLabel': resource.contributorLabel,
        'isSoundRecording': resource.isSoundRecording,
        'fileName': path.basename(file.file.path),
        'temporaryFileName': temporaryFile == null
            ? null
            : path.basename(temporaryFile.path),
        'sha256': file.sha256,
        'sizeBytes': file.sizeBytes,
        'mimeType': file.mimeType,
      }),
      flush: true,
    );
    await temporary.rename(journal.path);
    await downloadService.backupPolicy.exclude(journal.path);
  }

  Future<ImslpDownloadedFile?> _loadPending(ImslpResource resource) async {
    var pending = _pending[_key(resource)];
    final journal = _journal(resource);
    if (pending == null && await journal.exists()) {
      final data =
          jsonDecode(await journal.readAsString()) as Map<String, dynamic>;
      if (data['resourceId'] != resource.id ||
          data['workId'] != resource.workId ||
          data['directDownloadUrl'] != resource.directDownloadUrl) {
        throw const FormatException('Journal source mismatch');
      }
      final name = data['fileName'] as String;
      _validateName(name);
      pending = ImslpDownloadedFile(
        file: File(path.join(destination.path, name)),
        sha256: data['sha256'] as String,
        sizeBytes: data['sizeBytes'] as int,
        mimeType: data['mimeType'] as String?,
      );
      final temporaryName = data['temporaryFileName'] as String?;
      if (!await pending.file.exists() && temporaryName != null) {
        _validateName(temporaryName);
        if (!temporaryName.endsWith('.part')) throw const FormatException();
        final temporary = File(path.join(destination.path, temporaryName));
        await _verifyPending(
          ImslpDownloadedFile(
            file: temporary,
            sha256: pending.sha256,
            sizeBytes: pending.sizeBytes,
            mimeType: pending.mimeType,
          ),
        );
        await temporary.rename(pending.file.path);
      }
    }
    if (pending != null) {
      await _verifyPending(pending);
      await downloadService.backupPolicy.exclude(pending.file.path);
    }
    return pending;
  }

  static void _validateName(String name) {
    if (name.isEmpty ||
        name == '.' ||
        name == '..' ||
        path.basename(name) != name ||
        name.contains('\\')) {
      throw const FormatException('Invalid staged file name');
    }
  }

  static Future<void> _verifyPending(ImslpDownloadedFile pending) async {
    if (!RegExp(r'^[a-f0-9]{64}$').hasMatch(pending.sha256) ||
        pending.sizeBytes <= 0 ||
        await FileSystemEntity.type(pending.file.path, followLinks: false) !=
            FileSystemEntityType.file ||
        !await pending.file.exists() ||
        await pending.file.length() != pending.sizeBytes ||
        (await sha256.bind(pending.file.openRead()).first).toString() !=
            pending.sha256) {
      throw const ImslpDownloadException(
        'stagedFileChanged',
        '저장된 파일이 없거나 변경되었습니다. 파일을 확인한 뒤 다시 시도해 주세요.',
      );
    }
  }

  Future<List<ImslpResource>> recoverableResources() async {
    _recoveryWarnings.clear();
    if (!await destination.exists()) return const [];
    final resources = <ImslpResource>[];
    final imports = await store.loadImports();
    await for (final entry in destination.list()) {
      if (entry is! File ||
          !path.basename(entry.path).startsWith('.imslp-') ||
          !entry.path.endsWith('.json')) {
        continue;
      }
      try {
        final data =
            jsonDecode(await entry.readAsString()) as Map<String, dynamic>;
        final resource = ImslpResource(
          id: data['resourceId'] as String,
          workId: data['workId'] as String,
          pageUrl: data['pageUrl'] as String,
          directDownloadUrl: data['directDownloadUrl'] as String,
          kind: imslpResourceKindFromName(data['kind'] as String?),
          rightsStatus: imslpRightsStatusFromName(
            data['rightsStatus'] as String?,
          ),
          fetchedAtMillis: data['fetchedAtMillis'] as int,
          originalFileName: data['originalFileName'] as String?,
          licenseLabel: data['licenseLabel'] as String?,
          rawCopyrightStatus: data['rawCopyrightStatus'] as String?,
          regionLabel: data['regionLabel'] as String?,
          contributorLabel: data['contributorLabel'] as String?,
          isSoundRecording: data['isSoundRecording'] == true,
        );
        if (entry.path != _journal(resource).path) {
          throw const FormatException();
        }
        // Age alone never discards a verified file or its provenance.
        final pending = await _loadPending(resource);
        if (pending == null) continue;
        if (imports.any(
          (record) =>
              record.resourceId == resource.id &&
              record.sourceDownloadUrl == resource.directDownloadUrl &&
              record.status == ImslpTransferStatus.completed &&
              record.localPath == pending.file.path &&
              record.sha256 == pending.sha256,
        )) {
          await _clearPending(resource);
        } else {
          resources.add(resource);
        }
      } on FormatException {
        _recoveryWarnings.add('손상된 복구 기록이 있습니다. 저장 폴더의 기록을 확인해 주세요.');
      } on TypeError {
        _recoveryWarnings.add('손상된 복구 기록이 있습니다. 저장 폴더의 기록을 확인해 주세요.');
      } on ImslpDownloadException catch (error) {
        _recoveryWarnings.add(error.userMessage);
      } on FileSystemException {
        _recoveryWarnings.add('복구 파일에 접근하지 못했습니다. 저장 공간과 폴더를 확인해 주세요.');
      }
    }
    return resources;
  }

  Future<ImslpImportRecord> import(
    ImslpResource resource, {
    required bool rightsConfirmed,
    ImslpDownloadCancellation? cancellation,
    void Function(ImslpDownloadProgress progress)? onProgress,
    void Function(ImslpTransferStatus stage)? onStage,
  }) async {
    if ((downloadDecision?.call(resource) ??
                const ImslpDownloadPolicy().decide(resource)) !=
            ImslpDownloadDecision.requiresConfirmation ||
        !rightsConfirmed) {
      throw const ImslpDownloadException(
        'confirmationRequired',
        '권리 안내를 확인한 뒤 다운로드할 수 있습니다.',
      );
    }
    if (_busy) throw const ImslpDownloadException('busy', '다른 자료를 가져오는 중입니다.');
    _busy = true;
    ImslpDownloadedFile? staged;
    var beganDownload = false;
    try {
      cancellation?.throwIfCancelled();
      // A completed record for this source avoids even a second HTTP request.
      for (final existing in await store.loadImports()) {
        if (existing.resourceId == resource.id &&
            existing.sourceDownloadUrl == resource.directDownloadUrl &&
            existing.status == ImslpTransferStatus.completed &&
            await File(existing.localPath).exists() &&
            (await sha256.bind(File(existing.localPath).openRead()).first)
                    .toString() ==
                existing.sha256) {
          cancellation?.throwIfCancelled();
          await _clearPending(resource);
          onStage?.call(ImslpTransferStatus.completed);
          return existing;
        }
      }
      onStage?.call(ImslpTransferStatus.verifying);
      staged = await _loadPending(resource);
      if (staged == null) {
        beganDownload = true;
        staged = await downloadService.download(
          resource: resource,
          destination: destination,
          cancellation: cancellation,
          onProgress: onProgress,
          onStage: onStage,
          beforeCommit: (file, temporary) =>
              _savePending(resource, file, temporaryFile: temporary),
        );
      }
      final downloaded = staged;
      _pending[_key(resource)] = downloaded;
      await _savePending(resource, downloaded);
      cancellation?.throwIfCancelled();
      final duplicate = await store.findImportByChecksum(downloaded.sha256);
      if (duplicate != null &&
          duplicate.status == ImslpTransferStatus.completed &&
          await File(duplicate.localPath).exists() &&
          (await sha256.bind(File(duplicate.localPath).openRead()).first)
                  .toString() ==
              duplicate.sha256) {
        final shared = ImslpDownloadedFile(
          file: File(duplicate.localPath),
          sha256: duplicate.sha256,
          sizeBytes: duplicate.sizeBytes,
          mimeType: duplicate.mimeType,
        );
        // Keep each source's provenance, while sharing a single local file.
        await _savePending(resource, shared);
        _pending[_key(resource)] = shared;
        if (duplicate.localPath != downloaded.file.path) {
          await downloaded.file.delete();
        }
        staged = shared;
      }
      final registeredFile = staged;
      final now = DateTime.now().millisecondsSinceEpoch;
      var record = ImslpImportRecord(
        id: 'imslp-import-${_key(resource)}',
        resourceId: resource.id,
        workId: resource.workId,
        sourcePageUrl: resource.pageUrl,
        sourceDownloadUrl: resource.directDownloadUrl!,
        originalFileName:
            resource.originalFileName ??
            path.basename(registeredFile.file.path),
        localPath: registeredFile.file.path,
        sha256: registeredFile.sha256,
        sizeBytes: registeredFile.sizeBytes,
        downloadedAtMillis: now,
        status: ImslpTransferStatus.importing,
        rightsStatus: resource.rightsStatus,
        mimeType: registeredFile.mimeType,
        licenseLabel: resource.licenseLabel,
        rawCopyrightStatus: resource.rawCopyrightStatus,
      );
      await store.upsertImport(record);
      onStage?.call(ImslpTransferStatus.importing);
      cancellation?.throwIfCancelled();
      String? fileId;
      if (resource.kind == ImslpResourceKind.audio &&
          _isAudio(registeredFile.file.path)) {
        final scanned = await scanner.scan(destination.path);
        cancellation?.throwIfCancelled();
        final reconciled = await scannedAudioRepository.reconcileScan(
          scanned,
          rootPath: destination.path,
        );
        final imported = reconciled.files.cast<LocalAudioFile?>().firstWhere(
          (file) => file?.path == registeredFile.file.path,
          orElse: () => null,
        );
        if (imported != null) {
          fileId = imported.id;
          await scannedAudioRepository.addSourceReference(
            fileId,
            SourceReference(
              kind: SourceKind.imslp,
              url: resource.pageUrl,
              externalId: resource.id,
              licenseLabel: resource.licenseLabel,
              copyrightStatus: resource.rawCopyrightStatus,
              regionNote: resource.regionLabel,
            ),
          );
          await metadataCandidateRepository.inferForFiles([imported]);
        } else {
          throw const ImslpDownloadException(
            'analysisPending',
            '파일은 저장했지만 보관함 분석이 끝나지 않았습니다. 등록을 다시 시도해 주세요.',
          );
        }
      }
      cancellation?.throwIfCancelled();
      record = record.withStatus(ImslpTransferStatus.completed, fileId: fileId);
      await store.upsertImport(record);
      // A committed import wins over a late cancel or journal cleanup failure.
      // The next retry reconciles a leftover journal against this record.
      try {
        await _clearPending(resource);
      } on FileSystemException {
        // Keep the completed DB record and the verified file.
      }
      onStage?.call(ImslpTransferStatus.completed);
      return record;
    } on ImslpDownloadException {
      if (beganDownload && staged == null) {
        // download() has removed its uncommitted bytes. Do not leave a
        // now-missing transfer in the registration recovery list.
        try {
          await _clearPending(resource);
        } on FileSystemException {
          // Surface the original error; the recovery scan reports this record.
        }
      }
      rethrow;
    } on FormatException {
      throw const ImslpDownloadException(
        'journalInvalid',
        '저장된 복구 기록이 손상되었습니다. 저장 폴더의 기록과 파일을 확인해 주세요.',
      );
    } on TypeError {
      throw const ImslpDownloadException(
        'journalInvalid',
        '저장된 복구 기록이 손상되었습니다. 저장 폴더의 기록과 파일을 확인해 주세요.',
      );
    } catch (_) {
      throw ImslpDownloadException(
        staged == null ? 'importFailure' : 'registrationPending',
        staged == null
            ? '가져오기를 시작하지 못했습니다. 다시 시도해 주세요.'
            : '파일은 저장했습니다. 보관함 등록을 다시 시도하면 재다운로드하지 않습니다.',
      );
    } finally {
      _busy = false;
    }
  }

  Future<void> _clearPending(ImslpResource resource) async {
    final journal = _journal(resource);
    if (await journal.exists()) await journal.delete();
    _pending.remove(_key(resource));
  }

  static bool _isAudio(String filePath) => const {
    '.mp3',
    '.m4a',
    '.flac',
    '.wav',
    '.ogg',
    '.opus',
  }.contains(path.extension(filePath).toLowerCase());
}
