# Studio R2 · 다음 입력과 선택한 표기

[기존 서비스 계약](../specifications/services/studio.md)·[R1](../product-design-r1/studio.md) 유지. `src/renderer/src/App.tsx`, `SpanProperties.tsx`, `studio-r1.css`와 command/selection/keymap을 대조한다. R1 neutral chrome·dark·dock 적용을 다시 구현하지 않는다.

## 핵심 설계

문서명+실제 dirty/저장 상태 → 기존 명령 분류 → 다음 입력 설정 → 기보 지면·선택 속성. 실제 파일/악보/음표/표기/가사/내보내기/재생 분류는 유지한다. R2 시안의 음표/표기/가사3개는 비교 subset. 전체 기능 제거·축소를 승인한 것이 아니다.

- 다음 입력: 입력 모드·음가·쉼표·점·임시표·성부. 어떤 옵션이 ‘새 입력’과 ‘현재 선택 변경’을 겸하는지는 실제 command mapping을 먼저 작성. label만으로 엔진 의미를 바꾸지 않는다.
- 선택한 표기: 대상 종류·파트/보표/성부·범위 → 배치/shape → reset/delete. 선택 대상의 값과 입력 defaults를 한 state로 합치지 않는다.
- 실제 지원하는 note/chord/multiple selection은 기존 App 정책을 유지한다. 이번 SpanProperties 시안은 single span/none만 다루며 mixed 기능을 추가하지 않는다.
- 끝점 Select는 엔진이 제공하는 옵션·주소를 유지. 미지원 값 숨김/역순 자동수정 금지. 시안에서는 주소를 읽기 전용으로 보여주는 배치 예제.
- 기보 지면은 실제 renderer 영역 캡처. 모델/음표 입력/뷰포트가 없는 정적 이미지라 명령 실행이나 notation layout의 개선 증거로 쓰지 않는다.

## 반응형·도구 접근

neutral chrome·paper 분리 유지. heading24, label14, control32는 fine pointer, coarse48. 기존 saved dock200–360/default280; 시안280이 사용자 저장값을 덮지 않음. 좁은 창에서는 분류 유지+명령군 wrap/overflow, inspector 접기/복원 trigger. 지면 scroll/pan과 panel scroll을 분리하고 포커스된 필드가 숨지 않음.

960px에서 dock을 쌓을 때 기보 폭과 줄바꿈이 달라지는 현재 R1 반응형 정책은 review.md T03에 기록했다. fit-width와 고정 zoom을 구분하고 caret/선택/scroll anchor가 유지되는지 확인한다. fixed-canvas 엔진 검사와 responsive viewport 검사를 따로 판정한다.

현재 실제207px 패널에서도 긴 label과 native Select가 동작하는지 확인. dropdown 교체를 모양 변경으로 취급하지 말고 탐색/확정 command 시점·keyboard 차이를 검증. 실제 단축키는 keymap에서 생성, 임의의 MuseScore/타 서비스 shortcut 복제 금지.

## draft·상태 계약

| 상태/행동 | 계약 |
| --- | --- |
| none | 안내와 유효한 입력 설정만. 선택 속성 disabled/숨김이 입력 모드를 초기화하지 않음 |
| single | 실제 대상ID와 현재 표시값. 편집 draft는 local, engine snapshot과 분리 |
| 값 | 빈값=undefined/자동, 0=명시적 offset, 단위sp. min/max/step 필드별 현행 유지 |
| Enter/blur | IME 중 확정 금지, 편집당 command1회와 undo1개. 뒤따른 blur 중복 없음 |
| Escape | draft만 원값 복원, 전역 selection 해제·파일 종료로 전파 금지 |
| invalid | 범위/형식 설명, draft를 이전 확정값으로 복원하고 engine value 유지. 자동 clamp로 잘못된 값을 저장하지 않음 |
| 외부 값·선택 변경 | stale draft를 새 대상에 저장하지 않음. 현행 remount/reset 정책 보존 |
| reset | undefined로 복원,0 입력과 별개. 유효한 undo 한 번 |
| 파일 저장 | 실제 성공만 clean. 실패 dirty/선택/문서/undo 유지, 재시도. UI가 성공을 꾸미지 않음 |
| dock close | selection/draft 처리 정책 유지, focus를 실제 표시 trigger로 복귀. 저장 폭 보존 |

R2의 local history는 입력 계약 체험용이며 실제 score-core undo stack이 아니다. save 체험은 첫 실패/다음 성공이며 OS 파일 권한/serializer 검증이 아님. 현재 구현의 실제 serializer/undo 검증은 별도 Electron evidence에 있음.

## 구성 분류

1. 공통: Text/Input/IconButton/Button/Select/Choices/Density/Banner/Progress, neutral 토큰.
2. 앱: command enabled/selected adapter, GeometryInput draft/IME, endpoint와 actual value, dock 저장·keymap.
3. 검토: 같은 draft 경계가 두 실제 소비처에서 검증되기 전 범용 GeometryInput API를 추가하지 않음.
4. 목표: label/정보 위계·명령 그룹 재배치, 실제 mixed 미지원 범위 확장 아님.

## 수용 조건

명령군 하나부터 이전/이후 mapping 작성. category/input mode/selection에 따라 실제 command가 동일. Enter+blur1회·Escape0회·IME0회·reset undefined·undo1회. saved207/280/360,960/1400·200%·touch48·light/dark. 실제 Cmd/Ctrl/메뉴/OS dialog 검수와 합성 테스트 구분.

먼저 review.md T04의 간헐적인 합성 IME 후 validation 실패를 분리 재현하고 실제 제품 결함인지 판정한다.

root typecheck, 관련 App/SpanProperties tests, 영향 score-core/notation 회귀. 별도 build renderer로 실제 도구→선택→수정→undo→저장/재열기, native score payload/MusicXML 동등. PDF 출력은 실제 export와 단순 workspace print를 구분한다. 새 schema/bridge/엔진·launcher·대표색 확정 범위 밖. 현재 desktop 범위에 불필요한 iOS YAML 수정 없음. [반환 규약](shared-and-handoff.md)으로 보고.
