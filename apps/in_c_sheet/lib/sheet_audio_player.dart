import 'package:flutter/services.dart';

class SheetAudioPlayer {
  SheetAudioPlayer({MethodChannel? channel})
    : _channel = channel ?? const MethodChannel('clef/audio_player');

  final MethodChannel _channel;

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
