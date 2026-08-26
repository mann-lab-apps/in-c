import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_chime/chime_audio.dart';
import 'package:in_c_chime/chime_controller.dart';
import 'package:in_c_chime/main.dart';
import 'package:in_c_chime/tone_model.dart';

class FakeChimeAudio implements ChimeAudio {
  final chimes = <({double frequency, ToneColor toneColor, double volume})>[];
  final drones = <({double frequency, ToneColor toneColor, double volume})>[];
  final droneVolumes = <double>[];
  int stopDroneCalls = 0;
  int disposeCalls = 0;

  @override
  Future<void> playChime({
    required double frequency,
    required ToneColor toneColor,
    required double volume,
  }) async {
    chimes.add((frequency: frequency, toneColor: toneColor, volume: volume));
  }

  @override
  Future<void> startDrone({
    required double frequency,
    required ToneColor toneColor,
    required double volume,
  }) async {
    drones.add((frequency: frequency, toneColor: toneColor, volume: volume));
  }

  @override
  Future<void> setDroneVolume(double volume) async {
    droneVolumes.add(volume);
  }

  @override
  Future<void> stopDrone() async {
    stopDroneCalls += 1;
  }

  @override
  void dispose() {
    disposeCalls += 1;
  }
}

void main() {
  test('calculates pitch frequency from selected A reference', () {
    const a440 = ChimeTone(
      pitch: PitchName.a,
      octave: 4,
      referenceA: 440,
    );
    const c442 = ChimeTone(
      pitch: PitchName.c,
      octave: 4,
      referenceA: 442,
    );

    expect(a440.frequency, closeTo(440, 0.001));
    expect(c442.frequency, closeTo(262.815, 0.001));
    expect(c442.label, 'C4');
  });

  test('normalizes persisted state values', () {
    expect(normalizePitch(-1), PitchName.a);
    expect(normalizeOctave(9), 4);
    expect(normalizeReferenceA(443), 440);
    expect(normalizeToneColor(99), ToneColor.warm);
  });

  test('plays a chime with the current tone settings', () async {
    final audio = FakeChimeAudio();
    final controller = ChimeController(
      audio: audio,
      saveState: (_) async {},
      initialState: const ChimeState(
        pitch: PitchName.c,
        octave: 4,
        referenceA: 440,
        toneColor: ToneColor.bright,
        volume: 0.5,
      ),
    );

    await controller.playChime();

    expect(audio.chimes.single.frequency, closeTo(261.626, 0.001));
    expect(audio.chimes.single.toneColor, ToneColor.bright);
    expect(audio.chimes.single.volume, 0.5);

    controller.dispose();
  });

  test('starts, restarts, and stops the drone', () async {
    final audio = FakeChimeAudio();
    final controller = ChimeController(
      audio: audio,
      saveState: (_) async {},
    );

    await controller.startDrone();
    controller.setPitch(PitchName.d);
    controller.setVolume(0.25);
    controller.stopDrone();

    expect(controller.isDronePlaying, isFalse);
    expect(audio.drones, hasLength(2));
    expect(audio.drones.first.frequency, closeTo(440, 0.001));
    expect(audio.drones.last.frequency, closeTo(293.665, 0.001));
    expect(audio.droneVolumes.single, 0.25);
    expect(audio.stopDroneCalls, 1);

    controller.dispose();
  });

  testWidgets('renders the main surface on a small phone viewport',
      (tester) async {
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final controller = ChimeController(
      audio: FakeChimeAudio(),
      saveState: (_) async {},
    );

    await tester.pumpWidget(InCChimeApp(controller: controller));

    expect(find.text('Chime에 필요한 소리가 있나요?'), findsOneWidget);
    expect(find.text('A4'), findsOneWidget);
    expect(find.text('Chime'), findsOneWidget);
    expect(find.text('Drone'), findsOneWidget);

    await tester.pumpWidget(const SizedBox.shrink());
  });
}
