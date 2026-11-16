// Staged into an isolated checkout only. Production starts with an empty library.
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/library_deduplication.dart';
import 'package:classical_local_library/local_audio_import.dart';
import 'package:classical_local_library/local_audio_scanner.dart';
import 'package:classical_local_library/main.dart' as app;
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/metadata_overrides.dart';
import 'package:classical_local_library/sample_classical_library.dart';
import 'package:classical_local_library/scan_locations.dart';
import 'package:classical_local_library/scanned_audio_store.dart';

Future<void> launch() async {
  final root = await Directory.systemTemp.createTemp('play-store-capture-');
  final scanned = ScannedAudioRepository(MemoryScannedAudioStore());
  final candidates = MetadataCandidateRepository(
    MemoryMetadataCandidateStore(),
  );
  final importer = LocalAudioImportCoordinator(
    store: MemoryLocalAudioImportStore(),
    destination: Directory('${root.path}/managed'),
    scanner: const FileSystemAudioFileScanner(),
    scannedAudioRepository: scanned,
    metadataCandidateRepository: candidates,
  );
  const sources = [
    'movement_1.wav',
    'movement_2.wav',
    'movement_1_aac.m4a',
    'movement_1_alac.m4a',
  ];
  const names = [
    '01 합성 음원 Allegro.wav',
    '02 합성 음원 Andante.wav',
    '03 합성 음원 Scherzo.m4a',
    '04 합성 음원 Finale.m4a',
  ];
  final selections = <SelectedAudioFile>[];
  for (var index = 0; index < sources.length; index++) {
    final bytes = await rootBundle.load('assets/audio_test/${sources[index]}');
    final file = File('${root.path}/${names[index]}');
    await file.writeAsBytes(
      bytes.buffer.asUint8List(bytes.offsetInBytes, bytes.lengthInBytes),
    );
    selections.add(FileSelectedAudioFile(file));
  }
  final imported = await importer.importFiles(selections);
  if (imported.count(LocalAudioImportOutcome.imported) != 4 ||
      imported.files.length != 4) {
    throw StateError('Store capture requires four actual managed imports');
  }
  final files = [...imported.files]
    ..sort((a, b) => a.fileName!.compareTo(b.fileName!));
  for (final file in files) {
    if (!await File(file.path).exists()) {
      throw StateError('Managed capture file missing');
    }
  }
  final original = sampleClassicalLibrary.recordings.first;
  final work = sampleClassicalLibrary.work(original.workId);
  // Model a confirmed structural registration. Preserve the scanner's pending
  // path guesses separately; temporary directory names are not composers/works.
  final overrides = MetadataOverrideRepository(MemoryMetadataOverrideStore());
  for (final file in files) {
    await overrides.saveUserValues(file.id, {
      MetadataField.composer: sampleClassicalLibrary.person(work.composerId).name.ko,
      MetadataField.workTitle: work.title.ko,
    });
  }
  final oldTracks = original.trackIds
      .map(sampleClassicalLibrary.track)
      .toList();
  if (oldTracks.length != 4) throw StateError('Unexpected structural fixture');
  final tracks = [
    for (var i = 0; i < 4; i++)
      Track(
        id: oldTracks[i].id,
        recordingId: original.id,
        fileId: files[i].id,
        sequenceNumber: oldTracks[i].sequenceNumber,
        workPartIds: oldTracks[i].workPartIds,
        title: oldTracks[i].title,
      ),
  ];
  final library = ClassicalLibrary(
    people: [sampleClassicalLibrary.person(work.composerId)],
    instruments: const [],
    ensembles: const [],
    albums: const [],
    works: [work],
    workParts: sampleClassicalLibrary.workParts
        .where((p) => p.workId == work.id)
        .toList(),
    recordings: [
      Recording(
        id: original.id,
        workId: work.id,
        title: const LocalizedName(ko: '구조 예제 · 직접 만든 합성 음원', sortName: '합성 음원'),
        trackIds: tracks.map((t) => t.id).toList(),
      ),
    ],
    tracks: tracks,
    files: files,
  );
  final links = [
    for (final track in tracks)
      AudioFileTrackLink(
        fileId: track.fileId,
        trackId: track.id,
        linkedAtMillis: 1794805200000,
      ),
  ];
  debugPrint(
    'Store capture seed: four actual managed imports; synthetic structural example; default real player; no autoplay',
  );
  runApp(
    app.ClassicalLocalLibraryApp(
      initialLibrary: library,
      enableDemoFeatures: false,
      supportsFolderScan: false,
      scanRepository: scanned,
      metadataCandidateRepository: candidates,
      localAudioImportCoordinator: importer,
      scanLocationRepository: ScanLocationRepository(MemoryScanLocationStore()),
      metadataOverrideRepository: overrides,
      libraryMergeRepository: LibraryMergeRepository(MemoryLibraryMergeStore()),
      fileTrackLinkRepository: AudioFileTrackLinkRepository(
        MemoryAudioFileTrackLinkStore(links),
      ),
      catalogRepository: ClassicalCatalogRepository(
        MemoryClassicalCatalogStore(library),
      ),
    ),
  );
}
