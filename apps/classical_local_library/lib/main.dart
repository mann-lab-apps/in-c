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
import 'local_import_feedback.dart';
import 'local_file_library.dart';
import 'local_playlists.dart';
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
import 'presentation/play_playback_layout.dart';
import 'sample_classical_library.dart';
import 'scan_locations.dart';
import 'scanned_audio_store.dart';
import 'sqlite_database.dart';

part 'presentation/library_home_components.dart';
part 'presentation/local_file_library_components.dart';
part 'presentation/local_playlist_components.dart';

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

enum _LibraryView {
  library,
  files,
  playlists,
  search,
  playback,
  management,
  listening,
}

enum _HomeToolAction {
  playback,
  management,
  listening,
  discovery,
  imslp,
  libraryManagement,
  folderBrowse,
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
    this.localPlaylistRepository,
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
  final LocalPlaylistRepository? localPlaylistRepository;
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
        localPlaylistRepository: localPlaylistRepository,
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
    this.localPlaylistRepository,
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
  final LocalPlaylistRepository? localPlaylistRepository;
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
  final LocalFileLibrary fileLibrary = const LocalFileLibrary();
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
  late final ValueNotifier<PlayPlaybackSnapshot> playbackView;
  ScannedAudioRepository? scanRepository;
  ScanLocationRepository? scanLocationRepository;
  MetadataCandidateRepository? metadataCandidateRepository;
  MetadataOverrideRepository? metadataOverrideRepository;
  LibraryMergeRepository? libraryMergeRepository;
  ClassicalCatalogRepository? catalogRepository;
  LocalPlaylistRepository? localPlaylistRepository;
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
  List<LocalPlaylist> playlists = const [];
  String? selectedPlaylistId;
  bool isPlaylistSaving = false;
  List<LocalImportFeedbackItem> importFeedback = const [];
  Map<String, int> importedAtByFileId = const {};
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
  LocalFileCategory fileCategory = LocalFileCategory.songs;
  String? fileGroup;
  String fileQuery = '';
  LocalFileSort fileSort = LocalFileSort.title;
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
  bool firstUseEligible = false;
  bool firstPlayAchieved = false;
  String? lastRegisteredRecordingId;
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
    playbackView = ValueNotifier(PlayPlaybackSnapshot(playbackState));
    playbackSubscription = localPlayer.states.listen((state) {
      unawaited(playbackHistoryCoordinator.observe(state));
      unawaited(playbackQueueCoordinator.observe(state));
      if (!mounted) {
        return;
      }
      setState(() {
        playbackState = state;
        if (firstUseEligible &&
            !firstPlayAchieved &&
            lastRegisteredRecordingId != null &&
            state.playerState == LocalPlayerState.playing &&
            state.currentItem?.recordingId == lastRegisteredRecordingId) {
          firstPlayAchieved = true;
        }
      });
      _syncPlaybackView();
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
    playbackView.dispose();
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
    final playlistRepository =
        widget.localPlaylistRepository ??
        (widget.scanRepository != null
            ? localPlaylistRepository ??
                  LocalPlaylistRepository(MemoryLocalPlaylistStore())
            : LocalPlaylistRepository(
                SqliteLocalPlaylistStore(await _openDefaultDatabase()),
              ));
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
    final importDates = importCoordinator is LocalAudioImportCoordinator
        ? {
            for (final record in await importCoordinator.store.load())
              if (record.fileId != null)
                record.fileId!: record.importedAtMillis,
          }
        : <String, int>{};
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
    final storedPlaylists = await playlistRepository.load();
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
      localPlaylistRepository = playlistRepository;
      playlists = storedPlaylists;
      fileTrackLinkRepository = linkRepository;
      imslpStore = externalStore;
      localAudioImportCoordinator = importCoordinator;
      localDataControlService = dataControl;
      libraryBackupService = backupService;
      missingFileRelinkRepository = relinkRepository;
      scannedFiles = files;
      firstUseEligible =
          files.isEmpty && storedLibrary.works.isEmpty && history.isEmpty;
      importedAtByFileId = importDates;
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
        final unit = snapshot.trackIds.any(fileLibrary.isFileTrackId)
            ? '곡'
            : '악장';
        scanStatus =
            '이전 재생 큐를 복원하고 누락된 $unit '
            '${recovery.skippedTrackIds.length}개를 제외했습니다.';
      } else if (recovery.isUnavailable) {
        scanStatus = '이전 재생 큐의 로컬 파일을 찾지 못했습니다.';
      }
    });
  }

  List<LocalPlaybackQueueItem> _queueForSnapshot(
    PlaybackQueueSnapshot snapshot,
  ) {
    if (snapshot.trackIds.any(fileLibrary.isFileTrackId)) {
      return fileLibrary.queueForSnapshot(
        fileLibrary.entries(
          files: scannedFiles,
          candidates: metadataCandidates,
          overrides: metadataOverrides,
        ),
        snapshot.trackIds,
      );
    }
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

  Future<void> _importAudioFiles() => _runImport();

  Future<void> _retryFailedImports() async {
    if (isImportingFiles) return;
    final failed = [
      for (var index = 0; index < importFeedback.length; index += 1)
        if (importFeedback[index].canRetry) index,
    ];
    if (failed.isEmpty) return;
    await _runImport(retryIndices: failed);
  }

  Future<void> _retryPendingAnalysis() async {
    final coordinator = localAudioImportCoordinator;
    if (coordinator == null || isImportingFiles) return;
    setState(() {
      isImportingFiles = true;
      scanStatus = '가져온 음원을 다시 분석하는 중입니다.';
    });
    try {
      final recovered = await coordinator.recoverManagedImports();
      if (!mounted) return;
      final byPath = {for (final file in recovered.files) file.path: file};
      setState(() {
        scannedFiles = recovered.files;
        metadataCandidates = recovered.candidates;
        importFeedback = [
          for (final item in importFeedback)
            if (item.result.outcome == LocalAudioImportOutcome.pending &&
                byPath[item.result.record?.localPath] != null)
              LocalImportFeedbackItem(
                selection: item.selection,
                result: LocalAudioImportItemResult(
                  outcome: LocalAudioImportOutcome.imported,
                  record: item.result.record,
                ),
                file: byPath[item.result.record?.localPath],
              )
            else
              item,
        ];
        scanStatus =
            importFeedback.any(
              (item) => item.result.outcome == LocalAudioImportOutcome.pending,
            )
            ? '일부 파일은 아직 분석 대기 중입니다. 다시 시도하거나 파일을 확인해 주세요.'
            : '가져온 음원 분석을 마쳤습니다.';
      });
    } catch (_) {
      if (mounted) {
        setState(() => scanStatus = '분석을 마치지 못했습니다. 다시 시도해 주세요.');
      }
    } finally {
      if (mounted) setState(() => isImportingFiles = false);
    }
  }

  Future<void> _runImport({List<int>? retryIndices}) async {
    final coordinator = localAudioImportCoordinator;
    if (coordinator == null || isImportingFiles || isScanning) return;

    setState(() {
      isImportingFiles = true;
      scanStatus = retryIndices == null
          ? '음원 파일을 선택하는 중입니다.'
          : '실패한 파일을 다시 가져오는 중입니다.';
    });
    final cancellation = LocalAudioImportCancellation();
    localImportCancellation = cancellation;
    try {
      final selections = retryIndices == null
          ? await audioFilePicker.pickAudioFiles()
          : [for (final index in retryIndices) importFeedback[index].selection];
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
      final nextFeedback = LocalImportFeedbackItem.fromBatch(
        selections,
        result,
      );
      final feedback = retryIndices == null
          ? [...nextFeedback]
          : [...importFeedback];
      if (retryIndices != null) {
        for (var index = 0; index < retryIndices.length; index += 1) {
          feedback[retryIndices[index]] = nextFeedback[index];
        }
      }
      final counts = {
        for (final outcome in LocalAudioImportOutcome.values)
          outcome: feedback
              .where((item) => item.result.outcome == outcome)
              .length,
      };
      final importedPaths = {
        for (final item in result.items)
          if (item.record case final record?)
            record.localPath: record.importedAtMillis,
      };
      final importDates = {...importedAtByFileId};
      for (final file in result.files) {
        final importedAt = importedPaths[file.path];
        if (importedAt != null) importDates[file.id] = importedAt;
      }
      setState(() {
        scannedFiles = [
          ...{
            for (final file in scannedFiles) file.id: file,
            for (final file in result.files) file.id: file,
          }.values,
        ];
        metadataCandidates = [
          ...{
            for (final candidate in metadataCandidates)
              candidate.fileId: candidate,
            for (final candidate in result.candidates)
              candidate.fileId: candidate,
          }.values,
        ];
        importFeedback = feedback;
        importedAtByFileId = importDates;
        scanStatus = [
          if (counts[LocalAudioImportOutcome.imported]! > 0)
            '가져옴 ${counts[LocalAudioImportOutcome.imported]}개',
          if (counts[LocalAudioImportOutcome.duplicate]! > 0)
            '중복 ${counts[LocalAudioImportOutcome.duplicate]}개',
          if (counts[LocalAudioImportOutcome.pending]! > 0)
            '분석 대기 ${counts[LocalAudioImportOutcome.pending]}개',
          if (counts[LocalAudioImportOutcome.failed]! > 0)
            '실패 ${counts[LocalAudioImportOutcome.failed]}개',
          if (counts[LocalAudioImportOutcome.cancelled]! > 0)
            '취소 ${counts[LocalAudioImportOutcome.cancelled]}개',
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

    CatalogRegistrationResult? registrationResult;
    CatalogRecordingDraft? registeredDraft;
    Future<String?> saveDraft(CatalogRecordingDraft draft) async {
      if (isCatalogSaving) return '저장하는 중입니다.';
      if (registeredDraft != null &&
          !_sameCatalogDraft(registeredDraft!, draft)) {
        return '앞선 입력은 이미 저장되었습니다. 변경한 내용은 저장되지 않았습니다. 원래 입력으로 다시 시도하거나 목록에서 편집해 주세요.';
      }
      setState(() {
        isCatalogSaving = true;
        scanStatus = '작품과 녹음을 저장하는 중입니다.';
      });
      try {
        if (registrationResult == null) {
          registrationResult = await catalog.register(draft, scannedFiles);
          registeredDraft = draft;
        }
        final result = registrationResult!;
        if (catalog.store is! SqliteClassicalCatalogStore) {
          for (final link in result.links) {
            await linkRepository.linkFileToTrack(
              fileId: link.fileId,
              trackId: link.trackId,
              linkedAt: DateTime.fromMillisecondsSinceEpoch(
                link.linkedAtMillis,
              ),
            );
            await repository.markLinked(link.fileId);
          }
        }
        final storedFiles = await repository.load();
        final links = await linkRepository.load();
        var storedLibrary = await catalog.load(storedFiles);
        if (widget.enableDemoFeatures) {
          storedLibrary = _libraryWithFiles(
            storedLibrary,
            _uniqueFiles([...widget.initialLibrary.files, ...storedFiles]),
          );
        }
        if (!mounted) return '화면이 닫혔습니다.';
        setState(() {
          library = storedLibrary;
          scannedFiles = storedFiles;
          final storedById = {for (final file in storedFiles) file.id: file};
          importFeedback = [
            for (final item in importFeedback)
              LocalImportFeedbackItem(
                selection: item.selection,
                result: item.result,
                file: storedById[item.file?.id] ?? item.file,
              ),
          ];
          fileTrackLinks = links;
          _rebuildPlaybackPlan();
          if (result.links.isNotEmpty && planner != null) {
            final newTrack = storedLibrary.track(result.links.first.trackId);
            lastRegisteredRecordingId = newTrack.recordingId;
            mode = PlaybackMode.recordingRandom;
            plan = planner!.createPlanForRecording(
              newTrack.recordingId,
              PlaybackMode.recordingRandom,
            );
          }
          scanStatus = '${result.links.length}개 악장을 작품과 녹음에 저장했습니다.';
        });
        return null;
      } on FormatException catch (error) {
        if (mounted) setState(() => scanStatus = error.message.toString());
        return error.message.toString();
      } catch (_) {
        const message = '작품과 녹음을 저장하지 못했습니다. 다시 시도해 주세요.';
        if (mounted) setState(() => scanStatus = message);
        return message;
      } finally {
        if (mounted) setState(() => isCatalogSaving = false);
      }
    }

    final completedDraft = await Navigator.of(context)
        .push<CatalogRecordingDraft>(
          MaterialPageRoute(
            builder: (context) => CatalogRegistrationScreen(
              library: library,
              files: files,
              candidates: metadataCandidates,
              overrides: metadataOverrides,
              onSave: saveDraft,
              canCancel: () => registrationResult == null,
            ),
          ),
        );
    if (completedDraft == null && registrationResult != null && mounted) {
      await _prepareStorage();
    }
  }

  int _needsReviewCount(List<LocalAudioFile> files) {
    return files
        .where((file) => file.importStatus == AudioImportStatus.needsReview)
        .length;
  }

  List<LocalFileLibraryEntry> get _fileEntries => fileLibrary.entries(
    files: scannedFiles,
    candidates: metadataCandidates,
    overrides: metadataOverrides,
  );

  List<LocalFileLibraryEntry> _entriesForCategory(
    List<LocalFileLibraryEntry> entries,
  ) {
    if (fileGroup == null || fileCategory == LocalFileCategory.songs) {
      return entries;
    }
    final selected = entries
        .where(
          (entry) => switch (fileCategory) {
            LocalFileCategory.albums =>
              fileLibrary.groupKey(entry, LocalFileCategory.albums) ==
                  fileGroup,
            LocalFileCategory.artists => entry.artist == fileGroup,
            LocalFileCategory.folders => entry.folder == fileGroup,
            LocalFileCategory.songs => true,
          },
        )
        .toList();
    if (fileCategory == LocalFileCategory.albums) {
      selected.sort((a, b) {
        final aTag = a.file.tagMetadata;
        final bTag = b.file.tagMetadata;
        final disc = (aTag?.discNumber ?? 1).compareTo(bTag?.discNumber ?? 1);
        if (disc != 0) return disc;
        final track = (aTag?.trackNumber ?? 99999).compareTo(
          bTag?.trackNumber ?? 99999,
        );
        return track != 0 ? track : a.title.compareTo(b.title);
      });
    }
    return selected;
  }

  Future<void> _playFile(
    LocalFileLibraryEntry selected,
    List<LocalFileLibraryEntry> visible,
  ) async {
    if (isPlaybackCommandRunning) return;
    if (!selected.isAvailable) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('오디오 파일을 찾을 수 없습니다. 파일 관리에서 확인해 주세요.')),
      );
      return;
    }
    final queue = fileLibrary.queue(visible, startingFileId: selected.file.id);
    await _runPlaybackCommand(() async {
      await playbackHistoryCoordinator.closeCurrent();
      await localPlayer.loadQueue(queue);
      if (localPlayer.playbackState.playerState != LocalPlayerState.error) {
        await localPlayer.play();
      }
    });
  }

  Future<bool> _savePlaylistMutation(
    Future<void> Function(LocalPlaylistRepository) mutation,
  ) async {
    final repository = localPlaylistRepository;
    if (repository == null || isPlaylistSaving) return false;
    setState(() => isPlaylistSaving = true);
    try {
      await mutation(repository);
      final updated = await repository.load();
      if (!mounted) return false;
      setState(() => playlists = updated);
      return true;
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              error is LocalPlaylistException
                  ? error.message
                  : '재생목록을 저장하지 못했습니다. 다시 시도해 주세요.',
            ),
          ),
        );
      }
      return false;
    } finally {
      if (mounted) setState(() => isPlaylistSaving = false);
    }
  }

  Future<void> _editPlaylistName([
    LocalPlaylist? existing,
    List<String> initialFileIds = const [],
  ]) async {
    var draft = existing?.name ?? '';
    var saving = false;
    await showDdiroriDialog<void>(
      context: context,
      title: existing == null ? '새 재생목록' : '재생목록 이름 변경',
      child: StatefulBuilder(
        builder: (dialogContext, setDialogState) => Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DdiroriInput(
              value: draft,
              label: '재생목록 이름',
              onChanged: (value) => setDialogState(() => draft = value),
            ),
            const SizedBox(height: 12),
            Wrap(
              alignment: WrapAlignment.end,
              spacing: 8,
              children: [
                DdiroriButton(
                  label: '취소',
                  kind: DdiroriButtonKind.quiet,
                  onPressed: saving ? null : () => Navigator.pop(dialogContext),
                ),
                DdiroriButton(
                  label: '저장',
                  busy: saving,
                  onPressed: saving || draft.trim().isEmpty
                      ? null
                      : () async {
                          setDialogState(() => saving = true);
                          LocalPlaylist? created;
                          final saved = await _savePlaylistMutation((
                            repository,
                          ) async {
                            if (existing == null) {
                              created = await repository.create(
                                draft,
                                initialFileIds: initialFileIds,
                              );
                            } else {
                              await repository.rename(existing.id, draft);
                            }
                          });
                          if (!dialogContext.mounted) return;
                          setDialogState(() => saving = false);
                          if (saved) {
                            if (created != null && mounted) {
                              setState(() {
                                selectedPlaylistId = created!.id;
                                homeView = _LibraryView.playlists;
                              });
                            }
                            Navigator.pop(dialogContext);
                          }
                        },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _addPlaylistFile(LocalPlaylist playlist) async {
    final candidates = _fileEntries
        .where(
          (entry) =>
              entry.isAvailable && !playlist.fileIds.contains(entry.file.id),
        )
        .toList();
    await showDdiroriSheet<void>(
      context: context,
      title: '재생목록에 곡 추가',
      child: _PlaylistSongPicker(
        candidates: candidates,
        onAdd: (ids) => _savePlaylistMutation(
          (repository) => repository.addFiles(playlist.id, ids),
        ),
      ),
    );
  }

  Future<void> _choosePlaylistForFiles(
    List<LocalFileLibraryEntry> entries,
  ) async {
    final ids = entries
        .where((entry) => entry.isAvailable)
        .map((entry) => entry.file.id)
        .toSet()
        .toList();
    if (isPlaylistSaving) return;
    if (ids.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('재생 가능한 파일이 없어 재생목록에 담을 수 없습니다.')),
      );
      return;
    }
    final missingCount = entries.length - ids.length;
    var saving = false;
    await showDdiroriSheet<void>(
      context: context,
      title: ids.length == 1 ? '재생목록에 추가' : '${ids.length}곡을 재생목록에 추가',
      child: StatefulBuilder(
        builder: (sheetContext, setSheetState) => Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (missingCount > 0) ...[
              Text('파일이 없는 $missingCount곡은 제외됩니다.'),
              const SizedBox(height: 8),
            ],
            DdiroriButton(
              label: '새 재생목록',
              icon: Icons.playlist_add,
              busy: saving,
              onPressed: saving
                  ? null
                  : () {
                      Navigator.pop(sheetContext);
                      unawaited(_editPlaylistName(null, ids));
                    },
            ),
            const SizedBox(height: 8),
            for (final playlist in playlists)
              DdiroriItem(
                key: ValueKey('destination-${playlist.id}'),
                flat: true,
                title: playlist.name,
                subtitle: '${playlist.fileIds.length}곡',
                leading: const Icon(Icons.queue_music_outlined),
                trailing: playlist.fileIds.toSet().containsAll(ids)
                    ? const Icon(Icons.check)
                    : const Icon(Icons.add),
                enabled: !saving,
                onTap: () async {
                  if (saving) return;
                  setSheetState(() => saving = true);
                  final saved = await _savePlaylistMutation(
                    (repository) => repository.addFiles(playlist.id, ids),
                  );
                  if (!sheetContext.mounted) return;
                  setSheetState(() => saving = false);
                  if (saved) Navigator.pop(sheetContext);
                },
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _addCurrentFileToPlaylist() async {
    final item = playbackState.currentItem;
    if (item == null || !item.isDirectFile) return;
    final fileId = fileLibrary.fileIdForTrack(item.trackId);
    final entry = _fileEntries
        .where((file) => file.file.id == fileId)
        .firstOrNull;
    if (entry == null) return;
    await _choosePlaylistForFiles([entry]);
  }

  Future<void> _deletePlaylist(LocalPlaylist playlist) async {
    final confirmed = await showDdiroriConfirmDialog(
      context: context,
      title: '재생목록 삭제',
      message: '${playlist.name}을(를) 삭제할까요? 음원 파일은 삭제되지 않습니다.',
      confirmLabel: '재생목록 삭제',
      danger: true,
    );
    if (!confirmed || !mounted) return;
    final deleted = await _savePlaylistMutation(
      (repository) => repository.delete(playlist.id),
    );
    if (deleted && mounted) setState(() => selectedPlaylistId = null);
  }

  Widget _buildPlaylistsView(List<LocalFileLibraryEntry> entries) {
    final selected = playlists
        .where((item) => item.id == selectedPlaylistId)
        .firstOrNull;
    if (selected == null) {
      return _PlaylistListPanel(
        playlists: playlists,
        busy: isPlaylistSaving,
        onCreate: () => unawaited(_editPlaylistName()),
        onSelect: (playlist) =>
            setState(() => selectedPlaylistId = playlist.id),
      );
    }
    final entriesById = {for (final entry in entries) entry.file.id: entry};
    final ordered = [for (final id in selected.fileIds) ?entriesById[id]];
    return _PlaylistDetailPanel(
      playlist: selected,
      entriesById: entriesById,
      busy: isPlaylistSaving || isPlaybackCommandRunning,
      currentTrackId: playbackState.currentItem?.trackId,
      onPlayAll: () {
        final first = ordered.where((entry) => entry.isAvailable).firstOrNull;
        if (first != null) unawaited(_playFile(first, ordered));
      },
      onPlayFile: (entry) => unawaited(_playFile(entry, ordered)),
      onAdd: () => unawaited(_addPlaylistFile(selected)),
      onRename: () => unawaited(_editPlaylistName(selected)),
      onDelete: () => unawaited(_deletePlaylist(selected)),
      onMissing: () => setState(() => homeView = _LibraryView.management),
      onTrackAction: (fileId, action) => unawaited(
        _savePlaylistMutation(
          (repository) => switch (action) {
            _PlaylistTrackAction.up => repository.moveFile(
              selected.id,
              fileId,
              -1,
            ),
            _PlaylistTrackAction.down => repository.moveFile(
              selected.id,
              fileId,
              1,
            ),
            _PlaylistTrackAction.remove => repository.removeFile(
              selected.id,
              fileId,
            ),
          },
        ),
      ),
      onReorder: (ids) => _savePlaylistMutation(
        (repository) => repository.reorderFiles(selected.id, ids),
      ),
    );
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
        builder: (context) => _withPlaybackScope(
          WorkDetailScreen(
            data: data,
            onOpenRecording: (recordingId) {
              unawaited(_openRecordingDetail(recordingId));
            },
            onPlayRecording: _playRecordingFromDetail,
          ),
        ),
      ),
    );
  }

  Future<void> _openRecordingDetail(String recordingId) async {
    final canonicalId = LibraryAliasIndex(libraryMerges)
        .resolve(LibraryEntityType.recording, recordingId);
    if (!library.recordings.any((recording) => recording.id == canonicalId)) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('현재 라이브러리에 녹음 정보가 없습니다.')));
      return;
    }
    final data = _detailBuilder().buildRecording(canonicalId);
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => _withPlaybackScope(
          RecordingDetailScreen(
            data: data,
            initialPlaybackState: localPlayer.playbackState,
            playbackStates: localPlayer.states,
            onPlayAll: () => _playRecordingFromDetail(data.recording.id),
            onPlayFromTrack: (trackId) => _playRecordingFromDetail(
              data.recording.id,
              fromTrackId: trackId,
            ),
          ),
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
    if (isPlaybackCommandRunning) return;
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
        final retryQueue = playbackState.hasQueue
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
      importFeedback = const [];
      importedAtByFileId = const {};
      scanLocations = const [];
      metadataCandidates = const [];
      metadataOverrides = const [];
      libraryMerges = const [];
      fileTrackLinks = const [];
      recentPlaybackHistory = const [];
      playbackHistoryStatistics = const PlaybackHistoryStatistics.empty();
      firstUseEligible = true;
      firstPlayAchieved = false;
      lastRegisteredRecordingId = null;
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
    _syncPlaybackView();
    try {
      await command();
    } finally {
      if (mounted) {
        setState(() {
          isPlaybackCommandRunning = false;
        });
        _syncPlaybackView();
      }
    }
  }

  void _openHomeTool(_HomeToolAction action) {
    switch (action) {
      case _HomeToolAction.playback:
        setState(() => homeView = _LibraryView.playback);
      case _HomeToolAction.management:
        setState(() => homeView = _LibraryView.management);
      case _HomeToolAction.listening:
        setState(() => homeView = _LibraryView.listening);
      case _HomeToolAction.discovery:
        unawaited(_openDiscovery());
      case _HomeToolAction.imslp:
        unawaited(_openImslpLibrary());
      case _HomeToolAction.libraryManagement:
        unawaited(_openLibraryManagement());
      case _HomeToolAction.folderBrowse:
        setState(() {
          fileCategory = LocalFileCategory.folders;
          fileGroup = null;
          fileQuery = '';
          homeView = _LibraryView.files;
        });
      case _HomeToolAction.playbackDiagnostic:
        unawaited(_openPlaybackDiagnostic());
      case _HomeToolAction.settings:
        unawaited(_openSettings());
    }
  }

  void _syncPlaybackView() {
    playbackView.value = PlayPlaybackSnapshot(
      playbackState,
      commandRunning: isPlaybackCommandRunning,
    );
  }

  Widget _withPlaybackScope(Widget child) => PlayPlaybackScope(
    snapshot: playbackView,
    onPlayPause: _togglePlayback,
    onNext: _nextPlaybackItem,
    onStop: _stopPlayback,
    onSeek: _seekPlayback,
    onAddToPlaylist: () => unawaited(_addCurrentFileToPlaylist()),
    child: child,
  );

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final activePlan = plan;
    final fileEntries = _fileEntries;
    final filteredFiles = fileLibrary.search(fileEntries, searchQuery);
    final categoryFiles = _entriesForCategory(fileEntries);
    final visibleFiles = fileLibrary.sort(
      fileLibrary.search(categoryFiles, fileQuery),
      fileSort,
      importedAtByFileId: importedAtByFileId,
    );
    final fileGroups = <String, List<LocalFileLibraryEntry>>{};
    if (homeView == _LibraryView.files && fileGroup == null) {
      for (final entry in fileLibrary.search(fileEntries, fileQuery)) {
        final group = fileLibrary.groupKey(entry, fileCategory);
        fileGroups.putIfAbsent(group, () => []).add(entry);
      }
    }
    final fileGroupNames = fileGroups.keys.toList()..sort();
    final recentFiles = fileLibrary.sort(
      fileEntries,
      LocalFileSort.dateAdded,
      importedAtByFileId: importedAtByFileId,
    );
    final recentItems = fileLibrary.recentlyAdded(
      fileEntries,
      importedAtByFileId: importedAtByFileId,
    );
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
    final searchFileIds = {
      for (final result in searchResults)
        if (result.type == SearchResultType.fileCandidate) result.id,
    };
    final searchFiles = [
      for (final entry in fileEntries)
        if (filteredFiles.contains(entry) ||
            searchFileIds.contains(entry.file.id))
          entry,
    ];

    return _withPlaybackScope(
      Scaffold(
        appBar: AppBar(
          title: homeView == _LibraryView.library
              ? null
              : Text(switch (homeView) {
                  _LibraryView.library => '보관함',
                  _LibraryView.files =>
                    (fileGroup == null
                            ? null
                            : fileCategory == LocalFileCategory.albums
                            ? fileGroup!.split('\u0000').first
                            : fileGroup) ??
                        switch (fileCategory) {
                          LocalFileCategory.songs => '곡',
                          LocalFileCategory.albums => '앨범',
                          LocalFileCategory.artists => '아티스트',
                          LocalFileCategory.folders => '폴더',
                        },
                  _LibraryView.search => '내 음악 검색',
                  _LibraryView.playlists =>
                    selectedPlaylistId == null
                        ? '재생목록'
                        : playlists
                                  .where(
                                    (item) => item.id == selectedPlaylistId,
                                  )
                                  .firstOrNull
                                  ?.name ??
                              '재생목록',
                  _LibraryView.playback => '재생 및 랜덤 재생',
                  _LibraryView.management => '가져오기·파일 상태',
                  _LibraryView.listening => '감상 기록',
                }),
          backgroundColor: colorScheme.surface,
          leading: homeView == _LibraryView.library
              ? null
              : IconButton(
                  tooltip: '뒤로',
                  icon: const Icon(Icons.arrow_back),
                  onPressed: () => setState(() {
                    if (homeView == _LibraryView.files && fileGroup != null) {
                      fileGroup = null;
                      fileQuery = '';
                      fileSort = LocalFileSort.title;
                    } else if (homeView == _LibraryView.playlists &&
                        selectedPlaylistId != null) {
                      selectedPlaylistId = null;
                    } else {
                      homeView = _LibraryView.library;
                      fileQuery = '';
                    }
                  }),
                ),
          actions: [
            if (homeView != _LibraryView.search)
              IconButton(
                onPressed: () => setState(() => homeView = _LibraryView.search),
                icon: const Icon(Icons.search),
                tooltip: '내 음악 검색',
              ),
            if (homeView == _LibraryView.library)
              IconButton(
                onPressed:
                    localAudioImportCoordinator == null ||
                        isScanning ||
                        isImportingFiles
                    ? null
                    : _importAudioFiles,
                icon: const Icon(Icons.file_open_outlined),
                tooltip: '음악 가져오기',
              ),
            PopupMenuButton<_HomeToolAction>(
              tooltip: '도구 더보기',
              onSelected: _openHomeTool,
              itemBuilder: (context) => [
                const PopupMenuItem(
                  value: _HomeToolAction.management,
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(Icons.folder_outlined),
                    title: Text('가져오기·파일 상태'),
                  ),
                ),
                const PopupMenuItem(
                  value: _HomeToolAction.listening,
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(Icons.history_outlined),
                    title: Text('감상 기록'),
                  ),
                ),
                PopupMenuItem(
                  value: _HomeToolAction.playback,
                  enabled: activePlan != null || playbackState.hasQueue,
                  child: const ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(Icons.queue_music_outlined),
                    title: Text('재생 계획'),
                  ),
                ),
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
                    title: Text('음원 정보·파일 복구'),
                  ),
                ),
                const PopupMenuItem(
                  value: _HomeToolAction.folderBrowse,
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(Icons.folder_outlined),
                    title: Text('폴더별 보기'),
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
            ),
          ],
        ),
        body: PlayPlaybackLayout(
          fullPlayerInBody: homeView == _LibraryView.playback,
          child: SafeArea(
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
                  const _PlayLibraryHeader(),
                  const SizedBox(height: 20),
                ],
                if (homeView == _LibraryView.library ||
                    homeView == _LibraryView.management) ...[
                  if (firstPlayAchieved)
                    const DdiroriBanner(
                      message: '첫 음악을 재생했어요.',
                      kind: DdiroriNoticeKind.success,
                    )
                  else if (lastRegisteredRecordingId != null)
                    DdiroriBanner(
                      message: '작품과 녹음을 저장했습니다. 준비되면 재생해 보세요.',
                      kind: DdiroriNoticeKind.success,
                      action: DdiroriButton(
                        label: '녹음 재생',
                        icon: Icons.play_arrow,
                        onPressed: isPlaybackCommandRunning
                            ? null
                            : () => _playRecordingFromDetail(
                                lastRegisteredRecordingId!,
                              ),
                      ),
                    ),
                  if (importFeedback.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    _ImportResultPanel(
                      items: importFeedback,
                      busy: isImportingFiles || isCatalogSaving,
                      onOrganize: (file) =>
                          unawaited(_openCatalogRegistration([file])),
                      onRetryFailed: () => unawaited(_retryFailedImports()),
                      onRetryAnalysis: () => unawaited(_retryPendingAnalysis()),
                    ),
                    const SizedBox(height: 16),
                  ],
                ],
                if (homeView == _LibraryView.library) ...[
                  if (isImportingFiles ||
                      scanStatus.startsWith('가져옴') ||
                      scanStatus.startsWith('중복') ||
                      scanStatus.startsWith('분석 대기') ||
                      scanStatus.startsWith('파일 가져오기가') ||
                      scanStatus.startsWith('파일을 가져오지'))
                    DdiroriBanner(
                      message: scanStatus,
                      kind: scanStatus.startsWith('파일을 가져오지')
                          ? DdiroriNoticeKind.error
                          : DdiroriNoticeKind.info,
                    ),
                  if (hasStorageInitializationError)
                    DdiroriBanner(
                      message: scanStatus,
                      kind: DdiroriNoticeKind.error,
                      action: DdiroriButton(
                        label: '보관함 다시 불러오기',
                        onPressed: isPreparingStorage ? null : _prepareStorage,
                      ),
                    )
                  else if (scannedFiles.any(
                    (file) => file.importStatus == AudioImportStatus.missing,
                  ))
                    DdiroriBanner(
                      message:
                          '파일 없음 ${scannedFiles.where((file) => file.importStatus == AudioImportStatus.missing).length}개',
                      kind: DdiroriNoticeKind.warning,
                      action: DdiroriIconButton(
                        label: '파일 상태 확인',
                        icon: Icons.rule_folder_outlined,
                        onPressed: () =>
                            setState(() => homeView = _LibraryView.management),
                      ),
                    ),
                  if (fileEntries.isEmpty && library.works.isEmpty)
                    _EmptyFileLibraryPanel(
                      onImport:
                          localAudioImportCoordinator == null ||
                              isImportingFiles ||
                              isScanning
                          ? null
                          : _importAudioFiles,
                    ),
                  _FileCategoryList(
                    entries: fileEntries,
                    onPlaylistsSelected: () => setState(() {
                      selectedPlaylistId = null;
                      homeView = _LibraryView.playlists;
                    }),
                    onCategorySelected: (category) => setState(() {
                      fileCategory = category;
                      fileGroup = null;
                      fileQuery = '';
                      fileSort = LocalFileSort.title;
                      homeView = _LibraryView.files;
                    }),
                  ),
                  if (fileEntries.isNotEmpty || library.works.isNotEmpty) ...[
                    if (recentItems.isNotEmpty) ...[
                      const SizedBox(height: 28),
                      _RecentFileSection(
                        items: recentItems.take(6).toList(),
                        onAll: () => setState(() {
                          fileCategory = LocalFileCategory.songs;
                          fileGroup = null;
                          fileSort = LocalFileSort.dateAdded;
                          fileQuery = '';
                          homeView = _LibraryView.files;
                        }),
                        onSelected: (item) {
                          if (item.isAlbum) {
                            setState(() {
                              fileCategory = LocalFileCategory.albums;
                              fileGroup = item.key.substring('album:'.length);
                              fileSort = LocalFileSort.trackOrder;
                              fileQuery = '';
                              homeView = _LibraryView.files;
                            });
                          } else if (!item.representative.isAvailable) {
                            setState(() => homeView = _LibraryView.management);
                          } else {
                            unawaited(
                              _playFile(item.representative, recentFiles),
                            );
                          }
                        },
                      ),
                    ],
                  ],
                  if (library.works.isNotEmpty) ...[
                    const SizedBox(height: 24),
                    Text(
                      '클래식 작품',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 8),
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
                if (homeView == _LibraryView.files) ...[
                  _FileBrowseToolbar(
                    query: fileQuery,
                    sort: fileSort,
                    showTrackOrder:
                        fileCategory == LocalFileCategory.albums &&
                        fileGroup != null,
                    onQueryChanged: (value) =>
                        setState(() => fileQuery = value),
                    onSortChanged: (value) => setState(() => fileSort = value),
                  ),
                  const SizedBox(height: 12),
                  if (fileEntries.isEmpty)
                    const DdiroriStatePanel(
                      title: '음악이 없습니다',
                      message: '보관함에서 음악 파일을 가져오세요.',
                    )
                  else if (visibleFiles.isEmpty &&
                      (fileCategory == LocalFileCategory.songs ||
                          fileGroup != null))
                    const DdiroriStatePanel(
                      title: '검색 결과가 없습니다',
                      message: '다른 검색어로 찾아보세요.',
                    )
                  else if (fileCategory == LocalFileCategory.songs ||
                      fileGroup != null)
                    for (final entry in visibleFiles)
                      _FileSongRow(
                        entry: entry,
                        current:
                            playbackState.currentItem?.trackId ==
                            '${LocalFileLibrary.trackPrefix}${entry.file.id}',
                        onTap: () => unawaited(_playFile(entry, visibleFiles)),
                        onMissing: () =>
                            setState(() => homeView = _LibraryView.management),
                        onAddToPlaylist: () =>
                            unawaited(_choosePlaylistForFiles([entry])),
                      )
                  else if (fileGroupNames.isEmpty)
                    const DdiroriStatePanel(
                      title: '검색 결과가 없습니다',
                      message: '다른 검색어로 찾아보세요.',
                    )
                  else
                    for (final name in fileGroupNames)
                      _FileGroupRow(
                        title: fileCategory == LocalFileCategory.albums
                            ? name.split('\u0000').first
                            : name,
                        icon: switch (fileCategory) {
                          LocalFileCategory.albums => Icons.album_outlined,
                          LocalFileCategory.artists => Icons.person_outline,
                          LocalFileCategory.folders => Icons.folder_outlined,
                          LocalFileCategory.songs => Icons.music_note_outlined,
                        },
                        subtitle: fileCategory == LocalFileCategory.albums
                            ? fileGroups[name]!.first.artist
                            : null,
                        count: fileGroups[name]!.length,
                        onAddToPlaylist:
                            fileCategory == LocalFileCategory.albums
                            ? () => unawaited(
                                _choosePlaylistForFiles(fileGroups[name]!),
                              )
                            : null,
                        onTap: () => setState(() {
                          fileGroup = name;
                          fileQuery = '';
                          if (fileCategory == LocalFileCategory.albums) {
                            fileSort = LocalFileSort.trackOrder;
                          }
                        }),
                      ),
                ],
                if (homeView == _LibraryView.playlists)
                  _buildPlaylistsView(fileEntries),
                if (homeView == _LibraryView.search) ...[
                  _SearchPanel(
                    query: searchQuery,
                    results: searchResults,
                    files: searchQuery.trim().isEmpty ? const [] : searchFiles,
                    onQueryChanged: _setSearchQuery,
                    onResultSelected: _openSearchResult,
                    onFileSelected: (file) =>
                        unawaited(_playFile(file, searchFiles)),
                    onMissingFile: () =>
                        setState(() => homeView = _LibraryView.management),
                    onAddFileToPlaylist: (file) =>
                        unawaited(_choosePlaylistForFiles([file])),
                  ),
                ],
                if (homeView == _LibraryView.management) ...[
                  Align(
                    alignment: AlignmentDirectional.centerEnd,
                    child: DdiroriIconButton(
                      label: '음원 정보 및 파일 복구 열기',
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
                  if (playbackState.currentItem?.isDirectFile ?? false) ...[
                    PlayNowPlayingControls(
                      state: playbackState,
                      canUseQueue: playbackState.hasQueue,
                      commandRunning: isPlaybackCommandRunning,
                      onPlayPause: _togglePlayback,
                      onNext: _nextPlaybackItem,
                      onStop: _stopPlayback,
                      onSeek: _seekPlayback,
                      onAddToPlaylist: _addCurrentFileToPlaylist,
                    ),
                    const SizedBox(height: 24),
                    Text(
                      '재생 대기열',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    for (
                      var index = 0;
                      index < playbackState.queue.length;
                      index += 1
                    )
                      PlayQueueRow(
                        index: index,
                        item: playbackState.queue[index],
                        current: index == playbackState.currentIndex,
                      ),
                  ] else if (activePlan != null) ...[
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
                      showControls:
                          !playbackState.hasQueue ||
                          !PlayPlaybackLayout.isWide(context),
                      onOpenRecording: (id) =>
                          unawaited(_openRecordingDetail(id)),
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
                      onAddToPlaylist: _addCurrentFileToPlaylist,
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

bool _sameCatalogDraft(
  CatalogRecordingDraft left,
  CatalogRecordingDraft right,
) {
  if (left.composerName != right.composerName ||
      left.workTitle != right.workTitle ||
      left.recordingTitle != right.recordingTitle ||
      left.existingWorkId != right.existingWorkId ||
      left.existingRecordingId != right.existingRecordingId ||
      left.catalogNumber != right.catalogNumber ||
      left.performerName != right.performerName ||
      left.conductorName != right.conductorName ||
      left.recordedYear != right.recordedYear ||
      left.movements.length != right.movements.length) {
    return false;
  }
  for (var index = 0; index < left.movements.length; index += 1) {
    final oldMovement = left.movements[index];
    final newMovement = right.movements[index];
    if (oldMovement.fileId != newMovement.fileId ||
        oldMovement.title != newMovement.title ||
        oldMovement.sequenceNumber != newMovement.sequenceNumber) {
      return false;
    }
  }
  return true;
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
