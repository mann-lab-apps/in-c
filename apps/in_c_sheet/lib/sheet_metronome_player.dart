import 'package:flutter/services.dart';

import 'sheet_metronome.dart';

class SheetMetronomeSoundPlayer {
  SheetMetronomeSoundPlayer({MethodChannel? channel})
    : _channel = channel ?? const MethodChannel('clef/metronome_player');

  final MethodChannel _channel;

  Future<void> playClick({
    required SheetMetronomeSettings settings,
    required bool accent,
  }) async {
    if (!settings.soundEnabled || settings.volumePercent <= 0) {
      return;
    }

    try {
      await _channel.invokeMethod<void>('playClick', <String, Object?>{
        'accent': accent && settings.accentEnabled,
        'volume': settings.normalizedVolume,
      });
    } on MissingPluginException {
      await SystemSound.play(SystemSoundType.click);
    } on PlatformException {
      await SystemSound.play(SystemSoundType.click);
    }
  }
}
