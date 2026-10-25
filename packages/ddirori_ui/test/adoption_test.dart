import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget harness(Widget child) => MaterialApp(
  theme: ddiroriTheme(),
  home: Scaffold(body: child),
);
void main() {
  testWidgets('quiet actions remain neutral and selection is distinct', (
    t,
  ) async {
    await t.pumpWidget(
      harness(
        DdiroriButton(
          label: '필터',
          kind: DdiroriButtonKind.quiet,
          onPressed: () {},
        ),
      ),
    );
    final b = t.widget<TextButton>(find.byType(TextButton));
    expect(
      b.style!.foregroundColor!.resolve({}),
      Color(DdiroriTokens.light['text']!),
    );
    expect(
      b.style!.foregroundColor!.resolve({WidgetState.disabled}),
      Color(DdiroriTokens.light['onDisabled']!),
    );
    await t.pumpWidget(
      harness(
        DdiroriButton(
          label: '필터',
          kind: DdiroriButtonKind.quiet,
          selected: true,
          onPressed: () {},
        ),
      ),
    );
    expect(
      t
          .widget<TextButton>(find.byType(TextButton))
          .style!
          .backgroundColor!
          .resolve({}),
      Color(DdiroriTokens.light['selection']!),
    );
  });

  testWidgets(
    'numeric submit emits once per edit and resets on external change',
    (t) async {
      final values = <double>[];
      Widget number(double value, {bool enabled = true}) => harness(
        DdiroriNumber(
          label: '빠르기',
          value: value,
          min: 30,
          max: 240,
          enabled: enabled,
          onChanged: values.add,
        ),
      );
      await t.pumpWidget(number(96));
      await t.enterText(find.byType(TextField), '120');
      t.widget<TextField>(find.byType(TextField)).onSubmitted!('120');
      t.widget<TextField>(find.byType(TextField)).onSubmitted!('120');
      expect(values, [120]);
      await t.pumpWidget(number(80));
      expect(
        t.widget<TextField>(find.byType(TextField)).controller!.text,
        '80',
      );
      t.widget<TextField>(find.byType(TextField)).onSubmitted!('80');
      expect(values, [120]);
      await t.enterText(find.byType(TextField), '100');
      await t.pumpWidget(number(80, enabled: false));
      t.widget<TextField>(find.byType(TextField)).onSubmitted!('100');
      expect(values, [120]);
    },
  );
  testWidgets('input suppresses submission during active composition', (
    t,
  ) async {
    final submitted = <String>[];
    await t.pumpWidget(
      harness(
        DdiroriInput(
          value: '',
          onChanged: (_) {},
          label: '제목',
          onSubmitted: submitted.add,
        ),
      ),
    );
    final field = t.widget<TextField>(find.byType(TextField));
    field.controller!.value = const TextEditingValue(
      text: '가',
      composing: TextRange(start: 0, end: 1),
    );
    field.onSubmitted!('가');
    expect(submitted, isEmpty);
    field.controller!.value = const TextEditingValue(text: '가');
    field.onSubmitted!('가');
    expect(submitted, ['가']);
  });
}
