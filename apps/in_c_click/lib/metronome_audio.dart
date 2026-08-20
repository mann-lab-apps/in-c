import 'dart:async';
import 'dart:math';
import 'dart:typed_data';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';

const int _sampleRate = 44100;
const int _minimumLoopSeconds = 48;

class MetronomeAudio {
  MetronomeAudio() {
    unawaited(_loopPlayer.setReleaseMode(ReleaseMode.loop));
    unawaited(_previewPlayer.setPlayerMode(PlayerMode.lowLatency));
    unawaited(_previewPlayer.setReleaseMode(ReleaseMode.stop));
  }

  final AudioPlayer _loopPlayer = AudioPlayer(playerId: 'metronome-loop');
  final AudioPlayer _previewPlayer = AudioPlayer(playerId: 'metronome-preview');

  int _loopRequestId = 0;
  _LoopKey? _cachedLoopKey;
  Uint8List? _cachedLoopBytes;

  late final BytesSource _previewAccentSource = BytesSource(
    _buildClickWav(frequency: 1320, durationMs: 44),
    mimeType: 'audio/wav',
  );

  late final BytesSource _previewBeatSource = BytesSource(
    _buildClickWav(frequency: 880, durationMs: 38),
    mimeType: 'audio/wav',
  );

  Future<void> playLoop({
    required int bpm,
    required int meter,
    required bool accentFirstBeat,
  }) async {
    final requestId = ++_loopRequestId;
    final key = _LoopKey(
      bpm: bpm,
      meter: meter,
      accentFirstBeat: accentFirstBeat,
    );
    final bytes = await _loopBytesFor(key);

    if (requestId != _loopRequestId) {
      return;
    }

    final source = BytesSource(
      bytes,
      mimeType: 'audio/wav',
    );

    await _loopPlayer.stop();
    if (requestId != _loopRequestId) {
      return;
    }

    await _loopPlayer.play(source, volume: 0.82);
  }

  Future<void> stopLoop() async {
    _loopRequestId += 1;
    await _loopPlayer.stop();
  }

  Future<void> click({required bool accent}) {
    return _previewPlayer.play(
      accent ? _previewAccentSource : _previewBeatSource,
      volume: accent ? 0.72 : 0.52,
    );
  }

  void dispose() {
    unawaited(_loopPlayer.dispose());
    unawaited(_previewPlayer.dispose());
  }

  Future<Uint8List> _loopBytesFor(_LoopKey key) async {
    if (_cachedLoopKey == key && _cachedLoopBytes != null) {
      return _cachedLoopBytes!;
    }

    final bytes = await compute(_buildMetronomeLoopWavFromMessage, key.toMap());
    _cachedLoopKey = key;
    _cachedLoopBytes = bytes;
    return bytes;
  }
}

@immutable
class _LoopKey {
  const _LoopKey({
    required this.bpm,
    required this.meter,
    required this.accentFirstBeat,
  });

  final int bpm;
  final int meter;
  final bool accentFirstBeat;

  Map<String, Object> toMap() {
    return {
      'bpm': bpm,
      'meter': meter,
      'accentFirstBeat': accentFirstBeat,
    };
  }

  @override
  bool operator ==(Object other) {
    return other is _LoopKey &&
        other.bpm == bpm &&
        other.meter == meter &&
        other.accentFirstBeat == accentFirstBeat;
  }

  @override
  int get hashCode => Object.hash(bpm, meter, accentFirstBeat);
}

Uint8List _buildMetronomeLoopWavFromMessage(Map<String, Object> message) {
  return _buildMetronomeLoopWav(
    bpm: message['bpm']! as int,
    meter: message['meter']! as int,
    accentFirstBeat: message['accentFirstBeat']! as bool,
  );
}

Uint8List _buildMetronomeLoopWav({
  required int bpm,
  required int meter,
  required bool accentFirstBeat,
}) {
  final beatSamples = (_sampleRate * 60 / bpm).round();
  final measureSamples = beatSamples * meter;
  final measures = max(
    1,
    (_minimumLoopSeconds * _sampleRate / measureSamples).ceil(),
  );
  final totalSamples = measureSamples * measures;
  final dataLength = totalSamples * 2;
  final bytes = ByteData(44 + dataLength);

  _writeWavHeader(bytes, dataLength: dataLength, sampleRate: _sampleRate);

  final accentClick = _buildClickSamples(
    frequency: 1320,
    durationMs: 44,
    gain: 0.78,
  );
  final beatClick = _buildClickSamples(
    frequency: 880,
    durationMs: 38,
    gain: 0.58,
  );

  for (var measure = 0; measure < measures; measure += 1) {
    final measureStart = measure * measureSamples;
    for (var beat = 0; beat < meter; beat += 1) {
      final sampleOffset = measureStart + (beat * beatSamples);
      final click = accentFirstBeat && beat == 0 ? accentClick : beatClick;
      _mixClick(bytes, click, sampleOffset: sampleOffset);
    }
  }

  return bytes.buffer.asUint8List();
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

Int16List _buildClickSamples({
  required double frequency,
  required int durationMs,
  required double gain,
}) {
  final sampleCount = (_sampleRate * durationMs / 1000).round();
  final samples = Int16List(sampleCount);

  for (var index = 0; index < sampleCount; index += 1) {
    final t = index / _sampleRate;
    final envelope = exp(-index / (_sampleRate * 0.010));
    final sample = sin(2 * pi * frequency * t) * envelope * gain;
    samples[index] = (sample * 32767).round().clamp(-32768, 32767).toInt();
  }

  return samples;
}

void _mixClick(
  ByteData bytes,
  Int16List click, {
  required int sampleOffset,
}) {
  for (var index = 0; index < click.length; index += 1) {
    final sampleIndex = sampleOffset + index;
    final byteOffset = 44 + (sampleIndex * 2);
    if (byteOffset + 1 >= bytes.lengthInBytes) {
      return;
    }

    final existing = bytes.getInt16(byteOffset, Endian.little);
    final mixed = (existing + click[index]).clamp(-32768, 32767).toInt();
    bytes.setInt16(byteOffset, mixed, Endian.little);
  }
}

Uint8List _buildClickWav({
  required double frequency,
  required int durationMs,
}) {
  final samples = _buildClickSamples(
    frequency: frequency,
    durationMs: durationMs,
    gain: 0.82,
  );
  final dataLength = samples.length * 2;
  final bytes = ByteData(44 + dataLength);

  _writeWavHeader(bytes, dataLength: dataLength, sampleRate: _sampleRate);
  for (var index = 0; index < samples.length; index += 1) {
    bytes.setInt16(44 + (index * 2), samples[index], Endian.little);
  }

  return bytes.buffer.asUint8List();
}
