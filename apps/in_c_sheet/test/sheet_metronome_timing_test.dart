import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/sheet_metronome.dart';

void main() {
  const channel = MethodChannel('clef/metronome_player');
  for (final mini in [false, true]) {
    for (final bpm in [96, 240]) {
      for (final subdivision in SheetMetronomeSubdivision.values) {
        for (final countInBars in [0, 1, 2]) {
          testWidgets(
            'count-in beat spacing mini=$mini bpm=$bpm subdivision=$subdivision bars=$countInBars',
            (tester) async {
              final clicks = <bool>[];
              final times = <DateTime>[];
              tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
                channel,
                (call) async {
                  if (call.method == 'playClick') {
                    clicks.add((call.arguments as Map)['accent'] as bool);
                    times.add(tester.binding.clock.now());
                  }
                  return null;
                },
              );
              addTearDown(
                () => tester.binding.defaultBinaryMessenger
                    .setMockMethodCallHandler(channel, null),
              );
              final settings = SheetMetronomeSettings(
                bpm: bpm,
                meter: SheetMetronomeMeter.fourFour,
                subdivision: subdivision,
                countInBars: countInBars,
              );
              await tester.pumpWidget(
                mini
                    ? buildViewerMiniMetronomePanelForTest(settings: settings)
                    : buildMetronomeSheetForTest(settings: settings),
              );
              await tester.tap(find.text('시작'));
              await tester.pump();
              final countInBeats = countInBars * settings.meter.beatsPerBar;
              final beatsToAdvance = countInBeats + 5;
              for (
                var pulse = 0;
                pulse < subdivision.pulsesPerBeat * beatsToAdvance;
                pulse++
              ) {
                await tester.pump(settings.pulseDuration);
              }
              expect(
                clicks,
                List.generate(
                  beatsToAdvance + 1,
                  (beat) => beat % settings.meter.beatsPerBar == 0,
                ),
              );
              final beatInterval =
                  settings.pulseDuration * subdivision.pulsesPerBeat;
              for (var index = 1; index < times.length; index++) {
                expect(times[index].difference(times[index - 1]), beatInterval);
              }
              await tester.tap(find.text('정지'));
              await tester.pump(const Duration(seconds: 2));
              expect(clicks, hasLength(beatsToAdvance + 1));
              await tester.tap(find.text('시작'));
              await tester.pump();
              expect(clicks.last, isTrue);
              final clicksBeforeClose = clicks.length;
              await tester.pumpWidget(const SizedBox());
              await tester.pump(const Duration(seconds: 2));
              expect(clicks, hasLength(clicksBeforeClose));
              expect(tester.takeException(), isNull);
            },
          );
        }
      }
    }
  }
}
