import 'dart:async';

import 'package:flutter/material.dart';

import 'classical_library_models.dart';
import 'library_catalog.dart';
import 'metadata_candidates.dart';
import 'metadata_overrides.dart';

class CatalogRegistrationScreen extends StatefulWidget {
  const CatalogRegistrationScreen({
    super.key,
    required this.library,
    required this.files,
    required this.candidates,
    required this.overrides,
    this.onSave,
    this.canCancel,
  });

  final ClassicalLibrary library;
  final List<LocalAudioFile> files;
  final List<MetadataCandidate> candidates;
  final List<MetadataOverride> overrides;
  final Future<String?> Function(CatalogRecordingDraft draft)? onSave;
  final bool Function()? canCancel;

  @override
  State<CatalogRegistrationScreen> createState() =>
      _CatalogRegistrationScreenState();
}

class _CatalogRegistrationScreenState extends State<CatalogRegistrationScreen> {
  final formKey = GlobalKey<FormState>();
  late final TextEditingController composerController;
  late final TextEditingController workController;
  late final TextEditingController catalogController;
  late final TextEditingController recordingController;
  late final TextEditingController performerController;
  late final TextEditingController conductorController;
  late final TextEditingController yearController;
  late List<_MovementEditor> movements;
  String selectedWorkId = '';
  String selectedRecordingId = '';
  String? submitError;
  bool isSubmitting = false;
  bool isCompleting = false;
  bool isShowingLeaveDialog = false;

  Future<void> _confirmLeaveAfterCommit() async {
    if (isShowingLeaveDialog || isSubmitting) return;
    isShowingLeaveDialog = true;
    final leave = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('이미 저장된 내용이 있습니다'),
        content: const Text(
          '작품 등록은 완료되었지만 후속 처리가 끝나지 않았습니다. '
          '이 화면을 닫아도 저장된 내용은 취소되지 않습니다. 보관함을 다시 확인해 주세요.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('계속하기'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('화면 닫기'),
          ),
        ],
      ),
    );
    isShowingLeaveDialog = false;
    if (!mounted || leave != true) return;
    setState(() => isCompleting = true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) Navigator.of(context).pop();
    });
  }

  @override
  void initState() {
    super.initState();
    final effective = [
      for (final file in widget.files) _effectiveMetadata(file),
    ];
    String? firstText(MetadataField field) {
      for (final item in effective) {
        final value = item.text(field)?.trim();
        if (value != null && value.isNotEmpty) return value;
      }
      return null;
    }

    int? firstNumber(MetadataField field) {
      for (final item in effective) {
        final value = item.number(field);
        if (value != null) return value;
      }
      return null;
    }

    composerController = TextEditingController(
      text: firstText(MetadataField.composer) ?? '',
    );
    workController = TextEditingController(
      text: firstText(MetadataField.workTitle) ?? '',
    );
    catalogController = TextEditingController(
      text: firstText(MetadataField.catalogNumber) ?? '',
    );
    recordingController = TextEditingController(
      text: firstText(MetadataField.performer) == null
          ? '로컬 녹음'
          : '${firstText(MetadataField.performer)} 녹음',
    );
    performerController = TextEditingController(
      text: firstText(MetadataField.performer) ?? '',
    );
    conductorController = TextEditingController(
      text: firstText(MetadataField.conductor) ?? '',
    );
    yearController = TextEditingController(
      text: firstNumber(MetadataField.year)?.toString() ?? '',
    );
    movements =
        [
          for (var index = 0; index < widget.files.length; index += 1)
            _MovementEditor(
              file: widget.files[index],
              titleController: TextEditingController(
                text:
                    effective[index]
                        .text(MetadataField.movementTitle)
                        ?.trim() ??
                    widget.files[index].fileName ??
                    '악장 ${index + 1}',
              ),
              inferredSequence:
                  effective[index].number(MetadataField.movementNumber) ??
                  index + 1,
            ),
        ]..sort(
          (left, right) =>
              left.inferredSequence.compareTo(right.inferredSequence),
        );
  }

  EffectiveFileMetadata _effectiveMetadata(LocalAudioFile file) {
    MetadataCandidate? candidate;
    MetadataOverride? override;
    for (final item in widget.candidates) {
      if (item.fileId == file.id) candidate = item;
    }
    for (final item in widget.overrides) {
      if (item.fileId == file.id) override = item;
    }
    return EffectiveFileMetadata.resolve(
      candidate: candidate,
      tag: file.tagMetadata,
      override: override,
    );
  }

  @override
  void dispose() {
    composerController.dispose();
    workController.dispose();
    catalogController.dispose();
    recordingController.dispose();
    performerController.dispose();
    conductorController.dispose();
    yearController.dispose();
    for (final movement in movements) {
      movement.titleController.dispose();
    }
    super.dispose();
  }

  void _selectWork(String? id) {
    final next = id ?? '';
    setState(() {
      selectedWorkId = next;
      selectedRecordingId = '';
      if (next.isEmpty) return;
      final work = widget.library.work(next);
      workController.text = work.title.ko;
      catalogController.text = work.catalogNumber ?? '';
      composerController.text = widget.library.person(work.composerId).name.ko;
    });
  }

  void _selectRecording(String? id) {
    final next = id ?? '';
    setState(() {
      selectedRecordingId = next;
      if (next.isEmpty) return;
      final recording = widget.library.recording(next);
      recordingController.text = recording.title.ko;
      _selectWork(recording.workId);
      selectedRecordingId = next;
    });
  }

  void _move(int index, int offset) {
    final destination = index + offset;
    if (destination < 0 || destination >= movements.length) return;
    setState(() {
      final movement = movements.removeAt(index);
      movements.insert(destination, movement);
    });
  }

  Future<void> _submit() async {
    if (isSubmitting) return;
    setState(() => submitError = null);
    if (!(formKey.currentState?.validate() ?? false)) return;
    final yearText = yearController.text.trim();
    final year = yearText.isEmpty ? null : int.tryParse(yearText);
    if (yearText.isNotEmpty && (year == null || year < 1000 || year > 3000)) {
      setState(() => submitError = '연도는 1000부터 3000 사이 숫자로 입력하세요.');
      return;
    }
    final draft = CatalogRecordingDraft(
      composerName: composerController.text.trim(),
      workTitle: workController.text.trim(),
      recordingTitle: recordingController.text.trim(),
      catalogNumber: catalogController.text.trim(),
      performerName: performerController.text.trim(),
      conductorName: conductorController.text.trim(),
      recordedYear: year,
      existingWorkId: selectedWorkId.isEmpty ? null : selectedWorkId,
      existingRecordingId: selectedRecordingId.isEmpty
          ? null
          : selectedRecordingId,
      movements: [
        for (var index = 0; index < movements.length; index += 1)
          CatalogMovementDraft(
            fileId: movements[index].file.id,
            title: movements[index].titleController.text.trim(),
            sequenceNumber: index + 1,
          ),
      ],
    );
    final save = widget.onSave;
    if (save == null) {
      Navigator.of(context).pop(draft);
      return;
    }
    setState(() => isSubmitting = true);
    String? error;
    try {
      error = await save(draft);
    } catch (_) {
      error = '작품과 녹음을 저장하지 못했습니다. 다시 시도해 주세요.';
    }
    if (!mounted) return;
    if (error == null) {
      setState(() {
        isSubmitting = false;
        isCompleting = true;
      });
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) Navigator.of(context).pop(draft);
      });
    } else {
      setState(() {
        submitError = error;
        isSubmitting = false;
      });
    }
  }

  String? _required(String? value) =>
      value == null || value.trim().isEmpty ? '필수 항목입니다.' : null;

  @override
  Widget build(BuildContext context) {
    final canCancel = widget.canCancel?.call() ?? true;
    final recordings = selectedWorkId.isEmpty
        ? widget.library.recordings
        : widget.library.recordingsForWork(selectedWorkId);
    return PopScope(
      canPop: !isSubmitting && (isCompleting || canCancel),
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && !canCancel && !isCompleting) {
          unawaited(_confirmLeaveAfterCommit());
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('작품과 녹음 정리'),
          leading: isSubmitting
              ? const SizedBox.shrink()
              : canCancel
              ? const BackButton()
              : IconButton(
                  tooltip: '저장된 등록 화면 닫기',
                  icon: const Icon(Icons.close),
                  onPressed: _confirmLeaveAfterCommit,
                ),
        ),
        body: AbsorbPointer(
          absorbing: isSubmitting,
          child: Form(
            key: formKey,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
              children: [
                DropdownButtonFormField<String>(
                  initialValue: selectedWorkId,
                  decoration: const InputDecoration(
                    labelText: '기존 작품',
                    border: OutlineInputBorder(),
                  ),
                  items: [
                    const DropdownMenuItem(value: '', child: Text('새 작품 만들기')),
                    for (final work in widget.library.works)
                      DropdownMenuItem(
                        value: work.id,
                        child: Text(work.title.ko),
                      ),
                  ],
                  onChanged: _selectWork,
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  key: ValueKey(
                    'recording-$selectedWorkId-$selectedRecordingId',
                  ),
                  initialValue: selectedRecordingId,
                  decoration: const InputDecoration(
                    labelText: '기존 녹음',
                    border: OutlineInputBorder(),
                  ),
                  items: [
                    const DropdownMenuItem(value: '', child: Text('새 녹음 만들기')),
                    for (final recording in recordings)
                      DropdownMenuItem(
                        value: recording.id,
                        child: Text(recording.title.ko),
                      ),
                  ],
                  onChanged: _selectRecording,
                ),
                const SizedBox(height: 16),
                _textField(
                  composerController,
                  '작곡가',
                  enabled: selectedWorkId.isEmpty,
                ),
                const SizedBox(height: 12),
                _textField(
                  workController,
                  '작품명',
                  enabled: selectedWorkId.isEmpty,
                ),
                const SizedBox(height: 12),
                _textField(
                  catalogController,
                  '작품 번호 (선택)',
                  required: false,
                  enabled: selectedWorkId.isEmpty,
                ),
                const SizedBox(height: 12),
                _textField(
                  recordingController,
                  '녹음명',
                  enabled: selectedRecordingId.isEmpty,
                ),
                const SizedBox(height: 12),
                _textField(
                  performerController,
                  '연주자 (선택)',
                  required: false,
                  enabled: selectedRecordingId.isEmpty,
                ),
                const SizedBox(height: 12),
                _textField(
                  conductorController,
                  '지휘자 (선택)',
                  required: false,
                  enabled: selectedRecordingId.isEmpty,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: yearController,
                  enabled: selectedRecordingId.isEmpty,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: '녹음 연도 (선택)',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 24),
                Text('악장 순서', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 4),
                for (var index = 0; index < movements.length; index += 1)
                  _movementEditor(index),
                if (submitError != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    submitError!,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                ],
                const SizedBox(height: 20),
                FilledButton.icon(
                  onPressed: isSubmitting ? null : _submit,
                  icon: const Icon(Icons.library_add_check_outlined),
                  label: Text(isSubmitting ? '저장하는 중' : '라이브러리에 저장'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _textField(
    TextEditingController controller,
    String label, {
    bool required = true,
    bool enabled = true,
  }) {
    return TextFormField(
      controller: controller,
      enabled: enabled,
      validator: required ? _required : null,
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
      ),
    );
  }

  Widget _movementEditor(int index) {
    final movement = movements[index];
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 32,
            child: Padding(
              padding: const EdgeInsets.only(top: 16),
              child: Text('${index + 1}'),
            ),
          ),
          Expanded(
            child: TextFormField(
              controller: movement.titleController,
              validator: _required,
              decoration: InputDecoration(
                labelText: movement.file.fileName ?? '악장 파일',
                border: const OutlineInputBorder(),
              ),
            ),
          ),
          Column(
            children: [
              IconButton(
                tooltip: '위로 이동',
                onPressed: index == 0 ? null : () => _move(index, -1),
                icon: const Icon(Icons.arrow_upward_outlined),
              ),
              IconButton(
                tooltip: '아래로 이동',
                onPressed: index == movements.length - 1
                    ? null
                    : () => _move(index, 1),
                icon: const Icon(Icons.arrow_downward_outlined),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MovementEditor {
  const _MovementEditor({
    required this.file,
    required this.titleController,
    required this.inferredSequence,
  });

  final LocalAudioFile file;
  final TextEditingController titleController;
  final int inferredSequence;
}
