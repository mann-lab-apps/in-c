import 'dart:async';
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
  bool get isCancelled => _cancelled;
  void cancel() => _cancelled = true;
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
  }) async {
    final source = Uri.tryParse(resource.directDownloadUrl ?? '');
    if (source == null || !urlPolicy.allows(source)) {
      throw const ImslpDownloadException('unsafeUrl', '안전한 공식 다운로드 주소가 아닙니다.');
    }
    await destination.create(recursive: true);
    final safeName = sanitizeFileName(
      resource.originalFileName ?? path.basename(source.path),
    );
    if (safeName.isEmpty || !_isSupportedExtension(safeName)) {
      throw const ImslpDownloadException(
        'unsupportedType',
        '지원하지 않는 자료 형식입니다.',
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
    try {
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
      final sink = temporary.openWrite();
      var received = 0;
      try {
        await for (final chunk in response) {
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
          sink.add(chunk);
          onProgress?.call(
            ImslpDownloadProgress(received, declared > 0 ? declared : null),
          );
        }
      } finally {
        await sink.close();
      }
      if (declared >= 0 && received != declared) {
        throw const ImslpDownloadException(
          'truncated',
          '다운로드가 완료되기 전에 연결이 종료되었습니다.',
        );
      }
      final digest = await sha256.bind(temporary.openRead()).first;
      final target = await _availableTarget(destination, safeName);
      final completed = await temporary.rename(target.path);
      await backupPolicy.exclude(completed.path);
      return ImslpDownloadedFile(
        file: completed,
        sha256: digest.toString(),
        sizeBytes: received,
        mimeType: mimeType,
      );
    } on ImslpDownloadException {
      if (await temporary.exists()) await temporary.delete();
      rethrow;
    } catch (_) {
      if (await temporary.exists()) await temporary.delete();
      throw const ImslpDownloadException('networkFailure', '자료를 다운로드하지 못했습니다.');
    } finally {
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
      final request = await client.getUrl(current);
      request.followRedirects = false;
      final response = await request.close();
      if (response.isRedirect) {
        final location = response.headers.value(HttpHeaders.locationHeader);
        await response.drain<void>();
        if (location == null || redirects == maximumRedirects) {
          throw const ImslpDownloadException(
            'redirectFailure',
            '다운로드 주소 이동을 확인할 수 없습니다.',
          );
        }
        current = current.resolve(location);
        continue;
      }
      if (response.statusCode != HttpStatus.ok) {
        await response.drain<void>();
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
    '.mp4',
    '.flac',
    '.wav',
    '.ogg',
    '.opus',
  }.contains(path.extension(name).toLowerCase());

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
  const ImslpImportCoordinator({
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

  Future<ImslpImportRecord> import(
    ImslpResource resource, {
    required bool rightsConfirmed,
    ImslpDownloadCancellation? cancellation,
    void Function(ImslpDownloadProgress progress)? onProgress,
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
    final downloaded = await downloadService.download(
      resource: resource,
      destination: destination,
      cancellation: cancellation,
      onProgress: onProgress,
    );
    final duplicate = await store.findImportByChecksum(downloaded.sha256);
    if (duplicate != null) {
      await downloaded.file.delete();
      return duplicate;
    }
    String? fileId;
    if (_isAudio(downloaded.file.path)) {
      final scanned = await scanner.scan(destination.path);
      final reconciled = await scannedAudioRepository.reconcileScan(
        scanned,
        rootPath: destination.path,
      );
      final imported = reconciled.files.cast<LocalAudioFile?>().firstWhere(
        (file) => file?.path == downloaded.file.path,
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
      }
    }
    final now = DateTime.now().millisecondsSinceEpoch;
    final record = ImslpImportRecord(
      id: 'imslp-import-$now-${resource.id}',
      resourceId: resource.id,
      workId: resource.workId,
      sourcePageUrl: resource.pageUrl,
      sourceDownloadUrl: resource.directDownloadUrl!,
      originalFileName:
          resource.originalFileName ?? path.basename(downloaded.file.path),
      localPath: downloaded.file.path,
      sha256: downloaded.sha256,
      sizeBytes: downloaded.sizeBytes,
      downloadedAtMillis: now,
      status: ImslpTransferStatus.completed,
      rightsStatus: resource.rightsStatus,
      mimeType: downloaded.mimeType,
      fileId: fileId,
      licenseLabel: resource.licenseLabel,
      rawCopyrightStatus: resource.rawCopyrightStatus,
    );
    await store.upsertImport(record);
    return record;
  }

  static bool _isAudio(String filePath) => const {
    '.mp3',
    '.m4a',
    '.mp4',
    '.flac',
    '.wav',
    '.ogg',
    '.opus',
  }.contains(path.extension(filePath).toLowerCase());
}
