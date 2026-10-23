import 'dart:async';

enum LocalAudioInterruptionType { pause, duck, unknown }

class LocalAudioInterruptionEvent {
  const LocalAudioInterruptionEvent({
    required this.isBeginning,
    required this.type,
  });

  final bool isBeginning;
  final LocalAudioInterruptionType type;
}

abstract class LocalPlaybackAudioSession {
  Stream<LocalAudioInterruptionEvent> get interruptionEvents;

  Stream<void> get becomingNoisyEvents;

  Future<void> configure();

  Future<void> dispose();
}

class LocalPlaybackInterruptionPolicy {
  const LocalPlaybackInterruptionPolicy();

  bool shouldPauseForInterruption(LocalAudioInterruptionEvent event) {
    return event.isBeginning;
  }

  bool shouldResumeAfterInterruption(LocalAudioInterruptionEvent event) {
    return false;
  }

  bool shouldPauseWhenBecomingNoisy() => true;
}

class MemoryLocalPlaybackAudioSession implements LocalPlaybackAudioSession {
  final StreamController<LocalAudioInterruptionEvent> _interruptions =
      StreamController<LocalAudioInterruptionEvent>.broadcast(sync: true);
  final StreamController<void> _becomingNoisy =
      StreamController<void>.broadcast(sync: true);
  bool isConfigured = false;
  bool _isDisposed = false;

  @override
  Stream<LocalAudioInterruptionEvent> get interruptionEvents =>
      _interruptions.stream;

  @override
  Stream<void> get becomingNoisyEvents => _becomingNoisy.stream;

  @override
  Future<void> configure() async {
    isConfigured = true;
  }

  void emitInterruption(LocalAudioInterruptionEvent event) {
    if (!_isDisposed) {
      _interruptions.add(event);
    }
  }

  void emitBecomingNoisy() {
    if (!_isDisposed) {
      _becomingNoisy.add(null);
    }
  }

  @override
  Future<void> dispose() async {
    if (_isDisposed) {
      return;
    }
    _isDisposed = true;
    await _interruptions.close();
    await _becomingNoisy.close();
  }
}
