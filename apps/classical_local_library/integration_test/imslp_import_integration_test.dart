import 'dart:io';

import 'package:classical_local_library/imslp.dart';
import 'package:classical_local_library/imslp_download.dart';
import 'package:classical_local_library/local_audio_scanner.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('native file system imports a verified local audio fixture', (
    tester,
  ) async {
    final directory = await Directory.systemTemp.createTemp('imslp_native_');
    final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    addTearDown(() async {
      await server.close(force: true);
      if (await directory.exists()) await directory.delete(recursive: true);
    });
    final bytes = _wavBytes();
    server.listen((request) {
      request.response.headers.contentType = ContentType('audio', 'wav');
      request.response.contentLength = bytes.length;
      request.response.add(bytes);
      request.response.close();
    });
    final store = MemoryImslpStore();
    final scannedRepository = ScannedAudioRepository(MemoryScannedAudioStore());
    final coordinator = ImslpImportCoordinator(
      store: store,
      downloadService: const ImslpDownloadService(
        urlPolicy: ImslpDownloadUrlPolicy(
          allowedHosts: {'127.0.0.1'},
          allowOfficialSubdomains: false,
          allowHttp: true,
        ),
      ),
      destination: directory,
      scanner: const FileSystemAudioFileScanner(),
      scannedAudioRepository: scannedRepository,
      metadataCandidateRepository: MetadataCandidateRepository(
        MemoryMetadataCandidateStore(),
      ),
      downloadDecision: (_) => ImslpDownloadDecision.requiresConfirmation,
    );
    final resource = ImslpResource(
      id: 'native-fixture',
      workId: 'work.beethoven.symphony5',
      pageUrl: 'https://imslp.org/wiki/Test',
      kind: ImslpResourceKind.audio,
      rightsStatus: ImslpRightsStatus.publicDomain,
      fetchedAtMillis: 1,
      directDownloadUrl:
          'http://${server.address.address}:${server.port}/fixture.wav',
      originalFileName: 'fixture.wav',
      isSoundRecording: true,
    );

    final record = await coordinator.import(resource, rightsConfirmed: true);

    expect(await File(record.localPath).exists(), isTrue);
    expect(record.sha256, hasLength(64));
    expect(record.fileId, isNotNull);
    expect((await scannedRepository.load()).single.path, record.localPath);
  });
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
