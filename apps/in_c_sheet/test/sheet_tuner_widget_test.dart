import 'package:flutter/widgets.dart';
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
      expect(_pitchHistoryChartFinder(), findsOneWidget);
      expect(find.text('세부 설정'), findsOneWidget);
      expect(find.text('튜닝 프리셋'), findsNothing);
      expect(find.text('기타 줄 맞춤'), findsNothing);
      expect(find.text('6E'), findsNothing);

      await tester.ensureVisible(find.text('세부 설정'));
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

    await tester.ensureVisible(find.text('세부 설정'));
    await tester.tap(find.text('세부 설정'));
    await tester.pumpAndSettle();

    expect(find.text('감지 엔진'), findsOneWidget);
    expect(find.text('튜닝 프리셋'), findsNothing);
    expect(find.text('악기/표시 기준'), findsNothing);
  });

  testWidgets('pitch history chart paints empty and sampled states', (
    tester,
  ) async {
    final start = DateTime.fromMillisecondsSinceEpoch(1000);
    final a4 = SheetTunerPitch.detect(frequency: 440, signalLevel: 0.92)!;
    final sharpA4 = SheetTunerPitch.detect(frequency: 444, signalLevel: 0.86)!;
    final aSharp4 = SheetTunerPitch.detect(
      frequency: 466.16,
      signalLevel: 0.9,
    )!;

    await tester.pumpWidget(buildTunerPitchHistoryChartForTest());
    expect(_pitchHistoryChartFinder(), findsOneWidget);

    await tester.pumpWidget(
      buildTunerPitchHistoryChartForTest(
        currentNoteLabel: 'A4',
        samples: <SheetTunerPitchHistorySample>[
          SheetTunerPitchHistorySample.fromReading(
            timestamp: start,
            reading: a4,
            feedback: SheetTunerFeedback.fromState(
              inputStatus: SheetTunerInputStatus.listening,
              reading: a4,
              centsOffset: a4.centsOffset,
            ),
          ),
          SheetTunerPitchHistorySample.fromReading(
            timestamp: start.add(const Duration(milliseconds: 180)),
            reading: sharpA4,
            feedback: SheetTunerFeedback.fromState(
              inputStatus: SheetTunerInputStatus.listening,
              reading: sharpA4,
              centsOffset: sharpA4.centsOffset,
            ),
          ),
          SheetTunerPitchHistorySample.gap(
            timestamp: start.add(const Duration(milliseconds: 360)),
          ),
          SheetTunerPitchHistorySample.fromReading(
            timestamp: start.add(const Duration(milliseconds: 540)),
            reading: aSharp4,
            feedback: SheetTunerFeedback.fromState(
              inputStatus: SheetTunerInputStatus.listening,
              reading: aSharp4,
              centsOffset: aSharp4.centsOffset,
            ),
          ),
        ],
      ),
    );

    expect(_pitchHistoryChartFinder(), findsOneWidget);
  });
}

Finder _pitchHistoryChartFinder() {
  return find.byWidgetPredicate(
    (widget) =>
        widget is Semantics && widget.properties.label == '최근 음정 변화 그래프',
  );
}
