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
  test(
    'old or truncated PNG files cannot stand in for a new capture',
    () async {
      final source = File(
        'ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-20x20@3x.png',
      );
      final old = await source.copy('${directory.path}/old.png');
      expect(await qaImageEvidence(old, 'old.png'), isNotNull);
      final result = await runQaCheck(
        const QaCheck(
          'stale-image',
          '/bin/sh',
          ['-c', 'exit 0'],
          expectedImages: ['old.png'],
        ),
        directory,
      );
      expect(result['status'], 'missingCapture');
      final truncated = File('${directory.path}/truncated.png');
      await truncated.writeAsBytes((await source.readAsBytes()).sublist(0, 24));
      expect(await qaImageEvidence(truncated, 'truncated.png'), isNull);
    },
  );

  test('capture markers are allowlisted and private paths and device IDs are redacted', () {
    expect(
      libraryCaptureScene('DDIRORI_LIBRARY_SCENE playlist-detail'),
      'playlist-detail',
    );
    expect(libraryCaptureScene('DDIRORI_LIBRARY_SCENE ../../private'), isNull);
    expect(
      libraryCaptureScene('DDIRORI_LIBRARY_SCENE search-results'),
      'search-results',
    );
    final clean = sanitizeQaLog(
      'file /Users/person/Music/private.flac device 12345678-1234-1234-1234-123456789abc',
    );
    expect(clean, isNot(contains('private.flac')));
    expect(clean, isNot(contains('12345678')));
  });

  test('successful command with missing captures cannot pass', () async {
    final result = await runQaCheck(
      const QaCheck(
        'missing-image',
        '/bin/sh',
        ['-c', 'exit 0'],
        expectedImages: ['images/missing.png'],
      ),
      directory,
    );
    expect(result['status'], 'missingCapture');
    expect(result['exitCode'], 0);
    expect(result['images'], isEmpty);
  });

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
      expect(await log.readAsString(), 'evidence\n');
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
