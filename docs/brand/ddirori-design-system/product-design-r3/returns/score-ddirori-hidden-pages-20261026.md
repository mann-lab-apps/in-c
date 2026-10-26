# Score R3 · 숨긴 페이지 관리 sheet

## 적용 범위

- 실제 화면: `SheetViewerScreen` → `모든 도구` → `페이지 정리` → `숨김 페이지 관리`.
- 기존 숨긴 페이지 목록을 `showDdiroriSheet`, `DdiroriBanner`, `DdiroriItem`, `DdiroriButton`으로 정리했다.
- 각 행은 숨긴 쪽과 기존 회전 metadata를 보여주며, `숨김 해제`가 해당 쪽을 다시 표시하고 이동하는 기존 controller 경로를 요청한다.

## 보존 계약

- 숨김 해제와 대상 쪽 이동은 기존 page-settings/PDF controller가 소유한다.
- 목록을 열거나 닫는 일은 페이지 순서, 원본 PDF, 주석 및 연습 상태를 바꾸지 않는다.

## 자동 검증

`test/score_r2_viewer_test.dart`의
`real PDF hidden-page management uses Ddirori rows`는 실제 3쪽 PDF에서 2쪽을 숨긴 뒤 다음을 확인한다.

1. `모든 도구 → 페이지 정리 → 숨김 페이지 관리` 진입
2. 공통 행·안내와 `숨김 해제` 행동 표시
3. 숨김 해제 뒤 hidden-page metadata 제거 및 동일 PDF document identity 유지

이 검증은 물리 iPhone/iPad의 긴 목록 scroll, VoiceOver, 터치 영역, 실제 page-turn 감각 또는 저장 실패 복구 증거가 아니다.
