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
    stdout.writeln(
      'P0/P1 신고: ${report.blocksRelease ? '있음' : '없음 (출시 승인 아님)'}',
    );
    stdout.writeln(
      '미확인 사용자 항목: ${report.hasUnverifiedObservations ? '있음' : '없음'}',
    );
    stdout.writeln('자동검사 선언은 실제 증거 및 물리 사용자 응답을 대체하지 않습니다.');
    for (final scenario in report.regressionCandidates) {
      stdout.writeln('회귀 후보: $scenario');
    }
    if (report.blocksRelease) {
      exitCode = 2;
    }
  } on FormatException catch (error) {
    stderr.writeln('피드백 검증 실패: ${error.message}');
    exitCode = 1;
  }
}
