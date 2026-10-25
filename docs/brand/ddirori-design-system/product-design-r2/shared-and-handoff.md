# 공통 시스템과 서비스 구현 인계

기존 [R1 반환 절차](../product-design-r1/handoff-review.md)를 계속 사용한다. R2는 새로운 화면 composition·검토 결과이며 제품 적용 완료/사람 검증 완료가 아니다.

## 공통 재사용

| 요구 | 지금 사용할 것 | 앱이 소유할 것 |
| --- | --- | --- |
| 평평한 행·독립 보조 행동 | React Item.flat/trailing, Flutter 기존 DdiroriItem | Work/Recording/Movement/Score ID·가용성·metadata |
| 탭/필터 | 실제 Tabs와 Choices의 동작 구분 | 탐색 state와 저장정책. 모드/명령을 무조건 tab으로 표현하지 않음 |
| 입력/메뉴/overlay | Input/Select/Dialog·플랫폼 대응 | 확정 command·IME·draft·복구·route |
| 재생/연습 표시 | 상태·Slider·Progress·Number/Beat·Transport 조합 | 엔진 clock·actual state·seek와 queue·mic |
| 작업 도구 | Toolbar/Button/IconButton/Density | 명령 분류·선택·undo·PDF 좌표·keymap |
| 피드백 | Banner/StatePanel/Progress와 voice/motion | 실제 task명·지원하는 취소/재시도·실패 후 보존 |

새 공통 API를 만들지 않았다. 네이티브 popup/밀도 차이는 플랫폼 계약의 예외로 기록하며 모양만 맞추기 위해 확정 시점을 바꾸지 않는다. 작업 화면은 캐릭터 없이 명확한 행동에 집중, 첫 빈 목록에서만 바흐 사용 가능. 실제 Progress는 unknown 상태의 기존 음형·reduced motion을 사용. 자동 효과음 없음.

타이포/간격/neutral은 R1 기초 유지. R2의 레이아웃 치수는 앱 composition 값으로 기록한다. 특정 화면의340px now-playing나280px inspector를 새 universal token으로 즉시 승격하지 않는다. 콘텐츠/주석/성부 색은 brand와 독립.

## 실행 프롬프트의 공통 계약

시작: AGENTS/Git/worktree → 현재 API/서비스 반환 자료 → R2 revision.json 해시 대조 → 실제 구현 범위 mapping. 파일 해시가 달라졌으면 후속 변경을 조사하고 기준을 기록한다. 이전 manifest를 통과시키려고 재생성하지 않는다.

실제 제품 소스·controller·엔진을 사용한다. 리뷰의 fake save·정적 PDF·captured notation을 제품 기능으로 반입하지 않는다. 기존 구현을 덮어쓰기보다 이미 적용된 R1에 작은 변경을 더한다. 기존 계정·권한·데이터 의미·공연 정책·재생 정책·dock 설정은 보존한다.

공통 변경 필요 시: 구체 재현 → 현재 API 한계 → 앱 예외로 해결할 수 있는 범위 → 실제 두 소비처 → API/token 전후 → migration/기본값 → 회귀·다른 앱 영향. 새 API를 앱별 복사해 분기하지 않는다.

## 반환 폴더와 내용

`product-design-r2/returns/<service>-<revision>/`에 다음을 기록한다.

- 구현 실제 commit 또는 uncommitted + diff/소스 해시
- 사용 R2 manifest SHA, 적용한 backlog ID, 구현 전 baseline
- 실제 화면: fixture·viewport·DPR·theme·accent·textScale·runtime·state
- 기본/선택/빈/loading/error/disabled, 해당 async 실패·retry·성공
- actual product/widget/Electron/static mock 구분
- 실행 command·결과·로그, 시각 검사·접근성 검사 범위
- 시안 차이와 이유: 플랫폼/제품 예외/구현 누락/공통 개선
- 기능 경로 전후 mapping, 보존한 domain 계약
- 미실행 기기/권한/OS input·known limits
- iOS 대상은 해당 YAML 변경과 mode:check 결과

Play·Score iOS: source.state pending/content.reviewed false, 영향받은 release notes/scenes/steps/assertions/manual. 실제 촬영·해시·검수는 파이프라인, 버전/미래 commit/권한 답변 추측 금지. Studio desktop 범위에 불필요한 iOS 문서를 만들지 않는다.

검토자는 실제 행동/상태 → 정보 위계 → 반응형/접근성 → 색/브랜드 순서로 판정한다. 정당한 플랫폼 차이는 기록, 불일치는 구체적인 수정 작업으로 반환. 공통 개선은 실제 수요를 확인한 뒤 별도 revision으로 반영한다. 승인 전 대표색·launcher·브랜드명 확정 및 원격 배포/출시를 하지 않는다.

## 아직 남은 선택

Play 좁은 화면 재생 strip의 항상 표시 범위, Score 가로화면 주석 옵션의 sheet/side panel, Studio 명령군의 실제 빈도별 우선순위는 구현 시 실측·사용성 검증이 필요하다. 현재 정책이 불명확하면 기존 동작을 보존하고 판단 항목을 반환한다. 이는 이번 디자인 산출물 완료와 별도의 제품 적용·사용자 검증 단계다.
