import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/sheet_tuner.dart';

void main() {
  testWidgets(
    'tuner sheet is chromatic-only and keeps instrument presets out',
    (tester) async {
      await tester.pumpWidget(buildTunerSheetForTest());
      await tester.pump();

      expect(find.text('튜너'), findsOneWidget);
      expect(find.text('A4 440 Hz'), findsOneWidget);
      expect(find.text('세부 설정'), findsOneWidget);
      expect(find.text('튜닝 프리셋'), findsNothing);
      expect(find.text('기타 줄 맞춤'), findsNothing);
      expect(find.text('6E'), findsNothing);

      await tester.tap(find.text('세부 설정'));
      await tester.pumpAndSettle();

      expect(find.text('감지 엔진'), findsOneWidget);
      expect(find.text('자동'), findsOneWidget);
      expect(find.text('튜닝 프리셋'), findsNothing);
      expect(find.text('악기/표시 기준'), findsNothing);
      expect(find.text('타겟 잠금'), findsNothing);
    },
  );

  testWidgets('legacy guitar settings open as chromatic-only UI', (
    tester,
  ) async {
    await tester.pumpWidget(
      buildTunerSheetForTest(
        settings: const SheetTunerSettings(
          referencePitchA4: 442,
          tuningMode: SheetTunerMode.target,
          tuningPreset: SheetTunerPreset.guitarStandard,
          displayMode: SheetTunerDisplayMode.guitar,
          detectionProfile: SheetTunerDetectionProfile.guitarBass,
          targetConcertMidiNumber: 64,
          targetLockEnabled: true,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('A4 442 Hz'), findsOneWidget);
    expect(find.text('기타 줄 맞춤'), findsNothing);
    expect(find.text('6E'), findsNothing);
    expect(find.text('타겟 잠금'), findsNothing);

    await tester.tap(find.text('세부 설정'));
    await tester.pumpAndSettle();

    expect(find.text('감지 엔진'), findsOneWidget);
    expect(find.text('튜닝 프리셋'), findsNothing);
    expect(find.text('악기/표시 기준'), findsNothing);
  });
}
