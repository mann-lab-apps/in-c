import 'dart:async';
import 'dart:io';

import 'package:classical_local_library/audio_test_fixture.dart';
import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/local_audio_import.dart';
import 'package:classical_local_library/local_audio_scanner.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('file name, extension, and MIME policy reject unsafe input', () {
    const policy = LocalAudioImportPolicy();

    expect(
      policy.sanitizeFileName('../../Symphony:5?.flac'),
      'Symphony_5_.flac',
    );
    expect(policy.sanitizeFileName('..'), isEmpty);
    expect(policy.supportsFileName('movement.FLAC'), isTrue);
    expect(policy.supportsFileName('score.pdf'), isFalse);
    expect(policy.mimeMatches('movement.wav', 'audio/wav'), isTrue);
    expect(policy.mimeMatches('movement.wav', 'audio/mpeg'), isFalse);
    expect(policy.mimeMatches('movement.mp3', null), isTrue);
  });

  test(
    'import preserves source, deduplicates checksum, and avoids overwrite',
    () async {
      final fixture = await _Fixture.create();
      addTearDown(fixture.dispose);
      final firstSource = await fixture.writeSource(
        'first/movement.wav',
        generatePcmWaveFixture(audioFixtureSpecifications[0]),
      );
      final secondSource = await fixture.writeSource(
        'second/movement.wav',
        generatePcmWaveFixture(audioFixtureSpecifications[1]),
      );
      final firstBytes = await firstSource.readAsBytes();

      final first = await fixture.coordinator.importFiles([
        FileSelectedAudioFile(firstSource),
      ]);
      final duplicate = await fixture.coordinator.importFiles([
        FileSelectedAudioFile(firstSource),
      ]);
      final collision = await fixture.coordinator.importFiles([
        FileSelectedAudioFile(secondSource),
      ]);

      expect(first.count(LocalAudioImportOutcome.imported), 1);
      expect(duplicate.count(LocalAudioImportOutcome.duplicate), 1);
      expect(collision.count(LocalAudioImportOutcome.imported), 1);
      expect(await firstSource.readAsBytes(), firstBytes);
      final records = await fixture.importStore.load();
      expect(records, hasLength(2));
      expect(
        records.map((record) => record.status),
        everyElement(LocalAudioImportStatus.completed),
      );
      expect(
        records.map((record) => record.originalFileName),
        everyElement('movement.wav'),
      );
      expect(
        records.map((record) => record.localPath),
        contains(endsWith('movement.wav')),
      );
      expect(
        records.map((record) => record.localPath),
        contains(endsWith('movement (2).wav')),
      );
      expect(first.files, hasLength(1));
      expect(collision.files, hasLength(2));
      expect(collision.candidates, hasLength(2));
      expect(
        collision.files.expand((file) => file.sourceReferences),
        contains(
          predicate<SourceReference>(
            (source) => source.kind == SourceKind.localImport,
          ),
        ),
      );
    },
  );

  test(
    'partial failure keeps successful file and removes temporary files',
    () async {
      final fixture = await _Fixture.create();
      addTearDown(fixture.dispose);
      final valid = await fixture.writeSource('valid.wav', [1, 2, 3, 4]);
      final truncated = _MemorySelection(
        name: 'truncated.wav',
        declaredLength: 8,
        chunks: const [
          [1, 2],
        ],
      );

      final result = await fixture.coordinator.importFiles([
        truncated,
        FileSelectedAudioFile(valid),
      ]);

      expect(result.count(LocalAudioImportOutcome.failed), 1);
      expect(result.count(LocalAudioImportOutcome.imported), 1);
      expect(
        await fixture.destination
            .list()
            .where((entity) => entity.path.endsWith('.part'))
            .toList(),
        isEmpty,
      );
    },
  );

  test('cancellation creates no managed file', () async {
    final fixture = await _Fixture.create();
    addTearDown(fixture.dispose);
    final source = await fixture.writeSource('cancelled.wav', [1, 2, 3]);
    final cancellation = LocalAudioImportCancellation()..cancel();

    final result = await fixture.coordinator.importFiles([
      FileSelectedAudioFile(source),
    ], cancellation: cancellation);

    expect(result.count(LocalAudioImportOutcome.cancelled), 1);
    expect(await fixture.importStore.load(), isEmpty);
    expect(await fixture.destination.exists(), isFalse);
  });

  test('mid-copy cancellation removes partial managed file', () async {
    final fixture = await _Fixture.create();
    addTearDown(fixture.dispose);
    final cancellation = LocalAudioImportCancellation();

    final result = await fixture.coordinator.importFiles([
      _CancellingSelection(cancellation),
    ], cancellation: cancellation);

    expect(result.count(LocalAudioImportOutcome.cancelled), 1);
    expect(await fixture.importStore.load(), isEmpty);
    expect(
      await fixture.destination
          .list()
          .where((entity) => entity is File)
          .toList(),
      isEmpty,
    );
  });

  test('startup recovery removes orphan partial files', () async {
    final fixture = await _Fixture.create();
    addTearDown(fixture.dispose);
    await fixture.destination.create(recursive: true);
    final partial = File('${fixture.destination.path}/.orphan.wav.1.part');
    await partial.writeAsBytes([1, 2, 3]);

    await fixture.coordinator.recoverManagedImports();

    expect(await partial.exists(), isFalse);
  });

  test('startup recovery registers a completed orphan managed file', () async {
    final fixture = await _Fixture.create();
    addTearDown(fixture.dispose);
    await fixture.destination.create(recursive: true);
    final orphan = File('${fixture.destination.path}/orphan.wav');
    await orphan.writeAsBytes([1, 2, 3, 4]);

    final recovered = await fixture.coordinator.recoverManagedImports();

    final record = (await fixture.importStore.load()).single;
    expect(record.sourceKind, 'recoveredManagedFile');
    expect(record.status, LocalAudioImportStatus.completed);
    expect(record.fileId, isNotNull);
    expect(recovered.files, hasLength(1));
    expect(
      recovered.files.single.sourceReferences,
      contains(
        predicate<SourceReference>(
          (source) =>
              source.kind == SourceKind.localImport &&
              source.externalId == record.id,
        ),
      ),
    );
  });

  test('startup recovery finishes an interrupted managed deletion', () async {
    final fixture = await _Fixture.create();
    addTearDown(fixture.dispose);
    final source = await fixture.writeSource('deleting.wav', [1, 2, 3, 4]);
    await fixture.coordinator.importFiles([FileSelectedAudioFile(source)]);
    final record = (await fixture.importStore.load()).single;
    await fixture.importStore.upsert(
      record.copyWith(status: LocalAudioImportStatus.deleting),
    );

    await fixture.coordinator.recoverManagedImports();

    expect(await File(record.localPath).exists(), isFalse);
    expect(await fixture.importStore.load(), isEmpty);
    expect(await fixture.scannedRepository.load(), isEmpty);
  });

  test('large streaming import reports bounded byte progress', () async {
    final fixture = await _Fixture.create();
    addTearDown(fixture.dispose);
    final chunks = List.generate(7, (_) => List<int>.filled(100 * 1024, 7));
    final progress = <LocalAudioImportProgress>[];

    final result = await fixture.coordinator.importFiles([
      _MemorySelection(
        name: 'large.wav',
        declaredLength: 700 * 1024,
        chunks: chunks,
      ),
    ], onProgress: progress.add);

    expect(result.count(LocalAudioImportOutcome.imported), 1);
    final copying = progress
        .where((item) => item.stage == LocalAudioImportStage.copying)
        .toList();
    expect(copying.first.bytesCopied, 0);
    expect(copying.last.bytesCopied, 700 * 1024);
    expect(copying.last.totalBytes, 700 * 1024);
    expect(copying.length, lessThan(chunks.length + 2));
    expect([
      for (final item in copying) item.bytesCopied,
    ], orderedEquals(([for (final item in copying) item.bytesCopied]..sort())));
  });

  test('stream failure is classified and leaves no managed file', () async {
    final fixture = await _Fixture.create();
    addTearDown(fixture.dispose);

    final result = await fixture.coordinator.importFiles([
      const _FailingReadSelection(),
    ]);

    expect(result.items.single.failureKind, 'readFailed');
    expect(await fixture.importStore.load(), isEmpty);
    expect(
      await fixture.destination
          .list()
          .where((entity) => entity is File)
          .toList(),
      isEmpty,
    );
  });

  test('recovery waits for an active import operation', () async {
    final fixture = await _Fixture.create();
    addTearDown(fixture.dispose);
    final started = Completer<void>();
    final release = Completer<void>();
    final importing = fixture.coordinator.importFiles([
      _BlockingSelection(started: started, release: release),
    ]);
    await started.future;
    var recoveryFinished = false;
    final recovering = fixture.coordinator.recoverManagedImports().then((
      value,
    ) {
      recoveryFinished = true;
      return value;
    });

    await Future<void>.delayed(Duration.zero);
    expect(recoveryFinished, isFalse);
    release.complete();
    await importing;
    await recovering;

    expect(recoveryFinished, isTrue);
    expect(
      (await fixture.importStore.load()).single.status,
      LocalAudioImportStatus.completed,
    );
  });

  test('analysis failure leaves a retryable analysis-pending record', () async {
    final fixture = await _Fixture.create(
      scanner: const _ThrowingAudioScanner(),
    );
    addTearDown(fixture.dispose);
    final source = await fixture.writeSource('pending.wav', [1, 2, 3, 4]);

    final result = await fixture.coordinator.importFiles([
      FileSelectedAudioFile(source),
    ]);

    expect(result.count(LocalAudioImportOutcome.pending), 1);
    final record = (await fixture.importStore.load()).single;
    expect(record.status, LocalAudioImportStatus.analysisPending);
    expect(record.failureKind, 'analysisPending');
    expect(await File(record.localPath).exists(), isTrue);
  });

  test('managed storage summary and delete affect only the app copy', () async {
    final fixture = await _Fixture.create();
    addTearDown(fixture.dispose);
    final source = await fixture.writeSource('delete.wav', [1, 2, 3, 4]);
    final sourceBytes = await source.readAsBytes();
    final imported = await fixture.coordinator.importFiles([
      FileSelectedAudioFile(source),
    ]);
    final fileId = imported.files.single.id;
    await fixture.linkRepository.linkFileToTrack(
      fileId: fileId,
      trackId: 'managed-track',
      linkedAt: DateTime.fromMillisecondsSinceEpoch(1),
    );

    expect((await fixture.coordinator.storageSummary()).fileCount, 1);
    expect((await fixture.coordinator.storageSummary()).totalBytes, 4);
    await fixture.coordinator.deleteByFileId(fileId);

    expect(await source.readAsBytes(), sourceBytes);
    expect((await fixture.coordinator.storageSummary()).fileCount, 0);
    expect(await fixture.importStore.load(), isEmpty);
    expect(await fixture.scannedRepository.load(), isEmpty);
    expect(await fixture.candidateRepository.load(), isEmpty);
    expect(await fixture.linkRepository.load(), isEmpty);
    expect(imported.files.single.path, isNot(source.path));
    expect(await File(imported.files.single.path).exists(), isFalse);
  });

  test('managed export resolves only an existing completed app copy', () async {
    final fixture = await _Fixture.create();
    addTearDown(fixture.dispose);
    final source = await fixture.writeSource('export.wav', [1, 2, 3, 4]);
    final imported = await fixture.coordinator.importFiles([
      FileSelectedAudioFile(source),
    ]);

    final export = await fixture.coordinator.exportFileFor(
      imported.files.single.id,
    );

    expect(export.fileName, 'export.wav');
    expect(await File(export.path).readAsBytes(), [1, 2, 3, 4]);
    expect(export.path, isNot(source.path));
  });

  test('managed delete rejects provenance outside the app directory', () async {
    final fixture = await _Fixture.create();
    addTearDown(fixture.dispose);
    final external = await fixture.writeSource('outside.wav', [1, 2, 3]);
    await fixture.importStore.upsert(
      LocalAudioImportRecord(
        id: 'unsafe-import',
        sourceKind: 'documentPicker',
        originalFileName: 'outside.wav',
        localPath: external.path,
        sha256: 'unsafe',
        sizeBytes: 3,
        importedAtMillis: 1,
        status: LocalAudioImportStatus.completed,
        fileId: 'unsafe-file',
      ),
    );

    await expectLater(
      fixture.coordinator.deleteByFileId('unsafe-file'),
      throwsA(
        isA<LocalAudioImportException>().having(
          (error) => error.kind,
          'kind',
          'unsafeManagedPath',
        ),
      ),
    );
    expect(await external.exists(), isTrue);
    expect(await external.readAsBytes(), [1, 2, 3]);
  });

  test('store failure rolls back completed copy', () async {
    final fixture = await _Fixture.create(importStore: _FailingImportStore());
    addTearDown(fixture.dispose);
    final source = await fixture.writeSource('failure.wav', [1, 2, 3]);

    final result = await fixture.coordinator.importFiles([
      FileSelectedAudioFile(source),
    ]);

    expect(result.count(LocalAudioImportOutcome.failed), 1);
    expect(
      await fixture.destination
          .list()
          .where((entity) => entity is File)
          .toList(),
      isEmpty,
    );
  });

  test(
    'managed file becomes missing after two checks and can recover',
    () async {
      final fixture = await _Fixture.create();
      addTearDown(fixture.dispose);
      final source = await fixture.writeSource('recover.wav', [1, 2, 3, 4]);
      await fixture.coordinator.importFiles([FileSelectedAudioFile(source)]);
      final imported = (await fixture.importStore.load()).single;
      await File(imported.localPath).delete();

      await fixture.coordinator.recoverManagedImports();
      expect(
        (await fixture.importStore.load()).single.status,
        LocalAudioImportStatus.completed,
      );
      await fixture.coordinator.recoverManagedImports();
      expect(
        (await fixture.importStore.load()).single.status,
        LocalAudioImportStatus.missing,
      );

      final recovered = await fixture.coordinator.importFiles([
        FileSelectedAudioFile(source),
      ]);
      expect(recovered.count(LocalAudioImportOutcome.imported), 1);
      expect(
        (await fixture.importStore.load()).single.status,
        LocalAudioImportStatus.completed,
      );
      expect(
        recovered.files.single.availability,
        AudioFileAvailability.present,
      );
    },
  );
}

class _Fixture {
  _Fixture({
    required this.root,
    required this.destination,
    required this.importStore,
    required this.scannedRepository,
    required this.candidateRepository,
    required this.linkRepository,
    required this.coordinator,
  });

  final Directory root;
  final Directory destination;
  final LocalAudioImportStore importStore;
  final ScannedAudioRepository scannedRepository;
  final MetadataCandidateRepository candidateRepository;
  final AudioFileTrackLinkRepository linkRepository;
  final LocalAudioImportCoordinator coordinator;

  static Future<_Fixture> create({
    LocalAudioImportStore? importStore,
    AudioFileScanner scanner = const _TestAudioScanner(),
  }) async {
    final root = await Directory.systemTemp.createTemp('local_audio_import_');
    final destination = Directory('${root.path}/managed');
    final store = importStore ?? MemoryLocalAudioImportStore();
    final scannedRepository = ScannedAudioRepository(MemoryScannedAudioStore());
    final candidateRepository = MetadataCandidateRepository(
      MemoryMetadataCandidateStore(),
    );
    final linkRepository = AudioFileTrackLinkRepository(
      MemoryAudioFileTrackLinkStore(),
    );
    return _Fixture(
      root: root,
      destination: destination,
      importStore: store,
      scannedRepository: scannedRepository,
      candidateRepository: candidateRepository,
      linkRepository: linkRepository,
      coordinator: LocalAudioImportCoordinator(
        store: store,
        destination: destination,
        scanner: scanner,
        scannedAudioRepository: scannedRepository,
        metadataCandidateRepository: candidateRepository,
        fileTrackLinkRepository: linkRepository,
        clock: () => DateTime.fromMillisecondsSinceEpoch(1792476000000),
      ),
    );
  }

  Future<File> writeSource(String relativePath, List<int> bytes) async {
    final file = File('${root.path}/source/$relativePath');
    await file.parent.create(recursive: true);
    await file.writeAsBytes(bytes, flush: true);
    return file;
  }

  Future<void> dispose() async {
    if (await root.exists()) await root.delete(recursive: true);
  }
}

class _TestAudioScanner implements AudioFileScanner {
  const _TestAudioScanner();

  @override
  Future<List<LocalAudioFile>> scan(String rootPath) async {
    final files = <LocalAudioFile>[];
    final root = Directory(rootPath);
    if (!await root.exists()) return files;
    await for (final entity in root.list()) {
      if (entity is! File || audioExtensionForPath(entity.path) == null) {
        continue;
      }
      final stat = await entity.stat();
      files.add(
        LocalAudioFile(
          id: scannedAudioId(entity.path),
          path: entity.path,
          fileName: fileNameForPath(entity.path),
          format: audioExtensionForPath(entity.path)!.toUpperCase(),
          sizeBytes: stat.size,
          modifiedAtMillis: stat.modified.millisecondsSinceEpoch,
          lightweightFingerprint:
              '${stat.size}:${stat.modified.millisecondsSinceEpoch}',
          importStatus: AudioImportStatus.needsReview,
          sourceReferences: const [SourceReference(kind: SourceKind.localTag)],
        ),
      );
    }
    return files;
  }
}

class _MemorySelection implements SelectedAudioFile {
  const _MemorySelection({
    required this.name,
    required this.declaredLength,
    required this.chunks,
  });

  @override
  final String name;
  final int declaredLength;
  final List<List<int>> chunks;

  @override
  String? get mimeType => null;

  @override
  Future<int> length() async => declaredLength;

  @override
  Stream<List<int>> openRead() => Stream.fromIterable(chunks);
}

class _CancellingSelection implements SelectedAudioFile {
  const _CancellingSelection(this.cancellation);

  final LocalAudioImportCancellation cancellation;

  @override
  String get name => 'cancel-during-copy.wav';

  @override
  String? get mimeType => 'audio/wav';

  @override
  Future<int> length() async => 4;

  @override
  Stream<List<int>> openRead() async* {
    yield [1, 2];
    cancellation.cancel();
    yield [3, 4];
  }
}

class _FailingReadSelection implements SelectedAudioFile {
  const _FailingReadSelection();

  @override
  String get name => 'read-failure.wav';

  @override
  String? get mimeType => 'audio/wav';

  @override
  Future<int> length() async => 4;

  @override
  Stream<List<int>> openRead() async* {
    yield [1, 2];
    throw const FileSystemException('synthetic read failure');
  }
}

class _BlockingSelection implements SelectedAudioFile {
  const _BlockingSelection({required this.started, required this.release});

  final Completer<void> started;
  final Completer<void> release;

  @override
  String get name => 'serialized.wav';

  @override
  String? get mimeType => 'audio/wav';

  @override
  Future<int> length() async => 4;

  @override
  Stream<List<int>> openRead() async* {
    started.complete();
    await release.future;
    yield [1, 2, 3, 4];
  }
}

class _ThrowingAudioScanner implements AudioFileScanner {
  const _ThrowingAudioScanner();

  @override
  Future<List<LocalAudioFile>> scan(String rootPath) {
    throw const FileSystemException('synthetic scanner failure');
  }
}

class _FailingImportStore implements LocalAudioImportStore {
  @override
  Future<void> delete(String id) async {}

  @override
  Future<LocalAudioImportRecord?> findByChecksum(String sha256) async => null;

  @override
  Future<List<LocalAudioImportRecord>> load() async => const [];

  @override
  Future<void> upsert(LocalAudioImportRecord record) {
    throw const FileSystemException('synthetic store failure');
  }
}
