# Score R3 · 렌더링과 페이지 넘김 설정 sheet

- 실제 화면: `SheetViewerScreen` → `모든 도구` → `보기 옵션` → `렌더링` 또는 `페이지 넘김`.
- 공통 sheet·행·상태·행동으로 현재 렌더링 프로필과 페이지 넘김 효과, 선택 가능한 설정을 구분했다.
- cache/invalidate, 페이지 전환 타이밍과 실제 PDF 렌더링은 기존 Score viewer가 계속 소유한다.
- 실제 PDF widget 회귀는 두 sheet의 공통 행과 PDF document identity를 확인했다. 긴 PDF 성능, 실제 전환 감각, 페달·VoiceOver는 Device QA로 남긴다.
