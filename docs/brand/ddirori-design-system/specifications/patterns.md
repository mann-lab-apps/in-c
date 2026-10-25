# PAT-01 공통 조합 패턴

이 문서는 공통 **recipe의 목표 계약**이다. 새로운 공통 화면 클래스를 구현한 것이 아니다. 각 제품 상태·domain engine은 host가 소유한다. 전체 구조에서 Section gap24/row16/내부12/label6, typography 역할과 neutral 면을 사용한다.

| ID | 구성 트리 | host 입력·사건 | 상태 전이·focus·검증 |
| --- | --- | --- | --- |
| PAT-LIST | Header → Search → Select/FilterChip → result summary → List(Item+adapter) → StatePanel | query,filter,sort,rows,loading,error,selectedIds; onQuery/onFilter/onOpen/onSelect | 첫 자료0 vs 결과0 vs 오류 구분. query 입력 focus 유지. 결과 갱신에서 이전 row index로 focus 이동 금지 |
| PAT-FORM | Header → Field groups → InlineMessage → primary/secondary action | initial,draft,dirty,errors,pending; onChange/onSubmit/onCancel | submit→validation→pending→success/error. 첫 invalid field 연결, 실패 draft 유지. cancel dirty 정책 명시. Enter 중복 submit/IME 보호 |
| PAT-SELECT | selection entry → checkbox rows → count+bulk toolbar → Confirm | selected stable IDs,canAct; onToggle/onBulk | filter와 selection 독립. mixed=부분선택, 수정 폼 unchanged와 다른 뜻. 작업 완료 대상만 갱신; 실패 선택 유지 |
| PAT-DETAIL | back/title → metadata → content → actions | entity/loading/error/availability, onBack/onAction | back은 목록 query/scroll 복원. unavailable은 사유+복구. 데이터 fetch를 component render에서 실행하지 않음 |
| PAT-IMPORT | start → permission/picker → progress → review → result | actual progress?,counts,errors,cancelable; onStart/onCancel/onRetry | 취소와 실패·부분 완료 구분. 확정 전 라이브러리 성공 문구 금지. 복구 후 중복 항목 방지 host |
| PAT-RECOVER | Banner/StatePanel → 진단 펼침 → retry/find/settings | reason,diagnostic?,action availability | 진단 비공개 경로 기본 비노출. retry는 새 요청, older 결과 억제는 host. 성공 전 오류 제거로 빈 화면 만들지 않음 |
| PAT-WORKSPACE | Header/Toolbar → Palette + Document + Inspector → status | selection/mode/dock/commands | chrome과 document scale 분리. close panel→toggle focus. keyboard scope와 undo/redo 보존 |

## PAT-LINK 제품군 연결

현재 공통 ServiceLink는 이름·기능·가용 행동을 표시할 뿐 인증/딥링크/파일 이동을 제공하지 않는다. 다음은 **향후 host resolver 계약**이다.

```ts
// 제안: 앱 routing 계층. UI 패키지에 account/file client를 추가하지 않는다.
type ServiceTarget = {product:'score'|'play'|'studio'|'talk'|'stage'|'click'|'chime';
  entity?:{kind:string; id:string}; returnContext?:string};
type ResolvedTarget =
  | {kind:'available'; open:()=>void}
  | {kind:'external'; url:string}
  | {kind:'install'; instruction:string}
  | {kind:'unavailable'; reason:string};
```

| 출발 → 대상 | 전달 조건 | 지원되지 않을 때 |
| --- | --- | --- |
| Score → Play | 작품/녹음 ID의 실제 매핑·대상 기능 확인. 로컬 경로를 다른 앱이 읽는다고 가정 금지 | 자료명만 복사 등 검증된 기능 또는 unavailable |
| Play/공연 → Talk | 공개 가능한 작품·공연 식별자가 있고 실제 작성 진입 지원 | 작성 데이터가 자동 공유됐다고 안내 금지 |
| Studio → Score | 실제 export·열기 경로가 존재하고 사용자가 파일 전달 선택 | “내보내기” 기존 기능과 “다른 앱 열기”를 분리 |
| 제품군 소개 → 외부/설치 | URL allowlist/실제 배포 링크 host 검증 | 설치되지 않음·준비 중의 명시적 상태 |

대상 인증이 필요하면 host가 인증 요구·취소·복귀를 처리한다. 공통 UI는 비밀번호/토큰을 받지 않는다. returnContext는 앱이 허용한 논리 route 상태만, 임의 URL/비공개 경로 제외. availability는 실제 확인 상태이며 추정 설치 여부를 성공으로 표시하지 않는다. 외부 진입은 label로 알리고 뒤로 왔을 때 원래 query·선택·재생 의도를 보존한다.

## Figma 전달

[handoff](../handoff.md)의 collection/mode/text styles를 유지한다. source token→semantic→component slot 연결, kind/size/selected/disabled/busy 상태와 실제 지원 조합만 정의한다. 200%·긴 문구·dark·touch 예제를 별도 frame으로 남기는 것이 목표다. 현재 작성된 것은 명세이며 연결된 Figma 라이브러리나 실제 동기화 산출물은 없다.

## 타입 검사한 adapter 예제

[React ScoreLibraryAdapter](examples-react.tsx)와 [Flutter scoreLibraryAdapter](examples-flutter.dart)는 공통 Search/List/Item/StatePanel을 앱 표시 데이터와 연결한다. query·선택 ID·loading/error를 host가 소유하고 이벤트는 ID와 의도만 전달한다. 빈 결과·없는 파일·오류·재시도를 분기한다. 실제 제품에 연결한 구현이 아닌 문서 예제이며, 실제 controller의 비동기 요청 취소·가상 목록·가져오기 작업은 서비스 명세에 따라 덧붙인다. Flutter 예제는 스크롤 가능한 host 안에 놓고, 대형 자료는 현재 lazy list 정책을 유지한다.
