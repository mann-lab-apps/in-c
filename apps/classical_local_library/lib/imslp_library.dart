import 'dart:async';

import 'package:flutter/material.dart';
import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:url_launcher/url_launcher.dart';

import 'classical_library_models.dart';
import 'imslp.dart';
import 'imslp_download.dart';

/// Only successfully registered local audio IDs, returned by the parent's
/// existing file import flow. A null result means cancellation; no source is
/// applied by invoking that flow.
class ImslpLocalImportResult {
  const ImslpLocalImportResult({required this.fileIds, required this.label});
  final List<String> fileIds;
  final String label;
}

class ImslpLibraryScreen extends StatefulWidget {
  const ImslpLibraryScreen({
    super.key,
    required this.library,
    required this.store,
    required this.client,
    this.importCoordinator,
    this.openUri,
    this.initialWorkId,
    this.onImportLocalFiles,
    this.onShowImportedFiles,
    this.onPlayImportedFiles,
    this.onAssociateSource,
  });

  final ClassicalLibrary library;
  final ImslpStore store;
  final ImslpCatalogClient client;
  final ImslpImportCoordinator? importCoordinator;
  final Future<bool> Function(Uri uri)? openUri;
  final String? initialWorkId;
  final Future<ImslpLocalImportResult?> Function()? onImportLocalFiles;
  final Future<void> Function(ImslpLocalImportResult result)?
  onShowImportedFiles;
  final Future<void> Function(ImslpLocalImportResult result)?
  onPlayImportedFiles;

  /// Invoked only after import and explicit confirmation of the page + files.
  /// Persist provenance for these IDs without inventing Work/Recording rows.
  final Future<void> Function(
    ImslpWorkSearchResult source,
    ImslpLocalImportResult result,
  )?
  onAssociateSource;

  @override
  State<ImslpLibraryScreen> createState() => _ImslpLibraryScreenState();
}

class _ImslpLibraryScreenState extends State<ImslpLibraryScreen> {
  Work? selectedWork;
  List<ImslpWorkLink> links = const [];
  List<ImslpResource> resources = const [];
  List<ImslpResource> recoverable = const [];
  List<String> recoveryWarnings = const [];
  bool recoveryLoading = false;
  int recoveryGeneration = 0;
  List<ImslpWorkSearchResult> searchResults = const [];
  bool loading = true;
  bool searching = false;
  bool downloading = false;
  bool actionBusy = false;
  bool searchFailed = false;
  bool loadFailed = false;
  int searchGeneration = 0;
  int loadGeneration = 0;
  ImslpWorkSearchResult? openedSource;
  ImslpWorkSearchResult? completionSource;
  ImslpLocalImportResult? importedResult;
  bool associationPending = false;
  double? downloadProgress;
  String? message;
  ImslpDownloadCancellation? cancellation;
  late final TextEditingController searchController;

  ImslpWorkLink? get currentLink {
    final work = selectedWork;
    if (work == null) return null;
    for (final link in links) {
      if (link.workId == work.id) return link;
    }
    return null;
  }

  @override
  void initState() {
    super.initState();
    selectedWork = widget.library.works.isEmpty
        ? null
        : widget.library.works.first;
    for (final work in widget.library.works) {
      if (work.id == widget.initialWorkId) selectedWork = work;
    }
    searchController = TextEditingController(text: _defaultQuery());
    unawaited(_reload());
    unawaited(_reloadRecoveries());
  }

  @override
  void dispose() {
    cancellation?.cancel();
    searchGeneration++;
    loadGeneration++;
    recoveryGeneration++;
    searchController.dispose();
    super.dispose();
  }

  String _defaultQuery() {
    final work = selectedWork;
    if (work == null) return '';
    return buildImslpWorkQuery(work, widget.library.person(work.composerId));
  }

  Future<void> _reloadRecoveries() async {
    final coordinator = widget.importCoordinator;
    if (coordinator == null) return;
    final generation = ++recoveryGeneration;
    setState(() => recoveryLoading = true);
    try {
      final loaded = await coordinator.recoverableResources();
      if (!mounted || generation != recoveryGeneration) return;
      setState(() {
        recoverable = loaded;
        recoveryWarnings = coordinator.recoveryWarnings;
      });
    } catch (_) {
      if (mounted && generation == recoveryGeneration) {
        setState(
          () => recoveryWarnings = ['저장된 자료의 복구 목록을 불러오지 못했습니다. 다시 시도해 주세요.'],
        );
      }
    } finally {
      if (mounted && generation == recoveryGeneration) {
        setState(() => recoveryLoading = false);
      }
    }
  }

  Future<void> _reload() async {
    final generation = ++loadGeneration;
    final work = selectedWork;
    try {
      final loadedLinks = await widget.store.loadWorkLinks();
      final loadedResources = work == null
          ? const <ImslpResource>[]
          : await widget.store.loadResources(work.id);
      if (!mounted || generation != loadGeneration) return;
      setState(() {
        links = loadedLinks;
        resources = loadedResources;
        loading = false;
        loadFailed = false;
      });
    } catch (_) {
      if (!mounted || generation != loadGeneration) return;
      setState(() {
        loading = false;
        loadFailed = true;
        message = '저장된 IMSLP 연결을 불러오지 못했습니다. 다시 시도해 주세요.';
      });
    }
  }

  Future<void> _selectWork(Work work) async {
    searchGeneration++;
    setState(() {
      selectedWork = work;
      searchResults = const [];
      searchController.text = _defaultQuery();
      loading = true;
      message = null;
      searching = false;
      searchFailed = false;
      openedSource = null;
    });
    await _reload();
  }

  Future<void> _search() async {
    final query = searchController.text.trim();
    final generation = ++searchGeneration;
    if (query.isEmpty) {
      setState(() {
        searching = false;
        searchFailed = false;
        searchResults = const [];
        message = 'IMSLP에서 찾을 작곡가나 작품명을 입력해 주세요.';
      });
      return;
    }
    setState(() {
      searching = true;
      message = null;
      searchResults = const [];
      searchFailed = false;
    });
    try {
      final results = await widget.client.searchWorks(query);
      if (!mounted || generation != searchGeneration) return;
      setState(() {
        searchResults = results;
        message = results.isEmpty ? '일치하는 IMSLP 작품을 찾지 못했습니다.' : null;
      });
    } on ImslpClientException catch (error) {
      if (mounted && generation == searchGeneration) {
        setState(() {
          message = error.userMessage;
          searchFailed = true;
        });
      }
    } catch (_) {
      if (mounted && generation == searchGeneration) {
        setState(() {
          message = 'IMSLP 검색을 불러오지 못했습니다. 다시 시도해 주세요.';
          searchFailed = true;
        });
      }
    } finally {
      if (mounted && generation == searchGeneration) {
        setState(() => searching = false);
      }
    }
  }

  void _changeQuery(String value) {
    searchGeneration++;
    setState(() {
      searchController.text = value;
      searching = false;
      searchFailed = false;
      searchResults = const [];
      message = null;
    });
  }

  void _cancelSearch() {
    searchGeneration++;
    setState(() {
      searching = false;
      message = 'IMSLP 검색을 취소했습니다.';
    });
  }

  Future<void> _runAction(Future<void> Function() action) async {
    if (actionBusy || downloading) return;
    setState(() => actionBusy = true);
    try {
      await action();
    } catch (_) {
      if (mounted) setState(() => message = '작업을 마치지 못했습니다. 다시 시도해 주세요.');
    } finally {
      if (mounted) setState(() => actionBusy = false);
    }
  }

  Future<void> _importLocal() async {
    final source = openedSource;
    final result = await widget.onImportLocalFiles!();
    if (!mounted) return;
    setState(() {
      importedResult = result;
      completionSource = source;
      associationPending =
          result != null &&
          result.fileIds.isNotEmpty &&
          source != null &&
          widget.onAssociateSource != null;
      message = result == null
          ? '파일 가져오기를 취소했습니다.'
          : result.fileIds.isEmpty
          ? '보관함에 등록된 오디오가 없습니다. 파일 가져오기 결과를 확인해 주세요.'
          : '보관함에 가져왔습니다: ${result.label}';
    });
    if (associationPending) await _associateSource();
  }

  Future<void> _associateSource() async {
    final result = importedResult;
    final source = completionSource;
    if (result == null || source == null || widget.onAssociateSource == null) {
      return;
    }
    if (!await _confirm(
          title: '가져온 음원 출처 확인',
          message:
              '${result.label}\n${result.fileIds.length}개 음원을 다음 작품의 IMSLP 출처로 연결할까요?\n'
              '${source.composerName ?? '작곡가 정보 없음'} · ${source.title}\n${source.pageUrl}\n'
              '직접 선택한 파일이 이 작품의 녹음인지 확인해 주세요. 권리와 지역 조건은 별도 확인이 필요합니다.',
          confirmLabel: '확인한 파일에 출처 연결',
        ) ||
        !mounted) {
      return;
    }
    try {
      await widget.onAssociateSource!(source, result);
      if (mounted) {
        setState(() {
          associationPending = false;
          message = '선택한 음원의 IMSLP 출처를 연결했습니다.';
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => message = '음원은 가져왔지만 출처 연결을 저장하지 못했습니다. 다시 시도해 주세요.');
      }
    }
  }

  Future<void> _link(ImslpWorkSearchResult result) async {
    final work = selectedWork;
    if (work == null) return;
    final confirmed = await _confirm(
      title: 'IMSLP 작품 연결',
      message:
          '로컬 작품: ${work.title.ko}\nIMSLP: ${result.composerName ?? '작곡가 정보 없음'} · ${result.title}\n이 작품 페이지를 연결할까요?',
      confirmLabel: '연결',
    );
    if (!confirmed || !mounted) return;
    try {
      await widget.store.upsertWorkLink(
        ImslpWorkLink(
          workId: work.id,
          externalId: result.externalId,
          pageUrl: result.pageUrl.toString(),
          workTitle: result.title,
          composerName: result.composerName,
          catalogNumber: result.catalogNumber,
          linkedAtMillis: DateTime.now().millisecondsSinceEpoch,
        ),
      );
      await _reload();
      if (mounted) setState(() => searchResults = const []);
    } on ImslpLinkConflictException {
      if (mounted) setState(() => message = '이 IMSLP 작품은 다른 로컬 작품에 연결되어 있습니다.');
    }
  }

  Future<void> _manualLink() async {
    final controller = TextEditingController();
    final value = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('IMSLP 작품 URL 연결'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            labelText: 'https://imslp.org/wiki/...',
            prefixIcon: Icon(Icons.link_outlined),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('취소'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('확인'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (value == null || !mounted) return;
    final uri = ImslpUrlPolicy.normalizeOfficialHttps(value);
    if (uri == null || !uri.path.startsWith('/wiki/')) {
      setState(() => message = '공식 IMSLP HTTPS 작품 URL을 입력해 주세요.');
      return;
    }
    final title = Uri.decodeComponent(uri.pathSegments.last)
        .replaceAll('_', ' ');
    await _link(
      ImslpWorkSearchResult(
        externalId: title,
        title: title.replaceFirst(RegExp(r'\s*\([^()]*\)\s*$'), ''),
        composerName: RegExp(r'\(([^()]*)\)\s*$').firstMatch(title)?.group(1),
        pageUrl: uri,
      ),
    );
  }

  Future<void> _unlink() async {
    final work = selectedWork;
    if (work == null) return;
    if (!await _confirm(
      title: 'IMSLP 연결 해제',
      message: '작품 페이지 연결과 자료 목록을 해제할까요? 가져온 로컬 파일은 삭제하지 않습니다.',
      confirmLabel: '해제',
    )) {
      return;
    }
    if (!mounted) return;
    await widget.store.unlinkWork(work.id);
    await _reload();
  }

  Future<void> _addResource() async {
    final work = selectedWork;
    if (work == null) return;
    final link = currentLink;
    if (link == null) return;
    final saved = await showDdiroriDialog<bool>(
      context: context,
      title: 'IMSLP 자료 등록',
      child: _ImslpResourceForm(
        workId: work.id,
        pageUrl: link.pageUrl,
        onSave: (resource) =>
            widget.store.saveResources(work.id, [...resources, resource]),
      ),
    );
    if (saved == true && mounted) await _reload();
  }

  Future<void> _download(
    ImslpResource resource, {
    bool recovery = false,
  }) async {
    final coordinator = widget.importCoordinator;
    if (coordinator == null || downloading) return;
    if (!await _confirm(
      title: recovery ? '저장된 자료 등록 재시도' : '자료 다운로드',
      message:
          '${resource.rightsNotice}\nIMSLP 표기는 한국에서의 이용 가능성을 보장하지 않습니다. 확인 후 다운로드할까요?',
      confirmLabel: recovery ? '확인 후 등록 재시도' : '확인 후 다운로드',
    )) {
      return;
    }
    if (!mounted) return;
    cancellation = ImslpDownloadCancellation();
    setState(() {
      downloading = true;
      downloadProgress = null;
      message = '다운로드 중';
    });
    try {
      final record = await coordinator.import(
        resource,
        rightsConfirmed: true,
        cancellation: cancellation,
        onProgress: (progress) {
          if (mounted) setState(() => downloadProgress = progress.fraction);
        },
        onStage: (stage) {
          if (!mounted) return;
          setState(() {
            downloadProgress = null;
            message = switch (stage) {
              ImslpTransferStatus.downloading => '다운로드 중',
              ImslpTransferStatus.verifying => '파일 검증 중',
              ImslpTransferStatus.importing => '보관함 등록 중',
              ImslpTransferStatus.completed => '가져오기 완료',
              _ => '자료 처리 중',
            };
          });
        },
      );
      if (mounted) {
        setState(() {
          message = record.fileId == null
              ? '자료를 저장했습니다. PDF·MIDI는 오디오 곡 목록에 추가되지 않습니다.'
              : '보관함에 가져왔습니다: ${record.originalFileName}';
          importedResult = record.fileId == null
              ? null
              : ImslpLocalImportResult(
                  fileIds: [record.fileId!],
                  label: record.originalFileName,
                );
          associationPending = false;
          completionSource = null;
        });
      }
    } on ImslpDownloadException catch (error) {
      if (mounted) setState(() => message = error.userMessage);
    } catch (_) {
      if (mounted) setState(() => message = '자료를 가져오지 못했습니다. 다시 시도해 주세요.');
    } finally {
      if (mounted) {
        setState(() => downloading = false);
        await _reloadRecoveries();
      }
    }
  }

  Future<bool> _open(Uri uri, {ImslpWorkSearchResult? source}) async {
    // A failed attempt to open another page must not reuse a previous source.
    setState(() => openedSource = null);
    if (ImslpUrlPolicy.normalizeOfficialHttps(uri.toString()) == null) {
      setState(() => message = '공식 IMSLP HTTPS 페이지를 확인해 주세요.');
      return false;
    }
    bool opened;
    try {
      opened = await (widget.openUri ?? (uri) => launchUrl(uri))(uri);
    } catch (_) {
      opened = false;
    }
    if (!mounted) return false;
    if (!opened && mounted) setState(() => message = '외부 페이지를 열지 못했습니다.');
    if (opened) {
      setState(() {
        openedSource = source;
        message = '공식 페이지를 열었습니다. 녹음의 권리·지역 조건을 확인해 Files에 저장한 뒤, 앱으로 돌아와 음원 파일을 가져오세요.';
      });
    }
    return opened;
  }

  Future<bool> _confirm({
    required String title,
    required String message,
    required String confirmLabel,
  }) async => showDdiroriConfirmDialog(
    context: context,
    title: title,
    message: message,
    confirmLabel: confirmLabel,
  );

  @override
  Widget build(BuildContext context) {
    final link = currentLink;
    final busy = actionBusy || downloading;
    final completion = importedResult;
    final linkedSource = link == null
        ? null
        : ImslpWorkSearchResult(
            externalId: link.externalId,
            title: link.workTitle,
            composerName: link.composerName,
            pageUrl: Uri.parse(link.pageUrl),
          );
    return Scaffold(
      appBar: AppBar(title: const Text('IMSLP 자료')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text(
              'IMSLP 작품 검색',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const Text('로컬 보관함 검색과 별개입니다. 검색 결과는 작품 페이지이며 음원 파일 목록이 아닙니다.'),
            const SizedBox(height: 12),
            DdiroriInput(
              value: searchController.text,
              onChanged: _changeQuery,
              label: '작곡가, 작품, 작품번호',
              search: true,
              clearable: true,
              onSubmitted: (_) => _search(),
            ),
            Wrap(
              spacing: 8,
              children: [
                DdiroriIconButton(
                  label: 'IMSLP 검색',
                  icon: Icons.search,
                  onPressed: () => unawaited(_search()),
                ),
                if (searching)
                  DdiroriButton(
                    label: '검색 취소',
                    kind: DdiroriButtonKind.quiet,
                    onPressed: _cancelSearch,
                  ),
                if (searchFailed)
                  DdiroriButton(label: '검색 다시 시도', onPressed: _search),
              ],
            ),
            if (searching)
              const LinearProgressIndicator(semanticsLabel: 'IMSLP 검색 중'),
            if (message != null) ...[
              const SizedBox(height: 12),
              Semantics(
                liveRegion: true,
                child: Text(message!, key: const Key('imslp-status')),
              ),
            ],
            for (final result in searchResults)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      result.title,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    Text(result.composerName ?? '작곡가 정보 없음'),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        DdiroriButton(
                          label: '공식 페이지에서 녹음 확인',
                          icon: Icons.open_in_new_outlined,
                          kind: DdiroriButtonKind.secondary,
                          onPressed: busy
                              ? null
                              : () => _runAction(() async {
                                  await _open(result.pageUrl, source: result);
                                }),
                        ),
                        if (selectedWork != null && !loadFailed && !loading)
                          DdiroriIconButton(
                            label: '이 작품 연결',
                            icon: Icons.add_link_outlined,
                            onPressed: busy
                                ? null
                                : () => unawaited(
                                    _runAction(() => _link(result)),
                                  ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            const Divider(),
            const Text(
              '공식 페이지에서 녹음의 권리·라이선스·지역 조건을 확인하고 Files에 저장하세요. 앱으로 돌아와 음원 파일을 가져오면 됩니다. PDF·MIDI는 재생할 오디오가 아닙니다.',
            ),
            const SizedBox(height: 8),
            DdiroriButton(
              label: '음원 파일 가져오기',
              icon: Icons.file_open_outlined,
              onPressed: busy || widget.onImportLocalFiles == null
                  ? null
                  : () => _runAction(_importLocal),
            ),
            if (widget.onImportLocalFiles == null)
              const Text('앱의 보관함에서 파일 가져오기를 사용해 주세요.'),
            if (completion != null && completion.fileIds.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text('가져온 음원 · ${completion.label}'),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  if (widget.onShowImportedFiles != null)
                    DdiroriButton(
                      label: '가져온 곡 보기',
                      kind: DdiroriButtonKind.secondary,
                      onPressed: busy
                          ? null
                          : () => _runAction(
                              () => widget.onShowImportedFiles!(completion),
                            ),
                    ),
                  if (widget.onPlayImportedFiles != null)
                    DdiroriButton(
                      label: '가져온 곡 재생',
                      icon: Icons.play_arrow,
                      onPressed: busy
                          ? null
                          : () => _runAction(
                              () => widget.onPlayImportedFiles!(completion),
                            ),
                    ),
                  if (associationPending)
                    DdiroriButton(
                      label: '출처 연결 확인',
                      kind: DdiroriButtonKind.secondary,
                      onPressed: busy
                          ? null
                          : () => _runAction(_associateSource),
                    ),
                ],
              ),
            ],
            const Divider(),
            if (widget.importCoordinator != null) ...[
              Text('저장된 자료 복구', style: Theme.of(context).textTheme.titleMedium),
              const Text('다운로드 후 등록하지 못한 자료는 저장된 파일을 검증해 다시 등록합니다.'),
              if (recoveryLoading)
                const LinearProgressIndicator(semanticsLabel: '복구 목록 확인 중'),
              for (final warning in recoveryWarnings) Text(warning),
              for (final resource in recoverable)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(resource.originalFileName ?? resource.kind.label),
                  subtitle: Text(
                    '${resource.kind.label}\n${resource.rightsNotice}',
                  ),
                  trailing: DdiroriIconButton(
                    label: '저장된 자료 등록 재시도',
                    icon: Icons.refresh,
                    onPressed: busy || recoveryLoading
                        ? null
                        : () => _runAction(
                            () => _download(resource, recovery: true),
                          ),
                  ),
                ),
              DdiroriButton(
                label: '복구 목록 다시 확인',
                kind: DdiroriButtonKind.quiet,
                onPressed: busy || recoveryLoading
                    ? null
                    : () => _runAction(_reloadRecoveries),
              ),
              const Divider(),
            ],
            if (downloading) ...[
              LinearProgressIndicator(
                value: downloadProgress,
                semanticsLabel: 'IMSLP 자료 처리 중',
              ),
              DdiroriButton(
                onPressed: cancellation?.cancel,
                icon: Icons.close_outlined,
                label: '다운로드 취소',
                kind: DdiroriButtonKind.quiet,
              ),
            ],
            if (widget.library.works.isNotEmpty) ...[
              DropdownButtonFormField<Work>(
                initialValue: selectedWork,
                isExpanded: true,
                decoration: const InputDecoration(
                  labelText: '로컬 작품',
                  prefixIcon: Icon(Icons.library_music_outlined),
                ),
                items: [
                  for (final work in widget.library.works)
                    DropdownMenuItem(
                      value: work,
                      child: Text(
                        work.title.ko,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                ],
                onChanged: loading || busy
                    ? null
                    : (work) {
                        if (work != null) unawaited(_selectWork(work));
                      },
              ),
            ],
            const SizedBox(height: 16),
            if (loading)
              const Center(child: CircularProgressIndicator())
            else if (loadFailed)
              DdiroriButton(
                label: '연결 다시 불러오기',
                onPressed: () => _runAction(_reload),
              )
            else if (link == null && selectedWork != null) ...[
              DdiroriButton(
                onPressed: busy ? null : () => _runAction(_manualLink),
                icon: Icons.link_outlined,
                label: 'IMSLP 작품 URL 직접 연결',
                kind: DdiroriButtonKind.secondary,
              ),
            ] else if (link != null) ...[
              Text(
                link.workTitle,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              Text(
                [
                  ?link.composerName,
                  ?link.catalogNumber,
                  '자료별 권리와 한국에서의 이용 가능 여부를 확인해 주세요.',
                ].join('\n'),
              ),
              Wrap(
                spacing: 8,
                children: [
                  DdiroriIconButton(
                    label: 'IMSLP 페이지 열기',
                    onPressed: busy
                        ? null
                        : () => unawaited(
                            _runAction(() async {
                              await _open(
                                Uri.parse(link.pageUrl),
                                source: linkedSource,
                              );
                            }),
                          ),
                    icon: Icons.open_in_new_outlined,
                  ),
                  DdiroriIconButton(
                    label: '연결 해제',
                    onPressed: busy
                        ? null
                        : () => unawaited(_runAction(_unlink)),
                    icon: Icons.link_off_outlined,
                  ),
                ],
              ),
              const Divider(),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      '자료',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                  DdiroriIconButton(
                    label: '검증된 직접 URL 등록',
                    onPressed: busy
                        ? null
                        : () => unawaited(_runAction(_addResource)),
                    icon: Icons.add_outlined,
                  ),
                ],
              ),
              if (resources.isEmpty)
                const Text(
                  '자동 녹음 파일 조회는 지원하지 않습니다. IMSLP 공식 페이지에서 자료를 확인해 주세요.',
                ),
              for (final resource in resources)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(
                    resource.kind == ImslpResourceKind.audio
                        ? Icons.audio_file_outlined
                        : Icons.description_outlined,
                  ),
                  title: Text(resource.originalFileName ?? resource.kind.label),
                  subtitle: Text(
                    '${resource.kind.label}\n${resource.rightsNotice}',
                  ),
                  trailing:
                      const ImslpDownloadPolicy().decide(resource) ==
                              ImslpDownloadDecision.requiresConfirmation &&
                          widget.importCoordinator != null
                      ? DdiroriIconButton(
                          label: '확인 후 다운로드',
                          onPressed: busy
                              ? null
                              : () => unawaited(
                                  _runAction(() => _download(resource)),
                                ),
                          icon: Icons.download_outlined,
                        )
                      : DdiroriIconButton(
                          label: 'IMSLP 페이지에서 확인',
                          onPressed: busy
                              ? null
                              : () => unawaited(
                                  _runAction(() async {
                                    await _open(
                                      Uri.parse(resource.pageUrl),
                                      source: linkedSource,
                                    );
                                  }),
                                ),
                          icon: Icons.open_in_new_outlined,
                        ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ImslpResourceForm extends StatefulWidget {
  const _ImslpResourceForm({
    required this.workId,
    required this.pageUrl,
    required this.onSave,
  });
  final String workId;
  final String pageUrl;
  final Future<void> Function(ImslpResource resource) onSave;

  @override
  State<_ImslpResourceForm> createState() => _ImslpResourceFormState();
}

class _ImslpResourceFormState extends State<_ImslpResourceForm> {
  String url = '';
  String name = '';
  String? error;
  bool saving = false;
  final int createdAt = DateTime.now().microsecondsSinceEpoch;
  ImslpResourceKind kind = ImslpResourceKind.score;
  ImslpRightsStatus rights = ImslpRightsStatus.reviewRequired;

  Future<void> _save() async {
    if (saving) return;
    final uri = ImslpUrlPolicy.normalizeOfficialHttps(url);
    if (uri == null || name.trim().isEmpty) {
      setState(() => error = '공식 IMSLP HTTPS 직접 URL과 원본 파일명을 입력해 주세요.');
      return;
    }
    setState(() {
      saving = true;
      error = null;
    });
    try {
      await widget.onSave(
        ImslpResource(
          id: 'imslp-resource-$createdAt',
          workId: widget.workId,
          pageUrl: widget.pageUrl,
          kind: kind,
          rightsStatus: rights,
          fetchedAtMillis: createdAt ~/ 1000,
          directDownloadUrl: uri.toString(),
          originalFileName: name.trim(),
          rawCopyrightStatus: rights.label,
          regionLabel: '한국에서의 이용 가능 여부는 별도 확인이 필요할 수 있음',
          isSoundRecording: kind == ImslpResourceKind.audio,
        ),
      );
      if (mounted) Navigator.of(context).pop(true);
    } catch (_) {
      if (mounted) {
        setState(() => error = '자료를 저장하지 못했습니다. 입력한 내용을 확인하고 다시 시도해 주세요.');
      }
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !saving,
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'URL 입력은 이용 권리 확인이 아닙니다. 공식 페이지의 권리 표기를 직접 확인해 주세요. PDF·MIDI는 재생할 오디오가 아닙니다.',
        ),
        DdiroriInput(
          value: url,
          onChanged: (v) => setState(() => url = v),
          label: '공식 직접 URL',
          enabled: !saving,
          keyboardType: TextInputType.url,
        ),
        DdiroriInput(
          value: name,
          onChanged: (v) => setState(() => name = v),
          label: '원본 파일명',
          enabled: !saving,
        ),
        DropdownButtonFormField<ImslpResourceKind>(
          initialValue: kind,
          isExpanded: true,
          decoration: const InputDecoration(labelText: '자료 종류'),
          items: [
            for (final value in ImslpResourceKind.values)
              DropdownMenuItem(value: value, child: Text(value.label)),
          ],
          onChanged: saving ? null : (v) => setState(() => kind = v ?? kind),
        ),
        DropdownButtonFormField<ImslpRightsStatus>(
          initialValue: rights,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'IMSLP 권리 표기'),
          items: [
            for (final value in ImslpRightsStatus.values)
              DropdownMenuItem(value: value, child: Text(value.label)),
          ],
          onChanged: saving
              ? null
              : (v) => setState(() => rights = v ?? rights),
        ),
        if (error != null) Semantics(liveRegion: true, child: Text(error!)),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          alignment: WrapAlignment.end,
          children: [
            DdiroriButton(
              label: '취소',
              kind: DdiroriButtonKind.quiet,
              onPressed: saving ? null : () => Navigator.of(context).pop(),
            ),
            DdiroriButton(
              label: '등록',
              busy: saving,
              onPressed: saving ? null : _save,
            ),
          ],
        ),
      ],
    ),
  );
}
