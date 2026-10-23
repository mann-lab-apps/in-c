import 'dart:io';

import 'package:classical_local_library/imslp.dart';
import 'package:classical_local_library/imslp_download.dart';
import 'package:classical_local_library/local_audio_scanner.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late Directory tempDirectory;
  late HttpServer server;

  setUp(() async {
    tempDirectory = await Directory.systemTemp.createTemp('imslp_download_');
    server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
  });

  tearDown(() async {
    await server.close(force: true);
    if (await tempDirectory.exists()) {
      await tempDirectory.delete(recursive: true);
    }
  });

  test(
    'streaming download validates MIME, reports progress, and hashes',
    () async {
      final bytes = _wavBytes();
      server.listen((request) {
        request.response.headers.contentType = ContentType('audio', 'wav');
        request.response.contentLength = bytes.length;
        request.response.add(bytes);
        request.response.close();
      });
      final progress = <ImslpDownloadProgress>[];
      final result = await _service().download(
        resource: _resource(server, fileName: '../unsafe.wav'),
        destination: tempDirectory,
        onProgress: progress.add,
      );

      expect(result.file.path, endsWith('unsafe.wav'));
      expect(result.sizeBytes, bytes.length);
      expect(result.sha256, hasLength(64));
      expect(progress.last.receivedBytes, bytes.length);
      expect(await result.file.readAsBytes(), bytes);
    },
  );

  test(
    'redirect to a non-allowed host is blocked and temp file is removed',
    () async {
      server.listen((request) {
        request.response.statusCode = HttpStatus.found;
        request.response.headers.set(
          HttpHeaders.locationHeader,
          'https://evil.example/test.wav',
        );
        request.response.close();
      });

      expect(
        () => _service().download(
          resource: _resource(server),
          destination: tempDirectory,
        ),
        throwsA(
          isA<ImslpDownloadException>().having(
            (error) => error.kind,
            'kind',
            'unsafeRedirect',
          ),
        ),
      );
      expect(
        tempDirectory.listSync().whereType<File>().where(
          (file) => file.path.endsWith('.part'),
        ),
        isEmpty,
      );
    },
  );

  test('MIME mismatch leaves no partial file', () async {
    server.listen((request) {
      request.response.headers.contentType = ContentType('text', 'html');
      request.response.add([1, 2, 3]);
      request.response.close();
    });

    expect(
      () => _service().download(
        resource: _resource(server),
        destination: tempDirectory,
      ),
      throwsA(
        isA<ImslpDownloadException>().having(
          (error) => error.kind,
          'kind',
          'mimeMismatch',
        ),
      ),
    );
    await Future<void>.delayed(Duration.zero);
    expect(tempDirectory.listSync().whereType<File>(), isEmpty);
  });

  test('pre-cancelled transfer is reported as cancelled', () async {
    server.listen((request) {
      request.response.headers.contentType = ContentType('audio', 'wav');
      request.response.add(_wavBytes());
      request.response.close();
    });
    final cancellation = ImslpDownloadCancellation()..cancel();

    expect(
      () => _service().download(
        resource: _resource(server),
        destination: tempDirectory,
        cancellation: cancellation,
      ),
      throwsA(
        isA<ImslpDownloadException>().having(
          (error) => error.kind,
          'kind',
          'cancelled',
        ),
      ),
    );
  });

  test(
    'coordinator imports audio through scanner and deduplicates checksum',
    () async {
      final bytes = _wavBytes();
      server.listen((request) {
        request.response.headers.contentType = ContentType('audio', 'wav');
        request.response.contentLength = bytes.length;
        request.response.add(bytes);
        request.response.close();
      });
      final store = MemoryImslpStore();
      final scannedRepository = ScannedAudioRepository(
        MemoryScannedAudioStore(),
      );
      final candidateRepository = MetadataCandidateRepository(
        MemoryMetadataCandidateStore(),
      );
      final coordinator = ImslpImportCoordinator(
        store: store,
        downloadService: _service(),
        destination: tempDirectory,
        scanner: const FileSystemAudioFileScanner(),
        scannedAudioRepository: scannedRepository,
        metadataCandidateRepository: candidateRepository,
        downloadDecision: (_) => ImslpDownloadDecision.requiresConfirmation,
      );
      final resource = _resource(server);

      final first = await coordinator.import(resource, rightsConfirmed: true);
      final second = await coordinator.import(resource, rightsConfirmed: true);

      expect(first.id, second.id);
      expect(first.fileId, isNotNull);
      expect(await store.loadImports(), hasLength(1));
      final scanned = await scannedRepository.load();
      expect(scanned, hasLength(1));
      expect(
        scanned.single.sourceReferences.any(
          (source) => source.kind.name == 'imslp',
        ),
        isTrue,
      );
      expect(await candidateRepository.load(), hasLength(1));
      expect(
        tempDirectory.listSync().whereType<File>().where(
          (file) => file.path.endsWith('.wav'),
        ),
        hasLength(1),
      );
    },
  );

  test('file name sanitizer removes traversal and reserved characters', () {
    expect(
      ImslpDownloadService.sanitizeFileName('../bad:name?.pdf'),
      'bad_name_.pdf',
    );
  });
}

ImslpDownloadService _service() => const ImslpDownloadService(
  urlPolicy: ImslpDownloadUrlPolicy(
    allowedHosts: {'127.0.0.1'},
    allowOfficialSubdomains: false,
    allowHttp: true,
  ),
  maximumBytes: 1024 * 1024,
);

ImslpResource _resource(HttpServer server, {String fileName = 'fixture.wav'}) {
  return ImslpResource(
    id: 'resource-audio',
    workId: 'work.beethoven.symphony5',
    pageUrl: 'https://imslp.org/wiki/Test',
    kind: ImslpResourceKind.audio,
    rightsStatus: ImslpRightsStatus.publicDomain,
    fetchedAtMillis: 1,
    directDownloadUrl:
        'http://${server.address.address}:${server.port}/fixture.wav',
    originalFileName: fileName,
    rawCopyrightStatus: 'Public Domain',
    isSoundRecording: true,
  );
}

List<int> _wavBytes() => [
  0x52,
  0x49,
  0x46,
  0x46,
  0x24,
  0,
  0,
  0,
  0x57,
  0x41,
  0x56,
  0x45,
  0x66,
  0x6d,
  0x74,
  0x20,
  16,
  0,
  0,
  0,
  1,
  0,
  1,
  0,
  0x40,
  0x1f,
  0,
  0,
  0x80,
  0x3e,
  0,
  0,
  2,
  0,
  16,
  0,
  0x64,
  0x61,
  0x74,
  0x61,
  0,
  0,
  0,
  0,
];
