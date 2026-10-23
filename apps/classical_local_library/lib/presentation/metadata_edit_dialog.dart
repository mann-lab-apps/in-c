import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';

import '../metadata_overrides.dart';

class MetadataEditResult {
  const MetadataEditResult.save(this.values) : reset = false;
  const MetadataEditResult.reset() : values = const {}, reset = true;

  final Map<MetadataField, Object> values;
  final bool reset;
}

class MetadataEditDialog extends StatefulWidget {
  const MetadataEditDialog({
    super.key,
    required this.existing,
    required this.effective,
  });

  final MetadataOverride? existing;
  final EffectiveFileMetadata effective;

  @override
  State<MetadataEditDialog> createState() => _MetadataEditDialogState();
}

class _MetadataEditDialogState extends State<MetadataEditDialog> {
  late final Map<MetadataField, String> drafts = {
    for (final field in MetadataField.values)
      field: widget.existing?.source(field) == MetadataValueSource.user
          ? '${widget.existing!.value(field)}'
          : '',
  };
  String? errorMessage;

  @override
  Widget build(BuildContext context) => AlertDialog(
    insetPadding: const EdgeInsets.all(16),
    title: const Text('내부 메타데이터 편집'),
    content: SizedBox(
      width: 520,
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final field in MetadataField.values) ...[
              DdiroriInput(
                value: drafts[field]!,
                label: field.label,
                help: _sourceDescription(field),
                keyboardType:
                    field == MetadataField.movementNumber ||
                        field == MetadataField.year
                    ? TextInputType.number
                    : TextInputType.text,
                onChanged: (value) => setState(() => drafts[field] = value),
              ),
              const SizedBox(height: 8),
            ],
            if (errorMessage != null)
              DdiroriBanner(
                message: errorMessage!,
                kind: DdiroriNoticeKind.error,
              ),
          ],
        ),
      ),
    ),
    actions: [
      if (widget.existing?.sources.values.contains(MetadataValueSource.user) ??
          false)
        DdiroriButton(
          label: '교정 초기화',
          kind: DdiroriButtonKind.quiet,
          onPressed: () =>
              Navigator.pop(context, const MetadataEditResult.reset()),
        ),
      DdiroriButton(
        label: '취소',
        kind: DdiroriButtonKind.quiet,
        onPressed: () => Navigator.pop(context),
      ),
      DdiroriButton(label: '저장', onPressed: _save),
    ],
  );

  void _save() {
    try {
      final values = <MetadataField, Object>{};
      for (final entry in drafts.entries) {
        final value = entry.value.trim();
        if (value.isEmpty) continue;
        if (entry.key == MetadataField.movementNumber ||
            entry.key == MetadataField.year) {
          final number = int.tryParse(value);
          if (number == null) {
            throw FormatException('${entry.key.label}에는 숫자를 입력해 주세요.');
          }
          values[entry.key] = number;
        } else {
          values[entry.key] = value;
        }
      }
      MetadataOverrideValidator.validate(values);
      Navigator.pop(context, MetadataEditResult.save(values));
    } on FormatException catch (error) {
      setState(() => errorMessage = error.message.toString());
    }
  }

  String _sourceDescription(MetadataField field) {
    final value = widget.effective.values[field];
    final source = widget.effective.source(field);
    if (value == null || source == null) return '현재 값 없음';
    return '현재: $value · ${source.label}';
  }
}
