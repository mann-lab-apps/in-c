import 'package:shared_preferences/shared_preferences.dart';

import 'classical_discovery_models.dart';

class ClassicalDiscoveryStore {
  static const _stateKey = 'clef_classical_discovery_state';

  Future<UserDiscoveryState> loadState() async {
    final preferences = await SharedPreferences.getInstance();
    return UserDiscoveryState.decode(preferences.getString(_stateKey));
  }

  Future<void> saveState(UserDiscoveryState state) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(_stateKey, UserDiscoveryState.encode(state));
  }
}
