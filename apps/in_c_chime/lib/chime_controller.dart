import 'dart:async';

import 'package:flutter/foundation.dart';

import 'chime_audio.dart';
import 'tone_model.dart';

@immutable
class ChimeState {
  const ChimeState({
    required this.pitch,
    required this.octave,
    required this.referenceA,
    required this.toneColor,
    required this.volume,
  });

  final PitchName pitch;
  final int octave;
  final int referenceA;
  final ToneColor toneColor;
  final double volume;

  static const defaultState = ChimeState(
    pitch: PitchName.a,
    octave: 4,
    referenceA: 440,
    toneColor: ToneColor.warm,
    volume: 0.72,
  );

  ChimeTone get tone => ChimeTone(
        pitch: pitch,
        octave: octave,
        referenceA: referenceA,
      );

  ChimeState copyWith({
    PitchName? pitch,
    int? octave,
    int? referenceA,
    ToneColor? toneColor,
    double? volume,
  }) {
    return ChimeState(
      pitch: pitch ?? this.pitch,
      octave: normalizeOctave(octave ?? this.octave),
      referenceA: normalizeReferenceA(referenceA ?? this.referenceA),
      toneColor: toneColor ?? this.toneColor,
      volume: (volume ?? this.volume).clamp(0.0, 1.0),
    );
  }
}

class ChimeController extends ChangeNotifier {
  ChimeController({
    required ChimeAudio audio,
    required Future<void> Function(ChimeState state) saveState,
    ChimeState initialState = ChimeState.defaultState,
  })  : _audio = audio,
        _saveState = saveState,
        _state = initialState;

  final ChimeAudio _audio;
  final Future<void> Function(ChimeState state) _saveState;

  ChimeState _state;
  bool _isDronePlaying = false;

  ChimeState get state => _state;
  bool get isDronePlaying => _isDronePlaying;

  void setPitch(PitchName pitch) {
    _updateState(_state.copyWith(pitch: pitch), restartDrone: true);
  }

  void setOctave(int octave) {
    _updateState(_state.copyWith(octave: octave), restartDrone: true);
  }

  void setReferenceA(int referenceA) {
    _updateState(_state.copyWith(referenceA: referenceA), restartDrone: true);
  }

  void setToneColor(ToneColor toneColor) {
    _updateState(_state.copyWith(toneColor: toneColor), restartDrone: true);
  }

  void setVolume(double volume) {
    _updateState(_state.copyWith(volume: volume), restartDrone: false);
    if (_isDronePlaying) {
      unawaited(_audio.setDroneVolume(_state.volume));
    }
  }

  Future<void> playChime() {
    final tone = _state.tone;
    return _audio.playChime(
      frequency: tone.frequency,
      toneColor: _state.toneColor,
      volume: _state.volume,
    );
  }

  Future<void> toggleDrone() async {
    if (_isDronePlaying) {
      stopDrone();
      return;
    }

    await startDrone();
  }

  Future<void> startDrone() async {
    if (_isDronePlaying) {
      return;
    }

    _isDronePlaying = true;
    notifyListeners();
    await _restartDrone();
  }

  void stopDrone() {
    if (!_isDronePlaying) {
      return;
    }

    _isDronePlaying = false;
    unawaited(_audio.stopDrone());
    notifyListeners();
  }

  void _updateState(ChimeState nextState, {required bool restartDrone}) {
    _state = nextState;
    _persist();
    if (_isDronePlaying && restartDrone) {
      unawaited(_restartDrone());
    }
    notifyListeners();
  }

  Future<void> _restartDrone() {
    final tone = _state.tone;
    return _audio.startDrone(
      frequency: tone.frequency,
      toneColor: _state.toneColor,
      volume: _state.volume,
    );
  }

  void _persist() {
    unawaited(_saveState(_state));
  }

  @override
  void dispose() {
    _audio.dispose();
    super.dispose();
  }
}
