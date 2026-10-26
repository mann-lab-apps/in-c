# Score Ddirori 메트로놈 sheet · 2026-10-26

## 실제 적용

- 대상: `apps/in_c_sheet/lib/main.dart`의 `_MetronomeSheet`.
- 띠로리 공통 `DdiroriPageHeader`, `DdiroriButton`, `DdiroriIconButton`, `DdiroriChoices`, `DdiroriSettingsRow`로 제목, 실행, BPM 조절, 박자 선택, 소리 설정을 조합했다.
- 높이가 작은 bottom sheet에서도 overflow 대신 스크롤로 모든 제어에 도달한다.
- `Timer`, BPM/박자 저장, 현재 박 표시, `SystemSound` click 호출은 Score에 남겼다. 공통 UI가 박자 계산이나 오디오 수명을 소유하지 않는다.

## 자동 검증 범위

- 실제 fixture PDF에서 연습 도구 → 메트로놈을 열고 공통 header/choice/button을 확인했다.
- BPM 증가와 3/4 박자 변경이 controller settings에 저장되고, 열린 PDF document가 교체되지 않음을 widget 회귀로 확인했다.
- 390px PDF viewer 내 bottom sheet overflow가 없음을 해당 회귀에서 확인했다.

## 미검수 및 차이

- 실제 click의 BPM 균일성, 출력 route, Bluetooth/유선 이어폰 latency, VoiceOver 순서, 터치·큰 글씨 스크롤 감각은 iOS/Android 후보 빌드 Device QA가 필요하다.
- 버튼/선택 영역만 공통화했다. 메트로놈 엔진·사운드 정책·실기기 청감 품질을 디자인 작업의 완료로 표현하지 않는다.
