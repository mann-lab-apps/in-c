import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/sheet_tone.dart';
import 'package:in_c_sheet/sheet_tuner.dart';

void main() {
  for (final volume in [0, 35, 100]) {
    testWidgets('drone volume is named and visible at $volume percent', (
      tester,
    ) async {
      const channel = MethodChannel('clef/tone_player');
      final calls = <MethodCall>[];
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(channel, (
        call,
      ) async {
        calls.add(call);
        return null;
      });
      addTearDown(
        () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
          channel,
          null,
        ),
      );
      await tester.pumpWidget(
        buildTunerSheetForTest(
          toneSettings: SheetToneSettings(volumePercent: volume),
        ),
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('세부 설정'));
      await tester.tap(find.text('세부 설정'));
      await tester.pumpAndSettle();
      expect(find.text('드론 음량'), findsOneWidget);
      expect(find.text('$volume%'), findsOneWidget);
      await tester.ensureVisible(find.text('드론 재생'));
      await tester.tap(find.text('드론 재생'));
      await tester.pump();
      expect((calls.last.arguments as Map)['volume'], volume / 100);
      await tester.tap(find.text('드론 정지'));
      await tester.pump();
      final slider = find.descendant(
        of: find.byWidgetPredicate(
          (widget) => widget is Semantics && widget.properties.label == '드론 음량',
        ),
        matching: find.byType(Slider),
      );
      tester.widget<Slider>(slider).onChanged!(50);
      await tester.pump();
      expect(find.text('50%'), findsOneWidget);
      await tester.tap(find.text('드론 재생'));
      await tester.pump();
      expect((calls.last.arguments as Map)['volume'], 0.5);
      await tester.pumpWidget(const SizedBox());
      expect(calls.last.method, 'stop');
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets(
    'tuner sheet is chromatic-only and keeps instrument presets out',
    (tester) async {
      await tester.pumpWidget(buildTunerSheetForTest());
      await tester.pump();

      expect(find.text('튜너'), findsOneWidget);
      expect(find.text('A4 440 Hz'), findsOneWidget);
      expect(_pitchHistoryChartFinder(), findsOneWidget);
      expect(find.text('세부 설정'), findsOneWidget);
      expect(find.text('정확'), findsNothing);
      expect(find.text('++'), findsNothing);
      expect(find.byType(Slider), findsNothing);
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

  testWidgets('mini tuner panel shows live chromatic reading', (tester) async {
    final states = StreamController<SheetTunerState>();
    var opened = 0;
    addTearDown(states.close);
    await tester.pumpWidget(
      buildViewerMiniTunerPanelForTest(
        tunerStateStream: states.stream,
        onOpenTuner: () => opened++,
      ),
    );
    await tester.pump();

    expect(find.text('크로매틱 튜너'), findsOneWidget);
    expect(find.text('--'), findsOneWidget);
    expect(find.text('상세 튜너'), findsOneWidget);

    states.add(
      SheetTunerState(
        isListening: true,
        reading: SheetTunerReading(
          frequency: 440,
          note: SheetTunerPitch.noteFromMidi(69),
          centsOffset: 0,
          signalLevel: 0.92,
        ),
        inputStatus: SheetTunerInputStatus.listening,
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('A4'), findsOneWidget);
    expect(find.text('+0.0 cents'), findsOneWidget);
    expect(find.textContaining('맞았습니다'), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is Semantics && widget.properties.label == '미니 튜너 현재 음 A4',
      ),
      findsOneWidget,
    );

    states.add(
      const SheetTunerState(
        isListening: true,
        reading: null,
        inputStatus: SheetTunerInputStatus.noSignal,
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('--'), findsOneWidget);
    expect(find.text('소리가 작거나 주변 소음이 큽니다'), findsOneWidget);
    await tester.tap(find.text('상세 튜너'));
    expect(opened, 1);
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
