import 'dart:io';

import 'package:integration_test/integration_test_driver_extended.dart';

Future<void> main() async {
  final output = Directory(Platform.environment['STORE_CAPTURE_OUTPUT']!);
  await output.create(recursive: true);
  await integrationDriver(
    onScreenshot: (name, bytes, [arguments]) async {
      if (!RegExp(r'^[a-z0-9_-]+$').hasMatch(name))
        throw StateError('Invalid screenshot name');
      final file = File('${output.path}/$name.jpg');
      if (file.existsSync())
        throw StateError('Capture would overwrite an existing image');
      // iOS sends these bytes from the scene-time native snapshot. The host callback
      // is deferred until the test ends: taking a new simctl screenshot here would
      // photograph the last screen repeatedly under every scene name.
      final original = File('${output.path}/$name.png');
      if (original.existsSync() || bytes.isEmpty)
        throw StateError('Invalid snapshot');
      await original.writeAsBytes(bytes);
      // Encode the same full-size capture as opaque JPEG for App Store upload.
      // Preserve the original PNG; do not crop, resize or synthesize app content.
      final result = await Process.run('sips', [
        '-s',
        'format',
        'jpeg',
        original.path,
        '--out',
        file.path,
      ]);
      if (result.exitCode != 0)
        throw StateError('Native simulator screenshot failed');
      return file.existsSync() && file.lengthSync() > 0;
    },
  );
}
