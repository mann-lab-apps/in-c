import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/library_deduplication.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/main.dart' as app;
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/metadata_overrides.dart';
import 'package:classical_local_library/sample_classical_library.dart';
import 'package:classical_local_library/scan_locations.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:flutter/material.dart';

Future<void> launchCaptureFixtureApp() async {
  final links = [
    for (final track in sampleClassicalLibrary.tracks)
      AudioFileTrackLink(
        fileId: track.fileId,
        trackId: track.id,
        linkedAtMillis: 1792537200000,
      ),
  ];

  runApp(
    app.ClassicalLocalLibraryApp(
      initialLibrary: sampleClassicalLibrary,
      enableDemoFeatures: false,
      supportsFolderScan: false,
      playbackController: FakeLocalPlayer(),
      scanRepository: ScannedAudioRepository(
        MemoryScannedAudioStore(sampleClassicalLibrary.files),
      ),
      scanLocationRepository: ScanLocationRepository(MemoryScanLocationStore()),
      metadataCandidateRepository: MetadataCandidateRepository(
        MemoryMetadataCandidateStore(),
      ),
      metadataOverrideRepository: MetadataOverrideRepository(
        MemoryMetadataOverrideStore(),
      ),
      libraryMergeRepository: LibraryMergeRepository(MemoryLibraryMergeStore()),
      fileTrackLinkRepository: AudioFileTrackLinkRepository(
        MemoryAudioFileTrackLinkStore(links),
      ),
      catalogRepository: ClassicalCatalogRepository(
        MemoryClassicalCatalogStore(sampleClassicalLibrary),
      ),
    ),
  );
}
