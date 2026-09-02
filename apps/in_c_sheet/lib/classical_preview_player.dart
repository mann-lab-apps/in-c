import 'package:flutter/services.dart';

class ClassicalPreviewPlayer {
  ClassicalPreviewPlayer({MethodChannel? channel})
    : _channel = channel ?? const MethodChannel('in_c/classical_preview');

  final MethodChannel _channel;

  Future<ClassicalPreviewPlaybackResult> playUrl(String previewUrl) async {
    final trimmed = previewUrl.trim();
    final uri = Uri.tryParse(trimmed);
    if (uri == null || !uri.hasScheme) {
      return ClassicalPreviewPlaybackResult.failed('Invalid preview URL.');
    }
    try {
      await _channel.invokeMethod<void>('playUrl', <String, Object?>{
        'url': trimmed,
      });
      return ClassicalPreviewPlaybackResult.playing;
    } on MissingPluginException {
      return ClassicalPreviewPlaybackResult.unsupportedPlatform;
    } on PlatformException catch (error) {
      return ClassicalPreviewPlaybackResult.failed(error.message ?? error.code);
    }
  }

  Future<void> pause() async {
    try {
      await _channel.invokeMethod<void>('pause');
    } on MissingPluginException {
      return;
    } on PlatformException {
      return;
    }
  }
}

class ClassicalPreviewPlaybackResult {
  const ClassicalPreviewPlaybackResult._({
    required this.status,
    this.message = '',
  });

  static const playing = ClassicalPreviewPlaybackResult._(
    status: ClassicalPreviewPlaybackStatus.playing,
  );
  static const unsupportedPlatform = ClassicalPreviewPlaybackResult._(
    status: ClassicalPreviewPlaybackStatus.unsupportedPlatform,
  );

  factory ClassicalPreviewPlaybackResult.failed(String message) {
    return ClassicalPreviewPlaybackResult._(
      status: ClassicalPreviewPlaybackStatus.failed,
      message: message,
    );
  }

  final ClassicalPreviewPlaybackStatus status;
  final String message;

  bool get isPlaying => status == ClassicalPreviewPlaybackStatus.playing;
}

enum ClassicalPreviewPlaybackStatus { playing, unsupportedPlatform, failed }
