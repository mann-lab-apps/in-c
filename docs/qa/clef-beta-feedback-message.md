# Clef 베타 피드백 요청 메시지

작성일: 2026-08-26

## 짧은 요청문

```text
안녕하세요! 악보 뷰어/연습 도구 앱 Clef 베타 테스트를 부탁드리고 싶습니다.

가능하면 평소 쓰는 PDF 악보로 10-15분 정도만 써봐주세요.
특히 PDF 가져오기, 페이지 넘김, 필기, 튜너, 메트로놈, 자동 스크롤이 자연스러운지 보고 싶습니다.

문제가 생기면 앱 첫 화면의 `테스트 정보`에서 `피드백 템플릿 복사`를 눌러 아래 정보와 함께 보내주세요.

- 기기/OS:
- 설치 방식: TestFlight / debug APK / release APK / local build
- PDF/샘플 파일:
  - 유형: 텍스트 PDF / 스캔 PDF / 이미지 변환 PDF / URL link PDF / 한글 주석 PDF
  - 페이지 수/파일 크기:
  - 샘플 파일 공유 가능 여부:
- 테스트 영역: import / viewer / search / annotation export / backup / pedal / S Pen / tuner / audio
- blocker 여부: 예 / 아니오 / 모르겠음
- 한 일:
- 기대한 결과:
- 실제 결과:
- 표시된 오류 문구:
- 스크린샷 또는 화면녹화:
- 재현 가능 여부:

아직 베타라 튜너/오디오 latency, 한글 텍스트 주석 PDF export, 페달/S Pen 실기기 입력은 검증 중입니다.
써보고 막히는 지점이나 헷갈리는 표현을 편하게 알려주시면 큰 도움이 됩니다. 감사합니다!
```

## 함께 보낼 체크리스트 링크

- [`clef-tester-checklist.md`](clef-tester-checklist.md)

## 미리 알릴 제한

- 튜너 정확도와 latency는 실기기별로 확인 중이다.
- 한글/비ASCII 텍스트 주석은 PDF export에서 제한될 수 있다.
- 필기 포함 PDF 공유는 원본 PDF를 수정하지 않고 새 사본에 stamp하는 방식이다.
- URL link 제거는 원본 PDF를 보존하고 앱 내부 사본만 만든다.
- 실제 CamScanner/object stream PDF, 페달/S Pen, cloud provider 문제는 샘플/기기 정보가 있으면 좋다.
- cloud sync/account/server 저장은 아직 없다.
