# Score Ddirori 자동 스크롤 sheet · 2026-10-26

## 실제 적용

- 대상: `apps/in_c_sheet/lib/main.dart`의 `_AutoScrollSheet`.
- 띠로리 공통 `DdiroriPageHeader`와 `DdiroriButton`으로 자동 스크롤의 실행·일시정지/재개·정지 행동을 명확히 구분했다.
- pause marker, 반복 구간, cue point의 제목과 긴 동작은 작은 폭에서 제목 아래에 배치했다. 390px 폭에서 동작 문구가 넘치지 않는다.
- 페이지 범위, 재생 시간, cue, 반복 구간, 타이머와 실제 지면 이동은 Score가 계속 소유한다. 공통 UI가 페이지 계산이나 스크롤 수명을 소유하지 않는다.

## 자동 검증 범위

- 실제 fixture PDF에서 연습 도구 → 자동 스크롤을 열고 공통 header와 시작 행동을 확인했다.
- 연주 시간·시작 페이지 설정이 열린 문서와 함께 유지되고, PDF document가 교체되지 않음을 widget 회귀로 확인했다.
- 390px PDF viewer 내 모든 설정 영역에서 RenderFlex overflow가 없음을 회귀로 확인했다.

## 미검수 및 차이

- 실제 스크롤 속도·cue 경계·pause/resume·재시작 감각, 가로/큰 글씨, VoiceOver 순서, 페달·키보드, 실제 연주 중 화면 가림은 iOS/Android 후보 빌드 Device QA가 필요하다.
- 자동 스크롤 엔진·공연 정책·오디오 연동을 바꾸지 않았다. 디자인 정렬은 실제 기기 연주 품질의 완료 선언이 아니다.
