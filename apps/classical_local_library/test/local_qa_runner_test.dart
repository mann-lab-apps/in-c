import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:flutter_test/flutter_test.dart';

import '../tool/run_local_qa.dart';

void main() {
  late Directory directory;
  setUp(
    () async => directory = await Directory.systemTemp.createTemp('qa_runner_'),
  );
  tearDown(() async => directory.delete(recursive: true));

  test('fingerprint excludes only known generated iOS registrants', () {
    for (final path in [
      'ios/Runner/GeneratedPluginRegistrant.h',
      '/checkout/ios/Runner/GeneratedPluginRegistrant.m',
      r'C:\checkout\ios\Runner\GeneratedPluginRegistrant.h',
      'assets/.DS_Store',
    ]) {
      expect(isQaSourceFile(path), isFalse, reason: path);
    }
    for (final path in [
      'ios/Runner/AppDelegate.swift',
      'ios/Runner/Info.plist',
      'ios/Runner/PrivacyInfo.xcprivacy',
      'ios/Runner/GeneratedPluginRegistrant.swift',
      'lib/GeneratedPluginRegistrant.m',
      '../../packages/ddirori_ui/lib/src/generated/ddirori_tokens.dart',
      'assets/audio_test/movement_1.flac',
    ]) {
      expect(isQaSourceFile(path), isTrue, reason: path);
    }
  });

  test('timeout closes a child process holding the output pipe', () async {
    final result = await runQaCheck(
      const QaCheck('child', '/bin/sh', [
        '-c',
        'sleep 10 & wait',
      ], timeout: Duration(milliseconds: 100)),
      directory,
    ).timeout(const Duration(seconds: 3));
    expect(result['status'], 'timedOut');
  });

  test(
    'exit status and log hash come from the command, not an LLM verdict',
    () async {
      final result = await runQaCheck(
        const QaCheck('pass', '/bin/sh', ['-c', 'printf evidence']),
        directory,
      );
      expect(result['status'], 'passed');
      expect(result['exitCode'], 0);
      final log = File('${directory.path}/pass.log');
      expect(await log.readAsString(), 'evidence');
      expect(
        result['logSha256'],
        sha256.convert(await log.readAsBytes()).toString(),
      );
    },
  );

  test(
    'a failed command does not prevent the next independent check',
    () async {
      final failed = await runQaCheck(
        const QaCheck('fail', '/bin/sh', ['-c', 'exit 7']),
        directory,
      );
      final next = await runQaCheck(
        const QaCheck('next', '/bin/sh', ['-c', 'exit 0']),
        directory,
      );
      expect(failed['status'], 'failed');
      expect(failed['exitCode'], 7);
      expect(next['status'], 'passed');
    },
  );

  test(
    'missing executable and timeout never produce a passing result',
    () async {
      final missing = await runQaCheck(
        const QaCheck('missing', '/not-a-qa-executable', []),
        directory,
      );
      expect(missing['status'], 'notAvailable');
      final timeout = await runQaCheck(
        const QaCheck('timeout', '/bin/sleep', [
          '10',
        ], timeout: Duration(milliseconds: 50)),
        directory,
      );
      expect(timeout['status'], 'timedOut');
      expect(timeout['exitCode'], isNull);
    },
  );
}
