import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import '../tool/rc_release_check.dart';

void main() {
  late Directory root;
  setUp(() {
    root = Directory.systemTemp.createTempSync('clef-debug-scan-');
  });
  tearDown(() => root.deleteSync(recursive: true));

  void fixture(String path, String content) {
    final file = File('${root.path}/$path');
    file.parent.createSync(recursive: true);
    file.writeAsStringSync(content);
  }

  test('separate discovery diagnostics do not fail Clef debug scan', () async {
    String diagnostic(String method) => '$method("diagnostic");';
    fixture('lib/classical_link_launcher.dart', diagnostic('debugPrint'));
    fixture('test/in_c_testflight_candidate_test.dart', diagnostic('print'));
    fixture('lib/main.dart', 'void main() {}');
    final result = await Process.run('rg', [
      ...clefDebugScanOptions,
      root.path,
    ]);
    expect(result.exitCode, 1);
    expect(result.stdout, isEmpty);
    expect(result.stderr, isEmpty);
  });

  for (final path in [
    'lib/main.dart',
    'lib/sheet_metronome_player.dart',
    'lib/pdf_link_policy.dart',
    'lib/future_audio.dart',
    'test/sheet_metronome_test.dart',
    'test/rc_guard_test.dart',
    'test/fixtures/rc_qa_fixture.dart',
  ]) {
    test('Clef or shared diagnostic stays blocked: $path', () async {
      for (final token in [
        'print',
        'debugPrint',
        'TO'
            'DO',
        'FIX'
            'ME',
      ]) {
        fixture(path, '$token("unexpected");');
        final result = await Process.run('rg', [
          ...clefDebugScanOptions,
          root.path,
        ]);
        expect(result.exitCode, 0, reason: token);
        expect(result.stdout, contains(path));
        expect(result.stderr, isEmpty);
      }
    });
  }
}
