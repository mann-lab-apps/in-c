# Score Ddirori 튜너 sheet · 2026-10-26

## 실제 적용

- 대상: `apps/in_c_sheet/lib/main.dart`의 `_TunerSheet`.
- 띠로리 공통 `DdiroriPageHeader`와 `DdiroriIconButton`으로 튜너 제목과 마이크 시작/정지 행동을 배치했다.
- 튜닝 프리셋, 악기/표시 기준, 감지 프로필, 드론 mode의 긴 선택값은 작은 폭에서 확장 폭과 말줄임을 사용한다.
- 마이크 권한·입력 stream·음정 판정·드론의 native 재생과 저장은 Score에 남겼다. 공통 UI가 오디오 세션이나 음정 엔진을 소유하지 않는다.

## 자동 검증 범위

- 실제 fixture PDF에서 연습 도구 → 튜너를 열고 공통 header, 마이크 행동, 기준음/드론 섹션을 확인했다.
- 마이크가 사용 가능한 환경과 사용할 수 없는 환경의 시작/정지 표시는 모두 허용하되, 열린 PDF document가 교체되지 않음을 widget 회귀로 확인했다.
- 390px PDF viewer에서 긴 dropdown 선택값의 RenderFlex overflow가 없음을 해당 회귀로 확인했다.

## 미검수 및 차이

- 실제 마이크 권한, 실제 악기 음정 정확도, 노이즈 환경, 드론 음량·출력 route, Bluetooth/유선 latency, VoiceOver·터치·큰 글씨 감각은 iOS/Android 후보 빌드 Device QA가 필요하다.
- chromatic-only 정책과 기존 튜닝/드론 기능 범위는 바꾸지 않았다.
