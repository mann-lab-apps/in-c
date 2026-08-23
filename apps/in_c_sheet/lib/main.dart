import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:pdfrx/pdfrx.dart';
import 'package:share_plus/share_plus.dart';

import 'pdf_link_policy.dart';
import 'sheet_annotated_pdf_exporter.dart';
import 'sheet_annotation.dart';
import 'sheet_annotation_geometry.dart';
import 'sheet_auto_scroll.dart';
import 'sheet_file_import.dart';
import 'sheet_library_backup.dart';
import 'sheet_library_controller.dart';
import 'sheet_library_store.dart';
import 'sheet_library_view_settings.dart';
import 'sheet_metronome.dart';
import 'sheet_score.dart';
import 'sheet_setlist.dart';
import 'sheet_tuner.dart';
import 'sheet_tuner_input_service.dart';
import 'sheet_viewer_input.dart';

const MethodChannel _sharedImportChannel = MethodChannel('clef/shared_imports');
const String _clefAppVersion = '1.0.0+1';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  pdfrxFlutterInitialize();

  final controller = SheetLibraryController(store: SheetLibraryStore());
  await controller.load();

  runApp(InCSheetApp(controller: controller));
}

class InCSheetApp extends StatelessWidget {
  const InCSheetApp({required this.controller, super.key});

  final SheetLibraryController controller;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Clef',
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

  Future<void> _importPdf() async {
    final score = await controller.importPdf();
    if (!mounted || score == null) {
      return;
    }
    await _openScore(score);
  }

  Future<void> _importImagesAsPdf() async {
    final score = await controller.importImagesAsPdf();
    if (!mounted || score == null) {
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('"${score.title}" 이미지 PDF를 추가했습니다.')),
    );
    await _openScore(score);
  }

  Future<void> _showTesterInfo() async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => const _TesterInfoSheet(appVersion: _clefAppVersion),
    );
  }

  Future<void> _showImportOptions() async {
    final action = await showModalBottomSheet<_LibraryImportAction>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.picture_as_pdf_outlined),
              title: const Text('PDF 가져오기'),
              subtitle: const Text('파일 앱, 다운로드, 메신저 저장 PDF'),
              onTap: () => Navigator.of(context).pop(_LibraryImportAction.pdf),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('이미지를 PDF 악보로 묶기'),
              subtitle: const Text('JPG/PNG를 페이지별 PDF로 등록'),
              onTap: () =>
                  Navigator.of(context).pop(_LibraryImportAction.images),
            ),
          ],
        ),
      ),
    );
    switch (action) {
      case _LibraryImportAction.pdf:
        await _importPdf();
      case _LibraryImportAction.images:
        await _importImagesAsPdf();
      case null:
        return;
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
            content: Text('공유할 PDF 파일을 찾지 못했습니다. 다시 가져오거나 전체 백업을 복원해주세요.'),
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
              mimeType: 'application/pdf',
            ),
          ],
        ),
      );
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('PDF를 공유하지 못했습니다.')));
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
                leading: Icon(
                  candidate.isSanitizedCopy
                      ? Icons.link_off_outlined
                      : Icons.picture_as_pdf_outlined,
                ),
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
      SnackBar(content: Text('${imported.length}개 PDF를 Clef 라이브러리에 추가했습니다.')),
    );
    await _openScore(imported.first);
  }

  Future<void> _openScore(SheetScore score, {String? setlistId}) async {
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
        ),
      ),
    );
  }

  Future<void> _editScore(SheetScore score) async {
    final result = await _showScoreMetadataDialog(
      context: context,
      score: score,
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

  Future<void> _exportBackup() async {
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
      SnackBar(content: Text('metadata 백업을 저장했습니다: ${result.outputUri}')),
    );
  }

  Future<void> _exportFullBackup() async {
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

  Future<void> _importBackup() async {
    final didConfirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('metadata 복원'),
        content: const Text(
          '백업 JSON의 악보 metadata, 세트리스트, 도구 설정으로 현재 앱 데이터를 덮어씁니다. PDF 파일 자체는 복원되지 않습니다.',
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
        '${result.restoredScoreCount}개 악보와 ${result.restoredSetlistCount}개 세트리스트 metadata를 복원했습니다.',
      SheetLibraryBackupRestoreStatus.canceled => '복원을 취소했습니다.',
      SheetLibraryBackupRestoreStatus.unsupportedVersion => '지원하지 않는 백업 버전입니다.',
      SheetLibraryBackupRestoreStatus.invalid => '올바른 백업 JSON이 아닙니다.',
      SheetLibraryBackupRestoreStatus.error => '백업을 복원하지 못했습니다.',
    };
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _importFullBackup() async {
    final didConfirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('전체 백업 복원'),
        content: const Text(
          'ZIP 백업의 악보 metadata, 세트리스트, 도구 설정과 포함된 PDF 파일로 현재 앱 데이터를 덮어씁니다.',
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

    return Scaffold(
      appBar: AppBar(
        title: const Text('Clef'),
        actions: [
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
          PopupMenuButton<_LibraryBackupAction>(
            tooltip: '백업/복원',
            icon: const Icon(Icons.inventory_2_outlined),
            onSelected: (action) {
              switch (action) {
                case _LibraryBackupAction.exportMetadata:
                  _exportBackup();
                case _LibraryBackupAction.importMetadata:
                  _importBackup();
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
                  title: Text('metadata 백업'),
                ),
              ),
              PopupMenuItem<_LibraryBackupAction>(
                value: _LibraryBackupAction.importMetadata,
                child: ListTile(
                  leading: Icon(Icons.restore),
                  title: Text('metadata 복원'),
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
            tooltip: 'PDF 가져오기',
            onPressed: controller.isImporting ? null : _showImportOptions,
            icon: controller.isImporting
                ? const SizedBox.square(
                    dimension: 20,
                    child: CircularProgressIndicator(strokeWidth: 2.5),
                  )
                : const Icon(Icons.add_to_photos_outlined),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: controller.isImporting ? null : _showImportOptions,
        icon: const Icon(Icons.add),
        label: const Text('악보 추가'),
      ),
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
                    96,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _SearchField(
                        query: controller.query,
                        onChanged: controller.updateQuery,
                      ),
                      const SizedBox(height: 10),
                      _LibraryViewBar(
                        settings: controller.libraryViewSettings,
                        onSortPressed: _selectSortMode,
                        onFavoriteChanged: controller.updateFavoriteFilter,
                        onTagPressed: _selectTagFilter,
                      ),
                      const SizedBox(height: 14),
                      if (controller.errorMessage != null)
                        _NoticeBanner(message: controller.errorMessage!),
                      if (controller.errorMessage != null)
                        const SizedBox(height: 12),
                      Expanded(
                        child: controller.isLoading
                            ? const Center(child: CircularProgressIndicator())
                            : scores.isEmpty
                            ? _EmptyLibrary(
                                hasQuery: controller.query.isNotEmpty,
                                onImportPressed: _showImportOptions,
                                onTesterInfoPressed: _showTesterInfo,
                              )
                            : _ScoreGrid(
                                scores: scores,
                                isWide: isWide,
                                onOpen: _openScore,
                                onFavorite: controller.toggleFavorite,
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

class _SearchField extends StatelessWidget {
  const _SearchField({required this.query, required this.onChanged});

  final String query;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return TextField(
      onChanged: onChanged,
      decoration: InputDecoration(
        hintText: '제목, 작곡가, 태그 검색',
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

enum _LibraryBackupAction {
  exportMetadata,
  importMetadata,
  exportFull,
  importFull,
}

enum _LibraryImportAction { pdf, images }

List<SheetSharedImportFile> _parseSharedImportFiles(Object? value) {
  return normalizeSharedImportPayload(value);
}

class _LibraryViewBar extends StatelessWidget {
  const _LibraryViewBar({
    required this.settings,
    required this.onSortPressed,
    required this.onFavoriteChanged,
    required this.onTagPressed,
  });

  final SheetLibraryViewSettings settings;
  final VoidCallback onSortPressed;
  final ValueChanged<bool> onFavoriteChanged;
  final VoidCallback onTagPressed;

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
      ],
    );
  }
}

String _librarySortLabel(SheetLibrarySortMode sortMode) {
  return switch (sortMode) {
    SheetLibrarySortMode.recent => '최근 열기',
    SheetLibrarySortMode.title => '제목',
    SheetLibrarySortMode.composer => '작곡가',
    SheetLibrarySortMode.imported => '가져온 날짜',
  };
}

IconData _librarySortIcon(SheetLibrarySortMode sortMode) {
  return switch (sortMode) {
    SheetLibrarySortMode.recent => Icons.history,
    SheetLibrarySortMode.title => Icons.sort_by_alpha,
    SheetLibrarySortMode.composer => Icons.person_outline,
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
  final textController = TextEditingController(text: initialValue);
  try {
    return await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: textController,
          autofocus: true,
          decoration: InputDecoration(labelText: label),
          textInputAction: TextInputAction.done,
          onSubmitted: (value) => Navigator.of(context).pop(value),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('취소'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(textController.text),
            child: const Text('저장'),
          ),
        ],
      ),
    );
  } finally {
    textController.dispose();
  }
}

Future<_ScoreMetadataInput?> _showScoreMetadataDialog({
  required BuildContext context,
  required SheetScore score,
}) async {
  final titleController = TextEditingController(text: score.title);
  final composerController = TextEditingController(text: score.composer);
  final tagsController = TextEditingController(text: score.tags.join(', '));
  final noteController = TextEditingController(text: score.note);
  try {
    return await showDialog<_ScoreMetadataInput>(
      context: context,
      builder: (context) => AlertDialog(
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
                  controller: noteController,
                  decoration: const InputDecoration(labelText: '메모'),
                  maxLines: 3,
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
                note: noteController.text,
              ),
            ),
            child: const Text('저장'),
          ),
        ],
      ),
    );
  } finally {
    titleController.dispose();
    composerController.dispose();
    tagsController.dispose();
    noteController.dispose();
  }
}

class _ScoreMetadataInput {
  const _ScoreMetadataInput({
    required this.title,
    required this.composer,
    required this.tags,
    required this.note,
  });

  final String title;
  final String composer;
  final String tags;
  final String note;
}

String _formatShortDate(DateTime value) {
  final hour = value.hour.toString().padLeft(2, '0');
  final minute = value.minute.toString().padLeft(2, '0');
  return '${value.month}/${value.day} $hour:$minute';
}

class _EmptyLibrary extends StatelessWidget {
  const _EmptyLibrary({
    required this.hasQuery,
    required this.onImportPressed,
    required this.onTesterInfoPressed,
  });

  final bool hasQuery;
  final VoidCallback onImportPressed;
  final VoidCallback onTesterInfoPressed;

  @override
  Widget build(BuildContext context) {
    return Center(
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
              hasQuery ? '검색 결과가 없습니다.' : '악보를 추가해 테스트를 시작하세요.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.w900),
            ),
            if (!hasQuery) ...[
              const SizedBox(height: 8),
              Text(
                'PDF 또는 JPG/PNG 이미지를 가져와 Clef 라이브러리에 등록할 수 있습니다.',
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
    );
  }
}

class _TesterInfoSheet extends StatelessWidget {
  const _TesterInfoSheet({required this.appVersion});

  final String appVersion;

  static const List<String> _testItems = <String>[
    'PDF 가져오기와 페이지 넘김',
    '필기/텍스트 주석',
    '필기 포함 PDF 공유',
    '튜너와 Bb Trumpet 표시',
    '메트로놈',
    '자동 스크롤',
    '세트리스트',
    '백업/복원',
  ];

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
              const Icon(Icons.info_outline),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Clef 테스트 정보',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _InfoRow(label: '앱', value: 'Clef'),
          _InfoRow(label: '버전', value: appVersion),
          const _InfoRow(label: '빌드', value: 'Beta test build'),
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
            '피드백에는 기기명, OS 버전, PDF 종류, 재현 단계를 같이 적어주세요.',
            style: theme.textTheme.bodySmall,
          ),
        ],
      ),
    );
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
            width: 72,
            child: Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
          ),
          Expanded(child: Text(value)),
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
    required this.onEdit,
    required this.onShare,
  });

  final List<SheetScore> scores;
  final bool isWide;
  final ValueChanged<SheetScore> onOpen;
  final ValueChanged<SheetScore> onFavorite;
  final ValueChanged<SheetScore> onEdit;
  final ValueChanged<SheetScore> onShare;

  @override
  Widget build(BuildContext context) {
    if (!isWide) {
      return ListView.separated(
        itemBuilder: (context, index) => _ScoreTile(
          score: scores[index],
          onOpen: onOpen,
          onFavorite: onFavorite,
          onEdit: onEdit,
          onShare: onShare,
        ),
        separatorBuilder: (context, index) => const SizedBox(height: 10),
        itemCount: scores.length,
      );
    }

    return GridView.builder(
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 340,
        mainAxisExtent: 150,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemBuilder: (context, index) => _ScoreTile(
        score: scores[index],
        onOpen: onOpen,
        onFavorite: onFavorite,
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
    required this.onEdit,
    required this.onShare,
  });

  final SheetScore score;
  final ValueChanged<SheetScore> onOpen;
  final ValueChanged<SheetScore> onFavorite;
  final ValueChanged<SheetScore> onEdit;
  final ValueChanged<SheetScore> onShare;

  @override
  Widget build(BuildContext context) {
    final tags = score.tags.isEmpty ? '태그 없음' : score.tags.join(', ');
    final lastOpened = score.lastOpenedAt == null
        ? '아직 열지 않음'
        : '최근 ${_formatShortDate(score.lastOpenedAt!)}';

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(8),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => onOpen(score),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.description_outlined),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      score.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  Wrap(
                    spacing: 0,
                    children: [
                      IconButton(
                        tooltip: score.isFavorite ? '즐겨찾기 해제' : '즐겨찾기',
                        onPressed: () => onFavorite(score),
                        icon: Icon(
                          score.isFavorite ? Icons.star : Icons.star_border,
                        ),
                      ),
                      IconButton(
                        tooltip: '악보 정보 편집',
                        onPressed: () => onEdit(score),
                        icon: const Icon(Icons.edit_outlined),
                      ),
                      IconButton(
                        tooltip: 'PDF 공유',
                        onPressed: () => onShare(score),
                        icon: const Icon(Icons.ios_share),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                score.composer.isEmpty ? '작곡가 미입력' : score.composer,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 18),
              Text(
                '$tags · $lastOpened · ${score.lastPage}쪽',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class SheetSetlistsScreen extends StatefulWidget {
  const SheetSetlistsScreen({required this.controller, super.key});

  final SheetLibraryController controller;

  @override
  State<SheetSetlistsScreen> createState() => _SheetSetlistsScreenState();
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
                    subtitle: Text('${setlist.scoreIds.length}곡'),
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
    final title = await _showTextEntryDialog(
      context: context,
      title: '세트리스트 이름 변경',
      label: '이름',
      initialValue: setlist.title,
    );
    if (title == null) {
      return;
    }
    await controller.renameSetlist(setlist, title);
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

  Future<void> _addScore() async {
    final availableScores = controller.scoresAvailableForSetlist(setlist);
    if (availableScores.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('추가할 수 있는 악보가 없습니다.')));
      return;
    }

    var query = '';
    final selected = await showModalBottomSheet<SheetScore>(
      context: context,
      showDragHandle: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          return SafeArea(
            child: _ScorePickerSheet(
              scores: availableScores,
              query: query,
              onQueryChanged: (value) {
                setModalState(() {
                  query = value;
                });
              },
            ),
          );
        },
      ),
    );
    if (selected == null) {
      return;
    }
    await controller.addScoreToSetlist(setlist, selected);
  }

  Future<void> _openFirstScore() async {
    final scores = controller.scoresForSetlist(setlist);
    if (scores.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('세트리스트에 악보가 없습니다.')));
      return;
    }
    await _openScore(scores.first);
  }

  Future<void> _openScore(SheetScore score) async {
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
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _addScore,
        icon: const Icon(Icons.playlist_add),
        label: const Text('악보 추가'),
      ),
      body: SafeArea(
        child: scores.isEmpty
            ? const Center(child: Text('이 세트리스트에 악보가 없습니다.'))
            : ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
                itemBuilder: (context, index) {
                  final score = scores[index];
                  return ListTile(
                    tileColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    leading: CircleAvatar(child: Text('${index + 1}')),
                    title: Text(
                      score.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    subtitle: Text('${score.lastPage}쪽부터 열기'),
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
                          onPressed: () => controller.removeScoreFromSetlist(
                            currentSetlist,
                            score,
                          ),
                          icon: const Icon(Icons.remove_circle_outline),
                        ),
                      ],
                    ),
                  );
                },
                separatorBuilder: (context, index) =>
                    const SizedBox(height: 10),
                itemCount: scores.length,
              ),
      ),
    );
  }
}

class _ScorePickerSheet extends StatelessWidget {
  const _ScorePickerSheet({
    required this.scores,
    required this.query,
    required this.onQueryChanged,
  });

  final List<SheetScore> scores;
  final String query;
  final ValueChanged<String> onQueryChanged;

  @override
  Widget build(BuildContext context) {
    final filteredScores = scores
        .where((score) => score.matches(query))
        .toList(growable: false);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: TextField(
            onChanged: onQueryChanged,
            decoration: const InputDecoration(
              hintText: '추가할 악보 검색',
              prefixIcon: Icon(Icons.search),
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
                    return ListTile(
                      leading: const Icon(Icons.description_outlined),
                      title: Text(score.title),
                      subtitle: Text(
                        score.composer.isEmpty ? '작곡가 미입력' : score.composer,
                      ),
                      onTap: () => Navigator.of(context).pop(score),
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

enum _ViewerMenuAction {
  bookmarks,
  displayMode,
  displayEffect,
  toggleHalfPageTurn,
  toggleAnnotationMode,
  undoAnnotation,
  autoScroll,
  metronome,
  tuner,
  hideCurrentPage,
  manageHiddenPages,
  cropPages,
  rotateCurrentPage,
  sanitizePdfLinks,
  sharePdf,
  shareAnnotatedPdf,
  togglePdfLinks,
  togglePerformanceMode,
}

enum _AnnotationToolbarTool {
  pen('펜', Icons.edit_outlined),
  highlighter('형광펜', Icons.brush_outlined),
  text('텍스트', Icons.text_fields),
  eraser('지우개', Icons.auto_fix_off_outlined);

  const _AnnotationToolbarTool(this.label, this.icon);

  final String label;
  final IconData icon;
}

class _BookmarkListRequest {
  const _BookmarkListRequest({required this.bookmark, required this.action});

  final SheetBookmark bookmark;
  final _BookmarkListAction action;
}

class _ViewerPageTurnIntent extends Intent {
  const _ViewerPageTurnIntent(this.direction);

  final SheetViewerPageTurnDirection direction;
}

const Map<ShortcutActivator, Intent> _viewerKeyboardShortcuts =
    <ShortcutActivator, Intent>{
      SingleActivator(LogicalKeyboardKey.arrowRight): _ViewerPageTurnIntent(
        SheetViewerPageTurnDirection.next,
      ),
      SingleActivator(LogicalKeyboardKey.pageDown): _ViewerPageTurnIntent(
        SheetViewerPageTurnDirection.next,
      ),
      SingleActivator(LogicalKeyboardKey.space): _ViewerPageTurnIntent(
        SheetViewerPageTurnDirection.next,
      ),
      SingleActivator(LogicalKeyboardKey.arrowLeft): _ViewerPageTurnIntent(
        SheetViewerPageTurnDirection.previous,
      ),
      SingleActivator(LogicalKeyboardKey.pageUp): _ViewerPageTurnIntent(
        SheetViewerPageTurnDirection.previous,
      ),
      SingleActivator(LogicalKeyboardKey.space, shift: true):
          _ViewerPageTurnIntent(SheetViewerPageTurnDirection.previous),
    };

class SheetViewerScreen extends StatefulWidget {
  const SheetViewerScreen({
    required this.controller,
    required this.scoreId,
    this.setlistId,
    super.key,
  });

  final SheetLibraryController controller;
  final String scoreId;
  final String? setlistId;

  @override
  State<SheetViewerScreen> createState() => _SheetViewerScreenState();
}

class _SheetViewerScreenState extends State<SheetViewerScreen> {
  late final PdfViewerController _pdfController;
  late final FocusNode _keyboardFocusNode;
  int? _pageNumber;
  int? _pageCount;
  bool _showPdfLinks = false;
  bool _isPerformanceMode = false;
  _SheetViewerDisplayMode _displayMode = _SheetViewerDisplayMode.singlePage;
  _SheetViewerDisplayEffect _displayEffect = _SheetViewerDisplayEffect.normal;
  bool _useHalfPageTurn = false;
  bool _isAnnotationMode = false;
  bool _isSanitizingPdfLinks = false;
  bool _isAutoScrolling = false;
  bool _isAutoScrollTicking = false;
  DateTime? _autoScrollStartedAt;
  SheetAutoScrollPlan? _autoScrollPlan;
  double _autoScrollProgress = 0;
  _AnnotationToolbarTool _annotationTool = _AnnotationToolbarTool.pen;
  int _annotationColor = 0xff111111;
  double _annotationWidth = 3.5;
  int? _draftAnnotationPageNumber;
  List<SheetAnnotationPoint> _draftAnnotationPoints =
      const <SheetAnnotationPoint>[];
  bool _didResolveResponsiveDisplayMode = false;
  bool _showPageControls = true;
  Timer? _pageControlsTimer;
  Timer? _autoScrollTimer;

  SheetScore get score => widget.controller.scoreById(widget.scoreId);

  String get _viewerControlModeLabel {
    final hiddenCount = score.pageSettings.hiddenPages.length;
    final hiddenLabel = hiddenCount == 0 ? '' : ' · 숨김 $hiddenCount';
    final autoLabel = _isAutoScrolling ? ' · 자동' : '';
    final cropLabel = score.pageSettings.crop.hasCrop ? ' · 자르기' : '';
    final effectLabel = _displayEffect == _SheetViewerDisplayEffect.normal
        ? ''
        : ' · ${_displayEffect.label}';
    final baseLabel = switch (_displayMode) {
      _SheetViewerDisplayMode.twoPage => '2페이지',
      _ when _useHalfPageTurn => '반쪽',
      _ => _displayMode.label,
    };
    return '$baseLabel$hiddenLabel$cropLabel$effectLabel$autoLabel';
  }

  String get _currentPageLabel {
    final hiddenCount = score.pageSettings.hiddenPages.length;
    final pageText = '${_pageNumber ?? score.lastPage}/${_pageCount ?? '-'}';
    return hiddenCount == 0 ? pageText : '$pageText · 숨김 $hiddenCount';
  }

  Color get _viewerBackgroundColor {
    return switch (_displayEffect) {
      _SheetViewerDisplayEffect.dark => const Color(0xff171918),
      _SheetViewerDisplayEffect.inverted => const Color(0xff101010),
      _ => const Color(0xff313332),
    };
  }

  @override
  void initState() {
    super.initState();
    _pdfController = PdfViewerController();
    _keyboardFocusNode = FocusNode(debugLabel: 'Sheet viewer shortcuts');
    _pageNumber = score.lastPage;
    _pdfController.addListener(_handleViewerChanged);
    widget.controller.addListener(_handleLibraryChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _keyboardFocusNode.requestFocus();
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
    _displayMode = _displayModeFromSettings(
      score.viewerSettings,
      isCompactViewer: isCompactViewer,
    );
    _displayEffect = _displayEffectFromSettings(score.viewerSettings);
    _useHalfPageTurn =
        score.viewerSettings.halfPageTurn &&
        _displayMode != _SheetViewerDisplayMode.twoPage;
    _didResolveResponsiveDisplayMode = true;
    _schedulePageControlsAutoHide();
  }

  @override
  void dispose() {
    _autoScrollTimer?.cancel();
    _pageControlsTimer?.cancel();
    widget.controller.removeListener(_handleLibraryChanged);
    _pdfController.removeListener(_handleViewerChanged);
    _keyboardFocusNode.dispose();
    super.dispose();
  }

  void _handleLibraryChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  void _handleViewerChanged() {
    if (!_pdfController.isReady || !mounted) {
      return;
    }

    final nextPage = _pdfController.pageNumber;
    final nextPageCount = _pdfController.pageCount;
    if (nextPage != null && score.pageSettings.isHidden(nextPage)) {
      final target = score.pageSettings.closestVisiblePage(
        fromPage: nextPage,
        pageCount: nextPageCount,
      );
      if (target != nextPage) {
        _pdfController.goToPage(pageNumber: target);
        return;
      }
    }
    if (nextPage != null && nextPage != _pageNumber) {
      if (_isAutoScrolling && !_isAutoScrollTicking) {
        _stopAutoScroll(showMessage: true);
      }
      widget.controller.updateLastPage(score, nextPage);
      _showPageControlsTemporarily();
    }

    if (nextPage != _pageNumber || nextPageCount != _pageCount) {
      setState(() {
        _pageNumber = nextPage;
        _pageCount = nextPageCount;
      });
    }
  }

  Future<void> _goToRelativePage(int delta) async {
    if (!_pdfController.isReady) {
      return;
    }
    _stopAutoScroll(showMessage: false);

    if (_useHalfPageTurn &&
        _displayMode != _SheetViewerDisplayMode.twoPage &&
        await _goToRelativeHalfPage(delta)) {
      _showPageControlsTemporarily();
      return;
    }

    final current = _pdfController.pageNumber ?? _pageNumber ?? 1;
    final target =
        score.pageSettings.nextVisiblePage(
          fromPage: current,
          delta: delta,
          pageCount: _pdfController.pageCount,
        ) ??
        current;
    if (target == current) {
      _showSnackBar(delta < 0 ? '이전 표시 페이지가 없습니다.' : '다음 표시 페이지가 없습니다.');
      return;
    }
    await _pdfController.goToPage(pageNumber: target);
    _showPageControlsTemporarily();
  }

  Future<bool> _goToRelativeHalfPage(int delta) async {
    final visibleRect = _pdfController.visibleRect;
    final currentPage = _pdfController.pageNumber ?? _pageNumber ?? 1;
    final pageRect = _pdfController.layout.pageLayouts[currentPage - 1];
    final halfStep = visibleRect.height * 0.82;
    final targetTop = visibleRect.top + (halfStep * delta);

    if (targetTop >= pageRect.top &&
        targetTop + visibleRect.height <= pageRect.bottom) {
      await _pdfController.goToArea(
        rect: Rect.fromLTWH(
          visibleRect.left,
          targetTop,
          visibleRect.width,
          visibleRect.height,
        ),
        anchor: PdfPageAnchor.top,
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
        currentPage: _pageNumber ?? score.lastPage,
        pageCount: pageCount,
        isAutoScrolling: _isAutoScrolling,
        progress: _autoScrollProgress,
        onSettingsChanged: (settings) =>
            widget.controller.updateAutoScrollSettings(score, settings),
        onStart: _startAutoScroll,
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

    await widget.controller.updateAutoScrollSettings(score, settings);
    final currentPage = _pageNumber ?? score.lastPage;
    final pageCount = _pdfController.pageCount;
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
    );
    _autoScrollTimer?.cancel();
    setState(() {
      _isAutoScrolling = true;
      _autoScrollStartedAt = DateTime.now();
      _autoScrollPlan = plan;
      _autoScrollProgress = 0;
      _showPageControls = true;
    });
    _autoScrollTimer = Timer.periodic(
      const Duration(milliseconds: 500),
      (_) => _tickAutoScroll(),
    );
    unawaited(_tickAutoScroll());
  }

  Future<void> _tickAutoScroll() async {
    if (!_isAutoScrolling || !_pdfController.isReady || !mounted) {
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
    final pageCount = _pdfController.pageCount;
    final layouts = _pdfController.layout.pageLayouts;
    if (layouts.isEmpty || pageCount < 1) {
      return;
    }
    final targetPage = score.pageSettings.closestVisiblePage(
      fromPage: plan.pageForProgress(progress),
      pageCount: pageCount,
    );
    final startIndex = (plan.startPage - 1)
        .clamp(0, layouts.length - 1)
        .toInt();
    final endIndex = (plan.endPage - 1).clamp(0, layouts.length - 1).toInt();
    final targetIndex = (targetPage - 1).clamp(0, layouts.length - 1).toInt();
    final startRect = layouts[startIndex];
    final endRect = layouts[endIndex];
    final targetRect = layouts[targetIndex];
    final visibleRect = _pdfController.visibleRect;
    final startTop = startRect.top;
    final endTop = math.max(startTop, endRect.bottom - visibleRect.height);
    final targetTop =
        score.pageSettings.isHidden(plan.pageForProgress(progress))
        ? targetRect.top
        : startTop + ((endTop - startTop) * progress);

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
      );
    } finally {
      _isAutoScrollTicking = false;
    }

    if (mounted) {
      setState(() {
        _autoScrollProgress = progress;
      });
    }
    if (progress >= 1) {
      _stopAutoScroll(showMessage: true, completed: true);
    }
  }

  void _stopAutoScroll({required bool showMessage, bool completed = false}) {
    if (!_isAutoScrolling && _autoScrollTimer == null) {
      return;
    }
    _autoScrollTimer?.cancel();
    _autoScrollTimer = null;
    if (mounted) {
      setState(() {
        _isAutoScrolling = false;
        _autoScrollStartedAt = null;
        _autoScrollPlan = null;
        _autoScrollProgress = 0;
      });
    } else {
      _isAutoScrolling = false;
      _autoScrollStartedAt = null;
      _autoScrollPlan = null;
      _autoScrollProgress = 0;
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
    await widget.controller.updateViewerSettings(
      score,
      score.viewerSettings.copyWith(
        displayMode: _displayMode.settingValue,
        halfPageTurn: _useHalfPageTurn,
      ),
    );
    _pdfController.invalidate();
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

    await _pdfController.goToPage(pageNumber: nextVisiblePage);
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
              subtitle: rotation == null
                  ? null
                  : Text('회전 $rotation도 metadata'),
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
      await _pdfController.goToPage(pageNumber: selectedPage);
    }
    _showSnackBar('$selectedPage쪽 숨김을 해제했습니다.');
  }

  Future<void> _rotateCurrentPageMetadata() async {
    final currentScore = score;
    final pageNumber =
        _pdfController.pageNumber ?? _pageNumber ?? currentScore.lastPage;
    final degrees = await widget.controller.rotatePageClockwise(
      currentScore,
      pageNumber,
    );
    final label = degrees == 0 ? '기본 방향' : '$degrees도';
    _showSnackBar('$pageNumber쪽 회전 metadata: $label · 화면 회전 적용은 후속');
  }

  Future<void> _showCropSettings() async {
    if (_isPerformanceMode) {
      _showSnackBar('공연 모드에서는 페이지 정리 기능을 숨깁니다.');
      return;
    }

    final selected = await showModalBottomSheet<SheetCropSettings>(
      context: context,
      showDragHandle: true,
      builder: (context) =>
          _CropSettingsSheet(initialCrop: score.pageSettings.crop),
    );
    if (selected == null) {
      return;
    }

    await widget.controller.updatePageCrop(score, selected);
    _showSnackBar(selected.hasCrop ? '자르기 표시 설정을 저장했습니다.' : '자르기 표시를 해제했습니다.');
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

    _showSnackBar('${result.removedUrlLinkCount}개 외부 URL 링크를 제거한 사본으로 교체했습니다.');
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
      _showSnackBar('공유할 PDF 파일을 찾지 못했습니다. 다시 가져오거나 전체 백업을 복원해주세요.');
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
              mimeType: 'application/pdf',
            ),
          ],
        ),
      );
    } catch (_) {
      _showSnackBar('PDF를 공유하지 못했습니다.');
    }
  }

  Future<void> _shareCurrentScoreAnnotatedPdf() async {
    if (_isPerformanceMode) {
      _showSnackBar('공연 모드에서는 공유 기능을 숨깁니다.');
      return;
    }

    final currentScore = score;
    final hasAnnotations =
        currentScore.annotationLayer.strokes.isNotEmpty ||
        currentScore.annotationLayer.texts.isNotEmpty;
    if (!hasAnnotations) {
      _showSnackBar('필기/텍스트 주석이 없어 원본 PDF를 공유합니다.');
      await _shareCurrentScorePdf();
      return;
    }
    if (SheetAnnotatedPdfExporter.scoreContainsUnicodeTextAnnotations(
      currentScore,
    )) {
      _showSnackBar('한글 텍스트 주석 PDF 출력은 폰트 표시 확인이 필요합니다.');
    }

    _showSnackBar('필기 포함 PDF 사본을 만드는 중입니다.');
    final result = await widget.controller.createAnnotatedPdfCopy(currentScore);
    if (!mounted) {
      return;
    }
    if (!result.didWrite || result.outputPath == null) {
      if (result.skippedUnicodeTextCount > 0 &&
          result.strokeCount == 0 &&
          result.exportedTextCount == 0) {
        _showSnackBar('한글 텍스트 주석은 아직 PDF에 안전하게 포함하지 못합니다. 원본 PDF를 공유합니다.');
        await _shareCurrentScorePdf();
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
                leading: Icon(
                  candidate.isSanitizedCopy
                      ? Icons.link_off_outlined
                      : Icons.picture_as_pdf_outlined,
                ),
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
    if (_isPerformanceMode) {
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
    final didUndo = await widget.controller.undoLastAnnotation(
      score,
      pageNumber,
    );
    _showSnackBar(didUndo ? '마지막 필기를 취소했습니다.' : '취소할 필기가 없습니다.');
  }

  Future<void> _handleAnnotationPanStart(
    DragStartDetails details,
    SheetAnnotationPageGeometry geometry,
    int pageNumber,
  ) async {
    final point = geometry.pointFromPageLocal(details.localPosition);
    if (point == null) {
      return;
    }
    if (_annotationTool == _AnnotationToolbarTool.text) {
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
  ) async {
    final point = geometry.pointFromPageLocal(details.localPosition);
    if (point == null) {
      return;
    }
    if (_annotationTool == _AnnotationToolbarTool.text) {
      return;
    }
    if (_annotationTool == _AnnotationToolbarTool.eraser) {
      await _eraseAnnotationAt(point, geometry, pageNumber);
      return;
    }

    final points = _draftAnnotationPoints;
    if (points.isNotEmpty && points.last.distanceTo(point) < 0.002) {
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
      tool: _annotationTool == _AnnotationToolbarTool.highlighter
          ? SheetAnnotationTool.highlighter
          : SheetAnnotationTool.pen,
      color: _annotationColor,
      width: _annotationWidth,
      points: List<SheetAnnotationPoint>.unmodifiable(points),
      createdAt: now,
    );
    await widget.controller.addAnnotationStroke(score, stroke);
  }

  Future<void> _handleAnnotationTapUp(
    TapUpDetails details,
    SheetAnnotationPageGeometry geometry,
    int pageNumber,
  ) async {
    if (_annotationTool != _AnnotationToolbarTool.text) {
      return;
    }
    final point = geometry.pointFromPageLocal(details.localPosition);
    if (point == null) {
      return;
    }
    final hitText = score.annotationLayer.textAt(
      pageNumber: pageNumber,
      point: point,
    );
    if (hitText != null) {
      await _showTextAnnotationActions(hitText);
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
          final didRemove = await widget.controller.removeTextAnnotation(
            score,
            annotation.id,
          );
          _showSnackBar(didRemove ? '텍스트 주석을 삭제했습니다.' : '삭제할 텍스트가 없습니다.');
          return;
        }
        final didUpdate = await widget.controller.updateTextAnnotation(
          score,
          annotation.copyWith(text: text),
        );
        _showSnackBar(didUpdate ? '텍스트 주석을 수정했습니다.' : '수정할 텍스트가 없습니다.');
        return;
      case _TextAnnotationAction.delete:
        final didRemove = await widget.controller.removeTextAnnotation(
          score,
          annotation.id,
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
    await widget.controller.eraseAnnotationAt(
      score,
      pageNumber: pageNumber,
      point: point,
      tolerance: geometry.normalizedToleranceForStrokeWidth(_annotationWidth),
    );
  }

  Future<void> _showMetronome() async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => _MetronomeSheet(
        initialSettings: widget.controller.metronomeSettings,
        onSettingsChanged: widget.controller.updateMetronomeSettings,
      ),
    );
    if (mounted) {
      _keyboardFocusNode.requestFocus();
    }
  }

  Future<void> _showTuner() async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => _TunerSheet(
        initialSettings: widget.controller.tunerSettings,
        onSettingsChanged: widget.controller.updateTunerSettings,
      ),
    );
    if (mounted) {
      _keyboardFocusNode.requestFocus();
    }
  }

  Object? _handlePageTurnIntent(_ViewerPageTurnIntent intent) {
    final delta = switch (intent.direction) {
      SheetViewerPageTurnDirection.previous => -1,
      SheetViewerPageTurnDirection.next => 1,
    };
    _goToRelativePage(delta);
    return null;
  }

  Future<void> _handleViewerMenuAction(_ViewerMenuAction action) async {
    switch (action) {
      case _ViewerMenuAction.bookmarks:
        await _showBookmarks();
        return;
      case _ViewerMenuAction.displayMode:
        await _selectDisplayMode();
        return;
      case _ViewerMenuAction.displayEffect:
        await _selectDisplayEffect();
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
      case _ViewerMenuAction.autoScroll:
        await _showAutoScroll();
        return;
      case _ViewerMenuAction.metronome:
        await _showMetronome();
        return;
      case _ViewerMenuAction.tuner:
        await _showTuner();
        return;
      case _ViewerMenuAction.hideCurrentPage:
        await _hideCurrentPage();
        return;
      case _ViewerMenuAction.manageHiddenPages:
        await _showHiddenPages();
        return;
      case _ViewerMenuAction.cropPages:
        await _showCropSettings();
        return;
      case _ViewerMenuAction.rotateCurrentPage:
        await _rotateCurrentPageMetadata();
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
      case _ViewerMenuAction.togglePdfLinks:
        setState(() {
          _showPdfLinks = !_showPdfLinks;
        });
        return;
      case _ViewerMenuAction.togglePerformanceMode:
        setState(() {
          _isPerformanceMode = !_isPerformanceMode;
          if (_isPerformanceMode) {
            _isAnnotationMode = false;
            _draftAnnotationPageNumber = null;
            _draftAnnotationPoints = const <SheetAnnotationPoint>[];
          }
          _showPageControls = true;
        });
        _schedulePageControlsAutoHide();
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

  Future<void> _goToAdjacentSetlistScore(int delta) async {
    final setlistId = widget.setlistId;
    if (setlistId == null) {
      return;
    }
    _stopAutoScroll(showMessage: false);

    final nextScore = widget.controller.adjacentSetlistScore(
      setlistId: setlistId,
      scoreId: score.id,
      delta: delta,
    );
    if (nextScore == null) {
      _showSnackBar(delta < 0 ? '이전 곡이 없습니다.' : '다음 곡이 없습니다.');
      return;
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
        ),
      ),
    );
  }

  void _handlePdfLinkTap(PdfLink link) {
    final action = resolveSheetPdfLinkTapAction(
      url: link.url,
      hasDestination: link.dest != null,
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
        _pdfController.goToDest(destination).then((didNavigate) {
          if (!mounted || didNavigate) {
            return;
          }
          _showSnackBar('PDF 내부 링크로 이동할 수 없습니다.');
        });
        return;
      case SheetPdfLinkTapAction.ignore:
        _showSnackBar('지원하지 않는 PDF 링크입니다.');
        return;
    }
  }

  void _showSnackBar(String message) {
    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 2),
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
    final setlistContext = widget.setlistId == null
        ? null
        : widget.controller.setlistPlaybackContext(
            setlistId: widget.setlistId!,
            scoreId: currentScore.id,
          );
    final isCompactViewer = MediaQuery.sizeOf(context).width < 720;
    final appBarTitle = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(currentScore.title, overflow: TextOverflow.ellipsis),
        if (setlistContext != null)
          Text(
            '${setlistContext.title} · ${setlistContext.positionLabel}',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.labelSmall,
          ),
      ],
    );

    return Scaffold(
      appBar: AppBar(
        title: isCompactViewer ? null : appBarTitle,
        actions: [
          if (!_isPerformanceMode || !isCompactViewer)
            IconButton(
              tooltip: isBookmarked ? '현재 페이지 북마크 해제' : '현재 페이지 북마크',
              onPressed: _toggleCurrentBookmark,
              icon: Icon(isBookmarked ? Icons.bookmark : Icons.bookmark_border),
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
              tooltip: _isAutoScrolling ? '자동 스크롤 정지' : '자동 스크롤',
              onPressed: _isAutoScrolling
                  ? () => _stopAutoScroll(showMessage: true)
                  : _showAutoScroll,
              icon: Icon(
                _isAutoScrolling
                    ? Icons.pause_circle_outline
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
              tooltip: _useHalfPageTurn ? '반 페이지 넘김 끄기' : '반 페이지 넘김',
              onPressed: _displayMode == _SheetViewerDisplayMode.twoPage
                  ? null
                  : () => _handleViewerMenuAction(
                      _ViewerMenuAction.toggleHalfPageTurn,
                    ),
              icon: Icon(
                _useHalfPageTurn
                    ? Icons.splitscreen
                    : Icons.splitscreen_outlined,
              ),
            ),
          if (!isCompactViewer && !_isPerformanceMode)
            IconButton(
              tooltip: _showPdfLinks ? 'PDF 링크 영역 숨기기' : 'PDF 링크 영역 표시',
              onPressed: () =>
                  _handleViewerMenuAction(_ViewerMenuAction.togglePdfLinks),
              icon: Icon(_showPdfLinks ? Icons.link : Icons.link_off),
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
                const PopupMenuItem<_ViewerMenuAction>(
                  value: _ViewerMenuAction.rotateCurrentPage,
                  child: ListTile(
                    leading: Icon(Icons.rotate_90_degrees_cw_outlined),
                    title: Text('회전 metadata 저장'),
                  ),
                ),
                PopupMenuItem<_ViewerMenuAction>(
                  value: _ViewerMenuAction.cropPages,
                  child: ListTile(
                    leading: const Icon(Icons.crop_outlined),
                    title: const Text('자르기 표시'),
                    subtitle: currentScore.pageSettings.crop.hasCrop
                        ? const Text('metadata 적용 중')
                        : const Text('원본 PDF 보존'),
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
              ],
            ),
          if (!isCompactViewer)
            IconButton(
              tooltip: _isPerformanceMode ? '공연 모드 끄기' : '공연 모드',
              onPressed: () => _handleViewerMenuAction(
                _ViewerMenuAction.togglePerformanceMode,
              ),
              icon: Icon(
                _isPerformanceMode ? Icons.fullscreen_exit : Icons.fullscreen,
              ),
            ),
          if (isCompactViewer && _isPerformanceMode)
            IconButton(
              tooltip: '공연 모드 끄기',
              onPressed: () => _handleViewerMenuAction(
                _ViewerMenuAction.togglePerformanceMode,
              ),
              icon: const Icon(Icons.fullscreen_exit),
            ),
          if (isCompactViewer && !_isPerformanceMode)
            PopupMenuButton<_ViewerMenuAction>(
              tooltip: '보기 옵션',
              onSelected: (action) => _handleViewerMenuAction(action),
              itemBuilder: (context) => [
                const PopupMenuItem<_ViewerMenuAction>(
                  value: _ViewerMenuAction.bookmarks,
                  child: ListTile(
                    leading: Icon(Icons.bookmarks_outlined),
                    title: Text('북마크 목록'),
                  ),
                ),
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
                          ? Icons.pause_circle_outline
                          : Icons.play_circle_outline,
                    ),
                    title: const Text('자동 스크롤'),
                    subtitle: _isAutoScrolling ? const Text('실행 중') : null,
                  ),
                ),
                const PopupMenuItem<_ViewerMenuAction>(
                  value: _ViewerMenuAction.metronome,
                  child: ListTile(
                    leading: Icon(Icons.speed),
                    title: Text('메트로놈'),
                  ),
                ),
                const PopupMenuItem<_ViewerMenuAction>(
                  value: _ViewerMenuAction.tuner,
                  child: ListTile(leading: Icon(Icons.tune), title: Text('튜너')),
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
                const PopupMenuItem<_ViewerMenuAction>(
                  value: _ViewerMenuAction.rotateCurrentPage,
                  child: ListTile(
                    leading: Icon(Icons.rotate_90_degrees_cw_outlined),
                    title: Text('회전 metadata 저장'),
                  ),
                ),
                PopupMenuItem<_ViewerMenuAction>(
                  value: _ViewerMenuAction.cropPages,
                  child: ListTile(
                    leading: const Icon(Icons.crop_outlined),
                    title: const Text('자르기 표시'),
                    subtitle: currentScore.pageSettings.crop.hasCrop
                        ? const Text('metadata 적용 중')
                        : const Text('원본 PDF 보존'),
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
                const PopupMenuDivider(),
                PopupMenuItem<_ViewerMenuAction>(
                  value: _ViewerMenuAction.togglePdfLinks,
                  child: ListTile(
                    leading: Icon(_showPdfLinks ? Icons.link : Icons.link_off),
                    title: Text(
                      _showPdfLinks ? 'PDF 링크 영역 숨기기' : 'PDF 링크 영역 표시',
                    ),
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
        ],
      ),
      body: Focus(
        focusNode: _keyboardFocusNode,
        autofocus: true,
        child: Shortcuts(
          shortcuts: _viewerKeyboardShortcuts,
          child: Actions(
            actions: <Type, Action<Intent>>{
              _ViewerPageTurnIntent: CallbackAction<_ViewerPageTurnIntent>(
                onInvoke: _handlePageTurnIntent,
              ),
            },
            child: SafeArea(
              child: Listener(
                behavior: HitTestBehavior.translucent,
                onPointerDown: (_) {
                  _keyboardFocusNode.requestFocus();
                  _showPageControlsTemporarily();
                },
                child: Stack(
                  children: [
                    _ViewerDisplayEffectWrapper(
                      effect: _displayEffect,
                      child: PdfViewer.file(
                        currentScore.filePath,
                        key: ValueKey(
                          '${currentScore.filePath}-${_displayMode.name}-${_displayEffect.name}',
                        ),
                        controller: _pdfController,
                        initialPageNumber: currentScore.lastPage,
                        params: PdfViewerParams(
                          margin: 14,
                          backgroundColor: _viewerBackgroundColor,
                          layoutPages: switch (_displayMode) {
                            _SheetViewerDisplayMode.singlePage =>
                              _layoutPagesHorizontally,
                            _SheetViewerDisplayMode.twoPage =>
                              _layoutPagesAsSpreads,
                            _SheetViewerDisplayMode.continuousVertical => null,
                          },
                          scrollHorizontallyByMouseWheel:
                              _displayMode !=
                              _SheetViewerDisplayMode.continuousVertical,
                          linkHandlerParams: PdfLinkHandlerParams(
                            onLinkTap: _handlePdfLinkTap,
                            linkColor: _showPdfLinks
                                ? const Color(0xff2f8c8f)
                                      .withValues(alpha: 0.26)
                                : Colors.transparent,
                            enableAutoLinkDetection: false,
                          ),
                          errorBannerBuilder: (
                            context,
                            error,
                            stackTrace,
                            documentRef,
                          ) => const _ViewerErrorBanner(),
                          pageOverlaysBuilder: (context, pageRect, page) {
                            final pageNumber = page.pageNumber;
                            final rotation = currentScore
                                .pageSettings
                                .pageRotations[pageNumber];
                            return <Widget>[
                              Positioned.fill(
                                child: _AnnotationPageOverlay(
                                  isEnabled: _isAnnotationMode,
                                  pageNumber: pageNumber,
                                  strokes: currentScore.annotationLayer
                                      .strokesForPage(pageNumber),
                                  texts: currentScore.annotationLayer
                                      .textsForPage(pageNumber),
                                  draftPoints:
                                      _draftAnnotationPageNumber == pageNumber
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
                              if (currentScore.pageSettings.crop.hasCrop)
                                Positioned.fill(
                                  child: IgnorePointer(
                                    child: CustomPaint(
                                      painter: _CropMaskPainter(
                                        crop: currentScore.pageSettings.crop,
                                        color: _viewerBackgroundColor
                                            .withValues(alpha: 0.9),
                                      ),
                                    ),
                                  ),
                                ),
                              if (rotation != null)
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
                            if (_isAutoScrolling && !_isAutoScrollTicking) {
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
                                );
                                return;
                              }
                            }
                            widget.controller.updateLastPage(
                              currentScore,
                              pageNumber,
                            );
                            setState(() {
                              _pageNumber = pageNumber;
                            });
                          },
                        ),
                      ),
                    ),
                    if (_isAnnotationMode)
                      Positioned(
                        left: isCompactViewer ? 8 : 20,
                        right: isCompactViewer ? 8 : 20,
                        top: 12,
                        child: _AnnotationToolbar(
                          selectedTool: _annotationTool,
                          selectedColor: _annotationColor,
                          selectedWidth: _annotationWidth,
                          isCompact: isCompactViewer,
                          onToolSelected: (tool) {
                            setState(() {
                              _annotationTool = tool;
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
                            onPrevious: () => _goToRelativePage(-1),
                            onNext: () => _goToRelativePage(1),
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

class _ViewerErrorBanner extends StatelessWidget {
  const _ViewerErrorBanner();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Card(
        margin: const EdgeInsets.all(24),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.picture_as_pdf_outlined,
                  size: 42,
                  color: theme.colorScheme.error,
                ),
                const SizedBox(height: 12),
                Text(
                  'PDF를 열지 못했습니다.',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  '파일이 삭제되었거나 손상되었을 수 있습니다. 다시 가져오거나 전체 백업을 복원해주세요.',
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
          Text('자르기 표시', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 4),
          Text(
            '원본 PDF는 그대로 두고, 뷰어에서 여백만 가려 봅니다.',
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

class _AnnotationPageOverlay extends StatelessWidget {
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
  )
  onPanStart;
  final Future<void> Function(
    DragUpdateDetails details,
    SheetAnnotationPageGeometry geometry,
    int pageNumber,
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
  Widget build(BuildContext context) {
    return IgnorePointer(
      ignoring: !isEnabled,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final size = constraints.biggest;
          final geometry = SheetAnnotationPageGeometry(
            pageRect: Offset.zero & size,
          );
          return GestureDetector(
            behavior: HitTestBehavior.opaque,
            onPanStart: isEnabled
                ? (details) => onPanStart(details, geometry, pageNumber)
                : null,
            onPanUpdate: isEnabled
                ? (details) => onPanUpdate(details, geometry, pageNumber)
                : null,
            onPanEnd: isEnabled ? (_) => onPanEnd() : null,
            onPanCancel: isEnabled ? onPanEnd : null,
            onTapUp: isEnabled
                ? (details) => onTapUp(details, geometry, pageNumber)
                : null,
            child: CustomPaint(
              painter: _AnnotationPainter(
                strokes: strokes,
                texts: texts,
                draftStroke: _draftStroke,
              ),
              size: Size.infinite,
            ),
          );
        },
      ),
    );
  }

  SheetAnnotationStroke? get _draftStroke {
    if (draftPoints.isEmpty || draftTool == _AnnotationToolbarTool.eraser) {
      return null;
    }
    return SheetAnnotationStroke(
      id: 'draft',
      pageNumber: 1,
      tool: draftTool == _AnnotationToolbarTool.highlighter
          ? SheetAnnotationTool.highlighter
          : SheetAnnotationTool.pen,
      color: draftColor,
      width: draftWidth,
      points: draftPoints,
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
    final paint = Paint()
      ..color = stroke.tool == SheetAnnotationTool.highlighter
          ? color.withValues(alpha: 0.32)
          : color.withValues(alpha: 0.96)
      ..strokeWidth = stroke.tool == SheetAnnotationTool.highlighter
          ? stroke.width * 1.9
          : stroke.width
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;

    final path = Path()
      ..moveTo(
        stroke.points.first.x * size.width,
        stroke.points.first.y * size.height,
      );
    for (final point in stroke.points.skip(1)) {
      path.lineTo(point.x * size.width, point.y * size.height);
    }
    canvas.drawPath(path, paint);
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
    required this.selectedColor,
    required this.selectedWidth,
    required this.isCompact,
    required this.onToolSelected,
    required this.onColorSelected,
    required this.onWidthChanged,
    required this.onUndo,
  });

  final _AnnotationToolbarTool selectedTool;
  final int selectedColor;
  final double selectedWidth;
  final bool isCompact;
  final ValueChanged<_AnnotationToolbarTool> onToolSelected;
  final ValueChanged<int> onColorSelected;
  final ValueChanged<double> onWidthChanged;
  final VoidCallback onUndo;

  static const List<int> _colors = <int>[
    0xff111111,
    0xffd33232,
    0xff1d5fd1,
    0xffffcc25,
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      elevation: 4,
      color: theme.colorScheme.surface.withValues(alpha: 0.94),
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: EdgeInsets.symmetric(
          horizontal: isCompact ? 8 : 12,
          vertical: 8,
        ),
        child: Wrap(
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
          ],
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
    required this.onPrevious,
    required this.onNext,
    required this.isPerformanceMode,
    required this.modeLabel,
  });

  final int pageNumber;
  final int? pageCount;
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
                onPressed: pageNumber <= 1 ? null : onPrevious,
                color: Colors.white,
                disabledColor: Colors.white38,
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
                onPressed: pageCount != null && pageNumber >= pageCount!
                    ? null
                    : onNext,
                color: Colors.white,
                disabledColor: Colors.white38,
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

class _AutoScrollSheet extends StatefulWidget {
  const _AutoScrollSheet({
    required this.initialSettings,
    required this.currentPage,
    required this.pageCount,
    required this.isAutoScrolling,
    required this.progress,
    required this.onSettingsChanged,
    required this.onStart,
    required this.onStop,
  });

  final SheetAutoScrollSettings initialSettings;
  final int currentPage;
  final int pageCount;
  final bool isAutoScrolling;
  final double progress;
  final Future<void> Function(SheetAutoScrollSettings settings)
  onSettingsChanged;
  final Future<void> Function(SheetAutoScrollSettings settings) onStart;
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
    return settings.copyWith(startPage: startPage, endPage: endPage);
  }

  Future<void> _setSettings(SheetAutoScrollSettings settings) async {
    final nextSettings = _normalize(settings);
    setState(() {
      _settings = nextSettings;
    });
    await widget.onSettingsChanged(nextSettings);
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
                        ? Icons.pause_circle_outline
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
                  FilledButton.icon(
                    onPressed: widget.isAutoScrolling
                        ? widget.onStop
                        : () async {
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
                  '진행률 ${(progress * 100).round()}%',
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
              Text(
                '세로 스크롤 보기에서 일정한 속도로 움직입니다. 페이지 넘김, 보기 변경, 필기 시작 같은 수동 조작을 하면 자동 스크롤은 멈춥니다.',
                style: theme.textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TunerSheet extends StatefulWidget {
  const _TunerSheet({
    required this.initialSettings,
    required this.onSettingsChanged,
  });

  final SheetTunerSettings initialSettings;
  final Future<void> Function(SheetTunerSettings settings) onSettingsChanged;

  @override
  State<_TunerSheet> createState() => _TunerSheetState();
}

class _TunerSheetState extends State<_TunerSheet> {
  late SheetTunerSettings _settings;
  late final SheetTunerInputService _inputService;
  late double _demoFrequency;
  StreamSubscription<SheetTunerState>? _inputSubscription;
  SheetTunerState _state = SheetTunerState.idle;

  @override
  void initState() {
    super.initState();
    _settings = widget.initialSettings;
    _inputService = SheetTunerInputService();
    _inputSubscription = _inputService.states.listen((state) {
      if (mounted) {
        setState(() {
          _state = state;
        });
      }
    });
    _demoFrequency = _settings.referencePitchA4.toDouble();
  }

  @override
  void dispose() {
    _inputSubscription?.cancel();
    unawaited(_inputService.dispose());
    super.dispose();
  }

  Future<void> _setReferencePitch(int value) async {
    final nextSettings = _settings.copyWith(referencePitchA4: value);
    setState(() {
      _settings = nextSettings;
      if (!_state.isListening) {
        _state = _stateWithFrequency(_demoFrequency, isListening: false);
      }
    });
    _inputService.updateSettings(nextSettings);
    await widget.onSettingsChanged(nextSettings);
  }

  Future<void> _setDisplayMode(SheetTunerDisplayMode displayMode) async {
    final nextSettings = _settings.copyWith(displayMode: displayMode);
    setState(() {
      _settings = nextSettings;
      if (!_state.isListening) {
        _state = _stateWithFrequency(_demoFrequency, isListening: false);
      }
    });
    _inputService.updateSettings(nextSettings);
    await widget.onSettingsChanged(nextSettings);
  }

  Future<void> _setDetectionProfile(
    SheetTunerDetectionProfile detectionProfile,
  ) async {
    final nextSettings = _settings.copyWith(detectionProfile: detectionProfile);
    setState(() {
      _settings = nextSettings;
      if (!_state.isListening) {
        _demoFrequency = detectionProfile.clampFrequency(_demoFrequency);
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
    setState(() {
      _demoFrequency = value;
      _state = _stateWithFrequency(value, isListening: false);
    });
  }

  Future<void> _toggleListening() async {
    if (_state.isListening) {
      await _inputService.stop();
      return;
    }
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
    final displayedPitch = reading == null
        ? null
        : SheetTunerPitch.displayPitch(
            reading: reading,
            displayMode: _settings.displayMode,
            referencePitchA4: _settings.referencePitchA4,
          );
    final cents = reading?.centsOffset ?? 0;
    final isInTune = reading?.isInTune ?? false;
    final status = _tunerStatusLabel(_state.inputStatus);

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
                  FilledButton.icon(
                    onPressed: _toggleListening,
                    icon: Icon(_state.isListening ? Icons.stop : Icons.mic),
                    label: Text(_state.isListening ? '정지' : '시작'),
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
                          status.label,
                          style: theme.textTheme.labelLarge,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 22),
              SegmentedButton<SheetTunerDisplayMode>(
                segments: SheetTunerDisplayMode.values
                    .map(
                      (mode) => ButtonSegment<SheetTunerDisplayMode>(
                        value: mode,
                        label: Text(mode.label),
                      ),
                    )
                    .toList(growable: false),
                selected: <SheetTunerDisplayMode>{_settings.displayMode},
                onSelectionChanged: (selection) {
                  if (selection.isNotEmpty) {
                    unawaited(_setDisplayMode(selection.first));
                  }
                },
              ),
              const SizedBox(height: 12),
              Text('감지 프로필', style: theme.textTheme.labelLarge),
              const SizedBox(height: 8),
              SegmentedButton<SheetTunerDetectionProfile>(
                segments: SheetTunerDetectionProfile.values
                    .map(
                      (profile) => ButtonSegment<SheetTunerDetectionProfile>(
                        value: profile,
                        label: Text(profile.label),
                      ),
                    )
                    .toList(growable: false),
                selected: <SheetTunerDetectionProfile>{
                  _settings.detectionProfile,
                },
                onSelectionChanged: (selection) {
                  if (selection.isNotEmpty) {
                    unawaited(_setDetectionProfile(selection.first));
                  }
                },
              ),
              const SizedBox(height: 18),
              Center(
                child: Text(
                  displayedPitch?.primaryLabel ?? '--',
                  style: theme.textTheme.displayLarge?.copyWith(
                    fontWeight: FontWeight.w900,
                    color: isInTune
                        ? theme.colorScheme.primary
                        : theme.colorScheme.onSurface,
                  ),
                ),
              ),
              Center(
                child: Text(
                  reading == null ? '입력 대기' : displayedPitch!.detailLabel,
                  style: theme.textTheme.labelLarge,
                ),
              ),
              Center(
                child: Text(
                  '표시 ${_settings.displayMode.label} · 감지 ${_settings.detectionProfile.label}',
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
              if (reading != null)
                Center(
                  child: Text(
                    '${reading.frequency.toStringAsFixed(2)} Hz · ${cents >= 0 ? '+' : ''}${cents.toStringAsFixed(1)} cents',
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
              if (reading != null)
                Center(
                  child: Text(
                    '신호 ${(reading.signalLevel * 100).round()}%',
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
              const SizedBox(height: 20),
              _TunerMeter(centsOffset: cents),
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
        ),
      ),
    );
  }

  ({IconData icon, String label}) _tunerStatusLabel(
    SheetTunerInputStatus status,
  ) {
    return switch (status) {
      SheetTunerInputStatus.idle => (
        icon: Icons.tune,
        label: '대기 · 시작하면 마이크 입력을 분석합니다',
      ),
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
        label: '설정에서 Clef 마이크 권한을 허용해주세요',
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
}

class _TunerMeter extends StatelessWidget {
  const _TunerMeter({required this.centsOffset});

  final double centsOffset;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final clamped = centsOffset.clamp(-50.0, 50.0).toDouble();
    final alignmentX = clamped / 50.0;

    return SizedBox(
      height: 54,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            height: 10,
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          Container(
            width: 3,
            height: 42,
            decoration: BoxDecoration(
              color: theme.colorScheme.primary,
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          Align(
            alignment: Alignment(alignmentX, 0),
            child: Container(
              width: 18,
              height: 42,
              decoration: BoxDecoration(
                color: centsOffset.abs() <= 5
                    ? theme.colorScheme.primary
                    : theme.colorScheme.tertiary,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MetronomeSheet extends StatefulWidget {
  const _MetronomeSheet({
    required this.initialSettings,
    required this.onSettingsChanged,
  });

  final SheetMetronomeSettings initialSettings;
  final Future<void> Function(SheetMetronomeSettings settings)
  onSettingsChanged;

  @override
  State<_MetronomeSheet> createState() => _MetronomeSheetState();
}

class _MetronomeSheetState extends State<_MetronomeSheet> {
  late SheetMetronomeSettings _settings;
  late SheetMetronomeBeat _beat;
  Timer? _timer;
  bool _isRunning = false;
  DateTime? _lastBeatAt;

  @override
  void initState() {
    super.initState();
    _settings = widget.initialSettings;
    _beat = SheetMetronomeBeat(
      beatIndex: 0,
      beatsPerBar: _settings.meter.beatsPerBar,
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
    final nextSettings = _settings.copyWith(meter: meter);
    setState(() {
      _settings = nextSettings;
      _beat = SheetMetronomeBeat(beatIndex: 0, beatsPerBar: meter.beatsPerBar);
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

  void _toggleRunning() {
    if (_isRunning) {
      _timer?.cancel();
      setState(() {
        _isRunning = false;
      });
      return;
    }

    setState(() {
      _isRunning = true;
      _beat = SheetMetronomeBeat(
        beatIndex: 0,
        beatsPerBar: _settings.meter.beatsPerBar,
      );
      _lastBeatAt = DateTime.now();
    });
    _playTick();
    _restartTimer();
  }

  void _restartTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(_settings.beatDuration, (_) => _advanceBeat());
  }

  void _advanceBeat() {
    if (!mounted) {
      return;
    }

    setState(() {
      _beat = _beat.next();
      _lastBeatAt = DateTime.now();
    });
    _playTick();
  }

  void _playTick() {
    if (!_settings.soundEnabled) {
      return;
    }
    unawaited(SystemSound.play(SystemSoundType.click));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final beatTime = _lastBeatAt == null
        ? '대기'
        : _formatShortDate(_lastBeatAt!);

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
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
                FilledButton.icon(
                  onPressed: _toggleRunning,
                  icon: Icon(_isRunning ? Icons.stop : Icons.play_arrow),
                  label: Text(_isRunning ? '정지' : '시작'),
                ),
              ],
            ),
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
                'BPM · ${_settings.meter.label} · ${_beat.beatNumber}/${_settings.meter.beatsPerBar}',
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
                IconButton.filledTonal(
                  tooltip: 'BPM 올리기',
                  onPressed: () => _setBpm(_settings.bpm + 1),
                  icon: const Icon(Icons.add),
                ),
              ],
            ),
            const SizedBox(height: 18),
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
            const SizedBox(height: 22),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List<Widget>.generate(_settings.meter.beatsPerBar, (
                index,
              ) {
                final isCurrent = index == _beat.beatIndex;
                final isAccent = index == 0;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 120),
                  width: isCurrent ? 30 : 22,
                  height: isCurrent ? 30 : 22,
                  margin: const EdgeInsets.symmetric(horizontal: 5),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isCurrent
                        ? (isAccent
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
            Center(
              child: Text(
                _beat.isAccent ? '강박 · $beatTime' : '보통박 · $beatTime',
                style: theme.textTheme.labelMedium,
              ),
            ),
            const SizedBox(height: 8),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              secondary: const Icon(Icons.volume_up_outlined),
              title: const Text('tick 소리'),
              subtitle: const Text(
                '기기 기본 click sound를 사용합니다. 정확한 latency는 실기기 확인 필요',
              ),
              value: _settings.soundEnabled,
              onChanged: _setSoundEnabled,
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
    pageLayouts.add(
      Rect.fromLTWH(x, (height - page.height) / 2, page.width, page.height),
    );
    x += page.width + pageGap;
  }

  return PdfPageLayout(pageLayouts: pageLayouts, documentSize: Size(x, height));
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
        Rect.fromLTWH(
          pageX,
          (height - page.height) / 2,
          page.width,
          page.height,
        ),
      );
      pageX += page.width + innerGap;
    }
    x += maxSpreadWidth + spreadGap;
  }

  return PdfPageLayout(pageLayouts: pageLayouts, documentSize: Size(x, height));
}
