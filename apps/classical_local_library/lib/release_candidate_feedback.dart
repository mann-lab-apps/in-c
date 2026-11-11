import 'dart:convert';

const releaseCandidateFeedbackSchemaVersion = 2;

enum ReleaseMusicScenario {
  queueReservation,
  queueEditing,
  queueModes,
  queueRestoration,
  favorites,
  imslpPageReturn,
  imslpImport,
  imslpSourceConfirmation,
}

enum ReleaseAutomaticCheck {
  semantics,
  decoderSignal,
  nativeTransport,
  simulatorLifecycle,
}

enum ReleaseFeedbackPlatform { ios, android }

enum ReleaseFeedbackDeviceClass { phone, tablet }

enum ReleaseFeedbackProvider { onDevice, cloudDrive, thirdParty, notChecked }

enum ReleaseFeedbackFixture {
  movement1Wav,
  movement1Aac,
  movement1Alac,
  userApproved,
  notChecked,
}

enum ReleaseFeedbackFormat { wav, aac, alac, mp3, flac, ogg, opus, other }

enum ReleaseFeedbackOutcome { passed, issue, notChecked }

enum ReleaseFeedbackRoute { speaker, wired, bluetooth, notChecked }

enum ReleaseFeedbackListening { heard, silentOrAbnormal, notChecked }

enum ReleaseFeedbackReproducibility {
  always,
  intermittent,
  notReproduced,
  notChecked,
}

enum ReleaseFeedbackSeverity { none, p0, p1, p2, p3 }

class ReleaseCandidateFeedbackReport {
  const ReleaseCandidateFeedbackReport({
    required this.appVersion,
    required this.buildNumber,
    required this.platform,
    required this.deviceClass,
    required this.osMajor,
    required this.provider,
    required this.fixture,
    required this.format,
    required this.voiceOver,
    required this.dynamicType,
    required this.importOutcome,
    required this.playbackOutcome,
    required this.relaunchOutcome,
    required this.routes,
    required this.interruptionOutcome,
    required this.listening,
    required this.reproducibility,
    required this.severity,
    this.schemaVersion = releaseCandidateFeedbackSchemaVersion,
    this.musicActions = const {},
    this.automaticChecks = const {},
  });

  final int schemaVersion;
  final String appVersion;
  final int buildNumber;
  final ReleaseFeedbackPlatform platform;
  final ReleaseFeedbackDeviceClass deviceClass;
  final int osMajor;
  final ReleaseFeedbackProvider provider;
  final ReleaseFeedbackFixture fixture;
  final ReleaseFeedbackFormat format;
  final ReleaseFeedbackOutcome voiceOver;
  final ReleaseFeedbackOutcome dynamicType;
  final ReleaseFeedbackOutcome importOutcome;
  final ReleaseFeedbackOutcome playbackOutcome;
  final ReleaseFeedbackOutcome relaunchOutcome;
  final List<ReleaseFeedbackRoute> routes;
  final ReleaseFeedbackOutcome interruptionOutcome;
  final ReleaseFeedbackListening listening;
  final ReleaseFeedbackReproducibility reproducibility;
  final ReleaseFeedbackSeverity severity;

  /// User observations only. Missing answers always mean notChecked.
  final Map<ReleaseMusicScenario, ReleaseFeedbackOutcome> musicActions;

  /// Reported automation results, separate from physical observations.
  /// These declarations are not proof: retain runner evidence separately.
  final Map<ReleaseAutomaticCheck, ReleaseFeedbackOutcome> automaticChecks;

  List<String> get regressionCandidates => [
    for (final entry in musicActions.entries)
      if (entry.value == ReleaseFeedbackOutcome.issue)
        'music.${entry.key.name}',
    for (final entry in automaticChecks.entries)
      if (entry.value == ReleaseFeedbackOutcome.issue)
        'automatic.${entry.key.name}',
    if (voiceOver == ReleaseFeedbackOutcome.issue) 'physical.voiceOver',
    if (importOutcome == ReleaseFeedbackOutcome.issue) 'physical.fileProvider',
    if (playbackOutcome == ReleaseFeedbackOutcome.issue) 'physical.playback',
    if (relaunchOutcome == ReleaseFeedbackOutcome.issue) 'physical.relaunch',
    if (interruptionOutcome == ReleaseFeedbackOutcome.issue)
      'physical.interruption',
    if (listening == ReleaseFeedbackListening.silentOrAbnormal)
      'physical.output',
  ];

  bool get hasUnverifiedObservations =>
      provider == ReleaseFeedbackProvider.notChecked ||
      fixture == ReleaseFeedbackFixture.notChecked ||
      reproducibility == ReleaseFeedbackReproducibility.notChecked ||
      [
        voiceOver,
        dynamicType,
        importOutcome,
        playbackOutcome,
        relaunchOutcome,
        interruptionOutcome,
      ].contains(ReleaseFeedbackOutcome.notChecked) ||
      listening == ReleaseFeedbackListening.notChecked ||
      routes.contains(ReleaseFeedbackRoute.notChecked) ||
      ReleaseMusicScenario.values.any(
        (s) =>
            musicActions[s] == null ||
            musicActions[s] == ReleaseFeedbackOutcome.notChecked,
      );

  bool get blocksRelease =>
      severity == ReleaseFeedbackSeverity.p0 ||
      severity == ReleaseFeedbackSeverity.p1;

  Map<String, Object?> toJson() => {
    'schemaVersion': schemaVersion,
    'appVersion': appVersion,
    'buildNumber': buildNumber,
    'platform': platform.name,
    'deviceClass': deviceClass.name,
    'osMajor': osMajor,
    'provider': provider.name,
    'fixture': fixture.name,
    'format': format.name,
    'voiceOver': voiceOver.name,
    'dynamicType': dynamicType.name,
    'importOutcome': importOutcome.name,
    'playbackOutcome': playbackOutcome.name,
    'relaunchOutcome': relaunchOutcome.name,
    'routes': routes.map((route) => route.name).toList(),
    'interruptionOutcome': interruptionOutcome.name,
    'listening': listening.name,
    'reproducibility': reproducibility.name,
    'severity': severity.name,
    if (schemaVersion == 2) ...{
      'musicActions': {
        for (final s in ReleaseMusicScenario.values)
          s.name: (musicActions[s] ?? ReleaseFeedbackOutcome.notChecked).name,
      },
      'automaticChecks': {
        for (final c in ReleaseAutomaticCheck.values)
          c.name:
              (automaticChecks[c] ?? ReleaseFeedbackOutcome.notChecked).name,
      },
    },
  };

  factory ReleaseCandidateFeedbackReport.fromJson(Map<String, Object?> json) {
    final version = json['schemaVersion'];
    if (version is! int || (version != 1 && version != 2)) {
      throw const FormatException('지원하지 않는 피드백 schemaVersion입니다.');
    }
    final keys = {
      'schemaVersion',
      'appVersion',
      'buildNumber',
      'platform',
      'deviceClass',
      'osMajor',
      'provider',
      'fixture',
      'format',
      'voiceOver',
      'dynamicType',
      'importOutcome',
      'playbackOutcome',
      'relaunchOutcome',
      'routes',
      'interruptionOutcome',
      'listening',
      'reproducibility',
      'severity',
      if (version == 2) ...['musicActions', 'automaticChecks'],
    };
    final unexpected = json.keys.where((key) => !keys.contains(key)).toList();
    if (unexpected.isNotEmpty || json.keys.length != keys.length) {
      throw const FormatException('피드백 필드가 계약과 일치하지 않습니다.');
    }
    final appVersion = json['appVersion'];
    if (appVersion is! String ||
        !RegExp(r'^\d+\.\d+\.\d+$').hasMatch(appVersion)) {
      throw const FormatException('appVersion이 올바르지 않습니다.');
    }
    final buildNumber = json['buildNumber'];
    if (buildNumber is! int || buildNumber < 1 || buildNumber > 2100000000) {
      throw const FormatException('buildNumber가 올바르지 않습니다.');
    }
    final osMajor = json['osMajor'];
    if (osMajor is! int || osMajor < 1 || osMajor > 99) {
      throw const FormatException('osMajor가 올바르지 않습니다.');
    }
    final rawRoutes = json['routes'];
    if (rawRoutes is! List<Object?> || rawRoutes.isEmpty) {
      throw const FormatException('routes가 올바르지 않습니다.');
    }
    final routes = rawRoutes
        .map(
          (route) => _enumValue(ReleaseFeedbackRoute.values, route, 'routes'),
        )
        .toSet()
        .toList(growable: false);
    if (routes.length != rawRoutes.length ||
        (routes.contains(ReleaseFeedbackRoute.notChecked) &&
            routes.length != 1)) {
      throw const FormatException('routes가 중복되거나 모순됩니다.');
    }
    return ReleaseCandidateFeedbackReport(
      schemaVersion: version,
      musicActions: version == 1
          ? const {}
          : _outcomes(ReleaseMusicScenario.values, json['musicActions']),
      automaticChecks: version == 1
          ? const {}
          : _outcomes(ReleaseAutomaticCheck.values, json['automaticChecks']),
      appVersion: appVersion,
      buildNumber: buildNumber,
      platform: _enumValue(
        ReleaseFeedbackPlatform.values,
        json['platform'],
        'platform',
      ),
      deviceClass: _enumValue(
        ReleaseFeedbackDeviceClass.values,
        json['deviceClass'],
        'deviceClass',
      ),
      osMajor: osMajor,
      provider: _enumValue(
        ReleaseFeedbackProvider.values,
        json['provider'],
        'provider',
      ),
      fixture: _enumValue(
        ReleaseFeedbackFixture.values,
        json['fixture'],
        'fixture',
      ),
      format: _enumValue(
        ReleaseFeedbackFormat.values,
        json['format'],
        'format',
      ),
      voiceOver: _outcome(json, 'voiceOver'),
      dynamicType: _outcome(json, 'dynamicType'),
      importOutcome: _outcome(json, 'importOutcome'),
      playbackOutcome: _outcome(json, 'playbackOutcome'),
      relaunchOutcome: _outcome(json, 'relaunchOutcome'),
      routes: routes,
      interruptionOutcome: _outcome(json, 'interruptionOutcome'),
      listening: _enumValue(
        ReleaseFeedbackListening.values,
        json['listening'],
        'listening',
      ),
      reproducibility: _enumValue(
        ReleaseFeedbackReproducibility.values,
        json['reproducibility'],
        'reproducibility',
      ),
      severity: _enumValue(
        ReleaseFeedbackSeverity.values,
        json['severity'],
        'severity',
      ),
    );
  }

  static ReleaseFeedbackOutcome _outcome(
    Map<String, Object?> json,
    String field,
  ) => _enumValue(ReleaseFeedbackOutcome.values, json[field], field);
}

class ReleaseCandidateFeedbackCodec {
  const ReleaseCandidateFeedbackCodec();

  static final RegExp _privateValue = RegExp(
    r'(file:/{2}|/Users/|/home/|/storage/|\\|[A-Za-z]:\\|-----BEGIN|api[_-]?key|password|deviceId|fileName|trackTitle)',
    caseSensitive: false,
  );

  String encode(ReleaseCandidateFeedbackReport report) {
    if (report.schemaVersion == 1 &&
        (report.musicActions.isNotEmpty || report.automaticChecks.isNotEmpty)) {
      throw const FormatException('구버전 피드백에 새 검사 결과를 저장할 수 없습니다.');
    }
    final json = report.toJson();
    ReleaseCandidateFeedbackReport.fromJson(json);
    return const JsonEncoder.withIndent('  ').convert(json);
  }

  ReleaseCandidateFeedbackReport decode(String source) {
    if (utf8.encode(source).length > 16384) {
      throw const FormatException('피드백 크기가 허용 범위를 넘었습니다.');
    }
    if (_privateValue.hasMatch(source)) {
      throw const FormatException('개인정보 또는 비밀값으로 보이는 내용이 포함되어 있습니다.');
    }
    final decoded = jsonDecode(source);
    if (decoded is! Map<String, Object?>) {
      throw const FormatException('JSON 피드백 객체가 필요합니다.');
    }
    return ReleaseCandidateFeedbackReport.fromJson(decoded);
  }
}

Map<T, ReleaseFeedbackOutcome> _outcomes<T extends Enum>(
  List<T> values,
  Object? raw,
) {
  if (raw is! Map<String, Object?> ||
      raw.length != values.length ||
      raw.keys.any((key) => !values.any((v) => v.name == key))) {
    throw const FormatException('검사 항목이 계약과 일치하지 않습니다.');
  }
  return Map.unmodifiable({
    for (final value in values)
      value: _enumValue(
        ReleaseFeedbackOutcome.values,
        raw[value.name],
        '검사 결과',
      ),
  });
}

T _enumValue<T extends Enum>(List<T> values, Object? raw, String field) {
  if (raw is! String) {
    throw FormatException('$field 필드가 올바르지 않습니다.');
  }
  return values.firstWhere(
    (value) => value.name == raw,
    orElse: () => throw FormatException('$field 값이 올바르지 않습니다.'),
  );
}
