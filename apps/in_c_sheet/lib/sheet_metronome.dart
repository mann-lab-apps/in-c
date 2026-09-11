import 'dart:convert';

class SheetMetronomeSettings {
  const SheetMetronomeSettings({
    required this.bpm,
    required this.meter,
    this.soundEnabled = true,
    this.accentEnabled = true,
    this.subdivision = SheetMetronomeSubdivision.none,
    this.countInBars = 0,
    this.volumePercent = 85,
  });

  factory SheetMetronomeSettings.fromJson(Map<String, Object?>? json) {
    final meterValue = json?['meter'];
    final soundEnabledValue = json?['soundEnabled'];
    final accentEnabledValue = json?['accentEnabled'];
    final subdivisionValue = json?['subdivision'];
    final countInBarsValue = json?['countInBars'];
    final volumePercentValue = json?['volumePercent'];
    return SheetMetronomeSettings(
      bpm: _normalizeBpm(json?['bpm']),
      meter: SheetMetronomeMeter.fromId(
        meterValue is String ? meterValue : defaultSettings.meter.id,
      ),
      soundEnabled: soundEnabledValue is bool
          ? soundEnabledValue
          : defaultSettings.soundEnabled,
      accentEnabled: accentEnabledValue is bool
          ? accentEnabledValue
          : defaultSettings.accentEnabled,
      subdivision: SheetMetronomeSubdivision.fromId(
        subdivisionValue is String
            ? subdivisionValue
            : defaultSettings.subdivision.id,
      ),
      countInBars: _normalizeCountInBars(countInBarsValue),
      volumePercent: _normalizeVolumePercent(volumePercentValue),
    );
  }

  static const defaultSettings = SheetMetronomeSettings(
    bpm: 96,
    meter: SheetMetronomeMeter.fourFour,
  );

  final int bpm;
  final SheetMetronomeMeter meter;
  final bool soundEnabled;
  final bool accentEnabled;
  final SheetMetronomeSubdivision subdivision;
  final int countInBars;
  final int volumePercent;

  double get normalizedVolume => volumePercent.clamp(0, 100) / 100;

  Duration get beatDuration {
    return Duration(milliseconds: (60000 / bpm).round());
  }

  Duration get pulseDuration {
    return Duration(
      milliseconds: (60000 / bpm / subdivision.pulsesPerBeat).round(),
    );
  }

  SheetMetronomeSettings copyWith({
    int? bpm,
    SheetMetronomeMeter? meter,
    bool? soundEnabled,
    bool? accentEnabled,
    SheetMetronomeSubdivision? subdivision,
    int? countInBars,
    int? volumePercent,
  }) {
    return SheetMetronomeSettings(
      bpm: clampBpm(bpm ?? this.bpm),
      meter: meter ?? this.meter,
      soundEnabled: soundEnabled ?? this.soundEnabled,
      accentEnabled: accentEnabled ?? this.accentEnabled,
      subdivision: subdivision ?? this.subdivision,
      countInBars: clampCountInBars(countInBars ?? this.countInBars),
      volumePercent: clampVolumePercent(volumePercent ?? this.volumePercent),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'bpm': bpm,
      'meter': meter.id,
      'soundEnabled': soundEnabled,
      'accentEnabled': accentEnabled,
      'subdivision': subdivision.id,
      'countInBars': countInBars,
      'volumePercent': volumePercent,
    };
  }

  static int clampBpm(int bpm) => bpm.clamp(40, 240).toInt();

  static int clampCountInBars(int bars) => bars.clamp(0, 2).toInt();

  static int clampVolumePercent(int volumePercent) =>
      volumePercent.clamp(0, 100).toInt();

  static int _normalizeBpm(Object? value) {
    if (value is num) {
      return clampBpm(value.round());
    }
    return defaultSettings.bpm;
  }

  static int _normalizeCountInBars(Object? value) {
    if (value is num) {
      return clampCountInBars(value.round());
    }
    return defaultSettings.countInBars;
  }

  static int _normalizeVolumePercent(Object? value) {
    if (value is num) {
      return clampVolumePercent(value.round());
    }
    return defaultSettings.volumePercent;
  }
}

enum SheetMetronomeMeter {
  twoFour('2/4', 2),
  threeFour('3/4', 3),
  fourFour('4/4', 4),
  sixEight('6/8', 6);

  const SheetMetronomeMeter(this.label, this.beatsPerBar);

  final String label;
  final int beatsPerBar;

  String get id => name;

  static SheetMetronomeMeter fromId(String id) {
    return SheetMetronomeMeter.values.firstWhere(
      (meter) => meter.id == id,
      orElse: () => SheetMetronomeMeter.fourFour,
    );
  }
}

enum SheetMetronomeSubdivision {
  none('없음', 1),
  eighth('8분', 2),
  triplet('3연', 3),
  sixteenth('16분', 4);

  const SheetMetronomeSubdivision(this.label, this.pulsesPerBeat);

  final String label;
  final int pulsesPerBeat;

  String get id => name;

  static SheetMetronomeSubdivision fromId(String id) {
    return SheetMetronomeSubdivision.values.firstWhere(
      (subdivision) => subdivision.id == id,
      orElse: () => SheetMetronomeSubdivision.none,
    );
  }
}

class SheetMetronomeBeat {
  const SheetMetronomeBeat({
    required this.beatIndex,
    required this.beatsPerBar,
    this.subdivisionIndex = 0,
    this.pulsesPerBeat = 1,
  });

  final int beatIndex;
  final int beatsPerBar;
  final int subdivisionIndex;
  final int pulsesPerBeat;

  int get beatNumber => beatIndex + 1;
  bool get isBeatStart => subdivisionIndex == 0;
  bool get isAccent => beatIndex == 0 && isBeatStart;

  SheetMetronomeBeat next() {
    if (subdivisionIndex + 1 < pulsesPerBeat) {
      return SheetMetronomeBeat(
        beatIndex: beatIndex,
        beatsPerBar: beatsPerBar,
        subdivisionIndex: subdivisionIndex + 1,
        pulsesPerBeat: pulsesPerBeat,
      );
    }
    return SheetMetronomeBeat(
      beatIndex: (beatIndex + 1) % beatsPerBar,
      beatsPerBar: beatsPerBar,
      pulsesPerBeat: pulsesPerBeat,
    );
  }
}

class SheetMetronomeCodec {
  const SheetMetronomeCodec._();

  static SheetMetronomeSettings decode(String? value) {
    if (value == null || value.trim().isEmpty) {
      return SheetMetronomeSettings.defaultSettings;
    }

    try {
      final decoded = jsonDecode(value);
      if (decoded is! Map) {
        return SheetMetronomeSettings.defaultSettings;
      }
      return SheetMetronomeSettings.fromJson(
        decoded.map(
          (key, mapValue) => MapEntry(key.toString(), mapValue as Object?),
        ),
      );
    } catch (_) {
      return SheetMetronomeSettings.defaultSettings;
    }
  }

  static String encode(SheetMetronomeSettings settings) {
    return jsonEncode(settings.toJson());
  }
}
