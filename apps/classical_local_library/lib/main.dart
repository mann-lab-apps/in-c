import 'dart:async';
import 'dart:io';

import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/foundation.dart';
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
import 'library_search_backend.dart';
import 'library_search_coordinator.dart';
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
import 'system_media.dart';
import 'local_audio_scanner.dart';
import 'local_audio_import.dart';
import 'local_import_feedback.dart';
import 'local_file_library.dart';
import 'local_playlists.dart';
import 'local_favorites.dart';
import 'library_view_settings.dart';
import 'library_artwork.dart';
import 'presentation/play_artwork.dart';
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
import 'presentation/play_playback_layout.dart';
import 'sample_classical_library.dart';
import 'scan_locations.dart';
import 'scanned_audio_store.dart';
import 'sqlite_database.dart';

part 'presentation/library_home_components.dart';
part 'presentation/local_file_library_components.dart';
part 'presentation/local_playlist_components.dart';
part 'presentation/library_navigation.dart';
part 'presentation/library_scroll_view.dart';
part 'presentation/library_sections_editor.dart';
part 'presentation/favorite_library.dart';

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
  editSections,
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
    this.systemMediaSession,
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
    this.localFavoritesRepository,
    this.viewSettingsStore,
    this.artworkRepository,
    this.artworkPicker,
    this.librarySearchBackend,
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
  final SystemMediaSession? systemMediaSession;
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
  final LocalFavoritesRepository? localFavoritesRepository;
  final LibraryViewSettingsStore? viewSettingsStore;
  final LibraryArtworkRepository? artworkRepository;
  final LibraryArtworkPicker? artworkPicker;
  final LibrarySearchBackend? librarySearchBackend;
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
        systemMediaSession: systemMediaSession,
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
        localFavoritesRepository: localFavoritesRepository,
        viewSettingsStore: viewSettingsStore,
        artworkRepository: artworkRepository,
        artworkPicker: artworkPicker,
        librarySearchBackend: librarySearchBackend,
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
    this.systemMediaSession,
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
    this.localFavoritesRepository,
    this.viewSettingsStore,
    this.artworkRepository,
    this.artworkPicker,
    this.librarySearchBackend,
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
  final SystemMediaSession? systemMediaSession;
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
  final LocalFavoritesRepository? localFavoritesRepository;
  final LibraryViewSettingsStore? viewSettingsStore;
  final LibraryArtworkRepository? artworkRepository;
  final LibraryArtworkPicker? artworkPicker;
  final LibrarySearchBackend? librarySearchBackend;
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
  final LocalFileLibrary fileLibrary = const LocalFileLibrary();
  ClassicalPlaybackPlanner? planner;
  PlaybackPlan? plan;
  PlaybackMode mode = PlaybackMode.workRandom;
  late final SerializedLocalPlaybackController localPlayer;
  late final PlaybackSystemMediaCoordinator? systemMedia;
  late final StreamSubscription<bool> commandAvailabilitySubscription;
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
  LocalFavoritesRepository? localFavoritesRepository;
  Set<String> favoriteIds = const {};
  bool isFavoriteSaving = false;
  String? favoriteError;
  String? musicNotice;
  Future<void> _favoriteWrite = Future.value();
  int _favoriteRefresh = 0;
  LibraryViewSettingsStore? viewSettingsStore;
  LibraryArtworkRepository? artworkRepository;
  bool isSavingArtwork = false;
  List<LocalAudioFile>? _artworkFilesSource;
  List<AudioFileTrackLink>? _artworkLinksSource;
  Map<String, LocalAudioFile> _artworkFiles = {};
  LibraryViewSettings viewSettings = LibraryViewSettings();
  bool hasInvalidViewSettings = false;
  bool hasArtworkLoadError = false;
  bool isSavingViewSettings = false;
  Future<void> _settingsWrite = Future.value();
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
  late final LibrarySearchCoordinator _searchCoordinator;
  bool _searchReady = false;
  Object? _searchInputs;
  int _searchRevision = 0;
  _LibraryView homeView = _LibraryView.library;
  final List<_LibraryVisit> _visits = [];
  int _visitId = 0;
  int _nextVisitId = 0;
  final _playlistDetailKeys = <int, GlobalKey<_PlaylistDetailPanelState>>{};
  final _pageChanges = ValueNotifier<int>(0);
  bool _pageChangesDisposed = false;
  bool _navigationPopPending = false;

  @override
  void setState(VoidCallback fn) {
    super.setState(fn);
    if (_searchReady) _refreshSearchSnapshot();
    // Routed pages observe the same owner; no player/repository is recreated.
    if (!_pageChangesDisposed) _pageChanges.value++;
  }

  final _playlistChanges = ValueNotifier<int>(0);
  String? _highlightPlaylistId;
  OverlayEntry? _playlistFeedbackEntry;
  bool _playlistRefreshFailed = false;
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
    final suppliedPlayer = widget.playbackController;
    localPlayer = suppliedPlayer is SerializedLocalPlaybackController
        ? suppliedPlayer
        : SerializedLocalPlaybackController(
            suppliedPlayer ??
                JustAudioLocalPlaybackController(
                  positionCoordinator: PlaybackPositionCoordinator(
                    store: positionStore,
                  ),
                ),
          );
    final mediaSession =
        widget.systemMediaSession ??
        (suppliedPlayer == null && Platform.isIOS
            ? IOSSystemMediaSession()
            : null);
    systemMedia = mediaSession == null
        ? null
        : PlaybackSystemMediaCoordinator(
            controller: localPlayer,
            session: mediaSession,
          );
    commandAvailabilitySubscription = localPlayer.commandAvailability.listen((
      _,
    ) {
      if (!mounted) return;
      setState(() {});
      _syncPlaybackView();
    });
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
    _searchCoordinator = LibrarySearchCoordinator(
      widget.librarySearchBackend ?? AdaptiveLibrarySearchBackend(),
    );
    _searchReady = true;
    _refreshSearchSnapshot();
    _searchCoordinator.addListener(_searchChanged);
    playbackSubscription = localPlayer.states.listen((state) {
      unawaited(playbackHistoryCoordinator.observe(state));
      unawaited(playbackQueueCoordinator.observe(state));
      if (!mounted) {
        return;
      }
      final previous = playbackState;
      final rebuild =
          homeView == _LibraryView.playback ||
          !identical(previous.queue, state.queue) ||
          previous.currentIndex != state.currentIndex ||
          previous.playerState != state.playerState ||
          previous.processingState != state.processingState ||
          previous.failure != state.failure ||
          previous.isSeeking != state.isSeeking ||
          previous.shuffleEnabled != state.shuffleEnabled ||
          previous.repeatMode != state.repeatMode ||
          previous.isChangingMode != state.isChangingMode ||
          previous.modeError != state.modeError ||
          previous.isEditingQueue != state.isEditingQueue ||
          previous.queueEditError != state.queueEditError ||
          previous.duration != state.duration;
      void update() {
        playbackState = state;
        if (firstUseEligible &&
            !firstPlayAchieved &&
            lastRegisteredRecordingId != null &&
            state.playerState == LocalPlayerState.playing &&
            state.currentItem?.recordingId == lastRegisteredRecordingId) {
          firstPlayAchieved = true;
        }
      }

      if (rebuild) {
        setState(update);
      } else {
        update();
      }
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
    _clearPlaylistFeedback();
    WidgetsBinding.instance.removeObserver(this);
    localImportCancellation?.cancel();
    _searchReady = false;
    _searchCoordinator.removeListener(_searchChanged);
    _searchCoordinator.dispose();
    unawaited(playbackSubscription.cancel());
    _playlistChanges.dispose();
    _pageChangesDisposed = true;
    _pageChanges.dispose();
    playbackView.dispose();
    unawaited(playbackHistorySubscription.cancel());
    unawaited(commandAvailabilitySubscription.cancel());
    unawaited(_disposePlayback());
    super.dispose();
  }

  Future<void> _disposePlayback() async {
    await _searchCoordinator.close();
    await _settingsWrite.catchError((Object _) {});
    artworkRepository?.dispose();
    await artworkRepository?.drained;
    await systemMedia?.dispose();
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
      unawaited(_persistPlaybackForLifecycle());
    }
  }

  Future<void> _persistPlaybackForLifecycle() async {
    if (isLifecycleCommandRunning) {
      return;
    }
    isLifecycleCommandRunning = true;
    try {
      // iOS background audio keeps the engine alive while its view is inactive.
      // Interruption and route-change events still pause through the session.
      if (defaultTargetPlatform != TargetPlatform.iOS &&
          localPlayer.playbackState.playerState == LocalPlayerState.playing) {
        await localPlayer.pause();
      } else {
        await localPlayer.persistPosition();
      }
    } on Object {
      // A lifecycle checkpoint failure must not interrupt ongoing playback.
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

  void _searchChanged() {
    if (mounted) setState(() {});
  }

  void _refreshSearchSnapshot() {
    final inputs = (
      library,
      scannedFiles,
      metadataCandidates,
      metadataOverrides,
      libraryMerges,
      fileTrackLinks,
    );
    if (inputs == _searchInputs) return;
    _searchInputs = inputs;
    final aliases = LibraryAliasIndex(libraryMerges);
    _searchCoordinator.replaceSnapshot(
      LibrarySearchSnapshot(
        revision: ++_searchRevision,
        library: library,
        files: scannedFiles,
        candidates: metadataCandidates,
        overrides: metadataOverrides,
        workAliases: aliases.aliasesFor(LibraryEntityType.work),
        recordingAliases: aliases.aliasesFor(LibraryEntityType.recording),
      ),
    );
  }

  void _setSearchQuery(String query) {
    setState(() => searchQuery = query);
    _searchCoordinator.submit(query);
  }

  void _syncSearchVisit() {
    if (homeView == _LibraryView.search) {
      _searchCoordinator.activate(searchQuery);
    } else {
      _searchCoordinator.suspend();
    }
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
    final favorites =
        widget.localFavoritesRepository ??
        localFavoritesRepository ??
        LocalFavoritesRepository(
          widget.scanRepository != null
              ? MemoryLocalFavoritesStore()
              : SqliteLocalFavoritesStore(await _openDefaultDatabase()),
        );
    Set<String> storedFavorites = const {};
    String? favoritesLoadError;
    try {
      storedFavorites = await favorites.load();
    } catch (_) {
      favoritesLoadError = '즐겨찾기를 불러오지 못했습니다. 다시 시도해 주세요.';
    }
    final settingsStore =
        widget.viewSettingsStore ??
        viewSettingsStore ??
        (widget.scanRepository != null
            ? MemoryLibraryViewSettingsStore()
            : SqliteLibraryViewSettingsStore(await _openDefaultDatabase()));
    LibraryViewSettings storedViewSettings;
    var invalidViewSettings = false;
    try {
      storedViewSettings = await settingsStore.load();
    } on FormatException {
      storedViewSettings = LibraryViewSettings();
      invalidViewSettings = true;
    }
    LibraryArtworkRepository? artwork;
    var artworkLoadError = false;
    try {
      artwork =
          widget.artworkRepository ??
          artworkRepository ??
          (widget.scanRepository == null
              ? await _defaultArtworkRepository()
              : null);
      await artwork?.initialize();
    } catch (_) {
      artwork?.dispose();
      artwork = null;
      artworkLoadError = true;
    }
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
      localFavoritesRepository = favorites;
      favoriteIds = storedFavorites;
      favoriteError = favoritesLoadError;
      viewSettingsStore = settingsStore;
      viewSettings = storedViewSettings;
      hasInvalidViewSettings = invalidViewSettings;
      hasArtworkLoadError = artworkLoadError;
      artworkRepository = artwork;
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
    _syncPlaybackView();
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
      await localPlayer.restoreQueue(recovery);
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
      } else if (snapshot.optionsInvalid) {
        scanStatus = '재생 모드를 복원하지 못해 저장된 곡 순서와 반복 끔으로 복구했습니다.';
      }
    });
  }

  List<LocalPlaybackQueueItem> _queueForSnapshot(
    PlaybackQueueSnapshot snapshot,
  ) {
    final directFiles = fileLibrary.queueForSnapshot(
      fileLibrary.entries(
        files: scannedFiles,
        candidates: metadataCandidates,
        overrides: metadataOverrides,
      ),
      snapshot.trackIds,
    );
    final recordingIds = <String>{};
    for (final trackId in snapshot.trackIds) {
      try {
        recordingIds.add(library.track(trackId).recordingId);
      } on StateError {
        continue;
      }
    }
    final activePlanner = planner;
    if (recordingIds.isEmpty || activePlanner == null) return directFiles;
    final plans = [
      for (final id in recordingIds)
        activePlanner.createPlanForRecording(id, PlaybackMode.recordingRandom),
    ];
    final restorationPlan = PlaybackPlan(
      mode: PlaybackMode.recordingRandom,
      work: plans.first.work,
      recording: plans.first.recording,
      items: [for (final plan in plans) ...plan.items],
    );
    final aliases = LibraryAliasIndex(libraryMerges);
    final classical = const LocalPlaybackQueueBuilder()
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
    // Recovery applies the saved occurrence order and selection to this catalog.
    return [...directFiles, ...classical];
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

  Future<LibraryArtworkRepository> _defaultArtworkRepository() async {
    final support = await getApplicationSupportDirectory();
    final directory = Directory('${support.path}/library_artwork');
    final repository = LibraryArtworkRepository(
      directory: directory,
      store: SqliteArtworkReferenceStore(await _openDefaultDatabase()),
    );
    await repository.initialize();
    await const PlatformBackupExclusionPolicy().exclude(directory.path);
    return repository;
  }

  Future<LocalDataControlService> _defaultLocalDataControlService() async {
    final database = await _openDefaultDatabase();
    final supportDirectory = await getApplicationSupportDirectory();
    final managedDirectories = [
      Directory('${supportDirectory.path}/managed_audio'),
      Directory('${supportDirectory.path}/imslp_imports'),
      Directory('${supportDirectory.path}/library_artwork'),
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
    await _runImport();
  }

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

  Future<LocalAudioImportBatchResult?> _runImport({
    List<int>? retryIndices,
    bool reportFailure = false,
  }) async {
    final coordinator = localAudioImportCoordinator;
    if (coordinator == null || isImportingFiles || isScanning) return null;

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
      if (!mounted) return null;
      if (selections.isEmpty) {
        setState(() => scanStatus = '파일 가져오기가 취소되었습니다.');
        return null;
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
      if (!mounted) return null;
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
      _syncPlaybackView();
      return result;
    } catch (_) {
      if (mounted) {
        setState(() => scanStatus = '파일을 가져오지 못했습니다. 다시 시도해 주세요.');
      }
      if (reportFailure) rethrow;
    } finally {
      if (identical(localImportCancellation, cancellation)) {
        localImportCancellation = null;
      }
      if (mounted) setState(() => isImportingFiles = false);
    }
    return null;
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
    _dismissLibraryNotices();
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

  Object? _derivedInputs;
  final _derivedValues = <Object, Object>{};
  T _derive<T extends Object>(Object key, T Function() compute) {
    final inputs = (
      scannedFiles,
      metadataCandidates,
      metadataOverrides,
      library,
      libraryMerges,
      fileTrackLinks,
      importedAtByFileId,
    );
    if (_derivedInputs != inputs) {
      _derivedInputs = inputs;
      _derivedValues.clear();
    }
    if (_derivedValues.containsKey(key)) return _derivedValues[key] as T;
    final value = compute();
    if (_derivedValues.length >= 32) {
      _derivedValues.remove(_derivedValues.keys.first);
    }
    _derivedValues[key] = value;
    return value;
  }

  List<LocalFileLibraryEntry> get _fileEntries => _derive(
    'entries',
    () => fileLibrary.entries(
      files: scannedFiles,
      candidates: metadataCandidates,
      overrides: metadataOverrides,
    ),
  );

  List<LocalFileLibraryEntry> _entriesForCategory(
    List<LocalFileLibraryEntry> entries,
    _LibraryVisit visit,
  ) {
    final fileGroup = visit.group;
    final fileCategory = visit.category;
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
    if (mounted &&
        localPlayer.playbackState.playerState == LocalPlayerState.playing) {
      _showMusicNotice('선택한 곡부터 재생합니다. 재생 대기열을 바꿨습니다.');
    }
  }

  LocalAudioFile? get _currentFavoriteFile {
    final id = playbackState.currentItem?.trackId;
    return id == null ? null : _artworkFileForTrack(id);
  }

  Future<void> _setFavorite(LocalFileLibraryEntry entry) async {
    final repository = localFavoritesRepository;
    if (repository == null || isFavoriteSaving) return;
    final enabled = !favoriteIds.contains(entry.file.id);
    final generation = ++_favoriteRefresh;
    setState(() {
      isFavoriteSaving = true;
      favoriteError = null;
    });
    _syncPlaybackView();
    try {
      _favoriteWrite = repository.setFavorite(entry.file.id, enabled);
      await _favoriteWrite;
      if (!mounted || generation != _favoriteRefresh) return;
      // A successful write is authoritative even when the subsequent refresh
      // fails. Never invite a second toggle by misreporting it as a save error.
      final committed = repository.lastSaved;
      if (committed != null) setState(() => favoriteIds = committed);
      try {
        final saved = await repository.load();
        if (!mounted || generation != _favoriteRefresh) return;
        setState(() => favoriteIds = saved);
      } catch (_) {
        if (mounted && generation == _favoriteRefresh) {
          const message = '저장은 완료했습니다. 즐겨찾기 목록을 다시 불러와 주세요.';
          setState(() => favoriteError = message);
          _showMusicNotice(message);
        }
        return;
      }
      _showMusicNotice(enabled ? '즐겨찾기에 추가했습니다.' : '즐겨찾기에서 해제했습니다.');
    } catch (_) {
      if (mounted && generation == _favoriteRefresh) {
        setState(() => favoriteError = '즐겨찾기를 저장하지 못했습니다. 다시 시도해 주세요.');
        _showMusicNotice('즐겨찾기를 저장하지 못했습니다. 다시 시도해 주세요.');
      }
    } finally {
      if (mounted) {
        setState(() => isFavoriteSaving = false);
        _syncPlaybackView();
      }
    }
  }

  Future<void> _reloadFavorites() async {
    final repository = localFavoritesRepository;
    if (repository == null) return;
    final previousError = favoriteError;
    final generation = ++_favoriteRefresh;
    try {
      final saved = await repository.load();
      if (!mounted || generation != _favoriteRefresh) return;
      setState(() {
        favoriteIds = saved;
        favoriteError = null;
        if (musicNotice == previousError) musicNotice = null;
      });
      _syncPlaybackView();
    } catch (_) {
      if (!mounted || generation != _favoriteRefresh) return;
      setState(() => favoriteError = '즐겨찾기를 불러오지 못했습니다. 다시 시도해 주세요.');
    }
  }

  void _showMusicNotice(String message) {
    _clearPlaylistFeedback();
    final messenger = ScaffoldMessenger.of(context);
    messenger.clearSnackBars();
    messenger.removeCurrentSnackBar();
    setState(() => musicNotice = message);
    _syncPlaybackView();
  }

  Future<void> _toggleCurrentFavorite() async {
    final file = _currentFavoriteFile;
    if (file == null) return;
    final entry = _fileEntries.where((e) => e.file.id == file.id).firstOrNull;
    if (entry != null) await _setFavorite(entry);
  }

  Future<void> _songAction(
    LocalFileLibraryEntry entry,
    _SongAction action,
  ) async {
    switch (action) {
      case _SongAction.play:
        await _playFile(entry, [entry]);
      case _SongAction.next:
        await _enqueueFiles([entry], next: true);
      case _SongAction.last:
        await _enqueueFiles([entry]);
      case _SongAction.favorite:
        await _setFavorite(entry);
      case _SongAction.playlist:
        await _choosePlaylistForFiles([entry]);
      case _SongAction.info:
        if (!mounted) return;
        await showDdiroriDialog<void>(
          context: context,
          title: '곡 정보',
          child: Text(
            '${entry.title}\n${entry.artist}\n${entry.album}\n${entry.file.format}\n${entry.isAvailable ? '보관함에서 재생 가능' : '파일 상태 확인 필요'}',
          ),
          actions: [
            DdiroriButton(
              label: '닫기',
              onPressed: () => Navigator.of(context).pop(),
            ),
          ],
        );
    }
  }

  Future<void> _queueEdit(Future<void> Function() action) async {
    try {
      await _runPlaybackCommand(action);
      final error = localPlayer.playbackState.queueEditError;
      if (mounted && error != null) {
        _showMusicNotice(error);
      }
    } catch (_) {
      if (mounted) {
        _showMusicNotice('대기열을 변경하지 못했습니다. 현재 재생을 확인하고 다시 시도해 주세요.');
      }
    }
  }

  Future<void> _enqueueFiles(
    List<LocalFileLibraryEntry> entries, {
    bool next = false,
  }) async {
    final queue = fileLibrary.queue(entries);
    if (queue.isEmpty) {
      if (mounted) {
        _showMusicNotice('추가할 수 있는 음원이 없습니다. 파일 상태를 확인해 주세요.');
      }
      return;
    }
    await _queueEdit(() async {
      final before = localPlayer.playbackState.queue.length;
      await localPlayer.enqueue(queue, next: next);
      if (mounted &&
          localPlayer.playbackState.failure == null &&
          localPlayer.playbackState.queueEditError == null) {
        final added = localPlayer.playbackState.queue.length - before;
        final skipped = entries.length - added;
        _showMusicNotice(
          '${added > 0 ? added : 0}곡을 ${next ? '바로 다음' : '대기열 마지막'}에 추가했습니다.${skipped <= 0 ? '' : ' 파일 상태 확인 필요 $skipped곡 제외.'}',
        );
      }
    });
  }

  Future<void> _openFavorites() => Navigator.of(context).push<void>(
    MaterialPageRoute(
      builder: (_) => _withPlaybackScope(
        ValueListenableBuilder<int>(
          valueListenable: _pageChanges,
          builder: (_, _, _) => _FavoriteLibrary(
            entries: _fileEntries,
            ids: favoriteIds,
            error: favoriteError,
            onRetry: () => unawaited(_reloadFavorites()),
            busy: isFavoriteSaving || isPlaybackCommandRunning,
            onPlay: (entry, visible) => unawaited(_playFile(entry, visible)),
            onAction: (entry, action) => unawaited(_songAction(entry, action)),
            onMissing: () {
              Navigator.of(context).pop();
              _navigateHome(() => homeView = _LibraryView.management);
            },
          ),
        ),
      ),
    ),
  );

  Future<bool> _savePlaylistMutation(
    Future<void> Function(LocalPlaylistRepository) mutation, {
    bool reportError = true,
  }) async {
    final repository = localPlaylistRepository;
    if (repository == null || isPlaylistSaving) return false;
    setState(() => isPlaylistSaving = true);
    _playlistRefreshFailed = false;
    _playlistChanges.value++;
    try {
      await mutation(repository);
      // A committed write must never be retried as a failed creation merely
      // because the following refresh failed.
      List<LocalPlaylist> updated;
      try {
        updated = await repository.load();
      } catch (_) {
        updated = repository.lastSaved ?? playlists;
        _playlistRefreshFailed = true;
        if (mounted) {
          showDdiroriToast(
            context,
            message: '저장은 완료했습니다. 목록 새로고침은 다시 시도해 주세요.',
          );
        }
      }
      if (!mounted) return false;
      setState(() => playlists = updated);
      _playlistChanges.value++;
      return true;
    } catch (error) {
      if (mounted && reportError) {
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
      if (mounted) {
        setState(() => isPlaylistSaving = false);
        _playlistChanges.value++;
      }
    }
  }

  Future<void> _editPlaylistName([
    LocalPlaylist? existing,
    List<String> initialFileIds = const [],
  ]) async {
    if (isPlaylistSaving) return;
    final origin = _visitId;
    final saved = await showDdiroriDialog<LocalPlaylist>(
      context: context,
      title: existing == null ? '새 재생목록' : '재생목록 이름 변경',
      child: _PlaylistEditor(
        existing: existing,
        candidates: _fileEntries.where((entry) => entry.isAvailable).toList(),
        initialIds: initialFileIds,
        onSave: (name, ids) async {
          LocalPlaylist? result;
          final success = await _savePlaylistMutation((repository) async {
            if (existing == null) {
              result = await repository.create(name, initialFileIds: ids);
            } else {
              await repository.rename(existing.id, name);
              result = repository.lastSaved!.firstWhere(
                (item) => item.id == existing.id,
              );
            }
          }, reportError: false);
          return success ? result : null;
        },
      ),
    );
    if (!mounted || saved == null || origin != _visitId) return;
    if (existing == null) {
      setState(() => _highlightPlaylistId = saved.id);
      _showPlaylistFeedback(
        saved,
        saved.fileIds.isEmpty
            ? '“${saved.name}” 재생목록을 만들었습니다.'
            : '“${saved.name}”을 만들고 ${saved.fileIds.length}곡을 추가했습니다.',
      );
    } else {
      showDdiroriToast(context, message: '재생목록 이름을 변경했습니다.');
    }
  }

  void _showPlaylistFeedback(LocalPlaylist playlist, String message) {
    _clearPlaylistFeedback();
    ScaffoldMessenger.of(context).clearSnackBars();
    final expandedText = MediaQuery.textScalerOf(context).scale(16) >= 24;
    if (MediaQuery.sizeOf(context).width < 480 && expandedText) {
      _playlistFeedbackEntry = OverlayEntry(
        builder: (overlayContext) => Positioned(
          left: 16,
          right: 16,
          bottom:
              MediaQuery.viewInsetsOf(overlayContext).bottom +
              MediaQuery.paddingOf(overlayContext).bottom +
              16,
          child: Material(
            color: DdiroriStyle.of(overlayContext)['surface'],
            elevation: DdiroriTokens.elevation['floating']!,
            borderRadius: BorderRadius.circular(DdiroriTokens.radius['card']!),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxHeight: MediaQuery.sizeOf(overlayContext).height * .7,
              ),
              child: SingleChildScrollView(
                child: Semantics(
                  liveRegion: true,
                  child: DdiroriBanner(
                    message: message,
                    action: Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        DdiroriButton(
                          label: '보기',
                          onPressed: () {
                            _clearPlaylistFeedback();
                            unawaited(_openPlaylistFeedback(playlist.id));
                          },
                        ),
                        DdiroriButton(
                          label: '닫기',
                          kind: DdiroriButtonKind.quiet,
                          onPressed: _clearPlaylistFeedback,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      Overlay.of(context).insert(_playlistFeedbackEntry!);
      return;
    }
    showDdiroriToast(
      context,
      message:
          '$message${_playlistRefreshFailed ? ' 저장은 완료했지만 새로고침하지 못해 마지막 저장 내용을 표시합니다.' : ''}',
      action: SnackBarAction(
        label: '보기',
        textColor: DdiroriStyle.of(context)['action'],
        onPressed: () => unawaited(_openPlaylistFeedback(playlist.id)),
      ),
    );
  }

  void _clearPlaylistFeedback() {
    _playlistFeedbackEntry?.remove();
    _playlistFeedbackEntry?.dispose();
    _playlistFeedbackEntry = null;
  }

  /// A real route also returns to Now Playing when creation started there.
  Future<void> _openPlaylistFeedback(String id) async {
    _clearPlaylistFeedback();
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    final detailKey = GlobalKey<_PlaylistDetailPanelState>();
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (routeContext) => ListenableBuilder(
          listenable: Listenable.merge([_playlistChanges, _pageChanges]),
          builder: (context, _) {
            final playlist = playlists
                .where((item) => item.id == id)
                .firstOrNull;
            return _withPlaybackScope(
              Scaffold(
                appBar: AppBar(
                  title: Text(playlist?.name ?? '재생목록'),
                  actions: [
                    if (playlist != null)
                      _playlistMenu(
                        playlist,
                        detailKey,
                        onDeleted: () {
                          if (routeContext.mounted) Navigator.pop(routeContext);
                        },
                      ),
                  ],
                ),
                body: PlayPlaybackLayout(
                  child: SafeArea(
                    child: _LibraryScrollView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        if (playlist == null)
                          const DdiroriStatePanel(
                            title: '재생목록이 없습니다',
                            message: '삭제된 재생목록입니다.',
                          )
                        else
                          _playlistDetail(
                            playlist,
                            _fileEntries,
                            detailKey,
                            onMissing: () =>
                                unawaited(_openLibraryManagement()),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
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
        onAdd: (ids) => _addFilesToPlaylist(playlist.id, ids),
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
    final missingCount = entries.where((entry) => !entry.isAvailable).length;
    final origin = _visitId;
    var createNew = false;
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
                      createNew = true;
                      Navigator.pop(sheetContext);
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
                  final saved = await _addFilesToPlaylist(
                    playlist.id,
                    ids,
                    excluded: missingCount,
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
    if (createNew && mounted && origin == _visitId) {
      await _editPlaylistName(null, ids);
    }
  }

  Future<bool> _addFilesToPlaylist(
    String id,
    List<String> ids, {
    int excluded = 0,
  }) async {
    final origin = _visitId;
    final before = playlists.where((item) => item.id == id).firstOrNull;
    if (before == null) return false;
    final added = ids.toSet().difference(before.fileIds.toSet()).length;
    final saved = await _savePlaylistMutation(
      (repository) => repository.addFiles(id, ids),
    );
    if (saved && mounted && origin == _visitId) {
      final after = playlists.where((item) => item.id == id).firstOrNull;
      if (after != null) {
        _showPlaylistFeedback(
          after,
          '${added == 0 ? '이미 “${after.name}”에 포함된 곡입니다.' : '“${after.name}”에 $added곡을 추가했습니다.'}'
          '${excluded == 0 ? '' : ' 파일이 없는 $excluded곡은 제외했습니다.'}',
        );
      }
    }
    return saved;
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

  Future<bool> _deletePlaylist(LocalPlaylist playlist) async {
    final confirmed = await showDdiroriConfirmDialog(
      context: context,
      title: '재생목록 삭제',
      message: '${playlist.name}을(를) 삭제할까요? 음원 파일은 삭제되지 않습니다.',
      confirmLabel: '재생목록 삭제',
      danger: true,
    );
    if (!confirmed || !mounted) return false;
    final deleted = await _savePlaylistMutation(
      (repository) => repository.delete(playlist.id),
    );
    if (deleted && artworkRepository != null) {
      try {
        await artworkRepository!.setPlaylist(playlist.id, null);
      } catch (_) {
        if (mounted) {
          showDdiroriToast(context, message: '목록은 삭제했습니다. 표지 정리는 다시 시도해 주세요.');
        }
      }
    }
    return deleted;
  }

  Widget _buildPlaylistsView(
    List<LocalFileLibraryEntry> entries,
    String? selectedPlaylistId,
    GlobalKey<_PlaylistDetailPanelState> detailKey,
  ) {
    final selected = playlists
        .where((item) => item.id == selectedPlaylistId)
        .firstOrNull;
    if (selected == null) {
      return _PlaylistListPanel(
        playlists: playlists,
        highlightedId: _highlightPlaylistId,
        busy: isPlaylistSaving || isSavingViewSettings,
        sort: viewSettings.playlistSort,
        onSort: (sort) => unawaited(
          _saveViewSettings(viewSettings.copyWith(playlistSort: sort)),
        ),
        onCreate: () => unawaited(_editPlaylistName()),
        onSelect: (playlist) => _navigateHome(() {
          this.selectedPlaylistId = playlist.id;
          _highlightPlaylistId = null;
        }),
      );
    }
    return _playlistDetail(selected, entries, detailKey);
  }

  Widget _playlistDetail(
    LocalPlaylist selected,
    List<LocalFileLibraryEntry> entries,
    GlobalKey<_PlaylistDetailPanelState> detailKey, {
    VoidCallback? onMissing,
  }) {
    final entriesById = {for (final entry in entries) entry.file.id: entry};
    List<LocalFileLibraryEntry> ordered(List<String> ids) => [
      for (final id in ids) ?entriesById[id],
    ];
    return _PlaylistDetailPanel(
      key: detailKey,
      playlist: selected,
      entriesById: entriesById,
      busy:
          isPlaylistSaving ||
          isPlaybackCommandRunning ||
          isSavingViewSettings ||
          isSavingArtwork,
      sort: viewSettings.trackSorts[selected.id] ?? PlaylistTrackSort.manual,
      onSort: (sort) => unawaited(
        _saveViewSettings(
          viewSettings.copyWith(
            trackSorts: {...viewSettings.trackSorts, selected.id: sort},
          ),
        ),
      ),
      currentTrackId: playbackState.currentItem?.trackId,
      onPlayAll: (ids) {
        final visible = ordered(ids);
        final first = visible.where((entry) => entry.isAvailable).firstOrNull;
        if (first != null) unawaited(_playFile(first, visible));
      },
      onPlayFile: (entry, ids) => unawaited(_playFile(entry, ordered(ids))),
      favoriteIds: favoriteIds,
      onSongAction: (entry, a) => unawaited(_songAction(entry, a)),
      onEnqueueAll: (ids, next) =>
          unawaited(_enqueueFiles(ordered(ids), next: next)),
      onAdd: () => unawaited(_addPlaylistFile(selected)),
      onMissing:
          onMissing ??
          () => _navigateHome(() => homeView = _LibraryView.management),
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

  Widget _playlistMenu(
    LocalPlaylist playlist,
    GlobalKey<_PlaylistDetailPanelState> key, {
    VoidCallback? onDeleted,
  }) => DdiroriMenuButton<_PlaylistAction>(
    label: '재생목록 더보기',
    enabled: !isPlaylistSaving && !isSavingArtwork && !isSavingViewSettings,
    onSelected: (action) async {
      switch (action) {
        case _PlaylistAction.edit:
          key.currentState?.startEditing();
        case _PlaylistAction.rename:
          await _editPlaylistName(playlist);
        case _PlaylistAction.changeCover:
          await _changePlaylistArtwork(playlist);
        case _PlaylistAction.removeCover:
          await _changePlaylistArtwork(playlist, remove: true);
        case _PlaylistAction.delete:
          if (await _deletePlaylist(playlist)) onDeleted?.call();
      }
    },
    itemBuilder: (context) => [
      const PopupMenuItem(value: _PlaylistAction.edit, child: Text('편집')),
      const PopupMenuItem(value: _PlaylistAction.rename, child: Text('이름 변경')),
      if (artworkRepository != null) ...[
        const PopupMenuItem(
          value: _PlaylistAction.changeCover,
          child: Text('표지 선택'),
        ),
        if (artworkRepository!.hashFor('playlist:${playlist.id}') != null)
          const PopupMenuItem(
            value: _PlaylistAction.removeCover,
            child: Text('표지 제거'),
          ),
      ],
      PopupMenuItem(
        value: _PlaylistAction.delete,
        child: Text(
          '재생목록 삭제',
          style: TextStyle(color: DdiroriStyle.of(context)['error']),
        ),
      ),
    ],
  );

  Future<void> _changePlaylistArtwork(
    LocalPlaylist playlist, {
    bool remove = false,
  }) async {
    final repository = artworkRepository;
    if (repository == null || isSavingArtwork) return;
    setState(() => isSavingArtwork = true);
    _playlistChanges.value++;
    try {
      final bytes = remove
          ? null
          : await (widget.artworkPicker ?? const PlatformLibraryArtworkPicker())
                .pick();
      if (!mounted ||
          (!remove && bytes == null) ||
          !playlists.any((p) => p.id == playlist.id)) {
        return;
      }
      await repository.setPlaylist(playlist.id, bytes);
      if (mounted) {
        _showLibraryNotice(remove ? '표지를 제거했습니다.' : '표지를 저장했습니다.');
      }
    } catch (error) {
      if (mounted) {
        _showLibraryNotice(
          error is FormatException
              ? error.message.toString()
              : '표지를 저장하지 못했습니다. 기존 표지는 유지됩니다.',
        );
      }
    } finally {
      if (mounted) {
        setState(() => isSavingArtwork = false);
        _playlistChanges.value++;
      }
    }
  }

  void _showLibraryNotice(String message) {
    _clearPlaylistFeedback();
    ScaffoldMessenger.of(context).clearSnackBars();
    showDdiroriToast(context, message: message);
  }

  void _dismissLibraryNotices() {
    if (musicNotice != null) {
      setState(() => musicNotice = null);
      _syncPlaybackView();
    }
    _clearPlaylistFeedback();
    final messenger = ScaffoldMessenger.of(context);
    messenger.clearSnackBars();
    messenger.removeCurrentSnackBar();
  }

  Future<bool> _saveViewSettings(LibraryViewSettings next) async {
    final store = viewSettingsStore;
    if (store == null || isSavingViewSettings) return false;
    setState(() => isSavingViewSettings = true);
    _playlistChanges.value++;
    try {
      _settingsWrite = store.save(next);
      await _settingsWrite;
      if (!mounted) return false;
      setState(() {
        viewSettings = next;
        hasInvalidViewSettings = false;
      });
      return true;
    } catch (_) {
      if (mounted) {
        showDdiroriToast(context, message: '표시 설정을 저장하지 못했습니다. 이전 설정을 유지합니다.');
      }
      return false;
    } finally {
      if (mounted) {
        setState(() => isSavingViewSettings = false);
        _playlistChanges.value++;
      }
    }
  }

  Future<void> _editLibrarySections() => showDdiroriDialog<void>(
    context: context,
    title: '보관함 분류 편집',
    child: _LibrarySectionsEditor(
      settings: viewSettings,
      onSave: (order, visible) => _saveViewSettings(
        viewSettings.copyWith(order: order, visible: visible),
      ),
    ),
  );

  _LibraryVisit _currentVisit() => _LibraryVisit(
    id: _visitId,
    view: homeView,
    category: fileCategory,
    group: fileGroup,
    query: fileQuery,
    sort: fileSort,
    search: searchQuery,
    playlistId: selectedPlaylistId,
  );

  void _navigateHome(VoidCallback change) {
    _dismissLibraryNotices();
    _searchCoordinator.suspend();
    setState(() {
      _visits.add(_currentVisit());
      _visitId = ++_nextVisitId;
      change();
    });
    _syncSearchVisit();
    final id = _visitId;
    var cached = _currentVisit();
    unawaited(
      Navigator.of(context)
          .push<void>(
            MaterialPageRoute(
              builder: (pageContext) => ValueListenableBuilder<int>(
                valueListenable: _pageChanges,
                builder: (context, _, _) {
                  if (_visitId == id) {
                    cached = _currentVisit();
                  } else {
                    cached =
                        _visits.where((visit) => visit.id == id).firstOrNull ??
                        cached;
                  }
                  return _buildLibraryPage(context, cached);
                },
              ),
            ),
          )
          .then((_) {
            _playlistDetailKeys.remove(id);
            if (mounted && _visitId == id) _restorePreviousVisit();
            _navigationPopPending = false;
          }),
    );
  }

  void _goBack() {
    _dismissLibraryNotices();
    if (_visits.isEmpty || _navigationPopPending) return;
    _navigationPopPending = true;
    Navigator.of(context).pop();
  }

  void _restorePreviousVisit() {
    if (_visits.isEmpty) return;
    _dismissLibraryNotices();
    _searchCoordinator.suspend();
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() {
      final previous = _visits.removeLast();
      _visitId = previous.id;
      homeView = previous.view;
      fileCategory = previous.category;
      fileGroup = previous.group;
      fileQuery = previous.query;
      fileSort = previous.sort;
      searchQuery = previous.search;
      selectedPlaylistId = previous.playlistId;
      if (selectedPlaylistId != null &&
          !playlists.any((item) => item.id == selectedPlaylistId)) {
        selectedPlaylistId = null;
      }
    });
    _syncSearchVisit();
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
            _syncPlaybackView();
            unawaited(_reloadFavorites());
            unawaited(_refreshPlayingMetadata());
          },
        ),
      ),
    );
  }

  Future<void> _refreshPlayingMetadata() async {
    final items = {
      for (final item in fileLibrary.queue(_fileEntries)) item.trackId: item,
    };
    final currentRecordingIds = localPlayer.playbackState.queue
        .where((item) => !item.isDirectFile)
        .map((item) => item.recordingId)
        .toSet();
    final activePlanner = planner;
    if (activePlanner != null) {
      for (final recording in library.recordings.where(
        (r) => currentRecordingIds.contains(r.id),
      )) {
        final currentPlan = activePlanner.createPlanForRecording(
          recording.id,
          PlaybackMode.recordingRandom,
        );
        for (final item in const LocalPlaybackQueueBuilder().build(
          plan: currentPlan,
          scannedFiles: scannedFiles,
          links: fileTrackLinks,
          candidates: metadataCandidates,
          overrides: metadataOverrides,
        )) {
          items[item.trackId] = item;
        }
      }
    }
    await localPlayer.updateMetadata(items);
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
    var coordinator = widget.imslpImportCoordinator;
    if (coordinator == null) {
      final supportDirectory = await getApplicationSupportDirectory();
      if (!mounted) return;
      coordinator = ImslpImportCoordinator(
        store: store,
        downloadService: const ImslpDownloadService(),
        destination: Directory('${supportDirectory.path}/imslp_imports'),
        scanner: audioFileScanner,
        scannedAudioRepository: scannedRepository,
        metadataCandidateRepository: candidateRepository,
      );
    }
    if (!mounted) return;
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => _withPlaybackScope(
          PlayPlaybackLayout(
            child: ImslpLibraryScreen(
              library: library,
              store: store,
              client: widget.imslpCatalogClient ?? HttpImslpCatalogClient(),
              importCoordinator: coordinator,
              onImportLocalFiles: _importImslpLocalFiles,
              onShowImportedFiles: _showImslpImportedFiles,
              onPlayImportedFiles: _playImslpImportedFiles,
              onAssociateSource: _associateImslpSource,
            ),
          ),
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
    _syncPlaybackView();
  }

  Future<ImslpLocalImportResult?> _importImslpLocalFiles() async {
    final batch = await _runImport(reportFailure: true);
    if (batch == null || !mounted) return null;
    final byId = {for (final file in batch.files) file.id: file};
    final byPath = {for (final file in batch.files) file.path: file};
    final imported = <String>{};
    for (final item in batch.items) {
      if (item.outcome == LocalAudioImportOutcome.failed ||
          item.outcome == LocalAudioImportOutcome.cancelled) {
        continue;
      }
      final file = byId[item.record?.fileId] ?? byPath[item.record?.localPath];
      if (file != null) imported.add(file.id);
    }
    final names = [
      for (final id in imported.take(3))
        (byId[id]!.fileName ?? byId[id]!.path)
            .replaceAll('\\', '/')
            .split('/')
            .last
            .replaceAll(RegExp(r'[\x00-\x1f\x7f]'), ' '),
    ];
    return ImslpLocalImportResult(
      fileIds: List.unmodifiable(imported),
      label: imported.isEmpty
          ? scanStatus
          : '${names.join(', ')}${imported.length > 3 ? ' 외 ${imported.length - 3}곡' : ''}\n${imported.length}곡 · $scanStatus',
    );
  }

  Future<List<LocalFileLibraryEntry>> _imslpImportedEntries(
    ImslpLocalImportResult result,
  ) async {
    final repository = scanRepository;
    if (repository == null) throw StateError('보관함을 먼저 준비해 주세요.');
    final files = await repository.load();
    final candidates = await metadataCandidateRepository!.load();
    if (!mounted) return const [];
    setState(() {
      scannedFiles = files;
      metadataCandidates = candidates;
    });
    _syncPlaybackView();
    final entries = {for (final entry in _fileEntries) entry.file.id: entry};
    return [
      for (final id in result.fileIds)
        if (entries[id] != null) entries[id]!,
    ];
  }

  Future<void> _showImslpImportedFiles(ImslpLocalImportResult result) async {
    await _imslpImportedEntries(result);
    if (!mounted) return;
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => _withPlaybackScope(
          ValueListenableBuilder<int>(
            valueListenable: _pageChanges,
            builder: (_, _, _) => _FavoriteLibrary(
              title: 'IMSLP에서 가져온 곡',
              emptyTitle: '가져온 곡을 찾을 수 없습니다',
              emptyMessage: '파일 관리에서 가져오기 결과와 파일 상태를 확인해 주세요.',
              entries: _fileEntries,
              ids: result.fileIds.toSet(),
              favoriteIds: favoriteIds,
              busy: isFavoriteSaving || isPlaybackCommandRunning,
              onPlay: (entry, visible) => unawaited(_playFile(entry, visible)),
              onAction: (entry, action) =>
                  unawaited(_songAction(entry, action)),
              onMissing: () => unawaited(_openLibraryManagement()),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _playImslpImportedFiles(ImslpLocalImportResult result) async {
    final entries = await _imslpImportedEntries(result);
    if (!mounted) return;
    final available = entries.where((entry) => entry.isAvailable).toList();
    if (available.isEmpty) throw StateError('재생할 수 있는 가져온 곡이 없습니다.');
    await _playFile(available.first, available);
  }

  Future<void> _associateImslpSource(
    ImslpWorkSearchResult source,
    ImslpLocalImportResult result,
  ) async {
    final repository = scanRepository;
    final url = ImslpUrlPolicy.normalizeOfficialHttps(
      source.pageUrl.toString(),
    );
    if (repository == null || url == null || result.fileIds.isEmpty) {
      throw StateError('출처와 가져온 곡을 다시 확인해 주세요.');
    }
    final files = await repository.load();
    final ids = result.fileIds.toSet();
    if (!ids.every((id) => files.any((file) => file.id == id))) {
      throw StateError('가져온 곡이 보관함에 없습니다.');
    }
    final reference = SourceReference(
      kind: SourceKind.imslp,
      url: url.removeFragment().toString(),
      externalId: source.externalId,
    );
    final saved = await repository.replaceAll([
      for (final file in files)
        if (ids.contains(file.id))
          file.copyWith(
            sourceReferences: [
              ...file.sourceReferences.where(
                (item) =>
                    item.kind != SourceKind.imslp ||
                    item.externalId != source.externalId,
              ),
              reference,
            ],
          )
        else
          file,
    ]);
    if (!mounted) return;
    setState(() => scannedFiles = saved);
    _syncPlaybackView();
  }

  Future<void> _togglePlayback() {
    return _runPlaybackCommand(() async {
      if (playbackState.playerState == LocalPlayerState.playing) {
        await localPlayer.pause();
      } else if (playbackState.playerState == LocalPlayerState.paused) {
        await localPlayer.resume();
      } else if (playbackState.hasQueue && playbackState.failure == null) {
        await localPlayer.play();
      } else {
        await playbackHistoryCoordinator.closeCurrent();
        final retryQueue = playbackState.hasQueue
            ? playbackState.queue
            : _currentLocalQueue();
        if (playbackState.hasQueue && playbackState.shuffleEnabled) {
          await localPlayer.restoreQueue(
            PlaybackQueueRecoveryResult(
              queue: retryQueue,
              skippedTrackIds: const [],
              hadSnapshot: true,
              queueOrder: playbackState.queueOrder,
              shuffleEnabled: playbackState.shuffleEnabled,
              repeatMode: playbackState.repeatMode,
            ),
          );
        } else {
          await localPlayer.loadQueue(retryQueue);
        }
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

  Future<void> _previousPlaybackItem() =>
      _runPlaybackCommand(localPlayer.previous);

  Future<void> _toggleShuffle() => _runPlaybackCommand(
    () => localPlayer.setShuffleEnabled(
      !localPlayer.playbackState.shuffleEnabled,
    ),
  );
  Future<void> _cycleRepeat() => _runPlaybackCommand(
    () => localPlayer.setRepeatMode(localPlayer.playbackState.repeatMode.next),
  );

  Future<void> _openPlaybackDiagnostic() async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => PlaybackDiagnosticScreen(
          runner: ExclusivePlaybackDiagnosticRunner(
            localPlayer,
            widget.playbackDiagnosticRunner ??
                LocalFixturePlaybackDiagnosticRunner(),
          ),
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
    await _drainFavorites();
    await playbackHistoryCoordinator.closeCurrent();
    await localPlayer.stop();
    await _loadStorage();
  }

  Future<void> _prepareLocalReset() async {
    await _drainFavorites();
    await _settingsWrite.catchError((Object _) {});
    await artworkRepository?.drained;
    // Drain playback writes before deleting data, including the queue retained by stop.
    await localPlayer.stop();
    await localPlayer.loadQueue(const []);
    await localPlayer.stop();
    await playbackHistoryCoordinator.observe(localPlayer.playbackState);
    await playbackHistoryCoordinator.closeCurrent();
    await playbackQueueCoordinator.clear();
    await playbackQueueCoordinator.flush();
  }

  Future<void> _drainFavorites() async {
    ++_favoriteRefresh;
    await _favoriteWrite.catchError((Object _) {});
    try {
      // load waits for repository mutations even when issued outside this UI.
      await localFavoritesRepository?.load();
    } catch (_) {
      // A read failure does not prevent a reset after the pending writes drain.
    }
  }

  Future<void> _applyLocalReset() async {
    await artworkRepository?.clear();
    if (!mounted) return;
    setState(() {
      library = emptyClassicalLibrary;
      scannedFiles = const [];
      favoriteIds = const {};
      favoriteError = null;
      musicNotice = null;
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
      viewSettings = LibraryViewSettings();
      firstPlayAchieved = false;
      lastRegisteredRecordingId = null;
      scanStatus = supportsFolderScan
          ? '음악 폴더를 추가하거나 음원 파일을 가져오세요.'
          : '음원 파일을 가져와 라이브러리를 시작하세요.';
      _rebuildPlaybackPlan();
    });
    _syncPlaybackView();
    await _reloadFavorites();
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
    if (isPlaybackCommandRunning || localPlayer.diagnosticActive) {
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
      case _HomeToolAction.editSections:
        unawaited(_editLibrarySections());
      case _HomeToolAction.playback:
        _navigateHome(() => homeView = _LibraryView.playback);
      case _HomeToolAction.management:
        _navigateHome(() => homeView = _LibraryView.management);
      case _HomeToolAction.listening:
        _navigateHome(() => homeView = _LibraryView.listening);
      case _HomeToolAction.discovery:
        unawaited(_openDiscovery());
      case _HomeToolAction.imslp:
        unawaited(_openImslpLibrary());
      case _HomeToolAction.libraryManagement:
        unawaited(_openLibraryManagement());
      case _HomeToolAction.folderBrowse:
        _navigateHome(() {
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
      commandRunning: isPlaybackCommandRunning || localPlayer.diagnosticActive,
      currentFavorite: favoriteIds.contains(_currentFavoriteFile?.id),
      canFavorite: _currentFavoriteFile != null,
      favoriteBusy: isFavoriteSaving,
      notice: musicNotice,
    );
  }

  LocalAudioFile? _artworkFileForTrack(String id) {
    if (!identical(_artworkFilesSource, scannedFiles) ||
        !identical(_artworkLinksSource, fileTrackLinks)) {
      final byId = {for (final file in scannedFiles) file.id: file};
      _artworkFiles = {
        for (final file in scannedFiles)
          '${LocalFileLibrary.trackPrefix}${file.id}': file,
        for (final link in fileTrackLinks)
          if (byId[link.fileId] != null) link.trackId: byId[link.fileId]!,
      };
      _artworkFilesSource = scannedFiles;
      _artworkLinksSource = fileTrackLinks;
    }
    return _artworkFiles[id];
  }

  Widget _wrapArtwork(Widget child) => LibraryArtworkScope(
    repository: artworkRepository,
    fileForTrack: _artworkFileForTrack,
    child: child,
  );

  Widget _withPlaybackScope(Widget child) => PlayPlaybackScope(
    snapshot: playbackView,
    onPlayPause: _togglePlayback,
    onNext: _nextPlaybackItem,
    onPrevious: _previousPlaybackItem,
    onShuffle: _toggleShuffle,
    onRepeat: _cycleRepeat,
    onStop: _stopPlayback,
    onSeek: _seekPlayback,
    onAddToPlaylist: () => unawaited(_addCurrentFileToPlaylist()),
    onToggleFavorite: () => unawaited(_toggleCurrentFavorite()),
    onRemoveQueueItem: (i) => _queueEdit(() => localPlayer.removeQueueItem(i)),
    onMoveQueueItem: (from, to) =>
        _queueEdit(() => localPlayer.moveQueueItem(from, to)),
    onClearUpcoming: () => _queueEdit(localPlayer.clearUpcoming),
    onDismissNotice: () {
      setState(() => musicNotice = null);
      _syncPlaybackView();
    },
    wrapPage: _wrapArtwork,
    child: _wrapArtwork(child),
  );

  String _viewTitleFor(_LibraryVisit visit) {
    final homeView = visit.view;
    final fileGroup = visit.group;
    final fileCategory = visit.category;
    final selectedPlaylistId = visit.playlistId;
    return switch (homeView) {
      _LibraryView.library => '보관함',
      _LibraryView.files =>
        (fileGroup == null
                ? null
                : fileCategory == LocalFileCategory.albums
                ? fileGroup.split('\u0000').first
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
                      .where((item) => item.id == selectedPlaylistId)
                      .firstOrNull
                      ?.name ??
                  '재생목록',
      _LibraryView.playback => '재생 및 랜덤 재생',
      _LibraryView.management => '가져오기·파일 상태',
      _LibraryView.listening => '감상 기록',
    };
  }

  @override
  Widget build(BuildContext context) {
    return _buildLibraryPage(
      context,
      _visits.isEmpty ? _currentVisit() : _visits.first,
    );
  }

  Widget _buildLibraryPage(BuildContext context, _LibraryVisit visit) {
    final homeView = visit.view;
    final fileCategory = visit.category;
    final fileGroup = visit.group;
    final fileQuery = visit.query;
    final fileSort = visit.sort;
    final searchQuery = visit.search;
    final selectedPlaylistId = visit.playlistId;
    final visitId = visit.id;
    final detailKey = _playlistDetailKeys.putIfAbsent(
      visitId,
      () => GlobalKey<_PlaylistDetailPanelState>(),
    );
    final colorScheme = Theme.of(context).colorScheme;
    final activePlan = plan;
    final fileEntries = _fileEntries;
    final visibleFiles = homeView != _LibraryView.files
        ? const <LocalFileLibraryEntry>[]
        : _derive(
            ('visible', fileCategory, fileGroup, fileQuery, fileSort),
            () => fileLibrary.sort(
              fileLibrary.search(
                _entriesForCategory(fileEntries, visit),
                fileQuery,
              ),
              fileSort,
              importedAtByFileId: importedAtByFileId,
            ),
          );
    final fileGroups =
        homeView != _LibraryView.files ||
            fileGroup != null ||
            fileCategory == LocalFileCategory.songs
        ? const <String, List<LocalFileLibraryEntry>>{}
        : _derive(('groups', fileCategory, fileQuery), () {
            final groups = <String, List<LocalFileLibraryEntry>>{};
            for (final entry in fileLibrary.search(fileEntries, fileQuery)) {
              groups
                  .putIfAbsent(
                    fileLibrary.groupKey(entry, fileCategory),
                    () => [],
                  )
                  .add(entry);
            }
            return groups;
          });
    final fileGroupNames = _derive(
      ('groupNames', fileCategory, fileGroup, fileQuery, fileSort, homeView),
      () => fileLibrary.sortedGroupKeys(
        fileGroups,
        fileSort,
        importedAtByFileId: importedAtByFileId,
      ),
    );
    final recentFiles = homeView != _LibraryView.library
        ? const <LocalFileLibraryEntry>[]
        : _derive(
            'recentFiles',
            () => fileLibrary.sort(
              fileEntries,
              LocalFileSort.dateAdded,
              importedAtByFileId: importedAtByFileId,
            ),
          );
    final recentItems = homeView != _LibraryView.library
        ? const <LocalFileRecentItem>[]
        : _derive(
            'recentItems',
            () => fileLibrary.recentlyAdded(
              fileEntries,
              importedAtByFileId: importedAtByFileId,
            ),
          );
    final searchView = _searchCoordinator.forQuery(searchQuery);
    final searchResults =
        searchView.batch?.results ?? const <LibrarySearchResult>[];
    final filesById = homeView == _LibraryView.search
        ? _derive(
            'fileEntriesById',
            () => {for (final file in fileEntries) file.file.id: file},
          )
        : const <String, LocalFileLibraryEntry>{};
    final searchFiles = [
      for (final id in searchView.batch?.fileIds ?? const <String>[])
        if (filesById[id] != null) filesById[id]!,
    ];

    return _withPlaybackScope(
      Scaffold(
        appBar: AppBar(
          toolbarHeight: MediaQuery.textScalerOf(context).scale(20) > 30
              ? DdiroriTokens.comfortableControl * 2
              : kToolbarHeight,
          title: homeView == _LibraryView.library
              ? null
              : Tooltip(
                  message: _viewTitleFor(visit),
                  child: Text(
                    _viewTitleFor(visit),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
          backgroundColor: colorScheme.surface,
          leading: homeView == _LibraryView.library
              ? null
              : IconButton(
                  tooltip: '뒤로',
                  icon: const Icon(Icons.arrow_back),
                  onPressed: _goBack,
                ),
          actions: [
            if (homeView != _LibraryView.search)
              IconButton(
                onPressed: () => _navigateHome(() {
                  this.homeView = _LibraryView.search;
                  this.searchQuery = '';
                }),
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
            if (homeView == _LibraryView.playlists &&
                selectedPlaylistId != null) ...[
              for (final playlist in playlists.where(
                (item) => item.id == selectedPlaylistId,
              ))
                _playlistMenu(playlist, detailKey, onDeleted: _goBack),
            ],
            if (homeView == _LibraryView.files &&
                fileGroup != null &&
                visibleFiles.any((entry) => entry.isAvailable))
              DdiroriMenuButton<_GroupAction>(
                label: '음악 묶음 더보기',
                enabled: !isPlaylistSaving && !isPlaybackCommandRunning,
                onSelected: (action) {
                  if (action == _GroupAction.addToPlaylist) {
                    unawaited(_choosePlaylistForFiles(visibleFiles));
                  } else if (action == _GroupAction.next ||
                      action == _GroupAction.last) {
                    unawaited(
                      _enqueueFiles(
                        visibleFiles,
                        next: action == _GroupAction.next,
                      ),
                    );
                  } else {
                    final first = visibleFiles
                        .where((entry) => entry.isAvailable)
                        .firstOrNull;
                    if (first != null) {
                      unawaited(_playFile(first, visibleFiles));
                    }
                  }
                },
                itemBuilder: (context) => [
                  if (visibleFiles.any((entry) => entry.isAvailable)) ...[
                    const PopupMenuItem(
                      value: _GroupAction.play,
                      child: Text('모두 재생'),
                    ),
                    const PopupMenuItem(
                      value: _GroupAction.next,
                      child: Text('바로 다음에 재생'),
                    ),
                    const PopupMenuItem(
                      value: _GroupAction.last,
                      child: Text('대기열 마지막에 추가'),
                    ),
                    const PopupMenuItem(
                      value: _GroupAction.addToPlaylist,
                      child: Text('재생목록에 추가'),
                    ),
                  ],
                ],
              ),
            if (homeView == _LibraryView.library)
              DdiroriMenuButton<_HomeToolAction>(
                label: '도구 더보기',
                onSelected: _openHomeTool,
                itemBuilder: (context) => [
                  PopupMenuItem(
                    value: _HomeToolAction.editSections,
                    enabled: !isSavingViewSettings,
                    child: const ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Icon(Icons.view_list_outlined),
                      title: Text('보관함 분류 편집'),
                    ),
                  ),
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
            child: _LibraryScrollView(
              key: PageStorageKey('library-visit-$visitId'),
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
                        onPressed: () => _navigateHome(
                          () => this.homeView = _LibraryView.management,
                        ),
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
                  if (hasInvalidViewSettings)
                    DdiroriBanner(
                      message: '표시 설정을 읽지 못해 기본 분류를 표시합니다. 음악은 유지됩니다.',
                      kind: DdiroriNoticeKind.warning,
                      action: DdiroriButton(
                        label: '분류 편집',
                        onPressed: () => unawaited(_editLibrarySections()),
                      ),
                    ),
                  if (hasArtworkLoadError)
                    const DdiroriBanner(
                      message: '표지를 불러오지 못했습니다. 기본 표지로 음악을 계속 사용할 수 있습니다.',
                      kind: DdiroriNoticeKind.warning,
                    ),
                  _FileCategoryList(
                    entries: fileEntries,
                    order: viewSettings.order,
                    visible: viewSettings.visible,
                    onEdit: () => unawaited(_editLibrarySections()),
                    onPlaylistsSelected: () => _navigateHome(() {
                      this.selectedPlaylistId = null;
                      this.homeView = _LibraryView.playlists;
                    }),
                    onCategorySelected: (category) => _navigateHome(() {
                      this.fileCategory = category;
                      this.fileGroup = null;
                      this.fileQuery = '';
                      this.fileSort = LocalFileSort.title;
                      this.homeView = _LibraryView.files;
                    }),
                  ),
                  _LibraryBrowseRow(
                    key: const ValueKey('file-category-favorites'),
                    title: '즐겨찾기',
                    subtitle: '${favoriteIds.length}곡',
                    leading: const Icon(Icons.favorite_border),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => unawaited(_openFavorites()),
                  ),
                  if (fileEntries.isNotEmpty || library.works.isNotEmpty) ...[
                    if (recentItems.isNotEmpty) ...[
                      const SizedBox(height: 28),
                      _RecentFileSection(
                        items: recentItems.take(6).toList(),
                        onAll: () => _navigateHome(() {
                          this.fileCategory = LocalFileCategory.songs;
                          this.fileGroup = null;
                          this.fileSort = LocalFileSort.dateAdded;
                          this.fileQuery = '';
                          this.homeView = _LibraryView.files;
                        }),
                        onSelected: (item) {
                          if (item.isAlbum) {
                            _navigateHome(() {
                              this.fileCategory = LocalFileCategory.albums;
                              this.fileGroup = item.key.substring(
                                'album:'.length,
                              );
                              this.fileSort = LocalFileSort.trackOrder;
                              this.fileQuery = '';
                              this.homeView = _LibraryView.files;
                            });
                          } else if (!item.representative.isAvailable) {
                            _navigateHome(
                              () => this.homeView = _LibraryView.management,
                            );
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
                    grouped:
                        fileCategory != LocalFileCategory.songs &&
                        fileGroup == null,
                    query: fileQuery,
                    sort: fileSort,
                    showTrackOrder:
                        fileCategory == LocalFileCategory.albums &&
                        fileGroup != null,
                    onQueryChanged: (value) =>
                        setState(() => this.fileQuery = value),
                    onSortChanged: (value) =>
                        setState(() => this.fileSort = value),
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
                    _LazyLibraryRows(
                      keys: [
                        for (final entry in visibleFiles)
                          'file-row-${entry.file.id}',
                      ],
                      builder: (context, index) {
                        final entry = visibleFiles[index];
                        return _FileSongRow(
                          entry: entry,
                          favorite: favoriteIds.contains(entry.file.id),
                          busy: isFavoriteSaving || isPlaybackCommandRunning,
                          onAction: (a) => unawaited(_songAction(entry, a)),
                          current:
                              playbackState.currentItem?.trackId ==
                              '${LocalFileLibrary.trackPrefix}${entry.file.id}',
                          onTap: () =>
                              unawaited(_playFile(entry, visibleFiles)),
                          onMissing: () => _navigateHome(
                            () => this.homeView = _LibraryView.management,
                          ),
                          onAddToPlaylist: () =>
                              unawaited(_choosePlaylistForFiles([entry])),
                        );
                      },
                    )
                  else if (fileGroupNames.isEmpty)
                    const DdiroriStatePanel(
                      title: '검색 결과가 없습니다',
                      message: '다른 검색어로 찾아보세요.',
                    )
                  else
                    _LazyLibraryRows(
                      keys: [
                        for (final name in fileGroupNames) 'file-group-$name',
                      ],
                      builder: (context, index) {
                        final name = fileGroupNames[index];
                        return _FileGroupRow(
                          file: fileCategory == LocalFileCategory.albums
                              ? fileGroups[name]!.first.file
                              : null,
                          title: fileCategory == LocalFileCategory.albums
                              ? name.split('\u0000').first
                              : name,
                          icon: switch (fileCategory) {
                            LocalFileCategory.albums => Icons.album_outlined,
                            LocalFileCategory.artists => Icons.person_outline,
                            LocalFileCategory.folders => Icons.folder_outlined,
                            LocalFileCategory.songs =>
                              Icons.music_note_outlined,
                          },
                          subtitle: fileCategory == LocalFileCategory.albums
                              ? fileGroups[name]!.first.artist
                              : null,
                          count: fileGroups[name]!.length,
                          onEnqueue: (next) => unawaited(
                            _enqueueFiles(
                              fileLibrary.sort(
                                fileGroups[name]!,
                                fileCategory == LocalFileCategory.albums
                                    ? LocalFileSort.trackOrder
                                    : fileSort,
                              ),
                              next: next,
                            ),
                          ),
                          onPlay: () {
                            final group = fileLibrary.sort(
                              fileGroups[name]!,
                              fileCategory == LocalFileCategory.albums
                                  ? LocalFileSort.trackOrder
                                  : fileSort,
                            );
                            final first = group
                                .where((e) => e.isAvailable)
                                .firstOrNull;
                            if (first != null) {
                              unawaited(_playFile(first, group));
                            }
                          },
                          onAddToPlaylist:
                              fileCategory == LocalFileCategory.albums
                              ? () => unawaited(
                                  _choosePlaylistForFiles(fileGroups[name]!),
                                )
                              : null,
                          onTap: () => _navigateHome(() {
                            this.fileGroup = name;
                            this.fileQuery = '';
                            if (fileCategory == LocalFileCategory.albums) {
                              this.fileSort = LocalFileSort.trackOrder;
                            }
                          }),
                        );
                      },
                    ),
                ],
                if (homeView == _LibraryView.playlists)
                  _buildPlaylistsView(
                    fileEntries,
                    selectedPlaylistId,
                    detailKey,
                  ),
                if (homeView == _LibraryView.search) ...[
                  _SearchPanel(
                    query: searchQuery,
                    searchView: searchView,
                    onRetry: _searchCoordinator.retry,
                    results: searchResults,
                    files: searchQuery.trim().isEmpty ? const [] : searchFiles,
                    onQueryChanged: _setSearchQuery,
                    onResultSelected: _openSearchResult,
                    onFileSelected: (file) =>
                        unawaited(_playFile(file, searchFiles)),
                    onMissingFile: () => _navigateHome(
                      () => this.homeView = _LibraryView.management,
                    ),
                    onAddFileToPlaylist: (file) =>
                        unawaited(_choosePlaylistForFiles([file])),
                    favoriteIds: favoriteIds,
                    songActionsBusy:
                        isFavoriteSaving || isPlaybackCommandRunning,
                    onSongAction: (entry, a) =>
                        unawaited(_songAction(entry, a)),
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
                    Builder(
                      builder: (context) {
                        final scope = PlayPlaybackScope.maybeOf(context)!;
                        final snapshot = scope.snapshot.value;
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            scope.controls(snapshot),
                            const SizedBox(height: 24),
                            Text(
                              '재생 대기열',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            scope.upcomingActions(context, snapshot),
                            for (
                              var index = 0;
                              index < playbackState.queue.length;
                              index++
                            )
                              scope.queueRow(snapshot, index),
                          ],
                        );
                      },
                    ),
                  ] else if (activePlan != null) ...[
                    _QueuePanel(
                      plan: activePlan,
                      scannedFiles: scannedFiles,
                      links: fileTrackLinks,
                      playbackState: playbackState,
                      isCommandRunning:
                          isPlaybackCommandRunning ||
                          localPlayer.diagnosticActive,
                      onPlayPausePressed: _togglePlayback,
                      onNextPressed: _nextPlaybackItem,
                      onPreviousPressed: _previousPlaybackItem,
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
                    Builder(
                      builder: (context) {
                        final scope = PlayPlaybackScope.maybeOf(context)!;
                        return scope.controls(scope.snapshot.value);
                      },
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
