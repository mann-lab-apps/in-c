import 'dart:io';

import 'package:classical_local_library/audio_test_fixture.dart';

void main(List<String> arguments) {
  final checkOnly = arguments.contains('--check');
  if (arguments.any((argument) => argument != '--check')) {
    throw ArgumentError('Only --check is supported.');
  }
  final output = Directory('assets/audio_test');
  if (!checkOnly) {
    output.createSync(recursive: true);
  }
  for (final specification in audioFixtureSpecifications) {
    final expected = generatePcmWaveFixture(specification);
    final file = File('${output.path}/${specification.fileName}');
    if (checkOnly) {
      if (!file.existsSync() || !_sameBytes(file.readAsBytesSync(), expected)) {
        throw StateError(
          '${specification.fileName} does not match generator output.',
        );
      }
      validatePcmWaveFixture(expected, specification);
      continue;
    }
    file.writeAsBytesSync(expected, flush: true);
  }
  _writeOrCheckCompressedFixture(
    output,
    checkOnly: checkOnly,
    fileName: 'movement_1_aac.m4a',
    codec: 'aac',
  );
  _writeOrCheckCompressedFixture(
    output,
    checkOnly: checkOnly,
    fileName: 'movement_1_alac.m4a',
    codec: 'alac',
  );
  _writeOrCheckCompressedFixture(
    output,
    checkOnly: checkOnly,
    fileName: 'movement_1.flac',
    codec: 'flac',
    container: 'flac',
  );
}

void _writeOrCheckCompressedFixture(
  Directory output, {
  required bool checkOnly,
  required String fileName,
  required String codec,
  String container = 'm4af',
}) {
  if (!Platform.isMacOS) {
    if (checkOnly && !File('${output.path}/$fileName').existsSync()) {
      throw StateError('$fileName is missing and requires macOS afconvert.');
    }
    return;
  }
  final source = File('${output.path}/movement_1.wav');
  final target = File('${output.path}/$fileName');
  if (checkOnly) {
    if (!target.existsSync()) {
      throw StateError('$fileName is missing.');
    }
    final info = Process.runSync('afinfo', [target.path]);
    final outputText = '${info.stdout}\n${info.stderr}';
    if (info.exitCode != 0 ||
        !outputText.contains('22050 Hz, $codec') ||
        !outputText.contains('estimated duration: 2.400000 sec')) {
      throw StateError('$fileName does not match the expected codec contract.');
    }
    return;
  }
  final temporary = Directory.systemTemp.createTempSync('ddirori_fixture_');
  final generated = File('${temporary.path}/$fileName');
  try {
    final result = Process.runSync('afconvert', [
      '-f',
      container,
      '-d',
      codec,
      source.path,
      generated.path,
    ]);
    if (result.exitCode != 0 || !generated.existsSync()) {
      throw StateError('afconvert could not generate the $codec fixture.');
    }
    target.writeAsBytesSync(generated.readAsBytesSync(), flush: true);
  } finally {
    temporary.deleteSync(recursive: true);
  }
}

bool _sameBytes(List<int> actual, List<int> expected) {
  if (actual.length != expected.length) {
    return false;
  }
  for (var index = 0; index < actual.length; index += 1) {
    if (actual[index] != expected[index]) {
      return false;
    }
  }
  return true;
}
