import 'package:flutter/services.dart';

class SheetAudioPlayer {
  SheetAudioPlayer({MethodChannel? channel})
    : _channel = channel ?? const MethodChannel('clef/audio_player');

  final MethodChannel _channel;

  Future<Map<String, Object?>?> readRouteInfo() async {
    try {
      return await _channel.invokeMapMethod<String, Object?>('routeInfo');
    } on MissingPluginException {
      return null;
    } on PlatformException {
      return null;
    }
  }

  Future<SheetAudioPlaybackPosition?> readPosition() async {
    try {
      final response = await _channel.invokeMapMethod<String, Object?>(
        'position',
      );
      final positionMs = _positiveOrZeroInt(response?['positionMs']);
      final durationMs = _positiveInt(response?['durationMs']);
      final isPlaying = response?['isPlaying'];
      if (positionMs == null || durationMs == null || isPlaying is! bool) {
        return null;
      }
      return SheetAudioPlaybackPosition(
        position: Duration(milliseconds: positionMs.clamp(0, durationMs)),
        duration: Duration(milliseconds: durationMs),
        isPlaying: isPlaying,
      );
    } on MissingPluginException {
      return null;
    } on PlatformException {
      return null;
    }
  }

  Future<SheetAudioTrackInfo?> inspect(String path) async {
    try {
      final response = await _channel.invokeMapMethod<String, Object?>(
        'inspect',
        <String, Object?>{'path': path.trim()},
      );
      final durationValue = response?['durationMs'];
      final durationMs = switch (durationValue) {
        int value => value,
        double value => value.round(),
        _ => null,
      };
      if (durationMs == null || durationMs <= 0) {
        return null;
      }
      return SheetAudioTrackInfo(duration: Duration(milliseconds: durationMs));
    } on MissingPluginException {
      return null;
    } on PlatformException {
      return null;
    }
  }

  static int? _positiveInt(Object? value) {
    final parsed = switch (value) {
      int number => number,
      double number => number.round(),
      _ => null,
    };
    return parsed != null && parsed > 0 ? parsed : null;
  }

  static int? _positiveOrZeroInt(Object? value) {
    final parsed = switch (value) {
      int number => number,
      double number => number.round(),
      _ => null,
    };
    return parsed != null && parsed >= 0 ? parsed : null;
  }

  Future<SheetAudioPlaybackResult> play(
    String path, {
    SheetAudioLoop? loop,
  }) async {
    try {
      final arguments = <String, Object?>{
        'path': path.trim(),
        if (loop != null) ...loop.toChannelArguments(),
      };
      await _channel.invokeMethod<void>('play', arguments);
      return SheetAudioPlaybackResult.playing;
    } on MissingPluginException {
      return SheetAudioPlaybackResult.unsupportedPlatform;
    } on PlatformException catch (error) {
      return SheetAudioPlaybackResult.failed(error.message ?? error.code);
    }
  }

  Future<void> stop() async {
    try {
      await _channel.invokeMethod<void>('stop');
    } on MissingPluginException {
      return;
    } on PlatformException {
      return;
    }
  }
}

class SheetAudioTrackInfo {
  const SheetAudioTrackInfo({required this.duration});

  final Duration duration;
}

class SheetAudioPlaybackPosition {
  const SheetAudioPlaybackPosition({
    required this.position,
    required this.duration,
    required this.isPlaying,
  });

  final Duration position;
  final Duration duration;
  final bool isPlaying;
}

class SheetAudioLoop {
  SheetAudioLoop({required this.start, required this.end})
    : assert(end > start);

  final Duration start;
  final Duration end;

  Map<String, Object?> toChannelArguments() {
    return <String, Object?>{
      'loopStartMs': start.inMilliseconds,
      'loopEndMs': end.inMilliseconds,
    };
  }
}

class SheetAudioPlaybackResult {
  const SheetAudioPlaybackResult._({required this.status, this.message = ''});

  static const playing = SheetAudioPlaybackResult._(
    status: SheetAudioPlaybackStatus.playing,
  );
  static const unsupportedPlatform = SheetAudioPlaybackResult._(
    status: SheetAudioPlaybackStatus.unsupportedPlatform,
  );

  factory SheetAudioPlaybackResult.failed(String message) {
    return SheetAudioPlaybackResult._(
      status: SheetAudioPlaybackStatus.failed,
      message: message,
    );
  }

  final SheetAudioPlaybackStatus status;
  final String message;

  bool get isPlaying => status == SheetAudioPlaybackStatus.playing;
}

enum SheetAudioPlaybackStatus { playing, unsupportedPlatform, failed }
