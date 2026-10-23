import 'dart:convert';
import 'dart:io';

import 'package:classical_local_library/release_candidate_feedback.dart';

Future<void> main() async {
  try {
    final source = await utf8.decoder.bind(stdin).join();
    final report = const ReleaseCandidateFeedbackCodec().decode(source);
    stdout.writeln('실기기 후보 피드백 확인 완료');
    stdout.writeln('플랫폼: ${report.platform.name}');
    stdout.writeln('심각도: ${report.severity.name.toUpperCase()}');
    stdout.writeln('출시 차단: ${report.blocksRelease ? '예' : '아니오'}');
    if (report.blocksRelease) {
      exitCode = 2;
    }
  } on FormatException catch (error) {
    stderr.writeln('피드백 검증 실패: ${error.message}');
    exitCode = 1;
  }
}
