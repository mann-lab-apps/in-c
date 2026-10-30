import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';

typedef ScoreLibraryChoice<T> = ({T value, String label, IconData icon});

/// Filter values remain app-owned. This adapter only displays choices and emits
/// intents; it neither navigates nor normalizes or persists their identifiers.
class ScoreLibraryChoices<T> extends StatelessWidget {
  const ScoreLibraryChoices({
    super.key,
    required this.options,
    required this.selectedValue,
    required this.description,
    required this.onSelected,
    required this.onCancel,
  });

  final List<ScoreLibraryChoice<T>> options;
  final T selectedValue;
  final String description;
  final ValueChanged<T> onSelected;
  final VoidCallback onCancel;

  Widget _option(int index) {
    final option = options[index];
    final selected = option.value == selectedValue;
    return DdiroriItem(
      title: option.label,
      subtitle: selected ? '현재 선택' : null,
      leading: Icon(option.icon),
      flat: true,
      selected: selected,
      onTap: () => onSelected(option.value),
    );
  }

  @override
  Widget build(BuildContext context) => DdiroriStack(
    children: [
      DdiroriBanner(message: description),
      if (options.length <= 20)
        DdiroriStack(
          children: [for (var i = 0; i < options.length; i++) _option(i)],
        )
      else
        SizedBox(
          height: MediaQuery.sizeOf(context).height * .45,
          child: ListView.separated(
            key: const ValueKey('score-library-choices-list'),
            primary: false,
            itemCount: options.length,
            itemBuilder: (_, index) => _option(index),
            separatorBuilder: (_, _) =>
                SizedBox(height: DdiroriStyle.of(context).gap),
          ),
        ),
      DdiroriButton(
        label: '취소',
        kind: DdiroriButtonKind.quiet,
        onPressed: onCancel,
      ),
    ],
  );
}
