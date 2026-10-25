import 'dart:async';

import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/library_management.dart';
import 'package:classical_local_library/library_deduplication.dart';
import 'package:classical_local_library/local_audio_import.dart';
import 'package:classical_local_library/local_audio_export.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/metadata_overrides.dart';
import 'package:classical_local_library/musicbrainz.dart';
import 'package:classical_local_library/sample_classical_library.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('개별 파일을 검색 가능한 트랙 선택기로 연결한다', (tester) async {
    final fixture = _Fixture(files: [_file('review')]);
    await tester.pumpWidget(fixture.app());

    await tester.tap(find.byTooltip('트랙 연결'));
    await tester.pumpAndSettle();
    expect(find.text('작품·녹음·악장 선택'), findsOneWidget);

    expect(find.byType(TextField), findsOneWidget);
    await tester.tap(find.byType(RadioListTile<Track>).first);
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, '선택'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, '연결'));
    await tester.pumpAndSettle();

    expect((await fixture.linkStore.load()).single.fileId, 'review');
    expect(
      (await fixture.fileStore.load()).single.importStatus,
      AudioImportStatus.linked,
    );
    expect(
      (await fixture.candidateStore.load()).single.reviewStatus,
      MetadataReviewStatus.approved,
    );
  });

  testWidgets('이미 연결된 트랙 교체 시 기존 파일 상태도 정리한다', (tester) async {
    final previous = _file('previous')
        .copyWith(importStatus: AudioImportStatus.linked);
    final replacement = _file('replacement');
    final fixture = _Fixture(
      files: [previous, replacement],
      links: const [
        AudioFileTrackLink(
          fileId: 'previous',
          trackId: 'track.beethoven5.kleiber.1',
          linkedAtMillis: 1,
        ),
      ],
    );
    await tester.pumpWidget(fixture.app());

    await tester.tap(find.byTooltip('트랙 연결'));
    await tester.pumpAndSettle();
    await tester.tap(find.byType(RadioListTile<Track>).first);
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, '선택'));
    await tester.pumpAndSettle();
    expect(find.textContaining('다른 파일은 정리 필요 상태'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, '연결'));
    await tester.pumpAndSettle();

    final links = await fixture.linkStore.load();
    final files = await fixture.fileStore.load();
    expect(links.single.fileId, 'replacement');
    expect(
      files.singleWhere((file) => file.id == 'previous').importStatus,
      AudioImportStatus.needsReview,
    );
    expect(
      files.singleWhere((file) => file.id == 'replacement').importStatus,
      AudioImportStatus.linked,
    );
  });

  testWidgets('자동 후보를 거절하면 파일을 미분류 상태로 둔다', (tester) async {
    final fixture = _Fixture(files: [_file('review')]);
    await tester.pumpWidget(fixture.app());

    await tester.tap(find.byTooltip('후보 거절'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, '거절'));
    await tester.pumpAndSettle();

    expect(
      (await fixture.candidateStore.load()).single.reviewStatus,
      MetadataReviewStatus.rejected,
    );
    expect(
      (await fixture.fileStore.load()).single.importStatus,
      AudioImportStatus.scanned,
    );
  });

  testWidgets('연결된 파일의 연결을 해제한다', (tester) async {
    final linked = _file('linked')
        .copyWith(importStatus: AudioImportStatus.linked);
    final fixture = _Fixture(
      files: [linked],
      links: const [
        AudioFileTrackLink(
          fileId: 'linked',
          trackId: 'track.moonlight.brendel.1',
          linkedAtMillis: 1,
        ),
      ],
    );
    await tester.pumpWidget(fixture.app());

    await tester.tap(find.text('연결됨'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('연결 해제'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, '해제'));
    await tester.pumpAndSettle();

    expect(await fixture.linkStore.load(), isEmpty);
    expect(
      (await fixture.fileStore.load()).single.importStatus,
      AudioImportStatus.needsReview,
    );
  });

  testWidgets('누락 파일을 새 경로에 재연결하면서 기존 ID를 유지한다', (tester) async {
    final missing = _file('missing').copyWith(
      path: '/Music/missing.flac',
      fileName: 'missing.flac',
      availability: AudioFileAvailability.missing,
      importStatus: AudioImportStatus.linked,
    );
    final replacement = _file('replacement')
        .copyWith(path: '/Music/found.flac', fileName: 'found.flac');
    final fixture = _Fixture(
      files: [missing, replacement],
      links: const [
        AudioFileTrackLink(
          fileId: 'missing',
          trackId: 'track.moonlight.brendel.1',
          linkedAtMillis: 1,
        ),
      ],
    );
    await tester.pumpWidget(fixture.app());

    await tester.tap(find.text('누락됨'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('대체 파일 선택'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('found.flac'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, '재연결'));
    await tester.pumpAndSettle();

    final files = await fixture.fileStore.load();
    expect(files, hasLength(1));
    expect(files.single.id, 'missing');
    expect(files.single.path, '/Music/found.flac');
    expect(files.single.availability, AudioFileAvailability.present);
    expect((await fixture.linkStore.load()).single.fileId, 'missing');
  });

  testWidgets('재연결 확인은 320px와 200% 글자에서 근거와 취소 경로를 유지한다', (tester) async {
    tester.view.physicalSize = const Size(320, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    final missing = _file('missing')
        .copyWith(availability: AudioFileAvailability.missing);
    final fixture = _Fixture(files: [missing, _file('replacement')]);
    await tester.pumpWidget(fixture.app());

    await tester.tap(find.text('누락됨'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('대체 파일 선택'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('replacement.flac'));
    await tester.pumpAndSettle();
    tester.platformDispatcher.textScaleFactorTestValue = 2;
    await tester.pump();

    expect(find.textContaining('일치도'), findsOneWidget);
    expect(find.text('취소'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.ensureVisible(find.widgetWithText(TextButton, '취소'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(TextButton, '취소'));
    await tester.pumpAndSettle();
    expect((await fixture.fileStore.load()), hasLength(2));
  });

  testWidgets('새 파일 재연결을 취소하면 방금 만든 관리 복사본을 정리한다', (tester) async {
    final missing = _file('missing')
        .copyWith(availability: AudioFileAvailability.missing);
    final replacement = _file('replacement')
        .copyWith(path: '/managed/replacement.flac');
    final manager = _FakeManagedAudioLibrary();
    final fixture = _Fixture(
      files: [missing],
      manager: manager,
      audioFilePicker: const _SingleAudioFilePicker(),
      importController: _RelinkImportController(
        files: [missing, replacement],
        replacement: replacement,
      ),
    );
    await tester.pumpWidget(fixture.app());

    await tester.tap(find.text('누락됨'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('대체 파일 선택'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('새 음원 파일 가져오기'));
    await tester.pumpAndSettle();
    expect(find.textContaining('일치도'), findsOneWidget);
    await tester.tap(find.widgetWithText(TextButton, '취소'));
    await tester.pumpAndSettle();

    expect(manager.deletedFileIds, ['replacement']);
    expect((await fixture.fileStore.load()).single.id, 'missing');
  });

  testWidgets('앱 관리 음원 사용량을 표시하고 확인 후 복사본을 삭제한다', (tester) async {
    final manager = _FakeManagedAudioLibrary();
    final managed = _file('managed').copyWith(
      sourceReferences: const [
        SourceReference(kind: SourceKind.localImport, externalId: 'import-1'),
      ],
    );
    final fixture = _Fixture(files: [managed], manager: manager);
    await tester.pumpWidget(fixture.app());
    await tester.pumpAndSettle();

    expect(find.text('앱 관리 음원 1개 · 1.0 KB'), findsOneWidget);
    await tester.tap(find.byTooltip('앱 관리 복사본 삭제'));
    await tester.pumpAndSettle();
    expect(find.textContaining('선택 당시 원본 파일'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, '삭제'));
    await tester.pumpAndSettle();

    expect(manager.deletedFileIds, ['managed']);
    expect(find.text('managed.flac'), findsNothing);
    expect(find.text('앱 관리 음원 0개 · 0 B'), findsOneWidget);
  });

  testWidgets('앱 관리 복사본만 주입된 내보내기 어댑터로 전달한다', (tester) async {
    final manager = _FakeManagedAudioLibrary();
    final exporter = _FakeManagedAudioExporter();
    final managed = _file('managed').copyWith(
      sourceReferences: const [
        SourceReference(kind: SourceKind.localImport, externalId: 'import-1'),
      ],
    );
    final fixture = _Fixture(
      files: [managed, _file('external')],
      manager: manager,
      exporter: exporter,
    );
    await tester.pumpWidget(fixture.app());
    await tester.pumpAndSettle();

    expect(find.byTooltip('앱 관리 복사본 내보내기'), findsOneWidget);
    await tester.tap(find.byTooltip('앱 관리 복사본 내보내기'));
    await tester.pumpAndSettle();

    expect(exporter.files.single.path, '/managed/managed.flac');
    expect(find.text('음원을 내보냈습니다.'), findsOneWidget);
    expect(find.textContaining('/managed/'), findsNothing);
  });

  testWidgets('좁은 화면에서도 관리 작업 버튼이 넘치지 않는다', (tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final managed = _file('managed').copyWith(
      sourceReferences: const [
        SourceReference(kind: SourceKind.localImport, externalId: 'import-1'),
      ],
    );
    await tester.pumpWidget(
      _Fixture(
        files: [managed],
        manager: _FakeManagedAudioLibrary(),
        exporter: _FakeManagedAudioExporter(),
        enableMetadata: true,
      ).app(),
    );
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.byTooltip('파일 작업'), findsOneWidget);
  });

  testWidgets('필드별 사용자 교정을 저장하고 출처를 표시한다', (tester) async {
    final fixture = _Fixture(files: [_file('review')], enableMetadata: true);
    await tester.pumpWidget(fixture.app());

    await tester.tap(find.byTooltip('파일 작업'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('내부 메타데이터 편집'));
    await tester.pumpAndSettle();
    final composerField = find.byWidgetPredicate(
      (widget) => widget is TextField && widget.decoration?.labelText == '작곡가',
    );
    await tester.enterText(composerField, '루트비히 판 베토벤');
    await tester.tap(find.widgetWithText(FilledButton, '저장'));
    await tester.pumpAndSettle();

    final override = (await fixture.overrideStore.load()).single;
    expect(override.text(MetadataField.composer), '루트비히 판 베토벤');
    expect(override.source(MetadataField.composer), MetadataValueSource.user);
    expect(find.textContaining('사용자 교정'), findsOneWidget);
  });

  testWidgets('저장 실패는 draft를 보존하고 재시도 중 중복·닫기를 막는다', (tester) async {
    final store = _ControlledOverrideStore();
    final fixture = _Fixture(
      files: [_file('review')],
      enableMetadata: true,
      overrideStore: store,
    );
    await tester.pumpWidget(fixture.app());
    await tester.tap(find.byTooltip('파일 작업'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('내부 메타데이터 편집'));
    await tester.pumpAndSettle();
    final field = find.byWidgetPredicate(
      (w) => w is TextField && w.decoration?.labelText == '작곡가',
    );
    await tester.enterText(field, '긴 한국어 작곡가 이름 · Johann Sebastian Bach');
    await tester.tap(find.widgetWithText(FilledButton, '저장'));
    await tester.pumpAndSettle();
    expect(find.textContaining('입력은 유지됩니다'), findsOneWidget);
    expect(find.text('메타데이터 교정을 저장했습니다.'), findsNothing);
    expect(
      (tester.widget<TextField>(field)).controller!.text,
      contains('Bach'),
    );
    expect(await store.load(), isEmpty);
    store.fail = false;
    store.gate = Completer<void>();
    await tester.tap(find.widgetWithText(FilledButton, '저장'));
    await tester.pump();
    expect(store.calls, 2);
    expect(tester.widget<TextField>(field).readOnly, isTrue);
    final button = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, '저장 · 처리 중'),
    );
    expect(button.onPressed, isNull);
    await tester.binding.handlePopRoute();
    await tester.pump();
    expect(find.byType(AlertDialog), findsOneWidget);
    store.gate!.complete();
    await tester.pumpAndSettle();
    expect(store.calls, 2);
    expect(find.byType(AlertDialog), findsNothing);
    expect(
      (await store.load()).single.text(MetadataField.composer),
      contains('Bach'),
    );
    expect(find.text('메타데이터 교정을 저장했습니다.'), findsOneWidget);
    expect(find.byTooltip('파일 작업'), findsOneWidget);
  });

  testWidgets('편집 취소는 저장소를 변경하지 않는다', (tester) async {
    final store = _ControlledOverrideStore();
    await tester.pumpWidget(
      _Fixture(
        files: [_file('review')],
        enableMetadata: true,
        overrideStore: store,
      ).app(),
    );
    await tester.tap(find.byTooltip('파일 작업'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('내부 메타데이터 편집'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, '취소할 입력');
    await tester.tap(find.text('취소'));
    await tester.pumpAndSettle();
    expect(store.calls, 0);
    expect(await store.load(), isEmpty);
    expect(find.byType(AlertDialog), findsNothing);
  });

  testWidgets('MusicBrainz 후보에서 선택한 필드를 승인한다', (tester) async {
    final fixture = _Fixture(
      files: [_file('review')],
      enableMetadata: true,
      musicBrainzClient: const _FakeMusicBrainzClient(),
    );
    await tester.pumpWidget(fixture.app());

    await tester.tap(find.byTooltip('파일 작업'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('MusicBrainz 후보 찾기'));
    await tester.pumpAndSettle();
    expect(await fixture.overrideStore.load(), isEmpty);
    await tester.tap(find.byType(SimpleDialogOption).first);
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(CheckboxListTile, '작품명'));
    await tester.tap(find.widgetWithText(CheckboxListTile, '악장명'));
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, '승인'));
    await tester.pumpAndSettle();

    final override = (await fixture.overrideStore.load()).single;
    expect(override.musicBrainzRecordingId, 'recording-mbid');
    expect(override.text(MetadataField.composer), 'Ludwig van Beethoven');
    expect(override.value(MetadataField.workTitle), isNull);
    expect(override.value(MetadataField.movementTitle), isNull);
    expect(
      override.source(MetadataField.composer),
      MetadataValueSource.musicBrainz,
    );
  });

  testWidgets('좁은 화면에서 대표 항목을 고른 뒤 중복 병합을 확인한다', (tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final mergeStore = MemoryLibraryMergeStore();
    final duplicate = Work(
      id: 'work.duplicate',
      composerId: beethovenSymphony5.composerId,
      title: beethovenSymphony5.title,
      catalogNumber: beethovenSymphony5.catalogNumber,
    );
    final library = ClassicalLibrary(
      people: sampleClassicalLibrary.people,
      instruments: sampleClassicalLibrary.instruments,
      ensembles: sampleClassicalLibrary.ensembles,
      works: [...sampleClassicalLibrary.works, duplicate],
      workParts: sampleClassicalLibrary.workParts,
      albums: sampleClassicalLibrary.albums,
      recordings: sampleClassicalLibrary.recordings,
      tracks: sampleClassicalLibrary.tracks,
      files: sampleClassicalLibrary.files,
    );
    await tester.pumpWidget(
      _Fixture(
        files: [_file('review')],
        library: library,
        mergeRepository: LibraryMergeRepository(mergeStore),
      ).app(),
    );

    await tester.tap(find.byTooltip('중복 작품·녹음 검토'));
    await tester.pumpAndSettle();
    await tester.tap(find.byType(SimpleDialogOption).first);
    await tester.pumpAndSettle();
    expect(find.text('대표 항목 선택'), findsOneWidget);
    await tester.tap(find.byType(SimpleDialogOption).first);
    await tester.pumpAndSettle();
    expect(find.text('중복 병합 확인'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.tap(find.widgetWithText(FilledButton, '병합'));
    await tester.pumpAndSettle();

    expect(await mergeStore.load(), hasLength(1));
  });

  testWidgets('병합 기록에서 활성 병합을 확인하고 되돌린다', (tester) async {
    const merge = LibraryEntityMerge(
      id: 'merge-1',
      entityType: LibraryEntityType.work,
      sourceId: 'work.source',
      targetId: 'work.target',
      sourceLabel: '중복 작품',
      targetLabel: '대표 작품',
      mergedAtMillis: 1,
      evidence: ['작품 번호 일치'],
    );
    final store = MemoryLibraryMergeStore([merge]);
    await tester.pumpWidget(
      _Fixture(
        files: [_file('review')],
        merges: const [merge],
        mergeRepository: LibraryMergeRepository(
          store,
          clock: () => DateTime.fromMillisecondsSinceEpoch(2),
        ),
      ).app(),
    );

    await tester.tap(find.byTooltip('병합 기록'));
    await tester.pumpAndSettle();
    expect(find.textContaining('적용 중'), findsOneWidget);
    await tester.tap(find.byType(SimpleDialogOption));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, '되돌리기'));
    await tester.pumpAndSettle();

    expect((await store.load()).single.isActive, isFalse);
    expect(find.text('병합을 되돌렸습니다.'), findsOneWidget);
  });
}

class _Fixture {
  _Fixture({
    required List<LocalAudioFile> files,
    this.links = const [],
    this.manager,
    this.exporter,
    this.enableMetadata = false,
    this.musicBrainzClient,
    this.library,
    this.mergeRepository,
    this.merges = const [],
    this.audioFilePicker,
    this.importController,
    MetadataOverrideStore? overrideStore,
  }) : overrideStore = overrideStore ?? MemoryMetadataOverrideStore(),
       initialFiles = [...files],
       initialCandidates = [
         for (final file in files)
           MetadataCandidate(
             fileId: file.id,
             filePath: file.path,
             fileName: file.fileName ?? file.path,
             composerText: 'Beethoven',
             workTitleText: 'Moonlight Sonata',
             movementText: 'Allegro',
             trackNumber: 2,
             confidence: 1,
           ),
       ],
       fileStore = MemoryScannedAudioStore(files),
       candidateStore = MemoryMetadataCandidateStore([
         for (final file in files)
           MetadataCandidate(
             fileId: file.id,
             filePath: file.path,
             fileName: file.fileName ?? file.path,
             composerText: 'Beethoven',
             workTitleText: 'Moonlight Sonata',
             movementText: 'Allegro',
             trackNumber: 2,
             confidence: 1,
           ),
       ]),
       linkStore = MemoryAudioFileTrackLinkStore(links);

  final List<LocalAudioFile> initialFiles;
  final List<MetadataCandidate> initialCandidates;
  final MemoryScannedAudioStore fileStore;
  final MemoryMetadataCandidateStore candidateStore;
  final MemoryAudioFileTrackLinkStore linkStore;
  final List<AudioFileTrackLink> links;
  final ManagedAudioLibrary? manager;
  final ManagedAudioExporter? exporter;
  final bool enableMetadata;
  final MusicBrainzClient? musicBrainzClient;
  final ClassicalLibrary? library;
  final LibraryMergeRepository? mergeRepository;
  final List<LibraryEntityMerge> merges;
  final AudioFilePicker? audioFilePicker;
  final LocalAudioImportController? importController;
  final MetadataOverrideStore overrideStore;

  Widget app() {
    return MaterialApp(
      home: LibraryManagementScreen(
        library: library ?? sampleClassicalLibrary,
        files: initialFiles,
        candidates: initialCandidates,
        links: links,
        merges: merges,
        scannedAudioRepository: ScannedAudioRepository(fileStore),
        metadataCandidateRepository: MetadataCandidateRepository(
          candidateStore,
        ),
        linkRepository: AudioFileTrackLinkRepository(linkStore),
        metadataOverrideRepository: enableMetadata
            ? MetadataOverrideRepository(overrideStore)
            : null,
        musicBrainzClient: musicBrainzClient,
        libraryMergeRepository: mergeRepository,
        managedAudioLibrary: manager,
        managedAudioExporter: exporter,
        audioFilePicker: audioFilePicker,
        localAudioImportController: importController,
      ),
    );
  }
}

class _ControlledOverrideStore extends MemoryMetadataOverrideStore {
  bool fail = true;
  int calls = 0;
  Completer<void>? gate;
  @override
  Future<void> upsert(MetadataOverride value) async {
    calls++;
    if (fail) throw StateError('test storage failure');
    if (gate != null) await gate!.future;
    await super.upsert(value);
  }
}

class _SingleAudioFilePicker implements AudioFilePicker {
  const _SingleAudioFilePicker();

  @override
  Future<List<SelectedAudioFile>> pickAudioFiles() async => const [
    _SelectedRelinkFile(),
  ];
}

class _SelectedRelinkFile implements SelectedAudioFile {
  const _SelectedRelinkFile();

  @override
  String get name => 'replacement.flac';

  @override
  String? get mimeType => 'audio/flac';

  @override
  Future<int> length() async => 100;

  @override
  Stream<List<int>> openRead() => Stream.value(const [1]);
}

class _RelinkImportController implements LocalAudioImportController {
  const _RelinkImportController({
    required this.files,
    required this.replacement,
  });

  final List<LocalAudioFile> files;
  final LocalAudioFile replacement;

  @override
  Future<LocalAudioImportBatchResult> importFiles(
    List<SelectedAudioFile> selections, {
    LocalAudioImportCancellation? cancellation,
    void Function(LocalAudioImportStage stage)? onStage,
    void Function(LocalAudioImportProgress progress)? onProgress,
  }) async => LocalAudioImportBatchResult(
    items: [
      LocalAudioImportItemResult(
        outcome: LocalAudioImportOutcome.imported,
        record: LocalAudioImportRecord(
          id: 'import-1',
          sourceKind: 'documentPicker',
          originalFileName: 'replacement.flac',
          localPath: replacement.path,
          sha256: 'sha',
          sizeBytes: 100,
          importedAtMillis: 1,
          status: LocalAudioImportStatus.completed,
          fileId: replacement.id,
        ),
      ),
    ],
    files: files,
    candidates: const [],
  );

  @override
  Future<LocalAudioImportBatchResult> recoverManagedImports() async =>
      LocalAudioImportBatchResult(
        items: const [],
        files: files,
        candidates: const [],
      );
}

class _FakeMusicBrainzClient implements MusicBrainzClient {
  const _FakeMusicBrainzClient();

  @override
  Future<List<MusicBrainzCandidate>> searchRecordings(
    MusicBrainzSearchQuery query,
  ) async {
    return const [
      MusicBrainzCandidate(
        recordingId: 'recording-mbid',
        workId: 'work-mbid',
        releaseId: 'release-mbid',
        title: 'I. Allegro con brio',
        workTitle: 'Symphony No. 5',
        composer: 'Ludwig van Beethoven',
        score: 99,
      ),
    ];
  }
}

class _FakeManagedAudioExporter implements ManagedAudioExporter {
  final List<ManagedAudioExportFile> files = [];

  @override
  Future<ManagedAudioExportResult> export(
    ManagedAudioExportFile file, {
    Rect? sharePositionOrigin,
  }) async {
    files.add(file);
    return const ManagedAudioExportResult(
      outcome: ManagedAudioExportOutcome.success,
      userMessage: '음원을 내보냈습니다.',
    );
  }
}

class _FakeManagedAudioLibrary implements ManagedAudioLibrary {
  final List<String> deletedFileIds = [];
  var summary = const ManagedAudioStorageSummary(
    fileCount: 1,
    totalBytes: 1024,
  );

  @override
  Future<void> deleteByFileId(String fileId) async {
    deletedFileIds.add(fileId);
    summary = const ManagedAudioStorageSummary(fileCount: 0, totalBytes: 0);
  }

  @override
  Future<ManagedAudioExportFile> exportFileFor(String fileId) async {
    return ManagedAudioExportFile(
      path: '/managed/$fileId.flac',
      fileName: '$fileId.flac',
    );
  }

  @override
  Future<ManagedAudioStorageSummary> storageSummary() async => summary;
}

LocalAudioFile _file(String id) {
  return LocalAudioFile(
    id: id,
    path: '/Music/$id.flac',
    fileName: '$id.flac',
    format: 'FLAC',
    sizeBytes: 100,
    modifiedAtMillis: 200,
    importStatus: AudioImportStatus.needsReview,
  );
}
