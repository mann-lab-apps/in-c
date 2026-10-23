import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'classical_library_models.dart';
import 'imslp.dart';
import 'imslp_download.dart';

class ImslpLibraryScreen extends StatefulWidget {
  const ImslpLibraryScreen({
    super.key,
    required this.library,
    required this.store,
    required this.client,
    this.importCoordinator,
    this.openUri,
  });

  final ClassicalLibrary library;
  final ImslpStore store;
  final ImslpCatalogClient client;
  final ImslpImportCoordinator? importCoordinator;
  final Future<bool> Function(Uri uri)? openUri;

  @override
  State<ImslpLibraryScreen> createState() => _ImslpLibraryScreenState();
}

class _ImslpLibraryScreenState extends State<ImslpLibraryScreen> {
  Work? selectedWork;
  List<ImslpWorkLink> links = const [];
  List<ImslpResource> resources = const [];
  List<ImslpWorkSearchResult> searchResults = const [];
  bool loading = true;
  bool searching = false;
  bool downloading = false;
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
    searchController = TextEditingController(text: _defaultQuery());
    unawaited(_reload());
  }

  @override
  void dispose() {
    cancellation?.cancel();
    searchController.dispose();
    super.dispose();
  }

  String _defaultQuery() {
    final work = selectedWork;
    if (work == null) return '';
    return buildImslpWorkQuery(work, widget.library.person(work.composerId));
  }

  Future<void> _reload() async {
    final loadedLinks = await widget.store.loadWorkLinks();
    final work = selectedWork;
    final loadedResources = work == null
        ? const <ImslpResource>[]
        : await widget.store.loadResources(work.id);
    if (!mounted) return;
    setState(() {
      links = loadedLinks;
      resources = loadedResources;
      loading = false;
    });
  }

  Future<void> _selectWork(Work work) async {
    setState(() {
      selectedWork = work;
      searchResults = const [];
      searchController.text = _defaultQuery();
      loading = true;
      message = null;
    });
    await _reload();
  }

  Future<void> _search() async {
    if (searching) return;
    setState(() {
      searching = true;
      message = null;
    });
    try {
      final results = await widget.client.searchWorks(searchController.text);
      if (!mounted) return;
      setState(() {
        searchResults = results;
        message = results.isEmpty ? '일치하는 IMSLP 작품을 찾지 못했습니다.' : null;
      });
    } on ImslpClientException catch (error) {
      if (mounted) setState(() => message = error.userMessage);
    } finally {
      if (mounted) setState(() => searching = false);
    }
  }

  Future<void> _link(ImslpWorkSearchResult result) async {
    final work = selectedWork;
    if (work == null) return;
    final confirmed = await _confirm(
      title: 'IMSLP 작품 연결',
      message:
          '${result.composerName ?? '작곡가 정보 없음'} · ${result.title}\n이 작품 페이지를 연결할까요?',
      confirmLabel: '연결',
    );
    if (!confirmed) return;
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
    await widget.store.unlinkWork(work.id);
    await _reload();
  }

  Future<void> _addResource() async {
    final work = selectedWork;
    if (work == null) return;
    final link = currentLink;
    if (link == null) return;
    final urlController = TextEditingController();
    final nameController = TextEditingController();
    var kind = ImslpResourceKind.score;
    var rights = ImslpRightsStatus.reviewRequired;
    final resource = await showDialog<ImslpResource>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, update) => AlertDialog(
          title: const Text('IMSLP 자료 등록'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: urlController,
                  decoration: const InputDecoration(labelText: '공식 직접 URL'),
                ),
                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(labelText: '원본 파일명'),
                ),
                DropdownButtonFormField<ImslpResourceKind>(
                  initialValue: kind,
                  decoration: const InputDecoration(labelText: '자료 종류'),
                  items: [
                    for (final value in ImslpResourceKind.values)
                      DropdownMenuItem(value: value, child: Text(value.label)),
                  ],
                  onChanged: (value) => update(() => kind = value ?? kind),
                ),
                DropdownButtonFormField<ImslpRightsStatus>(
                  initialValue: rights,
                  decoration: const InputDecoration(labelText: 'IMSLP 권리 표기'),
                  items: [
                    for (final value in ImslpRightsStatus.values)
                      DropdownMenuItem(value: value, child: Text(value.label)),
                  ],
                  onChanged: (value) => update(() => rights = value ?? rights),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('취소'),
            ),
            FilledButton(
              onPressed: () {
                final uri = ImslpUrlPolicy.normalizeOfficialHttps(
                  urlController.text,
                );
                if (uri == null || nameController.text.trim().isEmpty) return;
                final now = DateTime.now().millisecondsSinceEpoch;
                Navigator.pop(
                  context,
                  ImslpResource(
                    id: 'imslp-resource-$now',
                    workId: work.id,
                    pageUrl: link.pageUrl,
                    kind: kind,
                    rightsStatus: rights,
                    fetchedAtMillis: now,
                    directDownloadUrl: uri.toString(),
                    originalFileName: nameController.text.trim(),
                    rawCopyrightStatus: rights.label,
                    regionLabel: '한국에서의 이용 가능 여부는 별도 확인이 필요할 수 있음',
                    isSoundRecording: kind == ImslpResourceKind.audio,
                  ),
                );
              },
              child: const Text('등록'),
            ),
          ],
        ),
      ),
    );
    urlController.dispose();
    nameController.dispose();
    if (resource == null) return;
    await widget.store.saveResources(work.id, [...resources, resource]);
    await _reload();
  }

  Future<void> _download(ImslpResource resource) async {
    final coordinator = widget.importCoordinator;
    if (coordinator == null || downloading) return;
    if (!await _confirm(
      title: '자료 다운로드',
      message:
          '${resource.rightsNotice}\nIMSLP 표기는 한국에서의 이용 가능성을 보장하지 않습니다. 확인 후 다운로드할까요?',
      confirmLabel: '확인 후 다운로드',
    )) {
      return;
    }
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
      );
      if (mounted) {
        setState(() => message = '라이브러리에 가져왔습니다: ${record.originalFileName}');
      }
    } on ImslpDownloadException catch (error) {
      if (mounted) setState(() => message = error.userMessage);
    } finally {
      if (mounted) setState(() => downloading = false);
    }
  }

  Future<bool> _open(Uri uri) async {
    final opened = await (widget.openUri ?? (uri) => launchUrl(uri))(uri);
    if (!opened && mounted) setState(() => message = '외부 페이지를 열지 못했습니다.');
    return opened;
  }

  Future<bool> _confirm({
    required String title,
    required String message,
    required String confirmLabel,
  }) async =>
      await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(title),
          content: Text(message),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('취소'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(confirmLabel),
            ),
          ],
        ),
      ) ??
      false;

  @override
  Widget build(BuildContext context) {
    if (selectedWork == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('IMSLP 자료')),
        body: const SafeArea(
          child: Center(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Text(
                '먼저 음원 파일을 작품과 녹음에 정리하면 IMSLP 작품 자료를 연결할 수 있습니다.',
                textAlign: TextAlign.center,
              ),
            ),
          ),
        ),
      );
    }
    final link = currentLink;
    return Scaffold(
      appBar: AppBar(title: const Text('IMSLP 자료')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            DropdownButtonFormField<Work>(
              initialValue: selectedWork,
              decoration: const InputDecoration(
                labelText: '로컬 작품',
                prefixIcon: Icon(Icons.library_music_outlined),
              ),
              items: [
                for (final work in widget.library.works)
                  DropdownMenuItem(value: work, child: Text(work.title.ko)),
              ],
              onChanged: loading || downloading
                  ? null
                  : (work) {
                      if (work != null) unawaited(_selectWork(work));
                    },
            ),
            const SizedBox(height: 16),
            if (loading)
              const Center(child: CircularProgressIndicator())
            else if (link == null) ...[
              TextField(
                controller: searchController,
                onSubmitted: (_) => _search(),
                decoration: InputDecoration(
                  labelText: '작곡가, 작품, 작품번호',
                  prefixIcon: const Icon(Icons.search_outlined),
                  suffixIcon: IconButton(
                    tooltip: 'IMSLP 검색',
                    onPressed: searching ? null : _search,
                    icon: const Icon(Icons.arrow_forward_outlined),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: _manualLink,
                icon: const Icon(Icons.link_outlined),
                label: const Text('IMSLP 작품 URL 직접 연결'),
              ),
              if (searching) const LinearProgressIndicator(),
              for (final result in searchResults)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(result.title),
                  subtitle: Text(result.composerName ?? '작곡가 정보 없음'),
                  trailing: IconButton(
                    tooltip: '이 작품 연결',
                    onPressed: () => _link(result),
                    icon: const Icon(Icons.add_link_outlined),
                  ),
                ),
            ] else ...[
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.public_outlined),
                title: Text(link.workTitle),
                subtitle: Text(
                  [
                    ?link.composerName,
                    ?link.catalogNumber,
                    '자료별 권리와 한국에서의 이용 가능 여부를 확인해 주세요.',
                  ].join('\n'),
                ),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      tooltip: 'IMSLP 페이지 열기',
                      onPressed: () => _open(Uri.parse(link.pageUrl)),
                      icon: const Icon(Icons.open_in_new_outlined),
                    ),
                    IconButton(
                      tooltip: '연결 해제',
                      onPressed: downloading ? null : _unlink,
                      icon: const Icon(Icons.link_off_outlined),
                    ),
                  ],
                ),
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
                  IconButton(
                    tooltip: '검증된 직접 URL 등록',
                    onPressed: downloading ? null : _addResource,
                    icon: const Icon(Icons.add_outlined),
                  ),
                ],
              ),
              if (resources.isEmpty)
                const Text(
                  '공식 API는 파일 목록을 제공하지 않습니다. IMSLP 페이지에서 자료를 확인해 주세요.',
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
                      ? IconButton(
                          tooltip: '확인 후 다운로드',
                          onPressed: downloading
                              ? null
                              : () => _download(resource),
                          icon: const Icon(Icons.download_outlined),
                        )
                      : IconButton(
                          tooltip: 'IMSLP 페이지에서 확인',
                          onPressed: () => _open(Uri.parse(resource.pageUrl)),
                          icon: const Icon(Icons.open_in_new_outlined),
                        ),
                ),
              if (downloading) ...[
                LinearProgressIndicator(value: downloadProgress),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton.icon(
                    onPressed: cancellation?.cancel,
                    icon: const Icon(Icons.close_outlined),
                    label: const Text('취소'),
                  ),
                ),
              ],
            ],
            if (message != null) ...[
              const SizedBox(height: 12),
              Text(message!, key: const Key('imslp-status')),
            ],
          ],
        ),
      ),
    );
  }
}
