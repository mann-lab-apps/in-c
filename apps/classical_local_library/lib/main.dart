import 'dart:async';
import 'dart:io';

import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart' as sqflite;

import 'app_settings.dart';
import 'backup_policy.dart';
import 'catalog_registration_screen.dart';
import 'classical_library_models.dart';
import 'file_links.dart';
import 'folder_picker.dart';
import 'imslp.dart';
import 'imslp_download.dart';
import 'imslp_library.dart';
import 'just_audio_playback.dart';
import 'library_search.dart';
import 'library_backup.dart';
import 'library_backup_io.dart';
import 'library_catalog.dart';
import 'library_detail_screen.dart';
import 'library_details.dart';
import 'library_management.dart';
import 'library_deduplication.dart';
import 'library_discovery.dart';
import 'library_discovery_screen.dart';
import 'local_playback.dart';
import 'local_audio_scanner.dart';
import 'local_audio_import.dart';
import 'local_data_control.dart';
import 'local_audio_export.dart';
import 'metadata_candidates.dart';
import 'metadata_overrides.dart';
import 'missing_file_relink.dart';
import 'musicbrainz.dart';
import 'playback_history.dart';
import 'playback_diagnostic.dart';
import 'playback_position.dart';
import 'playback_planner.dart';
import 'presentation/play_library_components.dart';
import 'presentation/play_activity_components.dart';
import 'presentation/play_playback_components.dart';
import 'sample_classical_library.dart';
import 'scan_locations.dart';
import 'scanned_audio_store.dart';
import 'sqlite_database.dart';

part 'presentation/library_home_components.dart';

void main() {
  const enableDemoLibrary = bool.fromEnvironment('ENABLE_DEMO_LIBRARY');
  runApp(
    ClassicalLocalLibraryApp(
      initialLibrary: enableDemoLibrary
          ? sampleClassicalLibrary
          : emptyClassicalLibrary,
      enableDemoFeatures: enableDemoLibrary,
    ),
  );
}

enum _LibraryView { library, playback, management, listening }

enum _HomeToolAction {
  discovery,
  imslp,
  libraryManagement,
  playbackDiagnostic,
  settings,
}

class ClassicalLocalLibraryApp extends StatelessWidget {
  const ClassicalLocalLibraryApp({
    super.key,
    this.scanRepository,
    this.scanLocationRepository,
    this.metadataCandidateRepository,
    this.metadataOverrideRepository,
    this.musicBrainzClient,
    this.libraryMergeRepository,
    this.fileTrackLinkRepository,
    this.folderPicker,
    this.audioFilePicker,
    this.audioFileScanner,
    this.sampleAudioFileScanner,
    this.localAudioImportCoordinator,
    this.managedAudioExporter,
    this.supportsFolderScan,
    this.playbackController,
    this.playbackPositionStore,
    this.playbackQueueSnapshotStore,
    this.playbackHistoryStore,
    this.playbackHistoryPreferencesStore,
    this.playbackDiagnosticRunner,
    this.imslpStore,
    this.imslpCatalogClient,
    this.imslpImportCoordinator,
    this.catalogRepository,
    this.initialLibrary = sampleClassicalLibrary,
    this.enableDemoFeatures = true,
    this.localDataControlService,
    this.libraryBackupService,
    this.libraryBackupTransport,
    this.fontFamily,
  });

  final ScannedAudioRepository? scanRepository;
  final ScanLocationRepository? scanLocationRepository;
  final MetadataCandidateRepository? metadataCandidateRepository;
  final MetadataOverrideRepository? metadataOverrideRepository;
  final MusicBrainzClient? musicBrainzClient;
  final LibraryMergeRepository? libraryMergeRepository;
  final AudioFileTrackLinkRepository? fileTrackLinkRepository;
  final FolderPicker? folderPicker;
  final AudioFilePicker? audioFilePicker;
  final AudioFileScanner? audioFileScanner;
  final AudioFileScanner? sampleAudioFileScanner;
  final LocalAudioImportController? localAudioImportCoordinator;
  final ManagedAudioExporter? managedAudioExporter;
  final bool? supportsFolderScan;
  final LocalPlaybackController? playbackController;
  final PlaybackPositionStore? playbackPositionStore;
  final PlaybackQueueSnapshotStore? playbackQueueSnapshotStore;
  final PlaybackHistoryStore? playbackHistoryStore;
  final PlaybackHistoryPreferencesStore? playbackHistoryPreferencesStore;
  final PlaybackDiagnosticRunner? playbackDiagnosticRunner;
  final ImslpStore? imslpStore;
  final ImslpCatalogClient? imslpCatalogClient;
  final ImslpImportCoordinator? imslpImportCoordinator;
  final ClassicalCatalogRepository? catalogRepository;
  final ClassicalLibrary initialLibrary;
  final bool enableDemoFeatures;
  final LocalDataControlService? localDataControlService;
  final LibraryBackupService? libraryBackupService;
  final LibraryBackupTransport? libraryBackupTransport;
  final String? fontFamily;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '띠로리 플레이',
      debugShowCheckedModeBanner: false,
      theme: ddiroriTheme(fontFamily: fontFamily),
      darkTheme: ddiroriTheme(
        brightness: Brightness.dark,
        fontFamily: fontFamily,
      ),
      themeMode: ThemeMode.system,
      home: LibraryHomeScreen(
        scanRepository: scanRepository,
        scanLocationRepository: scanLocationRepository,
        metadataCandidateRepository: metadataCandidateRepository,
        metadataOverrideRepository: metadataOverrideRepository,
        musicBrainzClient: musicBrainzClient,
        libraryMergeRepository: libraryMergeRepository,
        fileTrackLinkRepository: fileTrackLinkRepository,
        folderPicker: folderPicker,
        audioFilePicker: audioFilePicker,
        audioFileScanner: audioFileScanner,
        sampleAudioFileScanner: sampleAudioFileScanner,
        localAudioImportCoordinator: localAudioImportCoordinator,
        managedAudioExporter: managedAudioExporter,
        supportsFolderScan: supportsFolderScan,
        playbackController: playbackController,
        playbackPositionStore: playbackPositionStore,
        playbackQueueSnapshotStore: playbackQueueSnapshotStore,
        playbackHistoryStore: playbackHistoryStore,
        playbackHistoryPreferencesStore: playbackHistoryPreferencesStore,
        playbackDiagnosticRunner: playbackDiagnosticRunner,
        imslpStore: imslpStore,
        imslpCatalogClient: imslpCatalogClient,
        imslpImportCoordinator: imslpImportCoordinator,
        catalogRepository: catalogRepository,
        initialLibrary: initialLibrary,
        enableDemoFeatures: enableDemoFeatures,
        localDataControlService: localDataControlService,
        libraryBackupService: libraryBackupService,
        libraryBackupTransport: libraryBackupTransport,
      ),
    );
  }
}

class LibraryHomeScreen extends StatefulWidget {
  const LibraryHomeScreen({
    super.key,
    this.scanRepository,
    this.scanLocationRepository,
    this.metadataCandidateRepository,
    this.metadataOverrideRepository,
    this.musicBrainzClient,
    this.libraryMergeRepository,
    this.fileTrackLinkRepository,
    this.folderPicker,
    this.audioFilePicker,
    this.audioFileScanner,
    this.sampleAudioFileScanner,
    this.localAudioImportCoordinator,
    this.managedAudioExporter,
    this.supportsFolderScan,
    this.playbackController,
    this.playbackPositionStore,
    this.playbackQueueSnapshotStore,
    this.playbackHistoryStore,
    this.playbackHistoryPreferencesStore,
    this.playbackDiagnosticRunner,
    this.imslpStore,
    this.imslpCatalogClient,
    this.imslpImportCoordinator,
    this.catalogRepository,
    this.initialLibrary = sampleClassicalLibrary,
    this.enableDemoFeatures = true,
    this.localDataControlService,
    this.libraryBackupService,
    this.libraryBackupTransport,
  });

  final ScannedAudioRepository? scanRepository;
  final ScanLocationRepository? scanLocationRepository;
  final MetadataCandidateRepository? metadataCandidateRepository;
  final MetadataOverrideRepository? metadataOverrideRepository;
  final MusicBrainzClient? musicBrainzClient;
  final LibraryMergeRepository? libraryMergeRepository;
  final AudioFileTrackLinkRepository? fileTrackLinkRepository;
  final FolderPicker? folderPicker;
  final AudioFilePicker? audioFilePicker;
  final AudioFileScanner? audioFileScanner;
  final AudioFileScanner? sampleAudioFileScanner;
  final LocalAudioImportController? localAudioImportCoordinator;
  final ManagedAudioExporter? managedAudioExporter;
  final bool? supportsFolderScan;
  final LocalPlaybackController? playbackController;
  final PlaybackPositionStore? playbackPositionStore;
  final PlaybackQueueSnapshotStore? playbackQueueSnapshotStore;
  final PlaybackHistoryStore? playbackHistoryStore;
  final PlaybackHistoryPreferencesStore? playbackHistoryPreferencesStore;
  final PlaybackDiagnosticRunner? playbackDiagnosticRunner;
  final ImslpStore? imslpStore;
  final ImslpCatalogClient? imslpCatalogClient;
  final ImslpImportCoordinator? imslpImportCoordinator;
  final ClassicalCatalogRepository? catalogRepository;
  final ClassicalLibrary initialLibrary;
  final bool enableDemoFeatures;
  final LocalDataControlService? localDataControlService;
  final LibraryBackupService? libraryBackupService;
  final LibraryBackupTransport? libraryBackupTransport;

  @override
  State<LibraryHomeScreen> createState() => _LibraryHomeScreenState();
}

class _LibraryHomeScreenState extends State<LibraryHomeScreen>
    with WidgetsBindingObserver {
  late ClassicalLibrary library;
  final LibrarySearchService searchService = const LibrarySearchService();
  ClassicalPlaybackPlanner? planner;
  PlaybackPlan? plan;
  PlaybackMode mode = PlaybackMode.workRandom;
  late final LocalPlaybackController localPlayer;
  late final StreamSubscription<LocalPlaybackState> playbackSubscription;
  late final StreamSubscription<PlaybackHistoryEntry>
  playbackHistorySubscription;
  late final PlaybackHistoryRepository playbackHistoryRepository;
  late final PlaybackHistoryPreferencesRepository
  playbackHistoryPreferencesRepository;
  late final PlaybackHistoryCoordinator playbackHistoryCoordinator;
  late final PlaybackQueuePersistenceCoordinator playbackQueueCoordinator;
  LocalPlaybackState playbackState = const LocalPlaybackState.idle();
  ScannedAudioRepository? scanRepository;
  ScanLocationRepository? scanLocationRepository;
  MetadataCandidateRepository? metadataCandidateRepository;
  MetadataOverrideRepository? metadataOverrideRepository;
  LibraryMergeRepository? libraryMergeRepository;
  ClassicalCatalogRepository? catalogRepository;
  AudioFileTrackLinkRepository? fileTrackLinkRepository;
  ImslpStore? imslpStore;
  MusicBrainzClient? musicBrainzClient;
  late final FolderPicker folderPicker;
  late final AudioFilePicker audioFilePicker;
  late final AudioFileScanner audioFileScanner;
  late final AudioFileScanner sampleAudioFileScanner;
  LocalAudioImportController? localAudioImportCoordinator;
  LocalDataControlService? localDataControlService;
  LibraryBackupService? libraryBackupService;
  MissingFileRelinkRepository? missingFileRelinkRepository;
  LocalAudioImportCancellation? localImportCancellation;
  late final bool supportsFolderScan;
  List<LocalAudioFile> scannedFiles = const [];
  List<ScanLocation> scanLocations = const [];
  List<MetadataCandidate> metadataCandidates = const [];
  List<MetadataOverride> metadataOverrides = const [];
  List<LibraryEntityMerge> libraryMerges = const [];
  List<AudioFileTrackLink> fileTrackLinks = const [];
  List<PlaybackHistoryEntry> recentPlaybackHistory = const [];
  PlaybackHistoryRetentionPolicy retentionPolicy =
      PlaybackHistoryRetentionPolicy.keepForever;
  PlaybackHistoryStatistics playbackHistoryStatistics =
      const PlaybackHistoryStatistics.empty();
  ListeningStatisticsPeriod statisticsPeriod = ListeningStatisticsPeriod.all;
  ClassicalQueueMissingPolicy queueMissingPolicy =
      ClassicalQueueMissingPolicy.playAvailable;
  String searchQuery = '';
  Timer? searchDebounce;
  _LibraryView homeView = _LibraryView.library;
  bool onlyRecordedWorks = false;
  bool sortWorksByComposer = false;
  String scanStatus = '스캔 저장소 준비 중';
  bool isScanning = false;
  bool isPickingFolder = false;
  bool isImportingFiles = false;
  bool isPreparingStorage = false;
  bool hasStorageInitializationError = false;
  bool isPlaybackCommandRunning = false;
  bool isLifecycleCommandRunning = false;
  bool isHistoryManagementRunning = false;
  bool isCatalogSaving = false;
  Future<sqflite.Database>? defaultDatabase;
  int historyRefreshVersion = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    library = widget.initialLibrary;
    _rebuildPlaybackPlan();
    folderPicker = widget.folderPicker ?? const PlatformFolderPicker();
    audioFilePicker = widget.audioFilePicker ?? const PlatformAudioFilePicker();
    supportsFolderScan = widget.supportsFolderScan ?? !Platform.isIOS;
    audioFileScanner =
        widget.audioFileScanner ?? const FileSystemAudioFileScanner();
    sampleAudioFileScanner =
        widget.sampleAudioFileScanner ?? const SampleAudioFileScanner();
    const musicBrainzContact = String.fromEnvironment('MUSICBRAINZ_CONTACT');
    musicBrainzClient =
        widget.musicBrainzClient ??
        (musicBrainzContact.isEmpty
            ? null
            : CachingMusicBrainzClient(
                delegate: HttpMusicBrainzClient(contact: musicBrainzContact),
                store: DeferredMusicBrainzCacheStore(() async {
                  final database = await _openDefaultDatabase();
                  return SqliteMusicBrainzCacheStore(database);
                }),
              ));
    final positionStore =
        widget.playbackPositionStore ??
        DeferredPlaybackPositionStore(() async {
          final database = await _openDefaultDatabase();
          return SqlitePlaybackPositionStore(database);
        });
    localPlayer =
        widget.playbackController ??
        SerializedLocalPlaybackController(
          JustAudioLocalPlaybackController(
            positionCoordinator: PlaybackPositionCoordinator(
              store: positionStore,
            ),
          ),
        );
    final queueStore =
        widget.playbackQueueSnapshotStore ??
        (widget.playbackController != null
            ? MemoryPlaybackQueueSnapshotStore()
            : DeferredPlaybackQueueSnapshotStore(() async {
                final database = await _openDefaultDatabase();
                return SqlitePlaybackQueueSnapshotStore(database);
              }));
    playbackQueueCoordinator = PlaybackQueuePersistenceCoordinator(
      store: queueStore,
    );
    final historyStore =
        widget.playbackHistoryStore ??
        (widget.playbackController != null
            ? MemoryPlaybackHistoryStore()
            : DeferredPlaybackHistoryStore(() async {
                final database = await _openDefaultDatabase();
                return SqlitePlaybackHistoryStore(database);
              }));
    playbackHistoryRepository = PlaybackHistoryRepository(historyStore);
    final preferencesStore =
        widget.playbackHistoryPreferencesStore ??
        (widget.playbackController != null
            ? MemoryPlaybackHistoryPreferencesStore()
            : DeferredPlaybackHistoryPreferencesStore(() async {
                final database = await _openDefaultDatabase();
                return SqlitePlaybackHistoryPreferencesStore(database);
              }));
    playbackHistoryPreferencesRepository = PlaybackHistoryPreferencesRepository(
      preferencesStore,
    );
    playbackHistoryCoordinator = PlaybackHistoryCoordinator(
      repository: playbackHistoryRepository,
    );
    playbackState = localPlayer.playbackState;
    playbackSubscription = localPlayer.states.listen((state) {
      unawaited(playbackHistoryCoordinator.observe(state));
      unawaited(playbackQueueCoordinator.observe(state));
      if (!mounted) {
        return;
      }
      setState(() {
        playbackState = state;
      });
    });
    playbackHistorySubscription = playbackHistoryCoordinator.changes.listen((
      _,
    ) {
      unawaited(_refreshPlaybackHistory());
    });
    unawaited(_prepareStorage());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    localImportCancellation?.cancel();
    searchDebounce?.cancel();
    unawaited(playbackSubscription.cancel());
    unawaited(playbackHistorySubscription.cancel());
    unawaited(_disposePlayback());
    super.dispose();
  }

  Future<void> _disposePlayback() async {
    await playbackQueueCoordinator.flush();
    await playbackHistoryCoordinator.dispose();
    await localPlayer.dispose();
    final databaseFuture = defaultDatabase;
    if (databaseFuture == null) return;
    try {
      final database = await databaseFuture;
      if (database.isOpen) await database.close();
    } catch (_) {
      // A failed database initialization leaves no usable resource to close.
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.paused ||
        state == AppLifecycleState.detached ||
        state == AppLifecycleState.hidden) {
      unawaited(_pauseAndPersistForLifecycle());
    }
  }

  Future<void> _pauseAndPersistForLifecycle() async {
    if (isLifecycleCommandRunning) {
      return;
    }
    isLifecycleCommandRunning = true;
    try {
      if (localPlayer.playbackState.playerState == LocalPlayerState.playing) {
        await localPlayer.pause();
      } else {
        await localPlayer.persistPosition();
      }
    } finally {
      isLifecycleCommandRunning = false;
    }
  }

  void _setMode(PlaybackMode nextMode) {
    final activePlanner = planner;
    if (isPlaybackCommandRunning || activePlanner == null) {
      return;
    }
    setState(() {
      mode = nextMode;
      plan = activePlanner.createPlan(mode);
    });
    unawaited(
      _runPlaybackCommand(() async {
        await playbackHistoryCoordinator.closeCurrent();
        await localPlayer.stop();
      }),
    );
  }

  void _rebuildPlaybackPlan() {
    if (library.works.isEmpty ||
        library.recordings.isEmpty ||
        library.tracks.isEmpty) {
      planner = null;
      plan = null;
      return;
    }
    final nextPlanner = ClassicalPlaybackPlanner(
      library: library,
      workSelector: (works) => works.first,
      recordingSelector: (recordings) => recordings.first,
      trackSelector: (tracks) => tracks.first,
    );
    planner = nextPlanner;
    plan = nextPlanner.createPlan(mode);
  }

  void _setSearchQuery(String query) {
    searchDebounce?.cancel();
    searchDebounce = Timer(const Duration(milliseconds: 180), () {
      if (mounted && query != searchQuery) setState(() => searchQuery = query);
    });
  }

  Future<void> _prepareStorage() async {
    if (isPreparingStorage) return;
    setState(() {
      isPreparingStorage = true;
      hasStorageInitializationError = false;
      scanStatus = '보관함을 준비하는 중입니다.';
    });
    try {
      await _loadStorage();
    } catch (_) {
      await _discardDefaultDatabaseAfterFailure();
      if (mounted) {
        setState(() {
          hasStorageInitializationError = true;
          scanStatus = '보관함을 불러오지 못했습니다. 다시 시도해 주세요.';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          isPreparingStorage = false;
        });
      }
    }
  }

  Future<void> _discardDefaultDatabaseAfterFailure() async {
    final databaseFuture = defaultDatabase;
    defaultDatabase = null;
    if (databaseFuture == null) return;
    try {
      final database = await databaseFuture;
      if (database.isOpen) await database.close();
    } catch (_) {
      // A failed open has no database resource to release.
    }
  }

  Future<void> _loadStorage() async {
    final dataControl =
        widget.localDataControlService ??
        (widget.scanRepository == null
            ? await _defaultLocalDataControlService()
            : null);
    await dataControl?.recoverPendingReset();
    final repository = widget.scanRepository ?? await _defaultScanRepository();
    final locationRepository =
        widget.scanLocationRepository ?? await _defaultScanLocationRepository();
    final candidateRepository =
        widget.metadataCandidateRepository ??
        await _defaultMetadataCandidateRepository();
    final overrideRepository =
        widget.metadataOverrideRepository ??
        (widget.scanRepository != null
            ? MetadataOverrideRepository(MemoryMetadataOverrideStore())
            : await _defaultMetadataOverrideRepository());
    final mergeRepository =
        widget.libraryMergeRepository ??
        (widget.scanRepository != null
            ? LibraryMergeRepository(MemoryLibraryMergeStore())
            : await _defaultLibraryMergeRepository());
    final catalog =
        widget.catalogRepository ??
        (widget.scanRepository != null
            ? ClassicalCatalogRepository(
                MemoryClassicalCatalogStore(widget.initialLibrary),
              )
            : await _defaultCatalogRepository());
    final linkRepository =
        widget.fileTrackLinkRepository ??
        await _defaultFileTrackLinkRepository();
    final externalStore =
        widget.imslpStore ??
        (widget.scanRepository != null
            ? MemoryImslpStore()
            : await _defaultImslpStore());
    final importCoordinator =
        widget.localAudioImportCoordinator ??
        (widget.scanRepository == null
            ? await _defaultLocalAudioImportCoordinator(
                repository,
                candidateRepository,
                linkRepository,
              )
            : null);
    final backupService =
        widget.libraryBackupService ??
        (widget.scanRepository == null
            ? LibraryBackupService(database: await _openDefaultDatabase())
            : null);
    final relinkRepository = widget.scanRepository == null
        ? SqliteMissingFileRelinkRepository(
            database: await _openDefaultDatabase(),
          )
        : null;
    var files = await repository.load();
    final locations = await locationRepository.load();
    var candidates = await candidateRepository.load();
    final overrides = await overrideRepository.load();
    final merges = await mergeRepository.load();
    if (importCoordinator != null) {
      final recovered = await importCoordinator.recoverManagedImports();
      files = recovered.files;
      candidates = recovered.candidates;
    }
    if (!widget.enableDemoFeatures) {
      final catalogStore = catalog.store;
      if (catalogStore is SqliteClassicalCatalogStore) {
        await catalogStore.bootstrapLegacyReferences(sampleClassicalLibrary);
      }
    }
    var storedLibrary = await catalog.load(files);
    if (widget.enableDemoFeatures) {
      final baseLibrary = storedLibrary.works.isEmpty
          ? widget.initialLibrary
          : storedLibrary;
      storedLibrary = _libraryWithFiles(
        baseLibrary,
        _uniqueFiles([...widget.initialLibrary.files, ...files]),
      );
    }
    final links = await linkRepository.load();
    final storedRetentionPolicy = await playbackHistoryPreferencesRepository
        .loadRetentionPolicy();
    await const PlaybackHistoryRetentionService().apply(
      repository: playbackHistoryRepository,
      policy: storedRetentionPolicy,
      now: DateTime.now(),
    );
    final history = await playbackHistoryRepository.recent();
    final statistics = await playbackHistoryRepository.statistics(
      sinceMillis: _statisticsSinceMillis(),
    );
    if (!mounted) {
      return;
    }

    setState(() {
      scanRepository = repository;
      scanLocationRepository = locationRepository;
      metadataCandidateRepository = candidateRepository;
      metadataOverrideRepository = overrideRepository;
      libraryMergeRepository = mergeRepository;
      catalogRepository = catalog;
      fileTrackLinkRepository = linkRepository;
      imslpStore = externalStore;
      localAudioImportCoordinator = importCoordinator;
      localDataControlService = dataControl;
      libraryBackupService = backupService;
      missingFileRelinkRepository = relinkRepository;
      scannedFiles = files;
      scanLocations = locations;
      metadataCandidates = candidates;
      metadataOverrides = overrides;
      libraryMerges = merges;
      fileTrackLinks = links;
      recentPlaybackHistory = history;
      retentionPolicy = storedRetentionPolicy;
      playbackHistoryStatistics = statistics;
      library = storedLibrary;
      _rebuildPlaybackPlan();
      scanStatus = files.isEmpty
          ? supportsFolderScan
                ? widget.enableDemoFeatures
                      ? '등록된 폴더를 추가하거나 데모 스캔을 실행하세요.'
                      : '음악 폴더를 추가하거나 음원 파일을 가져오세요.'
                : '음원 파일을 가져와 라이브러리를 시작하세요.'
          : '저장된 스캔 후보 ${files.length}개를 불러왔습니다.';
    });
    await _restorePlaybackQueue();
  }

  Future<void> _restorePlaybackQueue() async {
    final snapshot = await playbackQueueCoordinator.load();
    if (snapshot == null || !mounted) return;
    final currentQueue = _queueForSnapshot(snapshot);
    final recovery = const PlaybackQueueRecovery().recover(
      snapshot: snapshot,
      currentQueue: currentQueue,
    );
    if (recovery.queue.isNotEmpty) {
      await localPlayer.loadQueue(recovery.queue);
    }
    if (!mounted) return;
    setState(() {
      if (recovery.isPartial) {
        scanStatus =
            '이전 재생 큐를 복원하고 누락된 악장 '
            '${recovery.skippedTrackIds.length}개를 제외했습니다.';
      } else if (recovery.isUnavailable) {
        scanStatus = '이전 재생 큐의 로컬 파일을 찾지 못했습니다.';
      }
    });
  }

  List<LocalPlaybackQueueItem> _queueForSnapshot(
    PlaybackQueueSnapshot snapshot,
  ) {
    Track? firstTrack;
    for (final trackId in snapshot.trackIds) {
      try {
        firstTrack = library.track(trackId);
        break;
      } on StateError {
        continue;
      }
    }
    final activePlanner = planner;
    if (firstTrack == null || activePlanner == null) return const [];
    final restorationPlan = activePlanner.createPlanForRecording(
      firstTrack.recordingId,
      PlaybackMode.recordingRandom,
    );
    final aliases = LibraryAliasIndex(libraryMerges);
    return const LocalPlaybackQueueBuilder()
        .buildDetailed(
          plan: restorationPlan,
          scannedFiles: scannedFiles,
          links: fileTrackLinks,
          candidates: metadataCandidates,
          overrides: metadataOverrides,
          workAliases: aliases.aliasesFor(LibraryEntityType.work),
          recordingAliases: aliases.aliasesFor(LibraryEntityType.recording),
          missingPolicy: ClassicalQueueMissingPolicy.playAvailable,
        )
        .queue;
  }

  Future<void> _refreshPlaybackHistory() async {
    final version = ++historyRefreshVersion;
    final history = await playbackHistoryRepository.recent();
    final statistics = await playbackHistoryRepository.statistics(
      sinceMillis: _statisticsSinceMillis(),
    );
    if (!mounted || version != historyRefreshVersion) {
      return;
    }
    setState(() {
      recentPlaybackHistory = history;
      playbackHistoryStatistics = statistics;
    });
  }

  int? _statisticsSinceMillis() {
    final days = statisticsPeriod.days;
    return days == null
        ? null
        : DateTime.now().subtract(Duration(days: days)).millisecondsSinceEpoch;
  }

  Future<void> _setStatisticsPeriod(ListeningStatisticsPeriod period) async {
    if (statisticsPeriod == period) {
      return;
    }
    setState(() {
      statisticsPeriod = period;
    });
    await _refreshPlaybackHistory();
  }

  Future<void> _runHistoryManagement(Future<void> Function() action) async {
    if (isHistoryManagementRunning) {
      return;
    }
    setState(() {
      isHistoryManagementRunning = true;
    });
    try {
      if (localPlayer.playbackState.playerState == LocalPlayerState.playing) {
        await localPlayer.pause();
      }
      await playbackHistoryCoordinator.closeCurrent();
      await action();
      await _refreshPlaybackHistory();
    } finally {
      if (mounted) {
        setState(() {
          isHistoryManagementRunning = false;
        });
      }
    }
  }

  Future<void> _deleteHistoryEntry(PlaybackHistoryEntry entry) async {
    if (!await _confirmHistoryAction(
      title: '감상 기록 삭제',
      message: '이 악장의 감상 기록을 삭제할까요?',
      confirmLabel: '삭제',
    )) {
      return;
    }
    await _runHistoryManagement(
      () => playbackHistoryRepository.deleteSession(entry.sessionId),
    );
  }

  Future<void> _clearPlaybackHistory() async {
    if (!await _confirmHistoryAction(
      title: '감상 기록 전체 삭제',
      message: '모든 감상 기록을 삭제할까요? 재생 위치는 유지됩니다.',
      confirmLabel: '전체 삭제',
    )) {
      return;
    }
    await _runHistoryManagement(playbackHistoryRepository.deleteAll);
  }

  Future<void> _changeRetentionPolicy(
    PlaybackHistoryRetentionPolicy policy,
  ) async {
    if (policy == retentionPolicy) {
      return;
    }
    if (policy.retentionDays != null &&
        !await _confirmHistoryAction(
          title: '보관 기간 변경',
          message: '${policy.label}보다 오래된 감상 기록을 지금 삭제할까요?',
          confirmLabel: '변경',
        )) {
      return;
    }
    await _runHistoryManagement(() async {
      await playbackHistoryPreferencesRepository.saveRetentionPolicy(policy);
      await const PlaybackHistoryRetentionService().apply(
        repository: playbackHistoryRepository,
        policy: policy,
        now: DateTime.now(),
      );
      if (mounted) {
        setState(() {
          retentionPolicy = policy;
        });
      }
    });
  }

  Future<bool> _confirmHistoryAction({
    required String title,
    required String message,
    required String confirmLabel,
  }) async {
    return showDdiroriConfirmDialog(
      context: context,
      title: title,
      message: message,
      confirmLabel: confirmLabel,
    );
  }

  Future<ScannedAudioRepository> _defaultScanRepository() async {
    final database = await _openDefaultDatabase();
    return ScannedAudioRepository(SqliteScannedAudioStore(database));
  }

  Future<ScanLocationRepository> _defaultScanLocationRepository() async {
    final database = await _openDefaultDatabase();
    return ScanLocationRepository(SqliteScanLocationStore(database));
  }

  Future<MetadataCandidateRepository>
  _defaultMetadataCandidateRepository() async {
    final database = await _openDefaultDatabase();
    return MetadataCandidateRepository(SqliteMetadataCandidateStore(database));
  }

  Future<MetadataOverrideRepository>
  _defaultMetadataOverrideRepository() async {
    final database = await _openDefaultDatabase();
    return MetadataOverrideRepository(SqliteMetadataOverrideStore(database));
  }

  Future<LibraryMergeRepository> _defaultLibraryMergeRepository() async {
    final database = await _openDefaultDatabase();
    return LibraryMergeRepository(SqliteLibraryMergeStore(database));
  }

  Future<ClassicalCatalogRepository> _defaultCatalogRepository() async {
    final database = await _openDefaultDatabase();
    return ClassicalCatalogRepository(SqliteClassicalCatalogStore(database));
  }

  Future<AudioFileTrackLinkRepository> _defaultFileTrackLinkRepository() async {
    final database = await _openDefaultDatabase();
    return AudioFileTrackLinkRepository(
      SqliteAudioFileTrackLinkStore(database),
    );
  }

  Future<ImslpStore> _defaultImslpStore() async {
    final database = await _openDefaultDatabase();
    return SqliteImslpStore(database);
  }

  Future<LocalAudioImportCoordinator> _defaultLocalAudioImportCoordinator(
    ScannedAudioRepository repository,
    MetadataCandidateRepository candidateRepository,
    AudioFileTrackLinkRepository linkRepository,
  ) async {
    final database = await _openDefaultDatabase();
    final supportDirectory = await getApplicationSupportDirectory();
    return LocalAudioImportCoordinator(
      store: SqliteLocalAudioImportStore(database),
      destination: Directory('${supportDirectory.path}/managed_audio'),
      scanner: audioFileScanner,
      scannedAudioRepository: repository,
      metadataCandidateRepository: candidateRepository,
      fileTrackLinkRepository: linkRepository,
    );
  }

  Future<LocalDataControlService> _defaultLocalDataControlService() async {
    final database = await _openDefaultDatabase();
    final supportDirectory = await getApplicationSupportDirectory();
    final managedDirectories = [
      Directory('${supportDirectory.path}/managed_audio'),
      Directory('${supportDirectory.path}/imslp_imports'),
    ];
    const backupPolicy = PlatformBackupExclusionPolicy();
    for (final directory in managedDirectories) {
      if (await directory.exists()) await backupPolicy.exclude(directory.path);
    }
    return LocalDataControlService(
      database: database,
      managedDirectories: managedDirectories,
    );
  }

  Future<sqflite.Database> _openDefaultDatabase() {
    return defaultDatabase ??= _openMigratedDefaultDatabase();
  }

  Future<sqflite.Database> _openMigratedDefaultDatabase() async {
    final supportDirectory = await getApplicationSupportDirectory();
    final database = await ClassicalLocalDatabase(
      path: '${supportDirectory.path}/$classicalLocalDatabaseFileName',
    ).open();
    try {
      await SqliteMigrationRunner().migrateJsonDirectory(
        database,
        supportDirectory,
      );
    } on FileSystemException {
      // Legacy JSON migration should not prevent an already-created database
      // from powering the app.
    } on FormatException {
      // Malformed legacy JSON can be repaired or archived in a later tool flow.
    }
    return database;
  }

  Future<void> _runSampleScan() async {
    final repository = scanRepository;
    final candidateRepository = metadataCandidateRepository;
    if (repository == null ||
        candidateRepository == null ||
        isScanning ||
        isImportingFiles) {
      return;
    }

    setState(() {
      isScanning = true;
      scanStatus = '로컬 폴더 샘플을 스캔하는 중입니다.';
    });

    try {
      final scanned = await sampleAudioFileScanner.scan('/sample/local-music');
      final stored = await repository.mergeScanned(scanned);
      final candidates = await candidateRepository.inferForFiles(scanned);
      if (!mounted) return;
      setState(() {
        scannedFiles = stored;
        metadataCandidates = candidates;
        scanStatus = '정리 필요 파일 ${_needsReviewCount(stored)}개를 저장했습니다.';
      });
    } catch (_) {
      if (mounted) {
        setState(() => scanStatus = '음원 파일을 스캔하지 못했습니다. 다시 시도해 주세요.');
      }
    } finally {
      if (mounted) setState(() => isScanning = false);
    }
  }

  Future<void> _importAudioFiles() async {
    final coordinator = localAudioImportCoordinator;
    if (coordinator == null || isImportingFiles || isScanning) return;

    setState(() {
      isImportingFiles = true;
      scanStatus = '음원 파일을 선택하는 중입니다.';
    });
    final cancellation = LocalAudioImportCancellation();
    localImportCancellation = cancellation;
    try {
      final selections = await audioFilePicker.pickAudioFiles();
      if (!mounted) return;
      if (selections.isEmpty) {
        setState(() => scanStatus = '파일 가져오기가 취소되었습니다.');
        return;
      }
      final result = await coordinator.importFiles(
        selections,
        cancellation: cancellation,
        onProgress: (progress) {
          if (!mounted) return;
          setState(() {
            if (progress.stage == LocalAudioImportStage.analyzing) {
              scanStatus = '가져온 음원의 태그와 메타데이터를 분석하는 중입니다.';
              return;
            }
            final copied = _formatImportBytes(progress.bytesCopied);
            final total = _formatImportBytes(progress.totalBytes);
            scanStatus =
                '파일 ${progress.fileIndex}/${progress.fileCount} 복사 중 · '
                '$copied / $total';
          });
        },
      );
      if (!mounted) return;
      final imported = result.count(LocalAudioImportOutcome.imported);
      final duplicate = result.count(LocalAudioImportOutcome.duplicate);
      final pending = result.count(LocalAudioImportOutcome.pending);
      final failed = result.count(LocalAudioImportOutcome.failed);
      final cancelled = result.count(LocalAudioImportOutcome.cancelled);
      setState(() {
        scannedFiles = result.files;
        metadataCandidates = result.candidates;
        scanStatus = [
          if (imported > 0) '가져옴 $imported개',
          if (duplicate > 0) '중복 $duplicate개',
          if (pending > 0) '분석 대기 $pending개',
          if (failed > 0) '실패 $failed개',
          if (cancelled > 0) '취소 $cancelled개',
        ].join(' · ');
      });
    } catch (_) {
      if (mounted) {
        setState(() => scanStatus = '파일을 가져오지 못했습니다. 다시 시도해 주세요.');
      }
    } finally {
      if (identical(localImportCancellation, cancellation)) {
        localImportCancellation = null;
      }
      if (mounted) setState(() => isImportingFiles = false);
    }
  }

  String _formatImportBytes(int bytes) {
    if (bytes >= 1024 * 1024 * 1024) {
      return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
    }
    if (bytes >= 1024 * 1024) {
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    }
    if (bytes >= 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '$bytes B';
  }

  Future<void> _addFolder() async {
    final locationRepository = scanLocationRepository;
    if (locationRepository == null ||
        isScanning ||
        isPickingFolder ||
        isImportingFiles) {
      return;
    }

    setState(() {
      isPickingFolder = true;
      scanStatus = '음악 폴더를 선택하는 중입니다.';
    });

    ScanLocation? addedLocation;
    try {
      final selectedPath = await folderPicker.pickFolder();
      if (!mounted) return;
      if (selectedPath == null || selectedPath.trim().isEmpty) {
        setState(() => scanStatus = '폴더 추가가 취소되었습니다.');
        return;
      }

      final locations = await locationRepository.addOrActivate(
        selectedPath,
        now: DateTime.now(),
      );
      final normalizedPath = normalizeScanPath(selectedPath);
      addedLocation = locations.firstWhere(
        (location) => location.path == normalizedPath,
      );
      if (!mounted) return;
      setState(() {
        scanLocations = locations;
        scanStatus = '${addedLocation!.displayName} 폴더를 등록했습니다.';
      });
    } catch (_) {
      if (mounted) {
        setState(() => scanStatus = '음악 폴더를 추가하지 못했습니다. 다시 시도해 주세요.');
      }
    } finally {
      if (mounted) setState(() => isPickingFolder = false);
    }

    if (addedLocation != null) await _rescanLocation(addedLocation);
  }

  Future<void> _rescanLocation(ScanLocation location) async {
    final repository = scanRepository;
    final locationRepository = scanLocationRepository;
    final candidateRepository = metadataCandidateRepository;
    if (repository == null ||
        locationRepository == null ||
        candidateRepository == null ||
        isScanning ||
        isImportingFiles ||
        !location.isActive) {
      return;
    }

    setState(() {
      isScanning = true;
      scanStatus = '${location.displayName} 폴더를 스캔하는 중입니다.';
    });

    try {
      final scanned = await audioFileScanner.scan(location.path);
      final reconciliation = await repository.reconcileScan(
        scanned,
        rootPath: location.path,
        scannedAt: DateTime.now(),
      );
      final stored = reconciliation.files;
      final candidates = await candidateRepository.inferForFiles(stored);
      final locations = await locationRepository.markScanned(
        id: location.id,
        fileCount: scanned.length,
        scannedAt: DateTime.now(),
      );
      if (!mounted) return;
      setState(() {
        scannedFiles = stored;
        metadataCandidates = candidates;
        scanLocations = locations;
        scanStatus =
            '${location.displayName}: 파일 ${scanned.length}개 · '
            '이동 ${reconciliation.movedCount} · 누락 ${reconciliation.missingCount} · '
            '모호 ${reconciliation.ambiguousCount} · 정리 필요 ${_needsReviewCount(stored)}';
      });
    } catch (_) {
      if (mounted) {
        setState(() => scanStatus = '음악 폴더를 스캔하지 못했습니다. 다시 시도해 주세요.');
      }
    } finally {
      if (mounted) setState(() => isScanning = false);
    }
  }

  Future<void> _setLocationActive(ScanLocation location, bool isActive) async {
    final locationRepository = scanLocationRepository;
    if (locationRepository == null || isScanning || isImportingFiles) {
      return;
    }

    try {
      final locations = await locationRepository.setActive(
        id: location.id,
        isActive: isActive,
      );
      if (!mounted) return;
      setState(() {
        scanLocations = locations;
        scanStatus = isActive
            ? '${location.displayName} 폴더를 다시 활성화했습니다.'
            : '${location.displayName} 폴더를 비활성화했습니다.';
      });
    } catch (_) {
      if (mounted) {
        setState(() => scanStatus = '음악 폴더 상태를 바꾸지 못했습니다. 다시 시도해 주세요.');
      }
    }
  }

  Future<void> _openCatalogRegistration(List<LocalAudioFile> files) async {
    final repository = scanRepository;
    final linkRepository = fileTrackLinkRepository;
    final catalog = catalogRepository;
    if (repository == null ||
        linkRepository == null ||
        catalog == null ||
        files.isEmpty ||
        isScanning ||
        isImportingFiles ||
        isCatalogSaving) {
      return;
    }

    final draft = await Navigator.of(context).push<CatalogRecordingDraft>(
      MaterialPageRoute(
        builder: (context) => CatalogRegistrationScreen(
          library: library,
          files: files,
          candidates: metadataCandidates,
          overrides: metadataOverrides,
        ),
      ),
    );
    if (draft == null || !mounted) return;

    setState(() {
      isCatalogSaving = true;
      scanStatus = '작품과 녹음을 저장하는 중입니다.';
    });
    try {
      final result = await catalog.register(draft, scannedFiles);
      for (final link in result.links) {
        await linkRepository.linkFileToTrack(
          fileId: link.fileId,
          trackId: link.trackId,
          linkedAt: DateTime.fromMillisecondsSinceEpoch(link.linkedAtMillis),
        );
        await repository.markLinked(link.fileId);
      }
      final storedFiles = await repository.load();
      final links = await linkRepository.load();
      final storedLibrary = await catalog.load(storedFiles);
      if (!mounted) return;
      setState(() {
        library = storedLibrary;
        scannedFiles = storedFiles;
        fileTrackLinks = links;
        _rebuildPlaybackPlan();
        if (result.links.isNotEmpty && planner != null) {
          final newTrack = storedLibrary.track(result.links.first.trackId);
          mode = PlaybackMode.recordingRandom;
          plan = planner!.createPlanForRecording(
            newTrack.recordingId,
            PlaybackMode.recordingRandom,
          );
        }
        scanStatus = '${result.links.length}개 악장을 작품과 녹음에 저장했습니다.';
      });
    } on FormatException catch (error) {
      if (mounted) {
        setState(() => scanStatus = error.message.toString());
      }
    } catch (_) {
      if (mounted) {
        setState(() => scanStatus = '작품과 녹음을 저장하지 못했습니다. 다시 시도해 주세요.');
      }
    } finally {
      if (mounted) setState(() => isCatalogSaving = false);
    }
  }

  int _needsReviewCount(List<LocalAudioFile> files) {
    return files
        .where((file) => file.importStatus == AudioImportStatus.needsReview)
        .length;
  }

  List<LocalPlaybackQueueItem> _currentLocalQueue() {
    final activePlan = plan;
    if (activePlan == null) return const [];
    final aliases = LibraryAliasIndex(libraryMerges);
    return const LocalPlaybackQueueBuilder()
        .buildDetailed(
          plan: activePlan,
          scannedFiles: scannedFiles,
          links: fileTrackLinks,
          candidates: metadataCandidates,
          overrides: metadataOverrides,
          workAliases: aliases.aliasesFor(LibraryEntityType.work),
          recordingAliases: aliases.aliasesFor(LibraryEntityType.recording),
          missingPolicy: queueMissingPolicy,
        )
        .queue;
  }

  LibraryDetailBuilder _detailBuilder() {
    final aliases = LibraryAliasIndex(libraryMerges);
    return LibraryDetailBuilder(
      library: library,
      scannedFiles: scannedFiles,
      links: fileTrackLinks,
      candidates: metadataCandidates,
      overrides: metadataOverrides,
      workAliases: aliases.aliasesFor(LibraryEntityType.work),
      recordingAliases: aliases.aliasesFor(LibraryEntityType.recording),
    );
  }

  Future<void> _openWorkDetail(String workId) async {
    final data = _detailBuilder().buildWork(workId);
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => WorkDetailScreen(
          data: data,
          onOpenRecording: (recordingId) {
            unawaited(_openRecordingDetail(recordingId));
          },
          onPlayRecording: _playRecordingFromDetail,
        ),
      ),
    );
  }

  Future<void> _openRecordingDetail(String recordingId) async {
    final data = _detailBuilder().buildRecording(recordingId);
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => RecordingDetailScreen(
          data: data,
          initialPlaybackState: localPlayer.playbackState,
          playbackStates: localPlayer.states,
          onPlayAll: () => _playRecordingFromDetail(data.recording.id),
          onPlayFromTrack: (trackId) =>
              _playRecordingFromDetail(data.recording.id, fromTrackId: trackId),
        ),
      ),
    );
  }

  void _openSearchResult(LibrarySearchResult result) {
    switch (result.type) {
      case SearchResultType.work:
        unawaited(_openWorkDetail(result.id));
      case SearchResultType.recording:
        unawaited(_openRecordingDetail(result.id));
      case SearchResultType.workPart:
        for (final part in library.workParts) {
          if (part.id == result.id) {
            unawaited(_openWorkDetail(part.workId));
            return;
          }
        }
      case SearchResultType.person:
      case SearchResultType.fileCandidate:
        return;
    }
  }

  Future<void> _playRecordingFromDetail(
    String recordingId, {
    String? fromTrackId,
  }) async {
    final activePlanner = planner;
    if (activePlanner == null) return;
    final aliases = LibraryAliasIndex(libraryMerges);
    final canonicalRecordingId = aliases.resolve(
      LibraryEntityType.recording,
      recordingId,
    );
    final nextPlan = fromTrackId == null
        ? activePlanner.createPlanForRecording(
            canonicalRecordingId,
            PlaybackMode.recordingRandom,
          )
        : activePlanner.createContinuationPlan(
            recordingId: canonicalRecordingId,
            trackId: fromTrackId,
          );
    if (nextPlan == null) return;
    setState(() {
      mode = PlaybackMode.recordingRandom;
      plan = nextPlan;
    });
    await _runPlaybackCommand(() async {
      await playbackHistoryCoordinator.closeCurrent();
      await localPlayer.loadQueue(_currentLocalQueue());
      if (localPlayer.playbackState.playerState != LocalPlayerState.error) {
        await localPlayer.play();
      }
    });
  }

  Future<void> _openLibraryManagement() async {
    final scannedRepository = scanRepository;
    final candidateRepository = metadataCandidateRepository;
    final overrideRepository = metadataOverrideRepository;
    final mergeRepository = libraryMergeRepository;
    final linkRepository = fileTrackLinkRepository;
    if (scannedRepository == null ||
        candidateRepository == null ||
        overrideRepository == null ||
        mergeRepository == null ||
        linkRepository == null) {
      return;
    }
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => LibraryManagementScreen(
          library: library,
          files: scannedFiles,
          candidates: metadataCandidates,
          overrides: metadataOverrides,
          merges: libraryMerges,
          links: fileTrackLinks,
          scannedAudioRepository: scannedRepository,
          metadataCandidateRepository: candidateRepository,
          metadataOverrideRepository: overrideRepository,
          musicBrainzClient: musicBrainzClient,
          libraryMergeRepository: mergeRepository,
          linkRepository: linkRepository,
          catalogRepository: catalogRepository,
          managedAudioLibrary:
              localAudioImportCoordinator is ManagedAudioLibrary
              ? localAudioImportCoordinator! as ManagedAudioLibrary
              : null,
          managedAudioExporter:
              widget.managedAudioExporter ??
              const SharePlusManagedAudioExporter(),
          missingFileRelinkRepository: missingFileRelinkRepository,
          audioFilePicker: audioFilePicker,
          localAudioImportController: localAudioImportCoordinator,
          onChanged: (snapshot) {
            if (!mounted) return;
            setState(() {
              scannedFiles = snapshot.files;
              metadataCandidates = snapshot.candidates;
              metadataOverrides = snapshot.overrides;
              libraryMerges = snapshot.merges;
              fileTrackLinks = snapshot.links;
              library = snapshot.library;
              _rebuildPlaybackPlan();
            });
          },
        ),
      ),
    );
  }

  Future<void> _openDiscovery() async {
    final activePlan = plan;
    if (activePlan == null) return;
    final aliases = LibraryAliasIndex(libraryMerges);
    final workAliases = aliases.aliasesFor(LibraryEntityType.work);
    final recordingAliases = aliases.aliasesFor(LibraryEntityType.recording);
    final service = const LibraryDiscoveryService();
    final recent = [
      for (final entry in recentPlaybackHistory)
        PlayHistoryEntry(
          playedAt: entry.lastPlayedAt,
          recordingId: entry.recordingId,
          trackId: entry.trackId,
        ),
    ];
    final relatedFiles = <DiscoveryResult>[];
    for (final file in scannedFiles) {
      MetadataCandidate? candidate;
      MetadataOverride? override;
      for (final item in metadataCandidates) {
        if (item.fileId == file.id) candidate = item;
      }
      for (final item in metadataOverrides) {
        if (item.fileId == file.id) override = item;
      }
      relatedFiles.addAll(
        service.relatedToFile(
          library: library,
          file: file,
          candidate: candidate,
          override: override,
          workAliases: workAliases,
        ),
      );
    }
    final participantResults = <DiscoveryResult>[];
    for (final credit in activePlan.recording.credits) {
      participantResults.addAll(
        service
            .recordingsByPerson(
              library,
              personId: credit.personId,
              recordingAliases: recordingAliases,
            )
            .where(
              (result) =>
                  result.id !=
                  (recordingAliases[activePlan.recording.id] ??
                      activePlan.recording.id),
            ),
      );
    }
    final sections = [
      DiscoverySection(
        title: '최근 감상에서 이어서',
        results: service.fromHistory(
          library,
          recent,
          workAliases: workAliases,
          recordingAliases: recordingAliases,
        ),
      ),
      DiscoverySection(
        title: '같은 작곡가의 작품',
        results: service.otherWorksByComposer(
          library,
          workId: activePlan.work.id,
          workAliases: workAliases,
        ),
      ),
      DiscoverySection(
        title: '같은 작품의 다른 녹음',
        results: service.otherRecordingsForWork(
          library,
          recordingId: activePlan.recording.id,
          recordingAliases: recordingAliases,
        ),
      ),
      DiscoverySection(
        title: '연주자·지휘자의 다른 녹음',
        results: _uniqueDiscoveryResults(participantResults),
      ),
      DiscoverySection(
        title: '내 파일과 관련된 작품',
        results: _uniqueDiscoveryResults(relatedFiles),
      ),
    ];
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => LibraryDiscoveryScreen(
          sections: sections,
          onOpen: _openDiscoveryResult,
          onPlay: (result) {
            Navigator.of(context).pop();
            unawaited(_playDiscoveryResult(result));
          },
        ),
      ),
    );
  }

  void _openDiscoveryResult(DiscoveryResult result) {
    switch (result.type) {
      case DiscoveryResultType.work:
        unawaited(_openWorkDetail(result.id));
      case DiscoveryResultType.recording:
        unawaited(_openRecordingDetail(result.id));
    }
  }

  Future<void> _playDiscoveryResult(DiscoveryResult result) async {
    final activePlanner = planner;
    if (activePlanner == null) return;
    Recording? recording;
    if (result.type == DiscoveryResultType.recording) {
      for (final item in library.recordings) {
        if (item.id == result.id) recording = item;
      }
    } else {
      final recordings = library.recordingsForWork(result.id);
      if (recordings.isNotEmpty) recording = recordings.first;
    }
    if (recording == null) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('재생 가능한 녹음을 찾지 못했습니다.')));
      }
      return;
    }
    setState(() {
      mode = PlaybackMode.recordingRandom;
      plan = activePlanner.createPlanForRecording(
        recording!.id,
        PlaybackMode.recordingRandom,
      );
    });
    await _runPlaybackCommand(() async {
      await playbackHistoryCoordinator.closeCurrent();
      await localPlayer.loadQueue(_currentLocalQueue());
      if (localPlayer.playbackState.playerState != LocalPlayerState.error) {
        await localPlayer.play();
      }
    });
  }

  Future<void> _openImslpLibrary() async {
    final store = imslpStore;
    final scannedRepository = scanRepository;
    final candidateRepository = metadataCandidateRepository;
    if (store == null ||
        scannedRepository == null ||
        candidateRepository == null) {
      return;
    }
    final supportDirectory = await getApplicationSupportDirectory();
    if (!mounted) return;
    final coordinator =
        widget.imslpImportCoordinator ??
        ImslpImportCoordinator(
          store: store,
          downloadService: const ImslpDownloadService(),
          destination: Directory('${supportDirectory.path}/imslp_imports'),
          scanner: audioFileScanner,
          scannedAudioRepository: scannedRepository,
          metadataCandidateRepository: candidateRepository,
        );
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => ImslpLibraryScreen(
          library: library,
          store: store,
          client: widget.imslpCatalogClient ?? HttpImslpCatalogClient(),
          importCoordinator: coordinator,
        ),
      ),
    );
    final files = await scannedRepository.load();
    final candidates = await candidateRepository.load();
    if (!mounted) return;
    setState(() {
      scannedFiles = files;
      metadataCandidates = candidates;
    });
  }

  Future<void> _togglePlayback() {
    return _runPlaybackCommand(() async {
      if (playbackState.playerState == LocalPlayerState.playing) {
        await localPlayer.pause();
      } else if (playbackState.playerState == LocalPlayerState.paused) {
        await localPlayer.resume();
      } else {
        await playbackHistoryCoordinator.closeCurrent();
        final retryQueue =
            playbackState.failure != null && playbackState.hasQueue
            ? playbackState.queue
            : _currentLocalQueue();
        await localPlayer.loadQueue(retryQueue);
        if (localPlayer.playbackState.playerState != LocalPlayerState.error) {
          await localPlayer.play();
        }
      }
    });
  }

  Future<void> _nextPlaybackItem() {
    return _runPlaybackCommand(() async {
      if (!localPlayer.playbackState.hasQueue) {
        await playbackHistoryCoordinator.closeCurrent();
        await localPlayer.loadQueue(_currentLocalQueue());
        if (localPlayer.playbackState.playerState != LocalPlayerState.error) {
          await localPlayer.play();
        }
      } else {
        await localPlayer.next();
      }
    });
  }

  Future<void> _stopPlayback() {
    return _runPlaybackCommand(() async {
      await playbackHistoryCoordinator.closeCurrent();
      await localPlayer.stop();
    });
  }

  Future<void> _seekPlayback(Duration position) {
    return _runPlaybackCommand(() => localPlayer.seek(position));
  }

  Future<void> _openPlaybackDiagnostic() async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => PlaybackDiagnosticScreen(
          runner:
              widget.playbackDiagnosticRunner ??
              LocalFixturePlaybackDiagnosticRunner(),
        ),
      ),
    );
  }

  Future<void> _openSettings() async {
    final dataControl = localDataControlService;
    if (dataControl == null) return;
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => AppSettingsScreen(
          dataControl: dataControl,
          onBeforeReset: _prepareLocalReset,
          onResetComplete: _applyLocalReset,
          backupService: libraryBackupService,
          backupTransport:
              widget.libraryBackupTransport ??
              const PlatformLibraryBackupTransport(),
          onBackupImported: _reloadAfterBackup,
        ),
      ),
    );
  }

  Future<void> _reloadAfterBackup() async {
    await playbackHistoryCoordinator.closeCurrent();
    await localPlayer.stop();
    await _loadStorage();
  }

  Future<void> _prepareLocalReset() async {
    // Drain playback writes before deleting data, including the queue retained by stop.
    await localPlayer.stop();
    await localPlayer.loadQueue(const []);
    await localPlayer.stop();
    await playbackHistoryCoordinator.observe(localPlayer.playbackState);
    await playbackHistoryCoordinator.closeCurrent();
    await playbackQueueCoordinator.clear();
    await playbackQueueCoordinator.flush();
  }

  Future<void> _applyLocalReset() async {
    if (!mounted) return;
    setState(() {
      library = emptyClassicalLibrary;
      scannedFiles = const [];
      scanLocations = const [];
      metadataCandidates = const [];
      metadataOverrides = const [];
      libraryMerges = const [];
      fileTrackLinks = const [];
      recentPlaybackHistory = const [];
      playbackHistoryStatistics = const PlaybackHistoryStatistics.empty();
      scanStatus = supportsFolderScan
          ? '음악 폴더를 추가하거나 음원 파일을 가져오세요.'
          : '음원 파일을 가져와 라이브러리를 시작하세요.';
      _rebuildPlaybackPlan();
    });
  }

  ContinueListeningQueueResult _continuationFor(PlaybackHistoryEntry entry) {
    return const ContinueListeningQueueBuilder().build(
      history: entry,
      library: library,
      scannedFiles: scannedFiles,
      links: fileTrackLinks,
    );
  }

  Future<void> _continueListening(PlaybackHistoryEntry entry) {
    final continuation = _continuationFor(entry);
    if (!continuation.canPlay) {
      return Future.value();
    }
    return _runPlaybackCommand(() async {
      await playbackHistoryCoordinator.closeCurrent();
      await localPlayer.loadQueue(continuation.queue);
      if (localPlayer.playbackState.playerState != LocalPlayerState.error) {
        await localPlayer.play();
      }
    });
  }

  Future<void> _runPlaybackCommand(Future<void> Function() command) async {
    if (isPlaybackCommandRunning) {
      return;
    }

    setState(() {
      isPlaybackCommandRunning = true;
    });
    try {
      await command();
    } finally {
      if (mounted) {
        setState(() {
          isPlaybackCommandRunning = false;
        });
      }
    }
  }

  void _openHomeTool(_HomeToolAction action) {
    switch (action) {
      case _HomeToolAction.discovery:
        unawaited(_openDiscovery());
      case _HomeToolAction.imslp:
        unawaited(_openImslpLibrary());
      case _HomeToolAction.libraryManagement:
        unawaited(_openLibraryManagement());
      case _HomeToolAction.playbackDiagnostic:
        unawaited(_openPlaybackDiagnostic());
      case _HomeToolAction.settings:
        unawaited(_openSettings());
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final useCompactTools = MediaQuery.sizeOf(context).width < 600;
    final activePlan = plan;
    final searchResults = searchService.search(
      library: library,
      files: scannedFiles,
      candidates: metadataCandidates,
      overrides: metadataOverrides,
      workAliases: LibraryAliasIndex(libraryMerges)
          .aliasesFor(LibraryEntityType.work),
      recordingAliases: LibraryAliasIndex(libraryMerges)
          .aliasesFor(LibraryEntityType.recording),
      query: searchQuery,
    );

    return Scaffold(
      appBar: AppBar(
        title: Text(switch (homeView) {
          _LibraryView.library => '라이브러리',
          _LibraryView.playback => '현재 재생',
          _LibraryView.management => '가져오기 및 관리',
          _LibraryView.listening => '감상 기록',
        }),
        backgroundColor: colorScheme.surface,
        actions: [
          if (!useCompactTools)
            IconButton(
              onPressed: activePlan == null ? null : _openDiscovery,
              icon: const Icon(Icons.explore_outlined),
              tooltip: '음악 발견',
            ),
          if (useCompactTools)
            PopupMenuButton<_HomeToolAction>(
              tooltip: '도구 더보기',
              onSelected: _openHomeTool,
              itemBuilder: (context) => [
                PopupMenuItem(
                  value: _HomeToolAction.discovery,
                  enabled: activePlan != null,
                  child: const ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(Icons.explore_outlined),
                    title: Text('음악 발견'),
                  ),
                ),
                PopupMenuItem(
                  value: _HomeToolAction.imslp,
                  enabled: imslpStore != null && !isImportingFiles,
                  child: const ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(Icons.public_outlined),
                    title: Text('IMSLP 자료'),
                  ),
                ),
                PopupMenuItem(
                  value: _HomeToolAction.libraryManagement,
                  enabled: scanRepository != null && !isImportingFiles,
                  child: const ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(Icons.rule_folder_outlined),
                    title: Text('파일 정리'),
                  ),
                ),
                const PopupMenuItem(
                  value: _HomeToolAction.playbackDiagnostic,
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(Icons.fact_check_outlined),
                    title: Text('재생 진단'),
                  ),
                ),
                PopupMenuItem(
                  value: _HomeToolAction.settings,
                  enabled: localDataControlService != null,
                  child: const ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(Icons.settings_outlined),
                    title: Text('앱 정보 및 데이터'),
                  ),
                ),
              ],
            )
          else ...[
            IconButton(
              onPressed: imslpStore == null || isImportingFiles
                  ? null
                  : _openImslpLibrary,
              icon: const Icon(Icons.public_outlined),
              tooltip: 'IMSLP 자료',
            ),
            IconButton(
              onPressed: scanRepository == null || isImportingFiles
                  ? null
                  : _openLibraryManagement,
              icon: const Icon(Icons.rule_folder_outlined),
              tooltip: '파일 정리',
            ),
            IconButton(
              onPressed: _openPlaybackDiagnostic,
              icon: const Icon(Icons.fact_check_outlined),
              tooltip: '재생 진단',
            ),
            IconButton(
              onPressed: localDataControlService == null ? null : _openSettings,
              icon: const Icon(Icons.settings_outlined),
              tooltip: '앱 정보 및 데이터',
            ),
          ],
        ],
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: _LibraryNavigation(
          selected: homeView,
          onChanged: (value) => setState(() => homeView = value),
        ),
      ),
      body: SafeArea(
        child: ListView(
          key: PageStorageKey('home-${homeView.name}'),
          padding: EdgeInsets.fromLTRB(
            MediaQuery.sizeOf(context).width >= 1024
                ? 32
                : MediaQuery.sizeOf(context).width >= 600
                ? 24
                : 16,
            12,
            MediaQuery.sizeOf(context).width >= 1024
                ? 32
                : MediaQuery.sizeOf(context).width >= 600
                ? 24
                : 16,
            24,
          ),
          children: [
            if (homeView == _LibraryView.library) ...[
              const DdiroriProductSignature(
                product: DdiroriProduct.play,
                name: '띠로리 플레이',
              ),
              const SizedBox(height: 24),
              DdiroriToolbar(
                label: '라이브러리 작업',
                children: [
                  DdiroriButton(
                    label: '파일 가져오기',
                    icon: Icons.file_open_outlined,
                    busy: isImportingFiles,
                    onPressed: localAudioImportCoordinator == null || isScanning
                        ? null
                        : () async {
                            setState(() => homeView = _LibraryView.management);
                            await _importAudioFiles();
                          },
                  ),
                  DdiroriIconButton(
                    label: '가져오기 및 관리',
                    icon: Icons.folder_outlined,
                    onPressed: () =>
                        setState(() => homeView = _LibraryView.management),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (hasStorageInitializationError)
                DdiroriBanner(
                  message: scanStatus,
                  kind: DdiroriNoticeKind.error,
                  action: DdiroriButton(
                    label: '보관함 다시 불러오기',
                    onPressed: isPreparingStorage ? null : _prepareStorage,
                  ),
                )
              else if (_needsReviewCount(scannedFiles) > 0 ||
                  scannedFiles.any(
                    (file) => file.importStatus == AudioImportStatus.missing,
                  ))
                DdiroriBanner(
                  message:
                      '정리 필요 ${_needsReviewCount(scannedFiles)}개 · 누락 ${scannedFiles.where((file) => file.importStatus == AudioImportStatus.missing).length}개',
                  kind: DdiroriNoticeKind.warning,
                  action: DdiroriIconButton(
                    label: '파일 상태 확인',
                    icon: Icons.rule_folder_outlined,
                    onPressed: () =>
                        setState(() => homeView = _LibraryView.management),
                  ),
                ),
              _SearchPanel(
                query: searchQuery,
                results: searchResults,
                onQueryChanged: _setSearchQuery,
                onResultSelected: _openSearchResult,
              ),
              const SizedBox(height: 16),
              if (searchQuery.trim().isEmpty) ...[
                if (library.works.isEmpty)
                  _EmptyCatalogPanel(
                    hasFiles: scannedFiles.isNotEmpty,
                    onRegister:
                        scannedFiles
                            .where(
                              (file) =>
                                  file.importStatus ==
                                  AudioImportStatus.needsReview,
                            )
                            .isEmpty
                        ? null
                        : () => _openCatalogRegistration(
                            scannedFiles
                                .where(
                                  (file) =>
                                      file.importStatus ==
                                      AudioImportStatus.needsReview,
                                )
                                .toList(),
                          ),
                  )
                else ...[
                  _WorksPanel(
                    library: library,
                    onlyRecorded: onlyRecordedWorks,
                    sortByComposer: sortWorksByComposer,
                    onFilterChanged: (value) =>
                        setState(() => onlyRecordedWorks = value),
                    onSortChanged: (value) =>
                        setState(() => sortWorksByComposer = value),
                    onWorkSelected: (id) => unawaited(_openWorkDetail(id)),
                  ),
                  const SizedBox(height: 24),
                  _RecordingsPanel(
                    library: library,
                    onRecordingSelected: (recordingId) =>
                        unawaited(_openRecordingDetail(recordingId)),
                  ),
                ],
              ],
            ],
            if (homeView == _LibraryView.management) ...[
              Align(
                alignment: AlignmentDirectional.centerEnd,
                child: DdiroriIconButton(
                  label: '파일 정리 열기',
                  icon: Icons.rule_folder_outlined,
                  onPressed: scanRepository == null || isImportingFiles
                      ? null
                      : _openLibraryManagement,
                ),
              ),
              _ScanPanel(
                files: scannedFiles,
                candidates: metadataCandidates,
                links: fileTrackLinks,
                locations: scanLocations,
                status: scanStatus,
                isScanning: isScanning,
                isPickingFolder: isPickingFolder,
                isImportingFiles: isImportingFiles,
                isCatalogSaving: isCatalogSaving,
                supportsFolderScan: supportsFolderScan,
                showDemoActions: widget.enableDemoFeatures,
                onRetryStoragePressed: hasStorageInitializationError
                    ? _prepareStorage
                    : null,
                onImportFilesPressed: localAudioImportCoordinator == null
                    ? null
                    : _importAudioFiles,
                onAddFolderPressed: scanLocationRepository == null
                    ? null
                    : _addFolder,
                onSampleScanPressed: scanRepository == null
                    ? null
                    : _runSampleScan,
                onRegisterFiles: _openCatalogRegistration,
                onRescanLocation: _rescanLocation,
                onSetLocationActive: _setLocationActive,
              ),
              const SizedBox(height: 24),
              _LibrarySummary(
                library: library,
                scannedCount: scannedFiles.length,
                needsReviewCount: _needsReviewCount(scannedFiles),
              ),
            ],
            if (homeView == _LibraryView.playback) ...[
              if (activePlan != null) ...[
                _QueuePanel(
                  plan: activePlan,
                  scannedFiles: scannedFiles,
                  links: fileTrackLinks,
                  playbackState: playbackState,
                  isCommandRunning: isPlaybackCommandRunning,
                  onPlayPausePressed: _togglePlayback,
                  onNextPressed: _nextPlaybackItem,
                  onStopPressed: _stopPlayback,
                  onSeek: _seekPlayback,
                ),
                const SizedBox(height: 24),
                _PlaybackModePanel(
                  mode: mode,
                  plan: activePlan,
                  missingPolicy: queueMissingPolicy,
                  onModeChanged: _setMode,
                  onMissingPolicyChanged: (policy) {
                    setState(() => queueMissingPolicy = policy);
                  },
                ),
              ] else
                PlayNowPlayingControls(
                  state: playbackState,
                  canUseQueue: playbackState.hasQueue,
                  commandRunning: isPlaybackCommandRunning,
                  onPlayPause: _togglePlayback,
                  onNext: _nextPlaybackItem,
                  onStop: _stopPlayback,
                  onSeek: _seekPlayback,
                ),
            ],
            if (homeView == _LibraryView.listening) ...[
              _RecentListeningPanel(
                entries: recentPlaybackHistory,
                continuationFor: _continuationFor,
                retentionPolicy: retentionPolicy,
                isCommandRunning:
                    isPlaybackCommandRunning || isHistoryManagementRunning,
                onContinue: _continueListening,
                onDelete: _deleteHistoryEntry,
                onClearAll: _clearPlaybackHistory,
                onRetentionPolicyChanged: _changeRetentionPolicy,
              ),
              const SizedBox(height: 16),
              _ListeningStatisticsPanel(
                statistics: playbackHistoryStatistics,
                period: statisticsPeriod,
                onPeriodChanged: _setStatisticsPeriod,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

List<DiscoveryResult> _uniqueDiscoveryResults(
  Iterable<DiscoveryResult> source,
) {
  final unique = <String, DiscoveryResult>{};
  for (final result in source) {
    unique.putIfAbsent('${result.type.name}:${result.id}', () => result);
  }
  final values = unique.values.toList()
    ..sort((left, right) => left.title.compareTo(right.title));
  return values;
}

List<LocalAudioFile> _uniqueFiles(Iterable<LocalAudioFile> files) {
  final unique = <String, LocalAudioFile>{};
  for (final file in files) {
    unique[file.id] = file;
  }
  return unique.values.toList();
}

ClassicalLibrary _libraryWithFiles(
  ClassicalLibrary library,
  List<LocalAudioFile> files,
) => ClassicalLibrary(
  people: library.people,
  instruments: library.instruments,
  ensembles: library.ensembles,
  works: library.works,
  workParts: library.workParts,
  albums: library.albums,
  recordings: library.recordings,
  tracks: library.tracks,
  files: files,
  playHistory: library.playHistory,
);

class SampleAudioFileScanner implements AudioFileScanner {
  const SampleAudioFileScanner();

  @override
  Future<List<LocalAudioFile>> scan(String rootPath) async {
    return [
      LocalAudioFile(
        id: scannedAudioId('$rootPath/Beethoven/Symphony 5/01 Allegro.flac'),
        path: '$rootPath/Beethoven/Symphony 5/01 Allegro.flac',
        fileName: '01 Allegro.flac',
        format: 'FLAC',
        sizeBytes: 32100000,
        modifiedAtMillis: 1791870000000,
        importStatus: AudioImportStatus.needsReview,
        sourceReferences: const [SourceReference(kind: SourceKind.localTag)],
      ),
      LocalAudioFile(
        id: scannedAudioId('$rootPath/Beethoven/Symphony 5/02 Andante.flac'),
        path: '$rootPath/Beethoven/Symphony 5/02 Andante.flac',
        fileName: '02 Andante.flac',
        format: 'FLAC',
        sizeBytes: 28400000,
        modifiedAtMillis: 1791870060000,
        importStatus: AudioImportStatus.needsReview,
        sourceReferences: const [SourceReference(kind: SourceKind.localTag)],
      ),
      LocalAudioFile(
        id: scannedAudioId('$rootPath/readme.txt'),
        path: '$rootPath/readme.txt',
        fileName: 'readme.txt',
        format: 'TXT',
        sizeBytes: 1200,
        modifiedAtMillis: 1791870120000,
        importStatus: AudioImportStatus.missing,
      ),
    ].where((file) => audioExtensionForPath(file.path) != null).toList();
  }
}
