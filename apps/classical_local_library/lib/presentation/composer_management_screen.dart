import 'package:flutter/material.dart';
import 'package:ddirori_ui/ddirori_ui.dart';

import '../classical_library_models.dart';
import '../composer_library.dart';
import '../composer_management.dart';

class ComposerManagementScreen extends StatefulWidget {
  const ComposerManagementScreen({
    super.key,
    required this.repository,
    required this.library,
    required this.files,
    required this.onChanged,
    this.file,
    this.onImslp,
    this.canonicalWorkId,
  });
  final ComposerRepository repository;
  final ClassicalLibrary library;
  final List<LocalAudioFile> files;
  final LocalAudioFile? file;
  final ValueChanged<ClassicalLibrary> onChanged;
  final void Function(ClassicalPerson person, Work? work)? onImslp;
  final String Function(String)? canonicalWorkId;
  @override
  State<ComposerManagementScreen> createState() =>
      _ComposerManagementScreenState();
}

class _ComposerManagementScreenState extends State<ComposerManagementScreen> {
  late ClassicalLibrary library = widget.library;
  bool busy = false;
  String? error;
  String query = '';
  void changed(ClassicalLibrary next) {
    widget.onChanged(next);
    if (mounted) setState(() => library = next);
  }

  Future<void> edit([ClassicalPerson? person]) async {
    await showDialog<void>(
      context: context,
      builder: (_) => ComposerEditor(
        person: person,
        onSave: (name, original, aliases, source, period) async {
          final next = await widget.repository.saveComposer(
            files: widget.files,
            personId: person?.id,
            name: name,
            original: original,
            aliases: aliases,
            source: source,
            period: period,
          );
          changed(next);
        },
      ),
    );
  }

  Future<void> connect(ClassicalPerson? person) async {
    if (busy) return;
    final file = widget.file!;
    final accepted = await showDdiroriConfirmDialog(
      context: context,
      title: person == null ? '작곡가 연결 해제' : '작곡가 연결 확인',
      message: person == null
          ? '확인한 작곡가 ID 연결을 해제할까요? 원본 태그와 음원은 유지합니다.'
          : '${file.fileName ?? '선택한 음원'}을(를) ${person.name.ko}의 음악으로 연결할까요? 동명이인과 원본 정보를 확인해 주세요.',
      confirmLabel: person == null ? '연결 해제' : '확인 후 연결',
    );
    if (!accepted || !mounted) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      changed(
        await widget.repository.connectFile(
          files: widget.files,
          fileId: file.id,
          personId: person?.id,
        ),
      );
      if (mounted) {
        showDdiroriToast(
          context,
          message: person == null ? '작곡가 ID 연결을 해제했습니다.' : '작곡가를 연결했습니다.',
        );
      }
    } catch (_) {
      if (mounted) setState(() => error = '연결을 저장하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> editWork(Work work) async {
    await showDialog<void>(
      context: context,
      builder: (_) => WorkPeriodEditor(
        work: work,
        onSave: (period) async => changed(
          await widget.repository.saveWorkPeriod(
            files: widget.files,
            workId: work.id,
            period: period,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final names = ComposerNames(library);
    final people =
        names.people.values
            .where(
              (p) => p.name.searchNames.any(
                (n) =>
                    ComposerNames.normalize(n)
                        .contains(ComposerNames.normalize(query)),
              ),
            )
            .toList()
          ..sort((a, b) {
            final order = a.name.sortName.compareTo(b.name.sortName);
            return order == 0 ? a.id.compareTo(b.id) : order;
          });
    return PopScope(
      canPop: !busy,
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.file == null ? '작곡가 관리' : '음원의 작곡가 연결'),
        ),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              const Text(
                '작품 등록 없이 작곡가를 관리합니다. 이름과 확인한 별칭만 사용하며 동명이인은 자동 병합하지 않습니다.',
              ),
              if (widget.file != null) Text(widget.file!.fileName ?? '선택한 음원'),
              if (error != null)
                DdiroriBanner(message: error!, kind: DdiroriNoticeKind.error),
              DdiroriInput(
                value: query,
                label: '작곡가 찾기',
                search: true,
                readOnly: busy,
                onChanged: (v) => setState(() => query = v),
              ),
              DdiroriButton(
                label: '작곡가 등록',
                icon: Icons.person_add_outlined,
                onPressed: busy ? null : () => edit(),
              ),
              if (widget.file != null)
                DdiroriButton(
                  label: '작곡가 ID 연결 해제',
                  kind: DdiroriButtonKind.quiet,
                  onPressed: busy ? null : () => connect(null),
                ),
              if (people.isEmpty)
                const DdiroriStatePanel(
                  title: '등록된 작곡가가 없습니다',
                  message: '확인한 작곡가를 등록하거나 다른 이름으로 찾아보세요.',
                ),
              for (final p in library.people.where(
                (p) =>
                    !names.people.containsKey(p.id) &&
                    p.name.searchNames.any(
                      (n) =>
                          ComposerNames.normalize(n)
                              .contains(ComposerNames.normalize(query)),
                    ),
              ))
                DdiroriItem(
                  flat: true,
                  title: p.name.ko,
                  subtitle: '다른 역할의 기존 인물 · 확인 후 작곡가 역할도 추가',
                  onTap: busy ? null : () => edit(p),
                ),
              for (final p in people)
                DdiroriItem(
                  flat: true,
                  title: p.name.ko,
                  subtitle: [
                    ...p.name.searchNames.where((n) => n != p.name.ko),
                    p.composerProfile?.source ?? '기존 작품의 작곡가 관계',
                    if (p.composerProfile?.period case final period?)
                      '활동 시대 · ${period.eras.map((e) => e.label).join(' · ')}${period.certainty == PeriodCertainty.estimated ? ' (추정)' : ''}\n출처: ${period.source}',
                    if (p.composerProfile?.confirmedFileIds.contains(
                          widget.file?.id,
                        ) ??
                        false)
                      '이 음원에 확인 연결됨',
                  ].join('\n'),
                  onTap: busy
                      ? null
                      : () => widget.file == null ? edit(p) : connect(p),
                  actions: [
                    DdiroriIconButton(
                      label: '${p.name.ko} 정보 편집',
                      icon: Icons.edit_outlined,
                      onPressed: busy ? null : () => edit(p),
                    ),
                    if (widget.onImslp != null)
                      DdiroriIconButton(
                        label: '${p.name.ko} IMSLP 검색',
                        icon: Icons.open_in_new,
                        onPressed: busy ? null : () => widget.onImslp!(p, null),
                      ),
                  ],
                ),
              if (widget.file == null && library.works.isNotEmpty) ...[
                Text('작품 시대', style: Theme.of(context).textTheme.titleMedium),
                const Text(
                  '활동 시대와 별개입니다. 기존 자유 입력값은 유지하며 확인 출처와 추정 여부를 함께 저장합니다.',
                ),
                for (final w
                    in library.works
                        .where(
                          (w) =>
                              (widget.canonicalWorkId?.call(w.id) ?? w.id) ==
                              w.id,
                        )
                        .where(
                          (w) =>
                              query.isEmpty ||
                              people.any((p) => p.id == w.composerId),
                        ))
                  DdiroriItem(
                    flat: true,
                    title: w.title.ko,
                    subtitle:
                        '${w.periodLabel ?? '기존 시대 정보 없음'}\n${w.periodAssessment == null ? '시대 미분류' : w.periodAssessment!.eras.map((e) => e.label).join(' · ')}${w.periodAssessment?.certainty == PeriodCertainty.estimated ? ' (추정)' : ''}\n${w.periodAssessment?.source ?? '시대 확인 정보 없음'}',
                    onTap: busy ? null : () => editWork(w),
                    actions: [
                      if (widget.onImslp != null)
                        DdiroriIconButton(
                          label: '${w.title.ko} IMSLP 검색',
                          icon: Icons.open_in_new,
                          onPressed: busy
                              ? null
                              : () => widget.onImslp!(
                                  library.person(w.composerId),
                                  w,
                                ),
                        ),
                    ],
                  ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _PeriodDraft {
  _PeriodDraft(PeriodAssessment? p)
    : eras = {...?p?.eras},
      source = p?.source ?? '',
      estimated = p?.certainty == PeriodCertainty.estimated;
  final Set<MusicEra> eras;
  String source;
  bool estimated;
  PeriodAssessment? value() => source.trim().isEmpty && eras.isEmpty
      ? null
      : PeriodAssessment(
          eras: eras.toList(),
          source: source.trim(),
          certainty: estimated
              ? PeriodCertainty.estimated
              : PeriodCertainty.confirmed,
        );
}

class _PeriodInputs extends StatelessWidget {
  const _PeriodInputs(this.draft, {required this.changed, required this.busy});
  final _PeriodDraft draft;
  final VoidCallback changed;
  final bool busy;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      const Text('시대 (여러 개 선택 가능, 선택하지 않으면 미분류)'),
      for (final era in MusicEra.values)
        DdiroriItem(
          flat: true,
          title: era.label,
          selecting: true,
          selected: draft.eras.contains(era),
          enabled: !busy,
          onSelected: busy
              ? null
              : (v) {
                  v ? draft.eras.add(era) : draft.eras.remove(era);
                  changed();
                },
        ),
      DdiroriItem(
        flat: true,
        title: '추정 정보',
        selecting: true,
        selected: draft.estimated,
        enabled: !busy,
        onSelected: busy
            ? null
            : (v) {
                draft.estimated = v;
                changed();
              },
      ),
      DdiroriInput(
        value: draft.source,
        label: '시대 확인 출처',
        readOnly: busy,
        onChanged: (v) {
          draft.source = v;
          changed();
        },
      ),
    ],
  );
}

class ComposerEditor extends StatefulWidget {
  const ComposerEditor({super.key, this.person, required this.onSave});
  final ClassicalPerson? person;
  final Future<void> Function(
    String,
    String,
    List<String>,
    String,
    PeriodAssessment?,
  )
  onSave;
  @override
  State<ComposerEditor> createState() => _ComposerEditorState();
}

class _ComposerEditorState extends State<ComposerEditor> {
  late String name = widget.person?.name.ko ?? '',
      original = widget.person?.name.original ?? '',
      aliases = widget.person?.name.aliases.join('\n') ?? '',
      source = widget.person?.composerProfile?.source ?? '';
  late final period = _PeriodDraft(widget.person?.composerProfile?.period);
  bool busy = false;
  String? error;
  Future<void> save() async {
    if (busy) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await widget.onSave(
        name,
        original,
        aliases.split('\n'),
        source,
        period.value(),
      );
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        setState(
          () => error = e is FormatException
              ? e.message
              : '저장하지 못했습니다. 입력은 유지됩니다. 다시 시도해 주세요.',
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !busy,
    child: AlertDialog(
      insetPadding: const EdgeInsets.all(16),
      title: const Text('작곡가 정보'),
      content: SizedBox(
        width: 520,
        child: SingleChildScrollView(
          padding: const EdgeInsets.only(top: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (error != null)
                DdiroriBanner(message: error!, kind: DdiroriNoticeKind.error),
              DdiroriInput(
                value: name,
                label: '표시 이름 (한글)',
                readOnly: busy,
                onChanged: (v) => setState(() => name = v),
              ),
              DdiroriInput(
                value: original,
                label: '원어 이름',
                readOnly: busy,
                onChanged: (v) => setState(() => original = v),
              ),
              DdiroriInput(
                value: aliases,
                label: '확인한 별칭 (줄바꿈으로 구분)',
                maxLines: 3,
                readOnly: busy,
                onChanged: (v) => setState(() => aliases = v),
              ),
              DdiroriInput(
                value: source,
                label: '이름·별칭 확인 출처',
                readOnly: busy,
                onChanged: (v) => setState(() => source = v),
              ),
              const Text('작곡가 활동 시대입니다. 개별 작품의 시대를 확정하지 않습니다.'),
              _PeriodInputs(period, changed: () => setState(() {}), busy: busy),
            ],
          ),
        ),
      ),
      actions: [
        DdiroriButton(
          label: '취소',
          kind: DdiroriButtonKind.quiet,
          onPressed: busy ? null : () => Navigator.pop(context),
        ),
        DdiroriButton(label: '저장', busy: busy, onPressed: save),
      ],
    ),
  );
}

class WorkPeriodEditor extends StatefulWidget {
  const WorkPeriodEditor({super.key, required this.work, required this.onSave});
  final Work work;
  final Future<void> Function(PeriodAssessment?) onSave;
  @override
  State<WorkPeriodEditor> createState() => _WorkPeriodEditorState();
}

class _WorkPeriodEditorState extends State<WorkPeriodEditor> {
  late final draft = _PeriodDraft(widget.work.periodAssessment);
  bool busy = false;
  String? error;
  Future<void> save() async {
    if (busy) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await widget.onSave(draft.value());
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        setState(
          () => error = e is FormatException
              ? e.message
              : '저장하지 못했습니다. 입력은 유지됩니다.',
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !busy,
    child: AlertDialog(
      insetPadding: const EdgeInsets.all(16),
      title: Text('${widget.work.title.ko} · 시대'),
      content: SizedBox(
        width: 520,
        child: SingleChildScrollView(
          padding: const EdgeInsets.only(top: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('기존 입력: ${widget.work.periodLabel ?? '없음'} (보존됨)'),
              if (error != null)
                DdiroriBanner(message: error!, kind: DdiroriNoticeKind.error),
              _PeriodInputs(draft, changed: () => setState(() {}), busy: busy),
            ],
          ),
        ),
      ),
      actions: [
        DdiroriButton(
          label: '취소',
          kind: DdiroriButtonKind.quiet,
          onPressed: busy ? null : () => Navigator.pop(context),
        ),
        DdiroriButton(label: '저장', busy: busy, onPressed: save),
      ],
    ),
  );
}
