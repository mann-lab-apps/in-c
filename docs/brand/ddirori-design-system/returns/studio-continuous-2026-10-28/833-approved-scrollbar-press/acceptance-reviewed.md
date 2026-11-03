# 수용 기준과 실제 증거

| 기준 | 실제 증거 | 상태 |
| --- | --- | --- |
| 무이동 thumb/track/drag press 즉시 중단 | viewport-scroll.press.test.ts의 pointerdown 직후 검사, usePlaybackViewport/App 계약, native-thumb-c 4장면 | PASS |
| 지연 native scroll·동시 resize가 예전 기호로 되돌리지 않음 | 최신 변경 전 baseline-track-a의 scrollBy2 실패, native-track-b의 fast/held × 두 폭 scrollBy0/root0 | PASS |
| 일반 내용/도크 클릭과 내부 wheel 유지 | 새 단위 제외 경로, App 내부 target 대조, native-contained-d 2장면, native-content-e 2장면 | PASS |
| 공개 following으로 실제 cursor 노출 | native-thumb-c returned bounds/실제 playhead, hook toggle reveal | PASS |
| 선택·Native·history0 보존 | 실제 12장면/36쓰기·재열기, 관련 App 원본·선택·caret/history 검사 | PASS |
| 최신 Tooltip/mark focus·tracker·기보 보존 | promotion.json 보호 소스/앞부분 해시, 12파일179검사/type/build/profile/fixed | PASS |
| 최신 정책의 전체 회귀 | runs/suite-green-a/ 원문과 lock, full-addendum.md: 352파일3767검사·Node5 PASS, 외부1skip | PASS |

이 표의 PASS는 지정된 범위의 증거다. 물리 장치·IME·OS 파일 dialog·스크린리더·청음·외부 앱은 범위 밖이며 새 승인 근거가 없다. 829 touch1400 movement 실패는 이 표의 native scrollbar press와 다른 계약이며 미해결로 유지한다. 과거 실패/기준 이미지/시안은 보존한다. 전체 행은 실제 exit0/590.28초와 lock을 확인한 뒤 갱신했다.
