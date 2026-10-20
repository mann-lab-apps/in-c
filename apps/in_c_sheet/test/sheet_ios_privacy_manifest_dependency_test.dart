import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Darwin file picker keeps the SwiftPM privacy manifest fix', () {
    final lockfile = File('pubspec.lock').readAsStringSync();

    expect(
      _isAtLeast(_lockedVersion(lockfile, 'file_picker'), (
        major: 12,
        minor: 3,
        patch: 0,
      )),
      isTrue,
      reason:
          'The coordinated file_picker 12.3 release keeps its federated '
          'implementations compatible with platform interface 3.4.',
    );
    expect(
      _isAtLeast(_lockedVersion(lockfile, 'file_picker_darwin'), (
        major: 1,
        minor: 2,
        patch: 0,
      )),
      isTrue,
      reason:
          'file_picker_darwin before 1.2.0 points SwiftPM at a missing '
          'Resources/PrivacyInfo.xcprivacy path.',
    );
    expect(
      _isAtLeast(_lockedVersion(lockfile, 'file_picker_platform_interface'), (
        major: 3,
        minor: 4,
        patch: 0,
      )),
      isTrue,
    );
  });
}

bool _isAtLeast(
  ({int major, int minor, int patch}) actual,
  ({int major, int minor, int patch}) minimum,
) {
  if (actual.major != minimum.major) {
    return actual.major > minimum.major;
  }
  if (actual.minor != minimum.minor) {
    return actual.minor > minimum.minor;
  }
  return actual.patch >= minimum.patch;
}

({int major, int minor, int patch}) _lockedVersion(
  String lockfile,
  String packageName,
) {
  final packagePattern = RegExp(
    '^  ${RegExp.escape(packageName)}:\\n'
    r'(?:(?:    |      ).*\n)*?'
    r'    version: "(\d+)\.(\d+)\.(\d+)"$',
    multiLine: true,
  );
  final match = packagePattern.firstMatch(lockfile);
  expect(
    match,
    isNotNull,
    reason: '$packageName is missing from pubspec.lock.',
  );
  return (
    major: int.parse(match!.group(1)!),
    minor: int.parse(match.group(2)!),
    patch: int.parse(match.group(3)!),
  );
}
