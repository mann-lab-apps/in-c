# Score R3 · 페이지 순서/복제 sheet

- 실제 화면: `SheetViewerScreen` → `모든 도구` → `페이지 정리` → `페이지 순서/복제`.
- 공통 sheet/row/status/action으로 앱 내부 표시 순서와 위·아래·복제·기본값 복원을 정리했다.
- 모든 변경은 기존 page-order controller를 사용하며 원본 PDF·주석·연습 상태를 직접 변경하지 않는다.
- `real PDF page order uses Ddirori actions without editing the PDF` widget 회귀는 실제 3쪽 PDF에서 첫 쪽 복제 후 `[1, 1, 2, 3]` page-order 저장과 동일 PDF document identity를 확인한다.
- 물리 기기에서의 긴 목록 scroll, VoiceOver, touch target, 실제 page-turn 감각 및 저장 실패 복구는 미검수다.
