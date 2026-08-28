import 'dart:io';
import 'dart:math';

import 'package:flutter/foundation.dart';

import 'sheet_annotation.dart';
import 'sheet_annotated_pdf_exporter.dart';
import 'sheet_auto_scroll.dart';
import 'sheet_file_import.dart';
import 'sheet_library_backup.dart';
import 'sheet_library_store.dart';
import 'sheet_library_view_settings.dart';
import 'sheet_metronome.dart';
import 'sheet_pdf_link_sanitizer.dart';
import 'sheet_pdf_page_transformer.dart';
import 'sheet_score.dart';
import 'sheet_setlist.dart';
import 'sheet_tuner.dart';

class SheetLibraryController extends ChangeNotifier {
  SheetLibraryController({required this.store});

  final SheetLibraryStore store;

  List<SheetScore> _scores = const <SheetScore>[];
  List<SheetSetlist> _setlists = const <SheetSetlist>[];
  SheetMetronomeSettings _metronomeSettings =
      SheetMetronomeSettings.defaultSettings;
  SheetTunerSettings _tunerSettings = SheetTunerSettings.defaultSettings;
  SheetLibraryViewSettings _libraryViewSettings =
      SheetLibraryViewSettings.defaultSettings;
  SheetAnnotationToolPreset? _favoriteAnnotationPreset;
  String _query = '';
  bool _isLoading = true;
  bool _isImporting = false;
  String? _errorMessage;

  List<SheetScore> get scores => _scores;
  List<SheetSetlist> get setlists => _setlists;
  SheetMetronomeSettings get metronomeSettings => _metronomeSettings;
  SheetTunerSettings get tunerSettings => _tunerSettings;
  SheetLibraryViewSettings get libraryViewSettings => _libraryViewSettings;
  SheetAnnotationToolPreset? get favoriteAnnotationPreset {
    return _favoriteAnnotationPreset;
  }

  String get query => _query;
  bool get isLoading => _isLoading;
  bool get isImporting => _isImporting;
  String? get errorMessage => _errorMessage;

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

  List<String> get allTags {
    final tags = _scores.expand((score) => score.tags).toSet().toList();
    tags.sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));
    return List<String>.unmodifiable(tags);
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
    _setLoading(true);
    try {
      _scores = await store.loadScores();
      _setlists = await store.loadSetlists();
      _metronomeSettings = await store.loadMetronomeSettings();
      _tunerSettings = await store.loadTunerSettings();
      _libraryViewSettings = await store.loadLibraryViewSettings();
      _favoriteAnnotationPreset = await store.loadFavoriteAnnotationPreset();
      await _removeMissingSetlistScores();
      _errorMessage = null;
    } catch (error) {
      _errorMessage = '라이브러리를 불러오지 못했습니다. 앱을 다시 열어도 반복되면 백업 복원을 시도해주세요.';
    } finally {
      _setLoading(false);
    }
  }

  Future<SheetScore?> importPdf() async {
    if (_isImporting) {
      return null;
    }

    _isImporting = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final importedScore = await store.importPdf();
      final score = importedScore == null
          ? null
          : _withActiveCollection(importedScore);
      if (score == null) {
        return null;
      }

      _scores = <SheetScore>[score, ..._scores];
      await store.saveScores(_scores);
      return score;
    } catch (error) {
      _errorMessage = 'PDF를 가져오지 못했습니다. 파일이 PDF인지, Drive/iCloud/Dropbox 파일이 기기에 내려받아져 있는지 확인해주세요.';
      return null;
    } finally {
      _isImporting = false;
      notifyListeners();
    }
  }

  Future<SheetScore?> importImagesAsPdf() async {
    if (_isImporting) {
      return null;
    }

    _isImporting = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final importedScore = await store.importImagesAsPdf();
      final score = importedScore == null
          ? null
          : _withActiveCollection(importedScore);
      if (score == null) {
        return null;
      }

      _scores = <SheetScore>[score, ..._scores];
      await store.saveScores(_scores);
      return score;
    } catch (error) {
      _errorMessage = _imageImportErrorMessage(error);
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

    _isImporting = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final imported = <SheetScore>[];
      for (final sharedFile in files) {
        final score = _withActiveCollection(
          await store.importPdfFile(
            File(sharedFile.path),
            fileName: sharedFile.name,
          ),
        );
        imported.add(score);
      }
      if (imported.isEmpty) {
        return const <SheetScore>[];
      }
      _scores = <SheetScore>[...imported.reversed, ..._scores];
      await store.saveScores(_scores);
      return List<SheetScore>.unmodifiable(imported);
    } catch (error) {
      _errorMessage = '공유받은 PDF를 가져오지 못했습니다. 원본 앱에서 파일을 기기에 저장하거나 클라우드 파일을 내려받은 뒤 다시 열어보세요.';
      return const <SheetScore>[];
    } finally {
      _isImporting = false;
      notifyListeners();
    }
  }

  List<SheetScoreShareCandidate> shareCandidates(SheetScore score) {
    return store.shareCandidates(score);
  }

  Future<void> markOpened(SheetScore score) async {
    await _replace(score.copyWith(lastOpenedAt: DateTime.now()));
  }

  Future<void> updateLastPage(SheetScore score, int pageNumber) async {
    if (pageNumber < 1 || score.lastPage == pageNumber) {
      return;
    }

    await _replace(
      score.copyWith(
        lastPage: pageNumber,
        lastOpenedAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
    );
  }

  Future<void> toggleFavorite(SheetScore score) async {
    await _replace(
      score.copyWith(isFavorite: !score.isFavorite, updatedAt: DateTime.now()),
    );
  }

  Future<void> togglePinned(SheetScore score) async {
    await _replace(
      score.copyWith(isPinned: !score.isPinned, updatedAt: DateTime.now()),
    );
  }

  Future<void> toggleBookmark(SheetScore score, int pageNumber) async {
    if (pageNumber < 1) {
      return;
    }

    final existing = score.bookmarks
        .where((bookmark) => bookmark.pageNumber != pageNumber)
        .toList();
    final isRemoving = existing.length != score.bookmarks.length;
    final nextBookmarks = isRemoving
        ? existing
        : <SheetBookmark>[
            ...score.bookmarks,
            SheetBookmark(
              pageNumber: pageNumber,
              label: '$pageNumber쪽',
              createdAt: DateTime.now(),
            ),
          ];
    nextBookmarks.sort((a, b) => a.pageNumber.compareTo(b.pageNumber));

    await _replace(
      score.copyWith(
        bookmarks: List<SheetBookmark>.unmodifiable(nextBookmarks),
        updatedAt: DateTime.now(),
      ),
    );
  }

  Future<void> renameBookmark(
    SheetScore score,
    SheetBookmark bookmark,
    String label,
  ) async {
    final nextBookmarks = score.bookmarks
        .map(
          (candidate) => candidate.pageNumber == bookmark.pageNumber
              ? candidate.copyWith(
                  label: _normalizeBookmarkLabel(label, bookmark.pageNumber),
                )
              : candidate,
        )
        .toList(growable: false);

    await _replace(
      score.copyWith(
        bookmarks: List<SheetBookmark>.unmodifiable(nextBookmarks),
        updatedAt: DateTime.now(),
      ),
    );
  }

  Future<void> deleteBookmark(SheetScore score, SheetBookmark bookmark) async {
    await _replace(
      score.copyWith(
        bookmarks: List<SheetBookmark>.unmodifiable(
          score.bookmarks
              .where((candidate) => candidate.pageNumber != bookmark.pageNumber)
              .toList(growable: false),
        ),
        updatedAt: DateTime.now(),
      ),
    );
  }

  bool isBookmarked(SheetScore score, int pageNumber) {
    return score.bookmarks.any((bookmark) => bookmark.pageNumber == pageNumber);
  }

  Future<void> updateScoreMetadata(
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
    await _replace(
      score.copyWith(
        title: _normalizeScoreTitle(title, score.title),
        composer: composer.trim(),
        tags: _normalizeTags(tags),
        note: note.trim(),
        collection: _normalizeOptionalMetadata(collection ?? score.collection),
        group: _normalizeOptionalMetadata(group ?? score.group),
        rating: SheetScore.normalizeRating(rating ?? score.rating),
        linkedFiles: linkedFiles == null
            ? score.linkedFiles
            : SheetScore.normalizeLinkedFiles(linkedFiles),
        customFields: customFields == null
            ? score.customFields
            : SheetScore.normalizeCustomFields(customFields),
        updatedAt: DateTime.now(),
      ),
    );
  }

  Future<void> createCollectionLibrary(String name) async {
    final normalized = _normalizeOptionalMetadata(name);
    if (normalized.isEmpty) {
      return;
    }
    await updateCollectionFilter(normalized);
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
    await store.saveMetronomeSettings(settings);
    notifyListeners();
  }

  Future<void> updateTunerSettings(SheetTunerSettings settings) async {
    _tunerSettings = settings;
    await store.saveTunerSettings(settings);
    notifyListeners();
  }

  Future<void> updateFavoriteAnnotationPreset(
    SheetAnnotationToolPreset? preset,
  ) async {
    _favoriteAnnotationPreset = preset?.isValid == true ? preset : null;
    await store.saveFavoriteAnnotationPreset(_favoriteAnnotationPreset);
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
        lastPage: _firstMappedPage(
              result.sourcePageMapping,
              score.lastPage,
            ) ??
            1,
        bookmarks: _rebaseBookmarksForAppliedArrangement(
          score.bookmarks,
          result.sourcePageMapping,
        ),
        pageSettings: _rebasePageSettingsForAppliedArrangement(
          score.pageSettings,
          result.sourcePageMapping,
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
    );
  }

  List<SheetBookmark> _rebaseBookmarksForAppliedArrangement(
    List<SheetBookmark> bookmarks,
    Map<int, List<int>> sourcePageMapping,
  ) {
    return List<SheetBookmark>.unmodifiable(
      bookmarks
          .map((bookmark) {
            final pageNumber = _firstMappedPage(
              sourcePageMapping,
              bookmark.pageNumber,
            );
            return pageNumber == null
                ? null
                : bookmark.copyWith(pageNumber: pageNumber);
          })
          .whereType<SheetBookmark>(),
    );
  }

  SheetPageSettings _rebasePageSettingsForAppliedArrangement(
    SheetPageSettings pageSettings,
    Map<int, List<int>> sourcePageMapping,
  ) {
    final pageRotations = <int, int>{};
    for (final entry in pageSettings.pageRotations.entries) {
      for (final pageNumber in sourcePageMapping[entry.key] ?? const <int>[]) {
        pageRotations[pageNumber] = entry.value;
      }
    }

    final pageCrops = <int, SheetCropSettings>{};
    for (final entry in pageSettings.pageCrops.entries) {
      for (final pageNumber in sourcePageMapping[entry.key] ?? const <int>[]) {
        pageCrops[pageNumber] = entry.value;
      }
    }

    return pageSettings.copyWith(
      hiddenPages: const <int>[],
      pageRotations: Map<int, int>.unmodifiable(pageRotations),
      pageCrops: Map<int, SheetCropSettings>.unmodifiable(pageCrops),
      pageOrder: const <int>[],
      jumpPoints: _rebaseJumpPointsForAppliedArrangement(
        pageSettings.jumpPoints,
        sourcePageMapping,
      ),
      rehearsalMarks: _rebaseRehearsalMarksForAppliedArrangement(
        pageSettings.rehearsalMarks,
        sourcePageMapping,
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
      jumpPoints
          .map((jumpPoint) {
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
          })
          .whereType<SheetPageJumpPoint>(),
    );
  }

  List<SheetRehearsalMark> _rebaseRehearsalMarksForAppliedArrangement(
    List<SheetRehearsalMark> marks,
    Map<int, List<int>> sourcePageMapping,
  ) {
    return List<SheetRehearsalMark>.unmodifiable(
      marks
          .map((mark) {
            final pageNumber = _firstMappedPage(
              sourcePageMapping,
              mark.pageNumber,
            );
            return pageNumber == null
                ? null
                : mark.copyWith(pageNumber: pageNumber);
          })
          .whereType<SheetRehearsalMark>(),
    );
  }

  SheetAnnotationLayer _rebaseAnnotationsForAppliedArrangement(
    SheetAnnotationLayer layer,
    Map<int, List<int>> sourcePageMapping,
  ) {
    return SheetAnnotationLayer(
      strokes: List<SheetAnnotationStroke>.unmodifiable(
        layer.strokes.expand(
          (stroke) => _rebaseStrokeForAppliedArrangement(
            stroke,
            sourcePageMapping,
          ),
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

  int? _firstMappedPage(
    Map<int, List<int>> sourcePageMapping,
    int sourcePage,
  ) {
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
    await store.saveSetlists(_setlists);
    notifyListeners();
    return setlist;
  }

  Future<void> renameSetlist(SheetSetlist setlist, String title) async {
    await _replaceSetlist(
      setlist.copyWith(
        title: _normalizeSetlistTitle(title),
        updatedAt: DateTime.now(),
      ),
    );
  }

  Future<SheetSetlist> duplicateSetlist(SheetSetlist setlist) async {
    final now = DateTime.now();
    final duplicate = SheetSetlist(
      id: '${now.microsecondsSinceEpoch}-${Random().nextInt(1 << 32)}',
      title: '${setlist.title} copy',
      scoreIds: List<String>.unmodifiable(setlist.scoreIds),
      createdAt: now,
      updatedAt: now,
      rehearsalMode: setlist.rehearsalMode,
      scoreStartPages: Map<String, int>.unmodifiable(setlist.scoreStartPages),
      scoreNotes: Map<String, String>.unmodifiable(setlist.scoreNotes),
      scoreDurations: Map<String, int>.unmodifiable(setlist.scoreDurations),
      transitionSeconds: setlist.transitionSeconds,
    );
    _setlists = <SheetSetlist>[duplicate, ..._setlists];
    await store.saveSetlists(_setlists);
    notifyListeners();
    return duplicate;
  }

  Future<void> deleteSetlist(SheetSetlist setlist) async {
    _setlists = _setlists
        .where((candidate) => candidate.id != setlist.id)
        .toList(growable: false);
    await store.saveSetlists(_setlists);
    notifyListeners();
  }

  Future<void> addScoreToSetlist(SheetSetlist setlist, SheetScore score) async {
    await _replaceSetlist(setlist.appendScore(score.id, DateTime.now()));
  }

  Future<void> removeScoreFromSetlist(
    SheetSetlist setlist,
    SheetScore score,
  ) async {
    await _replaceSetlist(setlist.removeScore(score.id, DateTime.now()));
  }

  Future<void> moveScoreInSetlist(
    SheetSetlist setlist,
    int fromIndex,
    int toIndex,
  ) async {
    await _replaceSetlist(
      setlist.moveScore(fromIndex, toIndex, DateTime.now()),
    );
  }

  Future<void> updateSetlistRehearsalSettings(
    SheetSetlist setlist, {
    bool? rehearsalMode,
    int? transitionSeconds,
    Map<String, int>? scoreStartPages,
    Map<String, String>? scoreNotes,
    Map<String, int>? scoreDurations,
  }) async {
    await _replaceSetlist(
      setlist.copyWith(
        rehearsalMode: rehearsalMode,
        transitionSeconds: transitionSeconds,
        scoreStartPages: scoreStartPages == null
            ? null
            : Map<String, int>.unmodifiable(scoreStartPages),
        scoreNotes: scoreNotes == null
            ? null
            : Map<String, String>.unmodifiable(scoreNotes),
        scoreDurations: scoreDurations == null
            ? null
            : Map<String, int>.unmodifiable(scoreDurations),
        updatedAt: DateTime.now(),
      ),
    );
  }

  Future<int> bulkEditScores(
    Set<String> scoreIds, {
    List<String> addTags = const <String>[],
    List<String> removeTags = const <String>[],
    String? collection,
    String? group,
    int? rating,
    bool? isFavorite,
    bool? isPinned,
  }) async {
    if (scoreIds.isEmpty) {
      return 0;
    }
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
    _scores = _scores
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
          changedCount += 1;
          return score.copyWith(
            tags: List<String>.unmodifiable(nextTags),
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
            updatedAt: now,
          );
        })
        .toList(growable: false);
    if (changedCount > 0) {
      await store.saveScores(_scores);
      notifyListeners();
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

  Future<void> clearLibrarySearchAndFilters() async {
    _query = '';
    await _updateLibraryViewSettings(
      _libraryViewSettings.copyWith(
        favoriteOnly: false,
        tagQuery: '',
        collectionQuery: '',
        groupQuery: '',
        minimumRating: 0,
      ),
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

  Future<void> _replace(SheetScore updated) async {
    _scores = _scores
        .map((score) => score.id == updated.id ? updated : score)
        .toList(growable: false);
    await store.saveScores(_scores);
    notifyListeners();
  }

  SheetAnnotationLayer _guardAnnotationLayer(SheetAnnotationLayer layer) {
    return layer.compactRedoStack(maxEntries: 40);
  }

  Future<void> _replaceSetlist(SheetSetlist updated) async {
    _setlists = _setlists
        .map((setlist) => setlist.id == updated.id ? updated : setlist)
        .toList(growable: false);
    await store.saveSetlists(_setlists);
    notifyListeners();
  }

  Future<void> _updateLibraryViewSettings(
    SheetLibraryViewSettings settings,
  ) async {
    _libraryViewSettings = settings;
    await store.saveLibraryViewSettings(settings);
    notifyListeners();
  }

  SheetScore _withActiveCollection(SheetScore score) {
    final collection = _normalizeOptionalMetadata(
      _libraryViewSettings.collectionQuery,
    );
    if (collection.isEmpty || score.collection.trim().isNotEmpty) {
      return score;
    }
    return score.copyWith(collection: collection, updatedAt: DateTime.now());
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
          changed =
              changed ||
              next.scoreIds.length != setlist.scoreIds.length ||
              next.scoreStartPages.length != setlist.scoreStartPages.length ||
              next.scoreNotes.length != setlist.scoreNotes.length;
          return next;
        })
        .toList(growable: false);

    if (changed) {
      _setlists = cleaned;
      await store.saveSetlists(_setlists);
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
  });

  final String title;
  final int currentIndex;
  final int totalCount;
  final int currentDurationSeconds;
  final int totalEstimatedSeconds;

  String get positionLabel => '${currentIndex + 1}/$totalCount';
}
