import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_rc_feedback.dart';

void main() {
  test('builds RC feedback template with handoff fields', () {
    final template = SheetRcFeedbackTemplate.build(
      appVersion: '1.0.0+1',
      debugSummary: 'scores=2, setlists=1',
    );

    expect(template, contains('앱 버전/build: 1.0.0+1'));
    expect(template, contains('설치 방식'));
    expect(template, contains('텍스트 PDF / 스캔 PDF / 이미지 변환 PDF'));
    expect(template, contains('URL link PDF / 한글 주석 PDF'));
    expect(template, contains('샘플 파일 공유 가능 여부'));
    expect(template, contains('blocker 여부'));
    expect(template, contains('어색한 한글 문구/표시'));
    expect(template, contains('스크린샷 또는 화면녹화'));
    expect(template, contains('annotation export'));
    expect(template, contains('scores=2, setlists=1'));
  });
}
