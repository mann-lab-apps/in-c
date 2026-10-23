import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';

import 'audio_signal_analysis.dart';

Future<void> main() async {
  if (!Platform.isMacOS) {
    stderr.writeln(
      'NOT VERIFIED: this decoder check requires macOS afconvert.',
    );
    exitCode = 2;
    return;
  }
  final directory = await Directory.systemTemp.createTemp('ddirori_decode_');
  final results = <Map<String, Object>>[];
  try {
    for (final fixture in [
      'movement_1.wav',
      'movement_1_aac.m4a',
      'movement_1_alac.m4a',
      'movement_1.flac',
    ]) {
      final input = File('assets/audio_test/$fixture');
      final output = File('${directory.path}/$fixture.wav');
      try {
        final decoded = await Process.run('/usr/bin/afconvert', [
          '-f',
          'WAVE',
          '-d',
          'LEI16',
          input.path,
          output.path,
        ]);
        if (decoded.exitCode != 0) throw const FormatException('decode failed');
        final pcm = await output.readAsBytes();
        results.add({
          'fixture': fixture,
          'inputSha256': sha256.convert(await input.readAsBytes()).toString(),
          'pcmSha256': sha256.convert(pcm).toString(),
          ...analyzeDecodedFixture(pcm),
        });
      } catch (_) {
        results.add({
          'fixture': fixture,
          'passed': false,
          'failure': 'decodeOrSignalContract',
        });
      }
    }
  } finally {
    await directory.delete(recursive: true);
  }
  stdout.writeln(
    const JsonEncoder.withIndent('  ').convert({
      'schemaVersion': 1,
      'environment': 'macosHostDecoder',
      'physicalOutputVerified': false,
      'mp3': 'notVerifiedNoLocalEncoder',
      'stereoRoutingAndTransitionGap': 'notVerifiedMonoOfflineDecodeOnly',
      'results': results,
    }),
  );
  if (results.any((r) => r['passed'] != true)) exitCode = 1;
}
