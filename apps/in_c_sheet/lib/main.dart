import 'dart:async';
import 'dart:io';
import 'dart:math' as math;
import 'dart:ui' as ui show Canvas;
import 'dart:ui' show PointerDeviceKind;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:pdfrx/pdfrx.dart';
import 'package:share_plus/share_plus.dart';

import 'classical_discovery_app.dart';
import 'classical_discovery_controller.dart';
import 'classical_discovery_store.dart';
import 'pdf_link_policy.dart';
import 'sheet_annotated_pdf_exporter.dart';
import 'sheet_annotation.dart';
import 'sheet_annotation_geometry.dart';
import 'sheet_audio_player.dart';
import 'sheet_auto_scroll.dart';
import 'sheet_file_import.dart';
import 'sheet_half_page.dart';
import 'sheet_library_backup.dart';
import 'sheet_library_controller.dart';
import 'sheet_library_profile.dart';
import 'sheet_library_store.dart';
import 'sheet_library_view_settings.dart';
import 'sheet_metronome.dart';
import 'sheet_metronome_player.dart';
import 'sheet_pdf_search_support.dart';
import 'sheet_rc_feedback.dart';
import 'sheet_score.dart';
import 'sheet_setlist.dart';
import 'sheet_stylus_input.dart';
import 'sheet_tone.dart';
import 'sheet_tuner.dart';
import 'sheet_tuner_input_service.dart';
import 'sheet_viewer_file_status.dart';
import 'sheet_viewer_input.dart';

const MethodChannel _sharedImportChannel = MethodChannel('clef/shared_imports');
const String _clefAppVersion = '1.0.0+20';
const bool _launchInCDiscoveryHome = bool.fromEnvironment(
  'IN_C_DISCOVERY_HOME',
);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await pdfrxFlutterInitialize();

  final controller = SheetLibraryController(store: SheetLibraryStore());
  await controller.load();
  final discoveryController = ClassicalDiscoveryController(
    store: ClassicalDiscoveryStore(),
  );
  await discoveryController.load();

  if (_launchInCDiscoveryHome) {
    runApp(ClassicalDiscoveryApp(controller: discoveryController));
    return;
  }

  runApp(InCSheetApp(controller: controller));
}

Future<int> _readPdfFileRange(
  String path,
  Uint8List buffer,
  int position,
  int size,
) async {
  final file = await File(path).open();
  try {
    await file.setPosition(position);
    final bytes = await file.read(size);
    buffer.setRange(0, bytes.length, bytes);
    return bytes.length;
  } finally {
    await file.close();
  }
}

class InCSheetApp extends StatelessWidget {
  const InCSheetApp({required this.controller, super.key});

  final SheetLibraryController controller;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Clef & Staff',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xff2f6f73),
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xfffbfbf7),
        useMaterial3: true,
      ),
      home: SheetLibraryScreen(controller: controller),
    );
  }
}

class SheetLibraryScreen extends StatefulWidget {
  const SheetLibraryScreen({required this.controller, super.key});

  final SheetLibraryController controller;

  @override
  State<SheetLibraryScreen> createState() => _SheetLibraryScreenState();
}

class _SheetLibraryScreenState extends State<SheetLibraryScreen> {
  final Set<String> _handledSharedImportPaths = <String>{};
  final Set<String> _bulkSelectedScoreIds = <String>{};
  bool _isBulkSelecting = false;

  SheetLibraryController get controller => widget.controller;

  @override
  void initState() {
    super.initState();
    controller.addListener(_handleControllerChanged);
    _sharedImportChannel.setMethodCallHandler(_handleSharedImportCall);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(_consumeInitialSharedImports());
    });
  }

  @override
  void dispose() {
    _sharedImportChannel.setMethodCallHandler(null);
    controller.removeListener(_handleControllerChanged);
    super.dispose();
  }

  void _handleControllerChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  void _toggleBulkSelectionMode() {
    setState(() {
      _isBulkSelecting = !_isBulkSelecting;
      if (!_isBulkSelecting) {
        _bulkSelectedScoreIds.clear();
      }
    });
  }

  void _toggleBulkScoreSelection(SheetScore score) {
    setState(() {
      _isBulkSelecting = true;
      if (!_bulkSelectedScoreIds.add(score.id)) {
        _bulkSelectedScoreIds.remove(score.id);
      }
    });
  }

  void _toggleAllVisibleScoreSelection(List<SheetScore> visibleScores) {
    if (visibleScores.isEmpty) {
      return;
    }
    final visibleIds = visibleScores.map((score) => score.id).toSet();
    final hasUnselectedVisible = visibleIds.any(
      (id) => !_bulkSelectedScoreIds.contains(id),
    );
    setState(() {
      _isBulkSelecting = true;
      if (hasUnselectedVisible) {
        _bulkSelectedScoreIds.addAll(visibleIds);
      } else {
        _bulkSelectedScoreIds.removeAll(visibleIds);
      }
    });
  }

  Future<void> _showBulkEdit() async {
    if (_bulkSelectedScoreIds.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('일괄 편집할 악보를 선택하세요.')));
      return;
    }
    final input = await showModalBottomSheet<_BulkEditInput>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => const _BulkEditSheet(),
    );
    if (!mounted || input == null) {
      return;
    }
    final changedCount = await controller.bulkEditScores(
      Set<String>.of(_bulkSelectedScoreIds),
      addTags: input.addTags,
      removeTags: input.removeTags,
      collection: input.collection,
      group: input.group,
      rating: input.rating,
      isFavorite: input.isFavorite,
      isPinned: input.isPinned,
    );
    if (!mounted) {
      return;
    }
    setState(() {
      _isBulkSelecting = false;
      _bulkSelectedScoreIds.clear();
    });
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text('$changedCount개 악보 정보를 일괄 편집했습니다.')));
  }

  Future<void> _showBulkSetlistAdd() async {
    if (_bulkSelectedScoreIds.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('세트리스트에 넣을 악보를 선택하세요.')));
      return;
    }
    final selectedScores = controller.scores
        .where((score) => _bulkSelectedScoreIds.contains(score.id))
        .toList(growable: false);
    if (selectedScores.isEmpty) {
      return;
    }

    final target = await _selectSetlistForBulkAdd(selectedScores.length);
    if (!mounted || target == null) {
      return;
    }

    final result = await controller.addScoresToSetlist(target, selectedScores);
    if (!mounted) {
      return;
    }
    setState(() {
      _isBulkSelecting = false;
      _bulkSelectedScoreIds.clear();
    });

    final skippedLabel = result.skippedDuplicateCount == 0
        ? ''
        : ' 이미 포함된 ${result.skippedDuplicateCount}개는 건너뛰었습니다.';
    final message = result.didAddAny
        ? '${result.addedCount}개 악보를 "${target.title}"에 추가했습니다.$skippedLabel'
        : '"${target.title}"에 이미 모두 포함되어 있습니다.';
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        action: SnackBarAction(
          label: '열기',
          onPressed: () {
            unawaited(_openSetlistDetail(target));
          },
        ),
      ),
    );
  }

  Future<void> _showBulkCollectionAssign() async {
    if (_bulkSelectedScoreIds.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('컬렉션에 묶을 악보를 선택하세요.')));
      return;
    }
    final collection = await _selectCollectionForBulkAssign(
      _bulkSelectedScoreIds.length,
    );
    if (!mounted || collection == null) {
      return;
    }

    final changedCount = await controller.bulkEditScores(
      Set<String>.of(_bulkSelectedScoreIds),
      collection: collection,
    );
    if (!mounted) {
      return;
    }
    setState(() {
      _isBulkSelecting = false;
      _bulkSelectedScoreIds.clear();
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$changedCount개 악보를 "$collection" 컬렉션으로 묶었습니다.'),
        action: SnackBarAction(
          label: '보기',
          onPressed: () {
            unawaited(controller.updateCollectionFilter(collection));
          },
        ),
      ),
    );
  }

  Future<void> _deleteBulkScores() async {
    if (_bulkSelectedScoreIds.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('제거할 악보를 선택하세요.')));
      return;
    }
    final scoreCount = _bulkSelectedScoreIds.length;
    final didConfirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('선택 악보 제거'),
        content: Text(
          '$scoreCount개 악보를 이 라이브러리 목록에서 제거할까요?\n\n'
          '가져온 PDF 원본 파일은 삭제하지 않고, 세트리스트에 들어간 항목만 함께 정리합니다.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('취소'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('제거'),
          ),
        ],
      ),
    );
    if (!mounted || didConfirm != true) {
      return;
    }

    final deletedCount = await controller.deleteScoresByIds(
      Set<String>.of(_bulkSelectedScoreIds),
    );
    if (!mounted) {
      return;
    }
    setState(() {
      _isBulkSelecting = false;
      _bulkSelectedScoreIds.clear();
    });
    final message = deletedCount == 0
        ? '제거할 악보가 없습니다.'
        : '$deletedCount개 악보를 라이브러리에서 제거했습니다.';
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  Future<SheetSetlist?> _selectSetlistForBulkAdd(int scoreCount) async {
    final action = await showModalBottomSheet<_BulkSetlistTargetAction>(
      context: context,
      showDragHandle: true,
      builder: (context) => _BulkSetlistTargetSheet(
        setlists: controller.setlists,
        scoreCount: scoreCount,
      ),
    );
    if (!mounted || action == null) {
      return null;
    }
    if (action.createNew) {
      final title = await _showTextEntryDialog(
        context: context,
        title: '새 세트리스트 만들기',
        label: '이름',
        initialValue: '새 세트리스트',
      );
      if (!mounted || title == null) {
        return null;
      }
      final existing = controller.setlistByTitleOrNull(title);
      if (existing != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('"${existing.title}" 세트리스트가 이미 있습니다.')),
        );
        return existing;
      }
      return controller.createSetlist(title);
    }
    return action.setlist;
  }

  Future<String?> _selectCollectionForBulkAssign(int scoreCount) async {
    final action = await showModalBottomSheet<_BulkCollectionTargetAction>(
      context: context,
      showDragHandle: true,
      builder: (context) => _BulkCollectionTargetSheet(
        collections: controller.allCollections,
        scoreCount: scoreCount,
      ),
    );
    if (!mounted || action == null) {
      return null;
    }
    if (action.collectionName != null) {
      return action.collectionName;
    }
    final input = await _showTextEntryDialog(
      context: context,
      title: '새 컬렉션 지정',
      label: '컬렉션 이름',
      initialValue: controller.libraryViewSettings.collectionQuery.isEmpty
          ? '새 컬렉션'
          : controller.libraryViewSettings.collectionQuery,
    );
    if (!mounted || input == null) {
      return null;
    }
    final collection = input.trim();
    if (collection.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('컬렉션 이름을 입력하세요.')));
      return null;
    }
    return collection;
  }

  Future<void> _importPdf({bool addToSetlist = false}) async {
    final score = await controller.importPdf();
    if (!mounted || score == null) {
      return;
    }
    final openedExisting = controller.lastImportOpenedExistingScore;
    if (openedExisting) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('"${score.title}"이 이미 있어 기존 악보를 엽니다.')),
      );
    }
    if (addToSetlist) {
      await _addImportedScoreToSetlist(score);
      if (!mounted) {
        return;
      }
    }
    await _openScore(score, showImportNudge: !openedExisting);
  }

  Future<void> _importPdfs({bool addToSetlist = false}) async {
    final result = await controller.importPdfs();
    if (!mounted || result.isEmpty) {
      return;
    }
    if (addToSetlist) {
      final target = await _selectSetlistForBulkAdd(result.scores.length);
      if (!mounted || target == null) {
        return;
      }
      final setlistResult = await controller.addScoresToSetlist(
        target,
        result.scores,
      );
      if (!mounted) {
        return;
      }
      final added = setlistResult.addedCount;
      final skipped = setlistResult.skippedDuplicateCount;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            skipped > 0
                ? '"${target.title}"에 $added개 추가, $skipped개는 이미 있었습니다.'
                : '"${target.title}"에 $added개 악보를 추가했습니다.',
          ),
        ),
      );
      return;
    }

    final duplicateSuffix = result.existingCount > 0
        ? ' 기존 악보 ${result.existingCount}개는 다시 만들지 않았습니다.'
        : '';
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${result.importedCount}개 PDF를 가져왔습니다.$duplicateSuffix'),
      ),
    );
  }

  Future<void> _importImagesAsPdf({bool addToSetlist = false}) async {
    final score = await controller.importImagesAsPdf();
    if (!mounted || score == null) {
      return;
    }
    if (addToSetlist) {
      await _addImportedScoreToSetlist(score);
      if (!mounted) {
        return;
      }
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('"${score.title}" 이미지 PDF를 추가했습니다.')),
    );
    await _openScore(score, showImportNudge: true);
  }

  Future<void> _addImportedScoreToSetlist(SheetScore score) async {
    final target = await _selectSetlistForBulkAdd(1);
    if (!mounted || target == null) {
      return;
    }
    final result = await controller.addScoresToSetlist(target, <SheetScore>[
      score,
    ]);
    if (!mounted) {
      return;
    }
    final message = result.didAddAny
        ? '"${score.title}"을 "${target.title}"에 추가했습니다.'
        : '"${target.title}"에 이미 포함되어 있습니다.';
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _showTesterInfo() async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) =>
          _TesterInfoSheet(appVersion: _clefAppVersion, controller: controller),
    );
  }

  Future<void> _showImportOptions() async {
    final action = await showModalBottomSheet<_LibraryImportAction>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.picture_as_pdf_outlined),
                title: const Text('PDF 가져오기'),
                subtitle: const Text('파일 앱, 다운로드, 메신저 저장 PDF'),
                onTap: () =>
                    Navigator.of(context).pop(_LibraryImportAction.pdf),
              ),
              ListTile(
                leading: const Icon(Icons.playlist_add_outlined),
                title: const Text('PDF 가져와 세트리스트에 추가'),
                subtitle: const Text('가져온 뒤 기존/새 세트리스트 선택'),
                onTap: () =>
                    Navigator.of(context)
                        .pop(_LibraryImportAction.pdfToSetlist),
              ),
              ListTile(
                leading: const Icon(Icons.library_add_outlined),
                title: const Text('여러 PDF 가져오기'),
                subtitle: const Text('여러 파일을 한 번에 라이브러리에 추가'),
                onTap: () =>
                    Navigator.of(context).pop(_LibraryImportAction.pdfs),
              ),
              ListTile(
                leading: const Icon(Icons.playlist_add_check_outlined),
                title: const Text('여러 PDF를 세트리스트에 추가'),
                subtitle: const Text('묶음으로 가져온 뒤 공연 순서에 추가'),
                onTap: () =>
                    Navigator.of(context)
                        .pop(_LibraryImportAction.pdfsToSetlist),
              ),
              ListTile(
                leading: const Icon(Icons.photo_library_outlined),
                title: const Text('이미지를 PDF 악보로 묶기'),
                subtitle: const Text('JPG/PNG를 페이지별 PDF로 등록'),
                onTap: () =>
                    Navigator.of(context).pop(_LibraryImportAction.images),
              ),
              ListTile(
                leading: const Icon(Icons.add_photo_alternate_outlined),
                title: const Text('이미지를 묶어 세트리스트에 추가'),
                subtitle: const Text('이미지 PDF 생성 뒤 세트리스트 선택'),
                onTap: () =>
                    Navigator.of(context)
                        .pop(_LibraryImportAction.imagesToSetlist),
              ),
            ],
          ),
        ),
      ),
    );
    switch (action) {
      case _LibraryImportAction.pdf:
        await _importPdf();
      case _LibraryImportAction.pdfToSetlist:
        await _importPdf(addToSetlist: true);
      case _LibraryImportAction.pdfs:
        await _importPdfs();
      case _LibraryImportAction.pdfsToSetlist:
        await _importPdfs(addToSetlist: true);
      case _LibraryImportAction.images:
        await _importImagesAsPdf();
      case _LibraryImportAction.imagesToSetlist:
        await _importImagesAsPdf(addToSetlist: true);
      case null:
        return;
    }
  }

  Future<void> _openRecentSetlist(SheetSetlist setlist) async {
    final scores = controller.scoresForSetlist(setlist);
    if (!mounted) {
      return;
    }
    if (scores.isEmpty) {
      await controller.markSetlistOpened(setlist);
      if (!mounted) {
        return;
      }
      await Navigator.of(context).push<void>(
        MaterialPageRoute<void>(
          builder: (context) => SheetSetlistDetailScreen(
            controller: controller,
            setlistId: setlist.id,
          ),
        ),
      );
      return;
    }
    final score = _scoreToOpenForSetlistResume(setlist, scores);
    await controller.markSetlistOpened(setlist, scoreId: score.id);
    await controller.markOpened(score);
    if (!mounted) {
      return;
    }
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (context) => SheetViewerScreen(
          controller: controller,
          scoreId: score.id,
          setlistId: setlist.id,
        ),
      ),
    );
  }

  Future<void> _openSetlistDetail(SheetSetlist setlist) async {
    final currentSetlist = controller.setlistByIdOrNull(setlist.id);
    if (currentSetlist == null) {
      return;
    }
    await controller.markSetlistOpened(currentSetlist);
    if (!mounted) {
      return;
    }
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (context) => SheetSetlistDetailScreen(
          controller: controller,
          setlistId: currentSetlist.id,
        ),
      ),
    );
  }

  Future<void> _showLibrarySwitcher() async {
    final action = await showModalBottomSheet<_LibraryProfileAction>(
      context: context,
      showDragHandle: true,
      builder: (context) => _LibraryProfileSheet(
        activeLibraryId: controller.activeLibraryProfile.id,
        profiles: controller.libraryProfiles,
        activeScoreCount: controller.scores.length,
      ),
    );
    if (!mounted || action == null) {
      return;
    }

    switch (action.type) {
      case _LibraryProfileActionType.all:
        await controller.switchLibraryProfile(SheetLibraryProfile.defaultId);
      case _LibraryProfileActionType.select:
        await controller.switchLibraryProfile(action.libraryId);
      case _LibraryProfileActionType.create:
        final name = await _showTextEntryDialog(
          context: context,
          title: '라이브러리 만들기',
          label: '라이브러리 이름',
          initialValue: '',
        );
        if (!mounted || name == null) {
          return;
        }
        final duplicate = controller.libraryProfileByName(name);
        if (duplicate != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('"${duplicate.name}" 라이브러리가 이미 있습니다.'),
              action: SnackBarAction(
                label: '열기',
                onPressed: () =>
                    unawaited(controller.switchLibraryProfile(duplicate.id)),
              ),
            ),
          );
          return;
        }
        await controller.createLibraryProfile(name);
      case _LibraryProfileActionType.rename:
        final name = await _showTextEntryDialog(
          context: context,
          title: '라이브러리 이름 변경',
          label: '새 이름',
          initialValue: action.label,
        );
        if (!mounted || name == null) {
          return;
        }
        final didRename = await controller.renameLibraryProfile(
          id: action.libraryId,
          name: name,
        );
        if (didRename && mounted) {
          ScaffoldMessenger.of(context)
              .showSnackBar(const SnackBar(content: Text('라이브러리 이름을 변경했습니다.')));
        } else if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('같은 이름의 라이브러리가 이미 있습니다.')),
          );
        }
      case _LibraryProfileActionType.delete:
        final didConfirm = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('라이브러리 비우기'),
            content: Text(
              '"${action.label}" 라이브러리의 악보 파일은 삭제하지 않고, 이 라이브러리 정보만 비웁니다.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('취소'),
              ),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text('비우기'),
              ),
            ],
          ),
        );
        if (!mounted || didConfirm != true) {
          return;
        }
        final didClear = await controller.clearLibraryProfile(action.libraryId);
        if (didClear && mounted) {
          ScaffoldMessenger.of(context)
              .showSnackBar(const SnackBar(content: Text('라이브러리를 비웠습니다.')));
        }
    }
  }

  Future<void> _shareScore(SheetScore score) async {
    final candidate = await _selectShareCandidate(score);
    if (candidate == null || !mounted) {
      return;
    }

    final exists = await File(candidate.path).exists();
    if (!exists) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              '공유할 파일을 찾지 못했습니다. '
              '다시 가져오거나 전체 백업을 복원해주세요.',
            ),
          ),
        );
      }
      return;
    }

    try {
      await SharePlus.instance.share(
        ShareParams(
          subject: score.title,
          files: [
            XFile(
              candidate.path,
              name: candidate.fileName,
              mimeType: candidate.mimeType,
            ),
          ],
        ),
      );
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('파일을 공유하지 못했습니다.')));
      }
    }
  }

  Future<SheetScoreShareCandidate?> _selectShareCandidate(
    SheetScore score,
  ) async {
    final candidates = controller.shareCandidates(score);
    if (candidates.length == 1) {
      return candidates.single;
    }
    return showModalBottomSheet<SheetScoreShareCandidate>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            for (final candidate in candidates)
              ListTile(
                leading: Icon(_shareCandidateIcon(candidate)),
                title: Text(candidate.label),
                subtitle: Text(candidate.fileName),
                onTap: () => Navigator.of(context).pop(candidate),
              ),
          ],
        ),
      ),
    );
  }

  Future<dynamic> _handleSharedImportCall(MethodCall call) async {
    if (call.method != 'sharedFiles') {
      return null;
    }
    await _importSharedFiles(call.arguments);
    return null;
  }

  Future<void> _consumeInitialSharedImports() async {
    try {
      final sharedFiles = await _sharedImportChannel.invokeMethod<Object?>(
        'getInitialSharedFiles',
      );
      await _importSharedFiles(sharedFiles);
    } catch (_) {
      // External share import is best-effort; normal library use should continue.
    }
  }

  Future<void> _importSharedFiles(Object? value) async {
    final parsedFiles = _parseSharedImportFiles(value);
    final files = parsedFiles
        .where((file) => !_handledSharedImportPaths.contains(file.path))
        .toList(growable: false);
    if (files.isEmpty || !mounted) {
      return;
    }
    if (controller.isImporting) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('가져오기가 끝난 뒤 다시 시도해주세요.')));
      return;
    }
    _handledSharedImportPaths.addAll(files.map((file) => file.path));
    final imported = await controller.importSharedPdfFiles(files);
    if (!mounted) {
      return;
    }
    if (imported.isEmpty) {
      _handledSharedImportPaths.removeAll(files.map((file) => file.path));
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('공유받은 PDF를 가져오지 못했습니다.')));
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${imported.length}개 PDF를 Clef & Staff 라이브러리에 추가했습니다.'),
      ),
    );
    await _openScore(imported.first, showImportNudge: true);
  }

  Future<void> _openScore(
    SheetScore score, {
    String? setlistId,
    bool showImportNudge = false,
  }) async {
    await controller.markOpened(score);
    if (!mounted) {
      return;
    }

    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (context) => SheetViewerScreen(
          controller: controller,
          scoreId: score.id,
          setlistId: setlistId,
          showImportNudge: showImportNudge,
        ),
      ),
    );
  }

  Future<void> _editScore(SheetScore score) async {
    final result = await _showScoreMetadataDialog(
      context: context,
      score: score,
      onAddLinkedFile: controller.pickLinkedFile,
    );
    if (result == null) {
      return;
    }

    await controller.updateScoreMetadata(
      score,
      title: result.title,
      composer: result.composer,
      tags: result.tags,
      note: result.note,
      collection: result.collection,
      group: result.group,
      rating: result.rating,
      linkedFiles: result.linkedFiles,
      customFields: result.customFields,
    );
  }

  Future<void> _selectSortMode() async {
    final selected = await showModalBottomSheet<SheetLibrarySortMode>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: SheetLibrarySortMode.values
              .map(
                (mode) => ListTile(
                  leading: Icon(_librarySortIcon(mode)),
                  title: Text(_librarySortLabel(mode)),
                  trailing: controller.libraryViewSettings.sortMode == mode
                      ? const Icon(Icons.check)
                      : null,
                  onTap: () => Navigator.of(context).pop(mode),
                ),
              )
              .toList(growable: false),
        ),
      ),
    );
    if (selected != null) {
      await controller.updateLibrarySortMode(selected);
    }
  }

  Future<void> _selectTagFilter() async {
    final tags = controller.allTags;
    final selected = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            ListTile(
              leading: const Icon(Icons.sell_outlined),
              title: const Text('전체 태그'),
              trailing: controller.libraryViewSettings.tagQuery.isEmpty
                  ? const Icon(Icons.check)
                  : null,
              onTap: () => Navigator.of(context).pop(''),
            ),
            for (final tag in tags)
              ListTile(
                leading: const Icon(Icons.sell_outlined),
                title: Text(tag),
                trailing: controller.libraryViewSettings.tagQuery == tag
                    ? const Icon(Icons.check)
                    : null,
                onTap: () => Navigator.of(context).pop(tag),
              ),
          ],
        ),
      ),
    );
    if (selected != null) {
      await controller.updateTagFilter(selected);
    }
  }

  Future<void> _selectCollectionFilter() async {
    final collections = controller.allCollections;
    final selected = await _selectMetadataFilter(
      title: '컬렉션',
      currentValue: controller.libraryViewSettings.collectionQuery,
      values: collections,
      icon: Icons.collections_bookmark_outlined,
    );
    if (selected != null) {
      await controller.updateCollectionFilter(selected);
    }
  }

  Future<void> _selectGroupFilter() async {
    final groups = controller.allGroups;
    final selected = await _selectMetadataFilter(
      title: '그룹',
      currentValue: controller.libraryViewSettings.groupQuery,
      values: groups,
      icon: Icons.folder_outlined,
    );
    if (selected != null) {
      await controller.updateGroupFilter(selected);
    }
  }

  Future<String?> _selectMetadataFilter({
    required String title,
    required String currentValue,
    required List<String> values,
    required IconData icon,
  }) {
    return showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            ListTile(
              leading: Icon(icon),
              title: Text('$title 전체'),
              trailing: currentValue.isEmpty ? const Icon(Icons.check) : null,
              onTap: () => Navigator.of(context).pop(''),
            ),
            for (final value in values)
              ListTile(
                leading: Icon(icon),
                title: Text(value),
                trailing: currentValue == value
                    ? const Icon(Icons.check)
                    : null,
                onTap: () => Navigator.of(context).pop(value),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _selectRatingFilter() async {
    final selected = await showModalBottomSheet<int>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            ListTile(
              leading: const Icon(Icons.star_border),
              title: const Text('별점 전체'),
              trailing: controller.libraryViewSettings.minimumRating == 0
                  ? const Icon(Icons.check)
                  : null,
              onTap: () => Navigator.of(context).pop(0),
            ),
            for (var rating = 5; rating >= 1; rating -= 1)
              ListTile(
                leading: const Icon(Icons.star_outline),
                title: Text('$rating점 이상'),
                trailing: controller.libraryViewSettings.minimumRating == rating
                    ? const Icon(Icons.check)
                    : null,
                onTap: () => Navigator.of(context).pop(rating),
              ),
          ],
        ),
      ),
    );
    if (selected != null) {
      await controller.updateMinimumRatingFilter(selected);
    }
  }

  Future<void> _exportBackup() async {
    final annotationSummary = _libraryAnnotationSummary();
    if (annotationSummary != null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(annotationSummary)));
    }
    final result = await controller.exportMetadataBackup();
    if (!mounted) {
      return;
    }
    final messenger = ScaffoldMessenger.of(context);
    if (!result.didExport) {
      messenger.showSnackBar(const SnackBar(content: Text('백업을 만들지 못했습니다.')));
      return;
    }
    messenger.showSnackBar(
      SnackBar(content: Text('정보 백업을 저장했습니다: ${result.outputUri}')),
    );
  }

  Future<void> _exportFullBackup() async {
    final annotationSummary = _libraryAnnotationSummary();
    if (annotationSummary != null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(annotationSummary)));
    }
    final result = await controller.exportFullBackup();
    if (!mounted) {
      return;
    }
    final messenger = ScaffoldMessenger.of(context);
    if (!result.didExport) {
      messenger.showSnackBar(
        const SnackBar(content: Text('전체 백업을 만들지 못했습니다.')),
      );
      return;
    }
    messenger.showSnackBar(
      SnackBar(content: Text('PDF 포함 전체 백업을 저장했습니다: ${result.outputUri}')),
    );
  }

  String? _libraryAnnotationSummary() {
    var strokes = 0;
    var texts = 0;
    var points = 0;
    var bytes = 0;
    var externalScores = 0;
    for (final score in controller.scores) {
      final summary = score.annotationLayer.summary(
        storageMode: score.annotationStorage.mode,
        lastSaveStatus: score.annotationStorage.lastSaveStatus,
        lastSaveError: score.annotationStorage.lastSaveError,
      );
      strokes += summary.strokeCount;
      texts += summary.textCount;
      points += summary.pointCount;
      bytes += summary.estimatedJsonBytes;
      if (score.annotationStorage.isExternal) {
        externalScores += 1;
      }
    }
    if (strokes == 0 && texts == 0) {
      return null;
    }
    final externalLabel = externalScores == 0
        ? ''
        : ' · 외부 필기 저장소 $externalScores개';
    return '백업에 필기 $strokes개, 텍스트 $texts개, 포인트 $points개 '
        '(${_formatBytes(bytes)})가 포함됩니다$externalLabel.';
  }

  Future<void> _importBackup() async {
    final didConfirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('정보 복원'),
        content: const Text(
          '백업 JSON의 악보 정보, 세트리스트, 도구 설정으로 현재 앱 데이터를 덮어씁니다. PDF 파일 자체는 복원되지 않습니다.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('취소'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('복원'),
          ),
        ],
      ),
    );
    if (didConfirm != true || !mounted) {
      return;
    }

    final result = await controller.importMetadataBackup();
    if (!mounted) {
      return;
    }
    final message = switch (result.status) {
      SheetLibraryBackupRestoreStatus.restored =>
        '${result.restoredScoreCount}개 악보와 ${result.restoredSetlistCount}개 세트리스트 정보를 복원했습니다.',
      SheetLibraryBackupRestoreStatus.canceled => '복원을 취소했습니다.',
      SheetLibraryBackupRestoreStatus.unsupportedVersion => '지원하지 않는 백업 버전입니다.',
      SheetLibraryBackupRestoreStatus.invalid => '올바른 백업 JSON이 아닙니다.',
      SheetLibraryBackupRestoreStatus.error => '백업을 복원하지 못했습니다.',
    };
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _restoreAutomaticBackup() async {
    final didConfirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('자동 정보 복원'),
        content: const Text(
          '마지막 자동 정보 백업으로 현재 라이브러리 데이터를 덮어씁니다. PDF 파일 자체는 복원되지 않습니다.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('취소'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('복원'),
          ),
        ],
      ),
    );
    if (didConfirm != true || !mounted) {
      return;
    }

    final result = await controller.restoreAutomaticMetadataBackup();
    if (!mounted) {
      return;
    }
    final message = switch (result.status) {
      SheetLibraryBackupRestoreStatus.restored =>
        '${result.restoredScoreCount}개 악보와 ${result.restoredSetlistCount}개 세트리스트 정보를 자동 백업에서 복원했습니다.',
      SheetLibraryBackupRestoreStatus.canceled => '복원을 취소했습니다.',
      SheetLibraryBackupRestoreStatus.unsupportedVersion =>
        '지원하지 않는 자동 백업 버전입니다.',
      SheetLibraryBackupRestoreStatus.invalid => '사용 가능한 자동 정보 백업이 없습니다.',
      SheetLibraryBackupRestoreStatus.error => '자동 백업을 복원하지 못했습니다.',
    };
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _showGlobalViewerDefaults() async {
    var settings = controller.globalViewerSettings;
    final selected = await showModalBottomSheet<SheetViewerSettings>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          void updateSettings(SheetViewerSettings next) {
            setModalState(() => settings = next);
          }

          return SafeArea(
            child: Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                bottom: MediaQuery.viewInsetsOf(context).bottom + 24,
              ),
              child: ListView(
                shrinkWrap: true,
                children: [
                  Text(
                    '전역 보기/입력 기본값',
                    style: Theme.of(context).textTheme.titleLarge
                        ?.copyWith(fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: _globalViewerDisplayModeValue(settings),
                    decoration: const InputDecoration(labelText: '보기 모드'),
                    items: const [
                      DropdownMenuItem<String>(
                        value: 'auto',
                        child: Text('자동'),
                      ),
                      DropdownMenuItem<String>(
                        value: 'singlePage',
                        child: Text('1페이지'),
                      ),
                      DropdownMenuItem<String>(
                        value: 'twoPage',
                        child: Text('2페이지'),
                      ),
                      DropdownMenuItem<String>(
                        value: 'continuousVertical',
                        child: Text('세로 스크롤'),
                      ),
                    ],
                    onChanged: (value) {
                      if (value != null) {
                        updateSettings(settings.copyWith(displayMode: value));
                      }
                    },
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: settings.pageScale,
                    decoration: const InputDecoration(labelText: '페이지 맞춤'),
                    items: _SheetViewerPageScale.values
                        .map(
                          (scale) => DropdownMenuItem<String>(
                            value: scale.settingValue,
                            child: Text(scale.label),
                          ),
                        )
                        .toList(growable: false),
                    onChanged: (value) {
                      if (value != null) {
                        updateSettings(settings.copyWith(pageScale: value));
                      }
                    },
                  ),
                  const SizedBox(height: 12),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('반 페이지 넘김'),
                    value: settings.halfPageTurn,
                    onChanged: (value) =>
                        updateSettings(settings.copyWith(halfPageTurn: value)),
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('공연 모드 화면 유지'),
                    value: settings.keepAwakeInPerformance,
                    onChanged: (value) => updateSettings(
                      settings.copyWith(keepAwakeInPerformance: value),
                    ),
                  ),
                  DropdownButtonFormField<String>(
                    initialValue: settings.pedalMapping,
                    decoration: const InputDecoration(labelText: '페달 매핑'),
                    items: _SheetPedalMapping.values
                        .map(
                          (mapping) => DropdownMenuItem<String>(
                            value: mapping.settingValue,
                            child: Text(mapping.label),
                          ),
                        )
                        .toList(growable: false),
                    onChanged: (value) {
                      if (value != null) {
                        updateSettings(settings.copyWith(pedalMapping: value));
                      }
                    },
                  ),
                  if (settings.pedalMapping ==
                      SheetViewerSettings.customPedalMappingType) ...[
                    const SizedBox(height: 12),
                    for (final inputId in sheetViewerCustomInputIds)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: DropdownButtonFormField<String>(
                          initialValue:
                              settings.customPedalMapping[inputId] ??
                              SheetViewerInputAction.none.value,
                          decoration: InputDecoration(
                            labelText: _viewerInputLabel(inputId),
                          ),
                          items: SheetViewerInputAction.values
                              .map(
                                (action) => DropdownMenuItem<String>(
                                  value: action.value,
                                  child: Text(_viewerInputActionLabel(action)),
                                ),
                              )
                              .toList(growable: false),
                          onChanged: (value) {
                            if (value == null) {
                              return;
                            }
                            updateSettings(
                              settings.copyWith(
                                customPedalMapping: <String, String>{
                                  ...settings.customPedalMapping,
                                  inputId: value,
                                },
                              ),
                            );
                          },
                        ),
                      ),
                  ],
                  const SizedBox(height: 12),
                  Align(
                    alignment: Alignment.centerRight,
                    child: FilledButton.icon(
                      onPressed: () => Navigator.of(context).pop(settings),
                      icon: const Icon(Icons.check),
                      label: const Text('저장'),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
    if (selected == null || !mounted) {
      return;
    }
    await controller.updateGlobalViewerSettings(selected);
    if (!mounted) {
      return;
    }
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('전역 보기/입력 기본값을 저장했습니다.')));
  }

  Future<void> _importFullBackup() async {
    final didConfirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('전체 백업 복원'),
        content: const Text(
          'ZIP 백업의 악보 정보, 세트리스트, 도구 설정과 포함된 PDF 파일로 현재 앱 데이터를 덮어씁니다.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('취소'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('복원'),
          ),
        ],
      ),
    );
    if (didConfirm != true || !mounted) {
      return;
    }

    final result = await controller.importFullBackup();
    if (!mounted) {
      return;
    }
    final message = switch (result.status) {
      SheetLibraryBackupRestoreStatus.restored =>
        '${result.restoredScoreCount}개 악보와 ${result.restoredSetlistCount}개 세트리스트를 PDF 포함 백업에서 복원했습니다.',
      SheetLibraryBackupRestoreStatus.canceled => '복원을 취소했습니다.',
      SheetLibraryBackupRestoreStatus.unsupportedVersion =>
        '지원하지 않는 전체 백업 버전입니다.',
      SheetLibraryBackupRestoreStatus.invalid => '올바른 Clef 전체 백업 ZIP이 아닙니다.',
      SheetLibraryBackupRestoreStatus.error => '전체 백업을 복원하지 못했습니다.',
    };
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final scores = controller.filteredScores;
    final visibleScoreIds = scores.map((score) => score.id).toSet();
    final hasUnselectedVisibleScore = visibleScoreIds.any(
      (id) => !_bulkSelectedScoreIds.contains(id),
    );
    final hasActiveLibraryCondition =
        controller.query.trim().isNotEmpty ||
        controller.libraryViewSettings.hasAnyFilter;

    return Scaffold(
      appBar: AppBar(
        title: _isBulkSelecting
            ? Text('${_bulkSelectedScoreIds.length}개 선택')
            : null,
        actions: [
          IconButton(
            tooltip: _isBulkSelecting ? '선택 취소' : '여러 악보 선택',
            onPressed: _toggleBulkSelectionMode,
            icon: Icon(
              _isBulkSelecting ? Icons.close : Icons.checklist_rtl_outlined,
            ),
          ),
          if (_isBulkSelecting)
            IconButton(
              tooltip: hasUnselectedVisibleScore
                  ? '현재 목록 전체 선택'
                  : '현재 목록 선택 해제',
              onPressed: scores.isEmpty
                  ? null
                  : () => _toggleAllVisibleScoreSelection(scores),
              icon: Icon(
                hasUnselectedVisibleScore ? Icons.select_all : Icons.deselect,
              ),
            ),
          if (_isBulkSelecting)
            IconButton(
              tooltip: '선택 악보를 세트리스트에 추가',
              onPressed: _bulkSelectedScoreIds.isEmpty
                  ? null
                  : _showBulkSetlistAdd,
              icon: const Icon(Icons.playlist_add_check),
            ),
          if (_isBulkSelecting)
            IconButton(
              tooltip: '선택 악보 컬렉션 지정',
              onPressed: _bulkSelectedScoreIds.isEmpty
                  ? null
                  : _showBulkCollectionAssign,
              icon: const Icon(Icons.collections_bookmark_outlined),
            ),
          if (_isBulkSelecting)
            IconButton(
              tooltip: '선택 악보 정보 일괄 편집',
              onPressed: _bulkSelectedScoreIds.isEmpty ? null : _showBulkEdit,
              icon: const Icon(Icons.edit_note),
            ),
          if (_isBulkSelecting)
            IconButton(
              tooltip: '선택 악보 라이브러리에서 제거',
              onPressed: _bulkSelectedScoreIds.isEmpty
                  ? null
                  : _deleteBulkScores,
              icon: const Icon(Icons.delete_outline),
            ),
          if (!_isBulkSelecting) ...[
            IconButton(
              tooltip: '세트리스트',
              onPressed: () {
                Navigator.of(context).push<void>(
                  MaterialPageRoute<void>(
                    builder: (context) =>
                        SheetSetlistsScreen(controller: controller),
                  ),
                );
              },
              icon: const Icon(Icons.queue_music),
            ),
            IconButton(
              tooltip: '테스트 정보',
              onPressed: _showTesterInfo,
              icon: const Icon(Icons.info_outline),
            ),
            IconButton(
              tooltip: '전역 보기/입력 기본값',
              onPressed: _showGlobalViewerDefaults,
              icon: const Icon(Icons.settings_applications_outlined),
            ),
            PopupMenuButton<_LibraryBackupAction>(
              tooltip: '백업/복원',
              icon: const Icon(Icons.inventory_2_outlined),
              onSelected: (action) {
                switch (action) {
                  case _LibraryBackupAction.exportMetadata:
                    _exportBackup();
                  case _LibraryBackupAction.importMetadata:
                    _importBackup();
                  case _LibraryBackupAction.restoreAutomaticMetadata:
                    _restoreAutomaticBackup();
                  case _LibraryBackupAction.exportFull:
                    _exportFullBackup();
                  case _LibraryBackupAction.importFull:
                    _importFullBackup();
                }
              },
              itemBuilder: (context) => const [
                PopupMenuItem<_LibraryBackupAction>(
                  value: _LibraryBackupAction.exportMetadata,
                  child: ListTile(
                    leading: Icon(Icons.ios_share),
                    title: Text('정보 백업'),
                  ),
                ),
                PopupMenuItem<_LibraryBackupAction>(
                  value: _LibraryBackupAction.importMetadata,
                  child: ListTile(
                    leading: Icon(Icons.restore),
                    title: Text('정보 복원'),
                  ),
                ),
                PopupMenuItem<_LibraryBackupAction>(
                  value: _LibraryBackupAction.restoreAutomaticMetadata,
                  child: ListTile(
                    leading: Icon(Icons.history),
                    title: Text('자동 정보 복원'),
                  ),
                ),
                PopupMenuDivider(),
                PopupMenuItem<_LibraryBackupAction>(
                  value: _LibraryBackupAction.exportFull,
                  child: ListTile(
                    leading: Icon(Icons.archive_outlined),
                    title: Text('PDF 포함 전체 백업'),
                  ),
                ),
                PopupMenuItem<_LibraryBackupAction>(
                  value: _LibraryBackupAction.importFull,
                  child: ListTile(
                    leading: Icon(Icons.unarchive_outlined),
                    title: Text('전체 백업 복원'),
                  ),
                ),
              ],
            ),
            IconButton(
              tooltip: '악보 추가',
              onPressed: controller.isImporting ? null : _showImportOptions,
              icon: controller.isImporting
                  ? const SizedBox.square(
                      dimension: 20,
                      child: CircularProgressIndicator(strokeWidth: 2.5),
                    )
                  : const Icon(Icons.add_to_photos_outlined),
            ),
          ],
        ],
      ),
      floatingActionButton: null,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth >= 720;
            return Center(
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: isWide ? 1120 : 640),
                child: Padding(
                  padding: EdgeInsets.fromLTRB(
                    isWide ? 28 : 16,
                    12,
                    isWide ? 28 : 16,
                    isWide ? 24 : 96,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _SearchField(
                        query: controller.query,
                        onChanged: controller.updateQuery,
                      ),
                      const SizedBox(height: 10),
                      _LibraryProfileBar(
                        activeLibrary: controller.activeLibraryProfile.name,
                        visibleCount: scores.length,
                        totalCount: controller.scores.length,
                        onPressed: _showLibrarySwitcher,
                      ),
                      const SizedBox(height: 10),
                      _LibraryViewBar(
                        settings: controller.libraryViewSettings,
                        onSortPressed: _selectSortMode,
                        onFavoriteChanged: controller.updateFavoriteFilter,
                        onTagPressed: _selectTagFilter,
                        onCollectionPressed: _selectCollectionFilter,
                        onGroupPressed: _selectGroupFilter,
                        onRatingPressed: _selectRatingFilter,
                      ),
                      _ActiveLibraryFiltersBar(
                        query: controller.query,
                        settings: controller.libraryViewSettings,
                        onClearQuery: () => controller.updateQuery(''),
                        onClearFavorite: () =>
                            controller.updateFavoriteFilter(false),
                        onClearTag: () => controller.updateTagFilter(''),
                        onClearCollection: () =>
                            controller.updateCollectionFilter(''),
                        onClearGroup: () => controller.updateGroupFilter(''),
                        onClearRating: () =>
                            controller.updateMinimumRatingFilter(0),
                        onClearCustomField: (fieldKey) =>
                            controller.updateCustomFieldFilter(fieldKey, ''),
                        onClearAll: controller.clearLibrarySearchAndFilters,
                      ),
                      if (!hasActiveLibraryCondition) ...[
                        const SizedBox(height: 10),
                        _LibraryFacetExplorer(
                          collectionFacets: controller.collectionFacets,
                          groupFacets: controller.groupFacets,
                          ratingFacets: controller.ratingFacets,
                          customFieldFacets: <String, List<SheetLibraryFacet>>{
                            for (final key in _commonCustomMetadataFieldKeys)
                              key: controller.customFieldFacets(key),
                          },
                          selectedCollection:
                              controller.libraryViewSettings.collectionQuery,
                          selectedGroup:
                              controller.libraryViewSettings.groupQuery,
                          selectedMinimumRating:
                              controller.libraryViewSettings.minimumRating,
                          selectedCustomFieldFilters:
                              controller.libraryViewSettings.customFieldFilters,
                          onCollectionSelected:
                              controller.updateCollectionFilter,
                          onGroupSelected: controller.updateGroupFilter,
                          onRatingSelected:
                              controller.updateMinimumRatingFilter,
                          onCustomFieldSelected:
                              controller.updateCustomFieldFilter,
                        ),
                      ],
                      const SizedBox(height: 14),
                      if (controller.errorMessage != null)
                        _NoticeBanner(message: controller.errorMessage!),
                      if (controller.errorMessage != null)
                        const SizedBox(height: 12),
                      if (!controller.isLoading &&
                          (controller.pinnedScores.isNotEmpty ||
                              controller.favoriteScores.isNotEmpty ||
                              controller.recentScores.isNotEmpty ||
                              controller
                                  .scoresNeedingMetadataReview
                                  .isNotEmpty ||
                              controller.recentSetlists.isNotEmpty)) ...[
                        _QuickAccessBand(
                          pinnedScores: controller.pinnedScores
                              .take(8)
                              .toList(growable: false),
                          favoriteScores: controller.favoriteScores
                              .take(8)
                              .toList(growable: false),
                          recentScores: controller.recentScores
                              .take(8)
                              .toList(growable: false),
                          metadataReviewScores: controller
                              .scoresNeedingMetadataReview
                              .take(8)
                              .toList(growable: false),
                          onOpen: _openScore,
                          onEdit: _editScore,
                          isSelecting: _isBulkSelecting,
                          selectedIds: _bulkSelectedScoreIds,
                          onSelectionChanged: _toggleBulkScoreSelection,
                        ),
                        if (controller.recentSetlists.isNotEmpty) ...[
                          const SizedBox(height: 10),
                          _RecentSetlistsBand(
                            setlists: controller.recentSetlists
                                .take(8)
                                .toList(growable: false),
                            scoreById: controller.scoreByIdOrNull,
                            onOpen: _openRecentSetlist,
                          ),
                        ],
                        const SizedBox(height: 14),
                      ],
                      Expanded(
                        child: controller.isLoading
                            ? const Center(child: CircularProgressIndicator())
                            : scores.isEmpty
                            ? _EmptyLibrary(
                                hasQuery: controller.query.isNotEmpty,
                                hasFilter:
                                    controller.libraryViewSettings.hasAnyFilter,
                                onImportPressed: _showImportOptions,
                                onClearPressed:
                                    controller.clearLibrarySearchAndFilters,
                                onTesterInfoPressed: _showTesterInfo,
                              )
                            : _ScoreGrid(
                                scores: scores,
                                isWide: isWide,
                                onOpen: _openScore,
                                onFavorite: controller.toggleFavorite,
                                onPin: controller.togglePinned,
                                isSelecting: _isBulkSelecting,
                                selectedIds: _bulkSelectedScoreIds,
                                onSelectionChanged: _toggleBulkScoreSelection,
                                onEdit: _editScore,
                                onShare: _shareScore,
                              ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _SearchField extends StatefulWidget {
  const _SearchField({required this.query, required this.onChanged});

  final String query;
  final ValueChanged<String> onChanged;

  @override
  State<_SearchField> createState() => _SearchFieldState();
}

class _SearchFieldState extends State<_SearchField> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.query);
  }

  @override
  void didUpdateWidget(covariant _SearchField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.query != _controller.text) {
      _controller.text = widget.query;
      _controller.selection = TextSelection.collapsed(
        offset: _controller.text.length,
      );
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _controller,
      onChanged: widget.onChanged,
      decoration: InputDecoration(
        hintText: '제목, 작곡가, 태그, 컬렉션, 사용자 필드 검색',
        prefixIcon: const Icon(Icons.search),
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: Colors.black.withValues(alpha: 0.12)),
        ),
      ),
    );
  }
}

String _globalViewerDisplayModeValue(SheetViewerSettings settings) {
  return switch (settings.displayMode) {
    'singlePage' => 'singlePage',
    'twoPage' => 'twoPage',
    'continuousVertical' => 'continuousVertical',
    _ => 'auto',
  };
}

enum _LibraryBackupAction {
  exportMetadata,
  importMetadata,
  restoreAutomaticMetadata,
  exportFull,
  importFull,
}

enum _LibraryImportAction {
  pdf,
  pdfToSetlist,
  pdfs,
  pdfsToSetlist,
  images,
  imagesToSetlist,
}

enum _LibraryProfileActionType { all, select, create, rename, delete }

class _LibraryProfileAction {
  const _LibraryProfileAction(
    this.type, {
    this.libraryId = SheetLibraryProfile.defaultId,
    this.label = '',
  });

  final _LibraryProfileActionType type;
  final String libraryId;
  final String label;
}

List<SheetSharedImportFile> _parseSharedImportFiles(Object? value) {
  return normalizeSharedImportPayload(value);
}

class _LibraryProfileBar extends StatelessWidget {
  const _LibraryProfileBar({
    required this.activeLibrary,
    required this.visibleCount,
    required this.totalCount,
    required this.onPressed,
  });

  final String activeLibrary;
  final int visibleCount;
  final int totalCount;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final title = activeLibrary.trim().isEmpty
        ? SheetLibraryProfile.defaultName
        : activeLibrary.trim();
    final subtitle = visibleCount == totalCount
        ? '$totalCount곡'
        : '$visibleCount곡 표시 · 전체 $totalCount곡';
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(8),
      clipBehavior: Clip.antiAlias,
      child: ListTile(
        leading: Icon(
          title == SheetLibraryProfile.defaultName
              ? Icons.library_music_outlined
              : Icons.collections_bookmark,
        ),
        title: Text(
          title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontWeight: FontWeight.w900),
        ),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.expand_more),
        onTap: onPressed,
      ),
    );
  }
}

class _LibraryProfileSheet extends StatelessWidget {
  const _LibraryProfileSheet({
    required this.activeLibraryId,
    required this.profiles,
    required this.activeScoreCount,
  });

  final String activeLibraryId;
  final List<SheetLibraryProfile> profiles;
  final int activeScoreCount;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        shrinkWrap: true,
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          ListTile(
            leading: const Icon(Icons.library_music_outlined),
            title: const Text(SheetLibraryProfile.defaultName),
            subtitle: const Text('기존 악보 저장소'),
            trailing: activeLibraryId == SheetLibraryProfile.defaultId
                ? const Icon(Icons.check)
                : null,
            onTap: () => Navigator.of(
              context,
            ).pop(const _LibraryProfileAction(_LibraryProfileActionType.all)),
          ),
          const Divider(),
          for (final profile in profiles.where((profile) => !profile.isDefault))
            ListTile(
              leading: const Icon(Icons.collections_bookmark_outlined),
              title: Text(
                profile.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              subtitle: Text(
                profile.id == activeLibraryId
                    ? '$activeScoreCount곡'
                    : '분리된 악보 저장소',
              ),
              trailing: Wrap(
                spacing: 0,
                children: [
                  if (profile.id == activeLibraryId) const Icon(Icons.check),
                  IconButton(
                    tooltip: '이름 변경',
                    onPressed: () => Navigator.of(context).pop(
                      _LibraryProfileAction(
                        _LibraryProfileActionType.rename,
                        libraryId: profile.id,
                        label: profile.name,
                      ),
                    ),
                    icon: const Icon(Icons.edit_outlined),
                  ),
                  IconButton(
                    tooltip: '라이브러리 비우기',
                    onPressed: () => Navigator.of(context).pop(
                      _LibraryProfileAction(
                        _LibraryProfileActionType.delete,
                        libraryId: profile.id,
                        label: profile.name,
                      ),
                    ),
                    icon: const Icon(Icons.delete_outline),
                  ),
                ],
              ),
              onTap: () => Navigator.of(context).pop(
                _LibraryProfileAction(
                  _LibraryProfileActionType.select,
                  libraryId: profile.id,
                  label: profile.name,
                ),
              ),
            ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.add),
            title: const Text('새 라이브러리'),
            subtitle: const Text('분리된 악보 저장소 만들기'),
            onTap: () => Navigator.of(context).pop(
              const _LibraryProfileAction(_LibraryProfileActionType.create),
            ),
          ),
        ],
      ),
    );
  }
}

class _LibraryViewBar extends StatelessWidget {
  const _LibraryViewBar({
    required this.settings,
    required this.onSortPressed,
    required this.onFavoriteChanged,
    required this.onTagPressed,
    required this.onCollectionPressed,
    required this.onGroupPressed,
    required this.onRatingPressed,
  });

  final SheetLibraryViewSettings settings;
  final VoidCallback onSortPressed;
  final ValueChanged<bool> onFavoriteChanged;
  final VoidCallback onTagPressed;
  final VoidCallback onCollectionPressed;
  final VoidCallback onGroupPressed;
  final VoidCallback onRatingPressed;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        ActionChip(
          avatar: Icon(_librarySortIcon(settings.sortMode), size: 18),
          label: Text('정렬: ${_librarySortLabel(settings.sortMode)}'),
          onPressed: onSortPressed,
        ),
        FilterChip(
          avatar: const Icon(Icons.star_outline, size: 18),
          label: const Text('즐겨찾기'),
          selected: settings.favoriteOnly,
          onSelected: onFavoriteChanged,
        ),
        ActionChip(
          avatar: const Icon(Icons.sell_outlined, size: 18),
          label: Text(
            settings.tagQuery.isEmpty ? '태그: 전체' : '태그: ${settings.tagQuery}',
          ),
          onPressed: onTagPressed,
        ),
        ActionChip(
          avatar: const Icon(Icons.collections_bookmark_outlined, size: 18),
          label: Text(
            settings.collectionQuery.isEmpty
                ? '컬렉션: 전체'
                : '컬렉션: ${settings.collectionQuery}',
          ),
          onPressed: onCollectionPressed,
        ),
        ActionChip(
          avatar: const Icon(Icons.folder_outlined, size: 18),
          label: Text(
            settings.groupQuery.isEmpty
                ? '그룹: 전체'
                : '그룹: ${settings.groupQuery}',
          ),
          onPressed: onGroupPressed,
        ),
        ActionChip(
          avatar: const Icon(Icons.star_rate_outlined, size: 18),
          label: Text(
            settings.minimumRating == 0
                ? '별점: 전체'
                : '별점: ${settings.minimumRating}+',
          ),
          onPressed: onRatingPressed,
        ),
      ],
    );
  }
}

class _ActiveLibraryFiltersBar extends StatelessWidget {
  const _ActiveLibraryFiltersBar({
    required this.query,
    required this.settings,
    required this.onClearQuery,
    required this.onClearFavorite,
    required this.onClearTag,
    required this.onClearCollection,
    required this.onClearGroup,
    required this.onClearRating,
    required this.onClearCustomField,
    required this.onClearAll,
  });

  final String query;
  final SheetLibraryViewSettings settings;
  final VoidCallback onClearQuery;
  final VoidCallback onClearFavorite;
  final VoidCallback onClearTag;
  final VoidCallback onClearCollection;
  final VoidCallback onClearGroup;
  final VoidCallback onClearRating;
  final ValueChanged<String> onClearCustomField;
  final VoidCallback onClearAll;

  @override
  Widget build(BuildContext context) {
    final chips = <Widget>[];
    final normalizedQuery = query.trim();
    if (normalizedQuery.isNotEmpty) {
      chips.add(
        _ActiveLibraryFilterChip(
          icon: Icons.search,
          label: '검색: $normalizedQuery',
          onDeleted: onClearQuery,
        ),
      );
    }
    if (settings.favoriteOnly) {
      chips.add(
        _ActiveLibraryFilterChip(
          icon: Icons.star,
          label: '즐겨찾기',
          onDeleted: onClearFavorite,
        ),
      );
    }
    if (settings.hasTagFilter) {
      chips.add(
        _ActiveLibraryFilterChip(
          icon: Icons.sell_outlined,
          label: '태그: ${settings.tagQuery}',
          onDeleted: onClearTag,
        ),
      );
    }
    if (settings.hasCollectionFilter) {
      chips.add(
        _ActiveLibraryFilterChip(
          icon: Icons.collections_bookmark_outlined,
          label: '컬렉션: ${settings.collectionQuery}',
          onDeleted: onClearCollection,
        ),
      );
    }
    if (settings.hasGroupFilter) {
      chips.add(
        _ActiveLibraryFilterChip(
          icon: Icons.folder_outlined,
          label: '그룹: ${settings.groupQuery}',
          onDeleted: onClearGroup,
        ),
      );
    }
    if (settings.hasRatingFilter) {
      chips.add(
        _ActiveLibraryFilterChip(
          icon: Icons.star_rate_outlined,
          label: '별점 ${settings.minimumRating}+',
          onDeleted: onClearRating,
        ),
      );
    }
    for (final entry in settings.customFieldFilters.entries) {
      chips.add(
        _ActiveLibraryFilterChip(
          icon: _customMetadataFacetIcon(entry.key),
          label: '${entry.key}: ${entry.value}',
          onDeleted: () => onClearCustomField(entry.key),
        ),
      );
    }

    if (chips.isEmpty) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: SizedBox(
        height: 42,
        child: Row(
          children: [
            Semantics(
              label: '적용 중인 검색 및 필터',
              child: Text(
                '현재 조건',
                style: Theme.of(context).textTheme.labelLarge
                    ?.copyWith(fontWeight: FontWeight.w900),
              ),
            ),
            const SizedBox(width: 8),
            TextButton.icon(
              onPressed: onClearAll,
              icon: const Icon(Icons.filter_alt_off_outlined, size: 18),
              label: const Text('전체 초기화'),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    for (final chip in chips) ...[
                      chip,
                      const SizedBox(width: 8),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActiveLibraryFilterChip extends StatelessWidget {
  const _ActiveLibraryFilterChip({
    required this.icon,
    required this.label,
    required this.onDeleted,
  });

  final IconData icon;
  final String label;
  final VoidCallback onDeleted;

  @override
  Widget build(BuildContext context) {
    return InputChip(
      avatar: Icon(icon, size: 18),
      label: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 220),
        child: Text(label, overflow: TextOverflow.ellipsis),
      ),
      onDeleted: onDeleted,
      deleteIcon: const Icon(Icons.close, size: 18),
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }
}

class _LibraryFacetExplorer extends StatelessWidget {
  const _LibraryFacetExplorer({
    required this.collectionFacets,
    required this.groupFacets,
    required this.ratingFacets,
    required this.customFieldFacets,
    required this.selectedCollection,
    required this.selectedGroup,
    required this.selectedMinimumRating,
    required this.selectedCustomFieldFilters,
    required this.onCollectionSelected,
    required this.onGroupSelected,
    required this.onRatingSelected,
    required this.onCustomFieldSelected,
  });

  final List<SheetLibraryFacet> collectionFacets;
  final List<SheetLibraryFacet> groupFacets;
  final List<SheetLibraryFacet> ratingFacets;
  final Map<String, List<SheetLibraryFacet>> customFieldFacets;
  final String selectedCollection;
  final String selectedGroup;
  final int selectedMinimumRating;
  final Map<String, String> selectedCustomFieldFilters;
  final ValueChanged<String> onCollectionSelected;
  final ValueChanged<String> onGroupSelected;
  final ValueChanged<int> onRatingSelected;
  final void Function(String fieldKey, String value) onCustomFieldSelected;

  @override
  Widget build(BuildContext context) {
    final visibleCollectionFacets = collectionFacets.take(6).toList();
    final visibleGroupFacets = groupFacets.take(6).toList();
    final visibleRatingFacets = ratingFacets.take(5).toList();
    final visibleCustomFieldFacets =
        <MapEntry<String, List<SheetLibraryFacet>>>[
          for (final entry in customFieldFacets.entries)
            if (entry.value.isNotEmpty)
              MapEntry(entry.key, entry.value.take(6).toList()),
        ];
    if (visibleCollectionFacets.isEmpty &&
        visibleGroupFacets.isEmpty &&
        visibleCustomFieldFacets.isEmpty &&
        visibleRatingFacets.isEmpty) {
      return const SizedBox.shrink();
    }

    final rows = <Widget>[];
    void addRow(Widget row) {
      if (rows.isNotEmpty) {
        rows.add(const SizedBox(height: 8));
      }
      rows.add(row);
    }

    if (visibleCollectionFacets.isNotEmpty) {
      addRow(
        _LibraryFacetRow(
          label: '컬렉션',
          icon: Icons.collections_bookmark_outlined,
          facets: visibleCollectionFacets,
          selectedValue: selectedCollection,
          onSelected: (value) {
            onCollectionSelected(value == selectedCollection ? '' : value);
          },
        ),
      );
    }
    if (visibleGroupFacets.isNotEmpty) {
      addRow(
        _LibraryFacetRow(
          label: '그룹',
          icon: Icons.folder_outlined,
          facets: visibleGroupFacets,
          selectedValue: selectedGroup,
          onSelected: (value) {
            onGroupSelected(value == selectedGroup ? '' : value);
          },
        ),
      );
    }
    for (final entry in visibleCustomFieldFacets) {
      final selectedValue = selectedCustomFieldFilters[entry.key] ?? '';
      addRow(
        _LibraryFacetRow(
          label: entry.key,
          icon: _customMetadataFacetIcon(entry.key),
          facets: entry.value,
          selectedValue: selectedValue,
          onSelected: (value) {
            onCustomFieldSelected(
              entry.key,
              value == selectedValue ? '' : value,
            );
          },
        ),
      );
    }
    if (visibleRatingFacets.isNotEmpty) {
      addRow(
        _LibraryFacetRow(
          label: '별점',
          icon: Icons.star_rate_outlined,
          facets: visibleRatingFacets,
          selectedValue: selectedMinimumRating == 0
              ? ''
              : selectedMinimumRating.toString(),
          onSelected: (value) {
            final rating = int.tryParse(value) ?? 0;
            onRatingSelected(rating == selectedMinimumRating ? 0 : rating);
          },
        ),
      );
    }

    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: Colors.black.withValues(alpha: 0.08)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: rows,
        ),
      ),
    );
  }
}

IconData _customMetadataFacetIcon(String fieldKey) {
  return switch (fieldKey) {
    '조성' => Icons.music_note_outlined,
    '장르' => Icons.category_outlined,
    '난이도' => Icons.trending_up_outlined,
    '편성' => Icons.groups_outlined,
    _ => Icons.tune_outlined,
  };
}

class _LibraryFacetRow extends StatelessWidget {
  const _LibraryFacetRow({
    required this.label,
    required this.icon,
    required this.facets,
    required this.selectedValue,
    required this.onSelected,
  });

  final String label;
  final IconData icon;
  final List<SheetLibraryFacet> facets;
  final String selectedValue;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 76,
          height: 32,
          child: Row(
            children: [
              Icon(icon, size: 18),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  label,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final facet in facets)
                ChoiceChip(
                  label: Text('${facet.label} ${facet.count}'),
                  selected: facet.value == selectedValue,
                  onSelected: (_) => onSelected(facet.value),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

String _librarySortLabel(SheetLibrarySortMode sortMode) {
  return switch (sortMode) {
    SheetLibrarySortMode.recent => '최근 열기',
    SheetLibrarySortMode.title => '제목',
    SheetLibrarySortMode.composer => '작곡가',
    SheetLibrarySortMode.rating => '별점',
    SheetLibrarySortMode.imported => '가져온 날짜',
  };
}

IconData _librarySortIcon(SheetLibrarySortMode sortMode) {
  return switch (sortMode) {
    SheetLibrarySortMode.recent => Icons.history,
    SheetLibrarySortMode.title => Icons.sort_by_alpha,
    SheetLibrarySortMode.composer => Icons.person_outline,
    SheetLibrarySortMode.rating => Icons.star_rate_outlined,
    SheetLibrarySortMode.imported => Icons.file_download_outlined,
  };
}

class _NoticeBanner extends StatelessWidget {
  const _NoticeBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: const Color(0xfffff0e8),
        border: Border.all(color: const Color(0xffe7b599)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Text(
          message,
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
    );
  }
}

Future<String?> _showTextEntryDialog({
  required BuildContext context,
  required String title,
  required String label,
  required String initialValue,
}) async {
  return showDialog<String>(
    context: context,
    builder: (dialogContext) => _TextEntryDialog(
      title: title,
      label: label,
      initialValue: initialValue,
    ),
  );
}

class _TextEntryDialog extends StatefulWidget {
  const _TextEntryDialog({
    required this.title,
    required this.label,
    required this.initialValue,
  });

  final String title;
  final String label;
  final String initialValue;

  @override
  State<_TextEntryDialog> createState() => _TextEntryDialogState();
}

class _TextEntryDialogState extends State<_TextEntryDialog> {
  late final TextEditingController _textController;

  @override
  void initState() {
    super.initState();
    _textController = TextEditingController(text: widget.initialValue);
  }

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  void _close(String? value) {
    FocusManager.instance.primaryFocus?.unfocus();
    Navigator.of(context).pop(value);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.title),
      content: TextField(
        controller: _textController,
        autofocus: true,
        decoration: InputDecoration(labelText: widget.label),
        textInputAction: TextInputAction.done,
        onSubmitted: _close,
      ),
      actions: [
        TextButton(onPressed: () => _close(null), child: const Text('취소')),
        FilledButton(
          onPressed: () => _close(_textController.text),
          child: const Text('저장'),
        ),
      ],
    );
  }
}

const _linkedFileRoles = <String>[
  SheetLinkedFile.fullScoreRole,
  SheetLinkedFile.partRole,
  SheetLinkedFile.pianoReductionRole,
  SheetLinkedFile.originalRole,
  SheetLinkedFile.editedCopyRole,
  SheetLinkedFile.referenceRole,
];

String _linkedFileRoleLabel(String role) {
  return switch (role) {
    SheetLinkedFile.fullScoreRole => 'Full score',
    SheetLinkedFile.partRole => 'Part',
    SheetLinkedFile.pianoReductionRole => 'Piano reduction',
    SheetLinkedFile.originalRole => 'Original',
    SheetLinkedFile.editedCopyRole => 'Edited copy',
    SheetLinkedFile.referenceRole => 'Reference',
    _ => 'Part',
  };
}

bool _isSupportedLinkedImage(SheetLinkedFile file) {
  final extension = file.type.trim().isNotEmpty
      ? file.type.trim().toLowerCase()
      : SheetFileImportPolicy.extensionOf(file.path);
  return SheetFileImportPolicy.isSupportedImageExtension(extension);
}

bool _isSupportedLinkedAudio(SheetLinkedFile file) {
  final extension = file.type.trim().isNotEmpty
      ? file.type.trim().toLowerCase()
      : SheetFileImportPolicy.extensionOf(file.path);
  return SheetFileImportPolicy.isSupportedAudioExtension(extension);
}

String _rehearsalMarkKindLabel(String kind) {
  return switch (kind) {
    SheetRehearsalMark.segnoKind => 'Segno',
    SheetRehearsalMark.codaKind => 'Coda',
    SheetRehearsalMark.toCodaKind => 'To Coda',
    SheetRehearsalMark.dcKind => 'D.C.',
    SheetRehearsalMark.dsKind => 'D.S.',
    _ => 'Rehearsal mark',
  };
}

String _cropPresetScopeLabel(String scope) {
  return switch (scope) {
    SheetCropPreset.oddEvenScope => '홀수/짝수 페이지',
    SheetCropPreset.coverExcludedScope => '표지 제외',
    _ => '모든 페이지',
  };
}

enum _LinkedFileActionType { open, updateRole, remove }

class _LinkedFileAction {
  const _LinkedFileAction({required this.type, required this.file, this.role});

  final _LinkedFileActionType type;
  final SheetLinkedFile file;
  final String? role;
}

enum _RehearsalMarkActionType { add, jump, edit, remove }

class _RehearsalMarkAction {
  const _RehearsalMarkAction({required this.type, this.mark});

  final _RehearsalMarkActionType type;
  final SheetRehearsalMark? mark;
}

enum _CropPresetActionType { add, apply, remove }

class _CropPresetAction {
  const _CropPresetAction({required this.type, this.preset});

  final _CropPresetActionType type;
  final SheetCropPreset? preset;
}

Future<_ScoreMetadataInput?> _showScoreMetadataDialog({
  required BuildContext context,
  required SheetScore score,
  required Future<SheetLinkedFile?> Function() onAddLinkedFile,
}) async {
  final titleController = TextEditingController(text: score.title);
  final composerController = TextEditingController(text: score.composer);
  final tagsController = TextEditingController(text: score.tags.join(', '));
  final noteController = TextEditingController(text: score.note);
  final collectionController = TextEditingController(text: score.collection);
  final groupController = TextEditingController(text: score.group);
  var linkedFiles = score.linkedFiles.toList(growable: true);
  var customFields = score.customFields.toList(growable: true);
  var rating = score.rating;
  try {
    return await showDialog<_ScoreMetadataInput>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('악보 정보 편집'),
          content: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: titleController,
                    autofocus: true,
                    decoration: const InputDecoration(labelText: '제목'),
                    textInputAction: TextInputAction.next,
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: composerController,
                    decoration: const InputDecoration(labelText: '작곡가'),
                    textInputAction: TextInputAction.next,
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: tagsController,
                    decoration: const InputDecoration(labelText: '태그'),
                    textInputAction: TextInputAction.next,
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: collectionController,
                    decoration: const InputDecoration(labelText: '컬렉션'),
                    textInputAction: TextInputAction.next,
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: groupController,
                    decoration: const InputDecoration(labelText: '그룹'),
                    textInputAction: TextInputAction.next,
                  ),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<int>(
                    initialValue: rating,
                    decoration: const InputDecoration(labelText: '별점'),
                    items: const [
                      DropdownMenuItem(value: 0, child: Text('별점 없음')),
                      DropdownMenuItem(value: 1, child: Text('1점')),
                      DropdownMenuItem(value: 2, child: Text('2점')),
                      DropdownMenuItem(value: 3, child: Text('3점')),
                      DropdownMenuItem(value: 4, child: Text('4점')),
                      DropdownMenuItem(value: 5, child: Text('5점')),
                    ],
                    onChanged: (value) {
                      if (value != null) {
                        setDialogState(() {
                          rating = value;
                        });
                      }
                    },
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: noteController,
                    decoration: const InputDecoration(labelText: '메모'),
                    maxLines: 3,
                  ),
                  const SizedBox(height: 14),
                  _LinkedFilesEditor(
                    linkedFiles: linkedFiles,
                    onAdd: () async {
                      final linkedFile = await onAddLinkedFile();
                      if (linkedFile == null) {
                        return;
                      }
                      setDialogState(() {
                        linkedFiles.add(linkedFile);
                      });
                    },
                    onRename: (index) async {
                      final file = linkedFiles[index];
                      final label = await _showTextEntryDialog(
                        context: context,
                        title: '연결 파일 이름',
                        label: '표시 이름',
                        initialValue: file.label,
                      );
                      if (label == null) {
                        return;
                      }
                      final trimmedLabel = label.trim();
                      setDialogState(() {
                        linkedFiles[index] = file.copyWith(
                          label: trimmedLabel.isEmpty
                              ? file.label
                              : trimmedLabel,
                        );
                      });
                    },
                    onRoleChanged: (index, role) {
                      setDialogState(() {
                        linkedFiles[index] = linkedFiles[index].copyWith(
                          role: role,
                        );
                      });
                    },
                    onRemove: (index) {
                      setDialogState(() {
                        linkedFiles.removeAt(index);
                      });
                    },
                  ),
                  const SizedBox(height: 14),
                  _CustomFieldsEditor(
                    fields: customFields,
                    onAdd: () async {
                      final field = await _showCustomFieldDialog(
                        context: context,
                      );
                      if (field == null) {
                        return;
                      }
                      setDialogState(() {
                        customFields.add(field);
                        customFields = SheetScore.normalizeCustomFields(
                          customFields,
                        ).toList(growable: true);
                      });
                    },
                    onAddSuggested: (fieldKey) async {
                      final field = await _showCustomFieldDialog(
                        context: context,
                        initialField: SheetCustomMetadataField(
                          key: fieldKey,
                          value: '',
                        ),
                      );
                      if (field == null) {
                        return;
                      }
                      setDialogState(() {
                        customFields.add(field);
                        customFields = SheetScore.normalizeCustomFields(
                          customFields,
                        ).toList(growable: true);
                      });
                    },
                    onEdit: (index) async {
                      final field = await _showCustomFieldDialog(
                        context: context,
                        initialField: customFields[index],
                      );
                      if (field == null) {
                        return;
                      }
                      setDialogState(() {
                        customFields[index] = field;
                        customFields = SheetScore.normalizeCustomFields(
                          customFields,
                        ).toList(growable: true);
                      });
                    },
                    onRemove: (index) {
                      setDialogState(() {
                        customFields.removeAt(index);
                      });
                    },
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('취소'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(
                _ScoreMetadataInput(
                  title: titleController.text,
                  composer: composerController.text,
                  tags: tagsController.text,
                  collection: collectionController.text,
                  group: groupController.text,
                  rating: rating,
                  note: noteController.text,
                  linkedFiles: List<SheetLinkedFile>.unmodifiable(linkedFiles),
                  customFields: SheetScore.normalizeCustomFields(customFields),
                ),
              ),
              child: const Text('저장'),
            ),
          ],
        ),
      ),
    );
  } finally {
    titleController.dispose();
    composerController.dispose();
    tagsController.dispose();
    collectionController.dispose();
    groupController.dispose();
    noteController.dispose();
  }
}

Future<SheetCustomMetadataField?> _showCustomFieldDialog({
  required BuildContext context,
  SheetCustomMetadataField? initialField,
}) async {
  final keyController = TextEditingController(text: initialField?.key ?? '');
  final valueController = TextEditingController(
    text: initialField?.value ?? '',
  );
  try {
    return await showDialog<SheetCustomMetadataField>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(initialField == null ? '필드 추가' : '필드 수정'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: keyController,
              autofocus: true,
              decoration: const InputDecoration(labelText: '이름'),
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 10),
            TextField(
              controller: valueController,
              decoration: const InputDecoration(labelText: '값'),
              textInputAction: TextInputAction.done,
              onSubmitted: (_) {
                Navigator.of(context).pop(
                  SheetCustomMetadataField(
                    key: keyController.text,
                    value: valueController.text,
                  ),
                );
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('취소'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(context).pop(
                SheetCustomMetadataField(
                  key: keyController.text,
                  value: valueController.text,
                ),
              );
            },
            child: const Text('저장'),
          ),
        ],
      ),
    );
  } finally {
    keyController.dispose();
    valueController.dispose();
  }
}

class _LinkedFilesEditor extends StatelessWidget {
  const _LinkedFilesEditor({
    required this.linkedFiles,
    required this.onAdd,
    required this.onRename,
    required this.onRoleChanged,
    required this.onRemove,
  });

  final List<SheetLinkedFile> linkedFiles;
  final Future<void> Function() onAdd;
  final ValueChanged<int> onRename;
  final void Function(int index, String role) onRoleChanged;
  final ValueChanged<int> onRemove;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Align(
      alignment: Alignment.centerLeft,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            '연결 파일',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 6),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: onAdd,
              icon: const Icon(Icons.attach_file),
              label: const Text('파일 추가'),
            ),
          ),
          if (linkedFiles.isEmpty)
            Text('연결된 파트보/참고 파일 없음', style: theme.textTheme.bodySmall)
          else
            for (var index = 0; index < linkedFiles.length; index += 1)
              ListTile(
                dense: true,
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.attach_file),
                title: Text(
                  linkedFiles[index].label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                subtitle: Text(
                  '${_linkedFileRoleLabel(linkedFiles[index].role)} · '
                  '${linkedFiles[index].type} · ${linkedFiles[index].path}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                trailing: Wrap(
                  spacing: 0,
                  children: [
                    IconButton(
                      tooltip: '이름 수정',
                      onPressed: () => onRename(index),
                      icon: const Icon(Icons.edit_outlined),
                    ),
                    PopupMenuButton<String>(
                      tooltip: '역할 변경',
                      icon: const Icon(Icons.badge_outlined),
                      onSelected: (role) => onRoleChanged(index, role),
                      itemBuilder: (context) => [
                        for (final role in _linkedFileRoles)
                          PopupMenuItem<String>(
                            value: role,
                            child: Text(_linkedFileRoleLabel(role)),
                          ),
                      ],
                    ),
                    IconButton(
                      tooltip: '연결 제거',
                      onPressed: () => onRemove(index),
                      icon: const Icon(Icons.link_off_outlined),
                    ),
                  ],
                ),
              ),
        ],
      ),
    );
  }
}

class _CustomFieldsEditor extends StatelessWidget {
  const _CustomFieldsEditor({
    required this.fields,
    required this.onAdd,
    required this.onAddSuggested,
    required this.onEdit,
    required this.onRemove,
  });

  final List<SheetCustomMetadataField> fields;
  final Future<void> Function() onAdd;
  final Future<void> Function(String fieldKey) onAddSuggested;
  final ValueChanged<int> onEdit;
  final ValueChanged<int> onRemove;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final existingKeys = fields
        .map((field) => field.key.trim().toLowerCase())
        .where((key) => key.isNotEmpty)
        .toSet();
    final suggestions = _commonCustomMetadataFieldKeys
        .where((key) => !existingKeys.contains(key.toLowerCase()))
        .toList(growable: false);
    return Align(
      alignment: Alignment.centerLeft,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            '사용자 필드',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 6),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: onAdd,
              icon: const Icon(Icons.add),
              label: const Text('필드 추가'),
            ),
          ),
          if (suggestions.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text('자주 쓰는 필드', style: theme.textTheme.bodySmall),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final key in suggestions)
                  ActionChip(
                    avatar: const Icon(Icons.add, size: 16),
                    label: Text(key),
                    onPressed: () => onAddSuggested(key),
                  ),
              ],
            ),
            const SizedBox(height: 8),
          ],
          if (fields.isEmpty)
            Text('추가 정보 없음', style: theme.textTheme.bodySmall)
          else
            for (var index = 0; index < fields.length; index += 1)
              ListTile(
                dense: true,
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.notes_outlined),
                title: Text(
                  fields[index].key,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                subtitle: Text(
                  fields[index].value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                trailing: Wrap(
                  spacing: 0,
                  children: [
                    IconButton(
                      tooltip: '필드 수정',
                      onPressed: () => onEdit(index),
                      icon: const Icon(Icons.edit_outlined),
                    ),
                    IconButton(
                      tooltip: '필드 삭제',
                      onPressed: () => onRemove(index),
                      icon: const Icon(Icons.delete_outline),
                    ),
                  ],
                ),
              ),
        ],
      ),
    );
  }
}

const _commonCustomMetadataFieldKeys = <String>['조성', '장르', '난이도', '편성'];

class _ScoreMetadataInput {
  const _ScoreMetadataInput({
    required this.title,
    required this.composer,
    required this.tags,
    required this.collection,
    required this.group,
    required this.rating,
    required this.note,
    required this.linkedFiles,
    required this.customFields,
  });

  final String title;
  final String composer;
  final String tags;
  final String collection;
  final String group;
  final int rating;
  final String note;
  final List<SheetLinkedFile> linkedFiles;
  final List<SheetCustomMetadataField> customFields;
}

SnackBar _buildImportedScoreNudgeSnackBar({
  required String title,
  required VoidCallback onEdit,
}) {
  final normalizedTitle = title.trim().isEmpty ? '악보' : title.trim();
  return SnackBar(
    content: Text('"$normalizedTitle" 악보를 추가했습니다.'),
    action: SnackBarAction(label: '정보 편집', onPressed: onEdit),
  );
}

@visibleForTesting
SnackBar buildImportedScoreNudgeSnackBarForTest({
  required String title,
  VoidCallback? onEdit,
}) {
  return _buildImportedScoreNudgeSnackBar(
    title: title,
    onEdit: onEdit ?? () {},
  );
}

String _formatShortDate(DateTime value) {
  final hour = value.hour.toString().padLeft(2, '0');
  final minute = value.minute.toString().padLeft(2, '0');
  return '${value.month}/${value.day} $hour:$minute';
}

IconData _shareCandidateIcon(SheetScoreShareCandidate candidate) {
  if (candidate.isSanitizedCopy) {
    return Icons.link_off_outlined;
  }
  if (candidate.isLinkedFile) {
    final extension = SheetFileImportPolicy.extensionOf(candidate.fileName);
    if (SheetFileImportPolicy.imageExtensions.contains(extension)) {
      return Icons.image_outlined;
    }
    return Icons.attach_file;
  }
  return Icons.picture_as_pdf_outlined;
}

class _EmptyLibrary extends StatelessWidget {
  const _EmptyLibrary({
    required this.hasQuery,
    required this.hasFilter,
    required this.onImportPressed,
    required this.onClearPressed,
    required this.onTesterInfoPressed,
  });

  final bool hasQuery;
  final bool hasFilter;
  final VoidCallback onImportPressed;
  final VoidCallback onClearPressed;
  final VoidCallback onTesterInfoPressed;

  @override
  Widget build(BuildContext context) {
    final isFilteredEmpty = hasQuery || hasFilter;
    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: ConstrainedBox(
          constraints: BoxConstraints(
            minHeight: constraints.hasBoundedHeight ? constraints.maxHeight : 0,
          ),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 360),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    hasQuery ? Icons.search_off : Icons.library_music_outlined,
                    size: 58,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  const SizedBox(height: 18),
                  Text(
                    isFilteredEmpty
                        ? '조건에 맞는 악보가 없습니다.'
                        : '악보를 추가해 테스트를 시작하세요.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.titleMedium
                        ?.copyWith(fontWeight: FontWeight.w900),
                  ),
                  if (isFilteredEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      '검색어와 필터를 초기화하면 전체 라이브러리로 돌아갑니다.',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 18),
                    OutlinedButton.icon(
                      onPressed: onClearPressed,
                      icon: const Icon(Icons.filter_alt_off_outlined),
                      label: const Text('검색/필터 초기화'),
                    ),
                  ] else ...[
                    const SizedBox(height: 8),
                    Text(
                      'PDF 또는 JPG/PNG 이미지를 가져와 Clef & Staff 라이브러리에 등록할 수 있습니다.',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 18),
                    Wrap(
                      alignment: WrapAlignment.center,
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        FilledButton.icon(
                          onPressed: onImportPressed,
                          icon: const Icon(Icons.add_to_photos_outlined),
                          label: const Text('악보 추가'),
                        ),
                        OutlinedButton.icon(
                          onPressed: onTesterInfoPressed,
                          icon: const Icon(Icons.fact_check_outlined),
                          label: const Text('테스트 항목'),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _TesterInfoSheet extends StatelessWidget {
  const _TesterInfoSheet({required this.appVersion, required this.controller});

  final String appVersion;
  final SheetLibraryController controller;

  static const List<String> _testItems = <String>[
    'PDF 가져오기와 페이지 넘김',
    'PDF 본문 검색과 OCR 미지원 안내',
    'URL 링크 제거 사본',
    '필기/텍스트 주석',
    '필기 포함 PDF 공유',
    '페이지 적용 사본과 원본 보존',
    '튜너와 Bb Trumpet 표시',
    '메트로놈',
    '기준음/드론과 로컬 오디오',
    '자동 스크롤',
    '세트리스트',
    '페달/키보드 입력 진단',
    '백업/복원',
  ];

  String feedbackTemplate() {
    return SheetRcFeedbackTemplate.build(
      appVersion: appVersion,
      debugSummary: _debugSummary(),
    );
  }

  String _debugSummary() {
    final scores = controller.scores;
    final setlists = controller.setlists;
    final favoriteCount = scores.where((score) => score.isFavorite).length;
    final pinnedCount = scores.where((score) => score.isPinned).length;
    final externalAnnotationCount = scores
        .where((score) => score.annotationStorage.isExternal)
        .length;
    final customPedalCount = scores
        .where(
          (score) =>
              score.viewerSettings.pedalMapping ==
              SheetViewerSettings.customPedalMappingType,
        )
        .length;
    final pageMetadataCount = scores.where(_scoreHasPageMetadata).length;
    var strokeCount = 0;
    var textCount = 0;
    var redoCount = 0;
    var pointCount = 0;
    var estimatedBytes = 0;
    for (final score in scores) {
      final summary = score.annotationLayer.summary(
        storageMode: score.annotationStorage.mode,
        lastSaveStatus: score.annotationStorage.lastSaveStatus,
        lastSaveError: score.annotationStorage.lastSaveError,
      );
      strokeCount += summary.strokeCount;
      textCount += summary.textCount;
      redoCount += summary.redoCount;
      pointCount += summary.pointCount;
      estimatedBytes += summary.estimatedJsonBytes;
    }

    return '''
scores=${scores.length}, setlists=${setlists.length}
favorites=$favoriteCount, pinned=$pinnedCount
annotations=strokes:$strokeCount texts:$textCount redo:$redoCount points:$pointCount bytes:${_formatBytes(estimatedBytes)}
externalAnnotationScores=$externalAnnotationCount
customPedalScores=$customPedalCount
pageMetadataScores=$pageMetadataCount
'''
        .trim();
  }

  static bool _scoreHasPageMetadata(SheetScore score) {
    final pageSettings = score.pageSettings;
    return pageSettings.hiddenPages.isNotEmpty ||
        pageSettings.pageCrops.isNotEmpty ||
        pageSettings.crop.hasCrop ||
        pageSettings.pageOrder.isNotEmpty ||
        pageSettings.pageRotations.isNotEmpty ||
        pageSettings.jumpPoints.isNotEmpty ||
        pageSettings.rehearsalMarks.isNotEmpty;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scores = controller.scores;
    final setlists = controller.setlists;
    final favoriteCount = scores.where((score) => score.isFavorite).length;
    final pinnedCount = scores.where((score) => score.isPinned).length;
    final annotationSummary = _annotationSummaryLabel(scores);
    final externalAnnotationCount = scores
        .where((score) => score.annotationStorage.isExternal)
        .length;
    final customPedalCount = scores
        .where(
          (score) =>
              score.viewerSettings.pedalMapping ==
              SheetViewerSettings.customPedalMappingType,
        )
        .length;
    final pageMetadataCount = scores.where(_scoreHasPageMetadata).length;
    return SafeArea(
      child: ListView(
        shrinkWrap: true,
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          Row(
            children: [
              const Icon(Icons.info_outline),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Clef & Staff 테스트 정보',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _InfoRow(label: '앱', value: 'Clef & Staff'),
          _InfoRow(label: '버전', value: appVersion),
          const _InfoRow(label: '빌드', value: '내부 테스트 빌드'),
          _InfoRow(label: '악보', value: '${scores.length}개'),
          _InfoRow(label: '세트리스트', value: '${setlists.length}개'),
          _InfoRow(label: '즐겨찾기/고정', value: '$favoriteCount/$pinnedCount'),
          _InfoRow(label: '필기 요약', value: annotationSummary),
          _InfoRow(label: '외부 필기 저장소', value: '$externalAnnotationCount개 악보'),
          _InfoRow(label: '사용자 페달', value: '$customPedalCount개 악보'),
          _InfoRow(label: '페이지 설정', value: '$pageMetadataCount개 악보'),
          const SizedBox(height: 18),
          Text(
            '확인할 항목',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 8),
          for (final item in _testItems)
            ListTile(
              dense: true,
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.check_circle_outline),
              title: Text(item),
            ),
          const SizedBox(height: 8),
          Text(
            '피드백에는 기기명, OS 버전, 설치 방식, PDF 유형/페이지 수/파일 크기, '
            '재현 단계, 스크린샷 또는 화면녹화, 샘플 파일 공유 가능 여부를 같이 적어주세요.',
            style: theme.textTheme.bodySmall,
          ),
          const SizedBox(height: 14),
          FilledButton.icon(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: feedbackTemplate()));
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('피드백 템플릿을 복사했습니다.')),
                );
              }
            },
            icon: const Icon(Icons.content_copy),
            label: const Text('피드백 템플릿 복사'),
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: _debugSummary()));
              if (context.mounted) {
                ScaffoldMessenger.of(
                  context,
                ).showSnackBar(const SnackBar(content: Text('진단 요약을 복사했습니다.')));
              }
            },
            icon: const Icon(Icons.bug_report_outlined),
            label: const Text('진단 요약 복사'),
          ),
        ],
      ),
    );
  }

  static String _annotationSummaryLabel(List<SheetScore> scores) {
    var strokeCount = 0;
    var textCount = 0;
    var pointCount = 0;
    var estimatedBytes = 0;
    for (final score in scores) {
      final summary = score.annotationLayer.summary(
        storageMode: score.annotationStorage.mode,
        lastSaveStatus: score.annotationStorage.lastSaveStatus,
        lastSaveError: score.annotationStorage.lastSaveError,
      );
      strokeCount += summary.strokeCount;
      textCount += summary.textCount;
      pointCount += summary.pointCount;
      estimatedBytes += summary.estimatedJsonBytes;
    }
    return '필기 $strokeCount · 텍스트 $textCount · '
        '포인트 $pointCount · ${_formatBytes(estimatedBytes)}';
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          SizedBox(
            width: 116,
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}

class _InputDiagnosticSheet extends StatelessWidget {
  const _InputDiagnosticSheet({
    required this.entries,
    required this.viewerSummary,
  });

  final List<SheetViewerInputDiagnosticEntry> entries;
  final String viewerSummary;

  String get _copyText {
    final log = entries.isEmpty
        ? 'no input events'
        : entries.map((entry) => entry.logLine).join('\n');
    return '''
Clef input diagnostic

$viewerSummary

Recent input:
$log
'''
        .trim();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SafeArea(
      child: ListView(
        shrinkWrap: true,
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          Row(
            children: [
              const Icon(Icons.keyboard_alt_outlined),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  '입력 진단',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Bluetooth 페달이나 키보드를 누른 뒤 앱이 인식한 key와 action을 확인합니다.',
            style: theme.textTheme.bodySmall,
          ),
          const SizedBox(height: 12),
          _InfoRow(label: '최근 입력', value: '${entries.length}개'),
          _InfoRow(label: 'Viewer', value: viewerSummary.split('\n').first),
          const SizedBox(height: 12),
          if (entries.isEmpty)
            const ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(Icons.info_outline),
              title: Text('아직 기록된 입력이 없습니다.'),
              subtitle: Text('이 화면을 닫고 viewer에서 페달이나 키보드를 눌러보세요.'),
            )
          else
            for (final entry in entries)
              ListTile(
                dense: true,
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.keyboard_command_key),
                title: Text(
                  '${entry.inputId} → ${_viewerInputActionLabel(entry.action)}',
                ),
                subtitle: Text(
                  'logical ${entry.logicalKeyLabel} (${entry.logicalKeyId}) · '
                  'physical ${entry.physicalKeyId}',
                ),
              ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: _copyText));
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('입력 진단 로그를 복사했습니다.')),
                );
              }
            },
            icon: const Icon(Icons.content_copy),
            label: const Text('진단 로그 복사'),
          ),
          if (entries.isNotEmpty) ...[
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: () => Navigator.of(context).pop(true),
              icon: const Icon(Icons.tune),
              label: const Text('직접 설정에 사용'),
            ),
          ],
        ],
      ),
    );
  }
}

class _QuickAccessBand extends StatelessWidget {
  const _QuickAccessBand({
    required this.pinnedScores,
    required this.favoriteScores,
    required this.recentScores,
    required this.metadataReviewScores,
    required this.onOpen,
    required this.onEdit,
    required this.isSelecting,
    required this.selectedIds,
    required this.onSelectionChanged,
  });

  final List<SheetScore> pinnedScores;
  final List<SheetScore> favoriteScores;
  final List<SheetScore> recentScores;
  final List<SheetScore> metadataReviewScores;
  final ValueChanged<SheetScore> onOpen;
  final ValueChanged<SheetScore> onEdit;
  final bool isSelecting;
  final Set<String> selectedIds;
  final ValueChanged<SheetScore> onSelectionChanged;

  @override
  Widget build(BuildContext context) {
    final groups = <_QuickAccessGroup>[
      if (!isSelecting)
        _QuickAccessGroup(
          label: '정리 필요',
          icon: Icons.edit_note,
          scores: metadataReviewScores,
          opensForEdit: true,
        ),
      _QuickAccessGroup(
        label: '고정',
        icon: Icons.push_pin,
        scores: pinnedScores,
      ),
      _QuickAccessGroup(
        label: '즐겨찾기',
        icon: Icons.star,
        scores: favoriteScores,
      ),
      _QuickAccessGroup(label: '최근', icon: Icons.history, scores: recentScores),
    ].where((group) => group.scores.isNotEmpty).toList(growable: false);
    if (groups.isEmpty) {
      return const SizedBox.shrink();
    }

    final theme = Theme.of(context);
    return SizedBox(
      height: 208,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemBuilder: (context, groupIndex) {
          final group = groups[groupIndex];
          return SizedBox(
            width: 350,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: theme.colorScheme.outlineVariant.withValues(
                    alpha: 0.7,
                  ),
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(group.icon, size: 18),
                        const SizedBox(width: 6),
                        Text(
                          group.label,
                          style: theme.textTheme.labelLarge?.copyWith(
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Expanded(
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemBuilder: (context, scoreIndex) {
                          final score = group.scores[scoreIndex];
                          return _QuickAccessScoreChip(
                            score: score,
                            onOpen: group.opensForEdit ? onEdit : onOpen,
                            isSelecting: isSelecting,
                            isSelected: selectedIds.contains(score.id),
                            onSelectionChanged: onSelectionChanged,
                          );
                        },
                        separatorBuilder: (context, index) =>
                            const SizedBox(width: 8),
                        itemCount: group.scores.length,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
        separatorBuilder: (context, index) => const SizedBox(width: 10),
        itemCount: groups.length,
      ),
    );
  }
}

class _QuickAccessGroup {
  const _QuickAccessGroup({
    required this.label,
    required this.icon,
    required this.scores,
    this.opensForEdit = false,
  });

  final String label;
  final IconData icon;
  final List<SheetScore> scores;
  final bool opensForEdit;
}

String _scoreIdentitySubtitle(SheetScore score) {
  final sourceName = score.sourceFileDisplayName.trim();
  final parts = <String>[
    if (score.composer.trim().isNotEmpty) score.composer.trim(),
    if (sourceName.isNotEmpty && sourceName != score.title.trim())
      '파일 · $sourceName',
  ];
  if (parts.isEmpty && sourceName.isNotEmpty) {
    return '파일 · $sourceName';
  }
  return parts.isEmpty ? '파일 정보 없음' : parts.join(' · ');
}

String _setlistScoreSubtitle(SheetSetlist setlist, SheetScore score) {
  final identity = _scoreIdentitySubtitle(score);
  if (setlist.rehearsalMode) {
    final note = setlist.scoreNotes[score.id]?.trim();
    return '${setlist.scoreStartPages[score.id] ?? score.lastPage}쪽부터 · '
        '${_formatDuration(setlist.scoreDurations[score.id] ?? 0)} · '
        '${note?.isNotEmpty == true ? note : '메모 없음'} · $identity';
  }
  return '${score.lastPage}쪽부터 열기 · $identity';
}

SheetScore _scoreToOpenForSetlistResume(
  SheetSetlist setlist,
  List<SheetScore> scores,
) {
  return scores.firstWhere(
    (score) => score.id == setlist.lastOpenedScoreId,
    orElse: () => scores.first,
  );
}

@visibleForTesting
SheetScore scoreToOpenForSetlistResumeForTest(
  SheetSetlist setlist,
  List<SheetScore> scores,
) {
  return _scoreToOpenForSetlistResume(setlist, scores);
}

String _setlistProgressLabel(SheetSetlist setlist) {
  final total = setlist.scoreIds.length;
  if (total == 0) {
    return '빈 목록';
  }
  final scoreId = setlist.lastOpenedScoreId;
  final currentIndex = scoreId == null ? -1 : setlist.scoreIds.indexOf(scoreId);
  if (currentIndex < 0) {
    return '$total곡';
  }
  return '진행 ${currentIndex + 1}/$total';
}

@visibleForTesting
String setlistProgressLabelForTest(SheetSetlist setlist) {
  return _setlistProgressLabel(setlist);
}

class _QuickAccessScoreChip extends StatelessWidget {
  const _QuickAccessScoreChip({
    required this.score,
    required this.onOpen,
    required this.isSelecting,
    required this.isSelected,
    required this.onSelectionChanged,
  });

  final SheetScore score;
  final ValueChanged<SheetScore> onOpen;
  final bool isSelecting;
  final bool isSelected;
  final ValueChanged<SheetScore> onSelectionChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final subtitle = _scoreIdentitySubtitle(score);
    final openedLabel = score.lastOpenedAt == null
        ? '마지막 ${score.lastPage}쪽'
        : '${_formatShortDate(score.lastOpenedAt!)} · ${score.lastPage}쪽';
    return SizedBox(
      width: 176,
      height: 144,
      child: Material(
        color: isSelected
            ? theme.colorScheme.primaryContainer.withValues(alpha: 0.6)
            : theme.colorScheme.surfaceContainerHighest,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: BorderSide(
            color: isSelected ? theme.colorScheme.primary : Colors.transparent,
            width: isSelected ? 2 : 0,
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => isSelecting ? onSelectionChanged(score) : onOpen(score),
          onLongPress: () => onSelectionChanged(score),
          child: Stack(
            children: [
              Padding(
                padding: EdgeInsets.fromLTRB(10, 10, isSelecting ? 34 : 10, 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      score.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall,
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        if (score.isPinned)
                          const Icon(Icons.push_pin, size: 14)
                        else if (score.isFavorite)
                          const Icon(Icons.star, size: 14)
                        else
                          const Icon(Icons.history, size: 14),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            openedLabel,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.labelSmall,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              if (isSelecting)
                Positioned(
                  top: 8,
                  right: 8,
                  child: Icon(
                    isSelected
                        ? Icons.check_circle
                        : Icons.radio_button_unchecked,
                    color: isSelected
                        ? theme.colorScheme.primary
                        : theme.colorScheme.outline,
                    size: 24,
                    semanticLabel: isSelected ? '선택됨' : '선택 안 됨',
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RecentSetlistsBand extends StatelessWidget {
  const _RecentSetlistsBand({
    required this.setlists,
    required this.scoreById,
    required this.onOpen,
  });

  final List<SheetSetlist> setlists;
  final SheetScore? Function(String id) scoreById;
  final ValueChanged<SheetSetlist> onOpen;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: theme.colorScheme.outlineVariant.withValues(alpha: 0.7),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.queue_music, size: 18),
                const SizedBox(width: 6),
                Text(
                  '최근 세트리스트',
                  style: theme.textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            SizedBox(
              height: 132,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemBuilder: (context, index) {
                  final setlist = setlists[index];
                  final openedLabel = setlist.lastOpenedAt == null
                      ? '최근 기록 없음'
                      : '최근 ${_formatShortDate(setlist.lastOpenedAt!)}';
                  final progressLabel = _setlistProgressLabel(setlist);
                  final lastOpenedScoreId = setlist.lastOpenedScoreId;
                  final lastOpenedScore = lastOpenedScoreId == null
                      ? null
                      : scoreById(lastOpenedScoreId);
                  return SizedBox(
                    width: 188,
                    child: Material(
                      color: theme.colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(8),
                      clipBehavior: Clip.antiAlias,
                      child: InkWell(
                        onTap: () => onOpen(setlist),
                        child: Padding(
                          padding: const EdgeInsets.all(10),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.queue_music, size: 16),
                                  const SizedBox(width: 4),
                                  Expanded(
                                    child: Text(
                                      '세트리스트',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: theme.textTheme.labelSmall
                                          ?.copyWith(
                                            fontWeight: FontWeight.w900,
                                          ),
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  DecoratedBox(
                                    decoration: BoxDecoration(
                                      color: theme.colorScheme.primaryContainer
                                          .withValues(alpha: 0.72),
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 3,
                                      ),
                                      child: Text(
                                        progressLabel,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: theme.textTheme.labelSmall
                                            ?.copyWith(
                                              color: theme
                                                  .colorScheme
                                                  .onPrimaryContainer,
                                              fontWeight: FontWeight.w900,
                                            ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                setlist.title,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              const SizedBox(height: 10),
                              Text(
                                openedLabel,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: theme.textTheme.labelSmall,
                              ),
                              if (lastOpenedScore != null) ...[
                                const SizedBox(height: 4),
                                Text(
                                  '이어보기 · ${lastOpenedScore.title}',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: theme.textTheme.labelSmall?.copyWith(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                },
                separatorBuilder: (context, index) => const SizedBox(width: 8),
                itemCount: setlists.length,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BulkEditInput {
  const _BulkEditInput({
    required this.addTags,
    required this.removeTags,
    this.collection,
    this.group,
    this.rating,
    this.isFavorite,
    this.isPinned,
  });

  final List<String> addTags;
  final List<String> removeTags;
  final String? collection;
  final String? group;
  final int? rating;
  final bool? isFavorite;
  final bool? isPinned;
}

class _BulkEditSheet extends StatefulWidget {
  const _BulkEditSheet();

  @override
  State<_BulkEditSheet> createState() => _BulkEditSheetState();
}

class _BulkEditSheetState extends State<_BulkEditSheet> {
  final _addTagsController = TextEditingController();
  final _removeTagsController = TextEditingController();
  final _collectionController = TextEditingController();
  final _groupController = TextEditingController();
  int? _rating;
  bool? _favorite;
  bool? _pinned;

  @override
  void dispose() {
    _addTagsController.dispose();
    _removeTagsController.dispose();
    _collectionController.dispose();
    _groupController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          bottom: MediaQuery.viewInsetsOf(context).bottom + 24,
        ),
        child: ListView(
          shrinkWrap: true,
          children: [
            Text(
              '일괄 편집',
              style: Theme.of(context).textTheme.titleLarge
                  ?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _addTagsController,
              decoration: const InputDecoration(
                labelText: '추가할 태그',
                hintText: 'comma, separated',
              ),
            ),
            TextField(
              controller: _removeTagsController,
              decoration: const InputDecoration(labelText: '제거할 태그'),
            ),
            TextField(
              controller: _collectionController,
              decoration: const InputDecoration(labelText: '컬렉션 변경'),
            ),
            TextField(
              controller: _groupController,
              decoration: const InputDecoration(labelText: '그룹 변경'),
            ),
            const SizedBox(height: 10),
            DropdownButtonFormField<int?>(
              initialValue: _rating,
              decoration: const InputDecoration(labelText: '별점 변경'),
              items: const [
                DropdownMenuItem<int?>(value: null, child: Text('변경 없음')),
                DropdownMenuItem<int?>(value: 0, child: Text('0점')),
                DropdownMenuItem<int?>(value: 1, child: Text('1점')),
                DropdownMenuItem<int?>(value: 2, child: Text('2점')),
                DropdownMenuItem<int?>(value: 3, child: Text('3점')),
                DropdownMenuItem<int?>(value: 4, child: Text('4점')),
                DropdownMenuItem<int?>(value: 5, child: Text('5점')),
              ],
              onChanged: (value) => setState(() => _rating = value),
            ),
            const SizedBox(height: 10),
            _NullableBoolControl(
              label: '즐겨찾기',
              value: _favorite,
              onChanged: (value) => setState(() => _favorite = value),
            ),
            _NullableBoolControl(
              label: '고정',
              value: _pinned,
              onChanged: (value) => setState(() => _pinned = value),
            ),
            const SizedBox(height: 16),
            Align(
              alignment: Alignment.centerRight,
              child: FilledButton.icon(
                onPressed: () {
                  Navigator.of(context).pop(
                    _BulkEditInput(
                      addTags: _splitTags(_addTagsController.text),
                      removeTags: _splitTags(_removeTagsController.text),
                      collection: _blankToNull(_collectionController.text),
                      group: _blankToNull(_groupController.text),
                      rating: _rating,
                      isFavorite: _favorite,
                      isPinned: _pinned,
                    ),
                  );
                },
                icon: const Icon(Icons.check),
                label: const Text('적용'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static List<String> _splitTags(String value) {
    return value
        .split(',')
        .map((tag) => tag.trim())
        .where((tag) => tag.isNotEmpty)
        .toList(growable: false);
  }

  static String? _blankToNull(String value) {
    final trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }
}

class _NullableBoolControl extends StatelessWidget {
  const _NullableBoolControl({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final bool? value;
  final ValueChanged<bool?> onChanged;

  @override
  Widget build(BuildContext context) {
    final selected = value == null
        ? _NullableBoolChoice.unchanged
        : value!
        ? _NullableBoolChoice.enabled
        : _NullableBoolChoice.disabled;
    return SegmentedButton<_NullableBoolChoice>(
      segments: [
        ButtonSegment<_NullableBoolChoice>(
          value: _NullableBoolChoice.unchanged,
          label: Text('$label 변경 없음'),
        ),
        const ButtonSegment<_NullableBoolChoice>(
          value: _NullableBoolChoice.enabled,
          label: Text('켜기'),
        ),
        const ButtonSegment<_NullableBoolChoice>(
          value: _NullableBoolChoice.disabled,
          label: Text('끄기'),
        ),
      ],
      selected: <_NullableBoolChoice>{selected},
      onSelectionChanged: (selection) {
        switch (selection.single) {
          case _NullableBoolChoice.unchanged:
            onChanged(null);
          case _NullableBoolChoice.enabled:
            onChanged(true);
          case _NullableBoolChoice.disabled:
            onChanged(false);
        }
      },
    );
  }
}

enum _NullableBoolChoice { unchanged, enabled, disabled }

class _BulkSetlistTargetAction {
  const _BulkSetlistTargetAction.existing(this.setlist) : createNew = false;

  const _BulkSetlistTargetAction.create() : createNew = true, setlist = null;

  final bool createNew;
  final SheetSetlist? setlist;
}

class _BulkSetlistTargetSheet extends StatelessWidget {
  const _BulkSetlistTargetSheet({
    required this.setlists,
    required this.scoreCount,
  });

  final List<SheetSetlist> setlists;
  final int scoreCount;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SafeArea(
      child: ListView(
        shrinkWrap: true,
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          Row(
            children: [
              const Icon(Icons.playlist_add_check),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  '$scoreCount개 악보를 세트리스트에 추가',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.add),
            title: const Text('새 세트리스트 만들기'),
            subtitle: const Text('이름을 정한 뒤 선택한 악보를 바로 추가합니다.'),
            onTap: () =>
                Navigator.of(context)
                    .pop(const _BulkSetlistTargetAction.create()),
          ),
          const Divider(),
          if (setlists.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 20),
              child: Text('아직 세트리스트가 없습니다. 새 세트리스트를 만들어 추가하세요.'),
            )
          else
            for (final setlist in setlists)
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.queue_music),
                title: Text(
                  setlist.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                subtitle: Text('${setlist.scoreIds.length}곡'),
                onTap: () =>
                    Navigator.of(context)
                        .pop(_BulkSetlistTargetAction.existing(setlist)),
              ),
        ],
      ),
    );
  }
}

class _BulkCollectionTargetAction {
  const _BulkCollectionTargetAction.existing(this.collectionName);

  const _BulkCollectionTargetAction.create() : collectionName = null;

  final String? collectionName;
}

class _BulkCollectionTargetSheet extends StatelessWidget {
  const _BulkCollectionTargetSheet({
    required this.collections,
    required this.scoreCount,
  });

  final List<String> collections;
  final int scoreCount;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SafeArea(
      child: ListView(
        shrinkWrap: true,
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          Row(
            children: [
              const Icon(Icons.collections_bookmark_outlined),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  '$scoreCount개 악보 컬렉션 지정',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.add),
            title: const Text('새 컬렉션 이름 입력'),
            subtitle: const Text('선택한 악보를 새 컬렉션으로 바로 묶습니다.'),
            onTap: () =>
                Navigator.of(context)
                    .pop(const _BulkCollectionTargetAction.create()),
          ),
          const Divider(),
          if (collections.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 20),
              child: Text('아직 컬렉션이 없습니다. 새 컬렉션 이름을 입력해 묶어보세요.'),
            )
          else
            for (final collection in collections)
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.collections_bookmark_outlined),
                title: Text(
                  collection,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                onTap: () =>
                    Navigator.of(context)
                        .pop(_BulkCollectionTargetAction.existing(collection)),
              ),
        ],
      ),
    );
  }
}

class _ScoreGrid extends StatelessWidget {
  const _ScoreGrid({
    required this.scores,
    required this.isWide,
    required this.onOpen,
    required this.onFavorite,
    required this.onPin,
    required this.isSelecting,
    required this.selectedIds,
    required this.onSelectionChanged,
    required this.onEdit,
    required this.onShare,
  });

  final List<SheetScore> scores;
  final bool isWide;
  final ValueChanged<SheetScore> onOpen;
  final ValueChanged<SheetScore> onFavorite;
  final ValueChanged<SheetScore> onPin;
  final bool isSelecting;
  final Set<String> selectedIds;
  final ValueChanged<SheetScore> onSelectionChanged;
  final ValueChanged<SheetScore> onEdit;
  final ValueChanged<SheetScore> onShare;

  @override
  Widget build(BuildContext context) {
    if (!isWide) {
      return ListView.separated(
        itemBuilder: (context, index) => SizedBox(
          height: 212,
          child: _ScoreTile(
            score: scores[index],
            onOpen: onOpen,
            onFavorite: onFavorite,
            onPin: onPin,
            isSelecting: isSelecting,
            isSelected: selectedIds.contains(scores[index].id),
            onSelectionChanged: onSelectionChanged,
            onEdit: onEdit,
            onShare: onShare,
          ),
        ),
        separatorBuilder: (context, index) => const SizedBox(height: 10),
        itemCount: scores.length,
      );
    }

    return GridView.builder(
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 340,
        mainAxisExtent: 212,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemBuilder: (context, index) => _ScoreTile(
        score: scores[index],
        onOpen: onOpen,
        onFavorite: onFavorite,
        onPin: onPin,
        isSelecting: isSelecting,
        isSelected: selectedIds.contains(scores[index].id),
        onSelectionChanged: onSelectionChanged,
        onEdit: onEdit,
        onShare: onShare,
      ),
      itemCount: scores.length,
    );
  }
}

class _ScoreTile extends StatelessWidget {
  const _ScoreTile({
    required this.score,
    required this.onOpen,
    required this.onFavorite,
    required this.onPin,
    required this.isSelecting,
    required this.isSelected,
    required this.onSelectionChanged,
    required this.onEdit,
    required this.onShare,
  });

  final SheetScore score;
  final ValueChanged<SheetScore> onOpen;
  final ValueChanged<SheetScore> onFavorite;
  final ValueChanged<SheetScore> onPin;
  final bool isSelecting;
  final bool isSelected;
  final ValueChanged<SheetScore> onSelectionChanged;
  final ValueChanged<SheetScore> onEdit;
  final ValueChanged<SheetScore> onShare;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final subtitle = _scoreIdentitySubtitle(score);
    final organization = <String>[
      if (score.collection.isNotEmpty) score.collection,
      if (score.group.isNotEmpty) score.group,
      if (score.rating > 0) '${score.rating}점',
    ].join(' · ');
    final lastOpened = score.lastOpenedAt == null
        ? '아직 열지 않음'
        : '최근 ${_formatShortDate(score.lastOpenedAt!)}';
    final footerParts = <String>[
      if (score.tags.isNotEmpty) score.tags.join(', '),
      lastOpened,
      '마지막 ${score.lastPage}쪽',
    ];

    final selectedColor = theme.colorScheme.primaryContainer.withValues(
      alpha: 0.52,
    );
    return Material(
      color: isSelected ? selectedColor : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(
          color: isSelected
              ? theme.colorScheme.primary
              : theme.colorScheme.outlineVariant.withValues(alpha: 0.55),
          width: isSelected ? 2 : 1,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => isSelecting ? onSelectionChanged(score) : onOpen(score),
        onLongPress: () => onSelectionChanged(score),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    isSelected
                        ? Icons.check_circle
                        : Icons.description_outlined,
                    color: isSelected ? theme.colorScheme.primary : null,
                  ),
                  if (isSelecting) ...[
                    Checkbox(
                      value: isSelected,
                      onChanged: (_) => onSelectionChanged(score),
                    ),
                  ],
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      score.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(subtitle, maxLines: 1, overflow: TextOverflow.ellipsis),
              if (!isSelecting) ...[
                const SizedBox(height: 4),
                Align(
                  alignment: Alignment.centerRight,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        tooltip: score.isFavorite ? '즐겨찾기 해제' : '즐겨찾기',
                        onPressed: () => onFavorite(score),
                        constraints: const BoxConstraints.tightFor(
                          width: 36,
                          height: 36,
                        ),
                        iconSize: 21,
                        icon: Icon(
                          score.isFavorite ? Icons.star : Icons.star_border,
                        ),
                      ),
                      IconButton(
                        tooltip: score.isPinned ? '고정 해제' : '고정',
                        onPressed: () => onPin(score),
                        constraints: const BoxConstraints.tightFor(
                          width: 36,
                          height: 36,
                        ),
                        iconSize: 21,
                        icon: Icon(
                          score.isPinned
                              ? Icons.push_pin
                              : Icons.push_pin_outlined,
                        ),
                      ),
                      SizedBox(
                        width: 36,
                        height: 36,
                        child: PopupMenuButton<_ScoreTileAction>(
                          tooltip: '더보기',
                          icon: const Icon(Icons.more_vert),
                          iconSize: 21,
                          padding: EdgeInsets.zero,
                          onSelected: (action) {
                            switch (action) {
                              case _ScoreTileAction.edit:
                                onEdit(score);
                              case _ScoreTileAction.share:
                                onShare(score);
                            }
                          },
                          itemBuilder: (context) => const [
                            PopupMenuItem<_ScoreTileAction>(
                              value: _ScoreTileAction.edit,
                              child: ListTile(
                                leading: Icon(Icons.edit_outlined),
                                title: Text('악보 정보 편집'),
                                contentPadding: EdgeInsets.zero,
                              ),
                            ),
                            PopupMenuItem<_ScoreTileAction>(
                              value: _ScoreTileAction.share,
                              child: ListTile(
                                leading: Icon(Icons.ios_share),
                                title: Text('PDF 공유'),
                                contentPadding: EdgeInsets.zero,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              if (organization.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  organization,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
              const SizedBox(height: 8),
              Text(
                footerParts.join(' · '),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

enum _ScoreTileAction { edit, share }

class SheetSetlistsScreen extends StatefulWidget {
  const SheetSetlistsScreen({required this.controller, super.key});

  final SheetLibraryController controller;

  @override
  State<SheetSetlistsScreen> createState() => _SheetSetlistsScreenState();
}

String _formatDuration(int seconds) {
  if (seconds <= 0) {
    return '시간 없음';
  }
  final minutes = seconds ~/ 60;
  final remainingSeconds = seconds % 60;
  if (minutes == 0) {
    return '$remainingSeconds초';
  }
  if (remainingSeconds == 0) {
    return '$minutes분';
  }
  return '$minutes분 $remainingSeconds초';
}

String _formatBytes(int bytes) {
  if (bytes < 1024) {
    return '${bytes}B';
  }
  final kilobytes = bytes / 1024;
  if (kilobytes < 1024) {
    return '${kilobytes.toStringAsFixed(kilobytes >= 10 ? 0 : 1)}KB';
  }
  final megabytes = kilobytes / 1024;
  return '${megabytes.toStringAsFixed(megabytes >= 10 ? 0 : 1)}MB';
}

String _viewerInputLabel(String inputId) {
  return switch (inputId) {
    'ArrowLeft' => '왼쪽 화살표',
    'ArrowRight' => '오른쪽 화살표',
    'ArrowUp' => '위쪽 화살표',
    'ArrowDown' => '아래쪽 화살표',
    'PageUp' => 'Page Up',
    'PageDown' => 'Page Down',
    'Enter' => 'Enter',
    'Backspace' => 'Backspace',
    'Space' => 'Space',
    'Shift+Space' => 'Shift + Space',
    'Tab' => 'Tab',
    'Shift+Tab' => 'Shift + Tab',
    'MediaPrevious' => 'Media Previous',
    'MediaNext' => 'Media Next',
    _ => inputId,
  };
}

String _viewerInputActionLabel(SheetViewerInputAction action) {
  return switch (action) {
    SheetViewerInputAction.previousPage => '이전 페이지',
    SheetViewerInputAction.nextPage => '다음 페이지',
    SheetViewerInputAction.previousSetlistScore => '세트리스트 이전 곡',
    SheetViewerInputAction.nextSetlistScore => '세트리스트 다음 곡',
    SheetViewerInputAction.toggleQuickActions => 'Quick actions 열기/닫기',
    SheetViewerInputAction.none => '동작 없음',
  };
}

class _SheetSetlistsScreenState extends State<SheetSetlistsScreen> {
  SheetLibraryController get controller => widget.controller;

  @override
  void initState() {
    super.initState();
    controller.addListener(_handleControllerChanged);
  }

  @override
  void dispose() {
    controller.removeListener(_handleControllerChanged);
    super.dispose();
  }

  void _handleControllerChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _createSetlist() async {
    final title = await _showTextEntryDialog(
      context: context,
      title: '세트리스트 만들기',
      label: '이름',
      initialValue: '새 세트리스트',
    );
    if (!mounted || title == null) {
      return;
    }

    final existing = controller.setlistByTitleOrNull(title);
    if (existing != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('"${existing.title}" 세트리스트가 이미 있습니다.'),
          action: SnackBarAction(
            label: '열기',
            onPressed: () {
              unawaited(
                Navigator.of(context).push<void>(
                  MaterialPageRoute<void>(
                    builder: (context) => SheetSetlistDetailScreen(
                      controller: controller,
                      setlistId: existing.id,
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      );
      return;
    }

    final setlist = await controller.createSetlist(title);
    if (!mounted) {
      return;
    }
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (context) => SheetSetlistDetailScreen(
          controller: controller,
          setlistId: setlist.id,
        ),
      ),
    );
  }

  Future<void> _openFirstScore(SheetSetlist setlist) async {
    final scores = controller.scoresForSetlist(setlist);
    if (scores.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('세트리스트에 악보가 없습니다.')));
      return;
    }

    final score = scores.first;
    await controller.markSetlistOpened(setlist, scoreId: score.id);
    await controller.markOpened(score);
    if (!mounted) {
      return;
    }
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (context) => SheetViewerScreen(
          controller: controller,
          scoreId: score.id,
          setlistId: setlist.id,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final setlists = controller.setlists;

    return Scaffold(
      appBar: AppBar(title: const Text('세트리스트')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _createSetlist,
        icon: const Icon(Icons.add),
        label: const Text('새 세트리스트'),
      ),
      body: SafeArea(
        child: setlists.isEmpty
            ? const Center(child: Text('세트리스트가 없습니다.'))
            : ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
                itemBuilder: (context, index) {
                  final setlist = setlists[index];
                  return ListTile(
                    tileColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    leading: const Icon(Icons.queue_music),
                    title: Text(
                      setlist.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w900),
                    ),
                    subtitle: Text(
                      '${setlist.scoreIds.length}곡 · 총 ${_formatDuration(setlist.totalEstimatedSeconds)}',
                    ),
                    trailing: Wrap(
                      spacing: 0,
                      children: [
                        IconButton(
                          tooltip: '첫 곡 열기',
                          onPressed: setlist.scoreIds.isEmpty
                              ? null
                              : () => _openFirstScore(setlist),
                          icon: const Icon(Icons.play_arrow),
                        ),
                        const IconButton(
                          tooltip: '상세',
                          onPressed: null,
                          icon: Icon(Icons.chevron_right),
                        ),
                      ],
                    ),
                    onTap: () {
                      Navigator.of(context).push<void>(
                        MaterialPageRoute<void>(
                          builder: (context) => SheetSetlistDetailScreen(
                            controller: controller,
                            setlistId: setlist.id,
                          ),
                        ),
                      );
                    },
                  );
                },
                separatorBuilder: (context, index) =>
                    const SizedBox(height: 10),
                itemCount: setlists.length,
              ),
      ),
    );
  }
}

class SheetSetlistDetailScreen extends StatefulWidget {
  const SheetSetlistDetailScreen({
    required this.controller,
    required this.setlistId,
    super.key,
  });

  final SheetLibraryController controller;
  final String setlistId;

  @override
  State<SheetSetlistDetailScreen> createState() =>
      _SheetSetlistDetailScreenState();
}

class _SheetSetlistDetailScreenState extends State<SheetSetlistDetailScreen> {
  SheetLibraryController get controller => widget.controller;

  SheetSetlist get setlist => controller.setlistById(widget.setlistId);

  @override
  void initState() {
    super.initState();
    controller.addListener(_handleControllerChanged);
  }

  @override
  void dispose() {
    controller.removeListener(_handleControllerChanged);
    super.dispose();
  }

  void _handleControllerChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _renameSetlist() async {
    final currentSetlist = setlist;
    final title = await _showTextEntryDialog(
      context: context,
      title: '세트리스트 이름 변경',
      label: '이름',
      initialValue: currentSetlist.title,
    );
    if (!mounted || title == null) {
      return;
    }
    final existing = controller.setlistByTitleOrNull(
      title,
      exceptId: currentSetlist.id,
    );
    if (existing != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('"${existing.title}" 세트리스트가 이미 있습니다.')),
      );
      return;
    }
    await controller.renameSetlist(currentSetlist, title);
  }

  Future<void> _deleteSetlist() async {
    final didConfirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('세트리스트 삭제'),
        content: Text('"${setlist.title}"을 삭제할까요?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('취소'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('삭제'),
          ),
        ],
      ),
    );
    if (!mounted || didConfirm != true) {
      return;
    }
    await controller.deleteSetlist(setlist);
    if (mounted) {
      Navigator.of(context).pop();
    }
  }

  Future<void> _duplicateSetlist() async {
    final duplicate = await controller.duplicateSetlist(setlist);
    if (!mounted) {
      return;
    }
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text('"${duplicate.title}"을 만들었습니다.')));
  }

  Future<void> _addScore() async {
    final availableScores = controller.scoresAvailableForSetlist(setlist);
    if (availableScores.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('추가할 수 있는 악보가 없습니다.')));
      return;
    }

    final currentSetlist = setlist;
    final selectedScores = await showModalBottomSheet<List<SheetScore>>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) =>
          SafeArea(child: _ScoreMultiPickerSheet(scores: availableScores)),
    );
    if (selectedScores == null || selectedScores.isEmpty) {
      return;
    }
    final result = await controller.addScoresToSetlist(
      currentSetlist,
      selectedScores,
    );
    if (!mounted) {
      return;
    }
    final skippedLabel = result.skippedDuplicateCount == 0
        ? ''
        : ' 이미 포함된 ${result.skippedDuplicateCount}개는 건너뛰었습니다.';
    final message = result.didAddAny
        ? '${result.addedCount}개 악보를 세트리스트에 추가했습니다.$skippedLabel'
        : '이미 모두 세트리스트에 포함되어 있습니다.';
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _openFirstScore() async {
    final scores = controller.scoresForSetlist(setlist);
    if (scores.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('세트리스트에 악보가 없습니다.')));
      return;
    }
    await controller.markSetlistOpened(setlist, scoreId: scores.first.id);
    await _openScore(scores.first);
  }

  Future<void> _openScore(SheetScore score) async {
    await controller.markSetlistOpened(setlist, scoreId: score.id);
    await controller.markOpened(score);
    if (!mounted) {
      return;
    }
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (context) => SheetViewerScreen(
          controller: controller,
          scoreId: score.id,
          setlistId: setlist.id,
        ),
      ),
    );
  }

  Future<void> _showRehearsalSettings() async {
    final updated = await showModalBottomSheet<SheetSetlist>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => _SetlistRehearsalSheet(
        setlist: setlist,
        scores: controller.scoresForSetlist(setlist),
      ),
    );
    if (updated == null) {
      return;
    }
    await controller.updateSetlistRehearsalSettings(
      setlist,
      rehearsalMode: updated.rehearsalMode,
      transitionSeconds: updated.transitionSeconds,
      scoreStartPages: updated.scoreStartPages,
      scoreNotes: updated.scoreNotes,
      scoreDurations: updated.scoreDurations,
      viewerSettingsOverride: updated.viewerSettingsOverride,
      clearViewerSettingsOverride: updated.viewerSettingsOverride == null,
    );
  }

  Future<void> _moveScoreToPosition(
    SheetSetlist currentSetlist,
    SheetScore score,
    int currentIndex,
    int totalCount,
  ) async {
    final targetPosition = await showDialog<int>(
      context: context,
      builder: (context) => _SetlistOrderDialog(
        scoreTitle: score.title,
        initialPosition: currentIndex + 1,
        totalCount: totalCount,
      ),
    );
    if (targetPosition == null) {
      return;
    }
    if (!mounted) {
      return;
    }
    final targetIndex = targetPosition - 1;
    if (targetIndex == currentIndex) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('현재 순서와 같습니다.')));
      return;
    }
    await controller.moveScoreInSetlist(
      currentSetlist,
      currentIndex,
      targetIndex,
    );
  }

  Future<void> _removeScoreFromSetlist(
    SheetSetlist currentSetlist,
    SheetScore score,
    int index,
  ) async {
    await controller.removeScoreFromSetlist(currentSetlist, score);
    if (!mounted) {
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('"${score.title}"을 세트리스트에서 제거했습니다.'),
        action: SnackBarAction(
          label: '되돌리기',
          onPressed: () {
            unawaited(
              controller.insertScoreInSetlist(currentSetlist, score, index),
            );
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final currentSetlist = setlist;
    final scores = controller.scoresForSetlist(currentSetlist);

    return Scaffold(
      appBar: AppBar(
        title: Text(currentSetlist.title, overflow: TextOverflow.ellipsis),
        actions: [
          IconButton(
            tooltip: '첫 곡 열기',
            onPressed: scores.isEmpty ? null : _openFirstScore,
            icon: const Icon(Icons.play_arrow),
          ),
          IconButton(
            tooltip: '리허설 모드',
            onPressed: scores.isEmpty ? null : _showRehearsalSettings,
            icon: Icon(
              currentSetlist.rehearsalMode
                  ? Icons.fact_check
                  : Icons.fact_check_outlined,
            ),
          ),
          IconButton(
            tooltip: '세트리스트 복제',
            onPressed: _duplicateSetlist,
            icon: const Icon(Icons.content_copy),
          ),
          IconButton(
            tooltip: '이름 변경',
            onPressed: _renameSetlist,
            icon: const Icon(Icons.edit_outlined),
          ),
          IconButton(
            tooltip: '삭제',
            onPressed: _deleteSetlist,
            icon: const Icon(Icons.delete_outline),
          ),
        ],
      ),
      floatingActionButton: scores.isEmpty
          ? null
          : FloatingActionButton.extended(
              onPressed: _addScore,
              icon: const Icon(Icons.playlist_add),
              label: const Text('악보 추가'),
            ),
      body: SafeArea(
        child: scores.isEmpty
            ? _EmptySetlistDetail(onAddScore: _addScore)
            : ReorderableListView.builder(
                buildDefaultDragHandles: false,
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
                onReorderItem: (oldIndex, newIndex) {
                  unawaited(
                    controller.moveScoreInSetlist(
                      currentSetlist,
                      oldIndex,
                      newIndex,
                    ),
                  );
                },
                itemBuilder: (context, index) {
                  final score = scores[index];
                  return Padding(
                    key: ValueKey('${currentSetlist.id}-${score.id}'),
                    padding: const EdgeInsets.only(bottom: 10),
                    child: ListTile(
                      tileColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      leading: SizedBox(
                        width: 92,
                        child: Row(
                          children: [
                            Tooltip(
                              message: '순서 입력',
                              child: InkWell(
                                customBorder: const CircleBorder(),
                                onTap: () => _moveScoreToPosition(
                                  currentSetlist,
                                  score,
                                  index,
                                  scores.length,
                                ),
                                child: CircleAvatar(
                                  child: Text('${index + 1}'),
                                ),
                              ),
                            ),
                            const SizedBox(width: 6),
                            Semantics(
                              button: true,
                              label: '끌어서 순서 변경',
                              child: ReorderableDragStartListener(
                                index: index,
                                child: Tooltip(
                                  message: '끌어서 순서 변경',
                                  child: SizedBox(
                                    width: 44,
                                    height: 44,
                                    child: Center(
                                      child: Icon(
                                        Icons.drag_handle,
                                        color: Theme.of(context)
                                            .colorScheme
                                            .primary,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      title: Text(
                        score.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      subtitle: Text(
                        _setlistScoreSubtitle(currentSetlist, score),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      onTap: () => _openScore(score),
                      trailing: Wrap(
                        spacing: 0,
                        children: [
                          IconButton(
                            tooltip: '위로',
                            onPressed: index == 0
                                ? null
                                : () => controller.moveScoreInSetlist(
                                    currentSetlist,
                                    index,
                                    index - 1,
                                  ),
                            icon: const Icon(Icons.keyboard_arrow_up),
                          ),
                          IconButton(
                            tooltip: '아래로',
                            onPressed: index == scores.length - 1
                                ? null
                                : () => controller.moveScoreInSetlist(
                                    currentSetlist,
                                    index,
                                    index + 1,
                                  ),
                            icon: const Icon(Icons.keyboard_arrow_down),
                          ),
                          IconButton(
                            tooltip: '제거',
                            onPressed: () => _removeScoreFromSetlist(
                              currentSetlist,
                              score,
                              index,
                            ),
                            icon: const Icon(Icons.remove_circle_outline),
                          ),
                        ],
                      ),
                    ),
                  );
                },
                itemCount: scores.length,
              ),
      ),
    );
  }
}

class _EmptySetlistDetail extends StatelessWidget {
  const _EmptySetlistDetail({required this.onAddScore});

  final VoidCallback onAddScore;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.playlist_add_check_outlined,
              size: 48,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: 16),
            Text(
              '이 세트리스트에 악보가 없습니다.',
              style: Theme.of(context).textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            const Text('연주 순서에 넣을 악보를 골라 담아보세요.', textAlign: TextAlign.center),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: onAddScore,
              icon: const Icon(Icons.playlist_add),
              label: const Text('악보 추가'),
            ),
          ],
        ),
      ),
    );
  }
}

class _SetlistOrderDialog extends StatefulWidget {
  const _SetlistOrderDialog({
    required this.scoreTitle,
    required this.initialPosition,
    required this.totalCount,
  });

  final String scoreTitle;
  final int initialPosition;
  final int totalCount;

  @override
  State<_SetlistOrderDialog> createState() => _SetlistOrderDialogState();
}

class _SetlistOrderDialogState extends State<_SetlistOrderDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _textController;

  @override
  void initState() {
    super.initState();
    _textController = TextEditingController(text: '${widget.initialPosition}');
  }

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  void _submit() {
    if (_formKey.currentState?.validate() != true) {
      return;
    }
    Navigator.of(context).pop(int.parse(_textController.text));
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('"${widget.scoreTitle}" 순서 이동'),
      content: Form(
        key: _formKey,
        child: TextFormField(
          controller: _textController,
          autofocus: true,
          keyboardType: TextInputType.number,
          inputFormatters: <TextInputFormatter>[
            FilteringTextInputFormatter.digitsOnly,
          ],
          decoration: InputDecoration(
            labelText: '이동할 순서',
            helperText: '1부터 ${widget.totalCount} 사이 숫자',
          ),
          validator: (value) {
            final position = int.tryParse(value ?? '');
            if (position == null ||
                position < 1 ||
                position > widget.totalCount) {
              return '1부터 ${widget.totalCount} 사이로 입력해주세요.';
            }
            return null;
          },
          onFieldSubmitted: (_) => _submit(),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('취소'),
        ),
        FilledButton(onPressed: _submit, child: const Text('이동')),
      ],
    );
  }
}

class _ScoreMultiPickerSheet extends StatefulWidget {
  const _ScoreMultiPickerSheet({required this.scores});

  final List<SheetScore> scores;

  @override
  State<_ScoreMultiPickerSheet> createState() => _ScoreMultiPickerSheetState();
}

class _ScoreMultiPickerSheetState extends State<_ScoreMultiPickerSheet> {
  String _query = '';
  final Set<String> _selectedScoreIds = <String>{};

  void _toggleScore(SheetScore score) {
    setState(() {
      if (!_selectedScoreIds.add(score.id)) {
        _selectedScoreIds.remove(score.id);
      }
    });
  }

  void _toggleFilteredScores(List<SheetScore> filteredScores) {
    setState(() {
      final visibleScoreIds = filteredScores.map((score) => score.id).toSet();
      if (visibleScoreIds.isEmpty) {
        return;
      }
      final didSelectAllVisible = visibleScoreIds.every(
        _selectedScoreIds.contains,
      );
      if (didSelectAllVisible) {
        _selectedScoreIds.removeAll(visibleScoreIds);
      } else {
        _selectedScoreIds.addAll(visibleScoreIds);
      }
    });
  }

  void _submit() {
    final selectedScores = widget.scores
        .where((score) => _selectedScoreIds.contains(score.id))
        .toList(growable: false);
    Navigator.of(context).pop(selectedScores);
  }

  @override
  Widget build(BuildContext context) {
    final filteredScores = widget.scores
        .where((score) => score.matches(_query))
        .toList(growable: false);
    final selectedCount = _selectedScoreIds.length;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  selectedCount == 0
                      ? '추가할 악보를 선택하세요'
                      : '$selectedCount개 악보 선택됨',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
              FilledButton.icon(
                onPressed: selectedCount == 0 ? null : _submit,
                icon: const Icon(Icons.playlist_add),
                label: const Text('추가'),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: TextField(
            onChanged: (value) {
              setState(() {
                _query = value;
              });
            },
            decoration: const InputDecoration(
              hintText: '추가할 악보 검색',
              prefixIcon: Icon(Icons.search),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: filteredScores.isEmpty
                  ? null
                  : () => _toggleFilteredScores(filteredScores),
              icon: Icon(
                filteredScores.isNotEmpty &&
                        filteredScores.every(
                          (score) => _selectedScoreIds.contains(score.id),
                        )
                    ? Icons.deselect
                    : Icons.select_all,
              ),
              label: Text(
                filteredScores.isNotEmpty &&
                        filteredScores.every(
                          (score) => _selectedScoreIds.contains(score.id),
                        )
                    ? '현재 검색 결과 선택 해제'
                    : '현재 검색 결과 전체 선택',
              ),
            ),
          ),
        ),
        Flexible(
          child: filteredScores.isEmpty
              ? const Padding(
                  padding: EdgeInsets.fromLTRB(16, 24, 16, 32),
                  child: Text('검색 결과가 없습니다.'),
                )
              : ListView.separated(
                  shrinkWrap: true,
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  itemBuilder: (context, index) {
                    final score = filteredScores[index];
                    final isSelected = _selectedScoreIds.contains(score.id);
                    return ListTile(
                      leading: Checkbox(
                        value: isSelected,
                        onChanged: (_) => _toggleScore(score),
                      ),
                      title: Text(score.title),
                      subtitle: Text(_scoreIdentitySubtitle(score)),
                      selected: isSelected,
                      onTap: () => _toggleScore(score),
                    );
                  },
                  separatorBuilder: (context, index) =>
                      const Divider(height: 1),
                  itemCount: filteredScores.length,
                ),
        ),
      ],
    );
  }
}

class _SetlistRehearsalSheet extends StatefulWidget {
  const _SetlistRehearsalSheet({required this.setlist, required this.scores});

  final SheetSetlist setlist;
  final List<SheetScore> scores;

  @override
  State<_SetlistRehearsalSheet> createState() => _SetlistRehearsalSheetState();
}

class _SetlistRehearsalSheetState extends State<_SetlistRehearsalSheet> {
  late bool _rehearsalMode = widget.setlist.rehearsalMode;
  late int _transitionSeconds = widget.setlist.transitionSeconds;
  late bool _useViewerOverride = widget.setlist.viewerSettingsOverride != null;
  late SheetViewerSettings _viewerOverride =
      widget.setlist.viewerSettingsOverride ??
      SheetViewerSettings.defaultSettings;
  late final Map<String, TextEditingController> _pageControllers = {
    for (final score in widget.scores)
      score.id: TextEditingController(
        text: (widget.setlist.scoreStartPages[score.id] ?? score.lastPage)
            .toString(),
      ),
  };
  late final Map<String, TextEditingController> _noteControllers = {
    for (final score in widget.scores)
      score.id: TextEditingController(
        text: widget.setlist.scoreNotes[score.id] ?? '',
      ),
  };
  late final Map<String, TextEditingController> _durationControllers = {
    for (final score in widget.scores)
      score.id: TextEditingController(
        text: (widget.setlist.scoreDurations[score.id] ?? 0).toString(),
      ),
  };

  @override
  void dispose() {
    for (final controller in _pageControllers.values) {
      controller.dispose();
    }
    for (final controller in _noteControllers.values) {
      controller.dispose();
    }
    for (final controller in _durationControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          bottom: MediaQuery.viewInsetsOf(context).bottom + 24,
        ),
        child: ListView(
          shrinkWrap: true,
          children: [
            Text(
              '세트리스트 리허설',
              style: Theme.of(context).textTheme.titleLarge
                  ?.copyWith(fontWeight: FontWeight.w900),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('리허설 모드'),
              value: _rehearsalMode,
              onChanged: (value) => setState(() => _rehearsalMode = value),
            ),
            Slider(
              value: _transitionSeconds.toDouble(),
              min: 0,
              max: 120,
              divisions: 12,
              label: '전환 $_transitionSeconds초',
              onChanged: (value) =>
                  setState(() => _transitionSeconds = value.round()),
            ),
            const Divider(),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('공연 보기 프리셋'),
              subtitle: const Text('세트리스트로 열 때 곡별 보기 설정보다 우선 적용'),
              value: _useViewerOverride,
              onChanged: (value) => setState(() {
                _useViewerOverride = value;
              }),
            ),
            if (_useViewerOverride) ...[
              DropdownButtonFormField<String>(
                initialValue: _globalViewerDisplayModeValue(_viewerOverride),
                decoration: const InputDecoration(labelText: '보기 모드'),
                items: const [
                  DropdownMenuItem<String>(value: 'auto', child: Text('자동')),
                  DropdownMenuItem<String>(
                    value: 'singlePage',
                    child: Text('1페이지'),
                  ),
                  DropdownMenuItem<String>(
                    value: 'twoPage',
                    child: Text('2페이지'),
                  ),
                  DropdownMenuItem<String>(
                    value: 'continuousVertical',
                    child: Text('세로 스크롤'),
                  ),
                ],
                onChanged: (value) {
                  if (value != null) {
                    setState(() {
                      _viewerOverride = _viewerOverride.copyWith(
                        displayMode: value,
                      );
                    });
                  }
                },
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _viewerOverride.pageScale,
                decoration: const InputDecoration(labelText: '페이지 맞춤'),
                items: _SheetViewerPageScale.values
                    .map(
                      (scale) => DropdownMenuItem<String>(
                        value: scale.settingValue,
                        child: Text(scale.label),
                      ),
                    )
                    .toList(growable: false),
                onChanged: (value) {
                  if (value != null) {
                    setState(() {
                      _viewerOverride = _viewerOverride.copyWith(
                        pageScale: value,
                      );
                    });
                  }
                },
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('반 페이지 넘김'),
                value: _viewerOverride.halfPageTurn,
                onChanged: (value) => setState(() {
                  _viewerOverride = _viewerOverride.copyWith(
                    halfPageTurn: value,
                  );
                }),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('곡 전환 전 확인'),
                value: _viewerOverride.confirmSetlistTransition,
                onChanged: (value) => setState(() {
                  _viewerOverride = _viewerOverride.copyWith(
                    confirmSetlistTransition: value,
                  );
                }),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('곡 끝에서 자동 이동'),
                value: _viewerOverride.autoAdvanceSetlist,
                onChanged: (value) => setState(() {
                  _viewerOverride = _viewerOverride.copyWith(
                    autoAdvanceSetlist: value,
                  );
                }),
              ),
              DropdownButtonFormField<String>(
                initialValue: _viewerOverride.pedalMapping,
                decoration: const InputDecoration(labelText: '페달 매핑'),
                items: _SheetPedalMapping.values
                    .map(
                      (mapping) => DropdownMenuItem<String>(
                        value: mapping.settingValue,
                        child: Text(mapping.label),
                      ),
                    )
                    .toList(growable: false),
                onChanged: (value) {
                  if (value != null) {
                    setState(() {
                      _viewerOverride = _viewerOverride.copyWith(
                        pedalMapping: value,
                      );
                    });
                  }
                },
              ),
              const Divider(),
            ],
            for (final score in widget.scores)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      score.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w900),
                    ),
                    Row(
                      children: [
                        SizedBox(
                          width: 96,
                          child: TextField(
                            controller: _pageControllers[score.id],
                            decoration: const InputDecoration(labelText: '시작쪽'),
                            keyboardType: TextInputType.number,
                          ),
                        ),
                        const SizedBox(width: 10),
                        SizedBox(
                          width: 104,
                          child: TextField(
                            controller: _durationControllers[score.id],
                            decoration: const InputDecoration(labelText: '초'),
                            keyboardType: TextInputType.number,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: _noteControllers[score.id],
                            decoration: const InputDecoration(labelText: '메모'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            Align(
              alignment: Alignment.centerRight,
              child: FilledButton.icon(
                onPressed: () => Navigator.of(context).pop(_buildSetlist()),
                icon: const Icon(Icons.check),
                label: const Text('저장'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  SheetSetlist _buildSetlist() {
    final startPages = <String, int>{};
    final notes = <String, String>{};
    final durations = <String, int>{};
    for (final score in widget.scores) {
      final startPage = int.tryParse(_pageControllers[score.id]?.text ?? '');
      if (startPage != null && startPage > 0) {
        startPages[score.id] = startPage;
      }
      final note = _noteControllers[score.id]?.text.trim() ?? '';
      if (note.isNotEmpty) {
        notes[score.id] = note;
      }
      final duration = int.tryParse(_durationControllers[score.id]?.text ?? '');
      if (duration != null && duration > 0) {
        durations[score.id] = duration.clamp(1, 24 * 60 * 60).toInt();
      }
    }
    return widget.setlist.copyWith(
      rehearsalMode: _rehearsalMode,
      transitionSeconds: _transitionSeconds,
      scoreStartPages: Map<String, int>.unmodifiable(startPages),
      scoreNotes: Map<String, String>.unmodifiable(notes),
      scoreDurations: Map<String, int>.unmodifiable(durations),
      viewerSettingsOverride: _useViewerOverride ? _viewerOverride : null,
      clearViewerSettingsOverride: !_useViewerOverride,
    );
  }
}

enum _SheetViewerDisplayMode {
  singlePage('1페이지', Icons.crop_portrait),
  twoPage('2페이지', Icons.view_week_outlined),
  continuousVertical('세로 스크롤', Icons.vertical_align_center);

  const _SheetViewerDisplayMode(this.label, this.icon);

  final String label;
  final IconData icon;
}

extension _SheetViewerDisplayModeSettings on _SheetViewerDisplayMode {
  String get settingValue {
    return switch (this) {
      _SheetViewerDisplayMode.singlePage => 'singlePage',
      _SheetViewerDisplayMode.twoPage => 'twoPage',
      _SheetViewerDisplayMode.continuousVertical => 'continuousVertical',
    };
  }
}

_SheetViewerDisplayMode _displayModeFromSettings(
  SheetViewerSettings settings, {
  required bool isCompactViewer,
}) {
  final preferredMode = switch (settings.displayMode) {
    'singlePage' => _SheetViewerDisplayMode.singlePage,
    'twoPage' => _SheetViewerDisplayMode.twoPage,
    'continuousVertical' => _SheetViewerDisplayMode.continuousVertical,
    _ =>
      isCompactViewer
          ? _SheetViewerDisplayMode.continuousVertical
          : _SheetViewerDisplayMode.singlePage,
  };
  if (isCompactViewer && preferredMode == _SheetViewerDisplayMode.twoPage) {
    return _SheetViewerDisplayMode.continuousVertical;
  }
  return preferredMode;
}

enum _SheetViewerDisplayEffect {
  normal('일반', Icons.contrast),
  dark('어두운 배경', Icons.dark_mode_outlined),
  inverted('색상 반전', Icons.invert_colors_outlined);

  const _SheetViewerDisplayEffect(this.label, this.icon);

  final String label;
  final IconData icon;
}

extension _SheetViewerDisplayEffectSettings on _SheetViewerDisplayEffect {
  String get settingValue {
    return switch (this) {
      _SheetViewerDisplayEffect.normal => 'normal',
      _SheetViewerDisplayEffect.dark => 'dark',
      _SheetViewerDisplayEffect.inverted => 'inverted',
    };
  }
}

enum _SheetViewerPageScale {
  fitPage('페이지 맞춤', Icons.fit_screen),
  fitWidth('폭 맞춤', Icons.swap_horiz),
  fullscreen('전체 화면', Icons.fullscreen);

  const _SheetViewerPageScale(this.label, this.icon);

  final String label;
  final IconData icon;
}

extension _SheetViewerPageScaleSettings on _SheetViewerPageScale {
  String get settingValue {
    return switch (this) {
      _SheetViewerPageScale.fitPage => SheetViewerSettings.fitPageScale,
      _SheetViewerPageScale.fitWidth => SheetViewerSettings.fitWidthScale,
      _SheetViewerPageScale.fullscreen => SheetViewerSettings.fullscreenScale,
    };
  }
}

_SheetViewerPageScale _pageScaleFromSettings(SheetViewerSettings settings) {
  return switch (settings.pageScale) {
    SheetViewerSettings.fitWidthScale => _SheetViewerPageScale.fitWidth,
    SheetViewerSettings.fullscreenScale => _SheetViewerPageScale.fullscreen,
    _ => _SheetViewerPageScale.fitPage,
  };
}

enum _SheetPedalMapping {
  standard('표준', Icons.keyboard_tab),
  reversed('반전', Icons.compare_arrows),
  setlistEdges('세트리스트 경계 이동', Icons.queue_music_outlined),
  reversedSetlistEdges('반전 + 경계 이동', Icons.compare_arrows),
  custom('직접 설정', Icons.tune);

  const _SheetPedalMapping(this.label, this.icon);

  final String label;
  final IconData icon;
}

extension _SheetPedalMappingSettings on _SheetPedalMapping {
  String get settingValue {
    return switch (this) {
      _SheetPedalMapping.standard => SheetViewerSettings.standardPedalMapping,
      _SheetPedalMapping.reversed => SheetViewerSettings.reversedPedalMapping,
      _SheetPedalMapping.setlistEdges =>
        SheetViewerSettings.setlistPedalMapping,
      _SheetPedalMapping.reversedSetlistEdges =>
        SheetViewerSettings.reversedSetlistPedalMapping,
      _SheetPedalMapping.custom => SheetViewerSettings.customPedalMappingType,
    };
  }

  bool get movesAcrossSetlistBoundary {
    return this == _SheetPedalMapping.setlistEdges ||
        this == _SheetPedalMapping.reversedSetlistEdges;
  }
}

_SheetPedalMapping _pedalMappingFromSettings(SheetViewerSettings settings) {
  return switch (settings.pedalMapping) {
    SheetViewerSettings.reversedPedalMapping => _SheetPedalMapping.reversed,
    SheetViewerSettings.setlistPedalMapping => _SheetPedalMapping.setlistEdges,
    SheetViewerSettings.reversedSetlistPedalMapping =>
      _SheetPedalMapping.reversedSetlistEdges,
    SheetViewerSettings.customPedalMappingType => _SheetPedalMapping.custom,
    _ => _SheetPedalMapping.standard,
  };
}

enum _SheetRenderProfile {
  balanced('균형', Icons.balance_outlined),
  largePdf('대형 PDF', Icons.picture_as_pdf_outlined);

  const _SheetRenderProfile(this.label, this.icon);

  final String label;
  final IconData icon;
}

extension _SheetRenderProfileSettings on _SheetRenderProfile {
  String get settingValue {
    return switch (this) {
      _SheetRenderProfile.balanced => SheetViewerSettings.balancedRenderProfile,
      _SheetRenderProfile.largePdf => SheetViewerSettings.largePdfRenderProfile,
    };
  }

  bool get limitsRenderCache => this == _SheetRenderProfile.largePdf;

  int get maxImageBytesCachedOnMemory {
    return switch (this) {
      _SheetRenderProfile.balanced => 100 * 1024 * 1024,
      _SheetRenderProfile.largePdf => 48 * 1024 * 1024,
    };
  }

  double? get onePassRenderingScaleThreshold {
    return switch (this) {
      _SheetRenderProfile.balanced => null,
      _SheetRenderProfile.largePdf => 1.5,
    };
  }
}

_SheetRenderProfile _renderProfileFromSettings(SheetViewerSettings settings) {
  return switch (settings.renderProfile) {
    SheetViewerSettings.largePdfRenderProfile => _SheetRenderProfile.largePdf,
    _ => _SheetRenderProfile.balanced,
  };
}

enum _SheetPageTurnAnimation {
  none('없음', Icons.motion_photos_off_outlined),
  fast('빠름', Icons.bolt_outlined),
  natural('자연스러움', Icons.motion_photos_on_outlined);

  const _SheetPageTurnAnimation(this.label, this.icon);

  final String label;
  final IconData icon;
}

extension _SheetPageTurnAnimationSettings on _SheetPageTurnAnimation {
  String get settingValue {
    return switch (this) {
      _SheetPageTurnAnimation.none => SheetViewerSettings.noPageTurnAnimation,
      _SheetPageTurnAnimation.fast => SheetViewerSettings.fastPageTurnAnimation,
      _SheetPageTurnAnimation.natural =>
        SheetViewerSettings.naturalPageTurnAnimation,
    };
  }

  Duration get duration {
    return switch (this) {
      _SheetPageTurnAnimation.none => Duration.zero,
      _SheetPageTurnAnimation.fast => const Duration(milliseconds: 90),
      _SheetPageTurnAnimation.natural => const Duration(milliseconds: 200),
    };
  }
}

_SheetPageTurnAnimation _pageTurnAnimationFromSettings(
  SheetViewerSettings settings,
) {
  return switch (settings.pageTurnAnimation) {
    SheetViewerSettings.noPageTurnAnimation => _SheetPageTurnAnimation.none,
    SheetViewerSettings.fastPageTurnAnimation => _SheetPageTurnAnimation.fast,
    _ => _SheetPageTurnAnimation.natural,
  };
}

_SheetViewerDisplayEffect _displayEffectFromSettings(
  SheetViewerSettings settings,
) {
  return switch (settings.displayEffect) {
    'dark' => _SheetViewerDisplayEffect.dark,
    'inverted' => _SheetViewerDisplayEffect.inverted,
    _ => _SheetViewerDisplayEffect.normal,
  };
}

enum _BookmarkListAction { open, rename, delete }

enum _TextAnnotationAction { edit, delete }

enum _PageOrderAction { moveUp, moveDown, duplicate, reset }

enum _JumpPointAction { add, open, rename, delete }

enum _ViewerMenuAction {
  bookmarks,
  scoreParts,
  editScoreMetadata,
  scoreNotes,
  displayMode,
  displayEffect,
  pageScale,
  pedalMapping,
  renderProfile,
  pageTurnAnimation,
  showTapZoneHint,
  performanceSettings,
  toggleHalfPageTurn,
  toggleAnnotationMode,
  undoAnnotation,
  redoAnnotation,
  autoScroll,
  metronome,
  tuner,
  pagePicker,
  pdfTextSearch,
  hideCurrentPage,
  manageHiddenPages,
  managePageOrder,
  manageJumpPoints,
  manageRehearsalMarks,
  importPdfOutline,
  importBookmarkCsv,
  cropPages,
  cropPresets,
  applyPageCrop,
  pageTemplates,
  applyPageArrangement,
  rotateCurrentPage,
  applyPageRotations,
  sanitizePdfLinks,
  sharePdf,
  shareAnnotatedPdf,
  inputDiagnostic,
  togglePdfLinks,
  togglePerformanceMode,
}

enum _ViewerMiniTool { metronome, tuner }

List<PopupMenuEntry<_ViewerMenuAction>> _viewerCompactLibraryMenuItems() =>
    const [
      PopupMenuItem<_ViewerMenuAction>(
        value: _ViewerMenuAction.bookmarks,
        child: ListTile(
          leading: Icon(Icons.bookmarks_outlined),
          title: Text('북마크 목록'),
        ),
      ),
      PopupMenuItem<_ViewerMenuAction>(
        value: _ViewerMenuAction.scoreParts,
        child: ListTile(
          leading: Icon(Icons.library_music_outlined),
          title: Text('파트/버전'),
        ),
      ),
      PopupMenuItem<_ViewerMenuAction>(
        value: _ViewerMenuAction.editScoreMetadata,
        child: ListTile(
          leading: Icon(Icons.edit_note_outlined),
          title: Text('악보 정보 편집'),
        ),
      ),
      PopupMenuItem<_ViewerMenuAction>(
        value: _ViewerMenuAction.scoreNotes,
        child: ListTile(
          leading: Icon(Icons.sticky_note_2_outlined),
          title: Text('악보 메모'),
        ),
      ),
    ];

enum _AnnotationToolbarTool {
  pen('펜', Icons.edit_outlined),
  highlighter('형광펜', Icons.brush_outlined),
  line('선', Icons.remove),
  arrow('화살표', Icons.call_made),
  rectangle('사각형', Icons.crop_square),
  staff('오선', Icons.view_headline),
  grid('격자', Icons.grid_4x4),
  crescendo('크레셴도', Icons.open_in_full),
  diminuendo('디미누엔도', Icons.close_fullscreen),
  stamp('스탬프', Icons.check_circle_outline),
  text('텍스트', Icons.text_fields),
  eraser('지우개', Icons.auto_fix_off_outlined);

  const _AnnotationToolbarTool(this.label, this.icon);

  final String label;
  final IconData icon;

  static _AnnotationToolbarTool fromName(String name) {
    return _AnnotationToolbarTool.values.firstWhere(
      (tool) => tool.name == name,
      orElse: () => _AnnotationToolbarTool.pen,
    );
  }
}

extension _AnnotationToolbarToolStroke on _AnnotationToolbarTool {
  SheetAnnotationTool get sheetAnnotationTool {
    return switch (this) {
      _AnnotationToolbarTool.highlighter => SheetAnnotationTool.highlighter,
      _AnnotationToolbarTool.line => SheetAnnotationTool.line,
      _AnnotationToolbarTool.arrow => SheetAnnotationTool.arrow,
      _AnnotationToolbarTool.rectangle => SheetAnnotationTool.rectangle,
      _AnnotationToolbarTool.staff => SheetAnnotationTool.staff,
      _AnnotationToolbarTool.grid => SheetAnnotationTool.grid,
      _AnnotationToolbarTool.crescendo => SheetAnnotationTool.crescendo,
      _AnnotationToolbarTool.diminuendo => SheetAnnotationTool.diminuendo,
      _ => SheetAnnotationTool.pen,
    };
  }

  bool get usesTwoPointShape {
    return switch (this) {
      _AnnotationToolbarTool.line ||
      _AnnotationToolbarTool.arrow ||
      _AnnotationToolbarTool.rectangle ||
      _AnnotationToolbarTool.staff ||
      _AnnotationToolbarTool.grid ||
      _AnnotationToolbarTool.crescendo ||
      _AnnotationToolbarTool.diminuendo => true,
      _ => false,
    };
  }
}

enum _AnnotationStamp {
  ok('OK', Icons.check_circle_outline),
  cue('CUE', Icons.flag_outlined),
  mark('!', Icons.priority_high),
  fine('Fine', Icons.flag_circle_outlined),
  dc('D.C.', Icons.repeat),
  ds('D.S.', Icons.repeat_on_outlined),
  coda('Coda', Icons.adjust),
  rit('rit.', Icons.slow_motion_video_outlined),
  accel('accel.', Icons.speed_outlined);

  const _AnnotationStamp(this.label, this.icon);

  final String label;
  final IconData icon;

  static _AnnotationStamp fromName(String name) {
    return _AnnotationStamp.values.firstWhere(
      (stamp) => stamp.name == name,
      orElse: () => _AnnotationStamp.ok,
    );
  }
}

class _AnnotationPreset {
  const _AnnotationPreset({
    required this.tool,
    required this.color,
    required this.width,
    required this.stamp,
  });

  factory _AnnotationPreset.fromSettings(SheetAnnotationToolPreset preset) {
    return _AnnotationPreset(
      tool: _AnnotationToolbarTool.fromName(preset.toolName),
      color: preset.color,
      width: preset.width,
      stamp: _AnnotationStamp.fromName(preset.stampName),
    );
  }

  final _AnnotationToolbarTool tool;
  final int color;
  final double width;
  final _AnnotationStamp stamp;

  SheetAnnotationToolPreset toSettings() {
    return SheetAnnotationToolPreset(
      toolName: tool.name,
      color: color,
      width: width,
      stampName: stamp.name,
    );
  }
}

class _BookmarkListRequest {
  const _BookmarkListRequest({required this.bookmark, required this.action});

  final SheetBookmark bookmark;
  final _BookmarkListAction action;
}

class _PageOrderRequest {
  const _PageOrderRequest({required this.action, this.index});

  final _PageOrderAction action;
  final int? index;
}

class _JumpPointRequest {
  const _JumpPointRequest({required this.action, this.jumpPoint});

  final _JumpPointAction action;
  final SheetPageJumpPoint? jumpPoint;
}

class _ViewerInputIntent extends Intent {
  const _ViewerInputIntent(this.action);

  final SheetViewerInputAction action;
}

class _PerformanceModeCanceled implements Exception {
  const _PerformanceModeCanceled();
}

String _songPageBoundaryMessage(int delta) => delta < 0 ? '곡 처음' : '곡 끝';

Map<ShortcutActivator, Intent> _viewerKeyboardShortcutsFor(
  String pedalMapping,
  Map<String, String> customMapping,
) {
  final shortcuts = <ShortcutActivator, Intent>{};
  final activators = <SingleActivator>[
    const SingleActivator(LogicalKeyboardKey.arrowRight),
    const SingleActivator(LogicalKeyboardKey.arrowDown),
    const SingleActivator(LogicalKeyboardKey.pageDown),
    const SingleActivator(LogicalKeyboardKey.enter),
    const SingleActivator(LogicalKeyboardKey.numpadEnter),
    const SingleActivator(LogicalKeyboardKey.space),
    const SingleActivator(LogicalKeyboardKey.tab),
    const SingleActivator(LogicalKeyboardKey.mediaTrackNext),
    const SingleActivator(LogicalKeyboardKey.mediaSkipForward),
    const SingleActivator(LogicalKeyboardKey.mediaStepForward),
    const SingleActivator(LogicalKeyboardKey.mediaSkip),
    const SingleActivator(LogicalKeyboardKey.arrowLeft),
    const SingleActivator(LogicalKeyboardKey.arrowUp),
    const SingleActivator(LogicalKeyboardKey.pageUp),
    const SingleActivator(LogicalKeyboardKey.backspace),
    const SingleActivator(LogicalKeyboardKey.mediaTrackPrevious),
    const SingleActivator(LogicalKeyboardKey.mediaSkipBackward),
    const SingleActivator(LogicalKeyboardKey.mediaStepBackward),
    const SingleActivator(LogicalKeyboardKey.space, shift: true),
    const SingleActivator(LogicalKeyboardKey.tab, shift: true),
  ];
  for (final activator in activators) {
    final action = resolveSheetViewerKeyAction(
      key: activator.trigger,
      isShiftPressed: activator.shift,
      pedalMapping: pedalMapping,
      customMapping: customMapping,
    );
    if (action != SheetViewerInputAction.none) {
      shortcuts[activator] = _ViewerInputIntent(action);
    }
  }
  return shortcuts;
}

class SheetViewerScreen extends StatefulWidget {
  const SheetViewerScreen({
    required this.controller,
    required this.scoreId,
    this.setlistId,
    this.autoStartScroll = false,
    this.showImportNudge = false,
    super.key,
  });

  final SheetLibraryController controller;
  final String scoreId;
  final String? setlistId;
  final bool autoStartScroll;
  final bool showImportNudge;

  @override
  State<SheetViewerScreen> createState() => _SheetViewerScreenState();
}

class _SheetViewerScreenState extends State<SheetViewerScreen> {
  late final PdfViewerController _pdfController;
  PdfTextSearcher? _textSearcher;
  late final FocusNode _keyboardFocusNode;
  final SheetViewerPageTurnGuard _pageTurnGuard = SheetViewerPageTurnGuard();
  final List<SheetViewerInputDiagnosticEntry> _inputDiagnosticLog =
      <SheetViewerInputDiagnosticEntry>[];
  int? _pageNumber;
  int? _pageCount;
  bool _showPdfLinks = false;
  bool _isPerformanceMode = false;
  _SheetViewerDisplayMode _displayMode = _SheetViewerDisplayMode.singlePage;
  _SheetViewerDisplayEffect _displayEffect = _SheetViewerDisplayEffect.normal;
  _SheetViewerPageScale _pageScale = _SheetViewerPageScale.fitPage;
  _SheetPedalMapping _pedalMapping = _SheetPedalMapping.standard;
  _SheetRenderProfile _renderProfile = _SheetRenderProfile.balanced;
  _SheetPageTurnAnimation _pageTurnAnimation = _SheetPageTurnAnimation.natural;
  bool _useHalfPageTurn = false;
  bool _isAnnotationMode = false;
  bool _isSanitizingPdfLinks = false;
  bool _isApplyingPageTransform = false;
  bool _isAutoScrolling = false;
  bool _isAutoScrollPaused = false;
  bool _isAutoScrollTicking = false;
  int? _autoScrollCueRemainingSeconds;
  int? _pageOrderCursor;
  DateTime? _autoScrollStartedAt;
  DateTime? _autoScrollPausedAt;
  SheetAutoScrollPlan? _autoScrollPlan;
  double _autoScrollProgress = 0;
  Set<int> _autoScrollConsumedPausePages = const <int>{};
  Set<String> _autoScrollConsumedCueKeys = const <String>{};
  bool _didAutoStartScroll = false;
  _AnnotationToolbarTool _annotationTool = _AnnotationToolbarTool.pen;
  _AnnotationStamp _annotationStamp = _AnnotationStamp.ok;
  _AnnotationPreset? _favoriteAnnotationPreset;
  int _annotationColor = 0xff111111;
  double _annotationWidth = 3.5;
  int? _draftAnnotationPageNumber;
  List<SheetAnnotationPoint> _draftAnnotationPoints =
      const <SheetAnnotationPoint>[];
  bool _didResolveResponsiveDisplayMode = false;
  bool _showPageControls = true;
  Timer? _pageControlsTimer;
  Timer? _autoScrollTimer;
  Timer? _autoScrollCueTimer;
  String? _cropFitToken;
  List<SheetBookmark> _pdfOutlineBookmarks = const <SheetBookmark>[];
  bool _didLoadPdfOutline = false;
  String? _viewerFileStatusPath;
  Future<SheetViewerFileStatus>? _viewerFileStatusFuture;
  bool _showTapZoneHint = true;
  Offset? _tapZonePointerDown;
  DateTime? _tapZonePointerDownAt;
  _ViewerMiniTool? _miniTool;

  SheetScore get score => widget.controller.scoreById(widget.scoreId);

  SheetViewerSettings get _effectiveViewerSettings {
    return widget.controller.viewerSettingsForScore(
      score,
      setlistId: widget.setlistId,
    );
  }

  SheetMetronomeSettings get _effectiveMetronomeSettings {
    return widget.controller.metronomeSettingsForScore(
      score,
      setlistId: widget.setlistId,
    );
  }

  int get _initialViewerPage {
    final setlistId = widget.setlistId;
    if (setlistId == null) {
      return score.lastPage;
    }
    final setlist = widget.controller.setlistByIdOrNull(setlistId);
    return setlist?.scoreStartPages[score.id] ?? score.lastPage;
  }

  int _pageOrderDisplayCount(SheetScore currentScore) {
    final pageCount = _pdfController.isReady
        ? _pdfController.pageCount
        : _pageCount;
    if (pageCount == null || pageCount < 1) {
      return currentScore.pageSettings.pageOrder.length;
    }
    return currentScore.pageSettings.effectivePageOrder(pageCount).length;
  }

  String get _viewerControlModeLabel {
    final currentScore = score;
    final hiddenCount = currentScore.pageSettings.hiddenPages.length;
    final hiddenLabel = hiddenCount == 0 ? '' : ' · 숨김 $hiddenCount';
    final orderLabel = currentScore.pageSettings.hasCustomPageOrder
        ? ' · 순서 ${_pageOrderDisplayCount(currentScore)}'
        : '';
    final jumpLabel = currentScore.pageSettings.hasJumpPoints
        ? ' · 점프 ${currentScore.pageSettings.jumpPoints.length}'
        : '';
    final autoLabel = _autoScrollCueRemainingSeconds != null
        ? ' · 큐 ${_autoScrollCueRemainingSeconds!}'
        : _isAutoScrolling
        ? _isAutoScrollPaused
              ? ' · 자동 일시정지'
              : ' · 자동'
        : '';
    final cropLabel = score.pageSettings.pageCrops.isNotEmpty
        ? ' · 자르기 ${score.pageSettings.pageCrops.length}'
        : score.pageSettings.crop.hasCrop
        ? ' · 자르기'
        : '';
    final effectLabel = _displayEffect == _SheetViewerDisplayEffect.normal
        ? ''
        : ' · ${_displayEffect.label}';
    final scaleLabel = _pageScale == _SheetViewerPageScale.fitPage
        ? ''
        : ' · ${_pageScale.label}';
    final pedalLabel = _pedalMapping == _SheetPedalMapping.standard
        ? ''
        : ' · 페달 ${_pedalMapping.label}';
    final renderLabel = _renderProfile == _SheetRenderProfile.balanced
        ? ''
        : ' · 렌더 ${_renderProfile.label}';
    final animationLabel = _pageTurnAnimation == _SheetPageTurnAnimation.natural
        ? ''
        : ' · 넘김 ${_pageTurnAnimation.label}';
    final lockLabel = _isPerformanceMode ? ' · 공연 잠금' : '';
    final rehearsalLabel = _setlistRehearsalLabel(currentScore);
    final baseLabel = switch (_displayMode) {
      _SheetViewerDisplayMode.twoPage => '2페이지',
      _ when _useHalfPageTurn => '반쪽',
      _ => _displayMode.label,
    };
    return '$baseLabel$hiddenLabel$orderLabel$jumpLabel$cropLabel'
        '$effectLabel$scaleLabel$pedalLabel$renderLabel$animationLabel'
        '$rehearsalLabel$lockLabel$autoLabel';
  }

  String _setlistRehearsalLabel(SheetScore currentScore) {
    final setlistId = widget.setlistId;
    if (setlistId == null) {
      return '';
    }
    final setlist = widget.controller.setlistByIdOrNull(setlistId);
    if (setlist?.rehearsalMode != true) {
      return '';
    }
    final startPage = setlist!.scoreStartPages[currentScore.id];
    final duration = setlist.scoreDurations[currentScore.id] ?? 0;
    final note = setlist.scoreNotes[currentScore.id]?.trim();
    final startLabel = startPage == null ? '' : ' $startPage쪽';
    final durationLabel = duration <= 0
        ? ''
        : ' · ${_formatDuration(duration)}';
    final noteLabel = note == null || note.isEmpty ? '' : ' · $note';
    return ' · 리허설$startLabel$durationLabel$noteLabel';
  }

  String _setlistContextSubtitle(SheetSetlistPlaybackContext context) {
    final parts = <String>[context.title, context.positionLabel];
    if (context.currentDurationSeconds > 0) {
      parts.add(_formatDuration(context.currentDurationSeconds));
    }
    if (context.totalEstimatedSeconds > 0) {
      parts.add('총 ${_formatDuration(context.totalEstimatedSeconds)}');
    }
    return parts.join(' · ');
  }

  String _setlistProgressSubtitle(SheetSetlistPlaybackContext context) {
    final parts = <String>[context.title, context.positionLabel];
    if (context.currentDurationSeconds > 0) {
      parts.add(_formatDuration(context.currentDurationSeconds));
    }
    return parts.join(' · ');
  }

  String get _currentPageLabel {
    final hiddenCount = score.pageSettings.hiddenPages.length;
    final pageText = '${_pageNumber ?? score.lastPage}/${_pageCount ?? '-'}';
    return hiddenCount == 0 ? pageText : '$pageText · 숨김 $hiddenCount';
  }

  String _viewerDebugSummary(SheetScore currentScore) {
    final pageSettings = currentScore.pageSettings;
    final annotationSummary = currentScore.annotationLayer.summary(
      storageMode: currentScore.annotationStorage.mode,
      lastSaveStatus: currentScore.annotationStorage.lastSaveStatus,
      lastSaveError: currentScore.annotationStorage.lastSaveError,
    );
    final setlistContext = widget.setlistId == null
        ? null
        : widget.controller.setlistPlaybackContext(
            setlistId: widget.setlistId!,
            scoreId: currentScore.id,
          );
    final duplicateCount =
        pageSettings.pageOrder.length - pageSettings.pageOrder.toSet().length;
    final setlistLabel = setlistContext == null
        ? 'none'
        : '${setlistContext.positionLabel}, '
              'duration=${setlistContext.currentDurationSeconds}, '
              'total=${setlistContext.totalEstimatedSeconds}';
    return '''
score=${currentScore.id} "${currentScore.title}"
page=${_pageNumber ?? currentScore.lastPage}/${_pageCount ?? '-'}
display=${_displayMode.settingValue}, scale=${_pageScale.settingValue}
crop=global:${pageSettings.crop.hasCrop}, pageCrops:${pageSettings.pageCrops.length}
pages=hidden:${pageSettings.hiddenPages.length}, order:${pageSettings.pageOrder.length}, duplicates:$duplicateCount
performanceLock=$_isPerformanceMode, annotationMode=$_isAnnotationMode
pedal=${_pedalMapping.settingValue}, customInputs=${_effectiveViewerSettings.customPedalMapping.length}
annotation=${annotationSummary.compactLabel}
setlist=$setlistLabel
'''
        .trim();
  }

  Color get _viewerBackgroundColor {
    return switch (_displayEffect) {
      _SheetViewerDisplayEffect.dark => const Color(0xff171918),
      _SheetViewerDisplayEffect.inverted => const Color(0xff101010),
      _ => const Color(0xfffbfbf7),
    };
  }

  @override
  void initState() {
    super.initState();
    _pdfController = PdfViewerController();
    _keyboardFocusNode = FocusNode(debugLabel: 'Sheet viewer shortcuts');
    _pageNumber = _initialViewerPage;
    _pdfController.addListener(_handleViewerChanged);
    widget.controller.addListener(_handleLibraryChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _keyboardFocusNode.requestFocus();
        if (widget.showImportNudge) {
          _showImportedScoreNudge();
        }
      }
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_didResolveResponsiveDisplayMode) {
      return;
    }

    final isCompactViewer = MediaQuery.sizeOf(context).width < 720;
    final viewerSettings = _effectiveViewerSettings;
    _displayMode = _displayModeFromSettings(
      viewerSettings,
      isCompactViewer: isCompactViewer,
    );
    _displayEffect = _displayEffectFromSettings(viewerSettings);
    _pageScale = _pageScaleFromSettings(viewerSettings);
    _pedalMapping = _pedalMappingFromSettings(viewerSettings);
    _renderProfile = _renderProfileFromSettings(viewerSettings);
    _pageTurnAnimation = _pageTurnAnimationFromSettings(viewerSettings);
    final favoritePreset = widget.controller.favoriteAnnotationPreset;
    _favoriteAnnotationPreset = favoritePreset == null
        ? null
        : _AnnotationPreset.fromSettings(favoritePreset);
    _useHalfPageTurn =
        viewerSettings.halfPageTurn &&
        _displayMode != _SheetViewerDisplayMode.twoPage;
    _didResolveResponsiveDisplayMode = true;
    _schedulePageControlsAutoHide();
  }

  Duration get _pageTurnDuration => _pageTurnAnimation.duration;

  @override
  void dispose() {
    _autoScrollTimer?.cancel();
    _autoScrollCueTimer?.cancel();
    _pageControlsTimer?.cancel();
    unawaited(SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge));
    widget.controller.removeListener(_handleLibraryChanged);
    final textSearcher = _textSearcher;
    if (textSearcher != null) {
      textSearcher.removeListener(_handleTextSearchChanged);
      textSearcher.dispose();
    }
    _pdfController.removeListener(_handleViewerChanged);
    _keyboardFocusNode.dispose();
    super.dispose();
  }

  void _handleLibraryChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  void _handleTextSearchChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  void _handleViewerPointerDown(PointerDownEvent event) {
    _keyboardFocusNode.requestFocus();
    _showPageControlsTemporarily();
    _tapZonePointerDown = event.localPosition;
    _tapZonePointerDownAt = DateTime.now();
  }

  void _handleViewerPointerUp(PointerUpEvent event) {
    final down = _tapZonePointerDown;
    final downAt = _tapZonePointerDownAt;
    _tapZonePointerDown = null;
    _tapZonePointerDownAt = null;
    if (down == null ||
        downAt == null ||
        _isAnnotationMode ||
        _showPdfLinks ||
        _isSanitizingPdfLinks ||
        _isApplyingPageTransform) {
      return;
    }
    if (DateTime.now().difference(downAt) > const Duration(milliseconds: 420)) {
      return;
    }
    if ((event.localPosition - down).distance > 18) {
      return;
    }

    final size = MediaQuery.sizeOf(context);
    final reservedBottomHeight = _isPerformanceMode ? 116.0 : 150.0;
    if (event.localPosition.dy > size.height - reservedBottomHeight) {
      setState(() {
        _showTapZoneHint = false;
        _showPageControls = true;
      });
      _schedulePageControlsAutoHide();
      return;
    }

    if (_miniTool != null &&
        event.localPosition.dx > size.width - 340 &&
        event.localPosition.dy < 180) {
      setState(() => _showTapZoneHint = false);
      return;
    }

    final width = size.width;
    if (event.localPosition.dx < width * 0.34) {
      setState(() => _showTapZoneHint = false);
      unawaited(_handlePedalPageTurn(-1, allowHalfPageTurn: false));
      return;
    }
    if (event.localPosition.dx > width * 0.66) {
      setState(() => _showTapZoneHint = false);
      unawaited(_handlePedalPageTurn(1, allowHalfPageTurn: false));
      return;
    }
    setState(() {
      _showTapZoneHint = false;
      _showPageControls = true;
    });
    _schedulePageControlsAutoHide();
  }

  PdfTextSearcher _ensureTextSearcher() {
    final existing = _textSearcher;
    if (existing != null) {
      return existing;
    }
    final created = PdfTextSearcher(_pdfController)
      ..addListener(_handleTextSearchChanged);
    _textSearcher = created;
    return created;
  }

  void _paintTextSearchMatches(ui.Canvas canvas, Rect pageRect, PdfPage page) {
    _textSearcher?.pageTextMatchPaintCallback(canvas, pageRect, page);
  }

  Future<SheetViewerFileStatus> _viewerFileStatusFor(String path) {
    if (_viewerFileStatusPath != path || _viewerFileStatusFuture == null) {
      _viewerFileStatusPath = path;
      _viewerFileStatusFuture = SheetViewerFileStatus.inspect(path);
    }
    return _viewerFileStatusFuture!;
  }

  void _handleViewerChanged() {
    if (!_pdfController.isReady || !mounted) {
      return;
    }

    final nextPage = _pdfController.pageNumber;
    final nextPageCount = _pdfController.pageCount;
    if (nextPageCount != _pageCount) {
      unawaited(
        widget.controller.compactScoreForPageCount(score, nextPageCount),
      );
    }
    if (nextPage != null && score.pageSettings.isHidden(nextPage)) {
      final target = score.pageSettings.closestVisiblePage(
        fromPage: nextPage,
        pageCount: nextPageCount,
      );
      if (target != nextPage) {
        _pdfController.goToPage(
          pageNumber: target,
          duration: _pageTurnDuration,
        );
        return;
      }
    }
    if (nextPage != null && nextPage != _pageNumber) {
      _syncPageOrderCursor(nextPage, nextPageCount);
      if ((_isAutoScrolling || _autoScrollCueRemainingSeconds != null) &&
          !_isAutoScrollTicking) {
        _stopAutoScroll(showMessage: true);
      }
      if (!_isPerformanceMode || widget.setlistId == null) {
        widget.controller.updateLastPage(score, nextPage);
      }
      _showPageControlsTemporarily();
    }

    if (nextPage != _pageNumber || nextPageCount != _pageCount) {
      setState(() {
        _pageNumber = nextPage;
        _pageCount = nextPageCount;
      });
      if (nextPage != null) {
        _scheduleCropToFit(nextPage);
      }
    }
  }

  Future<void> _loadPdfOutlineBookmarks(PdfDocument document) async {
    if (_didLoadPdfOutline) {
      return;
    }
    _didLoadPdfOutline = true;
    try {
      final outline = await document.loadOutline();
      final bookmarks = <SheetBookmark>[];
      void visit(List<PdfOutlineNode> nodes) {
        for (final node in nodes) {
          final title = node.title.trim();
          final pageNumber = node.dest?.pageNumber;
          if (title.isNotEmpty && pageNumber != null && pageNumber > 0) {
            bookmarks.add(
              SheetBookmark(
                pageNumber: pageNumber,
                label: title,
                createdAt: DateTime.now(),
              ),
            );
          }
          visit(node.children);
        }
      }

      visit(outline);
      if (mounted) {
        setState(() {
          _pdfOutlineBookmarks = List<SheetBookmark>.unmodifiable(bookmarks);
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _pdfOutlineBookmarks = const <SheetBookmark>[];
        });
      }
    }
  }

  void _resetCropFitPosition() {
    _cropFitToken = null;
  }

  int? _effectiveOrderIndexForPage(SheetScore currentScore, int pageNumber) {
    final currentIndex = _pageOrderCursor;
    if (currentIndex == null || !currentScore.pageSettings.hasCustomPageOrder) {
      return null;
    }
    final order = currentScore.pageSettings.effectivePageOrder(
      _pdfController.pageCount,
    );
    if (currentIndex < 0 ||
        currentIndex >= order.length ||
        order[currentIndex] != pageNumber) {
      return null;
    }
    return currentIndex;
  }

  void _scheduleCropToFit(
    int pageNumber, {
    int? orderIndex,
    bool force = false,
  }) {
    if (!mounted ||
        !score.pageSettings
            .cropForPage(pageNumber, orderIndex: orderIndex)
            .hasCrop) {
      return;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }
      unawaited(
        _applyCropToFitForPage(
          pageNumber,
          orderIndex: orderIndex,
          force: force,
        ),
      );
    });
  }

  Future<void> _applyCropToFitForPage(
    int pageNumber, {
    int? orderIndex,
    bool force = false,
  }) async {
    if (!_pdfController.isReady ||
        _displayMode == _SheetViewerDisplayMode.continuousVertical) {
      return;
    }

    final crop = score.pageSettings
        .cropForPage(pageNumber, orderIndex: orderIndex)
        .normalized();
    if (!crop.hasCrop || pageNumber < 1) {
      return;
    }

    final token =
        '${score.id}:$pageNumber:${crop.left}:${crop.top}:'
        '${crop.right}:${crop.bottom}:${orderIndex ?? -1}:'
        '${_displayMode.name}:${_pageScale.name}';
    if (!force && token == _cropFitToken) {
      return;
    }

    final page = await _pdfController.useDocument<PdfPage?>((document) {
      if (pageNumber > document.pages.length) {
        return null;
      }
      return document.pages[pageNumber - 1];
    });
    if (page == null) {
      return;
    }
    final rect = _cropRectInsidePage(crop: crop, page: page);
    if (rect == null) {
      return;
    }

    _cropFitToken = token;
    await _pdfController.goToRectInsidePage(
      pageNumber: pageNumber,
      rect: rect,
      anchor: PdfPageAnchor.top,
      duration: const Duration(milliseconds: 120),
    );
  }

  PdfRect? _cropRectInsidePage({
    required SheetCropSettings crop,
    required PdfPage page,
  }) {
    final width = page.width;
    final height = page.height;
    final left = crop.left * width;
    final right = width - (crop.right * width);
    final top = height - (crop.top * height);
    final bottom = crop.bottom * height;
    if (right <= left || top <= bottom) {
      return null;
    }
    return PdfRect(left, top, right, bottom);
  }

  Future<void> _goToRelativePage(
    int delta, {
    bool allowHalfPageTurn = true,
  }) async {
    if (!_pdfController.isReady) {
      return;
    }
    _stopAutoScroll(showMessage: false);

    if (allowHalfPageTurn &&
        _usesHalfPageTurnForRelativePage &&
        await _goToRelativeHalfPage(delta)) {
      _showPageControlsTemporarily();
      return;
    }

    final current = _pdfController.pageNumber ?? _pageNumber ?? 1;
    final orderedTarget = score.pageSettings.nextPageOrderTarget(
      currentPage: current,
      currentIndex: _pageOrderCursor,
      delta: delta,
      pageCount: _pdfController.pageCount,
    );
    if (orderedTarget != null) {
      if (orderedTarget.isBoundary) {
        if (_shouldAutoAdvanceSetlist(delta)) {
          await _goToAdjacentSetlistScore(delta);
          return;
        }
        _showSnackBar(_songPageBoundaryMessage(delta));
        return;
      }
      _pageOrderCursor = orderedTarget.index;
      await _pdfController.goToPage(
        pageNumber: orderedTarget.pageNumber,
        duration: _pageTurnDuration,
      );
      _showPageControlsTemporarily();
      return;
    }

    final target =
        score.pageSettings.nextVisiblePage(
          fromPage: current,
          delta: delta,
          pageCount: _pdfController.pageCount,
        ) ??
        current;
    if (target == current) {
      if (_shouldAutoAdvanceSetlist(delta)) {
        await _goToAdjacentSetlistScore(delta);
        return;
      }
      _showSnackBar(_songPageBoundaryMessage(delta));
      return;
    }
    await _pdfController.goToPage(
      pageNumber: target,
      duration: _pageTurnDuration,
    );
    _showPageControlsTemporarily();
  }

  void _syncPageOrderCursor(int pageNumber, int pageCount) {
    if (!score.pageSettings.hasCustomPageOrder) {
      _pageOrderCursor = null;
      return;
    }
    final order = score.pageSettings.effectivePageOrder(pageCount);
    final currentCursor = _pageOrderCursor;
    if (currentCursor != null &&
        currentCursor >= 0 &&
        currentCursor < order.length &&
        order[currentCursor] == pageNumber) {
      return;
    }
    final index = order.indexOf(pageNumber);
    _pageOrderCursor = index == -1 ? null : index;
  }

  bool _canGoToRelativePage(int delta) {
    if (delta == 0) {
      return false;
    }
    final pageCount = _pageCount;
    if (pageCount == null || pageCount < 1) {
      return false;
    }
    final current = _pageNumber ?? score.lastPage;
    final orderedTarget = score.pageSettings.nextPageOrderTarget(
      currentPage: current,
      currentIndex: _pageOrderCursor,
      delta: delta,
      pageCount: pageCount,
    );
    if (orderedTarget != null) {
      return !orderedTarget.isBoundary;
    }
    final target = score.pageSettings.nextVisiblePage(
      fromPage: current,
      delta: delta,
      pageCount: pageCount,
    );
    return target != null && target != current;
  }

  bool _canTurnPageOrSetlist(int delta) {
    if (_canGoToRelativePage(delta) || _canGoToRelativeHalfPage(delta)) {
      return true;
    }
    return _pdfController.isReady &&
        _pedalMapping.movesAcrossSetlistBoundary &&
        _adjacentSetlistScoreOrNull(delta) != null;
  }

  SheetScore? _adjacentSetlistScoreOrNull(int delta) {
    final setlistId = widget.setlistId;
    if (setlistId == null) {
      return null;
    }
    try {
      return widget.controller.adjacentSetlistScore(
        setlistId: setlistId,
        scoreId: score.id,
        delta: delta,
      );
    } catch (_) {
      return null;
    }
  }

  bool _shouldAutoAdvanceSetlist(int delta) {
    return delta > 0 &&
        widget.setlistId != null &&
        _effectiveViewerSettings.autoAdvanceSetlist &&
        _adjacentSetlistScoreOrNull(delta) != null;
  }

  bool get _usesHalfPageTurnForRelativePage {
    return _useHalfPageTurn &&
        _displayMode != _SheetViewerDisplayMode.twoPage &&
        !score.pageSettings.hasCustomPageOrder;
  }

  SheetHalfPageTurnPolicy get _halfPageTurnPolicy {
    final size = MediaQuery.sizeOf(context);
    return SheetHalfPageTurnPolicy.fromDimensions(
      width: size.width,
      height: size.height,
    );
  }

  bool _canGoToRelativeHalfPage(int delta) {
    if (!_pdfController.isReady || !_usesHalfPageTurnForRelativePage) {
      return false;
    }
    final currentPage = _pdfController.pageNumber ?? _pageNumber ?? 1;
    final layouts = _pdfController.layout.pageLayouts;
    if (currentPage < 1 || currentPage > layouts.length) {
      return false;
    }
    final visibleRect = _pdfController.visibleRect;
    if (visibleRect.width <= 0 || visibleRect.height <= 0) {
      return false;
    }
    final pageRect = layouts[currentPage - 1];
    return _halfPageTurnPolicy.canStayWithinPage(
      visibleTop: visibleRect.top,
      visibleHeight: visibleRect.height,
      pageTop: pageRect.top,
      pageBottom: pageRect.bottom,
      delta: delta,
    );
  }

  Future<bool> _goToRelativeHalfPage(int delta) async {
    if (!_pdfController.isReady || !_usesHalfPageTurnForRelativePage) {
      return false;
    }
    final visibleRect = _pdfController.visibleRect;
    final currentPage = _pdfController.pageNumber ?? _pageNumber ?? 1;
    final layouts = _pdfController.layout.pageLayouts;
    if (currentPage < 1 || currentPage > layouts.length) {
      return false;
    }
    if (visibleRect.width <= 0 || visibleRect.height <= 0) {
      return false;
    }
    final pageRect = layouts[currentPage - 1];
    final policy = _halfPageTurnPolicy;
    final targetTop = policy.targetTop(
      visibleTop: visibleRect.top,
      visibleHeight: visibleRect.height,
      delta: delta,
    );

    if (policy.canStayWithinPage(
      visibleTop: visibleRect.top,
      visibleHeight: visibleRect.height,
      pageTop: pageRect.top,
      pageBottom: pageRect.bottom,
      delta: delta,
    )) {
      await _pdfController.goToArea(
        rect: Rect.fromLTWH(
          visibleRect.left,
          targetTop,
          visibleRect.width,
          visibleRect.height,
        ),
        anchor: PdfPageAnchor.top,
        duration: _pageTurnDuration,
      );
      return true;
    }

    final boundaryTarget = score.pageSettings.nextVisiblePage(
      fromPage: currentPage,
      delta: delta,
      pageCount: _pdfController.pageCount,
    );
    if (boundaryTarget != null) {
      await _pdfController.goToPage(
        pageNumber: boundaryTarget,
        anchor: delta < 0 ? PdfPageAnchor.bottom : PdfPageAnchor.top,
        duration: _pageTurnDuration,
      );
      return true;
    }
    return false;
  }

  Future<void> _showAutoScroll() async {
    final pageCount = _pdfController.isReady
        ? _pdfController.pageCount
        : (_pageCount ?? 1);
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => _AutoScrollSheet(
        initialSettings: score.autoScrollSettings,
        rehearsalMarks: score.pageSettings.rehearsalMarks,
        metronomeBpm: _effectiveMetronomeSettings.bpm,
        currentPage: _pageNumber ?? score.lastPage,
        pageCount: pageCount,
        isAutoScrolling: _isAutoScrolling,
        isPaused: _isAutoScrollPaused,
        progress: _autoScrollProgress,
        onSettingsChanged: (settings) =>
            widget.controller.updateAutoScrollSettings(score, settings),
        onStart: _startAutoScroll,
        onPause: _pauseAutoScroll,
        onResume: _resumeAutoScroll,
        onStop: () => _stopAutoScroll(showMessage: true),
      ),
    );
    if (mounted) {
      _keyboardFocusNode.requestFocus();
    }
  }

  Future<void> _startAutoScroll(SheetAutoScrollSettings settings) async {
    if (!_pdfController.isReady) {
      _showSnackBar('PDF가 준비된 뒤 자동 스크롤을 시작할 수 있습니다.');
      return;
    }

    _autoScrollCueTimer?.cancel();
    _autoScrollCueTimer = null;
    await widget.controller.updateAutoScrollSettings(score, settings);
    final currentPage = _pageNumber ?? score.lastPage;
    final pageCount = _pdfController.pageCount;
    if (score.pageSettings.hasCustomPageOrder) {
      _showSnackBar('반복 페이지 순서가 있는 곡은 자동 스크롤 대신 페달/페이지 넘김을 사용해주세요.');
      return;
    }
    final plan = settings.plan(currentPage: currentPage, pageCount: pageCount);
    if (_displayMode != _SheetViewerDisplayMode.continuousVertical) {
      setState(() {
        _displayMode = _SheetViewerDisplayMode.continuousVertical;
        _useHalfPageTurn = false;
      });
      _pdfController.invalidate();
      _showSnackBar('자동 스크롤은 세로 스크롤 보기에서 실행합니다.');
      await Future<void>.delayed(const Duration(milliseconds: 16));
    }
    if (_isAnnotationMode) {
      setState(() {
        _isAnnotationMode = false;
        _draftAnnotationPageNumber = null;
        _draftAnnotationPoints = const <SheetAnnotationPoint>[];
      });
    }

    await _pdfController.goToPage(
      pageNumber: score.pageSettings.closestVisiblePage(
        fromPage: plan.startPage,
        pageCount: pageCount,
      ),
      anchor: PdfPageAnchor.top,
      duration: _pageTurnDuration,
    );

    if (settings.cueSeconds > 0) {
      _autoScrollTimer?.cancel();
      setState(() {
        _isAutoScrolling = false;
        _isAutoScrollPaused = false;
        _autoScrollStartedAt = null;
        _autoScrollPausedAt = null;
        _autoScrollPlan = plan;
        _autoScrollProgress = 0;
        _autoScrollConsumedPausePages = <int>{};
        _autoScrollConsumedCueKeys = <String>{};
        _autoScrollCueRemainingSeconds = settings.cueSeconds;
        _showPageControls = true;
      });
      _autoScrollCueTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
        if (!mounted) {
          timer.cancel();
          return;
        }
        final remaining = (_autoScrollCueRemainingSeconds ?? 0) - 1;
        if (remaining <= 0) {
          timer.cancel();
          _autoScrollCueTimer = null;
          _beginAutoScroll(plan);
          return;
        }
        setState(() {
          _autoScrollCueRemainingSeconds = remaining;
        });
      });
      _showSnackBar('자동 스크롤 ${settings.cueSeconds}초 후 시작합니다.');
      return;
    }

    _beginAutoScroll(plan);
  }

  void _maybeAutoStartScroll() {
    if (!widget.autoStartScroll || _didAutoStartScroll) {
      return;
    }
    _didAutoStartScroll = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        unawaited(_startAutoScroll(score.autoScrollSettings));
      }
    });
  }

  void _beginAutoScroll(SheetAutoScrollPlan plan) {
    _autoScrollTimer?.cancel();
    _autoScrollCueTimer?.cancel();
    _autoScrollCueTimer = null;
    setState(() {
      _isAutoScrolling = true;
      _isAutoScrollPaused = false;
      _autoScrollStartedAt = DateTime.now();
      _autoScrollPausedAt = null;
      _autoScrollPlan = plan;
      _autoScrollProgress = 0;
      _autoScrollConsumedPausePages = <int>{};
      _autoScrollConsumedCueKeys = <String>{};
      _autoScrollCueRemainingSeconds = null;
      _showPageControls = true;
    });
    _autoScrollTimer = Timer.periodic(
      sheetAutoScrollSmoothTickInterval,
      (_) => _tickAutoScroll(),
    );
    unawaited(_tickAutoScroll());
  }

  Future<void> _tickAutoScroll() async {
    if (!_isAutoScrolling || !_pdfController.isReady || !mounted) {
      return;
    }
    if (_isAutoScrollTicking) {
      return;
    }
    if (_isAutoScrollPaused) {
      return;
    }

    final plan = _autoScrollPlan;
    final startedAt = _autoScrollStartedAt;
    if (plan == null || startedAt == null) {
      _stopAutoScroll(showMessage: false);
      return;
    }

    final progress = plan.progressForElapsed(
      DateTime.now().difference(startedAt),
    );
    final pausePage = plan.pausePageForProgress(
      progress,
      consumedPageNumbers: _autoScrollConsumedPausePages,
    );
    if (pausePage != null) {
      setState(() {
        _autoScrollConsumedPausePages = <int>{
          ..._autoScrollConsumedPausePages,
          pausePage,
        };
        _autoScrollProgress = progress;
      });
      _pauseAutoScroll(message: '$pausePage쪽 pause marker에서 일시정지했습니다.');
      return;
    }
    final cuePoints = plan.cuePointsForProgress(
      progress,
      consumedCueKeys: _autoScrollConsumedCueKeys,
    );
    if (cuePoints.isNotEmpty) {
      setState(() {
        _autoScrollConsumedCueKeys = <String>{
          ..._autoScrollConsumedCueKeys,
          for (final cue in cuePoints) cue.key,
        };
      });
      final latestCue = cuePoints.last;
      final label = latestCue.label.trim().isEmpty
          ? '${latestCue.pageNumber}쪽 cue'
          : latestCue.label.trim();
      _showSnackBar(
        latestCue.measureNumber > 0
            ? '$label · ${latestCue.measureNumber}마디'
            : label,
      );
    }

    final pageCount = _pdfController.pageCount;
    final layouts = _pdfController.layout.pageLayouts;
    if (layouts.isEmpty || pageCount < 1) {
      return;
    }
    final position = plan.positionForProgress(progress);
    final fromPage = score.pageSettings.closestVisiblePage(
      fromPage: position.fromPage,
      pageCount: pageCount,
    );
    final toPage = score.pageSettings.closestVisiblePage(
      fromPage: position.toPage,
      pageCount: pageCount,
    );
    final visibleRect = _pdfController.visibleRect;
    if (visibleRect.width <= 0 || visibleRect.height <= 0) {
      return;
    }
    final fromIndex = (fromPage - 1).clamp(0, layouts.length - 1).toInt();
    final toIndex = (toPage - 1).clamp(0, layouts.length - 1).toInt();
    final fromRect = layouts[fromIndex];
    final toRect = layouts[toIndex];
    final fromTop = _autoScrollPageTop(
      fromRect,
      visibleRect.height,
      isEndPage: position.fromPage == plan.endPage,
    );
    final toTop = _autoScrollPageTop(
      toRect,
      visibleRect.height,
      isEndPage: toPage == plan.endPage,
    );
    final targetTop = fromTop + ((toTop - fromTop) * position.segmentProgress);

    _isAutoScrollTicking = true;
    try {
      await _pdfController.goToArea(
        rect: Rect.fromLTWH(
          visibleRect.left,
          targetTop,
          visibleRect.width,
          visibleRect.height,
        ),
        anchor: PdfPageAnchor.top,
        duration: sheetAutoScrollViewportMoveDuration,
      );
      await WidgetsBinding.instance.endOfFrame;
    } finally {
      _isAutoScrollTicking = false;
    }

    if (mounted) {
      setState(() {
        _autoScrollProgress = progress;
      });
    }
    if (progress >= 1) {
      final shouldAdvanceSetlist = _shouldAutoAdvanceSetlist(1);
      _stopAutoScroll(showMessage: !shouldAdvanceSetlist, completed: true);
      if (shouldAdvanceSetlist) {
        _showSnackBar('자동 스크롤이 끝나 다음 곡으로 이동합니다.');
        await Future<void>.delayed(const Duration(milliseconds: 250));
        if (mounted) {
          await _goToAdjacentSetlistScore(1, autoStartScroll: true);
        }
      }
    }
  }

  double _autoScrollPageTop(
    Rect pageRect,
    double visibleHeight, {
    required bool isEndPage,
  }) {
    if (!isEndPage) {
      return pageRect.top;
    }
    return math.max(pageRect.top, pageRect.bottom - visibleHeight);
  }

  void _pauseAutoScroll({String? message}) {
    if (!_isAutoScrolling || _isAutoScrollPaused) {
      return;
    }
    _autoScrollTimer?.cancel();
    _autoScrollTimer = null;
    setState(() {
      _isAutoScrollPaused = true;
      _autoScrollPausedAt = DateTime.now();
    });
    _showSnackBar(message ?? '자동 스크롤을 일시정지했습니다.');
  }

  void _resumeAutoScroll() {
    if (!_isAutoScrolling || !_isAutoScrollPaused) {
      return;
    }
    final startedAt = _autoScrollStartedAt;
    final pausedAt = _autoScrollPausedAt;
    if (startedAt != null && pausedAt != null) {
      _autoScrollStartedAt = startedAt.add(DateTime.now().difference(pausedAt));
    }
    setState(() {
      _isAutoScrollPaused = false;
      _autoScrollPausedAt = null;
    });
    _autoScrollTimer?.cancel();
    _autoScrollTimer = Timer.periodic(
      sheetAutoScrollSmoothTickInterval,
      (_) => _tickAutoScroll(),
    );
    unawaited(_tickAutoScroll());
    _showSnackBar('자동 스크롤을 재개했습니다.');
  }

  void _stopAutoScroll({required bool showMessage, bool completed = false}) {
    if (!_isAutoScrolling &&
        _autoScrollTimer == null &&
        _autoScrollCueTimer == null) {
      return;
    }
    _autoScrollTimer?.cancel();
    _autoScrollTimer = null;
    _autoScrollCueTimer?.cancel();
    _autoScrollCueTimer = null;
    if (mounted) {
      setState(() {
        _isAutoScrolling = false;
        _isAutoScrollPaused = false;
        _autoScrollStartedAt = null;
        _autoScrollPausedAt = null;
        _autoScrollPlan = null;
        _autoScrollProgress = 0;
        _autoScrollConsumedPausePages = const <int>{};
        _autoScrollConsumedCueKeys = const <String>{};
        _autoScrollCueRemainingSeconds = null;
      });
    } else {
      _isAutoScrolling = false;
      _isAutoScrollPaused = false;
      _autoScrollStartedAt = null;
      _autoScrollPausedAt = null;
      _autoScrollPlan = null;
      _autoScrollProgress = 0;
      _autoScrollConsumedPausePages = const <int>{};
      _autoScrollConsumedCueKeys = const <String>{};
      _autoScrollCueRemainingSeconds = null;
    }
    if (showMessage) {
      _showSnackBar(completed ? '자동 스크롤이 끝났습니다.' : '자동 스크롤을 정지했습니다.');
    }
  }

  Future<void> _toggleCurrentBookmark() async {
    final currentScore = score;
    final pageNumber = _pageNumber ?? currentScore.lastPage;
    final wasBookmarked = widget.controller.isBookmarked(
      currentScore,
      pageNumber,
    );
    await widget.controller.toggleBookmark(currentScore, pageNumber);
    _showSnackBar(wasBookmarked ? '북마크를 해제했습니다.' : '북마크를 추가했습니다.');
  }

  Future<void> _showBookmarks() async {
    final currentScore = score;
    if (currentScore.bookmarks.isEmpty) {
      _showSnackBar('북마크가 없습니다.');
      return;
    }

    final selected = await showModalBottomSheet<_BookmarkListRequest>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: ListView.separated(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          itemBuilder: (context, index) {
            final bookmark = currentScore.bookmarks[index];
            return ListTile(
              leading: const Icon(Icons.bookmark),
              title: Text(bookmark.label),
              subtitle: Text(
                '${bookmark.pageNumber}쪽 · ${_formatShortDate(bookmark.createdAt)} 생성',
              ),
              trailing: Wrap(
                spacing: 0,
                children: [
                  IconButton(
                    tooltip: '이름 변경',
                    onPressed: () => Navigator.of(context).pop(
                      _BookmarkListRequest(
                        bookmark: bookmark,
                        action: _BookmarkListAction.rename,
                      ),
                    ),
                    icon: const Icon(Icons.edit_outlined),
                  ),
                  IconButton(
                    tooltip: '삭제',
                    onPressed: () => Navigator.of(context).pop(
                      _BookmarkListRequest(
                        bookmark: bookmark,
                        action: _BookmarkListAction.delete,
                      ),
                    ),
                    icon: const Icon(Icons.delete_outline),
                  ),
                ],
              ),
              onTap: () => Navigator.of(context).pop(
                _BookmarkListRequest(
                  bookmark: bookmark,
                  action: _BookmarkListAction.open,
                ),
              ),
            );
          },
          separatorBuilder: (context, index) => const Divider(height: 1),
          itemCount: currentScore.bookmarks.length,
        ),
      ),
    );
    if (selected == null) {
      return;
    }

    switch (selected.action) {
      case _BookmarkListAction.open:
        if (_pdfController.isReady) {
          await _pdfController.goToPage(
            pageNumber: selected.bookmark.pageNumber,
            duration: _pageTurnDuration,
          );
        }
        return;
      case _BookmarkListAction.rename:
        if (!mounted) {
          return;
        }
        final label = await _showTextEntryDialog(
          context: context,
          title: '북마크 이름 변경',
          label: '이름',
          initialValue: selected.bookmark.label,
        );
        if (label == null) {
          return;
        }
        await widget.controller.renameBookmark(
          currentScore,
          selected.bookmark,
          label,
        );
        return;
      case _BookmarkListAction.delete:
        await widget.controller.deleteBookmark(currentScore, selected.bookmark);
        _showSnackBar('북마크를 삭제했습니다.');
        return;
    }
  }

  Future<void> _showScoreParts() async {
    final currentScore = score;
    final selected = await showModalBottomSheet<_LinkedFileAction>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            ListTile(
              leading: const Icon(Icons.description_outlined),
              title: Text(currentScore.title),
              subtitle: Text(
                '현재 열려 있는 악보 · ${File(currentScore.filePath).existsSync() ? '파일 확인됨' : '파일 없음'}',
              ),
            ),
            const ListTile(
              leading: Icon(Icons.info_outline),
              title: Text('파트/버전은 앱 안 정보로 관리됩니다'),
              subtitle: Text('원본 PDF를 수정하지 않고 현재 파일과 연결 파일만 전환합니다.'),
            ),
            for (final linkedFile in currentScore.linkedFiles)
              Builder(
                builder: (context) {
                  final exists = File(linkedFile.path).existsSync();
                  final isImage = _isSupportedLinkedImage(linkedFile);
                  final isAudio = _isSupportedLinkedAudio(linkedFile);
                  final canOpen =
                      exists &&
                      (linkedFile.type == 'pdf' || isImage || isAudio);
                  return ListTile(
                    leading: Icon(
                      !exists
                          ? Icons.error_outline
                          : isImage
                          ? Icons.image_outlined
                          : isAudio
                          ? Icons.audiotrack
                          : Icons.library_music_outlined,
                    ),
                    title: Text(linkedFile.label),
                    subtitle: Text(
                      '${_linkedFileRoleLabel(linkedFile.role)} · '
                      '${exists ? '파일 확인됨' : '파일 없음'} · '
                      '${linkedFile.path}',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    trailing: Wrap(
                      spacing: 0,
                      children: [
                        IconButton(
                          tooltip: isImage
                              ? '이미지 보기'
                              : isAudio
                              ? '오디오 재생'
                              : '이 파일 열기',
                          onPressed: canOpen
                              ? () => Navigator.of(context).pop(
                                  _LinkedFileAction(
                                    type: _LinkedFileActionType.open,
                                    file: linkedFile,
                                  ),
                                )
                              : null,
                          icon: const Icon(Icons.open_in_new),
                        ),
                        PopupMenuButton<String>(
                          tooltip: '역할 변경',
                          icon: const Icon(Icons.badge_outlined),
                          onSelected: (role) => Navigator.of(context).pop(
                            _LinkedFileAction(
                              type: _LinkedFileActionType.updateRole,
                              file: linkedFile,
                              role: role,
                            ),
                          ),
                          itemBuilder: (context) => [
                            for (final role in _linkedFileRoles)
                              PopupMenuItem<String>(
                                value: role,
                                child: Text(_linkedFileRoleLabel(role)),
                              ),
                          ],
                        ),
                        IconButton(
                          tooltip: '연결 제거',
                          onPressed: () => Navigator.of(context).pop(
                            _LinkedFileAction(
                              type: _LinkedFileActionType.remove,
                              file: linkedFile,
                            ),
                          ),
                          icon: const Icon(Icons.link_off_outlined),
                        ),
                      ],
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
    if (selected == null) {
      return;
    }
    if (selected.type == _LinkedFileActionType.updateRole) {
      final didUpdate = await widget.controller.updateLinkedFile(
        currentScore,
        selected.file.copyWith(role: selected.role),
      );
      _showSnackBar(didUpdate ? '연결 파일 역할을 저장했습니다.' : '역할을 변경하지 못했습니다.');
      return;
    }
    if (selected.type == _LinkedFileActionType.remove) {
      final didRemove = await widget.controller.removeLinkedFile(
        currentScore,
        selected.file,
      );
      _showSnackBar(didRemove ? '연결 파일을 제거했습니다.' : '연결 파일을 제거하지 못했습니다.');
      return;
    }
    if (selected.type == _LinkedFileActionType.open) {
      if (_isSupportedLinkedImage(selected.file)) {
        await _showLinkedImageViewer(selected.file);
        return;
      }
      if (_isSupportedLinkedAudio(selected.file)) {
        await _showLinkedAudioPlayer(selected.file);
        return;
      }
      final didSwitch = await widget.controller.switchToLinkedFile(
        currentScore,
        selected.file,
      );
      if (!mounted) {
        return;
      }
      if (!didSwitch) {
        _showSnackBar('파트/버전을 전환하지 않았습니다.');
        return;
      }
      await Navigator.of(context).pushReplacement<void, void>(
        MaterialPageRoute<void>(
          builder: (context) => SheetViewerScreen(
            controller: widget.controller,
            scoreId: currentScore.id,
            setlistId: widget.setlistId,
          ),
        ),
      );
    }
  }

  Future<void> _showLinkedAudioPlayer(SheetLinkedFile linkedFile) async {
    final audioFile = File(linkedFile.path);
    if (!await audioFile.exists()) {
      _showSnackBar('오디오 파일을 찾지 못했습니다.');
      return;
    }
    if (!mounted) {
      return;
    }
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => _LinkedAudioPlayerSheet(linkedFile: linkedFile),
    );
  }

  Future<void> _showLinkedImageViewer(SheetLinkedFile linkedFile) async {
    final imageFile = File(linkedFile.path);
    if (!await imageFile.exists()) {
      _showSnackBar('이미지 파일을 찾지 못했습니다.');
      return;
    }
    if (!mounted) {
      return;
    }
    await showDialog<void>(
      context: context,
      builder: (context) => Dialog.fullscreen(
        child: Scaffold(
          backgroundColor: Colors.black,
          appBar: AppBar(
            foregroundColor: Colors.white,
            backgroundColor: Colors.black,
            title: Text(
              linkedFile.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            actions: [
              IconButton(
                tooltip: '닫기',
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.close),
              ),
            ],
          ),
          body: SafeArea(
            child: Center(
              child: InteractiveViewer(
                minScale: 0.5,
                maxScale: 6,
                child: Image.file(
                  imageFile,
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) => const Padding(
                    padding: EdgeInsets.all(24),
                    child: Text(
                      '이미지를 표시하지 못했습니다.',
                      style: TextStyle(color: Colors.white),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
    if (mounted) {
      _keyboardFocusNode.requestFocus();
    }
  }

  Future<void> _showScoreNotes() async {
    final notes = await showModalBottomSheet<SheetScoreNotes>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) =>
          _ScoreNotesSheet(initialNotes: score.structuredNotes),
    );
    if (notes == null) {
      return;
    }
    await widget.controller.updateStructuredNotes(score, notes);
    _showSnackBar('악보 메모를 저장했습니다.');
  }

  Future<void> _editCurrentScoreMetadata() async {
    final result = await _showScoreMetadataDialog(
      context: context,
      score: score,
      onAddLinkedFile: widget.controller.pickLinkedFile,
    );
    if (result == null || !mounted) {
      return;
    }
    await widget.controller.updateScoreMetadata(
      score,
      title: result.title,
      composer: result.composer,
      tags: result.tags,
      note: result.note,
      collection: result.collection,
      group: result.group,
      rating: result.rating,
      linkedFiles: result.linkedFiles,
      customFields: result.customFields,
    );
    _showSnackBar('악보 정보를 저장했습니다.');
  }

  void _showImportedScoreNudge() {
    ScaffoldMessenger.of(context).showSnackBar(
      _buildImportedScoreNudgeSnackBar(
        title: score.title,
        onEdit: () => unawaited(_editCurrentScoreMetadata()),
      ),
    );
  }

  Future<void> _importPdfOutlineBookmarks() async {
    if (_pdfOutlineBookmarks.isEmpty) {
      _showSnackBar('가져올 PDF 목차/북마크가 없습니다.');
      return;
    }
    final didMerge = await widget.controller.mergeBookmarksFromOutline(
      score,
      _pdfOutlineBookmarks,
    );
    _showSnackBar(
      didMerge
          ? '${_pdfOutlineBookmarks.length}개 PDF 목차 후보를 북마크에 병합했습니다.'
          : '새로 병합할 PDF 목차 항목이 없습니다.',
    );
  }

  Future<void> _importCsvBookmarks() async {
    final pageCount = _pdfController.pageCount;
    if (pageCount <= 0) {
      _showSnackBar('PDF 페이지 수를 확인한 뒤 CSV 북마크를 가져올 수 있습니다.');
      return;
    }
    final addedCount = await widget.controller.importBookmarksFromCsv(
      score,
      pageCount: pageCount,
    );
    final errorMessage = widget.controller.errorMessage;
    if (errorMessage != null) {
      _showSnackBar(errorMessage);
      return;
    }
    _showSnackBar(
      addedCount > 0
          ? '$addedCount개 CSV 북마크를 추가했습니다.'
          : '새로 가져올 CSV 북마크가 없습니다.',
    );
  }

  Future<void> _selectDisplayMode() async {
    _stopAutoScroll(showMessage: false);
    final isCompactViewer = MediaQuery.sizeOf(context).width < 720;
    final selected = await showModalBottomSheet<_SheetViewerDisplayMode>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: _SheetViewerDisplayMode.values
              .map((mode) {
                final isDisabled =
                    isCompactViewer && mode == _SheetViewerDisplayMode.twoPage;
                return ListTile(
                  enabled: !isDisabled,
                  leading: Icon(mode.icon),
                  title: Text(mode.label),
                  subtitle: isDisabled ? const Text('좁은 화면에서는 비활성화') : null,
                  trailing: mode == _displayMode
                      ? const Icon(Icons.check)
                      : null,
                  onTap: isDisabled
                      ? null
                      : () => Navigator.of(context).pop(mode),
                );
              })
              .toList(growable: false),
        ),
      ),
    );
    if (selected == null || selected == _displayMode) {
      return;
    }

    setState(() {
      _displayMode = selected;
      if (_displayMode == _SheetViewerDisplayMode.twoPage) {
        _useHalfPageTurn = false;
      }
    });
    _resetCropFitPosition();
    await widget.controller.updateViewerSettings(
      score,
      score.viewerSettings.copyWith(
        displayMode: _displayMode.settingValue,
        halfPageTurn: _useHalfPageTurn,
      ),
    );
    _pdfController.invalidate();
    _scheduleCropToFit(_pageNumber ?? score.lastPage, force: true);
    _showPageControlsTemporarily();
  }

  Future<void> _selectDisplayEffect() async {
    final selected = await showModalBottomSheet<_SheetViewerDisplayEffect>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: _SheetViewerDisplayEffect.values
              .map(
                (effect) => ListTile(
                  leading: Icon(effect.icon),
                  title: Text(effect.label),
                  subtitle: effect == _SheetViewerDisplayEffect.inverted
                      ? const Text('PDF와 필기 overlay 색상을 함께 반전')
                      : null,
                  trailing: effect == _displayEffect
                      ? const Icon(Icons.check)
                      : null,
                  onTap: () => Navigator.of(context).pop(effect),
                ),
              )
              .toList(growable: false),
        ),
      ),
    );
    if (selected == null || selected == _displayEffect) {
      return;
    }

    setState(() {
      _displayEffect = selected;
    });
    await widget.controller.updateViewerSettings(
      score,
      score.viewerSettings.copyWith(displayEffect: selected.settingValue),
    );
    _showPageControlsTemporarily();
  }

  Future<void> _selectPageScale() async {
    final selected = await showModalBottomSheet<_SheetViewerPageScale>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: _SheetViewerPageScale.values
              .map(
                (scale) => ListTile(
                  leading: Icon(scale.icon),
                  title: Text(scale.label),
                  subtitle: switch (scale) {
                    _SheetViewerPageScale.fitPage => const Text(
                      '페이지 전체를 안정적으로 읽는 기본 보기',
                    ),
                    _SheetViewerPageScale.fitWidth => const Text(
                      '가로 여백을 줄여 세로 스크롤과 큰 화면에 맞춤',
                    ),
                    _SheetViewerPageScale.fullscreen => const Text(
                      '공연 중 화면 낭비를 줄이는 최소 여백 보기',
                    ),
                  },
                  trailing: scale == _pageScale
                      ? const Icon(Icons.check)
                      : null,
                  onTap: () => Navigator.of(context).pop(scale),
                ),
              )
              .toList(growable: false),
        ),
      ),
    );
    if (selected == null || selected == _pageScale) {
      return;
    }

    setState(() {
      _pageScale = selected;
    });
    await widget.controller.updateViewerSettings(
      score,
      score.viewerSettings.copyWith(pageScale: selected.settingValue),
    );
    _resetCropFitPosition();
    _pdfController.invalidate();
    _scheduleCropToFit(_pageNumber ?? score.lastPage, force: true);
    _showPageControlsTemporarily();
  }

  Future<void> _selectPedalMapping() async {
    final selected = await showModalBottomSheet<_SheetPedalMapping>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: _SheetPedalMapping.values
              .map(
                (mapping) => ListTile(
                  leading: Icon(mapping.icon),
                  title: Text(mapping.label),
                  subtitle: switch (mapping) {
                    _SheetPedalMapping.standard => const Text(
                      '오른쪽/아래/Enter 계열 입력을 다음 페이지로 사용',
                    ),
                    _SheetPedalMapping.reversed => const Text(
                      '페달 방향이 반대로 느껴질 때 이전/다음 동작을 교환',
                    ),
                    _SheetPedalMapping.setlistEdges => const Text(
                      '곡의 첫/마지막 페이지 경계에서 '
                      '세트리스트 이전/다음 곡으로 이동',
                    ),
                    _SheetPedalMapping.reversedSetlistEdges => const Text(
                      '반전 방향을 쓰면서 세트리스트 경계에서 곡 이동',
                    ),
                    _SheetPedalMapping.custom => const Text(
                      '키/페달 입력별 동작을 직접 선택',
                    ),
                  },
                  trailing: mapping == _pedalMapping
                      ? const Icon(Icons.check)
                      : null,
                  onTap: () => Navigator.of(context).pop(mapping),
                ),
              )
              .toList(growable: false),
        ),
      ),
    );
    if (selected == null) {
      return;
    }
    if (selected == _pedalMapping) {
      if (selected == _SheetPedalMapping.custom) {
        await _showCustomPedalMapping();
      }
      return;
    }

    setState(() {
      _pedalMapping = selected;
    });
    await widget.controller.updateViewerSettings(
      score,
      score.viewerSettings.copyWith(pedalMapping: selected.settingValue),
    );
    if (selected == _SheetPedalMapping.custom) {
      await _showCustomPedalMapping();
    }
    _showPageControlsTemporarily();
  }

  Future<void> _showCustomPedalMapping() async {
    var mapping = Map<String, String>.of(
      score.viewerSettings.customPedalMapping,
    );
    final recentUnknownInputIds = sheetViewerRecentCustomInputIds(
      _inputDiagnosticLog,
    );
    final recentEntriesByInputId = <String, SheetViewerInputDiagnosticEntry>{
      for (final entry in _inputDiagnosticLog.reversed) entry.inputId: entry,
    };
    final updated = await showModalBottomSheet<Map<String, String>>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          Widget mappingField(String inputId, {String? helperText}) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: DropdownButtonFormField<String>(
                initialValue:
                    mapping[inputId] ?? SheetViewerInputAction.none.value,
                decoration: InputDecoration(
                  labelText: _viewerInputLabel(inputId),
                  helperText: helperText,
                ),
                items: SheetViewerInputAction.values
                    .map(
                      (action) => DropdownMenuItem<String>(
                        value: action.value,
                        child: Text(_viewerInputActionLabel(action)),
                      ),
                    )
                    .toList(growable: false),
                onChanged: (value) {
                  if (value == null) {
                    return;
                  }
                  setModalState(() {
                    mapping = <String, String>{...mapping, inputId: value};
                  });
                },
              ),
            );
          }

          return SafeArea(
            child: Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                bottom: MediaQuery.viewInsetsOf(context).bottom + 24,
              ),
              child: ListView(
                shrinkWrap: true,
                children: [
                  Text(
                    '페달 직접 설정',
                    style: Theme.of(context).textTheme.titleLarge
                        ?.copyWith(fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 8),
                  const Text('연결된 페달이 보내는 키 입력별 동작을 선택합니다.'),
                  const SizedBox(height: 12),
                  if (recentUnknownInputIds.isNotEmpty) ...[
                    Text(
                      '최근 진단 입력',
                      style: Theme.of(context).textTheme.titleMedium
                          ?.copyWith(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 8),
                    for (final inputId in recentUnknownInputIds)
                      mappingField(
                        inputId,
                        helperText: () {
                          final entry = recentEntriesByInputId[inputId];
                          if (entry == null) {
                            return null;
                          }
                          return 'logical ${entry.logicalKeyLabel} · '
                              'physical ${entry.physicalKeyId}';
                        }(),
                      ),
                    const Divider(height: 24),
                  ],
                  for (final inputId in sheetViewerCustomInputIds)
                    mappingField(inputId),
                  Align(
                    alignment: Alignment.centerRight,
                    child: FilledButton.icon(
                      onPressed: () => Navigator.of(context).pop(mapping),
                      icon: const Icon(Icons.check),
                      label: const Text('저장'),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
    if (updated == null) {
      return;
    }
    await widget.controller.updateViewerSettings(
      score,
      score.viewerSettings.copyWith(
        pedalMapping: SheetViewerSettings.customPedalMappingType,
        customPedalMapping: Map<String, String>.unmodifiable(updated),
      ),
    );
    if (mounted) {
      setState(() => _pedalMapping = _SheetPedalMapping.custom);
    }
  }

  Future<void> _selectRenderProfile() async {
    final selected = await showModalBottomSheet<_SheetRenderProfile>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: _SheetRenderProfile.values
              .map(
                (profile) => ListTile(
                  leading: Icon(profile.icon),
                  title: Text(profile.label),
                  subtitle: switch (profile) {
                    _SheetRenderProfile.balanced => const Text(
                      '일반 악보에 맞춘 기본 렌더링 캐시 사용',
                    ),
                    _SheetRenderProfile.largePdf => const Text(
                      '큰 PDF에서 메모리 캐시를 줄이고 progressive rendering 사용',
                    ),
                  },
                  trailing: profile == _renderProfile
                      ? const Icon(Icons.check)
                      : null,
                  onTap: () => Navigator.of(context).pop(profile),
                ),
              )
              .toList(growable: false),
        ),
      ),
    );
    if (selected == null || selected == _renderProfile) {
      return;
    }

    setState(() {
      _renderProfile = selected;
    });
    await widget.controller.updateViewerSettings(
      score,
      score.viewerSettings.copyWith(renderProfile: selected.settingValue),
    );
    _pdfController.invalidate();
    _showPageControlsTemporarily();
  }

  Future<void> _selectPageTurnAnimation() async {
    final selected = await showModalBottomSheet<_SheetPageTurnAnimation>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: _SheetPageTurnAnimation.values
              .map(
                (animation) => ListTile(
                  leading: Icon(animation.icon),
                  title: Text(animation.label),
                  subtitle: switch (animation) {
                    _SheetPageTurnAnimation.none => const Text(
                      '페달 반복 입력과 대형 PDF에서 가장 즉각적으로 이동',
                    ),
                    _SheetPageTurnAnimation.fast => const Text(
                      '짧은 이동감만 주는 공연 친화 설정',
                    ),
                    _SheetPageTurnAnimation.natural => const Text(
                      '기본 PDF viewer 이동감 유지',
                    ),
                  },
                  trailing: animation == _pageTurnAnimation
                      ? const Icon(Icons.check)
                      : null,
                  onTap: () => Navigator.of(context).pop(animation),
                ),
              )
              .toList(growable: false),
        ),
      ),
    );
    if (selected == null || selected == _pageTurnAnimation) {
      return;
    }

    setState(() {
      _pageTurnAnimation = selected;
    });
    await widget.controller.updateViewerSettings(
      score,
      score.viewerSettings.copyWith(pageTurnAnimation: selected.settingValue),
    );
    _showPageControlsTemporarily();
  }

  Future<void> _showPerformanceSettings() async {
    final selected = await showModalBottomSheet<SheetViewerSettings>(
      context: context,
      showDragHandle: true,
      builder: (context) => _PerformanceSettingsSheet(
        initialSettings: score.viewerSettings,
        presetTemplates: widget.controller.performancePresetTemplates,
        onSavePresetTemplate: (name, viewerSettings, deviceProfile) {
          return widget.controller.savePerformancePresetTemplate(
            name: name,
            viewerSettings: viewerSettings,
            deviceProfile: deviceProfile,
          );
        },
        onDeletePresetTemplate:
            widget.controller.deletePerformancePresetTemplate,
      ),
    );
    if (selected == null) {
      return;
    }
    await widget.controller.updateViewerSettings(score, selected);
    if (mounted) {
      setState(() {});
      _showPageControlsTemporarily();
    }
  }

  Future<void> _showPerformancePrepNoticeIfNeeded() async {
    if (!_effectiveViewerSettings.showPerformancePrepNotice || !mounted) {
      return;
    }
    var hideNextTime = false;
    final didContinue = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('공연 모드 준비'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                '기기 자동 잠금, 알림, 제스처 방해 설정을 공연 전에 확인해주세요. '
                'Clef는 공연 중 앱 UI를 단순화하고 시스템 바를 숨깁니다.',
              ),
              const SizedBox(height: 12),
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                value: hideNextTime,
                onChanged: (value) =>
                    setDialogState(() => hideNextTime = value ?? false),
                title: const Text('다시 보지 않기'),
                controlAffinity: ListTileControlAffinity.leading,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('취소'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('시작'),
            ),
          ],
        ),
      ),
    );
    if (hideNextTime) {
      await widget.controller.updateViewerSettings(
        score,
        score.viewerSettings.copyWith(showPerformancePrepNotice: false),
      );
    }
    if (didContinue != true) {
      throw const _PerformanceModeCanceled();
    }
  }

  Future<void> _setPerformanceMode(bool enabled) async {
    if (enabled == _isPerformanceMode) {
      return;
    }
    if (enabled) {
      try {
        await _showPerformancePrepNoticeIfNeeded();
      } on _PerformanceModeCanceled {
        return;
      }
      await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    } else {
      await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    }
    if (!mounted) {
      return;
    }
    setState(() {
      _isPerformanceMode = enabled;
      if (_isPerformanceMode) {
        if (!_effectiveViewerSettings.allowPerformanceAnnotations) {
          _isAnnotationMode = false;
          _draftAnnotationPageNumber = null;
          _draftAnnotationPoints = const <SheetAnnotationPoint>[];
        }
        if (!_effectiveViewerSettings.allowPerformancePdfLinks) {
          _showPdfLinks = false;
        }
      }
      _showPageControls = true;
    });
    if (enabled && _effectiveViewerSettings.keepAwakeInPerformance) {
      _showSnackBar('자동 잠금 방지는 기기 설정에서 함께 확인해주세요.');
    } else if (enabled) {
      _showSnackBar('공연 모드입니다. 페이지 넘김과 허용된 quick action만 유지됩니다.');
    }
    _schedulePageControlsAutoHide();
  }

  Future<void> _hideCurrentPage() async {
    if (!_pdfController.isReady) {
      return;
    }
    _stopAutoScroll(showMessage: false);

    final currentScore = score;
    final pageCount = _pdfController.pageCount;
    final pageNumber =
        _pdfController.pageNumber ?? _pageNumber ?? currentScore.lastPage;
    final nextPageSettings = currentScore.pageSettings.hidePage(
      pageNumber,
      pageCount,
    );
    if (identical(nextPageSettings, currentScore.pageSettings)) {
      _showSnackBar('모든 페이지를 숨길 수는 없습니다.');
      return;
    }

    final nextVisiblePage = nextPageSettings.closestVisiblePage(
      fromPage: pageNumber,
      pageCount: pageCount,
    );
    final didHide = await widget.controller.hidePage(
      currentScore,
      pageNumber: pageNumber,
      pageCount: pageCount,
    );
    if (!didHide || !_pdfController.isReady) {
      return;
    }

    await _pdfController.goToPage(
      pageNumber: nextVisiblePage,
      duration: _pageTurnDuration,
    );
    _showSnackBar('$pageNumber쪽을 숨겼습니다.');
  }

  Future<void> _showHiddenPages() async {
    final currentScore = score;
    if (currentScore.pageSettings.hiddenPages.isEmpty) {
      _showSnackBar('숨긴 페이지가 없습니다.');
      return;
    }

    final selectedPage = await showModalBottomSheet<int>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: ListView.separated(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          itemBuilder: (context, index) {
            final pageNumber = currentScore.pageSettings.hiddenPages[index];
            final rotation =
                currentScore.pageSettings.pageRotations[pageNumber];
            return ListTile(
              leading: const Icon(Icons.visibility_off_outlined),
              title: Text('$pageNumber쪽'),
              subtitle: rotation == null ? null : Text('회전값 $rotation도'),
              trailing: IconButton(
                tooltip: '숨김 해제',
                onPressed: () => Navigator.of(context).pop(pageNumber),
                icon: const Icon(Icons.visibility_outlined),
              ),
              onTap: () => Navigator.of(context).pop(pageNumber),
            );
          },
          separatorBuilder: (context, index) => const Divider(height: 1),
          itemCount: currentScore.pageSettings.hiddenPages.length,
        ),
      ),
    );
    if (selectedPage == null) {
      return;
    }

    await widget.controller.unhidePage(currentScore, selectedPage);
    if (_pdfController.isReady) {
      await _pdfController.goToPage(
        pageNumber: selectedPage,
        duration: _pageTurnDuration,
      );
    }
    _showSnackBar('$selectedPage쪽 숨김을 해제했습니다.');
  }

  Future<void> _showPageOrder() async {
    if (_isPerformanceMode) {
      _showSnackBar('공연 모드에서는 페이지 정리 기능을 숨깁니다.');
      return;
    }
    final pageCount = _pdfController.isReady
        ? _pdfController.pageCount
        : _pageCount;
    if (pageCount == null || pageCount < 1) {
      _showSnackBar('PDF가 준비된 뒤 페이지 순서를 편집할 수 있습니다.');
      return;
    }

    final currentScore = score;
    final order = currentScore.pageSettings.effectivePageOrder(pageCount);
    final request = await showModalBottomSheet<_PageOrderRequest>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: ListView.separated(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          itemBuilder: (context, index) {
            if (index == 0) {
              return ListTile(
                leading: const Icon(Icons.restart_alt),
                title: const Text('기본 페이지 순서로 되돌리기'),
                subtitle: currentScore.pageSettings.hasCustomPageOrder
                    ? Text('${order.length}개 표시 항목')
                    : const Text('현재 기본 순서'),
                onTap: currentScore.pageSettings.hasCustomPageOrder
                    ? () => Navigator.of(context).pop(
                        const _PageOrderRequest(action: _PageOrderAction.reset),
                      )
                    : null,
              );
            }
            final orderIndex = index - 1;
            final pageNumber = order[orderIndex];
            final isHidden = currentScore.pageSettings.isHidden(pageNumber);
            return ListTile(
              leading: CircleAvatar(child: Text('${orderIndex + 1}')),
              title: Text('원본 $pageNumber쪽'),
              subtitle: isHidden ? const Text('숨김 페이지') : null,
              trailing: Wrap(
                spacing: 0,
                children: [
                  IconButton(
                    tooltip: '위로',
                    onPressed: orderIndex == 0
                        ? null
                        : () => Navigator.of(context).pop(
                            _PageOrderRequest(
                              action: _PageOrderAction.moveUp,
                              index: orderIndex,
                            ),
                          ),
                    icon: const Icon(Icons.arrow_upward),
                  ),
                  IconButton(
                    tooltip: '아래로',
                    onPressed: orderIndex == order.length - 1
                        ? null
                        : () => Navigator.of(context).pop(
                            _PageOrderRequest(
                              action: _PageOrderAction.moveDown,
                              index: orderIndex,
                            ),
                          ),
                    icon: const Icon(Icons.arrow_downward),
                  ),
                  IconButton(
                    tooltip: '복제',
                    onPressed: () => Navigator.of(context).pop(
                      _PageOrderRequest(
                        action: _PageOrderAction.duplicate,
                        index: orderIndex,
                      ),
                    ),
                    icon: const Icon(Icons.content_copy),
                  ),
                ],
              ),
            );
          },
          separatorBuilder: (context, index) => const Divider(height: 1),
          itemCount: order.length + 1,
        ),
      ),
    );
    if (request == null) {
      return;
    }

    late final bool didUpdate;
    switch (request.action) {
      case _PageOrderAction.reset:
        didUpdate = await widget.controller.resetPageOrder(currentScore);
        break;
      case _PageOrderAction.moveUp:
        didUpdate = await widget.controller.movePageInOrder(
          currentScore,
          fromIndex: request.index ?? -1,
          toIndex: (request.index ?? 0) - 1,
          pageCount: pageCount,
        );
        break;
      case _PageOrderAction.moveDown:
        didUpdate = await widget.controller.movePageInOrder(
          currentScore,
          fromIndex: request.index ?? -1,
          toIndex: (request.index ?? 0) + 1,
          pageCount: pageCount,
        );
        break;
      case _PageOrderAction.duplicate:
        didUpdate = await widget.controller.duplicatePageInOrder(
          currentScore,
          pageNumber: request.index == null ? 0 : order[request.index!],
          orderIndex: request.index,
          pageCount: pageCount,
        );
        break;
    }
    if (!didUpdate) {
      _showSnackBar('페이지 순서를 변경하지 않았습니다.');
      return;
    }
    _pageOrderCursor = null;
    _showSnackBar(
      request.action == _PageOrderAction.reset
          ? '페이지 순서를 기본값으로 되돌렸습니다.'
          : '페이지 순서를 저장했습니다.',
    );
  }

  Future<void> _showJumpPoints() async {
    if (_isPerformanceMode) {
      _showSnackBar('공연 모드에서는 페이지 정리 기능을 숨깁니다.');
      return;
    }
    final pageCount = _pdfController.isReady
        ? _pdfController.pageCount
        : _pageCount;
    if (pageCount == null || pageCount < 1) {
      _showSnackBar('PDF가 준비된 뒤 점프 포인트를 편집할 수 있습니다.');
      return;
    }

    final currentScore = score;
    final request = await showModalBottomSheet<_JumpPointRequest>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: ListView.separated(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          itemBuilder: (context, index) {
            if (index == 0) {
              final currentPage =
                  _pdfController.pageNumber ??
                  _pageNumber ??
                  currentScore.lastPage;
              return ListTile(
                leading: const Icon(Icons.add_link),
                title: Text('현재 $currentPage쪽에서 점프 추가'),
                subtitle: const Text('반복 연주, D.S./Coda 이동에 사용'),
                onTap: () => Navigator.of(context)
                    .pop(const _JumpPointRequest(action: _JumpPointAction.add)),
              );
            }
            final jumpPoint = currentScore.pageSettings.jumpPoints[index - 1];
            final includesHiddenPage =
                currentScore.pageSettings.isHidden(jumpPoint.sourcePage) ||
                currentScore.pageSettings.isHidden(jumpPoint.targetPage);
            return ListTile(
              enabled: !includesHiddenPage,
              leading: const Icon(Icons.keyboard_tab),
              title: Text(jumpPoint.label),
              subtitle: Text(
                includesHiddenPage
                    ? '${jumpPoint.sourcePage}쪽 → ${jumpPoint.targetPage}쪽 · 숨김 페이지 포함'
                    : '${jumpPoint.sourcePage}쪽 → ${jumpPoint.targetPage}쪽',
              ),
              onTap: includesHiddenPage
                  ? null
                  : () => Navigator.of(context).pop(
                      _JumpPointRequest(
                        action: _JumpPointAction.open,
                        jumpPoint: jumpPoint,
                      ),
                    ),
              trailing: Wrap(
                spacing: 0,
                children: [
                  IconButton(
                    tooltip: '이름 수정',
                    onPressed: () => Navigator.of(context).pop(
                      _JumpPointRequest(
                        action: _JumpPointAction.rename,
                        jumpPoint: jumpPoint,
                      ),
                    ),
                    icon: const Icon(Icons.edit_outlined),
                  ),
                  IconButton(
                    tooltip: '삭제',
                    onPressed: () => Navigator.of(context).pop(
                      _JumpPointRequest(
                        action: _JumpPointAction.delete,
                        jumpPoint: jumpPoint,
                      ),
                    ),
                    icon: const Icon(Icons.delete_outline),
                  ),
                ],
              ),
            );
          },
          separatorBuilder: (context, index) => const Divider(height: 1),
          itemCount: currentScore.pageSettings.jumpPoints.length + 1,
        ),
      ),
    );
    if (request == null) {
      return;
    }

    switch (request.action) {
      case _JumpPointAction.add:
        await _createJumpPointFromCurrentPage(pageCount);
        return;
      case _JumpPointAction.open:
        final jumpPoint = request.jumpPoint;
        if (jumpPoint != null) {
          await _goToJumpPoint(jumpPoint);
        }
        return;
      case _JumpPointAction.rename:
        final jumpPoint = request.jumpPoint;
        if (jumpPoint == null || !mounted) {
          return;
        }
        final label = await _showTextEntryDialog(
          context: context,
          title: '점프 포인트 이름',
          label: '이름',
          initialValue: jumpPoint.label,
        );
        if (label == null) {
          return;
        }
        final didUpdate = await widget.controller.updatePageJumpPoint(
          currentScore,
          pageCount: pageCount,
          jumpPoint: jumpPoint.copyWith(label: label),
        );
        _showSnackBar(didUpdate ? '점프 포인트 이름을 수정했습니다.' : '점프 포인트를 수정하지 못했습니다.');
        return;
      case _JumpPointAction.delete:
        final jumpPoint = request.jumpPoint;
        if (jumpPoint == null) {
          return;
        }
        final didRemove = await widget.controller.removePageJumpPoint(
          currentScore,
          jumpPoint.id,
        );
        final message = didRemove ? '점프 포인트를 삭제했습니다.' : '삭제할 점프 포인트가 없습니다.';
        _showSnackBar(message);
        return;
    }
  }

  Future<void> _createJumpPointFromCurrentPage(int pageCount) async {
    final currentScore = score;
    final sourcePage =
        _pdfController.pageNumber ?? _pageNumber ?? currentScore.lastPage;
    final targetPages = currentScore.pageSettings
        .visiblePages(pageCount)
        .where((pageNumber) => pageNumber != sourcePage)
        .toList(growable: false);
    if (targetPages.isEmpty) {
      _showSnackBar('점프 포인트를 만들 페이지가 부족합니다.');
      return;
    }
    final targetPage = await showModalBottomSheet<int>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: ListView.separated(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          itemBuilder: (context, index) {
            final pageNumber = targetPages[index];
            return ListTile(
              leading: const Icon(Icons.flag_outlined),
              title: Text('$pageNumber쪽'),
              onTap: () => Navigator.of(context).pop(pageNumber),
            );
          },
          separatorBuilder: (context, index) => const Divider(height: 1),
          itemCount: targetPages.length,
        ),
      ),
    );
    if (targetPage == null) {
      return;
    }

    final now = DateTime.now();
    final didAdd = await widget.controller.addPageJumpPoint(
      currentScore,
      pageCount: pageCount,
      jumpPoint: SheetPageJumpPoint(
        id: '${now.microsecondsSinceEpoch}-jump-$sourcePage-$targetPage',
        sourcePage: sourcePage,
        targetPage: targetPage,
        label: '$targetPage쪽으로',
        createdAt: now,
      ),
    );
    _showSnackBar(
      didAdd ? '$sourcePage쪽에 점프 포인트를 추가했습니다.' : '점프 포인트를 추가하지 못했습니다.',
    );
  }

  Future<void> _goToJumpPoint(SheetPageJumpPoint jumpPoint) async {
    if (!_pdfController.isReady) {
      return;
    }
    _stopAutoScroll(showMessage: false);
    final pageCount = _pdfController.pageCount;
    final targetPage = score.pageSettings.closestVisiblePage(
      fromPage: jumpPoint.targetPage,
      pageCount: pageCount,
    );
    _syncPageOrderCursor(targetPage, pageCount);
    await _pdfController.goToPage(
      pageNumber: targetPage,
      duration: _pageTurnDuration,
    );
    _showPageControlsTemporarily();
  }

  Future<void> _goToSheetPage(int pageNumber) async {
    if (!_pdfController.isReady) {
      return;
    }
    _stopAutoScroll(showMessage: false);
    final pageCount = _pdfController.pageCount;
    final targetPage = score.pageSettings.closestVisiblePage(
      fromPage: pageNumber,
      pageCount: pageCount,
    );
    _syncPageOrderCursor(targetPage, pageCount);
    await _pdfController.goToPage(
      pageNumber: targetPage,
      duration: _pageTurnDuration,
    );
    _showPageControlsTemporarily();
  }

  Future<void> _showRehearsalMarks() async {
    final currentScore = score;
    final canEditMarks = !_isPerformanceMode;
    final pageCount = _pdfController.isReady
        ? _pdfController.pageCount
        : _pageCount;
    if (pageCount == null || pageCount < 1) {
      _showSnackBar('PDF가 준비된 뒤 리허설 마크를 편집할 수 있습니다.');
      return;
    }
    final selected = await showModalBottomSheet<_RehearsalMarkAction>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            if (canEditMarks)
              ListTile(
                leading: const Icon(Icons.add_location_alt_outlined),
                title: const Text('현재 페이지에 마크 추가'),
                onTap: () => Navigator.of(context).pop(
                  const _RehearsalMarkAction(
                    type: _RehearsalMarkActionType.add,
                  ),
                ),
              )
            else
              const ListTile(
                leading: Icon(Icons.lock_outline),
                title: Text('공연 모드에서는 이동만 허용됩니다'),
                subtitle: Text('마크 편집은 공연 모드를 끈 뒤 사용할 수 있습니다.'),
              ),
            for (final mark in currentScore.pageSettings.rehearsalMarks)
              ListTile(
                leading: const Icon(Icons.flag_outlined),
                title: Text(mark.label),
                subtitle: Text(
                  '${_rehearsalMarkKindLabel(mark.kind)} · ${mark.pageNumber}쪽',
                ),
                onTap: () => Navigator.of(context).pop(
                  _RehearsalMarkAction(
                    type: _RehearsalMarkActionType.jump,
                    mark: mark,
                  ),
                ),
                trailing: canEditMarks
                    ? Wrap(
                        spacing: 0,
                        children: [
                          IconButton(
                            tooltip: '마크 수정',
                            onPressed: () => Navigator.of(context).pop(
                              _RehearsalMarkAction(
                                type: _RehearsalMarkActionType.edit,
                                mark: mark,
                              ),
                            ),
                            icon: const Icon(Icons.edit_outlined),
                          ),
                          IconButton(
                            tooltip: '마크 삭제',
                            onPressed: () => Navigator.of(context).pop(
                              _RehearsalMarkAction(
                                type: _RehearsalMarkActionType.remove,
                                mark: mark,
                              ),
                            ),
                            icon: const Icon(Icons.delete_outline),
                          ),
                        ],
                      )
                    : null,
              ),
          ],
        ),
      ),
    );
    if (selected?.type == _RehearsalMarkActionType.jump &&
        selected?.mark != null) {
      await _goToSheetPage(selected!.mark!.pageNumber);
      return;
    }
    if (selected?.type == _RehearsalMarkActionType.remove &&
        selected?.mark != null) {
      final didRemove = await widget.controller.removeRehearsalMark(
        currentScore,
        selected!.mark!.id,
      );
      _showSnackBar(didRemove ? '리허설 마크를 삭제했습니다.' : '삭제할 마크가 없습니다.');
      return;
    }
    if (selected?.type != _RehearsalMarkActionType.add &&
        selected?.type != _RehearsalMarkActionType.edit) {
      return;
    }
    if (!mounted) {
      return;
    }
    final existingMark = selected?.mark;
    final input = await _showRehearsalMarkDialog(
      context: context,
      pageNumber:
          existingMark?.pageNumber ??
          _pdfController.pageNumber ??
          _pageNumber ??
          currentScore.lastPage,
      pageCount: pageCount,
      initialLabel: existingMark?.label ?? 'A',
      initialKind: existingMark?.kind ?? SheetRehearsalMark.rehearsalKind,
    );
    if (input == null) {
      return;
    }
    final now = DateTime.now();
    final mark = SheetRehearsalMark(
      id:
          existingMark?.id ??
          '${now.microsecondsSinceEpoch}-mark-${input.pageNumber}',
      pageNumber: input.pageNumber,
      label: input.label.trim().isEmpty
          ? _rehearsalMarkKindLabel(input.kind)
          : input.label.trim(),
      kind: input.kind,
      createdAt: existingMark?.createdAt ?? now,
    );
    final didSave = existingMark == null
        ? await widget.controller.addRehearsalMark(
            currentScore,
            pageCount: pageCount,
            mark: mark,
          )
        : await widget.controller.updateRehearsalMark(
            currentScore,
            pageCount: pageCount,
            mark: mark,
          );
    _showSnackBar(didSave ? '리허설 마크를 저장했습니다.' : '리허설 마크를 저장하지 못했습니다.');
  }

  Future<({String label, String kind, int pageNumber})?>
  _showRehearsalMarkDialog({
    required BuildContext context,
    required int pageNumber,
    required int pageCount,
    required String initialLabel,
    required String initialKind,
  }) async {
    final labelController = TextEditingController(text: initialLabel);
    var selectedKind = initialKind;
    var selectedPage = pageNumber.clamp(1, pageCount).toInt();
    try {
      return await showDialog<({String label, String kind, int pageNumber})>(
        context: context,
        builder: (context) => StatefulBuilder(
          builder: (context, setDialogState) => AlertDialog(
            title: const Text('리허설 마크'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: labelController,
                  autofocus: true,
                  decoration: const InputDecoration(labelText: '표시 이름'),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: selectedKind,
                  decoration: const InputDecoration(labelText: '마크 종류'),
                  items:
                      const [
                            SheetRehearsalMark.rehearsalKind,
                            SheetRehearsalMark.dsKind,
                            SheetRehearsalMark.dcKind,
                            SheetRehearsalMark.codaKind,
                            SheetRehearsalMark.toCodaKind,
                            SheetRehearsalMark.segnoKind,
                          ]
                          .map(
                            (kind) => DropdownMenuItem<String>(
                              value: kind,
                              child: Text(_rehearsalMarkKindLabel(kind)),
                            ),
                          )
                          .toList(growable: false),
                  onChanged: (value) {
                    if (value != null) {
                      setDialogState(() {
                        selectedKind = value;
                      });
                    }
                  },
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<int>(
                  initialValue: selectedPage,
                  decoration: const InputDecoration(labelText: '페이지'),
                  items: [
                    for (var page = 1; page <= pageCount; page += 1)
                      DropdownMenuItem<int>(value: page, child: Text('$page쪽')),
                  ],
                  onChanged: (value) {
                    if (value != null) {
                      setDialogState(() {
                        selectedPage = value;
                      });
                    }
                  },
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('취소'),
              ),
              FilledButton(
                onPressed: () => Navigator.of(context).pop((
                  label: labelController.text,
                  kind: selectedKind,
                  pageNumber: selectedPage,
                )),
                child: const Text('저장'),
              ),
            ],
          ),
        ),
      );
    } finally {
      labelController.dispose();
    }
  }

  Future<void> _rotateCurrentPageMetadata() async {
    final currentScore = score;
    final pageNumber =
        _pdfController.pageNumber ?? _pageNumber ?? currentScore.lastPage;
    final orderIndex = _effectiveOrderIndexForPage(currentScore, pageNumber);
    final degrees = orderIndex == null
        ? await widget.controller.rotatePageClockwise(currentScore, pageNumber)
        : await widget.controller.rotatePageInstanceClockwise(
            currentScore,
            orderIndex: orderIndex,
            pageNumber: pageNumber,
            pageCount: _pdfController.pageCount,
          );
    if (!mounted) {
      return;
    }
    final label = degrees == 0 ? '기본 방향' : '$degrees도';
    final updatedScore = widget.controller.scoreById(currentScore.id);
    final hasPageRotations = updatedScore.pageSettings.pageRotations.isNotEmpty;
    final hasInstanceRotations =
        updatedScore.pageSettings.instanceRotations.isNotEmpty;
    final targetLabel = orderIndex == null
        ? '$pageNumber쪽'
        : '순서 ${orderIndex + 1}';
    _showSnackBar(
      '$targetLabel 회전값: $label',
      action: hasPageRotations || hasInstanceRotations
          ? SnackBarAction(
              label: '사본 생성',
              onPressed: () {
                unawaited(
                  hasInstanceRotations
                      ? _createPageArrangementAppliedCopy()
                      : _createPageRotationAppliedCopy(),
                );
              },
            )
          : null,
    );
  }

  Future<void> _createPageRotationAppliedCopy() async {
    if (_isPerformanceMode) {
      _showSnackBar('공연 모드에서는 페이지 정리 기능을 숨깁니다.');
      return;
    }
    final currentScore = score;
    if (currentScore.pageSettings.pageRotations.isEmpty) {
      _showSnackBar('적용할 페이지 회전값이 없습니다.');
      return;
    }
    if (currentScore.pageSettings.instanceRotations.isNotEmpty) {
      _showSnackBar('개별 회전값은 페이지 정리 적용 사본으로 재배치해주세요.');
      return;
    }
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('회전 적용 사본 생성'),
        content: const Text(
          '원본 PDF는 연결 파일로 보존하고, 저장한 회전값을 실제 페이지 회전으로 '
          '적용한 앱 내부 사본을 만듭니다.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('취소'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('생성'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) {
      return;
    }

    setState(() {
      _isApplyingPageTransform = true;
    });
    try {
      final result = await widget.controller.createPageRotationAppliedCopy(
        currentScore,
      );
      if (!mounted) {
        return;
      }
      if (!result.didWrite) {
        _showSnackBar('회전 적용 사본을 만들지 못했습니다. 원본 PDF는 그대로 유지됩니다.');
        return;
      }
      _pdfController.invalidate();
      _showSnackBar('${result.rotatedPageCount}쪽 회전을 적용한 사본으로 교체했습니다.');
    } catch (_) {
      if (mounted) {
        _showSnackBar('회전 적용 사본을 만들지 못했습니다. 원본 PDF는 그대로 유지됩니다.');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isApplyingPageTransform = false;
        });
        _keyboardFocusNode.requestFocus();
      }
    }
  }

  Future<void> _createPageCropAppliedCopy() async {
    if (_isPerformanceMode) {
      _showSnackBar('공연 모드에서는 페이지 정리 기능을 숨깁니다.');
      return;
    }
    final currentScore = score;
    if (!currentScore.pageSettings.crop.hasCrop &&
        currentScore.pageSettings.pageCrops.isEmpty) {
      _showSnackBar('적용할 자르기 설정이 없습니다.');
      return;
    }
    if (currentScore.pageSettings.instanceCrops.isNotEmpty) {
      _showSnackBar('개별 자르기 값은 페이지 정리 적용 사본으로 재배치해주세요.');
      return;
    }
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('자르기 적용 사본 생성'),
        content: const Text(
          '원본 PDF는 연결 파일로 보존하고, 저장한 자르기 값을 실제 PDF CropBox로 '
          '적용한 앱 내부 사본을 만듭니다.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('취소'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('생성'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) {
      return;
    }

    setState(() {
      _isApplyingPageTransform = true;
    });
    try {
      final result = await widget.controller.createPageCropAppliedCopy(
        currentScore,
      );
      if (!mounted) {
        return;
      }
      if (!result.didWrite) {
        _showSnackBar('자르기 적용 사본을 만들지 못했습니다. 원본 PDF는 그대로 유지됩니다.');
        return;
      }
      _resetCropFitPosition();
      _pdfController.invalidate();
      _showSnackBar('${result.croppedPageCount}쪽 자르기를 적용한 사본으로 교체했습니다.');
    } catch (_) {
      if (mounted) {
        _showSnackBar('자르기 적용 사본을 만들지 못했습니다. 원본 PDF는 그대로 유지됩니다.');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isApplyingPageTransform = false;
        });
        _keyboardFocusNode.requestFocus();
      }
    }
  }

  Future<void> _showCropSettings() async {
    if (_isPerformanceMode) {
      _showSnackBar('공연 모드에서는 페이지 정리 기능을 숨깁니다.');
      return;
    }
    final currentScore = score;
    final pageNumber =
        _pdfController.pageNumber ?? _pageNumber ?? currentScore.lastPage;
    final orderIndex = _effectiveOrderIndexForPage(currentScore, pageNumber);
    final initialCrop = orderIndex == null
        ? currentScore.pageSettings.crop
        : currentScore.pageSettings.cropForPage(
            pageNumber,
            orderIndex: orderIndex,
          );

    final selected = await showModalBottomSheet<SheetCropSettings>(
      context: context,
      showDragHandle: true,
      builder: (context) => _CropSettingsSheet(initialCrop: initialCrop),
    );
    if (selected == null) {
      return;
    }

    if (orderIndex == null) {
      await widget.controller.updatePageCrop(currentScore, selected);
    } else {
      await widget.controller.updatePageInstanceCrop(
        currentScore,
        orderIndex: orderIndex,
        pageCount: _pdfController.pageCount,
        crop: selected,
      );
    }
    _resetCropFitPosition();
    if (selected.hasCrop) {
      _scheduleCropToFit(pageNumber, orderIndex: orderIndex, force: true);
    } else if (_pdfController.isReady) {
      await _pdfController.goToPage(
        pageNumber: pageNumber,
        anchor: PdfPageAnchor.top,
        duration: const Duration(milliseconds: 120),
      );
    }
    final targetLabel = orderIndex == null ? '' : '순서 ${orderIndex + 1} ';
    _showSnackBar(
      selected.hasCrop
          ? '$targetLabel자르기 맞춤 설정을 저장했습니다.'
          : '$targetLabel자르기 맞춤을 해제했습니다.',
    );
  }

  Future<void> _showCropPresets() async {
    final currentScore = score;
    final selected = await showModalBottomSheet<_CropPresetAction>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            ListTile(
              leading: const Icon(Icons.add),
              title: const Text('현재 자르기 값을 프리셋으로 저장'),
              subtitle: Text(
                currentScore.pageSettings.crop.hasCrop
                    ? '현재 자르기 값 사용'
                    : '자르기 없음',
              ),
              onTap: () => Navigator.of(
                context,
              ).pop(const _CropPresetAction(type: _CropPresetActionType.add)),
            ),
            for (final preset in currentScore.pageSettings.cropPresets)
              ListTile(
                leading: const Icon(Icons.crop_outlined),
                title: Text(preset.label),
                subtitle: Text(
                  '${_cropPresetScopeLabel(preset.scope)} · '
                  '${_cropPresetSummary(preset.crop)}',
                ),
                onTap: () => Navigator.of(context).pop(
                  _CropPresetAction(
                    type: _CropPresetActionType.apply,
                    preset: preset,
                  ),
                ),
                trailing: IconButton(
                  tooltip: '프리셋 삭제',
                  onPressed: () => Navigator.of(context).pop(
                    _CropPresetAction(
                      type: _CropPresetActionType.remove,
                      preset: preset,
                    ),
                  ),
                  icon: const Icon(Icons.delete_outline),
                ),
              ),
          ],
        ),
      ),
    );
    if (selected?.type == _CropPresetActionType.apply &&
        selected?.preset != null) {
      final preset = selected!.preset!;
      final didApply = await widget.controller.applyCropPreset(
        currentScore,
        preset.id,
        pageCount: _pdfController.isReady
            ? _pdfController.pageCount
            : _pageCount,
      );
      if (didApply) {
        _resetCropFitPosition();
        _scheduleCropToFit(_pageNumber ?? currentScore.lastPage, force: true);
      }
      _showSnackBar(
        didApply
            ? '${_cropPresetScopeLabel(preset.scope)} 프리셋을 적용했습니다.'
            : '적용할 프리셋이 없습니다.',
      );
      return;
    }
    if (selected?.type == _CropPresetActionType.remove &&
        selected?.preset != null) {
      final preset = selected!.preset!;
      final didRemove = await widget.controller.removeCropPreset(
        currentScore,
        preset.id,
      );
      _showSnackBar(didRemove ? '자르기 프리셋을 삭제했습니다.' : '삭제할 프리셋이 없습니다.');
      return;
    }
    if (selected?.type != _CropPresetActionType.add) {
      return;
    }
    if (!mounted) {
      return;
    }
    final input = await _showCropPresetDialog(
      context: context,
      initialLabel: '공연용 자르기',
      initialScope: SheetCropPreset.allPagesScope,
    );
    if (input == null) {
      return;
    }
    final now = DateTime.now();
    final didAdd = await widget.controller.addCropPreset(
      currentScore,
      SheetCropPreset(
        id: '${now.microsecondsSinceEpoch}-crop',
        label: input.label,
        scope: input.scope,
        crop: currentScore.pageSettings.crop,
        alternateCrop: input.scope == SheetCropPreset.oddEvenScope
            ? SheetCropSettings.none
            : currentScore.pageSettings.crop,
        createdAt: now,
      ),
    );
    _showSnackBar(didAdd ? '자르기 프리셋을 저장했습니다.' : '자르기 프리셋을 저장하지 못했습니다.');
  }

  String _cropPresetSummary(SheetCropSettings crop) {
    if (!crop.hasCrop) {
      return '자르기 없음';
    }
    final normalized = crop.normalized();
    return 'L ${(normalized.left * 100).round()} · '
        'T ${(normalized.top * 100).round()} · '
        'R ${(normalized.right * 100).round()} · '
        'B ${(normalized.bottom * 100).round()}';
  }

  Future<({String label, String scope})?> _showCropPresetDialog({
    required BuildContext context,
    required String initialLabel,
    required String initialScope,
  }) async {
    final labelController = TextEditingController(text: initialLabel);
    var selectedScope = initialScope;
    try {
      return await showDialog<({String label, String scope})>(
        context: context,
        builder: (context) => StatefulBuilder(
          builder: (context, setDialogState) => AlertDialog(
            title: const Text('자르기 프리셋 저장'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: labelController,
                  autofocus: true,
                  decoration: const InputDecoration(labelText: '이름'),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: selectedScope,
                  decoration: const InputDecoration(labelText: '적용 범위'),
                  items:
                      const [
                            SheetCropPreset.allPagesScope,
                            SheetCropPreset.oddEvenScope,
                            SheetCropPreset.coverExcludedScope,
                          ]
                          .map(
                            (scope) => DropdownMenuItem<String>(
                              value: scope,
                              child: Text(_cropPresetScopeLabel(scope)),
                            ),
                          )
                          .toList(growable: false),
                  onChanged: (value) {
                    if (value != null) {
                      setDialogState(() {
                        selectedScope = value;
                      });
                    }
                  },
                ),
                const SizedBox(height: 8),
                const Text(
                  '기본 저장은 앱 안 표시 설정이며, 필요하면 원본 보존 사본에 PDF CropBox를 적용합니다.',
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('취소'),
              ),
              FilledButton(
                onPressed: () {
                  final label = labelController.text.trim();
                  Navigator.of(context).pop((
                    label: label.isEmpty ? '자르기 프리셋' : label,
                    scope: selectedScope,
                  ));
                },
                child: const Text('저장'),
              ),
            ],
          ),
        ),
      );
    } finally {
      labelController.dispose();
    }
  }

  Future<void> _showPageTemplates() async {
    final currentScore = score;
    final pageCount = _pdfController.isReady
        ? _pdfController.pageCount
        : _pageCount;
    if (pageCount == null || pageCount < 1) {
      _showSnackBar('PDF가 준비된 뒤 페이지 템플릿을 편집할 수 있습니다.');
      return;
    }
    final action = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            const ListTile(
              leading: Icon(Icons.info_outline),
              title: Text('페이지 템플릿 설정'),
              subtitle: Text('기본 저장은 앱 안 설정이며, 필요하면 PDF 사본에 적용합니다.'),
            ),
            ListTile(
              leading: const Icon(Icons.summarize_outlined),
              title: const Text('현재 페이지 정리 요약'),
              subtitle: Text(_pageTemplateSummary(currentScore, pageCount)),
            ),
            ListTile(
              leading: const Icon(Icons.note_add_outlined),
              title: const Text('현재 페이지 뒤 빈 페이지 추가'),
              onTap: () => Navigator.of(context).pop('blank'),
            ),
            ListTile(
              leading: const Icon(Icons.visibility_off_outlined),
              title: const Text('현재 숨김 상태를 프리셋으로 저장'),
              onTap: () => Navigator.of(context).pop('visibility'),
            ),
            ListTile(
              leading: const Icon(Icons.filter_1_outlined),
              title: const Text('표지 제외 프리셋 저장'),
              onTap: () => Navigator.of(context).pop('cover'),
            ),
            for (final preset in currentScore.pageSettings.visibilityPresets)
              ListTile(
                leading: const Icon(Icons.visibility_outlined),
                title: Text(preset.label),
                subtitle: Text('${preset.hiddenPages.length}쪽 숨김'),
                onTap: () => Navigator.of(context).pop('apply:${preset.id}'),
                trailing: IconButton(
                  tooltip: '프리셋 삭제',
                  onPressed: () =>
                      Navigator.of(context)
                          .pop('removeVisibility:${preset.id}'),
                  icon: const Icon(Icons.delete_outline),
                ),
              ),
            for (final insertion
                in currentScore.pageSettings.blankPageInsertions)
              ListTile(
                leading: const Icon(Icons.note_outlined),
                title: Text(insertion.label),
                subtitle: Text('${insertion.afterPage}쪽 뒤 빈 페이지'),
                trailing: IconButton(
                  tooltip: '빈 페이지 삭제',
                  onPressed: () =>
                      Navigator.of(context).pop('removeBlank:${insertion.id}'),
                  icon: const Icon(Icons.delete_outline),
                ),
              ),
          ],
        ),
      ),
    );
    if (action == null) {
      return;
    }
    final now = DateTime.now();
    if (action == 'blank') {
      final pageNumber =
          _pdfController.pageNumber ?? _pageNumber ?? currentScore.lastPage;
      final didAdd = await widget.controller.addBlankPageInsertion(
        currentScore,
        pageCount: pageCount,
        insertion: SheetBlankPageInsertion(
          id: '${now.microsecondsSinceEpoch}-blank',
          afterPage: pageNumber,
          label: '$pageNumber쪽 뒤 빈 페이지',
          createdAt: now,
        ),
      );
      _showSnackBar(didAdd ? '빈 페이지를 저장했습니다.' : '저장하지 못했습니다.');
      return;
    }
    if (action == 'visibility' || action == 'cover') {
      final hiddenPages = action == 'cover'
          ? const <int>[1]
          : currentScore.pageSettings.hiddenPages;
      final didAdd = await widget.controller.addVisibilityPreset(
        currentScore,
        pageCount: pageCount,
        preset: SheetPageVisibilityPreset(
          id: '${now.microsecondsSinceEpoch}-visibility',
          label: action == 'cover' ? '표지 제외' : '현재 숨김 상태',
          hiddenPages: hiddenPages,
          createdAt: now,
        ),
      );
      _showSnackBar(didAdd ? '숨김 프리셋을 저장했습니다.' : '저장하지 못했습니다.');
      return;
    }
    if (action.startsWith('apply:')) {
      final didApply = await widget.controller.applyVisibilityPreset(
        currentScore,
        presetId: action.substring('apply:'.length),
        pageCount: pageCount,
      );
      _showSnackBar(didApply ? '숨김 프리셋을 적용했습니다.' : '적용하지 못했습니다.');
      return;
    }
    if (action.startsWith('removeVisibility:')) {
      final didRemove = await widget.controller.removeVisibilityPreset(
        currentScore,
        action.substring('removeVisibility:'.length),
      );
      _showSnackBar(didRemove ? '숨김 프리셋을 삭제했습니다.' : '삭제할 프리셋이 없습니다.');
      return;
    }
    if (action.startsWith('removeBlank:')) {
      final didRemove = await widget.controller.removeBlankPageInsertion(
        currentScore,
        action.substring('removeBlank:'.length),
      );
      _showSnackBar(didRemove ? '빈 페이지를 삭제했습니다.' : '삭제할 항목이 없습니다.');
    }
  }

  Future<void> _createPageArrangementAppliedCopy() async {
    if (_isPerformanceMode) {
      _showSnackBar('공연 모드에서는 페이지 정리 기능을 숨깁니다.');
      return;
    }
    final currentScore = score;
    final settings = currentScore.pageSettings;
    if (settings.hiddenPages.isEmpty &&
        settings.pageOrder.isEmpty &&
        settings.blankPageInsertions.isEmpty) {
      _showSnackBar('적용할 페이지 정리 설정이 없습니다.');
      return;
    }
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('페이지 정리 적용 사본 생성'),
        content: const Text(
          '원본 PDF는 연결 파일로 보존하고, 숨김/순서/빈 페이지와 개별 '
          '자르기/회전 설정을 앱 내부 사본의 페이지 구조로 적용합니다.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('취소'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('생성'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) {
      return;
    }

    setState(() {
      _isApplyingPageTransform = true;
    });
    try {
      final result = await widget.controller.createPageArrangementAppliedCopy(
        currentScore,
      );
      if (!mounted) {
        return;
      }
      if (!result.didWrite) {
        _showSnackBar('페이지 정리 사본을 만들지 못했습니다. 원본 PDF는 그대로 유지됩니다.');
        return;
      }
      _pageOrderCursor = null;
      _pdfController.invalidate();
      _showSnackBar('${result.outputPageCount}쪽 페이지 정리 사본으로 교체했습니다.');
    } catch (_) {
      if (mounted) {
        _showSnackBar('페이지 정리 사본을 만들지 못했습니다. 원본 PDF는 그대로 유지됩니다.');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isApplyingPageTransform = false;
        });
        _keyboardFocusNode.requestFocus();
      }
    }
  }

  String _pageTemplateSummary(SheetScore score, int pageCount) {
    final settings = score.pageSettings;
    final parts = <String>[
      '숨김 ${settings.hiddenPages.length}쪽',
      '표시 순서 '
          '${settings.hasCustomPageOrder ? settings.effectivePageOrder(pageCount).length : pageCount}개',
      '반복/점프 ${settings.jumpPoints.length}개',
      '빈 페이지 ${settings.blankPageInsertions.length}개',
      '숨김 프리셋 ${settings.visibilityPresets.length}개',
    ];
    return parts.join(' · ');
  }

  Future<void> _sanitizePdfLinks() async {
    if (_isPerformanceMode) {
      _showSnackBar('공연 모드에서는 PDF 정리 기능을 숨깁니다.');
      return;
    }
    if (_isSanitizingPdfLinks) {
      return;
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('PDF 링크 제거 사본 만들기'),
        content: const Text(
          '외부 URL 링크 annotation만 제거한 앱 내부 사본을 만듭니다. 원본 PDF와 눈에 보이는 워터마크는 그대로 보존합니다.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('취소'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('사본 만들기'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) {
      return;
    }

    setState(() {
      _isSanitizingPdfLinks = true;
    });
    _showSnackBar('PDF 링크를 확인하는 중입니다.');
    final result = await widget.controller.createPdfLinkDisabledCopy(score);
    if (!mounted) {
      return;
    }
    setState(() {
      _isSanitizingPdfLinks = false;
    });

    if (result.failureReason != null) {
      _showSnackBar('PDF 링크 제거 사본을 만들지 못했습니다. 원본 PDF는 그대로 유지됩니다.');
      return;
    }
    if (!result.didWrite) {
      _showSnackBar('제거할 외부 URL 링크가 없습니다.');
      return;
    }

    if (result.removedAllUrlLinks) {
      _showSnackBar(
        '${result.removedUrlLinkCount}개 외부 URL 링크를 제거한 사본으로 교체했습니다. '
        '원본 PDF는 연결 파일로 보존됩니다.',
      );
    } else {
      _showSnackBar(
        '${result.removedUrlLinkCount}개 제거, '
        '${result.remainingUrlLinkCount}개 남았습니다. 원본 PDF는 보존됩니다.',
      );
    }
  }

  Future<void> _shareCurrentScorePdf() async {
    if (_isPerformanceMode) {
      _showSnackBar('공연 모드에서는 공유 기능을 숨깁니다.');
      return;
    }
    final currentScore = score;
    final candidate = await _selectViewerShareCandidate(currentScore);
    if (candidate == null || !mounted) {
      return;
    }
    final exists = await File(candidate.path).exists();
    if (!exists) {
      _showSnackBar(
        '공유할 파일을 찾지 못했습니다. '
        '다시 가져오거나 전체 백업을 복원해주세요.',
      );
      return;
    }

    try {
      await SharePlus.instance.share(
        ShareParams(
          subject: currentScore.title,
          files: [
            XFile(
              candidate.path,
              name: candidate.fileName,
              mimeType: candidate.mimeType,
            ),
          ],
        ),
      );
    } catch (_) {
      _showSnackBar('파일을 공유하지 못했습니다.');
    }
  }

  Future<void> _shareCurrentScoreAnnotatedPdf() async {
    if (_isPerformanceMode) {
      _showSnackBar('공연 모드에서는 공유 기능을 숨깁니다.');
      return;
    }

    final currentScore = score;
    final annotationSummary = currentScore.annotationLayer.summary(
      storageMode: currentScore.annotationStorage.mode,
      lastSaveStatus: currentScore.annotationStorage.lastSaveStatus,
      lastSaveError: currentScore.annotationStorage.lastSaveError,
    );
    final hasAnnotations = annotationSummary.hasAnnotations;
    if (!hasAnnotations) {
      _showSnackBar('필기/텍스트 주석이 없어 원본 PDF를 공유합니다.');
      await _shareCurrentScorePdf();
      return;
    }
    if (SheetAnnotatedPdfExporter.scoreContainsUnicodeTextAnnotations(
      currentScore,
    )) {
      _showSnackBar('한글 텍스트 주석은 PDF 사본에서 표시가 제한될 수 있습니다.');
    }
    if (annotationSummary.estimatedJsonBytes > 512 * 1024 ||
        annotationSummary.redoCount > 20) {
      _showSnackBar('${annotationSummary.compactLabel}를 사본에 포함합니다.');
    }

    _showSnackBar('필기 포함 PDF 사본을 만드는 중입니다.');
    final result = await widget.controller.createAnnotatedPdfCopy(currentScore);
    if (!mounted) {
      return;
    }
    if (!result.didWrite || result.outputPath == null) {
      if (result.requiresUnicodeFontEmbedding) {
        _showSnackBar('한글 텍스트 주석은 PDF 사본에 포함되지 않아 원본 PDF를 공유합니다.');
        await _shareCurrentScorePdf();
        return;
      }
      if (result.hasOnlyAnnotationsOutsideDocumentPages) {
        _showSnackBar('현재 PDF 페이지 범위 안에 내보낼 필기가 없습니다.');
        return;
      }
      _showSnackBar('필기 포함 PDF를 만들지 못했습니다. 원본 PDF와 앱 안 필기는 유지됩니다.');
      return;
    }
    if (result.skippedUnicodeTextCount > 0) {
      _showSnackBar(
        '${result.skippedUnicodeTextCount}개 한글 텍스트 주석은 PDF 사본에서 제외했습니다.',
      );
    }

    try {
      await SharePlus.instance.share(
        ShareParams(
          subject: currentScore.title,
          files: [
            XFile(
              result.outputPath!,
              name: SheetScoreSharePolicy.exportFileName(
                title: '${currentScore.title} annotated',
                composer: currentScore.composer,
              ),
              mimeType: 'application/pdf',
            ),
          ],
        ),
      );
    } catch (_) {
      _showSnackBar('필기 포함 PDF를 공유하지 못했습니다.');
    }
  }

  Future<SheetScoreShareCandidate?> _selectViewerShareCandidate(
    SheetScore currentScore,
  ) async {
    final candidates = widget.controller.shareCandidates(currentScore);
    if (candidates.length == 1) {
      return candidates.single;
    }
    return showModalBottomSheet<SheetScoreShareCandidate>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            for (final candidate in candidates)
              ListTile(
                leading: Icon(_shareCandidateIcon(candidate)),
                title: Text(candidate.label),
                subtitle: Text(candidate.fileName),
                onTap: () => Navigator.of(context).pop(candidate),
              ),
          ],
        ),
      ),
    );
  }

  void _toggleAnnotationMode() {
    if (_isPerformanceMode &&
        !_effectiveViewerSettings.allowPerformanceAnnotations) {
      _showSnackBar('공연 모드에서는 필기 도구를 숨깁니다.');
      return;
    }
    if (!_isAnnotationMode) {
      _stopAutoScroll(showMessage: false);
    }
    setState(() {
      _isAnnotationMode = !_isAnnotationMode;
      _draftAnnotationPageNumber = null;
      _draftAnnotationPoints = const <SheetAnnotationPoint>[];
      _showPageControls = !_isAnnotationMode;
    });
    if (_isAnnotationMode) {
      _showSnackBar('필기 모드입니다. PDF 이동은 잠시 잠깁니다.');
    }
  }

  Future<void> _undoCurrentPageAnnotation() async {
    final pageNumber =
        _pdfController.pageNumber ?? _pageNumber ?? score.lastPage;
    final didUndo = await _saveAnnotationChange(
      () => widget.controller.undoLastAnnotation(score, pageNumber),
    );
    _showSnackBar(didUndo ? '마지막 필기를 취소했습니다.' : '취소할 필기가 없습니다.');
  }

  Future<void> _redoCurrentPageAnnotation() async {
    final pageNumber =
        _pdfController.pageNumber ?? _pageNumber ?? score.lastPage;
    final didRedo = await _saveAnnotationChange(
      () => widget.controller.redoLastAnnotation(score, pageNumber),
    );
    _showSnackBar(didRedo ? '마지막 필기를 다시 적용했습니다.' : '다시 적용할 필기가 없습니다.');
  }

  Future<void> _toggleAnnotationLayerVisibility() async {
    final nextValue = !score.annotationLayer.isDefaultLayerVisible;
    await widget.controller.updateAnnotationLayerState(
      score,
      isVisible: nextValue,
    );
    if (!mounted) {
      return;
    }
    setState(() {});
    _showSnackBar(nextValue ? '필기 layer를 표시합니다.' : '필기 layer를 숨깁니다.');
  }

  Future<void> _toggleAnnotationLayerExport() async {
    final nextValue = !score.annotationLayer.includeDefaultLayerInExport;
    await widget.controller.updateAnnotationLayerState(
      score,
      includeInExport: nextValue,
    );
    if (!mounted) {
      return;
    }
    setState(() {});
    _showSnackBar(nextValue ? '필기를 PDF 공유에 포함합니다.' : '필기를 PDF 공유에서 제외합니다.');
  }

  void _saveFavoriteAnnotationPreset() {
    final preset = _AnnotationPreset(
      tool: _annotationTool,
      color: _annotationColor,
      width: _annotationWidth,
      stamp: _annotationStamp,
    );
    setState(() {
      _favoriteAnnotationPreset = preset;
    });
    unawaited(
      widget.controller.updateFavoriteAnnotationPreset(preset.toSettings()),
    );
    _showSnackBar('현재 필기 도구를 즐겨찾기로 저장했습니다.');
  }

  void _applyFavoriteAnnotationPreset() {
    final preset = _favoriteAnnotationPreset;
    if (preset == null) {
      _showSnackBar('저장된 즐겨찾기 필기 도구가 없습니다.');
      return;
    }
    setState(() {
      _annotationTool = preset.tool;
      _annotationColor = preset.color;
      _annotationWidth = preset.width;
      _annotationStamp = preset.stamp;
    });
    _showSnackBar('즐겨찾기 필기 도구를 적용했습니다.');
  }

  Future<void> _handleAnnotationPanStart(
    DragStartDetails details,
    SheetAnnotationPageGeometry geometry,
    int pageNumber,
    double pressure,
  ) async {
    final point = geometry.pointFromPageLocal(
      details.localPosition,
      pressure: pressure,
    );
    if (point == null) {
      return;
    }
    if (_annotationTool == _AnnotationToolbarTool.text ||
        _annotationTool == _AnnotationToolbarTool.stamp) {
      return;
    }
    if (_annotationTool == _AnnotationToolbarTool.eraser) {
      await _eraseAnnotationAt(point, geometry, pageNumber);
      return;
    }
    setState(() {
      _draftAnnotationPageNumber = pageNumber;
      _draftAnnotationPoints = <SheetAnnotationPoint>[point];
    });
  }

  Future<void> _handleAnnotationPanUpdate(
    DragUpdateDetails details,
    SheetAnnotationPageGeometry geometry,
    int pageNumber,
    double pressure,
  ) async {
    final point = geometry.pointFromPageLocal(
      details.localPosition,
      pressure: pressure,
    );
    if (point == null) {
      return;
    }
    if (_annotationTool == _AnnotationToolbarTool.text ||
        _annotationTool == _AnnotationToolbarTool.stamp) {
      return;
    }
    if (_annotationTool == _AnnotationToolbarTool.eraser) {
      await _eraseAnnotationAt(point, geometry, pageNumber);
      return;
    }

    final points = _draftAnnotationPoints;
    if (points.isEmpty) {
      return;
    }
    if (_annotationTool.usesTwoPointShape) {
      setState(() {
        _draftAnnotationPoints = <SheetAnnotationPoint>[points.first, point];
      });
      return;
    }
    if (points.last.distanceTo(point) < 0.002) {
      return;
    }
    setState(() {
      _draftAnnotationPoints = <SheetAnnotationPoint>[...points, point];
    });
  }

  Future<void> _handleAnnotationPanEnd() async {
    final points = _draftAnnotationPoints;
    final pageNumber = _draftAnnotationPageNumber;
    setState(() {
      _draftAnnotationPageNumber = null;
      _draftAnnotationPoints = const <SheetAnnotationPoint>[];
    });
    if (points.length < 2 || pageNumber == null) {
      return;
    }

    final now = DateTime.now();
    final stroke = SheetAnnotationStroke(
      id: '${now.microsecondsSinceEpoch}-$pageNumber',
      pageNumber: pageNumber,
      tool: _annotationTool.sheetAnnotationTool,
      color: _annotationColor,
      width: _annotationWidth,
      points: List<SheetAnnotationPoint>.unmodifiable(points),
      createdAt: now,
    );
    try {
      await widget.controller.addAnnotationStroke(score, stroke);
    } catch (_) {
      _showSnackBar('필기를 저장하지 못했습니다. 기존 필기는 유지됩니다.');
    }
  }

  Future<void> _handleAnnotationTapUp(
    TapUpDetails details,
    SheetAnnotationPageGeometry geometry,
    int pageNumber,
  ) async {
    if (_annotationTool != _AnnotationToolbarTool.text &&
        _annotationTool != _AnnotationToolbarTool.stamp) {
      return;
    }
    final point = geometry.pointFromPageLocal(details.localPosition);
    if (point == null) {
      return;
    }
    if (_annotationTool == _AnnotationToolbarTool.text) {
      final hitText = score.annotationLayer.textAt(
        pageNumber: pageNumber,
        point: point,
      );
      if (hitText != null) {
        await _showTextAnnotationActions(hitText);
        return;
      }
    }

    if (_annotationTool == _AnnotationToolbarTool.stamp) {
      final now = DateTime.now();
      try {
        await widget.controller.addTextAnnotation(
          score,
          SheetTextAnnotation(
            id: '${now.microsecondsSinceEpoch}-stamp-$pageNumber',
            pageNumber: pageNumber,
            position: point,
            text: _annotationStamp.label,
            color: _annotationColor,
            fontSize: (_annotationWidth * 4.5).clamp(16.0, 54.0).toDouble(),
            createdAt: now,
          ),
        );
      } catch (_) {
        _showSnackBar('스탬프를 저장하지 못했습니다. 기존 필기는 유지됩니다.');
      }
      return;
    }

    final value = await _showTextEntryDialog(
      context: context,
      title: '텍스트 주석',
      label: '내용',
      initialValue: '',
    );
    final text = value?.trim();
    if (text == null || text.isEmpty) {
      return;
    }

    final now = DateTime.now();
    try {
      await widget.controller.addTextAnnotation(
        score,
        SheetTextAnnotation(
          id: '${now.microsecondsSinceEpoch}-text-$pageNumber',
          pageNumber: pageNumber,
          position: point,
          text: text,
          color: _annotationColor,
          fontSize: (_annotationWidth * 3.5).clamp(12.0, 48.0).toDouble(),
          createdAt: now,
        ),
      );
    } catch (_) {
      _showSnackBar('텍스트 주석을 저장하지 못했습니다. 기존 필기는 유지됩니다.');
    }
  }

  Future<void> _showTextAnnotationActions(
    SheetTextAnnotation annotation,
  ) async {
    final action = await showModalBottomSheet<_TextAnnotationAction>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.edit_outlined),
              title: const Text('텍스트 수정'),
              subtitle: Text(annotation.text, maxLines: 2),
              onTap: () =>
                  Navigator.of(context).pop(_TextAnnotationAction.edit),
            ),
            ListTile(
              leading: const Icon(Icons.delete_outline),
              title: const Text('텍스트 삭제'),
              onTap: () =>
                  Navigator.of(context).pop(_TextAnnotationAction.delete),
            ),
          ],
        ),
      ),
    );
    if (action == null || !mounted) {
      return;
    }

    switch (action) {
      case _TextAnnotationAction.edit:
        final value = await _showTextEntryDialog(
          context: context,
          title: '텍스트 주석 수정',
          label: '내용',
          initialValue: annotation.text,
        );
        final text = value?.trim();
        if (text == null) {
          return;
        }
        if (text.isEmpty) {
          final didRemove = await _saveAnnotationChange(
            () => widget.controller.removeTextAnnotation(score, annotation.id),
          );
          _showSnackBar(didRemove ? '텍스트 주석을 삭제했습니다.' : '삭제할 텍스트가 없습니다.');
          return;
        }
        final didUpdate = await _saveAnnotationChange(
          () => widget.controller.updateTextAnnotation(
            score,
            annotation.copyWith(text: text),
          ),
        );
        _showSnackBar(didUpdate ? '텍스트 주석을 수정했습니다.' : '수정할 텍스트가 없습니다.');
        return;
      case _TextAnnotationAction.delete:
        final didRemove = await _saveAnnotationChange(
          () => widget.controller.removeTextAnnotation(score, annotation.id),
        );
        _showSnackBar(didRemove ? '텍스트 주석을 삭제했습니다.' : '삭제할 텍스트가 없습니다.');
        return;
    }
  }

  Future<void> _eraseAnnotationAt(
    SheetAnnotationPoint point,
    SheetAnnotationPageGeometry geometry,
    int pageNumber,
  ) async {
    await _saveAnnotationChange(
      () => widget.controller.eraseAnnotationAt(
        score,
        pageNumber: pageNumber,
        point: point,
        tolerance: geometry.normalizedToleranceForStrokeWidth(_annotationWidth),
      ),
    );
  }

  Future<bool> _saveAnnotationChange(Future<bool> Function() save) async {
    try {
      return await save();
    } catch (_) {
      _showSnackBar('필기 변경사항을 저장하지 못했습니다. 기존 필기는 유지됩니다.');
      return false;
    }
  }

  Future<void> _showPagePicker() async {
    final pageCount = _pdfController.isReady
        ? _pdfController.pageCount
        : _pageCount;
    if (pageCount == null || pageCount < 1) {
      _showSnackBar('페이지 정보를 아직 불러오는 중입니다.');
      return;
    }
    final currentScore = score;
    final pageSettings = currentScore.pageSettings;
    final order = pageSettings.effectivePageOrder(pageCount);
    final duplicateCounts = <int, int>{};
    for (final page in order) {
      duplicateCounts[page] = (duplicateCounts[page] ?? 0) + 1;
    }
    final duplicatePageCount = duplicateCounts.values
        .where((count) => count > 1)
        .length;
    final pageSummary = <String>[
      if (pageSettings.hiddenPages.isNotEmpty)
        '숨김 ${pageSettings.hiddenPages.length}',
      if (duplicatePageCount > 0) '복제 $duplicatePageCount',
      if (pageSettings.hasCustomPageOrder) '가상 순서 ${order.length}',
      if (pageSettings.pageCrops.isNotEmpty)
        '페이지별 자르기 ${pageSettings.pageCrops.length}',
      if (pageSettings.instanceCrops.isNotEmpty)
        '개별 자르기 ${pageSettings.instanceCrops.length}',
      if (pageSettings.instanceRotations.isNotEmpty)
        '개별 회전 ${pageSettings.instanceRotations.length}',
    ].join(' · ');
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '페이지 탐색',
                style: Theme.of(context).textTheme.titleLarge
                    ?.copyWith(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              Text(
                pageSummary.isEmpty
                    ? '원본 PDF는 그대로이고 앱 안 표시 설정만 반영됩니다.'
                    : '$pageSummary · 원본 PDF는 그대로입니다.',
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: MediaQuery.sizeOf(context).height * 0.58,
                child: GridView.builder(
                  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: 96,
                    mainAxisSpacing: 8,
                    crossAxisSpacing: 8,
                    childAspectRatio: 1.2,
                  ),
                  itemCount: pageCount,
                  itemBuilder: (context, index) {
                    final page = index + 1;
                    final isCurrent =
                        page == (_pageNumber ?? currentScore.lastPage);
                    final isHidden = pageSettings.isHidden(page);
                    final duplicateCount = duplicateCounts[page] ?? 0;
                    final isOutsideOrder =
                        pageSettings.hasCustomPageOrder && duplicateCount == 0;
                    return OutlinedButton(
                      onPressed: isHidden
                          ? null
                          : () {
                              Navigator.of(context).pop();
                              unawaited(_goToSheetPage(page));
                            },
                      style: OutlinedButton.styleFrom(
                        backgroundColor: isCurrent
                            ? Theme.of(context).colorScheme.primaryContainer
                            : null,
                        foregroundColor: isHidden
                            ? Theme.of(context).disabledColor
                            : null,
                        padding: EdgeInsets.zero,
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            '$page',
                            style: const TextStyle(fontWeight: FontWeight.w900),
                          ),
                          if (isHidden)
                            const Text('숨김', style: TextStyle(fontSize: 11))
                          else if (duplicateCount > 1)
                            Text(
                              'x$duplicateCount',
                              style: const TextStyle(fontSize: 11),
                            )
                          else if (isOutsideOrder)
                            const Text('순서 제외', style: TextStyle(fontSize: 11)),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _showPdfTextSearch() async {
    if (!_pdfController.isReady) {
      _showSnackBar('PDF가 열린 뒤 본문 검색을 사용할 수 있습니다.');
      return;
    }
    final textSearcher = _ensureTextSearcher();
    final queryController = TextEditingController();
    final currentPattern = textSearcher.pattern;
    if (currentPattern != null) {
      queryController.text = currentPattern.toString();
    }
    var didSearch = currentPattern != null;
    String? errorMessage;
    try {
      await showModalBottomSheet<void>(
        context: context,
        showDragHandle: true,
        isScrollControlled: true,
        builder: (context) => StatefulBuilder(
          builder: (context, setModalState) {
            void refreshWhileSearching() {
              Future<void>.delayed(const Duration(milliseconds: 200), () {
                if (!context.mounted) {
                  return;
                }
                setModalState(() {});
                if (textSearcher.isSearching) {
                  refreshWhileSearching();
                }
              });
            }

            void startSearch() {
              final query = queryController.text.trim();
              if (query.isEmpty) {
                textSearcher.resetTextSearch();
                setModalState(() {
                  didSearch = false;
                  errorMessage = null;
                });
                return;
              }
              try {
                textSearcher.startTextSearch(
                  query,
                  caseInsensitive: true,
                  searchImmediately: true,
                );
                setModalState(() {
                  didSearch = true;
                  errorMessage = null;
                });
                refreshWhileSearching();
              } catch (_) {
                setModalState(() {
                  didSearch = true;
                  errorMessage =
                      SheetPdfSearchSupport.unsupportedTextSearchMessage;
                });
              }
            }

            void clearSearch() {
              queryController.clear();
              textSearcher.resetTextSearch();
              setModalState(() {
                didSearch = false;
                errorMessage = null;
              });
            }

            final matches = textSearcher.matches;
            final progress = textSearcher.searchProgress;
            final currentIndex = textSearcher.currentIndex;
            final currentLabel = currentIndex == null || matches.isEmpty
                ? null
                : '${currentIndex + 1}/${matches.length}';
            final searchingPage = textSearcher.searchingPageNumber;
            final totalPageCount = textSearcher.totalPageCount;
            final searchStatus = textSearcher.isSearching
                ? searchingPage == null || totalPageCount == null
                      ? '검색 중'
                      : '검색 중 · $searchingPage/$totalPageCount쪽'
                : !didSearch
                ? 'PDF 본문 검색은 악보 파일명/라이브러리 검색과 별개입니다.'
                : matches.isEmpty
                ? SheetPdfSearchSupport.noResultStatus
                : currentLabel == null
                ? '${matches.length}개 결과'
                : '$currentLabel 결과';
            return SafeArea(
              child: Padding(
                padding: EdgeInsets.only(
                  left: 20,
                  right: 20,
                  bottom: MediaQuery.viewInsetsOf(context).bottom + 24,
                ),
                child: SizedBox(
                  height: MediaQuery.sizeOf(context).height * 0.72,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'PDF 본문 검색',
                        style: Theme.of(context).textTheme.titleLarge
                            ?.copyWith(fontWeight: FontWeight.w900),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: queryController,
                        decoration: InputDecoration(
                          labelText: '검색어',
                          helperText:
                              SheetPdfSearchSupport.embeddedTextOnlyHelper,
                          suffixIcon: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                tooltip: '검색어 지우기',
                                onPressed: queryController.text.isEmpty
                                    ? null
                                    : clearSearch,
                                icon: const Icon(Icons.clear),
                              ),
                              IconButton(
                                tooltip: '검색',
                                onPressed: startSearch,
                                icon: const Icon(Icons.search),
                              ),
                            ],
                          ),
                        ),
                        textInputAction: TextInputAction.search,
                        onSubmitted: (_) => startSearch(),
                        onChanged: (_) => setModalState(() {}),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(child: Text(searchStatus)),
                          IconButton(
                            tooltip: '이전 결과',
                            onPressed: matches.isEmpty
                                ? null
                                : () async {
                                    await textSearcher.goToPrevMatch();
                                    setModalState(() {});
                                  },
                            icon: const Icon(Icons.keyboard_arrow_up),
                          ),
                          IconButton(
                            tooltip: '다음 결과',
                            onPressed: matches.isEmpty
                                ? null
                                : () async {
                                    await textSearcher.goToNextMatch();
                                    setModalState(() {});
                                  },
                            icon: const Icon(Icons.keyboard_arrow_down),
                          ),
                        ],
                      ),
                      if (textSearcher.isSearching) ...[
                        const SizedBox(height: 6),
                        LinearProgressIndicator(value: progress),
                      ],
                      if (!textSearcher.isSearching &&
                          didSearch &&
                          matches.isEmpty &&
                          errorMessage == null)
                        Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Text(
                            SheetPdfSearchSupport.ocrUnsupportedHint,
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ),
                      if (errorMessage != null) ...[
                        const SizedBox(height: 8),
                        Text(
                          errorMessage!,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.error,
                          ),
                        ),
                      ],
                      const SizedBox(height: 8),
                      Expanded(
                        child: matches.isEmpty
                            ? const Center(
                                child: Text('검색어를 입력하면 쪽 결과가 여기에 표시됩니다.'),
                              )
                            : ListView.separated(
                                itemBuilder: (context, index) {
                                  final match = matches[index];
                                  return ListTile(
                                    leading: CircleAvatar(
                                      child: Text('${match.pageNumber}'),
                                    ),
                                    title: Text(
                                      match.text.trim().isEmpty
                                          ? '검색 결과 ${index + 1}'
                                          : match.text.trim(),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    subtitle: Text(
                                      '${match.pageNumber}쪽 · ${index + 1}/${matches.length}',
                                    ),
                                    trailing: index == textSearcher.currentIndex
                                        ? const Icon(Icons.check)
                                        : null,
                                    onTap: () async {
                                      await textSearcher.goToMatchOfIndex(
                                        index,
                                      );
                                      if (context.mounted) {
                                        Navigator.of(context).pop();
                                      }
                                      _showPageControlsTemporarily();
                                    },
                                  );
                                },
                                separatorBuilder: (context, index) =>
                                    const Divider(height: 1),
                                itemCount: matches.length,
                              ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      );
    } finally {
      queryController.dispose();
    }
  }

  Future<void> _showMetronome() async {
    final currentScore = score;
    final showMiniPanel = await showModalBottomSheet<bool>(
      context: context,
      showDragHandle: true,
      builder: (context) => _MetronomeSheet(
        initialSettings: widget.controller.metronomeSettingsForScore(
          currentScore,
          setlistId: widget.setlistId,
        ),
        settingsScopeLabel: widget.setlistId == null
            ? '이 악보에 저장됩니다'
            : '이 세트리스트에 저장됩니다',
        onSettingsChanged: (settings) =>
            widget.controller.updateMetronomeSettingsForScore(
              currentScore,
              settings,
              setlistId: widget.setlistId,
            ),
        onShowMiniPanel: () => Navigator.of(context).pop(true),
      ),
    );
    if (mounted) {
      if (showMiniPanel == true) {
        setState(() => _miniTool = _ViewerMiniTool.metronome);
      }
      _keyboardFocusNode.requestFocus();
    }
  }

  Future<void> _showTuner() async {
    final showMiniPanel = await showModalBottomSheet<bool>(
      context: context,
      showDragHandle: true,
      builder: (context) => _TunerSheet(
        initialSettings: widget.controller.tunerSettings,
        initialToneSettings: widget.controller.toneSettings,
        onSettingsChanged: widget.controller.updateTunerSettings,
        onToneSettingsChanged: widget.controller.updateToneSettings,
        onShowMiniPanel: () => Navigator.of(context).pop(true),
      ),
    );
    if (mounted) {
      if (showMiniPanel == true) {
        setState(() => _miniTool = _ViewerMiniTool.tuner);
      }
      _keyboardFocusNode.requestFocus();
    }
  }

  Object? _handleViewerInputIntent(_ViewerInputIntent intent) {
    final delta = switch (intent.action) {
      SheetViewerInputAction.previousPage => -1,
      SheetViewerInputAction.nextPage => 1,
      _ => null,
    };
    if (delta != null) {
      unawaited(_handlePedalPageTurn(delta, allowHalfPageTurn: false));
      return null;
    }
    switch (intent.action) {
      case SheetViewerInputAction.previousSetlistScore:
        unawaited(_goToAdjacentSetlistScore(-1));
      case SheetViewerInputAction.nextSetlistScore:
        unawaited(_goToAdjacentSetlistScore(1));
      case SheetViewerInputAction.toggleQuickActions:
        setState(() => _showPageControls = !_showPageControls);
      case SheetViewerInputAction.none:
      case SheetViewerInputAction.previousPage:
      case SheetViewerInputAction.nextPage:
        break;
    }
    return null;
  }

  Future<void> _handlePedalPageTurn(
    int delta, {
    bool allowHalfPageTurn = true,
  }) async {
    await _pageTurnGuard.run(() async {
      if (!_pdfController.isReady ||
          !_pedalMapping.movesAcrossSetlistBoundary ||
          widget.setlistId == null ||
          _canGoToRelativePage(delta)) {
        await _goToRelativePage(delta, allowHalfPageTurn: allowHalfPageTurn);
        return;
      }
      if (allowHalfPageTurn && _canGoToRelativeHalfPage(delta)) {
        _stopAutoScroll(showMessage: false);
        if (await _goToRelativeHalfPage(delta)) {
          _showPageControlsTemporarily();
          return;
        }
      }
      await _goToAdjacentSetlistScore(delta);
    });
  }

  Future<void> _handleViewerMenuAction(_ViewerMenuAction action) async {
    switch (action) {
      case _ViewerMenuAction.bookmarks:
        await _showBookmarks();
        return;
      case _ViewerMenuAction.scoreParts:
        await _showScoreParts();
        return;
      case _ViewerMenuAction.editScoreMetadata:
        await _editCurrentScoreMetadata();
        return;
      case _ViewerMenuAction.scoreNotes:
        await _showScoreNotes();
        return;
      case _ViewerMenuAction.displayMode:
        await _selectDisplayMode();
        return;
      case _ViewerMenuAction.displayEffect:
        await _selectDisplayEffect();
        return;
      case _ViewerMenuAction.pageScale:
        await _selectPageScale();
        return;
      case _ViewerMenuAction.pedalMapping:
        await _selectPedalMapping();
        return;
      case _ViewerMenuAction.renderProfile:
        await _selectRenderProfile();
        return;
      case _ViewerMenuAction.pageTurnAnimation:
        await _selectPageTurnAnimation();
        return;
      case _ViewerMenuAction.showTapZoneHint:
        setState(() {
          _showTapZoneHint = true;
          _showPageControls = true;
        });
        _schedulePageControlsAutoHide();
        return;
      case _ViewerMenuAction.performanceSettings:
        await _showPerformanceSettings();
        return;
      case _ViewerMenuAction.toggleHalfPageTurn:
        if (_displayMode == _SheetViewerDisplayMode.twoPage) {
          _showSnackBar('2페이지 보기에서는 반 페이지 넘김을 사용할 수 없습니다.');
          return;
        }
        _stopAutoScroll(showMessage: false);
        setState(() {
          _useHalfPageTurn = !_useHalfPageTurn;
        });
        await widget.controller.updateViewerSettings(
          score,
          score.viewerSettings.copyWith(
            displayMode: _displayMode.settingValue,
            halfPageTurn: _useHalfPageTurn,
          ),
        );
        _showPageControlsTemporarily();
        return;
      case _ViewerMenuAction.toggleAnnotationMode:
        _toggleAnnotationMode();
        return;
      case _ViewerMenuAction.undoAnnotation:
        await _undoCurrentPageAnnotation();
        return;
      case _ViewerMenuAction.redoAnnotation:
        await _redoCurrentPageAnnotation();
        return;
      case _ViewerMenuAction.autoScroll:
        await _showAutoScroll();
        return;
      case _ViewerMenuAction.metronome:
        await _showMetronome();
        return;
      case _ViewerMenuAction.tuner:
        await _showTuner();
        return;
      case _ViewerMenuAction.pagePicker:
        await _showPagePicker();
        return;
      case _ViewerMenuAction.pdfTextSearch:
        await _showPdfTextSearch();
        return;
      case _ViewerMenuAction.hideCurrentPage:
        await _hideCurrentPage();
        return;
      case _ViewerMenuAction.manageHiddenPages:
        await _showHiddenPages();
        return;
      case _ViewerMenuAction.managePageOrder:
        await _showPageOrder();
        return;
      case _ViewerMenuAction.manageJumpPoints:
        await _showJumpPoints();
        return;
      case _ViewerMenuAction.manageRehearsalMarks:
        await _showRehearsalMarks();
        return;
      case _ViewerMenuAction.importPdfOutline:
        await _importPdfOutlineBookmarks();
        return;
      case _ViewerMenuAction.importBookmarkCsv:
        await _importCsvBookmarks();
        return;
      case _ViewerMenuAction.cropPages:
        await _showCropSettings();
        return;
      case _ViewerMenuAction.cropPresets:
        await _showCropPresets();
        return;
      case _ViewerMenuAction.applyPageCrop:
        await _createPageCropAppliedCopy();
        return;
      case _ViewerMenuAction.pageTemplates:
        await _showPageTemplates();
        return;
      case _ViewerMenuAction.applyPageArrangement:
        await _createPageArrangementAppliedCopy();
        return;
      case _ViewerMenuAction.rotateCurrentPage:
        await _rotateCurrentPageMetadata();
        return;
      case _ViewerMenuAction.applyPageRotations:
        await _createPageRotationAppliedCopy();
        return;
      case _ViewerMenuAction.sanitizePdfLinks:
        await _sanitizePdfLinks();
        return;
      case _ViewerMenuAction.sharePdf:
        await _shareCurrentScorePdf();
        return;
      case _ViewerMenuAction.shareAnnotatedPdf:
        await _shareCurrentScoreAnnotatedPdf();
        return;
      case _ViewerMenuAction.inputDiagnostic:
        await _showInputDiagnostic();
        return;
      case _ViewerMenuAction.togglePdfLinks:
        setState(() {
          _showPdfLinks = !_showPdfLinks;
        });
        return;
      case _ViewerMenuAction.togglePerformanceMode:
        await _setPerformanceMode(!_isPerformanceMode);
        return;
    }
  }

  void _showPageControlsTemporarily() {
    if (!mounted) {
      return;
    }

    if (!_showPageControls) {
      setState(() {
        _showPageControls = true;
      });
    }
    _schedulePageControlsAutoHide();
  }

  KeyEventResult _handleViewerKeyEvent(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
      return KeyEventResult.ignored;
    }
    final entry = SheetViewerInputDiagnosticEntry.fromKeyEvent(
      event: event,
      isShiftPressed: HardwareKeyboard.instance.isShiftPressed,
      pedalMapping: _pedalMapping.settingValue,
      customMapping: _effectiveViewerSettings.customPedalMapping,
    );
    setState(() {
      _inputDiagnosticLog.insert(0, entry);
      if (_inputDiagnosticLog.length > 20) {
        _inputDiagnosticLog.removeRange(20, _inputDiagnosticLog.length);
      }
    });
    final shouldConsume = sheetViewerConsumesKeyEvent(
      action: entry.action,
      pedalMapping: _pedalMapping.settingValue,
      inputId: entry.inputId,
      customMapping: _effectiveViewerSettings.customPedalMapping,
    );
    if (shouldConsume) {
      if (entry.action == SheetViewerInputAction.none) {
        return KeyEventResult.handled;
      }
      _handleViewerInputIntent(_ViewerInputIntent(entry.action));
      return KeyEventResult.handled;
    }
    return KeyEventResult.ignored;
  }

  Future<void> _showInputDiagnostic() async {
    final currentScore = score;
    final openCustomMapping = await showModalBottomSheet<bool>(
      context: context,
      showDragHandle: true,
      builder: (context) => _InputDiagnosticSheet(
        entries: List<SheetViewerInputDiagnosticEntry>.unmodifiable(
          _inputDiagnosticLog,
        ),
        viewerSummary: _viewerDebugSummary(currentScore),
      ),
    );
    if (openCustomMapping == true && mounted) {
      await _showCustomPedalMapping();
    }
  }

  void _schedulePageControlsAutoHide() {
    _pageControlsTimer?.cancel();
    if (_isPerformanceMode) {
      return;
    }

    _pageControlsTimer = Timer(const Duration(seconds: 4), () {
      if (!mounted || _isPerformanceMode || !_showPageControls) {
        return;
      }
      setState(() {
        _showPageControls = false;
      });
    });
  }

  Future<void> _goToAdjacentSetlistScore(
    int delta, {
    bool autoStartScroll = false,
  }) async {
    final setlistId = widget.setlistId;
    if (setlistId == null) {
      return;
    }
    _stopAutoScroll(showMessage: false);

    final nextScore = _adjacentSetlistScoreOrNull(delta);
    if (nextScore == null) {
      _showSnackBar(delta < 0 ? '이전 곡이 없습니다.' : '다음 곡이 없습니다.');
      return;
    }

    if (_effectiveViewerSettings.confirmSetlistTransition) {
      final setlist = widget.controller.setlistByIdOrNull(setlistId);
      final transitionDetails = <String>[
        if (setlist?.scoreStartPages[nextScore.id] != null)
          '${setlist!.scoreStartPages[nextScore.id]}쪽 시작',
        if ((setlist?.scoreDurations[nextScore.id] ?? 0) > 0)
          _formatDuration(setlist!.scoreDurations[nextScore.id]!),
        if ((setlist?.scoreNotes[nextScore.id]?.trim().isNotEmpty ?? false))
          setlist!.scoreNotes[nextScore.id]!.trim(),
      ];
      final didConfirm = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(delta < 0 ? '이전 곡으로 이동' : '다음 곡으로 이동'),
          content: Text(
            transitionDetails.isEmpty
                ? '"${nextScore.title}" 악보를 열까요?'
                : '"${nextScore.title}"\n${transitionDetails.join(' · ')}',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('취소'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('이동'),
            ),
          ],
        ),
      );
      if (didConfirm != true) {
        return;
      }
    }

    final setlist = widget.controller.setlistByIdOrNull(setlistId);
    if (setlist != null) {
      await widget.controller.markSetlistOpened(setlist, scoreId: nextScore.id);
    }
    await widget.controller.markOpened(nextScore);
    if (!mounted) {
      return;
    }
    await Navigator.of(context).pushReplacement<void, void>(
      MaterialPageRoute<void>(
        builder: (context) => SheetViewerScreen(
          controller: widget.controller,
          scoreId: nextScore.id,
          setlistId: setlistId,
          autoStartScroll: autoStartScroll,
        ),
      ),
    );
  }

  void _handlePdfLinkTap(PdfLink link) {
    final action = resolveSheetPdfLinkTapAction(
      url: link.url,
      hasDestination: link.dest != null,
      isPerformanceMode:
          _isPerformanceMode &&
          !_effectiveViewerSettings.allowPerformancePdfLinks,
    );

    switch (action) {
      case SheetPdfLinkTapAction.blockExternalUrl:
        _showSnackBar('외부 PDF 링크를 차단했습니다.');
        return;
      case SheetPdfLinkTapAction.navigateInternalDestination:
        final destination = link.dest;
        if (destination == null) {
          _showSnackBar('지원하지 않는 PDF 링크입니다.');
          return;
        }
        unawaited(
          _pdfController
              .goToDest(destination, duration: _pageTurnDuration)
              .then((didNavigate) async {
                if (!mounted) {
                  return;
                }
                if (!didNavigate) {
                  _showSnackBar('PDF 내부 링크로 이동할 수 없습니다.');
                  return;
                }
                final pageNumber = _pdfController.pageNumber;
                if (pageNumber == null || !_pdfController.isReady) {
                  return;
                }
                final pageCount = _pdfController.pageCount;
                final visiblePage = score.pageSettings.closestVisiblePage(
                  fromPage: pageNumber,
                  pageCount: pageCount,
                );
                _syncPageOrderCursor(visiblePage, pageCount);
                if (visiblePage != pageNumber) {
                  await _pdfController.goToPage(
                    pageNumber: visiblePage,
                    duration: _pageTurnDuration,
                  );
                }
                if (mounted) {
                  _showPageControlsTemporarily();
                }
              }),
        );
        return;
      case SheetPdfLinkTapAction.ignoreInPerformanceMode:
        return;
      case SheetPdfLinkTapAction.ignore:
        _showSnackBar('지원하지 않는 PDF 링크입니다.');
        return;
    }
  }

  void _showSnackBar(String message, {SnackBarAction? action}) {
    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          behavior: SnackBarBehavior.floating,
          duration: action == null
              ? const Duration(seconds: 2)
              : const Duration(seconds: 4),
          action: action,
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final currentScore = score;
    final currentPage = _pageNumber ?? currentScore.lastPage;
    final isBookmarked = widget.controller.isBookmarked(
      currentScore,
      currentPage,
    );
    final hasSetlistContext = widget.setlistId != null;
    final isAutoScrollCueActive = _autoScrollCueRemainingSeconds != null;
    final setlistContext = widget.setlistId == null
        ? null
        : widget.controller.setlistPlaybackContext(
            setlistId: widget.setlistId!,
            scoreId: currentScore.id,
          );
    final viewerWidth = MediaQuery.sizeOf(context).width;
    final isCompactViewer = viewerWidth < 720;
    final usesScrollableViewerToolbar = viewerWidth < 1100;
    final viewerMargin = switch (_pageScale) {
      _SheetViewerPageScale.fitPage => 14.0,
      _SheetViewerPageScale.fitWidth => 6.0,
      _SheetViewerPageScale.fullscreen => 0.0,
    };
    final appBarTitle = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(currentScore.title, overflow: TextOverflow.ellipsis),
        if (setlistContext != null)
          Text(
            _setlistContextSubtitle(setlistContext),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.labelSmall,
          ),
      ],
    );
    final appBarActions = <Widget>[
      if (!_isPerformanceMode || !isCompactViewer)
        IconButton(
          tooltip: isBookmarked ? '현재 페이지 북마크 해제' : '현재 페이지 북마크',
          onPressed: _toggleCurrentBookmark,
          icon: Icon(isBookmarked ? Icons.bookmark : Icons.bookmark_border),
        ),
      if (!isCompactViewer && !_isPerformanceMode)
        IconButton(
          tooltip: '파트/버전',
          onPressed: _showScoreParts,
          icon: const Icon(Icons.library_music_outlined),
        ),
      if (!isCompactViewer && !_isPerformanceMode)
        IconButton(
          tooltip: '악보 메모',
          onPressed: _showScoreNotes,
          icon: const Icon(Icons.sticky_note_2_outlined),
        ),
      if (hasSetlistContext)
        IconButton(
          tooltip: '이전 곡',
          onPressed: () => _goToAdjacentSetlistScore(-1),
          icon: const Icon(Icons.skip_previous),
        ),
      if (hasSetlistContext)
        IconButton(
          tooltip: '다음 곡',
          onPressed: () => _goToAdjacentSetlistScore(1),
          icon: const Icon(Icons.skip_next),
        ),
      if (!isCompactViewer || _isPerformanceMode)
        IconButton(
          tooltip: isAutoScrollCueActive
              ? '자동 스크롤 큐 취소'
              : _isAutoScrolling
              ? _isAutoScrollPaused
                    ? '자동 스크롤 재개'
                    : '자동 스크롤 일시정지'
              : '자동 스크롤',
          onPressed: isAutoScrollCueActive
              ? () => _stopAutoScroll(showMessage: true)
              : _isAutoScrolling
              ? _isAutoScrollPaused
                    ? _resumeAutoScroll
                    : _pauseAutoScroll
              : _showAutoScroll,
          icon: Icon(
            isAutoScrollCueActive
                ? Icons.timer_outlined
                : _isAutoScrolling
                ? _isAutoScrollPaused
                      ? Icons.play_circle_outline
                      : Icons.pause_circle_outline
                : Icons.play_circle_outline,
          ),
        ),
      if (!isCompactViewer || _isPerformanceMode)
        IconButton(
          tooltip: '메트로놈',
          onPressed: _showMetronome,
          icon: const Icon(Icons.speed),
        ),
      if (!isCompactViewer || _isPerformanceMode)
        IconButton(
          tooltip: '튜너',
          onPressed: _showTuner,
          icon: const Icon(Icons.tune),
        ),
      if (!isCompactViewer && !_isPerformanceMode)
        IconButton(
          tooltip: '북마크 목록',
          onPressed: _showBookmarks,
          icon: const Icon(Icons.bookmarks_outlined),
        ),
      if (!isCompactViewer && !_isPerformanceMode)
        IconButton(
          tooltip: '악보 정보 편집',
          onPressed: _editCurrentScoreMetadata,
          icon: const Icon(Icons.edit_note_outlined),
        ),
      if (!isCompactViewer && !_isPerformanceMode)
        IconButton(
          tooltip: '보기 모드',
          onPressed: _selectDisplayMode,
          icon: Icon(_displayMode.icon),
        ),
      if (!isCompactViewer && !_isPerformanceMode)
        IconButton(
          tooltip: '표시 효과',
          onPressed: _selectDisplayEffect,
          icon: Icon(_displayEffect.icon),
        ),
      if (!isCompactViewer && !_isPerformanceMode)
        IconButton(
          tooltip: '페이지 맞춤',
          onPressed: _selectPageScale,
          icon: Icon(_pageScale.icon),
        ),
      if (!isCompactViewer && !_isPerformanceMode)
        IconButton(
          tooltip: '페달 매핑',
          onPressed: _selectPedalMapping,
          icon: Icon(_pedalMapping.icon),
        ),
      if (!isCompactViewer && !_isPerformanceMode)
        IconButton(
          tooltip: '렌더링 프로필',
          onPressed: _selectRenderProfile,
          icon: Icon(_renderProfile.icon),
        ),
      if (!isCompactViewer && !_isPerformanceMode)
        IconButton(
          tooltip: '페이지 넘김 감각',
          onPressed: _selectPageTurnAnimation,
          icon: Icon(_pageTurnAnimation.icon),
        ),
      if (!isCompactViewer && !_isPerformanceMode)
        IconButton(
          tooltip: '터치 영역 다시 보기',
          onPressed: () =>
              _handleViewerMenuAction(_ViewerMenuAction.showTapZoneHint),
          icon: const Icon(Icons.touch_app_outlined),
        ),
      if (!isCompactViewer && !_isPerformanceMode)
        IconButton(
          tooltip: _useHalfPageTurn ? '반 페이지 넘김 끄기' : '반 페이지 넘김',
          onPressed: _displayMode == _SheetViewerDisplayMode.twoPage
              ? null
              : () => _handleViewerMenuAction(
                  _ViewerMenuAction.toggleHalfPageTurn,
                ),
          icon: Icon(
            _useHalfPageTurn ? Icons.splitscreen : Icons.splitscreen_outlined,
          ),
        ),
      if (!isCompactViewer && !_isPerformanceMode)
        IconButton(
          tooltip: _showPdfLinks ? 'PDF 링크 영역 숨기기' : 'PDF 링크 영역 표시',
          onPressed: () =>
              _handleViewerMenuAction(_ViewerMenuAction.togglePdfLinks),
          icon: Icon(_showPdfLinks ? Icons.link : Icons.link_off),
        ),
      if (!isCompactViewer)
        IconButton(
          tooltip: '페이지 탐색',
          onPressed: _showPagePicker,
          icon: const Icon(Icons.grid_view_outlined),
        ),
      if (!isCompactViewer)
        IconButton(
          tooltip: 'PDF 본문 검색',
          onPressed: _showPdfTextSearch,
          icon: const Icon(Icons.find_in_page_outlined),
        ),
      if (!isCompactViewer && !_isPerformanceMode)
        IconButton(
          tooltip: _isAnnotationMode ? '필기 모드 끄기' : '필기 모드',
          onPressed: _toggleAnnotationMode,
          icon: Icon(_isAnnotationMode ? Icons.draw : Icons.draw_outlined),
        ),
      if (!isCompactViewer && !_isPerformanceMode && _isAnnotationMode)
        IconButton(
          tooltip: '마지막 필기 취소',
          onPressed: _undoCurrentPageAnnotation,
          icon: const Icon(Icons.undo),
        ),
      if (!isCompactViewer && !_isPerformanceMode && _isAnnotationMode)
        IconButton(
          tooltip: '마지막 필기 다시 적용',
          onPressed: _redoCurrentPageAnnotation,
          icon: const Icon(Icons.redo),
        ),
      if (!isCompactViewer && !_isPerformanceMode)
        PopupMenuButton<_ViewerMenuAction>(
          tooltip: '페이지 정리',
          icon: const Icon(Icons.rule_folder_outlined),
          onSelected: (action) => _handleViewerMenuAction(action),
          itemBuilder: (context) => [
            const PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.hideCurrentPage,
              child: ListTile(
                leading: Icon(Icons.visibility_off_outlined),
                title: Text('현재 페이지 숨김'),
              ),
            ),
            PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.manageHiddenPages,
              child: ListTile(
                leading: const Icon(Icons.visibility_outlined),
                title: const Text('숨김 페이지 관리'),
                subtitle: Text(
                  currentScore.pageSettings.hiddenPages.isEmpty
                      ? '숨긴 페이지 없음'
                      : '${currentScore.pageSettings.hiddenPages.length}쪽 숨김',
                ),
              ),
            ),
            PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.managePageOrder,
              child: ListTile(
                leading: const Icon(Icons.reorder),
                title: const Text('페이지 순서/복제'),
                subtitle: currentScore.pageSettings.hasCustomPageOrder
                    ? Text('${_pageOrderDisplayCount(currentScore)}개 표시 항목')
                    : const Text('원본 PDF 보존'),
              ),
            ),
            PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.manageJumpPoints,
              child: ListTile(
                leading: const Icon(Icons.add_link),
                title: const Text('점프 포인트'),
                subtitle: currentScore.pageSettings.hasJumpPoints
                    ? Text('${currentScore.pageSettings.jumpPoints.length}개 점프')
                    : const Text('D.S./Coda 이동 설정'),
              ),
            ),
            const PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.manageRehearsalMarks,
              child: ListTile(
                leading: Icon(Icons.flag_outlined),
                title: Text('리허설 마크'),
              ),
            ),
            PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.importPdfOutline,
              child: ListTile(
                leading: const Icon(Icons.account_tree_outlined),
                title: const Text('PDF 목차 가져오기'),
                subtitle: Text('${_pdfOutlineBookmarks.length}개 후보'),
              ),
            ),
            const PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.importBookmarkCsv,
              child: ListTile(
                leading: Icon(Icons.table_rows_outlined),
                title: Text('CSV 북마크 가져오기'),
                subtitle: Text('page,label 또는 label,page'),
              ),
            ),
            const PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.rotateCurrentPage,
              child: ListTile(
                leading: Icon(Icons.rotate_90_degrees_cw_outlined),
                title: Text('회전값 저장'),
              ),
            ),
            PopupMenuItem<_ViewerMenuAction>(
              enabled: currentScore.pageSettings.pageRotations.isNotEmpty,
              value: _ViewerMenuAction.applyPageRotations,
              child: ListTile(
                leading: const Icon(Icons.rotate_right_outlined),
                title: const Text('회전 적용 사본 생성'),
                subtitle: currentScore.pageSettings.pageRotations.isEmpty
                    ? const Text('저장된 회전 없음')
                    : Text(
                        '${currentScore.pageSettings.pageRotations.length}쪽 회전',
                      ),
              ),
            ),
            PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.cropPages,
              child: ListTile(
                leading: const Icon(Icons.crop_outlined),
                title: const Text('자르기 맞춤'),
                subtitle: currentScore.pageSettings.crop.hasCrop
                    ? const Text('앱 설정 적용 중')
                    : const Text('원본 PDF 보존'),
              ),
            ),
            PopupMenuItem<_ViewerMenuAction>(
              enabled:
                  currentScore.pageSettings.crop.hasCrop ||
                  currentScore.pageSettings.pageCrops.isNotEmpty,
              value: _ViewerMenuAction.applyPageCrop,
              child: ListTile(
                leading: const Icon(Icons.crop_free_outlined),
                title: const Text('자르기 적용 사본 생성'),
                subtitle:
                    currentScore.pageSettings.crop.hasCrop ||
                        currentScore.pageSettings.pageCrops.isNotEmpty
                    ? Text(
                        '전체 자르기'
                        '${currentScore.pageSettings.crop.hasCrop ? " 적용" : " 없음"} · '
                        '페이지별 ${currentScore.pageSettings.pageCrops.length}쪽',
                      )
                    : const Text('저장된 자르기 없음'),
              ),
            ),
            const PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.cropPresets,
              child: ListTile(
                leading: Icon(Icons.crop_free_outlined),
                title: Text('자르기 프리셋'),
              ),
            ),
            const PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.pageTemplates,
              child: ListTile(
                leading: Icon(Icons.dashboard_customize_outlined),
                title: Text('페이지 템플릿'),
              ),
            ),
            PopupMenuItem<_ViewerMenuAction>(
              enabled:
                  currentScore.pageSettings.hiddenPages.isNotEmpty ||
                  currentScore.pageSettings.pageOrder.isNotEmpty ||
                  currentScore.pageSettings.blankPageInsertions.isNotEmpty,
              value: _ViewerMenuAction.applyPageArrangement,
              child: ListTile(
                leading: const Icon(Icons.library_books_outlined),
                title: const Text('페이지 정리 적용 사본 생성'),
                subtitle: Text(
                  _pageTemplateSummary(currentScore, _pdfController.pageCount),
                ),
              ),
            ),
            PopupMenuItem<_ViewerMenuAction>(
              enabled: !_isSanitizingPdfLinks,
              value: _ViewerMenuAction.sanitizePdfLinks,
              child: ListTile(
                leading: const Icon(Icons.link_off_outlined),
                title: const Text('PDF 링크 제거 사본 만들기'),
                subtitle: currentScore.pdfLinkSanitization.hasSanitizedCopy
                    ? Text(
                        '이전 제거 ${currentScore.pdfLinkSanitization.removedUrlLinkCount}개',
                      )
                    : const Text('외부 URL 링크만 제거'),
              ),
            ),
            const PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.sharePdf,
              child: ListTile(
                leading: Icon(Icons.ios_share),
                title: Text('PDF 공유'),
              ),
            ),
            const PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.shareAnnotatedPdf,
              child: ListTile(
                leading: Icon(Icons.draw_outlined),
                title: Text('필기 포함 PDF 공유'),
              ),
            ),
            const PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.inputDiagnostic,
              child: ListTile(
                leading: Icon(Icons.keyboard_alt_outlined),
                title: Text('입력 진단'),
                subtitle: Text('페달/키보드 입력 기록'),
              ),
            ),
          ],
        ),
      if (!isCompactViewer &&
          (!_isPerformanceMode ||
              _effectiveViewerSettings.allowPerformanceMenus))
        IconButton(
          tooltip: '공연 설정',
          onPressed: _showPerformanceSettings,
          icon: const Icon(Icons.lock_outline),
        ),
      if (!isCompactViewer)
        IconButton(
          tooltip: _isPerformanceMode ? '공연 모드 끄기' : '공연 모드',
          onPressed: () =>
              _handleViewerMenuAction(_ViewerMenuAction.togglePerformanceMode),
          icon: Icon(
            _isPerformanceMode ? Icons.fullscreen_exit : Icons.fullscreen,
          ),
        ),
      if (isCompactViewer && _isPerformanceMode)
        IconButton(
          tooltip: '공연 모드 끄기',
          onPressed: () =>
              _handleViewerMenuAction(_ViewerMenuAction.togglePerformanceMode),
          icon: const Icon(Icons.fullscreen_exit),
        ),
      if (isCompactViewer && !_isPerformanceMode)
        PopupMenuButton<_ViewerMenuAction>(
          tooltip: '보기 옵션',
          onSelected: (action) => _handleViewerMenuAction(action),
          itemBuilder: (context) => [
            ..._viewerCompactLibraryMenuItems(),
            PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.displayMode,
              child: ListTile(
                leading: Icon(_displayMode.icon),
                title: Text('보기 모드: ${_displayMode.label}'),
              ),
            ),
            PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.displayEffect,
              child: ListTile(
                leading: Icon(_displayEffect.icon),
                title: Text('표시 효과: ${_displayEffect.label}'),
              ),
            ),
            PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.pageScale,
              child: ListTile(
                leading: Icon(_pageScale.icon),
                title: Text('페이지 맞춤: ${_pageScale.label}'),
              ),
            ),
            PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.pedalMapping,
              child: ListTile(
                leading: Icon(_pedalMapping.icon),
                title: Text('페달 매핑: ${_pedalMapping.label}'),
              ),
            ),
            PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.renderProfile,
              child: ListTile(
                leading: Icon(_renderProfile.icon),
                title: Text('렌더링: ${_renderProfile.label}'),
              ),
            ),
            PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.pageTurnAnimation,
              child: ListTile(
                leading: Icon(_pageTurnAnimation.icon),
                title: Text('페이지 넘김: ${_pageTurnAnimation.label}'),
              ),
            ),
            const PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.showTapZoneHint,
              child: ListTile(
                leading: Icon(Icons.touch_app_outlined),
                title: Text('터치 영역 다시 보기'),
                subtitle: Text('왼쪽 이전 · 가운데 메뉴 · 오른쪽 다음'),
              ),
            ),
            PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.performanceSettings,
              child: const ListTile(
                leading: Icon(Icons.lock_outline),
                title: Text('공연 설정'),
              ),
            ),
            PopupMenuItem<_ViewerMenuAction>(
              enabled: _displayMode != _SheetViewerDisplayMode.twoPage,
              value: _ViewerMenuAction.toggleHalfPageTurn,
              child: ListTile(
                leading: Icon(
                  _useHalfPageTurn
                      ? Icons.splitscreen
                      : Icons.splitscreen_outlined,
                ),
                title: Text(_useHalfPageTurn ? '반 페이지 넘김 끄기' : '반 페이지 넘김'),
                subtitle: _displayMode == _SheetViewerDisplayMode.twoPage
                    ? const Text('2페이지 보기에서는 비활성화')
                    : null,
              ),
            ),
            PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.autoScroll,
              child: ListTile(
                leading: Icon(
                  _isAutoScrolling
                      ? _isAutoScrollPaused
                            ? Icons.play_circle_outline
                            : Icons.pause_circle_outline
                      : Icons.play_circle_outline,
                ),
                title: const Text('자동 스크롤'),
                subtitle: _isAutoScrolling
                    ? Text(_isAutoScrollPaused ? '일시정지' : '실행 중')
                    : null,
              ),
            ),
            const PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.metronome,
              child: ListTile(leading: Icon(Icons.speed), title: Text('메트로놈')),
            ),
            const PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.tuner,
              child: ListTile(leading: Icon(Icons.tune), title: Text('튜너')),
            ),
            const PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.pagePicker,
              child: ListTile(
                leading: Icon(Icons.grid_view_outlined),
                title: Text('페이지 탐색'),
              ),
            ),
            const PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.pdfTextSearch,
              child: ListTile(
                leading: Icon(Icons.find_in_page_outlined),
                title: Text('PDF 본문 검색'),
              ),
            ),
            PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.toggleAnnotationMode,
              child: ListTile(
                leading: Icon(
                  _isAnnotationMode ? Icons.draw : Icons.draw_outlined,
                ),
                title: Text(_isAnnotationMode ? '필기 모드 끄기' : '필기 모드'),
              ),
            ),
            PopupMenuItem<_ViewerMenuAction>(
              enabled: _isAnnotationMode,
              value: _ViewerMenuAction.undoAnnotation,
              child: const ListTile(
                leading: Icon(Icons.undo),
                title: Text('마지막 필기 취소'),
              ),
            ),
            PopupMenuItem<_ViewerMenuAction>(
              enabled: _isAnnotationMode,
              value: _ViewerMenuAction.redoAnnotation,
              child: const ListTile(
                leading: Icon(Icons.redo),
                title: Text('마지막 필기 다시 적용'),
              ),
            ),
            const PopupMenuDivider(),
            const PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.hideCurrentPage,
              child: ListTile(
                leading: Icon(Icons.visibility_off_outlined),
                title: Text('현재 페이지 숨김'),
              ),
            ),
            PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.manageHiddenPages,
              child: ListTile(
                leading: const Icon(Icons.visibility_outlined),
                title: const Text('숨김 페이지 관리'),
                subtitle: Text(
                  currentScore.pageSettings.hiddenPages.isEmpty
                      ? '숨긴 페이지 없음'
                      : '${currentScore.pageSettings.hiddenPages.length}쪽 숨김',
                ),
              ),
            ),
            PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.managePageOrder,
              child: ListTile(
                leading: const Icon(Icons.reorder),
                title: const Text('페이지 순서/복제'),
                subtitle: currentScore.pageSettings.hasCustomPageOrder
                    ? Text('${_pageOrderDisplayCount(currentScore)}개 표시 항목')
                    : const Text('원본 PDF 보존'),
              ),
            ),
            PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.manageJumpPoints,
              child: ListTile(
                leading: const Icon(Icons.add_link),
                title: const Text('점프 포인트'),
                subtitle: currentScore.pageSettings.hasJumpPoints
                    ? Text('${currentScore.pageSettings.jumpPoints.length}개 점프')
                    : const Text('D.S./Coda 이동 설정'),
              ),
            ),
            const PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.manageRehearsalMarks,
              child: ListTile(
                leading: Icon(Icons.flag_outlined),
                title: Text('리허설 마크'),
              ),
            ),
            PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.importPdfOutline,
              child: ListTile(
                leading: const Icon(Icons.account_tree_outlined),
                title: const Text('PDF 목차 가져오기'),
                subtitle: Text('${_pdfOutlineBookmarks.length}개 후보'),
              ),
            ),
            const PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.importBookmarkCsv,
              child: ListTile(
                leading: Icon(Icons.table_rows_outlined),
                title: Text('CSV 북마크 가져오기'),
                subtitle: Text('page,label 또는 label,page'),
              ),
            ),
            const PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.rotateCurrentPage,
              child: ListTile(
                leading: Icon(Icons.rotate_90_degrees_cw_outlined),
                title: Text('회전값 저장'),
              ),
            ),
            PopupMenuItem<_ViewerMenuAction>(
              enabled: currentScore.pageSettings.pageRotations.isNotEmpty,
              value: _ViewerMenuAction.applyPageRotations,
              child: ListTile(
                leading: const Icon(Icons.rotate_right_outlined),
                title: const Text('회전 적용 사본 생성'),
                subtitle: currentScore.pageSettings.pageRotations.isEmpty
                    ? const Text('저장된 회전 없음')
                    : Text(
                        '${currentScore.pageSettings.pageRotations.length}쪽 회전',
                      ),
              ),
            ),
            PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.cropPages,
              child: ListTile(
                leading: const Icon(Icons.crop_outlined),
                title: const Text('자르기 맞춤'),
                subtitle: currentScore.pageSettings.crop.hasCrop
                    ? const Text('앱 설정 적용 중')
                    : const Text('원본 PDF 보존'),
              ),
            ),
            PopupMenuItem<_ViewerMenuAction>(
              enabled:
                  currentScore.pageSettings.crop.hasCrop ||
                  currentScore.pageSettings.pageCrops.isNotEmpty,
              value: _ViewerMenuAction.applyPageCrop,
              child: ListTile(
                leading: const Icon(Icons.crop_free_outlined),
                title: const Text('자르기 적용 사본 생성'),
                subtitle:
                    currentScore.pageSettings.crop.hasCrop ||
                        currentScore.pageSettings.pageCrops.isNotEmpty
                    ? Text(
                        '전체 자르기'
                        '${currentScore.pageSettings.crop.hasCrop ? " 적용" : " 없음"} · '
                        '페이지별 ${currentScore.pageSettings.pageCrops.length}쪽',
                      )
                    : const Text('저장된 자르기 없음'),
              ),
            ),
            const PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.cropPresets,
              child: ListTile(
                leading: Icon(Icons.crop_free_outlined),
                title: Text('자르기 프리셋'),
              ),
            ),
            const PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.pageTemplates,
              child: ListTile(
                leading: Icon(Icons.dashboard_customize_outlined),
                title: Text('페이지 템플릿'),
              ),
            ),
            PopupMenuItem<_ViewerMenuAction>(
              enabled:
                  currentScore.pageSettings.hiddenPages.isNotEmpty ||
                  currentScore.pageSettings.pageOrder.isNotEmpty ||
                  currentScore.pageSettings.blankPageInsertions.isNotEmpty,
              value: _ViewerMenuAction.applyPageArrangement,
              child: ListTile(
                leading: const Icon(Icons.library_books_outlined),
                title: const Text('페이지 정리 적용 사본 생성'),
                subtitle: Text(
                  _pageTemplateSummary(currentScore, _pdfController.pageCount),
                ),
              ),
            ),
            PopupMenuItem<_ViewerMenuAction>(
              enabled: !_isSanitizingPdfLinks,
              value: _ViewerMenuAction.sanitizePdfLinks,
              child: ListTile(
                leading: const Icon(Icons.link_off_outlined),
                title: const Text('PDF 링크 제거 사본 만들기'),
                subtitle: currentScore.pdfLinkSanitization.hasSanitizedCopy
                    ? Text(
                        '이전 제거 ${currentScore.pdfLinkSanitization.removedUrlLinkCount}개',
                      )
                    : const Text('외부 URL 링크만 제거'),
              ),
            ),
            const PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.sharePdf,
              child: ListTile(
                leading: Icon(Icons.ios_share),
                title: Text('PDF 공유'),
              ),
            ),
            const PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.shareAnnotatedPdf,
              child: ListTile(
                leading: Icon(Icons.draw_outlined),
                title: Text('필기 포함 PDF 공유'),
              ),
            ),
            const PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.inputDiagnostic,
              child: ListTile(
                leading: Icon(Icons.keyboard_alt_outlined),
                title: Text('입력 진단'),
                subtitle: Text('페달/키보드 입력 기록'),
              ),
            ),
            const PopupMenuDivider(),
            PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.togglePdfLinks,
              child: ListTile(
                leading: Icon(_showPdfLinks ? Icons.link : Icons.link_off),
                title: Text(_showPdfLinks ? 'PDF 링크 영역 숨기기' : 'PDF 링크 영역 표시'),
              ),
            ),
            const PopupMenuItem<_ViewerMenuAction>(
              value: _ViewerMenuAction.togglePerformanceMode,
              child: ListTile(
                leading: Icon(Icons.fullscreen),
                title: Text('공연 모드'),
              ),
            ),
          ],
        ),
      Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Text(
            _currentPageLabel,
            style: const TextStyle(fontWeight: FontWeight.w900),
          ),
        ),
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: !usesScrollableViewerToolbar,
        title: usesScrollableViewerToolbar ? null : appBarTitle,
        actions: usesScrollableViewerToolbar
            ? <Widget>[
                _ScrollableAppBarActions(
                  children: [
                    IconButton(
                      tooltip: '뒤로',
                      onPressed: () {
                        Navigator.of(context).maybePop();
                      },
                      icon: const BackButtonIcon(),
                    ),
                    ...appBarActions,
                  ],
                ),
              ]
            : appBarActions,
      ),
      body: Focus(
        focusNode: _keyboardFocusNode,
        autofocus: true,
        onKeyEvent: _handleViewerKeyEvent,
        child: Shortcuts(
          shortcuts: _viewerKeyboardShortcutsFor(
            _pedalMapping.settingValue,
            _effectiveViewerSettings.customPedalMapping,
          ),
          child: Actions(
            actions: <Type, Action<Intent>>{
              _ViewerInputIntent: CallbackAction<_ViewerInputIntent>(
                onInvoke: _handleViewerInputIntent,
              ),
            },
            child: SafeArea(
              child: Listener(
                behavior: HitTestBehavior.translucent,
                onPointerDown: _handleViewerPointerDown,
                onPointerUp: _handleViewerPointerUp,
                child: Stack(
                  children: [
                    FutureBuilder<SheetViewerFileStatus>(
                      future: _viewerFileStatusFor(currentScore.filePath),
                      builder: (context, snapshot) {
                        final status = snapshot.data;
                        if (status == null) {
                          return const _ViewerLoadingBanner(
                            message: 'PDF 파일 확인 중',
                          );
                        }
                        if (!status.canOpen) {
                          return _ViewerFileStatusBanner(status: status);
                        }
                        return _ViewerDisplayEffectWrapper(
                          effect: _displayEffect,
                          child: PdfViewer.custom(
                            fileSize: status.sizeBytes,
                            sourceName:
                                '${currentScore.filePath}-${status.sizeBytes}',
                            read: (buffer, position, size) => _readPdfFileRange(
                              currentScore.filePath,
                              buffer,
                              position,
                              size,
                            ),
                            key: ValueKey(
                              '${currentScore.filePath}-${_displayMode.name}-'
                              '${_displayEffect.name}-${_pageScale.name}-'
                              '${_renderProfile.name}-${status.sizeBytes}',
                            ),
                            controller: _pdfController,
                            initialPageNumber: _initialViewerPage,
                            params: PdfViewerParams(
                              margin: viewerMargin,
                              backgroundColor: _viewerBackgroundColor,
                              limitRenderingCache:
                                  _renderProfile.limitsRenderCache,
                              maxImageBytesCachedOnMemory:
                                  _renderProfile.maxImageBytesCachedOnMemory,
                              pagePaintCallbacks: [_paintTextSearchMatches],
                              // ignore: deprecated_member_use
                              onePassRenderingScaleThreshold:
                                  _renderProfile.onePassRenderingScaleThreshold,
                              // ignore: deprecated_member_use
                              calculateInitialZoom:
                                  (document, controller, fitZoom, coverZoom) {
                                    return switch (_pageScale) {
                                      _SheetViewerPageScale.fitPage => fitZoom,
                                      _SheetViewerPageScale.fitWidth =>
                                        _initialFitWidthZoom(
                                          pages: document.pages,
                                          viewSize: controller.viewSize,
                                          pageNumber: currentScore.lastPage,
                                          margin: viewerMargin,
                                          fallbackZoom: coverZoom,
                                        ),
                                      _SheetViewerPageScale.fullscreen =>
                                        coverZoom,
                                    };
                                  },
                              layoutPages: switch (_displayMode) {
                                _SheetViewerDisplayMode.singlePage =>
                                  _layoutPagesHorizontally,
                                _SheetViewerDisplayMode.twoPage =>
                                  _layoutPagesAsSpreads,
                                _SheetViewerDisplayMode.continuousVertical =>
                                  null,
                              },
                              scrollHorizontallyByMouseWheel:
                                  _displayMode !=
                                  _SheetViewerDisplayMode.continuousVertical,
                              textSelectionParams: _isPerformanceMode
                                  ? const PdfTextSelectionParams(enabled: false)
                                  : null,
                              linkHandlerParams: PdfLinkHandlerParams(
                                onLinkTap: _handlePdfLinkTap,
                                linkColor: _showPdfLinks
                                    ? const Color(0xff2f8c8f)
                                          .withValues(alpha: 0.26)
                                    : Colors.transparent,
                                enableAutoLinkDetection: false,
                              ),
                              loadingBannerBuilder:
                                  (context, bytesDownloaded, totalBytes) {
                                    return const _ViewerLoadingBanner(
                                      message: 'PDF를 여는 중',
                                    );
                                  },
                              errorBannerBuilder:
                                  (context, error, stackTrace, documentRef) =>
                                      _ViewerErrorBanner(
                                        filePath: currentScore.filePath,
                                        error: error,
                                      ),
                              onViewerReady: (document, _) {
                                _ensureTextSearcher();
                                final initialPage =
                                    _pageNumber ?? currentScore.lastPage;
                                _scheduleCropToFit(
                                  initialPage,
                                  orderIndex: _effectiveOrderIndexForPage(
                                    currentScore,
                                    initialPage,
                                  ),
                                  force: true,
                                );
                                unawaited(_loadPdfOutlineBookmarks(document));
                                _maybeAutoStartScroll();
                              },
                              pageOverlaysBuilder: (context, pageRect, page) {
                                final pageNumber = page.pageNumber;
                                final orderIndex = _effectiveOrderIndexForPage(
                                  currentScore,
                                  pageNumber,
                                );
                                final rotation = currentScore.pageSettings
                                    .rotationForPage(
                                      pageNumber,
                                      orderIndex: orderIndex,
                                    );
                                final jumpPoints = currentScore.pageSettings
                                    .jumpPointsFromPage(pageNumber);
                                final pageCrop = currentScore.pageSettings
                                    .cropForPage(
                                      pageNumber,
                                      orderIndex: orderIndex,
                                    );
                                final rehearsalMarks =
                                    currentScore.pageSettings.rehearsalMarks;
                                final bookmarks = currentScore.bookmarks;
                                return <Widget>[
                                  Positioned.fill(
                                    child: _AnnotationPageOverlay(
                                      isEnabled: _isAnnotationMode,
                                      pageNumber: pageNumber,
                                      strokes: currentScore.annotationLayer
                                          .visibleStrokesForPage(pageNumber),
                                      texts: currentScore.annotationLayer
                                          .visibleTextsForPage(pageNumber),
                                      draftPoints:
                                          _draftAnnotationPageNumber ==
                                              pageNumber
                                          ? _draftAnnotationPoints
                                          : const <SheetAnnotationPoint>[],
                                      draftTool: _annotationTool,
                                      draftColor: _annotationColor,
                                      draftWidth: _annotationWidth,
                                      onPanStart: _handleAnnotationPanStart,
                                      onPanUpdate: _handleAnnotationPanUpdate,
                                      onPanEnd: _handleAnnotationPanEnd,
                                      onTapUp: _handleAnnotationTapUp,
                                    ),
                                  ),
                                  if (pageCrop.hasCrop)
                                    Positioned.fill(
                                      child: IgnorePointer(
                                        child: CustomPaint(
                                          painter: _CropMaskPainter(
                                            crop: pageCrop,
                                            color: _viewerBackgroundColor
                                                .withValues(alpha: 0.9),
                                          ),
                                        ),
                                      ),
                                    ),
                                  if (!_isAnnotationMode &&
                                      (jumpPoints.isNotEmpty ||
                                          rehearsalMarks.isNotEmpty ||
                                          bookmarks.isNotEmpty))
                                    Positioned(
                                      right: 8,
                                      bottom: 8,
                                      child: _QuickJumpButtons(
                                        jumpPoints: jumpPoints,
                                        onJump: _goToJumpPoint,
                                        rehearsalMarks: rehearsalMarks,
                                        bookmarks: bookmarks,
                                        onPageSelected: _goToSheetPage,
                                      ),
                                    ),
                                  if (rotation != 0)
                                    Positioned(
                                      top: 8,
                                      right: 8,
                                      child: IgnorePointer(
                                        child: _PageMetadataBadge(
                                          label: '회전 $rotation도',
                                        ),
                                      ),
                                    ),
                                ];
                              },
                              onPageChanged: (pageNumber) {
                                if (pageNumber == null) {
                                  return;
                                }
                                if ((_isAutoScrolling ||
                                        _autoScrollCueRemainingSeconds !=
                                            null) &&
                                    !_isAutoScrollTicking) {
                                  _stopAutoScroll(showMessage: true);
                                }
                                final currentPageSettings = score.pageSettings;
                                if (currentPageSettings.isHidden(pageNumber) &&
                                    _pdfController.isReady) {
                                  final visiblePage = currentPageSettings
                                      .closestVisiblePage(
                                        fromPage: pageNumber,
                                        pageCount: _pdfController.pageCount,
                                      );
                                  if (visiblePage != pageNumber) {
                                    _pdfController.goToPage(
                                      pageNumber: visiblePage,
                                      duration: _pageTurnDuration,
                                    );
                                    return;
                                  }
                                }
                                widget.controller.updateLastPage(
                                  currentScore,
                                  pageNumber,
                                );
                                _syncPageOrderCursor(
                                  pageNumber,
                                  _pdfController.pageCount,
                                );
                                setState(() {
                                  _pageNumber = pageNumber;
                                });
                                _scheduleCropToFit(
                                  pageNumber,
                                  orderIndex: _effectiveOrderIndexForPage(
                                    currentScore,
                                    pageNumber,
                                  ),
                                );
                              },
                            ),
                          ),
                        );
                      },
                    ),
                    if (_isAnnotationMode)
                      Positioned(
                        left: isCompactViewer ? 8 : 20,
                        right: isCompactViewer ? 8 : 20,
                        top: 12,
                        child: _AnnotationToolbar(
                          selectedTool: _annotationTool,
                          selectedStamp: _annotationStamp,
                          selectedColor: _annotationColor,
                          selectedWidth: _annotationWidth,
                          hasFavoritePreset: _favoriteAnnotationPreset != null,
                          isLayerVisible: currentScore
                              .annotationLayer
                              .isDefaultLayerVisible,
                          includeLayerInExport: currentScore
                              .annotationLayer
                              .includeDefaultLayerInExport,
                          isCompact: isCompactViewer,
                          onToolSelected: (tool) {
                            setState(() {
                              _annotationTool = tool;
                            });
                          },
                          onStampSelected: (stamp) {
                            setState(() {
                              _annotationStamp = stamp;
                            });
                          },
                          onColorSelected: (color) {
                            setState(() {
                              _annotationColor = color;
                            });
                          },
                          onWidthChanged: (width) {
                            setState(() {
                              _annotationWidth = width;
                            });
                          },
                          onUndo: _undoCurrentPageAnnotation,
                          onRedo: _redoCurrentPageAnnotation,
                          onSaveFavorite: _saveFavoriteAnnotationPreset,
                          onApplyFavorite: _applyFavoriteAnnotationPreset,
                          onToggleLayerVisibility:
                              _toggleAnnotationLayerVisibility,
                          onToggleLayerExport: _toggleAnnotationLayerExport,
                        ),
                      ),
                    if (_isSanitizingPdfLinks)
                      Positioned.fill(
                        child: ColoredBox(
                          color: Colors.black.withValues(alpha: 0.24),
                          child: Center(
                            child: Card(
                              child: Padding(
                                padding: const EdgeInsets.all(20),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: const [
                                    CircularProgressIndicator(),
                                    SizedBox(height: 14),
                                    Text('PDF 링크 제거 사본 생성 중'),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    if (_isApplyingPageTransform)
                      Positioned.fill(
                        child: ColoredBox(
                          color: Colors.black.withValues(alpha: 0.24),
                          child: Center(
                            child: Card(
                              child: Padding(
                                padding: const EdgeInsets.all(20),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: const [
                                    CircularProgressIndicator(),
                                    SizedBox(height: 14),
                                    Text('페이지 적용 사본 생성 중'),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    if (currentScore.pageSettings.pageRotations.isNotEmpty &&
                        !_isPerformanceMode &&
                        !_isAnnotationMode &&
                        !_isApplyingPageTransform)
                      Positioned(
                        top: 12,
                        right: isCompactViewer ? 8 : 20,
                        child: _PendingPageRotationBanner(
                          rotationCount:
                              currentScore.pageSettings.pageRotations.length,
                          onApply: _createPageRotationAppliedCopy,
                        ),
                      ),
                    if (_autoScrollCueRemainingSeconds != null)
                      Positioned.fill(
                        child: IgnorePointer(
                          child: _AutoScrollCueOverlay(
                            remainingSeconds: _autoScrollCueRemainingSeconds!,
                          ),
                        ),
                      ),
                    if (_showTapZoneHint &&
                        !_isAnnotationMode &&
                        !_isPerformanceMode)
                      const Positioned.fill(child: _TapZoneHintOverlay()),
                    if (setlistContext != null &&
                        (usesScrollableViewerToolbar || _isPerformanceMode) &&
                        !_isAnnotationMode)
                      Positioned(
                        left: _isPerformanceMode
                            ? (isCompactViewer ? 68 : 80)
                            : 16,
                        right: isCompactViewer ? 8 : 16,
                        top: isCompactViewer ? 12 : 16,
                        child: Align(
                          alignment: _isPerformanceMode
                              ? Alignment.topLeft
                              : Alignment.topCenter,
                          child: _SetlistProgressBadge(
                            scoreTitle: currentScore.title,
                            subtitle: _setlistProgressSubtitle(setlistContext),
                          ),
                        ),
                      ),
                    if (_miniTool != null && !_isAnnotationMode)
                      Positioned(
                        top: isCompactViewer ? 12 : 20,
                        right: isCompactViewer ? 8 : 20,
                        child: _ViewerMiniToolPanel(
                          tool: _miniTool!,
                          metronomeSettings: _effectiveMetronomeSettings,
                          onMetronomeSettingsChanged: (settings) =>
                              widget.controller.updateMetronomeSettingsForScore(
                                currentScore,
                                settings,
                                setlistId: widget.setlistId,
                              ),
                          onOpenTuner: () {
                            setState(() => _miniTool = null);
                            unawaited(_showTuner());
                          },
                          onClose: () => setState(() => _miniTool = null),
                        ),
                      ),
                    if (_isPerformanceMode)
                      Positioned(
                        left: isCompactViewer ? 8 : 16,
                        top: 12,
                        child: _PerformanceQuickActions(
                          isBookmarked: isBookmarked,
                          hasSetlistContext: hasSetlistContext,
                          isAutoScrolling: _isAutoScrolling,
                          isAutoScrollPaused: _isAutoScrollPaused,
                          isAutoScrollCueActive: isAutoScrollCueActive,
                          allowMenus:
                              _effectiveViewerSettings.allowPerformanceMenus,
                          onBookmark: _toggleCurrentBookmark,
                          onAutoScroll: isAutoScrollCueActive
                              ? () => _stopAutoScroll(showMessage: true)
                              : _isAutoScrolling
                              ? _isAutoScrollPaused
                                    ? _resumeAutoScroll
                                    : _pauseAutoScroll
                              : _showAutoScroll,
                          onMetronome: _showMetronome,
                          onTuner: _showTuner,
                          onSettings: _showPerformanceSettings,
                          onPreviousScore: () => _goToAdjacentSetlistScore(-1),
                          onNextScore: () => _goToAdjacentSetlistScore(1),
                        ),
                      ),
                    Positioned(
                      left: 16,
                      right: 16,
                      bottom: _isPerformanceMode ? 16 : 24,
                      child: AnimatedOpacity(
                        duration: const Duration(milliseconds: 220),
                        opacity: _isPerformanceMode || _showPageControls
                            ? 1
                            : 0,
                        child: IgnorePointer(
                          ignoring: !_isPerformanceMode && !_showPageControls,
                          child: _ViewerControls(
                            pageNumber: _pageNumber ?? currentScore.lastPage,
                            pageCount: _pageCount,
                            canGoPrevious: _canTurnPageOrSetlist(-1),
                            canGoNext: _canTurnPageOrSetlist(1),
                            onPrevious: () => _handlePedalPageTurn(-1),
                            onNext: () => _handlePedalPageTurn(1),
                            isPerformanceMode: _isPerformanceMode,
                            modeLabel: _viewerControlModeLabel,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ViewerDisplayEffectWrapper extends StatelessWidget {
  const _ViewerDisplayEffectWrapper({
    required this.effect,
    required this.child,
  });

  final _SheetViewerDisplayEffect effect;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return switch (effect) {
      _SheetViewerDisplayEffect.inverted => ColorFiltered(
        colorFilter: const ColorFilter.matrix(<double>[
          -1,
          0,
          0,
          0,
          255,
          0,
          -1,
          0,
          0,
          255,
          0,
          0,
          -1,
          0,
          255,
          0,
          0,
          0,
          1,
          0,
        ]),
        child: child,
      ),
      _ => child,
    };
  }
}

class _TapZoneHintOverlay extends StatelessWidget {
  const _TapZoneHintOverlay();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final zoneColor = theme.colorScheme.primary.withValues(alpha: 0.08);
    final lineColor = theme.colorScheme.primary.withValues(alpha: 0.28);
    return Semantics(
      container: true,
      label: '페이지 터치 영역 안내',
      child: IgnorePointer(
        child: ColoredBox(
          color: Colors.transparent,
          child: Row(
            children: [
              Expanded(
                child: _TapZoneHintPane(
                  color: zoneColor,
                  borderColor: lineColor,
                  icon: Icons.chevron_left,
                  label: '이전',
                ),
              ),
              Expanded(
                child: _TapZoneHintPane(
                  color: Colors.white.withValues(alpha: 0.38),
                  borderColor: lineColor,
                  icon: Icons.touch_app_outlined,
                  label: '메뉴',
                ),
              ),
              Expanded(
                child: _TapZoneHintPane(
                  color: zoneColor,
                  borderColor: lineColor,
                  icon: Icons.chevron_right,
                  label: '다음',
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TapZoneHintPane extends StatelessWidget {
  const _TapZoneHintPane({
    required this.color,
    required this.borderColor,
    required this.icon,
    required this.label,
  });

  final Color color;
  final Color borderColor;
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: color,
        border: Border.symmetric(
          vertical: BorderSide(color: borderColor, width: 0.6),
        ),
      ),
      child: Center(
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.86),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: borderColor),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 18),
                const SizedBox(width: 4),
                Text(
                  label,
                  style: theme.textTheme.labelMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ViewerMiniToolPanel extends StatefulWidget {
  const _ViewerMiniToolPanel({
    required this.tool,
    required this.metronomeSettings,
    required this.onMetronomeSettingsChanged,
    required this.onOpenTuner,
    required this.onClose,
  });

  final _ViewerMiniTool tool;
  final SheetMetronomeSettings metronomeSettings;
  final Future<void> Function(SheetMetronomeSettings settings)
  onMetronomeSettingsChanged;
  final VoidCallback onOpenTuner;
  final VoidCallback onClose;

  @override
  State<_ViewerMiniToolPanel> createState() => _ViewerMiniToolPanelState();
}

class _ViewerMiniToolPanelState extends State<_ViewerMiniToolPanel> {
  late final SheetMetronomeSoundPlayer _soundPlayer;
  Timer? _timer;
  late SheetMetronomeBeat _beat;
  bool _isRunning = false;
  int _countInPulsesLeft = 0;

  @override
  void initState() {
    super.initState();
    _soundPlayer = SheetMetronomeSoundPlayer();
    _beat = _initialBeat(widget.metronomeSettings);
  }

  @override
  void didUpdateWidget(covariant _ViewerMiniToolPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.metronomeSettings != widget.metronomeSettings ||
        oldWidget.tool != widget.tool) {
      _beat = _initialBeat(widget.metronomeSettings);
      if (_isRunning) {
        _restartTimer();
      }
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  SheetMetronomeBeat _initialBeat(SheetMetronomeSettings settings) {
    return SheetMetronomeBeat(
      beatIndex: 0,
      beatsPerBar: settings.meter.beatsPerBar,
      pulsesPerBeat: settings.subdivision.pulsesPerBeat,
    );
  }

  void _toggleRunning() {
    if (_isRunning) {
      _timer?.cancel();
      setState(() {
        _isRunning = false;
        _countInPulsesLeft = 0;
      });
      return;
    }
    setState(() {
      _isRunning = true;
      _beat = _initialBeat(widget.metronomeSettings);
      _countInPulsesLeft = _countInTotalPulses;
    });
    _playTick();
    _consumeCountInPulse();
    _restartTimer();
  }

  void _restartTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(
      widget.metronomeSettings.pulseDuration,
      (_) => _advanceBeat(),
    );
  }

  void _advanceBeat() {
    if (!mounted) {
      return;
    }
    setState(() {
      _beat = _beat.next();
      _consumeCountInPulse();
    });
    _playTick();
  }

  int get _countInTotalPulses =>
      widget.metronomeSettings.countInBars *
      widget.metronomeSettings.meter.beatsPerBar *
      widget.metronomeSettings.subdivision.pulsesPerBeat;

  bool get _isCountingIn => _isRunning && _countInPulsesLeft > 0;

  void _consumeCountInPulse() {
    if (_countInPulsesLeft <= 0) {
      return;
    }
    _countInPulsesLeft--;
    if (_countInPulsesLeft == 0) {
      _beat = _initialBeat(widget.metronomeSettings);
    }
  }

  void _playTick() {
    if (!widget.metronomeSettings.soundEnabled || !_beat.isBeatStart) {
      return;
    }
    unawaited(
      _soundPlayer.playClick(
        settings: widget.metronomeSettings,
        accent: widget.metronomeSettings.isAccentBeat(_beat),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      elevation: 8,
      color: theme.colorScheme.surface,
      borderRadius: BorderRadius.circular(8),
      clipBehavior: Clip.antiAlias,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 280),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
          child: widget.tool == _ViewerMiniTool.metronome
              ? _buildMetronome(context)
              : _buildTuner(context),
        ),
      ),
    );
  }

  Widget _buildMetronome(BuildContext context) {
    final theme = Theme.of(context);
    final settings = widget.metronomeSettings;
    final countInLabel = settings.countInBars == 0
        ? ''
        : ' · ${settings.countInBars}마디';
    final countInBeatsLeft =
        (_countInPulsesLeft / settings.subdivision.pulsesPerBeat).ceil();
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.speed, size: 18),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                _isCountingIn
                    ? '카운트인 $countInBeatsLeft박'
                    : '${settings.bpm} BPM · ${settings.meter.label}$countInLabel · ${settings.soundEnabled ? '소리 ${settings.volumePercent}%' : '시각'}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            IconButton(
              tooltip: '닫기',
              onPressed: widget.onClose,
              icon: const Icon(Icons.close),
            ),
          ],
        ),
        const SizedBox(height: 8),
        _MiniMetronomePulseStrip(
          beat: _beat,
          isRunning: _isRunning,
          isCountingIn: _isCountingIn,
          settings: settings,
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            FilledButton.tonalIcon(
              onPressed: _toggleRunning,
              icon: Icon(_isRunning ? Icons.stop : Icons.play_arrow),
              label: Text(_isRunning ? '정지' : '시작'),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                settings.soundEnabled
                    ? '소리 ${settings.volumePercent}% · 화면 표시'
                    : '화면 표시만',
                textAlign: TextAlign.end,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildTuner(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.tune, size: 18),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                '크로매틱 튜너',
                style: theme.textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            IconButton(
              tooltip: '닫기',
              onPressed: widget.onClose,
              icon: const Icon(Icons.close),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          '상세 화면에서 현재 음과 pitch history를 봅니다.',
          style: theme.textTheme.bodySmall,
        ),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerRight,
          child: FilledButton.tonalIcon(
            onPressed: widget.onOpenTuner,
            icon: const Icon(Icons.open_in_full),
            label: const Text('튜너 열기'),
          ),
        ),
      ],
    );
  }
}

class _MiniMetronomePulseStrip extends StatelessWidget {
  const _MiniMetronomePulseStrip({
    required this.beat,
    required this.isRunning,
    required this.isCountingIn,
    required this.settings,
  });

  final SheetMetronomeBeat beat;
  final bool isRunning;
  final bool isCountingIn;
  final SheetMetronomeSettings settings;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Semantics(
      label: '메트로놈 시각 박자 표시',
      child: Row(
        children: List<Widget>.generate(settings.meter.beatsPerBar, (index) {
          final isCurrent = isRunning && index == beat.beatIndex;
          final isAccent = settings.normalizedAccentBeatIndexes.contains(index);
          final isActiveAccent =
              settings.accentEnabled && settings.isAccentBeat(beat);
          final Color activeColor = isCountingIn
              ? colors.secondary
              : isActiveAccent
              ? colors.primary
              : colors.tertiary;
          return Expanded(
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 120),
              curve: Curves.easeOutCubic,
              height: isCurrent ? 12 : 7,
              margin: EdgeInsets.only(
                right: index == settings.meter.beatsPerBar - 1 ? 0 : 4,
              ),
              decoration: BoxDecoration(
                color: isCurrent ? activeColor : colors.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(99),
                border: Border.all(
                  color: isAccent
                      ? colors.primary.withValues(alpha: 0.54)
                      : colors.outlineVariant,
                  width: isAccent ? 1.2 : 0.8,
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}

class _ScrollableAppBarActions extends StatefulWidget {
  const _ScrollableAppBarActions({required this.children});

  final List<Widget> children;

  @override
  State<_ScrollableAppBarActions> createState() =>
      _ScrollableAppBarActionsState();
}

class _ScrollableAppBarActionsState extends State<_ScrollableAppBarActions> {
  final ScrollController _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final availableWidth = math.max(
      0.0,
      MediaQuery.sizeOf(context).width - kToolbarHeight - 8,
    );
    return SizedBox(
      width: availableWidth,
      height: kToolbarHeight,
      child: Scrollbar(
        controller: _scrollController,
        thumbVisibility: false,
        child: SingleChildScrollView(
          controller: _scrollController,
          scrollDirection: Axis.horizontal,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (final child in widget.children)
                _AppBarActionSlot(child: child),
            ],
          ),
        ),
      ),
    );
  }
}

class _AppBarActionSlot extends StatelessWidget {
  const _AppBarActionSlot({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final minWidth = child is Center ? 72.0 : kToolbarHeight;
    return SizedBox(
      width: minWidth,
      height: kToolbarHeight,
      child: Center(child: child),
    );
  }
}

class _PendingPageRotationBanner extends StatelessWidget {
  const _PendingPageRotationBanner({
    required this.rotationCount,
    required this.onApply,
  });

  final int rotationCount;
  final VoidCallback onApply;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final maxWidth = (MediaQuery.sizeOf(context).width - 16)
        .clamp(220.0, 360.0)
        .toDouble();
    return Material(
      color: theme.colorScheme.surface.withValues(alpha: 0.94),
      elevation: 4,
      borderRadius: BorderRadius.circular(8),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(10, 8, 8, 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.rotate_right_outlined,
                size: 18,
                color: theme.colorScheme.primary,
              ),
              const SizedBox(width: 8),
              Flexible(
                child: Text(
                  '$rotationCount쪽 회전 대기',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.labelLarge,
                ),
              ),
              const SizedBox(width: 8),
              TextButton.icon(
                onPressed: onApply,
                icon: const Icon(Icons.check, size: 18),
                label: const Text('적용'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ScoreNotesSheet extends StatefulWidget {
  const _ScoreNotesSheet({required this.initialNotes});

  final SheetScoreNotes initialNotes;

  @override
  State<_ScoreNotesSheet> createState() => _ScoreNotesSheetState();
}

class _ScoreNotesSheetState extends State<_ScoreNotesSheet> {
  late final TextEditingController _performanceController;
  late final TextEditingController _rehearsalController;
  late final TextEditingController _tuningController;
  late final TextEditingController _instrumentationController;

  @override
  void initState() {
    super.initState();
    _performanceController = TextEditingController(
      text: widget.initialNotes.performance,
    );
    _rehearsalController = TextEditingController(
      text: widget.initialNotes.rehearsal,
    );
    _tuningController = TextEditingController(text: widget.initialNotes.tuning);
    _instrumentationController = TextEditingController(
      text: widget.initialNotes.instrumentation,
    );
  }

  @override
  void dispose() {
    _performanceController.dispose();
    _rehearsalController.dispose();
    _tuningController.dispose();
    _instrumentationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          bottom: MediaQuery.viewInsetsOf(context).bottom + 24,
        ),
        child: ListView(
          shrinkWrap: true,
          children: [
            Text(
              '악보 메모',
              style: Theme.of(context).textTheme.titleLarge
                  ?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 12),
            _NoteTextField(controller: _performanceController, label: '공연 메모'),
            _NoteTextField(controller: _rehearsalController, label: '리허설 메모'),
            _NoteTextField(controller: _tuningController, label: '조율 메모'),
            _NoteTextField(
              controller: _instrumentationController,
              label: '악기/편성 메모',
            ),
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerRight,
              child: FilledButton.icon(
                onPressed: () => Navigator.of(context).pop(
                  SheetScoreNotes(
                    performance: _performanceController.text,
                    rehearsal: _rehearsalController.text,
                    tuning: _tuningController.text,
                    instrumentation: _instrumentationController.text,
                  ),
                ),
                icon: const Icon(Icons.check),
                label: const Text('저장'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NoteTextField extends StatelessWidget {
  const _NoteTextField({required this.controller, required this.label});

  final TextEditingController controller;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: TextField(
        controller: controller,
        decoration: InputDecoration(labelText: label),
        maxLines: 3,
      ),
    );
  }
}

class _PerformanceSettingsSheet extends StatefulWidget {
  const _PerformanceSettingsSheet({
    required this.initialSettings,
    required this.presetTemplates,
    required this.onSavePresetTemplate,
    required this.onDeletePresetTemplate,
  });

  final SheetViewerSettings initialSettings;
  final List<SheetPerformancePresetTemplate> presetTemplates;
  final Future<SheetPerformancePresetTemplate> Function(
    String name,
    SheetViewerSettings viewerSettings,
    String deviceProfile,
  )
  onSavePresetTemplate;
  final Future<bool> Function(String templateId) onDeletePresetTemplate;

  @override
  State<_PerformanceSettingsSheet> createState() =>
      _PerformanceSettingsSheetState();
}

class _PerformanceSettingsSheetState extends State<_PerformanceSettingsSheet> {
  late var _settings = widget.initialSettings;
  late var _presetTemplates = widget.presetTemplates;
  final _templateNameController = TextEditingController();
  final _templateDeviceController = TextEditingController();

  @override
  void dispose() {
    _templateNameController.dispose();
    _templateDeviceController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SafeArea(
      child: ListView(
        shrinkWrap: true,
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          Row(
            children: [
              const Icon(Icons.fullscreen),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  '공연 모드',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('공연 준비 안내'),
            subtitle: const Text('진입 시 자동 잠금/알림/제스처 확인'),
            value: _settings.showPerformancePrepNotice,
            onChanged: (value) => setState(
              () => _settings = _settings.copyWith(
                showPerformancePrepNotice: value,
              ),
            ),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('화면 켜짐 유지 확인'),
            subtitle: const Text('앱 안내와 함께 기기 자동 잠금 설정 확인'),
            value: _settings.keepAwakeInPerformance,
            onChanged: (value) => setState(
              () =>
                  _settings = _settings.copyWith(keepAwakeInPerformance: value),
            ),
          ),
          const Divider(),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('곡 전환 전 확인'),
            subtitle: const Text('세트리스트 경계에서 실수 이동 방지'),
            value: _settings.confirmSetlistTransition,
            onChanged: (value) => setState(
              () => _settings = _settings.copyWith(
                confirmSetlistTransition: value,
              ),
            ),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('곡 끝에서 자동 이동'),
            subtitle: const Text('다음 페이지 입력 시 다음 곡으로 이동'),
            value: _settings.autoAdvanceSetlist,
            onChanged: (value) => setState(
              () => _settings = _settings.copyWith(autoAdvanceSetlist: value),
            ),
          ),
          const Divider(),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('공연 중 필기 허용'),
            subtitle: const Text('꺼두면 필기 도구와 입력을 잠금'),
            value: _settings.allowPerformanceAnnotations,
            onChanged: (value) => setState(
              () => _settings = _settings.copyWith(
                allowPerformanceAnnotations: value,
              ),
            ),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('공연 중 메뉴 허용'),
            subtitle: const Text('꺼두면 편집/정리 메뉴를 숨김'),
            value: _settings.allowPerformanceMenus,
            onChanged: (value) => setState(
              () =>
                  _settings = _settings.copyWith(allowPerformanceMenus: value),
            ),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('공연 중 PDF 링크 허용'),
            subtitle: const Text('외부 URL 링크 차단 정책은 유지'),
            value: _settings.allowPerformancePdfLinks,
            onChanged: (value) => setState(
              () => _settings = _settings.copyWith(
                allowPerformancePdfLinks: value,
              ),
            ),
          ),
          const Divider(),
          _buildPresetTemplates(context),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton.icon(
              onPressed: () => Navigator.of(context).pop(_settings),
              icon: const Icon(Icons.check),
              label: const Text('저장'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPresetTemplates(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '공연 보기 프리셋',
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _templateNameController,
          decoration: const InputDecoration(
            labelText: '프리셋 이름',
            prefixIcon: Icon(Icons.bookmark_add_outlined),
          ),
          textInputAction: TextInputAction.next,
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _templateDeviceController,
          decoration: const InputDecoration(
            labelText: '장비 메모',
            prefixIcon: Icon(Icons.devices_other),
          ),
          textInputAction: TextInputAction.done,
        ),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerRight,
          child: OutlinedButton.icon(
            onPressed: _saveCurrentPresetTemplate,
            icon: const Icon(Icons.save_outlined),
            label: const Text('현재 설정 저장'),
          ),
        ),
        if (_presetTemplates.isNotEmpty) ...[
          const SizedBox(height: 8),
          for (final template in _presetTemplates)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.tune),
              title: Text(template.name),
              subtitle: Text(_presetTemplateSubtitle(template)),
              onTap: () => setState(() {
                _settings = template.viewerSettings;
              }),
              trailing: IconButton(
                tooltip: '삭제',
                icon: const Icon(Icons.delete_outline),
                onPressed: () => _deletePresetTemplate(template),
              ),
            ),
        ],
      ],
    );
  }

  Future<void> _saveCurrentPresetTemplate() async {
    final template = await widget.onSavePresetTemplate(
      _templateNameController.text,
      _settings,
      _templateDeviceController.text,
    );
    if (!mounted) {
      return;
    }
    setState(() {
      _presetTemplates = SheetPerformancePresetTemplate.normalizeList([
        for (final item in _presetTemplates)
          if (item.id != template.id) item,
        template,
      ]);
      _templateNameController.clear();
      _templateDeviceController.clear();
    });
  }

  Future<void> _deletePresetTemplate(
    SheetPerformancePresetTemplate template,
  ) async {
    final didDelete = await widget.onDeletePresetTemplate(template.id);
    if (!mounted || !didDelete) {
      return;
    }
    setState(() {
      _presetTemplates = _presetTemplates
          .where((item) => item.id != template.id)
          .toList(growable: false);
    });
  }

  String _presetTemplateSubtitle(SheetPerformancePresetTemplate template) {
    final parts = <String>[
      template.viewerSettings.displayMode,
      template.viewerSettings.pageScale,
      template.viewerSettings.pedalMapping,
      if (template.deviceProfile.trim().isNotEmpty)
        template.deviceProfile.trim(),
    ];
    return parts.join(' · ');
  }
}

class _ViewerLoadingBanner extends StatelessWidget {
  const _ViewerLoadingBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Card(
        margin: const EdgeInsets.all(24),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const CircularProgressIndicator(),
                const SizedBox(height: 12),
                Text(
                  message,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  '큰 PDF나 클라우드에서 가져온 파일은 첫 렌더링에 시간이 걸릴 수 있습니다.',
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ViewerFileStatusBanner extends StatelessWidget {
  const _ViewerFileStatusBanner({required this.status});

  final SheetViewerFileStatus status;

  @override
  Widget build(BuildContext context) {
    final detail = status.sizeBytes > 0
        ? '파일 크기: ${status.sizeBytes} bytes'
        : status.path;
    return _ViewerProblemBanner(
      icon: Icons.picture_as_pdf_outlined,
      title: status.title,
      message: status.message,
      detail: detail,
    );
  }
}

class _ViewerErrorBanner extends StatelessWidget {
  const _ViewerErrorBanner({required this.filePath, required this.error});

  final String filePath;
  final Object error;

  @override
  Widget build(BuildContext context) {
    return _ViewerProblemBanner(
      icon: Icons.picture_as_pdf_outlined,
      title: 'PDF를 열지 못했습니다.',
      message: '파일이 삭제되었거나 손상되었을 수 있습니다. 다시 가져오거나 전체 백업을 복원해주세요.',
      detail: '$filePath\n$error',
    );
  }
}

class _ViewerProblemBanner extends StatelessWidget {
  const _ViewerProblemBanner({
    required this.icon,
    required this.title,
    required this.message,
    required this.detail,
  });

  final IconData icon;
  final String title;
  final String message;
  final String detail;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Card(
        margin: const EdgeInsets.all(24),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 460),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 42, color: theme.colorScheme.error),
                const SizedBox(height: 12),
                Text(
                  title,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 8),
                Text(message, textAlign: TextAlign.center),
                const SizedBox(height: 12),
                SelectableText(
                  detail,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CropMaskPainter extends CustomPainter {
  const _CropMaskPainter({required this.crop, required this.color});

  final SheetCropSettings crop;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    if (!crop.hasCrop || size.isEmpty) {
      return;
    }

    final paint = Paint()..color = color;
    final left = crop.left * size.width;
    final top = crop.top * size.height;
    final right = crop.right * size.width;
    final bottom = crop.bottom * size.height;

    if (top > 0) {
      canvas.drawRect(Rect.fromLTWH(0, 0, size.width, top), paint);
    }
    if (bottom > 0) {
      canvas.drawRect(
        Rect.fromLTWH(0, size.height - bottom, size.width, bottom),
        paint,
      );
    }
    if (left > 0) {
      canvas.drawRect(
        Rect.fromLTWH(0, top, left, size.height - top - bottom),
        paint,
      );
    }
    if (right > 0) {
      canvas.drawRect(
        Rect.fromLTWH(
          size.width - right,
          top,
          right,
          size.height - top - bottom,
        ),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _CropMaskPainter oldDelegate) {
    return oldDelegate.crop != crop || oldDelegate.color != color;
  }
}

class _PageMetadataBadge extends StatelessWidget {
  const _PageMetadataBadge({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.58),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        child: Text(
          label,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 12,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

class _CropSettingsSheet extends StatefulWidget {
  const _CropSettingsSheet({required this.initialCrop});

  final SheetCropSettings initialCrop;

  @override
  State<_CropSettingsSheet> createState() => _CropSettingsSheetState();
}

class _CropSettingsSheetState extends State<_CropSettingsSheet> {
  late SheetCropSettings _crop = widget.initialCrop;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        shrinkWrap: true,
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          Text('자르기 맞춤', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 4),
          Text(
            '원본 PDF는 그대로 두고, 뷰어에서 선택한 영역을 화면에 맞춥니다.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 12),
          _CropSlider(
            label: '위',
            value: _crop.top,
            onChanged: (value) =>
                setState(() => _crop = _crop.copyWith(top: value)),
          ),
          _CropSlider(
            label: '아래',
            value: _crop.bottom,
            onChanged: (value) =>
                setState(() => _crop = _crop.copyWith(bottom: value)),
          ),
          _CropSlider(
            label: '왼쪽',
            value: _crop.left,
            onChanged: (value) =>
                setState(() => _crop = _crop.copyWith(left: value)),
          ),
          _CropSlider(
            label: '오른쪽',
            value: _crop.right,
            onChanged: (value) =>
                setState(() => _crop = _crop.copyWith(right: value)),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              TextButton.icon(
                onPressed: () => setState(() => _crop = SheetCropSettings.none),
                icon: const Icon(Icons.restart_alt),
                label: const Text('초기화'),
              ),
              const Spacer(),
              FilledButton.icon(
                onPressed: () => Navigator.of(context).pop(_crop.normalized()),
                icon: const Icon(Icons.check),
                label: const Text('저장'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _CropSlider extends StatelessWidget {
  const _CropSlider({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final double value;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(width: 44, child: Text(label)),
        Expanded(
          child: Slider(
            value: value,
            min: 0,
            max: 0.35,
            divisions: 35,
            label: '${(value * 100).round()}%',
            onChanged: onChanged,
          ),
        ),
        SizedBox(
          width: 44,
          child: Text('${(value * 100).round()}%', textAlign: TextAlign.end),
        ),
      ],
    );
  }
}

class _QuickJumpButtons extends StatelessWidget {
  const _QuickJumpButtons({
    required this.jumpPoints,
    required this.onJump,
    required this.rehearsalMarks,
    required this.bookmarks,
    required this.onPageSelected,
  });

  final List<SheetPageJumpPoint> jumpPoints;
  final ValueChanged<SheetPageJumpPoint> onJump;
  final List<SheetRehearsalMark> rehearsalMarks;
  final List<SheetBookmark> bookmarks;
  final ValueChanged<int> onPageSelected;

  @override
  Widget build(BuildContext context) {
    final visibleJumpPoints = jumpPoints.take(2).toList(growable: false);
    final overflowJumpPoints = jumpPoints.skip(2).toList(growable: false);
    final overflowCount =
        overflowJumpPoints.length + rehearsalMarks.length + bookmarks.length;
    return Material(
      color: Colors.black.withValues(alpha: 0.64),
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.all(4),
        child: Wrap(
          spacing: 4,
          runSpacing: 4,
          children: [
            for (final jumpPoint in visibleJumpPoints)
              IconButton(
                color: Colors.white,
                tooltip:
                    '${jumpPoint.label}: '
                    '${jumpPoint.sourcePage}쪽에서 '
                    '${jumpPoint.targetPage}쪽으로',
                visualDensity: VisualDensity.compact,
                onPressed: () => onJump(jumpPoint),
                icon: const Icon(Icons.keyboard_tab),
              ),
            if (overflowCount > 0)
              PopupMenuButton<Object>(
                tooltip: '빠른 이동 $overflowCount개',
                icon: Text(
                  '+$overflowCount',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                onSelected: (value) {
                  if (value is SheetPageJumpPoint) {
                    onJump(value);
                  } else if (value is SheetRehearsalMark) {
                    onPageSelected(value.pageNumber);
                  } else if (value is SheetBookmark) {
                    onPageSelected(value.pageNumber);
                  }
                },
                itemBuilder: (context) => [
                  for (final jumpPoint in overflowJumpPoints)
                    PopupMenuItem<Object>(
                      value: jumpPoint,
                      child: Text(
                        '${jumpPoint.label} · ${jumpPoint.targetPage}쪽',
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  for (final mark in rehearsalMarks)
                    PopupMenuItem<Object>(
                      value: mark,
                      child: Text(
                        '${mark.label} · '
                        '${_rehearsalMarkKindLabel(mark.kind)} · '
                        '${mark.pageNumber}쪽',
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  for (final bookmark in bookmarks)
                    PopupMenuItem<Object>(
                      value: bookmark,
                      child: Text(
                        '${bookmark.label} · 북마크 · ${bookmark.pageNumber}쪽',
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                ],
                constraints: const BoxConstraints(minWidth: 180, maxWidth: 280),
              ),
          ],
        ),
      ),
    );
  }
}

class _AnnotationPageOverlay extends StatefulWidget {
  const _AnnotationPageOverlay({
    required this.isEnabled,
    required this.pageNumber,
    required this.strokes,
    required this.texts,
    required this.draftPoints,
    required this.draftTool,
    required this.draftColor,
    required this.draftWidth,
    required this.onPanStart,
    required this.onPanUpdate,
    required this.onPanEnd,
    required this.onTapUp,
  });

  final bool isEnabled;
  final int pageNumber;
  final List<SheetAnnotationStroke> strokes;
  final List<SheetTextAnnotation> texts;
  final List<SheetAnnotationPoint> draftPoints;
  final _AnnotationToolbarTool draftTool;
  final int draftColor;
  final double draftWidth;
  final Future<void> Function(
    DragStartDetails details,
    SheetAnnotationPageGeometry geometry,
    int pageNumber,
    double pressure,
  )
  onPanStart;
  final Future<void> Function(
    DragUpdateDetails details,
    SheetAnnotationPageGeometry geometry,
    int pageNumber,
    double pressure,
  )
  onPanUpdate;
  final Future<void> Function() onPanEnd;
  final Future<void> Function(
    TapUpDetails details,
    SheetAnnotationPageGeometry geometry,
    int pageNumber,
  )
  onTapUp;

  @override
  State<_AnnotationPageOverlay> createState() => _AnnotationPageOverlayState();
}

class _AnnotationPageOverlayState extends State<_AnnotationPageOverlay> {
  static const SheetStylusInputPolicy _stylusInputPolicy =
      SheetStylusInputPolicy();

  int? _activePointer;
  PointerDeviceKind? _latestPointerKind;
  DateTime? _rejectTouchUntil;
  double _latestPressure = 1.0;

  void _recordPointerPressure(PointerEvent event) {
    final now = DateTime.now();
    _latestPointerKind = event.kind;
    if (_stylusInputPolicy.shouldRejectTouch(
      kind: event.kind,
      now: now,
      rejectTouchUntil: _rejectTouchUntil,
    )) {
      if (_activePointer == null || _activePointer == event.pointer) {
        _activePointer = event.pointer;
        _latestPressure = 1.0;
      }
      return;
    }
    if (_activePointer != null && _activePointer != event.pointer) {
      return;
    }
    _activePointer = event.pointer;
    _latestPressure = _pressureMultiplierFor(event);
    if (event.kind == PointerDeviceKind.stylus) {
      _rejectTouchUntil = _stylusInputPolicy.rejectTouchUntil(now);
    }
  }

  void _clearPointerPressure(PointerEvent event) {
    if (_activePointer == event.pointer) {
      if (_latestPointerKind == PointerDeviceKind.stylus) {
        _rejectTouchUntil = _stylusInputPolicy.rejectTouchUntil(DateTime.now());
      }
      _activePointer = null;
      _latestPressure = 1.0;
    }
  }

  double _pressureMultiplierFor(PointerEvent event) {
    return _stylusInputPolicy.pressureMultiplierFor(
      kind: event.kind,
      pressure: event.pressure,
      pressureMin: event.pressureMin,
      pressureMax: event.pressureMax,
    );
  }

  bool get _shouldRejectCurrentGesture {
    final latestKind = _latestPointerKind;
    if (latestKind == null) {
      return false;
    }
    return _stylusInputPolicy.shouldRejectTouch(
      kind: latestKind,
      now: DateTime.now(),
      rejectTouchUntil: _rejectTouchUntil,
    );
  }

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      ignoring: !widget.isEnabled,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final size = constraints.biggest;
          final geometry = SheetAnnotationPageGeometry(
            pageRect: Offset.zero & size,
          );
          return Listener(
            onPointerDown: widget.isEnabled ? _recordPointerPressure : null,
            onPointerMove: widget.isEnabled ? _recordPointerPressure : null,
            onPointerUp: widget.isEnabled ? _clearPointerPressure : null,
            onPointerCancel: widget.isEnabled ? _clearPointerPressure : null,
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onPanStart: widget.isEnabled
                  ? (details) {
                      if (_shouldRejectCurrentGesture) {
                        return;
                      }
                      unawaited(
                        widget.onPanStart(
                          details,
                          geometry,
                          widget.pageNumber,
                          _latestPressure,
                        ),
                      );
                    }
                  : null,
              onPanUpdate: widget.isEnabled
                  ? (details) {
                      if (_shouldRejectCurrentGesture) {
                        return;
                      }
                      unawaited(
                        widget.onPanUpdate(
                          details,
                          geometry,
                          widget.pageNumber,
                          _latestPressure,
                        ),
                      );
                    }
                  : null,
              onPanEnd: widget.isEnabled
                  ? (_) => unawaited(widget.onPanEnd())
                  : null,
              onPanCancel: widget.isEnabled
                  ? () => unawaited(widget.onPanEnd())
                  : null,
              onTapUp: widget.isEnabled
                  ? (details) {
                      if (_shouldRejectCurrentGesture) {
                        return;
                      }
                      unawaited(
                        widget.onTapUp(details, geometry, widget.pageNumber),
                      );
                    }
                  : null,
              child: CustomPaint(
                painter: _AnnotationPainter(
                  strokes: widget.strokes,
                  texts: widget.texts,
                  draftStroke: _draftStroke,
                ),
                size: Size.infinite,
              ),
            ),
          );
        },
      ),
    );
  }

  SheetAnnotationStroke? get _draftStroke {
    if (widget.draftPoints.isEmpty ||
        widget.draftTool == _AnnotationToolbarTool.eraser ||
        widget.draftTool == _AnnotationToolbarTool.stamp) {
      return null;
    }
    return SheetAnnotationStroke(
      id: 'draft',
      pageNumber: 1,
      tool: widget.draftTool.sheetAnnotationTool,
      color: widget.draftColor,
      width: widget.draftWidth,
      points: widget.draftPoints,
      createdAt: DateTime.fromMillisecondsSinceEpoch(0),
    );
  }
}

class _AnnotationPainter extends CustomPainter {
  const _AnnotationPainter({
    required this.strokes,
    required this.texts,
    required this.draftStroke,
  });

  final List<SheetAnnotationStroke> strokes;
  final List<SheetTextAnnotation> texts;
  final SheetAnnotationStroke? draftStroke;

  @override
  void paint(Canvas canvas, Size size) {
    for (final stroke in <SheetAnnotationStroke>[...strokes, ?draftStroke]) {
      _paintStroke(canvas, size, stroke);
    }
    for (final text in texts) {
      _paintText(canvas, size, text);
    }
  }

  void _paintStroke(Canvas canvas, Size size, SheetAnnotationStroke stroke) {
    if (stroke.points.isEmpty) {
      return;
    }
    final color = Color(stroke.color);
    final baseStrokeWidth = stroke.tool == SheetAnnotationTool.highlighter
        ? stroke.width * 1.9
        : stroke.width;
    final paint = Paint()
      ..color = stroke.tool == SheetAnnotationTool.highlighter
          ? color.withValues(alpha: 0.32)
          : color.withValues(alpha: 0.96)
      ..strokeWidth = baseStrokeWidth
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;

    if (stroke.tool == SheetAnnotationTool.rectangle &&
        stroke.points.length >= 2) {
      final rect = Rect.fromPoints(
        Offset(
          stroke.points.first.x * size.width,
          stroke.points.first.y * size.height,
        ),
        Offset(
          stroke.points.last.x * size.width,
          stroke.points.last.y * size.height,
        ),
      );
      canvas.drawRect(rect, paint);
      return;
    }

    if (stroke.tool == SheetAnnotationTool.staff && stroke.points.length >= 2) {
      _paintStaffGuide(canvas, size, stroke, paint);
      return;
    }

    if (stroke.tool == SheetAnnotationTool.grid && stroke.points.length >= 2) {
      _paintGridGuide(canvas, size, stroke, paint);
      return;
    }

    if ((stroke.tool == SheetAnnotationTool.crescendo ||
            stroke.tool == SheetAnnotationTool.diminuendo) &&
        stroke.points.length >= 2) {
      _paintHairpin(canvas, size, stroke, paint);
      return;
    }

    if (stroke.tool != SheetAnnotationTool.line &&
        stroke.tool != SheetAnnotationTool.arrow) {
      _paintFreehandStroke(canvas, size, stroke, paint, baseStrokeWidth);
      return;
    }

    final path = Path()
      ..moveTo(
        stroke.points.first.x * size.width,
        stroke.points.first.y * size.height,
      );
    for (final point in stroke.points.skip(1)) {
      path.lineTo(point.x * size.width, point.y * size.height);
    }
    canvas.drawPath(path, paint);
    if (stroke.tool == SheetAnnotationTool.arrow && stroke.points.length >= 2) {
      _paintArrowHead(canvas, size, stroke, paint);
    }
  }

  void _paintFreehandStroke(
    Canvas canvas,
    Size size,
    SheetAnnotationStroke stroke,
    Paint paint,
    double baseStrokeWidth,
  ) {
    if (stroke.tool == SheetAnnotationTool.highlighter) {
      _paintContinuousStrokePath(canvas, size, stroke, paint, baseStrokeWidth);
      return;
    }
    if (stroke.points.length == 1) {
      paint.strokeWidth = _pressureStrokeWidth(
        baseStrokeWidth,
        stroke.points.single.pressure,
      );
      final center = _pointOffset(stroke.points.single, size);
      canvas.drawLine(center, center.translate(0.1, 0.1), paint);
      return;
    }
    for (var index = 0; index < stroke.points.length - 1; index += 1) {
      final start = stroke.points[index];
      final end = stroke.points[index + 1];
      paint.strokeWidth = _pressureStrokeWidth(
        baseStrokeWidth,
        (start.pressure + end.pressure) / 2,
      );
      canvas.drawLine(
        _pointOffset(start, size),
        _pointOffset(end, size),
        paint,
      );
    }
  }

  void _paintContinuousStrokePath(
    Canvas canvas,
    Size size,
    SheetAnnotationStroke stroke,
    Paint paint,
    double baseStrokeWidth,
  ) {
    paint.strokeWidth = baseStrokeWidth;
    if (stroke.points.length == 1) {
      final center = _pointOffset(stroke.points.single, size);
      canvas.drawLine(center, center.translate(0.1, 0.1), paint);
      return;
    }

    final path = Path()
      ..moveTo(
        stroke.points.first.x * size.width,
        stroke.points.first.y * size.height,
      );
    if (stroke.points.length == 2) {
      path.lineTo(
        stroke.points.last.x * size.width,
        stroke.points.last.y * size.height,
      );
    } else {
      for (var index = 1; index < stroke.points.length - 1; index += 1) {
        final current = _pointOffset(stroke.points[index], size);
        final next = _pointOffset(stroke.points[index + 1], size);
        final midpoint = Offset(
          (current.dx + next.dx) / 2,
          (current.dy + next.dy) / 2,
        );
        path.quadraticBezierTo(
          current.dx,
          current.dy,
          midpoint.dx,
          midpoint.dy,
        );
      }
      final last = _pointOffset(stroke.points.last, size);
      path.lineTo(last.dx, last.dy);
    }
    canvas.drawPath(path, paint);
  }

  Rect _shapeRect(Size size, SheetAnnotationStroke stroke) {
    return Rect.fromPoints(
      Offset(
        stroke.points.first.x * size.width,
        stroke.points.first.y * size.height,
      ),
      Offset(
        stroke.points.last.x * size.width,
        stroke.points.last.y * size.height,
      ),
    );
  }

  void _paintStaffGuide(
    Canvas canvas,
    Size size,
    SheetAnnotationStroke stroke,
    Paint paint,
  ) {
    final rect = _shapeRect(size, stroke);
    final top = math.min(rect.top, rect.bottom);
    final bottom = math.max(rect.top, rect.bottom);
    final left = math.min(rect.left, rect.right);
    final right = math.max(rect.left, rect.right);
    final height = (bottom - top).abs();
    final lineGap = height <= 1 ? 6.0 : height / 4;
    final startY = height <= 1 ? top - (lineGap * 2) : top;
    final guidePaint = Paint()
      ..color = paint.color.withValues(alpha: 0.72)
      ..strokeWidth = paint.strokeWidth.clamp(1.0, 4.0).toDouble()
      ..strokeCap = StrokeCap.round;
    for (var index = 0; index < 5; index += 1) {
      final y = startY + (lineGap * index);
      canvas.drawLine(Offset(left, y), Offset(right, y), guidePaint);
    }
  }

  void _paintGridGuide(
    Canvas canvas,
    Size size,
    SheetAnnotationStroke stroke,
    Paint paint,
  ) {
    final rect = _shapeRect(size, stroke);
    final normalized = Rect.fromLTRB(
      math.min(rect.left, rect.right),
      math.min(rect.top, rect.bottom),
      math.max(rect.left, rect.right),
      math.max(rect.top, rect.bottom),
    );
    final guidePaint = Paint()
      ..color = paint.color.withValues(alpha: 0.44)
      ..strokeWidth = paint.strokeWidth.clamp(0.8, 2.4).toDouble()
      ..strokeCap = StrokeCap.square;
    const divisions = 4;
    for (var index = 0; index <= divisions; index += 1) {
      final t = index / divisions;
      final x = normalized.left + (normalized.width * t);
      final y = normalized.top + (normalized.height * t);
      canvas
        ..drawLine(
          Offset(x, normalized.top),
          Offset(x, normalized.bottom),
          guidePaint,
        )
        ..drawLine(
          Offset(normalized.left, y),
          Offset(normalized.right, y),
          guidePaint,
        );
    }
  }

  Offset _pointOffset(SheetAnnotationPoint point, Size size) {
    return Offset(point.x * size.width, point.y * size.height);
  }

  double _pressureStrokeWidth(double baseStrokeWidth, double pressure) {
    return (baseStrokeWidth * pressure).clamp(0.5, 48.0).toDouble();
  }

  void _paintHairpin(
    Canvas canvas,
    Size size,
    SheetAnnotationStroke stroke,
    Paint paint,
  ) {
    final start = _pointOffset(stroke.points.first, size);
    final end = _pointOffset(stroke.points.last, size);
    final vector = end - start;
    if (vector.distance < 2) {
      canvas.drawLine(start, start.translate(0.1, 0.1), paint);
      return;
    }
    final normal = Offset(-vector.dy, vector.dx) / vector.distance;
    final opening = (paint.strokeWidth * 5).clamp(14.0, 38.0).toDouble();
    final halfOpening = opening / 2;
    final closed = stroke.tool == SheetAnnotationTool.crescendo ? start : end;
    final open = stroke.tool == SheetAnnotationTool.crescendo ? end : start;
    final upper = open + (normal * halfOpening);
    final lower = open - (normal * halfOpening);
    canvas
      ..drawLine(closed, upper, paint)
      ..drawLine(closed, lower, paint);
  }

  void _paintArrowHead(
    Canvas canvas,
    Size size,
    SheetAnnotationStroke stroke,
    Paint paint,
  ) {
    final start = Offset(
      stroke.points[stroke.points.length - 2].x * size.width,
      stroke.points[stroke.points.length - 2].y * size.height,
    );
    final end = Offset(
      stroke.points.last.x * size.width,
      stroke.points.last.y * size.height,
    );
    if ((end - start).distance < 2) {
      return;
    }
    final angle = math.atan2(end.dy - start.dy, end.dx - start.dx);
    final headLength = (paint.strokeWidth * 4).clamp(10.0, 22.0).toDouble();
    final wingAngle = math.pi / 7;
    final left = Offset(
      end.dx - (headLength * math.cos(angle - wingAngle)),
      end.dy - (headLength * math.sin(angle - wingAngle)),
    );
    final right = Offset(
      end.dx - (headLength * math.cos(angle + wingAngle)),
      end.dy - (headLength * math.sin(angle + wingAngle)),
    );
    canvas
      ..drawLine(end, left, paint)
      ..drawLine(end, right, paint);
  }

  void _paintText(Canvas canvas, Size size, SheetTextAnnotation annotation) {
    if (annotation.text.trim().isEmpty) {
      return;
    }
    final fontSize = (annotation.fontSize * (size.shortestSide / 640))
        .clamp(8.0, 42.0)
        .toDouble();
    final painter = TextPainter(
      text: TextSpan(
        text: annotation.text,
        style: TextStyle(
          color: Color(annotation.color).withValues(alpha: 0.96),
          fontSize: fontSize,
          fontWeight: FontWeight.w700,
        ),
      ),
      textDirection: TextDirection.ltr,
      maxLines: 4,
      ellipsis: '...',
    )..layout(maxWidth: size.width * 0.55);
    final offset = Offset(
      annotation.position.x * size.width,
      annotation.position.y * size.height,
    );
    painter.paint(canvas, offset);
  }

  @override
  bool shouldRepaint(covariant _AnnotationPainter oldDelegate) {
    return oldDelegate.strokes != strokes ||
        oldDelegate.texts != texts ||
        oldDelegate.draftStroke != draftStroke;
  }
}

class _AnnotationToolbar extends StatelessWidget {
  const _AnnotationToolbar({
    required this.selectedTool,
    required this.selectedStamp,
    required this.selectedColor,
    required this.selectedWidth,
    required this.hasFavoritePreset,
    required this.isLayerVisible,
    required this.includeLayerInExport,
    required this.isCompact,
    required this.onToolSelected,
    required this.onStampSelected,
    required this.onColorSelected,
    required this.onWidthChanged,
    required this.onUndo,
    required this.onRedo,
    required this.onSaveFavorite,
    required this.onApplyFavorite,
    required this.onToggleLayerVisibility,
    required this.onToggleLayerExport,
  });

  final _AnnotationToolbarTool selectedTool;
  final _AnnotationStamp selectedStamp;
  final int selectedColor;
  final double selectedWidth;
  final bool hasFavoritePreset;
  final bool isLayerVisible;
  final bool includeLayerInExport;
  final bool isCompact;
  final ValueChanged<_AnnotationToolbarTool> onToolSelected;
  final ValueChanged<_AnnotationStamp> onStampSelected;
  final ValueChanged<int> onColorSelected;
  final ValueChanged<double> onWidthChanged;
  final VoidCallback onUndo;
  final VoidCallback onRedo;
  final VoidCallback onSaveFavorite;
  final VoidCallback onApplyFavorite;
  final VoidCallback onToggleLayerVisibility;
  final VoidCallback onToggleLayerExport;

  static const List<int> _colors = <int>[
    0xff111111,
    0xffd33232,
    0xff1d5fd1,
    0xffffcc25,
  ];
  static const List<double> _widthPresets = <double>[2, 4, 7, 10];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final toolbarContent = Wrap(
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: isCompact ? 6 : 10,
      runSpacing: 8,
      children: [
        SegmentedButton<_AnnotationToolbarTool>(
          showSelectedIcon: false,
          segments: _AnnotationToolbarTool.values
              .map(
                (tool) => ButtonSegment<_AnnotationToolbarTool>(
                  value: tool,
                  icon: Tooltip(
                    message: tool.label,
                    child: Icon(tool.icon, size: 19),
                  ),
                ),
              )
              .toList(growable: false),
          selected: <_AnnotationToolbarTool>{selectedTool},
          onSelectionChanged: (selection) {
            onToolSelected(selection.single);
          },
        ),
        if (selectedTool == _AnnotationToolbarTool.stamp)
          PopupMenuButton<_AnnotationStamp>(
            tooltip: '스탬프 선택',
            icon: Icon(selectedStamp.icon),
            initialValue: selectedStamp,
            onSelected: onStampSelected,
            itemBuilder: (context) => _AnnotationStamp.values
                .map(
                  (stamp) => PopupMenuItem<_AnnotationStamp>(
                    value: stamp,
                    child: ListTile(
                      leading: Icon(stamp.icon),
                      title: Text(stamp.label),
                    ),
                  ),
                )
                .toList(growable: false),
          ),
        for (final color in _colors)
          Tooltip(
            message: _colorLabel(color),
            child: InkResponse(
              onTap: () => onColorSelected(color),
              radius: 18,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Color(color),
                  border: Border.all(
                    color: selectedColor == color
                        ? theme.colorScheme.primary
                        : theme.colorScheme.outlineVariant,
                    width: selectedColor == color ? 3 : 1,
                  ),
                ),
                child: const SizedBox(width: 24, height: 24),
              ),
            ),
          ),
        for (final width in _widthPresets)
          Tooltip(
            message: '${width.toStringAsFixed(0)}pt',
            child: InkWell(
              borderRadius: BorderRadius.circular(8),
              onTap: () => onWidthChanged(width),
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: (selectedWidth - width).abs() < 0.5
                      ? theme.colorScheme.primaryContainer
                      : theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: (selectedWidth - width).abs() < 0.5
                        ? theme.colorScheme.primary
                        : theme.colorScheme.outlineVariant,
                  ),
                ),
                child: SizedBox(
                  width: 34,
                  height: 30,
                  child: Center(
                    child: Container(
                      width: 18,
                      height: width.clamp(2, 10).toDouble(),
                      decoration: BoxDecoration(
                        color: Color(selectedColor),
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        SizedBox(
          width: isCompact ? 108 : 150,
          child: Slider(
            value: selectedWidth,
            min: 2,
            max: 14,
            divisions: 6,
            label: selectedWidth.toStringAsFixed(0),
            onChanged: onWidthChanged,
          ),
        ),
        IconButton(
          tooltip: '마지막 필기 취소',
          onPressed: onUndo,
          icon: const Icon(Icons.undo),
        ),
        IconButton(
          tooltip: '마지막 필기 다시 적용',
          onPressed: onRedo,
          icon: const Icon(Icons.redo),
        ),
        IconButton(
          tooltip: isLayerVisible ? '필기 layer 숨기기' : '필기 layer 표시',
          onPressed: onToggleLayerVisibility,
          icon: Icon(isLayerVisible ? Icons.visibility : Icons.visibility_off),
        ),
        IconButton(
          tooltip: includeLayerInExport ? 'PDF 공유에서 필기 제외' : 'PDF 공유에 필기 포함',
          onPressed: onToggleLayerExport,
          icon: Icon(
            includeLayerInExport ? Icons.file_upload_outlined : Icons.block,
          ),
        ),
        IconButton(
          tooltip: '현재 필기 도구 즐겨찾기 저장',
          onPressed: onSaveFavorite,
          icon: const Icon(Icons.star_border),
        ),
        IconButton(
          tooltip: '즐겨찾기 필기 도구 적용',
          onPressed: hasFavoritePreset ? onApplyFavorite : null,
          icon: const Icon(Icons.star),
        ),
      ],
    );
    return Material(
      elevation: 4,
      color: theme.colorScheme.surface.withValues(alpha: 0.94),
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: EdgeInsets.symmetric(
          horizontal: isCompact ? 8 : 12,
          vertical: 8,
        ),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: toolbarContent,
        ),
      ),
    );
  }

  String _colorLabel(int color) {
    return switch (color) {
      0xff111111 => '검정',
      0xffd33232 => '빨강',
      0xff1d5fd1 => '파랑',
      0xffffcc25 => '노랑',
      _ => '색상',
    };
  }
}

class _ViewerControls extends StatelessWidget {
  const _ViewerControls({
    required this.pageNumber,
    required this.pageCount,
    required this.canGoPrevious,
    required this.canGoNext,
    required this.onPrevious,
    required this.onNext,
    required this.isPerformanceMode,
    required this.modeLabel,
  });

  final int pageNumber;
  final int? pageCount;
  final bool canGoPrevious;
  final bool canGoNext;
  final VoidCallback onPrevious;
  final VoidCallback onNext;
  final bool isPerformanceMode;
  final String modeLabel;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.72),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Padding(
          padding: EdgeInsets.symmetric(
            horizontal: isPerformanceMode ? 14 : 8,
            vertical: isPerformanceMode ? 10 : 6,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                tooltip: '이전 페이지',
                onPressed: onPrevious,
                color: canGoPrevious ? Colors.white : Colors.white38,
                iconSize: isPerformanceMode ? 34 : 24,
                icon: const Icon(Icons.chevron_left),
              ),
              Padding(
                padding: EdgeInsets.symmetric(
                  horizontal: isPerformanceMode ? 18 : 12,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '$pageNumber / ${pageCount ?? '-'}',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: isPerformanceMode ? 18 : null,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    Text(
                      modeLabel,
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: isPerformanceMode ? 12 : 10,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: '다음 페이지',
                onPressed: onNext,
                color: canGoNext ? Colors.white : Colors.white38,
                iconSize: isPerformanceMode ? 34 : 24,
                icon: const Icon(Icons.chevron_right),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PerformanceQuickActions extends StatelessWidget {
  const _PerformanceQuickActions({
    required this.isBookmarked,
    required this.hasSetlistContext,
    required this.isAutoScrolling,
    required this.isAutoScrollPaused,
    required this.isAutoScrollCueActive,
    required this.allowMenus,
    required this.onBookmark,
    required this.onAutoScroll,
    required this.onMetronome,
    required this.onTuner,
    required this.onSettings,
    required this.onPreviousScore,
    required this.onNextScore,
  });

  final bool isBookmarked;
  final bool hasSetlistContext;
  final bool isAutoScrolling;
  final bool isAutoScrollPaused;
  final bool isAutoScrollCueActive;
  final bool allowMenus;
  final VoidCallback onBookmark;
  final VoidCallback onAutoScroll;
  final VoidCallback onMetronome;
  final VoidCallback onTuner;
  final VoidCallback onSettings;
  final VoidCallback onPreviousScore;
  final VoidCallback onNextScore;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black.withValues(alpha: 0.64),
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.all(4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _PerformanceQuickActionButton(
              tooltip: isBookmarked ? '현재 페이지 북마크 해제' : '현재 페이지 북마크',
              onPressed: onBookmark,
              icon: isBookmarked ? Icons.bookmark : Icons.bookmark_border,
              isActive: isBookmarked,
            ),
            _PerformanceQuickActionButton(
              tooltip: isAutoScrollCueActive
                  ? '자동 스크롤 큐 취소'
                  : isAutoScrolling
                  ? isAutoScrollPaused
                        ? '자동 스크롤 재개'
                        : '자동 스크롤 일시정지'
                  : '자동 스크롤',
              onPressed: onAutoScroll,
              icon: isAutoScrollCueActive
                  ? Icons.timer_outlined
                  : isAutoScrolling
                  ? isAutoScrollPaused
                        ? Icons.play_circle_outline
                        : Icons.pause_circle_outline
                  : Icons.play_circle_outline,
              isActive: isAutoScrolling || isAutoScrollCueActive,
            ),
            _PerformanceQuickActionButton(
              tooltip: '메트로놈',
              onPressed: onMetronome,
              icon: Icons.speed,
            ),
            _PerformanceQuickActionButton(
              tooltip: '튜너',
              onPressed: onTuner,
              icon: Icons.tune,
            ),
            if (allowMenus)
              _PerformanceQuickActionButton(
                tooltip: '공연 설정',
                onPressed: onSettings,
                icon: Icons.lock_outline,
              ),
            if (hasSetlistContext) ...[
              const SizedBox(height: 4),
              Container(
                width: 28,
                height: 1,
                color: Colors.white.withValues(alpha: 0.22),
              ),
              const SizedBox(height: 4),
              _PerformanceQuickActionButton(
                tooltip: '이전 곡',
                onPressed: onPreviousScore,
                icon: Icons.skip_previous,
              ),
              _PerformanceQuickActionButton(
                tooltip: '다음 곡',
                onPressed: onNextScore,
                icon: Icons.skip_next,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _PerformanceQuickActionButton extends StatelessWidget {
  const _PerformanceQuickActionButton({
    required this.tooltip,
    required this.onPressed,
    required this.icon,
    this.isActive = false,
  });

  final String tooltip;
  final VoidCallback onPressed;
  final IconData icon;
  final bool isActive;

  @override
  Widget build(BuildContext context) {
    return SizedBox.square(
      dimension: 44,
      child: IconButton(
        tooltip: tooltip,
        color: isActive ? const Color(0xffffd54f) : Colors.white,
        onPressed: onPressed,
        icon: Icon(icon),
      ),
    );
  }
}

class _SetlistProgressBadge extends StatelessWidget {
  const _SetlistProgressBadge({
    required this.scoreTitle,
    required this.subtitle,
  });

  final String scoreTitle;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      container: true,
      label: '세트리스트 진행 위치',
      value: '$scoreTitle, $subtitle',
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 360),
        child: Material(
          color: Colors.black.withValues(alpha: 0.62),
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  scoreTitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleSmall?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: Colors.white.withValues(alpha: 0.78),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _AutoScrollCueOverlay extends StatelessWidget {
  const _AutoScrollCueOverlay({required this.remainingSeconds});

  final int remainingSeconds;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Material(
        color: Colors.black.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.timer_outlined,
                color: Colors.white.withValues(alpha: 0.88),
                size: 32,
              ),
              const SizedBox(height: 10),
              Text(
                '$remainingSeconds',
                style: theme.textTheme.displayLarge?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '자동 스크롤 시작',
                style: theme.textTheme.labelLarge?.copyWith(
                  color: Colors.white70,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AutoScrollSheet extends StatefulWidget {
  const _AutoScrollSheet({
    required this.initialSettings,
    required this.rehearsalMarks,
    required this.metronomeBpm,
    required this.currentPage,
    required this.pageCount,
    required this.isAutoScrolling,
    required this.isPaused,
    required this.progress,
    required this.onSettingsChanged,
    required this.onStart,
    required this.onPause,
    required this.onResume,
    required this.onStop,
  });

  final SheetAutoScrollSettings initialSettings;
  final List<SheetRehearsalMark> rehearsalMarks;
  final int metronomeBpm;
  final int currentPage;
  final int pageCount;
  final bool isAutoScrolling;
  final bool isPaused;
  final double progress;
  final Future<void> Function(SheetAutoScrollSettings settings)
  onSettingsChanged;
  final Future<void> Function(SheetAutoScrollSettings settings) onStart;
  final VoidCallback onPause;
  final VoidCallback onResume;
  final VoidCallback onStop;

  @override
  State<_AutoScrollSheet> createState() => _AutoScrollSheetState();
}

class _AutoScrollSheetState extends State<_AutoScrollSheet> {
  late SheetAutoScrollSettings _settings;

  int get _safePageCount => math.max(1, widget.pageCount);

  @override
  void initState() {
    super.initState();
    _settings = _normalize(widget.initialSettings);
  }

  SheetAutoScrollSettings _normalize(SheetAutoScrollSettings settings) {
    final startPage = settings.startPage.clamp(1, _safePageCount).toInt();
    var endPage = settings.endPage <= 0
        ? _safePageCount
        : settings.endPage.clamp(1, _safePageCount).toInt();
    if (endPage < startPage) {
      endPage = startPage;
    }
    final pausePageNumbers = settings.pausePageNumbers
        .where((page) => page > startPage && page <= endPage)
        .toList(growable: false);
    final repeatSections = settings.repeatSections
        .map((section) => section.clampToRange(startPage, endPage))
        .where((section) => section.isValid)
        .toList(growable: false);
    final pageDurations = <int, int>{
      for (final entry in settings.pageDurations.entries)
        if (entry.key >= startPage && entry.key <= endPage)
          entry.key: entry.value,
    };
    final cuePoints = settings.cuePoints
        .where(
          (cue) =>
              cue.isValid &&
              cue.pageNumber >= startPage &&
              cue.pageNumber <= endPage,
        )
        .toList(growable: false);
    return settings.copyWith(
      startPage: startPage,
      endPage: endPage,
      pausePageNumbers: pausePageNumbers,
      repeatSections: repeatSections,
      pageDurations: pageDurations,
      cuePoints: cuePoints,
    );
  }

  Future<void> _setSettings(SheetAutoScrollSettings settings) async {
    final nextSettings = _normalize(settings);
    setState(() {
      _settings = nextSettings;
    });
    await widget.onSettingsChanged(nextSettings);
  }

  Future<void> _applyBpmPreset(int beatsPerPage) {
    return _setSettings(
      _settings.copyWith(
        durationSeconds: SheetAutoScrollSettings.durationForBpmPreset(
          bpm: widget.metronomeBpm,
          startPage: _settings.startPage,
          endPage: _settings.endPage,
          beatsPerPage: beatsPerPage,
        ),
      ),
    );
  }

  Future<void> _togglePausePage(int pageNumber) {
    final pages = _settings.pausePageNumbers.toSet();
    if (pages.contains(pageNumber)) {
      pages.remove(pageNumber);
    } else {
      pages.add(pageNumber);
    }
    return _setSettings(
      _settings.copyWith(pausePageNumbers: pages.toList()..sort()),
    );
  }

  Future<void> _removePausePage(int pageNumber) {
    final pages = _settings.pausePageNumbers
        .where((page) => page != pageNumber)
        .toList(growable: false);
    return _setSettings(_settings.copyWith(pausePageNumbers: pages));
  }

  Future<void> _addRepeatSection() {
    final section = SheetAutoScrollRepeatSection(
      startPage: _settings.startPage,
      endPage: _settings.endPage,
    );
    final sections = <SheetAutoScrollRepeatSection>[
      ..._settings.repeatSections.where(
        (existing) =>
            existing.startPage != section.startPage ||
            existing.endPage != section.endPage,
      ),
      section,
    ];
    return _setSettings(_settings.copyWith(repeatSections: sections));
  }

  Future<void> _removeRepeatSection(int index) {
    final sections = <SheetAutoScrollRepeatSection>[
      for (
        var sectionIndex = 0;
        sectionIndex < _settings.repeatSections.length;
        sectionIndex += 1
      )
        if (sectionIndex != index) _settings.repeatSections[sectionIndex],
    ];
    return _setSettings(_settings.copyWith(repeatSections: sections));
  }

  Future<void> _setCurrentPageDuration(int pageNumber, int seconds) {
    final durations = Map<int, int>.of(
      _settings.pageDurations,
    )..[pageNumber] = SheetAutoScrollSettings.clampPageDurationSeconds(seconds);
    return _setSettings(_settings.copyWith(pageDurations: durations));
  }

  Future<void> _clearCurrentPageDuration(int pageNumber) {
    final durations = Map<int, int>.of(_settings.pageDurations)
      ..remove(pageNumber);
    return _setSettings(_settings.copyWith(pageDurations: durations));
  }

  Future<void> _importRehearsalCuePoints() {
    final cuePoints = <SheetAutoScrollCuePoint>[
      ..._settings.cuePoints,
      for (final mark in widget.rehearsalMarks)
        if (mark.pageNumber >= _settings.startPage &&
            mark.pageNumber <= _settings.endPage)
          SheetAutoScrollCuePoint(
            pageNumber: mark.pageNumber,
            label: '${_rehearsalMarkKindLabel(mark.kind)} ${mark.label}',
          ),
    ];
    final unique = <String, SheetAutoScrollCuePoint>{
      for (final cue in cuePoints) cue.key: cue,
    };
    return _setSettings(
      _settings.copyWith(cuePoints: unique.values.toList(growable: false)),
    );
  }

  Future<void> _removeCuePoint(String key) {
    final cuePoints = _settings.cuePoints
        .where((cue) => cue.key != key)
        .toList(growable: false);
    return _setSettings(_settings.copyWith(cuePoints: cuePoints));
  }

  String _durationLabel(int seconds) {
    final minutes = seconds ~/ 60;
    final remainingSeconds = seconds % 60;
    if (remainingSeconds == 0) {
      return '$minutes분';
    }
    return '$minutes분 $remainingSeconds초';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final durationSliderValue = _settings.durationSeconds
        .clamp(30, 900)
        .toDouble();
    final progress = widget.progress.clamp(0.0, 1.0).toDouble();
    final cueOptions = <int>{0, 3, 5, 10, _settings.cueSeconds}.toList()
      ..sort();
    final currentPage = widget.currentPage.clamp(1, _safePageCount).toInt();
    final hasCurrentPause = _settings.pausePageNumbers.contains(currentPage);
    final currentPageDuration = _settings.pageDurations[currentPage] ?? 60;
    final hasCurrentPageDuration = _settings.pageDurations.containsKey(
      currentPage,
    );

    return SafeArea(
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Icon(
                    widget.isAutoScrolling
                        ? widget.isPaused
                              ? Icons.play_circle_outline
                              : Icons.pause_circle_outline
                        : Icons.play_circle_outline,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      '자동 스크롤',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  if (widget.isAutoScrolling)
                    OutlinedButton.icon(
                      onPressed: widget.isPaused
                          ? widget.onResume
                          : widget.onPause,
                      icon: Icon(
                        widget.isPaused
                            ? Icons.play_arrow
                            : Icons.pause_outlined,
                      ),
                      label: Text(widget.isPaused ? '재개' : '일시정지'),
                    ),
                  const SizedBox(width: 8),
                  FilledButton.icon(
                    onPressed: () async {
                      if (widget.isAutoScrolling) {
                        widget.onStop();
                        return;
                      }
                      await widget.onStart(_settings);
                      if (context.mounted) {
                        Navigator.of(context).pop();
                      }
                    },
                    icon: Icon(
                      widget.isAutoScrolling ? Icons.stop : Icons.play_arrow,
                    ),
                    label: Text(widget.isAutoScrolling ? '정지' : '시작'),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (widget.isAutoScrolling) ...[
                LinearProgressIndicator(value: progress),
                const SizedBox(height: 8),
                Text(
                  widget.isPaused
                      ? '일시정지 · 진행률 ${(progress * 100).round()}%'
                      : '진행률 ${(progress * 100).round()}%',
                  style: theme.textTheme.labelMedium,
                ),
                const SizedBox(height: 16),
              ],
              DecoratedBox(
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.timer_outlined),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              '연주 시간 ${_durationLabel(_settings.durationSeconds)}',
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          IconButton(
                            tooltip: '느리게',
                            onPressed: () => _setSettings(
                              _settings.copyWith(
                                durationSeconds: _settings.durationSeconds + 30,
                              ),
                            ),
                            icon: const Icon(Icons.keyboard_arrow_down),
                          ),
                          IconButton(
                            tooltip: '빠르게',
                            onPressed: () => _setSettings(
                              _settings.copyWith(
                                durationSeconds: _settings.durationSeconds - 30,
                              ),
                            ),
                            icon: const Icon(Icons.keyboard_arrow_up),
                          ),
                        ],
                      ),
                      Slider(
                        value: durationSliderValue,
                        min: 30,
                        max: 900,
                        divisions: 29,
                        label: _durationLabel(durationSliderValue.round()),
                        onChanged: (value) => _setSettings(
                          _settings.copyWith(
                            durationSeconds: (value / 30).round() * 30,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          for (final beatsPerPage in const <int>[16, 32, 64])
                            ActionChip(
                              avatar: const Icon(Icons.music_note, size: 18),
                              label: Text(
                                '${widget.metronomeBpm} BPM · $beatsPerPage박/쪽',
                              ),
                              onPressed: () => _applyBpmPreset(beatsPerPage),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              DecoratedBox(
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.speed_outlined),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              hasCurrentPageDuration
                                  ? '현재 $currentPage쪽 ${_durationLabel(currentPageDuration)}'
                                  : '현재 $currentPage쪽 기본 속도',
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          IconButton(
                            tooltip: '현재 쪽 빠르게',
                            onPressed: () => _setCurrentPageDuration(
                              currentPage,
                              currentPageDuration - 10,
                            ),
                            icon: const Icon(Icons.keyboard_arrow_up),
                          ),
                          IconButton(
                            tooltip: '현재 쪽 느리게',
                            onPressed: () => _setCurrentPageDuration(
                              currentPage,
                              currentPageDuration + 10,
                            ),
                            icon: const Icon(Icons.keyboard_arrow_down),
                          ),
                          IconButton(
                            tooltip: '현재 쪽 기본 속도',
                            onPressed: hasCurrentPageDuration
                                ? () => _clearCurrentPageDuration(currentPage)
                                : null,
                            icon: const Icon(Icons.restart_alt),
                          ),
                        ],
                      ),
                      if (_settings.pageDurations.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            for (final entry in _settings.pageDurations.entries)
                              Chip(
                                avatar: const Icon(Icons.timer, size: 18),
                                label: Text(
                                  '${entry.key}쪽 ${_durationLabel(entry.value)}',
                                ),
                              ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              DecoratedBox(
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.timer_outlined),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _settings.cueSeconds == 0
                                  ? '시작 큐 없음'
                                  : '시작 큐 ${_settings.cueSeconds}초',
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: SegmentedButton<int>(
                          showSelectedIcon: false,
                          segments: cueOptions
                              .map(
                                (seconds) => ButtonSegment<int>(
                                  value: seconds,
                                  label: Text('$seconds'),
                                ),
                              )
                              .toList(growable: false),
                          selected: <int>{_settings.cueSeconds},
                          onSelectionChanged: (selection) => _setSettings(
                            _settings.copyWith(cueSeconds: selection.single),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              DecoratedBox(
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.vertical_align_top),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              '시작 ${_settings.startPage}쪽',
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          IconButton(
                            tooltip: '시작 페이지 감소',
                            onPressed: _settings.startPage <= 1
                                ? null
                                : () => _setSettings(
                                    _settings.copyWith(
                                      startPage: _settings.startPage - 1,
                                    ),
                                  ),
                            icon: const Icon(Icons.remove),
                          ),
                          IconButton(
                            tooltip: '시작 페이지 증가',
                            onPressed: _settings.startPage >= _safePageCount
                                ? null
                                : () => _setSettings(
                                    _settings.copyWith(
                                      startPage: _settings.startPage + 1,
                                    ),
                                  ),
                            icon: const Icon(Icons.add),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(Icons.vertical_align_bottom),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              '끝 ${_settings.endPage}쪽',
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          IconButton(
                            tooltip: '끝 페이지 감소',
                            onPressed: _settings.endPage <= _settings.startPage
                                ? null
                                : () => _setSettings(
                                    _settings.copyWith(
                                      endPage: _settings.endPage - 1,
                                    ),
                                  ),
                            icon: const Icon(Icons.remove),
                          ),
                          IconButton(
                            tooltip: '끝 페이지 증가',
                            onPressed: _settings.endPage >= _safePageCount
                                ? null
                                : () => _setSettings(
                                    _settings.copyWith(
                                      endPage: _settings.endPage + 1,
                                    ),
                                  ),
                            icon: const Icon(Icons.add),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: TextButton.icon(
                          onPressed: () => _setSettings(
                            _settings.copyWith(startPage: widget.currentPage),
                          ),
                          icon: const Icon(Icons.my_location),
                          label: Text('현재 ${widget.currentPage}쪽부터'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              DecoratedBox(
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.pause_circle_outline),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Pause marker',
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          TextButton.icon(
                            onPressed: () => _togglePausePage(currentPage),
                            icon: Icon(
                              hasCurrentPause ? Icons.remove : Icons.add,
                            ),
                            label: Text(
                              hasCurrentPause
                                  ? '현재 쪽 제거'
                                  : '현재 $currentPage쪽 추가',
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      if (_settings.pausePageNumbers.isEmpty)
                        Text(
                          '등록된 pause marker가 없습니다.',
                          style: theme.textTheme.bodySmall,
                        )
                      else
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            for (final page in _settings.pausePageNumbers)
                              InputChip(
                                avatar: const Icon(Icons.pause, size: 18),
                                label: Text('$page쪽'),
                                onDeleted: () => _removePausePage(page),
                              ),
                          ],
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              DecoratedBox(
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.repeat),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              '반복 구간',
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          TextButton.icon(
                            onPressed: _addRepeatSection,
                            icon: const Icon(Icons.add),
                            label: Text(
                              '${_settings.startPage}-${_settings.endPage}쪽',
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      if (_settings.repeatSections.isEmpty)
                        Text(
                          '등록된 반복 구간이 없습니다.',
                          style: theme.textTheme.bodySmall,
                        )
                      else
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            for (
                              var index = 0;
                              index < _settings.repeatSections.length;
                              index += 1
                            )
                              InputChip(
                                avatar: const Icon(Icons.repeat, size: 18),
                                label: Text(
                                  '${_settings.repeatSections[index].startPage}-'
                                  '${_settings.repeatSections[index].endPage}쪽'
                                  ' x${_settings.repeatSections[index].repeatCount + 1}',
                                ),
                                onDeleted: () => _removeRepeatSection(index),
                              ),
                          ],
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              DecoratedBox(
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.flag_outlined),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              '큐 포인트',
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          TextButton.icon(
                            onPressed: widget.rehearsalMarks.isEmpty
                                ? null
                                : _importRehearsalCuePoints,
                            icon: const Icon(Icons.playlist_add),
                            label: const Text('리허설 마크 가져오기'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      if (_settings.cuePoints.isEmpty)
                        Text(
                          '등록된 큐 포인트가 없습니다.',
                          style: theme.textTheme.bodySmall,
                        )
                      else
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            for (final cue in _settings.cuePoints)
                              InputChip(
                                avatar: const Icon(Icons.flag, size: 18),
                                label: Text(
                                  cue.label.trim().isEmpty
                                      ? '${cue.pageNumber}쪽'
                                      : '${cue.pageNumber}쪽 ${cue.label}',
                                ),
                                onDeleted: () => _removeCuePoint(cue.key),
                              ),
                          ],
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                '세로 스크롤 보기에서 일정한 속도로 움직입니다. 일시정지 후 이어갈 수 있고, '
                '페이지 넘김이나 필기 시작 같은 수동 조작을 하면 자동 스크롤은 멈춥니다.',
                style: theme.textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LinkedAudioPlayerSheet extends StatefulWidget {
  const _LinkedAudioPlayerSheet({required this.linkedFile});

  final SheetLinkedFile linkedFile;

  @override
  State<_LinkedAudioPlayerSheet> createState() =>
      _LinkedAudioPlayerSheetState();
}

class _LinkedAudioPlayerSheetState extends State<_LinkedAudioPlayerSheet> {
  late final SheetAudioPlayer _player;
  bool _isPlaying = false;
  SheetAudioPlaybackResult? _lastResult;

  @override
  void initState() {
    super.initState();
    _player = SheetAudioPlayer();
  }

  @override
  void dispose() {
    unawaited(_player.stop());
    super.dispose();
  }

  Future<void> _togglePlayback() async {
    if (_isPlaying) {
      await _player.stop();
      setState(() {
        _isPlaying = false;
        _lastResult = null;
      });
      return;
    }
    final result = await _player.play(widget.linkedFile.path);
    if (!mounted) {
      return;
    }
    setState(() {
      _isPlaying = result.isPlaying;
      _lastResult = result;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Icon(Icons.audiotrack),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    widget.linkedFile.label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                FilledButton.icon(
                  onPressed: _togglePlayback,
                  icon: Icon(_isPlaying ? Icons.stop : Icons.play_arrow),
                  label: Text(_isPlaying ? '정지' : '재생'),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              widget.linkedFile.path,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            if (_lastResult?.status ==
                SheetAudioPlaybackStatus.unsupportedPlatform)
              Padding(
                padding: const EdgeInsets.only(top: 10),
                child: Text(
                  '이 기기에서는 로컬 오디오 재생 채널을 사용할 수 없습니다.',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.error,
                  ),
                ),
              )
            else if (_lastResult?.status == SheetAudioPlaybackStatus.failed)
              Padding(
                padding: const EdgeInsets.only(top: 10),
                child: Text(
                  _lastResult!.message.isEmpty
                      ? '오디오 재생을 시작하지 못했습니다.'
                      : _lastResult!.message,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.error,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _TunerSheet extends StatefulWidget {
  const _TunerSheet({
    required this.initialSettings,
    required this.initialToneSettings,
    required this.onSettingsChanged,
    required this.onToneSettingsChanged,
    this.autoStartInput = true,
    this.onShowMiniPanel,
  });

  final SheetTunerSettings initialSettings;
  final SheetToneSettings initialToneSettings;
  final Future<void> Function(SheetTunerSettings settings) onSettingsChanged;
  final Future<void> Function(SheetToneSettings settings) onToneSettingsChanged;
  final bool autoStartInput;
  final VoidCallback? onShowMiniPanel;

  @override
  State<_TunerSheet> createState() => _TunerSheetState();
}

@visibleForTesting
Widget buildTunerSheetForTest({
  SheetTunerSettings settings = SheetTunerSettings.defaultSettings,
  SheetToneSettings toneSettings = SheetToneSettings.defaultSettings,
}) {
  return MaterialApp(
    home: Scaffold(
      body: _TunerSheet(
        initialSettings: settings,
        initialToneSettings: toneSettings,
        autoStartInput: false,
        onSettingsChanged: (_) async {},
        onToneSettingsChanged: (_) async {},
      ),
    ),
  );
}

@visibleForTesting
Widget buildTunerPitchHistoryChartForTest({
  List<SheetTunerPitchHistorySample> samples =
      const <SheetTunerPitchHistorySample>[],
  String currentNoteLabel = 'A4',
  String detailLabel = 'Concert A4',
  String? readingLabel,
}) {
  return MaterialApp(
    home: Scaffold(
      body: Center(
        child: SizedBox(
          width: 360,
          child: _TunerPitchHistoryChart(
            samples: samples,
            currentNoteLabel: currentNoteLabel,
            detailLabel: detailLabel,
            readingLabel: readingLabel,
          ),
        ),
      ),
    ),
  );
}

class _TunerSheetState extends State<_TunerSheet> {
  late SheetTunerSettings _settings;
  late SheetToneSettings _toneSettings;
  late final SheetTunerInputService _inputService;
  late final SheetTonePlayer _tonePlayer;
  late final SheetTunerFeedbackStabilizer _feedbackStabilizer;
  late final SheetTunerPitchHistoryBuffer _pitchHistory;
  late double _demoFrequency;
  StreamSubscription<SheetTunerState>? _inputSubscription;
  SheetTunerState _state = SheetTunerState.idle;
  final List<SheetTunerReading> _recentCalibrationReadings =
      <SheetTunerReading>[];
  bool _isTonePlaying = false;
  SheetTonePlaybackResult? _lastTonePlaybackResult;

  @override
  void initState() {
    super.initState();
    _settings = _chromaticOnlySettings(widget.initialSettings);
    _toneSettings = widget.initialToneSettings;
    _inputService = SheetTunerInputService();
    _tonePlayer = SheetTonePlayer();
    _feedbackStabilizer = SheetTunerFeedbackStabilizer();
    _pitchHistory = SheetTunerPitchHistoryBuffer();
    _inputSubscription = _inputService.states.listen((state) {
      if (mounted) {
        setState(() {
          _state = state;
          _recordPitchHistory(state);
          if (state.isListening && state.reading != null) {
            _rememberCalibrationReading(state.reading!);
          }
        });
      }
    });
    _demoFrequency = _settings.referencePitchA4.toDouble();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }
      if (_needsChromaticOnlyNormalization(widget.initialSettings)) {
        unawaited(widget.onSettingsChanged(_settings));
      }
      if (widget.autoStartInput) {
        unawaited(_inputService.start(settings: _settings));
      }
    });
  }

  SheetTunerSettings _chromaticOnlySettings(SheetTunerSettings settings) {
    return settings.copyWith(
      tuningMode: SheetTunerMode.chromatic,
      tuningPreset: SheetTunerPreset.chromatic,
      displayMode: SheetTunerDisplayMode.concert,
      detectionProfile: SheetTunerDetectionProfile.chromatic,
      targetLockEnabled: false,
      clearTargetConcertMidiNumber: true,
      clearCustomPresetId: true,
      clearCustomTargets: true,
    );
  }

  bool _needsChromaticOnlyNormalization(SheetTunerSettings settings) {
    return settings.tuningMode != SheetTunerMode.chromatic ||
        settings.tuningPreset != SheetTunerPreset.chromatic ||
        settings.displayMode != SheetTunerDisplayMode.concert ||
        settings.detectionProfile != SheetTunerDetectionProfile.chromatic ||
        settings.targetLockEnabled ||
        settings.targetConcertMidiNumber != null ||
        settings.customPresetId != null ||
        settings.customTargets.isNotEmpty;
  }

  @override
  void dispose() {
    unawaited(_tonePlayer.stop());
    _inputSubscription?.cancel();
    unawaited(_inputService.dispose());
    super.dispose();
  }

  Future<void> _setReferencePitch(
    int value, {
    String calibrationSource = 'manual',
  }) async {
    final nextSettings = _settings.recordCalibration(
      referencePitchA4: value,
      source: calibrationSource,
    );
    _feedbackStabilizer.reset();
    setState(() {
      _settings = nextSettings;
      _pitchHistory.reset();
      if (!_state.isListening) {
        _state = _stateWithFrequency(_demoFrequency, isListening: false);
      }
    });
    _inputService.updateSettings(nextSettings);
    await widget.onSettingsChanged(nextSettings);
    if (_isTonePlaying) {
      await _playTone();
    }
  }

  Future<void> _setNotationPreference(
    SheetTunerNotationPreference notationPreference,
  ) async {
    final nextSettings = _settings.copyWith(
      notationPreference: notationPreference,
    );
    setState(() {
      _settings = nextSettings;
    });
    await widget.onSettingsChanged(nextSettings);
  }

  Future<void> _setToneSettings(SheetToneSettings settings) async {
    setState(() {
      _toneSettings = settings;
    });
    await widget.onToneSettingsChanged(settings);
    if (_isTonePlaying) {
      await _playTone();
    }
  }

  Future<void> _toggleTone() async {
    if (_isTonePlaying) {
      await _tonePlayer.stop();
      setState(() {
        _isTonePlaying = false;
        _lastTonePlaybackResult = null;
      });
      return;
    }
    await _playTone();
  }

  Future<void> _playTone() async {
    final result = await _tonePlayer.play(
      settings: _toneSettings,
      referencePitchA4: _settings.referencePitchA4,
    );
    if (!mounted) {
      return;
    }
    setState(() {
      _isTonePlaying = result.isPlaying;
      _lastTonePlaybackResult = result;
    });
  }

  Future<void> _setDetectionAlgorithm(
    SheetTunerPitchDetectionAlgorithm detectionAlgorithm,
  ) async {
    final nextSettings = _settings.copyWith(
      detectionAlgorithm: detectionAlgorithm,
    );
    _feedbackStabilizer.reset();
    setState(() {
      _settings = nextSettings;
      _pitchHistory.reset();
      if (!_state.isListening) {
        _state = _stateWithFrequency(_demoFrequency, isListening: false);
      }
    });
    _inputService.updateSettings(nextSettings);
    await widget.onSettingsChanged(nextSettings);
  }

  void _setDemoFrequency(double value) {
    if (_state.isListening) {
      return;
    }
    _feedbackStabilizer.reset();
    setState(() {
      _demoFrequency = value;
      _state = _stateWithFrequency(value, isListening: false);
    });
  }

  Future<void> _toggleListening() async {
    if (_state.isListening) {
      setState(_pitchHistory.reset);
      await _inputService.stop();
      return;
    }
    setState(_pitchHistory.reset);
    await _inputService.start(settings: _settings);
  }

  SheetTunerState _stateWithFrequency(
    double frequency, {
    required bool isListening,
  }) {
    final reading = _settings.detectionProfile.acceptsFrequency(frequency)
        ? SheetTunerPitch.detect(
            frequency: frequency,
            referencePitchA4: _settings.referencePitchA4,
            signalLevel: 0.72,
          )
        : null;
    return SheetTunerState(
      isListening: isListening,
      reading: reading,
      inputStatus: isListening
          ? SheetTunerInputStatus.listening
          : SheetTunerInputStatus.idle,
    );
  }

  bool get _preferFlats {
    return _settings.notationPreference.preferFlatsFor(_settings.displayMode);
  }

  void _rememberCalibrationReading(SheetTunerReading reading) {
    _recentCalibrationReadings.add(reading);
    if (_recentCalibrationReadings.length > 12) {
      _recentCalibrationReadings.removeAt(0);
    }
  }

  void _recordPitchHistory(SheetTunerState state) {
    if (!state.isListening) {
      _pitchHistory.reset();
      return;
    }
    final reading = state.reading;
    final feedback = SheetTunerFeedback.fromState(
      inputStatus: state.inputStatus,
      reading: reading,
      centsOffset: reading?.centsOffset ?? 0,
    );
    _pitchHistory.add(
      timestamp: DateTime.now(),
      reading: reading,
      feedback: feedback,
    );
  }

  Future<void> _confirmCalibrationSuggestion(
    SheetTunerReferenceCalibrationSuggestion suggestion,
  ) async {
    final didConfirm = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('A4 기준음 보정'),
          content: Text(
            '${suggestion.sampleCount}개 입력을 기준으로 '
            'A4 ${suggestion.suggestedReferencePitchA4} Hz가 안정적으로 감지됐습니다.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('취소'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('적용'),
            ),
          ],
        );
      },
    );
    if (!mounted) {
      return;
    }
    if (didConfirm == true) {
      await _setReferencePitch(
        suggestion.suggestedReferencePitchA4,
        calibrationSource: 'suggestion',
      );
      _recentCalibrationReadings.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final demoReading =
        _settings.detectionProfile.acceptsFrequency(_demoFrequency)
        ? SheetTunerPitch.detect(
            frequency: _demoFrequency,
            referencePitchA4: _settings.referencePitchA4,
            signalLevel: 0.72,
          )
        : null;
    final reading = _state.isListening
        ? _state.reading
        : _state.reading ?? demoReading;
    final tuningTargets = _activeTuningTargetsFor();
    final effectiveReading = reading;
    final displayedPitch = effectiveReading == null
        ? null
        : SheetTunerPitch.displayPitch(
            reading: effectiveReading,
            displayMode: SheetTunerDisplayMode.concert,
            referencePitchA4: _settings.referencePitchA4,
          );
    final cents = effectiveReading?.centsOffset ?? 0;
    final feedbackInputStatus = _state.isListening
        ? _state.inputStatus
        : effectiveReading == null
        ? SheetTunerInputStatus.idle
        : SheetTunerInputStatus.listening;
    final baseFeedback = _feedbackStabilizer.add(
      inputStatus: feedbackInputStatus,
      reading: effectiveReading,
      centsOffset: cents,
    );
    final feedback = baseFeedback;
    final detectionDebugInfo = _inputService.detectionDebugInfo;
    final calibrationSuggestion = SheetTunerReferenceCalibration.suggest(
      readings: _recentCalibrationReadings,
      currentReferencePitchA4: _settings.referencePitchA4,
    );
    final status = _tunerStatusLabel(_state.inputStatus);
    final statusMessage = switch (_state.inputStatus) {
      SheetTunerInputStatus.idle ||
      SheetTunerInputStatus.permissionDenied ||
      SheetTunerInputStatus.audioPipelineUnavailable ||
      SheetTunerInputStatus.error => status.label,
      _ => feedback.label,
    };
    final pitchHistorySamples = _pitchHistory.samples;
    final pitchHistoryNoteLabel = displayedPitch?.primaryLabelWith(
      preferFlats: _preferFlats,
    );
    return SafeArea(
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  const Icon(Icons.tune),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      '튜너',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  if (widget.onShowMiniPanel != null)
                    IconButton(
                      onPressed: widget.onShowMiniPanel,
                      icon: const Icon(Icons.picture_in_picture_alt_outlined),
                      tooltip: '악보 위에 작게 띄우기',
                    ),
                  IconButton.filledTonal(
                    onPressed: _toggleListening,
                    icon: Icon(_state.isListening ? Icons.stop : Icons.mic),
                    tooltip: _state.isListening ? '마이크 끄기' : '마이크 켜기',
                  ),
                ],
              ),
              const SizedBox(height: 18),
              DecoratedBox(
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 10,
                  ),
                  child: Row(
                    children: [
                      Icon(
                        status.icon,
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          statusMessage,
                          style: theme.textTheme.labelLarge,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 18),
              _TunerPitchHistoryChart(
                samples: pitchHistorySamples,
                currentNoteLabel: pitchHistoryNoteLabel,
                detailLabel: effectiveReading == null
                    ? '소리를 내면 가장 가까운 음을 표시합니다'
                    : displayedPitch!.detailLabelWith(
                        preferFlats: _preferFlats,
                      ),
                readingLabel: reading == null
                    ? null
                    : '${reading.frequency.toStringAsFixed(2)} Hz · '
                          '${feedback.displayCents >= 0 ? '+' : ''}'
                          '${feedback.displayCents.toStringAsFixed(1)} cents · '
                          '신호 ${(reading.signalLevel * 100).round()}%',
              ),
              const SizedBox(height: 16),
              Wrap(
                alignment: WrapAlignment.center,
                spacing: 8,
                runSpacing: 8,
                children: [
                  Text(
                    'A4 ${_settings.referencePitchA4} Hz',
                    style: theme.textTheme.labelLarge,
                  ),
                  for (final quickPitch in <int>[440, 441, 442])
                    ChoiceChip(
                      selected: _settings.referencePitchA4 == quickPitch,
                      label: Text('$quickPitch'),
                      onSelected: (_) => unawaited(
                        _setReferencePitch(
                          quickPitch,
                          calibrationSource: 'quick',
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 10),
              ExpansionTile(
                tilePadding: EdgeInsets.zero,
                childrenPadding: const EdgeInsets.only(top: 8, bottom: 16),
                title: Text('세부 설정', style: theme.textTheme.titleMedium),
                children: [
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text('감지', style: theme.textTheme.labelLarge),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<SheetTunerPitchDetectionAlgorithm>(
                    initialValue: _settings.detectionAlgorithm,
                    decoration: const InputDecoration(
                      labelText: '감지 엔진',
                      border: OutlineInputBorder(),
                    ),
                    items: SheetTunerPitchDetectionAlgorithm.values
                        .map(
                          (algorithm) =>
                              DropdownMenuItem<
                                SheetTunerPitchDetectionAlgorithm
                              >(value: algorithm, child: Text(algorithm.label)),
                        )
                        .toList(growable: false),
                    onChanged: (value) {
                      if (value != null) {
                        unawaited(_setDetectionAlgorithm(value));
                      }
                    },
                  ),
                  const SizedBox(height: 6),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      _settings.detectionAlgorithm.description,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                  if (detectionDebugInfo != null) ...[
                    const SizedBox(height: 6),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        '감지 진단 ${detectionDebugInfo.label}',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text('표기', style: theme.textTheme.labelLarge),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final notation
                          in SheetTunerNotationPreference.values)
                        ChoiceChip(
                          selected: _settings.notationPreference == notation,
                          label: Text(notation.label),
                          onSelected: (_) =>
                              unawaited(_setNotationPreference(notation)),
                        ),
                    ],
                  ),
                  if (calibrationSuggestion != null) ...[
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: () => unawaited(
                        _confirmCalibrationSuggestion(calibrationSuggestion),
                      ),
                      icon: const Icon(Icons.my_location),
                      label: Text(calibrationSuggestion.label),
                    ),
                  ],
                  const SizedBox(height: 16),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text('기준음/드론', style: theme.textTheme.labelLarge),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      if (_settings.targetConcertMidiNumber != null &&
                          _toneSettings.rootConcertMidiNumber !=
                              _settings.targetConcertMidiNumber)
                        ActionChip(
                          avatar: const Icon(Icons.track_changes, size: 18),
                          label: const Text('타겟으로 맞추기'),
                          onPressed: () => unawaited(
                            _setToneSettings(
                              _toneSettings.copyWith(
                                rootConcertMidiNumber:
                                    _settings.targetConcertMidiNumber!,
                              ),
                            ),
                          ),
                        ),
                      for (final target in tuningTargets)
                        ChoiceChip(
                          selected:
                              _toneSettings.rootConcertMidiNumber ==
                              target.concertMidiNumber,
                          label: Text(
                            target.targetLabel(
                              displayMode: _settings.displayMode,
                              referencePitchA4: _settings.referencePitchA4,
                              preferFlats: _preferFlats,
                            ),
                          ),
                          onSelected: (_) => unawaited(
                            _setToneSettings(
                              _toneSettings.copyWith(
                                rootConcertMidiNumber: target.concertMidiNumber,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<SheetToneDroneMode>(
                    initialValue: _toneSettings.droneMode,
                    decoration: const InputDecoration(
                      labelText: '드론 모드',
                      border: OutlineInputBorder(),
                    ),
                    items: SheetToneDroneMode.values
                        .map(
                          (mode) => DropdownMenuItem<SheetToneDroneMode>(
                            value: mode,
                            child: Text(mode.label),
                          ),
                        )
                        .toList(growable: false),
                    onChanged: (value) {
                      if (value != null) {
                        unawaited(
                          _setToneSettings(
                            _toneSettings.copyWith(droneMode: value),
                          ),
                        );
                      }
                    },
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _toneLabel(),
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  Slider(
                    value: _toneSettings.volumePercent.toDouble(),
                    min: 0,
                    max: 100,
                    divisions: 20,
                    label: '${_toneSettings.volumePercent}%',
                    onChanged: (value) => unawaited(
                      _setToneSettings(
                        _toneSettings.copyWith(volumePercent: value.round()),
                      ),
                    ),
                  ),
                  FilledButton.icon(
                    onPressed: _toggleTone,
                    icon: Icon(_isTonePlaying ? Icons.stop : Icons.graphic_eq),
                    label: Text(_isTonePlaying ? '드론 정지' : '드론 재생'),
                  ),
                  if (_lastTonePlaybackResult?.status ==
                      SheetTonePlaybackStatus.unsupportedPlatform)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        '이 기기에서는 기준음 재생 채널을 사용할 수 없습니다.',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.error,
                        ),
                      ),
                    )
                  else if (_lastTonePlaybackResult?.status ==
                      SheetTonePlaybackStatus.failed)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        _lastTonePlaybackResult!.message.isEmpty
                            ? '기준음 재생을 시작하지 못했습니다.'
                            : _lastTonePlaybackResult!.message,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.error,
                        ),
                      ),
                    ),
                  const SizedBox(height: 24),
                  Text(
                    'A4 기준음 ${_settings.referencePitchA4} Hz',
                    style: theme.textTheme.labelLarge,
                  ),
                  Slider(
                    value: _settings.referencePitchA4.toDouble(),
                    min: 415,
                    max: 466,
                    divisions: 51,
                    label: '${_settings.referencePitchA4} Hz',
                    onChanged: (value) => _setReferencePitch(value.round()),
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      IconButton.filledTonal(
                        tooltip: 'A4 낮추기',
                        onPressed: () =>
                            _setReferencePitch(_settings.referencePitchA4 - 1),
                        icon: const Icon(Icons.remove),
                      ),
                      const SizedBox(width: 16),
                      IconButton.filledTonal(
                        tooltip: 'A4 올리기',
                        onPressed: () =>
                            _setReferencePitch(_settings.referencePitchA4 + 1),
                        icon: const Icon(Icons.add),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    alignment: WrapAlignment.center,
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final quickPitch in <int>[440, 441, 442])
                        ChoiceChip(
                          selected: _settings.referencePitchA4 == quickPitch,
                          label: Text('$quickPitch Hz'),
                          onSelected: (_) => unawaited(
                            _setReferencePitch(
                              quickPitch,
                              calibrationSource: 'quick',
                            ),
                          ),
                        ),
                    ],
                  ),
                  if (_settings.calibrationHistory.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      '최근 기준음 ${_settings.calibrationHistory.take(3).map((event) => '${event.referencePitchA4} Hz').join(' · ')}',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                  const SizedBox(height: 14),
                  if (!_state.isListening) ...[
                    Text(
                      '테스트 주파수 ${_demoFrequency.toStringAsFixed(2)} Hz',
                      style: theme.textTheme.labelLarge,
                    ),
                    Slider(
                      value: _demoFrequency,
                      min: _settings.detectionProfile.minFrequency,
                      max: _settings.detectionProfile.maxFrequency,
                      divisions: 120,
                      label: '${_demoFrequency.toStringAsFixed(2)} Hz',
                      onChanged: _setDemoFrequency,
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _toneLabel() {
    final rootNote = SheetTunerPitch.noteFromMidi(
      _toneSettings.rootConcertMidiNumber,
      referencePitchA4: _settings.referencePitchA4,
    );
    final writtenNote = SheetTunerPitch.noteFromMidi(
      _toneSettings.rootConcertMidiNumber +
          _settings.displayMode.transposeSemitones,
      referencePitchA4: _settings.referencePitchA4,
    );
    final frequencies = _toneSettings.frequencies(
      referencePitchA4: _settings.referencePitchA4,
    );
    final frequencyLabel = frequencies
        .map((frequency) => '${frequency.toStringAsFixed(1)} Hz')
        .join(' / ');
    final writtenLabel = writtenNote.labelWith(preferFlats: _preferFlats);
    final concertLabel = rootNote.labelWith(preferFlats: true);
    return '$writtenLabel'
        ' · Concert $concertLabel · $frequencyLabel';
  }

  ({IconData icon, String label}) _tunerStatusLabel(
    SheetTunerInputStatus status,
  ) {
    return switch (status) {
      SheetTunerInputStatus.idle => (icon: Icons.tune, label: '마이크 준비 중'),
      SheetTunerInputStatus.listening => (
        icon: Icons.mic,
        label: '마이크 입력 수신 중',
      ),
      SheetTunerInputStatus.noSignal => (
        icon: Icons.graphic_eq,
        label: '소리가 작거나 안정적이지 않습니다',
      ),
      SheetTunerInputStatus.permissionDenied => (
        icon: Icons.mic_off_outlined,
        label: '설정에서 Clef & Staff 마이크 권한을 허용해주세요',
      ),
      SheetTunerInputStatus.audioPipelineUnavailable => (
        icon: Icons.error_outline,
        label: '이 기기에서 마이크 스트림을 시작하지 못했습니다',
      ),
      SheetTunerInputStatus.error => (
        icon: Icons.error_outline,
        label: '튜너 입력 중 오류가 발생했습니다 · 다시 시작해주세요',
      ),
    };
  }

  List<SheetTunerTarget> _activeTuningTargetsFor() {
    return SheetTunerPreset.chromatic.targets;
  }
}

class _TunerPitchHistoryChart extends StatelessWidget {
  const _TunerPitchHistoryChart({
    required this.samples,
    required this.currentNoteLabel,
    required this.detailLabel,
    required this.readingLabel,
  });

  static const Duration _historyWindow = Duration(milliseconds: 2200);

  final List<SheetTunerPitchHistorySample> samples;
  final String? currentNoteLabel;
  final String detailLabel;
  final String? readingLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      label: '최근 음정 변화 그래프',
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          border: Border.all(color: theme.colorScheme.outlineVariant),
          borderRadius: BorderRadius.circular(8),
        ),
        child: SizedBox(
          height: 284,
          child: CustomPaint(
            painter: _TunerPitchHistoryPainter(
              samples: samples,
              currentNoteLabel: currentNoteLabel,
              detailLabel: detailLabel,
              readingLabel: readingLabel,
              colors: theme.colorScheme,
              textStyle: theme.textTheme.labelSmall,
              historyWindow: _historyWindow,
            ),
          ),
        ),
      ),
    );
  }
}

class _TunerPitchHistoryPainter extends CustomPainter {
  _TunerPitchHistoryPainter({
    required this.samples,
    required this.currentNoteLabel,
    required this.detailLabel,
    required this.readingLabel,
    required this.colors,
    required this.textStyle,
    required this.historyWindow,
  });

  static const double _maxCents = 50;
  static const double _paddingLeft = 70;
  static const double _paddingRight = 18;
  static const double _paddingTop = 56;
  static const double _paddingBottom = 26;

  final List<SheetTunerPitchHistorySample> samples;
  final String? currentNoteLabel;
  final String detailLabel;
  final String? readingLabel;
  final ColorScheme colors;
  final TextStyle? textStyle;
  final Duration historyWindow;

  @override
  void paint(ui.Canvas canvas, Size size) {
    final chart = Rect.fromLTRB(
      _paddingLeft,
      _paddingTop,
      size.width - _paddingRight,
      size.height - _paddingBottom,
    );
    if (chart.width <= 0 || chart.height <= 0) {
      return;
    }

    _paintGrid(canvas, chart);
    _paintLabels(canvas, chart);
    _paintCurrentSummary(canvas, size);
    _paintHistory(canvas, chart);
  }

  void _paintGrid(ui.Canvas canvas, Rect chart) {
    final gridPaint = Paint()
      ..color = colors.outlineVariant.withValues(alpha: 0.62)
      ..strokeWidth = 1;
    final centerPaint = Paint()
      ..color = colors.primary.withValues(alpha: 0.74)
      ..strokeWidth = 1.5;

    for (final cents in const <double>[-50, -25, 0, 25, 50]) {
      final y = _yForCents(chart, cents);
      canvas.drawLine(
        Offset(chart.left, y),
        Offset(chart.right, y),
        cents == 0 ? centerPaint : gridPaint,
      );
    }
    for (var index = 1; index < 4; index += 1) {
      final x = chart.left + (chart.width * index / 4);
      canvas.drawLine(Offset(x, chart.top), Offset(x, chart.bottom), gridPaint);
    }

    final originPaint = Paint()
      ..color = colors.primary.withValues(alpha: 0.38)
      ..strokeWidth = 2;
    canvas.drawLine(
      Offset(chart.left, chart.top),
      Offset(chart.left, chart.bottom),
      originPaint,
    );
  }

  void _paintLabels(ui.Canvas canvas, Rect chart) {
    final labelStyle = textStyle?.copyWith(
      color: colors.onSurfaceVariant,
      fontWeight: FontWeight.w700,
    );
    _paintText(canvas, '높음', Offset(4, chart.top - 2), labelStyle);
    _paintText(canvas, '낮음', Offset(4, chart.bottom - 12), labelStyle);

    final noteLabel = currentNoteLabel;
    final centerLabel = noteLabel == null || noteLabel.isEmpty
        ? '--'
        : noteLabel;
    final painter = _textPainter(
      centerLabel,
      labelStyle?.copyWith(
        color: colors.onSurface,
        fontSize: 24,
        fontWeight: FontWeight.w900,
      ),
    );
    painter.layout(maxWidth: chart.left - 8);
    painter.paint(
      canvas,
      Offset(4, _yForCents(chart, 0) - (painter.height / 2)),
    );
  }

  void _paintCurrentSummary(ui.Canvas canvas, Size size) {
    final noteLabel = currentNoteLabel == null || currentNoteLabel!.isEmpty
        ? '--'
        : currentNoteLabel!;
    final notePainter = _textPainter(
      noteLabel,
      textStyle?.copyWith(
        color: colors.onSurface,
        fontSize: 34,
        fontWeight: FontWeight.w900,
      ),
    );
    notePainter.layout(maxWidth: size.width * 0.42);
    notePainter.paint(canvas, const Offset(14, 10));

    final detailPainter = _textPainter(
      detailLabel,
      textStyle?.copyWith(
        color: colors.onSurfaceVariant,
        fontWeight: FontWeight.w700,
      ),
    );
    final summaryWidth = math.max(0.0, size.width - notePainter.width - 44);
    detailPainter.layout(maxWidth: summaryWidth);
    detailPainter.paint(canvas, Offset(notePainter.width + 24, 12));

    final reading = readingLabel;
    if (reading == null || reading.isEmpty) {
      return;
    }
    final readingPainter = _textPainter(
      reading,
      textStyle?.copyWith(color: colors.onSurfaceVariant),
    );
    readingPainter.layout(maxWidth: summaryWidth);
    readingPainter.paint(canvas, Offset(notePainter.width + 24, 30));
  }

  void _paintHistory(ui.Canvas canvas, Rect chart) {
    final pitchedSamples = samples.where((sample) => sample.hasPitch).toList();
    if (pitchedSamples.isEmpty) {
      return;
    }

    final newest = samples.last.timestampMillis;
    final windowMillis = math.max(1, historyWindow.inMilliseconds);
    final segments = SheetTunerPitchHistoryBuffer.segmentsFor(samples);
    SheetTunerPitchHistorySample? latestPitchedSample;

    Offset positionFor(SheetTunerPitchHistorySample sample) {
      final age = newest - sample.timestampMillis;
      final progress = (age / windowMillis).clamp(0.0, 1.0);
      final x = chart.left + (chart.width * progress);
      return Offset(x, _yForCents(chart, sample.centsOffset));
    }

    for (final segment in segments) {
      final segmentSamples = segment.samples;
      if (segmentSamples.isEmpty) {
        continue;
      }
      latestPitchedSample = segmentSamples.last;
      if (segmentSamples.length == 1) {
        final sample = segmentSamples.single;
        canvas.drawCircle(
          positionFor(sample),
          2.8,
          Paint()..color = _colorForBand(sample.band, sample.signalLevel),
        );
        continue;
      }
      for (var index = 1; index < segmentSamples.length; index += 1) {
        final previous = segmentSamples[index - 1];
        final current = segmentSamples[index];
        final paint = Paint()
          ..color = _colorForBand(current.band, current.signalLevel)
          ..strokeWidth = current.isLowConfidence ? 1.4 : 2.6
          ..strokeCap = StrokeCap.round
          ..style = PaintingStyle.stroke;
        canvas.drawLine(positionFor(previous), positionFor(current), paint);
      }
    }

    final latest = latestPitchedSample;
    if (latest != null) {
      _paintLatestMarker(canvas, positionFor(latest), latest);
    }
  }

  void _paintLatestMarker(
    ui.Canvas canvas,
    Offset center,
    SheetTunerPitchHistorySample sample,
  ) {
    if (sample.band == SheetTunerFeedbackBand.inTune) {
      _paintCenterMarker(canvas, center);
    } else {
      final fill = Paint()
        ..color = colors.surface
        ..style = PaintingStyle.fill;
      final stroke = Paint()
        ..color = _colorForBand(sample.band, sample.signalLevel)
        ..strokeWidth = 2
        ..style = PaintingStyle.stroke;
      canvas.drawCircle(center, 6, fill);
      canvas.drawCircle(center, 6, stroke);
    }
  }

  void _paintCenterMarker(ui.Canvas canvas, Offset center) {
    final markerPaint = Paint()
      ..color = colors.primary
      ..style = PaintingStyle.fill;
    final checkPaint = Paint()
      ..color = colors.onPrimary
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;
    canvas.drawCircle(center, 9, markerPaint);
    final check = Path()
      ..moveTo(center.dx - 4, center.dy)
      ..lineTo(center.dx - 1, center.dy + 3)
      ..lineTo(center.dx + 5, center.dy - 4);
    canvas.drawPath(check, checkPaint);
  }

  Color _colorForBand(SheetTunerFeedbackBand band, double signalLevel) {
    final base = switch (band) {
      SheetTunerFeedbackBand.inTune => colors.primary,
      SheetTunerFeedbackBand.slightlyFlat ||
      SheetTunerFeedbackBand.veryFlat => colors.tertiary,
      SheetTunerFeedbackBand.slightlySharp ||
      SheetTunerFeedbackBand.verySharp => colors.error,
      SheetTunerFeedbackBand.lowConfidence => colors.secondary,
      _ => colors.outline,
    };
    final opacity = band == SheetTunerFeedbackBand.lowConfidence
        ? 0.38
        : (0.44 + (signalLevel.clamp(0.0, 1.0) * 0.5));
    return base.withValues(alpha: opacity.clamp(0.28, 0.94));
  }

  double _yForCents(Rect chart, double cents) {
    final clamped = cents.clamp(-_maxCents, _maxCents).toDouble();
    final normalized = clamped / _maxCents;
    return chart.center.dy - (normalized * chart.height / 2);
  }

  void _paintText(
    ui.Canvas canvas,
    String text,
    Offset offset,
    TextStyle? style,
  ) {
    final painter = _textPainter(text, style);
    painter.layout();
    painter.paint(canvas, offset);
  }

  TextPainter _textPainter(String text, TextStyle? style) {
    return TextPainter(
      text: TextSpan(text: text, style: style),
      textDirection: TextDirection.ltr,
    );
  }

  @override
  bool shouldRepaint(covariant _TunerPitchHistoryPainter oldDelegate) {
    return oldDelegate.samples != samples ||
        oldDelegate.currentNoteLabel != currentNoteLabel ||
        oldDelegate.detailLabel != detailLabel ||
        oldDelegate.readingLabel != readingLabel ||
        oldDelegate.colors != colors ||
        oldDelegate.textStyle != textStyle ||
        oldDelegate.historyWindow != historyWindow;
  }
}

class _MetronomeSheet extends StatefulWidget {
  const _MetronomeSheet({
    required this.initialSettings,
    required this.onSettingsChanged,
    required this.onShowMiniPanel,
    this.settingsScopeLabel,
  });

  final SheetMetronomeSettings initialSettings;
  final Future<void> Function(SheetMetronomeSettings settings)
  onSettingsChanged;
  final VoidCallback onShowMiniPanel;
  final String? settingsScopeLabel;

  @override
  State<_MetronomeSheet> createState() => _MetronomeSheetState();
}

@visibleForTesting
Widget buildMetronomeSheetForTest({
  SheetMetronomeSettings settings = SheetMetronomeSettings.defaultSettings,
}) {
  return MaterialApp(
    home: Scaffold(
      body: _MetronomeSheet(
        initialSettings: settings,
        onSettingsChanged: (_) async {},
        onShowMiniPanel: () {},
        settingsScopeLabel: '이 악보에 저장됩니다',
      ),
    ),
  );
}

@visibleForTesting
Widget buildViewerMiniMetronomePanelForTest({
  SheetMetronomeSettings settings = SheetMetronomeSettings.defaultSettings,
}) {
  return MaterialApp(
    home: Scaffold(
      body: Center(
        child: _ViewerMiniToolPanel(
          tool: _ViewerMiniTool.metronome,
          metronomeSettings: settings,
          onMetronomeSettingsChanged: (_) async {},
          onOpenTuner: () {},
          onClose: () {},
        ),
      ),
    ),
  );
}

@visibleForTesting
Widget buildSetlistProgressBadgeForTest({
  String scoreTitle = 'G선상의 아리아',
  String subtitle = '공연 순서 · 2/8 · 3분',
}) {
  return MaterialApp(
    home: Scaffold(
      body: Center(
        child: _SetlistProgressBadge(
          scoreTitle: scoreTitle,
          subtitle: subtitle,
        ),
      ),
    ),
  );
}

@visibleForTesting
Widget buildTapZoneHintOverlayForTest() {
  return const MaterialApp(home: Scaffold(body: _TapZoneHintOverlay()));
}

@visibleForTesting
Widget buildAnnotationToolbarForTest() {
  return MaterialApp(
    home: Scaffold(
      body: _AnnotationToolbar(
        isCompact: false,
        selectedTool: _AnnotationToolbarTool.stamp,
        selectedColor: 0xff111111,
        selectedWidth: 4,
        selectedStamp: _AnnotationStamp.ok,
        isLayerVisible: true,
        includeLayerInExport: true,
        hasFavoritePreset: true,
        onToolSelected: (_) {},
        onColorSelected: (_) {},
        onWidthChanged: (_) {},
        onStampSelected: (_) {},
        onUndo: () {},
        onRedo: () {},
        onToggleLayerVisibility: () {},
        onToggleLayerExport: () {},
        onSaveFavorite: () {},
        onApplyFavorite: () {},
      ),
    ),
  );
}

@visibleForTesting
Widget buildViewerCompactOptionsMenuForTest() {
  return MaterialApp(
    home: Scaffold(
      body: Center(
        child: PopupMenuButton<_ViewerMenuAction>(
          tooltip: '보기 옵션',
          itemBuilder: (context) => _viewerCompactLibraryMenuItems(),
        ),
      ),
    ),
  );
}

class _MetronomeSheetState extends State<_MetronomeSheet> {
  late final SheetMetronomeSoundPlayer _soundPlayer;
  late SheetMetronomeSettings _settings;
  late SheetMetronomeBeat _beat;
  Timer? _timer;
  bool _isRunning = false;
  int _countInPulsesLeft = 0;
  DateTime? _lastBeatAt;
  final List<DateTime> _tapTempoMarks = <DateTime>[];

  @override
  void initState() {
    super.initState();
    _soundPlayer = SheetMetronomeSoundPlayer();
    _settings = widget.initialSettings;
    _beat = SheetMetronomeBeat(
      beatIndex: 0,
      beatsPerBar: _settings.meter.beatsPerBar,
      pulsesPerBeat: _settings.subdivision.pulsesPerBeat,
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _setBpm(int bpm) async {
    final nextSettings = _settings.copyWith(bpm: bpm);
    setState(() {
      _settings = nextSettings;
    });
    await widget.onSettingsChanged(nextSettings);
    if (_isRunning) {
      _restartTimer();
    }
  }

  Future<void> _setMeter(SheetMetronomeMeter meter) async {
    final nextSettings = _settings.copyWith(
      meter: meter,
      accentBeatIndexes: SheetMetronomeSettings.defaultAccentBeatIndexesFor(
        meter,
      ),
    );
    setState(() {
      _settings = nextSettings;
      _beat = SheetMetronomeBeat(
        beatIndex: 0,
        beatsPerBar: meter.beatsPerBar,
        pulsesPerBeat: _settings.subdivision.pulsesPerBeat,
      );
      _lastBeatAt = null;
    });
    await widget.onSettingsChanged(nextSettings);
    if (_isRunning) {
      _restartTimer();
    }
  }

  Future<void> _setSoundEnabled(bool enabled) async {
    final nextSettings = _settings.copyWith(soundEnabled: enabled);
    setState(() {
      _settings = nextSettings;
    });
    await widget.onSettingsChanged(nextSettings);
  }

  Future<void> _setVolumePercent(int volumePercent) async {
    final nextSettings = _settings.copyWith(volumePercent: volumePercent);
    setState(() {
      _settings = nextSettings;
    });
    await widget.onSettingsChanged(nextSettings);
  }

  Future<void> _setAccentEnabled(bool enabled) async {
    final nextSettings = _settings.copyWith(accentEnabled: enabled);
    setState(() {
      _settings = nextSettings;
    });
    await widget.onSettingsChanged(nextSettings);
  }

  Future<void> _toggleAccentBeat(int beatIndex) async {
    final accents = _settings.normalizedAccentBeatIndexes.toSet();
    if (accents.contains(beatIndex)) {
      accents.remove(beatIndex);
    } else {
      accents.add(beatIndex);
    }
    final nextAccents = accents.toList()..sort();
    final nextSettings = _settings.copyWith(accentBeatIndexes: nextAccents);
    setState(() {
      _settings = nextSettings;
    });
    await widget.onSettingsChanged(nextSettings);
  }

  Future<void> _setSubdivision(SheetMetronomeSubdivision subdivision) async {
    final nextSettings = _settings.copyWith(subdivision: subdivision);
    setState(() {
      _settings = nextSettings;
      _beat = SheetMetronomeBeat(
        beatIndex: 0,
        beatsPerBar: _settings.meter.beatsPerBar,
        pulsesPerBeat: subdivision.pulsesPerBeat,
      );
      _lastBeatAt = null;
    });
    await widget.onSettingsChanged(nextSettings);
    if (_isRunning) {
      _restartTimer();
    }
  }

  Future<void> _setCountInBars(int bars) async {
    final nextSettings = _settings.copyWith(countInBars: bars);
    setState(() {
      _settings = nextSettings;
      _countInPulsesLeft = _isRunning ? _countInTotalPulses : 0;
      _beat = SheetMetronomeBeat(
        beatIndex: 0,
        beatsPerBar: _settings.meter.beatsPerBar,
        pulsesPerBeat: _settings.subdivision.pulsesPerBeat,
      );
      _lastBeatAt = null;
    });
    await widget.onSettingsChanged(nextSettings);
    if (_isRunning) {
      _restartTimer();
    }
  }

  Future<void> _tapTempo() async {
    final now = DateTime.now();
    _tapTempoMarks.removeWhere(
      (mark) => now.difference(mark) > const Duration(seconds: 3),
    );
    _tapTempoMarks.add(now);
    if (_tapTempoMarks.length < 2) {
      setState(() {});
      return;
    }
    if (_tapTempoMarks.length > 5) {
      _tapTempoMarks.removeAt(0);
    }

    final intervals = <int>[];
    for (var index = 1; index < _tapTempoMarks.length; index++) {
      intervals.add(
        _tapTempoMarks[index]
            .difference(_tapTempoMarks[index - 1])
            .inMilliseconds,
      );
    }
    final averageMs =
        intervals.reduce((sum, value) => sum + value) / intervals.length;
    if (averageMs <= 0) {
      return;
    }
    await _setBpm((60000 / averageMs).round());
  }

  void _toggleRunning() {
    if (_isRunning) {
      _timer?.cancel();
      setState(() {
        _isRunning = false;
        _countInPulsesLeft = 0;
      });
      return;
    }

    setState(() {
      _isRunning = true;
      _beat = SheetMetronomeBeat(
        beatIndex: 0,
        beatsPerBar: _settings.meter.beatsPerBar,
        pulsesPerBeat: _settings.subdivision.pulsesPerBeat,
      );
      _countInPulsesLeft = _countInTotalPulses;
      _lastBeatAt = DateTime.now();
    });
    _playTick();
    _consumeCountInPulse();
    _restartTimer();
  }

  void _restartTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(_settings.pulseDuration, (_) => _advanceBeat());
  }

  void _advanceBeat() {
    if (!mounted) {
      return;
    }

    setState(() {
      _beat = _beat.next();
      _consumeCountInPulse();
      _lastBeatAt = DateTime.now();
    });
    _playTick();
  }

  int get _countInTotalPulses =>
      _settings.countInBars *
      _settings.meter.beatsPerBar *
      _settings.subdivision.pulsesPerBeat;

  bool get _isCountingIn => _isRunning && _countInPulsesLeft > 0;

  void _consumeCountInPulse() {
    if (_countInPulsesLeft <= 0) {
      return;
    }
    _countInPulsesLeft--;
    if (_countInPulsesLeft == 0) {
      _beat = SheetMetronomeBeat(
        beatIndex: 0,
        beatsPerBar: _settings.meter.beatsPerBar,
        pulsesPerBeat: _settings.subdivision.pulsesPerBeat,
      );
    }
  }

  void _playTick() {
    if (!_settings.soundEnabled || !_beat.isBeatStart) {
      return;
    }
    unawaited(
      _soundPlayer.playClick(
        settings: _settings,
        accent: _settings.isAccentBeat(_beat),
      ),
    );
  }

  void _previewTickSound() {
    unawaited(
      _soundPlayer.playClick(
        settings: _settings.copyWith(soundEnabled: true),
        accent: true,
      ),
    );
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('소리가 들리지 않으면 기기 볼륨, 무음 모드, 이어폰 연결을 확인하세요.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final beatTime = _lastBeatAt == null
        ? '대기'
        : _formatShortDate(_lastBeatAt!);
    final countInBeatsLeft =
        (_countInPulsesLeft / _settings.subdivision.pulsesPerBeat).ceil();
    final beatLabel = _isCountingIn
        ? '카운트인 $countInBeatsLeft박 남음'
        : _settings.isAccentBeat(_beat)
        ? '강박 · $beatTime'
        : _beat.isBeatStart
        ? '보통박 · $beatTime'
        : '나눔박 · $beatTime';

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        child: ListView(
          shrinkWrap: true,
          children: [
            Row(
              children: [
                const Icon(Icons.speed),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    '메트로놈',
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: widget.onShowMiniPanel,
                  icon: const Icon(Icons.picture_in_picture_alt_outlined),
                  tooltip: '악보 위에 작게 띄우기',
                ),
                FilledButton.icon(
                  onPressed: _toggleRunning,
                  icon: Icon(_isRunning ? Icons.stop : Icons.play_arrow),
                  label: Text(_isRunning ? '정지' : '시작'),
                ),
              ],
            ),
            if (widget.settingsScopeLabel != null) ...[
              const SizedBox(height: 8),
              Text(
                widget.settingsScopeLabel!,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
            ],
            const SizedBox(height: 22),
            Center(
              child: Text(
                '${_settings.bpm}',
                style: theme.textTheme.displayMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            Center(
              child: Text(
                'BPM · ${_settings.meter.label} · ${_beat.beatNumber}/${_settings.meter.beatsPerBar} · ${_settings.soundEnabled ? '소리 켬' : '시각만'}',
                style: theme.textTheme.labelLarge,
              ),
            ),
            const SizedBox(height: 16),
            Slider(
              value: _settings.bpm.toDouble(),
              min: 40,
              max: 240,
              divisions: 200,
              label: '${_settings.bpm} BPM',
              onChanged: (value) => _setBpm(value.round()),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton.filledTonal(
                  tooltip: 'BPM 낮추기',
                  onPressed: () => _setBpm(_settings.bpm - 1),
                  icon: const Icon(Icons.remove),
                ),
                const SizedBox(width: 16),
                OutlinedButton.icon(
                  onPressed: _tapTempo,
                  icon: const Icon(Icons.touch_app_outlined),
                  label: const Text('탭 템포'),
                ),
                const SizedBox(width: 16),
                IconButton.filledTonal(
                  tooltip: 'BPM 올리기',
                  onPressed: () => _setBpm(_settings.bpm + 1),
                  icon: const Icon(Icons.add),
                ),
              ],
            ),
            const SizedBox(height: 18),
            Text(
              '박자',
              style: theme.textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 8,
              runSpacing: 8,
              children: SheetMetronomeMeter.values
                  .map(
                    (meter) => ChoiceChip(
                      label: Text(meter.label),
                      selected: meter == _settings.meter,
                      onSelected: (_) => _setMeter(meter),
                    ),
                  )
                  .toList(growable: false),
            ),
            const SizedBox(height: 16),
            Text(
              '나눔',
              style: theme.textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 8,
              runSpacing: 8,
              children: SheetMetronomeSubdivision.values
                  .map(
                    (subdivision) => ChoiceChip(
                      label: Text(subdivision.label),
                      selected: subdivision == _settings.subdivision,
                      onSelected: (_) => _setSubdivision(subdivision),
                    ),
                  )
                  .toList(growable: false),
            ),
            const SizedBox(height: 16),
            Text(
              '카운트인',
              style: theme.textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 8,
              runSpacing: 8,
              children: const <int>[0, 1, 2]
                  .map(
                    (bars) => ChoiceChip(
                      label: Text(bars == 0 ? '없음' : '$bars마디'),
                      selected: bars == _settings.countInBars,
                      onSelected: (_) => _setCountInBars(bars),
                    ),
                  )
                  .toList(growable: false),
            ),
            const SizedBox(height: 22),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List<Widget>.generate(_settings.meter.beatsPerBar, (
                index,
              ) {
                final isCurrent = index == _beat.beatIndex;
                final isAccent = _settings.normalizedAccentBeatIndexes.contains(
                  index,
                );
                final isActiveAccent =
                    _settings.accentEnabled && _settings.isAccentBeat(_beat);
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 120),
                  width: isCurrent ? 30 : 22,
                  height: isCurrent ? 30 : 22,
                  margin: const EdgeInsets.symmetric(horizontal: 5),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isCurrent
                        ? (isActiveAccent
                              ? theme.colorScheme.primary
                              : theme.colorScheme.tertiary)
                        : theme.colorScheme.surfaceContainerHighest,
                    border: Border.all(
                      color: isAccent
                          ? theme.colorScheme.primary
                          : theme.colorScheme.outlineVariant,
                      width: isAccent ? 2 : 1,
                    ),
                  ),
                );
              }),
            ),
            const SizedBox(height: 12),
            Center(child: Text(beatLabel, style: theme.textTheme.labelMedium)),
            const SizedBox(height: 8),
            Text(
              '강세 패턴',
              style: theme.textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 8,
              runSpacing: 8,
              children: List<Widget>.generate(_settings.meter.beatsPerBar, (
                index,
              ) {
                final selected = _settings.normalizedAccentBeatIndexes.contains(
                  index,
                );
                return FilterChip(
                  label: Text('${index + 1}박'),
                  selected: selected,
                  onSelected: _settings.accentEnabled
                      ? (_) => _toggleAccentBeat(index)
                      : null,
                );
              }),
            ),
            const SizedBox(height: 8),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              secondary: const Icon(Icons.radio_button_checked),
              title: const Text('강세 사용'),
              subtitle: const Text('선택한 박을 더 강한 소리와 색으로 표시합니다.'),
              value: _settings.accentEnabled,
              onChanged: _setAccentEnabled,
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              secondary: const Icon(Icons.volume_up_outlined),
              title: const Text('틱 소리'),
              subtitle: Text(
                _settings.soundEnabled
                    ? '시작하면 박마다 소리를 냅니다. 안 들리면 미디어/시스템 볼륨, 무음 모드, 연결된 이어폰을 확인하세요.'
                    : '소리를 끄고 화면 박자 표시만 사용합니다.',
              ),
              value: _settings.soundEnabled,
              onChanged: _setSoundEnabled,
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              enabled: _settings.soundEnabled,
              leading: const Icon(Icons.graphic_eq_outlined),
              title: const Text('소리 크기'),
              trailing: Text('${_settings.volumePercent}%'),
              subtitle: Slider(
                value: _settings.volumePercent.toDouble(),
                min: 0,
                max: 100,
                divisions: 10,
                label: '${_settings.volumePercent}%',
                onChanged: _settings.soundEnabled
                    ? (value) => _setVolumePercent(value.round())
                    : null,
              ),
            ),
            Align(
              alignment: Alignment.centerRight,
              child: OutlinedButton.icon(
                onPressed: _previewTickSound,
                icon: const Icon(Icons.volume_up_outlined),
                label: const Text('소리 확인'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

PdfPageLayout _layoutPagesHorizontally(
  List<PdfPage> pages,
  PdfViewerParams params,
) {
  var height = 0.0;
  for (final page in pages) {
    if (page.height > height) {
      height = page.height;
    }
  }
  height += params.margin * 2;

  final pageLayouts = <Rect>[];
  var x = params.margin;
  for (final page in pages) {
    final pageGap = math.max(params.margin * 8, page.width * 0.22);
    pageLayouts.add(Rect.fromLTWH(x, params.margin, page.width, page.height));
    x += page.width + pageGap;
  }

  return PdfPageLayout(pageLayouts: pageLayouts, documentSize: Size(x, height));
}

double _initialFitWidthZoom({
  required List<PdfPage> pages,
  required Size viewSize,
  required int pageNumber,
  required double margin,
  required double fallbackZoom,
}) {
  if (pages.isEmpty || viewSize.width <= 0) {
    return fallbackZoom;
  }
  final pageIndex = (pageNumber - 1).clamp(0, pages.length - 1).toInt();
  final pageWidth = pages[pageIndex].width + (margin * 2);
  if (pageWidth <= 0) {
    return fallbackZoom;
  }
  return viewSize.width / pageWidth;
}

PdfPageLayout _layoutPagesAsSpreads(
  List<PdfPage> pages,
  PdfViewerParams params,
) {
  var height = 0.0;
  var widestPage = 0.0;
  for (final page in pages) {
    height = math.max(height, page.height);
    widestPage = math.max(widestPage, page.width);
  }
  height += params.margin * 2;

  final innerGap = math.max(params.margin * 2, widestPage * 0.04);
  final spreadGap = math.max(params.margin * 10, widestPage * 0.32);
  final groups = <List<PdfPage>>[];
  if (pages.isNotEmpty) {
    groups.add(<PdfPage>[pages.first]);
  }
  for (var index = 1; index < pages.length; index += 2) {
    groups.add(pages.sublist(index, math.min(index + 2, pages.length)));
  }

  var maxSpreadWidth = widestPage;
  for (final group in groups) {
    final groupWidth =
        group.fold(0.0, (width, page) => width + page.width) +
        math.max(0, group.length - 1) * innerGap;
    maxSpreadWidth = math.max(maxSpreadWidth, groupWidth);
  }

  final pageLayouts = <Rect>[];
  var x = params.margin;
  for (final group in groups) {
    final groupWidth =
        group.fold(0.0, (width, page) => width + page.width) +
        math.max(0, group.length - 1) * innerGap;
    var pageX = x + (maxSpreadWidth - groupWidth) / 2;
    for (final page in group) {
      pageLayouts.add(
        Rect.fromLTWH(pageX, params.margin, page.width, page.height),
      );
      pageX += page.width + innerGap;
    }
    x += maxSpreadWidth + spreadGap;
  }

  return PdfPageLayout(pageLayouts: pageLayouts, documentSize: Size(x, height));
}
