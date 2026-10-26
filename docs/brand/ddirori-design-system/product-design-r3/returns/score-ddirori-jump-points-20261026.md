# Score R3 · 점프 포인트 sheet

- 실제 화면: `SheetViewerScreen` → `모든 도구` → `페이지 정리` → `점프 포인트` → `현재 쪽에서 추가` → `대상 페이지 선택`.
- 공통 sheet/row/status/action으로 현재 쪽에서의 추가, 대상 쪽 선택, 이동 가능/숨김 상태와 이동·이름 변경·삭제를 분리했다.
- 추가·수정·삭제와 실제 페이지 이동은 기존 jump-point controller/PDF adapter를 사용하며 원본 PDF·주석·연습 상태를 직접 변경하지 않는다.
- `real PDF jump points use Ddirori sheets without replacing navigation` widget 회귀는 실제 3쪽 PDF에서 1쪽→2쪽 바로가기 저장과 동일 PDF document identity를 확인한다.
- 물리 기기에서의 긴 목록 scroll, VoiceOver, touch target, 숨김 쪽의 이동 불가 표현, 이름 변경 IME와 실제 저장 실패 복구는 미검수다.
