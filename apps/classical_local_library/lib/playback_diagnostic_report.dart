import 'dart:convert';

const playbackDiagnosticReportSchemaVersion = 1;

enum PlaybackDiagnosticFixture {
  wav(
    id: 'synthetic-wav',
    assetPath: 'assets/audio_test/movement_1.wav',
    label: 'WAV synthetic fixture',
    container: 'WAV',
    codec: 'PCM S16LE',
  ),
  aacM4a(
    id: 'synthetic-aac-m4a',
    assetPath: 'assets/audio_test/movement_1_aac.m4a',
    label: 'AAC-in-M4A synthetic fixture',
    container: 'M4A',
    codec: 'AAC',
  ),
  alacM4a(
    id: 'synthetic-alac-m4a',
    assetPath: 'assets/audio_test/movement_1_alac.m4a',
    label: 'ALAC-in-M4A synthetic fixture',
    container: 'M4A',
    codec: 'ALAC',
  );

  const PlaybackDiagnosticFixture({
    required this.id,
    required this.assetPath,
    required this.label,
    required this.container,
    required this.codec,
  });

  final String id;
  final String assetPath;
  final String label;
  final String container;
  final String codec;

  static PlaybackDiagnosticFixture byId(String id) {
    return values.firstWhere(
      (fixture) => fixture.id == id,
      orElse: () => throw FormatException('알 수 없는 fixture ID입니다: $id'),
    );
  }
}

enum PlaybackDiagnosticListeningFeedback {
  heard(label: '소리가 들림'),
  issue(label: '무음 또는 이상'),
  notChecked(label: '확인하지 않음');

  const PlaybackDiagnosticListeningFeedback({required this.label});

  final String label;
}

enum PlaybackDiagnosticPlatform { android, ios, other }

enum PlaybackDiagnosticFailureKind {
  none,
  emptyQueue,
  unlinkedFile,
  missingFile,
  unsupportedFormat,
  loadFailed,
  positionNotAdvanced,
  stateTransitionFailed,
  unexpected,
}

class PlaybackDiagnosticFixtureResult {
  const PlaybackDiagnosticFixtureResult({
    required this.fixture,
    required this.loaded,
    required this.positionAdvanced,
    required this.paused,
    required this.resumed,
    required this.stopped,
    this.failureKind = PlaybackDiagnosticFailureKind.none,
  });

  const PlaybackDiagnosticFixtureResult.success({required this.fixture})
    : loaded = true,
      positionAdvanced = true,
      paused = true,
      resumed = true,
      stopped = true,
      failureKind = PlaybackDiagnosticFailureKind.none;

  final PlaybackDiagnosticFixture fixture;
  final bool loaded;
  final bool positionAdvanced;
  final bool paused;
  final bool resumed;
  final bool stopped;
  final PlaybackDiagnosticFailureKind failureKind;

  bool get isSuccess =>
      loaded &&
      positionAdvanced &&
      paused &&
      resumed &&
      stopped &&
      failureKind == PlaybackDiagnosticFailureKind.none;

  String get message {
    if (isSuccess) {
      return '불러오기·재생·일시정지·재개·정지 확인';
    }
    return switch (failureKind) {
      PlaybackDiagnosticFailureKind.emptyQueue => '재생할 테스트 항목이 없습니다.',
      PlaybackDiagnosticFailureKind.unlinkedFile => '테스트 파일 연결을 확인하지 못했습니다.',
      PlaybackDiagnosticFailureKind.missingFile => '테스트 파일을 찾지 못했습니다.',
      PlaybackDiagnosticFailureKind.unsupportedFormat => '지원하지 않는 테스트 형식입니다.',
      PlaybackDiagnosticFailureKind.loadFailed => '테스트 파일을 불러오지 못했습니다.',
      PlaybackDiagnosticFailureKind.positionNotAdvanced => '재생 위치가 진행되지 않았습니다.',
      PlaybackDiagnosticFailureKind.stateTransitionFailed =>
        '재생 상태 전환을 끝까지 확인하지 못했습니다.',
      PlaybackDiagnosticFailureKind.unexpected => '재생 진단을 완료하지 못했습니다.',
      PlaybackDiagnosticFailureKind.none => '일부 자동 확인을 통과하지 못했습니다.',
    };
  }

  Map<String, Object?> toJson() => {
    'fixtureId': fixture.id,
    'container': fixture.container,
    'codec': fixture.codec,
    'loaded': loaded,
    'positionAdvanced': positionAdvanced,
    'paused': paused,
    'resumed': resumed,
    'stopped': stopped,
    'failureKind': failureKind.name,
  };

  factory PlaybackDiagnosticFixtureResult.fromJson(Map<String, Object?> json) {
    _requireOnlyKeys(json, const {
      'fixtureId',
      'container',
      'codec',
      'loaded',
      'positionAdvanced',
      'paused',
      'resumed',
      'stopped',
      'failureKind',
    });
    final fixture = PlaybackDiagnosticFixture.byId(
      _requiredString(json, 'fixtureId'),
    );
    if (_requiredString(json, 'container') != fixture.container ||
        _requiredString(json, 'codec') != fixture.codec) {
      throw const FormatException('fixture의 container/codec 정보가 일치하지 않습니다.');
    }
    return PlaybackDiagnosticFixtureResult(
      fixture: fixture,
      loaded: _requiredBool(json, 'loaded'),
      positionAdvanced: _requiredBool(json, 'positionAdvanced'),
      paused: _requiredBool(json, 'paused'),
      resumed: _requiredBool(json, 'resumed'),
      stopped: _requiredBool(json, 'stopped'),
      failureKind: _enumByName(
        PlaybackDiagnosticFailureKind.values,
        _requiredString(json, 'failureKind'),
        'failureKind',
      ),
    );
  }
}

class PlaybackDiagnosticReport {
  const PlaybackDiagnosticReport(
    this.results, {
    this.schemaVersion = playbackDiagnosticReportSchemaVersion,
    this.platform = PlaybackDiagnosticPlatform.other,
    this.listeningFeedback = PlaybackDiagnosticListeningFeedback.notChecked,
  });

  final int schemaVersion;
  final PlaybackDiagnosticPlatform platform;
  final PlaybackDiagnosticListeningFeedback listeningFeedback;
  final List<PlaybackDiagnosticFixtureResult> results;

  bool get isSuccess =>
      results.isNotEmpty && results.every((result) => result.isSuccess);

  PlaybackDiagnosticReport withListeningFeedback(
    PlaybackDiagnosticListeningFeedback feedback,
  ) {
    return PlaybackDiagnosticReport(
      results,
      schemaVersion: schemaVersion,
      platform: platform,
      listeningFeedback: feedback,
    );
  }

  String summary([PlaybackDiagnosticListeningFeedback? feedback]) {
    final selectedFeedback = feedback ?? listeningFeedback;
    final outcome = isSuccess ? '자동 확인 통과' : '자동 확인 실패';
    return '재생 진단: $outcome\n'
        '${results.map((result) => '${result.fixture.id}: ${result.message}').join('\n')}\n'
        '청감 확인: ${selectedFeedback.label}\n'
        '개인 파일·감상 이력·기기 식별자·네트워크 전송 없음';
  }

  Map<String, Object?> toJson() => {
    'schemaVersion': schemaVersion,
    'platform': platform.name,
    'listeningFeedback': listeningFeedback.name,
    'fixtures': [for (final result in results) result.toJson()],
  };

  factory PlaybackDiagnosticReport.fromJson(Map<String, Object?> json) {
    _requireOnlyKeys(json, const {
      'schemaVersion',
      'platform',
      'listeningFeedback',
      'fixtures',
    });
    final schemaVersion = json['schemaVersion'];
    if (schemaVersion is! int) {
      throw const FormatException('schemaVersion이 없거나 올바르지 않습니다.');
    }
    if (schemaVersion != playbackDiagnosticReportSchemaVersion) {
      throw FormatException('지원하지 않는 schemaVersion입니다: $schemaVersion');
    }
    final fixtures = json['fixtures'];
    if (fixtures is! List<Object?> || fixtures.isEmpty) {
      throw const FormatException('fixtures가 없거나 올바르지 않습니다.');
    }
    return PlaybackDiagnosticReport(
      [
        for (final fixture in fixtures)
          PlaybackDiagnosticFixtureResult.fromJson(
            _requiredMap(fixture, 'fixture'),
          ),
      ],
      schemaVersion: schemaVersion,
      platform: _enumByName(
        PlaybackDiagnosticPlatform.values,
        _requiredString(json, 'platform'),
        'platform',
      ),
      listeningFeedback: _enumByName(
        PlaybackDiagnosticListeningFeedback.values,
        _requiredString(json, 'listeningFeedback'),
        'listeningFeedback',
      ),
    );
  }
}

class PlaybackDiagnosticReportCodec {
  const PlaybackDiagnosticReportCodec();

  String encode(PlaybackDiagnosticReport report) {
    return const JsonEncoder.withIndent('  ').convert(report.toJson());
  }

  PlaybackDiagnosticReport decode(String source) {
    PlaybackDiagnosticPrivacyValidator.validateRaw(source);
    final decoded = jsonDecode(source);
    return PlaybackDiagnosticReport.fromJson(_requiredMap(decoded, 'report'));
  }
}

class PlaybackDiagnosticPrivacyValidator {
  const PlaybackDiagnosticPrivacyValidator._();

  static final RegExp _sensitivePattern = RegExp(
    r'(file:/{2}|/Users/|/home/|/storage/|\\|[A-Za-z]:\\)',
    caseSensitive: false,
  );

  static void validateRaw(String source) {
    if (_sensitivePattern.hasMatch(source)) {
      throw const FormatException('개인 경로나 파일 URI로 보이는 값이 포함되어 있습니다.');
    }
  }
}

class PlaybackDiagnosticReportReviewer {
  const PlaybackDiagnosticReportReviewer({
    this.codec = const PlaybackDiagnosticReportCodec(),
  });

  final PlaybackDiagnosticReportCodec codec;

  String review(String source) {
    final report = codec.decode(source);
    final lines = <String>[
      'schema: ${report.schemaVersion}',
      'platform: ${report.platform.name}',
      'automatic: ${report.isSuccess ? 'passed' : 'failed'}',
      'listening: ${report.listeningFeedback.name}',
    ];
    for (final result in report.results) {
      lines.add(
        '${result.fixture.id}: ${result.isSuccess ? 'passed' : 'failed'} '
        '(${result.fixture.container}/${result.fixture.codec}, '
        'failure=${result.failureKind.name})',
      );
      final matrixStatus = switch (report.platform) {
        PlaybackDiagnosticPlatform.android ||
        PlaybackDiagnosticPlatform.ios => 'automated-native-passed',
        PlaybackDiagnosticPlatform.other => 'platform-not-covered',
      };
      lines.add('${result.fixture.id}.matrix: $matrixStatus');
    }
    final reproducible = report.results.any((result) => !result.isSuccess);
    lines.add(
      'automationFollowUp: ${reproducible ? 'fixture regression test' : 'none'}',
    );
    lines.add('scope: fixture result only; not a codec-wide conclusion');
    return lines.join('\n');
  }
}

void _requireOnlyKeys(Map<String, Object?> json, Set<String> allowed) {
  final unexpected = json.keys.where((key) => !allowed.contains(key)).toList();
  if (unexpected.isNotEmpty) {
    throw FormatException('허용하지 않는 필드입니다: ${unexpected.join(', ')}');
  }
}

String _requiredString(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is! String || value.isEmpty) {
    throw FormatException('$key 필드가 없거나 올바르지 않습니다.');
  }
  return value;
}

bool _requiredBool(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is! bool) {
    throw FormatException('$key 필드가 없거나 올바르지 않습니다.');
  }
  return value;
}

Map<String, Object?> _requiredMap(Object? value, String key) {
  if (value is! Map<String, Object?>) {
    throw FormatException('$key 값이 올바른 JSON object가 아닙니다.');
  }
  return value;
}

T _enumByName<T extends Enum>(List<T> values, String name, String key) {
  for (final value in values) {
    if (value.name == name) {
      return value;
    }
  }
  throw FormatException('$key 값이 올바르지 않습니다: $name');
}
