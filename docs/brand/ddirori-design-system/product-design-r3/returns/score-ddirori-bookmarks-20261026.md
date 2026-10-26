# Score R3 · 북마크 목록 sheet

## 적용 범위

- 실제 화면: `SheetViewerScreen` → `모든 도구` → `보기 옵션` → `북마크 목록`.
- 기존 목록 행을 `showDdiroriSheet`, `DdiroriBanner`, `DdiroriItem`, `DdiroriButton`, `DdiroriMenuButton`으로 정리했다.
- 행 또는 `이동`은 페이지 이동, 더보기는 이름 변경/삭제로 역할을 분리했다. 큰 글씨에서 긴 목록의 행동은 sheet scroll로 접근한다.

## 보존 계약

- 북마크 이동은 기존 PDF controller의 `goToPage`만 호출한다.
- 이름 변경과 삭제는 기존 `SheetLibraryController` 경로를 그대로 사용한다.
- 목록을 열거나 닫는 일만으로 PDF document, 주석, 연습 상태 또는 bookmark metadata가 바뀌지 않는다.

## 자동 검증

`test/score_r2_viewer_test.dart`의
`real PDF bookmarks use Ddirori rows without replacing navigation`은 390px 폭·200% 글자에서 실제 3쪽 PDF와 bookmark를 준비해 다음을 확인한다.

1. `모든 도구 → 보기 옵션 → 북마크 목록` 진입
2. 공통 행, 안내와 `이동` 행동 표시
3. 이동 뒤 bookmark 보존 및 동일 PDF document identity 유지

이 검증은 물리 iPhone/iPad의 터치 영역, VoiceOver 순서, 긴 목록 scroll, 이름 변경/삭제의 실제 IME 또는 외부 페달 동작 증거가 아니다.
