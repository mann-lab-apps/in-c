# Score R3 · 보기 방식 sheet

- 실제 화면: `SheetViewerScreen` → `모든 도구` → `보기 옵션` → `보기 모드`.
- 공통 sheet·행·상태·행동으로 현재 보기 방식, 선택 가능 방식과 좁은 화면의 2페이지 제한을 구분했다.
- 실제 display mode 저장, 자동 스크롤 정지, crop fit 재계산과 PDF invalidate는 기존 viewer가 소유한다.
- 실제 PDF widget 회귀는 공통 행과 원본 PDF document identity만 확인했다. 물리 기기의 2페이지 배치, 큰 글씨, VoiceOver, 실제 crop·scroll 감각은 미검수다.
