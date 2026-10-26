import 'dart:io';

import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/just_audio_playback.dart';
import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/local_audio_import.dart';
import 'package:classical_local_library/local_audio_scanner.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/main.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/scan_locations.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:path_provider/path_provider.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('fixture import appears as a song and plays without a work', (
    tester,
  ) async {
    expect(Platform.isIOS, isTrue);
    final root = Directory(
      '${(await getTemporaryDirectory()).path}/local-file-library-flow',
    );
    if (await root.exists()) await root.delete(recursive: true);
    await root.create(recursive: true);
    addTearDown(() async {
      if (await root.exists()) await root.delete(recursive: true);
    });
    final source = File('${root.path}/01 Allegro.wav');
    final asset = await rootBundle.load('assets/audio_test/movement_1.wav');
    await source.writeAsBytes(asset.buffer.asUint8List(), flush: true);

    final scanned = ScannedAudioRepository(MemoryScannedAudioStore());
    final candidates = MetadataCandidateRepository(
      MemoryMetadataCandidateStore(),
    );
    final importer = LocalAudioImportCoordinator(
      store: MemoryLocalAudioImportStore(),
      destination: Directory('${root.path}/managed_audio'),
      scanner: const FileSystemAudioFileScanner(),
      scannedAudioRepository: scanned,
      metadataCandidateRepository: candidates,
    );
    final player = JustAudioLocalPlaybackController();
    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        initialLibrary: emptyClassicalLibrary,
        enableDemoFeatures: false,
        supportsFolderScan: false,
        audioFilePicker: _FixturePicker(source),
        localAudioImportCoordinator: importer,
        playbackController: player,
        scanRepository: scanned,
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: candidates,
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(),
        ),
      ),
    );
    await _pumpUntil(tester, find.text('보관함이 비어 있습니다'));
    expect(
      find.byKey(const ValueKey('persistent-playback-strip')),
      findsNothing,
    );

    await tester.tap(find.text('음악 가져오기'));
    await _pumpUntil(tester, find.text('최근 추가한 음악'));
    expect(find.text('보관함이 비어 있습니다'), findsNothing);
    await tester.tap(find.byKey(const ValueKey('file-category-songs')));
    await tester.pumpAndSettle();
    expect(find.byTooltip('Allegro 재생'), findsOneWidget);
    await tester.tap(find.byTooltip('Allegro 재생'));
    await _pumpUntil(tester, find.byTooltip('재생 상세 열기'));
    await _pumpUntilPlaying(tester, player);
    expect(player.playbackState.currentItem?.isDirectFile, isTrue);
    expect(
      player.playbackState.currentItem?.trackId,
      startsWith('local-file:'),
    );
    expect(player.playbackState.playerState, LocalPlayerState.playing);
    expect((await scanned.load()), hasLength(1));

    await tester.tap(find.byTooltip('재생 상세 열기'));
    await tester.pumpAndSettle();
    expect(find.text('재생 대기열'), findsOneWidget);
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('뒤로'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('01 Allegro.wav 작품과 녹음으로 정리'));
    await tester.pumpAndSettle();
    expect(find.text('작품과 녹음 정리'), findsOneWidget);
    await tester.enterText(find.widgetWithText(TextFormField, '작곡가'), 'Bach');
    await tester.enterText(find.widgetWithText(TextFormField, '작품명'), 'Suite');
    await tester.drag(find.byType(ListView).last, const Offset(0, -1000));
    await tester.pumpAndSettle();
    await tester.tap(find.text('라이브러리에 저장'));
    await _pumpUntil(tester, find.text('녹음 재생'));
    expect(find.text('첫 음악을 재생했어요.'), findsNothing);
    await Scrollable.ensureVisible(
      tester.element(find.text('녹음 재생')),
      alignment: 0.2,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('녹음 재생').hitTestable());
    await _pumpUntil(tester, find.text('첫 음악을 재생했어요.'));
    await _pumpUntilPlaying(tester, player);
    expect(player.playbackState.currentItem?.isDirectFile, isFalse);
    expect(
      (await scanned.load()).single.importStatus,
      AudioImportStatus.linked,
    );
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump(const Duration(milliseconds: 250));
  }, timeout: const Timeout(Duration(seconds: 60)));
}

class _FixturePicker implements AudioFilePicker {
  const _FixturePicker(this.source);

  final File source;

  @override
  Future<List<SelectedAudioFile>> pickAudioFiles() async => [
    FileSelectedAudioFile(source, mimeType: 'audio/wav'),
  ];
}

Future<void> _pumpUntil(WidgetTester tester, Finder finder) async {
  for (var attempt = 0; attempt < 80; attempt += 1) {
    await tester.pump(const Duration(milliseconds: 250));
    if (finder.evaluate().isNotEmpty) return;
  }
  fail('Expected screen state did not appear');
}

Future<void> _pumpUntilPlaying(
  WidgetTester tester,
  LocalPlaybackController player,
) async {
  for (var attempt = 0; attempt < 80; attempt += 1) {
    await tester.pump(const Duration(milliseconds: 250));
    if (player.playbackState.playerState == LocalPlayerState.playing) return;
  }
  fail('Audio engine did not reach playing state');
}
