import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/sheet_tuner.dart';

void main() {
  const channel = MethodChannel('clef/tone_player');
  final calls = <MethodCall>[];
  setUp(() {
    calls.clear();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
          calls.add(call);
          return null;
        });
  });
  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  });

  for (final setting in ['notation', 'detector', 'legacy']) {
    for (final closed in [false, true]) {
      testWidgets('$setting save failure is scoped to sheet closed=$closed', (
        tester,
      ) async {
        final save = Completer<void>();
        await tester.pumpWidget(
          buildTunerSheetForTest(
            settings: setting == 'legacy'
                ? const SheetTunerSettings(
                    referencePitchA4: 440,
                    tuningPreset: SheetTunerPreset.guitarStandard,
                  )
                : SheetTunerSettings.defaultSettings,
            onSettingsChanged: (_) => save.future,
          ),
        );
        await tester.pumpAndSettle();
        if (setting != 'legacy') {
          await tester.ensureVisible(find.text('세부 설정'));
          await tester.tap(find.text('세부 설정'));
          await tester.pumpAndSettle();
          if (setting == 'notation') {
            await tester.ensureVisible(find.text('샵 표기'));
            await tester.tap(find.text('샵 표기'));
          } else {
            tester
                .widget<
                  DropdownButtonFormField<SheetTunerPitchDetectionAlgorithm>
                >(
                  find.byType(
                    DropdownButtonFormField<SheetTunerPitchDetectionAlgorithm>,
                  ),
                )
                .onChanged!(SheetTunerPitchDetectionAlgorithm.yin);
          }
          await tester.pump();
        }
        if (closed) await tester.pumpWidget(const SizedBox());
        save.completeError(StateError('save failed'));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(
          find.text('설정을 저장하지 못했습니다. 다시 변경해주세요.'),
          closed ? findsNothing : findsOneWidget,
        );
        await tester.pumpWidget(const SizedBox());
      });
    }
  }

  for (final setting in ['volume', 'reference']) {
    testWidgets('$setting failure cannot show over a newer route', (
      tester,
    ) async {
      final save = Completer<void>();
      await _openTone(tester, save: save);
      await _change(tester, setting);
      final navigator = Navigator.of(tester.element(find.text('튜너')));
      unawaited(
        navigator.push<void>(
          MaterialPageRoute<void>(
            builder: (_) => const Scaffold(body: Text('다른 화면')),
          ),
        ),
      );
      await tester.pumpAndSettle();
      save.completeError(StateError('old route save failed'));
      await tester.pumpAndSettle();
      expect(find.text('다른 화면'), findsOneWidget);
      expect(find.text('설정을 저장하지 못했습니다. 다시 변경해주세요.'), findsNothing);
      navigator.pop();
      await tester.pumpAndSettle();
      expect(find.text('설정을 저장하지 못했습니다. 다시 변경해주세요.'), findsNothing);
      await tester.pumpWidget(const SizedBox());
      expect(tester.takeException(), isNull);
    });
    for (final exit in ['stop', 'close']) {
      testWidgets('late $setting save cannot play after $exit', (tester) async {
        final save = Completer<void>();
        await _openTone(tester, save: save);
        await _change(tester, setting);
        if (exit == 'close') {
          await tester.pumpWidget(const SizedBox());
        } else {
          await tester.ensureVisible(find.text('드론 정지'));
          await tester.tap(find.text('드론 정지'));
          await tester.pump();
        }
        final beforeCompletion = calls.length;
        save.complete();
        await tester.pump();
        expect(calls, hasLength(beforeCompletion));
        expect(calls.last.method, 'stop');
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
      });
    }
    testWidgets('$setting playback changes before slow save completes', (
      tester,
    ) async {
      final save = Completer<void>();
      await _openTone(tester, save: save);
      await _change(tester, setting);
      expect(calls.where((call) => call.method == 'play'), hasLength(2));
      final arguments = calls.last.arguments as Map;
      expect(
        setting == 'volume'
            ? arguments['volume']
            : (arguments['frequencies'] as List).first,
        setting == 'volume' ? 0.5 : 441.0,
      );
      final beforeCompletion = calls.length;
      save.complete();
      await tester.pump();
      expect(calls, hasLength(beforeCompletion));
      await tester.pumpWidget(const SizedBox());
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('late stop completion cannot update a closed sheet', (
    tester,
  ) async {
    final stop = Completer<void>();
    var stops = 0;
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(channel, (
      call,
    ) async {
      calls.add(call);
      if (call.method == 'stop' && stops++ == 0) await stop.future;
      return null;
    });
    await _openTone(tester);
    await tester.tap(find.text('드론 정지'));
    await tester.pump();
    await tester.pumpWidget(const SizedBox());
    stop.complete();
    await tester.pump();
    expect(tester.takeException(), isNull);
  });

  for (final setting in ['volume', 'reference']) {
    for (final outcome in [
      'success',
      'latest failure',
      'old failure',
      'new failure',
      'closed failure',
    ]) {
      testWidgets('$setting saves handle $outcome', (tester) async {
        final saves = <Completer<void>>[];
        await _openTone(
          tester,
          persist: () {
            final save = Completer<void>();
            saves.add(save);
            return save.future;
          },
        );
        await _change(tester, setting);
        if (outcome == 'old failure' || outcome == 'new failure') {
          await _change(tester, setting, volume: 65);
        }
        if (outcome == 'closed failure') {
          await tester.pumpWidget(const SizedBox());
        }
        if (outcome == 'success') {
          saves.single.complete();
        } else if (outcome == 'old failure') {
          saves.last.complete();
          saves.first.completeError(StateError('old save failed'));
        } else if (outcome == 'new failure') {
          saves.first.complete();
          saves.last.completeError(StateError('new save failed'));
        } else {
          saves.single.completeError(StateError('save failed'));
        }
        final beforeCompletion = calls.length;
        await tester.pump();
        expect(calls, hasLength(beforeCompletion));
        expect(tester.takeException(), isNull);
        final showsError =
            outcome == 'latest failure' || outcome == 'new failure';
        expect(
          find.text('설정을 저장하지 못했습니다. 다시 변경해주세요.'),
          showsError ? findsOneWidget : findsNothing,
        );
        if (showsError) {
          await _change(tester, setting, volume: 75);
          saves.last.complete();
          await tester.pump();
          expect(find.text('드론 정지'), findsOneWidget);
          expect(tester.takeException(), isNull);
        }
        await tester.pumpWidget(const SizedBox());
      });
    }
  }

  for (final outcome in [
    'old success',
    'old failure',
    'new failure',
    'stopped',
    'closed',
  ]) {
    testWidgets('playback response cannot replace newer state: $outcome', (
      tester,
    ) async {
      final plays = <Completer<void>>[];
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(channel, (
        call,
      ) async {
        calls.add(call);
        if (call.method == 'play') {
          final play = Completer<void>();
          plays.add(play);
          await play.future;
        }
        return null;
      });
      await _openTone(tester);
      expect(find.text('드론 정지'), findsOneWidget);
      if (outcome == 'closed') {
        await tester.pumpWidget(const SizedBox());
        plays.single.complete();
      } else if (outcome == 'stopped') {
        await tester.tap(find.text('드론 정지'));
        await tester.pump();
        plays.single.complete();
      } else {
        await _change(tester, 'volume');
        expect(plays, hasLength(2));
        if (outcome == 'new failure') {
          plays.first.complete();
          plays.last.completeError(
            PlatformException(code: 'play', message: 'New output failure'),
          );
        } else {
          plays.last.complete();
          if (outcome == 'old failure') {
            plays.first.completeError(
              PlatformException(code: 'play', message: 'Old output failure'),
            );
          } else {
            plays.first.complete();
          }
        }
      }
      await tester.pump();
      expect(tester.takeException(), isNull);
      expect(find.text('Old output failure'), findsNothing);
      if (outcome != 'closed') {
        expect(
          find.text('드론 재생'),
          outcome == 'stopped' || outcome == 'new failure'
              ? findsOneWidget
              : findsNothing,
        );
        expect(
          find.text('New output failure'),
          outcome == 'new failure' ? findsOneWidget : findsNothing,
        );
      }
      await tester.pumpWidget(const SizedBox());
    });
  }
}

Future<void> _openTone(
  WidgetTester tester, {
  Completer<void>? save,
  Future<void> Function()? persist,
}) async {
  await tester.pumpWidget(
    buildTunerSheetForTest(
      onSettingsChanged: (_) =>
          persist?.call() ?? save?.future ?? Future<void>.value(),
      onToneSettingsChanged: (_) =>
          persist?.call() ?? save?.future ?? Future<void>.value(),
    ),
  );
  await tester.pumpAndSettle();
  await tester.ensureVisible(find.text('세부 설정'));
  await tester.tap(find.text('세부 설정'));
  await tester.pumpAndSettle();
  await tester.ensureVisible(find.text('드론 재생'));
  await tester.tap(find.text('드론 재생'));
  await tester.pump();
}

Future<void> _change(
  WidgetTester tester,
  String setting, {
  double volume = 50,
}) async {
  if (setting == 'volume') {
    final slider = find.descendant(
      of: find.byWidgetPredicate(
        (widget) => widget is Semantics && widget.properties.label == '드론 음량',
      ),
      matching: find.byType(Slider),
    );
    tester.widget<Slider>(slider).onChanged!(volume);
  } else {
    await tester.ensureVisible(find.byTooltip('A4 올리기'));
    await tester.tap(find.byTooltip('A4 올리기'));
  }
  await tester.pump();
}
