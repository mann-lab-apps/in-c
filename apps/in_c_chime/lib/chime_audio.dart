import 'dart:async';
import 'dart:math';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';

import 'tone_model.dart';

const int _sampleRate = 44100;
const int _droneLoopSeconds = 24;

class ChimeAudio {
  ChimeAudio() {
    unawaited(_dronePlayer.setReleaseMode(ReleaseMode.loop));
    unawaited(_chimePlayer.setPlayerMode(PlayerMode.lowLatency));
    unawaited(_chimePlayer.setReleaseMode(ReleaseMode.stop));
  }

  final AudioPlayer _dronePlayer = AudioPlayer(playerId: 'chime-drone');
  final AudioPlayer _chimePlayer = AudioPlayer(playerId: 'chime-hit');

  int _requestId = 0;
  _ToneKey? _cachedDroneKey;
  Uint8List? _cachedDroneBytes;

  Future<void> playChime({
    required double frequency,
    required ToneColor toneColor,
    required double volume,
  }) {
    final source = BytesSource(
      _buildToneWav(
        frequency: frequency,
        toneColor: toneColor,
        seconds: 1.6,
        mode: _ToneMode.chime,
      ),
      mimeType: 'audio/wav',
    );
    return _chimePlayer.play(source, volume: volume.clamp(0.0, 1.0));
  }

  Future<void> startDrone({
    required double frequency,
    required ToneColor toneColor,
    required double volume,
  }) async {
    final requestId = ++_requestId;
    final key = _ToneKey(frequency: frequency, toneColor: toneColor);
    final bytes = await _droneBytesFor(key);

    if (requestId != _requestId) {
      return;
    }

    final source = BytesSource(bytes, mimeType: 'audio/wav');
    await _dronePlayer.stop();
    if (requestId != _requestId) {
      return;
    }
    await _dronePlayer.play(source, volume: volume.clamp(0.0, 1.0));
  }

  Future<void> setDroneVolume(double volume) {
    return _dronePlayer.setVolume(volume.clamp(0.0, 1.0));
  }

  Future<void> stopDrone() async {
    _requestId += 1;
    await _dronePlayer.stop();
  }

  void dispose() {
    unawaited(_dronePlayer.dispose());
    unawaited(_chimePlayer.dispose());
  }

  Future<Uint8List> _droneBytesFor(_ToneKey key) async {
    if (_cachedDroneKey == key && _cachedDroneBytes != null) {
      return _cachedDroneBytes!;
    }

    final bytes = await compute(_buildDroneFromMessage, key.toMap());
    _cachedDroneKey = key;
    _cachedDroneBytes = bytes;
    return bytes;
  }
}

@immutable
class _ToneKey {
  const _ToneKey({
    required this.frequency,
    required this.toneColor,
  });

  final double frequency;
  final ToneColor toneColor;

  Map<String, Object> toMap() {
    return {
      'frequency': frequency,
      'toneColor': toneColor.index,
    };
  }

  @override
  bool operator ==(Object other) {
    return other is _ToneKey &&
        other.frequency == frequency &&
        other.toneColor == toneColor;
  }

  @override
  int get hashCode => Object.hash(frequency, toneColor);
}

Uint8List _buildDroneFromMessage(Map<String, Object> message) {
  return _buildToneWav(
    frequency: message['frequency']! as double,
    toneColor: ToneColor.values[message['toneColor']! as int],
    seconds: _droneLoopSeconds.toDouble(),
    mode: _ToneMode.drone,
  );
}

enum _ToneMode { chime, drone }

Uint8List _buildToneWav({
  required double frequency,
  required ToneColor toneColor,
  required double seconds,
  required _ToneMode mode,
}) {
  final sampleCount = (_sampleRate * seconds).round();
  final dataLength = sampleCount * 2;
  final bytes = ByteData(44 + dataLength);
  _writeWavHeader(bytes, dataLength: dataLength, sampleRate: _sampleRate);

  var phase = 0.0;
  var shimmerPhase = 0.0;

  for (var index = 0; index < sampleCount; index += 1) {
    final t = index / _sampleRate;
    final envelope = mode == _ToneMode.chime
        ? _chimeEnvelope(t, seconds)
        : _droneEnvelope(t, seconds);
    final sample = _toneSample(
      phase: phase,
      shimmerPhase: shimmerPhase,
      toneColor: toneColor,
      mode: mode,
    );

    bytes.setInt16(
      44 + (index * 2),
      (sample * envelope * 32767).round().clamp(-32768, 32767).toInt(),
      Endian.little,
    );

    phase += 2 * pi * frequency / _sampleRate;
    shimmerPhase += 2 * pi * (frequency * 2.01) / _sampleRate;
    if (phase > 2 * pi) {
      phase -= 2 * pi;
    }
    if (shimmerPhase > 2 * pi) {
      shimmerPhase -= 2 * pi;
    }
  }

  return bytes.buffer.asUint8List();
}

double _toneSample({
  required double phase,
  required double shimmerPhase,
  required ToneColor toneColor,
  required _ToneMode mode,
}) {
  final fundamental = sin(phase);

  return switch (toneColor) {
    ToneColor.pure => fundamental * 0.78,
    ToneColor.warm =>
      (fundamental * 0.66) + (sin(phase * 2) * 0.16) + (sin(phase * 3) * 0.05),
    ToneColor.bright => mode == _ToneMode.chime
        ? (fundamental * 0.55) +
            (sin(phase * 2) * 0.2) +
            (sin(phase * 4) * 0.09) +
            (sin(shimmerPhase) * 0.05)
        : (fundamental * 0.62) + (sin(phase * 2) * 0.18),
  };
}

double _chimeEnvelope(double t, double seconds) {
  final attack = min(1.0, t / 0.025);
  final decay = exp(-t / 0.68);
  final releaseStart = seconds - 0.18;
  final release = t < releaseStart ? 1.0 : max(0.0, (seconds - t) / 0.18);
  return attack * decay * release * 0.92;
}

double _droneEnvelope(double t, double seconds) {
  const fadeSeconds = 0.08;
  final fadeIn = min(1.0, t / fadeSeconds);
  final fadeOut = min(1.0, (seconds - t) / fadeSeconds);
  return min(fadeIn, fadeOut) * 0.62;
}

void _writeWavHeader(
  ByteData bytes, {
  required int dataLength,
  required int sampleRate,
}) {
  var offset = 0;

  void writeAscii(String value) {
    for (final unit in value.codeUnits) {
      bytes.setUint8(offset, unit);
      offset += 1;
    }
  }

  void writeUint16(int value) {
    bytes.setUint16(offset, value, Endian.little);
    offset += 2;
  }

  void writeUint32(int value) {
    bytes.setUint32(offset, value, Endian.little);
    offset += 4;
  }

  writeAscii('RIFF');
  writeUint32(36 + dataLength);
  writeAscii('WAVE');
  writeAscii('fmt ');
  writeUint32(16);
  writeUint16(1);
  writeUint16(1);
  writeUint32(sampleRate);
  writeUint32(sampleRate * 2);
  writeUint16(2);
  writeUint16(16);
  writeAscii('data');
  writeUint32(dataLength);
}
