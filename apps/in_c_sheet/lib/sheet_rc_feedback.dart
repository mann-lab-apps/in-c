class SheetRcFeedbackTemplate {
  const SheetRcFeedbackTemplate._();

  static String build({
    required String appVersion,
    required String debugSummary,
  }) {
    return '''
Clef 피드백

앱 버전/build: $appVersion
기기/OS:
설치 방식: TestFlight / debug APK / release APK / local build
PDF/샘플 파일:
- 유형: 텍스트 PDF / 스캔 PDF / 이미지 변환 PDF / URL link PDF / 한글 주석 PDF
- 페이지 수/파일 크기:
- 샘플 파일 공유 가능 여부:
테스트 영역: import / viewer / search / annotation export / backup / pedal / S Pen / tuner / audio
한 일:
기대한 결과:
실제 결과:
표시된 오류 문구:
스크린샷 또는 화면녹화:
재현 가능 여부:

Debug summary:
$debugSummary
'''
        .trim();
  }
}
