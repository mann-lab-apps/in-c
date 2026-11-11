import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';

/// Local probes only. A probe that executes successfully is not a declaration
/// that every codec, older OS, or physical output passed.
Future<void> main() async {
  if (!Platform.isMacOS) {
    stdout.writeln('{"environment":"notMacOS","status":"unavailable"}');
    exitCode = 2;
    return;
  }
  final directory = await Directory.systemTemp.createTemp('play-codecs-');
  final source = File('assets/audio_test/movement_1.wav');
  final fixtures = <Map<String, Object?>>[];
  final mp3 = <Map<String, Object?>>[];
  try {
    for (final name in [
      'movement_1.wav',
      'movement_1_aac.m4a',
      'movement_1_alac.m4a',
      'movement_1.flac',
    ]) {
      final file = File('assets/audio_test/$name');
      final info = await Process.run('/usr/bin/afinfo', [file.path]);
      final output = '${info.stdout}\n${info.stderr}';
      final valid =
          info.exitCode == 0 &&
          output.contains('22050 Hz') &&
          output.contains('estimated duration: 2.400000 sec');
      fixtures.add({
        'fixture': name,
        'status': valid ? 'verifiedHostMetadata' : 'failed',
        'sha256': sha256.convert(await file.readAsBytes()).toString(),
        'sourcePcmSha256': sha256
            .convert(await source.readAsBytes())
            .toString(),
        'container': RegExp(r'File type ID:\s*(.+)')
            .firstMatch(output)
            ?.group(1)
            ?.trim(),
        'audioFormat': RegExp(r'Data format:\s*(.+)')
            .firstMatch(output)
            ?.group(1)
            ?.trim(),
        'generation': name.endsWith('.wav') ? 'generatePcmWaveFixture' : 'macOS afconvert from movement_1.wav; see generate_audio_fixtures.dart',
      });
      if (!valid) exitCode = 1;
    }
    for (final codec in ['.mp3', '.mp3@44100']) {
      final output = File('${directory.path}/probe.mp3');
      final result = await Process.run('/usr/bin/afconvert', [
        '-f',
        'MPG3',
        '-d',
        codec,
        source.path,
        output.path,
      ]);
      mp3.add({
        'codec': codec,
        'exitCode': result.exitCode,
        'outputExists': await output.exists(),
        'reason': '${result.stderr}'
            .replaceAll(directory.path, '<fixture-dir>')
            .trim(),
      });
      if (await output.exists()) await output.delete();
    }
    final runtimes = await Process.run('xcrun', [
      'simctl',
      'list',
      'runtimes',
      '--json',
    ]);
    final versions = runtimes.exitCode == 0
        ? ((jsonDecode(runtimes.stdout as String) as Map)['runtimes'] as List)
              .map(
                (r) => {
                  'version': r['version'],
                  'build': r['buildversion'],
                  'available': r['isAvailable'],
                },
              )
              .toList()
        : [];
    final help = await Process.run('/usr/bin/afconvert', ['-h']);
    stdout.writeln(
      const JsonEncoder.withIndent('  ').convert({
        'environment': 'macOS host',
        'physicalOutputVerified': false,
        'generatorVersion': RegExp(r'Version:\s*([^\n]+)')
            .firstMatch('${help.stdout}\n${help.stderr}')
            ?.group(1),
        'fixtures': fixtures,
        'mp3': {
          'status': mp3.any((r) => r['exitCode'] == 0)
              ? 'encoderAvailableNeedsFixtureAndNativeVerification'
              : 'unavailableLocalEncoder',
          'attempts': mp3,
        },
        'availableRuntimeInventory': versions,
        'olderOsVerified': false,
        'note': 'Metadata and capability probes only. Native transport has separate integration evidence; physical listening and older OS remain separate.',
      }),
    );
  } finally {
    await directory.delete(recursive: true);
  }
}
