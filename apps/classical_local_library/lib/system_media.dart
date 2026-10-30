import 'dart:async';
import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:flutter/services.dart';

import 'local_playback.dart';

enum SystemMediaAction { play, pause, toggle, next, previous, seek, stop }

class SystemMediaCommand {
  const SystemMediaCommand(
    this.action,
    this.id,
    this.generation, {
    this.position,
  });
  final SystemMediaAction action;
  final String id;
  final int generation;
  final Duration? position;
}

class SystemMediaSnapshot {
  const SystemMediaSnapshot({
    required this.id,
    required this.generation,
    required this.title,
    required this.position,
    required this.rate,
    required this.index,
    required this.count,
    required this.actions,
    this.artist,
    this.album,
    this.duration,
  });
  final String id;
  final int generation;
  final String title;
  final String? artist;
  final String? album;
  final Duration position;
  final Duration? duration;
  final double rate;
  final int index;
  final int count;
  final Set<SystemMediaAction> actions;

  Map<String, Object> toMap() => {
    'id': id,
    'generation': generation,
    'title': title,
    'artist': ?artist,
    'album': ?album,
    'positionMillis': position.inMilliseconds,
    if (duration != null) 'durationMillis': duration!.inMilliseconds,
    'rate': rate,
    'index': index,
    'count': count,
    'actions': actions.map((action) => action.name).toList(),
  };
}

abstract interface class SystemMediaSession {
  void setCommandHandler(Future<void> Function(SystemMediaCommand)? handler);
  Future<void> publish(SystemMediaSnapshot? snapshot);
  Future<void> dispose();
}

class IOSSystemMediaSession implements SystemMediaSession {
  IOSSystemMediaSession({MethodChannel? channel})
    : channel = channel ?? const MethodChannel('app.ddirori.play/system_media');

  final MethodChannel channel;

  @override
  void setCommandHandler(Future<void> Function(SystemMediaCommand)? handler) {
    channel.setMethodCallHandler(
      handler == null
          ? null
          : (call) async {
              if (call.method != 'command' || call.arguments is! Map) {
                return false;
              }
              final args = call.arguments as Map;
              final name = args['action'];
              final id = args['id'];
              final generation = args['generation'];
              if (name is! String || id is! String || generation is! int) {
                return false;
              }
              final matches = SystemMediaAction.values.where(
                (action) => action.name == name,
              );
              if (matches.isEmpty) return false;
              final milliseconds = args['positionMillis'];
              if (matches.first == SystemMediaAction.seek &&
                  (milliseconds is! int || milliseconds < 0)) {
                return false;
              }
              await handler(
                SystemMediaCommand(
                  matches.first,
                  id,
                  generation,
                  position: milliseconds is int
                      ? Duration(milliseconds: milliseconds)
                      : null,
                ),
              );
              return true;
            },
    );
  }

  @override
  Future<void> publish(SystemMediaSnapshot? snapshot) =>
      channel.invokeMethod<void>('publish', snapshot?.toMap());

  @override
  Future<void> dispose() async {
    channel.setMethodCallHandler(null);
    await channel.invokeMethod<void>('clear');
  }
}

/// Publishes engine observations and routes remote requests through the same
/// serialized controller used by the app. It never owns a second audio player.
class PlaybackSystemMediaCoordinator {
  PlaybackSystemMediaCoordinator({
    required this.controller,
    required this.session,
  }) {
    session.setCommandHandler(handleCommand);
    _states = controller.states.listen((_) => _observe());
    _availability = controller.commandAvailability.listen((_) {
      _generation += 1;
      _observe();
    });
    _observe();
  }

  final SerializedLocalPlaybackController controller;
  final SystemMediaSession session;
  late final StreamSubscription<LocalPlaybackState> _states;
  late final StreamSubscription<bool> _availability;
  SystemMediaSnapshot? snapshot;
  List<LocalPlaybackQueueItem>? _queue;
  int? _index;
  int _generation = 0;
  bool _disposed = false;
  bool hasPublishFailure = false;
  bool _pending = false;
  Future<void>? _writing;

  void _observe() {
    if (_disposed) return;
    final state = controller.playbackState;
    if (!identical(_queue, state.queue) || _index != state.currentIndex) {
      _generation += 1;
      _queue = state.queue;
      _index = state.currentIndex;
    }
    if (!state.hasQueue ||
        state.failure != null ||
        state.playerState == LocalPlayerState.stopped ||
        state.playerState == LocalPlayerState.idle) {
      if (snapshot != null) _generation += 1;
      snapshot = null;
    } else {
      final completed = state.playerState == LocalPlayerState.completed;
      final item = completed ? state.queue.last : state.currentItem;
      if (item == null) {
        snapshot = null;
      } else {
        final playing = state.playerState == LocalPlayerState.playing;
        final usable = !state.isBusy && !controller.diagnosticActive;
        final duration = state.duration;
        final actions = <SystemMediaAction>{
          if (usable) ...{
            playing ? SystemMediaAction.pause : SystemMediaAction.play,
            SystemMediaAction.toggle,
            SystemMediaAction.previous,
            SystemMediaAction.stop,
            if (!completed) SystemMediaAction.next,
            if (!completed && duration != null && duration > Duration.zero)
              SystemMediaAction.seek,
          },
        };
        final title = item.isDirectFile || item.workTitle.isEmpty
            ? item.displayTitle
            : '${item.workTitle} · ${item.displayTitle}';
        snapshot = SystemMediaSnapshot(
          id: sha256.convert(utf8.encode(item.trackId)).toString(),
          generation: _generation,
          title: title,
          artist: _text(item.artist),
          album: _text(item.album),
          position: state.isSeeking
              ? snapshot?.position ?? Duration.zero
              : state.normalizedPosition,
          duration: duration,
          rate:
              playing &&
                  state.processingState == LocalPlaybackProcessingState.ready
              ? 1
              : 0,
          index: completed ? state.queue.length - 1 : state.currentIndex,
          count: state.queue.length,
          actions: actions,
        );
      }
    }
    _pending = true;
    _writing ??= _publish();
  }

  static String? _text(String? value) =>
      value == null || value.trim().isEmpty ? null : value.trim();

  Future<void> _publish() async {
    // Yield once so _writing is assigned even if a fake fails synchronously.
    await Future<void>.value();
    try {
      while (_pending && !_disposed) {
        _pending = false;
        final value = snapshot;
        try {
          await session.publish(value);
          hasPublishFailure = false;
        } on Object {
          hasPublishFailure = true;
        }
      }
    } finally {
      _writing = null;
    }
  }

  Future<void> flush() async {
    while (_writing != null) {
      await _writing;
    }
  }

  Future<void> handleCommand(SystemMediaCommand command) async {
    final current = snapshot;
    if (_disposed ||
        controller.diagnosticActive ||
        current == null ||
        current.id != command.id ||
        current.generation != command.generation ||
        !current.actions.contains(command.action)) {
      return;
    }
    final state = controller.playbackState;
    await controller.dispatchForSelection(state.queue, state.currentIndex, (
      player,
    ) async {
      switch (command.action) {
        case SystemMediaAction.play:
          await player.play();
        case SystemMediaAction.pause:
          await player.pause();
        case SystemMediaAction.toggle:
          if (player.playbackState.playerState == LocalPlayerState.playing) {
            await player.pause();
          } else {
            await player.play();
          }
        case SystemMediaAction.next:
          await player.next();
        case SystemMediaAction.previous:
          await player.previous();
        case SystemMediaAction.seek:
          if (command.position != null && !command.position!.isNegative) {
            await player.seek(command.position!);
          }
        case SystemMediaAction.stop:
          await player.stop();
      }
    });
  }

  Future<void> dispose() async {
    if (_disposed) return;
    _disposed = true;
    session.setCommandHandler(null);
    await _states.cancel();
    await _availability.cancel();
    await flush();
    try {
      await session.dispose();
    } on Object {
      hasPublishFailure = true;
    }
    snapshot = null;
  }
}
