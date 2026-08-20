import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_click/metronome_audio.dart';
import 'package:in_c_click/metronome_controller.dart';
import 'package:in_c_click/tempo_marking.dart';

class FakeMetronomeAudio implements MetronomeAudio {
  final clicks = <bool>[];
  final loops = <({int bpm, int meter, bool accentFirstBeat})>[];
  int stopLoopCalls = 0;

  @override
  Future<void> click({required bool accent}) async {
    clicks.add(accent);
  }

  @override
  Future<void> playLoop({
    required int bpm,
    required int meter,
    required bool accentFirstBeat,
  }) async {
    loops.add((bpm: bpm, meter: meter, accentFirstBeat: accentFirstBeat));
  }

  @override
  Future<void> stopLoop() async {
    stopLoopCalls += 1;
  }

  @override
  void dispose() {}
}

class SlowMetronomeAudio implements MetronomeAudio {
  SlowMetronomeAudio({required this.delay});

  final Duration delay;
  int loopStarts = 0;

  @override
  Future<void> click({required bool accent}) async {
    await Future<void>.delayed(delay);
  }

  @override
  Future<void> playLoop({
    required int bpm,
    required int meter,
    required bool accentFirstBeat,
  }) async {
    loopStarts += 1;
    await Future<void>.delayed(delay);
  }

  @override
  Future<void> stopLoop() async {}

  @override
  void dispose() {}
}

void main() {
  test('clamps BPM and normalizes meter', () {
    const state = MetronomeState(
      bpm: 96,
      meter: 4,
      accentFirstBeat: true,
    );

    expect(state.copyWith(bpm: 12).bpm, MetronomeState.minBpm);
    expect(state.copyWith(bpm: 999).bpm, MetronomeState.maxBpm);
    expect(state.copyWith(meter: 5).meter, 4);
    expect(state.copyWith(meter: 6).meter, 6);
  });

  test('maps BPM to classical tempo markings', () {
    expect(tempoMarkingForBpm(52).name, 'Largo');
    expect(tempoMarkingForBpm(68).name, 'Adagio');
    expect(tempoMarkingForBpm(92).name, 'Andante');
    expect(tempoMarkingForBpm(116).name, 'Moderato');
    expect(tempoMarkingForBpm(144).name, 'Allegro');
    expect(tempoMarkingForBpm(184).name, 'Presto');
    expect(tempoMarkingForBpm(208).name, 'Prestissimo');
  });

  test('tap tempo updates BPM from recent taps', () async {
    final audio = FakeMetronomeAudio();
    final controller = MetronomeController(
      audio: audio,
      saveState: (_) async {},
    );

    controller.tapTempo();
    await Future<void>.delayed(const Duration(milliseconds: 500));
    controller.tapTempo();

    expect(controller.state.bpm, inInclusiveRange(115, 125));
    controller.dispose();
  });

  test('start begins an accented audio loop when enabled', () async {
    final audio = FakeMetronomeAudio();
    final controller = MetronomeController(
      audio: audio,
      saveState: (_) async {},
    );

    await controller.start();

    expect(controller.isPlaying, isTrue);
    expect(
      audio.loops.single,
      (bpm: 96, meter: 4, accentFirstBeat: true),
    );

    controller.stop();
    controller.dispose();
  });

  test('beat timer starts after audio loop preparation', () async {
    final audio = SlowMetronomeAudio(
      delay: const Duration(milliseconds: 350),
    );
    final controller = MetronomeController(
      audio: audio,
      saveState: (_) async {},
      initialState: const MetronomeState(
        bpm: 240,
        meter: 4,
        accentFirstBeat: true,
      ),
    );

    final stopwatch = Stopwatch()..start();
    final startFuture = controller.start();

    await Future<void>.delayed(const Duration(milliseconds: 180));

    expect(controller.isPlaying, isTrue);
    expect(controller.visibleBeat, 0);
    expect(audio.loopStarts, 1);

    await startFuture;
    stopwatch.stop();

    expect(stopwatch.elapsedMilliseconds, greaterThanOrEqualTo(300));

    controller.stop();
    controller.dispose();
  });
}
