import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/folder_picker.dart';
import 'package:classical_local_library/local_audio_scanner.dart';
import 'package:classical_local_library/local_audio_import.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/main.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/playback_history.dart';
import 'package:classical_local_library/playback_diagnostic.dart';
import 'package:classical_local_library/playback_position.dart';
import 'package:classical_local_library/sample_classical_library.dart';
import 'package:classical_local_library/scan_locations.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('좁은 화면은 보관함 제목과 더보기 도구를 유지한다', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        playbackController: FakeLocalPlayer(),
        scanRepository: ScannedAudioRepository(MemoryScannedAudioStore()),
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final title = find.text('보관함').first;
    final paragraph = tester.renderObject<RenderParagraph>(title);
    expect(paragraph.didExceedMaxLines, isFalse);
    expect(find.text('띠로리 플레이'), findsNothing);
    expect(find.byTooltip('도구 더보기'), findsOneWidget);
    await tester.tap(find.byTooltip('도구 더보기'));
    await tester.pumpAndSettle();
    expect(find.text('음악 발견'), findsOneWidget);
    expect(find.text('IMSLP 자료'), findsOneWidget);
    expect(find.text('음원 정보·파일 복구'), findsOneWidget);
    expect(find.text('재생 진단'), findsOneWidget);
    expect(find.text('앱 정보 및 데이터'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('출시 모드는 빈 사용자 카탈로그에서 시작하고 데모를 숨긴다', (tester) async {
    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        initialLibrary: emptyClassicalLibrary,
        enableDemoFeatures: false,
        playbackController: FakeLocalPlayer(),
        scanRepository: ScannedAudioRepository(MemoryScannedAudioStore()),
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('데모 스캔'), findsNothing);
    await tester.drag(find.byType(ListView), const Offset(0, -520));
    await tester.pumpAndSettle();
    expect(find.text('보관함이 비어 있습니다'), findsOneWidget);
    expect(find.text('음악 가져오기'), findsOneWidget);
    expect(find.text('작품 랜덤'), findsNothing);
    expect(find.byTooltip('현재 재생 상세 열기'), findsNothing);
  });

  testWidgets('보관함 초기화 실패는 경로를 숨기고 다시 시도할 수 있다', (tester) async {
    final scannedStore = _FailingOnceScannedAudioStore();
    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        initialLibrary: emptyClassicalLibrary,
        enableDemoFeatures: false,
        playbackController: FakeLocalPlayer(),
        scanRepository: ScannedAudioRepository(scannedStore),
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('보관함 다시 불러오기'), findsOneWidget);
    expect(find.textContaining('/Users/private'), findsNothing);
    expect(find.textContaining('injected native error'), findsNothing);
    expect(tester.takeException(), isNull);

    await tester.ensureVisible(find.text('보관함 다시 불러오기'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('보관함 다시 불러오기'));
    await tester.pumpAndSettle();

    expect(scannedStore.loadCount, 2);
    expect(find.text('보관함 다시 불러오기'), findsNothing);
    expect(find.textContaining('보관함을 불러오지 못했습니다'), findsNothing);
  });

  testWidgets('홈은 320px, 200% 글자, 다크 모드와 동작 줄이기에서 유지된다', (tester) async {
    tester.view.physicalSize = const Size(320, 900);
    tester.view.devicePixelRatio = 1;
    tester.platformDispatcher.platformBrightnessTestValue = Brightness.dark;
    tester.platformDispatcher.textScaleFactorTestValue = 2;
    tester.platformDispatcher.accessibilityFeaturesTestValue =
        const FakeAccessibilityFeatures(disableAnimations: true);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.platformDispatcher.clearAllTestValues);

    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        initialLibrary: emptyClassicalLibrary,
        enableDemoFeatures: false,
        playbackController: FakeLocalPlayer(),
        scanRepository: ScannedAudioRepository(MemoryScannedAudioStore()),
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('띠로리 플레이'), findsNothing);
    expect(find.text('보관함'), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is Semantics && widget.properties.label == '띠로리 플레이 앱 아이콘',
      ),
      findsNothing,
    );
    expect(find.byTooltip('도구 더보기'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('첫 화면은 한국어 라이브러리와 랜덤 재생 모드를 보여준다', (tester) async {
    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        playbackController: FakeLocalPlayer(),
        scanRepository: ScannedAudioRepository(MemoryScannedAudioStore()),
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(),
        ),
        audioFileScanner: const SampleAudioFileScanner(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('띠로리 플레이'), findsNothing);
    expect(find.byTooltip('내 음악 검색'), findsOneWidget);
    await _showHomeView(tester, '관리');
    expect(find.text('파일 상태'), findsOneWidget);
    expect(find.text('폴더 추가'), findsOneWidget);
    expect(find.text('데모 스캔'), findsOneWidget);
    await tester.scrollUntilVisible(find.byType(DdiroriMetricGroup), 250);
    expect(find.byType(DdiroriMetricGroup), findsOneWidget);
    expect(find.byType(DdiroriStatusBadge), findsWidgets);

    await _showHomeView(tester, '현재 재생');
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('작품 랜덤'), 250);
    expect(find.text('작품 랜덤'), findsOneWidget);
    expect(find.text('녹음 랜덤'), findsOneWidget);
    expect(find.text('악장/소품 랜덤'), findsOneWidget);

    await Scrollable.ensureVisible(
      tester.element(find.byIcon(Icons.music_note_outlined)),
      alignment: 0.5,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byIcon(Icons.music_note_outlined));
    await tester.pumpAndSettle();

    expect(find.text('짧게 듣기용으로 악장 또는 소품 하나만 큐에 넣습니다.'), findsOneWidget);

    await _scrollToQueue(tester);
    expect(find.text('현재 재생 큐'), findsOneWidget);
    expect(find.textContaining('교향곡 5번 다단조'), findsWidgets);
    await tester.scrollUntilVisible(
      find.byTooltip('음원 정보 1'),
      250,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.byTooltip('음원 정보 1'));
    await tester.pumpAndSettle();
    expect(find.textContaining('샘플 파일'), findsOneWidget);
    await tester.tap(find.text('닫기'));
    await tester.pumpAndSettle();
  });

  testWidgets('음악 발견 화면에서 추천 이유를 보고 기존 큐를 선택한다', (tester) async {
    final player = FakeLocalPlayer();
    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        playbackController: player,
        scanRepository: ScannedAudioRepository(MemoryScannedAudioStore()),
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('도구 더보기'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('음악 발견').last);
    await tester.pumpAndSettle();
    expect(find.text('음악 발견'), findsOneWidget);
    expect(find.text('같은 작곡가의 작품'), findsOneWidget);
    expect(find.textContaining('의 다른 작품'), findsWidgets);
    await tester.tap(find.text('피아노 소나타 14번 올림다단조'));
    await tester.pumpAndSettle();
    expect(find.text('작품'), findsOneWidget);
    expect(find.text('아래에서 듣고 싶은 녹음을 선택하세요.'), findsNothing);
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.tap(find.byIcon(Icons.play_arrow_outlined).first);
    await tester.pumpAndSettle();

    expect(find.text('띠로리 플레이'), findsNothing);
    expect(find.byTooltip('도구 더보기'), findsOneWidget);
  });

  testWidgets('샘플 스캔은 정리 필요 파일 후보를 화면에 표시한다', (tester) async {
    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        playbackController: FakeLocalPlayer(),
        scanRepository: ScannedAudioRepository(MemoryScannedAudioStore()),
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(),
        ),
        audioFileScanner: const SampleAudioFileScanner(),
      ),
    );
    await tester.pumpAndSettle();

    await _showHomeView(tester, '관리');
    await tester.ensureVisible(find.text('데모 스캔'));
    await tester.tap(find.text('데모 스캔'));
    await tester.pumpAndSettle();

    expect(find.text('정리 필요 2'), findsOneWidget);
    expect(find.text('01 Allegro.flac'), findsOneWidget);
    expect(find.text('02 Andante.flac'), findsOneWidget);
    expect(
      find.textContaining('후보: Beethoven · Symphony 5 · 1번 · Allegro'),
      findsOneWidget,
    );
    expect(find.textContaining('정리 필요 파일 2개'), findsOneWidget);
  });

  testWidgets('스캔 실패 후 진행 상태가 풀리고 다시 실행할 수 있다', (tester) async {
    final scanner = _FailingOnceAudioFileScanner([
      _audioFile('/sample/local-music/01 Allegro.flac'),
    ]);
    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        playbackController: FakeLocalPlayer(),
        scanRepository: ScannedAudioRepository(MemoryScannedAudioStore()),
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(),
        ),
        sampleAudioFileScanner: scanner,
      ),
    );
    await tester.pumpAndSettle();

    await _showHomeView(tester, '관리');
    await tester.ensureVisible(find.text('데모 스캔'));
    await tester.tap(find.text('데모 스캔'));
    await tester.pumpAndSettle();
    expect(find.text('음원 파일을 스캔하지 못했습니다. 다시 시도해 주세요.'), findsOneWidget);
    expect(find.textContaining('/Users/private'), findsNothing);
    expect(tester.takeException(), isNull);

    await _showHomeView(tester, '관리');
    await tester.ensureVisible(find.text('데모 스캔'));
    await tester.tap(find.text('데모 스캔'));
    await tester.pumpAndSettle();
    expect(scanner.scanCount, 2);
    expect(find.text('01 Allegro.flac'), findsOneWidget);
  });

  testWidgets('폴더 추가는 선택한 경로를 저장하고 정리 필요 후보를 표시한다', (tester) async {
    final scannedStore = MemoryScannedAudioStore();
    final locationStore = MemoryScanLocationStore();
    final candidateStore = MemoryMetadataCandidateStore();
    final linkStore = MemoryAudioFileTrackLinkStore();
    final scanner = _MutableAudioFileScanner([
      _audioFile('/Users/me/Music/Classical/01 Allegro.flac'),
      _audioFile('/Users/me/Music/Classical/02 Andante.flac'),
    ]);

    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        playbackController: FakeLocalPlayer(),
        scanRepository: ScannedAudioRepository(scannedStore),
        scanLocationRepository: ScanLocationRepository(locationStore),
        metadataCandidateRepository: MetadataCandidateRepository(
          candidateStore,
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(linkStore),
        folderPicker: const _FixedFolderPicker('/Users/me/Music/Classical'),
        audioFileScanner: scanner,
      ),
    );
    await tester.pumpAndSettle();

    await _showHomeView(tester, '관리');
    await tester.ensureVisible(find.text('폴더 추가'));
    await tester.tap(find.text('폴더 추가'));
    await tester.pumpAndSettle();

    expect(scanner.scannedPaths, ['/Users/me/Music/Classical']);
    expect(find.text('Classical'), findsOneWidget);
    expect(find.text('01 Allegro.flac'), findsOneWidget);
    expect(find.text('02 Andante.flac'), findsOneWidget);
    expect(
      find.textContaining('후보: Music · Classical · 1번 · Allegro'),
      findsOneWidget,
    );
    expect(find.textContaining('파일 2개 · 이동 0'), findsOneWidget);
    expect(await scannedStore.load(), hasLength(2));
    expect(await candidateStore.load(), hasLength(2));

    final locations = await locationStore.load();
    expect(locations, hasLength(1));
    expect(locations.single.path, '/Users/me/Music/Classical');
    expect(locations.single.lastScanFileCount, 2);
    expect(locations.single.lastScannedAtMillis, isNotNull);
  });

  testWidgets('iOS 파일 가져오기는 일부 실패와 중복을 표시한다', (tester) async {
    final scannedStore = MemoryScannedAudioStore();
    final candidateStore = MemoryMetadataCandidateStore();
    final scannedRepository = ScannedAudioRepository(scannedStore);
    final candidateRepository = MetadataCandidateRepository(candidateStore);
    final importedFile = _audioFile('/managed/movement.wav');
    final importedCandidate = MetadataCandidate(
      fileId: importedFile.id,
      filePath: importedFile.path,
      fileName: importedFile.fileName!,
      movementText: 'movement',
      confidence: 0.5,
    );
    final controller = _SequencedImportController([
      LocalAudioImportBatchResult(
        items: const [
          LocalAudioImportItemResult(outcome: LocalAudioImportOutcome.imported),
          LocalAudioImportItemResult(
            outcome: LocalAudioImportOutcome.failed,
            failureKind: 'unsupportedType',
          ),
        ],
        files: [importedFile],
        candidates: [importedCandidate],
      ),
      LocalAudioImportBatchResult(
        items: const [
          LocalAudioImportItemResult(
            outcome: LocalAudioImportOutcome.failed,
            failureKind: 'unsupportedType',
          ),
        ],
        files: [importedFile],
        candidates: [importedCandidate],
      ),
      LocalAudioImportBatchResult(
        items: const [
          LocalAudioImportItemResult(
            outcome: LocalAudioImportOutcome.duplicate,
          ),
          LocalAudioImportItemResult(
            outcome: LocalAudioImportOutcome.failed,
            failureKind: 'unsupportedType',
          ),
        ],
        files: [importedFile],
        candidates: [importedCandidate],
      ),
    ], recoverFiles: const []);

    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        playbackController: FakeLocalPlayer(),
        scanRepository: scannedRepository,
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: candidateRepository,
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(),
        ),
        audioFilePicker: const _FixedAudioFilePicker([
          _StubSelectedAudioFile('movement.wav'),
          _StubSelectedAudioFile('score.pdf'),
        ]),
        localAudioImportCoordinator: controller,
        supportsFolderScan: false,
      ),
    );
    await tester.pumpAndSettle();

    await _showHomeView(tester, '관리');
    expect(find.text('파일 가져오기'), findsOneWidget);
    expect(find.text('폴더 추가'), findsNothing);
    expect(find.text('가져온 음원 파일이 없습니다.'), findsOneWidget);

    final importButton = find.widgetWithText(FilledButton, '파일 가져오기');
    await tester.tap(importButton);
    await tester.pumpAndSettle();

    expect(find.text('가져옴 1개 · 실패 1개'), findsOneWidget);
    expect(find.text('movement.wav'), findsWidgets);
    expect(find.textContaining('지원하지 않는 파일 형식입니다.'), findsOneWidget);
    await tester.tap(find.text('실패한 파일 다시 시도'));
    await tester.pumpAndSettle();
    expect(controller.importCallCount, 2);
    expect(controller.selectionNames.last, ['score.pdf']);
    expect(find.text('가져옴 1개 · 실패 1개'), findsOneWidget);

    await tester.ensureVisible(importButton);
    await tester.pumpAndSettle();
    await tester.tap(importButton);
    await tester.pumpAndSettle();
    expect(controller.importCallCount, 3);
    expect(find.text('중복 1개 · 실패 1개'), findsOneWidget);
  });

  testWidgets('파일 선택 취소는 한국어 상태를 표시한다', (tester) async {
    final scannedRepository = ScannedAudioRepository(MemoryScannedAudioStore());
    final candidateRepository = MetadataCandidateRepository(
      MemoryMetadataCandidateStore(),
    );
    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        playbackController: FakeLocalPlayer(),
        scanRepository: scannedRepository,
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: candidateRepository,
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(),
        ),
        audioFilePicker: const _FixedAudioFilePicker([]),
        localAudioImportCoordinator: _SequencedImportController(
          const [],
          recoverFiles: const [],
        ),
        supportsFolderScan: false,
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('음악 가져오기'));
    await tester.pumpAndSettle();

    expect(find.text('파일 가져오기가 취소되었습니다.'), findsOneWidget);
  });

  testWidgets('분석 대기 파일은 수동 정리와 분석 재시도를 함께 제공한다', (tester) async {
    final file = _audioFile('/managed/pending.flac');
    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        initialLibrary: emptyClassicalLibrary,
        enableDemoFeatures: false,
        playbackController: FakeLocalPlayer(),
        scanRepository: ScannedAudioRepository(MemoryScannedAudioStore()),
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(),
        ),
        audioFilePicker: const _FixedAudioFilePicker([
          _StubSelectedAudioFile('pending.flac'),
        ]),
        localAudioImportCoordinator: _SequencedImportController([
          LocalAudioImportBatchResult(
            items: [
              LocalAudioImportItemResult(
                outcome: LocalAudioImportOutcome.pending,
                record: LocalAudioImportRecord(
                  id: 'pending-import',
                  sourceKind: 'document',
                  originalFileName: 'pending.flac',
                  localPath: file.path,
                  sha256: 'pending',
                  sizeBytes: 1,
                  importedAtMillis: 1,
                  status: LocalAudioImportStatus.analysisPending,
                  fileId: file.id,
                ),
              ),
            ],
            files: [file],
            candidates: const [],
          ),
        ], recoverFiles: const []),
        supportsFolderScan: false,
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('음악 가져오기'));
    await tester.pumpAndSettle();
    expect(find.text('분석 다시 시도'), findsOneWidget);
    expect(find.byTooltip('pending.flac 작품과 녹음으로 정리'), findsOneWidget);
    expect(find.textContaining('직접 정리할 수 있습니다.'), findsOneWidget);
  });

  testWidgets('등록된 폴더를 다시 스캔하고 비활성화할 수 있다', (tester) async {
    final scannedStore = MemoryScannedAudioStore();
    final locationStore = MemoryScanLocationStore();
    final candidateStore = MemoryMetadataCandidateStore();
    final linkStore = MemoryAudioFileTrackLinkStore();
    final scanner = _MutableAudioFileScanner([
      _audioFile('/Users/me/Music/Classical/01 Allegro.flac'),
    ]);

    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        playbackController: FakeLocalPlayer(),
        scanRepository: ScannedAudioRepository(scannedStore),
        scanLocationRepository: ScanLocationRepository(locationStore),
        metadataCandidateRepository: MetadataCandidateRepository(
          candidateStore,
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(linkStore),
        folderPicker: const _FixedFolderPicker('/Users/me/Music/Classical'),
        audioFileScanner: scanner,
      ),
    );
    await tester.pumpAndSettle();

    await _showHomeView(tester, '관리');
    await tester.ensureVisible(find.text('폴더 추가'));
    await tester.tap(find.text('폴더 추가'));
    await tester.pumpAndSettle();

    scanner.files = [
      _audioFile('/Users/me/Music/Classical/01 Allegro.flac'),
      _audioFile('/Users/me/Music/Classical/02 Andante.flac'),
      _audioFile('/Users/me/Music/Classical/03 Scherzo.flac'),
    ];
    await tester.ensureVisible(find.byTooltip('다시 스캔'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('다시 스캔'));
    await tester.pumpAndSettle();

    var locations = await locationStore.load();
    expect(locations.single.lastScanFileCount, 3);
    expect(find.text('03 Scherzo.flac'), findsOneWidget);

    await tester.tap(find.byTooltip('비활성화'));
    await tester.pumpAndSettle();

    locations = await locationStore.load();
    expect(locations.single.isActive, isFalse);
    expect(find.byTooltip('활성화'), findsOneWidget);
  });

  testWidgets('정리 필요 파일을 작품과 녹음에 등록하면 연결됨 상태가 된다', (tester) async {
    final scannedStore = MemoryScannedAudioStore();
    final linkStore = MemoryAudioFileTrackLinkStore();

    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        playbackController: FakeLocalPlayer(),
        scanRepository: ScannedAudioRepository(scannedStore),
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(linkStore),
        audioFileScanner: const SampleAudioFileScanner(),
      ),
    );
    await tester.pumpAndSettle();

    await _showHomeView(tester, '관리');
    await tester.ensureVisible(find.text('데모 스캔'));
    await tester.tap(find.text('데모 스캔'));
    await tester.pumpAndSettle();

    final linkButton = find.byTooltip('작품과 녹음에 정리').first;
    await tester.ensureVisible(linkButton);
    await tester.pumpAndSettle();
    await tester.tap(linkButton);
    await tester.pumpAndSettle();
    expect(find.text('작품과 녹음 정리'), findsOneWidget);
    await tester.drag(find.byType(ListView).last, const Offset(0, -1000));
    await tester.pumpAndSettle();
    await tester.tap(find.text('라이브러리에 저장'));
    await tester.pumpAndSettle();

    expect(find.text('작품과 녹음을 저장하지 못했습니다. 다시 시도해 주세요.'), findsNothing);
    expect(find.text('작품과 녹음 정리'), findsNothing);
    expect(find.textContaining('연결 1'), findsOneWidget);
    expect(find.textContaining('연결됨 · 트랙'), findsOneWidget);
    expect(
      (await scannedStore.load()).where(
        (file) => file.importStatus == AudioImportStatus.linked,
      ),
      hasLength(1),
    );
    expect(await linkStore.load(), hasLength(1));
  });

  testWidgets('재생 컨트롤은 큐를 로드하고 상태를 전환한다', (tester) async {
    final fixture = _linkedPlaybackFixture();
    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        playbackController: FakeLocalPlayer(),
        scanRepository: ScannedAudioRepository(
          MemoryScannedAudioStore(fixture.files),
        ),
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(fixture.links),
        ),
        audioFileScanner: const SampleAudioFileScanner(),
      ),
    );
    await tester.pumpAndSettle();

    await _scrollToPlaybackControls(tester);
    expect(find.text('대기'), findsOneWidget);

    await tester.tap(find.byTooltip('재생'));
    await tester.pumpAndSettle();
    expect(find.textContaining('재생 중 · 1/'), findsOneWidget);

    await tester.tap(find.byTooltip('일시정지'));
    await tester.pumpAndSettle();
    expect(find.textContaining('일시정지 · 1/'), findsOneWidget);

    await tester.tap(find.byTooltip('재생'));
    await tester.pumpAndSettle();
    expect(find.textContaining('재생 중 · 1/'), findsOneWidget);

    await tester.tap(find.byTooltip('다음'));
    await tester.pumpAndSettle();
    expect(find.textContaining('재생 중 · 2/'), findsOneWidget);

    await tester.tap(find.byTooltip('정지'));
    await tester.pumpAndSettle();
    expect(find.textContaining('정지됨 · 1/'), findsOneWidget);
  });

  testWidgets('앱 시작 시 저장된 재생 큐와 현재 악장을 복원한다', (tester) async {
    final fixture = _linkedPlaybackFixture();
    final tracks = sampleClassicalLibrary.tracksForRecording(
      sampleClassicalLibrary.recordings.first.id,
    );
    final player = FakeLocalPlayer();
    final queueStore = MemoryPlaybackQueueSnapshotStore()
      ..snapshot = PlaybackQueueSnapshot(
        trackIds: [for (final track in tracks) track.id],
        currentTrackId: tracks[1].id,
        savedAtMillis: DateTime.utc(2026, 10, 23).millisecondsSinceEpoch,
      );

    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        playbackController: player,
        playbackQueueSnapshotStore: queueStore,
        scanRepository: ScannedAudioRepository(
          MemoryScannedAudioStore(fixture.files),
        ),
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(fixture.links),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(player.queue, hasLength(tracks.length));
    expect(player.currentItem?.trackId, tracks[1].id);
    expect(player.queue.map((item) => item.trackId), [
      ...tracks.skip(1).map((track) => track.id),
      tracks.first.id,
    ]);
  });

  testWidgets('연결 파일이 없는 큐는 앱을 종료하지 않고 한국어 오류를 표시한다', (tester) async {
    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        playbackController: FakeLocalPlayer(
          validator: const LocalPlaybackQueueValidator(),
        ),
        scanRepository: ScannedAudioRepository(MemoryScannedAudioStore()),
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(),
        ),
        audioFileScanner: const SampleAudioFileScanner(),
      ),
    );
    await tester.pumpAndSettle();

    await _scrollToPlaybackControls(tester);
    await tester.tap(find.byTooltip('재생'));
    await tester.pumpAndSettle();

    expect(find.text('재생 오류'), findsOneWidget);
    expect(find.textContaining('재생할 트랙이 없습니다.'), findsOneWidget);
  });

  testWidgets('재생 위치와 길이를 표시하고 slider 종료 시 seek한다', (tester) async {
    final fixture = _linkedPlaybackFixture();
    final player = FakeLocalPlayer(
      trackDurations: const {
        'track.beethoven5.kleiber.1': Duration(minutes: 2),
      },
    );
    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        playbackController: player,
        scanRepository: ScannedAudioRepository(
          MemoryScannedAudioStore(fixture.files),
        ),
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(fixture.links),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await _scrollToPlaybackControls(tester);
    await tester.tap(find.byTooltip('재생'));
    await tester.pumpAndSettle();
    await player.updatePosition(
      const Duration(seconds: 30),
      bufferedPosition: const Duration(minutes: 1),
    );
    await tester.pump();

    expect(find.text('00:30'), findsOneWidget);
    expect(find.text('02:00'), findsOneWidget);
    expect(
      tester
          .widget<Slider>(find.byKey(const ValueKey('playback-progress')))
          .secondaryTrackValue,
      60000,
    );

    await tester.drag(
      find.byKey(const ValueKey('playback-progress')),
      const Offset(80, 0),
    );
    await tester.pumpAndSettle();

    expect(
      player.playbackState.normalizedPosition,
      greaterThan(const Duration(seconds: 30)),
    );
  });

  testWidgets('Android 앱이 background로 이동하면 일시정지하고 위치를 저장한다', (tester) async {
    final fixture = _linkedPlaybackFixture();
    final store = MemoryPlaybackPositionStore();
    final historyStore = MemoryPlaybackHistoryStore();
    final player = FakeLocalPlayer(
      positionCoordinator: PlaybackPositionCoordinator(store: store),
      trackDurations: const {
        'track.beethoven5.kleiber.1': Duration(minutes: 2),
      },
    );
    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        playbackController: player,
        playbackHistoryStore: historyStore,
        scanRepository: ScannedAudioRepository(
          MemoryScannedAudioStore(fixture.files),
        ),
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(fixture.links),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await _scrollToPlaybackControls(tester);
    await tester.tap(find.byTooltip('재생'));
    await tester.pumpAndSettle();
    await player.updatePosition(const Duration(seconds: 25));

    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    await tester.pumpAndSettle();

    expect(player.state, LocalPlayerState.paused);
    final path = player.currentItem!.path;
    expect((await store.load(path))?.position, const Duration(seconds: 25));
    final history = await historyStore.loadRecent();
    expect(history, hasLength(1));
    expect(history.single.trackId, player.currentItem!.trackId);
    expect(history.single.lastPosition, const Duration(seconds: 25));
  }, variant: TargetPlatformVariant.only(TargetPlatform.android));

  testWidgets('검색어로 작품과 파일 후보를 찾을 수 있다', (tester) async {
    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        playbackController: FakeLocalPlayer(),
        scanRepository: ScannedAudioRepository(MemoryScannedAudioStore()),
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(),
        ),
        audioFileScanner: const SampleAudioFileScanner(),
      ),
    );
    await tester.pumpAndSettle();

    await _showHomeView(tester, '관리');
    await tester.ensureVisible(find.text('데모 스캔'));
    await tester.tap(find.text('데모 스캔'));
    await tester.pumpAndSettle();

    await _showHomeView(tester, '라이브러리');
    await tester.tap(find.byTooltip('내 음악 검색'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), '베토벤 5번');
    await tester.pump(const Duration(milliseconds: 180));
    await tester.pumpAndSettle();

    expect(find.text('교향곡 5번 다단조'), findsWidgets);

    await _showHomeView(tester, '라이브러리');
    await tester.tap(find.byTooltip('내 음악 검색'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Symphony 5 Allegro');
    await tester.pump(const Duration(milliseconds: 180));
    await tester.pumpAndSettle();

    expect(find.textContaining('01 Allegro.flac'), findsWidgets);
  });

  testWidgets('검색 결과에서 작품과 녹음 상세를 연속해서 탐색한다', (tester) async {
    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        playbackController: FakeLocalPlayer(),
        scanRepository: ScannedAudioRepository(MemoryScannedAudioStore()),
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await _showHomeView(tester, '라이브러리');
    await tester.tap(find.byTooltip('내 음악 검색'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), '운명');
    await tester.pump(const Duration(milliseconds: 180));
    await tester.pumpAndSettle();
    await tester.tap(find.text('교향곡 5번 다단조').last);
    await tester.pumpAndSettle();

    expect(find.text('작품'), findsOneWidget);
    expect(find.text('악장'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('클라이버 / 빈 필하모닉 연주 녹음'), 400);
    await tester.ensureVisible(find.text('클라이버 / 빈 필하모닉 연주 녹음'));
    await tester.drag(find.byType(ListView).last, const Offset(0, -160));
    await tester.pumpAndSettle();
    await tester.tap(find.text('클라이버 / 빈 필하모닉 연주 녹음'));
    await tester.pumpAndSettle();

    expect(find.text('녹음'), findsOneWidget);
    expect(find.text('녹음 전체 재생'), findsNothing);
    expect(find.textContaining('연결된 로컬 파일이 없어'), findsOneWidget);
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller?.text,
      '운명',
    );
    expect(find.text('교향곡 5번 다단조'), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('녹음 상세에서 전체와 선택 악장부터 순서대로 재생한다', (tester) async {
    final fixture = _linkedPlaybackFixture();
    final player = FakeLocalPlayer();
    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        playbackController: player,
        scanRepository: ScannedAudioRepository(
          MemoryScannedAudioStore(fixture.files),
        ),
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(fixture.links),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await _showHomeView(tester, '라이브러리');
    await tester.tap(find.byTooltip('내 음악 검색'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), '운명');
    await tester.pumpAndSettle();
    await tester.tap(find.text('교향곡 5번 다단조').last);
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('클라이버 / 빈 필하모닉 연주 녹음'), 400);
    await tester.drag(find.byType(ListView).last, const Offset(0, -160));
    await tester.pumpAndSettle();
    await tester.tap(find.text('클라이버 / 빈 필하모닉 연주 녹음'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('녹음 전체 재생'));
    await tester.pumpAndSettle();
    expect(player.playbackState.playerState, LocalPlayerState.playing);
    expect(player.playbackState.queue, hasLength(4));

    await tester.scrollUntilVisible(
      find.text('2악장 Andante con moto'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.ensureVisible(find.text('2악장 Andante con moto'));
    await Scrollable.ensureVisible(
      tester.element(find.text('2악장 Andante con moto')),
      alignment: 0.5,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('2악장 Andante con moto'));
    await tester.pumpAndSettle();
    expect(
      player.playbackState.currentItem?.trackId,
      'track.beethoven5.kleiber.2',
    );
    expect(player.playbackState.queue, hasLength(3));
  });

  testWidgets('최근 감상이 비어 있으면 한국어 안내를 표시한다', (tester) async {
    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        playbackController: FakeLocalPlayer(),
        playbackHistoryStore: MemoryPlaybackHistoryStore(),
        scanRepository: ScannedAudioRepository(MemoryScannedAudioStore()),
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await _scrollToRecentListening(tester);
    expect(find.text('최근 감상'), findsOneWidget);
    expect(find.text('아직 감상 기록이 없습니다.'), findsOneWidget);
  });

  testWidgets('최근 감상 기록을 확인 후 개별 삭제할 수 있다', (tester) async {
    final track = sampleClassicalLibrary.tracks.first;
    final file = const LocalAudioFile(
      id: 'history-file',
      path: '/music/history.flac',
      format: 'FLAC',
    );
    final historyStore = MemoryPlaybackHistoryStore([
      _playbackHistoryFor(track, file),
    ]);
    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        playbackController: FakeLocalPlayer(),
        playbackHistoryStore: historyStore,
        scanRepository: ScannedAudioRepository(MemoryScannedAudioStore()),
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await _scrollToRecentListening(tester);
    await tester.tap(find.byTooltip('감상 기록 삭제'));
    await tester.pumpAndSettle();
    expect(find.text('감상 기록 삭제'), findsOneWidget);
    await tester.tap(find.text('삭제'));
    await tester.pumpAndSettle();

    expect(find.text('아직 감상 기록이 없습니다.'), findsOneWidget);
    expect(await historyStore.loadRecent(), isEmpty);
  });

  testWidgets('최근 감상 전체 삭제는 확인을 요구하고 재생 위치와 분리된다', (tester) async {
    final track = sampleClassicalLibrary.tracks.first;
    final historyStore = MemoryPlaybackHistoryStore([
      _playbackHistoryFor(
        track,
        const LocalAudioFile(
          id: 'history-file',
          path: '/music/history.flac',
          format: 'FLAC',
        ),
      ),
    ]);
    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        playbackController: FakeLocalPlayer(),
        playbackHistoryStore: historyStore,
        scanRepository: ScannedAudioRepository(MemoryScannedAudioStore()),
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await _scrollToRecentListening(tester);
    await tester.tap(find.byTooltip('감상 기록 관리'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('전체 삭제'));
    await tester.pumpAndSettle();
    expect(find.text('감상 기록 전체 삭제'), findsOneWidget);
    expect(find.textContaining('재생 위치는 유지됩니다.'), findsOneWidget);
    await tester.tap(find.text('전체 삭제'));
    await tester.pumpAndSettle();

    expect(await historyStore.loadRecent(), isEmpty);
  });

  testWidgets('감상 보관 기간 변경은 확인 후 저장한다', (tester) async {
    final preferences = MemoryPlaybackHistoryPreferencesStore();
    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        playbackController: FakeLocalPlayer(),
        playbackHistoryPreferencesStore: preferences,
        scanRepository: ScannedAudioRepository(MemoryScannedAudioStore()),
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await _scrollToRecentListening(tester);
    await tester.tap(find.byTooltip('감상 기록 관리'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('최근 30일'));
    await tester.pumpAndSettle();
    expect(find.text('보관 기간 변경'), findsOneWidget);
    await tester.tap(find.text('변경'));
    await tester.pumpAndSettle();

    expect(
      await preferences.loadRetentionPolicy(),
      PlaybackHistoryRetentionPolicy.days30,
    );
  });

  testWidgets('활성 감상은 이력 전체 삭제 전에 일시정지하고 마감한다', (tester) async {
    final player = FakeLocalPlayer();
    final historyStore = MemoryPlaybackHistoryStore();
    final fixture = _linkedPlaybackFixture();
    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        playbackController: player,
        playbackHistoryStore: historyStore,
        scanRepository: ScannedAudioRepository(
          MemoryScannedAudioStore(fixture.files),
        ),
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(fixture.links),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await _scrollToPlaybackControls(tester);
    await tester.tap(find.byTooltip('재생'));
    await tester.pumpAndSettle();
    expect(player.state, LocalPlayerState.playing);

    await _scrollToRecentListening(tester);
    await tester.tap(find.byTooltip('감상 기록 관리'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('전체 삭제'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('전체 삭제'));
    await tester.pumpAndSettle();

    expect(player.state, LocalPlayerState.paused);
    expect(await historyStore.loadRecent(), isEmpty);
  });

  testWidgets('감상 통계는 작품과 녹음 집계를 기간별로 보여준다', (tester) async {
    final recording = sampleClassicalLibrary.recordings.first;
    final tracks = sampleClassicalLibrary.tracksForRecording(recording.id);
    final historyStore = MemoryPlaybackHistoryStore([
      _playbackHistoryFor(
        tracks.first,
        const LocalAudioFile(
          id: 'history-file-1',
          path: '/music/history-1.flac',
          format: 'FLAC',
        ),
      ),
      _playbackHistoryFor(
        tracks[1],
        const LocalAudioFile(
          id: 'history-file-2',
          path: '/music/history-2.flac',
          format: 'FLAC',
        ),
      ),
    ]);
    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        playbackController: FakeLocalPlayer(),
        playbackHistoryStore: historyStore,
        scanRepository: ScannedAudioRepository(MemoryScannedAudioStore()),
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await _showHomeView(tester, '감상');
    await tester.scrollUntilVisible(
      find.text('감상 통계'),
      450,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    expect(find.text('감상 통계'), findsOneWidget);
    expect(find.text('감상 시간 04:00 · 완료 0회 · 트랙 2개'), findsOneWidget);
    expect(find.text('많이 들은 작품'), findsOneWidget);
    expect(find.text('많이 들은 녹음'), findsOneWidget);

    await tester.tap(find.text('30일'));
    await tester.pumpAndSettle();
    expect(find.text('감상 시간 04:00 · 완료 0회 · 트랙 2개'), findsOneWidget);
  });

  testWidgets('최근 악장에서 이어 듣기를 누르면 남은 악장 큐를 재생한다', (tester) async {
    final player = FakeLocalPlayer();
    final recording = sampleClassicalLibrary.recordings.first;
    final tracks = sampleClassicalLibrary.tracksForRecording(recording.id);
    final files = [
      for (final track in tracks)
        LocalAudioFile(
          id: 'file-${track.id}',
          path: '/music/${track.id}.flac',
          format: 'FLAC',
        ),
    ];
    final links = [
      for (var index = 0; index < tracks.length; index += 1)
        AudioFileTrackLink(
          fileId: files[index].id,
          trackId: tracks[index].id,
          linkedAtMillis: 1,
        ),
    ];
    final history = _playbackHistoryFor(tracks[1], files[1]);

    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        playbackController: player,
        playbackHistoryStore: MemoryPlaybackHistoryStore([history]),
        scanRepository: ScannedAudioRepository(MemoryScannedAudioStore(files)),
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(links),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await _scrollToRecentListening(tester);
    expect(find.text(history.trackTitle), findsOneWidget);
    expect(find.byTooltip('이어 듣기'), findsOneWidget);
    await tester.tap(find.byTooltip('이어 듣기'));
    await tester.pumpAndSettle();

    expect(player.state, LocalPlayerState.playing);
    expect(
      player.queue.map((item) => item.trackId),
      tracks.skip(1).map((track) => track.id),
    );
    await _scrollBackToQueue(tester);
    expect(find.text('3개 트랙'), findsOneWidget);
  });

  testWidgets('남은 악장 파일 연결이 없으면 이어 듣기 사유를 표시한다', (tester) async {
    final recording = sampleClassicalLibrary.recordings.first;
    final tracks = sampleClassicalLibrary.tracksForRecording(recording.id);
    final file = LocalAudioFile(
      id: 'file-${tracks.first.id}',
      path: '/music/${tracks.first.id}.flac',
      format: 'FLAC',
    );

    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        playbackController: FakeLocalPlayer(),
        playbackHistoryStore: MemoryPlaybackHistoryStore([
          _playbackHistoryFor(tracks.first, file),
        ]),
        scanRepository: ScannedAudioRepository(MemoryScannedAudioStore([file])),
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore([
            AudioFileTrackLink(
              fileId: file.id,
              trackId: tracks.first.id,
              linkedAtMillis: 1,
            ),
          ]),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await _scrollToRecentListening(tester);
    expect(find.textContaining('남은 악장의 로컬 파일 연결이 필요합니다.'), findsOneWidget);
    expect(find.byTooltip('남은 악장의 로컬 파일 연결이 필요합니다.'), findsOneWidget);
    final disabledButton = find.ancestor(
      of: find.byTooltip('남은 악장의 로컬 파일 연결이 필요합니다.'),
      matching: find.byType(IconButton),
    );
    expect(tester.widget<IconButton>(disabledButton).onPressed, isNull);
  });

  testWidgets('재생 진단은 synthetic 결과와 청감 선택만 표시한다', (tester) async {
    final historyStore = MemoryPlaybackHistoryStore();
    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        playbackController: FakeLocalPlayer(),
        playbackHistoryStore: historyStore,
        playbackDiagnosticRunner: _FixedPlaybackDiagnosticRunner(),
        scanRepository: ScannedAudioRepository(MemoryScannedAudioStore()),
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('도구 더보기'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('재생 진단').last);
    await tester.pumpAndSettle();

    expect(find.text('재생 진단'), findsOneWidget);
    expect(find.textContaining('개인 음악 파일, 감상 이력'), findsOneWidget);
    expect(find.text('소리가 들림'), findsOneWidget);
    expect(find.text('무음 또는 이상'), findsOneWidget);
    expect(find.text('확인하지 않음'), findsOneWidget);

    await tester.tap(find.text('진단 실행'));
    await tester.pumpAndSettle();

    expect(find.text('자동 확인 통과'), findsOneWidget);
    expect(find.text('WAV synthetic fixture'), findsOneWidget);
    expect(find.text('AAC-in-M4A synthetic fixture'), findsOneWidget);
    expect(
      find.textContaining('개인 파일·감상 이력·기기 식별자·네트워크 전송 없음'),
      findsOneWidget,
    );
    expect(await historyStore.loadRecent(), isEmpty);
    expect((await historyStore.loadStatistics()).sessionCount, 0);
  });

  testWidgets('재생 위치 event는 이력 목록과 통계를 다시 조회하지 않는다', (tester) async {
    final historyStore = _CountingPlaybackHistoryStore();
    final player = FakeLocalPlayer(
      trackDurations: const {'event-track': Duration(minutes: 3)},
    );
    await tester.pumpWidget(
      ClassicalLocalLibraryApp(
        playbackController: player,
        playbackHistoryStore: historyStore,
        scanRepository: ScannedAudioRepository(MemoryScannedAudioStore()),
        scanLocationRepository: ScanLocationRepository(
          MemoryScanLocationStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
        fileTrackLinkRepository: AudioFileTrackLinkRepository(
          MemoryAudioFileTrackLinkStore(),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await player.loadQueue(const [
      LocalPlaybackQueueItem(
        trackId: 'event-track',
        recordingId: 'event-recording',
        workId: 'event-work',
        displayTitle: 'event-track',
        path: '/synthetic/event-track.wav',
        usesLinkedFile: true,
        workTitle: 'event-work',
        recordingTitle: 'event-recording',
      ),
    ]);
    await player.play();
    await tester.pumpAndSettle();
    final recentLoads = historyStore.recentLoadCount;
    final statisticsLoads = historyStore.statisticsLoadCount;

    for (var index = 1; index <= 20; index += 1) {
      await player.updatePosition(Duration(milliseconds: index * 100));
    }
    await tester.pumpAndSettle();

    expect(historyStore.recentLoadCount, recentLoads);
    expect(historyStore.statisticsLoadCount, statisticsLoads);
  });
}

class _CountingPlaybackHistoryStore extends MemoryPlaybackHistoryStore {
  int recentLoadCount = 0;
  int statisticsLoadCount = 0;

  @override
  Future<List<PlaybackHistoryEntry>> loadRecent({int limit = 10}) {
    recentLoadCount += 1;
    return super.loadRecent(limit: limit);
  }

  @override
  Future<PlaybackHistoryStatistics> loadStatistics({
    int? sinceMillis,
    int limit = 5,
  }) {
    statisticsLoadCount += 1;
    return super.loadStatistics(sinceMillis: sinceMillis, limit: limit);
  }
}

class _FixedPlaybackDiagnosticRunner implements PlaybackDiagnosticRunner {
  @override
  Future<PlaybackDiagnosticReport> run() async =>
      const PlaybackDiagnosticReport([
        PlaybackDiagnosticFixtureResult.success(
          fixture: PlaybackDiagnosticFixture.wav,
        ),
        PlaybackDiagnosticFixtureResult.success(
          fixture: PlaybackDiagnosticFixture.aacM4a,
        ),
      ]);
}

class _FixedFolderPicker implements FolderPicker {
  const _FixedFolderPicker(this.path);

  final String? path;

  @override
  Future<String?> pickFolder() async => path;
}

class _FixedAudioFilePicker implements AudioFilePicker {
  const _FixedAudioFilePicker(this.files);

  final List<SelectedAudioFile> files;

  @override
  Future<List<SelectedAudioFile>> pickAudioFiles() async => files;
}

class _StubSelectedAudioFile implements SelectedAudioFile {
  const _StubSelectedAudioFile(this.name);

  @override
  final String name;

  @override
  String? get mimeType => null;

  @override
  Future<int> length() async => 0;

  @override
  Stream<List<int>> openRead() => const Stream.empty();
}

class _SequencedImportController implements LocalAudioImportController {
  _SequencedImportController(this.results, {required this.recoverFiles});

  final List<LocalAudioImportBatchResult> results;
  final List<LocalAudioFile> recoverFiles;
  int importCallCount = 0;
  final List<List<String>> selectionNames = [];

  @override
  Future<LocalAudioImportBatchResult> importFiles(
    List<SelectedAudioFile> selections, {
    LocalAudioImportCancellation? cancellation,
    void Function(LocalAudioImportStage stage)? onStage,
    void Function(LocalAudioImportProgress progress)? onProgress,
  }) async {
    selectionNames.add([for (final selection in selections) selection.name]);
    onStage?.call(LocalAudioImportStage.copying);
    onProgress?.call(
      LocalAudioImportProgress(
        stage: LocalAudioImportStage.copying,
        fileIndex: 1,
        fileCount: selections.length,
        bytesCopied: 1,
        totalBytes: 2,
      ),
    );
    onStage?.call(LocalAudioImportStage.analyzing);
    return results[importCallCount++];
  }

  @override
  Future<LocalAudioImportBatchResult> recoverManagedImports() async {
    return LocalAudioImportBatchResult(
      items: const [],
      files: recoverFiles,
      candidates: const [],
    );
  }
}

Future<void> _showHomeView(WidgetTester tester, String label) async {
  if (label == '라이브러리') {
    if (find.byTooltip('뒤로').evaluate().isNotEmpty) {
      await tester.tap(find.byTooltip('뒤로'));
    }
  } else {
    await tester.tap(find.byTooltip('도구 더보기'));
    await tester.pumpAndSettle();
    final menuLabel = switch (label) {
      '관리' => '가져오기·파일 상태',
      '현재 재생' => '재생 계획',
      '감상' => '감상 기록',
      _ => label,
    };
    await tester.tap(find.text(menuLabel).last);
  }
  await tester.pumpAndSettle();
}

Future<void> _scrollToQueue(WidgetTester tester) async {
  await _showHomeView(tester, '현재 재생');
  for (var i = 0; i < 4 && find.text('현재 재생 큐').evaluate().isEmpty; i += 1) {
    await tester.drag(find.byType(ListView), const Offset(0, -500));
    await tester.pumpAndSettle();
  }
}

Future<void> _scrollToPlaybackControls(WidgetTester tester) async {
  await _scrollToQueue(tester);
  await tester.ensureVisible(find.byTooltip('재생'));
  await tester.pumpAndSettle();
}

Future<void> _scrollToRecentListening(WidgetTester tester) async {
  await _showHomeView(tester, '감상');
  await tester.scrollUntilVisible(
    find.text('최근 감상'),
    450,
    scrollable: find.byType(Scrollable).first,
  );
  await tester.pumpAndSettle();
}

Future<void> _scrollBackToQueue(WidgetTester tester) async {
  await _showHomeView(tester, '현재 재생');
  await _scrollToQueue(tester);
  for (var i = 0; i < 4 && find.text('3개 트랙').evaluate().isEmpty; i += 1) {
    await tester.drag(find.byType(ListView), const Offset(0, 450));
    await tester.pumpAndSettle();
  }
}

class _MutableAudioFileScanner implements AudioFileScanner {
  _MutableAudioFileScanner(this.files);

  List<LocalAudioFile> files;
  final List<String> scannedPaths = [];

  @override
  Future<List<LocalAudioFile>> scan(String rootPath) async {
    scannedPaths.add(rootPath);
    return files;
  }
}

class _FailingOnceAudioFileScanner implements AudioFileScanner {
  _FailingOnceAudioFileScanner(this.files);

  final List<LocalAudioFile> files;
  int scanCount = 0;

  @override
  Future<List<LocalAudioFile>> scan(String rootPath) async {
    scanCount += 1;
    if (scanCount == 1) {
      throw StateError('injected native error at /Users/private/Music');
    }
    return files;
  }
}

class _FailingOnceScannedAudioStore implements ScannedAudioStore {
  int loadCount = 0;

  @override
  Future<List<LocalAudioFile>> load() async {
    loadCount += 1;
    if (loadCount == 1) {
      throw StateError('injected native error at /Users/private/library.db');
    }
    return const [];
  }

  @override
  Future<void> save(List<LocalAudioFile> files) async {}
}

LocalAudioFile _audioFile(String path) {
  return LocalAudioFile(
    id: scannedAudioId(path),
    path: path,
    fileName: fileNameForPath(path),
    format: 'FLAC',
    sizeBytes: 1024,
    modifiedAtMillis: 1791870000000,
    importStatus: AudioImportStatus.needsReview,
    sourceReferences: const [SourceReference(kind: SourceKind.localTag)],
  );
}

({List<LocalAudioFile> files, List<AudioFileTrackLink> links})
_linkedPlaybackFixture() {
  final recording = sampleClassicalLibrary.recordings.first;
  final tracks = sampleClassicalLibrary.tracksForRecording(recording.id);
  final files = [
    for (var index = 0; index < tracks.length; index += 1)
      LocalAudioFile(
        id: 'linked-file-$index',
        path: '/music/linked-$index.flac',
        fileName: 'linked-$index.flac',
        format: 'FLAC',
        importStatus: AudioImportStatus.linked,
      ),
  ];
  return (
    files: files,
    links: [
      for (var index = 0; index < tracks.length; index += 1)
        AudioFileTrackLink(
          fileId: files[index].id,
          trackId: tracks[index].id,
          linkedAtMillis: index,
        ),
    ],
  );
}

PlaybackHistoryEntry _playbackHistoryFor(Track track, LocalAudioFile file) {
  final recording = sampleClassicalLibrary.recording(track.recordingId);
  final work = sampleClassicalLibrary.work(recording.workId);
  return PlaybackHistoryEntry(
    sessionId: 'history-${track.id}',
    trackId: track.id,
    recordingId: recording.id,
    workId: work.id,
    path: file.path,
    workTitle: work.title.ko,
    recordingTitle: recording.title.ko,
    trackTitle: '저장된 2악장',
    startedAtMillis: DateTime.utc(2026, 10, 19).millisecondsSinceEpoch,
    lastPlayedAtMillis: DateTime.utc(2026, 10, 19, 1).millisecondsSinceEpoch,
    listenedMillis: const Duration(minutes: 2).inMilliseconds,
    lastPositionMillis: const Duration(minutes: 5).inMilliseconds,
    durationMillis: const Duration(minutes: 10).inMilliseconds,
    status: PlaybackHistoryStatus.partial,
  );
}
