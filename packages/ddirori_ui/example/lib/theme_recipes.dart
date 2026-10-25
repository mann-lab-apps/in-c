// Service-owned compositions; not part of ddirori_ui's public API.
import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';

class ExcerptRowExample extends StatelessWidget {
  const ExcerptRowExample({
    super.key,
    required this.title,
    required this.detail,
    required this.saved,
    required this.onOpen,
    required this.onSave,
    this.enabled = true,
  });
  final String title, detail;
  final bool saved, enabled;
  final VoidCallback onOpen, onSave;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      border: Border(
        bottom: BorderSide(
          color: DdiroriStyle.of(context)['border'],
          width: DdiroriTokens.control['borderWidth']!,
        ),
      ),
    ),
    child: DdiroriItem(
      flat: true,
      title: title,
      subtitle: detail,
      enabled: enabled,
      leading: Icon(
        Icons.description_outlined,
        size: DdiroriTokens.icon['large'],
      ),
      onTap: onOpen,
      trailing: DdiroriIconButton(
        label: '$title 저장',
        icon: Icons.bookmark_border,
        selected: saved,
        onPressed: enabled ? onSave : null,
      ),
    ),
  );
}

class PropertyGroupExample extends StatelessWidget {
  const PropertyGroupExample({
    super.key,
    required this.title,
    required this.value,
    required this.mode,
    required this.onValue,
    required this.onMode,
    required this.onApply,
    this.error,
  });
  final String title, value;
  final String? error;
  final Set<String> mode;
  final ValueChanged<String> onValue;
  final ValueChanged<Set<String>> onMode;
  final VoidCallback onApply;

  @override
  Widget build(BuildContext context) {
    final colors = DdiroriStyle.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colors['surface'],
        border: Border.all(
          color: colors['border'],
          width: DdiroriTokens.control['borderWidth']!,
        ),
        borderRadius: BorderRadius.circular(DdiroriTokens.radius['card']!),
      ),
      child: Padding(
        padding: EdgeInsets.all(DdiroriTokens.layout['rowPadding']!),
        child: DdiroriStack(
          gap: DdiroriTokens.spacing['lg']!,
          children: [
            Semantics(
              header: true,
              child: Text(title, style: Theme.of(context).textTheme.titleSmall),
            ),
            Text(
              '문서의 이름과 표시 방식을 설정해요.',
              style: Theme.of(context).textTheme.bodySmall
                  ?.copyWith(color: colors['muted']),
            ),
            DdiroriInput(
              label: '이름',
              value: value,
              onChanged: onValue,
              error: error,
            ),
            DdiroriStack(
              gap: DdiroriTokens.layout['labelGap']!,
              children: [
                Text('표시', style: Theme.of(context).textTheme.labelLarge),
                Semantics(
                  label: '표시할 항목',
                  container: true,
                  child: DdiroriChoices<String>(
                    options: const {'part': '파트 이름', 'bar': '마디 번호'},
                    multiple: true,
                    selected: mode,
                    onChanged: onMode,
                  ),
                ),
              ],
            ),
            Align(
              alignment: AlignmentDirectional.centerEnd,
              child: DdiroriButton(label: '적용', onPressed: onApply),
            ),
          ],
        ),
      ),
    );
  }
}
