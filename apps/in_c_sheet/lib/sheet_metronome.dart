import 'dart:convert';

class SheetMetronomeSettings {
  const SheetMetronomeSettings({
    required this.bpm,
    required this.meter,
    this.soundEnabled = false,
  });

  factory SheetMetronomeSettings.fromJson(Map<String, Object?>? json) {
    final meterValue = json?['meter'];
    final soundEnabledValue = json?['soundEnabled'];
    return SheetMetronomeSettings(
      bpm: _normalizeBpm(json?['bpm']),
      meter: SheetMetronomeMeter.fromId(
        meterValue is String ? meterValue : defaultSettings.meter.id,
      ),
      soundEnabled: soundEnabledValue is bool
          ? soundEnabledValue
          : defaultSettings.soundEnabled,
    );
  }

  static const defaultSettings = SheetMetronomeSettings(
    bpm: 96,
    meter: SheetMetronomeMeter.fourFour,
  );

  final int bpm;
  final SheetMetronomeMeter meter;
  final bool soundEnabled;

  Duration get beatDuration {
    return Duration(milliseconds: (60000 / bpm).round());
  }

  SheetMetronomeSettings copyWith({
    int? bpm,
    SheetMetronomeMeter? meter,
    bool? soundEnabled,
  }) {
    return SheetMetronomeSettings(
      bpm: clampBpm(bpm ?? this.bpm),
      meter: meter ?? this.meter,
      soundEnabled: soundEnabled ?? this.soundEnabled,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'bpm': bpm,
      'meter': meter.id,
      'soundEnabled': soundEnabled,
    };
  }

  static int clampBpm(int bpm) => bpm.clamp(40, 240).toInt();

  static int _normalizeBpm(Object? value) {
    if (value is num) {
      return clampBpm(value.round());
    }
    return defaultSettings.bpm;
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

class SheetMetronomeBeat {
  const SheetMetronomeBeat({
    required this.beatIndex,
    required this.beatsPerBar,
  });

  final int beatIndex;
  final int beatsPerBar;

  int get beatNumber => beatIndex + 1;
  bool get isAccent => beatIndex == 0;

  SheetMetronomeBeat next() {
    return SheetMetronomeBeat(
      beatIndex: (beatIndex + 1) % beatsPerBar,
      beatsPerBar: beatsPerBar,
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
