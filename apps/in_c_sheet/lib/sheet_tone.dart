import 'dart:async';
import 'dart:convert';

import 'package:flutter/services.dart';

import 'sheet_tuner.dart';

enum SheetToneDroneMode {
  reference('기준음'),
  fifth('기준음+5도'),
  octave('기준음+옥타브'),
  fifthOctave('기준음+5도+옥타브');

  const SheetToneDroneMode(this.label);

  factory SheetToneDroneMode.fromJson(Object? value) {
    return switch (value) {
      'fifth' => SheetToneDroneMode.fifth,
      'octave' => SheetToneDroneMode.octave,
      'fifthOctave' => SheetToneDroneMode.fifthOctave,
      _ => SheetToneDroneMode.reference,
    };
  }

  final String label;

  List<int> midiNumbersFor(int rootMidiNumber) {
    final root = rootMidiNumber.clamp(0, 127).toInt();
    return switch (this) {
      SheetToneDroneMode.reference => <int>[root],
      SheetToneDroneMode.fifth => <int>[root, (root + 7).clamp(0, 127).toInt()],
      SheetToneDroneMode.octave => <int>[
        root,
        (root + 12).clamp(0, 127).toInt(),
      ],
      SheetToneDroneMode.fifthOctave => <int>[
        root,
        (root + 7).clamp(0, 127).toInt(),
        (root + 12).clamp(0, 127).toInt(),
      ],
    };
  }

  String toJson() => name;
}

class SheetToneSettings {
  const SheetToneSettings({
    this.rootConcertMidiNumber = 69,
    this.droneMode = SheetToneDroneMode.reference,
    this.volumePercent = 35,
  });

  factory SheetToneSettings.fromJson(Map<String, Object?>? json) {
    return SheetToneSettings(
      rootConcertMidiNumber: _normalizeMidiNumber(
        json?['rootConcertMidiNumber'],
      ),
      droneMode: SheetToneDroneMode.fromJson(json?['droneMode']),
      volumePercent: _normalizeVolumePercent(json?['volumePercent']),
    );
  }

  static const defaultSettings = SheetToneSettings();

  final int rootConcertMidiNumber;
  final SheetToneDroneMode droneMode;
  final int volumePercent;

  List<int> get concertMidiNumbers {
    return droneMode.midiNumbersFor(rootConcertMidiNumber);
  }

  List<double> frequencies({required int referencePitchA4}) {
    return concertMidiNumbers
        .map(
          (midiNumber) => SheetTunerPitch.noteFromMidi(
            midiNumber,
            referencePitchA4: referencePitchA4,
          ).frequency,
        )
        .toList(growable: false);
  }

  double get normalizedVolume => volumePercent.clamp(0, 100) / 100;

  SheetToneSettings copyWith({
    int? rootConcertMidiNumber,
    SheetToneDroneMode? droneMode,
    int? volumePercent,
  }) {
    return SheetToneSettings(
      rootConcertMidiNumber: _normalizeMidiNumber(
        rootConcertMidiNumber ?? this.rootConcertMidiNumber,
      ),
      droneMode: droneMode ?? this.droneMode,
      volumePercent: _normalizeVolumePercent(
        volumePercent ?? this.volumePercent,
      ),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'rootConcertMidiNumber': rootConcertMidiNumber,
      'droneMode': droneMode.toJson(),
      'volumePercent': volumePercent,
    };
  }

  static int _normalizeMidiNumber(Object? value) {
    if (value is num) {
      return value.round().clamp(21, 108).toInt();
    }
    return defaultSettings.rootConcertMidiNumber;
  }

  static int _normalizeVolumePercent(Object? value) {
    if (value is num) {
      return value.round().clamp(0, 100).toInt();
    }
    return defaultSettings.volumePercent;
  }
}

class SheetToneCodec {
  const SheetToneCodec._();

  static SheetToneSettings decode(String? value) {
    if (value == null || value.trim().isEmpty) {
      return SheetToneSettings.defaultSettings;
    }

    try {
      final decoded = jsonDecode(value);
      if (decoded is! Map) {
        return SheetToneSettings.defaultSettings;
      }
      return SheetToneSettings.fromJson(
        decoded.map(
          (key, mapValue) => MapEntry(key.toString(), mapValue as Object?),
        ),
      );
    } catch (_) {
      return SheetToneSettings.defaultSettings;
    }
  }

  static String encode(SheetToneSettings settings) {
    return jsonEncode(settings.toJson());
  }
}

class SheetTonePlayer {
  SheetTonePlayer({MethodChannel? channel})
    : _channel = channel ?? const MethodChannel('clef/tone_player');

  final MethodChannel _channel;

  Future<SheetTonePlaybackResult> play({
    required SheetToneSettings settings,
    required int referencePitchA4,
  }) async {
    try {
      await _channel.invokeMethod<void>('play', <String, Object?>{
        'frequencies': settings.frequencies(referencePitchA4: referencePitchA4),
        'volume': settings.normalizedVolume,
      });
      return SheetTonePlaybackResult.playing;
    } on MissingPluginException {
      return SheetTonePlaybackResult.unsupportedPlatform;
    } on PlatformException catch (error) {
      return SheetTonePlaybackResult.failed(error.message ?? error.code);
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

class SheetTonePlaybackResult {
  const SheetTonePlaybackResult._({required this.status, this.message = ''});

  static const playing = SheetTonePlaybackResult._(
    status: SheetTonePlaybackStatus.playing,
  );
  static const unsupportedPlatform = SheetTonePlaybackResult._(
    status: SheetTonePlaybackStatus.unsupportedPlatform,
  );

  factory SheetTonePlaybackResult.failed(String message) {
    return SheetTonePlaybackResult._(
      status: SheetTonePlaybackStatus.failed,
      message: message,
    );
  }

  final SheetTonePlaybackStatus status;
  final String message;

  bool get isPlaying => status == SheetTonePlaybackStatus.playing;
}

enum SheetTonePlaybackStatus { playing, unsupportedPlatform, failed }
