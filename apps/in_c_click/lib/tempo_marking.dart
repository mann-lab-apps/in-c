class TempoMarking {
  const TempoMarking({
    required this.name,
    required this.koreanName,
    required this.minBpm,
    required this.maxBpm,
    required this.defaultBpm,
  });

  final String name;
  final String koreanName;
  final int minBpm;
  final int maxBpm;
  final int defaultBpm;

  String get rangeLabel => '$minBpm-$maxBpm';
  String get displayName => '$name · $koreanName';

  bool contains(int bpm) => bpm >= minBpm && bpm <= maxBpm;
}

const tempoMarkings = [
  TempoMarking(
    name: 'Largo',
    koreanName: '아주 느리게',
    minBpm: 40,
    maxBpm: 60,
    defaultBpm: 52,
  ),
  TempoMarking(
    name: 'Adagio',
    koreanName: '느리게',
    minBpm: 61,
    maxBpm: 76,
    defaultBpm: 68,
  ),
  TempoMarking(
    name: 'Andante',
    koreanName: '걷는 빠르기로',
    minBpm: 77,
    maxBpm: 108,
    defaultBpm: 92,
  ),
  TempoMarking(
    name: 'Moderato',
    koreanName: '보통 빠르기로',
    minBpm: 109,
    maxBpm: 120,
    defaultBpm: 116,
  ),
  TempoMarking(
    name: 'Allegro',
    koreanName: '빠르게',
    minBpm: 121,
    maxBpm: 168,
    defaultBpm: 144,
  ),
  TempoMarking(
    name: 'Presto',
    koreanName: '매우 빠르게',
    minBpm: 169,
    maxBpm: 200,
    defaultBpm: 184,
  ),
  TempoMarking(
    name: 'Prestissimo',
    koreanName: '극히 빠르게',
    minBpm: 201,
    maxBpm: 240,
    defaultBpm: 208,
  ),
];

TempoMarking tempoMarkingForBpm(int bpm) {
  for (final marking in tempoMarkings) {
    if (marking.contains(bpm)) {
      return marking;
    }
  }

  return bpm < tempoMarkings.first.minBpm
      ? tempoMarkings.first
      : tempoMarkings.last;
}
