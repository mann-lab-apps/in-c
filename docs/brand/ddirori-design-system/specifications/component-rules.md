# C-BASE 모든 컴포넌트가 포함하는 계약

각 상세 페이지는 이 계약 + 개별 예외 + 실제 API 부록으로 완성된다. 개별 예외가 우선한다. 아래 표는 **목표 외형 프로파일**이며 현재 구현이 다른 값은 개별 명세/차이 목록에 기록한다. 지원하지 않는 variant를 임의 props로 전달하지 않는다.

## 치수·slots 프로파일

| 프로파일 | 기본 구조 / 토큰 | 폭·배치·예외 |
| --- | --- | --- |
| action | label/action 타입, optional icon; min-height density.control, padding control.buttonPaddingY/X, radius.control | 가변 높이, label wrap, busy 부속 문구도 폭 계산. IconButton은 control 정사각 최소 영역/radius tool |
| field | label14/500 → gap6 → control → help/error14; surface/text/controlBorder, radius10, focus2 | width100%, min-width0; Input CSS padding12 vs Flutter fieldPadding14 현행 차이. textarea/select는 개별 규칙 |
| choice | label14~body16 + 상태 glyph; selection/onSelection, disabled/onDisabled, gap8 | checkbox glyph20/switch40×24와 target48 구분; filter36/32, segmented control48/32; group wrap |
| display | itemTitle16/600, description14/400, rowPadding16, gap12, radius.card12 또는 flat | 제목·보조 행동 독립. loading/error/selected가 필요하면 해당 자식·host 상태로 합성 |
| feedback | status icon20 + body16 + optional action, surfaceMuted 또는 surface, gap12/padding16 | neutral 기본; alert 색은 state role. 작은 InlineMessage14. 긴 문장 wrap, 진단은 접힘 |
| overlay | named trigger → surface → body/actions; surface/text/controlBorder, panel radius16, padding12~24 | floating만 그림자, viewport 경계·내부 스크롤; 실제 dialog560/sheet720, Select 별도 |
| layout | gap8/12/16/24, gutter16/32, contentMax1120 | 자식 크기 정책 보존. 배치 자체에 클릭·selected·busy 의미를 추가하지 않음 |
| music | numeric16/500 + label14 + 도구/action, score 색과 UI 색 분리 | 유한 범위·단위 필수; 상태 계산은 host, 모션이 엔진 시계 아님 |

## 상태 행렬

| 상태 | action | field | choice | display/layout | overlay/feedback |
| --- | --- | --- | --- | --- | --- |
| hover/pressed | 실제 조작 대상에만 | native 입력 상태 | 조작 영역에만 | 비상호작용 면 N/A | trigger/행동에만 |
| focus-visible | 독립 ring | 오류 경계와 공존 | selected와 공존 | 자식 조작만 | 열림·복귀 계약 따름 |
| selected/checked | 토글만; 단순 명령 N/A | Select의 확정값 | 단일/다중/mixed 명시 | Item만 선택 API, 정적 배치 N/A | Menu 명령을 선택값처럼 표시 금지 |
| disabled/busy | 실행 차단; pending과 label 유지 | disabled와 readOnly 구분 | disabled 탐색 정책 명시 | 정적 표시 N/A; Item은 자식까지 차단 | host 작업 상태; 단순 popup busy N/A |
| invalid/error | 기본 버튼 자체 error N/A; host 안내 | error/help 연결 | 지원 API 없으면 Field/InlineMessage 합성 | host StatePanel/메시지 | 실패 모달 유지·재시도는 host |
| empty/unavailable | callback 없음 | 빈 문자열/옵션 집합 계약 | 임의 선택 생성 금지 | empty slot/StatePanel | 대상 없으면 진입 차단·사유 |

readOnly는 값 조회·복사를 허용하지만 변경하지 않는 필드 상태다. disabled는 조작 불가다. native checkbox/switch에 readOnly를 전달해 변경 차단을 보장했다고 가정하지 않는다. 해당 API가 없으면 비활성 또는 텍스트 상태로 표시한다. 범용 상태 prop을 모든 컴포넌트에 발명하지 않는다.

## 데이터·입력·예외 공통 규칙

- 키는 안정적이고 중복되지 않아야 한다. index를 저장 식별자로 쓰지 않는다. type의 union 밖 값은 adapter에서 검증한다.
- host는 외부 변경을 UI에 전달한다. 옵션이 사라져 선택값이 무효가 되면 host가 정책적으로 정정하거나 선택 필요 상태를 낸다. 자동으로 첫 옵션을 저장하지 않는다.
- native 입력이 지원하는 uncontrolled 사용과 설계 권장 controlled 사용을 구분한다. Search/Select/Tabs의 현재 공개 계약은 controlled다.
- onChange는 UI 의도이며 DB 저장 성공이 아니다. 실행 이벤트가 Promise를 받는지는 API별로 다르다. 반복 click 잠금과 오래된 요청 취소는 다른 책임이다.
- 같은 이벤트가 native click과 keydown 양쪽에서 두 번 실행되면 실패다. IME 조합 중 Enter를 제출/명령으로 소비하지 않는다(Number·Flutter Input 보완과 실기기 미검증 범위는 D03 참고).
- 포인터·터치에서 label도 target이다. 펜은 일반 UI에서는 pointer로 처리하고 압력/주석 좌표는 서비스 책임이다.
- focus 진입은 의미 있는 첫 요소, 닫기는 원래 trigger(삭제됐으면 가장 가까운 유효한 논리 대상). 외부 click이 새 focus를 얻으면 이를 빼앗지 않는다.
- React ref를 표준 HTMLAttributes에 없는 wrapper에 넘겨 동작을 기대하지 않는다. 현재 ref 지원이 없는 항목은 개선 제안과 분리한다. Flutter controller를 생성한 State가 dispose한다.

## 접근성과 합성

장식 아이콘은 숨기고 의미 아이콘은 label을 붙인다. 이미지 실패가 사용자 식별을 지우면 안 된다. Heading 역할은 레이아웃 위계에 맞춘다. focus만 이동해 데이터를 저장하지 않는다. 탭/라디오/메뉴/리스트박스 의미를 서로 치환하지 않는다. role만 선언하고 키보드를 구현하지 않는 것은 실패다.

상태 변경은 필요한 한 곳에서 알린다. 같은 실패에 Banner alert + Inline alert + toast를 동시에 생성하지 않는다. 실시간 박·음정은 매 frame live announce하지 않는다. popup 내부 행의 label은 full text, 좁은 화면에서도 click 영역은 유지한다.

UI 조합 예제의 `value`, `onChanged`, `context`는 host가 제공하는 값/함수다. 실제 API 최소 사용은 [React 예제](examples-react.tsx), [Flutter 합성](native-recipes.md), API 부록을 함께 따른다. 좋은 사용은 콜백 기반 adapter; 나쁜 사용은 공통 Button이 repository를 import하거나 Item 안 전체 클릭에 삭제 버튼을 중첩하는 것이다.

## 검증 규칙

컴포넌트별 Given/When/Then은 **수용 조건**이며 기존 실행 통과를 뜻하지 않는다. 타입·경로·문서 검사는 이번 결과, UI 검사는 [이전 기록](../evidence/basic-set/core.json)과 [후속 계획](verification.md)으로 분리한다. 배치·정적 표시에는 입력/async 상태가 N/A인 대신 긴 글자·빈 자식·의미·폭 검사를 적용한다. 픽셀 비교만으로 키보드/semantics를 통과시키지 않는다.
