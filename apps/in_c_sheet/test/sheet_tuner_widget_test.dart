import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';

void main() {
  testWidgets('tuner sheet is chromatic-first and keeps presets collapsed', (
    tester,
  ) async {
    await tester.pumpWidget(buildTunerSheetForTest());
    await tester.pump();

    expect(find.text('튜너'), findsOneWidget);
    expect(find.text('크로매틱'), findsOneWidget);
    expect(find.text('기타 줄 맞춤'), findsOneWidget);
    expect(find.text('A4 440 Hz'), findsOneWidget);
    expect(find.text('세부 설정'), findsOneWidget);
    expect(find.text('튜닝 프리셋'), findsNothing);

    await tester.tap(find.text('세부 설정'));
    await tester.pumpAndSettle();

    expect(find.text('튜닝 프리셋'), findsOneWidget);
    expect(find.text('악기/표시 기준'), findsOneWidget);
    expect(find.text('감지 프로필'), findsOneWidget);
  });

  testWidgets('guitar quick mode exposes string targets up front', (
    tester,
  ) async {
    await tester.pumpWidget(buildTunerSheetForTest());
    await tester.pump();

    await tester.tap(find.text('기타 줄 맞춤'));
    await tester.pumpAndSettle();

    expect(find.text('기타 줄 맞춤'), findsWidgets);
    expect(find.text('6E'), findsOneWidget);
    expect(find.text('5A'), findsOneWidget);
    expect(find.text('4D'), findsOneWidget);
    expect(find.text('3G'), findsOneWidget);
    expect(find.text('2B'), findsOneWidget);
    expect(find.text('1E'), findsOneWidget);
    expect(find.textContaining('1번줄 · E4'), findsOneWidget);

    await tester.tap(find.text('크로매틱'));
    await tester.pumpAndSettle();

    expect(find.text('6E'), findsNothing);
    expect(find.textContaining('1번줄 · E4'), findsNothing);
  });
}
