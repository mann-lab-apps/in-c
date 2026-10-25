import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Widget host(Widget child) => MaterialApp(
  theme: ddiroriTheme(),
  home: Scaffold(body: SingleChildScrollView(child: child)),
);
void main() {
  testWidgets('readOnly clear is disabled; multiline and required propagate', (
    t,
  ) async {
    var changed = false;
    await t.pumpWidget(
      host(
        DdiroriInput(
          label: '작품',
          value: 'BWV 846',
          onChanged: (_) => changed = true,
          readOnly: true,
          clearable: true,
          required: true,
          maxLines: 3,
        ),
      ),
    );
    final input = t.widget<TextField>(find.byType(TextField));
    expect(input.readOnly, isTrue);
    expect(input.maxLines, 3);
    expect(input.decoration!.labelText, '작품 (필수)');
    expect(t.widget<IconButton>(find.byType(IconButton)).onPressed, isNull);
    expect(changed, isFalse);
  });
  testWidgets(
    'controlled input preserves Korean composing text on normal echo',
    (t) async {
      String value = '';
      await t.pumpWidget(
        host(
          StatefulBuilder(
            builder: (context, setState) => DdiroriInput(
              label: '메모',
              value: value,
              onChanged: (v) => setState(() => value = v),
            ),
          ),
        ),
      );
      await t.showKeyboard(find.byType(TextField));
      t.testTextInput.updateEditingValue(
        const TextEditingValue(
          text: '한',
          selection: TextSelection.collapsed(offset: 1),
          composing: TextRange(start: 0, end: 1),
        ),
      );
      await t.pump();
      final field = t.widget<TextField>(find.byType(TextField));
      expect(
        field.controller!.value.composing,
        const TextRange(start: 0, end: 1),
      );
      expect(value, '한');
    },
  );
  testWidgets('tabs arrow navigation skips disabled and updates panel', (
    t,
  ) async {
    String value = 'a';
    await t.pumpWidget(
      host(
        StatefulBuilder(
          builder: (context, setState) => DdiroriTabs(
            label: '자료',
            value: value,
            onChanged: (v) => setState(() => value = v),
            tabs: const [
              DdiroriTab(id: 'a', label: '악보', child: Text('악보 내용')),
              DdiroriTab(
                id: 'b',
                label: '준비',
                enabled: false,
                child: Text('준비 내용'),
              ),
              DdiroriTab(id: 'c', label: '녹음', child: Text('녹음 내용')),
            ],
          ),
        ),
      ),
    );
    final a = t.widget<TextButton>(find.widgetWithText(TextButton, '악보'));
    a.focusNode!.requestFocus();
    await t.pump();
    await t.sendKeyEvent(LogicalKeyboardKey.arrowRight);
    await t.pump();
    expect(value, 'c');
    expect(find.text('악보 내용'), findsNothing);
    expect(find.text('녹음 내용'), findsOneWidget);
    await t.sendKeyEvent(LogicalKeyboardKey.home);
    await t.pump();
    expect(value, 'a');
    await t.sendKeyEvent(LogicalKeyboardKey.end);
    await t.pump();
    expect(value, 'c');
  });
  testWidgets('flat item preserves separate open and selection actions', (
    t,
  ) async {
    int opens = 0;
    bool selected = false;
    await t.pumpWidget(
      host(
        DdiroriItem(
          title: '자료',
          flat: true,
          selecting: true,
          onTap: () => opens++,
          onSelected: (v) => selected = v,
        ),
      ),
    );
    await t.tap(find.byType(Checkbox));
    await t.pump();
    expect(selected, isTrue);
    expect(opens, 0);
    await t.tap(find.text('자료'));
    expect(opens, 1);
  });
  testWidgets('accordion removes collapsed content', (t) async {
    bool open = false;
    await t.pumpWidget(
      host(
        StatefulBuilder(
          builder: (context, setState) => DdiroriAccordion(
            title: '정보',
            open: open,
            onChanged: (v) => setState(() => open = v),
            child: const TextField(),
          ),
        ),
      ),
    );
    expect(find.byType(TextField), findsNothing);
    await t.tap(find.text('정보 +'));
    await t.pump();
    expect(find.byType(TextField), findsOneWidget);
  });
  testWidgets('popover restores trigger focus and keeps inherited theme', (
    t,
  ) async {
    await t.pumpWidget(
      MaterialApp(
        theme: ddiroriTheme(accent: 'violet'),
        home: Scaffold(
          body: DdiroriPopover(
            label: '설정',
            builder: (context) => Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '표시 설정',
                  style: TextStyle(color: DdiroriStyle.of(context)['action']),
                ),
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('완료'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    await t.tap(find.text('설정'));
    await t.pumpAndSettle();
    expect(find.text('표시 설정'), findsOneWidget);
    expect(
      t.widget<Text>(find.text('표시 설정')).style!.color,
      Color(DdiroriTokens.accents['violet']!['light']!['action']!),
    );
    await t.tap(find.text('완료'));
    await t.pumpAndSettle();
    expect(
      t
          .widget<TextButton>(find.widgetWithText(TextButton, '설정'))
          .focusNode!
          .hasFocus,
      isTrue,
    );
  });
  test('six accent themes preserve neutral surfaces', () {
    expect(DdiroriTokens.accents.length, 6);
    for (final accent in DdiroriTokens.accents.keys) {
      for (final brightness in Brightness.values) {
        final theme = ddiroriTheme(accent: accent, brightness: brightness);
        final c = theme.extension<DdiroriStyle>()!;
        expect(
          c['surface'],
          Color(brightness == Brightness.light ? 0xFFFFFFFF : 0xFF222222),
        );
      }
    }
  });
}
