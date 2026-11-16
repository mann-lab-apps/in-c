import 'package:audio_service/audio_service.dart';

import 'system_media.dart';

/// Android owns a notification/media session, never an audio player or queue.
class AndroidSystemMediaSession implements SystemMediaSession {
  AndroidSystemMediaSession({
    Future<PlayAndroidAudioHandler> Function()? initialize,
  }) {
    _ready =
        (initialize?.call() ??
                (_shared ??= AudioService.init(
                  builder: PlayAndroidAudioHandler.new,
                  config: const AudioServiceConfig(
                    androidNotificationChannelId:
                        'app.inc.classical_local_library.playback',
                    androidNotificationChannelName: '음악 재생',
                    androidNotificationOngoing: false,
                    androidStopForegroundOnPause: true,
                    androidResumeOnClick: false,
                  ),
                )))
            .then((handler) {
              if (!_disposed) handler.owner = this;
              return handler;
            });
  }
  static Future<PlayAndroidAudioHandler>? _shared;
  late final Future<PlayAndroidAudioHandler> _ready;
  Future<void> Function(SystemMediaCommand)? _commands;
  SystemMediaSnapshot? _snapshot;
  bool _disposed = false;
  @override
  void setCommandHandler(Future<void> Function(SystemMediaCommand)? handler) =>
      _commands = handler;
  @override
  Future<void> publish(SystemMediaSnapshot? snapshot) async {
    final handler = await _ready;
    if (_disposed || !identical(handler.owner, this)) return;
    _snapshot = snapshot;
    handler.observe(snapshot);
  }

  Future<void> _send(SystemMediaAction action, {Duration? position}) async {
    final current = _snapshot, commands = _commands;
    if (_disposed ||
        current == null ||
        commands == null ||
        !current.actions.contains(action)) {
      return;
    }
    await commands(
      SystemMediaCommand(
        action,
        current.id,
        current.generation,
        position: position,
      ),
    );
  }

  @override
  Future<void> dispose() async {
    if (_disposed) return;
    _disposed = true;
    _commands = null;
    _snapshot = null;
    final handler = await _ready;
    if (identical(handler.owner, this)) {
      handler.observe(null);
      handler.owner = null;
    }
  }
}

class PlayAndroidAudioHandler extends BaseAudioHandler {
  AndroidSystemMediaSession? owner;
  void observe(SystemMediaSnapshot? value) {
    if (value == null) {
      mediaItem.add(null);
      playbackState.add(
        PlaybackState(
          processingState: AudioProcessingState.idle,
          playing: false,
        ),
      );
      return;
    }
    final item = MediaItem(
      id: value.id,
      title: value.title,
      artist: value.artist,
      album: value.album,
      duration: value.duration,
    );
    // MediaItem equality compares only ID; duration can arrive after loading.
    final previous = mediaItem.value;
    if (previous == null ||
        previous.id != item.id ||
        previous.title != item.title ||
        previous.artist != item.artist ||
        previous.album != item.album ||
        previous.duration != item.duration) {
      mediaItem.add(item);
    }
    final controls = <MediaControl>[
      if (value.actions.contains(SystemMediaAction.previous))
        MediaControl.skipToPrevious,
      if (value.actions.contains(SystemMediaAction.pause)) MediaControl.pause,
      if (value.actions.contains(SystemMediaAction.play)) MediaControl.play,
      if (value.actions.contains(SystemMediaAction.next))
        MediaControl.skipToNext,
      if (value.actions.contains(SystemMediaAction.stop)) MediaControl.stop,
    ];
    playbackState.add(
      PlaybackState(
        controls: controls,
        androidCompactActionIndices: List.generate(
          controls.length.clamp(0, 3),
          (i) => i,
        ),
        systemActions: {
          if (value.actions.contains(SystemMediaAction.seek)) MediaAction.seek,
        },
        processingState: value.completed
            ? AudioProcessingState.completed
            : value.busy
            ? AudioProcessingState.buffering
            : AudioProcessingState.ready,
        playing: value.playing,
        updatePosition: value.position,
        speed: value.rate,
      ),
    );
  }

  @override
  Future<void> play() async => owner?._send(SystemMediaAction.play);
  @override
  Future<void> pause() async => owner?._send(SystemMediaAction.pause);
  @override
  Future<void> skipToNext() async => owner?._send(SystemMediaAction.next);
  @override
  Future<void> skipToPrevious() async =>
      owner?._send(SystemMediaAction.previous);
  @override
  Future<void> seek(Duration position) async =>
      owner?._send(SystemMediaAction.seek, position: position);
  @override
  Future<void> stop() async => owner?._send(SystemMediaAction.stop);
  @override
  Future<void> onNotificationDeleted() => stop();
}
