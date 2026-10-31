import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';

import '../sheet_score.dart';
import '../sheet_setlist.dart';
import 'score_viewer_components.dart';

class ScoreSetlistPicker extends StatefulWidget {
  const ScoreSetlistPicker({
    super.key,
    required this.scores,
    required this.descriptionFor,
    required this.onAdd,
  });
  final List<SheetScore> scores;
  final String Function(SheetScore) descriptionFor;
  final Future<void> Function(SheetScore) onAdd;
  @override
  State<ScoreSetlistPicker> createState() => _ScoreSetlistPickerState();
}

class _ScoreSetlistPickerState extends State<ScoreSetlistPicker> {
  String _query = '';
  SheetScore? _selected;
  bool _saving = false;
  String? _error;

  Future<void> _add() async {
    final selected = _selected;
    if (_saving || selected == null) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await widget.onAdd(selected);
    } catch (_) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = '악보를 추가하지 못했습니다. 선택을 유지했으니 다시 시도해 주세요.';
        });
      }
      return;
    }
    if (mounted) Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final filtered = widget.scores.where((s) => s.matches(_query)).toList();
    return ScoreViewerDraftForm<bool>(
      title: '세트리스트에 악보 추가',
      description: '악보를 고른 뒤 추가하세요. 악보 원본은 바뀌지 않습니다.',
      saving: _saving,
      error: _error,
      actions: [
        DdiroriButton(
          label: '취소',
          kind: DdiroriButtonKind.quiet,
          onPressed: _saving ? null : () => Navigator.of(context).pop(false),
        ),
        DdiroriButton(
          label: _error == null ? '추가' : '다시 시도',
          busy: _saving,
          onPressed: _saving || _selected == null ? null : _add,
        ),
      ],
      children: [
        DdiroriInput(
          label: '추가할 악보 검색',
          value: _query,
          search: true,
          readOnly: _saving,
          onChanged: (value) => setState(() => _query = value),
        ),
        if (_selected != null)
          DdiroriBanner(message: '선택: ${_selected!.title}'),
        if (filtered.isEmpty)
          const DdiroriBanner(message: '검색 결과가 없습니다.')
        else
          SizedBox(
            height: MediaQuery.sizeOf(context).height * .4,
            child: ListView.builder(
              key: const ValueKey('score-setlist-picker-list'),
              primary: false,
              itemCount: filtered.length,
              itemBuilder: (_, index) {
                final score = filtered[index];
                return DdiroriItem(
                  title: score.title,
                  subtitle: widget.descriptionFor(score),
                  leading: const Icon(Icons.description_outlined),
                  flat: true,
                  selected: _selected?.id == score.id,
                  onTap: _saving
                      ? null
                      : () => setState(() {
                          _selected = score;
                          _error = null;
                        }),
                );
              },
            ),
          ),
      ],
    );
  }
}

class ScoreSetlistRehearsal extends StatefulWidget {
  const ScoreSetlistRehearsal({
    super.key,
    required this.setlist,
    required this.scores,
    required this.pageScales,
    required this.pedalMappings,
    required this.onSave,
  });
  final SheetSetlist setlist;
  final List<SheetScore> scores;
  final Map<String, String> pageScales, pedalMappings;
  final Future<void> Function(SheetSetlist) onSave;
  @override
  State<ScoreSetlistRehearsal> createState() => _ScoreSetlistRehearsalState();
}

class _ScoreSetlistRehearsalState extends State<ScoreSetlistRehearsal> {
  late bool _rehearsal = widget.setlist.rehearsalMode;
  late int _transition = widget.setlist.transitionSeconds;
  late bool _useOverride = widget.setlist.viewerSettingsOverride != null;
  late SheetViewerSettings _override =
      widget.setlist.viewerSettingsOverride ??
      SheetViewerSettings.defaultSettings;
  late final _pages = {
    for (final s in widget.scores)
      s.id: '${widget.setlist.scoreStartPages[s.id] ?? s.lastPage}',
  };
  late final _notes = {
    for (final s in widget.scores) s.id: widget.setlist.scoreNotes[s.id] ?? '',
  };
  late final _durations = {
    for (final s in widget.scores)
      s.id: '${widget.setlist.scoreDurations[s.id] ?? 0}',
  };
  late final _expanded = {if (widget.scores.isNotEmpty) widget.scores.first.id};
  bool _saving = false;
  String? _error;

  SheetSetlist _draft() {
    final pages = <String, int>{}, durations = <String, int>{};
    final notes = <String, String>{};
    for (final score in widget.scores) {
      final page = int.tryParse(_pages[score.id] ?? '');
      if (page != null && page > 0) pages[score.id] = page;
      final duration = int.tryParse(_durations[score.id] ?? '');
      if (duration != null && duration > 0) {
        durations[score.id] = duration.clamp(1, 24 * 60 * 60).toInt();
      }
      final note = _notes[score.id]?.trim() ?? '';
      if (note.isNotEmpty) notes[score.id] = note;
    }
    return widget.setlist.copyWith(
      rehearsalMode: _rehearsal,
      transitionSeconds: _transition,
      scoreStartPages: pages,
      scoreNotes: notes,
      scoreDurations: durations,
      viewerSettingsOverride: _useOverride ? _override : null,
      clearViewerSettingsOverride: !_useOverride,
    );
  }

  Future<void> _save() async {
    if (_saving) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await widget.onSave(_draft());
    } catch (_) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = '리허설 설정을 저장하지 못했습니다. 입력을 유지했으니 다시 시도해 주세요.';
        });
      }
      return;
    }
    if (mounted) Navigator.of(context).pop(true);
  }

  Widget _toggle(String title, bool value, ValueChanged<bool> change) =>
      DdiroriSettingsRow(
        title: title,
        control: Semantics(
          label: title,
          child: Switch(
            value: value,
            onChanged: _saving ? null : (v) => setState(() => change(v)),
          ),
        ),
      );

  Widget _choice(
    String title,
    String value,
    Map<String, String> options,
    SheetViewerSettings Function(String) change,
  ) => DdiroriSettingsRow(
    title: title,
    control: DdiroriChoices<String>(
      options: options,
      selected: {value},
      onChanged: _saving
          ? null
          : (values) {
              if (values.isNotEmpty) {
                setState(() => _override = change(values.single));
              }
            },
    ),
  );

  @override
  Widget build(BuildContext context) => ScoreViewerDraftForm<bool>(
    title: '세트리스트 리허설',
    description: '곡별 시작쪽·길이·메모와 공연 보기 설정을 저장합니다. 악보 원본은 바뀌지 않습니다.',
    saving: _saving,
    error: _error,
    actions: [
      DdiroriButton(
        label: '취소',
        kind: DdiroriButtonKind.quiet,
        onPressed: _saving ? null : () => Navigator.of(context).pop(false),
      ),
      DdiroriButton(
        label: _error == null ? '저장' : '다시 시도',
        busy: _saving,
        onPressed: _saving ? null : _save,
      ),
    ],
    children: [
      DdiroriSection(
        title: '리허설 진행',
        children: [
          _toggle('리허설 모드', _rehearsal, (v) => _rehearsal = v),
          DdiroriSettingsRow(
            title: '전환 $_transition초',
            control: Slider(
              value: _transition.clamp(0, 120).toDouble(),
              min: 0,
              max: 120,
              divisions: 12,
              label: '전환 $_transition초',
              onChanged: _saving
                  ? null
                  : (v) => setState(() => _transition = v.round()),
            ),
          ),
        ],
      ),
      DdiroriSection(
        title: '공연 보기',
        children: [
          const DdiroriBanner(message: '세트리스트로 열 때 곡별 보기 설정보다 우선 적용합니다.'),
          _toggle('공연 보기 preset', _useOverride, (v) => _useOverride = v),
          if (_useOverride) ...[
            _choice('보기 모드', _override.displayMode, const {
              'auto': '자동',
              'singlePage': '1페이지',
              'twoPage': '2페이지',
              'continuousVertical': '세로 스크롤',
            }, (v) => _override.copyWith(displayMode: v)),
            _choice(
              '페이지 맞춤',
              _override.pageScale,
              widget.pageScales,
              (v) => _override.copyWith(pageScale: v),
            ),
            _toggle(
              '반 페이지 넘김',
              _override.halfPageTurn,
              (v) => _override = _override.copyWith(halfPageTurn: v),
            ),
            _toggle(
              '곡 전환 전 확인',
              _override.confirmSetlistTransition,
              (v) =>
                  _override = _override.copyWith(confirmSetlistTransition: v),
            ),
            _toggle(
              '곡 끝에서 자동 이동',
              _override.autoAdvanceSetlist,
              (v) => _override = _override.copyWith(autoAdvanceSetlist: v),
            ),
            _choice(
              '페달 매핑',
              _override.pedalMapping,
              widget.pedalMappings,
              (v) => _override.copyWith(pedalMapping: v),
            ),
          ],
        ],
      ),
      for (final score in widget.scores)
        DdiroriAccordion(
          title: score.title,
          open: _expanded.contains(score.id),
          onChanged: _saving
              ? (_) {}
              : (open) => setState(() {
                  if (open) {
                    _expanded.add(score.id);
                  } else {
                    _expanded.remove(score.id);
                  }
                }),
          child: DdiroriStack(
            children: [
              DdiroriInput(
                label: '시작쪽',
                value: _pages[score.id]!,
                keyboardType: TextInputType.number,
                readOnly: _saving,
                onChanged: (v) => setState(() => _pages[score.id] = v),
              ),
              DdiroriInput(
                label: '초',
                value: _durations[score.id]!,
                keyboardType: TextInputType.number,
                readOnly: _saving,
                onChanged: (v) => setState(() => _durations[score.id] = v),
              ),
              DdiroriInput(
                label: '메모',
                value: _notes[score.id]!,
                maxLines: 3,
                readOnly: _saving,
                onChanged: (v) => setState(() => _notes[score.id] = v),
              ),
            ],
          ),
        ),
    ],
  );
}
