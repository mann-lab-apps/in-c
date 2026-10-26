# Score R3 · 표시 효과와 페이지 맞춤 sheet

- 실제 화면: `SheetViewerScreen` → `모든 도구` → `보기 옵션` → `표시 효과` 또는 `페이지 맞춤`.
- 두 선택 화면은 공통 sheet·안내·행·상태·행동을 사용해 현재 선택과 가능한 선택을 구분한다.
- PDF 원본, 주석과 현재 페이지는 기존 viewer가 소유한다. 효과/맞춤 저장, crop fit 재계산과 PDF invalidate도 기존 경로를 유지한다.
- 실제 PDF widget 회귀는 두 sheet의 공통 행과 document identity를 확인했다. 실제 iPhone/iPad의 색상 대비, 큰 글씨, VoiceOver, crop·scroll 감각은 Device QA로 남긴다.
