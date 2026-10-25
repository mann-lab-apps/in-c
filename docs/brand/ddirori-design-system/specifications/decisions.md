# D-01 결정·차이·변경 절차

2026-10-24 소스 대조. 초기 명세에서 기록한 차이를 후속 실제 적용으로 갱신했다. 현재 결과는 [적용 기록](../adoption-pilot.md)을 따른다. 플랫폼 차이·미지원 API는 해결된 버그와 구분한다.

| ID | 확인한 차이 / 근거 | 유지/목표 계약과 영향 | 후속 / 차단 여부 |
| --- | --- | --- | --- |
| D01 | root README의 Click/Chime 흡수 설명 vs 앱 README store target | 코드 존재와 출시 전략 분리. 공통 도구 계약은 진행 가능 | 사용자 결정 필요: 독립 앱 유지 여부. 출시 문구·앱 통합만 차단 |
| D02 | 대표색 미승인, 오래된 visuals의 파랑/라임 권고 혼재 | neutral+6후보, active lime 임시 유지. 색 확정 없이 역할 API 구축 | 사용자 결정: 대표색. 문서·공통 구현 비차단 |
| D03 | React Enter→blur 중복·IME, Flutter 반복 submit 재현 후 보완 | dirty 편집당 한 번 확정; composing/disabled 차단, 외부값 갱신 초기화. 웹 Escape 취소, Flutter submit-only 유지 | 처리: 각 adoption_test 회귀. 실기기 IME 별도 |
| D04 | range44→touch token48 적용. Input CSS12/Flutter14 padding 차이는 유지 | hit area 보완, padding은 플랫폼 예외이며 API 통일을 위해 강제 변경하지 않음 | 처리/유지: browser-pilot range 검사, C04 |
| D05 | React Confirm 내부 pending으로 dismiss 차단·실패 안내·재시도·세션 분리 구현. Flutter bool helper는 유지 | 실제 Score bulk sheet가 busy/PopScope/입력보존/재시도 소유 | 처리: common async tests + Score bulk failure test |
| D06 | Transport 웹 연속 range seek, Flutter drag 종료 seek·buffer/variant 지원 | 현행 유지·플랫폼 차이 명시. 엔진은 commit-only 필요 여부 adapter로 결정 | C38/Play regression, API 호환 변경 별도 |
| D07 | Tabs 웹 manual 옵션·Flutter automatic만, inactive content unmount | 상태 보존은 host로 올림. Flutter manual API 추가는 요구 증명 후 | C13, 데이터 fetch tabs 도입 전 확인 |
| D08 | 웹 Toolbar role group, Flutter native 조합; 기존 일부 문서가 toolbar keyboard 기대 | group 계약 유지. roving toolbar 필요 시 별도 공개 변경·검증 | C32, 전역 단축키 충돌 회귀 |
| D09 | React Select hidden required proxy 있으나 name/ref/readOnly 없음, 외부 클릭은 취소 | host value 제출, 문서로 미지원 명시. readonly 필요 시 정적 Field 또는 API 제안 | C08, API 확장 비차단 |
| D10 | Flutter Input required는 label, React Input native required | Flutter host validation 명시; 두 플랫폼 자동 검증 동일 주장 제거 | C04/native recipe |
| D11 | Avatar48·Table min100·Popup320 등의 일부 상수와 토큰 혼재 | 실제 값 기록, 반복 소비 입증된 치수만 token 승격 | 영향조사 뒤 개선, 이번 원본 변경 없음 |
| D12 | Flutter quiet/secondary 보조 버튼은 중립 foreground로 맞춤. Section/native route 차이는 유지 | 선택·disabled 스타일 유지; Accordion 시작 정렬. popup은 플랫폼 계약 유지 | 처리/유지: Flutter common·Score·Play 회귀 |
| D13 | React Item leading도 disabled일 때 inert 적용 | actions와 leading의 포인터/키보드 동작 차단. Flutter Item checkbox에 제목 기반 semanticLabel 추가 | 처리: 공통 테스트·실제 악보함 선택 검사 |
| D14 | 웹 Select selected option hover에서 선택 면 유지 | 선택 의미와 active/focus 윤곽 공존 | 처리: 6팔레트×light/dark 브라우저 검사 |

2026-10-24 추가 적용: 실제 Studio의 nullable 형상 입력에도 IME·dirty·Escape 범위를 보완했다. 공통 Number로 치환하지 않은 이유와 검증은 [Studio 명세](services/studio.md), [후속 감사](../../ddirori-brand-system/icon-family-v2/audit.md)의 H03을 따른다.

## 목표 API 확장 제안 (미구현)

- NumberControl: `onChange` 의미 변경 대신 `onCommit?: (value:number)=>void` 같은 이벤트를 무조건 추가하지 않는다. 먼저 같은 값/IME를 차단할 수 있는 현행 호환 수정부터 평가. 새 commit API를 추가하면 deprecated 경로·양 이벤트 동시 전달 금지 규칙 명시.
- Flutter async dialog: 기존 bool confirm의 의미를 바꾸지 않고 앱별 stateful body로 합성. 여러 제품에 같은 계약이 생긴 뒤 `showDdiroriAsyncConfirm({Future<void> Function() onConfirm,...})` 별도 helper 제안 검토.
- Select readOnly/ref: 실제 readonly 폼·focus error navigation 소비자가 생기면 additive props를 설계하고 disabled와의 차이를 테스트. 지금은 존재하지 않는 인자를 코드 예제에 쓰지 않는다.
- 고급 DatePicker/Autocomplete/Tree/virtualized grid: 공연 날짜·사보 기호 검색·대형 라이브러리 요구를 먼저 측정한다. 기본 Table/Select에 hidden feature로 넣지 않는다.

## 변경 운영

1. 스펙 ID와 문제 시나리오, 현행·목표, 영향 API/토큰/소비 앱을 기록한다.
2. 역할이 같은가 확인하고 새 variant/slot 필요성을 판단한다. 도메인 명칭이 공통 API에 들어가면 adapter를 우선한다.
3. additive 변경은 기존 기본값 유지. breaking 변경은 대체 API·migration 예·소비 지점·유예/삭제 조건을 명시하고 버전은 저장소 정책에 따라 별도 처리한다.
4. token 변경은 source→생성→--check→대비/대표 상태 검증. generated 직접 수정 금지.
5. 코드/문서/API snapshot·registry를 함께 갱신. 기존 evidence는 보존하고 새로운 검사 시간·source hash를 남긴다.
6. 제품 도입은 화면 하나씩, 기존 모델·저장값 유지, builder/adapter 단위 rollback. 실제 UI 영향 시 해당 iOS manifest 갱신.

미결정 사항은 출시 전략·대표색·지원 브라우저/기기 최소 범위·실기기 접근성 승인이다. 현재 상세 명세 작성의 차단 항목은 아니다. 색/네이밍 결정을 기다리느라 플랫폼 계약 작업을 멈추지 않는다.
