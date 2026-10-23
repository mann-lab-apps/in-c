import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';

class QaCheck {
  const QaCheck(
    this.id,
    this.executable,
    this.arguments, {
    this.timeout = const Duration(minutes: 10),
  });
  final String id;
  final String executable;
  final List<String> arguments;
  final Duration timeout;
}

Future<Map<String, Object?>> runQaCheck(QaCheck check, Directory output) async {
  final clock = Stopwatch()..start();
  final logFile = File('${output.path}/${check.id}.log');
  final sink = logFile.openWrite();
  int? code;
  var status = 'failed';
  Process? process;
  try {
    process = await Process.start(check.executable, check.arguments);
    final stdoutDone = process.stdout.forEach(sink.add);
    final stderrDone = process.stderr.forEach(sink.add);
    try {
      code = await process.exitCode.timeout(check.timeout);
      status = code == 0 ? 'passed' : 'failed';
    } on TimeoutException {
      status = 'timedOut';
      await _killDescendants(process.pid);
      process.kill(ProcessSignal.sigkill);
      await process.exitCode;
    }
    await Future.wait([stdoutDone, stderrDone]);
  } on ProcessException {
    status = 'notAvailable';
    sink.writeln('Executable unavailable.');
  } finally {
    await sink.close();
  }
  return {
    'id': check.id,
    'status': status,
    'exitCode': code,
    'elapsedMillis': clock.elapsedMilliseconds,
    'log': '${check.id}.log',
    'logSha256': sha256.convert(await logFile.readAsBytes()).toString(),
  };
}

Future<void> _killDescendants(int pid) async {
  if (!Platform.isMacOS && !Platform.isLinux) return;
  final children = await Process.run('pgrep', ['-P', '$pid']);
  if (children.exitCode != 0) return;
  for (final value in (children.stdout as String).split('\n')) {
    final child = int.tryParse(value.trim());
    if (child == null) continue;
    await _killDescendants(child);
    Process.killPid(child, ProcessSignal.sigkill);
  }
}

bool isQaSourceFile(String path) {
  final normalized = path.replaceAll('\\', '/');
  if (normalized.split('/').last == '.DS_Store') return false;
  // Flutter creates these ignored files during the first test/build.
  for (final generated in [
    'ios/Runner/GeneratedPluginRegistrant.h',
    'ios/Runner/GeneratedPluginRegistrant.m',
  ]) {
    if (normalized == generated || normalized.endsWith('/$generated')) {
      return false;
    }
  }
  return true;
}

Future<String> sourceFingerprint() async {
  final files = <File>[];
  for (final path in [
    'lib',
    'test',
    'integration_test',
    'tool',
    'assets',
    'ios/Runner',
    '../../packages/ddirori_ui/lib',
    '../../packages/ddirori_ui/assets',
  ]) {
    final directory = Directory(path);
    if (!await directory.exists()) continue;
    await for (final entity in directory.list(
      recursive: true,
      followLinks: false,
    )) {
      if (entity is File && isQaSourceFile(entity.path)) {
        files.add(entity);
      }
    }
  }
  for (final path in [
    'pubspec.yaml',
    'pubspec.lock',
    'ios/Runner.xcodeproj/project.pbxproj',
  ]) {
    files.add(File(path));
  }
  files.sort((a, b) => a.path.compareTo(b.path));
  final entries = <String>[];
  for (final file in files) {
    entries.add('${file.path}:${sha256.convert(await file.readAsBytes())}');
  }
  return sha256.convert(utf8.encode(entries.join('\n'))).toString();
}

Future<void> main(List<String> arguments) async {
  String? simulator;
  if (arguments.isNotEmpty) {
    if (arguments.length != 2 ||
        arguments.first != '--simulator' ||
        !RegExp(r'^[A-Fa-f0-9-]{36}$').hasMatch(arguments.last)) {
      stderr.writeln(
        'Usage: dart run tool/run_local_qa.dart [--simulator UUID]',
      );
      exitCode = 64;
      return;
    }
    simulator = arguments.last;
    final discovery = await Process.run('xcrun', [
      'simctl',
      'list',
      'devices',
      'available',
      '--json',
    ]);
    final devices =
        (jsonDecode(discovery.stdout as String)
                as Map<String, dynamic>)['devices']
            as Map<String, dynamic>;
    if (!devices.values
        .expand((value) => value as List<dynamic>)
        .any(
          (device) =>
              device['udid'] == simulator &&
              device['state'] == 'Booted' &&
              (device['name'] as String).startsWith('DDIRORI-QA-'),
        )) {
      stderr.writeln(
        'Select a booted DDIRORI-QA- simulator reserved for disposable fixtures. Physical devices are not accepted.',
      );
      exitCode = 64;
      return;
    }
  }
  final root = Directory('build/local_qa');
  await root.create(recursive: true);
  final directory = await root.createTemp('run-');
  final before = await sourceFingerprint();
  final report = <String, Object?>{
    'schemaVersion': 1,
    'startedAt': DateTime.now().toUtc().toIso8601String(),
    'environment': simulator == null ? 'hostOnly' : 'hostAndIosSimulator',
    'sourceSha256Before': before,
    'physicalDeviceVerified': false,
    'storeScreenshotsVerified': false,
    'status': 'running',
    'checks': <Map<String, Object?>>[],
  };
  final checks = [
    const QaCheck('flutter-version', 'flutter', ['--version', '--machine']),
    const QaCheck('format', 'dart', [
      'format',
      '--output=none',
      '--set-exit-if-changed',
      'lib',
      'test',
      'integration_test',
      'tool',
    ]),
    const QaCheck('test', 'flutter', ['test', '--machine']),
    const QaCheck('analyze', 'flutter', ['analyze']),
    const QaCheck('fixtures', 'dart', [
      'run',
      'tool/generate_audio_fixtures.dart',
      '--check',
    ]),
    const QaCheck('decoder-signal', 'dart', [
      'run',
      'tool/verify_decoded_audio.dart',
    ]),
    const QaCheck('large-library', 'dart', [
      'run',
      'tool/benchmark_large_library.dart',
    ]),
    if (simulator != null) ...[
      const QaCheck('ios-build', 'flutter', [
        'build',
        'ios',
        '--simulator',
        '--no-codesign',
      ]),
      for (final target in [
        'ios_app_smoke',
        'audio_playback',
        'local_reset_playback',
        'large_library',
        'local_audio_import',
        'screenshot_scene_contract',
      ])
        QaCheck(target, 'flutter', [
          'test',
          'integration_test/${target}_integration_test.dart',
          '-d',
          simulator,
          '--reporter',
          'expanded',
        ]),
    ],
  ];
  Future<void> save() => File('${directory.path}/report.json').writeAsString(
    const JsonEncoder.withIndent('  ').convert(report),
    flush: true,
  );
  await save();
  for (final check in checks) {
    stdout.writeln('Running ${check.id}');
    final result = await runQaCheck(check, directory);
    (report['checks']! as List<Map<String, Object?>>).add(result);
    await save();
    stdout.writeln('${check.id}: ${result['status']}');
  }
  final after = await sourceFingerprint();
  report['sourceSha256After'] = after;
  report['completedAt'] = DateTime.now().toUtc().toIso8601String();
  report['status'] = before != after
      ? 'sourceChanged'
      : (report['checks']! as List<Map<String, Object?>>).every(
          (check) => check['status'] == 'passed',
        )
      ? 'passed'
      : 'incomplete';
  await save();
  stdout.writeln('Local evidence: ${directory.path}/report.json');
  if (report['status'] != 'passed') exitCode = 1;
}
