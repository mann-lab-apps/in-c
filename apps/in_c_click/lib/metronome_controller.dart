import 'dart:async';

import 'package:flutter/foundation.dart';

import 'metronome_audio.dart';

@immutable
class MetronomeState {
  const MetronomeState({
    required this.bpm,
    required this.meter,
    required this.accentFirstBeat,
  });

  static const int minBpm = 30;
  static const int maxBpm = 240;

  final int bpm;
  final int meter;
  final bool accentFirstBeat;

  MetronomeState copyWith({
    int? bpm,
    int? meter,
    bool? accentFirstBeat,
  }) {
    return MetronomeState(
      bpm: clampBpm(bpm ?? this.bpm),
      meter: normalizeMeter(meter ?? this.meter),
      accentFirstBeat: accentFirstBeat ?? this.accentFirstBeat,
    );
  }

  static int clampBpm(int bpm) => bpm.clamp(minBpm, maxBpm).toInt();

  static int normalizeMeter(int meter) {
    return switch (meter) {
      2 || 3 || 4 || 6 => meter,
      _ => 4,
    };
  }
}

class MetronomeController extends ChangeNotifier {
  MetronomeController({
    required MetronomeAudio audio,
    required Future<void> Function(MetronomeState state) saveState,
    MetronomeState initialState = const MetronomeState(
      bpm: 96,
      meter: 4,
      accentFirstBeat: true,
    ),
  })  : _audio = audio,
        _saveState = saveState,
        _state = initialState;

  final MetronomeAudio _audio;
  final Future<void> Function(MetronomeState state) _saveState;
  final Stopwatch _stopwatch = Stopwatch();
  final Stopwatch _playbackClock = Stopwatch();
  final List<int> _tapTimes = [];

  Timer? _timer;
  Timer? _audioRestartTimer;
  int _audioLoopRequestId = 0;
  MetronomeState _state;
  bool _isPlaying = false;
  int _currentBeat = 0;
  int _visibleBeat = 0;

  MetronomeState get state => _state;
  bool get isPlaying => _isPlaying;
  int get visibleBeat => _visibleBeat;

  void setBpm(int bpm) {
    _state = _state.copyWith(bpm: bpm);
    _persist();

    if (_isPlaying) {
      _restartAudioSoon();
    }

    notifyListeners();
  }

  void stepBpm(int delta) {
    setBpm(_state.bpm + delta);
  }

  void setMeter(int meter) {
    _state = _state.copyWith(meter: meter);
    _currentBeat = 0;
    _visibleBeat = 0;
    _persist();
    if (_isPlaying) {
      unawaited(_restartPlaybackFromBeatOne());
    }
    notifyListeners();
  }

  void setAccentFirstBeat(bool value) {
    _state = _state.copyWith(accentFirstBeat: value);
    _persist();
    if (_isPlaying) {
      unawaited(_restartPlaybackFromBeatOne());
    }
    notifyListeners();
  }

  void tapTempo() {
    if (!_stopwatch.isRunning) {
      _stopwatch.start();
    }

    final now = _stopwatch.elapsedMilliseconds;
    _tapTimes
      ..removeWhere((time) => now - time > 2500)
      ..add(now);

    if (_tapTimes.length >= 2) {
      final intervals = <int>[];
      for (var index = 1; index < _tapTimes.length; index += 1) {
        intervals.add(_tapTimes[index] - _tapTimes[index - 1]);
      }

      final average = intervals.reduce((a, b) => a + b) / intervals.length;
      setBpm((60000 / average).round());
    } else {
      _showBeat();
    }
  }

  Future<void> toggle() async {
    if (_isPlaying) {
      stop();
      return;
    }

    await start();
  }

  Future<void> start() async {
    if (_isPlaying) {
      return;
    }

    _isPlaying = true;
    _currentBeat = 0;
    _visibleBeat = 0;
    _showBeat();
    await _restartPlaybackFromBeatOne();
  }

  void stop() {
    _audioLoopRequestId += 1;
    _timer?.cancel();
    _timer = null;
    _playbackClock
      ..stop()
      ..reset();
    _audioRestartTimer?.cancel();
    _audioRestartTimer = null;
    unawaited(_audio.stopLoop());
    _isPlaying = false;
    _currentBeat = 0;
    _visibleBeat = 0;
    notifyListeners();
  }

  void _restartTimer() {
    _timer?.cancel();

    if (!_isPlaying) {
      return;
    }

    final refreshMs = (_interval.inMilliseconds ~/ 4).clamp(16, 50).toInt();
    _timer = Timer.periodic(Duration(milliseconds: refreshMs), (_) {
      _syncVisibleBeatToClock();
    });
  }

  Duration get _interval {
    return Duration(milliseconds: (60000 / _state.bpm).round());
  }

  void _syncVisibleBeatToClock() {
    if (!_playbackClock.isRunning) {
      return;
    }

    final beat =
        (_playbackClock.elapsedMicroseconds ~/ _interval.inMicroseconds) %
            _state.meter;
    if (beat == _currentBeat && beat == _visibleBeat) {
      return;
    }

    _currentBeat = beat;
    _visibleBeat = beat;
    notifyListeners();
  }

  void _restartAudioSoon() {
    _timer?.cancel();
    _timer = null;
    _audioRestartTimer?.cancel();
    _audioRestartTimer = Timer(const Duration(milliseconds: 90), () {
      if (_isPlaying) {
        unawaited(_restartPlaybackFromBeatOne());
      }
    });
  }

  Future<void> _restartPlaybackFromBeatOne() async {
    final requestId = ++_audioLoopRequestId;
    _timer?.cancel();
    _timer = null;
    _audioRestartTimer?.cancel();
    _audioRestartTimer = null;

    _currentBeat = 0;
    _visibleBeat = 0;
    _showBeat();

    final started = await _playAudioLoop(requestId);
    if (!_isPlaying || requestId != _audioLoopRequestId || !started) {
      return;
    }

    _currentBeat = 0;
    _visibleBeat = 0;
    _playbackClock
      ..reset()
      ..start();
    _showBeat();
    _restartTimer();
  }

  Future<bool> _playAudioLoop(int requestId) async {
    try {
      await _audio.playLoop(
        bpm: _state.bpm,
        meter: _state.meter,
        accentFirstBeat: _state.accentFirstBeat,
      );
      return _isPlaying && requestId == _audioLoopRequestId;
    } catch (error, stack) {
      FlutterError.reportError(
        FlutterErrorDetails(
          exception: error,
          stack: stack,
          library: 'in_c_click.metronome',
          context: ErrorDescription('while starting the metronome loop'),
        ),
      );
      return false;
    }
  }

  void _showBeat() {
    _visibleBeat = _currentBeat;
    notifyListeners();
  }

  void _persist() {
    unawaited(_saveState(_state));
  }

  @override
  void dispose() {
    _timer?.cancel();
    _audioRestartTimer?.cancel();
    _playbackClock.stop();
    _audio.dispose();
    super.dispose();
  }
}
