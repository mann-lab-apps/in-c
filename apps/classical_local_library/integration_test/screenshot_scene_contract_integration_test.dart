import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'capture_fixture.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  Future<void> restart(WidgetTester tester) async {
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpAndSettle();
    await launchCaptureFixtureApp();
    await tester.pumpAndSettle();
  }

  Future<void> scrollTo(WidgetTester tester, String text) async {
    final target = find.text(text);
    final scrollable = find
        .byWidgetPredicate(
          (widget) =>
              widget is Scrollable &&
              axisDirectionToAxis(widget.axisDirection) == Axis.vertical,
        )
        .hitTestable()
        .first;
    for (
      var attempt = 0;
      attempt < 20 && target.evaluate().isEmpty;
      attempt += 1
    ) {
      await tester.drag(scrollable, const Offset(0, -300));
      await tester.pumpAndSettle();
    }
    expect(target, findsWidgets);
    await tester.ensureVisible(target.first);
    await tester.pumpAndSettle();
  }

  testWidgets('store screenshot scenes follow independent current UI routes', (
    tester,
  ) async {
    await restart(tester);
    expect(find.text('띠로리 플레이'), findsOneWidget);
    expect(find.text('내 음원에서 다음 음악으로'), findsOneWidget);
    expect(find.text('검색'), findsWidgets);
    expect(find.textContaining('/Users/'), findsNothing);

    await restart(tester);
    await scrollTo(tester, '현재 재생 큐');
    expect(find.text('현재 재생 큐'), findsOneWidget);
    expect(find.text('1악장 Allegro con brio'), findsWidgets);

    await restart(tester);
    await scrollTo(tester, '교향곡 5번 다단조');
    await tester.tap(find.text('교향곡 5번 다단조').first.hitTestable());
    await tester.pumpAndSettle();
    expect(find.text('작품'), findsOneWidget);
    expect(find.text('악장'), findsOneWidget);
    expect(find.text('1악장 Allegro con brio'), findsOneWidget);

    await restart(tester);
    await scrollTo(tester, '교향곡 5번 다단조');
    await tester.tap(find.text('교향곡 5번 다단조').first.hitTestable());
    await tester.pumpAndSettle();
    await scrollTo(tester, '클라이버 / 빈 필하모닉 연주 녹음');
    await tester.tap(find.text('클라이버 / 빈 필하모닉 연주 녹음').first.hitTestable());
    await tester.pumpAndSettle();
    expect(find.text('녹음'), findsOneWidget);
    expect(find.text('녹음 전체 재생'), findsOneWidget);
    expect(find.text('4/4 재생 가능'), findsOneWidget);
    expect(find.textContaining('/Users/'), findsNothing);

    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpAndSettle();
  });
}
