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
    this.environment = const {},
    this.expectedImages = const [],
    this.captureDevice,
  });
  final String id;
  final String executable;
  final List<String> arguments;
  final Duration timeout;
  final Map<String, String> environment;
  final List<String> expectedImages;
  final String? captureDevice;
}

String sanitizeQaLog(String value) => value
    .replaceAll(RegExp(r'/Users/[^\s"\x27<>]+'), '<private-path>')
    .replaceAll(
      RegExp(r'/(?:private/)?var/(?:mobile|folders)/[^\s"\x27<>]+'),
      '<private-path>',
    )
    .replaceAll(
      RegExp(r'\b[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}\b'),
      '<device-or-fixture-id>',
    );

String? libraryCaptureScene(String line) => RegExp(
  r'^DDIRORI_LIBRARY_SCENE (creation-result|playlist-detail|search-results)$',
).firstMatch(line.trim())?.group(1);

Future<Map<String, Object?>?> qaImageEvidence(
  File file,
  String relative,
) async {
  if (!await file.exists()) return null;
  final bytes = await file.readAsBytes();
  if (bytes.length < 57 ||
      bytes.take(8).join(',') != '137,80,78,71,13,10,26,10') {
    return null;
  }
  int dimension(int offset) =>
      bytes.sublist(offset, offset + 4).fold(0, (value, b) => value * 256 + b);
  var offset = 8;
  var hasData = false;
  var ended = false;
  while (offset + 12 <= bytes.length) {
    final length = dimension(offset);
    if (offset + length + 12 > bytes.length) return null;
    final type = ascii.decode(
      bytes.sublist(offset + 4, offset + 8),
      allowInvalid: true,
    );
    if (offset == 8 && (type != 'IHDR' || length != 13)) return null;
    if (type == 'IDAT') hasData = true;
    offset += length + 12;
    if (type == 'IEND') {
      ended = length == 0 && offset == bytes.length;
      break;
    }
  }
  if (!hasData || !ended) return null;
  if (dimension(16) == 0 || dimension(20) == 0) return null;
  return {
    'file': relative,
    'sha256': sha256.convert(bytes).toString(),
    'width': dimension(16),
    'height': dimension(20),
    'physicalDeviceVerified': false,
    'storeApproved': false,
    'environment': relative.contains('/native-')
        ? 'iOSSimulator'
        : 'FlutterWidgetFakeController',
  };
}

Future<Map<String, Object?>> runQaCheck(QaCheck check, Directory output) async {
  final clock = Stopwatch()..start();
  final logFile = File('${output.path}/${check.id}.log');
  final sink = logFile.openWrite();
  int? code;
  var status = 'failed';
  Process? process;
  final captures = <Future<bool>>[];
  final scenes = <String>{};
  final preexistingImages = <String>{};
  for (final path in check.expectedImages) {
    if (await File('${output.path}/$path').exists()) {
      preexistingImages.add(path);
    }
  }
  Future<bool> capture(String scene) async {
    Process? child;
    try {
      child = await Process.start('xcrun', [
        'simctl',
        'io',
        check.captureDevice!,
        'screenshot',
        '${output.path}/images/native-$scene.png',
      ]);
      final drains = Future.wait([
        child.stdout.drain<void>(),
        child.stderr.drain<void>(),
      ]);
      final result = await child.exitCode.timeout(const Duration(seconds: 15));
      await drains;
      return result == 0;
    } catch (_) {
      child?.kill(ProcessSignal.sigkill);
      return false;
    }
  }

  try {
    process = await Process.start(
      check.executable,
      check.arguments,
      environment: check.environment,
    );
    Future<void> read(Stream<List<int>> bytes, {bool markers = false}) async {
      await for (final line
          in bytes.transform(utf8.decoder).transform(const LineSplitter())) {
        sink.writeln(sanitizeQaLog(line));
        final scene = markers ? libraryCaptureScene(line) : null;
        if (check.captureDevice != null && scene != null && scenes.add(scene)) {
          captures.add(capture(scene));
        }
      }
    }

    final stdoutDone = read(process.stdout, markers: true);
    final stderrDone = read(process.stderr);
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
    if ((await Future.wait(captures)).any((passed) => !passed)) {
      status = 'failed';
    }
  } on ProcessException {
    status = 'notAvailable';
    sink.writeln('Executable unavailable.');
  } finally {
    await sink.close();
  }
  final images = <Map<String, Object?>>[];
  for (final relative in check.expectedImages) {
    final evidence = await qaImageEvidence(
      File('${output.path}/$relative'),
      relative,
    );
    if (evidence == null || preexistingImages.contains(relative)) {
      if (status == 'passed') status = 'missingCapture';
    } else {
      images.add(evidence);
    }
  }
  return {
    'id': check.id,
    'status': status,
    'exitCode': code,
    'elapsedMillis': clock.elapsedMilliseconds,
    'log': '${check.id}.log',
    'logSha256': sha256.convert(await logFile.readAsBytes()).toString(),
    if (check.expectedImages.isNotEmpty) 'images': images,
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
  if (normalized.split('/').contains('__pycache__') &&
      normalized.endsWith('.pyc')) {
    return false;
  }
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
  String? outputRoot;
  var libraryUx = false;
  var withCaptures = false;
  try {
    for (var i = 0; i < arguments.length; i++) {
      switch (arguments[i]) {
        case '--simulator':
          simulator = arguments[++i];
        case '--output':
          outputRoot = arguments[++i];
        case '--library-ux':
          libraryUx = true;
        case '--captures':
          withCaptures = true;
          libraryUx = true;
        default:
          throw const FormatException('argument');
      }
    }
    if (simulator != null &&
        !RegExp(r'^[A-Fa-f0-9-]{36}$').hasMatch(simulator)) {
      throw const FormatException('simulator');
    }
  } catch (_) {
    stderr.writeln(
      'Usage: dart run tool/run_local_qa.dart [--library-ux] [--captures] [--simulator UUID] [--output DIRECTORY]',
    );
    exitCode = 64;
    return;
  }
  if (simulator != null) {
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
  final root = Directory(outputRoot ?? 'build/local_qa');
  await root.create(recursive: true);
  final directory = await root.createTemp('run-');
  final before = await sourceFingerprint();
  final imageDirectory = Directory('${directory.path}/images');
  final captureEnvironment = <String, String>{};
  if (withCaptures) {
    await imageDirectory.create();
    final font =
        Platform.environment['DDIRORI_CAPTURE_FONT'] ??
        (Platform.isMacOS
            ? '/System/Library/Fonts/AppleSDGothicNeo.ttc'
            : null);
    final flutter = await Process.run('which', ['flutter']);
    final executable = File((flutter.stdout as String).trim());
    final flutterRoot = executable.parent.parent;
    final resolvedRoot = await executable.exists()
        ? File(await executable.resolveSymbolicLinks()).parent.parent
        : flutterRoot;
    final material =
        Platform.environment['DDIRORI_MATERIAL_FONT'] ??
        '${resolvedRoot.path}/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf';
    if (font == null ||
        !await File(font).exists() ||
        !await File(material).exists()) {
      stderr.writeln(
        'Capture fonts unavailable. Set DDIRORI_CAPTURE_FONT and DDIRORI_MATERIAL_FONT to local fonts.',
      );
      exitCode = 64;
      return;
    }
    captureEnvironment.addAll({
      'DDIRORI_LIBRARY_CAPTURE_OUTPUT': imageDirectory.absolute.path,
      'DDIRORI_CAPTURE_FONT': font,
      'DDIRORI_MATERIAL_FONT': material,
    });
  }
  final report = <String, Object?>{
    'schemaVersion': 1,
    'startedAt': DateTime.now().toUtc().toIso8601String(),
    'environment': simulator == null ? 'hostOnly' : 'hostAndIosSimulator',
    'sourceSha256Before': before,
    'physicalDeviceVerified': false,
    'storeScreenshotsVerified': false,
    'scope': libraryUx ? 'libraryMusicActionsAndRecovery' : 'fullLocalQa',
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
    QaCheck(
      'test',
      'flutter',
      libraryUx
          ? ['test', '--no-pub', '--reporter', 'expanded']
          : ['test', '--machine'],
    ),
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
    if (libraryUx)
      const QaCheck('audio-capabilities', 'dart', [
        'run',
        'tool/report_audio_capabilities.dart',
      ]),
    const QaCheck('large-library', 'dart', [
      'run',
      'tool/benchmark_large_library.dart',
    ]),
    if (libraryUx)
      const QaCheck('stress-library', 'dart', [
        'run',
        'tool/benchmark_large_library.dart',
        '--stress',
      ]),
    if (libraryUx) ...[
      const QaCheck('library-search', 'dart', [
        'run',
        'tool/benchmark_library_search.dart',
      ]),
      const QaCheck('stress-search', 'dart', [
        'run',
        'tool/benchmark_library_search.dart',
        '--stress',
      ]),
    ],
    if (withCaptures)
      QaCheck(
        'widget-captures',
        'flutter',
        [
          'test',
          '--no-pub',
          'test/library_navigation_test.dart',
          'test/library_search_ui_test.dart',
          'test/playback_modes_ui_test.dart',
          'test/music_actions_ui_test.dart',
          '--reporter',
          'expanded',
        ],
        environment: captureEnvironment,
        expectedImages: [
          'images/favorite-refresh-failure-390-1-light.png',
          for (final label in ['390-1-light', '320-2-light', '1024-2-dark'])
            for (final scene in [
              'library',
              'playlist-list',
              'playlist-menu',
              'playlist-create',
              'playlist-created',
              'section-editor',
            ])
              'images/$scene-$label.png',
          for (final label in ['390-1-light', '320-2-light', '1024-2-dark'])
            for (final state in [
              'idle',
              'preparing',
              'failed',
              'ready',
              'searching',
              'empty',
            ])
              'images/search-$state-$label.png',
          for (final label in ['390-1-light', '320-2-light', '1024-2-dark'])
            for (final mode in ['off', 'all', 'one', 'shuffle'])
              'images/playback-modes-$mode-$label.png',
          for (final label in ['390-1-light', '320-2-light', '1024-2-dark'])
            for (final scene in ['queue', 'favorites', 'imslp'])
              'images/music-actions-$scene-$label.png',
        ],
      ),
    if (simulator != null && libraryUx) ...[
      QaCheck(
        'native-library',
        'flutter',
        [
          'test',
          '--no-pub',
          'integration_test/local_file_library_flow_integration_test.dart',
          '-d',
          simulator,
          if (withCaptures) '--dart-define=CAPTURE_LIBRARY_UX=true',
          '--reporter',
          'expanded',
        ],
        captureDevice: withCaptures ? simulator : null,
        expectedImages: withCaptures
            ? [
                'images/native-creation-result.png',
                'images/native-playlist-detail.png',
                'images/native-search-results.png',
              ]
            : [],
      ),
      QaCheck('native-system-scenes', 'flutter', [
        'test',
        '--no-pub',
        'integration_test/ios_system_media_integration_test.dart',
        'integration_test/screenshot_scene_contract_integration_test.dart',
        'integration_test/library_search_integration_test.dart',
        'integration_test/playback_modes_integration_test.dart',
        '-d',
        simulator,
        '--reporter',
        'expanded',
      ]),
      QaCheck('native-music-actions', 'flutter', [
        'test',
        '--no-pub',
        'integration_test/queue_edit_integration_test.dart',
        'integration_test/music_actions_flow_integration_test.dart',
        '-d',
        simulator,
        '--reporter',
        'expanded',
      ]),
      QaCheck('native-formats', 'flutter', [
        'test',
        '--no-pub',
        'integration_test/audio_playback_integration_test.dart',
        'integration_test/mixed_format_playback_integration_test.dart',
        '-d',
        simulator,
        '--reporter',
        'expanded',
      ]),
      QaCheck('native-background', 'python3', [
        'tool/run_ios_background_audio_qa.py',
        '--device',
        simulator,
        '--output',
        '${directory.path}/background',
      ]),
    ],
    if (simulator != null && !libraryUx) ...[
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
