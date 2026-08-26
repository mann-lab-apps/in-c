import 'package:shared_preferences/shared_preferences.dart';

import 'metronome_controller.dart';

class ClickPreferences {
  static const _bpmKey = 'in_c_click_bpm';
  static const _meterKey = 'in_c_click_meter';
  static const _accentKey = 'in_c_click_accent_first_beat';

  Future<MetronomeState> load() async {
    final preferences = await SharedPreferences.getInstance();

    return MetronomeState(
      bpm: MetronomeState.clampBpm(preferences.getInt(_bpmKey) ?? 96),
      meter: MetronomeState.normalizeMeter(preferences.getInt(_meterKey) ?? 4),
      accentFirstBeat: preferences.getBool(_accentKey) ?? true,
    );
  }

  Future<void> save(MetronomeState state) async {
    final preferences = await SharedPreferences.getInstance();

    await Future.wait([
      preferences.setInt(_bpmKey, state.bpm),
      preferences.setInt(_meterKey, state.meter),
      preferences.setBool(_accentKey, state.accentFirstBeat),
    ]);
  }
}
