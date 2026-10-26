# Score R3 · 연결 음원 재생 sheet

## 적용 범위

- 기준: `product-design-r3`의 현재 `revision.json`.
- 실제 화면: `SheetViewerScreen` → `연습` → `연결 음원` → 파일 선택 → `_LinkedAudioPlayerSheet`.
- 제목, 파일명, 상태, 행동을 Ddirori 공통 `DdiroriPageHeader`, `DdiroriButton`, `DdiroriStatusBadge`, `DdiroriBanner`로 구성했다.
- 앱 sandbox의 절대 경로 대신 마지막 파일명만 보인다. 재생 준비/실행/지원 불가/실패는 서로 다른 의미 상태로 나타난다.

## 보존 계약

- `SheetAudioPlayer` native channel, 재생·정지 명령, loop 및 다른 오디오 화면의 소유권 정책은 바꾸지 않았다.
- PDF document, 페이지, crop, zoom, 주석, setlist와 연결 파일 metadata를 변경하지 않는다.
- 파일 존재 확인 실패는 기존 viewer snackbar 경로를 그대로 사용한다.
- 실제 codec 지원, 출력 route, 음량, Bluetooth/유선 latency, sheet 종료 뒤 native 오디오 정리는 실기기 QA 항목이다.

## 자동 검증

`test/score_r2_viewer_test.dart`의 `real PDF linked audio uses the Ddirori playback sheet`는 390px 폭·200% 글자에서 실제 3쪽 PDF와 임시 MP3 metadata를 사용해 다음을 확인한다.

1. PDF → 연습 → 연결 음원 → 음원 선택의 실제 widget 흐름
2. 파일명 기반 subtitle, `재생 대기` 상태 badge와 `재생` 행동
3. 절대 sandbox path 비노출
4. 진입 전후 동일한 PDF document identity

이 검증은 재생 버튼을 누르지 않으므로, native 재생 성공이나 실제 청감의 증거가 아니다.

## 미검수

- iPhone/iPad에서 MP3/M4A/WAV/FLAC/OGG별 codec 결과
- 스피커, 유선 이어폰, Bluetooth 출력과 실제 A-B loop 경계
- VoiceOver 순서, 200% 글자, 가로 화면, 실제 touch target
- 실패 banner의 native 오류 문구 길이와 재시도 동선
