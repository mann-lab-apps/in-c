# Score R3 · 페달 매핑 sheet

- 실제 화면: `SheetViewerScreen` → `모든 도구` → `보기 옵션` → `페달 매핑`.
- 공통 sheet·안내·행·상태·행동으로 현재 매핑, 선택 가능한 매핑과 현재 직접 설정의 편집 진입을 구분했다.
- 기존 HID/keyboard 입력 처리, 설정 저장과 custom mapping 편집은 Score 입력 adapter가 계속 소유한다.
- 실제 PDF widget 회귀는 선택 sheet와 PDF document identity를 확인했다. 실제 Bluetooth/USB 페달, 입력 cadence, VoiceOver와 물리 장비 호환성은 Device QA로 남긴다.
