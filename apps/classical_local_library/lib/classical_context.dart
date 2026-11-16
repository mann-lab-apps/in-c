/// App navigation vocabulary, not a date classifier or copyright decision.
enum MusicEra {
  medieval('중세'),
  renaissance('르네상스'),
  baroque('바로크'),
  classical('고전'),
  romantic('낭만'),
  modern('근현대');

  const MusicEra(this.label);
  final String label;
}

enum PeriodCertainty { confirmed, estimated }

class PeriodAssessment {
  PeriodAssessment({
    required List<MusicEra> eras,
    required this.source,
    this.certainty = PeriodCertainty.confirmed,
  }) : eras = List.unmodifiable(eras.toSet()) {
    if (source.trim().isEmpty || source.length > 1000) {
      throw const FormatException('시대 정보의 확인 출처를 입력해 주세요.');
    }
  }
  final List<MusicEra> eras;
  final String source;
  final PeriodCertainty certainty;
  Map<String, Object?> toJson() => {
    'eras': eras.map((e) => e.name).toList(),
    'source': source,
    'certainty': certainty.name,
  };
  factory PeriodAssessment.fromJson(Map<String, Object?> json) =>
      PeriodAssessment(
        eras: (json['eras'] as List)
            .map((e) => MusicEra.values.byName(e as String))
            .toList(),
        source: json['source'] as String,
        certainty: PeriodCertainty.values.byName(json['certainty'] as String),
      );
}

class ComposerProfile {
  ComposerProfile({
    required this.source,
    this.period,
    List<String> confirmedFileIds = const [],
    List<String> excludedFileIds = const [],
  }) : confirmedFileIds = List.unmodifiable(confirmedFileIds.toSet()),
       excludedFileIds = List.unmodifiable(excludedFileIds.toSet()) {
    if (source.trim().isEmpty || source.length > 1000) {
      throw const FormatException('이름과 별칭을 확인한 출처를 입력해 주세요.');
    }
  }
  final String source;
  final PeriodAssessment? period;
  final List<String> confirmedFileIds, excludedFileIds;
  Map<String, Object?> toJson() => {
    'source': source,
    'period': period?.toJson(),
    'confirmedFileIds': confirmedFileIds,
    'excludedFileIds': excludedFileIds,
  };
  factory ComposerProfile.fromJson(
    Map<String, Object?> json,
  ) => ComposerProfile(
    source: json['source'] as String,
    period: json['period'] == null
        ? null
        : PeriodAssessment.fromJson(
            Map<String, Object?>.from(json['period'] as Map),
          ),
    confirmedFileIds: (json['confirmedFileIds'] as List? ?? []).cast<String>(),
    excludedFileIds: (json['excludedFileIds'] as List? ?? []).cast<String>(),
  );
}

class ResolvedPeriod {
  const ResolvedPeriod(
    this.eras,
    this.label,
    this.source, {
    this.estimated = false,
  });
  final List<MusicEra> eras;
  final String label, source;
  final bool estimated;
  bool get isUnknown => eras.isEmpty;
}
