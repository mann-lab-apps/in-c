import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';

import '../sheet_score.dart';
import 'score_viewer_components.dart';

/// The library adapter provides existing choices and persistence. This form
/// owns only an unsaved draft and waits for the real save result before closing.
class ScoreGlobalViewerSettings extends StatefulWidget {
  const ScoreGlobalViewerSettings({
    super.key,
    required this.initialValue,
    required this.pageScales,
    required this.pedalMappings,
    required this.inputLabels,
    required this.inputActions,
    required this.onSave,
  });

  final SheetViewerSettings initialValue;
  final Map<String, String> pageScales,
      pedalMappings,
      inputLabels,
      inputActions;
  final Future<void> Function(SheetViewerSettings) onSave;

  @override
  State<ScoreGlobalViewerSettings> createState() =>
      _ScoreGlobalViewerSettingsState();
}

class _ScoreGlobalViewerSettingsState extends State<ScoreGlobalViewerSettings> {
  late SheetViewerSettings _draft = widget.initialValue;
  bool _saving = false;
  String? _error;

  Future<void> _save() async {
    if (_saving) {
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await widget.onSave(_draft);
    } catch (_) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = '기본값을 저장하지 못했습니다. 입력을 유지했으니 다시 시도해 주세요.';
        });
      }
      return;
    }
    if (mounted) {
      Navigator.of(context).pop(true);
    }
  }

  Widget _choice(
    String title,
    String value,
    Map<String, String> options,
    SheetViewerSettings Function(String) next,
  ) => DdiroriSettingsRow(
    title: title,
    control: DdiroriChoices<String>(
      options: options,
      selected: {value},
      onChanged: _saving
          ? null
          : (values) {
              if (values.isNotEmpty) {
                setState(() => _draft = next(values.single));
              }
            },
    ),
  );

  @override
  Widget build(BuildContext context) => ScoreViewerDraftForm<bool>(
    title: '전역 보기/입력 기본값',
    description: '새로 가져오는 악보의 기본 설정입니다. 기존 악보의 개별 설정은 바꾸지 않습니다.',
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
        icon: Icons.check,
        busy: _saving,
        onPressed: _saving ? null : _save,
      ),
    ],
    children: [
      DdiroriSection(
        title: '읽기',
        children: [
          _choice('보기 모드', _draft.displayMode, const {
            'auto': '자동',
            'singlePage': '1페이지',
            'twoPage': '2페이지',
            'continuousVertical': '세로 스크롤',
          }, (value) => _draft.copyWith(displayMode: value)),
          _choice(
            '페이지 맞춤',
            _draft.pageScale,
            widget.pageScales,
            (value) => _draft.copyWith(pageScale: value),
          ),
          DdiroriSettingsRow(
            title: '반 페이지 넘김',
            control: Semantics(
              label: '반 페이지 넘김',
              child: Switch(
                value: _draft.halfPageTurn,
                onChanged: _saving
                    ? null
                    : (value) => setState(
                        () => _draft = _draft.copyWith(halfPageTurn: value),
                      ),
              ),
            ),
          ),
        ],
      ),
      DdiroriSection(
        title: '공연',
        children: [
          DdiroriSettingsRow(
            title: '공연 모드 화면 유지',
            control: Semantics(
              label: '공연 모드 화면 유지',
              child: Switch(
                value: _draft.keepAwakeInPerformance,
                onChanged: _saving
                    ? null
                    : (value) => setState(
                        () => _draft = _draft.copyWith(
                          keepAwakeInPerformance: value,
                        ),
                      ),
              ),
            ),
          ),
        ],
      ),
      DdiroriSection(
        title: '입력',
        children: [
          _choice(
            '페달 매핑',
            _draft.pedalMapping,
            widget.pedalMappings,
            (value) => _draft.copyWith(pedalMapping: value),
          ),
          if (_draft.pedalMapping == SheetViewerSettings.customPedalMappingType)
            for (final input in widget.inputLabels.entries)
              _choice(
                input.value,
                _draft.customPedalMapping[input.key] ?? 'none',
                widget.inputActions,
                (value) => _draft.copyWith(
                  customPedalMapping: {
                    ..._draft.customPedalMapping,
                    input.key: value,
                  },
                ),
              ),
        ],
      ),
    ],
  );
}
