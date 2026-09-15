import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/sheet_metronome.dart';

void main() {
  const channel = MethodChannel('clef/metronome_player');
  for (final mini in [false, true]) {
    for (final bars in [0, 1, 2]) {
      testWidgets('skipped ticks retain bar phase mini=$mini bars=$bars', (
        tester,
      ) async {
        final clicks = <bool>[];
        tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
          channel,
          (call) async {
            clicks.add((call.arguments as Map)['accent'] as bool);
            return null;
          },
        );
        addTearDown(() {
          tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
            channel,
            null,
          );
        });
        final settings = SheetMetronomeSettings(
          bpm: 240,
          meter: SheetMetronomeMeter.fourFour,
          countInBars: bars,
        );
        await tester.pumpWidget(
          mini
              ? buildViewerMiniMetronomePanelForTest(settings: settings)
              : buildMetronomeSheetForTest(settings: settings),
        );
        final timers = <_DelayedTimer>[];
        Future<void> start() => runZoned(
          () => tester.tap(find.text('시작')),
          zoneSpecification: ZoneSpecification(
            createPeriodicTimer: (self, parent, zone, duration, callback) {
              if (duration != settings.pulseDuration) {
                return parent.createPeriodicTimer(zone, duration, callback);
              }
              final timer = _DelayedTimer(callback);
              timers.add(timer);
              return timer;
            },
          ),
        );
        await start();
        await tester.pump();
        final timer = timers.single;
        timer.fire(1);
        await tester.pump();
        // Dart Timer.tick includes missed periods, not just callback invocations.
        timer.fire(4);
        await tester.pump();
        expect(clicks, [true, false, true]);
        timer.fire(5);
        await tester.pump();
        timer.fire(8);
        await tester.pump();
        expect(clicks, [true, false, true, false, true]);
        timer.fire(11);
        await tester.pump();
        expect(clicks.last, isFalse);
        timer.fire(12);
        await tester.pump();
        expect(clicks.last, isTrue);
        final count = clicks.length;
        timer.fire(12);
        await tester.pump();
        expect(clicks, hasLength(count));
        await tester.tap(find.text('정지'));
        await tester.pump();
        expect(timer.isActive, isFalse);
        timer.fire(16, evenIfCancelled: true);
        await tester.pump();
        expect(clicks, hasLength(count));
        await start();
        await tester.pump();
        expect(clicks, hasLength(count + 1));
        timer.fire(20, evenIfCancelled: true);
        await tester.pump();
        expect(clicks, hasLength(count + 1));
        timers.last.fire(1);
        await tester.pump();
        expect(clicks.last, isFalse);
        await tester.pumpWidget(const SizedBox());
        final beforeClose = clicks.length;
        timers.last.fire(4, evenIfCancelled: true);
        await tester.pump();
        expect(clicks, hasLength(beforeClose));
        expect(tester.takeException(), isNull);
      });
    }
  }
}

class _DelayedTimer implements Timer {
  _DelayedTimer(this.callback);

  final void Function(Timer) callback;
  @override
  int tick = 0;
  @override
  bool isActive = true;

  void fire(int elapsedTick, {bool evenIfCancelled = false}) {
    if (!isActive && !evenIfCancelled) return;
    tick = elapsedTick;
    callback(this);
  }

  @override
  void cancel() => isActive = false;
}
