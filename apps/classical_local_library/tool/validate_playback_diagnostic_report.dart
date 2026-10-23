import 'dart:convert';
import 'dart:io';

import 'package:classical_local_library/playback_diagnostic_report.dart';

Future<void> main(List<String> arguments) async {
  if (arguments.isNotEmpty) {
    stderr.writeln(
      'Usage: cat diagnostic-report.json | '
      'dart run tool/validate_playback_diagnostic_report.dart',
    );
    exitCode = 64;
    return;
  }

  final source = await stdin.transform(utf8.decoder).join();
  try {
    stdout.writeln(const PlaybackDiagnosticReportReviewer().review(source));
  } on FormatException catch (error) {
    stderr.writeln('Invalid playback diagnostic report: ${error.message}');
    exitCode = 65;
  }
}
