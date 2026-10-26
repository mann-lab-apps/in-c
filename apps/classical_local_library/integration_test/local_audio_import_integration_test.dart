import 'dart:io';

import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/just_audio_playback.dart';
import 'package:classical_local_library/local_audio_import.dart';
import 'package:classical_local_library/local_file_library.dart';
import 'package:classical_local_library/local_audio_scanner.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:classical_local_library/sqlite_database.dart';
import 'package:crypto/crypto.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:path_provider/path_provider.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('picked audio is copied, indexed, played, and restored on iOS', (
    tester,
  ) async {
    expect(Platform.isIOS, isTrue, reason: '이 통합 테스트는 iOS 전용입니다.');

    final temporaryRoot = Directory(
      '${(await getTemporaryDirectory()).path}/local-audio-import-source',
    );
    final supportRoot = Directory(
      '${(await getApplicationSupportDirectory()).path}/import-integration',
    );
    for (final directory in [temporaryRoot, supportRoot]) {
      if (await directory.exists()) await directory.delete(recursive: true);
      await directory.create(recursive: true);
    }
    addTearDown(() async {
      for (final directory in [temporaryRoot, supportRoot]) {
        if (await directory.exists()) await directory.delete(recursive: true);
      }
    });

    final source = File('${temporaryRoot.path}/01 Allegro.wav');
    final asset = await rootBundle.load('assets/audio_test/movement_1.wav');
    await source.writeAsBytes(asset.buffer.asUint8List(), flush: true);
    final sourceDigest = sha256.convert(await source.readAsBytes()).toString();
    final databasePath = '${supportRoot.path}/import.sqlite';
    final managedDirectory = Directory('${supportRoot.path}/managed_audio');

    var database = await ClassicalLocalDatabase(path: databasePath).open();
    final importStore = SqliteLocalAudioImportStore(database);
    final scannedStore = SqliteScannedAudioStore(database);
    final candidateStore = SqliteMetadataCandidateStore(database);
    final coordinator = LocalAudioImportCoordinator(
      store: importStore,
      destination: managedDirectory,
      scanner: const FileSystemAudioFileScanner(),
      scannedAudioRepository: ScannedAudioRepository(scannedStore),
      metadataCandidateRepository: MetadataCandidateRepository(candidateStore),
    );

    final result = await coordinator.importFiles([
      FileSelectedAudioFile(source, mimeType: 'audio/wav'),
    ]);
    expect(result.count(LocalAudioImportOutcome.imported), 1);
    expect(result.files, hasLength(1));
    expect(result.candidates, hasLength(1));

    final record = (await importStore.load()).single;
    expect(record.status, LocalAudioImportStatus.completed);
    expect(record.fileId, isNotNull);
    expect(record.localPath, startsWith(managedDirectory.path));
    expect(await File(record.localPath).exists(), isTrue);
    expect(sha256.convert(await source.readAsBytes()).toString(), sourceDigest);
    expect(
      sha256.convert(await File(record.localPath).readAsBytes()).toString(),
      sourceDigest,
    );

    final player = JustAudioLocalPlaybackController();
    try {
      const fileLibrary = LocalFileLibrary();
      final queue = fileLibrary.queue(
        fileLibrary.entries(files: result.files, candidates: result.candidates),
      );
      expect(queue, hasLength(1));
      expect(queue.single.isDirectFile, isTrue);
      expect(queue.single.trackId, 'local-file:${record.fileId}');
      await player.loadQueue(queue);
      await player.play();
      await _waitUntil(
        () =>
            player.playbackState.position >= const Duration(milliseconds: 300),
        description: 'managed audio playback position',
      );
      expect(player.playbackState.playerState, LocalPlayerState.playing);
      expect(player.playbackState.failure, isNull);
      await player.stop();
    } finally {
      await player.dispose();
    }

    await database.close();
    database = await ClassicalLocalDatabase(path: databasePath).open();
    addTearDown(database.close);
    final restoredImports = await SqliteLocalAudioImportStore(database).load();
    final restoredFiles = await SqliteScannedAudioStore(database).load();
    final restoredCandidates = await SqliteMetadataCandidateStore(database)
        .load();
    expect(restoredImports.single.status, LocalAudioImportStatus.completed);
    expect(restoredImports.single.sha256, sourceDigest);
    expect(restoredFiles.single.path, record.localPath);
    expect(restoredCandidates.single.fileId, record.fileId);

    final restoredCoordinator = LocalAudioImportCoordinator(
      store: SqliteLocalAudioImportStore(database),
      destination: managedDirectory,
      scanner: const FileSystemAudioFileScanner(),
      scannedAudioRepository: ScannedAudioRepository(
        SqliteScannedAudioStore(database),
      ),
      metadataCandidateRepository: MetadataCandidateRepository(
        SqliteMetadataCandidateStore(database),
      ),
      fileTrackLinkRepository: AudioFileTrackLinkRepository(
        SqliteAudioFileTrackLinkStore(database),
      ),
    );
    final summary = await restoredCoordinator.storageSummary();
    expect(summary.fileCount, 1);
    expect(summary.totalBytes, await source.length());
    await restoredCoordinator.deleteByFileId(record.fileId!);
    expect(await source.exists(), isTrue);
    expect(await File(record.localPath).exists(), isFalse);
    expect(await SqliteLocalAudioImportStore(database).load(), isEmpty);
    expect(await SqliteScannedAudioStore(database).load(), isEmpty);
    expect(await SqliteMetadataCandidateStore(database).load(), isEmpty);
  }, timeout: const Timeout(Duration(seconds: 45)));
}

Future<void> _waitUntil(
  bool Function() condition, {
  required String description,
}) async {
  final deadline = DateTime.now().add(const Duration(seconds: 8));
  while (!condition() && DateTime.now().isBefore(deadline)) {
    await Future<void>.delayed(const Duration(milliseconds: 50));
  }
  if (!condition()) fail('$description timed out');
}
