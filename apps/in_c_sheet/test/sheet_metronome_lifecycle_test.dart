import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/sheet_metronome.dart';
import 'package:in_c_sheet/sheet_metronome_player.dart';

void main() {
  const silent = SheetMetronomeSettings(
    bpm: 120,
    meter: SheetMetronomeMeter.fourFour,
    soundEnabled: false,
  );
  for (final action in ['BPM', '3/4', '8분', '1마디']) {
    for (final exit in ['close', 'stop']) {
      testWidgets('$action save after $exit cannot restart metronome', (
        tester,
      ) async {
        final saved = Completer<void>();
        await tester.pumpWidget(
          buildMetronomeSheetForTest(
            settings: silent,
            onSettingsChanged: (_) => saved.future,
          ),
        );
        await tester.tap(find.text('시작'));
        await tester.pump();
        final control = action == 'BPM'
            ? find.byTooltip('BPM 올리기')
            : find.text(action);
        await tester.ensureVisible(control);
        await tester.tap(control);
        await tester.pump();
        if (exit == 'close') {
          await tester.pumpWidget(const SizedBox.shrink());
        } else {
          await tester.scrollUntilVisible(
            find.text('정지'),
            -250,
            scrollable: find.byType(Scrollable).first,
          );
          await tester.pump();
          await tester.ensureVisible(find.text('정지'));
          await tester.pump();
          expect(find.text('정지').hitTestable(), findsOneWidget);
          await tester.tap(find.text('정지'));
          await tester.pump();
        }
        saved.complete();
        await tester.pump();
        await tester.pump(const Duration(seconds: 1));
        if (exit == 'stop') expect(find.text('시작'), findsOneWidget);
        expect(tester.takeException(), isNull);
      });
    }
  }

  testWidgets(
    'BPM playback changes before save and late completion does not reset beat',
    (tester) async {
      final saves = <Completer<void>>[];
      await tester.pumpWidget(
        buildMetronomeSheetForTest(
          settings: silent,
          onSettingsChanged: (_) {
            final save = Completer<void>();
            saves.add(save);
            return save.future;
          },
        ),
      );
      await tester.tap(find.text('시작'));
      await tester.pump();
      await tester.tap(find.byTooltip('BPM 올리기'));
      await tester.pump();
      await tester.tap(find.byTooltip('BPM 올리기'));
      await tester.pump();
      expect(find.text('122'), findsOneWidget);
      await tester.pump(const Duration(milliseconds: 492));
      expect(find.textContaining('BPM · 4/4 · 2/4'), findsOneWidget);
      await tester.pump(const Duration(milliseconds: 200));
      saves.last.complete();
      saves.first.complete();
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 292));
      expect(find.textContaining('BPM · 4/4 · 3/4'), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
      expect(tester.takeException(), isNull);
    },
  );

  for (final outcome in [
    'latest failure',
    'old failure',
    'closed failure',
    'success',
  ]) {
    testWidgets('metronome handles $outcome without stale UI', (tester) async {
      final saves = <Completer<void>>[];
      await tester.pumpWidget(
        buildMetronomeSheetForTest(
          settings: silent,
          onSettingsChanged: (_) {
            final save = Completer<void>();
            saves.add(save);
            return save.future;
          },
        ),
      );
      await tester.tap(find.byTooltip('BPM 올리기'));
      await tester.pump();
      if (outcome == 'old failure') {
        await tester.tap(find.byTooltip('BPM 올리기'));
        await tester.pump();
        saves.last.complete();
      }
      if (outcome == 'closed failure') {
        await tester.pumpWidget(const SizedBox.shrink());
      }
      if (outcome == 'success') {
        saves.first.complete();
      } else {
        saves.first.completeError(StateError('save failed'));
      }
      await tester.pump();
      expect(tester.takeException(), isNull);
      expect(
        find.text('설정을 저장하지 못했습니다. 다시 변경해주세요.'),
        outcome == 'latest failure' ? findsOneWidget : findsNothing,
      );
      if (outcome == 'latest failure') {
        await tester.tap(find.byTooltip('BPM 올리기'));
        await tester.pump();
        saves.last.complete();
        await tester.pump();
        expect(find.text('122'), findsOneWidget);
        expect(tester.takeException(), isNull);
      }
    });
  }

  testWidgets('closing running metronome during save leaves no periodic timer', (
    tester,
  ) async {
    final saved = Completer<void>();
    await tester.pumpWidget(
      buildMetronomeSheetForTest(
        settings: SheetMetronomeSettings.defaultSettings.copyWith(
          soundEnabled: false,
        ),
        onSettingsChanged: (_) => saved.future,
      ),
    );
    await tester.tap(find.text('시작'));
    await tester.pump();
    await tester.tap(find.byTooltip('BPM 올리기'));
    await tester.pump();
    await tester.pumpWidget(const SizedBox.shrink());
    saved.complete();
    await tester.pump();
    expect(tester.takeException(), isNull);
    // The widget test binding also rejects periodic timers surviving teardown.
  });

  testWidgets(
    'metronome sheet reports fallback output and clears after native retry',
    (tester) async {
      final player = _QueuedMetronomeSoundPlayer(
        <Future<SheetMetronomeOutputStatus>>[
          Future<SheetMetronomeOutputStatus>.value(
            SheetMetronomeOutputStatus.fallback,
          ),
          Future<SheetMetronomeOutputStatus>.value(
            SheetMetronomeOutputStatus.native,
          ),
        ],
      );
      await tester.pumpWidget(buildMetronomeSheetForTest(soundPlayer: player));

      await tester.tap(find.text('시작'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 1));
      expect(player.calls, 1);
      expect(find.text('기본 클릭음으로 재생 중입니다'), findsOneWidget);

      await tester.tap(find.text('정지'));
      await tester.pump();
      await tester.tap(find.text('시작'));
      await tester.pump();
      await tester.pump();
      expect(find.text('기본 클릭음으로 재생 중입니다'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('metronome sheet ignores delayed unavailable output after stop', (
    tester,
  ) async {
    final delayed = Completer<SheetMetronomeOutputStatus>();
    final player = _QueuedMetronomeSoundPlayer(
      <Future<SheetMetronomeOutputStatus>>[delayed.future],
    );
    await tester.pumpWidget(buildMetronomeSheetForTest(soundPlayer: player));

    await tester.tap(find.text('시작'));
    await tester.pump();
    await tester.tap(find.text('정지'));
    await tester.pump();
    delayed.complete(SheetMetronomeOutputStatus.unavailable);
    await tester.pump();

    expect(find.text('메트로놈 소리를 내지 못했습니다'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('mini metronome panel reports unavailable output', (
    tester,
  ) async {
    final player = _QueuedMetronomeSoundPlayer(
      <Future<SheetMetronomeOutputStatus>>[
        Future<SheetMetronomeOutputStatus>.value(
          SheetMetronomeOutputStatus.unavailable,
        ),
      ],
    );
    await tester.pumpWidget(
      buildViewerMiniMetronomePanelForTest(soundPlayer: player),
    );

    await tester.tap(find.text('시작'));
    await tester.pump();
    await tester.pump();

    expect(find.text('메트로놈 소리를 내지 못했습니다'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'mini metronome panel clears fallback output after native retry',
    (tester) async {
      final player = _QueuedMetronomeSoundPlayer(
        <Future<SheetMetronomeOutputStatus>>[
          Future<SheetMetronomeOutputStatus>.value(
            SheetMetronomeOutputStatus.fallback,
          ),
          Future<SheetMetronomeOutputStatus>.value(
            SheetMetronomeOutputStatus.native,
          ),
        ],
      );
      await tester.pumpWidget(
        buildViewerMiniMetronomePanelForTest(soundPlayer: player),
      );

      await tester.tap(find.text('시작'));
      await tester.pump();
      await tester.pump();
      expect(find.text('기본 클릭음으로 재생 중입니다'), findsOneWidget);

      await tester.tap(find.text('정지'));
      await tester.pump();
      await tester.tap(find.text('시작'));
      await tester.pump();
      await tester.pump();

      expect(find.text('기본 클릭음으로 재생 중입니다'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'mini metronome panel ignores delayed unavailable output after stop',
    (tester) async {
      final delayed = Completer<SheetMetronomeOutputStatus>();
      final player = _QueuedMetronomeSoundPlayer(
        <Future<SheetMetronomeOutputStatus>>[delayed.future],
      );
      await tester.pumpWidget(
        buildViewerMiniMetronomePanelForTest(soundPlayer: player),
      );

      await tester.tap(find.text('시작'));
      await tester.pump();
      await tester.tap(find.text('정지'));
      await tester.pump();
      delayed.complete(SheetMetronomeOutputStatus.unavailable);
      await tester.pump();

      expect(find.text('메트로놈 소리를 내지 못했습니다'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
}

class _QueuedMetronomeSoundPlayer extends SheetMetronomeSoundPlayer {
  _QueuedMetronomeSoundPlayer(this._results);

  final List<Future<SheetMetronomeOutputStatus>> _results;
  int calls = 0;

  @override
  Future<SheetMetronomeOutputStatus> playClick({
    required SheetMetronomeSettings settings,
    required bool accent,
    bool Function()? shouldFallback,
  }) {
    calls++;
    if (_results.isEmpty) {
      return Future<SheetMetronomeOutputStatus>.value(
        SheetMetronomeOutputStatus.native,
      );
    }
    return _results.removeAt(0);
  }
}
