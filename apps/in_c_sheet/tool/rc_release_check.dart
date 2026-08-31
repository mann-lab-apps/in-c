import 'dart:io';

const _clefDocs = <String>[
  '../../docs/qa/clef-v1-device-qa-runbook.md',
  '../../docs/qa/clef-v1-rc-qa-plan.md',
  '../../docs/qa/sheet-viewer-android-tablet-smoke-test.md',
  '../../docs/qa/clef-share-import-export-qa.md',
  '../../docs/qa/clef-tester-checklist.md',
  '../../docs/qa/clef-beta-feedback-message.md',
  '../../docs/product/clef-v1-1-spike-backlog.md',
  '../../docs/product/sheet-viewer-feature-map.md',
  '../../docs/product/sheet-viewer-mvp.md',
  '../../docs/architecture/sheet-viewer-android-mvp.md',
  'README.md',
];

const _sourceTargets = <String>['lib', 'test'];

Future<void> main() async {
  final checks = <_Check>[
    _Check('PDF fixture inspection', 'dart', <String>[
      'run',
      'tool/inspect_pdf_fixtures.dart',
    ]),
    _Check('Dart format check', 'dart', <String>[
      'format',
      '--set-exit-if-changed',
      ..._sourceTargets,
    ]),
    _Check('Flutter analyze', 'flutter', <String>['analyze']),
    _Check('Flutter test', 'flutter', <String>['test']),
    _Check('Git whitespace check', 'git', <String>['diff', '--check']),
    _Check(
      'Trailing whitespace scan',
      'rg',
      <String>['-n', r'[[:blank:]]$', ..._sourceTargets, ..._clefDocs],
      successExitCodes: <int>{1},
    ),
    _Check(
      'Tab scan',
      'rg',
      <String>['-n', r'\t', ..._sourceTargets, ..._clefDocs],
      successExitCodes: <int>{1},
    ),
    _Check(
      'Stale RC wording scan',
      'rg',
      <String>[
        '-n',
        '현재 로컬 환경에서는|PATH에 없어|실행하지 못|command not found|아직 고도화 전|후속 V1|repo의 현재 버전은 `1\\.0\\.0\\+[0-9]+`|실제 페이지 회전 live 렌더링과 per-instance crop/rotation override|cloud file import\\.',
        ..._clefDocs,
      ],
      successExitCodes: <int>{1},
    ),
    _Check(
      'Debug print scan',
      'rg',
      <String>['-n', r'TODO|FIXME|debugPrint\(|print\(', ..._sourceTargets],
      successExitCodes: <int>{1},
    ),
  ];

  final failures = <String>[];
  final versionFailure = _verifyAppVersionConsistency();
  if (versionFailure != null) {
    failures.add(versionFailure);
  }

  for (final check in checks) {
    final result = await check.run();
    if (!result.didPass) {
      failures.add(
        '${result.check.name}: exit ${result.exitCode} '
        'for `${result.check.displayCommand}`',
      );
    }
  }

  if (failures.isEmpty) {
    stdout.writeln('\nClef RC release checklist passed.');
    return;
  }

  stderr.writeln('\nClef RC release checklist failed:');
  for (final failure in failures) {
    stderr.writeln('- $failure');
  }
  exitCode = 1;
}

String? _verifyAppVersionConsistency() {
  const name = 'App version consistency';
  stdout.writeln('\n==> $name');
  stdout.writeln(
    r'$ compare pubspec.yaml version with lib/main.dart _clefAppVersion',
  );

  final pubspecVersion = RegExp(
    r'^version:\s*([^\s]+)',
    multiLine: true,
  ).firstMatch(File('pubspec.yaml').readAsStringSync())?.group(1);
  final appVersion = RegExp(r"const String _clefAppVersion = '([^']+)';")
      .firstMatch(File('lib/main.dart').readAsStringSync())
      ?.group(1);

  if (pubspecVersion == null) {
    stdout.writeln('FAIL missing pubspec.yaml version');
    return '$name: missing pubspec.yaml version';
  }
  if (appVersion == null) {
    stdout.writeln('FAIL missing lib/main.dart _clefAppVersion');
    return '$name: missing lib/main.dart _clefAppVersion';
  }
  if (pubspecVersion != appVersion) {
    stdout.writeln(
      'FAIL pubspec.yaml=$pubspecVersion lib/main.dart=$appVersion',
    );
    return '$name: pubspec.yaml=$pubspecVersion lib/main.dart=$appVersion';
  }

  stdout.writeln('PASS $pubspecVersion');
  return null;
}

class _Check {
  const _Check(
    this.name,
    this.executable,
    this.arguments, {
    this.successExitCodes = const <int>{0},
  });

  final String name;
  final String executable;
  final List<String> arguments;
  final Set<int> successExitCodes;

  String get displayCommand {
    return <String>[executable, ...arguments].join(' ');
  }

  Future<_CheckResult> run() async {
    stdout.writeln('\n==> $name');
    stdout.writeln('\$ $displayCommand');
    try {
      final result = await Process.run(executable, arguments);
      stdout.write(result.stdout);
      stderr.write(result.stderr);
      final didPass = successExitCodes.contains(result.exitCode);
      stdout.writeln(didPass ? 'PASS' : 'FAIL exit ${result.exitCode}');
      return _CheckResult(this, result.exitCode, didPass);
    } on ProcessException catch (error) {
      stderr.writeln(error.message);
      return _CheckResult(this, -1, false);
    }
  }
}

class _CheckResult {
  const _CheckResult(this.check, this.exitCode, this.didPass);

  final _Check check;
  final int exitCode;
  final bool didPass;
}
