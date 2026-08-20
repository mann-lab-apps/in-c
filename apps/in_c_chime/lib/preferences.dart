import 'package:shared_preferences/shared_preferences.dart';

import 'chime_controller.dart';
import 'tone_model.dart';

class ChimePreferences {
  static const _pitchKey = 'in_c_chime_pitch';
  static const _octaveKey = 'in_c_chime_octave';
  static const _referenceAKey = 'in_c_chime_reference_a';
  static const _toneColorKey = 'in_c_chime_tone_color';
  static const _volumeKey = 'in_c_chime_volume';

  Future<ChimeState> load() async {
    final preferences = await SharedPreferences.getInstance();

    return ChimeState.defaultState.copyWith(
      pitch: normalizePitch(preferences.getInt(_pitchKey) ?? PitchName.a.index),
      octave: preferences.getInt(_octaveKey),
      referenceA: preferences.getInt(_referenceAKey),
      toneColor: normalizeToneColor(
        preferences.getInt(_toneColorKey) ?? ToneColor.warm.index,
      ),
      volume: preferences.getDouble(_volumeKey),
    );
  }

  Future<void> save(ChimeState state) async {
    final preferences = await SharedPreferences.getInstance();

    await Future.wait([
      preferences.setInt(_pitchKey, state.pitch.index),
      preferences.setInt(_octaveKey, state.octave),
      preferences.setInt(_referenceAKey, state.referenceA),
      preferences.setInt(_toneColorKey, state.toneColor.index),
      preferences.setDouble(_volumeKey, state.volume),
    ]);
  }
}
