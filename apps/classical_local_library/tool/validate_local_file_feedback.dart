import 'dart:convert';
import 'dart:io';

import 'package:classical_local_library/local_file_feedback.dart';

Future<void> main() async {
  try {
    final source = await stdin.transform(utf8.decoder).join();
    final report = const LocalFileFeedbackCodec().decode(source);
    stdout.writeln('schema: ${report.schemaVersion}');
    stdout.writeln('platform: ${report.platform.name}');
    stdout.writeln('provider: ${report.provider.name}');
    stdout.writeln('picker: ${report.pickerOutcome.name}');
    stdout.writeln('selectedFiles: ${report.selectedFileCount}');
    stdout.writeln('formats: ${report.formats.join(',')}');
    stdout.writeln('import: ${report.importOutcome.name}');
    stdout.writeln('export: ${report.exportOutcome.name}');
    stdout.writeln('relaunch: ${report.relaunchPersistence.name}');
  } on FormatException catch (error) {
    stderr.writeln('invalid feedback report: ${error.message}');
    exitCode = 2;
  }
}
