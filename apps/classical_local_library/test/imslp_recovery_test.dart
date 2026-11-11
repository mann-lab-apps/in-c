import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:classical_local_library/backup_policy.dart';
import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/imslp.dart';
import 'package:classical_local_library/imslp_download.dart';
import 'package:classical_local_library/local_audio_scanner.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as path;

void main() {
  late Directory directory;
  late HttpServer server;
  late _Store store;
  late _Scanner scanner;
  late ScannedAudioRepository scanned;
  late int requests;

  ImslpDownloadService service({
    BackupExclusionPolicy policy = const NoopBackupExclusionPolicy(),
    int maximumBytes = 1024,
  }) => ImslpDownloadService(
    urlPolicy: const ImslpDownloadUrlPolicy(
      allowedHosts: {'127.0.0.1'},
      allowOfficialSubdomains: false,
      allowHttp: true,
    ),
    maximumBytes: maximumBytes,
    backupPolicy: policy,
  );

  ImslpResource resource({
    String id = 'r1',
    String name = 'fixture.wav',
    ImslpResourceKind kind = ImslpResourceKind.audio,
  }) => ImslpResource(
    id: id,
    workId: 'work',
    pageUrl: 'https://imslp.org/wiki/Test',
    directDownloadUrl: 'http://127.0.0.1:${server.port}/$name',
    originalFileName: name,
    kind: kind,
    rightsStatus: ImslpRightsStatus.freeLicense,
    fetchedAtMillis: 1,
    licenseLabel: 'CC0 fixture',
    rawCopyrightStatus: 'Synthetic test only',
    regionLabel: 'Fixture region',
    isSoundRecording: kind == ImslpResourceKind.audio,
  );

  ImslpImportCoordinator coordinator({
    ImslpDownloadService? downloader,
    MetadataCandidateRepository? candidates,
  }) => ImslpImportCoordinator(
    store: store,
    downloadService: downloader ?? service(),
    destination: directory,
    scanner: scanner,
    scannedAudioRepository: scanned,
    metadataCandidateRepository:
        candidates ??
        MetadataCandidateRepository(MemoryMetadataCandidateStore()),
    downloadDecision: (_) => ImslpDownloadDecision.requiresConfirmation,
  );

  void serve({
    List<int>? bytes,
    String mime = 'audio/wav',
    bool declared = true,
  }) {
    server.listen((request) async {
      requests++;
      request.response.headers.set(HttpHeaders.contentTypeHeader, mime);
      final body = bytes ?? _wav;
      if (declared) request.response.contentLength = body.length;
      request.response.add(body);
      await request.response.close();
    });
  }

  setUp(() async {
    directory = await Directory.systemTemp.createTemp('imslp_recovery_');
    server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    store = _Store();
    scanner = _Scanner();
    requests = 0;
    scanned = ScannedAudioRepository(MemoryScannedAudioStore());
  });
  tearDown(() async {
    await server.close(force: true);
    await directory.delete(recursive: true);
  });

  for (final point in [
    'scanner',
    'initial store',
    'completed store',
    'scanned store',
    'candidate store',
  ]) {
    test(
      '$point failure retains file and restarts registration without HTTP',
      () async {
        serve();
        final scannedStore = _ScannedStore();
        final candidateStore = _CandidateStore();
        scanned = ScannedAudioRepository(scannedStore);
        final candidates = MetadataCandidateRepository(candidateStore);
        scanner.fail = point == 'scanner';
        store.failAt = switch (point) {
          'initial store' => 1,
          'completed store' => 2,
          _ => 0,
        };
        scannedStore.fail = point == 'scanned store';
        candidateStore.fail = point == 'candidate store';
        await expectLater(
          coordinator(candidates: candidates)
              .import(resource(), rightsConfirmed: true),
          _failure('registrationPending'),
        );
        expect(requests, 1);
        final alreadyScanned = await scanned.load();
        final previousId = alreadyScanned.isEmpty
            ? null
            : alreadyScanned.single.id;
        scanner.fail = false;
        store.failAt = 0;
        scannedStore.fail = false;
        candidateStore.fail = false;
        final restarted = coordinator(candidates: candidates);
        expect(await restarted.recoverableResources(), hasLength(1));
        final record = await restarted.import(
          resource(),
          rightsConfirmed: true,
        );
        expect(record.status, ImslpTransferStatus.completed);
        expect(requests, 1);
        expect(record.fileId, isNotNull);
        if (previousId != null) expect(record.fileId, previousId);
        expect(await restarted.recoverableResources(), isEmpty);
        final file = (await scanned.load()).single;
        final provenance = file.sourceReferences.singleWhere(
          (s) => s.kind == SourceKind.imslp,
        );
        expect(provenance.url, resource().pageUrl);
        expect(provenance.regionNote, 'Fixture region');
        expect(record.licenseLabel, 'CC0 fixture');
        expect(record.rawCopyrightStatus, 'Synthetic test only');
        expect(await candidates.load(), hasLength(1));
      },
    );
  }

  for (final beforeRename in [true, false]) {
    test(
      'journal durable ${beforeRename ? 'before' : 'after'} rename recovers crash boundary',
      () async {
        serve();
        scanner.fail = true;
        final policy = _CaptureJournalPolicy();
        await expectLater(
          coordinator(downloader: service(policy: policy))
              .import(resource(), rightsConfirmed: true),
          _failure('registrationPending'),
        );
        // Restore the actual durable pre-rename snapshot, simulating process loss
        // at either side of rename, before any later journal write could occur.
        final snapshot = policy.snapshots.first;
        final data = jsonDecode(snapshot.$2) as Map<String, dynamic>;
        expect(policy.finalExistedAtFirstJournal, isFalse);
        expect(policy.temporaryExistedAtFirstJournal, isTrue);
        final finalFile = File(
          path.join(directory.path, data['fileName'] as String),
        );
        final temporaryFile = File(
          path.join(directory.path, data['temporaryFileName'] as String),
        );
        if (beforeRename) await finalFile.rename(temporaryFile.path);
        await File(snapshot.$1).writeAsString(snapshot.$2, flush: true);
        scanner.fail = false;
        final restarted = coordinator();
        final recoverable = await restarted.recoverableResources();
        expect(recoverable.single.id, 'r1');
        final result = await restarted.import(
          recoverable.single,
          rightsConfirmed: true,
        );
        expect(result.fileId, isNotNull);
        expect(requests, 1);
        expect(await finalFile.exists(), isTrue);
        expect(await temporaryFile.exists(), isFalse);
      },
    );
  }

  test('corrupt, missing, traversal and changed journals do not hide valid old recovery', () async {
    serve();
    scanner.fail = true;
    await expectLater(
      coordinator().import(resource(), rightsConfirmed: true),
      _failure('registrationPending'),
    );
    final journal = directory.listSync().whereType<File>().singleWhere(
      (f) => f.path.endsWith('.json'),
    );
    final data =
        jsonDecode(await journal.readAsString()) as Map<String, dynamic>;
    data['fetchedAtMillis'] = 1; // A verified old file remains recoverable.
    await journal.writeAsString(jsonEncode(data));
    await File(path.join(directory.path, '.imslp-corrupt.json'))
        .writeAsString('{broken');
    await File(path.join(directory.path, '.imslp-type.json'))
        .writeAsString('[]');
    await File(path.join(directory.path, '.imslp-traversal.json'))
        .writeAsString(jsonEncode({...data, 'fileName': '../outside.wav'}));
    final restarted = coordinator();
    expect(await restarted.recoverableResources(), hasLength(1));
    expect(restarted.recoveryWarnings, hasLength(3));
    final localFile = File(
      path.join(directory.path, data['fileName'] as String),
    );
    await localFile.writeAsBytes(List.filled(_wav.length, 0));
    expect(await restarted.recoverableResources(), isEmpty);
    expect(restarted.recoveryWarnings, hasLength(4));
    await expectLater(
      restarted.import(resource(), rightsConfirmed: true),
      _failure('stagedFileChanged'),
    );
    expect(requests, 1);
    await localFile.delete();
    expect(await coordinator().recoverableResources(), isEmpty);
    expect(await journal.exists(), isTrue); // Never erase user's evidence.
  });

  test(
    'same source is idempotent and checksum duplicate preserves both sources',
    () async {
      serve();
      final importer = coordinator();
      final first = await importer.import(resource(), rightsConfirmed: true);
      final second = await importer.import(resource(), rightsConfirmed: true);
      expect(first.id, second.id);
      expect(requests, 1);
      final other = await importer.import(
        resource(id: 'r2'),
        rightsConfirmed: true,
      );
      expect(other.id, isNot(first.id));
      expect(other.fileId, first.fileId);
      expect(other.localPath, first.localPath);
      expect(
        (await store.loadImports()).map((r) => r.resourceId),
        containsAll(['r1', 'r2']),
      );
      expect(
        (await scanned.load()).single.sourceReferences.map((s) => s.externalId),
        containsAll(['r1', 'r2']),
      );
      expect(
        directory.listSync().whereType<File>().where(
          (f) => f.path.endsWith('.wav'),
        ),
        hasLength(1),
      );
    },
  );

  test(
    'committed store then lost response recovers completed record once',
    () async {
      serve();
      store.throwAfterCompletion = true;
      await expectLater(
        coordinator().import(resource(), rightsConfirmed: true),
        _failure('registrationPending'),
      );
      store.throwAfterCompletion = false;
      final restarted = coordinator();
      expect(await restarted.recoverableResources(), isEmpty);
      final result = await restarted.import(resource(), rightsConfirmed: true);
      expect(result.status, ImslpTransferStatus.completed);
      expect(requests, 1);
      expect(await store.loadImports(), hasLength(1));
    },
  );

  test(
    'cancel after rename removes abandoned journal and permits a fresh retry',
    () async {
      serve();
      final cancellation = ImslpDownloadCancellation();
      final importer = coordinator(
        downloader: service(policy: _CancelAfterRenamePolicy(cancellation)),
      );
      await expectLater(
        importer.import(
          resource(),
          rightsConfirmed: true,
          cancellation: cancellation,
        ),
        _failure('cancelled'),
      );
      expect(directory.listSync(), isEmpty);
      expect(await coordinator().recoverableResources(), isEmpty);
      final result = await coordinator().import(
        resource(),
        rightsConfirmed: true,
      );
      expect(result.fileId, isNotNull);
      expect(requests, 2);
    },
  );

  test('scanner returning no audio stays pending; retry commits stages and local ID', () async {
    serve();
    scanner.empty = true;
    await expectLater(
      coordinator().import(resource(), rightsConfirmed: true),
      _failure('analysisPending'),
    );
    scanner.empty = false;
    final stages = <ImslpTransferStatus>[];
    final result = await coordinator().import(
      resource(),
      rightsConfirmed: true,
      onStage: stages.add,
    );
    expect(stages, [
      ImslpTransferStatus.verifying,
      ImslpTransferStatus.importing,
      ImslpTransferStatus.completed,
    ]);
    expect(result.fileId, isNotNull);
    expect(requests, 1);
  });

  test('late cancellation after completed commit cannot turn saved import into failure', () async {
    serve();
    final cancel = ImslpDownloadCancellation();
    final result = await coordinator().import(
      resource(),
      rightsConfirmed: true,
      cancellation: cancel,
      onStage: (stage) {
        if (stage == ImslpTransferStatus.completed) cancel.cancel();
      },
    );
    expect(cancel.isCancelled, isTrue);
    expect(result.status, ImslpTransferStatus.completed);
    expect(await coordinator().recoverableResources(), isEmpty);
  });

  test('busy import rejects overlap and cancelled registration remains recoverable', () async {
    serve();
    scanner.gate = Completer<void>();
    final cancellation = ImslpDownloadCancellation();
    final importer = coordinator();
    final pending = importer.import(
      resource(),
      rightsConfirmed: true,
      cancellation: cancellation,
    );
    await scanner.entered.future;
    await expectLater(
      importer.import(resource(id: 'r2'), rightsConfirmed: true),
      _failure('busy'),
    );
    cancellation.cancel();
    scanner.gate!.complete();
    await expectLater(pending, _failure('cancelled'));
    expect(await scanned.load(), isEmpty);
    expect(await coordinator().recoverableResources(), hasLength(1));
    final record = await coordinator().import(
      resource(),
      rightsConfirmed: true,
    );
    expect(record.fileId, isNotNull);
    expect(requests, 1);
  });

  for (final stage in [
    ImslpTransferStatus.downloading,
    ImslpTransferStatus.verifying,
  ]) {
    test('cancellation at ${stage.name} removes uncommitted bytes', () async {
      serve();
      final cancel = ImslpDownloadCancellation();
      await expectLater(
        service().download(
          resource: resource(),
          destination: directory,
          cancellation: cancel,
          onStage: (s) {
            if (s == stage) cancel.cancel();
          },
        ),
        _failure('cancelled'),
      );
      expect(directory.listSync(), isEmpty);
    });
  }

  test(
    'stream cancellation closes the response and removes partial bytes',
    () async {
      final sent = Completer<void>();
      server.listen((request) async {
        requests++;
        request.response.bufferOutput = false;
        request.response.contentLength = _wav.length * 2;
        request.response.headers.set(
          HttpHeaders.contentTypeHeader,
          'audio/wav',
        );
        request.response.add(_wav);
        await request.response.flush();
        sent.complete();
      });
      final cancel = ImslpDownloadCancellation();
      final transfer = service().download(
        resource: resource(),
        destination: directory,
        cancellation: cancel,
        onProgress: (_) => cancel.cancel(),
      );
      await sent.future;
      cancel.cancel();
      await expectLater(transfer, _failure('cancelled'));
      expect(directory.listSync(), isEmpty);
    },
  );

  test(
    'space failure is distinct and preserves an existing same-name file',
    () async {
      serve();
      final original = File(path.join(directory.path, 'fixture.wav'));
      await original.writeAsString('user original');
      await expectLater(
        service(policy: _NoSpacePolicy())
            .download(resource: resource(), destination: directory),
        _failure('storageFull'),
      );
      expect(await original.readAsString(), 'user original');
      expect(directory.listSync(), hasLength(1));
    },
  );

  for (final declared in [true, false]) {
    test(
      '${declared ? 'declared' : 'streamed'} oversized file is removed',
      () async {
        serve(declared: declared);
        await expectLater(
          service(maximumBytes: 12)
              .download(resource: resource(), destination: directory),
          _failure('tooLarge'),
        );
        expect(directory.listSync(), isEmpty);
      },
    );
  }

  for (final fixture in [
    (
      'score.pdf',
      ImslpResourceKind.score,
      'application/pdf',
      utf8.encode('%PDF-1.4 fixture'),
    ),
    (
      'notes.mid',
      ImslpResourceKind.midi,
      'audio/midi',
      utf8.encode('MThd\u0000\u0000\u0000\u0006fixture'),
    ),
  ]) {
    test(
      '${fixture.$1} is stored with provenance but never scanned as playable audio',
      () async {
        serve(bytes: fixture.$4, mime: fixture.$3);
        final record = await coordinator().import(
          resource(name: fixture.$1, kind: fixture.$2),
          rightsConfirmed: true,
        );
        expect(record.status, ImslpTransferStatus.completed);
        expect(record.fileId, isNull);
        expect(scanner.calls, 0);
        expect(await scanned.load(), isEmpty);
        expect(record.sourcePageUrl, 'https://imslp.org/wiki/Test');
      },
    );
  }

  for (final fixture in [
    ('fixture.mp3', 'audio/mpeg', <int>[0x49, 0x44, 0x33, 4, 0]),
    (
      'fixture.m4a',
      'audio/mp4',
      <int>[0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41, 0x20],
    ),
    ('fixture.flac', 'audio/flac', utf8.encode('fLaCfixture')),
    ('fixture.ogg', 'audio/ogg', utf8.encode('OggSfixture')),
    ('fixture.opus', 'audio/opus', utf8.encode('OggSfixture')),
  ]) {
    test(
      '${fixture.$1} accepts matching header and rejects HTML under audio MIME',
      () async {
        var valid = true;
        server.listen((request) async {
          request.response.headers.set(
            HttpHeaders.contentTypeHeader,
            fixture.$2,
          );
          request.response.add(
            valid ? fixture.$3 : utf8.encode('<html>wait</html>'),
          );
          await request.response.close();
        });
        final good = await service().download(
          resource: resource(name: fixture.$1),
          destination: directory,
        );
        expect(good.sizeBytes, fixture.$3.length);
        valid = false;
        await expectLater(
          service().download(
            resource: resource(name: fixture.$1),
            destination: directory,
          ),
          _failure('invalidFile'),
        );
        expect(directory.listSync(), hasLength(1));
      },
    );
  }

  test(
    'resource kind mismatch and missing confirmation never request bytes',
    () async {
      serve();
      await expectLater(
        service().download(
          resource: resource(name: 'score.pdf'),
          destination: directory,
        ),
        _failure('kindMismatch'),
      );
      await expectLater(
        coordinator().import(resource(), rightsConfirmed: false),
        _failure('confirmationRequired'),
      );
      expect(requests, 0);
    },
  );
}

Matcher _failure(String kind) =>
    throwsA(isA<ImslpDownloadException>().having((e) => e.kind, 'kind', kind));

class _Store extends MemoryImslpStore {
  int failAt = 0;
  int calls = 0;
  bool throwAfterCompletion = false;
  @override
  Future<void> upsertImport(ImslpImportRecord record) async {
    calls++;
    if (calls == failAt) throw StateError('store failed');
    await super.upsertImport(record);
    if (throwAfterCompletion &&
        record.status == ImslpTransferStatus.completed) {
      throw StateError('lost acknowledgement');
    }
  }
}

class _Scanner implements AudioFileScanner {
  bool fail = false;
  bool empty = false;
  int calls = 0;
  Completer<void>? gate;
  final entered = Completer<void>();
  @override
  Future<List<LocalAudioFile>> scan(String rootPath) async {
    calls++;
    if (!entered.isCompleted) entered.complete();
    if (gate != null) await gate!.future;
    if (fail) throw StateError('scanner failed');
    if (empty) return [];
    return const FileSystemAudioFileScanner().scan(rootPath);
  }
}

class _ScannedStore extends MemoryScannedAudioStore {
  bool fail = false;
  @override
  Future<void> save(List<LocalAudioFile> files) async {
    if (fail) throw StateError('scanned store failed');
    await super.save(files);
  }
}

class _CandidateStore extends MemoryMetadataCandidateStore {
  bool fail = false;
  @override
  Future<void> save(List<MetadataCandidate> candidates) async {
    if (fail) throw StateError('candidate store failed');
    await super.save(candidates);
  }
}

class _CaptureJournalPolicy extends BackupExclusionPolicy {
  final snapshots = <(String, String)>[];
  bool? finalExistedAtFirstJournal;
  bool? temporaryExistedAtFirstJournal;
  @override
  Future<void> exclude(String filePath) async {
    if (!filePath.endsWith('.json')) return;
    final source = await File(filePath).readAsString();
    snapshots.add((filePath, source));
    if (snapshots.length == 1) {
      final data = jsonDecode(source) as Map<String, dynamic>;
      finalExistedAtFirstJournal = await File(
        path.join(path.dirname(filePath), data['fileName'] as String),
      ).exists();
      temporaryExistedAtFirstJournal = await File(
        path.join(path.dirname(filePath), data['temporaryFileName'] as String),
      ).exists();
    }
  }
}

class _NoSpacePolicy extends BackupExclusionPolicy {
  @override
  Future<void> exclude(String path) async =>
      throw FileSystemException('full', path, const OSError('No space', 28));
}

class _CancelAfterRenamePolicy extends BackupExclusionPolicy {
  _CancelAfterRenamePolicy(this.cancellation);
  final ImslpDownloadCancellation cancellation;
  @override
  Future<void> exclude(String path) async {
    if (path.endsWith('.wav')) cancellation.cancel();
  }
}

const _wav = <int>[
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
