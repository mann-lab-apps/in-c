import 'dart:io';
import 'dart:math';

import 'package:flutter/foundation.dart';

import 'sheet_annotation.dart';
import 'sheet_annotated_pdf_exporter.dart';
import 'sheet_auto_scroll.dart';
import 'sheet_file_import.dart';
import 'sheet_library_backup.dart';
import 'sheet_library_profile.dart';
import 'sheet_library_store.dart';
import 'sheet_library_view_settings.dart';
import 'sheet_metronome.dart';
import 'sheet_pdf_link_sanitizer.dart';
import 'sheet_pdf_page_transformer.dart';
import 'sheet_score.dart';
import 'sheet_setlist.dart';
import 'sheet_tone.dart';
import 'sheet_tuner.dart';

class SheetSetlistBulkAddResult {
  const SheetSetlistBulkAddResult({
    required this.addedCount,
    required this.skippedDuplicateCount,
    this.targetMissing = false,
    this.sourceMissing = false,
    this.skippedMissingCount = 0,
  });

  final int addedCount;
  final int skippedDuplicateCount;
  final bool targetMissing;
  final bool sourceMissing;
  final int skippedMissingCount;

  bool get didAddAny => addedCount > 0;
}

class SheetPdfBatchImportResult {
  const SheetPdfBatchImportResult({
    required this.importedScores,
    required this.existingScores,
  });

  static const empty = SheetPdfBatchImportResult(
    importedScores: <SheetScore>[],
    existingScores: <SheetScore>[],
  );

  final List<SheetScore> importedScores;
  final List<SheetScore> existingScores;

  List<SheetScore> get scores {
    return List<SheetScore>.unmodifiable(<SheetScore>[
      ...importedScores,
      ...existingScores,
    ]);
  }

  int get importedCount => importedScores.length;
  int get existingCount => existingScores.length;
  bool get isEmpty => importedScores.isEmpty && existingScores.isEmpty;
}

class SheetSongbookSplitResult {
  const SheetSongbookSplitResult({
    required this.createdScores,
    required this.skippedDuplicateCount,
  });

  final List<SheetScore> createdScores;
  final int skippedDuplicateCount;

  int get createdCount => createdScores.length;
  bool get didCreateAny => createdScores.isNotEmpty;
}

class SheetLibraryController extends ChangeNotifier {
  SheetLibraryController({required this.store});

  final SheetLibraryStore store;

  List<SheetScore> _scores = const <SheetScore>[];
  List<SheetSetlist> _setlists = const <SheetSetlist>[];
  SheetMetronomeSettings _metronomeSettings =
      SheetMetronomeSettings.defaultSettings;
  Future<void> _metronomeSaveTail = Future<void>.value();
  SheetTunerSettings _tunerSettings = SheetTunerSettings.defaultSettings;
  SheetToneSettings _toneSettings = SheetToneSettings.defaultSettings;
  SheetLibraryViewSettings _libraryViewSettings =
      SheetLibraryViewSettings.defaultSettings;
  SheetViewerSettings _globalViewerSettings =
      SheetViewerSettings.defaultSettings;
  List<SheetPerformancePresetTemplate> _performancePresetTemplates =
      const <SheetPerformancePresetTemplate>[];
  List<SheetLibraryProfile> _libraryProfiles = <SheetLibraryProfile>[
    SheetLibraryProfile.defaultProfile,
  ];
  SheetLibraryProfile _activeLibraryProfile =
      SheetLibraryProfile.defaultProfile;
  SheetAnnotationToolPreset? _favoriteAnnotationPreset;
  Object? _favoritePresetSaveRequest;
  Object? _viewSettingsSaveRequest;
  Object? _libraryLoadRequest;
  String _query = '';
  bool _isLoading = true;
  bool _isImporting = false;
  String? _errorMessage;
  bool _lastImportOpenedExistingScore = false;

  List<SheetScore> get scores => _scores;
  List<SheetSetlist> get setlists => _setlists;
  SheetMetronomeSettings get metronomeSettings => _metronomeSettings;
  SheetTunerSettings get tunerSettings => _tunerSettings;
  SheetToneSettings get toneSettings => _toneSettings;
  SheetLibraryViewSettings get libraryViewSettings => _libraryViewSettings;
  SheetViewerSettings get globalViewerSettings => _globalViewerSettings;
  List<SheetPerformancePresetTemplate> get performancePresetTemplates {
    return _performancePresetTemplates;
  }

  List<SheetLibraryProfile> get libraryProfiles => _libraryProfiles;
  SheetLibraryProfile get activeLibraryProfile => _activeLibraryProfile;
  SheetAnnotationToolPreset? get favoriteAnnotationPreset {
    return _favoriteAnnotationPreset;
  }

  String get query => _query;
  bool get isLoading => _isLoading;
  bool get isImporting => _isImporting;
  String? get errorMessage => _errorMessage;
  bool get lastImportOpenedExistingScore => _lastImportOpenedExistingScore;

  SheetLibraryProfile? libraryProfileByName(String name) {
    final normalized = _normalizeOptionalMetadata(name);
    if (normalized.isEmpty) {
      return null;
    }
    for (final profile in _libraryProfiles) {
      if (profile.name.toLowerCase() == normalized.toLowerCase()) {
        return profile;
      }
    }
    return null;
  }

  List<SheetScore> get filteredScores {
    return _libraryViewSettings.apply(_scores, query: _query);
  }

  List<SheetScore> get pinnedScores {
    final scores = _scores.where((score) => score.isPinned).toList();
    scores.sort(_recentScoreCompare);
    return List<SheetScore>.unmodifiable(scores);
  }

  List<SheetScore> get favoriteScores {
    final scores = _scores.where((score) => score.isFavorite).toList();
    scores.sort(_recentScoreCompare);
    return List<SheetScore>.unmodifiable(scores);
  }

  List<SheetScore> get recentScores {
    final scores = _scores
        .where((score) => score.lastOpenedAt != null)
        .toList();
    scores.sort(_recentScoreCompare);
    return List<SheetScore>.unmodifiable(scores);
  }

  List<SheetScore> get scoresNeedingMetadataReview {
    final scores = _scores.where(_needsMetadataReview).toList();
    scores.sort((a, b) {
      final importedCompare = b.importedAt.compareTo(a.importedAt);
      if (importedCompare != 0) {
        return importedCompare;
      }
      return a.displayTitle.toLowerCase().compareTo(
        b.displayTitle.toLowerCase(),
      );
    });
    return List<SheetScore>.unmodifiable(scores);
  }

  List<SheetSetlist> get recentSetlists {
    final setlists = _setlists
        .where((setlist) => setlist.lastOpenedAt != null)
        .toList();
    setlists.sort(_recentSetlistCompare);
    return List<SheetSetlist>.unmodifiable(setlists);
  }

  List<String> get allTags {
    final tags = _scores.expand((score) => score.tags).toSet().toList();
    tags.sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));
    return List<String>.unmodifiable(tags);
  }

  List<SheetLibraryFacet> get composerFacets {
    return _stringFacets(_scores.map((score) => score.composer));
  }

  List<String> get allCollections {
    final collections = _scores
        .map((score) => score.collection.trim())
        .where((collection) => collection.isNotEmpty)
        .toSet()
        .toList();
    collections.sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));
    return List<String>.unmodifiable(collections);
  }

  List<SheetLibraryFacet> get collectionFacets {
    return _stringFacets(_scores.map((score) => score.collection));
  }

  List<String> get allGroups {
    final groups = _scores
        .map((score) => score.group.trim())
        .where((group) => group.isNotEmpty)
        .toSet()
        .toList();
    groups.sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));
    return List<String>.unmodifiable(groups);
  }

  List<SheetLibraryFacet> get groupFacets {
    return _stringFacets(_scores.map((score) => score.group));
  }

  List<SheetLibraryFacet> customFieldFacets(String fieldKey) {
    final normalizedKey = fieldKey.trim().toLowerCase();
    if (normalizedKey.isEmpty) {
      return const <SheetLibraryFacet>[];
    }
    return _stringFacets(
      _scores.expand(
        (score) => score.customFields
            .where((field) => field.key.trim().toLowerCase() == normalizedKey)
            .map((field) => field.value),
      ),
    );
  }

  List<SheetLibraryFacet> get ratingFacets {
    final facets = <SheetLibraryFacet>[];
    for (var rating = 5; rating >= 1; rating -= 1) {
      final count = _scores.where((score) => score.rating >= rating).length;
      if (count > 0) {
        facets.add(
          SheetLibraryFacet(
            label: '$rating점 이상',
            value: rating.toString(),
            count: count,
          ),
        );
      }
    }
    return List<SheetLibraryFacet>.unmodifiable(facets);
  }

  Future<void> load() async {
    await _runLibraryLoad(
      errorMessage: '라이브러리를 불러오지 못했습니다. 앱을 다시 열어도 반복되면 백업 복원을 시도해주세요.',
    );
  }

  Future<void> _runLibraryLoad({
    required String errorMessage,
    Future<void> Function()? prepare,
    bool resetQuery = false,
  }) async {
    final request = _libraryLoadRequest = Object();
    final previousLibraryId = _activeLibraryProfile.id;
    _setLoading(true);
    try {
      if (prepare != null) await prepare();
      if (!identical(_libraryLoadRequest, request)) return;
      await _loadActiveLibraryState(request);
      if (identical(_libraryLoadRequest, request) && resetQuery) _query = '';
    } catch (_) {
      if (identical(_libraryLoadRequest, request)) {
        var restored = true;
        if (prepare != null) {
          try {
            final active = await store.loadActiveLibraryProfile();
            if (identical(_libraryLoadRequest, request) &&
                active.id != previousLibraryId) {
              await store.setActiveLibraryProfile(previousLibraryId);
              restored =
                  (await store.loadActiveLibraryProfile()).id ==
                  previousLibraryId;
            }
          } catch (_) {
            restored = false;
          }
        }
        if (identical(_libraryLoadRequest, request)) {
          _errorMessage = restored
              ? errorMessage
              : '$errorMessage 이전 라이브러리 선택도 복구하지 못했습니다. 앱을 다시 열어 저장 상태를 확인해주세요.';
        }
      }
    } finally {
      if (identical(_libraryLoadRequest, request)) {
        _libraryLoadRequest = null;
        _setLoading(false);
      }
    }
  }

  Future<void> _loadActiveLibraryState(Object request) async {
    final previousProfiles = _libraryProfiles;
    final previousActive = _activeLibraryProfile;
    final previousScores = _scores;
    final previousSetlists = _setlists;
    final previousMetronome = _metronomeSettings;
    final previousTuner = _tunerSettings;
    final previousTone = _toneSettings;
    final previousView = _libraryViewSettings;
    final previousViewRequest = _viewSettingsSaveRequest;
    final previousViewer = _globalViewerSettings;
    final previousTemplates = _performancePresetTemplates;
    final previousFavorite = _favoriteAnnotationPreset;
    final previousFavoriteRequest = _favoritePresetSaveRequest;
    final previousError = _errorMessage;
    final profiles = await store.loadLibraryProfiles();
    final active = await store.loadActiveLibraryProfile();
    final scores = await store.loadScores();
    final setlists = await store.loadSetlists();
    final metronome = await store.loadMetronomeSettings();
    final tuner = await store.loadTunerSettings();
    final tone = await store.loadToneSettings();
    final view = await store.loadLibraryViewSettings();
    final viewer = await store.loadGlobalViewerSettings();
    final templates = await store.loadPerformancePresetTemplates();
    final favorite = await store.loadFavoriteAnnotationPreset();
    if (!identical(_libraryLoadRequest, request)) return;
    // Publish one completed load; superseded reads must never clean up newer data.
    final sameLibrary = active.id == previousActive.id;
    if (identical(_libraryProfiles, previousProfiles)) {
      _libraryProfiles = profiles;
    }
    if (!sameLibrary || identical(_activeLibraryProfile, previousActive)) {
      _activeLibraryProfile = active;
    }
    if (!sameLibrary || identical(_scores, previousScores)) _scores = scores;
    if (!sameLibrary || identical(_setlists, previousSetlists)) {
      _setlists = setlists;
    }
    // Global settings remain global even when the selected library changes.
    if (identical(_metronomeSettings, previousMetronome)) {
      _metronomeSettings = metronome;
    }
    if (identical(_tunerSettings, previousTuner)) _tunerSettings = tuner;
    if (identical(_toneSettings, previousTone)) _toneSettings = tone;
    if (!sameLibrary ||
        (identical(_libraryViewSettings, previousView) &&
            identical(_viewSettingsSaveRequest, previousViewRequest))) {
      _libraryViewSettings = view;
      _viewSettingsSaveRequest = null;
    }
    if (identical(_globalViewerSettings, previousViewer)) {
      _globalViewerSettings = viewer;
    }
    if (!sameLibrary ||
        identical(_performancePresetTemplates, previousTemplates)) {
      _performancePresetTemplates = templates;
    }
    if (!sameLibrary ||
        (identical(_favoriteAnnotationPreset, previousFavorite) &&
            identical(_favoritePresetSaveRequest, previousFavoriteRequest))) {
      _favoriteAnnotationPreset = favorite;
      _favoritePresetSaveRequest = null;
    }
    if (!sameLibrary || _errorMessage == previousError) _errorMessage = null;
    await _removeMissingSetlistScores();
  }

  Future<SheetScore?> importPdf() async {
    if (_isImporting) {
      return null;
    }

    final libraryId = _activeLibraryProfile.id;
    _isImporting = true;
    _errorMessage = null;
    _lastImportOpenedExistingScore = false;
    notifyListeners();

    try {
      final importedScore = await store.importPdf();
      if (_activeLibraryProfile.id != libraryId) return null;
      final score = importedScore == null
          ? null
          : _withActiveCollection(importedScore);
      if (score == null) {
        return null;
      }
      final duplicate = _findLikelyImportedDuplicate(score);
      if (duplicate != null) {
        _lastImportOpenedExistingScore = true;
        return duplicate;
      }

      _scores = <SheetScore>[score, ..._scores];
      if (!await _saveImportedScores(libraryId)) return null;
      return score;
    } catch (error) {
      if (_activeLibraryProfile.id == libraryId) {
        _errorMessage = 'PDF를 가져오지 못했습니다. 파일이 PDF인지, Drive/iCloud/Dropbox 파일이 기기에 내려받아져 있는지 확인해주세요.';
      }
      return null;
    } finally {
      _isImporting = false;
      notifyListeners();
    }
  }

  Future<SheetPdfBatchImportResult> importPdfs() async {
    if (_isImporting) {
      return SheetPdfBatchImportResult.empty;
    }

    final libraryId = _activeLibraryProfile.id;
    _isImporting = true;
    _errorMessage = null;
    _lastImportOpenedExistingScore = false;
    notifyListeners();

    try {
      final rawScores = await store.importPdfs();
      if (_activeLibraryProfile.id != libraryId || rawScores.isEmpty) {
        return SheetPdfBatchImportResult.empty;
      }
      final importedScores = <SheetScore>[];
      final existingScores = <SheetScore>[];
      for (final rawScore in rawScores) {
        final score = _withActiveCollection(rawScore);
        final duplicate =
            _findLikelyImportedDuplicate(score) ??
            _findLikelyDuplicateIn(score, importedScores);
        if (duplicate != null) {
          existingScores.add(duplicate);
        } else {
          importedScores.add(score);
        }
      }

      if (importedScores.isNotEmpty) {
        _scores = <SheetScore>[...importedScores, ..._scores];
        if (!await _saveImportedScores(libraryId)) {
          return SheetPdfBatchImportResult.empty;
        }
      }
      _lastImportOpenedExistingScore = existingScores.isNotEmpty;
      return SheetPdfBatchImportResult(
        importedScores: List<SheetScore>.unmodifiable(importedScores),
        existingScores: List<SheetScore>.unmodifiable(existingScores),
      );
    } catch (error) {
      if (_activeLibraryProfile.id == libraryId) {
        _errorMessage = 'PDF를 가져오지 못했습니다. 파일이 PDF인지, Drive/iCloud/Dropbox 파일이 기기에 내려받아져 있는지 확인해주세요.';
      }
      return SheetPdfBatchImportResult.empty;
    } finally {
      _isImporting = false;
      notifyListeners();
    }
  }

  Future<SheetScore?> importImagesAsPdf() async {
    if (_isImporting) {
      return null;
    }

    final libraryId = _activeLibraryProfile.id;
    _isImporting = true;
    _errorMessage = null;
    _lastImportOpenedExistingScore = false;
    notifyListeners();

    try {
      final importedScore = await store.importImagesAsPdf();
      if (_activeLibraryProfile.id != libraryId) return null;
      final score = importedScore == null
          ? null
          : _withActiveCollection(importedScore);
      if (score == null) {
        return null;
      }

      _scores = <SheetScore>[score, ..._scores];
      if (!await _saveImportedScores(libraryId)) return null;
      return score;
    } catch (error) {
      if (_activeLibraryProfile.id == libraryId) {
        _errorMessage = _imageImportErrorMessage(error);
      }
      return null;
    } finally {
      _isImporting = false;
      notifyListeners();
    }
  }

  Future<List<SheetScore>> importSharedPdfFiles(
    List<SheetSharedImportFile> files,
  ) async {
    if (_isImporting || files.isEmpty) {
      return const <SheetScore>[];
    }

    final libraryId = _activeLibraryProfile.id;
    _isImporting = true;
    _errorMessage = null;
    _lastImportOpenedExistingScore = false;
    notifyListeners();

    try {
      final imported = <SheetScore>[];
      for (final sharedFile in files) {
        final rawScore = await store.importPdfFile(
          File(sharedFile.path),
          fileName: sharedFile.name,
        );
        if (_activeLibraryProfile.id != libraryId) return const <SheetScore>[];
        final score = _withActiveCollection(rawScore);
        imported.add(score);
      }
      if (imported.isEmpty) {
        return const <SheetScore>[];
      }
      _scores = <SheetScore>[...imported.reversed, ..._scores];
      if (!await _saveImportedScores(libraryId)) return const <SheetScore>[];
      return List<SheetScore>.unmodifiable(imported);
    } catch (error) {
      if (_activeLibraryProfile.id == libraryId) {
        _errorMessage = '공유받은 PDF를 가져오지 못했습니다. 원본 앱에서 파일을 기기에 저장하거나 클라우드 파일을 내려받은 뒤 다시 열어보세요.';
      }
      return const <SheetScore>[];
    } finally {
      _isImporting = false;
      notifyListeners();
    }
  }

  Future<bool> _saveImportedScores(String libraryId) async {
    try {
      await _saveScoreChanges();
      return _activeLibraryProfile.id == libraryId;
    } catch (_) {
      if (_activeLibraryProfile.id == libraryId) {
        _errorMessage = '악보 목록을 저장하지 못했습니다. 저장 공간을 확인한 뒤 다시 시도해주세요.';
      }
      return false;
    }
  }

  List<SheetScoreShareCandidate> shareCandidates(SheetScore score) {
    return store.shareCandidates(score);
  }

  SheetScore? _findLikelyImportedDuplicate(SheetScore importedScore) {
    final importedKey = _duplicateImportKey(importedScore);
    if (importedKey.length < 3) {
      return null;
    }
    for (final score in _scores) {
      if (score.id == importedScore.id) {
        continue;
      }
      if (_duplicateImportKey(score) == importedKey) {
        return score;
      }
    }
    return null;
  }

  SheetScore? _findLikelyDuplicateIn(
    SheetScore importedScore,
    Iterable<SheetScore> candidates,
  ) {
    final importedKey = _duplicateImportKey(importedScore);
    if (importedKey.length < 3) {
      return null;
    }
    for (final score in candidates) {
      if (score.id == importedScore.id) {
        continue;
      }
      if (_duplicateImportKey(score) == importedKey) {
        return score;
      }
    }
    return null;
  }

  String _duplicateImportKey(SheetScore score) {
    return score.sourceFileDisplayName
        .toLowerCase()
        .replaceAll(RegExp(r'[\s_\-]+'), ' ')
        .trim();
  }

  bool _needsMetadataReview(SheetScore score) {
    return score.composer.trim().isEmpty &&
        score.tags.isEmpty &&
        score.collection.trim().isEmpty &&
        score.group.trim().isEmpty &&
        score.rating <= 0 &&
        score.note.trim().isEmpty &&
        score.customFields.isEmpty;
  }

  Future<void> markOpened(SheetScore score) async {
    final current = scoreByIdOrNull(score.id);
    if (current == null) return;
    await _replace(current.copyWith(lastOpenedAt: DateTime.now()));
  }

  Future<void> updateLastPage(SheetScore score, int pageNumber) async {
    final current = scoreByIdOrNull(score.id);
    if (current == null || pageNumber < 1 || current.lastPage == pageNumber) {
      return;
    }

    await _replace(
      current.copyWith(
        lastPage: pageNumber,
        lastOpenedAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
    );
  }

  Future<void> toggleFavorite(SheetScore score) async {
    final current = scoreByIdOrNull(score.id);
    if (current == null) return;
    await _replace(
      current.copyWith(
        isFavorite: !current.isFavorite,
        updatedAt: DateTime.now(),
      ),
    );
  }

  Future<void> togglePinned(SheetScore score) async {
    final current = scoreByIdOrNull(score.id);
    if (current == null) return;
    await _replace(
      current.copyWith(isPinned: !current.isPinned, updatedAt: DateTime.now()),
    );
  }

  Future<bool> toggleBookmark(SheetScore score, int pageNumber) async {
    final current = scoreByIdOrNull(score.id);
    if (current == null || pageNumber < 1) {
      return false;
    }

    final existing = current.bookmarks
        .where((bookmark) => bookmark.pageNumber != pageNumber)
        .toList();
    final isRemoving = existing.length != current.bookmarks.length;
    final nextBookmarks = isRemoving
        ? existing
        : <SheetBookmark>[
            ...current.bookmarks,
            SheetBookmark(
              pageNumber: pageNumber,
              label: '$pageNumber쪽',
              createdAt: DateTime.now(),
            ),
          ];
    nextBookmarks.sort((a, b) => a.pageNumber.compareTo(b.pageNumber));

    await _replace(
      current.copyWith(
        bookmarks: List<SheetBookmark>.unmodifiable(nextBookmarks),
        updatedAt: DateTime.now(),
      ),
    );
    return true;
  }

  Future<bool> renameBookmark(
    SheetScore score,
    SheetBookmark bookmark,
    String label,
  ) async {
    final current = scoreByIdOrNull(score.id);
    if (current == null || !isBookmarked(current, bookmark.pageNumber)) {
      return false;
    }
    final nextBookmarks = current.bookmarks
        .map(
          (candidate) => candidate.pageNumber == bookmark.pageNumber
              ? candidate.copyWith(
                  label: _normalizeBookmarkLabel(label, bookmark.pageNumber),
                )
              : candidate,
        )
        .toList(growable: false);

    await _replace(
      current.copyWith(
        bookmarks: List<SheetBookmark>.unmodifiable(nextBookmarks),
        updatedAt: DateTime.now(),
      ),
    );
    return true;
  }

  Future<bool> deleteBookmark(SheetScore score, SheetBookmark bookmark) async {
    final current = scoreByIdOrNull(score.id);
    if (current == null || !isBookmarked(current, bookmark.pageNumber)) {
      return false;
    }
    await _replace(
      current.copyWith(
        bookmarks: List<SheetBookmark>.unmodifiable(
          current.bookmarks
              .where((candidate) => candidate.pageNumber != bookmark.pageNumber)
              .toList(growable: false),
        ),
        updatedAt: DateTime.now(),
      ),
    );
    return true;
  }

  bool isBookmarked(SheetScore score, int pageNumber) {
    return score.bookmarks.any((bookmark) => bookmark.pageNumber == pageNumber);
  }

  Future<bool> updateScoreMetadata(
    SheetScore score, {
    required String title,
    required String composer,
    required String tags,
    required String note,
    String? collection,
    String? group,
    int? rating,
    List<SheetLinkedFile>? linkedFiles,
    List<SheetCustomMetadataField>? customFields,
  }) async {
    final current = scoreByIdOrNull(score.id);
    if (current == null) return false;
    await _replace(
      current.copyWith(
        title: _normalizeScoreTitle(title, current.title),
        composer: composer.trim(),
        tags: _normalizeTags(tags),
        note: note.trim(),
        collection: _normalizeOptionalMetadata(
          collection ?? current.collection,
        ),
        group: _normalizeOptionalMetadata(group ?? current.group),
        rating: SheetScore.normalizeRating(rating ?? current.rating),
        linkedFiles: linkedFiles == null
            ? current.linkedFiles
            : SheetScore.normalizeLinkedFiles(linkedFiles),
        customFields: customFields == null
            ? current.customFields
            : SheetScore.normalizeCustomFields(customFields),
        updatedAt: DateTime.now(),
      ),
    );
    return true;
  }

  Future<void> createCollectionLibrary(String name) async {
    final normalized = _normalizeOptionalMetadata(name);
    if (normalized.isEmpty) {
      return;
    }
    await updateCollectionFilter(normalized);
  }

  Future<void> createLibraryProfile(String name) async {
    await _runLibraryLoad(
      errorMessage: '라이브러리를 만들지 못했습니다.',
      prepare: () async {
        await store.createLibraryProfile(name);
      },
      resetQuery: true,
    );
  }

  Future<void> switchLibraryProfile(String id) async {
    if (id == _activeLibraryProfile.id && !_isLoading) {
      return;
    }
    await _runLibraryLoad(
      errorMessage: '라이브러리를 전환하지 못했습니다.',
      prepare: () => store.setActiveLibraryProfile(id),
      resetQuery: true,
    );
  }

  Future<bool> renameLibraryProfile({
    required String id,
    required String name,
  }) async {
    final renamed = await store.renameLibraryProfile(id: id, name: name);
    if (renamed == null) {
      return false;
    }
    _libraryProfiles = await store.loadLibraryProfiles();
    if (_activeLibraryProfile.id == renamed.id) {
      _activeLibraryProfile = renamed;
    }
    notifyListeners();
    return true;
  }

  Future<bool> clearLibraryProfile(String id) async {
    final scores = _scores;
    final setlists = _setlists;
    final viewSettings = _libraryViewSettings;
    final favoritePreset = _favoriteAnnotationPreset;
    final didClear = await store.clearLibraryProfile(id);
    if (!didClear) {
      return false;
    }
    if (_activeLibraryProfile.id == id) {
      // Do not overwrite state claimed by an edit while clearing.
      if (identical(_scores, scores)) _scores = const <SheetScore>[];
      if (identical(_setlists, setlists)) _setlists = const <SheetSetlist>[];
      if (identical(_libraryViewSettings, viewSettings)) {
        _libraryViewSettings = SheetLibraryViewSettings.defaultSettings;
        _viewSettingsSaveRequest = null;
      }
      if (identical(_favoriteAnnotationPreset, favoritePreset)) {
        _favoriteAnnotationPreset = null;
        _favoritePresetSaveRequest = null;
      }
    }
    notifyListeners();
    return true;
  }

  Future<bool> deleteLibraryProfile(String id) async {
    final request = _libraryLoadRequest = Object();
    _setLoading(true);
    try {
      final didDelete = await store.deleteLibraryProfile(id);
      if (!didDelete) return false;
      if (identical(_libraryLoadRequest, request)) {
        await _loadActiveLibraryState(request);
      }
      return true;
    } finally {
      if (identical(_libraryLoadRequest, request)) {
        _libraryLoadRequest = null;
        _setLoading(false);
      }
    }
  }

  Future<int> renameCollectionLibrary({
    required String from,
    required String to,
  }) async {
    final fromName = _normalizeOptionalMetadata(from);
    final toName = _normalizeOptionalMetadata(to);
    if (fromName.isEmpty || toName.isEmpty) {
      return 0;
    }

    var changedCount = 0;
    final now = DateTime.now();
    _scores = _scores
        .map((score) {
          if (score.collection.toLowerCase() != fromName.toLowerCase()) {
            return score;
          }
          changedCount += 1;
          return score.copyWith(collection: toName, updatedAt: now);
        })
        .toList(growable: false);
    if (changedCount == 0) {
      return 0;
    }
    await store.saveScores(_scores);
    if (_libraryViewSettings.collectionQuery.toLowerCase() ==
        fromName.toLowerCase()) {
      _libraryViewSettings = _libraryViewSettings.copyWith(
        collectionQuery: toName,
      );
      await store.saveLibraryViewSettings(_libraryViewSettings);
    }
    notifyListeners();
    return changedCount;
  }

  Future<int> clearCollectionLibrary(String collection) async {
    final collectionName = _normalizeOptionalMetadata(collection);
    if (collectionName.isEmpty) {
      return 0;
    }

    var changedCount = 0;
    final now = DateTime.now();
    _scores = _scores
        .map((score) {
          if (score.collection.toLowerCase() != collectionName.toLowerCase()) {
            return score;
          }
          changedCount += 1;
          return score.copyWith(collection: '', updatedAt: now);
        })
        .toList(growable: false);
    if (changedCount == 0) {
      return 0;
    }
    await store.saveScores(_scores);
    if (_libraryViewSettings.collectionQuery.toLowerCase() ==
        collectionName.toLowerCase()) {
      _libraryViewSettings = _libraryViewSettings.copyWith(collectionQuery: '');
      await store.saveLibraryViewSettings(_libraryViewSettings);
    }
    notifyListeners();
    return changedCount;
  }

  Future<int> deleteScoresByIds(Set<String> scoreIds) async {
    final normalizedIds = scoreIds
        .map((id) => id.trim())
        .where((id) => id.isNotEmpty)
        .toSet();
    if (normalizedIds.isEmpty) {
      return 0;
    }

    final beforeCount = _scores.length;
    final remainingScores = _scores
        .where((score) => !normalizedIds.contains(score.id))
        .toList(growable: false);
    final deletedCount = beforeCount - remainingScores.length;
    if (deletedCount == 0) {
      return 0;
    }

    final validIds = remainingScores.map((score) => score.id).toSet();
    _scores = remainingScores;
    _setlists = _setlists
        .map((setlist) => setlist.removeMissingScores(validIds))
        .toList(growable: false);
    final pendingScores = _scores;
    final pendingSetlists = _setlists;
    final libraryId = _activeLibraryProfile.id;
    try {
      await store.saveScoresAndSetlists(
        pendingScores,
        pendingSetlists,
        libraryId: libraryId,
      );
    } catch (_) {
      // Recover each owned list independently; newer edits/profile switches win.
      if (_activeLibraryProfile.id == libraryId &&
          identical(_scores, pendingScores)) {
        try {
          final persisted = await store.loadScores();
          if (_activeLibraryProfile.id == libraryId &&
              identical(_scores, pendingScores)) {
            _scores = persisted;
          }
        } catch (_) {
          // Preserve the original write error even when recovery cannot read.
        }
      }
      if (_activeLibraryProfile.id == libraryId &&
          identical(_setlists, pendingSetlists)) {
        try {
          final persisted = await store.loadSetlists();
          if (_activeLibraryProfile.id == libraryId &&
              identical(_setlists, pendingSetlists)) {
            _setlists = persisted;
          }
        } catch (_) {
          // Still notify with the best available state and report failure.
        }
      }
      notifyListeners();
      rethrow;
    }
    notifyListeners();
    return deletedCount;
  }

  Future<void> updateStructuredNotes(
    SheetScore score,
    SheetScoreNotes notes,
  ) async {
    await _replace(
      score.copyWith(structuredNotes: notes, updatedAt: DateTime.now()),
    );
  }

  Future<SheetLinkedFile?> pickLinkedFile() {
    return store.pickLinkedFile();
  }

  Future<SheetLinkedFile?> addLinkedFile(SheetScore score) async {
    final linkedFile = await pickLinkedFile();
    if (linkedFile == null) {
      return null;
    }

    await _replace(
      score.copyWith(
        linkedFiles: SheetScore.normalizeLinkedFiles(<SheetLinkedFile>[
          ...score.linkedFiles,
          linkedFile,
        ]),
        updatedAt: DateTime.now(),
      ),
    );
    return linkedFile;
  }

  Future<bool> switchToLinkedFile(
    SheetScore score,
    SheetLinkedFile linkedFile,
  ) async {
    if (linkedFile.path.trim().isEmpty || linkedFile.path == score.filePath) {
      return false;
    }

    final currentFile = SheetLinkedFile(
      path: score.filePath,
      type: 'pdf',
      label: score.title,
      role: SheetLinkedFile.editedCopyRole,
      createdAt: DateTime.now(),
    );
    final nextLinkedFiles = <SheetLinkedFile>[
      currentFile,
      ...score.linkedFiles.where((file) => file.path != linkedFile.path),
    ];
    await _replace(
      score.copyWith(
        filePath: linkedFile.path,
        linkedFiles: SheetScore.normalizeLinkedFiles(nextLinkedFiles),
        updatedAt: DateTime.now(),
      ),
    );
    return true;
  }

  Future<bool> updateLinkedFile(
    SheetScore score,
    SheetLinkedFile linkedFile,
  ) async {
    var didUpdate = false;
    final nextLinkedFiles = score.linkedFiles
        .map((file) {
          if (file.path == linkedFile.path) {
            didUpdate = true;
            return linkedFile;
          }
          return file;
        })
        .toList(growable: false);
    if (!didUpdate) {
      return false;
    }
    await _replace(
      score.copyWith(
        linkedFiles: SheetScore.normalizeLinkedFiles(nextLinkedFiles),
        updatedAt: DateTime.now(),
      ),
    );
    return true;
  }

  Future<bool> removeLinkedFile(
    SheetScore score,
    SheetLinkedFile linkedFile,
  ) async {
    final nextLinkedFiles = score.linkedFiles
        .where((file) => file.path != linkedFile.path)
        .toList(growable: false);
    if (nextLinkedFiles.length == score.linkedFiles.length) {
      return false;
    }
    await _replace(
      score.copyWith(
        linkedFiles: SheetScore.normalizeLinkedFiles(nextLinkedFiles),
        updatedAt: DateTime.now(),
      ),
    );
    return true;
  }

  Future<void> updateViewerSettings(
    SheetScore score,
    SheetViewerSettings viewerSettings,
  ) async {
    await _replace(
      score.copyWith(viewerSettings: viewerSettings, updatedAt: DateTime.now()),
    );
  }

  Future<SheetPerformancePresetTemplate> savePerformancePresetTemplate({
    required String name,
    required SheetViewerSettings viewerSettings,
    String deviceProfile = '',
  }) async {
    final normalizedName = name.trim().isEmpty
        ? SheetPerformancePresetTemplate.defaultName
        : name.trim();
    SheetPerformancePresetTemplate? existing;
    for (final template in _performancePresetTemplates) {
      if (template.name.toLowerCase() == normalizedName.toLowerCase() &&
          template.deviceProfile.toLowerCase() ==
              deviceProfile.trim().toLowerCase()) {
        existing = template;
        break;
      }
    }
    final template = SheetPerformancePresetTemplate(
      id: existing?.id ?? _newPerformancePresetId(),
      name: normalizedName,
      viewerSettings: viewerSettings,
      deviceProfile: deviceProfile.trim(),
    );
    final next = <SheetPerformancePresetTemplate>[
      for (final item in _performancePresetTemplates)
        if (item.id != template.id) item,
      template,
    ];
    _performancePresetTemplates = SheetPerformancePresetTemplate.normalizeList(
      next,
    );
    await _savePerformanceTemplateChanges();
    return template;
  }

  Future<bool> deletePerformancePresetTemplate(String templateId) async {
    final next = _performancePresetTemplates
        .where((template) => template.id != templateId)
        .toList(growable: false);
    if (next.length == _performancePresetTemplates.length) {
      return false;
    }
    _performancePresetTemplates = SheetPerformancePresetTemplate.normalizeList(
      next,
    );
    await _savePerformanceTemplateChanges();
    return true;
  }

  Future<void> _savePerformanceTemplateChanges() async {
    final pending = _performancePresetTemplates;
    final libraryId = _activeLibraryProfile.id;
    bool ownsState() =>
        identical(_performancePresetTemplates, pending) &&
        _activeLibraryProfile.id == libraryId;
    try {
      await store.savePerformancePresetTemplates(pending, libraryId: libraryId);
    } catch (_) {
      if (ownsState()) {
        try {
          final persisted = await store.loadPerformancePresetTemplates();
          if (ownsState()) {
            _performancePresetTemplates = persisted;
            notifyListeners();
          }
        } catch (_) {
          // Preserve the write failure when recovery cannot read storage.
        }
      }
      rethrow;
    }
    notifyListeners();
  }

  Future<bool> applyPerformancePresetToScore(
    SheetScore score,
    String templateId,
  ) async {
    final template = performancePresetTemplateByIdOrNull(templateId);
    if (template == null) {
      return false;
    }
    await updateViewerSettings(score, template.viewerSettings);
    return true;
  }

  Future<bool> applyPerformancePresetToSetlist(
    SheetSetlist setlist,
    String templateId,
  ) async {
    final template = performancePresetTemplateByIdOrNull(templateId);
    if (template == null) {
      return false;
    }
    return updateSetlistRehearsalSettings(
      setlist,
      viewerSettingsOverride: template.viewerSettings,
    );
  }

  SheetPerformancePresetTemplate? performancePresetTemplateByIdOrNull(
    String id,
  ) {
    for (final template in _performancePresetTemplates) {
      if (template.id == id) {
        return template;
      }
    }
    return null;
  }

  Future<void> updatePageCrop(SheetScore score, SheetCropSettings crop) async {
    await _replace(
      score.copyWith(
        pageSettings: score.pageSettings.copyWith(crop: crop),
        updatedAt: DateTime.now(),
      ),
    );
  }

  Future<void> compactScoreForPageCount(SheetScore score, int pageCount) async {
    final nextPageSettings = score.pageSettings.compactForPageCount(pageCount);
    final nextAnnotationLayer = score.annotationLayer.compactForPageCount(
      pageCount,
    );
    if (identical(nextPageSettings, score.pageSettings) &&
        identical(nextAnnotationLayer, score.annotationLayer)) {
      return;
    }

    await _replace(
      score.copyWith(
        pageSettings: nextPageSettings,
        annotationLayer: nextAnnotationLayer,
        updatedAt: DateTime.now(),
      ),
    );
  }

  Future<void> updateAutoScrollSettings(
    SheetScore score,
    SheetAutoScrollSettings settings,
  ) async {
    await _replace(
      score.copyWith(autoScrollSettings: settings, updatedAt: DateTime.now()),
    );
  }

  Future<void> updateMetronomeSettings(SheetMetronomeSettings settings) async {
    _metronomeSettings = settings;
    await _enqueueMetronomeSave(() async {
      await store.saveMetronomeSettings(settings);
      notifyListeners();
    });
  }

  Future<void> _enqueueMetronomeSave(Future<void> Function() save) {
    final pending = _metronomeSaveTail.then((_) => save());
    // A failed request still reaches its caller without blocking later saves.
    _metronomeSaveTail = pending.then<void>(
      (_) {},
      onError: (Object error, StackTrace stackTrace) {},
    );
    return pending;
  }

  SheetMetronomeSettings metronomeSettingsForScore(
    SheetScore score, {
    String? setlistId,
  }) {
    final setlist = setlistId == null ? null : setlistByIdOrNull(setlistId);
    return setlist?.scoreMetronomeSettings[score.id] ??
        score.metronomeSettings ??
        _metronomeSettings;
  }

  Future<void> updateMetronomeSettingsForScore(
    SheetScore score,
    SheetMetronomeSettings settings, {
    String? setlistId,
  }) async {
    _metronomeSettings = settings;
    await _enqueueMetronomeSave(
      () => _saveMetronomeSettingsForScore(
        score.id,
        settings,
        setlistId: setlistId,
      ),
    );
  }

  Future<void> _saveMetronomeSettingsForScore(
    String scoreId,
    SheetMetronomeSettings settings, {
    String? setlistId,
  }) async {
    await store.saveMetronomeSettings(settings);
    final currentScore = scoreByIdOrNull(scoreId);
    if (currentScore == null) {
      notifyListeners();
      return;
    }
    final setlist = setlistId == null ? null : setlistByIdOrNull(setlistId);
    if (setlistId != null) {
      if (setlist == null || !setlist.scoreIds.contains(scoreId)) {
        notifyListeners();
        return;
      }
      await _replaceSetlist(
        setlist.copyWith(
          scoreMetronomeSettings:
              Map<String, SheetMetronomeSettings>.unmodifiable(
                <String, SheetMetronomeSettings>{
                  ...setlist.scoreMetronomeSettings,
                  scoreId: settings,
                },
              ),
          updatedAt: DateTime.now(),
        ),
      );
      return;
    }
    await _replace(
      currentScore.copyWith(
        metronomeSettings: settings,
        updatedAt: DateTime.now(),
      ),
    );
  }

  Future<void> updateTunerSettings(SheetTunerSettings settings) async {
    _tunerSettings = settings;
    await store.saveTunerSettings(settings);
    notifyListeners();
  }

  Future<void> updateToneSettings(SheetToneSettings settings) async {
    _toneSettings = settings;
    await store.saveToneSettings(settings);
    notifyListeners();
  }

  Future<void> updateFavoriteAnnotationPreset(
    SheetAnnotationToolPreset? preset,
  ) async {
    final pendingPreset = preset?.isValid == true ? preset : null;
    final libraryId = _activeLibraryProfile.id;
    final request = Object();
    _favoritePresetSaveRequest = request;
    _favoriteAnnotationPreset = pendingPreset;
    bool ownsState() =>
        identical(_favoritePresetSaveRequest, request) &&
        _activeLibraryProfile.id == libraryId &&
        identical(_favoriteAnnotationPreset, pendingPreset);
    try {
      await store.saveFavoriteAnnotationPreset(
        pendingPreset,
        libraryId: libraryId,
      );
    } catch (_) {
      if (ownsState()) {
        try {
          final persisted = await store.loadFavoriteAnnotationPreset();
          if (ownsState()) {
            _favoriteAnnotationPreset = persisted;
            notifyListeners();
          }
        } catch (_) {
          // Keep the original save failure when recovery is unavailable.
        }
      }
      rethrow;
    }
    notifyListeners();
  }

  Future<SheetPdfLinkSanitizationResult> createPdfLinkDisabledCopy(
    SheetScore score,
  ) async {
    final result = await store.createPdfLinkDisabledCopy(score);
    if (!result.didWrite || result.outputPath == null) {
      return result;
    }

    await _replace(
      score.copyWith(
        filePath: result.outputPath,
        pdfLinkSanitization: SheetPdfLinkSanitization(
          sanitizedFromPath: score.filePath,
          removedUrlLinkCount: result.removedUrlLinkCount,
          createdAt: DateTime.now(),
        ),
        updatedAt: DateTime.now(),
      ),
    );
    return result;
  }

  Future<SheetAnnotatedPdfExportResult> createAnnotatedPdfCopy(
    SheetScore score,
  ) {
    return store.createAnnotatedPdfCopy(score);
  }

  Future<SheetPdfPageRotationResult> createPageRotationAppliedCopy(
    SheetScore score,
  ) async {
    final result = await store.createPageRotationAppliedCopy(score);
    if (!result.didWrite || result.outputPath == null) {
      return result;
    }

    final originalFile = SheetLinkedFile(
      path: score.filePath,
      type: 'pdf',
      label: '회전 적용 전 원본',
      createdAt: DateTime.now(),
    );
    await _replace(
      score.copyWith(
        filePath: result.outputPath,
        pageSettings: score.pageSettings.copyWith(
          pageRotations: const <int, int>{},
        ),
        linkedFiles: SheetScore.normalizeLinkedFiles(<SheetLinkedFile>[
          originalFile,
          ...score.linkedFiles,
        ]),
        updatedAt: DateTime.now(),
      ),
    );
    return result;
  }

  Future<SheetPdfPageCropResult> createPageCropAppliedCopy(
    SheetScore score,
  ) async {
    final result = await store.createPageCropAppliedCopy(score);
    if (!result.didWrite || result.outputPath == null) {
      return result;
    }

    final originalFile = SheetLinkedFile(
      path: score.filePath,
      type: 'pdf',
      label: '자르기 적용 전 원본',
      createdAt: DateTime.now(),
    );
    await _replace(
      score.copyWith(
        filePath: result.outputPath,
        pageSettings: score.pageSettings.copyWith(
          crop: SheetCropSettings.none,
          pageCrops: const <int, SheetCropSettings>{},
        ),
        annotationLayer: _rebaseAnnotationsForAppliedCrop(
          score.annotationLayer,
          score.pageSettings,
        ),
        linkedFiles: SheetScore.normalizeLinkedFiles(<SheetLinkedFile>[
          originalFile,
          ...score.linkedFiles,
        ]),
        updatedAt: DateTime.now(),
      ),
    );
    return result;
  }

  Future<SheetPdfPageArrangementResult> createPageArrangementAppliedCopy(
    SheetScore score,
  ) async {
    final result = await store.createPageArrangementAppliedCopy(score);
    if (!result.didWrite || result.outputPath == null) {
      return result;
    }

    final originalFile = SheetLinkedFile(
      path: score.filePath,
      type: 'pdf',
      label: '페이지 정리 적용 전 원본',
      createdAt: DateTime.now(),
    );
    await _replace(
      score.copyWith(
        filePath: result.outputPath,
        lastPage:
            _firstMappedPage(result.sourcePageMapping, score.lastPage) ?? 1,
        bookmarks: _rebaseBookmarksForAppliedArrangement(
          score.bookmarks,
          result.sourcePageMapping,
        ),
        pageSettings: _rebasePageSettingsForAppliedArrangement(
          score.pageSettings,
          result,
        ),
        annotationLayer: _rebaseAnnotationsForAppliedArrangement(
          score.annotationLayer,
          result.sourcePageMapping,
        ),
        linkedFiles: SheetScore.normalizeLinkedFiles(<SheetLinkedFile>[
          originalFile,
          ...score.linkedFiles,
        ]),
        updatedAt: DateTime.now(),
      ),
    );
    return result;
  }

  SheetAnnotationLayer _rebaseAnnotationsForAppliedCrop(
    SheetAnnotationLayer layer,
    SheetPageSettings pageSettings,
  ) {
    if (!pageSettings.crop.hasCrop && pageSettings.pageCrops.isEmpty) {
      return layer;
    }

    return SheetAnnotationLayer(
      strokes: List<SheetAnnotationStroke>.unmodifiable(
        layer.strokes.map(
          (stroke) => _rebaseStrokeForAppliedCrop(stroke, pageSettings),
        ),
      ),
      texts: List<SheetTextAnnotation>.unmodifiable(
        layer.texts.map(
          (text) => _rebaseTextForAppliedCrop(text, pageSettings),
        ),
      ),
      redoStack: List<SheetAnnotationRedoEntry>.unmodifiable(
        layer.redoStack.map(
          (entry) => _rebaseRedoEntryForAppliedCrop(entry, pageSettings),
        ),
      ),
      layers: layer.layers,
    );
  }

  List<SheetBookmark> _rebaseBookmarksForAppliedArrangement(
    List<SheetBookmark> bookmarks,
    Map<int, List<int>> sourcePageMapping,
  ) {
    return List<SheetBookmark>.unmodifiable(
      bookmarks.map((bookmark) {
        final pageNumber = _firstMappedPage(
          sourcePageMapping,
          bookmark.pageNumber,
        );
        return pageNumber == null
            ? null
            : bookmark.copyWith(pageNumber: pageNumber);
      }).whereType<SheetBookmark>(),
    );
  }

  SheetPageSettings _rebasePageSettingsForAppliedArrangement(
    SheetPageSettings pageSettings,
    SheetPdfPageArrangementResult result,
  ) {
    return pageSettings.copyWith(
      hiddenPages: const <int>[],
      pageRotations: result.pageRotations,
      pageCrops: result.pageCrops,
      pageOrder: const <int>[],
      instanceRotations: const <int, int>{},
      instanceCrops: const <int, SheetCropSettings>{},
      jumpPoints: _rebaseJumpPointsForAppliedArrangement(
        pageSettings.jumpPoints,
        result.sourcePageMapping,
      ),
      rehearsalMarks: _rebaseRehearsalMarksForAppliedArrangement(
        pageSettings.rehearsalMarks,
        result.sourcePageMapping,
      ),
      blankPageInsertions: const <SheetBlankPageInsertion>[],
      visibilityPresets: const <SheetPageVisibilityPreset>[],
    );
  }

  List<SheetPageJumpPoint> _rebaseJumpPointsForAppliedArrangement(
    List<SheetPageJumpPoint> jumpPoints,
    Map<int, List<int>> sourcePageMapping,
  ) {
    return List<SheetPageJumpPoint>.unmodifiable(
      jumpPoints.map((jumpPoint) {
        final sourcePage = _firstMappedPage(
          sourcePageMapping,
          jumpPoint.sourcePage,
        );
        final targetPage = _firstMappedPage(
          sourcePageMapping,
          jumpPoint.targetPage,
        );
        if (sourcePage == null ||
            targetPage == null ||
            sourcePage == targetPage) {
          return null;
        }
        return jumpPoint.copyWith(
          sourcePage: sourcePage,
          targetPage: targetPage,
        );
      }).whereType<SheetPageJumpPoint>(),
    );
  }

  List<SheetRehearsalMark> _rebaseRehearsalMarksForAppliedArrangement(
    List<SheetRehearsalMark> marks,
    Map<int, List<int>> sourcePageMapping,
  ) {
    return List<SheetRehearsalMark>.unmodifiable(
      marks.map((mark) {
        final pageNumber = _firstMappedPage(sourcePageMapping, mark.pageNumber);
        return pageNumber == null
            ? null
            : mark.copyWith(pageNumber: pageNumber);
      }).whereType<SheetRehearsalMark>(),
    );
  }

  SheetAnnotationLayer _rebaseAnnotationsForAppliedArrangement(
    SheetAnnotationLayer layer,
    Map<int, List<int>> sourcePageMapping,
  ) {
    return SheetAnnotationLayer(
      strokes: List<SheetAnnotationStroke>.unmodifiable(
        layer.strokes.expand(
          (stroke) =>
              _rebaseStrokeForAppliedArrangement(stroke, sourcePageMapping),
        ),
      ),
      texts: List<SheetTextAnnotation>.unmodifiable(
        layer.texts.expand(
          (text) => _rebaseTextForAppliedArrangement(text, sourcePageMapping),
        ),
      ),
      redoStack: List<SheetAnnotationRedoEntry>.unmodifiable(
        layer.redoStack.expand(
          (entry) =>
              _rebaseRedoEntryForAppliedArrangement(entry, sourcePageMapping),
        ),
      ),
      layers: layer.layers,
    );
  }

  Iterable<SheetAnnotationStroke> _rebaseStrokeForAppliedArrangement(
    SheetAnnotationStroke stroke,
    Map<int, List<int>> sourcePageMapping,
  ) {
    final pages = sourcePageMapping[stroke.pageNumber] ?? const <int>[];
    return [
      for (final pageNumber in pages)
        SheetAnnotationStroke(
          id: pages.length == 1 ? stroke.id : '${stroke.id}-page$pageNumber',
          pageNumber: pageNumber,
          tool: stroke.tool,
          color: stroke.color,
          width: stroke.width,
          points: stroke.points,
          createdAt: stroke.createdAt,
        ),
    ];
  }

  Iterable<SheetTextAnnotation> _rebaseTextForAppliedArrangement(
    SheetTextAnnotation text,
    Map<int, List<int>> sourcePageMapping,
  ) {
    final pages = sourcePageMapping[text.pageNumber] ?? const <int>[];
    return [
      for (final pageNumber in pages)
        text.copyWith(
          pageNumber: pageNumber,
          id: pages.length == 1 ? text.id : '${text.id}-page$pageNumber',
        ),
    ];
  }

  Iterable<SheetAnnotationRedoEntry> _rebaseRedoEntryForAppliedArrangement(
    SheetAnnotationRedoEntry entry,
    Map<int, List<int>> sourcePageMapping,
  ) {
    final stroke = entry.stroke;
    if (stroke != null) {
      return _rebaseStrokeForAppliedArrangement(
        stroke,
        sourcePageMapping,
      ).map(SheetAnnotationRedoEntry.stroke);
    }
    final text = entry.text;
    if (text != null) {
      return _rebaseTextForAppliedArrangement(
        text,
        sourcePageMapping,
      ).map(SheetAnnotationRedoEntry.text);
    }
    return const <SheetAnnotationRedoEntry>[];
  }

  int? _firstMappedPage(Map<int, List<int>> sourcePageMapping, int sourcePage) {
    final pages = sourcePageMapping[sourcePage];
    if (pages == null || pages.isEmpty) {
      return null;
    }
    return pages.first;
  }

  SheetAnnotationStroke _rebaseStrokeForAppliedCrop(
    SheetAnnotationStroke stroke,
    SheetPageSettings pageSettings,
  ) {
    final crop = pageSettings.cropForPage(stroke.pageNumber).normalized();
    if (!crop.hasCrop) {
      return stroke;
    }
    return SheetAnnotationStroke(
      id: stroke.id,
      pageNumber: stroke.pageNumber,
      tool: stroke.tool,
      color: stroke.color,
      width: stroke.width,
      points: List<SheetAnnotationPoint>.unmodifiable(
        stroke.points.map((point) => _rebasePointForAppliedCrop(point, crop)),
      ),
      createdAt: stroke.createdAt,
    );
  }

  SheetTextAnnotation _rebaseTextForAppliedCrop(
    SheetTextAnnotation text,
    SheetPageSettings pageSettings,
  ) {
    final crop = pageSettings.cropForPage(text.pageNumber).normalized();
    if (!crop.hasCrop) {
      return text;
    }
    return text.copyWith(
      position: _rebasePointForAppliedCrop(text.position, crop),
    );
  }

  SheetAnnotationRedoEntry _rebaseRedoEntryForAppliedCrop(
    SheetAnnotationRedoEntry entry,
    SheetPageSettings pageSettings,
  ) {
    final stroke = entry.stroke;
    if (stroke != null) {
      return SheetAnnotationRedoEntry.stroke(
        _rebaseStrokeForAppliedCrop(stroke, pageSettings),
      );
    }
    final text = entry.text;
    if (text != null) {
      return SheetAnnotationRedoEntry.text(
        _rebaseTextForAppliedCrop(text, pageSettings),
      );
    }
    return entry;
  }

  SheetAnnotationPoint _rebasePointForAppliedCrop(
    SheetAnnotationPoint point,
    SheetCropSettings crop,
  ) {
    final width = 1 - crop.left - crop.right;
    final height = 1 - crop.top - crop.bottom;
    if (width <= 0 || height <= 0) {
      return point;
    }
    return SheetAnnotationPoint(
      x: ((point.x - crop.left) / width).clamp(0.0, 1.0).toDouble(),
      y: ((point.y - crop.top) / height).clamp(0.0, 1.0).toDouble(),
    );
  }

  Future<bool> hidePage(
    SheetScore score, {
    required int pageNumber,
    required int pageCount,
  }) async {
    final nextPageSettings = score.pageSettings.hidePage(pageNumber, pageCount);
    if (identical(nextPageSettings, score.pageSettings)) {
      return false;
    }

    await _replace(
      score.copyWith(pageSettings: nextPageSettings, updatedAt: DateTime.now()),
    );
    return true;
  }

  Future<void> unhidePage(SheetScore score, int pageNumber) async {
    final nextPageSettings = score.pageSettings.unhidePage(pageNumber);
    if (identical(nextPageSettings, score.pageSettings)) {
      return;
    }

    await _replace(
      score.copyWith(pageSettings: nextPageSettings, updatedAt: DateTime.now()),
    );
  }

  Future<int> rotatePageClockwise(SheetScore score, int pageNumber) async {
    final nextPageSettings = score.pageSettings.rotatePageClockwise(pageNumber);
    await _replace(
      score.copyWith(pageSettings: nextPageSettings, updatedAt: DateTime.now()),
    );
    return nextPageSettings.pageRotations[pageNumber] ?? 0;
  }

  Future<int> rotatePageInstanceClockwise(
    SheetScore score, {
    required int orderIndex,
    required int pageNumber,
    required int pageCount,
  }) async {
    final nextPageSettings = score.pageSettings.rotatePageInstanceClockwise(
      orderIndex: orderIndex,
      pageNumber: pageNumber,
      pageCount: pageCount,
    );
    if (identical(nextPageSettings, score.pageSettings)) {
      return score.pageSettings.rotationForPage(
        pageNumber,
        orderIndex: orderIndex,
      );
    }
    await _replace(
      score.copyWith(pageSettings: nextPageSettings, updatedAt: DateTime.now()),
    );
    return nextPageSettings.rotationForPage(pageNumber, orderIndex: orderIndex);
  }

  Future<bool> updatePageInstanceCrop(
    SheetScore score, {
    required int orderIndex,
    required int pageCount,
    required SheetCropSettings crop,
  }) async {
    final nextPageSettings = score.pageSettings.updatePageInstanceCrop(
      orderIndex: orderIndex,
      pageCount: pageCount,
      crop: crop,
    );
    if (identical(nextPageSettings, score.pageSettings)) {
      return false;
    }

    await _replace(
      score.copyWith(pageSettings: nextPageSettings, updatedAt: DateTime.now()),
    );
    return true;
  }

  Future<bool> movePageInOrder(
    SheetScore score, {
    required int fromIndex,
    required int toIndex,
    required int pageCount,
  }) async {
    final nextPageSettings = score.pageSettings.movePageInOrder(
      fromIndex: fromIndex,
      toIndex: toIndex,
      pageCount: pageCount,
    );
    if (identical(nextPageSettings, score.pageSettings)) {
      return false;
    }

    await _replace(
      score.copyWith(pageSettings: nextPageSettings, updatedAt: DateTime.now()),
    );
    return true;
  }

  Future<bool> duplicatePageInOrder(
    SheetScore score, {
    required int pageNumber,
    required int pageCount,
    int? orderIndex,
  }) async {
    final nextPageSettings = score.pageSettings.duplicatePageInOrder(
      pageNumber: pageNumber,
      pageCount: pageCount,
      orderIndex: orderIndex,
    );
    if (identical(nextPageSettings, score.pageSettings)) {
      return false;
    }

    await _replace(
      score.copyWith(pageSettings: nextPageSettings, updatedAt: DateTime.now()),
    );
    return true;
  }

  Future<bool> resetPageOrder(SheetScore score) async {
    final nextPageSettings = score.pageSettings.resetPageOrder();
    if (identical(nextPageSettings, score.pageSettings)) {
      return false;
    }

    await _replace(
      score.copyWith(pageSettings: nextPageSettings, updatedAt: DateTime.now()),
    );
    return true;
  }

  Future<bool> addPageJumpPoint(
    SheetScore score, {
    required SheetPageJumpPoint jumpPoint,
    required int pageCount,
  }) async {
    final nextPageSettings = score.pageSettings.addJumpPoint(
      jumpPoint: jumpPoint,
      pageCount: pageCount,
    );
    if (identical(nextPageSettings, score.pageSettings)) {
      return false;
    }

    await _replace(
      score.copyWith(pageSettings: nextPageSettings, updatedAt: DateTime.now()),
    );
    return true;
  }

  Future<bool> addRehearsalMark(
    SheetScore score, {
    required SheetRehearsalMark mark,
    required int pageCount,
  }) async {
    final nextPageSettings = score.pageSettings.addRehearsalMark(
      mark: mark,
      pageCount: pageCount,
    );
    if (identical(nextPageSettings, score.pageSettings)) {
      return false;
    }
    await _replace(
      score.copyWith(pageSettings: nextPageSettings, updatedAt: DateTime.now()),
    );
    return true;
  }

  Future<bool> removeRehearsalMark(SheetScore score, String id) async {
    final nextPageSettings = score.pageSettings.removeRehearsalMark(id);
    if (identical(nextPageSettings, score.pageSettings)) {
      return false;
    }
    await _replace(
      score.copyWith(pageSettings: nextPageSettings, updatedAt: DateTime.now()),
    );
    return true;
  }

  Future<bool> updateRehearsalMark(
    SheetScore score, {
    required SheetRehearsalMark mark,
    required int pageCount,
  }) async {
    final exists = score.pageSettings.rehearsalMarks.any(
      (candidate) => candidate.id == mark.id,
    );
    if (!exists) {
      return false;
    }
    return addRehearsalMark(score, mark: mark, pageCount: pageCount);
  }

  Future<bool> mergeBookmarksFromOutline(
    SheetScore score,
    List<SheetBookmark> outlineBookmarks,
  ) async {
    if (outlineBookmarks.isEmpty) {
      return false;
    }
    final seenPages = score.bookmarks
        .map((bookmark) => bookmark.pageNumber)
        .toSet();
    final nextBookmarks = <SheetBookmark>[...score.bookmarks];
    for (final bookmark in outlineBookmarks) {
      if (bookmark.pageNumber < 1 || !seenPages.add(bookmark.pageNumber)) {
        continue;
      }
      nextBookmarks.add(bookmark);
    }
    if (nextBookmarks.length == score.bookmarks.length) {
      return false;
    }
    nextBookmarks.sort((a, b) => a.pageNumber.compareTo(b.pageNumber));
    await _replace(
      score.copyWith(
        bookmarks: List<SheetBookmark>.unmodifiable(nextBookmarks),
        updatedAt: DateTime.now(),
      ),
    );
    return true;
  }

  Future<int> importBookmarksFromCsv(
    SheetScore score, {
    required int pageCount,
  }) async {
    _errorMessage = null;
    final libraryId = _activeLibraryProfile.id;
    void reportFailure(String message) {
      if (_activeLibraryProfile.id == libraryId) {
        _errorMessage = message;
        notifyListeners();
      }
    }

    final List<SheetBookmark> importedBookmarks;
    try {
      importedBookmarks = await store.importBookmarkCsv(pageCount: pageCount);
    } catch (error) {
      reportFailure(
        error is FormatException
            ? 'CSV 북마크를 가져오지 못했습니다. page,label 형식인지 확인해주세요.'
            : 'CSV 북마크를 읽지 못했습니다. 파일을 기기에 내려받은 뒤 다시 시도해주세요.',
      );
      return 0;
    }
    if (_activeLibraryProfile.id != libraryId || importedBookmarks.isEmpty) {
      return 0;
    }
    final currentScore = scoreByIdOrNull(score.id);
    if (currentScore == null) {
      reportFailure('악보가 없어 북마크를 추가하지 못했습니다.');
      return 0;
    }
    final beforeCount = currentScore.bookmarks.length;
    try {
      final didMerge = await mergeBookmarksFromOutline(
        currentScore,
        importedBookmarks,
      );
      if (!didMerge || _activeLibraryProfile.id != libraryId) {
        return 0;
      }
      final savedScore = scoreByIdOrNull(score.id);
      if (savedScore == null) {
        reportFailure('악보가 없어 북마크를 추가하지 못했습니다.');
        return 0;
      }
      final addedCount = savedScore.bookmarks.length - beforeCount;
      return addedCount > 0 ? addedCount : 0;
    } catch (_) {
      reportFailure('북마크를 저장하지 못했습니다. 저장 공간을 확인한 뒤 다시 시도해주세요.');
      return 0;
    }
  }

  Future<SheetSongbookSplitResult> createScoresFromBookmarks(
    SheetScore score, {
    required int pageCount,
  }) async {
    final source = scoreById(score.id);
    final segments = _songbookSegmentsFromBookmarks(
      source.bookmarks,
      pageCount: pageCount,
    );
    if (segments.isEmpty) {
      return const SheetSongbookSplitResult(
        createdScores: <SheetScore>[],
        skippedDuplicateCount: 0,
      );
    }

    final now = DateTime.now();
    final createdScores = <SheetScore>[];
    var skippedDuplicateCount = 0;
    for (final segment in segments) {
      final title = _songbookSegmentTitle(source, segment.bookmark.label);
      final visibleSegmentPages = List<int>.generate(
        segment.endPage - segment.startPage + 1,
        (index) => segment.startPage + index,
      ).where((page) => !source.pageSettings.isHidden(page)).toList();
      final pageOrder = List<int>.unmodifiable(
        visibleSegmentPages.isEmpty
            ? <int>[segment.startPage]
            : visibleSegmentPages,
      );
      final visiblePages = pageOrder.toSet();
      if (_hasSongbookSegmentDuplicate(
        sourceFilePath: source.filePath,
        title: title,
        pageOrder: pageOrder,
        pendingScores: createdScores,
      )) {
        skippedDuplicateCount += 1;
        continue;
      }

      createdScores.add(
        SheetScore(
          id: _newScoreId(now, createdScores.length),
          title: title,
          composer: source.composer,
          tags: source.tags,
          note: source.note,
          filePath: source.filePath,
          collection: source.collection,
          group: source.group,
          rating: source.rating,
          linkedFiles: source.linkedFiles,
          structuredNotes: source.structuredNotes,
          customFields: source.customFields,
          importedAt: now,
          updatedAt: now,
          lastOpenedAt: null,
          lastPage: pageOrder.first,
          isFavorite: false,
          isPinned: false,
          bookmarks: _bookmarksInPageRange(
            source.bookmarks,
            startPage: segment.startPage,
            endPage: segment.endPage,
          ),
          annotationLayer: SheetAnnotationLayer(
            strokes: List<SheetAnnotationStroke>.unmodifiable(
              source.annotationLayer.strokes.where(
                (stroke) =>
                    stroke.pageNumber >= segment.startPage &&
                    stroke.pageNumber <= segment.endPage,
              ),
            ),
            texts: List<SheetTextAnnotation>.unmodifiable(
              source.annotationLayer.texts.where(
                (text) =>
                    text.pageNumber >= segment.startPage &&
                    text.pageNumber <= segment.endPage,
              ),
            ),
            layers: List<SheetAnnotationDisplayLayer>.unmodifiable(
              source.annotationLayer.layers,
            ),
          ),
          viewerSettings: source.viewerSettings,
          pageSettings: source.pageSettings
              .copyWith(
                hiddenPages: List<int>.unmodifiable(
                  List<int>.generate(
                    pageCount,
                    (index) => index + 1,
                  ).where((page) => !visiblePages.contains(page)),
                ),
                pageOrder: pageOrder,
                instanceRotations: const <int, int>{},
                instanceCrops: const <int, SheetCropSettings>{},
                blankPageInsertions: source.pageSettings.blankPageInsertions
                    .where(
                      (insertion) => visiblePages.contains(insertion.afterPage),
                    )
                    .toList(growable: false),
              )
              .compactForPageCount(pageCount),
          autoScrollSettings: source.autoScrollSettings.copyWith(
            startPage: pageOrder.first,
            endPage: pageOrder.last,
            pausePageNumbers: source.autoScrollSettings.pausePageNumbers
                .where(visiblePages.contains)
                .toList(growable: false),
            pageDurations: <int, int>{
              for (final entry
                  in source.autoScrollSettings.pageDurations.entries)
                if (visiblePages.contains(entry.key)) entry.key: entry.value,
            },
            repeatSections: source.autoScrollSettings.repeatSections
                .where(
                  (section) =>
                      visiblePages.contains(section.startPage) &&
                      visiblePages.contains(section.endPage),
                )
                .toList(growable: false),
            cuePoints: source.autoScrollSettings.cuePoints
                .where((cue) => visiblePages.contains(cue.pageNumber))
                .toList(growable: false),
          ),
          metronomeSettings: source.metronomeSettings,
        ),
      );
    }

    if (createdScores.isEmpty) {
      return SheetSongbookSplitResult(
        createdScores: const <SheetScore>[],
        skippedDuplicateCount: skippedDuplicateCount,
      );
    }

    _scores = <SheetScore>[...createdScores, ..._scores];
    await _saveScoreChanges();
    return SheetSongbookSplitResult(
      createdScores: List<SheetScore>.unmodifiable(createdScores),
      skippedDuplicateCount: skippedDuplicateCount,
    );
  }

  Future<bool> addCropPreset(SheetScore score, SheetCropPreset preset) async {
    final nextPageSettings = score.pageSettings.addCropPreset(preset);
    if (identical(nextPageSettings, score.pageSettings)) {
      return false;
    }
    await _replace(
      score.copyWith(pageSettings: nextPageSettings, updatedAt: DateTime.now()),
    );
    return true;
  }

  Future<bool> applyCropPreset(
    SheetScore score,
    String presetId, {
    int? pageCount,
  }) async {
    final nextPageSettings = score.pageSettings.applyCropPreset(
      presetId,
      pageCount: pageCount,
    );
    if (identical(nextPageSettings, score.pageSettings)) {
      return false;
    }
    await _replace(
      score.copyWith(pageSettings: nextPageSettings, updatedAt: DateTime.now()),
    );
    return true;
  }

  Future<bool> removeCropPreset(SheetScore score, String presetId) async {
    final nextPageSettings = score.pageSettings.removeCropPreset(presetId);
    if (identical(nextPageSettings, score.pageSettings)) {
      return false;
    }
    await _replace(
      score.copyWith(pageSettings: nextPageSettings, updatedAt: DateTime.now()),
    );
    return true;
  }

  Future<bool> addBlankPageInsertion(
    SheetScore score, {
    required SheetBlankPageInsertion insertion,
    required int pageCount,
  }) async {
    final nextPageSettings = score.pageSettings.addBlankPageInsertion(
      insertion: insertion,
      pageCount: pageCount,
    );
    if (identical(nextPageSettings, score.pageSettings)) {
      return false;
    }
    await _replace(
      score.copyWith(pageSettings: nextPageSettings, updatedAt: DateTime.now()),
    );
    return true;
  }

  Future<bool> addVisibilityPreset(
    SheetScore score, {
    required SheetPageVisibilityPreset preset,
    required int pageCount,
  }) async {
    final nextPageSettings = score.pageSettings.addVisibilityPreset(
      preset: preset,
      pageCount: pageCount,
    );
    if (identical(nextPageSettings, score.pageSettings)) {
      return false;
    }
    await _replace(
      score.copyWith(pageSettings: nextPageSettings, updatedAt: DateTime.now()),
    );
    return true;
  }

  Future<bool> removeBlankPageInsertion(SheetScore score, String id) async {
    final nextPageSettings = score.pageSettings.removeBlankPageInsertion(id);
    if (identical(nextPageSettings, score.pageSettings)) {
      return false;
    }
    await _replace(
      score.copyWith(pageSettings: nextPageSettings, updatedAt: DateTime.now()),
    );
    return true;
  }

  Future<bool> removeVisibilityPreset(SheetScore score, String id) async {
    final nextPageSettings = score.pageSettings.removeVisibilityPreset(id);
    if (identical(nextPageSettings, score.pageSettings)) {
      return false;
    }
    await _replace(
      score.copyWith(pageSettings: nextPageSettings, updatedAt: DateTime.now()),
    );
    return true;
  }

  Future<bool> applyVisibilityPreset(
    SheetScore score, {
    required String presetId,
    required int pageCount,
  }) async {
    final nextPageSettings = score.pageSettings.applyVisibilityPreset(
      presetId,
      pageCount,
    );
    if (identical(nextPageSettings, score.pageSettings)) {
      return false;
    }
    await _replace(
      score.copyWith(pageSettings: nextPageSettings, updatedAt: DateTime.now()),
    );
    return true;
  }

  Future<bool> removePageJumpPoint(SheetScore score, String id) async {
    final nextPageSettings = score.pageSettings.removeJumpPoint(id);
    if (identical(nextPageSettings, score.pageSettings)) {
      return false;
    }

    await _replace(
      score.copyWith(pageSettings: nextPageSettings, updatedAt: DateTime.now()),
    );
    return true;
  }

  Future<bool> updatePageJumpPoint(
    SheetScore score, {
    required SheetPageJumpPoint jumpPoint,
    required int pageCount,
  }) async {
    final nextPageSettings = score.pageSettings.addJumpPoint(
      jumpPoint: jumpPoint,
      pageCount: pageCount,
    );
    if (identical(nextPageSettings, score.pageSettings)) {
      return false;
    }

    await _replace(
      score.copyWith(pageSettings: nextPageSettings, updatedAt: DateTime.now()),
    );
    return true;
  }

  Future<void> addAnnotationStroke(
    SheetScore score,
    SheetAnnotationStroke stroke,
  ) async {
    await _replace(
      score.copyWith(
        annotationLayer: _guardAnnotationLayer(
          score.annotationLayer.addStroke(stroke),
        ),
        updatedAt: DateTime.now(),
      ),
    );
  }

  Future<bool> eraseAnnotationAt(
    SheetScore score, {
    required int pageNumber,
    required SheetAnnotationPoint point,
    required double tolerance,
  }) async {
    final nextLayer = score.annotationLayer.eraseAt(
      pageNumber: pageNumber,
      point: point,
      tolerance: tolerance,
    );
    if (identical(nextLayer, score.annotationLayer)) {
      return false;
    }

    await _replace(
      score.copyWith(
        annotationLayer: _guardAnnotationLayer(nextLayer),
        updatedAt: DateTime.now(),
      ),
    );
    return true;
  }

  Future<bool> undoLastAnnotationStroke(
    SheetScore score,
    int pageNumber,
  ) async {
    final nextLayer = score.annotationLayer.undoLastStroke(pageNumber);
    if (identical(nextLayer, score.annotationLayer)) {
      return false;
    }

    await _replace(
      score.copyWith(
        annotationLayer: _guardAnnotationLayer(nextLayer),
        updatedAt: DateTime.now(),
      ),
    );
    return true;
  }

  Future<void> addTextAnnotation(
    SheetScore score,
    SheetTextAnnotation text,
  ) async {
    await _replace(
      score.copyWith(
        annotationLayer: _guardAnnotationLayer(
          score.annotationLayer.addText(text),
        ),
        updatedAt: DateTime.now(),
      ),
    );
  }

  Future<bool> updateTextAnnotation(
    SheetScore score,
    SheetTextAnnotation text,
  ) async {
    final nextLayer = score.annotationLayer.updateText(text);
    if (identical(nextLayer, score.annotationLayer)) {
      return false;
    }

    await _replace(
      score.copyWith(
        annotationLayer: _guardAnnotationLayer(nextLayer),
        updatedAt: DateTime.now(),
      ),
    );
    return true;
  }

  Future<bool> removeTextAnnotation(SheetScore score, String textId) async {
    final nextLayer = score.annotationLayer.removeText(textId);
    if (identical(nextLayer, score.annotationLayer)) {
      return false;
    }

    await _replace(
      score.copyWith(
        annotationLayer: _guardAnnotationLayer(nextLayer),
        updatedAt: DateTime.now(),
      ),
    );
    return true;
  }

  Future<bool> undoLastAnnotation(SheetScore score, int pageNumber) async {
    final nextLayer = score.annotationLayer.undoLastAnnotation(pageNumber);
    if (identical(nextLayer, score.annotationLayer)) {
      return false;
    }

    await _replace(
      score.copyWith(
        annotationLayer: _guardAnnotationLayer(nextLayer),
        updatedAt: DateTime.now(),
      ),
    );
    return true;
  }

  Future<bool> redoLastAnnotation(SheetScore score, int pageNumber) async {
    final nextLayer = score.annotationLayer.redoLastAnnotation(pageNumber);
    if (identical(nextLayer, score.annotationLayer)) {
      return false;
    }

    await _replace(
      score.copyWith(
        annotationLayer: _guardAnnotationLayer(nextLayer),
        updatedAt: DateTime.now(),
      ),
    );
    return true;
  }

  Future<void> updateAnnotationLayerState(
    SheetScore score, {
    bool? isVisible,
    bool? includeInExport,
  }) async {
    await _replace(
      score.copyWith(
        annotationLayer: _guardAnnotationLayer(
          score.annotationLayer.withDefaultLayerState(
            isVisible: isVisible,
            includeInExport: includeInExport,
          ),
        ),
        updatedAt: DateTime.now(),
      ),
    );
  }

  Future<SheetSetlist> createSetlist(String title) async {
    final now = DateTime.now();
    final setlist = SheetSetlist(
      id: '${now.microsecondsSinceEpoch}-${Random().nextInt(1 << 32)}',
      title: _normalizeSetlistTitle(title),
      scoreIds: const <String>[],
      createdAt: now,
      updatedAt: now,
    );
    _setlists = <SheetSetlist>[setlist, ..._setlists];
    await _saveSetlistChanges();
    return setlist;
  }

  Future<void> renameSetlist(SheetSetlist setlist, String title) async {
    final current = setlistByIdOrNull(setlist.id);
    if (current == null) return;
    await _replaceSetlist(
      current.copyWith(
        title: _normalizeSetlistTitle(title),
        updatedAt: DateTime.now(),
      ),
    );
  }

  Future<SheetSetlist> duplicateSetlist(SheetSetlist setlist) async {
    final now = DateTime.now();
    final baseTitle = '${setlist.title} copy';
    var title = baseTitle;
    for (var suffix = 2; setlistByTitleOrNull(title) != null; suffix++) {
      title = '$baseTitle ($suffix)';
    }
    final duplicate = SheetSetlist(
      id: '${now.microsecondsSinceEpoch}-${Random().nextInt(1 << 32)}',
      title: title,
      scoreIds: List<String>.unmodifiable(setlist.scoreIds),
      createdAt: now,
      updatedAt: now,
      rehearsalMode: setlist.rehearsalMode,
      scoreStartPages: Map<String, int>.unmodifiable(setlist.scoreStartPages),
      scoreNotes: Map<String, String>.unmodifiable(setlist.scoreNotes),
      scoreDurations: Map<String, int>.unmodifiable(setlist.scoreDurations),
      scoreMetronomeSettings: Map<String, SheetMetronomeSettings>.unmodifiable(
        setlist.scoreMetronomeSettings,
      ),
      transitionSeconds: setlist.transitionSeconds,
      viewerSettingsOverride: setlist.viewerSettingsOverride,
    );
    _setlists = <SheetSetlist>[duplicate, ..._setlists];
    await _saveSetlistChanges();
    return duplicate;
  }

  Future<void> deleteSetlist(SheetSetlist setlist) async {
    _setlists = _setlists
        .where((candidate) => candidate.id != setlist.id)
        .toList(growable: false);
    await _saveSetlistChanges();
  }

  Future<void> addScoreToSetlist(SheetSetlist setlist, SheetScore score) async {
    await addScoresToSetlist(setlist, [score]);
  }

  Future<SheetSetlistBulkAddResult> addScoresToSetlist(
    SheetSetlist setlist,
    Iterable<SheetScore> scores,
  ) async {
    final current = setlistByIdOrNull(setlist.id);
    if (current == null) {
      return const SheetSetlistBulkAddResult(
        addedCount: 0,
        skippedDuplicateCount: 0,
        targetMissing: true,
      );
    }
    final existingScoreIds = current.scoreIds.toSet();
    final nextScoreIds = current.scoreIds.toList();
    final validScoreIds = _scores.map((score) => score.id).toSet();
    var skippedDuplicateCount = 0;
    var skippedMissingCount = 0;

    for (final score in scores) {
      if (!validScoreIds.contains(score.id)) {
        skippedMissingCount += 1;
        continue;
      }
      if (existingScoreIds.add(score.id)) {
        nextScoreIds.add(score.id);
      } else {
        skippedDuplicateCount += 1;
      }
    }

    final addedCount = nextScoreIds.length - current.scoreIds.length;
    if (addedCount > 0) {
      await _replaceSetlist(
        current.copyWith(
          scoreIds: List<String>.unmodifiable(nextScoreIds),
          updatedAt: DateTime.now(),
        ),
      );
    }
    return SheetSetlistBulkAddResult(
      addedCount: addedCount,
      skippedDuplicateCount: skippedDuplicateCount,
      skippedMissingCount: skippedMissingCount,
    );
  }

  Future<SheetSetlistBulkAddResult> appendSetlistToSetlist(
    SheetSetlist target,
    SheetSetlist source,
  ) async {
    final currentTarget = setlistByIdOrNull(target.id);
    if (currentTarget == null) {
      return const SheetSetlistBulkAddResult(
        addedCount: 0,
        skippedDuplicateCount: 0,
        targetMissing: true,
      );
    }
    final currentSource = setlistByIdOrNull(source.id);
    if (currentSource == null) {
      return const SheetSetlistBulkAddResult(
        addedCount: 0,
        skippedDuplicateCount: 0,
        sourceMissing: true,
      );
    }

    final validScoreIds = _scores.map((score) => score.id).toSet();
    final existingScoreIds = currentTarget.scoreIds.toSet();
    final nextScoreIds = currentTarget.scoreIds.toList();
    final addedScoreIds = <String>[];
    var skippedDuplicateCount = 0;
    var skippedMissingCount = 0;

    for (final scoreId in currentSource.scoreIds) {
      if (!validScoreIds.contains(scoreId)) {
        skippedMissingCount += 1;
        continue;
      }
      if (existingScoreIds.add(scoreId)) {
        nextScoreIds.add(scoreId);
        addedScoreIds.add(scoreId);
      } else {
        skippedDuplicateCount += 1;
      }
    }

    if (addedScoreIds.isNotEmpty) {
      final nextStartPages = Map<String, int>.from(
        currentTarget.scoreStartPages,
      );
      final nextNotes = Map<String, String>.from(currentTarget.scoreNotes);
      final nextDurations = Map<String, int>.from(currentTarget.scoreDurations);
      final nextMetronomeSettings = Map<String, SheetMetronomeSettings>.from(
        currentTarget.scoreMetronomeSettings,
      );
      for (final scoreId in addedScoreIds) {
        if (currentSource.scoreStartPages.containsKey(scoreId)) {
          nextStartPages[scoreId] = currentSource.scoreStartPages[scoreId]!;
        }
        if (currentSource.scoreNotes.containsKey(scoreId)) {
          nextNotes[scoreId] = currentSource.scoreNotes[scoreId]!;
        }
        if (currentSource.scoreDurations.containsKey(scoreId)) {
          nextDurations[scoreId] = currentSource.scoreDurations[scoreId]!;
        }
        if (currentSource.scoreMetronomeSettings.containsKey(scoreId)) {
          nextMetronomeSettings[scoreId] =
              currentSource.scoreMetronomeSettings[scoreId]!;
        }
      }
      await _replaceSetlist(
        currentTarget.copyWith(
          scoreIds: List<String>.unmodifiable(nextScoreIds),
          scoreStartPages: Map<String, int>.unmodifiable(nextStartPages),
          scoreNotes: Map<String, String>.unmodifiable(nextNotes),
          scoreDurations: Map<String, int>.unmodifiable(nextDurations),
          scoreMetronomeSettings:
              Map<String, SheetMetronomeSettings>.unmodifiable(
                nextMetronomeSettings,
              ),
          updatedAt: DateTime.now(),
        ),
      );
    }

    return SheetSetlistBulkAddResult(
      addedCount: addedScoreIds.length,
      skippedDuplicateCount: skippedDuplicateCount,
      skippedMissingCount: skippedMissingCount,
    );
  }

  Future<void> removeScoreFromSetlist(
    SheetSetlist setlist,
    SheetScore score,
  ) async {
    final current = setlistByIdOrNull(setlist.id);
    if (current == null) return;
    await _replaceSetlist(current.removeScore(score.id, DateTime.now()));
  }

  Future<bool> insertScoreInSetlist(
    SheetSetlist setlist,
    SheetScore score,
    int index,
  ) async {
    final currentSetlist = setlistByIdOrNull(setlist.id);
    if (currentSetlist == null || scoreByIdOrNull(score.id) == null) {
      return false;
    }
    if (currentSetlist.scoreIds.contains(score.id)) return true;
    final nextScoreIds = currentSetlist.scoreIds.toList();
    final targetIndex = index.clamp(0, nextScoreIds.length).toInt();
    nextScoreIds.insert(targetIndex, score.id);
    await _replaceSetlist(
      currentSetlist.copyWith(
        scoreIds: List<String>.unmodifiable(nextScoreIds),
        updatedAt: DateTime.now(),
      ),
    );
    return true;
  }

  Future<bool> moveScoreInSetlist(
    SheetSetlist setlist,
    int fromIndex,
    int toIndex,
  ) async {
    final current = setlistByIdOrNull(setlist.id);
    if (current == null ||
        !listEquals(current.scoreIds, setlist.scoreIds) ||
        fromIndex < 0 ||
        fromIndex >= current.scoreIds.length ||
        toIndex < 0 ||
        toIndex >= current.scoreIds.length) {
      return false;
    }
    if (fromIndex == toIndex) return true;
    await _replaceSetlist(
      current.moveScore(fromIndex, toIndex, DateTime.now()),
    );
    return true;
  }

  Future<void> markSetlistOpened(
    SheetSetlist setlist, {
    String? scoreId,
  }) async {
    final current = setlistByIdOrNull(setlist.id);
    if (current == null) return;
    final normalizedScoreId = scoreId?.trim();
    await _replaceSetlist(
      current.copyWith(
        lastOpenedAt: DateTime.now(),
        lastOpenedScoreId:
            normalizedScoreId != null &&
                current.scoreIds.contains(normalizedScoreId)
            ? normalizedScoreId
            : null,
        updatedAt: DateTime.now(),
      ),
    );
  }

  Future<bool> updateSetlistRehearsalSettings(
    SheetSetlist setlist, {
    bool? rehearsalMode,
    int? transitionSeconds,
    Map<String, int>? scoreStartPages,
    Map<String, String>? scoreNotes,
    Map<String, int>? scoreDurations,
    SheetViewerSettings? viewerSettingsOverride,
    bool clearViewerSettingsOverride = false,
  }) async {
    final current = setlistByIdOrNull(setlist.id);
    if (current == null) return false;
    final scoreIds = current.scoreIds.toSet();
    await _replaceSetlist(
      current.copyWith(
        rehearsalMode: rehearsalMode,
        transitionSeconds: transitionSeconds,
        scoreStartPages: scoreStartPages == null
            ? null
            : Map<String, int>.unmodifiable(
                Map.fromEntries(
                  scoreStartPages.entries.where(
                    (entry) => scoreIds.contains(entry.key),
                  ),
                ),
              ),
        scoreNotes: scoreNotes == null
            ? null
            : Map<String, String>.unmodifiable(
                Map.fromEntries(
                  scoreNotes.entries.where(
                    (entry) => scoreIds.contains(entry.key),
                  ),
                ),
              ),
        scoreDurations: scoreDurations == null
            ? null
            : Map<String, int>.unmodifiable(
                Map.fromEntries(
                  scoreDurations.entries.where(
                    (entry) => scoreIds.contains(entry.key),
                  ),
                ),
              ),
        viewerSettingsOverride: viewerSettingsOverride,
        clearViewerSettingsOverride: clearViewerSettingsOverride,
        updatedAt: DateTime.now(),
      ),
    );
    return true;
  }

  SheetViewerSettings viewerSettingsForScore(
    SheetScore score, {
    String? setlistId,
  }) {
    if (setlistId == null) {
      return score.viewerSettings;
    }
    return setlistByIdOrNull(setlistId)?.viewerSettingsOverride ??
        score.viewerSettings;
  }

  Future<int> bulkEditScores(
    Set<String> scoreIds, {
    List<String> addTags = const <String>[],
    List<String> removeTags = const <String>[],
    String? composer,
    String? collection,
    String? group,
    int? rating,
    bool? isFavorite,
    bool? isPinned,
    List<SheetCustomMetadataField> customFields =
        const <SheetCustomMetadataField>[],
  }) async {
    if (scoreIds.isEmpty) {
      return 0;
    }
    final customFieldUpdates = SheetScore.normalizeCustomFields(customFields);
    final customFieldUpdateKeys = customFieldUpdates
        .map((field) => field.key.toLowerCase())
        .toSet();
    final addTagSet = addTags
        .map((tag) => tag.trim())
        .where((tag) => tag.isNotEmpty)
        .toList(growable: false);
    final removeTagSet = removeTags
        .map((tag) => tag.trim().toLowerCase())
        .where((tag) => tag.isNotEmpty)
        .toSet();
    var changedCount = 0;
    final now = DateTime.now();
    final updatedScores = _scores
        .map((score) {
          if (!scoreIds.contains(score.id)) {
            return score;
          }
          final nextTags = <String>[];
          final seenTags = <String>{};
          for (final tag in score.tags) {
            if (removeTagSet.contains(tag.toLowerCase()) ||
                !seenTags.add(tag.toLowerCase())) {
              continue;
            }
            nextTags.add(tag);
          }
          for (final tag in addTagSet) {
            if (seenTags.add(tag.toLowerCase())) {
              nextTags.add(tag);
            }
          }
          final nextCustomFields = customFieldUpdates.isEmpty
              ? score.customFields
              : SheetScore.normalizeCustomFields([
                  for (final field in score.customFields)
                    if (!customFieldUpdateKeys.contains(
                      field.key.toLowerCase(),
                    ))
                      field,
                  ...customFieldUpdates,
                ]);
          changedCount += 1;
          return score.copyWith(
            tags: List<String>.unmodifiable(nextTags),
            composer: composer == null
                ? score.composer
                : _normalizeOptionalMetadata(composer),
            collection: collection == null
                ? score.collection
                : _normalizeOptionalMetadata(collection),
            group: group == null
                ? score.group
                : _normalizeOptionalMetadata(group),
            rating: rating == null
                ? score.rating
                : SheetScore.normalizeRating(rating),
            isFavorite: isFavorite ?? score.isFavorite,
            isPinned: isPinned ?? score.isPinned,
            customFields: nextCustomFields,
            updatedAt: now,
          );
        })
        .toList(growable: false);
    if (changedCount > 0) {
      _scores = updatedScores;
      await _saveScoreChanges();
    }
    return changedCount;
  }

  void updateQuery(String value) {
    _query = value;
    notifyListeners();
  }

  Future<void> updateLibrarySortMode(SheetLibrarySortMode sortMode) async {
    await _updateLibraryViewSettings(
      _libraryViewSettings.copyWith(sortMode: sortMode),
    );
  }

  Future<void> updateFavoriteFilter(bool favoriteOnly) async {
    await _updateLibraryViewSettings(
      _libraryViewSettings.copyWith(favoriteOnly: favoriteOnly),
    );
  }

  Future<void> updateTagFilter(String tagQuery) async {
    await _updateLibraryViewSettings(
      _libraryViewSettings.copyWith(tagQuery: tagQuery),
    );
  }

  Future<void> updateComposerFilter(String composerQuery) async {
    await _updateLibraryViewSettings(
      _libraryViewSettings.copyWith(composerQuery: composerQuery),
    );
  }

  Future<void> updateCollectionFilter(String collectionQuery) async {
    await _updateLibraryViewSettings(
      _libraryViewSettings.copyWith(collectionQuery: collectionQuery),
    );
  }

  Future<void> updateGroupFilter(String groupQuery) async {
    await _updateLibraryViewSettings(
      _libraryViewSettings.copyWith(groupQuery: groupQuery),
    );
  }

  Future<void> updateMinimumRatingFilter(int minimumRating) async {
    await _updateLibraryViewSettings(
      _libraryViewSettings.copyWith(minimumRating: minimumRating),
    );
  }

  Future<void> updateCustomFieldFilter(String fieldKey, String value) async {
    final normalizedKey = fieldKey.trim();
    final normalizedValue = value.trim();
    final filters = <String, String>{
      ..._libraryViewSettings.customFieldFilters,
    };
    if (normalizedKey.isNotEmpty) {
      if (normalizedValue.isEmpty) {
        filters.remove(normalizedKey);
      } else {
        filters[normalizedKey] = normalizedValue;
      }
    }
    await _updateLibraryViewSettings(
      _libraryViewSettings.copyWith(customFieldFilters: filters),
    );
  }

  Future<void> clearLibrarySearchAndFilters() async {
    _query = '';
    await _updateLibraryViewSettings(
      _libraryViewSettings.copyWith(
        favoriteOnly: false,
        tagQuery: '',
        composerQuery: '',
        collectionQuery: '',
        groupQuery: '',
        minimumRating: 0,
        customFieldFilters: const <String, String>{},
      ),
    );
  }

  Future<void> updateGlobalViewerSettings(SheetViewerSettings settings) async {
    _globalViewerSettings = settings;
    await store.saveGlobalViewerSettings(settings);
    notifyListeners();
  }

  String _newPerformancePresetId() {
    final timestamp = DateTime.now().microsecondsSinceEpoch;
    final suffix = Random().nextInt(0x7fffffff).toRadixString(16);
    return 'performance-preset-$timestamp-$suffix';
  }

  String _newScoreId(DateTime now, int offset) {
    final timestamp = now.microsecondsSinceEpoch + offset;
    final suffix = Random().nextInt(0x7fffffff).toRadixString(16);
    return '$timestamp-$suffix';
  }

  List<_SongbookSegment> _songbookSegmentsFromBookmarks(
    List<SheetBookmark> bookmarks, {
    required int pageCount,
  }) {
    if (pageCount < 1 || bookmarks.isEmpty) {
      return const <_SongbookSegment>[];
    }
    final sorted =
        bookmarks
            .where((bookmark) => bookmark.pageNumber >= 1)
            .where((bookmark) => bookmark.pageNumber <= pageCount)
            .toList(growable: false)
          ..sort((a, b) => a.pageNumber.compareTo(b.pageNumber));
    final segments = <_SongbookSegment>[];
    for (var index = 0; index < sorted.length; index += 1) {
      final bookmark = sorted[index];
      final nextStart = index + 1 < sorted.length
          ? sorted[index + 1].pageNumber
          : pageCount + 1;
      final endPage = (nextStart - 1)
          .clamp(bookmark.pageNumber, pageCount)
          .toInt();
      if (endPage >= bookmark.pageNumber) {
        segments.add(
          _SongbookSegment(
            bookmark: bookmark,
            startPage: bookmark.pageNumber,
            endPage: endPage,
          ),
        );
      }
    }
    return List<_SongbookSegment>.unmodifiable(segments);
  }

  String _songbookSegmentTitle(SheetScore score, String bookmarkLabel) {
    final label = _normalizeOptionalMetadata(bookmarkLabel);
    if (label.isEmpty) {
      return '${score.title} 부분';
    }
    final scoreTitle = _normalizeScoreTitle(score.title, '악보');
    if (label.toLowerCase().startsWith(scoreTitle.toLowerCase())) {
      return label;
    }
    return '$scoreTitle - $label';
  }

  bool _hasSongbookSegmentDuplicate({
    required String sourceFilePath,
    required String title,
    required List<int> pageOrder,
    required List<SheetScore> pendingScores,
  }) {
    return <SheetScore>[..._scores, ...pendingScores].any((candidate) {
      return candidate.filePath == sourceFilePath &&
          candidate.title.trim().toLowerCase() == title.trim().toLowerCase() &&
          _intListsEqual(candidate.pageSettings.pageOrder, pageOrder);
    });
  }

  List<SheetBookmark> _bookmarksInPageRange(
    List<SheetBookmark> bookmarks, {
    required int startPage,
    required int endPage,
  }) {
    return List<SheetBookmark>.unmodifiable(
      bookmarks.where((bookmark) {
        return bookmark.pageNumber >= startPage &&
            bookmark.pageNumber <= endPage;
      }),
    );
  }

  Future<SheetLibraryBackupExportResult> exportMetadataBackup() {
    return store.exportMetadataBackup();
  }

  Future<SheetLibraryBackupExportResult> exportFullBackup() {
    return store.exportFullBackup();
  }

  Future<SheetLibraryBackupRestoreResult> importMetadataBackup() async {
    final result = await store.importMetadataBackup();
    if (result.didRestore) {
      await load();
    }
    return result;
  }

  Future<SheetLibraryBackupRestoreResult>
  restoreAutomaticMetadataBackup() async {
    final result = await store.restoreAutomaticMetadataBackup();
    if (result.didRestore) {
      await load();
    }
    return result;
  }

  Future<SheetLibraryBackupRestoreResult> importFullBackup() async {
    final result = await store.importFullBackup();
    if (result.didRestore) {
      await load();
    }
    return result;
  }

  SheetScore scoreById(String id) {
    return _scores.firstWhere((score) => score.id == id);
  }

  SheetSetlist setlistById(String id) {
    return _setlists.firstWhere((setlist) => setlist.id == id);
  }

  List<SheetScore> scoresForSetlist(SheetSetlist setlist) {
    return setlist.scoreIds
        .map(scoreByIdOrNull)
        .whereType<SheetScore>()
        .toList(growable: false);
  }

  List<SheetScore> scoresAvailableForSetlist(SheetSetlist setlist) {
    final usedIds = setlist.scoreIds.toSet();
    return _scores
        .where((score) => !usedIds.contains(score.id))
        .toList(growable: false);
  }

  SheetScore? scoreByIdOrNull(String id) {
    for (final score in _scores) {
      if (score.id == id) {
        return score;
      }
    }
    return null;
  }

  SheetScore? adjacentSetlistScore({
    required String setlistId,
    required String scoreId,
    required int delta,
  }) {
    final setlist = setlistById(setlistId);
    final scores = scoresForSetlist(setlist);
    final index = scores.indexWhere((score) => score.id == scoreId);
    if (index == -1) {
      return null;
    }

    final target = index + delta;
    if (target < 0 || target >= scores.length) {
      return null;
    }
    return scores[target];
  }

  SheetSetlistPlaybackContext? setlistPlaybackContext({
    required String setlistId,
    required String scoreId,
  }) {
    final setlist = setlistByIdOrNull(setlistId);
    if (setlist == null) {
      return null;
    }

    final scores = scoresForSetlist(setlist);
    final index = scores.indexWhere((score) => score.id == scoreId);
    if (index == -1) {
      return null;
    }

    return SheetSetlistPlaybackContext(
      title: setlist.title,
      currentIndex: index,
      totalCount: scores.length,
      currentDurationSeconds: setlist.scoreDurations[scoreId] ?? 0,
      totalEstimatedSeconds: setlist.totalEstimatedSeconds,
      currentNote: setlist.scoreNotes[scoreId]?.trim() ?? '',
    );
  }

  SheetSetlist? setlistByIdOrNull(String id) {
    for (final setlist in _setlists) {
      if (setlist.id == id) {
        return setlist;
      }
    }
    return null;
  }

  SheetSetlist? setlistByTitleOrNull(String title, {String? exceptId}) {
    final normalized = _normalizeSetlistTitle(title).toLowerCase();
    for (final setlist in _setlists) {
      if (setlist.id == exceptId) {
        continue;
      }
      if (_normalizeSetlistTitle(setlist.title).toLowerCase() == normalized) {
        return setlist;
      }
    }
    return null;
  }

  Future<void> _replace(SheetScore updated) async {
    _scores = _scores
        .map((score) => score.id == updated.id ? updated : score)
        .toList(growable: false);
    await _saveScoreChanges();
  }

  Future<void> _saveScoreChanges() async {
    final pendingScores = _scores;
    final libraryId = _activeLibraryProfile.id;
    try {
      await store.saveScores(pendingScores, libraryId: libraryId);
    } catch (_) {
      if (identical(_scores, pendingScores) &&
          _activeLibraryProfile.id == libraryId) {
        try {
          final persisted = await store.loadScores();
          // A newer edit, deletion or library switch owns the current state.
          if (identical(_scores, pendingScores) &&
              _activeLibraryProfile.id == libraryId) {
            _scores = persisted;
            notifyListeners();
          }
        } catch (_) {
          // Preserve the original write error when recovery cannot read storage.
        }
      }
      rethrow;
    }
    notifyListeners();
  }

  SheetAnnotationLayer _guardAnnotationLayer(SheetAnnotationLayer layer) {
    return layer.compactRedoStack(maxEntries: 40);
  }

  Future<void> _replaceSetlist(SheetSetlist updated) async {
    _setlists = _setlists
        .map((setlist) => setlist.id == updated.id ? updated : setlist)
        .toList(growable: false);
    await _saveSetlistChanges();
  }

  Future<void> _saveSetlistChanges() async {
    final pendingSetlists = _setlists;
    final libraryId = _activeLibraryProfile.id;
    try {
      await store.saveSetlists(pendingSetlists, libraryId: libraryId);
    } catch (_) {
      if (identical(_setlists, pendingSetlists) &&
          _activeLibraryProfile.id == libraryId) {
        try {
          final persisted = await store.loadSetlists();
          if (identical(_setlists, pendingSetlists) &&
              _activeLibraryProfile.id == libraryId) {
            _setlists = persisted;
            notifyListeners();
          }
        } catch (_) {
          // Surface the original write failure even when recovery is unavailable.
        }
      }
      rethrow;
    }
    notifyListeners();
  }

  Future<void> _updateLibraryViewSettings(
    SheetLibraryViewSettings settings,
  ) async {
    const error = '보기 설정을 저장하지 못했습니다. 다시 시도해주세요.';
    final libraryId = _activeLibraryProfile.id;
    final request = Object();
    _viewSettingsSaveRequest = request;
    _libraryViewSettings = settings;
    bool ownsState() =>
        identical(_viewSettingsSaveRequest, request) &&
        _activeLibraryProfile.id == libraryId &&
        identical(_libraryViewSettings, settings);
    try {
      await store.saveLibraryViewSettings(settings, libraryId: libraryId);
      if (ownsState() && _errorMessage == error) _errorMessage = null;
    } catch (_) {
      if (ownsState()) {
        try {
          final persisted = await store.loadLibraryViewSettings();
          if (ownsState()) {
            _libraryViewSettings = persisted;
            _errorMessage = error;
          }
        } catch (_) {
          if (ownsState()) _errorMessage = error;
        }
      }
    }
    notifyListeners();
  }

  SheetScore _withActiveCollection(SheetScore score) {
    final collection = _normalizeOptionalMetadata(
      _libraryViewSettings.collectionQuery,
    );
    final hasExistingCollection = score.collection.trim().isNotEmpty;
    final nextCollection = collection.isEmpty || hasExistingCollection
        ? score.collection
        : collection;
    return score.copyWith(
      viewerSettings: _globalViewerSettings,
      collection: nextCollection,
      updatedAt: DateTime.now(),
    );
  }

  String _imageImportErrorMessage(Object error) {
    if (error is FormatException) {
      return SheetFileImportPolicy.unsupportedImportMessage(error.message);
    }
    return '이미지를 PDF 악보로 가져오지 못했습니다. JPG/PNG 파일인지, 클라우드 파일이 기기에 내려받아져 있는지 확인해주세요.';
  }

  Future<void> _removeMissingSetlistScores() async {
    final validScoreIds = _scores.map((score) => score.id).toSet();
    var changed = false;
    final cleaned = _setlists
        .map((setlist) {
          final next = setlist.removeMissingScores(validScoreIds);
          // The model returns itself only when every reference is unchanged.
          changed = changed || !identical(next, setlist);
          return next;
        })
        .toList(growable: false);

    if (changed) {
      _setlists = cleaned;
      final libraryId = _activeLibraryProfile.id;
      try {
        await store.saveSetlists(cleaned, libraryId: libraryId);
      } catch (_) {
        // Keep usable references in memory; a later load retries durable cleanup.
        if (identical(_setlists, cleaned) &&
            _activeLibraryProfile.id == libraryId) {
          _errorMessage =
              '악보는 불러왔지만 세트리스트 정리 결과를 저장하지 못했습니다. 저장 공간을 확인한 뒤 앱을 다시 열어주세요.';
        }
      }
    }
  }

  String _normalizeSetlistTitle(String title) {
    final normalized = title.trim();
    return normalized.isEmpty ? '새 세트리스트' : normalized;
  }

  String _normalizeBookmarkLabel(String label, int pageNumber) {
    final normalized = label.trim();
    return normalized.isEmpty ? '$pageNumber쪽' : normalized;
  }

  String _normalizeScoreTitle(String title, String fallback) {
    final normalized = title.trim();
    if (normalized.isNotEmpty) {
      return normalized;
    }
    return fallback.trim().isEmpty ? 'Untitled score' : fallback.trim();
  }

  List<String> _normalizeTags(String tags) {
    final seen = <String>{};
    return tags
        .split(',')
        .map((tag) => tag.trim())
        .where((tag) => tag.isNotEmpty)
        .where((tag) => seen.add(tag.toLowerCase()))
        .toList(growable: false);
  }

  String _normalizeOptionalMetadata(String value) {
    return value.trim();
  }

  int _recentScoreCompare(SheetScore a, SheetScore b) {
    final aOpened = a.lastOpenedAt ?? DateTime.fromMillisecondsSinceEpoch(0);
    final bOpened = b.lastOpenedAt ?? DateTime.fromMillisecondsSinceEpoch(0);
    final openedCompare = bOpened.compareTo(aOpened);
    if (openedCompare != 0) {
      return openedCompare;
    }
    return a.displayTitle.toLowerCase().compareTo(b.displayTitle.toLowerCase());
  }

  int _recentSetlistCompare(SheetSetlist a, SheetSetlist b) {
    final aOpened = a.lastOpenedAt ?? DateTime.fromMillisecondsSinceEpoch(0);
    final bOpened = b.lastOpenedAt ?? DateTime.fromMillisecondsSinceEpoch(0);
    final openedCompare = bOpened.compareTo(aOpened);
    if (openedCompare != 0) {
      return openedCompare;
    }
    return a.title.toLowerCase().compareTo(b.title.toLowerCase());
  }

  void _setLoading(bool value) {
    _isLoading = value;
    notifyListeners();
  }
}

class SheetLibraryFacet {
  const SheetLibraryFacet({
    required this.label,
    required this.value,
    required this.count,
  });

  final String label;
  final String value;
  final int count;
}

class _SongbookSegment {
  const _SongbookSegment({
    required this.bookmark,
    required this.startPage,
    required this.endPage,
  });

  final SheetBookmark bookmark;
  final int startPage;
  final int endPage;
}

bool _intListsEqual(List<int> left, List<int> right) {
  if (identical(left, right)) {
    return true;
  }
  if (left.length != right.length) {
    return false;
  }
  for (var index = 0; index < left.length; index += 1) {
    if (left[index] != right[index]) {
      return false;
    }
  }
  return true;
}

List<SheetLibraryFacet> _stringFacets(Iterable<String> values) {
  final counts = <String, int>{};
  for (final rawValue in values) {
    final value = rawValue.trim();
    if (value.isEmpty) {
      continue;
    }
    counts[value] = (counts[value] ?? 0) + 1;
  }
  final facets =
      counts.entries
          .map(
            (entry) => SheetLibraryFacet(
              label: entry.key,
              value: entry.key,
              count: entry.value,
            ),
          )
          .toList()
        ..sort((a, b) {
          final countCompare = b.count.compareTo(a.count);
          if (countCompare != 0) {
            return countCompare;
          }
          return a.label.toLowerCase().compareTo(b.label.toLowerCase());
        });
  return List<SheetLibraryFacet>.unmodifiable(facets);
}

class SheetSharedImportFile {
  const SheetSharedImportFile({required this.path, required this.name});

  factory SheetSharedImportFile.fromPlatformMap(Map<Object?, Object?> value) {
    return SheetSharedImportFile(
      path: value['path']?.toString() ?? '',
      name: value['name']?.toString() ?? '',
    );
  }

  final String path;
  final String name;

  bool get isValid => path.isNotEmpty && name.toLowerCase().endsWith('.pdf');
}

List<SheetSharedImportFile> normalizeSharedImportPayload(Object? value) {
  final rawFiles = value is List ? value : const <Object?>[];
  final seenPaths = <String>{};
  return rawFiles.whereType<Map<Object?, Object?>>().fold(
    <SheetSharedImportFile>[],
    (files, rawFile) {
      final file = SheetSharedImportFile.fromPlatformMap(rawFile);
      if (file.isValid && seenPaths.add(file.path)) {
        files.add(file);
      }
      return files;
    },
  );
}

class SheetSetlistPlaybackContext {
  const SheetSetlistPlaybackContext({
    required this.title,
    required this.currentIndex,
    required this.totalCount,
    required this.currentDurationSeconds,
    required this.totalEstimatedSeconds,
    this.currentNote = '',
  });

  final String title;
  final int currentIndex;
  final int totalCount;
  final int currentDurationSeconds;
  final int totalEstimatedSeconds;
  final String currentNote;

  String get positionLabel => '${currentIndex + 1}/$totalCount';
}
