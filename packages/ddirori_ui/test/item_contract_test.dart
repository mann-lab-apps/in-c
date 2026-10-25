import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final brightness in Brightness.values) {
    for (final density in DdiroriDensity.values) {
      testWidgets(
        'flat item independent actions at 320px/200% $brightness $density',
        (t) async {
          await t.binding.setSurfaceSize(const Size(320, 1000));
          addTearDown(() => t.binding.setSurfaceSize(null));
          var opens = 0, details = 0, shares = 0;
          var selected = false;
          await t.pumpWidget(
            MaterialApp(
              theme: ddiroriTheme(brightness: brightness, density: density),
              home: MediaQuery(
                data: const MediaQueryData(textScaler: TextScaler.linear(2)),
                child: Scaffold(
                  body: SingleChildScrollView(
                    child: DdiroriItem(
                      title: '평균율클라비어곡집제1권전주곡과푸가다장조BWV846',
                      subtitle: 'J. S. Bach · 악보 6쪽',
                      flat: true,
                      selecting: true,
                      onTap: () => opens++,
                      onSelected: (v) => selected = v,
                      trailing: DdiroriIconButton(
                        label: '정보',
                        icon: Icons.info_outline,
                        onPressed: () => details++,
                      ),
                      actions: [
                        DdiroriButton(label: '공유', onPressed: () => shares++),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          );
          expect(t.takeException(), isNull);
          await t.tap(find.byTooltip('정보'));
          expect(details, 1);
          expect(opens, 0);
          expect(selected, isFalse);
          await t.ensureVisible(find.text('공유'));
          await t.tap(find.text('공유'));
          expect(shares, 1);
          expect(opens, 0);
          await t.ensureVisible(find.byType(Checkbox));
          await t.tap(find.byType(Checkbox));
          expect(selected, isTrue);
          expect(opens, 0);
          final card = t.widget<Card>(find.byType(Card));
          expect((card.shape! as RoundedRectangleBorder).side.width, 0);
        },
      );
    }
  }
}
