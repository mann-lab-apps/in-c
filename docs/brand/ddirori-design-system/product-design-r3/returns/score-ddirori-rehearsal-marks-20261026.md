# Score R3 · 리허설 마크 sheet와 편집 dialog

- 실제 화면: `SheetViewerScreen` → `모든 도구` → `페이지 정리` → `리허설 마크` → 추가 또는 각 행의 더보기 → `마크 수정`.
- 공통 sheet/row/status/action과 dialog 입력·선택으로 현재 페이지 추가, 이동, 편집·삭제, 마크 종류와 대상 페이지를 구분했다.
- 공연 모드의 기존 정책대로 이동만 허용한다. 실제 페이지 이동과 mark 저장은 기존 controller/PDF adapter를 사용하며 원본 PDF·주석·연습 상태를 직접 변경하지 않는다.
- `real PDF rehearsal marks use Ddirori actions without replacing navigation` 및 `rehearsal mark editor uses Ddirori dialog controls` 회귀는 실제 3쪽 PDF에서 2쪽 mark 이동과 편집 dialog의 공통 input/choice/cancel을 확인한다.
- 물리 기기에서의 긴 목록·dialog scroll, VoiceOver, touch target, 한글 IME, 공연 모드 및 실제 저장 실패 복구는 미검수다.
