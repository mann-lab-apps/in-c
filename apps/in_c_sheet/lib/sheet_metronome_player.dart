import 'package:flutter/services.dart';

import 'sheet_metronome.dart';

enum SheetMetronomeOutputStatus { skipped, native, fallback, unavailable }

class SheetMetronomeSoundPlayer {
  SheetMetronomeSoundPlayer({
    MethodChannel? channel,
    Future<void> Function(SystemSoundType type)? systemSoundPlay,
  }) : _channel = channel ?? const MethodChannel('clef/metronome_player'),
       _systemSoundPlay = systemSoundPlay ?? SystemSound.play;

  final MethodChannel _channel;
  final Future<void> Function(SystemSoundType type) _systemSoundPlay;

  Future<SheetMetronomeOutputStatus> playClick({
    required SheetMetronomeSettings settings,
    required bool accent,
    bool Function()? shouldFallback,
  }) async {
    if (!settings.soundEnabled || settings.volumePercent <= 0) {
      return SheetMetronomeOutputStatus.skipped;
    }

    try {
      await _channel.invokeMethod<void>('playClick', <String, Object?>{
        'accent': accent && settings.accentEnabled,
        'volume': settings.normalizedVolume,
      });
      return SheetMetronomeOutputStatus.native;
    } on MissingPluginException {
      return _playFallbackIfCurrent(shouldFallback);
    } on PlatformException {
      return _playFallbackIfCurrent(shouldFallback);
    }
  }

  Future<SheetMetronomeOutputStatus> _playFallbackIfCurrent(
    bool Function()? shouldFallback,
  ) async {
    if (shouldFallback != null && !shouldFallback()) {
      return SheetMetronomeOutputStatus.unavailable;
    }
    try {
      await _systemSoundPlay(SystemSoundType.click);
      return SheetMetronomeOutputStatus.fallback;
    } catch (_) {
      return SheetMetronomeOutputStatus.unavailable;
    }
  }
}
