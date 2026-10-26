# Score R3 · 직접 페달 설정

- 실제 화면: `SheetViewerScreen` → `모든 도구` → `보기 옵션` → `페달 매핑` → `직접 설정`.
- 진단 입력과 기본 입력은 공통 설정 행으로 표시하며, 선택 저장은 공통 adaptive action으로 제공한다.
- 작은 폭의 dropdown은 `isExpanded`로 가용 폭을 채운다. 실제 HID/키 입력 식별·저장과 장비 호환성은 기존 Score adapter가 소유한다.
- 실제 PDF widget 회귀는 390px 폭에서 직접 설정 sheet·공통 설정 행·저장 행동과 PDF document identity를 확인했다. 실제 USB/Bluetooth 장비, 큰 글씨·VoiceOver와 재시작 후 키 동작은 Device QA로 남긴다.
