import 'dart:io';

import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';

import 'audio_tags.dart';
import 'classical_library_models.dart';
import 'catalog_registration_screen.dart';
import 'file_links.dart';
import 'library_search.dart';
import 'library_deduplication.dart';
import 'library_catalog.dart';
import 'local_audio_import.dart';
import 'local_audio_export.dart';
import 'local_audio_scanner.dart';
import 'metadata_candidates.dart';
import 'metadata_overrides.dart';
import 'missing_file_relink.dart';
import 'musicbrainz.dart';
import 'presentation/metadata_edit_dialog.dart';
import 'presentation/play_library_components.dart';
import 'scanned_audio_store.dart';

enum LibraryFileFilter {
  needsReview(label: '정리 필요'),
  linked(label: '연결됨'),
  missing(label: '누락됨');

  const LibraryFileFilter({required this.label});
  final String label;
}

enum _FileMenuAction {
  editMetadata,
  musicBrainz,
  export,
  delete,
  replaceMissing,
  editLink,
  unlink,
  reject,
}

enum _ReplacementPickerAction { importNew }

class _ReplacementChoice {
  const _ReplacementChoice(this.file, {this.newlyImported = false});

  final LocalAudioFile file;
  final bool newlyImported;
}

class LibraryManagementSnapshot {
  const LibraryManagementSnapshot({
    required this.files,
    required this.candidates,
    required this.links,
    required this.library,
    this.overrides = const [],
    this.merges = const [],
  });

  final List<LocalAudioFile> files;
  final List<MetadataCandidate> candidates;
  final List<AudioFileTrackLink> links;
  final ClassicalLibrary library;
  final List<MetadataOverride> overrides;
  final List<LibraryEntityMerge> merges;
}

class LibraryManagementScreen extends StatefulWidget {
  const LibraryManagementScreen({
    super.key,
    required this.library,
    required this.files,
    required this.candidates,
    required this.links,
    this.overrides = const [],
    this.merges = const [],
    required this.scannedAudioRepository,
    required this.metadataCandidateRepository,
    required this.linkRepository,
    this.metadataOverrideRepository,
    this.musicBrainzClient,
    this.libraryMergeRepository,
    this.managedAudioLibrary,
    this.managedAudioExporter,
    this.missingFileRelinkRepository,
    this.audioFilePicker,
    this.localAudioImportController,
    this.onChanged,
    this.catalogRepository,
  });

  final ClassicalLibrary library;
  final List<LocalAudioFile> files;
  final List<MetadataCandidate> candidates;
  final List<AudioFileTrackLink> links;
  final List<MetadataOverride> overrides;
  final List<LibraryEntityMerge> merges;
  final ScannedAudioRepository scannedAudioRepository;
  final MetadataCandidateRepository metadataCandidateRepository;
  final AudioFileTrackLinkRepository linkRepository;
  final MetadataOverrideRepository? metadataOverrideRepository;
  final MusicBrainzClient? musicBrainzClient;
  final LibraryMergeRepository? libraryMergeRepository;
  final ManagedAudioLibrary? managedAudioLibrary;
  final ManagedAudioExporter? managedAudioExporter;
  final MissingFileRelinkRepository? missingFileRelinkRepository;
  final AudioFilePicker? audioFilePicker;
  final LocalAudioImportController? localAudioImportController;
  final ValueChanged<LibraryManagementSnapshot>? onChanged;
  final ClassicalCatalogRepository? catalogRepository;

  @override
  State<LibraryManagementScreen> createState() =>
      _LibraryManagementScreenState();
}

class _LibraryManagementScreenState extends State<LibraryManagementScreen> {
  final SearchNormalizer _normalizer = const SearchNormalizer();
  late List<LocalAudioFile> files = [...widget.files];
  late List<MetadataCandidate> candidates = [...widget.candidates];
  late List<AudioFileTrackLink> links = [...widget.links];
  late List<MetadataOverride> overrides = [...widget.overrides];
  late List<LibraryEntityMerge> merges = [...widget.merges];
  late ClassicalLibrary library = widget.library;
  LibraryFileFilter filter = LibraryFileFilter.needsReview;
  final Set<String> selectedFileIds = {};
  bool isSaving = false;
  ManagedAudioStorageSummary? storageSummary;

  @override
  void initState() {
    super.initState();
    _refreshStorageSummary();
  }

  Future<void> _refreshStorageSummary() async {
    final manager = widget.managedAudioLibrary;
    if (manager == null) return;
    final summary = await manager.storageSummary();
    if (!mounted) return;
    setState(() => storageSummary = summary);
  }

  List<LocalAudioFile> get filteredFiles => files.where((file) {
    return switch (filter) {
      LibraryFileFilter.needsReview =>
        file.availability == AudioFileAvailability.present &&
            file.importStatus == AudioImportStatus.needsReview,
      LibraryFileFilter.linked =>
        file.availability == AudioFileAvailability.present &&
            links.any((link) => link.fileId == file.id),
      LibraryFileFilter.missing =>
        file.availability == AudioFileAvailability.missing,
    };
  }).toList();

  MetadataCandidate? _candidateFor(String fileId) =>
      candidates.cast<MetadataCandidate?>().firstWhere(
        (candidate) => candidate?.fileId == fileId,
        orElse: () => null,
      );

  AudioFileTrackLink? _linkFor(String fileId) => links
      .cast<AudioFileTrackLink?>()
      .firstWhere((link) => link?.fileId == fileId, orElse: () => null);

  MetadataOverride? _overrideFor(String fileId) => overrides
      .cast<MetadataOverride?>()
      .firstWhere((item) => item?.fileId == fileId, orElse: () => null);

  EffectiveFileMetadata _effectiveFor(LocalAudioFile file) =>
      EffectiveFileMetadata.resolve(
        candidate: _candidateFor(file.id),
        tag: file.tagMetadata,
        override: _overrideFor(file.id),
      );

  Future<void> _editMetadata(LocalAudioFile file) async {
    final repository = widget.metadataOverrideRepository;
    if (repository == null || isSaving) return;
    final existing = _overrideFor(file.id);
    final effective = _effectiveFor(file);
    final result = await showDialog<MetadataEditResult>(
      context: context,
      barrierDismissible: false,
      builder: (context) => MetadataEditDialog(
        existing: existing,
        effective: effective,
        onSave: (result) async {
          setState(() => isSaving = true);
          try {
            final saved = result.reset
                ? await repository.clearUserValues(file.id)
                : await repository.saveUserValues(file.id, result.values);
            if (!mounted) return;
            setState(() => overrides = saved);
            _notifyChanged();
          } finally {
            if (mounted) setState(() => isSaving = false);
          }
        },
      ),
    );
    if (result != null && mounted) {
      _showMessage(result.reset ? '사용자 교정을 초기화했습니다.' : '메타데이터 교정을 저장했습니다.');
    }
  }

  Future<void> _reviewMusicBrainz(LocalAudioFile file) async {
    final repository = widget.metadataOverrideRepository;
    final client = widget.musicBrainzClient;
    if (repository == null) return;
    if (client == null) {
      _showMessage('MusicBrainz 조회에는 MUSICBRAINZ_CONTACT 실행 설정이 필요합니다.');
      return;
    }
    setState(() => isSaving = true);
    try {
      final query = MusicBrainzSearchQuery.fromMetadata(_effectiveFor(file));
      final candidates = await client.searchRecordings(query);
      if (!mounted) return;
      if (candidates.isEmpty) {
        _showMessage('MusicBrainz에서 일치하는 후보를 찾지 못했습니다.');
        return;
      }
      final candidate = await showDialog<MusicBrainzCandidate>(
        context: context,
        builder: (context) => SimpleDialog(
          title: const Text('MusicBrainz 후보 선택'),
          children: [
            for (final candidate in candidates)
              SimpleDialogOption(
                onPressed: () => Navigator.pop(context, candidate),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Text(candidate.summary),
                ),
              ),
          ],
        ),
      );
      if (candidate == null || !mounted) return;
      final detailedCandidate = client is MusicBrainzDetailClient
          ? await (client as MusicBrainzDetailClient).lookupRecording(
              candidate.recordingId,
            )
          : candidate;
      if (!mounted) return;
      final selectedFields = await _pickMusicBrainzFields(
        detailedCandidate,
        current: _effectiveFor(file),
      );
      if (selectedFields == null || selectedFields.isEmpty || !mounted) return;
      overrides = await repository.applyMusicBrainzValues(
        fileId: file.id,
        values: {
          for (final entry in detailedCandidate.availableValues.entries)
            if (selectedFields.contains(entry.key)) entry.key: entry.value,
        },
        recordingId: detailedCandidate.recordingId,
        workId: detailedCandidate.workId,
        releaseId: detailedCandidate.releaseId,
      );
      setState(() {});
      _notifyChanged();
      _showMessage('선택한 MusicBrainz 메타데이터를 승인했습니다.');
    } on MusicBrainzException catch (error) {
      if (mounted) _showMessage(error.userMessage);
    } on FormatException catch (error) {
      if (mounted) _showMessage(error.message.toString());
    } finally {
      if (mounted) setState(() => isSaving = false);
    }
  }

  Future<Set<MetadataField>?> _pickMusicBrainzFields(
    MusicBrainzCandidate candidate, {
    required EffectiveFileMetadata current,
  }) {
    final selected = candidate.availableValues.keys.toSet();
    return showDialog<Set<MetadataField>>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('승인할 필드 선택'),
          content: SizedBox(
            width: 460,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  for (final entry in candidate.availableValues.entries)
                    CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      value: selected.contains(entry.key),
                      title: Text(entry.key.label),
                      subtitle: Text(
                        current.values[entry.key] == null
                            ? '현재 값 없음 → ${entry.value}'
                            : '현재: ${current.values[entry.key]} → 후보: ${entry.value}',
                      ),
                      onChanged: (checked) => setDialogState(() {
                        if (checked ?? false) {
                          selected.add(entry.key);
                        } else {
                          selected.remove(entry.key);
                        }
                      }),
                    ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('취소'),
            ),
            FilledButton(
              onPressed: selected.isEmpty
                  ? null
                  : () => Navigator.pop(context, selected),
              child: const Text('승인'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _reviewDuplicates() async {
    final repository = widget.libraryMergeRepository;
    if (repository == null || isSaving) return;
    final candidates = const LibraryDuplicateDetector().detect(
      library,
      existingMerges: merges,
    );
    if (candidates.isEmpty) {
      _showMessage('확실한 중복 작품이나 녹음 후보가 없습니다.');
      return;
    }
    final candidate = await showDialog<DuplicateLibraryCandidate>(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('중복 작품·녹음 검토'),
        children: [
          for (final candidate in candidates)
            SimpleDialogOption(
              onPressed: () => Navigator.pop(context, candidate),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Text(
                  '${candidate.sourceLabel} → ${candidate.targetLabel}\n'
                  '${candidate.evidence.join(' · ')} · '
                  '${(candidate.confidence * 100).round()}%',
                ),
              ),
            ),
        ],
      ),
    );
    if (candidate == null || !mounted) return;
    final representativeId = await showDialog<String>(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('대표 항목 선택'),
        children: [
          SimpleDialogOption(
            onPressed: () => Navigator.pop(context, candidate.targetId),
            child: Text(candidate.targetLabel),
          ),
          SimpleDialogOption(
            onPressed: () => Navigator.pop(context, candidate.sourceId),
            child: Text(candidate.sourceLabel),
          ),
        ],
      ),
    );
    if (representativeId == null || !mounted) return;
    final selectedCandidate = representativeId == candidate.targetId
        ? candidate
        : DuplicateLibraryCandidate(
            entityType: candidate.entityType,
            sourceId: candidate.targetId,
            targetId: candidate.sourceId,
            sourceLabel: candidate.targetLabel,
            targetLabel: candidate.sourceLabel,
            confidence: candidate.confidence,
            evidence: candidate.evidence,
          );
    final confirmed = await _confirm(
      title: '중복 병합 확인',
      message:
          '${selectedCandidate.sourceLabel}을(를) '
          '${selectedCandidate.targetLabel}에 병합합니다. '
          '감상 이력과 IMSLP 참조가 대표 항목으로 이동하며 감사 기록이 남습니다.',
      confirmLabel: '병합',
    );
    if (!confirmed || !mounted) return;
    await _runSave(() async {
      merges = await repository.confirm(selectedCandidate);
    });
    if (mounted) _showMessage('중복 항목을 병합하고 감사 기록을 저장했습니다.');
  }

  Future<void> _reviewMergeHistory() async {
    final repository = widget.libraryMergeRepository;
    if (repository == null || isSaving) return;
    if (merges.isEmpty) {
      _showMessage('저장된 병합 기록이 없습니다.');
      return;
    }
    final selected = await showDialog<LibraryEntityMerge>(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('병합 기록'),
        children: [
          for (final merge in merges)
            SimpleDialogOption(
              onPressed: merge.isActive
                  ? () => Navigator.pop(context, merge)
                  : null,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Text(
                  '${merge.sourceLabel} → ${merge.targetLabel}\n'
                  '${merge.entityType == LibraryEntityType.work ? '작품' : '녹음'} · '
                  '${merge.isActive ? '적용 중' : '되돌림 완료'}',
                ),
              ),
            ),
        ],
      ),
    );
    if (selected == null || !mounted) return;
    final confirmed = await _confirm(
      title: '병합 되돌리기',
      message:
          '${selected.sourceLabel}의 병합을 되돌립니다. '
          '병합 이후 관련 데이터가 변경되었다면 안전을 위해 실행되지 않습니다.',
      confirmLabel: '되돌리기',
    );
    if (!confirmed || !mounted) return;
    try {
      await _runSave(() async {
        merges = await repository.undo(selected.id);
      });
      if (mounted) _showMessage('병합을 되돌렸습니다.');
    } on LibraryMergeUndoException catch (error) {
      if (mounted) _showMessage(error.userMessage);
    }
  }

  Future<void> _editLink(LocalAudioFile file) async {
    final catalog = widget.catalogRepository;
    if (catalog != null) {
      final draft = await Navigator.of(context).push<CatalogRecordingDraft>(
        MaterialPageRoute(
          builder: (context) => CatalogRegistrationScreen(
            library: library,
            files: [file],
            candidates: candidates,
            overrides: overrides,
          ),
        ),
      );
      if (draft == null || !mounted) return;
      try {
        await _runSave(() async {
          final result = await catalog.reorganize(draft, files);
          library = result.library;
          files = await widget.scannedAudioRepository.load();
          links = await widget.linkRepository.load();
          candidates = await widget.metadataCandidateRepository.setReviewStatus(
            [file.id],
            MetadataReviewStatus.approved,
          );
        });
        if (mounted) _showMessage('작품과 녹음 연결을 저장했습니다.');
      } on FormatException catch (error) {
        if (mounted) _showMessage(error.message);
      }
      return;
    }
    final track = await _pickTrack(file);
    if (track == null || !mounted) return;
    final displacedLink = links.cast<AudioFileTrackLink?>().firstWhere(
      (link) => link?.trackId == track.id && link?.fileId != file.id,
      orElse: () => null,
    );
    final conflictMessage = displacedLink == null
        ? ''
        : '\n이 트랙에 연결된 다른 파일은 정리 필요 상태로 돌아갑니다.';
    final confirmed = await _confirm(
      title: '연결 저장',
      message:
          '${file.fileName ?? '선택한 파일'}을(를) '
          '${_trackLabel(track)}에 연결합니다.$conflictMessage',
      confirmLabel: '연결',
    );
    if (!confirmed) return;
    await _runSave(() async {
      links = await widget.linkRepository.linkFileToTrack(
        fileId: file.id,
        trackId: track.id,
        linkedAt: DateTime.now(),
      );
      files = await widget.scannedAudioRepository.markLinked(file.id);
      candidates = await widget.metadataCandidateRepository.setReviewStatus([
        file.id,
      ], MetadataReviewStatus.approved);
      if (displacedLink != null) {
        files = await widget.scannedAudioRepository.setImportStatus(
          displacedLink.fileId,
          AudioImportStatus.needsReview,
        );
        candidates = await widget.metadataCandidateRepository.setReviewStatus([
          displacedLink.fileId,
        ], MetadataReviewStatus.needsReview);
      }
    });
  }

  Future<void> _unlink(LocalAudioFile file) async {
    if (!await _confirm(
      title: '연결 해제',
      message: '파일과 트랙의 연결만 해제합니다. 원본 파일은 변경하지 않습니다.',
      confirmLabel: '해제',
    )) {
      return;
    }
    await _runSave(() async {
      final catalog = widget.catalogRepository;
      if (catalog == null) {
        links = await widget.linkRepository.unlinkFile(file.id);
        files = await widget.scannedAudioRepository.setImportStatus(
          file.id,
          AudioImportStatus.needsReview,
        );
      } else {
        final result = await catalog.unlinkFile(file.id, files);
        library = result.library;
        files = await widget.scannedAudioRepository.load();
        links = await widget.linkRepository.load();
      }
      candidates = await widget.metadataCandidateRepository.setReviewStatus([
        file.id,
      ], MetadataReviewStatus.needsReview);
    });
  }

  Future<void> _reject(LocalAudioFile file) async {
    if (!await _confirm(
      title: '후보 거절',
      message: '현재 자동 추론 후보를 거절하고 파일을 미분류 상태로 둡니다.',
      confirmLabel: '거절',
    )) {
      return;
    }
    await _runSave(() async {
      candidates = await widget.metadataCandidateRepository.setReviewStatus([
        file.id,
      ], MetadataReviewStatus.rejected);
      files = await widget.scannedAudioRepository.setImportStatus(
        file.id,
        AudioImportStatus.scanned,
      );
    });
  }

  Future<void> _deleteManagedFile(LocalAudioFile file) async {
    final manager = widget.managedAudioLibrary;
    if (manager == null) return;
    if (!await _confirm(
      title: '가져온 파일 삭제',
      message: '앱 관리 복사본과 연결 정보를 삭제합니다. 선택 당시 원본 파일과 감상 이력은 변경하지 않습니다.',
      confirmLabel: '삭제',
    )) {
      return;
    }
    try {
      await _runSave(() async {
        await manager.deleteByFileId(file.id);
        files = [
          for (final item in files)
            if (item.id != file.id) item,
        ];
        candidates = [
          for (final candidate in candidates)
            if (candidate.fileId != file.id) candidate,
        ];
        links = [
          for (final link in links)
            if (link.fileId != file.id) link,
        ];
        selectedFileIds.remove(file.id);
        storageSummary = await manager.storageSummary();
      });
      if (mounted) _showMessage('앱 관리 복사본을 삭제했습니다.');
    } on LocalAudioImportException catch (error) {
      if (mounted) _showMessage(error.userMessage);
    } on FileSystemException {
      if (mounted) _showMessage('파일을 삭제하지 못했습니다. 다시 시도하세요.');
    }
  }

  Future<void> _exportManagedFile(LocalAudioFile file) async {
    final manager = widget.managedAudioLibrary;
    final exporter = widget.managedAudioExporter;
    if (manager == null || exporter == null || isSaving) return;
    setState(() => isSaving = true);
    try {
      final exportFile = await manager.exportFileFor(file.id);
      if (!mounted) return;
      final size = MediaQuery.sizeOf(context);
      final result = await exporter.export(
        exportFile,
        sharePositionOrigin: Rect.fromLTWH(
          size.width / 2,
          size.height / 2,
          1,
          1,
        ),
      );
      if (mounted) _showMessage(result.userMessage);
    } on LocalAudioImportException catch (error) {
      if (mounted) _showMessage(error.userMessage);
    } catch (_) {
      if (mounted) _showMessage('음원을 내보내지 못했습니다. 다시 시도하세요.');
    } finally {
      if (mounted) setState(() => isSaving = false);
    }
  }

  bool _isManagedImport(LocalAudioFile file) => file.sourceReferences.any(
    (source) => source.kind == SourceKind.localImport,
  );

  String _formatStorage(int bytes) {
    if (bytes >= 1024 * 1024 * 1024) {
      return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
    }
    if (bytes >= 1024 * 1024) {
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    }
    if (bytes >= 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '$bytes B';
  }

  Future<void> _bulkApprove() async {
    final matches = <String, Track>{};
    final usedTrackIds = <String>{};
    for (final fileId in selectedFileIds) {
      final candidate = _candidateFor(fileId);
      final track = candidate == null ? null : _suggestTrack(candidate);
      if (track == null || !usedTrackIds.add(track.id)) continue;
      matches[fileId] = track;
    }
    if (matches.length != selectedFileIds.length) {
      _showMessage('고유한 작품·악장 후보가 없는 파일은 개별 연결이 필요합니다.');
      return;
    }
    final conflicts = matches.entries.where(
      (entry) => links.any(
        (link) => link.trackId == entry.value.id && link.fileId != entry.key,
      ),
    );
    if (conflicts.isNotEmpty) {
      _showMessage('이미 다른 파일에 연결된 트랙은 개별 확인 후 변경해야 합니다.');
      return;
    }
    if (!await _confirm(
      title: '후보 일괄 승인',
      message: '${matches.length}개 파일을 각각의 고유한 추천 악장에 연결합니다.',
      confirmLabel: '일괄 승인',
    )) {
      return;
    }
    await _runSave(() async {
      for (final entry in matches.entries) {
        links = await widget.linkRepository.linkFileToTrack(
          fileId: entry.key,
          trackId: entry.value.id,
          linkedAt: DateTime.now(),
        );
        files = await widget.scannedAudioRepository.markLinked(entry.key);
      }
      candidates = await widget.metadataCandidateRepository.setReviewStatus(
        matches.keys,
        MetadataReviewStatus.approved,
      );
      selectedFileIds.clear();
    });
  }

  Track? _suggestTrack(MetadataCandidate candidate) {
    final ranked = <(Track, int)>[];
    for (final track in library.tracks) {
      final recording = library.recording(track.recordingId);
      final work = library.work(recording.workId);
      final composer = library.person(work.composerId);
      var score = 0;
      if (candidate.trackNumber == track.sequenceNumber) score += 4;
      final workQuery = _normalizer.normalize(candidate.workTitleText ?? '');
      final workNames = _normalizer.normalize(work.title.searchNames.join(' '));
      if (workQuery.isNotEmpty && workNames.contains(workQuery)) score += 3;
      final composerQuery = _normalizer.normalize(candidate.composerText ?? '');
      final composerNames = _normalizer.normalize(
        composer.name.searchNames.join(' '),
      );
      if (composerQuery.isNotEmpty && composerNames.contains(composerQuery)) {
        score += 3;
      }
      if (score > 0) ranked.add((track, score));
    }
    ranked.sort((a, b) => b.$2.compareTo(a.$2));
    if (ranked.isEmpty || ranked.first.$2 < 4) return null;
    if (ranked.length > 1 && ranked[0].$2 == ranked[1].$2) return null;
    return ranked.first.$1;
  }

  Future<void> _replaceMissing(LocalAudioFile missing) async {
    final available = files
        .where(
          (file) =>
              file.id != missing.id &&
              file.availability == AudioFileAvailability.present &&
              _linkFor(file.id) == null,
        )
        .toList();
    final canImportNew =
        widget.audioFilePicker != null &&
        widget.localAudioImportController != null;
    if (available.isEmpty && !canImportNew) {
      _showMessage('대체할 수 있는 미연결 파일이 없습니다.');
      return;
    }
    final selection = await showDialog<Object>(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('대체 파일 선택'),
        children: [
          if (canImportNew)
            SimpleDialogOption(
              onPressed: () =>
                  Navigator.pop(context, _ReplacementPickerAction.importNew),
              child: const ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(Icons.file_open_outlined),
                title: Text('새 음원 파일 가져오기'),
              ),
            ),
          for (final file in available)
            SimpleDialogOption(
              onPressed: () => Navigator.pop(context, file),
              child: Text(file.fileName ?? fileNameForPath(file.path)),
            ),
        ],
      ),
    );
    if (selection == null || !mounted) return;
    final choice = selection == _ReplacementPickerAction.importNew
        ? await _importReplacementFile()
        : _ReplacementChoice(selection as LocalAudioFile);
    if (choice == null || !mounted) return;
    final replacement = choice.file;
    final assessment = const MissingFileRelinkPolicy().assess(
      missing: missing,
      replacement: replacement,
    );
    if (!assessment.canRelink) {
      _showMessage(assessment.reasons.first);
      await _discardImportedReplacement(choice);
      return;
    }
    final confirmed = await showDdiroriDialog<bool>(
      context: context,
      title: '누락 파일 재연결',
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${assessment.confidence.label} · 일치도 ${assessment.score}%'),
            const SizedBox(height: 8),
            for (final reason in assessment.reasons)
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text('• $reason'),
              ),
            const SizedBox(height: 8),
            const Text('기존 작품·녹음·악장 연결과 사용자 교정, 재생 기록을 유지합니다.'),
            const SizedBox(height: 16),
            Wrap(
              alignment: WrapAlignment.end,
              spacing: 8,
              runSpacing: 8,
              children: [
                DdiroriButton(
                  label: '취소',
                  kind: DdiroriButtonKind.quiet,
                  onPressed: () => Navigator.pop(context, false),
                ),
                DdiroriButton(
                  label: '재연결',
                  icon: Icons.find_replace_outlined,
                  onPressed: () => Navigator.pop(context, true),
                ),
              ],
            ),
          ],
        ),
      ),
    );
    if (confirmed != true || !mounted) {
      await _discardImportedReplacement(choice);
      return;
    }
    try {
      await _runSave(() async {
        final repository = widget.missingFileRelinkRepository;
        if (repository != null) {
          final result = await repository.reconnect(
            missing: missing,
            replacement: replacement,
          );
          files = result.files;
          candidates = result.candidates;
          return;
        }
        files = await widget.scannedAudioRepository.reconnectMissingFile(
          missingFileId: missing.id,
          replacementFileId: replacement.id,
        );
        candidates = await widget.metadataCandidateRepository.reconnectFile(
          retainedFileId: missing.id,
          replacementFileId: replacement.id,
          path: replacement.path,
          fileName: replacement.fileName ?? fileNameForPath(replacement.path),
        );
      });
      if (mounted) _showMessage('누락 파일을 재연결했습니다.');
    } on MissingFileRelinkException catch (error) {
      if (mounted) _showMessage(error.userMessage);
    } catch (_) {
      if (mounted) _showMessage('파일을 재연결하지 못했습니다. 다시 시도해 주세요.');
    }
  }

  Future<_ReplacementChoice?> _importReplacementFile() async {
    final picker = widget.audioFilePicker;
    final importer = widget.localAudioImportController;
    if (picker == null || importer == null) return null;
    setState(() => isSaving = true);
    try {
      final selected = await picker.pickAudioFiles();
      if (selected.isEmpty) {
        if (mounted) _showMessage('파일 선택을 취소했습니다.');
        return null;
      }
      final previousIds = {for (final file in files) file.id};
      final result = await importer.importFiles([selected.first]);
      if (result.items.isEmpty || !mounted) return null;
      final record = result.items.first.record;
      final replacement = record == null
          ? null
          : result.files.cast<LocalAudioFile?>().firstWhere(
              (file) => file?.path == record.localPath,
              orElse: () => null,
            );
      if (replacement == null) {
        _showMessage('선택한 파일을 분석하지 못했습니다.');
        return null;
      }
      files = result.files;
      candidates = result.candidates;
      setState(() {});
      return _ReplacementChoice(
        replacement,
        newlyImported: !previousIds.contains(replacement.id),
      );
    } on LocalAudioImportException catch (error) {
      if (mounted) _showMessage(error.userMessage);
      return null;
    } catch (_) {
      if (mounted) _showMessage('선택한 파일을 가져오지 못했습니다.');
      return null;
    } finally {
      if (mounted) setState(() => isSaving = false);
    }
  }

  Future<void> _discardImportedReplacement(_ReplacementChoice choice) async {
    final manager = widget.managedAudioLibrary;
    if (!choice.newlyImported || manager == null) return;
    try {
      await manager.deleteByFileId(choice.file.id);
      files = await widget.scannedAudioRepository.load();
      candidates = await widget.metadataCandidateRepository.load();
      if (mounted) setState(() {});
    } catch (_) {
      if (mounted) _showMessage('취소한 가져오기 파일을 정리하지 못했습니다.');
    }
  }

  Future<Track?> _pickTrack(LocalAudioFile file) async {
    var query = '';
    Track? selected = _linkFor(file.id) == null
        ? null
        : library.track(_linkFor(file.id)!.trackId);
    return showDialog<Track>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) {
          final normalizedQuery = _normalizer.normalize(query);
          final tracks = library.tracks.where((track) {
            if (normalizedQuery.isEmpty) return true;
            return _normalizer
                .normalize(_trackLabel(track))
                .contains(normalizedQuery);
          }).toList();
          return AlertDialog(
            title: const Text('작품·녹음·악장 선택'),
            content: SizedBox(
              width: 520,
              height: 420,
              child: Column(
                children: [
                  TextField(
                    onChanged: (value) => setDialogState(() => query = value),
                    decoration: const InputDecoration(
                      prefixIcon: Icon(Icons.search_outlined),
                      hintText: '작곡가, 작품, 녹음, 악장',
                    ),
                  ),
                  const SizedBox(height: 8),
                  Expanded(
                    child: RadioGroup<Track>(
                      groupValue: selected,
                      onChanged: (value) =>
                          setDialogState(() => selected = value),
                      child: ListView(
                        children: [
                          for (final track in tracks)
                            RadioListTile<Track>(
                              value: track,
                              title: Text(_trackLabel(track)),
                            ),
                        ],
                      ),
                    ),
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
                onPressed: selected == null
                    ? null
                    : () => Navigator.pop(context, selected),
                child: const Text('선택'),
              ),
            ],
          );
        },
      ),
    );
  }

  String _trackLabel(Track track) {
    final recording = library.recording(track.recordingId);
    final work = library.work(recording.workId);
    final composer = library.person(work.composerId);
    final title = track.title?.ko ?? '${track.sequenceNumber}번 트랙';
    return '${composer.name.ko} · ${work.title.ko} · '
        '${recording.title.ko} · $title';
  }

  String? _tagLine(LocalAudioFile file) {
    final tag = file.tagMetadata;
    if (tag != null) {
      final values = [
        ?tag.title,
        ?tag.album,
        ?tag.artist,
        if (tag.trackNumber != null)
          tag.trackTotal == null
              ? '${tag.trackNumber}번'
              : '${tag.trackNumber}/${tag.trackTotal}',
      ];
      if (values.isNotEmpty) return '태그 · ${values.join(' · ')}';
    }
    return switch (file.tagReadStatus) {
      AudioTagReadStatus.noTags => '태그 없음 · 파일명/경로 후보 사용',
      AudioTagReadStatus.unsupported => '태그를 지원하지 않는 형식',
      AudioTagReadStatus.failed => '태그를 읽지 못함 · 파일명/경로 후보 사용',
      AudioTagReadStatus.read => null,
    };
  }

  Future<bool> _confirm({
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

  Future<void> _runSave(Future<void> Function() operation) async {
    setState(() => isSaving = true);
    try {
      await operation();
      if (!mounted) return;
      setState(() {});
      _notifyChanged();
    } finally {
      if (mounted) setState(() => isSaving = false);
    }
  }

  void _notifyChanged() {
    widget.onChanged?.call(
      LibraryManagementSnapshot(
        files: files,
        candidates: candidates,
        links: links,
        library: library,
        overrides: overrides,
        merges: merges,
      ),
    );
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  void _handleFileMenu(_FileMenuAction action, LocalAudioFile file) {
    switch (action) {
      case _FileMenuAction.editMetadata:
        _editMetadata(file);
      case _FileMenuAction.musicBrainz:
        _reviewMusicBrainz(file);
      case _FileMenuAction.export:
        _exportManagedFile(file);
      case _FileMenuAction.delete:
        _deleteManagedFile(file);
      case _FileMenuAction.replaceMissing:
        _replaceMissing(file);
      case _FileMenuAction.editLink:
        _editLink(file);
      case _FileMenuAction.unlink:
        _unlink(file);
      case _FileMenuAction.reject:
        _reject(file);
    }
  }

  @override
  Widget build(BuildContext context) {
    final visible = filteredFiles;
    return Scaffold(
      appBar: AppBar(
        title: const Text('파일 정리'),
        actions: [
          if (widget.libraryMergeRepository != null)
            IconButton(
              tooltip: '병합 기록',
              onPressed: isSaving ? null : _reviewMergeHistory,
              icon: const Icon(Icons.history_outlined),
            ),
          if (widget.libraryMergeRepository != null)
            IconButton(
              tooltip: '중복 작품·녹음 검토',
              onPressed: isSaving ? null : _reviewDuplicates,
              icon: const Icon(Icons.merge_type_outlined),
            ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  DdiroriSegments<LibraryFileFilter>(
                    options: {
                      for (final option in LibraryFileFilter.values)
                        option: option.label,
                    },
                    selected: {filter},
                    onChanged: isSaving
                        ? null
                        : (selection) => setState(() {
                            filter = selection.first;
                            selectedFileIds.clear();
                          }),
                  ),
                  if (storageSummary case final summary?) ...[
                    const SizedBox(height: 8),
                    Text(
                      '앱 관리 음원 ${summary.fileCount}개 · '
                      '${_formatStorage(summary.totalBytes)}',
                    ),
                  ],
                  if (filter == LibraryFileFilter.needsReview) ...[
                    const SizedBox(height: 8),
                    DdiroriButton(
                      label: '선택 후보 승인 ${selectedFileIds.length}',
                      icon: Icons.done_all_outlined,
                      busy: isSaving,
                      onPressed: selectedFileIds.isEmpty || isSaving
                          ? null
                          : _bulkApprove,
                    ),
                  ],
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: visible.isEmpty
                  ? const DdiroriStatePanel(
                      title: '표시할 파일이 없습니다',
                      message: '선택한 조건에 해당하는 로컬 음원이 없습니다.',
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: visible.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final file = visible[index];
                        final candidate = _candidateFor(file.id);
                        final effective = _effectiveFor(file);
                        final link = _linkFor(file.id);
                        return PlayAudioFileRow(
                          file: file,
                          details: [
                            '${file.format} · ${file.availability.label}',
                            if (effective.values.isNotEmpty)
                              '${effective.summary} · '
                                  '${effective.sources.values.toSet().map((source) => source.label).join(', ')}',
                            ?_tagLine(file),
                            if (candidate != null)
                              '${candidate.summary} · '
                                  '${candidate.reviewStatus.label} · '
                                  '${(candidate.confidence * 100).round()}%',
                            if (candidate?.hasTagConflict ?? false)
                              '태그와 파일명 후보가 달라 확인이 필요합니다.',
                            if (link != null) '트랙 ${link.trackId}',
                          ].join('\n'),
                          missing: filter == LibraryFileFilter.missing,
                          selecting: filter == LibraryFileFilter.needsReview,
                          selected: selectedFileIds.contains(file.id),
                          enabled: !isSaving,
                          onSelected: isSaving
                              ? null
                              : (selected) => setState(() {
                                  if (selected) {
                                    selectedFileIds.add(file.id);
                                  } else {
                                    selectedFileIds.remove(file.id);
                                  }
                                }),
                          actions: [
                            widget.metadataOverrideRepository != null
                                ? PopupMenuButton<_FileMenuAction>(
                                    tooltip: '파일 작업',
                                    enabled: !isSaving,
                                    icon: const Icon(Icons.more_vert),
                                    onSelected: (action) =>
                                        _handleFileMenu(action, file),
                                    itemBuilder: (context) => [
                                      const PopupMenuItem(
                                        value: _FileMenuAction.editMetadata,
                                        child: Text('내부 메타데이터 편집'),
                                      ),
                                      const PopupMenuItem(
                                        value: _FileMenuAction.musicBrainz,
                                        child: Text('MusicBrainz 후보 찾기'),
                                      ),
                                      if (_isManagedImport(file) &&
                                          widget.managedAudioExporter != null)
                                        const PopupMenuItem(
                                          value: _FileMenuAction.export,
                                          child: Text('앱 관리 복사본 내보내기'),
                                        ),
                                      if (_isManagedImport(file))
                                        const PopupMenuItem(
                                          value: _FileMenuAction.delete,
                                          child: Text('앱 관리 복사본 삭제'),
                                        ),
                                      if (filter == LibraryFileFilter.missing)
                                        const PopupMenuItem(
                                          value: _FileMenuAction.replaceMissing,
                                          child: Text('대체 파일 선택'),
                                        )
                                      else ...[
                                        PopupMenuItem(
                                          value: _FileMenuAction.editLink,
                                          child: Text(
                                            link == null ? '트랙 연결' : '연결 변경',
                                          ),
                                        ),
                                        if (link != null)
                                          const PopupMenuItem(
                                            value: _FileMenuAction.unlink,
                                            child: Text('연결 해제'),
                                          )
                                        else
                                          const PopupMenuItem(
                                            value: _FileMenuAction.reject,
                                            child: Text('후보 거절'),
                                          ),
                                      ],
                                    ],
                                  )
                                : Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      if (_isManagedImport(file))
                                        IconButton(
                                          tooltip: '앱 관리 복사본 내보내기',
                                          onPressed:
                                              isSaving ||
                                                  widget.managedAudioExporter ==
                                                      null
                                              ? null
                                              : () => _exportManagedFile(file),
                                          icon: const Icon(
                                            Icons.ios_share_outlined,
                                          ),
                                        ),
                                      if (_isManagedImport(file))
                                        IconButton(
                                          tooltip: '앱 관리 복사본 삭제',
                                          onPressed: isSaving
                                              ? null
                                              : () => _deleteManagedFile(file),
                                          icon: const Icon(
                                            Icons.delete_outline,
                                          ),
                                        ),
                                      if (filter == LibraryFileFilter.missing)
                                        IconButton(
                                          tooltip: '대체 파일 선택',
                                          onPressed: isSaving
                                              ? null
                                              : () => _replaceMissing(file),
                                          icon: const Icon(
                                            Icons.find_replace_outlined,
                                          ),
                                        )
                                      else ...[
                                        IconButton(
                                          tooltip: link == null
                                              ? '트랙 연결'
                                              : '연결 변경',
                                          onPressed: isSaving
                                              ? null
                                              : () => _editLink(file),
                                          icon: const Icon(Icons.edit_outlined),
                                        ),
                                        if (link != null)
                                          IconButton(
                                            tooltip: '연결 해제',
                                            onPressed: isSaving
                                                ? null
                                                : () => _unlink(file),
                                            icon: const Icon(
                                              Icons.link_off_outlined,
                                            ),
                                          )
                                        else
                                          IconButton(
                                            tooltip: '후보 거절',
                                            onPressed: isSaving
                                                ? null
                                                : () => _reject(file),
                                            icon: const Icon(
                                              Icons.close_outlined,
                                            ),
                                          ),
                                      ],
                                    ],
                                  ),
                          ],
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
